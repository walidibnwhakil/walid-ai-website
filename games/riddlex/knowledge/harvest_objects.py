#!/usr/bin/env python3
"""Add everyday objects from Wikidata subclasses. Cached under /tmp/riddlex-objects."""

from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path("/tmp/riddlex-objects")
ENDPOINT = "https://qlever.dev/api/wikidata"
UA = "WalidAI-Riddlex/1.0 (https://walid-ai.com; educational guessing game)"
PREFIXES = """
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
"""

# Root class -> attribute keys that are clearly true for that class.
ROOTS = {
    "Q2095": ["food"],          # food
    "Q40050": ["food"],         # drink
    "Q746549": ["food"],        # dish
    "Q3314483": ["food"],       # fruit
    "Q11004": ["food"],         # vegetable
    "Q42527": ["food", "kitchen"],  # spice
    "Q42889": ["vehicle"],
    "Q39546": ["tool"],
    "Q34379": ["music_item"],
    "Q11460": ["clothing", "soft"],
    "Q14745": ["furniture"],
    "Q212920": ["electronic", "kitchen"],
}

NEGATIVES = {
    "food": ["vehicle", "clothing", "furniture", "tool", "music_item", "electronic", "sport_item"],
    "vehicle": ["food", "clothing", "furniture", "kitchen", "cooking", "music_item"],
    "tool": ["food", "clothing", "vehicle", "furniture", "music_item"],
    "music_item": ["food", "vehicle", "furniture", "clothing"],
    "clothing": ["food", "vehicle", "furniture", "tool", "electronic", "kitchen"],
    "furniture": ["food", "vehicle", "clothing", "pocket", "handheld", "tool"],
    "electronic": ["food", "clothing", "vehicle", "furniture"],
    "kitchen": ["vehicle", "clothing", "furniture"],
}


def qlever(query, timeout=180):
    data = urllib.parse.urlencode({"query": PREFIXES + query}).encode()
    last = None
    for attempt in range(4):
        req = urllib.request.Request(
            ENDPOINT, data=data,
            headers={"Accept": "text/tab-separated-values", "User-Agent": UA},
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                body = response.read()
            if body[:1] in (b"{", b"<") and b"exception" in body[:500].lower():
                raise RuntimeError(body[:300].decode("utf-8", "replace"))
            return body
        except Exception as error:  # noqa: BLE001
            last = error
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(last)


def unquote(token):
    token = token.strip()
    if token.startswith('"') and '"@' in token:
        return token[1:token.rfind('"@')]
    if len(token) >= 2 and token[0] == '"' and token[-1] == '"':
        return token[1:-1]
    if token.startswith("<") and token.endswith(">"):
        return token[1:-1]
    return token


def qid_of(value):
    match = re.search(r"Q\d+", unquote(value))
    return match.group(0) if match else ""


def parse_tsv(body):
    lines = body.decode("utf-8", "replace").splitlines()
    if not lines:
        return []
    header = lines[0].split("\t")
    rows = []
    for line in lines[1:]:
        if not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) < len(header):
            parts += [""] * (len(header) - len(parts))
        rows.append(dict(zip(header, parts)))
    return rows


def fetch_root(root):
    ROOT.mkdir(parents=True, exist_ok=True)
    path = ROOT / f"{root}.tsv"
    if path.exists() and path.stat().st_size > 80:
        print("cache", root, flush=True)
        return path.read_bytes()
    query = f"""
SELECT ?item ?links ?en (SAMPLE(?bnLab) AS ?bnOut) WHERE {{
  ?item wdt:P279+ wd:{root} .
  ?item wikibase:sitelinks ?links .
  FILTER(?links >= 4)
  ?item rdfs:label ?en . FILTER(LANG(?en)="en")
  OPTIONAL {{ ?item rdfs:label ?bnLab . FILTER(LANG(?bnLab)="bn") }}
}}
GROUP BY ?item ?links ?en
"""
    print("query", root, flush=True)
    body = qlever(query)
    path.write_bytes(body)
    print(" ", root, body.count(b"\n"), "lines", flush=True)
    return body


def main():
    found = {}
    for root, flags in ROOTS.items():
        try:
            rows = parse_tsv(fetch_root(root))
        except Exception as error:  # noqa: BLE001
            print("skip", root, error, flush=True)
            continue
        for row in rows:
            key = qid_of(row.get("?item", ""))
            label = unquote(row.get("?en", "")).strip()
            if not key or not label or len(label) < 2:
                continue
            lowered = label.lower()
            if any(bad in lowered for bad in ("list of", "disambiguation", "category:", "template:")):
                continue
            try:
                pop = int(float(unquote(row.get("?links", "0")) or 0))
            except ValueError:
                pop = 1
            current = found.get(key)
            if current and current["pop"] >= pop and label != current["en"]:
                current["flags"].update(flags)
                continue
            bn = unquote(row.get("?bnOut", "")).strip()
            record = found.setdefault(key, {
                "id": key, "en": label, "bn": bn, "pop": pop, "kind": "object",
                "adult": False, "flags": set(),
            })
            record["pop"] = max(record["pop"], pop)
            if bn and not record.get("bn"):
                record["bn"] = bn
            if "(" in record["en"] and "(" not in label:
                record["en"] = label
            record["flags"].update(flags)
        print("running", len(found), flush=True)
        time.sleep(1)
    out = []
    for record in found.values():
        yes = {"object", "named"}  # named will be set no below
        yes.discard("named")
        no = {"real", "fictional", "animal", "named", "adult_ent"}
        yes.update(record["flags"])
        for flag in list(yes):
            for negative in NEGATIVES.get(flag, []):
                if negative not in yes:
                    no.add(negative)
        record["yes"] = sorted(yes)
        record["no"] = sorted(no - yes)
        record.pop("flags", None)
        out.append(record)
    path = ROOT / "objects.jsonl"
    with path.open("w", encoding="utf-8") as handle:
        for record in out:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")
    print(json.dumps({"objects": len(out)}), flush=True)


if __name__ == "__main__":
    main()
