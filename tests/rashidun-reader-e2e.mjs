import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {chromium} from "playwright";

const root = new URL("../", import.meta.url);
const path = "others/history/rashidun-caliphate/index.html";
const html = await readFile(new URL("../" + path, import.meta.url), "utf8");
const chapters = [...html.matchAll(/<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)<\/h2>([\s\S]*?)<\/section>/g)];
const toc = [...(html.match(/<nav class="others-toc" aria-label="অধ্যায় তালিকা">([\s\S]*?)<\/nav>/)?.[1] || "").matchAll(/<li><a href="#chapter-(\d+)">(.*?)<\/a><\/li>/g)];
assert.equal(chapters.length, 29, "Expected 29 chronological Rashidun chapters");
assert.equal(toc.length, chapters.length, "TOC entries must match chapter count");
assert.ok(html.includes("অধ্যায়সূচি — ২৯টি অধ্যায়"), "TOC heading is stale");
const seen = new Set();
let paragraphs = 0, words = 0;
for (const [index, c] of chapters.entries()) {
  assert.equal(Number(c[1]), index + 1, "Chapter number sequence broken");
  assert.equal(Number(toc[index][1]), Number(c[1]), "TOC chapter link mismatch");
  assert.equal(toc[index][2], c[2], "TOC label mismatch");
  const ps = [...c[3].matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m => m[1].replace(/<[^>]+>/g, "").trim());
  assert.ok(ps.length >= 7, "Thin chapter " + c[1]);
  for (const p of ps) {
    assert.ok(p.length >= 180, "Underdeveloped passage in chapter " + c[1]);
    assert.ok(!seen.has(p), "Duplicate historical paragraph " + c[1]);
    seen.add(p);
    paragraphs++;
    words += p.split(/\s+/).length;
  }
}
assert.ok(paragraphs >= 280, "History was shortened: " + paragraphs);
assert.ok(words >= 16000, "Book reverted to an abbreviated synopsis: " + words);
const facts = {
  1:["৬৩২","ফাতিমা","সুন্নি","শিয়া"],
  2:["সাকিফা","আলী","আবু বকর","ফাদাক"],
  3:["উমর","আয়িশা","মুহাম্মদ ইবন আবি বকর"],
  4:["রিদ্দা","খালিদ","মালিক ইবন নুওয়াইরা"],
  5:["ইয়ামামা","মুসায়লিমা","যায়েদ","হাফসা"],
  6:["সিরিয়া","ইরাক","৬৩৪"],
  7:["উমর","হাফসা","হেরাক্লিয়াস"],
  8:["আবু উবায়দা","দামেস্ক","খালিদ"],
  9:["ইয়ারমুক","৬৩৬","বাইজেন্টাইন"],
  10:["কাদিসিয়া","রুস্তম","সাদ"],
  11:["জেরুজালেম","সোফ্রোনিয়ুস","মুয়াবিয়া"],
  12:["মিসর","আমর ইবনুল আস","ফুস্তাত"],
  13:["নহাবন্দ","ইয়াজদেগার্দ","৬৫১"],
  14:["দিওয়ান","খারাজ","আমওয়াস","হিজরি"],
  15:["৬৪৪","আবু লুলুআ","আবদুর রহমান ইবন আওফ"],
  16:["উসমান","নায়িলা","মারওয়ান"],
  17:["উসমান","হুযাইফা","হাফসা","মুসহাফ"],
  18:["সাইপ্রাস","নৌ","ইয়াজদেগার্দ"],
  19:["কুফা","মিসর","আবদুল্লাহ ইবন সাবা"],
  20:["৬৫৬","উসমান","মুহাম্মদ ইবন আবি বকর","মুয়াবিয়া"],
  21:["আলী","হাসান","হুসাইন","মালিক আল-আশতার"],
  22:["জামাল","আয়িশা","তালহা","যুবাইর"],
  23:["সিফফিন","মুয়াবিয়া","উসমান"],
  24:["৬৫৭","আম্মার","সালিশ"],
  25:["আবু মুসা","আমর ইবনুল আস","সালিশ"],
  26:["নাহরাওয়ান","৬৫৮","খারিজি"],
  27:["মুহাম্মদ ইবন আবি বকর","ইবন মুলজাম","৬৬১"],
  28:["হাসান","মুয়াবিয়া","৬৬১","সমঝোতা"],
  29:["আল-তাবারি","আল-বালাজুরি","সুন্নি","শিয়া"]
};
for (const [index, tokens] of Object.entries(facts)) for (const token of tokens)
  assert.ok(chapters[Number(index)-1][3].includes(token), "Missing milestone " + index + ": " + token);
assert.ok(html.includes('rel="canonical" href="https://walid-ai.com/others/history/rashidun-caliphate/"'));
assert.ok(html.includes("/walid-ai-approved-logo.png"));
assert.ok(html.includes("/others/assets/books.css"));
assert.ok(html.includes("/others/assets/reader.js"));
assert.equal((html.match(/class="legal-footer"/g)||[]).length,1);
assert.ok(!/class="others-(sources|next)"/.test(html));
assert.ok(!html.includes("উৎস ও পরবর্তী পাঠ"));
assert.ok(!html.includes("RASHIDUN_DRAFT_NEXT"));
assert.ok(chapters.every(c => [...c[3].matchAll(/<p>([\s\S]*?)<\/p>/g)].length >= 8), "A chapter has reverted to brief formulaic coverage");
const evidence = {
  2: ["বুখারির ৪২৪০", "ফাতিমা", "সাকিফা"],
  4: ["মালিক ইবন নুওয়াইরা", "লায়লা বিনতে মিনহাল"],
  5: ["বুখারির ৪৯৮৬", "হাফসা", "যায়েদ"],
  10: ["রুস্তম", "সেতুর যুদ্ধ", "তেসিফন"],
  11: ["শুরূত উমর", "সোফ্রোনিয়ুস"],
  12: ["প্যাপিরাস", "ফুস্তাত", "আমর ইবনুল আস"],
  14: ["দিওয়ান", "জিজিয়া", "খারাজ", "প্যাপিরাস"],
  17: ["বুখারির ৪৯৮৭", "হুযাইফা", "মুসহাফ"],
  20: ["নায়িলা", "মুহাম্মদ ইবন আবি বকর", "মারওয়ান"],
  24: ["আম্মার", "সালিশ", "ইউফ্রেটিস"],
  25: ["সালিশচুক্তির আধুনিক গবেষণায়", "আবু মুসা", "আমর ইবনুল আস"],
  26: ["হারুরা", "নাহরাওয়ান", "নাগরিক নিরাপত্তা"],
  28: ["হাসান", "মুয়াবিয়া", "৬৬১", "শর্ত"]
};
for (const [index, anchors] of Object.entries(evidence))
  for (const token of anchors) assert.ok(chapters[Number(index) - 1][3].includes(token), "Lost evidence anchor in chapter " + index + ": " + token);
for (const source of ["https://sunnah.com/bukhari:4240","https://sunnah.com/bukhari:4986","https://sunnah.com/bukhari:4987","https://doi.org/10.1093/jis/etac001"])
  assert.ok(html.includes('href="' + source + '"'), "Missing accessible inline evidence link: " + source);


const contentTypes={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".png":"image/png",".ico":"image/x-icon",".ttf":"font/ttf",".woff2":"font/woff2"};
const server=createServer(async(req,res)=>{
  let pathname=new URL(req.url,"http://127.0.0.1").pathname;
  if(pathname.endsWith("/"))pathname+="index.html";
  if(pathname.includes("..")){res.writeHead(400).end();return;}
  try{
    const b=await readFile(new URL(pathname.slice(1),root));
    res.writeHead(200,{"content-type":contentTypes[pathname.match(/\.[^.]+$/)?.[0]||""]||"application/octet-stream"});
    res.end(b);
  }catch{res.writeHead(404).end("not found");}
});
server.listen(0,"127.0.0.1");
await once(server,"listening");
const origin="http://127.0.0.1:"+server.address().port;
let browser,interactions=0;
try{
  browser=await chromium.launch({headless:true});
  for(const width of [320,375,768,1280]){
    const page=await browser.newPage({viewport:{width,height:840},deviceScaleFactor:1});
    await page.route("**/*",r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    const response=await page.goto(origin+"/others/history/rashidun-caliphate/",{waitUntil:"load"});
    assert.equal(response.status(),200,"Reader page failed");
    await page.evaluate(()=>document.fonts.ready);
    const state=await page.evaluate(()=>({
      width:innerWidth,scroll:document.documentElement.scrollWidth,
      logo:document.querySelector(".others-brand img")?.naturalWidth>0,
      flower:getComputedStyle(document.body,"::before").backgroundImage.includes("walid-ai-approved-flower"),
      font:getComputedStyle(document.body).fontFamily,
      chapters:document.querySelectorAll(".others-chapter").length,
      toc:document.querySelectorAll(".others-toc a[href^='#chapter-']").length,
      footers:document.querySelectorAll(".legal-footer").length,
      canonical:document.querySelector('link[rel="canonical"]')?.href
    }));
    assert.equal(state.chapters,29);
    assert.equal(state.toc,29);
    assert.equal(state.footers,1);
    assert.ok(state.logo&&state.flower&&state.font.includes("SolaimanLipi"),"Branding regression "+JSON.stringify(state));
    assert.ok(state.scroll<=width+2,"Horizontal overflow "+JSON.stringify(state));
    assert.equal(state.canonical,"https://walid-ai.com/others/history/rashidun-caliphate/");
    assert.deepEqual(errors,[],"Browser JS errors");
    if(width===375||width===1280){
      await page.locator(".others-toc-trigger").click();
      assert.equal(await page.locator(".others-toc-dialog").evaluate(x=>x.open),true,"TOC did not open");
      const rect=await page.locator(".others-toc-dialog").boundingBox();
      assert.ok(rect.x>=-2&&rect.x+rect.width<=width+2,"TOC drawer overflow");
      await page.locator('.others-toc a[href="#chapter-29"]').click();
      await page.waitForFunction(()=>location.hash==="#chapter-29"&&!document.querySelector(".others-toc-dialog").open);
      await page.locator(".others-toc-trigger").click();
      await page.keyboard.press("Escape");
      await page.waitForFunction(()=>!document.querySelector(".others-toc-dialog").open);
      interactions++;
    }
    await page.close();
  }
  console.log("RASHIDUN_BROWSER_PASS",JSON.stringify({chapters:chapters.length,paragraphs,words,viewports:[320,375,768,1280],interactions}));
}finally{
  await browser?.close();
  const done=new Promise(resolve=>server.close(resolve));
  server.closeAllConnections();
  await done;
}
