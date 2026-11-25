"""Check canonical metadata for public Quran, games, and tool landing pages."""
import json
import re
import unittest
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://walid-ai.com"
NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}

class HeadParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_head = False
        self.capture = None
        self.title = ""
        self.description = []
        self.canonical = []
        self.robots = []
        self.structured = []
        self.buffer = ""
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "head":
            self.in_head = True
        if not self.in_head:
            return
        if tag == "title":
            self.capture = "title"
        elif tag == "meta":
            if a.get("name") == "description":
                self.description.append(a.get("content", ""))
            if a.get("name") == "robots":
                self.robots.append(a.get("content", ""))
        elif tag == "link" and a.get("rel") == "canonical":
            self.canonical.append(a.get("href", ""))
        elif tag == "script" and a.get("type") == "application/ld+json":
            self.capture = "json"
            self.buffer = ""
    def handle_data(self, data):
        if self.capture == "title":
            self.title += data
        elif self.capture == "json":
            self.buffer += data
    def handle_endtag(self, tag):
        if tag == "head":
            self.in_head = False
        if tag == "title" and self.capture == "title":
            self.capture = None
        if tag == "script" and self.capture == "json":
            self.structured.append(json.loads(self.buffer))
            self.capture = None

class SeoTests(unittest.TestCase):
    def test_public_page_metadata(self):
        sitemap = ET.parse(ROOT / "sitemap.xml")
        urls = [n.text for n in sitemap.findall("s:url/s:loc", NS)]
        self.assertEqual(len(urls), len(set(urls)))
        groups = {
            "surah": [u for u in urls if re.fullmatch(ORIGIN + r"/islam/quran/[^/]+/", u) and not u.endswith("/credits/")],
            "games": [ORIGIN + "/games/" + g + "/" for g in ("riddlex","ludo","chess","tic-tac-toe","snakes-and-ladders","2048")],
            "pdf": [u for u in urls if re.fullmatch(ORIGIN + r"/pdf/[^/]+/", u)],
            "image": [u for u in urls if re.fullmatch(ORIGIN + r"/image/[^/]+/", u)],
            "legal": [ORIGIN + "/" + p + "/" for p in ("about-us","contact-us","privacy-policy","privacy","terms-of-service")],
        }
        for group, expected in (("surah",114),("games",6),("pdf",11),("image",6),("legal",5)):
            self.assertEqual(len(groups[group]), expected, group)
        for group, items in groups.items():
            titles, descriptions = set(), set()
            for url in items:
                with self.subTest(group=group, url=url):
                    self.assertIn(url, urls)
                    path = ROOT / url.removeprefix(ORIGIN).lstrip("/") / "index.html"
                    self.assertTrue(path.is_file())
                    h = HeadParser()
                    h.feed(path.read_text(encoding="utf-8"))
                    self.assertTrue(h.title.strip())
                    self.assertEqual(len(h.description), 1)
                    self.assertTrue(h.description[0].strip())
                    self.assertEqual(h.canonical, [url])
                    self.assertFalse(any("noindex" in r.lower() for r in h.robots))
                    self.assertTrue(h.structured)
                    self.assertNotIn(h.title, titles)
                    self.assertNotIn(h.description[0], descriptions)
                    titles.add(h.title)
                    descriptions.add(h.description[0])
                    nodes = [node for obj in h.structured for node in obj.get("@graph", [obj])]
                    if group == "games":
                        self.assertTrue(any(n.get("@type") == "VideoGame" for n in nodes))
                    if group in ("pdf", "image"):
                        for n in nodes:
                            if n.get("@type") == "BreadcrumbList":
                                self.assertFalse(any(i.get("item") == ORIGIN + "/tools/" for i in n.get("itemListElement", [])))
            print(f"SEO checked: {group}: {len(items)} URLs")

if __name__ == "__main__":
    unittest.main()
