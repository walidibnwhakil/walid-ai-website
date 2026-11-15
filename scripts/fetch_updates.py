#!/usr/bin/env python3
import json,re,sys,os
from datetime import datetime,timezone,timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request,urlopen
from xml.etree import ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]; DATA=ROOT/"data"
FEEDS={"news":[("The Daily Star","https://www.thedailystar.net/rss.xml"),("Prothom Alo English","https://en.prothomalo.com/feed/"),("BBC World","https://feeds.bbci.co.uk/news/world/rss.xml")],"sports":[("BBC Sport","https://feeds.bbci.co.uk/sport/rss.xml"),("The Guardian Football","https://www.theguardian.com/football/rss")]}
CRICKETDATA_BASE="https://api.cricketdata.org/v1"
CRICKETDATA_KEY=os.getenv("CRICKETDATA_API_KEY","").strip()
SPORTS={"football":("Football","https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4328","https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php?id=4328"),"basketball":("Basketball","https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4387","https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php?id=4387"),"hockey":("Hockey","https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4380","https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php?id=4380")}
def clean(v): return re.sub(r"\s+"," ",re.sub(r"<[^>]+>","",v or "")).strip()
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
 for e in (payload.get("events") or [])[:20]:
  if not e.get("strHomeTeam") or not e.get("strAwayTeam") or not e.get("dateEvent"): continue
  start=e.get("strTimestamp") or e.get("dateEvent")+"T"+(e.get("strTime") or "00:00:00")+"Z"
  out.append({"homeTeam":e["strHomeTeam"],"awayTeam":e["strAwayTeam"],"homeScore":e.get("intHomeScore"),"awayScore":e.get("intAwayScore"),"competition":e.get("strLeague") or "League match","startTime":start+"Z" if not start.endswith("Z") else start,"status":status,"source":"TheSportsDB"})
 return out
def read_cricketdata():
 if not CRICKETDATA_KEY: return []
 # CricketData requires a user-supplied API key; never fall back to scraping.
 out=[]
 for endpoint in ("currentMatches","cricScore"):
  try:
   req=Request(CRICKETDATA_BASE+"/"+endpoint,headers={"apikey":CRICKETDATA_KEY,"User-Agent":"WalidAI-MatchCache/1.0"})
   with urlopen(req,timeout=20) as r: payload=json.load(r)
  except Exception: continue
  for e in (payload.get("data") or []):
   teams=e.get("teams") or []
   if len(teams)<2: continue
   start=e.get("dateTimeGMT") or e.get("dateTime")
   if not start: continue
   score=e.get("score") or []
   hs=score[0].get("r") if len(score)>0 and isinstance(score[0],dict) else None
   aws=score[1].get("r") if len(score)>1 and isinstance(score[1],dict) else None
   status="finished" if e.get("matchEnded") else "scheduled"
   out.append({"homeTeam":teams[0],"awayTeam":teams[1],"homeScore":hs,"awayScore":aws,"competition":e.get("name") or e.get("matchType") or "Cricket match","startTime":start,"status":status,"source":"CricketData"})
 return out[:40]
def scores():
 result={}
 for key,(name,next_url,past_url) in SPORTS.items():
  events=read_events(next_url,"scheduled")+read_events(past_url,"finished")
  result[key]={"label":name,"coverage":"available" if events else "unavailable","source":"TheSportsDB" if events else "","matches":events,"note":"Verified fixtures/results from TheSportsDB." if events else "TheSportsDB returned no verified events for this sport during the refresh."}
 cricket=read_cricketdata()
 result["cricket"]={"label":"Cricket","coverage":"available" if cricket else "unavailable","source":"CricketData" if cricket else "","matches":cricket,"note":"Verified cricket fixtures/results from CricketData." if cricket else "No CricketData API key is configured; no verified cricket fixtures or scores are shown."}
 for key in ("tennis","volleyball","badminton"):
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
 if kind=="sports": payload.update({"scoreSupport":"partial","scoreNote":"Only sports with verified provider responses are shown.","sports":scores()})
 DATA.mkdir(exist_ok=True); (DATA/(kind+".json")).write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n"); return bool(unique)
if __name__=="__main__": sys.exit(0 if build("news") or build("sports") else 1)
