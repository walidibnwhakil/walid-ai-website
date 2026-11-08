import test from "node:test";
import assert from "node:assert/strict";
import { pawnSlots } from "./pawn-layout.mjs";
for (let count = 1; count <= 16; count++) {
  test(`${count} pawn anchor slots stay centered, inside one tile, without overlapping`, () => {
    const slots = pawnSlots(count);
    assert.equal(slots.length, count);
    const boxes = slots.map((p) => ({
      left: p.x - p.width / 2,
      right: p.x + p.width / 2,
      top: p.y - p.height / 2,
      bottom: p.y + p.height / 2,
    }));
    for (const b of boxes) {
      assert.ok(b.left >= -48.00001 && b.right <= 48.00001);
      assert.ok(b.top >= -48.00001 && b.bottom <= 48.00001);
    }
    assert.ok(
      Math.abs(
        Math.min(...boxes.map((b) => b.left)) +
          Math.max(...boxes.map((b) => b.right)),
      ) < 0.00001,
    );
    assert.ok(
      Math.abs(
        Math.min(...boxes.map((b) => b.top)) +
          Math.max(...boxes.map((b) => b.bottom)),
      ) < 0.00001,
    );
    boxes.forEach((a, i) =>
      boxes
        .slice(i + 1)
        .forEach((b) =>
          assert.ok(
            a.right <= b.left + 0.00001 ||
              b.right <= a.left + 0.00001 ||
              a.bottom <= b.top + 0.00001 ||
              b.bottom <= a.top + 0.00001,
          ),
        ),
    );
  });
}
test("invalid pile sizes are rejected", () => {
  for (const count of [0, 17, -1, 1.5, NaN])
    assert.throws(() => pawnSlots(count), RangeError);
});
