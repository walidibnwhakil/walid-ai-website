import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import { chromium } from "playwright";
import JSZip from "jszip";

const root = new URL("../", import.meta.url);
const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname.slice(1) || "tools/image-to-word/index.html";
  try { const body = await readFile(new URL(path, root)); res.writeHead(200, {"content-type": path.endsWith(".js") ? "text/javascript" : "text/html"}); res.end(body); }
  catch { res.writeHead(404); res.end("not found"); }
});
server.listen(0, "127.0.0.1"); await once(server, "listening");
const port = server.address().port;
const browser = await chromium.launch({headless:true});
const context = await browser.newContext({acceptDownloads:true});
context.setDefaultTimeout(30000);
const page = await context.newPage();
await page.goto(`http://127.0.0.1:${port}/tools/image-to-word/index.html`);
const frame = page.frameLocator('iframe[title="Image to Word tool"]');
const image = await page.evaluate(async () => {
  const canvas = document.createElement("canvas"); canvas.width = 1400; canvas.height = 260;
  const c = canvas.getContext("2d"); c.fillStyle = "white"; c.fillRect(0,0,1400,260);
  c.fillStyle = "black"; c.font = "54px Arial"; c.fillText("Editable Word OCR Walid AI 2026", 40, 100);
  c.font = "48px serif"; c.fillText("বাংলা লেখা সম্পাদনাযোগ্য", 40, 180);
  return [...new Uint8Array(await new Promise(resolve => canvas.toBlob(async b => resolve(await b.arrayBuffer()), "image/png")))];
});
await frame.locator("#imageFile").setInputFiles({name:"bengali-mixed.png",mimeType:"image/png",buffer:Buffer.from(image)});
await frame.locator("#runImage").click();
await frame.locator("#imageDownload").waitFor({state:"visible"});
const downloadEvent = page.waitForEvent("download");
await frame.locator("#imageDownload").click();
const download = await downloadEvent; const path = await download.path(); assert.ok(path);
const zip = await JSZip.loadAsync(await readFile(path));
const xml = await zip.file("word/document.xml").async("string");
const text = [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(m => m[1]).join("");
assert.match(text, /Editable Word OCR/, "DOCX must contain English editable text");
assert.match(text, /বাংলা/, "DOCX must contain Bengali editable text");
assert.doesNotMatch(xml, /<w:drawing|<w:pict/, "DOCX must not be an image-only export");
await browser.close(); await new Promise(resolve => server.close(resolve));
console.log("Image to Word browser E2E passed: valid DOCX ZIP/XML with Bengali and English text");
