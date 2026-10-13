/* Mono controls. Dependency-free, shared by LuCI views and the local preview. */
(function () {
 'use strict';
 var nextId=0, activeDropdown=null;
 function node(tag,attributes,children) {
  var element=document.createElement(tag);
  Object.entries(attributes||{}).forEach(function(entry){if(entry[1]!=null)element.setAttribute(entry[0],entry[1]);});
  (Array.isArray(children)?children:[children]).forEach(function(child){if(child!=null)element.append(child instanceof Node?child:document.createTextNode(String(child)));});
  return element;
 }
 function glyph(path) {
  var svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),p=document.createElementNS(svg.namespaceURI,'path');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','mono-control-icon');svg.setAttribute('aria-hidden','true');p.setAttribute('d',path);svg.append(p);return svg;
 }
 function normalized(items){return (items||[]).map(function(item){return typeof item==='string'?{value:item,label:item}:Object.assign({},item);});}
 function className(base,options){return base+' '+base+'--'+(['xs','sm','md','lg'].includes(options.size)?options.size:'md')+(options.block?' '+base+'--block':'');}
 function closeAll(){if(activeDropdown)activeDropdown.close();}

 /** Single or multiple selection, roving keyboard focus, disabled options. */
 function createSegment(options) {
  options=options||{};
  var items=normalized(options.items),multiple=options.multiple===true,disabled=!!options.disabled;
  var initial=options.value!==undefined?options.value:multiple?[]:items.find(function(item){return !item.disabled;})?.value;
  var value=multiple?(Array.isArray(initial)?initial.slice():[]):initial;
  var element=node('div',{class:className('mono-segment',options),role:multiple?'group':'radiogroup','aria-label':options.label||'选项'});
  var buttons=items.map(function(item,index){
   var button=node('button',{type:'button',class:'mono-segment-item',role:multiple?null:'radio'},[item.icon||null,node('span',{},item.label)]);
   button.addEventListener('click',function(){select(index);});
   button.addEventListener('keydown',function(event){
    var available=items.map(function(item,i){return !disabled&&!item.disabled?i:-1;}).filter(function(i){return i>=0;});
    if(!available.length)return;
    var direction=getComputedStyle(element).direction==='rtl'?-1:1;
    var step=event.key==='ArrowRight'?direction:event.key==='ArrowLeft'?-direction:event.key==='ArrowDown'?1:event.key==='ArrowUp'?-1:0;
    var current=available.indexOf(index),next=event.key==='Home'?available[0]:event.key==='End'?available[available.length-1]:step?available[(current+step+available.length)%available.length]:null;
    if(next!==null){event.preventDefault();buttons[next].focus();if(!multiple)select(next);else buttons.forEach(function(b,i){b.tabIndex=i===next?0:-1;});}
   });return button;
  });
  function selected(item){return multiple?value.includes(item.value):value===item.value;}
  function update(){
   var focus=items.findIndex(function(item){return !disabled&&!item.disabled&&selected(item);});
   if(focus<0)focus=items.findIndex(function(item){return !disabled&&!item.disabled;});
   buttons.forEach(function(button,index){button.disabled=disabled||!!items[index].disabled;button.setAttribute(multiple?'aria-pressed':'aria-checked',String(selected(items[index])));button.tabIndex=index===focus?0:-1;});
   element.setAttribute('aria-disabled',String(disabled));
  }
  function getValue(){return multiple?value.slice():value;}
  function setValue(next,settings){
   if(multiple){if(!Array.isArray(next)||next.some(function(v){return !items.some(function(item){return item.value===v;});}))return false;value=Array.from(new Set(next));}
   else {if(!items.some(function(item){return item.value===next;}))return false;value=next;}
   update();if(settings?.emit)options.onChange?.(getValue());return true;
  }
  function select(index){var item=items[index];if(disabled||item.disabled)return;if(multiple)setValue(selected(item)?value.filter(function(v){return v!==item.value;}):value.concat(item.value),{emit:true});else if(value!==item.value)setValue(item.value,{emit:true});}
  element.append(...buttons);update();
  return {element:element,getValue:getValue,setValue:setValue,setDisabled:function(next){disabled=!!next;update();},destroy:function(){element.remove();}};
 }

 /** Filled combobox with a floating listbox. Escape closes only the open list. */
 function createSelect(options) {
  options=options||{};
  var items=normalized(options.items),value=options.value,disabled=!!options.disabled,popup=null,optionNodes=[],focusIndex=0,searchText='',lastTyped=0,observer=null;
  var id=options.id||'mono-select-'+(++nextId);
  var caption=node('span',{class:'mono-select-caption'}),trigger=node('button',{id:id,type:'button',class:'mono-select-trigger',role:'combobox','aria-label':options.label||'选择选项','aria-haspopup':'listbox','aria-expanded':'false','aria-controls':id+'-options'},[caption,glyph('m6 9 6 6 6-6')]);
  var element=node('div',{class:className('mono-select',options)},trigger);
  function selectedIndex(){return items.findIndex(function(item){return item.value===value;});}
  function available(){return items.map(function(item,i){return item.disabled?-1:i;}).filter(function(i){return i>=0;});}
  function update(){var selected=items[selectedIndex()];caption.textContent=selected?selected.label:options.placeholder||'请选择';trigger.disabled=disabled;trigger.setAttribute('aria-disabled',String(disabled));}
  function outside(event){if(!element.contains(event.target)&&!popup?.contains(event.target))close();}
  function onScroll(event){if(!popup?.contains(event.target))close();}
  function close(){
   if(!popup)return;
   popup.remove();popup=null;trigger.setAttribute('aria-expanded','false');trigger.removeAttribute('aria-activedescendant');
   document.removeEventListener('pointerdown',outside);document.removeEventListener('scroll',onScroll,true);window.removeEventListener('resize',close);observer?.disconnect();observer=null;
   if(activeDropdown?.element===element)activeDropdown=null;
  }
  function focus(index){
   focusIndex=index;optionNodes.forEach(function(option,i){option.classList.toggle('is-focused',i===index);});
   trigger.setAttribute('aria-activedescendant',id+'-option-'+index);
   var option=optionNodes[index];if(option&&popup){if(option.offsetTop<popup.scrollTop)popup.scrollTop=option.offsetTop;else if(option.offsetTop+option.offsetHeight>popup.scrollTop+popup.clientHeight)popup.scrollTop=option.offsetTop+option.offsetHeight-popup.clientHeight;}
  }
  function setValue(next,settings){if(!settings?.allowMissing&&!items.some(function(item){return item.value===next;}))return false;value=next;close();update();if(settings?.emit)options.onChange?.(value);return true;}
  function choose(index){if(items[index].disabled)return;var next=items[index].value;close();trigger.focus();setValue(next,{emit:next!==value});}
  function open(){
   options.onOpen?.();
   if(disabled||!items.length)return;
   if(popup)return;
   closeAll();activeDropdown={element:element,close:close};
   popup=node('div',{class:'mono-select-popup',id:id+'-options',role:'listbox','aria-label':options.label||'选择选项'});
   optionNodes=items.map(function(item,index){
    var option=node('div',{id:id+'-option-'+index,role:'option','aria-selected':String(item.value===value),'aria-disabled':String(!!item.disabled),class:'mono-select-option'},[node('span',{title:item.label},item.label),item.value===value?glyph('m5 12 4 4L19 6'):null]);
    option.addEventListener('click',function(){choose(index);});return option;
   });
   popup.append(...optionNodes);(trigger.closest('dialog')||document.body).append(popup);
   var rect=trigger.getBoundingClientRect(),below=innerHeight-rect.bottom-12,above=rect.top-12,up=below<200&&above>below,maxHeight=Math.max(40,Math.min(280,up?above:below));
   var contentWidth=Math.max(...optionNodes.map(function(option){return option.firstElementChild.scrollWidth+68;}));
   var popupWidth=Math.min(innerWidth-24,Math.max(rect.width,Number(options.minPopupWidth)||0,contentWidth));
   Object.assign(popup.style,{left:Math.max(12,Math.min(rect.left,innerWidth-popupWidth-12))+'px',width:popupWidth+'px',maxHeight:maxHeight+'px',top:up?'auto':rect.bottom+6+'px',bottom:up?innerHeight-rect.top+6+'px':'auto'});
   trigger.setAttribute('aria-expanded','true');var enabled=available();focus(enabled.includes(selectedIndex())?selectedIndex():enabled[0]??0);
   document.addEventListener('pointerdown',outside);document.addEventListener('scroll',onScroll,true);window.addEventListener('resize',close);
   observer=new MutationObserver(function(){if(!trigger.isConnected)close();});observer.observe(document.body,{childList:true,subtree:true});
  }
  trigger.addEventListener('click',function(){if(popup)close();else open();});
  trigger.addEventListener('keydown',function(event){
   var enabled=available();
   if(event.key==='Tab'){close();return;}
   if(['ArrowDown','ArrowUp','Home','End','Enter',' ','Escape'].includes(event.key)){
    if(event.key==='Escape'&&!popup)return;event.preventDefault();event.stopPropagation();if(event.key==='Escape'){close();return;}if(!popup){open();return;}if(!enabled.length)return;
    if(event.key==='Enter'||event.key===' '){choose(focusIndex);return;}
    var current=enabled.indexOf(focusIndex);focus(event.key==='Home'?enabled[0]:event.key==='End'?enabled[enabled.length-1]:enabled[(current+(event.key==='ArrowUp'?-1:1)+enabled.length)%enabled.length]);
   }else if(event.key.length===1&&!event.metaKey&&!event.ctrlKey&&!event.altKey){
    event.preventDefault();var now=Date.now();searchText=(now-lastTyped<650?searchText:'')+event.key.toLocaleLowerCase();lastTyped=now;if(!popup)open();var match=enabled.find(function(i){return String(items[i].label).toLocaleLowerCase().startsWith(searchText);});if(match!==undefined)focus(match);
   }
  });
  update();return {element:element,getValue:function(){return value;},setValue:setValue,setItems:function(next){close();items=normalized(next);update();},setDisabled:function(next){disabled=!!next;if(disabled)close();update();},open:open,close:close,destroy:function(){close();element.remove();}};
 }
 window.MonoControls=Object.freeze({segment:createSegment,select:createSelect,closeAll:closeAll});
}());
