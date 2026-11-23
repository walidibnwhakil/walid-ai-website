import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { BROAD_QUESTIONS, BROAD_FACTS, BROAD_PEOPLE, BROAD_OBJECTS, BROAD_PROFILE_FACTS } from "./broad-facts.js";
import { createState, answer, decide, factBit, questionBlocked } from "./engine.js";
import { poolFromEntries } from "./kb.js";

const base=JSON.parse(await readFile(new URL("./kb/manifest.json",import.meta.url),"utf8")).questions;
const questions=[...base,...BROAD_QUESTIONS];
function game(category,entries){
 const state=createState(poolFromEntries(questions,entries),{category});
 return state;
}
function play(state,answers){
 for(const [qid,value] of answers) answer(state,qid,value);
 return decide(state);
}
test("new question taxonomy has unique bilingual question IDs and valid parent relationships",()=>{
 const ids=new Set(base.map(q=>q.id));
 for(const q of BROAD_QUESTIONS) {
   assert.ok(q.en.length && q.bn.length,q.id);
   assert.ok(!ids.has(q.id),"duplicate "+q.id);
   assert.ok(ids.has(q.parent),"invalid prerequisite "+q.id+" <- "+q.parent);
   ids.add(q.id);
 }
 assert.ok(BROAD_PEOPLE.length>=20);
 assert.ok(BROAD_OBJECTS.length>=3);
});
test("no candidate is positively labelled from a fact absent in its sourced profile",()=>{
 for(const q of BROAD_QUESTIONS){
   const rows=BROAD_FACTS[q.id];
   assert.ok(rows);
   for(const [id,bit] of Object.entries(rows)) {
     assert.ok([1,2].includes(bit));
     assert.ok([...BROAD_PEOPLE,...BROAD_OBJECTS].some(x=>x.id===id));
   }
 }
});
test("cricket question separates past 100-century record holder from current ODI player",()=>{
 const s=game("character",BROAD_PEOPLE.filter(x=>
  ["Virat Kohli","Sachin Tendulkar","Rohit Sharma"].includes(x.en)));
 const d=play(s,[["real","yes"],["knows_you","no"],["male","yes"],["alive","yes"],
  ["from_in","yes"],["cricketer","yes"],["cricket_indian_batsman","yes"]]);
 assert.equal(d.type,"ask");
 assert.equal(d.qid,"cricket_100_centuries");
});
test("real Bangladeshi online-video creator receives a creator-type question",()=>{
 const s=game("character",BROAD_PEOPLE.filter(x=>
  ["Rafsan TheChotobhai","Meher Afroz Shaon","Dipjol"].includes(x.en)));
 const d=play(s,[["real","yes"],["knows_you","no"],["male","yes"],["alive","yes"],
  ["from_bd","yes"],["youtube","yes"]]);
 assert.deepEqual(d,{type:"ask",qid:"creator_food_vlogs"});
});
test("watch is first identified by timekeeping purpose before its form factor",()=>{
 const s=game("object",BROAD_OBJECTS);
 const d=play(s,[["electronic","probably_not"],["food","no"],["vehicle","no"],
  ["daily_use","yes"],["handheld","probably"]]);
 assert.deepEqual(d,{type:"ask",qid:"obj_timekeeping"});
 answer(s,"obj_timekeeping","yes");
 assert.deepEqual(decide(s),{type:"ask",qid:"obj_worn_wrist"});
});
test("a magic lamp clue is not a positive fact about a TV comedy character",()=>{
 assert.equal(BROAD_FACTS.fiction_magic_lamp["riddlex-broad-aladdin"],2);
 assert.equal(BROAD_FACTS.fiction_seven_riddles["riddlex-broad-hatim"],2);
 assert.equal(BROAD_FACTS.fiction_magic_lamp["riddlex-broad-hatim"],undefined);
});
test("validated core attributes remain available when new records are packed sparsely",()=>{
 const s=game("character",BROAD_PEOPLE);
 const i=s.pool.ids.indexOf("riddlex-broad-deepika");
 assert.ok(i>=0);
 assert.equal(factBit(s.pool,i,s.pool.qIndex.get("actor")),2);
 assert.equal(factBit(s.pool,i,s.pool.qIndex.get("from_in")),2);
 assert.equal(BROAD_PROFILE_FACTS.actor["riddlex-broad-deepika"],2);
});
