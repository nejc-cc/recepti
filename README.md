# Recepti

Domača zbirka receptov kot statične strani: brez strežnika, baze in zunanjih
knjižnic. Stran: **https://recepti.nejc.cc**

Vsak recept je ena HTML datoteka z JSON blokom, ves izris naredi
`_assets/recept.js`. Recept je **tabela**: sestavine so vrstice levo, koraki
so stolpci desno, ki se raztezajo čez sestavine, na katere se nanašajo.

## Kaj zna

- **Preračun količin** - gumbi za 1, 2, 4 ... porcije; slovenska sklanjatev
  enot in sestavin (1 jajce, 3 jajca, 6 jajc); neobvezna druga mera (cups).
- **Telefon** - pod 700 px isti recept kot seznam sestavin in oštevilčen
  postopek. **Tisk** - samo recept, brez gumbov. **Temni način** po sistemu,
  gumb zgoraj desno ga povozi.
- **Med kuhanjem** - klik na sestavino ali korak ga prečrta (shrani se v
  brskalnik, po napravi); gumb s skodelico drži zaslon prižgan, dokler je
  recept odprt (kjer brskalnik to zna - drugje gumba ni).
- **Hranilna vrednost** - kcal in beljakovine na porcijo, na 100 g in skupaj,
  z razčlenitvijo po sestavinah.
- **Izvoz kot slika** - PNG za deljenje: svetla tema, tabela, brez gumbov.
- **Kazalo** - iskanje po imenu, kategoriji in sestavinah ("kaj imam doma").

## Dodajanje recepta

1. `_template.html` kopiraj pod novim imenom, npr. `kruh-pirin.html`
   (male črke, brez šumnikov in presledkov).
2. Izpolni JSON blok - vsa polja so opisana v komentarju v predlogi.
3. Poženi generator:

       python _assets/naredi-kazalo.py

   Prepiše `recepti.js` (kazalo), osveži `?v=` žetone in preveri, ali zna
   stran vračunati hranilno vrednost vseh sestavin.

Datoteke z začetnim `_` generator preskoči, zato tam stoji predloga.

## Kaj je kaj

    index.html                   kazalo z iskanjem
    recepti.js                   kazalo - SAMODEJNO zgrajeno, ne urejaj
    _template.html               predloga + opis vseh polj
    _assets/recept.js            izris recepta, količine, hranila, izvoz
    _assets/recept.css           slog (tabela, telefon, tisk, temni način)
    _assets/kazalo.js            izris in iskanje v kazalu
    _assets/tema.js              preklop svetlo/temno
    _assets/hranila.js           hranilne vrednosti na 100 g
    _assets/ha-nazaj.js          gumb "nazaj" v Home Assistant dashboardu
    _assets/nastavitve.primer.js vzorec neobveznih nastavitev za Home Assistant
    _assets/naredi-kazalo.py     generator
    _assets/fonts/               Source Serif 4 (latin + latin-ext)

## Jezik (slovensko / English)

Gumb **EN / SL** zgoraj desno preklopi celo stran - vmesnik in recepte.
Privzeto je slovensko. Izbira se zapomni v brskalniku (localStorage, kot
tema; piškotkov ni). Povezava s `?jezik=en` odpre stran naravnost v
angleščini - taka se lahko pošlje.

- **Vmesnik**: vsak napis nosi oba prevoda kar ob sebi v kodi
  (`t('Prekliči', 'Cancel')`); jezik izbere `_assets/jezik.js`, ki prevede
  tudi kategorije.
- **Recepti**: vsak ima blok `"en"`, ki se položi čez slovenskega - glej
  predlogo. Sestavine in koraki se ujemajo po vrstnem redu.
- **Iskanje po sestavinah** v angleščini uporablja imena iz polja `"en"` v
  `_assets/hranila.js`, zato je "Butter" isti chip v vseh receptih.
- Generator opozori na recept brez prevoda, na neujemanje števila sestavin
  ali korakov in na kategorijo ali sestavino brez angleškega imena.

## Hranilna vrednost

Podatki so v `_assets/hranila.js`, **na 100 g, surovo**, iz tipičnih
deklaracij v EU oz. USDA FoodData Central. Ključ je ime z nakupovalnega
seznama (polje `nakup`), zato ista sestavina v vseh receptih bere isto vrstico.

- "Na 100 g" se računa iz stehtane mase končne jedi (`koncna_masa`), če jo
  recept ima; sicer iz mase surovih sestavin - pečena ali kuhana jed izgubi
  vodo, zato ima na 100 g običajno 10-30 % več.
- Kar se ne da izračunati (sadje po želji, neobvezno), je izpisano pod
  "Ni vračunano".
- Natančnost je okoli ±10 %: izdelki se razlikujejo.

## Izvoz kot slika

Brez knjižnice: klon strani gre v SVG `<foreignObject>` s CSS in pisavami,
vgrajenimi kot `data:` URL, brskalnik ga izriše sam, rezultat se nariše na
canvas. Zato je slika enaka strani (rowspan, `color-mix()`, pisava). Vse, kar
naj bo v sliki, mora biti vgrajeno - zunanja slika bi ostala prazna.

## Home Assistant (neobvezno)

Isto mapo lahko streže Home Assistant iz `/config/www/` (na `/local/`). Če
tam obstaja `_assets/nastavitve.js` (vzorec: `nastavitve.primer.js`), se
pokažeta še gumba za nakupovalni seznam in pečico, ki kličeta HA webhooke.
Avtomatizacije niso del tega repa. Na javni strani nastavitev ni, zato tudi
gumbov ni.

HA streže `/local/` z 31-dnevnim predpomnilnikom, zato ima vsak sklic na
`_assets/*` žeton `?v=` iz vsebine datoteke - menja se samo ob resnični
spremembi.

## Zasebni recepti

Recept z `"javno": false` ostane samo doma. V git delovni mapi ga generator
izpusti iz kazala in vpiše v `.gitignore`, zato ga v tem repu ni.

## Viri

Recepti so predelani v tabelo in imajo vir naveden v opombah. Fotografij z
virov stran ne objavlja.

Avtor ali imetnik pravic lahko zahteva umik recepta prek povezave v nogi
strani - odpre obrazec na GitHubu (`.github/ISSUE_TEMPLATE/umik-recepta.yml`).
Noga se pokaze samo na javni strani, na Home Assistantu (`/local/`) je ni.
