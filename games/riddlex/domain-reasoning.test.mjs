import assert from "node:assert/strict";
import test from "node:test";
import {answer,createState,decide,factBit,recompute} from "./engine.js";
import {poolFromEntries} from "./kb.js";
import {DOMAIN_QUESTIONS,DOMAIN_PEOPLE,DOMAIN_FACTS} from "./domain-facts.js";

// This deliberately includes alternatives: one broad YES never identifies
// a scientist, company founder, religious speaker or fictional character.
const root=[
  {id:"real",group:"kind"},{id:"fictional",group:"kind"},
  {id:"named",group:"kind"},{id:"male",group:"person"},
  {id:"female",group:"person"},{id:"alive",group:"life"},
  {id:"dead",group:"life"},{id:"from_bd",group:"country"},
  {id:"from_gb",group:"country"},{id:"from_us",group:"country"},
  {id:"from_za",group:"country"},
  {id:"scientist",group:"job"},{id:"writer",group:"job"},
  {id:"business",group:"job"},{id:"politician",group:"job"},
  {id:"youtube",group:"job"},{id:"actor",group:"job"},
  {id:"from_novel",group:"fiction"},{id:"from_bengali_lit",group:"fiction"},
  {id:"from_cartoon",group:"fiction"},{id:"from_film",group:"fiction"},
  {id:"party_jamaat",group:"politics"},{id:"career_bd_mp",group:"politics"},
  ...DOMAIN_QUESTIONS
].map(q=>({en:q.id,bn:q.id,...q}));

function sample(){
 const pool=poolFromEntries(root,DOMAIN_PEOPLE);
 const state=createState(pool,{category:"character"});
 recompute(state);
 return state;
}
function withAnswers(pairs){
 const state=sample();
 for(const [q,a] of pairs)answer(state,q,a);
 return {state,decision:decide(state)};
}
test("domain questions have unique ids, bilingual labels and valid parent hierarchy",()=>{
 const ids=new Set(root.map(q=>q.id));
 assert.equal(ids.size,root.length);
 assert.ok(DOMAIN_PEOPLE.length>=13);
 const names=DOMAIN_PEOPLE.map(x=>x.en);
 assert.equal(new Set(names).size,names.length);
 for(const q of DOMAIN_QUESTIONS){
   assert.ok(q.bn&&q.en, q.id);
   assert.ok(ids.has(q.parent), q.id+" references absent "+q.parent);
   assert.equal(Object.keys(DOMAIN_FACTS[q.id]||{}).length>0,true,q.id);
 }
});
test("a science profession triggers physics, not irrelevant actor trivia",()=>{
 const {decision}=withAnswers([
   ["real","yes"],["male","yes"],["alive","no"],
   ["from_gb","yes"],["scientist","yes"],["writer","yes"]
 ]);
 assert.deepEqual(decision,{type:"ask",qid:"topic_physics"});
});
test("technology business prompts a broad industry question before guessing a CEO",()=>{
 const {decision}=withAnswers([
   ["real","yes"],["male","yes"],["alive","yes"],
   ["from_us","yes"],["business","yes"]
 ]);
 assert.deepEqual(decision,{type:"ask",qid:"topic_technology_business"});
});
test("Bengali novel questions branch from established literary facts",()=>{
 const {decision}=withAnswers([
   ["real","no"],["fictional","yes"],["male","yes"],
   ["from_novel","yes"],["from_bengali_lit","yes"]
 ]);
 assert.deepEqual(decision,{type:"ask",qid:"topic_modern_bengali_novel"});
});
test("Bangladeshi authors may be religious speakers; the answer is checked",()=>{
 const {decision}=withAnswers([
   ["real","yes"],["male","yes"],["alive","yes"],
   ["from_bd","yes"],["writer","yes"]
 ]);
 assert.deepEqual(decision,{type:"ask",qid:"topic_islamic_speaker"});
});
test("sourced domain facts are true only for the actual person",()=>{
 const s=sample(),pool=s.pool;
 const i=id=>pool.ids.indexOf(id);
 const bit=(person,qid)=>factBit(pool,i(person),pool.qIndex.get(qid));
 assert.equal(bit("Q935","topic_classical_motion"),2);
 assert.equal(bit("Q937","topic_classical_motion"),1);
 assert.equal(bit("Q305177","topic_semiconductors"),2);
 assert.equal(bit("Q317521","topic_space_rockets"),2);
 assert.equal(bit("Q317521","topic_semiconductors"),1);
 assert.equal(bit("riddlex-topic-mr-bean","topic_tv_comedy_fiction"),2);
 assert.equal(bit("riddlex-topic-amir-hawlader","topic_elma_behrouz"),2);
 assert.equal(bit("riddlex-topic-shafiqul-masud","topic_jamaat_dhaka_south"),2);
});
