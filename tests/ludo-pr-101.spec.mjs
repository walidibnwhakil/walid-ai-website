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

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
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

  await check("open color picker stays above the board", async () => {
    const label = page.locator(".player-dice-label:not(:disabled)").first();
    await label.click();
    const data = await page.evaluate(() => {
      const picker = document.querySelector(".player-color-picker:not([hidden])");
      const panel = picker.closest(".player-dice");
      const rect = picker.getBoundingClientRect();
      return {
        hidden: picker.hidden,
        zIndex: getComputedStyle(picker).zIndex,
        panelZIndex: getComputedStyle(panel).zIndex,
        width: rect.width,
        height: rect.height
      };
    });
    assert.equal(data.hidden, false);
    assert.equal(data.zIndex, "100");
    assert.equal(data.panelZIndex, "30");
    assert.ok(data.width > 200 && data.height > 20);
    await page.screenshot({ path: "screenshots/ludo-desktop-color-picker-layer.png", fullPage: true });
    await label.click();
  });

  await check("player seats follow cross and clockwise order", async () => {
    const four = await context.newPage();
    await four.goto(`${baseURL}/games/ludo/?screen=board&players=4&mode=bot`, { waitUntil: "networkidle" });
    await four.locator("#board").waitFor({ state: "visible" });
    const labels = await four.evaluate(() => Object.fromEntries(
      [...document.querySelectorAll(".player-dice:not([hidden])")].map(panel => [panel.id, panel.querySelector(".player-dice-label").textContent])
    ));
    assert.match(labels["dice-yellow"], /Player 1/);
    assert.match(labels["dice-blue"], /Player 2/);
    assert.match(labels["dice-red"], /Player 3/);
    assert.match(labels["dice-green"], /Player 4/);
    await four.close();
  });

  // Track anchor and painted-bound regressions live in ludo-tip-geometry.cjs.

  // Finished/home slots are measured as real SVG artwork in ludo-tip-geometry.cjs.

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
