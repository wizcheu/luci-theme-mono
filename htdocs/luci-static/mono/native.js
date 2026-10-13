/* Presentation adapters for real LuCI markup. Never read passwords or write UCI. */
(function () {
 'use strict';
 // Some LuCI revisions return NaN for an uncached tab index. Normalize it
 // before the first render, including the legacy CBI initialization path.
 if (window.L && typeof L.require === 'function') L.require('ui').then(function(ui) {
  var getIndex = ui.tabs.getActiveTabId;
  if (getIndex.monoFiniteIndex) return;
  var finiteIndex = function(pane) {
   var index = getIndex.call(this, pane);
   return Number.isFinite(index) && index >= 0 ? index : 0;
  };
  finiteIndex.monoFiniteIndex = true;
  ui.tabs.getActiveTabId = finiteIndex;
  var setSelectValue = ui.Select.prototype.setValue;
  ui.Select.prototype.setValue = function(value) {
   var result = setSelectValue.call(this, value);
   var select = this.node && this.node.querySelector('select');
   if (select) syncSelect(select);
   return result;
  };
 });
 // The original select remains the first child for LuCI getValue(), validation,
 // dependencies and legacy form submission. Only its visual surface is replaced.
 var nativeSelects = new WeakMap(), selectSequence = 0;
 function selectItems(select) {
  return Array.from(select.options).map(function(option) {
   return {value:option.value,label:option.label,disabled:option.disabled || (option.parentElement.tagName === 'OPTGROUP' && option.parentElement.disabled)};
  });
 }
 function syncSelect(select) {
  var entry = nativeSelects.get(select);
  if (!entry) return;
  var items = selectItems(select), signature = JSON.stringify(items);
  if (signature !== entry.signature) { entry.control.setItems(items); entry.signature = signature; }
  if (entry.control.getValue() !== select.value) entry.control.setValue(select.value,{allowMissing:true});
  entry.control.setDisabled(select.matches(':disabled'));
  entry.trigger.setAttribute('aria-invalid', String(select.classList.contains('cbi-input-invalid') || select.getAttribute('aria-invalid') === 'true'));
 }
 function adaptSelects(root) {
  if (!window.MonoControls) return;
  root.querySelectorAll('select:not([multiple])').forEach(function(select) {
   if (nativeSelects.has(select) || select.size > 1 || select.closest('.mono-select')) return;
   var cell = select.closest('td,.td'), header = cell && cell.closest('table,.table')?.querySelector('tr,.tr')?.children[Array.from(cell.parentElement.children).indexOf(cell)];
   var labels = Array.from(select.labels || []), title = labels.map(function(label) { return label.textContent.trim(); }).join(' ') || select.getAttribute('aria-label') || select.title || select.closest('.cbi-value')?.querySelector('.cbi-value-title')?.textContent.trim() || header?.textContent.trim() || '选择选项';
   var control = window.MonoControls.select({id:'mono-native-select-' + (++selectSequence),label:title,value:select.value,items:selectItems(select),block:true,
    onOpen:function() { select.dispatchEvent(new MouseEvent('click',{bubbles:true})); syncSelect(select); },
    onChange:function(value) {
     select.value = value;
     select.dispatchEvent(new Event('input',{bubbles:true}));
     select.dispatchEvent(new Event('change',{bubbles:true}));
     syncSelect(select);
    }
   });
   var trigger = control.element.querySelector('button');
   nativeSelects.set(select,{control:control,trigger:trigger,signature:JSON.stringify(selectItems(select))});
   select.after(control.element);
   select.classList.add('mono-native-select-source');
   select.tabIndex = -1; select.setAttribute('aria-hidden','true');
   labels.forEach(function(label) { label.addEventListener('click',function(event) {
    if (!event.defaultPrevented && !event.target.closest('button,a,input,select')) { event.preventDefault(); trigger.focus(); }
   }); });
   ['aria-describedby','aria-required','title'].forEach(function(name) { if (select.hasAttribute(name)) trigger.setAttribute(name,select.getAttribute(name)); });
   select.addEventListener('change',function() { syncSelect(select); });
   select.addEventListener('focus',function() { trigger.focus(); });
   trigger.addEventListener('blur',function() { select.dispatchEvent(new Event('blur')); });
   // Legacy views frequently assign .value without a change event.
   ['value','selectedIndex'].forEach(function(name) {
    var descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,name);
    if (Object.getOwnPropertyDescriptor(select,name) || !descriptor) return;
    Object.defineProperty(select,name,{configurable:true,get:function() { return descriptor.get.call(this); },set:function(value) { descriptor.set.call(this,value); syncSelect(this); }});
   });
   syncSelect(select);
  });
 }
 function glyph(name, className) {
  var icon = window.MonoUI.icon(name);
  icon.classList.add(className);
  return icon;
 }
 var deviceIcons = new WeakMap();
 function adaptDeviceIcons(root) {
  root.querySelectorAll('img[src*="/resources/icons/"]').forEach(function(img) {
   var source = img.getAttribute('src'), filename = source.split('/').pop().replace(/\.(?:svg|png)(?:\?.*)?$/, '');
   var iconName = /wifi|signal/.test(filename) ? 'wifi' : /bridge|alias/.test(filename) ? 'network' : /switch/.test(filename) ? 'switch' : /ethernet|port_/.test(filename) ? 'ethernet' : /tunnel|vlan/.test(filename) ? 'globe' : /storage|usb/.test(filename) ? 'storage' : null;
   if (!iconName) return;
   var entry = deviceIcons.get(img);
   if (!entry) {
    var icon = glyph(iconName, 'mono-native-device-icon');
    img.before(icon); img.classList.add('mono-original-device-icon');
    entry = {icon:icon, source:null}; deviceIcons.set(img, entry);
   }
   if (entry.source === source) return;
   entry.source = source;
   entry.icon.replaceChildren(window.MonoUI.icon(iconName).firstElementChild);
   entry.icon.classList.toggle('is-inactive', /disabled|down|none|000-000/.test(filename));
   if (img.alt || img.title) {
    entry.icon.setAttribute('role', 'img'); entry.icon.setAttribute('aria-label', img.alt || img.title);
    entry.icon.removeAttribute('aria-hidden');
   }
  });
 }
 function adaptInterfaceCards(root) {
  if (document.body.dataset.page !== 'admin-network-network') return;
  var section = root.querySelector('#cbi-network-interface');
  if (section) section.classList.add('mono-interface-cards');
 }
 function adaptFormGrids(root) {
  var page = document.body.dataset.page || '';
  if (!/^(?:admin-system-(?:system|admin-dropbear|admin-uhttpd|ttyd-config)|admin-network-(?:dns|dhcp|turboacc)|admin-services-(?:upnp|ddns))$/.test(page)) return;
  root.querySelectorAll('.cbi-tabcontainer,.cbi-section-node,[data-tab-title]').forEach(function(group) {
   if (group.closest('.modal')) return;
   if (group.querySelector('table,.table')) { group.classList.remove('mono-form-grid'); return; }
   if (group.classList.contains('mono-form-grid')) return;
   var fields = Array.from(group.children).filter(function(child) { return child.classList.contains('cbi-value'); });
   if (fields.length < 3) return;
   group.classList.add('mono-form-grid');
  });
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
 function adaptKernelLogFilters(root) {
  var box = root.querySelector('#content_syslog');
  if (!box || !box.querySelector('#logFromTime') || box.querySelector('.mono-log-filters')) return;
  var chinese = (document.documentElement.lang || '').startsWith('zh');
  var definitions = [
   ['logFromTime', chinese ? '开始时间（秒）' : 'Start time (seconds)', 'invertLogRangeTime'],
   ['logToTime', chinese ? '结束时间（秒）' : 'End time (seconds)', null],
   ['logSeveritySelect', chinese ? '最低级别' : 'Minimum severity', 'invertSeverity'],
   ['logTextFilter', chinese ? '包含文本' : 'Contains text', 'invertLogTextSearch']
  ];
  var grid = document.createElement('div'), oldRows = new Set();
  grid.className = 'mono-log-filters';
  box.firstElementChild.before(grid);
  definitions.forEach(function(def) {
   var input = box.querySelector('#' + def[0]);
   if (!input) return;
   oldRows.add(input.parentElement);
   var field = document.createElement('div'), heading = document.createElement('div'), label = document.createElement('label');
   field.className = 'mono-log-filter'; heading.className = 'mono-log-filter-heading';
   label.htmlFor = input.id; label.textContent = def[1]; heading.append(label);
   var invert = def[2] && box.querySelector('#' + def[2]);
   if (invert) {
    oldRows.add(invert.parentElement);
    var toggle = document.createElement('label');
    toggle.className = 'mono-log-invert'; toggle.htmlFor = invert.id;
    toggle.append(invert, document.createTextNode(chinese ? '排除' : 'Exclude')); heading.append(toggle);
   }
   field.append(heading, input); grid.append(field);
  });
  var sort = box.querySelector('#invertAscendingSort');
  if (sort) {
   oldRows.add(sort.parentElement);
   var sortLabel = document.createElement('label');
   sortLabel.className = 'mono-log-sort'; sortLabel.htmlFor = sort.id;
   sortLabel.append(sort, document.createTextNode(chinese ? '最新日志在前' : 'Newest entries first'));
   grid.append(sortLabel);
  }
  oldRows.forEach(function(row) { row.remove(); });
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
  '接口':'network', 'Interfaces':'network', '设备':'device', 'Devices':'device', '全局网络选项':'settings',
  '操作':'settings', 'Actions':'settings', '配置':'file', 'Configuration':'file', '常规':'settings', 'General':'settings',
  '缓存':'storage', 'Cache':'storage', '转发':'network', 'Forwarding':'network', '租约':'device', 'Leases':'device',
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
 function adaptPollStatus() {
  var indicator = document.querySelector('#indicators [data-indicator="poll-status"]');
  if (!indicator) return;
  var active = indicator.dataset.style === 'active';
  var chinese = (document.documentElement.lang || '').startsWith('zh');
  var label = chinese ? (active ? '自动刷新' : '刷新已暂停') : (active ? 'Auto refresh' : 'Refresh paused');
  if (indicator.textContent !== label) indicator.textContent = label;
  indicator.setAttribute('aria-pressed',String(active));
  indicator.title = chinese ? (active ? '点击暂停自动刷新' : '点击恢复自动刷新') : (active ? 'Pause automatic refresh' : 'Resume automatic refresh');
 }
 function adapt(root) {
  adaptDeviceIcons(root);
  adaptInterfaceCards(root);
  adaptFormGrids(root);
  adaptLogFilters(root);
  adaptKernelLogFilters(root);
  adaptBandwidth(root);
  adaptRealtimeGraphs(root);
  adaptSelects(root);
  adaptPollStatus();
  root.querySelectorAll('.ifacebox-body > div > .ifacebadge > img[src*="/signal-"]').forEach(function(img) {
   img.closest('.ifacebox').classList.add('mono-wireless-card');
  });
  root.querySelectorAll('#indicators [data-clickable="true"],.cbi-title [data-clickable="true"]').forEach(function(indicator) {
   if (indicator.hasAttribute('role')) return;
   indicator.setAttribute('role','button'); indicator.tabIndex = 0;
   indicator.addEventListener('keydown',function(event) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); indicator.click(); } });
   if (indicator.closest('.cbi-title')) {
    var update = function() { indicator.setAttribute('aria-expanded',String(indicator.dataset.style !== 'active')); };
    indicator.addEventListener('click',update); update();
   }
  });
  root.querySelectorAll('.alert-message button,.alert-message input[type="button"]').forEach(function(button) { button.classList.add('cbi-button'); });
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
   if (button.closest('.cbi-page-actions')) return;
   if (button.querySelector('svg,img') || button.matches('.cbi-dropdown,.spinning')) return;
   if (button.classList.contains('drag-handle')) {
    button.replaceChildren(glyph('grip', 'mono-native-action-icon'));
    button.setAttribute('aria-label', button.title || '拖动排序');
    return;
   }
   var type = Object.keys(actionIcons).find(function(name) { return button.classList.contains(name); });
   var name = document.body.dataset.page === 'admin-status-channel_analysis' && button.closest('.cbi-title-buttons') ? 'refresh' : actionIcons[type];
   if (name) button.prepend(glyph(name, 'mono-native-action-icon'));
  });
  root.querySelectorAll('.cbi-button-up,.cbi-button-down').forEach(function(button) {
   if (!button.hasAttribute('aria-label')) button.setAttribute('aria-label', button.title || (button.classList.contains('cbi-button-up') ? '上移' : '下移'));
   if (button.parentElement.matches('td,.td')) button.parentElement.classList.add('td','mono-sort-actions');
  });
 }
 function setup() {
  var root = document.body;
  if (!root || !window.MonoUI) return;
  var frame = 0;
  var observer = new MutationObserver(function(records) {
   records.forEach(function(record) {
    var select = record.target.closest && record.target.closest('select');
    if (select) syncSelect(select);
   });
   // Routine polling replaces text; only new widgets need adaptation.
   if (!records.some(function(record) {
    return record.attributeName === 'src' ||
     (record.attributeName === 'class' && record.target.matches('.cbi-title-buttons > button.cbi-button-edit:not(.spinning)')) ||
     Array.from(record.addedNodes).some(function(node) { return node.nodeType === 1; });
   })) return;
   if (!frame) frame = requestAnimationFrame(function() { frame = 0; adapt(root); });
  });
  observer.observe(root, {childList:true, subtree:true, attributes:true, attributeFilter:['src','disabled','selected','label','value','class']});
  ['poll-start','poll-stop'].forEach(function(name) { document.addEventListener(name,function() { queueMicrotask(adaptPollStatus); }); });
  adapt(root);
 }
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
 else setup();
}());
