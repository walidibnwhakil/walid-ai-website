import {createExamExtras,auditQuestion} from "./question-content.mjs";
import {STREAMS,needsStream,isAllowedSubject,createWorkedPractice,createWorkedLessons} from "./extended-practice.mjs";
import {makeQuestion,makeLesson,makeChapterOverviews} from "./chapter-utils.mjs";
import {SCHOOL_ROWS} from "./grade-chapters.mjs";
import {BCS_ROWS} from "./bcs-chapters.mjs";
import {ADMISSION_ROWS} from "./admission-chapters.mjs";
import {selectQuestions,selectBcsQuestions,updatedHistory} from "./quiz-selection.mjs";
import {createSkillPractice,createSkillNotes} from "./skill-practice.mjs";
import {createFactQuestions,createFactNotes,FACT_CHECKED_ON} from "./factual-bank.mjs";

const byId=id=>document.getElementById(id);
const views=["modeSelection","quizSetup","quizRunning","quizResults","notesSetup"];
const labels={admission:"বিশ্ববিদ্যালয় ভর্তি প্রস্তুতি",bcs:"BCS প্রিলিমিনারি প্রস্তুতি"};
const bn=value=>new Intl.NumberFormat("bn-BD").format(value);
const el=(tag,text,className)=>{
  const node=document.createElement(tag);
  if(text!==undefined&&text!==null)node.textContent=String(text);
  if(className)node.className=className;
  return node;
};
const levels=[
  {label:"মাধ্যমিক স্তর",values:[6,7,8,9,10]},
  {label:"উচ্চমাধ্যমিক স্তর",values:[11,12]},
  {label:"প্রতিযোগিতামূলক পরীক্ষা",values:["admission","bcs"]}
];
const levelName=level=>labels[level]||"শ্রেণি "+bn(Number(level));
const levelAndStream=(level,stream)=>levelName(level)+(needsStream(level)&&stream?" · "+STREAMS[stream]:"");
function populateLevels(select){
  select.replaceChildren(new Option("শ্রেণি বা পরীক্ষার বিভাগ নির্বাচন করুন",""));
  for(const group of levels){
    const optgroup=el("optgroup");
    optgroup.label=group.label;
    for(const level of group.values)optgroup.append(new Option(levelName(String(level)),String(level)));
    select.append(optgroup);
  }
  select.value="";
}
let questionBank=null,bankPromise=null,baseNotes=null,notesPromise=null,activeTest=null,advanceTimer=null;
function clearAdvance(){if(advanceTimer!==null){clearTimeout(advanceTimer);advanceTimer=null}}
function changeView(id){
  clearAdvance();
  for(const key of views)byId(key).hidden=(key!==id);
  document.querySelector(".edu-hero").hidden=id!=="modeSelection";
  byId("quizStatus").hidden=true;
  if(id!=="notesSetup")byId("notesStatus").hidden=true;
  if(id!=="modeSelection")byId(id).scrollIntoView({behavior:"instant",block:"start"});
}
function status(id,text,error=false){
  const target=byId(id);
  target.textContent=text;
  target.classList.toggle("is-error",error);
  target.hidden=false;
}
async function fetchBank(){
  if(questionBank)return questionBank;
  if(!bankPromise)bankPromise=fetch("/sections/education/questions.json")
    .then(r=>{if(!r.ok)throw Error("Question bank unavailable");return r.json()})
    .then(data=>{
      if(!Array.isArray(data.questions)||data.questions.length<2000||data.questions.some(q=>!auditQuestion(q)))throw Error("Invalid question bank");
      questionBank=data.questions;return questionBank;
    }).finally(()=>{bankPromise=null});
  return bankPromise;
}
async function fetchNotes(){
  if(baseNotes)return baseNotes;
  if(!notesPromise)notesPromise=fetch("/sections/education/notes.json")
    .then(r=>{if(!r.ok)throw Error("Study Notes unavailable");return r.json()})
    .then(data=>{if(!Array.isArray(data.notes)||data.notes.length<170)throw Error("Invalid study notes");baseNotes=data.notes;return baseNotes})
    .finally(()=>{notesPromise=null});
  return notesPromise;
}
const countChosen=()=>Number(document.querySelector('input[name="questionCount"]:checked')?.value||20);
const normalized=(q,id,subject)=>({id:String(id),q:q.q,grade:q.grade,subject:subject||q.subject,
    options:q.options.map(String),answer:q.answer,why:q.why||"সংশ্লিষ্ট পাঠের ব্যাখ্যা পর্যালোচনা করুন।"});

function chapterRowsFor(level,stream){
  const rows=level==="bcs"?BCS_ROWS:level==="admission"?ADMISSION_ROWS:SCHOOL_ROWS;
  return rows.filter(row=>row.level===level&&(!row.stream||row.stream===stream));
}
function chapterQuestions(level,stream){
  return chapterRowsFor(level,stream).map((row,i)=>makeQuestion(row,i));
}
function questionPool(level,stream,questions){
  if(["6","7","8"].includes(level))
    return questions.filter(q=>q.grade===Number(level)).map(q=>normalized(q,"base-"+q.id))
      .concat(chapterQuestions(level,stream),createWorkedPractice(level,null,160),createSkillPractice(level,stream));
  if(["9","10","11","12"].includes(level)){
    const base=questions.filter(q=>q.grade===Number(level)&&isAllowedSubject(level,stream,q.subject))
      .map(q=>normalized(q,"base-"+q.id));
    return base.concat(chapterQuestions(level,stream),createWorkedPractice(level,stream,160),createSkillPractice(level,stream));
  }
  if(level==="admission"){
    const common=new Set(["বাংলা","ইংরেজি","বাংলাদেশ ও বিশ্বপরিচয়","তথ্য ও যোগাযোগ প্রযুক্তি"]);
    const base=questions.filter(q=>(q.grade===11||q.grade===12)&&
      (common.has(q.subject)||(stream==="science"&&["গণিত","পদার্থবিজ্ঞান","বিজ্ঞান"].includes(q.subject))))
      .map(q=>normalized(q,"admission-"+q.id,({
        গণিত:"গণিত ও যুক্তি",পদার্থবিজ্ঞান:"পদার্থবিজ্ঞান",বিজ্ঞান:"জীববিজ্ঞান",
        "বাংলাদেশ ও বিশ্বপরিচয়":"সাধারণ জ্ঞান"
      })[q.subject]||q.subject));
    return base.concat(chapterQuestions(level,stream),createWorkedPractice(level,stream,170),createSkillPractice(level,stream));
  }
  if(level==="bcs"){
    const general={বাংলা:"বাংলা ভাষা ও সাহিত্য",ইংরেজি:"ইংরেজি ভাষা ও সাহিত্য",
      গণিত:"গাণিতিক যুক্তি",বিজ্ঞান:"সাধারণ বিজ্ঞান",পদার্থবিজ্ঞান:"সাধারণ বিজ্ঞান",
      "বাংলাদেশ ও বিশ্বপরিচয়":"বাংলাদেশ বিষয়াবলি",
      "তথ্য ও যোগাযোগ প্রযুক্তি":"কম্পিউটার ও তথ্যপ্রযুক্তি"};
    return questions.filter(q=>q.grade>=9&&q.grade<=12&&general[q.subject])
      .map(q=>normalized(q,"bcs-"+q.id,general[q.subject]))
      .concat(chapterQuestions(level,stream),createExamExtras(),createFactQuestions(level),createWorkedPractice(level,null,180),createSkillPractice(level,stream));
  }
  return [];
}
function getHistory(key){
  try{
    const parsed=JSON.parse(localStorage.getItem("walid-edu-recent-v2:"+key)||"[]");
    return Array.isArray(parsed)?parsed.filter(x=>typeof x==="string").slice(-1200):[];
  }catch{return []}
}
function storeHistory(key,items){
  try{localStorage.setItem("walid-edu-recent-v2:"+key,JSON.stringify(items))}catch{}
}
function syncStream(levelSelect,streamSelect,wrapper){
  const needed=needsStream(byId(levelSelect).value);
  byId(wrapper).hidden=!needed;
  byId(streamSelect).disabled=!needed;
  if(!needed)byId(streamSelect).value="";
}
function quizSetupChanged(){syncStream("quizLevel","quizStream","quizStreamField");byId("bcsNotice").hidden=byId("quizLevel").value!=="bcs"}
const questionTotal=()=>activeTest?.questions.length||0;
function refreshProgress(){
  if(!activeTest)return;
  const done=activeTest.responses.filter(v=>v!==null).length;
  const total=questionTotal();
  byId("quizCounter").textContent="উত্তর দিয়েছেন "+bn(done)+" / "+bn(total);
  byId("quizSubject").textContent=levelAndStream(activeTest.level,activeTest.stream);
  byId("quizProgress").max=total;
  byId("quizProgress").value=done;
  byId("answeredCount").textContent=bn(total-done)+"টি অনুত্তরিত";
}
function feedback(card,q,chosen){
  const valid=chosen===q.answer;
  const buttons=card.querySelectorAll(".question-option");
  buttons.forEach((b,i)=>{
    b.disabled=true;
    b.setAttribute("aria-pressed",String(chosen===i));
    if(i===q.answer)b.classList.add("is-correct");
    if(chosen===i&&!valid)b.classList.add("is-wrong");
  });
  const note=card.querySelector(".question-feedback");
  note.className="question-feedback "+(valid?"is-correct":"is-wrong");
  note.replaceChildren(el("strong",valid?"✓ সঠিক উত্তর":"✕ উত্তরটি সঠিক নয়"));
  if(!valid)note.append(el("p","সঠিক উত্তর: "+q.options[q.answer]));
  note.append(el("p","ব্যাখ্যা: "+q.why));
  if(q.sourceUrl){
    const citation=el("a","তথ্যসূত্র দেখুন","question-source");
    citation.href=q.sourceUrl;citation.target="_blank";citation.rel="noopener noreferrer";
    note.append(citation);
    if(q.eventDate)note.append(el("span"," · ঘটনা: "+q.eventDate+" · যাচাই: "+q.checkedOn,"source-date"));
  }
  note.hidden=false;
  card.classList.add("is-answered");
  card.classList.toggle("was-correct",valid);
}
function chooseAnswer(index,choice){
  const current=activeTest;
  if(!current||current.responses[index]!==null)return;
  current.responses[index]=choice;
  const card=byId("question-"+index);
  feedback(card,current.questions[index],choice);
  refreshProgress();
  byId("finishConfirm").hidden=true;
  clearAdvance();
  const wait=choice===current.questions[index].answer?600:1900;
  advanceTimer=setTimeout(()=>{
    if(activeTest!==current)return;
    advanceTimer=null;
    const next=current.responses.findIndex((value,i)=>i>index&&value===null);
    if(next>=0){
      const target=byId("question-"+next);
      target?.scrollIntoView({behavior:"smooth",block:"center"});
    }else{
      const firstUnanswered=current.responses.indexOf(null);
      if(firstUnanswered>=0)byId("question-"+firstUnanswered)?.scrollIntoView({behavior:"smooth",block:"center"});
      else showResults();
    }
  },wait);
}
function drawQuestions(){
  const current=activeTest;
  const list=byId("questionList");
  const fragment=document.createDocumentFragment();
  current.questions.forEach((q,i)=>{
    const card=el("article",undefined,"question-card");
    card.id="question-"+i;
    card.dataset.contentType=q.generated?"worked-variant":"authored-concept";
    card.dataset.sourceLinked=q.sourceUrl?"yes":"no";
    const heading=el("div",undefined,"question-card-head");
    heading.append(el("span","প্রশ্ন "+bn(i+1)+" / "+bn(current.questions.length),"question-number"),
      el("span",q.subject,"quiz-subject"));
    card.append(heading,el("h3",q.q));
    if(q.chapter)card.append(el("p","বিষয়ভিত্তিক পাঠ: "+q.chapter,"question-chapter"));
    const options=el("div",undefined,"question-options");
    for(let position=0;position<4;position++){
      const button=el("button",undefined,"question-option");
      button.type="button";
      button.setAttribute("aria-pressed","false");
      button.append(el("span",["ক","খ","গ","ঘ"][position],"option-letter"),el("span",q.options[position]));
      button.addEventListener("click",()=>chooseAnswer(i,position));
      options.append(button);
    }
    const feedbackEl=el("div",undefined,"question-feedback");
    feedbackEl.hidden=true;
    feedbackEl.setAttribute("aria-live","polite");
    card.append(options,feedbackEl);
    fragment.append(card);
  });
  list.replaceChildren(fragment);
  refreshProgress();
}
async function startQuiz(){
  const level=byId("quizLevel").value,stream=byId("quizStream").value;
  if(!level){status("quizStatus","প্রথমে শ্রেণি বা পরীক্ষার বিভাগ নির্বাচন করুন।",true);byId("quizLevel").focus();return}
  if(needsStream(level)&&!STREAMS[stream]){
    status("quizStatus","অনুগ্রহ করে Science, Commerce বা Arts বিভাগ নির্বাচন করুন।",true);
    byId("quizStream").focus();return;
  }
  const button=byId("startQuiz");
  button.disabled=true;
  status("quizStatus","প্রশ্ন সাজানো হচ্ছে…");
  try{
    const bank=await fetchBank();
    const pool=questionPool(level,stream,bank).filter(auditQuestion);
    const count=countChosen(),key=level+":"+(stream||"common");
    const prev=getHistory(key);
    const selected=level==="bcs"?selectBcsQuestions(pool,count,prev):selectQuestions(pool,count,prev);
    storeHistory(key,updatedHistory(pool,count,prev,selected));
    activeTest={questions:selected,level,stream,responses:Array(count).fill(null)};
    byId("runningLevel").textContent=levelAndStream(level,stream)+" · "+bn(count)+"টি প্রশ্ন";
    changeView("quizRunning");
    byId("finishConfirm").hidden=true;
    drawQuestions();
  }catch(error){
    status("quizStatus","প্রশ্ন প্রস্তুত করা যায়নি। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।",true);
    console.error("Education quiz setup failed",error);
  }finally{button.disabled=false}
}
const stat=(value,label)=>{
  const node=el("div",undefined,"stat");
  node.append(el("strong",bn(value)),el("span",label));
  return node;
};
function showResults(){
  if(!activeTest)return;
  clearAdvance();
  const current=activeTest;
  const total=current.questions.length,answered=current.responses.filter(v=>v!==null).length;
  const correct=current.questions.filter((q,i)=>current.responses[i]===q.answer).length;
  const wrong=answered-correct,skipped=total-answered,percent=Math.round(correct/total*100);
  byId("resultLevel").textContent=levelAndStream(current.level,current.stream)+" · "+bn(total)+"টি প্রশ্ন";
  byId("scorePercent").textContent=bn(percent)+"%";
  byId("scoreMessage").textContent=percent>=80?
    "ভালো অগ্রগতি। বিষয়ভিত্তিক ব্যাখ্যা দেখে শেখা আরও দৃঢ় করুন।":
    "উত্তর ও ব্যাখ্যা পর্যালোচনা করে সংশ্লিষ্ট বিষয়গুলো আবার অনুশীলন করুন।";
  byId("resultStats").replaceChildren(stat(correct,"সঠিক"),stat(wrong,"ভুল"),stat(skipped,"অনুত্তরিত"));
  const sums=new Map();
  const list=byId("reviewList"),rows=byId("subjectBreakdown");
  list.replaceChildren();rows.replaceChildren();
  current.questions.forEach((q,i)=>{
    const stats=sums.get(q.subject)||{right:0,total:0};
    stats.total++;if(current.responses[i]===q.answer)stats.right++;
    sums.set(q.subject,stats);
    const item=el("article",undefined,"review-item");
    const given=current.responses[i],ok=given===q.answer;
    item.append(el("h4",bn(i+1)+". "+q.q+" · "+q.subject),
      el("p","সঠিক উত্তর: "+q.options[q.answer],"good"),
      el("p","আপনার উত্তর: "+(given===null?"দেওয়া হয়নি":q.options[given]),ok?"good":"bad"),
      el("p","ব্যাখ্যা: "+q.why));
    if(q.sourceUrl){const link=el("a","প্রামাণ্য উৎস দেখুন","question-source");link.href=q.sourceUrl;link.target="_blank";link.rel="noopener noreferrer";item.append(link);if(q.eventDate)item.append(el("span"," · ঘটনা: "+q.eventDate,"source-date"));}
    list.append(item);
  });
  for(const [subject,values] of sums){
    const row=el("tr");
    row.append(el("td",subject),el("td",bn(values.right)+" / "+bn(values.total)));
    rows.append(row);
  }
  activeTest=null;
  changeView("quizResults");
}
function submitQuiz(){
  if(!activeTest)return;
  const remaining=activeTest.responses.filter(v=>v===null).length;
  if(!remaining){showResults();return}
  byId("confirmMessage").textContent=bn(remaining)+"টি প্রশ্নের উত্তর দেওয়া হয়নি। এখন জমা দিলে সেগুলো অনুত্তরিত হিসেবে গণনা হবে।";
  byId("finishConfirm").hidden=false;
  byId("confirmFinish").focus();
}
function isValidNote(note){return note?.title?.trim()&&note?.concept?.trim()&&note?.subject?.trim()}
function notePool(level,stream){
  const fixed=baseNotes.filter(n=>n.scope===level&&
    (needsStream(level)?(level==="admission"?
      (["বাংলা","ইংরেজি","সাধারণ জ্ঞান","গণিত ও যুক্তি"].includes(n.subject)||
       (stream==="science"&&n.subject==="বিজ্ঞান")||
       isAllowedSubject(level,stream,n.subject))
      :isAllowedSubject(level,stream,n.subject)):true));
  const rows=chapterRowsFor(level,stream);
  const generated=makeChapterOverviews(rows).concat(
    rows.map((row,i)=>makeLesson(row,i)),createWorkedLessons(level,stream),createSkillNotes(level,stream),createFactNotes(level));
  return fixed.concat(generated).filter(isValidNote);
}
let currentNotes=[];
function updateSubjects(){
  byId("notesContent").hidden=true;
  const level=byId("notesLevel").value,stream=byId("notesStream").value;
  syncStream("notesLevel","notesStream","notesStreamField");
  if(!baseNotes||!level||(needsStream(level)&&!stream)){
    byId("notesSubject").replaceChildren(new Option("প্রথমে শ্রেণি ও বিভাগ নির্বাচন করুন",""));
    byId("notesSubject").disabled=true;
    return;
  }
  currentNotes=notePool(level,stream);
  const subjects=[...new Set(currentNotes.map(n=>n.subject))].sort((a,b)=>a.localeCompare(b,"bn"));
  const select=byId("notesSubject");
  select.replaceChildren(new Option("বিষয় নির্বাচন করুন",""),...subjects.map(s=>new Option(s,s)));
  select.disabled=false;select.value="";
}
function addPart(node,title,text,className){
  if(!text?.trim())return;
  node.append(el("h4",title),el("p",text,className));
}
function showNotes(){
  const level=byId("notesLevel").value,stream=byId("notesStream").value,subject=byId("notesSubject").value;
  if(!level||(needsStream(level)&&!stream)||!subject){
    status("notesStatus","অনুগ্রহ করে শ্রেণি, প্রয়োজনীয় বিভাগ ও বিষয় নির্বাচন করুন।",true);
    return;
  }
  const entries=currentNotes.filter(n=>n.subject===subject);
  if(!entries.length){status("notesStatus","নির্বাচিত বিষয়ের নোট পাওয়া যায়নি।",true);return}
  const container=byId("noteList");
  const fragment=document.createDocumentFragment();
  for(const note of entries){
    const article=el("article",undefined,"note-article");
    article.append(el("span",levelAndStream(level,stream)+" · "+subject,"note-tag"),el("h3",note.title));
    addPart(article,"মূল ধারণা",note.concept);
    if(note.explanation!==note.concept)addPart(article,"বিস্তারিত ব্যাখ্যা",note.explanation);
    addPart(article,"উদাহরণ",note.example,"note-example");
    addPart(article,"শেখার ধাপ",note.steps);
    addPart(article,"নিজে অনুশীলন",note.practice,"note-exercise");
    if(note.sourceUrl){const link=el("a","উৎস যাচাই করুন","question-source");link.href=note.sourceUrl;link.target="_blank";link.rel="noopener noreferrer";article.append(link);if(note.contentKind==="dated-current-affairs")article.append(el("span"," · সর্বশেষ যাচাই: "+(note.checkedOn||FACT_CHECKED_ON),"source-date"));}
    if(note.solution){
      const details=el("details");
      details.append(el("summary","অনুশীলনের উত্তর দেখুন","note-toggle"),el("p",note.solution,"note-answer"));
      article.append(details);
    }
    fragment.append(article);
  }
  container.replaceChildren(fragment);
  byId("notesOverview").textContent=levelAndStream(level,stream)+" · "+subject+" · "+bn(entries.length)+"টি পাঠ";
  byId("notesStatus").hidden=true;
  byId("notesContent").hidden=false;
  byId("notesOverview").scrollIntoView({behavior:"smooth",block:"start"});
}
async function openNotes(level){
  changeView("notesSetup");
  if(level)byId("notesLevel").value=level;
  byId("showNotes").disabled=true;
  status("notesStatus","বিষয়ভিত্তিক নোট প্রস্তুত করা হচ্ছে…");
  try{await fetchNotes();updateSubjects();byId("notesStatus").hidden=true}
  catch(e){console.error("Education notes unavailable",e);status("notesStatus","নোট লোড করা যায়নি। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।",true)}
  finally{byId("showNotes").disabled=false}
}

populateLevels(byId("quizLevel"));populateLevels(byId("notesLevel"));
byId("quizLevel").addEventListener("change",quizSetupChanged);
byId("quizStream").addEventListener("change",()=>{byId("quizStatus").hidden=true});
byId("notesLevel").addEventListener("change",()=>{syncStream("notesLevel","notesStream","notesStreamField");updateSubjects()});
byId("notesStream").addEventListener("change",updateSubjects);
byId("notesSubject").addEventListener("change",()=>{byId("notesContent").hidden=true});
byId("openQuiz").addEventListener("click",()=>changeView("quizSetup"));
byId("openNotes").addEventListener("click",()=>openNotes());
document.querySelectorAll("[data-home]").forEach(b=>b.addEventListener("click",()=>changeView("modeSelection")));
byId("startQuiz").addEventListener("click",startQuiz);
byId("exitQuiz").addEventListener("click",()=>{activeTest=null;changeView("quizSetup")});
byId("finishQuiz").addEventListener("click",submitQuiz);
byId("confirmFinish").addEventListener("click",showResults);
byId("cancelFinish").addEventListener("click",()=>{byId("finishConfirm").hidden=true});
byId("retakeQuiz").addEventListener("click",()=>changeView("quizSetup"));
byId("goToNotes").addEventListener("click",()=>openNotes(byId("quizLevel").value));
byId("showNotes").addEventListener("click",async()=>{
  if(!baseNotes)await openNotes(byId("notesLevel").value);
  if(baseNotes)showNotes();
});
