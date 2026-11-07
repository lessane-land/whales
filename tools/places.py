#!/usr/bin/env python3
"""Stamp each whale in data/whales.json with where she was tagged, for the small globe.

The sperm whales of the Gulf of California and the blue and fin whales of California carry
their own tagging position from the data. The others get the study area, with place_approx
set, because their archives give no position per animal: the Bahamas channels (AUTEC range,
Tongue of the Ocean), Hendrickson Island in the Beaufort Sea, Scoresby Sound in East
Greenland, Stellwagen Bank. Place names live in js/i18n.js under place_<key>.

Usage: python3 tools/places.py [--data data/whales.json]
"""
import argparse, json

AREAS = {
    "gulf": (28.2, -112.2, "gulf"),
    "california": (34.1, -119.8, "california"),
    "bahamas": (24.5, -77.6, "bahamas"),
    "beaufort": (69.5, -133.6, "beaufort"),
    "greenland": (70.5, -22.0, "greenland"),
    "stellwagen": (42.35, -70.3, "stellwagen"),
}

def area_of(w):
    kind = w.get("kind", "sperm")
    if kind == "humpback": return "stellwagen"
    if kind in ("blue", "fin"): return "california"
    site = w.get("site")
    if site in AREAS: return site
    if kind == "sperm": return "gulf"
    return "bahamas"

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--data", default="data/whales.json"); a = ap.parse_args()
    d = json.load(open(a.data))
    for w in d["whales"]:
        area = area_of(w)
        lat, lon, key = AREAS[area]
        w["place"] = key
        if w.get("lat") is None or w.get("lon") is None:
            w["lat"], w["lon"], w["place_approx"] = lat, lon, True
        else:
            w.pop("place_approx", None)
    json.dump(d, open(a.data, "w"), separators=(",", ":"), ensure_ascii=False)
    print({w["id"]: (w["lat"], w["lon"], w["place"], w.get("place_approx", False)) for w in d["whales"]})

if __name__ == "__main__":
    main()
