/* v5 entry: mounts the scroll-craft engine (untouched) and runs the one bespoke move.

   THE WORD AS WINDOW (one stroke, then the whole door)
   The poster is the word V A N I in ink on paper. One stroke of it, the left stem of the
   letter Ṇ, is not ink: it is a window onto the photograph, and the photograph is placed
   behind it so that Śrīla Prabhupāda's face and hood sit whole inside that stroke from the
   very first frame. Nothing ever cuts across his face.

   Phase 1 (the first part of the widening): the whole poster zooms in about the stem while
   the photograph grows inside it, always exactly as tall as the stem, until it reaches its
   final size. The photograph is laid out at that final size and is only ever drawn at that
   size or smaller, so it is never enlarged beyond its own pixels at any pixel ratio.
   Phase 2: the window, which is now a plain rectangle, opens outward through the word
   (the letters are cut by its clean vertical edges, nothing else moves) until it fills the
   screen and only the photograph on ink is left.

   Drawing is done on a canvas (the photograph drawn 1:1 to device pixels, the real Anton
   font for the letters, measured from the loaded face), driven by --sc-p of the pinned act,
   which the engine publishes. The real <h2> "Vāṇī" and the real <img> (alt, srcset) stay in
   the document for readers and for no-JS. Nothing here runs unless the reader scrolls.
   Reduced motion never gets this live branch: .v5-static shows the whole photograph. */
(function () {
  'use strict';
  var d = document, html = d.documentElement;
  var live = html.classList.contains('v5-live');

  var sc = window.ScrollCraft ? window.ScrollCraft.mount(d.body) : null;
  if (!live || !sc) return;

  // Keyboard focus inside a not-yet-revealed block (it appears once the reader scrolls to it): reveal it now.
  d.addEventListener('focusin', function (e) {
    var host = e.target.closest && e.target.closest('[data-sc-in]');
    if (!host || host.classList.contains('sc-in')) return;
    host.classList.add('sc-in');
    Array.prototype.forEach.call(host.children, function (k) { k.classList.add('sc-in'); });
  });

  var act = d.getElementById('peak');
  var stage = act && act.querySelector('.peak__stage');
  var img = act && act.querySelector('.peak__photo');
  var cap = act && act.querySelector('.peak__cap');
  if (!act || !stage || !img) return;

  var NATIVE_W = 1417, NATIVE_H = 2161;       // the photograph's own pixels
  var R = NATIVE_H / NATIVE_W;                // aspect, height over width
  var FX = 0.488, FY = 0.175;                 // the line of his eyes, as a fraction of the photograph
  var T0 = 0.08, T1 = 0.80;                   // the widening runs from 8% to 80% of the pinned act: a hold before, a hold after
  var TC = 0.42;                              // share of the widening spent on phase 1 (the zoom); the rest is the door opening
  var PAPER = '#f4f3ef', INK = '#b83b08';   // the sheet is paper; the word on it is the one saffron
  var STEM_L = 0.038, STEM_R = 0.206, CAPH = 0.859;   // Anton "Ṇ": left stem from x 0.038 to 0.206 em, cap height 0.859 em
  var MACRON = 0.992, DESC = 0.204, PITCH = 1.03;     // macron height, dot-below depth, two-line pitch (em)

  var canvas = d.createElement('canvas');
  canvas.className = 'peak__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  stage.insertBefore(canvas, stage.firstChild);
  var ctx = canvas.getContext('2d');

  var G = null, raf = 0, lastP = 0;
  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  var smooth = function (x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  function build() {
    var W = stage.clientWidth, H = stage.clientHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 4);
    if (!W || !H) return;
    if (G && G.W === W && G.H === H && G.dpr === dpr) return;

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = '400 100px Anton, Impact, sans-serif';
    ctx.textBaseline = 'alphabetic';
    if ('textRendering' in ctx) ctx.textRendering = 'geometricPrecision';

    var gut = Math.min(68, Math.max(20, W * 0.044));
    var narrow = H > W;                                   // portrait: the word stacks on two lines
    var lines = narrow ? ['VĀ', 'ṆĪ'] : ['VĀṆĪ'];
    var w100 = lines.map(function (s) { return ctx.measureText(s).width; });
    var nOrigin100 = narrow ? 0 : ctx.measureText('VĀṆ').width - ctx.measureText('Ṇ').width;   // where Ṇ starts, at font-size 100

    var n = lines.length;
    var blockEm = (n - 1) * PITCH + MACRON + DESC;
    var F = Math.min((W - 2 * gut) / (Math.max.apply(null, w100) / 100), (H * 0.82) / blockEm);
    var k1 = F / 100;
    var blockW = Math.max.apply(null, w100) * k1;
    var x0 = (W - blockW) / 2;
    var top = (H - blockEm * F) / 2;
    var base0 = top + MACRON * F;
    var ni = narrow ? 1 : 0;
    var baseN = base0 + ni * PITCH * F;                    // baseline of the line that holds Ṇ
    var nx = x0 + nOrigin100 * k1;                         // where Ṇ starts
    var stem = { l: nx + STEM_L * F, r: nx + STEM_R * F, t: baseN - CAPH * F, b: baseN };   // the window: one stroke

    // where the photograph ends up: whole, contained, never under the caption, and never bigger than its own pixels
    var maxFW = NATIVE_W / dpr;
    var FH = Math.min(H * 0.9, W * R, maxFW * R), FW = FH / R;
    var capW = Math.min(320, W - 2 * gut);
    var capH = cap ? cap.getBoundingClientRect().height : 0;
    var capBottom = W <= 860 ? Math.max(16, Math.min(40, H * 0.04)) : gut;
    var capTop = H - capBottom - capH;
    var topF = (H - FH) / 2;
    var left = (W - FW) / 2;
    if (left < gut + capW + 16) {
      if (W - gut - FW >= gut + capW + 16) {              // landscape phone: photograph flush right, caption left
        left = W - gut - FW;
      } else {                                            // no room beside the photograph: stack it above the caption
        var avail = capTop - 20;
        FH = Math.min(FH, avail - 16); FW = FH / R;
        topF = 16 + (avail - 16 - FH) / 2;
        left = (W - FW) / 2;
      }
    }
    left = Math.round(left * dpr) / dpr; topF = Math.round(topF * dpr) / dpr;
    var Qe = { x: left + FX * FW, y: topF + FY * FH };    // where his eyes end up

    // at the start the photograph is exactly as tall as the stem, so it fills the stroke; his hood is 17% of the photograph's
    // height wide and the stem is 19.6% of its own height wide, so the face and hood sit whole inside the stroke
    var s0 = Math.min(1, (CAPH * F) / FH);
    var Q0 = { x: (stem.l + stem.r) / 2, y: stem.t + FY * s0 * FH };

    img.style.width = FW + 'px';
    img.style.height = FH + 'px';
    img.sizes = Math.ceil(FW) + 'px';                      // the browser then picks a file with at least this many device pixels
    G = { W: W, H: H, dpr: dpr, F: F, lines: lines, x0: x0, base0: base0, w100: w100,
          stem: stem, Q0: Q0, Qe: Qe, s0: s0, FW: FW, FH: FH, lnKc: Math.log(1 / s0) };
  }

  function draw(p) {
    if (!G) return;
    var W = G.W, H = G.H;
    var t = clamp((p - T0) / (T1 - T0), 0, 1);
    var u = t < TC ? smooth(t / TC) : 1;                  // phase 1: the zoom
    var w = t < TC ? 0 : smooth((t - TC) / (1 - TC));     // phase 2: the door
    var K = Math.exp(G.lnKc * u);
    var s = Math.min(1, G.s0 * K);
    var Px = lerp(G.Q0.x, G.Qe.x, u), Py = lerp(G.Q0.y, G.Qe.y, u);

    ctx.clearRect(0, 0, W, H);

    // the photograph: drawn at s times its final size (s is never above 1)
    if (img.complete && img.naturalWidth) {
      var dw = s * G.FW, dh = s * G.FH;
      var dx = Px - s * FX * G.FW, dy = Py - s * FY * G.FH;
      if (s >= 0.9995) { dx = Math.round(dx * G.dpr) / G.dpr; dy = Math.round(dy * G.dpr) / G.dpr; }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, dx, dy, dw, dh);
    }

    // the window: the stem, scaled about the pivot, then opened out to the whole stage
    var L = Px + K * (G.stem.l - G.Q0.x), Rr = Px + K * (G.stem.r - G.Q0.x);
    var Tp = Py + K * (G.stem.t - G.Q0.y), B = Py + K * (G.stem.b - G.Q0.y);
    L = lerp(L, -2, w); Rr = lerp(Rr, W + 2, w); Tp = lerp(Tp, -2, w); B = lerp(B, H + 2, w);

    if (w < 0.999) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.rect(L, Tp, Rr - L, B - Tp);
      ctx.clip('evenodd');                                // everything outside the window: paper with the word on it
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, H);
      ctx.translate(Px, Py);
      ctx.scale(K, K);
      ctx.translate(-G.Q0.x, -G.Q0.y);
      ctx.fillStyle = INK;
      ctx.font = '400 ' + G.F + 'px Anton, Impact, sans-serif';
      ctx.textBaseline = 'alphabetic';
      G.lines.forEach(function (s2, i) { ctx.fillText(s2, G.x0, G.base0 + i * PITCH * G.F); });
      ctx.restore();
    }

    stage.setAttribute('data-sc-verify-state', 'u' + u.toFixed(2) + 'w' + w.toFixed(2));
    if (t <= 0 || t >= 1) stage.setAttribute('data-sc-verify-hold', 'true'); else stage.removeAttribute('data-sc-verify-hold');
  }

  function progress() {
    var v = parseFloat(act.style.getPropertyValue('--sc-p'));
    return isNaN(v) ? 0 : v;
  }
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; lastP = progress(); draw(lastP); });
  }

  function start() {
    build();
    lastP = progress();
    draw(lastP);
    act.classList.add('is-ready');
  }
  img.addEventListener('load', function () { draw(lastP); });
  // fetch the photograph two screens before the reader gets there, so the doorway never opens on an empty frame
  if ('IntersectionObserver' in window) {
    var near = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { img.loading = 'eager'; near.disconnect(); }
    }, { rootMargin: '200% 0px 200% 0px' });
    near.observe(act);
  }
  var fontsReady = d.fonts && d.fonts.load ? d.fonts.load('400 100px Anton', 'VĀṆĪ') : Promise.resolve();
  Promise.all([fontsReady, d.fonts && d.fonts.ready]).then(start, start);

  // A keyboard user tabbing into the credit links while the caption is still invisible: open the caption first.
  if (cap) cap.addEventListener('focusin', function (e) {
    var r = act.getBoundingClientRect();
    var target = r.top + scrollY + 0.96 * Math.max(r.height - innerHeight, 0);
    if (Math.abs(scrollY - target) > 2) {
      e.stopPropagation();                                 // the engine would otherwise centre the link and miss the cue
      scrollTo({ top: target, behavior: 'instant' });
    }
  });

  addEventListener('scroll', onScroll, { passive: true });
  var rt = 0;
  addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { build(); draw(progress()); }, 120);
  }, { passive: true });
})();
