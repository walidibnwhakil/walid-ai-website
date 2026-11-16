"""Integrity and routing checks for the Quran and Islam section."""
import hashlib
import json
import re
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
QURAN = ROOT / "islam" / "quran"
DATA = QURAN / "data"


class QuranIntegrityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.surahs = json.loads((DATA / "metadata.json").read_text(encoding="utf-8"))
        cls.provenance = json.loads((DATA / "provenance.json").read_text(encoding="utf-8"))

    def test_full_surah_manifest_and_permanent_routes(self):
        self.assertEqual(len(self.surahs), 114)
        self.assertEqual(len({s["slug"] for s in self.surahs}), 114)
        self.assertEqual(sum(s["verseCount"] for s in self.surahs), 6236)
        self.assertEqual(self.surahs[0]["slug"], "al-fatiha")
        self.assertEqual(self.surahs[1]["slug"], "al-baqarah")
        for surah in self.surahs:
            page = QURAN / surah["slug"] / "index.html"
            self.assertTrue(page.is_file(), page)
            text = page.read_text(encoding="utf-8")
            self.assertIn(f'https://walid-ai.com/islam/quran/{surah["slug"]}/', text)
            self.assertNotIn("/sections/", text)
            self.assertIn('id="context-details"', text)

    def test_every_arabic_verse_and_translation_is_present_and_aligned(self):
        total = 0
        for surah in self.surahs:
            number = surah["number"]
            path = DATA / f"surah-{number:03}.json"
            data = json.loads(path.read_text(encoding="utf-8"))
            verses = data["verses"]
            self.assertEqual(data["surah"], number)
            self.assertEqual(len(verses), surah["verseCount"])
            self.assertEqual([v["verse"] for v in verses], list(range(1, len(verses) + 1)))
            self.assertTrue(all(v["arabic"].strip() and v["translation"].strip() for v in verses))
            notes = json.loads((DATA / f"notes-{number:03}.json").read_text(encoding="utf-8"))
            self.assertEqual(notes["surah"], number)
            self.assertTrue(all(1 <= v["verse"] <= len(verses) for v in notes["notes"]))
            self.assertEqual(len({v["verse"] for v in notes["notes"]}), len(notes["notes"]))
            total += len(verses)
        self.assertEqual(total, 6236)

    def test_imported_data_checksums_and_edition_attribution(self):
        self.assertEqual(self.provenance["surahCount"], 114)
        self.assertEqual(self.provenance["ayahCount"], 6236)
        for relative, expected in self.provenance["files"].items():
            actual = hashlib.sha256((ROOT / relative).read_bytes()).hexdigest()
            self.assertEqual(actual, expected, relative)
        notices = (DATA / "SOURCES.md").read_text(encoding="utf-8")
        self.assertIn("Quranpedia.net", notices)
        self.assertIn("2026-09-30", notices)
        self.assertIn("QuranEnc.com", notices)
        self.assertIn("bengali_zakaria", notices)
        self.assertIn("1.1.1", notices)
        self.assertIn("Abu Bakr Zakaria", notices)
        self.assertIn("Tanzil", notices)
        self.assertTrue((DATA / "QURAN-JSON-LICENSE.txt").is_file())
        self.assertEqual(self.provenance["sources"]["arabic"]["dumpVersion"], "2026-09-30")
        self.assertEqual(self.provenance["sources"]["bengali"]["version"], "1.1.1")

    def test_basmala_separation_and_pronunciation_not_fabricated(self):
        reader = (QURAN / "reader.js").read_text(encoding="utf-8")
        self.assertIn("n!==1&&n!==9", reader)
        self.assertIn("reading.bismillah", reader)
        pages = [ (QURAN / s["slug"] / "index.html").read_text(encoding="utf-8") for s in self.surahs ]
        self.assertTrue(all("বাংলা উচ্চারণ" in p for p in pages))
        self.assertNotIn("transliteration_bn", reader)
        self.assertGreater(len(json.loads((DATA / "reading.json").read_text(encoding="utf-8"))["bismillah"]), 30)

    def test_story_coverage_and_quran_references(self):
        stories = json.loads((ROOT / "islam" / "stories" / "stories.json").read_text(encoding="utf-8"))
        self.assertGreaterEqual(len(stories), 30)
        self.assertEqual(len({s["id"] for s in stories}), len(stories))
        for story in stories:
            self.assertGreaterEqual(len(story["paragraphs"]), 2, story["id"])
            self.assertTrue(story["refs"].strip(), story["id"])
            self.assertRegex(story["refs"], r"\d+[: ]")

    def test_sitemap_contains_every_surah(self):
        tree = ET.parse(ROOT / "sitemap.xml")
        ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        urls = {node.text for node in tree.findall("sm:url/sm:loc", ns)}
        for route in ["/islam/", "/islam/quran/", "/islam/stories/"]:
            self.assertIn("https://walid-ai.com" + route, urls)
        for surah in self.surahs:
            self.assertIn(f'https://walid-ai.com/islam/quran/{surah["slug"]}/', urls)


if __name__ == "__main__":
    unittest.main()
