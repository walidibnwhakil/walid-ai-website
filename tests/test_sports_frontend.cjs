const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const source=fs.readFileSync(path.join(__dirname,"../sports/sports.js"),"utf8");
assert(source.trimEnd().endsWith("})();"),"sports IIFE shape changed");
const exposed=source.replace(/\}\)\(\);\s*$/, "globalThis.__sportsTest={statusOf,verifiedStatus,cricketFigures,footballScoreValid,timeLabel,pickFeatured,matchRow,flag};})();");
const context={
  Date,console,
  document:{hidden:false,body:{dataset:{}},querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}},
  window:{setInterval(){}},
  fetch:async()=>({ok:true,json:async()=>({sports:{}})})
};
vm.runInNewContext(exposed,context,{filename:"sports.js"});
const t=context.__sportsTest;
assert(t,"sports functions exposed in test sandbox");
const now=Date.now();
const iso=(n)=>new Date(n).toISOString();
const fixture={id:"verified",status:"live",homeTeam:"Bangladesh",awayTeam:"India",startTime:iso(now-600000)};
const fresh={updatedAt:iso(now-60000),sports:{cricket:{coverage:"available"},football:{coverage:"available"}}};
const old={updatedAt:iso(now-3*3600000),sports:fresh.sports};
assert.equal(t.verifiedStatus(fixture,fresh,"cricket"),"live");
assert.equal(t.verifiedStatus(fixture,old,"cricket"),"unavailable","stale feeds cannot advertise live");
assert.equal(t.verifiedStatus(fixture,{...fresh,sports:{cricket:{coverage:"stale"}}},"cricket"),"unavailable");
assert.equal(t.verifiedStatus({...fixture,status:"scheduled"} ,fresh,"cricket"),"unavailable","past kickoff is not a future fixture");
assert.equal(t.statusOf({status:"stale"}),"unavailable");
assert.equal(t.statusOf({status:"abandoned"}),"abandoned");
assert.equal(t.statusOf({status:"unrecognized"}),"unavailable");
assert.equal(t.timeLabel("2026-11-21T14:30:00Z").includes("20:30"),true,"UTC must be shown as Bangladesh time");
assert.equal(t.timeLabel("2026-11-21T14:30:00").includes("Time to be announced"),true,"ambiguous local timestamps must be rejected");
assert.equal(t.flag("West Indies"),"","do not substitute Jamaica's flag for West Indies");
assert.equal(t.flag("Scotland"),"","do not substitute the UK flag for Scotland");
assert.equal(t.footballScoreValid({homeScore:0,awayScore:0}),true);
assert.equal(t.footballScoreValid({homeScore:1,awayScore:null}),false);
const cr={
  homeTeam:"Pakistan Women",awayTeam:"Ireland Women",status:"finished",
  startTime:"2026-11-20T09:15:00Z",winner:"Ireland Women",
  innings:[{team:"pakistan women Inning 1",runs:107,wickets:10,overs:18.4},
           {team:"Pakistan Women,Ireland Women Inning 1",runs:111,wickets:1,overs:13.2}]
};
const figures=t.cricketFigures(cr);
assert.equal(figures.homeScore,"107/10");
assert.equal(figures.awayScore,null,"provider combined team labels must not be assigned to away team");
assert.equal(figures.winner,"Ireland Women");
const html=t.matchRow(cr,"cricket","result",fresh);
assert(html.includes("107/10"));
assert(!html.includes("111/1"));
assert(html.includes("Ireland Women won"));
assert(html.includes("Full team-attributed innings scores"));
const noFuture=t.pickFeatured([{...fixture,status:"scheduled",startTime:iso(now-180000)}],fresh,"football");
assert.equal(noFuture,null);
console.log("Sports frontend regression tests passed: freshness, classification, BDT, flags, scoring and fallback.");
