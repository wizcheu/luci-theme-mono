/* Examples consume exactly the same controls as the dashboard and router forms. */
(function(){
 'use strict';
 const E=window.E,controls=window.MonoControls;
 function example(title,element,description){return E('div',{class:'mono-control-example'},[E('span',{class:'mono-control-label'},title),element,description||null]);}
 const status=E('p',{class:'mono-control-result',role:'status'},'当前筛选：全部');
 const segment=controls.segment({label:'营销渠道',value:'all',items:[{value:'all',label:'全部'},{value:'campaign',label:'广告活动'},{value:'email',label:'邮件'}],onChange:value=>status.textContent='当前筛选：'+({all:'全部',campaign:'广告活动',email:'邮件'})[value]});
 const multiple=controls.segment({label:'数据方向',multiple:true,value:['download','upload'],size:'sm',items:[{value:'download',label:'下载'},{value:'upload',label:'上传'},{value:'errors',label:'错误',disabled:true}]});
 document.getElementById('segment-examples').append(example('单选 · 标准尺寸',segment.element,status),example('多选 · 小号 / 禁用项',multiple.element));
 const selectStatus=E('p',{class:'mono-control-result',role:'status'},'当前周期：每月');
 const period=controls.select({label:'统计周期',value:'monthly',items:[{value:'daily',label:'每天'},{value:'weekly',label:'每周'},{value:'monthly',label:'每月'},{value:'yearly',label:'每年',disabled:true}],onChange:value=>selectStatus.textContent='当前周期：'+({daily:'每天',weekly:'每周',monthly:'每月'})[value]});
 const disabled=controls.select({label:'不可用的下拉框',value:'auto',size:'sm',disabled:true,items:[{value:'auto',label:'自动分配'}]});
 document.getElementById('select-examples').append(example('筛选栏',E('div',{class:'mono-control-inline'},[E('span',{class:'mono-muted'},'显示方式'),period.element]),selectStatus),example('禁用 · 小号',disabled.element));
}());
