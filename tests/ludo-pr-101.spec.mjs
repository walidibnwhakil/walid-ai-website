import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";

const baseURL = process.env.BASE_URL || "http://127.0.0.1:4173";
fs.mkdirSync("screenshots", { recursive: true });
fs.mkdirSync("test-results", { recursive: true });

const results = [];
async function check(name, fn) {
  try { await fn(); results.push({ name, status: "passed" }); }
  catch (error) { results.push({ name, status: "failed", error: String(error.stack || error) }); throw error; }
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await check("desktop board launch", async () => {
    await page.goto(`${baseURL}/games/ludo/?screen=board&players=2&mode=friend`, { waitUntil: "networkidle" });
    await page.locator("#board").waitFor({ state: "visible" });
    assert.equal(await page.locator("#ludo-setup").getAttribute("hidden"), "");
    assert.equal(await page.locator("#board").getAttribute("aria-label"), "Ludo board");
    await page.screenshot({ path: "screenshots/ludo-desktop.png", fullPage: true });
  });

  await check("two adjacent pawns keep full artwork and are not clipped", async () => {
    const data = await page.evaluate(() => {
      const board = document.querySelector("#board");
      const tile = document.createElement("div");
      tile.className = "track";
      tile.style.cssText = "position:relative;width:100px;height:100px;overflow:visible";
      const pawns = [1, 2].map((n) => {
        const pawn = document.createElement("span");
        pawn.className = "pin-pawn pile-size-2";
        pawn.dataset.testPawn = String(n);
        const art = document.createElement("span");
        art.className = "pin-pawn-art";
        pawn.append(art); tile.append(pawn); return { pawn, art };
      });
      board.append(tile);
      return pawns.map(({ pawn, art }) => ({
        width: getComputedStyle(art).width,
        height: getComputedStyle(art).height,
        overflow: getComputedStyle(pawn).overflow
      }));
    });
    for (const item of data) {
      assert.equal(item.width, "100%");
      assert.equal(item.height, "100%");
      assert.equal(item.overflow, "visible");
    }
  });

  await check("three-pawn pile may use compact layout", async () => {
    const compact = await page.evaluate(() => {
      const board = document.querySelector("#board");
      const tile = document.createElement("div"); tile.className = "track";
      const pawn = document.createElement("span"); pawn.className = "pin-pawn pile-size-3";
      const art = document.createElement("span"); art.className = "pin-pawn-art"; pawn.append(art); tile.append(pawn); board.append(tile);
      return getComputedStyle(art).width;
    });
    assert.notEqual(compact, "100%");
  });

  await check("four finished pawns remain full-size inside their color region", async () => {
    const data = await page.evaluate(() => {
      const board = document.querySelector("#board");
      const base = document.createElement("div"); base.className = "home-base base-0"; base.dataset.ludoSeat = "0";
      const square = document.createElement("div"); square.className = "lane red final-square"; square.dataset.ludoSeat = "0";
      const pawns = Array.from({length: 4}, (_, i) => {
        const pawn = document.createElement("span"); pawn.className = "pin-pawn finished-pawn finished-pawn-slot final-slot-" + (i + 1);
        const art = document.createElement("span"); art.className = "pin-pawn-art"; pawn.append(art); square.append(pawn); return { pawn, art };
      });
      board.append(base, square);
      return { sizes: pawns.map(({art}) => [getComputedStyle(art).width, getComputedStyle(art).height]), region: square.dataset.ludoSeat };
    });
    assert.deepEqual(data.sizes, [["100%","100%"],["100%","100%"],["100%","100%"],["100%","100%"]]);
    assert.equal(data.region, "0");
  });

  await check("custom colors drive seat-specific shimmer and mute is respected", async () => {
    const data = await page.evaluate(() => {
      const node = document.createElement("div");
      node.className = "base-0 finish-celebration-0";
      node.dataset.ludoSeat = "0";
      node.style.setProperty("--celebration-color", "#9b59e8");
      document.querySelector("#board").append(node);
      return { animation: getComputedStyle(node).animationName, color: node.style.getPropertyValue("--celebration-color") };
    });
    assert.equal(data.animation, "finish-color-pearl");
    assert.equal(data.color, "#9b59e8");
    await page.locator("#sound-toggle").click();
    assert.equal(await page.locator("#sound-toggle").getAttribute("aria-pressed"), "false");
    assert.equal(await page.evaluate(() => localStorage.getItem("ludu-mahir-sound")), "false");
  });

  await page.screenshot({ path: "screenshots/ludo-custom-colors-muted.png", fullPage: true });
  await context.close();

  const reduced = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const mobile = await reduced.newPage();
  await check("mobile reduced-motion board evidence", async () => {
    await mobile.goto(`${baseURL}/games/ludo/?screen=board&players=2&mode=friend`, { waitUntil: "networkidle" });
    await mobile.locator("#board").waitFor({ state: "visible" });
    const animation = await mobile.evaluate(() => {
      const node = document.createElement("div");
      node.className = "finish-celebration-0";
      document.querySelector("#board").append(node);
      return getComputedStyle(node).animationName;
    });
    assert.equal(animation, "none");
    await mobile.screenshot({ path: "screenshots/ludo-mobile-reduced-motion.png", fullPage: true });
  });
  await reduced.close();
} finally {
  fs.writeFileSync("test-results/ludo-results.json", JSON.stringify(results, null, 2));
  await browser.close();
}
