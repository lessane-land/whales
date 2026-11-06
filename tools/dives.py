#!/usr/bin/env python3
"""Thin the CC0 sperm whale time-depth recordings into data/whales.json.

Input: the accessory csv (or csv.zip) of "Sperm whales Gulf of California
2007-2008" and its reference-data csv, from the Movebank Data Repository
(Irvine, Mate, Palacios, Follett 2019, doi:10.5441/001/1.rj857167).

Output: for each whale, a continuous window of WINDOW_HOURS with one depth
every STEP seconds (the deepest reading inside each step, so no dive is
flattened away), plus the dives in that window (start, duration, depth).

Usage: python3 tools/dives.py ACCESSORY REFERENCE [--out data/whales.json]
"""

import argparse
import csv
import io
import json
import zipfile
from collections import defaultdict
from datetime import datetime

STEP = 10               # seconds per point
WINDOW_HOURS = 24
DIVE_DEPTH = 50         # metres: deeper than this counts as a dive


def open_rows(path):
    if path.endswith(".zip"):
        with zipfile.ZipFile(path) as z:
            for info in z.infolist():
                if info.filename.endswith(".csv") and not info.filename.startswith("__MACOSX"):
                    with z.open(info) as raw:
                        yield from csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8", errors="replace", newline=""))
    else:
        with open(path, newline="", encoding="utf-8", errors="replace") as f:
            yield from csv.DictReader(f)


def parse_ts(s):
    return datetime.strptime(s[:19], "%Y-%m-%d %H:%M:%S")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("accessory")
    ap.add_argument("reference")
    ap.add_argument("--out", default="data/whales.json")
    args = ap.parse_args()

    # Per whale: list of (seconds since first sample, depth)
    series = defaultdict(list)
    first = {}
    for row in open_rows(args.accessory):
        d = row.get("bar:barometric-depth")
        if not d:
            continue
        wid = row["individual-local-identifier"]
        t = parse_ts(row["timestamp"])
        if wid not in first:
            first[wid] = t
        series[wid].append((int((t - first[wid]).total_seconds()), max(0.0, -float(d))))

    ref = {}
    for row in open_rows(args.reference):
        ref[row["animal-id"]] = row

    whales = []
    for wid, pts in series.items():
        pts.sort()
        total = pts[-1][0]
        win = WINDOW_HOURS * 3600
        # Choose the window with the deepest dive, so every whale shows her best.
        deepest = max(pts, key=lambda p: p[1])
        start = max(0, min(deepest[0] - win // 2, total - win))
        end = start + win
        # Downsample: deepest reading per step.
        bins = {}
        for s, dep in pts:
            if s < start or s >= end:
                continue
            k = (s - start) // STEP
            if k not in bins or dep > bins[k]:
                bins[k] = dep
        n = win // STEP
        depth = [round(bins.get(k, bins.get(k - 1, 0.0)), 0) for k in range(n)]
        # Dives inside the window.
        dives, cur = [], None
        for k, dep in enumerate(depth):
            if dep > DIVE_DEPTH and cur is None:
                cur = [k, dep]
            elif dep > DIVE_DEPTH and cur is not None:
                cur[1] = max(cur[1], dep)
            elif dep <= DIVE_DEPTH and cur is not None:
                dives.append({"t": cur[0] * STEP, "dur": (k - cur[0]) * STEP, "max": cur[1]})
                cur = None
        r = ref.get(wid, {})
        whales.append({
            "id": wid,
            "species": "Physeter macrocephalus",
            "tagged": (r.get("deploy-on-date") or "")[:10] or None,
            "stage": r.get("animal-life-stage") or None,
            "sex": r.get("animal-sex") or None,
            "lat": round(float(r["deploy-on-latitude"]), 2) if r.get("deploy-on-latitude") else None,
            "lon": round(float(r["deploy-on-longitude"]), 2) if r.get("deploy-on-longitude") else None,
            "window_start": (first[wid]).strftime("%Y-%m-%d") if wid in first else None,
            "window_offset": start,
            "step": STEP,
            "max": max(depth),
            "record_hours": round(total / 3600, 1),
            "depth": depth,
            "dives": dives,
        })

    whales.sort(key=lambda w: -w["max"])
    out = {
        "study": "Sperm whales Gulf of California 2007-2008",
        "citation": "Irvine LM, Mate BR, Palacios DM, Follett TM (2019) Data from: Sperm whale dive behavior characteristics derived from intermediate-duration archival tag data. Movebank Data Repository. https://doi.org/10.5441/001/1.rj857167",
        "paper": "Irvine L, Palacios DM, Urban J, Mate B (2017) Sperm whale dive behavior characteristics derived from intermediate-duration archival tag data. Ecology and Evolution. https://doi.org/10.1002/ece3.3322",
        "license": "CC0 1.0",
        "whales": whales,
    }
    with open(args.out, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    for w in whales:
        print(f"{w['id']}: max {w['max']:.0f} m, {len(w['dives'])} dives in the window, record {w['record_hours']} h")


if __name__ == "__main__":
    main()
