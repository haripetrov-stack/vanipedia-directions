/* common.js: the few controls both pages share. No frameworks, no network.
   Language list, links that are not built yet, the one audio button. */
(function () {
  'use strict';

  // Links marked aria-disabled lead nowhere yet (prototype). They must not jump the page.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[aria-disabled="true"]');
    if (a) e.preventDefault();
  });

  // Language: Escape closes it and returns focus; a click elsewhere closes it too.
  var lang = document.querySelector('details.lang');
  if (lang) {
    var summary = lang.querySelector('summary');
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lang.open) { lang.open = false; summary.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (lang.open && !lang.contains(e.target)) lang.open = false;
    });
  }

  // The Nectar Drop: nothing loads until the reader taps. One tap plays, one tap pauses.
  Array.prototype.forEach.call(document.querySelectorAll('[data-player]'), function (box) {
    var audio = box.querySelector('[data-player-audio]');
    var btn = box.querySelector('[data-player-btn]');
    var bar = box.querySelector('[data-player-bar]');
    if (!audio || !btn) return;
    audio.removeAttribute('controls');
    audio.preload = 'none';

    function set(playing) {
      btn.setAttribute('data-playing', playing ? 'true' : 'false');
      btn.setAttribute('aria-label', playing ? 'Pause the Nectar Drop' : 'Play the Nectar Drop');
    }
    btn.addEventListener('click', function () {
      if (audio.paused) {
        var p = audio.play();
        if (p && p.catch) p.catch(function () { audio.setAttribute('controls', ''); audio.style.display = 'block'; set(false); });
      } else {
        audio.pause();
      }
    });
    audio.addEventListener('play', function () { set(true); });
    audio.addEventListener('pause', function () { set(false); });
    audio.addEventListener('ended', function () { set(false); if (bar) bar.style.transform = 'scaleX(0)'; });
    audio.addEventListener('timeupdate', function () {
      if (bar && audio.duration) bar.style.transform = 'scaleX(' + Math.min(audio.currentTime / audio.duration, 1).toFixed(4) + ')';
    });
    audio.addEventListener('error', function () {
      audio.setAttribute('controls', ''); audio.style.display = 'block'; set(false);
    });
  });
})();
