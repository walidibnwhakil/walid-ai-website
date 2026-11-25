import {loadManifest,decodeShard,attachManifest,poolFromEntries,appendShard,inheritCreditedPortraits} from "./kb.js?v=riddlex-73";
import {factBit,entityView} from "./engine.js?v=riddlex-76";
import {EXTRA_IDENTITY_PEOPLE} from "./identity-facts.js";
import {DOMAIN_PEOPLE} from "./domain-facts.js?v=riddlex-60";
import {BROAD_PEOPLE,BROAD_OBJECTS} from "./broad-facts.js?v=riddlex-73";
import {NARRATIVE_PEOPLE} from "./narrative-facts.js";
import {EVERYDAY_OBJECTS} from "./everyday-facts.js?v=riddlex-71";
import {RECOGNITION_PEOPLE,RECOGNITION_ANIMALS} from "./recognition-facts.js?v=riddlex-71";
import {EXTRA_HYPOTHESIS_ENTRIES} from "./hypothesis-facts.js?v=riddlex-60";
import {UNVERIFIED_OWNER_NAMES} from "./unverified-owner-names.js";
import {RIDDLEX_CHARACTER} from "./personal-facts.js?v=riddlex-62";
import {applyOwnerRecords,normalizeRecordName,RECORD_CATEGORIES} from "./owner-records.js?v=riddlex-76";

const ROOT="/games/riddlex/kb";
export const JOBS=["actor","singer","politician","writer","cricketer","footballer","athlete","scientist","musician","director","business","youtube"];
export const COUNTRIES=["bd","in","pk","us","gb","jp","kr","cn","fr","de","ru","br","ca","au","es","it","mx","ng","eg","tr","id","sa","ar","za"].map(c=>"from_"+c);
const bit=(pool,i,id)=>factBit(pool,i,pool.qIndex.get(id));
export function categoryAt(pool,i){
  return RECORD_CATEGORIES.find(id=>bit(pool,i,id)===2)||"";
}
export function describeRecord(pool,i){
  const cat=categoryAt(pool,i);
  const values=[cat,bit(pool,i,"male")===2?"male":bit(pool,i,"female")===2?"female":"",
    bit(pool,i,"alive")===2?"alive":bit(pool,i,"dead")===2||bit(pool,i,"alive")===1?"deceased":"",
    ...COUNTRIES.filter(q=>bit(pool,i,q)===2).map(q=>q.slice(5).toUpperCase()),
    ...JOBS.filter(q=>bit(pool,i,q)===2)];
  return values.filter(Boolean).join(" · ");
}
export function snapshotRecord(pool,i){
  const v=entityView(pool,i);
  const answers=[];
  for(let qi=0;qi<pool.questions.length;qi++){
    const val=factBit(pool,i,qi);if(val===1||val===2)answers.push({q:pool.questions[qi].id,a:val===2?"yes":"no"});
  }
  return {id:v.id,nameEn:v.en||v.bn,nameBn:v.bn,category:categoryAt(pool,i),adult:v.adult,
    answers,customQuestions:pool.questions.filter(q=>q.ownerQuestion&&answers.some(a=>a.q===q.id)).map(({id,en,bn,category})=>({id,en,bn,category})),image:v.adult?"":v.image,credit:v.adult?"":v.credit,mode:"patch"};
}
export function matchesRecord(pool,i,f){
  if(pool.flags[i]&128)return false;
  const id=pool.ids[i];
  if(f.query){
    const q=normalizeRecordName(f.query);
    if(![id,pool.ens[i],pool.bns[i],...(pool.aliasMap?.get(id)||[])].some(n=>normalizeRecordName(n).includes(q)))return false;
  }
  if(f.category && categoryAt(pool,i)!==f.category)return false;
  if(f.gender==="unknown" && (bit(pool,i,"male")===2||bit(pool,i,"female")===2))return false;
  if(f.gender&&f.gender!=="unknown"&&bit(pool,i,f.gender)!==2)return false;
  const alive=bit(pool,i,"alive"),dead=bit(pool,i,"dead");
  if(f.life==="alive"&&alive!==2&&dead!==1)return false;
  if(f.life==="dead"&&dead!==2&&alive!==1)return false;
  if(f.life==="unknown"&&(alive||dead))return false;
  if(f.country&&bit(pool,i,f.country)!==2)return false;
  if(f.job&&bit(pool,i,f.job)!==2)return false;
  return true;
}
export function catalogFiles(manifest,index,f){
  const files=[];
  const real=!f.category||f.category==="real",fiction=!f.category||f.category==="fictional";
  if(real||fiction)files.push(index.top);
  if(fiction)files.push(index.fiction);
  if(!f.category||f.category==="animal")files.push(...(manifest.groups?.animal||["animals.bin","curated-extra.bin"]));
  if(!f.category||f.category==="object")files.push(...(manifest.groups?.object||["objects.bin","objects-world.bin","curated-extra.bin"]));
  if(real){
    const c=f.country?.slice(5),g=f.gender==="male"?"m":f.gender==="female"?"f":"",l=f.life==="alive"?"a":f.life==="dead"?"d":"";
    const candidates=index.buckets.filter(b=>
      (!c||[c,"xx","multi"].includes(b.c))&&(!g||[g,"u"].includes(b.g))&&(!l||[l,"u"].includes(b.l)));
    // Exact geographic buckets first, unknown/multi citizenship still remain searchable.
    candidates.sort((a,b)=>(a.c===c?0:1)-(b.c===c?0:1));
    files.push(...candidates.map(b=>b.file));
  }
  return [...new Set(files.filter(n=>typeof n==="string"&&/^(?:ix\/)?[a-z0-9-]+\.bin$/.test(n)))];
}
let sourcePromise;
export function catalogSource(){
  if(!sourcePromise)sourcePromise=Promise.all([loadManifest(ROOT),fetch(ROOT+"/index.json?v=riddlex-76").then(r=>{
    if(!r.ok)throw Error("Index HTTP "+r.status);return r.json();
  })]).then(async ([manifest,index])=>{
    const result={manifest,index,portraitPool:null};
    // The game inherits attributed portraits from the starter casebook.
    // Use the same source in the admin catalog, without guessing from names.
    try{
      const response=await fetch(ROOT+"/"+index.top);
      if(response.ok)result.portraitPool=attachManifest(decodeShard(await response.arrayBuffer(),manifest.questions),manifest);
    }catch{/* browsing remains available if the portrait source is offline */}
    return result;
  }).catch(e=>{sourcePromise=null;throw e});
  return sourcePromise;
}
function curatedPool(manifest,reviewed,portraitPool){
  const entries=[...EXTRA_IDENTITY_PEOPLE,...DOMAIN_PEOPLE,...BROAD_PEOPLE,...NARRATIVE_PEOPLE,
    ...RECOGNITION_PEOPLE,...UNVERIFIED_OWNER_NAMES,RIDDLEX_CHARACTER,
    ...BROAD_OBJECTS,...EVERYDAY_OBJECTS,...RECOGNITION_ANIMALS,
    ...(EXTRA_HYPOTHESIS_ENTRIES.object||[]),...(EXTRA_HYPOTHESIS_ENTRIES.animal||[])];
  const unique=[...new Map(entries.filter(Boolean).map(r=>[r.id,r])).values()];
  const pool=poolFromEntries(manifest.questions,inheritCreditedPortraits(portraitPool,unique));
  // The reviewed subset contains complete owner snapshots. It overrides
  // duplicate packaged rows and is browsable even before their shard is read.
  return applyOwnerRecords(pool,reviewed,appendShard,poolFromEntries);
}
export class CatalogBrowser{
  constructor(source,filters,reviewed=[]){
    this.source=source;this.filters=filters;this.reviewed=reviewed;
    this.files=catalogFiles(source.manifest,source.index,filters);
    this.fileIndex=0;this.position=0;this.pool=curatedPool(source.manifest,reviewed,source.portraitPool);
    this.seen=new Set();this.revised=new Set(reviewed.map(r=>r.id));this.scanned=0;this.finished=false;
  }
  async next(signal,onProgress=()=>{}){
    const rows=[];let fetched=0,bytes=0;
    while(rows.length<24){
      if(signal?.aborted)break;
      if(!this.pool || this.position>=this.pool.count){
        this.pool=null;this.position=0;
        if(this.fileIndex>=this.files.length){this.finished=true;break}
        // Bound a manual search batch rather than loading a million names at once.
        if(fetched>=10||bytes>=8*1024*1024)break;
        const file=this.files[this.fileIndex];
        onProgress(this.fileIndex+1,this.files.length);
        let response;
        try{response=await fetch(ROOT+"/"+file,{signal});}catch(error){if(error?.name==="AbortError")break;throw error;}
        if(!response.ok)throw Error("Could not read "+file+" (HTTP "+response.status+")");
        let buffer;
        try{buffer=await response.arrayBuffer();}catch(error){if(error?.name==="AbortError")break;throw error;}
        this.pool=attachManifest(decodeShard(buffer,this.source.manifest.questions),this.source.manifest);
        this.fileIndex++;fetched++;bytes+=buffer.byteLength;
        this.currentFile=file;
      }
      const i=this.position++,pool=this.pool,id=pool.ids[i];this.scanned++;
      if(this.seen.has(id)||this.currentFile&&this.revised.has(id)||!matchesRecord(pool,i,this.filters))continue;
      this.seen.add(id);
      const record=snapshotRecord(pool,i);if(!record.category||!record.nameEn)continue;
      rows.push({record,summary:describeRecord(pool,i),source:this.currentFile||"Verified / reviewed records"});
    }
    return {rows,finished:this.finished,scanned:this.scanned,filesRead:this.fileIndex,totalFiles:this.files.length};
  }
}
