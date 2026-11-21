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
    if path.relative_to(ROOT).as_posix() == "others/history/mughal-empire/index.html":
        # Book-scoped editorial contract: other books retain their original tests.
        if len(chapters) != 25:
            fail(path, f"Mughal reader expected 25 integrated chapters; found {len(chapters)}")
        if "অধ্যায়সূচি — ২৫টি অধ্যায়" not in content:
            fail(path, "Mughal TOC count does not match revised editorial plan")
        if content.count("<p>") < 200:
            fail(path, "Mughal reader unexpectedly lost narrative detail")
        titles = re.findall(r'<section class="others-chapter" id="chapter-\\d+"><h2>(.*?)</h2>', content)
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
    for book in books:
        validate_book(book)
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
