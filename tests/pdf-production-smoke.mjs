import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { chromium } from "playwright";

const base = process.env.PDF_SMOKE_BASE_URL || "https://walid-ai.com";
const out = join(process.cwd(), "test-results", "pdf-production-smoke");
await mkdir(out, { recursive: true });
let phase = "startup";
let browser;
let context;
const results = [];
const mark = (name) => { phase = name; console.log("[production-pdf-smoke]", name); };
const record = (name, status, detail = "") => {
  results.push({ name, status, detail });
  console.log(`[production-pdf-smoke] ${status} ${name}${detail ? " — " + detail : ""}`);
};
const withTimeout = (p, ms, label) => Promise.race([p, new Promise((_, reject) => setTimeout(() => reject(new Error(label + " timed out after " + ms + "ms")), ms))]);
async function cleanup() {
  await Promise.allSettled([context?.close(), browser?.close()]);
}
async function fixturePdf({ pages = 2, bengali = false } = {}) {
  const d = await PDFDocument.create();
  const font = await d.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) {
    const p = d.addPage([595, 842]);
    p.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(.88, .94, .98) });
    p.drawText(bengali ? "Bengali fixture / বাংলা" : "English fixture page " + (i + 1), { x: 40, y: 760, size: 24, font });
  }
  return Buffer.from(await d.save());
}
async function inspectPdf(bytes) {
  const d = await PDFDocument.load(bytes);
  return d.getPages().map(p => ({ width: p.getWidth(), height: p.getHeight(), rotation: p.getRotation().angle }));
}
async function download(page, locator) {
  const event = page.waitForEvent("download", { timeout: 30000 });
  await locator.click();
  const d = await event;
  const path = await d.path();
  assert.ok(path, "download path must exist");
  return readFile(path);
}
async function openTool(page, path) {
  await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
}
async function maybeFrame(page) {
  return page.frames().find(f => f !== page.mainFrame() && f.url() !== "about:blank") || page.mainFrame();
}
async function probe(name, fn) {
  mark(name);
  try { await withTimeout(fn(), 90000, name); record(name, "PASS"); }
  catch (e) { record(name, "FAIL", e.stack || String(e)); await writeFile(join(out, name.replace(/[^a-z0-9]+/gi, "-") + ".txt"), e.stack || String(e)); }
}

try {
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ acceptDownloads: true, recordHar: { path: join(out, "network.har") } });
  context.setDefaultTimeout(20000);
  const pageErrors = [];
  context.on("page", p => p.on("pageerror", e => pageErrors.push(String(e))));

  await probe("production-site-load", async () => {
    const p = await context.newPage();
    const response = await p.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
    assert.ok(response && response.ok(), "production home must return 2xx");
    assert.match(await p.title(), /Walid|AI/i);
  });

  await probe("editor-delete-rotate-save-reopen", async () => {
    const p = await context.newPage();
    await openTool(p, "/tools/pdf-browser/studio.html?tool=edit");
    await p.locator("#file").setInputFiles({ name: "three-pages.pdf", mimeType: "application/pdf", buffer: await fixturePdf({ pages: 3 }) });
    await p.locator("#panelEdit").waitFor({ state: "visible" });
    await p.waitForFunction(() => /1\\s*\\/\\s*3/.test(document.querySelector("#pageLabel")?.textContent || ""));
    await p.locator("#rotateRight").click();
    await p.locator("#pageNext").click();
    await p.locator("#deletePage").click();
    await p.waitForFunction(() => /2\\s*\\/\\s*2/.test(document.querySelector("#pageLabel")?.textContent || ""));
    await p.locator("#saveEdit").click();
    await p.waitForFunction(() => /^Done\\./.test(document.querySelector("#status")?.textContent || ""));
    const bytes = await download(p, p.locator("#download"));
    const pages = await inspectPdf(bytes);
    assert.equal(pages.length, 2);
    assert.equal(pages[0].rotation, 90);
  });

  await probe("compress-download-inspect", async () => {
    const p = await context.newPage();
    await openTool(p, "/tools/pdf-browser/studio.html?tool=compress");
    await p.locator("#file").setInputFiles({ name: "compress.pdf", mimeType: "application/pdf", buffer: await fixturePdf() });
    await p.locator("#panelCompress").waitFor({ state: "visible" });
    await p.locator("#applyCompress").click();
    await p.waitForFunction(() => /Download/i.test(document.querySelector("#status")?.textContent || ""));
    const bytes = await download(p, p.locator("#download"));
    assert.equal((await inspectPdf(bytes)).length, 2);
  });

  await probe("pdf-to-docx-editable-bengali", async () => {
    const p = await context.newPage();
    await openTool(p, "/tools/pdf-to-word/index.html");
    const f = await maybeFrame(p);
    await f.locator("#pdfFiles").setInputFiles({ name: "bengali.pdf", mimeType: "application/pdf", buffer: await fixturePdf({ pages: 1, bengali: true }) });
    await f.locator("#runPdf").click();
    await f.locator("#pdfDownload").waitFor({ state: "visible", timeout: 60000 });
    const bytes = await download(p, f.locator("#pdfDownload"));
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file("word/document.xml").async("string");
    const text = [...xml.matchAll(/<w:t[^>]*>([\\s\\S]*?)<\\/w:t>/g)].map(m => m[1]).join("");
    assert.match(text, /বাংলা|Bengali/);
    assert.doesNotMatch(xml, /<w:drawing|<w:pict/);
  });

  await probe("image-to-docx-production", async () => {
    const p = await context.newPage();
    await openTool(p, "/tools/image-to-word/index.html");
    const f = await maybeFrame(p);
    const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300"><rect width="100%" height="100%" fill="white"/><text x="20" y="100" font-size="48">বাংলা OCR fixture</text></svg>`);
    const input = f.locator('input[type="file"]').first();
    await input.setInputFiles({ name: "bengali.svg", mimeType: "image/svg+xml", buffer: svg });
    const button = f.getByRole("button", { name: /convert|word|process|start/i }).first();
    await button.click();
    const dl = f.locator('a[download], button').filter({ hasText: /download/i }).first();
    await dl.waitFor({ state: "visible", timeout: 60000 });
    const bytes = await download(p, dl);
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file("word/document.xml").async("string");
    assert.ok(/<w:t/.test(xml), "DOCX must contain editable text nodes");
  });

  await probe("bengali-ocr-production", async () => {
    const p = await context.newPage();
    await openTool(p, "/tools/bengali-ocr/index.html");
    const f = await maybeFrame(p);
    const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300"><rect width="100%" height="100%" fill="white"/><text x="20" y="100" font-size="48">বাংলা লেখা</text></svg>`);
    await f.locator('input[type="file"]').first().setInputFiles({ name: "bengali.svg", mimeType: "image/svg+xml", buffer: svg });
    await f.getByRole("button", { name: /ocr|recognize|process|start/i }).first().click();
    await f.getByText(/বাংলা/).waitFor({ state: "visible", timeout: 60000 });
  });

  await probe("bengali-font-http", async () => {
    const r = await context.request.get(base + "/fonts/NotoSansBengali-Regular.ttf");
    assert.equal(r.status(), 200);
    assert.match(r.headers()["content-type"] || "", /font|octet-stream/i);
    assert.ok((await r.body()).length > 10000);
  });

  if (pageErrors.length) await writeFile(join(out, "page-errors.txt"), pageErrors.join("\n"));
} finally {
  await writeFile(join(out, "results.json"), JSON.stringify({ base, phase, results }, null, 2));
  await cleanup();
}
if (results.some(r => r.status === "FAIL")) process.exitCode = 1;
