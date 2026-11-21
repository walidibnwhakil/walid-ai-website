import {createPrimaryBank, createExamExtras, auditQuestion} from "./question-content.mjs";

const byId = id => document.getElementById(id);
const allViews = ["modeSelection","quizSetup","quizRunning","quizResults","notesSetup"];
const labels = {admission:"বিশ্ববিদ্যালয় ভর্তি প্রস্তুতি",bcs:"BCS প্রিলিমিনারি প্রস্তুতি"};
const bn = value => new Intl.NumberFormat("bn-BD").format(value);
const element = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = String(text);
  if (className) node.className = className;
  return node;
};
const levels = [
  {label:"প্রাথমিক স্তর",values:[1,2,3,4,5]},
  {label:"মাধ্যমিক স্তর",values:[6,7,8,9,10]},
  {label:"উচ্চমাধ্যমিক স্তর",values:[11,12]},
  {label:"প্রতিযোগিতামূলক পরীক্ষা",values:["admission","bcs"]}
];
function levelName(level) {
  return labels[level] || (level && Number.isInteger(Number(level)) ? "শ্রেণি " + bn(Number(level)) : "");
}
function populateLevels(select) {
  select.replaceChildren(new Option("শ্রেণি বা পরীক্ষার বিভাগ নির্বাচন করুন", ""));
  for (const group of levels) {
    const optgroup = element("optgroup");
    optgroup.label = group.label;
    for (const level of group.values) optgroup.append(new Option(levelName(String(level)),String(level)));
    select.append(optgroup);
  }
  select.value = "";
}

let loadedBank = null;
let bankLoading = null;
let notesData = null;
let notesLoading = null;
let test = null;
function view(id) {
  for (const name of allViews) byId(name).hidden = name !== id;
  document.querySelector(".edu-hero").hidden = id !== "modeSelection";
  byId("quizStatus").hidden = true;
  if (id !== "notesSetup") byId("notesStatus").hidden = true;
  if (id !== "modeSelection") byId(id).scrollIntoView({block:"start",behavior:"instant"});
}
function message(id, text, error = false) {
  const target=byId(id);
  target.textContent=text;
  target.classList.toggle("is-error",error);
  target.hidden=false;
}
function shuffle(items) {
  const list=items.slice();
  for(let i=list.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [list[i],list[j]]=[list[j],list[i]];
  }
  return list;
}
function normalizeQuestion(q,id,subject) {
  return {id:String(id),subject:subject||q.subject,q:q.q,options:q.options.map(String),
    answer:q.answer,why:q.why||"প্রাসঙ্গিক পাঠ্যবইয়ের ব্যাখ্যা পর্যালোচনা করুন।"};
}
function deduplicate(pool) {
  const seen=new Set();
  return pool.filter(q=>{
    if (!auditQuestion(q)) return false;
    const key=q.q.trim().replace(/\s+/g," ").toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function makePool(level,questions) {
  if (/^[1-5]$/.test(level)) return createPrimaryBank(Number(level));
  if (/^(?:[6-9]|10|11|12)$/.test(level))
    return questions.filter(q=>q.grade===Number(level))
      .map(q=>normalizeQuestion(q,"c-"+q.id,q.subject));
  const examTopics={
    "বাংলা":"বাংলা ভাষা ও সাহিত্য",
    "ইংরেজি":"ইংরেজি ভাষা ও সাহিত্য",
    "গণিত":"গাণিতিক যুক্তি",
    "বিজ্ঞান":"সাধারণ বিজ্ঞান",
    "পদার্থবিজ্ঞান":"সাধারণ বিজ্ঞান",
    "বাংলাদেশ ও বিশ্বপরিচয়":"বাংলাদেশ বিষয়াবলি",
    "তথ্য ও যোগাযোগ প্রযুক্তি":"কম্পিউটার ও তথ্যপ্রযুক্তি"
  };
  const admissionTopics={
    "বাংলা":"বাংলা","ইংরেজি":"ইংরেজি","গণিত":"গণিত ও যুক্তি",
    "বিজ্ঞান":"বিজ্ঞান","পদার্থবিজ্ঞান":"বিজ্ঞান",
    "বাংলাদেশ ও বিশ্বপরিচয়":"সাধারণ জ্ঞান",
    "তথ্য ও যোগাযোগ প্রযুক্তি":"তথ্যপ্রযুক্তি"
  };
  if(level==="admission"||level==="bcs"){
    const mapping=level==="bcs"?examTopics:admissionTopics;
    const base=questions.filter(q=>q.grade>=9&&q.grade<=12&&mapping[q.subject])
      .map(q=>normalizeQuestion(q,level+"-"+q.id,mapping[q.subject]));
    return level==="bcs"?base.concat(createExamExtras()):base;
  }
  return [];
}
function selectBalanced(pool,count) {
  const groups=new Map();
  for (const q of shuffle(deduplicate(pool))) {
    if(!groups.has(q.subject)) groups.set(q.subject,[]);
    groups.get(q.subject).push(q);
  }
  const subjects=shuffle([...groups.keys()]);
  const selected=[];
  while(selected.length<count){
    let added=false;
    for(const subject of subjects){
      const q=groups.get(subject).pop();
      if(!q)continue;
      selected.push(q);
      added=true;
      if(selected.length===count)break;
    }
    if(!added)break;
  }
  return selected;
}
async function fetchBank() {
  if (loadedBank) return loadedBank;
  if (!bankLoading) bankLoading=fetch("/sections/education/questions.json")
    .then(response=>{if(!response.ok)throw Error("Question bank unavailable");return response.json();})
    .then(data=>{
      if(!Array.isArray(data.questions)||data.questions.length<1000||
         data.questions.some(q=>!auditQuestion({...q,id:q.id})))
        throw Error("Invalid question bank");
      loadedBank=data.questions;
      return loadedBank;
    })
    .finally(()=>{bankLoading=null});
  return bankLoading;
}
async function fetchNotes() {
  if(notesData)return notesData;
  if(!notesLoading)notesLoading=fetch("/sections/education/notes.json")
    .then(response=>{if(!response.ok)throw Error("Study content unavailable");return response.json()})
    .then(data=>{if(!Array.isArray(data.notes)||!data.notes.length)throw Error("Invalid notes");notesData=data.notes;return notesData})
    .finally(()=>{notesLoading=null});
  return notesLoading;
}
const questionCount=()=>Number(document.querySelector('input[name="questionCount"]:checked')?.value||20);

function renderQuestion() {
  const q=test.questions[test.position];
  const n=test.position;
  const given=test.responses[n];
  byId("quizCounter").textContent="প্রশ্ন "+bn(n+1)+" / "+bn(test.questions.length);
  byId("quizSubject").textContent=q.subject;
  byId("runningLevel").textContent=levelName(test.level)+" · "+bn(test.questions.length)+"টি প্রশ্ন";
  byId("quizProgress").max=test.questions.length;
  byId("quizProgress").value=test.responses.filter(v=>v!==null).length;
  byId("answeredCount").textContent="উত্তর দিয়েছেন "+bn(test.responses.filter(v=>v!==null).length)+"টি প্রশ্নে";
  byId("questionText").textContent=q.q;
  byId("jumpQuestion").value=String(n);
  byId("prevQuestion").disabled=n===0;
  byId("nextQuestion").disabled=n===test.questions.length-1;
  const options=byId("questionOptions");
  options.replaceChildren();
  q.options.forEach((value,i)=>{
    const button=element("button",undefined,"question-option");
    button.type="button";
    button.setAttribute("aria-pressed",String(given===i));
    button.append(element("span",["ক","খ","গ","ঘ"][i],"option-letter"),element("span",value));
    button.addEventListener("click",()=>{
      test.responses[test.position]=i;
      byId("finishConfirm").hidden=true;
      renderQuestion();
    });
    options.append(button);
  });
}
function renderQuiz() {
  byId("finishConfirm").hidden=true;
  const jump=byId("jumpQuestion");
  jump.replaceChildren(...test.questions.map((_,i)=>new Option(bn(i+1),String(i))));
  view("quizRunning");
  renderQuestion();
}

async function startQuiz() {
  const level=byId("quizLevel").value;
  if(!level) {
    message("quizStatus","অনুগ্রহ করে একটি শ্রেণি বা পরীক্ষার বিভাগ নির্বাচন করুন।",true);
    byId("quizLevel").focus();
    return;
  }
  const btn=byId("startQuiz");
  btn.disabled=true;
  message("quizStatus","প্রশ্ন প্রস্তুত করা হচ্ছে…");
  try {
    const questions=Number(level)<=5&&Number(level)>=1?[]:await fetchBank();
    const count=questionCount();
    const selected=selectBalanced(makePool(level,questions),count);
    if(selected.length!==count)throw Error("Insufficient reviewed questions");
    test={level,questions:selected,position:0,responses:Array(count).fill(null)};
    renderQuiz();
  }catch{
    message("quizStatus","প্রশ্নসেট লোড করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।",true);
  }finally{
    btn.disabled=false;
  }
}

function resultStatistic(number,label) {
  const card=element("div",undefined,"stat");
  card.append(element("strong",bn(number)),element("span",label));
  return card;
}
function drawResults() {
  const total=test.questions.length;
  const answered=test.responses.filter(v=>v!==null).length;
  const correct=test.questions.filter((q,i)=>test.responses[i]===q.answer).length;
  const wrong=answered-correct;
  const skipped=total-answered;
  const percent=Math.round(correct*100/total);
  byId("resultLevel").textContent=levelName(test.level)+" · "+bn(total)+"টি প্রশ্ন";
  byId("scorePercent").textContent=bn(percent)+"%";
  byId("scoreMessage").textContent=percent>=80?"ভালো অগ্রগতি। যে বিষয়গুলোতে ভুল হয়েছে সেগুলোর ব্যাখ্যা আবার পড়ুন।":
    "নিচে সঠিক উত্তর ও ব্যাখ্যা রয়েছে। ভুলগুলো পর্যালোচনা করে আবার অনুশীলন করুন।";
  byId("resultStats").replaceChildren(
    resultStatistic(correct,"সঠিক"),resultStatistic(wrong,"ভুল"),resultStatistic(skipped,"অনুত্তরিত"));
  const stats=new Map();
  test.questions.forEach((q,i)=>{
    const row=stats.get(q.subject)||{total:0,correct:0};
    row.total++;
    if(test.responses[i]===q.answer)row.correct++;
    stats.set(q.subject,row);
  });
  const table=byId("subjectBreakdown");
  table.replaceChildren();
  for(const [subject,stat] of stats){
    const tr=element("tr");
    tr.append(element("td",subject),element("td",bn(stat.correct)+" / "+bn(stat.total)));
    table.append(tr);
  }
  const review=byId("reviewList");
  review.replaceChildren();
  test.questions.forEach((q,i)=>{
    const chosen=test.responses[i];
    const item=element("article",undefined,"review-item");
    const success=chosen===q.answer;
    item.append(element("h4",bn(i+1)+". "+q.q+" · "+q.subject));
    item.append(element("p","সঠিক উত্তর: "+q.options[q.answer],"good"));
    item.append(element("p","আপনার উত্তর: "+(chosen===null?"দেওয়া হয়নি":q.options[chosen]),success?"good":"bad"));
    if(q.why)item.append(element("p","ব্যাখ্যা: "+q.why));
    review.append(item);
  });
  test=null;
  view("quizResults");
}
function submitQuiz() {
  const missing=test.responses.filter(v=>v===null).length;
  if(missing) {
    byId("confirmMessage").textContent=bn(missing)+"টি প্রশ্নের উত্তর দেওয়া হয়নি। জমা দিলে সেগুলো অনুত্তরিত হিসেবে গণনা হবে।";
    byId("finishConfirm").hidden=false;
    byId("confirmFinish").focus();
  } else drawResults();
}
function subjectOptions() {
  byId("notesContent").hidden=true;
  const level=byId("notesLevel").value;
  const subjects=notesData && level?[...new Set(notesData.filter(n=>n.scope===level).map(n=>n.subject))]:[];
  const select=byId("notesSubject");
  select.replaceChildren(new Option(subjects.length?"বিষয় নির্বাচন করুন":"প্রথমে শ্রেণি নির্বাচন করুন",""),
    ...subjects.map(name=>new Option(name,name)));
  select.disabled=subjects.length===0;
  select.value="";
}
function notePart(article,label,text,cls){
  if(!text?.trim())return;
  article.append(element("h4",label),element("p",text,cls));
}
function renderNotes() {
  const level=byId("notesLevel").value,subject=byId("notesSubject").value;
  if(!level||!subject){
    message("notesStatus","অনুগ্রহ করে শ্রেণি এবং বিষয় নির্বাচন করুন।",true);
    return;
  }
  const relevant=notesData.filter(n=>n.scope===level&&n.subject===subject);
  if(!relevant.length){
    message("notesStatus","এই নির্বাচনের জন্য এখন কোনো নোট পাওয়া যায়নি।",true);
    return;
  }
  const list=byId("noteList");
  list.replaceChildren();
  for(const n of relevant){
    const article=element("article",undefined,"note-article");
    article.append(element("span",levelName(level)+" · "+subject,"note-tag"),element("h3",n.title));
    notePart(article,"মূল ধারণা",n.concept);
    if(n.explanation?.trim()!==n.concept?.trim())notePart(article,"বিস্তারিত ব্যাখ্যা",n.explanation);
    notePart(article,"উদাহরণ",n.example,"note-example");
    notePart(article,"শেখার ধাপ",n.steps);
    notePart(article,"নিজে অনুশীলন",n.practice,"note-exercise");
    if(n.solution?.trim()){
      const details=element("details");
      details.append(element("summary","অনুশীলনের উত্তর দেখুন","note-toggle"),element("p",n.solution,"note-answer"));
      article.append(details);
    }
    list.append(article);
  }
  byId("notesOverview").textContent=levelName(level)+" · "+subject+" · "+bn(relevant.length)+"টি পাঠ";
  byId("notesStatus").hidden=true;
  byId("notesContent").hidden=false;
  byId("notesOverview").scrollIntoView({block:"start",behavior:"smooth"});
}
async function openNotes(level) {
  view("notesSetup");
  if(level)byId("notesLevel").value=level;
  const button=byId("showNotes");
  button.disabled=true;
  message("notesStatus","নোটের তালিকা প্রস্তুত করা হচ্ছে…");
  try {
    await fetchNotes();
    subjectOptions();
    byId("notesStatus").hidden=true;
  }catch {
    message("notesStatus","নোট লোড করা যায়নি। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।",true);
  }finally{
    button.disabled=false;
  }
}

populateLevels(byId("quizLevel"));
populateLevels(byId("notesLevel"));
byId("openQuiz").addEventListener("click",()=>view("quizSetup"));
byId("openNotes").addEventListener("click",()=>openNotes());
document.querySelectorAll("[data-home]").forEach(button=>button.addEventListener("click",()=>view("modeSelection")));
byId("startQuiz").addEventListener("click",startQuiz);
byId("exitQuiz").addEventListener("click",()=>{test=null;view("quizSetup")});
byId("prevQuestion").addEventListener("click",()=>{test.position--;renderQuestion()});
byId("nextQuestion").addEventListener("click",()=>{test.position++;renderQuestion()});
byId("jumpQuestion").addEventListener("change",e=>{test.position=Number(e.target.value);renderQuestion()});
byId("finishQuiz").addEventListener("click",submitQuiz);
byId("confirmFinish").addEventListener("click",drawResults);
byId("cancelFinish").addEventListener("click",()=>{byId("finishConfirm").hidden=true});
byId("retakeQuiz").addEventListener("click",()=>view("quizSetup"));
byId("goToNotes").addEventListener("click",()=>openNotes(byId("quizLevel").value));
byId("notesLevel").addEventListener("change",subjectOptions);
byId("notesSubject").addEventListener("change",()=>{byId("notesContent").hidden=true});
byId("showNotes").addEventListener("click",async()=>{
  if(!notesData)await openNotes(byId("notesLevel").value);
  if(notesData)renderNotes();
});
