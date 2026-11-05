import {loadCategory} from "./runtime-loader.js";
import {ANSWERS as answerKeys,scoreCandidates,nextQuestion,selectGuess} from "./engine-v2.js";
import {rejectGuess,rewindRejections,rejectedIds} from "./history.js";
import {localPhotoPath} from "./print-photo.js";
let allEntries=[],allQuestions={},banglaQuestions={};
let loadToken=0;
const $=id=>document.getElementById(id);
let lang="en";
try{lang=localStorage.getItem("riddlex-language")==="bn"?"bn":"en";}catch{/* Private browsing or storage restrictions must not block the game. */}
const translations={characters:"চরিত্র",animals:"প্রাণী",objects:"বস্তু",relationships:"পরিচিত কেউ",yes:"হ্যাঁ",no:"না",probably:"সম্ভবত", "probably-not":"সম্ভবত না",unknown:"জানি না"};
function t(en,bn){return lang==="bn"?bn:en;}
function updateLabels(){
 $("games-link").textContent=t("Games","গেমস");
document.documentElement.lang=lang;$("language").textContent=lang==="bn"?"English":"বাংলা";document.querySelectorAll("[data-category]").forEach(b=>b.textContent=lang==="bn"?translations[b.dataset.category]:({characters:"Characters",animals:"Animals",objects:"Objects",relationships:"Someone I know"})[b.dataset.category]);document.querySelectorAll("[data-answer]").forEach(b=>b.textContent=lang==="bn"?translations[b.dataset.answer]:({yes:"Yes",no:"No",probably:"Probably","probably-not":"Probably Not",unknown:"Don\'t Know"})[b.dataset.answer]);$("correct").textContent=t("Correct!","সঠিক!");$("retry").textContent=t("Retry","আবার চেষ্টা");$("wrong").textContent=t("Wrong","ভুল");$("back").textContent=t("↶ Change last answer","↶ আগের উত্তর বদলাও");$("new").textContent=t("New Game","নতুন খেলা");$("keyboard-hint").textContent=t("Keyboard: 1 Yes · 2 No · 3 Probably · 4 Probably Not · 5 Don’t Know","কিবোর্ড: ১ হ্যাঁ · ২ না · ৩ সম্ভবত · ৪ সম্ভবত না · ৫ জানি না");}
let category=null,answers=[],rejected=new Set(),rejectionHistory=[],mode="start",currentKey=null,guess=null;
let photoRequest=0;
let discardToken=0;
let discardTimer=null;
let discardListener=null;
function cancelDiscard(){
 discardToken++;
 for(const key of ["--throw-x","--throw-y","--throw-x-mid","--throw-y-mid","--throw-x-late","--throw-y-late"])$("case-note").style.removeProperty(key);
 if(discardTimer!==null){clearTimeout(discardTimer);discardTimer=null;}
 if(discardListener){$("case-note").removeEventListener("animationend",discardListener);discardListener=null;}
}
function mood(value){document.querySelector(".office").dataset.mood=value;}
function progress(){const el=document.getElementById("progress");if(el)el.textContent=category?t("Questions answered: ","উত্তর দেওয়া প্রশ্ন: ")+answers.length+t(" · Wrong guesses: "," · ভুল অনুমান: ")+rejected.size:"";}
const categories=$("categories"),answerPanel=$("answers"),guessPanel=$("guess"),back=$("back");

function submitAnswer(value){if((mode!=="ask"&&mode!=="edit")||!currentKey||!answerKeys.includes(value))return;answers.push({key:currentKey,value});currentKey=null;mode="ask";render();}
function visible(node,yes){node.hidden=!yes;}
function showQuestion(){
 mood("thinking");
 $("status").textContent=lang==="bn"?(banglaQuestions[currentKey]||allQuestions[currentKey]):allQuestions[currentKey];
 visible(answerPanel,true);visible($("keyboard-hint"),true);
}
function showNote(){
 const show=mode==="unsure"||Boolean(guess)&&(mode==="guess"||mode==="wrong"||mode==="done"||mode==="discard");
 const note=$("case-note"),photo=$("case-photo");
 visible(note,show);
 if(!show){
  photoRequest++;photo.onload=null;photo.onerror=null;
  photo.hidden=true;photo.removeAttribute("src");photo.alt="";
  note.dataset.guessId="";
  return;
 }
 $("case-note-label").textContent=t(mode==="done"?"Case solved":"Detective’s note",mode==="done"?"রহস্যের সমাধান":"গোয়েন্দার নোট");
 $("case-note-name").textContent=guess?(lang==="bn"?(guess.nameBn||guess.name):guess.name):t("Case still open","রহস্য এখনো অমীমাংসিত");
 const path=localPhotoPath(guess);
 const sameGuess=note.dataset.guessId===guess?.id;
 note.dataset.guessId=guess?.id??"";
 if(!path){
  photoRequest++;photo.onload=null;photo.onerror=null;
  photo.hidden=true;photo.removeAttribute("src");photo.alt="";
  return;
 }
 if(sameGuess&&photo.getAttribute("src")===path)return;
 const request=++photoRequest;
 photo.hidden=true;photo.alt=guess.name;
 photo.onload=()=>{if(request===photoRequest&&guess?.id===note.dataset.guessId)photo.hidden=false;};
 photo.onerror=()=>{if(request===photoRequest){photo.hidden=true;photo.removeAttribute("src");}};
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
function reset(){loadToken++;cancelDiscard();category=null;answers=[];rejected=new Set();rejectionHistory=[];mode="start";currentKey=null;guess=null;render();}
function render(){
 updateLabels();progress();
 visible(categories,mode==="start");visible(answerPanel,false);visible(guessPanel,false);visible($("keyboard-hint"),false);showNote();visible($("correct"),mode==="guess");visible($("wrong"),mode==="guess");visible($("retry"),mode==="wrong"||mode==="unsure");
 visible(back,mode!=="start"&&mode!=="done"&&mode!=="discard"&&answers.length>0);
 if(mode==="loading"){mood("thinking");$("status").textContent=t("Opening the casebook…","তথ্যভান্ডার খুলছি…");return;}
 if(mode==="start"){mood("ready");$("status").textContent=t("Think of a character, animal, object or someone you know.","একটি চরিত্র, প্রাণী, বস্তু বা পরিচিত কাউকে মনে মনে ভাবুন।");return;}
 if(mode==="discard"){mood("discard");visible(guessPanel,false);$("status").textContent=t("Clearing the old clue…","পুরোনো সূত্র সরিয়ে ফেলছি…");return;}
 if(mode==="wrong"){mood("wrong");$("status").textContent=t("That guess was wrong. Shall I try again?","অনুমানটি ভুল হয়েছে। আবার চেষ্টা করব?");visible(guessPanel,true);showNote();return;}
 if(mode==="done"){mood("happy");$("status").textContent=t("Case closed! 🕵️","রহস্যের সমাধান! 🕵️");showNote();return;}
 if(mode==="edit"){showQuestion();return;}
 if(mode==="guess"){presentGuess();return;}
 if(mode==="unsure"){showUnresolved();return;}
 const ranked=scoreCandidates(allEntries.filter(e=>e.category===category),answers,rejected);
 const suggestion=selectGuess(ranked,answers,allQuestions);
 if(suggestion){guess=suggestion;mode="guess";presentGuess();return;}
 currentKey=nextQuestion(ranked,answers,allQuestions);
 if(!currentKey){
   guess=null;mode="unsure";showUnresolved();
   return;
 }
 mode="ask";showQuestion();
}
document.querySelectorAll("[data-category]").forEach(b=>b.addEventListener("click",async()=>{
 cancelDiscard();const token=++loadToken;category=b.dataset.category;answers=[];rejected=new Set();rejectionHistory=[];mode="loading";render();
 try{const data=await loadCategory(category);if(token!==loadToken)return;allEntries=data.entries;allQuestions=data.questions;banglaQuestions=data.bangla;mode="ask";render();}
 catch{if(token!==loadToken)return;mode="start";render();$("status").textContent=t("The casebook could not load. Please choose a category to retry.","তথ্যভান্ডার লোড হয়নি। আবার একটি বিভাগ বেছে নিন।");}
}));
document.querySelectorAll("[data-answer]").forEach(b=>b.addEventListener("click",()=>submitAnswer(b.dataset.answer)));
$("correct").addEventListener("click",()=>{if(mode!=="guess"||!guess)return;mode="done";render();});
$("wrong").addEventListener("click",()=>{if(mode!=="guess")return;mode="wrong";render();});
$("retry").addEventListener("click",()=>{
 if(mode==="unsure"){reset();return;}
 if(mode!=="wrong")return;
 if(guess){rejectionHistory=rejectGuess(rejectionHistory,guess.id,answers.length);rejected=rejectedIds(rejectionHistory);}
 cancelDiscard();mode="discard";const token=discardToken;
 visible(guessPanel,false);visible(back,false);
 const note=$("case-note"),office=document.querySelector(".office");
 // Ensure the existing note and any loaded photo remain visible throughout the throw.
 showNote();
 const bin=document.querySelector(".wastebasket");
 const paperRect=note.getBoundingClientRect(),binRect=bin.getBoundingClientRect();
 // Both centers are measured in viewport coordinates; transforms animate from the note center.
 // Hide the photo only during disposal, not while presenting the guess.
 // The paper travels to the actual bin even on narrow phone screens.
 note.style.setProperty("--throw-x",`${binRect.left+binRect.width/2-paperRect.left-paperRect.width/2}px`);
 note.style.setProperty("--throw-y",`${binRect.top+binRect.height/2-paperRect.top-paperRect.height/2}px`);
 note.style.setProperty("--throw-x-mid",`${(binRect.left+binRect.width/2-paperRect.left-paperRect.width/2)*.35}px`);
 note.style.setProperty("--throw-y-mid",`${(binRect.top+binRect.height/2-paperRect.top-paperRect.height/2)*-.35}px`);
 note.style.setProperty("--throw-x-late",`${(binRect.left+binRect.width/2-paperRect.left-paperRect.width/2)*.85}px`);
 note.style.setProperty("--throw-y-late",`${(binRect.top+binRect.height/2-paperRect.top-paperRect.height/2)*.7}px`);
 office.dataset.mood="discard";
 const finish=()=>{
  if(token!==discardToken||mode!=="discard")return;
  if(discardTimer!==null){clearTimeout(discardTimer);discardTimer=null;}
  if(discardListener){note.removeEventListener("animationend",discardListener);discardListener=null;}
  for(const key of ["--throw-x","--throw-y","--throw-x-mid","--throw-y-mid","--throw-x-late","--throw-y-late"])note.style.removeProperty(key);
  guess=null;mode="ask";render();
 };
 if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){finish();return;}
 discardListener=event=>{
  // Ignore bubbling photo animations; only the paper reaching the bin completes Retry.
  if(event.target===note&&event.animationName==="crumpled-note-to-bin")finish();
 };
 note.addEventListener("animationend",discardListener);
 // If CSS animation is unavailable or interrupted, the player must never get stuck.
 discardTimer=setTimeout(finish,1900);
});
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
$("new").addEventListener("click",reset);$("language").addEventListener("click",()=>{lang=lang==="en"?"bn":"en";try{localStorage.setItem("riddlex-language",lang);}catch{/* Keep language toggle usable without storage. */}if(mode==="discard"){updateLabels();$("status").textContent=t("Clearing the old clue…","পুরোনো সূত্র সরিয়ে ফেলছি…");}else render();});render();
