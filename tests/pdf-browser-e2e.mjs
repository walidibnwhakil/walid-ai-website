import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { chromium } from "playwright";

const root = new URL("../", import.meta.url);
const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  const file = path === "/" ? "tools/pdf-browser/studio.html" : path.slice(1);
  try {
    const body = await readFile(new URL(file, root));
    res.writeHead(200, { "content-type": file.endsWith(".js") ? "text/javascript" : file.endsWith(".html") ? "text/html" : "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end("not found"); }
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const port = server.address().port;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ acceptDownloads: true });
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));
await page.goto(`http://127.0.0.1:${port}/tools/pdf-browser/studio.html?tool=edit`, { waitUntil: "networkidle" });
const pdfBytes = await page.evaluate(async () => {
  const { PDFDocument } = await import("https://cdn.jsdelivr.net/npm/@cantoo/pdf-lib@2.3.2/+esm");
  const doc = await PDFDocument.create();
  doc.addPage([595, 842]);
  return Array.from(await doc.save());
});
await page.setInputFiles("#file", { name: "fixture.pdf", mimeType: "application/pdf", buffer: Buffer.from(pdfBytes) });
await page.locator("#panelEdit").waitFor({ state: "visible" });
await page.locator("#stage").waitFor({ state: "visible" });
await page.locator('[data-edit="text"]').click();
await page.evaluate(() => { const overlay = document.querySelector("#overlay"); overlay.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100, pointerId: 1 })); });
await page.locator(".ann.selected").fill("বাংলা OCR test — Walid AI 2026");
await page.locator("#saveEdit").click();
await page.waitForFunction(() => document.querySelector("#status")?.textContent.startsWith("Done."), null, { timeout: 30000 });
const href = await page.locator("#download").getAttribute("href");
assert.match(href || "", /^blob:/, "the edited PDF must download");
const savedBytes = await page.evaluate(async () => Array.from(await (await fetch(document.querySelector("#download").href)).arrayBuffer()));
const reopened = await browser.newPage();
await reopened.goto(`http://127.0.0.1:${port}/tools/pdf-browser/studio.html?tool=edit`);
await reopened.setInputFiles("#file", { name: "roundtrip.pdf", mimeType: "application/pdf", buffer: Buffer.from(savedBytes) });
await reopened.locator("#stage").waitFor({ state: "visible" });
assert.equal(await reopened.locator("#stage").isVisible(), true);
assert.equal(errors.length, 0, errors.join("\n"));
await browser.close();
server.close();
console.log("PDF browser E2E passed: Bengali edit download and reopen");
