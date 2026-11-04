import {entries,questions} from "./casebook.js";
import {roles,relationshipQuestions} from "./relationships.js";
import {banglaQuestions} from "./questions.bn.js";
import {scoreCandidates,nextQuestion,selectGuess} from "./engine.js";
import {rejectGuess,rewindRejections,rejectedIds} from "./history.js";
const allEntries=[...entries,...roles],allQuestions={...questions,...relationshipQuestions};
const $=id=>document.getElementById(id);
let lang="en";
const translations={characters:"চরিত্র",animals:"প্রাণী",objects:"বস্তু",relationships:"পরিচিত কেউ",yes:"হ্যাঁ",no:"না",probably:"সম্ভবত", "probably-not":"সম্ভবত না",unknown:"জানি না"};
function t(en,bn){return lang==="bn"?bn:en;}
function updateLabels(){document.documentElement.lang=lang;$("language").textContent=lang==="bn"?"English":"বাংলা";document.querySelectorAll("[data-category]").forEach(b=>b.textContent=lang==="bn"?translations[b.dataset.category]:({characters:"Characters",animals:"Animals",objects:"Objects",relationships:"Someone I know"})[b.dataset.category]);document.querySelectorAll("[data-answer]").forEach(b=>b.textContent=lang==="bn"?translations[b.dataset.answer]:({yes:"Yes",no:"No",probably:"Probably","probably-not":"Probably Not",unknown:"Don\'t Know"})[b.dataset.answer]);$("correct").textContent=t("Correct!","সঠিক!");$("retry").textContent=t("Retry","আবার চেষ্টা");$("back").textContent=t("↶ Change last answer","↶ আগের উত্তর বদলাও");$("new").textContent=t("New Game","নতুন খেলা");}
let category=null,answers=[],rejected=new Set(),rejectionHistory=[],mode="start",currentKey=null,guess=null;
function mood(value){document.querySelector(".office").dataset.mood=value;}
function progress(){const el=document.getElementById("progress");if(el)el.textContent=category?t("Questions answered: ","উত্তর দেওয়া প্রশ্ন: ")+answers.length+t(" · Wrong guesses: "," · ভুল অনুমান: ")+rejected.size:"";}
const categories=$("categories"),answerPanel=$("answers"),guessPanel=$("guess"),back=$("back");
function visible(node,yes){node.hidden=!yes;}
function reset(){category=null;answers=[];rejected=new Set();rejectionHistory=[];mode="start";currentKey=null;guess=null;render();}
function render(){
 updateLabels();progress();
 visible(categories,mode==="start");visible(answerPanel,false);visible(guessPanel,false);
 visible(back,mode!=="start"&&mode!=="done"&&answers.length>0);
 if(mode==="start"){mood("ready");$("status").textContent=t("Think of a character, animal, object or someone you know.","একটি চরিত্র, প্রাণী, বস্তু বা পরিচিত কাউকে মনে মনে ভাবুন।");return;}
 if(mode==="done"){mood("happy");$("status").textContent=t("Case closed! 🕵️","রহস্যের সমাধান! 🕵️");return;}
 const ranked=scoreCandidates(allEntries.filter(e=>e.category===category),answers,rejected);
 if(!ranked.length){mood("unsure");$("status").textContent=t("I have no more guesses in my casebook. Start a new game.","আমার তথ্যভান্ডারে আর কোনো অনুমান নেই। নতুন খেলা শুরু করুন।");return;}
 const suggestion=selectGuess(ranked,answers,allQuestions);
 if(suggestion){mood("guess");guess=suggestion;mode="guess";$("status").textContent=t("Are you thinking of ","আপনি কি ")+guess.name+t("?","-এর কথা ভাবছেন?");visible(guessPanel,true);return;}
 currentKey=nextQuestion(ranked,answers,allQuestions);
 if(!currentKey){
   if(ranked[0].matches>0){guess=ranked[0].entry;mode="guess";$("status").textContent="I'm not certain. Could it be "+guess.name+"?";visible(guessPanel,true);}
   else $("status").textContent="I don't have enough evidence to make a reliable guess. You can correct an answer or start a new game.";
   return;
 }
 mode="ask";mood(rejected.size?"retry":"thinking");$("status").textContent=lang==="bn"?(banglaQuestions[currentKey]||allQuestions[currentKey]):allQuestions[currentKey];visible(answerPanel,true);
}
document.querySelectorAll("[data-category]").forEach(b=>b.addEventListener("click",()=>{category=b.dataset.category;answers=[];rejected=new Set();rejectionHistory=[];mode="ask";render();}));
document.querySelectorAll("[data-answer]").forEach(b=>b.addEventListener("click",()=>{if(!currentKey)return;answers.push({key:currentKey,value:b.dataset.answer});mode="ask";render();}));
$("correct").addEventListener("click",()=>{mode="done";render();});
$("retry").addEventListener("click",()=>{if(guess){rejectionHistory=rejectGuess(rejectionHistory,guess.id,answers.length);rejected=rejectedIds(rejectionHistory);}guess=null;mode="ask";render();});
back.addEventListener("click",()=>{if(answers.length){answers.pop();rejectionHistory=rewindRejections(rejectionHistory,answers.length);rejected=rejectedIds(rejectionHistory);guess=null;currentKey=null;mode="ask";render();}});
$("new").addEventListener("click",reset);$("language").addEventListener("click",()=>{lang=lang==="en"?"bn":"en";render();});render();
