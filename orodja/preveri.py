#!/usr/bin/env python3
"""Preizkus strani pred objavo - v pravem brskalniku (headless Edge).

    python orodja/preveri.py

Postreze docs/ na nakljucnih vratih in v enem zagonu Edga nalozi kazalo in
vsak recept, v slovenscini in anglescini, v 360 px sirokem okvirju
(ozek telefon). Za vsako stran preveri:

- JS napake (iz dnevnika brskalnika),
- da je stran izrisana (kazalo ima vnose, recept tabelo in hranila),
- da se stran na telefonu ne siri cez rob (vodoravni drsnik),
- v anglescini: da ni ostalo slovensko besedilo vmesnika.

Izhodna koda 1 ob kateri koli tezavi. Edge je privzet v Windows; drugo pot
nastavi v okolju EDGE.
"""
import functools
import http.server
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STRAN = os.path.join(REPO, "docs")
EDGE = os.environ.get("EDGE", r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")
SIRINA = 360   # pogost Android; iPhone ima 375-430

# Besedilo vmesnika, ki se v anglescini ne sme pojaviti. Samo besede
# vmesnika - vsebina (npr. naslov vira "Slana pletenica ...") je lahko
# slovenska.
SLOVENSKO = [
    "Sestavine", "Postopek", "Količina", "Hranilna vrednost", "Vsi recepti",
    "Prični od začetka", "Izvozi kot sliko", "Beljakovine", "približno",
    "Po sestavinah", "Na porcijo", "Segrej pečico", "Časovnik", "V košarico",
    "Ni vračunano", "Išči po", "Počisti", "Kaj imaš doma", "receptov",
    "Recept ·", "Energija", "Manjka ena", "Beri po vrsticah", "Lahko skuhaš",
    "Kaj imam doma", "S temi sestavinami", "Manjkata dve", "imaš vse", "po inženirsko",
]

OVOJ = """<!DOCTYPE html><meta charset="utf-8"><pre id="izid">cakam</pre>
<script>
var strani = %s, SIRINA = %d, SLO = %s, izid = [];
function naslednja(i) {
  if (i >= strani.length) { document.getElementById('izid').textContent = 'IZID ' + JSON.stringify(izid); return; }
  var s = strani[i], f = document.createElement('iframe');
  f.style.cssText = 'width:' + SIRINA + 'px;height:800px;border:0';
  f.onload = function () {
    setTimeout(function () {
      var d = f.contentDocument, r = { stran: s.pot, jezik: s.jezik, tezave: [] };
      try {
        if (d.documentElement.scrollWidth > SIRINA + 2) r.tezave.push('sirse od telefona: ' + d.documentElement.scrollWidth + ' px');
        if (s.vrsta === 'recept') {
          if (!d.querySelector('table.recept')) r.tezave.push('ni tabele recepta');
          if (!d.querySelector('.hranila')) r.tezave.push('ni hranilne vrednosti');
        } else if (!d.querySelector('ul.kazalo a')) r.tezave.push('kazalo je prazno');
        if ((d.documentElement.getAttribute('lang') || '') !== s.jezik) r.tezave.push('lang=' + d.documentElement.getAttribute('lang'));
        if (s.jezik === 'en') {
          var besedilo = d.body.innerText;
          SLO.forEach(function (b) { if (besedilo.indexOf(b) !== -1) r.tezave.push('slovensko: "' + b + '"'); });
        }
      } catch (e) { r.tezave.push('preizkus ni uspel: ' + e.message); }
      izid.push(r);
      f.remove();
      naslednja(i + 1);
    }, 700);
  };
  f.src = s.pot + (s.pot.indexOf('?') === -1 ? '?' : '&') + 'jezik=' + s.jezik;
  document.body.appendChild(f);
}
naslednja(0);
</script>"""


def main():
    strani = [("index.html", "kazalo")]
    for ime in sorted(os.listdir(os.path.join(STRAN, "recept"))):
        if ime.endswith(".html") and not ime.startswith("_"):
            strani.append(("recept/" + ime, "recept"))
    seznam = [{"pot": "/" + p, "vrsta": v, "jezik": j} for p, v in strani for j in ("sl", "en")]
    ovoj = OVOJ % (json.dumps(seznam), SIRINA, json.dumps(SLOVENSKO, ensure_ascii=False))

    class Streznik(http.server.SimpleHTTPRequestHandler):
        def do_GET(self):
            if self.path.startswith("/__preveri.html"):
                podatki = ovoj.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(podatki)))
                self.end_headers()
                self.wfile.write(podatki)
            else:
                super().do_GET()

        def log_message(self, *a):
            pass

    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Streznik, directory=STRAN))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = "http://127.0.0.1:%d/__preveri.html" % srv.server_address[1]

    profil = tempfile.mkdtemp(prefix="preveri-edge-")
    izhod, dnevnik = os.path.join(profil, "dom.html"), os.path.join(profil, "dnevnik.txt")
    try:
        with open(izhod, "w", encoding="utf-8") as o, open(dnevnik, "w", encoding="utf-8", errors="replace") as e:
            subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--no-first-run",
                            "--user-data-dir=" + os.path.join(profil, "p"), "--enable-logging=stderr", "--v=0",
                            "--virtual-time-budget=%d" % (2500 * len(seznam) + 10000), "--dump-dom", url],
                           stdout=o, stderr=e, timeout=600)
        dom = open(izhod, encoding="utf-8", errors="replace").read()
        log = open(dnevnik, encoding="utf-8", errors="replace").read()
    finally:
        srv.shutdown()
        shutil.rmtree(profil, ignore_errors=True)

    m = re.search(r"IZID (\[.*\])", dom)
    if not m:
        print("!! preizkus se ni izvedel do konca (brskalnik ni vrnil rezultata)")
        return 1
    izid = json.loads(m.group(1).replace("&quot;", '"').replace("&amp;", "&"))
    napake_js = sorted(set(re.findall(r"(Uncaught [^\n\"]{0,160})", log)))

    tezav = 0
    for r in izid:
        if r["tezave"]:
            tezav += 1
            print("!! %s [%s]: %s" % (r["stran"], r["jezik"], "; ".join(r["tezave"])))
    for n in napake_js:
        tezav += 1
        print("!! JS: %s" % n)
    print("preizkus: %d strani x 2 jezika, %s" % (len(strani), "vse v redu" if not tezav else "%d tezav" % tezav))
    return 1 if tezav else 0


if __name__ == "__main__":
    sys.exit(main())
