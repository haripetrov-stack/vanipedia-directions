/* Shared behaviour for both pages: bar disclosures, Escape, the "Search" link,
   try-chips, the audio card and the small reveals on the Vanipedia page.
   Nothing here moves by itself. */
(function () {
  'use strict';

  var doc = document;
  var wide = matchMedia('(min-width: 1000px)');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var menu = doc.getElementById('menu');
  var lang = doc.getElementById('language');

  /* ---- bar disclosures ------------------------------------------------- */
  function syncMenu() {
    if (!menu) return;
    if (wide.matches) menu.setAttribute('open', '');
    else menu.removeAttribute('open');
  }
  syncMenu();
  if (wide.addEventListener) wide.addEventListener('change', syncMenu);

  function closable(d) { return d && d.open && !(d === menu && wide.matches); }

  [menu, lang].forEach(function (d) {
    if (!d) return;
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      [menu, lang].forEach(function (o) {
        if (o && o !== d && closable(o)) o.removeAttribute('open');
      });
    });
  });

  doc.addEventListener('pointerdown', function (e) {
    [menu, lang].forEach(function (d) {
      if (closable(d) && !d.contains(e.target)) d.removeAttribute('open');
    });
  });

  // Escape closes anything that opened, and hands focus back to its button.
  doc.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    [menu, lang].forEach(function (d) {
      if (!closable(d)) return;
      var had = d.contains(doc.activeElement);
      d.removeAttribute('open');
      var s = d.querySelector('summary');
      if (had && s) s.focus();
    });
  });

  if (menu) {
    menu.addEventListener('click', function (e) {
      if (!wide.matches && e.target.closest && e.target.closest('a')) menu.removeAttribute('open');
    });
  }

  Array.prototype.forEach.call(doc.querySelectorAll('a[href="#language"]'), function (a) {
    a.addEventListener('click', function (e) {
      if (!lang) return;
      e.preventDefault();
      lang.setAttribute('open', '');
      var s = lang.querySelector('summary');
      if (s) s.focus();
    });
  });

  // Links to a prototype page that does not exist yet do nothing.
  Array.prototype.forEach.call(doc.querySelectorAll('a[aria-disabled="true"]'), function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); });
  });

  /* ---- the Search link in the bar -------------------------------------- */
  Array.prototype.forEach.call(doc.querySelectorAll('[data-focus-search]'), function (a) {
    a.addEventListener('click', function (e) {
      var target = doc.querySelector(a.getAttribute('href'));
      var input = target && target.querySelector('input[name="s"]');
      if (!target || !input) return;
      e.preventDefault();
      if (menu && !wide.matches) menu.removeAttribute('open');
      input.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', a.getAttribute('href'));
    });
  });

  /* ---- try-chips -------------------------------------------------------- */
  doc.addEventListener('click', function (e) {
    var chip = e.target.closest && e.target.closest('[data-try]');
    if (!chip) return;
    var input = doc.getElementById(chip.getAttribute('data-for'));
    if (!input) return;
    input.value = chip.getAttribute('data-try');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  /* ---- lens on a plain search form (the Vanipedia page) ----------------- */
  Array.prototype.forEach.call(doc.querySelectorAll('[data-lens-simple]'), function (root) {
    var input = doc.getElementById(root.getAttribute('data-lens-simple'));
    if (!input || !window.VaniLens) return;
    var lens = window.VaniLens.create(root);
    input.addEventListener('input', function () { lens.set(input.value, { announce: true }); });
  });

  /* ---- audio card -------------------------------------------------------- */
  function fmt(t) {
    if (!isFinite(t) || t < 0) return '0:00';
    var m = Math.floor(t / 60);
    var s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  var players = [];
  Array.prototype.forEach.call(doc.querySelectorAll('[data-player]'), function (root) {
    var audio = root.querySelector('audio');
    var btn = root.querySelector('.player__btn');
    var range = root.querySelector('.player__range');
    var cur = root.querySelector('[data-cur]');
    var dur = root.querySelector('[data-dur]');
    var msg = root.querySelector('.player__msg');
    if (!audio || !btn) return;
    var label = btn.getAttribute('data-label') || 'Play';
    audio.removeAttribute('controls');
    root.classList.add('is-enhanced');
    players.push({ root: root, audio: audio });

    function say(t) { if (msg) msg.textContent = t || ''; }
    function setPlaying(on) {
      root.classList.toggle('is-playing', on);
      btn.setAttribute('aria-label', (on ? 'Pause: ' : 'Play: ') + label);
    }
    setPlaying(false);

    btn.addEventListener('click', function () {
      say('');
      if (audio.paused) {
        players.forEach(function (p) { if (p.audio !== audio) p.audio.pause(); });
        var pr = audio.play();
        if (pr && pr.catch) pr.catch(function () {
          say('The recording could not be played. Check the connection and try again.');
          setPlaying(false);
        });
      } else {
        audio.pause();
      }
    });
    audio.addEventListener('play', function () { setPlaying(true); });
    audio.addEventListener('pause', function () { setPlaying(false); });
    audio.addEventListener('ended', function () {
      setPlaying(false);
      if (range) range.value = 0;
      if (cur) cur.textContent = '0:00';
    });
    audio.addEventListener('error', function () {
      setPlaying(false);
      say('The recording could not be loaded. Check the connection and try again.');
    });
    audio.addEventListener('loadedmetadata', function () {
      if (dur && isFinite(audio.duration)) dur.textContent = fmt(audio.duration);
      if (range) range.disabled = false;
    });
    audio.addEventListener('timeupdate', function () {
      if (cur) cur.textContent = fmt(audio.currentTime);
      if (range && isFinite(audio.duration) && audio.duration > 0) {
        range.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
        range.setAttribute('aria-valuetext', fmt(audio.currentTime) + ' of ' + fmt(audio.duration));
      }
    });
    if (range) {
      range.disabled = true;
      range.addEventListener('input', function () {
        if (isFinite(audio.duration)) audio.currentTime = (range.value / 1000) * audio.duration;
      });
    }
  });

  /* ---- small reveals (Vanipedia page only; the entry page uses the engine) */
  var rv = doc.querySelectorAll('[data-rv]');
  if (rv.length) {
    if ('IntersectionObserver' in window && !reduce.matches) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.add('rv-in');
          io.unobserve(en.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
      Array.prototype.forEach.call(rv, function (el) { io.observe(el); });
    } else {
      Array.prototype.forEach.call(rv, function (el) { el.classList.add('rv-in'); });
    }
  }
})();
