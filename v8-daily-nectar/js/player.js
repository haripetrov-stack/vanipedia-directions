/* v8: tap-to-play for a Nectar Drop. No autoplay, preload stays "none" until the
   visitor presses play. Without this script the native <audio controls> shows. */
(function () {
  'use strict';
  function fmt(s) {
    if (!isFinite(s)) return '';
    var m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ':' + (r < 10 ? '0' : '') + r;
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-player]'), function (box) {
    var audio = box.querySelector('audio');
    var btn = box.querySelector('[data-play]');
    var word = box.querySelector('.player__word');
    var time = box.querySelector('[data-time]');
    var status = box.querySelector('[data-status]');
    if (!audio || !btn) return;
    var what = box.getAttribute('data-label') || 'the Nectar Drop';

    audio.controls = false;
    btn.hidden = false;
    btn.setAttribute('aria-label', 'Play ' + what);

    function set(playing) {
      box.classList.toggle('is-playing', playing);
      if (word) word.textContent = playing ? 'Pause' : 'Play';
      btn.setAttribute('aria-label', (playing ? 'Pause ' : 'Play ') + what);
    }
    btn.addEventListener('click', function () {
      if (audio.paused) {
        if (status) status.textContent = 'Loading';
        var p = audio.play();
        if (p && p.catch) p.catch(function () { if (status) status.textContent = 'The recording could not be played here.'; });
      } else {
        audio.pause();
      }
    });
    audio.addEventListener('playing', function () { set(true); if (status) status.textContent = ''; });
    audio.addEventListener('pause', function () { set(false); });
    audio.addEventListener('ended', function () { set(false); if (time) time.textContent = ''; });
    audio.addEventListener('waiting', function () { if (status) status.textContent = 'Loading'; });
    audio.addEventListener('error', function () { set(false); if (status) status.textContent = 'The recording could not be played here.'; });
    audio.addEventListener('timeupdate', function () {
      if (!time) return;
      var d = fmt(audio.duration);
      time.textContent = fmt(audio.currentTime) + (d ? ' / ' + d : '');
    });
  });
})();
