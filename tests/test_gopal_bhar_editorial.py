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


    def test_all_punchlines_unique_and_folklore_not_pretended_history(self):
        """Make the seventeen resolutions independent, with grounded and distinct joke mechanics."""
        title = self.html.split('</header>', 1)[0]
        self.assertIn("সমকালীন প্রমাণ প্রতিষ্ঠিত নয়", title)
        self.assertIn("স্বাধীনভাবে রচিত কল্পকাহিনি", title)
        self.assertIn("রাজা কৃষ্ণচন্দ্র", title)
        motifs = {
            1: ("আয়না", "কেরানি", "পাগড়ি"),
            2: ("পাল্লা", "মুদ্রা", "বাটখারা"),
            3: ("ছায়া", "মুদ্রার শব্দ", "পথিক"),
            4: ("জামা", "পোলাও", "পাহারাদার"),
            5: ("ঠাকুরদা", "দেনা", "মিথ্যে"),
            6: ("কলসি", "জমি", "পুকুর"),
            7: ("ছাগল", "ঘণ্টা", "খিল"),
            8: ("পানের বাটি", "দান", "বৃদ্ধা"),
            9: ("পণ্ডিত", "কম্বল", "গিঁট"),
            10: ("খাতা", "রসিদ", "সই"),
            11: ("স্বাদপরীক্ষা", "ময়রা", "ছেলেটি"),
            12: ("ছিদ্র নেই", "বাঁশি", "সুর"),
            13: ("আংটি", "পাগড়ি", "পরিচারক"),
            14: ("স্বর্ণকার", "পিতল", "পরীক্ষা"),
            15: ("সাতটি", "দর্জি", "রসিদ"),
            16: ("ফলক", "মেঘ", "নালা"),
            17: ("খালি কলসি", "কুয়ো", "কাজ"),
        }
        seen_paragraphs = set()
        punchlines = set()
        for num, _, body in self.sections:
            story = int(num)
            paras = re.findall(r'<p>(.*?)</p>', body, flags=re.S)
            for token in motifs[story]:
                with self.subTest(chapter=num, motif=token):
                    self.assertIn(token, body, "Story lost its distinctive device")
            for para in paras:
                self.assertNotIn(para, seen_paragraphs, "Recycled paragraph across stories")
                seen_paragraphs.add(para)
            self.assertGreaterEqual(len(paras[-1]), 250, "Abrupt story ending")
            self.assertNotIn(paras[-1], punchlines, "Reused punchline")
            punchlines.add(paras[-1])
            self.assertGreaterEqual(len(re.findall(r'‘[^’]{3,}’', body)), 3, "Needs lively dialogue")
        self.assertEqual(len(punchlines), 17)

    def test_folktale_provenance_and_scene_continuity(self):
        """The tale cycle is literary folklore, with no duplicated later outcome."""
        preface = self.html.split("</header>", 1)[0]
        for motif_title in (
            "গাছের ছায়ার দাম", "ভোজে পোশাকের সম্মান",
            "শহরের সবচেয়ে বড় মিথ্যুক", "পণ্ডিতের কঠিন প্রশ্ন"
        ):
            self.assertIn(motif_title, preface)
        self.assertIn("বাকি গল্পগুলো এই সংকলনের স্বাধীন সাহিত্যিক নির্মাণ", preface)
        self.assertIn("সমকালীন দলিল", preface)

        bodies = {int(number): body for number, _, body in self.sections}
        self.assertNotIn("শেষ মুদ্রাটি", bodies[2], "The merchant was paid twice")
        self.assertIn("বাকি দুটি মুদ্রা", bodies[2])
        self.assertIn("অন্য দাবিদার", bodies[6], "Buried gold cannot be ruled on without evidence")
        self.assertIn("নিজের ইচ্ছায়", bodies[6], "The pond donation must be voluntary")
        self.assertNotIn("দরজার বাইরে অপেক্ষা করা বৃদ্ধা এবার", bodies[8])
        self.assertEqual(bodies[12].count("পরদিন"), 1, "Flute episode restarts the next day")
        self.assertIn("বাঁশটি নিজের বগলে", bodies[12], "Gopal must retain the flute")
        self.assertNotIn("আংটি পাওয়া গেল ঠিকই", bodies[13], "The ring cannot be found again")
        self.assertIn("আংটি যথাস্থানেই", bodies[13])
        self.assertIn("সন্ধ্যায় মেরামত হওয়া কুয়োর ধারে", bodies[17])

        # The original punchline must resolve the present scene, not trail off in moralizing.
        endings = [re.findall(r"<p>(.*?)</p>", body, flags=re.S)[-1]
                   for _, _, body in self.sections]
        self.assertEqual(len(set(endings)), 17)
        for ending in endings:
            self.assertNotIn("শিক্ষা হলো", ending)
            self.assertNotIn("পাঠকদের", ending)

    def test_folklore_catalog_has_a_distinct_gopal_icon(self):
        catalog = (ROOT / "others/folklore/index.html").read_text(encoding="utf-8")
        cards = re.findall(r'<a class="others-card" href="([^"]+)">(.*?)</a>', catalog, re.S)
        graphics = {}
        for href, card in cards:
            match = re.search(r'<svg\b.*?</svg>', card, flags=re.S)
            self.assertIsNotNone(match, "Missing icon for " + href)
            graphics[href] = match.group()
        gopal = graphics["/others/folklore/gopal-bhar/"]
        self.assertNotIn(gopal, [v for k, v in graphics.items() if k != "/others/folklore/gopal-bhar/"])

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
