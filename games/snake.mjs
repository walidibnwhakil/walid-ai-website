import {gameShell,control} from "./shell.mjs";
import {gridSize,directions,isReverse,advanceSnake,nextFood} from "./snake-rules.mjs";

const keyDirections=new Map(Object.entries(directions));
let snake,food,direction,next,running,ended,score=0,best=Number(localStorage.getItem("walid-snake-best")||0);
let swipeStart=null;
const game=gameShell({modes:false,reset(){
  snake=[8+8*gridSize,7+8*gridSize,6+8*gridSize];
  direction=next=directions.ArrowRight;
  running=ended=false;score=0;food=nextFood(snake);
  draw("Ready. Swipe, use arrow keys or WASD, or press Start.");
}});
game.board.classList.add("snake");
game.board.setAttribute("aria-roledescription","Snake game board");
game.board.setAttribute("tabindex","0");
const cells=Array.from({length:gridSize*gridSize},(_,index)=>{
  const cell=document.createElement("span");cell.dataset.index=String(index);cell.setAttribute("aria-hidden","true");game.board.append(cell);return cell;
});
const pause=document.querySelector("#pause");
pause.addEventListener("click",()=>{
  if(ended){game.restart();running=true;queue();draw("Playing.");return;}
  running=!running;
  if(running)queue();
  draw(running?"Playing.":"Paused.");
});
const pad=document.querySelector("#actions");
const padButtons={};
for(const [key,vector] of [["ArrowUp",directions.ArrowUp],["ArrowLeft",directions.ArrowLeft],["ArrowDown",directions.ArrowDown],["ArrowRight",directions.ArrowRight]]){
  const label={ArrowUp:"Up",ArrowLeft:"Left",ArrowDown:"Down",ArrowRight:"Right"}[key];
  const button=control({ArrowUp:"↑",ArrowLeft:"←",ArrowDown:"↓",ArrowRight:"→"}[key],()=>steer(vector),label);
  button.className="direction-key";button.dataset.direction=key.toLowerCase().replace("arrow","");
  pad.append(button);padButtons[key]=button;
}
document.addEventListener("keydown",event=>{
  const editable=event.target.closest("input,textarea,select,[contenteditable=true]");
  if(editable||event.altKey||event.ctrlKey||event.metaKey)return;
  const vector=keyDirections.get(event.key);
  if(!vector)return;
  event.preventDefault();steer(vector);
});

game.board.addEventListener("pointerdown",event=>{
  if(event.button!==undefined&&event.button!==0)return;
  swipeStart={x:event.clientX,y:event.clientY,id:event.pointerId};
  event.preventDefault();
});
document.addEventListener("pointerup",event=>{
  if(!swipeStart||swipeStart.id!==event.pointerId)return;
  const dx=event.clientX-swipeStart.x,dy=event.clientY-swipeStart.y;
  swipeStart=null;
  if(Math.max(Math.abs(dx),Math.abs(dy))<18)return;
  steer(Math.abs(dx)>Math.abs(dy)?[Math.sign(dx),0]:[0,Math.sign(dy)]);
  event.preventDefault();
});
document.addEventListener("pointercancel",()=>{swipeStart=null;});
game.board.addEventListener("contextmenu",event=>event.preventDefault());

function steer(vector){
  if(ended)return;
  if(isReverse(next,vector))return;
  next=vector;
  if(!running){running=true;queue();draw("Playing.");}
}
function queue(){
  game.later(()=>{
    if(!running)return;
    direction=next;
    const result=advanceSnake(snake,direction,food,gridSize);
    if(result.dead){running=false;ended=true;draw("Game over. Press Play again or New Game.");return;}
    snake=result.snake;
    if(result.ate){score++;if(score>best){best=score;localStorage.setItem("walid-snake-best",String(best));}food=nextFood(snake);}
    if(result.won){running=false;ended=true;draw("Board filled. You win!");return;}
    if(result.ate)draw("Fruit collected.");else paint();
    queue();
  },matchMedia("(prefers-reduced-motion: reduce)").matches?230:150);
}
function paint(){
  const occupied=new Map(snake.map((position,index)=>[position,index]));
  cells.forEach((cell,index)=>{
    cell.className=index===food?"food":"";
    cell.style.removeProperty("--turn");
    const segment=occupied.get(index);
    if(segment!==undefined){
      if(segment===0){cell.classList.add("head");cell.dataset.facing=direction[0]===1?"right":direction[0]===-1?"left":direction[1]===1?"down":"up";}
      else{cell.classList.add("segment");cell.style.setProperty("--turn",String(segment));}
    }else delete cell.dataset.facing;
  });
}
function draw(message){
  paint();
  pause.textContent=ended?"Play again":running?"Pause":"Start";
  pause.setAttribute("aria-label",pause.textContent);
  document.querySelector("#score").textContent=`Score ${score}`;
  document.querySelector("#best").textContent=`Best ${best}`;
  game.status.textContent=`${message} Score ${score}. Best ${best}.`;
}
game.restart();
