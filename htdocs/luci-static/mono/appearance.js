/* Apply a saved local preference before the first paint. No network requests. */
(function () {
 'use strict';
 try {
  document.documentElement.dataset.darkmode = localStorage.getItem('mono-appearance') === 'dark' ? 'true' : 'false';
 } catch (_) { /* Storage may be disabled; the default stays light. */ }
}());
