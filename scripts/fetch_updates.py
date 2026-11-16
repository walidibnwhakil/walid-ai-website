#!/usr/bin/env python3
import json,re,sys,os
from datetime import datetime,timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urlparse,urlencode
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
    except Exception as exc:
        code=getattr(exc,"code",None)
        print("Match feed request failed: "+("http_"+str(code) if code else type(exc).__name__),file=sys.stderr)
        return []
    out=[]
    for e in (payload.get("events") or []):
        home,away,day=clean(e.get("strHomeTeam")),clean(e.get("strAwayTeam")),e.get("dateEvent")
        start=iso(e.get("strTimestamp")) or iso((day or "")+"T"+(e.get("strTime") or "")+"Z")
        if not home or not away or not start: continue
        hs,as_=e.get("intHomeScore"),e.get("intAwayScore")
        provider_status=clean(str(e.get("strStatus") or e.get("strProgress") or "")).lower()
        if any(word in provider_status for word in ("postponed","suspended")): actual="postponed"
        elif any(word in provider_status for word in ("cancelled","canceled","abandoned")): actual="cancelled"
        elif any(word in provider_status for word in ("finished","complete","full time","ft")): actual="finished"
        elif any(word in provider_status for word in ("in progress","live","half time","1st half","2nd half")): actual="live"
        else: actual=status
        winner=None
        if actual=="finished" and hs is not None and as_ is not None:
            try: winner=home if int(hs)>int(as_) else away if int(as_)>int(hs) else "Draw"
            except (TypeError,ValueError): pass
        out.append({"id":str(e.get("idEvent") or ""), "homeTeam":home,"awayTeam":away,"homeScore":hs,"awayScore":as_,"winner":winner,"competition":clean(e.get("strLeague")) or "League match","startTime":start,"status":actual,"source":"TheSportsDB"})
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
            out.append({"id":str(e.get("idEvent") or ""), "homeTeam":home,"awayTeam":away,"homeScore":hs,"awayScore":as_,"winner":winner,"competition":clean(e.get("strLeague")) or "Soccer","startTime":start,"status":"finished","source":"TheSportsDB"})
    seen=set(); unique=[]
    for x in sorted(out,key=lambda m:m["startTime"],reverse=True):
        key=(x["homeTeam"],x["awayTeam"],x["startTime"])
        if key not in seen: seen.add(key); unique.append(x)
    return unique

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
        if finished and (now-kickoff).total_seconds() > 72*3600: continue
        results=e.get("matchResults") or []
        latest=results[-1] if results else {}
        hs,as_=latest.get("pointsTeam1"),latest.get("pointsTeam2")
        winner=None
        if finished and hs is not None and as_ is not None:
            winner=home if hs>as_ else away if as_>hs else "Draw"
        out.append({"id":str(e.get("matchID") or ""), "homeTeam":home,"awayTeam":away,"homeScore":hs,"awayScore":as_,"winner":winner,"competition":clean(e.get("leagueName")) or "1. Bundesliga","startTime":start,"finishedAt":iso(e.get("matchEndTime") or e.get("endTime")) if finished else None,"status":"finished" if finished else "scheduled","source":"OpenLigaDB"})
    return out
def event_key(event):
    """Use source plus team/time identity so ID-less duplicates collapse too."""
    source=str(event.get("source") or "").strip()
    home=clean(event.get("homeTeam")).casefold()
    away=clean(event.get("awayTeam")).casefold()
    start=str(event.get("startTime") or "").strip()
    if home and away and start:
        return (source, home, away, start)
    identifier=str(event.get("id") or "").strip()
    return (source, identifier)

def dedupe_events(events):
    found={}
    for event in events:
        key=event_key(event)
        if key not in found:
            found[key]=event
        else:
            old=found[key]
            if (event.get("homeScore") is not None or event.get("awayScore") is not None) and old.get("homeScore") is None:
                found[key]=event
    return sorted(found.values(),key=lambda x:x.get("startTime") or "")

def recent_cache_matches(events, cached, now=None):
    now=now or datetime.now(timezone.utc)
    cutoff=now.timestamp()-72*3600
    keep=list(events)
    for event in cached or []:
        start=iso(event.get("startTime"))
        if not start: continue
        try: start_dt=datetime.fromisoformat(start.replace("Z","+00:00"))
        except ValueError: continue
        status=str(event.get("status") or "").lower()
        if status=="finished":
            finished=iso(event.get("finishedAt") or event.get("endTime"))
            try: event_dt=datetime.fromisoformat((finished or start).replace("Z","+00:00"))
            except ValueError: continue
            if event_dt.timestamp()<cutoff or event_dt>now: continue
        elif status=="live":
            if start_dt>now or start_dt.timestamp()<cutoff: continue
            # A cached live flag is not proof of current live status after refresh.
            event={**event,"status":"stale"}
        elif status in ("scheduled","upcoming"):
            if start_dt<now: continue
        else: continue
        keep.append(event)
    return dedupe_events(keep)

def scores(previous):
    result={}
    old_sports=previous.get("sports") or {}
    for key,(name,next_url,past_url) in SPORTS.items():
        events=read_events(next_url,"scheduled")+read_events(past_url,"finished")
        providers=["TheSportsDB"] if events else []
        old_sport=old_sports.get(key,{})
        if key=="football":
            global_recent=read_global_soccer_recent()
            events += global_recent
            liga=read_openliga()
            events += liga
            if global_recent: providers.append("TheSportsDB")
            if liga: providers.append("OpenLigaDB")
        events=recent_cache_matches(events,old_sport.get("matches",[]))
        if events:
            result[key]={"label":name,"coverage":"available","source":" + ".join(dict.fromkeys(providers)),"matches":events,"note":"Verified fixtures and recent results; times are stored in UTC and rendered in Bangladesh time."}
        elif old_sport.get("matches"):
            result[key]={**old_sport,"coverage":"stale","matches":recent_cache_matches([],old_sport.get("matches",[])),"note":"Match information could not be refreshed; showing previously verified information."}
        else:
            result[key]={"label":name,"coverage":"unavailable","source":"TheSportsDB","matches":[],"note":"TheSportsDB returned no verified events for this refresh; no matches or scores are shown."}
    cricket, cricket_error=read_cricketdata()
    old_cricket=old_sports.get("cricket",{})
    if cricket:
        result["cricket"]={"label":"Cricket","coverage":"available","source":"CricketData","matches":recent_cache_matches(cricket,old_cricket.get("matches",[])),"note":"Verified cricket fixtures and scores."}
    elif old_cricket.get("matches"):
        result["cricket"]={**old_cricket,"coverage":"stale","matches":recent_cache_matches([],old_cricket.get("matches",[])),"note":"Cricket information could not be refreshed; showing previously verified information."}
    else:
        result["cricket"]={"label":"Cricket","coverage":"unavailable","source":"","matches":[],"note":"No verified cricket information is available right now."}
    for key in ("tennis","volleyball","badminton"):
        result[key]=old_sports.get(key) or {"label":key.title(),"coverage":"unavailable","source":"","matches":[],"note":"No verified match information is available right now."}
    for entry in result.values():
        # Keep provider provenance in the cache so each displayed event remains auditable.
        for match in entry.get("matches",[]):
            match.setdefault("source","unknown")
    return result
def read_cricketdata():
    """Combine scheduled match listings and score feed; never log the credential."""
    key=os.getenv("CRICKETDATA_API_KEY","").strip()
    if not key:
        print("Cricket feed unavailable: CRICKETDATA_API_KEY is missing from this workflow process.",file=sys.stderr)
        return [], "missing_key"
    out=[]
    errors=[]
    for endpoint in ("matches","cricScore"):
        params={"apikey":key}
        if endpoint=="matches": params["offset"]=0
        url="https://api.cricapi.com/v1/"+endpoint+"?"+urlencode(params)
        try:
            with urlopen(Request(url,headers={"User-Agent":"WalidAI-MatchCache/1.0"}),timeout=20) as response:
                payload=json.load(response)
        except Exception as exc:
            code=getattr(exc,"code",None)
            reason="http_"+str(code) if code else type(exc).__name__
            print("Cricket "+endpoint+" request failed: "+reason,file=sys.stderr)
            errors.append(reason)
            continue
        if not isinstance(payload,dict):
            print("Cricket "+endpoint+" response invalid: expected object.",file=sys.stderr)
            errors.append("invalid_response")
            continue
        if payload.get("status") != "success":
            detail=(str(payload.get("status") or "")+" "+str(payload.get("message") or "")).lower()
            if any(term in detail for term in ("quota","rate limit","limit exceeded","requests exhausted")):
                reason="quota"
            elif any(term in detail for term in ("unauthorized","invalid api key","api key invalid","authentication")):
                reason="rejected_key"
            elif any(term in detail for term in ("permission","plan does not","not allowed")):
                reason="permission"
            else:
                reason="rejected"
            print("Cricket "+endpoint+" rejected response: "+reason,file=sys.stderr)
            errors.append(reason)
            continue
        rows=payload.get("data")
        if not isinstance(rows,list):
            print("Cricket "+endpoint+" response invalid: data is not a list.",file=sys.stderr)
            errors.append("invalid_data")
            continue
        for e in rows:
            if not isinstance(e,dict): continue
            teams=e.get("teams") or []
            start=iso(e.get("dateTimeGMT"))
            if len(teams)<2 or not start: continue
            raw_scores=e.get("score") or []
            innings=[]
            for item in raw_scores:
                if not isinstance(item,dict): continue
                innings.append({"team":clean(str(item.get("inning") or "")),
                    "runs":item.get("r"),"wickets":item.get("w"),"overs":item.get("o")})
            first=innings[0] if innings else {}
            second=innings[1] if len(innings)>1 else {}
            status_text=clean(str(e.get("status") or "")).lower()
            ended=bool(e.get("matchEnded")) or any(x in status_text for x in ("match ended","completed","finished","won by","drawn","tied"))
            live=bool(e.get("matchStarted")) and not ended
            status="finished" if ended else "live" if live else "scheduled"
            winner=None
            if ended:
                m=re.search(r"^(.+?)\s+won by\b",str(e.get("status") or ""),re.I)
                winner=clean(m.group(1)) if m else None
            out.append({
                "id":str(e.get("id") or ""),
                "homeTeam":clean(str(teams[0])),"awayTeam":clean(str(teams[1])),
                "homeScore":first.get("runs"),"awayScore":second.get("runs"),
                "innings":innings,"winner":winner,
                "competition":clean(str(e.get("name") or e.get("series_id") or e.get("matchType") or "Cricket match")),
                "matchType":clean(str(e.get("matchType") or "")),
                "overs":first.get("overs"),"startTime":start,
                "finishedAt":iso(e.get("matchEndedAt") or e.get("endTime")) if ended else None,
                "status":status,"source":"CricketData"
            })
    normalized=dedupe_events(out)
    if normalized: return normalized, None
    reason=errors[0] if errors else "empty"
    if not errors: print("Cricket feeds returned valid empty data.",file=sys.stderr)
    return [], reason
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
