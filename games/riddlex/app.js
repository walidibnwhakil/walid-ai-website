import {entries,questions} from "./casebook.js";
import {roles,relationshipQuestions} from "./relationships.js";
import {scoreCandidates,nextQuestion,selectGuess} from "./engine.js";
const allEntries=[...entries,...roles],allQuestions={...questions,...relationshipQuestions};
const $=id=>document.getElementById(id);
let category=null,answers=[],rejected=new Set(),mode="start",currentKey=null,guess=null;
const categories=$("categories"),answerPanel=$("answers"),guessPanel=$("guess"),back=$("back");
function visible(node,yes){node.hidden=!yes;}
function reset(){category=null;answers=[];rejected=new Set();mode="start";currentKey=null;guess=null;render();}
function render(){
 visible(categories,mode==="start");visible(answerPanel,false);visible(guessPanel,false);
 visible(back,mode!=="start"&&mode!=="done"&&answers.length>0);
 if(mode==="start"){$("status").textContent="Think of a character, animal, object or someone you know.";return;}
 if(mode==="done"){$("status").textContent="Case closed! 🕵️";return;}
 const ranked=scoreCandidates(allEntries.filter(e=>e.category===category),answers,rejected);
 if(!ranked.length){$("status").textContent="I have no more guesses in my casebook. Start a new game.";return;}
 const suggestion=selectGuess(ranked,answers,allQuestions);
 if(suggestion){guess=suggestion;mode="guess";$("status").textContent="Are you thinking of "+guess.name+"?";visible(guessPanel,true);return;}
 currentKey=nextQuestion(ranked,answers,allQuestions);
 if(!currentKey){
   if(ranked[0].matches>0){guess=ranked[0].entry;mode="guess";$("status").textContent="I'm not certain. Could it be "+guess.name+"?";visible(guessPanel,true);}
   else $("status").textContent="I don't have enough evidence to make a reliable guess. You can correct an answer or start a new game.";
   return;
 }
 mode="ask";$("status").textContent=allQuestions[currentKey];visible(answerPanel,true);
}
document.querySelectorAll("[data-category]").forEach(b=>b.addEventListener("click",()=>{category=b.dataset.category;answers=[];rejected=new Set();mode="ask";render();}));
document.querySelectorAll("[data-answer]").forEach(b=>b.addEventListener("click",()=>{if(!currentKey)return;answers.push({key:currentKey,value:b.dataset.answer});mode="ask";render();}));
$("correct").addEventListener("click",()=>{mode="done";render();});
$("retry").addEventListener("click",()=>{if(guess)rejected.add(guess.id);guess=null;mode="ask";render();});
back.addEventListener("click",()=>{if(answers.length){answers.pop();guess=null;mode="ask";render();}});
$("new").addEventListener("click",reset);render();
