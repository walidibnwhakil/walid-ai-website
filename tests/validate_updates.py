import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
for kind in ("news","sports"):
 d=json.loads((root/"data"/(kind+".json")).read_text())
 assert d["kind"]==kind and isinstance(d["items"],list)
 for i in d["items"]: assert i["title"] and re.match(r"^https?://",i["url"]) and i["source"]
 for s in d["sources"]: assert re.match(r"^https?://",s["url"])
print("update caches valid")
