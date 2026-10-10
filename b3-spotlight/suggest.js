(function () {
var D = document, $ = function (i) { return D.getElementById(i); };
var q = $('q'), lb = $('lb'), st = $('starts'), cnt = $('cnt'), pal = $('pal');
if (!q || !lb || !st || !pal) return;
var U = { so: 'https://vanisource.org/wiki/', me: 'https://vanimedia.org/wiki/', pe: 'https://vanipedia.org/wiki/', qu: 'https://vaniquotes.org/wiki/' };
var NM = { so: 'Vanisource', me: 'Vanimedia', pe: 'Vanipedia', qu: 'Vaniquotes' };
var MK = new RegExp('[' + String.fromCharCode(768) + '-' + String.fromCharCode(879) + ']', 'g');
var E = [], opts = [], act = -1;
function fold(s) {
return s.normalize('NFD').replace(MK, '').toLowerCase().replace(/sh/g, 's').replace(/ch/g, 'c').replace(/ri/g, 'r').replace(/w/g, 'v');
}
function words(s) { return fold(s).split(/[^a-z0-9]+/).filter(Boolean); }
function slug(t) { return t.normalize('NFD').replace(MK, '').replace(/ /g, '_'); }
function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
// Line format: title|slug (if it differs from the title)|extra words|weight
function add(site, kind, pre, txt) {
txt.split('~').forEach(function (l) {
var p = l.split('|'), t = p[0], s = p[1] || slug(t), u;
u = s.indexOf('//') > 0 || s.slice(-5) == '.html' ? s : U[site] + (s.charAt(0) == '!' ? s.slice(1) : pre + s);
E.push({ s: site, k: kind, t: t, u: u, f: fold(t), tw: words(t), kw: words(p[2] || ''), wt: +p[3] || 0 });
});
}
add('so', 'Book', '',
'Bhagavad-gītā As It Is||gita bhagavat|9~Bhagavad-gītā As It Is (1972)||gita|4~Bhagavad-gītā As It Is (1983+)|Bhagavad-gita_As_It_Is_(1983%2B)|gita|3~' +
'Bhagavad Gita As It Is (1968)|Bhagavad_Gita_As_It_Is_(1968)_Collier-Macmillan_Abridged_Edition|geeta|1~Srimad Bhagwatam (1962-65)||bhagavatam|2~' +
'Śrīmad-Bhāgavatam (1972-77)||bhagwatam|5~Śrīmad-Bhāgavatam||bhagwatam|9~Śrī Caitanya-caritāmṛta (1975)||3~Śrī Caitanya-caritāmṛta (1996)|Sri_Caitanya-caritamrta||5~' +
'The Nectar of Instruction (1975)||3~Śrī Īśopaniṣad (1974)||2~Śrī Īśopaniṣad (2001)||2~' +
'Kṛṣṇa, The Supreme Personality of Godhead (1970)|Krsna_The_Supreme_Personality_of_Godhead_(1970)||6~Kṛṣṇa, The Supreme Personality of Godhead (1996+)|Krsna_The_Supreme_Personality_of_Godhead_(1996%2B)||5~' +
'Teachings of Lord Chaitanya (1968)~Teachings of Lord Caitanya (1975)~Teachings of Lord Caitanya (2011)~Nectar of Devotion (1970)||2~Nectar of Devotion (1982)||2~' +
'Beyond Birth and Death~Easy Journey to Other Planets~Elevation to Kṛṣṇa Consciousness~Gītār Gān~Kṛṣṇa Consciousness, The Matchless Gift~' +
'Kṛṣṇa Consciousness, The Topmost Yoga System|Krsna_Consciousness_The_Topmost_Yoga_System~Perfect Questions, Perfect Answers~The Perfection of Yoga (1972)~The Perfection of Yoga (1983)~' +
'Rāja-Vidyā: The King of Knowledge|Raja-Vidya_The_King_of_Knowledge~Teachings of Lord Kapila|Teachings_of_Lord_Kapila,_the_Son_of_Devahuti~' +
'Transcendental Teachings of Prahlāda Mahārāja~Beyond Illusion & Doubt|Beyond_Illusion_%26_Doubt~Civilization and Transcendence~' +
'Dharma: The Way of Transcendence|Dharma_-_The_Way_of_Transcendence~In Search of the Ultimate Goal of Life~' +
'The Laws of Nature, An Infallible Justice|The_Laws_of_Nature_An_Infallible_Justice~Life Comes From Life~Light of the Bhagavata~' +
'Message of Godhead (1955)~Message of Godhead (1990)~Narada Bhakti Sutra~The Path of Perfection~Renunciation Through Wisdom~' +
'The Science of Self-Realization~Teachings of Queen Kuntī~The Quest for Enlightenment');
add('so', 'Lectures', 'Category:Lectures_-_',
'Bhagavad-gītā Lectures|Bhagavad-gita_As_It_Is|gita~Śrīmad-Bhāgavatam Lectures|Srimad-Bhagavatam|bhagavatam~Śrī Caitanya-caritāmṛta Lectures|Caitanya-caritamrta~' +
'Śrī Brahma-saṁhitā Lectures|Brahma-samhita~Lord Kapila Series|Lord_Kapila_Series~Queen Kuntī Series|Queen_Kunti_Series~' +
'Yoga System Series|!Category:Yoga_System_Bhagavad-gita_Chapter_6|gita~Śrī Īśopaniṣad Lectures|Isopanisad~Nectar of Devotion Lectures|Nectar_of_Devotion~' +
'Arrival and Departure Talks|!Category:Arrival_and_Departure_Talks~Cornerstone Ceremonies|Cornerstone_Ceremonies~Festival Lectures|Festival~' +
'General Lectures|General~Initiations|Initiations~Song Purports|Purports_to_Songs~Wedding Ceremonies|Wedding_Ceremonies~' +
'Lectures by Year|by_Date|date|8~Lectures by Place|by_Place||3~Lectures by volume and verse|by_Type');
var Y = { 1966: 'lt', 1967: 'lct', 1968: 'lctw', 1969: 'lct', 1970: 'lct', 1971: 'lct', 1972: 'lctw', 1973: 'lctw', 1974: 'lctw', 1975: 'lctw', 1976: 'lctw', 1977: 'lctw' };
var T = { c: 'Conversations', l: 'Lectures', t: 'Letters', w: 'Morning Walks' };
add('so', 'By year', 'Category:', '1947 to 1964 Letters|1947_to_1964_-_Letters~1965 Letters|1965_-_Letters');
Object.keys(Y).forEach(function (y) {
Y[y].split('').forEach(function (c) { add('so', 'By year', 'Category:', y + ' ' + T[c] + '|' + y + '_-_' + T[c].replace(' ', '_')); });
});
add('me', 'Media', '',
'Audio of Śrīla Prabhupāda|Audio|lectures recordings|6~Video of Śrīla Prabhupāda|Video|films|6~Images of Śrīla Prabhupāda|Images|photographs galleries|5~' +
'A Multi-language Subtitle Project|Multi-language_Subtitle_Project~His 60 Ways to Study His Books|http://vanimedia.org/w/images/c/cd/60_Ways_to_Read_Poster_AO_841x1189.pdf|poster');
add('pe', 'Encyclopedia', '',
'Vanipedia main page|vanipedia.html|encyclopedia home|4~Śrīla Prabhupāda: The Founder-Ācārya of ISKCON|Srila_Prabhupada:_The_Founder-Acarya_of_ISKCON_-_A_GBC_Foundational_Document|gbc document|4~' +
'Absorbed in Thought of God~Predicament of Modern Man~About Vanipedia|Vanipedia:About~Methodology for AI-Assisted Articles|Vanipedia:Methodology_for_AI-Assisted_Articles|editorial');
add('pe', 'Audio', '', 'Nectar Drops|Category:Nectar_Drops_from_Srila_Prabhupada|audio clips short|6');
add('qu', 'Quotes', '',
'Vaniquotes: quotes by theme|Main_Page|topics|5~Quotes with audio clips|Category:Pages_with_Prabhupada%27s_Audio_-_Umbrella_Category|~About Vaniquotes|Vaniquotes:About');
function score(e, TK, Q) {
var n = 0, i, j, b, x;
for (i = 0; i < TK.length; i++) {
b = 0;
for (j = 0; j < e.tw.length; j++) {
x = e.tw[j];
if (x == TK[i]) { b = 30; break; }
if (x.indexOf(TK[i]) == 0) b = Math.max(b, 20);
}
if (!b && e.f.indexOf(TK[i]) > -1) b = 8;
for (j = 0; !b && j < e.kw.length; j++) {
x = e.kw[j];
if (x == TK[i]) b = 15; else if (x.indexOf(TK[i]) == 0) b = 10;
}
if (!b) return 0;
n += b;
}
return n + (e.f.indexOf(Q) == 0 ? 10 : 0) + e.wt;
}
function find(v) {
var TK = words(v), Q = fold(v).trim(), r = [], g = {}, o = [];
if (!TK.length) return o;
E.forEach(function (e) { var s = score(e, TK, Q); if (s) r.push([s, e]); });
r.sort(function (a, b) { return b[0] - a[0]; });
r.slice(0, 8).forEach(function (x) {
var s = x[1].s;
if (!g[s]) { g[s] = []; o.push([s, g[s]]); }
g[s].push(x[1]);
});
return o;
}
function setAct(i) {
if (act > -1) { opts[act].setAttribute('aria-selected', 'false'); }
act = i;
if (i > -1) {
opts[i].setAttribute('aria-selected', 'true');
q.setAttribute('aria-activedescendant', opts[i].id);
opts[i].scrollIntoView({ block: 'nearest' });
} else q.removeAttribute('aria-activedescendant');
}
function close() {
lb.hidden = true; lb.innerHTML = ''; st.hidden = false; opts = []; act = -1;
D.documentElement.classList.remove('typing');
q.setAttribute('aria-expanded', 'false'); q.removeAttribute('aria-activedescendant'); cnt.textContent = '';
}
function render() {
var v = q.value.trim(), G = find(v), h = '', n = 0;
if (!v) return close();
G.forEach(function (g) {
h += '<div role="group" aria-label="' + NM[g[0]] + '"><div class="gh" aria-hidden="true">' + NM[g[0]] + '</div>';
g[1].forEach(function (e) {
h += '<a role="option" aria-selected="false" tabindex="-1" id="o' + n++ + '" href="' + e.u + '"><span>' + esc(e.t) + '</span><small>' + e.k + '</small></a>';
});
h += '</div>';
});
h += '<button type="submit" form="qf" role="option" aria-selected="false" tabindex="-1" id="o' + n + '" class="all"><span>Search all of Vanipedia for “<b>' + esc(v) + '</b>”</span></button>';
h += '<p class="kb" aria-hidden="true">↑ ↓ move · Enter open · Esc close</p>';
lb.innerHTML = h; lb.hidden = false; st.hidden = true;
D.documentElement.classList.add('typing');
opts = lb.querySelectorAll('[role=option]'); act = -1;
q.setAttribute('aria-expanded', 'true'); q.removeAttribute('aria-activedescendant');
cnt.textContent = n ? n + ' suggestions. Use arrow keys, then Enter.' : 'No suggestions. Press Enter to search all of Vanipedia.';
}
q.addEventListener('input', render);
q.addEventListener('focus', function () { if (q.value.trim() && lb.hidden) render(); });
q.addEventListener('keydown', function (e) {
var k = e.key, n;
if (k == 'ArrowDown' || k == 'ArrowUp') {
if (lb.hidden) { if (!q.value.trim()) return; render(); }
n = opts.length; e.preventDefault();
setAct(k == 'ArrowDown' ? (act + 1 >= n ? -1 : act + 1) : (act < 0 ? n - 1 : act - 1));
} else if (k == 'Enter' && act > -1) {
e.preventDefault(); opts[act].click();
} else if (k == 'Escape') {
if (!lb.hidden) close(); else q.value = '';
}
});
lb.addEventListener('mousedown', function (e) { e.preventDefault(); });
pal.addEventListener('focusout', function (e) { if (!pal.contains(e.relatedTarget)) close(); });
D.addEventListener('keydown', function (e) {
var t = e.target;
if (e.key == '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !t.isContentEditable) {
e.preventDefault(); q.focus(); q.select();
}
});
D.documentElement.className += ' js';
if (q.hasAttribute('data-af') && matchMedia('(hover:hover) and (pointer:fine)').matches) q.focus({ preventScroll: true });
})();
