/* Reproduce the native LuCI tab contract, not the preview's hidden attribute. */
(function () {
 'use strict';
 var tabs = document.getElementById('native-tabs');
 var panels = document.getElementById('native-panels');
 for (var i = 0; i < 7; i++) {
  var panel = document.createElement('div');
  panel.className = 'cbi-section';
  panel.dataset.tab = 'interface-' + i;
  panel.dataset.tabTitle = '接口 ' + (i + 1);
  panel.dataset.tabActive = String(i === 0);
  panel.innerHTML = '<h3>原生面板</h3><p>未选中的面板不能保留 padding、边框或 margin 的高度。</p><table class="table"><tbody><tr class="tr"><td class="td">设备</td><td class="td">测试接口</td></tr><tr class="tr"><td class="td">状态</td><td class="td">已连接</td></tr></tbody></table>';
  panels.append(panel);
  var item = document.createElement('li'), link = document.createElement('a');
  item.className = i === 0 ? 'cbi-tab' : 'cbi-tab-disabled';
  link.href = '#';
  link.textContent = panel.dataset.tabTitle;
  link.dataset.panel = panel.dataset.tab;
  link.addEventListener('click', function (event) {
   event.preventDefault();
   Array.from(panels.children).forEach(function (p) { p.dataset.tabActive = String(p.dataset.tab === event.currentTarget.dataset.panel); });
   Array.from(tabs.children).forEach(function (li) { li.className = li.contains(event.currentTarget) ? 'cbi-tab' : 'cbi-tab-disabled'; });
  });
  item.append(link);
  tabs.append(item);
 }
 document.getElementById('native-run-checks').addEventListener('click', function () {
  var failures = [], passed = 0;
  function check(condition, message) { if (condition) passed++; else failures.push(message); }
  tabs.firstElementChild.firstElementChild.click();
  var start = panels.firstElementChild.getBoundingClientRect().top;
  tabs.lastElementChild.firstElementChild.click();
  check(Math.abs(panels.lastElementChild.getBoundingClientRect().top - start) < 1, '切换到末尾 Tab 不应累计空白');
  Array.from(panels.children).slice(0, -1).forEach(function (panel) {
   check(panel.getBoundingClientRect().height === 0, '非活动 Tab 必须不占据高度');
  });
  ['fixture-select', 'fixture-input', 'fixture-textarea'].forEach(function (id) {
   var style = getComputedStyle(document.getElementById(id));
   check(style.borderTopWidth !== '0px' && style.borderTopColor !== style.backgroundColor, id + ' 必须有可辨识的默认边界');
  });
  document.querySelectorAll('.cbi-button-up,.cbi-button-down').forEach(function(button) {
   check(getComputedStyle(button).backgroundImage !== 'none', '原生 input/button 排序控件必须显示箭头图标');
  });
  check(parseFloat(getComputedStyle(document.getElementById('fixture-select')).paddingRight) >= 40, '下拉箭头必须预留右侧空间');
  var search = document.getElementById('mono-menu-search');
  search.value = 'root';
  search.dispatchEvent(new Event('input', {bubbles:true}));
  check(search.value === '' && !document.querySelector('.mono-nav-group[hidden]'), '非聚焦的自动填充值不得过滤菜单');
  var groups = Array.from(document.querySelectorAll('.mono-nav-group'));
  var openBefore = groups.map(function(group) { return group.open; });
  groups.forEach(function(group) { group.open = false; });
  groups[0].querySelector('summary').click();
  groups[1].querySelector('summary').click();
  check(groups.filter(function(group) { return group.open; }).length === 1 && groups[1].open, '一级菜单必须互斥展开');
  groups.forEach(function(group, index) { group.open = openBefore[index]; });
  var result = document.getElementById('native-check-results');
  result.textContent = passed + ' 项通过；' + failures.length + ' 项失败。' + failures.join('；');
  result.dataset.failures = String(failures.length);
 });
}());
