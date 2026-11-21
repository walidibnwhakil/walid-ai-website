import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createExamExtras,auditQuestion} from "../sections/education/question-content.mjs";
import {needsStream,isAllowedSubject,createConceptQuestions,createWorkedPractice,conceptNotes,createWorkedLessons} from "../sections/education/extended-practice.mjs";
import {selectQuestions,distinct,updatedHistory} from "../sections/education/quiz-selection.mjs";
const root=new URL("../",import.meta.url);
const questions=JSON.parse(await readFile(new URL("sections/education/questions.json",root),"utf8")).questions;
const notes=JSON.parse(await readFile(new URL("sections/education/notes.json",root),"utf8")).notes;
const html=await readFile(new URL("sections/education/index.html",root),"utf8");
const css=await readFile(new URL("sections/education/education.css",root),"utf8");
const app=await readFile(new URL("sections/education/education-app.mjs",root),"utf8");

test("grade options start at 6 and subject groups are required only at 9–12 and admission",()=>{
  for(let grade=1;grade<=5;grade++)assert(!/values:\[[^\]]*\b[1-5]\b/.test(app.split("const levels=")[1].split("function populateLevels")[0]),
    "No primary-grade option should be available");
  for(const v of ["9","10","11","12","admission"])assert(needsStream(v));
  for(const v of ["6","7","8","bcs"])assert(!needsStream(v));
  assert.match(html,/id="quizStream"/);
  assert.match(html,/id="notesStream"/);
  assert.match(html,/id="quizStreamField" hidden/);
  assert.match(html,/id="notesStreamField" hidden/);
  assert.match(app,/values:\[6,7,8,9,10\]/);
  assert.doesNotMatch(app,/createPrimaryBank/);
});
test("six quiz sizes and stacked instant-feedback experience",()=>{
  assert.equal((html.match(/name="questionCount"/g)||[]).length,6);
  for(const size of [20,30,40,50,70,100])assert.match(html,new RegExp('value="'+size+'"'));
  assert.match(html,/id="questionList"/);
  assert.match(css,/\.question-stack\{display:grid/);
  assert.match(app,/function chooseAnswer\(index,choice\)/);
  assert.match(app,/function feedback\(card,q,chosen\)/);
  assert.match(app,/scrollIntoView\(\{behavior:"smooth",block:"center"\}\)/);
  assert.doesNotMatch(html,/id="jumpQuestion"/);
});
test("preserve 2,547 original grade 6–12 questions, each with answer and explanation",()=>{
  assert.equal(questions.length,2547);
  assert(questions.every(q=>auditQuestion(q)));
  for(let grade=6;grade<=12;grade++){
    const scoped=questions.filter(q=>q.grade===grade);
    assert(scoped.length>=100,grade);
    assert(new Set(scoped.map(q=>q.subject)).size>=5,grade);
  }
});
test("each academic grade/group gets thousands of mathematically checkable variations and conceptual topics",()=>{
  const streams=["science","commerce","arts"];
  let total=0;
  for(let grade=6;grade<=12;grade++){
    for(const stream of grade<9?[null]:streams){
      const pool=createWorkedPractice(String(grade),stream,160).concat(stream?createConceptQuestions(stream,String(grade)):[]);
      assert(pool.length>=750,grade+" "+stream);
      assert(pool.every(auditQuestion),grade+" "+stream+" invalid question");
      assert.equal(distinct(pool).length,pool.length,grade+" "+stream+" duplicate stem");
      assert(new Set(pool.map(q=>q.subject)).size>=2,grade+" "+stream);
      total+=pool.length;
    }
  }
  assert(total>=20000,"Many per-level numeric practice variations required");
  for(const stream of streams){
    const admission=createWorkedPractice("admission",stream,170);
    assert(admission.length>=800);
    assert(admission.every(auditQuestion));
    assert(createConceptQuestions(stream,"admission").length>=30);
  }
  assert(createWorkedPractice("bcs",null,180).length>=500);
  assert(createExamExtras().length>=30);
});
test("no group-specific science or commerce leakage",()=>{
  for(const grade of ["9","10","11","12"]){
    assert(isAllowedSubject(grade,"science","পদার্থবিজ্ঞান"));
    assert(!isAllowedSubject(grade,"commerce","পদার্থবিজ্ঞান"));
    assert(!isAllowedSubject(grade,"arts","পদার্থবিজ্ঞান"));
    assert(isAllowedSubject(grade,"commerce","হিসাববিজ্ঞান"));
    assert(!isAllowedSubject(grade,"arts","হিসাববিজ্ঞান"));
    assert(isAllowedSubject(grade,"arts","ইতিহাস"));
    assert(!isAllowedSubject(grade,"commerce","ইতিহাস"));
    assert(isAllowedSubject(grade,"science","বাংলা"));
    assert(isAllowedSubject(grade,"commerce","ইংরেজি"));
    assert(isAllowedSubject(grade,"arts","তথ্য ও যোগাযোগ প্রযুক্তি"));
  }
  assert(!isAllowedSubject("11","arts","গণিত"));
  assert(isAllowedSubject("10","arts","গণিত"));
  assert(!isAllowedSubject("12","commerce","বাংলাদেশ ও বিশ্বপরিচয়"));
});
test("unseen question ids are preferred over recent rounds, including after refresh",()=>{
  const pool=createWorkedPractice("9","science",150);
  const first=selectQuestions(pool,100,[],()=>0.43);
  assert.equal(first.length,100);
  const history=updatedHistory(pool,100,[],first);
  const second=selectQuestions(pool,100,history,()=>0.72);
  assert.equal(second.length,100);
  assert.equal(new Set(first.map(q=>q.id)).size,100);
  assert.equal(new Set(second.map(q=>q.id)).size,100);
  assert(!second.some(q=>first.some(x=>x.id===q.id)),
    "A second round must not repeat recent questions when enough fresh alternatives exist");
  assert.notDeepEqual(first.map(x=>x.q),second.map(x=>x.q));
});
test("200+ original learning notes plus guided examples and subject explanations",()=>{
  assert(notes.length>=227);
  for(const grade of [6,7,8,9,10,11,12]){
    const scoped=notes.filter(n=>n.scope===String(grade));
    assert(scoped.length>=12);
  }
  for(const stream of ["science","commerce","arts"]){
    for(const level of ["9","10","11","12","admission"]){
      assert(conceptNotes(stream,level).length>=30);
      assert(createWorkedLessons(level,stream).length>=5);
    }
  }
  for(const n of notes){
    assert(n.title?.trim()&&n.concept?.trim()&&n.example?.trim(),n.id);
    assert(!/পাঠের মূল ধারণা শনাক্ত করুন/.test(n.steps||""),n.id);
  }
  assert.match(html,/id="notesSubject"/);
  assert.match(html,/id="notesStream"/);
});
test("brand, footer and mobile layout remain intact",()=>{
  assert.match(html,/walid-ai-approved-logo.png/);
  assert.match(html,/walid-branding.css/);
  assert.match(html,/class="legal-footer"/);
  assert.match(css,/\.mode-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:520px\)/);
});
