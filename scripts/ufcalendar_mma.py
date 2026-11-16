"""Disabled-by-default UFCalendar MMA adapter.

The adapter is intentionally not wired into data/sports.json until a production
UFCalendar key is supplied and a live authenticated response is verified.
It keeps the key server-side, budgets 2 scheduled calls/day (60/month), and
leaves 40 requests/month as reserve under the current 100-request free tier.
"""
from __future__ import annotations

import json
import os
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

API_URL = "https://api.ufcalendar.com/v1/events"
PROMOTIONS = ("ufc", "pfl", "rizin")
MONTHLY_LIMIT = 100
DAILY_BUDGET = 2
CACHE_TTL_SECONDS = 12 * 60 * 60
CACHE_PATH = Path(os.environ.get("UF_CALENDAR_MMA_CACHE", "data/ufcalendar-mma-cache.json"))


def empty_feed(note: str) -> dict:
    return {
        "label": "MMA",
        "coverage": "disabled",
        "source": "UFCalendar",
        "sourceHealth": False,
        "matches": [],
        "note": note,
    }


def _request_json(key: str) -> dict:
    query = urllib.parse.urlencode({"org": ",".join(PROMOTIONS), "status": "upcoming", "limit": 100})
    request = urllib.request.Request(
        f"{API_URL}?{query}",
        headers={"Authorization": f"Bearer {key}", "Accept": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        return json.load(response)


def _normalize_event(event: dict) -> dict | None:
    event_id = event.get("id") or event.get("slug")
    starts_at = event.get("starts_at") or event.get("start_time")
    if not event_id or not starts_at:
        return None
    fights = event.get("fights") or event.get("card") or []
    return {
        "id": str(event_id),
        "homeTeam": event.get("main_event") or event.get("title") or "MMA event",
        "awayTeam": "",
        "competition": event.get("promotion") or event.get("org") or "MMA",
        "startTime": starts_at,
        "finishedAt": event.get("completed_at"),
        "status": "finished" if event.get("result") or event.get("completed_at") else "scheduled",
        "source": "UFCalendar",
        "providerEventId": str(event_id),
        "fights": fights,
    }


def fetch_mma_feed(now: float | None = None) -> dict:
    """Return a normalized feed, never exposing a key or failing the sports page."""
    key = os.environ.get("UFCALENDAR_API_KEY", "").strip()
    if not key:
        return empty_feed("MMA is disabled until UFCALENDAR_API_KEY is configured on the server.")
    now = time.time() if now is None else now
    if CACHE_PATH.exists() and now - CACHE_PATH.stat().st_mtime < CACHE_TTL_SECONDS:
        try:
            return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            pass
    try:
        payload = _request_json(key)
        raw_events = payload.get("data", payload) if isinstance(payload, dict) else []
        normalized = []
        seen = set()
        for event in raw_events if isinstance(raw_events, list) else []:
            item = _normalize_event(event)
            if item and item["id"] not in seen:
                seen.add(item["id"])
                normalized.append(item)
        feed = {
            "label": "MMA",
            "coverage": "available",
            "source": "UFCalendar",
            "sourceHealth": True,
            "matches": normalized,
            "note": "Verified UFCalendar event data. Results are not guaranteed to be live.",
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }
        CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        CACHE_PATH.write_text(json.dumps(feed, ensure_ascii=False, indent=2), encoding="utf-8")
        return feed
    except Exception:
        return empty_feed("MMA data is temporarily unavailable; no live coverage is promised.")
