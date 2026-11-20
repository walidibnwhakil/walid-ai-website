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
