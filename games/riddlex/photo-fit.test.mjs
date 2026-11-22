import assert from "node:assert/strict";
import test from "node:test";
import { fitPhotoInside } from "./scene.js";

for (const [label, imageWidth, imageHeight] of [
  ["tall portrait", 200, 850],
  ["wide landscape", 1200, 240],
  ["square portrait", 600, 600],
  ["ordinary headshot", 640, 960],
]) {
  test(`${label}: whole guessed image fits the photo frame on phone and desktop`, () => {
    for (const frame of [
      { x: 10, y: 10, w: 280, h: 310 },
      { x: 12, y: 12, w: 340, h: 230 },
    ]) {
      const fitted = fitPhotoInside(imageWidth, imageHeight, frame.x, frame.y, frame.w, frame.h);
      assert.ok(fitted.w > 0 && fitted.h > 0);
      assert.ok(fitted.x >= frame.x - 0.01);
      assert.ok(fitted.y >= frame.y - 0.01);
      assert.ok(fitted.x + fitted.w <= frame.x + frame.w + 0.01);
      assert.ok(fitted.y + fitted.h <= frame.y + frame.h + 0.01);
      assert.ok(Math.abs(fitted.w / fitted.h - imageWidth / imageHeight) < 1e-8,
        "preserve the full original aspect ratio");
    }
  });
}
