(() => {
  "use strict";
  const REFRESH_MS = 5 * 60 * 1000;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const validDate = (value) => { const time = value ? Date.parse(value) : NaN; return Number.isFinite(time) ? time : null; };
  const timeLabel = (value) => value ? new Date(value).toLocaleString("en-GB",{timeZone:"Asia/Dhaka",dateStyle:"medium",timeStyle:"short"}) : "Time to be announced";
  const countryCodes = {Germany:"DE",England:"GB",Spain:"ES",Italy:"IT",France:"FR",India:"IN",Pakistan:"PK",Bangladesh:"BD",Nepal:"NP",Australia:"AU",Canada:"CA",Japan:"JP",China:"CN",Namibia:"NA",Rwanda:"RW",Uganda:"UG","United States of America":"US","Sri Lanka":"LK",Ireland:"IE","Papua New Guinea":"PG",Scotland:"GB",Netherlands:"NL",Thailand:"TH",Zimbabwe:"ZW",Afghanistan:"AF","South Africa":"ZA","New Zealand":"NZ","Falkland Islands":"FK","Costa Rica":"CR","West Indies":"JM"};
  // A country's league does not make its clubs national teams.
  function nationalCountry(match,side) {
    const name=String(match[side+"Team"]||"").trim();
    const names=Object.keys(countryCodes).sort((a,b)=>b.length-a.length);
    const matchName=names.find(country=>{
      const prefix=country.toLowerCase(), lower=name.toLowerCase();
      return lower===prefix || lower.startsWith(prefix+" ") && /^(women|men|u\\d{2}|under[- ]?\\d{2}|a|b|xi|national|academy|emerging|seniors|juniors|development|legends)(?:\\b|$)/i.test(name.slice(country.length).trim());
    });
    return matchName||"";
  }
  function flag(country) {
    const code=countryCodes[country]||"";
    return code?[...code].map(char=>String.fromCodePoint(127397+char.charCodeAt(0))).join(""):"";
  }
  function logo(match,side,compact=false) {
    const name=String(match[side+"Team"]||"Team"), country=nationalCountry(match,side);
    const url=!country?String(match[side+"Logo"]||""):"";
    const size=compact?"mini-mark":"team-mark";
    const initials=esc(name.split(/\\s+/).map(p=>p[0]||"").slice(0,2).join("").toUpperCase());
    const fallback="<span class='logo-fallback' aria-hidden='true'>"+initials+"</span>";
    const content=country?"<span class='primary-flag' role='img' aria-label='"+esc(country)+" flag'>"+flag(country)+"</span>":url?"<img src='"+esc(url)+"' alt='"+esc(name)+" crest' loading='lazy' referrerpolicy='no-referrer' onerror='this.hidden=true;this.nextElementSibling.hidden=false'>"+ "<span class='logo-fallback' aria-hidden='true' hidden>"+initials+"</span>":fallback;
    return "<span class='"+size+"'>"+content+"</span>";
  }
  function statusOf(match) {
    const status=String(match.status||"").toLowerCase().replace(/[- ]+/g,"_");
    if(["live","in_progress","innings","in_play","1st_innings","2nd_innings"].includes(status)) return "live";
    if(["finished","final","completed","result","abandoned"].includes(status)) return "finished";
    if(status==="postponed"||status==="cancelled"||status==="canceled") return status;
    return "scheduled";
  }
  const matchTime=(match)=>validDate(match.finishedAt||match.endTime||match.startTime)||0;
  function dedupe(matches) {
    const seen=new Set();
    return (Array.isArray(matches)?matches:[]).filter(match=>{
      if(!match||!match.homeTeam||!match.awayTeam) return false;
      if([match.homeTeam,match.awayTeam].some(team=>/^(?:tbc|tbd|to be confirmed|unknown)$/i.test(String(team).trim()))) return false;
      const key=String(match.id||[match.homeTeam,match.awayTeam,match.startTime].join("|")).toLowerCase();
      if(seen.has(key)) return false;
      seen.add(key); return true;
    });
  }
  function countdown(value) {
    const target=validDate(value); if(target===null) return "Time TBA";
    const seconds=Math.max(0,Math.floor((target-Date.now())/1000)), days=Math.floor(seconds/86400);
    const hours=String(Math.floor(seconds%86400/3600)).padStart(2,"0"), minutes=String(Math.floor(seconds%3600/60)).padStart(2,"0"), secs=String(seconds%60).padStart(2,"0");
    return days?days+"d "+hours+":"+minutes+":"+secs:hours+":"+minutes+":"+secs;
  }
  function score(match) { return match.homeScore==null||match.awayScore==null ? "VS" : esc(match.homeScore)+" – "+esc(match.awayScore); }
  function pickFeatured(matches) {
    const clean=dedupe(matches);
    const live=clean.filter(m=>statusOf(m)==="live").sort((a,b)=>matchTime(a)-matchTime(b));
    if(live.length) return live[0];
    const upcoming=clean.filter(m=>statusOf(m)==="scheduled"&&validDate(m.startTime)!==null&&validDate(m.startTime)>=Date.now()).sort((a,b)=>validDate(a.startTime)-validDate(b.startTime));
    if(upcoming.length) return upcoming[0];
    return clean.filter(m=>statusOf(m)==="finished").sort((a,b)=>matchTime(b)-matchTime(a))[0]||null;
  }
  function featuredCard(id,label,icon,data) {
    const matches=dedupe(data?.sports?.[id]?.matches), match=pickFeatured(matches), target="/sports/"+id+"/";
    if(!match) return "<article class='featured-card'><div class='featured-top'><span class='sport-tag'><span class='sport-icon'>"+icon+"</span>"+label+"</span><span class='status-pill'>Feed check</span></div><div class='featured-empty'>No verified "+label.toLowerCase()+" fixture is available right now.</div><div class='featured-footer'><span class='featured-time'>Scores and fixtures update automatically</span><a class='view-matches' href='"+target+"'>View All Matches <span aria-hidden='true'>→</span></a></div></article>";
    const status=statusOf(match), live=status==="live", upcoming=status==="scheduled"&&validDate(match.startTime)!==null&&validDate(match.startTime)>=Date.now();
    const badge=live?"<span class='status-pill live'><i class='status-dot'></i>Live now</span>":"<span class='status-pill'>"+(upcoming?"Next match":"Latest result")+"</span>";
    const center=live||status==="finished"?"<div class='versus'><span class='versus-score'>"+score(match)+"</span></div>":"<div class='versus'><span class='versus-mark'>VS</span><span class='countdown' data-countdown='"+esc(match.startTime)+"'>"+countdown(match.startTime)+"</span></div>";
    const description=live?"In progress":status==="finished"?"Final score":upcoming?timeLabel(match.startTime):"Schedule to be announced";
    return "<article class='featured-card'><div class='featured-top'><span class='sport-tag'><span class='sport-icon'>"+icon+"</span>"+label+"</span>"+badge+"</div>"+
      "<div class='featured-comp'>"+esc(match.competition||match.matchType||match.format||"Match centre")+"</div>"+
      "<div class='featured-teams'><div class='featured-team'>"+logo(match,"home")+"<span class='team-name'>"+esc(match.homeTeam)+"</span></div>"+center+
      "<div class='featured-team'>"+logo(match,"away")+"<span class='team-name'>"+esc(match.awayTeam)+"</span></div></div>"+
      "<div class='featured-footer'><span class='featured-time'>"+description+"</span><a class='view-matches' href='"+target+"'>View All Matches <span aria-hidden='true'>→</span></a></div></article>";
  }
  function renderHome(data) {
    const grid=document.querySelector("#featuredMatches"); if(!grid) return;
    grid.innerHTML=featuredCard("football","Football","⚽",data)+featuredCard("cricket","Cricket","🏏",data);
    const updated=validDate(data.updatedAt), node=document.querySelector("#feedUpdated");
    if(node) node.textContent=updated?"Scores and fixtures checked "+timeLabel(data.updatedAt)+" (Bangladesh time)":"Scores and fixtures are temporarily unavailable.";
  }
  function inningsFor(match,side) {
    const team=String(match[side+"Team"]||"").trim().toLowerCase();
    return (Array.isArray(match.innings)?match.innings:[]).find(inn=>{
      const label=String(inn.team||"").trim().toLowerCase();
      return label===team || label.startsWith(team+" inning") || label.startsWith(team+" innings");
    })||null;
  }
  function inningsScore(inn) {
    return inn?.runs==null?null:String(inn.runs)+(inn.wickets==null?"":"/"+inn.wickets);
  }
  function cricketFigures(match) {
    const home=inningsFor(match,"home"),away=inningsFor(match,"away");
    const innings=Array.isArray(match.innings)?match.innings:[];
    // A malformed label sometimes combines both names. Never assign that
    // innings to either side merely because its text contains both names.
    const ambiguous=innings.some(i=>String(i.team||"").includes(","));
    const values=innings.map(i=>Number(i.runs)).filter(Number.isFinite);
    const winner=String(match.winner||"").trim().toLowerCase();
    const hName=String(match.homeTeam||"").toLowerCase(),aName=String(match.awayTeam||"").toLowerCase();
    const winnerKnown=winner===hName||winner===aName;
    // The provider's homeScore/awayScore can be reversed relative to innings.
    // Prefer unambiguous team-labelled innings. Otherwise do not guess.
    const h=inningsScore(home),a=inningsScore(away);
    const reliable=Boolean(home&&away&&!ambiguous&&winnerKnown);
    const homeRuns=home?.runs,awayRuns=away?.runs;
    const winningSide=winner===hName?"home":winner===aName?"away":null;
    let margin="";
    if(reliable&&homeRuns!==awayRuns) {
      const winning=winningSide==="home"?home:away;
      const losing=winningSide==="home"?away:home;
      if(Number(winning.runs)>Number(losing.runs)) {
        // A chasing team wins by remaining wickets only when innings order is known.
        const winIndex=innings.indexOf(winning),loseIndex=innings.indexOf(losing);
        if(winIndex>loseIndex && Number.isFinite(Number(winning.wickets)) && Number(winning.wickets)<=10) margin="won by "+(10-Number(winning.wickets))+" wickets";
        else if(winIndex<loseIndex) margin="won by "+(Number(winning.runs)-Number(losing.runs))+" runs";
      }
    }
    return {home,away,homeScore:h,awayScore:a,reliable,margin,winner:winningSide?match[winningSide+"Team"]:""};
  }
  function matchRow(match,sport,kind) {
    const status=statusOf(match),cricket=sport==="cricket",scheduled=kind==="schedule";
    const figures=cricket?cricketFigures(match):null;
    const hScore=cricket?figures.homeScore:match.homeScore,aScore=cricket?figures.awayScore:match.awayScore;
    const team=(side,scoreValue,inn)=>{
      const name=esc(match[side+"Team"]);
      const overs=cricket&&inn?.overs!=null?"<span class='score-overs'>"+esc(inn.overs)+" overs</span>":"";
      return "<div class='scorecard-team'>"+logo(match,side,true)+"<span class='scorecard-name'>"+name+"</span>"+(!scheduled&&scoreValue!=null?"<strong class='scorecard-figures'>"+esc(scoreValue)+"</strong>"+overs:"")+"</div>";
    };
    const meta=esc(match.competition||"Match")+(match.matchType||match.format?" · "+esc(match.matchType||match.format):"");
    const when=esc(timeLabel(match.finishedAt||match.endTime||match.startTime));
    const winner=String(match.winner||"").trim();
    const validWinner=[match.homeTeam,match.awayTeam].some(n=>String(n).toLowerCase()===winner.toLowerCase());
    const result=kind==="result"&&cricket&&figures.reliable&&figures.margin?"<div class='scorecard-result'>"+esc(figures.winner+" "+figures.margin)+"</div>":kind==="result"&&!cricket&&validWinner?"<div class='scorecard-result'>"+esc(winner)+" won</div>":"";
    const extra=cricket&&match.playerOfMatch?"<div class='scorecard-extra'>Player of the Match: "+esc(match.playerOfMatch)+"</div>":"";
    const scorers=!cricket&&Array.isArray(match.goalScorers)&&match.goalScorers.length?"<div class='scorecard-extra'>"+esc(match.goalScorers.join(" · "))+"</div>":"";
    return "<article class='match-row scorecard'><div class='scorecard-top'><span>"+meta+"</span><span class='scorecard-status"+(status==="live"?" is-live":"")+"'>"+(status==="live"?"● LIVE":scheduled?"Upcoming":"Completed")+"</span></div>"+
      "<div class='scorecard-board'>"+team("home",hScore,figures?.home)+"<div class='scorecard-vs'>"+(scheduled?"VS":cricket?"VS":score(match))+"</div>"+team("away",aScore,figures?.away)+"</div>"+
      result+extra+scorers+"<div class='scorecard-date'>"+when+"</div></article>";
  }
  let scheduleLimit=10;
  function renderDetail(data) {
    const sport=document.body.dataset.sportDetail; if(!sport) return;
    const current=data?.sports?.[sport]||{}, matches=dedupe(current.matches);
    const live=matches.filter(m=>statusOf(m)==="live").sort((a,b)=>matchTime(a)-matchTime(b));
    const results=matches.filter(m=>statusOf(m)==="finished").sort((a,b)=>matchTime(b)-matchTime(a)).slice(0,3);
    const schedule=matches.filter(m=>statusOf(m)==="scheduled"&&(validDate(m.startTime)===null||validDate(m.startTime)>=Date.now())).sort((a,b)=>(validDate(a.startTime)||Number.MAX_SAFE_INTEGER)-(validDate(b.startTime)||Number.MAX_SAFE_INTEGER));
    const updated=validDate(data.updatedAt), note=current.note||(current.coverage==="available"?"Scores and fixtures are supplied by the verified match feed.":"Match feed is temporarily unavailable.");
    document.querySelector("#feedStatus").textContent=note+(updated?" Last checked "+timeLabel(data.updatedAt)+" (Bangladesh time).":"");
    document.querySelector("#liveSection").hidden=!live.length;
    document.querySelector("#liveMatches").innerHTML=live.length?live.map(m=>matchRow(m,sport,"live")).join(""):"<div class='empty-state'>No live "+(sport==="football"?"football":"cricket")+" match is available in the verified feed right now.</div>";
    document.querySelector("#recentResults").closest(".match-section").hidden=!results.length;
    document.querySelector("#recentResults").innerHTML=results.length?results.map(m=>matchRow(m,sport,"result")).join(""):"<div class='empty-state'>No verified completed "+(sport==="football"?"football":"cricket")+" results are available in the current feed.</div>";
    const shown=schedule.slice(0,scheduleLimit), scheduleEl=document.querySelector("#scheduleMatches");
    scheduleEl.innerHTML=shown.length?shown.map(m=>matchRow(m,sport,"schedule")).join("")+(schedule.length>scheduleLimit?"<button class='load-more' type='button' id='loadMore'>Show more matches</button>":""):"<div class='empty-state'>No verified upcoming matches are listed right now.</div>";
    document.querySelector("#scheduleCount").textContent=schedule.length?schedule.length+" scheduled":"No upcoming fixtures";
    const button=document.querySelector("#loadMore");
    if(button) button.addEventListener("click",()=>{scheduleLimit+=10;renderDetail(data);});
  }
  function updateCountdowns(){document.querySelectorAll("[data-countdown]").forEach(node=>{node.textContent=countdown(node.dataset.countdown);});}
  let inFlight=false,cachedData=null;
  async function refresh(){
    if(inFlight||document.hidden)return; inFlight=true;
    try{
      const response=await fetch("/data/sports.json?ts="+Date.now(),{cache:"no-store"});
      if(!response.ok)throw new Error("HTTP "+response.status);
      const data=await response.json(); if(!data||typeof data!=="object")throw new Error("Invalid sports data");
      cachedData=data;renderHome(data);renderDetail(data);
    }catch(error){
      console.error("Sports data refresh failed",error);
      const updated=document.querySelector("#feedUpdated"),status=document.querySelector("#feedStatus");
      if(updated&&!cachedData)updated.textContent="Sports information is temporarily unavailable.";
      if(status&&!cachedData)status.textContent="Sports information is temporarily unavailable. Please try again later.";
    }finally{inFlight=false;}
  }
  refresh();updateCountdowns();window.setInterval(updateCountdowns,1000);window.setInterval(refresh,REFRESH_MS);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh();});
})();
