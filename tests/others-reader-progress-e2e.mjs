import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {extname} from "node:path";
import {chromium} from "playwright";

const root = new URL("../", import.meta.url);
const mime = {".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",
  ".png":"image/png",".ttf":"font/ttf",".svg":"image/svg+xml",".ico":"image/x-icon"};
const server = createServer(async (req, res) => {
  let pathname = new URL(req.url, "http://127.0.0.1").pathname;
  if (pathname.includes("..")) return void res.writeHead(404).end();
  if (pathname.endsWith("/")) pathname += "index.html";
  try {
    const contents = await readFile(new URL(pathname.slice(1), root));
    res.writeHead(200, {"content-type":mime[extname(pathname)] || "application/octet-stream"}).end(contents);
  } catch {
    res.writeHead(404).end("Not found");
  }
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const base = "http://127.0.0.1:" + server.address().port;
const route = "/others/islamic-literature/aladdin/";
const key = "walid-ai:others-reader:v1:" + route + ":";
let browser;
try {
  browser = await chromium.launch({headless:true});
  for (const width of [320, 375, 768, 1280]) {
    const context = await browser.newContext({viewport:{width, height:820}});
    const page = await context.newPage();
    const jsErrors = [];
    page.on("pageerror", e => jsErrors.push(e.message));
    await page.route("**/*", req => new URL(req.request().url()).origin === base ? req.continue() : req.abort());
    await page.goto(base + route, {waitUntil:"load"});
    assert.equal(await page.locator(".others-chapter-navigation").count(), 12, "Navigation on each chapter");
    assert.equal(await page.locator(".others-chapter-counter").count(), 12, "Chapter progress labels");
    assert.equal(await page.locator(".others-chapter-nav-link").count(), 22, "First/last chapters have one neighbor");
    assert.equal(await page.locator(".others-toc-bookmark-save").count(), 1, "Bookmark available in existing drawer");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), "No mobile overflow at "+width);
    assert.equal(await page.locator(".others-reading-progress").count(), 0, "Fresh device has no resume panel");
    await page.locator(".others-chapter-navigation").first().locator(".others-nav-next").click();
    assert.equal(new URL(page.url()).hash, "#chapter-2", "Next chapter link works");
    await page.evaluate(() => {
      const section = document.querySelector("#chapter-4");
      scrollTo({top: section.getBoundingClientRect().top + scrollY + 180, behavior: "instant"});
    });
    await page.waitForTimeout(1050);
    const progress = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), key + "progress");
    assert.equal(progress?.chapterId, "chapter-4", "Progress stores the actual reading chapter");
    assert.ok(progress.paragraphIndex >= 0 && progress.fraction >= 0, "Progress stores a paragraph offset");

    await page.locator(".others-toc-trigger").click();
    await page.locator(".others-toc-bookmark-save").click();
    const bookmark = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), key + "bookmark");
    assert.equal(bookmark?.chapterId, "chapter-4", "Drawer saves bookmark only to device");

    await page.reload({waitUntil:"load"});
    assert.equal(await page.locator(".others-reading-progress").count(), 1, "Saved position appears when reopening");
    assert.equal(await page.locator(".others-reading-resume-link").count(), 2, "Continue reading and bookmark links both available");
    await page.locator(".others-reading-resume-link").first().click();
    assert.equal(new URL(page.url()).hash, "#chapter-4", "Continue Reading resumes in saved chapter");
    assert.ok(await page.evaluate(() => scrollY > 0), "Continue Reading restores scroll position");

    await page.goto(base + "/others/folklore/ramayana/", {waitUntil:"load"});
    assert.equal(await page.locator(".others-reading-progress").count(), 0, "Bookmarks isolated per book");
    assert.equal(await page.evaluate(k => localStorage.getItem(k), "walid-ai:others-reader:v1:/others/folklore/ramayana/:bookmark"), null);
    assert.deepEqual(jsErrors, [], "No reader JavaScript errors at "+width);
    await context.close();
  }
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {get() {throw new DOMException("Storage blocked", "SecurityError");}});
  });
  const blocked = await context.newPage();
  await blocked.route("**/*", req => new URL(req.request().url()).origin === base ? req.continue() : req.abort());
  await blocked.goto(base + route, {waitUntil:"load"});
  assert.equal(await blocked.locator(".others-chapter-navigation").count(), 12, "Navigation works without local storage");
  await blocked.locator(".others-toc-trigger").click();
  await blocked.locator(".others-toc-bookmark-save").click();
  assert.match(await blocked.locator(".others-reader-toast").textContent(), /অনুমতি নেই/, "Storage failure is explained");
  await context.close();
  console.log("PASS: 30-book shared reader progress contract, device bookmarks, resume, responsive navigation, storage errors");
} finally {
  await browser?.close();
  server.close();
}
