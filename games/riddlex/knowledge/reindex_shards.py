#!/usr/bin/env python3
"""Rebuild character shards into a popular set plus hard-attribute buckets.

A phone round should fetch the popular set (and, once a country is known, that
country's bucket) instead of the whole casebook.
"""

from __future__ import annotations

import json
import shutil
import struct
from pathlib import Path

HERE = Path(__file__).resolve().parent
KB = HERE.parent / "kb"
OUT = KB / "ix"
TMP = KB / "_reindex"
POP_TOP = 40
PART_MAX = 12000

COUNTRY = {
    "from_bd": "bd", "from_in": "in", "from_pk": "pk", "from_us": "us", "from_gb": "gb",
    "from_jp": "jp", "from_kr": "kr", "from_cn": "cn", "from_fr": "fr", "from_de": "de",
    "from_ru": "ru", "from_br": "br", "from_ca": "ca", "from_au": "au", "from_es": "es",
    "from_it": "it", "from_mx": "mx", "from_ng": "ng", "from_eg": "eg", "from_tr": "tr",
    "from_id": "id", "from_sa": "sa", "from_ar": "ar", "from_za": "za",
}
BIRTH = {
    "born_pre1900": "pre", "born_1900_1949": "0049", "born_1950_1969": "5069",
    "born_1970_1979": "7079", "born_1980_1989": "8089", "born_1990_1999": "9099",
    "born_2000_plus": "2000",
}


def bit(raw, qindex, qid):
    qi = qindex[qid]
    return (raw[qi >> 2] >> ((qi & 3) << 1)) & 3


def iter_records(path, width):
    data = path.read_bytes()
    if data[:4] != b"RXKB":
        raise SystemExit(f"bad shard {path.name}")
    version, got, count = struct.unpack_from("<HHI", data, 4)
    if version != 1 or got != width:
        raise SystemExit(f"unexpected header in {path.name}")
    offset = 12
    for _ in range(count):
        start = offset
        number = struct.unpack_from("<I", data, offset)[0]
        offset += 4
        if number:
            ident = f"Q{number}"
        else:
            length = data[offset]
            offset += 1
            ident = data[offset:offset + length].decode()
            offset += length
        pop = struct.unpack_from("<H", data, offset)[0]
        offset += 2
        flags = data[offset]
        offset += 1
        for _field in range(2):
            size = struct.unpack_from("<H", data, offset)[0]
            offset += 2 + size
        raw = data[offset:offset + width]
        offset += width
        if flags & 2:
            for _field in range(2):
                size = struct.unpack_from("<H", data, offset)[0]
                offset += 2 + size
        yield ident, pop, raw, data[start:offset]


def one(raw, qindex, mapping, empty):
    hits = [code for qid, code in mapping.items() if bit(raw, qindex, qid) == 2]
    if len(hits) == 1:
        return hits[0]
    if len(hits) > 1:
        return "multi"
    return empty


def classify(pop, raw, qindex):
    real = bit(raw, qindex, "real") == 2
    fictional = bit(raw, qindex, "fictional") == 2
    if pop >= POP_TOP or (not real and not fictional):
        return "top"
    if fictional and not real:
        return "fiction"
    gender = "m" if bit(raw, qindex, "male") == 2 else "f" if bit(raw, qindex, "female") == 2 else "u"
    life = "a" if bit(raw, qindex, "alive") == 2 else "d" if bit(raw, qindex, "dead") == 2 else "u"
    country = one(raw, qindex, COUNTRY, "xx")
    birth = one(raw, qindex, BIRTH, "u")
    return f"{country}|{gender}|{life}|{birth}"


def write_shard(path, records, width):
    out = bytearray()
    out += b"RXKB"
    out += struct.pack("<HHI", 1, width, len(records))
    for blob in records:
        out += blob
    path.write_bytes(out)
    return len(out)


def main():
    manifest = json.loads((KB / "manifest.json").read_text(encoding="utf-8"))
    questions = manifest["questions"]
    qindex = {question["id"]: index for index, question in enumerate(questions)}
    width = (len(questions) + 3) // 4
    order = []
    seen_names = set()
    for name in manifest["groups"]["character"]:
        if name not in seen_names:
            seen_names.add(name)
            order.append(name)
    preferred = [name for name in order if not name.startswith("people-")]
    rest = [name for name in order if name.startswith("people-")]
    if TMP.exists():
        shutil.rmtree(TMP)
    TMP.mkdir()
    handles = {}
    seen = set()
    counts = {}

    def sink(key, pop, blob):
        handle = handles.get(key)
        if handle is None:
            handle = (TMP / f"{key}.part").open("ab")
            handles[key] = handle
        handle.write(struct.pack("<IH", len(blob), pop))
        handle.write(blob)
        counts[key] = counts.get(key, 0) + 1

    kept = 0
    for name in preferred + rest:
        for ident, pop, raw, blob in iter_records(KB / name, width):
            if ident in seen:
                continue
            seen.add(ident)
            kept += 1
            sink(classify(pop, raw, qindex), pop, blob)
        print(name, "seen", kept, flush=True)
    for handle in handles.values():
        handle.close()

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    buckets = []

    def emit(key, part_records):
        country, gender, life, birth = key.split("|")
        part = 0
        ordered = sorted(part_records, key=lambda item: item[0], reverse=True)
        for start in range(0, len(ordered), PART_MAX):
            chunk = [blob for _pop, blob in ordered[start:start + PART_MAX]]
            filename = f"r-{country}-{gender}-{life}-{birth}-p{part:02d}.bin"
            size = write_shard(OUT / filename, chunk, width)
            buckets.append({
                "c": country, "g": gender, "l": life, "b": birth, "part": part,
                "file": f"ix/{filename}", "bytes": size, "n": len(chunk),
            })
            part += 1

    top_count = fiction_count = 0
    top_bytes = fiction_bytes = 0
    for path in sorted(TMP.glob("*.part")):
        key = path.stem
        rows = []
        data = path.read_bytes()
        offset = 0
        while offset < len(data):
            length, pop = struct.unpack_from("<IH", data, offset)
            offset += 6
            rows.append((pop, data[offset:offset + length]))
            offset += length
        if key == "top":
            rows.sort(key=lambda item: item[0], reverse=True)
            top_bytes = write_shard(OUT / "top.bin", [blob for _pop, blob in rows], width)
            top_count = len(rows)
        elif key == "fiction":
            rows.sort(key=lambda item: item[0], reverse=True)
            fiction_bytes = write_shard(OUT / "fiction.bin", [blob for _pop, blob in rows], width)
            fiction_count = len(rows)
        else:
            emit(key, rows)
        path.unlink()
    TMP.rmdir()

    index = {
        "budget": 4500000,
        "top": "ix/top.bin",
        "topBytes": top_bytes,
        "topCount": top_count,
        "fiction": "ix/fiction.bin",
        "fictionBytes": fiction_bytes,
        "fictionCount": fiction_count,
        "buckets": buckets,
    }
    (KB / "index.json").write_text(json.dumps(index, separators=(",", ":")), encoding="utf-8")
    removed = []
    for name in order:
        if name.startswith(("people-", "real-")) or name == "fiction.bin":
            target = KB / name
            if target.exists():
                target.unlink()
                removed.append(name)
    keep = [name for name in manifest["shards"] if name not in set(removed)]
    for name in ("ix/top.bin", "ix/fiction.bin"):
        if name not in keep:
            keep.append(name)
    manifest["shards"] = keep
    manifest["groups"]["character"] = ["ix/top.bin", "ix/fiction.bin"]
    manifest["built"] = "2026-11-11"
    manifest["characterIndex"] = "index.json"
    (KB / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")
    bucket_bytes = sum(item["bytes"] for item in buckets)
    print(json.dumps({
        "kept": kept,
        "top": [top_count, top_bytes],
        "fiction": [fiction_count, fiction_bytes],
        "buckets": len(buckets),
        "bucketBytes": bucket_bytes,
        "removed": len(removed),
    }))


if __name__ == "__main__":
    main()
