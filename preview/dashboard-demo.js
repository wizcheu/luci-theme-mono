/* Fictional, local-only fixture. Production renderer is reused verbatim. */
(function(){
 'use strict';
 var raw={
  board:{hostname:'OpenWrt',model:'Redmi AX6000',kernel:'6.6.104',release:{description:'OpenWrt 24.10.5'}},
  info:{uptime:12*86400+8*3600,load:[5243,7864,3932],memory:{total:536870912,available:338228674}},
  interfaces:{interface:[
   {interface:'wan',up:true,l3_device:'eth1',proto:'dhcp','ipv4-address':[{address:'192.0.2.16',mask:24}],route:[{target:'0.0.0.0',mask:0}]},
   {interface:'lan',up:true,l3_device:'br-lan',proto:'static','ipv4-address':[{address:'192.168.1.1',mask:24}]},
   {interface:'wan6',up:true,l3_device:'eth1',proto:'dhcpv6','ipv6-address':[{address:'2001:db8::16',mask:64}]}
  ]},
  devices:{eth1:{stats:{rx_bytes:26306674688,tx_bytes:5261334937}}},
  leases:{dhcp_leases:[
   ['MacBook-Pro','192.168.1.102','DA:28:6C:01:2A:B1'],['iPhone-16','192.168.1.106','D2:6F:91:0C:43:8E'],['Living-Room-TV','192.168.1.108','E6:73:A2:52:0B:19'],['Synology-NAS','192.168.1.110','C2:11:32:EA:96:F4'],['iPad-Air','192.168.1.112','F2:79:05:43:DA:C8'],['Office-PC','192.168.1.115','D2:79:05:43:DA:C9'],['Pixel-9','192.168.1.120','D2:79:05:43:DA:CA'],['AirPlay-Speaker','192.168.1.121','D2:79:05:43:DA:CB'],['Home-Assistant','192.168.1.130','D2:79:05:43:DA:CC'],['Printer','192.168.1.135','D2:79:05:43:DA:CD'],['Kindle','192.168.1.136','D2:79:05:43:DA:CE'],['Guest-Phone','192.168.1.142','D2:79:05:43:DA:CF']
  ].map(function(a,i){return {hostname:a[0],ipaddr:a[1],macaddr:a[2],expires:43000-i*2300};})}
 };
 function module(name){return fetch('/luci-static/resources/mono/'+name+'.js').then(function(r){if(!r.ok)throw Error('无法读取页面组件');return r.text();}).then(function(source){return new Function('E','baseclass',source)(E,{extend:function(object){return object;}});});}
 module('dashboard').then(function(dashboard){
  var history=[],end=Date.now();
  for(var i=0;i<=180;i++){var down=92+46*Math.sin(i*.12)+18*Math.cos(i*.41)+11*Math.sin(i*1.91);history.push({time:end-(180-i)*5000,down:Math.max(8,down),up:Math.max(2,12+7*Math.sin(i*.1+1)+3*Math.cos(i*.31))});}
  history[180].down=128.64;history[180].up=18.32;
  var state=new URLSearchParams(location.search).get('state');
  if(state==='empty')raw.leases.dhcp_leases=[];
  if(state==='loading')history=[];
  var panel=dashboard.create({snapshot:dashboard.normalize(raw),history:history,preview:true,onRefresh:refresh});
  document.getElementById('mono-preview-dashboard').replaceChildren(panel.element);
  if(state==='error')panel.fail('无法连接到设备');
  function refresh(){return new Promise(function(resolve){setTimeout(function(){var t=Date.now(),down=115+30*Math.sin(t/11000),up=18+6*Math.sin(t/18000);raw.devices.eth1.stats.rx_bytes+=down*625000;raw.devices.eth1.stats.tx_bytes+=up*625000;panel.update(dashboard.normalize(raw),{time:t,down:down,up:up});resolve();},350);});}
  // Keep the initial composition stable; manual refresh changes example samples.
  var indicator=panel.element.querySelector('.ae-update');indicator.textContent='刚刚更新';
 }).catch(function(error){document.getElementById('mono-preview-dashboard').textContent='页面加载失败：'+error.message;});
}());
