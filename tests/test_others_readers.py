"""Regression checks for Others reading library navigation and editorial layout."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "others"
CATEGORIES = ("folklore", "history", "islamic-literature")
errors = []


def fail(path, message):
    errors.append(f"{path.relative_to(ROOT)}: {message}")


def validate_book(path):
    content = path.read_text(encoding="utf-8")
    header = re.search(r'<header class="others-book-title">(.*?)</header>', content, re.S)
    if not header:
        fail(path, "missing book heading")
    elif len(re.findall(r"<p>", header.group(1))) != 1:
        fail(path, "book heading must have exactly one editorial introduction")

    if len(re.findall(r'class="others-toc-dialog"', content)) != 1:
        fail(path, "chapter sidebar must exist exactly once")
    if 'class="others-toc-trigger"' not in content or "/others/assets/reader.js" not in content:
        fail(path, "chapter sidebar trigger or script missing")

    chapters = [int(n) for n in re.findall(r'<section class="others-chapter" id="chapter-(\d+)"', content)]
    links = [int(n) for n in re.findall(r'href="#chapter-(\d+)"', content)]
    expected = list(range(1, len(chapters) + 1))
    if not chapters or chapters != expected or links != expected:
        fail(path, f"chapter/TOC mismatch: {len(chapters)} chapters, {len(links)} links")
    if re.search(r'class="others-(?:sources|next)"', content):
        fail(path, "obsolete source or previous/next book block present")
    if ">undefined<" in content or 'content="undefined"' in content:
        fail(path, "undefined text appears in reader")
    if path.relative_to(ROOT).as_posix() == "others/history/ashab-al-kahf/index.html":
        # Chapter-count, developed narrative, Quranic chronology, and reader-shell contract.
        sections = re.findall(
            r'<section class="others-chapter" id="chapter-\d+"><h2>(.*?)</h2>(.*?)</section>',
            content, re.S
        )
        expected_titles = (
            "বিশ্বাসের ঘোষণা", "সমাজ থেকে বিচ্ছেদ", "আশ্রয়ে প্রবেশ",
            "দীর্ঘ নিদ্রা", "জাগরণের পরে", "রৌপ্যমুদ্রা",
            "ঘটনা প্রকাশ", "স্মারক নির্মাণ", "সংখ্যা,",
            "তিনশ বছর", "এফেসাসের", "গুহার স্থান",
        )
        if len(sections) != 12 or "অধ্যায়সূচি — 12টি অধ্যায়" not in content:
            fail(path, "Ashab al-Kahf must have 12 chronological chapters")
        elif any(not title.startswith(prefix) for (title, _), prefix in zip(sections, expected_titles)):
            fail(path, "Ashab al-Kahf chronology or TOC titles were changed")
        for number, (_, body) in enumerate(sections, 1):
            paragraphs = re.findall(r"<p>(.*?)</p>", body, re.S)
            if len(paragraphs) < 5 or any(len(re.sub(r"<[^>]*>", "", p).strip()) < 190 for p in paragraphs):
                fail(path, f"Ashab al-Kahf chapter {number} has an abbreviated section")
        for token in ("সূরা আল-কাহফ", "ডেসিয়ুস", "থিওডোসিয়ুস", "রৌপ্যমুদ্রা", "কুকুর", "আর-রাকিম"):
            if token not in content:
                fail(path, f"Ashab al-Kahf source-context anchor missing: {token}")
        if content.count('class="legal-footer"') != 1 or not all(s in content for s in (
            'href="https://walid-ai.com/others/history/ashab-al-kahf/"',
            '/walid-ai-approved-logo.png', '/others/assets/books.css',
            '/others/assets/reader.js')):
            fail(path, "Ashab al-Kahf SEO, branding, or footer regressed")

    if path.relative_to(ROOT).as_posix() == "others/history/mughal-empire/index.html":
        # Book-scoped editorial contract: other books retain their original tests.
        if len(chapters) != 25:
            fail(path, f"Mughal reader expected 25 integrated chapters; found {len(chapters)}")
        if "অধ্যায়সূচি — ২৫টি অধ্যায়" not in content:
            fail(path, "Mughal TOC count does not match revised editorial plan")
        if content.count("<p>") < 200:
            fail(path, "Mughal reader unexpectedly lost narrative detail")
        titles = re.findall(r'<section class="others-chapter" id="chapter-\d+"><h2>(.*?)</h2>', content)
        for emperor in (
            "বাবর", "হুমায়ুন", "আকবর", "জাহাঙ্গীর", "শাহজাহান",
            "ঔরঙ্গজেব", "আজম শাহ", "বাহাদুর শাহ", "জাহান্দার শাহ",
            "ফররুখসিয়ার", "রফি-উদ-দারাজাত", "দ্বিতীয় শাহজাহান",
            "মুহাম্মদ শাহ", "আহমদ শাহ বাহাদুর", "দ্বিতীয় আলমগীর",
            "তৃতীয় শাহজাহান", "দ্বিতীয় শাহ আলম", "দ্বিতীয় আকবর",
            "দ্বিতীয় বাহাদুর শাহ জাফর",
        ):
            if not any(emperor in title for title in titles):
                fail(path, f"Mughal emperor missing from TOC: {emperor}")
        for removed in ("হুমায়ুনের ভাইয়েরা ও নির্বাসিত পরিবার",
                        "আকবরের পুত্ররা, বৈরাম খান",
                        "নূরজাহানের উত্থান ও পতন",
                        "ঔরঙ্গজেবের সন্তান, স্ত্রী ও সেনাপতি"):
            if any(removed in title for title in titles):
                fail(path, f"orphaned Mughal family chapter: {removed}")
        final_section = re.search(
            r'<section class="others-chapter" id="chapter-25">(.*?)</section>',
            content, re.S)
        if not final_section or not all(item in final_section.group(1)
          for item in ("১৮৫৭", "হডসন", "জাফর", "বিচার", "রেঙ্গুন", "১৮৬২")):
            fail(path, "Mughal final reign is missing the 1857–1862 sequence")
        if content.count('class="legal-footer"') != 1:
            fail(path, "Mughal reader lost the shared legal footer")
        if 'href="https://walid-ai.com/others/history/mughal-empire/"' not in content:
            fail(path, "Mughal canonical URL changed")
        if '/walid-ai-approved-logo.png' not in content or '/others/assets/books.css' not in content:
            fail(path, "Mughal branding or reader styles changed")




def validate_mamluk_chronology(path):
    """Scope-specific chronology, editorial fullness, and unchanged reader chrome."""
    content = path.read_text(encoding="utf-8")
    titles = re.findall(
        r'<section class="others-chapter" id="chapter-\d+"><h2>(.*?)</h2>',
        content
    )
    if len(titles) != 17:
        fail(path, f"expected 17 carefully integrated chapters; found {len(titles)}")
        return
    expected = {
        2: ("শাজার আদ-দুর", "আইবেক"),
        4: ("আইন জালুত", "কুতুজ"),
        5: ("বায়বার্স", "ক্রুসেডার"),
        6: ("কালাউন", "১২৭৭"),
        7: ("খলিল", "আক্কার"),
        8: ("আল-নাসির", "তিন রাজত্ব"),
        10: ("বারকুক", "বুরজি"),
        14: ("কায়তবাই", "১৪৬৮"),
        15: ("আল-গাওরি", "১৫১৬"),
        16: ("তুমান বায়", "১৫১৭"),
    }
    for n, phrases in expected.items():
        if not all(phrase in titles[n - 1] for phrase in phrases):
            fail(path, f"chapter {n} has lost its historical period or main ruler")
    section_bodies = re.findall(
        r'<section class="others-chapter" id="chapter-\d+">.*?</h2>(.*?)</section>',
        content, re.S
    )
    for n, section in enumerate(section_bodies, 1):
        paragraphs = re.findall(r'<p>(.*?)</p>', section, re.S)
        if len(paragraphs) < 6:
            fail(path, f"chapter {n} is too abbreviated ({len(paragraphs)} paragraphs)")
        if any(len(re.sub(r'<[^>]+>', '', paragraph).strip()) < 90
               for paragraph in paragraphs):
            fail(path, f"chapter {n} contains a thin filler paragraph")
    for phrase in ("উৎস ও পরবর্তী পাঠ", "Walid AI Reading Library", "এই অধ্যায়ে আলোচনা", "পরের অধ্যায়ে"):
        if phrase in content:
            fail(path, f"obsolete or meta editorial text: {phrase}")
    for invariant in (
        'href="https://walid-ai.com/others/history/mamluk-sultanate/"',
        '/walid-ai-approved-logo.png',
        '/others/assets/books.css',
        '/others/assets/reader.js',
        'class="legal-footer"',
    ):
        if invariant not in content:
            fail(path, "reader chrome/SEO invariant missing: " + invariant)

def validate_joan_chronology(path):
    """Joan's life must be a continuous documented narrative, not a recap followed by a restart."""
    content = path.read_text(encoding="utf-8")
    titles = re.findall(r'<section class="others-chapter" id="chapter-\d+"><h2>(.*?)</h2>', content)
    expected = [
        "ভাঙা রাজ্য", "ডমরেমি", "ভকুল্যুর", "অরলিয়াঁ", "লোয়ার",
        "প্যারিস", "১৪৩০", "বার্গান্ডীয়", "১৪৩১ সালের রুয়াঁ",
        "২৪–৩০ মে", "জোয়ানের মৃত্যুর পরে", "১৪৫০–১৪৫৬", "পরবর্তী শতাব্দীতে"
    ]
    if len(titles) != len(expected) or any(token not in title for token, title in zip(expected, titles)):
        fail(path, "Joan of Arc chapters lost their single chronological progression")

    sections = re.findall(
        r'<section class="others-chapter" id="chapter-\d+">(.*?)</section>',
        content, re.S
    )
    for i, section in enumerate(sections, 1):
        paragraphs = re.findall(r'<p>(.*?)</p>', section, re.S)
        if len(paragraphs) < 6 or sum(len(p) for p in paragraphs) < 1700:
            fail(path, f"Joan chapter {i} has insufficient developed narrative")
    milestones = {
        1: ("১৪২০", "১৪২২"), 2: ("১৪১২", "ডমরেমি"),
        3: ("১৪২৯", "শিনোঁ"), 4: ("২৯ এপ্রিল", "৮ মে"),
        5: ("১৮ জুন", "১৭ জুলাই"), 6: ("৮ সেপ্টেম্বর", "প্যারিস"),
        7: ("২৩ মে ১৪৩০", "কম্পিয়েন"),
        8: ("২১ ফেব্রুয়ারি", "কোশোঁ"),
        9: ("বারোটি", "বিচার"),
        10: ("২৪ মে", "৩০ মে ১৪৩১"),
        11: ("১৪৩৫", "১৪৫৩"), 12: ("৭ জুলাই", "১৪৫৬"),
        13: ("১৯২০", "১৯০৯"),
    }
    for index, words in milestones.items():
        if index <= len(sections) and not all(word in sections[index - 1] for word in words):
            fail(path, f"Joan chapter {index} missing expected historical milestone")
    if 'অধ্যায়সূচি — ১৩টি অধ্যায়' not in content:
        fail(path, "Joan chapter TOC count does not match edited text")
    if "এই অধ্যায়ের শেষে" in content or "উৎস ও পরবর্তী পাঠ" in content:
        fail(path, "Joan book contains an obsolete editorial label")



def validate_editorial_metadata(path):
    """Check published folklore/fiction readers for stale or cut-off metadata."""
    content = path.read_text(encoding="utf-8")
    description = re.search(r'<meta name="description" content="([^"]*)">', content)
    if not description:
        fail(path, "missing SEO description")
        return
    summary = description.group(1).strip()
    if not 65 <= len(summary) <= 220 or not summary.endswith(("।", ".", "!", "?")):
        fail(path, "SEO description is too short/long or ends mid-sentence")

    canonical = re.search(r'<link rel="canonical" href="([^"]+)">', content)
    expected = f"https://walid-ai.com/{path.relative_to(ROOT).parent.as_posix()}/"
    if not canonical or canonical.group(1) != expected:
        fail(path, "SEO canonical is missing or does not match the book URL")
    if re.search(r'<meta[^>]+noindex', content, re.I):
        fail(path, "public reading page must not be noindex")
    if content.count('class="legal-footer"') != 1:
        fail(path, "expected exactly one legal footer")

    sections = re.findall(
        r'<section class="others-chapter" id="chapter-\d+"[^>]*>(.*?)</section>',
        content, re.S
    )
    seen = set()
    for chapter, section in enumerate(sections, 1):
        paragraphs = [re.sub(r'<[^>]+>', "", p).strip()
                      for p in re.findall(r'<p>(.*?)</p>', section, re.S)]
        if len(paragraphs) < 5:
            fail(path, f"chapter {chapter} has fewer than five paragraphs")
        for paragraph in paragraphs:
            if len(paragraph) >= 100 and paragraph in seen:
                fail(path, f"duplicate long paragraph in chapter {chapter}")
            seen.add(paragraph)

    bengali_digits = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")
    for match in re.finditer(
        r'([০-৯0-9]+)টি\s+(?:নির্বাচিত\s+)?(?:কৌতুকগল্প|কৌতুককাহিনি|অধ্যায়)',
        summary
    ):
        stated = int(match.group(1).translate(bengali_digits))
        if stated != len(sections):
            fail(path, f"SEO description says {stated} stories/chapters; found {len(sections)}")


def validate_saladin_timeline():
    """Saladin's entire narrative must stay chronological, complete, and linked."""
    path = BASE / "history" / "saladin" / "index.html"
    content = path.read_text(encoding="utf-8")
    parts = re.findall(
        r'<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)</h2>(.*?)</section>',
        content, re.S
    )
    toc = re.search(r'<nav class="others-toc" aria-label="অধ্যায় তালিকা">(.*?)</nav>',
                    content, re.S)
    if len(parts) != 27 or not toc:
        fail(path, "expected 27 chronological chapters and a chapter TOC")
        return
    links = re.findall(r'<li><a href="#chapter-(\d+)">(.*?)</a></li>', toc.group(1))
    if links != [(num, title) for num, title, _ in parts]:
        fail(path, "Saladin chapter titles and TOC entries differ")
    if "অধ্যায়সূচি — 27টি অধ্যায়" not in toc.group(1):
        fail(path, "Saladin TOC chapter count is stale")
    for n, title, body in parts:
        paragraphs = [re.sub(r"<[^>]+>", "", p).strip()
                      for p in re.findall(r"<p>(.*?)</p>", body, re.S)]
        if len(paragraphs) < 6 or any(len(p) < 120 for p in paragraphs):
            fail(path, f"Saladin chapter {n} has thin or incomplete narrative")
    expected = {
        1: "তাকরিত", 3: "প্রথম মিসর অভিযান", 6: "ফাতিমীয়",
        8: "নূরুদ্দিনের মৃত্যু", 13: "হাত্তিন", 15: "জেরুজালেম",
        17: "আক্কার দীর্ঘ অবরোধ", 19: "জাফফা",
        20: "মৃত্যু", 21: "পুত্রদের দ্বন্দ্ব",
        22: "আল-আদিল", 23: "আল-কামিল",
        26: "শাজার আদ-দুর", 27: "সিরিয়ার শেষ আইয়ুবীয়রা",
    }
    for number, keyword in expected.items():
        if keyword not in parts[number - 1][1]:
            fail(path, f"Saladin chapter {number} is out of historical order")
    if "উৎস ও পরবর্তী পাঠ" in content or 'class="others-sources"' in content:
        fail(path, "obsolete sources/next-reading block returned")
    if content.count('class="legal-footer"') != 1:
        fail(path, "Saladin must preserve one shared footer")
    for token in ("/walid-ai-approved-logo.png", "/others/assets/books.css",
                  "/others/assets/reader.js", 'href="https://walid-ai.com/others/history/saladin/"'):
        if token not in content:
            fail(path, f"Saladin branding/canonical element missing: {token}")


def validate_index(path):
    content = path.read_text(encoding="utf-8")
    cards = re.findall(r'<a class="others-card" href="[^"]+">(.*?)</a>', content, re.S)
    icons = [re.search(r'<svg class="others-card-art"[^>]*>(.*?)</svg>', card, re.S) for card in cards]
    if any(icon is None for icon in icons):
        fail(path, "a book card is missing its custom SVG icon")
    elif len({icon.group(1) for icon in icons}) != len(icons):
        fail(path, "duplicate SVG icons detected within index")
    if "Reading Library" in content or "পড়তে খুলুন" in content or "পড়তে খুলুন" in content:
        fail(path, "old filler label or action text remains")
    if re.search(r'<em>[^<]*খুলুন', content):
        fail(path, "redundant open-link call to action remains")
    return len(cards)


def main():
    books = sorted(path for category in CATEGORIES for path in (BASE / category).glob("*/index.html"))
    if len(books) != 32:
        errors.append(f"Expected 32 Others books; found {len(books)}")
    validate_saladin_timeline()
    for book in books:
        validate_book(book)
        if book.as_posix().endswith("/history/joan-of-arc/index.html"):
            validate_joan_chronology(book)
        if book.as_posix().endswith("/history/mamluk-sultanate/index.html"):
            validate_mamluk_chronology(book)
        if "/history/" not in book.as_posix():
            validate_editorial_metadata(book)

    indexes = [BASE / "index.html", *(BASE / category / "index.html" for category in CATEGORIES)]
    card_count = sum(validate_index(index) for index in indexes)
    if card_count != 35:
        errors.append(f"Expected 35 distinct cards across four indexes; found {card_count}")

    stylesheet = (BASE / "assets/books.css").read_text(encoding="utf-8")
    if '.others-toc-dialog' not in stylesheet or '.others-card-art' not in stylesheet:
        errors.append("Others stylesheet missing sidebar or icon rules")
    if 'body.others-toc-open' not in stylesheet:
        errors.append("Others sidebar lacks scroll locking")

    if errors:
        for error in errors:
            print("FAIL:", error)
        raise SystemExit(1)
    print(f"PASS: {len(books)} books, {len(indexes)} indexes, {card_count} book cards.")


if __name__ == "__main__":
    main()
