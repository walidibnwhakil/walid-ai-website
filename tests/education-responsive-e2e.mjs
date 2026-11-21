import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {chromium} from "playwright";

const root=new URL("../",import.meta.url);
const types={".html":"text/html",".css":"text/css",".js":"text/javascript",".mjs":"text/javascript",
  ".json":"application/json",".svg":"image/svg+xml",".png":"image/png",
  ".jpg":"image/jpeg",".ttf":"font/ttf",".webp":"image/webp"};
const server=createServer(async(request,response)=>{
  let pathname=new URL(request.url,"http://127.0.0.1").pathname;
  if(pathname.endsWith("/"))pathname+="index.html";
  if(pathname.includes("..")){response.writeHead(404).end();return;}
  const ext=pathname.match(/\.[^.]+$/)?.[0]||"";
  try {
    const bytes=await readFile(new URL(pathname.slice(1),root));
    response.writeHead(200,{"content-type":types[ext]||"application/octet-stream"});
    response.end(bytes);
  }catch {response.writeHead(404).end("Not found");}
});
server.listen(0,"127.0.0.1");
await once(server,"listening");
const origin="http://127.0.0.1:"+server.address().port;
let browser,checks=0;
async function openPage(width) {
  const page=await browser.newPage({viewport:{width,height:850},deviceScaleFactor:1});
  await page.route("**/*",route=>new URL(route.request().url()).origin===origin?
    route.continue():route.abort());
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  const response=await page.goto(origin+"/sections/education/",{waitUntil:"load"});
  assert.equal(response.status(),200);
  await page.locator("#modeSelection").waitFor({state:"visible"});
  return {page,errors};
}
async function start(page,level,count){
  if(await page.locator("#modeSelection").isVisible())await page.locator("#openQuiz").click();
  await page.locator("#quizLevel").selectOption(level);
  await page.locator('input[name="questionCount"][value="'+count+'"]').check();
  await page.locator("#startQuiz").click();
  await page.locator("#quizRunning").waitFor({state:"visible",timeout:20000});
  assert.equal(await page.locator("#quizProgress").evaluate(el=>Number(el.max)),count);
  assert.equal(await page.locator("#questionOptions button").count(),4);
}
try {
  browser=await chromium.launch({headless:true});
  for(const width of [320,360,390,520,600,768,1024,1280]){
    const {page,errors}=await openPage(width);
    const metrics=await page.evaluate(()=>{
      const cards=[...document.querySelectorAll(".mode-card")];
      const rects=cards.map(c=>{const r=c.getBoundingClientRect();return {x:r.x,right:r.right,top:r.top,width:r.width};});
      return {scrollWidth:document.documentElement.scrollWidth,
        cardCount:cards.length,gridColumns:getComputedStyle(document.querySelector(".mode-grid")).gridTemplateColumns.split(/\s+/).length,
        rects,logo:document.querySelector(".edu-header img")?.naturalWidth>0,footer:!!document.querySelector(".legal-footer")};
    });
    assert.equal(metrics.cardCount,2);
    assert.equal(metrics.gridColumns,width<=520?1:2,"columns at "+width);
    assert(metrics.scrollWidth<=width+2,"horizontal overflow at "+width);
    assert(metrics.rects.every(r=>r.x>=-2&&r.right<=width+2),"card out of view at "+width);
    assert(metrics.logo&&metrics.footer);
    assert.deepEqual(errors,[],"JavaScript runtime errors at "+width);
    checks++;
    await page.close();
  }
  const {page,errors}=await openPage(390);
  for(const count of [20,30,40,50,70,100]){
    await start(page,"1",count);
    if(count===100){
      await page.locator("#questionOptions button").first().click();
      await page.locator("#jumpQuestion").selectOption("99");
      assert.match(await page.locator("#quizCounter").innerText(),/১০০/);
      await page.locator("#questionOptions button").nth(1).click();
      assert.equal(await page.locator("#quizProgress").evaluate(e=>e.value),2);
      await page.locator("#finishQuiz").click();
      await page.locator("#finishConfirm").waitFor({state:"visible"});
      await page.locator("#confirmFinish").click();
      await page.locator("#quizResults").waitFor({state:"visible"});
      assert.equal(await page.locator(".review-item").count(),100);
      assert(await page.locator("#subjectBreakdown tr").count()>=4);
      await page.locator('[data-home]').last().click();
    } else {
      await page.locator("#exitQuiz").click();
      await page.locator("#startQuiz").waitFor({state:"visible"});
    }
    checks++;
  }
  for(const [level,count] of [["6",20],["12",40],["admission",70],["bcs",100]]){
    await start(page,level,count);
    assert(await page.locator("#quizSubject").innerText());
    await page.locator("#exitQuiz").click();
    checks++;
  }
  await page.locator("#quizSetup [data-home]").click();
  await page.locator("#openNotes").click();
  await page.locator("#notesSetup").waitFor({state:"visible"});
  for(const [level,subject,min] of [["1","বাংলা",2],["7","বিজ্ঞান",3],["12","ইংরেজি ১ম পত্র",10],["admission","বিজ্ঞান",2],["bcs","মানসিক দক্ষতা",1]]){
    await page.locator("#notesLevel").selectOption(level);
    await page.locator("#notesSubject").selectOption(subject);
    await page.locator("#showNotes").click();
    await page.locator("#notesContent").waitFor({state:"visible"});
    assert((await page.locator(".note-article").count())>=min,level+"/"+subject);
    assert((await page.locator(".note-article h3").first().innerText()).length>4);
    checks++;
  }
  assert.deepEqual(errors,[],"Education browser JS errors");
  await page.close();
  console.log("EDUCATION_RESPONSIVE_PASS",JSON.stringify({checks,viewports:8,counts:[20,30,40,50,70,100],
    grades:[1,6,12],special:["admission","bcs"],notesSamples:5}));
}finally{
  await browser?.close();
  const closed=new Promise(resolve=>server.close(resolve));
  server.closeAllConnections();
  await closed;
}
