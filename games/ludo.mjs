import {gameShell,choose} from "./shell.mjs";
import {newLudo,rollLudo,moveLudo,legalTokens,trackPosition,safe} from "./ludo-rules.mjs";

const teams=["Red","Blue","Green","Yellow"];
const track=[[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]];
const lanes=[
  Array.from({length:6},(_,i)=>[7,i+1]),
  Array.from({length:6},(_,i)=>[7,13-i]),
  Array.from({length:6},(_,i)=>[i+1,7]),
  Array.from({length:6},(_,i)=>[13-i,7])
];
const yards=[
  Array.from({length:4},(_,i)=>[2+(i>>1),2+i%2]),
  Array.from({length:4},(_,i)=>[11+(i>>1),11+i%2]),
  Array.from({length:4},(_,i)=>[2+(i>>1),11+i%2]),
  Array.from({length:4},(_,i)=>[11+(i>>1),2+i%2])
];
const dieHomes=[[34,34],[66,66],[66,34],[34,66]];
const pipSets={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
const reduceMotion=matchMedia("(prefers-reduced-motion: reduce)").matches;
const playerSelect=document.querySelector("#player-count");
const modeSelect=document.querySelector("#mode");
const seatOptions=document.querySelector("#seat-options");
const winnerOverlay=document.querySelector("#winner-overlay");
const winnerTitle=document.querySelector("#winner-title");
let activeTeams,state,message="",seatBots=[],motions=new Map();
let rolling=false,rollingPlayer=null,dieValue=1,moving=false,visualMove=null;

const game=gameShell({reset(){
  activeTeams=Array.from({length:Number(playerSelect.value)},(_,index)=>index);
  state=newLudo(activeTeams.length);
  message="";
  rolling=false;rollingPlayer=null;dieValue=1;moving=false;visualMove=null;motions=new Map();
  boardDie.classList.remove("rolling");
  configureSeats();
  render();
}});
game.board.classList.add("ludo");
const squares=new Map();
track.forEach(([row,column],index)=>addSquare(row,column,safe.has(index)?"safe track":"track"));
for(let player=0;player<4;player++){
  lanes[player].forEach(([row,column],index)=>addSquare(row,column,`lane ${teams[player].toLowerCase()} lane-${player} lane-step-${index}`));
  yards[player].forEach(([row,column])=>addSquare(row,column,`yard ${teams[player].toLowerCase()}`));
}
addSquare(7,7,"home-center");
function addSquare(row,column,kind){
  const tile=document.createElement("div");
  tile.className=kind;tile.style.gridArea=`${row+1} / ${column+1}`;
  game.board.append(tile);squares.set(`${row},${column}`,tile);
}

const boardDie=document.createElement("button");
boardDie.id="board-die";boardDie.type="button";boardDie.className="board-die";boardDie.dataset.value="1";
boardDie.addEventListener("click",()=>throwDie(false));
game.board.append(boardDie);
const pipNodes=Array.from({length:9},()=>{const pip=document.createElement("span");pip.className="die-pip";boardDie.append(pip);return pip;});
const playAgain=document.querySelector("#play-again");
const newGame=document.querySelector("#new-game");
playAgain.addEventListener("click",()=>game.restart());
newGame.addEventListener("click",()=>{game.restart();playerSelect.focus();});
playerSelect.addEventListener("change",game.restart);

function configureSeats(){
  seatBots=activeTeams.map((_,player)=>modeSelect.value==="bot"?player>0:modeSelect.value==="mixed"&&player>0);
  seatOptions.replaceChildren();seatOptions.hidden=modeSelect.value!=="mixed";
  if(modeSelect.value!=="mixed")return;
  const legend=document.createElement("strong");legend.textContent="Player seats";seatOptions.append(legend);
  activeTeams.forEach((team,player)=>{
    const label=document.createElement("label"),select=document.createElement("select");
    select.setAttribute("aria-label",`${teams[team]} seat type`);
    select.innerHTML='<option value="human">Human</option><option value="bot">Bot</option>';
    select.value=seatBots[player]?"bot":"human";
    if(player===0){seatBots[player]=false;select.value="human";}
    select.addEventListener("change",()=>{seatBots[player]=select.value==="bot";render();});
    label.append(`${teams[team]}: `,select);seatOptions.append(label);
  });
}
function isBot(player){
  if(modeSelect.value==="bot")return player>0;
  if(modeSelect.value==="mixed")return Boolean(seatBots[player]);
  return false;
}
function paintDie(){
  const teamId=activeTeams[rolling&&rollingPlayer!==null?rollingPlayer:state.turn];
  boardDie.dataset.team=teams[teamId].toLowerCase();
  boardDie.dataset.value=String(dieValue);
  boardDie.setAttribute("aria-label",rolling?`Rolling ${teams[teamId]} die`:`${teams[teamId]} die showing ${dieValue}${isBot(state.turn)||state.roll||state.winner!==null?"":". Tap to roll"}`);
  boardDie.disabled=rolling||moving||state.roll>0||state.winner!==null||isBot(state.turn);
  const [x,y]=dieHomes[teamId];boardDie.style.left=`${x}%`;boardDie.style.top=`${y}%`;
  const active=new Set(pipSets[dieValue]);
  pipNodes.forEach((pip,index)=>pip.classList.toggle("on",active.has(index)));
}

function throwDie(automated=false){
  if(rolling||moving||state.roll||state.winner!==null||isBot(state.turn)&&!automated)return;
  rolling=true;rollingPlayer=state.turn;
  dieValue=1+Math.floor(Math.random()*6);
  state=rollLudo(state,dieValue);
  message=`${teams[activeTeams[rollingPlayer]]} rolled ${dieValue}.${state.roll?"":" No legal token can move."}`;
  boardDie.classList.remove("rolling");
  requestAnimationFrame(()=>boardDie.classList.add("rolling"));
  render();
  game.later(()=>{
    rolling=false;rollingPlayer=null;boardDie.classList.remove("rolling");
    const legal=legalTokens(state);
    if(state.roll&&legal.length===1){selectToken(legal[0]);return;}
    render();
  },reduceMotion?40:560);
}

function selectToken(index){
  const legal=legalTokens(state);
  if(rolling||moving||state.winner!==null||!legal.includes(index))return;
  const seat=state.turn,old=state.pieces[seat][index];
  const target=old<0?0:old+state.roll;
  moving=true;visualMove={seat,index,step:old<0?0:old,target};message=`${teams[activeTeams[seat]]} token is moving.`;
  if(old<0){moveVisualTo(0,()=>game.later(finalizeMove,reduceMotion?1:150));return;}
  advanceStep();
}
function advanceStep(){
  if(!visualMove)return;
  moveVisualTo(visualMove.step+1,()=>{
    if(visualMove.step>=visualMove.target)game.later(finalizeMove,reduceMotion?1:100);
    else game.later(advanceStep,reduceMotion?1:88);
  });
}
function moveVisualTo(step,after){
  const current=visualMove;
  const marker=document.querySelector(`[data-token="${current.seat}-${current.index}"]`);
  if(marker)motions.set(`${current.seat}-${current.index}`,marker.getBoundingClientRect());
  current.step=step;render();
  game.later(after,reduceMotion?1:100);
}
function finalizeMove(){
  const moved=visualMove;
  if(!moved)return;
  const previous=state.pieces.map(team=>team.slice());
  state=moveLudo(state,moved.index);
  visualMove=null;moving=false;message="";
  state.pieces.forEach((team,seat)=>team.forEach((step,index)=>{
    if(previous[seat][index]===step)return;
    const marker=document.querySelector(`[data-token="${seat}-${index}"]`);
    if(marker)motions.set(`${seat}-${index}`,marker.getBoundingClientRect());
  }));
  render();
}

function render(){
  const botTurn=isBot(state.turn)&&state.winner===null;
  const legal=legalTokens(state);
  for(const tile of squares.values())tile.replaceChildren();
  state.pieces.forEach((team,seat)=>team.forEach((step,index)=>{
    const teamId=activeTeams[seat];
    const shownStep=visualMove&&visualMove.seat===seat&&visualMove.index===index?visualMove.step:step;
    const tile=shownStep<0?yards[teamId][index]:shownStep>=52?lanes[teamId][shownStep-52]:track[trackPosition(teamId,shownStep)];
    const square=squares.get(tile.join(","));
    const token=document.createElement("button");token.type="button";
    token.className=`token ${teams[teamId].toLowerCase()}`;
    token.dataset.token=`${seat}-${index}`;token.dataset.step=String(shownStep);
    const movable=seat===state.turn&&legal.includes(index)&&!botTurn&&!rolling&&!moving;
    token.dataset.legal=String(movable);token.disabled=!movable;
    token.setAttribute("aria-label",`${teams[teamId]} token ${index+1}, ${shownStep<0?"in yard":shownStep===57?"home":"step "+(shownStep+1)}${movable?", movable":""}`);
    const from=motions.get(`${seat}-${index}`);
    if(from){const to=square.getBoundingClientRect();token.style.setProperty("--dx",`${from.left-to.left}px`);token.style.setProperty("--dy",`${from.top-to.top}px`);token.classList.add("moving");}
    token.addEventListener("click",()=>selectToken(index));
    square.append(token);
  }));
  motions.clear();
  const currentTeam=teams[activeTeams[state.turn]];
  game.status.dataset.turn=currentTeam.toLowerCase();
  game.status.textContent=state.winner!==null?`${teams[activeTeams[state.winner]]} wins!`
    :rolling?`${teams[activeTeams[rollingPlayer]]} die is rolling…`
    :moving?message
    :state.roll?`${currentTeam}: tap one highlighted token.`
    :botTurn?`${currentTeam} bot's turn.`
    :message||`${currentTeam}: tap your die.`;
  paintDie();
  winnerOverlay.hidden=state.winner===null;
  if(state.winner!==null){
    const color=teams[activeTeams[state.winner]].toLowerCase();
    winnerOverlay.dataset.winner=color;winnerTitle.textContent=`${teams[activeTeams[state.winner]]} wins!`;
  }
  if(botTurn&&!rolling&&!moving)game.later(()=>{
    const moves=legalTokens(state);
    if(state.roll){selectToken(moves.length===1?moves[0]:choose(moves));}
    else throwDie(true);
  },state.roll?420:540);
}
game.restart();
