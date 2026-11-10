#!/usr/bin/env python3
"""Broader Wikidata harvest: low-sitelink people, bn/hi Wikipedia, YouTubers, politicians, deities.

Writes /tmp/riddlex-broad/extra.jsonl. Does not apply a high sitelink cutoff.
"""

from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path("/tmp/riddlex-broad")
ENDPOINT = "https://qlever.dev/api/wikidata"
UA = "WalidAI-Riddlex/1.0 (https://walid-ai.com; educational guessing game)"
PREFIXES = """
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX schema: <http://schema.org/>
"""

COUNTRIES = {
    "Q902": "from_bd", "Q668": "from_in", "Q843": "from_pk", "Q30": "from_us",
    "Q145": "from_gb", "Q17": "from_jp", "Q884": "from_kr", "Q148": "from_cn",
    "Q142": "from_fr", "Q183": "from_de", "Q159": "from_ru", "Q155": "from_br",
    "Q16": "from_ca", "Q408": "from_au", "Q29": "from_es", "Q38": "from_it",
    "Q96": "from_mx", "Q1033": "from_ng", "Q79": "from_eg", "Q43": "from_tr",
    "Q252": "from_id", "Q851": "from_sa", "Q414": "from_ar", "Q258": "from_za",
}
MALE, FEMALE = "Q6581097", "Q6581072"
YOUTUBE = "Q17125263"
POLITICIAN = "Q82955"


def qlever(query, timeout=240):
    data = urllib.parse.urlencode({"query": PREFIXES + query}).encode()
    last = None
    for attempt in range(5):
        req = urllib.request.Request(ENDPOINT, data=data, headers={"Accept": "text/tab-separated-values", "User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                body = response.read()
            if body[:1] in (b"{", b"<") and b"exception" in body[:400].lower():
                raise RuntimeError(body[:240].decode("utf-8", "replace"))
            return body
        except Exception as error:  # noqa: BLE001
            last = error
            print(" retry", attempt, type(error).__name__, str(error)[:120], flush=True)
            time.sleep(3 * (attempt + 1))
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


def year_of(value):
    match = re.match(r"(-?\d+)-", unquote(value).strip())
    if not match:
        return None
    year = int(match.group(1))
    return year if -4000 < year <= 2026 else None


def decade(year):
    if year is None:
        return None
    if year < 1900:
        return "born_pre1900"
    if year <= 1949:
        return "born_1900_1949"
    if year <= 1969:
        return "born_1950_1969"
    if year <= 1979:
        return "born_1970_1979"
    if year <= 1989:
        return "born_1980_1989"
    if year <= 1999:
        return "born_1990_1999"
    return "born_2000_plus"


DECADES = [
    "born_pre1900", "born_1900_1949", "born_1950_1969", "born_1970_1979",
    "born_1980_1989", "born_1990_1999", "born_2000_plus",
]


def cached(name, query):
    ROOT.mkdir(parents=True, exist_ok=True)
    path = ROOT / f"{name}.tsv"
    if path.exists() and path.stat().st_size > 100:
        print("cache", name, flush=True)
        return path.read_bytes()
    print("query", name, flush=True)
    body = qlever(query)
    path.write_bytes(body)
    print(" ", name, body.count(b"\n"), "lines", path.stat().st_size, flush=True)
    return body


def parse(body):
    lines = body.decode("utf-8", "replace").splitlines()
    if not lines:
        return
    header = lines[0].split("\t")
    for line in lines[1:]:
        if not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) < len(header):
            parts += [""] * (len(header) - len(parts))
        yield dict(zip(header, parts))


def human_query(extra):
    return f"""
SELECT ?item ?links ?en (SAMPLE(?bnLab) AS ?bnOut) (SAMPLE(?gender) AS ?genderOut)
 (MIN(?birth) AS ?birthOut) (SAMPLE(?death) AS ?deathOut)
 (GROUP_CONCAT(DISTINCT STR(?country); SEPARATOR="|") AS ?countries)
 (GROUP_CONCAT(DISTINCT STR(?occ); SEPARATOR="|") AS ?occs)
WHERE {{
  ?item wdt:P31 wd:Q5 .
  ?item wikibase:sitelinks ?links .
  {extra}
  ?item rdfs:label ?en . FILTER(LANG(?en)="en")
  OPTIONAL {{ ?item rdfs:label ?bnLab . FILTER(LANG(?bnLab)="bn") }}
  OPTIONAL {{ ?item wdt:P21 ?gender }}
  OPTIONAL {{ ?item wdt:P569 ?birth }}
  OPTIONAL {{ ?item wdt:P570 ?death }}
  OPTIONAL {{ ?item wdt:P27 ?country }}
  OPTIONAL {{ ?item wdt:P106 ?occ }}
}}
GROUP BY ?item ?links ?en
"""


def wiki_query(host):
    return f"""
SELECT ?item ?links ?en (SAMPLE(?bnLab) AS ?bnOut) (SAMPLE(?gender) AS ?genderOut)
 (MIN(?birth) AS ?birthOut) (SAMPLE(?death) AS ?deathOut)
 (GROUP_CONCAT(DISTINCT STR(?country); SEPARATOR="|") AS ?countries)
 (GROUP_CONCAT(DISTINCT STR(?occ); SEPARATOR="|") AS ?occs)
WHERE {{
  ?article schema:about ?item ; schema:isPartOf <https://{host}/> .
  ?item wdt:P31 wd:Q5 .
  OPTIONAL {{ ?item wikibase:sitelinks ?links }}
  ?item rdfs:label ?en . FILTER(LANG(?en)="en")
  OPTIONAL {{ ?item rdfs:label ?bnLab . FILTER(LANG(?bnLab)="bn") }}
  OPTIONAL {{ ?item wdt:P21 ?gender }}
  OPTIONAL {{ ?item wdt:P569 ?birth }}
  OPTIONAL {{ ?item wdt:P570 ?death }}
  OPTIONAL {{ ?item wdt:P27 ?country }}
  OPTIONAL {{ ?item wdt:P106 ?occ }}
}}
GROUP BY ?item ?links ?en
"""


def to_record(row, extra_yes=()):
    key = qid_of(row.get("?item", ""))
    label = unquote(row.get("?en", "")).strip()
    if not key or len(label) < 2 or "disambiguation" in label.lower():
        return None
    try:
        pop = int(float(unquote(row.get("?links", "1")) or 1))
    except ValueError:
        pop = 1
    yes = {"real", "named"}
    no = {"fictional", "animal", "object", "adult_ent"}
    gender = qid_of(row.get("?genderOut", ""))
    if gender == MALE:
        yes.add("male"); no.add("female")
    elif gender == FEMALE:
        yes.add("female"); no.add("male")
    year = year_of(row.get("?birthOut", ""))
    bucket = decade(year)
    if bucket:
        yes.add(bucket)
        no.update(item for item in DECADES if item != bucket)
    dead = bool(unquote(row.get("?deathOut", "")).strip())
    if dead:
        yes.add("dead"); no.add("alive")
    elif year and year >= 1926:
        yes.add("alive"); no.add("dead")
    countries = {COUNTRIES[qid] for qid in re.findall(r"Q\d+", unquote(row.get("?countries", ""))) if qid in COUNTRIES}
    if re.search(r"Q\d+", unquote(row.get("?countries", ""))):
        yes |= countries
        no.update(item for item in COUNTRIES.values() if item not in countries)
    occs = set(re.findall(r"Q\d+", unquote(row.get("?occs", ""))))
    if YOUTUBE in occs or "youtube" in extra_yes:
        yes.add("youtube")
    if POLITICIAN in occs or "politician" in extra_yes:
        yes.add("politician")
    yes.update(extra_yes)
    return {
        "id": key, "en": label, "bn": unquote(row.get("?bnOut", "")).strip(),
        "pop": max(1, pop), "kind": "real", "adult": False,
        "yes": sorted(yes), "no": sorted(no - yes),
    }


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    jobs = [("yt", human_query("?item wdt:P106 wd:Q17125263 ."), ("youtube",))]
    jobs.append(("bd-pol", human_query("?item wdt:P106 wd:Q82955 . ?item wdt:P27 wd:Q902 ."), ("politician", "from_bd")))
    jobs.append(("in-pol", human_query("?item wdt:P106 wd:Q82955 . ?item wdt:P27 wd:Q668 ."), ("politician", "from_in")))
    jobs.append(("bn-humans", wiki_query("bn.wikipedia.org"), ()))
    jobs.append(("hi-humans", wiki_query("hi.wikipedia.org"), ()))
    for low, high in ((1, 2), (2, 3), (3, 4), (4, 5), (5, 7), (7, 10)):
        jobs.append((f"h{low}-{high}", human_query(f"FILTER(?links >= {low} && ?links < {high})"), ()))
    out_path = ROOT / "extra.jsonl"
    seen = set()
    if out_path.exists():
        out_path.unlink()
    count = 0
    with out_path.open("w", encoding="utf-8") as handle:
        for name, query, extra in jobs:
            try:
                body = cached(name, query)
            except Exception as error:  # noqa: BLE001
                print("failed", name, error, flush=True)
                continue
            added = 0
            for row in parse(body):
                record = to_record(row, extra)
                if not record or record["id"] in seen:
                    continue
                seen.add(record["id"])
                handle.write(json.dumps(record, ensure_ascii=False) + "\n")
                added += 1
            count += added
            print("kept", name, added, "total", count, flush=True)
    print(json.dumps({"extra": count}), flush=True)


if __name__ == "__main__":
    main()
