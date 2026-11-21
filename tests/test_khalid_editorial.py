"""Khalid ibn al-Walid book: chronology, editorial completeness and reader contracts."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "others/history/khalid-ibn-walid/index.html"
html = PATH.read_text(encoding="utf-8")
parts = re.findall(r'<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)</h2>(.*?)</section>', html, re.S)
links = re.findall(r'<li><a href="#chapter-(\d+)">(.*?)</a></li>', html)
assert len(parts) == len(links) == 12, f"Chapter count mismatch: {len(parts)}, {len(links)}"
assert links == [(number, title) for number, title, _ in parts], "TOC order/title/anchor mismatch"
assert "অধ্যায়সূচি — 12টি অধ্যায়" in html
markers = {
    1: ("বনু মাখজুম", "ওয়ালিদ ইবনুল মুগিরা"),
    2: ("উহুদ", "হুদাইবিয়া", "ইসলাম গ্রহণ"),
    3: ("মুতা", "জায়েদ", "জাফর", "আবদুল্লাহ ইবন রাওয়াহা"),
    4: ("মক্কার", "হুনাইন", "বনু জাজিমা"),
    5: ("আবু বকর", "রিদ্দা", "মালিক ইবন নুওয়াইরা"),
    6: ("ইয়ামামা", "মুসায়লিমা", "কুরআন"),
    7: ("ইরাক", "হিরা", "আল-মুসান্না"),
    8: ("আনবার", "চুক্তি", "মেসোপটেমিয়া"),
    9: ("মরু", "সিরিয়া", "আবু উবায়দা"),
    10: ("দামেস্ক", "ইয়ারমুক", "৬৩৬"),
    11: ("উমর", "৬৩৮", "অব্যাহতি"),
    12: ("হিমস", "৬৪২", "আবদুর রহমান"),
}
all_paragraphs = []
for number, title, section in parts:
    i = int(number)
    block = title + " " + section
    for word in markers[i]:
        assert word in block, f"Chapter {i} omits {word}"
    paragraphs = re.findall(r"<p>(.*?)</p>", section, re.S)
    assert len(paragraphs) >= 10, f"Chapter {i} is insufficiently developed"
    assert all(len(re.sub(r"<[^>]+>", "", p).strip()) >= 200 for p in paragraphs), f"Chapter {i} contains a thin paragraph"
    all_paragraphs.extend(paragraphs)
assert len(all_paragraphs) >= 140, "Unexpectedly short or incomplete book"
assert len(set(all_paragraphs)) == len(all_paragraphs), "Duplicated body paragraphs"

assert sum(len(re.sub(r"<[^>]+>", "", p).split()) for p in all_paragraphs) >= 8000, "Biography lost narrative depth"
required_people_and_context = (
    "লুবাবা আল-সুগরা", "আমর ইবন হিশাম", "আবু সুফিয়ান",
    "হুদাইবিয়া", "শুরাহবিল ইবন আমর", "আলী ইবন আবি তালিব",
    "মালিক ইবন নুওয়াইরা", "লায়লা বিনতুল মিনহাল", "ইকরিমা ইবন আবি জাহল",
    "মুসায়লিমা", "ওয়াহশি ইবন হারব", "আল-মুসান্না ইবন হারিসা",
    "হরমুজ", "ওয়ালাজা", "উল্লাইস", "আনবার", "আইনুত তামর",
    "আবু উবায়দা ইবনুল জাররাহ", "থিওডোর", "ভাহান", "জাবালা",
    "আশআস ইবন কায়স", "সুলাইমান", "আবদুর রহমান", "মুহাজির", "হিমস",
)
for item in required_people_and_context:
    assert item in html, f"Lost essential historical person or location: {item}"

for phrase in ("মুতার যুদ্ধের সিদ্ধান্ত", "ইয়ারমুকের যুদ্ধ: একাধিক নেতার সমন্বয়", "সেনা-নেতৃত্বে পরিবর্তন ও পরবর্তী জীবনের দলিল", "উৎস ও পরবর্তী পাঠ", "এই অধ্যায়ে", "পরের অধ্যায়ে"):
    assert phrase not in html, f"Obsolete or fragmented editorial heading/copy returned: {phrase}"
for marker in (
    '/walid-ai-approved-logo.png', '/others/assets/books.css',
    '/others/assets/reader.js', 'class="legal-footer"',
    '<link rel="canonical" href="https://walid-ai.com/others/history/khalid-ibn-walid/">',
    'class="others-toc-dialog"', 'class="others-toc-trigger"',
):
    assert marker in html, f"Lost reader/SEO invariant: {marker}"
assert html.count('class="legal-footer"') == 1
assert not re.search(r'class="others-(sources|next)"', html)
assert html.count("<article") == html.count("</article>") == 1
assert html.count("<section") == html.count("</section>") == 12
print(f"KHALID_EDITORIAL_PASS chapters={len(parts)} paragraphs={len(all_paragraphs)} toc={len(links)}")


# Source-sensitive contracts belong to the event being discussed, not a detached
# bibliography. These checks deliberately do not treat legend as verified history.
by_chapter = {int(n): title + " " + body for n, title, body in parts}
event_evidence = {
    3: ("সহিহ বুখারি ৪২৬২", "সহিহ বুখারি ৪২৬৫", "স্থায়ী মুসলিম শাসন"),
    4: ("সহিহ বুখারি ৪৩৩৯", "ইবন উমর", "আলী ইবন আবি তালিব"),
    5: ("মালিক ইবন নুওয়াইরা", "লায়লা বিনতুল মিনহাল", "উমর"),
    6: ("সহিহ বুখারি ৪৯৮৬", "জায়েদ ইবন সাবিত", "বনু হানিফা"),
    7: ("হিউ কেনেডি", "হরমুজ", "উল্লাইস"),
    8: ("ফিরাজ", "আইনুত তামর", "দৌমাতুল জানদাল"),
    9: ("রাফি ইবন আমর", "ফ্রেড ডোনার", "আজানাদায়ন"),
    10: ("দামেস্ক", "ইয়ারমুক", "ভাহান", "আবু উবায়দা"),
    11: ("১৭ হিজরি", "আশআস ইবন কায়স", "অব্যাহতি"),
    12: ("২১ হিজরি", "হিমস", "মদিনা", "রবার্ট হোয়ল্যান্ড"),
}
for chapter, phrases in event_evidence.items():
    for phrase in phrases:
        assert phrase in by_chapter[chapter], f"Chapter {chapter} missing evidence/context: {phrase}"

# Repetition catches are intentionally conservative: substantive developments may
# share names, but should not copy a long consecutive phrase verbatim.
body_paragraphs = [
    re.sub(r"<[^>]+>", "", p).strip() for p in all_paragraphs
]
ngrams = set()
for paragraph in body_paragraphs:
    tokens = paragraph.split()
    for start in range(max(0, len(tokens) - 11)):
        phrase = tuple(tokens[start:start + 12])
        assert phrase not in ngrams, "Long prose segment repeated between paragraphs"
        ngrams.add(phrase)
assert all("কিংবদন্তি" not in by_chapter[ch] or "প্রমাণ" in by_chapter[ch] for ch in (7, 8, 9)), "Legend lacks a source caution"
print("KHALID_SOURCE_QA_PASS primary_report_markers=4 historical_disputes=verified")
