#!/usr/bin/env python3
"""Download a free Riddlex knowledge base from the public QLever Wikidata mirror.

No API key. Cached under /tmp/riddlex-harvest. Adult-entertainment performers are
kept by name only: no image, no film title, and anyone not known to be 21 or
older in 2026 is dropped. Explicit display names are dropped too.
"""

from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path("/tmp/riddlex-harvest")
ENDPOINT = "https://qlever.dev/api/wikidata"
API = "https://www.wikidata.org/w/api.php"
COMMONS = "https://commons.wikimedia.org/w/api.php"
UA = "WalidAI-Riddlex/1.0 (https://walid-ai.com; educational guessing game)"
PREFIXES = """
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
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
ADULT_OCC = "Q488111"
# Someone born after 2004 is under 21 for all of 2026.
ADULT_MAX_BIRTH = 2004
EXPLICIT = re.compile(
    r"\b(porn|porno|xxx|hentai|blowjob|handjob|gangbang|cumshot|deepthroat|sex tape)\b",
    re.I,
)
CLASSES = {
    "Q7377": "mammal", "Q5113": "bird", "Q152": "fish", "Q10811": "reptile",
    "Q1390": "insect", "Q25265": "is_cat", "Q25324": "is_dog",
}
FICTION_TYPES = ["Q95074", "Q15632617", "Q3658341", "Q80447738", "Q1569167", "Q1114461"]
TYPE_FLAGS = {
    "Q3658341": "from_novel", "Q80447738": "from_anime", "Q1569167": "from_game",
    "Q1114461": "from_comics",
}
CREATORS = {}  # filled from Wikidata search


def http_post(url, fields, accept="text/tab-separated-values", timeout=180, retries=4):
    data = urllib.parse.urlencode(fields).encode()
    last = None
    for attempt in range(retries):
        req = urllib.request.Request(url, data=data, headers={"Accept": accept, "User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                body = response.read()
            if body[:1] in (b"{", b"<") and b"exception" in body[:400].lower():
                raise RuntimeError(body[:400].decode("utf-8", "replace"))
            return body
        except Exception as error:  # noqa: BLE001
            last = error
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(last)


def qlever(query, timeout=180):
    return http_post(ENDPOINT, {"query": PREFIXES + query}, timeout=timeout)


def unquote(token):
    token = token.strip()
    if token.startswith('"') and '"@' in token:
        return token[1:token.rfind('"@')].replace('\\"', '"')
    if len(token) >= 2 and token[0] == '"' and token[-1] == '"':
        return token[1:-1].replace('\\"', '"')
    if token.startswith("<") and token.endswith(">"):
        return token[1:-1]
    return token


def qid_of(value):
    value = unquote(value)
    match = re.search(r"Q\d+", value)
    return match.group(0) if match else ""


def year_of(value):
    value = unquote(value).strip()
    if not value:
        return None
    match = re.match(r"(-?\d+)-", value)
    if not match:
        return None
    year = int(match.group(1))
    if year < -5000 or year > 2026:
        return None
    return year


def split_ids(value):
    raw = unquote(value)
    if not raw:
        return []
    return [item for item in (qid_of(part) for part in raw.split("|")) if item]


def parse_tsv(body):
    text = body.decode("utf-8", "replace")
    lines = text.splitlines()
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


def cached_query(name, query, timeout=180):
    ROOT.mkdir(parents=True, exist_ok=True)
    path = ROOT / f"{name}.tsv"
    if path.exists() and path.stat().st_size > 80:
        print(f"cache {name}", flush=True)
        return path.read_bytes()
    print(f"query {name}", flush=True)
    body = qlever(query, timeout=timeout)
    path.write_bytes(body)
    print(f"  {name}: {body.count(bchr_n())} lines", flush=True)
    return body


def bchr_n():
    return b"\n"


def human_query(low, high):
    upper = "" if high is None else f" && ?links < {high}"
    return f"""
SELECT ?item ?links ?en (SAMPLE(?bnLab) AS ?bnOut) (SAMPLE(?gender) AS ?genderOut)
 (MIN(?birth) AS ?birthOut) (SAMPLE(?death) AS ?deathOut)
 (GROUP_CONCAT(DISTINCT STR(?country); SEPARATOR="|") AS ?countries)
 (GROUP_CONCAT(DISTINCT STR(?occ); SEPARATOR="|") AS ?occs)
WHERE {{
  ?item wdt:P31 wd:Q5 .
  ?item wikibase:sitelinks ?links .
  FILTER(?links >= {low}{upper})
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


def download_bands(prefix, bands):
    people = {}
    for low, high in bands:
        name = f"{prefix}-{low}-{high or 'up'}"
        try:
            rows = parse_tsv(cached_query(name, human_query(low, high)))
        except Exception as error:  # noqa: BLE001
            print(f"  failed {name}: {error}", flush=True)
            if high and high - low > 2:
                mid = (low + high) // 2
                download_into(people, download_bands(prefix + "x", [(low, mid), (mid, high)]))
            continue
        absorb_humans(people, rows)
        print(f"  running humans {len(people)}", flush=True)
    return people


def download_into(target, source):
    for key, value in source.items():
        merge_human(target, key, value)


def better_label(old, new):
    if not old:
        return new
    if not new:
        return old
    old_note, new_note = "(" in old, "(" in new
    if old_note and not new_note:
        return new
    if new_note and not old_note:
        return old
    return old if len(old) <= len(new) else new


def merge_human(people, key, row):
    current = people.get(key)
    if not current:
        people[key] = row
        return
    current["en"] = better_label(current["en"], row["en"])
    if row.get("bn") and not current.get("bn"):
        current["bn"] = row["bn"]
    current["pop"] = max(current["pop"], row["pop"])
    if row.get("year") is not None and current.get("year") is None:
        current["year"] = row["year"]
    if row.get("dead"):
        current["dead"] = True
    if row.get("gender") and not current.get("gender"):
        current["gender"] = row["gender"]
    current["countries"] = sorted(set(current["countries"]) | set(row["countries"]))
    current["occs"] = sorted(set(current["occs"]) | set(row["occs"]))


def absorb_humans(people, rows):
    for row in rows:
        key = qid_of(row.get("?item", ""))
        label = unquote(row.get("?en", "")).strip()
        if not key or not label or "disambiguation" in label.lower():
            continue
        try:
            pop = int(float(unquote(row.get("?links", "0")) or 0))
        except ValueError:
            pop = 0
        parsed = {
            "id": key, "en": label, "bn": unquote(row.get("?bnOut", "")).strip(),
            "pop": pop, "gender": qid_of(row.get("?genderOut", "")),
            "year": year_of(row.get("?birthOut", "")),
            "dead": bool(unquote(row.get("?deathOut", "")).strip()),
            "countries": split_ids(row.get("?countries", "")),
            "occs": split_ids(row.get("?occs", "")),
            "kind": "real",
        }
        merge_human(people, key, parsed)


def map_occupation(label):
    text = label.lower()
    keys = set()
    if any(word in text for word in ("pornographic", "porn star", "adult film", "adult video", "adult actor")):
        keys.update(("adult_ent", "actor"))
    if any(word in text for word in ("actor", "actress")):
        keys.add("actor")
    if any(word in text for word in ("singer", "vocalist", "rapper", "playback singer")):
        keys.update(("singer", "musician"))
    if any(word in text for word in ("composer", "guitarist", "pianist", "drummer", "musician", "violinist", "sitarist")):
        keys.add("musician")
    if "political scientist" in text:
        keys.add("scientist")
    elif any(word in text for word in ("politician", "statesperson", "head of state", "head of government", "minister", "prime minister")):
        keys.add("politician")
    if any(word in text for word in ("writer", "author", "poet", "novelist", "playwright", "essayist", "screenwriter", "lyricist", "columnist")):
        keys.add("writer")
    if "all-rounder" in text or "all rounder" in text:
        keys.update(("all_rounder", "cricketer", "athlete"))
    if "cricket" in text:
        keys.update(("cricketer", "athlete"))
    if any(word in text for word in ("footballer", "association football", "soccer")):
        keys.update(("footballer", "athlete"))
    if any(word in text for word in ("athlete", "swimmer", "tennis player", "sprinter", "basketball", "golfer", "boxer", "wrestler", "badminton", "hockey player", "chess player")):
        keys.add("athlete")
    if any(word in text for word in ("scientist", "physicist", "chemist", "biologist", "mathematician", "astronomer", "geologist", "economist")):
        keys.add("scientist")
    if any(word in text for word in ("film director", "television director", "filmmaker", "film maker")) or text.strip() in {"director", "film director"}:
        keys.add("director")
    if any(word in text for word in ("businessperson", "entrepreneur", "business executive", "merchant")):
        keys.add("business")
    if any(word in text for word in ("youtuber", "youtube", "tiktoker", "online influencer")):
        keys.add("youtube")
    return keys


def resolve_labels(qids):
    cache_path = ROOT / "labels.json"
    cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}
    missing = [qid for qid in qids if qid not in cache]
    print(f"labels cached {len(cache)} missing {len(missing)}", flush=True)
    for start in range(0, len(missing), 40):
        batch = missing[start:start + 40]
        query = urllib.parse.urlencode({
            "action": "wbgetentities", "ids": "|".join(batch), "props": "labels",
            "languages": "en", "format": "json",
        }).encode()
        req = urllib.request.Request(API, data=query, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=40) as response:
                payload = json.loads(response.read().decode())
        except Exception as error:  # noqa: BLE001
            print(" label batch failed", error, flush=True)
            time.sleep(2)
            continue
        for qid, entity in payload.get("entities", {}).items():
            cache[qid] = ((entity.get("labels") or {}).get("en") or {}).get("value", "")
        if start and start % 400 == 0:
            cache_path.write_text(json.dumps(cache))
            print(f"  labels {start}/{len(missing)}", flush=True)
        time.sleep(0.05)
    cache_path.write_text(json.dumps(cache))
    return cache


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
JOBS = [
    "actor", "singer", "politician", "writer", "cricketer", "footballer", "athlete",
    "scientist", "musician", "director", "business", "youtube", "all_rounder", "adult_ent",
]


def attributes_for_human(person, labels):
    yes, no = {"real", "named"}, {"fictional", "animal", "object"}
    jobs = set()
    for occ in person["occs"]:
        jobs |= map_occupation(labels.get(occ, ""))
    if "adult_ent" in jobs:
        if person.get("year") is None or person["year"] > ADULT_MAX_BIRTH:
            return None
        if EXPLICIT.search(person["en"] or "") or EXPLICIT.search(person.get("bn") or ""):
            return None
        person["adult"] = True
    else:
        person["adult"] = False
        no.add("adult_ent")
    yes |= jobs
    if person["pop"] >= 12 and person["occs"]:
        for job in JOBS:
            if job not in jobs and job != "all_rounder":
                no.add(job)
        if "cricketer" in jobs and "all_rounder" not in jobs:
            no.add("all_rounder")
    gender = person.get("gender")
    if gender == MALE:
        yes.add("male"); no.add("female")
    elif gender == FEMALE:
        yes.add("female"); no.add("male")
    bucket = decade(person.get("year"))
    if bucket:
        yes.add(bucket)
        no.update(item for item in DECADES if item != bucket)
    countries = {COUNTRIES[item] for item in person["countries"] if item in COUNTRIES}
    if person["countries"]:
        yes |= countries
        no.update(item for item in COUNTRIES.values() if item not in countries)
    if person.get("dead"):
        yes.add("dead"); no.add("alive")
    elif person.get("year") is not None and person["year"] >= 1926:
        yes.add("alive"); no.add("dead")
    person["yes"] = sorted(yes)
    person["no"] = sorted(no - yes)
    person.pop("occs", None)
    person.pop("countries", None)
    person.pop("gender", None)
    return person


def fiction_query():
    values = " ".join(f"wd:{item}" for item in FICTION_TYPES)
    return f"""
SELECT ?item ?links ?en (SAMPLE(?bnLab) AS ?bnOut) (SAMPLE(?gender) AS ?genderOut)
 (GROUP_CONCAT(DISTINCT STR(?type); SEPARATOR="|") AS ?types)
 (GROUP_CONCAT(DISTINCT STR(?creator); SEPARATOR="|") AS ?creators)
WHERE {{
  VALUES ?kind {{ {values} }}
  ?item wdt:P31 ?kind .
  ?item wikibase:sitelinks ?links .
  FILTER(?links >= 2)
  ?item rdfs:label ?en . FILTER(LANG(?en)="en")
  ?item wdt:P31 ?type .
  OPTIONAL {{ ?item rdfs:label ?bnLab . FILTER(LANG(?bnLab)="bn") }}
  OPTIONAL {{ ?item wdt:P21 ?gender }}
  OPTIONAL {{ ?item wdt:P170 ?creator }}
}}
GROUP BY ?item ?links ?en
"""


def load_fiction():
    rows = parse_tsv(cached_query("fiction", fiction_query(), timeout=240))
    found = {}
    for row in rows:
        key = qid_of(row.get("?item", ""))
        label = unquote(row.get("?en", "")).strip()
        if not key or not label:
            continue
        types = set(split_ids(row.get("?types", "")))
        creators = set(split_ids(row.get("?creators", "")))
        yes, no = {"fictional", "named"}, {"real", "object", "adult_ent"}
        for type_id, flag in TYPE_FLAGS.items():
            if type_id in types:
                yes.add(flag)
        origins = ["from_novel", "from_anime", "from_game", "from_comics", "from_film", "from_cartoon"]
        if any(flag in yes for flag in ("from_novel", "from_anime", "from_game", "from_comics")):
            no.update(flag for flag in origins if flag not in yes and flag not in ("from_film", "from_cartoon"))
        no.add("from_bengali_lit")
        for flag, creator in (("by_humayun", CREATORS.get("humayun")), ("by_zafar", CREATORS.get("zafar")), ("by_ray", CREATORS.get("ray"))):
            if creator and creator in creators:
                yes.add(flag)
                yes.add("from_bengali_lit")
                no.discard("from_bengali_lit")
            else:
                no.add(flag)
        gender = qid_of(row.get("?genderOut", ""))
        if gender == MALE:
            yes.add("male"); no.add("female")
        elif gender == FEMALE:
            yes.add("female"); no.add("male")
        try:
            pop = int(float(unquote(row.get("?links", "0")) or 0))
        except ValueError:
            pop = 1
        current = found.get(key)
        record = {
            "id": key, "en": label, "bn": unquote(row.get("?bnOut", "")).strip(),
            "pop": pop, "kind": "fiction", "adult": False,
            "yes": sorted(yes), "no": sorted(no - yes),
        }
        if not current or pop > current["pop"]:
            if current:
                record["en"] = better_label(current["en"], label)
                record["bn"] = current["bn"] or record["bn"]
            found[key] = record
        elif current and not current.get("bn"):
            current["bn"] = record["bn"]
    print(f"fiction {len(found)}", flush=True)
    return found


def animal_query():
    return """
SELECT ?item ?links ?en (SAMPLE(?bnLab) AS ?bnOut) (GROUP_CONCAT(DISTINCT STR(?parent); SEPARATOR="|") AS ?parents)
WHERE {
  ?item wdt:P31 wd:Q16521 .
  ?item wdt:P105 wd:Q7432 .
  ?item wikibase:sitelinks ?links .
  FILTER(?links >= 20)
  ?item rdfs:label ?en . FILTER(LANG(?en)="en")
  OPTIONAL { ?item rdfs:label ?bnLab . FILTER(LANG(?bnLab)="bn") }
  OPTIONAL { ?item wdt:P171 ?parent }
}
GROUP BY ?item ?links ?en
"""


def class_members(class_id, flag):
    query = f"""
SELECT ?item WHERE {{
  ?item wdt:P31 wd:Q16521 .
  ?item wdt:P105 wd:Q7432 .
  ?item wdt:P171+ wd:{class_id} .
  ?item wikibase:sitelinks ?links .
  FILTER(?links >= 20)
}}
"""
    try:
        rows = parse_tsv(cached_query(f"class-{flag}", query, timeout=180))
    except Exception as error:  # noqa: BLE001
        print(f" class {flag} failed {error}", flush=True)
        return set()
    return {qid_of(row.get("?item", "")) for row in rows if qid_of(row.get("?item", ""))}


def load_animals():
    members = {flag: class_members(class_id, flag) for class_id, flag in CLASSES.items()}
    rows = parse_tsv(cached_query("animals", animal_query(), timeout=180))
    found = {}
    for row in rows:
        key = qid_of(row.get("?item", ""))
        label = unquote(row.get("?en", "")).strip()
        if not key or not label:
            continue
        yes, no = {"animal"}, {"real", "fictional", "object", "named", "adult_ent"}
        for flag, ids in members.items():
            if key in ids:
                yes.add(flag)
        if "mammal" in yes:
            no.update(("bird", "fish", "reptile", "insect"))
        if "bird" in yes:
            no.update(("mammal", "fish", "reptile", "insect"))
            yes.add("can_fly")
        if "fish" in yes:
            no.update(("mammal", "bird", "reptile", "insect", "can_fly"))
            yes.add("water_life")
        if "is_cat" in yes and key not in {"Q146"}:
            yes.update(("wild",)); no.add("pet")
        if "is_dog" in yes and key not in {"Q144"}:
            yes.add("wild"); no.add("pet")
        if key == "Q146":
            yes.update(("is_cat", "mammal", "pet")); no.update(("wild", "bigger_than_person"))
        if key == "Q144":
            yes.update(("is_dog", "mammal", "pet")); no.update(("wild", "bigger_than_person"))
        try:
            pop = int(float(unquote(row.get("?links", "0")) or 0))
        except ValueError:
            pop = 1
        found[key] = {
            "id": key, "en": label, "bn": unquote(row.get("?bnOut", "")).strip(),
            "pop": pop, "kind": "animal", "adult": False,
            "yes": sorted(yes), "no": sorted(set(no) - yes),
        }
    print(f"animals {len(found)}", flush=True)
    return found


def image_rows():
    query = """
SELECT ?item ?img WHERE {
  ?item wdt:P31 wd:Q5 .
  ?item wikibase:sitelinks ?links .
  FILTER(?links >= 25)
  ?item wdt:P18 ?img .
}
"""
    rows = parse_tsv(cached_query("images", query, timeout=180))
    found = {}
    for row in rows:
        key = qid_of(row.get("?item", ""))
        filename = file_name(unquote(row.get("?img", "")))
        if key and filename and key not in found:
            found[key] = filename
    print(f"image candidates {len(found)}", flush=True)
    return found


def file_name(url):
    if not url or "FilePath/" not in url and "/wiki/Special:FilePath/" not in url and "File:" not in url:
        # Commons direct path
        if "/" not in url:
            return ""
    name = urllib.parse.unquote(url.split("FilePath/")[-1].split("File:")[-1])
    name = name.split("?")[0].replace(" ", "_")
    if not re.search(r"\.(jpe?g|png|webp|gif)$", name, re.I):
        return ""
    if re.search(r"nude|porn|xxx|nsfw", name, re.I):
        return ""
    return name


def free_license(name):
    text = (name or "").lower()
    if any(block in text for block in ("non-free", "nonfree", "fair use", "all rights reserved")):
        return False
    if "copyrighted" in text and "copyrighted free use" not in text:
        return False
    return any(ok in text for ok in (
        "public domain", "cc0", "cc by", "cc-by", "gfdl", "free art", "no restrictions", "attribution",
    ))


def strip_html(value):
    value = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"\s+", " ", value).strip()[:120]


def approve_images(candidates, adult_ids):
    approved = {}
    items = [(key, name) for key, name in candidates.items() if key not in adult_ids]
    items = items[:7000]
    cache_path = ROOT / "image-credits.json"
    cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}
    pending = [(key, name) for key, name in items if name not in cache]
    print(f"licensing {len(pending)} of {len(items)}", flush=True)
    for start in range(0, len(pending), 40):
        batch = pending[start:start + 40]
        titles = "|".join("File:" + name for _, name in batch)
        try:
            body = http_post(COMMONS, {
                "action": "query", "format": "json", "prop": "imageinfo",
                "iiprop": "extmetadata", "iiextmetadatafilter": "LicenseShortName|Artist",
                "titles": titles,
            }, accept="application/json", timeout=60, retries=3)
            payload = json.loads(body.decode())
        except Exception as error:  # noqa: BLE001
            print(" commons failed", error, flush=True)
            time.sleep(1)
            continue
        pages = (payload.get("query") or {}).get("pages") or {}
        by_title = {}
        for page in pages.values():
            title = (page.get("title") or "").removeprefix("File:")
            info = ((page.get("imageinfo") or [{}])[0].get("extmetadata") or {})
            license_name = ((info.get("LicenseShortName") or {}).get("value") or "")
            artist = strip_html((info.get("Artist") or {}).get("value") or "")
            by_title[title.replace(" ", "_")] = (license_name, artist)
        for _, name in batch:
            license_name, artist = by_title.get(name, ("", ""))
            cache[name] = {"ok": free_license(license_name), "license": license_name, "artist": artist}
        if start and start % 400 == 0:
            cache_path.write_text(json.dumps(cache))
            print(f"  licensed {start}", flush=True)
        time.sleep(0.08)
    cache_path.write_text(json.dumps(cache))
    for key, name in items:
        meta = cache.get(name) or {}
        if meta.get("ok"):
            credit = meta.get("license") or "Wikimedia Commons"
            if meta.get("artist"):
                credit = f"{credit} — {meta['artist']}"
            approved[key] = {"image": name, "credit": credit}
    print(f"free images {len(approved)}", flush=True)
    return approved


def lookup_creator(search):
    query = urllib.parse.urlencode({
        "action": "wbsearchentities", "search": search, "language": "en", "format": "json", "limit": 1,
    })
    req = urllib.request.Request(API + "?" + query, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as response:
        payload = json.loads(response.read().decode())
    hit = (payload.get("search") or [{}])[0]
    print(f"creator {search}: {hit.get('id')} {hit.get('label')} {hit.get('description')}", flush=True)
    return hit.get("id") or ""


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    for key, search in (("humayun", "Humayun Ahmed"), ("zafar", "Muhammed Zafar Iqbal"), ("ray", "Satyajit Ray")):
        try:
            CREATORS[key] = lookup_creator(search)
        except Exception as error:  # noqa: BLE001
            print("creator lookup failed", search, error, flush=True)
    bands = [
        (400, None), (250, 400), (180, 250), (140, 180), (110, 140), (90, 110),
        (75, 90), (60, 75), (50, 60), (40, 50), (32, 40), (26, 32), (20, 26),
        (16, 20), (13, 16), (11, 13), (10, 11),
    ]
    humans = download_bands("human", bands)
    # Local fame below the global cutoff.
    for name, query_low, query_high, country in (
        ("bd-local", 2, 10, "Q902"),
        ("in-local", 5, 10, "Q668"),
    ):
        query = human_query(query_low, query_high).replace(
            "?item wdt:P31 wd:Q5 .",
            f"?item wdt:P31 wd:Q5 . ?item wdt:P27 wd:{country} .",
            1,
        )
        try:
            absorb_humans(humans, parse_tsv(cached_query(name, query, timeout=180)))
        except Exception as error:  # noqa: BLE001
            print(name, error, flush=True)
    print(f"humans raw {len(humans)}", flush=True)
    labels = resolve_labels(sorted({occ for person in humans.values() for occ in person["occs"]}))
    kept = {}
    dropped_adult = 0
    for key, person in humans.items():
        result = attributes_for_human(person, labels)
        if result is None:
            dropped_adult += 1
            continue
        kept[key] = result
    print(f"humans kept {len(kept)} dropped adult/unsafe {dropped_adult}", flush=True)
    fiction = load_fiction()
    animals = load_animals()
    for key in list(fiction):
        kept.pop(key, None)
    images = {}
    try:
        images = approve_images(image_rows(), {key for key, person in kept.items() if person.get("adult")})
    except Exception as error:  # noqa: BLE001
        print("images skipped", error, flush=True)
    for key, meta in images.items():
        person = kept.get(key)
        if person and not person.get("adult"):
            person["image"] = meta["image"]
            person["credit"] = meta["credit"]
    out = ROOT / "entities.jsonl"
    with out.open("w", encoding="utf-8") as handle:
        for record in list(kept.values()) + list(fiction.values()) + list(animals.values()):
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")
    summary = {
        "humans": sum(1 for person in kept.values() if person["kind"] == "real" and not person.get("adult")),
        "adult_name_only": sum(1 for person in kept.values() if person.get("adult")),
        "fiction": len(fiction),
        "animals": len(animals),
        "images": sum(1 for person in kept.values() if person.get("image")),
    }
    (ROOT / "summary.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary), flush=True)


if __name__ == "__main__":
    main()
