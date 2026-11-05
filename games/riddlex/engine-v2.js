// Open-world likelihood updates: an unrecorded fact and Don't Know add zero evidence.
// Probabilities are model scores, not empirically calibrated human confidence.
export const ANSWERS=Object.freeze(['yes','no','probably','probably-not','unknown']);
export const canonicalQuestionKey=key=>key.replace(/^wd_(occupation|birthplace|award|work|sport)_/,'v2_$1_');
export function factValue(entry,key){
 if(Object.hasOwn(entry.facts,key))return entry.facts[key];
 const current=canonicalQuestionKey(key),old=key.replace(/^v2_(occupation|birthplace|award|work|sport)_/,'wd_$1_');
 if(current!==key&&Object.hasOwn(entry.facts,current))return entry.facts[current];
 if(old!==key&&Object.hasOwn(entry.facts,old))return entry.facts[old];
 return undefined;
}
export function evidenceGroup(key){
 if(key.startsWith('born_before_')||key==='birth_first_half'||key.startsWith('cue_wd_'))return 'birth';
 if(key==='real'||key==='fictional')return 'existence';
 if(['male','female','boy','girl'].includes(key))return 'gender';
 if(['actor','poet','writer','filmmaker','singer','cricket','scientist','physicist','economist','composer','educator','military','politician','psychologist'].includes(key))return 'occupation';
 if(['indian','bangladeshi'].includes(key))return 'citizenship';
 if(key.startsWith('v2_'))return key.split('_')[1];
 if(key.startsWith('wd_'))return key.split('_')[1];
 return key;
}
export function scoreCandidates(entries,answers,rejected=new Set()){
 // Normalize each answer once per turn, rather than once per candidate.
 const known=answers.filter(a=>a.value!=='unknown'&&ANSWERS.includes(a.value)).map(({key,value})=>{
  const canonical=canonicalQuestionKey(key),other=canonical!==key?canonical:key.replace(/^v2_(occupation|birthplace|award|work|sport)_/,'wd_$1_');
  return {key,other,expected:value==='yes'||value==='probably',weight:value==='probably'||value==='probably-not'?Math.log(.7/.3):Math.log(.9/.1),group:evidenceGroup(key)};
 });
 const ranked=[];
 for(const entry of entries){
  if(rejected.has(entry.id))continue;
  const groups=new Map();let matches=0,conflicts=0;
  for(const {key,other,expected,weight,group} of known){
   const fact=Object.hasOwn(entry.facts,key)?entry.facts[key]:other!==key&&Object.hasOwn(entry.facts,other)?entry.facts[other]:undefined;
   if(fact===undefined)continue;
   const agrees=fact===expected;
   // Correlated assertions (e.g. ten birth cutoffs) cannot multiply confidence.
   const pair=groups.get(group)??[0,0];pair[agrees?0:1]=Math.max(pair[agrees?0:1],weight);groups.set(group,pair);
  }
  let score=0,support=0;
  for(const [positive,negative] of groups.values()){
   score+=positive-negative;
   if(positive>0){matches++;if(positive>negative)support++;}
   if(negative>0)conflicts++;
  }
  ranked.push({entry,score,matches,conflicts,support});
 }
 ranked.sort((a,b)=>b.score-a.score||b.support-a.support||a.conflicts-b.conflicts||a.entry.id.localeCompare(b.entry.id));
 const max=ranked[0]?.score??0;let sum=0;
 for(const r of ranked){r.probability=Math.exp(r.score-max);sum+=r.probability;}
 for(const r of ranked)r.probability/=sum;
 return ranked;
}
const entropy=p=>p<=0||p>=1?0:-p*Math.log2(p)-(1-p)*Math.log2(1-p);
export function nextQuestion(ranked,answers,questions){
 if(!ranked.length)return null;
 const asked=new Set(answers.map(a=>canonicalQuestionKey(a.key))),counts=new Map();
 // Hierarchy emerges from posterior mass: broad separators first, then useful
 // occupation/work/place questions in the surviving cohort. No hard elimination.
 const leading=ranked[0].score;
 const focus=leading>0?ranked.filter(r=>r.score>=leading-Math.log(9)):ranked;
 const mass=focus.reduce((s,r)=>s+r.probability,0);
 for(const row of focus)for(const [key,value] of Object.entries(row.entry.facts)){
  if(asked.has(key.startsWith('wd_')?canonicalQuestionKey(key):key)||!Object.hasOwn(questions,key)||key.startsWith('cue_wd_'))continue;
  const c=counts.get(key)??[0,0];c[value?0:1]+=row.probability/mass;counts.set(key,c);
 }
 let best=null,bestQuality=-Infinity;
 const roots=new Set(['real','fictional','mammal','bird','reptile','electronic','vehicle','furniture','family','work','friend']);
 const rootStage=ranked[0].support===0&&[...counts].some(([k,[y,n]])=>roots.has(k)&&(y>1e-9&&n>1e-9||y+n>.1&&y+n<.95));
 for(const [key,[yes,no]] of counts){
  if(rootStage&&!roots.has(key))continue;
  const coverage=Math.min(1,yes+no),unknown=Math.max(0,1-coverage);
  // Unknown candidate facts are marginalized, never assigned No.
  const information=entropy(yes+unknown*.5)-unknown;
  const quality=information+.06*coverage;
  if(quality>bestQuality+1e-12||(Math.abs(quality-bestQuality)<=1e-12&&key<best)){
   bestQuality=quality;best=key;
  }
 }
 return best;
}
export function selectGuess(ranked,answers){
 const [top,second]=ranked;if(!top)return null;
 const margin=second?top.score-second.score:Infinity;
 const groups=top.entry.category==='relationships'?1:Object.keys(top.entry.facts).some(k=>k.startsWith('v2_'))?3:2;
 if(top.support<groups||top.conflicts>1||top.matches<top.conflicts+groups)return null;
 if(top.probability>=.8&&margin>=Math.log(10))return top.entry;
 const informative=answers.filter(a=>a.value!=='unknown').length;
 // A tentative guess still needs independent support and an unambiguous lead.
 const supportedClue=answers.some(a=>a.key.startsWith('cue_')&&!a.key.startsWith('cue_wd_')&&a.value==='yes'&&top.entry.facts[a.key]===true);
 if(top.entry.category==='relationships'&&margin>=Math.log(3))return top.entry;
 if((informative>=4||supportedClue)&&margin>=Math.log(3)&&top.support>=groups+(top.conflicts?1:0))return top.entry;
 return null;
}
