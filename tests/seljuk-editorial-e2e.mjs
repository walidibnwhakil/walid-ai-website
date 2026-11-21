import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {chromium} from "playwright";

const root = new URL("../", import.meta.url);
const source = await readFile(new URL("others/history/seljuk-empire/index.html", root), "utf8");
const expectedChapterCount = 23;
const chapters = [...source.matchAll(/<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)<\/h2>([\s\S]*?)<\/section>/g)];
const toc = [...source.matchAll(/<a href="#chapter-(\d+)">([^<]*)<\/a>/g)];
assert.equal(chapters.length, expectedChapterCount, "Seljuk book should have 23 complete chapters");
assert.equal(toc.length, chapters.length, "TOC entries must match chapter count");
assert.match(source, /<html lang="bn">/);
assert.match(source, /rel="canonical" href="https:\/\/walid-ai\.com\/others\/history\/seljuk-empire\/"/);
assert.match(source, /<meta name="description" content="[^"]{65,220}"/);
assert.match(source, /\/others\/assets\/books\.css/);
assert.match(source, /\/others\/assets\/reader\.js/);
assert.equal((source.match(/class="legal-footer"/g) || []).length, 1, "Exactly one footer");
assert.equal((source.match(/class="others-toc-dialog"/g) || []).length, 1, "Exactly one TOC sidebar");
assert.doesNotMatch(source, /class="others-(?:sources|next)"/, "Removed source/other-story blocks must stay removed");
for (const referenceName of [
  "এনসাইক্লোপিডিয়া ইরানিকা: মালিক শাহ",
  "আহমদ সানজার",
  "এন্ড্রু পিকক: সেলজুকস অব রুম",
]) assert(source.includes(referenceName), "Source attribution text missing: " + referenceName);
assert.doesNotMatch(source, /<a\\b[^>]*href="https?:\\/\\//, "In-text sources must not be clickable");
const existingParagraphs = new Set();
for (const [i, chapter] of chapters.entries()) {
  assert.equal(+chapter[1], i + 1, "Chapters must have contiguous IDs");
  assert.equal(+toc[i][1], i + 1, "TOC must have contiguous links");
  assert.equal(toc[i][2], chapter[2], "TOC title must equal chapter heading");
  const paragraphs = [...chapter[3].matchAll(/<p>(.*?)<\/p>/g)].map(m => m[1].trim());
  assert(paragraphs.length >= 10, "Chapter " + (i + 1) + " must have at least ten developed paragraphs");
  assert(paragraphs.every(p => p.length >= 150), "Chapter " + (i + 1) + " has a too-short paragraph");
  assert(chapter[3].length >= 3500, "Chapter " + (i + 1) + " is unexpectedly short");
  for (const paragraph of paragraphs) {
    assert(!existingParagraphs.has(paragraph), "Duplicate long paragraph in chapter " + (i + 1));
    existingParagraphs.add(paragraph);
  }
}
for (const [number, needle] of [
  [3, "১০৫৫"], [5, "২৬ আগস্ট ১০৭১"], [7, "নিজামুল মুলক"],
  [8, "তেরকেন খাতুন"], [11, "১১৪১"], [12, "১১৯৪"],
  [14, "১০৯৭"], [16, "১১৭৬"], [20, "১২৪৩"], [22, "১৩০৮"],
  [2, "১০৪১"], [5, "ইউদোকিয়া"], [5, "মিখাইল সপ্তম"],
  [7, "জুবাইদা খাতুন"], [8, "মাহমুদের শৈশব"], [11, "ইয়েলু দাশি"],
  [12, "ইলদেগিজ"], [13, "একাদশ শতকের সত্তরের দশকে"],
  [15, "তৃতীয় কনরাড"], [18, "ট্রেবিজন্দের"],
  [19, "মাহপেরি"], [21, "১২৫৬"], [21, "কারাতাই"],
  [22, "ইলখানীয়"], [23, "প্রাথমিক বিবরণের সঙ্গে আধুনিক গবেষণা"]
]) assert(chapters[number - 1][3].includes(needle), "Chronological event missing from chapter " + number);

// Editorial chronology guards: avoid projecting the Il-khanate backward into 1243.
assert.doesNotMatch(chapters[19][3], /১২৫৬/, "Köse Dağ chapter must not jump ahead to the founding of the Il-khanate");
assert.match(chapters[19][3], /বৃহত্তর মোঙ্গল সাম্রাজ্যের প্রতিনিধি/, "1243 Mongol command needs its contemporary political context");
assert.doesNotMatch(source, /জঙ্গি শাসক নূরুদ্দিন/, "The Zengid dynasty must not be misidentified in Bengali");
assert.doesNotMatch(source, /সময়রেখা ইচ্ছাকৃতভাবে/, "Avoid editorial instructions within historical narrative");
assert.match(chapters[15][3], /জেঙ্গি শাসক নূরুদ্দিন/, "Nūr al-Dīn Zengid's dynasty must be named correctly");

const types = {".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript",
  ".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp",
  ".ttf":"font/ttf",".ico":"image/x-icon"};
const server = createServer(async (request, response) => {
  let pathname = new URL(request.url, "http://127.0.0.1").pathname;
  if (pathname.endsWith("/")) pathname += "index.html";
  if (pathname.includes("..")) {response.writeHead(404).end(); return;}
  const relative = pathname.slice(1);
  try {
    const bytes = await readFile(new URL(relative, root));
    response.writeHead(200, {"content-type": types[relative.match(/\.[^.]+$/)?.[0]] || "application/octet-stream"});
    response.end(bytes);
  } catch {
    response.writeHead(404).end("Not found");
  }
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const origin = "http://127.0.0.1:" + server.address().port;
const widths = [320, 375, 768, 1280];
let browser, browserChecks = 0, sidebarChecks = 0;
try {
  browser = await chromium.launch({headless: true});
  for (const width of widths) {
    const page = await browser.newPage({viewport:{width, height:850}, deviceScaleFactor:1});
    const pageErrors = [];
    page.on("pageerror", err => pageErrors.push(err.message));
    await page.route("**/*", request => new URL(request.request().url()).origin === origin ? request.continue() : request.abort());
    const response = await page.goto(origin + "/others/history/seljuk-empire/", {waitUntil:"load"});
    assert.equal(response.status(), 200, "Book page should load at " + width);
    await page.evaluate(() => document.fonts.ready);
    const layout = await page.evaluate(() => ({
      viewport: innerWidth,
      width: document.documentElement.scrollWidth,
      chapterCount: document.querySelectorAll(".others-chapter").length,
      chapterHeadings: [...document.querySelectorAll(".others-chapter > h2")].map(x => x.textContent.trim()),
      tocUrls: [...document.querySelectorAll(".others-toc-dialog a[href^='#chapter-']")].map(x => x.getAttribute("href")),
      logoLoaded: document.querySelector(".others-brand img")?.naturalWidth > 0,
      footerCount: document.querySelectorAll(".legal-footer").length,
      footerLinks: [...document.querySelectorAll(".legal-footer a")].map(a => a.getAttribute("href")),
      flower: getComputedStyle(document.body, "::before").backgroundImage.includes("walid-ai-approved-flower.png"),
      font: getComputedStyle(document.querySelector(".others-chapter p")).fontFamily,
      noOtherStories: !document.querySelector(".others-next, .others-sources"),
      h1: document.querySelector("h1")?.textContent?.trim(),
    }));
    assert(layout.width <= width + 2, "Horizontal overflow at " + width + "px: " + JSON.stringify(layout));
    assert.equal(layout.chapterCount, expectedChapterCount, "Incorrect rendered chapter count at " + width);
    assert.equal(layout.logoLoaded, true, "Approved logo not loaded at " + width);
    assert.equal(layout.footerCount, 1, "Footer missing or duplicated at " + width);
    assert.deepEqual(layout.footerLinks, ["/about-us/", "/contact-us/", "/privacy-policy/", "/terms-of-service/"]);
    assert.equal(layout.flower, true, "Kathgolap flower background missing");
    assert(layout.font.includes("SolaimanLipi"), "Bengali reader font changed");
    assert.equal(layout.noOtherStories, true, "Disallowed related-book/source sections reappeared");
    assert(layout.h1.includes("সেলজুক সাম্রাজ্য"));
    assert.deepEqual(layout.tocUrls, chapters.map((_, i) => "#chapter-" + (i + 1)));
    assert.deepEqual(layout.chapterHeadings, chapters.map(ch => ch[2]));
    assert.deepEqual(pageErrors, [], "Browser runtime errors: " + JSON.stringify(pageErrors));
    if (width === 375 || width === 1280) {
      await page.locator(".others-toc-trigger").click();
      assert.equal(await page.locator(".others-toc-dialog").evaluate(n => n.open), true, "TOC drawer did not open");
      const drawer = await page.locator(".others-toc-dialog").boundingBox();
      assert(drawer.x >= -2 && drawer.x + drawer.width <= width + 2, "TOC drawer overflows viewport");
      await page.locator('.others-toc-dialog a[href="#chapter-23"]').click();
      await page.waitForFunction(() => location.hash === "#chapter-23" && !document.querySelector(".others-toc-dialog").open);
      assert.equal(await page.locator("body").evaluate(n => n.classList.contains("others-toc-open")), false);
      await page.locator(".others-toc-trigger").click();
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector(".others-toc-dialog").open);
      sidebarChecks++;
    }
    browserChecks++;
    await page.close();
  }
  console.log("SELJUK_EDITORIAL_E2E_PASS", JSON.stringify({
    chapters: chapters.length, uniqueParagraphs: existingParagraphs.size,
    viewportChecks: browserChecks, tocInteractionChecks: sidebarChecks, widths
  }));
} finally {
  await browser?.close();
  const closed = new Promise(resolve => server.close(resolve));
  server.closeAllConnections();
  await closed;
}
