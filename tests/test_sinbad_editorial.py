"""Focused editorial regression for Sinbad's seven voyages.

Run: python3 tests/test_sinbad_editorial.py
The novelistic retelling is a folklore text, not a claim of historical travel.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / "others/islamic-literature/sinbad/index.html"
text = BOOK.read_text(encoding="utf-8")

chapters = re.findall(
    r'<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)</h2>(.*?)</section>',
    text, flags=re.S
)
assert len(chapters) == 16, f"Expected 16 integrated chapters, got {len(chapters)}"
assert [int(n) for n, _, _ in chapters] == list(range(1, 17))
toc = re.search(
    r'<nav class="others-toc" aria-label="অধ্যায় তালিকা">(.*?)</nav>',
    text, flags=re.S
)
assert toc, "Chapter navigation missing"
entries = re.findall(r'<li><a href="#chapter-(\d+)">(.*?)</a></li>', toc.group(1))
assert entries == [(n, title) for n, title, _ in chapters], "TOC and sections differ"
assert "অধ্যায়সূচি — ১৬টি অধ্যায়" in toc.group(1)

for voyage, start in (
    ("প্রথম", 2), ("দ্বিতীয়", 4), ("তৃতীয়", 6),
    ("চতুর্থ", 8), ("পঞ্চম", 10), ("ষষ্ঠ", 12), ("সপ্তম", 14),
):
    for idx in (start, start + 1):
        assert chapters[idx - 1][1].startswith(voyage + " যাত্রা:"), (
            f"Voyage {voyage} has broken chronology at chapter {idx}"
        )
assert "বাগদাদ" in chapters[0][1] and "হিন্দবাদ" in chapters[0][2]
assert "শেষ আসর" in chapters[-1][1]
assert "অষ্টম যাত্রা" not in text and "জাহাজের রাত:" not in text

milestones = {
    2: ("বসরা", "ডুব"),
    3: ("মিহরজান", "পণ্য"),
    4: ("রক পাখি", "ডিম"),
    5: ("হীরা", "বণিক"),
    6: ("দৈত্য", "শলাকা"),
    7: ("সাপ", "জাহাজ"),
    8: ("খাবার", "শাসক"),
    9: ("স্ত্রী", "সমাধি", "গুহা"),
    10: ("রক পাখি", "জাহাজ"),
    11: ("সমুদ্রবৃদ্ধ", "নারকেল"),
    12: ("পাথর", "ভেলা"),
    13: ("সেরেন্দিব", "খলিফা", "চিঠি"),
    14: ("খলিফা", "দূত", "জলদস্যু", "দাসবাজার"),
    15: ("হাতি", "মুক্ত", "বাগদাদ"),
    16: ("হিন্দবাদ", "ফিরে গেলেন"),
}
for i, required in milestones.items():
    body = chapters[i - 1][2]
    for word in required:
        assert word in body, f"Chapter {i} lacks {word}"

seen = set()
paras = 0
for number, _, body in chapters:
    paragraphs = re.findall(r"<p>(.*?)</p>", body, flags=re.S)
    assert len(paragraphs) >= 6, f"Chapter {number} is too abrupt"
    for paragraph in paragraphs:
        plain = re.sub(r"<[^>]+>", "", paragraph).strip()
        assert len(plain) >= 140, f"Chapter {number} contains a filler paragraph"
        assert plain not in seen, f"Repeated paragraph in chapter {number}"
        seen.add(plain)
    paras += len(paragraphs)

for invariant in (
    "/walid-ai-approved-logo.png",
    "/others/assets/books.css",
    "/others/assets/reader.js",
    '<link rel="canonical" href="https://walid-ai.com/others/islamic-literature/sinbad/">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
):
    assert invariant in text, f"Branding, SEO or responsive invariant missing: {invariant}"
assert text.count('class="legal-footer"') == 1
assert text.count('class="others-toc-trigger"') == 1
assert 'class="others-sources"' not in text
assert 'class="others-next"' not in text
assert "উৎস ও পরবর্তী পাঠ" not in text
assert "এই অধ্যায়" not in text
assert text.strip().endswith("</html>")
print(f"SINBAD_EDITORIAL_PASS chapters={len(chapters)} paragraphs={paras} toc={len(entries)}")
