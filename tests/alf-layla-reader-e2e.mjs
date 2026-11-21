import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import { chromium } from "playwright";

const root = new URL("../", import.meta.url);
const bookPath = "others/islamic-literature/alf-layla/index.html";
const html = await readFile(new URL("../" + bookPath, import.meta.url), "utf8");
const chapters = [...html.matchAll(/<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)<\/h2>([\s\S]*?)<\/section>/g)];
assert.equal(chapters.length, 14, "Expected 14 selected-story chapters");
assert.deepEqual(chapters.map(c => Number(c[1])), Array.from({length: 14}, (_, i) => i + 1));
const nav = html.match(/<nav class="others-toc" aria-label="অধ্যায় তালিকা">([\s\S]*?)<\/nav>/)?.[1];
assert.ok(nav, "Chapter drawer missing");
const toc = [...nav.matchAll(/<a href="#chapter-(\d+)">(.*?)<\/a>/g)];
assert.equal(toc.length, 14);
const paragraphs = new Set();
let paragraphCount = 0;
for (const [index, chapter] of chapters.entries()) {
  assert.equal(Number(toc[index][1]), Number(chapter[1]), "TOC order");
  assert.equal(toc[index][2], chapter[2], "TOC heading mismatch");
  const ps = [...chapter[3].matchAll(/<p>([\s\S]*?)<\/p>/g)].map(p => p[1].replace(/<[^>]*>/g, "").trim());
  assert.ok(ps.length >= 6, "Underdeveloped chapter " + chapter[1]);
  for (const p of ps) {
    assert.ok(p.length >= 170, "Short paragraph chapter " + chapter[1]);
    assert.ok(!paragraphs.has(p), "Repeated passage chapter " + chapter[1]);
    paragraphs.add(p);
    paragraphCount++;
  }
}
// Narrative regression: a chapter count alone must not hide omitted embedded tales.
assert.ok(paragraphCount >= 125, "Selected tales were reduced to outlines");
const chapterText = n => chapters[n - 1][3];
const mustContain = (n, words) => {
  for (const word of words) {
    assert.ok(chapterText(n).includes(word), "Chapter " + n + " lost nested tale or resolution: " + word);
  }
};
mustContain(1, ["বলদ", "গাধা", "বণিক", "উজির", "দুনিয়াজাদ"]);
mustContain(5, ["টিয়াপাখি", "রাক্ষসী", "দুবান", "বিষ"]);
mustContain(7, ["প্রথম দরবেশ", "দ্বিতীয় দরবেশ", "তৃতীয় দরবেশ", "দুই প্রতিবেশী", "কুয়োয়", "নিষিদ্ধ দরজা"]);
mustContain(8, ["পাথর", "জুবাইদা", "পরি", "দুই বোন", "আমিনা", "দোকানদার"]);
mustContain(9, ["দুই ভাই", "নূরুদ্দিন", "শামসুদ্দিন", "বদরুদ্দিন", "আজিব", "খলিফা"]);
mustContain(10, ["খ্রিস্টান দালালের গল্প", "খাদ্যতত্ত্বাবধায়কের গল্প", "ইহুদি চিকিৎসকের গল্প", "দর্জির গল্প", "নাপিতের কথা", "প্রথম ভাই", "দ্বিতীয় ভাই", "তৃতীয় ভাই", "চতুর্থ ভাই", "পঞ্চম ভাই", "ষষ্ঠ ভাই", "কাঁটা", "সুস্থ"]);

const plainChapter = n => chapterText(n).replace(/<[^>]*>/g, " ");
const wordCount = n => plainChapter(n).trim().split(/\s+/).length;
assert.ok(wordCount(3) >= 850, "Three old men's tales need full narrative arcs, not brief synopses");
assert.ok(wordCount(12) >= 850, "Ebony horse needs its actual travels, abduction and rescue");
mustContain(3, ["গাভিটিকেই জবাই", "রাখাল", "দশ বছর", "কসাই", "তৃতীয় অংশ", "মুক্ত"]);
mustContain(12, ["সাবুর", "ভারতীয়", "গ্রিক", "পারস্যদেশীয়", "ডান পাশের", "অন্য পাশের", "কারিগর", "সানাআ", "শামস আল-নাহার", "অপহরণ", "চিকিৎসক", "মাঠে", "দূত", "আল-আকমার"]);
assert.ok(!chapterText(12).includes("বঙ্গদেশের এক রাজকন্যার আবাসে"), "Galland and Payne/Burton recensions mixed");
assert.ok(!chapterText(12).includes("কাশ্মীরের রাজদরবারে"), "Ebony Horse regional recensions mixed");
assert.ok(chapterText(11).includes("কামার আল-জামান") && !chapterText(11).includes("কামার আল-আকমার"), "Two different Kamar princes were conflated");
assert.ok(chapterText(12).includes("কামার আল-আকমার"), "Ebony-horse prince name lost");
assert.ok((chapterText(13).match(/এক সন্ধ্যায়/g) || []).length <= 1, "Ali Cogia's olive jar incident repeated");
assert.ok(html.includes("পেইন-পরম্পরার পাঠ"), "Recension identification removed");
assert.ok(chapterText(10).length > 10000, "Hunchback nested cycle cut too short");
assert.ok((chapterText(10).match(/<h3>/g) || []).length >= 5, "Hunchback substory navigation lost");
assert.ok(html.includes("এই সংস্করণের পাঠ-পরিচয়"), "Editorial recension note absent");
assert.ok(html.includes("জন পেইনের"), "Edition/source identification absent");

const editionNote = html.match(/<p class="others-edition-note">([\s\S]*?)<\/p>/)?.[1] || "";
for (const marker of [
  "কামার আল-জামান (বদুরের কাহিনি)",
  "কামার আল-আকমার (সাবুরের পুত্র",
  "সন্তানদের ঘিরে পরবর্তী গল্পচক্র",
  "আমানতদারের দণ্ডের বিবরণ সংস্করণভেদে আলাদা",
  "গ্যালাঁ-পরম্পরার বঙ্গদেশ–কাশ্মীর",
]) {
  assert.ok(editionNote.includes(marker), "Editorial context missing from introductory note: " + marker);
}
const finalParagraph = n => [...chapterText(n).matchAll(/<p>([\s\S]*?)<\/p>/g)].at(-1)?.[1] || "";
for (const [n, terms] of [
  [11, ["বিস্তৃত প্রচলিত পাঠে", "নির্বাচিত পর্ব", "পরবর্তী গল্পচক্র"]],
  [12, ["পেইন-পরম্পরার", "গ্যালাঁ-পরম্পরার", "আগের অধ্যায়ের"]],
  [13, ["সংস্করণে ভিন্ন", "প্রমাণিত প্রশাসনিক"]],
  [14, ["পাণ্ডুলিপি", "পুনর্কথন", "সংস্করণভেদ"]],
]) {
  for (const term of terms) {
    assert.ok(!finalParagraph(n).includes(term), "Chapter " + n + " ending interrupted by editorial commentary: " + term);
  }
}
assert.ok(finalParagraph(11).includes("হায়াত") && finalParagraph(11).includes("সম্মতি"), "Hayat's choice missing from resolution");
assert.ok(finalParagraph(12).includes("শামস") && finalParagraph(12).includes("রাজ্যভার"), "Ebony Horse conclusion lost");
assert.ok(finalParagraph(13).includes("শিশুবিচারকের") && finalParagraph(13).includes("স্বর্ণমুদ্রা"), "Olive-jar verdict lost");
assert.ok(chapterText(14).indexOf("এই বাংলা পুনর্কথনে") < chapterText(14).indexOf("প্রচলিত এক সমাপ্তিতে"), "Final-night editorial context should precede the climax");
assert.ok(!chapterText(8).includes("আব্বাসীয় প্রশাসনের দলিল"), "Court history explanation interrupts the sisters' ending");


const requirements = {
  1: ["শাহরিয়ার", "শাহজামান", "শেহেরজাদ", "দুনিয়াজাদ"],
  2: ["খেজুর", "বণিক", "এক বছরের", "হরিণীর", "কুকুর", "খচ্চর"],
  3: ["হরিণী", "বাছুর", "দুই কালো কুকুর", "খচ্চর", "বণিক", "ছেড়ে দেয়"],
  4: ["চারবার", "মোহর", "কলস", "দৈত্য", "দুবান"],
  5: ["ইউনান", "দুবান", "উজির", "বই", "বিষ", "হ্রদ"],
  6: ["চার রঙের মাছ", "পাথর", "রানি", "মন্ত্র", "মুক্ত", "জেলে"],
  7: ["বোঝা", "তিন", "খলিফা", "জাফর", "মাসরুর"],
  8: ["জুবাইদা", "দুই বোন", "আমিনা", "খলিফা", "মানুষের রূপে"],
  9: ["সিন্দুক", "তিনটি", "বসরা", "দাস", "ছেলে", "জাফর"],
  10: ["দর্জি", "চিকিৎসক", "বণিক", "নাপিত", "কাঁটা", "সচেতন"],
  11: ["কামার আল-জামান", "বদুর", "আংটি", "মারজাওয়ান", "আরমানুস", "পুনর্মিলন"],
  12: ["আবলুস", "ঘোড়া", "সানাআ", "গ্রিক", "রাজকন্যা", "পারস্যে", "ধ্বংস"],
  13: ["আলী কোজিয়া", "জলপাই", "সোনা", "শিশু", "প্রমাণ", "ফিরে পেলেন"],
  14: ["শেহেরজাদ", "শাহরিয়ার", "সন্তান", "ক্ষমার", "সংস্করণ", "পুনর্কথন"]
};
for (const [n, terms] of Object.entries(requirements)) {
  for (const term of terms)
    assert.ok(chapters[Number(n) - 1][3].includes(term), "Chapter " + n + " missing resolution term: " + term);
}
assert.match(html, /<html lang="bn">/);
assert.match(html, /<meta name="description"/);
assert.ok(html.includes('rel="canonical" href="https://walid-ai.com/others/islamic-literature/alf-layla/"'));
for (const asset of ["/walid-ai-approved-logo.png", "/others/assets/books.css?v=20261122-symbols", "/others/assets/reader.js?v=20261122-symbols"]) {
  assert.ok(html.includes(asset), "Site asset lost: " + asset);
}
assert.ok(html.includes("পূর্ণ এক হাজার এক রাতের অনুবাদ নয়"));
assert.ok(!/class="others-(?:sources|next)"/.test(html), "Disallowed sidebar/source component");
assert.ok(!html.includes("উৎস ও পরবর্তী পাঠ"), "Removed source block came back");
assert.equal((html.match(/class="legal-footer"/g) || []).length, 1);

const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".ico": "image/x-icon" };
const server = createServer(async (req, res) => {
  let pathname = new URL(req.url, "http://127.0.0.1").pathname;
  if (pathname.endsWith("/")) pathname += "index.html";
  if (pathname.includes("..")) { res.writeHead(400).end(); return; }
  try {
    const bytes = await readFile(new URL(pathname.slice(1), root));
    const ext = pathname.match(/\.[^.]+$/)?.[0] ?? "";
    res.writeHead(200, { "content-type": types[ext] ?? "application/octet-stream" });
    res.end(bytes);
  } catch { res.writeHead(404).end("not found"); }
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const origin = "http://127.0.0.1:" + server.address().port;
const widths = [320, 375, 768, 1280];
let browser, interactions = 0;
try {
  browser = await chromium.launch({ headless: true });
  for (const width of widths) {
    const page = await browser.newPage({ viewport: {width, height: 900}, deviceScaleFactor: 1 });
    await page.route("**/*", r => new URL(r.request().url()).origin === origin ? r.continue() : r.abort());
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    const response = await page.goto(origin + "/others/islamic-literature/alf-layla/", { waitUntil: "load" });
    assert.equal(response.status(), 200, "Book page HTTP 200");
    await page.evaluate(() => document.fonts.ready);
    const layout = await page.evaluate(() => ({
      viewport: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      chapters: document.querySelectorAll(".others-chapter").length,
      tocLinks: document.querySelectorAll(".others-toc a[href^='#chapter-']").length,
      title: document.querySelector("h1")?.textContent,
      logo: document.querySelector(".others-brand img")?.naturalWidth > 0,
      flower: getComputedStyle(document.body, "::before").backgroundImage.includes("walid-ai-approved-flower"),
      font: getComputedStyle(document.body).fontFamily,
      footerCount: document.querySelectorAll(".legal-footer").length,
      canonical: document.querySelector('link[rel="canonical"]')?.href,
      sourceBlock: !!document.querySelector(".others-sources, .others-next")
    }));
    assert.equal(layout.chapters, 14, "All chapters visible at " + width);
    assert.equal(layout.tocLinks, 14, "TOC count at " + width);
    assert.equal(layout.footerCount, 1);
    assert.ok(layout.title.includes("আলিফ লায়লা"));
    assert.ok(layout.logo && layout.flower && layout.font.includes("SolaimanLipi"), "Branding at " + width + ": " + JSON.stringify(layout));
    assert.equal(layout.canonical, "https://walid-ai.com/others/islamic-literature/alf-layla/");
    assert.ok(!layout.sourceBlock);
    assert.ok(layout.scrollWidth <= width + 2, "Horizontal scroll at " + width + ": " + JSON.stringify(layout));
    assert.deepEqual(errors, [], "JS page errors at " + width);
    if (width === 375 || width === 1280) {
      await page.locator(".others-toc-trigger").click();
      assert.equal(await page.locator(".others-toc-dialog").evaluate(d => d.open), true, "TOC open");
      const rect = await page.locator(".others-toc-dialog").boundingBox();
      assert.ok(rect.x >= -2 && rect.x + rect.width <= width + 2, "Drawer overflow " + width);
      await page.locator('.others-toc a[href="#chapter-14"]').click();
      await page.waitForFunction(() => location.hash === "#chapter-14" && !document.querySelector(".others-toc-dialog").open);
      await page.locator(".others-toc-trigger").click();
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector(".others-toc-dialog").open);
      interactions++;
    }
    await page.close();
  }
  console.log("ALF_LAYLA_READER_PASS", JSON.stringify({chapters: chapters.length, paragraphs: paragraphCount, viewportChecks: widths, interactions, scope: bookPath}));
} finally {
  await browser?.close();
  const done = new Promise(resolve => server.close(resolve));
  server.closeAllConnections();
  await done;
}
