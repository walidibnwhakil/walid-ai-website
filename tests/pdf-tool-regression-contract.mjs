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
  assert.match(source, new RegExp(`function ${name}\\\\b`), `${name} must remain implemented`);
}

const contracts = [
  [/PDFDocument\.load\(/, "PDF tools must load an existing PDF"],
  [/copyPages\(/, "page organization must copy/reorder source pages"],
  [/removePage\(/, "page deletion must remove a selected page"],
  [/degrees\(/, "page rotation must be preserved in export"],
  [/embedJpg\(/, "compression must emit JPEG page images"],
  [/compressQuality/, "compression quality must remain user-selectable"],
  [/watermarkTile/, "watermark tiling option must remain wired"],
  [/signature: true/, "signature annotations must remain distinguishable"],
  [/protectMode/, "protect/unlock mode must remain user-selectable"],
  [/setPassword|encrypt|userPassword|ownerPassword/, "protect path must invoke PDF password protection"],
  [/doc\.addPage\(/, "image-to-PDF must create one page per image"],
  [/imagePageSize/, "image-to-PDF page sizing must remain configurable"],
  [/createWorker\(["']ben\\+eng["']/, "OCR must use Bengali plus English"],
  [/Math\.min\(10, state\.pages\.length\)/, "PDF OCR must keep its first-ten-page safety bound"],
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

console.log("PDF tool regression contract passed:", requiredFunctions.length, "functions;", contracts.length, "behavioral guards");
