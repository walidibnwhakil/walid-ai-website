import json
import importlib.util
from pathlib import Path
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("ufcalendar_mma", Path(__file__).parents[1] / "scripts" / "ufcalendar_mma.py")
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


def test_missing_key_is_disabled_and_empty():
    with patch.dict("os.environ", {}, clear=True):
        feed = module.fetch_mma_feed()
    assert feed["coverage"] == "disabled"
    assert feed["sourceHealth"] is False
    assert feed["matches"] == []
    assert "UFCALENDAR_API_KEY" in feed["note"]


def test_normalization_deduplicates_and_preserves_provenance():
    payload = {"data": [
        {"id": "ufc-1", "title": "UFC 1", "promotion": "UFC", "starts_at": "2026-12-01T12:00:00Z"},
        {"id": "ufc-1", "title": "UFC 1 duplicate", "promotion": "UFC", "starts_at": "2026-12-01T12:00:00Z"},
    ]}
    with patch.dict("os.environ", {"UFCALENDAR_API_KEY": "test-key"}), patch.object(module, "_request_json", return_value=payload):
        with patch.object(module, "CACHE_PATH", Path("test-ufcalendar-cache.json")):
            feed = module.fetch_mma_feed(now=0)
    assert len(feed["matches"]) == 1
    assert feed["matches"][0]["source"] == "UFCalendar"
    assert feed["matches"][0]["providerEventId"] == "ufc-1"
    Path("test-ufcalendar-cache.json").unlink(missing_ok=True)
