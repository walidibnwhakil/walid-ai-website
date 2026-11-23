import assert from "node:assert/strict";
import test from "node:test";
import { answer, createState, decide, questionBlocked, recompute } from "./engine.js";
import { poolFromEntries } from "./kb.js";
import { PERSONAL_QUESTIONS, PERSONAL_RELATIONS } from "./personal-facts.js";
import { EXTRA_HYPOTHESIS_QUESTIONS, EXTRA_HYPOTHESIS_ENTRIES } from "./hypothesis-facts.js";

const q=[
  {id:"real",group:"kind"}, {id:"fictional",group:"kind"},
  {id:"animal",group:"kind"},{id:"object",group:"kind"},
  {id:"named",group:"kind"},{id:"male",group:"person"},
  {id:"female",group:"person"},{id:"alive",group:"life"},
  {id:"from_bd",group:"country"}, {id:"electronic",group:"object"},
  ...PERSONAL_QUESTIONS, ...EXTRA_HYPOTHESIS_QUESTIONS
].map(x=>({en:x.id,bn:x.id,...x}));

function pool(){
  return poolFromEntries(q, [
    {id:"public-person",en:"Public figure",pop:65535,
      yes:["real","named","male","alive"],no:["object","animal","fictional"]},
    ...PERSONAL_RELATIONS,
    {id:"test-object",en:"Object",pop:150,yes:["object"],no:["real","fictional","animal"]},
  ]);
}
function run(state,answers){
  for(const [id,value] of answers)answer(state,id,value);
  return decide(state);
}
test("best friend is guessed from a confirmed personal relationship, never lost among public figures",()=>{
  const p=pool(),s=createState(p,{category:"character"});recompute(s);
  const d=run(s,[["real","yes"],["knows_you","yes"],["your_family","no"],
    ["your_partner","no"],["your_ex","no"],["your_best_friend","yes"]]);
  assert.equal(d.type,"guess");assert.equal(p.ids[d.index],"riddlex-role-best-friend");
});
test("the self branch opens only after ordinary relationship options are ruled out",()=>{
  const p=pool(),s=createState(p,{category:"character"});recompute(s);
  const d=run(s,[["real","yes"],["knows_you","yes"],["your_family","no"],
    ["your_partner","no"],["your_ex","no"],["your_best_friend","no"],
    ["your_friend","no"]]);
  assert.deepEqual(d,{type:"ask",qid:"your_self"});
  answer(s,"your_self","yes");
  const x=decide(s);
  assert.equal(x.type,"guess");assert.equal(p.ids[x.index],"riddlex-role-self");
});
test("generic personal role does not override a person who denies knowing the player",()=>{
  const p=pool(),s=createState(p,{category:"character"});recompute(s);
  run(s,[["real","yes"],["knows_you","no"]]);
  for(let i=0;i<p.count;i++)
    if(p.ids[i].startsWith("riddlex-role-"))assert.equal(s.weights[i],0,p.ids[i]);
});
test("irrelevant flower and ceiling details are gated by earlier category answers",()=>{
  const p=pool(),s=createState(p,{category:"object"});recompute(s);
  answer(s,"obj_flower_from_plant","no");
  assert.equal(questionBlocked(s,"obj_fragrant_flower"),true);
  assert.equal(questionBlocked(s,"obj_five_spiral_waxy_petals"),true);
  assert.equal(questionBlocked(s,"obj_frangipani_yellow_center"),true);
  answer(s,"obj_moves_air_blades","no");
  assert.equal(questionBlocked(s,"obj_mounted_ceiling"),true);
});

test("phone is recognized from verified functions despite an unrelated high-prior object",()=>{
  const qs=[
    {id:"object",group:"kind"},{id:"real",group:"kind"},{id:"fictional",group:"kind"},
    {id:"animal",group:"kind"},{id:"electronic",group:"object"},
    {id:"tool",group:"object"},{id:"handheld",group:"object"},
    {id:"pocket",group:"object"},{id:"daily_use",group:"object"},
    ...EXTRA_HYPOTHESIS_QUESTIONS,
  ].map(x=>({en:x.id,bn:x.id,...x}));
  const entries=[
    {id:"unrelated",en:"Famous thing",pop:65000,yes:["object"],no:["real","fictional","animal"]},
    {id:"c-phone",en:"Mobile phone",pop:100,yes:["object","electronic","handheld","pocket","daily_use"],no:["real","fictional","animal","tool"]},
    ...EXTRA_HYPOTHESIS_ENTRIES.object,
  ];
  const p=poolFromEntries(qs,entries),state=createState(p,{category:"object"});
  recompute(state);
  const d=run(state,[["electronic","yes"],["handheld","yes"],["pocket","yes"],
    ["daily_use","yes"],["tool","no"],["obj_makes_calls","yes"],
    ["obj_touchscreen","yes"]]);
  assert.equal(d.type,"guess");
  assert.equal(p.ids[d.index],"c-phone");
});
test("pen needs writing/ink evidence and is not guessed from generic handheld tool",()=>{
  const qs=[
    {id:"object",group:"kind"},{id:"real",group:"kind"},{id:"fictional",group:"kind"},
    {id:"animal",group:"kind"},{id:"electronic",group:"object"},
    {id:"tool",group:"object"},{id:"handheld",group:"object"},
    {id:"pocket",group:"object"},{id:"daily_use",group:"object"},
    ...EXTRA_HYPOTHESIS_QUESTIONS,
  ].map(x=>({en:x.id,bn:x.id,...x}));
  const p=poolFromEntries(qs,EXTRA_HYPOTHESIS_ENTRIES.object);
  const state=createState(p,{category:"object"});recompute(state);
  for(const [qid,val] of [["tool","yes"],["handheld","yes"],["pocket","yes"],
    ["daily_use","yes"],["electronic","no"],["obj_writes_paper","yes"]])
    answer(state,qid,val);
  // Ink and marker-tip are general distinguishing questions: no early guess
  // just because pen, marker and pencil are all pocket-sized writing tools.
  assert.equal(decide(state).type,"ask");
  answer(state,"obj_uses_ink","yes");
  answer(state,"obj_broad_marker_tip","no");
  const d=decide(state);
  assert.equal(d.type,"guess");
  assert.equal(p.ids[d.index],"c-pen");
});
