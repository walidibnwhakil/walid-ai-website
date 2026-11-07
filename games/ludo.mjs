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
document.getElementById("setup-colors").addEventListener("click",()=>{document.getElementById("notice-title").textContent="Choose Colors";document.getElementById("notice-message").textContent="After starting, tap your own player header to choose a color. Choose before the first dice roll.";document.getElementById("notice-dialog").showModal();});
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
  board.setAttribute("aria-pressed",String(soundEnabled));board.setAttribute("aria-label",soundEnabled?"Turn sound off":"Turn sound on");setting.checked=soundEnabled;
}
document.querySelector("#board-settings").addEventListener("click",event=>{const open=playScreen.classList.toggle("show-game-settings");event.currentTarget.setAttribute("aria-expanded",String(open));event.currentTarget.setAttribute("aria-label",open?"Close game settings":"Game settings");if(open)document.querySelector(".game-settings").scrollIntoView({behavior:"smooth",block:"center"});});
document.querySelector("#full-screen").addEventListener("click",()=>{
  if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  else playScreen.requestFullscreen?.().catch(()=>{});
});
const palette = [
  ["Red","#e83e4e"],["Blue","#2588e8"],["Green","#27bf70"],["Yellow","#f2be30"],
  ["Purple","#9b59e8"],["Orange","#f17d2b"],["Pink","#f06eb2"],["Teal","#18b6b4"]
];
const starts = [[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]];
const lanes = [
  Array.from({length:6},(_,i)=>[7,i+1]),
  Array.from({length:6},(_,i)=>[13-i,7]),
  Array.from({length:6},(_,i)=>[i+1,7]),
  Array.from({length:6},(_,i)=>[7,13-i])
];
const yards = [
  Array.from({length:4},(_,i)=>[2+(i>>1)*2,2+(i%2)*2]),
  Array.from({length:4},(_,i)=>[11+(i>>1)*2,2+(i%2)*2]),
  Array.from({length:4},(_,i)=>[2+(i>>1)*2,11+(i%2)*2]),
  Array.from({length:4},(_,i)=>[11+(i>>1)*2,11+(i%2)*2])
];
const track = starts;
const safeRouteSeat = new Map([[8,0],[21,2],[34,3],[47,1]]);
const entrySquares=new Map([[0,0],[13,2],[26,3],[39,1]]);
const playerSelect = document.querySelector("#player-count");
const modeSelect = document.querySelector("#mode");
const seatOptions = document.querySelector("#seat-options");
const playerLabels=[];
const dice = teams.map((team,teamId)=>{
  const container=document.querySelector(`#dice-${team.toLowerCase()}`);
  const label=document.createElement("button");
  label.type="button";
  label.className="player-dice-label";
  label.setAttribute("aria-expanded","false");
  label.setAttribute("aria-label",`Choose ${team} player color`);
  playerLabels[teamId]=label;
  const button=document.createElement("button");
  button.type="button";
  button.className="die-face";
  button.textContent="⚀";
  button.setAttribute("aria-label",`Roll ${team} die`);
  button.addEventListener("click",()=>{if(activeTeams[state.turn]===teamId && !isBot(state.turn)) throwDie();});
  container.append(label,button);
  return button;
});
const diePips=[[],[2],[0,4],[0,2,4],[0,1,3,4],[0,1,2,3,4],[0,1,3,4,5,6]];
const dieSides=[["front",1],["right",2],["top",3],["bottom",4],["left",5],["back",6]];
function makeDieCube(){
  const cube=document.createElement("span");cube.className="die-cube";cube.setAttribute("aria-hidden","true");
  for(const [face,value] of dieSides){
    const side=document.createElement("span");side.className=`die-side side-${face}`;side.dataset.value=String(value);
    const pips=document.createElement("span");pips.className="die-side-pips";
    for(const position of diePips[value]){const pip=document.createElement("i");pip.className=`die-pip p${position}`;pips.append(pip);}
    side.append(pips);cube.append(side);
  }
  return cube;
}
const lastDice=[1,1,1,1];
let activeTeams, state, message, seatBots = [], started=false, locked=false, animationToken=null, pendingCaptureSteps=new Map(), rollingTeam=-1, rollingValue=0, diceAnimationTimer=0, soundEnabled=Boolean(restoredConfig?.sound);
const DICE_ROLL_DURATION=950;
syncSoundControls();
const defaultColors=String(restoredConfig?.players)==="2"?[0,3,2,1]:[0,1,2,3];
const storedColors=Array.isArray(restoredConfig?.colors)&&restoredConfig.colors.length===4&&restoredConfig.colors.every(c=>Number.isInteger(c)&&c>=0&&c<palette.length)&&new Set(restoredConfig.colors).size===4?restoredConfig.colors:null;
const initialColors=storedColors?(storedColors.join(",")==="0,1,2,3"?defaultColors:storedColors):defaultColors;
let chosenColors=[...initialColors];
const getColor=seat=>palette[chosenColors[seat]];
function saveColorChoices(){
  sessionStorage.setItem("ludu-mahir-game",JSON.stringify({players:String(activeTeams.length),mode:modeSelect.value,colors:chosenColors,sound:soundEnabled}));
}
const playerColorPickers=teams.map((_,teamId)=>{
  const container=dice[teamId].closest(".player-dice"),picker=document.createElement("div");
  picker.className="player-color-picker";picker.hidden=true;picker.dataset.seat=String(teamId);
  palette.forEach(([name,hex],colorId)=>{
    const chip=document.createElement("button");chip.type="button";chip.className="player-color-swatch";chip.dataset.color=String(colorId);chip.title=name;chip.setAttribute("aria-label",name);chip.style.setProperty("--swatch",hex);
    chip.addEventListener("click",event=>{event.stopPropagation();const player=activeTeams.indexOf(teamId);if(started||player<0||chosenColors.some((value,other)=>other!==player&&other<activeTeams.length&&value===colorId))return;chosenColors[player]=colorId;picker.hidden=true;playerLabels[teamId].setAttribute("aria-expanded","false");saveColorChoices();applySeatColors();render();});
    picker.append(chip);
  });
  container.append(picker);
  playerLabels[teamId].addEventListener("click",event=>{event.stopPropagation();const player=activeTeams.indexOf(teamId);if(started||player<0)return;const opening=picker.hidden;playerColorPickers.forEach((other,index)=>{other.hidden=true;playerLabels[index].setAttribute("aria-expanded","false");});picker.hidden=!opening;playerLabels[teamId].setAttribute("aria-expanded",String(opening));});
  return picker;
});
function updatePlayerColorPickers(){
  playerColorPickers.forEach((picker,teamId)=>{
    const player=activeTeams.indexOf(teamId),label=playerLabels[teamId];
    label.disabled=started||player<0;
    if(started||player<0){picker.hidden=true;label.setAttribute("aria-expanded","false");}
    picker.querySelectorAll(".player-color-swatch").forEach(chip=>{
      const color=Number(chip.dataset.color);chip.disabled=player<0||chosenColors.some((value,other)=>other!==player&&other<activeTeams.length&&value===color);chip.classList.toggle("selected",player>=0&&chosenColors[player]===color);
    });
  });
}

const game = gameShell({reset() {
  const count=Number(playerSelect.value);
  const botMode=modeSelect.value==="bot";
  activeTeams=botMode
    ? count===2?[3,0]:[3,...Array.from({length:count-1},(_,index)=>index)]
    : count===2?[0,3]:Array.from({length:count},(_,index)=>index);
  state=newLudo(count,activeTeams);
  applySeatColors();
  started=false;
  locked=false; animationToken=null; pendingCaptureSteps.clear();
  clearTimeout(diceAnimationTimer);rollingTeam=-1;rollingValue=0;
  playerColorPickers.forEach(picker=>picker.hidden=true);
  playerLabels.forEach(label=>label.setAttribute("aria-expanded","false"));
  message = "";
  lastDice.fill(1);
  dice.forEach(button=>button.classList.remove("rolling"));
  configureSeats();
  render();
}});
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
  const safeSeat=safeRouteSeat.get(index);
  const kind=["track",safe.has(index)?"safe":"",safeSeat!==undefined?`safe-route-${teams[safeSeat].toLowerCase()}`:"",color!==undefined?"start-square "+teams[color].toLowerCase():""].filter(Boolean).join(" ");
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
  // Player color selections follow active players; their physical corners stay fixed.
  const board=game.board;
  for(let teamId=0;teamId<4;teamId++){
    const player=activeTeams.indexOf(teamId);
    const paletteId=player<0?teamId:chosenColors[player];
    const [name,hex]=palette[paletteId];
    board.style.setProperty(`--seat-${teamId}`,hex);
    const yard=game.board.querySelector(`.base-${teamId}`);
    yard?.style.setProperty("--yard-color",hex);
    yard?.classList.toggle("custom-color",paletteId!==teamId);
    game.board.querySelectorAll(`.lane-${teamId}`).forEach(lane=>lane.classList.toggle("custom-color",paletteId!==teamId));
    const dicePanel=dice[teamId].closest(".player-dice");
    dicePanel.style.setProperty("--seat-color",hex);
    dicePanel.style.setProperty("--custom-seat-color",hex);
    dicePanel.dataset.color=name;
  }
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
  if(state.roll || state.winner!==null || locked || rollingTeam>=0) return;
  started=true;
  const rolled=1+Math.floor(Math.random()*6);
  const teamId=activeTeams[player];
  rollingTeam=teamId;rollingValue=rolled;
  message=`${getColor(player)[0]} is rolling…`;
  render();
  clearTimeout(diceAnimationTimer);
  diceAnimationTimer=setTimeout(()=>{
    if(rollingTeam!==teamId)return;
    lastDice[teamId]=rolled;
    if(soundEnabled)playDiceSound(rolled);
    state=rollLudo(state,rolled);
    message=`${getColor(player)[0]} rolled ${rolled}.${state.roll?"":" No legal move."} `;
    rollingTeam=-1;rollingValue=0;
    render();
  },DICE_ROLL_DURATION);
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
  const delay=Number(document.querySelector("#settings-animation-speed").value)||320;
  const moving=[];
  pendingCaptureSteps=new Map(result.lastCaptured.map(hit=>[`${hit.player}-${hit.token}`,hit.step]));
  if(move) {
    const steps=movementSteps(move.from,move.to);
    for(const step of steps) moving.push({player:move.player,token:move.token,step,captured:false});
  }
  for(const hit of result.lastCaptured) {
    for(const step of captureReturnSteps(hit.step)) moving.push({player:hit.player,token:hit.token,step,captured:true});
  }
  for(const motion of moving) {
    animationToken=motion;
    render();
    await new Promise(resolve=>setTimeout(resolve,motion.captured?delay/4:delay));
    if(motion.step===-1)pendingCaptureSteps.delete(`${motion.player}-${motion.token}`);
  }
  animationToken=null;
  pendingCaptureSteps.clear();
  locked=false;
  render();
}
function render() {
  const botTurn=isBot(state.turn)&&state.winner===null;
  const legal=legalTokens(state);
  for(let seat=0;seat<4;seat++){
    const enabled=activeTeams.includes(seat);
    const base=game.board.querySelector(`.base-${seat}`);
    const player=activeTeams.indexOf(seat);
    base.classList.toggle("inactive-home",!enabled);
    game.board.querySelectorAll(`.yard-seat-${seat}`).forEach(tile=>tile.classList.toggle("inactive-yard",!enabled));
    game.board.querySelectorAll(`.lane-${seat}`).forEach(tile=>tile.classList.toggle("inactive-lane",!enabled));
  }
  game.board.querySelector(".home-center")?.classList.toggle("has-finished",state.pieces.some(team=>team.some(step=>step===57)));
  updatePlayerColorPickers();
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
    label.setAttribute("aria-label",seat<0?`${teams[teamId]} player`:`Player ${seat+1}, ${getColor(seat)[0]}`);
    const enabled=activeTeams.includes(teamId);
    container.hidden=!enabled;
    const active=enabled && activeTeams[state.turn]===teamId && state.winner===null;
    button.closest(".player-dice").classList.toggle("active",active);
    button.closest(".player-dice").classList.toggle("inactive-seat",!enabled);
    button.className=`die-face pip-face pip-${lastDice[teamId]}`;
    if(rollingTeam===teamId){button.classList.add("rolling",`roll-to-${rollingValue}`);}
    button.disabled=!active||botTurn||locked||state.roll>0||rollingTeam>=0;
    button.replaceChildren(makeDieCube());
    button.setAttribute("aria-label",rollingTeam===teamId?`${teams[teamId]} die rolling`:`${teams[teamId]} die: ${lastDice[teamId]}${active?", current turn":""}`);
  });
  for(const tile of squares.values()) tile.replaceChildren();
  state.pieces.forEach((team,player)=>team.forEach((step,index)=>{
    const teamId=activeTeams[player];
    const label=`${getColor(player)[0]} token ${index+1}`;
    const button=tokenControls[teamId][index];
    button.hidden=true;
    button.disabled=botTurn||locked||rollingTeam>=0||!legal.includes(index);
    button.setAttribute("aria-label",`${label}, ${step===-1?"in yard":step===57?"home":"step "+(step+1)}`);
    const tokenKey=`${player}-${index}`;
    const visualStep=animationToken?.player===player&&animationToken?.token===index ? animationToken.step : pendingCaptureSteps.has(tokenKey)?pendingCaptureSteps.get(tokenKey):step;
    const tile=visualStep===-1 ? yards[teamId][index] : visualStep===57 ? [7,7] : visualStep>=51 ? lanes[teamId][visualStep-51] : track[trackPosition(teamId,visualStep)];
    const square=squares.get(tile.join(","));
    const marker=document.createElement("span");
    marker.className="ludo-pawn "+teams[teamId].toLowerCase();
    if(visualStep===-1)marker.classList.add("yard-pawn");
    const pawnColor=chosenColors[player];
    marker.style.setProperty("--piece-color",getColor(player)[1]);
    marker.dataset.color=String(pawnColor);
    marker.setAttribute("aria-hidden","true");
    marker.classList.add("sprite-pawn");
    marker.dataset.token=`${teamId}-${index}`;
    marker.style.setProperty("--pawn-order",String(index));
    // Only pieces that can legally use this exact result should lift: a six
    // includes yard pieces, while an overshoot at the home lane stays still.
    if(step!==57&&!locked&&rollingTeam<0&&state.roll>0&&player===state.turn&&legal.includes(index))marker.classList.add("pawn-ready-hint");
    if(animationToken?.player===player&&animationToken?.token===index){
      marker.classList.add("moving");
      if(animationToken.captured)marker.classList.add("captured-return");
      const baseDelay=Number(document.querySelector("#settings-animation-speed").value)||320;
      marker.style.setProperty("--pawn-motion-duration",`${animationToken.captured?baseDelay/4:baseDelay}ms`);
    }
    marker.dataset.step=String(visualStep);
    if(player===state.turn && !botTurn && rollingTeam<0 && legal.includes(index)) {
      marker.removeAttribute("aria-hidden");
      marker.setAttribute("role","button");
      marker.setAttribute("tabindex","0");
      marker.setAttribute("aria-label",`Move ${label}`);
      marker.addEventListener("click",()=>play(index));
      marker.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();play(index);}});
      marker.classList.add("playable-token");
    }
    square.append(marker);
  }));
  game.board.querySelectorAll(".yard-celebration").forEach(badge=>badge.remove());
  state.ranks.forEach((rank,player)=>{
    if(!rank) return;
    const teamId=activeTeams[player];
    const badge=document.createElement("div");
    badge.className=`yard-celebration rank-${rank} ${teams[teamId].toLowerCase()}`;
    badge.innerHTML=rank===1 ? `<svg class="winner-crown" viewBox="0 0 42 30" aria-hidden="true"><path d="M4 24 2 8l11 7L21 3l8 12 11-7-3 16z" fill="#ffd552" stroke="#8a470e" stroke-width="2"/><path d="M5 25h32v4H5z" fill="#ecaa24"/></svg><span>WINNER</span><strong>1st</strong>` : `<strong>${rank}${rank===2?"nd":rank===3?"rd":"th"}</strong>`;
    game.board.querySelector(`.base-${teamId}`).append(badge);
  });

  const currentTeam=getColor(state.turn)[0];

  game.status.dataset.turn=teams[activeTeams[state.turn]].toLowerCase();
  game.status.textContent=message+(state.winner!==null?`${getColor(state.winner)[0]} wins!`
    :botTurn?`${currentTeam} bot is playing…`:`${currentTeam}: ${state.roll?"choose a token.":"roll the die."}`);
  if(!locked && rollingTeam<0 && state.winner===null && state.roll>0 && legal.length===1) {
    game.later(()=>play(legal[0]), 420);
  } else if(!locked && rollingTeam<0 && botTurn) {
    game.later(()=>state.roll?play(choose(legal)):throwDie());
  }
}
game.restart();

