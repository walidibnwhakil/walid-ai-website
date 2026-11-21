"""Alexander-only narrative chronology, content, and UI contract regression."""
from pathlib import Path
import re
import unittest

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/"others/history/alexander/index.html").read_text(encoding="utf8")
CSS=(ROOT/"others/assets/books.css").read_text(encoding="utf8")
CHAPTERS=[(int(n), title, text) for n,title,text in re.findall(
    r'<section class="others-chapter" id="chapter-(\d+)"><h2>([^<]*)</h2>(.*?)</section>', HTML, re.S)]
SECTIONS={n:content for n,_,content in CHAPTERS}

class AlexanderEditorialTests(unittest.TestCase):
    def test_chapters_and_toc(self):
        self.assertEqual([n for n,_,_ in CHAPTERS],list(range(1,22)))
        nav=re.search(r'<nav class="others-toc" aria-label="অধ্যায় তালিকা">(.*?)</nav>',HTML,re.S)
        self.assertIsNotNone(nav)
        links=[(int(n),title) for n,title in re.findall(r'<a href="#chapter-(\d+)">([^<]*)</a>',nav.group(1))]
        self.assertEqual(links,[(n,title) for n,title,_ in CHAPTERS])

    def test_substantive_chapter_depth(self):
        counts={n:body.count("<p>") for n,_,body in CHAPTERS}
        self.assertGreaterEqual(sum(counts.values()),245)
        self.assertTrue(all(n>=8 for n in counts.values()), counts)
        for n,minimum in {6:13,7:12,8:11,10:13,12:11,15:14,17:13,18:12,19:13,20:16,21:20}.items():
            self.assertGreaterEqual(counts[n],minimum)

    def test_historic_people_and_war_context(self):
        terms={
            1:["ফিলিপ","অলিম্পিয়াস"],2:["অ্যারিস্টটল","কাইরোনিয়া"],
            3:["পাউসানিয়াস","ক্লিওপেট্রা ইউরিদিকে"],
            6:["গ্রানিকাস","আরসিতেস","হালিকারনাসাস"],
            7:["ইসুস","পিনারুস","দারিয়ুস","বারসিনে"],
            8:["টাইর","গাজা","বাটিস","সাইপ্রাস"],
            9:["সিওয়া","আলেকজান্দ্রিয়া"],
            10:["গগামেলা","মাজাইয়ুস","পারস্য গেট","পার্সেপোলিস"],
            11:["ফিলোটাস","পারমেনিয়ন","বেসুস"],
            12:["স্পিতামেনেস","মারাকান্দা","ক্লেইতুস"],
            13:["রোক্সানা","অক্সিয়ার্তেস","ক্যালিসথেনেস"],
            15:["তক্ষশিলা","পোরাস","ক্রেটেরাস","কোয়েনুস"],
            16:["বিপাশা","কোয়েনুস"],
            17:["মল্ল","নিয়ারখুস","গেদ্রোসিয়া"],
            18:["স্টেটাইরা","পারিসাতিস","ওপিস"],
            19:["হেফাইস্টিয়ন","ব্যাবিলন"],
            20:["আরহিদাইয়ুস","পার্দিক্কাস","কাসান্দার"],
            21:["হেরাক্লেস","ইপসুস","সেলিউকাস","লিসিমাখোস"]}
        for n,words in terms.items():
            for word in words:
                self.assertIn(word,SECTIONS[n],f"chapter {n}: {word}")

    def test_royal_succession_is_chronological(self):
        self.assertIn("চতুর্থ আলেকজান্ডার",SECTIONS[20])
        self.assertIn("৩১০–৩০৯",SECTIONS[21])
        self.assertNotIn("৩১০–৩০৯","".join(SECTIONS[n] for n in range(1,20)))
        self.assertIn("পিতৃত্ব",SECTIONS[20]+SECTIONS[21])
        self.assertIn("২৮১",CHAPTERS[-1][1])

    def test_uncertainties_honored(self):
        self.assertIn("বিষ প্রয়োগ",SECTIONS[19])
        for word in ["মতভেদ","প্রাচীন","নির্ভরযোগ্য","অনিশ্চিত"]:
            self.assertIn(word,HTML)

    def test_unchanged_site_brand_navigation_and_footer(self):
        self.assertIn('<html lang="bn">',HTML)
        self.assertIn('rel="canonical" href="https://walid-ai.com/others/history/alexander/"',HTML)
        self.assertIn('/walid-ai-approved-logo.png',HTML)
        self.assertIn('/others/assets/books.css',HTML)
        self.assertIn('/others/assets/reader.js',HTML)
        self.assertEqual(HTML.count('<footer class="legal-footer">'),1)
        self.assertEqual(HTML.count('class="others-toc-dialog"'),1)
        self.assertNotRegex(HTML,r'class="others-(?:sources|next)"')
        self.assertNotIn("উৎস ও পরবর্তী পাঠ",HTML)
        for token in ["SolaimanLipi","walid-ai-approved-flower.png","others-flower-spin"]:
            self.assertIn(token,CSS)

if __name__=="__main__":
    unittest.main(verbosity=2)
