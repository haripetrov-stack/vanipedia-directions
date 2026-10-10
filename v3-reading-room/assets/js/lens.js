/* The transliteration lens.
   A small, real word list and a real matcher. As a spelling is typed, each
   group of letters is mapped to the IAST letters it stands for, cell by cell.
   This is a demonstration of the planned search behaviour: it reads the word
   list below and nothing else, and it never returns search results. */
(function (global) {
  'use strict';

  var SLOTS = 10;

  function same(letters) {
    return letters.map(function (l) { return [l, l]; });
  }

  // typed group -> IAST group. An empty typed group is a letter the plain
  // spelling leaves out (Vrindavan: the final a).
  var LEMMAS = [
    { id: 'krishna', spellings: [
      { text: 'Krishna', pairs: [['K', 'K'], ['ri', 'ṛ'], ['sh', 'ṣ'], ['n', 'ṇ'], ['a', 'a']] },
      { text: 'Krsna', pairs: [['K', 'K'], ['r', 'ṛ'], ['s', 'ṣ'], ['n', 'ṇ'], ['a', 'a']] },
      { text: 'Kṛṣṇa', pairs: same(['K', 'ṛ', 'ṣ', 'ṇ', 'a']) }
    ] },
    { id: 'prabhupada', spellings: [
      { text: 'Prabhupada', pairs: [['P', 'P'], ['r', 'r'], ['a', 'a'], ['bh', 'bh'], ['u', 'u'], ['p', 'p'], ['a', 'ā'], ['d', 'd'], ['a', 'a']] },
      { text: 'Prabhupāda', pairs: same(['P', 'r', 'a', 'bh', 'u', 'p', 'ā', 'd', 'a']) }
    ] },
    { id: 'vrindavan', spellings: [
      { text: 'Vrindavan', pairs: [['V', 'V'], ['ri', 'ṛ'], ['n', 'n'], ['d', 'd'], ['a', 'ā'], ['v', 'v'], ['a', 'a'], ['n', 'n'], ['', 'a']] },
      { text: 'Vṛndāvana', pairs: same(['V', 'ṛ', 'n', 'd', 'ā', 'v', 'a', 'n', 'a']) }
    ] },
    { id: 'bhagavatam', spellings: [
      { text: 'Bhagavatam', pairs: [['Bh', 'Bh'], ['a', 'ā'], ['g', 'g'], ['a', 'a'], ['v', 'v'], ['a', 'a'], ['t', 't'], ['a', 'a'], ['m', 'm']] },
      { text: 'Bhāgavatam', pairs: same(['Bh', 'ā', 'g', 'a', 'v', 'a', 't', 'a', 'm']) }
    ] }
  ];

  function isUpper(ch) { return ch !== ch.toLowerCase() && ch === ch.toUpperCase(); }

  // Walk the typed text against one spelling. Returns null when the typed text
  // is not a prefix of the spelling, otherwise the cells consumed so far.
  function consume(typed, pairs) {
    var low = typed.toLowerCase();
    var pos = 0;
    var cells = [];
    var i;
    for (i = 0; i < pairs.length; i++) {
      var a = pairs[i][0];
      var b = pairs[i][1];
      var al = a.toLowerCase();
      var rest = low.slice(pos);
      if (al === '') {
        // A letter the plain spelling omits: only shown once everything typed is placed.
        if (rest.length === 0) cells.push({ typed: '', iast: b, state: 'add' });
        continue;
      }
      if (rest.length === 0) break;
      if (rest.indexOf(al) === 0) {
        var t = typed.substr(pos, al.length);
        var out = isUpper(t.charAt(0)) ? b.charAt(0).toUpperCase() + b.slice(1) : b;
        cells.push({ typed: t, iast: out, state: a === b ? 'same' : 'diff' });
        pos += al.length;
      } else if (al.indexOf(rest) === 0) {
        var tp = typed.slice(pos);
        var outp = isUpper(tp.charAt(0)) ? b.charAt(0).toUpperCase() + b.slice(1) : b;
        cells.push({ typed: tp, iast: outp, state: 'pending' });
        pos = low.length;
        break;
      } else {
        return null;
      }
    }
    if (pos < low.length) return null;
    return cells;
  }

  function match(raw) {
    var typed = (raw || '').normalize('NFC').trim();
    if (!typed) return null;
    var l, s;
    for (l = 0; l < LEMMAS.length; l++) {
      for (s = 0; s < LEMMAS[l].spellings.length; s++) {
        var sp = LEMMAS[l].spellings[s];
        var cells = consume(typed, sp.pairs);
        if (cells) {
          var settled = cells.length > 0 && cells.every(function (c) { return c.state !== 'pending'; });
          // Complete when the last non-empty typed group is placed and no pair is left.
          var consumed = cells.filter(function (c) { return c.state !== 'add'; }).length;
          var needed = sp.pairs.filter(function (p) { return p[0] !== ''; }).length;
          var complete = settled && consumed === needed;
          var searched = cells.map(function (c) { return c.iast; }).join('');
          return { lemma: LEMMAS[l], spelling: sp, cells: cells, complete: complete, searched: searched, typed: typed };
        }
      }
    }
    return null;
  }

  function fill(list, cells, key) {
    var items = list.children;
    var i;
    for (i = 0; i < SLOTS; i++) {
      var li = items[i];
      if (!li) continue;
      var c = cells && cells[i];
      if (!c) {
        li.className = '';
        li.textContent = '';
        continue;
      }
      var txt = key === 'typed' ? c.typed : c.iast;
      if (li.textContent !== txt) li.textContent = txt;
      var cls = 'on ' + c.state;
      if (li.className !== cls) li.className = cls;
    }
  }

  // Build the slots once.
  function ensureSlots(list) {
    while (list.children.length < SLOTS) list.appendChild(document.createElement('li'));
  }

  function create(root, options) {
    options = options || {};
    var typedList = root.querySelector('[data-cells="typed"]');
    var iastList = root.querySelector('[data-cells="iast"]');
    var sameEl = root.querySelector('[data-same]');
    var noneEl = root.querySelector('[data-none]');
    var srEl = root.querySelector('[data-sr]');
    var lineEl = root.querySelector('[data-line]');
    var srTimer = 0;
    if (typedList) ensureSlots(typedList);
    if (iastList) ensureSlots(iastList);

    function renderSame(m) {
      if (!sameEl) return;
      while (sameEl.firstChild) sameEl.removeChild(sameEl.firstChild);
      var lead = document.createElement('span');
      lead.textContent = 'Same search:';
      sameEl.appendChild(lead);
      m.lemma.spellings.forEach(function (sp, i) {
        if (i) {
          var dot = document.createElement('i');
          dot.setAttribute('aria-hidden', 'true');
          dot.textContent = '·';
          sameEl.appendChild(dot);
        }
        var b = document.createElement('b');
        b.textContent = sp.text;
        sameEl.appendChild(b);
      });
    }

    function set(text, opts) {
      opts = opts || {};
      var m = match(text);
      var typed = (text || '').trim();
      if (typedList) fill(typedList, m && m.cells, 'typed');
      if (iastList) fill(iastList, m && m.cells, 'iast');
      var resolved = !!(m && m.complete);
      root.classList.toggle('is-resolved', resolved);
      if (m && resolved) renderSame(m);
      if (lineEl) {
        lineEl.textContent = m && resolved ? 'Searched as ' + m.searched : '';
      }
      if (noneEl) {
        noneEl.textContent = !m && typed.length > 1 ? 'No mapping for this word in the demonstration. The search itself still runs.' : '';
      }
      if (srEl && opts.announce) {
        clearTimeout(srTimer);
        srTimer = setTimeout(function () {
          srEl.textContent = m && resolved
            ? m.typed + ' is searched as ' + m.searched + '. Same search for ' + m.lemma.spellings.map(function (s) { return s.text; }).join(', ') + '. Demonstration, not live results.'
            : '';
        }, 500);
      }
      return { match: m, resolved: resolved, count: m ? m.cells.length : 0, searched: m ? m.searched : '' };
    }

    return { set: set, match: match };
  }

  global.VaniLens = { create: create, match: match, LEMMAS: LEMMAS, SLOTS: SLOTS };
})(window);
