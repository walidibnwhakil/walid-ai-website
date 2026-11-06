import test from "node:test";
import assert from "node:assert/strict";
import {newLudo,rollLudo,moveLudo,legalTokens,safe,movementSteps,captureReturnSteps,trackPosition} from "./ludo-rules.mjs";

test("release, six bonus, and three consecutive sixes",()=>{
 let s=newLudo(2); s=rollLudo(s,6); assert.deepEqual(legalTokens(s),[0,1,2,3]);
 s=moveLudo(s,0); assert.equal(s.turn,0); assert.equal(s.sixChain,1);
 s=rollLudo(s,6); s=moveLudo(s,0); assert.equal(s.turn,0); assert.equal(s.sixChain,2);
 s=rollLudo(s,6); assert.equal(s.turn,1); assert.equal(s.threeSixes,true);
});
test("non-six with no legal move skips turn",()=>{
 const s=newLudo(2); const result=rollLudo(s,4); assert.equal(result.turn,1); assert.equal(result.roll,0);
});
test("exact finish and home bonus",()=>{
 let s=newLudo(2); s.pieces[0][0]=56; s=rollLudo(s,1); assert.deepEqual(legalTokens(s),[0]);
 s=moveLudo(s,0); assert.equal(s.pieces[0][0],57); assert.equal(s.turn,0); assert.equal(s.ranks[0],0);
});
test("safe squares protect tokens and open-square capture grants another roll",()=>{
 let s=newLudo(2,[0,1]); s.pieces[0][0]=7; s.pieces[1][0]=21;
 s=rollLudo(s,1); s=moveLudo(s,0); assert.equal(s.pieces[0][0],8); assert.equal(s.pieces[1][0],21); assert.deepEqual(s.lastCaptured,[]);
 s=newLudo(2,[0,1]); s.pieces[0][0]=0; s.pieces[1][0]=14;
 s=rollLudo(s,1); s=moveLudo(s,0); assert.deepEqual(s.lastCaptured,[{player:1,token:0,step:14}]); assert.equal(s.pieces[1][0],-1); assert.equal(s.turn,0);
});
test("finished players receive ranks and are skipped",()=>{
 let s=newLudo(2); s.pieces[0]=[56,57,57,57]; s=rollLudo(s,1); s=moveLudo(s,0);
 assert.equal(s.ranks[0],1); assert.equal(s.ranks[1],2); assert.equal(s.winner,0);
});
test("invalid moves and rolls cannot mutate state",()=>{
 const s=newLudo(2); assert.equal(moveLudo(s,0),s); assert.equal(rollLudo(s,0),s);
});

test("2, 3, and 4 player rosters keep unique color and turn choices",()=>{
 for(const count of [2,3,4]) {
  const s=newLudo(count); assert.equal(s.pieces.length,count);
  assert.equal(new Set(s.colors).size,count);
  const passed=rollLudo(s,4); assert.equal(passed.turn,1%count);
 }
});

test("pawn animations enumerate every square forward and back to yard",()=>{
 assert.deepEqual(movementSteps(4,9),[5,6,7,8,9]);
 assert.deepEqual(movementSteps(-1,0),[0]);
 assert.deepEqual(captureReturnSteps(4),[3,2,1,0,-1]);
 assert.deepEqual(captureReturnSteps(0),[-1]);
});

test("last outer-track square enters its own home lane and cannot wrap into yard",()=>{
 let s=newLudo(2,[0,3]);
 s.pieces[1]=[51,57,57,57];s.turn=1;s.roll=1;
 s=moveLudo(s,0);
 assert.equal(s.pieces[1][0],52);
 assert.equal(s.turn,0);
 assert.equal(trackPosition(3,0),26);
 assert.deepEqual(legalTokens({...s,turn:1,roll:5}),[0]);
 assert.deepEqual(legalTokens({...s,turn:1,roll:6}),[]);
});

test("an overshoot cannot enter or wrap past Home",()=>{
 let s=newLudo(2);s.pieces[0]=[56,57,57,57];
 s=rollLudo(s,2);assert.equal(s.turn,1);assert.equal(s.pieces[0][0],56);
});

test("a six with no legal pawn move passes the turn without a bonus",()=>{
 let s=newLudo(2,[0,3]);s.pieces[0]=[52,53,54,55];
 s=rollLudo(s,6);
 assert.equal(s.turn,1);assert.equal(s.roll,0);assert.equal(s.sixChain,0);assert.deepEqual(legalTokens(s),[]);
});
