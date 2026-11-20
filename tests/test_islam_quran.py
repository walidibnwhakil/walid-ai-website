"""Integrity and routing checks for the Quran and Islam section."""
import gzip
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
            prev = re.search(r'<a class="surah-step" rel="prev" href="([^"]+)"', text)
            nxt = re.search(r'<a class="surah-step align-end" rel="next" href="([^"]+)"', text)
            if surah["number"] == 1:
                self.assertIn('class="surah-step disabled" aria-disabled="true"', text)
            else:
                self.assertEqual(prev.group(1), f'/islam/quran/{self.surahs[surah["number"] - 2]["slug"]}/')
            if surah["number"] == 114:
                self.assertIn('class="surah-step align-end disabled" aria-disabled="true"', text)
            else:
                self.assertEqual(nxt.group(1), f'/islam/quran/{self.surahs[surah["number"]]["slug"]}/')

    def test_arabic_text_matches_current_official_quranpedia_snapshot(self):
        snapshot = DATA / "source-snapshots" / "quranpedia-mushafs-2-2026-11-16.json.gz"
        with gzip.open(snapshot, "rt", encoding="utf-8") as stream:
            source = json.load(stream)
        self.assertEqual(source["license"]["version"], "2026-11-16")
        self.assertEqual(source["data"]["id"], 2)
        source_surahs = source["data"]["surahs"]
        self.assertEqual(len(source_surahs), 114)
        self.assertEqual(sum(len(s["ayahs"]) for s in source_surahs), 6236)
        for number, source_surah in enumerate(source_surahs, 1):
            local = json.loads((DATA / f"surah-{number:03}.json").read_text(encoding="utf-8"))
            self.assertEqual([v["arabic"] for v in local["verses"]], [v["text"] for v in source_surah["ayahs"]], number)

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
        self.assertIn("2026-11-16", notices)
        self.assertIn("3,675 changed ayah strings", notices)
        self.assertIn("QuranEnc.com", notices)
        self.assertIn("bengali_zakaria", notices)
        self.assertIn("1.1.1", notices)
        self.assertIn("Abu Bakr Zakaria", notices)
        self.assertIn("Tanzil", notices)
        self.assertTrue((DATA / "QURAN-JSON-LICENSE.txt").is_file())
        self.assertEqual(self.provenance["sources"]["arabic"]["dumpVersion"], "2026-11-16")
        self.assertEqual(self.provenance["sources"]["arabic"]["localValidation"]["ayahCount"], 6236)
        self.assertEqual(self.provenance["sources"]["arabic"]["sourceArchiveSha256"], "a61eaf65586e535c1ec45787af26b1947673b61c29bdfbf48d4737e6ba0ecc9c")
        self.assertEqual(self.provenance["sources"]["bengali"]["version"], "1.1.1")

    def test_basmala_separation_and_pronunciation_not_fabricated(self):
        reader = (QURAN / "reader.js").read_text(encoding="utf-8")
        self.assertIn("const n = Number(document.body.dataset.surah);", reader)
        pages = [ (QURAN / s["slug"] / "index.html").read_text(encoding="utf-8") for s in self.surahs ]
        self.assertIn("বাংলা উচ্চারণ", reader)
        self.assertNotIn("transliteration_bn", reader)
        self.assertGreater(len(json.loads((DATA / "reading.json").read_text(encoding="utf-8"))["bismillah"]), 30)

    def test_reviewed_bengali_pronunciation_is_a_separate_optional_dataset(self):
        """Published ayahs must not modify canonical imported Quran JSON."""
        published = [3, 5, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49]
        self.assertEqual(sum((200, 120, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18)), 3790)
        for surah in published:
            data = json.loads((DATA / f"pronunciation-{surah:03}.json").read_text(encoding="utf-8"))
            original = json.loads((DATA / f"surah-{surah:03}.json").read_text(encoding="utf-8"))
            self.assertEqual(data["surah"], surah)
            self.assertEqual(len(data["verses"]), len(original["verses"]))
            self.assertEqual([v["verse"] for v in data["verses"]], list(range(1, len(original["verses"]) + 1)))
            for verse in data["verses"]:
                text = verse["pronunciation"]
                self.assertRegex(text, r"[\u0980-\u09ff]")
                self.assertTrue(text.endswith("।"), (surah, verse["verse"]))
                self.assertNotRegex(text, r"আান|ইিল|ওাআ|আল্াযিই|ররাব্বি")
                self.assertNotRegex(text, r"[\u09be-\u09cc][\u09be-\u09cc]")
        renderer = (QURAN / "verses-stable.js").read_text(encoding="utf-8")
        self.assertIn("approvedPronunciationSurahs=new Set([3,5,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49])", renderer)
        self.assertIn("attachPronunciation", renderer)

    def test_story_coverage_and_quran_references(self):
        stories = json.loads((ROOT / "islam" / "stories" / "stories.json").read_text(encoding="utf-8"))
        self.assertGreaterEqual(len(stories), 30)
        self.assertEqual(len({s["id"] for s in stories}), len(stories))
        self.assertGreaterEqual(len(stories), 38)
        for story in stories:
            self.assertGreaterEqual(len(story["paragraphs"]), 3, story["id"])
            self.assertTrue(story["lessons"].strip(), story["id"])
            for account in story.get("additional", []):
                self.assertTrue(account["text"].strip(), story["id"])
                self.assertTrue(account["source"].strip(), story["id"])
                self.assertRegex(account["url"], r"^https://sunnah\.com/(bukhari|muslim):\d+$")
            self.assertTrue(story["refs"].strip(), story["id"])
            self.assertRegex(story["refs"], r"\d+[: ]")
            self.assertGreater(sum(map(len, story["paragraphs"])), 300, story["id"])
            to_ascii = lambda value: value.translate(str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789"))
            for part in story["refs"].split(";"):
                match = re.search(r"([0-9০-৯]+):\s*([0-9০-৯–,\s-]+)", part)
                if not match:
                    continue
                surah_number = int(to_ascii(match.group(1)))
                self.assertTrue(1 <= surah_number <= 114, story["id"])
                maximum = self.surahs[surah_number - 1]["verseCount"]
                for verse_range in match.group(2).split(","):
                    endpoints = re.fullmatch(r"\s*([0-9০-৯]+)(?:[–-]([0-9০-৯]+))?\s*", verse_range)
                    self.assertIsNotNone(endpoints, (story["id"], part, verse_range))
                    start = int(to_ascii(endpoints.group(1)))
                    end = int(to_ascii(endpoints.group(2) or endpoints.group(1)))
                    self.assertTrue(1 <= start <= end <= maximum, (story["id"], part))

    def test_sitemap_contains_every_surah(self):
        tree = ET.parse(ROOT / "sitemap.xml")
        ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        urls = {node.text for node in tree.findall("sm:url/sm:loc", ns)}
        for route in ["/islam/", "/islam/quran/", "/islam/stories/"]:
            self.assertIn("https://walid-ai.com" + route, urls)
        for surah in self.surahs:
            self.assertIn(f'https://walid-ai.com/islam/quran/{surah["slug"]}/', urls)

    def test_shared_branding_has_semantic_chrome_on_every_islam_page(self):
        pages = [ROOT / "islam" / "index.html", QURAN / "index.html", ROOT / "islam" / "stories" / "index.html"]
        pages.extend(QURAN / s["slug"] / "index.html" for s in self.surahs)
        css = (QURAN / "quran.css").read_text(encoding="utf-8")
        self.assertIn("opacity:.06", css)
        self.assertIn("10s linear infinite", css)
        self.assertNotIn("source-footer::after", css)
        self.assertNotIn(".shell::before", css)
        for page in pages:
            text = page.read_text(encoding="utf-8")
            self.assertIn('class="islam-brand"', text, page)
            for href in ("/about-us.html", "/contact-us.html", "/privacy-policy.html", "/terms-of-service.html"):
                self.assertIn(f'href="{href}"', text, page)
            self.assertIn('class="copyright"', text, page)

    def test_bengali_banner_runtime_updates_every_surah_dom(self):
        """Guard the actual page contract: JS must run and populate Bengali banner fields."""
        bengali = json.loads((DATA / "bengali-metadata.json").read_text(encoding="utf-8"))
        self.assertEqual(len(bengali), 114)
        self.assertEqual({row["number"] for row in bengali}, set(range(1, 115)))
        self.assertTrue(all(re.search(r"[\u0980-\u09ff]", row["title"] + row["meaning"]) for row in bengali))
        reader = (QURAN / "reader.js").read_text(encoding="utf-8")
        self.assertIn("bengali-metadata.json", reader)
        self.assertIn("surah-title", reader)
        for surah, bn in zip(self.surahs, bengali):
            page = (QURAN / surah["slug"] / "index.html").read_text(encoding="utf-8")
            self.assertIn('id="surah-title"', page, surah["slug"])
            self.assertIn('class="banner-meta"', page, surah["slug"])
            self.assertIn('class="banner-meaning"', page, surah["slug"])
            self.assertRegex(page, r'src="/islam/quran/reader\.js(?:\?[^"]*)?"')
            self.assertTrue(bn["title"].strip() and bn["meaning"].strip())

    def test_every_rendered_banner_has_bengali_contract(self):
        """Static rendered-banner contract: no transliteration is shipped in the hero."""
        bengali = {row["number"]: row for row in json.loads((DATA / "bengali-metadata.json").read_text(encoding="utf-8"))}
        metadata = {row["number"]: row for row in self.surahs}
        for number in range(1, 115):
            page = (QURAN / metadata[number]["slug"] / "index.html").read_text(encoding="utf-8")
            banner = re.search(r'<header class="surah-head">(.*?)</header>', page, re.S)
            self.assertIsNotNone(banner, number)
            hero = banner.group(1)
            self.assertRegex(hero, r'class="banner-meta">সূরা [০-৯]+ · (?:মাক্কি|মাদানি) · [০-৯]+ আয়াত', number)
            self.assertIn(f'সূরা {bengali[number]["title"]}', hero, number)
            self.assertIn(f'class="hero-arabic"', hero, number)
            self.assertIn(metadata[number]["arabicName"], hero, number)
            self.assertIn(f'class="banner-meaning">{bengali[number]["meaning"]}', hero, number)
            self.assertNotIn(metadata[number]["transliteration"], hero, number)


if __name__ == "__main__":
    unittest.main()
