/* Shared behaviour for both pages: menu, language list, disabled links, type filter,
   and small reveals on the portal. Nothing here moves by itself. */
(function () {
  'use strict';
  var d = document;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || d).querySelectorAll(s)); };

  /* ---- menu (narrow widths) ---- */
  var btn = $('.menu-toggle'), menu = $('#menu'), lang = $('.lang');
  var sbtn = $('.search-toggle'), sform = $('.runhead .search');
  function setMenu(open) {
    if (!btn || !menu) return;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) menu.setAttribute('data-open', ''); else menu.removeAttribute('data-open');
  }
  /* below 600 px the search field opens from a button; wider, it is always in the head */
  function setSearch(open) {
    if (!sbtn || !sform) return;
    sbtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) sform.setAttribute('data-open', ''); else sform.removeAttribute('data-open');
  }
  if (btn && menu) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      setMenu(open);
      if (open) setSearch(false);
    });
    $$('.nav a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  }
  if (sbtn && sform) {
    sbtn.addEventListener('click', function () {
      var open = sbtn.getAttribute('aria-expanded') !== 'true';
      setSearch(open);
      if (open) { setMenu(false); var i = $('input', sform); if (i) i.focus(); }
    });
  }

  /* ---- Escape closes whatever is open ---- */
  d.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (lang && lang.open) { lang.open = false; var s = $('summary', lang); if (s) s.focus(); return; }
    if (sbtn && sbtn.getAttribute('aria-expanded') === 'true') { setSearch(false); if (getComputedStyle(sbtn).display !== 'none') sbtn.focus(); return; }
    if (btn && btn.getAttribute('aria-expanded') === 'true') { setMenu(false); btn.focus(); }
  });
  d.addEventListener('click', function (e) {
    if (lang && lang.open && !lang.contains(e.target)) lang.open = false;
    var off = e.target.closest && e.target.closest('a[aria-disabled="true"]');
    if (off) e.preventDefault();
  });
  /* a link to #language opens the list */
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href="#language"]');
    if (!a || !lang) return;
    e.preventDefault();
    if (btn && getComputedStyle(btn).display !== 'none') setMenu(true);
    lang.open = true;
    var s = $('summary', lang); if (s) s.focus();
  });

  /* ---- type filter on the portal (progressive: hidden until script runs) ---- */
  var filter = $('[data-filter]');
  if (filter) {
    filter.hidden = false;
    var groups = $$('[data-type]');
    var buttons = $$('button', filter);
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.getAttribute('data-show');
        buttons.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        groups.forEach(function (g) { g.hidden = !(t === 'all' || g.getAttribute('data-type') === t); });
      });
    });
  }

  /* ---- small reveals (portal only, skipped for reduced motion) ---- */
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    var els = $$('[data-reveal]');
    if (els.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px' });
      els.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top > innerHeight * 0.92) { el.classList.add('rv'); io.observe(el); }
      });
      /* a block still waiting is not clickable; focus reaching it shows it at once */
      d.addEventListener('focusin', function (e) {
        var b = e.target.closest && e.target.closest('.rv');
        if (b) b.classList.add('is-in');
      });
    }
  }
})();
