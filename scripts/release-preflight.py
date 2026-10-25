"""Check a rendered production bundle. This is not a cluster or business acceptance test."""
import argparse
import json
import re
from pathlib import Path
import sys
import yaml

ROOT = Path(__file__).resolve().parent.parent
CHECKS = {'realIdentityAndAuthorization', 'orderInventoryPaymentAcceptance',
          'vulnerabilityScanAllSevenImages', 'databaseMigrationAndRestoreDrill',
          'loadAndFailureTesting', 'tlsSecretsAndNetworkPolicies',
          'monitoringAlertsAndOnCall', 'stagingAcceptanceAndRollback'}


def check_bundle(manifest, readiness, commit):
    errors = []
    objects = [x for x in yaml.safe_load_all(manifest) if x]
    deployments = [x for x in objects if x['kind'] == 'Deployment']
    expected = {'mall-' + n for n in ('gateway', 'auth', 'product', 'inventory', 'order', 'member', 'payment')}
    if {x['metadata']['name'] for x in deployments} != expected:
        errors.append('Production bundle must contain all seven services')
    for obj in objects:
        if obj['kind'] != 'Namespace' and obj['metadata'].get('namespace') != 'selfmall-prod':
            errors.append('Unexpected namespace')
        if obj['kind'] == 'Secret':
            errors.append('Do not include Secret values in the release bundle')
        if obj['kind'] == 'ConfigMap':
            values = '\n'.join(obj.get('data', {}).values())
            if any(marker in values.lower() for marker in ('replace_', 'example.com', 'localhost', '.infrastructure.svc.cluster.local')):
                errors.append(f"Replace example infrastructure in {obj['metadata']['name']}")
    for obj in deployments:
        for container in obj['spec']['template']['spec']['containers']:
            if not re.fullmatch(r'[^\s]+@sha256:[a-f0-9]{64}', container['image']):
                errors.append(f"Pin {obj['metadata']['name']} to the scanned image digest")
    ingress = [x for x in objects if x['kind'] == 'Ingress']
    if not ingress:
        errors.append('Missing TLS Ingress')
    for obj in ingress:
        hosts = {rule['host'] for rule in obj['spec'].get('rules', [])}
        tls_hosts = {host for tls in obj['spec'].get('tls', []) if tls.get('secretName') for host in tls.get('hosts', [])}
        if not hosts or not hosts <= tls_hosts or any('example' in h for h in hosts):
            errors.append('Set real Ingress hosts and matching TLS configuration')
    if not re.fullmatch(r'[a-f0-9]{40}', commit) or readiness.get('releaseCommit') != commit:
        errors.append('Readiness evidence must identify the exact 40-character release commit')
    checks = readiness.get('checks', {})
    for name in sorted(CHECKS):
        result = checks.get(name, {})
        if result.get('passed') is not True or not str(result.get('evidence', '')).strip():
            errors.append(f'Acceptance evidence missing: {name}')
    return errors


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--manifest', required=True)
    parser.add_argument('--commit', required=True)
    parser.add_argument('--readiness', default=str(ROOT / 'deploy/release-readiness.json'))
    args = parser.parse_args()
    errors = check_bundle(Path(args.manifest).read_text(encoding='utf-8-sig'),
                          json.loads(Path(args.readiness).read_text(encoding='utf-8-sig')), args.commit)
    if errors:
        print('\n'.join('BLOCKED: ' + e for e in errors))
        return 1
    print('PASS: configuration/evidence checks; cluster server dry-run and release review still required')
    return 0


if __name__ == '__main__':
    sys.exit(main())
