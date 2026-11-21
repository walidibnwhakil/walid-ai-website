#!/usr/bin/env python3
"""Regression checks scoped exclusively to the Venice history book."""
import functools
import http.server
import pathlib
import re
import threading
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
PAGE = ROOT / "others" / "history" / "venice" / "index.html"
HTML = PAGE.read_text(encoding="utf-8")


class VeniceStaticTests(unittest.TestCase):
    def test_chapter_count_and_toc(self):
        headings = re.findall(r'<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)</h2>', HTML)
        links = re.findall(r'<li><a href="#chapter-(\d+)">(.*?)</a></li>', HTML)
        self.assertEqual(len(headings), 26)
        self.assertEqual(len(links), 26)
        self.assertEqual(headings, links)
        self.assertEqual([int(number) for number, _ in headings], list(range(1, 27)))

    def test_chronology_and_editorial_merge(self):
        headings = re.findall(r'<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)</h2>', HTML)
        title = [name for _, name in headings]
        index = lambda phrase: next(i for i, x in enumerate(title) if phrase in x)
        self.assertLess(index("১৩৪৮"), index("মারিনো ফালিয়েরো"))
        self.assertLess(index("মারিনো ফালিয়েরো"), index("চিওজ্জা"))
        self.assertLess(index("মোরোসিনা"), index("শেষ ডোজ লুদোভিকো মানিন"))
        self.assertEqual(title[16], "১৫০১–১৫২১: লোরেদান, মসলাবাণিজ্য ও ক্যামব্রের লিগের যুদ্ধ")
        self.assertEqual(title[17], "১৫২২–১৫৬৯: গ্রিত্তি, রেনেসাঁ, মুদ্রণ ও নাগরিক সমাজ")
        self.assertEqual(title[18], "১৫৭০–১৫৯০: সাইপ্রাসের অবরোধ, লেপান্তো ও নতুন মহামারি")
        self.assertLess(index("উস্কোক যুদ্ধ"), index("ক্রিটের দীর্ঘ যুদ্ধ"))
        self.assertLess(index("ক্রিটের দীর্ঘ যুদ্ধ"), index("মোরিয়ার অভিযান"))
        self.assertLess(index("মোরিয়ার অভিযান"), index("স্থবির শাসন"))
        self.assertIn("১২ মে ১৭৯৭", HTML)
        self.assertIn("১৭৮৯ সালের ৯ মার্চ", HTML)
        self.assertIn("১৫১৭ সালে উসমানীয় সুলতান প্রথম সেলিম", HTML)
        self.assertIn("১৪ মে ১৫০৯", HTML)
        self.assertIn("২৭ নভেম্বর ১৫৬০", HTML)
        self.assertIn("১২ মে ১৭৯৭", HTML)
        self.assertIn("আলুইকা", HTML)
        self.assertIn("আর্সেনাল", HTML)
        self.assertNotIn("১৫০১–১৫২০: মিসর", HTML)
        self.assertNotIn("১৫০১–১৫২১: লিওনার্দো লোরেদান", HTML)
        self.assertIn("১৪২৩ সালে মহামারি", HTML)
        self.assertIn("১৫১৬ সালের মার্চে", HTML)
        self.assertNotIn("১৭৮৮ সালে ডোজ নির্বাচিত", HTML)
        self.assertNotIn("শেষ ডোজ লুদোভিকো মানিনের জীবন: ১৭৮৮", HTML)
        self.assertNotIn("উৎস ও পরবর্তী পাঠ", HTML)

    def test_every_chapter_substantive(self):
        chapters = re.findall(r'<section class="others-chapter" id="chapter-\d+"><h2>.*?</h2>(.*?)</section>', HTML)
        self.assertEqual(len(chapters), 26)
        for number, chapter in enumerate(chapters, 1):
            self.assertGreaterEqual(chapter.count("<p>"), 8, f"chapter {number}")
            self.assertGreater(len(re.sub(r"<[^>]*>", "", chapter)), 2500, f"chapter {number}")

    def test_branding_canonical_and_footer(self):
        for expected in (
            'href="https://walid-ai.com/others/history/venice/"',
            "/walid-ai-approved-logo.png",
            "/others/assets/books.css",
            "/others/assets/reader.js",
            'class="others-toc-dialog"',
            'class="legal-footer"',
            'href="/about-us/"',
            'href="/privacy-policy/"',
            'href="/terms-of-service/"',
        ):
            self.assertIn(expected, HTML)
        self.assertEqual(HTML.count('class="legal-footer"'), 1)
        self.assertEqual(HTML.count('class="others-book-title"'), 1)



    def test_source_sensitive_historical_details(self):
        """Specific historical repairs must survive later narrative edits."""
        chapters = {
            int(number): body for number, body in re.findall(
                r'<section class="others-chapter" id="chapter-(\d+)"><h2>.*?</h2>(.*?)</section>',
                HTML, re.S,
            )
        }
        markers = {
            4: ("ওরসো", "ওত্তোন", "১০২৬"),
            5: ("১০৮২", "১০৯২", "লাতিন অনুলিপি"),
            7: ("১২০২", "১২০৩", "১২০৪", "কনস্টান্টিনোপল"),
            8: ("ক্রিট", "গ্রিকভাষী", "১২৬১"),
            9: ("১২৬৮", "একচল্লিশজন", "পঁচিশ"),
            10: ("আর্সেনাল", "নাবিকের মজুরি"),
            11: ("১৩৪৮", "উত্তরাধিকার"),
            13: ("১৬ আগস্ট ১৩৭৯", "কার্লো জেনো", "তুরিন", "তেনেদোস"),
            14: ("কারার্রা", "ভেরোনা", "১৪২৩"),
            15: ("জাকোপো", "১৪৫৪", "স্ফোর্ৎসা", "১৪৫৭"),
            16: ("ক্যাটেরিনা", "দ্বিতীয় জেমস", "তৃতীয় জেমস", "১৪৮৯"),
            17: ("১৪ মে ১৫০৯", "১৫১৬ সালের মার্চে", "মসলাবাণিজ্য"),
            19: ("ফামাগুস্তা", "লেপান্তো", "১৫৭৩"),
            20: ("২৭ নভেম্বর ১৫৬০", "১৫৯৭", "মোরোসিনা"),
            22: ("১৬৩০", "১৬৪৫", "১৬৬৯"),
            23: ("১৬৮৭", "১৭১৫", "২১ জুলাই ১৭১৮"),
            25: ("১৭৮৯ সালের ৯ মার্চ", "১২ মে ১৭৯৭", "১৭ অক্টোবর ১৭৯৭"),
            26: ("১৮৪৮", "১৮৬৬", "২০২০", "MOSE"),
        }
        self.assertEqual(sorted(chapters), list(range(1, 27)))
        for number, terms in markers.items():
            for term in terms:
                with self.subTest(chapter=number, term=term):
                    self.assertIn(term, chapters[number])

    def test_repeated_scene_regressions(self):
        chapters = dict(
            (int(number), body) for number, body in re.findall(
                r'<section class="others-chapter" id="chapter-(\d+)"><h2>.*?</h2>(.*?)</section>',
                HTML, re.S,
            )
        )
        self.assertEqual(chapters[13].count("১৩৭৯ সালে পোলার কাছে"), 1)
        self.assertIn("৮ আগস্ট ১৩৮১ সালের তুরিন", chapters[13])
        self.assertEqual(chapters[25].count("১৭৯৬ সালের ইতালীয় অভিযানে"), 0)
        self.assertNotIn("সমকালীন প্রমাণে নিশ্চিত", chapters[5])
        self.assertEqual(HTML.count('<link rel="canonical"'), 1)
        self.assertEqual(HTML.count('<footer class="legal-footer">'), 1)

class VeniceBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        try:
            from playwright.sync_api import sync_playwright
        except ImportError as exc:
            raise RuntimeError("Playwright must be installed: pip install playwright") from exc
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(headless=True)
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
        cls.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_address[1]}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        cls.browser.close()
        cls.playwright.stop()

    def check_layout(self, width, height, name):
        context = self.browser.new_context(viewport={"width": width, "height": height})
        page = context.new_page()
        response = page.goto(f"{self.base}/others/history/venice/", wait_until="domcontentloaded")
        self.assertEqual(response.status, 200)
        self.assertEqual(page.locator("section.others-chapter").count(), 26)
        self.assertEqual(page.locator("footer.legal-footer").count(), 1)
        self.assertEqual(page.locator("nav.others-toc a").count(), 26)
        self.assertTrue(page.locator(".others-brand img").is_visible())
        self.assertIn("SolaimanLipi", page.locator("body").evaluate("(el) => getComputedStyle(el).fontFamily"))
        self.assertFalse(page.evaluate("document.documentElement.scrollWidth > innerWidth + 3"),
                         f"horizontal overflow on {name}")
        page.locator(".others-toc-trigger").click()
        self.assertTrue(page.locator("#others-toc-panel").evaluate("(el) => el.open"))
        page.locator('#others-toc-panel a[href="#chapter-11"]').click()
        self.assertFalse(page.locator("#others-toc-panel").evaluate("(el) => el.open"))
        self.assertEqual(page.url.split("#")[-1], "chapter-11")
        page.locator("footer.legal-footer").scroll_into_view_if_needed()
        self.assertTrue(page.locator("footer.legal-footer").is_visible())
        artifact_dir = ROOT / "artifacts" / "venice-editorial"
        artifact_dir.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(artifact_dir / f"{name}.png"), full_page=False)
        context.close()

    def test_desktop(self):
        self.check_layout(1440, 900, "desktop")

    def test_mobile(self):
        self.check_layout(390, 844, "mobile")

    def test_tablet(self):
        self.check_layout(768, 1024, "tablet")


if __name__ == "__main__":
    unittest.main(verbosity=2)
