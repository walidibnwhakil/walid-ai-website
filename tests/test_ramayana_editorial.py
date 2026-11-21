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
        assert len(paras) >= 10, f"Chapter {n} too abbreviated: {len(paras)} paragraphs"
        assert sum(map(len, paras)) >= 3000, f"Chapter {n} lost essential detail"
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
    # Character biographies, relationships and battle source sequence must remain readable.
    expanded = {
        2: ("বশিষ্ঠ", "সুমন্ত্র", "কৌশল্যা", "কৈকেয়ী", "সুমিত্রা"),
        3: ("বিশ্বামিত্র", "বশিষ্ঠ", "তাড়কা", "মারীচ"),
        4: ("গৌতম", "অহল্যা", "ইন্দ্র", "জনক"),
        5: ("উর্মিলা", "মাণ্ডবী", "শ্রুতকীর্তি", "কুশধ্বজ"),
        6: ("পরশুরাম", "জমদগ্নি", "রেণুকা"),
        7: ("মন্থরা", "কৈকেয়ী", "দশরথ"),
        9: ("উর্মিলা", "লক্ষ্মণ", "সীতা"),
        14: ("অগস্ত্য", "জটায়ু", "সম্পাতি"),
        15: ("পুলস্ত্য", "বিশ্রবা", "কৈকসী", "সুমালী",
             "কুবের", "মন্দোদরী", "বিভীষণ", "কুম্ভকর্ণ", "ইন্দ্রজিৎ"),
        16: ("মারীচ", "সীতা", "লক্ষ্মণরেখা"),
        19: ("অঞ্জনা", "কেশরী", "বায়ু", "ইন্দ্র", "বজ্র", "হনুমান"),
        20: ("বালি", "তারা", "অঙ্গদ", "রুমা"),
        21: ("সুগ্রীব", "জাম্ববান", "তারা"),
        22: ("জাম্ববান", "সম্পাতি", "সূর্য", "অঞ্জনা"),
        24: ("অশোকবন", "ত্রিজটা", "মন্দোদরী"),
        28: ("বিভীষণ", "মাল্যবান", "ইন্দ্রজিৎ", "মন্দোদরী"),
        29: ("নল", "নীল", "অঙ্গদ", "অকালবোধন"),
        30: ("নাগপাশ", "গরুড়", "ত্রিজটা"),
        31: ("প্রহস্ত", "রাবণ", "নীল"),
        32: ("কুম্ভকর্ণ", "বিভীষণ", "রাবণ", "সুগ্রীব"),
        33: ("অতিকায়", "ব্রহ্মাস্ত্র", "সুষেণ", "জাম্ববান"),
        34: ("নিকুম্ভিলা", "লক্ষ্মণ", "ইন্দ্রজিৎ", "বিভীষণ"),
        35: ("মন্দোদরী", "মাতলি", "অগস্ত্য", "আদিত্যহৃদয়"),
        36: ("বিভীষণ", "সীতা", "হনুমান", "অগ্নিদেব"),
        38: ("ভদ্র", "লক্ষ্মণ", "সীতা", "বাল্মীকি"),
        39: ("লবণ", "শত্রুঘ্ন", "শম্বূক", "লব", "কুশ"),
        40: ("অশ্বমেধ", "বাল্মীকি", "সীতা"),
        41: ("তক্ষশিলা", "পুষ্কল", "চন্দ্রকেতু", "লক্ষ্মণ", "সরযূ"),
    }
    for n, terms in expanded.items():
        for term in terms:
            assert term in sections[n - 1][2], f"Chapter {n} lost deep context: {term}"

    assert html.count('class="ramayana-variants"') == 1
    assert html.index('class="ramayana-variants"') > html.index('id="chapter-41"')
    assert "মহীরাবণ" in html and "আদিত্যহৃদয়" in html
    assert "কৃত্তিবাসী" in html and "বাল্মীকি" in html
    assert "<summary" in html and "</details>" in html

    stylesheet = (ROOT / "others/assets/books.css").read_text(encoding="utf-8")
    for signature in ("SolaimanLipi", "others-flower-spin", "/walid-ai-approved-flower.png"):
        assert signature in stylesheet, f"Missing shared design invariant: {signature}"

    # Distinct military and family turning points must be told in actual scene order.
    # Word-count checks alone cannot detect late repetitions or reversed episodes.
    paragraphs_by_chapter = {
        int(number): [re.sub(r"<[^>]+>", "", p).strip()
                      for p in re.findall(r"<p>(.*?)</p>", body, re.S)]
        for number, _, body in sections
    }

    def require_scene_order(chapter, *phrases):
        indices = []
        for phrase in phrases:
            hits = [i for i, paragraph in enumerate(paragraphs_by_chapter[chapter])
                    if phrase in paragraph]
            assert hits, f"Ramayana chapter {chapter} lost narrative scene: {phrase}"
            indices.append(hits[0])
        assert indices == sorted(indices) and len(set(indices)) == len(indices), (
            f"Ramayana chapter {chapter} has overlapping/reversed scenes: {phrases}"
        )

    require_scene_order(37, "নন্দীগ্রামে ভরত তখনও", "হনুমান প্রথমে গঙ্গার ধারে",
                        "নন্দীগ্রামে এসে হনুমান", "ভরতের নির্দেশে অযোধ্যায় দূত")
    require_scene_order(35, "রাবণ বিভীষণকে লক্ষ্য করে", "মাতলি রামের কাছে পৌঁছান",
                        "রাবণ রণক্ষেত্রে নিহত হন")
    require_scene_order(36, "সীতা লক্ষ্মণকে আগুনের চিতা", "সীতা অগ্নিতে প্রবেশ করলে")
    require_scene_order(39, "শত্রুঘ্নও বাল্মীকির আশ্রম", "লবণ নিহত হলে",
                        "কুশ ও লব বড় হওয়ার")
    require_scene_order(40, "সীতা ধরিত্রীমাতার কাছে আশ্রয়",
                        "ধরিত্রী সীতাকে গ্রহণ করলে")
    require_scene_order(41, "কালের দূত রামের সঙ্গে", "লক্ষ্মণ আর ভাইয়ের কাছ থেকে",
                        "সরযূর জলে প্রবেশ")

    assert "ব্রহ্মাস্ত্র" in sections[32][2] and "শক্তিশূল" in sections[34][2], (
        "Distinct Indrajit and Ravana battle injuries were conflated"
    )
    assert "মায়ামূর্তি" in sections[33][2] and "ভক্তিমূলক" in sections[33][2], (
        "Indrajit's battlefield illusion must remain distinct from later Maya-Sita traditions"
    )

    print("RAMAYANA_EDITORIAL_PASS: 41 full epic chapters, verified biographies, source variants and unchanged reader design.")

if __name__ == "__main__":
    verify()
