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
  await page.locator("#ayah-27 .ayah-number[data-walid-bookmark]").waitFor();
  await page.waitForFunction(() => window.__wakeRequests > 0);
  assert.equal(await page.locator(".walid-reading-controls,.walid-reading-progress,.walid-quran-autoscroll").count(),0,
    "No settings, bookmark panel or auto-scroll controls on Quran");
  await page.getByRole("tab", {name:"সূরা পরিচিতি"}).click();
  await page.getByRole("tab", {name:"সূরা", exact:true}).click();
  assert.equal(await page.locator("#ayah-27").count(),1,"Quran tabs preserve all ayahs");

  // Manual reading saves separately for this surah.
  await page.evaluate(() => document.getElementById("ayah-25").scrollIntoView({block:"start",behavior:"instant"}));
  await page.mouse.wheel(0,190);
  await page.waitForFunction(() => {
    const v=JSON.parse(localStorage.getItem("walid-ai:quran:last-read:2:v2") || "null");
    return v?.surah===2 && v.verse>=20;
  }, null, {timeout:5500});

  // Press-and-hold must bookmark the ayah itself, with persistent visual markings.
  await page.evaluate(() => document.getElementById("ayah-27").scrollIntoView({block:"center",behavior:"instant"}));
  await page.evaluate(() => {
    const el=document.getElementById("ayah-27");
    el.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerId:102,clientX:100,clientY:220}));
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    document.getElementById("ayah-27").dispatchEvent(new PointerEvent("pointerup",{bubbles:true,pointerId:102,clientX:100,clientY:220}));
  });
  assert.equal(await page.locator("#ayah-27.walid-ayah-bookmarked").count(),1,
    "Long press shows marked ayah with a distinctive gold accent");
  assert.equal(await page.evaluate(() =>
    JSON.parse(localStorage.getItem("walid-ai:quran:bookmark:2:v2"))?.verse),27);
  assert.equal(await page.locator("#ayah-26.walid-ayah-bookmarked").count(),0);

  await page.goto(base + "/islam/quran/", {waitUntil:"load"});
  await page.waitForTimeout(200);
  assert.equal(await page.locator(".walid-reading-progress").count(),0,
    "Quran index should not show a global last-read or bookmark panel");

  await page.goto(base + "/islam/quran/al-baqarah/", {waitUntil:"load"});
  await page.locator("#ayah-27.walid-ayah-bookmarked").waitFor();
  await page.waitForFunction(() => window.scrollY > 400, null,{timeout:4500});
  assert.match(await page.locator(".walid-quran-toast").textContent(),/সর্বশেষ পঠিত আয়াত/);
  await page.waitForFunction(() => document.querySelector(".walid-quran-toast")?.hidden,
    null,{timeout:4500});

  // Another surah does not inherit the existing one’s bookmark or scroll point.
  await page.goto(base + "/islam/quran/al-fatiha/", {waitUntil:"load"});
  await page.locator("#ayah-1 .ayah-number[data-walid-bookmark]").waitFor();
  assert.equal(await page.locator(".walid-ayah-bookmarked").count(),0);
  assert.ok((await page.evaluate(() => scrollY)) < 450, "New surah begins near the top");
  await page.locator("#ayah-2 .ayah-number").click();
  assert.equal(await page.locator("#ayah-2.walid-ayah-bookmarked").count(),1);
  assert.equal(await page.evaluate(() =>
    JSON.parse(localStorage.getItem("walid-ai:quran:bookmark:2:v2"))?.verse),27,
    "Bookmarked ayah in earlier surah remains independently saved");
  await page.goto(base + "/islam/quran/al-baqarah/");
  await page.locator("#ayah-27.walid-ayah-bookmarked").waitFor();
  assert.equal(await page.locator(".walid-ayah-bookmarked").count(),1);

  // A wheel/drag begins quiet, continuous scroll; a plain touch pauses it.
  await page.evaluate(() => document.getElementById("ayah-40").scrollIntoView({block:"center",behavior:"instant"}));
  await page.mouse.wheel(0,120);
  await page.waitForTimeout(750);
  const starting = await page.evaluate(() => scrollY);
  await page.waitForFunction(y => scrollY > y + 7,starting,{timeout:4000});
  await page.evaluate(() => {
    const el=document.getElementById("ayah-40");
    const t=new Touch({identifier:21,target:el,clientX:120,clientY:250});
    el.dispatchEvent(new TouchEvent("touchstart",{bubbles:true,touches:[t],targetTouches:[t],changedTouches:[t]}));
    el.dispatchEvent(new TouchEvent("touchend",{bubbles:true,touches:[],targetTouches:[],changedTouches:[t]}));
  });
  const stoppedAt = await page.evaluate(() => scrollY);
  await page.waitForTimeout(600);
  assert.ok(Math.abs((await page.evaluate(() => scrollY))-stoppedAt) < 2,
    "Touch without dragging must pause all automatic scrolling");
  // The next deliberate drag should reactivate, without a separate Start button.
  await page.evaluate(() => {
    const el=document.getElementById("ayah-40");
    const a=new Touch({identifier:22,target:el,clientX:110,clientY:350});
    const b=new Touch({identifier:22,target:el,clientX:110,clientY:275});
    el.dispatchEvent(new TouchEvent("touchstart",{bubbles:true,touches:[a],targetTouches:[a],changedTouches:[a]}));
    el.dispatchEvent(new TouchEvent("touchmove",{bubbles:true,touches:[b],targetTouches:[b],changedTouches:[b]}));
    el.dispatchEvent(new TouchEvent("touchend",{bubbles:true,touches:[],targetTouches:[],changedTouches:[b]}));
  });
  const movingAgain=await page.evaluate(() => scrollY);
  await page.waitForFunction(y=>scrollY>y+8,movingAgain,{timeout:4000});
  assert.equal(await page.locator(".walid-quran-autoscroll-floating").count(),0,
    "No floating scroll control is rendered");

  await page.goto(base + "/islam/stories/");
  assert.equal(await page.locator(".walid-reading-controls").count(),0);
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
  assert.equal(await page.locator(".walid-reading-controls").count(),0);
  assert.ok((await page.evaluate(() => window.__wakeRequests)) > 0);
  assert.equal(await page.locator(".others-reading-progress").count(), 1,
    "Existing Others reading progress still exists");
  assert.ok((await page.evaluate(() => window.__wakeRequests)) >= 1);

  const unsupported = await browser.newContext({viewport:{width:375,height:800}});
  await unsupported.addInitScript(() => {
    Object.defineProperty(navigator, "wakeLock", {configurable:true,value:undefined});
  });
  const noLockPage = await unsupported.newPage();
  await noLockPage.goto(base + "/islam/stories/", {waitUntil:"load"});
  assert.equal(await noLockPage.locator(".walid-reading-controls").count(),0);
  assert.equal(await noLockPage.evaluate(() => !!navigator.wakeLock),false);
  await unsupported.close();
  assert.deepEqual(errors, [], "No page JavaScript exceptions");
  await context.close();
  console.log("PASS reading session: hands-free Quran, per-surah auto-resume, long-press bookmarks, stories, Others and wake lock");
} finally {
  await browser?.close();
  server.close();
}
