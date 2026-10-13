'use strict';
'require baseclass';

/* Shared by LuCI and the local preview. All dynamic strings are text nodes. */
var paths = {
 down:'M12 4v16m-6-6 6 6 6-6', up:'M12 20V4m-6 6 6-6 6 6',
 devices:'M3 4h13v11H3z M6 20h7 M9.5 15v5 M19 9h3v11h-3z',
 router:'M4 12h16v8H4z M7 12V5m10 7V5 M7 16h.01 M11 16h.01 M15 16h2',
 globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M3 12h18 M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18',
 refresh:'M20 7v5h-5 M4 17v-5h5 M6 7a7 7 0 0 1 12-1l2 6 M4 12l2 6a7 7 0 0 0 12-1',
 arrow:'M5 12h14m-5-5 5 5-5 5', search:'M16 16l4 4 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
 laptop:'M5 4h14v12H5z M2 20h20l-3-4H5z', phone:'M7 2h10v20H7z M10 18h4',
 box:'M4 5h16v14H4z M8 9h8 M8 13h3', clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 7v5l3 2',
 chevron:'m9 5 7 7-7 7', cpu:'M6 6h12v12H6z M9 9h6v6H9z M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4'
};
function svg(tag, attrs, children) {
 var node=document.createElementNS('http://www.w3.org/2000/svg',tag);
 Object.keys(attrs||{}).forEach(function(key){node.setAttribute(key,attrs[key]);});
 (children||[]).forEach(function(child){node.append(child);}); return node;
}
function icon(name) { return svg('svg',{viewBox:'0 0 24 24',class:'ae-icon','aria-hidden':'true'},[svg('path',{d:paths[name]||paths.box})]); }
function node(tag,cls,children,attrs) {
 var element=E(tag,Object.assign({class:cls||''},attrs||{}),[]);
 function append(value) {if(Array.isArray(value))value.forEach(append);else if(value!=null)element.append(value instanceof Node?value:document.createTextNode(String(value)));}
 append(children);return element;
}
function text(value) {return value==null?'—':String(value);}
function number(value) {return Number.isFinite(Number(value))?Number(value):0;}
function bytes(value) { if(value==null)return '—'; var n=number(value); return n>=1073741824?(n/1073741824).toFixed(1)+' GiB':(n/1048576).toFixed(0)+' MiB'; }
function uptime(value) {if(value==null)return '—'; var n=number(value);return Math.floor(n/86400)+' 天 '+Math.floor(n%86400/3600)+' 小时';}
function rate(value) {return value==null?'—':number(value).toFixed(value>=100?1:2);}
function button(label,attrs,children) {return node('button','btn',children||label,Object.assign({type:'button'},attrs||{}));}
function link(label,path,cls) {return node('a',cls||'btn small',[label,icon('arrow')],{href:'/cgi-bin/luci/admin/'+path});}
function badge(label,good) {return node('span','ae-badge '+(good?'good':'neutral'),[node('i','ae-dot'),label]);}
function heading(title,extra) {return node('div','ae-card-head',[node('h3','',title),extra]);}
function field(label,value) {return node('div','ae-detail-row',[node('span','',label),node('strong','',text(value))]);}
function pct(value,max) {return max>0?Math.max(0,Math.min(100,Math.round(value/max*100))):0;}

function normalize(raw) {
 var info=raw.info||{}, board=raw.board||{}, interfaces=raw.interfaces&&raw.interfaces.interface||[];
 var wan=interfaces.find(function(i){return i.up&&(i.route||[]).some(function(r){return (r.target==='0.0.0.0'||r.target==='::')&&r.mask===0;});})||interfaces.find(function(i){return /^wan/.test(i.interface);});
 var dev=wan&&(wan.l3_device||wan.device), stats=raw.devices&&raw.devices[dev]&&raw.devices[dev].stats||{};
 var mem=info.memory||{}, total=number(mem.total), available=mem.available!=null?number(mem.available):number(mem.free)+number(mem.buffered)+number(mem.cached);
 return { board:board, info:info, interfaces:interfaces.filter(function(i){return i.interface!=='loopback';}),
  wan:wan||null, device:dev, rx:stats.rx_bytes, tx:stats.tx_bytes,
  memoryTotal:total, memoryUsed:Math.max(0,total-available),
  leases:raw.leases==null?null:(raw.leases.dhcp_leases||[]).filter(function(l){return l.expires===false||l.expires===0||l.expires>0;}),
  leasesError:raw.leases==null
 };
}

function create(options) {
 var snapshot=options.snapshot, history=(options.history||[]).slice(), range=300, metric='both', query='', page=0;
 var metricNodes={}, lastFocus, chartInteraction, chartWidth=700, chartFrame=0;
 var error=node('div','alert-message error',null,{hidden:'',role:'alert'});
 var refresh=button('刷新状态',{'aria-label':'刷新状态'},[icon('refresh'),node('span','','刷新状态')]);
 var main=node('div','ae-dashboard');
 var headingRow=node('div','ae-page-head',[
  node('div','',[node('div','ae-title-line',[node('h1','','网络概览')]),node('p','','查看网络活动、接口状态与已连接的设备。')]),
  node('div','ae-page-actions',[node('span','ae-update','每 5 秒更新'),refresh])
 ]);
 var metricStrip=node('div','ae-metrics');
 [['download','实时下载','down','blue'],['upload','实时上传','up','green'],['leases','DHCP 租约','devices','purple']].forEach(function(config){
  var value=node('strong','ae-metric-value','—'), caption=node('span','ae-metric-caption',''); metricNodes[config[0]]={value:value,caption:caption};
  var tile=node('button','ae-metric '+config[3],[node('span','ae-metric-icon',icon(config[2])),node('span','ae-metric-label',config[1]),node('div','ae-metric-reading',[value,node('span','ae-unit',config[0]==='leases'?'台':'Mbps')]),caption],{type:'button'});
  metricNodes[config[0]].tile=tile;
  if(config[0]!=='leases')tile.setAttribute('aria-pressed','false');
  tile.addEventListener('click',function(){if(config[0]==='leases'){clients.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});search.control.focus({preventScroll:true});}else{metric=metric===config[0]?'both':config[0];legendControl.setValue(metric);drawChart();}});
  metricStrip.append(tile);
 });
 var rangeSelect=window.MonoControls.select({label:'流量时间范围',size:'sm',minPopupWidth:180,value:300,items:[{value:60,label:'最近 1 分钟'},{value:300,label:'最近 5 分钟'},{value:900,label:'最近 15 分钟'}],onChange:function(value){range=value;drawChart();}}).element;
 var graph=node('div','ae-chart');
 var legendControl=window.MonoControls.segment({label:'流量方向',size:'sm',value:metric,items:[{value:'both',label:'全部'},{value:'download',label:'下载',icon:node('i','mono-segment-dot')},{value:'upload',label:'上传',icon:node('i','mono-segment-dot upload')}],onChange:function(value){metric=value;drawChart();}});
 var legend=legendControl.element;
 var chartNote=node('span','ae-chart-note','');
 var traffic=node('section','ae-card ae-traffic',[heading('流量趋势',rangeSelect),node('div','ae-chart-toolbar',[chartNote,legend]),graph]);
 var resourcesBody=node('div','ae-resource-body');
 var resource=node('section','ae-card ae-resource',[heading('内存使用',node('span','ae-icon-muted',icon('cpu'))),resourcesBody]);
 var ifacesBody=node('div','ae-ifaces-body');
 var ifaceCard=node('section','ae-card ae-interfaces',[heading('网络接口',node('a','btn small','管理',{href:'/cgi-bin/luci/admin/network/network'})),ifacesBody]);
 var tableBody=node('tbody'), leaseCount=node('span','ae-count',''), leaseSummary=node('span','','');
 var search=window.MonoUI.search({label:'搜索设备或 IP',placeholder:'搜索设备或 IP…',size:'sm',onChange:function(value){query=value.trim().toLocaleLowerCase();page=0;drawLeases();}});
 var pageLabel=node('span','',''),prevPage=button('上一页',{'aria-label':'上一页'},icon('chevron')),nextPage=button('下一页',{'aria-label':'下一页'},icon('chevron'));
 prevPage.addEventListener('click',function(){page--;drawLeases();});nextPage.addEventListener('click',function(){page++;drawLeases();});
 var pager=node('div','ae-pager',[prevPage,pageLabel,nextPage]);
 var clients=node('section','ae-card ae-clients',[
  heading(node('span','ae-heading-count',['DHCP 设备',leaseCount]),search.element),
  node('div','ae-table-scroll',[node('table','ae-table',[node('thead','',[node('tr','',['设备名称','IP 地址','租约状态',''].map(function(label){return node('th','',label,{scope:'col'});}))]),tableBody])]),
  node('div','ae-table-foot',[node('div','',[leaseSummary,node('span','ae-lease-hint','有效租约不代表设备在线')]),pager])
 ]);
 var systemBody=node('div','ae-system-body');
 var system=node('section','ae-card ae-system',[heading('设备信息',link('系统设置','system/system')),systemBody]);
 main.append(headingRow,error,metricStrip,node('div','ae-top-grid',[traffic,node('div','ae-right-stack',[resource,ifaceCard])]),node('div','ae-bottom-grid',[clients,system]));
 var dialog=node('dialog','ae-dialog',null,{'aria-labelledby':'ae-device-title'});
 main.append(dialog);
 function showLease(lease) {
  lastFocus=document.activeElement;
  var close=button('关闭'); close.addEventListener('click',function(){dialog.close();});
  dialog.replaceChildren(node('h3','',lease.hostname||'未命名设备',{id:'ae-device-title'}),field('IPv4 地址',lease.ipaddr),field('MAC 地址',lease.macaddr),field('租约剩余',lease.expires?Math.ceil(lease.expires/60)+' 分钟':'永久'),node('div','ae-dialog-actions',close));
  dialog.showModal();close.focus();
 }
 dialog.addEventListener('close',function(){if(lastFocus&&lastFocus.isConnected)lastFocus.focus();});
 function drawLeases() {
  var leases=snapshot.leases||[], filtered=leases.filter(function(l){return [l.hostname,l.ipaddr,l.macaddr].join(' ').toLocaleLowerCase().includes(query);});
  leaseCount.textContent=snapshot.leasesError?'—':leases.length; tableBody.replaceChildren();
  page=Math.max(0,Math.min(page,Math.max(0,Math.ceil(filtered.length/5)-1)));
  filtered.slice(page*5,page*5+5).forEach(function(lease){
   var name=lease.hostname||'未命名设备', glyph=/phone|iphone|pixel/i.test(name)?'phone':/mac|laptop|book/i.test(name)?'laptop':'box';
   var detail=button('详情',{'aria-label':'查看 '+name+' 的详情'},icon('chevron'));detail.addEventListener('click',function(){showLease(lease);});
   tableBody.append(node('tr','',[
    node('td','',node('div','ae-device-cell',[node('span','ae-device-icon',icon(glyph)),node('div','',[node('strong','',name),node('small','',lease.macaddr||'—')])])),
    node('td','ae-ip',text(lease.ipaddr)),node('td','',badge(lease.expires?'有效':'永久',true)),node('td','ae-row-action',detail)
   ]));
  });
  if(!filtered.length)tableBody.append(node('tr','',node('td','ae-empty',snapshot.leasesError?'无法读取 DHCP 租约，请检查 rpcd 服务。':query?'没有匹配的设备，试试其他名称或 IP。':'当前没有 IPv4 DHCP 租约。',{colspan:'4'})));
  leaseSummary.textContent='显示 '+(filtered.length?page*5+1:0)+'–'+Math.min(page*5+5,filtered.length)+' / '+filtered.length+' 台设备';
  prevPage.disabled=page===0;nextPage.disabled=(page+1)*5>=filtered.length;pageLabel.textContent=(page+1)+' / '+Math.max(1,Math.ceil(filtered.length/5));
 }
 function drawChart() {
  var previousIndex=chartInteraction?chartInteraction.getIndex():-1;
  if(chartInteraction)chartInteraction.destroy();
  ['download','upload'].forEach(function(key){metricNodes[key].tile.setAttribute('aria-pressed',String(metric===key));});
  var end=history.length?history[history.length-1].time:Date.now(), start=end-range*1000;
  var samples=history.filter(function(p){return p.time>=start;}), usable=samples.filter(function(p){return p.down!=null&&p.up!=null;});
  var max=Math.max(1,...usable.map(function(p){return metric==='download'?p.down:metric==='upload'?p.up:Math.max(p.down,p.up);}));
  max=Math.ceil(max/(max>100?50:max>10?10:1))*(max>100?50:max>10?10:1);
  var chart=svg('svg',{viewBox:'0 0 '+chartWidth+' 230',role:'img','aria-label':'WAN 流量图，单位 Mbps，'+(usable.length?'最近 '+range/60+' 分钟':'等待第二次采样')});
  var W=chartWidth-48,H=184,X=40,Y=12;
  for(var i=0;i<5;i++) {var yy=Y+H*i/4;chart.append(svg('line',{x1:X,y1:yy,x2:X+W,y2:yy,class:'ae-grid-line'}));var label=svg('text',{x:32,y:yy+4,'text-anchor':'end',class:'ae-axis'});label.textContent=+(max*(1-i/4)).toFixed(1);chart.append(label);}
  var ticks=Math.max(2,Math.min(5,Math.floor(W/78)));
  for(var j=0;j<=ticks;j++){var t=start+range*1000*j/ticks, date=new Date(t), tick=svg('text',{x:X+W*j/ticks,y:222,'text-anchor':j===0?'start':j===ticks?'end':'middle',class:'ae-axis'});tick.textContent=date.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});chart.append(tick);}
  ['down','up'].forEach(function(key){
   if(metric==='download'&&key==='up'||metric==='upload'&&key==='down')return;
   var segments=[], current=[];
   samples.forEach(function(p){if(p[key]==null){if(current.length)segments.push(current);current=[];}else current.push(p);});if(current.length)segments.push(current);
   segments.forEach(function(segment){
    var points=segment.map(function(p){return [(X+(p.time-start)/(range*1000)*W).toFixed(2),(Y+H-(p[key]/max)*H).toFixed(2)];});
    if(points.length<2)return;
    var d=points.map(function(p,k){return (k?'L':'M')+p.join(',');}).join(' ');
    if(key==='down')chart.append(svg('path',{d:d+' L'+points[points.length-1][0]+','+(Y+H)+' L'+points[0][0]+','+(Y+H)+' Z',class:'ae-chart-area'}));
    chart.append(svg('path',{d:d,class:'ae-chart-line '+key}));
   });
  });
  graph.replaceChildren(chart);
  var chartPoints=samples.map(function(p){return {x:X+(p.time-start)/(range*1000)*W,label:new Date(p.time).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),rows:['down','up'].filter(function(key){return p[key]!=null&&!(metric==='download'&&key==='up'||metric==='upload'&&key==='down');}).map(function(key){return {name:key==='down'?'下载':'上传',color:key==='down'?'var(--mono-primary)':'var(--chart-2)',value:rate(p[key])+' Mbps',y:Y+H-p[key]/max*H};})};}).filter(function(point){return point.rows.length;});
  chartInteraction=window.MonoUI.chartInteraction({element:graph,canvas:chart,points:chartPoints,bounds:{left:X,right:X+W,top:Y,bottom:Y+H},label:'WAN 流量趋势'});
  if(previousIndex>=0)chartInteraction.show(Math.min(previousIndex,chartPoints.length-1));
  if(usable.length<2)graph.append(node('div','ae-chart-empty','正在采集流量，约 5 秒后显示趋势。'));
  chartNote.textContent=(snapshot.device||'WAN')+' · Mbps';
 }
 function update(next,sample) {
  snapshot=next;
  if(sample){history.push(sample);history=history.filter(function(p){return p.time>=sample.time-900000;}).slice(-181);}
  var recent=history.length?history[history.length-1]:{};
  metricNodes.download.value.textContent=rate(recent.down); metricNodes.upload.value.textContent=rate(recent.up);
  metricNodes.download.caption.textContent='接收 '+bytes(snapshot.rx); metricNodes.upload.caption.textContent='发送 '+bytes(snapshot.tx);
  metricNodes.leases.value.textContent=snapshot.leasesError?'—':snapshot.leases.length;metricNodes.leases.caption.textContent='IPv4 有效租约';
  var percent=pct(snapshot.memoryUsed,snapshot.memoryTotal);
  var ring=svg('svg',{viewBox:'0 0 100 100','aria-hidden':'true'},[svg('circle',{cx:50,cy:50,r:40,class:'ae-ring-track'}),svg('circle',{cx:50,cy:50,r:40,class:'ae-ring-value','stroke-dasharray':(percent*2.513)+' 251.3'})]);
  resourcesBody.replaceChildren(node('div','',[node('div','ae-memory-value',[node('strong','',snapshot.memoryTotal?percent:'—'),node('span','','%')]),node('p','','已使用 / 总内存'),node('span','ae-memory-detail',bytes(snapshot.memoryUsed)+' / '+bytes(snapshot.memoryTotal))]),node('div','ae-ring',[ring,node('span','',snapshot.memoryTotal?(100-percent)+'% 可用':'未知')]));
  ifacesBody.replaceChildren();
  snapshot.interfaces.slice(0,3).forEach(function(i){var addr=(i['ipv4-address']||[])[0]||(i['ipv6-address']||[])[0];ifacesBody.append(node('div','ae-interface-row',[node('span','ae-interface-icon '+(i.up?'active':''),icon(/^wan/.test(i.interface)?'globe':'router')),node('div','ae-interface-name',[node('strong','',i.interface.toUpperCase()),node('span','',addr?addr.address:'暂无地址')]),badge(i.up?'已连接':'未连接',i.up)]));});
  if(!snapshot.interfaces.length)ifacesBody.append(node('p','ae-empty','暂无可用接口。'));
  var load=snapshot.info.load&&snapshot.info.load.map(function(v){return (v/65535).toFixed(2);}).join(' / ');
  systemBody.replaceChildren(node('div','ae-router-model',[node('span','ae-hardware-icon',icon('router')),node('div','',[node('strong','',snapshot.board.model||'OpenWrt Router'),node('span','',snapshot.board.hostname||'—')])]),
   field('运行时间',uptime(snapshot.info.uptime)),field('平均负载',load),field('内核版本',snapshot.board.kernel),field('固件版本',snapshot.board.release&&snapshot.board.release.description));
  error.hidden=true;drawChart();drawLeases();
 }
 function fail(message) {error.textContent='状态更新失败：'+message+'。已保留上次数据，请点击刷新重试。';error.hidden=false;}
 refresh.addEventListener('click',function(){if(!options.onRefresh)return;refresh.disabled=true;refresh.setAttribute('aria-busy','true');Promise.resolve().then(options.onRefresh).catch(function(e){fail(e.message||String(e));}).finally(function(){refresh.disabled=false;refresh.removeAttribute('aria-busy');});});
 var chartObserver=new ResizeObserver(function(entries){var width=entries[0].contentRect.width;if(width>0&&Math.abs(width-chartWidth)>.5){chartWidth=width;cancelAnimationFrame(chartFrame);chartFrame=requestAnimationFrame(drawChart);}});
 chartObserver.observe(graph);
 update(snapshot);return {element:main,update:update,fail:fail,destroy:function(){chartObserver.disconnect();cancelAnimationFrame(chartFrame);chartInteraction?.destroy();main.remove();}};
}
return baseclass.extend({create:create,normalize:normalize});
