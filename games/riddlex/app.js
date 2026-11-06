import {animateWelcome,animateProps} from "./scene-props.js?v=retry-paper";
import {animateOffice} from "./scene-motion.js?v=desk-reveal";
import {clearRuntimeCache,loadCategory} from "./runtime-loader.js?v=learn1";
import {ANSWERS as answerKeys,scoreCandidates,nextQuestion,selectGuess,selectTentativeGuess} from "./engine-v2.js?v=arcade";
import {rejectGuess,rewindRejections,rejectedIds} from "./history.js";
import {createGuessReveal} from "./guess-reveal.js?v=retry-paper";
import {deletePrivateLearning,loadPrivateLearning,submitLearning} from "./learning-client.js?v=learn1";
let allEntries=[],allQuestions={};
const contextKey="relationship_context";
const contextQuestion="Are you thinking of someone by their relationship to you, such as a relative or friend?";
let loadToken=0;
let questionSeed;
const $=id=>document.getElementById(id);
let category=null,answers=[],rejected=new Set(),rejectionHistory=[],learningProbes=new Set(),mode="splash",currentKey=null,guess=null;
let tentative=false;
const office=document.querySelector(".office");
const reveal=createGuessReveal(office);
if(window.firebase?.apps?.length){
 let learningUid=window.firebase.auth().currentUser?.uid||"";
 window.firebase.auth().onAuthStateChanged(user=>{
  const nextUid=user?.uid||"";
  if(nextUid!==learningUid){
   allEntries=allEntries.filter(entry=>entry.visibility!=="private");
   $("private-list").replaceChildren();$("my-learning").hidden=true;$("private-status").textContent="";
   learningUid=nextUid;
   if(category)reset();
  }
 });
}
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
 mood("unsure");showNote();visible(guessPanel,false);visible($("learn-form"),true);
 setStatus("I couldn't figure it out this time. Who were you thinking of? Help me learn!");
}
function reset(){loadToken++;category=null;answers=[];rejected=new Set();rejectionHistory=[];learningProbes=new Set();mode="start";currentKey=null;guess=null;render();}
function render(){
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
 visible(categories,mode==="start");visible(answerPanel,false);visible(guessPanel,false);visible($("learn-form"),mode==="unsure");showNote();visible($("correct"),mode==="guess");visible($("wrong"),mode==="guess");visible($("retry"),mode==="wrong");
 visible(back,mode!=="start"&&mode!=="done"&&answers.length>0);
 if(splash)return;
 if(mode==="loading"){mood("thinking");setStatus("Opening the casebook…");return;}
 if(mode==="start"){mood("ready");setStatus("Think of a character, animal, object or someone you know.");return;}
 if(mode==="wrong"){mood("wrong");setStatus("That guess was wrong. Shall I try again?");visible(guessPanel,true);showNote();return;}
 if(mode==="retrying"){mood("retrying");setStatus("Reopening the case…");return;}
 if(mode==="done"){mood("happy");setStatus("Case closed!");showNote();return;}
 if(mode==="learned"){mood("happy");setStatus("Thank you. I saved this target privately with the answers from this case. A moderator will review it before anyone else can see it.");return;}
 if(mode==="edit"){showQuestion();return;}
 if(mode==="guess"){presentGuess();return;}
 if(mode==="unsure"){showUnresolved();return;}
 const context=answers.find(answer=>answer.key===contextKey);
 if(category==="characters"&&!context){
  currentKey=contextKey;mode="ask";showQuestion();return;
 }
 const candidates=allEntries.filter(entry=>{
  if(context?.value==="yes")return entry.category==="relationships"||(entry.category==="characters"&&entry.facts?.[contextKey]===true);
  return entry.category===category;
 });
 const clues=answers.filter(answer=>answer.key!==contextKey);
 const ranked=scoreCandidates(candidates,clues,rejected);
 const suggestion=selectGuess(ranked,clues);
 if(suggestion){tentative=clues.some(({value})=>value==="probably"||value==="probably-not");guess=suggestion;mode="guess";presentGuess();return;}
 const meaningful=clues.filter(({value})=>value!=="unknown").length;
 if(meaningful>=24){guess=null;mode="unsure";showUnresolved();return;}
 currentKey=nextQuestion(ranked,clues,allQuestions,questionSeed);
 if(!currentKey){
   guess=selectTentativeGuess(ranked,clues);
   if(guess){tentative=true;mode="guess";presentGuess();return;}
   const hardFacts=clues.filter(({value})=>value==="yes"||value==="no").length;
   if(hardFacts<2&&learningProbes.size<2){
    currentKey=nextQuestion(ranked,clues,allQuestions,questionSeed,true);
    if(currentKey&&!learningProbes.has(currentKey)){learningProbes.add(currentKey);mode="ask";showQuestion();return;}
   }
   guess=null;mode="unsure";showUnresolved();
   return;
 }
 mode="ask";showQuestion();
}
document.querySelectorAll("[data-category]").forEach(b=>b.addEventListener("click",async()=>{
 const token=++loadToken;category=b.dataset.category;answers=[];rejected=new Set();rejectionHistory=[];learningProbes=new Set();mode="loading";render();
 $("learn-form").elements.category.value=category;
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
  await new Promise(resolve=>setTimeout(resolve,5400));
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
 learningProbes.delete(previous.key);
 rejectionHistory=rewindRejections(rejectionHistory,answers.length);
 rejected=rejectedIds(rejectionHistory);
 guess=null;currentKey=previous.key;mode="edit";render();
 answerPanel.querySelector('[data-answer="'+previous.value+'"]').focus();
});
$("new").addEventListener("click",reset);
async function refreshPrivateLearning(){
 const status=$("private-status"),host=$("private-list");host.replaceChildren();status.textContent="Loading your private targets…";
 try{
  const {entries}=await loadPrivateLearning();
  if(!entries.length){status.textContent="No private targets are saved to this account.";return;}
  status.textContent="These targets are visible only to this account. Removing an approved target here does not remove its shared verified entry.";
  for(const entry of entries){
   const row=document.createElement("article"),title=document.createElement("strong"),info=document.createElement("p"),remove=document.createElement("button");
   title.textContent=entry.name;info.textContent=[entry.category,entry.status,entry.imageAvailable?"Image attached":"No image"].join(" · ");
   remove.type="button";remove.textContent="Delete my private copy";remove.addEventListener("click",async()=>{
    if(!confirm("Delete this private target and its uploaded image from your account?"))return;
    try{await deletePrivateLearning(entry.id);await refreshPrivateLearning();}catch(error){status.textContent=error.message||"Could not delete this target.";}
   });row.className="private-learning-row";row.append(title,info,remove);host.append(row);
  }
 }catch(error){status.textContent=error.message||"Your private targets could not be loaded.";}
}
$("my-learning-toggle").addEventListener("click",()=>{$("my-learning").hidden=!$("my-learning").hidden;if(!$("my-learning").hidden)refreshPrivateLearning();});
$("refresh-private").addEventListener("click",refreshPrivateLearning);
$("learn-form").addEventListener("submit",async event=>{
 event.preventDefault();
 const form=event.currentTarget,fields=new FormData(form),status=$("learn-status"),file=fields.get("image");
 status.textContent="Saving this target privately…";
 const imageRightsConfirmed=fields.get("imageRightsConfirmed")==="on";
 try{
  let imageData="",imageMime="";
  if(file?.size){
   if(file.size>450_000)throw new Error("Choose an image smaller than 450 KB.");
   if(!imageRightsConfirmed)throw new Error("Confirm that you have permission to share this image.");
   imageMime=file.type;
   imageData=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]||"");reader.onerror=()=>reject(new Error("The image could not be read."));reader.readAsDataURL(file);});
  }
  await submitLearning({name:fields.get("name"),category:fields.get("category"),description:fields.get("description"),country:fields.get("country"),source:fields.get("source"),distinguishing:fields.get("distinguishing"),answers:answers.map(({key,value})=>({key,value})),imageData,imageMime,imageRightsConfirmed,imageAttribution:fields.get("imageAttribution"),imageLicense:fields.get("imageLicense")});
  clearRuntimeCache();
  mode="learned";render();
 }catch(error){status.textContent=error.message||"The target could not be saved. Please try again.";}
});
render();
