import test from 'node:test';
import assert from 'node:assert/strict';
import {entries,questions} from './casebook.js';
import {roles,relationshipQuestions} from './relationships.js';
import {scoreCandidates,nextQuestion,selectGuess} from './engine.js';

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

test('all 171 casebook entries are eventually identified using ideal factual answers',()=>{
 const failures=[],totals=[];
 for(const target of entries){
  const pool=entries.filter(e=>e.category===target.category);
  const result=simulate(target,pool,questions);
  if(!result.correct)failures.push(target.id);
  totals.push(result.questions);
 }
 assert.deepEqual(failures,[]);
 const mean=totals.reduce((a,b)=>a+b,0)/totals.length;
 console.log('Casebook simulation:',{entries:entries.length,averageQuestions:mean,maxQuestions:Math.max(...totals)});
});

test('all relationship roles are eventually identified with ideal answers',()=>{
 const failures=[];
 for(const role of roles)if(!simulate(role,roles,relationshipQuestions).correct)failures.push(role.id);
 assert.deepEqual(failures,[]);
});
