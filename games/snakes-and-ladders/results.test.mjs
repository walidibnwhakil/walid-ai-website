import test from "node:test";
import assert from "node:assert/strict";
import { createGame, roll, settle, placement } from "./engine.mjs";
import {
  MEDALS,
  finishPresentation,
  finishMedal,
  finalStandings,
} from "./results.mjs";
for (const human of [true, false])
  test(`Bot match ${human ? "human" : "bot"} result has no runners-up`, () => {
    const s = createGame(2, true);
    s.current = human ? 0 : 1;
    s.players[s.current].position = 98;
    const done = settle(roll(s, 2));
    const p = finishPresentation(done.state, done.finisher);
    assert.equal(p.title, human ? "You Win" : "You Lose");
    assert.equal(p.defeat, !human);
    assert.equal(p.medal, human ? "gold" : null);
    assert(!p.automatic);
    assert.deepEqual(finalStandings(done.state), []);
  });
for (const color of ["Red", "Blue", "Green", "Yellow"])
  test(`Two-player ${color} winner uses its pawn color name only`, () => {
    const s = createGame(2, false, [color, color === "Blue" ? "Red" : "Blue"]);
    s.players[0].position = 99;
    const d = settle(roll(s, 1));
    assert.equal(finishPresentation(d.state, 0).title, `${color} Wins`);
    assert(!finishPresentation(d.state, 0).defeat);
    assert.deepEqual(finalStandings(d.state), []);
  });
for (const count of [3, 4])
  test(`${count}-player medal progression, continued turns and final loser`, () => {
    let s = createGame(count);
    const order = [...Array(count).keys()].reverse();
    for (let rank = 0; rank < count - 1; rank++) {
      const i = order[rank];
      s.current = i;
      s.players[i].position = 99;
      const d = settle(roll(s, 1));
      s = d.state;
      const p = finishPresentation(s, i);
      assert(p.automatic);
      assert.equal(p.medal, MEDALS[rank].name);
      assert.equal(p.defeat, false);
      if (rank < count - 2) {
        assert.equal(s.phase, "ready");
        assert(!s.order.includes(s.current));
        assert.equal(finishMedal(s.order.length), MEDALS[rank + 1].name);
      } else {
        assert.equal(s.phase, "over");
        const rows = finalStandings(s);
        assert.equal(rows.length, count);
        assert.equal(rows.at(-1).label, "Loser");
        assert.equal(rows.at(-1).medal, null);
        assert.deepEqual(
          rows.slice(0, -1).map((x) => x.medal),
          MEDALS.slice(0, count - 1).map((m) => m.name),
        );
      }
    }
  });
test("No medal presentation before a player finishes", () => {
  assert.throws(() => finishPresentation(createGame(4), 0));
});
test("Last place is always loser, never an unearned bronze medal", () => {
  for (const n of [2, 3, 4]) assert.equal(placement(n - 1, n), "LOSER");
  assert.equal(finishMedal(0), "gold");
  assert.equal(finishMedal(1), "silver");
  assert.equal(finishMedal(2), "bronze");
});
