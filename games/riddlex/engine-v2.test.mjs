import test from 'node:test';import assert from 'node:assert/strict';
import {scoreCandidates,nextQuestion,selectGuess} from './engine-v2.js';
const entry=(id,facts)=>({id,name:id,category:'characters',facts});
test('unknown answers and unrecorded facts have zero likelihood contribution',()=>{
 const es=[entry('a',{}),entry('b',{x:false})];
 assert.ok(scoreCandidates(es,[{key:'x',value:'unknown'}]).every(r=>r.score===0));
 assert.equal(scoreCandidates(es,[{key:'x',value:'no'}]).find(r=>r.entry.id==='a').score,0);
});
test('soft answers are probability updates weaker than definite answers',()=>{
 const es=[entry('a',{x:true}),entry('b',{x:false})];
 const soft=scoreCandidates(es,[{key:'x',value:'probably'}]),hard=scoreCandidates(es,[{key:'x',value:'yes'}]);
 assert.ok(soft[0].probability>0.5&&soft[0].probability<hard[0].probability);
 assert.ok(Math.abs(soft.reduce((s,r)=>s+r.probability,0)-1)<1e-12);
});
test('ten correlated birth cutoffs cannot produce independent support',()=>{
 const facts=Object.fromEntries(Array.from({length:10},(_,i)=>['born_before_'+(1900+i),true]));
 const answers=Object.keys(facts).map(key=>({key,value:'yes'}));
 const ranked=scoreCandidates([entry('a',facts),entry('b',{})],answers);
 assert.equal(ranked[0].support,1);assert.equal(selectGuess(ranked,answers),null);
});
test('overlapping professions remain true and a wrong answer does not eliminate a target',()=>{
 const target=entry('a',{v2_occupation_actor:true,v2_occupation_writer:true,work:true,award:true,school:true,place:true});
 const answers=[{key:'v2_occupation_actor',value:'no'},...['v2_occupation_writer','work','award','school','place'].map(key=>({key,value:'yes'}))];
 const ranked=scoreCandidates([target,entry('b',{})],answers);
 assert.equal(ranked.length,2);assert.equal(ranked[0].entry.id,'a');assert.equal(selectGuess(ranked,answers)?.id,'a');
});
test('balanced known separators precede a rare diagnostic; questions never repeat',()=>{
 const es=Array.from({length:20},(_,i)=>entry('e'+i,{broad:i<10,...(i===0?{rare:true}:{})}));
 const ranked=scoreCandidates(es,[]),questions={broad:'Broad?',rare:'Rare?'};
 assert.equal(nextQuestion(ranked,[],questions),'broad');
 assert.equal(nextQuestion(ranked,[{key:'broad',value:'unknown'}],questions),'rare');
});
test('ties, no support, and one identity-like clue cannot trigger a guess',()=>{
 for(const answers of [[],[{key:'cue_unique',value:'yes'}]]){
  assert.equal(selectGuess(scoreCandidates([entry('a',{cue_unique:true}),entry('b',{})],answers),answers),null);
 }
 const answers=['x','y','z','w'].map(key=>({key,value:'yes'}));
 assert.equal(selectGuess(scoreCandidates([entry('a',{x:true,y:true,z:true,w:true}),entry('b',{x:true,y:true,z:true,w:true})],answers),answers),null);
});
test('rejected guesses stay excluded; changing answers restores likelihoods',()=>{
 const es=[entry('a',{x:true}),entry('b',{x:false})];
 assert.equal(scoreCandidates(es,[{key:'x',value:'no'}])[0].entry.id,'b');
 assert.equal(scoreCandidates(es,[{key:'x',value:'yes'}])[0].entry.id,'a');
 assert.equal(scoreCandidates(es,[],new Set(['a']))[0].entry.id,'b');
});

test('human-friendly questions exclude birthplace and award trivia',()=>{
 const es=[entry('a',{v2_birthplace_q1:true,v2_award_q2:true,actor:true}),entry('b',{v2_birthplace_q1:false,v2_award_q2:false,actor:false})];
 const questions={v2_birthplace_q1:'Born in Barishal?',v2_award_q2:'Won a particular medal?',actor:'Is this person an actor?'};
 assert.equal(nextQuestion(scoreCandidates(es,[]),[],questions),'actor');
 assert.equal(nextQuestion(scoreCandidates(es,[{key:'actor',value:'unknown'}]),[{key:'actor',value:'unknown'}],questions),null);
});
