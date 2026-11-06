import {gameShell, control, choose} from "./shell.mjs";
import {newLudo, rollLudo, moveLudo, legalTokens, trackPosition, safe, movementSteps, captureReturnSteps} from "./ludo-rules.mjs";

const teams = ["Red", "Blue", "Green", "Yellow"];
const setupScreen=document.querySelector("#ludo-setup");
const restoredConfig=(()=>{try{return JSON.parse(sessionStorage.getItem("ludu-mahir-game")||"null")}catch{return null}})();
const boardLaunch=new URLSearchParams(location.search).get("screen")==="board";
if(restoredConfig){
 if(["2","3","4"].includes(String(restoredConfig.players))){
  document.querySelector("#setup-players").value=String(restoredConfig.players);
  document.querySelector("#player-count").value=String(restoredConfig.players);
 }
 if(["bot","friend","mixed"].includes(restoredConfig.mode)){
  document.querySelector("#setup-mode").value=restoredConfig.mode;
  document.querySelector("#mode").value=restoredConfig.mode;
 }
}
for(const [groupId,selectId] of [["mode-buttons","setup-mode"],["player-buttons","setup-players"]]){
 const group=document.getElementById(groupId),select=document.getElementById(selectId);
 group.addEventListener("click",event=>{
  const button=event.target.closest("button[data-value]");
  if(!button||button.disabled)return;
  select.value=button.dataset.value;
  group.querySelectorAll("button[data-value]").forEach(item=>{
   const chosen=item===button;item.classList.toggle("selected",chosen);item.setAttribute("aria-pressed",String(chosen));
  });
 });
 group.querySelectorAll("button[data-value]").forEach(button=>{
  const selected=button.dataset.value===select.value;
  button.classList.toggle("selected",selected);button.setAttribute("aria-pressed",String(selected));
 });
}
document.getElementById("setup-rules").addEventListener("click",()=>document.getElementById("rules-dialog").showModal());
document.getElementById("close-rules").addEventListener("click",()=>document.getElementById("rules-dialog").close());
document.getElementById("setup-settings").addEventListener("click",()=>document.getElementById("settings-dialog").showModal());
document.getElementById("menu-settings").addEventListener("click",()=>document.getElementById("settings-dialog").showModal());
document.getElementById("close-settings").addEventListener("click",()=>document.getElementById("settings-dialog").close());
document.getElementById("setup-colors").addEventListener("click",()=>{refreshMenuColors();document.getElementById("menu-colors-dialog").showModal();});
document.getElementById("close-menu-colors").addEventListener("click",()=>document.getElementById("menu-colors-dialog").close());
document.getElementById("online-coming").addEventListener("click",()=>document.getElementById("notice-dialog").showModal());
document.getElementById("close-notice").addEventListener("click",()=>document.getElementById("notice-dialog").close());
const playScreen=document.querySelector("#ludo-play");
if(boardLaunch){
  setupScreen.hidden=true;
  playScreen.hidden=false;
  document.body.classList.add("playing-ludo");
}
document.querySelector("#start-game").addEventListener("click",()=>{
  document.querySelector("#player-count").value=document.querySelector("#setup-players").value;
  document.querySelector("#mode").value=document.querySelector("#setup-mode").value;
  sessionStorage.setItem("ludu-mahir-game",JSON.stringify({players:document.querySelector("#setup-players").value,mode:document.querySelector("#setup-mode").value,colors:chosenColors,sound:soundEnabled}));
  location.assign(location.pathname+"?screen=board");
});
document.querySelector("#back-to-setup").addEventListener("click",()=>{
  if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  location.assign(location.pathname);
});
document.querySelector("#menu-sound").addEventListener("click",()=>{soundEnabled=!soundEnabled;syncSoundControls();});
document.querySelector("#settings-sound").addEventListener("change",event=>{soundEnabled=event.currentTarget.checked;syncSoundControls();});
document.querySelector("#sound-toggle").addEventListener("click",()=>{soundEnabled=!soundEnabled;syncSoundControls();});
function syncSoundControls(){
  const menu=document.querySelector("#menu-sound"),board=document.querySelector("#sound-toggle"),setting=document.querySelector("#settings-sound");
  menu.setAttribute("aria-pressed",String(soundEnabled));menu.setAttribute("aria-label",soundEnabled?"Turn sound off":"Turn sound on");menu.classList.toggle("sound-on",soundEnabled);
  board.setAttribute("aria-pressed",String(soundEnabled));board.textContent=soundEnabled?"Sound: On":"Sound: Off";setting.checked=soundEnabled;
}
document.querySelector("#board-settings").addEventListener("click",event=>{const open=playScreen.classList.toggle("show-game-settings");event.currentTarget.setAttribute("aria-expanded",String(open));event.currentTarget.textContent=open?"Close Settings":"Settings";if(open)document.querySelector(".game-settings").scrollIntoView({behavior:"smooth",block:"center"});});
document.querySelector("#full-screen").addEventListener("click",()=>{
  if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  else playScreen.requestFullscreen?.().catch(()=>{});
});
const palette = [
  ["Red","#e83e4e"],["Blue","#2588e8"],["Green","#27bf70"],["Yellow","#f2be30"],
  ["Purple","#9b59e8"],["Orange","#f17d2b"],["Pink","#f06eb2"],["Teal","#18b6b4"],
  ["Cyan","#30c9ed"],["Lime","#9bd63d"],["Maroon","#a93455"],["Brown","#a76a3b"]
];
function refreshMenuColors(){
  const count=Number(document.querySelector('#setup-players').value);
  const player=document.querySelector('#menu-color-player'),color=document.querySelector('#menu-color-choice');
  [...player.options].forEach(option=>{option.disabled=Number(option.value)>=count;});
  if(Number(player.value)>=count)player.value='0';
  const seat=Number(player.value);color.replaceChildren();
  palette.forEach(([name,hex],index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=name;option.disabled=chosenColors.some((value,other)=>other<count&&other!==seat&&value===index);color.append(option);});
  color.value=String(chosenColors[seat]);
}
document.querySelector('#menu-color-player').addEventListener('change',refreshMenuColors);
document.querySelector('#apply-menu-color').addEventListener('click',()=>{
  const seat=Number(document.querySelector('#menu-color-player').value),color=Number(document.querySelector('#menu-color-choice').value),count=Number(document.querySelector('#setup-players').value);
  if(seat>=count||chosenColors.some((value,index)=>index<count&&index!==seat&&value===color))return;
  chosenColors[seat]=color;document.querySelector('#menu-color-confirmation').textContent='Player '+(seat+1)+' color set to '+palette[color][0]+'.';refreshMenuColors();
});
const starts = [[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]];
const lanes = [
  Array.from({length:6},(_,i)=>[7,i+1]),
  Array.from({length:6},(_,i)=>[13-i,7]),
  Array.from({length:6},(_,i)=>[i+1,7]),
  Array.from({length:6},(_,i)=>[7,13-i])
];
const yards = [
  Array.from({length:4},(_,i)=>[2+(i>>1),2+i%2]),
  Array.from({length:4},(_,i)=>[11+(i>>1),2+i%2]),
  Array.from({length:4},(_,i)=>[2+(i>>1),11+i%2]),
  Array.from({length:4},(_,i)=>[11+(i>>1),11+i%2])
];
const track = starts;
const entrySquares=new Map([[0,0],[13,2],[26,3],[39,1]]);
const playerSelect = document.querySelector("#player-count");
const modeSelect = document.querySelector("#mode");
const seatOptions = document.querySelector("#seat-options");
const dice = teams.map((team,teamId)=>{
  const container=document.querySelector(`#dice-${team.toLowerCase()}`);
  const label=document.createElement("button");
  label.type="button";
  label.className="player-dice-label";
  label.textContent=team;
  const button=document.createElement("button");
  button.type="button";
  button.className="die-face";
  button.textContent="⚀";
  button.setAttribute("aria-label",`Roll ${team} die`);
  button.addEventListener("click",()=>{if(activeTeams[state.turn]===teamId && !isBot(state.turn)) throwDie();});
  container.append(label,button);
  return button;
});
const diePips=[[],[[2]],[[0,4]],[[0,2,4]],[[0,1,3,4]],[[0,1,2,3,4]],[[0,1,3,4,5,6]]];
const lastDice=[1,1,1,1];
let activeTeams, state, message, seatBots = [], started=false, locked=false, animationToken=null, soundEnabled=Boolean(restoredConfig?.sound);
const initialColors=Array.isArray(restoredConfig?.colors)&&restoredConfig.colors.length===4&&restoredConfig.colors.every(c=>Number.isInteger(c)&&c>=0&&c<12)&&new Set(restoredConfig.colors).size===4?restoredConfig.colors:[0,1,2,3];
let chosenColors=[...initialColors];
const getColor=seat=>palette[chosenColors[seat]];
const colorPicker=document.querySelector("#color-picker");
const colorSeat=document.querySelector("#color-seat");
const colorChoice=document.querySelector("#color-choice");
document.querySelector("#color-cancel").addEventListener("click",()=>colorPicker.hidden=true);
document.querySelector("#color-apply").addEventListener("click",()=>{
  const seat=Number(colorSeat.value), wanted=Number(colorChoice.value);
  if(started || seat>=activeTeams.length) return;
  if(chosenColors.some((color,index)=>index!==seat && index<activeTeams.length && color===wanted)) return;
  chosenColors[seat]=wanted;
  colorPicker.hidden=true;
  game.restart();
});
function showColorPicker(seat) {
  if(started || seat<0 || seat>=activeTeams.length) return;
  colorSeat.value=String(seat);
  colorChoice.replaceChildren();
  palette.forEach(([name,hex],index)=>{
    const option=document.createElement("option");
    option.value=String(index);
    option.textContent=name;
    option.disabled=chosenColors.some((color,other)=>other!==seat && other<activeTeams.length && color===index);
    colorChoice.append(option);
  });
  colorChoice.value=String(chosenColors[seat]);
  colorPicker.hidden=false;
}

const game = gameShell({reset() {
  const count=Number(playerSelect.value);
  activeTeams=Array.from({length:count},(_,index)=>index);
  state=newLudo(count);
  applySeatColors();
  started=false;
  locked=false; animationToken=null;
  colorPicker.hidden=true;
  message = "";
  lastDice.fill(1);
  dice.forEach(button=>button.classList.remove("rolling"));
  configureSeats();
  render();
}});
document.querySelector("#board-restart").addEventListener("click",()=>game.restart());
game.board.classList.add("ludo");
const squares = new Map();
for(const [seat,area] of [[0,"1 / 1 / 7 / 7"],[1,"10 / 1 / 16 / 7"],[2,"1 / 10 / 7 / 16"],[3,"10 / 10 / 16 / 16"]]) {
  const base=document.createElement("div");
  base.className=`home-base base-${seat}`;
  base.dataset.seat=String(seat);
  base.style.gridArea=area;
  game.board.append(base);
}
const centerBase=document.createElement("div");
centerBase.className="home-diamond";
centerBase.style.gridArea="7 / 7 / 10 / 10";
game.board.append(centerBase);
track.forEach(([row,column],index) => {
  const color=entrySquares.get(index);
  const kind=["track",safe.has(index)?"safe":"",color!==undefined?"start-square "+teams[color].toLowerCase():""].filter(Boolean).join(" ");
  addSquare(row,column,kind);
});
for (let player=0;player<4;player++) {
  lanes[player].forEach(([row,column],index)=>addSquare(row,column,`lane ${teams[player].toLowerCase()} lane-${player} lane-step-${index}`));
  yards[player].forEach(([row,column])=>addSquare(row,column,`yard yard-seat-${player} ${teams[player].toLowerCase()}`));
}
addSquare(7,7,"home-center");
function addSquare(row,column,kind) {
  const tile=document.createElement("div");
  tile.className=kind;
  if(kind.includes("safe")) {tile.setAttribute("aria-label","Safe square");tile.dataset.safe="true";}
  tile.style.gridArea=`${row+1} / ${column+1}`;
  game.board.append(tile);
  squares.set(`${row},${column}`,tile);
}

function applySeatColors() {
  // Each physical board corner keeps its own route; only its appearance changes.
  const board=game.board;
  chosenColors.slice(0,4).forEach((paletteId,seat)=>{
    const [name,hex]=palette[paletteId];
    board.style.setProperty(`--seat-${seat}`,hex);
    const dicePanel=dice[seat].closest(".player-dice");
    dicePanel.style.setProperty("--seat-color",hex);
    dicePanel.style.setProperty("--custom-seat-color",hex);
    dicePanel.dataset.color=name;
  });
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

function playDiceSound(value) {
  try { const AudioEngine=window.AudioContext||window.webkitAudioContext; if(!AudioEngine)return; const audio=new AudioEngine(); const oscillator=audio.createOscillator(); const gain=audio.createGain(); oscillator.type="triangle"; oscillator.frequency.value=280+value*48; gain.gain.setValueAtTime(.08,audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.17); oscillator.connect(gain);gain.connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+.18);oscillator.onended=()=>audio.close(); } catch {}
}
function throwDie() {
  const player=state.turn;
  if(state.roll || state.winner!==null || locked) return;
  started=true;
  const rolled=1+Math.floor(Math.random()*6);
  if(soundEnabled) playDiceSound(rolled);
  const teamId=activeTeams[player];
  lastDice[teamId]=rolled;
  const face=dice[teamId];
  face.classList.remove("rolling");
  requestAnimationFrame(()=>face.classList.add("rolling"));
  state=rollLudo(state,rolled);
  message=state.threeSixes?`${getColor(player)[0]} rolled three sixes. Turn passed.`:`${getColor(player)[0]} rolled ${rolled}.${state.roll?"":" No legal move."} `;
  render();
}

const tokenControls=Array.from({length:4},(_,player)=>Array.from({length:4},(_,index)=>{
  const button=control(`${teams[player]} ${index+1}`,()=>play(index));
  button.hidden=true;
  document.querySelector("#actions").append(button);
  return button;
}));
async function play(index) {
  if(locked || !legalTokens(state).includes(index)) return;
  locked=true;
  const result=moveLudo(state,index);
  if(result===state) {locked=false;return;}
  state=result;
  started=true;
  message="";
  const move=result.lastMove;
  const delay=Number(document.querySelector("#settings-animation-speed").value)||145;
  const moving=[];
  if(move) {
    const steps=movementSteps(move.from,move.to);
    for(const step of steps) moving.push({player:move.player,token:move.token,step});
  }
  for(const hit of result.lastCaptured) {
    for(const step of captureReturnSteps(hit.step)) moving.push({player:hit.player,token:hit.token,step});
  }
  for(const motion of moving) {
    animationToken=motion;
    render();
    await new Promise(resolve=>setTimeout(resolve,delay));
  }
  animationToken=null;
  locked=false;
  render();
}
function render() {
  const botTurn=isBot(state.turn)&&state.winner===null;
  const legal=legalTokens(state);
  for(let seat=0;seat<4;seat++){
    const enabled=activeTeams.includes(seat);
    const base=game.board.querySelector(`.base-${seat}`);
    base.classList.toggle("inactive-home",!enabled);
    game.board.querySelectorAll(`.yard-seat-${seat}`).forEach(tile=>tile.classList.toggle("inactive-yard",!enabled));
    game.board.querySelectorAll(`.lane-${seat}`).forEach(tile=>tile.classList.toggle("inactive-lane",!enabled));
  }
  dice.forEach((button,teamId)=>{
    const seat=activeTeams.indexOf(teamId);
    const container=button.closest(".player-dice");
    const label=container.querySelector(".player-dice-label");
    label.replaceChildren();
    const avatar=document.createElement("span");
    avatar.className="player-avatar";
    avatar.innerHTML='<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="16" r="9" fill="#f4e5d2"/><path d="M7 42v-5q0-12 17-12t17 12v5z" fill="#eee0cd"/></svg>';
    const playerName=document.createElement("span");
    playerName.textContent=seat<0?teams[teamId]:`Player ${seat+1} · ${getColor(seat)[0]}`;
    label.append(avatar,playerName);
    label.disabled=started||seat<0;
    label.setAttribute("aria-label",`Choose color for player ${seat+1}`);
    label.onclick=()=>showColorPicker(seat);
    const enabled=activeTeams.includes(teamId);
    container.hidden=!enabled;
    const active=enabled && activeTeams[state.turn]===teamId && state.winner===null;
    button.closest(".player-dice").classList.toggle("active",active);
    button.closest(".player-dice").classList.toggle("inactive-seat",!enabled);
    button.disabled=!active||botTurn||locked||state.roll>0;
    button.className=`die-face pip-face pip-${lastDice[teamId]}`;
    button.replaceChildren(...diePips[lastDice[teamId]].map((position,index)=>{const pip=document.createElement("i");pip.className="die-pip p"+position;return pip;}));
    button.setAttribute("aria-label",`${teams[teamId]} die: ${lastDice[teamId]}${active?", current turn":""}`);
  });
  for(const tile of squares.values()) tile.replaceChildren();
  state.pieces.forEach((team,player)=>team.forEach((step,index)=>{
    const teamId=activeTeams[player];
    const label=`${getColor(player)[0]} token ${index+1}`;
    const button=tokenControls[teamId][index];
    button.hidden=true;
    button.disabled=botTurn||locked||!legal.includes(index);
    button.setAttribute("aria-label",`${label}, ${step===-1?"in yard":step===57?"home":"step "+(step+1)}`);
    const visualStep=animationToken?.player===player&&animationToken?.token===index ? animationToken.step : step;
    const tile=visualStep===-1 ? yards[teamId][index] : visualStep>=52 ? lanes[teamId][visualStep-52] : track[trackPosition(teamId,visualStep)];
    const square=squares.get(tile.join(","));
    const marker=document.createElement("span");
    marker.className=teams[teamId].toLowerCase();
    marker.style.setProperty("--piece-color",getColor(player)[1]);
    marker.textContent=String(index+1);
    marker.dataset.token=`${teamId}-${index}`;
    marker.dataset.step=String(visualStep);
    if(player===state.turn && !botTurn && legal.includes(index)) {
      marker.setAttribute("role","button");
      marker.setAttribute("tabindex","0");
      marker.setAttribute("aria-label",`Move ${label}`);
      marker.addEventListener("click",()=>play(index));
      marker.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();play(index);}});
      marker.classList.add("playable-token");
    }
    square.append(marker);
  }));
  state.ranks.forEach((rank,player)=>{
    if(!rank) return;
    const teamId=activeTeams[player];
    const badge=document.createElement("div");
    badge.className=`yard-celebration rank-${rank} ${teams[teamId].toLowerCase()}`;
    badge.innerHTML=rank===1 ? `<svg class="winner-crown" viewBox="0 0 42 30" aria-hidden="true"><path d="M4 24 2 8l11 7L21 3l8 12 11-7-3 16z" fill="#ffd552" stroke="#8a470e" stroke-width="2"/><path d="M5 25h32v4H5z" fill="#ecaa24"/></svg><span>WINNER · 1st</span>` : `<span>${rank}${rank===2?"nd":rank===3?"rd":"th"} PLACE</span>`;
    game.board.append(badge);
  });

  const currentTeam=getColor(state.turn)[0];

  game.status.dataset.turn=teams[activeTeams[state.turn]].toLowerCase();
  game.status.textContent=message+(state.winner!==null?`${getColor(state.winner)[0]} wins!`
    :botTurn?`${currentTeam} bot is playing…`:`${currentTeam}: ${state.roll?"choose a token.":"roll the die."}`);
  if(!locked && state.winner===null && state.roll>0 && legal.length===1) {
    game.later(()=>play(legal[0]), 420);
  } else if(!locked && botTurn) {
    game.later(()=>state.roll?play(choose(legal)):throwDie());
  }
}
game.restart();

