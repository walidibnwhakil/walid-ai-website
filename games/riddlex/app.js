import {entries,questions} from "./casebook.js";
import {roles,relationshipQuestions} from "./relationships.js";
import {banglaQuestions} from "./questions.bn.js";
import {scoreCandidates,nextQuestion,selectGuess} from "./engine.js";
import {rejectGuess,rewindRejections,rejectedIds} from "./history.js";
import {localPhotoPath} from "./print-photo.js";
const allEntries=[...entries,...roles],allQuestions={...questions,...relationshipQuestions};
const $=id=>document.getElementById(id);
let lang="en";
const translations={characters:"চরিত্র",animals:"প্রাণী",objects:"বস্তু",relationships:"পরিচিত কেউ",yes:"হ্যাঁ",no:"না",probably:"সম্ভবত", "probably-not":"সম্ভবত না",unknown:"জানি না"};
function t(en,bn){return lang==="bn"?bn:en;}
function updateLabels(){document.documentElement.lang=lang;$("language").textContent=lang==="bn"?"English":"বাংলা";document.querySelectorAll("[data-category]").forEach(b=>b.textContent=lang==="bn"?translations[b.dataset.category]:({characters:"Characters",animals:"Animals",objects:"Objects",relationships:"Someone I know"})[b.dataset.category]);document.querySelectorAll("[data-answer]").forEach(b=>b.textContent=lang==="bn"?translations[b.dataset.answer]:({yes:"Yes",no:"No",probably:"Probably","probably-not":"Probably Not",unknown:"Don\'t Know"})[b.dataset.answer]);$("correct").textContent=t("Correct!","সঠিক!");$("retry").textContent=t("Retry","আবার চেষ্টা");$("wrong").textContent=t("Wrong","ভুল");$("back").textContent=t("↶ Change last answer","↶ আগের উত্তর বদলাও");$("new").textContent=t("New Game","নতুন খেলা");$("keyboard-hint").textContent=t("Keyboard: 1 Yes · 2 No · 3 Probably · 4 Probably Not · 5 Don’t Know","কিবোর্ড: ১ হ্যাঁ · ২ না · ৩ সম্ভবত · ৪ সম্ভবত না · ৫ জানি না");}
let category=null,answers=[],rejected=new Set(),rejectionHistory=[],mode="start",currentKey=null,guess=null;
let photoRequest=0;
let discardToken=0;
let discardTimer=null;
let discardListener=null;
function cancelDiscard(){
 discardToken++;
 if(discardTimer!==null){clearTimeout(discardTimer);discardTimer=null;}
 if(discardListener){$("case-note").removeEventListener("animationend",discardListener);discardListener=null;}
}
function mood(value){document.querySelector(".office").dataset.mood=value;}
function progress(){const el=document.getElementById("progress");if(el)el.textContent=category?t("Questions answered: ","উত্তর দেওয়া প্রশ্ন: ")+answers.length+t(" · Wrong guesses: "," · ভুল অনুমান: ")+rejected.size:"";}
const categories=$("categories"),answerPanel=$("answers"),guessPanel=$("guess"),back=$("back");
const answerKeys=["yes","no","probably","probably-not","unknown"];
function submitAnswer(value){if(mode!=="ask"||!currentKey||!answerKeys.includes(value))return;answers.push({key:currentKey,value});currentKey=null;mode="ask";render();}
function visible(node,yes){node.hidden=!yes;}
function showNote(){
 const show=Boolean(guess)&&(mode==="guess"||mode==="wrong"||mode==="done");
 const note=$("case-note"),photo=$("case-photo");
 visible(note,show);
 if(!show){
  photoRequest++;photo.onload=null;photo.onerror=null;
  photo.hidden=true;photo.removeAttribute("src");photo.alt="";
  note.dataset.guessId="";
  return;
 }
 $("case-note-label").textContent=t(mode==="done"?"Case solved":"Detective’s note",mode==="done"?"রহস্যের সমাধান":"গোয়েন্দার নোট");
 $("case-note-name").textContent=guess.name;
 const path=localPhotoPath(guess);
 const sameGuess=note.dataset.guessId===guess.id;
 note.dataset.guessId=guess.id;
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
function reset(){cancelDiscard();category=null;answers=[];rejected=new Set();rejectionHistory=[];mode="start";currentKey=null;guess=null;render();}
function render(){
 updateLabels();progress();
 visible(categories,mode==="start");visible(answerPanel,false);visible(guessPanel,false);visible($("keyboard-hint"),false);showNote();visible($("correct"),mode==="guess");visible($("wrong"),mode==="guess");visible($("retry"),mode==="wrong");
 visible(back,mode!=="start"&&mode!=="done"&&mode!=="discard"&&answers.length>0);
 if(mode==="start"){mood("ready");$("status").textContent=t("Think of a character, animal, object or someone you know.","একটি চরিত্র, প্রাণী, বস্তু বা পরিচিত কাউকে মনে মনে ভাবুন।");return;}
 if(mode==="discard"){mood("discard");visible(guessPanel,false);$("status").textContent=t("Clearing the old clue…","পুরোনো সূত্র সরিয়ে ফেলছি…");return;}
 if(mode==="wrong"){mood("wrong");$("status").textContent=t("That guess was wrong. Shall I try again?","অনুমানটি ভুল হয়েছে। আবার চেষ্টা করব?");visible(guessPanel,true);showNote();return;}
 if(mode==="done"){mood("happy");$("status").textContent=t("Case closed! 🕵️","রহস্যের সমাধান! 🕵️");showNote();return;}
 const ranked=scoreCandidates(allEntries.filter(e=>e.category===category),answers,rejected);
 if(!ranked.length){currentKey=null;guess=null;mood("unsure");$("status").textContent=t("I have no more guesses in my casebook. Start a new game.","আমার তথ্যভান্ডারে আর কোনো অনুমান নেই। নতুন খেলা শুরু করুন।");return;}
 const suggestion=selectGuess(ranked,answers,allQuestions);
 if(suggestion){mood("guess");guess=suggestion;mode="guess";$("status").textContent=t("Are you thinking of ","আপনি কি ")+guess.name+t("?","-এর কথা ভাবছেন?");visible(guessPanel,true);visible($("correct"),true);visible($("wrong"),true);showNote();return;}
 currentKey=nextQuestion(ranked,answers,allQuestions);
 if(!currentKey){
   if(ranked[0].matches>0){guess=ranked[0].entry;mode="guess";$("status").textContent="I'm not certain. Could it be "+guess.name+"?";visible(guessPanel,true);visible($("correct"),true);visible($("wrong"),true);showNote();}
   else $("status").textContent="I don't have enough evidence to make a reliable guess. You can correct an answer or start a new game.";
   return;
 }
 mode="ask";mood(rejected.size?"retry":"thinking");$("status").textContent=lang==="bn"?(banglaQuestions[currentKey]||allQuestions[currentKey]):allQuestions[currentKey];visible(answerPanel,true);visible($("keyboard-hint"),true);
}
document.querySelectorAll("[data-category]").forEach(b=>b.addEventListener("click",()=>{category=b.dataset.category;answers=[];rejected=new Set();rejectionHistory=[];mode="ask";render();}));
document.querySelectorAll("[data-answer]").forEach(b=>b.addEventListener("click",()=>submitAnswer(b.dataset.answer)));
$("correct").addEventListener("click",()=>{if(mode!=="guess"||!guess)return;mode="done";render();});
$("wrong").addEventListener("click",()=>{if(mode!=="guess")return;mode="wrong";render();});
$("retry").addEventListener("click",()=>{
 if(mode!=="wrong")return;
 if(guess){rejectionHistory=rejectGuess(rejectionHistory,guess.id,answers.length);rejected=rejectedIds(rejectionHistory);}
 cancelDiscard();mode="discard";const token=discardToken;
 visible(guessPanel,false);visible(back,false);
 const note=$("case-note"),office=document.querySelector(".office");
 office.dataset.mood="discard";
 const finish=()=>{
  if(token!==discardToken||mode!=="discard")return;
  if(discardTimer!==null){clearTimeout(discardTimer);discardTimer=null;}
  if(discardListener){note.removeEventListener("animationend",discardListener);discardListener=null;}
  guess=null;mode="ask";render();mood("retry");
 };
 if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){finish();return;}
 discardListener=event=>{
  // Ignore bubbling photo animations; only the paper reaching the bin completes Retry.
  if(event.target===note&&event.animationName==="note-to-bin")finish();
 };
 note.addEventListener("animationend",discardListener);
 // If CSS animation is unavailable or interrupted, the player must never get stuck.
 discardTimer=setTimeout(finish,1900);
});
document.addEventListener("keydown",event=>{
 if(event.altKey||event.ctrlKey||event.metaKey||event.repeat||event.target instanceof Element&&event.target.closest("input,textarea,select,[contenteditable]"))return;
 if(mode==="ask"&&/^[1-5]$/.test(event.key)){event.preventDefault();submitAnswer(answerKeys[Number(event.key)-1]);}
});
back.addEventListener("click",()=>{if(answers.length){answers.pop();rejectionHistory=rewindRejections(rejectionHistory,answers.length);rejected=rejectedIds(rejectionHistory);guess=null;currentKey=null;mode="ask";render();}});
$("new").addEventListener("click",reset);$("language").addEventListener("click",()=>{lang=lang==="en"?"bn":"en";if(mode==="discard"){updateLabels();$("status").textContent=t("Clearing the old clue…","পুরোনো সূত্র সরিয়ে ফেলছি…");}else render();});render();
