import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { once } from "node:events";
import { chromium } from "playwright";
import { join } from "node:path";

// The test serves the actual Riddlex files. It does not replace mobile artwork
// with desktop assets or mock the knowledge engine.
const root = new URL("../../", import.meta.url);
const mime = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".mjs": "text/javascript", ".json": "application/json",
  ".bin": "application/octet-stream", ".webp": "image/webp",
  ".jpg": "image/jpeg", ".png": "image/png",
};
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  if (pathname.includes("..")) { response.writeHead(404).end(); return; }
  const route = pathname.endsWith("/") ? pathname + "index.html" : pathname;
  try {
    const bytes = await readFile(new URL(route.slice(1), root));
    response.writeHead(200, {
      "content-type": mime[route.match(/\.[^.]+$/)?.[0]] || "application/octet-stream",
    });
    response.end(bytes);
  } catch {
    response.writeHead(404).end("Not found");
  }
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const origin = "http://127.0.0.1:" + server.address().port;

const shotFolder = process.env.RIDDLEX_SCREENSHOT_DIR || "";
if (shotFolder) await mkdir(shotFolder, { recursive: true });

let browser;
try {
  browser = await chromium.launch({ headless: true });
  for (const { width, height, orient } of [
    { width: 390, height: 844, orient: "portrait" },
    { width: 1366, height: 768, orient: "landscape" },
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/*", (route) => {
      if (new URL(route.request().url()).origin === origin) return route.continue();
      return route.abort();
    });
    const response = await page.goto(origin + "/games/riddlex/?autotest=1", { waitUntil: "load" });
    assert.equal(response.status(), 200);
    assert.equal(await page.locator("html").getAttribute("data-orient"), orient);
    const menuArt = await page.locator(orient === "portrait" ? ".menu-port" : ".menu-card").getAttribute("src");
    assert.ok(menuArt?.includes(orient === "portrait" ? "menu-portrait" : "menu-desk"), menuArt);
    assert.equal(await page.locator("#menu .lang-switch").count(), 0, "language selector must not appear on the landing screen");
    assert.equal(await page.locator("#menu .menu-privacy").count(), 0, "privacy belongs on the site's legal pages");
    assert.equal((await page.locator("#play").innerText()).trim(), "Play Now");
    assert.equal(await page.locator("#menu-floor").count(), 0,
      "the old translucent retouch overlay must not return");
    if (orient === "portrait") {
      await page.locator(".menu-port").evaluate((img) => img.decode());
    }
    const menuLayout = await page.evaluate(() => {
      const play = document.getElementById("play").getBoundingClientRect();
      return {
        play: { x: play.x, y: play.y, right: play.right, bottom: play.bottom, width: play.width, height: play.height },
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    assert.ok(menuLayout.play.width >= 150 && menuLayout.play.height >= 44, "Play Now should be comfortably tappable");
    assert.ok(menuLayout.play.x >= -1 && menuLayout.play.right <= width + 1, "Play Now outside screen");
    assert.ok(menuLayout.play.y >= -1 && menuLayout.play.bottom <= height + 1, "Play Now clipped vertically");
    assert.ok(menuLayout.scrollWidth <= width + 2, "menu horizontal overflow");
    if (orient === "portrait") {
      const art = await page.evaluate(() => {
        const img = document.querySelector(".menu-port");
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const measure = (y) => {
          const data = ctx.getImageData(80, y, 570, 1).data;
          let total = 0;
          for (let i = 0; i < data.length; i += 4)
            total += data[i] + data[i+1] + data[i+2];
          return total / (data.length / 4) / 3;
        };
        return { woodRows: [1195, 1225, 1235, 1250].map(measure), goldenFrame: measure(1270) };
      });
      assert.ok(art.woodRows.every((luma) => luma > 42 && luma < 105),
        "table has returned to a black patch or gold stripes: " + art.woodRows);
      assert.ok(art.goldenFrame > 50, "gold bottom frame must be preserved");
    }
    if (shotFolder) await page.screenshot({ path: join(shotFolder, "menu-" + orient + ".png") });

    await page.click("#play");
    assert.equal(await page.locator("#game .lang-switch").isVisible(), true,
      "language option must be available after Play Now");
    await page.waitForFunction(() => !document.getElementById("categories").hidden);
    await page.click('[data-cat="animal"]');
    await page.waitForFunction(() =>
      !document.getElementById("answers").hidden
      && document.getElementById("progress").textContent.includes("Question"),
      null, { timeout: 30000 });
    const geometry = await page.evaluate(() => {
      const controls = [...document.querySelectorAll("#answers button")];
      return {
        stage: document.getElementById("stage").getBoundingClientRect().toJSON(),
        buttons: controls.map((button) => button.getBoundingClientRect().toJSON()),
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    assert.ok(geometry.stage.width > 100 && geometry.stage.height > 100);
    if (shotFolder) await page.screenshot({ path: join(shotFolder, "game-" + orient + ".png") });
    assert.ok(geometry.scrollWidth <= width + 2, "horizontal overflow");
    for (const rect of geometry.buttons) {
      assert.ok(rect.width >= 44 && rect.height >= 44, "tiny answer control");
      assert.ok(rect.x >= -2 && rect.right <= width + 2, "answer outside screen horizontally");
      assert.ok(rect.y >= -2 && rect.bottom <= height + 2, "answer outside screen vertically");
    }
    await page.click("#answer-yes");
    await page.waitForFunction(() =>
      document.getElementById("progress").textContent.includes("Question 2"),
      null, { timeout: 20000 });
    await page.click('#game [data-set-lang="bn"]');
    assert.equal(await page.locator("html").getAttribute("lang"), "bn");
    assert.equal(await page.locator("#answer-yes").textContent(), "হ্যাঁ");

    // Render actual canvas guess photos in both extreme aspect ratios. The
    // synthetic picture has a bright border and edge markers, making cropping
    // or oversized cards immediately visible in the captured screenshot.
    console.log("PHOTO_TEST_START", orient);
    await page.evaluate(() => { document.getElementById("answers").hidden = true; });
    for (const [shape, imageWidth, imageHeight] of [
      ["tall-photo", 180, 690],
      ["wide-photo", 920, 160],
    ]) {
      const pictureState = await page.evaluate(async ({ imageWidth, imageHeight }) => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${imageWidth}" height="${imageHeight}" viewBox="0 0 ${imageWidth} ${imageHeight}">
          <rect width="100%" height="100%" fill="#c1dde8"/>
          <rect x="3" y="3" width="${imageWidth - 6}" height="${imageHeight - 6}" rx="1" fill="none" stroke="#ef1c18" stroke-width="6"/>
          <rect x="8" y="8" width="${imageWidth - 16}" height="20" fill="#fadd1c"/>
          <rect x="8" y="${imageHeight - 28}" width="${imageWidth - 16}" height="20" fill="#2343ff"/>
          <circle cx="${imageWidth / 2}" cy="${imageHeight / 2}" r="26" fill="#3b8021"/>
        </svg>`;
        const src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
        const result = await Promise.race([
          window.__riddlex.reveal("সম্পূর্ণ ছবি", src),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Guess reveal stalled")), 12000)),
        ]);
        return { result, bounds: window.__riddlex.expression().revealBounds };
      }, { imageWidth, imageHeight });
      assert.equal(pictureState.result.printed, true, "test photo failed to load");
      const bounds = pictureState.bounds;
      assert.ok(bounds && bounds.w > 60 && bounds.h > 60, "missing photo card");
      assert.ok(bounds.x >= -1 && bounds.y >= -1, "photo card starts outside stage");
      assert.ok(bounds.x + bounds.w <= bounds.canvasW + 1, "photo card clipped horizontally");
      assert.ok(bounds.y + bounds.h <= bounds.canvasH + 1, "photo card clipped vertically");
      console.log("PHOTO_TEST_PASS", orient, shape, pictureState.bounds.w, pictureState.bounds.h);
      if (shotFolder) await page.screenshot({
        path: join(shotFolder, "guess-" + orient + "-" + shape + ".png"),
      });
    }
    await page.click("#to-menu");
    assert.equal(await page.locator("#menu").isVisible(), true);
    const opposite = orient === "portrait" ? { width: 1366, height: 768, art: "menu-desk" }
      : { width: 390, height: 844, art: "menu-portrait" };
    await page.setViewportSize({ width: opposite.width, height: opposite.height });
    await page.waitForFunction((art) =>
      [...document.querySelectorAll("#menu img")].some((img) => img.getAttribute("src")?.includes(art)),
      opposite.art);
    assert.deepEqual(errors, [], "uncaught browser errors");
    console.log("RIDDLEX_GAMEPLAY_PASS", width, height, orient);
    await page.close();
  }
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
