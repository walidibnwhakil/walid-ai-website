import json

import pytest


def load_module(tmp_path, monkeypatch):
    monkeypatch.setenv("WALID_STAFF_QUEUE_PATH", str(tmp_path / "tasks.json"))
    import importlib
    import walid_staff
    return importlib.reload(walid_staff)


def test_code_proposal_is_approval_gated_and_branch_limited(tmp_path, monkeypatch):
    staff = load_module(tmp_path, monkeypatch)
    task = staff.enqueue("code_proposal", {"branch": "codex/safe-change", "files": ["app.py"]})
    assert task["approval_required"] is True
    assert staff.list_tasks()[0]["payload"]["branch"] == "codex/safe-change"
    assert "task_queued" in (tmp_path / "walid_staff_audit.jsonl").read_text(encoding="utf-8")

    with pytest.raises(PermissionError):
        staff.enqueue("code_proposal", {"branch": "main"})
    with pytest.raises(PermissionError):
        staff.enqueue("code_proposal", {"branch": "feature/test", "deploy": True})


def test_sensitive_mail_task_stays_disabled(tmp_path, monkeypatch):
    staff = load_module(tmp_path, monkeypatch)
    with pytest.raises(PermissionError):
        staff.enqueue("mail_check")
