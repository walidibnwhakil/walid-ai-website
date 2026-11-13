import test from "node:test";
import assert from "node:assert/strict";
import {newLudo, rollLudo, moveLudo, legalTokens} from "./ludo-rules.mjs";
import {Chess} from "./vendor/chess.mjs";

test("Ludo needs a six to leave the yard and grants another roll", () => {
  let state = rollLudo(newLudo(), 4);
  assert.equal(state.turn, 1);
  state = rollLudo(state, 6);
  assert.deepEqual(legalTokens(state), [0, 1, 2, 3]);
  state = moveLudo(state, 2);
  assert.equal(state.pieces[1][2], 0);
  assert.equal(state.turn, 1);
});

test("Ludo captures on regular squares and protects safe squares", () => {
  const state = {...newLudo(), pieces: [[0,-1,-1,-1], [15,34,-1,-1]]};
  const captured=moveLudo(rollLudo(state, 2), 0);
  assert.deepEqual(captured.pieces[1], [-1,34,-1,-1]);
  assert.equal(captured.turn,0,"a capture earns an extra roll");
  const safe = {...state, pieces: [[7,-1,-1,-1], [34,-1,-1,-1]]};
  const protectedMove=moveLudo(rollLudo(safe, 1), 0);
  assert.equal(protectedMove.pieces[1][0], 34);
  assert.equal(protectedMove.turn,1,"safe squares do not count as captures");
});

test("Ludo rejects overshoots and ends when the fourth token gets home", () => {
  const state = {...newLudo(), pieces: [[54,56,56,56], [-1,-1,-1,-1]]};
  assert.equal(rollLudo(state, 3).turn, 1);
  const won = moveLudo(rollLudo(state, 2), 0);
  assert.equal(won.winner, 0, "two-player Ludu records the winning player directly");
  assert.equal(won.pieces[0].every(position => position === 56), true);
  assert.equal(rollLudo(won, 6), won);
});

test("Ludo supports three and four players with turn wrap and multi-rival capture", () => {
  assert.equal(newLudo(2).pieces.length, 2);
  assert.equal(newLudo(3).pieces.length, 3);
  assert.equal(newLudo(4).pieces.length, 4);
  assert.throws(() => newLudo(5), /2, 3 or 4/);
  const three = {...newLudo(3),turn:2,pieces:[[ -1,-1,-1,-1 ],[-1,-1,-1,-1],[0,-1,-1,-1]]};
  assert.equal(moveLudo(rollLudo(three,1),0).turn,0);
  const four = {...newLudo(4),turn:3,pieces:[[-1,-1,-1,-1],[-1,-1,-1,-1],[-1,-1,-1,-1],[0,-1,-1,-1]]};
  assert.equal(moveLudo(rollLudo(four,1),0).turn,0);
  const rivals = {...newLudo(3),pieces:[[0,-1,-1,-1],[27,-1,-1,-1],[40,-1,-1,-1]]};
  const moved = moveLudo(rollLudo(rivals,1),0);
  assert.equal(moved.pieces[1][0],27);
  assert.equal(moved.pieces[2][0],-1);
});

test("Chess handles en passant, castling, promotion and checkmate", () => {
  const game = new Chess();
  for (const move of ["e4","a6","e5","d5","exd6"]) game.move(move);
  assert.equal(game.get("d5"), undefined);
  game.load("4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1");
  game.move("O-O");
  assert.equal(game.get("f1").type, "r");
  game.load("4k3/P7/8/8/8/8/8/4K3 w - - 0 1");
  game.move({from:"a7",to:"a8",promotion:"n"});
  assert.equal(game.get("a8").type, "n");
  game.reset();
  for (const move of ["f3","e5","g4","Qh4#"]) game.move(move);
  assert.equal(game.isCheckmate(), true);
});

