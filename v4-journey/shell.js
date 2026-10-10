/* Shared by both pages: the Menu button on narrow screens, the Language and
   credits disclosures, and Escape closing whatever is open. No motion. */
(function () {
  'use strict';
  var doc = document;
  var btn = doc.querySelector('.menu-btn');
  var panel = doc.getElementById('panel');
  var lang = doc.querySelector('.lang');
  var credits = doc.getElementById('credits');
  var creditsBtn = credits && credits.querySelector('.credits__btn');
  var creditsPanel = credits && credits.querySelector('.credits__panel');
  var narrow = matchMedia('(max-width: 1240px)');

  function setMenu(open) {
    if (!btn || !panel) return;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.classList.toggle('is-open', open);
  }
  function setCredits(open) {
    if (!creditsBtn || !creditsPanel) return;
    creditsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    creditsPanel.hidden = !open;
  }

  if (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      setMenu(open);
      if (open && lang) lang.open = false;
      setCredits(false);
    });
  }

  // Credits: a button when motion and scripts are on, a plain list otherwise.
  if (creditsBtn && creditsPanel && doc.documentElement.classList.contains('fx')) {
    creditsBtn.hidden = false;
    creditsPanel.hidden = true;
    creditsBtn.addEventListener('click', function () {
      var open = creditsBtn.getAttribute('aria-expanded') !== 'true';
      setCredits(open);
      if (open) { setMenu(false); if (lang) lang.open = false; }
    });
  }

  if (lang) {
    lang.addEventListener('toggle', function () {
      if (lang.open) { setCredits(false); if (!narrow.matches) setMenu(false); }
    });
  }

  doc.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    var closed = false;
    if (lang && lang.open) {
      lang.open = false; closed = true;
      var s = lang.querySelector('summary'); if (s) s.focus();
    }
    if (creditsPanel && !creditsPanel.hidden) {
      setCredits(false); closed = true; if (creditsBtn) creditsBtn.focus();
    }
    if (btn && btn.getAttribute('aria-expanded') === 'true') {
      setMenu(false); closed = true; btn.focus();
    }
    if (closed) e.preventDefault();
  });

  // A click outside closes the disclosures.
  doc.addEventListener('click', function (e) {
    var t = e.target;
    if (lang && lang.open && !lang.contains(t)) lang.open = false;
    if (creditsPanel && !creditsPanel.hidden && !credits.contains(t)) setCredits(false);
    if (btn && btn.getAttribute('aria-expanded') === 'true' && !panel.contains(t) && !btn.contains(t)) setMenu(false);
  });

  // Going back to a wide window closes the narrow menu.
  narrow.addEventListener('change', function () { setMenu(false); });
})();
