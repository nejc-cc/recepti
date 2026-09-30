/* Gumb "nazaj v Home Assistant".

   Prikaze se SAMO, kadar stran tece v iframeu na istem originu - torej
   vgrajena v HA dashboard. Odprta v svojem zavihku, na kiosku mimo HA ali z
   diska gumba ni, enako kot pri gumbih za pecico in kosarico.

   Kam kaze: prvi segment starsevske poti je dashboard
   (/kiosk-kuhinja/recepti -> kiosk-kuhinja), skok na sam
   dashboard pa HA preusmeri na njegov prvi view. Zato nova naprava z drugim
   dashboardom ne rabi nobene nastavitve. Izjeme se vpisejo v nastavitve.js
   pod nazajPoti. */
(function () {
  'use strict';

  function starsevskaPot() {
    try {
      if (window.parent === window) return null;   // ni v iframeu
      return window.parent.location.pathname;      // vrze, ce je cross-origin
    } catch (e) {
      return null;                                 // tuj origin: gumba ni
    }
  }

  var pot = starsevskaPot();
  if (!pot) return;

  /* Namenoma podvojeno s tema.js: ce se iz predpomnilnika naloziti stara ena
     in nova druga skripta, gumb ne sme koncati na dnu strani. Funkcija je
     idempotentna - ce vrstica ze obstaja, vrne obstojeco posodo. */
  function orodja() {
    if (window.RECEPTI_ORODJA) return window.RECEPTI_ORODJA();
    var obstojeca = document.querySelector('.stran .orodja');
    if (obstojeca) return obstojeca;
    var h1 = document.querySelector('.stran h1');
    if (!h1) return null;
    var vrstica = document.createElement('div');
    vrstica.className = 'naslovna-vrstica';
    h1.parentNode.insertBefore(vrstica, h1);
    vrstica.appendChild(h1);
    var posoda = document.createElement('div');
    posoda.className = 'orodja';
    vrstica.appendChild(posoda);
    return posoda;
  }

  document.addEventListener('DOMContentLoaded', function () {
    /* Samo na kazalu. Na receptu je pot nazaj "Vsi recepti"; dva gumba za
       nazaj v razlicne smeri bi na kiosku zmedla. */
    if (!document.querySelector('ul.kazalo')) return;

    /* Sele tu, ker se nastavitve.js na straneh receptov nalozi na koncu
       telesa - v glavi ga se ni. */
    var NAST = window.RECEPTI_NASTAVITVE || {};
    var dashboard = pot.split('/')[1] || '';
    var cilj = (NAST.nazajPoti || {})[dashboard] || ('/' + dashboard);

    var g = document.createElement('button');
    g.type = 'button';
    g.className = 'ha-nazaj';
    /* Videz mushroom badgea iz dashboarda: zelen krogec z mdi:arrow-left-bold
       in oznaka desno od njega. */
    g.innerHTML =
      '<span class="ikona"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
      '<path fill="currentColor" d="M20 9V15H12V19.84L4.16 12L12 4.16V9H20Z"></path></svg></span>' +
      '<span class="oznaka">nazaj</span>';
    g.title = 'Nazaj na ' + cilj;
    g.addEventListener('click', function () {
      var p = window.parent;
      try {
        /* HA-jeva notranja navigacija: brez ponovnega nalaganja cele
           aplikacije, kar je na kiosku razlika med hipnim in nekaj sekund. */
        p.history.pushState(null, '', cilj);
        p.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } }));
      } catch (e) {
        p.location.assign(cilj);
      }
    });

    document.documentElement.setAttribute('data-vgrajeno', '1');
    /* Pred gumb za temo, da je nazaj levo od njega. */
    var posoda = orodja();
    if (posoda) posoda.insertBefore(g, posoda.firstChild);
    else document.body.appendChild(g);
  });
})();
