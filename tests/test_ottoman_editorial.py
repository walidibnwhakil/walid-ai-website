"""Focused editorial and page-contract checks for the Ottoman history book."""
from pathlib import Path
import re
import json
import unittest

PAGE = Path(__file__).resolve().parents[1] / "others/history/ottoman-empire/index.html"
EXPECTED = [
    "এরতুঘরুল", "উসমান প্রথম", "ওরহান", "প্রথম মুরাদ", "প্রথম বায়েজিদ",
    "অন্তর্বর্তীকাল", "প্রথম মেহমেদ", "দ্বিতীয় মুরাদ", "দ্বিতীয় মেহমেদ",
    "দ্বিতীয় বায়েজিদ", "প্রথম সেলিম", "প্রথম সুলেমান", "দ্বিতীয় সেলিম",
    "তৃতীয় মুরাদ", "তৃতীয় মেহমেদ", "প্রথম আহমেদ", "প্রথম মুস্তাফা",
    "দ্বিতীয় উসমান", "চতুর্থ মুরাদ", "ইব্রাহিম", "চতুর্থ মেহমেদ",
    "দ্বিতীয় সুলেমান", "দ্বিতীয় আহমেদ", "দ্বিতীয় মুস্তাফা",
    "তৃতীয় আহমেদ", "প্রথম মাহমুদ", "তৃতীয় উসমান", "তৃতীয় মুস্তাফা",
    "প্রথম আবদুলহামিদ", "তৃতীয় সেলিম", "চতুর্থ মুস্তাফা",
    "দ্বিতীয় মাহমুদ", "প্রথম আবদুলমজিদ", "আবদুলআজিজ", "পঞ্চম মুরাদ",
    "দ্বিতীয় আবদুলহামিদ", "পঞ্চম মেহমেদ", "ষষ্ঠ মেহমেদ"
]
TEXT = PAGE.read_text(encoding="utf-8")
SECTIONS = re.findall(r'<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)</h2>(.*?)</section>', TEXT, re.S)
LINKS = re.findall(r'<a href="#chapter-(\d+)">([^<]+)</a>', TEXT)

class OttomanEditorialTests(unittest.TestCase):
    def test_chapter_order_and_toc(self):
        self.assertEqual(len(SECTIONS), 38)
        self.assertEqual(len(LINKS), 38)
        self.assertIn("৩৮টি অধ্যায়", TEXT)
        for i, (number, title, content) in enumerate(SECTIONS, 1):
            self.assertEqual(int(number), i)
            self.assertIn(EXPECTED[i-1], title)
            self.assertEqual((str(i), title), LINKS[i-1])
            self.assertGreaterEqual(content.count("<p>"), 5, f"Chapter {i}")
        self.assertEqual(len({title for _,title,_ in SECTIONS}), 38)

    def test_reign_material_not_detached(self):
        contents = {int(n): html for n, _, html in SECTIONS}
        for name in ["হুররেম", "মাহিদেভরান", "মিহরিমাহ", "ইব্রাহিম পাশা", "রুস্তেম", "মুস্তাফা", "বায়েজিদ", "জিহাঙ্গীর"]:
            self.assertIn(name, contents[12], f"Suleiman missing {name}")
        for n, name in [(9, "জেম"), (11, "পিরি মেহমেদ"), (16, "কসেম"),
                        (18, "ইয়েদিকুল"), (19, "কসেম"), (21, "তুরহান"),
                        (21, "কোপ্রুলু"), (37, "কৃষ্ণসাগর"), (37, "আর্মেনীয় গণহত্যা"),
                        (38, "সানরেমো"), (38, "১৯৫২"), (38, "১৯৭৪")]:
            self.assertIn(name, contents[n], f"Chapter {n} missing {name}")
        old_detached = ("হুররেম সুলতান:", "কসেম সুলতান:", "তুরহান সুলতান:",
                        "দ্বিতীয় উসমানের হত্যা:", "প্রথম বিশ্বযুদ্ধে যোগদানের সিদ্ধান্ত:")
        self.assertFalse(any(t.startswith(old_detached) for _,t,_ in SECTIONS))

    def test_no_duplicate_prose_or_empty_sections(self):
        paragraphs = [re.sub(r'<[^>]+>', "", p).strip()
                      for _,_,block in SECTIONS
                      for p in re.findall(r"<p>(.*?)</p>", block, re.S)]
        self.assertGreater(len(paragraphs), 340)
        self.assertEqual(len(paragraphs),len(set(paragraphs)))
        self.assertTrue(all(len(p) >= 100 for p in paragraphs))

    def test_deep_chronology_and_anatolian_conflict(self):
        chapters = {int(n): re.sub(r'<[^>]+>', '', html)
                    for n, _, html in SECTIONS}
        self.assertGreaterEqual(len(re.findall(r'<p>', SECTIONS[4][2])), 14)
        self.assertGreaterEqual(len(re.findall(r'<p>', SECTIONS[5][2])), 10)
        for term in ("১৩৯৮", "দিল্লি", "১৪০২", "কারা ইউসুফ",
                     "আহমেদ", "মুতাহহারতেন", "সিভাস", "চুবুক", "বন্দি", "আকশেহির"):
            self.assertIn(term, chapters[5])
        self.assertLess(chapters[5].index("১৩৯৮"), chapters[5].index("১৪০২"))
        for term in ("গালিপোলি", "ইসা", "সুলেমান", "মুসা", "মেহমেদ",
                     "বুরসা", "১৪১৩", "চামুরলু"):
            self.assertIn(term, chapters[6])
        self.assertIn("১৪৯৫", chapters[10], "Cem's later fate belongs to Bayezid II")
        self.assertNotIn("১৪৯৫", chapters[9])
        for num, terms in {
            12: ("হুররেম", "মাহিদেভরান", "ইব্রাহিম পাশা", "রুস্তেম",
                 "মুস্তাফা", "সেলিম", "বায়েজিদ", "সিগেতভার"),
            18: ("ইয়েদিকুল", "খোতিন", "জানিসারি"),
            21: ("কসেম", "তুরহান", "কোপ্রুলু", "১৬৮৩"),
            37: ("২ আগস্ট", "২৯ অক্টোবর", "সৌচোন", "তলাত",
                 "আর্মেনীয় গণহত্যা", "গ্যালিপোলি"),
            38: ("লোজান", "আবদুলমজিদ দ্বিতীয়", "নাজিকেদা",
                 "১৯২৪", "১৯২৬", "১৯৫২", "১৯৭৪"),
        }.items():
            for term in terms:
                self.assertIn(term, chapters[num], f"Chapter {num} missing {term}")

    def test_external_attribution_and_time_order(self):
        match = re.search(r'<script id="ottoman-source-metadata" type="application/ld\+json">(.*?)</script>', TEXT, re.S)
        self.assertIsNotNone(match, "Bibliographic JSON-LD should stay outside prose")
        book = json.loads(match.group(1))
        self.assertEqual(book.get("inLanguage"), "bn")
        self.assertGreaterEqual(len(book["citation"]), 10)
        self.assertTrue(all(v.get("url", "").startswith("https://") for v in book["citation"]))
        chapters = {int(n): re.sub(r'<[^>]+>', '', html)
                    for n, _, html in SECTIONS}
        end = chapters[38]
        for earlier, later in [("মুদ্রোস", "সেভ্র"), ("সেভ্র", "লোজান"),
                               ("১৯২৪ সালের ৩ মার্চ", "১৯২৬ সালের"),
                               ("১৯২৬ সালের", "১৯৫২ সালে")]:
            self.assertLess(end.index(earlier), end.index(later),
                            f"Chronology reversed: {earlier} / {later}")

    def test_brand_links_and_policy_unchanged(self):
        for required in ('href="https://walid-ai.com/others/history/ottoman-empire/"',
                         'href="/others/assets/books.css?v=20261121-editorial"',
                         '/others/assets/reader.js?v=20261121-editorial',
                         '/walid-ai-approved-logo.png', 'class="legal-footer"',
                         'href="/about-us/"', 'href="/privacy-policy/"'):
            self.assertIn(required, TEXT)
        self.assertEqual(TEXT.count('class="legal-footer"'), 1)
        self.assertNotIn('class="others-sources"', TEXT)
        self.assertNotIn('class="others-next"', TEXT)
        self.assertNotIn('noindex', TEXT)


    def test_fatih_to_bayezid_transition_without_future_spoilers(self):
        fatih = re.sub(r'<[^>]+>', '', SECTIONS[8][2])
        bayezid = re.sub(r'<[^>]+>', '', SECTIONS[9][2])
        self.assertNotIn("১৪৮২", fatih,
            "Gedik Ahmed's later execution belongs to Bayezid II")
        self.assertIn("১৪৮২ সালের নভেম্বরে এডিরনে গেদিককে মৃত্যুদণ্ড", bayezid)
        for text, events in (
            (fatih, ("১৪৭৩ সালের ওতলুকবেলি", "১৪৭৫ সালে কাফা",
                     "১৪৮০ সালে গেদিক আহমেদ", "১৪৮১ সালে অভিযানের")),
            (bayezid, ("১৪৮১ সালে জেমের বাহিনীর", "১৪৮২ সালের নভেম্বরে",
                       "১৪৮৫–৯১ সালে", "১৪৯২ সালে", "১৪৯৫ সালে নেপলসে",
                       "১৪৯৯–১৫০৩ সালের", "১৫০৯ সালে ইস্তাম্বুল", "১৫১১ সালের শাহকুলু",
                       "১৫১২ সালের এপ্রিলে")),
        ):
            previous = -1
            for event in events:
                pos = text.find(event)
                self.assertGreater(pos, previous,
                    f"Fatih/Bayezid chronology regressed: {event}")
                previous = pos
        self.assertEqual(bayezid.count("১৪৯৫ সালে নেপলসে"), 1)
        self.assertEqual(fatih.count("১৪৭৩ সালের ওতলুকবেলি"), 1)

    def test_integrated_suleiman_sequence(self):
        """Each major Suleiman episode has one forward-moving narrative location."""
        prose = re.sub(r'<[^>]+>', '', SECTIONS[11][2])
        timeline = (
            "১৫২৬ সালের মোহাচ অভিযানে",
            "১৫৩৩–৩৫ সালের ইরাকাইন অভিযানে",
            "১৫৩৬ সালের মার্চে",
            "১৫৫৩ সালের পূর্ব অভিযানে",
            "১৫৫৫ সালের আমাসিয়া",
            "১৫৫৮ সালের এপ্রিলে",
            "১৫৫৯ সালে সশস্ত্র",
            "১৫৬২ সালে বায়েজিদ",
            "১৫৬৬ সালের অভিযানে",
        )
        previous = -1
        for scene in timeline:
            self.assertEqual(prose.count(scene), 1, f"Duplicate/missing Suleiman scene: {scene}")
            position = prose.index(scene)
            self.assertGreater(position, previous, f"Reverse chronology at {scene}")
            previous = position
        self.assertIn("মিহরিমাহ", prose)
        self.assertIn("জিহাঙ্গীর", prose)
        self.assertIn("কারা আহমেদ পাশা", prose)

    def test_bayezid_sons_remain_in_suleiman_reign_with_source_caution(self):
        """Bayezid's fifth son's fate and the disputed death date belong to Suleiman I."""
        chapters = {int(n): re.sub(r'<[^>]+>', '', block)
                    for n, _, block in SECTIONS}
        suleiman = chapters[12]
        self.assertIn("১৫৬২ সালে বায়েজিদ", suleiman)
        self.assertIn("কাজভিনে থাকা চার পুত্র", suleiman)
        self.assertIn("বুরসায় থাকা তাঁর অল্পবয়সী পঞ্চম পুত্র", suleiman)
        self.assertIn("১৫৬১ সালের উল্লেখ", suleiman)
        self.assertIn("শেরাফেত্তিন তুরানের", suleiman)
        self.assertNotIn("বুরসায় থাকা তাঁর অল্পবয়সী পঞ্চম পুত্র", chapters[13])
        source = re.search(
            r'<script id="ottoman-source-metadata" type="application/ld\+json">(.*?)</script>',
            TEXT, re.S)
        self.assertIsNotNone(source)
        references = json.loads(source.group(1))["citation"]
        self.assertIn("https://islamansiklopedisi.org.tr/bayezid-sehzade",
                      [item["url"] for item in references])

    def test_other_reigns_do_not_replay_key_scenes(self):
        chapters = {
            int(number): re.sub(r'<[^>]+>', '', block)
            for number, _, block in SECTIONS
        }
        for chapter, scene in (
            (8, "১৪৪৪ সালের ভার্না"), (14, "১৫৯০ সালের ফেরহাদ পাশা"),
            (15, "উনিশ ভাইকে শ্বাসরোধে"), (18, "ইয়েদিকুলে বন্দিশালায়"),
            (21, "১৬৫৬ সালে তুরহান কোপ্রুলু"), (29, "চতুর্থ মুস্তাফা এবং দ্বিতীয় মাহমুদ"),
            (32, "১৮২৬ সালে জানিসারি"), (34, "১৮৭৬ সালে মিধাত পাশা"),
            (35, "১৮৭৮ সালে তাঁকে পুনরায়"), (36, "১৮৭৭–৭৮ সালের রুশ-উসমানীয়"),
            (37, "২৯ অক্টোবর উসমানীয় পতাকাবাহী"), (38, "১৯২০ সালে স্বাক্ষরিত সেভ্র"),
        ):
            self.assertEqual(chapters[chapter].count(scene), 1,
                             f"Repeated/missing complete historical scene in chapter {chapter}: {scene}")
        for chapter, milestones in (
            (8, ("১৪২১", "১৪৪৪", "১৪৪৬", "১৪৫১")),
            (18, ("শাহজাদা মেহমেদকে হত্যা", "খোতিনের যুদ্ধ", "১৬২২ সালের মে", "ইয়েদিকুলে বন্দিশালায়")),
            (32, ("১৮০৮", "১৮২৬", "১৮২৭", "১৮৩৩", "১৮৩৯")),
            (37, ("২ আগস্ট", "২৫ অক্টোবর", "২৯ অক্টোবর", "১৯১৫ সালের এপ্রিল")),
            (38, ("মুদ্রোস", "সেভ্র", "লোজান", "১৯২৪ সালের ৩ মার্চ", "১৯২৬ সালের", "১৯৫২ সালের")),
        ):
            previous = -1
            for milestone in milestones:
                pos = chapters[chapter].find(milestone)
                self.assertGreater(pos, previous,
                    f"Missing/out-of-order chronology in chapter {chapter}: {milestone}")
                previous = pos

    def test_sources_and_branding_survive_full_editorial_revision(self):
        self.assertEqual(len(SECTIONS), len(LINKS))
        self.assertEqual(TEXT.count('class="legal-footer"'), 1)
        self.assertIn('/walid-ai-approved-logo.png', TEXT)
        self.assertIn('/others/assets/books.css', TEXT)
        self.assertIn('/others/assets/reader.js', TEXT)
        self.assertNotIn('class="others-sources"', TEXT)
        self.assertNotIn('class="others-next"', TEXT)
        source = re.search(
            r'<script id="ottoman-source-metadata" type="application/ld\+json">(.*?)</script>',
            TEXT, re.S
        )
        self.assertIsNotNone(source)
        references = json.loads(source.group(1))["citation"]
        urls = [item["url"] for item in references]
        self.assertEqual(len(urls), len(set(urls)))
        self.assertGreaterEqual(len(urls), 15)

if __name__ == "__main__":
    unittest.main()
