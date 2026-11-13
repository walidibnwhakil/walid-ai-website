import test from "node:test";
import assert from "node:assert/strict";
import {newLudo,rollLudo,moveLudo,legalTokens,safe,movementSteps,captureReturnSteps,trackPosition} from "./ludo-rules.mjs";

// Current displayed rules finish at step 56 and grant a bonus for every legal six.
test("release and every legal six grants another roll",()=>{
 let s=newLudo(2); s=rollLudo(s,6); assert.deepEqual(legalTokens(s),[0,1,2,3]);
 s=moveLudo(s,0); assert.equal(s.turn,0); assert.equal(s.sixChain,1);
 s=rollLudo(s,6); s=moveLudo(s,0); assert.equal(s.turn,0); assert.equal(s.sixChain,2);
 s=rollLudo(s,6); assert.equal(s.turn,0); assert.equal(s.threeSixes,false);
 s=moveLudo(s,0); assert.equal(s.pieces[0][0],12); assert.equal(s.turn,0); assert.equal(s.sixChain,3);
});
test("non-six with no legal move skips turn",()=>{
 const s=newLudo(2); const result=rollLudo(s,4); assert.equal(result.turn,1); assert.equal(result.roll,0);
});
test("exact finish and home bonus",()=>{
 let s=newLudo(2); s.pieces[0][0]=55; s=rollLudo(s,1); assert.deepEqual(legalTokens(s),[0]);
 s=moveLudo(s,0); assert.equal(s.pieces[0][0],56); assert.equal(s.turn,0); assert.equal(s.ranks[0],0);
});
test("safe squares protect tokens and open-square capture grants another roll",()=>{
 let s=newLudo(2,[0,1]); s.pieces[0][0]=7; s.pieces[1][0]=21;
 s=rollLudo(s,1); s=moveLudo(s,0); assert.equal(s.pieces[0][0],8); assert.equal(s.pieces[1][0],21); assert.deepEqual(s.lastCaptured,[]);
 s=newLudo(2,[0,1]); s.pieces[0][0]=0; s.pieces[1][0]=14;
 s=rollLudo(s,1); s=moveLudo(s,0); assert.deepEqual(s.lastCaptured,[{player:1,token:0,step:14}]); assert.equal(s.pieces[1][0],-1); assert.equal(s.turn,0);
});
test("two-player finish is a head-to-head winner result",()=>{
 let s=newLudo(2); s.pieces[0]=[55,56,56,56]; s=rollLudo(s,1); s=moveLudo(s,0);
 assert.deepEqual(s.ranks,[0,0]); assert.equal(s.winner,0); assert.equal(s.rankCount,0);
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

test("the correct outer-track exit enters its own lane before the exact Home square",()=>{
 let s=newLudo(2,[0,3]);
 s.pieces[1]=[50,56,56,56];s.turn=1;s.roll=1;
 s=moveLudo(s,0);
 assert.equal(s.pieces[1][0],51);
 assert.equal(s.turn,0);
 assert.equal(trackPosition(3,0),26);
 assert.deepEqual(legalTokens({...s,turn:1,roll:5}),[0]);
 assert.deepEqual(legalTokens({...s,turn:1,roll:6}),[]);
});

test("an overshoot cannot enter or wrap past Home",()=>{
 let s=newLudo(2);s.pieces[0]=[56,-1,-1,-1];
 s=rollLudo(s,2);assert.equal(s.turn,1);assert.equal(s.pieces[0][0],56);
});

test("a six with no legal pawn move passes the turn without a bonus",()=>{
 let s=newLudo(2,[0,3]);s.pieces[0]=[52,53,54,55];
 s=rollLudo(s,6);
 assert.equal(s.turn,1);assert.equal(s.roll,0);assert.equal(s.sixChain,0);assert.deepEqual(legalTokens(s),[]);
});

test("all four outer routes leave into the matching player home lane",()=>{
 for(let player=0;player<4;player++){
  let s=newLudo(4,[0,1,2,3]);s.pieces[player][0]=50;s.turn=player;s.roll=1;
  s=moveLudo(s,0);assert.equal(s.pieces[player][0],51,"player "+player+" enters lane at step 51");
 }
});


test("bot chooses an available capture over a non-capturing move",()=>{
 let s=newLudo(2,[0,1]); s.pieces[0]=[4,10,20,30]; s.pieces[1]=[22,40,41,42]; s=rollLudo(s,5);
 assert.equal(chooseBotToken(s),0);
});
test("bot prioritizes finishing a pawn",()=>{
 let s=newLudo(3,[0,1,2]); s.pieces[0]=[55,10,20,30]; s=rollLudo(s,1);
 assert.equal(chooseBotToken(s),0);
});
test("bot prefers a safe landing when tactical outcomes are otherwise equal",()=>{
 let s=newLudo(2,[0,1]); s.pieces[0]=[7,10,20,30]; s=rollLudo(s,1);
 assert.equal(chooseBotToken(s),0);
});
