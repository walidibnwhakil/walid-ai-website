import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {chromium} from "playwright";

const root = new URL("../", import.meta.url);
const media = {".html":"text/html; charset=utf-8",".css":"text/css",
  ".js":"text/javascript", ".png":"image/png", ".ttf":"font/ttf", ".ico":"image/x-icon"};
const server = createServer(async (req, res) => {
  let pathname = new URL(req.url, "http://127.0.0.1").pathname;
  if (pathname.endsWith("/")) pathname += "index.html";
  if (pathname.includes("..")) { res.writeHead(404).end(); return; }
  const path = pathname.slice(1);
  try {
    const bytes = await readFile(new URL(path, root));
    res.writeHead(200, {"content-type":media[path.match(/\.[^.]+$/)?.[0]] || "application/octet-stream"});
    res.end(bytes);
  } catch { res.writeHead(404).end("Not found"); }
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const origin = "http://127.0.0.1:" + server.address().port;
const widths = [320, 375, 768, 1280];
let browser;
try {
  browser = await chromium.launch({headless:true});
  for (const width of widths) {
    const page = await browser.newPage({viewport:{width,height:840},deviceScaleFactor:1});
    await page.route("**/*", route =>
      new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const response = await page.goto(origin + "/others/history/roman-empire/", {waitUntil:"load"});
    assert.equal(response.status(), 200, "Roman book must respond HTTP 200");
    await page.evaluate(() => document.fonts.ready);
    const state = await page.evaluate(() => {
      const sections = [...document.querySelectorAll(".others-chapter[id]")];
      const toc = [...document.querySelectorAll('.others-toc a[href^="#chapter-"]')];
      return {
        width:document.documentElement.scrollWidth,
        viewport:innerWidth,
        title:document.querySelector("h1")?.textContent?.trim(),
        ids:sections.map(section => section.id),
        tocIds:toc.map(link => link.getAttribute("href").slice(1)),
        paragraphCounts:sections.map(section => section.querySelectorAll("p").length),
        footerCount:document.querySelectorAll("footer.legal-footer").length,
        logoLoaded:document.querySelector(".others-brand img")?.naturalWidth > 0,
        flower:getComputedStyle(document.body, "::before").backgroundImage.includes("walid-ai-approved-flower"),
        font:getComputedStyle(document.body).fontFamily,
        canonical:document.querySelector('link[rel="canonical"]')?.href,
        obsoleteBlocks:document.querySelectorAll(".others-sources,.others-next").length,
        trigger:!!document.querySelector(".others-toc-trigger"),
      };
    });
    const ids = Array.from({length:25}, (_,i) => "chapter-" + (i+1));
    assert.equal(state.title, "রোমান সাম্রাজ্যের ইতিহাস");
    assert.equal(state.width <= width+2, true, "horizontal overflow at "+width);
    assert.deepEqual(state.ids, ids, "Roman chapters are missing or out of order");
    assert.deepEqual(state.tocIds, ids, "Roman chapter TOC mismatches document order");
    assert.ok(state.paragraphCounts.every(n => n >= 7), "a chapter contains thin prose");
    assert.equal(state.footerCount, 1, "shared footer missing/duplicated");
    assert.equal(state.logoLoaded, true, "approved Walid AI logo did not load");
    assert.equal(state.flower, true, "rotating Kathgolap background missing");
    assert.ok(state.font.includes("SolaimanLipi"), "Bengali reading font changed");
    assert.equal(state.canonical, "https://walid-ai.com/others/history/roman-empire/");
    assert.equal(state.obsoleteBlocks, 0, "retired source or next-book block returned");
    assert.equal(state.trigger, true, "reader chapter drawer missing");
    await page.locator(".others-toc-trigger").click();
    assert.equal(await page.locator(".others-toc-dialog").evaluate(node => node.open), true);
    const bounds = await page.locator(".others-toc-dialog").evaluate(node => {
      const rect=node.getBoundingClientRect();
      return {left:rect.left,right:rect.right};
    });
    assert.ok(bounds.left >= -2 && bounds.right <= width+2, "TOC drawer overflows viewport");
    await page.locator('.others-toc-dialog a[href="#chapter-2"]').click();
    await page.waitForFunction(() =>
      location.hash === "#chapter-2" && !document.querySelector(".others-toc-dialog").open,
      null, {timeout:4000});
    assert.equal(await page.locator("body").evaluate(node => node.classList.contains("others-toc-open")),
      false, "scroll remains locked after navigation");
    await page.locator(".others-toc-trigger").click();
    await page.keyboard.press("Escape");
    await page.waitForFunction(() =>
      !document.querySelector(".others-toc-dialog").open, null, {timeout:4000});
    await page.close();
  }
  console.log("ROMAN_BROWSER_PASS: 25 chapters, 25 TOC anchors, drawer interactions; widths 320,375,768,1280");
} finally {
  await browser?.close();
  const closed = new Promise(resolve => server.close(resolve));
  server.closeAllConnections();
  await closed;
}
