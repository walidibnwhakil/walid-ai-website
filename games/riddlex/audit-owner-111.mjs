// Read EVERY packed casebook shard plus always-loaded curated records.
// This is not a gameplay simulation; it separately audits original named
// entries, Bengali labels and source/credit-backed pictures for the 111
// historical owner QA sessions. No edits to the production game.
import {readFile,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {decodeShard} from "./kb.js";
import {OWNER_111_SESSIONS} from "./owner-111-sessions.mjs";
import {PERSONAL_RELATIONS,RIDDLEX_CHARACTER} from "./personal-facts.js";
import {EXTRA_IDENTITY_PEOPLE} from "./identity-facts.js";
import {DOMAIN_PEOPLE} from "./domain-facts.js";
import {BROAD_PEOPLE,BROAD_OBJECTS} from "./broad-facts.js";
import {NARRATIVE_PEOPLE} from "./narrative-facts.js";
import {EVERYDAY_OBJECTS} from "./everyday-facts.js";
import {RECOGNITION_PEOPLE,RECOGNITION_ANIMALS} from "./recognition-facts.js";
import {EXTRA_HYPOTHESIS_ENTRIES} from "./hypothesis-facts.js";
import {POLITICS_PEOPLE} from "./politics-extra.js";
const manifest=JSON.parse(await readFile(new URL("./kb/manifest.json",import.meta.url),"utf8"));
const index=JSON.parse(await readFile(new URL("./kb/index.json",import.meta.url),"utf8"));
const normal=x=>String(x||"").normalize("NFKC").toLowerCase().replace(/[^\\p{L}\\p{N}]+/gu,"");
const sessions=OWNER_111_SESSIONS;
if(sessions.length!==111)throw Error("Must audit all exactly 111 owner sessions");
const wanted=new Map();
for(let k=0;k<sessions.length;k++)for(const term of [sessions[k].name,...sessions[k].aliases]){
 const q=normal(term);if(!q)continue;
 if(!wanted.has(q))wanted.set(q,new Set());
 wanted.get(q).add(k);
}
const matched=Array.from({length:111},()=>[]);
let scanned=0,pictureRecords=0;
const already=new Set();
function ingest({id,en,bn,aliases=[],image="",credit="",adult=false},source){
 if(!id)return;
 scanned++;
 if(image&&credit&&!adult)pictureRecords++;
 const words=[en,bn,...(aliases||[]),...(manifest.aliases?.[id]||[])];
 const hits=new Set(words.flatMap(w=>[...wanted.get(normal(w))||[]]));
 if(!hits.size)return;
 for(const sessionIndex of hits){
  const key=sessionIndex+":"+id;
  if(already.has(key))continue;
  already.add(key);
  matched[sessionIndex].push({id,en,bn,image:!adult&&credit?image:"",credit:!adult&&image?credit:"",source,adult:!!adult});
 }
}
const curated=[
 ...PERSONAL_RELATIONS,RIDDLEX_CHARACTER,
 ...EXTRA_IDENTITY_PEOPLE,...DOMAIN_PEOPLE,...BROAD_PEOPLE,...BROAD_OBJECTS,
 ...NARRATIVE_PEOPLE,...EVERYDAY_OBJECTS,
 ...RECOGNITION_PEOPLE,...RECOGNITION_ANIMALS,
 ...POLITICS_PEOPLE,
 ...Object.values(EXTRA_HYPOTHESIS_ENTRIES).flat(),
];
for(const person of curated)ingest(person,"curated");
const files=[index.top,index.fiction,...index.buckets.map(x=>x.file)].filter(Boolean);
for(const filename of files){
 const bytes=await readFile(new URL("./kb/"+filename,import.meta.url));
 const data=decodeShard(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),manifest.questions);
 for(let i=0;i<data.count;i++){
  ingest({id:data.ids[i],en:data.ens[i],bn:data.bns[i],
   image:data.images[i],credit:data.credits[i],adult:!!(data.flags[i]&1)},"packed:"+filename);
 }
}
const results=sessions.map((s,i)=>{
 const options=matched[i];
 const best=options.slice().sort((a,b)=>{
  const quality=x=>Number(!!x.bn)*8+Number(!!x.image&&!!x.credit)*4+
    Number(x.source==="curated")*2+Number(x.en?.length>4);
  return quality(b)-quality(a);
 })[0];
 return {session:i+1,batch:s.batch,name:s.name,found:options.length>0,
  bilingual:!!best?.bn,withLicensedPhoto:options.some(x=>!!x.image&&!!x.credit),
  best:best?{id:best.id,en:best.en,bn:best.bn,source:best.source,
    photo:!!best.image,credit:best.credit}:null,
  matches:options.length};
});
const absent=results.filter(x=>!x.found);
const noBn=results.filter(x=>x.found&&!x.bilingual);
const noPhoto=results.filter(x=>x.found&&!x.withLicensedPhoto);
const summary={expected:111,scannedRecords:scanned,packedShards:files.length,
 matched:results.length-absent.length,missing:absent.length,
 bilingual:results.length-absent.length-noBn.length,
 sourceCreditPhotos:results.length-absent.length-noPhoto.length,
 absent:absent.map(x=>x.name),
 missingBengali:noBn.map(x=>x.name),
 photoMissing:noPhoto.map(x=>x.name)};
console.log("OWNER111_AUDIT_SUMMARY "+JSON.stringify(summary));
console.log("OWNER111_AUDIT_ROWS "+JSON.stringify(results.map(x=>({name:x.name,en:x.best?.en,bn:x.best?.bn,found:x.found,photo:x.withLicensedPhoto,source:x.best?.source}))));
const output=join(process.env.RUNNER_TEMP||".","riddlex-owner-111-database-audit.json");
await writeFile(output,JSON.stringify({summary,results},null,2));
