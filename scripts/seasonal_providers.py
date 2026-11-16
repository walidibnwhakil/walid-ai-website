"""Configurable official seasonal sports provider adapters.

The adapters are intentionally disabled until an operator supplies a documented,
machine-readable official endpoint. They never scrape pages or invent fixtures.
"""
import json
import os
from datetime import datetime, timezone
from urllib.request import Request, urlopen

EVENTS = {
    "olympics": {
        "label": "Olympics",
        "officialStart": "2028-07-14T00:00:00Z",
        "officialEnd": "2028-07-30T23:59:59Z",
        "env": "OLYMPICS_EVENTS_URL",
        "officialSite": "https://olympics.com/en/olympic-games/los-angeles-2028",
    },
    "commonwealth": {
        "label": "Commonwealth Games",
        "officialStart": "2026-07-23T00:00:00Z",
        "officialEnd": "2026-08-02T23:59:59Z",
        "env": "COMMONWEALTH_EVENTS_URL",
        "officialSite": "https://www.commonwealthsport.com/",
    },
}

def _window_active(event, now=None):
    now = now or datetime.now(timezone.utc)
    start = datetime.fromisoformat(event["officialStart"].replace("Z", "+00:00"))
    end = datetime.fromisoformat(event["officialEnd"].replace("Z", "+00:00"))
    return start <= now <= end

def _read_configured(event):
    url = os.getenv(event["env"], "").strip()
    if not url:
        return [], False, "not_configured"
    try:
        request = Request(url, headers={"User-Agent": "WalidAI-MatchCache/1.0"})
        with urlopen(request, timeout=20) as response:
            payload = json.load(response)
        rows = payload.get("events") if isinstance(payload, dict) else payload
        if not isinstance(rows, list):
            return [], False, "invalid_schema"
        matches = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            required = ("id", "homeTeam", "awayTeam", "startTime", "status")
            if not all(row.get(key) for key in required):
                continue
            item = dict(row)
            item["source"] = url
            matches.append(item)
        return matches, bool(matches), None if matches else "empty"
    except Exception as exc:
        return [], False, "http_" + str(getattr(exc, "code", "error"))

def load(previous=None, now=None):
    previous = previous or {}
    result = {}
    for key, base in EVENTS.items():
        matches, healthy, error = _read_configured(base)
        active = _window_active(base, now)
        old = (previous.get(key) or {}).get("matches") or []
        # Visibility is decided here and repeated in the frontend: official window,
        # healthy configured data, and at least one normalized event are all required.
        visible = active and healthy and bool(matches)
        result[key] = {
            **base,
            "sourceHealth": visible,
            "coverage": "available" if visible else "dormant",
            "matches": matches if visible else [],
            "providerConfigured": bool(os.getenv(base["env"], "").strip()),
            "healthError": error,
            "note": "Verified official provider data." if visible else
                "Hidden until the official event window is active and a verified provider returns data.",
        }
        if not visible and old:
            result[key]["note"] += " Previous data is not reused outside the live window."
    return result
