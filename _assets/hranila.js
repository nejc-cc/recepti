/* Hranilne vrednosti sestavin za izracun v receptih (recept.js).

   Vrednosti so NA 100 g uzitnega dela, SUROVO, zaokrozene. Vir: tipicne
   deklaracije v EU, kjer jih ni, USDA FoodData Central. To so povprecja,
   ne analiza tvojega izdelka - natancnost je nekje +-10 %. Kjer se izdelki
   mocno razlikujejo (protein v prahu, cokolada, sir), je v "opomba" zapisano,
   katera razlicica je mislena; vrednost lahko popravis po svoji embalazi.

   KLJUC je ime z nakupovalnega seznama (polje "nakup" v receptu), z malimi
   crkami. Ce sestavina nakupa nima ali je drug izdelek (rumenjak ima nakup
   "Jajca"), jo recept preusmeri s "hranilo": "<kljuc>".

   Polja vnosa:
     kcal          energija na 100 g
     b             beljakovine v g na 100 g
     kos           g na kos, kadar recept steje kose brez enote (jajce, strok)
     ml            gostota v g/ml, kadar recept meri v ml ali zlicah; privzeto 1
     enako         ta vnos je samo drugo ime za navedeni kljuc
     zanemarljivo  v receptnih kolicinah nima energije (sol, zacimbe) -
                   ne steje se in ne rabi kolicine
     opomba        za cloveka; izracun je ne bere

   "enote" pretvori enoto iz recepta v g ali ml. Mora biti veljaven JSON
   (brez komentarjev in zadnjih vejic) - bere ga tudi naredi-kazalo.py. */
window.RECEPTI_HRANILA = {
  "enote": {
    "g": ["g", 1], "dag": ["g", 10], "kg": ["g", 1000],
    "ml": ["ml", 1], "dl": ["ml", 100], "l": ["ml", 1000],
    "žlica": ["ml", 15], "žlici": ["ml", 15], "žlice": ["ml", 15], "žlic": ["ml", 15],
    "čajna žlička": ["ml", 5], "čajni žlički": ["ml", 5], "čajne žličke": ["ml", 5], "čajnih žličk": ["ml", 5],
    "žlička": ["ml", 5], "žlički": ["ml", 5], "žličke": ["ml", 5], "žličk": ["ml", 5],
    "skodelica": ["ml", 240], "skodelici": ["ml", 240], "skodelice": ["ml", 240], "skodelic": ["ml", 240],
    "cup": ["ml", 240], "cups": ["ml", 240]
  },
  "sestavine": {
    "voda": { "kcal": 0, "b": 0 },
    "sol": { "zanemarljivo": true },
    "poper": { "zanemarljivo": true },
    "beli poper": { "zanemarljivo": true },
    "rožmarin": { "zanemarljivo": true },
    "lovorjev list": { "zanemarljivo": true },
    "česen v prahu": { "zanemarljivo": true },
    "čebula v prahu": { "zanemarljivo": true },
    "kitajskih pet začimb (five spice)": { "zanemarljivo": true },
    "soda bikarbona": { "zanemarljivo": true },
    "pecilni prašek": { "zanemarljivo": true },
    "vinski kamen (cream of tartar)": { "zanemarljivo": true },
    "goveja jušna osnova v gelu (knorr)": { "zanemarljivo": true, "opomba": "en lonček na lonec jedi" },

    "moka 00 manitoba": { "kcal": 350, "b": 13 },
    "gladka moka": { "kcal": 345, "b": 10.5, "opomba": "tip 500" },
    "ovseni kosmiči": { "kcal": 372, "b": 13.5 },
    "krompirjev škrob": { "kcal": 350, "b": 0.1 },
    "krompirjev škrob (grobi)": { "enako": "krompirjev škrob" },
    "suhi kvas": { "kcal": 325, "b": 40, "kos": 7, "opomba": "kos = zavojček" },
    "sveži kvas": { "kcal": 105, "b": 8.4 },

    "kristalni sladkor": { "kcal": 400, "b": 0 },
    "sladkor v prahu": { "kcal": 400, "b": 0 },
    "sladkor turbinado": { "enako": "kristalni sladkor" },
    "rjavi sladkor": { "kcal": 380, "b": 0.1 },
    "vanilijev ekstrakt": { "kcal": 288, "b": 0.1, "ml": 0.88 },
    "kakav v prahu": { "kcal": 350, "b": 20, "ml": 0.36, "opomba": "nesladkan; 1 žlica = 5,4 g" },
    "kakav v prahu (nesladkan)": { "enako": "kakav v prahu" },
    "temna čokolada (60–70 %)": { "kcal": 560, "b": 7.5 },
    "temna čokolada 70 %": { "kcal": 570, "b": 9 },
    "grenko-sladka čokolada (60–65 %)": { "kcal": 550, "b": 6.5 },
    "savojardi (piškoti za tiramisu)": { "kcal": 390, "b": 9, "kos": 11 },
    "datlji": { "kcal": 282, "b": 2.5, "kos": 8, "opomba": "suhi, izkoščičeni, srednje veliki (ne medjool)" },
    "protein v prahu": { "kcal": 380, "b": 75, "opomba": "sirotkin koncentrat; poglej svojo embalažo" },
    "protein v prahu (čokoladni)": { "kcal": 375, "b": 72, "opomba": "sirotkin z okusom; poglej svojo embalažo" },

    "jajca": { "kcal": 143, "b": 12.6, "kos": 50, "opomba": "celo jajce brez lupine, velikost M" },
    "rumenjak": { "kcal": 322, "b": 15.9, "kos": 17 },
    "beljak": { "kcal": 52, "b": 10.9, "kos": 33 },
    "mleko": { "kcal": 64, "b": 3.3, "ml": 1.03, "opomba": "polnomastno 3,5 %" },
    "sladka smetana": { "kcal": 337, "b": 2.1, "opomba": "35 % m. m." },
    "kisla smetana": { "kcal": 205, "b": 2.8, "opomba": "20 % m. m." },
    "maslo": { "kcal": 717, "b": 0.9 },
    "mascarpone": { "kcal": 420, "b": 5 },
    "ribana mozzarella": { "kcal": 290, "b": 21, "opomba": "za pico, z manj vode" },
    "feta sir": { "kcal": 265, "b": 15 },
    "zrnati sir": { "kcal": 98, "b": 11 },
    "sir": { "kcal": 350, "b": 25, "opomba": "poltrdi: edamec, gavda" },
    "majoneza": { "kcal": 700, "b": 1.2, "opomba": "polnomastna" },
    "hrenov namaz s smetano": { "kcal": 300, "b": 2.5 },

    "goveji hrbet (roastbeef)": { "kcal": 170, "b": 21.5 },
    "mleta govedina": { "kcal": 230, "b": 18 },
    "svinjska ribica": { "kcal": 110, "b": 21 },
    "piščančje prsi (file)": { "kcal": 120, "b": 22.5, "kos": 180, "opomba": "kos = en file" },
    "piščančja stegna (brez kosti in kože)": { "kcal": 120, "b": 20 },
    "pršut": { "kcal": 260, "b": 26 },
    "dimljena šunka v rezinah": { "kcal": 125, "b": 18, "opomba": "kuhana dimljena" },
    "suhi ocvirki": { "kcal": 660, "b": 33, "opomba": "deklaracije 614–708 kcal" },
    "školjke ali rakci": { "kcal": 85, "b": 18 },

    "rastlinsko olje": { "kcal": 884, "b": 0, "ml": 0.92 },
    "olje": { "enako": "rastlinsko olje" },
    "olje v razpršilu": { "enako": "rastlinsko olje" },
    "olivno olje": { "kcal": 884, "b": 0, "ml": 0.91 },
    "sojina omaka": { "kcal": 60, "b": 8, "ml": 1.1 },
    "ostrigina omaka": { "kcal": 51, "b": 1.4, "ml": 1.2 },
    "riževo vino": { "kcal": 130, "b": 0.5 },
    "vino shaoxing": { "enako": "riževo vino" },
    "marsala (sladko vino)": { "kcal": 150, "b": 0.1, "ml": 1.02 },
    "kava za espresso": { "kcal": 9, "b": 0.1, "opomba": "skuhan espresso" },
    "korejska sojina pasta (doenjang)": { "kcal": 130, "b": 13 },
    "hrustljavi čili v olju": { "kcal": 700, "b": 6 },
    "paradižnikova mezga": { "kcal": 82, "b": 4.3 },

    "rjavi fižol v konzervi": { "kcal": 110, "b": 7.5, "opomba": "odcejen" },
    "zamrznjen grah": { "kcal": 77, "b": 5.2, "ml": 0.56 },
    "kislo zelje": { "kcal": 20, "b": 1.1 },
    "krompir": { "kcal": 77, "b": 2, "kos": 170, "opomba": "kos = srednje velik" },
    "čebula": { "kcal": 40, "b": 1.1, "kos": 110 },
    "mlada čebula": { "kcal": 32, "b": 1.8, "kos": 15 },
    "pražena čebula": { "kcal": 600, "b": 6, "opomba": "ocvrta, hrustljava" },
    "česen": { "kcal": 149, "b": 6.4, "kos": 5, "opomba": "kos = strok" },
    "ingver": { "kcal": 80, "b": 1.8 },
    "por": { "kcal": 61, "b": 1.5 },
    "bučka": { "kcal": 17, "b": 1.2, "kos": 200 },
    "tajska bazilika": { "kcal": 23, "b": 3.2 },
    "jabolka": { "kcal": 52, "b": 0.3, "kos": 170 },
    "banane": { "kcal": 89, "b": 1.1, "kos": 118, "opomba": "kos = olupljena srednja" }
  }
};
