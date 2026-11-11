"""Safe, admin-only Walid AI staff orchestration primitives.

The module is deliberately provider-free by default. It routes tasks locally, persists a
bounded queue/audit log, runs read-only checks, and never writes source code, merges, deploys,
or reads mail unless explicit credentials and authorization are configured.
"""
from __future__ import annotations

import json
import os
import ssl
import subprocess
import time
import hashlib
import shutil
import tempfile
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from urllib.parse import urlparse

STAFF_NAMES = {
    "manager": {"name": "Manager", "alias": "Master Bot", "role": "orchestrator"},
    "monitor": {"name": "IT Technician", "alias": "Monitor Bot", "role": "website_monitor"},
    "mail": {"name": "Admin", "alias": "Mail Bot", "role": "mail_monitor"},
    "security": {"name": "Cyber Security Engineer", "alias": "Security Bot", "role": "security"},
    "code": {"name": "CSE Engineer", "alias": "Walid Code", "role": "coding"},
}
ROUTE_TYPES = {"monitor", "security_check", "mail_check", "code_proposal", "manager_review"}
_QUEUE_PATH = Path(os.environ.get("WALID_STAFF_QUEUE_PATH", "data/walid_staff_tasks.json"))
_MAX_TASKS = max(10, int(os.environ.get("WALID_STAFF_MAX_TASKS", "200")))
_LOCK = Lock()
_FIRESTORE = None
_FIRESTORE_FAILED = False


def _now():
    return datetime.now(timezone.utc).isoformat()


def _load():
    try:
        value = json.loads(_QUEUE_PATH.read_text(encoding="utf-8"))
        return value if isinstance(value, list) else []
    except (OSError, ValueError, json.JSONDecodeError):
        return []


def _save(items):
    _QUEUE_PATH.parent.mkdir(parents=True, exist_ok=True)
    temp = _QUEUE_PATH.with_suffix(".tmp")
    temp.write_text(json.dumps(items[-_MAX_TASKS:], ensure_ascii=False, indent=2), encoding="utf-8")
    temp.replace(_QUEUE_PATH)


def _firestore_client():
    """Return an optional Firestore client; never make local staff state depend on it."""
    global _FIRESTORE, _FIRESTORE_FAILED
    if _FIRESTORE is not None or _FIRESTORE_FAILED or not firebase_configured():
        return _FIRESTORE
    try:
        from google.cloud import firestore
        _FIRESTORE = firestore.Client(project=os.environ.get("FIREBASE_PROJECT_ID") or None)
    except Exception:
        _FIRESTORE_FAILED = True
    return _FIRESTORE


def _persist_remote(item):
    client = _firestore_client()
    if client is None:
        return False
    try:
        collection = os.environ.get("WALID_STAFF_FIRESTORE_COLLECTION", "walidStaffAudit")
        client.collection(collection).document(str(item["id"])).set(item)
        return True
    except Exception:
        return False


def _record(event, **data):
    item = {"id": f"staff-{int(time.time() * 1000)}", "event": event, "at": _now(), **data}
    with _LOCK:
        items = _load()
        items.append(item)
        _save(items)
    _persist_remote(item)
    return item


def firebase_configured():
    return bool(os.environ.get("FIREBASE_CREDENTIALS_JSON", "").strip() or
                os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON", "").strip() or
                os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "").strip())


def staff_status():
    mail_authorized = (os.environ.get("WALID_STAFF_MAIL_IMAP_URL", "").strip() and
                       os.environ.get("WALID_STAFF_MAIL_AUTHORIZED", "").strip().lower() == "true")
    return {
        "staff_api": {"configured": bool(os.environ.get("WALID_STAFF_API_KEY", "").strip()),
                      "mode": "separate", "free_first": True,
                      "daily_limit": int(os.environ.get("WALID_STAFF_DAILY_LIMIT", "0"))},
        "mail": {"available": bool(mail_authorized), "reason": "" if mail_authorized else
                 "No explicitly authorized IMAP configuration is present."},
        "coding": {"autonomous_writes": False, "auto_merge": False, "auto_deploy": False,
                   "approval_required": True, "feature_branch_only": True, "tests_required": True},
        "persistence": {"firebase_configured": firebase_configured(), "mode": "firebase" if _firestore_client() else "local_bounded",
                         "fallback": "local_bounded", "collection": os.environ.get("WALID_STAFF_FIRESTORE_COLLECTION", "walidStaffAudit")},
        "monitor_target": os.environ.get("WALID_MONITOR_URL", "https://walid-ai.com").strip(),
        "staff": [{"id": key, **value, "enabled": True} for key, value in STAFF_NAMES.items()],
    }


def list_tasks():
    with _LOCK:
        return list(reversed(_load()))


def route_task(text, language="auto", requested_by="admin"):
    """Free-first bilingual routing; returns a queued task and a human-readable route."""
    body = str(text or "").strip()
    lowered = body.lower()
    if any(word in lowered for word in ("mail", "email", "ইমেইল", "মেইল")):
        task_type = "mail_check"
    elif any(word in lowered for word in ("security", "header", "সিকিউরিটি", "নিরাপত্তা")):
        task_type = "security_check"
    elif any(word in lowered for word in ("code", "bug", "feature", "কোড", "বাগ")):
        task_type = "code_proposal"
    else:
        task_type = "monitor"
    if task_type == "mail_check" and not staff_status()["mail"]["available"]:
        state = "blocked_missing_authorization"
    elif task_type == "code_proposal":
        state = "approval_required"
    else:
        state = "queued"
    task = {"id": f"staff-{int(time.time() * 1000)}", "type": task_type, "status": state,
            "staff": "manager" if task_type == "manager_review" else {"monitor": "monitor", "security_check": "security", "mail_check": "mail", "code_proposal": "code"}.get(task_type, "manager"),
            "payload": {"text": body, "language": language}, "requested_by": requested_by,
            "created_at": _now(), "approval_required": task_type == "code_proposal"}
    with _LOCK:
        items = _load(); items.append(task); _save(items)
    return task


def enqueue(task_type, payload=None, requested_by="admin"):
    if task_type not in ROUTE_TYPES:
        raise ValueError("Unsupported staff task type.")
    return route_task((payload or {}).get("text", task_type), requested_by=requested_by) if task_type == "manager_review" else route_task(task_type, requested_by=requested_by)


def _http_check(url):
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return {"ok": False, "error": "Monitor URL must be an absolute HTTP(S) URL."}
    request = urllib.request.Request(url, headers={"User-Agent": "WalidAI-Staff-Monitor/1.0"})
    try:
        started = time.monotonic()
        with urllib.request.urlopen(request, timeout=10, context=ssl.create_default_context()) as response:
            return {"ok": 200 <= response.status < 400, "status": response.status, "latency_ms": round((time.monotonic() - started) * 1000)}
    except urllib.error.HTTPError as error:
        return {"ok": False, "status": error.code, "error": "HTTP error"}
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
        return {"ok": False, "error": type(error).__name__}


def _security_check(url):
    result = _http_check(url); headers = {}
    if result.get("ok"):
        try:
            request = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "WalidAI-Staff-Security/1.0"})
            with urllib.request.urlopen(request, timeout=10, context=ssl.create_default_context()) as response:
                headers = {str(k).lower(): str(v) for k, v in response.headers.items()}
        except Exception:
            pass
    required = ["content-security-policy", "x-content-type-options", "referrer-policy", "strict-transport-security"]
    result["missing_security_headers"] = [header for header in required if header not in headers]
    result["safe_check_only"] = True
    return result


def run_checks():
    target = staff_status()["monitor_target"]
    checks = [{"staff": "monitor", "type": "monitor", "at": _now(), "result": _http_check(target)},
              {"staff": "security", "type": "security_check", "at": _now(), "result": _security_check(target)}]
    cooldown = max(0, int(os.environ.get("WALID_ALERT_DEDUP_SECONDS", "3600")))
    now = time.time()
    for check in checks:
        if not check["result"].get("ok") or check["result"].get("missing_security_headers"):
            fingerprint = hashlib.sha256(json.dumps({"staff": check["staff"], "result": check["result"]}, sort_keys=True).encode()).hexdigest()[:24]
            recent = any(item.get("event") == "alert" and item.get("fingerprint") == fingerprint and
                         now - _parse_time(item.get("at")) < cooldown for item in _load())
            if not recent:
                _record("alert", staff=check["staff"], check=check, fingerprint=fingerprint)
    return checks


def _parse_time(value):
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except (AttributeError, ValueError, TypeError):
        return 0


def scheduled_checks():
    """Cron-safe entry point; only performs read-only checks and records alerts."""
    return run_checks()


def propose_code_change(description, base_branch=None):
    """Create an approval-gated proposal; does not write code or invoke git."""
    branch = str(base_branch or os.environ.get("WALID_STAFF_FEATURE_BRANCH", "codex/staff-feature")).strip()
    if not branch.startswith(("codex/", "feature/")):
        raise ValueError("CSE proposals must target a feature branch.")
    return _record("code_proposal", description=str(description or ""), branch=branch,
                   status="awaiting_explicit_approval", tests_required=True,
                   writes_performed=False, merge_performed=False, deploy_performed=False)


def run_approved_code_tests(proposal, repo_path=None):
    """Run an approved proposal's existing test command in an isolated temporary copy.

    This intentionally does not apply a patch, push a branch, merge, or deploy.
    """
    if not isinstance(proposal, dict) or proposal.get("status") != "approved":
        raise ValueError("An explicit approved proposal is required.")
    branch = str(proposal.get("branch", ""))
    if not branch.startswith(("codex/", "feature/")):
        raise ValueError("CSE tests must target a feature branch.")
    source = Path(repo_path or os.environ.get("WALID_CODE_REPO", Path.cwd())).resolve()
    if not (source / ".git").exists():
        raise ValueError("A git repository is required.")
    actual_branch = subprocess.run(["git", "branch", "--show-current"], cwd=source,
                                   capture_output=True, text=True, check=True).stdout.strip()
    if actual_branch != branch:
        raise ValueError("The checkout branch must exactly match the approved feature branch.")
    command = os.environ.get("WALID_CODE_TEST_COMMAND", "python -m unittest discover -s tests")
    with tempfile.TemporaryDirectory(prefix="walid-code-test-") as isolated:
        target = Path(isolated) / "repo"
        shutil.copytree(source, target, ignore=shutil.ignore_patterns(".git", "__pycache__", "*.pyc"))
        result = subprocess.run(command, cwd=target, shell=True, capture_output=True, text=True,
                                timeout=int(os.environ.get("WALID_CODE_TEST_TIMEOUT", "120")))
        return _record("code_test", proposal_id=proposal.get("id"), branch=branch,
                       command=command, passed=result.returncode == 0,
                       output=(result.stdout + result.stderr)[-8000:],
                       writes_performed=False, merge_performed=False, deploy_performed=False)


def approve_code_proposal(proposal_id, approved_by="admin"):
    """Record explicit approval for a stored proposal; it does not apply changes."""
    proposal = next((item for item in _load() if item.get("event") == "code_proposal" and
                     item.get("id") == proposal_id), None)
    if proposal is None:
        raise ValueError("Code proposal was not found.")
    if not str(approved_by).strip():
        raise ValueError("An approving admin identity is required.")
    return _record("code_approval", proposal_id=proposal_id, approved_by=str(approved_by),
                   status="approved", branch=proposal["branch"],
                   writes_performed=False, merge_performed=False, deploy_performed=False)


def get_code_approval(approval_id):
    return next((item for item in _load() if item.get("event") == "code_approval" and
                 item.get("id") == approval_id and item.get("status") == "approved"), None)


def mail_check_status():
    return staff_status()["mail"]
