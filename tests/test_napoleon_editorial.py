"""Napoleon reader-specific editorial and structure regression checks."""
from html.parser import HTMLParser
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "others/history/napoleon/index.html"
html = PATH.read_text(encoding="utf-8")

class ReaderParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.issues = []
        self.open_sections = 0
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "section" and attrs.get("class") == "others-chapter":
            self.open_sections += 1
        if tag == "a" and attrs.get("href", "").startswith("#chapter-"):
            if attrs["href"][1:] not in ids:
                self.issues.append("Broken TOC link: " + attrs["href"])

sections = re.findall(r'<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)</h2>(.*?)</section>', html, re.S)
ids = {f"chapter-{n}" for n, _, _ in sections}
expected = [str(i) for i in range(1, 18)]
assert [n for n, _, _ in sections] == expected, "Napoleon chapter numbering changed or is incomplete"
links = re.findall(r'href="#chapter-(\d+)"', html)
assert links == expected, "TOC does not match Napoleon chapters"
assert len({title for _, title, _ in sections}) == 17, "Repeated chapter titles"
for n, title, body in sections:
    paragraphs = re.findall(r"<p>(.*?)</p>", body, re.S)
    assert len(paragraphs) >= 11, f"Chapter {n}: incomplete extended history"
    assert all(len(re.sub(r"<[^>]+>", "", p).strip()) >= 170 for p in paragraphs), f"Chapter {n}: stub paragraph"
assert html.count('class="legal-footer"') == 1, "Shared footer missing or doubled"
assert '<link rel="canonical" href="https://walid-ai.com/others/history/napoleon/">' in html
assert 'walid-ai-approved-logo.png' in html and '20261122-symbols' in html
assert '/others/assets/reader.js' in html and '/others/assets/books.css' in html
assert 'class="others-sources"' not in html and 'class="others-next"' not in html
assert "১৮৩২ সালে" not in "".join(body for _, _, body in sections[:16]), "Future family outcome moved earlier"
assert "১৮৪০ সালে" not in "".join(body for _, _, body in sections[:16]), "Retrospective ending moved earlier"
must_appear = [
    (1, "করসিকা"), (2, "তুলোঁ"), (3, "জোসেফিন"), (4, "আবুকির"),
    (5, "ব্রুমেয়ারে"), (6, "হাইতির"), (7, "সিভিল কোড"), (8, "অস্টারলিৎস"),
    (9, "টিলসিটে"), (10, "জোসেফকে"), (11, "ভাগ্রামের"), (12, "মারি লুইজ"),
    (13, "বোরোদিনোর"), (14, "লাইপজিগের"), (15, "এলবা"), (16, "ওয়াটারলু"),
    (17, "সেন্ট হেলেনা")
]
for n, phrase in must_appear:
    assert phrase in sections[n - 1][2], f"Chapter {n}: missing historical milestone {phrase}"

parser = ReaderParser()
parser.feed(html)
parser.close()
assert parser.open_sections == 17 and not parser.issues, parser.issues
print(f"NAPOLEON_EDITORIAL_PASS chapters={len(sections)} paragraphs={sum(len(re.findall('<p>', s[2])) for s in sections)}")


# Deep editorial follow-up: protect the long-form rewrite from accidental truncation.
chapter_paragraphs = [re.findall(r"<p>(.*?)</p>", body, re.S) for _, _, body in sections]
assert sum(map(len, chapter_paragraphs)) >= 220, "The long-form Napoleon history was unexpectedly reduced"
assert len(html) > 95000, "Long-form chapter text was truncated"
assert len({re.sub(r"<[^>]+>", "", p).strip() for part in chapter_paragraphs for p in part}) == sum(map(len, chapter_paragraphs)), "Repeated full paragraph"
chapter_text = [re.sub(r"<[^>]+>", "", sec[2]) for sec in sections]
coverage = {
    1: ("কার্লো", "লেতিসিয়া", "পাওলি", "ব্রিয়েনে"),
    2: ("তুলোঁ", "ভঁদেমিয়ের", "বারাস"),
    3: ("মান্তুয়া", "রিভোলি", "জোসেফিন"),
    4: ("নেলসন", "আক্রে", "রোজেটা", "আবুকির"),
    5: ("ব্রুমেয়ারে", "কাম্বাসেরেস", "ফুশে"),
    6: ("গুয়াদেলুপ", "সাঁ-দোমিঙ্গ", "দেসালিন", "লুইজিয়ানা"),
    7: ("সিভিল কোড", "পোর্তালিস", "জোসেফিন"),
    8: ("উলম", "ট্রাফালগার", "অস্টারলিৎস", "সুল্ট"),
    9: ("জেনা", "আউয়ারশ্টেড্ট", "আইলাউ", "ফ্রিডল্যান্ড"),
    10: ("বাইলেন", "তালাভেরা", "জোসেফ", "গেরিলা"),
    11: ("আস্পার্ন", "ভাগ্রাম", "জোসেফিন"),
    12: ("মারি লুইজ", "তোরেস ভেদ্রাস", "নেপোলিয়ন ফ্রাঁসোয়া"),
    13: ("স্মোলেনস্ক", "বোরোদিনো", "বেরেজিনা", "সালামাঙ্কা"),
    14: ("লাইপজিগ", "ভিতোরিয়া", "ফঁতেনব্লো", "মারমোঁ"),
    15: ("এলবা", "শত দিবস", "নেপোলিয়ন"),
    16: ("লিনি", "কাত্র-ব্রা", "গ্রুশি", "ওয়াটারলু"),
    17: ("সেন্ট হেলেনা", "১৮৪৮", "১৮৪০", "আর্সেনিক")
}
for ch, phrases in coverage.items():
    for phrase in phrases:
        assert phrase in chapter_text[ch - 1], f"Chapter {ch}: missing {phrase}"
assert "১৮১২ সালে সালামাঙ্কার" not in chapter_text[9], "1812 Salamanca leaked into 1808-09 chapter"
assert "১৮১৩ সালের জুনে স্পেনের ভিতোরিয়া" in chapter_text[13], "1813 Iberian theatre not sequenced correctly"
assert "১৮৪৮ সালে" not in "".join(chapter_text[:16]), "1848 outcome leaked before the posthumous legacy"
assert html.count('href="#chapter-') == 17 and html.count('class="legal-footer"') == 1
assert "others-sources" not in html and "others-next" not in html
print("NAPOLEON_LONG_FORM_PASS", {"chapters": len(sections), "paragraphs": sum(map(len, chapter_paragraphs)), "checks": len(coverage)})


# Chapter-level narrative QA: enforce the sequence of *developed* scenes, not
# only the appearance of names somewhere in a chapter. The published reader
# deliberately contains no obsolete sources/next-reading block.
def paragraph_position(chapter, anchor):
    paragraphs = chapter_paragraphs[chapter - 1]
    positions = [i for i, paragraph in enumerate(paragraphs) if anchor in paragraph]
    assert positions, f"Chapter {chapter}: missing scene anchor {anchor}"
    return positions[0]


chronological_scenes = {
    14: (
        "১৮১৩ সালের জুনে স্পেনের ভিতোরিয়া",
        "ল্যুটজেন ও বাউটজেনে ফরাসিরা",
        "লাইপজিগের প্রথম দিন",
        "৩১ মার্চ ১৮১৪",
        "৪ এপ্রিল পুত্রের পক্ষে",
        "মে ১৮১৪-তে নেপোলিয়ন এলবায়",
    ),
    16: (
        "১৫ জুন ফরাসি বাহিনী",
        "লিনিতে ব্লুশার",
        "১৭ জুন ওয়েলিংটন",
        "১৮ জুন ওয়াটারলুতে",
        "২২ জুন ১৮১৫",
        "ব্রিটিশরা নেপোলিয়নকে",
    ),
    17: (
        "৫ মে ১৮২১",
        "১৮৩২ সালে",
        "১৮৪০ সালে রাজা লুই-ফিলিপের",
        "১৮৪৮ সালের",
        "২ ডিসেম্বর ১৮৫২",
    ),
}
for chapter, anchors in chronological_scenes.items():
    positions = [paragraph_position(chapter, anchor) for anchor in anchors]
    assert positions == sorted(positions) and len(set(positions)) == len(positions), (
        f"Chapter {chapter}: premature aftermath or repeated historical scenes: {positions}"
    )

historical_precision = {
    3: ("সিসালপাইন প্রজাতন্ত্র", "রিভোলি", "ক্যাম্পো ফর্মিও"),
    6: ("২০ মে ১৮০২", "তুসাঁ", "দেসালিন", "বারবে-মারবোয়া"),
    7: ("পোর্তালিস", "সিভিল কোড", "জোসেফিন", "নারীর"),
    8: ("প্রেসবুর্গ", "ট্রাফালগার", "প্রাতসেন"),
    10: ("জুলি ক্লারি", "ক্যাথারিন", "এলিজা", "ক্যারোলিন", "পলিন", "লুসিয়েন"),
    11: ("আস্পার্ন-এসলিং", "ম্যাকডোনাল্ড", "দাভু", "শঁব্রুন"),
    12: ("বার্নাদোৎ", "নেপোলিয়ন ফ্রাঁসোয়া", "তোরেস ভেদ্রাস"),
    13: ("চিচাগভ", "বেরেজিনা", "সালামাঙ্কা", "স্মোলেনস্ক"),
    16: ("ওয়েলিংটন", "ব্লুশার", "গ্রুশি", "দ্যেরলঁ", "মুরা", "পিৎজো"),
    17: ("আর্সেনিক", "ক্যানসার", "১৮৬১", "তৃতীয় নেপোলিয়ন", "পারমা", "১৮৪৭", "১৮১৬"),
}
for chapter, anchors in historical_precision.items():
    for anchor in anchors:
        assert anchor in chapter_text[chapter - 1], (
            f"Chapter {chapter}: source-checked context lost: {anchor}"
        )
assert html.count('class="legal-footer"') == 1
assert html.count('class="others-toc-dialog"') == 1
assert "উৎস ও পরবর্তী পাঠ" not in html
print("NAPOLEON_CHRONOLOGY_QA_PASS", {
    "scenes": sum(map(len, chronological_scenes.values())),
    "historical_contexts": sum(map(len, historical_precision.values())),
})
