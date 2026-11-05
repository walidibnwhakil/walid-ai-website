import test from 'node:test';import assert from 'node:assert/strict';
import {scoreCandidates,nextQuestion,selectGuess,factValue} from './engine-v2.js';import {sanitizeEntries} from './knowledge-policy.js';import {noiseBucket} from './simulation-v2.js';
const e=(id,facts)=>({id,name:id,category:'characters',facts});
test('same property/QID across import generations shares evidence and cannot repeat',()=>{
 const entries=[e('legacy',{wd_occupation_q33999:true}),e('new',{v2_occupation_q33999:true}),e('unknown',{})],answers=[{key:'v2_occupation_q33999',value:'yes'}];const ranked=scoreCandidates(entries,answers);
 assert.equal(ranked[0].score,ranked[1].score);assert.equal(ranked[2].score,0);assert.equal(factValue(entries[1],'wd_occupation_q33999'),true);
 assert.equal(nextQuestion(ranked,answers,{wd_occupation_q33999:'Actor?',v2_occupation_q33999:'Actor?'}),null);
 assert.equal(noiseBucket('x','wd_occupation_q33999'),noiseBucket('x','v2_occupation_q33999'));
});
test('correlated profession/country keys cannot manufacture bulk confidence',()=>{
 const candidate=e('x',{actor:true,v2_occupation_q33999:true,indian:true,v2_citizenship_q668:true});const answers=Object.keys(candidate.facts).map(key=>({key,value:'yes'})),r=scoreCandidates([candidate],answers);
 assert.equal(r[0].support,2);assert.equal(selectGuess(r,answers),null);
});
test('identity and bilingual printed-question ambiguity are excluded while coarse dates survive',()=>{
 const source=[{...e('one',{cue_name:true,a:true,b:true,born_before_1950:true,cue_wd_q1:true}),name:'Target One'}];
 const {entries}=sanitizeEntries(source,{cue_name:'Is this Target One?',a:'Place A?',b:'Place B?',born_before_1950:'Born before 1950?',cue_wd_q1:'Exact date?'},{a:'একই স্থান?',b:'একই স্থান?'});
 assert.deepEqual(entries[0].facts,{born_before_1950:true});
});
test('hierarchical roots only take priority when they separate candidates',()=>{
 const pool=Array.from({length:10},(_,i)=>e('x'+i,{real:i<5,detail:i%2===0}));
 assert.equal(nextQuestion(scoreCandidates(pool,[]),[],{real:'Real?',detail:'Detail?'}),'real');
 assert.equal(nextQuestion(scoreCandidates(pool.map(x=>({...x,facts:{...x.facts,real:true}})),[]),[],{real:'Real?',detail:'Detail?'}),'detail');
});
