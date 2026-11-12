import assert from 'node:assert/strict';
import { decontaminate, fillEnclosedHoles, guidedFilter, refineAlpha } from './refine.js';

function circleAlpha(size, radius) {
  const alpha = new Float32Array(size * size);
  const guide = new Float32Array(size * size);
  const mid = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.hypot(x - mid, y - mid);
      const inside = dist <= radius;
      guide[y * size + x] = inside ? 0.1 : 0.9;
      const soft = dist > radius - 6 && dist < radius + 6 ? 0.5 : inside ? 1 : 0;
      alpha[y * size + x] = soft;
    }
  }
  return { alpha, guide };
}

const { alpha, guide } = circleAlpha(80, 24);
const filtered = guidedFilter(guide, alpha, 80, 80, 4, 0.001);
let edgeMoved = 0;
let flatHeld = 0;
const mid = 39.5;
for (let y = 0; y < 80; y++) {
  for (let x = 0; x < 80; x++) {
    const dist = Math.hypot(x - mid, y - mid);
    const i = y * 80 + x;
    if (dist < 14) {
      if (filtered[i] > 0.85) flatHeld++;
    }
    if (dist > 34) {
      if (filtered[i] < 0.15) flatHeld++;
    }
    if (Math.abs(dist - 24) < 1.2 && Math.abs(filtered[i] - 0.5) > Math.abs(alpha[i] - 0.5)) edgeMoved++;
  }
}
assert.ok(flatHeld > 3000, `interior and outside should stay decisive, held ${flatHeld}`);
assert.ok(edgeMoved > 20, `guide edge should pull the matte, moved ${edgeMoved}`);

const width = 48;
const height = 48;
const rgba = new Uint8ClampedArray(width * height * 4);
const matte = new Float32Array(width * height);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const p = (y * width + x) * 4;
    const fg = x > 20;
    rgba[p] = fg ? 20 : 220;
    rgba[p + 1] = fg ? 180 : 30;
    rgba[p + 2] = fg ? 40 : 30;
    rgba[p + 3] = 255;
    if (x === 21 || x === 22) {
      rgba[p] = 160;
      rgba[p + 1] = 70;
      rgba[p + 2] = 32;
      matte[y * width + x] = 0.45;
    } else {
      matte[y * width + x] = fg ? 1 : 0;
    }
  }
}
decontaminate(rgba, matte, width, height);
const sample = (21 * 4) + (10 * width * 4);
assert.ok(rgba[sample + 1] > rgba[sample], `fringe should shift toward the green foreground, rgb ${rgba[sample]},${rgba[sample + 1]},${rgba[sample + 2]}`);
assert.ok(matte[10 * width + 21] < 0.45, 'background-colored fringe should lose alpha');

const photo = new Uint8ClampedArray(width * height * 4);
photo.fill(255);
const refined = refineAlpha(matte, photo, width, height);
assert.equal(refined.length, width * height);
assert.ok(refined.every(value => value >= 0 && value <= 1));

const hole = new Float32Array(40 * 40).fill(1);
for (let y = 0; y < 40; y++) hole[y * 40] = hole[y * 40 + 39] = 0;
for (let x = 0; x < 40; x++) hole[x] = hole[39 * 40 + x] = 0;
for (let y = 16; y < 22; y++) for (let x = 16; x < 22; x++) hole[y * 40 + x] = 0;
fillEnclosedHoles(hole, 40, 40, 1800);
assert.equal(hole[18 * 40 + 18], 1, 'enclosed hole is filled');
assert.equal(hole[0], 0, 'border background stays open');

console.log('refine tests passed');
