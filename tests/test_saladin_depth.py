"""Book-specific editorial and reader regression for Saladin/Ayyubids.

Run: python3 tests/test_saladin_depth.py
"""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / "others/history/saladin/index.html"
CHAPTER_RE = re.compile(
    r'<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)</h2>(.*?)</section>',
    re.S,
)
PARAGRAPH_RE = re.compile(r"<p>(.*?)</p>", re.S)
LINK_RE = re.compile(r'<li><a href="#chapter-(\d+)">(.*?)</a></li>')


def plain(text):
    return re.sub(r"<[^>]*>", "", text).strip()


class SaladinDepthTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = BOOK.read_text(encoding="utf-8")
        cls.chapters = CHAPTER_RE.findall(cls.html)

    def test_27_chapters_and_exact_toc_links(self):
        self.assertEqual(len(self.chapters), 27)
        self.assertEqual([int(n) for n, _, _ in self.chapters], list(range(1, 28)))
        toc = re.search(
            r'<nav class="others-toc" aria-label="অধ্যায় তালিকা">(.*?)</nav>',
            self.html, re.S,
        )
        self.assertIsNotNone(toc)
        self.assertIn("অধ্যায়সূচি — 27টি অধ্যায়", toc.group(1))
        self.assertEqual(
            [(int(n), title) for n, title in LINK_RE.findall(toc.group(1))],
            [(int(n), title) for n, title, _ in self.chapters],
        )

    def test_every_chapter_substantive(self):
        total = 0
        seen = set()
        for n, title, body in self.chapters:
            paragraphs = [plain(p) for p in PARAGRAPH_RE.findall(body)]
            words = sum(len(p.split()) for p in paragraphs)
            total += words
            with self.subTest(chapter=n, title=title):
                self.assertGreaterEqual(len(paragraphs), 14)
                self.assertGreaterEqual(words, 600)
                self.assertTrue(all(len(p.split()) >= 25 for p in paragraphs))
                for p in paragraphs:
                    self.assertNotIn(p, seen, "Duplicate paragraph")
                    seen.add(p)
        self.assertGreaterEqual(total, 18000)
        print(f"Saladin editorial depth: {total} words in 27 chapters")

    def test_chronological_context(self):
        expected = {
            1: "তাকরিত", 3: "প্রথম মিসর", 4: "দ্বিতীয় অভিযান",
            5: "তৃতীয় অভিযান", 6: "ফাতিমীয়", 8: "নূরুদ্দিনের মৃত্যু",
            9: "মঁজিসার", 10: "আলেপ্পো", 11: "মসুল",
            13: "হাত্তিন", 15: "জেরুজালেম", 17: "আক্কার দীর্ঘ",
            18: "রিচার্ড", 19: "জাফফা", 20: "মৃত্যু",
            21: "পুত্রদের দ্বন্দ্ব", 22: "আল-আদিল",
            23: "আল-কামিল", 25: "আস-সালিহ",
            26: "শাজার আদ-দুর", 27: "সিরিয়ার শেষ",
        }
        for number, term in expected.items():
            with self.subTest(chapter=number):
                self.assertIn(term, self.chapters[number - 1][1])
        self.assertNotIn("১২৫০", self.chapters[6][2])  # No 1250 flash-forward in his early career
        self.assertNotIn("১১৯০", self.chapters[15][2]) # German emperor's fate belongs with Acre
        self.assertIn("৪ মার্চ ১১৯৩", self.chapters[19][2])

    def test_reader_branding_search_and_layout_contract(self):
        required = (
            'href="https://walid-ai.com/others/history/saladin/"',
            '/others/assets/books.css',
            '/walid-legal.css',
            '/others/assets/reader.js',
            'src="/walid-ai-approved-logo.png"',
            'class="others-toc-dialog"',
            'class="others-toc-trigger"',
            'class="legal-footer"',
        )
        for item in required:
            with self.subTest(item=item):
                self.assertIn(item, self.html)
        self.assertEqual(self.html.count('class="legal-footer"'), 1)
        self.assertEqual(self.html.count('<meta name="description"'), 1)
        self.assertEqual(self.html.count('<link rel="canonical"'), 1)
        self.assertNotIn('class="others-sources"', self.html)
        self.assertNotIn("উৎস ও পরবর্তী পাঠ", self.html)
        self.assertNotIn("নিচের বই", self.html)


if __name__ == "__main__":
    unittest.main(verbosity=2)
