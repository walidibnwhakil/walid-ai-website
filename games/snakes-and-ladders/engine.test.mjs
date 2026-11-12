import test from "node:test";
import assert from "node:assert/strict";
import {
  SNAKES,
  LADDERS,
  COLORS,
  center,
  squares,
  die,
  createGame,
  roll,
  settle,
  placement,
  chooseColor,
} from "./engine.mjs";
const move = (s, v) => settle(roll(s, v)).state;
test("100 unique numbered squares, traditional zigzag from bottom left", () => {
  assert.deepEqual(
    squares.map((s) => s.n),
    Array.from({ length: 100 }, (_, i) => i + 1),
  );
  for (let r = 0; r < 10; r++) {
    const row = squares
      .filter((s) => s.y === 95 - r * 10)
      .sort((a, b) => a.x - b.x)
      .map((s) => s.n);
    const expected = Array.from({ length: 10 }, (_, c) => r * 10 + c + 1);
    assert.deepEqual(row, r % 2 ? expected.reverse() : expected);
  }
  assert.deepEqual(center(1), { x: 5, y: 95 });
  assert.deepEqual(center(100), { x: 5, y: 5 });
  assert.throws(() => center(0));
  assert.throws(() => center(101));
});
test("exact Classic mappings", () => {
  assert.deepEqual(SNAKES, {
    27: 5,
    40: 3,
    43: 18,
    54: 31,
    66: 45,
    89: 53,
    95: 77,
    99: 41,
  });
  assert.deepEqual(LADDERS, { 4: 25, 13: 46, 42: 63, 50: 69, 62: 81, 74: 92 });
});
for (const [kind, map] of [
  ["snake", SNAKES],
  ["ladder", LADDERS],
])
  for (const [a, b] of Object.entries(map))
    test(`${kind} ${a} → ${b}: valid endpoints, direction, landing and anchors`, () => {
      assert.ok(+a >= 1 && +a <= 100 && b >= 1 && b <= 100);
      assert.ok(kind === "snake" ? +a > b : +a < b);
      assert.ok(!SNAKES[b] && !LADDERS[b]);
      let s = createGame();
      s.players[0].position = +a - 1;
      const r = roll(s, 1);
      assert.equal(r.kind, kind);
      assert.equal(r.landing, +a);
      assert.equal(r.target, b);
      assert.equal(settle(r).state.players[0].position, b);
      for (const n of [+a, b]) assert.ok(center(n).x >= 5 && center(n).x <= 95);
    });
test("all players start outside and only a one activates the pawn", () => {
  for (let v = 1; v <= 6; v++) {
    const s = createGame();
    assert.ok(s.players.every((p) => p.position === 0));
    assert.equal(roll(s, v).landing, v === 1 ? 1 : 0);
  }
});
test("extra turn on six, third consecutive six ignored, counter resets", () => {
  let s = createGame();
  s.players[0].position = 10;
  s = move(s, 6);
  assert.equal(s.current, 0);
  assert.equal(s.sixes, 1);
  s = move(s, 6);
  assert.equal(s.sixes, 2);
  const p = s.players[0].position;
  const r = roll(s, 6);
  assert.equal(r.penalty, true);
  assert.equal(r.target, p);
  s = settle(r).state;
  assert.equal(s.current, 1);
  assert.equal(s.sixes, 0);
});
test("normal advance, exact finish and overshoot", () => {
  const s = createGame();
  s.players[0].position = 94;
  assert.equal(roll(s, 5).landing, 99);
  assert.equal(roll(s, 6).target, 100);
  s.players[0].position = 98;
  assert.equal(roll(s, 4).target, 98);
  s.players[0].position = 100 - 2;
  const r = settle(roll(s, 2));
  assert.equal(r.finisher, 0);
  assert.deepEqual(r.state.order, [0, 1]);
  assert.equal(r.state.phase, "over");
});
test("roll input validation and no double rolls", () => {
  for (const n of [0, 7, 1.5, NaN]) assert.throws(() => roll(createGame(), n));
  assert.throws(() => roll(roll(createGame(), 2).state, 2), /locked/);
});
test("crypto range and rejection sampling (no modulo bias)", () => {
  let n = 0;
  const source = {
    getRandomValues(a) {
      a[0] = n++;
    },
  };
  const counts = Array(6).fill(0);
  for (let i = 0; i < 6000; i++) counts[die(source) - 1]++;
  assert.deepEqual(counts, Array(6).fill(1000));
  let calls = 0;
  assert.equal(
    die({
      getRandomValues(a) {
        a[0] = calls++ ? 5 : 4294967295;
      },
    }),
    6,
  );
  assert.equal(calls, 2);
});
test("bot and human use identical transitions for all dice values", () => {
  for (let v = 1; v <= 6; v++) {
    const human = createGame(),
      bot = createGame(2, true);
    assert.deepEqual(
      roll(human, v).state.players.map((p) => p.position),
      roll(bot, v).state.players.map((p) => p.position),
    );
    bot.current = 1;
    assert.equal(roll(bot, v).landing, v === 1 ? 1 : 0);
  }
});
for (const count of [2, 3, 4])
  test(`${count}-player standings and skipped finishers`, () => {
    let s = createGame(count);
    const desired = [...Array(count).keys()].reverse();
    for (let rank = 0; rank < count - 1; rank++) {
      const i = desired[rank];
      s.current = i;
      s.players[i].position = 98;
      const done = settle(roll(s, 2));
      assert.equal(done.finisher, i);
      s = done.state;
      assert.deepEqual(s.order.slice(0, rank + 1), desired.slice(0, rank + 1));
      if (rank < count - 2) {
        assert.equal(s.phase, "ready");
        assert.ok(!s.order.includes(s.current));
      } else assert.equal(s.phase, "over");
    }
    assert.deepEqual(s.order, desired);
    assert.equal(placement(0, count), "WINNER");
    assert.equal(placement(1, count), count === 2 ? "LOSER" : "1ST RUNNER-UP");
    if (count > 2)
      assert.equal(
        placement(2, count),
        count === 3 ? "LOSER" : "2ND RUNNER-UP",
      );
  });
test("turn wrap, unique colors and restart", () => {
  let s = createGame(4);
  for (let i = 0; i < 4; i++) {
    assert.equal(s.current, i);
    s = move(s, 2);
  }
  assert.equal(s.current, 0);
  assert.deepEqual(
    createGame(4).players.map((p) => p.color),
    COLORS.slice(0, 4),
  );
  assert.throws(() => createGame(3, false, ["Red", "Red", "Blue"]));
  assert.deepEqual(createGame(), createGame());
});
test("logical state never mutates caller; animation resolution is separate", () => {
  const s = createGame();
  s.players[0].position = 3;
  const original = structuredClone(s);
  const r = roll(s, 1);
  assert.deepEqual(s, original);
  assert.equal(r.state.phase, "moving");
  assert.equal(r.target, 25);
  assert.equal(settle(r).state.phase, "ready");
});
for (const count of [2, 3, 4])
  test(`seeded complete ${count}-player match preserves positions, skips finishers and terminates`, () => {
    let seed = 123456,
      s = createGame(count),
      n = 0;
    while (s.phase !== "over" && n++ < 20000) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      assert.ok(!s.order.includes(s.current));
      s = settle(roll(s, 1 + Math.floor((seed / 4294967296) * 6))).state;
      for (const p of s.players)
        assert.ok(p.position >= 0 && p.position <= 100);
    }
    assert.equal(s.phase, "over");
    assert.equal(new Set(s.order).size, count);
    assert.equal(s.players[s.order[0]].position, 100);
    assert.throws(() => roll(s, 1));
  });
test("rejects invalid player configurations", () => {
  assert.throws(() => createGame(2.5));
  assert.throws(() => createGame(3, true));
  assert.throws(() => createGame(2, false, ["Invalid", "Red"]));
  assert.throws(() => createGame(2, false, ["Red"]));
});
test("a one activates at square 1 and later values advance normally", () => {
  let s = createGame();
  for (const v of [2, 3, 4, 5, 6]) {
    const r = roll(s, v);
    assert.equal(r.waitingForOne, true);
    assert.equal(r.target, 0);
    assert.equal(r.activated, false);
  }
  const r = roll(s, 1);
  assert.equal(r.activated, true);
  assert.equal(r.target, 1);
  s = settle(r).state;
  s.current = 0;
  const next = roll(s, 3);
  assert.equal(next.landing, 4);
  assert.equal(next.target, 25);
});
test("third-six penalty applies only after activation", () => {
  for (const position of [10, 40]) {
    let s = createGame();
    s.players[0].position = position;
    s = move(s, 6);
    s = move(s, 6);
    const before = s.players[0].position,
      r = roll(s, 6);
    assert.equal(r.penalty, true);
    assert.equal(r.target, before);
    assert.equal(settle(r).state.current, 1);
  }
});
test("each player retains their own last die result", () => {
  let s = createGame();
  s = move(s, 1);
  assert.equal(s.players[0].lastDice, 1);
  assert.equal(s.players[1].lastDice, null);
  s = move(s, 4);
  assert.equal(s.players[1].lastDice, 4);
  assert.equal(s.players[0].lastDice, 1);
});
test("color choice before first roll swaps occupied colors without duplicates", () => {
  const s = createGame(4),
    next = chooseColor(s, 0, "Blue");
  assert.deepEqual(
    next.players.map((p) => p.color),
    ["Blue", "Red", "Yellow", "Green"],
  );
  assert.deepEqual(
    s.players.map((p) => p.color),
    COLORS.slice(0, 4),
  );
  assert.equal(new Set(next.players.map((p) => p.color)).size, 4);
});
test("first roll locks all players colors, including a failed entry roll", () => {
  for (const value of [1, 2, 6]) {
    const r = roll(createGame(4), value);
    assert.equal(r.state.colorsLocked, true);
    for (let i = 0; i < 4; i++)
      assert.throws(() => chooseColor(r.state, i, "Green"), /locked/);
    assert.throws(() => chooseColor(settle(r).state, 0, "Blue"), /locked/);
  }
});
test("color lock takes effect immediately when UI begins rolling; restart unlocks", () => {
  const s = { ...createGame(), colorsLocked: true };
  assert.throws(() => chooseColor(s, 1, "Green"), /locked/);
  assert.equal(createGame().colorsLocked, false);
  assert.equal(chooseColor(createGame(), 1, "Green").players[1].color, "Green");
});
test("invalid color and player choices are rejected", () => {
  assert.throws(() => chooseColor(createGame(), 4, "Red"));
  assert.throws(() => chooseColor(createGame(), 0, "Invalid"));
});
test("all nine palette colors preserve uniqueness for every match size", () => {
  for (const count of [2, 3, 4])
    for (const color of COLORS) {
      const s = chooseColor(createGame(count), 0, color);
      assert.equal(s.players[0].color, color);
      assert.equal(new Set(s.players.map((p) => p.color)).size, count);
    }
});
test("an inactive six ends the turn with no extra roll or six streak", () => {
  for (const count of [2, 3, 4]) {
    const s = createGame(count),
      r = roll(s, 6);
    assert.equal(r.target, 0);
    assert.equal(r.state.sixes, 0);
    const next = settle(r).state;
    assert.equal(next.current, 1);
    assert.equal(next.sixes, 0);
  }
});

test("97 plus six cannot move and passes the turn for humans and the bot", () => {
  for (const bot of [false, true])
    for (const current of [0, 1]) {
      const s = createGame(2, bot);
      s.current = current;
      s.players[current].position = 97;
      const r = roll(s, 6);
      assert.equal(r.overshoot, true);
      assert.equal(r.target, 97);
      assert.equal(r.kind, "move");
      const next = settle(r).state;
      assert.equal(next.current, 1 - current);
      assert.equal(next.sixes, 0);
    }
});
test("every overshoot keeps its square and ends the turn including a six", () => {
  for (let pos = 95; pos < 100; pos++)
    for (let value = 1; value <= 6; value++) {
      if (pos + value <= 100) continue;
      const s = createGame();
      s.players[0].position = pos;
      s.sixes = 1;
      const r = roll(s, value);
      assert.equal(r.overshoot, true);
      assert.equal(r.target, pos);
      assert.equal(r.kind, "move");
      assert.equal(settle(r).state.current, 1);
      assert.equal(settle(r).state.sixes, 0);
    }
});
test("an impossible six skips finished players when handing over", () => {
  const s = createGame(4);
  s.players[0].position = 97;
  s.players[1].position = 100;
  s.order = [1];
  const next = move(s, 6);
  assert.equal(next.current, 2);
  assert.deepEqual(next.order, [1]);
  assert.equal(next.players[0].position, 97);
});
test("a possible six still grants an extra turn and an exact six can win", () => {
  let s = createGame();
  s.players[0].position = 90;
  let r = roll(s, 6);
  assert.equal(r.overshoot, false);
  assert.equal(r.target, 96);
  assert.equal(settle(r).state.current, 0);
  s = createGame();
  s.players[0].position = 94;
  r = roll(s, 6);
  assert.equal(r.overshoot, false);
  assert.equal(r.target, 100);
  assert.equal(settle(r).finisher, 0);
});
