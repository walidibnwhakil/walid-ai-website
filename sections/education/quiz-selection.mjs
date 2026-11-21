/* Local-only variety control: store recently shown question identifiers by
   grade/group. No names, accounts, results or personal data are sent anywhere. */
export function shuffle(items,rand=Math.random){
  const a=items.slice();
  for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a;
}
export function distinct(pool){
  const seen=new Set();
  return pool.filter(q=>{
    const k=q.q.trim().replace(/\s+/g," ").toLocaleLowerCase();
    if(!k||seen.has(k))return false;
    seen.add(k);return true;
  });
}
function balanced(items,count,rand){
  const groups=new Map();
  for(const q of shuffle(items,rand)){
    if(!groups.has(q.subject))groups.set(q.subject,[]);
    groups.get(q.subject).push(q);
  }
  const subjects=shuffle([...groups.keys()],rand);
  const output=[];
  while(output.length<count){
    let progressed=false;
    for(const subject of subjects){
      const next=groups.get(subject).pop();
      if(!next)continue;
      output.push(next);
      progressed=true;
      if(output.length===count)break;
    }
    if(!progressed)break;
  }
  return output;
}
export function selectQuestions(pool,count,history=[],rand=Math.random){
  const unique=distinct(pool);
  if(unique.length<count)throw Error("Insufficient questions for selected level");
  const recentlyUsed=new Set(history);
  const fresh=unique.filter(q=>!recentlyUsed.has(q.id));
  // If the available pool has enough previously-unseen questions, use only
  // those. Reuse older questions only when the unique pool is exhausted.
  // Prefer authored chapter-tagged concepts over mass-produced arithmetic
  // variants while still rotating unseen questions and balancing subjects.
  // Original authored chapter questions take precedence over numeric variants.
  const priority=fresh.filter(q=>Boolean(q.chapter)&&!q.generated);
  const chapterCount=Math.min(priority.length,Math.ceil(count*.4));
  const core=balanced(priority,chapterCount,rand);
  const coreIds=new Set(core.map(q=>q.id));
  const chosen=core.concat(balanced(fresh.filter(q=>!coreIds.has(q.id)),count-core.length,rand));
  if(chosen.length<count){
    const selectedIds=new Set(chosen.map(q=>q.id));
    const recycled=balanced(unique.filter(q=>!selectedIds.has(q.id)),count-chosen.length,rand);
    chosen.push(...recycled);
  }
  return shuffle(chosen,rand);
}
export function updatedHistory(pool,count,history,selected){
  const max=Math.min(1200,Math.max(0,distinct(pool).length-count));
  const used=new Set();
  const merged=[];
  for(const id of [...history,...selected.map(q=>q.id)]){
    if(used.has(id)){const at=merged.indexOf(id);if(at>=0)merged.splice(at,1)}
    used.add(id);merged.push(id);
  }
  return merged.slice(-max);
}

/* The 50th BCS preliminary syllabus allocation, 200 marks; different BCS
   examinations (e.g. special BCS) can use a different published syllabus.
   This is a preparation-topic distribution, not an official examination. */
export const BCS_PRELIM_50_WEIGHTS=Object.freeze([
 ["বাংলা ভাষা ও সাহিত্য",30],
 ["ইংরেজি ভাষা ও সাহিত্য",30],
 ["বাংলাদেশ বিষয়াবলি",25],
 ["আন্তর্জাতিক বিষয়াবলি",25],
 ["ভূগোল ও পরিবেশ",10],
 ["সাধারণ বিজ্ঞান",15],
 ["কম্পিউটার ও তথ্যপ্রযুক্তি",15],
 ["গাণিতিক যুক্তি",20],
 ["মানসিক দক্ষতা",15],
 ["নৈতিকতা ও সুশাসন",15]
]);
export function bcsQuotas(count){
  if(!Number.isInteger(count)||count<10)throw Error("BCS test count must be at least 10");
  const total=BCS_PRELIM_50_WEIGHTS.reduce((sum,[,weight])=>sum+weight,0);
  if(total!==200)throw Error("BCS marks must total 200");
  const weighted=BCS_PRELIM_50_WEIGHTS.map(([subject,weight],i)=>{
    const exact=count*weight/total;
    return {subject,quantity:Math.floor(exact),fraction:exact-Math.floor(exact),index:i};
  });
  let left=count-weighted.reduce((sum,item)=>sum+item.quantity,0);
  const order=[...weighted].sort((a,b)=>b.fraction-a.fraction||a.index-b.index);
  for(let i=0;i<left;i++)order[i].quantity++;
  return weighted.map(({subject,quantity})=>({subject,quantity}));
}
export function selectBcsQuestions(pool,count,history=[],rand=Math.random){
  const quotas=bcsQuotas(count);
  const all=distinct(pool);
  const output=[];
  for(const {subject,quantity} of quotas){
    const bySubject=all.filter(q=>q.subject===subject);
    if(bySubject.length<quantity)throw Error("Insufficient BCS "+subject+" questions");
    // Include one independently generated mathematical skill exercise, rather
    // than letting authored-first sampling eliminate every worked variant.
    // Keep the syllabus quota for this subject unchanged.
    const variants=subject==="গাণিতিক যুক্তি"&&quantity>0?
      bySubject.filter(q=>q.generated&&q.topic):[];
    const fresh=variants.filter(q=>!history.includes(q.id));
    const worked=(fresh.length?shuffle(fresh,rand):shuffle(variants,rand))[0];
    const remainingPool=worked?bySubject.filter(q=>q.id!==worked.id):bySubject;
    const required=quantity-(worked?1:0);
    const authored=remainingPool.filter(q=>!q.generated);
    const priorityCount=Math.min(authored.length,required,Math.ceil(required*.75));
    const authoredSelected=priorityCount?selectQuestions(authored,priorityCount,history,rand):[];
    const selectedIds=new Set(authoredSelected.map(q=>q.id));
    const remainder=required-authoredSelected.length;
    const other=remainder?selectQuestions(remainingPool.filter(q=>!selectedIds.has(q.id)),remainder,history,rand):[];
    output.push(...authoredSelected,...other);
    if(worked)output.push(worked);
  }
  if(output.length!==count)throw Error("BCS weight allocation mismatch");
  return shuffle(output,rand);
}
