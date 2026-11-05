import test from 'node:test';import assert from 'node:assert/strict';
import {scoreCandidates,nextQuestion,selectGuess,selectTentativeGuess} from './engine-v2.js';
import {readFile} from 'node:fs/promises';
import {loadCategory} from './runtime-loader.js';
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

const ask=(entries,answers,questions)=>nextQuestion(scoreCandidates(entries,answers),answers,questions);

test('Politician Yes follows the political pool through country, office and era',()=>{
 const entries=[
  entry('a',{politician:true,bangladeshi:true,prime_minister:true,liberation_era:true,writer:true}),
  entry('b',{politician:true,bangladeshi:true,prime_minister:false,liberation_era:false,writer:false}),
  entry('c',{politician:true,bangladeshi:false,prime_minister:false,liberation_era:false}),
  entry('d',{politician:false,scientist:true,actor:true})
 ];
 const questions={bangladeshi:'From Bangladesh?',prime_minister:'Served as prime minister?',
  liberation_era:'Political leader during the Liberation War?',scientist:'Scientist?',actor:'Actor?',
  wd_occupation_q82955:'Worked as a politician?',v2_award_q1:'Won an award?',born_before_1980:'Born before 1980?'};
 const answers=[{key:'politician',value:'yes'}];
 assert.equal(ask(entries,answers,questions),'bangladeshi');
 answers.push({key:'bangladeshi',value:'yes'});
 assert.ok(['prime_minister','liberation_era'].includes(ask(entries,answers,questions)));
 answers.push({key:'prime_minister',value:'unknown'},{key:'liberation_era',value:'unknown'});
 assert.equal(ask(entries,answers,questions),null);
 assert.deepEqual(scoreCandidates(entries,answers),scoreCandidates(entries,answers.slice(0,2)));
});

test('Actor Yes uses screen context and asks about a supported overlapping career only afterward',()=>{
 const entries=[
  entry('a',{actor:true,bollywood:true,filmmaker:true,scientist:true}),
  entry('b',{actor:true,bollywood:true,filmmaker:false,scientist:false}),
  entry('c',{actor:true,bollywood:false,filmmaker:false,scientist:true}),
  entry('d',{actor:false,filmmaker:true,scientist:true})
 ];
 const questions={bollywood:'Known for Bollywood?',filmmaker:'Filmmaker?',scientist:'Scientist?'};
 const answers=[{key:'actor',value:'yes'}];
 assert.equal(ask(entries,answers,questions),'bollywood');
 answers.push({key:'bollywood',value:'yes'});
 assert.equal(ask(entries,answers,questions),'filmmaker');
 answers.push({key:'filmmaker',value:'unknown'});
 assert.equal(ask(entries,answers,questions),null);
});

test('negative and unknown context block contradictory or repetitive follow-ups',()=>{
 const entries=[
  entry('a',{politician:true,bangladeshi:true,prime_minister:true,cue_tajuddin_ahmad:true}),
  entry('b',{politician:true,bangladeshi:false,indian:true,prime_minister:false}),
  entry('c',{politician:false,cartoon:true,boy:true}),
  entry('d',{politician:false,cartoon:false,boy:false})
 ];
 for(const value of ['no','unknown']){
  assert.equal(ask(entries,[{key:'politician',value:'yes'},{key:'prime_minister',value}],{
   cue_tajuddin_ahmad:'First prime minister?',v2_birthplace_q1:'Born in Barishal?',nobel:'Won the Nobel Prize?'
  }),null);
 }
 assert.equal(ask(entries,[{key:'cartoon',value:'no'}],{boy:'Is the cartoon character a boy?'}),null);
 assert.equal(ask(entries,[{key:'politician',value:'yes'},{key:'bangladeshi',value:'unknown'}],{indian:'Indian?'}),null);
 const wrong=entry('wrong',{politician:true,prime_minister:true,real:true,male:true,indian:true,writer:true});
 const answers=['politician','real','male','indian','writer'].map(key=>({key,value:'yes'}));
 answers.push({key:'prime_minister',value:'no'});
 assert.equal(selectGuess(scoreCandidates([wrong],answers),answers),null);
});

test('runtime routes keep categories separate and attach only sourced political facts',async t=>{
 t.mock.method(globalThis,'fetch',async url=>new Response(await readFile(url)));
 const [characters,animals,objects,relationships]=await Promise.all(
  ['characters','animals','objects','relationships'].map(loadCategory)
 );
 for(const [pool,category] of [[characters,'characters'],[animals,'animals'],[objects,'objects'],[relationships,'relationships']]){
  assert.ok(pool.entries.length>0&&pool.entries.every(entry=>entry.category===category));
  if(category!=='characters')assert.equal(pool.questions.prime_minister,undefined);
 }
 const hasina=characters.entries.find(entry=>entry.id==='wd-q52183');
 assert.equal(hasina.facts.prime_minister,true);
 assert.equal(hasina.facts.politics_this_century,true);
 assert.equal(hasina.facts.national_president,undefined);
 assert.ok(['bangladeshi','indian','male','female','bangla','prime_minister','national_president','politics_this_century'].includes(
  ask(characters.entries,[{key:'politician',value:'yes'}],characters.questions)
 ));
 const nehrusClues=['politician','indian','prime_minister','first_indian_pm'].map(key=>({key,value:'yes'}));
 assert.equal(selectGuess(scoreCandidates(characters.entries,nehrusClues),nehrusClues)?.id,'wd-q1047');
 const unknown=Object.keys(characters.questions).slice(0,8).map(key=>({key,value:'unknown'}));
 assert.equal(ask(characters.entries,unknown,characters.questions),null);
});

test('three to eight Probably answers can justify a tentative guess when questions run out',()=>{
 for(let count=3;count<=8;count++){
  const keys=Array.from({length:count},(_,i)=>'clue_'+i);
  const facts=Object.fromEntries(keys.map(key=>[key,true]));
  const rivalFacts=Object.fromEntries(keys.slice(1).map(key=>[key,true]));
  const entries=[entry('lead',facts),entry('rival',rivalFacts)];
  const clues=keys.map(key=>({key,value:'probably'}));
  const ranked=scoreCandidates(entries,clues);
  assert.equal(selectGuess(ranked,clues),null);
  assert.equal(selectTentativeGuess(ranked,clues)?.id,'lead');
  assert.equal(selectTentativeGuess(scoreCandidates([...entries,entry('tie',facts)],clues),clues),null);
  assert.equal(ranked.find(row=>row.entry.id==='rival').support,count-1);
 }
});

test('Probably Not supports recorded negatives and unknown or correlated clues cannot break a tie',()=>{
 const entries=[entry('lead',{x:false,y:true,z:true}),entry('rival',{y:true,z:true})];
 const clues=[{key:'x',value:'probably-not'},{key:'y',value:'probably'},{key:'z',value:'unknown'}];
 const ranked=scoreCandidates(entries,clues);
 assert.equal(selectTentativeGuess(ranked,clues)?.id,'lead');
 assert.deepEqual(ranked,scoreCandidates(entries,clues.slice(0,2)));
 const facts={born_before_1980:true,born_before_1990:true,born_before_2000:true};
 const repeated=Object.keys(facts).map(key=>({key,value:'probably'}));
 assert.equal(selectTentativeGuess(scoreCandidates([entry('lead',facts),entry('rival',{})],repeated),repeated),null);
 assert.equal(selectTentativeGuess(scoreCandidates(entries,clues.map(clue=>({...clue,value:'unknown'}))),clues),null);
});

test('Probably politician encourages an office question without locking out other careers',()=>{
 const entries=[entry('a',{politician:true,prime_minister:true}),entry('b',{politician:true,prime_minister:false}),entry('c',{actor:true})];
 const answers=[{key:'politician',value:'probably'}];
 const questions={prime_minister:'Served as prime minister?',actor:'Actor?'};
 assert.equal(ask(entries,answers,questions),'prime_minister');
 assert.equal(ask(entries,[...answers,{key:'prime_minister',value:'probably-not'}],questions),'actor');
});

test('related animal class and domestication questions count once per group',()=>{
 const facts={mammal:true,bird:false,reptile:false,pet:true,domestic:true,wild:false};
 const clues=Object.entries(facts).map(([key,value])=>({key,value:value?'probably':'probably-not'}));
 const [ranked]=scoreCandidates([entry('cat',facts)],clues);
 assert.equal(ranked.support,2);
 assert.equal(ranked.score,2*Math.log(.7/.3));
});
