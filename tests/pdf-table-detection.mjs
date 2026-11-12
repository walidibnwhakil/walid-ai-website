import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync("tool-workspace.html", "utf8");
const clusterStart = source.indexOf("function clusterLines");
const ocrStart = source.indexOf("async function ocrPdfToDocx", clusterStart);
assert.ok(clusterStart >= 0 && ocrStart > clusterStart, "OCR grouping functions must remain in the workspace");
const functions = source.slice(clusterStart, ocrStart);
const detectBlocks = new Function(`${functions}; return detectBlocks;`)();

const word = (text, x0, y0, width = 18) => ({ text, bbox: { x0, y0, x1: x0 + width, y1: y0 + 16 } });
const certificateLike = [
  ["This", 80, 40], ["certificate", 125, 40], ["is", 205, 40], ["presented", 235, 40], ["to", 315, 40],
  ["for", 102, 78], ["successfully", 140, 78], ["completing", 235, 78], ["the", 335, 78], ["program", 370, 78],
  ["Authorized", 90, 116], ["signature", 190, 116], ["AIUB", 360, 116],
  ["Date", 120, 154], ["2026", 180, 154], ["Barcode", 410, 154]
].map(([text, x, y]) => word(text, x, y));

const testimonialBlocks = detectBlocks(certificateLike, 500);
assert.equal(testimonialBlocks.some(block => block.type === "table"), false, "certificate-like prose must not become a table");
assert.ok(testimonialBlocks.every(block => block.type === "paragraph"), "certificate-like OCR must remain editable paragraphs");

const tableWords = [
  ["Name", 80, 40], ["Score", 300, 40],
  ["A", 80, 80], ["90", 300, 80],
  ["B", 80, 120], ["85", 300, 120],
  ["C", 80, 160], ["88", 300, 160]
].map(([text, x, y]) => word(text, x, y));

const tableBlocks = detectBlocks(tableWords, 500);
assert.equal(tableBlocks.length, 1);
assert.equal(tableBlocks[0].type, "table", "strongly aligned rows and columns should become a table");
assert.deepEqual(tableBlocks[0].rows, [["Name", "Score"], ["A", "90"], ["B", "85"], ["C", "88"]]);
console.log("Conservative OCR table detection regression passed.");
