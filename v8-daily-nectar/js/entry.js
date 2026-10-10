/* v8 Daily Nectar: entry page behaviour.
   Everything here is bespoke and sits on top of the untouched scroll-craft engine:
   1. the visitor's own date, as a label
   2. the day strip: fixed chrome that takes the strip colour and drop name of the cut under it
   3. the Interlude: the strip unfurls into the photograph (clip-path, driven by page scroll)
   Nothing moves by itself. Without motion (reduced motion) the strip still reports the
   cut it is over, but the Interlude stays an ordinary block. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  var smooth = function (x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

  if (window.ScrollCraft) window.ScrollCraft.mount(doc.body);
  else root.classList.add('sc-fallback');

  /* 1 · the visitor's date. A label only: the drops below are a fixed sample. */
  var now = new Date();
  var dow = DOW[now.getDay()], mon = MON[now.getMonth()], day = now.getDate();
  var iso = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + day).slice(-2);
  var stripDate = doc.getElementById('stripDate');
  stripDate.textContent = dow.slice(0, 3) + ' ' + day + ' ' + mon.slice(0, 3);
  stripDate.setAttribute('datetime', iso);
  var leaf = doc.getElementById('leaf');
  doc.getElementById('leafNum').textContent = day;
  doc.getElementById('leafDow').textContent = dow;
  doc.getElementById('leafMon').textContent = mon;
  leaf.classList.add('is-date');

  /* 2 + 3 · the strip and the Interlude */
  var strip = doc.getElementById('daystrip');
  var dropEl = doc.getElementById('stripDrop');
  var cuts = Array.prototype.slice.call(doc.querySelectorAll('[data-cut]'));
  var peak = doc.getElementById('hear');
  var fig = doc.getElementById('peakFig');
  var before = doc.querySelector('[data-peak-after]');
  var live = root.classList.contains('peak-live');
  var cur = null, lastU = -1, lastOn = null, ticking = false;

  function frame() {
    ticking = false;
    var H = strip.offsetHeight, vh = window.innerHeight, i, c = cuts[0];
    for (i = 0; i < cuts.length; i++) {
      if (cuts[i].getBoundingClientRect().top <= H + 0.5) c = cuts[i]; else break;
    }
    if (c !== cur) {
      cur = c;
      strip.setAttribute('data-s', c.getAttribute('data-strip') || 'night');
      dropEl.textContent = c.getAttribute('data-drop') || '';
    }

    var u = 0;
    if (live && peak && fig) {
      var r = peak.getBoundingClientRect();
      /* The curtain starts to fall when the last thing in the quiet cut has risen above the
         middle of the screen, and is down 0.6 viewport heights of scroll later. Tied to the
         content, not to a fixed offset, so it holds at every phone and desktop height. */
      var last = before ? before.getBoundingClientRect().bottom : r.top - vh * 0.1;
      u = smooth((vh * 0.46 - last) / (0.6 * vh));
      var on = u > 0.001 && r.bottom > 1;
      if (on !== lastOn) { fig.classList.toggle('is-on', on); lastOn = on; }
      if (Math.abs(u - lastU) > 0.0005) { fig.style.setProperty('--u', u.toFixed(4)); lastU = u; }
    }
    strip.setAttribute('data-sc-verify-state', 's:' + strip.getAttribute('data-s') + '|d:' + (dropEl.textContent) + '|u:' + u.toFixed(2));
    strip.setAttribute('data-sc-verify-hold', (u <= 0.001 || u >= 0.999) ? 'true' : 'false');
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request, { passive: true });
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(request);
  frame();

  /* the hero's second action: land where the photograph and the player are both on screen */
  var jump = doc.querySelector('[data-jump-peak]');
  if (jump && peak) {
    jump.addEventListener('click', function (e) {
      e.preventDefault();
      var h = doc.getElementById('hear-h');
      if (!live) {                                  /* static block: land on the panel, the photograph is just above */
        var panel = doc.getElementById('nectar');
        if (panel) panel.scrollIntoView({ block: 'start' });
        if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
        return;
      }
      var r = peak.getBoundingClientRect();
      var y = window.pageYOffset + r.bottom - window.innerHeight;
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    });
  }
})();
