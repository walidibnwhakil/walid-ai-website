import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  move,
  winningLines,
  LEVELS,
  sequences,
  isBotTurn,
  resultTitle,
  lineGeometry,
} from "./engine.mjs";
import { chooseMove } from "./bot.mjs";
for (const [level, { size: n, connect: k }] of Object.entries(LEVELS)) {
  test(`${level}: empty ${n}×${n} board; X starts`, () => {
    const g = createGame(level);
    assert.equal(g.cells.length, n * n);
    assert(g.cells.every((x) => x === ""));
    assert.equal(g.turn, "X");
  });
  test(`${level}: legal moves alternate; invalid/occupied moves preserve state`, () => {
    const g = createGame(level);
    for (const i of [-1, n * n, NaN, 1.1, "0", null])
      assert.equal(move(g, i), false);
    assert(move(g, 0));
    assert.equal(g.turn, "O");
    assert.equal(move(g, 0), false);
    assert(move(g, 1));
    assert.equal(g.turn, "X");
    assert.equal(g.moves, 2);
  });
  for (const [name, dr, dc, r, c] of [
    ["horizontal", 0, 1, 1, 0],
    ["vertical", 1, 0, 0, 1],
    ["diagonal descending", 1, 1, 0, 0],
    ["diagonal ascending", 1, -1, 0, n - 1],
  ]) {
    test(`${level}: ${k} ${name}; exact coordinates; geometry`, () => {
      const g = createGame(level);
      const indices = Array.from(
        { length: k },
        (_, j) => (r + j * dr) * n + c + j * dc,
      );
      indices.slice(0, -1).forEach((i) => (g.cells[i] = "X"));
      g.moves = k - 1;
      assert.equal(winningLines(g.cells, n, k).length, 0);
      assert(move(g, indices.at(-1)));
      assert.equal(g.winner, "X");
      assert(
        g.lines.some((l) => JSON.stringify(l) === JSON.stringify(indices)),
      );
      assert.equal(g.lines[0].length, k);
      assert.equal(move(g, n * n - 1), false);
      const rects = g.cells.map((_, i) => ({
        x: 10 + (i % n) * 40,
        y: 20 + Math.floor(i / n) * 40,
        width: 40,
        height: 40,
      }));
      const p = lineGeometry(indices, rects, { x: 10, y: 20 });
      assert.equal(p.at(-1).x - p[0].x, dc * (k - 1) * 40);
      assert.equal(p.at(-1).y - p[0].y, dr * (k - 1) * 40);
    });
  }
  test(`${level}: every possible sequence is detected for both symbols`, () => {
    for (const l of sequences(n, k))
      for (const s of ["X", "O"]) {
        const cells = Array(n * n).fill("");
        l.forEach((i) => (cells[i] = s));
        assert(
          winningLines(cells, n, k).some(
            (x) => JSON.stringify(x) === JSON.stringify(l),
          ),
        );
      }
  });
  test(`${level}: short and disconnected do not win`, () => {
    const g = createGame(level);
    for (let j = 0; j < k - 1; j++) g.cells[j] = "X";
    assert.equal(winningLines(g.cells, n, k).length, 0);
    g.cells.fill("");
    for (let j = 0; j < n; j += 2) g.cells[j] = "O";
    assert.equal(winningLines(g.cells, n, k).length, 0);
  });
  test(`${level}: bot takes win and blocks loss, both symbols`, () => {
    for (const s of ["X", "O"]) {
      const g = createGame(level);
      g.turn = s;
      g.moves = k;
      for (let j = 0; j < k - 1; j++) g.cells[j] = s;
      assert.equal(chooseMove(g, 200), k - 1);
      g.cells = g.cells.map((x) => (x ? (s === "X" ? "O" : "X") : ""));
      assert.equal(chooseMove(g, 200), k - 1);
    }
  });
  test(`${level}: terminated bot returns no move`, () => {
    const g = createGame(level);
    g.ended = true;
    assert.equal(chooseMove(g), null);
  });
}
test("Full board draw and no moves after draw", () => {
  const g = createGame();
  for (const i of [0, 1, 2, 4, 3, 5, 7, 6, 8]) assert(move(g, i));
  assert.equal(g.winner, "draw");
  assert(g.ended);
  assert.equal(move(g, 0), false);
  assert.equal(resultTitle(g), "Draw");
});
test("Multiple winning lines on one move", () => {
  const g = createGame();
  g.cells = ["X", "O", "X", "O", "", "O", "X", "O", "X"];
  g.moves = 8;
  assert(move(g, 4));
  assert.equal(g.lines.length, 2);
  assert.equal(g.winner, "X");
});
test("Overlong run returns all exact-length consecutive windows", () => {
  const g = createGame("hard");
  g.cells.fill("", 0);
  for (let i = 0; i < 7; i++) g.cells[i] = "O";
  const lines = winningLines(g.cells, 7, 5);
  assert.equal(lines.length, 3);
  assert(lines.every((l) => l.length === 5));
});
test("Human X/O, bot X starts, selected symbol assigned to Player 1", () => {
  for (const symbol of ["X", "O"]) {
    const g = createGame("easy", "bot", symbol);
    assert.equal(isBotTurn(g), symbol === "O");
    move(g, 4);
    assert.equal(isBotTurn(g), symbol === "X");
    const f = createGame("hard", "friend", symbol);
    assert.equal(f.symbol, symbol);
    assert.equal(f.turn, "X");
    assert(!isBotTurn(f));
    move(f, 0);
    assert.equal(f.turn, "O");
  }
});
test("Results reflect actual symbol and mode", () => {
  for (const mode of ["bot", "friend"])
    for (const symbol of ["X", "O"])
      for (const winner of ["X", "O", "draw"]) {
        const g = { mode, symbol, winner };
        assert.equal(
          resultTitle(g),
          winner === "draw"
            ? "Draw"
            : mode === "friend"
              ? `${winner} Wins`
              : symbol === winner
                ? "You Win"
                : "You Lose",
        );
      }
});
test("Restart and level switch create clean state", () => {
  let g = createGame();
  move(g, 0);
  for (const level of Object.keys(LEVELS)) {
    g = createGame(level, "friend", "O");
    assert.equal(g.moves, 0);
    assert.equal(g.turn, "X");
    assert.equal(g.winner, "");
    assert.equal(g.lines.length, 0);
    assert(!g.ended);
    assert.equal(g.cells.length, LEVELS[level].size ** 2);
  }
});
test("Bot counters the opposite-corner fork", () => {
  const g = createGame();
  g.cells = ["X", "", "", "", "O", "", "", "", "X"];
  g.turn = "O";
  g.moves = 3;
  assert([1, 3, 5, 7].includes(chooseMove(g, 5000)));
});
test("Bot creates a fork when it wins by force", () => {
  const g = createGame();
  g.cells = ["X", "O", "", "", "X", "", "", "", "O"];
  g.turn = "X";
  g.moves = 4;
  const i = chooseMove(g, 5000);
  g.cells[i] = "X";
  const threats = new Set(
    sequences(3, 3).flatMap((l) =>
      l.filter((j) => !g.cells[j]).length === 1 &&
      l.filter((j) => g.cells[j] === "X").length === 2
        ? l.filter((j) => !g.cells[j])
        : [],
    ),
  );
  assert(threats.size >= 2 || winningLines(g.cells, 3, 3).length);
});
test("3×3 exact bot cannot lose against any legal opponent continuation, as X or O", () => {
  let checked = 0;
  const memo = new Set();
  function walk(g, bot) {
    if (g.ended) {
      assert(g.winner === bot || g.winner === "draw");
      checked++;
      return;
    }
    const key = g.cells.join(".") + g.turn + bot;
    if (memo.has(key)) return;
    memo.add(key);
    if (g.turn === bot) {
      const i = chooseMove(g, 5000);
      assert(Number.isInteger(i) && !g.cells[i]);
      const next = structuredClone(g);
      assert(move(next, i));
      walk(next, bot);
    } else
      for (let i = 0; i < 9; i++)
        if (!g.cells[i]) {
          const next = structuredClone(g);
          move(next, i);
          walk(next, bot);
        }
  }
  for (const bot of ["X", "O"]) walk(createGame(), bot);
  assert(checked > 100);
  console.log(
    `Exhaustive reachable-policy states: ${memo.size}; terminal outcomes: ${checked}`,
  );
});
for (const level of ["medium", "hard"])
  test(`${level}: create and prevent intersecting multi-threat forks`, () => {
    const g = createGame(level),
      m = Math.floor(g.size / 2),
      offsets = level === "medium" ? [-1, 1] : [-2, -1, 1];
    for (const d of offsets) {
      g.cells[m * g.size + m + d] = "X";
      g.cells[(m + d) * g.size + m] = "X";
    }
    g.moves = offsets.length * 2;
    assert.equal(chooseMove(g, 650), m * g.size + m);
    g.cells = g.cells.map((s) => (s ? "O" : ""));
    assert.equal(chooseMove(g, 650), m * g.size + m);
  });
