import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { once } from "node:events";
import { chromium } from "playwright";

const root = new URL("../", import.meta.url);
const types = {".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",
  ".ttf":"font/ttf",".ico":"image/x-icon",".svg":"image/svg+xml"};
const server = createServer(async (req, res) => {
  let path = new URL(req.url, "http://localhost").pathname;
  if (path.endsWith("/")) path += "index.html";
  if (path.includes("..")) return void res.writeHead(404).end();
  const ext = /\.[^.]+$/.exec(path)?.[0] || "";
  try {
    const bytes = await readFile(new URL(path.slice(1), root));
    res.writeHead(200, { "content-type": types[ext] || "application/octet-stream" });
    res.end(bytes);
  } catch { res.writeHead(404).end("not found"); }
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const origin = "http://127.0.0.1:" + server.address().port;
const widths = [320, 375, 768, 1280];
let browser, checks = 0;
try {
  await mkdir("artifacts", {recursive: true});
  browser = await chromium.launch({ headless: true });
  for (const width of widths) {
    const page = await browser.newPage({viewport: {width, height: 840}, deviceScaleFactor: 1});
    const errors = [];
    page.on("pageerror", err => errors.push(String(err)));
    await page.route("**/*", route =>
      new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const response = await page.goto(origin + "/others/folklore/mahabharata/", {waitUntil:"load"});
    assert.equal(response.status(), 200, "Mahabharata must load");
    await page.evaluate(() => document.fonts.ready);
    const data = await page.evaluate(() => {
      const chapters = [...document.querySelectorAll(".others-chapter")];
      const toc = [...document.querySelectorAll('.others-toc a[href^="#chapter-"]')];
      const logo = document.querySelector(".others-brand img");
      const css = getComputedStyle(document.body);
      return {
        width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        ids: chapters.map(x => x.id),
        tocIds: toc.map(x => x.getAttribute("href").slice(1)),
        titles: chapters.map(x => x.querySelector("h2")?.textContent),
        tocTitles: toc.map(x => x.textContent),
        paragraphs: chapters.map(x => x.querySelectorAll("p").length),
        height: document.documentElement.scrollHeight,
        logoLoaded: logo?.naturalWidth > 0,
        footerCount: document.querySelectorAll(".legal-footer").length,
        flower: getComputedStyle(document.body, "::before").backgroundImage.includes("walid-ai-approved-flower"),
        font: css.fontFamily,
        canonical: document.querySelector('link[rel="canonical"]')?.href
      };
    });
    assert(data.scrollWidth <= width + 2, "horizontal overflow at " + width + ": " + data.scrollWidth);
    assert.equal(data.ids.length, 44);
    assert.deepEqual(data.ids, Array.from({length:44}, (_,i)=>"chapter-"+(i+1)));
    assert.deepEqual(data.tocIds, data.ids);
    assert.deepEqual(data.tocTitles, data.titles);
    assert(data.paragraphs.every(n => n >= 6), "too-short chapter");
    assert(data.height > 840, "book unexpectedly blank");
    assert(data.logoLoaded, "approved logo must load");
    assert.equal(data.footerCount, 1, "duplicate footer");
    assert(data.flower, "Kathgolap background lost");
    assert(data.font.includes("SolaimanLipi"), "reader font lost");
    assert.equal(data.canonical, "https://walid-ai.com/others/folklore/mahabharata/");
    assert.deepEqual(errors, [], "browser runtime errors");
    await page.locator(".others-toc-trigger").click();
    assert.equal(await page.locator(".others-toc-dialog").evaluate(el=>el.open), true);
    await page.locator('.others-toc a[href="#chapter-28"]').click();
    assert.equal(await page.locator(".others-toc-dialog").evaluate(el=>el.open), false);
    assert.equal(new URL(page.url()).hash, "#chapter-28", "chapter drawer navigation failed");
    const chapter28 = page.locator("#chapter-28");
    assert(await chapter28.isVisible(), "selected chapter is hidden");
    await page.locator("h1").scrollIntoViewIfNeeded();
    if (width === 375 || width === 1280) {
      await page.screenshot({path:"artifacts/mahabharata-"+width+".png", fullPage:false});
    }
    console.log("PASS", width+"px", data.ids.length+" chapters", "TOC + logo + footer + font + flower");
    checks++;
    await page.close();
  }
  console.log("PASS: Mahabharata reader responsive E2E at", checks, "viewport widths");
} finally {
  await browser?.close();
  server.close();
}
