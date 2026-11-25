import assert from "node:assert/strict";
import test from "node:test";
import {normalizeReviewAnswers,recordCategory,withCategory,exactRecordIds,approvedFacts,applyOwnerRecords} from "./owner-records.js";
import {factBit,createState,recompute,inCategory,entityView} from "./engine.js";
import {poolFromEntries,appendShard} from "./kb.js";
import {catalogFiles,matchesRecord,snapshotRecord} from "./admin-catalog.js";

const questions=["real","fictional","animal","object","male","female","alive","dead","from_bd","from_in","actor","cricketer","screen_role_lead","named"].map(id=>({id,en:id,bn:id,group:"kind"}));
const entry={id:"Q21066842",en:"Amin Khan",bn:"আমিন খান",yes:["real","male","alive","from_bd","actor","screen_role_lead"],no:["fictional","animal","object","female","cricketer"]};
const correction={id:entry.id,nameEn:entry.en,nameBn:entry.bn,adult:false,category:"real",mode:"patch",answers:[{q:"actor",a:"no"},{q:"cricketer",a:"yes"},{q:"screen_role_lead",a:"unknown"},{q:"male",a:"yes"},{q:"from_bd",a:"yes"}],image:"",credit:""};

test("new suggestions preserve a complete ordered path including uncertain answers",()=>{
  const path=Array.from({length:90},(_,i)=>({qid:"question_"+i,value:i%2?"probably":"probably_not"}));
  const normalized=normalizeReviewAnswers(path);
  assert.equal(normalized.length,90);
  assert.deepEqual(normalized.map(x=>x.a),path.map(x=>x.value));
  assert.equal(recordCategory([{q:"real",a:"no"},{q:"fictional",a:"yes"}],"character"),"fictional");
  assert.equal(recordCategory([],"animal"),"animal");
  assert.equal(recordCategory([{q:"real",a:"unknown"}],"character"),"");
});

test("approved owner edits override packed and curated facts without duplicating a known identity",()=>{
  let pool=poolFromEntries(questions,[entry]);
  pool=applyOwnerRecords(pool,[correction],appendShard,poolFromEntries);
  assert.equal(pool.count,1);
  assert.equal(factBit(pool,0,pool.qIndex.get("actor")),1);
  assert.equal(factBit(pool,0,pool.qIndex.get("cricketer")),2);
  assert.equal(factBit(pool,0,pool.qIndex.get("screen_role_lead")),0);
  assert.equal(factBit(pool,0,pool.qIndex.get("alive")),2);
  assert.deepEqual(exactRecordIds(pool,"আমিন খান"),[entry.id]);
  pool=appendShard(pool,poolFromEntries(questions,[entry]));
  pool=applyOwnerRecords(pool,[correction],appendShard,poolFromEntries);
  const state=createState(pool,{category:"character"});recompute(state);
  assert.equal(state.alive.length,1);
  assert.equal(entityView(pool,state.alive[0]).id,entry.id);
});

test("owner-added identities are available in the right category even without a matching shard",()=>{
  const newRecord={id:"owner-new-object",nameEn:"Sample object",nameBn:"নমুনা",category:"object",adult:false,answers:[{q:"real",a:"probably"}]};
  const pool=applyOwnerRecords(poolFromEntries(questions,[entry]),[newRecord],appendShard,poolFromEntries);
  const i=pool.ids.indexOf(newRecord.id);
  assert.ok(i>=0);assert.equal(inCategory(pool,i,"object"),true);assert.equal(inCategory(pool,i,"character"),false);
  assert.equal(approvedFacts({...newRecord,answers:[{q:"actor",a:"probably"}]},questions).get("actor"),0);
});

test("the catalog filters by recorded gender, country, profession and name",()=>{
  const pool=poolFromEntries(questions,[entry]);
  assert.ok(matchesRecord(pool,0,{query:"আমিন",category:"real",gender:"male",country:"from_bd",job:"actor"}));
  assert.equal(matchesRecord(pool,0,{job:"cricketer"}),false);
  assert.equal(matchesRecord(pool,0,{gender:"female"}),false);
  const snap=snapshotRecord(pool,0);assert.equal(snap.id,entry.id);
  assert.ok(snap.answers.some(x=>x.q==="actor"&&x.a==="yes"));
  assert.ok(snap.answers.some(x=>x.q==="cricketer"&&x.a==="no"));
});

test("catalog browsing uses indexed country/gender/life buckets and never drops the separate fiction source",()=>{
  const manifest={groups:{animal:["animals.bin"],object:["objects.bin"]}},index={top:"ix/top.bin",fiction:"ix/fiction.bin",buckets:[
    {c:"bd",g:"m",l:"a",file:"ix/bd-m.bin"},{c:"in",g:"m",l:"a",file:"ix/in-m.bin"},
    {c:"bd",g:"f",l:"a",file:"ix/bd-f.bin"},{c:"multi",g:"m",l:"u",file:"ix/multi-m.bin"}]};
  const files=catalogFiles(manifest,index,{category:"real",country:"from_bd",gender:"male",life:"alive"});
  assert.deepEqual(files,["ix/top.bin","ix/bd-m.bin","ix/multi-m.bin"]);
  assert.deepEqual(catalogFiles(manifest,index,{category:"fictional"}),["ix/top.bin","ix/fiction.bin"]);
  assert.deepEqual(catalogFiles(manifest,index,{category:"animal"}),["animals.bin"]);
});
