import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {chromium} from "playwright";
const root=new URL("../",import.meta.url);
const mime={".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript",
".png":"image/png",".woff2":"font/woff2",".woff":"font/woff",".ttf":"font/ttf",".svg":"image/svg+xml"};
const server=createServer(async(req,res)=>{
 let path=new URL(req.url,"http://127.0.0.1").pathname;
 if(path.endsWith("/"))path+="index.html";
 if(path.includes("..")){res.writeHead(403).end();return;}
 try{const bytes=await readFile(new URL(path.slice(1),root));
 res.writeHead(200,{"content-type":mime[path.match(/\.[^.]+$/)?.[0]]||"application/octet-stream"}).end(bytes);}
 catch{res.writeHead(404).end("Not found");}
});
server.listen(0,"127.0.0.1");await once(server,"listening");
const origin="http://127.0.0.1:"+server.address().port;let browser,checks=0;
try{
 browser=await chromium.launch({headless:true});
 for(const width of [320,375,768,1280]){
  const page=await browser.newPage({viewport:{width,height:860},deviceScaleFactor:1});
  await page.route("**/*",r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const res=await page.goto(origin+"/others/history/bengal-sultanate/",{waitUntil:"load"});
  assert.equal(res.status(),200);
  await page.evaluate(()=>document.fonts.ready);
  const info=await page.evaluate(()=>({
   width:document.documentElement.scrollWidth,
   logo:document.querySelector(".others-brand img")?.naturalWidth>0,
   ids:[...document.querySelectorAll(".others-chapter")].map(e=>e.id),
   toc:[...document.querySelectorAll('.others-toc a[href^="#chapter-"]')].map(e=>e.getAttribute("href").slice(1)),
   footer:document.querySelectorAll(".legal-footer").length,
   flower:getComputedStyle(document.body,"::before").backgroundImage.includes("walid-ai-approved-flower"),
   paragraphs:document.querySelectorAll(".others-chapter p").length
  }));
  assert(info.width<=width+2,"horizontal overflow: "+width+" vs "+info.width);
  assert(info.logo&&info.flower,"logo/flower missing "+width);
  assert.equal(info.footer,1);assert.equal(info.ids.length,15);assert.deepEqual(info.ids,info.toc);
  assert(info.paragraphs>=220);
  await page.locator(".others-toc-trigger").click();
  assert(await page.locator(".others-toc-dialog").evaluate(n=>n.open));
  const rect=await page.locator(".others-toc-dialog").evaluate(n=>({left:n.getBoundingClientRect().left,right:n.getBoundingClientRect().right}));
  assert(rect.left>=-2&&rect.right<=width+2,"TOC overflow "+width);
  await page.locator('.others-toc-dialog a[href="#chapter-14"]').click();
  await page.waitForFunction(()=>location.hash==="#chapter-14"&&!document.querySelector(".others-toc-dialog").open);
  assert.equal(await page.locator("body").evaluate(n=>n.classList.contains("others-toc-open")),false);
  await page.locator(".others-toc-trigger").click();await page.keyboard.press("Escape");
  await page.waitForFunction(()=>!document.querySelector(".others-toc-dialog").open);
  await page.close();checks++;
 }
 console.log("BENGAL_SULTANATE_BROWSER_PASS",JSON.stringify({widthChecks:checks,chapters:15,footer:true,toc:true}));
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
