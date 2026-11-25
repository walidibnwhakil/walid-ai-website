// Shared, pure helpers for owner-reviewed records and the public game.
export const REVIEW_VALUES = ["yes","no","probably","probably_not","unknown"];
export const RECORD_CATEGORIES = ["real","fictional","animal","object"];
export function normalizeReviewAnswers(answers, allowed) {
  const out=new Map();
  for(const row of answers||[]){
    const q=row?.q??row?.qid, a=row?.a??row?.value;
    if(typeof q==="string" && /^[a-z0-9_]{1,40}$/.test(q) &&
       REVIEW_VALUES.includes(a) && (!allowed || allowed.has(q))) out.set(q,a);
  }
  return [...out].map(([q,a])=>({q,a}));
}
export function recordCategory(answers, gameCategory) {
  const map=new Map(normalizeReviewAnswers(answers).map(r=>[r.q,r.a]));
  if(gameCategory==="animal"||gameCategory==="object")return gameCategory;
  const known=RECORD_CATEGORIES.filter(k=>map.get(k)==="yes");
  if(known.length===1)return known[0];
  if(!known.length && gameCategory==="character" && map.get("real")==="no" && map.get("fictional")==="yes")return "fictional";
  return "";
}
export function withCategory(answers, category) {
  if(!RECORD_CATEGORIES.includes(category))throw Error("Choose a category");
  const map=new Map(normalizeReviewAnswers(answers).map(r=>[r.q,r.a]));
  for(const key of RECORD_CATEGORIES)map.set(key,key===category?"yes":"no");
  return [...map].map(([q,a])=>({q,a}));
}
export function normalizeRecordName(name) {
  return String(name||"").normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}\p{M}]+/gu,"");
}
export function exactRecordIds(pool,name) {
  const wanted=normalizeRecordName(name);
  if(!wanted||!pool)return [];
  const ids=new Set();
  for(let i=0;i<pool.count;i++){
    if(pool.flags?.[i]&128)continue;
    const options=[pool.ens[i],pool.bns[i],...(pool.aliasMap?.get(pool.ids[i])||[])];
    if(options.some(v=>normalizeRecordName(v)===wanted))ids.add(pool.ids[i]);
  }
  return [...ids];
}
export function approvedFacts(record, questions) {
  const known=new Set(questions.map(q=>q.id)), facts=new Map();
  for(const {q,a} of withCategory(record.answers,record.category)){
    if(known.has(q))facts.set(q,a==="yes"?2:a==="no"?1:0);
  }
  return facts;
}
export function asOwnerEntry(record,questions) {
  const facts=approvedFacts(record,questions);
  return {id:record.id,en:record.nameEn,bn:record.nameBn||"",adult:record.adult===true,
    pop:100,yes:[...facts].filter(([,v])=>v===2).map(([k])=>k),
    no:[...facts].filter(([,v])=>v===1).map(([k])=>k),
    image:record.adult?"":record.image||"",credit:record.adult?"":record.credit||""};
}
export function applyOwnerRecords(pool,records,append,poolFromEntries) {
  if(!pool||!records?.length)return pool;
  const map=new Map(records.map(r=>[r.id,r])), found=new Set();
  const facts=new Map(records.map(r=>[r.id,approvedFacts(r,pool.questions)]));
  const update=(i,r)=>{
    pool.ens[i]=r.nameEn;pool.bns[i]=r.nameBn||"";
    // Preserve all unrelated flag bits. Owner verification lifts audit-only flag.
    pool.flags[i]=(pool.flags[i]&~5)|(r.adult?1:0);
    pool.images[i]=r.adult?"":r.image||"";
    pool.credits[i]=r.adult?"":r.credit||"";
  };
  for(let i=0;i<pool.count;i++){
    const r=map.get(pool.ids[i]);if(!r)continue;
    if(found.has(r.id)){pool.flags[i]|=128;continue;}
    found.add(r.id);update(i,r);
  }
  const missing=records.filter(r=>!found.has(r.id));
  if(missing.length)pool=append(pool,poolFromEntries(pool.questions,missing.map(r=>asOwnerEntry(r,pool.questions))));
  pool._ownerFacts=facts;
  return pool;
}
