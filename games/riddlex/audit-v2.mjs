import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {Worker} from 'node:worker_threads';import {availableParallelism} from 'node:os';
import {entries,questions} from './casebook.js';import {banglaQuestions} from './questions.bn.js';import {runtimeBangla} from './runtime-translations.js';import {roles,relationshipQuestions} from './relationships.js';
import {sanitizeEntries,canonicalPool} from './knowledge-policy.js';import {simulate} from './simulation-v2.js';
const start=performance.now(),dir=new URL('./knowledge/',import.meta.url),mode=process.argv.includes('--candidates')?'candidates':process.argv.includes('--final')?'final':'baseline';
const read=async p=>JSON.parse(await readFile(new URL(p,dir),'utf8'));let extra={entries:[],questions:{},bangla:{}};
if(mode!=='baseline')extra=await read(mode==='final'?'v2-accepted.json':'v2-candidates.json');
const replace=new Map(extra.entries.filter(e=>e.replacement).map(e=>[e.id,e]));
const source=[...entries.map(e=>replace.get(e.id)??e),...extra.entries.filter(e=>!e.replacement),...roles],bank={...questions,...extra.questions,...relationshipQuestions},bn={...banglaQuestions,...runtimeBangla,...extra.bangla};
const {entries:clean,banned}=sanitizeEntries(source,bank,bn),hash=x=>createHash('sha256').update(x).digest('hex'),poolSha256=hash(canonicalPool(clean)),engineSha256=hash(await readFile(new URL('./engine-v2.js',import.meta.url)));
const result={formatVersion:3,mode,complete:false,poolSha256,engineSha256,policy:'First guess only; 60-question cap; no retry oracle; exact dates/direct-name/ambiguous printed clues excluded; coarse birth ranges count once',noisyPolicy:'Recorded facts: 25% unknown, 15% probable, 5% flipped, 55% definite; canonical-predicate FNV1a. Missing facts always unknown. Not a user study.',bannedKeys:[...banned].sort(),categories:{},rows:{}};
const checkpoint='v2-'+mode+'-checkpoint.json';let saved={poolSha256,engineSha256,categories:{}};
try{const old=await read(checkpoint);if(old.poolSha256===poolSha256&&old.engineSha256===engineSha256)saved=old;}catch(e){if(e.code!=='ENOENT')throw e;}
const promoted=[],byId=new Map(extra.entries.map(e=>[e.id,e]));
function summarize(rows){const q=rows.map(r=>r.questions).sort((a,b)=>a-b);return{targets:rows.length,correct:rows.filter(r=>r.correct).length,wrongFirstGuesses:rows.filter(r=>r.wrong).length,unresolved:rows.filter(r=>!r.correct&&!r.wrong).length,averageQuestions:rows.reduce((s,r)=>s+r.questions,0)/rows.length,p95Questions:q[Math.floor(q.length*.95)],maxQuestions:q.at(-1)};}
for(const category of ['characters','animals','objects','relationships']){
 const pool=clean.filter(e=>e.category===category),completed=new Map((saved.categories[category]??[]).map(r=>[r.ideal.id,r])),pending=pool.map((_,i)=>i).filter(i=>!completed.has(pool[i].id));let writes=Promise.resolve();
 const collect=rows=>{for(const r of rows)completed.set(r.ideal.id,r);saved.categories[category]=[...completed.values()];const snapshot=JSON.stringify(saved)+'\n';writes=writes.then(()=>writeFile(new URL(checkpoint,dir),snapshot));console.log(category,completed.size,'/',pool.length,'seconds',Math.round((performance.now()-start)/1000));};
 const workers=Math.min(4,availableParallelism());
 if(pool.length>=500&&workers>1){
  const compact=pool.map(({id,name,category,facts})=>({id,name,category,facts})),keys=new Set(compact.flatMap(e=>Object.keys(e.facts))),smallBank=Object.fromEntries(Object.entries(bank).filter(([k])=>keys.has(k)));
  await Promise.all(Array.from({length:workers},(_,n)=>new Promise((resolve,reject)=>{const w=new Worker(new URL('./audit-worker.mjs',import.meta.url),{workerData:{pool:compact,bank:smallBank,indices:pending.filter((_,i)=>i%workers===n)}});w.on('message',collect);w.on('error',reject);w.on('exit',code=>code?reject(Error('Worker '+code)):resolve());})));
 }else collect(pending.map(i=>({ideal:simulate(pool[i],pool,bank),noisy:simulate(pool[i],pool,bank,{noisy:true})})));
 await writes;const ideal=[],noisy=[];
 for(const target of pool){const row=completed.get(target.id);if(!row)throw Error('Incomplete '+target.id);ideal.push(row.ideal);noisy.push(row.noisy);
  const keys=Object.keys(target.facts).filter(k=>k.startsWith('v2_')),groups=new Set(keys.map(k=>k.split('_')[1])).size,coverage=category==='characters'?groups>=4&&keys.length>=6:groups>=3&&keys.length>=4;
  if(mode==='candidates'&&coverage&&row.ideal.correct&&row.ideal.support>=3&&byId.has(target.id))promoted.push(byId.get(target.id));
 }
 result.categories[category]={ideal:summarize(ideal),noisy:summarize(noisy)};result.rows[category]={ideal,noisy};console.log(category,JSON.stringify(result.categories[category]));await writeFile(new URL('v2-'+mode+'-audit.json',dir),JSON.stringify(result,null,2)+'\n');
}
if(mode==='candidates'){
 const keys=new Set(promoted.flatMap(e=>Object.keys(e.facts)));await writeFile(new URL('v2-accepted.json',dir),JSON.stringify({formatVersion:3,entries:promoted,questions:Object.fromEntries(Object.entries(extra.questions).filter(([k])=>keys.has(k))),bangla:Object.fromEntries(Object.entries(extra.bangla).filter(([k])=>keys.has(k)))})+'\n');result.promoted={additions:promoted.filter(e=>!e.replacement).length,enrichments:promoted.filter(e=>e.replacement).length};
}
result.complete=true;result.elapsedSeconds=(performance.now()-start)/1000;result.peakRssMiB=process.resourceUsage().maxRSS/1024;await writeFile(new URL('v2-'+mode+'-audit.json',dir),JSON.stringify(result,null,2)+'\n');console.log('complete',JSON.stringify({mode,seconds:result.elapsedSeconds,promoted:result.promoted}));
