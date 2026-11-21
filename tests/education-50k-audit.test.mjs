import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {auditQuestion} from "../sections/education/question-content.mjs";
import {isAllowedSubject} from "../sections/education/extended-practice.mjs";
import {distinct,selectQuestions,updatedHistory} from "../sections/education/quiz-selection.mjs";
import {DEFAULT_VARIANTS_PER_FAMILY,EXPECTED_SKILL_COUNT,SKILL_SCOPES,
  skillKinds,createSkillItem,createSkillPractice,createSkillNotes} from "../sections/education/skill-practice.mjs";
const source=await readFile(new URL("../sections/education/education-app.mjs",import.meta.url),"utf8");

/* Independent arithmetic oracle: formulas are calculated without reading
   the answer slot or calling the generator's formula functions. */
function independentExpected(family,{a,b,c}) {
  switch(family){
    case "operation":return c*a+c*b;
    case "unknown":return a;
    case "percent":return a*b;
    case "ratio":return a*b;
    case "average":return a+b;
    case "perimeter":return (a+b)*2;
    case "area":return a*b;
    case "triangle":return a*b;
    case "travel":return a*b;
    case "centimetres":return 100*a+b;
    case "gcd":return b;
    case "sequence":return a+4*b;
    case "quadratic":return a;
    case "force":return a*b;
    case "electricalPower":return a*b;
    case "density":return b;
    case "oxygenCount":return a+2*b;
    case "kineticEnergy":return a*b*b;
    case "pressure":return b;
    case "sale":return a*b;
    case "interest":return a*b;
    case "profit":return a*b;
    case "discount":return 100*a-a*b;
    case "vat":return 100*a+a*b;
    case "equity":return 1000*a-1000*b;
    case "inventory":return a*b;
    case "breakEven":return a;
    case "commission":return a*b;
    case "population":return 100*a;
    case "mapScale":return a*b;
    case "votes":return a*b;
    case "speed":return a;
    case "calendar":return 7*a+b;
    case "survey":return a*b;
    default:throw Error("Unhandled family "+family);
  }
}
test("exactly 57,680 new accessible MCQs across every school/exam group",()=>{
  assert.equal(SKILL_SCOPES.length,19);
  assert.equal(DEFAULT_VARIANTS_PER_FAMILY,280);
  assert.equal(EXPECTED_SKILL_COUNT,57680);
  const allQuestions=[];
  const topicFrequency={};
  const scopeCounts={};
  for(const scope of SKILL_SCOPES){
    const [level,streamName]=scope.split(":");
    const stream=streamName==="common"?null:streamName;
    const questions=createSkillPractice(level,stream);
    const expected=skillKinds(level,stream).length*280;
    assert.equal(questions.length,expected,scope+" count");
    assert(questions.length>=2800,scope+" needs broad question availability");
    const lessons=createSkillNotes(level,stream);
    assert.equal(lessons.length,skillKinds(level,stream).length,scope+" lesson coverage");
    for(const note of lessons){
      assert(note.title&&note.concept&&note.example&&note.steps&&note.solution);
      assert(!note.title.includes("operation")&&!note.title.includes("quadratic"),"Show professional Bangla labels");
    }
    scopeCounts[scope]=questions.length;
    for(const q of questions){
      assert(auditQuestion(q),q.id+" invalid MCQ");
      assert.equal(q.kind,"worked-skill");
      assert.equal(q.generated,true);
      assert.equal(q.scope,scope);
      assert(q.chapter.startsWith("দক্ষতাভিত্তিক অনুশীলন: "),q.id+" chapter label");
      assert(!q.chapter.includes("operation")&&!q.chapter.includes("unknown"),q.id+" exposed developer labels");
      assert.equal(Number(q.options[q.answer]),independentExpected(q.family,q.variables),
        q.id+" independent calculation mismatch");
      assert(!q.options.some(x=>String(x).includes("NaN")),q.id);
      if(["9","10","11","12"].includes(level))
        assert(isAllowedSubject(level,stream,q.subject),q.id+" out of stream "+q.subject);
      topicFrequency[q.family]=(topicFrequency[q.family]||0)+1;
      allQuestions.push(q);
    }
  }
  assert.equal(allQuestions.length,57680);
  assert.equal(new Set(allQuestions.map(q=>q.id)).size,57680,"Repeated IDs");
  assert.equal(new Set(allQuestions.map(q=>q.q.trim())).size,57680,
    "Questions must have distinct text across all levels, not duplicate copies");
  assert.equal(Object.keys(topicFrequency).length,34,"Broaden computation to 34 documented skills");
  console.log("EDUCATION_SKILL_AUDIT",JSON.stringify({
    totalNewDistinctStem:allQuestions.length,scopeCounts,
    uniqueSkillFamilies:Object.keys(topicFrequency).length,
    generation:"numerical worked-practice variants; not separately authored facts",
    oracle:"independent formula verification for each of the 57,680 items"
  }));
});
test("100 question test uses fresh items over repeat attempts",()=>{
  const pool=createSkillPractice("11","science");
  const first=selectQuestions(pool,100,[],()=>0.37);
  const history=updatedHistory(pool,100,[],first);
  const next=selectQuestions(pool,100,history,()=>0.72);
  assert.equal(new Set(first.map(x=>x.id)).size,100);
  assert.equal(new Set(next.map(x=>x.id)).size,100);
  assert(!next.some(x=>history.includes(x.id)),"No immediate repeats while unused items available");
});
test("only approved grade-specific, group-specific and BCS scopes are present",()=>{
  assert(!SKILL_SCOPES.some(k=>/^[1-5]:/.test(k)));
  for(const grade of ["6","7","8"])assert(SKILL_SCOPES.includes(grade+":common"));
  for(const grade of ["9","10","11","12","admission"])
    for(const stream of ["science","commerce","arts"])
      assert(SKILL_SCOPES.includes(grade+":"+stream));
  assert(SKILL_SCOPES.includes("bcs:common"));
  assert(source.includes("createSkillPractice(level,stream)"),"Quiz must consume all new scenarios");
  assert(source.includes("createSkillNotes(level,stream)"),"Study Notes must teach new skill groups");
  assert(source.includes("rows.map((row,i)=>makeLesson(row,i))"),
    "Authored chapters must continue appearing alongside generated skills");
});
