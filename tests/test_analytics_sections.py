"""Protect the owner-only accordion and coverage of public aggregate tracking."""
from pathlib import Path
import json
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


def source(path):
    return (ROOT / path).read_text(encoding="utf-8")


class SectionAnalyticsTests(unittest.TestCase):
    def test_only_current_homepage_order_is_used(self):
        home = source("index.html")
        positions = [
            home.index('<h2>' + name + '</h2>')
            for name in ("AI Chat", "PDF Tools", "Image Tools", "Games", "Education",
                         "Al-Quran & Islam", "Sports", "Others")
        ]
        self.assertEqual(positions, sorted(positions))
        source_js = source("admin-section-metrics.js")
        positions = [
            source_js.index('id:"' + key + '",name:"' + name + '"')
            for key, name in (
                ("chat", "AI Chat"), ("pdf", "PDF Tools"), ("image", "Image Tools"),
                ("games", "Games"), ("education", "Education"), ("islam", "Al-Quran & Islam"),
                ("sports", "Sports"), ("others", "Others"),
            )
        ]
        self.assertEqual(positions, sorted(positions))
        admin = source("admin/index.html")
        self.assertIn('id="features" class="analytics-sections"', admin)
        self.assertIn('/admin-section-metrics.js', admin)
        self.assertIn('/admin-analytics-catalog.js', admin)
        self.assertNotIn('id="notes"', admin)
        self.assertNotIn("Counts start when measurement is deployed", source("admin-usage.js"))
        self.assertIn("window.WalidSectionMetrics.render", source("admin-usage.js"))

    def test_privacy_and_quran_single_rollup(self):
        js = source("admin-section-metrics.js")
        self.assertIn('["quran-group","আল-কুরআন"]', js)
        self.assertIn('data.subsections?.islam?.quran', js)
        self.assertNotIn("catalog.surahs.map(", js)
        tracker = source("usage.js")
        for name in ("surah_", "book_", "education_mcq", "education_notes",
                     "sports_football", "sports_cricket"):
            self.assertIn(name, tracker)
        self.assertNotIn("localStorage.getItem('userEmail')", tracker)
        self.assertNotIn("localStorage.getItem('userName')", tracker)
        self.assertIn("document.visibilityState==='visible'", tracker)

    def test_tracking_bootstrapped_in_live_website_sections(self):
        for path in (
            "index.html", "others/index.html", "others/history/index.html",
            "others/folklore/index.html", "others/islamic-literature/index.html",
            "islam/index.html", "islam/stories/index.html", "islam/zikr-dua/index.html",
            "sections/education/study-notes/index.html",
        ):
            with self.subTest(path=path):
                self.assertIn('src="/usage.js?', source(path))
        for path in (
            "islam/quran/reader.js", "islam/quran/index.js", "others/assets/reader.js",
            "sections/education/education-app.mjs",
            "sections/education/study-notes-enhance.mjs", "sports/sports.js",
        ):
            with self.subTest(path=path):
                self.assertIn("walid-section-usage", source(path))
        metadata = json.loads(source("islam/quran/data/metadata.json"))
        self.assertEqual(len(metadata), 114)
        for surah in metadata:
            with self.subTest(surah=surah["slug"]):
                self.assertIn('src="/islam/quran/reader.js', source(
                    "islam/quran/" + surah["slug"] + "/index.html"
                ))
        for section in ("history", "folklore", "islamic-literature"):
            index = source("others/" + section + "/index.html")
            book_slugs = re.findall(r'href="/others/' + section + r'/([a-z0-9-]+)/"', index)
            self.assertTrue(book_slugs)
            for slug in set(book_slugs):
                with self.subTest(book=section + "/" + slug):
                    page = source("others/" + section + "/" + slug + "/index.html")
                    self.assertIn('src="/others/assets/reader.js', page)


if __name__ == "__main__":
    unittest.main()
