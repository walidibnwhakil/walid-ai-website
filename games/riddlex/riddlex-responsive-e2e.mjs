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
    const menuLayout = await page.evaluate(() => {
      const play = document.getElementById("play").getBoundingClientRect();
      const floor = document.getElementById("menu-floor");
      const ctx = floor.getContext("2d");
      const x = Math.floor(floor.width * 0.5);
      const y = Math.floor(floor.height * 0.93);
      const painted = floor.width && floor.height ? ctx.getImageData(x, y, 1, 1).data[3] : 0;
      return {
        play: { x: play.x, y: play.y, right: play.right, bottom: play.bottom, width: play.width, height: play.height },
        floorDisplay: getComputedStyle(floor).display,
        floorAlpha: painted,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    assert.ok(menuLayout.play.width >= 150 && menuLayout.play.height >= 44, "Play Now should be comfortably tappable");
    assert.ok(menuLayout.play.x >= -1 && menuLayout.play.right <= width + 1, "Play Now outside screen");
    assert.ok(menuLayout.play.y >= -1 && menuLayout.play.bottom <= height + 1, "Play Now clipped vertically");
    assert.ok(menuLayout.scrollWidth <= width + 2, "menu horizontal overflow");
    if (orient === "portrait") {
      assert.equal(menuLayout.floorDisplay, "block", "portrait should repair the striped desk band");
      await page.waitForFunction(() => {
        const floor = document.getElementById("menu-floor");
        if (!floor.width || !floor.height) return false;
        return floor.getContext("2d").getImageData(
          Math.floor(floor.width * 0.5), Math.floor(floor.height * 0.93), 1, 1).data[3] >= 180;
      }, null, { timeout: 8000 });
    } else {
      assert.equal(menuLayout.floorDisplay, "none", "desktop must retain its distinct original artwork");
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
