import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data" / "quran-bn"
VALIDATOR = ROOT / "scripts" / "validate_quran_bn_draft.py"

def load_records():
    records = []
    for path in sorted(DATA_DIR.glob("draft-batch-*.json")):
        records.extend(json.loads(path.read_text(encoding="utf-8")))
    return records

def test_existing_first_batch_is_preserved():
    records = json.loads((DATA_DIR / "draft-batch-001.json").read_text(encoding="utf-8"))
    assert len(records) == 12
    assert [(x["surah"], x["ayah"]) for x in records[:7]] == [(1, n) for n in range(1, 8)]
    assert [(x["surah"], x["ayah"]) for x in records[7:]] == [(2, n) for n in range(1, 6)]

def test_all_batches_are_draft_only():
    records = load_records()
    assert len(records) == 23
    assert all(x["review_status"] == "unreviewed_draft" and x["publishable"] is False for x in records)

def test_validator():
    result = subprocess.run([sys.executable, str(VALIDATOR)], cwd=ROOT, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    assert "Validated 23 unreviewed draft ayahs across 2 batches" in result.stdout
