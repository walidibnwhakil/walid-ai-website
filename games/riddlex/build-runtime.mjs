// Reproducible compact category shards. Offline evidence is deliberately excluded.
import {entries,questions} from './casebook.js';
import {banglaQuestions} from './questions.bn.js';
import {roles,relationshipQuestions} from './relationships.js';
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {runtimeBangla,identityKeys} from './runtime-translations.js';
const root=new URL('./runtime/',import.meta.url),check=process.argv.includes('--check');
let extra={entries:[],questions:{},bangla:{}};
try{extra=JSON.parse(await readFile(new URL('./knowledge/v2-accepted.json',import.meta.url),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const replacements=new Map(extra.entries.filter(e=>e.replacement).map(e=>[e.id,e]));
const all=[...entries.map(e=>replacements.get(e.id)??e),...extra.entries.filter(e=>!e.replacement),...roles],bank={...questions,...extra.questions,...relationshipQuestions},bn={...banglaQuestions,...runtimeBangla,...extra.bangla};
assert.equal(new Set(all.map(e=>e.id)).size,all.length);
const manifest={formatVersion:1,sourceCommit:'c13c05e5e48eb5875d98961e2907de616d920f99',categories:{},search:{}};
const artifacts=new Map(),search=new Map();
for(const category of ['characters','animals','objects','relationships']){
 const pool=all.filter(e=>e.category===category),shards=[];
 for(let i=0;i<pool.length;i+=256){
  const slice=pool.slice(i,i+256),qs={},bs={};
  const compact=slice.map(e=>{
   const facts=Object.fromEntries(Object.entries(e.facts).filter(([k])=>!k.startsWith('cue_wd_')&&!identityKeys.has(k)));
   for(const key of Object.keys(facts)){assert.ok(bank[key],key);qs[key]=bank[key];if(bn[key])bs[key]=bn[key];}
   return {id:e.id,name:e.name,...(e.nameBn?{nameBn:e.nameBn}:{}),category,facts,...(e.image?{image:e.image}:{})};
  });
  const content=JSON.stringify({entries:compact,questions:qs,bangla:bs})+'\n';
  const sha256=createHash('sha256').update(content).digest('hex');
  const path=category+'-'+String(i/256).padStart(3,'0')+'-'+sha256.slice(0,12)+'.json';
  artifacts.set(path,content);shards.push({path,count:compact.length,bytes:Buffer.byteLength(content),sha256});
 }
 manifest.categories[category]={count:pool.length,shards};
 for(const e of pool){
  const names=[e.name,e.nameBn,...(e.aliases??[])].filter(Boolean).map(n=>n.normalize('NFKC').toLocaleLowerCase());
  for(const prefix of new Set(names.map(n=>Array.from(n)[0]))){const rows=search.get(prefix)??[];rows.push({id:e.id,category,name:e.name,...(e.nameBn?{nameBn:e.nameBn}:{}),names});search.set(prefix,rows);}
 }
}
for(const [prefix,rows] of search){
 const path='search-'+prefix.codePointAt(0).toString(16)+'.json';manifest.search[prefix]=path;artifacts.set(path,JSON.stringify(rows)+'\n');
}
artifacts.set('manifest.json',JSON.stringify(manifest,null,2)+'\n');
if(!check){await rm(root,{force:true,recursive:true});await mkdir(root,{recursive:true});}
for(const [path,content] of artifacts){
 if(check)assert.equal(await readFile(new URL(path,root),'utf8'),content,'Stale runtime '+path);
 else await writeFile(new URL(path,root),content);
}
console.log(JSON.stringify({runtimeEntries:all.length,files:artifacts.size,bytes:[...artifacts.values()].reduce((s,c)=>s+Buffer.byteLength(c),0),categories:Object.fromEntries(Object.entries(manifest.categories).map(([k,v])=>[k,v.count]))}));
