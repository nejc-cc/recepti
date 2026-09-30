/* Kazalo receptov — izris, iskanje po besedilu, filter po kategorijah in po
   sestavinah. Podatki pridejo iz window.RECEPTI (recepti.js, ki ga zgradi
   orodja/naredi.py). Vse tece v brskalniku: pri par sto receptih je seznam
   nekaj deset kB in filtriranje je hipno, zato tu ni ne baze ne streznika.

   Filtri se kombinirajo: besedilo IN kategorije IN sestavine. Med izbranimi
   kategorijami velja ALI - recept ima eno samo kategorijo.

   Sestavine imajo dva nacina, ker odgovarjata na razlicni vprasanji:
   - "S temi sestavinami" (privzeto): recept mora imeti VSE izbrane. Chipi
     pokazejo samo sestavine, ki se z izbranimi res pojavljajo, s stevili za
     trenutne recepte - izbira nikoli ne pripelje do praznega seznama.
   - "Kaj imam doma": izbrano je shramba. Najprej recepti, ki jih lahko
     skuhas, nato tisti, ki jim manjka ena ali dve sestavini (z imeni).
     Osnove (sol, zacimbe, pecilni prasek - RECEPTI_OSNOVE) stejejo, kot da
     jih imas.
   Nacin si naprava zapomni.

   Jezik: recepti.js nosi tudi angleske naslove, povzetke in imena sestavin
   (naslov_en, povzetek_en, sestavine_en). Kategorije so slovenski kljuc, ki
   se samo prikaze prevedeno. */
(function () {
  'use strict';

  /* Ce je index.html star iz predpomnilnika (HA: 31 dni), morda se ne
     nalozi jezik.js. Ta skripta pa pride vedno sveza, zato ga po potrebi
     nalozi sama in sele nato izrise kazalo. */
  if (window.RECEPTI_JEZIK === undefined) {
    var z = (window.RECEPTI_PODVIRI || {})['_assets/jezik.js'];
    var s = document.createElement('script');
    s.src = '_assets/jezik.js' + (z ? '?v=' + z : '');
    s.onload = s.onerror = zacni;
    document.head.appendChild(s);
  } else {
    zacni();
  }

  function zacni() {
    var EN = window.RECEPTI_JEZIK === 'en';
    function t(sl, en) { return EN ? en : sl; }
    var kat = window.RECEPTI_KATEGORIJA || function (k) { return k; };
    var JEZIK_PRIMERJAVE = EN ? 'en' : 'sl';

    var vsi = window.RECEPTI || [];
    var OSNOVE = (window.RECEPTI_OSNOVE || {})[EN ? 'en' : 'sl'] || [];
    var seznam = document.querySelector('ul.kazalo');
    var polje = document.getElementById('iskanje');
    var stevec = document.getElementById('stevec');
    var kosKategorij = document.querySelector('.filter-kategorij');
    var kosSestavin = document.querySelector('.filter-sestavin');
    var poljeSestavin = document.getElementById('iskanje-sestavin');
    var gumbPocisti = document.getElementById('pocisti-sestavine');
    var gumbOdpri = document.getElementById('odpri-sestavine');
    var teloSestavin = document.querySelector('.sestavine-filter .telo');

    /* Staticno besedilo iz index.html. Nastavi se vedno (ne samo v
       anglescini), da se po preklopu nazaj ne pozabi nobeno. */
    var h1 = document.querySelector('.stran h1');
    if (h1) h1.textContent = t('Recepti', 'Recipes');
    document.title = t('Recepti', 'Recipes');
    if (polje) polje.placeholder = t('Išči po imenu, kategoriji, opisu ali sestavini…',
                                     'Search by name, category, description or ingredient…');
    if (poljeSestavin) poljeSestavin.placeholder = t('zoži seznam…', 'filter list…');
    if (gumbPocisti) gumbPocisti.textContent = t('Počisti', 'Clear');

    /* Ce je index.html se stara iz predpomnilnika (HA: 31 dni), posode za
       kategorije nima - ta skripta pa pride vedno sveza prek zetona v
       recepti.js. Zato posodo po potrebi naredimo sami, takoj za iskalnikom. */
    if (!kosKategorij && polje && polje.parentNode) {
      kosKategorij = document.createElement('div');
      kosKategorij.className = 'filter-kategorij';
      kosKategorij.setAttribute('role', 'group');
      polje.parentNode.insertBefore(kosKategorij, polje.nextSibling);
    }
    if (kosKategorij) kosKategorij.setAttribute('aria-label', t('Kategorije', 'Categories'));

    /* --- nacin filtra po sestavinah --- */
    var NACIN_KLJUC = 'recepti-filter-nacin';
    var nacin = 'z';
    try { if (localStorage.getItem(NACIN_KLJUC) === 'doma') nacin = 'doma'; } catch (e) {}

    /* Preklop nacina stoji v glavi panela namesto napisa "Kaj imas doma"
       (tudi v staremu index.html iz predpomnilnika). */
    var glava = document.querySelector('.sestavine-filter .glava');
    var napis = glava && glava.querySelector('.kicker');
    var preklop = document.createElement('div');
    preklop.className = 'nacin';
    preklop.setAttribute('role', 'group');
    preklop.setAttribute('aria-label', t('Način iskanja', 'Search mode'));
    preklop.innerHTML =
      '<button type="button" class="chip" data-nacin="z">' + t('S temi sestavinami', 'With these ingredients') + '</button>' +
      '<button type="button" class="chip" data-nacin="doma">' + t('Kaj imam doma', 'What I have') + '</button>';
    if (napis) glava.replaceChild(preklop, napis);
    else if (glava) glava.insertBefore(preklop, glava.firstChild);
    var namig = document.createElement('p');
    namig.className = 'namig-nacina';
    if (kosSestavin && kosSestavin.parentNode) kosSestavin.parentNode.insertBefore(namig, kosSestavin);

    var izbrane = [];      /* imena sestavin v izbranem jeziku, ki jih je uporabnik pokljukal */
    var izbraneKat = [];   /* izbrane kategorije (slovenski kljuc); prazno = vse */

    function naslov(r) { return (EN && r.naslov_en) || r.naslov; }
    function povzetek(r) { return (EN && r.povzetek_en) || r.povzetek; }
    function sestavine(r) { return (EN && r.sestavine_en) || r.sestavine || []; }
    function jeOsnova(s) { return OSNOVE.indexOf(s) !== -1; }
    function brezOsnov(r) { return sestavine(r).filter(function (s) { return !jeOsnova(s); }); }

    function poenostavi(s) {
      return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    }
    function velikaZac(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
    function narekovaji(s) { return String(s).replace(/"/g, '&quot;'); }
    function uredi(imena, prikaz) {
      return imena.sort(function (a, b) {
        return prikaz(a).localeCompare(prikaz(b), JEZIK_PRIMERJAVE);
      });
    }
    function prestej(recepti, kljuc) {
      var st = {};
      recepti.forEach(function (r) {
        kljuc(r).forEach(function (v) { if (v) st[v] = (st[v] || 0) + 1; });
      });
      return st;
    }
    function preklopi(seznamIzbir, ime) {
      var p = seznamIzbir.indexOf(ime);
      if (p === -1) seznamIzbir.push(ime); else seznamIzbir.splice(p, 1);
    }

    /* --- kategorije (stetje za vse recepte, ker je kategorij malo) --- */
    var STETJE_KAT = prestej(vsi, function (r) { return [r.kategorija]; });
    var VSE_KATEGORIJE = uredi(Object.keys(STETJE_KAT), kat);

    function izrisiKategorije() {
      if (!kosKategorij) return;
      /* Pri eni sami kategoriji filter nima kaj filtrirati. */
      if (VSE_KATEGORIJE.length < 2) { kosKategorij.hidden = true; return; }
      var h = '<button type="button" class="chip" data-vse="1" aria-pressed="' +
              (izbraneKat.length === 0) + '">' + t('Vse', 'All') +
              ' <span class="n">' + vsi.length + '</span></button>';
      VSE_KATEGORIJE.forEach(function (k) {
        h += '<button type="button" class="chip" aria-pressed="' +
             (izbraneKat.indexOf(k) !== -1) + '" data-k="' + narekovaji(k) + '">' +
             velikaZac(kat(k)) + ' <span class="n">' + STETJE_KAT[k] + '</span></button>';
      });
      kosKategorij.innerHTML = h;
    }

    /* --- izracun: kateri recepti in katere sestavine so vidni --- */
    function osnovniRecepti() {
      /* besedilo in kategorije - veljajo v obeh nacinih */
      var q = poenostavi(polje ? polje.value : '').trim();
      return vsi.filter(function (r) {
        if (izbraneKat.length && izbraneKat.indexOf(r.kategorija) === -1) return false;
        if (!q) return true;
        var iskalno = naslov(r) + ' ' + kat(r.kategorija) + ' ' + povzetek(r) + ' ' + sestavine(r).join(' ');
        return poenostavi(iskalno).indexOf(q) !== -1;
      });
    }
    function imaVse(r) {
      var s = sestavine(r);
      return izbrane.every(function (i) { return s.indexOf(i) !== -1; });
    }
    function manjkaDoma(r) {
      return brezOsnov(r).filter(function (s) { return izbrane.indexOf(s) === -1; });
    }

    /* --- izris seznama receptov --- */
    function vrstica(r, oznaka) {
      var pot = encodeURI(r.datoteka) + (r.v ? '?v=' + r.v : '');
      /* jezik gre v povezavo, da ostane tudi brez localStorage */
      if (EN) pot += (r.v ? '&' : '?') + 'jezik=en';
      return '<li><a href="' + pot + '">' +
             '<span class="ime">' + naslov(r) + '</span>' +
             (r.kategorija ? '<span class="kat">' + kat(r.kategorija) + '</span>' : '') +
             (oznaka || '') +
             (povzetek(r) ? '<span class="opis">' + povzetek(r) + '</span>' : '') +
             '</a></li>';
    }
    function locnica(besedilo) { return '<li class="locnica">' + besedilo + '</li>'; }
    function manjkaOznaka(m) {
      return '<span class="manjka">' + t('manjka ', 'missing ') + m.join(', ') + '</span>';
    }

    function osvezi() {
      var osnovni = osnovniRecepti();
      var h = '', besedilo, stetje;

      if (nacin === 'doma' && izbrane.length) {
        /* shramba: 0, 1 ali 2 manjkajoce; recepti, ki rabijo vec, izpadejo */
        var sk = [[], [], []];
        osnovni.forEach(function (r) {
          var m = manjkaDoma(r);
          if (m.length <= 2) sk[m.length].push({ r: r, m: m });
        });
        if (sk[0].length) h += locnica(t('Lahko skuhaš', 'You can make'));
        sk[0].forEach(function (x) {
          h += vrstica(x.r, '<span class="ujema">' + t('imaš vse', 'you have it all') + '</span>');
        });
        if (sk[1].length) h += locnica(t('Manjka ena sestavina', 'Missing one ingredient'));
        sk[1].forEach(function (x) { h += vrstica(x.r, manjkaOznaka(x.m)); });
        if (sk[2].length) h += locnica(t('Manjkata dve', 'Missing two'));
        sk[2].forEach(function (x) { h += vrstica(x.r, manjkaOznaka(x.m)); });
        if (!h) {
          h = '<li class="prazno">' + t('Vsakemu receptu manjka več kot dvoje. Odkljukaj še kaj.',
                                        'Every recipe is missing more than two things. Tick a few more.') + '</li>';
        }
        besedilo = t('lahko skuhaš ', 'you can make ') + sk[0].length + ' · ' +
                   t('skoraj ', 'almost ') + (sk[1].length + sk[2].length);
        /* v shrambi so vidne vse sestavine (razen osnov) iz trenutnega izbora */
        stetje = prestej(osnovni, brezOsnov);
      } else {
        var zadeti = osnovni.filter(imaVse);
        /* brez oznake "ujema": na seznamu so samo recepti z vsemi izbranimi */
        zadeti.forEach(function (r) { h += vrstica(r, ''); });
        if (!h) h = '<li class="prazno">' + t('Ni zadetkov.', 'No matches.') + '</li>';
        besedilo = EN
          ? zadeti.length + ' of ' + vsi.length + (vsi.length === 1 ? ' recipe' : ' recipes')
          : zadeti.length + ' od ' + vsi.length + (vsi.length === 1 ? ' recepta' : ' receptov');
        /* samo sestavine, ki se z izbranimi res pojavljajo - stetje po
           receptih, ki so ta hip na seznamu */
        stetje = prestej(zadeti, nacin === 'doma' ? brezOsnov : sestavine);
      }

      seznam.innerHTML = h;
      if (stevec) {
        if (izbraneKat.length) besedilo += ' · ' + izbraneKat.map(kat).join(' / ');
        if (izbrane.length) besedilo += ' · ' + izbrane.join(nacin === 'doma' ? ', ' : ' + ');
        stevec.textContent = besedilo;
      }
      izrisiSestavine(stetje);
    }

    function izrisiSestavine(stetje) {
      if (!kosSestavin) return;
      var gumbi = preklop.querySelectorAll('button');
      for (var i = 0; i < gumbi.length; i++) {
        gumbi[i].setAttribute('aria-pressed', String(gumbi[i].getAttribute('data-nacin') === nacin));
      }
      namig.textContent = nacin === 'doma'
        ? t('Odkljukaj, kar imaš. Sol, začimbe, pecilni prašek in sodo štejemo, kot da jih imaš.',
            'Tick what you have. Salt, spices, baking powder and baking soda count as always at home.')
        : t('Pokaže recepte z vsemi izbranimi sestavinami; ostanejo samo sestavine, ki se z njimi pojavljajo.',
            'Shows recipes with all the ticked ingredients; only ingredients that go with them stay listed.');

      var q = poenostavi(poljeSestavin ? poljeSestavin.value : '').trim();
      /* izbrane ostanejo vidne vedno - tudi ko jih filter sicer ne bi
         pokazal - sicer izginejo izpod prstov in ne ves, kaj je vklopljeno */
      var imena = Object.keys(stetje);
      izbrane.forEach(function (x) { if (imena.indexOf(x) === -1) imena.push(x); });
      uredi(imena, function (x) { return x; });

      var h = '';
      imena.forEach(function (ime) {
        var izbrana = izbrane.indexOf(ime) !== -1;
        if (q && !izbrana && poenostavi(ime).indexOf(q) === -1) return;
        h += '<button type="button" class="chip" aria-pressed="' + izbrana + '" data-s="' +
             narekovaji(ime) + '">' + ime +
             ' <span class="n">' + (stetje[ime] || 0) + '</span></button>';
      });
      if (!h) h = '<span class="prazno">' + t('Ni take sestavine.', 'No such ingredient.') + '</span>';
      kosSestavin.innerHTML = h;

      if (gumbPocisti) gumbPocisti.hidden = izbrane.length === 0;
      /* Filter velja tudi, ko je panel zaprt, zato mora stevilo pisati na gumbu
         - sicer je kazalo skrajsano brez vidnega razloga. */
      if (gumbOdpri) {
        gumbOdpri.textContent = t('🔎 Išči po sestavinah', '🔎 Search by ingredient') +
          (izbrane.length ? ' (' + izbrane.length + ')' : '');
      }
    }

    /* --- dogodki (na posodah, ker se gumbi izrisujejo na novo) --- */
    function gumb(e, izbor) {
      var n = e.target;
      while (n && n !== e.currentTarget && !(n.matches && n.matches(izbor))) n = n.parentNode;
      return n && n !== e.currentTarget ? n : null;
    }
    if (kosKategorij) {
      kosKategorij.addEventListener('click', function (e) {
        var g = gumb(e, 'button.chip');
        if (!g) return;
        if (g.getAttribute('data-vse')) izbraneKat = [];
        else preklopi(izbraneKat, g.getAttribute('data-k'));
        izrisiKategorije();
        osvezi();
      });
    }
    if (kosSestavin) {
      kosSestavin.addEventListener('click', function (e) {
        var g = gumb(e, 'button.chip');
        if (!g) return;
        preklopi(izbrane, g.getAttribute('data-s'));
        osvezi();
      });
    }
    preklop.addEventListener('click', function (e) {
      var g = gumb(e, 'button[data-nacin]');
      if (!g || g.getAttribute('data-nacin') === nacin) return;
      nacin = g.getAttribute('data-nacin');
      try {
        if (nacin === 'doma') localStorage.setItem(NACIN_KLJUC, 'doma');
        else localStorage.removeItem(NACIN_KLJUC);
      } catch (err) {}
      osvezi();
    });

    /* Namenoma brez focus(): na tablici in telefonu fokus v polju odpre
       tipkovnico, ki pokrije pol kazala, ceprav uporabnik vecinoma samo
       brska ali klikne kategorijo. Kdor hoce tipkati, se polja dotakne. */
    if (polje) polje.addEventListener('input', osvezi);
    /* Besednjak je dolg, zato je privzeto zaprt. Tudi tu brez focus():
       panel se odpira zato, da se klika chipe, ne da se tipka. */
    if (gumbOdpri && teloSestavin) {
      gumbOdpri.addEventListener('click', function () {
        var odpri = teloSestavin.hidden;
        teloSestavin.hidden = !odpri;
        gumbOdpri.setAttribute('aria-expanded', String(odpri));
      });
    }
    if (poljeSestavin) poljeSestavin.addEventListener('input', osvezi);
    if (gumbPocisti) {
      gumbPocisti.addEventListener('click', function () {
        izbrane = [];
        osvezi();
      });
    }

    izrisiKategorije();
    osvezi();
  }
})();
