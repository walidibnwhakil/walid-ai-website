import test from 'node:test';import assert from 'node:assert/strict';
import {scoreCandidates,nextQuestion,selectGuess} from './engine.js';
import {entries,questions} from './casebook.js';
import {roles,relationshipQuestions} from './relationships.js';
test('301 casebook entries and 15 roles are unique',()=>{const all=[...entries,...roles];assert.equal(new Set(all.map(e=>e.id)).size,all.length);assert.equal(roles.length,15);assert.equal(entries.length,301);});
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

test('conflicting evidence does not yield a confident guess',()=>{
 const ranked=scoreCandidates([{id:'a',name:'A',facts:{x:false}}],[{key:'x',value:'yes'}]);
 assert.equal(selectGuess(ranked,[{key:'x',value:'yes'}],{x:'Question'}),null);
});
test('casebook contains expected Bangladesh-first coverage',()=>{
 for(const id of ['himu','misir-ali','feluda','byomkesh','padmaja','meena','gopal-bhar']){
  assert.ok(entries.some(e=>e.id===id),'Missing '+id);
 }
 assert.ok(entries.filter(e=>e.category==='characters').length>=70);
 assert.ok(entries.filter(e=>e.category==='animals').length>=40);
 assert.ok(entries.filter(e=>e.category==='objects').length>=45);
});
test('each fact key has a matching question',()=>{
 for(const e of entries)for(const key of Object.keys(e.facts))assert.ok(questions[key],e.id+': '+key);
});

test('no two casebook entries share identical known facts in one category',()=>{
 const seen=new Map();
 for(const e of entries){
  const signature=e.category+':'+JSON.stringify(Object.entries(e.facts).sort(([a],[b])=>a.localeCompare(b)));
  assert.ok(!seen.has(signature),e.id+' cannot be distinguished from '+seen.get(signature));
  seen.set(signature,e.id);
 }
});
test('all five answer modes are supported',async()=>{
 const {ANSWERS}=await import('./engine.js');
 assert.deepEqual(ANSWERS,['yes','no','probably','probably-not','unknown']);
});

test('bulk importer rejects unknown facts and duplicate entries',async()=>{
 const {validateImport}=await import('./import-knowledge.mjs');
 const result=validateImport([
  {id:'cat',name:'Duplicate cat',category:'animals',facts:{mammal:true,bird:false}},
  {id:'new-animal-1',name:'Example animal',category:'animals',facts:{mammal:true,bird:false,unsupported:true}},
  {id:'new-animal-2',name:'Insufficient',category:'animals',facts:{mammal:true}}
 ]);
 assert.equal(result.accepted.length,1);
 assert.deepEqual(result.rejected,[0,2]);
 assert.equal(Object.hasOwn(result.accepted[0].facts,'unsupported'),false);
});

test('after eight answers a leading plausible candidate may be guessed early',()=>{
 const sample=[
  {id:'lead',name:'Lead',facts:{a:true,b:true}},
  {id:'other',name:'Other',facts:{a:true,b:false}}
 ];
 const answers=[
  {key:'a',value:'yes'},{key:'b',value:'yes'},
  ...Array.from({length:6},(_,i)=>({key:'unknown'+i,value:'unknown'}))
 ];
 const ranked=scoreCandidates(sample,answers);
 assert.equal(selectGuess(ranked,answers,{a:'A?',b:'B?'}).id,'lead');
});


test('question picker can reach a sparse entry outside the top twenty',()=>{
 const sample=[
  ...Array.from({length:20},(_,i)=>({id:'top'+i,name:'Top '+i,facts:{common:true}})),
  {id:'sparse',name:'Zzz Sparse',facts:{rare:true}}
 ];
 const ranked=scoreCandidates(sample,[]);
 const next=nextQuestion(ranked,[{key:'common',value:'unknown'}],{common:'Common?',rare:'Rare?'});
 assert.equal(next,'rare');
});

test('bulk importer rejects blank names, unsafe IDs and malformed facts',async()=>{
 const {validateImport}=await import('./import-knowledge.mjs');
 const input=[
  {id:'',name:'Empty ID',category:'animals',facts:{mammal:true,bird:false}},
  {id:'../escape',name:'Bad ID',category:'animals',facts:{mammal:true,bird:false}},
  {id:'valid-new',name:'   ',category:'animals',facts:{mammal:true,bird:false}},
  {id:'array-facts',name:'Array',category:'animals',facts:[true,false]},
  {id:'safe-new',name:'Safe',category:'animals',facts:{mammal:true,bird:false}},
  {id:'safe-new',name:'Duplicate',category:'animals',facts:{mammal:true,bird:false}}
 ];
 const result=validateImport(input);
 assert.deepEqual(result.accepted.map(x=>x.id),['safe-new']);
 assert.deepEqual(result.rejected,[0,1,2,3,5]);
});

test('bulk importer rejects different IDs with identical known facts',async()=>{
 const {validateImport}=await import('./import-knowledge.mjs');
 const input=[
  {id:'import-unique-one',name:'First',category:'animals',facts:{mammal:true,bird:false}},
  {id:'import-unique-two',name:'Second',category:'animals',facts:{bird:false,mammal:true}}
 ];
 const result=validateImport(input);
 assert.ok(result.accepted.length<=1,'Indistinguishable records cannot both be imported');
 assert.ok(result.rejected.includes(1),'Later duplicate fact signature must be rejected');
});

test('Bengali question translations refer only to known questions',async()=>{
 const {banglaQuestions}=await import('./questions.bn.js');
 assert.ok(Object.keys(banglaQuestions).length>=100);
 for(const [key,value] of Object.entries(banglaQuestions)){
  assert.ok(questions[key], 'Missing source question for '+key);
  assert.ok(typeof value==='string'&&value.trim().length>5,'Missing Bengali text for '+key);
 }
});

test('changing an earlier answer restores guesses rejected using later evidence',async()=>{
 const {rejectGuess,rewindRejections,rejectedIds}=await import('./history.js');
 let history=rejectGuess([], 'first', 3);
 history=rejectGuess(history,'second',6);
 history=rejectGuess(history,'second',6);
 assert.deepEqual([...rejectedIds(history)],['first','second']);
 assert.deepEqual([...rejectedIds(rewindRejections(history,4))],['first']);
 assert.deepEqual([...rejectedIds(rewindRejections(history,2))],[]);
});

test('casebook photo printer accepts only bundled local images',async()=>{
 const {localPhotoPath}=await import('./print-photo.js');
 assert.equal(localPhotoPath({image:'./images/himu.webp'}),'./images/himu.webp');
 assert.equal(localPhotoPath({image:'https://example.com/photo.png'}),null);
 assert.equal(localPhotoPath({image:'../private.jpg'}),null);
 assert.equal(localPhotoPath({image:'./images/../../secret.png'}),null);
 assert.equal(localPhotoPath({}),null);
});

