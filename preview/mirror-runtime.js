/* Development-only. This file never enters the theme package. */
(() => {
  function start() {
    if(document.querySelector('.mirror-status'))return;
    const bar=document.createElement('aside');
    bar.className='mirror-status';
    bar.setAttribute('aria-label','本地真实页面预览');
    bar.innerHTML='<span class="mirror-status-dot"></span><strong>Mono 预览</strong><span>示例数据 · 本地模拟</span>';
    const components=document.createElement('a');components.href='/cgi-bin/luci/admin/status/components';components.textContent='组件规范';bar.append(components);
    // Let the production theme invalidate stale caches before extending its menu.
    // Otherwise this callback can repaint an old tree over the upgraded menu.
    if(window.L)Promise.all([L.require('menu-mono'),L.require('ui')]).then(([menu,ui])=>ui.menu.load().then(tree=>{
      const status=tree.children?.admin?.children?.status;
      if(status && !status.children.components){
        status.children.components={title:'组件规范',order:99,satisfied:true,action:{type:'view',path:'preview/components'}};
        ui.menu.flushCache();
        menu.render(tree);
      }
    }));
    const reset=document.createElement('button');reset.type='button';reset.textContent='重置示例';
    reset.addEventListener('click',async()=>{await fetch('/__mirror/reset',{method:'POST'});location.reload();});bar.append(reset);
    document.body.append(bar);
    function notice(message) {
      let toast=document.querySelector('.mirror-notice');
      if(!toast){toast=document.createElement('div');toast.className='mirror-notice';toast.setAttribute('role','status');document.body.append(toast);}
      toast.textContent=message;clearTimeout(notice.timer);notice.timer=setTimeout(()=>toast.remove(),5000);
    }
    const openWindow=window.open.bind(window);
    window.open=(url,...args)=>{
      if(url && new URL(url,location.href).origin!==location.origin){notice('外部面板未连接；当前是本地离线预览。');return null;}
      return openWindow(url,...args);
    };
    function isolateFrames() {
      document.querySelectorAll('iframe').forEach(frame=>{
        if(frame.src && new URL(frame.src,location.href).origin!==location.origin)frame.src='/__mirror/terminal';
      });
    }
    isolateFrames();new MutationObserver(isolateFrames).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
    // Prevent legacy forms and embedded dashboards from escaping the local fixture server.
    document.addEventListener('submit',event=>{
      if(!(event.target instanceof HTMLFormElement))return;
      if(event.target.closest('.mirror-status'))return;
      if(new URL(event.target.action || location.href).origin!==location.origin){event.preventDefault();notice('本地预览不连接外部服务。');return;}
      if(document.body.dataset.page?.startsWith('admin-services-openclash')){
        event.preventDefault();fetch('/__mirror/action',{method:'POST'});notice('已在本页模拟保存。路由器配置未更改。');
      }
    },true);
    document.addEventListener('click',event=>{
      const link=event.target.closest('a[href]');
      if(link && /^https?:/.test(link.href) && new URL(link.href).origin!==location.origin){event.preventDefault();notice('这是离线页面副本；外部面板和在线服务未连接。');}
    },true);
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();
})();
