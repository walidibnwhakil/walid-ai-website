import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createExamExtras,auditQuestion} from "../sections/education/question-content.mjs";
import {needsStream,isAllowedSubject,createConceptQuestions,createWorkedPractice,conceptNotes,createWorkedLessons} from "../sections/education/extended-practice.mjs";
import {selectQuestions,distinct,updatedHistory} from "../sections/education/quiz-selection.mjs";
import {SCHOOL_ROWS} from "../sections/education/grade-chapters.mjs";
import {BCS_ROWS} from "../sections/education/bcs-chapters.mjs";
import {ADMISSION_ROWS} from "../sections/education/admission-chapters.mjs";
import {makeQuestion,makeLesson,makeChapterOverviews} from "../sections/education/chapter-utils.mjs";
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
test("progressive quiz settings support grade-first streams and BCS 100/200",()=>{
  assert.match(html,/id="quizLevel" required/);
  assert.match(html,/id="quizStreamField" hidden/);
  assert.match(html,/id="quizCountField" hidden/);
  assert.match(html,/id="questionCount" disabled/);
  assert.match(html,/id="quizStartActions" hidden/);
  assert.match(html,/<select class="field-select" id="questionCount"/);
  assert.doesNotMatch(html,/name="questionCount"/,"Do not render six number chips");
  assert.match(app,/STANDARD_QUIZ_COUNTS=Object\.freeze\(\[20,30,40,50,70,100\]\)/);
  assert.match(app,/BCS_QUIZ_COUNTS=Object\.freeze\(\[100,200\]\)/);
  assert.match(app,/if\(level==="bcs"\)return BCS_QUIZ_COUNTS/);
  assert.match(app,/function updateQuizCount\(\)/);
  assert.match(app,/function quizCountChanged\(\)/);
  assert.match(app,/byId\("quizStream"\)\.value=""/);
  assert.match(app,/quizStreamChanged/);
  assert.match(app,/availableQuizCounts\(level,stream\)\.includes\(count\)/);
  assert.match(app,/function chooseAnswer\(index,choice\)/);
  assert.match(app,/function feedback\(card,q,chosen\)/);
  assert.match(html,/id="questionList"/);
  assert.match(css,/\.question-stack\{display:grid/);
  assert.doesNotMatch(html,/id="jumpQuestion"/);
  assert.doesNotMatch(html,/id="bcsNotice"|class="supporting-copy"|class="edu-sources"|class="quiz-instruction"/);
  assert.doesNotMatch(html,/Learning & Preparation/);
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
      assert(new Set(pool.map(q=>q.subject)).size>=(stream?2:1),grade+" "+stream);
      if(!stream)assert(new Set(questions.filter(q=>q.grade===grade).map(q=>q.subject)).size>=5,grade+" curated diversity");
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
  assert(notes.length>=180);
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
  assert.match(css,/\.mode-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\);gap:10px/);
  assert.match(html,/viewBox="0 0 48 48"/);
  assert.match(app,/buildStudyVisual\(note\)/);
  assert.match(css,/\.lesson-illustration svg/);
});


test("new chapter-bank content is grade-specific and BCS/admission covers their own syllabus areas",()=>{
  assert(SCHOOL_ROWS.length>=160,"School topics should cover all grades and stream groups");
  assert(BCS_ROWS.length>=130,"BCS should contain substantive syllabus-area concepts");
  assert(ADMISSION_ROWS.length>=40,"Admission must have dedicated practice");
  for(const level of ["6","7","8","9","10","11","12"]){
    const all=SCHOOL_ROWS.filter(q=>q.level===level);
    assert(all.length>=(Number(level)>=9?27:12),level+" lacks own chapters");
    for(const stream of Number(level)>=9?["science","commerce","arts"]:[null]){
      const scoped=all.filter(q=>!q.stream||q.stream===stream);
      assert(scoped.length>=12,level+" "+stream);
      assert(scoped.every(q=>q.chapter&&q.why&&q.q&&q.correct));
      if(stream){
        const specific=all.filter(q=>q.stream===stream);
        assert(specific.length>=8,level+" "+stream+" lacks stream material");
        assert(specific.every(q=>isAllowedSubject(level,stream,q.subject)));
      }
    }
  }
  assert.equal(new Set(BCS_ROWS.map(q=>q.subject)).size,10,"BCS must cover ten syllabus subjects");
  for(const subject of new Set(BCS_ROWS.map(q=>q.subject)))
    assert(BCS_ROWS.filter(q=>q.subject===subject).length>=10,subject+" BCS coverage");
  for(const stream of ["science","commerce","arts"])
    assert(ADMISSION_ROWS.filter(q=>q.stream===stream).length>=10,"Admission "+stream);
  for(const rows of [SCHOOL_ROWS,BCS_ROWS,ADMISSION_ROWS]){
    const questions=rows.map(makeQuestion);
    assert(questions.every(auditQuestion));
    assert(questions.every(q=>q.chapter));
    assert.equal(distinct(questions).length,questions.length,"Duplicate new chapter MCQ");
    const lessons=rows.map(makeLesson);
    assert(lessons.every(n=>n.concept&&n.explanation&&n.practice&&n.solution));
    const overviews=makeChapterOverviews(rows);
    assert(overviews.length>=5);
    assert(overviews.every(n=>n.concept.split("\n").length>=1&&n.example&&n.practice&&n.solution));
  }
  assert(!SCHOOL_ROWS.some(q=>/^[1-5]$/.test(q.level)),"No primary classes");
  assert.match(app,/chapterRowsFor\(level,stream\)/);
  assert.match(app,/makeChapterOverviews\(rows\)/);
});
