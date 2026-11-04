// Only this small module loads at startup. Category selection fetches bounded shards.
const base=new URL('./runtime/',import.meta.url);
let manifestPromise;const cache=new Map();
async function json(path){const r=await fetch(new URL(path,base));if(!r.ok)throw Error('Knowledge unavailable ('+r.status+')');return r.json();}
export async function manifest(){return manifestPromise??=json('manifest.json').catch(e=>{manifestPromise=null;throw e;});}
export async function loadCategory(category){
 const m=await manifest(),spec=m.categories[category];
 if(!spec||spec.count>20000||spec.shards.length>100)throw Error('Unsupported knowledge category');
 if(cache.has(category))return cache.get(category);
 const promise=(async()=>{
  const entries=[],questions={},bangla={};
  // Bounded concurrency and one active category retained in memory.
  for(let i=0;i<spec.shards.length;i+=3){
   const parts=await Promise.all(spec.shards.slice(i,i+3).map(s=>json(s.path)));
   for(const p of parts){entries.push(...p.entries);Object.assign(questions,p.questions);Object.assign(bangla,p.bangla);}
  }
  if(entries.length!==spec.count||new Set(entries.map(e=>e.id)).size!==entries.length)throw Error('Invalid knowledge shards');
  return {entries,questions,bangla};
 })();
 cache.clear();cache.set(category,promise);
 try{return await promise;}catch(e){cache.delete(category);throw e;}
}
export async function searchNames(query,{limit=20}={}){
 const normalized=query.normalize('NFKC').trim().toLocaleLowerCase();if(!normalized)return [];
 const m=await manifest(),prefix=Array.from(normalized)[0];
 const path=m.search[prefix];if(!path)return [];
 const rows=await json(path);return rows.filter(r=>r.names.some(n=>n.includes(normalized))).slice(0,Math.min(50,Math.max(1,limit)));
}
