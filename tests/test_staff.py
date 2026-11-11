import json
import unittest
from unittest import mock

import walid_staff


class StaffTests(unittest.TestCase):
    def setUp(self):
        self.temp = mock.patch.object(walid_staff, "_QUEUE_PATH", self._path())
        self.temp.start()
        self._path().unlink(missing_ok=True)
        self._audit_path().unlink(missing_ok=True)
        walid_staff._FIRESTORE = None
        walid_staff._FIRESTORE_FAILED = False

    def tearDown(self):
        self.temp.stop()

    @staticmethod
    def _path():
        import tempfile
        return __import__("pathlib").Path(tempfile.gettempdir()) / "walid-staff-test.json"

    def _audit_path(self):
        return self._path().with_name("walid_staff_audit.jsonl")

    def test_bilingual_routing_is_local_and_approval_gated(self):
        task = walid_staff.route_task("কোডে একটি bug ঠিক করো", language="bn")
        self.assertEqual(task["type"], "code_proposal")
        self.assertEqual(task["status"], "approval_required")
        self.assertTrue(task["approval_required"])

    def test_code_proposals_only_allow_feature_branches(self):
        with self.assertRaises(ValueError):
            walid_staff.propose_code_change("change", "main")
        proposal = walid_staff.propose_code_change("change", "codex/staff-feature")
        self.assertFalse(proposal["writes_performed"])
        self.assertFalse(proposal["merge_performed"])
        self.assertFalse(proposal["deploy_performed"])

    def test_mail_is_disabled_without_explicit_authorization(self):
        self.assertFalse(walid_staff.mail_check_status()["available"])

    def test_alerts_are_deduplicated_and_excluded_from_task_list(self):
        with mock.patch.object(walid_staff, "_http_check", return_value={"ok": False, "error": "offline"}):
            first = walid_staff.run_checks()
            walid_staff.run_checks()
        audit = [json.loads(line) for line in self._audit_path().read_text(encoding="utf-8").splitlines()]
        alerts = [item for item in audit if item.get("event") == "alert"]
        self.assertEqual(len(alerts), 2)
        self.assertEqual(walid_staff.list_tasks(), [])
        self.assertFalse(first[0]["result"]["ok"])

    def test_explicit_approval_records_safe_test_gate(self):
        proposal = walid_staff.propose_code_change("run tests", "codex/staff-feature")
        approval = walid_staff.approve_code_proposal(proposal["id"], "admin@example.test")
        self.assertEqual(approval["status"], "approved")
        self.assertFalse(approval["writes_performed"])
