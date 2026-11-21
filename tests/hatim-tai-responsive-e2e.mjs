import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {chromium} from "playwright";

const root=new URL("../",import.meta.url);
const mime={".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript",
  ".png":"image/png",".jpg":"image/jpeg",".ttf":"font/ttf",".ico":"image/x-icon"};
const server=createServer(async(req,res)=>{
  let pathname=new URL(req.url,"http://127.0.0.1").pathname;
  if(pathname.includes("..")){res.writeHead(404).end();return;}
  if(pathname.endsWith("/"))pathname+="index.html";
  const file=pathname.slice(1);
  try{
    const bytes=await readFile(new URL(file,root));
    res.writeHead(200,{"content-type":mime[file.match(/\.[^.]+$/)?.[0]]||"application/octet-stream"}).end(bytes);
  }catch{res.writeHead(404).end("Not found");}
});
server.listen(0,"127.0.0.1");
await once(server,"listening");
const origin="http://127.0.0.1:"+server.address().port;
const url="/others/islamic-literature/hatim-tai/";
const widths=[320,375,768,1280];
const ids=Array.from({length:12},(_,i)=>"chapter-"+(i+1));
let browser,passed=0;
try{
  browser=await chromium.launch({headless:true});
  for(const width of widths){
    const page=await browser.newPage({viewport:{width,height:840},deviceScaleFactor:1});
    await page.route("**/*",route=>
      new URL(route.request().url()).origin===origin?route.continue():route.abort());
    const response=await page.goto(origin+url,{waitUntil:"load"});
    assert.equal(response.status(),200,"Hatim Tai reader must load");
    await page.evaluate(()=>document.fonts.ready);
    const info=await page.evaluate(()=>{
      const chapters=[...document.querySelectorAll(".others-chapter[id]")];
      const toc=[...document.querySelectorAll('.others-toc a[href^="#chapter-"]')];
      return {
        scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,
        heading:document.querySelector("h1")?.textContent.trim(),
        ids:chapters.map(e=>e.id),titles:chapters.map(e=>e.querySelector("h2")?.textContent.trim()),
        counts:chapters.map(e=>e.querySelectorAll("p").length),
        tocIds:toc.map(e=>e.getAttribute("href").slice(1)),
        tocTitles:toc.map(e=>e.textContent.trim()),
        logo:document.querySelector(".others-brand img")?.naturalWidth>0,
        flower:getComputedStyle(document.body,"::before").backgroundImage.includes("walid-ai-approved-flower"),
        font:getComputedStyle(document.body).fontFamily,
        footer:document.querySelectorAll(".legal-footer").length,
        footerLinks:document.querySelectorAll(".legal-footer nav a").length,
        canonical:document.querySelector('link[rel="canonical"]')?.href,
        sources:document.querySelectorAll(".others-sources,.others-next").length,
        advertisements:document.querySelectorAll("ins.adsbygoogle").length,
        note:document.querySelector(".others-note")?.textContent||"",
        hasDrawer:!!document.querySelector(".others-toc-trigger")
      };
    });
    assert.ok(info.scrollWidth<=width+2,"Horizontal overflow at "+width+": "+info.scrollWidth);
    assert.ok(info.heading?.includes("হাতেম তাই"),"Book heading missing");
    assert.deepEqual(info.ids,ids,"Chapter IDs changed at "+width);
    assert.deepEqual(info.tocIds,ids,"TOC anchors wrong at "+width);
    assert.deepEqual(info.tocTitles,info.titles,"TOC titles do not match chapters at "+width);
    assert.ok(info.counts.every(count=>count>=12),"Abbreviated chapter at "+width);
    assert.equal(info.logo,true,"Original logo must load");
    assert.equal(info.flower,true,"Kathgolap background missing");
    assert.ok(info.font.includes("SolaimanLipi"),"Bengali typography changed");
    assert.equal(info.footer,1,"Footer duplicated or missing");
    assert.equal(info.footerLinks,4,"Footer navigation changed");
    assert.equal(info.canonical,"https://walid-ai.com"+url,"Canonical changed");
    assert.equal(info.sources,0,"Removed source/next block reappeared");
    assert.equal(info.advertisements,0,"Reader ad policy changed");
    assert.ok(info.note.includes("১৮৩০"),"Source context missing");
    assert.equal(info.hasDrawer,true,"TOC drawer missing");

    await page.locator(".others-toc-trigger").click();
    assert.equal(await page.locator(".others-toc-dialog").evaluate(e=>e.open),true,"Drawer did not open");
    const bounds=await page.locator(".others-toc-dialog").evaluate(node=>{
      const r=node.getBoundingClientRect();return {left:r.left,right:r.right};
    });
    assert.ok(bounds.left>=-2&&bounds.right<=width+2,"Drawer overflow at "+width);
    await page.locator('.others-toc-dialog a[href="#chapter-11"]').click();
    await page.waitForFunction(()=>
      location.hash==="#chapter-11"&&!document.querySelector(".others-toc-dialog").open);
    assert.equal(await page.locator("body").evaluate(node=>node.classList.contains("others-toc-open")),
      false,"Page remains scroll-locked");
    await page.locator(".others-toc-trigger").click();
    await page.keyboard.press("Escape");
    await page.waitForFunction(()=>!document.querySelector(".others-toc-dialog").open);
    passed++;
    await page.close();
  }
  console.log("HATIM_TAI_BROWSER_PASS",JSON.stringify({widths,checks:passed,chapters:ids.length}));
}finally{
  await browser?.close();
  const close=new Promise(resolve=>server.close(resolve));
  server.closeAllConnections();
  await close;
}
