#!/usr/bin/env python3
"""Widen knowledge shards for the politics questions and correct known politicians.

Old shards stay valid: new question bits start unknown, then the checked
politicians are overwritten from curated.py.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from curated import curated_entities  # noqa: E402
from pack import attr_bytes, write_shard  # noqa: E402

KB = HERE.parent / "kb"
OLD_WIDTH = 26
NEW_WIDTH = 28
WANTED = {
    "Q191375", "Q52183", "Q234814", "Q198313", "Q7686199",
    "Q43969", "Q7402629", "Q14325293", "Q6874839", "Q1058",
}


def read_records(path):
    data = path.read_bytes()
    if data[:4] != b"RXKB":
        raise SystemExit(f"bad shard {path}")
    version, width, count = int.from_bytes(data[4:6], "little"), int.from_bytes(data[6:8], "little"), int.from_bytes(data[8:12], "little")
    if version != 1:
        raise SystemExit(f"bad version {path}")
    offset = 12
    rows = []
    for _ in range(count):
        qid = int.from_bytes(data[offset:offset + 4], "little")
        offset += 4
        if qid:
            ident = f"Q{qid}"
        else:
            length = data[offset]
            offset += 1
            ident = data[offset:offset + length].decode()
            offset += length
        pop = int.from_bytes(data[offset:offset + 2], "little")
        offset += 2
        flags = data[offset]
        offset += 1
        en_len = int.from_bytes(data[offset:offset + 2], "little")
        offset += 2
        en = data[offset:offset + en_len].decode("utf-8", "replace")
        offset += en_len
        bn_len = int.from_bytes(data[offset:offset + 2], "little")
        offset += 2
        bn = data[offset:offset + bn_len].decode("utf-8", "replace")
        offset += bn_len
        raw = bytearray(data[offset:offset + width])
        offset += width
        image = credit = ""
        if flags & 2:
            image_len = int.from_bytes(data[offset:offset + 2], "little")
            offset += 2
            image = data[offset:offset + image_len].decode("utf-8", "replace")
            offset += image_len
            credit_len = int.from_bytes(data[offset:offset + 2], "little")
            offset += 2
            credit = data[offset:offset + credit_len].decode("utf-8", "replace")
            offset += credit_len
        rows.append({
            "id": ident, "pop": pop, "adult": bool(flags & 1), "en": en, "bn": bn,
            "image": image, "credit": credit, "raw": raw, "width": width,
        })
    return rows


def widen(raw, width):
    if width == NEW_WIDTH:
        return bytearray(raw)
    if width != OLD_WIDTH:
        raise SystemExit(f"unexpected width {width}")
    return bytearray(raw) + bytes(NEW_WIDTH - OLD_WIDTH)


def main():
    questions = json.loads((HERE / "questions.json").read_text(encoding="utf-8"))
    if len(questions) != 110:
        raise SystemExit(f"expected 110 questions, found {len(questions)}")
    qindex = {question["id"]: index for index, question in enumerate(questions)}
    curated = {row["id"]: row for row in curated_entities() if row["id"] in WANTED}
    missing = set(WANTED)
    found = {qid: 0 for qid in WANTED}
    for path in sorted(KB.glob("*.bin")):
        if path.name == "politicians.bin":
            continue
        rows = read_records(path)
        changed = False
        for row in rows:
            row["raw"] = widen(row["raw"], row["width"])
            if row["width"] != NEW_WIDTH:
                changed = True
            if row["id"] in curated:
                fresh = attr_bytes(curated[row["id"]], qindex, NEW_WIDTH)
                if row["raw"] != fresh or row["width"] != NEW_WIDTH:
                    changed = True
                row["raw"] = fresh
                row["en"] = curated[row["id"]]["en"]
                row["bn"] = curated[row["id"]]["bn"]
                row["pop"] = max(row["pop"], curated[row["id"]]["pop"])
                missing.discard(row["id"])
                found[row["id"]] += 1
        if changed or rows and rows[0]["width"] != NEW_WIDTH:
            write_rows(path, rows)
            print("rewrote", path.name, len(rows))
    extra = [curated[qid] for qid in WANTED if qid in missing]
    if extra:
        write_shard(KB / "politicians.bin", extra, qindex, NEW_WIDTH)
        print("added", [row["id"] for row in extra])
    manifest_path = KB / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["questions"] = questions
    shards = manifest.setdefault("shards", [])
    if "politicians.bin" not in shards:
        shards.insert(0, "politicians.bin")
    groups = manifest.setdefault("groups", {})
    character = groups.setdefault("character", [])
    if "politicians.bin" in character:
        character.remove("politicians.bin")
    character.insert(0, "politicians.bin")
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("found", found)
    print("missing", sorted(missing))


def write_rows(path, rows):
    import struct
    out = bytearray()
    out += b"RXKB"
    out += struct.pack("<HHI", 1, NEW_WIDTH, len(rows))
    for row in rows:
        sid = str(row["id"])
        number = int(sid[1:]) if sid.startswith("Q") and sid[1:].isdigit() and int(sid[1:]) <= 0xFFFFFFFF else 0
        out += struct.pack("<I", number)
        if number == 0:
            ident = sid.encode()[:200]
            out += struct.pack("<B", len(ident)) + ident
        flags = 1 if row.get("adult") else 0
        image = "" if row.get("adult") else (row.get("image") or "")
        credit = (row.get("credit") or "") if image else ""
        if image:
            flags |= 2
        out += struct.pack("<HB", min(65535, int(row.get("pop") or 1)), flags)
        en = (row.get("en") or "").encode()[:500]
        bn = (row.get("bn") or "").encode()[:500]
        out += struct.pack("<H", len(en)) + en
        out += struct.pack("<H", len(bn)) + bn
        raw = row["raw"]
        if len(raw) != NEW_WIDTH:
            raise SystemExit(f"width {len(raw)} in {path}")
        out += raw
        if image:
            ib = image.encode()[:300]
            cb = credit.encode()[:180]
            out += struct.pack("<H", len(ib)) + ib
            out += struct.pack("<H", len(cb)) + cb
    path.write_bytes(out)


if __name__ == "__main__":
    main()
