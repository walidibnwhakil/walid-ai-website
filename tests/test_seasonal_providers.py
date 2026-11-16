"""Provider adapter tests use simulated responses; no fixture is presented as live data."""
import importlib.util, json, os, unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

path = Path(__file__).resolve().parents[1] / "scripts" / "seasonal_providers.py"
spec = importlib.util.spec_from_file_location("seasonal_providers", path)
providers = importlib.util.module_from_spec(spec); spec.loader.exec_module(providers)

class ProviderTests(unittest.TestCase):
    def test_unconfigured_providers_are_dormant(self):
        with patch.dict(os.environ, {}, clear=True):
            result = providers.load(now=datetime(2028, 7, 20, tzinfo=timezone.utc))
        self.assertFalse(result["olympics"]["sourceHealth"])
        self.assertEqual(result["olympics"]["matches"], [])

    def test_valid_configured_response_is_visible_only_in_window(self):
        payload = {"events": [{"id":"ol-1","homeTeam":"A","awayTeam":"B",
                               "startTime":"2028-07-20T10:00:00Z","status":"scheduled"}]}
        class Response:
            def __enter__(self): return self
            def __exit__(self, *_): return False
            def read(self): return json.dumps(payload).encode()
        with patch.dict(os.environ, {"OLYMPICS_EVENTS_URL":"https://official.example/events"}, clear=True),              patch.object(providers, "urlopen", return_value=Response()):
            active = providers.load(now=datetime(2028, 7, 20, tzinfo=timezone.utc))
            outside = providers.load(now=datetime(2028, 8, 1, tzinfo=timezone.utc))
        self.assertTrue(active["olympics"]["sourceHealth"])
        self.assertEqual(active["olympics"]["matches"][0]["source"], "https://official.example/events")
        self.assertFalse(outside["olympics"]["sourceHealth"])

    def test_individual_competition_with_medals_is_valid(self):
        payload = {"events": [{
            "id": "ath-100m-final",
            "eventName": "Women's 100m Final",
            "competition": "Athletics",
            "startTime": "2028-07-20T10:00:00Z",
            "status": "finished",
            "results": [{"rank": 1, "athlete": "A"}],
            "medals": {"gold": "A", "silver": "B", "bronze": "C"}
        }]}
        class Response:
            def __enter__(self): return self
            def __exit__(self, *_): return False
            def read(self): return json.dumps(payload).encode()
        with patch.dict(os.environ, {"OLYMPICS_EVENTS_URL": "https://official.example/results"}, clear=True), \
             patch.object(providers, "urlopen", return_value=Response()):
            result = providers.load(now=datetime(2028, 7, 20, tzinfo=timezone.utc))
        event = result["olympics"]["matches"][0]
        self.assertEqual(event["eventName"], "Women's 100m Final")
        self.assertEqual(event["medals"]["gold"], "A")

if __name__ == "__main__":
    unittest.main()
