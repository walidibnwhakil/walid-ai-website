"""Historical coverage, chronology and presentation contract for the Mongol reader.

Source-oriented guardrails: tested terms denote coverage, not independent proof of
each historical assertion. Editorial source disputes belong in the PR report.
"""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / "others/history/mongol-empire/index.html"

REQUIRED = {
    1: ("১১৬২", "১১৬৭", "জিন", "তৃণভূমি"),
    2: ("ইয়েসুগেই", "হোয়েলুন", "বেগতের", "খাসার"),
    3: ("বোর্তে", "মেরকিত", "জোচি", "জামুখা"),
    4: ("১২০৩", "১২০৪", "১২০৬", "তোগরিল", "নাইমান"),
    5: ("শিগি", "জেলমে", "জেবে", "উলুস"),
    6: ("জিন", "মুখালি", "১২৩৪", "১২২৭"),
    7: ("ওত্রার", "বুখারা", "সমরকন্দ", "ইনায়ালচুক", "তেরকেন"),
    8: ("উরগেঞ্চ", "জালালউদ্দিন", "পারওয়ান", "সিন্ধু", "১২৩১"),
    9: ("কালকা", "১২২৩", "জেবে", "সুবুতাই"),
    10: ("১২২৭", "জোচি", "চাগতাই", "ওগেদেই", "তোলুই"),
    11: ("১২২৯", "তোলুই", "সোরগাঘতানি"),
    12: ("১২৩৪", "১২৪১", "তোরেগেনে", "ইয়েলু"),
    13: ("১২৩৬", "১২৪০", "১২৪১", "১২৪২", "বাটু", "সুবুতাই"),
    14: ("১২৪৬", "১২৪৮", "তোরেগেনে", "গুইউক", "ফাতিমা"),
    15: ("১২৫১", "ওঘুল", "সোরগাঘতানি", "বাটু"),
    16: ("১২৫৯", "মোংকে", "কুবলাই", "হুলাগু"),
    17: ("১২৫৬", "আলামুত", "দোখুজ", "তুসি"),
    18: ("১২৫৮", "আল-মুস্তাসিম", "ইবন আল-আলকামি", "খলিফা"),
    19: ("১২৬০", "কুতুজ", "বাইবার্স", "কিতবুকা"),
    20: ("বেরকে", "হুলাগু", "ককেশাস", "বাইবার্স"),
    21: ("১২৬০", "১২৬৪", "কুবলাই", "আরিক"),
    22: ("১২৭১", "১২৭৯", "চাবি", "ঝেনজিন", "শিয়াংইয়াং", "নায়ানের"),
    23: ("কাইদু", "দুয়া", "১৩০৪"),
    24: ("চাগতাই", "ওরঘিনা", "কেবেক", "তারমাশিরিন", "তৈমুর"),
    25: ("বাটু", "সার্তাক", "উজবেক", "জানিবেগ", "তখতামিশ", "১৫০২"),
    26: ("আবাকা", "গাজান", "ওলজেইতু", "আবু সাঈদ", "১৩৩৫"),
    27: ("তেমুর", "কায়শান", "আয়ুরবারওয়াদা", "তোগোন তেমুর", "১৩৬৮"),
    28: ("মহামারি", "কৃষি", "ধর্ম", "বাণিজ্য", "দাস"),
    29: ("চাগতাই", "ইলখানাত", "ইউয়ান", "গোল্ডেন হোর্ড"),
}


class MongolEditorialTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = BOOK.read_text(encoding="utf-8")
        cls.sections = [
            (int(m.group(1)), m.group(2), m.group(3))
            for m in re.finditer(
                r'<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)</h2>(.*?)</section>',
                cls.html, flags=re.S
            )
        ]
        cls.links = [
            (int(m.group(1)), m.group(2))
            for m in re.finditer(r'<li><a href="#chapter-(\d+)">(.*?)</a></li>', cls.html)
        ]

    def test_29_chapter_ids_and_titles_match_toc(self):
        self.assertEqual([s[0] for s in self.sections], list(range(1, 30)))
        self.assertEqual(self.links, [(n, title) for n, title, _ in self.sections])
        self.assertIn("অধ্যায়সূচি — 29টি অধ্যায়", self.html)

    def test_substantive_paragraphs_with_no_exact_duplicates(self):
        paragraphs = []
        for number, title, contents in self.sections:
            ps = [re.sub("<[^>]+>", "", m).strip()
                  for m in re.findall(r"<p>(.*?)</p>", contents, flags=re.S)]
            self.assertGreaterEqual(len(ps), 8, f"Chapter {number}: too few paragraphs")
            self.assertGreaterEqual(len(" ".join(ps).split()), 450,
                                    f"Chapter {number}: truncated historical narrative")
            self.assertTrue(all(len(p) >= 100 for p in ps),
                            f"Chapter {number}: fragmentary paragraph")
            paragraphs.extend(ps)
        self.assertEqual(len(paragraphs), len(set(paragraphs)),
                         "Identical narrative paragraphs duplicated")

    def test_important_characters_events_and_khanates_are_covered_in_place(self):
        self.assertEqual(len(self.sections), len(REQUIRED))
        for n, _, content in self.sections:
            for term in REQUIRED[n]:
                with self.subTest(chapter=n, term=term):
                    self.assertIn(term, content)

    def test_early_chronology(self):
        # Use chapter-specific checks: later khanate chapters intentionally
        # revisit simultaneous regional histories after 1260.
        dates_by_chapter = {
            4: "১২০৬", 6: "১২১১", 7: "১২১৯",
            9: "১২২৩", 10: "১২২৭", 11: "১২২৯",
            12: "১২৩৪", 13: "১২৪১", 14: "১২৪৬",
            15: "১২৫১", 17: "১২৫৬", 18: "১২৫৮",
            19: "১২৬০", 21: "১২৬৪", 22: "১২৭১",
            26: "১২৯৫", 27: "১৩৬৮",
        }
        by_num = {n: text for n, _, text in self.sections}
        for n, date in dates_by_chapter.items():
            with self.subTest(chapter=n, date=date):
                self.assertIn(date, by_num[n])
        self.assertLess(
            self.html.index('id="chapter-18"'),
            self.html.index('id="chapter-19"'),
            "Baghdad must precede Ayn Jalut",
        )

    def test_historical_uncertainty_explicit_not_overclaimed(self):
        body = " ".join(section for _, _, section in self.sections)
        for term in ("মতভেদ", "অনিশ্চিত", "সূত্র", "সংলাপ", "হতাহতের"):
            self.assertIn(term, body)
        self.assertIn("১১৬৭", self.sections[0][2])
        self.assertIn("১১৬২", self.sections[0][2])
        self.assertIn("সৈন্যসংখ্যা", body)
        self.assertIn("বাগদাদ", body)

    def test_original_branding_seo_footer_and_reader_js_remain(self):
        h = self.html
        self.assertIn('href="https://walid-ai.com/others/history/mongol-empire/"', h)
        self.assertIn('src="/walid-ai-approved-logo.png"', h)
        self.assertIn('/others/assets/books.css?v=20261121-editorial', h)
        self.assertIn('/others/assets/reader.js?v=20261121-editorial', h)
        self.assertIn('class="others-toc-dialog"', h)
        self.assertEqual(h.count('class="legal-footer"'), 1)
        self.assertNotIn('class="others-sources"', h)
        self.assertNotIn('class="others-next"', h)
        self.assertNotIn('উৎস ও পরবর্তী পাঠ', h)
        self.assertNotIn('এই অধ্যায়ে', h)
        self.assertNotRegex(h, r'[\u0900-\u0963\u0966-\u097f]')


    def test_key_events_follow_their_own_narrative_chronology(self):
        chapter = {n: body for n, _, body in self.sections}

        def in_order(number, *anchors):
            positions = [chapter[number].find(s) for s in anchors]
            self.assertTrue(all(p >= 0 for p in positions),
                            f"Chapter {number}: missing chronology marker {anchors}: {positions}")
            self.assertEqual(positions, sorted(positions),
                             f"Chapter {number}: events narrated out of order: {anchors}")

        # A reader must encounter the actual surrender/battle before its aftermath.
        in_order(18, "১০ ফেব্রুয়ারি ১২৫৮", "দখলের পরে নগরে লুটপাট",
                 "খলিফা হত্যার পরে")
        in_order(19, "১২৬০ সালের ৩ সেপ্টেম্বর", "১২৮১ সালে হিমসের")
        in_order(22, "১২৬৮ থেকে ১২৭৩", "ঝেনজিন ১২৮৬",
                 "১২৮৭ সালে নায়ানের")
        in_order(25, "উজবেক বা ওজবেগ খান", "উজবেকের পরে জানিবেগ",
                 "তখতামিশ")
        in_order(26, "আবাকার মৃত্যুর পরে", "আর্গুনের পরে",
                 "১২৯৫ সালে গাজান", "১৩০৪ সালে গাজানের",
                 "ওলজেইতুর পরে")
        in_order(27, "১৩৫০-এর দশকে", "১৩৬৮ সালে মিং বাহিনী")

    def test_qutulun_political_arc_not_only_wrestling_legend(self):
        chapters = {n: content for n, _, content in self.sections}
        text = chapters[23]
        for term in ("খুতুলুন", "কাইদুর কন্যা", "মার্কো পোলোর",
                     "রশিদউদ্দিন", "সামরিক", "বিবাহ", "১৩০১",
                     "ওরুসের", "চাপার", "রাজপরিবার"):
            self.assertIn(term, text, "Missing Qutulun's biography: " + term)
        self.assertIn("mongol-source-metadata", self.html)

    def test_sources_are_discriminated_without_reviving_source_box(self):
        all_text = " ".join(content for _, _, content in self.sections)
        for primary_source in ("মঙ্গোলদের গোপন ইতিহাস", "জুভায়নি",
                               "রশিদউদ্দিন", "ইউয়ান শি"):
            self.assertIn(primary_source, all_text)
        for claim_caveat in ("নির্ভরযোগ্য", "প্রমাণ", "মতভেদ"):
            self.assertIn(claim_caveat, all_text)
        self.assertNotIn("উৎস ও পরবর্তী পাঠ", self.html)
        self.assertNotIn('class="others-sources"', self.html)


if __name__ == "__main__":
    unittest.main()
