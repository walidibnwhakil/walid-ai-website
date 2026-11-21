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
  const priority=fresh.filter(q=>Boolean(q.chapter));
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
