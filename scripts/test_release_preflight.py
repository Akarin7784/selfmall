import copy
import importlib.util
from pathlib import Path
import unittest
import yaml

spec = importlib.util.spec_from_file_location('preflight', Path(__file__).with_name('release-preflight.py'))
preflight = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preflight)


class ReleasePreflightTest(unittest.TestCase):
    def setUp(self):
        self.sha = 'a' * 40
        self.evidence = {'releaseCommit': self.sha, 'checks': {
            name: {'passed': True, 'evidence': 'test-fixture-only'} for name in preflight.CHECKS}}
        self.objects = [{'kind': 'Deployment', 'metadata': {'name': 'mall-' + name, 'namespace': 'selfmall-prod'},
                         'spec': {'template': {'spec': {'containers': [{'image': 'registry.internal/mall-' + name + '@sha256:' + 'b' * 64}]}}}}
                        for name in ('gateway','auth','product','inventory','order','member','payment')]
        self.objects.append({'kind': 'Ingress', 'metadata': {'name': 'gateway', 'namespace': 'selfmall-prod'},
                             'spec': {'rules': [{'host': 'mall.internal'}],
                                      'tls': [{'hosts': ['mall.internal'], 'secretName': 'mall-tls'}]}})

    def check(self, objects=None, evidence=None):
        return preflight.check_bundle(yaml.safe_dump_all(objects or self.objects), evidence or self.evidence, self.sha)

    def test_configured_bundle_passes(self):
        self.assertEqual([], self.check())

    def test_mutable_image_is_rejected(self):
        self.objects[0]['spec']['template']['spec']['containers'][0]['image'] = 'registry.internal/mall-gateway:latest'
        self.assertTrue(self.check())

    def test_incomplete_acceptance_is_rejected(self):
        self.evidence['checks'].pop('realIdentityAndAuthorization')
        self.assertTrue(self.check())

    def test_evidence_for_other_commit_is_rejected(self):
        self.evidence['releaseCommit'] = 'c' * 40
        self.assertTrue(self.check())

    def test_embedded_secrets_and_example_hosts_are_rejected(self):
        self.objects.append({'kind': 'Secret', 'metadata': {'name': 'credentials', 'namespace': 'selfmall-prod'}})
        self.objects[-2]['spec']['rules'][0]['host'] = 'mall.example.com'
        self.assertGreaterEqual(len(self.check()), 2)


if __name__ == '__main__':
    unittest.main()
