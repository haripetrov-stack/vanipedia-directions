/* portal.js: the only effect on the main page is a small fade-up as a section arrives, once.
   Anything already in view when the page opens is shown at once, and with reduced motion
   (or without this script) nothing is ever hidden. */
(function () {
  'use strict';
  var els = Array.prototype.slice.call(document.querySelectorAll('[data-rv]'));
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!els.length || reduce || !('IntersectionObserver' in window)) return;

  var vh = innerHeight;
  els.forEach(function (el) {
    if (el.getBoundingClientRect().top < vh * 0.92) el.classList.add('in');
  });
  document.documentElement.classList.add('rv-on');

  addEventListener('focusin', function (e) {
    var t = e.target && e.target.closest && e.target.closest('[data-rv]');
    if (t) t.classList.add('in');
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
  els.forEach(function (el) { if (!el.classList.contains('in')) io.observe(el); });
})();
