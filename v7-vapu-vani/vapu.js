/* Shared behaviour for both pages: the language list, the Nectar Drop player and the quiet reveals.
   Nothing here moves by itself. */
(function () {
  'use strict';

  /* ---- Language: a disclosure that Escape and a click outside both close ---- */
  var langs = [].slice.call(document.querySelectorAll('details[data-lang]'));
  /* one list open at a time */
  langs.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) langs.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    langs.forEach(function (d) {
      if (d.open) { d.open = false; var s = d.querySelector('summary'); if (s) s.focus(); }
    });
  });
  document.addEventListener('click', function (e) {
    langs.forEach(function (d) { if (d.open && !d.contains(e.target)) d.open = false; });
    var dead = e.target.closest && e.target.closest('a[aria-disabled="true"]');
    if (dead) e.preventDefault();
  });

  /* ---- Nectar Drop: one audio file, loaded only when the reader presses play ---- */
  function fmt(t) {
    if (!isFinite(t)) return '0:00';
    var m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  [].forEach.call(document.querySelectorAll('[data-nd]'), function (box) {
    var audio = box.querySelector('audio');
    var btn = box.querySelector('.nd__btn');
    var meta = box.querySelector('.nd__meta');
    var time = box.querySelector('.nd__time');
    var bar = box.querySelector('.nd__bar i');
    if (!audio || !btn) return;
    audio.removeAttribute('controls');
    audio.hidden = true;
    btn.hidden = false;
    meta.hidden = false;
    box.classList.add('nd--js');
    var err = null;
    function state(s) {
      box.setAttribute('data-state', s);
      btn.setAttribute('aria-label', s === 'playing' ? 'Pause the Nectar Drop' : 'Play the Nectar Drop');
    }
    btn.addEventListener('click', function () {
      if (audio.paused) {
        if (err) { err.remove(); err = null; }
        var p = audio.play();
        if (p && p.catch) p.catch(function () { fail(); });
      } else audio.pause();
    });
    audio.addEventListener('play', function () { state('playing'); });
    audio.addEventListener('pause', function () { state('paused'); });
    audio.addEventListener('ended', function () { state('paused'); bar.style.transform = 'scaleX(0)'; });
    audio.addEventListener('timeupdate', function () {
      time.textContent = fmt(audio.currentTime) + ' / ' + fmt(audio.duration);
      bar.style.transform = 'scaleX(' + (audio.duration ? audio.currentTime / audio.duration : 0).toFixed(4) + ')';
    });
    audio.addEventListener('loadedmetadata', function () { time.textContent = '0:00 / ' + fmt(audio.duration); });
    function fail() {
      state('paused');
      if (err) return;
      err = document.createElement('p');
      err.className = 'nd__err'; err.setAttribute('role', 'status');
      err.textContent = 'The audio could not be loaded. Try again later.';
      box.appendChild(err);
    }
    audio.addEventListener('error', fail);
    state('paused');
  });

  /* ---- Quiet reveals (main page only): once, opacity and a small rise, never for reduced motion ---- */
  var items = [].slice.call(document.querySelectorAll('[data-reveal]'));
  if (items.length && 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('rv');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });
  }
})();
