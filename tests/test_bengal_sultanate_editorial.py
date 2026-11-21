"""Volume-scoped editorial regression: Bengal Sultanate."""
from pathlib import Path
import json,re,unittest
ROOT=Path(__file__).resolve().parents[1]
PAGE=(ROOT/"others/history/bengal-sultanate/index.html").read_text(encoding="utf-8")
URL="https://walid-ai.com/others/history/bengal-sultanate/"
CHAPTERS=re.findall(r'<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)</h2>(.*?)</section>',PAGE,re.S)
class BengalSultanateEditorialTests(unittest.TestCase):
 def test_chapters_and_toc(self):
  self.assertEqual(len(CHAPTERS),15)
  self.assertEqual([int(n) for n,_,_ in CHAPTERS],list(range(1,16)))
  toc=re.findall(r'<li><a href="#chapter-(\d+)">(.*?)</a></li>',PAGE)
  self.assertEqual(toc,[(n,h) for n,h,_ in CHAPTERS])
  self.assertIn("অধ্যায়সূচি — 15টি অধ্যায়",PAGE)
 def test_depth_and_no_exact_repetition(self):
  paragraphs=[]
  for n,_,body in CHAPTERS:
   ps=[re.sub(r"<[^>]+>","",p).strip() for p in re.findall(r"<p>(.*?)</p>",body,re.S)]
   self.assertGreaterEqual(len(ps),13,f"Chapter {n} abbreviated")
   self.assertTrue(all(len(p)>=155 for p in ps),f"Chapter {n} has thin paragraph")
   paragraphs.extend(ps)
  self.assertGreaterEqual(len(paragraphs),220)
  self.assertEqual(len(set(paragraphs)),len(paragraphs))
 def test_historical_order_and_people(self):
  must={
   1:("বখতিয়ার","সোনারগাঁও"),2:("ফখরুদ্দিন","ইবন বতুতা","চট্টগ্রাম"),
   3:("ইলিয়াস শাহ","১৩৫২","একডালা"),4:("সিকন্দর","আদিনা","আজম শাহ"),
   5:("আজম শাহ","মিং","হামজা"),6:("রাজা গণেশ","যদু","জালালউদ্দিন","দনুজমর্দন"),
   7:("খলিফাতাবাদ","খান জাহান","বারবক"),8:("ফতেহ শাহ","হাবশি","মুজাফফর"),
   9:("হুসেন শাহ","নীলাম্বর","পরাগল খান","চট্টগ্রাম"),
   10:("নসরত শাহ","বাবর","ঘাঘরা"),11:("গিয়াসউদ্দিন মাহমুদ","হুমায়ুন","চৌসা"),
   12:("ইসলাম শাহ","মুহাম্মদ শাহ","হিমু","জালাল শাহ"),
   13:("সুলায়মান","মুকুন্দ","কালাপাহাড়","চিলারায়","লুদি"),
   14:("বায়েজিদ","দাউদ","ইসমাইল","টুকারই","১২ জুলাই ১৫৭৬"),
   15:("ঈসা খান","মুসা খান","কৃষি","নারী","শিলালিপি")}
  for n,tokens in must.items():
   body=re.sub(r"<[^>]+>"," ",CHAPTERS[n-1][2])
   for token in tokens:self.assertIn(token,body,f"Chapter {n} missing {token}")
 def test_research_and_source_metadata(self):
  for token in ("মতভেদ","শিলালিপি","মুদ্রা","রাজস্ব","নারী"):
   self.assertIn(token,PAGE)
  ld=re.search(r'<script type="application/ld\+json">(.*?)</script>',PAGE,re.S)
  self.assertIsNotNone(ld)
  data=json.loads(ld.group(1))
  self.assertEqual(data["@type"],"Book")
  self.assertEqual(data["inLanguage"],"bn")
  self.assertEqual(data["url"],URL)
  self.assertGreaterEqual(len(data["citation"]),7)
  self.assertTrue(all(c["url"].startswith("https://") for c in data["citation"]))
 def test_reader_shell(self):
  for token in ('<html lang="bn">',f'<link rel="canonical" href="{URL}">',
   '/walid-ai-approved-logo.png','/others/assets/books.css','/others/assets/reader.js',
   '/walid-legal.css','class="others-toc-trigger"','class="others-toc-dialog"'):
   self.assertIn(token,PAGE)
  self.assertEqual(PAGE.count('class="legal-footer"'),1)
  self.assertEqual(PAGE.count('class="others-reader"'),1)
  self.assertIn('/others/assets/books.css?v=20261121-solaiman',PAGE)
  self.assertNotIn("উৎস ও পরবর্তী পাঠ",PAGE)
  self.assertNotRegex(PAGE,r'class="others-(?:sources|next)"')
  self.assertNotIn("noindex",PAGE.lower())
  self.assertTrue(PAGE.rstrip().endswith("</html>"))
if __name__=="__main__":unittest.main()
