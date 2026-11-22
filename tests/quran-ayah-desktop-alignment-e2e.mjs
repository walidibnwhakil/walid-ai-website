/* Desktop Quran ayah alignment: keep Arabic alongside its number; don't alter mobile. */
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {extname} from "node:path";
import {chromium} from "playwright";

const root = new URL("../", import.meta.url);
const mime = {".html":"text/html; charset=utf-8",".css":"text/css",
  ".js":"text/javascript",".json":"application/json",".svg":"image/svg+xml",".png":"image/png"};
const server = createServer(async (req,res) => {
  let path = new URL(req.url,"http://127.0.0.1").pathname;
  if (path.includes("..")) return void res.writeHead(400).end();
  if (path.endsWith("/")) path+="index.html";
  try {
    const bytes=await readFile(new URL(path.slice(1),root));
    res.writeHead(200,{"content-type":mime[extname(path)] || "application/octet-stream"}).end(bytes);
  } catch {res.writeHead(404).end("Not found");}
});
server.listen(0,"127.0.0.1");await once(server,"listening");
const base="http://127.0.0.1:"+server.address().port;
let browser;
try{
  browser=await chromium.launch({headless:true});
  for(const width of [375,768,899,900,1024,1280]){
    const page=await browser.newPage({viewport:{width,height:800}});
    const errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    await page.route("**/*",route=>
      new URL(route.request().url()).origin===base?route.continue():route.abort());
    await page.goto(base+"/islam/quran/al-baqarah/",{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.body.classList.contains("quran-reader-page") &&
      document.getElementById("ayah-1")?.querySelector(".arabic"));
    const result=await page.evaluate(()=>{
      const samples=[1,2,3,25,286].map(n=>{
        const card=document.getElementById("ayah-"+n);
        const number=card.querySelector(".ayah-number");
        const arabic=card.querySelector(".arabic");
        const translation=card.querySelector(".translation");
        const r=el=>el.getBoundingClientRect();
        const a=r(arabic),num=r(number),v=r(card),tr=r(translation);
        return {n,display:getComputedStyle(card).display,card:{left:v.left,right:v.right,top:v.top},
          number:{left:num.left,right:num.right,top:num.top},
          arabic:{left:a.left,right:a.right,top:a.top,bottom:a.bottom},
          translation:{left:tr.left,top:tr.top},
          clipped:arabic.scrollWidth>arabic.clientWidth+3};
      });
      const basmala=document.querySelector("#verses>.ayah.basmala");
      return {samples,basmalaDisplay:basmala&&getComputedStyle(basmala).display};
    });
    assert.deepEqual(errors,[],"No Quran reader JavaScript errors at "+width+"px");
    for(const v of result.samples){
      assert.equal(v.display,"grid","Ayat card grid at "+width+", ayah "+v.n);
      assert.ok(v.number.right<=v.arabic.left+3,
        "Ayat number must be left of Arabic at "+width+", ayah "+v.n+": "+JSON.stringify(v));
      // Phone styling is already approved. Only desktop needs top-of-first-line
      // alignment; mobile intentionally centers the number for wrapped ayahs.
      if (width >= 900) {
        assert.ok(Math.abs(v.number.top-v.arabic.top)<28,
          "Arabic must start beside number instead of below it at "+width+", ayah "+v.n+": "+JSON.stringify(v));
      }
      assert.ok(v.translation.top>=v.arabic.bottom-3,
        "Translation must remain below Arabic at "+width+", ayah "+v.n);
      assert.equal(v.clipped,false,"Arabic line must not be clipped at "+width+", ayah "+v.n);
      assert.ok(v.arabic.right<=v.card.right+3,"Arabic remains within ayah card");
    }
    assert.ok(result.basmalaDisplay,"Basmala must still display at "+width);
    await page.close();
    console.log("QURAN_AYAH_DESKTOP_ALIGNMENT_OK",width);
  }
}finally{await browser?.close();server.close();}
