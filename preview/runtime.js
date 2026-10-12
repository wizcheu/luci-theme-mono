/* Preview-only LuCI DOM/menu adapter. Not shipped in the router package. */
(function() {
 'use strict';
 window._ = function(text) { return text; };
 window.E = function(tag, attrs, children) {
  var node = Array.isArray(tag) ? document.createDocumentFragment() : document.createElement(tag);
  if (Array.isArray(tag)) children = tag;
  else if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { children = attrs; attrs = {}; }
  Object.entries(attrs || {}).forEach(function(entry) {
   if (typeof entry[1] === 'function') node.addEventListener(entry[0], entry[1]);
   else if (entry[1] !== null && entry[1] !== undefined) node.setAttribute(entry[0], entry[1]);
  });
  function append(child) {
   if (Array.isArray(child)) child.forEach(append);
   else if (child !== null && child !== undefined) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  append(children);
  return node;
 };
 var tree = { children: { admin: { name: 'admin', title: '管理', children: {
  status: { name: 'status', title: '状态', children: { overview: { name: 'overview', title: '概览' }, components: { name: 'components', title: '组件预览' } } },
  system: { name: 'system', title: '系统', children: { system: { name: 'system', title: '系统设置' } } },
  services: { name: 'services', title: '服务', children: { openclash: { name: 'openclash', title: 'OpenClash' }, ddns: { name: 'ddns', title: '动态 DNS' } } },
  network: { name: 'network', title: '网络', children: { network: { name: 'network', title: '接口' } } },
  logout: { name: 'logout', title: '退出登录' }
 } } } };
 var parts = location.pathname.replace('/cgi-bin/luci/', '').split('/');
 if (parts[0] !== 'admin') parts = ['admin', 'status', 'overview'];
 var ui = { menu: { load: function() { return Promise.resolve(tree); }, getChildren: function(node) { return Object.values(node.children || {}); } } };
 var baseclass = { extend: function(object) { var instance = Object.create(object); instance.__init__(); return instance; } };
 window.L = {
  env: { requestpath: parts, dispatchpath: parts },
  url: function() { return '/cgi-bin/luci/' + Array.from(arguments).join('/'); },
  require: function(name) { return fetch('/luci-static/resources/' + name + '.js').then(function(response) { return response.text(); }).then(function(source) { return new Function('baseclass', 'ui', 'L', 'E', '_', source)(baseclass, ui, L, E, _); }); }
 };
 document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('controls')) {
   // LuCI renders the polling control as a clickable span, not a button.
   var refresh = E('span', { 'data-indicator': 'poll-status', 'data-clickable': 'true', 'data-style': 'active' }, '刷新');
   refresh.addEventListener('click', function() { refresh.dataset.style = refresh.dataset.style === 'active' ? 'inactive' : 'active'; });
   document.getElementById('indicators').append(refresh);
  }
  document.querySelectorAll('[data-demo-password]').forEach(function(button) {
   button.addEventListener('click', function() { var input = button.parentElement.querySelector('input'); input.type = input.type === 'password' ? 'text' : 'password'; });
  });
  // Reproduce LuCI's separate open list and cloned label for visual checks.
  document.querySelectorAll('[data-demo-dropdown]').forEach(function(dropdown) {
   var list = dropdown.querySelector('ul');
   function close() {
    if (!dropdown.hasAttribute('open')) return;
    dropdown.querySelector('ul.preview').remove();
    dropdown.removeAttribute('open');
    list.classList.remove('dropdown');
    list.removeAttribute('style');
    list.querySelectorAll('li').forEach(function(item) { item.classList.remove('focus'); item.removeAttribute('tabindex'); });
    dropdown.focus();
   }
   dropdown.querySelector('.open').addEventListener('click', function() {
    if (dropdown.hasAttribute('open')) { close(); return; }
    var preview = list.cloneNode(true);
    preview.classList.add('preview');
    list.after(preview);
    dropdown.setAttribute('open', '');
    list.classList.add('dropdown');
    var rect = dropdown.getBoundingClientRect();
    list.style[innerHeight - rect.bottom < 150 && rect.top > 150 ? 'bottom' : 'top'] = rect.height + 'px';
    list.style.maxHeight = '240px';
    list.querySelectorAll('li').forEach(function(item) { item.setAttribute('tabindex', '0'); });
    var selected = list.querySelector('[selected]');
    selected.classList.add('focus');
    selected.focus({ preventScroll: true });
   });
   dropdown.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') { close(); event.stopPropagation(); }
   });
   document.addEventListener('click', function(event) { if (!dropdown.contains(event.target)) close(); });
  });
  // Demo services have no backend; keep navigation within the preview.
  document.addEventListener('click', function(event) {
   var link = event.target.closest('a');
   if (link && link.pathname.startsWith('/cgi-bin/luci/admin/services/')) {
    event.preventDefault();
    showModal('插件页面', '这里展示 LuCI 自动生成的插件入口。真实安装后会打开对应插件；本地预览不连接路由器。');
   }
  });
  document.querySelectorAll('[data-demo-action]').forEach(function(button) {
   button.addEventListener('click', function() {
    if (button.dataset.demoAction === 'reset') { document.querySelector('form').reset(); return; }
    showModal(button.dataset.demoAction === 'edit' ? '编辑接口' : '预览操作', button.dataset.demoAction === 'edit' ? '此弹窗用于检查主题的 LuCI 模态框样式。' : '这是本地样式预览，设置不会写入任何路由器。');
   });
  });
  document.querySelectorAll('[data-demo-hide]').forEach(function(button) {
   button.addEventListener('click', function() { var block = button.closest('.cbi-section').lastElementChild; block.hidden = !block.hidden; button.textContent = block.hidden ? '显示' : '隐藏'; });
  });
 });
 function showModal(title, description) {
  var overlay = E('div', { id: 'modal_overlay' });
  var close = E('button', { class: 'btn', type: 'button' }, '关闭');
  var oldFocus = document.activeElement;
  close.addEventListener('click', function() { overlay.remove(); document.body.classList.remove('modal-overlay-active'); oldFocus.focus(); });
  overlay.append(E('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, [E('h4', {}, title), E('p', {}, description), E('div', { class: 'right' }, close)]));
  document.body.append(overlay); document.body.classList.add('modal-overlay-active'); close.focus();
 }
}());
