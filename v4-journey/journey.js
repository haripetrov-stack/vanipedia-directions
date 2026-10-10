/* ==========================================================================
   The Journey: bespoke behaviour for the entry page. The engine is untouched;
   it runs the worldflight (one fixed stage, legs, copy windows, spacer). This
   file adds what the engine does not know about:

     the camera      follows the tip of one hand-drawn line along the route
     the line        is drawn by the scroll (stroke-dashoffset)
     the overview    after 1977 the camera pulls back until the whole route is one line
     THE DIVISION    the line splits into four and each branch ends at a petal
     the map         a station list along the bottom edge that jumps

   Nothing here moves on its own: every value is a function of scroll position.
   ========================================================================== */
(function () {
  'use strict';
  var J = document.querySelector('.journey');
  if (!J || !window.ScrollCraft) return;
  var root = document.documentElement;
  var fx = root.classList.contains('fx');

  var api = ScrollCraft.mount(document);        // sets html.sc-ready, sizes the spacer
  if (!fx) return;                              // reduced motion or no script: the static page
  var W = api.worlds[0];
  if (!W) return;

  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  var clamp01 = function (x) { return clamp(x, 0, 1); };
  var smooth = function (x) { x = clamp01(x); return x * x * (3 - 2 * x); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  // Speed never falls to zero: even at a station the line keeps a quarter of its pace.
  var ease = function (u) { u = clamp01(u); return 0.22 * u + 0.78 * u * u * (3 - 2 * u); };

  var segs = W.segs, nSeg = segs.length, nSt = nSeg - 1;       // the last leg is the peak
  var seam = W.seam;
  var mqPort = matchMedia('(max-aspect-ratio: 21/20)');
  var probeA = J.querySelector('.probe--a'), probeJ = J.querySelector('.probe--j'), probeF = J.querySelector('.probe--f'), probeS = J.querySelector('.probe--s');

  // ---- timeline, in viewport-heights along the track ---------------------------
  var st = [];
  for (var i = 0; i < nSt; i++) st[i] = segs[i].c0 + segs[i].w / 2;      // a station sits at the middle of its leg
  var T9 = segs[nSt].c0, total = W.total;
  var tArrive = T9 + 0.45;                    // the line reaches the junction
  var tZ0 = T9 + 0.60, tZ1 = T9 + 1.55;       // the camera pulls back to the whole route
  var tF0 = T9 + 1.45, tFstep = 0.14, tFdur = 0.55;   // the four branches, staggered
  var tEnd = T9 + 2.45;

  // ---- the two views (landscape, portrait) --------------------------------------
  var views = {};
  function makeView(svg) {
    var v = {
      svg: svg, cam: svg.querySelector('.cam'), line: svg.querySelector('.route__line'),
      ghostG: svg.querySelector('.route__ghostg'), tip: svg.querySelector('.route__tip'),
      nodes: [].slice.call(svg.querySelectorAll('.route__node')),
      labels: [].slice.call(svg.querySelectorAll('.route__label')),
      past: []
    };
    v.len = v.line.getTotalLength();
    v.f = v.nodes.map(function (n) { return parseFloat(n.getAttribute('data-at')); });
    v.nodes.forEach(function (n, k) {
      var p = v.line.getPointAtLength(v.f[k] * v.len);
      n.setAttribute('cx', p.x.toFixed(2)); n.setAttribute('cy', p.y.toFixed(2));
      v.past[k] = false;
    });
    v.p0 = v.line.getPointAtLength(0);
    v.p1 = v.line.getPointAtLength(v.len);
    v.pos = v.nodes.map(function (n) { return { x: +n.getAttribute('cx'), y: +n.getAttribute('cy') }; });
    v.lastK = -1;
    return v;
  }

  var G = {};   // geometry for the current size and orientation
  var view = null, port = false, vw = 0, vh = 0;

  // Portrait: the stage is fitted to the real text. The longest station text sits just above the
  // map, the photographs take whatever room is left above it, and the junction moves up if the
  // four doors would not otherwise fit. Heights are measured, never guessed, so a long caption or a
  // large type setting cannot make two things overlap.
  var stationEls = [].slice.call(J.querySelectorAll('.stn--type, .stn--photo'));
  var capEls = [].slice.call(J.querySelectorAll('.plate figcaption'));
  var doorEls = [].slice.call(J.querySelectorAll('.doors > li'));
  var FIT = ['--ay', '--ph', '--jy'];
  function fitPortrait() {
    var cs = getComputedStyle(root);
    var barH = parseFloat(cs.getPropertyValue('--bar')) || 52, hdrH = parseFloat(cs.getPropertyValue('--hdr')) || 56;
    var maxText = 0, maxCap = 0, rowsH = 0, i;
    stationEls.forEach(function (el) {
      var h = el.querySelector('.stn__h'), p = el.querySelector('.stn__p');
      var th = (h ? h.offsetHeight : 0) + (p ? p.offsetHeight + 16 : 0);
      if (th > maxText) maxText = th;
    });
    capEls.forEach(function (c) { maxCap = Math.max(maxCap, c.offsetHeight + 12); });
    doorEls.forEach(function (d) { rowsH += d.offsetHeight; });
    // Very short screens: the credit line leaves the caption (it stays in the Credits list).
    var tight = J.classList.contains('tight');
    if (!tight && sh - barH - hdrH - maxText - maxCap < 210) {
      J.classList.add('tight');
      maxCap = 0; capEls.forEach(function (c) { maxCap = Math.max(maxCap, c.offsetHeight + 12); });
    } else if (tight && sh - barH - hdrH - maxText - maxCap > 330) {
      J.classList.remove('tight');
    }
    var rt = hdrH + 14;
    var sh = probeS ? probeS.getBoundingClientRect().height : vh;   // the small viewport: steady while a phone's address bar comes and goes
    var textTop = sh - barH - 14 - maxText;                   // where the longest text starts
    var ay = Math.max(textTop + 34, rt + 150);                // the pen rests on its first line
    var ph = Math.max(96, ay - 34 - 16 - rt - maxCap);
    var jyWant = Math.max(0.41 * sh, hdrH + 190);
    var jyMax = sh - barH - 16 - rowsH - 30;
    var jy = Math.max(hdrH + 26 + 56, Math.min(jyWant, jyMax));
    J.style.setProperty('--ay', ay.toFixed(1) + 'px');
    J.style.setProperty('--ph', ph.toFixed(1) + 'px');
    J.style.setProperty('--jy', jy.toFixed(1) + 'px');
  }
  function clearFit() {
    FIT.forEach(function (k) { J.style.removeProperty(k); });
    J.classList.toggle('tight', vh < 520);        // a phone on its side: captions lose their credit line
  }

  function geometry() {
    vw = innerWidth; vh = innerHeight;
    port = mqPort.matches;
    if (port) fitPortrait(); else clearFit();
    var key = port ? 'port' : 'land';
    if (!views[key]) views[key] = makeView(J.querySelector('.route--' + key));
    view = views[key];
    var a = probeA.getBoundingClientRect(), j = probeJ.getBoundingClientRect(), f = probeF.getBoundingClientRect();
    G.ax = a.left; G.ay = a.top; G.jx = j.left; G.jy = j.top;
    G.k0 = port ? clamp(vw / 390, 0.8, 1.5) : clamp(vw / 1440, 0.55, 1.5);
    var span = port ? (view.p1.y - view.p0.y) : (view.p1.x - view.p0.x);
    G.kfit = port ? (G.jy - f.top) / span : (G.jx - f.left) / span;
    // the closest two stations, along the direction of travel, decide whether labels fit in the overview
    var minGap = Infinity;
    for (var k = 1; k < view.pos.length; k++) {
      var gap = port ? view.pos[k].y - view.pos[k - 1].y : view.pos[k].x - view.pos[k - 1].x;
      if (gap < minGap) minGap = gap;
    }
    G.minGap = minGap;
    G.labelDx = port ? 17 : 0; G.labelDy = port ? 5 : 26;
    G.top = W.top;
    layoutFan();
    view.lastK = -1;
    render(true);
  }

  // ---- the division: four branches from the junction to the four doors ------------
  var fanSvg = J.querySelector('.fan'), fanG = fanSvg && fanSvg.querySelector('.fan__g');
  var fanPaths = [];
  function layoutFan() {
    if (!fanG) return;
    var nodes = J.querySelectorAll('.door__node');
    while (fanPaths.length < nodes.length) {
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('class', 'fan__path'); p.setAttribute('pathLength', '1');
      fanG.appendChild(p); fanPaths.push(p);
    }
    for (var k = 0; k < nodes.length; k++) {
      var r = nodes[k].getBoundingClientRect();
      var ex = r.left - 2, ey = r.top + r.height / 2, jx = G.jx, jy = G.jy, d;   // the branch ends at the marker's left edge
      if (port) {
        d = 'M' + jx + ' ' + jy + 'C' + jx + ' ' + (jy + (ey - jy) * 0.92) + ' ' + (jx + (ex - jx) * 0.18) + ' ' + ey + ' ' + ex + ' ' + ey;
      } else {
        var dx = (ex - jx) * 0.55;
        d = 'M' + jx + ' ' + jy + 'C' + (jx + dx) + ' ' + jy + ' ' + (ex - dx) + ' ' + ey + ' ' + ex + ' ' + ey;
      }
      fanPaths[k].setAttribute('d', d);
    }
  }

  // ---- how far along the route the tip is, at scroll position t -------------------
  function D(t, f) {
    if (t <= st[0]) return f[0] * ease(t / st[0]);
    for (var k = 0; k < nSt - 1; k++) {
      if (t <= st[k + 1]) return f[k] + (f[k + 1] - f[k]) * ease((t - st[k]) / (st[k + 1] - st[k]));
    }
    if (t <= tArrive) return f[nSt - 1] + (1 - f[nSt - 1]) * ease((t - st[nSt - 1]) / (tArrive - st[nSt - 1]));
    return 1;
  }

  // ---- the plates: each photograph leaves before the next arrives -----------------
  var plates = segs.map(function (s) { return s.el.querySelector('.plate'); });
  // Photographs load lazily, then are asked for in good time: a plate never arrives empty.
  var photos = segs.map(function (s) { return s.el.querySelector('img'); });
  var warmed = [];
  // ---- links that live inside blocks which fade: unreachable while invisible --------
  var guards = [].slice.call(J.querySelectorAll('.hero, .doorsblock')).map(function (el) {
    return { el: el, links: [].slice.call(el.querySelectorAll('a')), on: null };
  });
  // ---- the map ---------------------------------------------------------------------
  var mapLinks = [].slice.call(document.querySelectorAll('.map__list a'));
  var mapFill = document.querySelector('.map__fill');
  var mapState = { cur: -1, past: [] };
  var bounds = [];
  for (var b = 0; b < nSt - 1; b++) bounds[b] = (st[b] + st[b + 1]) / 2;
  bounds[nSt - 1] = T9;

  function mapPos(t) {
    var n = nSt;                               // the last dot is the petals
    if (t <= st[0]) return 0;
    for (var k = 0; k < nSt - 1; k++) {
      if (t <= st[k + 1]) return (k + (t - st[k]) / (st[k + 1] - st[k])) / n;
    }
    return clamp01((nSt - 1 + clamp01((t - st[nSt - 1]) / (tEnd - st[nSt - 1]))) / n);
  }

  var raf = 0, lastY = -1;
  function render(force) {
    var y = scrollY || pageYOffset;
    if (!force && y === lastY) return;
    lastY = y;
    var t = clamp((y - G.top) / Math.max(vh, 1), 0, total);
    var v = view;

    var d = D(t, v.f);
    var uz = smooth((t - tZ0) / (tZ1 - tZ0));
    var k = G.k0 * Math.pow(G.kfit / G.k0, uz);
    var ax = lerp(G.ax, G.jx, uz), ay = lerp(G.ay, G.jy, uz);
    var p = v.line.getPointAtLength(d * v.len);
    var tx = ax - k * p.x, ty = ay - k * p.y;
    v.cam.setAttribute('transform', 'translate(' + tx.toFixed(2) + ' ' + ty.toFixed(2) + ') scale(' + k.toFixed(5) + ')');
    v.line.style.strokeDashoffset = (1 - d).toFixed(5);
    v.tip.setAttribute('cx', p.x.toFixed(2)); v.tip.setAttribute('cy', p.y.toFixed(2));

    if (Math.abs(k - v.lastK) > 1e-6) {
      v.lastK = k;
      var ks = 1 / k;
      v.svg.style.setProperty('--ks', ks.toFixed(4));
      var rs = lerp(7, 3.6, uz) * ks;
      for (var n = 0; n < v.nodes.length; n++) {
        v.nodes[n].setAttribute('r', rs.toFixed(3));
        var l = v.labels[n];
        l.setAttribute('x', (v.pos[n].x + G.labelDx * ks).toFixed(2));
        l.setAttribute('y', (v.pos[n].y + G.labelDy * ks).toFixed(2));
      }
      v.tip.setAttribute('r', (lerp(5.5, 4, uz) * ks).toFixed(3));
      v.svg.classList.toggle('is-dense', k * G.minGap < (port ? 17 : 38));
    }
    for (var m = 0; m < v.nodes.length; m++) {
      var pastNow = d >= v.f[m] - 0.0005;
      if (pastNow !== v.past[m]) {
        v.past[m] = pastNow;
        v.nodes[m].classList.toggle('is-past', pastNow);
        v.labels[m].classList.toggle('is-past', pastNow);
      }
    }
    // the road ahead fades a little as it is used up
    v.ghostG.style.opacity = (1 - 0.9 * (t / total)).toFixed(3);

    // the four branches
    for (var q = 0; q < fanPaths.length; q++) {
      var u = smooth((t - (tF0 + q * tFstep)) / tFdur);
      fanPaths[q].style.strokeDashoffset = (1 - u).toFixed(4);
    }

    // one short dissolve to the next photograph, centred on the leg boundary; the engine fades the
    // incoming leg over the same band, so between dissolves a plate is whole
    for (var s = 0; s < plates.length; s++) {
      if (!plates[s]) continue;
      if (!warmed[s] && t > segs[s].c0 - 2.4) { warmed[s] = true; photos[s].loading = 'eager'; }
      var sg = segs[s];
      var o = 1 - smooth((t - (sg.c1 - seam / 2)) / seam);
      plates[s].style.opacity = o.toFixed(3);
    }

    // links in faded blocks cannot take focus
    for (var g = 0; g < guards.length; g++) {
      var on = parseFloat(guards[g].el.style.opacity || '0') > 0.05;
      if (on !== guards[g].on) {
        guards[g].on = on;
        for (var a2 = 0; a2 < guards[g].links.length; a2++) {
          if (on) guards[g].links[a2].removeAttribute('tabindex'); else guards[g].links[a2].setAttribute('tabindex', '-1');
        }
      }
    }

    // the map
    var cur = nSt;
    for (var c = 0; c < nSt; c++) { if (t < bounds[c]) { cur = c; break; } }
    if (cur !== mapState.cur) {
      mapState.cur = cur;
      mapLinks.forEach(function (a3, idx) { if (idx === cur) a3.setAttribute('aria-current', 'step'); else a3.removeAttribute('aria-current'); });
    }
    mapLinks.forEach(function (a4, idx) {
      var pn = idx < nSt ? t >= st[idx] - 0.02 : t >= tEnd - 0.2;
      if (pn !== mapState.past[idx]) { mapState.past[idx] = pn; a4.classList.toggle('is-past', pn); }
    });
    if (mapFill) mapFill.style.transform = 'scaleX(' + mapPos(t).toFixed(4) + ')';
  }

  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; render(false); });
  }

  // ---- the map jumps; a jump is instant, the page does not fly -------------------
  function jump(i) {
    var t = i < nSt ? st[i] : total;
    var maxY = document.documentElement.scrollHeight - innerHeight;
    scrollTo({ top: Math.min(W.top + t * innerHeight, maxY), left: 0, behavior: 'instant' });
  }
  mapLinks.forEach(function (a, i) {
    a.addEventListener('click', function (e) { e.preventDefault(); jump(i); });
  });
  var hash = location.hash.match(/^#stn-(\d{4})$/);
  if (hash) {
    var ids = [].slice.call(J.querySelectorAll('.stn[id^="stn-"]')).map(function (e) { return e.id; });
    var hi = ids.indexOf('stn-' + hash[1]);
    if (hi > -1 && hi < nSt) addEventListener('load', function () { jump(hi); });
  }

  addEventListener('scroll', onScroll, { passive: true });
  var rz = 0, lastW = innerWidth, touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
  addEventListener('resize', function () {
    // A phone's address bar changes the height only. Like the engine, ignore it: the page must not
    // re-lay itself out under the reader's thumb.
    if (innerWidth === lastW && touch) { vh = innerHeight; return; }
    lastW = innerWidth;
    if (rz) return;
    rz = requestAnimationFrame(function () { rz = 0; geometry(); });
  }, { passive: true });
  mqPort.addEventListener('change', geometry);

  geometry();
  // The spacer is sized once at mount, and the doors move when the faces land:
  // one resize after load and after the fonts settle re-measures everything.
  function relayout() { dispatchEvent(new Event('resize')); }
  addEventListener('load', relayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
})();
