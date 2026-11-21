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
  let path = new URL(req.url, "http://127.0.0.1").pathname;
  if (path.includes("..")) return void res.writeHead(404).end();
  if (path.endsWith("/")) path += "index.html";
  try {
    const bytes = await readFile(new URL(path.slice(1), root));
    res.writeHead(200, {"content-type":mime[extname(path)] || "application/octet-stream"}).end(bytes);
  } catch {res.writeHead(404).end("Not found");}
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const base = "http://127.0.0.1:" + server.address().port;
const route = "/others/islamic-literature/aladdin/";
const key = "walid-ai:others-reader:v1:" + route + ":";

const reading = async (page) => page.evaluate(() => {
  const visible = [...document.querySelectorAll(".others-chapter")].filter(n => !n.hidden);
  const navigation = [...document.querySelectorAll(".others-chapter-navigation")].filter(n => !n.hidden);
  return {
    visibleIds: visible.map(n => n.id),
    words: visible.map(n => n.querySelectorAll("p")).flatMap(ps => [...ps].map(p => p.textContent))
      .join(" ").trim().split(/\s+/u).filter(Boolean).length,
    navCount: navigation.length,
    next: navigation[0]?.querySelector(".others-nav-next")?.getAttribute("href") || null,
    previous: navigation[0]?.querySelector(".others-nav-previous")?.getAttribute("href") || null
  };
});
let browser;
try {
  browser = await chromium.launch({headless:true});
  for (const width of [320, 375, 768, 1280]) {
    const context = await browser.newContext({viewport:{width, height:820}});
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.route("**/*", req => new URL(req.request().url()).origin === base ? req.continue() : req.abort());
    await page.goto(base + route, {waitUntil:"load"});
    assert.equal(await page.locator(".others-chapter").count(), 12, "All original chapters remain in HTML");
    assert.equal(await page.locator(".others-chapter-counter").count(), 12, "All chapter counters remain");
    assert.equal(await page.locator(".others-chapter-navigation").count(), 12, "Original per-chapter navigation wrappers remain");
    assert.equal(await page.locator(".others-toc-bookmark-save").count(), 1, "Bookmark available in drawer");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), "No horizontal overflow at "+width);
    assert.equal(await page.locator(".others-reading-progress:visible").count(), 0, "Fresh device has no saved panel");

    // Every visible reading part has sufficient complete prose, not a tiny chapter.
    const seen = new Set();
    let first = true;
    while (true) {
      const part = await reading(page);
      assert.equal(part.navCount, 1, "Only one bottom navigation appears per reading part");
      assert.ok(part.words >= 1100, "Reading part should have roughly five minutes of prose, got " + part.words);
      assert.ok(part.visibleIds.length >= 1 && part.visibleIds.length < 12,
        "Do not show the entire novel on one screen");
      assert.ok(part.visibleIds.every(id => !seen.has(id)), "Do not repeat a chapter in later parts");
      part.visibleIds.forEach(id => seen.add(id));
      if (first) assert.equal(part.previous, null, "No previous reading part on the first screen");
      first = false;
      if (!part.next) break;
      const nextId = part.next.slice(1);
      await page.locator(".others-chapter-navigation:not([hidden]) .others-nav-next").click();
      assert.equal(new URL(page.url()).hash, "#" + nextId, "Next shows the next substantial part");
      assert.ok((await reading(page)).visibleIds.includes(nextId), "Next part is visible");
    }
    assert.equal(seen.size, 12, "Every book chapter is reachable by Next");
    assert.equal((await reading(page)).next, null, "Last part has no Next link");
    await page.locator(".others-chapter-navigation:not([hidden]) .others-nav-previous").click();
    assert.equal((await reading(page)).navCount, 1, "Previous part visible");

    // Direct table-of-contents navigation should show only the target reading part.
    await page.locator(".others-toc-trigger").click();
    await page.locator('.others-toc a[href="#chapter-4"]').click();
    assert.ok((await reading(page)).visibleIds.includes("chapter-4"), "TOC selects chapter's reading part");
    assert.equal(new URL(page.url()).hash, "#chapter-4");
    const visible = (await reading(page)).visibleIds;
    await page.evaluate(() => {
      const chapter = [...document.querySelectorAll(".others-chapter")].find(n => !n.hidden);
      const paragraphs = chapter.querySelectorAll("p");
      const p = paragraphs[Math.min(2, paragraphs.length - 1)];
      scrollTo({top: scrollY + p.getBoundingClientRect().top + 65, behavior: "instant"});
    });
    await page.waitForTimeout(1000);
    const saved = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), key + "progress");
    assert.ok(visible.includes(saved?.chapterId), "Reading progress saves an actual visible chapter");

    // Save and remove immediately on the same mobile page, no refresh.
    await page.locator(".others-toc-trigger").click();
    await page.locator(".others-toc-bookmark-save").click();
    const mark = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), key + "bookmark");
    assert.ok(mark && visible.includes(mark.chapterId), "Bookmarked location is local to book");
    assert.equal(await page.locator(".others-reading-progress:visible").count(), 1,
      "New bookmark exposes its removal control immediately");
    assert.equal(await page.locator(".others-remove-bookmark:visible").count(), 1, "Remove control is visible");
    await page.locator(".others-remove-bookmark").click();
    assert.equal(await page.evaluate(k => localStorage.getItem(k), key + "bookmark"), null,
      "Remove works without reload");
    await page.locator(".others-toc-trigger").click();
    await page.locator(".others-toc-bookmark-save").click();

    await page.reload({waitUntil:"load"});
    assert.equal(await page.locator(".others-reading-resume-link").count(), 2,
      "Continue Reading and Bookmark resume links survive reload");
    const afterReload = await reading(page);
    assert.ok(afterReload.visibleIds.includes("chapter-4"), "Hash restores correct reading part");
    await page.locator(".others-reading-resume-link").first().click();
    assert.equal(new URL(page.url()).hash, "#" + saved.chapterId,
      "Continue Reading points to saved chapter");
    assert.ok(await page.evaluate(() => scrollY > 0), "Saved reading position restores scroll");
    await page.locator(".others-toc-trigger").click();
    await page.locator(".others-toc-bookmark-remove").click();
    assert.equal(await page.evaluate(k => localStorage.getItem(k), key + "bookmark"), null,
      "Bookmark removal also works in drawer");

    await page.goto(base + "/others/islamic-literature/alf-layla/", {waitUntil:"load"});
    assert.equal(await page.locator(".others-book-title p a").count(), 0,
      "Unnecessary inline fiction reference link rendered as plain text");
    await page.goto(base + "/others/history/ashab-al-kahf/", {waitUntil:"load"});
    assert.ok(await page.locator(".others-book-title p a").count() > 0,
      "Historical / Quran source link preserved");
    await page.goto(base + "/others/folklore/ramayana/", {waitUntil:"load"});
    assert.equal(await page.locator(".others-reading-progress:visible").count(), 0,
      "Progress and bookmarks are distinct for each book");
    assert.deepEqual(errors, [], "No JavaScript errors at width " + width);
    await context.close();
  }
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {throw new DOMException("Storage blocked", "SecurityError");}
    });
  });
  const blocked = await context.newPage();
  await blocked.route("**/*", req => new URL(req.request().url()).origin === base ? req.continue() : req.abort());
  await blocked.goto(base + route, {waitUntil:"load"});
  assert.equal((await reading(blocked)).navCount, 1, "Navigation must work when browser blocks storage");
  await blocked.locator(".others-toc-trigger").click();
  await blocked.locator(".others-toc-bookmark-save").click();
  assert.match(await blocked.locator(".others-reader-toast").textContent(), /অনুমতি নেই/,
    "Blocked storage shows a clear message");
  await context.close();
  console.log("PASS: substantive reading parts, mobile bookmark removal, resume, TOC, hyperlinks, responsive, storage-disabled");
} finally {
  await browser?.close();
  server.close();
}