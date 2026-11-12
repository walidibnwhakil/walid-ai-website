import {newGame,play,continueGame,undoGame,resultTitle,keyDirection,swipeDirection,readStore,writeStore,canMove} from './2048-core.mjs';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let storage;try{storage=window.localStorage;}catch{}
const defaults={sound:true,animation:true,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,sensitivity:24};
let settings={...defaults,...readStore(storage,'walid-2048-settings',{})};
let stats={games:0,highest:0,tile:0,victories:0,moves:0,merges:0,...readStore(storage,'walid-2048-stats',{})};
let bests=readStore(storage,'walid-2048-bests',{});
// Preserve the old game's local record for its original Classic 4×4 rules.
bests['classic-4']=Math.max(Number(bests['classic-4'])||0,Number(readStore(storage,'walid-ai-2048-best',0))||0);
let options={mode:'classic',size:4,target:2048},state,previous,previousStats,busy=false,inGame=false,pointer,token=0,audio,noticeTimer;
const reducedQuery=matchMedia('(prefers-reduced-motion: reduce)');
const motion=()=>settings.animation&&!settings.reduced&&!reducedQuery.matches;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function save(){writeStore(storage,'walid-2048-bests',bests);writeStore(storage,'walid-2048-stats',stats);writeStore(storage,'walid-2048-settings',settings);}
function applySettings(){document.body.classList.toggle('no-motion',!motion());document.body.classList.toggle('reduced',settings.reduced);$$('.sound-label').forEach(el=>el.textContent=`Sound ${settings.sound?'On':'Off'}`);save();}
function sound(victory=false){if(!settings.sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const start=audio.currentTime;for(let i=0;i<(victory?4:1);i++){const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=victory?[523,659,784,1047][i]:330;gain.gain.setValueAtTime(0,start+i*.1);gain.gain.linearRampToValueAtTime(.045,start+i*.1+.01);gain.gain.exponentialRampToValueAtTime(.001,start+i*.1+.18);osc.connect(gain);gain.connect(audio.destination);osc.start(start+i*.1);osc.stop(start+i*.1+.2);}}catch{}}
function notice(text){$('#notice').textContent=text;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('#notice').textContent='',2600);}
function bestKey(){return `${state.mode}-${state.size}`;}
function remember(){bests[bestKey()]=Math.max(bests[bestKey()]||0,state.score);stats.highest=Math.max(stats.highest,state.score);stats.tile=Math.max(stats.tile,...state.board);save();}
function place(el,index){const n=state.size;el.style.setProperty('--x',`calc(${index%n} * (var(--cell) + var(--gap)))`);el.style.setProperty('--y',`calc(${Math.floor(index/n)} * (var(--cell) + var(--gap)))`);}
function tile(value,index,extra=''){const el=document.createElement('div');el.className=`tile digits-${String(value).length} ${value>=1024?'high':''} ${extra}`;el.dataset.value=value;el.dataset.index=index;el.textContent=value;el.setAttribute('aria-hidden','true');place(el,index);return el;}
function paint({spawn=-1,merged=[]}={}){
  $('#board').style.setProperty('--n',state.size);$('#board').setAttribute('aria-rowcount',state.size);$('#board').setAttribute('aria-colcount',state.size);
  $('#cells').replaceChildren(...state.board.map((v,i)=>{const el=document.createElement('div');el.className='cell';el.setAttribute('role','gridcell');el.setAttribute('aria-label',`Row ${Math.floor(i/state.size)+1}, column ${i%state.size+1}: ${v||'empty'}`);return el;}));
  $('#tiles').replaceChildren(...state.board.flatMap((v,i)=>v?[tile(v,i,i===spawn?'pop':merged.includes(i)?'merge':'')]:[]));
  $('#score').textContent=state.score;$('#best').textContent=bests[bestKey()]||0;$('#status').textContent=state.status==='won'?'Target Reached':state.status==='over'?'Game Over':'Playing';$('#mode-label').textContent=`${state.mode==='classic'?'Classic':'Challenge'} · ${state.size} × ${state.size}`;
  $('#goal').textContent=state.mode==='classic'?`Reach the ${state.target} tile`:`High score · ${state.target} milestone`;
  $('#milestone').textContent=state.achieved?`✓ ${state.target} achieved · Keep climbing!`:'Merge equal numbers to grow.';
  $('#undo').disabled=!previous||state.undoUsed||busy;$('#undo').textContent=`↶  Undo (${state.undoUsed?0:1})`;
}
function start(){token++;busy=false;previous=null;previousStats=null;$('#result').close();$('#effects').replaceChildren();state=newGame(options);stats.games++;inGame=true;document.body.classList.add('playing');$('#top-sound').hidden=false;$('#menu').hidden=true;$('#game').hidden=false;$('#subtitle').textContent='Join the Numbers • Reach Your Goal!';remember();paint();$('#board').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
function menu(){token++;busy=false;inGame=false;document.body.classList.remove('playing');$('#top-sound').hidden=true;$('#result').close();$('#effects').replaceChildren();$('#game').hidden=true;$('#menu').hidden=false;$('#subtitle').textContent='Slide • Merge • Reach 2048!';$('#start').focus({preventScroll:true});}
async function move(direction){
  if(!inGame||busy||$('#dialog').open||$('#result').open||state.status!=='playing')return;
  const result=play(state,direction);if(!result.changed)return;
  busy=true;$('#undo').disabled=true;const run=token;previous=structuredClone(state);previousStats={...stats};
  if(motion()){
    const animations=result.motions.map(m=>{const el=$(`#tiles [data-index="${m.source}"]`);if(!el)return null;const from=getComputedStyle(el).transform;place(el,m.destination);const to=getComputedStyle(el).transform;return el.animate([{transform:from},{transform:to}],{duration:160,easing:'cubic-bezier(.2,.7,.25,1)',fill:'forwards'}).finished;}).filter(Boolean);
    await Promise.allSettled(animations);
  }
  if(run!==token)return;
  state=result.state;stats.moves++;stats.merges+=result.merges;if(result.milestone)stats.victories++;remember();paint(result);if(result.gained)sound();
  if(motion())await wait(210);if(run!==token)return;
  if(state.status==='won')await celebrate(run);
  else if(state.status==='over')showResult();
  else if(result.milestone){sound(true);notice(`${state.target} milestone reached! Keep chasing your high score.`);}
  if(run!==token)return;busy=false;paint();
}
async function celebrate(run){
  sound(true);const winner=$$('#tiles .tile').find(el=>Number(el.dataset.value)>=state.target);winner?.classList.add('target-lit');
  if(motion()){
    await wait(650);if(run!==token)return;
    const boardRect=$('#board').getBoundingClientRect(),cx=boardRect.width/2,cy=boardRect.height/2;
    const animations=[];
    // Every numerical trail begins at the center of an actual rendered numbered tile.
    for(const [i,el] of $$('#tiles .tile').entries()){
      const rect=el.getBoundingClientRect(),x=rect.left-boardRect.left+rect.width/2,y=rect.top-boardRect.top+rect.height/2;
      for(let k=0;k<((navigator.hardwareConcurrency<=4||navigator.deviceMemory<=4)?1:3);k++){
        const ember=document.createElement('span');ember.className='ember';ember.textContent=k===0?el.textContent:'✦';ember.style.left=`${x}px`;ember.style.top=`${y}px`;ember.style.setProperty('--angle',`${Math.atan2(cy-y,cx-x)*180/Math.PI}deg`);$('#effects').append(ember);
        animations.push(ember.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:0},{offset:.15,opacity:1},{transform:`translate(calc(-50% + ${(cx-x)*.6+k*8}px),calc(-50% + ${(cy-y)*.4-35}px)) scale(.8)`,opacity:1,offset:.65},{transform:`translate(calc(-50% + ${cx-x}px),calc(-50% + ${cy-y}px)) scale(.15)`,opacity:0}],{duration:1000,delay:i*25+k*55,easing:'ease-in',fill:'forwards'}).finished);
      }
    }
    await Promise.allSettled(animations);if(run!==token)return;
    const burst=document.createElement('div');burst.className='burst';$('#effects').append(burst);await wait(900);if(run!==token)return;
  }
  $('#effects').replaceChildren();showResult();
}
function showResult(){
  const title=resultTitle(state),win=state.status==='won';$('#result').className=win?'winner':title==='You Lose'?'defeat':'over';$('#result-title').textContent=title;
  $('#result-subtitle').textContent=win?'Target Reached!':state.achieved?`${state.target} achieved · No moves remain`:'No legal moves remain';
  $('#result-score').textContent=`${win?`${state.target} tile · `:''}Final score ${state.score} · Best ${bests[bestKey()]||0}`;
  const actions=[];function add(label,action,green=false){const b=document.createElement('button');b.textContent=label;b.dataset.action=action;if(green)b.className='green';actions.push(b);}
  if(win)add('Continue Playing','continue',true);add(win?'Play Again':'Try Again','restart',!win);add('Back to Menu','menu');if(previous&&!state.undoUsed)add('Undo Last Move','undo');$('#result-actions').replaceChildren(...actions);$('#result').showModal();
}
function undo(){if(busy||!previous||state.undoUsed)return;state=undoGame(state,previous);stats={...previousStats,highest:stats.highest,tile:stats.tile};previous=null;save();$('#result').close();paint();notice('Previous board and score restored.');}
const rules=`<h2>Game Rules</h2><ul><li>Use arrow keys, WASD, or swipe inside the board. Tiles slide as far as they can.</li><li>Adjacent equal tiles combine: 2 + 2 = 4. Each tile merges only once per move: [2, 2, 4] becomes [4, 4], never [8].</li><li>Each merge adds the new tile’s value to your score. Every valid move spawns exactly one tile in an empty cell: 90% chance of 2, 10% of 4. New games start with two tiles. Invalid moves do nothing.</li><li>Classic: form the selected target tile to win. Your score alone cannot win. Continue Playing keeps your board and score; that target celebration happens once unless you Undo the winning move.</li><li>Challenge: reach target milestones while chasing the highest score. A milestone never stops play. Both modes are single player.</li><li>4×4 is the traditional board. 5×5 and 6×6 offer more space, using identical rules. The Expert Board name is a label, not a difficulty ranking.</li><li>The game ends only when the board is full and no adjacent tiles can merge. After a Classic victory, a later full board is Game Over; your victory remains achieved.</li><li>You have one Undo per game. It restores the board, score, target state and status before the last valid move. Best records remain historical. Future spawns are random.</li></ul><p>Records are local to this browser, with Best Score separated by mode and board size. No online leaderboard or cross-device sync.</p>`;
function openDialog(type){let content=rules;if(type==='tools')content=`<h2>Game Controls</h2><div class="quick-tools"><button data-action="rules">Game Rules</button><button data-action="stats">Statistics</button><button data-action="settings">Game Settings</button><button data-action="sound" class="sound-label">Sound ${settings.sound?'On':'Off'}</button></div>`;if(type==='stats'){const entries=[['Games played',stats.games],['Highest score',stats.highest],['Highest tile',stats.tile],['Target victories / milestones',stats.victories],['Total moves',stats.moves],['Total merges',stats.merges]];content=`<h2>Your Statistics</h2><div class="stats-grid">${entries.map(([label,v])=>`<div>${label}<b>${v}</b></div>`).join('')}</div><p>Stored on this device. Undo reverses move, merge and milestone counters. Highest records stay saved.</p>`;}
 if(type==='settings')content=`<h2>Game Settings</h2>${[['sound','Sound effects'],['animation','Tile animations'],['reduced','Reduced visual effects']].map(([key,label])=>`<label class="setting-row">${label}<input type="checkbox" data-setting="${key}" ${settings[key]?'checked':''}></label>`).join('')}<label class="setting-row">Swipe distance<select data-setting="sensitivity"><option value="16">Light · 16px</option><option value="24">Normal · 24px</option><option value="40">Deliberate · 40px</option></select></label><p>System reduced-motion preferences are always respected. Sounds are synthesized after interaction. Music is not included.</p>`;
 $('#dialog-content').innerHTML=content;if(type==='settings')$('[data-setting="sensitivity"]').value=settings.sensitivity;$('#dialog').showModal();}
document.addEventListener('click',e=>{
 const el=e.target.closest('button');if(!el)return;
 if(el.dataset.mode){options.mode=el.dataset.mode;$$('[data-mode]').forEach(b=>{const yes=b===el;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',yes);b.querySelector('b').textContent=yes?'✓':'○';});}
 if(el.dataset.size){options.size=Number(el.dataset.size);$$('[data-size]').forEach(b=>{const yes=b===el;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',yes);b.querySelector('b').textContent=yes?'✓':'○';});}
 if(el.dataset.direction)move(el.dataset.direction);
 const a=el.dataset.action;if(a==='restart')start();if(a==='menu')menu();if(a==='undo')undo();if(a==='continue'){state=continueGame(state);$('#result').close();paint();$('#board').focus();if(state.status==='over')showResult();}
 if(['rules','stats','settings','tools'].includes(a))openDialog(a);if(a==='sound'){settings.sound=!settings.sound;applySettings();if(settings.sound)sound();}
});
$('#start').onclick=()=>{options.target=Number($('#target').value);start();};
for(const [id,delta] of [['#target-prev',-1],['#target-next',1]])$(id).onclick=()=>{const select=$('#target');select.selectedIndex=(select.selectedIndex+delta+5)%5;};
$('#close-dialog').onclick=()=>$('#dialog').close();
$('#dialog').addEventListener('change',e=>{const key=e.target.dataset.setting;if(!key)return;settings[key]=key==='sensitivity'?Number(e.target.value):e.target.checked;applySettings();});
$('#result').addEventListener('cancel',e=>e.preventDefault());
document.addEventListener('keydown',e=>{if(!inGame||e.ctrlKey||e.metaKey||e.altKey||e.repeat||e.target.closest('input,select,textarea,[contenteditable]'))return;const d=keyDirection(e.key);if(d&&!$('#dialog').open&&!$('#result').open){e.preventDefault();move(d);}});
$('#board').addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY};$('#board').setPointerCapture(e.pointerId);});
$('#board').addEventListener('pointerup',e=>{if(!pointer||pointer.id!==e.pointerId)return;const d=swipeDirection(e.clientX-pointer.x,e.clientY-pointer.y,settings.sensitivity);pointer=null;if(d)move(d);});
$('#board').addEventListener('pointercancel',()=>pointer=null);
reducedQuery.addEventListener('change',applySettings);applySettings();
// Browser fixtures import and replace state only on loopback; no debug controls on the live site.
if(['localhost','127.0.0.1'].includes(location.hostname))window.__2048={get state(){return structuredClone(state);},get busy(){return busy;},start,move,undo,menu,setState(s){token++;busy=false;inGame=true;document.body.classList.add('playing');state=structuredClone(s);options={size:s.size,mode:s.mode,target:s.target};previous=null;$('#result').close();$('#menu').hidden=true;$('#game').hidden=false;$('#effects').replaceChildren();remember();paint();},get stats(){return {...stats};}};
