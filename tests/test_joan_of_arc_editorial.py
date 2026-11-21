#!/usr/bin/env python3
"""Joan of Arc editorial and structural regression tests, restricted to this book.

Fact-check references (not displayed as a retired reading-list panel):
British Library Stowe MS 84 and Egerton MS 984 (trial manuscripts);
Fordham Medieval Sourcebook, Joan's 1431 condemnation trial;
International Joan of Arc Society chronology;
French Ministry of Culture, Jeanne d'Arc / Rouen (1449–1450).
These checks protect chronology and layout, but do not replace source criticism.
"""
from __future__ import annotations
from html import unescape
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "others/history/joan-of-arc/index.html"
HTML = PAGE.read_text(encoding="utf-8")
SECTIONS = re.findall(
    r'<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)</h2>(.*?)</section>',
    HTML, re.S
)
TOC = re.findall(r'<li><a href="#chapter-(\d+)">(.*?)</a></li>', HTML, re.S)


class JoanOfArcEditorialTests(unittest.TestCase):
    def test_thirteen_chapters_and_exact_toc_targets(self):
        expected = [str(n) for n in range(1, 14)]
        self.assertEqual([n for n, _, _ in SECTIONS], expected)
        self.assertEqual([(n, unescape(t)) for n, t in TOC],
                         [(n, unescape(t)) for n, t, _ in SECTIONS])
        self.assertIn("অধ্যায়সূচি — ১৩টি অধ্যায়", HTML)
        self.assertEqual(len({n for n, _, _ in SECTIONS}), 13)

    def test_chapters_remain_substantive_and_nonmechanical(self):
        counts = []
        all_paragraphs = []
        for number, title, section in SECTIONS:
            paragraphs = [unescape(re.sub(r"<[^>]+>", "", p)).strip()
                          for p in re.findall(r"<p>(.*?)</p>", section, re.S)]
            counts.append(len(paragraphs))
            self.assertGreaterEqual(len(paragraphs), 9, number)
            self.assertGreater(len("".join(paragraphs)), 2900, number)
            self.assertTrue(all(len(p) > 100 for p in paragraphs), number)
            all_paragraphs.extend(paragraphs)
        self.assertGreater(len(set(counts)), 1, "Every chapter should not have identical paragraph counts")
        self.assertEqual(len(all_paragraphs), len(set(all_paragraphs)),
                         "Identical prose paragraphs repeated across chapters")

    def test_milestones_in_the_correct_chapters(self):
        required = {
            1: ("ট্রোয়া চুক্তি", "১৪২০", "১৪২২", "বেডফোর্ড"),
            2: ("ডমরেমি", "১৪১২", "ইজাবেল", "তুল (Toul)", "সেন্ট মাইকেল"),
            3: ("বোদ্রিকুর", "শিনোঁ", "পুয়াতিয়ের", "অলোঁ"),
            4: ("২৯ এপ্রিল", "৪ মে", "৬ মে", "৭ মে", "৮ মে", "দুনোয়া"),
            5: ("জারজো", "১৮ জুন", "পাতে", "জাঁত্রাই", "১৭ জুলাই", "রাঁস"),
            6: ("৮ সেপ্টেম্বর", "সাঁ-অনোরে", "লা শারিতে", "অভিজাত"),
            7: ("২৩ মে ১৪৩০", "কম্পিয়েন", "ফ্লাভি", "বোরেভোয়ার", "লুক্সেমবুর্গ"),
            8: ("কোশোঁ", "রুয়াঁ", "ইংরেজ", "মঁশোঁ"),
            9: ("১৪৩১", "বারোটি", "প্যারিস বিশ্ববিদ্যালয়ের", "পোশাক"),
            10: ("২৪ মে", "২৮ মে", "২৯ মে", "৩০ মে", "সাঁ-উয়াঁ"),
            11: ("১৪৩৫", "আরাস", "১৪৩৬", "১৪৫৩", "বেডফোর্ড"),
            12: ("১৪৪৯", "১৪৫০", "১৪৫২", "১৪৫৫", "১৪৫৬", "ক্যালিক্সটাস"),
            13: ("কিশেরা", "শিলারের", "১৯০৯", "১৯২০"),
        }
        for number, markers in required.items():
            body = SECTIONS[number - 1][2]
            for marker in markers:
                with self.subTest(chapter=number, marker=marker):
                    self.assertIn(marker, body)

    def test_sequential_trial_and_rehabilitation_events(self):
        body = SECTIONS[9][2]
        positions = [body.index(x) for x in ("২৪ মে", "২৮ মে", "২৯ মে", "৩০ মে")]
        self.assertEqual(positions, sorted(positions))
        body12 = SECTIONS[11][2]
        dates = [body12.index(x) for x in ("১৪৪৯", "১৪৫০", "১৪৫২", "১৪৫৫", "১৪৫৬")]
        self.assertEqual(dates, sorted(dates))
        self.assertNotIn("১৪৫০ সালে রুয়াঁ ফরাসি নিয়ন্ত্রণে ফিরে আসার পর", HTML)
        self.assertNotIn("১৪৩৫ সালে তাঁর শার্লের সঙ্গে সন্ধি হবে", SECTIONS[0][2])

    def test_no_restored_obsolete_blocks(self):
        self.assertNotIn("উৎস ও পরবর্তী পাঠ", HTML)
        self.assertNotRegex(HTML, r'class="others-(?:next|sources)"')
        self.assertNotIn("href=\"#chapter-14\"", HTML)

    def test_canonical_logo_and_reader_assets(self):
        expected = (
            '<html lang="bn">', 'name="viewport"',
            'href="https://walid-ai.com/others/history/joan-of-arc/"',
            'src="/walid-ai-approved-logo.png"', '/others/assets/books.css',
            '/others/assets/reader.js', 'class="others-toc-dialog"',
            'class="others-toc-trigger"', 'class="others-book-title"',
            'class="legal-footer"', 'href="/about-us/"',
            'href="/contact-us/"', 'href="/privacy-policy/"',
            'href="/terms-of-service/"'
        )
        for item in expected:
            with self.subTest(marker=item):
                self.assertIn(item, HTML)
        self.assertEqual(HTML.count('class="legal-footer"'), 1)
        self.assertEqual(HTML.count('class="others-brand"'), 1)
        self.assertEqual(HTML.count('class="others-toc-trigger"'), 1)
        css = (ROOT / "others/assets/books.css").read_text(encoding="utf-8")
        self.assertIn("SolaimanLipi", css)
        self.assertIn("/walid-ai-approved-flower.png", css)


if __name__ == "__main__":
    unittest.main(verbosity=2)
