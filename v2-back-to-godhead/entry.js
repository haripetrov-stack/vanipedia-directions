/* entry.js: the bespoke part of the entry page. The engine (scrollcraft.js) is untouched.
   Two things live here:
   1. Marginalia. A rail in each chapter's margin carries a dot that rides the reading line.
      The entry under the line lights its note; every entry the reader has passed is recorded,
      and the colophon's list of sources marks what was read.
   2. The held spread. While the spread is pinned, --st (0 to 1) drives the photograph's
      development, the setting of the lines and the drawing of the citation rule (see entry.css).
   Without script, with reduced motion, or on a small screen, all of it is plain and complete. */
(function () {
  'use strict';

  if (window.ScrollCraft) window.ScrollCraft.mount(document.body);

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wide = matchMedia('(min-width: 800px)');
  var held = matchMedia('(min-width: 1000px) and (min-height: 620px) and (prefers-reduced-motion: no-preference)');

  var chapters = Array.prototype.slice.call(document.querySelectorAll('.chapter')).map(function (ch) {
    var rail = ch.querySelector('.rail');
    return {
      el: ch,
      rail: rail,
      dot: rail && rail.querySelector('.rail__dot'),
      entries: Array.prototype.slice.call(ch.querySelectorAll('[data-entry]'))
    };
  });

  var ledger = {};
  Array.prototype.forEach.call(document.querySelectorAll('.ledger [data-for]'), function (li) {
    ledger[li.getAttribute('data-for')] = li;
  });

  var spread = document.querySelector('[data-spread]');
  var track = spread && spread.querySelector('[data-spread-track]');
  var stage = spread && spread.querySelector('[data-spread-stage]');

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }

  function markSeen(entry) {
    if (entry.hasAttribute('data-seen')) return;
    entry.setAttribute('data-seen', '');
    Array.prototype.forEach.call(entry.querySelectorAll('.note[id]'), function (n) {
      var li = ledger[n.id];
      if (li) li.setAttribute('data-seen', '');
    });
  }

  function marginalia(vh) {
    var line = vh * 0.45;
    chapters.forEach(function (c) {
      var r = c.el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) return;

      var inside = r.top <= line && r.bottom > line;
      var current = null;
      c.entries.forEach(function (en) {
        var er = en.getBoundingClientRect();
        if (er.top <= vh * 0.78) markSeen(en);
        if (inside && er.top <= line) current = en;
      });
      c.entries.forEach(function (en) {
        if (en === current) { if (!en.hasAttribute('data-on')) en.setAttribute('data-on', ''); }
        else if (en.hasAttribute('data-on')) en.removeAttribute('data-on');
      });

      if (c.dot) {
        if (!wide.matches || reduce) { c.dot.style.display = 'none'; return; }
        c.dot.style.display = '';
        var rr = c.rail.getBoundingClientRect();
        var y = clamp(line - rr.top, 0, Math.max(rr.height - 7, 0));
        c.dot.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
      }
    });
  }

  function heldSpread(vh) {
    if (!spread || !track) return;
    var tr = track.getBoundingClientRect();
    var onScreen = tr.bottom > 0 && tr.top < vh;
    if (!held.matches) {
      spread.style.removeProperty('--st');
      spread.removeAttribute('data-sc-verify-state');
      spread.removeAttribute('data-sc-verify-hold');
      return;
    }
    var span = Math.max(tr.height - vh, 1);
    var enter = clamp((vh - tr.top) / vh, 0, 1);      // the stage slides up: the print develops
    var pinned = clamp(-tr.top / span, 0, 1);         // the stage holds: the line is set
    var st = pinned > 0 ? 0.16 + 0.84 * pinned : 0.16 * enter;
    spread.style.setProperty('--st', st.toFixed(4));

    // For the verification harness only: what actually paints while the spread is on screen
    // (how developed the print is, how much of the line is set, where the stage sits).
    // The settled end of the pin is a deliberate hold, declared as one.
    if (onScreen) {
      var sr = stage.getBoundingClientRect();
      spread.setAttribute('data-sc-verify-state', Math.round(st * 40) + '|' + Math.round(sr.top / 12));
      if (pinned > 0 && pinned < 1 && st >= 0.83) spread.setAttribute('data-sc-verify-hold', 'true');
      else spread.removeAttribute('data-sc-verify-hold');
    } else {
      spread.removeAttribute('data-sc-verify-state');
      spread.removeAttribute('data-sc-verify-hold');
    }
  }

  var queued = false;
  function frame() {
    queued = false;
    var vh = innerHeight;
    marginalia(vh);
    heldSpread(vh);
  }
  var settle = 0;
  function request() {
    if (!queued) { queued = true; requestAnimationFrame(frame); }
    // one more read when the scrolling stops, so the final state is always painted
    clearTimeout(settle);
    settle = setTimeout(frame, 90);
  }

  // A keyboard reader tabbing into a section that has not faded in yet must never land on something invisible.
  addEventListener('focusin', function (e) {
    var t = e.target; if (!t || !t.closest) return;
    var a = t.closest('[data-sc-in]'); if (a) a.classList.add('sc-in');
    var b = t.closest('[data-sc-stagger] > *'); if (b) b.classList.add('sc-in');
  });

  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request, { passive: true });
  if (held.addEventListener) held.addEventListener('change', request);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(request);
  request();
})();
