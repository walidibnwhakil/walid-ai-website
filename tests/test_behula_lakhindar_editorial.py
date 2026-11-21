"""Book-scoped editorial and reader regression for Behula–Lakhindar."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "others/folklore/behula-lakhindar/index.html"
CANONICAL = "https://walid-ai.com/others/folklore/behula-lakhindar/"


class BehulaEditorialContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = PATH.read_text(encoding="utf-8")
        cls.chapters = [
            (int(number), title, re.findall(r"<p>(.*?)</p>", body, re.S))
            for number, title, body in re.findall(
                r'<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)</h2>(.*?)</section>',
                cls.html, re.S,
            )
        ]

    def test_reader_structure_and_chapter_navigation(self):
        self.assertEqual([n for n, _, _ in self.chapters], list(range(1, 14)))
        self.assertEqual([int(n) for n in re.findall(r'href="#chapter-(\d+)"', self.html)], list(range(1, 14)))
        self.assertIn("অধ্যায়সূচি — 13টি অধ্যায়", self.html)
        self.assertEqual(self.html.count('class="others-toc-dialog"'), 1)
        self.assertIn('class="others-toc-trigger"', self.html)
        self.assertIn("/others/assets/reader.js", self.html)
        self.assertEqual(len(set(title for _, title, _ in self.chapters)), 13)

    def test_literary_depth_and_no_pasted_repetition(self):
        bodies = []
        for number, title, paragraphs in self.chapters:
            self.assertGreaterEqual(len(paragraphs), 11, f"Chapter {number}: abbreviated scene")
            plain = [re.sub(r"<[^>]+>", "", p).strip() for p in paragraphs]
            words = sum(len(p.split()) for p in plain)
            self.assertGreaterEqual(words, 500, f"Chapter {number}: only {words} words")
            self.assertTrue(all(len(p) > 100 for p in plain), f"Chapter {number}: filler fragment")
            bodies.extend(plain)
        self.assertEqual(len(bodies), len(set(bodies)), "Identical paragraphs copied")
        self.assertGreaterEqual(sum(len(p.split()) for p in bodies), 8500)
        for forbidden in ("এই অধ্যায়ে আলোচনা", "পরের অধ্যায়ে আলোচনা", "উৎস ও পরবর্তী পাঠ", "Walid AI Reading Library"):
            self.assertNotIn(forbidden, self.html)

    def test_chronological_literary_anchors(self):
        anchors = {
            1: ("চম্পকনগর", "চাঁদ", "সনকা", "মনসা"),
            2: ("সনকা", "অর্ঘ্য", "ঘট", "শিব"),
            3: ("সপ্তডিঙা", "নৌবহর", "সনকা"),
            4: ("ছয় পুত্র", "লখিন্দর", "বধূ"),
            5: ("উজানীনগর", "সায়বেন", "বেহুলা", "লখিন্দর"),
            6: ("লোহার", "ছিদ্র", "কারিগর", "কালনাগিনী"),
            7: ("কালনাগিনী", "ছোবল", "বেহুলা", "লখিন্দর"),
            8: ("কলাগাছ", "ভেলা", "সনকা", "দেহ"),
            9: ("গোদা", "ধনা", "মনা", "ডোম", "নারায়ণ দানী", "ধোপানি"),
            10: ("নেতাই", "ধোপানি", "দেবসভা"),
            11: ("দেবসভা", "নৃত্য", "মনসা", "ছয়"),
            12: ("লখিন্দর", "প্রাণ", "চম্পকনগর", "সনকা"),
            13: ("বাম হাতে", "মনসা", "সনকা", "বেহুলা"),
        }
        for number, _, paragraphs in self.chapters:
            text = " ".join(paragraphs)
            for phrase in anchors[number]:
                self.assertIn(phrase, text, f"Chapter {number} lost {phrase}")
        self.assertIn("বিপ্রদাস পিপিলাই", self.html)
        self.assertIn("বিজয় গুপ্ত", self.html)
        self.assertIn("পাঠভেদ", self.html)

    def test_brand_seo_footer_and_removed_links(self):
        for token in (
            'lang="bn"', '<meta name="description" content=', 'rel="canonical" href="' + CANONICAL + '"',
            '/walid-ai-approved-logo.png', '/others/assets/books.css',
            'class="legal-footer"', '/walid-legal.css', '/about-us/', '/contact-us/',
            '/privacy-policy/', '/terms-of-service/',
        ):
            self.assertIn(token, self.html)
        self.assertEqual(self.html.count('class="legal-footer"'), 1)
        self.assertNotIn('class="others-sources"', self.html)
        self.assertNotIn('class="others-next"', self.html)
        self.assertNotIn("content=\"undefined\"", self.html)


if __name__ == "__main__":
    unittest.main()
