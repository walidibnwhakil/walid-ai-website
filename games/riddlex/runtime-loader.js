import {loadLearned} from './learning-client.js?v=learn1';
// Only this small module loads at startup. Category selection fetches bounded shards.
const base=new URL('./runtime/',import.meta.url);
const politicalClues={
 prime_minister:['Has this person served as prime minister?',[
  // https://moi.gov.bd/pages/static-pages/694032b935ce18e1c0561430
  'sheikh-mujibur-rahman','tajuddin-ahmad','wd-q52183','wd-q234814',
  // https://www.pmindia.gov.in/en/former-prime-ministers/
  'wd-q1047','wd-q1149','wd-q41914',
  // Existing casebook clue identifies Pakistan's fifth prime minister.
  'suhrawardy'
 ]],
 national_president:['Has this person served as president of a country?',[
  // https://publicdivision.portal.gov.bd/pages/static-pages/694032ac35ce18e1c0560537
  'sheikh-mujibur-rahman','wd-q3246667','wd-q57485','wd-q198313'
 ]],
 liberation_era:['Was this person a political leader during Bangladesh’s Liberation War?',[
  // https://en.banglapedia.org/index.php?title=Ahmad%2C_Tajuddin
  'sheikh-mujibur-rahman','tajuddin-ahmad'
 ]],
 politics_this_century:['Has this person held national office in the 21st century?',[
  // Office dates from the government sources above.
  'wd-q52183','wd-q234814','wd-q3246667','wd-q57485','wd-q41914'
 ]],
 led_awami_league:['Has this person led the Awami League?',[
  // https://bdp2100kp.gov.bd/Profile/PrimeMinister
  'sheikh-mujibur-rahman','wd-q52183'
 ]],
 led_bnp:['Has this person led the Bangladesh Nationalist Party (BNP)?',[
  // https://www.parliament.gov.bd/public/uploads/publication/202308271011_bulletin_sb2017.pdf
  'wd-q234814'
 ]],
 first_indian_pm:['Was this person the first prime minister of independent India?',[
  // https://www.pmindia.gov.in/en/former-prime-ministers/
  'wd-q1047'
 ]]
};

function addPoliticalClues(entries,questions){
 const byId=new Map(entries.map(entry=>[entry.id,entry]));
 for(const [key,[question,ids]] of Object.entries(politicalClues)){
  questions[key]=question;
  for(const id of ids){
   const entry=byId.get(id);
   if(entry)entry.facts[key]=true;
  }
 }
}

let manifestPromise;const cache=new Map();
if(window.firebase?.apps?.length)window.firebase.auth().onAuthStateChanged(()=>cache.clear());
export function clearRuntimeCache(){cache.clear();}
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
  if(category==='characters')addPoliticalClues(entries,questions);
  const localIds=new Set(entries.map(entry=>entry.id));
  for(const entry of await loadLearned(category))if(!localIds.has(entry.id)){entries.push(entry);localIds.add(entry.id);}
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
