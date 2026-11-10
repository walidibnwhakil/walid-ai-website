#!/usr/bin/env python3
"""Pack /tmp/riddlex-broad/extra.jsonl into people shards, skipping IDs already shipped."""

from __future__ import annotations

import json
import struct
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pack import write_shard

KB = Path(__file__).resolve().parents[1] / "kb"
QUESTIONS = json.loads((Path(__file__).resolve().parent / "questions.json").read_text())
QINDEX = {question["id"]: index for index, question in enumerate(QUESTIONS)}
WIDTH = (len(QUESTIONS) + 3) // 4
SOURCE = Path("/tmp/riddlex-broad/extra.jsonl")


def existing_ids():
    found = set()
    for path in KB.glob("*.bin"):
        if path.name.startswith("people-"):
            continue
        data = path.read_bytes()
        count = struct.unpack_from("<I", data, 8)[0]
        # Re-read through the game decoder would be slower; scan Q-numbers is unnecessary.
        # Use a lightweight pass via the node decoder's format: walk records.
        offset = 12
        view = data
        for _ in range(count):
            number = struct.unpack_from("<I", view, offset)[0]
            offset += 4
            if number:
                ident = f"Q{number}"
            else:
                length = view[offset]
                offset += 1
                ident = view[offset:offset + length].decode()
                offset += length
            found.add(ident)
            offset += 3  # pop, flags
            for _field in range(2):
                size = struct.unpack_from("<H", view, offset)[0]
                offset += 2 + size
            offset += WIDTH
            flags = view[offset - WIDTH - 1]  # wrong, flags already passed
            # flags byte is immediately after pop uint16, before names.
            # The walk above is incorrect for flags. Use a safer decoder.
        break
    return found


def walk_ids(path):
    data = path.read_bytes()
    count = struct.unpack_from("<I", data, 8)[0]
    offset = 12
    ids = []
    for _ in range(count):
        number = struct.unpack_from("<I", data, offset)[0]
        offset += 4
        if number:
            ident = f"Q{number}"
        else:
            length = data[offset]
            offset += 1
            ident = data[offset:offset + length].decode()
            offset += length
        offset += 2  # pop
        flags = data[offset]
        offset += 1
        for _field in range(2):
            size = struct.unpack_from("<H", data, offset)[0]
            offset += 2 + size
        offset += WIDTH
        if flags & 2:
            for _field in range(2):
                size = struct.unpack_from("<H", data, offset)[0]
                offset += 2 + size
        ids.append(ident)
    return ids


def main():
    have = set()
    for path in sorted(KB.glob("*.bin")):
        if path.name.startswith("people-"):
            continue
        have.update(walk_ids(path))
    print("existing", len(have), flush=True)
    batch = []
    shard_index = 0
    added = 0
    names = []

    def flush():
        nonlocal batch, shard_index
        if not batch:
            return
        name = f"people-{shard_index:02d}.bin"
        write_shard(KB / name, batch, QINDEX, WIDTH)
        names.append(name)
        print(name, len(batch), flush=True)
        shard_index += 1
        batch = []

    with SOURCE.open(encoding="utf-8") as handle:
        for line in handle:
            record = json.loads(line)
            if record["id"] in have:
                continue
            have.add(record["id"])
            batch.append(record)
            added += 1
            if len(batch) >= 25000:
                flush()
    flush()
    manifest_path = KB / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    for name in names:
        if name not in manifest["shards"]:
            manifest["shards"].append(name)
    shards = manifest["shards"]
    manifest["groups"] = {
        "character": [name for name in shards if name.startswith(("real", "fiction", "people", "curated"))],
        "animal": [name for name in shards if name.startswith(("animal", "curated"))],
        "object": [name for name in shards if name.startswith(("object", "curated"))],
    }
    manifest["counts"]["real"] = manifest["counts"].get("real", 0) + added
    manifest["total"] = manifest.get("total", 0) + added
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False))
    print(json.dumps({"added": added, "shards": len(names), "total": manifest["total"]}))


if __name__ == "__main__":
    main()
