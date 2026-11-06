#!/usr/bin/env python3
"""Add the Bahamas toothed whales and the Beaufort Sea beluga to data/whales.json.

Bahamas: SERIES.csv and TAGS.csv of "Physiological, morphological, and
ecological tradeoffs influence vertical habitat use of deep-diving
toothed-whales in the Bahamas" (Joyce, Durban, Claridge et al., Zenodo
record 4989990, CC0). A depth every 150 s from SPLASH tags returned by Argos.

Beluga: LC2018_3_Depth_ts_Sub.csv of Storrie et al. 2022 (Zenodo record
7055225, CC0). One male beluga, a depth every 75 s, Eastern Beaufort Sea.

For each whale, the 24 h window with the most readings around a deep dive,
kept at the tag's own cadence (the page interpolates between readings).

Usage: python3 tools/toothed.py SERIES TAGS BELUGA [--data data/whales.json]
"""

import argparse
import csv
import json
from collections import defaultdict
from datetime import datetime, timedelta

WINDOW = 24 * 3600
DIVE_DEPTH = 50
KINDS = {
    "Cuvier's beaked whale": ("cuvier", "Ziphius cavirostris", 2),
    "Blainville's beaked whale": ("blainville", "Mesoplodon densirostris", 3),
    "Short-finned pilot whale": ("pilot", "Globicephala macrorhynchus", 2),
    "Melon-headed whale": ("melon", "Peponocephala electra", 1),
    "Sperm whale": ("sperm", "Physeter macrocephalus", 2),
}
MIN_SAMPLES = 300   # a day at 150 s is 576 readings; fewer than this means the tag was quiet


def parse_bahamas(day, time):
    return datetime.strptime(day.split(" ")[0] + " " + time, "%m/%d/%y %H:%M:%S")


def series_entry(wid, kind, species, site, utc, samples, step, meta):
    """samples: sorted list of (datetime, depth). Pick the busiest 24 h with a deep dive."""
    if not samples:
        return None
    t0 = samples[0][0]
    secs = [(int((t - t0).total_seconds()), d) for t, d in samples]
    best = None
    # Candidate windows start at each deep reading minus half a window.
    for s, d in secs:
        if d < 300:
            continue
        start = max(0, s - WINDOW // 2)
        inside = [x for x in secs if start <= x[0] < start + WINDOW]
        gaps = max([inside[i + 1][0] - inside[i][0] for i in range(len(inside) - 1)] or [0])
        score = len(inside) - (gaps / step) * 2
        if best is None or score > best[0]:
            best = (score, start, inside, gaps)
    if best is None or len(best[2]) < MIN_SAMPLES:
        return None
    start, inside = best[1], best[2]
    # Resample on the tag's cadence, holding the last reading over short gaps.
    n = WINDOW // step
    depth = [0.0] * n
    j = 0
    last = 0.0
    for k in range(n):
        t = start + k * step
        while j < len(inside) and inside[j][0] <= t:
            last = inside[j][1]
            j += 1
        depth[k] = round(last, 0)
    dives, cur = [], None
    for k, dep in enumerate(depth):
        if dep > DIVE_DEPTH and cur is None:
            cur = [k, dep]
        elif dep > DIVE_DEPTH:
            cur[1] = max(cur[1], dep)
        elif cur is not None:
            dives.append({"t": cur[0] * step, "dur": (k - cur[0]) * step, "max": cur[1]})
            cur = None
    total = (samples[-1][0] - samples[0][0]).total_seconds()
    deep = [d for _, d in samples if d > DIVE_DEPTH]
    entry = {
        "id": wid, "kind": kind, "species": species, "site": site, "utc_offset": utc,
        "window_start": (t0 + timedelta(seconds=start)).strftime("%Y-%m-%dT%H:%M:%S"),
        "step": step, "max": max(depth), "coarse": True,
        "record_days": round(total / 86400, 1), "record_dives": None,
        "record_max": round(max(d for _, d in samples)), "record_longest_min": None,
        "depth": depth, "dives": dives,
    }
    entry.update(meta)
    return entry


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("series")
    ap.add_argument("tags")
    ap.add_argument("beluga")
    ap.add_argument("--data", default="data/whales.json")
    args = ap.parse_args()

    tags = {}
    with open(args.tags, newline="", encoding="utf-8", errors="replace") as f:
        for r in csv.DictReader(f):
            tags[r["PTT"]] = r

    per = defaultdict(list)
    with open(args.series, newline="", encoding="utf-8", errors="replace") as f:
        for r in csv.DictReader(f):
            try:
                per[(r["Ptt"], r["Species"])].append((parse_bahamas(r["Day"], r["Time"]), float(r["Depth"])))
            except ValueError:
                continue

    out = []
    for (ptt, sp), samples in per.items():
        if sp not in KINDS:
            continue
        samples.sort()
        kind, latin, keep = KINDS[sp]
        tg = tags.get(ptt, {})
        sex = {"M": "m", "F": "f"}.get(tg.get("Sex", ""), None)
        age = {"A": "adult", "SA": "subadult"}.get(tg.get("Age", ""), None)
        mass = tg.get("MASS_MED")
        maxdur = tg.get("DURATION_MAX")
        meta = {
            "sex": sex, "stage": age,
            "mass_kg": round(float(mass)) if mass and mass != "NA" else None,
            "tagged": datetime.strptime(tg["Deploy.date"], "%m/%d/%y %H:%M").strftime("%Y-%m-%d") if tg.get("Deploy.date") else None,
            "record_longest_min": round(float(maxdur) / 60) if maxdur and maxdur != "NA" else None,
        }
        e = series_entry(ptt, kind, latin, "bahamas", -4, samples, 150, meta)
        if e:
            e["record_dives"] = sum(1 for i in range(1, len(samples)) if samples[i][1] > DIVE_DEPTH and samples[i - 1][1] <= DIVE_DEPTH)
            out.append(e)

    chosen = []
    for sp, (kind, latin, keep) in KINDS.items():
        cands = sorted([e for e in out if e["kind"] == kind], key=lambda e: -e["record_max"])
        for e in cands[:keep]:
            if kind == "sperm":
                e["id"] = e["id"] + "b"
            chosen.append(e)

    # The beluga.
    bel = []
    with open(args.beluga, newline="", encoding="utf-8", errors="replace") as f:
        for r in csv.DictReader(f):
            try:
                bel.append((datetime.strptime(r["datetime"], "%Y-%m-%d %H:%M:%S"), float(r["depth"])))
            except ValueError:
                continue
    bel.sort()
    e = series_entry("LC2018-3", "beluga", "Delphinapterus leucas", "beaufort", -6, bel, 75,
                     {"sex": "m", "stage": "adult", "tagged": "2018-08-04", "record_longest_min": None})
    if e:
        e["record_dives"] = sum(1 for i in range(1, len(bel)) if bel[i][1] > DIVE_DEPTH and bel[i - 1][1] <= DIVE_DEPTH)
        chosen.append(e)

    with open(args.data) as f:
        data = json.load(f)
    keep_kinds = ("sperm", "blue", "fin")
    data["whales"] = [w for w in data["whales"] if (w.get("kind") or "sperm") in keep_kinds and not w.get("site")] + chosen
    data["bahamas_citation"] = "Joyce TW, Durban JW, Claridge DE, Dunn CA, Fearnbach H, Parsons KM, Andrews RD, Ballance LT (2017) Data from: Physiological, morphological, and ecological tradeoffs influence vertical habitat use of deep-diving toothed-whales in the Bahamas. Zenodo. https://doi.org/10.5281/zenodo.4989990"
    data["beluga_citation"] = "Storrie L, Hussey NE, MacPhee SA, O'Corry-Crowe G, Iacozza J, Barber DG, Loseto LL (2022) Data from: Empirically testing the influence of light regime on diel activity patterns in a marine predator. Zenodo. https://doi.org/10.5281/zenodo.7055225"
    with open(args.data, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    for w in chosen:
        print(f"{w['kind']:10} {w['id']:10} {w['sex'] or '?'} {w['stage'] or '?'} window max {w['max']:.0f} m, record max {w['record_max']} m, longest {w['record_longest_min']} min, {len(w['dives'])} dives in window, {w['record_days']} d")


if __name__ == "__main__":
    main()
