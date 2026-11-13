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
  async function newPage(options) {
    const page = await browser.newPage(options);
    page.on("dialog", (dialog) => dialog.accept());
    return page;
  }
  let passed = 0;
  const errors = [];
  function check(value, label) {
    assert.ok(value, label);
    passed++;
    console.log("PASS", label);
  }
  async function screenshot(page, name) {
    await page.evaluate(() =>
      Promise.all(
        [...document.images]
          .filter((i) => i.getClientRects().length > 0)
          .map((i) => i.decode().catch(() => {})),
      ),
    );
    await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
  }
  async function logoMetrics(locator) {
    return locator.evaluate((el) => {
      const r = el.getBoundingClientRect(),
        words = el.querySelector(".mahir-brand-words");
      return {
        src: el.querySelector("img").src,
        aspect: r.width / r.height,
        font: parseFloat(getComputedStyle(words).fontSize) / r.width,
        top: (words.getBoundingClientRect().top - r.top) / r.height,
        text: words.textContent,
        gold: getComputedStyle(words).color,
        ivory: getComputedStyle(words.querySelector("strong")).color,
      };
    });
  }
  for (const [width, height] of [
    [1366, 768],
    [1280, 720],
    [1024, 600],
    [1920, 1080],
    [390, 844],
    [320, 740],
  ]) {
    const page = await newPage({
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
    const menuBrand = await logoMetrics(
      page.locator("#ludo-setup .mahir-brand"),
    );
    await screenshot(page, `menu-${tag}`);
    await page.click('#mode-buttons [data-value="friend"]');
    await page.click('#player-buttons [data-value="4"]');
    await page.click("#start-game");
    await page.waitForURL((url) => url.searchParams.get("screen") === "board");
    await page.locator("#board .pin-pawn").first().waitFor();
    const board = await page.locator("#board").boundingBox();
    const boardBrand = await logoMetrics(
      page.locator(".board-logo .mahir-brand"),
    );
    check(
      boardBrand.text === "LuduMahir" &&
        (await page.locator(".board-logo .mahir-brand-words > *").count()) ===
          2,
      `board uses two-line menu logo ${tag}`,
    );
    check(
      boardBrand.src === menuBrand.src &&
        Math.abs(boardBrand.aspect - menuBrand.aspect) < 0.01 &&
        Math.abs(boardBrand.font - menuBrand.font) < 0.001 &&
        Math.abs(boardBrand.top - menuBrand.top) < 0.01 &&
        boardBrand.gold === menuBrand.gold &&
        boardBrand.ivory === menuBrand.ivory,
      `menu and board logo design matches ${tag}`,
    );

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
    // The outer SVG is now the cell viewport. Measure the transformed artwork,
    // whose full stroke-inclusive envelope is centered in each approved home slot.
    const homeGeometry = await page.locator("#board .yard .pin-pawn-art").evaluateAll((svgs) =>
      svgs.map((svg) => {
        const matrix = svg.querySelector(".pin-shape").getScreenCTM();
        const center = new DOMPoint(32, (1.75 + 80) / 2).matrixTransform(matrix);
        const left = new DOMPoint(3.75, 1.75).matrixTransform(matrix);
        const right = new DOMPoint(60.25, 80).matrixTransform(matrix);
        const tile = svg.closest(".yard").getBoundingClientRect();
        return {
          height: right.y - left.y,
          centered: Math.abs(center.x - tile.x - tile.width / 2) < .75 &&
            Math.abs(center.y - tile.y - tile.height / 2) < .75,
          contained: left.x >= tile.left - .1 && right.x <= tile.right + .1 &&
            left.y >= tile.top - .1 && right.y <= tile.bottom + .1,
        };
      }),
    );
    check(homeGeometry.length > 0 && homeGeometry.every(p => p.centered), `home artwork centered ${tag}`);
    check(homeGeometry.every(p => p.contained) &&
      Math.max(...homeGeometry.map(p => p.height)) - Math.min(...homeGeometry.map(p => p.height)) < .1,
      `uniform painted home-slot size and containment ${tag}`);

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
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const geometry = await page
          .locator(".track:has(.pin-pawn)")
          .first()
          .evaluate((tile) => {
            const t = tile.getBoundingClientRect();
            const feet = [...tile.querySelectorAll(".pin-pawn-art")].map(
              (svg) => {
                const r = svg.querySelector(".pin-outline").getBoundingClientRect();
                const matrix = new DOMMatrix([r.width / 54, 0, 0, r.height / 74,
                  r.left - 5 * r.width / 54, r.top - 3 * r.height / 74]);
                return new DOMPoint(32, tile.querySelectorAll(".pin-pawn-art").length === 2 ? 77 :
                  77 + 1.25 * Math.hypot(10, 12) / 10).matrixTransform(matrix);
              },
            );
            const left = Math.min(...feet.map((p) => p.x)),
              right = Math.max(...feet.map((p) => p.x));
            const top = Math.min(...feet.map((p) => p.y)),
              bottom = Math.max(...feet.map((p) => p.y));
            return {
              count: feet.length,
              dx: Math.abs((left + right) / 2 - (t.left + t.right) / 2),
              dy: Math.abs((top + bottom) / 2 - (t.top + t.bottom) / 2),
              inside: feet.every(
                (p) =>
                  p.x >= t.left &&
                  p.x <= t.right &&
                  p.y >= t.top &&
                  p.y <= t.bottom,
              ),
            };
          });
        check(
          geometry.count === count &&
            geometry.dx < 0.75 &&
            geometry.dy < 0.75 &&
            geometry.inside,
          `${count} pawn feet centered inside tile ${tag}: ${JSON.stringify(geometry)}`,
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
          const foot = new DOMPoint(32, 77 + 1.25 * Math.hypot(10, 12) / 10).matrixTransform(svg.querySelector(".pin-shape").getScreenCTM()),
            b = svg.closest(".track").getBoundingClientRect();
          return (
            Math.abs(foot.x - b.x - b.width / 2) < 0.75 &&
            Math.abs(foot.y - b.y - b.height / 2) < 0.75
          );
        });
      check(soloCentered, `moving pawn foot settles in tile center ${tag}`);
      await screenshot(page, `centered-route-pawns-${tag}`);
    }
    await page.close();
  }
  for (const width of [1366, 390])
    for (const mode of ["friend", "bot"])
      for (const count of [2, 3]) {
        const page = await newPage({
          viewport: { width, height: width === 390 ? 844 : 768 },
          isMobile: width === 390,
          hasTouch: width === 390,
        });
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(`${base}/games/ludo/`);
        await page.click(`#mode-buttons [data-value="${mode}"]`);
        await page.click(`#player-buttons [data-value="${count}"]`);
        await page.click("#start-game");
        await page.waitForURL(
          (url) => url.searchParams.get("screen") === "board",
        );
        await page.locator("#board .pin-pawn").first().waitFor();
        const tag = `${count}-player ${mode} ${width}`;
        check(
          (await page.locator(".player-dice:visible").count()) === count,
          `${tag} panels`,
        );
        check(
          (await page.locator("#board .pin-pawn").count()) === count * 4,
          `${tag} only participating pawns exist`,
        );
        check(
          (await page.locator("#board .inactive-yard .pin-pawn").count()) === 0,
          `${tag} unused yards are empty`,
        );
        await page.reload();
        await page.locator("#board .pin-pawn").first().waitFor();
        check(
          (await page.locator("#board .pin-pawn").count()) === count * 4,
          `${tag} roster survives refresh`,
        );
        if (width >= 900)
          check(
            await page.evaluate(
              () => document.documentElement.scrollHeight <= innerHeight + 1,
            ),
            `${tag} fits desktop`,
          );
        await screenshot(page, `board-${count}-${mode}-${width}`);
        await page.click("#back-to-setup");
        await page.waitForURL((url) => !url.searchParams.has("screen"));
        check(
          (await page
            .locator('#player-buttons [aria-pressed="true"]')
            .getAttribute("data-value")) === String(count),
          `${tag} menu keeps selected count`,
        );
        await page.close();
      }
  // A board-side player-count change must survive refresh (including a prior 4-player setup).
  for (const width of [390, 1366]) {
    const page = await newPage({
      viewport: { width, height: width === 390 ? 844 : 768 },
      isMobile: width === 390,
      hasTouch: width === 390,
    });
    await page.goto(`${base}/games/ludo/`);
    await page.click('#player-buttons [data-value="4"]');
    await page.click('#mode-buttons [data-value="friend"]');
    await page.click("#start-game");
    await page.waitForURL((url) => url.searchParams.get("screen") === "board");
    await page.click("#board-settings");
    await page.selectOption("#player-count", "2");
    check(
      (await page.locator("#board .pin-pawn:visible").count()) === 8,
      `settings switch to 2 players ${width}`,
    );
    await page.reload();
    check(
      (await page.locator("#board .pin-pawn:visible").count()) === 8,
      `2-player roster survives refresh ${width}`,
    );
    await page.click("#board-settings");
    await page.selectOption("#player-count", "3");
    await page.reload();
    await page.locator("#board .pin-pawn").first().waitFor();
    check(
      (await page.locator("#board .pin-pawn").count()) === 12,
      `3-player settings survive refresh ${width}`,
    );
    await page.close();
  }
  const stale = await newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  stale.on("pageerror", (error) => errors.push(error.message));
  await stale.addInitScript(() =>
    sessionStorage.setItem(
      "ludu-mahir-game",
      JSON.stringify({ players: "4", mode: "bot", colors: [0, 1, 2, 3] }),
    ),
  );
  await stale.goto(`${base}/games/ludo/?screen=board&players=2&mode=friend`);
  await stale.locator("#board .pin-pawn").first().waitFor();
  check(
    (await stale.locator("#board .pin-pawn").count()) === 8,
    "explicit 2-player phone launch overrides stale 4-player settings",
  );
  check(
    (await stale.locator("#mode").inputValue()) === "friend",
    "explicit local mode overrides stale bot mode",
  );
  await stale.close();
  const blocked = await newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  blocked.on("pageerror", (error) => errors.push(error.message));
  await blocked.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("Blocked", "SecurityError");
    };
  });
  await blocked.goto(`${base}/games/ludo/`);
  await blocked.click('#player-buttons [data-value="2"]');
  await blocked.click("#start-game");
  await blocked.waitForURL((url) => url.searchParams.get("screen") === "board");
  await blocked.locator("#board .pin-pawn").first().waitFor();
  check(
    (await blocked.locator("#board .pin-pawn").count()) === 8,
    "phone starts with exactly two players when browser storage is blocked",
  );
  await blocked.close();
  check(errors.length === 0, `no page errors ${errors.join("; ")}`);
  console.log(JSON.stringify({ passed, failed: 0, screenshots: output }));
  await browser.close();
  if (server) server.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
