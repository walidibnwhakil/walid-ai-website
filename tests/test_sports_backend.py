import importlib.util
import json
import os
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "fetch_updates.py"
spec = importlib.util.spec_from_file_location("fetch_updates", SCRIPT)
fetch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fetch)


class Response:
    def __init__(self, payload):
        self.payload = json.dumps(payload).encode()

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        return self.payload


class SportsBackendTests(unittest.TestCase):
    def test_only_supported_sports_are_published(self):
        self.assertEqual(set(fetch.SPORTS), {"football"})

    def test_seasonal_sections_are_hidden_outside_window_without_verified_data(self):
        dormant = fetch.seasonal_payload({})
        now = fetch.datetime(2026, 11, 16, tzinfo=fetch.timezone.utc)
        self.assertFalse(fetch.seasonal_visible(dormant["olympics"], now))
        self.assertFalse(fetch.seasonal_visible(dormant["commonwealth"], now))

    def test_seasonal_section_requires_active_window_health_and_data(self):
        now = fetch.datetime(2028, 7, 20, tzinfo=fetch.timezone.utc)
        event = {**fetch.SEASONAL_EVENTS["olympics"], "sourceHealth": True,
                 "matches": [{"id": "verified-event"}]}
        self.assertTrue(fetch.seasonal_visible(event, now))
        self.assertFalse(fetch.seasonal_visible({**event, "sourceHealth": False}, now))
        self.assertFalse(fetch.seasonal_visible({**event, "matches": []}, now))
        self.assertFalse(fetch.seasonal_visible(event, fetch.datetime(2028, 8, 1, tzinfo=fetch.timezone.utc)))

    def test_event_feed_has_no_arbitrary_forty_match_cap_and_keeps_ids(self):
        events = [{
            "idEvent": str(i), "strHomeTeam": "Home " + str(i), "strAwayTeam": "Away",
            "dateEvent": "2026-11-15", "strTimestamp": "2026-11-15T12:00:00Z",
            "strLeague": "League", "intHomeScore": None, "intAwayScore": None
        } for i in range(60)]
        with patch.object(fetch, "urlopen", return_value=Response({"events": events})):
            parsed = fetch.read_events("https://example.test/feed", "scheduled")
        self.assertEqual(len(parsed), 60)
        self.assertEqual(parsed[-1]["id"], "59")

    def test_cricket_innings_runs_wickets_overs_and_final_status(self):
        payload = {"status": "success", "data": [{
            "id": "match-1", "name": "Test series", "matchType": "test",
            "teams": ["Bangladesh", "India"], "dateTimeGMT": "2026-11-15T03:00:00Z",
            "matchStarted": True, "matchEnded": True,
            "status": "Bangladesh won by 3 wickets",
            "score": [
                {"inning": "India 1st Innings", "r": 300, "w": 10, "o": 88.2},
                {"inning": "Bangladesh 1st Innings", "r": 301, "w": 7, "o": 92.1},
                {"inning": "India 2nd Innings", "r": 100, "w": 4, "o": 32}
            ]
        }]}
        with patch.dict(os.environ, {"CRICKETDATA_API_KEY": "test-secret"}), patch.object(fetch, "urlopen", return_value=Response(payload)):
            matches, error = fetch.read_cricketdata()
        self.assertIsNone(error)
        self.assertEqual(matches[0]["status"], "finished")
        self.assertEqual(matches[0]["id"], "match-1")
        self.assertEqual(matches[0]["source"], "CricketData")
        self.assertEqual(matches[0]["innings"][2], {
            "team": "India 2nd Innings", "runs": 100, "wickets": 4, "overs": 32
        })
        self.assertEqual(matches[0]["winner"], "Bangladesh")

    def test_cricket_empty_response_is_distinguished_from_missing_key(self):
        with patch.dict(os.environ, {"CRICKETDATA_API_KEY": "test-secret"}), patch.object(fetch, "urlopen", return_value=Response({"status": "success", "data": []})):
            rows, reason = fetch.read_cricketdata()
        self.assertEqual(rows, [])
        self.assertEqual(reason, "empty")

    def test_deduplicates_by_source_id_and_legacy_identity(self):
        rows = [
            {"id": "x", "source": "feed", "homeTeam": "A", "awayTeam": "B", "startTime": "t"},
            {"id": "x", "source": "feed", "homeTeam": "A", "awayTeam": "B", "startTime": "t", "homeScore": 1},
            {"homeTeam": "C", "awayTeam": "D", "startTime": "u"},
            {"homeTeam": "C", "awayTeam": "D", "startTime": "u"}
        ]
        result = fetch.dedupe_events(rows)
        self.assertEqual(len(result), 2)
        self.assertEqual(next(x for x in result if x.get("id") == "x")["homeScore"], 1)

    def test_deduplicates_id_and_idless_copy_of_same_event(self):
        rows = [
            {"id": "source-id", "source": "feed", "homeTeam": "A", "awayTeam": "B", "startTime": "2026-11-20T12:00:00Z"},
            {"source": "feed", "homeTeam": "A", "awayTeam": "B", "startTime": "2026-11-20T12:00:00Z", "homeScore": 2, "awayScore": 1}
        ]
        result = fetch.dedupe_events(rows)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["homeScore"], 2)

    def test_failed_cricket_refresh_preserves_last_known_good_data(self):
        recent_start = fetch.datetime.now(fetch.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        previous = {"sports": {"cricket": {
            "label": "Cricket", "coverage": "available",
            "matches": [{"id": "known", "homeTeam": "A", "awayTeam": "B", "status": "finished", "startTime": recent_start}]
        }}}
        with patch.object(fetch, "read_events", return_value=[]), \
             patch.object(fetch, "read_global_soccer_recent", return_value=[]), \
             patch.object(fetch, "read_openliga", return_value=[]), \
             patch.object(fetch, "read_cricketdata", return_value=([], "http_403")):
            result = fetch.scores(previous)
        self.assertEqual(result["cricket"]["coverage"], "stale")
        self.assertEqual(result["cricket"]["matches"][0]["id"], "known")

    def test_recent_cache_expires_results_at_seventy_two_hours(self):
        now = fetch.datetime(2026, 11, 15, 12, 0, tzinfo=fetch.timezone.utc)
        rows = [
            {"id": "old", "homeTeam": "A", "awayTeam": "B", "status": "finished",
             "startTime": "2026-11-12T11:59:59Z"},
            {"id": "fresh", "homeTeam": "C", "awayTeam": "D", "status": "finished",
             "startTime": "2026-11-12T12:00:00Z"}
        ]
        kept = fetch.recent_cache_matches([], rows, now)
        self.assertEqual([x["id"] for x in kept], ["fresh"])

    def test_cached_live_is_not_kept_as_live_after_refresh(self):
        now = fetch.datetime(2026, 11, 15, 12, 0, tzinfo=fetch.timezone.utc)
        rows = [{"id": "live", "homeTeam": "A", "awayTeam": "B", "status": "live",
                 "startTime": "2026-11-15T11:00:00Z"}]
        kept = fetch.recent_cache_matches([], rows, now)
        self.assertEqual(kept[0]["status"], "stale")

    def test_expired_schedule_is_removed_and_future_schedule_is_kept(self):
        now = fetch.datetime(2026, 11, 15, 12, 0, tzinfo=fetch.timezone.utc)
        rows = [
            {"id": "past", "homeTeam": "A", "awayTeam": "B", "status": "scheduled",
             "startTime": "2026-11-15T11:00:00Z"},
            {"id": "future", "homeTeam": "C", "awayTeam": "D", "status": "scheduled",
             "startTime": "2026-11-15T13:00:00Z"}
        ]
        kept = fetch.recent_cache_matches([], rows, now)
        self.assertEqual([x["id"] for x in kept], ["future"])

    def test_key_is_never_written_to_normalized_match_data(self):
        payload = {"status": "success", "data": [{
            "id": "id", "teams": ["A", "B"], "dateTimeGMT": "2026-11-15T03:00:00Z",
            "score": [], "matchStarted": False, "matchEnded": False
        }]}
        with patch.dict(os.environ, {"CRICKETDATA_API_KEY": "private-value"}), patch.object(fetch, "urlopen", return_value=Response(payload)):
            rows, _ = fetch.read_cricketdata()
        self.assertNotIn("private-value", json.dumps(rows))


if __name__ == "__main__":
    unittest.main()
