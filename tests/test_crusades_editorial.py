"""Crusades volume-only editorial, chronology, and reading-contract checks."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / "others/history/crusades/index.html"
CANONICAL = "https://walid-ai.com/others/history/crusades/"

class CrusadesEditorialTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.page = BOOK.read_text(encoding="utf-8")
        cls.chapters = re.findall(
            r'<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)</h2>(.*?)</section>',
            cls.page, re.S)

    def test_chronological_chapters_and_toc(self):
        ids = [int(n) for n, _, _ in self.chapters]
        toc = [int(n) for n in re.findall(r'href="#chapter-(\d+)"', self.page)]
        self.assertEqual(ids, list(range(1, 22)))
        self.assertEqual(toc, ids)
        self.assertIn("অধ্যায়সূচি — 21টি অধ্যায়", self.page)
        self.assertEqual(len(set(title for _, title, _ in self.chapters)), 21)

    def test_substantial_unique_narrative(self):
        all_paragraphs = []
        for number, title, body in self.chapters:
            paragraphs = [re.sub(r"<[^>]+>", "", p) for p in re.findall(r"<p>(.*?)</p>", body, re.S)]
            self.assertGreaterEqual(len(paragraphs), 11, "Short chapter " + number)
            self.assertGreaterEqual(sum(len(p) for p in paragraphs), 3800, "Thin narrative " + title)
            self.assertTrue(all(len(p.strip()) >= 90 for p in paragraphs), "Fragment " + title)
            all_paragraphs.extend(paragraphs)
        self.assertGreaterEqual(len(all_paragraphs), 275)
        self.assertEqual(len(all_paragraphs), len(set(all_paragraphs)))
        self.assertGreaterEqual(len(self.page), 100000)
        self.assertNotIn("এই অধ্যায়", self.page)

    def test_major_events_in_order(self):
        required = {
            3: ("রাইনল্যান্ড", "ইহুদি", "১০৯৬"),
            4: ("নাইসিয়া", "আন্টিওক", "১০৯৮"),
            5: ("১৫ জুলাই ১০৯৯", "হত্যাযজ্ঞ"),
            9: ("দ্বিতীয় ক্রুসেড", "দামেস্ক"),
            11: ("হাত্তিন", "১১৮৭"),
            12: ("২ অক্টোবর ১১৮৭", "মুক্তিপণ"),
            13: ("আক্কা", "আরসুফ", "জাফফা"),
            14: ("১২০৪", "কনস্টান্টিনোপল"),
            15: ("দামিয়েত্তা", "১২২১"),
            16: ("১২২৯", "আল-কামিল"),
            17: ("১২৪৪", "লা ফরবি"),
            18: ("মানসুরা", "শাজার আদ-দুর"),
            19: ("তিউনিস", "১২৭০"),
            20: ("১২৯১", "আক্কা", "কালাউন"),
        }
        for chapter, terms in required.items():
            narrative = self.chapters[chapter - 1][2]
            for term in terms:
                self.assertIn(term, narrative, "Missing " + term + " in chapter " + str(chapter))


    def test_key_people_and_controversies_in_their_eras(self):
        important = {
            1: ("আরবান", "ক্লেরমোঁ"),
            2: ("আলেক্সিওস", "কিলিজ আরসলান"),
            3: ("রাইনল্যান্ড", "ইহুদি"),
            4: ("আদেমার", "কেরবোগা", "বোয়েমুন্দ"),
            5: ("গডফ্রি", "ইফতিখার", "আল-আফদাল"),
            6: ("মর্ফিয়া", "মেলিসেন্দে", "বল্ডউইন"),
            7: ("টেম্পলার", "হসপিটালার"),
            8: ("জঙ্গি", "নূরুদ্দিন", "জসলিন"),
            9: ("কনরাড", "এলেনর", "বার্নার্ড"),
            10: ("শিরকুহ", "সালাহউদ্দিন", "আমালরিক", "চতুর্থ বল্ডউইন"),
            11: ("সিবিলা", "গাই", "রাইনল্ড", "হাত্তিন"),
            12: ("বালিয়ান", "মুক্তিপণ"),
            13: ("রিচার্ড", "ফিলিপ", "ফ্রেডেরিক", "আল-আদিল"),
            14: ("দান্দোলো", "ইনোসেন্ট", "কনস্টান্টিনোপল", "১২০৪"),
            15: ("আল-কামিল", "পেলাজিয়ুস", "দামিয়েত্তা"),
            16: ("ফ্রেডেরিক", "আল-কামিল", "১২২৯"),
            17: ("খাওয়ারিজমীয়", "১২৪৪", "লা ফরবি"),
            18: ("লুই", "শাজার", "বাইবার্স", "মানসুরা"),
            19: ("লুই", "আল-মুস্তানসির", "তিউনিস"),
            20: ("বায়বার্স", "কালাউন", "খলিল", "১২৯১"),
            21: ("ইহুদি", "নারী", "ইবন আল-আসির"),
        }
        for number, terms in important.items():
            narrative = self.chapters[number - 1][2]
            for term in terms:
                self.assertIn(term, narrative, f"Missing {term} from chapter {number}")

    def test_supporting_campaigns_and_claim_caution(self):
        self.assertIn("১১০১ সালের ক্রুসেড", self.chapters[5][2])
        self.assertIn("শিশুদের ক্রুসেড", self.chapters[13][2])
        self.assertIn("কিংবদন্তি", self.page)
        self.assertIn("১২৯৩", self.chapters[19][2])

    def test_preserved_site_shell(self):
        text = self.page
        self.assertIn('<html lang="bn">', text)
        self.assertIn('<link rel="canonical" href="' + CANONICAL + '">', text)
        self.assertIn("/walid-ai-approved-logo.png", text)
        self.assertIn("/others/assets/books.css", text)
        self.assertIn("/others/assets/reader.js", text)
        self.assertIn('class="others-toc-trigger"', text)
        self.assertIn('class="others-toc-dialog"', text)
        self.assertEqual(text.count('class="legal-footer"'), 1)
        self.assertEqual(text.count('class="others-reader"'), 1)
        self.assertNotRegex(text, r'class="others-(?:sources|next)"')
        self.assertNotRegex(text, r'href="/others/(?:history|folklore)/[^"#]+/#')
        self.assertTrue(text.rstrip().endswith("</html>"))

if __name__ == "__main__":
    unittest.main()
