import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {chromium} from "playwright";

const root = new URL("../", import.meta.url);
const mime = {".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript",
".png":"image/png",".jpg":"image/jpeg",".ttf":"font/ttf",".ico":"image/x-icon"};
const server = createServer(async (req,res) => {
  let pathname = new URL(req.url,"http://127.0.0.1").pathname;
  if (pathname.endsWith("/")) pathname += "index.html";
  if (pathname.includes("..")) return void res.writeHead(404).end();
  const file = pathname.slice(1);
  try {
    const bytes = await readFile(new URL(file,root));
    res.writeHead(200,{"content-type":mime[file.match(/\.[^.]+$/)?.[0]]||"application/octet-stream"}).end(bytes);
  } catch {res.writeHead(404).end("Not found");}
});
server.listen(0,"127.0.0.1");
await once(server,"listening");
const origin = "http://127.0.0.1:"+server.address().port;
const widths=[320,375,768,1280];
const ids=Array.from({length:12},(_,i)=>"chapter-"+(i+1));
let browser;
try {
  browser=await chromium.launch({headless:true});
  for(const width of widths){
    const page=await browser.newPage({viewport:{width,height:850},deviceScaleFactor:1});
    await page.route("**/*",r=>
      new URL(r.request().url()).origin===origin?r.continue():r.abort());
    const response=await page.goto(origin+"/others/islamic-literature/aladdin/",{waitUntil:"load"});
    assert.equal(response.status(),200,"Aladdin reader HTTP response");
    await page.evaluate(()=>document.fonts.ready);
    const info=await page.evaluate(()=>{
      const chapters=[...document.querySelectorAll(".others-chapter[id]")];
      const toc=[...document.querySelectorAll('.others-toc a[href^="#chapter-"]')];
      const styles=getComputedStyle(document.body);
      return {
        viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
        heading:document.querySelector("h1")?.textContent.trim(),
        chapters:chapters.map(node=>node.id),
        titles:chapters.map(node=>node.querySelector("h2")?.textContent.trim()),
        toc:toc.map(node=>node.getAttribute("href").slice(1)),
        tocTitles:toc.map(node=>node.textContent.trim()),
        paragraphs:chapters.map(node=>node.querySelectorAll("p").length),
        logo:document.querySelector(".others-brand img")?.naturalWidth>0,
        flower:getComputedStyle(document.body,"::before").backgroundImage.includes("walid-ai-approved-flower"),
        font:styles.fontFamily,footer:document.querySelectorAll(".legal-footer").length,
        canonical:document.querySelector('link[rel="canonical"]')?.href,
        obsolete:document.querySelectorAll(".others-sources,.others-next").length,
        tocButton:!!document.querySelector(".others-toc-trigger"),
      };
    });
    assert.ok(info.scrollWidth<=width+2, "Aladdin horizontal overflow at "+width);
    assert.equal(info.heading,"আলাদিন ও জাদুর প্রদীপ");
    assert.deepEqual(info.chapters,ids,"Chapter order or IDs changed");
    assert.deepEqual(info.toc,ids,"TOC anchor mismatch");
    assert.deepEqual(info.tocTitles,info.titles,"TOC titles mismatch");
    assert.ok(info.paragraphs.every(v=>v>=7),"Thin/empty chapter found");
    assert.equal(info.logo,true,"Logo asset failed to load");
    assert.equal(info.flower,true,"Kathgolap background missing");
    assert.ok(info.font.includes("SolaimanLipi"),"Bangla font lost");
    assert.equal(info.footer,1,"Footer missing or duplicated");
    assert.equal(info.canonical,"https://walid-ai.com/others/islamic-literature/aladdin/");
    assert.equal(info.obsolete,0,"Removed sidebar source or next-story block returned");
    assert.equal(await page.locator("ins.adsbygoogle").count(),0,"Ads must not appear in this reader");
    assert.ok(info.paragraphs.every(v=>v>=7),"Chapter narrative shortened");
    assert.equal(info.tocButton,true,"TOC opener missing");
    await page.locator(".others-toc-trigger").click();
    assert.equal(await page.locator(".others-toc-dialog").evaluate(n=>n.open),true,"TOC drawer did not open");
    const bounds=await page.locator(".others-toc-dialog").evaluate(node=>{
      const r=node.getBoundingClientRect();
      return {left:r.left,right:r.right};
    });
    assert.ok(bounds.left>=-2&&bounds.right<=width+2,"TOC drawer overflows at "+width);
    await page.locator('.others-toc-dialog a[href="#chapter-12"]').click();
    await page.waitForFunction(()=>location.hash==="#chapter-12"&&!document.querySelector(".others-toc-dialog").open,null,{timeout:5000});
    assert.equal(await page.locator("body").evaluate(node=>node.classList.contains("others-toc-open")),false,"Scroll lock left after TOC navigation");
    await page.locator(".others-toc-trigger").click();
    await page.keyboard.press("Escape");
    await page.waitForFunction(()=>!document.querySelector(".others-toc-dialog").open,null,{timeout:5000});
    await page.close();
  }
  console.log("ALADDIN_BROWSER_PASS: 12 TOC links, drawer interactions, shared assets, no horizontal overflow at "+widths.join(",")+"px");
}finally{
  await browser?.close();
  const closed=new Promise(resolve=>server.close(resolve));
  server.closeAllConnections();
  await closed;
}
