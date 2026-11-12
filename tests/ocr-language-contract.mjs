import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync("tools/pdf-browser/studio.js", "utf8");
const fixture = JSON.parse(fs.readFileSync("tests/fixtures/bengali-mixed.json", "utf8"));

const workerCall = source.match(/createWorker\\(\\s*["']([^"']+)["']/);
assert.ok(workerCall, "runOcr must create a Tesseract worker");
assert.equal(
  workerCall[1],
  fixture.expectedLanguage,
  "OCR worker must load Bengali + English language data for mixed-script input"
);

assert.match(source, /worker\\.recognize\\(/, "OCR path must invoke recognition");
console.log("OCR language contract passed:", workerCall[1]);
