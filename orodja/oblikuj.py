#!/usr/bin/env python3
"""Enotno oblikovanje JSON receptov - berljivo in z majhnimi diffi v gitu.

    python orodja/oblikuj.py recepti/tiramisu.json [recepti/ciabatta.json ...]

Datoteko prepise na mestu, ce se oblika razlikuje. Pravila:
- kljuci recepta vsak v svoji vrstici;
- seznam objektov (sestavine, koraki): en objekt v vrstici;
- kratek seznam ali objekt (izbire, osnova, pecica) v eni vrstici;
- dolg seznam nizov (opombe) en niz v vrstici.
"""
import io
import json
import sys

KRATKO = 100


def _kompakt(v):
    return json.dumps(v, ensure_ascii=False, separators=(", ", ": "))


def _razpri(v):
    """Objekt, ki vsebuje seznam objektov ali tak objekt, gre v vec vrstic."""
    if not isinstance(v, dict):
        return False
    for x in v.values():
        if isinstance(x, list) and any(isinstance(y, dict) for y in x):
            return True
        if isinstance(x, dict) and _razpri(x):
            return True
    return False


def _vrednost(v, zamik):
    pad = "  " * zamik
    if isinstance(v, list):
        if all(not isinstance(x, (dict, list)) for x in v):
            k = _kompakt(v)
            if len(k) <= KRATKO:
                return k
            vrstice = [_kompakt(x) for x in v]
        else:
            vrstice = [_vrednost(x, zamik + 1) if _razpri(x) else _kompakt(x) for x in v]
        return "[\n" + ",\n".join(pad + "  " + x for x in vrstice) + "\n" + pad + "]"
    if isinstance(v, dict):
        k = _kompakt(v)
        if zamik > 0 and len(k) <= KRATKO and not _razpri(v):
            return k
        return "{\n" + ",\n".join(
            pad + "  " + json.dumps(kl, ensure_ascii=False) + ": " + _vrednost(x, zamik + 1)
            for kl, x in v.items()) + "\n" + pad + "}"
    return _kompakt(v)


def oblikuj(d):
    return _vrednost(d, 0) + "\n"


def main(poti):
    for pot in poti:
        with io.open(pot, encoding="utf-8") as f:
            staro = f.read()
        novo = oblikuj(json.loads(staro))
        assert json.loads(novo) == json.loads(staro)
        if novo != staro:
            with io.open(pot, "w", encoding="utf-8", newline="\n") as f:
                f.write(novo)
            print("oblikovan %s" % pot)


if __name__ == "__main__":
    main(sys.argv[1:])
