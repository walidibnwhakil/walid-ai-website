#!/usr/bin/env python3
"""Offline QA for Walid AI's published pages and source-data completeness.

Run from any directory: python3 scripts/site_quality_audit.py
No network calls, third-party dependencies, or changes to published content.
"""
from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://walid-ai.com/"
DOMAIN = urlsplit(SITE).netloc
ISSUES: list[str] = []
NOTES: list[str] = []


def err(msg: str) -> None:
    ISSUES.append(msg)


def note(msg: str) -> None:
    NOTES.append(msg)


def to_file(path: str) -> Path:
    path = unquote(path).split("?", 1)[0]
    safe = path.lstrip("/")
    return ROOT / safe / "index.html" if path.endswith("/") or not Path(safe).suffix else ROOT / safe


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.refs: list[tuple[str, str, str]] = []
        self.ids: set[str] = set()
        self.canonicals: list[str] = []
        self.robots: list[str] = []
        self.hreflangs: dict[str, str] = {}
        self.viewport = False
        self.description = False
        self.title = False
        self._title = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = dict(attrs)
        if a.get("id"):
            self.ids.add(a["id"] or "")
        if tag == "title":
            self._title = True
        if tag == "meta":
            name = (a.get("name") or "").lower()
            if name == "viewport":
                self.viewport = True
            if name == "description":
                self.description = bool(a.get("content"))
            if name == "robots":
                self.robots.append((a.get("content") or "").lower())
        if tag == "link":
            rel = (a.get("rel") or "").lower().split()
            if "canonical" in rel:
                self.canonicals.append(a.get("href") or "")
            if "alternate" in rel and a.get("hreflang"):
                self.hreflangs[a["hreflang"] or ""] = a.get("href") or ""
        for k in (("href",) if tag in ("a", "link") else ("src",) if tag in ("script", "img", "iframe", "source") else ()):
            if a.get(k):
                self.refs.append((tag, k, a[k] or ""))

    def handle_data(self, data: str) -> None:
        if self._title and data.strip():
            self.title = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._title = False


def audit_pages() -> int:
    tree = ET.parse(ROOT / "sitemap.xml")
    urls = [(node.text or "").strip() for node in tree.iter() if node.tag.endswith("}loc") or node.tag == "loc"]
    if len(set(urls)) != len(urls):
        err("Sitemap contains duplicate <loc> URLs")
    if not urls:
        err("Sitemap contains no URLs")
    pages = 0
    missing_paths: set[str] = set()

    for url in urls:
        u = urlsplit(url)
        if u.scheme != "https" or u.netloc != DOMAIN or u.query or u.fragment:
            err(f"Invalid sitemap URL: {url}")
            continue
        path = to_file(u.path)
        if not path.is_file():
            err(f"Missing sitemap page: {url} ({path.relative_to(ROOT)})")
            continue
        if path.suffix.lower() != ".html":
            continue
        pages += 1
        content = path.read_text(encoding="utf-8")
        parser = PageParser()
        parser.feed(content)
        rel = path.relative_to(ROOT).as_posix()
        if not parser.title:
            err(f"{rel}: missing nonempty <title>")
        if not parser.viewport:
            note(f"{rel}: missing mobile viewport")
        if not parser.description:
            note(f"{rel}: no meta description")
        if any("noindex" in value for value in parser.robots):
            err(f"{rel}: indexable sitemap URL marked noindex")
        if len(parser.canonicals) != 1:
            err(f"{rel}: expected one canonical, found {len(parser.canonicals)}")
        elif parser.canonicals[0] != url:
            err(f"{rel}: canonical mismatch {parser.canonicals[0]} != {url}")

        for tag, key, ref in parser.refs:
            ref = ref.strip()
            if not ref or ref.startswith(("#", "data:", "mailto:", "tel:", "javascript:", "blob:")):
                if ref.startswith("#") and len(ref) > 1 and tag == "a":
                    anchor = unquote(ref[1:])
                    if anchor not in parser.ids:
                        note(f"{rel}: anchor #{anchor} is not in initial HTML")
                continue
            target = urlsplit(urljoin(url, ref))
            if target.netloc != DOMAIN or target.scheme not in ("https", "http"):
                continue
            if target.path.startswith("/api/"):
                continue  # Runtime server endpoint, not part of the static site.
            dest = to_file(target.path)
            if not dest.is_file():
                shown = f"{rel}: {tag} {key}={ref!r} -> {dest.relative_to(ROOT)}"
                if shown not in missing_paths:
                    missing_paths.add(shown)
                    err("Broken internal resource: " + shown)
    print(f"Sitemap: {len(urls)} URLs; inspected {pages} HTML pages.")
    return pages


def audit_content() -> None:
    chapters = json.loads((ROOT / "islam/quran/data/metadata.json").read_text(encoding="utf-8"))
    if len(chapters) != 114:
        err(f"Quran metadata: expected 114 surahs, found {len(chapters)}")
    total = 0
    for c in chapters:
        n = c.get("number")
        if not isinstance(n, int):
            err(f"Quran metadata contains invalid surah number: {n!r}")
            continue
        data_file = ROOT / f"islam/quran/data/surah-{n:03}.json"
        if not data_file.is_file():
            err(f"Missing Quran data for surah {n}")
            continue
        data = json.loads(data_file.read_text(encoding="utf-8"))
        verses = data.get("verses", [])
        if data.get("surah") != n or len(verses) != c.get("verseCount"):
            err(f"Surah {n}: inconsistent verse count or surah number")
        if [x.get("verse") for x in verses] != list(range(1, len(verses) + 1)):
            err(f"Surah {n}: duplicate or missing verse numbers")
        for x in verses:
            if not (x.get("arabic") or "").strip() or not (x.get("translation") or "").strip():
                err(f"Surah {n}: missing Arabic or Bengali translation at verse {x.get('verse')}")
        total += len(verses)
    if total != 6236:
        err(f"Quran corpus: expected 6236 verses; counted {total}")
    stories = json.loads((ROOT / "islam/stories/stories.json").read_text(encoding="utf-8"))
    ids = [s.get("id") for s in stories]
    if len(set(ids)) != len(ids):
        err("Duplicate Quran story IDs")
    for story in stories:
        if not story.get("title") or not story.get("paragraphs") or not re.search(r"[০-৯0-9]+:[০-৯0-9]+", story.get("refs", "")):
            err(f"Story lacks text or Quran verse citation: {story.get('id')}")
    fallback = (ROOT / "islam/stories/index.html").read_text(encoding="utf-8")
    fallback_ids = re.findall(r'<article class="story-card" id="([^"]+)"', fallback)
    if ids != fallback_ids:
        err("Static Quran story fallback is out of sync with stories.json")
    print(f"Quran: {len(chapters)} surahs, {total} verses; stories: {len(stories)} referenced items.")


def main() -> int:
    audit_pages()
    audit_content()
    for message in ISSUES[:120]:
        print("ERROR:", message)
    for message in NOTES[:35]:
        print("NOTE:", message)
    print(f"Results: {len(ISSUES)} errors; {len(NOTES)} nonblocking notes.")
    if len(ISSUES) > 120:
        print(f"{len(ISSUES) - 120} additional errors omitted")
    return 1 if ISSUES else 0


if __name__ == "__main__":
    sys.exit(main())
