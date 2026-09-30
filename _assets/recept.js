/* Recepti — izris recepta iz JSON bloka na strani.
   Stran vsebuje <script type="application/json" id="recept">{...}</script>,
   ta skripta iz njega zgradi tabelo (namizje/tisk) in zlozen prikaz (telefon). */
(function () {
  'use strict';

  var el = document.getElementById('recept');
  if (!el) return;
  var R;
  try { R = JSON.parse(el.textContent); }
  catch (e) {
    document.body.innerHTML = '<p style="color:#b00">Napaka v JSON bloku recepta: ' + e.message + '</p>';
    return;
  }

  /* --- jezik -----------------------------------------------------------
     Jezik izbere _assets/jezik.js. Besedilo vmesnika nosi oba prevoda kar
     ob sebi: t('Prekliči', 'Cancel'). Recept ima angleski prevod v bloku
     "en", ki se polozi cez slovenskega (prevedi spodaj).
     RS ostane slovenski izvirnik: iz njega gre kosarica na slovenski
     nakupovalni seznam in iz njega so kljuci za hranila.js - v anglescini
     se spremeni samo, kar se prikaze. */
  var EN = window.RECEPTI_JEZIK === 'en';
  function t(sl, en) { return EN ? en : sl; }
  var RS = R;

  function prevedi(izv, en) {
    var r = JSON.parse(JSON.stringify(izv));
    ['naslov', 'povzetek', 'opis', 'predgretje'].forEach(function (k) {
      if (en[k] !== undefined) r[k] = en[k];
    });
    if (en.opombe) r.opombe = en.opombe;
    if (en.osnova && r.osnova) {
      if (en.osnova.oblike) r.osnova.oblike = en.osnova.oblike;
      r.osnova.oblike_gumb = en.osnova.oblike_gumb || en.osnova.oblike || r.osnova.oblike_gumb;
    }
    (en.sestavine || []).forEach(function (e, i) {
      var s = r.sestavine && r.sestavine[i];
      if (!s || !e) return;
      if (e.ime !== undefined) s.ime = e.ime;
      if (e.kratko !== undefined) s.kratko = e.kratko;
      else if (e.ime !== undefined) delete s.kratko;
      /* enota ostane slovenska, ker iz nje racunajo hranila - prikaz ima svojo */
      if (e.enota !== undefined) s.enota_prikaz = e.enota;
      if (e.merica_enota !== undefined && s.merica) s.merica.enota = e.merica_enota;
    });
    (en.koraki || []).forEach(function (b, i) {
      if (r.koraki && r.koraki[i] && typeof b === 'string') r.koraki[i].besedilo = b;
    });
    if (en.plasti && r.plasti) {
      if (en.plasti.naslov) r.plasti.naslov = en.plasti.naslov;
      (en.plasti.od_zgoraj || []).forEach(function (ime, i) {
        if (r.plasti.od_zgoraj && r.plasti.od_zgoraj[i]) r.plasti.od_zgoraj[i].ime = ime;
      });
    }
    return r;
  }
  if (EN && RS.en) R = prevedi(RS, RS.en);

  var osnova = (R.osnova && R.osnova.kolicina) || 1;
  var oblike = (R.osnova && R.osnova.oblike) || null;
  var oblikeGumb = (R.osnova && R.osnova.oblike_gumb) || oblike;
  var izbire = R.izbire || [];
  var stanje = osnova;

  /* --- pomozne --- */
  function stevilo(v) {
    var r = Math.round(v * 10) / 10;
    var s = Number.isInteger(r) ? String(r) : r.toFixed(1);
    return EN ? s : s.replace('.', ',');
  }
  /* Slovensko: 1 / 2 / 3-4 / 5+ (in 101 = ednina). Anglesko samo ednina in
     mnozina: oblike so tam ["egg", "eggs"]. */
  function sklon(n, o) {
    if (!o) return '';
    if (EN) return Math.abs(n) === 1 ? o[0] : (o[1] || o[0]);
    var m = Math.abs(n) % 100;
    if (m === 1) return o[0];
    if (m === 2) return o[1] || o[0];
    if (m === 3 || m === 4) return o[2] || o[1] || o[0];
    return o[3] || o[2] || o[0];
  }
  /* oblike     = sklon v besedilu ("Za 4 ciabatte")
     oblike_gumb = sklon na gumbu, ce se razlikuje ("4 ciabatte" / "1 ciabatta") */
  function kolicinaNiz(n, gumb) {
    var o = gumb ? oblikeGumb : oblike;
    return o ? n + ' ' + sklon(n, o) : String(n);
  }
  function vstavi(s, n) {
    return String(s)
      .replace(/\{n\}/g, n)
      .replace(/\{kolicina\}/g, kolicinaNiz(n));
  }
  function faktor(n) { return n / osnova; }
  function jeSeznam(v) { return Object.prototype.toString.call(v) === '[object Array]'; }
  function kolSestavine(s, n) {
    if (s.kol === null || s.kol === undefined) return null;
    return s.skaliraj === false ? s.kol : s.kol * faktor(n);
  }
  /* Ime sestavine je lahko niz ali stiri sklonske oblike
     ["jajce","jajci","jajca","jajc"] - takrat se sklanja po SVOJI kolicini,
     ne po kolicini recepta: 3 jajca, 6 jajc. */
  function imeSestavine(s, n) {
    var ime = s.ime;
    if (jeSeznam(ime)) {
      var v = kolSestavine(s, n);
      ime = sklon(v === null ? n : Math.round(v), ime);
    }
    return vstavi(ime, n);
  }
  /* Neobvezna druga mera v oklepaju (npr. ameriski cupsi). Preracunava se z
     istim faktorjem kot sama sestavina - zato mora biti podatek, ne besedilo
     v imenu: tam bi ostal zamrznjen na osnovni kolicini.
     enota je lahko niz ali stiri sklonske oblike; te se sklanjajo po SVOJI
     preracunani vrednosti. */
  function mericaNiz(s, n) {
    var m = s.merica;
    if (!m || m.kol === null || m.kol === undefined) return '';
    var v = s.skaliraj === false ? m.kol : m.kol * faktor(n);
    var enota = m.enota;
    if (jeSeznam(enota)) enota = sklon(Math.round(v), enota);
    return ' <span class="merica">(' + stevilo(v) + (enota ? ' ' + enota : '') + ')</span>';
  }
  function sestavinaNiz(s, n) {
    var v = kolSestavine(s, n);
    if (v === null) return imeSestavine(s, n) + mericaNiz(s, n);
    var enota = s.enota_prikaz !== undefined ? s.enota_prikaz : s.enota;
    return '<span class="kol">' + stevilo(v) + (enota ? '&nbsp;' + enota : '') + '</span> ' +
           imeSestavine(s, n) + mericaNiz(s, n);
  }
  function obseg(k, dolzina) {
    var v = k.vrstice;
    if (!v) return [1, dolzina];
    if (typeof v === 'number') return [v, v];
    return [v[0], v[1] === undefined ? v[0] : v[1]];
  }
  function razred(k) {
    return 'korak' + (k.slog ? ' ' + k.slog : '');
  }

  /* --- tabela --- */
  function tabela(n) {
    var s = R.sestavine || [], koraki = R.koraki || [];
    var stolpcev = 1 + koraki.length;
    var h = '<table class="recept"><tbody>';
    if (R.predgretje) {
      h += '<tr><td class="predgretje" colspan="' + stolpcev + '">' + vstavi(R.predgretje, n) + '</td></tr>';
    }
    for (var i = 0; i < s.length; i++) {
      /* data-s in data-k sta zasidra za odkljukanje med kuhanjem; indeksi so
         stabilni, ker so vezani na vrstni red v receptu, ne na kolicino. */
      h += '<tr><td class="sestavina" data-s="' + i + '">' + sestavinaNiz(s[i], n) + '</td>';
      for (var j = 0; j < koraki.length; j++) {
        var o = obseg(koraki[j], s.length);
        if (o[0] === i + 1) {
          h += '<td class="' + razred(koraki[j]) + '" data-k="' + j + '" rowspan="' +
               (o[1] - o[0] + 1) + '">' +
               vstavi(koraki[j].besedilo, n).replace(/\n/g, '<br>') + '</td>';
        }
      }
      h += '</tr>';
    }
    return h + '</tbody></table>';
  }

  /* --- zlozen prikaz (telefon) --- */
  function zlozeno(n) {
    var s = R.sestavine || [], koraki = R.koraki || [];
    var h = '';
    if (R.predgretje) h += '<div class="predgretje-box">' + vstavi(R.predgretje, n) + '</div>';
    h += '<h2>' + t('Sestavine', 'Ingredients') + '</h2><ul class="sestavine">';
    for (var i = 0; i < s.length; i++) h += '<li data-s="' + i + '">' + sestavinaNiz(s[i], n) + '</li>';
    h += '</ul><h2>' + t('Postopek', 'Method') + '</h2><ol class="koraki">';
    for (var j = 0; j < koraki.length; j++) {
      var o = obseg(koraki[j], s.length);
      var besedilo = vstavi(koraki[j].besedilo, n).replace(/\n/g, ' ');
      var kaj = '';
      if (o[1] - o[0] + 1 < s.length) {
        var imena = [];
        for (var k = o[0] - 1; k < o[1]; k++) {
          if (!s[k]) continue;
          var ik = s[k].kratko;
          if (!ik) ik = jeSeznam(s[k].ime) ? ((EN ? s[k].ime[1] : s[k].ime[2]) || s[k].ime[0]) : s[k].ime;
          imena.push(vstavi(ik, n));
        }
        kaj = ' <span style="color:var(--muted)">(' + imena.join(', ') + ')</span>';
      }
      h += '<li data-k="' + j + '"><b>' + besedilo + '</b>' + kaj + '</li>';
    }
    return h + '</ol>';
  }

  /* --- diagram plasti ------------------------------------------------
     Neobvezno polje "plasti". Plasti so nastete OD ZGORAJ NAVZDOL, da se
     diagram bere tako, kot sladica dejansko izgleda. Izris je en sam in ima
     svoj ovoj: .tabela-ovoj in .zlozeno se pod 700 px izmenjujeta, diagram
     pa mora biti viden v obeh. */
  function plasti(n) {
    var pl = R.plasti;
    if (!pl || !pl.od_zgoraj || !pl.od_zgoraj.length) return '';
    var h = '<div class="plasti"><h2>' + (pl.naslov || t('Plasti', 'Layers')) +
            '</h2><div class="plasti-seznam">';
    for (var i = 0; i < pl.od_zgoraj.length; i++) {
      var p = pl.od_zgoraj[i];
      /* barva pride iz recepta naravnost v style, zato ven z vsem, kar bi
         lahko zaprlo atribut ali pripelo se eno pravilo */
      var barva = p.barva ? String(p.barva).replace(/["';<>]/g, '') : '';
      h += '<div class="plast"><span class="ime">' + vstavi(p.ime, n) +
           '</span><span class="vzorec"' +
           (barva ? ' style="background:' + barva + '"' : '') +
           '></span></div>';
    }
    return h + '</div></div>';
  }

  /* --- hranilna vrednost ---------------------------------------------
     Podatki na 100 g so v _assets/hranila.js. Sestavina se tam najde po
     imenu z nakupovalnega seznama (nakup), sicer po kratko oz. ime;
     "hranilo" v receptu to povozi, "hranilo": false jo izpusti.
     Masa: "gramov" iz recepta, sicer kol v g/ml/zlicah (enote in gostota
     "ml" iz hranila.js), sicer kosi krat "kos". Vse se preracuna z istim
     faktorjem kot kolicine, zato je vrednost na porcijo pri vsaki izbiri
     enaka. Kar se ne da izracunati, se izpise pod "Ni vračunano" - nikoli
     tiho ne izpade. */
  var HR = window.RECEPTI_HRANILA || null;

  function brezOznak(t) {
    return String(t).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
  }
  function kljucHranila(s) {
    var k = typeof s.hranilo === 'string' ? s.hranilo :
            typeof s.nakup === 'string' ? s.nakup : (s.kratko || s.ime);
    if (jeSeznam(k)) k = k[2] || k[0];
    return brezOznak(k).toLowerCase();
  }
  function vnosHranila(k) {
    var e = HR.sestavine[k], i = 0;
    while (e && e.enako && i++ < 5) e = HR.sestavine[String(e.enako).toLowerCase()];
    return e || null;
  }
  /* vrne [gramov, neposredno] ali null; neposredno = masa je zapisana v g */
  function masaSestavine(s, e, n) {
    var f = s.skaliraj === false ? 1 : faktor(n);
    if (typeof s.gramov === 'number') return [s.gramov * f, false];
    if (s.kol === null || s.kol === undefined) return null;
    if (s.enota) {
      var en = HR.enote[String(s.enota).toLowerCase()];
      if (!en) return null;
      if (en[0] === 'g') return [s.kol * f * en[1], true];
      return [s.kol * f * en[1] * (e.ml || 1), false];
    }
    return e.kos ? [s.kol * f * e.kos, false] : null;
  }
  /* masa = vsota mas sestavin, tudi vode in soli - osnova za "na 100 g",
     kadar recept nima stehtane koncne mase */
  function hranilaRecepta(n) {
    var r = { kcal: 0, b: 0, masa: 0, vrstice: [], ni: [] };
    (RS.sestavine || []).forEach(function (s, i) {
      var d = (R.sestavine || [])[i] || s;            /* prikaz: v izbranem jeziku */
      var ime = brezOznak(vstavi(d.kratko || (jeSeznam(d.ime) ? d.ime[0] : d.ime), n));
      if (s.hranilo === false) { r.ni.push(ime); return; }
      var e = vnosHranila(kljucHranila(s));
      if (!e) { r.ni.push(ime); return; }
      var m = masaSestavine(s, e, n);
      if (e.zanemarljivo || (!e.kcal && !e.b)) {         /* sol, voda: samo masa */
        if (m) r.masa += m[0];
        return;
      }
      if (!m) { r.ni.push(ime); return; }
      var v = { s: d, g: m[0], tocno: m[1], kcal: m[0] * e.kcal / 100, b: m[0] * (e.b || 0) / 100 };
      r.kcal += v.kcal;
      r.b += v.b;
      r.masa += v.g;
      r.vrstice.push(v);
    });
    return r;
  }
  function celo(v) {
    var r = Math.round(v);
    try { return r.toLocaleString(EN ? 'en-GB' : 'sl-SI'); } catch (e) { return String(r); }
  }
  function gramiNiz(v) { return (v >= 10 ? celo(v) : stevilo(v)) + '&nbsp;g'; }

  function hranila(n, odprto) {
    if (!HR || R.hranila === false) return '';
    var r = hranilaRecepta(n);
    if (!r.vrstice.length) return '';
    /* stolpca "na porcijo" in "za 12 porcij"; ce je kolicina 1 ali recept
       nima enote, bi bila enaka - takrat samo eden */
    var st = [];
    if (oblike && n !== 1) st.push([t('Na ', 'Per ') + oblike[0], n]);
    /* Na 100 g: iz stehtane koncne mase, ce jo recept ima, sicer iz mase
       surovih sestavin. Pecene in kuhane jedi izgubijo vodo, zato je druga
       moznost oznacena - na 100 g koncne jedi je tam vec. */
    var koncna = typeof R.koncna_masa === 'number' ? R.koncna_masa * faktor(n) : null;
    var masa100 = koncna || r.masa;
    if (masa100 > 0) st.push([koncna ? t('Na 100 g', 'Per 100 g') : t('Na 100 g surovega', 'Per 100 g raw'), masa100 / 100]);
    if (oblike) st.push([t('Za ', 'For ') + kolicinaNiz(n), 1]);
    else st.push([t('Cel recept', 'Whole recipe'), 1]);

    var h = '<div class="hranila"><h2>' + t('Hranilna vrednost', 'Nutrition') +
            ' <span class="pribl">' + t('približno', 'approximate') + '</span></h2>' +
            '<table class="povzetek"><thead><tr><th></th>';
    st.forEach(function (c) { h += '<th>' + c[0] + '</th>'; });
    h += '</tr></thead><tbody><tr><th>' + t('Energija', 'Energy') + '</th>';
    st.forEach(function (c) { h += '<td>' + celo(r.kcal / c[1]) + '&nbsp;kcal</td>'; });
    h += '</tr><tr><th>' + t('Beljakovine', 'Protein') + '</th>';
    st.forEach(function (c) { h += '<td>' + gramiNiz(r.b / c[1]) + '</td>'; });
    h += '</tr></tbody></table>';

    h += '<details class="po-sestavinah"' + (odprto ? ' open' : '') +
         '><summary>' + t('Po sestavinah', 'By ingredient') + '</summary><table><thead><tr>' +
         '<th>' + t('Sestavina', 'Ingredient') + '</th><th>' + t('Masa', 'Weight') +
         '</th><th>kcal</th><th>' + t('Beljakovine', 'Protein') + '</th></tr></thead><tbody>';
    r.vrstice.forEach(function (v) {
      /* ≈ = masa je izpeljana (kosi, zlice, gostota), ne zapisana v g */
      h += '<tr><td>' + sestavinaNiz(v.s, n) + '</td><td>' + (v.tocno ? '' : '≈') +
           gramiNiz(v.g) + '</td><td>' + celo(v.kcal) + '</td><td>' + gramiNiz(v.b) + '</td></tr>';
    });
    h += '</tbody></table></details><p class="opomba">' +
         (r.ni.length ? t('Ni vračunano: ', 'Not included: ') + r.ni.join(', ') + '. ' : '') +
         t('Iz surovih sestavin in tipičnih vrednosti na 100 g, brez izgub pri kuhanju. ',
           'From raw ingredients and typical values per 100 g, without cooking losses. ') +
         (koncna ? t('Na 100 g glede na stehtano končno jed (', 'Per 100 g of the weighed finished dish (') +
                   celo(koncna) + '&nbsp;g).'
                 : t('Na 100 g surovega: pečena ali kuhana jed izgubi vodo, zato ima na 100 g ' +
                     'običajno 10–30 % več.',
                     'Per 100 g raw: baking or cooking drives off water, so the finished dish ' +
                     'usually has 10–30 % more per 100 g.')) + '</p></div>';
    return h;
  }

  /* --- kosarica -> HA todo seznam prek webhooka --- */
  var NAST = window.RECEPTI_NASTAVITVE || {};
  var SESTAVINE = EN ? ['ingredient', 'ingredients'] : ['sestavina', 'sestavini', 'sestavine', 'sestavin'];
  /* Webhook je relativna pot, zato deluje samo, kadar stran streze HA
     (/local/recepti/...). Odprta z diska ali od drugod: gumba ni. */
  var kosaricaMozna = !!NAST.webhook && location.protocol.indexOf('http') === 0;

  function velikaZac(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  /* Seznam za kosarico: najprej prave sestavine, na koncu se neobvezni
     "predlogi" (npr. sadje po zelji) - ti so v seznamu odkljukani.
     Vedno iz slovenskega izvirnika (RS): nakupovalni seznam je slovenski,
     ne glede na jezik strani. */
  function zaNakup(n) {
    var sez = (RS.sestavine || [])
      .filter(function (s) { return s.nakup !== false; })
      .map(function (s) {
        var ime = typeof s.nakup === 'string' ? s.nakup : (s.kratko || s.ime);
        /* Na nakupovalni seznam gre imenovalnik mnozine ("Jajca"), ne sklon
           trenutne kolicine - na seznamu stoji izdelek, ne kolicina. */
        if (jeSeznam(ime)) ime = ime[2] || ime[0];
        var kol = '';
        if (s.kol !== null && s.kol !== undefined) {
          var v = s.skaliraj === false ? s.kol : s.kol * faktor(n);
          kol = stevilo(v).replace('.', ',') + (s.enota ? ' ' + s.enota : '');
        }
        if (typeof s.nakup_kolicina === 'string') kol = vstavi(s.nakup_kolicina, n);
        return { ime: velikaZac(vstavi(ime, n)), kolicina: kol };
      });
    (RS.predlogi || []).forEach(function (p) {
      sez.push({ ime: velikaZac(vstavi(p, n)), kolicina: '', predlog: true });
    });
    return sez;
  }

  function izrisiKosarico(n) {
    var box = document.querySelector('.kosarica');
    if (!box || box.hidden) return;
    var sez = zaNakup(n);
    var h = '<h2>' + t('Na seznam ', 'Add to list: ') + (NAST.seznam || t('nakupov', 'shopping')) + '</h2>';
    sez.forEach(function (s, i) {
      h += '<label><input type="checkbox" data-i="' + i + '"' + (s.predlog ? '' : ' checked') +
           '> <span>' + s.ime +
           (s.kolicina ? ' <span class="enota">' + s.kolicina + '</span>' : '') +
           (s.predlog ? ' <span class="enota">' + t('neobvezno', 'optional') + '</span>' : '') + '</span></label>';
    });
    h += '<div class="gumbi">' +
         '<button type="button" class="glavni potrdi">' + t('Dodaj', 'Add') + '</button>' +
         '<button type="button" class="tanki preklici">' + t('Prekliči', 'Cancel') + '</button></div>';
    box.innerHTML = h;
    box.querySelector('.potrdi').addEventListener('click', function () { poslji(this); });
    box.querySelector('.preklici').addEventListener('click', function () {
      box.hidden = true;
      obvesti('', '');
    });
  }

  function obvesti(besedilo, vrsta) {
    var o = document.querySelector('.obvestilo');
    if (!o) return;
    o.textContent = besedilo;
    o.className = 'obvestilo' + (vrsta ? ' ' + vrsta : '');
  }

  function poslji(gumb) {
    var box = document.querySelector('.kosarica');
    var sez = zaNakup(stanje);
    var izbrane = [];
    box.querySelectorAll('input[type=checkbox]').forEach(function (c) {
      if (c.checked) {
        var s = sez[Number(c.dataset.i)];
        izbrane.push({ ime: s.ime, kolicina: s.kolicina });
      }
    });
    if (!izbrane.length) { obvesti(t('Nič ni izbrano.', 'Nothing selected.'), 'napaka'); return; }

    gumb.disabled = true;
    obvesti(t('Pošiljam…', 'Sending…'), '');
    fetch('/api/webhook/' + NAST.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recept: RS.naslov, sestavine: izbrane })
    }).then(function (r) {
      if (!r.ok) throw new Error(t('HA je vrnil ', 'HA returned ') + r.status);
      box.hidden = true;
      obvesti(t('Dodano na seznam ', 'Added to list ') + (NAST.seznam || '') + ': ' +
              izbrane.length + ' ' + sklon(izbrane.length, SESTAVINE) + '.', 'ok');
    }).catch(function (e) {
      obvesti(t('Ni šlo: ', 'Failed: ') + e.message + t('. Deluje samo prek Home Assistanta, na domačem omrežju.',
              '. Works only through Home Assistant, on the home network.'), 'napaka');
    }).then(function () {
      gumb.disabled = false;
    });
  }

  /* --- pecica -> HA webhook -----------------------------------------
     Dva locena gumba, ker cas peke tece od trenutka, ko pekac gre noter,
     ne od vziga: gretje bi ga sicer jedlo. */
  var P = R.pecica || {};
  var pecicaNaVoljo = !!NAST.webhookPecica && location.protocol.indexOf('http') === 0;
  var grejeMozno = pecicaNaVoljo && !!P.temperatura;
  var casovnikMozen = pecicaNaVoljo && !!P.minute;

  function posljiPecici(podatki, sporocilo, gumb) {
    gumb.disabled = true;
    obvesti(t('Pošiljam…', 'Sending…'), '');
    podatki.recept = RS.naslov;
    return fetch('/api/webhook/' + NAST.webhookPecica, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(podatki)
    }).then(function (r) {
      if (!r.ok) throw new Error(t('HA je vrnil ', 'HA returned ') + r.status);
      obvesti(sporocilo, 'ok');
    }).catch(function (e) {
      obvesti(t('Ni šlo: ', 'Failed: ') + e.message + t('. Deluje samo prek Home Assistanta, na domačem omrežju.',
              '. Works only through Home Assistant, on the home network.'), 'napaka');
    }).then(function () {
      gumb.disabled = false;
    });
  }

  /* Gretje: dvostopenjska potrditev. Ta gumb prizge grelec v prazni
     kuhinji, zato ne sme biti stvar enega nakljucnega dotika na tablici.
     Naorozenost sama pade po 6 sekundah. */
  function gumbGretje(g) {
    var cakam = null;
    function pospravi() {
      clearTimeout(cakam);
      cakam = null;
      g.textContent = t('🔥 Segrej pečico — ', '🔥 Preheat oven — ') + P.temperatura + ' °C';
      g.classList.remove('glavni');
      g.classList.add('tanki');
    }
    pospravi();
    g.addEventListener('click', function () {
      if (!cakam) {
        g.textContent = t('Potrdi: ', 'Confirm: ') + P.temperatura + ' °C';
        g.classList.remove('tanki');
        g.classList.add('glavni');
        obvesti(t('Še enkrat klikni za vklop.', 'Click again to switch it on.'), '');
        cakam = setTimeout(function () { pospravi(); obvesti('', ''); }, 6000);
        return;
      }
      pospravi();
      posljiPecici({
        akcija: 'zazeni',
        temperatura: P.temperatura,
        program: P.program || 'top_bottom',
        hitro_predgretje: P.hitro_predgretje !== false
      }, t('Pečica se segreva na ' + P.temperatura + ' °C. Zagon traja do minute.',
            'Oven heating to ' + P.temperatura + ' °C. Start-up takes up to a minute.'), g);
    });
  }

  /* Casovnik: en klik, brez potrditve - klikas ga z vrocim pekacem v rokah,
     nastavi pa samo kuhinjski alarm pecice. */
  function gumbCasovnik(g) {
    g.textContent = t('⏱ Časovnik — ', '⏱ Timer — ') + P.minute + ' min';
    g.addEventListener('click', function () {
      posljiPecici({ akcija: 'casovnik', minute: P.minute },
                   t('Časovnik pečice teče: ', 'Oven timer running: ') + P.minute + ' min.', g);
    });
  }

  /* --- zunanje povezave (viri receptov) ------------------------------
     Povezava na tuj streznik se odpre v novem oknu. Brez tega bi se na
     kiosku in v HA aplikaciji tuja stran odprla znotraj iframea - vecina
     strani (Instagram, kulinarika.net) to prepove in ostane prazen okvir,
     iz katerega ni poti nazaj. HA aplikacija target=_blank preda sistemskemu
     brskalniku. Povezave v isti mapi (index.html) ostanejo, kot so. */
  function zunanjePovezave() {
    var povezave = document.querySelectorAll('.stran a[href]');
    for (var i = 0; i < povezave.length; i++) {
      var a = povezave[i];
      if (!/^https?:$/.test(a.protocol) || a.host === location.host) continue;
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    }
  }

  /* --- odkljukano med kuhanjem --------------------------------------
     Recept lahko traja cez noc, zato mora stanje prezivet zaprt zavihek -
     localStorage, ne pomnilnik. Shranjuje se po napravi in po receptu;
     indeksi so vezani na vrstni red v receptu, zato menjava kolicine
     odkljukanega ne zbrise. */
  var KLJUC = 'recepti-opravljeno-' + (location.pathname.split('/').pop() || 'recept');
  var opravljeno = { s: {}, k: {} };
  try {
    var prejsnje = JSON.parse(localStorage.getItem(KLJUC) || '{}');
    if (prejsnje) opravljeno = { s: prejsnje.s || {}, k: prejsnje.k || {} };
  } catch (e) { /* zasebni zavihek ali blokiran localStorage */ }

  function steviloOpravljenih() {
    var n = 0, x;
    for (x in opravljeno.s) if (opravljeno.s[x]) n++;
    for (x in opravljeno.k) if (opravljeno.k[x]) n++;
    return n;
  }
  function shraniOpravljeno() {
    try {
      if (steviloOpravljenih()) localStorage.setItem(KLJUC, JSON.stringify(opravljeno));
      else localStorage.removeItem(KLJUC);
    } catch (e) {}
  }
  /* Samo prestavi oznake - brez ponovnega izrisa. Poln izris bi ob vsakem
     kliku zamenjal celice pod prstom in odnesel oznako besedila. */
  function oznaciOpravljeno() {
    var el = document.querySelectorAll('.stran [data-s], .stran [data-k]');
    for (var i = 0; i < el.length; i++) {
      var e = el[i];
      var vrsta = e.hasAttribute('data-s') ? 's' : 'k';
      if (opravljeno[vrsta][e.getAttribute('data-' + vrsta)]) e.classList.add('opravljeno');
      else e.classList.remove('opravljeno');
    }
    var g = document.querySelector('.ponastavi');
    if (g) g.hidden = steviloOpravljenih() === 0;
  }
  function preklopiOpravljeno(dogodek) {
    var cel = dogodek.target;
    while (cel && cel.nodeType === 1 && cel !== document.body &&
           !cel.hasAttribute('data-s') && !cel.hasAttribute('data-k')) {
      cel = cel.parentNode;
    }
    if (!cel || cel.nodeType !== 1 || cel === document.body) return;
    if (dogodek.target.closest && dogodek.target.closest('a')) return;  /* vir pusti pri miru */
    var vrsta = cel.hasAttribute('data-s') ? 's' : 'k';
    var idx = cel.getAttribute('data-' + vrsta);
    opravljeno[vrsta][idx] = !opravljeno[vrsta][idx];
    shraniOpravljeno();
    oznaciOpravljeno();
  }

  /* --- zaslon naj ne ugasne med kuhanjem -----------------------------
     Tablica v kuhinji sicer ugasne sredi postopka, roke pa so umazane.
     Zahtevek sistem sprosti, ko stran ni vec vidna, zato ga ob vrnitvi
     obnovimo. Kjer tega ni (starejsi iOS, Fully Kiosk), tiho odpade. */
  var zaklep = null;
  /* Privzeto vklopljeno; izklop si naprava zapomni. Spremenljivka v
     pomnilniku zato, da gumb dela tudi, ce je localStorage blokiran. */
  var BUDNOST_KLJUC = 'recepti-budnost';
  var budnostIzklop = false;
  try { budnostIzklop = localStorage.getItem(BUDNOST_KLJUC) === 'izklop'; } catch (e) {}

  function budnost() {
    if (!navigator.wakeLock || budnostIzklop || zaklep ||
        document.visibilityState !== 'visible') return;
    navigator.wakeLock.request('screen').then(function (z) {
      zaklep = z;
      z.addEventListener('release', function () { zaklep = null; });
    }).catch(function () {});
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && !zaklep) budnost();
  });

  /* Gumb ob preklopu teme. Kjer brskalnik zaklepa zaslona ne pozna, ga ni -
     tako se na vsaki napravi takoj vidi, ali funkcija tam sploh obstaja. */
  var IKONA_KAVA = 'M2,21H20V19H2M20,8H18V5H20M20,3H4V13A4,4 0 0,0 8,17H14A4,4 0 0,0 18,13V10H20A2,2 0 0,0 22,8V5C22,3.89 21.1,3 20,3Z';
  var IKONA_KAVA_IZKLOP = 'M3.27 2L22 20.72L20.72 22L19.73 21H2V19H17.73L15.44 16.71C15 16.89 14.5 17 14 17H8C5.79 17 4 15.21 4 13V5.27L2 3.27L3.27 2M22 5V8C22 9.1 21.1 10 20 10H18V13C18 13.36 17.94 13.7 17.85 14.04L6.81 3H20C21.1 3 22 3.89 22 5M20 5H18V8H20V5Z';
  function gumbBudnost() {
    if (!navigator.wakeLock || !window.RECEPTI_ORODJA) return;
    var orodja = window.RECEPTI_ORODJA();
    if (!orodja) return;
    var g = document.createElement('button');
    g.type = 'button';
    g.className = 'budnost-gumb';
    function osvezi() {
      g.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="' +
                    (budnostIzklop ? IKONA_KAVA_IZKLOP : IKONA_KAVA) + '"></path></svg>';
      g.title = budnostIzklop ? t('Zaslon se lahko ugasne. Klikni, da ostane prižgan.',
                                  'Screen may turn off. Click to keep it on.')
                              : t('Zaslon ostane prižgan. Klikni za izklop.',
                                  'Screen stays on. Click to turn this off.');
      g.setAttribute('aria-label', g.title);
      g.setAttribute('aria-pressed', String(!budnostIzklop));
    }
    g.addEventListener('click', function () {
      budnostIzklop = !budnostIzklop;
      try {
        if (budnostIzklop) localStorage.setItem(BUDNOST_KLJUC, 'izklop');
        else localStorage.removeItem(BUDNOST_KLJUC);
      } catch (e) {}
      if (budnostIzklop) {
        if (zaklep) zaklep.release().catch(function () {});
        zaklep = null;
      } else {
        budnost();
      }
      osvezi();
    });
    osvezi();
    /* pred gumb za temo: ta se doda sele ob DOMContentLoaded, na konec */
    orodja.insertBefore(g, orodja.firstChild);
  }

  /* --- izvoz kot slika (za deljenje s prijatelji) ---------------------
     Brez knjiznice: klon recepta gre v SVG <foreignObject>, ki ga brskalnik
     izrise sam - rowspan, color-mix() in pisava so tocno taksni kot na
     strani. SVG se nato narise na canvas in shrani kot PNG. html2canvas bi
     vse to posnemal in pri color-mix() obstal.
     V sliki je samo recept: vedno svetla tema, vedno tabela (tudi ce izvoz
     sprozis s telefona), trenutno izbrana kolicina - brez gumbov, kosarice
     in kljukic. */
  var izvozMozen = location.protocol.indexOf('http') === 0;
  var IZVOZ_SIRINA = 980;                   /* .stran 940 + robova body */
  var IZVOZ_CSS =
    '.tabela-ovoj{overflow:visible}' +      /* sicer bi siroko tabelo odrezalo */
    '.stran{max-width:none}' +
    '.kolicina .izbrano{font-weight:600}';
  var izvozSlog = null;                     /* obljuba: CSS z vgrajenimi pisavami */
  var URL_V_CSS = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;

  function vDataUrl(blob) {
    return new Promise(function (ok, ne) {
      var r = new FileReader();
      r.onload = function () { ok(r.result); };
      r.onerror = function () { ne(r.error); };
      r.readAsDataURL(blob);
    });
  }
  function prenesi(naslov) {
    return fetch(naslov).then(function (r) {
      if (!r.ok) throw new Error(naslov + t(' je vrnil ', ' returned ') + r.status);
      return r;
    });
  }
  /* SVG kot slika ne sme nalagati nicesar od zunaj, zato gredo pisave
     noter kot data: URL. Naredi se enkrat na obisk strani. */
  function slogZaIzvoz() {
    if (izvozSlog) return izvozSlog;
    var link = document.querySelector('link[rel=stylesheet]');
    izvozSlog = prenesi(link.href).then(function (r) { return r.text(); }).then(function (css) {
      var naslovi = [];
      css.replace(URL_V_CSS, function (m, q, u) {
        if (u.indexOf('data:') !== 0 && naslovi.indexOf(u) === -1) naslovi.push(u);
        return m;
      });
      return Promise.all(naslovi.map(function (u) {
        return prenesi(new URL(u, link.href).href)
          .then(function (r) { return r.blob(); })
          .then(vDataUrl);
      })).then(function (podatki) {
        return css.replace(URL_V_CSS, function (m, q, u) {
          var i = naslovi.indexOf(u);
          return i === -1 ? m : 'url("' + podatki[i] + '")';
        });
      });
    });
    izvozSlog.catch(function () { izvozSlog = null; });   /* naslednji klik poskusi znova */
    return izvozSlog;
  }

  function klonZaIzvoz() {
    var k = document.querySelector('.stran').cloneNode(true);
    var ven = k.querySelectorAll('.nazaj, .orodja, .akcije, .kosarica, .obvestilo, .zlozeno');
    for (var i = 0; i < ven.length; i++) ven[i].parentNode.removeChild(ven[i]);
    /* gumbi za kolicino na sliki nimajo pomena - ostane samo izbrana */
    var kol = k.querySelector('.kolicina');
    if (kol) {
      kol.innerHTML = '<span class="oznaka">' + t('Količina', 'Makes') + '</span>' +
                      '<span class="izbrano">' + kolicinaNiz(stanje, true) + '</span>';
    }
    var od = k.querySelectorAll('.opravljeno');
    for (var j = 0; j < od.length; j++) od[j].classList.remove('opravljeno');
    /* zaprt "Po sestavinah" je na sliki samo mrtev gumb; razpet gre zraven */
    var ps = k.querySelector('details.po-sestavinah');
    if (ps && !ps.open) ps.parentNode.removeChild(ps);
    return new XMLSerializer().serializeToString(k);
  }

  /* Na telefonu (HA companion) je izvoz odrezal dno recepta: izris v SVG je
     bil do piksla enak kot na namizju, izmerjena visina pa 78 px premajhna
     (ciabatta 624 namesto 702). Zato: pisave nalozimo izrecno, pred meritvijo
     kratek premor, visino vzamemo iz vec virov in dodamo varnostni rob.
     Nekaj pik ozadja prevec na dnu ni opazno, odrezano besedilo pa je. */
  var IZVOZ_ROB = 8;

  /* d.fonts.ready se lahko razresi, se preden se nalaganje pisav sploh
     zacne - takrat se meri z nadomestno pisavo. Napaka pri eni pisavi
     izvoza ne ustavi. */
  function naloziPisave(d) {
    if (!d.fonts) return Promise.resolve();
    var cakaj = [];
    if (d.fonts.forEach) {
      d.fonts.forEach(function (p) { cakaj.push(p.load().catch(function () {})); });
    }
    return Promise.all(cakaj).then(function () { return d.fonts.ready; });
  }

  /* Najvecja od stirih meritev. scrollHeight je tu varen le zato, ker je
     iframe visok samo 100 px - pri visjem bi vrnil vsaj njegovo visino in
     kratki recepti bi dobili prazno dno. */
  function visinaDokumenta(d) {
    var b = d.body;
    return Math.ceil(Math.max(
      d.documentElement.getBoundingClientRect().height,
      d.documentElement.scrollHeight,
      b.getBoundingClientRect().height,
      b.scrollHeight
    ));
  }

  /* Mere izmerimo v skritem iframeu z istim slogom in isto sirino: tam
     veljajo iste media query kot v SVG, ne tiste od telefona, na katerem
     se izvoz sprozi. Tabela ne more biti ozja od svoje najmanjse sirine;
     ce je sirsa od strani, se slika razsiri. */
  function izmeri(css, html) {
    return new Promise(function (ok) {
      var f = document.createElement('iframe');
      f.setAttribute('aria-hidden', 'true');
      f.tabIndex = -1;
      f.style.cssText = 'position:fixed;left:-20000px;top:0;border:0;visibility:hidden;' +
                        'width:' + IZVOZ_SIRINA + 'px;height:100px';
      f.onload = function () {
        var d = f.contentDocument;
        void d.body.offsetHeight;   /* postavitev sprozi nalaganje pisav */
        naloziPisave(d).then(function () {
          /* se kratek premor, kot pri izrisu - nekateri WebViewi pisavo
             uveljavijo sele za razresitvijo obljube */
          setTimeout(function () {
            var w = IZVOZ_SIRINA;
            var tab = d.querySelector('table.recept');
            if (tab) {
              var rob = w - d.querySelector('.stran').getBoundingClientRect().width;
              w = Math.max(w, Math.ceil(tab.getBoundingClientRect().width + rob));
              f.style.width = w + 'px';
            }
            var mere = {
              w: w,
              h: visinaDokumenta(d) + IZVOZ_ROB,   /* bere se po novi sirini */
              ozadje: getComputedStyle(d.body).backgroundColor
            };
            document.body.removeChild(f);
            ok(mere);
          }, 150);
        });
      };
      f.srcdoc = '<!DOCTYPE html><html data-tema="svetlo"><head><meta charset="utf-8"><style>' +
                 css + IZVOZ_CSS + '</style></head><body>' + html + '</body></html>';
      document.body.appendChild(f);
    });
  }

  /* :root je v SVG sam <svg>, zato data-tema="svetlo" stoji na njem -
     temne barve po sistemu tako ne pridejo v sliko. */
  function svgZaIzvoz(css, html, mere) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + mere.w + '" height="' + mere.h +
           '" data-tema="svetlo"><style><![CDATA[' + css + IZVOZ_CSS + ']]></style>' +
           '<foreignObject x="0" y="0" width="100%" height="100%">' +
           '<html xmlns="http://www.w3.org/1999/xhtml"><body>' + html + '</body></html>' +
           '</foreignObject></svg>';
  }

  function rasteriziraj(svg, mere) {
    return new Promise(function (ok, ne) {
      var img = new Image();
      img.onload = function () {
        /* 2x za ostrino na telefonu; zelo dolge recepte omejimo, ker ima
           canvas na mobilnih napravah zgornjo mejo (~16 M tock). */
        var m = Math.min(2, Math.sqrt(16e6 / (mere.w * mere.h)));
        var c = document.createElement('canvas');
        c.width = Math.floor(mere.w * m);
        c.height = Math.floor(mere.h * m);
        var ctx = c.getContext('2d');
        function narisi() {
          ctx.fillStyle = mere.ozadje;
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
        }
        /* Prvi izris lahko ujame SVG, preden so v njem pripravljene
           pisave (Safari); drugi po kratkem premoru je zanesljiv. */
        narisi();
        setTimeout(function () {
          try {
            narisi();
            c.toBlob(function (b) {
              if (b) ok(b);
              else ne(new Error(t('brskalnik je vrnil prazno sliko', 'the browser returned an empty image')));
            }, 'image/png');
          } catch (e) { ne(e); }   /* npr. SecurityError, ce brskalnik canvas zaklene */
        }, 150);
      };
      img.onerror = function () { ne(new Error(t('izris ni uspel', 'rendering failed'))); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }

  function imeSlike() {
    var ime = (location.pathname.split('/').pop() || 'recept').replace(/\.html?$/i, '');
    try { ime = decodeURIComponent(ime); } catch (e) {}
    return ime + '.png';
  }

  /* Deljenje zahteva svez klik uporabnika, izdelava slike pa traja - zato
     najprej predogled, deljenje pa sele na gumbu v njem. */
  function pokaziIzvoz(blob) {
    var url = URL.createObjectURL(blob);
    var ime = imeSlike();
    var datoteka = null;
    try { datoteka = new File([blob], ime, { type: 'image/png' }); } catch (e) {}
    var lahkoDeli = !!(datoteka && navigator.canShare && navigator.canShare({ files: [datoteka] }));

    var okno = document.createElement('div');
    okno.className = 'izvoz-okno';
    okno.setAttribute('role', 'dialog');
    okno.setAttribute('aria-modal', 'true');
    okno.setAttribute('aria-label', t('Recept kot slika', 'Recipe as image'));
    var h = '<div class="okvir"><img><div class="gumbi">';
    if (lahkoDeli) {
      h += '<button type="button" class="glavni deli">' + t('Deli…', 'Share…') + '</button>';
    } else if (window.top !== window) {
      /* HA aplikacija (WebView) deljenja ne zna; sistemski brskalnik ga.
         Povezava odpre isti recept z #izvoz, ki sliko naredi sam. */
      h += '<a class="glavni brskalnik" target="_blank" rel="noopener">' + t('↗ Odpri v brskalniku', '↗ Open in browser') + '</a>';
    }
    h += '<a class="tanki shrani">' + t('Shrani', 'Save') + '</a>' +
         '<button type="button" class="tanki zapri">' + t('Zapri', 'Close') + '</button></div>' +
         '<p class="namig"></p></div>';
    okno.innerHTML = h;
    var img = okno.querySelector('img');
    img.src = url;
    img.alt = R.naslov;
    var shrani = okno.querySelector('.shrani');
    shrani.href = url;
    shrani.setAttribute('download', ime);
    var brskalnik = okno.querySelector('.brskalnik');
    if (brskalnik) {
      /* sistemski brskalnik nima nase izbire jezika - zato gre z v naslovu */
      var cilj = location.pathname + location.search;
      if (EN && !/[?&](jezik|lang)=/.test(location.search)) cilj += (location.search ? '&' : '?') + 'jezik=en';
      brskalnik.href = cilj + '#izvoz-' + stanje;
    }

    /* Nazaj (Android poteza, gumb brskalnika) naj zapre predogled, ne pa
       zapusti recepta. Stran poteze ne more ujeti neposredno, vidi pa korak
       po zgodovini - zato predogled doda svoj vnos, "nazaj" ga pobere. */
    var vZgodovini = false;
    try { history.pushState({ receptiPredogled: 1 }, ''); vZgodovini = true; } catch (e) {}
    var zaprto = false;
    function zapri(izZgodovine) {
      if (zaprto) return;
      zaprto = true;
      document.removeEventListener('keydown', tipka);
      window.removeEventListener('popstate', naNazaj);
      if (okno.parentNode) okno.parentNode.removeChild(okno);
      URL.revokeObjectURL(url);
      /* zaprto z gumbom: pobrisi se svoj vnos, sicer bi bil naslednji
         "nazaj" prazen korak */
      if (vZgodovini && izZgodovine !== true) history.back();
    }
    function naNazaj() { zapri(true); }
    window.addEventListener('popstate', naNazaj);
    function tipka(e) { if (e.key === 'Escape') zapri(); }
    document.addEventListener('keydown', tipka);
    okno.addEventListener('click', function (e) { if (e.target === okno) zapri(); });
    okno.querySelector('.zapri').addEventListener('click', zapri);
    var deli = okno.querySelector('.deli');
    if (deli) {
      deli.addEventListener('click', function () {
        navigator.share({ files: [datoteka], title: R.naslov, text: R.naslov }).catch(function (e) {
          if (e && e.name === 'AbortError') return;   /* uporabnik je sam preklical */
          okno.querySelector('.namig').textContent = t('Deljenje ni uspelo: ', 'Sharing failed: ') + (e && e.message || e);
        });
      });
    }
    document.body.appendChild(okno);
  }

  function izvoziSliko(gumb) {
    var prej = gumb.textContent;
    gumb.disabled = true;
    gumb.textContent = t('Pripravljam sliko…', 'Preparing image…');
    obvesti('', '');
    var html = klonZaIzvoz();
    slogZaIzvoz().then(function (css) {
      return izmeri(css, html).then(function (mere) {
        return rasteriziraj(svgZaIzvoz(css, html, mere), mere);
      });
    }).then(pokaziIzvoz).catch(function (e) {
      obvesti(t('Slike ni bilo mogoče narediti: ', 'Could not create the image: ') + (e && e.message || e) + '.', 'napaka');
    }).then(function () {
      gumb.disabled = false;
      gumb.textContent = prej;
    });
  }

  /* --- izris --- */
  function izrisi() {
    var n = stanje;
    document.querySelector('.tabela-ovoj').innerHTML = tabela(n);
    document.querySelector('.zlozeno').innerHTML = zlozeno(n);
    var ovojPlasti = document.querySelector('.plasti-ovoj');
    if (ovojPlasti) ovojPlasti.innerHTML = plasti(n);
    var ovojHranil = document.querySelector('.hranila-ovoj');
    if (ovojHranil) {
      /* razpet "Po sestavinah" naj ostane razpet tudi po menjavi kolicine */
      var bilo = ovojHranil.querySelector('.po-sestavinah');
      ovojHranil.innerHTML = hranila(n, !!(bilo && bilo.open));
    }
    var lead = document.querySelector('.lead');
    if (lead && R.opis) lead.innerHTML = vstavi(R.opis, n);
    document.querySelectorAll('.kolicina button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.n) === n));
    });
    izrisiKosarico(n);
    /* na koncu vsakega izrisa, ker tabela in opis nastaneta na novo */
    oznaciOpravljeno();
    zunanjePovezave();
  }

  /* --- ogrodje strani --- */
  var stran = document.querySelector('.stran');
  var h = '';
  if (R.kazalo !== false) {
    h += '<a class="nazaj" href="' + (EN ? 'index.html?jezik=en' : 'index.html') + '">&larr; ' +
         t('Vsi recepti', 'All recipes') + '</a>';
  }
  var kategorija = window.RECEPTI_KATEGORIJA ? window.RECEPTI_KATEGORIJA(R.kategorija) : R.kategorija;
  if (R.kategorija) h += '<div class="kicker">' + t('Recept', 'Recipe') + ' &middot; ' + kategorija + '</div>';
  h += '<h1>' + R.naslov + '</h1>';
  if (R.opis) h += '<p class="lead"></p>';
  if (izbire.length > 1) {
    h += '<div class="kolicina"><span class="oznaka">' + t('Količina', 'Makes') + '</span>';
    izbire.forEach(function (k) {
      h += '<button type="button" data-n="' + k + '">' + kolicinaNiz(k, true) + '</button>';
    });
    h += '</div>';
  }
  h += '<div class="tabela-ovoj"></div><div class="zlozeno"></div>' +
       '<div class="plasti-ovoj"></div>';
  /* Vrstica z akcijami je zdaj vedno, ker gumb za ponastavitev ni odvisen
     od kosarice ali pecice. */
  h += '<div class="akcije">';
  if (kosaricaMozna && R.kosarica !== false) {
    h += '<button type="button" class="tanki odpri-kosarico">' + t('🛒 V košarico', '🛒 Add to list') + '</button>';
  }
  if (grejeMozno) h += '<button type="button" class="tanki segrej-pecico"></button>';
  if (casovnikMozen) h += '<button type="button" class="tanki casovnik-pecice"></button>';
  if (izvozMozen) h += '<button type="button" class="tanki izvozi">' + t('📷 Izvozi kot sliko', '📷 Export as image') + '</button>';
  /* pokaze se sele, ko je kaj odkljukano */
  h += '<button type="button" class="tanki ponastavi" hidden>' + t('↺ Prični od začetka', '↺ Start over') + '</button>';
  h += '</div><div class="kosarica" hidden></div><div class="obvestilo"></div>';
  if (R.opombe && R.opombe.length) {
    h += '<div class="opombe">';
    R.opombe.forEach(function (o) { h += '<p>' + o + '</p>'; });
    h += '</div>';
  }
  /* na koncu: med kuhanjem je ne rabis, je pa del recepta (tisk, slika) */
  h += '<div class="hranila-ovoj"></div>';
  stran.innerHTML = h;
  document.title = R.naslov + (R.kategorija ? ' — ' + kategorija : '') + t(' | Recepti', ' | Recipes');

  document.querySelectorAll('.kolicina button').forEach(function (b) {
    b.addEventListener('click', function () { stanje = Number(b.dataset.n); izrisi(); });
  });
  var gretje = document.querySelector('.segrej-pecico');
  if (gretje) gumbGretje(gretje);
  var casovnik = document.querySelector('.casovnik-pecice');
  if (casovnik) gumbCasovnik(casovnik);
  var odpri = document.querySelector('.odpri-kosarico');
  if (odpri) {
    odpri.addEventListener('click', function () {
      var box = document.querySelector('.kosarica');
      box.hidden = !box.hidden;
      obvesti('', '');
      izrisiKosarico(stanje);
    });
  }
  var ponastavi = document.querySelector('.ponastavi');
  if (ponastavi) {
    ponastavi.addEventListener('click', function () {
      opravljeno = { s: {}, k: {} };
      shraniOpravljeno();
      izrisi();
    });
  }
  /* Poslusalec je na ovoju, ne na celicah: tabela se ob menjavi kolicine
     izrise na novo, ovoj pa ostane isti. */
  ['.tabela-ovoj', '.zlozeno'].forEach(function (izbor) {
    var ovoj = document.querySelector(izbor);
    if (ovoj) ovoj.addEventListener('click', preklopiOpravljeno);
  });
  var izvozi = document.querySelector('.izvozi');
  if (izvozi) izvozi.addEventListener('click', function () { izvoziSliko(izvozi); });

  /* "Odpri v brskalniku" iz HA aplikacije pride sem z #izvoz-<kolicina>.
     Kolicino vzamemo samo, ce je med ponujenimi. Znacko odstranimo, da
     ponovno nalaganje ne odpre izvoza se enkrat. */
  var zahtevaIzvoza = /^#izvoz(?:-([\d.]+))?$/.exec(location.hash);
  if (zahtevaIzvoza) {
    var zk = Number(zahtevaIzvoza[1]);
    if (zk && (zk === osnova || izbire.indexOf(zk) !== -1)) stanje = zk;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  }

  gumbBudnost();
  budnost();
  izrisi();
  if (zahtevaIzvoza && izvozi) izvoziSliko(izvozi);
})();
