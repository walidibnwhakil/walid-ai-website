import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {chromium} from "playwright";

const root=new URL("../",import.meta.url);
const types={".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript",
  ".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",
  ".webp":"image/webp",".ttf":"font/ttf",".ico":"image/x-icon"};
const server=createServer(async(req,res)=>{
  let pathname=new URL(req.url,"http://127.0.0.1").pathname;
  if(pathname.endsWith("/"))pathname+="index.html";
  if(pathname.includes("..")){res.writeHead(404).end();return;}
  const file=pathname.slice(1);
  try{
    const bytes=await readFile(new URL(file,root));
    res.writeHead(200,{"content-type":types[file.match(/\.[^.]+$/)?.[0]]||"application/octet-stream"});
    res.end(bytes);
  }catch{res.writeHead(404).end("Not found");}
});
server.listen(0,"127.0.0.1");
await once(server,"listening");
const origin="http://127.0.0.1:"+server.address().port;
const indexes=[
  ["/others/",3],
  ["/others/folklore/",5],
  ["/others/islamic-literature/",5],
];
const storyPaths=[
  "/others/folklore/ramayana/",
  "/others/folklore/mahabharata/",
  "/others/folklore/behula-lakhindar/",
  "/others/folklore/gopal-bhar/",
  "/others/folklore/rupban/",
  "/others/islamic-literature/sinbad/",
  "/others/islamic-literature/alf-layla/",
  "/others/islamic-literature/hatim-tai/",
  "/others/islamic-literature/aladdin/",
  "/others/islamic-literature/ali-baba/",
];
const widths=[320,375,768,1280];
let browser,checks=0,sidebarChecks=0;
try{
  browser=await chromium.launch({headless:true});
  for(const [path,cardsCount] of [...indexes,...storyPaths.map(path=>[path,0])]){
    for(const width of widths){
      const page=await browser.newPage({viewport:{width,height:840},deviceScaleFactor:1});
      await page.route("**/*",r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
      const response=await page.goto(origin+path,{waitUntil:"load"});
      assert.equal(response.status(),200,"Reader page must load: "+path);
      await page.evaluate(()=>document.fonts.ready);
      const layout=await page.evaluate(()=>{
        const visibleRect=(node)=>{const r=node.getBoundingClientRect();
          return {left:r.left,right:r.right,width:r.width,height:r.height}};
        const cards=[...document.querySelectorAll(".others-card")];
        const chapters=[...document.querySelectorAll(".others-chapter")];
        return {
          scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,
          logoLoaded:document.querySelector(".others-brand img")?.naturalWidth>0,
          footerCount:document.querySelectorAll(".legal-footer").length,
          flower:getComputedStyle(document.body,"::before").backgroundImage.includes("walid-ai-approved-flower"),
          heading:document.querySelector("h1")?.textContent?.trim(),
          cardCount:cards.length,cardRects:cards.map(visibleRect),
          chapterCount:chapters.length,
          emptyChapters:chapters.filter(node=>node.querySelectorAll("p").length<5).length,
          hasSidebar:!!document.querySelector(".others-toc-trigger"),
        };
      });
      assert(layout.scrollWidth<=width+2,
        path+" horizontal overflow at "+width+"px: "+JSON.stringify(layout));
      assert.equal(layout.logoLoaded,true,path+" approved logo missing at "+width);
      assert.equal(layout.footerCount,1,path+" should have one footer");
      assert.equal(layout.flower,true,path+" Kathgolap background missing");
      assert.ok(layout.heading?.length>2,path+" missing readable heading");
      assert.equal(layout.cardCount,cardsCount,path+" unexpected card count");
      for(const rect of layout.cardRects){
        assert(rect.left>=-2&&rect.right<=width+2,
          path+" card extends beyond viewport at "+width+"px");
      }
      if(cardsCount===0){
        assert(layout.chapterCount>=12,path+" lost book chapters");
        assert.equal(layout.emptyChapters,0,path+" has empty/short chapters");
        assert.equal(layout.hasSidebar,true,path+" missing chapter drawer");
        if(width===375||width===1280){
          await page.locator(".others-toc-trigger").click();
          assert.equal(await page.locator(".others-toc-dialog").evaluate(n=>n.open),true,
            path+" sidebar failed to open");
          const drawer=await page.locator(".others-toc-dialog").evaluate(node=>{
            const rect=node.getBoundingClientRect();
            return {left:rect.left,right:rect.right};
          });
          assert(drawer.left>=-2&&drawer.right<=width+2,
            path+" sidebar extends beyond "+width+"px");
          await page.locator('.others-toc-dialog a[href="#chapter-2"]').click();
          await page.waitForFunction(()=>
            location.hash==="#chapter-2"&&!document.querySelector(".others-toc-dialog").open,
            null,{timeout:4000});
          assert.equal(await page.locator("body").evaluate(node=>node.classList.contains("others-toc-open")),
            false,path+" scroll lock remains after navigation");
          await page.locator(".others-toc-trigger").click();
          await page.keyboard.press("Escape");
          await page.waitForFunction(()=>!document.querySelector(".others-toc-dialog").open,
            null,{timeout:4000});
          sidebarChecks++;
        }
      }
      checks++;
      await page.close();
    }
  }
  console.log("OTHERS_RESPONSIVE_PASS",JSON.stringify({
    pageWidthChecks:checks,interactiveSidebarChecks:sidebarChecks,
    storyReaders:storyPaths.length,indexes:indexes.length,widths
  }));
}finally{
  await browser?.close();
  const closed=new Promise(resolve=>server.close(resolve));
  server.closeAllConnections();
  await closed;
}
