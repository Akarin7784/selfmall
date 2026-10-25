"""Build first, then run: python scripts/smoke-test.py. Uses only the Python stdlib."""
import json
import os
from pathlib import Path
import socket
import subprocess
import time
import urllib.request
import urllib.error

ROOT = Path(__file__).resolve().parent.parent
SERVICES = {'gateway': 8080, 'auth': 9000, 'product': 9001, 'inventory': 9002,
            'order': 9003, 'member': 9004, 'payment': 9005}

def request(port, path, body=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(f'http://127.0.0.1:{port}{path}',
        data=json.dumps(body).encode() if body is not None else None, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=4) as response:
            payload = response.read()
            return response.status, json.loads(payload) if payload else None
    except urllib.error.HTTPError as error:
        return error.code, None

def check(condition, message):
    if not condition:
        raise AssertionError(message)
    print('PASS:', message, flush=True)

def main():
    processes, logs = [], []
    logdir = ROOT / '.tools' / 'smoke-logs'
    logdir.mkdir(parents=True, exist_ok=True)
    env = os.environ.copy()
    env.pop('SERVER_PORT', None)
    env['MALL_DEMO_PASSWORD'] = 'smoke-only-password'
    env['MALL_JWT_SECRET'] = 'smoke-only-secret-key-more-than-32-bytes'
    try:
        for service, port in SERVICES.items():
            with socket.socket() as probe:
                if probe.connect_ex(('127.0.0.1', port)) == 0:
                    raise RuntimeError(f'Port {port} already in use; stop existing services first')
            jar = ROOT / f'mall-{service}/target/mall-{service}-0.1.0-SNAPSHOT.jar'
            if not jar.exists():
                raise RuntimeError(f'Missing {jar}; run Maven verify first')
            log = (logdir / f'{service}.log').open('w', encoding='utf-8')
            logs.append(log)
            process = subprocess.Popen(['java','-Xmx256m','-jar',str(jar.relative_to(ROOT)),'--spring.profiles.active=local'],
                                       cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT)
            processes.append(process)
            deadline = time.monotonic() + 120
            while time.monotonic() < deadline:
                if process.poll() is not None:
                    raise RuntimeError(f'{service} exited; see {logdir}')
                try:
                    status, _ = request(port, '/actuator/health')
                    if status == 200:
                        break
                except (OSError, TimeoutError):
                    pass
                time.sleep(1)
            else:
                raise RuntimeError(f'{service} startup timed out; see {logdir}')
            print(f'UP: {service}', flush=True)
        check(request(8080, '/api/products/1')[1]['data']['price'] == 99.0, 'gateway routes public product query')
        check(request(8080, '/api/orders/quote', {'productId':1,'quantity':2})[0] == 401, 'gateway rejects anonymous order quote')
        check(request(9003, '/api/orders/quote', {'productId':1,'quantity':2})[0] == 401, 'direct service also requires JWT')
        check(request(8080, '/api/auth/token', {'username':'demo','password':'wrong'})[0] == 401, 'wrong password rejected')
        status, login = request(8080, '/api/auth/token', {'username':'demo','password':env['MALL_DEMO_PASSWORD']})
        check(status == 200, 'local authentication issues token')
        token = login['data']['accessToken']
        status, quote = request(8080, '/api/orders/quote', {'productId':1,'quantity':2}, token)
        check(status == 200 and quote['data']['totalAmount'] == 198.0 and quote['data']['memberId'] == '10001', 'JWT + gateway + Feign + database quote end to end')
        check(request(8080, '/api/orders/quote', {'productId':1,'quantity':0}, token)[0] == 400, 'invalid quantity rejected')
        check(request(8080, '/api/orders/quote', {'productId':999,'quantity':1}, token)[0] == 404, 'missing product returns 404 through Feign')
        check(request(8080, '/api/members/me', token=token)[1]['data']['memberId'] == '10001', 'member identity comes from JWT')
        check(request(8080, '/api/members/me', token=token+'broken')[0] == 401, 'tampered JWT rejected')
        # Product outage must fail, never return an invented price or successful order.
        processes[list(SERVICES).index('product')].terminate()
        processes[list(SERVICES).index('product')].wait(timeout=15)
        check(request(8080, '/api/orders/quote', {'productId':1,'quantity':2}, token)[0] == 503, 'upstream outage returns 503')
    finally:
        for process in reversed(processes):
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
        for log in logs:
            log.close()

if __name__ == '__main__':
    main()
