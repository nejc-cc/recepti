#!/usr/bin/env python3
"""Zgradi stran iz receptov.

    python orodja/naredi.py

Vir so podatki v recepti/<ime>.json. Iz njih nastane:

1. docs/recept/<ime>.html - stran vsakega recepta, iz ENE predloge
   (orodja/stran-recepta.html). Ogrodje strani se zato spreminja na enem
   mestu, recepti so samo podatki. Strani so GENERIRANE - ne urejaj jih.
2. docs/recepti.js - javno kazalo (brez "javno": false) in
   docs/recepti-doma.js - kazalo z vsemi recepti za Home Assistant.
   objavi.ps1 na HA zapise domacega pod imenom recepti.js.
3. ?v= zetoni na vseh sklicih na _assets/* (strani in docs/index.html).
   Zeton je iz VSEBINE datoteke, zato je enak na tem PC-ju, v gitu in na HA.

ZAKAJ ZETONI - Home Assistant streze /local/ z "Cache-Control: max-age=
2678400" (31 dni). Brez zetona brskalnik mesec dni ne vprasa vec za CSS in
JS. Zeton naredi iz URL-ja drug URL, samo kadar se datoteka res spremeni.

Sproti preveri se:
- ali stran zna vracunati hranilno vrednost vseh sestavin (hranila ...),
- ali ima recept popoln angleski prevod (prevod ...),
- zasebni recepti ("javno": false) gredo v .gitignore - vir in stran.

Osnutki: recepti/_osnutek-<ime>.json -> docs/recept/_osnutek-<ime>.html,
brez vnosa v kazalu (za predogled na HA), git jih ignorira.
"""
import hashlib
import html
import io
import json
import os
import re
import subprocess
import sys
import urllib.parse

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIR = os.path.join(REPO, "recepti")
STRAN = os.path.join(REPO, "docs")
STRANI = os.path.join(STRAN, "recept")
ASSETS = os.path.join(STRAN, "_assets")
PREDLOGA = os.path.join(REPO, "orodja", "stran-recepta.html")

CIST = re.compile(r"<[^>]+>|\{[a-z]+\}")
# Pravi HTML atribut (href="..." / src="..."), po zelji z ../ spredaj. V
# index.html se ista pot pojavi tudi v JS nizih, ki jih zeton ne sme povoziti.
SKLIC = re.compile(
    r'((?:href|src)=")((?:\.\./)?)(_assets/[A-Za-z0-9_.\-]+\.(?:css|js))(\?v=[A-Za-z0-9]*)?(")')
GITIGNORE_ZAC = "# --- zasebni recepti: vzdrzuje orodja/naredi.py, ne urejaj rocno ---"
GITIGNORE_KON = "# --- konec zasebnih receptov ---"


def beri(pot):
    with io.open(pot, encoding="utf-8") as f:
        return f.read()


def pisi(pot, vsebina):
    """Zapise samo, ce se vsebina razlikuje - brez laznih sprememb v gitu."""
    if os.path.exists(pot) and beri(pot) == vsebina:
        return False
    with io.open(pot, "w", encoding="utf-8", newline="\n") as f:
        f.write(vsebina)
    return True


def zeton_niza(s):
    return hashlib.sha1(s.encode("utf-8")).hexdigest()[:8]


def zeton(pot):
    with open(pot, "rb") as f:
        return hashlib.sha1(f.read()).hexdigest()[:8]


# --- zetoni podvirov -------------------------------------------------------
_zetoni = {}


def ozigosaj(besedilo):
    """Zamenja ?v= na vseh sklicih na _assets/*; manjkajoca datoteka ostane brez."""
    def zamenjaj(m):
        rel = m.group(3)
        if rel not in _zetoni:
            p = os.path.join(STRAN, rel.replace("/", os.sep))
            _zetoni[rel] = zeton(p) if os.path.exists(p) else None
        z = _zetoni[rel]
        return m.group(1) + m.group(2) + rel + ("" if z is None else "?v=" + z) + m.group(5)
    return SKLIC.sub(zamenjaj, besedilo)


# --- hranila in prevodi ----------------------------------------------------
def nalozi_hranila():
    """_assets/hranila.js je JS ovoj okoli cistega JSON - preverjamo z ISTIMI
    podatki, kot jih racuna stran."""
    pot = os.path.join(ASSETS, "hranila.js")
    if not os.path.exists(pot):
        return None
    m = re.search(r"window\.RECEPTI_HRANILA\s*=\s*(\{.*\})\s*;", beri(pot), re.S)
    try:
        return json.loads(m.group(1))
    except (AttributeError, json.JSONDecodeError) as e:
        print("!! _assets/hranila.js ni veljaven JSON (%s) - preverjanje hranil izpuscam" % e,
              file=sys.stderr)
        return None


def kljuc_sestavine(s):
    k = s.get("hranilo")
    if not isinstance(k, str):
        k = s.get("nakup") if isinstance(s.get("nakup"), str) else (s.get("kratko") or s.get("ime"))
    if isinstance(k, list):
        k = k[2] if len(k) > 2 else k[0]
    return re.sub(r"<[^>]+>", "", str(k)).replace("&nbsp;", " ").strip().lower()


def tezave_hranil(d, H):
    """Sestavine, ki jih stran ne bo znala vracunati. Zrcali recept.js:
    kljuc = hranilo | nakup | kratko | ime; masa = gramov | kol*enota | kol*kos.
    Namenoma izpuscene ("hranilo": false) niso tezava."""
    if d.get("hranila") is False:
        return []
    baza, enote, ven = H["sestavine"], H["enote"], []
    for s in d.get("sestavine", []):
        if s.get("hranilo") is False:
            continue
        k = kljuc_sestavine(s)
        e, i = baza.get(k), 0
        while e and "enako" in e and i < 5:
            e, i = baza.get(str(e["enako"]).lower()), i + 1
        if not e:
            ven.append('"%s" ni v hranila.js' % k)
        elif e.get("zanemarljivo") or (not e.get("kcal") and not e.get("b")):
            continue
        elif isinstance(s.get("gramov"), (int, float)):
            continue
        elif s.get("kol") is None:
            ven.append('"%s" nima kolicine - dodaj "gramov"' % k)
        elif s.get("enota"):
            if str(s["enota"]).lower() not in enote:
                ven.append('"%s": enote "%s" ni v hranila.js - dodaj "gramov"' % (k, s["enota"]))
        elif not e.get("kos"):
            ven.append('"%s" se steje v kosih, v hranila.js pa ni "kos" - dodaj "gramov"' % k)
    return ven


def angl_ime(ime, H):
    """Anglesko ime kanonicne sestavine iz hranila.js ("en"), po verigi "enako"."""
    if not H:
        return None
    baza = H["sestavine"]
    e, i = baza.get(ime.lower()), 0
    while e and i < 5:
        if e.get("en"):
            return e["en"]
        e, i = baza.get(str(e.get("enako", "")).lower()), i + 1
    return None


def sestavine_za_iskanje(d):
    """Kanonicna imena sestavin za iskanje po kazalu - kljuc je 'nakup', ki je
    ze normaliziran za nakupovalni seznam. nakup: false (voda, sol iz
    mlincka) izpade - po tem nihce ne isce."""
    ven = []
    for s in d.get("sestavine", []):
        if s.get("nakup") is False:
            continue
        ime = s.get("nakup")
        if not isinstance(ime, str):
            ime = s.get("kratko") or s.get("ime")
        if isinstance(ime, list):
            ime = ime[2] if len(ime) > 2 else ime[0]
        ime = re.sub(r"<[^>]+>", "", str(ime or "")).strip()
        if ime and ime not in ven:
            ven.append(ime)
    return sorted(ven, key=lambda x: x.lower())


def sestavine_za_iskanje_en(sl, H, ime):
    ven = []
    for s in sl:
        en = angl_ime(s, H)
        if not en:
            print('   prevod %s: sestavina "%s" nima "en" v hranila.js' % (ime, s))
            en = s
        if en not in ven:
            ven.append(en)
    return sorted(ven, key=lambda x: x.lower())


def kategorije_en():
    pot = os.path.join(ASSETS, "jezik.js")
    if not os.path.exists(pot):
        return None
    m = re.search(r"RECEPTI_KATEGORIJE\s*=\s*\{(.*?)\}", beri(pot), re.S)
    return set(re.findall(r"'([^']+)'\s*:", m.group(1))) if m else None


def tezave_prevoda(d):
    """Blok "en" se polozi cez slovenskega po indeksu - stevilo sestavin in
    korakov se mora ujemati, sicer bi ime ene sestavine stalo ob kolicini druge."""
    en = d.get("en")
    if not en:
        return ['ni angleskega prevoda ("en")']
    ven = []
    for kljuc in ("sestavine", "koraki"):
        a, b = len(d.get(kljuc) or []), len(en.get(kljuc) or [])
        if b and a != b:
            ven.append('"%s": v receptu %d, v prevodu %d' % (kljuc, a, b))
        elif not b and a:
            ven.append('"%s" ni prevedeno' % kljuc)
    if d.get("opombe") and not en.get("opombe"):
        ven.append('"opombe" niso prevedene')
    pl = (d.get("plasti") or {}).get("od_zgoraj") or []
    if pl and len((en.get("plasti") or {}).get("od_zgoraj") or []) != len(pl):
        ven.append('"plasti" niso (vse) prevedene')
    return ven


# --- strani ----------------------------------------------------------------
def navaden(t):
    return html.escape(CIST.sub("", html.unescape(t or "")).strip(), quote=True)


def ikona_uri(emoji):
    svg = ("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>"
           "<text y='.9em' font-size='90'>%s</text></svg>" % (emoji or "🍽"))
    return "data:image/svg+xml," + urllib.parse.quote(svg, safe=" ='/:.")


def izdelaj_stran(predloga, d, ime, javni_url):
    opis = navaden(d.get("povzetek") or d.get("opis"))
    dodatno = ""
    if javni_url:
        dodatno += '<meta property="og:url" content="%s">\n' % html.escape(javni_url, quote=True)
    if d.get("en"):
        dodatno += '<meta property="og:locale:alternate" content="en_GB">\n'
    # "</" v JSON bi zaprl <script>; "<\/" je v JSON isti znak
    podatki = json.dumps(d, ensure_ascii=False, indent=2).replace("</", "<\\/")
    stran = (predloga
             .replace("{{naslov}}", navaden(d.get("naslov", ime)))
             .replace("{{opis}}", opis)
             .replace("{{og_dodatno}}", dodatno)
             .replace("{{ikona}}", ikona_uri(d.get("ikona")))
             .replace("{{ime}}", ime)
             .replace("{{json}}", podatki))
    return ozigosaj(stran)


# --- zasebno ---------------------------------------------------------------
def zavaruj_zasebne(zasebni):
    """Zasebne recepte (vir in stran) vpise v .gitignore in glasno opozori,
    ce je kateri ze v gitu - .gitignore sledenih datotek ne izloci."""
    poti = []
    for z in sorted(zasebni):
        poti += ["/recepti/%s.json" % z, "/docs/recept/%s.html" % z]
    pot = os.path.join(REPO, ".gitignore")
    staro = beri(pot) if os.path.exists(pot) else ""
    blok = "\n".join([GITIGNORE_ZAC] + poti + [GITIGNORE_KON])
    if GITIGNORE_ZAC in staro and GITIGNORE_KON in staro:
        novo = re.sub(re.escape(GITIGNORE_ZAC) + r".*?" + re.escape(GITIGNORE_KON),
                      lambda m: blok, staro, flags=re.S)
    else:
        novo = staro.rstrip("\n") + ("\n\n" if staro.strip() else "") + blok + "\n"
    if pisi(pot, novo):
        print("   .gitignore: zasebnih receptov %d" % len(zasebni))
    if not os.path.isdir(os.path.join(REPO, ".git")):
        return
    try:
        sledeni = subprocess.run(["git", "-C", REPO, "ls-files", "--"] + [p.lstrip("/") for p in poti],
                                 capture_output=True, text=True).stdout.split()
    except OSError:
        sledeni = []
    for s in sledeni:
        print("!! %s je zaseben, a je ze v gitu - git rm --cached \"%s\" in preveri zgodovino"
              % (s, s), file=sys.stderr)


def zapisi_kazalo(pot, vnosi):
    """Kazalo nosi tudi zetone podvirov: recepti.js se edini vedno nalozi svez,
    zato index popravi svoj CSS tudi, ko sam lezi v predpomnilniku."""
    podviri = {}
    for rel in ("_assets/recept.css", "_assets/kazalo.js", "_assets/tema.js",
                "_assets/recept.js", "_assets/jezik.js"):
        p = os.path.join(STRAN, rel.replace("/", os.sep))
        if os.path.exists(p):
            podviri[rel] = zeton(p)
    return pisi(pot,
                "/* Samodejno zgrajeno z orodja/naredi.py - ne urejaj rocno. */\n"
                "window.RECEPTI = " + json.dumps(vnosi, ensure_ascii=False, indent=2) + ";\n"
                "window.RECEPTI_PODVIRI = " + json.dumps(podviri, ensure_ascii=False, indent=2) + ";\n")


def main():
    os.makedirs(STRANI, exist_ok=True)
    predloga = beri(PREDLOGA)
    H = nalozi_hranila()
    KAT = kategorije_en()
    cname = os.path.join(STRAN, "CNAME")
    baza_url = ("https://" + beri(cname).strip()) if os.path.exists(cname) else None

    vsi, javni, zasebni, strani, spremenjenih = [], [], [], set(), 0
    for datoteka in sorted(os.listdir(VIR)):
        if not datoteka.endswith(".json"):
            continue
        ime = datoteka[:-5]
        osnutek = ime.startswith("_osnutek-")
        if ime.startswith("_") and not osnutek:
            continue
        try:
            d = json.loads(beri(os.path.join(VIR, datoteka)))
        except json.JSONDecodeError as e:
            print("!! recepti/%s: napaka v JSON (%s) - preskocim" % (datoteka, e), file=sys.stderr)
            continue
        if H:
            for t in tezave_hranil(d, H):
                print("   hranila %s: %s" % (ime, t))
        for t in tezave_prevoda(d):
            print("   prevod %s: %s" % (ime, t))
        if KAT is not None and d.get("kategorija") and d["kategorija"].lower() not in KAT:
            print('   prevod %s: kategorija "%s" ni v jezik.js' % (ime, d["kategorija"]))

        zaseben = d.get("javno") is False
        if zaseben:
            zasebni.append(ime)
        url = None if (zaseben or osnutek or not baza_url) else "%s/recept/%s.html" % (baza_url, ime)
        vsebina = izdelaj_stran(predloga, d, ime, url)
        if pisi(os.path.join(STRANI, ime + ".html"), vsebina):
            spremenjenih += 1
            print("   stran recept/%s.html" % ime)
        strani.add(ime + ".html")
        if osnutek:
            continue

        sl = sestavine_za_iskanje(d)
        en = d.get("en") or {}
        vnos = {
            "datoteka": "recept/%s.html" % ime,
            "v": zeton_niza(vsebina),
            "naslov": d.get("naslov", ime),
            "kategorija": d.get("kategorija", ""),
            "povzetek": d.get("povzetek") or CIST.sub("", d.get("opis", "")).strip(),
            "sestavine": sl,
            "sestavine_en": sestavine_za_iskanje_en(sl, H, ime),
        }
        if en.get("naslov"):
            vnos["naslov_en"] = en["naslov"]
        if en.get("povzetek") or en.get("opis"):
            vnos["povzetek_en"] = en.get("povzetek") or CIST.sub("", en.get("opis", "")).strip()
        vsi.append(vnos)
        if not zaseben:
            javni.append(vnos)

    # strani brez vira (preimenovan ali izbrisan recept) - so generirane, gredo
    for obstojeca in os.listdir(STRANI):
        if obstojeca.endswith(".html") and obstojeca not in strani:
            os.remove(os.path.join(STRANI, obstojeca))
            print("   odstranjena recept/%s (vira ni vec)" % obstojeca)

    uredi = lambda v: (v["kategorija"].lower(), v["naslov"].lower())
    vsi.sort(key=uredi)
    javni.sort(key=uredi)
    zapisi_kazalo(os.path.join(STRAN, "recepti.js"), javni)
    zapisi_kazalo(os.path.join(STRAN, "recepti-doma.js"), vsi)
    index = os.path.join(STRAN, "index.html")
    if pisi(index, ozigosaj(beri(index))):
        print("   ozigosan index.html")
    zavaruj_zasebne(zasebni)

    print("strani: %d, spremenjenih %d | kazalo: javno %d, doma %d (zasebnih %d)"
          % (len(strani), spremenjenih, len(javni), len(vsi), len(zasebni)))


if __name__ == "__main__":
    main()
