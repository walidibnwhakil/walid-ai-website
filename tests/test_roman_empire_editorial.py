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
    require(len(paragraphs) >= 9, f"chapter {chapter} is too short ({len(paragraphs)} paragraphs)")
    require(len(' '.join(paragraphs).split()) >= 500, f"chapter {chapter} has fewer than 500 words")
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
    1: ("রোমুলুস", "প্রজাতন্ত্র", "প্লেবিয়ান",),
    2: ("হ্যানিবাল", "স্কিপিও", "কার্থেজ", "১৪৬",),
    3: ("গ্রাক্কুস", "মারিয়ুস", "সুল্লা", "৭৮",),
    4: ("স্পার্টাকাস", "সিজার", "ক্লিওপেট্রা", "৪৪",),
    5: ("অগাস্টাস", "লিভিয়া", "আগ্রিপ্পা", "১৪",),
    6: ("টাইবেরিয়ুস", "জার্মানিকাস", "সেজানুস", "৩৭",),
    7: ("মেসালিনা", "ক্লডিয়ুস", "আগ্রিপিনা", "৪৮", "৫৪",),
    8: ("নেরো", "আগ্রিপিনা", "৫৯", "৬৪", "৬৮",),
    9: ("ভেসপাসিয়ান", "টাইটাস", "ডোমিশিয়ান", "৯৬",),
    10: ("নার্ভা", "ট্রাজান", "প্লোতিনা",),
    11: ("হাদ্রিয়ান", "সাবিনা", "প্লোতিনা", "বার কোখবা",),
    12: ("আন্তোনিনুস", "ভেরুস", "মার্কাস", "ফাউস্তিনা",),
    13: ("কমোডুস", "সেভেরুস", "জুলিয়া ডোমনা",),
    14: ("গেটা", "মায়েসা", "কারাকাল্লা",),
    15: ("জেনোবিয়া", "অরেলিয়ান", "ভ্যালেরিয়ান",),
    16: ("ডায়োক্লেটিয়ান", "টেট্রার্কি",),
    17: ("কনস্টান্টিন", "হেলেনা", "ফাউস্তা", "৩৩০",),
    18: ("জুলিয়ান", "কনস্টান্টিয়ুস",),
    19: ("ভ্যালেন্স", "গথ", "৩৭৮",),
    20: ("থিওডোসিয়ুস", "গাল্লা", "৩৯৫",),
    21: ("স্তিলিখো", "আলারিক", "৪১০",),
    22: ("প্লাসিদিয়া", "এতিয়ুস", "আত্তিলা", "৪৫৪",),
    23: ("মেজোরিয়ান", "রিসিমের", "ওদোআকর", "৪৭৬",),
    24: ("জাস্টিনিয়ান", "থিওদোরা", "হেরাক্লিয়ুস", "৬৪১",),
    25: ("১৪৫৩", "১২০৪", "১২৬১",),
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
print(f"ROMAN_EDITORIAL_PASS: {len(chapters)} chapters, {len(all_paragraphs)} paragraphs, {sum(len(p.split()) for p in all_paragraphs)} words, {len(toc)} TOC links")
