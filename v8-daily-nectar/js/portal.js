/* v8 Daily Nectar: Vanipedia main page. Calm and stable: there are no scroll effects here, so the
   scroll-craft engine script is not loaded (only its stylesheet floor). Prototype links do nothing.
   The language panel is in lang.js, the player in player.js. */
(function () {
  'use strict';
  Array.prototype.forEach.call(document.querySelectorAll('a[data-proto]'), function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); });
  });
})();
