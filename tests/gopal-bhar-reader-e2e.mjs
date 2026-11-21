import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import { chromium } from "playwright";

const root = new URL("../", import.meta.url);
const path = "others/folklore/gopal-bhar/index.html";
const html = await readFile(new URL("../" + path, import.meta.url), "utf8");
const sections = [...html.matchAll(/<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)<\/h2>([\s\S]*?)<\/section>/g)];
const toc = [...(html.match(/<nav class="others-toc" aria-label="অধ্যায় তালিকা">([\s\S]*?)<\/nav>/)?.[1] ?? "").matchAll(/<a href="#chapter-(\d+)">([^<]*)<\/a>/g)];
assert.equal(sections.length, 17, "Missing standalone tales");
assert.equal(toc.length, 17, "Missing table-of-contents entries");
assert.deepEqual(sections.map(x => Number(x[1])), Array.from({length:17},(_,i)=>i+1));
sections.forEach((s, i) => {
  assert.equal(s[1], toc[i][1], "TOC order");
  assert.equal(s[2], toc[i][2], "TOC title");
  assert.ok((s[3].match(/<p>/g) || []).length >= 6, "Short story: " + s[1]);
});
assert.ok(html.includes('rel="canonical" href="https://walid-ai.com/others/folklore/gopal-bhar/"'));
assert.ok(html.includes("/walid-ai-approved-logo.png"));
assert.ok(html.includes("/others/assets/books.css"));
assert.ok(html.includes("/others/assets/reader.js"));
assert.ok(!html.includes("উৎস ও পরবর্তী পাঠ"));
assert.ok(!/class="others-(?:sources|next)"/.test(html));
assert.equal((html.match(/class="legal-footer"/g) || []).length, 1);
const indexHtml = await readFile(new URL("../others/folklore/index.html", import.meta.url), "utf8");
const cards = [...indexHtml.matchAll(/<a class="others-card" href="([^"]+)">([\s\S]*?)<\/a>/g)];
const icons = cards.map(x => ({href:x[1], svg:x[2].match(/<svg[\s\S]*?<\/svg>/)?.[0]}));
const icon = icons.find(x => x.href === "/others/folklore/gopal-bhar/")?.svg;
assert.ok(icon && icon.includes("<svg"), "Distinct icon missing");
assert.ok(icons.filter(x => x.svg === icon).length === 1, "Gopal card icon reused");

const types = {".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp",".ttf":"font/ttf",".woff2":"font/woff2",".ico":"image/x-icon"};
const server = createServer(async (req,res) => {
  let pathname = new URL(req.url,"http://127.0.0.1").pathname;
  if(pathname.endsWith("/")) pathname += "index.html";
  if(pathname.includes("..")) {res.writeHead(400).end("bad path");return;}
  try {
    const data = await readFile(new URL(pathname.slice(1),root));
    const ext = pathname.match(/\.[^.]+$/)?.[0] ?? "";
    res.writeHead(200,{"content-type":types[ext] ?? "application/octet-stream"});
    res.end(data);
  } catch { res.writeHead(404).end("not found"); }
});
server.listen(0,"127.0.0.1");
await once(server,"listening");
const origin = "http://127.0.0.1:" + server.address().port;
let browser;
const widths = [320,375,768,1280];
let interactions = 0;
try {
  browser = await chromium.launch({headless:true});
  for(const width of widths) {
    const page = await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
    await page.route("**/*",r => new URL(r.request().url()).origin===origin ? r.continue() : r.abort());
    const pageErrors=[];
    page.on("pageerror",e=>pageErrors.push(e.message));
    const response=await page.goto(origin+"/others/folklore/gopal-bhar/",{waitUntil:"load"});
    assert.equal(response.status(),200);
    await page.evaluate(()=>document.fonts.ready);
    const data=await page.evaluate(()=>({
      viewport:innerWidth,
      scroll:document.documentElement.scrollWidth,
      chapters:document.querySelectorAll(".others-chapter").length,
      toc:document.querySelectorAll(".others-toc a[href^='#chapter-']").length,
      footer:document.querySelectorAll(".legal-footer").length,
      logo:document.querySelector(".others-brand img")?.naturalWidth>0,
      flower:getComputedStyle(document.body,"::before").backgroundImage.includes("walid-ai-approved-flower"),
      font:getComputedStyle(document.body).fontFamily,
      title:document.querySelector("h1")?.textContent,
      canonical:document.querySelector('link[rel="canonical"]')?.href
    }));
    assert.equal(data.chapters,17,"Chapters at " + width);
    assert.equal(data.toc,17,"TOC at " + width);
    assert.equal(data.footer,1,"Footer at " + width);
    assert.ok(data.logo && data.flower && data.font.includes("SolaimanLipi"), "Branding at "+width+": "+JSON.stringify(data));
    assert.ok(data.title.includes("গোপাল ভাঁড়"));
    assert.equal(data.canonical,"https://walid-ai.com/others/folklore/gopal-bhar/");
    assert.ok(data.scroll <= width + 2, "Horizontal overflow at "+width+": "+JSON.stringify(data));
    assert.deepEqual(pageErrors,[],"JS errors at "+width);
    if(width===375 || width===1280) {
      await page.locator(".others-toc-trigger").click();
      assert.equal(await page.locator(".others-toc-dialog").evaluate(x=>x.open),true,"TOC open");
      const box=await page.locator(".others-toc-dialog").boundingBox();
      assert.ok(box.x >= -2 && box.x+box.width <= width+2,"Drawer overflow at "+width);
      await page.locator('a[href="#chapter-17"]').click();
      await page.waitForFunction(()=>location.hash==="#chapter-17" && !document.querySelector(".others-toc-dialog").open);
      const end=await page.locator("#chapter-17 h2").textContent();
      assert.ok(end.includes("খালি কলসির জ্ঞান"),"Last story accessible");
      await page.locator(".others-toc-trigger").click();
      await page.keyboard.press("Escape");
      await page.waitForFunction(()=>!document.querySelector(".others-toc-dialog").open);
      interactions++;
    }
    await page.close();
  }
  console.log("GOPAL_BHAR_READER_PASS",JSON.stringify({stories:sections.length,viewports:widths,interactions,icon:"distinct",scope:path}));
} finally {
  await browser?.close();
  const closed=new Promise(resolve=>server.close(resolve));
  server.closeAllConnections();
  await closed;
}
