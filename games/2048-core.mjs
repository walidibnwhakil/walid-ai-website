// Pure rules shared by the game and deterministic tests. No DOM or storage dependencies.
export function mergeLine(line) {
  const values = line.filter(Boolean), merged = []; let score = 0;
  for (let i = 0; i < values.length; i++) {
    if (values[i] === values[i + 1]) { const v = values[i] * 2; merged.push(v); score += v; i++; }
    else merged.push(values[i]);
  }
  return {line: [...merged, ...Array(line.length - merged.length).fill(0)], score};
}
function sizeOf(board) {
  const n = Math.sqrt(board.length);
  if (![4,5,6].includes(n)) throw new TypeError('Board must contain 16, 25 or 36 cells');
  return n;
}
function indicesFor(n, direction, line) {
  if (!['left','right','up','down'].includes(direction)) throw new TypeError('Unknown direction');
  return Array.from({length:n}, (_, k) => direction === 'left' ? line*n+k : direction === 'right' ? line*n+n-1-k : direction === 'up' ? k*n+line : (n-1-k)*n+line);
}
export function moveBoard(board, direction) {
  const n = sizeOf(board), next = Array(board.length).fill(0); let score = 0;
  for (let l=0;l<n;l++) {
    const indices=indicesFor(n,direction,l), result=mergeLine(indices.map(i=>board[i]));
    score+=result.score; indices.forEach((i,k)=>next[i]=result.line[k]);
  }
  return {board:next,score,changed:next.some((v,i)=>v!==board[i])};
}
export function tileMotions(board, direction) {
  const n=sizeOf(board), motions=[];
  for(let l=0;l<n;l++) {
    const indices=indicesFor(n,direction,l), tiles=indices.filter(i=>board[i]); let offset=0;
    for(let k=0;k<tiles.length;k++) {
      const source=tiles[k], destination=indices[offset++];
      if(board[source]===board[tiles[k+1]]) {
        const second=tiles[++k];
        if(source!==destination) motions.push({source,destination,merged:true});
        motions.push({source:second,destination,merged:true,consumed:true});
      } else if(source!==destination) motions.push({source,destination,merged:false});
    }
  }
  return motions;
}
export function canMove(board) {
  const n=sizeOf(board); if(board.includes(0)) return true;
  return board.some((v,i)=>(i%n<n-1&&v===board[i+1])||(i+n<board.length&&v===board[i+n]));
}
export function addTile(board, random=Math.random) {
  const empty=board.flatMap((v,i)=>v===0?[i]:[]), next=board.slice();
  if(empty.length) next[empty[Math.min(empty.length-1,Math.floor(random()*empty.length))]]=random()<.9?2:4;
  return next;
}
export function newGame({size=4,mode='classic',target=2048}={},random=Math.random) {
  if(![4,5,6].includes(size)||!['classic','challenge'].includes(mode)||![512,1024,2048,4096,8192].includes(target)) throw new TypeError('Invalid game options');
  return {size,mode,target,board:addTile(addTile(Array(size*size).fill(0),random),random),score:0,status:'playing',achieved:false,continued:false,undoUsed:false,moves:0,merges:0};
}
export function play(state,direction,random=Math.random) {
  if(state.status!=='playing') return {state,changed:false};
  const result=moveBoard(state.board,direction); if(!result.changed) return {state,changed:false};
  const board=addTile(result.board,random), milestone=!state.achieved&&board.some(v=>v>=state.target);
  const merges=state.board.filter(Boolean).length-result.board.filter(Boolean).length;
  const next={...state,board,score:state.score+result.score,moves:state.moves+1,merges:state.merges+merges,achieved:state.achieved||milestone};
  next.status=milestone&&state.mode==='classic'?'won':canMove(board)?'playing':'over';
  return {state:next,changed:true,milestone,merges,gained:result.score,spawn:board.findIndex((v,i)=>v!==result.board[i]),motions:tileMotions(state.board,direction),merged:tileMotions(state.board,direction).filter(m=>m.merged).map(m=>m.destination)};
}
export function continueGame(state) { return state.status==='won'?{...state,continued:true,status:canMove(state.board)?'playing':'over'}:state; }
export function undoGame(state,previous) { return previous&&!state.undoUsed?{...previous,board:previous.board.slice(),undoUsed:true}:state; }
export function resultTitle(state) { return state.status==='won'?'WINNER':state.mode==='classic'&&!state.achieved?'You Lose':'Game Over'; }
export function keyDirection(key) { return {ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',a:'left',s:'down',d:'right'}[key]; }
export function swipeDirection(dx,dy,threshold=24) { return Math.max(Math.abs(dx),Math.abs(dy))<threshold?null:Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'up':'down'; }
export function readStore(storage,key,fallback) { try { return JSON.parse(storage.getItem(key))??fallback; } catch { return fallback; } }
export function writeStore(storage,key,value) { try {storage.setItem(key,JSON.stringify(value));} catch {} }
