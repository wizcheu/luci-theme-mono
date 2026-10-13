'use strict';
'require baseclass';
/* Router counters are bytes. Timestamp is milliseconds; result is decimal Mbps. */
function sample(previous, current, time) {
 var valid=previous&&current.device&&current.device===previous.device&&current.wan&&current.wan.up&&time>previous.time&&
  Number.isFinite(current.rx)&&Number.isFinite(current.tx)&&Number.isFinite(previous.rx)&&Number.isFinite(previous.tx)&&current.rx>=previous.rx&&current.tx>=previous.tx;
 return {time:time,down:valid?(current.rx-previous.rx)*8/(time-previous.time)/1000:null,up:valid?(current.tx-previous.tx)*8/(time-previous.time)/1000:null};
}
return baseclass.extend({sample:sample});
