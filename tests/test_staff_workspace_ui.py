from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class StaffWorkspaceUiTests(unittest.TestCase):
    def test_unified_owner_portal_has_three_sections(self):
        page = (ROOT / "admin/index.html").read_text(encoding="utf-8")
        for value in ('id="dashboard"', 'id="staff-workspace"', 'id="riddlex-workspace"',
                      'data-admin-tab="dashboard"', 'data-admin-tab="staff"', 'data-admin-tab="riddlex"',
                      'id="ops-input"', 'id="riddlex-pending"', '/admin-ops.js', '/admin-approvals.js'):
            self.assertIn(value, page)
        self.assertIn('value="14"', page)
        self.assertIn('/walid-ai-approved-logo.png', page)
        self.assertIn('https://walid-ai.com/admin/', page)
        self.assertFalse((ROOT / 'admin.html').exists())
        self.assertIn('/walid-branding.css', page)

    def test_admin_is_login_only_until_authenticated(self):
        page = (ROOT / "admin/index.html").read_text(encoding="utf-8")
        usage = (ROOT / "admin-usage.js").read_text(encoding="utf-8")
        ops = (ROOT / "admin-ops.js").read_text(encoding="utf-8")
        shell = (ROOT / "admin-shell.css").read_text(encoding="utf-8")
        self.assertIn('<body class="admin-locked">', page)
        self.assertIn('id="auth-screen"', page)
        self.assertIn('id="workspace-shell" class="admin-shell hidden"', page)
        self.assertLess(page.index('id="auth-screen"'), page.index('id="workspace-shell"'))
        self.assertIn('class="login-logo" src="/walid-ai-approved-logo.png"', page)
        self.assertIn('id="sidebar-toggle"', page)
        self.assertIn('aria-expanded="false"', page)
        self.assertIn('id="sidebar-details"', page)
        self.assertIn("/admin-shell.css", page)
        self.assertIn("$('#auth-screen').classList.add('hidden')", usage)
        self.assertIn("$('#workspace-shell').classList.remove('hidden')", usage)
        self.assertIn("$('#workspace-shell').classList.add('hidden')", usage)
        self.assertIn("setSidebarOpen(false)", ops)
        self.assertIn("setSidebarOpen(!$('#workspace-shell').classList.contains('nav-expanded'))", ops)
        self.assertIn(".auth-screen{", shell)
        self.assertIn(".sidebar-details{display:none}", shell)
        self.assertIn("--adm-accent:#4de4ff", shell)

    def test_original_office_is_restored_exactly_as_a_separate_visual_component(self):
        staff = (ROOT / "admin-staff.html").read_text(encoding="utf-8")
        portal = (ROOT / "admin/index.html").read_text(encoding="utf-8")
        ops = (ROOT / "admin-ops.js").read_text(encoding="utf-8")
        self.assertIn('Five desks. One protected network.', staff)
        self.assertIn('function robot(color)', staff)
        self.assertIn('grid-template-rows:repeat(3,minmax(244px,auto))', staff)
        for selector in ('manager', 'it', 'cyber', 'cse', 'admin'):
            self.assertIn(selector, staff)
        self.assertIn('id="desks"', staff)
        self.assertIn('id="selectedName"', staff)
        self.assertIn('id="history"', staff)
        self.assertIn('id="preserved-staff-office"', portal)
        self.assertIn('data-src="/admin-staff.html"', portal)
        self.assertIn("originalOffice.contentDocument", ops)
        self.assertIn('<a href="/admin/">Analytics</a>', staff)
        self.assertNotIn('/admin.html', staff)

    def test_riddlex_approval_redirect_remains_unchanged(self):
        riddlex = (ROOT / "games/riddlex/approve.html").read_text(encoding="utf-8")
        self.assertIn('https://walid-ai.com/admin/', riddlex)
        self.assertNotIn('/admin.html', riddlex)
        self.assertNotIn('firebase.firestore()', riddlex)

    def test_staff_actions_use_protected_server_records(self):
        ops = (ROOT / "admin-ops.js").read_text(encoding="utf-8")
        approvals = (ROOT / "admin-approvals.js").read_text(encoding="utf-8")
        for route in ('/api/admin/staff', '/api/admin/staff/checks', '/api/admin/tasks'):
            self.assertIn(route, ops)
        self.assertIn('Authorization:', ops)
        self.assertIn("walid-admin-authenticated", ops)
        self.assertNotIn("location.hash.slice(1)", ops)
        self.assertIn("riddlex_entries", approvals)
        self.assertIn("signInWithPopup", approvals)

if __name__ == "__main__":
    unittest.main()
