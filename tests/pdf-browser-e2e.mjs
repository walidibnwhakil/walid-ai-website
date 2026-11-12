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

const server = createServer(async (req, res) => {
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
server.listen(0, "127.0.0.1"); await once(server, "listening");
const port = server.address().port;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ acceptDownloads: true });
const errors = [];
context.on("page", (p) => p.on("pageerror", (e) => errors.push(String(e))));

async function pdfFixture(page, count, bengali = false) {
  return page.evaluate(async ({ count: n, bengali }) => {
    const { PDFDocument, rgb } = await import("https://cdn.jsdelivr.net/npm/@cantoo/pdf-lib@2.3.2/+esm");
    const doc = await PDFDocument.create();
    let font;
    if (bengali) { const bytes = new Uint8Array(await (await fetch("/fonts/NotoSansBengali-Regular.ttf")).arrayBuffer()); const fontkit = await import("https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/+esm"); doc.registerFontkit(fontkit.default || fontkit); font = await doc.embedFont(bytes, { subset: true }); }
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
async function studio(tool, page) { await page.goto("http://127.0.0.1:" + port + "/tools/pdf-browser/studio.html?tool=" + tool, { waitUntil: "networkidle" }); }

const edit = await context.newPage(); await studio("edit", edit);
const input = await pdfFixture(edit, 3);
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
const pages = await inspect(edited); assert.equal(pages.length, 2); assert.deepEqual(pages[0], [595, 842, 90]);

const compress = await context.newPage(); await studio("compress", compress);
const compressInput = await pdfFixture(compress, 2);
await compress.setInputFiles("#file", { name: "compress-me.pdf", mimeType: "application/pdf", buffer: Buffer.from(compressInput) });
await compress.locator("#panelCompress").waitFor({ state: "visible" });
await compress.waitForFunction(() => document.querySelector("#status")?.textContent.includes("2 pages ready"));
await compress.locator("#applyCompress").click();
await compress.waitForFunction(() => document.querySelector("#status")?.textContent.includes("Download"));
const compressed = await download(compress, "#download"); assert.equal(compressed[0], 37); assert.equal((await inspect(compressed)).length, 2);

const word = await context.newPage();
await word.goto("http://127.0.0.1:" + port + "/tools/pdf-to-word/index.html", { waitUntil: "networkidle" });
const frame = word.frameLocator('iframe[title="PDF to Word tool"]');
const wordInput = await pdfFixture(word, 1, true);
await frame.locator("#pdfFiles").setInputFiles({ name: "bengali-source.pdf", mimeType: "application/pdf", buffer: Buffer.from(wordInput) });
await frame.locator("#runPdf").click(); await frame.locator("#pdfDownload").waitFor({ state: "visible" });
const wordEvent = word.waitForEvent("download");
await frame.locator("#pdfDownload").click();
const wordDownload = await wordEvent;
const wordPath = await wordDownload.path();
assert.ok(wordPath, "DOCX download path should be available");
const wordBytes = await readFile(wordPath);
const doc = await JSZip.loadAsync(wordBytes); const xml = await doc.file("word/document.xml").async("string");
const textNodes = [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join("");
assert.match(textNodes, /বাংলা/, "DOCX must contain Bengali in editable Word text nodes");
assert.doesNotMatch(xml, /<w:drawing|<w:pict/, "Bengali must not be an embedded screenshot");
console.log("PDF browser E2E passed: delete/rotation, compression, and editable Bengali DOCX");
