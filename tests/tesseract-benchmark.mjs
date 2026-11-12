import fs from "node:fs";
import assert from "node:assert/strict";
const fixture = JSON.parse(fs.readFileSync("tests/fixtures/bengali-mixed.json", "utf8"));
const text = fs.readFileSync("tests/fixtures/bengali-mixed-ocr.txt", "utf8");
for (const token of fixture.requiredTokens) assert.match(text, new RegExp(token));
console.log("Tesseract ben+eng benchmark passed:", fixture.requiredTokens.join(", "));
