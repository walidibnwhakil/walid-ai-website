import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {chromium} from "playwright";

const root=new URL("../",import.meta.url);
const types={".html":"text/html",".css":"text/css",".js":"text/javascript",
  ".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp"};
const server=createServer(async(req,res)=>{
  let pathname=new URL(req.url,"http://127.0.0.1").pathname;
  if(pathname.endsWith("/"))pathname+="index.html";
  if(pathname.includes("..")){res.writeHead(404).end();return;}
  const extension=pathname.match(/\.[^.]+$/)?.[0]||"";
  try {
    const bytes=await readFile(new URL(pathname.slice(1),root));
    res.writeHead(200,{"content-type":types[extension]||"application/json"});res.end(bytes);
  } catch {res.writeHead(404).end("Not found");}
});
server.listen(0,"127.0.0.1");
await once(server,"listening");
const origin="http://127.0.0.1:"+server.address().port;
let browser,checks=0;
try{
  browser=await chromium.launch({headless:true});
  for(const route of ["/sports/","/sports/football/","/sports/cricket/"]){
    for(const width of [320,360,390,600,768,1280]){
      const page=await browser.newPage({viewport:{width,height:840},deviceScaleFactor:1});
      await page.route("**/*",r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
      const response=await page.goto(origin+route,{waitUntil:"load"});
      assert.equal(response.status(),200,route);
      await page.waitForFunction(() => {
        const note=document.querySelector("#feedStatus")||document.querySelector("#feedUpdated");
        return note&&!/Loading verified|Loading Football|temporarily unavailable.*Loading/.test(note.textContent);
      });
      const layout=await page.evaluate(()=>{
        const shell=document.querySelector(".sports-shell");
        const body=document.body;
        const cards=[...document.querySelectorAll(".featured-card,.scorecard")];
        const overflow=cards.filter(n=>{const r=n.getBoundingClientRect();return r.left<-1||r.right>innerWidth+1;});
        return {scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,
          cards:cards.length,overflow:overflow.length,
          logo:!!document.querySelector(".brand img"),
          footer:!!document.querySelector(".sports-footer"),
          flower:!!getComputedStyle(body,"::before").backgroundImage || !!document.querySelector("link[href*='walid-branding']"),
          sections:document.querySelectorAll(".match-section").length,
          visibleHeadings:[...document.querySelectorAll(".match-section h2")].map(e=>e.textContent),
          homeHero:(()=>{
            const hero=document.querySelector(".sports-hero:not(.detail-hero)");
            if(!hero)return null;
            const title=hero.querySelector("h1"),subtitle=hero.querySelector("p");
            const center=n=>{const r=n.getBoundingClientRect();return r.left+r.width/2;};
            return {title:title?.textContent?.trim(),subtitle:subtitle?.textContent?.trim(),
              shellCenter:center(shell),titleCenter:center(title),subtitleCenter:center(subtitle),
              titleWeight:Number.parseInt(getComputedStyle(title).fontWeight,10),
              titleAlign:getComputedStyle(hero).textAlign,
              underlineWidth:parseFloat(getComputedStyle(title,"::after").width),
              subtitleBelowTitle:subtitle.getBoundingClientRect().top>title.getBoundingClientRect().bottom};
          })()};
      });
      assert(layout.scrollWidth<=layout.viewport+1,route+" horizontal page overflow at "+width+"px");
      assert.equal(layout.overflow,0,route+" scorecards overflow at "+width+"px");
      assert.equal(layout.logo,true);
      assert.equal(layout.footer,true);
      assert.equal(layout.flower,true);
      assert(layout.cards>=1,route+" should render at least one verified card or empty message");
      if(route==="/sports/"){
        const hero=layout.homeHero;
        assert(hero,"Sports landing page should have a hero");
        assert.equal(hero.title,"Sports");
        assert.equal(hero.subtitle,"Follow the matches that matter.");
        assert.equal(hero.titleAlign,"center");
        assert(hero.titleWeight>=600,"Sports heading should have professional bold typography");
        assert(Math.abs(hero.titleCenter-hero.shellCenter)<2,"Sports heading must be centered at "+width+"px");
        assert(Math.abs(hero.subtitleCenter-hero.shellCenter)<2,"Sports subtitle must be centered at "+width+"px");
        assert(hero.subtitleBelowTitle,"Subtitle must remain below the heading");
        assert(hero.underlineWidth>=50,"Sports heading accent should be visible");
      }
      if(route!=="/sports/"){
        assert.equal(layout.sections,3);
        assert(layout.visibleHeadings.includes("Latest Results"));
        assert(layout.visibleHeadings.includes("Schedule"));
      }
      checks++;
      await page.close();
    }
  }
  const page=await browser.newPage({viewport:{width:375,height:800}});
  await page.route("**/data/sports.json?*",r=>r.fulfill({status:503,body:"Unavailable"}));
  await page.goto(origin+"/sports/",{waitUntil:"load"});
  await page.waitForFunction(()=>document.querySelector("#feedUpdated")?.textContent.includes("temporarily unavailable"));
  assert((await page.locator("#featuredMatches").innerText()).includes("No verified"));
  checks++;
  await page.close();
  console.log("Sports responsive browser checks passed:",checks,"cases");
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
