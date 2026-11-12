const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.CHESS_BASE_URL || "http://127.0.0.1:8000";
const out = process.env.CHESS_SCREENSHOTS || "/workspace/chess-verification";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  let pass = 0;
  const errors = [];
  const check = (ok, label) => {
    assert.ok(ok, label);
    pass++;
    console.log("PASS", label);
  };
  async function page(width = 390, height = 844) {
    const p = await browser.newPage({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    p.on("dialog", (dialog) => dialog.accept());
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("response", (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });
    await p.goto(base + "/games/chess/");
    await p.locator("#start").waitFor();
    return p;
  }
  async function shot(p, name) {
    await p.evaluate(() =>
      Promise.all([...document.images].map((i) => i.decode().catch(() => {}))),
    );
    await p.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  }
  async function move(p, from, to) {
    await p.locator(`[data-square="${from}"]`).click();
    await p.locator(`[data-square="${to}"]`).click();
    await p.waitForTimeout(210);
  }
  async function start(p, { local = false, black = false } = {}) {
    if (local) await p.click('#modes [data-value="local"]');
    if (black) await p.click('#sides [data-value="b"]');
    await p.click("#start");
  }
  const p = await page();
  await shot(p, "menu-mobile");
  check(
    (await p.locator("#modes button:disabled").count()) === 1,
    "online disabled",
  );
  check(
    (await p.locator(".menu-bottom button:disabled").count()) === 1,
    "leaderboard disabled",
  );
  await p.click("#rules");
  check(
    (await p.locator("#dialog").textContent()).includes("En passant"),
    "rules dialog works",
  );
  await p.click("#close-dialog");
  await p.click("#statistics");
  check(
    (await p.locator("#dialog").textContent()).includes("Completed games"),
    "statistics dialog works",
  );
  await p.click("#close-dialog");
  await p.click("#menu-settings");
  await p.selectOption("#time-control", "5");
  await p.click("#close-dialog");
  await start(p, { local: true });
  check(
    (await p.locator("#board .square").count()) === 64,
    "64 interactive squares",
  );
  check(
    (await p.locator('[data-clock="w"]').first().textContent()).includes(
      "05:00",
    ),
    "configured clocks",
  );
  check(
    (await p.locator("#player-bottom").textContent()).includes("Player 1"),
    "local player identity",
  );
  await shot(p, "mobile-white");
  const box = await p.locator("#board").boundingBox();
  check(Math.abs(box.width - box.height) < 1, "mobile square board");
  check(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "mobile no horizontal overflow",
  );
  await move(p, "e2", "e5");
  check(
    (await p.locator('[data-square="e2"] img').count()) === 1,
    "illegal move rejected",
  );
  await move(p, "e2", "e4");
  check(
    (await p.locator('[data-square="e4"] img').count()) === 1,
    "tap legal move",
  );
  await p.click("#undo");
  check(
    (await p.locator('[data-square="e2"] img').count()) === 1,
    "UI undo restores position",
  );
  await p.click("#flip");
  check(
    (await p.locator("#board button").first().getAttribute("data-square")) ===
      "h1",
    "flip changes orientation",
  );
  await p.click("#flip");
  await p.click("#hint");
  await p.waitForFunction(
    () => document.querySelector("#hint").textContent === "Hint (2)",
  );
  check(
    (await p.locator(".square.selected").count()) === 1,
    "worker hint selects legal source",
  );
  await p.click("#restart");
  await p.click("#confirm-restart");
  check(
    (await p.locator("#hint").textContent()) === "Hint (3)",
    "restart resets hints",
  );
  for (const [a, b] of [
    ["f2", "f3"],
    ["e7", "e5"],
    ["g2", "g4"],
    ["d8", "h4"],
  ])
    await move(p, a, b);
  check(
    (await p.locator("#result-title").textContent()) === "Black Win",
    "Fools Mate UI result",
  );
  check(
    (await p.locator('[data-square="h4"] img').count()) === 1,
    "final board preserved",
  );
  check(
    (await p.locator("#board button:disabled").count()) === 64,
    "no moves after checkmate",
  );
  await shot(p, "black-win");
  await p.click("#again");
  await move(p, "e2", "e4");
  await p.click("#resign");
  await p.click("#confirm-resign");
  check(
    (await p.locator("#result-title").textContent()) === "White Win",
    "local White Win",
  );
  await shot(p, "white-win");
  await p.click("#again");
  await p.click("#draw");
  await p.click("#accept-draw");
  check(
    (await p.locator("#result-title").textContent()) === "Draw",
    "draw agreement",
  );
  await shot(p, "draw");
  await p.close();
  const promotion = await page();
  await start(promotion, { local: true });
  for (const [from, to] of [
    ["a2", "a4"],
    ["h7", "h5"],
    ["a4", "a5"],
    ["h5", "h4"],
    ["a5", "a6"],
    ["h4", "h3"],
    ["a6", "b7"],
    ["h3", "g2"],
  ])
    await move(promotion, from, to);
  await promotion.locator('[data-square="b7"]').click();
  await promotion.locator('[data-square="a8"]').click();
  check(
    (await promotion.locator("button[data-promotion]").count()) === 4,
    "four UI promotion choices",
  );
  await promotion.click('[data-promotion="n"]');
  check(
    (
      await promotion.locator('[data-square="a8"] img').getAttribute("src")
    ).includes("wn.webp"),
    "UI underpromotion works",
  );
  await promotion.close();
  const race = await page();
  await start(race);
  await move(race, "e2", "e4");
  await race.click("#restart");
  await race.click("#confirm-restart");
  await race.waitForTimeout(1500);
  check(
    (await race.locator("#history li").count()) === 0,
    "restart cancels pending bot calculation",
  );
  check(
    (await race.locator('[data-square="e2"] img').count()) === 1,
    "restart preserves fresh position",
  );
  await race.close();
  const b = await page();
  await start(b, { black: true });
  await b.waitForFunction(
    () => document.querySelectorAll("#history li").length === 1,
  );
  check(
    (await b.locator("#player-bottom").textContent()).includes("Black"),
    "human Black association",
  );
  check(
    (await b.locator("#board button").first().getAttribute("data-square")) ===
      "h1",
    "Black orientation",
  );
  check(
    (await b.locator("#status").textContent()).includes("Black to move"),
    "White bot moves first",
  );
  await shot(b, "mobile-black");
  await b.click("#resign");
  await b.click("#confirm-resign");
  check(
    (await b.locator("#result-title").textContent()) === "You Lose!!",
    "defeat spelling",
  );
  await shot(b, "you-lose");
  await b.close();
  const w = await page();
  await w.clock.install();
  await start(w);
  await move(w, "e2", "e4");
  await w.clock.fastForward(601000);
  await w.waitForTimeout(100);
  check(
    (await w.locator("#result-title").textContent()) === "You Win",
    "human win by real clock expiry",
  );
  await shot(w, "you-win");
  await w.close();
  for (const level of ["easy", "medium", "hard"]) {
    const bot = await page();
    await bot.click(`#difficulties [data-value="${level}"]`);
    await start(bot);
    await move(bot, "e2", "e4");
    await bot.waitForFunction(
      () =>
        document.querySelector("#history li")?.textContent.trim().split(/\s+/)
          .length === 2,
    );
    check(
      (await bot.locator("#status").textContent()).includes("White to move"),
      `UI ${level} bot completes legal reply`,
    );
    check(
      (await bot.locator("#history li").textContent()).startsWith("e4 "),
      `UI ${level} preserves human move`,
    );
    await bot.close();
  }
  const narrow = await page(320, 740);
  await start(narrow, { local: true });
  check(
    await narrow.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "320px no overflow",
  );
  await shot(narrow, "mobile-320");
  await narrow.close();
  const d = await page(1440, 1000);
  await shot(d, "menu-desktop");
  await start(d, { local: true, black: true });
  await shot(d, "desktop-black");
  const board = await d.locator("#board").boundingBox(),
    controls = await d.locator(".game-controls").boundingBox();
  check(controls.x > board.x + board.width, "desktop controls on right");
  check(Math.abs(board.width - board.height) < 1, "desktop square board");
  check(
    await d.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "desktop no overflow",
  );
  await d.goto(base + "/games/");
  check(
    (await d.locator('a[href="/games/chess/"]').count()) === 1,
    "single existing preview route",
  );
  check(
    (await d.locator(".chess-preview img").count()) === 1,
    "new preview artwork",
  );
  await d
    .locator('a[href="/games/chess/"]')
    .screenshot({ path: `${out}/preview.png` });
  await d.close();
  check(
    errors.length === 0,
    `no browser or asset errors: ${errors.join("; ")}`,
  );
  console.log(JSON.stringify({ passed: pass, failed: 0, screenshots: out }));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
