import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createPrimaryBank, createExamExtras, auditQuestion} from "../sections/education/question-content.mjs";

const root=new URL("../",import.meta.url);
const questions=JSON.parse(await readFile(new URL("sections/education/questions.json",root),"utf8")).questions;
const notes=JSON.parse(await readFile(new URL("sections/education/notes.json",root),"utf8")).notes;
const html=await readFile(new URL("sections/education/index.html",root),"utf8");
const css=await readFile(new URL("sections/education/education.css",root),"utf8");

test("all allowed question counts are selectable without a subject selector",()=>{
  assert.equal((html.match(/name="questionCount"/g)||[]).length,6);
  for(const amount of [20,30,40,50,70,100])assert.match(html,new RegExp('value="'+amount+'"'));
  assert.match(html,/id="quizLevel"/);
  assert.doesNotMatch(html,/id="quizSubjectSelect"/);
  assert.match(html,/id="openQuiz"/);
  assert.match(html,/id="openNotes"/);
  assert.match(html,/id="notesSubject"/);
});
test("the original 2,547 questions remain available and valid",()=>{
  assert.equal(questions.length,2547);
  assert(questions.every(q=>auditQuestion(q)));
  for(let grade=6;grade<=12;grade++){
    const group=questions.filter(q=>q.grade===grade);
    assert(group.length>=100,"Grade "+grade+" question count");
    assert(new Set(group.map(q=>q.subject)).size>=5,"Grade "+grade+" must cover multiple subjects");
    assert(new Set(group.map(q=>q.q.trim())).size>=100);
  }
});
test("primary grades have enough unique, multi-subject questions for 100-question tests",()=>{
  for(let grade=1;grade<=5;grade++){
    const pool=createPrimaryBank(grade);
    assert(pool.length>=100,"Grade "+grade+" count");
    assert(pool.every(q=>auditQuestion(q)),"Grade "+grade+" invalid option");
    assert(new Set(pool.map(q=>q.q.trim())).size>=100,"Grade "+grade+" duplicate question stems");
    assert(new Set(pool.map(q=>q.subject)).size>=4,"Grade "+grade+" subject diversity");
    for(const subject of new Set(pool.map(q=>q.subject)))
      assert(pool.filter(q=>q.subject===subject).length>=25,"Grade "+grade+" insufficient "+subject);
  }
});
test("BCS-specific practice covers geography, mental reasoning, international and ethics",()=>{
  const items=createExamExtras();
  assert(items.length>=30);
  assert(items.every(auditQuestion));
  assert.equal(new Set(items.map(q=>q.q)).size,items.length);
  for(const subject of ["আন্তর্জাতিক বিষয়াবলি","ভূগোল ও পরিবেশ","মানসিক দক্ষতা","নৈতিকতা ও সুশাসন"])
    assert(items.some(q=>q.subject===subject),subject);
});
test("study notes cover every level, with exam categories and no old placeholder instructions",()=>{
  assert(notes.length>=227);
  for(const level of [...Array.from({length:12},(_,i)=>String(i+1)),"admission","bcs"]){
    const selected=notes.filter(n=>n.scope===level);
    assert(selected.length>0,"Missing "+level);
    assert(new Set(selected.map(n=>n.subject)).size >= (level==="bcs"?10:level==="admission"?5:4),
      "Missing subject options at "+level);
  }
  for(let grade=6;grade<=12;grade++){
    const subjects=new Set(questions.filter(q=>q.grade===grade).map(q=>q.subject));
    const available=new Set(notes.filter(n=>n.scope===String(grade)).map(n=>n.subject));
    for(const subject of subjects)assert(available.has(subject),
      "Missing lesson subject for grade "+grade+": "+subject);
  }
  for(const item of notes){
    assert(item.title?.trim()&&item.concept?.trim()&&item.example?.trim(),"Uninformative note "+item.id);
    assert(!/পাঠের মূল ধারণা শনাক্ত করুন/.test(item.steps||""),"Placeholder steps "+item.id);
    assert(!/বিষয়ে পাঠের গুরুত্বপূর্ণ ধারণাগুলো নিজের ভাষায়/.test(item.practice||""),"Placeholder practice "+item.id);
  }
});
test("landing page preserves branding, footer, and two-column professional mode cards",()=>{
  assert.match(html,/walid-ai-approved-logo.png/);
  assert.match(html,/walid-branding.css/);
  assert.match(html,/class="legal-footer"/);
  assert.match(css,/\.mode-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:520px\)/);
  assert.match(css,/\.mode-grid\{grid-template-columns:1fr/);
});
