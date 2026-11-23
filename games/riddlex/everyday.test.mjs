import assert from "node:assert/strict";
import test from "node:test";
import { createState, answer, factBit, questionBlocked, recompute } from "./engine.js";
import { poolFromEntries } from "./kb.js";
import { EVERYDAY_QUESTIONS, EVERYDAY_OBJECTS, EVERYDAY_FACTS, EVERYDAY_FAMILY_IDS } from "./everyday-facts.js";
const questions=[
 {id:"object",group:"kind",en:"object",bn:"object"},
 {id:"real",group:"kind",en:"real",bn:"real"},
 {id:"fictional",group:"kind",en:"fictional",bn:"fictional"},
 {id:"animal",group:"kind",en:"animal",bn:"animal"},
 ...EVERYDAY_QUESTIONS,
];
const pool=poolFromEntries(questions,EVERYDAY_OBJECTS);
test("every familiar object has a family and independently discernible function",()=>{
 assert.equal(EVERYDAY_OBJECTS.length,35);
 const ids=new Set();
 for(const entry of EVERYDAY_OBJECTS){
   assert.ok(!ids.has(entry.id),"duplicate "+entry.id);
   ids.add(entry.id);
   const family=entry.yes.filter(id=>EVERYDAY_FAMILY_IDS.includes(id));
   const details=entry.yes.filter(id=>id.startsWith("obj_") && !EVERYDAY_FAMILY_IDS.includes(id));
   assert.ok(family.length,entry.en+" missing family");
   assert.ok(details.length,entry.en+" missing distinctive property");
   const index=pool.ids.indexOf(entry.id);
   for(const qid of [...family,...details]) {
     assert.equal(factBit(pool,index,pool.qIndex.get(qid)),2,entry.en+" missing "+qid);
     assert.equal(EVERYDAY_FACTS[qid][entry.id],2);
   }
 }
});
test("electric products are distinguished by their jobs, not a single broad yes",()=>{
 const qs=["obj_computes_data","obj_shows_television","obj_amplifies_sound",
   "obj_remote_control","obj_recharges_battery"];
 const ids=qs.map(qid=>Object.keys(EVERYDAY_FACTS[qid]).filter(id=>EVERYDAY_FACTS[qid][id]===2));
 assert.ok(ids.every(a=>a.length>=1));
 assert.equal(new Set(ids.flat()).size,5);
});
test("family must be confirmed before a specific object question",()=>{
 const state=createState(pool,{category:"object"});
 recompute(state);
 assert.equal(questionBlocked(state,"obj_drinking_glass"),true);
 answer(state,"obj_family_container","yes");
 assert.equal(questionBlocked(state,"obj_drinking_glass"),false);
});
test("independent cream, lotion, petroleum jelly are never equal synonyms",()=>{
 const keys=["obj_skin_cream","obj_skin_lotion","obj_skin_jelly"];
 for(const qid of keys)assert.equal(Object.values(EVERYDAY_FACTS[qid]).filter(v=>v===2).length,1,qid);
});
