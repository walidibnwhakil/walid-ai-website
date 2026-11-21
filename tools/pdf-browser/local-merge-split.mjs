/*
 * Walid AI PDF tools — free, local merge and split.
 * PDF bytes stay in the browser. Never report success without validating output.
 */
export const PDF_PROCESSING_LIMIT_BYTES = 20 * 1024 * 1024;

export function parsePdfPageRanges(value, total) {
  const text = String(value || "").trim();
  if (!text) throw new Error("Choose at least one page to extract.");
  if (!Number.isSafeInteger(total) || total < 1) throw new Error("The PDF has no pages.");
  const pages = [], seen = new Set();
  for (const raw of text.split(",")) {
    const part = raw.trim(), match = /^([0-9]+)(?:\s*-\s*([0-9]+))?$/.exec(part);
    if (!match) throw new Error("Use valid page numbers, for example 1-3,5.");
    const start = Number(match[1]), end = Number(match[2] || match[1]);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
        start < 1 || end < start || end > total) {
      throw new Error("The selected pages must be between 1 and " + total + ", in ascending order.");
    }
    for (let i = start; i <= end; i++) {
      if (!seen.has(i)) { seen.add(i); pages.push(i - 1); }
    }
  }
  if (!pages.length) throw new Error("Choose at least one page to extract.");
  return pages;
}

function hasPdfHeader(bytes) {
  if (bytes.byteLength < 8) return false;
  // PDF readers permit a small prefix before the %PDF- marker.
  return new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(1024,bytes.length))).includes("%PDF-");
}

export async function processLocalPdf(tool, files, pageRanges = "", loader) {
  if (tool !== "merge-pdf" && tool !== "split-pdf") throw new Error("Unsupported PDF operation.");
  if (!Array.isArray(files) || !files.length) throw new Error("Choose a PDF file first.");
  if (tool === "merge-pdf" && files.length < 2) throw new Error("Choose at least two PDF files to merge.");
  if (tool === "split-pdf" && files.length !== 1) throw new Error("Choose one PDF file to split.");
  if (files.some(file => !file || typeof file.arrayBuffer !== "function" || !Number.isFinite(file.size) || file.size < 1)) {
    throw new Error("One or more selected files are empty or cannot be read.");
  }
  if (files.reduce((sum, file) => sum + file.size, 0) > PDF_PROCESSING_LIMIT_BYTES) {
    throw new Error("The total file size must be under 20 MB.");
  }

  let PDFDocument;
  try {
    ({PDFDocument} = await (loader ? loader() : import("https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm")));
  } catch {
    throw new Error("The PDF processing library could not load. Check your connection and retry.");
  }
  if (!PDFDocument) throw new Error("The PDF processing library is unavailable.");

  const loadFile = async file => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasPdfHeader(bytes)) throw new Error(file.name + " is not a valid PDF file.");
    let pdf;
    try {
      pdf = await PDFDocument.load(bytes);
    } catch {
      throw new Error("Could not open " + file.name + ". It may be damaged or password-protected.");
    }
    if (!pdf.getPageCount()) throw new Error(file.name + " has no pages.");
    return pdf;
  };

  const output = await PDFDocument.create();
  let expectedPages = 0;
  if (tool === "merge-pdf") {
    for (const file of files) {
      const source = await loadFile(file);
      const pages = await output.copyPages(source, source.getPageIndices());
      for (const page of pages) output.addPage(page);
      expectedPages += pages.length;
    }
  } else {
    const source = await loadFile(files[0]);
    const indexes = parsePdfPageRanges(pageRanges, source.getPageCount());
    const pages = await output.copyPages(source, indexes);
    for (const page of pages) output.addPage(page);
    expectedPages = indexes.length;
  }

  if (!expectedPages) throw new Error("No pages were selected. Nothing was downloaded.");
  let bytes;
  try {
    bytes = await output.save();
    if (!hasPdfHeader(bytes)) throw new Error("Invalid PDF bytes.");
    const verified = await PDFDocument.load(bytes);
    if (verified.getPageCount() !== expectedPages) throw new Error("The exported PDF has an incorrect page count.");
  } catch {
    throw new Error("The exported PDF failed verification. Please try again.");
  }
  return {bytes, name: tool === "merge-pdf" ? "merged.pdf" : "split.pdf",
    type: "application/pdf", pages: expectedPages};
}
