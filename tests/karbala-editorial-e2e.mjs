import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {chromium} from "playwright";

const root = new URL("../", import.meta.url);
const path = "others/history/karbala/index.html";
const html = await readFile(new URL(path, root), "utf8");
const chapters = [...html.matchAll(/<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)<\/h2>([\s\S]*?)<\/section>/g)];
const toc = [...html.matchAll(/<li><a href="#chapter-(\d+)">(.*?)<\/a><\/li>/g)];
assert.equal(chapters.length, 16, "Karbala must have 16 integrated chapters");
assert.equal(toc.length, chapters.length, "Karbala TOC must list every chapter");
assert(html.includes("অধ্যায়সূচি — 16টি অধ্যায়"), "TOC count label must stay in sync");
const seen = new Set();
for (let i = 0; i < chapters.length; i++) {
  assert.equal(Number(chapters[i][1]), i + 1, "Chapter numbering");
  assert.equal(Number(toc[i][1]), i + 1, "TOC numbering");
  assert.equal(chapters[i][2], toc[i][2], "TOC label must match chapter heading");
  const paragraphs = [...chapters[i][3].matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m => m[1]);
  assert(paragraphs.length >= 7, "Chapter " + (i+1) + " is too abbreviated");
  assert(chapters[i][3].length >= 1450, "Chapter " + (i+1) + " lost substantive detail");
  for (const p of paragraphs) {
    assert(p.length >= 120, "Chapter " + (i+1) + " contains a thin paragraph");
    assert(!seen.has(p), "Exact duplicate paragraph in chapter " + (i+1));
    seen.add(p);
  }
}
for (const [n, keywords] of [
  [1, ["৬৫৬", "৬৬১", "হাসান"]], [2, ["ইয়াজিদ", "৬৮০"]],
  [3, ["মক্কা", "মুসলিম ইবন আকিল"]], [4, ["হানি", "ইবন জিয়াদ"]],
  [5, ["জিলহজ", "মুসলিম"]], [6, ["আল-হুর", "২ মহররম"]],
  [7, ["উমর ইবন সাদ", "চার হাজার"]], [8, ["উকবা ইবন সিমআন", "শিমর"]],
  [9, ["ফোরাত", "আব্বাস"]], [10, ["১০ মহররম", "আল-হুর"]],
  [11, ["আলী আকবর", "আব্বাস", "আলী ইবনুল হুসাইন"]],
  [12, ["হুসাইন", "শিমর"]], [13, ["জয়নাব", "কুফা"]],
  [14, ["ইয়াজিদ", "ম্যাডেলুং", "দামেস্ক"]],
  [15, ["জয়নাব", "তাওয়াবুন", "মুখতার", "৬৮৭"]],
  [16, ["আবু মিখনাফ", "আল-তাবারি", "আশুরা"]]
]) {
  for (const word of keywords) assert(chapters[n-1][3].includes(word), "Chapter " + n + " missing " + word);
}
for (const required of [
  'href="https://walid-ai.com/others/history/karbala/"',
  "/walid-ai-approved-logo.png", "/others/assets/books.css",
  "/others/assets/reader.js", 'class="legal-footer"',
  'href="/about-us/"', 'href="/privacy-policy/"',
  'href="/terms-of-service/"'
]) assert(html.includes(required), "Missing canonical/branding/footer: " + required);
assert.equal((html.match(/class="legal-footer"/g)||[]).length, 1, "Only one shared footer");
assert.equal((html.match(/class="others-toc-dialog"/g)||[]).length, 1, "Only one TOC dialog");
assert(!/উৎস ও পরবর্তী পাঠ|class="others-(?:sources|next)"|এই অধ্যায়ের উদ্দেশ্য/.test(html), "Obsolete copy reappeared");

const mime = {".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript",
  ".png":"image/png",".svg":"image/svg+xml",".ttf":"font/ttf",".ico":"image/x-icon"};
const server=createServer(async (req,res)=>{
  let pathname=new URL(req.url,"http://127.0.0.1").pathname;
  if(pathname.endsWith("/"))pathname+="index.html";
  if(pathname.includes("..")) {res.writeHead(400).end();return;}
  const relative=pathname.slice(1);
  try {
    const bytes=await readFile(new URL(relative,root));
    const ext=relative.match(/\.[^.]+$/)?.[0];
    res.writeHead(200,{"content-type":mime[ext]||"application/octet-stream"});
    res.end(bytes);
  } catch {res.writeHead(404).end("Missing");}
});
server.listen(0,"127.0.0.1");
await once(server,"listening");
const origin="http://127.0.0.1:"+server.address().port;
let browser, browserChecks=0;
try{
  browser=await chromium.launch({headless:true});
  for(const width of [320,375,768,1280]){
    const page=await browser.newPage({viewport:{width,height:800}});
    const errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    await page.route("**/*",r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    const response=await page.goto(origin+"/others/history/karbala/",{waitUntil:"load"});
    assert.equal(response.status(),200,"Reader HTTP 200");
    const layout=await page.evaluate(()=>{
      const logo=document.querySelector(".others-brand img");
      const bg=getComputedStyle(document.body,"::before");
      return {
        fullWidth:document.documentElement.scrollWidth,viewport:innerWidth,
        chapterCount:document.querySelectorAll(".others-chapter").length,
        tocCount:document.querySelectorAll('.others-toc a[href^="#chapter-"]').length,
        logo:logo?.naturalWidth>0,
        flower:bg.backgroundImage.includes("walid-ai-approved-flower"),
        rotation:bg.animationDuration,
        font:getComputedStyle(document.body).fontFamily,
        footerCount:document.querySelectorAll(".legal-footer").length
      };
    });
    assert(layout.fullWidth<=width+2,"Horizontal overflow at "+width+": "+JSON.stringify(layout));
    assert.equal(layout.chapterCount,16,"Missing chapters at "+width);
    assert.equal(layout.tocCount,16,"TOC lost items at "+width);
    assert(layout.logo,"Original logo failed to load at "+width);
    assert(layout.flower,"Kathgolap background is absent at "+width);
    assert(layout.rotation.includes("10s"),"Flower rotation changed at "+width);
    assert(layout.font.includes("SolaimanLipi"),"SolaimanLipi styling missing at "+width);
    assert.equal(layout.footerCount,1,"Duplicate or missing footer");
    await page.locator(".others-toc-trigger").click();
    assert(await page.locator("#others-toc-panel").evaluate(node=>node.open),"TOC failed to open");
    await page.locator('.others-toc a[href="#chapter-13"]').click();
    assert.equal(new URL(page.url()).hash,"#chapter-13","TOC anchor broken");
    assert(!(await page.locator("#others-toc-panel").evaluate(node=>node.open)),"TOC failed to close on navigation");
    assert.deepEqual(errors,[],"Browser JavaScript errors");
    await page.close();
    browserChecks++;
  }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
console.log("Karbala editorial + responsive browser checks passed:", chapters.length, "chapters,", browserChecks,"viewports");
