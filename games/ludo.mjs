import {gameShell, control, choose} from "./shell.mjs";
import {newLudo, rollLudo, moveLudo, legalTokens, trackPosition, safe} from "./ludo-rules.mjs";

const teams = ["Red", "Blue", "Green", "Yellow"];
const starts = [[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]];
const lanes = [
  Array.from({length:6},(_,i)=>[7,i+1]),
  Array.from({length:6},(_,i)=>[7,13-i]),
  Array.from({length:6},(_,i)=>[i+1,7]),
  Array.from({length:6},(_,i)=>[13-i,7])
];
const yards = [
  Array.from({length:4},(_,i)=>[2+(i>>1),2+i%2]),
  Array.from({length:4},(_,i)=>[11+(i>>1),11+i%2]),
  Array.from({length:4},(_,i)=>[2+(i>>1),11+i%2]),
  Array.from({length:4},(_,i)=>[11+(i>>1),2+i%2])
];
const track = starts;
const playerSelect = document.querySelector("#player-count");
const modeSelect = document.querySelector("#mode");
const seatOptions = document.querySelector("#seat-options");
const dieFace = document.querySelector("#die-face");
let activeTeams, state, message, seatBots = [], motions = new Map();
const game = gameShell({reset() {
  activeTeams = Array.from({length:Number(playerSelect.value)},(_,index)=>index);
  state = newLudo(activeTeams.length);
  message = "";
  motions = new Map();
  dieFace.textContent="1";
  dieFace.setAttribute("aria-label","Die: 1");
  dieFace.classList.remove("rolling");
  configureSeats();
  render();
}});
game.board.classList.add("ludo");
const squares = new Map();
track.forEach(([row,column],index) => addSquare(row,column,safe.has(index) ? "safe track" : "track"));
for (let player=0;player<4;player++) {
  lanes[player].forEach(([row,column],index)=>addSquare(row,column,`lane ${teams[player].toLowerCase()} lane-${player} lane-step-${index}`));
  yards[player].forEach(([row,column])=>addSquare(row,column,`yard ${teams[player].toLowerCase()}`));
}
addSquare(7,7,"home-center");
function addSquare(row,column,kind) {
  const tile=document.createElement("div");
  tile.className=kind;
  tile.style.gridArea=`${row+1} / ${column+1}`;
  game.board.append(tile);
  squares.set(`${row},${column}`,tile);
}

function configureSeats() {
  seatBots=activeTeams.map((_,player)=>modeSelect.value==="bot" ? player>0 : modeSelect.value==="mixed" && player>0);
  seatOptions.replaceChildren();
  seatOptions.hidden=modeSelect.value!=="mixed";
  if (modeSelect.value!=="mixed") return;
  const legend=document.createElement("strong");
  legend.textContent="Player seats";
  seatOptions.append(legend);
  activeTeams.forEach((team,player)=>{
    const label=document.createElement("label");
    const select=document.createElement("select");
    select.setAttribute("aria-label",`${teams[team]} seat type`);
    select.innerHTML=`<option value="human">Human</option><option value="bot">Bot</option>`;
    select.value=seatBots[player]?"bot":"human";
    if (player===0) { seatBots[player]=false; select.value="human"; }
    select.addEventListener("change",()=>{seatBots[player]=select.value==="bot";render();});
    label.append(`${teams[team]}: `,select);
    seatOptions.append(label);
  });
}
function isBot(player) {
  if (modeSelect.value==="bot") return player>0;
  if (modeSelect.value==="mixed") return Boolean(seatBots[player]);
  return false;
}
playerSelect.addEventListener("change",game.restart);

function throwDie() {
  const player=state.turn;
  const rolled=1+Math.floor(Math.random()*6);
  dieFace.textContent=String(rolled);
  dieFace.setAttribute("aria-label",`Die: ${rolled}`);
  dieFace.classList.remove("rolling");
  requestAnimationFrame(()=>dieFace.classList.add("rolling"));
  state=rollLudo(state,rolled);
  message=`${teams[activeTeams[player]]} rolled ${rolled}.${state.roll?"":" No legal move."} `;
  render();
}
const roll=control("Roll die",throwDie);
roll.classList.add("roll-button");
document.querySelector("#actions").append(roll);
const tokenControls=Array.from({length:4},(_,player)=>Array.from({length:4},(_,index)=>{
  const button=control(`${teams[player]} ${index+1}`,()=>play(index));
  button.hidden=true;
  document.querySelector("#actions").append(button);
  return button;
}));
function play(index) {
  const previous=state.pieces.map(team=>team.slice());
  state=moveLudo(state,index);
  motions=new Map();
  state.pieces.forEach((team,player)=>team.forEach((step,token)=>{
    if(previous[player][token]!==step) {
      const oldTile=previous[player][token]<0 ? yards[player][token] : previous[player][token]>=52 ? lanes[player][previous[player][token]-52] : track[trackPosition(player,previous[player][token])];
      const old=squares.get(oldTile.join(",")).querySelector(`[data-token="${player}-${token}"]`);
      if(old) motions.set(`${player}-${token}`,old.getBoundingClientRect());
    }
  }));
  message="";
  render();
}
function render() {
  const botTurn=isBot(state.turn)&&state.winner===null;
  const legal=legalTokens(state);
  roll.disabled=botTurn||state.roll>0||state.winner!==null;
  for(const tile of squares.values()) tile.replaceChildren();
  state.pieces.forEach((team,player)=>team.forEach((step,index)=>{
    const teamId=activeTeams[player];
    const label=`${teams[teamId]} token ${index+1}`;
    const button=tokenControls[teamId][index];
    button.hidden=player!==state.turn;
    button.disabled=botTurn||!legal.includes(index);
    button.setAttribute("aria-label",`${label}, ${step===-1?"in yard":step===57?"home":"step "+(step+1)}`);
    const tile=step===-1 ? yards[teamId][index] : step>=52 ? lanes[teamId][step-52] : track[trackPosition(teamId,step)];
    const square=squares.get(tile.join(","));
    const marker=document.createElement("span");
    marker.className=teams[teamId].toLowerCase();
    marker.textContent=String(index+1);
    marker.dataset.token=`${teamId}-${index}`;
    marker.dataset.step=String(step);
    const from=motions.get(`${player}-${index}`);
    if(from) {
      const to=square.getBoundingClientRect();
      marker.style.setProperty("--dx",`${from.left-to.left}px`);
      marker.style.setProperty("--dy",`${from.top-to.top}px`);
      marker.classList.add("moving");
    }
    square.append(marker);
  }));
  motions.clear();
  const currentTeam=teams[activeTeams[state.turn]];
  game.status.dataset.turn=currentTeam.toLowerCase();
  game.status.textContent=message+(state.winner!==null?`${teams[activeTeams[state.winner]]} wins!`
    :botTurn?`${currentTeam} bot is playing…`:`${currentTeam}: ${state.roll?"choose a token.":"roll the die."}`);
  if(botTurn) game.later(()=>state.roll?play(choose(legal)):throwDie());
}
game.restart();
