/* Entry page behaviour: the surface advances under the reader's own scroll.
   - The desk: the search field is typed for the reader (scroll is the
     playhead) while the spelling lens maps each group of letters to IAST.
     The reader's own typing takes over the moment they focus the field.
   - The listening window: a dark window on a bare desk opens as the reader
     scrolls. Sound only ever starts on a tap.
   - The desk at rest: the field is shown ready. Focus is never taken.
   Everything is a pure function of scroll position, so it reverses cleanly.
   Static mode (reduced motion, short screens, a stage that would not fit, no
   JS) shows every state at once and moves nothing. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  var api = window.ScrollCraft ? window.ScrollCraft.mount(doc.body) : null;
  var VL = window.VaniLens;
  if (!api || !VL) return;

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function smooth(x) { x = clamp01(x); return x * x * (3 - 2 * x); }
  function actOf(el) {
    for (var i = 0; i < api.acts.length; i++) if (api.acts[i].el === el) return api.acts[i];
    return null;
  }

  var heroAct = doc.getElementById('search');
  var listenAct = doc.getElementById('listen');
  var restAct = doc.getElementById('close');
  var heroStage = heroAct.querySelector('[data-sc-stage]');
  var listenStage = listenAct.querySelector('[data-sc-stage]');
  var restStage = restAct.querySelector('[data-sc-stage]');
  var plate = listenStage.querySelector('.plate');
  var playBtn = plate.querySelector('.player__btn');

  var deskInput = doc.getElementById('q-desk');
  var deskForm = deskInput.form;
  var deskLensRoot = doc.getElementById('lens-desk');
  var deskLens = VL.create(deskLensRoot);

  var restInput = doc.getElementById('q-rest');
  var restForm = restInput.form;
  var restLensRoot = doc.getElementById('lens-rest');
  var restLens = VL.create(restLensRoot);

  // Per act: a flat act shows every state at once and moves nothing.
  var flat = { hero: false, listen: false, rest: false };

  /* ------------------------------------------------------------ the demo */
  // The scripted typing the scroll plays: one word, three spellings. The first
  // screen already shows the result (Krishna, resolved); the scroll replays it
  // by erasing and typing the second and third spelling.
  var SEQ = (function () {
    var s = [];
    var k = 'Krishna';
    var q = 'Krsna';
    var t = 'Kṛṣṇa';
    var i;
    s.push(k, k, k);
    s.push('Krishn', 'Kris', 'K', '');
    for (i = 1; i <= q.length; i++) s.push(q.slice(0, i));
    s.push(q, q);
    s.push('Krs', 'K', '');
    for (i = 1; i <= t.length; i++) s.push(t.slice(0, i));
    s.push(t, t, t);
    return s;
  })();

  function demoText(p) {
    var f = (p - 0.04) / (0.9 - 0.04);
    if (f <= 0) return SEQ[0];
    return SEQ[Math.min(SEQ.length - 1, Math.floor(f * SEQ.length))];
  }

  var mode = 'demo'; // 'demo': scroll types. 'user': the reader types.
  var lastDemo = null;
  var heroSig = '';

  deskInput.addEventListener('focus', function () {
    if (mode === 'demo') {
      mode = 'user';
      lastDemo = null;
      if (deskInput.value) { deskInput.value = ''; deskLens.set(''); }
    }
  });
  deskInput.addEventListener('input', function () {
    mode = 'user';
    deskLens.set(deskInput.value, { announce: true });
  });
  deskInput.addEventListener('blur', function () {
    if (!deskInput.value) { mode = 'demo'; lastDemo = null; sync(); }
  });

  // Never send a half-typed demo word to the real search.
  deskForm.addEventListener('submit', function (e) {
    var m = VL.match(deskInput.value);
    var shownWord = mode === 'demo' && m && m.complete;
    if (!deskInput.value.trim() || (mode === 'demo' && !shownWord)) { e.preventDefault(); deskInput.focus(); }
  });
  restForm.addEventListener('submit', function (e) {
    if (!restInput.value.trim()) { e.preventDefault(); restInput.focus(); }
  });
  restInput.addEventListener('input', function () { restLens.set(restInput.value, { announce: true }); });

  function setHero(a) {
    if (flat.hero) { heroSig = ''; return; }
    if (mode === 'demo') {
      var text = demoText(a.p);
      if (text !== lastDemo) {
        lastDemo = text;
        deskInput.value = text;
        var r = deskLens.set(text);
        heroSig = text + '|' + r.count + '|' + (r.resolved ? 1 : 0);
      }
    } else {
      heroSig = 'user|' + deskInput.value.length;
    }
  }

  /* ------------------------------------------------- the listening window */
  var peakSig = '';
  var peakHold = false;
  function setPeak(a) {
    if (flat.listen) { peakSig = ''; return; }
    var o = smooth((a.p - 0.04) / 0.58);
    var e2 = smooth((o - 0.12) / 0.4);
    var drift = (0.5 - a.p) * 28; // the photograph drifts 28px over the act, so the hold is never still
    plate.style.setProperty('--o', o.toFixed(3));
    plate.style.setProperty('--e2', e2.toFixed(3));
    // Layers that are not yet visible must not take clicks or taps.
    plate.style.setProperty('--pe2', e2 > 0.5 ? 'auto' : 'none');
    plate.style.setProperty('--drift', drift.toFixed(1) + 'px');
    peakSig = Math.round(o * 40) + '|' + Math.round(e2 * 10) + '|' + Math.round(drift / 2);
    peakHold = false;
  }

  function measurePlate() {
    if (flat.listen) return;
    // The closed window sits on the centre of the stage. The card inside it
    // (title, line, player) is shifted there while closed and settles into its
    // place in the full layout as the window opens.
    var inner = plate.querySelector('.plate__in');
    inner.style.transform = 'none';
    var pr = plate.getBoundingClientRect();
    var player = plate.querySelector('.player').getBoundingClientRect();
    var h2 = plate.querySelector('h2').getBoundingClientRect();
    var bar = parseFloat(getComputedStyle(root).getPropertyValue('--bar-h')) || 56;
    var blockX = player.left - pr.left + player.width / 2;
    var blockY = (h2.top + player.bottom) / 2 - pr.top;
    var stageX = pr.width / 2;
    var stageY = bar + (pr.height - bar) / 2;
    plate.style.setProperty('--cx', stageX.toFixed(1) + 'px');
    plate.style.setProperty('--cy', stageY.toFixed(1) + 'px');
    plate.style.setProperty('--dx', (stageX - blockX).toFixed(1) + 'px');
    plate.style.setProperty('--dy', (stageY - blockY).toFixed(1) + 'px');
    inner.style.transform = '';
  }

  /* ---------------------------------------------------- the desk at rest */
  var restSig = '';
  var restHold = false;
  function setRest(a) {
    if (flat.rest) { restStage.classList.add('is-ready'); restSig = ''; return; }
    var ready = a.p > 0.3;
    restStage.classList.toggle('is-ready', ready);
    restSig = ready ? 'ready' : 'waiting';
    restHold = ready;
  }

  /* ----------------------------------------------------------------- nav */
  var navLinks = {
    listen: doc.querySelector('.menu__nav a[href="#listen"]'),
    start: doc.querySelector('.menu__nav a[href="#start"]')
  };
  var startSection = doc.getElementById('start');
  var lastNav = '';
  function setNav() {
    var mid = innerHeight * 0.5;
    var cur = '';
    var lr = listenAct.getBoundingClientRect();
    var sr = startSection.getBoundingClientRect();
    if (lr.top <= mid && lr.bottom >= mid) cur = 'listen';
    else if (sr.top <= mid && sr.bottom >= mid) cur = 'start';
    if (cur === lastNav) return;
    lastNav = cur;
    Object.keys(navLinks).forEach(function (k) {
      var a = navLinks[k];
      if (!a) return;
      if (k === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }

  /* ---------------------------------------------------------------- sync */
  function stamp(stage, act, isFlat, sig, hold) {
    if (isFlat || !act.live || !sig) {
      stage.removeAttribute('data-sc-verify-state');
      stage.removeAttribute('data-sc-verify-hold');
      return;
    }
    stage.setAttribute('data-sc-verify-state', sig);
    if (hold) stage.setAttribute('data-sc-verify-hold', 'true');
    else stage.removeAttribute('data-sc-verify-hold');
  }

  function sync() {
    var h = actOf(heroAct), l = actOf(listenAct), r = actOf(restAct);
    if (!h || !l || !r) return;
    setHero(h);
    setPeak(l);
    setRest(r);
    stamp(heroStage, h, flat.hero, heroSig, false);
    stamp(listenStage, l, flat.listen, peakSig, peakHold);
    stamp(restStage, r, flat.rest, restSig, restHold);
    setNav();
  }

  var ticking = false;
  addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; sync(); });
  }, { passive: true });

  /* ----------------------------------------------------------- flat acts */
  function overflows(act) {
    var fit = act.querySelector('[data-fit]');
    // The desk gets 16px of tolerance for the gentle parallax on the framed photograph.
    return !!fit && fit.scrollHeight - fit.clientHeight > (act === heroAct ? 16 : 2);
  }

  function setFlat(key, act, on) {
    flat[key] = on;
    act.classList.toggle('is-flat', on);
  }

  function apply() {
    var all = reduceMQ.matches || innerHeight < 600 || innerWidth < 320;
    root.classList.toggle('is-static', all);
    setFlat('hero', heroAct, all);
    setFlat('listen', listenAct, all);
    setFlat('rest', restAct, all);
    api.layout();
    if (!all) {
      // An act whose content would not fit the screen is shown flat on its own.
      var changed = false;
      if (overflows(heroAct)) { setFlat('hero', heroAct, true); changed = true; }
      if (overflows(listenAct)) { setFlat('listen', listenAct, true); changed = true; }
      if (overflows(restAct)) { setFlat('rest', restAct, true); changed = true; }
      if (changed) api.layout();
    }
    if (flat.hero) {
      deskInput.value = '';
      deskLens.set('Krishna');
    } else {
      mode = mode === 'user' && deskInput.value ? 'user' : 'demo';
      lastDemo = null;
    }
    if (flat.listen) ['--o', '--e2', '--pe2', '--drift'].forEach(function (k) { plate.style.removeProperty(k); }); else measurePlate();
    if (flat.rest) restStage.classList.add('is-ready'); else restStage.classList.remove('is-ready');
    sync();
  }

  var resizeTimer = 0;
  addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { apply(); }, 160);
  }, { passive: true });
  if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', function () { apply(); });

  /* ----------------------- focus inside the not yet visible part of the window */
  addEventListener('focusin', function (e) {
    var el = e.target;
    if (flat.listen || !el || !el.closest || !el.closest('.plate__photo, .plate__text, .plate__more')) return;
    var a = actOf(listenAct);
    if (a && a.p < 0.7) scrollTo({ top: a.top + (a.height - innerHeight) * 0.78, behavior: 'instant' });
  });

  /* -------------------------------------------- focus inside a closed drawer */
  addEventListener('focusin', function (e) {
    var el = e.target;
    var rv = el && el.closest && el.closest('[data-sc-reveal]');
    if (!rv) return;
    var m = /inset\(([\d.]+)(?:px|%)?\s+([\d.]+)(?:px|%)?\s+([\d.]+)/.exec(getComputedStyle(rv).clipPath || '');
    if (m && parseFloat(m[3]) > 0.5) el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
  });

  /* ---------------------------------------------------------------- boot */
  restLens.set('');
  apply();
  if (doc.fonts && doc.fonts.ready) {
    doc.fonts.ready.then(function () { apply(); });
  }
})();
