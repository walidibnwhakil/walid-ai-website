"""Rupban-only editorial, chronology, sources, and reader-shell regression checks."""
from html.parser import HTMLParser
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / "others/folklore/rupban/index.html"


class LinkScanner(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.fragments = []
        self.refs = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        if tag == "a":
            href = attrs.get("href", "")
            self.refs.append(href)
            if href.startswith("#"):
                self.fragments.append(href[1:])


class RupbanEditorialTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = BOOK.read_text(encoding="utf-8")
        cls.chapters = re.findall(
            r'<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)</h2>(.*?)</section>',
            cls.html, flags=re.S,
        )
        cls.toc = re.findall(r'<li><a href="#chapter-(\d+)">([^<]+)</a></li>', cls.html)

    def test_twelve_chapters_and_exact_chapter_links(self):
        self.assertEqual(len(self.chapters), 12)
        self.assertEqual(len(self.toc), 12)
        self.assertEqual(
            [(i, title) for i, title, _ in self.chapters], self.toc
        )
        self.assertEqual([int(i) for i, _, _ in self.chapters], list(range(1, 13)))
        self.assertIn("অধ্যায়সূচি — ১২টি অধ্যায়", self.html)
        scan = LinkScanner()
        scan.feed(self.html)
        self.assertEqual(len(scan.ids), len(set(scan.ids)), "duplicate HTML IDs")
        self.assertTrue(all(fragment in scan.ids for fragment in scan.fragments),
                        "TOC target does not exist")
        self.assertIn('href="/others/folklore/rupban/"',
                      (ROOT / "others/folklore/index.html").read_text(encoding="utf-8"))

    def test_all_chapters_are_fully_developed_and_distinct(self):
        seen = set()
        plot_beats = {
            1: ("একাব্বর", "জাহানারা", "উজির"),
            2: ("সাধক", "ডাকাত", "জঙ্গলরাজ", "উড়িয়াবাজ"),
            3: ("রহিম", "জাহানারা", "রূপবান"),
            4: ("উজির", "বন্দী", "প্রাণভিক্ষা"),
            5: ("বারো দিন", "মাঝি", "নদী"),
            6: ("ডাকাত", "বাঘ", "জঙ্গলরাজ", "আশ্রয়"),
            7: ("বৃদ্ধা", "কুটির", "পাঠশালা"),
            8: ("রহিম", "তাজেল", "সায়েদ", "শিক্ষক"),
            9: ("তাজেল", "জরির পোশাক", "ঘোড়া"),
            10: ("সায়েদ", "প্রহরী", "ঘোড়া", "কারাগার"),
            11: ("রূপবান", "তাজেল", "জঙ্গলরাজ", "ছদ্মবেশ"),
            12: ("জাহানারা", "একাব্বর", "রূপবান", "বৃদ্ধা"),
        }
        for number, title, body in self.chapters:
            with self.subTest(chapter=number, title=title):
                paragraphs = re.findall(r"<p>(.*?)</p>", body, flags=re.S)
                self.assertGreaterEqual(len(paragraphs), 7)
                self.assertGreaterEqual(sum(map(len, paragraphs)), 2400)
                self.assertTrue(all(len(para.strip()) >= 150 for para in paragraphs))
                for token in plot_beats[int(number)]:
                    self.assertIn(token, body)
                for para in paragraphs:
                    normalized = re.sub(r"\s+", " ", para).strip()
                    self.assertNotIn(normalized, seen, "duplicate paragraph")
                    seen.add(normalized)

    def test_coercion_and_variant_boundaries_are_clear(self):
        self.assertIn("শিশুবিবাহ এখানে ক্ষমতার চাপিয়ে দেওয়া সিদ্ধান্ত", self.html)
        self.assertIn("উজিরকে বন্দী", self.html)
        self.assertIn("নিজের নিরাপত্তা", self.chapters[10][2])
        self.assertIn("প্রচলিত বয়ানগুলো এক কথা বলে না", self.chapters[11][2])
        self.assertNotIn("তাকে সিংহাসনে বসানো হলো, রূপবান পেলেন রানির মর্যাদা", self.html)
        note = re.search(r'<p class="others-variant-note">(.*?)</p>', self.html, re.S)
        self.assertIsNotNone(note)
        for word in ("মঞ্চপালার", "১৯৬৫", "তাজেলের", "একাব্বরের", "শিশুবিবাহ"):
            self.assertIn(word, note.group(1))
        self.assertIn("সাহিত্যিক সংযোজন", note.group(1))
        self.assertIn("উল্লিখিত মঞ্চ ও চলচ্চিত্র প্রতিবেদনে তা নিশ্চিত নয়", note.group(1))
        self.assertIn("https://www.kaliokalam.com/", note.group(1))
        self.assertIn("https://anyadinbd.com/article/22027", note.group(1))
        for forbidden in ("উৎস ও পরবর্তী পাঠ", "এই অধ্যায়ে আমরা", "পাঠক শিখবেন",
                          'class="others-sources"', 'class="others-next"'):
            self.assertNotIn(forbidden, self.html)

    def test_walid_shell_branding_and_seo(self):
        for required in (
            '<html lang="bn">', 'name="viewport"',
            '<link rel="canonical" href="https://walid-ai.com/others/folklore/rupban/"',
            'name="description"', '/favicon.ico', '/walid-ai-approved-logo.png',
            '/others/assets/books.css', '/others/assets/reader.js',
            'class="others-toc-trigger"', 'class="others-toc-dialog"',
            'class="legal-footer"', '/about-us/', '/contact-us/',
            '/privacy-policy/', '/terms-of-service/',
        ):
            with self.subTest(required=required):
                self.assertIn(required, self.html)
        self.assertEqual(self.html.count('class="legal-footer"'), 1)
        self.assertEqual(self.html.count('class="others-variant-note"'), 1)
        self.assertEqual(self.html.count('rel="canonical"'), 1)


if __name__ == "__main__":
    unittest.main()
