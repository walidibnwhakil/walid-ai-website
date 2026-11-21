import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import { chromium } from "playwright";

const root = new URL("../", import.meta.url);
const bookPath = "others/history/byzantine-empire/index.html";
const html = await readFile(new URL("../" + bookPath, import.meta.url), "utf8");
const chapterRegex = /<section class="others-chapter" id="chapter-(\d+)"><h2>(.*?)<\/h2>([\s\S]*?)<\/section>/g;
const chapters = [...html.matchAll(chapterRegex)];
assert.equal(chapters.length, 18, "Expected 18 integrated Byzantine chapters");
assert.deepEqual(chapters.map(c => Number(c[1])), Array.from({length: 18}, (_, i) => i + 1), "Chapter IDs out of sequence");
const tocHtml = html.match(/<nav class="others-toc" aria-label="অধ্যায় তালিকা">([\s\S]*?)<\/nav>/)?.[1];
assert.ok(tocHtml, "Missing chapter drawer");
const toc = [...tocHtml.matchAll(/<a href="#chapter-(\d+)">(.*?)<\/a>/g)];
assert.equal(toc.length, chapters.length, "TOC chapter count mismatch");
const repeated = new Set();
let paragraphs = 0;
for (const [index, chapter] of chapters.entries()) {
  assert.equal(Number(toc[index][1]), Number(chapter[1]), "TOC is out of order");
  assert.equal(toc[index][2], chapter[2], "TOC title differs from chapter");
  const ps = [...chapter[3].matchAll(/<p>([\s\S]*?)<\/p>/g)].map(p => p[1].replace(/<[^>]*>/g, "").trim());
  assert.ok(ps.length >= 6, "Short chapter " + chapter[1]);
  for (const p of ps) {
    assert.ok(p.length >= 180, "Unfinished passage in chapter " + chapter[1] + ": " + p.length);
    assert.ok(!repeated.has(p), "Duplicate paragraph in chapter " + chapter[1]);
    repeated.add(p); paragraphs++;
  }
}
for (const [n, terms] of Object.entries({
  1: ["কনস্টান্টিন", "ক্রিসপাস", "ফাউস্তা", "৩৩০"],
  4: ["জাস্টিনিয়ান", "থিওডোরা", "বেলিসারিয়ুস", "নারসেস", "৫৩২", "৫৪৮", "হাগিয়া সোফিয়া"],
  8: ["আইরিন", "৭৮৭", "৭৯৭"],
  9: ["থিওডোরা", "৮৪৩"],
  10: ["দ্বিতীয় বাসিল", "১০২৫"],
  11: ["জোয়ে", "থিওডোরা", "১০৫৪", "১০৫৬"],
  12: ["মানজিকার্ট", "১০৭১", "আলপ আরসলান"],
  13: ["আন্না", "আইরিন", "প্রথম ক্রুসেড", "আলেক্সিওস"],
  14: ["জন", "মানুয়েল", "মিরিওকেফালন"],
  15: ["১২০৪", "নাইসিয়া", "১২৬১"],
  16: ["অষ্টম মাইকেল", "কাতালান", "১৩২৮"],
  17: ["কান্তাকুজেনোস", "ফ্লোরেন্স", "১৪৪৮"],
  18: ["একাদশ কনস্টান্টিন", "দ্বিতীয় মেহমেদ", "২৯ মে", "১৪৫৩"]
})) {
  const section = chapters[Number(n) - 1][3];
  for (const term of terms) assert.ok(section.includes(term), "Missing " + term + " in chapter " + n);
}
assert.ok(paragraphs >= 199, "Byzantine chronology lost historical or social context");
for (const [n, terms] of Object.entries({
  1: ["সলিদুস", "রোমাইওই"],
  2: ["আমব্রোস", "৩৮১"],
  3: ["কোডেক্স থিওডোসিয়ানুস", "পুলখেরিয়া"],
  4: ["জন অব ক্যাপাডোসিয়া", "বেলিসারিয়ুস", "নারসেস", "মহামারির"],
  5: ["সোফিয়ার", "স্ট্রাতেগিকন"],
  6: ["সের্গিয়ুস", "ইয়ারমুক"],
  7: ["থিম ব্যবস্থা", "স্ত্রাতেগোস"],
  8: ["আইরিন", "৭৮৭", "৭৯৭"],
  9: ["ফোটিওস", "থিওডোরা"],
  10: ["রেশমশিল্প", "দ্বিতীয় বাসিল", "১০২৫"],
  11: ["ফিলিওকুয়ে", "জোয়ে", "থিওডোরা"],
  12: ["মানজিকার্ট", "আলপ আরসলান"],
  13: ["আন্না দালাসেনা", "নিকেফোরোস ব্রিয়েন্নিওস", "প্রথম ক্রুসেড"],
  14: ["১১৩৭", "মিরিওকেফালন", "অ্যাঞ্জেলোস"],
  15: ["১২০৪", "নাইসিয়া", "১২৬১"],
  16: ["কাতালান", "সিসিলিয়ান ভেস্পার্স"],
  17: ["আন্না অব সাভয়", "কান্তাকুজেনোস", "ফ্লোরেন্স"],
  18: ["দ্বিতীয় মেহমেদ", "২৯ মে", "১৪৫৩"]
})) {
  const section = chapters[Number(n) - 1][3];
  for (const term of terms) assert.ok(section.includes(term),
    "Missing expanded Byzantine narrative: chapter " + n + " / " + term);
}
// Keep the researched additions in their proper reigns rather than restoring
// repeated thematic summaries or moving a ruler's family to a later appendix.
const chronologyEvidence = {
  3: ["হেনোতিকন", "আকাকীয়"],
  4: ["কার্থেজ", "ত্রিবোনিয়ানের"],
  6: ["৬২৬", "বোনোস", "সের্গিয়ুস"],
  7: ["৬৮০–৬৮১", "টাগমা"],
  8: ["৭৯০", "৭৯২", "থিওডোত"],
  9: ["বারি", "৮৪৭"],
  10: ["৯৮৬", "ত্রায়ানের", "ওহরিদের"],
  11: ["১০৪৩", "১০৪৭", "লিও তোরনিকিওস"],
  12: ["১০৬৪", "তারখানেইওতেস"],
  13: ["আন্না দালাসেনা", "আইরিন দুকাইনা", "ব্রিয়েন্নিওস"],
  14: ["সিরমিয়ামের", "ফ্রিডরিখ"],
  15: ["১২৩০", "১২৩৫", "ক্লোকোতনিত্সার"],
  16: ["বাফেয়ুস", "১৩২৬"],
  17: ["১৩৪৬", "ওরহানের", "হেলেনার", "মনফেরাতের"],
  18: ["হেক্সামিলিয়ন", "নোতারাস", "গেন্নাদিওস"],
};
for (const [index, terms] of Object.entries(chronologyEvidence)) {
  const body = chapters[Number(index) - 1][3];
  for (const term of terms) assert.ok(body.includes(term),
    "Missing chronologically integrated evidence: chapter " + index + " / " + term);
}
const minimumParagraphs = [9,9,9,13,8,11,10,10,9,11,11,10,12,12,12,11,15,17];
assert.deepEqual(chapters.map(c => (c[3].match(/<p>/g) || []).length), minimumParagraphs,
  "Historical passages were removed or chapter depth regressed");
assert.ok(html.includes('rel="canonical" href="https://walid-ai.com/others/history/byzantine-empire/"'));
assert.ok(html.includes("/walid-ai-approved-logo.png"));
assert.ok(html.includes("/others/assets/books.css"));
assert.ok(html.includes("/others/assets/reader.js"));
assert.ok(!/class="others-(?:sources|next)"/.test(html));
assert.ok(!html.includes("উৎস ও পরবর্তী পাঠ"));
assert.equal((html.match(/class="legal-footer"/g) || []).length, 1, "Footer count");
const types = {".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".png":"image/png",".ico":"image/x-icon",".ttf":"font/ttf"};
const server = createServer(async (req, res) => {
  let pathname = new URL(req.url, "http://127.0.0.1").pathname;
  if (pathname.endsWith("/")) pathname += "index.html";
  if (pathname.includes("..")) { res.writeHead(400).end(); return; }
  try {
    const bytes = await readFile(new URL(pathname.slice(1), root));
    const ext = pathname.match(/\.[^.]+$/)?.[0] ?? "";
    res.writeHead(200, {"content-type":types[ext] ?? "application/octet-stream"});
    res.end(bytes);
  } catch { res.writeHead(404).end("not found"); }
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const origin = "http://127.0.0.1:" + server.address().port;
const widths = [320,375,768,1280];
let browser, interactive = 0;
try {
  browser = await chromium.launch({headless: true});
  for (const width of widths) {
    const page = await browser.newPage({viewport:{width,height:840},deviceScaleFactor:1});
    await page.route("**/*", r => new URL(r.request().url()).origin === origin ? r.continue() : r.abort());
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const response = await page.goto(origin + "/others/history/byzantine-empire/", {waitUntil:"load"});
    assert.equal(response.status(), 200, "Book must load");
    await page.evaluate(() => document.fonts.ready);
    const layout = await page.evaluate(() => ({
      viewport: innerWidth,
      scroll: document.documentElement.scrollWidth,
      logo: document.querySelector(".others-brand img")?.naturalWidth > 0,
      flowers: getComputedStyle(document.body, "::before").backgroundImage.includes("walid-ai-approved-flower"),
      font: getComputedStyle(document.body).fontFamily,
      chapters: document.querySelectorAll(".others-chapter").length,
      links: document.querySelectorAll(".others-toc a[href^='#chapter-']").length,
      footers: document.querySelectorAll(".legal-footer").length,
      canonical: document.querySelector('link[rel="canonical"]')?.href,
      title: document.querySelector("h1")?.textContent,
    }));
    assert.equal(layout.chapters,18);
    assert.equal(layout.links,18);
    assert.equal(layout.footers,1);
    assert.ok(layout.logo && layout.flowers && layout.font.includes("SolaimanLipi"), "Site design regression");
    assert.ok(layout.scroll <= width + 2, "Horizontal overflow at " + width + "px: " + JSON.stringify(layout));
    assert.equal(layout.canonical, "https://walid-ai.com/others/history/byzantine-empire/");
    assert.ok(layout.title.includes("বাইজেন্টাইন"));
    assert.deepEqual(errors, [], "Browser JS errors");
    if (width === 375 || width === 1280) {
      await page.locator(".others-toc-trigger").click();
      assert.equal(await page.locator(".others-toc-dialog").evaluate(x=>x.open), true);
      const rect = await page.locator(".others-toc-dialog").boundingBox();
      assert.ok(rect.x >= -2 && rect.x + rect.width <= width + 2, "Drawer overflow");
      await page.locator('a[href="#chapter-18"]').click();
      await page.waitForFunction(() => location.hash === "#chapter-18" && !document.querySelector(".others-toc-dialog").open);
      assert.equal(await page.locator("body").evaluate(x=>x.classList.contains("others-toc-open")),false);
      await page.locator(".others-toc-trigger").click();
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector(".others-toc-dialog").open);
      interactive++;
    }
    await page.close();
  }
  console.log("BYZANTINE_READER_PASS",JSON.stringify({chapters:chapters.length,paragraphs,viewportChecks:widths.length,interactive,scope:bookPath}));
} finally {
  await browser?.close();
  const finished = new Promise(resolve => server.close(resolve));
  server.closeAllConnections();
  await finished;
}
