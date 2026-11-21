import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {chromium} from "playwright";

const root = new URL("../", import.meta.url);
const mime = {".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript",".png":"image/png",".ttf":"font/ttf",".ico":"image/x-icon"};
const server = createServer(async (req, res) => {
  let path = new URL(req.url, "http://127.0.0.1").pathname;
  if (path.endsWith("/")) path += "index.html";
  if (path.includes("..")) { res.writeHead(404).end(); return; }
  try {
    const bytes = await readFile(new URL(path.slice(1), root));
    res.writeHead(200, {"content-type":mime[path.match(/\.[^.]+$/)?.[0]] || "application/octet-stream"});
    res.end(bytes);
  } catch { res.writeHead(404).end("Not found"); }
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const origin = "http://127.0.0.1:" + server.address().port;
let browser;
try {
  browser = await chromium.launch({headless:true});
  for (const width of [320, 390, 768, 1280, 1440]) {
    const page = await browser.newPage({viewport:{width,height:850},deviceScaleFactor:1});
    await page.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const response = await page.goto(origin+"/others/history/joan-of-arc/", {waitUntil:"load"});
    assert.equal(response?.status(), 200, "book loads");
    await page.evaluate(() => document.fonts.ready);
    const layout = await page.evaluate(() => ({
      screen:innerWidth,
      scroll:document.documentElement.scrollWidth,
      logo:document.querySelector(".others-brand img")?.naturalWidth>0,
      flower:getComputedStyle(document.body,"::before").backgroundImage.includes("walid-ai-approved-flower"),
      font:getComputedStyle(document.body).fontFamily,
      chapters:document.querySelectorAll(".others-chapter").length,
      anchors:[...document.querySelectorAll(".others-toc a")].map(a=>a.getAttribute("href")),
      footer:document.querySelectorAll(".legal-footer").length,
      canonical:document.querySelector('link[rel="canonical"]')?.href
    }));
    assert.ok(layout.scroll<=width+2, "horizontal overflow: "+JSON.stringify(layout));
    assert.equal(layout.logo, true);
    assert.equal(layout.flower, true);
    assert.ok(layout.font.includes("SolaimanLipi"));
    assert.equal(layout.chapters, 13);
    assert.equal(layout.footer, 1);
    assert.equal(layout.canonical, "https://walid-ai.com/others/history/joan-of-arc/");
    assert.deepEqual(layout.anchors, Array.from({length:13}, (_,i)=>"#chapter-"+(i+1)));
    assert.equal(await page.locator("section.others-chapter > h2").count(),13);
    await page.locator(".others-toc-trigger").click();
    const dialog = page.locator("#others-toc-panel");
    assert.equal(await dialog.evaluate(el=>el.open), true);
    const rect = await dialog.boundingBox();
    assert.ok(rect.x>=-2 && rect.x+rect.width<=width+2, "TOC overflows "+width);
    await dialog.locator('a[href="#chapter-13"]').click();
    await page.waitForFunction(()=>location.hash==="#chapter-13"&&!document.querySelector("#others-toc-panel").open);
    assert.equal(await page.locator("#chapter-13").isVisible(), true);
    await page.locator(".others-toc-trigger").click();
    await page.keyboard.press("Escape");
    await page.waitForFunction(()=>!document.querySelector("#others-toc-panel").open);
    await page.locator("footer.legal-footer").scrollIntoViewIfNeeded();
    assert.equal(await page.locator("footer.legal-footer").isVisible(),true);
    await page.close();
  }
  console.log("JOAN_READER_BROWSER_PASS 320,390,768,1280,1440 (TOC, branding, fonts, flower, footer, overflow)");
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
