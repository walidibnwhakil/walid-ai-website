import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {chromium} from "playwright";

const root=new URL("../",import.meta.url);
const types={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",
  ".jpg":"image/jpeg",".webp":"image/webp",".ttf":"font/ttf",
  ".woff2":"font/woff2",".ico":"image/x-icon"};
const server=createServer(async(req,res)=>{
  let pathname=new URL(req.url,"http://127.0.0.1").pathname;
  if(pathname.endsWith("/"))pathname+="index.html";
  if(pathname.includes("..")){res.writeHead(404).end("Bad path");return;}
  try{
    const bytes=await readFile(new URL(pathname.slice(1),root));
    res.writeHead(200,{"content-type":types[pathname.match(/\.[^.]+$/)?.[0]]??"application/octet-stream"});
    res.end(bytes);
  }catch{res.writeHead(404).end("Not found");}
});
server.listen(0,"127.0.0.1");
await once(server,"listening");
const origin="http://127.0.0.1:"+server.address().port;
let browser;
const widths=[320,375,768,1280];
let dialogChecks=0;
try{
  browser=await chromium.launch({headless:true});
  for(const width of widths){
    const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
    const errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    await page.route("**/*",route=>
      new URL(route.request().url()).origin===origin?route.continue():route.abort());
    const response=await page.goto(origin+"/others/folklore/rupban/",{waitUntil:"load"});
    assert.equal(response.status(),200,"Rupban page must render");
    await page.evaluate(()=>document.fonts.ready);
    const result=await page.evaluate(()=>{
      const chapters=[...document.querySelectorAll(".others-chapter")];
      const toc=[...document.querySelectorAll(".others-toc a[href^='#chapter-']")];
      return {
        viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
        chapters:chapters.length,toc:toc.length,
        ids:chapters.map(x=>x.id),targets:toc.map(x=>x.hash.slice(1)),
        footer:document.querySelectorAll(".legal-footer").length,
        logo:document.querySelector(".others-brand img")?.naturalWidth>0,
        flower:getComputedStyle(document.body,"::before").backgroundImage.includes("walid-ai-approved-flower"),
        font:getComputedStyle(document.body).fontFamily,
        canonical:document.querySelector('link[rel="canonical"]')?.href,
        title:document.querySelector("h1")?.textContent?.trim(),
        hasEmptyChapter:chapters.some(c=>c.querySelectorAll("p").length<7)
      };
    });
    assert.equal(result.chapters,12,"Twelve chapters at "+width);
    assert.equal(result.toc,12,"Twelve TOC entries at "+width);
    assert.deepEqual(result.targets,result.ids,"TOC references and chapters at "+width);
    assert.equal(result.footer,1,"One footer at "+width);
    assert.ok(result.logo && result.flower && result.font.includes("SolaimanLipi"),
      "Brand and font at "+width+": "+JSON.stringify(result));
    assert.equal(result.canonical,"https://walid-ai.com/others/folklore/rupban/");
    assert.equal(result.title,"রূপবান পালা");
    assert.equal(result.hasEmptyChapter,false);
    assert.ok(result.scrollWidth<=width+2,"Overflow at "+width+": "+JSON.stringify(result));
    assert.deepEqual(errors,[],"JavaScript errors at "+width);
    if(width===375||width===1280){
      await page.locator(".others-toc-trigger").click();
      assert.equal(await page.locator(".others-toc-dialog").evaluate(n=>n.open),true);
      const rect=await page.locator(".others-toc-dialog").boundingBox();
      assert.ok(rect.x>=-2&&rect.x+rect.width<=width+2,"TOC overflow at "+width);
      await page.locator('.others-toc-dialog a[href="#chapter-12"]').click();
      await page.waitForFunction(()=>
        location.hash==="#chapter-12"&&!document.querySelector(".others-toc-dialog").open);
      assert.ok((await page.locator("#chapter-12 h2").textContent()).includes("বারো বছরের অবসান"));
      await page.locator(".others-toc-trigger").click();
      await page.keyboard.press("Escape");
      await page.waitForFunction(()=>!document.querySelector(".others-toc-dialog").open);
      dialogChecks++;
    }
    await page.close();
  }
  console.log("RUPBAN_READER_PASS",JSON.stringify({chapters:12,viewports:widths,dialogChecks}));
}finally{
  await browser?.close();
  const closed=new Promise(resolve=>server.close(resolve));
  server.closeAllConnections();
  await closed;
}
