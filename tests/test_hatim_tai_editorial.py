"""Book-scoped editorial regression tests for the seven Hatim Tai quests.

No other Others book or shared theme file is changed by this test.
"""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "others/islamic-literature/hatim-tai/index.html"


class HatimTaiEditorialTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = PAGE.read_text(encoding="utf-8")
        cls.chapters = [
            (int(i), title, body)
            for i, title, body in re.findall(
                r'<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)</h2>(.*?)</section>',
                cls.html, re.S
            )
        ]
        cls.links = [
            (int(i), title)
            for i, title in re.findall(r'<li><a href="#chapter-(\d+)">(.*?)</a></li>', cls.html)
        ]

    def test_chapters_and_table_of_contents_match(self):
        self.assertEqual([i for i, _, _ in self.chapters], list(range(1, 13)))
        self.assertEqual(self.links, [(i, title) for i, title, _ in self.chapters])
        self.assertIn("অধ্যায়সূচি — 12টি অধ্যায়", self.html)

    def test_every_chapter_is_developed(self):
        seen = set()
        for i, title, body in self.chapters:
            paragraphs = re.findall(r"<p>(.*?)</p>", body, re.S)
            self.assertGreaterEqual(len(paragraphs), 8, f"chapter {i}: {title}")
            self.assertGreater(len(body), 2300, f"chapter {i}: too thin")
            for paragraph in paragraphs:
                paragraph = re.sub(r"<[^>]+>", "", paragraph).strip()
                self.assertGreater(len(paragraph), 80, f"chapter {i}: filler")
                self.assertNotIn(paragraph, seen, f"chapter {i}: repeated paragraph")
                seen.add(paragraph)

    def test_all_seven_quests_and_their_resolutions(self):
        book = {i: title + " " + body for i, title, body in self.chapters}
        expected = {
            4: ["প্রথম প্রশ্ন", "হাওয়াইদা", "বৃদ্ধ", "হ্রদ", "শাহাবাদে ফিরে"],
            5: ["দ্বিতীয় প্রশ্ন", "ইউসুফ", "উত্তরাধিকারীদের", "বণ্টিত"],
            6: ["দ্বিতীয় প্রশ্নের উত্তর", "দুটি রুটি", "নদী", "শাহাবাদে ফিরে"],
            7: ["তৃতীয় প্রশ্ন", "হামির", "খাঁচা", "আলোর ফুল", "দৃষ্টি ফিরে"],
            8: ["চতুর্থ প্রশ্ন", "সত্য", "করম", "সাম আহমার", "জারিনপোশ"],
            9: ["পঞ্চম প্রশ্ন", "নিদা", "জাম", "মৃত্যু", "শাহাবাদের"],
            10: ["ষষ্ঠ প্রশ্ন", "মুক্তা", "মাহইয়ার", "দ্বিতীয় মুক্তা", "শর্ত পূর্ণ"],
            11: ["সপ্তম প্রশ্ন", "বাদগিরদ", "তিনটি তীর", "তোতাপাখি", "হীরা", "পাথর"],
        }
        for chapter, terms in expected.items():
            for term in terms:
                self.assertIn(term, book[chapter], f"chapter {chapter}: missing {term}")
        self.assertIn("মুনির", book[12])
        self.assertIn("বিবাহ", book[12])
        self.assertIn("ঐতিহাসিক হাতেম", book[12])
        self.assertIn("জারিনপোশ", book[12])

    def test_seventh_question_is_a_single_complete_story(self):
        seventh = self.chapters[10][2]
        self.assertIn("কুয়ার", seventh)
        self.assertIn("কাতান", seventh)
        self.assertIn("স্নানাগার", seventh)
        self.assertIn("তৃতীয় তীর", seventh)
        self.assertIn("জীবিত হয়ে ওঠে", seventh)
        self.assertNotIn("হাম্মাম বাদগিরদ", self.chapters[9][1], "sixth question must not be split")
        self.assertTrue(self.chapters[11][1].startswith("সাত উত্তর"))

    def test_design_canonical_footer_and_ads_remain_untouched(self):
        for required in (
            '<html lang="bn">',
            '/walid-ai-approved-logo.png',
            '/others/assets/books.css?v=20261121-solaiman',
            '/others/assets/reader.js?v=20261120-sidebar',
            'class="others-toc-trigger"',
            'class="others-toc-dialog"',
            'href="https://walid-ai.com/others/islamic-literature/hatim-tai/"',
            'class="legal-footer"',
            '/privacy-policy/',
            '/terms-of-service/',
        ):
            self.assertIn(required, self.html)
        self.assertEqual(self.html.count('class="legal-footer"'), 1)
        self.assertNotIn("উৎস ও পরবর্তী পাঠ", self.html)
        self.assertNotIn('class="others-sources"', self.html)
        self.assertNotIn('class="others-next"', self.html)
        self.assertNotRegex(self.html, r'<meta[^>]+noindex')


if __name__ == "__main__":
    unittest.main()
