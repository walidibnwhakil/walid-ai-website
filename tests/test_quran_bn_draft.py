import json, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; DATA=ROOT/"data"/"quran-bn"/"draft-batch-001.json"; VALIDATOR=ROOT/"scripts"/"validate_quran_bn_draft.py"
def test_batch_shape():
    r=json.loads(DATA.read_text(encoding="utf-8")); assert len(r)==12; assert [(x["surah"],x["ayah"]) for x in r[:7]]==[(1,n) for n in range(1,8)]; assert [(x["surah"],x["ayah"]) for x in r[7:]]==[(2,n) for n in range(1,6)]
def test_publication_gate():
    r=json.loads(DATA.read_text(encoding="utf-8")); assert all(x["review_status"]=="unreviewed_draft" and x["publishable"] is False for x in r)
def test_validator():
    p=subprocess.run([sys.executable,str(VALIDATOR)],cwd=ROOT,capture_output=True,text=True); assert p.returncode==0,p.stderr; assert "publication gate remains closed" in p.stdout
