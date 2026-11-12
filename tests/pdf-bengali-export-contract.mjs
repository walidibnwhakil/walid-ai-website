import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync("tools/pdf-browser/studio.js", "utf8");
const html = fs.readFileSync("tools/pdf-browser/studio.html", "utf8");

assert.match(source, /embedPng\(/, "PDF overlay export must use a raster image path");
assert.match(source, /renderLabel\(ann\)/, "text and notes must be rendered through the browser canvas");
assert.doesNotMatch(source, /fontkit|registerFont|embedFont/,
  "this PR must not claim or attempt unverified embedded Bengali font export");
assert.match(html, /no Bengali font is embedded/, "the UI must document rasterized Bengali export");
console.log("PDF Bengali export contract passed: rasterized canvas overlay; no embedded-font claim");
