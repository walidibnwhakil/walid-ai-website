#!/usr/bin/env python3
"""Regression for the 30-book balanced-context editorial batch.

This checks publication integrity and expected additions only. Passing is
NOT a factual source audit or a guarantee of narrative/literary completeness.
"""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
BOOKS = {
    "history/alexander": (21, 2, "মোলসীয়", 20, "অলিম্পিয়াসের ফিরে আসা"),
    "history/ali-hasan-husayn-karbala": (49, 25, "দীর্ঘ গৃহযুদ্ধের পরে", 41, "মুখতারের দাবির প্রতি"),
    "history/ashab-al-kahf": (12, 9, "তরুণদের নাম জানার আকাঙ্ক্ষা", 11, "এফেসাসের ঘুমন্ত তরুণদের"),
    "history/bengal-sultanate": (15, 6, "রাজা গণেশের উত্থান বোঝার জন্য", 9, "হুসেন শাহের দরবারে"),
    "history/british-empire": (21, 12, "১৭৭০ সালের বাংলার ভয়াবহ", 19, "১৯৪৩ সালের বাংলার দুর্ভিক্ষের"),
    "history/byzantine-empire": (18, 13, "সম্রাজ্ঞী আইরিন দুকাইনা", 15, "কনস্টান্টিনোপলের মানুষ ১২০৪"),
    "history/crusades": (21, 6, "ক্রুসেডার রাষ্ট্রে ইউরোপ", 14, "আলেক্সিওস অ্যাঞ্জেলোস সিংহাসনের"),
    "history/joan-of-arc": (13, 2, "জোয়ানের মা ইজাবেল রোমে", 9, "রুয়াঁর বিচারকদের সবাই"),
    "history/khalid-ibn-walid": (12, 2, "উহুদের যুদ্ধে খালিদ তখন", 6, "মুসায়লিমার প্রতি বনু হানিফার"),
    "history/mamluk-sultanate": (17, 2, "শাজার আদ-দুরের উত্থানের আগে", 9, "১৩৪৮ সালের মহামারি"),
    "history/mongol-empire": (29, 15, "সোরগাঘতানি বেকি ছিলেন", 28, "দূরপথের বণিকেরা মঙ্গোল"),
    "history/mughal-empire": (25, 9, "নূরজাহানের প্রথম জীবনের", 23, "শাহ আলম দ্বিতীয়ের নামে"),
    "history/napoleon": (17, 6, "সাঁ-দোমিঙ্গে দ্বীপে", 16, "ওয়াটারলুতে নেপোলিয়নের প্রতিপক্ষকে"),
    "history/ottoman-empire": (38, 12, "সুলেমানের দরবারে হুররেম", 36, "দ্বিতীয় আবদুলহামিদের শাসন"),
    "history/rashidun-caliphate": (29, 10, "কাদিসিয়ার যুদ্ধে রুস্তম", 25, "আবু মুসা আল-আশআরি"),
    "history/roman-empire": (25, 15, "জেনোবিয়ার পালমিরা", 22, "গাল্লা প্লাসিদিয়া ছিলেন"),
    "history/saladin": (27, 12, "জেরুজালেমের রাজা গি", 18, "আক্কার আত্মসমর্পণের পরে"),
    "history/seljuk-empire": (23, 8, "তেরকেন খাতুন ছিলেন", 20, "বাবাই আন্দোলনকে"),
    "history/timur": (18, 3, "আমির হুসাইন ও তৈমুর", 10, "দিল্লি অভিযানে তৈমুরের"),
    "history/venice": (26, 15, "ফ্রান্সেসকো ফসকারির দীর্ঘ", 25, "শেষ ডোজ লুদোভিকো মানিনের"),
    "folklore/behula-lakhindar": (13, 2, "চাঁদের কাছে পূজার প্রশ্নটি", 13, "চাঁদের হাতের ফুলটি"),
    "folklore/gopal-bhar": (17, 8, "জমিদার নিজের খাতার দিকে", 10, "কর আদায়কারীরও একটি বক্তব্য"),
    "folklore/mahabharata": (44, 7, "দুর্যোধনের জন্ম ও শৈশবের", 23, "অধিরথ ও রাধার কাছে"),
    "folklore/ramayana": (41, 20, "বালি যখন সুগ্রীবকে", 28, "রাবণের কাছে লঙ্কার রাজত্ব"),
    "folklore/rupban": (12, 4, "একাব্বর বাদশাহর ভয়", 9, "সায়েদ বাদশাহ নিজেকে"),
    "islamic-literature/aladdin": (12, 1, "আলাদিনের মা ছেলেকে অলস", 10, "বদরুলবুদুরের মনে জাদুকরের"),
    "islamic-literature/alf-layla": (14, 1, "শাহরিয়ারের প্রথম আঘাত", 14, "হত্যার আদেশ থামানোর পরে"),
    "islamic-literature/ali-baba": (12, 1, "কাসিমের সচ্ছলতা শুধু", 9, "মরজিনার হাত তখনও"),
    "islamic-literature/hatim-tai": (12, 1, "বুরজখের সম্পদের ওপর", 12, "হাতেম সাত অভিযানের"),
    "islamic-literature/sinbad": (16, 1, "হিন্দবাদের ঘরে দিনের", 9, "যে রাজ্যের মানুষ জীবিত"),
}

class BalancedLibraryEditorial(unittest.TestCase):
    def test_all_thirty_books_keep_structure_and_new_context(self):
        self.assertEqual(len(BOOKS), 30)
        total_chapters = 0
        for name, (expected, first, first_token, second, second_token) in BOOKS.items():
            with self.subTest(book=name):
                html = (ROOT / "others" / name / "index.html").read_text(encoding="utf-8")
                ids = [int(x) for x in re.findall(r'<section class="others-chapter" id="chapter-(\d+)"', html)]
                links = [int(x) for x in re.findall(r'href="#chapter-(\d+)"', html)]
                self.assertEqual(ids, list(range(1, expected + 1)))
                self.assertEqual(links, ids)
                self.assertEqual(html.count('class="legal-footer"'), 1)
                self.assertEqual(html.count('rel="canonical"'), 1)
                self.assertIn('/walid-ai-approved-logo.png', html)
                self.assertIn('/others/assets/books.css', html)
                self.assertIn('/others/assets/reader.js', html)
                for chapter, token in ((first, first_token), (second, second_token)):
                    match = re.search(
                        rf'<section class="others-chapter" id="chapter-{chapter}">([\s\S]*?)</section>',
                        html,
                    )
                    self.assertIsNotNone(match)
                    self.assertIn(token, match.group(1))
                    self.assertGreaterEqual(match.group(1).count("<p>"), 5)
                total_chapters += expected
        self.assertEqual(total_chapters, 649)

if __name__ == "__main__":
    unittest.main()
