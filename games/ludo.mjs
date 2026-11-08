import {gameShell, control, choose} from "./shell.mjs";
import {newLudo, rollLudo, moveLudo, legalTokens, trackPosition, safe, movementSteps, captureReturnSteps} from "./ludo-rules.mjs?v=20261107goal56";

const teams = ["Red", "Blue", "Green", "Yellow"];
const setupScreen=document.querySelector("#ludo-setup");
const restoredConfig=(()=>{try{return JSON.parse(sessionStorage.getItem("ludu-mahir-game")||"null")}catch{return null}})();
const boardLaunch=new URLSearchParams(location.search).get("screen")==="board";
const savedSoundPreference=(()=>{try{return localStorage.getItem("ludu-mahir-sound")}catch{return null}})();
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
  try{localStorage.setItem("ludu-mahir-sound",String(soundEnabled))}catch{}
  if(soundEnabled)resumeAudioContext();else for(const stop of activeCaptureStops)stop();
}
document.querySelector("#board-settings").addEventListener("click",event=>{const open=playScreen.classList.toggle("show-game-settings");event.currentTarget.setAttribute("aria-expanded",String(open));event.currentTarget.setAttribute("aria-label",open?"Close game settings":"Game settings");if(open)document.querySelector(".game-settings").scrollIntoView({behavior:"smooth",block:"center"});});
document.querySelector("#full-screen").addEventListener("click",()=>{
  if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  else playScreen.requestFullscreen?.().catch(()=>{});
});
const palette = [
  ["Red","#ed0010"],["Blue","#0064ff"],["Green","#00c600"],["Yellow","#ffdf00"],
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
  Array.from({length:4},(_,i)=>[2+(i>>1)*2,1+(i%2)*2]),
  Array.from({length:4},(_,i)=>[10+(i>>1)*2,1+(i%2)*2]),
  Array.from({length:4},(_,i)=>[2+(i>>1)*2,10+(i%2)*2]),
  Array.from({length:4},(_,i)=>[10+(i>>1)*2,10+(i%2)*2])
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
  button.setAttribute("aria-label",`Roll ${team} dice`);
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
let activeTeams, state, message, seatBots = [], started=false, locked=false, animationToken=null, pendingCaptureSteps=new Map(), finishSlots=new Map(), scoreLightTimers=new Map(), rollingTeam=-1, rollingValue=0, diceAnimationTimer=0, soundEnabled=savedSoundPreference===null?true:savedSoundPreference==="true",audioContext=null,noiseBuffer=null,activeCaptureStops=new Set();
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
  locked=false; animationToken=null; pendingCaptureSteps.clear(); finishSlots.clear();
  for(const timer of scoreLightTimers.values())clearTimeout(timer);
  scoreLightTimers.clear();
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
  lanes[player].forEach(([row,column],index)=>addSquare(row,column,`lane ${teams[player].toLowerCase()} lane-${player} lane-step-${index}${index===5?" final-square":""}`));
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

function resumeAudioContext() {
  if(!soundEnabled)return null;
  try {
    const AudioEngine=window.AudioContext||window.webkitAudioContext;
    if(!AudioEngine)return null;
    if(!audioContext)audioContext=new AudioEngine();
    if(audioContext.state==="suspended")audioContext.resume().catch(()=>{});
    return audioContext;
  } catch { return null; }
}
function getNoiseBuffer(ctx) {
  if(noiseBuffer)return noiseBuffer;
  const length=Math.max(1,ctx.sampleRate);
  noiseBuffer=ctx.createBuffer(1,length,ctx.sampleRate);
  const samples=noiseBuffer.getChannelData(0);
  for(let i=0;i<length;i++)samples[i]=(Math.random()*2-1)*.72;
  return noiseBuffer;
}
function playNoiseBurst(ctx,time,volume,frequency,pan,duration,type="bandpass") {
  if(!ctx||!soundEnabled)return;
  const source=ctx.createBufferSource();source.buffer=getNoiseBuffer(ctx);
  const filter=ctx.createBiquadFilter();filter.type=type;filter.frequency.setValueAtTime(frequency,time);filter.Q.value=type==="bandpass"?1.1:.7;
  const gain=ctx.createGain();gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),time+.004);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  let output=gain;
  if(ctx.createStereoPanner){const panner=ctx.createStereoPanner();panner.pan.setValueAtTime(Math.max(-1,Math.min(1,pan)),time);gain.connect(panner);output=panner;}
  source.connect(filter);filter.connect(gain);output.connect(ctx.destination);source.start(time);source.stop(time+duration);
}
function playTone(ctx,frequency,time,volume,duration,wave="sine",endFrequency=null) {
  if(!ctx||!soundEnabled)return;
  const oscillator=ctx.createOscillator(),gain=ctx.createGain();
  oscillator.type=wave;oscillator.frequency.setValueAtTime(frequency,time);
  if(endFrequency)oscillator.frequency.exponentialRampToValueAtTime(endFrequency,time+duration);
  gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),time+.012);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start(time);oscillator.stop(time+duration+.02);
}
function playDiceSound(value) {
  const ctx=resumeAudioContext();if(!ctx)return;
  const start=ctx.currentTime+.015;
  const offsets=[0,.065,.132,.205,.276,.354,.435,.515,.598,.679,.758,.828];
  offsets.forEach((offset,index)=>{
    const strength=.105-index*.0038;
    playNoiseBurst(ctx,start+offset,strength,850+Math.random()*1500,(Math.random()-.5)*.7,.034+Math.random()*.018);
    if(index%2===0)playTone(ctx,130+Math.random()*90,start+offset,.035,.055,"triangle",85);
  });
  playNoiseBurst(ctx,start+.86,.23,560,0,.095,"lowpass");
  playTone(ctx,178+value*7,start+.855,.17,.14,"triangle",92);
}
function playPawnStepSound(step) {
  const ctx=resumeAudioContext();if(!ctx)return;
  const now=ctx.currentTime+.006,variation=Math.abs(step)%5;
  playNoiseBurst(ctx,now,.19,780+variation*185,(variation-2)*.12,.052,"bandpass");
  playTone(ctx,205+variation*17,now,.13,.085,"triangle",125+variation*8);
  playNoiseBurst(ctx,now+.012,.065,2100+variation*180,(variation-2)*.1,.026,"highpass");
}
function startCaptureWhoosh(durationMs) {
  const ctx=resumeAudioContext();if(!ctx)return ()=>{};
  const start=ctx.currentTime,duration=Math.max(.24,durationMs/1000);
  const source=ctx.createBufferSource();source.buffer=getNoiseBuffer(ctx);source.loop=true;
  const filter=ctx.createBiquadFilter();filter.type="lowpass";filter.frequency.setValueAtTime(1650,start);filter.frequency.exponentialRampToValueAtTime(320,start+duration);
  const highpass=ctx.createBiquadFilter();highpass.type="highpass";highpass.frequency.setValueAtTime(180,start);
  const gain=ctx.createGain();gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(.17,start+.075);gain.gain.setValueAtTime(.12,start+Math.max(.09,duration*.4));
  const lfo=ctx.createOscillator(),lfoGain=ctx.createGain();lfo.frequency.value=2.4;lfoGain.gain.value=170;lfo.connect(lfoGain);lfoGain.connect(filter.frequency);
  source.connect(highpass);highpass.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start(start);lfo.start(start);
  let stopped=false;
  const stop=()=>{
    if(stopped)return;stopped=true;activeCaptureStops.delete(stop);
    const at=ctx.currentTime;gain.gain.cancelScheduledValues(at);gain.gain.setTargetAtTime(.0001,at,.045);
    try{source.stop(at+.22);lfo.stop(at+.22)}catch{}
  };
  activeCaptureStops.add(stop);return stop;
}
function playFinishSound() {
  const ctx=resumeAudioContext();if(!ctx)return;
  const start=ctx.currentTime+.02,notes=[659.25,783.99,987.77,1318.51];
  notes.forEach((frequency,index)=>{
    const at=start+index*.105,main=index===3?.17:.105,duration=index===3?.62:.39;
    playTone(ctx,frequency,at,main,duration,"sine",frequency*.985);
    playTone(ctx,frequency*2,at,main*.28,duration*.72,"sine",frequency*1.97);
  });
  playNoiseBurst(ctx,start+.31,.045,3600,0,.11,"highpass");
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
  if(soundEnabled)playDiceSound(rolled);
  clearTimeout(diceAnimationTimer);
  diceAnimationTimer=setTimeout(()=>{
    if(rollingTeam!==teamId)return;
    lastDice[teamId]=rolled;

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
  const move=result.lastMove;
  const finishedCount=move?.to===56?result.pieces[move.player].filter(position=>position===56).length:0;
  message="";
  const delay=Number(document.querySelector("#settings-animation-speed").value)||320;
  const moving=[];
  pendingCaptureSteps=new Map(result.lastCaptured.map(hit=>[`${hit.player}-${hit.token}`,hit.step]));
  const capturedMotionCount=result.lastCaptured.reduce((total,hit)=>total+captureReturnSteps(hit.step).length,0);
  let captureReturnsRemaining=result.lastCaptured.length,captureWhooshStop=null;
  if(move) {
    const steps=movementSteps(move.from,move.to);
    for(const step of steps) moving.push({player:move.player,token:move.token,step,captured:false});
  }
  for(const hit of result.lastCaptured) {
    for(const step of captureReturnSteps(hit.step)) moving.push({player:hit.player,token:hit.token,step,captured:true});
  }
  for(const motion of moving) {
    if(motion.captured){if(!captureWhooshStop)captureWhooshStop=startCaptureWhoosh(capturedMotionCount*delay/4)}else playPawnStepSound(motion.step);
    const markerSelector=`.pin-pawn[data-token="${activeTeams[motion.player]}-${motion.token}"]`;
    const oldMarker=game.board.querySelector(markerSelector);
    const oldRect=oldMarker?.getBoundingClientRect();
    animationToken=motion;
    render();
    const marker=game.board.querySelector(markerSelector);
    const newRect=marker?.getBoundingClientRect();
    if(marker&&oldRect&&newRect){
      marker.style.setProperty("--pawn-dx",`${oldRect.left+oldRect.width/2-newRect.left-newRect.width/2}px`);
      marker.style.setProperty("--pawn-dy",`${oldRect.top+oldRect.height/2-newRect.top-newRect.height/2}px`);
      marker.classList.remove("moving");
      void marker.offsetWidth;
      marker.classList.add("moving");
    }
    await new Promise(resolve=>setTimeout(resolve,motion.captured?delay/4:delay));
    if(motion.step===-1){
      pendingCaptureSteps.delete(`${motion.player}-${motion.token}`);
      if(motion.captured&&--captureReturnsRemaining<=0){captureWhooshStop?.();captureWhooshStop=null;}
    }
  }
  captureWhooshStop?.();
  animationToken=null;
  pendingCaptureSteps.clear();
  locked=false;
  if(finishedCount){
    if(soundEnabled)playFinishSound();
    message=`${getColor(move.player)[0]} pawn reached the final square (${finishedCount}/4). `;
    const teamId=activeTeams[move.player];
    const home=game.board.querySelector(`.base-${teamId}`);
    if(scoreLightTimers.has(teamId))clearTimeout(scoreLightTimers.get(teamId));
    home.classList.remove("score-flash");
    void home.offsetWidth;
    home.classList.add("score-flash");
    const timer=setTimeout(()=>{home.classList.remove("score-flash");scoreLightTimers.delete(teamId);},3500);
    scoreLightTimers.set(teamId,timer);
  }
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
    base.classList.toggle("has-finished-pawn",player>=0&&state.pieces[player].some((step,index)=>step===56&&!(animationToken?.player===player&&animationToken?.token===index&&animationToken.step!==56)));
    game.board.querySelectorAll(`.yard-seat-${seat}`).forEach(tile=>tile.classList.toggle("inactive-yard",!enabled));
    game.board.querySelectorAll(`.lane-${seat}`).forEach(tile=>tile.classList.toggle("inactive-lane",!enabled));
  }
  for(let seat=0;seat<4;seat++){
    const player=activeTeams.indexOf(seat);
    game.board.querySelector(`.lane-${seat}.final-square`)?.classList.toggle("has-finished",player>=0&&state.pieces[player].some((step,index)=>step===56&&!(animationToken?.player===player&&animationToken?.token===index&&animationToken.step!==56)));
  }
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
    button.setAttribute("aria-label",rollingTeam===teamId?`${teams[teamId]} dice rolling`:`${teams[teamId]} dice: ${lastDice[teamId]}${active?", current turn":""}`);
  });
  for(const tile of squares.values()) tile.replaceChildren();
  state.pieces.forEach((team,player)=>team.forEach((step,index)=>{
    const teamId=activeTeams[player];
    const label=`${getColor(player)[0]} token ${index+1}`;
    const button=tokenControls[teamId][index];
    button.hidden=true;
    button.disabled=botTurn||locked||rollingTeam>=0||!legal.includes(index);
    button.setAttribute("aria-label",`${label}, ${step===-1?"in yard":step===56?"home":"step "+(step+1)}`);
    const tokenKey=`${player}-${index}`;
    const visualStep=animationToken?.player===player&&animationToken?.token===index ? animationToken.step : pendingCaptureSteps.has(tokenKey)?pendingCaptureSteps.get(tokenKey):step;
    const tile=visualStep===-1 ? yards[teamId][index] : visualStep>=51 ? lanes[teamId][visualStep-51] : track[trackPosition(teamId,visualStep)];
    const square=squares.get(tile.join(","));
    const marker=document.createElement("span");
    marker.className="ludo-pawn "+teams[teamId].toLowerCase();
    if(visualStep===-1)marker.classList.add("yard-pawn");
    const pawnColor=chosenColors[player];
    marker.style.setProperty("--piece-color",getColor(player)[1]);
    marker.dataset.color=String(pawnColor);
    marker.setAttribute("aria-hidden","true");
    marker.classList.add("sprite-pawn","pin-pawn");
    marker.innerHTML='<svg class="pin-pawn-art" viewBox="0 0 64 80" aria-hidden="true" focusable="false"><path class="pin-outline" d="M32 3C17 3 5 15 5 31c0 15 17 34 27 46 10-12 27-31 27-46C59 15 47 3 32 3Z"/><path class="pin-color" d="M32 9C20 9 11 18 11 31c0 11 13 27 21 38 8-11 21-27 21-38C53 18 44 9 32 9Z"/><circle class="pin-face" cx="32" cy="29" r="13"/><ellipse class="pin-gloss" cx="26" cy="22" rx="4" ry="6"/></svg>';
    marker.dataset.token=`${teamId}-${index}`;
    marker.style.setProperty("--pawn-order",String(index));
    // Only pieces that can legally use this exact result should lift: a six
    // includes yard pieces, while an overshoot at the home lane stays still.
    if(step!==56&&!locked&&rollingTeam<0&&state.roll>0&&player===state.turn&&legal.includes(index))marker.classList.add("pawn-ready-hint");
    if(animationToken?.player===player&&animationToken?.token===index){
      marker.classList.add("moving");
      if(animationToken.captured)marker.classList.add("captured-return");
      const baseDelay=Number(document.querySelector("#settings-animation-speed").value)||320;
      marker.style.setProperty("--pawn-motion-duration",`${animationToken.captured?baseDelay/4:baseDelay}ms`);
    }
    marker.dataset.step=String(visualStep);
    const arrivingAtFinish=animationToken?.player===player&&animationToken?.token===index&&animationToken.step===56;
    if(step===56&&visualStep===56&&!arrivingAtFinish)marker.classList.add("finished-pawn");
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
  for(const square of squares.values()){
    const pile=[...square.children].filter(piece=>piece.classList.contains("ludo-pawn"));
    if(square.classList.contains("final-square")){
      const finishSquareKey=square.style.gridArea;
      const used=new Set(pile.map(piece=>finishSlots.get(`${finishSquareKey}:${piece.dataset.token}`)).filter(Number.isInteger));
      const count=pile.length;
      const columns=count<=4?2:count<=9?3:4;
      const rows=Math.ceil(count/columns);
      const xStep=count===2?72:count<=4?52:count<=9?34:24;
      const yStep=count<=2?0:count<=4?50:count<=9?34:24;
      const finishSize=count===2?"pile-size-finished-2":count<=4?"pile-size-finished-4":count<=9?"pile-size-finished-9":"pile-size-finished-16";
      pile.forEach(piece=>{
        const key=`${finishSquareKey}:${piece.dataset.token}`;
        if(!finishSlots.has(key)){
          let slot=0;
          while(used.has(slot))slot++;
          finishSlots.set(key,slot);used.add(slot);
        }
        const slot=finishSlots.get(key);
        const arrivingAtFinish=animationToken&&piece.dataset.token===`${activeTeams[animationToken.player]}-${animationToken.token}`&&animationToken.step===56;
        if(!arrivingAtFinish)piece.classList.add("finished-pawn");
        if(count>1){
          const row=Math.floor(slot/columns);
          const inRow=Math.min(columns,count-row*columns);
          const column=slot%columns;
          const x=(column-(inRow-1)/2)*xStep;
          const y=(row-(rows-1)/2)*yStep;
          piece.classList.add("stacked-pawn","pile-size-finished",finishSize);
          piece.style.setProperty("--pile-x",`${x}%`);
          piece.style.setProperty("--pile-y",`${y}%`);
        }
        piece.style.zIndex=piece.classList.contains("playable-token")?"80":String(20+slot);
      });
      continue;
    }
    if(pile.length<2)continue;
    const columns=pile.length<=4?2:3;
    const rows=Math.ceil(pile.length/columns);
    const xStep=pile.length===2?72:pile.length<=4?50:34;
    const yStep=pile.length===2?0:pile.length<=4?44:33;
    pile.forEach((piece,index)=>{
      const row=Math.floor(index/columns);
      const inRow=Math.min(columns,pile.length-row*columns);
      const column=index%columns;
      const x=(column-(inRow-1)/2)*xStep;
      const y=(row-(rows-1)/2)*yStep;
      piece.classList.add("stacked-pawn",pile.length>4?"pile-size-dense":`pile-size-${pile.length}`);
      piece.style.setProperty("--pile-x",`${x}%`);
      piece.style.setProperty("--pile-y",`${y}%`);
      piece.style.zIndex=piece.classList.contains("playable-token")?"80":String(20+index);
    });
  }
  game.board.querySelectorAll(".yard-celebration").forEach(badge=>badge.remove());
  state.ranks.forEach((rank,player)=>{
    if(!rank||locked) return;
    const teamId=activeTeams[player];
    const badge=document.createElement("div");
    badge.className=`yard-celebration rank-${rank} ${teams[teamId].toLowerCase()}`;
    badge.innerHTML=rank===1 ? `<span class="winner-firework winner-firework-left" aria-hidden="true"></span><span class="winner-firework winner-firework-right" aria-hidden="true"></span><svg class="winner-crown" viewBox="0 0 42 30" aria-hidden="true"><path d="M4 24 2 8l11 7L21 3l8 12 11-7-3 16z" fill="#ffd552" stroke="#8a470e" stroke-width="2"/><path d="M5 25h32v4H5z" fill="#ecaa24"/></svg><strong class="winner-place">1st</strong><span class="winner-ribbon">WINNER</span>` : `<strong>${rank}${rank===2?"nd":rank===3?"rd":"th"}</strong>`;
    game.board.querySelector(`.base-${teamId}`).append(badge);
  });

  const currentTeam=getColor(state.turn)[0];

  game.status.dataset.turn=teams[activeTeams[state.turn]].toLowerCase();
  const statusText=state.winner!==null?`Game over — ${getColor(state.winner)[0]} wins!`
    :message+(botTurn?`${currentTeam} bot is playing…`:"");
  game.status.textContent=statusText;
  if(!locked && rollingTeam<0 && state.winner===null && state.roll>0 && legal.length===1) {
    game.later(()=>play(legal[0]), 420);
  } else if(!locked && rollingTeam<0 && botTurn) {
    game.later(()=>state.roll?play(choose(legal)):throwDie());
  }
}
game.restart();

