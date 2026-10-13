/* Local design studies. Every action below updates fictional browser data only.
   Route/field metadata mirrors the inspected LuCI installation; there are no router RPCs. */
(async function () {
 'use strict';
 const UI = window.MonoUI, d = UI.dom, root = document.getElementById('view');
 if (!root?.classList.contains('mono-admin-page')) return;
 const [catalog, schemas] = await Promise.all([
  fetch('/preview/routes.json').then(r => r.json()),
  fetch('/preview/backend-fields.json').then(r => r.json())
 ]);
 const path = location.pathname.replace('/cgi-bin/luci/admin/', '').split('/'), key = path.slice(0, 2).join('/');
 const page = catalog.groups.flatMap(g => g.pages).find(p => p.path === key);
 const clone = value => JSON.parse(JSON.stringify(value));
 const unwrap = value => value?.element || value;
 const stack = (...nodes) => d('div', { class: 'ap-stack' }, nodes.flat().map(unwrap));
 const row = (...nodes) => d('div', { class: 'ap-inline' }, nodes.flat().map(unwrap));
 const muted = text => d('span', { class: 'ap-muted' }, text);
 const tag = (label, tone = 'neutral') => UI.tag({ label, tone }).element;
 const button = (label, onClick, variant = 'default', icon) => UI.button({ label, onClick, variant, icon }).element;
 const link = (label, route, icon) => d('a', { href: '/cgi-bin/luci/admin/' + route, class: 'btn small au-button' }, [icon ? UI.icon(icon) : null, label]);
 const card = (title, children, extra, description) => UI.card({ title, description, children, extra }).element;
 const pair = (name, value, icon = 'device') => d('div', { class: 'ap-identity' }, [d('span', { class: 'ap-identity-icon' }, UI.icon(icon)), d('div', {}, [d('strong', {}, name), d('small', {}, value)])]);
 const grid = (...nodes) => d('div', { class: 'ap-grid' }, nodes.flat().map(unwrap));
 const metrics = items => d('div', { class: 'ap-metrics' }, items.map(item => d('div', { class: 'ap-metric' }, [d('span', { class: 'ap-metric-label' }, item[0]), d('strong', {}, item[1]), muted(item[2])] )));
 const field = (label, type = 'text', value = '', options) => ({ label, key: label, type, value, options });
 const models = []; let changed = false;
 const saveBar = UI.saveBar({ message: '所有更改已保存', actions: [button('复位', reset, 'plain'), button('保存', () => saved()), button('保存并应用', () => saved('更改已应用'), 'solid')] });
 function dirty() { changed = true; saveBar.setState(true); }
 function register(api) { models.push({ api, saved: clone(api.getValue()) }); return api; }
 function saved(message = '更改已保存') {
  models.forEach(model => { model.saved = clone(model.api.getValue()); });
  changed = false; saveBar.setState(false, message);
  UI.toast({ message, tone: 'success' });
 }
 function reset() { models.forEach(model => model.api.setValue(clone(model.saved))); changed = false; saveBar.setState(false, '已恢复已保存的设置'); }
 function confirm(title, message, action, label = '确认', variant = 'solid') {
  const modal = UI.dialog({ title, description: message, actions: [{ label: '取消', variant: 'plain' }, { label, variant, onClick: action }], onClose() { modal.destroy(); } });
  modal.open(); return modal;
 }
 function footer() { return saveBar.element; }
 function listControl(value = [], label = '列表', onChange = dirty) {
  let values = Array.isArray(value) ? value.slice() : value ? String(value).split('\n') : [];
  const list = d('div', { class: 'ap-token-list' }), input = UI.input({ label: '添加' + label, placeholder: '输入后添加' });
  function draw() { list.replaceChildren(...values.map((text, index) => d('div', { class: 'ap-token' }, [d('span', {}, text), UI.button({ icon: 'close', variant: 'plain', ariaLabel: '移除 ' + text, onClick() { values.splice(index, 1); draw(); onChange(); } }).element]))); }
  function add() { const text = input.getValue().trim(); if (!text) return; if (!values.includes(text)) values.push(text); input.setValue(''); draw(); onChange(); }
  input.control.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); add(); } });
  const element = stack(list, row(input, button('添加', add, 'default', 'plus'))); element.classList.add('ap-list-control'); draw();
  return { element, getValue: () => values.slice(), setValue(next) { values = next.slice(); draw(); } };
 }
 const examples = {
  '本地域名': 'lan', 'DNS 服务器端口': '53', 'DNS 查询缓存的大小': '150', '最大并发查询数': '150', '最大 EDNS0 数据包大小': '1232',
  '最大 DHCP 租约数': '150', '租约文件': '/tmp/dhcp.leases', '解析文件': '/tmp/resolv.conf.d/resolv.conf.auto', '日志长度': '250',
  'DNS 监听端口': '7874', '流量转发端口': '7892', 'TProxy 端口': '7895', 'HTTP(S) 代理端口': '7890', 'SOCKS5 代理端口': '7891',
  'HTTP(S)&SOCKS5 混合代理端口': '7893', '管理页面端口': '9090', '日志大小（KB）': '1024', '延迟启动（秒）': '0',
  '通知间隔': '900', 'SOAP/HTTP 端口': '5000', 'STUN 主机': 'stun.example.com', 'STUN 端口': '3478',
  '状态目录': '/var/run/ddns', '日志目录': '/var/log/ddns', '日期格式': '%F %R', 'TFTP 服务器根目录': '/srv/tftp',
  '服务网址': 'https://example.com', '全局 User-Agent': 'clash.meta', 'Fake-IP 地址范围 (IPv4 Cidr)': '198.18.0.1/16'
 };
 function makeField(spec, track = true) {
  const options = (spec.options || []).filter(Boolean), value = spec.value ?? examples[spec.label] ?? (spec.type === 'checkbox' ? false : spec.type === 'list' ? [] : '');
  const onChange = track ? dirty : () => {};
  let control;
  if (spec.type === 'checkbox') control = UI.switcher({ label: spec.label, checked: !!value, onChange });
  else if (spec.type === 'select' && options.length) control = UI.select({ label: spec.label, items: options, value: value || options[0], onChange });
  else if (spec.type === 'list') control = listControl(value, spec.label, onChange);
  else control = UI.input({ label: spec.label, value, type: spec.type === 'password' ? 'password' : spec.type === 'number' ? 'number' : 'text', multiline: spec.type === 'textarea', rows: spec.rows || 4, placeholder: spec.placeholder || (spec.type === 'select' ? '默认' : ''), readonly: spec.readonly, onChange });
  if (spec.required && control.control) control.control.required = true;
  if (track && !spec.readonly) register(control);
  const element = spec.type === 'checkbox' ? d('div', { class: 'ap-field ap-switch-field' }, [control.element, spec.help ? muted(spec.help) : null]) : UI.field({ label: spec.label, control, help: spec.help, required: spec.required }).element;
  element.classList.add('ap-field'); if (['textarea', 'list'].includes(spec.type) || spec.wide) element.classList.add('ap-field-wide');
  return { element, control, spec };
 }
 function form(fields, options = {}) {
  const controls = fields.map(spec => makeField(typeof spec === 'string' ? field(spec) : spec, options.track !== false));
  const element = d('div', { class: 'ap-form-grid' }, controls.map(item => item.element));
  return { element, controls, read: () => Object.fromEntries(controls.map(item => [item.spec.key || item.spec.label, item.control.getValue()])), valid: () => controls.every(item => !item.control.control?.reportValidity || item.control.control.reportValidity()) };
 }
 function tabs(items, main = true, selected) {
  const candidates = [selected, main ? location.hash.slice(1) : null, main ? path[2] : null];
  const value = candidates.find(v => items.some(item => item.value === v));
  return UI.tabs({ label: main ? page.title + '分类' : '设置分组', variant: 'underline', value, items: items.map(item => ({ ...item, content: unwrap(item.content) })), onChange: main ? value => history.replaceState(null, '', '#' + value) : undefined }).element;
 }
 function schemaTabs(schemaKey, extras = [], main = true) {
  const fields = (schemas[schemaKey] || []).filter(f => !f.skip), groups = [...new Set(fields.map(f => f.panel))];
  return tabs([...groups.map((label, index) => ({ value: String(index), label, content: card(label, form(fields.filter(f => f.panel === label)).element) })), ...extras], main);
 }
 function table(columns, rows) { return UI.table({ columns: columns.map(c => typeof c === 'string' ? { key: c, title: c } : c), rows }).element; }
 function editor(title, specs, onSave, values = {}) {
  const fields = specs.map(spec => ({ ...spec, value: values[spec.key || spec.label] ?? spec.value })), formView = form(fields, { track: false });
  const modal = UI.dialog({ title, width: 700, children: formView.element, actions: [{ label: '取消', variant: 'plain' }, { label: '保存', variant: 'solid', onClick() { if (!formView.valid()) return false; onSave(formView.read()); dirty(); } }], onClose() { modal.destroy(); } });
  modal.open(); return modal;
 }
 function collection(options) {
  let rows = clone(options.rows || []), query = '', filterValue = 'all';
  const selectedKeys = options.fields || options.columns.filter(c => c.key && c.key !== 'actions').map(c => ({ label: c.title, key: c.key, type: 'text' }));
  const state = { getValue: () => rows, setValue(next) { rows = clone(next); draw(); } }; register(state);
  const extraColumns = options.readonly ? [] : [{ key: 'actions', title: '', render(_, item) {
   return row(UI.button({ icon: 'edit', variant: 'plain', ariaLabel: '编辑 ' + (item.name || item.id || ''), onClick: () => edit(item) }).element,
    UI.dropdown({ label: '更多', items: [ ...(options.rowActions ? options.rowActions(item, draw) : []), { label: '删除', icon: 'trash', danger: true, onClick: () => confirm('删除这条记录？', '删除后，这条记录将从列表中移除。', () => { rows = rows.filter(r => r !== item); draw(); dirty(); }, '删除', 'danger') }] }).element);
  } }];
  const tableView = UI.table({ columns: [...options.columns, ...extraColumns], rows, rowKey: 'id', emptyText: '没有匹配的记录' });
  const count = muted(''); count.classList.add('ap-table-count');
  function draw() { const visible = rows.filter(item => JSON.stringify(item).toLowerCase().includes(query.toLowerCase()) && (!options.filter || filterValue === 'all' || String(item[options.filter.key]) === filterValue)); tableView.setRows(visible); count.textContent = visible.length + ' 条记录'; }
  function edit(item) { editor(item ? '编辑' + (options.entity || '记录') : '添加' + (options.entity || '记录'), selectedKeys, values => { if (item) Object.assign(item, values); else rows.push({ id: 'item-' + Date.now(), ...values }); draw(); }, item || {}); }
  const search = UI.search({ label: options.searchLabel || '搜索' + (options.entity || '记录'), placeholder: options.placeholder || '搜索名称、地址…', size: 'sm', onChange(value) { query = value; draw(); } });
  const toolbar = d('div', { class: 'ap-table-toolbar' }, [search.element, options.filter ? UI.select({ label: '筛选', size: 'sm', value: 'all', items: [{ value: 'all', label: '全部' }, ...options.filter.items], onChange(value) { filterValue = value; draw(); } }).element : null, count]);
  const add = options.readonly ? options.extra : button(options.addLabel || '添加', () => edit(), 'solid', 'plus');
  const element = card(options.title, [toolbar, tableView.element], add, options.description); element.classList.add('ap-table-card'); draw();
  return { element, rows: () => rows, draw, edit };
 }
 function codeEditor(title, value, help, readonly = false) {
  const input = UI.input({ multiline: true, label: title, rows: 14, value, readonly, onChange: dirty });
  input.element.classList.add('ap-code-editor'); if (!readonly) register(input);
  return card(title, [help ? d('p', { class: 'ap-muted ap-code-help' }, help) : null, input.element]);
 }
 function download(name, content) { const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' })); const a = d('a', { href: url, download: name }); a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
 const logLines = [
  ['10:12:05', 'info', 'netifd', 'Interface wan is now up'], ['10:12:04', 'info', 'odhcpd', 'Router advertisement sent on br-lan'],
  ['10:12:01', 'notice', 'hostapd', 'wlan1: AP-STA-CONNECTED 02:00:00:00:02:01'], ['10:11:58', 'info', 'dnsmasq', 'DHCPACK(br-lan) 192.168.1.120 workstation'],
  ['10:11:43', 'warning', 'netifd', 'Interface wan6: waiting for link'], ['10:11:40', 'info', 'sysntpd', 'System clock synchronized'],
  ['10:11:30', 'notice', 'firewall', 'Reloading firewall due to ifup of wan'], ['10:11:29', 'info', 'kernel', 'br-lan: port 2 entered forwarding state']
 ];
 function logPanel(title = '系统日志') {
  let paused = false, query = '', level = 'all', lines = logLines.slice(); const output = d('div', { class: 'ap-log-output', role: 'log', 'aria-label': title });
  const total = muted('');
  function draw() { const filtered = lines.filter(line => (level === 'all' || line[1] === level) && line.join(' ').toLowerCase().includes(query.toLowerCase())); output.replaceChildren(...filtered.map(line => d('div', { class: 'ap-log-line' }, [d('time', {}, line[0]), tag(line[1], line[1] === 'warning' ? 'warning' : 'neutral'), d('strong', {}, line[2]), d('span', {}, line[3])]))); if (!filtered.length) output.append(d('div', { class: 'ap-empty' }, '没有匹配的日志')); total.textContent = filtered.length + ' 条日志'; }
  const pause = button('暂停刷新', () => { paused = !paused; pause.textContent = paused ? '继续刷新' : '暂停刷新'; }, 'default', 'clock');
  const search = UI.search({ label: '筛选日志', placeholder: '搜索进程、关键字…', onChange(value) { query = value; draw(); } });
  const filter = UI.select({ label: '日志级别', size: 'sm', value: 'all', items: [{ value: 'all', label: '所有级别' }, 'info', 'notice', 'warning'], onChange(value) { level = value; draw(); } });
  const extra = row(pause, button('导出', () => download('system-log.txt', lines.map(l => l.join(' ')).join('\n')), 'default', 'download'));
  draw(); return card(title, [d('div', { class: 'ap-table-toolbar' }, [search.element, filter.element, total]), output, d('div', { class: 'ap-log-foot' }, [muted('最近日志'), button('滚动到底部', () => output.scrollTo({ top: output.scrollHeight, behavior: 'smooth' }), 'plain')])], extra);
 }
 function overview() {
  const ports = d('div', { class: 'ap-ports' }, ['WAN', 'LAN 1', 'LAN 2', 'LAN 3', 'LAN 4'].map((name, i) => d('div', { class: 'ap-port' + (i < 3 ? ' is-up' : '') }, [UI.icon('network'), d('strong', {}, name), muted(i < 3 ? '1 Gbit/s' : '未连接')])));
  const system = card('系统', table([{ key: 'label', title: '项目' }, { key: 'value', title: '信息' }], [['主机名', 'OpenWrt'], ['型号', 'Xiaomi Redmi Router AX6000'], ['架构', 'ARMv8 / mediatek filogic'], ['固件', 'OpenWrt 24.10.5'], ['内核', '6.6'], ['本地时间', '2026-10-12 10:12:05'], ['运行时间', '3 天 12 小时 28 分钟']].map(([label, value]) => ({ label, value }))), link('设置', 'system/system'));
  const memory = card('内存与存储', stack(d('div', {}, [row(d('strong', {}, '内存使用'), muted('126 / 512 MiB')), UI.progress({ value: 25 }).element]), d('div', {}, [row(d('strong', {}, '根目录空间'), muted('46 / 128 MiB')), UI.progress({ value: 36 }).element]), d('div', {}, [row(d('strong', {}, '临时空间'), muted('8 / 256 MiB')), UI.progress({ value: 3 }).element])), link('挂载点', 'system/mounts'));
  return stack(metrics([['系统负载', '0.04', '1 分钟平均负载'], ['CPU 使用率', '2.4%', '4 核处理器'], ['在线设备', '12', '有线 3 · 无线 9']]), grid(system, memory), card('以太网端口', ports, link('管理', 'network/network')), grid(card('IPv4 上游', stack(pair('wan', 'PPPoE · pppoe-wan', 'globe'), tag('已连接', 'success'), table(['项目', '信息'], [{ 项目: '地址', 信息: '198.51.100.24' }, { 项目: '网关', 信息: '198.51.100.1' }, { 项目: 'DNS', 信息: '192.0.2.53' }]))), card('无线网络', stack(pair('Mono Home', '2.4 GHz · 信道 6 · 3 台设备', 'wifi'), pair('Mono Home 5G', '5 GHz · 信道 36 · 6 台设备', 'wifi')), link('管理', 'network/wireless'))));
 }
 function routesStatus() {
  return tabs(['IPv4', 'IPv6'].map((family, index) => ({ value: family.toLowerCase(), label: family + ' 路由', icon: 'network', content: stack(
   collection({ title: family + ' 邻居', readonly: true, rows: [{ id: 1, ip: index ? '2001:db8::120' : '192.168.1.120', mac: '02:00:00:00:02:01', device: 'br-lan', state: 'REACHABLE' }, { id: 2, ip: index ? '2001:db8::130' : '192.168.1.130', mac: '02:00:00:00:02:02', device: 'br-lan', state: 'STALE' }], columns: [{ key: 'ip', title: 'IP 地址' }, { key: 'mac', title: 'MAC 地址' }, { key: 'device', title: '接口' }, { key: 'state', title: '状态', render: v => tag(v, v === 'REACHABLE' ? 'success' : 'neutral') }] }),
   card('活跃的 ' + family + ' 路由', table(['目标', '网关', '设备', '跃点数', '路由表', '协议'], [{ 目标: index ? '::/0' : '0.0.0.0/0', 网关: index ? 'fe80::1' : '198.51.100.1', 设备: 'pppoe-wan', 跃点数: '0', 路由表: 'main', 协议: 'static' }, { 目标: index ? 'fd42::/64' : '192.168.1.0/24', 网关: '—', 设备: 'br-lan', 跃点数: '0', 路由表: 'main', 协议: 'kernel' }])),
   card('活跃的 ' + family + ' 规则', table(['优先级', '源地址', '目标', '操作', '路由表'], [{ 优先级: '0', 源地址: '所有', 目标: '所有', 操作: '查询路由表', 路由表: 'local' }, { 优先级: '32766', 源地址: '所有', 目标: '所有', 操作: '查询路由表', 路由表: 'main' }]))
  ) })));
 }
 function nftables() {
  const rules = ['input', 'forward', 'output', 'prerouting', 'input_lan', 'input_wan', 'dstnat', 'srcnat'];
  const list = d('div', { class: 'ap-stack' });
  function draw(query = '') { list.replaceChildren(...rules.filter(name => name.includes(query.toLowerCase())).map((name, index) => {
   const details = d('details', { class: 'ap-disclosure', open: index === 0 ? '' : null }, [d('summary', {}, [row(UI.icon('shield'), d('strong', {}, name), tag(name.includes('nat') ? 'NAT' : 'filter')), muted('3 条规则'), UI.icon('down')]), table(['规则匹配', '数据包', '流量', '规则操作'], [{ 规则匹配: 'ct state established, related', 数据包: '12.8K', 流量: '42.6 MiB', 规则操作: tag('accept', 'success') }, { 规则匹配: 'iifname "br-lan"', 数据包: '4.2K', 流量: '1.8 MiB', 规则操作: tag('jump input_lan', 'blue') }, { 规则匹配: '其余流量', 数据包: '124', 流量: '8.2 KiB', 规则操作: tag('reject', 'error') }])]); return details;
  })); }
  draw(); return stack(metrics([['规则表', 'fw4', 'IPv4 / IPv6'], ['规则链', '8', '活动规则链'], ['默认入站', 'Reject', '非匹配的 WAN 流量']]), card('规则链', [UI.search({ label: '搜索规则链', placeholder: '按链名称筛选…', onChange: draw }).element, list], link('编辑规则', 'network/firewall')));
 }
 function processes() {
  let entries = [['1', 'root', '/sbin/procd', 0.1, 0.5], ['814', 'root', '/usr/sbin/uhttpd', 0.8, 1.4], ['902', 'dnsmasq', '/usr/sbin/dnsmasq', 0.3, 2.2], ['1102', 'root', '/usr/sbin/hostapd', 0.5, 1.1], ['1255', 'root', '/usr/bin/mihomo', 3.2, 8.6]].map(([pid, user, command, cpu, memory]) => ({ pid, user, command, cpu, memory, state: '运行中' }));
  let query = ''; const t = UI.table({ columns: [{ key: 'pid', title: 'PID', sortable: true }, { key: 'user', title: '用户' }, { key: 'command', title: '命令', render: v => d('code', {}, v) }, { key: 'cpu', title: 'CPU %', sortable: true }, { key: 'memory', title: '内存 %', sortable: true }, { key: 'state', title: '状态', render: v => tag(v, v === '运行中' ? 'success' : 'warning') }, { key: 'actions', title: '', render: (_, item) => UI.dropdown({ label: '操作', items: ['挂起', '关闭', '强制关闭'].map(label => ({ label, danger: label.includes('关闭'), onClick: () => confirm(label + '进程 ' + item.pid + '？', '请确认要对该进程执行此操作。', () => { if (label === '挂起') item.state = '已挂起'; else entries = entries.filter(e => e !== item); draw(); }, label) })) }).element }], rows: entries });
  function draw() { t.setRows(entries.filter(e => (e.command + e.user + e.pid).toLowerCase().includes(query.toLowerCase()))); }
  return card('运行中的进程', [d('div', { class: 'ap-table-toolbar' }, UI.search({ label: '搜索进程', placeholder: '搜索进程名、用户或 PID…', onChange(value) { query = value; draw(); } }).element), t.element], tag('5 个进程', 'blue'));
 }
 function channelAnalysis() {
  const items = ['2.4 GHz', '5 GHz'].map((band, index) => {
   const labels = index ? ['36','40','44','48','149','153','157','161'] : ['1','2','3','4','5','6','7','8','9','10','11'];
   const series = index ? [
    {name:'Mono Home 5G',color:'#2a85ff',data:[-100,-42,-42,-100,null,null,null,null]},
    {name:'Guest Network',color:'#55b89a',data:[null,null,null,null,-100,-61,-61,-100]}
   ] : [
    {name:'Mono Home',color:'#2a85ff',data:[-100,-42,-42,-100,null,null,null,null,null,null,null]},
    {name:'Guest Network',color:'#55b89a',data:[null,null,null,-100,-58,-58,-100,null,null,null,null]},
    {name:'Nearby Network',color:'#ae88dd',data:[null,null,null,null,null,null,null,-100,-72,-72,-100]}
   ];
   const chart = UI.chart({type:'area',label:band+' 信道信号',labels,series,unit:'dBm',min:-100,max:-20});
   const networks = ['Mono Home','Guest Network','Nearby Network'].map((name,i) => ({ SSID:name, 信号:tag((-42-i*14)+' dBm',i===0?'success':'neutral'), 信道:index?36+i*4:1+i*5, 信道宽度:index?'80 MHz':'20 MHz', 模式:'802.11ax', BSSID:'02:00:00:00:03:0'+i }));
   const plot = card('信道分布',chart,button('重新扫描',()=>UI.toast({message:'扫描结果已刷新',tone:'success'}),'default','refresh'));
   const list = card('周边无线网络',table(['SSID','信号','信道','信道宽度','模式','BSSID'],networks));
   return { value:'radio'+index,label:'radio'+index+' · '+band,icon:'wifi',content:stack(plot,list) };
  });
  return tabs(items);
 }
 function realtime() {
  const labels = ['-60s', '-50s', '-40s', '-30s', '-20s', '-10s', '现在'];
  const plot = (title, series, unit) => card(title, UI.chart({ type: 'area', labels, series, unit }), tag('5 秒采样', 'neutral'));
  return tabs([
   { value: 'load', label: '负载', icon: 'chart', content: stack(metrics([['1 分钟', '0.04', '平均负载'], ['5 分钟', '0.06', '平均负载'], ['15 分钟', '0.03', '平均负载']]), plot('系统负载', [{ name: '1 分钟', color: '#2a85ff', data: [.04, .06, .05, .09, .03, .07, .04] }, { name: '5 分钟', color: '#00a67d', data: [.03, .04, .04, .06, .05, .05, .06] }], '')) },
   { value: 'bandwidth', label: '带宽', icon: 'network', content: stack(card('网络接口', UI.segment({ label: '接口', value: 'wan', items: ['lan', 'wan', 'wan6'] })), plot('网络流量', [{ name: '下载', color: '#2a85ff', data: [42, 65, 35, 87, 122, 66, 84] }, { name: '上传', color: '#00a67d', data: [8, 12, 9, 18, 22, 14, 19] }], 'Mbps')) },
   { value: 'wireless', label: '无线', icon: 'wifi', content: plot('无线连接速率', [{ name: '接收速率', color: '#2a85ff', data: [600, 720, 960, 860, 960, 1200, 1200] }, { name: '发送速率', color: '#00a67d', data: [540, 600, 720, 600, 960, 860, 960] }], 'Mbps') },
   { value: 'connections', label: '连接', icon: 'globe', content: stack(plot('活动连接', [{ name: 'TCP', color: '#2a85ff', data: [122, 150, 166, 153, 170, 189, 180] }, { name: 'UDP', color: '#00a67d', data: [42, 40, 55, 47, 54, 49, 52] }], ''), card('连接列表', table(['协议', '源地址', '目标地址', '已传输'], [{ 协议: 'TCP', 源地址: '192.168.1.120:51024', 目标地址: '198.51.100.10:443', 已传输: '2.4 MiB' }, { 协议: 'UDP', 源地址: '192.168.1.130:52988', 目标地址: '192.0.2.53:53', 已传输: '8.2 KiB' }])) ) }
  ]);
 }
 function administration() {
  const passwords = form([field('新密码', 'password'), field('确认密码', 'password')], { track: false });
  const passwordStatus = d('div', { 'aria-live': 'polite' });
  const updatePassword = button('更新密码', () => {
   const values = passwords.read(); passwordStatus.replaceChildren();
   if (values['新密码'].length < 8 || values['新密码'] !== values['确认密码']) { passwordStatus.append(UI.alert({ tone: 'error', message: values['新密码'].length < 8 ? '密码至少需要 8 个字符。' : '两次输入的密码不一致。' }).element); return; }
   passwords.controls.forEach(item => item.control.setValue(''));
   passwordStatus.append(UI.alert({ tone: 'success', message: '密码表单校验通过。' }).element);
  }, 'solid');
  const keys = collection({ title: '已授权的 SSH 密钥', entity: '密钥', rows: [{ id: 1, name: '管理员工作站', type: 'ssh-ed25519', fingerprint: 'SHA256:k8PQ2yHE4JzL7aWm9VnTx3Cs6BdR0fUG5hNe1AiKlOQ' }], columns: [{ key: 'name', title: '名称', render: (v, r) => pair(v, r.type, 'shield') }, { key: 'fingerprint', title: '指纹', render: v => d('code', {}, v) }], fields: [field('名称'), { ...field('公钥', 'textarea'), key: 'fingerprint' }].map((f, i) => ({ ...f, key: i ? 'fingerprint' : 'name', required: true })), addLabel: '添加密钥' });
  const repos = collection({ title: '软件包仓库公钥', entity: '仓库公钥', rows: [{ id: 1, name: 'OpenWrt release key', fingerprint: '1234abcd5678ef90' }], columns: [{ key: 'name', title: '名称' }, { key: 'fingerprint', title: '公钥指纹' }], fields: [{ ...field('名称'), key: 'name', required: true }, { ...field('公钥', 'textarea'), key: 'fingerprint', required: true }] });
  return tabs([
   { value: 'password', label: '路由器密码', icon: 'shield', content: card('路由器密码', stack(d('p', { class: 'ap-muted' }, '用于访问 Web 管理界面与 SSH 服务的管理员密码。'), passwords.element, passwordStatus, row(updatePassword))) },
   { value: 'dropbear', label: 'SSH 访问', icon: 'device', content: card('Dropbear 实例', form([field('启用实例', 'checkbox', true), field('绑定接口', 'select', 'lan', ['lan', 'wan', '所有接口']), field('端口', 'number', '22'), field('密码验证', 'checkbox', true), field('允许 root 用户凭密码登录', 'checkbox', true), field('网关端口', 'checkbox', false)]).element) },
   { value: 'sshkeys', label: 'SSH 密钥', icon: 'file', content: keys },
   { value: 'uhttpd', label: 'HTTP(S) 访问', icon: 'globe', content: card('访问设置', form([{ ...field('重定向到 HTTPS', 'checkbox', true), help: '将 HTTP 请求重定向到 HTTPS。' }]).element) },
   { value: 'repokeys', label: '仓库公钥', icon: 'folder', content: repos }
  ]);
 }
 function packages() {
  const names = ['luci-base', 'luci-mod-admin-full', 'luci-theme-mono', 'dnsmasq-full', 'dropbear', 'uhttpd', 'opkg', 'odhcpd-ipv6only', 'kmod-usb-storage', 'block-mount', 'curl', 'iperf3', 'tcpdump', 'htop', 'nano', 'kmod-fs-ext4', 'luci-app-ddns', 'luci-app-upnp', 'luci-app-wol', 'wget-ssl', 'ca-bundle', 'libustream-openssl', 'wireguard-tools', 'kmod-wireguard'];
  const rows = names.map((name, i) => ({ name, version: i < 8 ? '24.10.5-r1' : '1.2.0-r2', size: (24 + i * 17) + ' KiB', description: ['LuCI 管理界面组件', '网络与系统实用工具', '设备驱动与存储支持'][i % 3], installed: i < 8, upgrade: i === 3 }));
  let active = 'available', query = '', current = 1;
  const count = muted(''), list = UI.table({ columns: [ { key: 'name', title: '软件包', render: (v, r) => d('div', { class: 'ap-package-name' }, [d('strong', {}, v), muted(r.description)]) }, { key: 'version', title: '版本' }, { key: 'size', title: '大小' }, { key: 'action', title: '', render: (_, item) => button(active === 'updates' ? '更新' : item.installed ? '移除' : '安装', () => {
   const action = active === 'updates' ? '更新' : item.installed ? '移除' : '安装';
   confirm(action + ' ' + item.name + '？', item.version + ' · ' + item.size + '。请确认软件包操作。', () => { if (action === '更新') item.upgrade = false; else item.installed = !item.installed; draw(); UI.toast({ tone: 'success', message: '软件包已' + action }); }, action);
  }) }], rows: [] });
  const pager = UI.pagination({ totalPages: 3, onChange(value) { current = value; draw(); } });
  function draw() { const filtered = rows.filter(item => (active === 'available' || (active === 'installed' ? item.installed : item.upgrade)) && item.name.includes(query.toLowerCase())); const total = Math.max(1, Math.ceil(filtered.length / 8)); current = Math.min(current, total); pager.setTotal(total); pager.setPage(current); list.setRows(filtered.slice((current - 1) * 8, current * 8)); count.textContent = filtered.length + ' 个软件包'; }
  const search = UI.search({ label: '筛选软件包', placeholder: '输入软件包名称…', onChange(value) { query = value; current = 1; draw(); } });
  const nav = UI.tabs({ variant: 'underline', label: '软件包分类', value: active, items: [{ value: 'available', label: '可用', icon: 'folder' }, { value: 'installed', label: '已安装', icon: 'check' }, { value: 'updates', label: '更新', icon: 'refresh' }], onChange(value) { active = value; current = 1; draw(); } });
  const upload = button('上传软件包', () => fileDialog('上传软件包', '.ipk', '选择 .ipk 格式的软件包。'), 'default', 'upload');
  draw(); return stack(card('存储空间', [row(d('strong', {}, '24.0 MiB 可用'), muted('共 128 MiB')), UI.progress({ value: 81, label: '已使用空间' }).element], button('配置 opkg', () => editor('软件包源配置', [{ ...field('自定义软件源', 'textarea', 'src/gz example_packages https://downloads.example.com/packages'), rows: 8 }], () => UI.toast({ message: '软件源草稿已保存', tone: 'success' })))), card('软件包', [nav.element, d('div', { class: 'ap-table-toolbar' }, [search.element, count]), list.element, d('div', { class: 'ap-pagination-row' }, pager.element)], row(upload, button('更新列表', () => UI.toast({ message: '软件包列表已刷新', tone: 'success' }), 'solid', 'refresh'))));
 }
 function startup() {
  const services = ['boot', 'sysfixtime', 'log', 'network', 'firewall', 'dnsmasq', 'odhcpd', 'uhttpd', 'dropbear', 'sysntpd', 'cron', 'ddns', 'miniupnpd', 'openclash'].map((name, i) => ({ name, priority: 10 + i * 5, enabled: i !== 11, running: i !== 11 }));
  let query = ''; const list = UI.table({ rows: services, columns: [{ key: 'priority', title: '启动优先级', sortable: true }, { key: 'name', title: '服务', render: v => d('strong', {}, v) }, { key: 'enabled', title: '开机启动', render: (v, item) => UI.switcher({ label: item.name + ' 开机启动', checked: v, onChange(value) { item.enabled = value; dirty(); } }).element }, { key: 'running', title: '运行状态', render: v => tag(v ? '运行中' : '已停止', v ? 'success' : 'neutral') }, { key: 'actions', title: '', render: (_, item) => row(button(item.running ? '停止' : '启动', () => { item.running = !item.running; draw(); dirty(); }), UI.dropdown({ label: '更多', items: ['重启', '重新加载'].map(label => ({ label, onClick() { item.running = true; draw(); UI.toast({ message: item.name + ' 已' + label, tone: 'success' }); } })) }).element) }] });
  function draw() { list.setRows(services.filter(item => item.name.includes(query.toLowerCase()))); }
  register({ getValue: () => services, setValue(value) { services.splice(0, services.length, ...value); draw(); } });
  return tabs([{ value: 'services', label: '启动脚本', icon: 'settings', content: card('系统服务', [d('div', { class: 'ap-table-toolbar' }, UI.search({ label: '搜索服务', placeholder: '搜索服务名称…', onChange(value) { query = value; draw(); } }).element), list.element], tag('14 个服务', 'blue')) }, { value: 'local', label: '本地启动脚本', icon: 'file', content: codeEditor('本地启动脚本', '# Put your custom commands here.\n# Commands run after the system has booted.\n\nexit 0\n', '此脚本在系统启动末尾执行。') }]);
 }
 function crontab() {
  return stack(card('时间格式', d('div', { class: 'ap-cron-guide' }, ['分钟\n0–59', '小时\n0–23', '日期\n1–31', '月份\n1–12', '星期\n0–6', '命令\n要执行的操作'].map((text, i) => d('div', {}, [d('code', {}, i < 5 ? '*' : 'command'), muted(text)]))), tag('Cron', 'blue')), codeEditor('计划任务', '# 每天凌晨 03:00 执行维护任务\n0 3 * * * /usr/bin/example-maintenance\n\n# 每 5 分钟记录一次状态\n*/5 * * * * /usr/bin/example-status\n', '每行一个任务；以 # 开头的行作为注释。'));
 }
 function mounts() {
  const mounted = card('已挂载的文件系统', table([{ key: 'device', title: '文件系统', render: (v, r) => pair(v, r.type, 'folder') }, { key: 'path', title: '挂载点' }, { key: 'size', title: '可用空间' }, { key: 'usage', title: '已使用', render: v => UI.progress({ value: v }).element }, { key: 'action', title: '', render: (_, r) => button('详情', () => confirm('文件系统信息', r.device + ' · ' + r.path + ' · ' + r.type, () => {}, '关闭')) }], [{ device: '/dev/root', type: 'squashfs · 只读', path: '/rom', size: '0 / 12 MiB', usage: 100 }, { device: '/dev/ubi0_1', type: 'ubifs', path: '/overlay', size: '24 / 128 MiB', usage: 81 }, { device: 'tmpfs', type: '内存文件系统', path: '/tmp', size: '248 / 256 MiB', usage: 3 }]));
  const specs = [{ ...field('设备'), key: 'device', required: true }, { ...field('挂载点'), key: 'path', required: true }, { ...field('文件系统', 'select', 'ext4', ['ext4', 'f2fs', 'vfat', 'ntfs3', 'auto']), key: 'type' }, { ...field('挂载选项', 'text', 'defaults'), key: 'options' }, { ...field('启用', 'checkbox', true), key: 'enabled' }];
  return tabs([{ value: 'mounts', label: '挂载点', icon: 'folder', content: stack(mounted, collection({ title: '挂载配置', entity: '挂载点', rows: [{ id: 1, device: '/dev/sda1', path: '/mnt/storage', type: 'ext4', options: 'defaults', enabled: true }], fields: specs, columns: [{ key: 'device', title: '设备' }, { key: 'path', title: '挂载点' }, { key: 'type', title: '文件系统' }, { key: 'options', title: '挂载选项' }, { key: 'enabled', title: '状态', render: v => tag(v ? '已启用' : '已禁用', v ? 'success' : 'neutral') }] })) }, { value: 'swap', label: '交换分区', icon: 'device', content: collection({ title: '交换分区', entity: '交换分区', rows: [], columns: [{ key: 'device', title: '设备' }, { key: 'enabled', title: '已启用', render: v => tag(v ? '是' : '否') }], fields: [{ ...field('设备'), key: 'device', required: true }, { ...field('启用', 'checkbox', true), key: 'enabled' }] }) }, { value: 'global', label: '全局设置', icon: 'settings', content: card('自动挂载', form((schemas['system-mounts'] || []).filter(f => !f.skip)).element) }]);
 }
 function leds() {
  return collection({ title: 'LED 动作', entity: 'LED 动作', addLabel: '添加 LED 动作', rows: [{ id: 1, name: 'WAN', led: 'blue:wan', trigger: 'netdev', device: 'wan', mode: 'link rx tx', enabled: true }, { id: 2, name: '系统', led: 'blue:system', trigger: 'heartbeat', device: '', mode: '', enabled: true }], columns: [{ key: 'name', title: '名称', render: (v, r) => pair(v, r.led, 'bell') }, { key: 'trigger', title: '触发器', render: v => tag(v, 'blue') }, { key: 'device', title: '设备' }, { key: 'mode', title: '模式' }, { key: 'enabled', title: '默认状态', render: v => tag(v ? '开启' : '关闭', v ? 'success' : 'neutral') }], fields: [{ ...field('名称'), key: 'name', required: true }, { ...field('LED 名称', 'select', 'blue:wan', ['blue:wan', 'blue:system', 'white:status']), key: 'led' }, { ...field('触发器', 'select', 'netdev', ['netdev', 'none', 'timer', 'heartbeat', 'default-on']), key: 'trigger' }, { ...field('设备', 'select', 'wan', ['wan', 'br-lan', 'wlan0', 'wlan1']), key: 'device' }, { ...field('触发模式', 'text', 'link rx tx'), key: 'mode' }, { ...field('默认开启', 'checkbox', true), key: 'enabled' }] });
 }
 function fileDialog(title, accept, help, onComplete) {
  const upload = UI.upload({ label: '选择文件', accept, help }), status = d('div', { 'aria-live': 'polite' });
  const modal = UI.dialog({ title, width: 560, children: stack(upload, title === '刷写固件' ? form([field('保留当前配置', 'checkbox', true)], {track:false}).element : null, status), actions: [{ label: '取消', variant: 'plain' }, { label: '检查文件', variant: 'solid', close: false, onClick() { const file = upload.getFiles()[0]; status.replaceChildren(UI.alert({ message: file ? file.name + ' · ' + Math.ceil(file.size / 1024) + ' KiB，已选择。' : '请先选择一个文件。', tone: file ? 'success' : 'warning' }).element); if (file) onComplete?.(file); return false; } }], onClose() { modal.destroy(); } }); modal.open();
 }
 function flash() {
  const actionCard = (title, description, icon, action, label, danger) => { const el = card(title, stack(d('p', { class: 'ap-muted' }, description), row(button(label, action, danger ? 'danger' : 'default', icon)))); el.classList.add('ap-action-card'); return el; };
  return tabs([{ value: 'actions', label: '操作', icon: 'settings', content: grid(
   actionCard('备份配置', '下载当前配置的备份文件，便于迁移设备或恢复设置。', 'download', () => download('mono-config.json', JSON.stringify({ preview: true, hostname: 'OpenWrt', theme: 'Mono' }, null, 2)), '生成备份'),
   actionCard('恢复配置', '选择已有备份文件，恢复网络、系统与服务配置。', 'upload', () => fileDialog('恢复备份', '.gz,.tar,.json', '支持 .gz、.tar 和 .json 格式的备份文件。'), '上传备份'),
   actionCard('更新固件', '选择适用于当前设备的固件，并设置是否保留当前配置。', 'upload', () => fileDialog('刷写固件', '.bin,.img,.itb', '支持 .bin、.img 和 .itb 格式的固件。'), '选择固件'),
   actionCard('恢复出厂设置', '清除自定义设置，将设备配置恢复为出厂状态。', 'refresh', () => confirm('恢复出厂设置？', '此操作会清除自定义配置。请先备份需要保留的设置。', () => UI.toast({ message: '重置操作完成', tone: 'success' }), '重置', 'danger'), '执行重置', true),
   card('保存 MTD 分区', stack(form([field('选择 mtdblock', 'select', 'mtd0 · BL2', ['mtd0 · BL2', 'mtd1 · u-boot-env', 'mtd2 · Factory', 'mtd3 · FIP'])]).element, row(button('查看分区信息', () => confirm('分区信息', 'MTD 分区 · 只读', () => {}, '关闭')))))
  ) }, { value: 'config', label: '备份配置', icon: 'file', content: codeEditor('额外备份文件', '# 每行填写一个需要备份的文件或目录\n/etc/config/\n/etc/dropbear/\n/etc/crontabs/\n', '这里指定在系统备份中额外包含的文件。') }]);
 }
 function argon() {
  const fields = (schemas['system-argon-config'] || []).filter(f => !f.skip).map(f => ({ ...f, value: f.label.includes('主色调') ? '#2563eb' : f.label.includes('模糊') ? '10' : undefined }));
  return tabs([{ value: 'appearance', label: '主题配置', icon: 'settings', content: card('Argon 主题设置', form(fields).element, null, '设置主题颜色、背景和登录页外观。') }, { value: 'wallpaper', label: '背景文件', icon: 'file', content: card('上传背景', UI.upload({ label: '选择背景图片', accept: 'image/*', multiple: true, help: '支持 JPG、PNG 和 WebP 格式。' })) }]);
 }
 function reboot() {
  const status = d('div', { class: 'ap-reboot-state' }, tag('设备在线', 'success'));
  return card('重启设备', stack(d('div', { class: 'ap-reboot-icon' }, UI.icon('refresh')), d('p', { class: 'ap-muted' }, '重启后，设备会重新加载已保存的配置。网络连接会暂时中断。'), status, row(button('执行重启', () => confirm('重启 OpenWrt？', '设备重启期间，网络连接将暂时中断。', () => { status.replaceChildren(UI.progress({ value: 100, label: '操作完成' }).element, tag('重启操作完成', 'success')); }, '重启'), 'solid', 'refresh'))));
 }
 function terminal() {
  const output = d('pre', { class: 'ap-terminal-output', role: 'log', 'aria-live': 'polite' }, 'Mono Terminal\n\n未连接远程终端。可尝试 help、status 或 clear。\n'), input = UI.input({ label: '终端命令', placeholder: '输入 help 查看可用命令', prefix: '$' });
  function run() { const command = input.getValue().trim(); if (!command) return; input.setValue(''); if (command === 'clear') { output.textContent = ''; return; } const answers = { help: '可用命令：help · status · clear', status: 'Hostname  OpenWrt\nUptime    3d 12h 28m\nLoad      0.04  0.06  0.03\nNetwork   Online' }; output.textContent += '$ ' + command + '\n' + (answers[command] || '未连接终端，无法执行该命令。') + '\n\n'; output.scrollTop = output.scrollHeight; }
  input.control.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); run(); } });
  return card('终端', [d('div', { class: 'ap-terminal-bar' }, [row(d('i'), d('i'), d('i')), muted('root@OpenWrt — 终端')]), output, d('div', { class: 'ap-terminal-input' }, [input.element, button('运行', run, 'solid')])], tag('未连接', 'neutral'));
 }
 function wireless() {
  let radios = [{ id: 'radio0', band: '2.4 GHz', channel: '6', width: '20 MHz', networks: [{ name: 'Mono Home', enabled: true, mode: '接入点 AP', encryption: 'WPA2-PSK / WPA3-SAE', clients: 3 }] }, { id: 'radio1', band: '5 GHz', channel: '36', width: '80 MHz', networks: [{ name: 'Mono Home 5G', enabled: true, mode: '接入点 AP', encryption: 'WPA2-PSK / WPA3-SAE', clients: 6 }] }];
  const radioHost = d('div', { class: 'ap-stack' });
  function edit(radio, network) {
   const basic = form([field('ESSID', 'text', network?.name || 'Mono Guest'), field('模式', 'select', network?.mode || '接入点 AP', ['接入点 AP', '客户端', 'Mesh']), field('网络', 'select', 'lan', ['lan', 'guest', 'wan']), field('隐藏 ESSID', 'checkbox'), field('WMM 模式', 'checkbox', true)], { track: false });
   const device = form([field('信道', 'select', radio.channel, radio.band === '5 GHz' ? ['自动', '36', '40', '44', '48', '149', '153', '157', '161'] : ['自动', ...Array.from({ length: 11 }, (_, i) => String(i + 1))]), field('信道宽度', 'select', radio.width, ['20 MHz', '40 MHz', '80 MHz', '160 MHz']), field('国家代码', 'select', 'CN', ['CN', 'SG', 'US', 'JP', 'DE']), field('最大传输功率', 'select', '自动', ['自动', '10 dBm', '15 dBm', '20 dBm', '23 dBm'])], { track: false });
   const security = form([field('加密', 'select', network?.encryption || 'WPA2-PSK / WPA3-SAE', ['WPA2-PSK / WPA3-SAE', 'WPA2-PSK', 'WPA3-SAE', 'WPA2-EAP', '不加密']), field('密钥', 'password', ''), field('802.11w 管理帧保护', 'select', '可选', ['禁用', '可选', '必需']), field('启用密钥重装攻击（KRACK）防护', 'checkbox', true)], { track: false });
   const mac = form([field('MAC 地址过滤', 'select', '禁用', ['禁用', '仅允许列表中的设备', '阻止列表中的设备']), field('MAC 列表', 'list', [])], { track: false });
   const advanced = form([field('客户端隔离', 'checkbox'), field('组播转单播', 'checkbox', true), field('距离优化', 'number', '0'), field('信标间隔', 'number', '100'), field('DTIM 间隔', 'number', '2'), field('组密钥更新间隔', 'number', '3600'), field('短前导码', 'checkbox', true), field('在低 Ack 应答时断开连接', 'checkbox', true)], { track: false });
   const roaming = form([field('802.11r 快速切换', 'checkbox'), field('移动域', 'text', '4f57'), field('802.11k RRM', 'checkbox', true), field('802.11v BSS 过渡', 'checkbox', true)], { track: false });
   const content = tabs([{ value: 'basic', label: '常规设置', content: stack(d('h4', {}, '设备配置'), device.element, d('h4', {}, '接口配置'), basic.element) }, { value: 'security', label: '无线安全', content: security }, { value: 'mac', label: 'MAC 过滤', content: mac }, { value: 'advanced', label: '高级设置', content: advanced }, { value: 'roaming', label: 'WLAN 漫游', content: roaming }], false);
   const modal = UI.dialog({ title: network ? '编辑无线网络' : '添加无线网络', description: radio.id + ' · ' + radio.band, width: 760, children: content, actions: [{ label: '取消', variant: 'plain' }, { label: '保存', variant: 'solid', onClick() { const b = basic.read(), s = security.read(), dv = device.read(); const result = { name: b.ESSID, mode: b['模式'], encryption: s['加密'], enabled: network?.enabled ?? true, clients: network?.clients ?? 0 }; if (network) Object.assign(network, result); else radio.networks.push(result); radio.channel = dv['信道']; radio.width = dv['信道宽度']; draw(); dirty(); } }], onClose() { modal.destroy(); } }); modal.open();
  }
  function scan(radio) {
   const modal = UI.dialog({ title: '扫描无线网络', description: radio.id + ' · ' + radio.band, width: 680, children: table([{ key: 'name', title: 'SSID' }, { key: 'signal', title: '信号' }, { key: 'channel', title: '信道' }, { key: 'action', title: '', render: (_, item) => button('加入', () => { modal.close(); edit(radio, null); UI.toast({ message: '已打开无线连接配置', tone: 'info' }); }) }], [{ name: 'Mono Guest', signal: '-48 dBm', channel: '36' }, { name: 'Nearby Network', signal: '-72 dBm', channel: '44' }]), actions: [{ label: '关闭', variant: 'plain' }], onClose() { modal.destroy(); } }); modal.open();
  }
  function draw() { radioHost.replaceChildren(...radios.map(radio => {
   const header = row(button('扫描', () => scan(radio), 'default', 'search'), button('添加', () => edit(radio), 'default', 'plus'), UI.dropdown({label:'更多',items:[{label:'重启无线设备',icon:'refresh',onClick:()=>confirm('重启 '+radio.id+'？','无线设备重启期间，已连接的设备将暂时断开。',()=>UI.toast({message:radio.id+' 已重启',tone:'success'}),'重启')}]}).element);
   const el = card(radio.id + ' · ' + radio.band, [d('div', { class: 'ap-radio-summary' }, [pair('MediaTek MT7986', '802.11ax · 信道 ' + radio.channel + ' · ' + radio.width, 'wifi'), tag('设备运行中', 'success')]), ...radio.networks.map(network => d('div', { class: 'ap-wireless-network' }, [pair(network.name, network.mode + ' · ' + network.encryption, 'wifi'), d('div', { class: 'ap-wireless-meta' }, [tag(network.enabled ? '已启用' : '已禁用', network.enabled ? 'success' : 'neutral'), muted(network.clients + ' 台设备')]), row(button(network.enabled ? '禁用' : '启用', () => { network.enabled = !network.enabled; draw(); dirty(); }), button('编辑', () => edit(radio, network), 'default', 'edit'), UI.dropdown({label:'更多',items:[{label:'删除网络',icon:'trash',danger:true,onClick:()=>confirm('删除 '+network.name+'？','删除此无线网络后，已连接的设备将断开。',()=>{radio.networks=radio.networks.filter(item=>item!==network);draw();dirty();},'删除','danger')}]}).element)]))], header);
   el.classList.add('ap-radio-card'); return el;
  })); }
  register({ getValue: () => radios, setValue(value) { radios = value; draw(); } }); draw();
  return stack(radioHost, card('已连接站点', table([{ key: 'name', title: '主机', render: (v, r) => pair(v, r.mac, 'device') }, { key: 'network', title: '网络' }, { key: 'signal', title: '信号 / 噪声' }, { key: 'rate', title: '接收 / 发送速率' }], [{ name: 'Workstation', mac: '02:00:00:00:02:01', network: 'Mono Home 5G', signal: '-42 / -95 dBm', rate: '1200 / 960 Mbps' }, { name: 'Phone', mac: '02:00:00:00:02:02', network: 'Mono Home 5G', signal: '-56 / -95 dBm', rate: '720 / 600 Mbps' }, { name: 'Sensor', mac: '02:00:00:00:02:03', network: 'Mono Home', signal: '-63 / -92 dBm', rate: '72 / 65 Mbps' }])));
 }
 function staticRoutes() {
  return tabs(['静态 IPv4 路由', '静态 IPv6 路由', 'IPv4 规则', 'IPv6 规则'].map((title, i) => {
   const ipv6 = i % 2 === 1, rules = i > 1;
   const columns = rules ? [{ key: 'priority', title: '优先级' }, { key: 'interface', title: '传入接口' }, { key: 'source', title: '源地址' }, { key: 'target', title: '目标' }, { key: 'table', title: '路由表' }] : [{ key: 'interface', title: '接口' }, { key: 'target', title: '目标' }, { key: 'gateway', title: '网关' }, { key: 'metric', title: '跃点数' }, { key: 'table', title: '路由表' }];
   const specs = rules ? [{ ...field('优先级', 'number', '10000'), key: 'priority' }, { ...field('传入接口', 'select', 'lan', ['lan', 'wan', '任意']), key: 'interface' }, { ...field('源地址', 'text', ipv6 ? 'fd42::/64' : '192.168.1.0/24'), key: 'source' }, { ...field('目标', 'text', ipv6 ? '::/0' : '0.0.0.0/0'), key: 'target' }] : [{ ...field('接口', 'select', 'lan', ['lan', 'wan', 'wan6']), key: 'interface' }, { ...field('目标', 'text', ipv6 ? '2001:db8:10::/64' : '192.168.10.0/24'), key: 'target', required: true }, { ...field('网关', 'text', ipv6 ? 'fe80::1' : '192.168.1.2'), key: 'gateway' }, { ...field('跃点数', 'number', '0'), key: 'metric' }];
   specs.push({ ...field('路由表', 'select', 'main', ['main', 'default', 'local', '100']), key: 'table' }, { ...field('启用', 'checkbox', true), key: 'enabled' });
   return { value: 'route-' + i, label: title, content: collection({ title, entity: rules ? '规则' : '路由', rows: i === 0 ? [{ id: 1, interface: 'lan', target: '192.168.10.0/24', gateway: '192.168.1.2', metric: '0', table: 'main', enabled: true }] : [], columns: [...columns, { key: 'enabled', title: '状态', render: v => tag(v ? '已启用' : '已禁用', v ? 'success' : 'neutral') }], fields: specs }) };
  }));
 }
 function dhcp() {
  const leases = [{ id: 1, name: 'Workstation', mac: '02:00:00:00:02:01', ip: '192.168.1.120', time: '12h', duid: '—', token: '::120' }, { id: 2, name: 'NAS', mac: '02:00:00:00:02:02', ip: '192.168.1.130', time: '无限', duid: '—', token: '::130' }];
  const columns = [{ key: 'name', title: '主机名', render: (v, r) => pair(v, r.mac, 'device') }, { key: 'ip', title: 'IPv4 地址' }, { key: 'time', title: '租约时间' }, { key: 'token', title: 'IPv6 令牌' }];
  const leaseForm = [{ ...field('主机名'), key: 'name', required: true }, { ...field('MAC 地址'), key: 'mac', required: true }, { ...field('IPv4 地址'), key: 'ip', required: true }, { ...field('租约时间', 'select', '12h', ['12h', '24h', '48h', '无限']), key: 'time' }, { ...field('DUID / IAID'), key: 'duid' }, { ...field('IPv6 令牌'), key: 'token' }, field('设置标签', 'list', []), field('匹配标签', 'list', [])];
  const dnsFields = (schemas['network-dhcp'] || []).slice(0, 18), odFields = (schemas['network-dhcp'] || []).slice(18);
  const groups = [...new Set(dnsFields.map(f => f.panel))];
  const relay = collection({ title: 'DHCP 中继', entity: '中继', rows: [], columns: [{ key: 'source', title: '中继来源' }, { key: 'destination', title: '中继目标地址' }, { key: 'interface', title: '接口' }], fields: [{ ...field('中继来源'), key: 'source', required: true }, { ...field('中继目标地址'), key: 'destination', required: true }, { ...field('接口', 'select', 'lan', ['lan', 'wan']), key: 'interface' }] });
  const tagTable = collection({ title: 'DHCP 标签', entity: '标签', rows: [{ id: 1, name: 'iot', option: '6,192.168.1.1', force: false }], columns: [{ key: 'name', title: '名称' }, { key: 'option', title: '应用 DHCP 选项' }, { key: 'force', title: '强制', render: v => tag(v ? '是' : '否') }], fields: [{ ...field('名称'), key: 'name', required: true }, { ...field('DHCP 选项'), key: 'option' }, { ...field('强制', 'checkbox'), key: 'force' }] });
  return tabs([{ value: 'leases', label: '租约', icon: 'device', content: stack(collection({ title: '静态租约', entity: '静态租约', rows: leases, columns, fields: leaseForm }), card('已分配的 DHCPv4 租约', table(['主机名', 'IPv4 地址', 'MAC 地址', '剩余时间'], [{ 主机名: 'Phone', 'IPv4 地址': '192.168.1.151', 'MAC 地址': '02:00:00:00:02:03', 剩余时间: '10 小时 24 分' }, { 主机名: 'Laptop', 'IPv4 地址': '192.168.1.152', 'MAC 地址': '02:00:00:00:02:04', 剩余时间: '8 小时 12 分' }])), card('已分配的 DHCPv6 租约', table(['主机名', 'IPv6 地址', 'DUID', '剩余时间'], [{ 主机名: 'Workstation', 'IPv6 地址': '2001:db8::120', DUID: '000400000000000000000000000000000001', 剩余时间: '12 小时' }]))) }, { value: 'dnsmasq', label: 'dnsmasq', icon: 'settings', content: tabs([...groups.map((label, index) => ({ value: 'dns-' + index, label, content: card(label, form(dnsFields.filter(f => f.panel === label)).element) })), { value: 'relay', label: '中继', content: relay }, { value: 'tags', label: '标签', content: tagTable }], false) }, { value: 'odhcpd', label: 'odhcpd', icon: 'network', content: card('odhcpd 设置', form(odFields).element) }]);
 }
 function dns() {
  const fields = schemas['network-dns'] || [], groups = [...new Set(fields.map(f => f.panel))];
  const recordTypes = [
   ['主机名映射', ['主机名', 'IP 地址'], [['nas.lan', '192.168.1.130']]], ['SRV', ['SRV', '目标', '端口', '优先级', '权重'], [['_service._tcp.example.com', 'server.example.com', '443', '10', '5']]],
   ['MX', ['域名', '中继', '优先级'], [['example.com', 'mail.example.com', '10']]], ['CNAME', ['域名', '目标'], [['storage.lan', 'nas.lan']]], ['DNS 资源记录', ['资源记录名称', '资源记录编号', '十六进制数据'], []]
  ];
  const records = tabs(recordTypes.map(([title, cols, rows], i) => ({ value: String(i), label: title, content: collection({ title, entity: '记录', rows: rows.map((row, j) => ({ id: j, ...Object.fromEntries(cols.map((c, k) => [c, row[k]])) })), columns: cols.map(c => ({ key: c, title: c })), fields: cols.map((label, index) => ({ ...field(label), required: index === 0 })) }) })), false);
  const items = groups.map((label, i) => ({ value: 'dns-' + i, label, content: card(label, form(fields.filter(f => f.panel === label)).element) }));
  items.splice(3, 0, { value: 'records', label: 'DNS 记录', content: records }, { value: 'dnssec', label: 'DNSSEC', content: card('DNSSEC', UI.alert({ title: '暂无可配置项', message: '参照当前后台，此分组没有显示额外设置。', tone: 'info' })) });
  items.push({ value: 'ipsets', label: 'IP 集', content: collection({ title: 'DNS IP 集', entity: 'IP 集', rows: [], columns: ['集合名', 'FQDN', 'Netfilter 表名', '表 IP 族'].map(title => ({ key: title, title })), fields: [field('集合名'), field('FQDN'), field('Netfilter 表名', 'text', 'fw4'), field('表 IP 族', 'select', 'inet', ['inet', 'ip', 'ip6'])] }) });
  return tabs(items);
 }
 function diagnostics() {
  const output = d('pre', { class: 'ap-diagnostic-output', role: 'log', 'aria-live': 'polite' }, '选择诊断工具并输入目标地址。'), target = UI.input({ label: '目标地址', value: 'openwrt.org', placeholder: '域名或 IP 地址' });
  let mode = 'Ping'; const protocol = UI.segment({ label: 'IP 协议', size: 'sm', items: ['IPv4', 'IPv6'], value: 'IPv4' });
  const run = button('开始诊断', () => { const host = target.getValue().trim(); if (!host) { target.setInvalid(true); target.control.focus(); return; } target.setInvalid(false); const data = mode === 'Ping' ? `PING ${host} (192.0.2.10) 56 data bytes\n64 bytes from 192.0.2.10: seq=0 ttl=54 time=12.4 ms\n64 bytes from 192.0.2.10: seq=1 ttl=54 time=11.8 ms\n64 bytes from 192.0.2.10: seq=2 ttl=54 time=12.1 ms\n\n--- ${host} ping statistics ---\n3 packets transmitted, 3 received, 0% packet loss` : mode === 'Traceroute' ? `traceroute to ${host} (192.0.2.10), 30 hops max\n 1  192.168.1.1      0.6 ms\n 2  198.51.100.1     3.2 ms\n 3  203.0.113.10     8.7 ms\n 4  192.0.2.10      12.2 ms` : `Server:  192.0.2.53\nAddress: 192.0.2.53:53\n\nName:    ${host}\nAddress: 192.0.2.10\nAddress: 2001:db8::10`; output.textContent = data; }, 'solid', 'network');
  const tool = UI.tabs({ label: '诊断工具', variant: 'underline', value: mode, items: ['Ping', 'Traceroute', 'Nslookup'].map(value => ({ value, label: value, icon: 'globe' })), onChange(value) { mode = value; output.textContent = '已选择 ' + value + '。输入目标地址后开始诊断。'; } });
  return stack(card('网络诊断', [tool.element, d('div', { class: 'ap-diagnostic-toolbar' }, [target.element, protocol.element, run])]), card('诊断结果', output, button('清空', () => { output.textContent = '输出已清空。'; }, 'default')));
 }
 function firewall() {
  const policies = ['接受', '拒绝', '丢弃'];
  const globals = card('常规设置', form([field('启用 SYN-flood 防御', 'checkbox', true), field('丢弃无效数据包', 'checkbox', true), field('启用 FullCone NAT', 'checkbox', false), field('启用 FullCone NAT6', 'checkbox', false), field('TCP 拥塞控制算法', 'select', 'bbr', ['bbr', 'cubic', 'reno']), field('流量卸载类型', 'select', '软件流量卸载', ['禁用', '软件流量卸载', '硬件流量卸载']), field('输入', 'select', '拒绝', policies), field('出站数据', 'select', '接受', policies), field('转发', 'select', '拒绝', policies)]).element);
  const zones = collection({ title: '防火墙区域', entity: '区域', rows: [{ id: 1, name: 'lan', destination: 'wan', input: '接受', output: '接受', forward: '接受', masquerade: false }, { id: 2, name: 'wan', destination: '—', input: '拒绝', output: '接受', forward: '拒绝', masquerade: true }], columns: [{ key: 'name', title: '源区域 → 转发目标', render: (v, r) => row(tag(v, v === 'lan' ? 'success' : 'error'), muted('→'), tag(r.destination, 'neutral')) }, ...[['input', '输入'], ['output', '出站数据'], ['forward', '区域内转发']].map(([key, title]) => ({ key, title, render: v => tag(v, v === '接受' ? 'success' : 'neutral') })), { key: 'masquerade', title: 'IP 动态伪装', render: v => tag(v ? '启用' : '关闭', v ? 'blue' : 'neutral') }], fields: [{ ...field('名称'), key: 'name', required: true }, { ...field('转发目标', 'select', 'wan', ['wan', 'lan', 'guest', '—']), key: 'destination' }, ...[['input', '输入'], ['output', '出站数据'], ['forward', '区域内转发']].map(([key, label]) => ({ ...field(label, 'select', '接受', policies), key })), { ...field('IP 动态伪装', 'checkbox'), key: 'masquerade' }, field('MSS 钳制', 'checkbox', true), field('涵盖网络', 'list', ['lan'])] });
  const ruleTable = (title, nat = false) => collection({ title, entity: title.includes('转发') ? '端口转发' : '规则', rows: [{ id: 1, name: nat ? 'LAN masquerade' : title === '端口转发' ? 'HTTPS 服务' : '允许 DHCP 更新', source: nat ? 'lan' : 'wan', destination: title === '端口转发' ? 'lan' : '设备', protocol: title === '通信规则' ? 'UDP' : 'TCP', port: title === '通信规则' ? '68' : '443', address: '192.168.1.130', target: nat ? 'MASQUERADE' : title === '端口转发' ? 'DNAT' : 'ACCEPT', enabled: true }], columns: [{ key: 'name', title: '名称', render: v => d('strong', {}, v) }, { key: 'source', title: '匹配规则', render: (_, r) => d('div', { class: 'ap-rule-match' }, [row(tag(r.source, 'blue'), muted('→'), tag(r.destination)), muted(r.protocol + ' · 端口 ' + r.port)]) }, { key: 'target', title: '操作', render: (v, r) => d('div', {}, [tag(v, 'success'), d('small', { class: 'ap-block-muted' }, v === 'DNAT' ? r.address + ':' + r.port : '')]) }, { key: 'enabled', title: '状态', render: v => tag(v ? '已启用' : '已禁用', v ? 'success' : 'neutral') }], fields: [{ ...field('名称'), key: 'name', required: true }, { ...field('协议', 'select', 'TCP', ['TCP', 'UDP', 'TCP + UDP', 'ICMP', '任意']), key: 'protocol' }, { ...field('源区域', 'select', 'wan', ['wan', 'lan', 'guest', '任意']), key: 'source' }, { ...field('目标区域', 'select', 'lan', ['lan', 'wan', '设备']), key: 'destination' }, { ...field('外部端口', 'text', '443'), key: 'port' }, { ...field('内部 IP 地址', 'text', '192.168.1.130'), key: 'address' }, { ...field('操作', 'select', nat ? 'MASQUERADE' : 'ACCEPT', ['ACCEPT', 'REJECT', 'DROP', 'DNAT', 'SNAT', 'MASQUERADE']), key: 'target' }, { ...field('启用', 'checkbox', true), key: 'enabled' }] });
  return tabs([{ value: 'zones', label: '常规设置', icon: 'shield', content: stack(globals, zones) }, { value: 'forwards', label: '端口转发', content: ruleTable('端口转发') }, { value: 'rules', label: '通信规则', content: ruleTable('通信规则') }, { value: 'snats', label: 'NAT 规则', content: ruleTable('NAT 规则', true) }, { value: 'ipsets', label: 'IP 集', content: collection({ title: 'IP 集', entity: 'IP 集', rows: [{ id: 1, name: 'trusted_hosts', family: 'IPv4', match: 'src_ip', addresses: '192.168.1.0/24', enabled: true }], columns: [{ key: 'name', title: '名称' }, { key: 'family', title: '地址族' }, { key: 'match', title: '字段匹配' }, { key: 'addresses', title: 'IP / 网络地址' }], fields: [{ ...field('名称'), key: 'name', required: true }, { ...field('地址族', 'select', 'IPv4', ['IPv4', 'IPv6']), key: 'family' }, { ...field('字段匹配', 'select', 'src_ip', ['src_ip', 'dest_ip', 'src_mac', 'src_port', 'dest_port']), key: 'match' }, { ...field('IP / 网络地址'), key: 'addresses' }, field('从文件加载')] }) }, { value: 'custom', label: '自定义规则', content: codeEditor('自定义防火墙规则', '# 自定义防火墙规则\n# 每行一条命令。\n', '规则以脚本形式加载，保持与实际防火墙版本相容。') }]);
 }
 function turboacc() { return stack(metrics([['快速转发', '已启用', 'Flow offloading'], ['硬件卸载', '运行中', 'MTK HNAT'], ['拥塞控制', 'BBR', 'TCP 连接']]), card('加速设置', form(schemas['network-turboacc'] || []).element)); }
 function openclash() {
  let running = true; const badge = d('span'), toggle = button('停止服务', () => { running = !running; status(); }, 'default');
  function status() { badge.replaceChildren(tag(running ? '运行中' : '已停止', running ? 'success' : 'neutral')); toggle.textContent = running ? '停止服务' : '启动服务'; }
  status();
  const runtime = card('OpenClash', stack(row(pair('Mihomo', 'Meta 内核', 'globe'), badge), metrics([['活动连接', '232', 'TCP 180 · UDP 52'], ['内存使用', '42.6 MiB', '核心运行内存'], ['运行时间', '3 天 12 小时', '最近启动以来']]), row(UI.segment({ label: '代理模式', value: 'Rule', items: [{ value: 'Rule', label: '规则' }, { value: 'Global', label: '全局' }, { value: 'Direct', label: '直连' }], onChange: value => UI.toast({ message: '代理模式：' + value, tone: 'success' }) }))), toggle);
  const traffic = card('代理流量', UI.chart({ type: 'area', labels: ['10:00', '10:02', '10:04', '10:06', '10:08', '10:10', '10:12'], series: [{ name: '下载', color: '#2a85ff', data: [34, 50, 26, 65, 90, 42, 67] }, { name: '上传', color: '#00a67d', data: [4, 12, 9, 19, 14, 12, 18] }], unit: 'Mbps' }));
  const config = collection({ title: '配置文件', entity: '配置', addLabel: '新建配置', rows: [{ id: 1, name: 'home.yaml', state: '使用中', updated: '2026-10-12 10:00', size: '42.8 KiB', content: 'mixed-port: 7893\nallow-lan: true\nmode: rule\nlog-level: info\n' }, { id: 2, name: 'travel.yaml', state: '未启用', updated: '2026-10-10 18:20', size: '28.1 KiB', content: 'mixed-port: 7893\nmode: rule\n' }], columns: [{ key: 'name', title: '配置文件名', render: v => pair(v, 'YAML 配置', 'file') }, { key: 'state', title: '状态', render: v => tag(v, v === '使用中' ? 'success' : 'neutral') }, { key: 'updated', title: '更新时间' }, { key: 'size', title: '大小' }], fields: [{ ...field('配置文件名'), key: 'name', required: true }, { ...field('配置内容', 'textarea'), key: 'content', rows: 12 }], rowActions: (item, draw) => [{ label: '设为当前配置', icon: 'check', onClick() { config.rows().forEach(row => { row.state = row === item ? '使用中' : '未启用'; }); draw(); dirty(); } }, { label: '下载', icon: 'download', onClick() { download(item.name, item.content); } }] });
  const subscriptions = collection({ title: '配置订阅', entity: '订阅', rows: [{ id: 1, name: 'home', address: 'https://example.com/subscription', template: '不转换', enabled: true }], columns: [{ key: 'name', title: '配置文件名' }, { key: 'address', title: '订阅地址', render: v => d('span', { class: 'ap-ellipsis' }, v) }, { key: 'template', title: '转换模板' }, { key: 'enabled', title: '状态', render: v => tag(v ? '已启用' : '已禁用', v ? 'success' : 'neutral') }], fields: [{ ...field('配置文件名'), key: 'name', required: true }, { ...field('订阅地址', 'textarea'), key: 'address', required: true }, { ...field('订阅转换模板', 'select', '不转换', ['不转换', '通用规则', '自定义模板']), key: 'template' }, { ...field('启用', 'checkbox', true), key: 'enabled' }], rowActions: (item) => [{ label: '更新', icon: 'refresh', onClick() { UI.toast({ message: item.name + ' 的订阅已刷新', tone: 'success' }); } }] });
  const overwrite = schemaTabs('services-openclash-config-overwrite', [{ value: 'dns-servers', label: '上游 DNS', content: collection({ title: '上游 DNS 服务器', entity: 'DNS 服务器', rows: [{ id: 1, group: 'nameserver', address: 'https://dns.example.com/dns-query', type: 'HTTPS', port: '443', enabled: true }], columns: [{ key: 'group', title: '分组' }, { key: 'address', title: '服务器地址' }, { key: 'type', title: '类型' }, { key: 'port', title: '端口' }], fields: [{ ...field('分组', 'select', 'nameserver', ['nameserver', 'fallback', 'default-nameserver']), key: 'group' }, { ...field('服务器地址'), key: 'address', required: true }, { ...field('服务器类型', 'select', 'HTTPS', ['UDP', 'TCP', 'TLS', 'HTTPS']), key: 'type' }, { ...field('端口', 'number', '443'), key: 'port' }, { ...field('启用', 'checkbox', true), key: 'enabled' }] }) }], false);
  return tabs([{ value: 'client', label: '运行状态', icon: 'chart', content: stack(runtime, traffic, card('连接状态', grid(pair('DNS 服务', '127.0.0.1:7874 · 正常', 'globe'), pair('流量模式', 'Fake-IP · 已启用', 'network')))) }, { value: 'settings', label: '插件设置', icon: 'settings', content: schemaTabs('services-openclash-settings', [], false) }, { value: 'config-overwrite', label: '覆写设置', content: overwrite }, { value: 'config-subscribe', label: '配置订阅', content: stack(card('订阅更新', form([field('自动更新', 'checkbox', true), field('更新时间', 'select', '每天 04:00', ['每天 04:00', '每天 12:00', '每周日 04:00'])]).element), subscriptions) }, { value: 'config', label: '配置管理', icon: 'file', content: stack(config, card('导入配置', UI.upload({ label: '选择 YAML 配置文件', accept: '.yaml,.yml', help: '支持 .yaml 和 .yml 格式。' }))) }, { value: 'log', label: '运行日志', content: tabs([{ value: 'plugin', label: '插件日志', content: logPanel('插件日志') }, { value: 'core', label: '内核日志', content: logPanel('内核日志') }, { value: 'debug', label: '调试日志', content: codeEditor('调试日志', '[info] Core: Mihomo Meta\n[info] Mode: Fake-IP\n[info] DNS: ready\n[info] Configuration loaded\n', '只读日志', true) }], false) }]);
 }
 function ddns() {
  const services = collection({ title: 'DDNS 服务', entity: 'DDNS 服务', addLabel: '添加新服务', rows: [{ id: 1, name: 'home_ipv4', domain: 'home.example.com', ip: '198.51.100.24', provider: '自定义', enabled: true, updated: '10 分钟前', next: '20 分钟后', username: '', password: '', source: '网络接口' }], columns: [{ key: 'name', title: '名称', render: (v, r) => pair(v, r.domain, 'globe') }, { key: 'ip', title: '已注册的 IP 地址' }, { key: 'enabled', title: '状态', render: v => tag(v ? '正常' : '已停止', v ? 'success' : 'neutral') }, { key: 'updated', title: '上次更新 / 下次验证', render: (v, r) => d('div', {}, [d('strong', {}, v), d('small', { class: 'ap-block-muted' }, r.next)]) }], fields: [{ ...field('服务名称'), key: 'name', required: true }, { ...field('查询主机名'), key: 'domain', required: true }, { ...field('DDNS 服务提供商', 'select', '自定义', ['自定义', 'Cloudflare', 'No-IP', 'DynDNS']), key: 'provider' }, { ...field('启用', 'checkbox', true), key: 'enabled' }, { ...field('用户名'), key: 'username' }, { ...field('密码', 'password'), key: 'password' }, { ...field('IP 地址来源', 'select', '网络接口', ['网络接口', 'Web URL', '脚本']), key: 'source' }, field('网络', 'select', 'wan', ['wan', 'wan6']), field('检查间隔', 'number', '10'), field('强制更新间隔', 'number', '72'), field('使用 HTTPS', 'checkbox', true), field('使用 IPv6', 'checkbox', false)], rowActions: (item, draw) => [{ label: item.enabled ? '停止' : '启动', onClick() { item.enabled = !item.enabled; draw(); dirty(); } }, { label: '重新加载', icon: 'refresh', onClick() { item.updated = '刚刚'; draw(); } }] });
  return tabs([{ value: 'overview', label: '信息', icon: 'globe', content: stack(metrics([['服务状态', '运行中', '动态 DNS 服务'], ['服务数量', '1', '1 个已启用'], ['地址类型', 'IPv4', '公网地址']]), services) }, { value: 'global', label: '全局设置', icon: 'settings', content: card('全局设置', form((schemas['services-ddns'] || []).filter(f => !f.skip && f.panel === '全局设置')).element) }]);
 }
 function wol() {
  const output = d('pre', { class: 'ap-diagnostic-output', role: 'log', 'aria-live': 'polite' }, '等待发送唤醒请求。');
  const targets = collection({ title: '网络唤醒目标', entity: '唤醒目标', rows: [{ id: 1, name: 'Workstation', mac: '02:00:00:00:02:01', interface: 'br-lan', broadcast: true, password: '' }, { id: 2, name: 'NAS', mac: '02:00:00:00:02:02', interface: 'br-lan', broadcast: true, password: '' }], columns: [{ key: 'name', title: '名称', render: v => pair(v, 'Wake on LAN', 'device') }, { key: 'mac', title: 'MAC 地址' }, { key: 'interface', title: '接口' }, { key: 'broadcast', title: '广播', render: v => tag(v ? '启用' : '关闭') }, { key: 'wake', title: '', render: (_, item) => button('唤醒', () => { output.textContent = 'Sending magic packet to ' + item.mac + ' on ' + item.interface + '\nRequest completed.'; UI.toast({ message: item.name + ' 唤醒请求已发送', tone: 'success' }); }, 'default', 'network') }], fields: [{ ...field('名称'), key: 'name', required: true }, { ...field('MAC 地址'), key: 'mac', required: true }, { ...field('接口', 'select', 'br-lan', ['br-lan', 'eth0', 'wan']), key: 'interface' }, { ...field('广播', 'checkbox', true), key: 'broadcast' }, { ...field('SecureOn 密码', 'password'), key: 'password' }] });
  return stack(card('默认设置', form([field('接口', 'select', 'br-lan', ['br-lan', 'eth0', 'wan']), field('使用广播', 'checkbox', true)]).element), targets, card('出站数据', output, button('清空', () => { output.textContent = '输出已清空。'; })));
 }
 function upnp() {
  const mappings = collection({ title: '当前生效的端口映射', entity: '映射', readonly: true, rows: [{ id: 1, name: 'Game Console', address: '192.168.1.160', internal: '3074', external: '3074', protocol: 'UDP', expiry: '1 小时 58 分' }], columns: [{ key: 'name', title: '客户端', render: (v, r) => pair(v, r.address, 'device') }, { key: 'internal', title: '客户端端口' }, { key: 'external', title: '外部端口' }, { key: 'protocol', title: '协议', render: v => tag(v, 'blue') }, { key: 'expiry', title: '剩余有效期' }], extra: tag('1 条映射', 'blue') });
  const acl = collection({ title: '服务访问控制列表', entity: '访问规则', rows: [{ id: 1, name: '允许高端口', address: '192.168.1.0/24', internal: '1024-65535', external: '1024-65535', action: '允许' }], columns: [{ key: 'name', title: '注释' }, { key: 'address', title: '客户端地址' }, { key: 'internal', title: '客户端端口' }, { key: 'external', title: '外部端口' }, { key: 'action', title: '操作', render: v => tag(v, v === '允许' ? 'success' : 'error') }], fields: [{ ...field('注释'), key: 'name' }, { ...field('客户端地址', 'text', '192.168.1.0/24'), key: 'address' }, { ...field('客户端端口', 'text', '1024-65535'), key: 'internal' }, { ...field('外部端口', 'text', '1024-65535'), key: 'external' }, { ...field('操作', 'select', '允许', ['允许', '拒绝']), key: 'action' }] });
  return tabs([{ value: 'mappings', label: '端口映射', icon: 'network', content: mappings }, { value: 'settings', label: '服务设置', icon: 'settings', content: schemaTabs('services-upnp', [], false) }, { value: 'acl', label: '访问控制', icon: 'shield', content: acl }]);
 }
 const renderers = {
  'status/overview': overview, 'status/routesj': routesStatus, 'status/nftables': nftables, 'status/logs': () => logPanel(), 'status/processes': processes, 'status/channel_analysis': channelAnalysis, 'status/realtime': realtime,
  'system/admin': administration, 'system/package-manager': packages, 'system/startup': startup, 'system/crontab': crontab, 'system/mounts': mounts, 'system/leds': leds, 'system/flash': flash, 'system/argon-config': argon, 'system/reboot': reboot, 'system/ttyd': terminal,
  'network/wireless': wireless, 'network/routes': staticRoutes, 'network/dhcp': dhcp, 'network/dns': dns, 'network/diagnostics': diagnostics, 'network/firewall': firewall, 'network/turboacc': turboacc,
  'services/openclash': openclash, 'services/ddns': ddns, 'services/wol': wol, 'services/upnp': upnp
 };
 const descriptions = {
  'status/overview': '设备信息、端口连接和系统资源一览。', 'status/routesj': '查看邻居表、活动路由与策略规则。', 'status/nftables': '按规则链查看防火墙匹配条件和流量计数。', 'status/logs': '筛选与查看系统运行事件。', 'status/processes': '查看进程占用与运行状态。', 'status/channel_analysis': '了解周边无线网络与信道分布。', 'status/realtime': '系统负载、网络带宽与活动连接。',
  'system/admin': '管理管理员密码、SSH 与 Web 访问。', 'system/package-manager': '浏览、筛选和管理软件包。', 'system/startup': '管理开机服务与本地启动脚本。', 'system/crontab': '安排周期性运行的系统任务。', 'system/mounts': '管理存储设备、文件系统与交换分区。', 'system/leds': '为状态指示灯配置设备与触发动作。', 'system/flash': '备份配置、恢复设置和更新设备固件。', 'system/argon-config': '管理已安装主题插件的外观与背景设置。', 'system/reboot': '重新启动设备并加载已保存的配置。', 'system/ttyd': '通过命令行查看状态与管理设备。',
  'network/wireless': '管理无线设备、网络与已连接站点。', 'network/routes': '配置静态路由和策略路由规则。', 'network/dhcp': '管理静态租约、地址分配与 DHCP 服务。', 'network/dns': '配置域名解析、转发、记录和缓存。', 'network/diagnostics': '检查目标地址的连通性、路径与域名解析。', 'network/firewall': '管理网络区域、端口转发和通信规则。', 'network/turboacc': '配置流量卸载与硬件网络加速。',
  'services/openclash': '代理运行状态、配置文件与订阅管理。', 'services/ddns': '将动态公网地址同步到指定域名。', 'services/wol': '向局域网设备发送网络唤醒请求。', 'services/upnp': '查看自动端口映射并管理服务访问权限。'
 };
 try {
  const heading = d('div', { class: 'ap-page-heading' }, [d('div', {}, [d('h2', {}, page?.title || '页面'), d('p', {}, descriptions[key] || '')])]);
  const content = d('div', { class: 'ap-page-content' }, unwrap(renderers[key]?.()));
  const readonly = key.startsWith('status/') || ['system/package-manager', 'system/reboot', 'system/ttyd', 'network/diagnostics'].includes(key);
  root.replaceChildren(heading, content, ...(readonly ? [] : [footer()]));
  root.setAttribute('aria-busy', 'false');
  root.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); if (!readonly) saved(); } });
 } catch (error) {
  root.replaceChildren(UI.alert({ title: '页面载入失败', message: error.message, tone: 'error' }).element); root.setAttribute('aria-busy', 'false'); console.error(error);
 }
})();
