import {readFile,writeFile} from "node:fs/promises";
import {join} from "node:path";
const root=process.argv[2]||"qa-traces";
const rows=[],issues=[],parts=[];
for(let shard=0;shard<3;shard++){
 const fname="riddlex-owner-13-part-"+shard+".json";
 let data;
 try {data=JSON.parse(await readFile(join(root,fname),"utf8"))}
 catch(e) {issues.push("Unable to read "+fname+": "+e.message);continue}
 const vals=data.results||[];
 parts.push({shard,played:vals.length,correct:vals.filter(x=>x.status==="correct").length});
 if(vals.length!==(shard===0?5:4))issues.push("Shard "+shard+" has "+vals.length+" games (expected "+(shard===0?5:4)+")");
 for(const x of vals){
  if(!Number.isInteger(x.sequence)||x.sequence<1||x.sequence>13)
    issues.push("Invalid original list position: "+String(x.sequence)+" for "+x.name);
  rows.push({...x,shard});
 }
}
rows.sort((a,b)=>a.sequence-b.sequence);
for(let index=1;index<=13;index++){
 if(rows.filter(r=>r.sequence===index).length!==1)
   issues.push("Missing or repeated list position "+index);
}
const summary={
 codeRevision:process.env.GITHUB_SHA||"unavailable",
 description:"13 new owner targets in three independent LIVE walid-ai.com Chromium batches; exact source revision, no engine or menu edits",
 testedAt:new Date().toISOString(),expected:13,played:rows.length,
 correct:rows.filter(x=>x.status==="correct").length,
 defeats:rows.filter(x=>x.status==="defeat").length,
 wrongGuessEvents:rows.reduce((n,x)=>n+(x.wrongGuesses?.length||0),0),
 browserErrors:rows.filter(x=>x.status==="browser-error").length,
 questions:rows.reduce((n,x)=>n+(Number(x.questions)||0),0),
 unknowns:rows.reduce((n,x)=>n+(Number(x.unknowns)||0),0),
 shards:parts,
 failures:rows.filter(x=>x.status!=="correct").map(x=>({
   number:x.sequence,name:x.name,canonical:x.canonical,
   status:x.status,questions:x.questions,unknowns:x.unknowns,
   wrongGuesses:x.wrongGuesses||[],error:x.error||"",
   topCandidates:x.diagnostic?.best?.slice(0,5)||[],
 })),
 issues,results:rows,
};
const output=join(process.env.RUNNER_TEMP||root,"riddlex-owner-13-combined.json");
await writeFile(output,JSON.stringify(summary,null,2));
console.log("RIDDLEX_OWNER13_SUMMARY "+JSON.stringify({
 codeRevision:summary.codeRevision,expected:summary.expected,played:summary.played,
 correct:summary.correct,defeats:summary.defeats,
 wrongGuessEvents:summary.wrongGuessEvents,browserErrors:summary.browserErrors,
 questions:summary.questions,unknowns:summary.unknowns,
 failures:summary.failures,issues:summary.issues,
}));
console.log("RIDDLEX_OWNER13_FULL_TRANSCRIPT "+output);
if(summary.played!==13||issues.length||summary.browserErrors){
 console.error("RIDDLEX_OWNER13_AUDIT_INCOMPLETE");
 process.exitCode=1;
}else if(summary.correct!==13){
 console.error("RIDDLEX_OWNER13_GAMEPLAY_QUALITY_GATE_FAILED "+summary.correct+"/13 guesses. These are real misses, not browser errors.");
 process.exitCode=1;
}else console.log("RIDDLEX_OWNER13_ALL_CORRECT");
