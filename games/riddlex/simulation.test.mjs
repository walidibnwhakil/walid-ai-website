import test from 'node:test';
import assert from 'node:assert/strict';
import {entries,questions} from './casebook.js';
import {roles,relationshipQuestions} from './relationships.js';
import {scoreCandidates,nextQuestion,selectGuess} from './engine.js';
import {generatedEntries} from './knowledge.generated.js';

function simulate(target,pool,questionBank){
 const answers=[],rejected=new Set(),maxTurns=Object.keys(questionBank).length+pool.length+2;
 for(let turn=0;turn<maxTurns;turn++){
  const ranked=scoreCandidates(pool,answers,rejected);
  const guess=selectGuess(ranked,answers,questionBank);
  if(guess){
   if(guess.id===target.id)return {correct:true,questions:answers.length,rejected:rejected.size};
   rejected.add(guess.id);
   continue;
  }
  const key=nextQuestion(ranked,answers,questionBank);
  if(!key)return {correct:false,questions:answers.length,rejected:rejected.size};
  const value=target.facts[key]===undefined?'unknown':target.facts[key]?'yes':'no';
  answers.push({key,value});
 }
 return {correct:false,questions:answers.length,rejected:rejected.size};
}

test('all 1797 casebook entries are eventually identified using ideal factual answers',()=>{
 const failures=[],totals=[],slow=[],batch=[],results=[];
 const batchIds=new Set(generatedEntries.map(e=>e.id));
 for(const target of entries){
  const pool=entries.filter(e=>e.category===target.category);
  const result=simulate(target,pool,questions);
  if(!result.correct)failures.push(target.id);
  totals.push(result.questions);
  results.push(result);
  if(batchIds.has(target.id))batch.push(result);
  if(result.questions>=60)slow.push({id:target.id,questions:result.questions});
 }
 assert.deepEqual(failures,[]);
 const mean=totals.reduce((a,b)=>a+b,0)/totals.length;
 const summarize=rows=>({targets:rows.length,correct:rows.filter(r=>r.correct).length,
  averageQuestions:rows.reduce((a,r)=>a+r.questions,0)/rows.length,
  maxQuestions:Math.max(...rows.map(r=>r.questions)),
  firstGuessCorrect:rows.filter(r=>r.rejected===0&&r.correct).length,
  maxRejected:Math.max(...rows.map(r=>r.rejected))});
 console.log('Casebook simulation:',{casebook:summarize(results),curated:summarize(batch),slowTargets:slow.sort((a,b)=>b.questions-a.questions).slice(0,10)});
 assert.ok(mean<35,'Average question count has regressed above 35');
});

test('all relationship roles are eventually identified with ideal answers',()=>{
 const failures=[];
 for(const role of roles)if(!simulate(role,roles,relationshipQuestions).correct)failures.push(role.id);
 assert.deepEqual(failures,[]);
});

test('sparse everyday objects remain discoverable after focused candidates are exhausted',()=>{
 const ids=['scissors','toothbrush','soap','mirror'];
 for(const id of ids){
  const target=entries.find(e=>e.id===id);
  assert.ok(target,'Missing target '+id);
  const result=simulate(target,entries.filter(e=>e.category===target.category),questions);
  assert.equal(result.correct,true,id+' must be discoverable after retry');
 }
});

