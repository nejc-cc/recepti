# Recepti

Domača zbirka receptov kot statične strani: brez strežnika, baze in zunanjih
knjižnic. Stran: **https://recepti.nejc.cc**

Recept je **tabela**: sestavine so vrstice levo, koraki so stolpci desno, ki
se raztezajo čez sestavine, na katere se nanašajo.

## Kaj zna

- **Preračun količin** - gumbi za 1, 2, 4 ... porcije; slovenska sklanjatev
  enot in sestavin (1 jajce, 3 jajca, 6 jajc); neobvezna druga mera (cups).
- **Dva jezika** - gumb EN/SL preklopi vmesnik in recepte; `?jezik=en` v
  povezavi odpre stran naravnost v angleščini.
- **Telefon** - pod 700 px isti recept kot seznam sestavin in oštevilčen
  postopek. **Tisk** - samo recept, brez gumbov. **Temni način** po sistemu,
  gumb zgoraj desno ga povozi.
- **Med kuhanjem** - klik na sestavino ali korak ga prečrta (shrani se v
  brskalnik, po napravi); gumb s skodelico drži zaslon prižgan, dokler je
  recept odprt (kjer brskalnik to zna - drugje gumba ni).
- **Hranilna vrednost** - kcal in beljakovine na porcijo, na 100 g in skupaj,
  z razčlenitvijo po sestavinah.
- **Izvoz kot slika** - PNG za deljenje: svetla tema, tabela, naslovna
  fotka, brez gumbov.
- **Fotografije** - naslovna na vrhu recepta in v kazalu, dodatne v galeriji
  pod receptom, fotka koraka kot 📷 v koraku; dotik odpre ogled čez cel
  zaslon (poteg vstran, nazaj ga zapre).
- **Predogled povezave** - ob deljenju recepta (WhatsApp, Viber ...) kartica z
  naslovom, opisom in naslovno fotko.
- **Kazalo** - iskanje po imenu in kategoriji ter po sestavinah na dva načina:
  **S temi sestavinami** (recepti z vsemi izbranimi; ostanejo samo sestavine,
  ki se z njimi pojavljajo) in **Kaj imam doma** (odkljukaš shrambo - najprej
  recepti, ki jih lahko skuhaš, nato tisti, ki jim manjka ena ali dve
  sestavini; sol in začimbe štejejo kot doma).

## Zgradba

    recepti/<ime>.json      VIR: en recept = ena datoteka, samo podatki
    fotke/                  VIR fotografij - samo lokalno, ni v gitu
    orodja/                 generator, preizkus, predloga, opis polj
    docs/                   STRAN - to streže GitHub Pages
      index.html            kazalo z iskanjem
      recepti.js            kazalo - GENERIRANO
      recept/<ime>.html     strani receptov - GENERIRANE iz recepti/*.json
      fotke/<ime>/          fotografije za splet - GENERIRANE iz fotke/
      _assets/              slog, skripte, pisave, hranila.js

Strani receptov so generirane iz ene predloge (`orodja/stran-recepta.html`),
zato se ogrodje strani spreminja na enem mestu, recepti pa ostanejo čisti
podatki. **Strani v `docs/recept/` ne urejaj** - naslednji zagon generatorja
bi spremembo povozil.

    orodja/naredi.py             generator: strani, kazalo, žetoni, preverjanja
    orodja/preveri.py            preizkus v brskalniku (glej spodaj)
    orodja/oblikuj.py            enotna oblika JSON receptov
    orodja/stran-recepta.html    predloga strani recepta
    orodja/predloga-recepta.json izhodišče za nov recept
    orodja/POLJA.md              opis vseh polj recepta
    docs/_assets/recept.js       izris recepta, količine, hranila, izvoz
    docs/_assets/kazalo.js       izris in iskanje v kazalu
    docs/_assets/jezik.js        jezik (SL/EN), prevod kategorij, noga
    docs/_assets/tema.js         preklop svetlo/temno
    docs/_assets/hranila.js      hranilne vrednosti na 100 g in angleška imena
    docs/_assets/ha-nazaj.js     gumb "nazaj" v Home Assistant dashboardu
    docs/_assets/nastavitve.primer.js  vzorec nastavitev za Home Assistant

## Dodajanje recepta

1. `orodja/predloga-recepta.json` kopiraj v `recepti/<ime>.json`
   (male črke, brez šumnikov in presledkov - ime je tudi naslov strani in se
   po objavi ne menja).
2. Izpolni podatke - vsa polja so opisana v `orodja/POLJA.md`. Angleški
   prevod gre v blok `"en"`.
3. Poženi:

       python orodja/naredi.py
       python orodja/preveri.py

   Generator izdela stran in kazalo ter izpiše, česar ne zna vračunati
   (`hranila ...`) in kaj manjka v prevodu (`prevod ...`). Enotno obliko JSON
   da `python orodja/oblikuj.py recepti/<ime>.json`.

## Preizkus

`orodja/preveri.py` postreže `docs/` in v headless Edgu naloži kazalo in vsak
recept v slovenščini in angleščini, v 360 px širokem okvirju. Poroča o JS
napakah, neizrisanih straneh, strani, ki je širša od telefona, o slovenskem
besedilu vmesnika v angleški različici, o fotkah, ki se ne naložijo, in o
ogledu fotk, ki se ne odpre ali zapre. Ob težavi vrne kodo 1.
Na Windows ga poženi iz PowerShella ali cmd (iz git-basha se Edge odklopi).

## Jezik (slovensko / English)

- **Vmesnik**: vsak napis nosi oba prevoda kar ob sebi v kodi
  (`t('Prekliči', 'Cancel')`); jezik izbere `docs/_assets/jezik.js`. Izbira
  se zapomni v brskalniku (localStorage, kot tema; piškotkov ni).
- **Recepti**: vsak ima blok `"en"`, ki se položi čez slovenskega. Sestavine
  in koraki se ujemajo po vrstnem redu.
- **Iskanje po sestavinah** v angleščini uporablja imena iz polja `"en"` v
  `hranila.js`, zato je "Butter" isti chip v vseh receptih.

## Hranilna vrednost

Podatki so v `docs/_assets/hranila.js`, **na 100 g, surovo**, iz tipičnih
deklaracij v EU oz. USDA FoodData Central. Ključ je ime z nakupovalnega
seznama (polje `nakup`), zato ista sestavina v vseh receptih bere isto vrstico.

- "Na 100 g" se računa iz stehtane mase končne jedi (`koncna_masa`), če jo
  recept ima; sicer iz mase surovih sestavin - pečena ali kuhana jed izgubi
  vodo, zato ima na 100 g običajno 10-30 % več.
- Kar se ne da izračunati (sadje po želji, neobvezno), je izpisano pod
  "Ni vračunano".
- Natančnost je okoli ±10 %: izdelki se razlikujejo.

## Fotografije

Izvirnike daš v `fotke/` (jpg, png ali webp) in jih poimenuješ po receptu:

    fotke/ciabatta.jpg      naslovna
    fotke/ciabatta-1.jpg    dodatna 1 (galerija; vrstni red po številki,
    fotke/ciabatta-2.jpg    luknje so dovoljene - 10, 20, 30)

`orodja/naredi.py` iz njih izdela pomanjšane različice v `docs/fotke/<ime>/`
(WebP 1600 in 640 px, kvadrat 240 px za kazalo, JPEG 1200 × 630 za
predogled povezave), obrnjene po EXIF in v sRGB. **Vsi metapodatki ostanejo
zunaj** - telefon v fotko zapiše GPS, torej domači naslov; generator to po
izdelavi še preveri. Izvirniki niso v gitu, v gitu so samo pomanjšane
različice. Kar je že narejeno, si zapomni `fotke/.naredi.json`.

Izrezana fotka (PNG s prosojnim ozadjem) se nikjer ne obreže: na strani je
cela in brez okvirja, v kazalu in predogledu povezave na sredini.

Opisi, korak, h kateremu fotka sodi, in izrez so v receptu, v polju `"fotke"`
(`orodja/POLJA.md`). Generator opozori na fotko, ki ne ustreza nobenemu
receptu, na opis brez fotke, neobstoječ korak in nepreveden opis.

Kar je enkrat potisnjeno na GitHub, ostane v zgodovini javnega repa, tudi ko
fotko zamenjaš - pred objavo poglej ozadje (obrazi, dokumenti na pultu).

## Izvoz kot slika

Brez knjižnice: klon strani gre v SVG `<foreignObject>` s CSS in pisavami,
vgrajenimi kot `data:` URL, brskalnik ga izriše sam, rezultat se nariše na
canvas. Zato je slika enaka strani (rowspan, `color-mix()`, pisava). Vse, kar
naj bo v sliki, mora biti vgrajeno - zunanja slika bi ostala prazna; zato
se naslovna fotka pred izrisom prenese in vgradi kot `data:` URL.

## Home Assistant (neobvezno)

Mapo `docs/` lahko streže tudi Home Assistant iz `/config/www/` (na
`/local/`). Če tam obstaja `_assets/nastavitve.js` (vzorec:
`nastavitve.primer.js`), se pokažeta še gumba za nakupovalni seznam in
pečico, ki kličeta HA webhooke. Avtomatizacije niso del tega repa. Na javni
strani nastavitev ni, zato tudi gumbov ni.

HA streže `/local/` z 31-dnevnim predpomnilnikom, zato ima vsak sklic na
`_assets/*` žeton `?v=` iz vsebine datoteke - menja se samo ob resnični
spremembi. Zato mapa ostaja `_assets`: stara kopija kazala iz predpomnilnika
jo še vedno najde.

## Zasebni recepti

Recept z `"javno": false` ostane samo doma. Generator ga izpusti iz javnega
kazala (`docs/recepti.js`), doda v domače (`docs/recepti-doma.js`) ter vir,
stran in fotke vpiše v `.gitignore`, zato ga v tem repu ni.

## Viri in licenca

Recepti so predelani v tabelo in imajo vir naveden v opombah. Fotografij z
virov stran ne objavlja - vse fotografije so lastne. Avtor ali imetnik pravic lahko zahteva umik recepta
prek povezave v nogi strani - odpre obrazec na GitHubu
(`.github/ISSUE_TEMPLATE/umik-recepta.yml`). Noga se pokaže samo na javni
strani, na Home Assistantu (`/local/`) je ni.

Koda je pod licenco MIT (`LICENSE`). Recepti niso del licence.
