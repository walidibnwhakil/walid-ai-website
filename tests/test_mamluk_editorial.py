#!/usr/bin/env python3
"""Mamluk-only editorial, provenance, and responsive reader regression suite.

Usage:
    python3 tests/test_mamluk_editorial.py
Browser cases require Playwright and its Chromium installation.
"""
import functools
import http.server
import json
import pathlib
import re
import threading
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
PAGE = ROOT / "others/history/mamluk-sultanate/index.html"
HTML = PAGE.read_text(encoding="utf-8")
CHAPTER_RE = re.compile(
    r'<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)</h2>(.*?)</section>',
    re.S,
)
TOC_RE = re.compile(r'<li><a href="#chapter-(\d+)">(.*?)</a></li>')
PARAGRAPH_RE = re.compile(r"<p>(.*?)</p>", re.S)
CHAPTERS = CHAPTER_RE.findall(HTML)


def text_only(markup):
    return re.sub(r"<[^>]*>", "", markup).strip()


class MamlukEditorialTests(unittest.TestCase):
    def test_all_chapters_and_toc_match_exactly(self):
        self.assertEqual(len(CHAPTERS), 17)
        self.assertEqual([int(number) for number, _, _ in CHAPTERS],
                         list(range(1, 18)))
        self.assertEqual(
            [(int(number), title) for number, title in TOC_RE.findall(HTML)],
            [(int(number), title) for number, title, _ in CHAPTERS],
        )
        self.assertIn("অধ্যায়সূচি — ১৭টি অধ্যায়", HTML)

    def test_substantive_narrative_and_no_identical_repetition(self):
        seen = set()
        total_words = 0
        for number, title, body in CHAPTERS:
            paragraphs = [text_only(p) for p in PARAGRAPH_RE.findall(body)]
            word_count = sum(len(p.split()) for p in paragraphs)
            total_words += word_count
            with self.subTest(chapter=number, title=title):
                self.assertGreaterEqual(len(paragraphs), 10)
                self.assertGreaterEqual(word_count, 580)
                self.assertTrue(all(len(p) >= 130 for p in paragraphs))
                for paragraph in paragraphs:
                    self.assertNotIn(paragraph, seen, "Duplicate paragraph")
                    seen.add(paragraph)
        self.assertGreaterEqual(total_words, 14500)
        print("MAMLUK_EDITORIAL_DEPTH_PASS", total_words, "words",
              len(seen), "unique paragraphs")

    def test_related_paragraphs_avoid_repeating_the_same_event(self):
        """Keep distinct the cause, action, outcome, and succession paragraphs."""
        passages = {
            int(number): [text_only(p) for p in PARAGRAPH_RE.findall(body)]
            for number, _, body in CHAPTERS
        }
        # (chapter, paragraph owning this detail, neighboring paragraph, cue)
        ownership = [
            (2, 9, 8, "১২৫৪"),
            (3, 5, 6, "১২৫৯"),
            (4, 5, 6, "বায়বার্স"),
            (4, 9, 7, "ইলখানাত"),
            (4, 10, 11, "আলেপ্পোর"),
            (4, 11, 10, "অক্টোবরে"),
            (5, 9, 10, "এলবিস্তানের"),
            (5, 10, 9, "বেরকে"),
            (7, 12, 13, "বাইদারা"),
            (7, 13, 12, "১২৯৩"),
            (7, 14, 13, "আল-নাসির"),
            (8, 5, 6, "১৩০৯"),
            (8, 6, 5, "১৩১০"),
            (8, 10, 9, "১৩২৩"),
            (11, 14, 13, "১৪১২"),
            (13, 8, 7, "১৪৫৩"),
            (13, 11, 10, "১৪৬১"),
            (17, 9, 8, "১৮১১"),
        ]
        for chapter, owned_by, not_in, cue in ownership:
            with self.subTest(chapter=chapter, cue=cue):
                self.assertIn(cue, passages[chapter][owned_by - 1])
                self.assertNotIn(cue, passages[chapter][not_in - 1])

    def test_people_events_and_chronology_anchors(self):
        required = {
            1: ("ইকতা", "বাহরি", "আস-সালিহ"),
            2: ("শাজার আদ-দুর", "তুরান শাহ", "আইবেক"),
            3: ("হুলাগু", "কুতুজ", "আল-মনসুর"),
            4: ("৩ সেপ্টেম্বর", "বায়বার্স", "কিতবুকা", "অক্টোবর"),
            5: ("বেরকে খান", "বারাকা", "গাজিয়া"),
            6: ("গাজিয়া", "আশলুন", "খলিল", "হোমস"),
            7: ("১৮ মে", "টেম্পলার", "বাইদারা"),
            8: ("১৩১০", "খাওয়ান্দ তুঘাই", "১৩২৩"),
            9: ("কুসুন", "১৩৪৮", "ইয়ালবুঘা"),
            10: ("বারকুক", "১৩৮৯", "ফারাজ"),
            11: ("ইবন খালদুন", "১৪০৫", "১৪১২"),
            12: ("১৪২৬", "জানুস", "বার্সবাই", "সাইপ্রাস"),
            13: ("জাকমাক", "ইনাল", "খুশকদাম"),
            14: ("১৪৮৫", "১৪৯১", "কায়তবাই"),
            15: ("মারজ দাবিক", "১৫০৮", "১৫০৯", "২৪ আগস্ট"),
            16: ("খান ইউনুস", "২২ জানুয়ারি", "সিনান পাশা", "১৩ এপ্রিল"),
            17: ("১৮১১", "১৫১৭", "উসমানীয়"),
        }
        for number, _, body in CHAPTERS:
            with self.subTest(chapter=number):
                for token in required[int(number)]:
                    self.assertIn(token, text_only(body))
        self.assertLess(HTML.index('id="chapter-4"'), HTML.index('id="chapter-7"'))
        self.assertLess(HTML.index('id="chapter-11"'), HTML.index('id="chapter-13"'))
        self.assertLess(HTML.index('id="chapter-15"'), HTML.index('id="chapter-16"'))

    def test_preserved_shell_brand_canonical_footer(self):
        for token in (
            '<html lang="bn">',
            'rel="canonical" href="https://walid-ai.com/others/history/mamluk-sultanate/"',
            'href="/others/assets/books.css?v=20261121-editorial"',
            'src="/walid-ai-approved-logo.png"',
            'src="/others/assets/reader.js?v=20261121-editorial"',
            'class="others-book-title"',
            'class="others-toc-dialog"',
            'class="others-toc-trigger"',
            'class="legal-footer"',
            'href="/about-us/"',
            'href="/contact-us/"',
            'href="/privacy-policy/"',
            'href="/terms-of-service/"',
        ):
            with self.subTest(token=token):
                self.assertIn(token, HTML)
        self.assertEqual(HTML.count('class="legal-footer"'), 1)
        self.assertEqual(HTML.count('class="others-book-title"'), 1)
        self.assertEqual(HTML.count('rel="canonical"'), 1)
        self.assertNotIn("উৎস ও পরবর্তী পাঠ", HTML)
        self.assertNotIn('class="others-sources"', HTML)
        self.assertNotIn('class="others-next"', HTML)
        self.assertNotIn("<meta name=\"robots\" content=\"noindex", HTML)

    def test_research_citations_remain_nonvisible_json_ld(self):
        match = re.search(
            r'<script id="mamluk-source-metadata" type="application/ld\+json">(.*?)</script>',
            HTML, re.S,
        )
        self.assertIsNotNone(match, "Missing source metadata")
        data = json.loads(match.group(1))
        self.assertEqual(data.get("@type"), "Book")
        self.assertEqual(data.get("inLanguage"), "bn")
        self.assertEqual(data.get("url"),
                         "https://walid-ai.com/others/history/mamluk-sultanate/")
        self.assertGreaterEqual(len(data["citation"]), 8)
        self.assertTrue(all(c["url"].startswith("https://") and c["name"]
                            for c in data["citation"]))


class MamlukBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        try:
            from playwright.sync_api import sync_playwright
        except ImportError as exc:
            raise RuntimeError("Install playwright and chromium for browser QA") from exc
        cls._pw = sync_playwright().start()
        cls.browser = cls._pw.chromium.launch(headless=True)
        handler = functools.partial(http.server.SimpleHTTPRequestHandler,
                                    directory=str(ROOT))
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
        cls._pw.stop()

    def check_viewport(self, width, height, label):
        context = self.browser.new_context(
            viewport={"width": width, "height": height},
            device_scale_factor=1,
        )
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        try:
            response = page.goto(
                f"{self.base}/others/history/mamluk-sultanate/",
                wait_until="domcontentloaded",
            )
            self.assertEqual(response.status, 200)
            self.assertEqual(page.locator(".others-chapter").count(), 17)
            self.assertEqual(page.locator(".others-toc a").count(), 17)
            self.assertEqual(page.locator("footer.legal-footer").count(), 1)
            self.assertTrue(page.locator(".others-brand img").is_visible())
            self.assertTrue(page.locator(".others-brand img").evaluate(
                "(image) => image.complete && image.naturalWidth > 0"))
            result = page.evaluate("""() => ({
                viewport: innerWidth,
                pageWidth: document.documentElement.scrollWidth,
                font: getComputedStyle(
                    document.querySelector('.others-chapter p')
                ).fontFamily,
                kathgolap: getComputedStyle(
                    document.body, '::before'
                ).backgroundImage.includes('walid-ai-approved-flower.png'),
                footerLinks: Array.from(document.querySelectorAll(
                    '.legal-footer a'
                ), a => a.getAttribute('href')),
                chapterIds: Array.from(document.querySelectorAll(
                    '.others-chapter'
                ), s => s.id),
                tocHrefs: Array.from(document.querySelectorAll(
                    '.others-toc a'
                ), a => a.getAttribute('href')),
            })""")
            self.assertLessEqual(result["pageWidth"], width + 2,
                                 f"Horizontal overflow at {label}: {result}")
            self.assertIn("SolaimanLipi", result["font"])
            self.assertTrue(result["kathgolap"])
            self.assertEqual(result["chapterIds"],
                             [f"chapter-{i}" for i in range(1, 18)])
            self.assertEqual(result["tocHrefs"],
                             [f"#chapter-{i}" for i in range(1, 18)])
            self.assertEqual(result["footerLinks"], [
                "/about-us/", "/contact-us/", "/privacy-policy/",
                "/terms-of-service/",
            ])
            page.locator(".others-toc-trigger").click()
            self.assertTrue(page.locator("#others-toc-panel").evaluate(
                "(dialog) => dialog.open"))
            bounds = page.locator("#others-toc-panel").bounding_box()
            self.assertGreaterEqual(bounds["x"], -2)
            self.assertLessEqual(bounds["x"] + bounds["width"], width + 2)
            page.locator('#others-toc-panel a[href="#chapter-16"]').click()
            self.assertEqual(page.url.split("#")[-1], "chapter-16")
            self.assertFalse(page.locator("#others-toc-panel").evaluate(
                "(dialog) => dialog.open"))
            page.locator(".others-toc-trigger").click()
            page.keyboard.press("Escape")
            self.assertFalse(page.locator("#others-toc-panel").evaluate(
                "(dialog) => dialog.open"))
            page.locator("footer.legal-footer").scroll_into_view_if_needed()
            self.assertTrue(page.locator("footer.legal-footer").is_visible())
            self.assertEqual(errors, [], "Reader JS raised a runtime error")
            output = ROOT / "artifacts/mamluk-editorial"
            output.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(output / f"{label}.png"),
                            full_page=False)
            print("MAMLUK_BROWSER_PASS", label, result["pageWidth"])
        finally:
            context.close()

    def test_mobile_320(self):
        self.check_viewport(320, 720, "mobile-320")

    def test_mobile_390(self):
        self.check_viewport(390, 844, "mobile-390")

    def test_tablet_768(self):
        self.check_viewport(768, 1024, "tablet-768")

    def test_desktop_1440(self):
        self.check_viewport(1440, 900, "desktop-1440")


if __name__ == "__main__":
    unittest.main(verbosity=2)
