const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  http = require("node:http"),
  path = require("node:path");
const base = process.env.GAMES_BASE_URL || "http://127.0.0.1:8126";
(async () => {
  let server;
  if (!process.env.GAMES_BASE_URL) {
    server = http.createServer((req, res) => {
      const requestPath = decodeURIComponent(req.url.split("?")[0]);
      let file = path.join(path.resolve(__dirname, ".."), requestPath);
      if (requestPath.endsWith("/")) file = path.join(file, "index.html");
      try {
        res.setHeader(
          "Content-Type",
          {
            ".html": "text/html",
            ".mjs": "text/javascript",
            ".js": "text/javascript",
            ".css": "text/css",
            ".svg": "image/svg+xml",
            ".webp": "image/webp",
            ".json": "application/json",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jfif": "image/jpeg",
          }[path.extname(file)] || "application/octet-stream",
        );
        res.end(fs.readFileSync(file));
      } catch {
        res.statusCode = 404;
        res.end();
      }
    });
    await new Promise((r) => server.listen(8126, "127.0.0.1", r));
  }
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  let passed = 0;
  const errors = [];
  const check = (ok, label) => {
    assert.ok(ok, label);
    passed++;
    console.log("PASS", label);
  };
  async function page(game) {
    const p = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: "reduce",
    });
    p.on("pageerror", (e) => errors.push(`${game}: ${e.message}`));
    await p.addInitScript(() => {
      Math.random = () => 0;
    });
    await p.goto(`${base}/games/${game ? game + "/" : ""}`);
    return p;
  }
  async function guarded(p, expected, label) {
    check(
      (await p.evaluate(() =>
        document.documentElement.classList.contains("game-in-progress"),
      )) === expected,
      label,
    );
    check(
      (await p.evaluate(
        () => getComputedStyle(document.documentElement).overscrollBehaviorY,
      )) === (expected ? "none" : "auto"),
      `${label}: root pull behavior`,
    );
  }
  async function gesture(
    p,
    { dx = 0, dy = 90, multi = false, nested = false, scroll = 0 } = {},
  ) {
    return p.evaluate(
      ({ dx, dy, multi, nested, scroll }) => {
        let target = document.body,
          fixture;
        if (nested) {
          fixture = document.createElement("div");
          fixture.style.cssText =
            "position:fixed;top:5px;right:5px;width:90px;height:90px;overflow:auto";
          fixture.innerHTML = '<div style="height:400px">Scrollable</div>';
          document.body.append(fixture);
          fixture.scrollTop = scroll;
          target = fixture.firstElementChild;
        }
        const dispatch = (type, x, y, cancelable) => {
          const e = new Event(type, { bubbles: true, cancelable });
          Object.defineProperty(e, "touches", {
            value: multi
              ? [
                  { clientX: x, clientY: y },
                  { clientX: x + 40, clientY: y },
                ]
              : [{ clientX: x, clientY: y }],
          });
          target.dispatchEvent(e);
          return e.defaultPrevented;
        };
        dispatch("touchstart", 50, 50, false);
        const prevented = dispatch("touchmove", 50 + dx, 50 + dy, true);
        target.dispatchEvent(new Event("touchend", { bubbles: true }));
        fixture?.remove();
        return prevented;
      },
      { dx, dy, multi, nested, scroll },
    );
  }
  async function shortcuts(p, expected) {
    for (const key of [
      { key: "F5" },
      { key: "r", ctrlKey: true },
      { key: "R", ctrlKey: true, shiftKey: true },
      { key: "r", metaKey: true },
    ])
      check(
        (await p.evaluate((k) => {
          const e = new KeyboardEvent("keydown", {
            ...k,
            bubbles: true,
            cancelable: true,
          });
          document.dispatchEvent(e);
          return e.defaultPrevented;
        }, key)) === expected,
        `${expected ? "blocks" : "allows"} refresh shortcut ${JSON.stringify(key)}`,
      );
  }
  async function tapMove(p, from, to) {
    await p.locator(`[data-square="${from}"]`).click();
    await p.locator(`[data-square="${to}"]`).click();
    await p.waitForTimeout(200);
  }
  const l = await page("ludo");
  await guarded(l, false, "Ludu menu unprotected");
  check(!(await gesture(l)), "menu allows downward pull");
  await shortcuts(l, false);
  await l.click('#mode-buttons [data-value="friend"]');
  await l.click('#player-buttons [data-value="2"]');
  await l.click("#start-game");
  await l.waitForURL((u) => u.searchParams.get("screen") === "board");
  await guarded(l, true, "Ludu board protected");
  check(await gesture(l), "active game blocks downward top pull");
  check(!(await gesture(l, { dy: -90 })), "upward scroll allowed");
  check(!(await gesture(l, { dx: 90, dy: 10 })), "horizontal gestures allowed");
  check(!(await gesture(l, { multi: true })), "pinch/multitouch allowed");
  check(
    !(await gesture(l, { nested: true, scroll: 40 })),
    "nested scroller can scroll up",
  );
  check(
    await gesture(l, { nested: true, scroll: 0 }),
    "nested top cannot chain a page refresh",
  );
  await shortcuts(l, true);
  // Play an actual move, then cancel a real browser reload warning.
  await l.evaluate(() => {
    Math.random = () => 0.999;
  });
  await l.locator(".player-dice.active .die-face").click();
  await l.locator(".playable-token").first().waitFor();
  await l.locator(".playable-token").first().press("Enter");
  await l.locator(".track .pin-pawn").first().waitFor();
  await l.waitForTimeout(400);
  let warnings = 0;
  l.on("dialog", async (d) => {
    if (d.type() === "beforeunload") warnings++;
    await d.dismiss();
  });
  await l.evaluate(() => {
    window.__refreshProbe = "kept";
  });
  await l.keyboard.press("F5");
  await l.waitForTimeout(120);
  check(
    (await l.evaluate(() => window.__refreshProbe)) === "kept" &&
      warnings === 0,
    "real F5 is blocked without losing progress",
  );
  await l.keyboard.press("Control+r");
  await l.waitForTimeout(120);
  check(
    (await l.evaluate(() => window.__refreshProbe)) === "kept" &&
      warnings === 0,
    "real Ctrl+R is blocked without losing progress",
  );
  await l.reload({ timeout: 5000 }).catch(() => {});
  check(warnings === 1, "native browser reload warning shown");
  check(
    (await l.locator(".track .pin-pawn").count()) === 1,
    "cancelling reload preserves played Ludu position",
  );
  await l.click("#back-to-setup");
  await l.waitForURL((u) => !u.searchParams.has("screen"));
  await guarded(l, false, "Ludu returns to normal menu");
  const previous = warnings;
  await l.reload();
  check(warnings === previous, "menu reload has no warning");
  await l.close();
  const c = await page("chess");
  await guarded(c, false, "Chess menu unprotected");
  await c.click('#modes [data-value="local"]');
  await c.click("#start");
  await guarded(c, true, "Chess match protected");
  await tapMove(c, "e2", "e4");
  check(
    (await c.locator('[data-square="e4"] img').count()) === 1,
    "Chess tap moves still work",
  );
  await c.click("#resign");
  await c.click("#confirm-resign");
  await guarded(c, false, "Chess result unprotected");
  await c.click("#again");
  await guarded(c, true, "Chess replay protected");
  await c.click("#back");
  await c.click("#leave-game");
  await guarded(c, false, "Chess menu restored");
  await c.close();
  const t = await page("tic-tac-toe");
  await guarded(t, false, "Tic Tac Toe ready unprotected");
  await t.selectOption("#mode", "friend");
  for (const [i, index] of [0, 3, 1, 4, 2].entries()) {
    await t.locator("#board button").nth(index).click();
    if (i === 0) await guarded(t, true, "Tic Tac Toe started protected");
  }
  await guarded(t, false, "Tic Tac Toe finished unprotected");
  await t.close();
  const f = await page("penalty");
  await guarded(f, false, "Penalty ready unprotected");
  await f.locator("#actions button").nth(2).click();
  await guarded(f, true, "Penalty shootout protected");
  for (let i = 0; i < 5; i++) {
    await f.locator('#board[data-phase="save"]').waitFor();
    await f.locator("#actions button").nth(0).click();
    if (i < 4) {
      await f.locator('#board[data-phase="shoot"]').waitFor();
      await f.locator("#actions button").nth(2).click();
    }
  }
  await f.locator('#board[data-phase="end"]').waitFor();
  await guarded(f, false, "Penalty result unprotected");
  await f.close();
  const s = await page("snakes-and-ladders");
  await guarded(s, false, "Serpent menu unprotected");
  await s.click("#start");
  if(await s.locator("#skip").isVisible()) await s.click("#skip");
  await s.waitForSelector("#play:visible");
  await guarded(s, true, "Serpent match protected");
  check(await s.locator("#pause").count() === 0, "Serpent has no timer/pause control");
  await s.click("#menu-button");
  await guarded(s, false, "Serpent menu restored");
  await s.close();
  const n = await page("2048");
  await guarded(n, false, "2048 ready unprotected");
  await n.locator("#board").focus();
  await n.keyboard.press("ArrowLeft");
  await guarded(n, true, "2048 played protected");
  const before = await n.locator("#board").textContent();
  // Real touch swipes must keep reaching the game even while root pull-to-refresh is disabled.
  const box = await n.locator("#board").boundingBox(),
    cdp = await n.context().newCDPSession(n);
  const x = box.x + box.width / 2,
    y = box.y + box.height / 3;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let i = 1; i <= 4; i++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: y + i * 18 }],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  check(
    (await n.locator("#board").textContent()) !== before,
    "2048 real downward touch swipe still moves tiles",
  );
  await n.click("#restart");
  await guarded(n, false, "2048 reset unprotected");
  await n.close();
  const r = await page("riddlex");
  await guarded(r, false, "Riddlex splash unprotected");
  await r.click("#play");
  await guarded(r, false, "Riddlex category menu unprotected");
  await r.click('[data-category="characters"]');
  await guarded(r, true, "Riddlex case protected");
  await r.click("#new");
  await guarded(r, false, "Riddlex new-case menu unprotected");
  await r.close();
  const index = await page("");
  check(
    (await index.locator("#game-refresh-protection").count()) === 0,
    "Games index has no refresh guard",
  );
  await index.close();
  check(errors.length === 0, `no game script errors: ${errors.join("; ")}`);
  console.log(JSON.stringify({ passed, failed: 0 }));
  await browser.close();
  server?.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
