(() => {
  "use strict";
  const REFRESH_MS = 5 * 60 * 1000;
  const LIVE_FRESH_MS = 70 * 60 * 1000; // The published feed normally refreshes every two hours.
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const validDate = (value) => { const text=String(value||""); if(!/(?:Z|[+-]\d{2}:\d{2})$/i.test(text)) return null; const time=Date.parse(text); return Number.isFinite(time)?time:null; };
  const timeLabel = (value) => validDate(value)!==null ? new Date(value).toLocaleString("en-GB",{timeZone:"Asia/Dhaka",dateStyle:"medium",timeStyle:"short"})+" BDT" : "Time to be announced";
  const countryCodes = {Germany:"DE",Spain:"ES",Italy:"IT",France:"FR",India:"IN",Pakistan:"PK",Bangladesh:"BD",Nepal:"NP",Australia:"AU",Canada:"CA",Japan:"JP",China:"CN",Namibia:"NA",Rwanda:"RW",Uganda:"UG","United States of America":"US","Sri Lanka":"LK",Ireland:"IE","Papua New Guinea":"PG",Netherlands:"NL",Thailand:"TH",Zimbabwe:"ZW",Afghanistan:"AF","South Africa":"ZA","New Zealand":"NZ","Falkland Islands":"FK","Costa Rica":"CR",};
  // A country's league does not make its clubs national teams.
  function nationalCountry(match,side) {
    const name=String(match[side+"Team"]||"").trim().toLowerCase();
    const suffixes=[""," women"," men"," a"," b"," xi"," national"," emerging"," seniors"," juniors"," legends"];
    const countries=Object.keys(countryCodes).sort((a,b)=>b.length-a.length);
    return countries.find(country=>{
      const prefix=country.toLowerCase();
      return suffixes.some(s=>name===prefix+s)||
        name.startsWith(prefix+" u")&&/^u[0-9]{2}$/.test(name.slice(prefix.length+1));
    })||"";
  }
  function flag(country) {
    const code=countryCodes[country]||"";
    return code?[...code].map(char=>String.fromCodePoint(127397+char.charCodeAt(0))).join(""):"";
  }
  function logo(match,side,compact=false) {
    const name=String(match[side+"Team"]||"Team"), country=nationalCountry(match,side);
    const candidate=!country?String(match[side+"Logo"]||""):"";
    const url=/^https:\/\/[^\s]+$/i.test(candidate)?candidate:"";
    const size=compact?"mini-mark":"team-mark";
    const initials=esc(name.split(/\s+/).map(p=>p[0]||"").slice(0,2).join("").toUpperCase());
    const fallback="<span class='logo-fallback' aria-hidden='true'>"+initials+"</span>";
    const content=country?"<span class='primary-flag' role='img' aria-label='"+esc(country)+" flag'>"+flag(country)+"</span>":url?"<img src='"+esc(url)+"' alt='"+esc(name)+" crest' loading='lazy' referrerpolicy='no-referrer' onerror='this.hidden=true;this.nextElementSibling.hidden=false'>"+ "<span class='logo-fallback' aria-hidden='true' hidden>"+initials+"</span>":fallback;
    return "<span class='"+size+(country?" flag-only":"")+"'>"+content+"</span>";
  }
  function statusOf(match) {
    const status=String(match.status||"").toLowerCase().replace(/[- ]+/g,"_");
    if(["live","in_progress","innings","in_play","1st_innings","2nd_innings"].includes(status)) return "live";
    if(["finished","final","completed","result"].includes(status)) return "finished";
    if(["scheduled","upcoming","not_started","fixture","ns"].includes(status)) return "scheduled";
    if(["postponed","cancelled","canceled","abandoned","suspended"].includes(status)) return status;
    return "unavailable"; // Unknown/stale is never implicitly a scheduled match.
  }
  function verifiedStatus(match,data,sport) {
    const status=statusOf(match),start=validDate(match.startTime);
    if(status==="scheduled"&&start!==null&&start<Date.now()) return "unavailable";
    if(status!=="live") return status;
    const updated=validDate(data?.updatedAt);
    const age=updated===null?Infinity:Date.now()-updated;
    const maxDuration=sport==="cricket"?5*86400000:6*3600000;
    if(data?.sports?.[sport]?.coverage!=="available"||age<0||age>LIVE_FRESH_MS||
       start===null||start>Date.now()||Date.now()-start>maxDuration) return "unavailable";
    return "live";
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
    if(target<=Date.now()) return "Awaiting match update";
    const seconds=Math.max(0,Math.floor((target-Date.now())/1000)), days=Math.floor(seconds/86400);
    const hours=String(Math.floor(seconds%86400/3600)).padStart(2,"0"), minutes=String(Math.floor(seconds%3600/60)).padStart(2,"0"), secs=String(seconds%60).padStart(2,"0");
    return days?days+"d "+hours+":"+minutes+":"+secs:hours+":"+minutes+":"+secs;
  }
  function footballScoreValid(match) {
    return [match.homeScore,match.awayScore].every(value=>
      value!==null&&value!==""&&Number.isInteger(Number(value))&&Number(value)>=0);
  }
  function score(match) { return footballScoreValid(match)?esc(match.homeScore)+" – "+esc(match.awayScore):"VS"; }
  function pickFeatured(matches,data,sport) {
    const clean=dedupe(matches);
    const live=clean.filter(m=>verifiedStatus(m,data,sport)==="live").sort((a,b)=>matchTime(a)-matchTime(b));
    if(live.length) return live[0];
    const upcoming=clean.filter(m=>verifiedStatus(m,data,sport)==="scheduled"&&validDate(m.startTime)!==null&&validDate(m.startTime)>=Date.now()).sort((a,b)=>validDate(a.startTime)-validDate(b.startTime));
    if(upcoming.length) return upcoming[0];
    return clean.filter(m=>verifiedStatus(m,data,sport)==="finished"&&(sport!=="football"||footballScoreValid(m))).sort((a,b)=>matchTime(b)-matchTime(a))[0]||null;
  }
  function featuredCard(id,label,icon,data) {
    const matches=dedupe(data?.sports?.[id]?.matches), match=pickFeatured(matches,data,id), target="/sports/"+id+"/";
    if(!match) return "<article class='featured-card'><div class='featured-top'><span class='sport-tag'><span class='sport-icon'>"+icon+"</span>"+label+"</span><span class='status-pill'>Feed check</span></div><div class='featured-empty'>No verified "+label.toLowerCase()+" fixture is available right now.</div><div class='featured-footer'><span class='featured-time'>Scores and fixtures update automatically</span><a class='view-matches' href='"+target+"'>View All Matches <span aria-hidden='true'>→</span></a></div></article>";
    const status=verifiedStatus(match,data,id), live=status==="live", upcoming=status==="scheduled"&&validDate(match.startTime)!==null&&validDate(match.startTime)>=Date.now();
    const badge=live?"<span class='status-pill live'><i class='status-dot'></i>Live now</span>":"<span class='status-pill'>"+(upcoming?"Next match":"Latest result")+"</span>";
    const center=live||status==="finished"?"<div class='versus'><span class='versus-score'>"+(id==="cricket"?"VS":score(match))+"</span></div>":"<div class='versus'><span class='versus-mark'>VS</span><span class='countdown' data-countdown='"+esc(match.startTime)+"'>"+countdown(match.startTime)+"</span></div>";
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
    const updated=validDate(data?.updatedAt), node=document.querySelector("#feedUpdated");
    if(node) node.textContent=data?.fetchFailed?"Refresh failed. Displaying the last verified snapshot where available.":updated?"Last feed check: "+timeLabel(data.updatedAt)+(Date.now()-updated>LIVE_FRESH_MS?" · Live updates may be delayed.":""):"Scores and fixtures are temporarily unavailable.";
  }
  function inningsFor(match,side) {
    const team=String(match[side+"Team"]||"").trim().toLowerCase();
    return (Array.isArray(match.innings)?match.innings:[]).filter(inn=>{
      const label=String(inn.team||"").trim().toLowerCase();
      if(label===team) return true;
      if(!team||!label.startsWith(team+" ")) return false;
      // Reject combined/ambiguous cricket labels such as "Team A,Team B Inning 1".
      return /^(?:(?:\d+)(?:st|nd|rd|th)\s+)?innings?(?:\s+\d+)?$/.test(label.slice(team.length+1));
    });
  }
  function inningsScore(inn) {
    if(inn?.runs==null||!Number.isInteger(Number(inn.runs))||Number(inn.runs)<0) return null;
    const wickets=inn.wickets;
    return String(inn.runs)+(wickets==null||!Number.isInteger(Number(wickets))||Number(wickets)<0||Number(wickets)>10?"":"/"+wickets);
  }
  function cricketFigures(match) {
    const homeInnings=inningsFor(match,"home"),awayInnings=inningsFor(match,"away");
    const home=homeInnings.length===1?homeInnings[0]:null;
    const away=awayInnings.length===1?awayInnings[0]:null;
    const winner=String(match.winner||"").trim();
    const winnerName=[match.homeTeam,match.awayTeam].find(n=>String(n).toLowerCase()===winner.toLowerCase())||"";
    const providerText=String(match.resultText||"").trim();
    const resultText=winnerName&&providerText.toLowerCase().startsWith(winnerName.toLowerCase()+" won by ")?providerText:"";
    return {home,away,homeScore:inningsScore(home),awayScore:inningsScore(away),winner:winnerName,resultText};
  }
  function matchRow(match,sport,kind,data) {
    const status=verifiedStatus(match,data,sport),cricket=sport==="cricket",scheduled=kind==="schedule";
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
    const result=kind==="result"&&cricket&&figures.winner?"<div class='scorecard-result'>"+esc(figures.resultText||figures.winner+" won")+"</div>":kind==="result"&&!cricket&&validWinner?"<div class='scorecard-result'>"+esc(winner==="Draw"?"Draw":winner+" won")+"</div>":"";
    const missingCricket=cricket&&kind!=="schedule"&&(figures.homeScore===null||figures.awayScore===null)?"<div class='scorecard-extra'>Full team-attributed innings scores are not available from this feed.</div>":"";
    const extra=cricket&&match.playerOfMatch?"<div class='scorecard-extra'>Player of the Match: "+esc(match.playerOfMatch)+"</div>":"";
    const scorers=!cricket&&Array.isArray(match.goalScorers)&&match.goalScorers.length?"<div class='scorecard-extra'>"+esc(match.goalScorers.join(" · "))+"</div>":"";
    return "<article class='match-row scorecard'><div class='scorecard-top'><span>"+meta+"</span><span class='scorecard-status"+(status==="live"?" is-live":"")+"'>"+(status==="live"?"● LIVE":scheduled?"Upcoming":"Completed")+"</span></div>"+
      "<div class='scorecard-board'>"+team("home",hScore,figures?.home)+"<div class='scorecard-vs'>"+(scheduled?"VS":cricket?"VS":score(match))+"</div>"+team("away",aScore,figures?.away)+"</div>"+
      result+missingCricket+extra+scorers+"<div class='scorecard-date'>"+when+"</div></article>";
  }
  let scheduleLimit=10;
  function renderDetail(data) {
    const sport=document.body.dataset.sportDetail; if(!sport) return;
    const current=data?.sports?.[sport]||{}, matches=dedupe(current.matches);
    const live=matches.filter(m=>verifiedStatus(m,data,sport)==="live").sort((a,b)=>matchTime(a)-matchTime(b));
    const results=matches.filter(m=>verifiedStatus(m,data,sport)==="finished"&&(sport!=="football"||footballScoreValid(m))).sort((a,b)=>matchTime(b)-matchTime(a)).slice(0,3);
    const schedule=matches.filter(m=>verifiedStatus(m,data,sport)==="scheduled"&&(validDate(m.startTime)===null||validDate(m.startTime)>=Date.now())).sort((a,b)=>(validDate(a.startTime)||Number.MAX_SAFE_INTEGER)-(validDate(b.startTime)||Number.MAX_SAFE_INTEGER));
    const updated=validDate(data?.updatedAt), note=data?.fetchFailed?"Refresh failed; displaying the last verified snapshot where available.":current.note||(current.coverage==="available"?"Scores and fixtures are supplied by the verified match feed.":"Match feed is temporarily unavailable.");
    document.querySelector("#feedStatus").textContent=note+(updated?" Last checked "+timeLabel(data.updatedAt)+(Date.now()-updated>LIVE_FRESH_MS?" Live status is paused until the feed refreshes.":"")+".":"");
    document.querySelector("#liveSection").hidden=false;
    document.querySelector("#liveMatches").innerHTML=live.length?live.map(m=>matchRow(m,sport,"live",data)).join(""):"<div class='empty-state'>No live "+(sport==="football"?"football":"cricket")+" match is available in the verified feed right now.</div>";
    document.querySelector("#recentResults").closest(".match-section").hidden=false;
    document.querySelector("#recentResults").innerHTML=results.length?results.map(m=>matchRow(m,sport,"result",data)).join(""):"<div class='empty-state'>No verified completed "+(sport==="football"?"football":"cricket")+" results are available in the current feed.</div>";
    const shown=schedule.slice(0,scheduleLimit), scheduleEl=document.querySelector("#scheduleMatches");
    scheduleEl.innerHTML=shown.length?shown.map(m=>matchRow(m,sport,"schedule",data)).join("")+(schedule.length>scheduleLimit?"<button class='load-more' type='button' id='loadMore'>Show more matches</button>":""):"<div class='empty-state'>No verified upcoming matches are listed right now.</div>";
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
      const fallback=cachedData?{...cachedData,fetchFailed:true}:{sports:{},fetchFailed:true};
      if(cachedData||!document.querySelector("[data-static-ready]")){
        renderHome(fallback);renderDetail(fallback);
      }else{
        const info=document.querySelector("#feedUpdated")||document.querySelector("#feedStatus");
        if(info) info.textContent="Live refresh failed. Showing the last verified match snapshot; live status is unavailable.";
      }
      if(updated&&!cachedData)updated.textContent="Sports information is temporarily unavailable. Please try again later.";
      if(status&&!cachedData)status.textContent="Sports information is temporarily unavailable. Please try again later.";
    }finally{inFlight=false;}
  }
  refresh();updateCountdowns();window.setInterval(updateCountdowns,1000);window.setInterval(refresh,REFRESH_MS);
  window.setInterval(()=>{if(cachedData&&!document.hidden){renderHome(cachedData);renderDetail(cachedData);}},60000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh();});
})();

/* Anonymous aggregate page-view and active-time counters; never inspect reading content. */
(() => {
  if (document.querySelector('script[src^="/usage.js"]') || document.getElementById('walid-section-usage')) return;
  const script = document.createElement('script');
  script.id = 'walid-section-usage';
  script.src = '/usage.js?v=20261122-section-analytics';
  script.async = true;
  document.head.append(script);
})();
