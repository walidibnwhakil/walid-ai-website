// QA ONLY: actual deployed site with physical Play Now / answer-button clicks.
// No production writes, no local HTTP server, no knowledge engine mocks.
import assert from "node:assert/strict";
import {mkdir} from "node:fs/promises";
import {join} from "node:path";
import {chromium} from "playwright";
const base="https://walid-ai.com/games/riddlex/?autotest=1";
const folder=join(process.env.RUNNER_TEMP||".","riddlex-live-evidence");
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true});
let failed=false;
try{
 for(const [name,width,height,artSelector] of [
  ["mobile",390,844,".menu-port"],["desktop",1366,768,".menu-card"]
 ]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  const started=Date.now();
  try{
   const response=await page.goto(base,{waitUntil:"load",timeout:45000});
   assert.equal(response?.status(),200,"live HTTP status "+name);
   assert.ok(page.url().startsWith("https://walid-ai.com/games/riddlex/"));
   assert.ok(await page.locator("#play").isVisible(),"Play Now visible "+name);
   const img=page.locator(artSelector);
   assert.ok(await img.isVisible(),"actual menu artwork visible "+name);
   const pic=await img.evaluate(async el=>{await el.decode();return {width:el.naturalWidth,height:el.naturalHeight}});
   assert.ok(pic.width>100 && pic.height>100,"menu artwork loaded "+name);
   await page.screenshot({path:join(folder,name+"-menu.png"),fullPage:false});
   await page.locator("#play").click({timeout:20000});
   await page.locator('[data-cat="object"]').waitFor({state:"visible",timeout:25000});
   await page.locator('[data-cat="object"]').click();
   await page.waitForFunction(()=>window.__riddlex?.state()?.mode==="ask",null,{timeout:50000});
   const turns=[];
   for(let i=0;i<5;i++){
    const before=await page.evaluate(()=>window.__riddlex?.state());
    if(before.mode!=="ask")break;
    const btn=page.locator('#answer-unknown');
    assert.ok(await btn.isVisible(),"answer button visible "+name);
    await btn.click();
    await page.waitForFunction(old=>{
      const s=window.__riddlex?.state();
      return s&&(s.mode!=="ask"||s.question!==old);
    },before.question,{timeout:50000});
    turns.push(before.question);
   }
   assert.ok(turns.length>=2,"multiple real question-answer interactions "+name);
   assert.deepEqual(errors,[],"page JS errors "+name);
   await page.screenshot({path:join(folder,name+"-game.png"),fullPage:false});
   console.log("RIDDLEX_LIVE_UI_PASS "+JSON.stringify({name,url:page.url(),art:pic,turns,elapsedMs:Date.now()-started,jsErrors:errors}));
  }catch(e){failed=true;console.error("RIDDLEX_LIVE_UI_FAIL "+JSON.stringify({name,url:page.url(),error:String(e.stack||e),jsErrors:errors}));}
  finally{await page.close();}
 }
}finally{await browser.close();}
if(failed)process.exitCode=1;
