(function () {
 'use strict';
 function setup() {
  var sidebar = document.getElementById('mono-sidebar');
  var toggle = document.getElementById('mono-sidebar-toggle');
  var backdrop = document.getElementById('mono-backdrop');
  var appearance = document.getElementById('mono-appearance');
  var mobile = window.matchMedia('(max-width: 800px)');
  if (!sidebar || !toggle) return;
  var desktopCollapsed = false;
  try { desktopCollapsed = localStorage.getItem('mono-sidebar-collapsed') === 'true'; } catch (_) {}
  function setOpen(open) {
   document.body.classList.toggle('mono-sidebar-open', mobile.matches && open);
   document.body.classList.toggle('mono-sidebar-collapsed', !mobile.matches && !open);
   toggle.setAttribute('aria-expanded', String(open));
   sidebar.inert = !open;
   backdrop.hidden = !(mobile.matches && open);
  }
  function reset() { setOpen(mobile.matches ? false : !desktopCollapsed); }
  function close() { setOpen(false); toggle.focus(); }
  toggle.addEventListener('click', function () {
   var open = toggle.getAttribute('aria-expanded') !== 'true';
   setOpen(open);
   if (mobile.matches && open) sidebar.querySelector('a, button, input').focus();
   if (!mobile.matches) {
    desktopCollapsed = !open;
    try { localStorage.setItem('mono-sidebar-collapsed', String(!open)); } catch (_) {}
   }
  });
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', function (event) {
   if (!mobile.matches || toggle.getAttribute('aria-expanded') !== 'true') return;
   if (event.key === 'Escape') { event.preventDefault(); close(); }
   if (event.key === 'Tab') {
    var focusable = Array.from(sidebar.querySelectorAll('a[href], button, input, summary, [tabindex="0"]')).filter(function (el) { return el.getClientRects().length && !el.disabled; });
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
   }
  });
  mobile.addEventListener('change', reset);
  reset();
  if (appearance) {
   function syncAppearance() { appearance.setAttribute('aria-pressed', String(document.documentElement.dataset.darkmode === 'true')); }
   appearance.addEventListener('click', function () {
    var dark = document.documentElement.dataset.darkmode !== 'true';
    document.documentElement.dataset.darkmode = String(dark);
    try { localStorage.setItem('mono-appearance', dark ? 'dark' : 'light'); } catch (_) {}
    syncAppearance();
   });
   syncAppearance();
  }
 }
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
 else setup();
}());
