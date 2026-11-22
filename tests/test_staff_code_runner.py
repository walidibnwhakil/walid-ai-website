"""Bounded CSE change safety checks; no provider or network access required."""
import importlib.util
from pathlib import Path
import tempfile
from unittest import TestCase, mock


FILE = Path(__file__).resolve().parents[1] / "scripts" / "staff_code_runner.py"
SPEC = importlib.util.spec_from_file_location("staff_code_runner", FILE)
runner = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(runner)


class StaffCoderGuardTests(TestCase):
    def test_protected_files_cannot_be_modified(self):
        for path in (
            "admin-staff.html", "admin/index.html", "admin-ops.js",
            "index.html", ".github/workflows/site.yml",
            "scripts/staff_code_runner.py", "../.env", "/etc/passwd",
            "games/test/.git/config", "games/secrets.py",
        ):
            self.assertFalse(runner.is_safe_path(path), path)
        self.assertTrue(runner.is_safe_path("games/chess/game.js"))

    def test_exact_non_destructive_edit(self):
        with tempfile.TemporaryDirectory() as tmp:
            file = Path(tmp) / "games/chess/game.js"
            file.parent.mkdir(parents=True)
            file.write_text("const state = 'old';\n", encoding="utf-8")
            with mock.patch.object(runner, "ROOT", Path(tmp)):
                runner.apply_plan({"edits": [
                    {"path": "games/chess/game.js", "old": "'old'", "new": "'new'"}
                ]}, ["games/chess/game.js"])
            self.assertEqual(file.read_text(), "const state = 'new';\n")

    def test_ambiguous_change_refuses_and_preserves_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            file = Path(tmp) / "games/chess/game.js"
            file.parent.mkdir(parents=True)
            file.write_text("old old", encoding="utf-8")
            with mock.patch.object(runner, "ROOT", Path(tmp)):
                with self.assertRaisesRegex(RuntimeError, "uniquely match"):
                    runner.apply_plan({"edits": [
                        {"path": "games/chess/game.js", "old": "old", "new": "new"}
                    ]}, ["games/chess/game.js"])
            self.assertEqual(file.read_text(), "old old")
