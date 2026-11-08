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
  assert.deepEqual(SNAKES, { 17: 7, 39: 18, 54: 34, 62: 36, 87: 24, 99: 78 });
  assert.deepEqual(LADDERS, { 3: 22, 6: 15, 28: 52, 47: 68, 72: 91 });
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
test("all players start at 0 and enter without a six", () => {
  for (let v = 1; v <= 6; v++) {
    const s = createGame();
    assert.ok(s.players.every((p) => p.position === 0));
    assert.equal(roll(s, v).landing, v);
  }
});
test("extra turn on six, third consecutive six ignored, counter resets", () => {
  let s = createGame();
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
    assert.equal(roll(bot, v).landing, v);
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
    assert.equal(
      placement(1, count),
      count === 2 ? "RUNNER-UP" : "1ST RUNNER-UP",
    );
    if (count > 2) assert.equal(placement(2, count), "2ND RUNNER-UP");
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
    COLORS,
  );
  assert.throws(() => createGame(3, false, ["Red", "Red", "Blue"]));
  assert.deepEqual(createGame(), createGame());
});
test("logical state never mutates caller; animation resolution is separate", () => {
  const s = createGame();
  const original = structuredClone(s);
  const r = roll(s, 3);
  assert.deepEqual(s, original);
  assert.equal(r.state.phase, "moving");
  assert.equal(r.target, 22);
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
  assert.throws(() => createGame(2, false, ["Pink", "Red"]));
  assert.throws(() => createGame(2, false, ["Red"]));
});
