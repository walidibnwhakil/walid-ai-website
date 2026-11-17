#!/usr/bin/env python3
import json, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data" / "quran-bn"
REQUIRED = {"surah", "ayah", "arabic", "bengali_translation", "bengali_transliteration",
            "review_status", "publishable", "uncertainties", "composition_note"}

def main():
    files = sorted(DATA_DIR.glob("draft-batch-*.json"))
    records = []
    errors = []
    seen = set()
    for path in files:
        try:
            batch = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            errors.append(f"{path.name}: invalid JSON: {exc}")
            continue
        if not isinstance(batch, list) or not batch:
            errors.append(f"{path.name}: batch must be a non-empty list")
            continue
        for index, record in enumerate(batch, 1):
            missing = REQUIRED - record.keys()
            if missing:
                errors.append(f"{path.name}:{index}: missing {sorted(missing)}")
            key = (record.get("surah"), record.get("ayah"))
            if key in seen:
                errors.append(f"{path.name}:{index}: duplicate ayah {key}")
            seen.add(key)
            records.append(record)
            if not any("ঀ" <= char <= "৿" for char in record.get("bengali_translation", "")):
                errors.append(f"{path.name}:{index}: translation not Bengali")
            if not any("ঀ" <= char <= "৿" for char in record.get("bengali_transliteration", "")):
                errors.append(f"{path.name}:{index}: transliteration not Bengali")
            if record.get("review_status") != "unreviewed_draft" or record.get("publishable") is not False:
                errors.append(f"{path.name}:{index}: publication gate violated")
            if not record.get("uncertainties"):
                errors.append(f"{path.name}:{index}: uncertainty list empty")
            if not record.get("arabic", "").strip():
                errors.append(f"{path.name}:{index}: Arabic source is empty")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"Validated {len(records)} unreviewed draft ayahs across {len(files)} batches; publication gate remains closed.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
