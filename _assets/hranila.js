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
     en            angleško ime - za chipe pri iskanju po sestavinah v anglescini
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
    "voda": { "en": "Water", "kcal": 0, "b": 0 },
    "sol": { "en": "Salt", "zanemarljivo": true },
    "poper": { "en": "Pepper", "zanemarljivo": true },
    "beli poper": { "en": "White pepper", "zanemarljivo": true },
    "rožmarin": { "en": "Rosemary", "zanemarljivo": true },
    "lovorjev list": { "en": "Bay leaf", "zanemarljivo": true },
    "česen v prahu": { "en": "Garlic powder", "zanemarljivo": true },
    "čebula v prahu": { "en": "Onion powder", "zanemarljivo": true },
    "kitajskih pet začimb (five spice)": { "en": "Chinese five spice", "zanemarljivo": true },
    "soda bikarbona": { "en": "Baking soda", "zanemarljivo": true },
    "pecilni prašek": { "en": "Baking powder", "zanemarljivo": true },
    "vinski kamen (cream of tartar)": { "en": "Cream of tartar", "zanemarljivo": true },
    "goveja jušna osnova v gelu (knorr)": { "en": "Beef stock (gel)", "zanemarljivo": true, "opomba": "en lonček na lonec jedi" },

    "moka 00 manitoba": { "en": "Manitoba 00 flour", "kcal": 350, "b": 13 },
    "gladka moka": { "en": "Plain flour", "kcal": 345, "b": 10.5, "opomba": "tip 500" },
    "ovseni kosmiči": { "en": "Rolled oats", "kcal": 372, "b": 13.5 },
    "krompirjev škrob": { "en": "Potato starch", "kcal": 350, "b": 0.1 },
    "krompirjev škrob (grobi)": { "en": "Potato starch (coarse)", "enako": "krompirjev škrob" },
    "suhi kvas": { "en": "Dried yeast", "kcal": 325, "b": 40, "kos": 7, "opomba": "kos = zavojček" },
    "sveži kvas": { "en": "Fresh yeast", "kcal": 105, "b": 8.4 },

    "kristalni sladkor": { "en": "Granulated sugar", "kcal": 400, "b": 0 },
    "sladkor v prahu": { "en": "Icing sugar", "kcal": 400, "b": 0 },
    "sladkor turbinado": { "en": "Turbinado sugar", "enako": "kristalni sladkor" },
    "rjavi sladkor": { "en": "Brown sugar", "kcal": 380, "b": 0.1 },
    "vanilijev ekstrakt": { "en": "Vanilla extract", "kcal": 288, "b": 0.1, "ml": 0.88 },
    "kakav v prahu": { "en": "Cocoa powder", "kcal": 350, "b": 20, "ml": 0.36, "opomba": "nesladkan; 1 žlica = 5,4 g" },
    "kakav v prahu (nesladkan)": { "en": "Cocoa powder (unsweetened)", "enako": "kakav v prahu" },
    "temna čokolada (60–70 %)": { "en": "Dark chocolate (60–70%)", "kcal": 560, "b": 7.5 },
    "temna čokolada 70 %": { "en": "Dark chocolate 70%", "kcal": 570, "b": 9 },
    "grenko-sladka čokolada (60–65 %)": { "en": "Bittersweet chocolate (60–65%)", "kcal": 550, "b": 6.5 },
    "savojardi (piškoti za tiramisu)": { "en": "Savoiardi (ladyfingers)", "kcal": 390, "b": 9, "kos": 11 },
    "datlji": { "en": "Dates", "kcal": 282, "b": 2.5, "kos": 8, "opomba": "suhi, izkoščičeni, srednje veliki (ne medjool)" },
    "protein v prahu": { "en": "Protein powder", "kcal": 380, "b": 75, "opomba": "sirotkin koncentrat; poglej svojo embalažo" },
    "protein v prahu (čokoladni)": { "en": "Protein powder (chocolate)", "kcal": 375, "b": 72, "opomba": "sirotkin z okusom; poglej svojo embalažo" },

    "jajca": { "en": "Eggs", "kcal": 143, "b": 12.6, "kos": 50, "opomba": "celo jajce brez lupine, velikost M" },
    "rumenjak": { "en": "Egg yolk", "kcal": 322, "b": 15.9, "kos": 17 },
    "beljak": { "en": "Egg white", "kcal": 52, "b": 10.9, "kos": 33 },
    "mleko": { "en": "Milk", "kcal": 64, "b": 3.3, "ml": 1.03, "opomba": "polnomastno 3,5 %" },
    "sladka smetana": { "en": "Whipping cream", "kcal": 337, "b": 2.1, "opomba": "35 % m. m." },
    "kisla smetana": { "en": "Sour cream", "kcal": 205, "b": 2.8, "opomba": "20 % m. m." },
    "maslo": { "en": "Butter", "kcal": 717, "b": 0.9 },
    "mascarpone": { "en": "Mascarpone", "kcal": 420, "b": 5 },
    "ribana mozzarella": { "en": "Grated mozzarella", "kcal": 290, "b": 21, "opomba": "za pico, z manj vode" },
    "feta sir": { "en": "Feta", "kcal": 265, "b": 15 },
    "zrnati sir": { "en": "Cottage cheese", "kcal": 98, "b": 11 },
    "sir": { "en": "Cheese", "kcal": 350, "b": 25, "opomba": "poltrdi: edamec, gavda" },
    "majoneza": { "en": "Mayonnaise", "kcal": 700, "b": 1.2, "opomba": "polnomastna" },
    "hrenov namaz s smetano": { "en": "Creamed horseradish", "kcal": 300, "b": 2.5 },

    "goveji hrbet (roastbeef)": { "en": "Beef sirloin", "kcal": 170, "b": 21.5 },
    "mleta govedina": { "en": "Minced beef", "kcal": 230, "b": 18 },
    "svinjska ribica": { "en": "Pork tenderloin", "kcal": 110, "b": 21 },
    "piščančje prsi (file)": { "en": "Chicken breast", "kcal": 120, "b": 22.5, "kos": 180, "opomba": "kos = en file" },
    "piščančja stegna (brez kosti in kože)": { "en": "Chicken thighs (boneless, skinless)", "kcal": 120, "b": 20 },
    "pršut": { "en": "Prosciutto", "kcal": 260, "b": 26 },
    "dimljena šunka v rezinah": { "en": "Sliced smoked ham", "kcal": 125, "b": 18, "opomba": "kuhana dimljena" },
    "suhi ocvirki": { "en": "Pork cracklings", "kcal": 660, "b": 33, "opomba": "deklaracije 614–708 kcal" },
    "školjke ali rakci": { "en": "Clams or shrimp", "kcal": 85, "b": 18 },

    "rastlinsko olje": { "en": "Vegetable oil", "kcal": 884, "b": 0, "ml": 0.92 },
    "olje": { "en": "Oil", "enako": "rastlinsko olje" },
    "olje v razpršilu": { "en": "Cooking spray", "enako": "rastlinsko olje" },
    "olivno olje": { "en": "Olive oil", "kcal": 884, "b": 0, "ml": 0.91 },
    "sojina omaka": { "en": "Soy sauce", "kcal": 60, "b": 8, "ml": 1.1 },
    "ostrigina omaka": { "en": "Oyster sauce", "kcal": 51, "b": 1.4, "ml": 1.2 },
    "riževo vino": { "en": "Rice wine", "kcal": 130, "b": 0.5 },
    "vino shaoxing": { "en": "Shaoxing wine", "enako": "riževo vino" },
    "marsala (sladko vino)": { "en": "Marsala (sweet wine)", "kcal": 150, "b": 0.1, "ml": 1.02 },
    "kava za espresso": { "en": "Espresso", "kcal": 9, "b": 0.1, "opomba": "skuhan espresso" },
    "korejska sojina pasta (doenjang)": { "en": "Korean soybean paste (doenjang)", "kcal": 130, "b": 13 },
    "hrustljavi čili v olju": { "en": "Chili crisp", "kcal": 700, "b": 6 },
    "paradižnikova mezga": { "en": "Tomato paste", "kcal": 82, "b": 4.3 },

    "rjavi fižol v konzervi": { "en": "Canned red kidney beans", "kcal": 110, "b": 7.5, "opomba": "odcejen" },
    "zamrznjen grah": { "en": "Frozen peas", "kcal": 77, "b": 5.2, "ml": 0.56 },
    "kislo zelje": { "en": "Sauerkraut", "kcal": 20, "b": 1.1 },
    "krompir": { "en": "Potatoes", "kcal": 77, "b": 2, "kos": 170, "opomba": "kos = srednje velik" },
    "čebula": { "en": "Onion", "kcal": 40, "b": 1.1, "kos": 110 },
    "mlada čebula": { "en": "Spring onion", "kcal": 32, "b": 1.8, "kos": 15 },
    "pražena čebula": { "en": "Crispy fried onions", "kcal": 600, "b": 6, "opomba": "ocvrta, hrustljava" },
    "česen": { "en": "Garlic", "kcal": 149, "b": 6.4, "kos": 5, "opomba": "kos = strok" },
    "ingver": { "en": "Ginger", "kcal": 80, "b": 1.8 },
    "por": { "en": "Leek", "kcal": 61, "b": 1.5 },
    "bučka": { "en": "Courgette", "kcal": 17, "b": 1.2, "kos": 200 },
    "tajska bazilika": { "en": "Thai basil", "kcal": 23, "b": 3.2 },
    "jabolka": { "en": "Apples", "kcal": 52, "b": 0.3, "kos": 170 },
    "banane": { "en": "Bananas", "kcal": 89, "b": 1.1, "kos": 118, "opomba": "kos = olupljena srednja" }
  }
};
