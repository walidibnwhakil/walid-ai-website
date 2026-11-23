import assert from "node:assert/strict";
import test from "node:test";
import { createState, answer, decide, factBit, recompute, questionBlocked } from "./engine.js";
import { poolFromEntries } from "./kb.js";
import { NARRATIVE_QUESTIONS, NARRATIVE_PEOPLE, NARRATIVE_FACTS } from "./narrative-facts.js";

// Compact, independently checked version of the source-backed narrative
// taxonomy. The full casebook must also pass real-browser gameplay QA.
const base = [
 {id:"real",group:"kind"}, {id:"fictional",group:"kind"},
 {id:"named",group:"kind"}, {id:"male",group:"person"},
 {id:"female",group:"person"}, {id:"from_us",group:"country"},
 {id:"from_es",group:"country"}, {id:"politician",group:"job"},
 {id:"actor",group:"job"}, {id:"from_novel",group:"fiction"},
 {id:"knows_you",group:"personal"},
 ...NARRATIVE_QUESTIONS
].map(q=>({en:q.id,bn:q.id,...q}));
const pool=poolFromEntries(base,NARRATIVE_PEOPLE);
test("distinctive classical narrative traits identify separate characters",()=>{
 for(const [id,clues] of [
  ["narrative-arjuna",["story_indian_epic","story_mahabharata","story_pandava"]],
  ["narrative-krishna",["story_indian_epic","story_mahabharata","story_charioteer_guide"]],
  ["narrative-karna",["story_indian_epic","story_mahabharata","story_karna_armor"]],
  ["narrative-bhishma",["story_indian_epic","story_mahabharata","story_lifelong_vow"]],
  ["narrative-rama",["story_indian_epic","story_ramayana","story_sita_husband"]],
  ["narrative-lakshmana",["story_indian_epic","story_ramayana","story_rama_brother"]],
  ["narrative-ravana",["story_indian_epic","story_ramayana","story_lanka_king"]],
  ["narrative-james-bond",["story_secret_agent","story_agent_007"]],
 ]) {
   const i=pool.ids.indexOf(id);
   assert.ok(i>=0,id);
   for(const qid of clues)assert.equal(factBit(pool,i,pool.qIndex.get(qid)),2,id+" "+qid);
 }
});
test("no direct clues without established parent story or profession",()=>{
 const state=createState(pool,{category:"character"});
 recompute(state);
 assert.equal(questionBlocked(state,"story_pandava"),true);
 answer(state,"real","no");answer(state,"fictional","yes");
 assert.equal(questionBlocked(state,"story_pandava"),true);
 answer(state,"story_indian_epic","yes");
 answer(state,"story_mahabharata","yes");
 assert.equal(questionBlocked(state,"story_pandava"),false);
});
test("the same prophet identity can be named Jesus or Isa without two competing records",()=>{
 const people=NARRATIVE_PEOPLE.filter(x=>x.id==="narrative-jesus-isa");
 assert.equal(people.length,1);
 const p=people[0];
 for(const alias of ["Jesus","Isa","ঈসা","যিশু"]) assert.ok(p.aliases.includes(alias));
 for(const qid of ["history_religious_prophet","history_jesus_isa"])
   assert.equal(NARRATIVE_FACTS[qid][p.id],2);
});
test("shared espionage profession does not imply the 007 number",()=>{
 assert.equal(NARRATIVE_FACTS.story_secret_agent["narrative-james-bond"],2);
 assert.equal(NARRATIVE_FACTS.story_secret_agent["narrative-ethan-hunt"],2);
 assert.equal(NARRATIVE_FACTS.story_agent_007["narrative-james-bond"],2);
 assert.equal(NARRATIVE_FACTS.story_agent_007["narrative-ethan-hunt"],1);
});
