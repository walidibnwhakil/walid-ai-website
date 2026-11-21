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
    assert len(paragraphs) >= 5, f"Chapter {n}: too few paragraphs"
    assert all(len(re.sub(r"<[^>]+>", "", p).strip()) >= 170 for p in paragraphs), f"Chapter {n}: stub paragraph"
assert html.count('class="legal-footer"') == 1, "Shared footer missing or doubled"
assert '<link rel="canonical" href="https://walid-ai.com/others/history/napoleon/">' in html
assert 'walid-ai-approved-logo.png' in html and '20261121-solaiman' in html
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
