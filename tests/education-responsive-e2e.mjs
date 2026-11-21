import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {chromium} from "playwright";
const root=new URL("../",import.meta.url);
const types={".html":"text/html",".css":"text/css",".js":"text/javascript",".mjs":"text/javascript",
 ".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".ttf":"font/ttf"};
const server=createServer(async(request,response)=>{
  let path=new URL(request.url,"http://127.0.0.1").pathname;
  if(path.endsWith("/"))path+="index.html";
  if(path.includes("..")){response.writeHead(404).end();return}
  try{
    const data=await readFile(new URL(path.slice(1),root));
    response.writeHead(200,{"content-type":types[path.match(/\.[^.]+$/)?.[0]]||"application/octet-stream"});
    response.end(data);
  }catch{response.writeHead(404).end("Not found")}
});
server.listen(0,"127.0.0.1");await once(server,"listening");
const origin="http://127.0.0.1:"+server.address().port;
let browser,checks=0;
async function open(width){
  const page=await browser.newPage({viewport:{width,height:840},deviceScaleFactor:1});
  await page.route("**/*",route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  const response=await page.goto(origin+"/sections/education/",{waitUntil:"load"});
  assert.equal(response.status(),200);
  return {page,errors};
}
async function quiz(page,level,stream,count){
  if(await page.locator("#modeSelection").isVisible())await page.locator("#openQuiz").click();
  await page.locator("#quizLevel").selectOption(level);
  if(stream){
    await page.locator("#quizStreamField").waitFor({state:"visible"});
    await page.locator("#quizStream").selectOption(stream);
  }else assert(await page.locator("#quizStreamField").isHidden(),"stream picker should be hidden "+level);
  await page.locator('input[name="questionCount"][value="'+count+'"]').check();
  await page.locator("#startQuiz").click();
  await page.locator("#quizRunning").waitFor({state:"visible",timeout:25000});
  const cards=page.locator("#questionList > article.question-card");
  assert.equal(await cards.count(),count,"All questions should appear in order, not a single pager");
  assert.equal(await page.locator("#quizProgress").evaluate(el=>Number(el.max)),count);
  assert.equal(await cards.first().locator(".question-option").count(),4);
  checks++;
}
try{
  browser=await chromium.launch({headless:true});
  for(const width of [320,360,390,520,600,768,1024,1280]){
    const {page,errors}=await open(width);
    const layout=await page.evaluate(()=>{
      const cards=[...document.querySelectorAll(".mode-card")].map(c=>{
        const r=c.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top}});
      return {cards,columns:getComputedStyle(document.querySelector(".mode-grid")).gridTemplateColumns.split(/\s+/).length,
        scrollWidth:document.documentElement.scrollWidth,logo:document.querySelector(".edu-header img")?.naturalWidth>0,
        footer:!!document.querySelector(".legal-footer")};
    });
    assert.equal(layout.cards.length,2);
    assert.equal(layout.columns,width<=520?1:2);
    assert(layout.scrollWidth<=width+2,"horizontal overflow "+width);
    assert(layout.cards.every(c=>c.left>=-2&&c.right<=width+2));
    assert(layout.logo&&layout.footer);
    assert.deepEqual(errors,[]);
    await page.close();checks++;
  }
  const {page,errors}=await open(390);
  await page.locator("#openQuiz").click();
  const levels=await page.locator("#quizLevel option").evaluateAll(options=>options.map(o=>o.value));
  assert(!["1","2","3","4","5"].some(v=>levels.includes(v)));
  for(const count of [20,30,40,50,70,100]){
    const level=count===100?"bcs":"6";
    await quiz(page,level,null,count);
    if(level==="bcs"){
      const allSubjects=new Set(await page.locator("#questionList .question-card-head .quiz-subject").allInnerTexts());
      assert.equal(allSubjects.size,10,"BCS sample must cover all ten exam topic areas");
      const chapters=await page.locator("#questionList .question-chapter").count();
      assert(chapters>=35,"BCS sample should prioritize prepared chapter questions");
    }
    if(count===20){
      await page.locator("#question-0 .question-option").first().click();
      await page.locator("#question-0 .question-feedback").waitFor({state:"visible"});
      assert.equal(await page.locator("#quizProgress").evaluate(n=>Number(n.value)),1);
      const feedback=await page.locator("#question-0 .question-feedback").innerText();
      assert(/সঠিক|সঠিক নয়/.test(feedback));
      assert.match(feedback,/ব্যাখ্যা/);
      await page.locator("#question-1").waitFor({state:"visible"});
      await page.locator("#finishQuiz").click();
      await page.locator("#finishConfirm").waitFor({state:"visible"});
      await page.locator("#confirmFinish").click();
      await page.locator("#quizResults").waitFor({state:"visible"});
      assert.equal(await page.locator("#reviewList .review-item").count(),20);
      await page.locator("#quizResults [data-home]").click();
    }else{
      await page.locator("#exitQuiz").click();
    }
    if(count<100&&!(await page.locator("#quizSetup").isVisible()))await page.locator("#openQuiz").click();
  }
  await quiz(page,"9","science",20);
  const scienceSubjects=await page.locator("#questionList .question-card-head .quiz-subject").allInnerTexts();
  assert(!scienceSubjects.includes("হিসাববিজ্ঞান"));
  assert(scienceSubjects.some(s=>["রসায়ন","পদার্থবিজ্ঞান","জীববিজ্ঞান","গণিত"].includes(s)));
  const firstStems=await page.locator("#questionList h3").allInnerTexts();
  await page.reload({waitUntil:"load"});
  await quiz(page,"9","science",20);
  const secondStems=await page.locator("#questionList h3").allInnerTexts();
  assert(!secondStems.some(s=>firstStems.includes(s)),"Immediate retest should prefer unseen questions after reload");
  await page.locator("#exitQuiz").click();
  for(const [level,stream,count,forbidden] of [
    ["10","commerce",30,"পদার্থবিজ্ঞান"],
    ["11","arts",40,"জীববিজ্ঞান"],
    ["12","science",50,"হিসাববিজ্ঞান"],
    ["admission","commerce",70,"পদার্থবিজ্ঞান"],
    ["admission","arts",20,"পদার্থবিজ্ঞান"],
    ["admission","science",20,"হিসাববিজ্ঞান"]]){
    await quiz(page,level,stream,count);
    const subjects=await page.locator("#questionList .question-card-head .quiz-subject").allInnerTexts();
    assert(!subjects.includes(forbidden),level+" "+stream+" should not contain "+forbidden);
    await page.locator("#exitQuiz").click();
  }
  await page.locator("#quizSetup [data-home]").click();
  await page.locator("#openNotes").click();
  await page.locator("#notesSetup").waitFor({state:"visible"});
  const noteLevels=await page.locator("#notesLevel option").evaluateAll(options=>options.map(o=>o.value));
  assert(!noteLevels.includes("1"));
  for(const [level,stream,subject,min] of [
    ["6",null,"গণিত",4],["7",null,"বিজ্ঞান",3],
    ["9","science","রসায়ন",3],["10","commerce","হিসাববিজ্ঞান",3],
    ["11","arts","ইতিহাস",3],["12","science","জীববিজ্ঞান",3],
    ["admission","commerce","হিসাববিজ্ঞান",3],["bcs",null,"মানসিক দক্ষতা",1]]){
    await page.locator("#notesLevel").selectOption(level);
    if(stream)await page.locator("#notesStream").selectOption(stream);
    else assert(await page.locator("#notesStreamField").isHidden());
    await page.locator("#notesSubject").selectOption(subject);
    await page.locator("#showNotes").click();
    await page.locator("#notesContent").waitFor({state:"visible"});
    assert((await page.locator(".note-article").count())>=min,level+" "+stream+" "+subject);
    checks++;
  }
  assert.deepEqual(errors,[],"Browser runtime errors");
  await page.close();
  console.log("EDUCATION_STREAMED_E2E_PASS",JSON.stringify({checks,viewports:8,questionCounts:[20,30,40,50,70,100],streams:["science","commerce","arts"],notesExamples:8}));
}finally{
  await browser?.close();
  const closed=new Promise(resolve=>server.close(resolve));
  server.closeAllConnections();await closed;
}