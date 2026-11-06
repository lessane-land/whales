#!/usr/bin/env python3
"""Add the named humpbacks of Stellwagen Bank to data/whales.json.

Input: MnNoise_Data.xlsx from "Data from: Evidence for ship noise impacts on
humpback whale foraging behaviour" (Blair, Merchant, Friedlaender, Wiley,
Parks 2016; Zenodo record 4966491, CC0). One row per feeding dive of ten
tagged humpbacks: dive time (s), descent and ascent rates (m/s), maximum
depth (m), number of side-rolls, surface time before the dive (s).

Each whale's dives are chained in order with the measured surface time
between them, and each dive is drawn with its measured descent rate, bottom
time (the remainder) and ascent rate. Depths, times and rates are measured;
the bottom is drawn flat with one dip per side-roll.

Usage: python3 tools/humpback.py MnNoise_Data.xlsx [--data data/whales.json]
"""

import argparse
import json
import re
import zipfile
from collections import defaultdict

STEP = 10
DIVE_DEPTH = 10   # a Stellwagen feeding dive is shallow: the bank is 30 to 40 m deep
MONTHS = {"Apr": "04", "May": "05", "Jun": "06", "Jul": "07", "Aug": "08", "Sep": "09"}


def read_xlsx(path):
    z = zipfile.ZipFile(path)
    shared = z.read("xl/sharedStrings.xml").decode("utf-8", "replace")
    strs = re.findall(r"<t[^>]*>([^<]*)</t>", shared)
    sheet = z.read("xl/worksheets/sheet1.xml").decode("utf-8", "replace")
    rows = []
    for r in re.findall(r"<row[^>]*>(.*?)</row>", sheet):
        vals = {}
        for m in re.finditer(r'<c r="([A-Z]+)\d+"([^>]*)>(?:<v>([^<]*)</v>)?', r):
            col, attrs, v = m.groups()
            if 't="s"' in attrs and v is not None:
                v = strs[int(v)]
            vals[col] = v
        rows.append(vals)
    header = rows[0]
    out = []
    for r in rows[1:]:
        out.append({header[c]: r.get(c) for c in header})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("xlsx")
    ap.add_argument("--data", default="data/whales.json")
    args = ap.parse_args()

    per = defaultdict(list)
    meta = {}
    for r in read_xlsx(args.xlsx):
        try:
            per[r["Indiv"]].append((float(r["SurfaceTime"]), float(r["DiveTime"]), float(r["DescentRate"]), float(r["AscentRate"]), float(r["MaxDepth"]), int(float(r["NumberRolls"] or 0))))
            meta[r["Indiv"]] = (r["Subject"], r["Year"], r["Month"])
        except (TypeError, ValueError):
            continue

    whales = []
    for name, dives in per.items():
        depth, dl, t = [], [], 0.0
        for surf, dur, down, upr, mx, rolls in dives:
            # Surface time first, then the dive.
            while t < t + surf and len(depth) * STEP < t + surf:
                depth.append(0.0)
            t += surf
            t_down = mx / max(0.1, down)
            t_up = mx / max(0.1, upr)
            t_bottom = max(0.0, dur - t_down - t_up)
            start_k = len(depth)
            k = 0
            while k * STEP < dur:
                tt = k * STEP
                if tt < t_down:
                    d = mx * tt / t_down
                elif tt < t_down + t_bottom:
                    d = mx
                    if rolls:
                        ph = (tt - t_down) / max(1.0, t_bottom) * rolls
                        d = mx * (0.9 + 0.1 * abs(((ph % 1) * 2) - 1))
                else:
                    d = mx * max(0.0, 1 - (tt - t_down - t_bottom) / max(1.0, t_up))
                depth.append(round(d, 1))
                k += 1
            t += dur
            dl.append({"t": start_k * STEP, "dur": int(dur), "max": mx, "lunges": rolls})
        subject, year, month = meta[name]
        whales.append({
            "id": name, "kind": "humpback", "species": "Megaptera novaeangliae", "site": "stellwagen", "utc_offset": -4,
            "tagged": f"{year}-{MONTHS.get(month, '07')}-01", "tag": subject, "sex": None, "stage": None,
            "window_start": None, "step": STEP, "max": max(depth), "drawn": True,
            "record_days": round(len(depth) * STEP / 86400, 2), "record_hours": round(len(depth) * STEP / 3600, 1),
            "record_dives": len(dives), "record_max": round(max(d[4] for d in dives)),
            "record_longest_min": round(max(d[1] for d in dives) / 60), "record_lunges": sum(d[5] for d in dives),
            "depth": depth, "dives": dl,
        })

    whales.sort(key=lambda w: -w["record_dives"])
    with open(args.data) as f:
        data = json.load(f)
    data["whales"] = [w for w in data["whales"] if w.get("kind") != "humpback"] + whales
    data["humpback_citation"] = "Blair HB, Merchant ND, Friedlaender AS, Wiley DN, Parks SE (2016) Data from: Evidence for ship noise impacts on humpback whale foraging behaviour. Zenodo. https://doi.org/10.5281/zenodo.4966491"
    with open(args.data, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    for w in whales:
        print(f"{w['id']:10} {w['tag']} {w['record_hours']} h, {w['record_dives']} dives, max {w['record_max']} m, longest {w['record_longest_min']} min, {w['record_lunges']} rolls")


if __name__ == "__main__":
    main()
