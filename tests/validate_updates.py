import json,re
from datetime import datetime
from pathlib import Path
root=Path(__file__).resolve().parents[1]
for kind in ("news","sports"):
    d=json.loads((root/"data"/(kind+".json")).read_text())
    assert d["kind"]==kind and isinstance(d["items"],list)
    for i in d["items"]:
        assert i["title"] and re.match(r"^https?://",i["url"]) and i["source"]
    for s in d["sources"]: assert re.match(r"^https?://",s["url"])
    if kind=="sports":
        assert isinstance(d.get("sports"),dict)
        for sport,entry in d["sports"].items():
            assert entry["coverage"] in {"available","stale","unavailable"}
            assert isinstance(entry.get("matches"),list)
            for match in entry["matches"]:
                assert match["homeTeam"] and match["awayTeam"] and match["status"] in {"scheduled","finished"}
                datetime.fromisoformat(match["startTime"].replace("Z","+00:00"))
                if match["status"]=="finished" and match["homeScore"] is not None and match["awayScore"] is not None:
                    assert match["winner"] in {match["homeTeam"],match["awayTeam"],"Draw"}
print("update caches valid")
