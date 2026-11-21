"""Book-scoped narrative/reader regression for Gopal Bhar (17 independent folk tales)."""
from html.parser import HTMLParser
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / "others/folklore/gopal-bhar/index.html"


class ElementScanner(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.anchors = []
        self.broken = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        if tag == "a" and attrs.get("href", "").startswith("#"):
            self.anchors.append(attrs["href"][1:])


class GopalBharEditorialTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = BOOK.read_text(encoding="utf-8")
        cls.sections = re.findall(
            r'<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)</h2>(.*?)</section>',
            cls.html, flags=re.S
        )
        cls.links = re.findall(r'<li><a href="#chapter-(\d+)">([^<]+)</a></li>', cls.html)

    def test_17_independent_stories_and_matching_toc(self):
        self.assertEqual(len(self.sections), 17)
        self.assertEqual(
            [(num, heading) for num, heading, _ in self.sections],
            [(num, heading) for num, heading in self.links]
        )
        self.assertEqual([int(n) for n, _, _ in self.sections], list(range(1, 18)))
        self.assertIn("অধ্যায়সূচি — 17টি অধ্যায়", self.html)
        parser = ElementScanner()
        parser.feed(self.html)
        self.assertEqual(len(parser.ids), len(set(parser.ids)), "duplicate HTML id")
        self.assertTrue(all(target in parser.ids for target in parser.anchors))

    def test_stories_have_full_scenes(self):
        for num, heading, body in self.sections:
            with self.subTest(chapter=num, heading=heading):
                paras = re.findall(r'<p>(.*?)</p>', body, flags=re.S)
                self.assertGreaterEqual(len(paras), 6)
                self.assertGreaterEqual(sum(map(len, paras)), 1500)
                self.assertTrue(all(len(p.strip()) >= 120 for p in paras))
                self.assertIn("গোপাল", body)
                self.assertIn("‘", body)
                self.assertIn("’", body)

    def test_repeated_morals_and_unfinished_cases_not_reintroduced(self):
        combined = " ".join(self.html.split())
        for forbidden in (
            "এই অধ্যায়ে", "পাঠক বুঝবেন", "উৎস ও পরবর্তী পাঠ",
            "শিক্ষণীয় বিষয় হলো", 'class="others-sources"', 'class="others-next"'
        ):
            self.assertNotIn(forbidden, combined)
        significant_turns = {
            5: ("ঠাকুরদা", "মিথ্যে", "পুরস্কার"),
            6: ("কলসি", "জমি", "পুকুর"),
            11: ("স্বাদপরীক্ষা", "ক্ষমা"),
            13: ("পাগড়ি", "আংটি", "পরিচারক"),
            14: ("স্বর্ণকার", "পিতল", "দাম"),
            15: ("সাতটি", "কাপড়", "জামা"),
            16: ("ফলক", "বৃষ্টি", "নালা"),
            17: ("কুয়ো", "কলসি", "কাজ"),
        }
        for number, tokens in significant_turns.items():
            body = self.sections[number - 1][2]
            with self.subTest(chapter=number):
                for token in tokens:
                    self.assertIn(token, body)

    def test_walid_shell_and_seo_unchanged(self):
        required = (
            'href="https://walid-ai.com/others/folklore/gopal-bhar/"',
            '/walid-ai-approved-logo.png',
            '/others/assets/books.css',
            '/others/assets/reader.js',
            'class="others-toc-trigger"',
            'class="others-toc-dialog"',
            'class="legal-footer"',
            '/about-us/', '/contact-us/', '/privacy-policy/', '/terms-of-service/'
        )
        for token in required:
            with self.subTest(token=token):
                self.assertIn(token, self.html)
        self.assertEqual(self.html.count('class="legal-footer"'), 1)
        self.assertEqual(self.html.count('class="others-toc-dialog"'), 1)
        self.assertIn("লোক", self.html.split("</header>", 1)[0])
        self.assertNotRegex(self.html, r'<meta[^>]+noindex')


if __name__ == "__main__":
    unittest.main(verbosity=2)
