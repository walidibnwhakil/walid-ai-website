import test from "node:test";
import assert from "node:assert/strict";
import {factBit,questionContradicts,createState,recompute} from "./engine.js";
import {poolFromEntries} from "./kb.js";
import {RECOGNITION_QUESTIONS,RECOGNITION_PEOPLE,RECOGNITION_ANIMALS,
        RECOGNITION_FACTS,RECOGNITION_SPECIFIC_IDS} from "./recognition-facts.js";
const basic=["real","fictional","animal","object","named","male","female","alive",
 "actor","athlete","bird","farm","from_bd","from_in","from_gb","from_it","from_us",
 "doctor","lawyer"].map(id=>({id,group:"kind",en:id,bn:id}));
const pool=poolFromEntries([...basic,...RECOGNITION_QUESTIONS],[...RECOGNITION_PEOPLE,...RECOGNITION_ANIMALS]);
test("new career evidence questions always have natural English and Bangla wording",()=>{
 assert.equal(RECOGNITION_QUESTIONS.length,40);
 for(const q of RECOGNITION_QUESTIONS){
  assert.ok(q.en?.length>20,q.id+" English");
  assert.ok(q.bn?.length>12,q.id+" Bangla");
  assert.ok(!/Are you thinking of|তিনি কি (Kate|Monica|John)/i.test(q.en),q.id);
 }
});
test("each person and chicken has two facts including independently distinguishing evidence",()=>{
 assert.equal(RECOGNITION_PEOPLE.length,16);
 assert.equal(RECOGNITION_ANIMALS.length,1);
 const ids=new Set;
 for(const person of [...RECOGNITION_PEOPLE,...RECOGNITION_ANIMALS]){
  assert.ok(!ids.has(person.id),"duplicate "+person.id);ids.add(person.id);
  const facts=RECOGNITION_QUESTIONS.filter(q=>person.yes.includes(q.id));
  assert.ok(facts.length>=2,person.id);
  assert.ok(facts.some(q=>RECOGNITION_SPECIFIC_IDS.includes(q.id)),person.id);
  const i=pool.ids.indexOf(person.id);
  for(const q of facts)
   assert.equal(factBit(pool,i,pool.qIndex.get(q.id)),2,person.id+" "+q.id);
 }
});
test("classifying an Indian film role must wait for confirmed acting",()=>{
 const state=createState(pool,{category:"character"});
 recompute(state);
 assert.equal(questionContradicts(state,"profile_film_mahanati"),true);
 assert.equal(questionContradicts(state,"profile_film_sacred_games"),true);
});
test("an animal requires confirmed poultry before egg or comb questions",()=>{
 const state=createState(pool,{category:"animal"});
 recompute(state);
 assert.equal(questionContradicts(state,"profile_animal_comb"),true);
});
test("English names and Bengali labels denote same record, regardless of language",()=>{
 const names=new Set(RECOGNITION_PEOPLE.map(p=>p.en));
 assert.ok(names.has("Priyanka Chopra Jonas"));
 assert.ok(names.has("Rahil Azam"));
 for(const p of RECOGNITION_PEOPLE) assert.ok(p.bn && p.en && p.bn!==p.en);
});

test("explicit region and film-market facts are preserved across sparse overlays",()=>{
 const more=poolFromEntries([...basic,{id:"from_north_america",group:"country"},
  {id:"career_hollywood_films",group:"job"},{id:"from_cartoon",group:"fiction"},...RECOGNITION_QUESTIONS],RECOGNITION_PEOPLE);
 for(const [id,qid] of [["identity-ana-de-armas","from_north_america"],["identity-tom-cruise","career_hollywood_films"],["identity-cartoon-meena","from_cartoon"]])
  assert.equal(factBit(more,more.ids.indexOf(id),more.qIndex.get(qid)),2,id+" "+qid);
});
