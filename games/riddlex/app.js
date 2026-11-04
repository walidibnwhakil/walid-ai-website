import {entries,questions} from "./data.js";
import {roles,relationshipQuestions} from "./relationships.js";
import {scoreCandidates,nextQuestion,selectGuess} from "./engine.js";
const allEntries=[...entries,...roles];const allQuestions={...questions,...relationshipQuestions};
const $=id=>document.getElementById(id);
let category=null,answers=[],rejected=new Set(),mode="start",currentKey=null,guess=null;
const categories=$("categories"),answerPanel=$("answers"),guessPanel=$("guess");
function visible(node,yes){node.hidden=!yes;}
function reset(){category=null;answers=[];rejected=new Set();mode="start";currentKey=null;guess=null;render();}
function render(){
  visible(categories,mode==="start");visible(answerPanel,false);visible(guessPanel,false);
  if(mode==="start"){$("status").textContent="Think of a character, animal, object or someone you know.";return;}
  if(mode==="done"){$("status").textContent="Case closed! 🕵️";return;}
  const ranked=scoreCandidates(allEntries.filter(e=>e.category===category),answers,rejected);
  if(!ranked.length){$("status").textContent="I have no more matches in this casebook. Please start a new game.";return;}
  const suggestion=selectGuess(ranked,answers,allQuestions);
  if(suggestion){guess=suggestion;mode="guess";$("status").textContent=(ranked.length>1?"My tentative guess: ":"Are you thinking of ")+guess.name+"?";visible(guessPanel,true);return;}
  currentKey=nextQuestion(ranked,answers,allQuestions);
  if(!currentKey){if(answers.every(a=>a.value==="unknown")){$("status").textContent="I need at least one Yes, No or Probably answer to make a useful guess. Try New Game.";return;}guess=ranked[0].entry;mode="guess";$("status").textContent="I am not certain. Could it be "+guess.name+"?";visible(guessPanel,true);return;}
  $("status").textContent=allQuestions[currentKey];visible(answerPanel,true);
}
document.querySelectorAll("[data-category]").forEach(b=>b.addEventListener("click",()=>{category=b.dataset.category;answers=[];rejected=new Set();mode="ask";render();}));
document.querySelectorAll("[data-answer]").forEach(b=>b.addEventListener("click",()=>{if(!currentKey)return;answers.push({key:currentKey,value:b.dataset.answer});mode="ask";render();}));
$("correct").addEventListener("click",()=>{mode="done";render();});
$("retry").addEventListener("click",()=>{if(guess)rejected.add(guess.id);mode="ask";render();});
$("new").addEventListener("click",reset);render();
