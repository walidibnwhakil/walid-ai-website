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
            self.assertGreaterEqual(len(paragraphs), 12, f"chapter {i}: {title}")
            self.assertGreater(len(body), 3700, f"chapter {i}: too thin")
            for paragraph in paragraphs:
                paragraph = re.sub(r"<[^>]+>", "", paragraph).strip()
                self.assertGreater(len(paragraph), 80, f"chapter {i}: filler")
                self.assertNotIn(paragraph, seen, f"chapter {i}: repeated paragraph")
                seen.add(paragraph)

    def test_all_seven_quests_and_their_resolutions(self):
        book = {i: title + " " + body for i, title, body in self.chapters}
        expected = {
            4: ["প্রথম প্রশ্ন", "হাওয়াইদা", "বৃদ্ধ", "হ্রদ", "শাহাবাদে ফিরে"],
            5: ["দ্বিতীয় প্রশ্ন", "ইউসুফ", "উত্তরাধিকারীদের", "বণ্টন"],
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
        self.assertIn("ঐতিহাসিক আরব কবি হাতেম", self.html)
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


    def test_literary_narrative_and_separate_reader_note(self):
        opening, _sep, rest = self.html.partition('<section class="others-chapter" id="chapter-1">')
        self.assertIn('<p class="others-note"><strong>পাঠপরিচিতি:', opening)
        self.assertIn('হাতেম-নামা', opening)
        self.assertIn('ঐতিহাসিক আরব কবি হাতেম', opening)
        self.assertIn('ভালুকরাজকন্যার', opening)
        for number, title, body in self.chapters:
            for interruption in (
                "কিস্সার বর্ণনায়", "কিস্সার ভিতরে", "কিস্সার নিয়মে",
                "এই অধ্যায়ে", "এই পুনর্কথনে", "বাস্তব চিকিৎসা",
                "কোনো রত্নের নথিভুক্ত ইতিহাস", "পুঁথিভেদে",
            ):
                self.assertNotIn(interruption, body, f"chapter {number}: editorial interruption")

    def test_main_characters_and_complete_folklore_arcs(self):
        book = {i: body for i, _title, body in self.chapters}
        expectations = {
            1: ("বুরজখ", "দরবেশ", "ধাত্রী", "উজির", "রত্ন"),
            2: ("শাহাবাদ", "আজরাক", "সাতটি শর্ত", "পঞ্চম শর্ত", "সপ্তম"),
            3: ("মুনির", "প্রতিকৃতি", "হাতেম", "ইয়েমেন", "সাক্ষীদের"),
            4: ("নেকড়ে", "শেয়াল", "হায়েনা", "ভালুক", "অজগর", "হ্রদ", "বৃদ্ধ"),
            5: ("নঈম", "গুহা", "ইউসুফ", "শাহমুহরা", "হারিস", "বণ্টন"),
            6: ("দালানের", "দস্যু", "দুটি রুটি", "দিনার", "নদী", "শাহাবাদ"),
            7: ("হামির", "আলকানপরি", "খাঁচা", "ফুল", "দৃষ্টি"),
            8: ("জারিনপোশ", "সাম আহমার", "কামলাক", "করম", "সত্য"),
            9: ("নিদা", "জাম", "মৃত্যু", "সমুদ্র", "শাহাবাদ"),
            10: ("মুক্তা", "নিতকা", "মাহইয়ার", "পরিরাজপুত্র", "দৈত্য"),
            11: ("বাদগিরদ", "কাতান", "প্রহরী", "কুয়া", "তোতাপাখি", "তৃতীয় তীর", "হীরা"),
            12: ("হুসন বানু", "মুনির", "বিবাহ", "জারিনপোশ", "ইয়েমেন", "পিতা"),
        }
        for chapter, terms in expectations.items():
            for term in terms:
                self.assertIn(term, book[chapter], f"chapter {chapter}: missing {term}")

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
