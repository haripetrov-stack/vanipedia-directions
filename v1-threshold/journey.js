/* ==========================================================================
   journey.js: the Threshold timeline (entry page only).

   The engine pins one act and publishes its progress as --sc-p. This file
   reads that value and drives the layers of the stage. It never edits the
   engine. Everything here is transform, opacity, visibility or clip-path.

   Timeline (p = 0..1 across an 11 viewport-height act, 10 of them travel):
     0.00 .. 0.09   outside: headline holds, the camera already drifts
     0.04 .. 0.24   the gateway we drew is passed (it scales out)
     0.05 .. 0.105  a small gold arch lights over a real arch of the arcade
     0.105 .. 0.31  the door opens until the room fills the view
     0.09 .. 0.50   the caption of the room is on screen the whole time the room is
     0.31 .. 0.42   inside: his room at Radha-Damodar holds
     0.42 .. 0.50   the room recedes into the dark
     0.46 .. 0.62   his photograph comes forward through the dark as the room recedes
     0.62 .. 0.79   the peak holds, with a slow breath
     0.79 .. 0.85   the photograph recedes, the ground turns to light
     0.835 .. 1.00  the four doors rise as it goes, then the one action, then it holds

   Input: only what is visible takes clicks. The stage is pointer-events:none;
   the engine switches its cues, and this file switches the doors, the action
   and the credits, so a layer that is not showing never catches a tap.

   Modes: the cinematic stage runs when the visitor allows motion and the screen
   is at least 560 px high. Otherwise the same markup is a static stacked page.
   The switch (reduced-motion setting, a phone turned on its side) is made in
   place, without reloading.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var act = document.getElementById('threshold');
  var stage = act && act.querySelector('[data-sc-stage]');
  if (!stage) return;

  var q = function (s) { return stage.querySelector(s); };
  var E = {
    sky: q('.sky'), facade: q('.facade'), fimg: q('.facade img'), haze: q('.haze'),
    hero: q('.hero-copy'), gate: q('.gate'), gring: q('.gate-ring'),
    room: q('.room'), rimg: q('.room img'), d2: q('.d2-ring'), veil: q('.veil'),
    panel: q('.panel-wrap'), title: q('.doors__title'),
    items: [].slice.call(stage.querySelectorAll('.door-item')),
    enter: q('.enter-wrap'), credits: q('.credits')
  };
  var touched = [E.sky, E.facade, E.fimg, E.haze, E.hero, E.gate, E.gring, E.room, E.rimg, E.d2, E.veil, E.panel, E.title, E.enter, E.credits].concat(E.items);

  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ss = function (a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  var f1 = function (n) { return n.toFixed(1); };

  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  var DARK = hex('#2a1013'), SAND = hex('#e3d3b4');
  function mix(a, b, t) {
    return 'rgb(' + Math.round(lerp(a[0], b[0], t)) + ',' + Math.round(lerp(a[1], b[1], t)) + ',' + Math.round(lerp(a[2], b[2], t)) + ')';
  }

  // arch with a flat bottom edge at yb, centred on cx; the top is half an ellipse of vertical radius `rise`
  function arch(cx, yb, w, h, rise) {
    var x0 = cx - w / 2, x1 = cx + w / 2, ys = yb - h + rise;
    return 'M' + f1(x0) + ',' + f1(yb) + 'V' + f1(ys) + 'A' + f1(w / 2) + ',' + f1(rise) + ' 0 0 1 ' + f1(x1) + ',' + f1(ys) + 'V' + f1(yb) + 'Z';
  }
  // the same arch pushed outward by o
  function archO(cx, yb, w, h, rise, o) { return arch(cx, yb, w + 2 * o, h + o, rise + o); }

  var on = false;
  var W = 0, H = 0, phone = false, barH = 60, sillH = 0;
  var G = {}, D = {};
  var actTop = 0, travel = 1;
  var lastP = -1;

  function engine() { return window.ScrollCraft && window.ScrollCraft.instances && window.ScrollCraft.instances[0]; }

  function layout() {
    if (!on) return;
    var sr = stage.getBoundingClientRect();
    W = sr.width; H = sr.height; phone = W <= 900 && H >= W;   // the same test as the portrait phone composition in entry.css
    barH = parseFloat(getComputedStyle(root).getPropertyValue('--bar-h')) || 60;
    sillH = phone ? E.hero.offsetHeight : 0;

    // gateway: aperture geometry mirrors the static CSS (.gate)
    var top = barH + (phone ? 8 : 10);
    G.yb = H * 1.06; G.h = G.yb - top; G.w = W * (phone ? 0.94 : 0.92);
    G.rise = phone ? G.w / 2 : G.h * 0.26;
    G.cx = W / 2; G.ox = W / 2; G.oy = H * 0.8;
    G.kEnd = 2.2;

    // door in the facade: the central bay of the arcade (the desktop picture is cropped at 12% from the left)
    var fr = E.facade.getBoundingClientRect();
    var fx = phone ? 0.6063 : 0.4685, fy = 0.7685;
    // untransformed rect: the facade box itself is never transformed, only its image
    D.cx = fr.left - sr.left + fr.width * fx;
    D.yb = fr.top - sr.top + fr.height * fy;
    D.w0 = fr.width * (phone ? 0.069 : 0.0533);
    D.wF = Math.max(2 * Math.max(D.cx, W - D.cx), D.yb) * 1.03;
    D.cover = D.wF / 1.03;

    var rect = act.getBoundingClientRect();
    actTop = rect.top + (window.scrollY || window.pageYOffset);
    travel = Math.max(rect.height - H, 1);

    E.gate.classList.add('is-js');
    E.gring.classList.add('is-js');
    lastP = -1;
    render(readP());
  }

  function readP() { return parseFloat(act.style.getPropertyValue('--sc-p')) || 0; }

  function render(p) {
    if (!on || !W) return;
    if (Math.abs(p - lastP) < 0.00005) return;
    lastP = p;

    // ---- the approach ------------------------------------------------------
    var tB = clamp(p / 0.31, 0, 1);
    var sB = 1 + 0.42 * (0.3 * tB + 0.7 * ss(0, 1, tB));            // the façade comes closer
    var eG = ss(0.04, 0.24, p);                                      // gateway passed
    var kG = 1 + (G.kEnd - 1) * Math.pow(eG, 1.5);
    var tg = clamp((p - 0.105) / 0.205, 0, 1);
    var g = 0.3 * tg + 0.7 * ss(0, 1, tg);                           // door aperture, 0..1
    var wD = D.w0 * Math.pow(D.wF / D.w0, g);

    E.sky.style.transform = 'translate3d(0,' + f1(-H * 0.02 * tB) + 'px,0) scale(' + (1 + 0.1 * tB).toFixed(4) + ')';
    E.fimg.style.transform = 'scale(' + sB.toFixed(4) + ')';
    E.haze.style.opacity = (0.95 * (1 - ss(0.03, 0.26, p))).toFixed(3);
    E.haze.style.transform = 'translate3d(0,' + f1(H * 0.05 * tB) + 'px,0)';
    var wasFull = wD >= D.cover;
    var vis = wasFull ? 'hidden' : 'visible';
    E.sky.style.visibility = vis; E.facade.style.visibility = vis; E.haze.style.visibility = vis;

    // hero copy on a phone sits on a step that drops away
    if (phone) {
      var sd = ss(0.03, 0.12, p);
      E.hero.style.transform = 'translate3d(0,' + f1(sd * (sillH + 4)) + 'px,0)';
      E.hero.style.visibility = sd >= 1 ? 'hidden' : 'visible';
    } else {
      E.hero.style.visibility = p > 0.12 ? 'hidden' : 'visible';
    }

    // ---- the gateway (wall plane with an arch hole, and its gold lines) -----
    var gx = G.ox + (G.cx - G.ox) * kG;
    var gyb = G.oy + (G.yb - G.oy) * kG;
    var gw = G.w * kG, gh = G.h * kG, gr = G.rise * kG;
    if (kG < G.kEnd - 0.002) {
      var hole = arch(gx, gyb, gw, gh, gr);
      E.gate.style.clipPath = "path(evenodd,'M-4000,-4000H8000V8000H-4000Z" + hole + "')";
      var t1 = 3 * Math.min(kG, 1.6), o2 = 9 * Math.min(kG, 1.6), t2 = 2 * Math.min(kG, 1.6);
      var ringD = archO(gx, gyb, gw, gh, gr, t1) + archO(gx, gyb, gw, gh, gr, 0) +
                  archO(gx, gyb, gw, gh, gr, o2 + t2) + archO(gx, gyb, gw, gh, gr, o2);
      E.gring.style.clipPath = "path(evenodd,'" + ringD + "')";
      E.gate.style.visibility = 'visible'; E.gring.style.visibility = 'visible';
    } else {
      E.gate.style.visibility = 'hidden'; E.gring.style.visibility = 'hidden';
    }

    // ---- the door in the façade: the room is seen through it ---------------
    if (g < 0.001) {
      E.room.style.visibility = 'hidden'; E.d2.style.opacity = '0';
    } else {
      E.room.style.visibility = 'visible';
      // the apex scales about the door's base; the base itself drops below the screen as the door opens
      var yTop = D.yb - wD * 1.5;
      var yBot = D.yb + (H * 1.05 - D.yb) * g * g;
      var hD = yBot - yTop;
      if (!wasFull) {
        E.room.style.clipPath = "path('" + arch(D.cx, yBot, wD, hD, wD / 2) + "')";
        var td = Math.min(2 + wD * 0.008, 6);
        E.d2.style.clipPath = "path(evenodd,'" + archO(D.cx, yBot, wD, hD, wD / 2, td) + archO(D.cx, yBot, wD, hD, wD / 2, 0) + "')";
        E.d2.style.opacity = (ss(0.05, 0.1, p) * (1 - ss(0.9, 1, g))).toFixed(3);
      } else {
        E.room.style.clipPath = 'none';
        E.d2.style.opacity = '0';
      }
    }
    // the room lives behind the aperture and settles as it opens
    var cxA = D.cx, cyA = D.yb - wD * 0.75;
    var drift = ss(0.31, 0.42, p);
    var rec = ss(0.42, 0.50, p);
    var rs = lerp(0.76, 1, g) * (1 + 0.075 * drift) * (1 - 0.07 * rec);
    var rx = (cxA - W / 2) * (1 - g), ry = (cyA - H / 2) * (1 - g) - H * 0.012 * drift;
    E.rimg.style.transform = 'translate3d(' + f1(rx) + 'px,' + f1(ry) + 'px,0) scale(' + rs.toFixed(4) + ')';

    // ---- recede, peak ------------------------------------------------------
    // the veil darkens the room; once the room is gone the ground itself is dark and the veil steps aside
    var roomHidden = rec >= 1;
    E.veil.style.opacity = roomHidden ? '0' : rec.toFixed(3);
    if (roomHidden) E.room.style.visibility = 'hidden';

    // his photograph starts to come forward while the room is still receding, so the screen is never empty
    var e = ss(0.46, 0.62, p);
    var out = ss(0.79, 0.85, p);
    var breath = clamp((p - 0.62) / 0.17, 0, 1);
    var ps = lerp(0.74, 1, e) * (1 + 0.05 * breath) * (1 - 0.1 * out);
    var py = lerp(H * 0.05, 0, e) - H * 0.035 * out;
    var po = e * (1 - out);
    E.panel.style.opacity = po.toFixed(3);
    E.panel.style.transform = 'translate3d(0,' + f1(py) + 'px,0) scale(' + ps.toFixed(4) + ')';
    E.panel.style.visibility = (po < 0.002) ? 'hidden' : 'visible';

    // ground: dark through the peak, then it turns to light
    var lt = ss(0.79, 0.85, p);
    stage.style.backgroundColor = mix(DARK, SAND, lt);

    // ---- the four doors ----------------------------------------------------
    var tt = ss(0.845, 0.885, p);
    E.title.style.opacity = tt.toFixed(3);
    E.title.style.transform = 'translate3d(0,' + f1((1 - tt) * 18) + 'px,0)';
    var doorsOn = 0;
    for (var i = 0; i < E.items.length; i++) {
      var s = 0.835 + i * 0.012;
      var ti = ss(s, s + 0.045, p);
      E.items[i].style.opacity = ti.toFixed(3);
      E.items[i].style.transform = 'translate3d(0,' + f1((1 - ti) * 34) + 'px,0)';
      E.items[i].style.pointerEvents = ti > 0.6 ? 'auto' : 'none';
      doorsOn += ti;
    }
    var te = ss(0.925, 0.965, p);
    E.enter.style.opacity = te.toFixed(3);
    E.enter.style.transform = 'translate3d(0,' + f1((1 - te) * 14) + 'px,0)';
    E.enter.style.pointerEvents = te > 0.6 ? 'auto' : 'none';
    var tc = ss(0.935, 0.97, p);
    E.credits.style.opacity = tc.toFixed(3);
    E.credits.style.pointerEvents = tc > 0.6 ? 'auto' : 'none';

    // what actually paints, for the verification harness (rounded values only)
    stage.setAttribute('data-sc-verify-state',
      [Math.round(sB * 100), Math.round(kG * 10), Math.round(Math.log(wD) * 10), Math.round(rs * 100), Math.round(rec * 20),
       Math.round(po * 20), Math.round(ps * 400), Math.round(lt * 20), Math.round(doorsOn * 4), Math.round(te * 10)].join('|'));
    // the resolved close is the one authored hold
    if (p > 0.97) stage.setAttribute('data-sc-verify-hold', 'true');
    else stage.removeAttribute('data-sc-verify-hold');
  }

  // ---- keyboard: a control inside the doors scene is reached by parking the act at its end
  stage.addEventListener('focusin', function (ev) {
    if (!on) return;
    var t = ev.target;
    if (!t || !t.closest) return;
    if (t.closest('.doors') || t.closest('.credits')) {
      if (readP() < 0.97) {
        window.scrollTo({ top: actTop + travel * 0.99, behavior: 'instant' });
      }
    }
  });

  // ---- wiring: after the engine's own scroll handler, so --sc-p is current
  var ticking = false;
  function onScroll() {
    if (!on || ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; render(readP()); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  var lastW = innerWidth, lastH = innerHeight, rt = 0;
  window.addEventListener('resize', function () {
    if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 120 && innerWidth <= 900) return; // URL bar only
    lastW = innerWidth; lastH = innerHeight;
    clearTimeout(rt);
    rt = setTimeout(function () { sync(); layout(); }, 120);
  }, { passive: true });

  // ---- cinematic <-> static, switched in place (no reload)
  var mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  var mqShort = matchMedia('(max-height: 559px)');
  function wantCine() { return !mqReduce.matches && !mqShort.matches; }

  function reset() {
    touched.forEach(function (el) { if (el) el.removeAttribute('style'); });
    stage.removeAttribute('style');
    stage.removeAttribute('data-sc-verify-hold');
    stage.setAttribute('data-sc-verify-state', '');
    E.gate.classList.remove('is-js');
    E.gring.classList.remove('is-js');
    if (E.credits) E.credits.setAttribute('open', '');
  }
  function enable() {
    on = true;
    root.classList.add('cine');
    var inst = engine(); if (inst) inst.layout();
    layout();
    if (E.credits && (innerWidth <= 900 || innerHeight < 760)) E.credits.removeAttribute('open');
  }
  function disable() {
    on = false;
    root.classList.remove('cine');
    reset();
    var inst = engine(); if (inst) inst.layout();
  }
  function sync() {
    var want = wantCine();
    if (want && !on) enable();
    else if (!want && on) disable();
  }
  [mqReduce, mqShort].forEach(function (m) {
    if (m.addEventListener) m.addEventListener('change', sync); else if (m.addListener) m.addListener(sync);
  });

  // first paint: the head script has already chosen the rendering
  if (root.classList.contains('cine')) {
    on = true;
    layout();
    if (E.credits && (innerWidth <= 900 || innerHeight < 760)) E.credits.removeAttribute('open');
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layout(); });
  window.addEventListener('load', function () { layout(); });
})();
