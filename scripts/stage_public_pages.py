"""Build the public Pages directory without development-only files."""
from pathlib import Path
import shutil, re

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "_site"
PUBLIC_DIRS = set("admin assets chat contact-us data fonts games guides image islam others pdf privacy privacy-policy pwa sections sports terms-of-service third-party-licenses tool-workspace tools zip about-us".split())
ROOT_FILES = set("""CNAME index.html about-contact-fonts.css admin-analytics-catalog.js admin-approvals.js admin-ops.js admin-section-metrics.js admin-shell.css admin-staff.html admin-usage.js ads-config.js ads.txt app.js apple-touch-icon.png backend-config.js chat-ad.js chat-ui.js favicon-32.png favicon.ico firebase-config.js kathgolap-logo.png manager-office-chat.css manifest.webmanifest pwa-offline.html pwa.js robots.txt sitemap.xml sw.js usage.js walid-ai-approved-flower.png walid-ai-approved-logo.png walid-ai-bangladesh-flag.png walid-ai-flag-wave.jfif walid-ai-share-20261122-compatible.jpg walid-ai-share-20261122.png walid-branding.css walid-legal.css""".split())
SKIP_PARTS = {"tests","fixtures","artwork","knowledge","node_modules","__pycache__","reports"}
DEV_FILE = re.compile(r"(?:\.test\.|\.spec\.|^audit-|^owner-\d|e2e|browser-check|mobile-check|viewport-check|^release-progress|^RELEASE_PROGRESS|^package(?:-lock)?\.json$)", re.I)
def allowed(rel):
    p = rel.parts
    if len(p)==1:
        return p[0] in ROOT_FILES
    if p[0] not in PUBLIC_DIRS or any(x.startswith(".") or x in SKIP_PARTS for x in p):
        return False
    if DEV_FILE.search(rel.name) or rel.suffix.lower() in {".py",".ps1",".cjs"}:
        return False
    if rel.name.lower()=="founder.jpg":
        return False
    # Source and copyright notices are retained; internal QA markdown is excluded.
    if rel.suffix.lower()==".md" and not re.search(r"license|notice|credits|sources|provenance",rel.name,re.I):
        return False
    return True

def build():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    count = 0
    for p in ROOT.rglob("*"):
        if not p.is_file() or OUT in p.parents:
            continue
        rel=p.relative_to(ROOT)
        if allowed(rel):
            target=OUT/rel
            target.parent.mkdir(parents=True,exist_ok=True)
            shutil.copyfile(p,target)
            count+=1
    for rel in ["index.html","CNAME","robots.txt","sitemap.xml","admin/index.html","chat/index.html","games/riddlex/index.html","games/riddlex/kb/index.json","games/snakes-and-ladders/index.html","islam/quran/index.html","pdf/index.html","image/index.html"]:
        assert (OUT/rel).is_file(), "Missing production entry: "+rel
    assert not (OUT/"tests").exists()
    assert not (OUT/"games/riddlex/artwork").exists()
    assert not (OUT/"games/riddlex/images/approved/founder.jpg").exists()
    print("Staged",count,"public files")
if __name__ == "__main__":
    build()
