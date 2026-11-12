import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import { chromium } from "playwright";
import JSZip from "jszip";

const root = new URL("../", import.meta.url);
const text = "বাংলা লেখা সম্পাদনাযোগ্য — Walid AI 2026";
const zip = new JSZip();
zip.file("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
zip.file("_rels/.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
zip.file("word/document.xml", '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>'+text+'</w:t></w:r></w:p></w:body></w:document>');
const docxBytes = await zip.generateAsync({ type: "nodebuffer" });

let phase = "startup";
let browser;
let context;
let server;
let watchdog;
let cleaning = false;
async function cleanup() {
  if (cleaning) return;
  cleaning = true;
  clearTimeout(watchdog);
  await Promise.allSettled([
    context?.close(),
    browser?.close(),
    new Promise((resolve) => server?.close(() => resolve()))
  ]);
}
function failWatchdog() {
  const error = new Error("PDF browser E2E timed out after 120s; last phase: " + phase);
  console.error(error.message);
  cleanup().finally(() => process.exitCode = 124);
}
watchdog = setTimeout(failWatchdog, 120000);
process.once("SIGTERM", () => { cleanup().finally(() => process.exit(143)); });
process.once("SIGINT", () => { cleanup().finally(() => process.exit(130)); });
function mark(name) {
  phase = name;
  console.log("[pdf-e2e]", name);
}
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(label + " timed out after " + ms + "ms")), ms))
  ]);
}

server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (req.method === "POST" && url.pathname === "/api/tools/pdf-to-word") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ file: docxBytes.toString("base64"), type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", name: "bengali-editable.docx" }));
    return;
  }
  const file = url.pathname === "/" ? "tools/pdf-browser/studio.html" : url.pathname.slice(1);
  try { const body = await readFile(new URL(file, root)); res.writeHead(200, { "content-type": file.endsWith(".js") ? "text/javascript" : file.endsWith(".html") ? "text/html" : "application/octet-stream" }); res.end(body); }
  catch { res.writeHead(404); res.end("not found"); }
});
server.listen(0, "127.0.0.1"); await withTimeout(once(server, "listening"), 10000, "server startup");
const port = server.address().port;
 browser = await withTimeout(chromium.launch({ headless: true }), 20000, "browser launch");
context = await browser.newContext({ acceptDownloads: true });
context.setDefaultTimeout(15000);
context.setDefaultNavigationTimeout(15000);
const errors = [];
context.on("page", (p) => p.on("pageerror", (e) => errors.push(String(e))));

async function pdfFixture(page, count, bengali = false) {
  return page.evaluate(async ({ count: n, bengali }) => {
    const { PDFDocument, rgb } = await import("https://cdn.jsdelivr.net/npm/@cantoo/pdf-lib@2.3.2/+esm");
    const doc = await PDFDocument.create();
    let font;
    if (bengali) { await import("https://cdn.jsdelivr.net/npm/regenerator-runtime@0.14.1/runtime.min.js"); const bytes = new Uint8Array(await (await fetch("/fonts/NotoSansBengali-Regular.ttf")).arrayBuffer()); const fontkit = await import("https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/+esm"); doc.registerFontkit(fontkit.default || fontkit); font = await doc.embedFont(bytes, { subset: true }); }
    for (let i = 0; i < n; i++) { const p = doc.addPage([595, 842]); p.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(.9 - i * .05, .95, .92) }); p.drawText(bengali ? "বাংলা লেখা সম্পাদনাযোগ্য" : "fixture page " + (i + 1), { x: 40, y: 760, size: 24, ...(font ? { font } : {}) }); }
    return Array.from(await doc.save());
  }, { count, bengali });
}
async function inspect(bytes) {
  const page = await context.newPage();
  return page.evaluate(async (b) => { const { PDFDocument } = await import("https://cdn.jsdelivr.net/npm/@cantoo/pdf-lib@2.3.2/+esm"); const d = await PDFDocument.load(new Uint8Array(b)); return d.getPages().map((p) => [p.getWidth(), p.getHeight(), p.getRotation().angle]); }, [...bytes]);
}
async function download(page, selector) {
  const event = page.waitForEvent("download"); await page.locator(selector).click(); const d = await event; const path = await d.path(); assert.ok(path); return readFile(path);
}
async function studio(tool, page) { mark("open " + tool + " studio"); await page.goto("http://127.0.0.1:" + port + "/tools/pdf-browser/studio.html?tool=" + tool, { waitUntil: "domcontentloaded", timeout: 15000 }); }

const edit = await context.newPage(); await studio("edit", edit); mark("edit fixture");
const input = await withTimeout(pdfFixture(edit, 3), 30000, "edit PDF fixture");
await edit.setInputFiles("#file", { name: "three-pages.pdf", mimeType: "application/pdf", buffer: Buffer.from(input) });
await edit.locator("#panelEdit").waitFor({ state: "visible" });
await edit.waitForFunction(() => document.querySelector("#pageLabel")?.textContent.includes("1 / 3"));
await edit.locator("#rotateRight").click();
await edit.waitForFunction(() => { const c = document.querySelector("#pageCanvas"); return c && c.width > c.height; });
await edit.locator("#pageNext").click();
await edit.waitForFunction(() => document.querySelector("#pageLabel")?.textContent.includes("2 / 3"));
await edit.locator("#deletePage").click();
await edit.waitForFunction(() => document.querySelector("#pageLabel")?.textContent.includes("2 / 2")); await edit.locator("#saveEdit").click();
await edit.waitForFunction(() => document.querySelector("#status")?.textContent.startsWith("Done."));
const edited = await download(edit, "#download"); assert.equal(edited[0], 37);
const pages = await withTimeout(inspect(edited), 15000, "edited PDF inspection"); assert.equal(pages.length, 2); assert.deepEqual(pages[0], [595, 842, 90]);

const compress = await context.newPage(); await studio("compress", compress); mark("compress fixture");
const compressInput = await withTimeout(pdfFixture(compress, 2), 30000, "compress PDF fixture");
await compress.setInputFiles("#file", { name: "compress-me.pdf", mimeType: "application/pdf", buffer: Buffer.from(compressInput) });
await compress.locator("#panelCompress").waitFor({ state: "visible" });
await compress.waitForFunction(() => document.querySelector("#status")?.textContent.includes("2 pages ready"));
await compress.locator("#applyCompress").click();
await compress.waitForFunction(() => document.querySelector("#status")?.textContent.includes("Download"));
const compressed = await download(compress, "#download"); assert.equal(compressed[0], 37); assert.equal((await withTimeout(inspect(compressed), 15000, "compressed PDF inspection")).length, 2);

const word = await context.newPage();
mark("open pdf-to-word");
await word.goto("http://127.0.0.1:" + port + "/tools/pdf-to-word/index.html", { waitUntil: "domcontentloaded", timeout: 15000 });
const frame = word.frameLocator('iframe[title="PDF to Word tool"]');
mark("build Bengali PDF fixture"); const wordInput = await withTimeout(pdfFixture(word, 1, true), 30000, "Bengali PDF fixture");
await frame.locator("#pdfFiles").setInputFiles({ name: "bengali-source.pdf", mimeType: "application/pdf", buffer: Buffer.from(wordInput) });
mark("convert PDF to DOCX"); await frame.locator("#runPdf").click(); await frame.locator("#pdfDownload").waitFor({ state: "visible", timeout: 30000 });
mark("download DOCX"); const wordEvent = word.waitForEvent("download", { timeout: 15000 });
await frame.locator("#pdfDownload").click();
const wordDownload = await wordEvent;
const wordPath = await wordDownload.path();
assert.ok(wordPath, "DOCX download path should be available");
const wordBytes = await readFile(wordPath);
const doc = await JSZip.loadAsync(wordBytes); const xml = await doc.file("word/document.xml").async("string");
const textNodes = [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join("");
assert.match(textNodes, /বাংলা/, "DOCX must contain Bengali in editable Word text nodes");
assert.match(xml, /<w:drawing|<w:pict/, "PDF page visuals must be preserved as a drawing");
const mediaNames = Object.keys(doc.files).filter((name) => /^word\\/media\\/.*\\.png$/i.test(name));
assert.ok(mediaNames.length >= 1, "DOCX must contain PNG page media");
const mediaBytes = await doc.file(mediaNames[0]).async("nodebuffer");
assert.deepEqual([...mediaBytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], "page media must have a PNG signature");
const rels = await doc.file("word/_rels/document.xml.rels").async("string");
assert.match(rels, /relationships\\/image/, "DOCX must relate the page drawing to image media");
const types = await doc.file("[Content_Types].xml").async("string");
assert.match(types, /Extension="png" ContentType="image\\/png"/, "DOCX must declare PNG content");

console.log("PDF browser E2E passed: delete/rotation, compression, and editable Bengali DOCX"); await cleanup();
