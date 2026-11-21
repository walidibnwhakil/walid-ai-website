"""Layout regression checks against current Quran HTML and reader behaviour."""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "islam" / "quran"


def surah_page(slug):
    return (ROOT / slug / "index.html").read_text(encoding="utf-8")


class QuranLayoutTests(unittest.TestCase):
    def test_fatiha_header_and_meaning_semantics(self):
        html = surah_page("al-fatiha")
        reader = (ROOT / "reader.js").read_text(encoding="utf-8")
        self.assertIn('<h1 id="surah-title">সূরা আল-ফাতিহা</h1>', html)
        self.assertIn('<p class="banner-meaning">সূচনা</p>', html)
        self.assertIn('<div class="hero-arabic" lang="ar" dir="rtl">الفاتحة</div>', html)
        self.assertIn("meaning.textContent = bengaliMeta.meaning", reader)
        self.assertNotIn("অর্থ: সূচনাকারী / উদ্বোধন", html)

    def test_static_verses_and_standalone_basmala(self):
        for slug, count, has_basmala in (
            ("al-fatiha", 7, True),
            ("al-baqarah", 286, True),
            ("at-tawba", 129, False),
            ("an-naas", 6, True),
        ):
            with self.subTest(surah=slug):
                html = surah_page(slug)
                ayat = re.findall(r'<article class="ayah" id="ayah-(\d+)"', html)
                self.assertEqual(len(ayat), count)
                self.assertEqual([int(n) for n in ayat], list(range(1, count + 1)))
                self.assertEqual('<article class="ayah basmala">' in html, has_basmala)
                self.assertIn('class="translation"', html)
                self.assertIn('id="surah-context"', html)
                self.assertIn('id="verses"', html)
                self.assertNotIn('class="basmala-label"', html)

    def test_notes_remain_in_normal_flow(self):
        css = (ROOT / "quran.css").read_text(encoding="utf-8")
        self.assertIn(".basmala .arabic", css)
        self.assertIn(".ayah .ayah-note{position:static!important", css)
        self.assertIn("overflow:visible!important", css)
        self.assertIn("clip-path:none!important", css)


if __name__ == "__main__":
    unittest.main()
