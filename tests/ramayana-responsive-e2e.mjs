import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {chromium} from "playwright";

const root = new URL("../", import.meta.url);
const types = {".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript",
  ".png":"image/png",".svg":"image/svg+xml",".ico":"image/x-icon",".ttf":"font/ttf"};
const server = createServer(async (req, res) => {
  let name = new URL(req.url, "http://127.0.0.1").pathname;
  if (name.endsWith("/")) name += "index.html";
  if (name.includes("..")) {res.writeHead(400).end(); return;}
  try {
    const bytes = await readFile(new URL(name.slice(1),root));
    res.writeHead(200,{"content-type":types[name.match(/\.[^.]+$/)?.[0]]||"application/octet-stream"});
    res.end(bytes);
  } catch {
    res.writeHead(404).end("Not found");
  }
});
server.listen(0,"127.0.0.1");
await once(server,"listening");
const origin = "http://127.0.0.1:"+server.address().port;
const path="/others/folklore/ramayana/";
let browser,passed=0;
const widths=[320,375,768,1280];
try {
  browser=await chromium.launch({headless:true});
  for(const width of widths){
    const page=await browser.newPage({viewport:{width,height:840},deviceScaleFactor:1});
    await page.route("**/*",r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    const errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    const response=await page.goto(origin+path,{waitUntil:"load"});
    assert.equal(response.status(),200,"Ramayana page must load at "+width);
    await page.evaluate(()=>document.fonts.ready);
    const pageState=await page.evaluate(()=>{
      const chapters=[...document.querySelectorAll(".others-chapter")];
      const items=[...document.querySelectorAll(".others-toc a[href^='#chapter-']")];
      const flower=getComputedStyle(document.body,"::before");
      const brand=document.querySelector(".others-brand img");
      return {
        width:innerWidth,scroll:document.documentElement.scrollWidth,
        title:document.querySelector("h1")?.textContent.trim(),
        logoLoaded:brand?.naturalWidth>0,logoSrc:brand?.getAttribute("src"),
        font:getComputedStyle(document.body).fontFamily,
        flowerImage:flower.backgroundImage,flowerAnimation:flower.animationName,
        chapters:chapters.map(e=>e.id),
        headingCount:chapters.filter(e=>!!e.querySelector("h2")).length,
        shortChapters:chapters.filter(e=>e.querySelectorAll("p").length<10).length,
        toc:items.map(e=>e.getAttribute("href").slice(1)),
        footerCount:document.querySelectorAll(".legal-footer").length,
        canonical:document.querySelector('link[rel="canonical"]')?.href,
        hasMetaDescription:!!document.querySelector('meta[name="description"]')?.content,
        variants:document.querySelectorAll("details.ramayana-variants").length,
        noObsoleteLinks:!document.querySelector(".others-sources,.others-next"),
      };
    });
    assert(pageState.scroll<=width+2,"Horizontal overflow at "+width+": "+JSON.stringify(pageState));
    assert.equal(pageState.title,"রামায়ণ");
    assert.equal(pageState.logoLoaded,true,"Walid AI approved logo missing");
    assert.equal(pageState.logoSrc,"/walid-ai-approved-logo.png");
    assert(pageState.font.includes("SolaimanLipi"),"SolaimanLipi stack not active");
    assert(pageState.flowerImage.includes("walid-ai-approved-flower.png"),"Kathgolap background absent");
    assert(pageState.flowerAnimation.includes("others-flower-spin"),"Rotating Kathgolap absent");
    assert.equal(pageState.chapters.length,41,"Expected 41 chapters");
    assert.equal(pageState.headingCount,41);
    assert.equal(pageState.shortChapters,0,"Chapters unexpectedly abbreviated");
    assert.deepEqual(pageState.toc,pageState.chapters,"TOC anchors differ");
    assert.equal(new Set(pageState.chapters).size,41,"Duplicate chapter IDs");
    assert.equal(pageState.footerCount,1,"Shared footer duplicated or missing");
    assert.equal(pageState.canonical,"https://walid-ai.com/others/folklore/ramayana/");
    assert.equal(pageState.hasMetaDescription,true);
    assert.equal(pageState.variants,1);
    assert.equal(pageState.noObsoleteLinks,true);
    await page.locator(".others-toc-trigger").click();
    assert.equal(await page.locator(".others-toc-dialog").evaluate(n=>n.open),true,"TOC failed open");
    await page.locator('.others-toc-dialog a[href="#chapter-41"]').click();
    await page.waitForFunction(()=>location.hash==="#chapter-41"&&!document.querySelector(".others-toc-dialog").open);
    assert.equal(await page.locator("body").evaluate(n=>n.classList.contains("others-toc-open")),false);
    await page.locator(".ramayana-variants summary").click();
    assert.equal(await page.locator(".ramayana-variants").evaluate(n=>n.open),true);
    assert.equal(errors.length,0,"Browser errors: "+JSON.stringify(errors));
    await page.close();
    passed++;
  }
  console.log("RAMAYANA_BROWSER_PASS",JSON.stringify({path,widths,passed,chapters:41,linkedTOC:true,footer:true,branding:true,variants:true}));
} finally {
  await browser?.close();
  const closing=new Promise(resolve=>server.close(resolve));
  server.closeAllConnections();
  await closing;
}
