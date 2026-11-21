import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {chromium} from "playwright";
const root=new URL("../",import.meta.url);
const mime={".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript",".png":"image/png",".ttf":"font/ttf",".ico":"image/x-icon"};
const server=createServer(async(req,res)=>{
  let path=new URL(req.url,"http://127.0.0.1").pathname;
  if(path.endsWith("/"))path+="index.html";
  if(path.includes("..")){res.writeHead(404).end();return;}
  try{
    const bytes=await readFile(new URL(path.slice(1),root));
    res.writeHead(200,{"content-type":mime[path.match(/\.[^.]+$/)?.[0]]||"application/octet-stream"});
    res.end(bytes);
  }catch{res.writeHead(404).end("Not found");}
});
server.listen(0,"127.0.0.1");
await once(server,"listening");
const origin="http://127.0.0.1:"+server.address().port;
let browserInstance;
try{
  browserInstance=await chromium.launch({headless:true});
  for(const width of [320,375,768,1280]){
    const page=await browserInstance.newPage({viewport:{width,height:840},deviceScaleFactor:1});
    await page.route("**/*",route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    const res=await page.goto(origin+"/others/history/napoleon/",{waitUntil:"load"});
    assert.equal(res.status(),200,"Napoleon page HTTP response");
    await page.evaluate(()=>document.fonts.ready);
    const layout=await page.evaluate(()=>({
      viewport:innerWidth,
      scrollWidth:document.documentElement.scrollWidth,
      logo:document.querySelector(".others-brand img")?.naturalWidth>0,
      flower:getComputedStyle(document.body,"::before").backgroundImage.includes("walid-ai-approved-flower"),
      font:getComputedStyle(document.body).fontFamily,
      heading:document.querySelector("h1")?.textContent,
      chapters:document.querySelectorAll(".others-chapter").length,
      footer:document.querySelectorAll(".legal-footer").length,
      links:[...document.querySelectorAll(".others-toc a")].map(a=>a.hash)
    }));
    assert.ok(layout.scrollWidth<=width+2,"Horizontal overflow: "+JSON.stringify(layout));
    assert.equal(layout.logo,true,"Logo missing");
    assert.equal(layout.flower,true,"Flower background missing");
    assert.ok(layout.font.includes("SolaimanLipi"),"SolaimanLipi font missing");
    assert.ok(layout.heading?.includes("নেপোলিয়ন"),"Book heading missing");
    assert.equal(layout.chapters,17,"Unexpected chapter count");
    assert.equal(layout.footer,1,"Unexpected footer count");
    assert.deepEqual(layout.links,Array.from({length:17},(_,i)=>"#chapter-"+(i+1)),"TOC links changed");
    await page.locator(".others-toc-trigger").click();
    assert.equal(await page.locator(".others-toc-dialog").evaluate(el=>el.open),true,"TOC did not open");
    const rect=await page.locator(".others-toc-dialog").boundingBox();
    assert.ok(rect.x>=-2 && rect.x+rect.width<=width+2,"TOC extends beyond viewport");
    await page.locator('.others-toc-dialog a[href="#chapter-17"]').click();
    await page.waitForFunction(()=>location.hash==="#chapter-17"&&!document.querySelector(".others-toc-dialog").open);
    await page.locator(".others-toc-trigger").click();
    await page.keyboard.press("Escape");
    await page.waitForFunction(()=>!document.querySelector(".others-toc-dialog").open);
    assert.equal(await page.locator("body").evaluate(el=>el.classList.contains("others-toc-open")),false,"Body remained locked");
    await page.close();
  }
  console.log("NAPOLEON_BROWSER_PASS",JSON.stringify({widths:[320,375,768,1280],chapters:17,footer:1,sidebar:true}));
}finally{
  await browserInstance?.close();
  await new Promise(resolve=>server.close(resolve));
}
