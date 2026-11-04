import {entries,questions} from "./data.js";
import {scoreCandidates,nextQuestion,selectGuess} from "./engine.js";
const $=id=>document.getElementById(id);
let category=null,answers=[],rejected=new Set(),mode="start",currentKey=null,guess=null;
const categories=$("categories"),answerPanel=$("answers"),guessPanel=$("guess");
function visible(node,yes){node.hidden=!yes;}
function reset(){category=null;answers=[];rejected=new Set();mode="start";currentKey=null;guess=null;render();}
function render(){
  visible(categories,mode==="start");visible(answerPanel,false);visible(guessPanel,false);
  if(mode==="start"){$("status").textContent="Think of a character, animal or object.";return;}
  if(mode==="done"){$("status").textContent="Case closed! 🕵️";return;}
  const ranked=scoreCandidates(entries.filter(e=>e.category===category),answers,rejected);
  if(!ranked.length){$("status").textContent="I am out of guesses. Start a new game.";return;}
  const suggestion=selectGuess(ranked,answers,questions);
  if(suggestion){guess=suggestion;mode="guess";$("status").textContent=(ranked.length>1?"My tentative guess: ":"Are you thinking of ")+guess.name+"?";visible(guessPanel,true);return;}
  currentKey=nextQuestion(ranked,answers,questions);
  if(!currentKey){guess=ranked[0].entry;mode="guess";$("status").textContent="Could it be "+guess.name+"?";visible(guessPanel,true);return;}
  $("status").textContent=questions[currentKey];visible(answerPanel,true);
}
document.querySelectorAll("[data-category]").forEach(b=>b.addEventListener("click",()=>{category=b.dataset.category;answers=[];rejected=new Set();mode="ask";render();}));
document.querySelectorAll("[data-answer]").forEach(b=>b.addEventListener("click",()=>{if(!currentKey)return;answers.push({key:currentKey,value:b.dataset.answer});mode="ask";render();}));
$("correct").addEventListener("click",()=>{mode="done";render();});
$("retry").addEventListener("click",()=>{if(guess)rejected.add(guess.id);mode="ask";render();});
$("new").addEventListener("click",reset);render();
