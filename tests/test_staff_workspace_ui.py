from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class StaffWorkspaceUiTests(unittest.TestCase):
    def test_staff_workspace_is_separate_and_role_based(self):
        page = (ROOT / "admin-staff.html").read_text(encoding="utf-8")
        for role in ("Manager", "IT Technician", "Cyber Security Engineer", "CSE Engineer", "Admin Staff"):
            self.assertIn(role, page)
        self.assertIn("/api/admin/staff", page)
        self.assertIn("/api/admin/staff/checks", page)
        self.assertIn("Check your admin access key.", page)

    def test_analytics_no_longer_embeds_staff_card(self):
        page = (ROOT / "admin.html").read_text(encoding="utf-8")
        self.assertIn("/admin-staff.html", page)
        self.assertNotIn("Loading staff status", page)
        self.assertNotIn("Walid AI Staff Team</h2>", page)

if __name__ == "__main__":
    unittest.main()
