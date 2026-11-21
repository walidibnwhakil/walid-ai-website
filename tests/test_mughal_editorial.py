"""Focused editorial, historical order and reader-shell regression for the Mughal book."""
from pathlib import Path
from html import unescape
import json
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / "others/history/mughal-empire/index.html"
HTML = BOOK.read_text(encoding="utf-8")
SECTIONS = [
    (int(n), unescape(title), body)
    for n, title, body in re.findall(
        r'<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)</h2>(.*?)</section>',
        HTML, re.S
    )
]
LINKS = [
    (int(n), unescape(title))
    for n, title in re.findall(r'<a href="#chapter-(\d+)">(.*?)</a>', HTML, re.S)
]
P = {
    n: [unescape(re.sub(r"<[^>]+>", "", p)).strip()
        for p in re.findall(r"<p>(.*?)</p>", body, re.S)]
    for n, _, body in SECTIONS
}
TEXT = {n: " ".join(P[n]) for n in P}


class MughalEditorialTests(unittest.TestCase):
    def test_chapter_order_links_and_reading_depth(self):
        self.assertEqual([n for n, _, _ in SECTIONS], list(range(1, 26)))
        self.assertEqual(LINKS, [(n, title) for n, title, _ in SECTIONS])
        self.assertIn("অধ্যায়সূচি — ২৫টি অধ্যায়", HTML)
        self.assertEqual(len({title for _, title, _ in SECTIONS}), 25)
        self.assertGreaterEqual(sum(map(len, P.values())), 330)
        for n in range(1, 26):
            self.assertGreaterEqual(len(P[n]), 9, f"chapter {n} still compressed")
            self.assertTrue(all(len(para) >= 175 for para in P[n]),
                            f"chapter {n} contains an underdeveloped paragraph")
        paragraphs = [p for n in P for p in P[n]]
        self.assertEqual(len(paragraphs), len(set(paragraphs)),
                         "long repeated paragraphs")

    def test_integrated_dynastic_and_regional_coverage(self):
        per_reign = {
            1: ("শায়বানি", "সমরকন্দ", "কাবুল"),
            2: ("ইব্রাহিম লোদি", "চান্দেরি", "ঘাঘরা", "মাহম বেগম"),
            3: ("বাহাদুর শাহ", "কামরান", "চৌসা", "কনৌজ"),
            4: ("শের শাহ", "ইসলাম শাহ", "হামিদা", "তাহমাস্প", "কালিঞ্জর"),
            5: ("বৈরাম খান", "সিরহিন্দ", "সিঁড়ি"),
            6: ("মাহম আঙ্গা", "বৈরাম খান", "রাজমহল", "হলদিঘাটি"),
            7: ("টোডরমল", "রুকাইয়া", "ইবাদতখানা", "মরিয়ম-উজ-জামানি"),
            8: ("খসরু", "গুরু অর্জন", "উইলিয়াম হকিন্স"),
            9: ("নূরজাহান", "আসফ খান", "মহাবত খান", "টমাস রো", "দাওয়ার বখশ"),
            10: ("মুমতাজ", "জাহানারা", "গওহর আরা", "কান্দাহার"),
            11: ("দারা শিকোহ", "নাদিরা", "ধর্মত", "সামুগড়", "খাজওয়া", "দেওরাই"),
            12: ("শিবাজি", "জিজিয়া", "মীর জুমলা", "চট্টগ্রাম", "দুর্গাদাস"),
            13: ("মুআজ্জম", "দিলরাস", "জেবুন্নিসা", "তারাবাই", "জাগির"),
            14: ("জাহানজেব বানু", "বিদার বখত", "জাজাউ"),
            15: ("কামবখশ", "শাহু", "বন্দা সিং", "জাহান্দার"),
            16: ("জুলফিকার", "লাল কুঁয়ার", "ফররুখসিয়ার"),
            17: ("সৈয়দ", "১৭১৭", "দস্তক", "অজিত সিংহ"),
            18: ("নিকুসিয়ার", "রফি-উদ-দারাজাত", "দ্বিতীয় শাহজাহান"),
            19: ("নিজামুলমুলক", "মুর্শিদ", "নাদির শাহ", "কারনাল"),
            20: ("কুদসিয়া", "সফদার জং", "ইমাদ-উল-মুল্ক"),
            21: ("সিরাজউদ্দৌলা", "অলিনগরের সন্ধি", "মীর জাফর", "পলাশী"),
            22: ("মুহি-উল-মিল্লত", "দাবিদার", "ইমাদ-উল-মুল্ক"),
            23: ("মীর কাসিম", "হেক্টর মনরো", "বক্সার", "দেওয়ানি", "দুর্ভিক্ষ", "গুলাম কাদির"),
            24: ("রামমোহন", "মির্জা জাহাঙ্গীর", "জাফর"),
            25: ("জওয়ান বখত", "বেগম হজরত মহল", "লক্ষ্মীবাই", "বখত খান",
                 "হডসন", "বিচার", "রেঙ্গুন", "১৮৬২"),
        }
        for n, terms in per_reign.items():
            for term in terms:
                self.assertIn(term, TEXT[n], f"chapter {n}: {term} missing")
        self.assertNotIn("১৬৬৬ সালের আসামের অভিযান", HTML)
        self.assertNotIn("টমাস রো", TEXT[8], "1615 embassy must not appear in the 1605–1611 chapter")

    def test_critical_historical_sequence(self):
        in_order = {
            2: ("পানিপথ", "খানুয়া", "চান্দেরি", "১৫২৯ সালে ঘাঘরার"),
            4: ("১৫৪২", "১৫৪৫ সালে কালিঞ্জর", "হিন্দালের ১৫৫১", "১৫৫৫ সালের"),
            9: ("১৬১১ সালে", "১৬২৬ সালে মহাবত", "১৬২৭ সালে কাশ্মীর",
                "দাওয়ার বখশ", "১৬৪৫"),
            11: ("২৬ এপ্রিল ১৬৫৮", "১৬৫৯ সালে বন্দি", "১৬৬৬ সালে"),
            21: ("১৭৫৬", "অলিনগরের সন্ধি", "পলাশীর ২৩ জুন", "১৭৫৯"),
            23: ("১৭৬১ সালের", "২৩ অক্টোবর ১৭৬৪", "১৭৬৫ সালের আলাহাবাদের",
                 "১৭৭০ সালের", "১৭৮৮ সালে", "১৮০৩ সালে"),
            25: ("১০ মে মীরাট", "২১ সেপ্টেম্বর", "১৮৫৮ সালের ২৭ জানুয়ারি",
                 "৭ নভেম্বর ১৮৬২"),
        }
        for n, anchors in in_order.items():
            positions = [TEXT[n].find(anchor) for anchor in anchors]
            self.assertTrue(
                all(pos >= 0 for pos in positions)
                and positions == sorted(positions)
                and len(set(positions)) == len(positions),
                f"chapter {n} sequence violated: {list(zip(anchors, positions))}"
            )

    def test_sources_in_metadata_and_reader_policy(self):
        match = re.search(
            r'<script id="mughal-source-metadata" type="application/ld\+json">(.*?)</script>',
            HTML, re.S
        )
        self.assertIsNotNone(match, "bibliography should be in invisible JSON-LD")
        metadata = json.loads(match.group(1))
        self.assertEqual(metadata["@type"], "Book")
        self.assertEqual(metadata["inLanguage"], "bn")
        self.assertGreaterEqual(len(metadata["citation"]), 10)
        for citation in metadata["citation"]:
            self.assertTrue(citation["url"].startswith("https://"))
        for token in (
            'href="https://walid-ai.com/others/history/mughal-empire/"',
            '/walid-ai-approved-logo.png',
            '/others/assets/books.css?v=20261122-symbols',
            '/others/assets/reader.js?v=20261122-symbols',
            'class="others-toc-dialog"',
            'class="legal-footer"',
            'href="/privacy-policy/"',
        ):
            self.assertIn(token, HTML)
        self.assertEqual(HTML.count('class="legal-footer"'), 1)
        self.assertNotRegex(HTML, r'class="others-(?:sources|next)"')
        self.assertNotIn("উৎস ও পরবর্তী পাঠ", HTML)
        self.assertNotIn("noindex", HTML)


if __name__ == "__main__":
    unittest.main()
