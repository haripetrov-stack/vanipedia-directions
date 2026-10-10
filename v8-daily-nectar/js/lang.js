/* v8: the language panel. Language names, no flags. Escape closes it and returns focus. */
(function () {
  'use strict';
  var doc = document, lang = doc.getElementById('lang');
  if (!lang) return;
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lang.open) {
      lang.open = false;
      var s = lang.querySelector('summary');
      if (s) s.focus();
    }
  });
  doc.addEventListener('click', function (e) {
    var t = e.target;
    if (lang.open && !lang.contains(t) && !(t.closest && t.closest('[data-open-lang]'))) lang.open = false;
  });
  Array.prototype.forEach.call(doc.querySelectorAll('[data-open-lang]'), function (a) {
    a.addEventListener('click', function () {
      lang.open = true;
      var s = lang.querySelector('summary');
      if (s) s.focus();
    });
  });
})();
