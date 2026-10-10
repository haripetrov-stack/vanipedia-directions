/* v5 common: header menu, language panel, Escape closes anything that opened.
   No framework, no timers, nothing here moves by itself. */
(function () {
  'use strict';
  var d = document;
  var btn = d.querySelector('.mast__menu');
  var list = d.querySelector('.mast__list');
  var lang = d.querySelector('.lang');

  function setMenu(open) {
    if (!btn || !list) return;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    list.classList.toggle('is-open', open);
  }
  if (btn && list) {
    btn.addEventListener('click', function () { setMenu(btn.getAttribute('aria-expanded') !== 'true'); });
  }
  d.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (btn && btn.getAttribute('aria-expanded') === 'true') { setMenu(false); btn.focus(); }
    if (lang && lang.open) { lang.open = false; var s = lang.querySelector('summary'); if (s) s.focus(); }
  });
  d.addEventListener('click', function (e) {
    if (lang && lang.open && !lang.contains(e.target)) lang.open = false;
  });
  d.addEventListener('focusin', function (e) {
    if (lang && lang.open && !lang.contains(e.target)) lang.open = false;
  });

  /* small reveals for the portal page: one fade and a short rise, once, only when the reader scrolls to it.
     Static for reduced motion; visible without JavaScript. */
  var items = d.querySelectorAll('[data-v5-in]');
  if (items.length && 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var pending = [];
    items.forEach(function (el) {                      // what is already on screen at load stays still: nothing moves by itself
      if (el.getBoundingClientRect().top < innerHeight * 0.92) el.classList.add('is-in'); else pending.push(el);
    });
    d.documentElement.classList.add('v5-reveal');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    pending.forEach(function (el) { io.observe(el); });
    // keyboard focus inside a block that has not been revealed yet: reveal it now
    d.addEventListener('focusin', function (e) {
      var host = e.target.closest && e.target.closest('[data-v5-in]');
      if (host) host.classList.add('is-in');
    });
  }
})();
