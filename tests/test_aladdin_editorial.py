"""Aladdin-only editorial, chronology, reader shell and TOC regression."""
from pathlib import Path
import re
import unittest

BOOK = Path(__file__).resolve().parents[1] / "others/islamic-literature/aladdin/index.html"
TITLES = [
    "দর্জির ঘর ও মিথ্যা চাচা",
    "পাহাড়ের গুহা ও রহস্যময় প্রদীপ",
    "অন্ধকারে আংটি, মুক্তির পথ",
    "প্রদীপের জিনি ও নতুন জীবনের শুরু",
    "বদরুলবুদুরকে দেখা ও সুলতানের দরবার",
    "উজিরপুত্রের বাধা ও বিবাহের প্রতিশ্রুতি",
    "বিবাহ, প্রাসাদ ও রাজদরবারের নতুন জীবন",
    "পুরোনো প্রদীপের বিনিময়ে সর্বনাশ",
    "আংটির জিনি ও দূরদেশে পুনর্মিলন",
    "বদরুলবুদুরের কৌশলে প্রদীপ উদ্ধার",
    "ফাতিমার ছদ্মবেশ ও শেষ ষড়যন্ত্র",
    "প্রত্যাবর্তনের পর রাজ্যের নতুন দিন",
]

class AladdinEditorial(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.page = BOOK.read_text(encoding="utf-8")
        cls.chapters = re.findall(
            r'<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)</h2>(.*?)</section>',
            cls.page, re.S,
        )

    def test_exact_chapters_toc_and_order(self):
        self.assertEqual(len(self.chapters), 12)
        self.assertEqual([int(n) for n, _, _ in self.chapters], list(range(1, 13)))
        self.assertEqual([title for _, title, _ in self.chapters], TITLES)
        links = re.findall(r'<li><a href="#chapter-(\d+)">(.*?)</a></li>', self.page)
        self.assertEqual(links, [(str(i), title) for i, title in enumerate(TITLES, 1)])
        self.assertIn("অধ্যায়সূচি — 12টি অধ্যায়", self.page)
        self.assertEqual(self.page.count('class="others-toc-dialog"'), 1)
        self.assertEqual(self.page.count('class="others-toc-trigger"'), 1)

    def test_substantial_nonduplicated_narrative(self):
        seen = set()
        for n, title, body in self.chapters:
            paragraphs = re.findall(r"<p>(.*?)</p>", body, re.S)
            self.assertGreaterEqual(len(paragraphs), 7, title)
            plain = re.sub(r"<[^>]+>", "", " ".join(paragraphs))
            self.assertGreaterEqual(len(plain.split()), 320, title)
            for p in paragraphs:
                self.assertGreaterEqual(len(p), 120, f"Thin paragraph: chapter {n}")
                self.assertNotIn(p, seen, f"Duplicate paragraph: chapter {n}")
                seen.add(p)
            self.assertNotIn("এই অধ্যায়", plain)

    def test_rescue_occurs_after_reunion_only_once(self):
        texts = [body for _, _, body in self.chapters]
        self.assertIn("আংটি", texts[2])
        self.assertIn("জিনি", texts[3])
        self.assertIn("উজিরপুত্রের", texts[5])
        self.assertIn("প্রদীপটি ফেরিওয়ালার", texts[7])
        self.assertIn("প্রাসাদটি দাঁড়িয়ে", texts[8])
        self.assertIn("পুনর্মিলন", TITLES[8])
        self.assertNotIn("পুরো প্রাসাদকে আগের জায়গায়", texts[8])
        self.assertIn("পুরো প্রাসাদকে আগের জায়গায়", texts[9])
        self.assertIn("সুলতান সকালে", texts[9])
        self.assertIn("ফাতিমা", texts[10])
        self.assertIn("রোখ", texts[10])
        self.assertIn("সুলতানের মৃত্যু", texts[11])
        for n in [7, 8, 9]:
            self.assertIn("বদরুলবুদুর", texts[n])
        self.assertEqual(self.page.count("পুরো প্রাসাদকে আগের জায়গায়"), 1)

    def test_branding_fonts_seo_footer_ads_and_no_legacy_blocks(self):
        required = (
            '/walid-ai-approved-logo.png',
            '/others/assets/books.css?v=20261121-solaiman',
            '/others/assets/reader.js?v=20261120-sidebar',
            '<link rel="canonical" href="https://walid-ai.com/others/islamic-literature/aladdin/">',
            '<meta name="description"',
            '<footer class="legal-footer">',
            'href="/privacy-policy/"',
            'href="/terms-of-service/"',
        )
        for item in required:
            self.assertIn(item, self.page)
        self.assertEqual(self.page.count('class="legal-footer"'), 1)
        self.assertEqual(self.page.count('<header class="others-book-title">'), 1)
        self.assertNotIn("উৎস ও পরবর্তী পাঠ", self.page)
        self.assertNotIn('class="others-sources"', self.page)
        self.assertNotIn('class="others-next"', self.page)
        self.assertNotIn('adsbygoogle', self.page)
        self.assertTrue(self.page.endswith("</body></html>"))

if __name__ == "__main__":
    unittest.main(verbosity=2)
