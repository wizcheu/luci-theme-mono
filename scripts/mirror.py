#!/usr/bin/env python3
"""Run captured LuCI frontend locally. No upstream connection or shell execution."""
from __future__ import annotations
import argparse
import copy
import json
import mimetypes
import re
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, unquote

ROOT = Path(__file__).resolve().parents[1]
COMPONENTS_PATH = '/cgi-bin/luci/admin/status/components'


def current_shell(html):
    """Apply the current Mono shell to every captured native page."""
    html = re.sub(r'<div class="mono-user"[^>]*>.*?</div>', '', html, flags=re.S)
    if '/mono/shadcn.css' not in html:
        html = html.replace('</head>', '<link rel="stylesheet" href="/luci-static/mono/shadcn.css"></head>')
    html = html.replace('WORKSPACE', '控制面板').replace('OpenWrt 控制中心', 'OpenWrt 管理控制台')
    html = html.replace('Mono 1.0.2', 'Mono').replace('LuCI (HEAD detached at FETCH_HEAD) branch', 'LuCI')
    html = html.replace('aria-label="Toggle navigation"', 'aria-label="展开或收起侧栏"')
    html = html.replace('aria-label="Main menu"', 'aria-label="主菜单"').replace('aria-label="Location"', 'aria-label="当前位置"')
    return html


def component_page(data):
    """Show the existing shared-control catalogue inside the captured LuCI shell."""
    html = current_shell(data['records']['/cgi-bin/luci/admin/status/mono']['body'])
    def environment(match):
        env = json.loads(match[1])
        env.update(pathinfo='/admin/status/components', requestpath=['admin','status','components'],
                   dispatchpath=['admin','status','components'],
                   nodespec={'satisfied':True,'title':'组件规范','action':{'type':'view','path':'preview/components'}})
        return 'L = new LuCI(' + json.dumps(env, ensure_ascii=False) + ');'
    html = re.sub(r'L = new LuCI\((.*?)\);', environment, html, flags=re.S)
    html = html.replace('admin-status-mono','admin-status-components').replace('网络概览','组件规范')
    return re.sub(r'<div id="view">.*?</div>\s*</main>',
                  '<div id="view" class="mono-library"></div><script src="/preview/ui-library.js"></script></main>', html, flags=re.S)


def normalized_url(url):
    parts = urlsplit(url)
    query = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True)
             if not (k.isdigit() and len(k) >= 10) and k not in ('v', '_', 'token', 'sid', 'mono-baseline')]
    return parts.path + ('?' + urlencode(query) if query else '')


def http_key(method, url, body=''):
    key = normalized_url(url)
    if method == 'POST':
        pairs = [(k, v) for k, v in parse_qsl(body, keep_blank_values=True)
                 if k not in ('sessionid', 'token', 'sid', 'ubus_rpc_session')]
        key = 'POST ' + key + '\n' + urlencode(sorted(pairs))
    return key


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'), sort_keys=True)


class Replay:
    def __init__(self, data):
        self.data = data
        self.rpc_fixtures = {compact(json.loads(k)): v for k, v in data['rpc'].items()}
        self.reset()

    def reset(self):
        self.configs = {}
        for key, reply in self.rpc_fixtures.items():
            args = json.loads(key)
            if len(args) == 3 and args[:2] == ['uci', 'get']:
                result = reply.get('result', [])
                if len(result) > 1 and isinstance(result[1], dict):
                    self.configs[args[2]['config']] = copy.deepcopy(result[1].get('values', {}))
        self.original = copy.deepcopy(self.configs)
        self.changes = {}
        self.files = {}
        self.missing = set()
        self.actions = []
        self.next_section = 0

    def rpc(self, call):
        params = call.get('params') or []
        result = {'jsonrpc': '2.0', 'id': call.get('id')}
        if call.get('method') != 'call':
            fixture = self.rpc_fixtures.get(compact([call.get('method'), params]))
            return {**(fixture or {'jsonrpc':'2.0', 'result':{}}), 'id':call.get('id')}
        if not isinstance(params,list) or len(params)!=4 or not isinstance(params[3],dict):
            return {**result,'error':{'code':-32602,'message':'Invalid params'}}
        _, obj, method, args = params
        key = compact([obj, method, args])
        if obj == 'session' and method == 'access':
            result['result'] = [0, {'access': True}]
        elif obj == 'uci':
            result['result'] = self.uci(method, args)
        elif obj == 'file' and method == 'read' and args.get('path') in self.files:
            result['result'] = [0, {'data': self.files[args['path']]}]
        elif obj == 'file' and method in ('write', 'remove'):
            self.files[args.get('path', '')] = args.get('data', '') if method == 'write' else ''
            self.actions.append({'object': obj, 'method': method, 'simulation': True})
            result['result'] = [0]
        elif key in self.rpc_fixtures:
            result.update(self.rpc_fixtures[key])
        elif (obj == 'file' and method == 'exec') or (obj,method) in {
            ('rc','init'),
            ('system','reboot'), ('luci','setLocaltime'), ('luci','setInitAction'),
            ('network.interface','up'), ('network.interface','down'), ('luci','setBlockDetect')
        }:
            self.actions.append({'object':obj,'method':method,'simulation':True})
            result['result']=[0,{'code':0,'stdout':'Local preview: simulated successfully.\n','stderr':''}] if obj=='file' else [0]
        else:
            self.missing.add(key)
            result['result'] = [4]
        result['id'] = call.get('id')
        return result

    def uci(self, method, args):
        config, section = args.get('config'), args.get('section')
        if method == 'get':
            values = copy.deepcopy(self.configs.get(config, {}))
            if section: values = values.get(section, {})
            if args.get('type'): values = {k:v for k,v in values.items() if v.get('.type') == args['type']}
            if args.get('option'): return [0, {'value': values.get(args['option'])}]
            return [0, {'values': values}]
        if method == 'changes': return [0, {'changes': self.changes}]
        if method in ('apply', 'confirm', 'commit'):
            self.actions.append({'object':'uci', 'method':method, 'simulation':True})
            self.changes.clear()
            return [0, {'token':'preview-only'}] if method == 'apply' else [0]
        if method in ('revert', 'rollback'):
            self.configs = copy.deepcopy(self.original)
            self.changes.clear()
            return [0]
        if method in ('set', 'add', 'delete', 'order'):
            values = self.configs.setdefault(config, {})
            if method == 'add':
                self.next_section += 1
                section = args.get('name') or f'preview{self.next_section:04d}'
                values[section] = {'.name':section, '.type':args.get('type'), '.anonymous':not args.get('name'), '.index':len(values), **args.get('values', {})}
            elif method == 'set': values.setdefault(section, {}).update(args.get('values', {}))
            elif method == 'delete':
                if args.get('options'):
                    for option in args['options']: values.get(section, {}).pop(option, None)
                else: values.pop(section, None)
            elif method == 'order':
                for i, name in enumerate(args.get('sections', [])):
                    if name in values: values[name]['.index'] = i
            self.changes.setdefault(config, []).append([method, section or ''])
            self.actions.append({'object':'uci', 'method':method, 'simulation':True})
            return [0, {'section':section}] if method == 'add' else [0]
        fixture = self.rpc_fixtures.get(compact(['uci', method, args]))
        return fixture.get('result', [4]) if fixture else [4]


def create_handler(directory, replay):
    data_file = directory / 'responses.json'
    last_loaded = data_file.stat().st_mtime_ns if data_file.exists() else 0
    refresh_lock = threading.Lock()
    class Handler(BaseHTTPRequestHandler):
        def refresh_fixtures(self):
            nonlocal last_loaded
            if not data_file.exists() or data_file.stat().st_mtime_ns == last_loaded: return
            with refresh_lock:
                try:
                    data = json.loads(data_file.read_text())
                    data['menu'] = json.loads(data['records'].get('/cgi-bin/luci/admin/menu',{}).get('body','{}'))
                    replay.__init__(data)
                    last_loaded = data_file.stat().st_mtime_ns
                except (ValueError,OSError): pass # Writer may be replacing a fixture; retry next request.
        def reply(self, status, content, mime='application/json'):
            payload = content if isinstance(content, bytes) else content.encode()
            self.send_response(status)
            self.send_header('Content-Type', mime + ('; charset=utf-8' if 'text' in mime or 'json' in mime or 'javascript' in mime else ''))
            self.send_header('Content-Length', str(len(payload)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self'; form-action 'self'; object-src 'none'; base-uri 'self'")
            self.send_header('Referrer-Policy','no-referrer')
            self.end_headers()
            self.wfile.write(payload)

        def json_reply(self, value, status=200): self.reply(status, compact(value))

        def do_GET(self):
            self.refresh_fixtures()
            self.serve('GET')

        def do_POST(self):
            self.refresh_fixtures()
            try: length = int(self.headers.get('Content-Length', 0))
            except ValueError: return self.json_reply({'error':'invalid length'},400)
            if length < 0 or length > 2_000_000: return self.json_reply({'error':'too large'}, 413)
            body = self.rfile.read(length).decode('utf-8', errors='replace')
            path = urlsplit(self.path).path
            if path == '/cgi-bin/luci' or path == '/login':
                self.send_response(303)
                self.send_header('Location', '/login-error')
                self.end_headers()
                return
            if path.rstrip('/') in ('/ubus', '/cgi-bin/luci/admin/ubus'):
                try:
                    calls = json.loads(body)
                    return self.json_reply([replay.rpc(c) for c in calls] if isinstance(calls,list) else replay.rpc(calls))
                except (ValueError, TypeError, KeyError): return self.json_reply({'error':'invalid request'},400)
            if path == '/__mirror/reset':
                replay.reset()
                return self.json_reply({'reset':True})
            if path == '/__mirror/action':
                replay.actions.append({'object':'legacy-form','method':'submit','simulation':True})
                return self.json_reply({'simulated':True})
            if path.startswith('/cgi-bin/luci/admin/uci/'):
                action=path.rsplit('/',1)[-1]
                if action in ('apply_rollback','apply_unchecked','confirm','revert'):
                    replay.uci('revert' if action=='revert' else 'apply',{})
                    if action=='apply_rollback':return self.json_reply({'token':'preview-only'})
                    return self.reply(200 if action=='revert' else 204,'')
            self.serve('POST', body)

        def serve(self, method, body=''):
            parts = urlsplit(self.path)
            path = unquote(parts.path)
            if path in ('/login', '/login-error', '/cgi-bin/luci/admin/logout'):
                name = 'login-error' if path == '/login-error' else 'login'
                return self.reply(200, current_shell((ROOT / 'preview/generated' / (name + '.html')).read_text()), 'text/html')
            if path == '/__mirror/status':
                return self.json_reply({'pages':replay.data['pages'], 'missing':sorted(replay.missing), 'actions':replay.actions})
            if path == '/__mirror/terminal':
                return self.reply(200,'<!doctype html><meta charset="utf-8"><style>body{background:#151c2b;color:#cdd9ee;padding:24px;font:14px/1.8 monospace}input{background:none;color:inherit;border:0;outline:none;font:inherit;width:75%}</style><p>Mono · 本地终端预览</p><p>保留终端区域与输入体验。此副本不连接路由器，也不执行命令。</p><pre id="output">root@Mono-Lab:~#</pre><form onsubmit="event.preventDefault();document.getElementById(\'output\').textContent+=\' \' + this.command.value + \'\\n[本地模拟] 命令未执行。\\nroot@Mono-Lab:~#\';this.reset()"><label for="command">$ </label><input autofocus name="command" id="command" aria-label="本地模拟命令"></form>','text/html')
            if path in ('/', '/cgi-bin/luci', '/cgi-bin/luci/admin'):
                path = '/cgi-bin/luci/admin/status/mono'
            if path in ('/mirror-runtime.js', '/mirror-runtime.css'):
                file = ROOT / 'preview' / path[1:]
                return self.reply(200, file.read_bytes(), mimetypes.guess_type(file)[0] or 'text/plain')
            if path == '/preview/ui-library.js':
                return self.reply(200,(ROOT / 'preview/ui-library.js').read_bytes(),'text/javascript')
            if path == '/luci-static/resources/view/mono/overview.js':
                return self.reply(200,(ROOT / 'preview/overview.js').read_bytes(),'text/javascript')
            if path == '/cgi-bin/luci/admin/menu':
                menu = copy.deepcopy(replay.data['menu'])
                menu['children']['admin']['children']['status']['children']['mono']['order'] = 0
                menu['children']['admin']['children']['status']['children']['components'] = {
                    'title':'组件规范','order':99,'satisfied':True,
                    'action':{'type':'view','path':'preview/components'}}
                return self.json_reply(menu)
            if path == COMPONENTS_PATH:
                html = component_page(replay.data).replace('<head>','<head><link rel="stylesheet" href="/mirror-runtime.css"><script defer src="/mirror-runtime.js"></script>')
                return self.reply(200,html,'text/html')
            if path.startswith(('/luci-static/', '/__baseline/luci-static/')):
                original = path.startswith('/__baseline/')
                local = path.removeprefix('/__baseline')
                candidate = ROOT / 'htdocs' / local.lstrip('/')
                if original or not candidate.is_file(): candidate = directory / 'www' / local.lstrip('/')
                allowed = (directory / 'www').resolve() if original or not (ROOT / 'htdocs' / local.lstrip('/')).is_file() else (ROOT / 'htdocs').resolve()
                if not candidate.resolve().is_relative_to(allowed): return self.json_reply({'error':'invalid path'},400)
                if candidate.is_file(): return self.reply(200,candidate.read_bytes(),mimetypes.guess_type(candidate)[0] or 'application/octet-stream')
                return self.json_reply({'error':'missing static resource'},404)
            key = http_key(method, self.path if path == parts.path else path, body)
            record = replay.data['records'].get(key)
            if record is None and method=='GET' and path.startswith('/cgi-bin/luci/admin/services/openclash/'):
                record=replay.data['records'].get(path)
                endpoint=path.rsplit('/',1)[-1]
                if endpoint=='website_check':
                    query=dict(parse_qsl(parts.query)); domains=(query.get('domains') or query.get('domain','example.com')).split(',')
                    return self.reply(200,'\n'.join(compact({'domain':domain,'success':True,'response_time':24,'preview':True}) for domain in domains)+'\n','text/plain')
                if endpoint=='addr_info': return self.reply(200,'{"complete":true}\n','text/plain')
            if record is None and method=='POST':
                record=replay.data['records'].get(path)
                if record and record['mime']=='text/html':replay.actions.append({'object':'legacy-form','method':'submit','simulation':True})
            if record is None and method == 'GET':
                # Menu aliases resolve to the exact captured leaf, never to a custom mock page.
                node = replay.data.get('menu', {})
                for segment in path.removeprefix('/cgi-bin/luci/').split('/'):
                    node = node.get('children', {}).get(segment, {})
                action = node.get('action', {})
                if action.get('type') == 'alias': record = replay.data['records'].get('/cgi-bin/luci/' + action['path'])
                elif action.get('type') == 'firstchild':
                    children = sorted(node.get('children', {}).items(), key=lambda p:p[1].get('order', 999))
                    for name, child in children:
                        if child.get('satisfied'):
                            record = replay.data['records'].get(path + '/' + name)
                            if record: break
            if record:
                content, mime = record['body'], record['mime']
                if mime == 'text/html':
                    baseline = dict(parse_qsl(parts.query)).get('mono-baseline') == '1'
                    if baseline: content = content.replace('/luci-static/', '/__baseline/luci-static/')
                    else: content = current_shell(content)
                    content = content.replace('<head>', '<head><link rel="stylesheet" href="/mirror-runtime.css"><script defer src="/mirror-runtime.js"></script>')
                return self.reply(200, content, mime)
            replay.missing.add(key)
            return self.json_reply({'error':'This endpoint has not been captured. No router request was made.', 'preview':True},404)

        def log_message(self, *_): pass
    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8101)
    parser.add_argument('--data', type=Path, default=ROOT / 'preview/mirror')
    args = parser.parse_args()
    data = json.loads((args.data / 'responses.json').read_text())
    menu = data['records'].get('/cgi-bin/luci/admin/menu', {})
    data['menu'] = json.loads(menu.get('body', '{}'))
    replay = Replay(data)
    server = ThreadingHTTPServer(('127.0.0.1',args.port),create_handler(args.data,replay))
    print(f'Native LuCI mirror: http://127.0.0.1:{args.port} — {len(data["pages"])} captured pages; offline simulation only',flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()


if __name__ == '__main__': main()
