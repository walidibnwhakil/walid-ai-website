import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync("tools/pdf-browser/studio.js", "utf8");
const html = fs.readFileSync("tools/pdf-browser/studio.html", "utf8");

assert.match(source, /createWorker\(\"ben\+eng\"/, "the browser OCR path must use ben+eng");
assert.match(source, /worker\.recognize\(/, "the browser OCR path must invoke recognition");
assert.match(source, /embedFont|registerFontkit/, "selectable Bengali font export must be implemented");
assert.match(source, /embedPng\(/, "raster image export must remain available as fallback");
assert.match(source, /Selectable Bengali export unavailable; using raster fallback/, "font failures must keep the raster fallback");
assert.match(source, /NotoSansBengali-Regular\.ttf/, "the licensed Bengali font asset must be referenced");
assert.match(html, /Bengali.*selectable|selectable.*Bengali/i, "the UI must describe selectable Bengali export");
console.log("PDF Bengali export contract passed: selectable font path plus raster fallback");
