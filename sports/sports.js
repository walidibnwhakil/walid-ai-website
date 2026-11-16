(() => {
  "use strict";
  const REFRESH_MS = 5 * 60 * 1000;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const validDate = (value) => { const time = value ? Date.parse(value) : NaN; return Number.isFinite(time) ? time : null; };
  const timeLabel = (value) => value ? new Date(value).toLocaleString("en-GB",{timeZone:"Asia/Dhaka",dateStyle:"medium",timeStyle:"short"}) : "Time to be announced";
  const countryCodes = {Germany:"DE",England:"GB",Spain:"ES",Italy:"IT",France:"FR",India:"IN",Pakistan:"PK",Bangladesh:"BD",Nepal:"NP",Australia:"AU",Canada:"CA",Japan:"JP",China:"CN",Namibia:"NA",Rwanda:"RW",Uganda:"UG","United States of America":"US","Sri Lanka":"LK",Ireland:"IE","Papua New Guinea":"PG",Scotland:"GB",Netherlands:"NL",Thailand:"TH",Zimbabwe:"ZW",Afghanistan:"AF","South Africa":"ZA","New Zealand":"NZ","Falkland Islands":"FK","Costa Rica":"CR","West Indies":"JM"};
  function inferredCountry(match, side) {
    if (match[side+"Country"]) return match[side+"Country"];
    const text = [match.competition,match.homeTeam,match.awayTeam].join(" ").toLowerCase();
    const clues = [["nepal","Nepal"],["bangladesh","Bangladesh"],["india","India"],["pakistan","Pakistan"],["australia","Australia"],["south africa","South Africa"],["sri lanka","Sri Lanka"],["england","England"],["new zealand","New Zealand"],["afghanistan","Afghanistan"],["zimbabwe","Zimbabwe"],["west indies","West Indies"],["falkland","Falkland Islands"]];
    return (clues.find(([needle])=>text.includes(needle))||[null,""])[1];
  }
  function flag(country) {
    const code=countryCodes[country]||"";
    return code ? [...code].map(char=>String.fromCodePoint(127397+char.charCodeAt(0))).join("") : "";
  }
  function logo(match, side, compact=false) {
    const url=match[side+"Logo"], country=inferredCountry(match,side), emoji=flag(country);
    const name=String(match[side+"Team"]||"Team");
    const alt=esc(name), size=compact?"mini-mark":"team-mark";
    const fallback=esc(name.split(/\s+/).map(part=>part[0]||"").slice(0,2).join("").toUpperCase());
    const image=url ? "<img src='"+esc(url)+"' alt='"+alt+" logo' loading='lazy' referrerpolicy='no-referrer' onerror='this.remove()'>" : "<span aria-hidden='true'>"+fallback+"</span>";
    return "<span class='"+size+"'>"+image+(emoji?"<span class='country-flag' aria-label='"+esc(country)+"' title='"+esc(country)+"'>"+emoji+"</span>":"")+"</span>";
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
  function inningsHtml(match) {
    if(!Array.isArray(match.innings)||!match.innings.length) return "";
    const rows=match.innings.map(inn=>{
      const figures=[inn.runs,inn.wickets==null?null:inn.wickets].filter(v=>v!=null).join("/");
      return figures?"<div class='innings-line'><span>"+esc(inn.team||"Innings")+"</span><strong>"+esc(figures)+(inn.overs==null?"":" · "+esc(inn.overs)+" ov")+"</strong></div>":"";
    }).filter(Boolean).join("");
    return rows?"<div class='innings'>"+rows+"</div>":"";
  }
  function matchRow(match,sport,kind) {
    const status=statusOf(match), middle=status==="live"?"<span class='live-label'>● LIVE</span> "+score(match):score(match);
    const secondary=kind==="schedule"?(validDate(match.startTime)?timeLabel(match.startTime):"Time TBA"):esc(match.matchType||match.format||(sport==="cricket"?"Cricket score":"Full-time"));
    const date=timeLabel(match.finishedAt||match.endTime||match.startTime), winner=match.winner?" · "+esc(match.winner)+" won":"";
    return "<article class='match-row'><div class='match-row-team'>"+logo(match,"home",true)+"<span class='match-row-name'>"+esc(match.homeTeam)+"</span></div>"+
      "<div class='match-row-center'><div class='match-score'>"+middle+"</div><div class='match-meta'>"+secondary+"</div></div>"+
      "<div class='match-row-team away'><span class='match-row-name'>"+esc(match.awayTeam)+"</span>"+logo(match,"away",true)+"</div>"+inningsHtml(match)+
      "<div class='match-info'><span>"+esc(match.competition||"Competition")+"</span><span>·</span><span>"+esc(date)+"</span>"+winner+"</div></article>";
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
    document.querySelector("#liveSection").hidden=false;
    document.querySelector("#liveMatches").innerHTML=live.length?live.map(m=>matchRow(m,sport,"live")).join(""):"<div class='empty-state'>No live "+(sport==="football"?"football":"cricket")+" match is available in the verified feed right now.</div>";
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
