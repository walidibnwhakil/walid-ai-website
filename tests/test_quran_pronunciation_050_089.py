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
                original_stripped = {key: value for key, value in original.items() if key != "pronunciation"}
                self.assertEqual(stripped, original_stripped, f"{number}:{index}: Quran source changed")
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
