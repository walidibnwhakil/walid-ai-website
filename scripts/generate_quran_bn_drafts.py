#!/usr/bin/env python3
"""Resumable importer for independently authored Bengali Quran draft records.

Input is JSONL (one record per line) with: surah, ayah, arabic,
bengali_translation, bengali_transliteration, uncertainties.
The importer never copies a licensed translation and never changes production
Quran data. It atomically writes numbered draft batches and a checkpoint.
"""
from __future__ import annotations
import argparse, json, os, tempfile
from pathlib import Path

REQUIRED = {"surah","ayah","arabic","bengali_translation","bengali_transliteration","uncertainties"}

def atomic_write(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix=path.name + ".", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(value, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", type=Path, required=True)
    ap.add_argument("--out", type=Path, default=Path("data/quran-bn"))
    ap.add_argument("--batch-size", type=int, default=100)
    ap.add_argument("--resume", action="store_true")
    args = ap.parse_args()
    if args.batch_size < 1:
        ap.error("--batch-size must be positive")
    rows, seen = [], set()
    for lineno, line in enumerate(args.source.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try: row = json.loads(line)
        except json.JSONDecodeError as exc:
            raise SystemExit(f"{args.source}:{lineno}: invalid JSON: {exc}")
        missing = REQUIRED - row.keys()
        if missing: raise SystemExit(f"{args.source}:{lineno}: missing {sorted(missing)}")
        key = (row["surah"], row["ayah"])
        if key in seen: raise SystemExit(f"{args.source}:{lineno}: duplicate {key}")
        seen.add(key)
        row.update(review_status="unreviewed_draft", publishable=False)
        row.setdefault("composition_note", "Independently authored Arabic-based draft; requires qualified scholarly review.")
        rows.append(row)
    rows.sort(key=lambda r: (r["surah"], r["ayah"]))
    checkpoint = args.out / "checkpoint.json"
    old = json.loads(checkpoint.read_text(encoding="utf-8")) if args.resume and checkpoint.exists() else {"next_index": 0}
    start = int(old.get("next_index", 0))
    if not 0 <= start <= len(rows): raise SystemExit("checkpoint next_index is outside source range")
    index = start
    while index < len(rows):
        end = min(index + args.batch_size, len(rows))
        batch_no = index // args.batch_size + 1
        atomic_write(args.out / f"draft-batch-{batch_no:03d}.json", rows[index:end])
        index = end
        atomic_write(checkpoint, {"source": str(args.source), "next_index": index, "total": len(rows), "completed": index == len(rows)})
        print(f"checkpoint: {index}/{len(rows)}")
    print(f"Imported {len(rows)} independently authored records; publication gate remains closed.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
