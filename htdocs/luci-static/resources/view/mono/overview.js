'use strict';
'require view';
'require rpc';
'require poll';
'require mono.dashboard as dashboard';
'require mono.stats as stats';

var callBoard=rpc.declare({object:'system',method:'board',reject:true});
var callInfo=rpc.declare({object:'system',method:'info',reject:true});
var callInterfaces=rpc.declare({object:'network.interface',method:'dump',reject:true});
var callDevices=rpc.declare({object:'luci-rpc',method:'getNetworkDevices',reject:true});
var callLeases=rpc.declare({object:'luci-rpc',method:'getDHCPLeases',params:['family'],reject:true});

return view.extend({
 load:function(){return this.read().catch(function(error){return {initialError:error.message||String(error)};});},
 read:function(){return Promise.all([callBoard(),callInfo(),callInterfaces(),callDevices(),callLeases(4).catch(function(){return null;})]).then(function(data){return dashboard.normalize({board:data[0],info:data[1],interfaces:data[2],devices:data[3],leases:data[4]});});},
 render:function(data){
  var self=this, previous=null, pending=null;
  function refresh(){
   if(pending)return pending;
   pending=self.read().then(function(next){var time=Date.now();panel.update(next,stats.sample(previous,next,time));previous={device:next.device,rx:next.rx,tx:next.tx,time:time};}).catch(function(error){previous=null;panel.fail(error.message||String(error));}).finally(function(){pending=null;});
   return pending;
  }
  var panel=dashboard.create({snapshot:data.initialError?dashboard.normalize({}):data,onRefresh:refresh});
  if(data.initialError)panel.fail(data.initialError);
  else previous={device:data.device,rx:data.rx,tx:data.tx,time:Date.now()};
  poll.add(refresh,5);
  return panel.element;
 },
 handleSaveApply:null,handleSave:null,handleReset:null
});
