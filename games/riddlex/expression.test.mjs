import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { EXPRESSION_HOLD, createExpressions, expressionKey } from "./expressions.js";

test("each answer maps to a clear plate", () => {
  assert.equal(expressionKey("yes"), "happy");
  assert.equal(expressionKey("probably"), "happy");
  assert.equal(expressionKey("no"), "serious");
  assert.equal(expressionKey("probably_not"), "serious");
  assert.equal(expressionKey("unknown"), "confused");
});

test("an answer stays at full strength while thinking, then eases off", () => {
  const faces = createExpressions();
  faces.setMood("thinking");
  assert.equal(faces.react("yes"), "happy");
  let picture = faces.step(0.4, () => true);
  assert.equal(picture.levels.happy, 1);
  assert.equal(picture.levels.serious, 0);
  faces.setMood("thinking");
  picture = faces.step(EXPRESSION_HOLD - 0.4, () => true);
  assert.equal(picture.levels.happy, 1, "full strength through the hold");
  picture = faces.step(0.2, () => true);
  assert.ok(picture.levels.happy < 1 && picture.levels.happy > 0.4, picture.levels.happy);
  picture = faces.step(1, () => true);
  assert.equal(picture.holding, false);
  assert.ok(picture.levels.happy < 0.02, picture.levels.happy);
});

test("no and don't-know plates are not delayed or replaced by thinking", () => {
  for (const [answer, key] of [["no", "serious"], ["unknown", "confused"]]) {
    const faces = createExpressions();
    faces.react(answer);
    faces.setMood("thinking");
    const picture = faces.step(0.05, () => true);
    assert.equal(picture.key, key);
    assert.equal(picture.levels[key], 1);
  }
});

test("the hold waits until the plate has loaded", () => {
  const faces = createExpressions();
  faces.react("yes");
  const waiting = faces.step(3, () => false);
  assert.equal(waiting.age, 0);
  assert.equal(waiting.levels.happy, 1);
  const shown = faces.step(EXPRESSION_HOLD, () => true);
  assert.equal(shown.levels.happy, 1);
});

test("the scene does not slide rectangular slices of the painting", () => {
  const scene = readFileSync(new URL("./scene.js", import.meta.url), "utf8");
  assert.doesNotMatch(scene, /function nudge/);
  assert.doesNotMatch(scene, /lazyOverlays/);
  assert.match(scene, /loadOverlaySet/);
  assert.match(scene, /createExpressions/);
});
