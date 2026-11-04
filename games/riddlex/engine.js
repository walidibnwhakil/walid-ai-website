// Riddlex offline engine: score known facts; unanswered and unknown facts stay neutral.
export const ANSWERS=Object.freeze(["yes","no","probably","probably-not","unknown"]);
export function scoreCandidates(entries,answers,rejected=new Set()){
 return entries.filter(e=>!rejected.has(e.id)).map(entry=>{
  let score=0,conflicts=0,matches=0;
  for(const {key,value} of answers){
   if(value==="unknown"||!Object.prototype.hasOwnProperty.call(entry.facts,key))continue;
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
  let best=null,bestScore=-Infinity;
  for(const key of Object.keys(questions)){
   if(asked.has(key))continue;
   let yes=0,no=0,unknown=0;
   for(const {entry} of pool){
    const v=entry.facts[key];
    if(v===true)yes++;else if(v===false)no++;else unknown++;
   }
   if(yes+no===0)continue;
   const quality=Math.min(yes,no)*4+(yes+no)*0.2-unknown*0.5;
   if(quality>bestScore){bestScore=quality;best=key;}
  }
  return best;
 }
 // Prioritize plausible candidates for speed, but never abandon sparse entries.
 return choose(ranked.slice(0,20)) ?? choose(ranked);
}
export function selectGuess(ranked,answers,questions){
 if(!ranked.length)return null;
 const [top,second]=ranked;
 if(top.matches<=0||top.conflicts>0)return null;
 if(!second)return top.entry;
 // Strong evidence is needed before naming a person or object.
 if(top.matches>=2&&top.score-second.score>=2)return top.entry;
 if(!nextQuestion(ranked,answers,questions)&&top.matches>0)return top.entry;
 return null;
}
