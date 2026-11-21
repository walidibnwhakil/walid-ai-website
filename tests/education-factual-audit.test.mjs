import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {FACT_ROWS,FACT_COUNT,CURRENT_AFFAIRS_COUNT,FACT_CHECKED_ON,
  createFactQuestions,createFactNotes} from "../sections/education/factual-bank.mjs";
import {auditQuestion} from "../sections/education/question-content.mjs";
import {BCS_PRELIM_50_WEIGHTS,bcsQuotas,selectBcsQuestions} from "../sections/education/quiz-selection.mjs";
import {createSkillPractice,EXPECTED_SKILL_COUNT,SKILL_SCOPES} from "../sections/education/skill-practice.mjs";

test("sourced factual BCS bank has distinct propositions and dated 2026 current affairs",()=>{
  assert(FACT_COUNT>=200,"Expected 200+ authored/curated factual propositions");
  assert(CURRENT_AFFAIRS_COUNT>=12,"Expected dated recent-events coverage");
  const quiz=createFactQuestions();
  assert.equal(quiz.length,FACT_COUNT);
  assert(quiz.every(auditQuestion));
  const stems=new Set(),ids=new Set();
  const sourceHosts=new Set();
  for(const q of quiz){
    assert(!stems.has(q.q),"Duplicated factual stem: "+q.q);
    stems.add(q.q);
    assert(!ids.has(q.id),"Duplicate fact ID: "+q.id);
    ids.add(q.id);
    assert(q.why?.length>=18,q.id+" explanation too short");
    assert(q.checkedOn===FACT_CHECKED_ON);
    const parsed=new URL(q.sourceUrl);
    assert.equal(parsed.protocol,"https:");
    assert(!parsed.username&&!parsed.password);
    sourceHosts.add(parsed.hostname);
    if(q.contentKind==="dated-current-affairs"){
      assert(/^202[56]-\d{2}-\d{2}$/.test(q.eventDate),q.id+" missing event date");
      assert(q.eventDate<=FACT_CHECKED_ON,"Future event marked as completed");
      assert(/২০২[৫৬]|২০২৮|UNESCO|COP31|SDG|ECOSOC|World Health Assembly|FIFA/.test(q.q)||q.why.includes("২০২৬"),
        q.id+" ambiguous timestamp");
    }
  }
  assert(sourceHosts.size>=7,"Facts should link across multiple direct reference publishers");
  const notes=createFactNotes();
  assert(notes.length>=12,"Separate subjects and topical notes");
  for(const n of notes)assert(n.subject&&n.title&&n.concept&&n.explanation&&n.example&&n.practice&&n.solution&&n.sourceUrl);
  assert(notes.some(n=>n.title.includes("আন্তর্জাতিক ঘটনাবলি")));
  assert(notes.some(n=>n.title.includes("সাম্প্রতিক বাংলাদেশ")));
  assert(notes.some(n=>n.title.includes("রাজধানী")));
  assert(notes.some(n=>n.title.includes("SDG")||n.title.includes("টেকসই উন্নয়ন")));
  console.log("EDUCATION_FACT_AUDIT",JSON.stringify({
    factPropositions:FACT_COUNT,currentAffairsDated:CURRENT_AFFAIRS_COUNT,
    sourceHosts:[...sourceHosts],topicNotes:notes.length,reviewDate:FACT_CHECKED_ON
  }));
});
test("50th BCS subject weights sum 200 and scaled exams have 10 subjects",()=>{
  assert.equal(BCS_PRELIM_50_WEIGHTS.reduce((sum,[,points])=>sum+points,0),200);
  const keys=BCS_PRELIM_50_WEIGHTS.map(([subject])=>subject);
  assert.equal(new Set(keys).size,10);
  assert.equal(Object.fromEntries(BCS_PRELIM_50_WEIGHTS)["আন্তর্জাতিক বিষয়াবলি"],25);
  for(const count of [20,30,40,50,70,100]){
    const quotas=bcsQuotas(count);
    assert.equal(quotas.length,10);
    assert.equal(quotas.reduce((total,row)=>total+row.quantity,0),count);
    assert(quotas.every(x=>x.quantity>=1));
    if(count===100){
      assert.equal(quotas.find(x=>x.subject==="আন্তর্জাতিক বিষয়াবলি").quantity,13);
      assert.equal(quotas.find(x=>x.subject==="বাংলাদেশ বিষয়াবলি").quantity,13);
    }
  }
});
test("BCS answer sets prioritize factual material while still containing skill exercises",()=>{
  const authored=createFactQuestions();
  const skill=createSkillPractice("bcs",null,130);
  const bank=[...authored,...skill];
  // Each syllabus area must be selectable even with this focused fixture.
  for(const [subject] of BCS_PRELIM_50_WEIGHTS){
    if(bank.some(q=>q.subject===subject))continue;
    const source=authored[0];
    for(let i=0;i<30;i++)bank.push({...source,
      id:"fixture-"+subject+"-"+i,subject,q:subject+"-এর অনুশীলন নির্দেশক "+i+" কোনটি?",
      options:["ক","খ","গ","ঘ"],answer:0,why:"এই প্রশ্নটি কেবল বিষয়ভিত্তিক বরাদ্দ টেস্টের fixture।"});
  }
  const selected=selectBcsQuestions(bank,100);
  assert.equal(selected.length,100);
  assert.equal(new Set(selected.map(x=>x.id)).size,100);
  const counts=Object.fromEntries(BCS_PRELIM_50_WEIGHTS.map(([s])=>[s,selected.filter(x=>x.subject===s).length]));
  for(const {subject,quantity} of bcsQuotas(100))assert.equal(counts[subject],quantity);
  assert(selected.filter(x=>!x.generated).length>=60);
  assert(selected.some(q=>q.generated));
});
test("six-digit numerical count is explicitly separated from independently curated facts",async()=>{
  assert.equal(SKILL_SCOPES.length,19);
  assert.equal(EXPECTED_SKILL_COUNT,103000);
  assert(FACT_COUNT<EXPECTED_SKILL_COUNT);
  const src=await readFile(new URL("../sections/education/skill-practice.mjs",import.meta.url),"utf8");
  assert.match(src,/not 103,000 independently authored/);
  const app=await readFile(new URL("../sections/education/education-app.mjs",import.meta.url),"utf8");
  assert.match(app,/createFactQuestions\(level\)/);
  assert.match(app,/createFactNotes\(level\)/);
  assert.match(app,/selectBcsQuestions\(pool,count,prev\)/);
  assert.match(app,/sourceUrl/);
});
