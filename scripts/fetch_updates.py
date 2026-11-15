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
def clean(v): return re.sub(r"\s+"," ",re.sub(r"<[^>]+>","",v or "")).strip()
def dt(v):
 try:return parsedate_to_datetime(v).astimezone(timezone.utc).isoformat()
 except:return v
def read_feed(name,url):
 req=Request(url,headers={"User-Agent":"WalidAI-NewsBot/1.0 (+https://walid-ai.com/)"})
 with urlopen(req,timeout=20) as r: root=ET.fromstring(r.read())
 out=[]
 for n in root.findall(".//item")[:12]:
  title,link=clean(n.findtext("title")),clean(n.findtext("link"))
  if title and re.match(r"^https?://",link): out.append({"title":title,"url":link,"source":name,"publishedAt":dt(n.findtext("pubDate"))})
 if not out:
  for n in root.findall(".//{*}entry")[:12]:
   l=n.find("{*}link"); link=l.get("href","") if l is not None else ""
   if clean(n.findtext("{*}title")) and re.match(r"^https?://",link): out.append({"title":clean(n.findtext("{*}title")),"url":link,"source":name,"publishedAt":dt(n.findtext("{*}updated"))})
 return out
def old(kind):
 try:return json.loads((DATA/(kind+".json")).read_text())
 except:return {"items":[]}
def build(kind):
 items=[]; sources=[]; errors=[]
 for name,url in FEEDS[kind]:
  try:
   got=read_feed(name,url); items+=got; sources.append({"name":name,"url":url,"host":urlparse(url).netloc,"ok":bool(got)})
  except Exception as e: sources.append({"name":name,"url":url,"host":urlparse(url).netloc,"ok":False}); errors.append(name+": "+type(e).__name__)
 seen=set(); unique=[]
 for x in sorted(items,key=lambda z:z.get("publishedAt") or "",reverse=True):
  if x["url"] not in seen: seen.add(x["url"]); unique.append(x)
 previous=old(kind); final=unique[:24] or previous.get("items",[])[:24]
 payload={"kind":kind,"updatedAt":datetime.now(timezone.utc).isoformat(),"status":"ok" if unique else ("stale" if final else "error"),"items":final,"sources":sources,"errors":errors}
 if kind=="sports": payload.update(scoreSupport="unavailable",scoreNote="No live-score API is configured; these are verified sports headlines only, not live scores.")
 DATA.mkdir(exist_ok=True); (DATA/(kind+".json")).write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n")
 return bool(unique)
if __name__=="__main__":
 ok=build("news") or build("news"); ok=build("sports") or ok; sys.exit(0 if ok else 1)
