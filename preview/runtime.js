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
 var menuPromise = fetch('/preview/routes.json').then(function(response) { return response.json(); }).then(function(catalog) {
  var admin={name:'admin',title:'管理',children:{}};
  catalog.groups.forEach(function(group) {
   var node={name:group.id,title:group.title,children:{}};
   group.pages.forEach(function(page){node.children[page.id]={name:page.id,title:page.title};});
   admin.children[group.id]=node;
  });
  admin.children.logout={name:'logout',title:'退出登录'};
  return {children:{admin:admin}};
 });
 var parts = location.pathname.replace('/cgi-bin/luci/', '').split('/');
 if (parts[0] !== 'admin') parts = ['admin', 'status', 'mono'];
 var localData = {};
 var session = { getLocalData: function(key) { return localData[key]; }, setLocalData: function(key, value) { localData[key] = value; } };
 var ui = { menu: { load: function() { return menuPromise; }, flushCache: function() {}, getChildren: function(node) { return Object.values(node.children || {}); } } };
 var baseclass = { extend: function(object) { var instance = Object.create(object); instance.__init__(); return instance; } };
 window.L = {
  env: { requestpath: parts, dispatchpath: parts },
  url: function() { return '/cgi-bin/luci/' + Array.from(arguments).join('/'); },
  require: function(name) { return fetch('/luci-static/resources/' + name + '.js').then(function(response) { return response.text(); }).then(function(source) { return new Function('baseclass', 'ui', 'session', 'L', 'E', '_', source)(baseclass, ui, session, L, E, _); }); }
 };
 var paths = {
  close: 'M6 6l12 12M6 18 18 6', check: 'm5 12 4 4L19 6',
  edit: 'm15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15Z',
  network: 'M8 3h8v6H8zM2 16h7v5H2zM15 16h7v5h-7zM12 9v4M5.5 16v-3h13v3'
 };
 function icon(name) {
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'ae-icon'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
  var path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', paths[name]); svg.append(path); return svg;
 }
 var toastTimer;
 function toast(message) {
  document.querySelector('.mono-toast')?.remove(); clearTimeout(toastTimer);
  var note = E('div', { class: 'mono-toast', role: 'status' }, [icon('check'), message]);
  document.body.append(note); toastTimer = setTimeout(function() { note.remove(); }, 3500);
 }
 function dialog(title, description, body, onSave) {
  var oldFocus = document.activeElement;
  var box = E('dialog', { class: 'mono-demo-dialog', 'aria-labelledby': 'demo-dialog-title' });
  function close() { box.close(); }
  var form = E('form', {}, [
   E('button', { class: 'mono-icon-button mono-dialog-close', type: 'button', 'aria-label': '关闭弹窗', click: close }, icon('close')),
   E('h3', { id: 'demo-dialog-title' }, title), E('p', {}, description), body,
   E('div', { class: 'mono-dialog-actions' }, [E('button', { class: 'btn plain', type: 'button', click: close }, '取消'), E('button', { class: 'btn primary', type: 'submit' }, onSave ? '保存更改' : '知道了')])
  ]);
  form.addEventListener('submit', function(event) { event.preventDefault(); if (onSave && onSave(form) === false) return; close(); });
  box.append(form); document.body.append(box);
  box.addEventListener('close', function() { box.remove(); oldFocus?.focus(); });
  box.addEventListener('click', function(event) { if (event.target === box) { var r=box.getBoundingClientRect(); if (event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) close(); } });
  box.showModal(); return box;
 }
 function field(label, input) { return E('div', { class: 'cbi-value' }, [E('label', { class: 'cbi-value-title', for: input.id }, label), E('div', { class: 'cbi-value-field' }, input)]); }
 document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('controls')) {
   var refresh = E('span', { 'data-indicator': 'poll-status', 'data-clickable': 'true', 'data-style': 'active', tabindex: '0', role: 'button', 'aria-label': '切换自动刷新' }, '刷新');
   function toggleRefresh() { refresh.dataset.style = refresh.dataset.style === 'active' ? 'inactive' : 'active'; refresh.textContent = refresh.dataset.style === 'active' ? '刷新' : '已暂停'; }
   refresh.addEventListener('click', toggleRefresh);
   refresh.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRefresh(); } });
   document.getElementById('indicators').append(refresh);
  }
  document.querySelectorAll('[data-demo-dropdown]').forEach(function(dropdown) {
   var list=dropdown.querySelector('ul'),items=Array.from(list.children),focusIndex=0;
   function focusOption(index){focusIndex=index;items.forEach(function(item,i){item.classList.toggle('focus',i===index);});dropdown.setAttribute('aria-activedescendant',items[index].id);}
   function close(){if(!dropdown.hasAttribute('open'))return;dropdown.querySelector('ul.preview').remove();dropdown.removeAttribute('open');dropdown.setAttribute('aria-expanded','false');dropdown.removeAttribute('aria-activedescendant');list.classList.remove('dropdown');list.removeAttribute('style');items.forEach(function(item){item.classList.remove('focus');});}
   function open(){
    if(dropdown.hasAttribute('open'))return;
    var preview=list.cloneNode(true);preview.className='preview';preview.removeAttribute('id');preview.setAttribute('aria-hidden','true');preview.querySelectorAll('[id]').forEach(function(el){el.removeAttribute('id');});
    list.after(preview);dropdown.setAttribute('open','');dropdown.setAttribute('aria-expanded','true');list.classList.add('dropdown');list.style.top='100%';list.style.maxHeight='240px';focusOption(items.findIndex(function(item){return item.hasAttribute('selected');}));
   }
   function choose(index){items.forEach(function(item,i){item.toggleAttribute('selected',i===index);item.setAttribute('aria-selected',String(i===index));if(i===index)item.setAttribute('display','0');else item.removeAttribute('display');});close();dropdown.focus();}
   dropdown.addEventListener('click',function(e){var index=items.indexOf(e.target.closest('li'));if(dropdown.hasAttribute('open')&&index>=0){choose(index);return;}if(dropdown.hasAttribute('open'))close();else open();});
   dropdown.addEventListener('keydown',function(e){if(['ArrowDown','ArrowUp','Enter',' ','Escape','Home','End'].includes(e.key)){e.preventDefault();if(e.key==='Escape'){close();return;}if(!dropdown.hasAttribute('open')){open();return;}if(e.key==='Enter'||e.key===' '){choose(focusIndex);return;}focusOption(e.key==='Home'?0:e.key==='End'?items.length-1:(focusIndex+(e.key==='ArrowUp'?items.length-1:1))%items.length);}if(e.key==='Tab')close();});
   document.addEventListener('click',function(e){if(!dropdown.contains(e.target))close();});
  });
  var tabs = Array.from(document.querySelectorAll('[data-settings-tab]'));
  function selectSettings(tab) {
   tabs.forEach(function(item) { var active=item===tab; item.setAttribute('aria-selected',String(active)); item.tabIndex=active?0:-1; document.getElementById(item.getAttribute('aria-controls')).hidden=!active; });
  }
  tabs.forEach(function(tab,index) {
   tab.addEventListener('click',function(){ selectSettings(tab); });
   tab.addEventListener('keydown',function(e) {
    var next = ['ArrowDown','ArrowRight'].includes(e.key)?(index+1)%tabs.length:['ArrowUp','ArrowLeft'].includes(e.key)?(index+tabs.length-1)%tabs.length:e.key==='Home'?0:e.key==='End'?tabs.length-1:null;
    if(next!==null){ e.preventDefault(); selectSettings(tabs[next]); tabs[next].focus(); }
   });
  });
  var settings=document.getElementById('settings-form');
  if(settings){
   var originalLists=Array.from(settings.querySelectorAll('[data-demo-dynlist]')).map(function(list){return {list:list,items:Array.from(list.querySelectorAll('.item')).map(function(item){return item.cloneNode(true);})};});
   var status=settings.querySelector('[data-save-status]');
   settings.addEventListener('input',function(){ status.textContent='有未保存的更改'; });
   settings.addEventListener('submit',function(e){ e.preventDefault(); status.textContent='更改已保存'; toast('设置已保存'); });
   settings.addEventListener('reset',function(){ originalLists.forEach(function(record){record.list.querySelectorAll('.item').forEach(function(item){item.remove();});record.items.forEach(function(item){record.list.insertBefore(item.cloneNode(true),record.list.querySelector('.add-item'));});}); status.textContent='已恢复初始值'; setTimeout(syncThemeSwitch,0); });
  }
  function syncThemeSwitch(){ document.querySelectorAll('[data-theme-switch]').forEach(function(input){input.checked=document.documentElement.dataset.darkmode==='true';}); }
  syncThemeSwitch();
  document.querySelectorAll('[data-theme-switch]').forEach(function(input){ input.addEventListener('change',function(){ document.getElementById('mono-appearance').click(); syncThemeSwitch(); }); });
  document.getElementById('mono-appearance')?.addEventListener('click',function(){setTimeout(syncThemeSwitch,0);});
  document.querySelectorAll('[data-demo-dynlist]').forEach(function(list){
   list.addEventListener('click',function(event){
    if(event.target.closest('.mono-list-remove')) { event.target.closest('.item').remove(); settings?.dispatchEvent(new Event('input')); }
    if(event.target.closest('[data-list-add]')) {
     var input=list.querySelector('input'); var value=input.value.trim(); if(!value){ input.focus(); return; }
     var item=E('div',{class:'item'},[E('span',{},value),E('button',{type:'button',class:'mono-list-remove','aria-label':'移除 '+value},'×')]);
     list.insertBefore(item,list.querySelector('.add-item')); input.value=''; input.focus(); settings?.dispatchEvent(new Event('input'));
    }
   });
   list.querySelector('input').addEventListener('keydown',function(e){ if(e.key==='Enter'){e.preventDefault();list.querySelector('[data-list-add]').click();} });
  });
  document.querySelectorAll('[data-demo-tabs]').forEach(function(list){
   list.setAttribute('role','tablist');
   var links=Array.from(list.querySelectorAll('a'));
   function activate(link){
    links.forEach(function(item){var active=item===link;item.parentElement.classList.toggle('cbi-tab',active);item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;});
    document.querySelector(link.getAttribute('href')).textContent=link.dataset.tabCopy;
   }
   links.forEach(function(link,index){
    link.setAttribute('role','tab');link.setAttribute('aria-selected',String(index===0));link.tabIndex=index===0?0:-1;
    link.addEventListener('click',function(e){e.preventDefault();activate(link);});
    link.addEventListener('keydown',function(e){if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();var next=links[(index+(e.key==='ArrowRight'?1:links.length-1))%links.length];activate(next);next.focus();}});
   });
  });
  var table=document.querySelector('.mono-interface-table');
  function filterInterfaces(){
   if(!table)return;
   var query=document.getElementById('interface-search').value.trim().toLowerCase(), state=document.getElementById('interface-filter').value, count=0;
   table.querySelectorAll('tbody tr').forEach(function(row){row.hidden=!(row.textContent.toLowerCase().includes(query)&&(state==='all'||state===row.dataset.state)); if(!row.hidden)count++;});
   document.querySelector('[data-interface-count]').textContent='显示 '+count+' / '+table.querySelectorAll('tbody tr').length+' 个接口';
   document.querySelector('.mono-no-results').hidden=count>0;
   document.querySelector('.mono-list-footer > span:last-child').textContent=table.querySelectorAll('tbody tr[data-state="up"]').length+' 个接口已连接';
  }
  function editInterface(row){
   var name=row?.dataset.interface||'', address=row?.querySelector('[data-interface-address]').textContent||'', protocol=row?.querySelector('[data-interface-protocol]').textContent||'静态地址';
   var nameInput=E('input',{id:'edit-name',name:'name',type:'text',value:name,required:'',placeholder:'例如：LAN'});
   var select=E('select',{id:'edit-protocol',name:'protocol'},['静态地址','DHCP 客户端','DHCPv6 客户端'].map(function(text){return E('option',{selected:text===protocol?'':null},text);}));
   var body=E('div',{},[
    field('接口名称',nameInput),field('协议',select),field('IP 地址',E('input',{id:'edit-address',name:'address',type:'text',value:address,required:'',placeholder:'192.168.1.1/24'})),
    E('label',{class:'mono-switch-row',for:'edit-enabled'},[E('span',{},[E('strong',{},'启用接口'),E('small',{},'控制接口的连接状态。')]),E('input',{id:'edit-enabled',name:'enabled',type:'checkbox',class:'mono-switch',checked:(!row||row.dataset.state==='up')?'':null})])
   ]);
   dialog(row?'编辑 '+name:'添加接口','配置接口信息与连接方式。',body,function(form){
    var nextName=form.elements.name.value.trim().toUpperCase();
    if(!nextName){nameInput.focus();return false;}
    var duplicate=Array.from(table.querySelectorAll('tbody tr')).some(function(item){return item!==row&&item.dataset.interface===nextName;});
    if(duplicate){nameInput.setCustomValidity('接口名称已存在');nameInput.reportValidity();nameInput.addEventListener('input',function(){nameInput.setCustomValidity('');},{once:true});return false;}
    if(!row){
     row=E('tr',{class:'tr'},[
      E('td',{class:'td'},E('div',{class:'mono-name-cell'},[E('span',{class:'mono-table-symbol blue'},icon('network')),E('div',{},[E('strong',{'data-interface-name':''}),E('small',{},'自定义接口')])])),
      E('td',{class:'td'},[E('span',{'data-interface-protocol':''}),E('small',{class:'mono-table-secondary'},'—')]),
      E('td',{class:'td mono-address','data-interface-address':''}),E('td',{class:'td'},E('span',{'data-interface-status':''})),
      E('td',{class:'td right'},E('button',{type:'button',class:'mono-icon-button','data-interface-edit':''},icon('edit')))
     ]);table.querySelector('tbody').append(row);
    }
    var enabled=form.elements.enabled.checked; row.dataset.interface=nextName; row.dataset.state=enabled?'up':'down';
    row.querySelector('[data-interface-name]').textContent=nextName; row.querySelector('[data-interface-protocol]').textContent=form.elements.protocol.value; row.querySelector('[data-interface-address]').textContent=form.elements.address.value.trim();
    var tag=row.querySelector('[data-interface-status]');tag.textContent=enabled?'已连接':'未连接';tag.className='mono-tag '+(enabled?'success':'error');row.querySelector('[data-interface-edit]').setAttribute('aria-label','编辑 '+nextName);
    row.querySelector('.mono-table-symbol').classList.toggle('blue',enabled);filterInterfaces();toast('接口已更新');
   });
  }
  if(table){
   document.getElementById('interface-search').addEventListener('input',filterInterfaces);document.getElementById('interface-filter').addEventListener('change',filterInterfaces);
   table.addEventListener('click',function(event){if(event.target.closest('[data-interface-edit]'))editInterface(event.target.closest('tr'));});
   document.querySelector('[data-interface-add]').addEventListener('click',function(){editInterface(null);});
  }
  document.addEventListener('click',function(event){
   var link=event.target.closest('a');if(link&&link.pathname.startsWith('/cgi-bin/luci/admin/services/')){event.preventDefault();dialog('插件页面','打开对应的 LuCI 插件。',E('p',{},'插件尚未加载。'));}
   var button=event.target.closest('[data-demo-action]');if(!button)return;
   var action=button.dataset.demoAction;
   if(action==='sync'){document.getElementById('localtime').value=new Date().toLocaleString('zh-CN');toast('时钟已同步');}
   else if(action==='dialog'||action==='edit'){dialog('保存当前设置','检查并确认本次更改。',E('div',{class:'alert-message'},'确认保存当前设置。'),function(){toast('设置已保存');});}
   else if(action==='remove'){dialog('删除这条记录？','删除后，这条记录将从列表中移除。',E('p',{},'请确认要删除此记录。'),function(){toast('操作已完成');});}
   else toast('操作已完成');
  });
  document.querySelectorAll('[data-demo-hide]').forEach(function(button){button.addEventListener('click',function(){var block=button.closest('.cbi-section').lastElementChild;block.hidden=!block.hidden;button.textContent=block.hidden?'显示':'隐藏';});});
 });
}());
