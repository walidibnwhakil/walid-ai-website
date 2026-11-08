import test from "node:test";
import assert from "node:assert/strict";
import { Chess } from "../vendor/chess.mjs";
import {
  Match,
  squaresFor,
  identity,
  resultText,
  insufficientFor,
} from "./model.mjs";
import { bestMove } from "./engine.mjs";
const legal = (c, from, to) =>
  c.moves({ square: from, verbose: true }).some((m) => m.to === to);
const sequence = (moves) => {
  const c = new Chess();
  for (const m of moves) c.move(m);
  return c;
};
test("standard start, white first, 20 legal moves, proper king/queen", () => {
  const c = new Chess();
  assert.equal(c.turn(), "w");
  assert.equal(c.moves().length, 20);
  assert.equal(c.get("e1").type, "k");
  assert.equal(c.get("d1").type, "q");
  assert.throws(() => c.move("e5"));
  c.move("e4");
  assert.equal(c.turn(), "b");
});
for (const [piece, fen, from, yes, no] of [
  [
    "pawn",
    "4k3/8/8/8/8/3n4/4P3/7K w - - 0 1",
    "e2",
    ["e3", "e4", "d3"],
    ["f3", "e5"],
  ],
  [
    "knight",
    "4k3/8/8/8/3N4/8/8/4K3 w - - 0 1",
    "d4",
    ["b3", "b5", "c2", "c6", "e2", "e6", "f3", "f5"],
    ["d5"],
  ],
  [
    "bishop",
    "4k3/8/8/8/3B4/8/8/4K3 w - - 0 1",
    "d4",
    ["a1", "a7", "g1", "g7"],
    ["d5"],
  ],
  [
    "rook",
    "4k3/8/8/8/3R4/8/8/4K3 w - - 0 1",
    "d4",
    ["d8", "d1", "a4", "h4"],
    ["e5"],
  ],
  [
    "queen",
    "4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1",
    "d4",
    ["d8", "d1", "a4", "h4", "a1", "g7"],
    ["e6"],
  ],
  [
    "king",
    "4k3/8/8/8/3K4/8/8/8 w - - 0 1",
    "d4",
    ["c3", "c4", "c5", "d3", "d5", "e3", "e4", "e5"],
    ["d6"],
  ],
])
  test(`${piece} movement`, () => {
    const c = new Chess(fen);
    for (const to of yes) assert.ok(legal(c, from, to), to);
    for (const to of no) assert.ok(!legal(c, from, to), to);
  });
test("pinned piece cannot expose king, kings never adjacent or captured", () => {
  const c = new Chess("4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1");
  assert.ok(!legal(c, "e2", "d2"));
  const k = new Chess("8/8/8/4k3/8/4K3/8/8 w - - 0 1");
  assert.ok(!legal(k, "e3", "e4"));
  assert.ok(!k.moves({ verbose: true }).some((m) => m.captured === "k"));
});
for (const [name, moves] of [
  ["Fools Mate", ["f3", "e5", "g4", "Qh4#"]],
  ["Scholars Mate", ["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6", "Qxf7#"]],
])
  test(name, () => assert.ok(sequence(moves).isCheckmate()));
test("check and stalemate", () => {
  assert.ok(new Chess("4k3/8/8/8/8/8/4R3/4K3 b - - 0 1").inCheck());
  assert.ok(new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1").isStalemate());
});
test("both castles and undo restore rights", () => {
  for (const san of ["O-O", "O-O-O"]) {
    const c = new Chess("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    const fen = c.fen();
    c.move(san);
    assert.equal(c.get(san === "O-O" ? "f1" : "d1").type, "r");
    c.undo();
    assert.equal(c.fen(), fen);
  }
});
for (const [name, fen] of [
  ["in check", "4r1k1/8/8/8/8/8/8/R3K2R w KQ - 0 1"],
  ["through check", "5rk1/8/8/8/8/8/8/4K2R w K - 0 1"],
  ["into check", "6rk/8/8/8/8/8/8/4K2R w K - 0 1"],
  ["blocked", "4k3/8/8/8/8/8/8/4KB1R w K - 0 1"],
  ["no rights", "4k3/8/8/8/8/8/8/R3K2R w - - 0 1"],
])
  test(`castling prohibited ${name}`, () =>
    assert.ok(!new Chess(fen).moves().includes("O-O")));
test("king and rook movement permanently lose castling", () => {
  for (const moves of [
    ["Ke2", "Ke7", "Ke1", "Ke8"],
    ["Rh2", "Ke7", "Rh1", "Ke8"],
  ]) {
    const c = new Chess("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    for (const m of moves) c.move(m);
    assert.ok(!c.moves().includes("O-O"));
  }
});
test("queenside cannot cross attack and b-file must be empty", () => {
  for (const fen of [
    "3r2k1/8/8/8/8/8/8/R3K3 w Q - 0 1",
    "6k1/8/8/8/8/8/8/RN2K3 w Q - 0 1",
  ])
    assert.ok(!new Chess(fen).moves().includes("O-O-O"));
});
test("en passant capture, expiration and pinned prohibition", () => {
  const c = sequence(["e4", "a6", "e5", "d5"]);
  assert.ok(c.moves().includes("exd6"));
  const fen = c.fen();
  c.move("exd6");
  assert.equal(c.get("d5"), undefined);
  c.undo();
  assert.equal(c.fen(), fen);
  c.move("Nf3");
  c.move("a5");
  assert.ok(!c.moves().includes("exd6"));
  const pin = new Chess("k3r3/8/8/3pP3/8/8/8/4K3 w - d6 0 1");
  assert.ok(!pin.moves().includes("exd6"));
});
for (const p of ["q", "r", "b", "n"])
  test(`promotion to ${p}`, () => {
    const c = new Chess("4k3/P7/8/8/8/8/8/4K3 w - - 0 1");
    c.move({ from: "a7", to: "a8", promotion: p });
    assert.equal(c.get("a8").type, p);
  });
test("automatic repetition claim preserves full history", () => {
  const m = new Match({ mode: "local" });
  for (const move of ["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8"])
    m.move(move);
  assert.match(m.result.reason, /Threefold/);
  assert.equal(m.move("e4"), null);
});
test("fifty and seventy-five moves handled by earlier automatic claim", () => {
  for (const half of [100, 150]) {
    const m = new Match({ fen: `4k3/8/8/8/8/8/R7/4K3 w - - ${half} 80` });
    assert.match(m.result.reason, /Fifty/);
  }
});
test("insufficient material", () => {
  for (const fen of [
    "4k3/8/8/8/8/8/8/4K3 w - - 0 1",
    "4k3/8/8/8/8/8/8/3BK3 w - - 0 1",
    "4k3/8/8/8/8/8/8/3NK3 w - - 0 1",
  ])
    assert.ok(new Match({ fen }).result);
});
test("clocks count active player and background elapsed; expiry blocks moves", () => {
  let t = 0;
  const m = new Match({ now: () => t });
  t = 1500;
  m.move("e4");
  assert.equal(m.clocks.w, 598500);
  t = 4000;
  m.tick();
  assert.equal(m.clocks.b, 597500);
  t = 700000;
  m.tick();
  assert.equal(m.result.winner, "w");
  assert.equal(m.move("e5"), null);
});
test("timeout draw when opponent cannot mate", () => {
  let t = 0;
  const m = new Match({ now: () => t, fen: "4k3/8/8/8/8/8/R7/4K3 w - - 0 1" });
  t = 600001;
  m.tick();
  assert.equal(m.result.winner, null);
  assert.ok(insufficientFor(m.chess, "b"));
});
test("undo restores clocks rights history and restart resets", () => {
  let t = 0;
  const m = new Match({ mode: "local", now: () => t });
  t = 1000;
  m.move("e4");
  const fen = m.chess.fen();
  t = 2000;
  m.move("e5");
  m.undo();
  assert.equal(m.chess.fen(), fen);
  assert.deepEqual(m.chess.history(), ["e4"]);
  assert.equal(m.clocks.b, 599000);
  m.reset();
  assert.equal(m.chess.history().length, 0);
  assert.equal(m.clocks.w, 600000);
  assert.equal(m.hints, 3);
  assert.equal(m.result, null);
});
test("bot pair undo and black first bot move undo", () => {
  const m = new Match();
  m.move("e4");
  m.move("e5");
  m.undo();
  assert.equal(m.chess.history().length, 0);
  const b = new Match({ side: "b" });
  b.move("e4");
  b.undo();
  assert.equal(b.chess.turn(), "w");
});
for (const side of ["w", "b"])
  test(`human ${side} identity and orientation`, () => {
    assert.equal(identity(side, "bot", side).label, "You");
    assert.equal(identity(side === "w" ? "b" : "w", "bot", side).bot, true);
    assert.equal(identity(side, "local", side).label, "Player 1");
    assert.equal(squaresFor(side)[0], side === "w" ? "a8" : "h1");
    const m = new Match({ side });
    assert.equal(m.chess.turn(), "w");
  });
for (const level of ["easy", "medium", "hard"])
  test(`bot ${level} legal moves across positions and hint legality`, () => {
    for (const fen of [
      new Chess().fen(),
      "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3",
      "4k3/P7/8/8/8/8/8/4K3 w - - 0 1",
    ]) {
      const c = new Chess(fen),
        m = bestMove(fen, level, { budget: 100, random: () => 0.2 });
      assert.ok(c.move(m));
    }
  });
test("result messages and no moves after resignation/agreement", () => {
  for (const [winner, mode, side, text] of [
    ["w", "bot", "w", "You Win"],
    ["b", "bot", "w", "You Lose!!"],
    ["b", "local", "w", "Black Win"],
    ["w", "local", "b", "White Win"],
    [null, "bot", "w", "Draw"],
  ])
    assert.equal(resultText({ winner }, mode, side), text);
  for (const action of ["resign", "agreeDraw"]) {
    const m = new Match();
    m[action]();
    assert.equal(m.move("e4"), null);
  }
});
for (const [name, fen, counts] of [
  ["initial", undefined, [20, 400, 8902]],
  [
    "kiwipete",
    "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
    [48, 2039, 97862],
  ],
  ["rook ending", "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1", [14, 191, 2812]],
])
  test(`known perft ${name} depths 1–3`, () => {
    const c = new Chess(fen);
    counts.forEach((n, i) => assert.equal(c.perft(i + 1), n));
  });
test("black castles both sides", () => {
  for (const san of ["O-O", "O-O-O"]) {
    const c = new Chess("r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1");
    c.move(san);
    assert.equal(c.get(san === "O-O" ? "f8" : "d8").type, "r");
  }
});
test("fifth repetition cannot continue after automatic third claim", () => {
  const m = new Match({ mode: "local" });
  for (let i = 0; i < 4; i++)
    for (const move of ["Nf3", "Nf6", "Ng1", "Ng8"]) m.move(move);
  assert.equal(m.chess.history().length, 8);
  assert.match(m.result.reason, /Threefold/);
});
test("castling rook may be attacked, king path may not", () => {
  const c = new Chess("4k2r/8/8/8/8/8/8/4K2R w K - 0 1");
  assert.ok(c.moves().includes("O-O"));
});
test("en passant undo restores captured pawn and right", () => {
  const m = new Match({ mode: "local" });
  for (const move of ["e4", "a6", "e5", "d5"]) m.move(move);
  const before = m.chess.fen();
  m.move("exd6");
  m.undo();
  assert.equal(m.chess.fen(), before);
  assert.ok(m.chess.moves().includes("exd6"));
});
test("undo cannot evade an expired clock", () => {
  let t = 0;
  const m = new Match({ mode: "local", now: () => t });
  m.move("e4");
  t = 600001;
  assert.equal(m.undo(), false);
  assert.equal(m.result.winner, "w");
  assert.equal(m.chess.history().length, 1);
});
