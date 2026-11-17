import json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "quran-bn"

def test_bulk_importer_is_resumable_and_gate_closed(tmp_path):
    source = tmp_path / "source.jsonl"
    source.write_text(json.dumps({
        "surah": 2, "ayah": 17, "arabic": "مَثَلُهُمْ",
        "bengali_translation": "তাদের দৃষ্টান্ত।",
        "bengali_transliteration": "মাসালুহুম",
        "uncertainties": ["Meaning and recitation require review."]
    }, ensure_ascii=False) + "\n", encoding="utf-8")
    out = tmp_path / "out"
    script = ROOT / "scripts" / "generate_quran_bn_drafts.py"
    result = subprocess.run([sys.executable, str(script), "--source", str(source),
                             "--out", str(out), "--batch-size", "1"], capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    row = json.loads((out / "draft-batch-001.json").read_text(encoding="utf-8"))[0]
    assert row["review_status"] == "unreviewed_draft"
    assert row["publishable"] is False
    assert json.loads((out / "checkpoint.json").read_text())["completed"] is True
