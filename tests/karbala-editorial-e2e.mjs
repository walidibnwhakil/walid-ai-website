import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {chromium} from "playwright";

const root = new URL("../", import.meta.url);
const path = "others/history/ali-hasan-husayn-karbala/index.html";
const html = await readFile(new URL(path, root), "utf8");
const chapters = [...html.matchAll(/<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)<\/h2>([\s\S]*?)<\/section>/g)];
const toc = [...html.matchAll(/<li><a href="#chapter-(\d+)">(.*?)<\/a><\/li>/g)];
assert.equal(chapters.length, 49, "Merged history must contain 49 integrated chapters");
assert.equal(toc.length, chapters.length, "Every chapter needs an index entry");
assert(html.includes("অধ্যায়সূচি — 49টি অধ্যায়"), "TOC label must match chapter count");
const seen = new Set();
for (let i = 0; i < chapters.length; i++) {
  const [full, number, heading, body] = chapters[i];
  assert.equal(Number(number), i + 1, "Chapter numbers must be sequential");
  assert.equal(Number(toc[i][1]), i + 1, "TOC numbers must be sequential");
  assert.equal(toc[i][2], heading, "Heading and TOC must match");
  const paragraphs = [...body.matchAll(/<p>(.*?)<\/p>/g)].map(m => m[1]);
  assert(paragraphs.length >= 5, "Chapter " + number + " lost developed prose");
  assert(body.length >= 1700, "Chapter " + number + " lost substantive narrative");
  for (const paragraph of paragraphs) {
    assert(paragraph.length >= 95, "Thin paragraph in chapter " + number);
    assert(!seen.has(paragraph), "Duplicate paragraph in " + number);
    seen.add(paragraph);
  }
}
// Word and paragraph counts are *regression guardrails*, not a declaration that the history is complete.
let totalWords = 0;
for (const [, number, , body] of chapters) {
  const text = [...body.matchAll(/<p>(.*?)<\/p>/g)].map(m => m[1].replace(/<[^>]+>/g, "")).join(" ");
  const count = text.trim().split(/\s+/).length;
  assert(count >= 330, "Chapter " + number + " has become a short synopsis (" + count + " words)");
  totalWords += count;
  assert(body.includes('href="/others/history/ali-hasan-husayn-karbala/evidence/#chapter-' + number + '"'),
    "Missing chapter evidence link " + number);
}
assert(totalWords >= 24000, "Book unexpectedly lost developed historical detail: " + totalWords);
const researchPage = await readFile(new URL("others/history/ali-hasan-husayn-karbala/evidence/index.html", root), "utf8");
assert(researchPage.includes('href="https://walid-ai.com/others/history/ali-hasan-husayn-karbala/evidence/"'), "Evidence page canonical missing");
assert.equal((researchPage.match(/<section class="others-chapter" id="chapter-\d+">/g) || []).length, chapters.length, "Evidence page must cover every chapter");
for (let chapter = 1; chapter <= chapters.length; chapter++)
  assert(researchPage.includes('id="chapter-' + chapter + '"'), "Missing evidence anchor " + chapter);
const notes = await readFile(new URL("others/history/ali-hasan-husayn-karbala/research-notes.md", root), "utf8");
assert(notes.includes("সনদ") && notes.includes("সীমাবদ্ধতা"), "Research limitations missing");

for (const [chapter, keywords] of [
  [5, ["ফাতিমা", "হাসান", "হুসাইন"]],
  [10, ["ফাদাক", "ফাতিমা", "আবু বকর"]],
  [12, ["মাইসুন", "বনু কালব", "ইয়াজিদ"]],
  [13, ["উসমান", "আলী"]],
  [16, ["মুয়াবিয়া", "সিফফিন"]],
  [18, ["ইবন মুলজিম", "আলী"]],
  [21, ["হাসান", "মুয়াবিয়া", "সমঝোতা"]],
  [23, ["হাসান", "বিষপ্রয়োগ"]],
  [24, ["ইয়াজিদ", "মাইসুন", "সন্তান"]],
  [28, ["মুসলিম ইবন আকিল", "ইবন জিয়াদ"]],
  [30, ["আল-হুর", "কারবালা"]],
  [34, ["আব্বাস", "আলী আকবর", "কাসিম", "হুসাইন"]],
  [35, ["জয়নাব", "আলী ইবনুল হুসাইন"]],
  [37, ["হাররা", "মক্কা", "ইয়াজিদ"]],
  [40, ["তাওয়াবুন", "সুলাইমান"]],
  [43, ["শিমর", "খাওলি", "উমর ইবন সাদ"]],
  [44, ["ইবরাহিম", "ইবন জিয়াদ"]],
  [45, ["মুসআব", "মুখতার"]],
  [47, ["আবদুল মালিক", "ইবন যুবাইর", "৬৯২"]],
  [48, ["জয়নাব", "জয়নুল আবেদিন"]]
]) for (const keyword of keywords)
  assert(chapters[chapter - 1][3].includes(keyword), "Chapter " + chapter + " missing " + keyword);

for (const required of [
  'href="https://walid-ai.com/others/history/ali-hasan-husayn-karbala/"',
  "/walid-ai-approved-logo.png", "/others/assets/books.css",
  "/others/assets/reader.js", 'class="legal-footer"',
  'href="/about-us/"', 'href="/privacy-policy/"',
  'href="/terms-of-service/"', '"@type":"Book"', '"@type":"BreadcrumbList"'
]) assert(html.includes(required), "Missing layout/SEO element: " + required);
assert.equal(html.split('class="legal-footer"').length - 1, 1);
assert.equal(html.split('class="others-toc-dialog"').length - 1, 1);
assert(!/উৎস ও পরবর্তী পাঠ|class="others-(?:sources|next)"/.test(html));

const target = "/others/history/ali-hasan-husayn-karbala/";
for (const old of ["hasan-ibn-ali", "husayn-ibn-ali", "karbala"]) {
  const redirect = await readFile(new URL("others/history/" + old + "/index.html", root), "utf8");
  assert(redirect.includes('http-equiv="refresh"'), "Missing fallback redirect: " + old);
  assert(redirect.includes('name="robots" content="noindex,follow"'));
  assert(redirect.includes('href="https://walid-ai.com' + target + '"'));
  assert(redirect.includes('location.replace('), "Missing JS URL migration: " + old);
  assert(redirect.includes('href="' + target + '"'), "Missing accessible fallback link: " + old);
}
const index = await readFile(new URL("others/history/index.html", root), "utf8");
assert(index.includes('href="' + target + '"'), "New book missing from History index");
for (const old of ["hasan-ibn-ali", "husayn-ibn-ali", "karbala"])
  assert(!index.includes('href="/others/history/' + old + '/"'), "Retired card survived: " + old);
const sitemap = await readFile(new URL("sitemap.xml", root), "utf8");
assert(sitemap.includes("<loc>https://walid-ai.com" + target + "</loc>"));
for (const old of ["hasan-ibn-ali", "husayn-ibn-ali", "karbala"])
  assert(!sitemap.includes("<loc>https://walid-ai.com/others/history/" + old + "/</loc>"));

const mime={".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript",
  ".png":"image/png",".svg":"image/svg+xml",".ttf":"font/ttf",".ico":"image/x-icon"};
const server=createServer(async(req,res)=>{
  let pathname=new URL(req.url,"http://127.0.0.1").pathname;
  if(pathname.endsWith("/"))pathname+="index.html";
  if(pathname.includes("..")) {res.writeHead(400).end();return;}
  try{
    const file=pathname.slice(1),bytes=await readFile(new URL(file,root));
    res.writeHead(200,{"content-type":mime[file.match(/\.[^.]+$/)?.[0]]||"application/octet-stream"});
    res.end(bytes);
  }catch{res.writeHead(404).end("Missing");}
});
server.listen(0,"127.0.0.1");
await once(server,"listening");
const origin="http://127.0.0.1:"+server.address().port;
let browser,checked=0;
try {
  browser=await chromium.launch({headless:true});
  for (const width of [320,375,768,1280]){
    const page=await browser.newPage({viewport:{width,height:800}});
    const errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    await page.route("**/*",r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    const response=await page.goto(origin+target,{waitUntil:"load"});
    assert.equal(response.status(),200);
    const layout=await page.evaluate(()=>{
      const logo=document.querySelector(".others-brand img");
      const background=getComputedStyle(document.body,"::before");
      return {
        width:document.documentElement.scrollWidth,viewport:innerWidth,
        chapters:document.querySelectorAll(".others-chapter").length,
        links:document.querySelectorAll('.others-toc a[href^="#chapter-"]').length,
        logo:logo?.naturalWidth>0,
        flower:background.backgroundImage.includes("walid-ai-approved-flower"),
        rotation:background.animationDuration,
        font:getComputedStyle(document.body).fontFamily,
        footers:document.querySelectorAll(".legal-footer").length
      };
    });
    assert(layout.width<=width+2,"Horizontal overflow at "+width+": "+JSON.stringify(layout));
    assert.equal(layout.chapters,49);
    assert.equal(layout.links,49);
    assert(layout.logo&&layout.flower);
    assert(layout.rotation.includes("10s"));
    assert(layout.font.includes("SolaimanLipi"));
    assert.equal(layout.footers,1);
    await page.locator(".others-toc-trigger").click();
    assert(await page.locator("#others-toc-panel").evaluate(node=>node.open));
    await page.locator('.others-toc a[href="#chapter-44"]').click();
    assert.equal(new URL(page.url()).hash,"#chapter-44");
    assert(!(await page.locator("#others-toc-panel").evaluate(node=>node.open)));
    assert.deepEqual(errors,[]);
    await page.close();
    checked++;
  }

  for (const width of [375, 1280]) {
    const page=await browser.newPage({viewport:{width,height:800}});
    await page.route("**/*",r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    const response=await page.goto(origin + target + "evidence/",{waitUntil:"load"});
    assert.equal(response.status(),200,"Evidence page must load");
    const layout=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,sections:document.querySelectorAll(".history-evidence-page .others-chapter").length,logo:document.querySelector(".others-brand img")?.naturalWidth>0,footers:document.querySelectorAll(".legal-footer").length}));
    assert(layout.width<=width+2,"Evidence page horizontal overflow");
    assert.equal(layout.sections,49);
    assert(layout.logo);
    assert.equal(layout.footers,1);
    await page.close();
  }
}finally{
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
console.log("Merged history integrity, references and responsive checks passed:",chapters.length,"chapters,",totalWords,"words,",checked,"viewports");
