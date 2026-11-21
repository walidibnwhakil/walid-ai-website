"""Focused Quran/source and reader-shell regression checks for Ashab al-Kahf.

Run: python3 tests/test_ashab_al_kahf_editorial.py
The script tests factual boundaries and page structure, not the literary quality
of every sentence; editorial review remains necessary.
"""
from html import unescape
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "others/history/ashab-al-kahf/index.html"
HTML = PATH.read_text(encoding="utf-8")
ERRORS = []


def check(condition, message):
    if not condition:
        ERRORS.append(message)


def plain(value):
    return unescape(re.sub(r"<[^>]+>", "", value)).strip()


chapters = re.findall(
    r'<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)</h2>(.*?)</section>',
    HTML, re.S,
)
check(len(chapters) == 12, "exactly twelve chapters required")
check([int(n) for n, _, _ in chapters] == list(range(1, 13)),
      "chapter IDs must run consecutively from 1 to 12")
toc_match = re.search(
    r'<nav class="others-toc" aria-label="অধ্যায় তালিকা">(.*?)</nav>', HTML, re.S
)
toc = re.findall(r'<a href="#chapter-(\d+)">(.*?)</a>', toc_match.group(1), re.S) if toc_match else []
check([(n, plain(title)) for n, title in toc] ==
      [(n, plain(title)) for n, title, _ in chapters],
      "TOC chapter labels/anchors must match headings in the same order")
check("অধ্যায়সূচি — 12টি অধ্যায়" in HTML, "TOC count label changed")

all_paragraphs = []
counts = []
for n, title, body in chapters:
    paragraphs = [plain(p) for p in re.findall(r"<p>(.*?)</p>", body, re.S)]
    counts.append(len(paragraphs))
    all_paragraphs.extend(paragraphs)
    check(6 <= len(paragraphs) <= 11  # Expanded source-aware context is allowed, f"chapter {n}: abbreviated or mechanical paragraph count")
    check(all(len(p) >= 190 for p in paragraphs),
          f"chapter {n}: paragraph too short for substantive prose")
    check(not any("উৎস ও পরবর্তী পাঠ" in p or "পরের অধ্যায়ে" in p for p in paragraphs),
          f"chapter {n}: obsolete reading block or connective filler")

check(len(set(counts)) >= 3, "all chapters use an undifferentiated paragraph template")
check(len(all_paragraphs) == len(set(all_paragraphs)),
      "one or more full paragraphs were duplicated")
check(len(re.findall(r'<header class="others-book-title">.*?</header>', HTML, re.S)) == 1,
      "missing book heading")
check(len(re.findall(r"<h1>", HTML)) == 1, "book should have one h1")
check(len(re.findall(r"<title>", HTML)) == 1, "book must have one SEO title")
check('<html lang="bn">' in HTML, "Bengali language attribute missing")
check('rel="canonical" href="https://walid-ai.com/others/history/ashab-al-kahf/"' in HTML,
      "canonical URL incorrect")
check('<meta name="description"' in HTML, "SEO description missing")
check('href="/islam/quran/al-kahf/"' in HTML, "Quran primary text link missing")
check('href="https://www.iranicaonline.org/articles/ephesus/"' in HTML,
      "Seven Sleepers research attribution link missing")
check(HTML.count('class="legal-footer"') == 1, "footer must appear exactly once")
check(HTML.count('class="others-toc-dialog"') == 1, "chapter drawer missing or repeated")
check('class="others-toc-trigger"' in HTML and '/others/assets/reader.js' in HTML,
      "interactive chapter drawer script or trigger missing")
check('src="/walid-ai-approved-logo.png"' in HTML, "original Walid logo missing")
check('/others/assets/books.css' in HTML, "book stylesheet missing")
check(not re.search(r'class="others-(?:sources|next)"', HTML),
      "retired next-reading/source block restored")

# Ayah-to-chapter traceability: Quran 18:9-26 including 23-24 outside the story's action.
requirements = {
    1: ("৯ নম্বর আয়াতে", "১৩–১৫ নম্বর আয়াতে", "১৪ নম্বর আয়াতে"),
    2: ("১৬ নম্বর আয়াতে", "গুহায়"),
    3: ("১০ নম্বর আয়াতে", "১৮:১০", "আরবি", "বাংলা ভাবার্থ"),
    4: ("১১–১২ নম্বর আয়াতে", "১৭ নম্বর আয়াত", "১৮ নম্বর আয়াত", "কুকুর"),
    5: ("১৯ নম্বর আয়াতে", "দিন", "প্রতিপালক"),
    6: ("১৯ নম্বর আয়াতে", "২০ নম্বর আয়াতে", "রৌপ্য", "খাদ্য"),
    7: ("২১ নম্বর আয়াতে", "পুনরুত্থান"),
    8: ("২১ নম্বর আয়াতে", "উপাসনাস্থল"),
    9: ("২২ নম্বর আয়াতে", "তিনজন", "পাঁচজন", "সাতজন", "আর-রাকিম"),
    10: ("২৩–২৪ নম্বর আয়াতে", "২৫ নম্বর আয়াতে", "২৬ নম্বর আয়াতে",
         "সৌর", "চন্দ্র"),
    11: ("ডেসিয়ুস", "থিওডোসিয়ুস", "আটজন", "খ্রিস্টীয়"),
    12: ("এফেসাস", "আম্মান", "প্রত্ন", "আর-রাকিম"),
}
for i, tokens in requirements.items():
    if len(chapters) < i:
        continue
    body = plain(chapters[i - 1][2])
    for token in tokens:
        check(token in body, f"chapter {i}: missing source/chronology anchor {token}")

prayer = "رَبَّنَآ ءَاتِنَا مِن لَّدُنكَ رَحۡمَةٗ وَهَيِّئۡ لَنَا مِنۡ أَمۡرِنَا رَشَدٗا"
check(HTML.count(prayer) == 1, "Quran 18:10 prayer text altered or repeated")
check("স্বতন্ত্রভাবে রচিত" in HTML, "original Bengali paraphrase disclosure missing")
check("৩০০ বছরের সঙ্গে আরও নয়" in HTML, "time-interpretation boundary missing")
check("কিতমির" in HTML and "পরবর্তী" in HTML, "unverified dog name not contextualized")
check("আল্লাহ" in HTML and "তাফসির" in HTML, "Quran commentary boundaries missing")
check("পৃথক খ্রিস্টীয়" in HTML, "Christian material not distinguished")
check("নির্দিষ্ট" in HTML and "গুহা" in HTML,
      "site-identification uncertainty lost")

# Check internal routes and assets that this reader relies on.
for link in (
    "others/index.html", "others/history/index.html",
    "islam/quran/al-kahf/index.html", "walid-ai-approved-logo.png",
    "others/assets/books.css", "others/assets/reader.js", "walid-legal.css",
    "about-us/index.html", "contact-us/index.html",
    "privacy-policy/index.html", "terms-of-service/index.html",
):
    check((ROOT / link).is_file(), f"linked local route or asset missing: {link}")

css = (ROOT / "others/assets/books.css").read_text(encoding="utf-8")
check("SolaimanLipi" in css, "SolaimanLipi font fallback removed")
check("walid-ai-approved-flower.png" in css and "10s" in css,
      "Kathgolap background or animation changed")
check(".others-toc-dialog" in css, "responsive reader sidebar CSS missing")

if ERRORS:
    for error in ERRORS:
        print("FAIL:", error)
    raise SystemExit(1)
print(f"ASHAB_AL_KAHF_EDITORIAL_PASS: {len(chapters)} chapters, "
      f"{len(all_paragraphs)} paragraphs, all ayah/source and shell contracts checked")
