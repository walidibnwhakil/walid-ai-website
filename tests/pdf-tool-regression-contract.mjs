import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync("tools/pdf-browser/studio.js", "utf8");
const html = fs.readFileSync("tools/pdf-browser/studio.html", "utf8");

const requiredFunctions = [
  "saveEdited",
  "compressPdf",
  "createImagePdf",
  "applyWatermark",
  "placeSignature",
  "applyProtect",
  "runOcr",
  "acceptImages",
  "retargetPage"
];
for (const name of requiredFunctions) {
  assert.ok(source.includes(`function ${name}`), `${name} must remain implemented`);
}

const deleteImplementation = source.match(/async function deleteCurrentPage\(\) \{([\s\S]*?)\n\}/);
assert.ok(deleteImplementation, "page deletion must expose deleteCurrentPage");
assert.match(deleteImplementation[1], /state\.pages\.length < 2/, "page deletion must keep at least one page");
assert.match(deleteImplementation[1], /state\.pages\.splice\(state\.index, 1\)/, "page deletion must remove the selected page from state");
assert.match(deleteImplementation[1], /state\.index = Math\.min\(state\.index, state\.pages\.length - 1\)/, "page deletion must clamp the selected index");
assert.match(source, /\$\("deletePage"\)\.addEventListener\("click", deleteCurrentPage\)/, "the delete button must invoke deleteCurrentPage");

const contracts = [
  [/PDFDocument\.load\(/, "PDF tools must load an existing PDF"],
  [/copyPages\(/, "page organization must copy/reorder source pages"],
  [/degrees\(/, "page rotation must be preserved in export"],
  [/embedJpg\(/, "compression must emit JPEG page images"],
  [/compressQuality/, "compression quality must remain user-selectable"],
  [/watermarkTile/, "watermark tiling option must remain wired"],
  [/signature: true/, "signature annotations must remain distinguishable"],
  [/protectMode/, "protect/unlock mode must remain user-selectable"],
  [/setPassword|encrypt|userPassword|ownerPassword/, "protect path must invoke PDF password protection"],
  [/doc\.addPage\(/, "image-to-PDF must create one page per image"],
  [/imagePageSize/, "image-to-PDF page sizing must remain configurable"],
  [/createWorker\(["']ben\+eng["']/, "OCR must use Bengali plus English"],
  [/Math\.min\(state\.pages\.length, 10\)/, "PDF OCR must keep its first-ten-page safety bound"],
  [/prepareOcrCanvas/, "OCR must preprocess rendered pages/images before recognition"],
  [/embedPng\(/, "raster fallback must remain available for annotations"]
];
for (const [pattern, message] of contracts) assert.match(source, pattern, message);

for (const id of [
  "saveOrganize",
  "applyCompress",
  "applyWatermark",
  "placeSign",
  "applyProtect",
  "addImages",
  "applyImages",
  "applyOcr"
]) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `${id} must remain exposed in the PDF UI`);
}

console.log("PDF tool regression contract passed:", requiredFunctions.length, "functions;", contracts.length, "behavioral guards plus delete implementation checks");
