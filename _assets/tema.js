/* Preklop svetlo/temno. Nalozi se v <head> vseh strani.
   Brez izbire velja sistemska nastavitev (prefers-color-scheme);
   klik na gumb jo povozi in si izbiro zapomni v localStorage.
   Atribut se nastavi TAKOJ (se pred <body>), da ob nalaganju ne utripne. */
(function () {
  'use strict';
  var KLJUC = 'recepti-tema';

  function shranjeno() {
    try { return localStorage.getItem(KLJUC); } catch (e) { return null; }
  }
  function shrani(v) {
    try { v ? localStorage.setItem(KLJUC, v) : localStorage.removeItem(KLJUC); } catch (e) {}
  }
  function nastavi(v) {
    if (v) document.documentElement.setAttribute('data-tema', v);
    else document.documentElement.removeAttribute('data-tema');
  }
  function temnoZdaj() {
    var v = document.documentElement.getAttribute('data-tema');
    if (v) return v === 'temno';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  nastavi(shranjeno());

  /* Skupno mesto za gumbe v vrstici z naslovom (tema, nazaj v HA).
     Ob prvem klicu H1 zavije v flex vrstico in doda posodo za gumbe;
     naslednji klici vrnejo isto posodo. Uporablja jo tudi ha-nazaj.js. */
  window.RECEPTI_ORODJA = function () {
    var obstojeca = document.querySelector('.stran .orodja');
    if (obstojeca) return obstojeca;
    var h1 = document.querySelector('.stran h1');
    if (!h1) return null;
    var vrstica = document.createElement('div');
    vrstica.className = 'naslovna-vrstica';
    h1.parentNode.insertBefore(vrstica, h1);
    vrstica.appendChild(h1);
    var orodja = document.createElement('div');
    orodja.className = 'orodja';
    vrstica.appendChild(orodja);
    return orodja;
  };

  document.addEventListener('DOMContentLoaded', function () {
    var g = document.createElement('button');
    g.type = 'button';
    g.className = 'tema-gumb';
    function osvezi() {
      var t = temnoZdaj();
      g.textContent = t ? '☀' : '☾';
      g.title = t ? 'Preklopi na svetlo' : 'Preklopi na temno';
      g.setAttribute('aria-label', g.title);
    }
    g.addEventListener('click', function () {
      var novo = temnoZdaj() ? 'svetlo' : 'temno';
      nastavi(novo);
      shrani(novo);
      osvezi();
    });
    osvezi();
    var orodja = window.RECEPTI_ORODJA();
    (orodja || document.body).appendChild(g);

    /* Ce uporabnik ni izbral rocno, sledi sistemu tudi med odprto stranjo. */
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var poslusaj = function () { if (!shranjeno()) osvezi(); };
      if (mq.addEventListener) mq.addEventListener('change', poslusaj);
      else if (mq.addListener) mq.addListener(poslusaj);
    }
  });
})();
