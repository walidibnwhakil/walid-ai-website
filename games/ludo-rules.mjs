export const starts = [0, 39, 13, 26];
export const safe = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

export function newLudo(playerCount = 2, colors = Array.from({length:playerCount},(_,i)=>i)) {
  if (![2,3,4].includes(playerCount)) throw new RangeError("Ludo supports 2, 3 or 4 players");
  if(colors.length!==playerCount || new Set(colors).size!==playerCount || colors.some(c=>!Number.isInteger(c)||c<0||c>3)) throw new RangeError("Unique colors required");
  return {colors:[...colors], pieces:Array.from({length:playerCount},()=>Array(4).fill(-1)), turn:0, roll:0, winner:null, sixChain:0, ranks:Array(playerCount).fill(0), rankCount:0, lastCaptured:[], lastMove:null};
}

export function trackPosition(player, step) {
  return (starts[player] + step) % 52;
}

function nextPlayer(state, after) {
  for(let offset=1;offset<=state.pieces.length;offset++) {
    const candidate=(after+offset)%state.pieces.length;
    if(!state.ranks[candidate]) return candidate;
  }
  return after;
}

export function legalTokens(state) {
  return state.pieces[state.turn].flatMap((step,index)=>{
    if(!state.roll || state.winner!==null || state.ranks[state.turn]) return [];
    return (step<0 ? state.roll===6 : step+state.roll<=56) ? [index] : [];
  });
}

export function chooseBotToken(state) {
  const legal=legalTokens(state);
  if(legal.length<=1) return legal[0] ?? null;
  const candidates=legal.map(index=>{
    const result=moveLudo(state,index);
    const move=result.lastMove;
    const step=move?.to ?? -1;
    const captured=result.lastCaptured.length;
    const finished=result.pieces[state.turn].filter(position=>position===56).length - state.pieces[state.turn].filter(position=>position===56).length;
    const onSafe=step>=0 && step<51 && safe.has(trackPosition(state.colors[state.turn],step));
    let danger=0;
    if(step>=0 && step<51 && !onSafe) {
      for(let rival=0;rival<state.pieces.length;rival++) if(rival!==state.turn) for(const rivalStep of result.pieces[rival]) {
        if(rivalStep<0 || rivalStep>=51) continue;
        const distance=(trackPosition(state.colors[state.turn],step)-trackPosition(state.colors[rival],rivalStep)+52)%52;
        if(distance>=1 && distance<=6) danger++;
      }
    }
    const advances=step<0 ? -1 : step;
    const score=finished*100000+captured*10000+(onSafe?1200:0)-danger*450+advances;
    return {index,score};
  });
  candidates.sort((a,b)=>b.score-a.score || a.index-b.index);
  return candidates[0].index;
}

export function rollLudo(state, roll) {
  if(state.roll || state.winner!==null || !Number.isInteger(roll) || roll<1 || roll>6 || state.ranks[state.turn]) return state;
  const sixChain=roll===6 ? state.sixChain+1 : 0;
  const rolled={...state,roll,sixChain,threeSixes:false,lastCaptured:[],lastMove:null};
  if(legalTokens(rolled).length) return rolled;
  return {...rolled,turn:nextPlayer(rolled,state.turn),roll:0,sixChain:0};
}

export function moveLudo(state,index) {
  if(!legalTokens(state).includes(index)) return state;
  const pieces=state.pieces.map(team=>[...team]);
  const {turn,roll}=state;
  const old=pieces[turn][index];
  const step=old<0 ? 0 : old+roll;
  pieces[turn][index]=step;
  const captured=[];
  if(step<51) {
    const square=trackPosition(state.colors[turn],step);
    if(!safe.has(square)) pieces.forEach((team,rival)=>{
      if(rival!==turn) team.forEach((other,token)=>{
        if(other>=0 && other<51 && trackPosition(state.colors[rival],other)===square) {
          pieces[rival][token]=-1;
          captured.push({player:rival,token,step:other});
        }
      });
    });
  }
  const ranks=[...state.ranks];
  let rankCount=state.rankCount;
  const finished=pieces[turn].every(position=>position===56);
  const bonus=roll===6 || captured.length>0 || step===56;
  // A two-player game is a head-to-head result, not a ranking table.
  // Keep ranks empty so the UI can show Winner/You Lose instead of 1st/2nd.
  if(pieces.length===2) {
    const next=finished?turn:bonus?turn:nextPlayer(state,turn);
    return {...state,pieces,turn:next,roll:0,sixChain:bonus?state.sixChain:0,ranks:[0,0],rankCount:0,winner:finished?turn:null,lastCaptured:captured,lastMove:{player:turn,token:index,from:old,to:step,roll}};
  }
  if(finished && !ranks[turn]) ranks[turn]=++rankCount;
  const remaining=pieces.length-rankCount;
  if(remaining===1) {
    const last=pieces.findIndex((_,player)=>!ranks[player]);
    if(last>=0) ranks[last]=++rankCount;
  }
  const winner=ranks.includes(1) ? ranks.indexOf(1) : null;
  const terminal=rankCount===pieces.length;
  const next=terminal ? turn : ranks[turn] ? nextPlayer(state,turn) : bonus ? turn : nextPlayer(state,turn);
  return {...state,pieces,turn:next,roll:0,sixChain:bonus ? state.sixChain : 0,ranks,rankCount,winner:terminal ? winner : null,lastCaptured:captured,lastMove:{player:turn,token:index,from:old,to:step,roll}};
}

export function movementSteps(from,to) {
  return from<0 ? [0] : Array.from({length:to-from},(_,index)=>from+index+1);
}

export function captureReturnSteps(from) {
  return [...Array.from({length:from},(_,index)=>from-index-1),-1];
}
