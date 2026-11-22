#!/usr/bin/env python3
"""Read-only regression contracts for the 30 canonical Others books.

These checks validate publication structure, not scholarly/literary completeness.
Do not change the source books to satisfy this test without editorial review.
"""
from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

ROOT = Path(__file__).resolve().parents[1]
OTHERS = ROOT / "others"
DOMAIN = "https://walid-ai.com"
CATEGORIES = {"history": 20, "folklore": 5, "islamic-literature": 5}
RETIRED = {"hasan-ibn-ali", "husayn-ibn-ali", "ali-hasan-husayn-karbala"}
NEW_HISTORY = "/others/history/karbala/"
ERRORS: list[str] = []


def check(condition: bool, message: str) -> None:
    if not condition:
        ERRORS.append(message)


class Links(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.links: list[str] = []
        self.ids: set[str] = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if attributes.get("id"):
            self.ids.add(attributes["id"] or "")
        if tag == "a" and attributes.get("href"):
            self.links.append(attributes["href"] or "")


def local_page(path: str) -> Path:
    path = unquote(path)
    if path.endswith("/"):
        return ROOT / path.lstrip("/") / "index.html"
    return ROOT / path.lstrip("/")


def link_audit(page: Path, cache: dict[Path, Links]) -> None:
    parsed = cache[page]
    site_url = DOMAIN + "/" + page.relative_to(ROOT).parent.as_posix() + "/"
    for link in parsed.links:
        destination = urlsplit(urljoin(site_url, link))
        if destination.netloc != "walid-ai.com" or not destination.path.startswith("/others/"):
            continue
        target = local_page(destination.path)
        check(target.is_file(), f"{page.relative_to(ROOT)}: broken Others link {link}")
        if destination.fragment and target.is_file():
            if target not in cache:
                target_parser = Links()
                target_parser.feed(target.read_text(encoding="utf-8"))
                cache[target] = target_parser
            fragment = unquote(destination.fragment)
            check(fragment in cache[target].ids,
                  f"{page.relative_to(ROOT)}: unresolved hash {link}")


def main() -> None:
    books: list[Path] = []
    indexes = [OTHERS / "index.html"]
    for category, expected in CATEGORIES.items():
        category_dir = OTHERS / category
        found = sorted(
            path for path in category_dir.glob("*/index.html")
            if path.parent.name not in RETIRED
        )
        check(len(found) == expected, f"{category}: expected {expected} books, found {len(found)}")
        books.extend(found)
        indexes.append(category_dir / "index.html")
    check(len(books) == 30, f"expected 30 canonical books, found {len(books)}")

    sitemap = ET.parse(ROOT / "sitemap.xml")
    locs = [element.text or "" for element in sitemap.iter() if element.tag.endswith("loc")]
    check(len(locs) == len(set(locs)), "duplicate sitemap URLs")
    stylesheet = (OTHERS / "assets/books.css").read_text(encoding="utf-8")
    for asset in ("SolaimanLipi", "/walid-ai-approved-flower.png", "others-flower-spin 10s", "opacity:.05"):
        check(asset in stylesheet, f"shared Others stylesheet lost {asset}")

    pages: list[Path] = [*books, *indexes]
    cache: dict[Path, Links] = {}
    chapters_by_book: dict[Path, list[str]] = {}
    for book in books:
        html = book.read_text(encoding="utf-8")
        rel = book.relative_to(ROOT).as_posix()
        canonical = DOMAIN + "/" + book.parent.relative_to(ROOT).as_posix() + "/"
        check(html.count(f'rel="canonical" href="{canonical}"') == 1,
              f"{rel}: incorrect canonical")
        check(canonical in locs, f"{rel}: missing from sitemap")
        check(bool(re.search(r'<meta name="description" content="[^"]+"', html)),
              f"{rel}: missing SEO description")
        check("noindex" not in html.lower(), f"{rel}: public book is noindex")
        check('name="viewport"' in html, f"{rel}: missing viewport")
        check('/walid-ai-approved-logo.png' in html, f"{rel}: missing approved logo")
        check('/others/assets/books.css' in html, f"{rel}: missing shared CSS")
        check('/others/assets/reader.js' in html, f"{rel}: missing reader JS")
        check(html.count('class="legal-footer"') == 1, f"{rel}: footer count != 1")
        for footer_href in ('/about-us/', '/contact-us/', '/privacy-policy/', '/terms-of-service/'):
            check(f'href="{footer_href}"' in html, f"{rel}: missing footer link {footer_href}")
        check('উৎস ও পরবর্তী পাঠ' not in html, f"{rel}: retired reading block reintroduced")

        chapter_ids = re.findall(r'<section class="others-chapter" id="(chapter-\d+)"', html)
        toc_ids = re.findall(r'href="#(chapter-\d+)"', html)
        expected_ids = [f"chapter-{index}" for index in range(1, len(chapter_ids) + 1)]
        chapters_by_book[book] = chapter_ids
        check(len(chapter_ids) >= 12, f"{rel}: fewer than 12 chapters")
        check(chapter_ids == expected_ids, f"{rel}: chapter IDs missing/duplicated/out of order")
        check(toc_ids == chapter_ids, f"{rel}: TOC anchors do not match chapter order")
        paragraphs = [
            unescape(re.sub(r'<[^>]+>', '', item)).strip()
            for item in re.findall(r'<section class="others-chapter" id="chapter-\d+">(.*?)</section>', html, re.S)
            for item in re.findall(r'<p>(.*?)</p>', item, re.S)
        ]
        substantive = [p for p in paragraphs if len(p) >= 150]
        check(len(substantive) == len(set(substantive)), f"{rel}: duplicate substantive paragraphs")
        parser = Links()
        parser.feed(html)
        cache[book] = parser

    for index in indexes:
        html = index.read_text(encoding="utf-8")
        rel = index.relative_to(ROOT).as_posix()
        check(html.count('class="legal-footer"') == 1, f"{rel}: footer count != 1")
        check('/walid-ai-approved-logo.png' in html, f"{rel}: missing approved logo")
        check(DOMAIN + "/" + index.parent.relative_to(ROOT).as_posix() + "/" in locs,
              f"{rel}: missing sitemap entry")
        parser = Links()
        parser.feed(html)
        cache[index] = parser

    # Approximate chronology by the start of the subject's main historical period.
    # Ashab al-Kahf has no verified absolute historical date and stays last.
    expected_history = [
        "alexander", "roman-empire", "byzantine-empire",
        "khalid-ibn-walid", "rashidun-caliphate", "karbala",
        "venice", "seljuk-empire", "crusades", "saladin",
        "mongol-empire", "mamluk-sultanate", "ottoman-empire",
        "bengal-sultanate", "timur", "joan-of-arc", "mughal-empire",
        "british-empire", "napoleon", "ashab-al-kahf"
    ]
    history_html = (OTHERS / "history/index.html").read_text(encoding="utf-8")
    cards = re.findall(r'<a class="others-card" href="/others/history/([^/]+)/">', history_html)
    check(cards == expected_history, "history index: books are not in chronology")
    check("আলেকজান্ডার দ্য গ্রেট" in history_html, "history index: recognizable Bengali Alexander name missing")
    check("<strong>কারবালা</strong>" in history_html, "history index: Karbala title is not concise")
    for index in indexes:
        content = index.read_text(encoding="utf-8")
        check('cx="32" cy="32" r="28"' not in content,
              f"{index.relative_to(ROOT)}: decorative circular icon frame remains")
    for category, expected in CATEGORIES.items():
        category_index = OTHERS / category / "index.html"
        paths = [
            urlsplit(urljoin(DOMAIN + "/others/" + category + "/", href)).path
            for href in cache[category_index].links
            if href.startswith("/others/" + category + "/")
        ]
        expected_paths = {
            "/" + book.parent.relative_to(ROOT).as_posix() + "/"
            for book in books if book.parent.parent.name == category
        }
        check(len(paths) == expected, f"{category}: expected {expected} book cards")
        check(set(paths) == expected_paths, f"{category}: book cards missing, repeated or retired")

    merged = OTHERS / "history/karbala/index.html"
    merged_ids = set(chapters_by_book.get(merged, []))
    for retired in sorted(RETIRED):
        old = OTHERS / "history" / retired / "index.html"
        html = old.read_text(encoding="utf-8")
        rel = old.relative_to(ROOT).as_posix()
        check('name="robots" content="noindex,follow"' in html,
              f"{rel}: missing noindex on retired redirect")
        check(f'rel="canonical" href="{DOMAIN}{NEW_HISTORY}"' in html,
              f"{rel}: wrong destination canonical")
        check(DOMAIN + "/others/history/" + retired + "/" not in locs,
              f"{rel}: retired URL still in sitemap")
        if retired == "ali-hasan-husayn-karbala":
            check(f'location.replace("{NEW_HISTORY}"+location.search+location.hash)' in html,
                  f"{rel}: previous canonical URL must redirect without losing query/hash")
        else:
            check(f'location.replace("{NEW_HISTORY}"+location.search+hash)' in html,
                  f"{rel}: redirect loses query/hash context")
            match = re.search(r'var map=(\{.*?\});var key=', html)
            check(match is not None, f"{rel}: missing hash translation map")
            if match:
                mapping = json.loads(match.group(1))
                keys = [f"chapter-{n}" for n in range(1, len(mapping) + 1)]
                check(list(mapping) == keys, f"{rel}: missing/out-of-order legacy chapter hashes")
                for source, target in mapping.items():
                    check(target in merged_ids, f"{rel}: {source} maps to missing {target}")
        check(html.count('class="legal-footer"') == 1, f"{rel}: missing footer")
        parser = Links()
        parser.feed(html)
        cache[old] = parser
        pages.append(old)

    evidence = OTHERS / "history/karbala/evidence/index.html"
    parser = Links()
    parser.feed(evidence.read_text(encoding="utf-8"))
    cache[evidence] = parser
    pages.append(evidence)
    for page in pages:
        link_audit(page, cache)

    if ERRORS:
        for issue in ERRORS:
            print("FAIL:", issue)
        raise SystemExit(1)
    print(f"PASS: {len(books)} canonical books, {len(indexes)} indexes, "
          f"{sum(len(x) for x in chapters_by_book.values())} chapters, "
          f"{len(RETIRED)} retired redirects; sitemap, TOC, SEO and links checked.")
    

if __name__ == "__main__":
    main()
