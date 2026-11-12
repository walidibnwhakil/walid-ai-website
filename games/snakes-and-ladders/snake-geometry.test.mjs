import test from "node:test";
import assert from "node:assert/strict";
import { SNAKES, center } from "./engine.mjs";
import {
  snakeCurve,
  headPoseFromPath,
  headLocalToWorld,
  headUvAtLocal,
  HEAD_FRAME,
} from "./snake-geometry.mjs";
for (const [i, [head, tail]] of Object.entries(SNAKES).entries())
  test(`head ${head}: head, neck and body use the same anchored tangent`, () => {
    const p = center(+head),
      q = center(tail);
    for (const time of [0, 700, 2100, 6400]) {
      const d = snakeCurve(p, q, i, time),
        n = d.match(/-?[\d.]+/g).map(Number),
        pose = headPoseFromPath(d),
        neck = headLocalToWorld(pose, 0, 1);
      assert.equal(pose.x, p.x);
      assert.equal(pose.y, p.y);
      assert.ok(Math.abs(neck.x - p.x - pose.tx) < 1e-9);
      assert.ok(Math.abs(neck.y - p.y - pose.ty) < 1e-9);
      assert.deepEqual(n.slice(-2), [q.x, q.y]);
      assert.ok(Math.abs(Math.hypot(pose.tx, pose.ty) - 1) < 1e-9);
    }
  });
test("head/neck texture coordinates register with the same photographed surface", () => {
  for (const x of [-1.36, 0, 1.36])
    for (const y of [0, 1.5, 3.4]) {
      const uv = headUvAtLocal(x, y);
      assert.ok(Math.abs((uv.u - 0.5) * HEAD_FRAME.width - x) < 1e-10);
      assert.ok(Math.abs(uv.v * HEAD_FRAME.height + HEAD_FRAME.y - y) < 1e-10);
    }
});
test("the cranium stays inside its square for all orientations", () => {
  for (let a = 0; a < Math.PI * 2; a += 0.1) {
    const p = { x: 5, y: 5, angle: a };
    for (const x of [-2.7, 2.7])
      for (const y of [-2.9, 2.5]) {
        const v = headLocalToWorld(p, x, y);
        assert.ok(v.x >= 0 && v.x <= 10 && v.y >= 0 && v.y <= 10);
      }
  }
});
test("motion changes the middle of the spine without changing either endpoint", () => {
  const p = center(54),
    q = center(31),
    a = snakeCurve(p, q, 3, 0),
    b = snakeCurve(p, q, 3, 1400);
  assert.notEqual(a, b);
  assert.equal(a.split(" C ")[0], b.split(" C ")[0]);
  assert.deepEqual(a.split(" ").slice(-2), b.split(" ").slice(-2));
  assert.equal(snakeCurve(p, q, 3, 0, false), snakeCurve(p, q, 3, 1400, false));
});
