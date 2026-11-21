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
    assert len(paragraphs) >= 8, f"Chapter {number} has fewer than eight developed scenes"
    words = len(re.sub(r"<[^>]+>", "", body).split())
    assert words >= 400, f"Chapter {number} is too compressed ({words} words)"
    for meta_phrase in ("প্রচলিত কাহিনিতে", "এই পর্বে", "কল্পকাহিনির", "লোককাহিনির"):
        assert meta_phrase not in body, f"Chapter {number} interrupts narration with {meta_phrase}"
    for paragraph in paragraphs:
        plain = re.sub(r"<[^>]+>", "", paragraph).strip()
        assert len(plain) >= 140, f"Chapter {number} contains a filler paragraph"
        assert plain not in seen, f"Repeated paragraph in chapter {number}"
        seen.add(plain)
    paras += len(paragraphs)

# Keep the seven voyages distinct, including the often misplaced second-voyage goods.
detailed_milestones = {
    3: ("অশ্বপালক", "মিহরজান", "অধিনায়ক"),
    5: ("মাংস", "হীরা", "বণিক"),
    6: ("অধিনায়ক", "দৈত্য", "ভেলা"),
    7: ("দ্বিতীয় যাত্রার", "অবিক্রীত", "সাপ"),
    8: ("পারস্য", "মরিচ", "জিন"),
    9: ("সাত", "স্ত্রী", "গুহা", "আঘাত"),
    10: ("জাহাজ", "রক পাখি", "ছানা"),
    11: ("আঙুর", "সমুদ্রবৃদ্ধ", "নারকেল"),
    12: ("সঙ্গী", "অন্ধকার", "নদী"),
    13: ("সেরেন্দিব", "খলিফা", "উপহার"),
    14: ("খলিফা", "জলদস্যু", "দাসবাজার", "ধনুক"),
    15: ("হাতি", "মুক্ত", "বাগদাদ"),
    16: ("হিন্দবাদ", "উপহার", "বাগদাদ"),
}
for i, words in detailed_milestones.items():
    for word in words:
        assert word in chapters[i - 1][2], f"Chapter {i} lost a core scene: {word}"

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
# Protect the scene order, not merely the presence of names. Plot anchors follow
# the seven-voyage tale in public-domain Arabian Nights editions, including
# Andrew Lang's collection; the Bengali prose is an original retelling.
paragraphs_by_chapter = {
    int(number): [re.sub(r"<[^>]+>", "", p).strip()
                  for p in re.findall(r"<p>(.*?)</p>", body, flags=re.S)]
    for number, _, body in chapters
}
staged_scenes = {
    2: ((5, "জাহাজ"), (6, "সামুদ্রিক প্রাণী"), (9, "পাত্র"), (11, "উপকূলে")),
    3: ((2, "অশ্বপালকেরা"), (3, "মিহরজান"), (6, "গাঁটরি"),
        (8, "অধিনায়ক"), (9, "পণ্যের")),
    4: ((3, "ঘুমিয়ে"), (5, "ডিম"), (7, "পাগড়ি"), (9, "উঠতে")),
    5: ((3, "মাংস"), (4, "পাগড়ি"), (5, "পাখি"), (6, "বণিক")),
    6: ((5, "একচোখো"), (7, "ভেলা"), (8, "লোহার শিক")),
    7: ((1, "সাপ"), (4, "জাহাজ"), (7, "দ্বিতীয় যাত্রার"), (8, "হিসাবমতো")),
    8: ((3, "খাদ্য"), (4, "বনের"), (5, "মরিচ"), (7, "জিন")),
    9: ((1, "বিবাহ"), (3, "সাত রুটি"), (6, "নবাগতকে"), (7, "ফাঁক")),
    11: ((3, "আঙুর"), (5, "নারকেল"), (6, "বানরেরা")),
    12: ((4, "শেষ সঙ্গীর"), (6, "ভেলা"), (7, "গুহার")),
    13: ((1, "কৃষকেরা"), (4, "রাজা"), (6, "উপহার"), (7, "খলিফার")),
    14: ((2, "দূতের দায়িত্ব"), (4, "জলদস্যু"), (5, "দাসবাজার"),
         (6, "ধনুক"), (8, "হাতির")),
    15: ((2, "গাছসহ"), (3, "অস্থি"), (4, "শহরের কাছে"),
         (5, "হাতিদের"), (6, "মালিক"), (7, "মুক্তি")),
    16: ((3, "অসমতা"), (5, "উপহারের"), (7, "সিঁড়িতে"), (8, "হিন্দবাদ")),
}
for chapter, expected_steps in staged_scenes.items():
    paragraphs = paragraphs_by_chapter[chapter]
    for index, keyword in expected_steps:
        assert keyword in paragraphs[index - 1], (
            f"Chapter {chapter} scene {index} missing or shifted: {keyword}"
        )

# A narrative can pass word-count tests yet repeat entire episodes in slightly
# different language. Detect suspicious semantic overlap within each chapter.
for chapter, parts in paragraphs_by_chapter.items():
    token_sets = [
        set(re.findall(r"[\w\u0980-\u09ff]+", p))
        for p in parts
    ]
    for i, a in enumerate(token_sets):
        for j in range(i + 1, len(token_sets)):
            b = token_sets[j]
            overlap = (2 * len(a & b)) / max(1, len(a) + len(b))
            assert overlap < 0.57, (
                f"Chapter {chapter} paragraphs {i + 1}/{j + 1} revisit one scene "
                f"too closely (token overlap {overlap:.2f})"
            )

print(f"SINBAD_EDITORIAL_PASS chapters={len(chapters)} paragraphs={paras} toc={len(entries)}")
