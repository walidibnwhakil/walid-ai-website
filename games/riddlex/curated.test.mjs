import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {entries,questions} from './casebook.js';
import {generatedEntries} from './knowledge.generated.js';
import {generatedQuestions,generatedBanglaQuestions} from './knowledge.questions.generated.js';
import {compileCurated} from './build-curated.mjs';
import {scoreCandidates,nextQuestion,selectGuess} from './engine.js';

test('216 reviewed records compile exactly to the shipped data and bilingual questions',async()=>{
 const data=compileCurated(await readFile(new URL('./curated-batch.tsv',import.meta.url),'utf8'));
 assert.equal(data.entries.length,216);
 assert.deepEqual(data.entries,generatedEntries);
 assert.deepEqual(data.questions,generatedQuestions);
 assert.deepEqual(data.bangla,generatedBanglaQuestions);
 assert.equal(entries.length,1797);
 const counts=Object.fromEntries(['characters','animals','objects'].map(c=>[c,entries.filter(e=>e.category===c).length]));
 assert.deepEqual(counts,{characters:1600,animals:96,objects:101});
});

test('new entries have provenance, translated diagnostic questions and unique normalized names',()=>{
 assert.equal(new Set(entries.map(e=>e.name.trim().toLowerCase().normalize('NFKC'))).size,entries.length);
 for(const e of generatedEntries){
  assert.equal(e.facts[e.diagnostic],true,e.id);
  assert.ok(generatedQuestions[e.diagnostic]&&generatedBanglaQuestions[e.diagnostic],e.id);
  assert.ok(e.sources.length>0,e.id);
  for(const source of e.sources){
   assert.equal(new URL(source.url).protocol,'https:');
   assert.ok(source.locator.trim());assert.match(source.checkedOn,/^2026-11-0[4-6]$/);
  }
 }
});

test('each new target has positive distinguishing evidence, without rejecting other guesses',()=>{
 for(const e of generatedEntries){
  const pool=entries.filter(x=>x.category===e.category);
  const answers=Object.entries(e.facts).map(([key,value])=>({key,value:value?'yes':'no'}));
  const ranked=scoreCandidates(pool,answers);
  assert.equal(ranked[0].entry.id,e.id,e.id);
  assert.ok(ranked[0].score>ranked[1].score,e.id+' tied');
  assert.equal(selectGuess(ranked,answers,questions)?.id,e.id,e.id);
 }
});

test('omitted diagnostics stay unknown, and unknown answers never add negative evidence',()=>{
 const e=generatedEntries.find(e=>e.id==='hilsa');
 const other=generatedEntries.find(e=>e.id==='rohu');
 assert.equal(other.facts[e.diagnostic],undefined);
 for(const value of ['unknown','no']){
  const row=scoreCandidates([other],[{key:e.diagnostic,value}])[0];
  assert.equal(row.score,0);assert.equal(row.conflicts,0);assert.equal(row.matches,0);
 }
});

test('a diagnostic alone or a probable/unknown diagnostic cannot force an early guess',()=>{
 const e=generatedEntries.find(e=>e.id==='sheikh-mujibur-rahman');
 const other=generatedEntries.find(e=>e.id==='tajuddin-ahmad');
 for(const answers of [
  [{key:e.diagnostic,value:'yes'}],
  [{key:'real',value:'yes'},{key:e.diagnostic,value:'probably'}],
  [{key:'real',value:'yes'},{key:e.diagnostic,value:'unknown'}]
 ])assert.equal(selectGuess(scoreCandidates([e,other],answers),answers,questions),null);
});

test('sparse counting matches a dense picker over evidence leaders, including ties and unknowns',()=>{
 function reference(ranked,answers,bank){
  const asked=new Set(answers.map(a=>a.key));
  function choose(pool){
   let best=null,score=-Infinity;
   for(const key of Object.keys(bank)){
    if(asked.has(key))continue;
    let yes=0,no=0,unknown=0;
    for(const {entry} of pool){
     const v=entry.facts[key];if(v===true)yes++;else if(v===false)no++;else unknown++;
    }
    if(!yes&&!no)continue;
    const q=Math.min(yes,no)*4+(yes+no)*0.2-unknown*0.5;
    if(q>score){score=q;best=key;}
   }
   return best;
  }
  const consistent=ranked.filter(r=>r.conflicts===0),pool=consistent.length?consistent:ranked;
  const leaders=pool[0]?.matches>0?pool.filter(r=>r.score===pool[0].score):pool;
  return choose(leaders.slice(0,20))??choose(leaders);
 }
 for(const category of ['characters','animals','objects']){
  const pool=entries.filter(e=>e.category===category),answers=[];
  for(let turn=0;turn<20;turn++){
   const ranked=scoreCandidates(pool,answers),key=reference(ranked,answers,questions);
   assert.equal(nextQuestion(ranked,answers,questions),key);
   if(!key)break;
   answers.push({key,value:['yes','no','unknown'][turn%3]});
  }
 }
});
