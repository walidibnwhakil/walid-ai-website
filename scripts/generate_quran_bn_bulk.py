#!/usr/bin/env python3
"""Generate independent Bengali Quran drafts from the repository's Arabic source.

This command is deliberately draft-only. It reads only each surah's Arabic field,
never sends or copies the licensed Bengali translation, and writes resumable
JSON batches plus a checkpoint. Provider credentials are read by
walid_providers.py from the environment.
"""
from __future__ import annotations
import argparse, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
BATCH_SIZE = 25
REQUIRED = {"surah", "ayah", "arabic", "bengali_translation", "bengali_transliteration", "uncertainties"}

def load_arabic(root: Path):
    rows = []
    for path in sorted((root / "islam" / "quran" / "data").glob("surah-*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        for verse in data.get("verses", []):
            rows.append({"surah": int(data["surah"]), "ayah": int(verse["verse"]), "arabic": verse["arabic"]})
    rows.sort(key=lambda r: (r["surah"], r["ayah"]))
    if len(rows) != 6236 or len({(r["surah"], r["ayah"]) for r in rows}) != 6236:
        raise SystemExit(f"Arabic source must contain 6236 unique ayahs; found {len(rows)}")
    return rows

def existing_keys(out: Path):
    keys = set()
    for path in out.glob("draft-batch-*.json"):
        batch = json.loads(path.read_text(encoding="utf-8"))
        keys.update((int(r["surah"]), int(r["ayah"])) for r in batch)
    return keys

def parse_response(text: str, expected):
    text = text.strip()
    match = re.search(r"\{.*\}", text, re.S)
    if not match:
        raise ValueError("provider did not return a JSON object")
    row = json.loads(match.group(0))
    if {(row.get("surah"), row.get("ayah"))} != {(expected["surah"], expected["ayah"])}:
        raise ValueError("provider returned the wrong ayah id")
    missing = REQUIRED - row.keys()
    if missing:
        raise ValueError(f"provider response missing {sorted(missing)}")
    if not row["arabic"].strip() or not row["bengali_translation"].strip() or not row["bengali_transliteration"].strip():
        raise ValueError("provider returned an empty field")
    if not isinstance(row["uncertainties"], list) or not row["uncertainties"]:
        raise ValueError("provider returned no uncertainty flags")
    row["review_status"] = "unreviewed_draft"
    row["publishable"] = False
    row["composition_note"] = "Arabic-only model draft; independently composed and pending qualified scholarly review."
    return row

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", type=Path, default=ROOT)
    ap.add_argument("--out", type=Path, default=ROOT / "data" / "quran-bn")
    ap.add_argument("--limit", type=int, default=0, help="maximum new ayahs for this invocation; 0 means all remaining")
    ap.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    args = ap.parse_args()
    if args.batch_size < 1:
        ap.error("--batch-size must be positive")
    source = load_arabic(args.root)
    args.out.mkdir(parents=True, exist_ok=True)
    done = existing_keys(args.out)
    remaining = [row for row in source if (row["surah"], row["ayah"]) not in done]
    if args.limit:
        remaining = remaining[:args.limit]
    if not remaining:
        print("No remaining ayahs. Existing coverage is unchanged.")
        return 0
    try:
        from walid_providers import generate_fallback_answer
    except ImportError as exc:
        raise SystemExit(f"provider module unavailable: {exc}")
    checkpoint = args.out / "bulk-generation-checkpoint.json"
    checkpoint.write_text(json.dumps({"status": "running", "requested": len(remaining), "completed": 0}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    generated = []
    for index, source_row in enumerate(remaining, 1):
        prompt = (
            "Return exactly one JSON object and no markdown. Translate the Arabic Quran ayah into clear, natural Bengali "
            "as an independent draft, and provide Bengali-script phonetic aid. Do not use or reproduce any existing "
            "published translation. Preserve the supplied surah, ayah and Arabic exactly. Include a Bengali uncertainties "
            "array with at least one item for scholarly/phonetic review. Required keys: surah, ayah, arabic, "
            "bengali_translation, bengali_transliteration, uncertainties.\n\n"
            + json.dumps(source_row, ensure_ascii=False)
        )
        result = generate_fallback_answer(prompt, language="bn", use_search=False)
        if not result.text:
            raise SystemExit(f"provider stopped at {index}/{len(remaining)} ({source_row['surah']}:{source_row['ayah']}): {result.error}")
        try:
            generated.append(parse_response(result.text, source_row))
        except (ValueError, json.JSONDecodeError) as exc:
            raise SystemExit(f"invalid provider output at {source_row['surah']}:{source_row['ayah']}: {exc}")
        if len(generated) == args.batch_size or index == len(remaining):
            batch_no = max([int(p.stem.split("-")[-1]) for p in args.out.glob("draft-batch-*.json")] or [0]) + 1
            path = args.out / f"draft-batch-{batch_no:03d}.json"
            path.write_text(json.dumps(generated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            generated.clear()
        checkpoint.write_text(json.dumps({"status": "running", "requested": len(remaining), "completed": index, "last": source_row}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"checkpoint: {index}/{len(remaining)}", flush=True)
    checkpoint.write_text(json.dumps({"status": "complete", "requested": len(remaining), "completed": len(remaining)}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
