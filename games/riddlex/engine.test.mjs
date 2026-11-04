import test from 'node:test';import assert from 'node:assert/strict';
import {scoreCandidates,nextQuestion,selectGuess} from './engine.js';
import {entries,questions} from './casebook.js';
import {roles,relationshipQuestions} from './relationships.js';
test('starter entries and roles are unique',()=>{const all=[...entries,...roles];assert.equal(new Set(all.map(e=>e.id)).size,all.length);assert.equal(roles.length,15);assert.equal(entries.length,70);});
test('missing facts are not treated as false',()=>{const ranked=scoreCandidates([{id:'a',name:'A',facts:{}},{id:'b',name:'B',facts:{x:false}}],[{key:'x',value:'no'}]);assert.equal(ranked[0].entry.id,'b');assert.equal(ranked[1].score,0);});
test('unknown answer does not penalize candidates',()=>{const ranked=scoreCandidates(entries,[{key:'mammal',value:'unknown'}]);assert.ok(ranked.every(e=>e.score===0));});
test('rejecting a guess excludes it',()=>{const ranked=scoreCandidates(entries,[],new Set(['cat']));assert.ok(!ranked.some(e=>e.entry.id==='cat'));});
test('question picker does not repeat a question',()=>{const ranked=scoreCandidates(entries.filter(e=>e.category==='animals'),[]);const first=nextQuestion(ranked,[],questions);assert.ok(first);assert.notEqual(nextQuestion(ranked,[{key:first,value:'yes'}],questions),first);});
test('distinguishing evidence favors cat over dog',()=>{const ranked=scoreCandidates(entries.filter(e=>e.category==='animals'),[{key:'meows',value:'yes'}]);assert.equal(ranked[0].entry.id,'cat');});
test('relationship branch is answerable',()=>{const ranked=scoreCandidates(roles,[{key:'spouse',value:'yes'},{key:'female',value:'yes'}]);assert.equal(ranked[0].entry.id,'role-wife');assert.ok(Object.keys(relationshipQuestions).length>=10);});
test('tentative guesses require some evidence',()=>{const ranked=scoreCandidates(entries.filter(e=>e.category==='objects'),[]);assert.equal(selectGuess(ranked,[],questions),null);});

test('all unknown answers never produce a guessed identity',()=>{
 const ranked=scoreCandidates(entries.filter(e=>e.category==='animals'),[{key:'pet',value:'unknown'}]);
 assert.equal(selectGuess(ranked,[{key:'pet',value:'unknown'}],questions),null);
});
test('probably answer is weaker than a definite answer',()=>{
 const sample=[{id:'yes',name:'Yes',facts:{x:true}},{id:'no',name:'No',facts:{x:false}}];
 const soft=scoreCandidates(sample,[{key:'x',value:'probably'}]);
 const hard=scoreCandidates(sample,[{key:'x',value:'yes'}]);
 assert.ok(hard[0].score>soft[0].score);
});
test('no candidate is returned after every guess is rejected',()=>{
 const sample=[{id:'one',name:'One',facts:{x:true}}];
 assert.equal(scoreCandidates(sample,[],new Set(['one'])).length,0);
});
