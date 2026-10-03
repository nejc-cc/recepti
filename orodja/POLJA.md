# Polja recepta

Recept je ena datoteka `recepti/<ime>.json`. Nov recept: kopiraj
`orodja/predloga-recepta.json`, izpolni in pozeni `python orodja/naredi.py`.
Za enotno obliko: `python orodja/oblikuj.py recepti/<ime>.json`.

```
    ikona       emoji za zavihek brskalnika, npr. "🍰" (za "kategorija")
    naslov      obvezno
    kategorija  npr. "kruh", "sladica", "glavna jed" - prikaze se nad naslovom in v kazalu
    javno       false = recept je samo doma (na HA), na javno stran ne gre - npr.
                recept iz placljive knjige ali druzinski. Privzeto javen.
    povzetek    ena vrstica za kazalo (po njej se tudi isce)
    opis        uvodni odstavek; {kolicina} vstavi npr. "4 ciabatte", {n} samo stevilo
    osnova      kolicina, za katero veljajo spodnje kolicine sestavin
                oblike = ["1 X", "2 X", "3-4 X", "5+ X"] - sklon v besedilu ("Za 2 hlebca")
                oblike_gumb = isto, a za gumbe, ce se sklon razlikuje ("2 hlebca" vs "2 hlebca")
                oboje je neobvezno
    izbire      gumbi za preracun kolicin; izpusti ali daj eno vrednost, ce preracuna ne rabis
    predgretje  vrstica cez celo sirino na vrhu tabele (neobvezno)
    sestavine   kol = stevilo za "osnovo" (preracuna se samo); enota; ime
                kol: null      -> brez stevilke (npr. "ščepec soli")
                skaliraj:false -> stevilka se NE preracunava
                ime je lahko tudi stiri sklonske oblike, ce se sklanja po svoji
                  kolicini: ["jajce","jajci","jajca","jajc"] -> 3 jajca, 6 jajc
                kratko: ime v imenovalniku ("moka") - uporabi se v zlozenem prikazu na telefonu
                nakup: false -> sestavina NE gre v kosarico (voda, led, ...)
                       "Moka 00 manitoba" -> tako ime gre na nakupovalni seznam
                       (privzeto se uporabi kratko oz. ime)
                nakup_kolicina: kolicina na nakupovalnem seznamu, ce se razlikuje
                merica: neobvezna druga mera v oklepaju, ki se preracunava skupaj
                  s sestavino (npr. ameriski cupsi):
                    "merica": { "kol": 2, "enota": ["cup","cups","cups","cups"] }
                  enota je niz ali stiri sklonske oblike; kol velja za osnovno
                  kolicino recepta. V kosarico merica NE gre.
                nakup_kolicina: "{n} × 400 g" -> kolicina, kot naj se zapise na
                       nakupovalni seznam, ce se razlikuje od kol+enota
                       (npr. kupujes konzerve, v receptu pa je odcejena teza)
                hranilo: kljuc v docs/_assets/hranila.js, ce se razlikuje od nakupa
                       (rumenjak ima nakup "Jajca", hranilo "rumenjak");
                       false -> ne steje se v hranilno vrednost (sadje po zelji,
                       neobvezno) in se izpise pod "Ni vračunano"
                gramov: masa v g pri osnovni kolicini, kadar je ni mogoce
                       izracunati iz kol+enota ("2 žlica kisle smetane" ->
                       30, "olje za praženje" -> 14); preracunava se s kolicino
    predlogi    neobvezno; imena, ki se v kosarici ponudijo NEobkljukana
                ["jagode", "banane", "borovnice"] - za sestavine "po zelji"
    koraki      stolpci desno od sestavin, po vrsti
                besedilo: "\n" pomeni prelom vrstice v celici
                vrstice: [1,3] = korak pokriva 1.-3. sestavino (privzeto vse)
                slog: "tih" (crno, navadno - cakanje, vmesni korak); privzeto modro krepko.
                      "zakljucek" oznaci zadnji korak, izgleda pa kot privzeti
    opombe      kratki odstavki pod tabelo (neobvezno)
    plasti      neobvezno; izrise diagram plasti pod tabelo
                  naslov      neobvezen, privzeto "Plasti"
                  od_zgoraj   seznam plasti OD VRHA NAVZDOL; vsaka ima
                              ime in neobvezno barva (npr. "#6b4423");
                              brez barve se uporabi --line-soft
                Primer: "plasti": { "od_zgoraj": [ { "ime": "kakav",
                  "barva": "#6b4423" }, { "ime": "krema" } ] }
    hranila     false = skrij hranilno vrednost (neobvezno; privzeto se
                izracuna iz sestavin in docs/_assets/hranila.js)
    koncna_masa stehtana masa KONCNE jedi v g pri osnovni kolicini (neobvezno).
                Z njo je "na 100 g" natancen; brez nje se racuna iz mase
                surovih sestavin, ki pri peki in kuhanju izgubijo vodo.
    fotke       neobvezno; opisi fotografij. Fotke same so datoteke v fotke/
                (ni v gitu): fotke/<ime>.jpg je naslovna, fotke/<ime>-<n>.jpg
                dodatna n (jpg, png, webp; vrstni red po n). Kljuc je
                "naslovna" ali stevilka n kot niz; vrednost je opis ali:
                  opis    besedilo pod fotko in v ogledu (sme imeti <b>, <a>)
                  korak   stevilka koraka od 1 (kot v seznamu na telefonu) -
                          v tem koraku se pokaze 📷, ki odpre to fotko
                  izrez   "50% 30%" - tocka, ki ostane vidna, ko se fotka
                          obreze (naslovna, kvadrat v kazalu, galerija,
                          predogled povezave); privzeto sredina. Pri izrezani
                          fotki (prosojno ozadje) ne velja - ta je vedno cela
                Primer: "fotke": { "naslovna": { "izrez": "50% 70%" },
                  "1": { "opis": "Testo po 12 h", "korak": 3 }, "2": "Zlaganje" }
                Anglesko: "en": { "fotke": { "1": "Dough after 12 h" } }
    kazalo      false = skrij povezavo "Vsi recepti" (neobvezno)
    kosarica    false = skrij gumb "V kosarico" (neobvezno)
    en          ANGLESKI PREVOD - generator opozori, ce ga ni. Polozi se cez
                slovensko besedilo, zato imata "sestavine" in "koraki" ENAKO
                stevilo elementov v ENAKEM vrstnem redu kot zgoraj.
                  naslov, povzetek, opis, predgretje, opombe - kot zgoraj
                  osnova.oblike   ["serving", "servings"] - ednina, mnozina
                  sestavine[i]    { "ime": "flour" } ali { "ime": ["egg", "eggs"] },
                                  neobvezno "kratko", "enota" (samo prikaz, npr.
                                  "tbsp" - racuna se iz slovenske) in
                                  "merica_enota" (enota druge mere)
                  koraki          seznam besedil, npr. ["mix\ndry", "bake"]
                  plasti          { "od_zgoraj": ["cocoa", "cream"] }
                  fotke           { "1": "Dough after 12 h" } - samo opisi
                Kosarica ostane slovenska: na seznam gre vedno slovensko ime.
                Nova kategorija -> dodaj jo v docs/_assets/jezik.js; nova sestavina
                -> "en" v docs/_assets/hranila.js.
    predlogi    neobvezne stvari za kosarico; v seznamu so ODKLJUKANE
                (npr. sadje po zelji). Ce recept pece na papirju za peko,
                dodaj sem "papir za peko".
    pecica      neobvezno; iz tega nastaneta DVA locena gumba
                  temperatura      °C (50-250)  -> gumb "Segrej pecico"
                  minute           cas peke     -> gumb "Casovnik"
                  program          top_bottom | vroci_zrak | pizza | spodnji
                  hitro_predgretje true/false (privzeto true)
                Locena sta zato, ker cas peke tece od trenutka, ko pekac gre
                noter, ne od vziga. Gretje zahteva dva klika (drugi je
                potrditev), casovnik enega.
```
