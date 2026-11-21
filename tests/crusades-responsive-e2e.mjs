import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {chromium} from "playwright";

const root = new URL("../", import.meta.url);
const mime = {".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript",
 ".png":"image/png",".ico":"image/x-icon",".ttf":"font/ttf",".jpg":"image/jpeg"};
const server = createServer(async(req,res)=>{
  const target = new URL(req.url,"http://127.0.0.1");
  let p = decodeURIComponent(target.pathname);
  if(p.includes("..")) {res.writeHead(403).end(); return;}
  if(p.endsWith("/")) p += "index.html";
  const ext = p.match(/\.[^.]+$/)?.[0] || "";
  try {
    const bytes = await readFile(new URL(p.slice(1),root));
    res.writeHead(200,{"content-type":mime[ext] || "application/octet-stream"}).end(bytes);
  } catch {res.writeHead(404).end("Not found");}
});
server.listen(0,"127.0.0.1");
await once(server,"listening");
const origin = "http://127.0.0.1:" + server.address().port;
let browser;
let checks=0, drawerChecks=0;
try {
  browser = await chromium.launch({headless:true});
  for(const width of [320,375,768,1280]){
    const page=await browser.newPage({viewport:{width,height:840},deviceScaleFactor:1});
    await page.route("**/*",r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    const resp=await page.goto(origin + "/others/history/crusades/",{waitUntil:"load"});
    assert.equal(resp.status(),200,"Crusades page must load");
    await page.evaluate(()=>document.fonts.ready);
    const state=await page.evaluate(()=>{
      const ids=[...document.querySelectorAll(".others-chapter")].map(n=>n.id);
      const links=[...document.querySelectorAll(".others-toc a")].map(n=>n.hash.replace("#",""));
      return {
        scrollWidth:document.documentElement.scrollWidth,innerWidth,
        heading:document.querySelector("h1")?.textContent?.trim(),
        ids,links,paragraphs:[...document.querySelectorAll(".others-chapter")].map(n=>n.querySelectorAll("p").length),
        logoLoaded:document.querySelector(".others-brand img")?.naturalWidth>0,
        footerCount:document.querySelectorAll(".legal-footer").length,
        flower:getComputedStyle(document.body,"::before").backgroundImage.includes("walid-ai-approved-flower"),
        font:getComputedStyle(document.querySelector(".others-chapter p")).fontFamily,
        title:document.title,
      };
    });
    assert(state.scrollWidth<=width+2,"Horizontal overflow at "+width+": "+JSON.stringify(state));
    assert(state.heading.includes("ক্রুসেড"),"Heading missing at "+width);
    assert(state.title.includes("ক্রুসেড"),"Document title missing");
    assert.equal(state.logoLoaded,true,"Approved logo not loaded");
    assert.equal(state.flower,true,"Kathgolap background missing");
    assert.equal(state.footerCount,1,"Footer duplicated");
    assert(state.font.includes("SolaimanLipi"),"SolaimanLipi CSS family missing");
    assert.equal(state.ids.length,21,"Missing chapters");
    assert.deepEqual(state.links,state.ids,"Broken chapter TOC");
    assert(state.paragraphs.every(n=>n>=11),"Short chapter");
    if(width===375||width===1280){
      await page.locator(".others-toc-trigger").click();
      assert.equal(await page.locator(".others-toc-dialog").evaluate(n=>n.open),true,"TOC failed to open");
      const rect=await page.locator(".others-toc-dialog").evaluate(n=>{
        const r=n.getBoundingClientRect();return {left:r.left,right:r.right};
      });
      assert(rect.left>=-2&&rect.right<=width+2,"TOC drawer overflow");
      await page.locator('.others-toc-dialog a[href="#chapter-21"]').click();
      await page.waitForFunction(()=>
        location.hash==="#chapter-21"&&!document.querySelector(".others-toc-dialog").open,null,{timeout:5000});
      assert.equal(await page.locator("body").evaluate(n=>n.classList.contains("others-toc-open")),false);
      await page.locator(".others-toc-trigger").click();
      await page.keyboard.press("Escape");
      await page.waitForFunction(()=>!document.querySelector(".others-toc-dialog").open);
      drawerChecks++;
    }
    checks++;
    await page.close();
  }
  console.log("CRUSADES_BROWSER_PASS",JSON.stringify({viewportChecks:checks,drawerChecks,chapterCount:21,minimumParagraphs:11}));
} finally {
  await browser?.close();
  const closed=new Promise(resolve=>server.close(resolve));
  server.closeAllConnections();
  await closed;
}
