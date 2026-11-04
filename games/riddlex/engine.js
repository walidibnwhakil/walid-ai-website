// Riddlex offline engine: score known facts; unanswered and unknown facts stay neutral.
export const ANSWERS=Object.freeze(["yes","no","probably","probably-not","unknown"]);
export function scoreCandidates(entries,answers,rejected=new Set()){
 // Unknown answers contribute no evidence. Remove them once, rather than
 // visiting a growing history of unknowns for every candidate at every turn.
 const knownAnswers=answers.filter(a=>a.value!=="unknown");
 return entries.filter(e=>!rejected.has(e.id)).map(entry=>{
  let score=0,conflicts=0,matches=0;
  for(const {key,value} of knownAnswers){
   if(!Object.prototype.hasOwnProperty.call(entry.facts,key))continue;
   const expected=value==="yes"||value==="probably";
   const weight=value==="probably"||value==="probably-not"?0.4:1;
   if(entry.facts[key]===expected){score+=weight;matches+=weight;}
   else{score-=2*weight;conflicts+=weight;}
  }
  return {entry,score,conflicts,matches};
 }).sort((a,b)=>b.score-a.score||a.conflicts-b.conflicts||b.matches-a.matches||a.entry.name.localeCompare(b.entry.name));
}
export function nextQuestion(ranked,answers,questions){
 const asked=new Set(answers.map(a=>a.key));
 function choose(pool){
  // Count only facts actually present. Scanning every question for every candidate
  // becomes expensive as reviewed batches add hundreds of sparse questions.
  const counts=new Map();
  for(const {entry} of pool)for(const [key,value] of Object.entries(entry.facts)){
   if(asked.has(key)||!Object.hasOwn(questions,key))continue;
   const count=counts.get(key)??[0,0];
   if(value===true)count[0]++;else if(value===false)count[1]++;
   counts.set(key,count);
  }
  let best=null,bestScore=-Infinity;
  for(const key of Object.keys(questions)){
   const [yes,no]=counts.get(key)??[0,0];
   const unknown=pool.length-yes-no;
   if(yes+no===0)continue;
   const quality=Math.min(yes,no)*4+(yes+no)*0.2-unknown*0.5;
   if(quality>bestScore){bestScore=quality;best=key;}
  }
  return best;
 }
 // Prioritize plausible candidates for speed, but never abandon sparse entries.
 // A contradicted candidate cannot pass selectGuess's existing confidence gate.
 // Do not exhaust its unrelated facts while consistent candidates still exist.
 // Keep every candidate in ranking so changing an answer can restore it.
 const consistent=ranked.filter(row=>row.conflicts===0);
 const pool=consistent.length?consistent:ranked;
 // Once the evidence leaders have no unasked facts, let the existing
 // tentative-guess/retry flow proceed. Lower-ranked unknown candidates stay
 // available after rejection; unrelated lower-score facts cannot settle a tie.
 const leaders=pool[0]?.matches>0?pool.filter(row=>row.score===pool[0].score):pool;
 return choose(leaders.slice(0,20)) ?? choose(leaders);
}
export function selectGuess(ranked,answers,questions){
 if(!ranked.length)return null;
 const [top,second]=ranked;
 if(top.matches<=0||top.conflicts>0)return null;
 if(!second)return top.entry;
 // A reviewed distinguishing clue plus supporting facts can break a one-point
 // lead. Missing clues on other candidates remain unknown in scoring.
 if(top.matches>=2&&top.score>second.score&&top.entry.diagnostic&&
    answers.some(a=>a.key===top.entry.diagnostic&&a.value==='yes'))return top.entry;
 // Strong evidence is needed before naming a person or object.
 if(top.matches>=2&&top.score-second.score>=2)return top.entry;
 // After several answers, try a plausible guess instead of asking dozens of low-value questions.
 // A wrong guess is rejected by Retry and will never be repeated in this game.
 if(answers.length>=8&&top.matches>=2&&top.score>=second.score+1)return top.entry;
 if(!nextQuestion(ranked,answers,questions)&&(top.matches>=2||
    (top.entry.category==='relationships'&&top.matches>0)))return top.entry;
 return null;
}

