'use strict';
'require baseclass';
'require ui';

return baseclass.extend({
 __init__: function() {
  return ui.menu.load().then(this.render.bind(this)).catch(function(error) {
   var target = document.getElementById('mono-navigation');
   if (target) target.replaceChildren(E('p', { 'class': 'mono-menu-empty' }, error.message || String(error)), E('button', { 'class': 'btn', 'type': 'button', 'click': function() { location.reload(); } }, _('Reload')));
  });
 },

 icon: function(name) {
  var paths = {
   status: 'M3 13h4l3-8 4 14 3-6h4',
   system: 'M4 4h16v12H4z M8 20h8 M12 16v4',
   services: 'M8 3v4m8-4v4M6 7h12v5a6 6 0 0 1-12 0z M12 18v3',
   network: 'M12 3v6M5 15v-4h14v4M3 15h4v6H3z M17 15h4v6h-4z M10 3h4v4h-4z',
   logout: 'M9 4H4v16h5 M9 12h12 M17 8l4 4-4 4',
   default: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z'
  };
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  var path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', paths[name] || paths.default);
  svg.appendChild(path);
  return svg;
 },

 render: function(tree) {
  var target = document.getElementById('mono-navigation');
  var modes = ui.menu.getChildren(tree);
  var activeMode = modes.find(function(child) { return child.name === L.env.requestpath[0]; }) || modes[0];
  if (!target || !activeMode) return;
  target.replaceChildren();
  var groups = ui.menu.getChildren(activeMode);
  groups.forEach(function(group) {
   var children = ui.menu.getChildren(group);
   var selected = L.env.dispatchpath[1] === group.name;
   var path = activeMode.name + '/' + group.name;
   if (!children.length) {
    target.appendChild(E('a', { 'class': 'mono-nav-item mono-nav-direct', 'href': L.url(path) }, [this.icon(group.name), E('span', {}, _(group.title))]));
    return;
   }
   var details = E('details', { 'class': 'mono-nav-group' });
   details.open = selected;
   var summary = E('summary', { 'class': 'mono-nav-item' }, [this.icon(group.name), E('span', {}, _(group.title)), E('span', { 'class': 'mono-chevron', 'aria-hidden': 'true' })]);
   var list = E('ul', { 'class': 'mono-nav-children' });
   children.forEach(function(child) {
    var active = selected && L.env.dispatchpath[2] === child.name;
    var attrs = { 'href': L.url(path, child.name) };
    if (active) attrs['aria-current'] = 'page';
    list.appendChild(E('li', {}, E('a', attrs, _(child.title))));
   });
   details.append(summary, list);
   target.appendChild(details);
  }, this);
  var modeMenu = document.getElementById('modemenu');
  if (modeMenu && modes.length > 1) {
   modeMenu.replaceChildren();
   modes.forEach(function(mode) { modeMenu.appendChild(E('a', { 'href': L.url(mode.name) }, _(mode.title))); });
   modeMenu.hidden = false;
  }
  var breadcrumb = document.getElementById('mono-breadcrumb');
  var node = tree, url = '', crumbs = [];
  L.env.dispatchpath.forEach(function(segment, index) {
   node = node && node.children && node.children[segment];
   url += (url ? '/' : '') + segment;
   if (node && index > 0 && node.title) crumbs.push(E('a', { 'href': L.url(url) }, _(node.title)));
  });
  if (breadcrumb && crumbs.length) { breadcrumb.replaceChildren.apply(breadcrumb, crumbs); crumbs[crumbs.length - 1].setAttribute('aria-current', 'page'); }
  node = tree; url = '';
  for (var i = 0; i < 3 && node; i++) {
   var segment = L.env.dispatchpath[i];
   node = node.children && node.children[segment];
   url += (url ? '/' : '') + segment;
  }
  var tabmenu = document.getElementById('tabmenu');
  if (tabmenu) { tabmenu.replaceChildren(); tabmenu.style.display = 'none'; }
  if (node) this.renderTabs(node, url, 3);
  this.bindSearch(target);
 },

 renderTabs: function(tree, url, depth) {
  var container = document.getElementById('tabmenu');
  var children = ui.menu.getChildren(tree);
  if (!container || !children.length) return;
  var list = E('ul', { 'class': 'tabs' });
  var activeNode;
  children.forEach(function(child) {
   var active = L.env.dispatchpath[depth] === child.name;
   var attrs = { 'href': L.url(url, child.name) };
   if (active) { attrs['aria-current'] = 'page'; activeNode = child; }
   list.appendChild(E('li', { 'class': active ? 'active' : '' }, E('a', attrs, _(child.title))));
  });
  container.appendChild(list);
  container.style.display = '';
  if (activeNode) this.renderTabs(activeNode, url + '/' + activeNode.name, depth + 1);
 },

 bindSearch: function(target) {
  var input = document.getElementById('mono-menu-search');
  var empty = document.getElementById('mono-menu-empty');
  if (!input) return;
  var previousOpen = new Map();
  input.addEventListener('input', function() {
   var query = input.value.trim().toLocaleLowerCase();
   var visible = 0;
   target.querySelectorAll('.mono-nav-group').forEach(function(group) {
    if (query && !previousOpen.has(group)) previousOpen.set(group, group.open);
    var matchGroup = group.querySelector('summary').textContent.toLocaleLowerCase().includes(query);
    var found = false;
    group.querySelectorAll('li').forEach(function(item) {
     var match = !query || matchGroup || item.textContent.toLocaleLowerCase().includes(query);
     item.hidden = !match;
     found = found || match;
    });
    group.hidden = !found;
    if (found) visible++;
    if (query) group.open = found;
    else if (previousOpen.has(group)) { group.open = previousOpen.get(group); previousOpen.delete(group); }
   });
   target.querySelectorAll('.mono-nav-direct').forEach(function(link) {
    link.hidden = !link.textContent.toLocaleLowerCase().includes(query);
    if (!link.hidden) visible++;
   });
   if (empty) empty.hidden = visible > 0;
  });
 }
});
