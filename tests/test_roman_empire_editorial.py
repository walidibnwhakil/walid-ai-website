"""Focused editorial regression checks for the Roman Empire reader only."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "others/history/roman-empire/index.html"
content = PAGE.read_text(encoding="utf-8")

def require(condition, message):
    if not condition:
        raise AssertionError(message)

chapters = [
    (int(number), title, body)
    for number, title, body in re.findall(
        r'<section class="others-chapter" id="chapter-(\d+)">'
        r'<h2>(.*?)</h2>(.*?)</section>', content, re.S
    )
]
require(len(chapters) == 25, f"expected 25 fully edited chapters, got {len(chapters)}")
require([number for number, _, _ in chapters] == list(range(1, 26)), "chapter order or IDs wrong")
toc = [int(n) for n in re.findall(r'href="#chapter-(\d+)"', content)]
require(toc == list(range(1, 26)), "TOC anchors do not correspond to chapters")
require("অধ্যায়সূচি — ২৫টি অধ্যায়" in content, "TOC count is outdated")

all_paragraphs = []
for chapter, title, body in chapters:
    paragraphs = [
        re.sub(r'<[^>]+>', "", paragraph).strip()
        for paragraph in re.findall(r'<p>(.*?)</p>', body, re.S)
    ]
    require(len(paragraphs) >= 7, f"chapter {chapter} is too short ({len(paragraphs)} paragraphs)")
    require(sum(len(p) for p in paragraphs) >= 1300,
            f"chapter {chapter} is insufficiently developed")
    require(all(p and p != "undefined" for p in paragraphs),
            f"chapter {chapter} contains an empty or undefined paragraph")
    all_paragraphs.extend(paragraphs)

require(len(all_paragraphs) == len(set(all_paragraphs)),
        "a long paragraph has been duplicated between chapters")
require("সতেরো বছরের নিরো" not in content, "historically incorrect age of Nero")
require("এই অধ্যায়ে" not in content and "এই অধ্যায়ে" not in content,
        "editorial meta-narration remains in the prose")
require("href=\"https://walid-ai.com/others/history/roman-empire/\"" in content,
        "canonical URL changed")
require(content.count('class="legal-footer"') == 1, "book must use exactly one shared footer")
require('/walid-ai-approved-logo.png' in content, "approved logo absent")
require('/others/assets/books.css' in content and '/others/assets/reader.js' in content,
        "shared typography or chapter navigation lost")
require('class="others-sources"' not in content and 'class="others-next"' not in content,
        "retired source/next blocks returned")
require("Walid AI reading library" not in content, "retired editorial branding returned")

expect = {
    5: ("অগাস্টাস", "লিভিয়া", "আগ্রিপ্পা"),
    7: ("ক্লডিয়ুস", "আগ্রিপিনা"),
    8: ("নেরো", "আগ্রিপিনা", "৫৯", "৬৪"),
    13: ("সেভেরুস", "জুলিয়া ডোমনা"),
    14: ("গেটা", "জুলিয়া মায়েসা"),
    15: ("ভ্যালেরিয়ান", "জেনোবিয়া", "অরেলিয়ান"),
    16: ("ডায়োক্লেটিয়ান", "টেট্রার্কি"),
    17: ("কনস্টান্টিন", "নাইসিয়া", "৩৩০"),
    21: ("স্তিলিখো", "আলারিক", "৪১০"),
    22: ("প্লাসিদিয়া", "এতিয়ুস", "৪৫১"),
    23: ("মেজোরিয়ান", "রিসিমের", "ওদোআকর", "৪৭৬"),
    24: ("জাস্টিনিয়ান", "থিওডোরা", "হেরাক্লিয়ুস"),
    25: ("১২০৪", "১২৬১", "১৪৫৩"),
}
for number, terms in expect.items():
    text = chapters[number-1][1] + chapters[number-1][2]
    require(all(term in text for term in terms),
            f"chapter {number} does not integrate its historical subjects")
titles = [title for _, title, _ in chapters]
require(not any("সম্রাজ্ঞী, রাজমাতা ও ক্ষমতার উত্তরাধিকার" in t for t in titles),
        "disconnected empress appendix was restored")
require(not any("পশ্চিম সাম্রাজ্যের শেষ সেনাপতিরা" in t for t in titles),
        "disconnected generals appendix was restored")
print(f"ROMAN_EDITORIAL_PASS: {len(chapters)} chapters, {len(all_paragraphs)} paragraphs, {len(toc)} TOC links")
