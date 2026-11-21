"""Book-scoped editorial, navigation and non-regression checks for Timur."""
from pathlib import Path
from difflib import SequenceMatcher
from html import unescape
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "others/history/timur/index.html"
CHAPTER_RE = re.compile(
    r'<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)</h2>(.*?)</section>',
    re.S,
)
PARAGRAPH_RE = re.compile(r"<p>(.*?)</p>", re.S)


def text_only(value):
    return unescape(re.sub(r"<[^>]*>", "", value)).strip()


class TimurEditorialTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = PAGE.read_text(encoding="utf-8")
        cls.chapters = [
            (int(n), text_only(title), [text_only(p) for p in PARAGRAPH_RE.findall(body)])
            for n, title, body in CHAPTER_RE.findall(cls.html)
        ]

    def test_chapters_and_toc_are_one_to_one(self):
        self.assertEqual([n for n, _, _ in self.chapters], list(range(1, 19)))
        toc = re.findall(r'<li><a href="#chapter-(\d+)">(.*?)</a></li>', self.html)
        self.assertEqual([(int(n), text_only(name)) for n, name in toc],
                         [(n, title) for n, title, _ in self.chapters])
        self.assertIn("অধ্যায়সূচি — 18টি অধ্যায়", self.html)

    def test_editorial_depth_and_no_duplicate_paragraphs(self):
        paragraphs = [paragraph for _, _, items in self.chapters for paragraph in items]
        self.assertGreaterEqual(len(paragraphs), 209)  # Permit sourced chapter expansion
        self.assertTrue(all(len(items) >= 8 for _, _, items in self.chapters))
        self.assertTrue(all(len(p) >= 150 for p in paragraphs))
        self.assertEqual(len(paragraphs), len(set(paragraphs)),
                         "Repeated identical paragraphs")
        for i, first in enumerate(paragraphs):
            for second in paragraphs[i + 1:]:
                if abs(len(first) - len(second)) > 35:
                    continue
                self.assertLess(SequenceMatcher(None, first, second).ratio(), 0.94,
                                "Near-duplicate paragraph")

    def test_campaign_and_dynasty_anchors(self):
        expected = {
            1: ("১৩৩৬", "বারলাস", "কাজাগান"),
            2: ("তুঘলুক", "ইলিয়াস খোজা", "হুসাইন"),
            3: ("১৩৬৫", "সারবদার", "বালখ", "গুরগান"),
            4: ("জাহাঙ্গীর", "মিরান শাহ", "সারায় মুল্ক"),
            5: ("১৩৭৯", "১৩৮৮", "উরগেঞ্চ", "তোখতামিশ"),
            6: ("হেরাত", "সিস্তান", "১৩৮৭", "ইসফাহান"),
            7: ("১৩৯১", "কন্দুরচা", "তোখতামিশ"),
            8: ("১৩৯৩", "শাহ মনসুর", "বাগদাদ", "মোজাফ্‌ফরীয়"),
            9: ("১৩৯৫", "তেরেক", "সারাই", "হাজি তারখান"),
            10: ("পীর মুহাম্মদ", "মাল্লু ইকবাল", "১৭ ডিসেম্বর ১৩৯৮", "বন্দি"),
            11: ("আলেপ্পো", "দামেস্ক", "ইবন খালদুন", "১৪০১", "বাগদাদ"),
            12: ("বায়েজিদ", "স্তেফান লাজারেভিচ", "আকশেহির", "স্মির্না", "১৪১৩"),
            13: ("মুহাম্মদ সুলতান", "ক্লাভিহো", "বিবি খানুম", "ওত্রার", "১৪০৫"),
            14: ("খলিল সুলতান", "শাদ মুল্ক", "১৪০৭", "১৪০৯", "শাহরুখ"),
            15: ("গওহরশাদ", "গিয়াসউদ্দিন তুরখান", "ইব্রাহিম সুলতান", "বায়সুঙুর", "১৪৪৭"),
            16: ("উলুঘ বেগ", "আলা-উদ্-দৌলা", "আবদুল লতিফ", "১৪৪৯"),
            17: ("আবু সাঈদ", "ইয়াদগার মুহাম্মদ", "উজুন হাসান", "হুসাইন বাইকারা"),
            18: ("বাবরনামা", "শায়বানী", "১৫০৪", "১৫১১", "ইব্রাহিম লোদি", "১৫২৬"),
        }
        for n, _, paragraphs in self.chapters:
            body = " ".join(paragraphs)
            for phrase in expected[n]:
                self.assertIn(phrase, body, f"Timur chapter {n}: missing {phrase}")

    def test_chrome_seo_links_and_policy(self):
        html = self.html
        for required in (
            'href="https://walid-ai.com/others/history/timur/"',
            '/walid-ai-approved-logo.png',
            '/others/assets/books.css',
            '/others/assets/reader.js',
            'class="others-toc-dialog"',
            'class="legal-footer"',
        ):
            self.assertIn(required, html)
        self.assertEqual(html.count('class="legal-footer"'), 1)
        for excluded in ("উৎস ও পরবর্তী পাঠ", 'class="others-sources"',
                         'class="others-next"', ">undefined<"):
            self.assertNotIn(excluded, html)
        for target in re.findall(r'href="(/[^"#?]*)(?:[?][^"#]*)?"', html):
            path = ROOT / target.strip("/")
            if target.endswith("/"):
                path = path / "index.html"
            self.assertTrue(path.is_file(), f"Broken local link: {target}")


if __name__ == "__main__":
    unittest.main()
