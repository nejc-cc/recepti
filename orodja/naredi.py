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
4. docs/fotke/<ime>/ - fotografije za splet iz fotke/ (glej FOTOGRAFIJE).

ZAKAJ ZETONI - Home Assistant streze /local/ z "Cache-Control: max-age=
2678400" (31 dni). Brez zetona brskalnik mesec dni ne vprasa vec za CSS in
JS. Zeton naredi iz URL-ja drug URL, samo kadar se datoteka res spremeni.

Sproti preveri se:
- ali stran zna vracunati hranilno vrednost vseh sestavin (hranila ...),
- ali ima recept popoln angleski prevod (prevod ...),
- zasebni recepti ("javno": false) gredo v .gitignore - vir in stran.

Osnutki: recepti/_osnutek-<ime>.json -> docs/recept/_osnutek-<ime>.html,
brez vnosa v kazalu (za predogled na HA), git jih ignorira.

FOTOGRAFIJE - izvirniki so v fotke/ (samo na tem PC-ju, git jih ignorira):
    fotke/<ime>.jpg      naslovna (vrh recepta, kazalo, predogled povezave)
    fotke/<ime>-<n>.jpg  dodatne, po vrsti stevilk (luknje so dovoljene)
jpg, png ali webp. V docs/fotke/<ime>/ gredo pomanjsane WebP (in JPEG za
predogled povezave), obrnjene po EXIF in v sRGB. Vsi metapodatki ostanejo
zunaj - telefon v fotko zapise GPS, torej domaci naslov. Opisi in korak, h
kateremu fotka sodi, so v receptu (polje "fotke", orodja/POLJA.md).
Izdelava je pocasna, zato si fotke/.naredi.json zapomni, kaj je ze narejeno.
"""
import hashlib
import html
import io
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.parse

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIR = os.path.join(REPO, "recepti")
STRAN = os.path.join(REPO, "docs")
STRANI = os.path.join(STRAN, "recept")
ASSETS = os.path.join(STRAN, "_assets")
PREDLOGA = os.path.join(REPO, "orodja", "stran-recepta.html")
FOTKE_VIR = os.path.join(REPO, "fotke")
FOTKE = os.path.join(STRAN, "fotke")
PREDPOMNILNIK = os.path.join(FOTKE_VIR, ".naredi.json")
FOTKE_KONCNICE = (".jpg", ".jpeg", ".png", ".webp")
# Mere v px. Ko se spremenijo, povecaj verzijo - fotke se izdelajo znova.
FOTKE_VERZIJA = 2
VELIKA = 1600            # ogled cez cel zaslon, naslovna na namizju in v izvozu
MALA = 640               # galerija, naslovna na telefonu
KAZALO = 240             # kvadrat v kazalu
OG = (1200, 630)         # predogled povezave (Viber, WhatsApp) - JPEG, ker WebP ne poznajo vsi

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


# --- fotografije -----------------------------------------------------------
def najdi_fotke(imena):
    """Izvirnike v fotke/ razporedi po receptih (imena so brez "_osnutek-").
    Vrne {ime: {"naslovna": pot, "dodatne": {n: pot}}}. Generator pozna vsa
    imena receptov, zato brownie-v-2-minutah-1.jpg ni dvoumen."""
    ven = {}
    if not os.path.isdir(FOTKE_VIR):
        return ven
    for datoteka in sorted(os.listdir(FOTKE_VIR), key=str.lower):
        pot = os.path.join(FOTKE_VIR, datoteka)
        if datoteka.startswith(".") or not os.path.isfile(pot):
            continue
        deblo, koncnica = os.path.splitext(datoteka.lower())
        if koncnica in (".heic", ".heif"):
            print("   fotke: %s je HEIC - shrani jo kot JPG" % datoteka)
            continue
        if koncnica not in FOTKE_KONCNICE:
            print("   fotke: %s ni jpg, png ali webp - izpuscam" % datoteka)
            continue
        m = re.match(r"^(.+)-(\d+)$", deblo)
        if deblo in imena:
            ime, n = deblo, None
        elif m and m.group(1) in imena:
            ime, n = m.group(1), int(m.group(2))
        else:
            print("   fotke: %s ne ustreza nobenemu receptu" % datoteka)
            continue
        f = ven.setdefault(ime, {"naslovna": None, "dodatne": {}})
        prej = f["naslovna"] if n is None else f["dodatne"].get(n)
        if prej:
            print("   fotke: %s in %s sta ista fotka - uporabim %s"
                  % (os.path.basename(prej), datoteka, os.path.basename(prej)))
        elif n is None:
            f["naslovna"] = pot
        else:
            f["dodatne"][n] = pot
    return ven


def odpri_fotko(pot):
    """Fotka, kot jo kaze telefon: obrnjena po EXIF, v sRGB, BREZ metapodatkov."""
    from PIL import Image, ImageCms, ImageOps
    im = ImageOps.exif_transpose(Image.open(pot))
    icc = im.info.get("icc_profile")
    if im.mode not in ("RGB", "RGBA", "CMYK"):
        im = im.convert("RGBA" if ("A" in im.mode or "transparency" in im.info) else "RGB")
    if icc:
        try:
            im = ImageCms.profileToProfile(im, ImageCms.ImageCmsProfile(io.BytesIO(icc)),
                                           ImageCms.createProfile("sRGB"),
                                           outputMode="RGBA" if im.mode == "RGBA" else "RGB")
        except (ImageCms.PyCMSError, OSError, ValueError):
            pass   # pokvarjen profil: barve, kot so
    if im.mode == "CMYK":
        im = im.convert("RGB")
    # nova slika iz golih pik - EXIF (GPS), XMP, ICC in komentarji ostanejo zadaj
    return Image.frombytes(im.mode, im.size, im.tobytes())


def je_prosojna(im):
    """Izrezana fotka (odstranjeno ozadje): vsaj 2 % pik je prosojnih."""
    if im.mode != "RGBA":
        return False
    h = im.getchannel("A").histogram()
    return sum(h[:250]) > 0.02 * im.size[0] * im.size[1]


def brez_metapodatkov(pot):
    with open(pot, "rb") as f:
        b = f.read()
    if b[:4] == b"RIFF":
        i, kosi = 12, set()
        while i + 8 <= len(b):
            kosi.add(b[i:i + 4])
            n = int.from_bytes(b[i + 4:i + 8], "little")
            i += 8 + n + (n & 1)
        if kosi & {b"EXIF", b"XMP ", b"ICCP"}:
            return False
    return b"Exif\x00\x00" not in b and b"ns.adobe.com/xap" not in b


def shrani_fotko(im, pot):
    from PIL import Image
    if pot.endswith(".jpg"):
        if im.mode == "RGBA":
            ozadje = Image.new("RGB", im.size, (255, 255, 255))
            ozadje.paste(im, mask=im.split()[3])
            im = ozadje
        im.save(pot, "JPEG", quality=82, optimize=True, progressive=True)
    else:
        im.save(pot, "WEBP", quality=80, method=6)
    if not brez_metapodatkov(pot):
        os.remove(pot)
        sys.exit("!! %s: v izdelani fotki so ostali metapodatki - ne objavljam" % pot)


def opis_fotke(v):
    """Opis fotke v receptu je niz ali {"opis": ..., "korak": 2, "izrez": "50% 30%"}."""
    if isinstance(v, str):
        return {"opis": v}
    return v if isinstance(v, dict) else {}


def izrez_fotke(v, kje):
    """"izrez": "50% 30%" - tocka, ki ostane vidna, ko se fotka obreze
    (naslovna je siroka, kvadrat v kazalu ozek). Privzeto sredina."""
    if v is None:
        return None
    m = re.match(r"^\s*(\d{1,3}(?:\.\d+)?)%\s+(\d{1,3}(?:\.\d+)?)%\s*$", str(v))
    if not m or float(m.group(1)) > 100 or float(m.group(2)) > 100:
        print('   fotke %s: izrez "%s" ni v obliki "50%% 30%%" - uporabim sredino' % (kje, v))
        return None
    return float(m.group(1)), float(m.group(2))


def izdelaj_fotke(ime, d, najdene, pomni, nov):
    """Fotke recepta v docs/fotke/<ime>/. pomni = kar je ze narejeno (iz
    fotke/.naredi.json), v nov gre, kar velja po tem zagonu. Vrne (podatki, datoteke):
    podatki = {"stran": ..., "kazalo": pot, "og": pot} ali None,
    datoteke = imena izdelanih datotek (ostalo v mapi se pobrise)."""
    najdene = najdene or {"naslovna": None, "dodatne": {}}
    vse = ([("naslovna", najdene["naslovna"])] if najdene["naslovna"] else []) + \
          [(str(n), najdene["dodatne"][n]) for n in sorted(najdene["dodatne"])]
    opisi = d.get("fotke") or {}
    opisi_en = (d.get("en") or {}).get("fotke") or {}
    for k in opisi:
        if k not in dict(vse):
            print('   fotke %s: opis za fotko "%s", fotke pa ni (fotke/%s%s.jpg)'
                  % (ime, k, ime.replace("_osnutek-", ""), "" if k == "naslovna" else "-" + k))
    if not vse:
        return None, set()
    try:
        from PIL import Image, ImageOps
    except ImportError:
        print("!! fotke %s: za fotke rabis Pillow (pip install pillow) - izpuscam" % ime,
              file=sys.stderr)
        return None, set()

    mapa = os.path.join(FOTKE, ime)
    os.makedirs(mapa, exist_ok=True)
    korakov = len(d.get("koraki") or [])
    datoteke, stran, ven = set(), {"galerija": []}, {}
    for kljuc, vir in vse:
        oznaka = "%s/%s" % (ime, kljuc)
        o, o_en = opis_fotke(opisi.get(kljuc)), opis_fotke(opisi_en.get(kljuc))
        izrez = izrez_fotke(o.get("izrez"), oznaka)
        imena = {"velika": kljuc + ".webp", "mala": kljuc + "-m.webp"}
        if kljuc == "naslovna":
            imena.update(kazalo=kljuc + "-k.webp", og=kljuc + "-og.jpg")
        poti = {k: os.path.join(mapa, v) for k, v in imena.items()}
        with open(vir, "rb") as f:
            zapis = {"vir": hashlib.sha1(f.read()).hexdigest(), "verzija": FOTKE_VERZIJA,
                     "izrez": izrez, "datoteke": sorted(imena.values())}
        star = pomni.get(oznaka) or {}
        prosojna = star.get("prosojna", False)
        if {k: star.get(k) for k in zapis} != zapis or not all(os.path.exists(p) for p in poti.values()):
            im = odpri_fotko(vir)
            prosojna = je_prosojna(im)
            sredina = (0.5, 0.5) if not izrez else (izrez[0] / 100, izrez[1] / 100)
            for k, p in poti.items():
                mere = (KAZALO, KAZALO) if k == "kazalo" else OG
                if k in ("velika", "mala"):
                    m = im.copy()
                    m.thumbnail((VELIKA, VELIKA) if k == "velika" else (MALA, MALA), Image.LANCZOS)
                elif prosojna:
                    # izrezana fotka (prosojno ozadje): cela, na sredini, nic odrezano
                    m = Image.new("RGBA", mere, (0, 0, 0, 0))
                    v = ImageOps.contain(im.convert("RGBA"), mere, Image.LANCZOS)
                    m.paste(v, ((mere[0] - v.width) // 2, (mere[1] - v.height) // 2), v)
                else:
                    m = ImageOps.fit(im, mere, Image.LANCZOS, centering=sredina)
                shrani_fotko(m, p)
            print("   fotka %s <- fotke/%s%s" % (oznaka, os.path.basename(vir), " (prosojna)" if prosojna else ""))
        nov[oznaka] = dict(zapis, prosojna=prosojna)
        datoteke.update(imena.values())

        def naslov(k):
            return "%s/%s?v=%s" % (ime, imena[k], zeton(poti[k]))
        w, h = Image.open(poti["velika"]).size
        mw, mh = Image.open(poti["mala"]).size
        f = {"velika": "../fotke/" + naslov("velika"), "mala": "../fotke/" + naslov("mala"),
             "w": w, "h": h, "mw": mw, "mh": mh}
        if o.get("opis"):
            f["opis"] = o["opis"]
            if o_en.get("opis"):
                f["opis_en"] = o_en["opis"]
            else:
                print("   prevod %s: opis fotke %s ni preveden (en.fotke)" % (ime, kljuc))
        if prosojna:
            f["prosojna"] = True       # stran jo pokaze celo (contain), ne obrezane
        elif izrez:
            f["izrez"] = "%g%% %g%%" % izrez
        if o.get("korak") is not None:
            if isinstance(o["korak"], int) and 1 <= o["korak"] <= korakov:
                f["korak"] = o["korak"]
            else:
                print("   fotke %s: korak %s ne obstaja (koraki so 1-%d)" % (oznaka, o["korak"], korakov))
        if kljuc == "naslovna":
            stran["naslovna"] = f
            ven["kazalo"] = "fotke/" + naslov("kazalo")
            ven["og"] = "fotke/" + naslov("og")
        else:
            stran["galerija"].append(f)
    ven["stran"] = stran
    return ven, datoteke


def pocisti_fotke(narejene):
    """narejene = {mapa: {datoteke}}; vse drugo v docs/fotke je ostanek
    izbrisanega izvirnika ali recepta."""
    if not os.path.isdir(FOTKE):
        return
    for mapa in sorted(os.listdir(FOTKE)):
        pot = os.path.join(FOTKE, mapa)
        if mapa not in narejene:
            if os.path.isdir(pot):
                shutil.rmtree(pot)
            else:
                os.remove(pot)
            print("   odstranjene fotke/%s (izvirnika ni vec)" % mapa)
            continue
        for datoteka in sorted(os.listdir(pot)):
            if datoteka not in narejene[mapa]:
                os.remove(os.path.join(pot, datoteka))
                print("   odstranjena fotke/%s/%s" % (mapa, datoteka))
    if not os.listdir(FOTKE):
        os.rmdir(FOTKE)


def tezave_pecice(d):
    """Peka po stopnjah: stran neveljavne stopnje tiho izpusti - zato tu glasno."""
    p = d.get("pecica") or {}
    ven = []
    for s in p.get("stopnje") or []:
        po, t = s.get("po"), s.get("temperatura")
        if not isinstance(po, (int, float)) or not 0 < po < (p.get("minute") or 0):
            ven.append('stopnja "po": %s mora biti vec kot 0 in manj kot "minute" (%s)' % (po, p.get("minute")))
        if not isinstance(t, (int, float)) or not 50 <= t <= 250:
            ven.append('stopnja "temperatura": %s mora biti 50-250' % t)
    return ven


# --- strani ----------------------------------------------------------------
def navaden(t):
    return html.escape(CIST.sub("", html.unescape(t or "")).strip(), quote=True)


def ikona_uri(emoji):
    svg = ("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>"
           "<text y='.9em' font-size='90'>%s</text></svg>" % (emoji or "🍽"))
    return "data:image/svg+xml," + urllib.parse.quote(svg, safe=" ='/:.")


def izdelaj_stran(predloga, d, ime, javni_url, fotke=None, baza_url=None):
    opis = navaden(d.get("povzetek") or d.get("opis"))
    dodatno = ""
    if javni_url:
        dodatno += '<meta property="og:url" content="%s">\n' % html.escape(javni_url, quote=True)
        if fotke and fotke.get("og"):
            # predogled povezave rabi poln naslov - zato samo na javni strani
            dodatno += ('<meta property="og:image" content="%s">\n'
                        '<meta property="og:image:width" content="%d">\n'
                        '<meta property="og:image:height" content="%d">\n'
                        '<meta property="og:image:alt" content="%s">\n'
                        '<meta name="twitter:card" content="summary_large_image">\n'
                        % (html.escape(baza_url + "/" + fotke["og"], quote=True), OG[0], OG[1],
                           navaden(d.get("naslov", ime))))
    if d.get("en"):
        dodatno += '<meta property="og:locale:alternate" content="en_GB">\n'
    # Fotke gredo stranem v JSON kot _fotke (izdela jih generator, ne pise se rocno).
    # "</" v JSON bi zaprl <script>; "<\/" je v JSON isti znak
    if fotke:
        d = dict(d, _fotke=fotke["stran"])
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
    """Zasebne recepte (vir, stran in fotke) vpise v .gitignore in glasno
    opozori, ce je kateri ze v gitu - .gitignore sledenih datotek ne izloci."""
    poti = []
    for z in sorted(zasebni):
        poti += ["/recepti/%s.json" % z, "/docs/recept/%s.html" % z, "/docs/fotke/%s/" % z]
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


def osnove(vnosi, H):
    """Sestavine iz shrambe, ki jih ima vsak (v hranila.js "zanemarljivo":
    sol, zacimbe, pecilni prasek) - filter "Kaj imam doma" jih steje kot doma."""
    if not H:
        return {"sl": [], "en": []}
    sl = sorted({s for v in vnosi for s in v["sestavine"]
                 if (H["sestavine"].get(s.lower()) or {}).get("zanemarljivo")}, key=str.lower)
    return {"sl": sl, "en": sorted({angl_ime(s, H) or s for s in sl}, key=str.lower)}


def zapisi_kazalo(pot, vnosi, H=None):
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
                "window.RECEPTI_PODVIRI = " + json.dumps(podviri, ensure_ascii=False, indent=2) + ";\n"
                "window.RECEPTI_OSNOVE = " + json.dumps(osnove(vnosi, H), ensure_ascii=False) + ";\n")


def main():
    os.makedirs(STRANI, exist_ok=True)
    predloga = beri(PREDLOGA)
    H = nalozi_hranila()
    KAT = kategorije_en()
    cname = os.path.join(STRAN, "CNAME")
    baza_url = ("https://" + beri(cname).strip()) if os.path.exists(cname) else None

    vsi, javni, zasebni, strani, spremenjenih = [], [], [], set(), 0
    # fotke se iscejo po imenu recepta; osnutek uporablja fotke koncnega imena
    viri = sorted(x[:-5] for x in os.listdir(VIR) if x.endswith(".json"))
    najdene = najdi_fotke({x.replace("_osnutek-", "", 1) for x in viri
                           if not x.startswith("_") or x.startswith("_osnutek-")})
    try:
        pomni = json.loads(beri(PREDPOMNILNIK))
    except (OSError, ValueError):
        pomni = {}
    pomni_nov, narejene, s_fotkami = {}, {}, 0
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
        for t in tezave_pecice(d):
            print("   pecica %s: %s" % (ime, t))
        if KAT is not None and d.get("kategorija") and d["kategorija"].lower() not in KAT:
            print('   prevod %s: kategorija "%s" ni v jezik.js' % (ime, d["kategorija"]))

        zaseben = d.get("javno") is False
        if zaseben:
            zasebni.append(ime)
        url = None if (zaseben or osnutek or not baza_url) else "%s/recept/%s.html" % (baza_url, ime)
        fotke, datoteke = izdelaj_fotke(ime, d, najdene.get(ime.replace("_osnutek-", "", 1)),
                                        pomni, pomni_nov)
        if datoteke:
            narejene[ime] = datoteke
            s_fotkami += 1
        vsebina = izdelaj_stran(predloga, d, ime, url, fotke, baza_url)
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
        if d.get("ikona"):
            vnos["ikona"] = d["ikona"]
        if fotke and fotke.get("kazalo"):
            vnos["fotka"] = fotke["kazalo"]
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
    pocisti_fotke(narejene)
    if os.path.isdir(FOTKE_VIR) and pomni_nov != pomni:
        pisi(PREDPOMNILNIK, json.dumps(pomni_nov, ensure_ascii=False, indent=1, sort_keys=True) + "\n")

    uredi = lambda v: (v["kategorija"].lower(), v["naslov"].lower())
    vsi.sort(key=uredi)
    javni.sort(key=uredi)
    zapisi_kazalo(os.path.join(STRAN, "recepti.js"), javni, H)
    zapisi_kazalo(os.path.join(STRAN, "recepti-doma.js"), vsi, H)
    index = os.path.join(STRAN, "index.html")
    if pisi(index, ozigosaj(beri(index))):
        print("   ozigosan index.html")
    zavaruj_zasebne(zasebni)

    print("strani: %d, spremenjenih %d | kazalo: javno %d, doma %d (zasebnih %d) | s fotkami %d"
          % (len(strani), spremenjenih, len(javni), len(vsi), len(zasebni), s_fotkami))


if __name__ == "__main__":
    main()
