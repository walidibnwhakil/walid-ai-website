// Cheap import gate. Deliberately does not run the simulation or Node test suite.
import assert from 'node:assert/strict';
import {entries,questions} from './casebook.js';
import {banglaQuestions} from './questions.bn.js';
const ids=new Set(),names=new Set(),signatures=new Set(),qids=new Set();
for(const e of entries){
 assert.ok(!ids.has(e.id),'Duplicate id: '+e.id);ids.add(e.id);
 const name=e.name.normalize('NFKC').trim().toLowerCase();
 assert.ok(!names.has(name),'Duplicate name: '+e.name);names.add(name);
 if(e.wikidataId){assert.ok(!qids.has(e.wikidataId));qids.add(e.wikidataId);}
 const signature=e.category+JSON.stringify(Object.entries(e.facts).sort(([a],[b])=>a.localeCompare(b)));
 assert.ok(!signatures.has(signature),'Duplicate fact profile: '+e.id);signatures.add(signature);
 for(const [key,value] of Object.entries(e.facts)){
  assert.equal(typeof value,'boolean');assert.ok(questions[key],'Missing question: '+key);
  if(e.wikidataId){assert.ok(banglaQuestions[key],'Missing Bengali: '+key);assert.ok(e.factSources[key]?.length,'Missing statement provenance: '+e.id+'/'+key);}
 }
 if(e.diagnostic){assert.equal(e.facts[e.diagnostic],true);assert.ok(banglaQuestions[e.diagnostic]);}
 if(e.sources)for(const source of e.sources){assert.equal(new URL(source.url).protocol,'https:');assert.ok(source.locator);}
}
console.log(JSON.stringify({total:entries.length,counts:Object.fromEntries(['characters','animals','objects'].map(c=>[c,entries.filter(e=>e.category===c).length])),wikidata:qids.size}));
