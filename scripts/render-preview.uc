// Render the production ucode templates with documented, fictional preview data.
// Run from the repository root: ucode -L "$PWD/preview/stubs" scripts/render-preview.uc
import * as fs from 'fs';

const dictionary = {
 'Administration': '管理员', 'Main menu': '主菜单', 'Search': '搜索菜单…', 'Loading…': '正在加载…',
 'No matching results': '没有匹配的菜单', 'Close': '关闭', 'Toggle navigation': '展开或收起侧栏',
 'Location': '当前位置', 'Dark mode': '深色模式', 'Skip to content': '跳到内容',
 'Authorization Required': '登录路由器', 'Please enter your username and password.': '输入管理员账号，开始管理你的网络。',
 'Welcome back!': '欢迎回来', 'Show password': '显示密码', 'Username': '用户名', 'Password': '密码', 'Log in': '登录',
 'Invalid username and/or password! Please try again.': '用户名或密码错误，请重试。',
 'JavaScript required!': '需要 JavaScript',
 'You must enable JavaScript in your browser or LuCI will not work properly.': '请启用 JavaScript 后使用 LuCI。'
};
function encode(value) {
 return replace(`${value ?? ''}`, /[&<>"']/g, v => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[v]);
}
let env = {
 _: value => dictionary[value] ?? value,
 media: '/luci-static/mono', resource: '/luci-static/resources', theme: 'mono',
 ubus: { call: () => ({ hostname: 'OpenWrt', model: 'Redmi AX6000', rootfs_type: 'squashfs' }) },
 http: { prepare_content: () => null },
 dispatcher: { lang: 'zh-cn', build_url: (...parts) => '/cgi-bin/luci/' + join('/', parts), lookup: () => true },
 version: { luciname: 'LuCI', distname: 'OpenWrt', distversion: '24.10.5' },
 node: {}, css: null, blank_page: false, fuser: false, duser: 'root',
 striptags: value => replace(value, /<[^>]*>/g, ''), entityencode: encode,
 ctx: { request_path: ['admin', 'status', 'overview'] }, dispatched: { title: '概览' }
};
let templates = {};
env.include = function(name, values) {
 templates[name] ??= loadfile(`ucode/template/themes/mono/${name}.ut`, { raw_mode: false });
 call(templates[name], null, proto({ ...env, ...(values ?? {}) }, global));
};

const catalog = json(fs.readfile('preview/routes.json'));
for (let group in catalog.groups) {
 for (let page in group.pages) {
  env.ctx.request_path = ['admin', ...split(page.path, '/')];
  env.dispatched.title = page.title;
  let html = render(function() {
   env.include('header');
   print(fs.readfile(`preview/${page.template}.html`));
   env.include('footer');
  });
  fs.writefile(`preview/generated/${page.file}.html`, html);
 }
}
// Keep earlier direct preview URLs aligned with the current page catalog.
env.ctx.request_path = ['admin', 'status', 'realtime', 'bandwidth'];
env.dispatched.title = '原生组件回归';
fs.writefile('preview/generated/native-regression.html', render(function() {
 env.include('header');
 print(fs.readfile('preview/native-regression.html'));
 env.include('footer');
}));

const aliases = { overview: 'status-mono', native: 'status-overview', system: 'system-system', network: 'network-network', components: 'status-components' };
for (let name, target in aliases)
 fs.writefile(`preview/generated/${name}.html`, fs.readfile(`preview/generated/${target}.html`));

env.ctx.request_path = ['admin'];
env.dispatched.title = '登录';
for (let name in ['login', 'login-error']) {
 env.fuser = name == 'login-error';
 fs.writefile(`preview/generated/${name}.html`, render(() => env.include('sysauth')));
}
