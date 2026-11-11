"""Walid AI Staff Team: safe, admin-only orchestration primitives.

This module intentionally performs no AI calls, email reads, code writes, merges, or deploys
unless a future, explicitly authorized adapter is added. It provides bounded queues, audit
records, website checks, and security-header checks for the existing admin backend.
"""
from __future__ import annotations

import json
import os
import ssl
import time
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
ALLOWED_TASK_TYPES = {"monitor", "security_check", "mail_check", "code_proposal", "manager_review"}
SENSITIVE_TASK_TYPES = {"mail_check", "code_proposal"}
_QUEUE_LOCK = Lock()
_QUEUE_PATH = Path(os.environ.get("WALID_STAFF_QUEUE_PATH", "data/walid_staff_tasks.json"))
_MAX_TASKS = max(10, int(os.environ.get("WALID_STAFF_MAX_TASKS", "200")))
_MAX_CHECKS_PER_RUN = max(1, int(os.environ.get("WALID_STAFF_MAX_CHECKS_PER_RUN", "3")))


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


def staff_status():
    staff_api_configured = bool(os.environ.get("WALID_STAFF_API_KEY", "").strip())
    mail_authorized = bool(os.environ.get("WALID_STAFF_MAIL_IMAP_URL", "").strip() and
                           os.environ.get("WALID_STAFF_MAIL_AUTHORIZED", "").strip().lower() == "true")
    target = os.environ.get("WALID_MONITOR_URL", "https://walid-ai.com").strip()
    return {
        "staff_api": {"configured": staff_api_configured, "mode": "separate", "free_first": True,
                      "daily_limit": int(os.environ.get("WALID_STAFF_DAILY_LIMIT", "0"))},
        "mail": {"available": mail_authorized, "reason": "" if mail_authorized else
                 "No explicitly authorized IMAP configuration is present."},
        "coding": {"autonomous_writes": False, "auto_merge": False, "auto_deploy": False,
                   "approval_required": True},
        "monitor_target": target,
        "staff": [{"id": key, **value, "enabled": True} for key, value in STAFF_NAMES.items()],
    }


def list_tasks():
    with _QUEUE_LOCK:
        return list(reversed(_load()))


def enqueue(task_type, payload=None, requested_by="admin"):
    if task_type not in ALLOWED_TASK_TYPES:
        raise ValueError("Unsupported staff task type.")
    if task_type in SENSITIVE_TASK_TYPES:
        raise PermissionError("This task requires explicit credentials and authorization.")
    task = {
        "id": f"staff-{int(time.time() * 1000)}",
        "type": task_type,
        "status": "queued",
        "payload": payload if isinstance(payload, dict) else {},
        "requested_by": requested_by,
        "created_at": _now(),
        "approval_required": task_type == "code_proposal",
    }
    with _QUEUE_LOCK:
        items = _load()
        items.append(task)
        _save(items)
    return task


def _http_check(url):
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return {"ok": False, "error": "Monitor URL must be an absolute HTTP(S) URL."}
    request = urllib.request.Request(url, headers={"User-Agent": "WalidAI-Staff-Monitor/1.0"})
    try:
        started = time.monotonic()
        with urllib.request.urlopen(request, timeout=10, context=ssl.create_default_context()) as response:
            return {"ok": 200 <= response.status < 400, "status": response.status,
                    "latency_ms": round((time.monotonic() - started) * 1000)}
    except urllib.error.HTTPError as error:
        return {"ok": False, "status": error.code, "error": "HTTP error"}
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
        return {"ok": False, "error": type(error).__name__}


def _security_check(url):
    result = _http_check(url)
    headers = {}
    if result.get("ok"):
        request = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "WalidAI-Staff-Security/1.0"})
        try:
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
    results = [
        {"staff": "monitor", "type": "monitor", "at": _now(), "result": _http_check(target)},
        {"staff": "security", "type": "security_check", "at": _now(), "result": _security_check(target)},
    ]
    return results[:_MAX_CHECKS_PER_RUN]
