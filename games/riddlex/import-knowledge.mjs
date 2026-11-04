// Validate offline casebook imports. Does not fetch or scrape any websites.
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {entries,questions} from './casebook.js';
export function validateImport(input){
 if(!Array.isArray(input)||input.length>100000)throw Error('Expected at most 100000 records');
 const seen=new Set(entries.map(e=>e.id)),accepted=[],rejected=[];
 for(const [index,item] of input.entries()){
  if(!item||typeof item!=='object'||Array.isArray(item)||typeof item.id!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)||item.id.length>80||typeof item.name!=='string'||!item.name.trim()||item.name.length>160||!['characters','animals','objects'].includes(item.category)||!item.facts||typeof item.facts!=='object'||Array.isArray(item.facts)||seen.has(item.id)){rejected.push(index);continue;}
  const facts=Object.fromEntries(Object.entries(item.facts).filter(([key,value])=>typeof value==='boolean'&&Object.hasOwn(questions,key)));
  if(Object.keys(facts).length<2){rejected.push(index);continue;}
  seen.add(item.id);accepted.push({id:item.id,name:item.name,category:item.category,facts});
 }
 return {accepted,rejected};
}
if(process.argv[1]?.endsWith('import-knowledge.mjs')){
 if(!process.argv[2])throw Error('Usage: node import-knowledge.mjs reviewed.json');
 const data=JSON.parse(await readFile(process.argv[2],'utf8'));
 const result=validateImport(data);
 await writeFile(fileURLToPath(new URL('./knowledge.generated.js',import.meta.url)),'export const generatedEntries='+JSON.stringify(result.accepted)+';\n');
 console.log('Accepted:',result.accepted.length,'Rejected:',result.rejected.length);
}
