#!/usr/bin/env python3
import json, sys, unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; DATA=ROOT/"data"/"quran-bn"/"draft-batch-001.json"
REQUIRED={"surah","ayah","arabic","bengali_translation","bengali_transliteration","review_status","publishable","uncertainties","composition_note"}
def main():
    records=json.loads(DATA.read_text(encoding="utf-8")); errors=[]; seen=set()
    for i,r in enumerate(records,1):
        missing=REQUIRED-r.keys()
        if missing: errors.append(f"{i}: missing {sorted(missing)}")
        key=(r.get("surah"),r.get("ayah"))
        if key in seen: errors.append(f"{i}: duplicate ayah {key}")
        seen.add(key)
        if not any("\u0980"<=c<="\u09ff" for c in r.get("bengali_translation","")): errors.append(f"{i}: translation not Bengali")
        if not any("\u0980"<=c<="\u09ff" for c in r.get("bengali_transliteration","")): errors.append(f"{i}: transliteration not Bengali")
        if r.get("review_status")!="unreviewed_draft" or r.get("publishable") is not False: errors.append(f"{i}: publication gate violated")
        if not r.get("uncertainties"): errors.append(f"{i}: uncertainty list empty")
        if unicodedata.normalize("NFC",r.get("arabic",""))!=r.get("arabic",""): errors.append(f"{i}: Arabic not NFC")
    if errors: print("\n".join(errors),file=sys.stderr); return 1
    print(f"Validated {len(records)} unreviewed draft ayahs; publication gate remains closed."); return 0
if __name__=="__main__": raise SystemExit(main())
