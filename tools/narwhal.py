#!/usr/bin/env python3
"""Add narwhal 3965 to data/whales.json.

Input: "#3965_2013.csv" from "Data from: Temperature dependent habitat
selection by narwhals" (Zenodo record 4918360, CC0): a Wildlife Computers
Mk10 time-depth record, one reading per second, East Greenland, autumn 2013.
Rows are Excel serial day numbers and depth in metres.

The 24 h window around her deepest dive, the deepest reading every 10 s.

Usage: python3 tools/narwhal.py FILE [--data data/whales.json]
"""

import argparse
import json
from datetime import datetime, timedelta

STEP = 10
WINDOW = 24 * 3600
DIVE_DEPTH = 50
EXCEL_EPOCH = datetime(1899, 12, 30)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--data", default="data/whales.json")
    args = ap.parse_args()

    pts = []
    with open(args.file, encoding="utf-8", errors="replace") as f:
        for line in f:
            if line.startswith(";"):
                continue
            a, _, b = line.partition(",")
            try:
                pts.append((float(a), abs(float(b))))
            except ValueError:
                continue
    pts.sort()
    t0 = pts[0][0]
    secs = [(int(round((d - t0) * 86400)), dep) for d, dep in pts]
    total = secs[-1][0]
    deepest = max(secs, key=lambda p: p[1])
    start = max(0, min(deepest[0] - WINDOW // 2, total - WINDOW))
    bins = {}
    for s, dep in secs:
        if s < start or s >= start + WINDOW:
            continue
        k = (s - start) // STEP
        if k not in bins or dep > bins[k]:
            bins[k] = dep
    n = WINDOW // STEP
    depth = [round(bins.get(k, bins.get(k - 1, 0.0)), 0) for k in range(n)]
    dives, cur = [], None
    for k, dep in enumerate(depth):
        if dep > DIVE_DEPTH and cur is None:
            cur = [k, dep]
        elif dep > DIVE_DEPTH:
            cur[1] = max(cur[1], dep)
        elif cur is not None:
            dives.append({"t": cur[0] * STEP, "dur": (k - cur[0]) * STEP, "max": cur[1]})
            cur = None
    # Whole record stats.
    rec_dives, c, longest = 0, None, 0
    for s, dep in secs:
        if dep > DIVE_DEPTH and c is None:
            c = s
        elif dep <= DIVE_DEPTH and c is not None:
            rec_dives += 1
            longest = max(longest, s - c)
            c = None
    first = EXCEL_EPOCH + timedelta(days=t0)
    entry = {
        "id": "3965", "kind": "narwhal", "species": "Monodon monoceros", "site": "greenland", "utc_offset": -1,
        "tagged": first.strftime("%Y-%m-%d"), "sex": None, "stage": None,
        "window_start": (first + timedelta(seconds=start)).strftime("%Y-%m-%dT%H:%M:%S"),
        "step": STEP, "max": max(depth),
        "record_days": round(total / 86400, 1), "record_dives": rec_dives,
        "record_max": round(deepest[1]), "record_longest_min": round(longest / 60),
        "depth": depth, "dives": dives,
    }
    with open(args.data) as f:
        data = json.load(f)
    data["whales"] = [w for w in data["whales"] if w.get("kind") != "narwhal"] + [entry]
    data["narwhal_citation"] = "Chambault P, Tervo OM, Garde E, Hansen RG, Blackwell SB, Williams TM, Dietz R, Albertsen CM, Laidre KL, Nielsen NH, Richard P, Sinding MHS, Schmidt HC, Heide-Jorgensen MP (2020) Data from: Temperature dependent habitat selection by narwhals. Zenodo. https://doi.org/10.5281/zenodo.4918360"
    with open(args.data, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print(f"narwhal 3965: {entry['record_days']} d, {rec_dives} dives, max {entry['record_max']} m, longest {entry['record_longest_min']} min, window from {entry['window_start']}, window max {entry['max']:.0f}")


if __name__ == "__main__":
    main()
