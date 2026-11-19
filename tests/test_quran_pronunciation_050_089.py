"""Focused, repeatable source-fidelity checks for the Quran 50–89 reading aid.

This does NOT certify makhraj, madd or recitation-grade tajwid accuracy.
"""
import json
import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "islam" / "quran" / "data"


class QuranPronunciationDrafts(unittest.TestCase):
    def test_concrete_connected_recitation_repairs(self):
        data = {item["verse"]: item["pronunciation"] for item in json.loads(
            (DATA / "surah-050.json").read_text(encoding="utf-8")
        )["verses"]}
        self.assertEqual(
            data[17],
            "ইয্ ইয়াতালাক্কাল মুতালাক্কিয়ানি আনিল ইয়ামীন ওয়া আনিশ্ শিমালি ক্বাঈদ।",
        )
        self.assertEqual(
            data[44],
            "ইয়াওমা তাশাক্কাকুল আরদু আনহুম সিরা‘আন। যালিকা হাশরুন ‘আলাইনা ইয়াসীর।",
        )
        self.assertNotIn("‘ানি", data[17])
        self.assertNotIn("আলমুতালাক্ব্ক্বীনি", data[17])
        self.assertNotIn("আলআরদু", data[44])
        self.assertEqual(data[8], "তাবসিরাত ওয়া যিকরা লিকুল্লি আবদিন মুনীব।")
        self.assertEqual(data[13], "ওয়া-আদুন ওয়া-ফিরআওনু ওয়া-ইখওয়ানু লূত।")
        self.assertEqual(data[18], "মা ইয়ালফিযু মিন ক্বাওলিন ইল্লা লাদাইহি রাকীবুন আতীদ।")
        self.assertEqual(data[22], "লাক্বাদ কুনতা ফী গাফলাতিন মিন হাযা ফাকাশাফনা আনকা গিতাআকা ফাবাসারুকাল-ইয়াওমা হাদীদ।")
        self.assertEqual(data[23], "ওয়া ক্বালা ক্বারীনুহু হাযা মা লাদাইয়া আতীদ।")
        self.assertEqual(data[29], "মা ইউবাদ্দালুল-ক্বাওলু লাদাইয়া ওয়া মা আনা বিজাল্লামিল-লিল-আবীদ।")
        self.assertEqual(data[4], "ক্বাদ আলিমনা মা তানক্বুসু আল-আরদু মিনহুম ওয়া ‘ইনদানা কিতাবুন্ হাফীজ।")
        self.assertEqual(data[7], "ওয়াল-আরদা মাদাদনাহা ওয়া আলক্বায়না ফীহা রাওয়াসী ওয়া আনবাতনা ফীহা মিন কুল্লি যাওজিন বাহীজ।")
        self.assertEqual(data[8], "তাবসিরাত ওয়া যিকরা লিকুল্লি ‘আবদিন মুনীব।")
        # Representative regressions from the 51–89 batch: malformed ayn-vowel
        # joins are repaired without changing Arabic, translation, or numbering.
        for number, verses in ((51, [9, 13, 25]), (68, [6, 13]), (89, [6, 13, 18])):
            source = json.loads((DATA / f"surah-{number:03}.json").read_text(encoding="utf-8"))
            by_verse = {item["verse"]: item["pronunciation"] for item in source["verses"]}
            for verse in verses:
                self.assertNotRegex(by_verse[verse], r"‘[ািুেো]")

    def test_coverage_and_unmodified_arabic_translation(self):
        ayat = 0
        for number in range(50, 90):
            relative = f"islam/quran/data/surah-{number:03}.json"
            current = json.loads((ROOT / relative).read_text(encoding="utf-8"))
            base = json.loads(subprocess.check_output(
                ["git", "show", f"origin/main:{relative}"], cwd=ROOT
            ).decode("utf-8"))
            self.assertEqual(current["surah"], number)
            self.assertEqual(len(current["verses"]), len(base["verses"]))
            self.assertEqual([v["verse"] for v in current["verses"]],
                             list(range(1, len(base["verses"]) + 1)))
            for index, (verse, original) in enumerate(zip(current["verses"], base["verses"]), 1):
                stripped = {key: value for key, value in verse.items() if key != "pronunciation"}
                original_source = {key: value for key, value in original.items() if key != "pronunciation"}
                self.assertEqual(stripped, original_source, f"{number}:{index}: Quran source changed")
                text = verse.get("pronunciation")
                self.assertIsInstance(text, str, f"{number}:{index}")
                self.assertTrue(text.strip() and text.endswith("।"), f"{number}:{index}")
                last_arabic = verse["arabic"].strip().split()[-1]
                if re.search(r"[ࣱٌࣲٍ]", last_arabic):
                    self.assertIsNone(
                        re.search(r"(?:উন্|ইন্)\u0964$", text),
                        f"{number}:{index}: verse-final tanwin contradicts waqf"
                    )
                # At a verse boundary, alif maqsurah retains its long ā.
                # A prior generator silently omitted this vowel in 68 verses.
                ending = text.removesuffix("।").strip()
                if re.search(r"[ࣰً]", last_arabic):
                    self.assertFalse(
                        ending.endswith("ন্"),
                        f"{number}:{index}: fathatan is not dropped at verse-final waqf"
                    )
                # Waqf on fathatan (including the unprinted alif after hamza)
                # changes -an into long -aa, except on ta marbuta (stops as h).
                if re.search(r"[ࣰً][اىٰ]?$", last_arabic) and not re.search(r"ة[ࣰً]$", last_arabic):
                    self.assertTrue(
                        ending.endswith(("া", "আ")),
                        f"{number}:{index}: missing madd al-iwad long-aa"
                    )
                if last_arabic.endswith(("ى", "ىٰ")):
                    self.assertTrue(
                        ending.endswith(("া", "আ")),
                        f"{number}:{index}: lost final alif-maqsurah long-aa"
                    )
                if re.search(r"ة[ࣰًࣱٌࣲٍَُِ]?$", last_arabic):
                    self.assertTrue(
                        ending.endswith(("হ", "া")),
                        f"{number}:{index}: ta marbuta has wrong waqf ending"
                    )
                ayat += 1
        self.assertEqual(ayat, 1393)


if __name__ == "__main__":
    unittest.main()
