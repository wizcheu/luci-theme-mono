'use strict';
'require view';
'require rpc';
'require poll';
'require mono.dashboard as dashboard';

/* Preview-only view: retain Aeris's anonymized RPC data and demonstrate its
 * illustrative traffic curve. This file is never part of the theme package. */
var board=rpc.declare({object:'system',method:'board',reject:true});
var info=rpc.declare({object:'system',method:'info',reject:true});
var interfaces=rpc.declare({object:'network.interface',method:'dump',reject:true});
var devices=rpc.declare({object:'luci-rpc',method:'getNetworkDevices',reject:true});
var leases=rpc.declare({object:'luci-rpc',method:'getDHCPLeases',params:['family'],reject:true});

function history() {
 var end=Date.now();
 return Array.from({length:181},function(_,i){
  return {time:end-(180-i)*5000,
   down:Math.max(8,92+46*Math.sin(i*.12)+18*Math.cos(i*.41)+11*Math.sin(i*1.91)),
   up:Math.max(2,12+7*Math.sin(i*.1+1)+3*Math.cos(i*.31))};
 });
}

return view.extend({
 load:function(){return this.read();},
 read:function(){return Promise.all([board(),info(),interfaces(),devices(),leases(4)]).then(function(data){
  return dashboard.normalize({board:data[0],info:data[1],interfaces:data[2],devices:data[3],leases:data[4]});
 });},
 render:function(data){
  var self=this,pending=null;
  function refresh(){
   if(pending)return pending;
   pending=self.read().then(function(next){var t=Date.now();panel.update(next,{time:t,down:115+30*Math.sin(t/11000),up:18+6*Math.sin(t/18000)});})
    .catch(function(error){panel.fail(error.message||String(error));}).finally(function(){pending=null;});
   return pending;
  }
  var panel=dashboard.create({snapshot:data,history:history(),onRefresh:refresh});
  panel.element.querySelector('.ae-update').textContent='示例流量 · 每 5 秒更新';
  poll.add(refresh,5);
  return panel.element;
 },
 handleSaveApply:null,handleSave:null,handleReset:null
});
