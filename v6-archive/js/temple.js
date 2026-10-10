/* Entry page: layout modes, horizontal spine, the peak (passport) and the signature move (the loupe).
   The scroll-craft engine is used as shipped. Everything bespoke below is driven by
   --sc-p (published by the engine on each act) and by data attributes of this page.
   The first mode is set before first paint by a head script; later changes happen in place. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || d).querySelectorAll(s)); };
  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  var c01 = function (x) { return clamp(x, 0, 1); };

  /* ======================================================================
     Loupe: a lens over a real detail. Pointer (hover), touch (tap, then drag
     the lens), keyboard (button, arrow keys), and buttons that jump to a detail.
     ====================================================================== */
  var loupes = [];

  function Loupe(host) {
    var img = $('img', host), lens = $('.loupe', host), inner = $('.loupe__img', lens);
    var ctl = $$('[data-loupe="' + host.id + '"]');
    var toggle = ctl.filter(function (n) { return n.classList.contains('loupe-btn'); })[0] || null;
    var notes = ctl.filter(function (n) { return n.classList.contains('note'); });
    var hint = toggle && toggle.parentNode ? $('[data-hint]', toggle.parentNode) : null;
    var start = (host.getAttribute('data-start') || '0.5 0.5').split(/\s+/).map(parseFloat);
    var rotTop = parseFloat(host.getAttribute('data-rotate-top')) || 0;
    var zoomUrl = host.getAttribute('data-zoom');
    var zoomW = parseFloat(host.getAttribute('data-zoom-w')) || 1400;   /* width of the zoom file, fixes the magnification */
    var st = { x: start[0], y: start[1], pinned: false, hover: false, auto: false, ready: false, zoom: null, touch: false, target: -1, last: null, drag: false };

    function dims() {
      var w = host.offsetWidth || 1, h = host.offsetHeight || 1;
      var D = Math.round(clamp(Math.min(w, h * 1.6) * 0.46, 112, 208));
      var Z = clamp(zoomW / w, 1.8, 3);
      return { w: w, h: h, D: D, Z: Z };
    }

    function render() {
      var m = dims();
      var px = st.x * m.w, py = st.y * m.h;
      var rot = rotTop && st.y < 0.5 ? rotTop : 0;
      lens.style.width = lens.style.height = m.D + 'px';
      lens.style.setProperty('--lx', (px - m.D / 2).toFixed(1) + 'px');
      lens.style.setProperty('--ly', (py - m.D / 2).toFixed(1) + 'px');
      inner.style.width = (m.w * m.Z).toFixed(1) + 'px';
      inner.style.height = (m.h * m.Z).toFixed(1) + 'px';
      inner.style.transform = 'translate(' + (m.D / 2).toFixed(1) + 'px,' + (m.D / 2).toFixed(1) + 'px) rotate(' + rot + 'deg) translate(' + (-px * m.Z).toFixed(1) + 'px,' + (-py * m.Z).toFixed(1) + 'px)';
    }

    function ensureZoom() {
      if (st.zoom || st.loading || !zoomUrl) return;
      st.loading = true;
      var im = new Image();
      im.onload = function () {
        st.zoom = im; st.ready = true;
        inner.style.backgroundImage = 'url("' + zoomUrl + '")';
        render();
      };
      im.src = zoomUrl;
    }

    function visible() { return st.hover || st.pinned || st.auto; }
    function sync() {
      var on = visible();
      host.classList.toggle('is-lens', on);
      if (on) {
        /* the large file is fetched only when the reader drives the lens; the parked lens
           at the end of the peak reuses the picture that is already on the page */
        if (st.hover || st.pinned || st.drag) ensureZoom();
        if (!st.zoom) inner.style.backgroundImage = 'url("' + (img.currentSrc || img.src) + '")';
        render();
      }
      if (toggle) {
        toggle.setAttribute('aria-pressed', st.pinned ? 'true' : 'false');
        if (hint) hint.hidden = !st.pinned;
      }
      notes.forEach(function (n, i) { n.setAttribute('aria-pressed', st.pinned && st.target === i ? 'true' : 'false'); });
    }

    function fromClient(cx, cy) {
      var r = host.getBoundingClientRect();
      if (!r.width || !r.height) return;
      st.x = c01((cx - r.left) / r.width);
      st.y = c01((cy - r.top) / r.height);
      st.target = -1;
    }

    /* mouse and pen: the lens follows the pointer while it is over the object */
    host.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      st.hover = true; st.last = { x: e.clientX, y: e.clientY };
      fromClient(e.clientX, e.clientY);
      sync();
    });
    host.addEventListener('pointerleave', function (e) {
      if (e.pointerType === 'touch') return;
      st.hover = false; st.last = null; sync();
    });
    /* touch: a tap places the lens, then the lens itself is dragged */
    var tap = null;
    host.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'touch') return;
      if (e.target === lens || lens.contains(e.target)) return;
      tap = { x: e.clientX, y: e.clientY, t: Date.now() };
    });
    host.addEventListener('pointerup', function (e) {
      if (e.pointerType !== 'touch' || !tap) return;
      var moved = Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y);
      if (moved < 10 && Date.now() - tap.t < 450) {
        host.classList.add('is-touch');
        st.pinned = true; fromClient(e.clientX, e.clientY); sync();
      }
      tap = null;
    });
    host.addEventListener('pointercancel', function () { tap = null; });
    lens.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'touch') return;
      st.drag = true;
    });
    d.addEventListener('pointermove', function (e) {
      if (!st.drag) return;
      fromClient(e.clientX, e.clientY); sync();
    });
    var endDrag = function () { st.drag = false; };
    d.addEventListener('pointerup', endDrag);
    d.addEventListener('pointercancel', endDrag);

    /* the page moves under a resting pointer */
    addEventListener('scroll', function () {
      if (!st.hover || !st.last) return;
      requestAnimationFrame(function () { fromClient(st.last.x, st.last.y); sync(); });
    }, { passive: true });
    addEventListener('resize', function () { if (visible()) render(); }, { passive: true });

    /* keyboard and buttons */
    function pin(on) {
      st.pinned = on;
      if (!on) { st.target = -1; st.auto = false; }
      sync();
    }
    if (toggle) {
      toggle.addEventListener('click', function () { pin(!st.pinned); });
      toggle.addEventListener('keydown', function (e) {
        if (!st.pinned) return;
        var step = e.shiftKey ? 0.12 : 0.04, used = true;
        if (e.key === 'ArrowLeft') st.x = c01(st.x - step);
        else if (e.key === 'ArrowRight') st.x = c01(st.x + step);
        else if (e.key === 'ArrowUp') st.y = c01(st.y - step);
        else if (e.key === 'ArrowDown') st.y = c01(st.y + step);
        else if (e.key === 'Home') { st.x = start[0]; st.y = start[1]; }
        else used = false;
        if (used) { st.target = -1; e.preventDefault(); sync(); }
      });
    }
    notes.forEach(function (n, i) {
      var t = (n.getAttribute('data-target') || '').split(/\s+/).map(parseFloat);
      n.addEventListener('click', function () {
        st.x = t[0]; st.y = t[1]; st.target = i; st.pinned = true; st.auto = false; sync();
      });
    });

    return {
      host: host,
      setAuto: function (on) {
        if (st.autoOff && on) return;           /* dismissed with Escape: stay dismissed until the state resets */
        if (!on) st.autoOff = false;
        if (st.auto !== on) { st.auto = on; sync(); }
      },
      dismiss: function () {
        var was = visible();
        st.hover = false; st.pinned = false; st.target = -1;
        if (st.auto) { st.auto = false; st.autoOff = true; }
        sync();
        return was;
      },
      render: render
    };
  }

  $$('.loupe-host').forEach(function (h) { loupes.push(Loupe(h)); });
  d.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    loupes.forEach(function (l) { l.dismiss(); });
  });

  /* ======================================================================
     Layout modes, switched in place (rotation, window resize, browser zoom, a change of the
     reduced-motion setting). Nothing reloads. A switch takes the engine's attributes off,
     lets the stylesheet re-lay the page, mounts the engine again and puts the reader back
     on the same plate.
       wide    horizontal spine (pan) and a pinned peak
       narrow  vertical stack of the same plates, pinned peak
       static  reduced motion: everything stacked, nothing moves
     ====================================================================== */
  var MQ_REDUCE = matchMedia('(prefers-reduced-motion: reduce)');
  var MQ_WIDE = matchMedia('(min-width: 900px) and (min-height: 700px)');
  function wantMode() { return MQ_REDUCE.matches ? 'static' : (MQ_WIDE.matches ? 'wide' : 'narrow'); }
  /* a phone held sideways is too short for a pinned peak (its notes would not fit): the peak
     then stays a plain dark section and everything is still reachable */
  function wantPin(m) { return !(m === 'narrow' && innerWidth < 900 && innerHeight < 600); }

  var hall = $('#hall'), hallStage = $('.hall__stage', hall), rail = $('.hall__rail', hall);
  var peak = $('#peak'), peakStage = $('.peak__stage', peak);
  var peakLens = loupes.filter(function (l) { return l.host.id === 'lh-peak'; })[0];
  var plates = $$('.plate[id^="plate-"]', rail);
  var indexLinks = $$('.plate-index a');
  var EXTRA = 0.02;              /* the pan overshoot written on the rail */
  var S = { mode: root.getAttribute('data-mode') || 'static', pin: true, api: null, hallAct: null, peakAct: null, mounted: false };

  function railMetrics() {
    var vw = innerWidth, vh = innerHeight;
    var over = Math.max(rail.scrollWidth - vw, 0);
    return { vw: vw, vh: vh, over: over, T: over * (1 + EXTRA) };
  }
  function spanFor(m) {
    /* about 1.1 px of travel per px of scroll: a walk along a wall. The peak always owns the
       larger span, so the page is longest where it matters. */
    return clamp(1 + (m.T / 1.1) / m.vh, 3.2, 6);
  }
  /* reveal windows for plates that start off screen: the picture is uncovered as its plate
     crosses the right part of the viewport */
  function revealWindow(left, m) {
    if (left < m.vw * 0.96) return [-1, -0.5];
    var a = (left - m.vw * 0.96) / m.T, b = (left - m.vw * 0.60) / m.T;
    a = clamp(a, 0, 0.96); b = clamp(Math.max(b, a + 0.04), 0.04, 1);
    return [a, b];
  }

  /* put the engine's data attributes on the page for the current mode */
  function configure() {
    if (S.mode === 'wide') {
      var m = railMetrics();
      hall.setAttribute('data-sc-act', 'pan');
      hall.setAttribute('data-sc-span', spanFor(m).toFixed(2));
      hallStage.setAttribute('data-sc-stage', '');
      rail.setAttribute('data-sc-pan', String(EXTRA));
      hall.style.setProperty('--arc-shift', (-m.T * 0.5).toFixed(0) + 'px');
      plates.forEach(function (p) {
        var clip = $('[data-plate-clip]', p);
        if (!clip) return;
        var w = revealWindow(p.offsetLeft, m);
        clip.setAttribute('data-sc-reveal', 'left');
        clip.setAttribute('data-sc-reveal-at', w[0].toFixed(3) + ' ' + w[1].toFixed(3));
      });
    } else {
      /* narrow: the plates simply arrive as they are scrolled to */
      plates.forEach(function (p, i) { if (i > 0) p.setAttribute('data-sc-in', ''); });
    }
    if (S.pin) {
      peak.setAttribute('data-sc-act', 'pin');
      peak.setAttribute('data-sc-span', S.mode === 'wide' ? '6.8' : '5.6');
      peakStage.setAttribute('data-sc-stage', '');
      peak.classList.add('is-pin');
    }
    var pet = $('.petals');
    if (pet) { pet.setAttribute('data-sc-in', ''); pet.setAttribute('data-sc-stagger', '70'); }
    var lab = $('.close .label');
    if (lab) lab.setAttribute('data-sc-in', '');
  }

  /* take everything the engine wrote off again, and silence the old instance (the engine has
     no unmount, but it only drives the acts in its own list) */
  function teardown() {
    if (S.api) { S.api.acts.splice(0); S.api.worlds.splice(0); S.api.clips.splice(0); }
    [hall, peak].forEach(function (a) {
      a.removeAttribute('data-sc-act'); a.removeAttribute('data-sc-span');
      a.classList.remove('sc-act--pinned');
      a.style.height = ''; a.style.removeProperty('--sc-p');
    });
    hall.style.removeProperty('--arc-shift');
    [hallStage, peakStage].forEach(function (s) { s.removeAttribute('data-sc-stage'); s.classList.remove('sc-stage'); });
    peakStage.removeAttribute('data-sc-verify-state'); peakStage.removeAttribute('data-sc-verify-hold');
    rail.removeAttribute('data-sc-pan'); rail.style.transform = '';
    $$('[data-plate-clip]').forEach(function (c) { c.removeAttribute('data-sc-reveal'); c.removeAttribute('data-sc-reveal-at'); c.style.clipPath = ''; });
    $$('[data-sc-in],[data-sc-stagger],.sc-in').forEach(function (el) {
      el.removeAttribute('data-sc-in'); el.removeAttribute('data-sc-stagger');
      el.classList.remove('sc-in'); el.style.transitionDelay = '';
      [].forEach.call(el.children, function (k) { k.classList.remove('sc-in'); k.style.transitionDelay = ''; });
    });
    peak.classList.remove('is-pin', 'is-notes');
  }

  function mountEngine() {
    ScrollCraft.mount(d.body);
    S.api = ScrollCraft.instances[ScrollCraft.instances.length - 1];
    S.mounted = true;
    S.hallAct = S.mode === 'wide' ? S.api.acts.filter(function (a) { return a.el === hall; })[0] || null : null;
    S.peakAct = S.api.acts.filter(function (a) { return a.el === peak; })[0] || null;
  }

  function secProgress(el) {
    var v = parseFloat(el.style.getPropertyValue('--sc-p'));
    return isNaN(v) ? 0 : v;
  }
  function plateTargetY(plate) {
    if (!S.hallAct) return 0;
    var m = railMetrics();
    var cx = plate.offsetLeft + plate.offsetWidth / 2;
    var p = c01((cx - m.vw * 0.5) / Math.max(m.T, 1));
    return S.hallAct.top + p * (S.hallAct.height - m.vh);
  }
  function peakTargetY(p) { return S.peakAct ? S.peakAct.top + p * (S.peakAct.height - innerHeight) : 0; }

  /* where the reader is, so a layout switch can bring them back to the same place. It is
     recorded on every scroll frame, because the stylesheet re-lays the page the moment a media
     query flips, before any script can look */
  function captureAnchor() {
    var vh = innerHeight;
    var pr = peak.getBoundingClientRect();
    if (pr.top < vh * 0.5 && pr.bottom > vh * 0.5) {
      var pinned = S.pin && !!S.peakAct && S.mode !== 'static';
      var frac = pinned ? secProgress(peak) : c01((vh * 0.5 - pr.top) / Math.max(pr.height, 1));
      return { kind: 'peak', frac: frac };
    }
    if (pr.bottom <= vh * 0.5) {
      var after = [$('#petals'), $('#enter'), $('.foot')].filter(Boolean);
      var el = after.filter(function (e) { return e.getBoundingClientRect().bottom > 0; })[0] || after[after.length - 1];
      return { kind: 'after', el: el, top: el.getBoundingClientRect().top };
    }
    var best = plates[0], bd = -1e9;
    plates.forEach(function (p) {
      var r = p.getBoundingClientRect();
      /* wide: the plate nearest the middle; stacked: the plate with most of the screen */
      var score = S.mode === 'wide'
        ? -Math.abs(r.left + r.width / 2 - innerWidth * 0.45)
        : Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if (score > bd) { bd = score; best = p; }
    });
    return { kind: 'plate', el: best, top: best.getBoundingClientRect().top };
  }
  function restoreAnchor(a) {
    var y;
    if (a.kind === 'peak') {
      if (S.pin && S.peakAct && S.mode !== 'static') y = S.peakAct.top + a.frac * (S.peakAct.height - innerHeight);
      else { var r = peak.getBoundingClientRect(); y = scrollY + r.top + a.frac * r.height - innerHeight * 0.5; }
    } else if (a.kind === 'after') {
      y = scrollY + a.el.getBoundingClientRect().top - a.top;
    } else if (S.mode === 'wide' && S.hallAct) {
      y = plateTargetY(a.el);
    } else {
      y = scrollY + a.el.getBoundingClientRect().top - clamp(a.top, 0, innerHeight * 0.6);
    }
    scrollTo({ top: Math.max(0, y), behavior: 'instant' });
  }

  /* the wide spine after a plain resize (same mode) */
  function refreshWide() {
    var m = railMetrics();
    S.hallAct.span = spanFor(m);
    hall.setAttribute('data-sc-span', S.hallAct.span.toFixed(2));
    hall.style.setProperty('--arc-shift', (-m.T * 0.5).toFixed(0) + 'px');
    plates.forEach(function (pl) {
      var clip = $('[data-plate-clip]', pl);
      if (!clip) return;
      var w = revealWindow(pl.offsetLeft, m);
      S.hallAct.reveals.forEach(function (rv) { if (rv.el === clip) { rv.from = w[0]; rv.to = w[1]; } });
    });
    S.api.layout();
  }

  function applyMode(first) {
    var m = wantMode(), pin = wantPin(m);
    if (!first && m === S.mode && pin === S.pin) {
      if (S.mode === 'wide' && S.api && S.hallAct) refreshWide();
      return;
    }
    var anchor = first ? null : (S.held || S.anchor || captureAnchor());
    if (!first) teardown();
    S.mode = m; S.pin = pin;
    root.setAttribute('data-mode', m);
    if (m === 'static') {
      /* the engine is mounted once so the page reports ready; nothing in this layout carries a
         data-sc attribute, so nothing moves */
      if (!S.mounted) { try { mountEngine(); } catch (e) {} }
      S.hallAct = S.peakAct = null;
      if (peakLens) peakLens.setAuto(true);
    } else {
      configure();
      mountEngine();
      if (!S.pin && peakLens) peakLens.setAuto(true);
    }
    if (anchor) restoreAnchor(anchor);
    schedule();
  }

  /* ---- per-frame bespoke state (after the engine has read the scroll) ---- */
  var scheduled = false;
  function frame() {
    scheduled = false;
    if (!S.holding) S.anchor = captureAnchor();
    if (S.mode === 'static') return;

    /* the peak */
    if (S.pin && S.peakAct) {
      var p = secProgress(peak);
      var g0 = c01((p - 0.12) / 0.30), g = g0 * g0 * (3 - 2 * g0);
      var dim = c01((p - 0.07) / 0.20), wall = c01(1 - (p - 0.03) / 0.10);
      var n1 = c01((p - 0.42) / 0.07), n2 = c01((p - 0.56) / 0.07), n3 = c01((p - 0.70) / 0.07);
      peak.classList.toggle('is-notes', p >= 0.40);
      var r = peak.getBoundingClientRect();
      var live = r.bottom > 0 && r.top < innerHeight;
      if (live) {
        peakStage.setAttribute('data-sc-verify-state', [dim, g, wall, n1, n2, n3].map(function (v) { return Math.round(v * 20); }).join('.'));
        if (p >= 0.80) peakStage.setAttribute('data-sc-verify-hold', 'true'); else peakStage.removeAttribute('data-sc-verify-hold');
      } else {
        peakStage.removeAttribute('data-sc-verify-state');
        peakStage.removeAttribute('data-sc-verify-hold');
      }
      if (peakLens) peakLens.setAuto(p >= 0.78);
    }

    /* which plate is in front, for the index strip */
    if (S.mode === 'wide' && S.hallAct) {
      var m = railMetrics(), hp = secProgress(hall), best = null, bd = 1e9;
      plates.forEach(function (pl) {
        var cx = pl.offsetLeft + pl.offsetWidth / 2 - m.T * hp;
        var dd = Math.abs(cx - m.vw * 0.42);
        if (dd < bd) { bd = dd; best = pl; }
      });
      indexLinks.forEach(function (a) {
        var on = best && a.getAttribute('href') === '#' + best.id;
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }
  }
  /* two frames: the engine reads the scroll in its own frame callback, and this must run after it */
  function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(function () { requestAnimationFrame(frame); }); } }

  /* ---- listeners, set once; every one reads the current mode ---- */
  addEventListener('scroll', schedule, { passive: true });

  /* jumps: plate links and the index strip (in the stacked layouts the anchors work as they are) */
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#plate-"]');
    if (!a || S.mode !== 'wide' || !S.hallAct) return;
    var el = d.getElementById(a.getAttribute('href').slice(1));
    if (!el) return;
    e.preventDefault();
    scrollTo({ top: plateTargetY(el), behavior: 'smooth' });
  });

  /* keyboard focus on an off-screen plate: bring it to the middle */
  rail.addEventListener('focusin', function (e) {
    if (S.mode !== 'wide' || !S.hallAct) return;
    var pl = e.target.closest && e.target.closest('.plate[id^="plate-"]');
    if (!pl) return;
    var r2 = pl.getBoundingClientRect();
    if (r2.left >= 0 && r2.right <= innerWidth) return;
    scrollTo({ top: plateTargetY(pl), behavior: 'instant' });
  });
  /* keyboard focus on the peak controls: park the act where they are open */
  peak.addEventListener('focusin', function (e) {
    if (S.mode === 'static' || !S.pin || !S.peakAct || !e.target.closest || !e.target.closest('.peak__panel')) return;
    if (secProgress(peak) < 0.78) scrollTo({ top: peakTargetY(0.84), behavior: 'instant' });
  });
  /* a block that has not been revealed yet is not clickable; when focus reaches it, it is revealed at once */
  d.addEventListener('focusin', function (e) {
    var box = e.target.closest && e.target.closest('[data-sc-in]');
    if (!box || box.classList.contains('sc-in')) return;
    box.classList.add('sc-in');
    if (box.hasAttribute('data-sc-stagger')) [].forEach.call(box.children, function (k) { k.classList.add('sc-in'); });
  });

  var modeTimer = 0;
  /* the first event of a resize or media change freezes the anchor: what the page looks like
     after the browser has re-laid it is not where the reader was */
  function onChange() {
    if (!S.holding) { S.holding = true; S.held = S.anchor; }
    clearTimeout(modeTimer);
    modeTimer = setTimeout(function () { applyMode(false); S.holding = false; S.held = null; schedule(); }, 160);
  }
  addEventListener('resize', onChange, { passive: true });
  [MQ_REDUCE, MQ_WIDE].forEach(function (mq) { if (mq.addEventListener) mq.addEventListener('change', onChange); });

  /* ---- start ---- */
  if (S.mode === 'static') applyMode(true);
  else {
    var fontsReady = d.fonts && d.fonts.ready ? d.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise(function (res) { setTimeout(res, 1800); })]).then(function () { applyMode(true); });
  }
})();
