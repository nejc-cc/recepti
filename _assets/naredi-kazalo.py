#!/usr/bin/env python3
"""Zgradi recepti.js (kazalo) in ozigosa verzije podvirov.

Zazeni po vsakem dodanem, preimenovanem ali spremenjenem receptu:

    python _assets/naredi-kazalo.py

Kaj naredi:

1. V vseh HTML datotekah osvezi "?v=..." na sklicih na _assets/*.css in
   _assets/*.js.

2. Preisce vse *.html v mapi, prebere vgrajeni
   <script type="application/json" id="recept"> in zapise seznam v recepti.js.
   Vsak vnos dobi tudi "v" - zeton iz vsebine datoteke recepta. Zato se
   kazalo gradi PO tocki 1: zeton mora opisati koncno vsebino.

Zetoni so iz VSEBINE, ne iz datuma spremembe: isti recept da isti zeton na
tem PC-ju, v gitu in na HA, zato kopiranje ne sprozi laznih sprememb.

ZASEBNI RECEPTI ("javno": false) - na HA so, na javno stran ne gredo. Kdaj
je kaj javno, doloca mapa sama, ne zastavica ob zagonu, da se ne da pozabiti:

- v git delovni mapi (ima .git) jih kazalo IZPUSTI, njihova imena pa se
  zapisejo v .gitignore - tako ne pridejo v repo niti po nesreci;
- drugod (Q:\\www\\recepti na HA) so v kazalu vsi.

ZAKAJ TOCKA 2 - Home Assistant streze VSE pod /local/ z glavo
"Cache-Control: public, max-age=2678400" (31 dni). Brez zetona brskalnik
mesec dni ne vprasa vec za CSS in JS, tudi ce ju zamenjas; Ctrl+F5 na
dashboardu pa podvirov v iframeu ne osvezi zanesljivo. Zeton naredi iz URL-ja
drug URL in cache je s tem zaobiden - samodejno in samo takrat, ko se
datoteka res spremeni.

Kazalo (recepti.js) se v index.html nalozi dinamicno s casovnim zetonom, ker
je index.html tudi sam predmet istega 31-dnevnega cachea.
"""
import hashlib
import json
import os
import re
import sys

MAPA = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOK = re.compile(r'<script[^>]*id="recept"[^>]*>(.*?)</script>', re.S)
CIST = re.compile(r"<[^>]+>|\{[a-z]+\}")
# Namenoma zahteva pravi HTML atribut (href="..." / src="..." brez presledkov):
# v index.html se ista pot pojavi tudi znotraj JS nizov, ki jih zeton ne sme
# povoziti, sicer razbije sestavljanje URL-ja v bootstrapu.
SKLIC = re.compile(
    r'((?:href|src)=")(_assets/[A-Za-z0-9_.\-]+\.(?:css|js))(\?v=[A-Za-z0-9]*)?(")')


GIT = os.path.isdir(os.path.join(MAPA, ".git"))
GITIGNORE_ZAC = "# --- zasebni recepti: vzdrzuje naredi-kazalo.py, ne urejaj rocno ---"
GITIGNORE_KON = "# --- konec zasebnih receptov ---"


def zeton(pot):
    """Kratek zeton iz vsebine; menja se le ob resnicni spremembi."""
    with open(pot, "rb") as f:
        return hashlib.sha1(f.read()).hexdigest()[:8]


def sestavine_za_iskanje(d):
    """Kanonicna imena sestavin za iskanje po kazalu.

    Kljuc je 'nakup' - ime izdelka z nakupovalnega seznama. To polje je ze
    normalizirano (da Bring ne dobi dvojnikov), zato se "Kakav v prahu" iz
    treh receptov ujame, medtem ko so 'kratko' in 'ime' pisana za konkretni
    recept ("kakav", "kakav v prahu", "kakava v prahu", "kakav za glazuro").

    nakup: false pomeni "tega se ne kupuje" - voda, sol iz mlincka, del za
    glazuro. To so ravno sestavine, po katerih nihce ne isce, zato izpadejo.
    """
    ven = []
    for s in d.get("sestavine", []):
        if s.get("nakup") is False:
            continue
        ime = s.get("nakup")
        if not isinstance(ime, str):
            ime = s.get("kratko") or s.get("ime")
        if isinstance(ime, list):          # stiri sklonske oblike
            ime = ime[2] if len(ime) > 2 else ime[0]
        if not ime:
            continue
        ime = re.sub(r"<[^>]+>", "", str(ime)).strip()
        if ime and ime not in ven:
            ven.append(ime)
    return sorted(ven, key=lambda x: x.lower())


def nalozi_hranila():
    """_assets/hranila.js je JS ovoj okoli cistega JSON - tu ga preberemo,
    da lahko preverimo recepte z ISTIMI podatki, kot jih racuna stran."""
    pot = os.path.join(MAPA, "_assets", "hranila.js")
    if not os.path.exists(pot):
        return None
    with open(pot, encoding="utf-8") as f:
        m = re.search(r"window\.RECEPTI_HRANILA\s*=\s*(\{.*\})\s*;", f.read(), re.S)
    try:
        return json.loads(m.group(1))
    except (AttributeError, json.JSONDecodeError) as e:
        print("!! _assets/hranila.js ni veljaven JSON (%s) - preverjanje hranil izpuscam" % e,
              file=sys.stderr)
        return None


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
        k = s.get("hranilo")
        if not isinstance(k, str):
            k = s.get("nakup") if isinstance(s.get("nakup"), str) else (s.get("kratko") or s.get("ime"))
        if isinstance(k, list):
            k = k[2] if len(k) > 2 else k[0]
        k = re.sub(r"<[^>]+>", "", str(k)).replace("&nbsp;", " ").strip().lower()
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
    """Anglesko ime kanonicne sestavine iz hranila.js ("en"), po verigi
    "enako"; None, ce ga ni."""
    if not H:
        return None
    baza = H["sestavine"]
    e, i = baza.get(ime.lower()), 0
    while e and i < 5:
        if e.get("en"):
            return e["en"]
        e, i = baza.get(str(e.get("enako", "")).lower()), i + 1
    return None


def sestavine_za_iskanje_en(sl, H, ime_recepta):
    """Ista imena kot sestavine_za_iskanje, prevedena prek hranila.js - tako
    je "Butter" isti chip v vseh receptih. Manjkajoce ime ostane slovensko."""
    ven = []
    for s in sl:
        en = angl_ime(s, H)
        if not en:
            print('   prevod %s: sestavina "%s" nima "en" v hranila.js' % (ime_recepta, s))
            en = s
        if en not in ven:
            ven.append(en)
    return sorted(ven, key=lambda x: x.lower())


def kategorije_en():
    """Kljuci slovarja kategorij iz jezik.js (za opozorilo o manjkajocem prevodu)."""
    pot = os.path.join(MAPA, "_assets", "jezik.js")
    if not os.path.exists(pot):
        return None
    m = re.search(r"RECEPTI_KATEGORIJE\s*=\s*\{(.*?)\}", open(pot, encoding="utf-8").read(), re.S)
    return set(re.findall(r"'([^']+)'\s*:", m.group(1))) if m else None


def tezave_prevoda(d):
    """Angleski blok "en" mora imeti toliko sestavin in korakov kot recept,
    sicer bi se prevod zamaknil - ime ene sestavine bi stalo ob kolicini druge."""
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


def recepti():
    """Vrne (vnosi za kazalo, imena zasebnih datotek)."""
    H = nalozi_hranila()
    KAT = kategorije_en()
    vnosi, zasebni = [], []
    for ime in sorted(os.listdir(MAPA)):
        if not ime.lower().endswith(".html") or ime.startswith("_") or ime == "index.html":
            continue
        pot = os.path.join(MAPA, ime)
        with open(pot, encoding="utf-8") as f:
            vsebina = f.read()
        m = BLOK.search(vsebina)
        if not m:
            continue  # ni recept v novi obliki (npr. star izvoz)
        try:
            d = json.loads(m.group(1))
        except json.JSONDecodeError as e:
            print("!! %s: napaka v JSON (%s) - preskocim" % (ime, e), file=sys.stderr)
            continue
        if H:
            for t in tezave_hranil(d, H):
                print("   hranila %s: %s" % (ime, t))
        if d.get("javno") is False:
            zasebni.append(ime)
            if GIT:
                continue          # v javno kazalo ne gre
        for t in tezave_prevoda(d):
            print("   prevod %s: %s" % (ime, t))
        if KAT is not None and d.get("kategorija") and d["kategorija"].lower() not in KAT:
            print('   prevod %s: kategorija "%s" ni v jezik.js (RECEPTI_KATEGORIJE)' % (ime, d["kategorija"]))
        sl = sestavine_za_iskanje(d)
        en = d.get("en") or {}
        vnos = {
            "datoteka": ime,
            "v": zeton(pot),
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
        vnosi.append(vnos)
    vnosi.sort(key=lambda v: (v["kategorija"].lower(), v["naslov"].lower()))
    return vnosi, zasebni


def zavaruj_zasebne(zasebni):
    """V git delovni mapi zasebne recepte vpise v .gitignore in glasno
    opozori, ce je kateri ze v gitu (.gitignore sledenih datotek ne izloci)."""
    pot = os.path.join(MAPA, ".gitignore")
    staro = open(pot, encoding="utf-8").read() if os.path.exists(pot) else ""
    blok = "\n".join([GITIGNORE_ZAC] + ["/" + z for z in sorted(zasebni)] + [GITIGNORE_KON])
    if GITIGNORE_ZAC in staro and GITIGNORE_KON in staro:
        novo = re.sub(re.escape(GITIGNORE_ZAC) + r".*?" + re.escape(GITIGNORE_KON),
                      lambda m: blok, staro, flags=re.S)
    else:
        novo = staro.rstrip("\n") + ("\n\n" if staro.strip() else "") + blok + "\n"
    if novo != staro:
        with open(pot, "w", encoding="utf-8", newline="\n") as f:
            f.write(novo)
        print("   .gitignore: zasebnih receptov %d" % len(zasebni))
    try:
        import subprocess
        sledeni = subprocess.run(["git", "-C", MAPA, "ls-files", "--"] + zasebni,
                                 capture_output=True, text=True).stdout.split()
    except OSError:
        sledeni = []
    for s in sledeni:
        print("!! %s je oznacen kot zaseben, a je ze v gitu - "
              "git rm --cached \"%s\" in preveri zgodovino" % (s, s), file=sys.stderr)


def zapisi_kazalo(vnosi):
    """recepti.js nosi seznam receptov IN aktualne zetone podvirov.

    Zetoni so tu zato, ker se recepti.js edini vedno nalozi svez (casovni
    zeton v index.html). Index tako popravi svoj CSS tudi takrat, ko sam lezi
    v brskalnikovem cachu - brez tega bi bilo treba ob vsaki spremembi sloga
    rocno menjati URL dashboarda.
    """
    podviri = {}
    # nastavitve.js namenoma ne: ni v javnem repu, index pa ga tu ne rabi
    for rel in ("_assets/recept.css", "_assets/kazalo.js", "_assets/tema.js",
                "_assets/recept.js", "_assets/jezik.js"):
        p = os.path.join(MAPA, rel.replace("/", os.sep))
        if os.path.exists(p):
            podviri[rel] = zeton(p)

    izhod = os.path.join(MAPA, "recepti.js")
    with open(izhod, "w", encoding="utf-8", newline="\n") as f:
        f.write("/* Samodejno zgrajeno z _assets/naredi-kazalo.py - ne urejaj rocno. */\n")
        f.write("window.RECEPTI = ")
        json.dump(vnosi, f, ensure_ascii=False, indent=2)
        f.write(";\n")
        f.write("window.RECEPTI_PODVIRI = ")
        json.dump(podviri, f, ensure_ascii=False, indent=2)
        f.write(";\n")
    return izhod


def ozigosaj():
    """V vseh HTML datotekah popravi ?v= na sklicih na _assets/*."""
    zetoni = {}
    spremenjenih = 0

    def zamenjaj(m):
        prefiks, rel, konec = m.group(1), m.group(2), m.group(4)
        if rel not in zetoni:
            p = os.path.join(MAPA, rel.replace("/", os.sep))
            zetoni[rel] = zeton(p) if os.path.exists(p) else None
        z = zetoni[rel]
        return prefiks + rel + ("" if z is None else "?v=" + z) + konec

    for ime in sorted(os.listdir(MAPA)):
        if not ime.lower().endswith(".html"):
            continue
        pot = os.path.join(MAPA, ime)
        with open(pot, encoding="utf-8") as f:
            stara = f.read()
        nova = SKLIC.sub(zamenjaj, stara)
        if nova != stara:
            with open(pot, "w", encoding="utf-8", newline="\n") as f:
                f.write(nova)
            spremenjenih += 1
            print("   ozigosan %s" % ime)
    return spremenjenih


def main():
    # najprej zetoni v HTML, sele nato kazalo - glej docstring
    n = ozigosaj()
    print("verzije podvirov: %s" % ("posodobljene v %d datotekah" % n if n else "ze aktualne"))
    vnosi, zasebni = recepti()
    if GIT:
        zavaruj_zasebne(zasebni)
    izhod = zapisi_kazalo(vnosi)
    print("kazalo: %d receptov%s -> %s" % (
        len(vnosi),
        (" (brez %d zasebnih)" % len(zasebni)) if GIT and zasebni else
        (" (od tega %d zasebnih)" % len(zasebni)) if zasebni else "",
        izhod))


if __name__ == "__main__":
    main()
