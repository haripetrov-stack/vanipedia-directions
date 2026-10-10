/* Entry page: the moving divider between vapu and vāṇī.
   The engine gives the pinned stage and the cues. This file adds the one thing the engine does not do:
   it turns the scroll position into the position of the divider, and it keeps the page honest
   (a stage only where it fits, a plain stepped page everywhere else). */
(function () {
  'use strict';

  var html = document.documentElement;
  var journey = document.getElementById('journey');
  var stage = journey.querySelector('.stage');
  var blocks = [].slice.call(journey.querySelectorAll('.block'));
  var groups = [].slice.call(journey.querySelectorAll('.group'));
  var head = document.querySelector('.head');
  var reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  var sizeMQ = matchMedia('(min-height: 600px) and (min-width: 340px)');
  var stackMQ = matchMedia('(max-width: 959px)');

  var GLIDE = 0.5;                    // viewport-heights of scroll the divider takes to move between two acts
  var FADE = 0.3;                     // viewport-heights the words and photographs take to leave and arrive (shorter than the glide)
  var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var smooth = function (x) { x = clamp01(x); return x * x * (3 - 2 * x); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* ---- the score: acts, their lengths and where the divider rests ---- */
  var T = 0;
  var acts = blocks.map(function (el) {
    var len = parseFloat(el.getAttribute('data-len')) || 1;
    var o = { el: el, len: len, d: parseFloat(el.getAttribute('data-d')) || 1.5, peak: el.hasAttribute('data-peak'), last: el.hasAttribute('data-last') };
    T += len;
    return o;
  });
  var span = T + 1;
  journey.setAttribute('data-sc-span', span.toFixed(2));
  var g = GLIDE / T, half = g / 2, fh = FADE / T / 2;
  var run = 0;
  acts.forEach(function (a, i) {
    a.b0 = run / T; run += a.len; a.b1 = run / T;
    a.u = a.b0 + (i === 0 ? 0 : half);            // plateau start
    a.v = a.b1 - (a.last ? 0 : half);             // plateau end
  });

  /* Cues written before the engine reads the page. Blocks fade in as the divider arrives and out as it leaves;
     a photograph leaves with the first half of the glide and the next one arrives with the second half, so the wall
     is cleared before it is hung again and two photographs are never on it at once. */
  function cue(el, from, to, rIn, rOut) {
    el.setAttribute('data-sc-cue', [from, to, rIn, rOut].map(function (n) { return n.toFixed(4); }).join(' '));
    el.setAttribute('data-sc-rise', '0');
  }
  acts.forEach(function (a, i) {
    var win = a.b1 - a.b0;
    cue(a.el, a.b0, a.last ? 1 : a.b1, i === 0 ? 0 : fh / win, a.last ? 0 : fh / win);
  });
  /* The two big words follow the peak act's window. They are cues too, so the verification pass takes them away
     with the other type when it photographs the bare stage. */
  var peakEl = acts.filter(function (a) { return a.peak; })[0];
  if (peakEl) {
    var pw = peakEl.b1 - peakEl.b0;
    [].forEach.call(stage.querySelectorAll('.pk'), function (w) { cue(w, peakEl.b0, peakEl.b1, fh / pw, fh / pw); });
  }
  groups.forEach(function (gr, k) {
    var plate = gr.querySelector('.plate');
    var mine = acts.filter(function (a) { return gr.contains(a.el); });
    var b0 = mine[0].b0, b1 = mine[mine.length - 1].b1;
    var first = k === 0, last = k === groups.length - 1;
    var from = first ? 0 : b0, to = last ? 1 : b1, win = to - from;
    cue(plate, from, to, first ? 0 : fh / win, last ? 0 : fh / win);
    gr.__acts = mine;
  });

  /* ---- reading the divider's value for the current layout ---- */
  var wide = !stackMQ.matches;
  function rest(a) {
    var v = parseFloat(getComputedStyle(a.el).getPropertyValue(wide ? '--a' : '--av'));
    return isNaN(v) ? 50 : v;
  }
  function plan() {
    wide = !stackMQ.matches;
    acts.forEach(function (a) { a.s0 = rest(a); a.s1 = a.s0 - a.d; });
  }

  function splitAt(p) {
    var n = acts.length, i, a, b;
    if (p <= acts[0].u) return acts[0].s0;
    for (i = 0; i < n; i++) {
      a = acts[i];
      if (p >= a.u && p <= a.v) return lerp(a.s0, a.s1, (p - a.u) / Math.max(a.v - a.u, 0.0001));
      b = acts[i + 1];
      if (b && p > a.v && p < b.u) return lerp(a.s1, b.s0, smooth((p - a.v) / (b.u - a.v)));
    }
    return acts[n - 1].s1;
  }
  var peakAct = acts.filter(function (a) { return a.peak; })[0];
  function peakAt(p) {
    if (!peakAct) return 0;
    var a = peakAct;
    var inn = smooth((p - a.b0) / fh);
    var out = 1 - smooth((p - (a.b1 - fh)) / fh);
    return clamp01(Math.min(inn, out));
  }
  function actAt(p) {
    for (var i = 0; i < acts.length; i++) if (p < acts[i].b1) return i;
    return acts.length - 1;
  }

  var stageMode = function () { return html.classList.contains('vs-stage'); };
  var lastSig = '';
  function progress() {
    var r = journey.getBoundingClientRect();
    var travel = Math.max(r.height - innerHeight, 1);
    return clamp01(-r.top / travel);
  }
  function update() {
    if (!stageMode()) { if (head && head.style.transform) head.style.transform = ''; return; }
    /* The header is fixed while the stage is pinned and leaves with it when the stage slides up to the footer */
    var off = Math.min(0, stage.getBoundingClientRect().bottom - innerHeight);
    head.style.transform = off ? 'translate3d(0,' + off.toFixed(1) + 'px,0)' : '';
    var p = progress();
    var s = splitAt(p), pk = peakAt(p);
    stage.style.setProperty('--split', s.toFixed(2));
    stage.style.setProperty('--pk', pk.toFixed(3));
    /* The rendered state, rounded, so the verification pass can tell a moving stage from a frozen one */
    var sig = 's' + s.toFixed(1) + ' act' + actAt(p) + ' pk' + pk.toFixed(2);
    if (sig !== lastSig) { stage.setAttribute('data-sc-verify-state', sig); lastSig = sig; }
  }

  /* ---- does the composition fit this window? If not, the stepped page takes over ---- */
  function fits() {
    var ok = true, i, why = '';
    var els = [].slice.call(stage.querySelectorAll('.block, .plate'));
    for (i = 0; i < els.length && ok; i++) {
      var el = els[i], r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      var top = r.top + parseFloat(cs.paddingTop) - 4, bottom = r.bottom - parseFloat(cs.paddingBottom) + 4;
      var left = r.left + parseFloat(cs.paddingLeft) - 4, right = r.right - parseFloat(cs.paddingRight) + 4;
      /* flex centring hides overflow on both sides, so look at where the content really is */
      for (var c = el.firstElementChild; c; c = c.nextElementSibling) {
        var q = c.getBoundingClientRect();
        if (!q.width && !q.height) continue;
        if (q.top < top || q.bottom > bottom || q.left < left || q.right > right) {
          ok = false;
          why = el.className + ' > ' + c.className + ' [' + Math.round(q.top) + ',' + Math.round(q.bottom) + '] limit [' + Math.round(top) + ',' + Math.round(bottom) + ']';
          break;
        }
      }
    }
    if (ok && peakAct) {
      /* at the balance point the photograph must clear the two words */
      var prev = stage.style.getPropertyValue('--pk');
      stage.style.setProperty('--pk', '1');
      var inner = stage.querySelector('.plate--lift ' + (wide ? 'figcaption' : 'img'));
      var photo = stage.querySelector('.plate--lift img');
      var word = stage.querySelector('.pk--vapu');
      if (inner && word) {
        var a = inner.getBoundingClientRect(), b = word.getBoundingClientRect();
        var wordTop = b.top - 20;   /* the glyphs start at the top of the box, and the caption needs air above them */
        if (a.bottom > wordTop && (!wide || a.right > b.left || photo.getBoundingClientRect().right > b.left)) { ok = false; why = 'photograph meets the two words'; }
      }
      stage.style.setProperty('--pk', prev || '0');
    }
    stage.setAttribute('data-vs-why', ok ? '' : why);
    return ok;
  }

  var api = null;
  function apply() {
    plan();
    var want = !reduceMQ.matches && sizeMQ.matches;
    html.classList.toggle('vs-stage', want);
    if (want) {
      plan();
      if (!fits()) { html.classList.remove('vs-stage'); want = false; }
    }
    if (want) stage.removeAttribute('data-sc-verify-hold');
    else { stage.setAttribute('data-sc-verify-hold', 'true'); stage.setAttribute('data-sc-verify-state', 'stepped'); lastSig = ''; }
    if (api) api.layout();
    update();
  }

  plan();
  api = ScrollCraft.mount(document.body);
  apply();

  var raf = 0;
  addEventListener('scroll', function () {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; update(); });
  }, { passive: true });
  var rz = 0;
  addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(apply, 120); }, { passive: true });
  [reduceMQ, sizeMQ, stackMQ].forEach(function (mq) {
    if (mq.addEventListener) mq.addEventListener('change', apply); else mq.addListener(apply);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(apply);

  /* ---- keyboard: tabbing into a door scrolls the stage to the act that shows it ---- */
  addEventListener('focusin', function (e) {
    if (!stageMode() || !e.target.closest) return;
    var host = e.target.closest('.block, .plate');
    if (!host) return;
    var a = acts.filter(function (x) { return x.el === host; })[0];
    if (!a) {
      var gr = host.closest('.group');
      a = gr && gr.__acts && gr.__acts[0];
    }
    if (!a) return;
    var vis = parseFloat(getComputedStyle(host).opacity);
    if (vis > 0.9) return;
    var r = journey.getBoundingClientRect();
    var travel = Math.max(r.height - innerHeight, 1);
    var p = a.last ? 0.995 : (a.u + a.v) / 2;
    scrollTo({ top: scrollY + r.top + p * travel, behavior: 'instant' });
  });
})();
