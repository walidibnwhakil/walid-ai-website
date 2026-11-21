#!/usr/bin/env python3
"""Focused source-aware character arcs, not a substitute for literary/historical review."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1] / "others"


def read_section(book: str, n: int) -> str:
    html = (ROOT / book / "index.html").read_text(encoding="utf-8")
    matches = re.findall(
        r'<section class="others-chapter" id="chapter-(\d+)"><h2>[^<]+</h2>(.*?)</section>',
        html, re.S,
    )
    section = next((body for number, body in matches if int(number) == n), None)
    if section is None:
        raise AssertionError(f"{book} chapter {n} not found")
    return re.sub(r'<[^>]+>', ' ', section)


class CharacterContextEditorialTests(unittest.TestCase):
    def test_shakuni_gandhara_parent_family_and_variant_legend(self):
        origins = read_section("folklore/mahabharata", 4)
        youth = read_section("folklore/mahabharata", 7)
        dice = read_section("folklore/mahabharata", 16)
        for term in ("সুবল", "গান্ধার", "ধৃতরাষ্ট্র", "শকুনি"):
            self.assertIn(term, origins)
        for term in ("শকুনি", "প্রতিশোধকাহিনি", "অস্থি",
                     "সমালোচনামূলক পাঠ", "দুর্যোধন"):
            self.assertIn(term, youth)
        for term in ("যুধিষ্ঠির", "শকুনি", "দুর্যোধন", "দক্ষ", "পাণ্ডব"):
            self.assertIn(term, dice)
        self.assertIn("কর্ণ", read_section("folklore/mahabharata", 17))
        self.assertIn("বিকর্ণ", read_section("folklore/mahabharata", 17))
        self.assertIn("দ্রৌপদী", read_section("folklore/mahabharata", 17))

    def test_vlad_family_conflict_civilian_cost_and_outcome_in_mehmed_reign(self):
        text = read_section("history/ottoman-empire", 9)
        for term in ("ভ্লাদ তৃতীয়", "দ্বিতীয় ভ্লাদ", "মিরচিয়া",
                     "রাদু", "ওয়ালাচিয়া", "বয়ার", "১৪৬২",
                     "উসমানীয়", "প্রতিরোধ", "নিষ্ঠুরতা", "১৪৭৬"):
            self.assertIn(term, text)
        # In this book, Vlad belongs to Mehmed II's reign, not a detached new chapter.
        full = (ROOT / "history/ottoman-empire/index.html").read_text("utf-8")
        self.assertEqual(len(re.findall(r'class="others-chapter" id="chapter-\d+"', full)), 38)
        self.assertIn("Counting the Stakes", full, "Source attribution for contested impalement estimates")

    def test_boudica_is_not_only_a_hero_or_an_enemy_of_rome(self):
        text = read_section("history/roman-empire", 8)
        for term in ("বৌদিকা", "প্রসুতাগুস", "আইসেনি", "ত্রিনোভান্তেস",
                     "দুই কন্যা", "সুয়েতোনিয়ুস", "ট্যাসিটাস",
                     "বিদ্রোহী", "নগরবাসী", "সহিংসতার", "৬১"):
            self.assertIn(term, text)

    def test_wellesley_and_tipu_are_both_agents_in_india(self):
        text = read_section("history/british-empire", 12)
        for term in ("রিচার্ড ওয়েলেসলি", "আর্থার ওয়েলেসলি", "টিপু সুলতান",
                     "মারাঠা", "মাইসোর", "১৭৯৯", "সাবসিডিয়ারি অ্যালায়েন্স",
                     "রাজস্ব", "ব্রিটিশ"):
            self.assertIn(term, text)


if __name__ == "__main__":
    unittest.main()
