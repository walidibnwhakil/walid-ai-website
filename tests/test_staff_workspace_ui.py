from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class StaffWorkspaceUiTests(unittest.TestCase):
    def test_unified_owner_portal_has_three_sections(self):
        page = (ROOT / "admin.html").read_text(encoding="utf-8")
        for value in ('id="dashboard"', 'id="staff-workspace"', 'id="riddlex-workspace"',
                      'data-admin-tab="dashboard"', 'data-admin-tab="staff"', 'data-admin-tab="riddlex"',
                      'id="ops-input"', 'id="riddlex-pending"', '/admin-ops.js', '/admin-approvals.js'):
            self.assertIn(value, page)
        self.assertIn('value="14"', page)
        self.assertIn('/walid-ai-approved-logo.png', page)
        self.assertIn('/walid-branding.css', page)

    def test_legacy_admin_urls_only_redirect_to_portal(self):
        staff = (ROOT / "admin-staff.html").read_text(encoding="utf-8")
        riddlex = (ROOT / "games/riddlex/approve.html").read_text(encoding="utf-8")
        self.assertIn('/admin.html#staff', staff)
        self.assertIn('/admin.html#riddlex', riddlex)
        self.assertNotIn('firebase.firestore()', riddlex)

    def test_staff_actions_use_protected_server_records(self):
        ops = (ROOT / "admin-ops.js").read_text(encoding="utf-8")
        approvals = (ROOT / "admin-approvals.js").read_text(encoding="utf-8")
        for route in ('/api/admin/staff', '/api/admin/staff/checks', '/api/admin/tasks'):
            self.assertIn(route, ops)
        self.assertIn('Authorization:', ops)
        self.assertIn("walid-admin-authenticated", ops)
        self.assertIn("riddlex_entries", approvals)
        self.assertIn("signInWithPopup", approvals)

if __name__ == "__main__":
    unittest.main()
