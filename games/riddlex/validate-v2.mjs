import {readFile,readdir} from 'node:fs/promises';import assert from 'node:assert/strict';
const root=new URL('./knowledge/',import.meta.url),read=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const candidates=await read('v2-candidates.json'),labels=await read('v2-labels.json'),evidence=new Map();
const schema=await read('v2-schema.json'),byGroup=Object.fromEntries(Object.entries(schema.properties).map(([p,v])=>[v.group,{...v,property:p}]));
for(const path of await readdir(new URL('v2-evidence/',root))){
 const shard=await read('v2-evidence/'+path);assert.equal(shard.license,'CC0-1.0');
 for(const row of shard.records){assert.ok(!evidence.has(row.qid));evidence.set(row.qid,row);}
}
const ids=new Set(),qids=new Set();
for(const entry of candidates.entries){
 assert.ok(!ids.has(entry.id));ids.add(entry.id);assert.ok(!qids.has(entry.wikidataId));qids.add(entry.wikidataId);
 const row=evidence.get(entry.wikidataId);assert.ok(row);assert.equal(row.license,'CC0-1.0');assert.ok(Number.isInteger(row.revision));assert.ok(Number.isFinite(Date.parse(row.retrievedAt)));
 assert.equal(entry.name,row.labels.en);assert.equal(entry.nameBn,row.labels.bn);
 const claims=new Map(row.statements.map(c=>[c.id,c]));
 const groups=new Set();let clues=0;
 for(const [key,value] of Object.entries(entry.facts)){
  assert.equal(typeof value,'boolean');const pointers=entry.factSources[key];assert.ok(pointers?.length);
  for(const id of pointers){const c=claims.get(id);assert.ok(c);assert.ok(c.rank!=='deprecated');assert.equal(c.mainsnak.snaktype,'value');assert.ok(id.toUpperCase().startsWith(entry.wikidataId.toUpperCase()+'$'));}
  if(key.startsWith('v2_')){
   assert.equal(value,true);groups.add(key.split('_')[1]);clues++;
   assert.ok(candidates.questions[key]);assert.ok(/[\u0980-\u09ff]/.test(candidates.bangla[key]));
   const spec=byGroup[key.split('_')[1]];assert.ok(spec);
   for(const id of pointers){
    const c=claims.get(id),target=c.mainsnak.datavalue.value.id;
    assert.equal(c.mainsnak.property,spec.property);assert.equal(key,'v2_'+spec.group+'_'+target.toLowerCase());assert.notEqual(target,entry.wikidataId);
    assert.ok(labels[target]?.en&&labels[target]?.bn);assert.ok(Number.isInteger(labels[target].revision));
    assert.equal(candidates.questions[key],spec.en+labels[target].en+'?');assert.equal(candidates.bangla[key],spec.bn+labels[target].bn+'?');
   }
  }else if(key.startsWith('born_before_')){
   const years=new Set();for(const id of pointers){const c=claims.get(id),v=c.mainsnak.datavalue.value;assert.equal(c.mainsnak.property,'P569');assert.ok(!c.qualifiers||!Object.keys(c.qualifiers).length);assert.ok(v.precision>=9);assert.equal(v.calendarmodel,'http://www.wikidata.org/entity/Q1985727');assert.match(v.time,/^\+\d{4}-/);years.add(Number(v.time.slice(1,5)));}
   assert.equal(years.size,1);const year=[...years][0],cutoff=Number(key.slice(12));assert.ok([1800,1850,1900,1925,1950,1960,1970,1980,1990,2000].includes(cutoff));assert.equal(value,year<cutoff);
  }else{
   assert.ok(key==='real'||key==='fictional');assert.equal(value,key==='real');
   for(const id of pointers){const c=claims.get(id);assert.equal(c.mainsnak.property,'P31');assert.equal(c.mainsnak.datavalue.value.id,'Q5');}
  }
 }
 const minimum=schema.requirements[entry.category];
 assert.ok(groups.size>=minimum.groups&&clues>=minimum.clues);
}
let accepted=0;
try{
 const promoted=await read('v2-accepted.json');
 for(const e of promoted.entries){const original=candidates.entries.find(c=>c.id===e.id);assert.deepEqual(e,original);accepted++;}
}catch(e){if(e.code!=='ENOENT')throw e;}
console.log(JSON.stringify({eligible:candidates.entries.length,evidence:evidence.size,accepted,relatedLabels:Object.keys(labels).length}));
