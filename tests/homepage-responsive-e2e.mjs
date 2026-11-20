import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {chromium} from "playwright";

const root=new URL("../",import.meta.url);
const types={".html":"text/html",".css":"text/css",".js":"text/javascript",
  ".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",
  ".woff2":"font/woff2",".ico":"image/x-icon"};
const server=createServer(async(req,res)=>{
  let pathname=new URL(req.url,"http://127.0.0.1").pathname;
  if(pathname==="/")pathname="/index.html";
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
const expectedRoutes=["/chat/","/pdf/","/image/","/games/",
  "/sections/education/","/islam/","/sports/","/others/"];
let browser,checks=0;
try{
  browser=await chromium.launch({headless:true});
  for(const width of [320,360,375,390,430,600,650,768,1024,1280]){
    const page=await browser.newPage({viewport:{width,height:840},deviceScaleFactor:1});
    await page.route("**/*",route=>
      new URL(route.request().url()).origin===origin?route.continue():route.abort());
    const res=await page.goto(origin+"/",{waitUntil:"load"});
    assert.equal(res.status(),200);
    await page.evaluate(()=>document.fonts.ready);
    const layout=await page.evaluate(()=>{
      const el=selector=>document.querySelector(selector);
      const rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
      const cards=[...document.querySelectorAll(".menu .card")].map(card=>({
        r:rect(card),href:card.getAttribute("href"),
        icon:rect(card.querySelector(".card-visual")),
        svgCount:card.querySelectorAll(".card-icon").length,
        title:card.querySelector("h2")?.textContent?.trim(),
        desc:card.querySelector("p")?.textContent?.trim(),
        action:card.querySelector(".arrow")?.textContent?.trim(),
        actionRect:rect(card.querySelector(".arrow")),
        align:getComputedStyle(card).textAlign
      }));
      const headline=el(".hero h1"),heroRect=rect(headline);
      const lineHeight=parseFloat(getComputedStyle(headline).lineHeight);
      return {
        viewport:innerWidth,
        scrollWidth:document.documentElement.scrollWidth,
        hero:heroRect,headingText:headline.textContent.trim(),lineHeight,
        headlineScrollWidth:headline.scrollWidth,
        headlineClientWidth:headline.clientWidth,
        logo:rect(el(".hero .logo")),
        logoLoaded:el(".hero .logo").naturalWidth>0,
        desc:el(".hero p")?.textContent,
        cards
      };
    });
    assert.equal(layout.cards.length,8,"Homepage must retain 8 sections");
    assert.deepEqual(layout.cards.map(card=>card.href),expectedRoutes,
      "Section destinations should remain unchanged");
    assert.ok(layout.scrollWidth<=width+2,
      "No horizontal page scrolling at "+width+"px: "+JSON.stringify(layout));
    assert.equal(layout.headingText,"Welcome to Walid AI");
    assert.ok(layout.logoLoaded,"Approved logo must load");
    assert.match(layout.desc,/think, create, learn, and explore/);
    if(width<=650){
      assert.ok(layout.hero.h<=layout.lineHeight+3,
        "Welcome to Walid AI must remain one line at "+width+"px: "+JSON.stringify(layout.hero));
      assert.ok(layout.headlineScrollWidth<=layout.headlineClientWidth+2,
        "Welcome heading extends off-screen at "+width);
      assert.ok(Math.abs(layout.logo.w-150)<2,
        "Logo should be enlarged to 150px only on phones at "+width);
    }else if(width>950){
      assert.ok(Math.abs(layout.logo.w-140)<2,
        "Desktop original logo size should remain 140px");
    }
    const firstY=layout.cards[0].r.y;
    const sameRow=layout.cards.filter(card=>Math.abs(card.r.y-firstY)<2).length;
    assert.equal(sameRow,width<=650?2:3,
      "Homepage cards per row at "+width+"px");
    const seen=new Set();
    for(const card of layout.cards){
      assert.equal(card.svgCount,1,card.title+" premium icon missing");
      assert.ok(card.icon.w>=60&&card.icon.h>=60,"Vector icon too small: "+card.title);
      assert.ok(card.desc.length>40&&card.desc.length<130,
        card.title+" description should be concise and useful");
      assert.ok(card.action.length>4&&!/Open section|Open omuk/i.test(card.action));
      assert.ok(!seen.has(card.action),"CTA labels should be distinct: "+card.action);
      seen.add(card.action);
      assert.ok(card.r.x>=-2&&card.r.right<=width+2,
        card.title+" extends outside viewport at "+width+"px");
      assert.ok(card.actionRect.bottom<=card.r.bottom+2,
        card.title+" CTA overflows its card");
      if(width<=650){
        const iconMiddle=card.icon.x+card.icon.w/2;
        const cardMiddle=card.r.x+card.r.w/2;
        assert.ok(Math.abs(iconMiddle-cardMiddle)<1.5,
          card.title+" icon should be centered on phone");
        assert.equal(card.align,"center",card.title+" phone text centered");
      }
    }
    checks++;
    await page.close();
  }
  console.log("HOME_RESPONSIVE_PASS",JSON.stringify({
    viewports:[320,360,375,390,430,600,650,768,1024,1280],
    checks,sections:8,mobileColumns:2,desktopColumns:3,svgIcons:8
  }));
}finally{
  await browser?.close();
  const closed=new Promise(resolve=>server.close(resolve));
  server.closeAllConnections();
  await closed;
}
