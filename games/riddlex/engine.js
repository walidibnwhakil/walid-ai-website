// Riddlex recovery engine. No private data, paid API or hidden-answer access.
export const ANSWERS = Object.freeze(["yes","no","probably","probably-not","unknown"]);
export function scoreCandidates(entries, answers, rejected=new Set()){
  return entries.filter(e=>!rejected.has(e.id)).map(e=>{
    let score=0, conflicts=0;
    for(const a of answers){
      const fact=e.facts[a.key];
      if(fact===undefined||a.value==="unknown")continue;
      const expected=(a.value==="yes"||a.value==="probably");
      const strength=(a.value==="probably"||a.value==="probably-not")?0.45:1;
      if(fact===expected)score+=strength;else {score-=2.5*strength;conflicts+=strength;}
    }
    return {entry:e,score,conflicts};
  }).sort((a,b)=>b.score-a.score||a.conflicts-b.conflicts||a.entry.name.localeCompare(b.entry.name));
}
export function nextQuestion(ranked,answers,questions){
  const asked=new Set(answers.map(a=>a.key));let best=null,bestScore=-Infinity;
  const top=ranked.slice(0,Math.min(12,ranked.length));
  for(const key of Object.keys(questions)){
    if(asked.has(key))continue;
    let yes=0,no=0,unknown=0;
    for(const {entry} of top){if(entry.facts[key]===true)yes++;else if(entry.facts[key]===false)no++;else unknown++;}
    if(yes+no===0)continue;
    // Prefer splits of likely candidates; avoid questions unknown for almost everyone.
    const split=Math.min(yes,no)*3+(yes+no)/Math.max(1,top.length)-unknown*0.05;
    if(split>bestScore){best=key;bestScore=split;}
  }
  return best;
}
export function selectGuess(ranked,answers,questions){
  if(!ranked.length)return null;
  const top=ranked[0],runner=ranked[1];
  if(!runner)return top.entry;
  if(answers.length<2)return null;
  if(top.score-runner.score>=1.5&&top.conflicts===0)return top.entry;
  if(!nextQuestion(ranked,answers,questions))return top.entry; // explicitly tentative
  return null;
}
