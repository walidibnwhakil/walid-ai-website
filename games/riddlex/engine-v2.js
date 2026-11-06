// Open-world likelihood updates: an unrecorded fact and Don't Know add zero evidence.
// Probabilities are model scores, not empirically calibrated human confidence.
const softWeight=Math.log(.7/.3);
const isSoft=value=>value==='probably'||value==='probably-not';
const leansYes=value=>value==='yes'||value==='probably';
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
 if(animalClasses.has(key))return 'animal-class';
 if(key==='pet'||key==='domestic'||key==='wild')return 'domestication';
 if(['male','female','boy','girl'].includes(key))return 'gender';
 if(['actor','poet','writer','filmmaker','singer','cricket','scientist','physicist','economist','composer','educator','military','politician','psychologist'].includes(key))return 'occupation';
 if(countries.has(key)||key.startsWith('v2_citizenship_'))return 'citizenship';
 if(politicalRoles.has(key))return 'political-office';
 if(politicalParties.has(key))return 'political-party';
 if(key==='liberation_era'||key==='politics_this_century')return 'political-era';
 if(key.startsWith('v2_'))return key.split('_')[1];
 if(key.startsWith('wd_'))return key.split('_')[1];
 return key;
}
export function scoreCandidates(entries,answers,rejected=new Set()){
 // Normalize each answer once per turn, rather than once per candidate.
 const known=answers.filter(a=>a.value!=='unknown'&&ANSWERS.includes(a.value)).map(({key,value})=>{
  const canonical=canonicalQuestionKey(key),other=canonical!==key?canonical:key.replace(/^v2_(occupation|birthplace|award|work|sport)_/,'wd_$1_');
  const group=evidenceGroup(key);
  const hard=!isSoft(value)&&(group==='existence'||group==='animal-class');
  return {key,other,expected:leansYes(value),weight:isSoft(value)?softWeight:Math.log(9),group,hard};
 });
 const ranked=[];
 candidate: for(const entry of entries){
  if(rejected.has(entry.id))continue;
  const groups=new Map();let matches=0,conflicts=0;
  for(const {key,other,expected,weight,group,hard} of known){
   const fact=Object.hasOwn(entry.facts,key)?entry.facts[key]:other!==key&&Object.hasOwn(entry.facts,other)?entry.facts[other]:undefined;
   if(fact===undefined)continue;
   const agrees=fact===expected;
   if(hard&&!agrees)continue candidate;
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
const animalClasses=new Set(['mammal','bird','reptile','amphibian','fish','insect','crustacean']);
const entropy=p=>p<=0||p>=1?0:-p*Math.log2(p)-(1-p)*Math.log2(1-p);
const questionPairs={real:'fictional',fictional:'real',male:'female',female:'male',boy:'girl',girl:'boy'};
const familiar=new Set([
 'real','fictional','male','female','boy','girl','bangladeshi','indian','british','american',
 'japanese','bangla','actor','singer','writer','poet','politician','cricket','scientist',
 'filmmaker','composer','novel','cartoon','anime','comic','superhero','glasses','detective'
]);
const countries=new Set(['indian','bangladeshi','british','american','japanese','v2_citizenship_q843']);
const politicalRoles=new Set(['prime_minister','national_president','first_indian_pm','cue_tajuddin_ahmad','cue_suhrawardy']);
const politicalHistory=new Set(['liberation_era','politics_this_century','cue_sheikh_mujibur_rahman','cue_bhashani','cue_fazlul_huq']);
const politicalParties=new Set(['led_awami_league','led_bnp']);
const actingClues=new Set(['bollywood','hollywood','king_khan','bhaijaan','big_b','aamir']);
const careerRoutes={
 politician:new Set([...politicalRoles,...politicalHistory,...politicalParties]),
 actor:actingClues
};
const overlaps={
 politician:new Set(['actor','writer','military','cricket']),
 actor:new Set(['politician','singer','filmmaker','writer','v2_occupation_q2526255','v2_occupation_q3282637'])
};
const equivalentOccupations={
 v2_occupation_q33999:'actor',v2_occupation_q177220:'singer',v2_occupation_q49757:'poet',
 v2_occupation_q36834:'composer',v2_occupation_q169470:'physicist',
 v2_occupation_q12299841:'cricket',v2_occupation_q901:'scientist',v2_occupation_q82955:'politician'
};
const questionIdentity=key=>{
 const canonical=canonicalQuestionKey(key);
 return equivalentOccupations[canonical]??canonical;
};
const normalize=text=>text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu,'');
// These prompts explicitly assume the parent clue in their wording.
const questionPrerequisites={
 cartoon:['boy','girl','underwater','duck_character','dog_character','animated_movie','lion_character'],
 superhero:['dc','gotham','marvel','krypton','armor','shield','green','hammer','lasso'],
 actor:['king_khan','bhaijaan','big_b','aamir'],
 poet:['bonolota'],writer:['nonsense_poetry'],singer:['playback'],cricket:['wicketkeeper'],
 pokemon:['electric_creature','trainer'],
 bird:['mimic','peacock','flightless'],insect:['mosquito'],marine:['jelly'],
 friend:['best']
};
const denied=(entry,answers)=>answers.some(({key,value})=>
 (value==='yes'||value==='no')&&factValue(entry,key)===(value==='no'));
const routeFor=(answers,value='yes')=>answers.find(answer=>answer.value===value&&Object.hasOwn(careerRoutes,questionIdentity(answer.key)));
const careerFact=(entry,key)=>factValue(entry,key)??Object.entries(equivalentOccupations)
 .some(([alias,broad])=>broad===key&&factValue(entry,alias)===true);
const commonCareerClue=key=>countries.has(key)||['male','female','bangla'].includes(key);
const politicalDiagnostic=new Set(['first_indian_pm','cue_sheikh_mujibur_rahman','cue_bhashani','cue_fazlul_huq','cue_tajuddin_ahmad','cue_suhrawardy']);
const bangladeshPolitics=new Set(['liberation_era',...politicalParties,'cue_sheikh_mujibur_rahman','cue_bhashani','cue_fazlul_huq','cue_tajuddin_ahmad']);
const questionFamily=key=>countries.has(key)?'country':politicalDiagnostic.has(key)||['king_khan','bhaijaan','big_b','aamir'].includes(key)?'signature':evidenceGroup(key);
const broadCareerClue=key=>commonCareerClue(key)||['bollywood','hollywood','prime_minister','national_president','liberation_era','politics_this_century'].includes(key);

function questionBank(questions,answers){
 const excluded=new Set();
 for(const {key,value} of answers){
  excluded.add(questionIdentity(key));
  // Ask each paired dimension once. This suppresses follow-ups without
  // turning No or Don't Know into evidence for a different gender.
  if(Object.hasOwn(questionPairs,key))excluded.add(questionPairs[key]);
  if(value==='no'){
   for(const child of questionPrerequisites[questionIdentity(key)]??[])excluded.add(child);
  }
  if(key==='boy'&&value==='yes'||key==='girl'&&value==='yes')excluded.add('cartoon');
 }
 const explicit=new Map(answers.map(({key,value})=>[questionIdentity(key),value]));
 if(explicit.has('male')||explicit.has('female')||explicit.has('boy')||explicit.has('girl')){
  for(const key of ['male','female','boy','girl'])excluded.add(key);
 }
 const askedText=new Set(answers.flatMap(({key})=>questions[key]?[normalize(questions[key])]:[]));
 const isFictional=answers.some(({key,value})=>key==='fictional'&&value==='yes'||key==='real'&&value==='no');
 const bank=new Map();
 for(const [key,question] of Object.entries(questions)){
  const canonical=canonicalQuestionKey(key);
  if(excluded.has(questionIdentity(key))||askedText.has(normalize(question)))continue;
  if(isFictional&&/^(?:v2|wd)_/.test(key))continue;
  if(isFictional&&/\b(?:family|father|mother|parent|son|daughter|brother|sister|sibling|spouse|husband|wife|cousin|grandparent|grandfather|grandmother|grandchild|aunt|uncle|nephew|niece)\b/i.test(question))continue;
  if(/^(born_before_|birth_first_half$|cue_wd_)/.test(key))continue;
  // Generated metadata is admitted only where a recognizable clue was reviewed.
  if(/^(?:v2|wd)_/.test(key)&&!countries.has(canonical)&&!politicalRoles.has(canonical)&&
    !equivalentOccupations[canonical]&&!overlaps.actor.has(canonical))continue;
  if(/\b(?:award|prize|medal|oscars?)\b|\bborn in\b/i.test(question))continue;
  if(['prime_minister','national_president','liberation_era','politics_this_century'].includes(key)&&!leansYes(explicit.get('politician')))continue;
  if(bangladeshPolitics.has(key)&&!leansYes(explicit.get('bangladeshi')))continue;
  if(key==='first_indian_pm'&&(!leansYes(explicit.get('indian'))||!leansYes(explicit.get('prime_minister'))))continue;
  if(key==='cue_suhrawardy'&&!leansYes(explicit.get('v2_citizenship_q843')))continue;
  if(politicalParties.has(key)&&[...politicalParties].some(party=>explicit.get(party)==='unknown'))continue;
  if(['cue_tajuddin_ahmad','cue_suhrawardy'].includes(key)&&explicit.has('prime_minister')&&!leansYes(explicit.get('prime_minister')))continue;
  if(isFictional&&careerRoutes.politician.has(canonical))continue;
  if(!bank.has(canonical)||key===canonical)bank.set(canonical,key);
 }
 return bank;
}
function questionOrder(seed,key,step){
 let hash=(seed^Math.imul(step+1,0x9e3779b9))>>>0;
 for(const character of key)hash=Math.imul(hash^character.charCodeAt(0),0x01000193);
 hash=Math.imul(hash^(hash>>>16),0x85ebca6b);
 return (hash^(hash>>>13))>>>0;
}

export function nextQuestion(ranked,answers,questions,seed){
 if(!ranked.length||answers.length>=8&&answers.every(({value})=>value==='unknown'))return null;
 const bank=questionBank(questions,answers),counts=new Map();
 const route=routeFor(answers);
 const hint=route??routeFor(answers,'probably');
 const career=hint&&questionIdentity(hint.key);
 const plausible=ranked.filter(row=>!denied(row.entry,answers));
 const eligible=plausible.length?plausible:ranked;
 const aligned=career?eligible.filter(row=>careerFact(row.entry,career)===true):[];
 const leading=eligible[0].score;
 const focus=route&&aligned.length?aligned:leading>0?eligible.filter(row=>row.score>=leading-Math.log(9)):eligible;
 const mass=focus.reduce((sum,row)=>sum+row.probability,0);
 for(const row of focus){
  for(const [fact,value] of Object.entries(row.entry.facts)){
   const canonical=canonicalQuestionKey(fact),key=bank.get(canonical);
   if(!key||fact!==canonical&&Object.hasOwn(row.entry.facts,canonical))continue;
   const count=counts.get(key)??[0,0];
   count[value?0:1]+=row.probability/mass;
   counts.set(key,count);
  }
 }
 const asked=new Map(),skipped=new Map();
 const usedGroups=new Set(answers.filter(answer=>answer.value!=='unknown').map(answer=>evidenceGroup(answer.key)));
 const softRun=answers.some(({value})=>isSoft(value));
 const knownCountry=answers.some(({key,value})=>countries.has(key)&&value==='yes');
 for(const {key,value} of answers){
  const family=questionFamily(key);
  asked.set(family,(asked.get(family)??0)+1);
  if(value==='unknown')skipped.set(family,(skipped.get(family)??0)+1);
 }
 let best=null,bestQuality=-Infinity;
 const nearTies=[];
 const roots=new Set(['real','fictional','mammal','bird','reptile','electronic','vehicle','furniture','family','work','friend']);
 const rootStage=ranked[0].support===0&&[...counts].some(([key,[yes,no]])=>roots.has(key)&&(yes>1e-9&&no>1e-9||yes+no>.1&&yes+no<.95));
 for(const [key,[yes,no]] of counts){
  if(rootStage&&!roots.has(key))continue;
  if(yes<1e-9||yes>1-1e-9)continue;
  const canonical=canonicalQuestionKey(key),family=questionFamily(canonical);
  const recentFamily=answers.length&&questionFamily(answers.at(-1).key)===family;
  if(family==='country'&&(knownCountry||(asked.get(family)??0)>=2||recentFamily))continue;
  if(family==='signature'&&((asked.get(family)??0)>=3||recentFamily))continue;
  const contextual=career&&careerRoutes[career].has(canonical);
  const overlap=career&&overlaps[career].has(questionIdentity(key));
  // Ask about another career only when it is recorded for a meaningful share
  // of the current career pool and the obvious context has been established.
  const overlapAllowed=overlap&&aligned.length>1&&yes>=.12&&yes<=.85&&
   answers.some(({key,value})=>value==='yes'&&broadCareerClue(key))&&!answers.some(({key})=>overlaps[career].has(questionIdentity(key)));
  if(route&&!contextual&&!commonCareerClue(key)&&!overlapAllowed)continue;
  const coverage=Math.min(1,yes+no),unknown=Math.max(0,1-coverage);
  // Unknown candidate facts are marginalized. Fine-grained clues are a fallback.
  const information=entropy(yes+unknown*.5)-unknown;
  const group=evidenceGroup(key);
  const weight=familiar.has(key)?2.2:group==='occupation'||group==='citizenship'?1.5:1;
  const quality=(information+.06*coverage)*weight/(1+.45*(skipped.get(family)??0));
  // Broad clues precede role or signature details. Genuine career overlaps
  // remain a fallback even when their information gain would be higher.
  const tier=career?(broadCareerClue(canonical)?3:contextual?2:1):0;
  // A soft career answer gives context a preference without removing other questions.
  const repeated=softRun&&usedGroups.has(group);
  const priority=(route?tier*4:contextual?.25:0)+quality*(repeated?.65:1);
  if(seed!==undefined)nearTies.push({key,priority});
  if(priority>bestQuality+1e-12||(Math.abs(priority-bestQuality)<=1e-12&&key<best)){
   bestQuality=priority;best=key;
  }
 }
 if(bestQuality<.1||seed===undefined)return best;
 return nearTies.filter(({priority})=>bestQuality-priority<=.035)
  .sort((a,b)=>questionOrder(seed,a.key,answers.length)-questionOrder(seed,b.key,answers.length))[0].key;
}
export function selectGuess(ranked,answers){
 const [top,second]=ranked;if(!top)return null;
 const route=routeFor(answers);
 if(route){
  const career=questionIdentity(route.key);
  const signature=answers.find(({key,value})=>value==='yes'&&questionFamily(key)==='signature'&&careerRoutes[career].has(key));
  if(signature){
   // A confirmed, distinctive clue can break a tie within one evidence group
   // after other groups have established independent support.
   const matches=ranked.filter(row=>factValue(row.entry,signature.key)===true);
   const [match]=matches;
   if(matches.length===1&&match.support>=3&&match.conflicts===0&&careerFact(match.entry,career)===true){
    return match.entry;
   }
  }
  if(denied(top.entry,answers)||careerFact(top.entry,career)!==true)return null;
 }
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

// Try a clearly labeled guess only when the question bank has run out. One
// net soft clue can separate the lead, but cannot supply all its support.
export function selectTentativeGuess(ranked,answers){
 const [top,second]=ranked;
 if(!top||denied(top.entry,answers))return null;
 const groups=new Set(answers.filter(({key,value})=>
  isSoft(value)&&factValue(top.entry,key)===leansYes(value)
 ).map(({key})=>evidenceGroup(key)));
 if(groups.size<2||top.support<2||top.conflicts>1)return null;
 if(second&&top.score-second.score<softWeight-1e-9)return null;
 const route=routeFor(answers);
 if(route&&careerFact(top.entry,questionIdentity(route.key))!==true)return null;
 return top.entry;
}
