"""Cloud scheduler for Walid AI Staff Office's read-only checks.

GitHub Actions executes this independently of the owner's browser every six
hours and shortly after the new day begins in Bangladesh. A genuine persistent
endpoint failure makes the action red, so Manager can report it later.
"""
import json
import time
from walid_staff import scheduled_checks, _http_check

BACKEND_HEALTH = "https://walid-ai-backend.onrender.com/health"


def run():
    checks = scheduled_checks()
    targets = [{"staff": item.get("staff"), "result": item.get("result", {})}
               for item in checks if isinstance(item, dict)]
    backend = _http_check(BACKEND_HEALTH)
    # Render Free may cold-start. Retry once instead of alarming on one timeout.
    if not backend.get("ok"):
        time.sleep(12)
        backend = _http_check(BACKEND_HEALTH)
    targets.append({"staff": "IT Technician / backend", "result": backend})
    result = {
        "checked": len(targets),
        "healthy": all(bool(item["result"].get("ok")) for item in targets),
        "checks": targets,
    }
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result["healthy"] else 1


if __name__ == "__main__":
    raise SystemExit(run())
