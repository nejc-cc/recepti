/* Jezik strani: slovensko (privzeto) ali angleško. Nalozi se v <head> vseh
   strani, PRED tema.js, da je jezik znan, preden karkoli izrise besedilo.

   Kako se izbere:
     1. ?jezik=en (ali ?lang=en) v naslovu - za povezavo, ki jo nekomu poslji;
        izbira se tudi zapomni,
     2. sicer zadnja izbira na tej napravi (localStorage),
     3. sicer slovenscina.
   Piskotkov ni: izbira je nastavitev, ki jo uporabnik sam klikne, enako kot
   tema.

   Ostale skripte berejo window.RECEPTI_JEZIK in same nosijo oba prevoda
   ob besedilu. Ce te datoteke ni (star predpomnilnik), je vse slovensko. */
(function () {
  'use strict';
  var KLJUC = 'recepti-jezik';
  var JEZIKI = ['sl', 'en'];

  function izNaslova() {
    var m = /[?&](?:jezik|lang)=(sl|en)\b/.exec(location.search);
    return m ? m[1] : null;
  }
  function shranjen() {
    try { return localStorage.getItem(KLJUC); } catch (e) { return null; }
  }
  function shrani(j) {
    try {
      if (j === 'sl') localStorage.removeItem(KLJUC);
      else localStorage.setItem(KLJUC, j);
    } catch (e) {}
  }

  var j = izNaslova();
  if (j) shrani(j);
  else j = shranjen();
  if (JEZIKI.indexOf(j) === -1) j = 'sl';

  window.RECEPTI_JEZIK = j;
  document.documentElement.setAttribute('lang', j);

  /* Kategorije so stalen, majhen nabor, zato jih prevaja ta slovar. Nova
     kategorija v receptih -> dodaj jo sem, sicer v angleskem ostane
     slovenska. */
  window.RECEPTI_KATEGORIJE = {
    'glavna jed': 'main course',
    'kruh': 'bread',
    'pijača': 'drink',
    'pijaca': 'drink',
    'sladica': 'dessert',
    'slano pecivo': 'savoury bake',
    'zajtrk': 'breakfast',
    'juha': 'soup',
    'jed na žlico': 'stew',
    'priloga': 'side dish'
  };
  window.RECEPTI_KATEGORIJA = function (k) {
    if (j !== 'en' || !k) return k;
    return window.RECEPTI_KATEGORIJE[String(k).toLowerCase()] || k;
  };

  /* Povezava v istem jeziku: brez localStorage (zasebni zavihek) bi se jezik
     sicer izgubil ob vsakem kliku. */
  window.RECEPTI_POVEZAVA = function (href) {
    if (j !== 'en') return href;
    return href + (href.indexOf('?') === -1 ? '?' : '&') + 'jezik=en';
  };

  function gumb() {
    if (document.querySelector('.jezik-gumb')) return;
    var orodja = window.RECEPTI_ORODJA && window.RECEPTI_ORODJA();
    if (!orodja) return;
    var g = document.createElement('button');
    g.type = 'button';
    g.className = 'jezik-gumb';
    /* na gumbu je jezik, v katerega preklopi */
    g.textContent = j === 'en' ? 'SL' : 'EN';
    g.title = j === 'en' ? 'Slovenščina' : 'English';
    g.setAttribute('aria-label', g.title);
    g.setAttribute('lang', j === 'en' ? 'sl' : 'en');
    g.addEventListener('click', function () {
      var novo = j === 'en' ? 'sl' : 'en';
      shrani(novo);
      var q = location.search.replace(/^\?/, '').split('&').filter(function (p) {
        return p && !/^(jezik|lang)=/.test(p);
      });
      if (novo === 'en') q.push('jezik=en');
      location.replace(location.pathname + (q.length ? '?' + q.join('&') : '') + location.hash);
    });
    /* pred gumb za temo, ce ze obstaja (pozno nalaganje iz kazalo.js) */
    var tema = orodja.querySelector('.tema-gumb');
    if (tema) orodja.insertBefore(g, tema);
    else orodja.appendChild(g);
  }
  /* --- noga (samo javna stran) ---------------------------------------
     Na HA (/local/...) je ni: tam je stran domaca in noga bi bila samo
     sum na kiosku. Povezava za umik odpre GitHub obrazec
     (.github/ISSUE_TEMPLATE/umik-recepta.yml), na receptu ze izpolnjen
     s tem receptom. */
  var REPO = 'https://github.com/nejc-cc/recepti';
  function noga() {
    if (location.pathname.indexOf('/local/') === 0) return;
    var stran = document.querySelector('.stran');
    if (!stran || stran.querySelector('.noga')) return;
    var en = j === 'en';
    var recept = !!document.getElementById('recept');
    var h1 = stran.querySelector('h1');
    var umik = REPO + '/issues/new?template=umik-recepta.yml';
    if (recept) {
      umik += '&title=' + encodeURIComponent((en ? 'Recipe removal: ' : 'Umik recepta: ') +
                                             (h1 ? h1.textContent : '')) +
              '&recept=' + encodeURIComponent(location.origin + location.pathname);
    }
    function povezava(href, besedilo) {
      return '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + besedilo + '</a>';
    }
    var f = document.createElement('footer');
    f.className = 'noga';
    f.innerHTML = (en ? 'A home recipe collection' : 'Domača zbirka receptov') + ' · Nejc · ' +
      povezava(REPO, en ? 'code on GitHub' : 'koda na GitHubu') + ' · ' +
      povezava(umik, recept ? (en ? 'request removal of this recipe' : 'zahtevaj umik tega recepta')
                            : (en ? 'request removal of a recipe' : 'zahtevaj umik recepta'));
    stran.appendChild(f);
  }

  function ob() { gumb(); noga(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ob);
  else ob();
})();
