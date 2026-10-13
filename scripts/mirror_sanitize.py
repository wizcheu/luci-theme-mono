#!/usr/bin/env python3
"""Build a publishable, offline LuCI fixture from the ignored capture directory."""
from __future__ import annotations
import argparse
import base64
import hashlib
from html import escape
from html.parser import HTMLParser
import ipaddress
import json
from pathlib import Path
import re
import shutil
from urllib.parse import parse_qsl, quote, unquote, urlencode, urlsplit

ROOT = Path(__file__).resolve().parents[1]
SECRET = re.compile(r'password|passwd|secret|token|sessionid|ubus_rpc_session|private.?key|auth.?key|auth_user|auth_pass|^dase$|api.?key|access.?key|credential|^key$|^username$', re.I)
PRIVATE_FIELD = re.compile(r'password|passwd|secret|token|sessionid|username|api.?key|auth.?key|subscribe.*url|subscription.*url|\.key$', re.I)
IPV4 = re.compile(r'(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?![\w.])')
IPV6 = re.compile(r'(?<![\w:])(?:[0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}(?![\w:])', re.I)
MAC = re.compile(r'\b(?:[0-9a-f]{2}:){5}[0-9a-f]{2}\b', re.I)
URL = re.compile(r'https?:(?:\\?/){2}(?:\\/|[^\s<>"\x27`\\])+', re.I)
PUBLIC_DOMAINS = ('openwrt.org', 'kernel.org', 'w3.org', 'example.com', 'example.invalid', 'example.net', 'example.org')
PUBLIC_GITHUB_OWNERS = ('openwrt', 'vernesong', 'immortalwrt', 'metacubex', 'dreamacro', 'chartjs', 'codemirror', 'mozilla')


class Sanitizer:
    def __init__(self):
        self.aliases = {}
        self.replacements = {}

    def alias(self, value, prefix):
        key = (prefix, value)
        if key not in self.aliases:
            self.aliases[key] = f'{prefix}-{sum(k[0] == prefix for k in self.aliases) + 1:02d}'
        return self.aliases[key]

    def discover(self, value, key=''):
        if isinstance(value, dict):
            if value.get('.type') in ('rule','redirect','host','domain','config_subscribe') and value.get('name'):
                self.replacements[value['name']] = self.alias(value['name'],'Example')
            if value.get('name') and any(k in value for k in ('mac','macaddr','ipaddrs','ip6addrs')) and not re.match(r'^(?:br-|eth\d|lan\d?|wan\d?|wlan\d|pppoe-|radio\d)',str(value['name'])):
                self.replacements[value['name']] = self.alias(value['name'],'Device')
            for k, v in value.items(): self.discover(v, k)
        elif isinstance(value, list):
            for v in value: self.discover(v, key)
        elif isinstance(value, str):
            if value.lstrip().startswith(('{','[')):
                try: self.discover(json.loads(value),key)
                except (ValueError,TypeError): pass
            if key.lower() in ('hostname', 'host_name', 'ssid') and value and not re.match(r'^(?:Device|Mono-Lab)-\d+$',value):
                self.replacements[value] = self.alias(value, 'Mono-Lab' if key.lower() == 'ssid' else 'Device')
            elif SECRET.search(key) and value not in ('', 'preview-only') and len(value) >= 4:
                self.replacements[value] = 'preview-only'

    def text(self, value):
        # Exact values discovered from structured fields are removed from all
        # other contexts too (HTML, nested JSON strings, and status messages).
        replacements = {k:v for k,v in self.replacements.items() if k != v and len(k) >= 3}
        if replacements:
            pattern = re.compile(r'(?<![A-Za-z0-9_])(?:' + '|'.join(re.escape(k) for k in sorted(replacements,key=len,reverse=True)) + r')(?![A-Za-z0-9_])')
            value = pattern.sub(lambda m:replacements[m[0]],value)
        value = re.sub(r'-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----', '[private key removed]', value)
        value = re.sub(r'\bssh-(?:rsa|ed25519)\s+[A-Za-z0-9+/=]+(?:[^\r\n<]*)', 'ssh-ed25519 ' + demo_public_key() + ' mono-preview@localhost', value)
        value = MAC.sub(lambda m: m[0] if m[0].lower().startswith('02:00:00:00:00:') else '02:00:00:00:00:' + format(int(self.alias(m[0].lower(),'MAC').split('-')[-1]), '02x'), value)
        def v6(match):
            try: ip = ipaddress.IPv6Address(match[0])
            except ValueError: return match[0]
            if ip.is_unspecified or ip.is_loopback or str(ip).startswith('2001:db8:'): return str(ip)
            index = int(self.alias(str(ip), 'IPv6').split('-')[-1])
            return f'2001:db8::{index:x}'
        value = IPV6.sub(v6, value)
        def v4(match):
            try: ip = ipaddress.IPv4Address(match[0])
            except ValueError: return match[0]
            if ip.is_loopback or str(ip).startswith(('0.', '255.', '192.0.2.')) or str(ip) in ('8.8.8.8','1.1.1.1'): return str(ip)
            index = int(self.alias(str(ip), 'IPv4').split('-')[-1])
            return f'192.0.2.{1 + index % 253}'
        value = IPV4.sub(v4, value)
        def url(match):
            from urllib.parse import urlsplit
            raw = match[0].replace('\\/', '/')
            try:
                parts=urlsplit(raw);host=parts.hostname or ''
            except ValueError: return 'https://example.invalid/preview'
            if parts.username or parts.password or any(SECRET.search(k) for k,_ in parse_qsl(parts.query)):
                return 'https://example.invalid/preview'
            if any(host == d or host.endswith('.' + d) for d in PUBLIC_DOMAINS): return match[0]
            if host in ('github.com','raw.githubusercontent.com') and parts.path.strip('/').split('/')[0].lower() in PUBLIC_GITHUB_OWNERS:return match[0]
            if host in ('127.0.0.1','localhost'): return match[0]
            return 'https://example.invalid/preview'
        value = URL.sub(url, value)
        value = re.sub(r'\b(?:ss|ssr|vmess|vless|trojan|hysteria2?|hy2|tuic)://[^\s<>"\x27`]+','https://example.invalid/preview',value,flags=re.I)
        value = re.sub(r'(?<![\w])[\w.+-]+@[\w.-]+\.[a-z]{2,}\b', 'preview@example.invalid', value, flags=re.I)
        value = re.sub(r'\b(?:0001|0003)[0-9a-f]{12,60}(?:%\d+)?\b', lambda m:self.alias(m[0], 'DUID'), value, flags=re.I)
        return value

    def request_key(self, key):
        # Query strings contain percent-encoded filenames and URLs too.
        if key.startswith('POST '):
            path, body = key[5:].split('\n', 1)
            return 'POST ' + self.request_key(path) + '\n' + urlencode([(k,self.text(v)) for k,v in parse_qsl(body,keep_blank_values=True)])
        parts=urlsplit(key)
        query=urlencode([(k,self.text(v)) for k,v in parse_qsl(parts.query,keep_blank_values=True)])
        return self.text(unquote(parts.path)) + ('?'+query if query else '')

    def value(self, value, key=''):
        if SECRET.search(key) and isinstance(value, str): return 'preview-only' if value else ''
        if key.lower() in ('uuid','serial','serial_number') and isinstance(value,str) and value:
            return '00000000-0000-4000-8000-' + hashlib.sha256(self.alias(value,'ID').encode()).hexdigest()[:12]
        if isinstance(value, list): return [self.value(v,key) for v in value]
        if isinstance(value, dict): return {self.text(k):self.value(v,k) for k,v in value.items()}
        if not isinstance(value, str): return value
        # RPC file/exec replies often contain another JSON document as a string.
        if value.lstrip().startswith(('{','[')):
            try: return json.dumps(self.value(json.loads(value)),ensure_ascii=False,separators=(',',':'))
            except (ValueError,TypeError): pass
        return self.text(value)

    def html(self, content):
        parser = PrivateHTML(self)
        parser.feed(content)
        return ''.join(parser.output)


class PrivateHTML(HTMLParser):
    def __init__(self, sanitizer):
        super().__init__(convert_charrefs=False)
        self.s = sanitizer
        self.output = []
        self.private_textarea = False

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        field = data.get('name','') + ' ' + data.get('id','')
        private = data.get('type') == 'password' or PRIVATE_FIELD.search(field)
        if private and 'value' in data: data['value'] = 'preview-only' if data['value'] else ''
        if tag == 'textarea': self.private_textarea = bool(private)
        if 'data-ui-widget' in data:
            try:
                widget = json.loads(data['data-ui-widget'])
                options = widget[-1] if isinstance(widget[-1],dict) else {}
                if PRIVATE_FIELD.search(options.get('id','')) and len(widget)>1 and isinstance(widget[1],str): widget[1]='preview-only' if widget[1] else ''
                data['data-ui-widget'] = json.dumps(self.s.value(widget),ensure_ascii=False,separators=(',',':'))
            except (ValueError,TypeError,IndexError): data['data-ui-widget'] = self.s.text(data['data-ui-widget'])
        self.output.append('<' + tag + ''.join(' '+k if v is None else ' '+k+'="'+escape(self.s.text(v),quote=True)+'"' for k,v in data.items()) + '>')

    def handle_startendtag(self, tag, attrs): self.handle_starttag(tag,attrs)
    def handle_endtag(self, tag):
        if tag == 'textarea': self.private_textarea=False
        self.output.append('</'+tag+'>')
    def handle_data(self, data): self.output.append('preview-only' if self.private_textarea and data.strip() else self.s.text(data))
    def handle_entityref(self, name): self.output.append('&'+name+';')
    def handle_charref(self, name): self.output.append('&#'+name+';')
    def handle_comment(self, data): self.output.append('<!--'+self.s.text(data)+'-->')
    def handle_decl(self, data): self.output.append('<!'+data+'>')


def demo_public_key():
    # Public illustrative key made from fixed bytes; no private key exists here.
    kind=b'ssh-ed25519'
    return base64.b64encode(len(kind).to_bytes(4,'big')+kind+(32).to_bytes(4,'big')+bytes(range(32))).decode()


def sanitize(source):
    s = Sanitizer()
    s.discover(source['rpc'])
    for record in source['records'].values():
        if 'json' in record['mime']:
            try: s.discover(json.loads(record['body']))
            except ValueError: pass
    for key, reply in source['rpc'].items():
        call=json.loads(key)
        if len(call)>1 and call[1] in ('getHostHints','getDUIDHints'):
            for entry in reply.get('result',[0,{}])[1].values():
                if isinstance(entry,dict) and entry.get('name'): s.replacements[entry['name']]=s.alias(entry['name'],'Device')
    # Configuration filenames are user choices, unlike package resource names.
    for record in source['records'].values():
        for name in re.findall(r'(?<=["\x27])[^"\x27\n<>\\/]{1,80}\.ya?ml(?=["\x27])',record['body']):
            if name not in ('config.yaml',):s.replacements[name]='mono-demo.yaml'
    result={'format':1,'description':'Native LuCI frontend, anonymized offline fixtures. No upstream connection.', 'records':{},'rpc':{},'pages':[]}
    for key, record in source['records'].items():
        if key == '/cgi-bin/cgi-exec': continue # obsolete unkeyed capture
        mime=record['mime']; body=record['body']
        if 'javascript' in mime and re.search(r'/(?:translations/|openclash/translate_js)',key): pass
        elif mime=='text/html': body=s.html(body)
        elif 'json' in mime:
            try: body=json.dumps(s.value(json.loads(body)),ensure_ascii=False,separators=(',',':'))
            except ValueError: body=s.text(body)
        else: body=s.text(body)
        if key.startswith('POST /cgi-bin/cgi-exec') and '/bin/dmesg' in unquote(key):
            body='<6>[    0.000000] Linux kernel started (local preview)\n<6>[    1.250000] eth0: link is up\n<6>[    2.500000] br-lan: port 1 entered forwarding state\n'
        result['records'][s.request_key(key)]={'mime':mime,'body':body}
    for key, reply in source['rpc'].items():
        call=json.loads(key)
        safe=s.value(reply)
        if len(call)>2 and call[:2]==['file','read']:
            filename=call[2].get('path','')
            if filename=='/etc/dropbear/authorized_keys': safe={'jsonrpc':'2.0','result':[0,{'data':'ssh-ed25519 '+demo_public_key()+' mono-preview@localhost\n'}]}
            elif filename in ('/etc/crontabs/root','/etc/rc.local','/etc/firewall.user'):safe={'jsonrpc':'2.0','result':[0,{'data':'# Mono local preview — example configuration\n'+('exit 0\n' if filename=='/etc/rc.local' else '')}]}
            elif filename=='/tmp/luci-client-history.json':safe={'jsonrpc':'2.0','result':[0,{'data':'[]'}]}
        if len(call)>1 and call[:2]==['log','read']:
            safe={'jsonrpc':'2.0','result':[0,{'log':[{'id':i,'priority':30,'source':1,'time':1791864000000+i*1000,'msg':message} for i,message in enumerate(['netifd: Interface lan is up','dnsmasq: DHCP service started','uhttpd: Local preview session ready'])]}]}
        if len(call)>1 and call[1]=='getProcessList':
            for proc in safe.get('result',[0,{}])[1].get('result',[]):
                for field in ('COMMAND','Command','command'):
                    if field in proc: proc[field]=str(proc[field]).split(' ')[0]
                if 'USER' in proc: proc['USER']='root'
        result['rpc'][json.dumps(s.value(call),ensure_ascii=False,separators=(',',':'))]=safe
    result['pages']=[{k:s.value(v) for k,v in page.items() if k in ('path','title','type','controls','tabs')} for page in source['pages']]
    # Private subscription/provider data is intentionally replaced wholesale.
    base='/cgi-bin/luci/admin/services/openclash/'
    fixtures={
        'config_name':{'config_name':'mono-demo.yaml','config_path':'/etc/openclash/config/mono-demo.yaml'},
        'config_file_list':{'config_files':[{'name':'mono-demo.yaml','path':'/etc/openclash/config/mono-demo.yaml','size':4096,'mtime':1767268800,'age':False}],'current_config':'/etc/openclash/config/mono-demo.yaml','total_count':1,'fingerprint':'preview'},
        'runtime_stats':{'status':'success','online':True,'version':'Preview','nodes':{'total':12,'types':{'Shadowsocks':12}},'rules':{'total':128,'types':{'DOMAIN':128}},'providers':{'total':1,'items':[{'name':'Example','type':'Proxy','count':12}]},'service_running':True},
        'config_stats':{'status':'success','active':True,'size':4096,'mtime':'2026-01-01 12:00:00'},
        'sub_info_get':{'providers':[],'get_time':'2026-01-01 12:00:00','url_result':[]},
        'unlock_services':{'services':['netflix','ytb','openai','claude'],'enable':True,'auto_ready':False},
        'refresh_log':{'len':1,'update':True,'core_log':'','oc_log':'2026-01-01 12:00:00 [Info] Local preview ready.\n'},
        'toolbar_show':{'connections':12,'up':8192,'down':24576,'up_total':1048576,'down_total':8388608,'mem':68157440,'cpu':'2','load_avg':'4'},
        'toolbar_show_sys':{'cpu':'2','load_avg':'4'},
        'conn_status':{'connections':12},
    }
    for name,value in fixtures.items():
        for key in list(result['records']):
            if key.split('?')[0]==base+name: del result['records'][key]
        result['records'][base+name]={'mime':'application/json','body':json.dumps(value,ensure_ascii=False)}
    for name in ('startlog','del_start_log','get_debug_logs'):
        result['records'][base+name]={'mime':'text/plain','body':''}
    result['records'][base+'myip_check']={'mime':'text/plain','body':'\n'.join(json.dumps({'service':name,'ip':'192.0.2.10','geo':'Example network'}) for name in ('pcol','ipip','ipsb','ipify'))+'\n{"complete":true}\n'}
    for command,body in {
        '/usr/libexec/luci-arp':'',
        '/usr/libexec/luci-peeraddr':'192.0.2.100\n',
        '/usr/libexec/luci-firewall-status':'{"nat_mode":"disabled","tcp_cca":"cubic"}',
        '/usr/sbin/iw dev default_radio0 info':'Interface wlan0\n\tchannel 6 (2437 MHz), width: 20 MHz\n',
        '/usr/sbin/iw dev default_radio1 info':'Interface wlan1\n\tchannel 36 (5180 MHz), width: 80 MHz\n',
    }.items():
        result['records']['POST /cgi-bin/cgi-exec\n'+urlencode({'command':command,'stderr':'0'})]={'mime':'application/octet-stream','body':body}
    return result


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,default=ROOT/'preview/live')
    parser.add_argument('--output',type=Path,default=ROOT/'preview/mirror')
    args=parser.parse_args()
    source=json.loads((args.source/'responses.json').read_text())
    clean=sanitize(source)
    args.output.mkdir(parents=True,exist_ok=True)
    (args.output/'responses.json').write_text(json.dumps(clean,ensure_ascii=False,indent=2)+'\n')
    for folder in ('resources','mono'):
        original=args.source/'www/luci-static'/folder
        destination=args.output/'www/luci-static'/folder
        shutil.copytree(original,destination,dirs_exist_ok=True,symlinks=False)
    manifest={str(p.relative_to(args.output)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(args.output.rglob('*')) if p.is_file() and p.name!='manifest.json'}
    (args.output/'manifest.json').write_text(json.dumps({'source':'Installed LuCI frontend, OpenWrt 24.10.5 / LEDE; Mono 1.0.2 baseline','files':manifest},indent=2)+'\n')
    print(f'Sanitized {len(clean["pages"])} pages, {len(clean["records"])} HTTP responses, {len(clean["rpc"])} RPC fixtures; {len(manifest)} files.')


if __name__=='__main__':main()
