#!/usr/bin/env python3
"""Ali Baba editorial, story-continuity, and reader contract checks."""
import re
from pathlib import Path
from html import unescape

PATH = Path("others/islamic-literature/ali-baba/index.html")
html = PATH.read_text(encoding="utf-8")
sections = re.findall(r'<section class="others-chapter" id="(chapter-\d+)"><h2>(.*?)</h2>(.*?)</section>', html, re.S)
toc = re.findall(r'<li><a href="#(chapter-\d+)">(.*?)</a></li>', html)
expected = [f"chapter-{i}" for i in range(1, 13)]
assert [id for id, _, _ in sections] == expected, "Chapter IDs are absent, duplicate or out of order"
assert [id for id, _ in toc] == expected, "TOC links do not follow chapter order"
assert [title for _, title in toc] == [title for _, title, _ in sections], "TOC title drift"

def plain(fragment):
    return unescape(re.sub(r"<[^>]+>", " ", fragment))

chapter_texts = [plain(section) for _, _, section in sections]
for index, (_, title, body) in enumerate(sections, 1):
    count = len(re.findall(r"<p>", body))
    words = len(chapter_texts[index - 1].split())
    assert count >= 6, f"Chapter {index}: only {count} substantive paragraphs"
    assert words >= 275, f"Chapter {index}: only {words} words"
    assert not re.search(r"এই অধ্যায়|এই পর্বে|পাঠককে ভাবতে|পরবর্তী শেষ সংঘর্ষ", chapter_texts[index - 1]), f"Chapter {index}: editorial commentary in narration"
    assert not re.search(r"প্রচলিত কাহিনি|গালাঁ-সূত্রে|গালাঁ-ভিত্তিক|পুরোনো কাহিনির", chapter_texts[index - 1]), f"Chapter {index}: source aside interrupts narrative"

required = {
    1: ["কাসিম", "আলিবাবা", "চল্লিশজন"],
    2: ["সিমসিম", "গুহা", "সোনার"],
    3: ["মোম", "মুদ্রা", "কাসিম"],
    4: ["সংকেত", "দস্যু", "মৃত্যুর"],
    5: ["মরজিনা", "বাবা মুস্তফা", "চোখ"],
    6: ["সাদা চক", "দরজা", "দস্যু"],
    7: ["লাল", "উনিশটি খচ্চর", "সাঁইত্রিশ"],
    8: ["তেল ব্যবসায়ী", "কলসি", "চাপা গলায়"],
    9: ["ফুটন্ত তেল", "কলসি", "পালালেন"],
    10: ["খাজা হুসাইন", "দোকান", "পুত্র"],
    11: ["লবণ", "আবদাল্লা", "খঞ্জর"],
    12: ["মরজিনা", "বিবাহ", "গুহা"],
}
for chapter, terms in required.items():
    for term in terms:
        assert term in chapter_texts[chapter - 1], f"Chapter {chapter} missing story beat: {term}"

# Guard the source-consistent chronology, physical action, and plot closure.
assert sum(len(text.split()) for text in chapter_texts) >= 4200, "Book became unexpectedly thin"
assert "খুল যা সিমসিম" in chapter_texts[0] and "বন্ধ যা সিমসিম" in chapter_texts[0], "Chapter 1 must reveal both passwords before their use"
assert "চার খণ্ড" in chapter_texts[3], "Cassim’s fate needs to explain the stitching scene"
assert "চোখ-বাঁধা মুচি" in sections[4][1] and "মুচি" in chapter_texts[4], "Baba Mustafa is a blindfolded cobbler, not a blind tailor"
assert "কয়েক মাস পরে" in chapter_texts[4], "Robbers’ return should not happen only days after the burial"
assert "ডান হাতে খঞ্জর" in chapter_texts[10] and "বাঁ হাত" in chapter_texts[10], "Final dance requires two-hand continuity"
assert "কাসিমের বিধবাকে বিয়ে" in chapter_texts[4], "Chapter 5: missing Galland-derived family transition"
assert "আগের সেই তেল ব্যবসায়ীর" in chapter_texts[9], "Chapter 10: flashback timeline inconsistent"
assert "দস্যুনেতার দেহও" in chapter_texts[11], "Chapter 12: captain's burial missing"
assert "সম্মত হলেন।" in chapter_texts[11], "Chapter 12: Bengali punctuation regressed"
assert html.count('<footer class="legal-footer">') == 1, "Shared footer changed"
assert html.count('<a class="others-brand"') == 1, "Approved logo wrapper changed"
for fragment in [
    'src="/walid-ai-approved-logo.png"', 'others/assets/books.css',
    'others/assets/reader.js', 'rel="canonical" href="https://walid-ai.com/others/islamic-literature/ali-baba/"',
    'class="others-toc-trigger"', 'class="others-toc-dialog"',
    '/about-us/', '/contact-us/', '/privacy-policy/', '/terms-of-service/'
]:
    assert fragment in html, f"Reader contract changed: {fragment}"
assert not re.search(r'class="others-(?:next|sources)"|উৎস ও পরবর্তী পাঠ', html), "Removed source/next links returned"
assert 'কল্পকাহিনি, প্রামাণ্য ইতিহাস নয়' in html, "Folklore must not be framed as historical documentation"
assert '<script' in html and html.count("<article") == 1 and html.count("</article>") == 1
print("ALI_BABA_EDITORIAL_PASS: 12 chronological chapters, 12 TOC links, source-aligned detail and reader contracts intact.")
