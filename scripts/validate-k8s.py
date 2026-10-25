"""Offline cross-resource checks. Requires kubectl and requirements-k8s.txt."""
from pathlib import Path
import subprocess
import yaml

ROOT = Path(__file__).resolve().parent.parent
NAMES = {'mall-' + name for name in ('gateway', 'auth', 'product', 'inventory', 'order', 'member', 'payment')}


def validate(environment):
    rendered = subprocess.check_output(
        ['kubectl', 'kustomize', f'deploy/k8s/overlays/{environment}'], cwd=ROOT, encoding='utf-8')
    objects = list(yaml.safe_load_all(rendered))
    index = {(o['kind'], o['metadata']['name']): o for o in objects}
    namespace = f'selfmall-{environment}'
    assert len(index) == len(objects), 'Duplicate resource identity'
    assert {name for kind, name in index if kind == 'Deployment'} == NAMES
    assert {name for kind, name in index if kind == 'Service'} == NAMES
    configmaps = {name: obj for (kind, name), obj in index.items() if kind == 'ConfigMap'}
    for obj in objects:
        if obj['kind'] != 'Namespace':
            assert obj['metadata']['namespace'] == namespace
    for name in NAMES:
        deployment = index['Deployment', name]['spec']
        pod = deployment['template']['spec']
        container = pod['containers'][0]
        service = index['Service', name]['spec']
        assert service['selector'] == deployment['selector']['matchLabels']
        assert deployment['selector']['matchLabels'].items() <= deployment['template']['metadata']['labels'].items()
        assert service['ports'][0]['targetPort'] == container['ports'][0]['name'] == 'http'
        assert service['ports'][0]['port'] == container['ports'][0]['containerPort'] == 8080
        assert service['type'] == 'ClusterIP'
        settings, secrets = {}, set()
        for source in container['envFrom']:
            if 'configMapRef' in source:
                settings.update(configmaps[source['configMapRef']['name']]['data'])
            if 'secretRef' in source:
                secrets.add(source['secretRef']['name'])
        assert settings['SPRING_PROFILES_ACTIVE'] == 'cloud,k8s'
        assert settings['SERVER_PORT'] == '8080'
        assert 'localhost' not in settings['NACOS_SERVER_ADDR']
        assert not {'MALL_JWT_SECRET', 'MYSQL_PASSWORD', 'REDIS_PASSWORD', 'NACOS_PASSWORD'} & settings.keys()
        assert secrets == ({'mall-common-secrets', 'mall-product-secrets'} if name == 'mall-product' else {'mall-common-secrets'})
        config_volume = next(v for v in pod['volumes'] if v['name'] == 'config')
        application = yaml.safe_load(configmaps[config_volume['configMap']['name']]['data']['application-k8s.yml'])
        assert settings['SPRING_CONFIG_ADDITIONAL_LOCATION'] == 'file:/app/config/'
        assert any(m['name'] == 'config' and m['mountPath'] == '/app/config' for m in container['volumeMounts'])
        assert application['spring']['cloud']['nacos']['discovery']['enabled'] is False
        routes = application['spring']['cloud']['gateway']['server']['webflux']['routes']
        assert {r['id'] for r in routes} == NAMES - {'mall-gateway'}
        for route in routes:
            assert route['uri'] == f"http://{route['id']}:8080"
            assert len(route['predicates']) == 1 and route['predicates'][0].startswith('Path=')
        assert application['mall-clients']['product-url'] == 'http://mall-product:8080'
        for probe in ('startupProbe', 'livenessProbe', 'readinessProbe'):
            assert container[probe]['httpGet']['port'] == 'http'
            assert container[probe]['httpGet']['path'].startswith('/actuator/health/')
        assert pod['terminationGracePeriodSeconds'] > 40  # 10s preStop + 30s graceful shutdown
        assert pod['automountServiceAccountToken'] is False
        assert container['securityContext']['readOnlyRootFilesystem'] is True
    for (kind, name), obj in index.items():
        if kind == 'HorizontalPodAutoscaler':
            target = obj['spec']['scaleTargetRef']['name']
            assert ('Deployment', target) in index
            assert obj['spec']['minReplicas'] >= 2
            assert 'replicas' not in index['Deployment', target]['spec'], 'Do not override HPA on apply'
        if kind == 'Ingress':
            backend = obj['spec']['rules'][0]['http']['paths'][0]['backend']['service']
            assert backend['name'] == 'mall-gateway' and backend['port']['number'] == 8080
    if environment == 'prod':
        assert ('NetworkPolicy', 'default-deny-ingress') in index
        product_env = index['Deployment', 'mall-product']['spec']['template']['spec']['containers'][0]['env']
        assert any(e['name'] == 'SPRING_FLYWAY_ENABLED' and e['value'] == 'false' for e in product_env)
        assert index['Namespace', namespace]['metadata']['labels']['pod-security.kubernetes.io/enforce'] == 'restricted'
    print(f'PASS {environment}: {len(objects)} resources; routing, probes, config, Secrets and selectors verified')


if __name__ == '__main__':
    validate('dev')
    validate('prod')
