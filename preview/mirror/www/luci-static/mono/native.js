/* Presentation adapters for real LuCI markup. Never read passwords or write UCI. */
(function () {
 'use strict';
 function glyph(name, className) {
  var icon = window.MonoUI.icon(name);
  icon.classList.add(className);
  return icon;
 }
 function adaptLogFilters(root) {
  var box = root.querySelector('#content_syslog');
  if (!box || box.querySelector('.mono-log-filters')) return;
  var definitions = [
   ['logFacilitySelect', 'invertLogFacilitySearch'],
   ['logSeveritySelect', 'invertLogSeveritySearch'],
   ['logTextFilter', 'invertLogTextSearch'],
   ['logMaxRows', null]
  ];
  if (!definitions.every(function(pair) { return box.querySelector('#' + pair[0]); })) return;
  var grid = document.createElement('div');
  grid.className = 'mono-log-filters';
  var firstRow = box.querySelector('#logFacilitySelect').parentElement;
  var oldRows = new Set();
  firstRow.before(grid);
  definitions.forEach(function(pair) {
   var control = box.querySelector('#' + pair[0]);
   var label = box.querySelector('label[for="' + pair[0] + '"]');
   var field = document.createElement('div'), heading = document.createElement('div');
   field.className = 'mono-log-filter';
   heading.className = 'mono-log-filter-heading';
   oldRows.add(control.parentElement);
   if (label) heading.append(label);
   if (pair[1]) {
    var invert = box.querySelector('#' + pair[1]);
    var invertLabel = box.querySelector('label[for="' + pair[1] + '"]');
    if (invert && invertLabel) {
     invertLabel.classList.add('mono-log-invert');
     invertLabel.prepend(invert);
     heading.append(invertLabel);
    }
   }
   field.append(heading, control);
   grid.append(field);
  });
  oldRows.forEach(function(row) { if (!row.children.length) row.remove(); });
  box.querySelectorAll(':scope > div').forEach(function(row) {
   if (row.querySelector(':scope > .cbi-button')) row.classList.add('mono-log-actions');
  });
 }
 function adaptBandwidth(root) {
  root.querySelectorAll('[data-tab-title]').forEach(function(panel) {
   var current = panel.querySelector('#rx_bw_cur');
   if (!current) return;
   var table = current.closest('table');
   if (!table || table.classList.contains('mono-bandwidth-table')) return;
   var rows = Array.from(table.rows);
   if (rows.length !== 2 || rows.some(function(row) { return row.cells.length !== 6; })) return;
   table.classList.add('mono-bandwidth-table');
   var header = table.createTHead().insertRow();
   header.className = 'tr';
   var chinese = (document.documentElement.lang || '').startsWith('zh');
   (chinese ? ['方向', '当前速率', '平均速率', '峰值速率'] : ['Direction', 'Current', 'Average', 'Peak']).forEach(function(title) {
    var cell = document.createElement('th');
    cell.className = 'th'; cell.scope = 'col'; cell.textContent = title;
    header.append(cell);
   });
   rows.forEach(function(row, index) {
    var cells = Array.from(row.cells);
    var direction = cells[0];
    direction.className = 'td mono-bandwidth-direction';
    direction.replaceChildren(glyph(index ? 'upload' : 'download', 'mono-native-action-icon'), document.createTextNode(chinese ? (index ? '上传' : '下载') : (index ? 'Upload' : 'Download')));
    row.dataset.direction = index ? 'tx' : 'rx';
    // Keep the original value cells and IDs: LuCI polling updates them in place.
    cells[2].remove(); cells[4].remove();
   });
   var svg = panel.querySelector('svg:has(polyline#rx)');
   if (svg) {
    svg.parentElement.classList.add('mono-native-graph');
    // Upstream computes coordinates from #view before card padding is deducted.
    // A viewBox keeps the entire sampled window inside the visible graph.
    svg.setAttribute('viewBox', '0 0 ' + Math.max(1, root.querySelector('#view').offsetWidth - 2) + ' 298');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', panel.dataset.tabTitle + (chinese ? ' 实时上传与下载带宽' : ' live upload and download bandwidth'));
   }
  });
 }
 function adaptRealtimeGraphs(root) {
  if (!(document.body.dataset.page || '').startsWith('admin-status-realtime')) return;
  var view = root.querySelector('#view');
  if (!view) return;
  view.querySelectorAll('div[style] > svg:has(polyline)').forEach(function(svg) {
   if (svg.parentElement.classList.contains('mono-native-graph')) return;
   svg.parentElement.classList.add('mono-native-graph');
   svg.setAttribute('viewBox', '0 0 ' + Math.max(1, view.offsetWidth - 2) + ' 298');
   svg.setAttribute('preserveAspectRatio', 'none');
  });
 }
 var tabIcons = {
  '常规设置':'settings', 'General Settings':'settings', '日志':'file', 'Logging':'file',
  '时间同步':'clock', 'Time Synchronization':'clock', '语言和界面':'globe', 'Language and Style':'globe',
  '系统日志':'file', '内核日志':'device', 'System Log':'file', 'Kernel Log':'device',
  '负载':'chart', 'Load':'chart', '带宽':'chart', 'Bandwidth':'chart', '无线':'wifi', 'Wireless':'wifi',
  '连接':'network', 'Connections':'network', '路由器密码':'shield', 'Router Password':'shield',
  'SSH 访问':'device', 'SSH Access':'device', 'SSH 密钥':'shield', 'SSH-Keys':'shield',
  'HTTP(S) 访问':'globe', 'HTTP(S) Access':'globe', '软件包仓库公钥':'shield',
  '启动脚本':'settings', 'Initscripts':'settings', '本地启动脚本':'file', 'Local Startup':'file',
  '高级设置':'settings', 'Advanced Settings':'settings', '物理设置':'network', 'Physical Settings':'network',
  '防火墙设置':'shield', 'Firewall Settings':'shield', 'DHCP 服务器':'network', 'DHCP Server':'network',
  'IPv6 设置':'network', 'IPv6 Settings':'network', 'DNS 设置':'globe', 'DNS Settings':'globe',
  '运行状态':'chart', '插件设置':'settings', '覆写设置':'edit', '配置订阅':'refresh',
  '配置管理':'folder', '运行日志':'file', 'Meta 设置':'settings', 'Smart 设置':'settings', '规则设置':'shield'
 };
 var actionIcons = {
  'cbi-button-add':'plus', 'cbi-button-edit':'edit', 'cbi-button-remove':'trash',
  'cbi-button-download':'download', 'cbi-button-upload':'upload',
  'cbi-button-save':'check', 'cbi-button-apply':'check', 'cbi-button-reload':'refresh'
 };
 function adapt(root) {
  adaptLogFilters(root);
  adaptBandwidth(root);
  adaptRealtimeGraphs(root);
  // Password creation is not a sign-in. Set metadata only, never touch values.
  if (/^admin-system-admin(?:-|$)/.test(document.body.dataset.page || '')) {
   root.querySelectorAll('input[type="password"]').forEach(function(input) {
    input.setAttribute('autocomplete', 'new-password');
   });
  }
  root.querySelectorAll('.tabs > li > a,.cbi-tabmenu > li > a').forEach(function(link) {
   if (link.querySelector('svg,img') || link.dataset.monoIcon) return;
   var title = link.textContent.trim(), name = tabIcons[title];
   if (!name && /^(?:br-|eth\d|lan\d|wan\d?|pppoe-|wlan\d)/.test(title)) name = 'network';
   if (name) {
    link.dataset.monoIcon = name;
    link.prepend(glyph(name, 'mono-native-tab-icon'));
   }
  });
  root.querySelectorAll('button.cbi-button').forEach(function(button) {
   if (button.querySelector('svg,img') || button.matches('.cbi-dropdown,.spinning')) return;
   var type = Object.keys(actionIcons).find(function(name) { return button.classList.contains(name); });
   if (type) button.prepend(glyph(actionIcons[type], 'mono-native-action-icon'));
  });
  root.querySelectorAll('.cbi-button-up,.cbi-button-down').forEach(function(button) {
   if (!button.hasAttribute('aria-label')) button.setAttribute('aria-label', button.title || (button.classList.contains('cbi-button-up') ? '上移' : '下移'));
   if (button.parentElement.matches('td,.td')) button.parentElement.classList.add('mono-sort-actions');
  });
 }
 function setup() {
  var root = document.getElementById('maincontent');
  if (!root || !window.MonoUI) return;
  var frame = 0;
  var observer = new MutationObserver(function(records) {
   // Routine polling replaces text; only new widgets need adaptation.
   if (!records.some(function(record) { return Array.from(record.addedNodes).some(function(node) { return node.nodeType === 1; }); })) return;
   if (!frame) frame = requestAnimationFrame(function() { frame = 0; adapt(root); });
  });
  observer.observe(root, {childList:true, subtree:true});
  adapt(root);
 }
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
 else setup();
}());
