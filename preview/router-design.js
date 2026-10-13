/* Design prototype only. Uses synthetic fixtures; never calls router RPC or UCI. */
(function () {
 'use strict';
 const root = document.querySelector('[data-router-page]');
 if (!root) return;
 const E = window.E;
 const paths = {
  settings:'M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v5l3 2',
  logs:'M5 3h14v18H5zM8 7h8M8 11h8M8 15h5',
  language:'M4 5h12M10 3v2M6 5c1 6 4 9 8 11M14 5c-1 6-4 9-10 11m10 4 4-10 4 10m-6-4h4',
  network:'M8 3h8v6H8zM2 16h7v5H2zM15 16h7v5h-7zM12 9v4M5.5 16v-3h13v3',
  device:'M3 6h18v12H3zM7 10h.01M11 10h.01M7 14h10',
  globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18',
  shield:'M12 3 4 6v5c0 5 8 10 8 10s8-5 8-10V6z',
  edit:'m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15Z',
  plus:'M12 5v14M5 12h14', close:'M6 6l12 12M6 18 18 6', check:'m5 12 4 4L19 6',
  down:'m6 9 6 6 6-6', more:'M5 12h.01M12 12h.01M19 12h.01', search:'M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12m13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  receive:'M12 4v16m-6-6 6 6 6-6', send:'M12 20V4m-6 6 6-6 6 6'
 };
 function icon(name) {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  for (const [key,value] of Object.entries({class:'ae-icon',viewBox:'0 0 24 24','aria-hidden':'true'})) svg.setAttribute(key,value);
  if(name==='more'){[5,12,19].forEach(x=>{const c=document.createElementNS(svg.namespaceURI,'circle');c.setAttribute('cx',x);c.setAttribute('cy','12');c.setAttribute('r','1.5');c.setAttribute('fill','currentColor');c.setAttribute('stroke','none');svg.append(c);});return svg;}
  const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',paths[name]||paths.settings);svg.append(p);return svg;
 }
 function button(text, style, action, symbol) { const control=window.MonoUI.button({label:text,variant:style?.includes('primary')?'solid':style?.includes('danger')?'danger':style?.includes('plain')?'plain':'default',onClick:action,icon:symbol});if(style?.includes('rd-danger'))control.element.classList.add('rd-danger');return control.element; }
 function iconButton(name,label,action) { return E('button',{type:'button',class:'mono-icon-button','aria-label':label,click:action},icon(name)); }
 let toastTimer;
 function toast(message) { document.querySelector('.mono-toast')?.remove(); clearTimeout(toastTimer);const note=E('div',{class:'mono-toast',role:'status'},[icon('check'),message]);document.body.append(note);toastTimer=setTimeout(()=>note.remove(),3500); }
 const clone = value => JSON.parse(JSON.stringify(value));
 const choice = values => values.map(v=>typeof v==='string'?{value:v,label:v}:v);
 const f = (key,label,type='text',options,extra={}) => ({key,label,type,options:options?choice(options):undefined,...extra});
 let serial=0;
 function picker(id,label,options,value,onChange){
  return window.MonoControls.select({id:id,label:label,items:options,value:value,placeholder:'默认',block:true,onChange:onChange}).element;
 }
 function field(spec,values,changed) {
  const id='router-field-'+(++serial), key=spec.key;
  const wrapper=E('div',{class:'rd-field'+(spec.wide||['list','textarea','multi'].includes(spec.type)?' rd-wide':'')});
  function update(value) { values[key]=value; changed?.(); }
  function help() {
   if(!spec.help)return null;
   return spec.help.length>110 ? E('details',{class:'rd-help-detail'},[E('summary',{},'参数说明'),E('p',{},spec.help)]) : E('p',{class:'rd-help'},spec.help);
  }
  if(spec.type==='checkbox') {
   const input=E('input',{id,type:'checkbox',class:'mono-switch',checked:values[key]?'':null,change:e=>update(e.target.checked)});
   wrapper.classList.add('rd-flag');wrapper.append(E('label',{for:id},[E('span',{},spec.label),input]),help()||E('span'));
   return wrapper;
  }
  wrapper.append(E('label',{for:id},spec.label));
  if(spec.type==='list') {
   if(!Array.isArray(values[key]))values[key]=values[key]?[values[key]]:[];
   const list=E('div',{class:'rd-list'});
   function redraw(){
    list.replaceChildren(...values[key].map((value,index)=>E('div',{class:'rd-list-item'},[E('span',{},value),iconButton('close','移除 '+value,()=>{values[key].splice(index,1);redraw();changed?.();})])));
   }
   const input=E('input',{id,type:'text',placeholder:spec.placeholder||'输入一个值'});
   function add(){const value=input.value.trim();if(!value){input.focus();return;}if(!values[key].includes(value)){values[key].push(value);redraw();changed?.();}input.value='';input.focus();}
   input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();add();}});
   wrapper.append(list,E('div',{class:'rd-list-add'},[input,button('添加','',add,'plus')]));redraw();
  } else if(spec.type==='multi') {
   if(!Array.isArray(values[key]))values[key]=[];
   wrapper.append(E('div',{class:'rd-multi',id},(spec.options||[]).map(option=>E('label',{class:'rd-multi-option'},[E('input',{type:'checkbox',checked:values[key].includes(option.value)?'':null,change:e=>update(e.target.checked?[...values[key],option.value]:values[key].filter(v=>v!==option.value))}),option.label]))));
  } else if(['select','dropdown'].includes(spec.type) && spec.options?.length) {
   wrapper.append(picker(id,spec.label,spec.options,values[key],update));
  } else {
   const input=E(spec.type==='textarea'?'textarea':'input',{id,type:spec.type==='password'?'password':'text',value:spec.type==='textarea'?null:values[key]??'',rows:spec.type==='textarea'?3:null,placeholder:spec.placeholder||'默认',readonly:spec.readonly?'':null,input:e=>update(e.target.value)});
   if(spec.type==='textarea')input.value=values[key]||'';
   if(spec.type==='password'){
    const toggle=iconButton('eye','显示密码',()=>{const shown=input.type==='password';input.type=shown?'text':'password';toggle.setAttribute('aria-label',shown?'隐藏密码':'显示密码');});
    wrapper.append(E('div',{class:'rd-password'},[input,toggle]));
   }else wrapper.append(input);
  }
  if(spec.help)wrapper.append(help());
  return wrapper;
 }
 function grid(fields,values,changed){return E('div',{class:'rd-grid'},fields.map(spec=>field(spec,values,changed)));}
 function section(title,description,body){return E('section',{class:'rd-section'},[E('div',{class:'rd-section-heading'},[E('h3',{},title),description?E('p',{},description):null]),body]);}
 function tabs(items,selected,onSelect,vertical=false,label='设置分类',variant='underline') {
  const nav=E('div',{class:vertical?'rd-side-nav au-tab-list au-tab-list-vertical':'rd-tabs au-tab-list au-tab-list-'+variant,role:'tablist','aria-label':label,'aria-orientation':vertical&&window.matchMedia('(min-width:901px)').matches?'vertical':'horizontal'});
  const buttons=items.map((item,index)=>E('button',{type:'button',role:'tab','aria-selected':String(item.key===selected),tabindex:item.key===selected?'0':'-1',click:()=>selectTab(item.key,false),keydown:event=>{
   const step=['ArrowRight','ArrowDown'].includes(event.key)?1:['ArrowLeft','ArrowUp'].includes(event.key)?-1:0;
   let next=event.key==='Home'?0:event.key==='End'?items.length-1:step?(index+step+items.length)%items.length:null;
   if(next!==null){event.preventDefault();selectTab(items[next].key,true);}
  }},[item.icon?icon(item.icon):null,item.title,item.count!==undefined?E('span',{class:'rd-count'},item.count):null]));
  function selectTab(key,keyboard){
   const scroll=nav.scrollLeft;onSelect(key);
   requestAnimationFrame(()=>{const nextNav=Array.from((document.querySelector('dialog[open]')||root).querySelectorAll('[role="tablist"]')).find(n=>n.getAttribute('aria-label')===label);if(!nextNav)return;nextNav.scrollLeft=scroll;const active=Array.from(nextNav.children).find(b=>b.dataset.tabKey===key);if(keyboard)active?.focus({preventScroll:true});active?.scrollIntoView({block:'nearest',inline:'nearest'});});
  }
  buttons.forEach((b,i)=>b.dataset.tabKey=items[i].key);nav.append(...buttons);return nav;
 }
 function heading(title,description){return E('div',{class:'rd-page-heading'},[E('div',{},[E('h2',{},title),E('p',{},description)])]);}
 function footer(onSave,onReset) {
  const split=E('div',{class:'rd-apply'},[
   button('保存并应用','primary',()=>{onSave();bar.setState(false,'更改已应用');toast('更改已更新');}),
   E('details',{class:'rd-action-menu'},[E('summary',{'aria-label':'更多应用选项'},icon('down')),E('div',{class:'rd-menu'},[button('应用并保留回滚保护','plain',()=>{onSave();bar.setState(false,'更改已应用');toast('已应用，并保留回滚保护');split.querySelector('details').open=false;})])])
  ]);
  const bar=window.MonoUI.saveBar({actions:[button('重置','plain',onReset),button('保存','',()=>{onSave();bar.setState(false,'更改已保存');toast('设置已保存');}),split]});
  return {el:bar.element,dirty:()=>bar.setState(true)};
 }
 function modal(title,subtitle,body,onSave,wide=false) {
  const previous=document.activeElement;
  const box=E('dialog',{class:'rd-dialog'+(wide?' rd-dialog-wide':''),'aria-labelledby':'router-dialog-title'});
  const form=E('form',{class:'rd-dialog-form'});
  const close=()=>box.close();
  form.append(E('div',{class:'rd-dialog-heading'},[E('div',{},[E('h3',{id:'router-dialog-title'},title),E('p',{},subtitle)]),iconButton('close','关闭弹窗',close)]),E('div',{class:'rd-dialog-body'},body),E('div',{class:'rd-dialog-footer'},[button('取消','plain',close),E('button',{type:'submit',class:'btn primary'},'保存更改')]));
  form.addEventListener('submit',event=>{event.preventDefault();if(onSave?.()===false)return;close();});
  box.append(form);document.body.append(box);box.addEventListener('close',()=>{window.MonoControls.closeAll();box.remove();previous?.focus();});box.showModal();return box;
 }
 function systemPage(){
  const initial={hostname:'OpenWrt',description:'家庭网络网关',notes:'',zonename:'Asia/Shanghai',clock_timestyle:false,clock_hourcycle:'24',log_size:'128',log_ip:'',log_port:'514',log_proto:'UDP',log_file:'',conloglevel:'Debug',cronloglevel:'正常',enabled:true,enable_server:false,interface:'lan',_redirect:false,use_dhcp:true,server:['time.apple.com','time.google.com','time.windows.com','time.cloudflare.com'],_lang:'简体中文',_mediaurlbase:'Mono',_tablefilters:true};
  let values=clone(initial),saved=clone(initial),active='general';
  const categories=[{key:'general',title:'常规设置',icon:'settings'},{key:'logging',title:'日志',icon:'logs'},{key:'timesync',title:'时间同步',icon:'clock'},{key:'language',title:'语言和界面',icon:'language'}];
  function render(){
   const actions=footer(()=>saved=clone(values),()=>{values=clone(saved);render();toast('已恢复已保存的设置');});
   const content=E('div',{class:'rd-settings-content',role:'tabpanel','aria-label':categories.find(t=>t.key===active).title});
   if(active==='general'){
    const currentTime=E('time',{},'2026-10-12 20:46:00 CST');
    const clock=E('div',{class:'rd-clock'},[E('span',{class:'rd-clock-icon'},icon('clock')),E('div',{},[E('small',{},'本地时间'),currentTime]),E('div',{class:'rd-clock-actions'},[button('同步浏览器时间','',()=>{currentTime.textContent=new Date().toLocaleString('zh-CN',{hour12:false});toast('时钟已同步');}),button('同步 NTP','plain',()=>{currentTime.textContent=new Date().toLocaleString('zh-CN',{hour12:false});toast('NTP 时间已同步');})])]);
    content.append(section('系统属性','设置设备名称、描述与时间显示。',grid([f('hostname','主机名'),f('description','描述'),f('notes','备注','textarea',null,{placeholder:'添加设备用途或位置等备注'})],values,actions.dirty)),section('日期与时间','选择系统时区及时间格式。',E('div',{},[clock,grid([f('zonename','时区','select',['Asia/Shanghai','Asia/Singapore','Asia/Tokyo','Europe/London','America/New_York','UTC']),f('clock_hourcycle','小时周期','select',[{value:'default',label:'默认'},{value:'12',label:'12 小时'},{value:'24',label:'24 小时'}]),f('clock_timestyle','显示完整时区名称','checkbox',null,{wide:true,help:'在系统时钟中显示时区全称。'})],values,actions.dirty)])));
   }else if(active==='logging'){
    content.append(section('日志','设置日志缓冲区、远程服务器和输出级别。',grid([f('log_size','系统日志缓冲区大小（KiB）'),f('log_file','日志文件','text',null,{placeholder:'/tmp/system.log'}),f('log_ip','外部系统日志服务器','text',null,{placeholder:'0.0.0.0'}),f('log_port','外部系统日志服务器端口'),f('log_proto','外部系统日志服务器协议','select',['UDP','TCP']),f('conloglevel','日志记录级别','select',['Debug','Info','Notice','Warning','Error','Critical','Alert','Emergency']),f('cronloglevel','Cron 日志级别','select',['正常','禁用','Debug'])],values,actions.dirty)));
   }else if(active==='timesync'){
    const dependents=E('div');
    function drawDependents(){dependents.replaceChildren();if(!values.enabled)return;dependents.append(grid([f('enable_server','作为 NTP 服务器提供服务','checkbox'),f('use_dhcp','使用 DHCP 提供的 NTP 服务器','checkbox'),f('interface','绑定到接口','select',['lan','wan','wan6'],{help:'限制 NTP 服务器响应的接口。'}),f('_redirect','重定向 LAN 中的 NTP 请求','checkbox'),f('server','NTP 服务器候选列表','list',null,{placeholder:'例如：time.example.com'})],values,actions.dirty));}
    content.append(section('时间同步','通过 NTP 保持设备时钟准确。',E('div',{},[grid([f('enabled','启用 NTP 客户端','checkbox',null,{wide:true,help:'定期从网络时间服务器同步系统时间。'})],values,()=>{actions.dirty();drawDependents();}),dependents])));drawDependents();
   }else{
    content.append(section('语言和界面','选择管理界面的语言、主题与表格行为。',grid([f('_lang','语言','select',['自动','English','简体中文']),f('_mediaurlbase','主题','select',['Mono','OpenWrt','Bootstrap']),f('_tablefilters','启用表格筛选器','checkbox',null,{wide:true,help:'为支持的表格显示筛选控件。'})],values,actions.dirty)));
   }
   content.append(actions.el);
   root.replaceChildren(heading('系统设置','配置系统属性、日志、时间同步和管理界面。'),E('div',{class:'rd-settings-layout'},[tabs(categories,active,key=>{active=key;render();},false,'设置分类','underline'),content]));
   if(JSON.stringify(values)!==JSON.stringify(saved))actions.dirty();
  }
  root.classList.add('rd-system');render();
 }
 const protocolNames={static:'静态地址',pppoe:'PPPoE',dhcp:'DHCP 客户端',dhcpv6:'DHCPv6 客户端',none:'不配置协议',ppp:'PPP'};
 function networkPage(){
  const initial=[
   {name:'lan',device:'br-lan',proto:'static',up:true,uptime:'2 天 05 小时',ipv4:'192.168.1.1/24',ipv6:'fd42:8f21:3a10::1/64',rx:6243831296,tx:13075415040,packets:12500000,mac:'02:00:00:00:01:01'},
   {name:'wan',device:'pppoe-wan',proto:'pppoe',up:true,uptime:'2 天 05 小时',ipv4:'198.51.100.24/32',ipv6:'2001:db8:1::24/64',rx:12992276070,tx:2147483648,packets:21400000,mac:'02:00:00:00:01:02'},
   {name:'wan_6',device:'pppoe-wan',proto:'dhcpv6',up:true,uptime:'2 天 05 小时',ipv4:'',ipv6:'2001:db8:2::24/64',prefix:'2001:db8:1200::/56',rx:12992276070,tx:2147483648,packets:21400000,dynamic:true,mac:'02:00:00:00:01:02'},
   {name:'wan6',device:'wan',proto:'dhcpv6',up:false,uptime:'未连接',ipv4:'',ipv6:'',rx:0,tx:0,packets:0,mac:'02:00:00:00:01:02'}
  ];
  let interfaces=clone(initial),savedInterfaces=clone(initial),active='interfaces',query='',state='all',dirty=false;
  const deviceInitial=['br-lan','wan','eth0','lan2','lan3','lan4','pppoe-wan'].map((name,i)=>({name,type:i===0?'网桥设备':i===6?'隧道接口':'以太网适配器',mac:'02:00:00:00:01:0'+(i+1),mtu:i===6?'1492':'1500',configured:i===0}));
  let devices=clone(deviceInitial),savedDevices=clone(deviceInitial);
  let globals={ula_prefix:'fd42:8f21:3a10::/48',dhcp_default_duid:'000400000000000000000000000000000001',multipath:false,tcp_l3mdev:true,udp_l3mdev:true,packet_steering:'启用',steering_flows:'默认'};
  let savedGlobals=clone(globals),actionFooter;
  function changed(){dirty=true;actionFooter?.dirty();}
  function bytes(value){if(!value)return '0 B';const units=['B','KiB','MiB','GiB'];const index=Math.min(3,Math.floor(Math.log(value)/Math.log(1024)));return (value/1024**index).toFixed(index?1:0)+' '+units[index];}
  function abbreviate(value){return new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(value);}
  function save(){savedInterfaces=clone(interfaces);savedDevices=clone(devices);savedGlobals=clone(globals);dirty=false;}
  function editInterface(row){
   const draft=clone(row.form||{});
   const general=draft.general ||= {proto:row.proto,_net_device:row.name==='lan'?'br-lan':'wan',disabled:!row.up,auto:true,ipaddr:row.ipv4.split('/')[0],netmask:'255.255.255.0',gateway:'',ip6addr:row.ipv6?[row.ipv6]:[],username:'',password:'',ac:'',ac_mac:'',service:''};
   draft.advanced ||= {force_link:row.name==='lan',defaultroute:true,peerdns:true,delegate:true,dns:[],metric:'0',ip6assign:row.name==='lan'?'60':'',ppp_ipv6:'auto',reqprefix:'auto',mtu:row.proto==='pppoe'?'1492':''};
   draft.firewall ||= {_zone:row.name==='lan'?'lan':'wan'};
   draft['dhcp-general'] ||= {ignore:row.name!=='lan',dynamicdhcp:true,leasetime:'12h',force:false,dhcp_option:[],dhcp_option_force:[]};
   draft['dhcp-ipv4'] ||= {dhcpv4:'server',start:'100',limit:'150',netmask:''};
   draft['dhcp-ipv6'] ||= {ra:'server',dhcpv6:'server',dns_service:true,ndp:'disabled'};
   draft['dhcp-dhcpv6'] ||= {dhcpv6_pd:true,ntp:[]};
   draft['dhcp-ipv6-ra'] ||= {ra_slaac:true,ra_flags:['other-config'],_ra_pio_flags:['onlink','autonomous'],ra_maxinterval:'600',ra_mininterval:'200',ra_lifetime:'1800',ra_mtu:'1500',ra_hoplimit:'64'};
   let selected='general',dhcpTab='general';
   const body=E('div',{class:'rd-editor'});
   const categories=[{key:'general',title:'常规设置',icon:'settings'},{key:'advanced',title:'高级设置',icon:'network'},{key:'firewall',title:'防火墙',icon:'shield'},{key:'dhcp',title:'DHCP 服务器',icon:'device'}];
   function schema(){return window.MonoRouterSchema[general.proto==='pppoe'?'wan':'lan'];}
   function draw(){
    const content=E('div',{class:'rd-editor-content',role:'tabpanel'});
    if(selected==='dhcp'){
     const children=window.MonoRouterSchema.lan.filter(t=>t.parent==='dhcp');
     content.append(E('h4',{},'DHCP 服务器'),tabs(children,dhcpTab,key=>{dhcpTab=key;draw();},false,'DHCP 设置分类'),grid(children.find(t=>t.key===dhcpTab).fields,draft['dhcp-'+dhcpTab],()=>{}));
    }else{
     let specs=clone(schema().find(t=>!t.parent&&t.key===selected)?.fields||[]);
     if(selected==='general'&&!['static','pppoe','ppp'].includes(general.proto))specs=specs.filter(s=>['proto','_net_device','disabled','auto'].includes(s.key));
     content.append(E('h4',{},categories.find(t=>t.key===selected).title),grid(specs,draft[selected]||={},()=>{if(selected==='general'&&general.proto!==body.dataset.protocol){body.dataset.protocol=general.proto;draw();}}));
    }
    body.dataset.protocol=general.proto;
    body.replaceChildren(tabs(categories,selected,key=>{selected=key;draw();},true,'接口设置分类'),content);
   }
   draw();modal('接口 · '+row.name,row.device+' · MAC '+row.mac,body,()=>{
    row.form=draft;row.proto=general.proto;row.device=general._net_device;row.up=!general.disabled;
    if(row.proto==='static'){const prefix=(general.netmask||'255.255.255.0').split('.').reduce((n,v)=>n+(Number(v).toString(2).match(/1/g)||[]).length,0);row.ipv4=general.ipaddr?general.ipaddr+'/'+prefix:'';row.ipv6=general.ip6addr?.[0]||'';}
    changed();render();toast('接口 '+row.name+' 已更新');
   },true);
  }
  function addInterface(){
   const values={name:'',proto:'dhcp',device:'wan'};
   const body=grid([f('name','接口名称','text',null,{placeholder:'例如：guest'}),f('proto','协议','select',Object.entries(protocolNames).map(([value,label])=>({value,label}))),f('device','设备','select',devices.map(d=>d.name))],values,()=>{});
   modal('添加接口','创建一个新的逻辑网络接口。',body,()=>{
    const name=values.name.trim();const input=body.querySelector('input');
    if(!/^[a-zA-Z0-9_]+$/.test(name)||interfaces.some(r=>r.name===name)){input.setCustomValidity('请输入唯一的接口名，仅使用字母、数字和下划线。');input.reportValidity();input.addEventListener('input',()=>input.setCustomValidity(''),{once:true});return false;}
    interfaces.push({name,device:values.device,proto:values.proto,up:false,uptime:'未连接',ipv4:'',ipv6:'',rx:0,tx:0,packets:0,mac:'02:00:00:00:02:01'});changed();render();toast('接口已添加');
   });
  }
  function interfaceAction(row,action){
   if(action==='重启'){row.up=true;row.uptime='刚刚连接';changed();render();toast('已重启 '+row.name);return;}
   modal(action+'接口 '+row.name,action==='停止'?'此操作将断开接口连接。':'此操作将移除接口。',E('p',{class:'rd-muted'},'请确认要继续此操作。'),()=>{if(action==='停止'){row.up=false;row.uptime='未连接';}else interfaces=interfaces.filter(r=>r!==row);changed();render();toast('更改已更新');});
  }
  function editDevice(row){
   const draft=clone(row.form||{devgeneral:{type:row.type==='网桥设备'?'bridge':'',name_complex:row.name,'ifname_multi-bridge':['lan2','lan3','lan4'],mtu:row.mtu,macaddr:row.mac,ipv6:'1',mtu6:'1500',dadtransmits:'1',txqueuelen:'1000'},devadvanced:{priority:'32767',ageing_time:'300',stp:false,igmp_snooping:false},bridgevlan:{vlan_filtering:false}});
   let selected='devgeneral';const body=E('div',{class:'rd-editor'});
   const categories=window.MonoRouterSchema.device.filter(t=>row.type==='网桥设备'||t.key!=='bridgevlan').map(t=>({...t,icon:t.key==='devgeneral'?'device':'network'}));
   function draw(){
    const tab=categories.find(t=>t.key===selected);let specs=tab.fields;
    if(row.type!=='网桥设备')specs=specs.filter(s=>!['ifname_multi-bridge','bridge_empty','priority','ageing_time','stp','igmp_snooping','multicast_querier'].includes(s.key));
    const content=E('div',{class:'rd-editor-content'},[E('h4',{},tab.title),grid(specs,draft[selected]||={},()=>{})]);
    if(selected==='bridgevlan')content.append(E('div',{class:'alert-message'},'VLAN 过滤用于将网桥端口划分为独立广播域。'),vlanTable(draft));
    body.replaceChildren(tabs(categories,selected,key=>{selected=key;draw();},true,'设备设置分类'),content);
   }
   draw();modal('设备 · '+row.name,'配置设备属性与链路选项。',body,()=>{row.form=draft;row.mtu=draft.devgeneral.mtu;row.mac=draft.devgeneral.macaddr;row.configured=true;changed();render();toast('设备已更新');},true);
  }
  function vlanTable(draft){
   const rows=draft.vlans ||= [{id:'1',local:true,ports:['untagged','untagged','untagged']}];
   const wrapper=E('div',{class:'rd-vlan-editor'}),table=E('table',{class:'rd-table'});
   function draw(){table.replaceChildren(E('thead',{},E('tr',{},['VLAN ID','本地','lan2','lan3','lan4',''].map(t=>E('th',{},t)))),E('tbody',{},rows.map((row,index)=>E('tr',{},[E('td',{},E('input',{type:'text',value:row.id,'aria-label':'VLAN ID',input:e=>row.id=e.target.value})),E('td',{},E('input',{type:'checkbox',checked:row.local?'':null,'aria-label':'VLAN '+row.id+' 本地',change:e=>row.local=e.target.checked})),...row.ports.map((value,p)=>E('td',{},window.MonoControls.select({label:'VLAN '+row.id+' lan'+(p+2),size:'sm',value:value,items:['off','untagged','tagged'].map((v,i)=>({value:v,label:['关闭','未标记','已标记'][i]})),onChange:value=>row.ports[p]=value}).element)),E('td',{},iconButton('close','删除 VLAN '+row.id,()=>{rows.splice(index,1);draw();}))]))));}
   wrapper.append(E('div',{class:'rd-table-scroll'},table),button('添加 VLAN','',()=>{rows.push({id:String(rows.length+1),local:true,ports:['off','off','off']});draw();},'plus'));draw();return wrapper;
  }
  function addDevice(){const values={name:'',type:'网桥设备',mtu:'1500'};const body=grid([f('name','设备名称','text',null,{placeholder:'例如：br-guest'}),f('type','设备类型','select',['网桥设备','802.1q VLAN','MAC VLAN']),f('mtu','MTU')],values,()=>{});modal('添加设备','为接口创建一个网络设备。',body,()=>{if(!values.name.trim()||devices.some(d=>d.name===values.name.trim())){const input=body.querySelector('input');input.setCustomValidity('请输入唯一的设备名称');input.reportValidity();input.addEventListener('input',()=>input.setCustomValidity(''),{once:true});return false;}devices.push({...values,name:values.name.trim(),mac:'02:00:00:00:03:01',configured:true});changed();render();toast('设备已添加');});}
  function render(){
   actionFooter=footer(save,()=>{interfaces=clone(savedInterfaces);devices=clone(savedDevices);globals=clone(savedGlobals);dirty=false;render();toast('已恢复已保存的配置');});
   const card=E('section',{class:'rd-network-card'});
   const categories=[{key:'interfaces',title:'接口',icon:'network',count:interfaces.length},{key:'devices',title:'设备',icon:'device',count:devices.length},{key:'globals',title:'全局网络选项',icon:'globe'}];
   card.append(tabs(categories,active,key=>{active=key;query='';state='all';render();},false,'网络分类','underline'));
   if(active==='globals'){
    card.append(E('div',{class:'rd-global-form'},section('全局网络选项','配置 IPv6、协议栈与数据包处理方式。',grid([f('ula_prefix','IPv6 ULA 前缀'),f('dhcp_default_duid','DHCP 默认 DUID'),f('multipath','启用多路 TCP','checkbox'),f('tcp_l3mdev','TCP L3 主设备接受','checkbox'),f('udp_l3mdev','UDP L3 主设备接受','checkbox'),f('packet_steering','数据包转向','select',['禁用','启用','所有 CPU']),f('steering_flows','每 CPU 的 RPS 流表项','select',['默认','128','256','512','1024','2048'])],globals,changed))));
   }else{
    const isInterfaces=active==='interfaces';
    const count=E('span',{}),table=E('table',{class:'rd-table '+(isInterfaces?'rd-interface-table':'rd-device-table')});
    const search=window.MonoUI.search({value:query,placeholder:isInterfaces?'搜索接口名称、设备或 IP 地址':'搜索设备名称或 MAC 地址',label:isInterfaces?'搜索接口':'搜索设备',size:'md',onChange:value=>{query=value;drawRows();}}).element;
    const filter=window.MonoControls.select({label:'接口状态',items:[{value:'all',label:'全部状态'},{value:'up',label:'已连接'},{value:'down',label:'未连接'}],value:state,onChange:value=>{state=value;drawRows();}}).element;
    card.append(E('div',{class:'rd-list-heading'},[E('div',{},[E('h3',{},isInterfaces?'网络接口':'网络设备'),E('p',{},isInterfaces?'管理连接、地址与接口服务。':'管理物理端口、网桥与虚拟设备。')]),button(isInterfaces?'添加接口':'添加设备','primary',isInterfaces?addInterface:addDevice,'plus')]),E('div',{class:'rd-list-toolbar'},[E('div',{class:'rd-search'},search),isInterfaces?filter:null]));
    function drawRows(){
     const data=(isInterfaces?interfaces:devices).filter(row=>JSON.stringify(row).toLowerCase().includes(query.toLowerCase())&&(!isInterfaces||state==='all'||(row.up?'up':'down')===state));
     table.replaceChildren(E('thead',{},E('tr',{},(isInterfaces?['接口','连接状态','地址','流量','操作']:['设备','设备类型','MAC 地址','MTU','操作']).map(text=>E('th',{},text)))));
     const tbody=E('tbody');
     data.forEach(row=>{
      if(isInterfaces){
       const menu=E('details',{class:'rd-action-menu'},[E('summary',{'aria-label':row.name+' 更多操作'},icon('more')),E('div',{class:'rd-menu'},['重启','停止','删除'].map(action=>{const b=button(action,action==='删除'?'plain rd-danger':'plain',()=>interfaceAction(row,action));b.disabled=!!row.dynamic;return b;}))]);
       tbody.append(E('tr',{},[
        E('td',{},E('div',{class:'rd-identity'},[E('span',{class:'rd-device-icon'+(row.up?' active':'')},icon('network')),E('div',{},[E('strong',{},row.name),E('small',{},row.device+' · '+protocolNames[row.proto]),row.dynamic?E('small',{class:'rd-dynamic'},'动态接口'):null])])),
        E('td',{},[E('span',{class:'mono-tag '+(row.up?'success':'neutral')},[E('span',{class:'rd-status-dot'}),row.up?'已连接':'未连接']),E('small',{class:'rd-secondary'},row.uptime)]),
        E('td',{class:'rd-address'},[E('span',{},row.ipv4||'—'),E('small',{},row.ipv6||'无 IPv6 地址'),row.prefix?E('small',{},'PD · '+row.prefix):null]),
        E('td',{},[E('div',{class:'rd-traffic'},[icon('receive'),E('span',{},bytes(row.rx)),icon('send'),E('span',{},bytes(row.tx))]),E('small',{class:'rd-secondary',title:row.packets.toLocaleString()+' 个数据包'},abbreviate(row.packets)+' 个数据包')]),
        E('td',{},E('div',{class:'rd-row-actions'},[iconButton('edit','编辑 '+row.name,()=>editInterface(row)),menu]))
       ]));
      }else{
       tbody.append(E('tr',{},[E('td',{},E('div',{class:'rd-identity'},[E('span',{class:'rd-device-icon'},icon('device')),E('strong',{},row.name)])),E('td',{},row.type),E('td',{class:'rd-address'},row.mac),E('td',{},row.mtu),E('td',{},E('div',{class:'rd-row-actions'},[button('配置','',()=>editDevice(row)),row.configured?button('取消配置','plain',()=>modal('取消 '+row.name+' 的配置','移除此设备的自定义配置。',E('p',{},'设备本身将保留。'),()=>{row.configured=false;changed();render();toast('配置已移除');})):null]))]));
      }
     });
     if(!data.length)tbody.append(E('tr',{},E('td',{colspan:'5',class:'rd-empty'},'没有找到匹配的'+(isInterfaces?'接口':'设备'))));
     table.append(tbody);count.textContent='显示 '+data.length+' / '+(isInterfaces?interfaces:devices).length+' 个'+(isInterfaces?'接口':'设备');
    }
    drawRows();card.append(E('div',{class:'rd-table-scroll'},table),E('div',{class:'rd-list-footer'},[count,E('span',{},isInterfaces?interfaces.filter(r=>r.up).length+' 个接口已连接':devices.filter(r=>r.configured).length+' 个设备已配置')]));
   }
   root.replaceChildren(heading('接口','管理网络接口、设备和全局网络配置。'),card,actionFooter.el);if(dirty)actionFooter.dirty();
  }
  render();
 }
 document.addEventListener('toggle',event=>{const menu=event.target;if(!menu.matches?.('.rd-action-menu')||!menu.open)return;const popup=menu.querySelector('.rd-menu'),r=menu.querySelector('summary').getBoundingClientRect();Object.assign(popup.style,{position:'fixed',left:Math.max(12,r.right-popup.offsetWidth)+'px',right:'auto',bottom:'auto',top:Math.max(12,r.top-popup.offsetHeight-8)+'px'});},true);
 document.addEventListener('scroll',event=>{document.querySelectorAll('.rd-action-menu[open]').forEach(menu=>{if(!menu.contains(event.target))menu.open=false;});},true);
 document.addEventListener('click',event=>{document.querySelectorAll('.rd-action-menu[open]').forEach(menu=>{if(!menu.contains(event.target))menu.open=false;});});
 if(root.dataset.routerPage==='system')systemPage();else networkPage();
}());
