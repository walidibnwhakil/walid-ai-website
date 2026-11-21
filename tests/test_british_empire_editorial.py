"""Focused regression checks for the British Empire history reader.

Run from the repository root: python3 tests/test_british_empire_editorial.py
This file deliberately inspects only one book.
"""
from html import unescape
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / "others/history/british-empire/index.html"
HTML = BOOK.read_text(encoding="utf-8")


def check(condition, message):
    if not condition:
        raise AssertionError(message)


sections = re.findall(
    r'<section class="others-chapter" id="chapter-(\d+)">(.*?)</section>',
    HTML, re.DOTALL,
)
links = re.findall(r'<a href="#chapter-(\d+)">(.*?)</a>', HTML, re.DOTALL)
expected = [str(n) for n in range(1, 22)]
check([n for n, _ in sections] == expected, "21 chronological chapters, numbered 1–21, required")
check([n for n, _ in links] == expected, "every TOC chapter link must match a chapter")
for (section_num, body), (_, toc_title) in zip(sections, links):
    heading = re.search(r"<h2>(.*?)</h2>", body, re.DOTALL)
    check(heading is not None, f"chapter {section_num}: heading absent")
    check(unescape(heading.group(1)) == unescape(toc_title),
          f"chapter {section_num}: TOC title differs")
    check(len(re.findall(r"<p>", body)) >= 5, f"chapter {section_num}: too few paragraphs")

titles = [re.search(r"<h2>(.*?)</h2>", body).group(1) for _, body in sections]
check("১৭২৭–১৭৬০" in titles[10] and "পলাশী" in titles[10], "Plassey in George II reign")
check("১৭৬০–১৮২০" in titles[11] and "দেওয়ানি" in titles[11], "Diwani in George III reign")
check("১৮৩৭–১৯০১" in titles[14] and "ব্রিটিশ রাজ" in titles[14], "Crown Raj in Victoria reign")
check("১৯০১–১৯১০" in titles[15] and "বঙ্গভঙ্গ" in titles[15], "Bengal partition in Edward VII reign")
check("১৯৩৬–১৯৫২" in titles[18] and "দুর্ভিক্ষ" in titles[18], "1943 famine in George VI reign")
check("২০২২–বর্তমান" in titles[-1], "modern constitutional monarchy must end book")

for chapter_num, lead in ((6, "১৬৩০ সালে জন্ম"), (15, "১৮১৯ সালে জন্ম"),
                          (17, "১৮৬৫ সালে জন্ম"), (20, "১৯২৬ সালে জন্ম")):
    first = re.search(r"<p>(.*?)</p>", sections[chapter_num - 1][1], re.DOTALL)
    check(first is not None and first.group(1).startswith(lead),
          f"chapter {chapter_num}: reign biography must precede later-era context")

check(sections[18][1].count("১৯৪৮ সালে বার্মা ও সিলন স্বাধীন") == 1,
      "George VI narrative must not repeat 1948 independence transition")

required = {
    2: ("১৬০০",),
    6: ("রয়্যাল আফ্রিকান", "১৬৭২"),
    11: ("২৩ জুন ১৭৫৭", "সিরাজউদ্দৌলা", "মীর জাফর"),
    12: ("১৭৬৪", "১৭৬৫", "১৭৬৯–৭০", "১৭৯৩", "১৮০৭"),
    14: ("১৮৩৩", "১৮৩৪", "১৮৩৮"),
    15: ("১৮৫৭", "১৮৫৮", "লক্ষ্মীবাই", "হাজরত মহল", "নীলবিদ্রোহ"),
    16: ("১৯০৫", "স্বদেশি"),
    17: ("১৯১১", "১৯১৯", "১৯৩০", "১৯৩৫"),
    19: ("১৯৪৩", "১৯৪৭", "পাকিস্তান", "ভারত"),
    20: ("১৯৫৬", "১৯৯৭", "কমনওয়েলথ"),
    21: ("সাংবিধানিক", "স্বাধীন"),
}
for number, terms in required.items():
    body = sections[number - 1][1]
    for term in terms:
        check(term in body, f"chapter {number}: missing period-relevant {term}")

check('href="https://walid-ai.com/others/history/british-empire/"' in HTML,
      "canonical URL changed")
check('src="/walid-ai-approved-logo.png"' in HTML, "approved logo changed")
check('/others/assets/books.css' in HTML, "reader stylesheet missing")
check('/others/assets/reader.js' in HTML, "reader sidebar JavaScript missing")
check(HTML.count('class="legal-footer"') == 1, "shared footer changed or duplicated")
check('class="others-toc-dialog"' in HTML, "TOC dialog missing")
check(not re.search(r'class="others-(sources|next)"', HTML),
      "removed source or related-book panel restored")
check(not re.search(r'href="#chapter-(22|23|24|25|26|27)"', HTML),
      "retired out-of-chronology chapter links still visible")
print("BRITISH_EMPIRE_EDITORIAL_PASS: 21 chapters, 21 TOC links, chronology and shell")
