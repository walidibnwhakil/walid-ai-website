import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {chromium} from "playwright";

const root = new URL("../", import.meta.url);
const types = {".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp",".ttf":"font/ttf",".ico":"image/x-icon"};
const server = createServer(async (req,res) => {
  let pathname = new URL(req.url,"http://127.0.0.1").pathname;
  if (pathname.endsWith("/")) pathname += "index.html";
  if (pathname.includes("..")) { res.writeHead(400).end(); return; }
  const file = pathname.slice(1);
  try {
    const bytes = await readFile(new URL(file,root));
    res.writeHead(200,{"content-type":types[file.match(/\.[^.]+$/)?.[0]] || "application/octet-stream"});
    res.end(bytes);
  } catch { res.writeHead(404).end("Not found"); }
});
server.listen(0,"127.0.0.1");
await once(server,"listening");
const origin = "http://127.0.0.1:" + server.address().port;
const ottoman = await readFile(new URL("others/history/ottoman-empire/index.html",root),"utf8");
const ottomanBayezid = ottoman.split('id="chapter-5">')[1]?.split("</section>")[0];
const ottomanCivilWar = ottoman.split('id="chapter-6">')[1]?.split("</section>")[0];
assert(ottomanBayezid && ottomanCivilWar,"Ottoman counterpart sections missing");
for (const term of ["১৩৮৯","১৪০২","১৪০৩","আংকারা"]) assert(ottomanBayezid.includes(term),"Ottoman Bayezid chronology mismatch: "+term);
assert(ottomanCivilWar.includes("১৪১৩"),"Ottoman succession timeline mismatch");

let browser, checks = 0, drawerChecks = 0;
try {
  browser = await chromium.launch({headless:true});
  for (const width of [320,375,768,1280]) {
    const page = await browser.newPage({viewport:{width,height:860},deviceScaleFactor:1});
    await page.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const response = await page.goto(origin + "/others/history/timur/",{waitUntil:"load"});
    assert.equal(response.status(),200,"Timur page status");
    await page.evaluate(() => document.fonts.ready);
    const state = await page.evaluate(() => {
      const chapters = [...document.querySelectorAll("section.others-chapter")];
      const toc = [...document.querySelectorAll('.others-toc a[href^="#chapter-"]')];
      const logo = document.querySelector(".others-brand img");
      return {
        viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
        chapters: chapters.map(node => ({
          id:node.id, name:node.querySelector("h2")?.textContent?.trim(),
          paragraphs:node.querySelectorAll("p").length
        })),
        toc: toc.map(node => ({id:node.hash.slice(1),name:node.textContent.trim()})),
        totalParagraphs: chapters.reduce((count,node) => count + node.querySelectorAll("p").length,0),
        title: document.querySelector("h1")?.textContent?.trim(),
        description: document.querySelector('meta[name="description"]')?.content,
        canonical: document.querySelector('link[rel="canonical"]')?.href,
        logoLoaded: !!logo?.naturalWidth,
        footerCount: document.querySelectorAll("footer.legal-footer").length,
        flower: getComputedStyle(document.body,"::before").backgroundImage.includes("walid-ai-approved-flower"),
        rotation: getComputedStyle(document.body,"::before").animationName,
        font: getComputedStyle(document.body).fontFamily,
        obsoleteBlocks: document.querySelectorAll(".others-sources,.others-next").length
      };
    });
    assert(state.documentWidth <= width + 2,"Horizontal overflow at " + width + ": " + JSON.stringify(state));
    assert.equal(state.title,"তৈমুর লং ও তিমুরীয় সাম্রাজ্য");
    assert.ok(state.description?.length >= 65,"Missing SEO description");
    assert.equal(state.canonical,"https://walid-ai.com/others/history/timur/");
    assert.equal(state.logoLoaded,true,"Approved logo must load");
    assert.equal(state.footerCount,1,"Exactly one shared footer");
    assert.equal(state.flower,true,"Kathgolap image must remain");
    assert.ok(state.rotation.includes("others-flower-spin"),"Flower rotation must remain");
    assert.ok(state.font.includes("SolaimanLipi"),"SolaimanLipi reader font must remain");
    assert.equal(state.obsoleteBlocks,0,"Obsolete source/next blocks must stay absent");
    const ankaraText = await page.locator("#chapter-12").textContent();
    for (const term of ["কারা ইউসুফ","সুলতান আহমদ","মুতাহহারতেন","স্তেফান লাজারেভিচ","আকশেহির","১৪১৩"]) {
      assert(ankaraText.includes(term),"Missing key Ankara person or consequence: "+term);
    }
    assert(ankaraText.includes("বন্দি"),"Ankara must cover captivity");
        assert.equal(state.chapters.length,18,"Timur must retain 18 rewritten chapters");
    assert.equal(state.totalParagraphs,209,"Timur editorial paragraphs missing");
    assert.deepEqual(state.chapters.map(x=>x.id),Array.from({length:18},(_,i)=>"chapter-"+(i+1)));
    assert.deepEqual(state.toc,state.chapters.map(x=>({id:x.id,name:x.name})),"TOC links and titles must match sections");
    assert(state.chapters.every(x=>x.paragraphs>=5),"A chapter is too short");
    if (width === 375 || width === 1280) {
      await page.locator(".others-toc-trigger").click();
      assert.equal(await page.locator(".others-toc-dialog").evaluate(node=>node.open),true,"TOC must open");
      const rect = await page.locator(".others-toc-dialog").boundingBox();
      assert(rect.x >= -2 && rect.x+rect.width <= width+2,"Drawer horizontal overflow");
      await page.locator('.others-toc-dialog a[href="#chapter-18"]').click();
      await page.waitForFunction(() => location.hash === "#chapter-18" && !document.querySelector(".others-toc-dialog").open);
      assert.equal(await page.locator("body").evaluate(node=>node.classList.contains("others-toc-open")),false,"Body scroll lock remains");
      await page.locator(".others-toc-trigger").click();
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector(".others-toc-dialog").open);
      drawerChecks++;
    }
    checks++;
    await page.close();
  }
  console.log("TIMUR_READER_E2E_PASS",JSON.stringify({widths:checks,drawerChecks,chapters:18,paragraphs:209}));
} finally {
  await browser?.close();
  const closed = new Promise(resolve=>server.close(resolve));
  server.closeAllConnections();
  await closed;
}
