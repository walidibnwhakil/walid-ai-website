// Run after three independent real-Chromium browser-play batches using the
// SAME checked-out GitHub revision. No game source files are modified.
// Count sessions, not unique names: repeated names are deliberate regression
// replays of different owner lists.
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const folder=process.argv[2] || "./qa-traces";
const inputs=[
  {batch:"new-20",file:"riddlex-user-20.json",expected:20},
  {batch:"prior-16",file:"riddlex-user-16.json",expected:16},
  {batch:"original-25",file:"riddlex-owner-25.json",expected:25},
];
const batches=[];
const all=[];
const problems=[];
for(const {batch,file,expected} of inputs){
  let parsed;
  try{parsed=JSON.parse(await readFile(join(folder,file),"utf8"))}
  catch(error){problems.push(batch+": cannot read "+file+" ("+error.message+")");continue}
  const rows=parsed.results;
  if(!Array.isArray(rows)){problems.push(batch+": results array missing");continue}
  if(rows.length!==expected)
    problems.push(batch+": expected "+expected+" games, got "+rows.length);
  const correct=rows.filter(r=>r.status==="correct").length;
  const defeats=rows.filter(r=>r.status==="defeat").length;
  const wrong=rows.reduce((n,r)=>n+(r.wrongGuesses?.length||0),0);
  const browserErrors=rows.filter(r=>!!r.error).length;
  const questions=rows.reduce((n,r)=>n+(Number(r.questions)||0),0);
  const unknowns=rows.reduce((n,r)=>n+(Number(r.unknowns)||0),0);
  const missed=rows.filter(r=>r.status!=="correct");
  batches.push({batch,expected,played:rows.length,correct,defeats,wrong,
    browserErrors,questions,unknowns,missed:missed.map(r=>({
      name:r.name,status:r.status,questions:r.questions,unknowns:r.unknowns,
      wrongGuesses:r.wrongGuesses||[],error:r.error||""
    }))});
  all.push(...rows.map((r,i)=>({...r,batch,session:i+1})));
  if(browserErrors)problems.push(batch+": "+browserErrors+" browser errors");
  if(batch!=="original-25" && missed.length)
    problems.push(batch+": "+missed.map(r=>r.name).join(", ")+" not correct");
  if(batch==="original-25"){
    const unexpected=missed.filter(r=>r.name!=="Minami Ozawa");
    if(unexpected.length)problems.push("original-25: unexpected failures: "+
      unexpected.map(r=>r.name).join(", "));
  }
}
const report={
  codeRevision:process.env.GITHUB_SHA||"unknown",
  checkedAt:new Date().toISOString(),
  scope:"61 actual Chromium browser game sessions across 20+16+25 owner lists, run on one exact code revision",
  expectedTotal:61,
  played:all.length,
  correct:all.filter(r=>r.status==="correct").length,
  defeats:all.filter(r=>r.status==="defeat").length,
  wrongGuesses:all.reduce((n,r)=>n+(r.wrongGuesses?.length||0),0),
  browserErrors:all.filter(r=>!!r.error).length,
  totalQuestions:all.reduce((n,r)=>n+(Number(r.questions)||0),0),
  totalUnknowns:all.reduce((n,r)=>n+(Number(r.unknowns)||0),0),
  batches,
  problems,
  results:all,
};
if(report.played!==61)problems.push("Total: expected 61 full games, got "+report.played);
if(report.correct<60)problems.push("Fewer than 60/61 sessions correctly guessed");
if(report.wrongGuesses)problems.push("There were "+report.wrongGuesses+" wrong-name guesses");
if(report.browserErrors)problems.push("There were "+report.browserErrors+" browser errors");
const dest=join(process.env.RUNNER_TEMP||folder,"riddlex-61-combined.json");
await writeFile(dest,JSON.stringify(report,null,2));
console.log("RIDDLEX_61_SUMMARY "+JSON.stringify({
  codeRevision:report.codeRevision,played:report.played,correct:report.correct,
  defeats:report.defeats,wrongGuesses:report.wrongGuesses,
  browserErrors:report.browserErrors,totalQuestions:report.totalQuestions,
  totalUnknowns:report.totalUnknowns,
  batches:report.batches.map(({batch,played,correct,defeats,wrong,
    browserErrors,questions,unknowns,missed})=>({
      batch,played,correct,defeats,wrong,browserErrors,questions,unknowns,
      missed:missed.map(r=>({name:r.name,status:r.status,questions:r.questions}))
    })),
  problems
}));
console.log("RIDDLEX_61_ARTIFACT "+dest);
if(problems.length){
  console.error("RIDDLEX_61_REGRESSION_FAILED "+JSON.stringify(problems));
  process.exitCode=1;
}else console.log("RIDDLEX_61_ALL_VERIFIED_GUESSES_PRESERVED");
