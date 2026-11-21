"""Focused editorial and page-contract checks for the Ottoman history book."""
from pathlib import Path
import re
import unittest

PAGE = Path(__file__).resolve().parents[1] / "others/history/ottoman-empire/index.html"
EXPECTED = [
    "এরতুঘরুল", "উসমান প্রথম", "ওরহান", "প্রথম মুরাদ", "প্রথম বায়েজিদ",
    "অন্তর্বর্তীকাল", "প্রথম মেহমেদ", "দ্বিতীয় মুরাদ", "দ্বিতীয় মেহমেদ",
    "দ্বিতীয় বায়েজিদ", "প্রথম সেলিম", "প্রথম সুলেমান", "দ্বিতীয় সেলিম",
    "তৃতীয় মুরাদ", "তৃতীয় মেহমেদ", "প্রথম আহমেদ", "প্রথম মুস্তাফা",
    "দ্বিতীয় উসমান", "চতুর্থ মুরাদ", "ইব্রাহিম", "চতুর্থ মেহমেদ",
    "দ্বিতীয় সুলেমান", "দ্বিতীয় আহমেদ", "দ্বিতীয় মুস্তাফা",
    "তৃতীয় আহমেদ", "প্রথম মাহমুদ", "তৃতীয় উসমান", "তৃতীয় মুস্তাফা",
    "প্রথম আবদুলহামিদ", "তৃতীয় সেলিম", "চতুর্থ মুস্তাফা",
    "দ্বিতীয় মাহমুদ", "প্রথম আবদুলমজিদ", "আবদুলআজিজ", "পঞ্চম মুরাদ",
    "দ্বিতীয় আবদুলহামিদ", "পঞ্চম মেহমেদ", "ষষ্ঠ মেহমেদ"
]
TEXT = PAGE.read_text(encoding="utf-8")
SECTIONS = re.findall(r'<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)</h2>(.*?)</section>', TEXT, re.S)
LINKS = re.findall(r'<a href="#chapter-(\d+)">([^<]+)</a>', TEXT)

class OttomanEditorialTests(unittest.TestCase):
    def test_chapter_order_and_toc(self):
        self.assertEqual(len(SECTIONS), 38)
        self.assertEqual(len(LINKS), 38)
        self.assertIn("৩৮টি অধ্যায়", TEXT)
        for i, (number, title, content) in enumerate(SECTIONS, 1):
            self.assertEqual(int(number), i)
            self.assertIn(EXPECTED[i-1], title)
            self.assertEqual((str(i), title), LINKS[i-1])
            self.assertGreaterEqual(content.count("<p>"), 5, f"Chapter {i}")
        self.assertEqual(len({title for _,title,_ in SECTIONS}), 38)

    def test_reign_material_not_detached(self):
        contents = {int(n): html for n, _, html in SECTIONS}
        for name in ["হুররেম", "মাহিদেভরান", "মিহরিমাহ", "ইব্রাহিম পাশা", "রুস্তেম", "মুস্তাফা", "বায়েজিদ", "জিহাঙ্গীর"]:
            self.assertIn(name, contents[12], f"Suleiman missing {name}")
        for n, name in [(9, "জেম"), (11, "পিরি মেহমেদ"), (16, "কসেম"),
                        (18, "ইয়েদিকুল"), (19, "কসেম"), (21, "তুরহান"),
                        (21, "কোপ্রুলু"), (37, "কৃষ্ণসাগর"), (37, "আর্মেনীয় গণহত্যা"),
                        (38, "সানরেমো"), (38, "১৯৫২"), (38, "১৯৭৪")]:
            self.assertIn(name, contents[n], f"Chapter {n} missing {name}")
        old_detached = ("হুররেম সুলতান:", "কসেম সুলতান:", "তুরহান সুলতান:",
                        "দ্বিতীয় উসমানের হত্যা:", "প্রথম বিশ্বযুদ্ধে যোগদানের সিদ্ধান্ত:")
        self.assertFalse(any(t.startswith(old_detached) for _,t,_ in SECTIONS))

    def test_no_duplicate_prose_or_empty_sections(self):
        paragraphs = [re.sub(r'<[^>]+>', "", p).strip()
                      for _,_,block in SECTIONS
                      for p in re.findall(r"<p>(.*?)</p>", block, re.S)]
        self.assertGreater(len(paragraphs), 340)
        self.assertEqual(len(paragraphs),len(set(paragraphs)))
        self.assertTrue(all(len(p) >= 100 for p in paragraphs))

    def test_brand_links_and_policy_unchanged(self):
        for required in ('href="https://walid-ai.com/others/history/ottoman-empire/"',
                         'href="/others/assets/books.css?v=20261121-solaiman"',
                         '/others/assets/reader.js?v=20261120-sidebar',
                         '/walid-ai-approved-logo.png', 'class="legal-footer"',
                         'href="/about-us/"', 'href="/privacy-policy/"'):
            self.assertIn(required, TEXT)
        self.assertEqual(TEXT.count('class="legal-footer"'), 1)
        self.assertNotIn('class="others-sources"', TEXT)
        self.assertNotIn('class="others-next"', TEXT)
        self.assertNotIn('noindex', TEXT)

if __name__ == "__main__":
    unittest.main()
