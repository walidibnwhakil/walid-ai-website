import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compileWikidata} from './build-wikidata.mjs';
import {wikidataEntries,wikidataQuestions,wikidataBanglaQuestions} from './knowledge.wikidata.generated.js';
import {scoreCandidates,selectGuess} from './engine.js';
import {entries,questions} from './casebook.js';
const snapshot=JSON.parse(await readFile(new URL('./knowledge/wikidata-snapshot.json',import.meta.url),'utf8'));

test('CC0 evidence snapshot deterministically compiles to the shipped bilingual batch',()=>{
 const data=compileWikidata(snapshot);
 assert.deepEqual(data.entries,wikidataEntries);assert.deepEqual(data.questions,wikidataQuestions);assert.deepEqual(data.bangla,wikidataBanglaQuestions);
 assert.equal(snapshot.license,'CC0-1.0');
 assert.ok(wikidataEntries.length>=699,'Expansion must exceed 1000 total genuine targets');
});

test('imported targets have distinct QIDs, canonical baseline exclusions and statement provenance',()=>{
 const baseline=new Set(snapshot.baselineQids),seen=new Set();
 for(const e of wikidataEntries){
  assert.ok(!baseline.has(e.wikidataId),'Reimported baseline person '+e.name);
  assert.ok(!seen.has(e.wikidataId));seen.add(e.wikidataId);
  const row=snapshot.records.find(r=>r.qid===e.wikidataId);
  const sourceIds=new Set(Object.values(row.claims).flat().map(c=>c.id));
  for(const [key,refs] of Object.entries(e.factSources)){
   assert.ok(refs.length,key);assert.ok(refs.every(r=>sourceIds.has(r)),key);
   if(e.facts[key]===false)assert.ok(key==='fictional'||key.startsWith('born_before_')||key==='birth_first_half','Unsupported negative: '+key);
  }
  assert.ok(/[\u0980-\u09ff]/.test(e.nameBn));
  assert.ok(Object.keys(e.facts).some(k=>k.startsWith('wd_occupation_')));
 }
});

test('birth-year negatives derive from a documented date, while missing occupational facts remain neutral',()=>{
 const e=wikidataEntries[0],row=snapshot.records.find(r=>r.qid===e.wikidataId),year=Number(row.claims.P569[0].value.time.slice(1,5));
 for(const [key,value] of Object.entries(e.facts))if(key.startsWith('born_before_'))assert.equal(value,year<Number(key.slice(12)));
 const before=scoreCandidates([e],[])[0];
 for(const value of ['unknown','no'])assert.equal(scoreCandidates([e],[{key:'unrecorded_occupation',value}])[0].score,before.score);
});

test('compiler rejects conflicting birth dates, duplicate entities, and unsupported calendars',()=>{
 const one=structuredClone(snapshot);one.records=one.records.slice(0,1);
 const duplicate=structuredClone(one);duplicate.records.push(duplicate.records[0]);assert.throws(()=>compileWikidata(duplicate));
 const ambiguous=structuredClone(one),c=structuredClone(ambiguous.records[0].claims.P569[0]);c.value.time='+1900-01-01T00:00:00Z';ambiguous.records[0].claims.P569.push(c);assert.throws(()=>compileWikidata(ambiguous));
 const calendar=structuredClone(one);calendar.records[0].claims.P569[0].value.calendarmodel='unknown';assert.throws(()=>compileWikidata(calendar));
});

test('each new real person can win with positive factual support and without guess rejection',()=>{
 const pool=entries.filter(e=>e.category==='characters');
 for(const e of wikidataEntries){
  const answers=Object.entries(e.facts).map(([key,value])=>({key,value:value?'yes':'no'}));
  const ranked=scoreCandidates(pool,answers);
  assert.equal(ranked[0].entry.id,e.id,e.id);assert.ok(ranked[0].score>ranked[1].score,e.id);
  assert.equal(selectGuess(ranked,answers,questions)?.id,e.id,e.id);
 }
});

test('contradictory gender statements remain unknown instead of asserting both genders',()=>{
 const source=structuredClone(snapshot);source.records=source.records.filter(r=>r.qid==='Q3763917');assert.equal(source.records.length,1);
 const e=compileWikidata(source).entries[0];assert.equal(e.facts.male,undefined);assert.equal(e.facts.female,undefined);
});
