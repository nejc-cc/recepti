/* Kazalo receptov — izris, iskanje po besedilu, filter po kategorijah in po
   sestavinah. Podatki pridejo iz window.RECEPTI (recepti.js, ki ga zgradi
   _assets/naredi-kazalo.py). Vse tece v brskalniku: pri par sto receptih je
   seznam nekaj deset kB in filtriranje je hipno, zato tu ni ne baze ne
   streznika.

   Filtri se kombinirajo: besedilo IN kategorije IN sestavine. Med izbranimi
   kategorijami velja ALI - recept ima eno samo kategorijo, zato bi IN pri
   dveh izbranih vedno vrnil prazno.

   Jezik: recepti.js nosi tudi angleske naslove, povzetke in imena sestavin
   (naslov_en, povzetek_en, sestavine_en). Filtri delajo na imenih v
   izbranem jeziku, kategorije pa na slovenskem kljucu, ki se samo prikaze
   prevedeno. */
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
    var kicker = document.querySelector('.sestavine-filter .kicker');
    if (kicker) kicker.textContent = t('Kaj imaš doma', 'What you have');

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

    var izbrane = [];      /* imena sestavin v izbranem jeziku, ki jih je uporabnik pokljukal */
    var izbraneKat = [];   /* izbrane kategorije (slovenski kljuc); prazno = vse */

    function naslov(r) { return (EN && r.naslov_en) || r.naslov; }
    function povzetek(r) { return (EN && r.povzetek_en) || r.povzetek; }
    function sestavine(r) { return (EN && r.sestavine_en) || r.sestavine || []; }

    function poenostavi(s) {
      return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    }
    function velikaZac(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
    function narekovaji(s) { return String(s).replace(/"/g, '&quot;'); }
    function ima(r, ime) {
      var s = sestavine(r);
      for (var i = 0; i < s.length; i++) if (s[i] === ime) return true;
      return false;
    }
    function manjkajoce(r) {
      var m = [];
      for (var i = 0; i < izbrane.length; i++) if (!ima(r, izbrane[i])) m.push(izbrane[i]);
      return m;
    }
    function prestej(kljuc, prikaz) {
      var stetje = {};
      for (var i = 0; i < vsi.length; i++) {
        var vrednosti = kljuc(vsi[i]);
        for (var j = 0; j < vrednosti.length; j++) {
          if (vrednosti[j]) stetje[vrednosti[j]] = (stetje[vrednosti[j]] || 0) + 1;
        }
      }
      var ven = [];
      for (var k in stetje) if (stetje.hasOwnProperty(k)) ven.push({ ime: k, n: stetje[k] });
      ven.sort(function (a, b) {
        return prikaz(a.ime).localeCompare(prikaz(b.ime), JEZIK_PRIMERJAVE);
      });
      return ven;
    }
    function preklopi(seznamIzbir, ime) {
      var p = seznamIzbir.indexOf(ime);
      if (p === -1) seznamIzbir.push(ime); else seznamIzbir.splice(p, 1);
    }

    /* --- kategorije --- */
    var VSE_KATEGORIJE = prestej(function (r) { return [r.kategorija]; }, kat);

    function izrisiKategorije() {
      if (!kosKategorij) return;
      /* Pri eni sami kategoriji filter nima kaj filtrirati. */
      if (VSE_KATEGORIJE.length < 2) { kosKategorij.hidden = true; return; }
      var h = '<button type="button" class="chip" data-vse="1" aria-pressed="' +
              (izbraneKat.length === 0) + '">' + t('Vse', 'All') +
              ' <span class="n">' + vsi.length + '</span></button>';
      for (var i = 0; i < VSE_KATEGORIJE.length; i++) {
        var k = VSE_KATEGORIJE[i];
        h += '<button type="button" class="chip" aria-pressed="' +
             (izbraneKat.indexOf(k.ime) !== -1) + '" data-k="' + narekovaji(k.ime) + '">' +
             velikaZac(kat(k.ime)) + ' <span class="n">' + k.n + '</span></button>';
      }
      kosKategorij.innerHTML = h;
      var gumbi = kosKategorij.querySelectorAll('button.chip');
      for (var g = 0; g < gumbi.length; g++) {
        gumbi[g].addEventListener('click', function () {
          if (this.getAttribute('data-vse')) izbraneKat = [];
          else preklopi(izbraneKat, this.getAttribute('data-k'));
          izrisiKategorije();
          izrisi();
        });
      }
    }

    /* --- besednjak sestavin iz vseh receptov --- */
    var VSE_SESTAVINE = prestej(sestavine, function (s) { return s; });

    function izrisiSestavine() {
      if (!kosSestavin) return;
      var q = poenostavi(poljeSestavin ? poljeSestavin.value : '').trim();
      var h = '';
      for (var i = 0; i < VSE_SESTAVINE.length; i++) {
        var s = VSE_SESTAVINE[i];
        var izbrana = izbrane.indexOf(s.ime) !== -1;
        /* Ce uporabnik isce po besednjaku, ze izbrane vseeno pusti vidne,
           sicer izginejo izpod prstov in ne ves vec, kaj je vklopljeno. */
        if (q && !izbrana && poenostavi(s.ime).indexOf(q) === -1) continue;
        h += '<button type="button" class="chip" aria-pressed="' + izbrana + '" data-s="' +
             narekovaji(s.ime) + '">' + s.ime +
             ' <span class="n">' + s.n + '</span></button>';
      }
      if (!h) h = '<span class="prazno">' + t('Ni take sestavine.', 'No such ingredient.') + '</span>';
      kosSestavin.innerHTML = h;
      var gumbi = kosSestavin.querySelectorAll('button.chip');
      for (var g = 0; g < gumbi.length; g++) {
        gumbi[g].addEventListener('click', function () {
          preklopi(izbrane, this.getAttribute('data-s'));
          izrisiSestavine();
          izrisi();
        });
      }
      if (gumbPocisti) gumbPocisti.hidden = izbrane.length === 0;
      /* Filter velja tudi, ko je panel zaprt, zato mora stevilo pisati na gumbu
         - sicer je kazalo skrajsano brez vidnega razloga. */
      if (gumbOdpri) {
        gumbOdpri.textContent = t('🔎 Išči po sestavinah', '🔎 Search by ingredient') +
          (izbrane.length ? ' (' + izbrane.length + ')' : '');
      }
    }

    /* --- izris seznama receptov --- */
    function vrstica(r, manjka) {
      var pot = encodeURI(r.datoteka) + (r.v ? '?v=' + r.v : '');
      /* jezik gre v povezavo, da ostane tudi brez localStorage */
      if (EN) pot += (r.v ? '&' : '?') + 'jezik=en';
      var oznaka = '';
      if (manjka && manjka.length) {
        oznaka = '<span class="manjka">' + t('manjka ', 'missing ') + manjka.join(', ') + '</span>';
      } else if (izbrane.length) {
        oznaka = '<span class="ujema">' + izbrane.length +
                 (izbrane.length === 1 ? t(' sestavina', ' ingredient') : t(' ujemanj', ' matches')) +
                 '</span>';
      }
      return '<li><a href="' + pot + '">' +
             '<span class="ime">' + naslov(r) + '</span>' +
             (r.kategorija ? '<span class="kat">' + kat(r.kategorija) + '</span>' : '') +
             oznaka +
             (povzetek(r) ? '<span class="opis">' + povzetek(r) + '</span>' : '') +
             '</a></li>';
    }

    function izrisi() {
      var q = poenostavi(polje ? polje.value : '').trim();
      var zadeti = [], skoraj = [];

      for (var i = 0; i < vsi.length; i++) {
        var r = vsi[i];
        if (izbraneKat.length && izbraneKat.indexOf(r.kategorija) === -1) continue;
        if (q) {
          var iskalno = naslov(r) + ' ' + kat(r.kategorija) + ' ' + povzetek(r) + ' ' +
                        sestavine(r).join(' ');
          if (poenostavi(iskalno).indexOf(q) === -1) continue;
        }
        var m = manjkajoce(r);
        if (m.length === 0) zadeti.push(r);
        /* "Manjka ena" pove nekaj uporabnega sele od dveh izbranih sestavin
           naprej: pri eni izbrani je namrec vsak nezadetek "manjka ena" in
           seznam se sploh ne skrajsa. */
        else if (m.length === 1 && izbrane.length > 1) skoraj.push({ r: r, manjka: m });
      }

      var h = '';
      for (var z = 0; z < zadeti.length; z++) h += vrstica(zadeti[z], null);
      if (skoraj.length) {
        h += '<li class="locnica">' + t('Manjka ena sestavina', 'Missing one ingredient') + '</li>';
        for (var s = 0; s < skoraj.length; s++) h += vrstica(skoraj[s].r, skoraj[s].manjka);
      }
      if (!h) h = '<li class="prazno">' + t('Ni zadetkov.', 'No matches.') + '</li>';
      seznam.innerHTML = h;

      if (stevec) {
        var besedilo = EN
          ? zadeti.length + ' of ' + vsi.length + (vsi.length === 1 ? ' recipe' : ' recipes')
          : zadeti.length + ' od ' + vsi.length + (vsi.length === 1 ? ' recepta' : ' receptov');
        if (izbraneKat.length) besedilo += ' · ' + izbraneKat.map(kat).join(' / ');
        if (izbrane.length) besedilo += ' · ' + izbrane.join(' + ');
        stevec.textContent = besedilo;
      }
    }

    /* Namenoma brez focus(): na tablici in telefonu fokus v polju odpre
       tipkovnico, ki pokrije pol kazala, ceprav uporabnik vecinoma samo
       brska ali klikne kategorijo. Kdor hoce tipkati, se polja dotakne. */
    if (polje) polje.addEventListener('input', izrisi);
    /* Besednjak je dolg (nekaj deset sestavin), zato je privzeto zaprt -
       odprt zasede vec prostora kot samo kazalo. Tudi tu brez focus(): panel
       se odpira zato, da se klika chipe, ne da se tipka. */
    if (gumbOdpri && teloSestavin) {
      gumbOdpri.addEventListener('click', function () {
        var odpri = teloSestavin.hidden;
        teloSestavin.hidden = !odpri;
        gumbOdpri.setAttribute('aria-expanded', String(odpri));
      });
    }
    if (poljeSestavin) poljeSestavin.addEventListener('input', izrisiSestavine);
    if (gumbPocisti) {
      gumbPocisti.addEventListener('click', function () {
        izbrane = [];
        izrisiSestavine();
        izrisi();
      });
    }

    izrisiKategorije();
    izrisiSestavine();
    izrisi();
  }
})();
