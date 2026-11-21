#!/usr/bin/env python3
"""Editorial QA for the 30 canonical Others reader catalogs and book headers."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
OTHERS = ROOT / "others"
CATEGORIES = {"history": 20, "folklore": 5, "islamic-literature": 5}
OLD = {"ali-hasan-husayn-karbala", "hasan-ibn-ali", "husayn-ibn-ali"}
errors = []

def check(ok, msg):
    if not ok:
        errors.append(msg)

for category, count in CATEGORIES.items():
    html = (OTHERS / category / "index.html").read_text(encoding="utf-8")
    cards = re.findall(r'<a class="others-card" href="(/others/' + category + r'/([^/]+)/)">([\s\S]*?)</a>', html)
    check(len(cards) == count, f"{category}: wrong catalog count")
    icon_contents = []
    for url, slug, card in cards:
        match = re.search(r'<svg class="others-card-art"[^>]*>([\s\S]*?)</svg>', card)
        check(match is not None, f"{slug}: missing custom SVG icon")
        if match:
            icon_contents.append(match.group(1))
            check(bool(re.search(r'<title>[^<]{12,}</title>', match.group(1))), f"{slug}: missing authentic-scope icon title")
        summary = re.search(r'<small>([^<]+)</small>', card)
        check(summary is not None and 20 <= len(summary.group(1)) <= 160, f"{slug}: unprofessional card summary")
        book = OTHERS / category / slug / "index.html"
        check(book.is_file(), f"{slug}: missing book")
        if not book.exists():
            continue
        doc = book.read_text(encoding="utf-8")
        intro = re.search(r'<header class="others-book-title">[\s\S]*?<h1>([^<]+)</h1><p>([\s\S]*?)</p></header>', doc)
        check(intro is not None, f"{slug}: missing book title or intro")
        if intro:
            check("<a " not in intro.group(2), f"{slug}: clickable book subtitle")
            check(30 <= len(intro.group(2)) <= 175, f"{slug}: overly long or thin subtitle")
        seo = re.search(r'<meta name="description" content="([^"]+)"', doc)
        check(seo is not None and 30 <= len(seo.group(1)) <= 175, f"{slug}: SEO summary length")
        check("?v=20261122-symbols" in doc, f"{slug}: stale reader assets")
    check(len(icon_contents) == len(set(icon_contents)), f"{category}: duplicate illustrations")

history = (OTHERS / "history/index.html").read_text(encoding="utf-8")
alexander = (OTHERS / "history/alexander/index.html").read_text(encoding="utf-8")
check("<strong>আলেকজান্ডার দ্য গ্রেট</strong>" in history, "Alexander catalog title must be Bengali")
check("<h1>আলেকজান্ডার দ্য গ্রেট</h1>" in alexander, "Alexander reader title must be Bengali")
check("<title>আলেকজান্ডার দ্য গ্রেট | Walid AI</title>" in alexander, "Alexander SEO title must be Bengali")
check("<strong>কারবালা</strong>" in history, "Karbala should have a short title")
for category in CATEGORIES:
    doc = (OTHERS / category / "index.html").read_text(encoding="utf-8")
    check('class="others-note"' not in doc, f"{category}: redundant note beneath catalog")
    check("?v=20261122-symbols" in doc, f"{category}: cache bust missing")
reader_js = (OTHERS / "assets/reader.js").read_text(encoding="utf-8")
check('reader.querySelectorAll(".others-book-title p a, .others-chapter p a")' in reader_js,
      "book prose links must be unwrapped to plain text")
check('if (/^\\/others\\/(?:folklore|islamic-literature)\\//' not in reader_js,
      "history prose link unwrapping should not be skipped")
check((OTHERS / "assets/icon-provenance.md").exists(), "missing source caveats for catalog icons")

if errors:
    for err in errors:
        print("FAIL:", err)
    raise SystemExit(1)
print("PASS: 30 catalog icons, Bengali names, professional subtitles, unlinked reader prose and SEO.")
