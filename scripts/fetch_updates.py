#!/usr/bin/env python3
import json,re,sys
from datetime import datetime,timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request,urlopen
from xml.etree import ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]; DATA=ROOT/"data"
FEEDS={"news":[("The Daily Star","https://www.thedailystar.net/rss.xml"),("Prothom Alo English","https://en.prothomalo.com/feed/"),("BBC World","https://feeds.bbci.co.uk/news/world/rss.xml")],"sports":[("BBC Sport","https://feeds.bbci.co.uk/sport/rss.xml"),("The Guardian Football","https://www.theguardian.com/football/rss")]}
OPENLIGA_SEASON_URL="https://api.openligadb.de/getmatchdata/bl1/2026"
SPORTS={"football":("Football","https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4328","https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php?id=4328"),"basketball":("Basketball","https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4387","https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php?id=4387"),"hockey":("Hockey","https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4380","https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php?id=4380")}

def clean(v): return re.sub(r"\s+"," ",re.sub(r"<[^>]+>","",v or "")).strip()
def iso(v):
    if not v:return None
    try:
        text=v.strip().replace("Z","+00:00")
        parsed=datetime.fromisoformat(text)
        if parsed.tzinfo is None: parsed=parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).isoformat().replace("+00:00","Z")
    except Exception:
        return None
def dt(v):
    try:return parsedate_to_datetime(v).astimezone(timezone.utc).isoformat()
    except:return v
def category(title,kind):
    if kind=="sports": return "Sports"
    t=title.lower()
    if any(x in t for x in ("bangladesh","dhaka","india","pakistan","nepal","myanmar")): return "Bangladesh"
    if any(x in t for x in ("technology","tech","ai","artificial intelligence","cyber")): return "Technology"
    return "World"
def read_feed(name,url,kind):
    req=Request(url,headers={"User-Agent":"WalidAI-NewsBot/1.0 (+https://walid-ai.com/)"})
    with urlopen(req,timeout=20) as r: root=ET.fromstring(r.read())
    out=[]
    for n in root.findall(".//item")[:12]:
        title,link=clean(n.findtext("title")),clean(n.findtext("link"))
        if title and re.match(r"^https?://",link): out.append({"title":title,"url":link,"source":name,"publishedAt":dt(n.findtext("pubDate")),"category":category(title,kind)})
    return out
def old(kind):
    try:return json.loads((DATA/(kind+".json")).read_text())
    except:return {"items":[]}
def read_events(url,status):
    try:
        with urlopen(Request(url,headers={"User-Agent":"WalidAI-MatchCache/1.0"}),timeout=20) as r: payload=json.load(r)
    except Exception:return []
    out=[]
    for e in (payload.get("events") or [])[:40]:
        home,away,day=clean(e.get("strHomeTeam")),clean(e.get("strAwayTeam")),e.get("dateEvent")
        start=iso(e.get("strTimestamp")) or iso((day or "")+"T"+(e.get("strTime") or "00:00:00")+"Z")
        if not home or not away or not start: continue
        hs,as_=e.get("intHomeScore"),e.get("intAwayScore")
        winner=None
        if status=="finished" and hs is not None and as_ is not None:
            try: winner=home if int(hs)>int(as_) else away if int(as_)>int(hs) else "Draw"
            except (TypeError,ValueError): pass
        out.append({"homeTeam":home,"awayTeam":away,"homeScore":hs,"awayScore":as_,"winner":winner,"competition":clean(e.get("strLeague")) or "League match","startTime":start,"status":status,"source":"TheSportsDB"})
    return out
def read_global_soccer_recent():
    out=[]
    now=datetime.now(timezone.utc)
    for offset in (2,1,0):
        day=(now.date()).fromordinal(now.date().toordinal()-offset).isoformat()
        url="https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d="+day+"&s=Soccer"
        try:
            with urlopen(Request(url,headers={"User-Agent":"WalidAI-MatchCache/1.0"}),timeout=20) as r: payload=json.load(r)
        except Exception: continue
        for e in (payload.get("events") or []):
            start=iso(e.get("strTimestamp")) or iso((e.get("dateEvent") or "")+"T"+(e.get("strTime") or "00:00:00")+"Z")
            home,away=clean(e.get("strHomeTeam")),clean(e.get("strAwayTeam"))
            if not home or not away or not start: continue
            hs,as_=e.get("intHomeScore"),e.get("intAwayScore")
            if hs is None or as_ is None: continue
            winner=home if str(hs).isdigit() and str(as_).isdigit() and int(hs)>int(as_) else away if str(hs).isdigit() and str(as_).isdigit() and int(as_)>int(hs) else "Draw"
            out.append({"homeTeam":home,"awayTeam":away,"homeScore":hs,"awayScore":as_,"winner":winner,"competition":clean(e.get("strLeague")) or "Soccer","startTime":start,"status":"finished","source":"TheSportsDB"})
    seen=set(); unique=[]
    for x in sorted(out,key=lambda m:m["startTime"],reverse=True):
        key=(x["homeTeam"],x["awayTeam"],x["startTime"])
        if key not in seen: seen.add(key); unique.append(x)
    return unique[:40]

def read_openliga():
    try:
        with urlopen(Request(OPENLIGA_SEASON_URL,headers={"User-Agent":"WalidAI-MatchCache/1.0"}),timeout=20) as r: payload=json.load(r)
    except Exception:return []
    out=[]
    now=datetime.now(timezone.utc)
    for e in payload if isinstance(payload,list) else []:
        home,away=clean((e.get("team1") or {}).get("teamName")),clean((e.get("team2") or {}).get("teamName"))
        start=iso(e.get("matchDateTimeUTC")) or iso(e.get("matchDateTime"))
        if not home or not away or not start: continue
        kickoff=datetime.fromisoformat(start.replace("Z","+00:00"))
        finished=bool(e.get("matchIsFinished"))
        if finished and (now-kickoff).total_seconds() > 48*3600: continue
        if not finished and (kickoff-now).total_seconds() > 14*86400: continue
        results=e.get("matchResults") or []
        latest=results[-1] if results else {}
        hs,as_=latest.get("pointsTeam1"),latest.get("pointsTeam2")
        winner=None
        if finished and hs is not None and as_ is not None:
            winner=home if hs>as_ else away if as_>hs else "Draw"
        out.append({"homeTeam":home,"awayTeam":away,"homeScore":hs,"awayScore":as_,"winner":winner,"competition":clean(e.get("leagueName")) or "1. Bundesliga","startTime":start,"status":"finished" if finished else "scheduled","source":"OpenLigaDB"})
    return out
def scores(previous):
    result={}
    for key,(name,next_url,past_url) in SPORTS.items():
        events=read_events(next_url,"scheduled")+read_events(past_url,"finished")
        providers=["TheSportsDB"] if events else []
        if key=="football":
            global_recent=read_global_soccer_recent()
            if global_recent:
                providers.append("TheSportsDB Soccer day feed")
                seen={(x["homeTeam"],x["awayTeam"],x["startTime"]) for x in events}
                events += [x for x in global_recent if (x["homeTeam"],x["awayTeam"],x["startTime"]) not in seen]
            liga=read_openliga()
            if liga:
                providers.append("OpenLigaDB")
                seen={(x["homeTeam"],x["awayTeam"],x["startTime"]) for x in events}
                events += [x for x in liga if (x["homeTeam"],x["awayTeam"],x["startTime"]) not in seen]
                events.sort(key=lambda x:x["startTime"])
        old_sport=(previous.get("sports") or {}).get(key,{})
        if events:
            result[key]={"label":name,"coverage":"available","source":" + ".join(providers),"matches":events,"note":"Verified fixtures and recent results; times are stored in UTC and rendered in Bangladesh time."}
        elif old_sport.get("matches"):
            result[key]={**old_sport,"coverage":"stale","note":"Provider did not return a fresh response; showing the last verified cache."}
        else:
            result[key]={"label":name,"coverage":"unavailable","source":"","matches":[],"note":"No verified events were returned by the configured free providers; no matches or scores are shown."}
    for key in ("cricket","tennis","volleyball","badminton"):
        result[key]={"label":key.title(),"coverage":"unavailable","source":"","matches":[],"note":"No free, stable provider is configured for this sport yet; no matches or scores are shown."}
    return result
def build(kind):
    items=[]; sources=[]; errors=[]
    for name,url in FEEDS[kind]:
        try: got=read_feed(name,url,kind); items+=got; sources.append({"name":name,"url":url,"host":urlparse(url).netloc,"ok":bool(got)})
        except Exception as e: sources.append({"name":name,"url":url,"host":urlparse(url).netloc,"ok":False}); errors.append(name+": "+type(e).__name__)
    seen=set(); unique=[]
    for x in sorted(items,key=lambda z:z.get("publishedAt") or "",reverse=True):
        if x["url"] not in seen: seen.add(x["url"]); unique.append(x)
    previous=old(kind); final=unique[:24] or previous.get("items",[])[:24]
    payload={"kind":kind,"updatedAt":datetime.now(timezone.utc).isoformat(),"status":"ok" if unique else ("stale" if final else "error"),"items":final,"sources":sources,"errors":errors}
    if kind=="sports": payload.update({"scoreSupport":"partial","scoreNote":"Only sports with verified provider responses are shown.","sports":scores(previous)})
    DATA.mkdir(exist_ok=True); (DATA/(kind+".json")).write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n")
    return bool(unique) or bool(final)
if __name__=="__main__":
    news_ok=build("news")
    sports_ok=build("sports")
    sys.exit(0 if news_ok or sports_ok else 1)
