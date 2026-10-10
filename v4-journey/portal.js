/* Vanipedia main page: the timeline selector. Without scripts every year is
   listed in full. With scripts the years become buttons and one is shown at a
   time; nothing animates and the box never changes height. */
(function () {
  'use strict';
  var box = document.getElementById('years');
  if (!box) return;
  var list = box.querySelector('.years__list');
  var items = [].slice.call(list.children);
  if (!items.length) return;

  var row = document.createElement('ul');
  row.className = 'years__btns';
  var buttons = items.map(function (li, i) {
    var item = document.createElement('li');
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'years__btn';
    b.textContent = li.getAttribute('data-year');
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-controls', li.id);
    b.addEventListener('click', function () { select(i); });
    item.appendChild(b);
    row.appendChild(item);
    return b;
  });
  box.insertBefore(row, list);

  function select(n) {
    items.forEach(function (li, i) {
      li.hidden = i !== n;
      buttons[i].setAttribute('aria-pressed', i === n ? 'true' : 'false');
    });
  }
  select(0);
})();
