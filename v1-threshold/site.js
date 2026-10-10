/* site.js: header behaviour shared by both pages, and the quiet reveals on the portal.
   No framework. Escape closes everything that opens (menu, language, search, credits). */
(function () {
  'use strict';

  var bar = document.querySelector('.bar');
  var menuBtn = bar && bar.querySelector('.bar__btn--menu');
  var nav = bar && bar.querySelector('.bar__nav');
  var searchBtn = bar && bar.querySelector('.bar__btn--search');
  var search = bar && bar.querySelector('.bar__search');
  var langBtn = bar && bar.querySelector('.bar__lang > button');
  var langPanel = bar && bar.querySelector('.bar__lang-panel');

  // each popover: how to tell if it is open, open it, close it
  var pops = [];
  function add(btn, isOpen, open, close) { if (btn) pops.push({ btn: btn, isOpen: isOpen, open: open, close: close }); }

  add(menuBtn,
    function () { return nav.classList.contains('is-open'); },
    function () { nav.classList.add('is-open'); menuBtn.setAttribute('aria-expanded', 'true'); },
    function () { nav.classList.remove('is-open'); menuBtn.setAttribute('aria-expanded', 'false'); });
  add(searchBtn,
    function () { return search.classList.contains('is-open'); },
    function () { search.classList.add('is-open'); searchBtn.setAttribute('aria-expanded', 'true'); var i = search.querySelector('input[type="search"]'); if (i) i.focus(); },
    function () { search.classList.remove('is-open'); searchBtn.setAttribute('aria-expanded', 'false'); });
  add(langBtn,
    function () { return !langPanel.hidden; },
    function () { langPanel.hidden = false; langBtn.setAttribute('aria-expanded', 'true'); },
    function () { langPanel.hidden = true; langBtn.setAttribute('aria-expanded', 'false'); });

  function closeAll(except) { pops.forEach(function (p) { if (p !== except && p.isOpen()) p.close(); }); }

  pops.forEach(function (p) {
    p.btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (p.isOpen()) p.close(); else { closeAll(p); p.open(); }
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var closed = false;
    pops.forEach(function (p) {
      if (p.isOpen()) { p.close(); if (!closed) { p.btn.focus(); closed = true; } }
    });
    var d = document.querySelector('details[data-esc][open]');
    if (d && !closed) { d.removeAttribute('open'); var s = d.querySelector('summary'); if (s) s.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (bar && !bar.contains(e.target)) closeAll(null);
    else if (bar && e.target.closest && e.target.closest('.bar__nav a')) closeAll(null);
  });
  // tabbing out of an open panel closes it
  document.addEventListener('focusin', function (e) {
    if (bar && !bar.contains(e.target)) closeAll(null);
  });

  // links that are placeholders in this prototype do nothing
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[aria-disabled="true"]');
    if (a) e.preventDefault();
  });

  // ---- portal reveals: opacity and a short rise, once, only if motion is allowed
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var items = document.querySelectorAll('[data-reveal]');
  if (items.length && !reduce && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('reveal-on');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });
  }
})();
