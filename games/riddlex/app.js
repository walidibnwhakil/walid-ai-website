import {setGameInProgress} from "../refresh-guard.mjs";
import {animateWelcome,animateProps} from "./scene-props.js?v=release";
import {animateOffice} from "./scene-motion.js?v=desk-reveal";
import {loadCategory} from "./runtime-loader.js?v=adaptive-rc1";
import {ANSWERS as answerKeys,scoreCandidates,nextQuestion,selectGuess,selectTentativeGuess} from "./engine-v2.js?v=release";
import {rejectGuess,rewindRejections,rejectedIds} from "./history.js";
import {createGuessReveal} from "./guess-reveal.js?v=release";
let allEntries=[],allQuestions={};
const contextKey="relationship_context";
const contextQuestion="Are you thinking of someone by their relationship to you, such as a relative or friend?";
let loadToken=0;
let questionSeed;
const $=id=>document.getElementById(id);
let category=null,answers=[],rejected=new Set(),rejectionHistory=[],mode="splash",currentKey=null,guess=null;
let tentative=false;
const office=document.querySelector(".office");
const reveal=createGuessReveal(office);
animateOffice(office);
animateWelcome($("splash-art"));
animateProps(office,office.querySelector(".scene-art"));
const status=$("status"), statusHome=status.parentElement;
function mood(value){office.dataset.mood=value;}
function progress(){const el=document.getElementById("progress");if(el)el.textContent=category?"Questions answered: "+answers.length+" · Wrong guesses: "+rejected.size:"";}
const categories=$("categories"),answerPanel=$("answers"),guessPanel=$("guess"),back=$("back");

function submitAnswer(value){if((mode!=="ask"&&mode!=="edit")||!currentKey||!answerKeys.includes(value))return;answers.push({key:currentKey,value});currentKey=null;mode="ask";render();}
function visible(node,yes){node.hidden=!yes;}
function guessName(){
 // This imported label appends a Kannada transliteration to the English name.
 return guess.id==="wd-q3351726"?"Tarasankar Bandyopadhyay":guess.name;
}
function setStatus(message, parent=statusHome){
 if(status.parentElement!==parent){
  if(parent===statusHome)parent.insertBefore(status,$("progress"));
  else parent.append(status);
 }
 status.textContent=message;
}
function showQuestion(){
 mood("thinking");
 setStatus(allQuestions[currentKey],office);
 visible(answerPanel,true);
}
function showNote(){
 const note=$("case-note");
 const show=mode==="guess"||mode==="done"||mode==="wrong"||mode==="retrying";
 visible(note,show);
 note.dataset.guessId=show?guess.id:"";
 if(!show&&mode!=="retrying"){
  reveal.clear();
  note.dataset.result="";
 }
 if(!show)return;
 $("case-note-label").textContent=mode==="done"?"Case solved":mode==="wrong"?"Guess ruled out":"Detective’s note";
 $("case-note-name").textContent=guessName();
 if(mode==="wrong")note.dataset.result="rejected";
 if(mode==="wrong"||mode==="retrying")return;
 reveal.start(guess,guessName(),phase=>{
  note.dataset.result=phase;
  if(mode==="guess"&&(phase==="printed"||phase==="written"))presentGuess();
 });
}
function guessPrompt(){
 const name=guessName();
 return tentative?"My best lead is "+name+". Is that what you had in mind?":"Are you thinking of "+name+"?";
}
function presentGuess(){
 showNote();
 mood("guess");
 const ready=["printed","written"].includes($("case-note").dataset.result);
 setStatus(ready?guessPrompt():"The detective is preparing the evidence…");
 visible(guessPanel,ready);visible($("correct"),true);visible($("wrong"),true);
}
function showUnresolved(){
 mood("unsure");showNote();visible(guessPanel,true);visible($("retry"),true);
 setStatus("I don’t have enough evidence to make a reliable guess. You can change an answer or retry with a new case.");
}
function reset(){loadToken++;category=null;answers=[];rejected=new Set();rejectionHistory=[];mode="start";currentKey=null;guess=null;render();}
function render(){
 setGameInProgress(!["splash","start","done"].includes(mode));
 progress();
 const splash=mode==="splash";
 visible($("splash-art"),splash);
 visible(office,!splash);
 if(!splash){
  const artwork=office.querySelector(".scene-art[data-src]");
  if(artwork){
   artwork.src=artwork.dataset.src;
   delete artwork.dataset.src;
  }
 }
 for(const id of ["status","progress","new","privacy-note"])visible($(id),!splash);
 visible($("play"),splash);
 visible(categories,mode==="start");visible(answerPanel,false);visible(guessPanel,false);showNote();visible($("correct"),mode==="guess");visible($("wrong"),mode==="guess");visible($("retry"),mode==="wrong"||mode==="unsure");
 visible(back,mode!=="start"&&mode!=="done"&&answers.length>0);
 if(splash)return;
 if(mode==="loading"){mood("thinking");setStatus("Opening the casebook…");return;}
 if(mode==="start"){mood("ready");setStatus("Think of a character, animal, object or someone you know.");return;}
 if(mode==="wrong"){mood("wrong");setStatus("That guess was wrong. Shall I try again?");visible(guessPanel,true);showNote();return;}
 if(mode==="retrying"){mood("retrying");setStatus("Reopening the case…");return;}
 if(mode==="done"){mood("happy");setStatus("Case closed!");showNote();return;}
 if(mode==="edit"){showQuestion();return;}
 if(mode==="guess"){presentGuess();return;}
 if(mode==="unsure"){showUnresolved();return;}
 const context=answers.find(answer=>answer.key===contextKey);
 if(category==="characters"&&!context){
  currentKey=contextKey;mode="ask";showQuestion();return;
 }
 const candidates=allEntries.filter(entry=>{
  if(context?.value==="yes")return entry.category==="relationships";
  return entry.category===category;
 });
 const clues=answers.filter(answer=>answer.key!==contextKey);
 const ranked=scoreCandidates(candidates,clues,rejected);
 const suggestion=selectGuess(ranked,clues);
 if(suggestion){tentative=clues.some(({value})=>value==="probably"||value==="probably-not");guess=suggestion;mode="guess";presentGuess();return;}
 currentKey=nextQuestion(ranked,clues,allQuestions,questionSeed);
 if(!currentKey){
   guess=selectTentativeGuess(ranked,clues);
   if(guess){tentative=true;mode="guess";presentGuess();return;}
   guess=null;mode="unsure";showUnresolved();
   return;
 }
 mode="ask";showQuestion();
}
document.querySelectorAll("[data-category]").forEach(b=>b.addEventListener("click",async()=>{
 const token=++loadToken;category=b.dataset.category;answers=[];rejected=new Set();rejectionHistory=[];mode="loading";render();
 questionSeed=crypto.getRandomValues(new Uint32Array(1))[0];
 try{
  const pools=category==="characters"?["characters","relationships"]:[category];
  const data=await Promise.all(pools.map(loadCategory));
  if(token!==loadToken)return;
  allEntries=data.flatMap(pool=>pool.entries);
  allQuestions=Object.assign({},...data.map(pool=>pool.questions));
  if(category==="characters"){
   allQuestions[contextKey]=contextQuestion;
  }
  mode="ask";render();
 if(mode==="ask")answerPanel.querySelector("button").focus();
 }catch{
  if(token!==loadToken)return;
  reset();
  setStatus("The casebook could not load. Please choose a category to retry.");
 }
}));
$("play").addEventListener("click",()=>{reset();categories.querySelector("button").focus();});
document.querySelectorAll("[data-answer]").forEach(b=>b.addEventListener("click",()=>submitAnswer(b.dataset.answer)));
$("correct").addEventListener("click",()=>{if(mode!=="guess"||!guess)return;mode="done";render();});
$("wrong").addEventListener("click",()=>{if(mode!=="guess")return;mode="wrong";render();});
$("retry").addEventListener("click",async()=>{
 if(mode==="unsure"){reset();return;}
 if(mode!=="wrong")return;

 const token=++loadToken;
 mode="retrying";render();
 if(!matchMedia("(prefers-reduced-motion: reduce)").matches){
  await new Promise(resolve=>setTimeout(resolve,1650));
 }
 if(token!==loadToken||mode!=="retrying")return;
 rejectionHistory=rejectGuess(rejectionHistory,guess.id,answers.length);
 rejected=rejectedIds(rejectionHistory);
 guess=null;mode="ask";render();
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
$("new").addEventListener("click",reset);
render();

const footer=document.createElement('footer');
footer.className='site-footer';
footer.innerHTML='<nav aria-label="Site information"><a href="/about-us.html">About Us</a><span aria-hidden="true">·</span><a href="/contact-us.html">Contact Us</a><span aria-hidden="true">·</span><a href="/privacy-policy.html">Privacy Policy</a><span aria-hidden="true">·</span><a href="/terms-of-service.html">Terms of Service</a></nav><p>© 2026 Walid AI. All rights reserved.</p>';
document.body.append(footer);
