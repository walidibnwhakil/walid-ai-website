"""Focused regression contract for the Ramayana reader; no other book is edited."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
FILE = ROOT / "others/folklore/ramayana/index.html"
html = FILE.read_text(encoding="utf-8")

def verify():
    sections = re.findall(
        r'<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)</h2>(.*?)</section>',
        html, re.S)
    assert len(sections) == 41, f"Expected 41 chapters, found {len(sections)}"
    assert [int(s[0]) for s in sections] == list(range(1, 42)), "Chapter IDs out of order"
    links = re.findall(r'<li><a href="#chapter-(\d+)">(.*?)</a></li>', html)
    assert links == [(n, title) for n, title, _ in sections], "TOC links or titles diverge"

    seen = set()
    for n, title, section in sections:
        paras = [re.sub(r"<[^>]+>", "", p).strip()
                 for p in re.findall(r"<p>(.*?)</p>", section, re.S)]
        assert len(paras) >= 6, f"Chapter {n} too abbreviated: {len(paras)} paragraphs"
        assert sum(map(len, paras)) >= 1450, f"Chapter {n} lost essential detail"
        for p in paras:
            assert len(p) >= 140, f"Chapter {n} contains a thin paragraph"
            assert p not in seen, f"Repeated full paragraph: {n}"
            seen.add(p)

    required = {
        2: ("দশরথ", "কৌশল্যা", "কৈকেয়ী", "সুমিত্রা"),
        5: ("সীতা", "উর্মিলা", "মাণ্ডবী", "শ্রুতকীর্তি"),
        7: ("মন্থরা", "বর"), 9: ("সীতা", "উর্মিলা"),
        11: ("দশরথ", "ভরত"), 12: ("পাদুকা", "নন্দীগ্রাম"),
        15: ("শূর্পণখা", "রাবণ"), 16: ("মারীচ", "লক্ষ্মণরেখা"),
        18: ("কাবন্ধ", "শবরী"), 20: ("বালি", "তারা"),
        21: ("রুমা", "অঙ্গদ"), 22: ("সম্পাতি", "হনুমান"),
        24: ("মন্দোদরী", "অশোকবন"), 25: ("আংটি", "চূড়ামণি"),
        26: ("অক্ষকুমার", "বিভীষণ"), 28: ("মন্দোদরী", "বিভীষণ"),
        29: ("নল", "অঙ্গদ", "অকালবোধন"),
        30: ("ইন্দ্রজিৎ", "নাগপাশ"), 31: ("প্রহস্ত", "রাবণ"),
        32: ("কুম্ভকর্ণ", "মৃত্যু"), 33: ("অতিকায়", "ঔষধি"),
        34: ("নিকুম্ভিলা", "ইন্দ্রজিৎ"), 35: ("মন্দোদরী", "বিলাপ"),
        36: ("বিভীষণ", "অগ্নি"), 37: ("ভরত", "অভিষেক"),
        38: ("সীতা", "নির্বাসন"), 39: ("লব", "কুশ", "শম্বূক"),
        40: ("অশ্বমেধ", "সীতা"), 41: ("লক্ষ্মণ", "সরযূ"),
    }
    for n, terms in required.items():
        body = sections[n - 1][2]
        for term in terms:
            assert term in body, f"Chapter {n} lost key event or character: {term}"

    boundaries = {
        1: "কবির প্রশ্ন", 7: "সিংহাসনের প্রস্তুতি",
        13: "দণ্ডকারণ্য", 19: "সুগ্রীবের নির্বাসন",
        23: "হনুমানের যাত্রা", 28: "রাবণের সভা",
        38: "উত্তরকাণ্ডের নতুন সংকট", 41: "রামের প্রস্থান",
    }
    for index, title_phrase in boundaries.items():
        assert title_phrase in sections[index - 1][1], f"Book period boundary drift at {index}"

    for token in (
        '<html lang="bn">', '/walid-ai-approved-logo.png',
        '/others/assets/books.css', '/others/assets/reader.js',
        'href="https://walid-ai.com/others/folklore/ramayana/"',
        'class="others-toc-dialog"', 'class="others-toc-trigger"',
        '<footer class="legal-footer">',
        'href="/about-us/"', 'href="/contact-us/"',
        'href="/privacy-policy/"', 'href="/terms-of-service/"',
    ):
        assert token in html, f"Reader chrome/SEO invariant missing: {token}"
    assert html.count('class="legal-footer"') == 1
    assert html.count('class="others-toc-dialog"') == 1
    assert 'name="robots" content="noindex"' not in html
    for prohibited in ("উৎস ও পরবর্তী পাঠ", "এই অধ্যায়", "পরের অধ্যায়ে",
                       'class="others-sources"', 'class="others-next"'):
        assert prohibited not in html, f"Orphan editorial/source block: {prohibited}"
    print("RAMAYANA_EDITORIAL_PASS: 41 detailed, linked, chronological chapters; style/footer/SEO intact.")

if __name__ == "__main__":
    verify()
