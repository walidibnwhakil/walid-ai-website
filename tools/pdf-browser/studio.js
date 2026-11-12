Warning: truncated output (original token count: 13485)
Total output lines: 1488

import { PDFDocument, degrees, rgb, BlendMode } from "https://cdn.jsdelivr.net/npm/@cantoo/pdf-lib@2.3.2/+esm";
import fontkit from "https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/+esm";
import * as pdfjs from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs";

pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";

…13285 tokens truncated…rk", applyWatermark],
  ["applyCompress", compressPdf],
  ["applyOcr", runOcr],
  ["applyImages", createImagePdf],
  ["placeSign", placeSignature],
  ["saveSign", () => saveEdited("-signed")],
  ["applyProtect", applyProtect]
]) {
  const button = $(id);
  button?.addEventListener("click", () => busy(button, job));
}
ensureFont().catch(() => setStatus("Noto Sans Bengali could not be loaded."));

