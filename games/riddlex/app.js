import {loadCategory} from "./runtime-loader.js";
import {ANSWERS as answerKeys,scoreCandidates,nextQuestion,selectGuess} from "./engine-v2.js";
import {rejectGuess,rewindRejections,rejectedIds} from "./history.js";
import {localPhotoPath} from "./print-photo.js";
let allEntries=[],allQuestions={},banglaQuestions={};
const contextKey="relationship_context";
const contextQuestion="Are you thinking of someone by their relationship to you, such as a relative or friend?";
const contextBangla="আপনি কি কাউকে আপনার সঙ্গে তাঁর সম্পর্ক দিয়ে ভাবছেন, যেমন পরিবারের সদস্য বা বন্ধু?";
let loadToken=0;
const $=id=>document.getElementById(id);
let lang="en";
try{lang=localStorage.getItem("riddlex-language")==="bn"?"bn":"en";}catch{/* Private browsing or storage restrictions must not block the game. */}
const translations={characters:"চরিত্র",animals:"প্রাণী",objects:"বস্তু",yes:"হ্যাঁ",no:"না",probably:"সম্ভবত", "probably-not":"সম্ভবত না",unknown:"জানি না"};
function t(en,bn){return lang==="bn"?bn:en;}
function updateLabels(){
 $("play").textContent=t("Play","খেলুন");
 $("games-link").textContent=t("Games","গেমস");
document.documentElement.lang=lang;$("language").textContent=lang==="bn"?"English":"বাংলা";document.querySelectorAll("[data-category]").forEach(b=>b.textContent=lang==="bn"?translations[b.dataset.category]:({characters:"Characters",animals:"Animals",objects:"Objects"})[b.dataset.category]);document.querySelectorAll("[data-answer]").forEach(b=>b.textContent=lang==="bn"?translations[b.dataset.answer]:({yes:"Yes",no:"No",probably:"Probably","probably-not":"Probably Not",unknown:"Don\'t Know"})[b.dataset.answer]);$("correct").textContent=t("Correct!","সঠিক!");$("retry").textContent=t("Retry","আবার চেষ্টা");$("wrong").textContent=t("Wrong","ভুল");$("back").textContent=t("↶ Change last answer","↶ আগের উত্তর বদলাও");$("new").textContent=t("New Game","নতুন খেলা");}
let category=null,answers=[],rejected=new Set(),rejectionHistory=[],mode="splash",currentKey=null,guess=null;
let photoRequest=0;
const office=document.querySelector(".office");
function mood(value){office.dataset.mood=value;}
function progress(){const el=document.getElementById("progress");if(el)el.textContent=category?t("Questions answered: ","উত্তর দেওয়া প্রশ্ন: ")+answers.length+t(" · Wrong guesses: "," · ভুল অনুমান: ")+rejected.size:"";}
const categories=$("categories"),answerPanel=$("answers"),guessPanel=$("guess"),back=$("back");

function submitAnswer(value){if((mode!=="ask"&&mode!=="edit")||!currentKey||!answerKeys.includes(value))return;answers.push({key:currentKey,value});currentKey=null;mode="ask";render();}
function visible(node,yes){node.hidden=!yes;}
function showQuestion(){
 mood("thinking");
 $("status").textContent=lang==="bn"?(banglaQuestions[currentKey]||allQuestions[currentKey]):allQuestions[currentKey];
 visible(answerPanel,true);
}
function showNote(){
 const note=$("case-note"),photo=$("case-photo");
 const show=mode==="guess"||mode==="done";
 visible(note,show);
 if(!show||mode!=="done"){
  photoRequest++;
  photo.onload=null;
  photo.onerror=null;
  photo.hidden=true;
  photo.removeAttribute("src");
  note.dataset.result="";
 }
 note.dataset.guessId=show?guess.id:"";
 if(!show)return;
 $("case-note-label").textContent=t(mode==="done"?"Case solved":"Detective’s note",mode==="done"?"রহস্যের সমাধান":"গোয়েন্দার নোট");
 $("case-note-name").textContent=lang==="bn"?(guess.nameBn||guess.name):guess.name;
 if(mode!=="done"||note.dataset.result)return;

 const path=localPhotoPath(guess);
 if(!path){note.dataset.result="written";return;}
 const request=++photoRequest;
 note.dataset.result="loading";
 photo.alt="";
 photo.onload=()=>{
  if(request!==photoRequest)return;
  photo.hidden=false;
  note.dataset.result="printed";
 };
 photo.onerror=()=>{
  if(request!==photoRequest)return;
  photo.removeAttribute("src");
  note.dataset.result="written";
 };
 photo.src=path;
}
function presentGuess(){
 mood("guess");
 $("status").textContent=t("Are you thinking of ","আপনি কি ")+(lang==="bn"?(guess.nameBn||guess.name):guess.name)+t("?","-এর কথা ভাবছেন?");
 visible(guessPanel,true);visible($("correct"),true);visible($("wrong"),true);showNote();
}
function showUnresolved(){
 mood("unsure");showNote();visible(guessPanel,true);visible($("retry"),true);
 $("status").textContent=t("I don’t have enough evidence to make a reliable guess. You can change an answer or retry with a new case.","নির্ভরযোগ্য অনুমানের জন্য যথেষ্ট তথ্য নেই। উত্তর বদলাতে পারেন অথবা নতুন করে চেষ্টা করতে পারেন।");
}
function reset(){loadToken++;category=null;answers=[];rejected=new Set();rejectionHistory=[];mode="start";currentKey=null;guess=null;render();}
function render(){
 updateLabels();progress();
 const splash=mode==="splash";
 visible(office,!splash);
 for(const id of ["status","progress","new","privacy-note"])visible($(id),!splash);
 visible($("play"),splash);
 visible(categories,mode==="start");visible(answerPanel,false);visible(guessPanel,false);showNote();visible($("correct"),mode==="guess");visible($("wrong"),mode==="guess");visible($("retry"),mode==="wrong"||mode==="unsure");
 visible(back,mode!=="start"&&mode!=="done"&&answers.length>0);
 if(splash)return;
 if(mode==="loading"){mood("thinking");$("status").textContent=t("Opening the casebook…","তথ্যভান্ডার খুলছি…");return;}
 if(mode==="start"){mood("ready");$("status").textContent=t("Think of a character, animal, object or someone you know.","একটি চরিত্র, প্রাণী, বস্তু বা পরিচিত কাউকে মনে মনে ভাবুন।");return;}
 if(mode==="wrong"){mood("wrong");$("status").textContent=t("That guess was wrong. Shall I try again?","অনুমানটি ভুল হয়েছে। আবার চেষ্টা করব?");visible(guessPanel,true);showNote();return;}
 if(mode==="done"){mood("happy");$("status").textContent=t("Case closed! 🕵️","রহস্যের সমাধান! 🕵️");showNote();return;}
 if(mode==="edit"){showQuestion();return;}
 if(mode==="guess"){presentGuess();return;}
 if(mode==="unsure"){showUnresolved();return;}
 const context=answers.find(answer=>answer.key===contextKey);
 if(category==="characters"&&!context){
  currentKey=contextKey;mode="ask";showQuestion();return;
 }
 const candidates=allEntries.filter(entry=>{
  if(context?.value==="yes")return entry.category==="relationships";
  if(context?.value==="no")return entry.category==="characters";
  return true;
 });
 const clues=answers.filter(answer=>answer.key!==contextKey);
 const ranked=scoreCandidates(candidates,clues,rejected);
 const suggestion=selectGuess(ranked,clues);
 if(suggestion){guess=suggestion;mode="guess";presentGuess();return;}
 currentKey=nextQuestion(ranked,clues,allQuestions);
 if(!currentKey){
   guess=null;mode="unsure";showUnresolved();
   return;
 }
 mode="ask";showQuestion();
}
document.querySelectorAll("[data-category]").forEach(b=>b.addEventListener("click",async()=>{
 const token=++loadToken;category=b.dataset.category;answers=[];rejected=new Set();rejectionHistory=[];mode="loading";render();
 try{
  const pools=category==="characters"?["characters","relationships"]:[category];
  const data=await Promise.all(pools.map(loadCategory));
  if(token!==loadToken)return;
  allEntries=data.flatMap(pool=>pool.entries);
  allQuestions=Object.assign({},...data.map(pool=>pool.questions));
  banglaQuestions=Object.assign({},...data.map(pool=>pool.bangla));
  if(category==="characters"){
   allQuestions[contextKey]=contextQuestion;
   banglaQuestions[contextKey]=contextBangla;
  }
  mode="ask";render();
 }catch{
  if(token!==loadToken)return;
  reset();
  $("status").textContent=t("The casebook could not load. Please choose a category to retry.","তথ্যভান্ডার লোড হয়নি। আবার একটি বিভাগ বেছে নিন।");
 }
}));
$("play").addEventListener("click",()=>{reset();categories.querySelector("button").focus();});
document.querySelectorAll("[data-answer]").forEach(b=>b.addEventListener("click",()=>submitAnswer(b.dataset.answer)));
$("correct").addEventListener("click",()=>{if(mode!=="guess"||!guess)return;mode="done";render();});
$("wrong").addEventListener("click",()=>{if(mode!=="guess")return;mode="wrong";render();});
$("retry").addEventListener("click",()=>{
 if(mode!=="wrong"&&mode!=="unsure")return;
 const cat=office.querySelector(".cat");
 cat.getAnimations().filter(animation=>animation.id==="retry").forEach(animation=>animation.cancel());
 const left=cat.getBoundingClientRect().left;
 if(mode==="unsure")reset();
 else retryGuess();
 if(!matchMedia("(prefers-reduced-motion: reduce)").matches){
  const distance=left-cat.getBoundingClientRect().left;
  cat.animate([{transform:"translate("+distance+"px, 12px) scaleY(.65)"},{transform:"none"}],
   {id:"retry",duration:420,easing:"ease-out"});
 }
});
function retryGuess(){
 if(guess){rejectionHistory=rejectGuess(rejectionHistory,guess.id,answers.length);rejected=rejectedIds(rejectionHistory);}
 guess=null;mode="ask";render();
}
document.addEventListener("keydown",event=>{
 if(event.altKey||event.ctrlKey||event.metaKey||event.repeat||event.target instanceof Element&&event.target.closest("input,textarea,select,[contenteditable]"))return;
 if((mode==="ask"||mode==="edit")&&/^[1-5]$/.test(event.key)){event.preventDefault();submitAnswer(answerKeys[Number(event.key)-1]);}
});
back.addEventListener("click",()=>{
 const previous=answers.pop();
 if(!previous)return;
 rejectionHistory=rewindRejections(rejectionHistory,answers.length);
 rejected=rejectedIds(rejectionHistory);
 guess=null;currentKey=previous.key;mode="edit";render();
 answerPanel.querySelector('[data-answer="'+previous.value+'"]').focus();
});
$("new").addEventListener("click",reset);$("language").addEventListener("click",()=>{lang=lang==="en"?"bn":"en";try{localStorage.setItem("riddlex-language",lang);}catch{/* Keep language toggle usable without storage. */}render();});render();
