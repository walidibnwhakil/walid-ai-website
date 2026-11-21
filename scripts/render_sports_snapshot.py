#!/usr/bin/env python3
"""Pre-render verified Sports match snapshots into the deployed HTML artifact.

Reads the existing committed provider cache. Does not alter the repository's
HTML templates unless run in deployment (changes are in the Actions workspace).
Never presents a static match as LIVE: that requires a fresh browser feed.
"""
import argparse
import html
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
BDT = ZoneInfo("Asia/Dhaka")
DUMMY = {"sports": {}, "updatedAt": None}
UNKNOWN = {"tbc", "tbd", "unknown", "to be confirmed"}

def escape(value):
    return html.escape(str(value or ""), quote=True)

def parse_time(value):
    try:
        if not value or not re.search(r"(?:Z|[+-]\d{2}:\d{2})$", value, re.I):
            return None
        date = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return date if date.tzinfo else None
    except (ValueError, TypeError):
        return None

def time_markup(value):
    when = parse_time(value)
    if not when:
        return "Time to be announced"
    text = when.astimezone(BDT).strftime("%d %b %Y, %I:%M %p BDT")
    return '<time datetime="' + escape(value) + '">' + escape(text) + "</time>"

def valid(match):
    return (
        isinstance(match, dict)
        and all(str(match.get(key) or "").strip() for key in ("homeTeam", "awayTeam"))
        and str(match.get("homeTeam")).strip().casefold() not in UNKNOWN
        and str(match.get("awayTeam")).strip().casefold() not in UNKNOWN
    )

def valid_score(value):
    return isinstance(value, int) and not isinstance(value, bool) and value >= 0

def cricket_team_score(match, side):
    name = str(match.get(side+"Team") or "").strip().casefold()
    matching = []
    innings = match.get("innings")
    for inning in innings if isinstance(innings, list) else []:
        if not isinstance(inning, dict):
            continue
        label = str(inning.get("team") or "").strip().casefold()
        if label == name:
            matching.append(inning)
        elif name and label.startswith(name+" ") and re.fullmatch(
            r"(?:(?:\d+)(?:st|nd|rd|th)\s+)?innings?(?:\s+\d+)?", label[len(name)+1:]
        ):
            matching.append(inning)
    if len(matching) != 1:
        return ""
    inning = matching[0]
    if not valid_score(inning.get("runs")):
        return ""
    wickets = inning.get("wickets")
    return str(inning["runs"]) + ("/"+str(wickets) if valid_score(wickets) and wickets <= 10 else "")

def match_score(match, sport, side):
    if sport == "cricket":
        return cricket_team_score(match, side)
    value = match.get(side+"Score")
    other = match.get(("away" if side=="home" else "home")+"Score")
    return str(value) if valid_score(value) and valid_score(other) else ""

def initials(name):
    parts = str(name).split()
    return escape("".join(part[0] for part in parts[:2]).upper() or "?")

def team(match, sport, side, large=False):
    name = match.get(side+"Team") or "Team"
    logo = match.get(side+"Logo") if sport=="football" else ""
    img = ('<img src="' + escape(logo) + '" alt="' + escape(name) +
           ' crest" loading="lazy" referrerpolicy="no-referrer">') if isinstance(logo,str) and logo.startswith("https://") else ""
    marker = ("team-mark" if large else "mini-mark")
    return '<span class="' + marker + '">' + (img or '<span class="logo-fallback">' + initials(name) + '</span>') + "</span>"

def matches(sport_data):
    return [m for m in sport_data.get("matches", []) if valid(m)]

def selected(data, sport, now):
    all_matches=matches(data.get("sports",{}).get(sport,{}))
    results=[m for m in all_matches if m.get("status")=="finished" and parse_time(
        m.get("finishedAt") or m.get("startTime")
    ) and (sport=="cricket" or all(valid_score(m.get(k)) for k in ("homeScore","awayScore")))]
    results.sort(key=lambda m: parse_time(m.get("finishedAt") or m.get("startTime")), reverse=True)
    future=[m for m in all_matches if m.get("status") in ("scheduled","upcoming") and
            parse_time(m.get("startTime")) and parse_time(m["startTime"]) > now]
    future.sort(key=lambda m: parse_time(m["startTime"]))
    return results[:3], future[:10]

def card(match, sport, kind):
    icon="⚽" if sport=="football" else "🏏"
    title="Football" if sport=="football" else "Cricket"
    href="/sports/"+sport+"/"
    if match is None:
        return ("<article class='featured-card'><div class='featured-top'><span class='sport-tag'>"+
            icon+" "+title+"</span><span class='status-pill'>Feed check</span></div>"+
            "<div class='featured-empty'>No verified match is available in this snapshot.</div>"+
            "<div class='featured-footer'><a class='view-matches' href='"+href+"'>View All Matches</a></div></article>")
    comp=escape(match.get("competition") or "Match")
    hs=match_score(match,sport,"home")
    as_=match_score(match,sport,"away")
    center=escape(hs+" – "+as_) if kind=="result" and hs and as_ else "VS"
    tag="Latest verified result" if kind=="result" else "Next match"
    return ("<article class='featured-card'><div class='featured-top'><span class='sport-tag'>"+
        icon+" "+title+"</span><span class='status-pill'>"+tag+"</span></div>"+
        "<div class='featured-comp'>"+comp+"</div>"+
        "<div class='featured-teams'><div class='featured-team'>"+team(match,sport,"home",True)+
        "<span class='team-name'>"+escape(match["homeTeam"])+"</span></div>"+
        "<div class='versus'><span class='versus-mark'>"+center+"</span></div>"+
        "<div class='featured-team'>"+team(match,sport,"away",True)+
        "<span class='team-name'>"+escape(match["awayTeam"])+"</span></div></div>"+
        "<div class='featured-footer'><span class='featured-time'>"+time_markup(match.get("startTime"))+
        "</span><a class='view-matches' href='"+href+"'>View All Matches</a></div></article>")

def row(match, sport, kind):
    def side(which):
        score=match_score(match,sport,which) if kind=="result" else ""
        name=escape(match.get(which+"Team"))
        return ("<div class='scorecard-team'>"+team(match,sport,which)+"<span class='scorecard-name'>"+name+
                "</span>"+("<strong class='scorecard-figures'>"+escape(score)+"</strong>" if score else "")+"</div>")
    competition=escape(match.get("competition") or "Match")
    status="Completed" if kind=="result" else "Upcoming"
    winner=escape(match.get("winner") or "")
    winner_text=""
    if sport=="cricket" and winner and str(match.get("winner")).casefold() in {
        str(match.get("homeTeam")).casefold(),str(match.get("awayTeam")).casefold()
    }:
        provider=str(match.get("resultText") or "")
        text=provider if provider.casefold().startswith(str(match["winner"]).casefold()+" won by ") else winner+" won"
        winner_text="<div class='scorecard-result'>"+escape(text)+"</div>"
    center="VS"
    if kind=="result" and sport=="football":
        center=escape(match_score(match,sport,"home")+" – "+match_score(match,sport,"away"))
    return ("<article class='match-row scorecard'><div class='scorecard-top'><span>"+competition+
        "</span><span class='scorecard-status'>"+status+"</span></div>"+
        "<div class='scorecard-board'>"+side("home")+"<div class='scorecard-vs'>"+center+
        "</div>"+side("away")+"</div>"+winner_text+
        "<div class='scorecard-date'>"+time_markup(match.get("finishedAt") or match.get("startTime"))+
        "</div></article>")

def replace_placeholder(page, dom_id, markup, kind="div"):
    # Source templates contain a single initial Loading/Checking empty state.
    pattern=re.compile(r'(<'+kind+r' id="'+re.escape(dom_id)+r'"[^>]*>)(<div class="(?:empty-state|featured-empty)">[^<]*</div>)(</'+kind+r'>)')
    def insert(match):
        start=match.group(1).replace(">", ' data-static-ready="true">',1)
        return start+markup+match.group(3)
    result,count=pattern.subn(insert,page,count=1)
    if count!=1:
        raise ValueError("Sports template missing placeholder "+dom_id)
    return result

def render(root=ROOT, check=False, now=None):
    data_file=root/"data/sports.json"
    data=json.loads(data_file.read_text(encoding="utf8")) if data_file.exists() else DUMMY
    now=now or datetime.now(timezone.utc)
    sports={k:selected(data,k,now) for k in ("football","cricket")}
    home=root/"sports/index.html"
    html_home=home.read_text(encoding="utf8")
    featured=""
    for sport,(results,upcoming) in sports.items():
        match=upcoming[0] if upcoming else results[0] if results else None
        featured+=card(match,sport,"schedule" if upcoming else "result")
    html_home=replace_placeholder(html_home,"featuredMatches",featured,"section")
    checked=time_markup(data.get("updatedAt"))
    html_home=html_home.replace("Loading verified match information…","Last verified feed snapshot: "+checked)
    outputs={home:html_home}
    for sport,(results,upcoming) in sports.items():
        dest=root/"sports"/sport/"index.html"
        page=dest.read_text(encoding="utf8")
        page=replace_placeholder(page,"liveMatches",
            "<div class='empty-state'>Live status requires a fresh provider feed. Showing the last verified snapshot below.</div>")
        page=replace_placeholder(page,"recentResults",
            "".join(row(m,sport,"result") for m in results) or
            "<div class='empty-state'>No verified completed results in this snapshot.</div>")
        page=replace_placeholder(page,"scheduleMatches",
            "".join(row(m,sport,"schedule") for m in upcoming) or
            "<div class='empty-state'>No verified upcoming matches in this snapshot.</div>")
        placeholder="Loading verified "+sport+" information…"
        page=page.replace(placeholder,"Last verified feed snapshot: "+checked)
        outputs[dest]=page
    if not check:
        for dest,markup in outputs.items():
            dest.write_text(markup,encoding="utf8")
    print("Sports static snapshots rendered/checked:",
          ", ".join(str(p.relative_to(root)) for p in outputs),
          "(source:",escape(data.get("updatedAt") or "unavailable")+")")

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--check",action="store_true",help="Validate templates without changing source files")
    args=parser.parse_args()
    render(check=args.check)
