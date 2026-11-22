/* Browser regression for device-only Quran/story resume and screen wake lock. */
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {extname} from "node:path";
import {chromium} from "playwright";

const root = new URL("../", import.meta.url);
const mime = {".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",
  ".json":"application/json",".png":"image/png",".ttf":"font/ttf",".svg":"image/svg+xml"};
const server = createServer(async (req, res) => {
  let path = new URL(req.url, "http://127.0.0.1").pathname;
  if (path.includes("..")) return void res.writeHead(400).end();
  if (path.endsWith("/")) path += "index.html";
  try {
    const content = await readFile(new URL(path.slice(1), root));
    res.writeHead(200, {"content-type":mime[extname(path)] || "application/octet-stream"}).end(content);
  } catch { res.writeHead(404).end("Not found"); }
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const base = "http://127.0.0.1:" + server.address().port;
let browser;
try {
  browser = await chromium.launch({headless:true});
  const context = await browser.newContext({viewport:{width:375,height:800},hasTouch:true,isMobile:true});
  await context.addInitScript(() => {
    window.__wakeRequests = 0;
    window.__wakeReleases = 0;
    Object.defineProperty(navigator, "wakeLock", {configurable:true,value:{
      request: async type => {
        if (type !== "screen") throw Error("Unexpected wake lock type");
        window.__wakeRequests++;
        const listeners = [];
        const sentinel = {released:false,
          addEventListener(name, cb) { if (name === "release") listeners.push(cb); },
          async release() {
            if (this.released) return;
            this.released = true;
            window.__wakeReleases++;
            listeners.forEach(fn => fn());
          }
        };
        return sentinel;
      }
    }});
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", err => errors.push(err.message));
  await page.route("**/*", route =>
    new URL(route.request().url()).origin === base ? route.continue() : route.abort());

  await page.goto(base + "/islam/quran/al-baqarah/", {waitUntil:"load"});
  await page.locator(".walid-reading-controls").waitFor();
  await page.locator(".walid-reading-progress").waitFor();
  await page.waitForFunction(() => window.__wakeRequests > 0);
  assert.match(await page.locator(".reading-status").textContent(), /জেগে থাকবে/);
  await page.getByRole("tab", {name:"সূরা পরিচিতি"}).click();
  await page.getByRole("tab", {name:"সূরা", exact:true}).click();
  assert.equal(await page.locator(".reading-tools .walid-reading-progress").count(), 1,
    "Bookmark panel survives switching Quran tabs");
  assert.equal(await page.locator(".reading-tools .walid-reading-controls").count(), 1,
    "Wake lock toggle survives switching Quran tabs");

  await page.evaluate(() => document.getElementById("ayah-25").scrollIntoView({block:"start"}));
  await page.mouse.wheel(0, 190);
  await page.waitForFunction(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("walid-ai:quran:last-read:v1"));
      return saved?.surah === 2 && saved.verse >= 20;
    } catch { return false; }
  }, null, {timeout:5500});
  const verse = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("walid-ai:quran:last-read:v1")).verse);
  await page.getByRole("button", {name:"শেষ পড়া আয়াতে বুকমার্ক"}).click();
  assert.equal(await page.evaluate(() =>
    JSON.parse(localStorage.getItem("walid-ai:quran:bookmark:v1"))?.verse), verse);
  // The verse number itself is an accessible, exact-ayah bookmark action.
  await page.locator("#ayah-27 .ayah-number").click();
  assert.equal(await page.evaluate(() =>
    JSON.parse(localStorage.getItem("walid-ai:quran:bookmark:v1"))?.verse), 27);
  await page.goto(base + "/islam/quran/");
  await page.locator(".walid-reading-progress").waitFor();
  const resume = page.getByRole("link", {name:/সর্বশেষ পড়া:.*আয়াত/});
  assert.match(await resume.getAttribute("href"), /\/al-baqarah\/#ayah-\d+/);
  assert.equal(await page.getByRole("link", {name:/বুকমার্ক:.*আয়াত/}).count(), 1);
  await resume.click();
  await page.locator(".reading-tools .walid-reading-progress").waitFor();
  assert.ok(await page.evaluate(() => scrollY > 100),
    "Resume navigates to the saved Quran verse");

  // Quran auto-scroll: explicit opt-in, one wrapped visual line at a time, easy pause/stop.
  await page.locator(".walid-quran-autoscroll").waitFor();
  assert.match(await page.locator(".walid-auto-scroll-status").textContent(), /একটি করে লাইনে/);
  await page.locator("#walid-auto-scroll-speed").selectOption("6");
  await page.getByRole("button", {name:"▶ অটো স্ক্রল শুরু"}).click();
  await page.locator(".walid-quran-autoscroll-floating:visible").waitFor();
  await page.evaluate(() => document.getElementById("ayah-40").scrollIntoView({block:"center",behavior:"instant"}));
  const beforeAuto = await page.evaluate(() => scrollY);
  await page.waitForFunction(before => scrollY > before + 5, beforeAuto, {timeout:8500});
  const afterAuto = await page.evaluate(() => scrollY);
  assert.ok(afterAuto - beforeAuto < 220,
    "Line-by-line scrolling must not jump more than a few text lines");
  const lastAuto = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("walid-ai:quran:last-read:v1"))?.verse);
  assert.ok(lastAuto >= 39, "Automated reading updates the saved ayah");
  await page.mouse.wheel(0, 90);
  await page.waitForFunction(() =>
    document.querySelector(".walid-quran-autoscroll-floating")?.textContent?.includes("স্ক্রল বিরতিতে"));
  await page.locator(".walid-quran-autoscroll-floating").getByRole("button", {name:"■ বন্ধ"}).click();
  assert.equal(await page.locator(".walid-quran-autoscroll-floating").isVisible(), false,
    "Stop hides fixed controls");
  await page.getByRole("tab", {name:"সূরা পরিচিতি"}).click();
  assert.equal(await page.locator(".walid-quran-autoscroll-floating").isVisible(), false,
    "Changing sections must never restart auto-scroll");
  await page.getByRole("tab", {name:"সূরা",exact:true}).click();

  await page.goto(base + "/islam/stories/");
  await page.locator(".walid-reading-controls").waitFor();
  await page.evaluate(() => document.getElementById("nuh").scrollIntoView({block:"start"}));
  await page.mouse.wheel(0, 180);
  await page.waitForFunction(() => {
    try {return JSON.parse(localStorage.getItem("walid-ai:quran-stories:last-read:v1"))?.id === "nuh";}
    catch {return false;}
  }, null, {timeout:5500});
  await page.getByRole("button", {name:"বর্তমান কাহিনিতে বুকমার্ক"}).click();
  assert.equal(await page.evaluate(() =>
    JSON.parse(localStorage.getItem("walid-ai:quran-stories:bookmark:v1"))?.id), "nuh");

  await page.goto(base + "/others/folklore/ramayana/");
  await page.locator(".walid-reading-controls").waitFor();
  assert.ok((await page.evaluate(() => window.__wakeRequests)) > 0);
  assert.equal(await page.locator(".others-reading-progress").count(), 1,
    "Existing Others reading progress still exists");
  await page.getByRole("button", {name:"বন্ধ করুন"}).click();
  assert.match(await page.locator(".reading-status").textContent(), /স্বাভাবিক নিয়মে বন্ধ/);
  assert.ok((await page.evaluate(() => window.__wakeReleases)) >= 1);

  const unsupported = await browser.newContext({viewport:{width:375,height:800}});
  await unsupported.addInitScript(() => {
    Object.defineProperty(navigator, "wakeLock", {configurable:true,value:undefined});
  });
  const noLockPage = await unsupported.newPage();
  await noLockPage.goto(base + "/islam/stories/", {waitUntil:"load"});
  await noLockPage.locator(".walid-reading-controls").waitFor();
  assert.match(await noLockPage.locator(".reading-status").textContent(), /সুবিধা নেই/);
  assert.equal(await noLockPage.getByRole("button", {name:"সমর্থিত নয়"}).isDisabled(), true);
  await unsupported.close();
  assert.deepEqual(errors, [], "No page JavaScript exceptions");
  await context.close();
  console.log("PASS reading session: Quran last ayah/bookmark, stories, Others, wake lock and fallback");
} finally {
  await browser?.close();
  server.close();
}
