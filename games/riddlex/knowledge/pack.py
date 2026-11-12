#!/usr/bin/env python3
"""Pack harvested JSONL and curated rows into lazy binary shards."""

from __future__ import annotations

import json
import math
import re
import struct
from datetime import date
from pathlib import Path

from curated import curated_entities

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
QUESTIONS = json.loads((HERE / "questions.json").read_text(encoding="utf-8"))
HARVEST = Path("/tmp/riddlex-harvest/entities.jsonl")
OUT = ROOT / "kb"
LATE = {
    "adult_ent", "all_rounder", "wears_yellow", "by_humayun", "by_zafar", "by_ray",
    "chases_mouse", "uses_pressure", "detective_role", "is_mouse",
}


def norm(name):
    return re.sub(r"[^a-z0-9]+", " ", (name or "").casefold()).strip()


def load_harvest():
    if not HARVEST.exists():
        print("no harvest yet; packing curated rows only")
        return []
    rows = []
    with HARVEST.open(encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def apply_curated(records):
    by_id = {row["id"]: row for row in records}
    by_name = {}
    for row in records:
        by_name.setdefault(norm(row.get("en")), []).append(row)
    aliases = {}
    for curated in curated_entities():
        target = None
        if curated["id"] in by_id:
            target = by_id[curated["id"]]
        elif str(curated["id"]).startswith("c-"):
            matches = by_name.get(norm(curated["en"])) or []
            if len(matches) == 1:
                target = matches[0]
        if target is None:
            target = dict(curated)
            records.append(target)
            by_id[target["id"]] = target
            by_name.setdefault(norm(target["en"]), []).append(target)
        else:
            image = target.get("image")
            credit = target.get("credit")
            pop = max(int(target.get("pop") or 1), int(curated.get("pop") or 1))
            target.update({
                "en": curated["en"], "bn": curated.get("bn") or target.get("bn") or "",
                "yes": curated["yes"], "no": curated["no"], "kind": curated["kind"],
                "adult": False, "pop": pop,
            })
            if image and not target.get("adult"):
                target["image"] = image
                target["credit"] = credit
        if curated.get("aliases"):
            aliases[target["id"]] = curated["aliases"]
    # Adult rows never keep a picture, even if a curator or a dump added one.
    for row in records:
        if row.get("adult"):
            row.pop("image", None)
            row.pop("credit", None)
    return records, aliases


ANIMAL_FLAGS = [
    "mammal", "bird", "fish", "reptile", "insect", "pet", "farm", "can_fly",
    "water_life", "wild", "is_cat", "is_dog", "is_mouse", "bigger_than_person",
]
OBJECT_FLAGS = [
    "electronic", "kitchen", "clothing", "vehicle", "food", "tool", "furniture",
    "handheld", "pocket", "metal", "container", "cooking", "uses_pressure",
    "music_item", "sport_item", "soft", "daily_use",
]
FICTION_FLAGS = [
    "from_novel", "from_film", "from_anime", "from_cartoon", "from_game", "from_comics",
    "from_bengali_lit", "detective_role", "wears_yellow", "superhero", "chases_mouse",
    "by_humayun", "by_zafar", "by_ray",
]
PERSON_FLAGS = [
    "alive", "dead", "male", "female", "actor", "singer", "politician", "writer",
    "cricketer", "footballer", "athlete", "scientist", "musician", "director",
    "business", "youtube", "all_rounder", "adult_ent",
] + [question["id"] for question in QUESTIONS if question["group"] in {"birth", "country"}]


def close_world(record):
    yes = set(record.get("yes") or [])
    no = set(record.get("no") or [])
    def fill(flags):
        for flag in flags:
            if flag not in yes:
                no.add(flag)
    if "real" in yes:
        fill(ANIMAL_FLAGS + OBJECT_FLAGS + FICTION_FLAGS)
        no.update(("fictional", "animal", "object"))
    elif "object" in yes:
        fill(ANIMAL_FLAGS + FICTION_FLAGS + PERSON_FLAGS)
        no.update(("real", "fictional", "animal", "named"))
    elif "animal" in yes and "fictional" not in yes:
        fill(OBJECT_FLAGS + FICTION_FLAGS + PERSON_FLAGS)
        no.update(("real", "fictional", "object", "named"))
    elif "fictional" in yes and "animal" not in yes:
        fill(ANIMAL_FLAGS + OBJECT_FLAGS)
        fill(FICTION_FLAGS)
        no.update(("real", "object"))
    elif "fictional" in yes and "animal" in yes:
        fill(OBJECT_FLAGS + PERSON_FLAGS)
        fill([flag for flag in FICTION_FLAGS if flag not in yes])
        no.discard("animal")
    record["yes"] = sorted(yes - no)
    record["no"] = sorted(no)
    return record


def attr_bytes(record, qindex, width):
    raw = bytearray(width)
    for key in record.get("yes") or []:
        qi = qindex.get(key)
        if qi is None:
            continue
        raw[qi >> 2] |= 2 << ((qi & 3) << 1)
    for key in record.get("no") or []:
        qi = qindex.get(key)
        if qi is None:
            continue
        slot = qi >> 2
        shift = (qi & 3) << 1
        raw[slot] = (raw[slot] & ~(3 << shift)) | (1 << shift)
    return raw


def write_shard(path, records, qindex, width):
    out = bytearray()
    out += b"RXKB"
    out += struct.pack("<HHI", 1, width, len(records))
    for record in records:
        sid = str(record["id"])
        number = int(sid[1:]) if sid.startswith("Q") and sid[1:].isdigit() and int(sid[1:]) <= 0xFFFFFFFF else 0
        out += struct.pack("<I", number)
        if number == 0:
            ident = sid.encode()[:200]
            out += struct.pack("<B", len(ident)) + ident
        flags = 1 if record.get("adult") else 0
        image = "" if record.get("adult") else (record.get("image") or "")
        credit = (record.get("credit") or "") if image else ""
        if image:
            flags |= 2
        out += struct.pack("<HB", min(65535, int(record.get("pop") or 1)), flags)
        en = (record.get("en") or "").encode()[:500]
        bn = (record.get("bn") or "").encode()[:500]
        out += struct.pack("<H", len(en)) + en
        out += struct.pack("<H", len(bn)) + bn
        out += attr_bytes(record, qindex, width)
        if image:
            ib = image.encode()[:300]
            cb = credit.encode()[:180]
            out += struct.pack("<H", len(ib)) + ib
            out += struct.pack("<H", len(cb)) + cb
    path.write_bytes(out)


def entropy(p):
    if p <= 0 or p >= 1:
        return 0.0
    return -(p * math.log2(p) + (1 - p) * math.log2(1 - p))


def opening_question(records, qindex, width):
    total = 0
    yes = [0] * len(QUESTIONS)
    no = [0] * len(QUESTIONS)
    for record in records:
        pop = max(1, int(record.get("pop") or 1))
        total += pop
        raw = attr_bytes(record, qindex, width)
        for qi in range(len(QUESTIONS)):
            bit = (raw[qi >> 2] >> ((qi & 3) << 1)) & 3
            if bit == 2:
                yes[qi] += pop
            elif bit == 1:
                no[qi] += pop
    best_id, best_gain = QUESTIONS[0]["id"], -1
    for qi, question in enumerate(QUESTIONS):
        if question["id"] in LATE or question["group"] == "adult":
            continue
        known = yes[qi] + no[qi]
        if known <= 0:
            continue
        gain = entropy(yes[qi] / known) * (known / total)
        if gain > best_gain:
            best_id, best_gain = question["id"], gain
    return best_id


def main():
    qindex = {question["id"]: index for index, question in enumerate(QUESTIONS)}
    width = (len(QUESTIONS) + 3) // 4
    records, aliases = apply_curated(load_harvest())
    # Drop duplicate ids, keeping the last (curated) copy.
    dedup = {}
    for record in records:
        dedup[str(record["id"])] = record
    records = [close_world(row) for row in dedup.values()]
    OUT.mkdir(parents=True, exist_ok=True)
    for stale in OUT.glob("*.bin"):
        stale.unlink()
    groups = {
        "real-famous.bin": [row for row in records if row["kind"] == "real" and row.get("pop", 0) >= 80],
        "real-known.bin": [row for row in records if row["kind"] == "real" and 30 <= row.get("pop", 0) < 80],
        "real-more.bin": [row for row in records if row["kind"] == "real" and 15 <= row.get("pop", 0) < 30],
        "real-rest.bin": [row for row in records if row["kind"] == "real" and row.get("pop", 0) < 15],
        "fiction.bin": [row for row in records if row["kind"] == "fiction"],
        "animals.bin": [row for row in records if row["kind"] == "animal"],
        "objects.bin": [row for row in records if row["kind"] == "object"],
    }
    shards = []
    for name, rows in groups.items():
        if not rows:
            continue
        write_shard(OUT / name, rows, qindex, width)
        shards.append(name)
        print(f"{name}: {len(rows)}", flush=True)
    opening = "real"
    counts = {}
    for row in records:
        counts[row["kind"]] = counts.get(row["kind"], 0) + 1
    manifest = {
        "version": 1,
        "built": date.today().isoformat(),
        "opening": opening,
        "questions": QUESTIONS,
        "shards": shards,
        "total": len(records),
        "counts": counts,
        "adultNameOnly": sum(1 for row in records if row.get("adult")),
        "images": sum(1 for row in records if row.get("image") and not row.get("adult")),
        "aliases": aliases,
        "sources": [
            "Wikidata via the public QLever mirror (instance of, gender, occupation, citizenship, birth and death dates, sitelink counts, creators and taxon parents)",
            "Wikimedia Commons files kept only when the Commons licence metadata is a free licence",
            "Hand-curated people, Bengali literature, animals and everyday objects",
        ],
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"total": manifest["total"], "counts": counts, "opening": opening, "adultNameOnly": manifest["adultNameOnly"], "images": manifest["images"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
