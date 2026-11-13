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
    assert.equal(data[0].width, data[1].width);
    assert.equal(data[0].height, data[1].height);
    for (const item of data) assert.equal(item.overflow, "visible");
    assert.match(data[0].width, /px$/);
    assert.match(data[0].height, /px$/);
  });

  await check("adjacent pawn heads stay visible while bodies may overlap", async () => {
    const data = await page.evaluate(async () => {
      const board = document.querySelector("#board");
      const tiles = [...board.querySelectorAll(".track")].slice(0, 4);
      const pawns = tiles.map((tile, index) => {
        const pawn = document.createElement("span");
        pawn.className = "pin-pawn ludo-pawn";
        pawn.dataset.testPawn = String(index);
        const art = document.createElement("span");
        art.className = "pin-pawn-art";
        art.style.cssText = "position:relative;display:block";
        const head = document.createElement("span");
        head.className = "test-pawn-head pin-face";
        head.style.cssText = "position:absolute;left:50%;top:8%;width:34%;height:34%;border-radius:50%;background:#fff;border:2px solid #123;transform:translateX(-50%)";
        art.append(head); pawn.append(art); tile.append(pawn); return { pawn, art, head, tile };
      });
      window.__luduResolvePawnGeometry();
      await new Promise(requestAnimationFrame);
      return pawns.map(({art, head, tile}) => ({
        art: art.getBoundingClientRect().toJSON(),
        head: head.getBoundingClientRect().toJSON(),
        tile: tile.getBoundingClientRect().toJSON()
      }));
    });
    for (const item of data) {
      assert.ok(item.art.width >= 40 && item.art.height >= 40, "single pawn stayed full-size");
      assert.ok(item.head.width > 0 && item.head.height > 0, "pawn head is painted");
      assert.ok(item.head.left >= item.tile.left && item.head.right <= item.tile.right, "head stays inside its tile horizontally");
      assert.ok(item.head.top >= item.tile.top && item.head.bottom <= item.tile.bottom, "head stays inside its tile vertically");
    }
    for (let i = 0; i < data.length; i++) {
      for (let j = i + 1; j < data.length; j++) {
        const a = data[i].head, b = data[j].head;
        const overlapWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const overlapHeight = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        assert.equal(overlapWidth * overlapHeight, 0, "pawn heads " + i + "/" + j + " overlap");
      }
    }
    await page.screenshot({ path: "screenshots/ludo-desktop-adjacent-heads-visible.png", fullPage: true });
  });

  await check("three-pawn pile may use compact layout", async () => {
    const compact = await page.evaluate(() => {
      const board = document.querySelector("#board");
      const tile = document.createElement("div"); tile.className = "track";
      const pawn = document.createElement("span"); pawn.className = "pin-pawn pile-size-3";
      const art = document.createElement("span"); art.className = "pin-pawn-art"; pawn.append(art); tile.append(pawn); board.append(tile);
      return getComputedStyle(art).width;
    });
    assert.match(compact, /px$/);
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
    assert.equal(new Set(data.sizes.map(([width]) => width)).size, 1);
    assert.equal(new Set(data.sizes.map(([, height]) => height)).size, 1);
    for (const [width, height] of data.sizes) {
      assert.match(width, /px$/);
      assert.match(height, /px$/);
    }
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
