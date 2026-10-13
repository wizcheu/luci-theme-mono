"""Privacy and isolation regressions for the real LuCI preview."""
import importlib.util
import json
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
def module(name):
    spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/f'{name}.py')
    value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value);return value
mirror=module('mirror');privacy=module('mirror_sanitize')

class MirrorTests(unittest.TestCase):
    def setUp(self):
        self.data=json.loads((ROOT/'preview/mirror/responses.json').read_text())
        self.replay=mirror.Replay(self.data)

    def call(self,obj,method,args):
        return self.replay.rpc({'jsonrpc':'2.0','id':42,'method':'call','params':['offline',obj,method,args]})

    def test_every_captured_page_has_original_html(self):
        pages=self.data['pages'];self.assertEqual(len(pages),50)
        for page in pages:
            html=self.data['records'][page['path']]
            self.assertEqual(html['mime'],'text/html')
            self.assertIn('/luci-static/resources/luci.js',html['body'])

    def test_component_catalogue_keeps_native_shell_and_shared_components(self):
        html=mirror.component_page(self.data)
        self.assertIn('/luci-static/resources/luci.js',html)
        self.assertIn('/preview/ui-library.js',html)
        self.assertIn('admin-status-components',html)
        self.assertNotIn("instantiateView('mono/overview')",html)
        self.assertNotIn('/preview/runtime.js',html)
        self.assertEqual(html.count('id="view"'),1)
        self.assertEqual(html.count('</main>'),1)

    def test_changes_stay_in_memory_and_reset(self):
        before=self.call('uci','get',{'config':'system'})
        name=next(iter(before['result'][1]['values']))
        self.call('uci','set',{'config':'system','section':name,'values':{'hostname':'Local-Test'}})
        self.assertEqual(self.call('uci','get',{'config':'system','section':name})['result'][1]['values']['hostname'],'Local-Test')
        self.assertTrue(self.call('uci','changes',{})['result'][1]['changes'])
        self.call('uci','apply',{'rollback':False})
        self.assertFalse(self.call('uci','changes',{})['result'][1]['changes'])
        self.replay.reset();self.assertEqual(self.call('uci','get',{'config':'system'}),before)
        self.assertEqual(json.loads((ROOT/'preview/mirror/responses.json').read_text()),self.data)

    def test_unknown_shell_command_is_only_simulated(self):
        result=self.call('file','exec',{'command':'/bin/sh','params':['-c','touch /tmp/mono-mirror-must-not-exist']})
        self.assertIn('simulated',result['result'][1]['stdout'])
        self.assertFalse(Path('/tmp/mono-mirror-must-not-exist').exists())
        self.assertTrue(self.replay.actions[-1]['simulation'])
        self.assertIn('error',self.replay.rpc({'method':'call','params':[]}))

    def test_private_values_in_nested_json_html_and_encoded_urls(self):
        s=privacy.Sanitizer();s.discover({'hostname':'Personal-Router','ssid':'Private-Wifi','password':'SecretExample999'})
        sample={'password':'SecretExample999','nested':json.dumps({'auth_pass':'AnotherSecret999','hostname':'Personal-Router'})}
        result=s.value(sample)
        self.assertNotIn('Secret',json.dumps(result));self.assertNotIn('Personal-Router',json.dumps(result))
        html=s.html('<input type="password" value="HiddenPassword"><input data-ui-widget=\'["Textfield","HiddenPassword",{"id":"cbid.config.api_key"}]\'><!-- Private-Wifi -->')
        self.assertNotIn('HiddenPassword',html);self.assertNotIn('Private-Wifi',html)
        s.replacements['private file.yaml']='mono-demo.yaml'
        self.assertNotIn('private',s.request_key('/test?fingerprint=private+file.yaml%3A99'))
        addresses=s.text('10.34.2.3 2606:4700:1234::beef aa:bb:cc:dd:ee:ff')
        self.assertIn('192.0.2.',addresses);self.assertIn('2001:db8:',addresses);self.assertIn('02:00:00:00:00:',addresses)
        self.assertEqual(s.text('https://raw.githubusercontent.com/private/router/main.yaml?token=abc'),'https://example.invalid/preview')
        self.assertEqual(s.text('ss://encoded-credential@example.invalid:123'),'https://example.invalid/preview')

    def test_public_fixture_has_only_placeholder_credentials(self):
        def check(value):
            if isinstance(value,dict):
                for key,item in value.items():
                    if privacy.SECRET.search(key) and isinstance(item,str):self.assertIn(item,('','preview-only'),key)
                    check(item)
            elif isinstance(value,list):
                for item in value:check(item)
        check(self.data['rpc'])
        self.assertNotIn('-----BEGIN PRIVATE KEY-----',json.dumps(self.data))

if __name__=='__main__':unittest.main()
