const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const base = process.env.LUDO_BASE_URL || "http://127.0.0.1:8125";
const output =
  process.env.LUDO_SCREENSHOTS || "/workspace/ludo-layout-verification";
fs.mkdirSync(output, { recursive: true });
(async () => {
  let server;
  if (!process.env.LUDO_BASE_URL) {
    const root = path.resolve(__dirname, "../..");
    server = http.createServer((req, res) => {
      let file = path.join(root, decodeURIComponent(req.url.split("?")[0]));
      if (file.endsWith("/")) file += "index.html";
      try {
        res.setHeader(
          "Content-Type",
          {
            ".html": "text/html",
            ".mjs": "text/javascript",
            ".css": "text/css",
            ".svg": "image/svg+xml",
            ".webp": "image/webp",
          }[path.extname(file)] || "application/octet-stream",
        );
        res.end(fs.readFileSync(file));
      } catch {
        res.statusCode = 404;
        res.end();
      }
    });
    await new Promise((resolve) => server.listen(8125, "127.0.0.1", resolve));
  }
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  let passed = 0;
  const errors = [];
  function check(value, label) {
    assert.ok(value, label);
    passed++;
    console.log("PASS", label);
  }
  async function screenshot(page, name) {
    await page.evaluate(() =>
      Promise.all([...document.images].map((i) => i.decode().catch(() => {}))),
    );
    await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
  }
  for (const [width, height] of [
    [1366, 768],
    [1280, 720],
    [1024, 600],
    [1920, 1080],
    [390, 844],
    [320, 740],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      Math.random = () => 0.999;
    });
    await page.goto(`${base}/games/ludo/`);
    const tag = `${width}x${height}`;
    if (width >= 900)
      check(
        await page.evaluate(
          () => document.documentElement.scrollHeight <= innerHeight + 1,
        ),
        `desktop menu fits ${tag}`,
      );
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `menu width ${tag}`,
    );
    await screenshot(page, `menu-${tag}`);
    await page.click('#mode-buttons [data-value="friend"]');
    await page.click('#player-buttons [data-value="4"]');
    await page.click("#start-game");
    await page.waitForURL("**/?screen=board");
    await page.locator("#board .pin-pawn").first().waitFor();
    const board = await page.locator("#board").boundingBox();
    check(Math.abs(board.width - board.height) < 1, `square board ${tag}`);
    if (width >= 900) {
      check(
        await page.evaluate(
          () => document.documentElement.scrollHeight <= innerHeight + 1,
        ),
        `desktop full game fits ${tag}`,
      );
      for (const color of ["red", "green", "blue", "yellow"]) {
        const panel = await page.locator(`#dice-${color}`).boundingBox();
        check(
          panel.y >= 0 &&
            panel.y + panel.height <= height &&
            (panel.x + panel.width <= board.x + 1 ||
              panel.x >= board.x + board.width - 1),
          `${color} panel beside board ${tag}`,
        );
      }
    }
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `board width ${tag}`,
    );
    check(
      (await page.locator(".track.safe").count()) === 8,
      `eight safe stars ${tag}`,
    );
    const aligned = await page.locator("#board").evaluate((board) => {
      const rect = board.getBoundingClientRect();
      const fixtures = [
        ["start-square.green", 670, 110, 82, 71],
        ["start-square.red", 128, 462, 77, 76],
        ["safe-route-red", 507, 181, 82, 71],
        ["start-square.blue", 507, 982, 82, 72],
      ];
      return fixtures.every(([selector, x, y, w, h]) => {
        const cell = board
          .querySelector("." + selector.replaceAll(".", "."))
          .getBoundingClientRect();
        return (
          Math.abs(((cell.x - rect.x) / rect.width) * 1254 - x) < 2 &&
          Math.abs(((cell.y - rect.y) / rect.height) * 1254 - y) < 2 &&
          Math.abs((cell.width / rect.width) * 1254 - w) < 2 &&
          Math.abs((cell.height / rect.height) * 1254 - h) < 2
        );
      });
    });
    check(aligned, `stars aligned to artwork ${tag}`);
    const colors = await page.locator("#board").evaluate((board) =>
      ["red", "blue", "green", "yellow"].every((color) => {
        const lane = board.querySelector(`.lane.${color}`),
          start = board.querySelector(`.start-square.${color}`),
          safe = board.querySelector(`.safe-route-${color}`);
        const tint = (e) =>
          getComputedStyle(e).getPropertyValue("--tile-color").trim();
        const bevel = (e) => getComputedStyle(e, "::after").backgroundImage;
        return (
          tint(lane) === tint(start) &&
          tint(lane) === tint(safe) &&
          bevel(lane) === bevel(start) &&
          bevel(lane) === bevel(safe)
        );
      }),
    );
    check(colors, `lane and safe tile colors match ${tag}`);
    await screenshot(page, `board-${tag}`);
    if (width === 1366 || width === 390) {
      await page.click("#dice-red .player-dice-label");
      await page.click('#dice-red .player-color-swatch[data-color="4"]');
      check(
        await page
          .locator("#board .base-0")
          .evaluate((e) => e.classList.contains("custom-color")),
        `custom yard ${tag}`,
      );
      check(
        await page
          .locator("#board .safe-route-red")
          .evaluate(
            (e) =>
              getComputedStyle(e).getPropertyValue("--tile-color").trim() ===
              "#9b59e8",
          ),
        `custom safe color ${tag}`,
      );
      await screenshot(page, `custom-purple-${tag}`);
      await page.locator(".player-dice.active .die-face").click();
      await page.locator(".playable-token").first().waitFor();
      const after = await page.locator("#board").boundingBox();
      check(
        Math.abs(after.y - board.y) < 1 &&
          Math.abs(after.width - board.width) < 1,
        `board stable after roll ${tag}`,
      );
      const token = await page.locator(".playable-token").first().boundingBox();
      await page.mouse.click(
        token.x + token.width / 2,
        token.y + token.height / 2,
      );
      await page.waitForTimeout(450);
      check(
        (await page.locator(".track .pin-pawn").count()) >= 1,
        `live pawn move works ${tag}`,
      );
      async function checkPawnCenter(count) {
        const geometry = await page
          .locator(".track:has(.pin-pawn)")
          .first()
          .evaluate((tile) => {
            const t = tile.getBoundingClientRect();
            const boxes = [...tile.querySelectorAll(".pin-outline")].map(
              (outline) => {
                const b = outline.getBBox(),
                  matrix = outline.getScreenCTM();
                const a = new DOMPoint(b.x, b.y).matrixTransform(matrix);
                const z = new DOMPoint(
                  b.x + b.width,
                  b.y + b.height,
                ).matrixTransform(matrix);
                return { left: a.x, right: z.x, top: a.y, bottom: z.y };
              },
            );
            const left = Math.min(...boxes.map((b) => b.left)),
              right = Math.max(...boxes.map((b) => b.right));
            const top = Math.min(...boxes.map((b) => b.top)),
              bottom = Math.max(...boxes.map((b) => b.bottom));
            return {
              count: boxes.length,
              dx: Math.abs((left + right) / 2 - (t.left + t.right) / 2),
              dy: Math.abs((top + bottom) / 2 - (t.top + t.bottom) / 2),
              inside: boxes.every(
                (b) =>
                  b.left >= t.left - 0.5 &&
                  b.right <= t.right + 0.5 &&
                  b.top >= t.top - 0.5 &&
                  b.bottom <= t.bottom + 0.5,
              ),
            };
          });
        check(
          geometry.count === count &&
            geometry.dx < 0.75 &&
            geometry.dy < 0.75 &&
            geometry.inside,
          `${count} pawn silhouettes centered inside tile ${tag}`,
        );
      }
      await checkPawnCenter(1);
      for (const count of [2, 3, 4]) {
        await page.locator(".player-dice.active .die-face").click();
        await page.locator(".yard .playable-token").first().waitFor();
        const pawn = await page
          .locator(".yard .playable-token")
          .first()
          .boundingBox();
        await page.mouse.click(
          pawn.x + pawn.width / 2,
          pawn.y + pawn.height / 2,
        );
        await page.waitForFunction(
          (n) =>
            document.querySelectorAll(".track .pin-pawn:not(.moving)")
              .length === n,
          count,
        );
        await checkPawnCenter(count);
        await screenshot(page, `centered-${count}-pawns-${tag}`);
      }
      await page.locator(".player-dice.active .die-face").click();
      await page.locator(".track .playable-token").first().waitFor();
      const movingPawn = await page
        .locator(".track .playable-token")
        .first()
        .boundingBox();
      await page.mouse.click(
        movingPawn.x + movingPawn.width / 2,
        movingPawn.y + movingPawn.height / 2,
      );
      await page
        .locator('.track .pin-pawn[data-step="6"]:not(.moving)')
        .waitFor();
      const soloCentered = await page
        .locator('.track .pin-pawn[data-step="6"] .pin-pawn-art')
        .evaluate((svg) => {
          const a = svg.getBoundingClientRect(),
            b = svg.closest(".track").getBoundingClientRect();
          return (
            Math.abs(a.x + a.width / 2 - b.x - b.width / 2) < 0.75 &&
            Math.abs(a.y + a.height / 2 - b.y - b.height / 2) < 0.75
          );
        });
      check(soloCentered, `moving pawn settles in tile center ${tag}`);
      await screenshot(page, `centered-route-pawns-${tag}`);
    }
    await page.close();
  }
  for (const count of [2, 3]) {
    const page = await browser.newPage({
      viewport: { width: 1366, height: 768 },
    });
    await page.goto(`${base}/games/ludo/`);
    await page.click('#mode-buttons [data-value="friend"]');
    await page.click(`#player-buttons [data-value="${count}"]`);
    await page.click("#start-game");
    await page.waitForURL("**/?screen=board");
    check(
      (await page.locator(".player-dice:visible").count()) === count,
      `${count}-player panels`,
    );
    await page.locator("#board .pin-pawn").first().waitFor();
    check(
      (await page.locator("#board .pin-pawn:visible").count()) === count * 4,
      `${count}-player pawns visible`,
    );
    check(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight + 1,
      ),
      `${count}-player game fits`,
    );
    await screenshot(page, `board-${count}-players`);
    await page.close();
  }
  check(errors.length === 0, `no page errors ${errors.join("; ")}`);
  console.log(JSON.stringify({ passed, failed: 0, screenshots: output }));
  await browser.close();
  if (server) server.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
