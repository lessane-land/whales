#!/usr/bin/env python3
"""Add the blue and fin whales to data/whales.json.

Input: "Blue-Fin California Dives Data.csv" and the reference-data csv of the
CC0 package "Scales of blue and fin whale feeding behavior off California"
(Irvine, Palacios, Lagerquist, Mate, Follett 2019, doi:10.5441/001/1.47h576f2).

Their tags logged each dive as start, end, maximum depth and number of
feeding lunges, not a depth line. For each whale we take a 24 h window and
draw a depth series from those numbers: down, a bottom with one dip per
lunge, up. Depth, duration and lunges are measured; the line between is not.

Usage: python3 tools/baleen.py DIVES REFERENCE [--data data/whales.json]
"""

import argparse
import csv
import json
from collections import defaultdict
from datetime import datetime

STEP = 10
WINDOW_HOURS = 24
DIVE_DEPTH = 50
KEEP = {"Balaenoptera musculus": 4, "Balaenoptera physalus": 3}
NAMES = {"Balaenoptera musculus": "blue", "Balaenoptera physalus": "fin"}


def parse(s):
    return datetime.strptime(s.strip(), "%m/%d/%Y %H:%M:%S")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dives")
    ap.add_argument("reference")
    ap.add_argument("--data", default="data/whales.json")
    args = ap.parse_args()

    ref = {}
    with open(args.reference, newline="", encoding="utf-8", errors="replace") as f:
        for row in csv.DictReader(f):
            ref[row["animal-id"]] = row

    dives = defaultdict(list)
    with open(args.dives, newline="", encoding="utf-8", errors="replace") as f:
        for row in csv.DictReader(f):
            try:
                dives[row["animal-id"]].append((parse(row["DiveDateStart"]), parse(row["DiveDateEnd"]), float(row["MaxDiveDepth"]), int(float(row["NumLunges"] or 0))))
            except ValueError:
                continue

    whales = []
    for aid, ds in dives.items():
        ds.sort()
        # A dive longer than 45 minutes is a gap in the tag record, not a dive.
        ds = [d for d in ds if (d[1] - d[0]).total_seconds() <= 45 * 60]
        if not ds:
            continue
        r = ref.get(aid, {})
        species = r.get("animal-taxon") or ("Balaenoptera musculus" if "Bmu" in aid else "Balaenoptera physalus")
        t0, t1 = ds[0][0], ds[-1][1]
        total = (t1 - t0).total_seconds()
        # Whole record stats.
        deep = [d for d in ds if d[2] > DIVE_DEPTH]
        rec_max = max(d[2] for d in ds)
        rec_longest = max((d[1] - d[0]).total_seconds() for d in ds)
        rec_lunges = sum(d[3] for d in ds)
        # Window around the deepest dive.
        deepest = max(ds, key=lambda d: d[2])
        win = WINDOW_HOURS * 3600
        start = max(0, min((deepest[0] - t0).total_seconds() - win / 2, max(0, total - win)))
        n = int(win // STEP)
        depth = [0.0] * n
        wdives = []
        for s, e, mx, lunges in ds:
            a = (s - t0).total_seconds() - start
            b = (e - t0).total_seconds() - start
            if b < 0 or a > win:
                continue
            dur = max(STEP, b - a)
            if mx <= 5:
                continue
            down, bottom = 0.3 * dur, 0.45 * dur
            k0, k1 = int(max(0, a) // STEP), int(min(win, b) // STEP)
            for k in range(k0, min(n, k1 + 1)):
                tt = k * STEP - a
                if tt < down:
                    d = mx * (tt / down)
                elif tt < down + bottom:
                    # One dip per lunge, spread along the bottom.
                    d = mx
                    if lunges:
                        ph = (tt - down) / bottom * lunges
                        d = mx * (0.86 + 0.14 * abs(((ph % 1) * 2) - 1))
                else:
                    d = mx * max(0.0, 1 - (tt - down - bottom) / max(1.0, dur - down - bottom))
                depth[k] = max(depth[k], round(d, 0))
            if mx > DIVE_DEPTH:
                wdives.append({"t": int(max(0, a)), "dur": int(dur), "max": mx, "lunges": lunges})
        whales.append({
            "id": aid.split("-")[-1],
            "tag": aid,
            "species": species,
            "kind": NAMES[species],
            "tagged": (r.get("deploy-on-date") or "")[:10] or None,
            "stage": r.get("animal-life-stage") or None,
            "sex": r.get("animal-sex") or None,
            "lat": round(float(r["deploy-on-latitude"]), 2) if r.get("deploy-on-latitude") else None,
            "lon": round(float(r["deploy-on-longitude"]), 2) if r.get("deploy-on-longitude") else None,
            "window_start": (t0 + (t1 - t0) * 0).strftime("%Y-%m-%dT%H:%M:%S") if False else datetime.fromtimestamp(t0.timestamp() + start).strftime("%Y-%m-%dT%H:%M:%S"),
            "utc_offset": -7,
            "step": STEP,
            "max": max(depth),
            "record_days": round(total / 86400, 1),
            "record_dives": len(deep),
            "record_max": round(rec_max),
            "record_longest_min": round(rec_longest / 60),
            "record_lunges": rec_lunges,
            "drawn": True,
            "depth": depth,
            "dives": wdives,
        })

    # One record per animal (05650 was tagged in 2014 and again in 2015: keep the
    # longer one and remember both), then the deepest few of each species.
    byid = {}
    for w in whales:
        if w["id"] in byid:
            a, b = byid[w["id"]], w
            keep, other = (a, b) if a["record_days"] >= b["record_days"] else (b, a)
            keep["also_tagged"] = other["tagged"]
            byid[w["id"]] = keep
        else:
            byid[w["id"]] = w
    whales = list(byid.values())
    chosen = []
    for sp, k in KEEP.items():
        chosen += sorted([w for w in whales if w["species"] == sp], key=lambda w: -w["record_max"])[:k]

    with open(args.data) as f:
        data = json.load(f)
    data["whales"] = [w for w in data["whales"] if w.get("species") == "Physeter macrocephalus"] + chosen
    data["baleen_citation"] = "Irvine LM, Palacios DM, Lagerquist BA, Mate BR, Follett TM (2019) Data from: Scales of blue and fin whale feeding behavior off California, USA, with implications for prey patchiness. Movebank Data Repository. https://doi.org/10.5441/001/1.47h576f2"
    data["baleen_paper"] = "Irvine LM, Palacios DM, Lagerquist BA, Mate BR (2019) Frontiers in Ecology and Evolution 7: 338. https://doi.org/10.3389/fevo.2019.00338"
    with open(args.data, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    for w in chosen:
        print(f"{w['kind']} {w['id']} {w['sex']}: {w['record_days']} d, {w['record_dives']} dives, max {w['record_max']} m, longest {w['record_longest_min']} min, {w['record_lunges']} lunges, window max {w['max']:.0f}")


if __name__ == "__main__":
    main()
