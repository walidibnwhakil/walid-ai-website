/* Responsive Quran index: two readable cards per mobile row, narrow fallback. */
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {extname} from "node:path";
import {chromium} from "playwright";

const root = new URL("../", import.meta.url);
const mime = {".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",
  ".json":"application/json",".svg":"image/svg+xml",".png":"image/png"};
const server = createServer(async (req,res) => {
  let path = new URL(req.url,"http://127.0.0.1").pathname;
  if (path.includes("..")) return void res.writeHead(400).end();
  if (path.endsWith("/")) path += "index.html";
  try {
    const bytes=await readFile(new URL(path.slice(1),root));
    res.writeHead(200,{"content-type":mime[extname(path)]||"application/octet-stream"}).end(bytes);
  } catch { res.writeHead(404).end("Not found"); }
});
server.listen(0,"127.0.0.1");
await once(server,"listening");
const base="http://127.0.0.1:"+server.address().port;
let browser;
try {
  browser=await chromium.launch({headless:true});
  for(const width of [320,340,341,360,375,414,620,768,1280]) {
    const page=await browser.newPage({viewport:{width,height:812}});
    const exceptions=[];
    page.on("pageerror",error=>exceptions.push(error.message));
    await page.route("**/*", route=>
      new URL(route.request().url()).origin===base?route.continue():route.abort());
    await page.goto(base+"/islam/quran/",{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.querySelectorAll("#surah-list .surah-card").length===114 &&
      document.querySelector("#list-status")?.textContent?.includes("১১৪"),null,{timeout:10000});
    const result=await page.evaluate(()=>{
      const cards=[...document.querySelectorAll("#surah-list .surah-card")];
      const first=cards[0].getBoundingClientRect(),second=cards[1].getBoundingClientRect();
      const columns=Math.abs(first.top-second.top)<3?2:1;
      const clipped=cards.flatMap((card,i)=>{
        const title=card.querySelector("strong"),small=card.querySelector("small");
        return [title,small].filter(el=>el && el.scrollWidth>el.clientWidth+2).map(()=>i+1);
      });
      return {columns,clipped,overflow:document.documentElement.scrollWidth-innerWidth,
        firstWidth:first.width,name:cards[0].querySelector("strong")?.textContent,
        secondWidth:second.width};
    });
    const expected=width<=340?1:2;
    assert.equal(result.columns,expected,"Expected "+expected+" columns at "+width+"px");
    assert.ok(result.firstWidth>140,"Cards must have reading space at "+width+"px");
    assert.ok(result.overflow<=2,"No horizontal page overflow at "+width+"px: "+result.overflow);
    assert.deepEqual(result.clipped,[],"All 114 names and metadata must fit at "+width+"px");
    assert.equal(await page.locator("#surah-list .surah-card").count(),114);
    if(width===375){
      await page.locator("#surah-search").fill("বাকারা");
      assert.equal(await page.locator("#surah-list .surah-card").count(),1);
      await page.locator("#surah-search").fill("");
      assert.equal(await page.locator("#surah-list .surah-card").count(),114);
    }
    assert.deepEqual(exceptions,[],"No index JS exceptions at "+width+"px");
    await page.close();
    console.log("QURAN_SURAH_GRID_OK",width,expected+" columns");
  }
} finally {
  await browser?.close();
  server.close();
}
