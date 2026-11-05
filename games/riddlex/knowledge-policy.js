import {identityKeys} from './runtime-translations.js';
import {canonicalQuestionKey} from './engine-v2.js';
const norm=s=>s.toLocaleLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function sanitizeEntries(source,questions,bangla={}){
 const banned=new Set(identityKeys);
 for(const bank of [questions,bangla]){
  const printed=new Map();
  for(const [key,text] of Object.entries(bank)){
   const signature=norm(text),prior=printed.get(signature);
   if(prior&&canonicalQuestionKey(prior)!==canonicalQuestionKey(key)){banned.add(prior);banned.add(key);}else printed.set(signature,key);
  }
 }
 for(const e of source){
  if(e.category==='relationships')continue;
  const name=norm(e.name.replace(/\s*\([^)]*\)/g,'')),bn=norm(e.nameBn??'');
  for(const key of Object.keys(e.facts))if(name.length>=4&&(' '+norm(questions[key]??'')+' ').includes(' '+name+' ')||bn.length>=4&&(' '+norm(bangla[key]??'')+' ').includes(' '+bn+' '))banned.add(key);
 }
 return {banned,entries:source.map(e=>({...e,facts:Object.fromEntries(Object.entries(e.facts).filter(([k])=>!banned.has(k)&&!k.startsWith('cue_wd_')&&k!=='birth_first_half'))}))};
}
export const canonicalPool=entries=>JSON.stringify([...entries].sort((a,b)=>a.id.localeCompare(b.id)).map(e=>({id:e.id,name:e.name,...(e.nameBn?{nameBn:e.nameBn}:{}),category:e.category,facts:Object.fromEntries(Object.entries(e.facts).sort(([a],[b])=>a.localeCompare(b)))})));
