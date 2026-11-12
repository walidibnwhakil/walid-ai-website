const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const out =
  process.env.TTT_EVIDENCE ||
  path.join(require("node:os").tmpdir(), "ttt-evidence");
fs.mkdirSync(out, { recursive: true });
const base = process.env.TTT_URL || "http://localhost:8000";
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROME || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await b.newContext({
    viewport: { width: 1440, height: 1100 },
    recordVideo: {
      dir: path.join(out, "video"),
      size: { width: 1000, height: 900 },
    },
  });
  const p = await context.newPage();
  let checks = 0;
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const check = (ok, msg) => {
    assert(ok, msg);
    checks++;
  };
  async function menu() {
    await p.goto(base + "/games/tic-tac-toe/");
    await p.locator("#menu").waitFor();
  }
  async function start(level = "easy", mode = "friend", symbol = "X") {
    await menu();
    await p.locator(`[data-mode="${mode}"]`).click();
    await p.locator(`[data-level="${level}"]`).click();
    await p.locator(`[data-symbol="${symbol}"]`).click();
    await p.locator("#start").click();
    check(
      await p.locator(".game-tools").isHidden(),
      "Auxiliary controls are menu-only",
    );
  }
  async function snap(name) {
    await p.screenshot({ path: path.join(out, name + ".png"), fullPage: true });
  }
  async function click(i) {
    await p.locator(".cell").nth(i).click();
  }
  async function viewportFits(label) {
    const result = await p.evaluate(() => {
      const root = document.documentElement;
      const targets = [
        document.querySelector(".topbar"),
        document.querySelector(".title"),
        document.querySelector(".game-tools"),
      ];
      if (!document.querySelector("#play").hidden)
        targets.push(
          document.querySelector("#arena"),
          document.querySelector(".play-controls"),
        );
      else
        targets.push(
          document.querySelector("#menu"),
          document.querySelector("#start"),
        );
      return {
        scroll:
          root.scrollHeight <= innerHeight + 1 &&
          root.scrollWidth <= innerWidth + 1,
        visible: targets
          .filter((e) => !e.hidden)
          .every((e) => {
            const r = e.getBoundingClientRect();
            return (
              r.top >= -1 &&
              r.left >= -1 &&
              r.bottom <= innerHeight + 1 &&
              r.right <= innerWidth + 1
            );
          }),
      };
    });
    check(
      result.scroll && result.visible,
      "Entire screen fits without scroll: " + label,
    );
  }
  async function outcome(expected) {
    await p.locator("#result:not([hidden])").waitFor();
    check(
      (await p.locator("#result-title").textContent()) === expected,
      expected,
    );
    check((await p.locator("#result").count()) === 1, "Single result");
    check(
      await p.evaluate(() => {
        const a = document.querySelector("#arena").getBoundingClientRect(),
          r = document.querySelector("#result").getBoundingClientRect(),
          t = document.querySelector("#result-title").getBoundingClientRect();
        return (
          r.top >= a.top &&
          r.bottom <= a.bottom &&
          t.left >= a.left &&
          t.right <= a.right &&
          t.top >= a.top &&
          t.bottom <= a.bottom
        );
      }),
      "Result title is on the board",
    );
    await viewportFits("result " + expected);
    check((await p.locator(".cell:enabled").count()) === 0, "Game ended lock");
  }
  await menu();
  await snap("menu-desktop");
  check(
    await p
      .locator("legend")
      .allTextContents()
      .then(
        (x) => x.includes("Challenge Level") && !x.includes("Bot Difficulty"),
      ),
    "Challenge selector",
  );
  check(
    (await p.locator("button:disabled").count()) === 2,
    "Coming soon disabled",
  );
  for (const width of [320, 360, 390, 412, 430, 768, 1024, 1440]) {
    await p.setViewportSize({ width, height: 1000 });
    await menu();
    check(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Menu no overflow " + width,
    );
    await snap("menu-" + width);
    for (const [level, n] of [
      ["easy", 3],
      ["medium", 5],
      ["hard", 7],
    ]) {
      await start(level);
      const sizes = await p.locator(".cell").evaluateAll((es) =>
        es.map((e) => {
          const r = e.getBoundingClientRect();
          return [r.width, r.height];
        }),
      );
      check(sizes.length === n * n, "Count " + level + width);
      check(
        sizes.every(([w, h]) => Math.abs(w - h) < 1),
        "Square cells " + level + width,
      );
      check(
        (await p.locator(".cell .mark").count()) === 0,
        "Empty initial board",
      );
      check(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "Board no overflow " + level + width,
      );
      if ([320, 390, 768, 1440].includes(width))
        await snap(level + "-" + width);
    }
  }
  for (const [width, height] of [
    [320, 568],
    [360, 640],
    [390, 700],
    [412, 740],
    [430, 800],
    [768, 1024],
    [1024, 600],
    [1440, 900],
    [1920, 953],
    [844, 390],
    [667, 375],
  ]) {
    await p.setViewportSize({ width, height });
    await menu();
    await viewportFits("menu " + width + "x" + height);
    await snap("fitted-menu-" + width + "x" + height);
    for (const level of ["easy", "medium", "hard"]) {
      await start(level);
      await p.waitForTimeout(80);
      await viewportFits(level + " " + width + "x" + height);
      check(
        await p.locator(".cell").evaluateAll((es) =>
          es.every((e) => {
            const r = e.getBoundingClientRect();
            return Math.abs(r.width - r.height) < 1;
          }),
        ),
        "Fitted square cells " + level + width,
      );
      await snap("fitted-" + level + "-" + width + "x" + height);
    }
  }
  await p.setViewportSize({ width: 1024, height: 1100 });
  // Exercise each line orientation on each board through real same-device turns.
  const levels = [
    ["easy", 3, 3],
    ["medium", 5, 4],
    ["hard", 7, 5],
  ];
  for (const [level, n, k] of levels)
    for (const [orientation, dr, dc, r, c] of [
      ["horizontal", 0, 1, 0, 0],
      ["vertical", 1, 0, 0, 0],
      ["diagonal-down", 1, 1, 0, 0],
      ["diagonal-up", 1, -1, 0, n - 1],
    ]) {
      await start(level);
      const xs = Array.from(
        { length: k },
        (_, i) => (r + dr * i) * n + c + dc * i,
      );
      const all = Array.from({ length: n * n }, (_, i) => i).filter(
        (i) => !xs.includes(i),
      );
      let fillers = [];
      // Choose non-winning opponent cells by evaluating the same generic sequence rule.
      const { winningLines } = await import("./engine.mjs");
      for (const i of all) {
        const cells = Array(n * n).fill("");
        [...fillers, i].forEach((j) => (cells[j] = "O"));
        if (!winningLines(cells, n, k).length) fillers.push(i);
        if (fillers.length === k - 1) break;
      }
      for (let j = 0; j < k; j++) {
        await click(xs[j]);
        if (j < k - 1) await click(fillers[j]);
      }
      await p.waitForTimeout(380);
      await snap(`${level}-${orientation}-ignition`);
      const geometry = await p.evaluate(() => {
        const l = document.querySelector("#fire line"),
          origin = document
            .querySelector("#board-wrap")
            .getBoundingClientRect(),
          border = parseFloat(
            getComputedStyle(document.querySelector("#board-wrap"))
              .borderLeftWidth,
          );
        const cells = [...document.querySelectorAll(".cell")];
        return {
          line: ["x1", "y1", "x2", "y2"].map((a) => Number(l.getAttribute(a))),
          centers: cells.map((c) => {
            const r = c.getBoundingClientRect();
            return [
              r.x + r.width / 2 - origin.x - border,
              r.y + r.height / 2 - origin.y - border,
            ];
          }),
          dash: parseFloat(getComputedStyle(l).strokeDashoffset),
        };
      });
      const a = geometry.centers[xs[0]],
        z = geometry.centers[xs.at(-1)];
      check(
        geometry.line.every((v, i) => Math.abs(v - [...a, ...z][i]) < 1),
        "Exact responsive endpoints " + level + orientation,
      );
      check(geometry.dash > 0 && geometry.dash < 1, "Runtime drawing frame");
      await p.waitForTimeout(750);
      await snap(`${level}-${orientation}-burst`);
      await outcome("X Wins");
      await snap(`${level}-${orientation}-result`);
      if (level === "hard" && orientation === "diagonal-up") {
        await p.setViewportSize({ width: 390, height: 1000 });
        await p.waitForTimeout(100);
        await snap("hard-win-mobile-resized");
        check(
          (await p.locator("#fire line").count()) === 3,
          "Resize preserves line",
        );
        await p.setViewportSize({ width: 1024, height: 1100 });
      }
    }
  await start();
  for (const i of [0, 3, 1, 4, 8, 5]) await click(i);
  await outcome("O Wins");
  await snap("o-wins");
  await start();
  for (const i of [0, 1, 2, 4, 3, 5, 7, 6, 8]) await click(i);
  await outcome("Draw");
  check(
    (await p.locator("#fire line").count()) === 0,
    "Draw has no winning fire",
  );
  await snap("draw");
  // Restart during ignition; cancel overlay, statistics duplication, and effects.
  await start();
  for (const i of [0, 3, 1, 4, 2]) await click(i);
  await p.locator("#restart").click();
  await p.waitForTimeout(2000);
  check(await p.locator("#result").isHidden(), "Restart cancels result timer");
  check(
    (await p.locator("#fire line").count()) === 0,
    "Restart clears animation",
  );
  check((await p.locator(".cell .mark").count()) === 0, "Restart clears marks");
  // Real worker opening, single bot reply, cancellation and selected O.
  await start("easy", "bot", "O");
  await p.waitForTimeout(500);
  check((await p.locator(".cell .mark.x").count()) === 1, "Bot X starts once");
  check(
    (await p.locator(".cell .mark.o").count()) === 0,
    "Human O waits for turn",
  );
  await snap("human-o");
  await p.locator("#restart").click();
  await p.locator("#restart").click();
  await p.waitForTimeout(600);
  check(
    (await p.locator(".cell .mark.x").count()) === 1,
    "Rapid restart no duplicate bot turns",
  );
  await p.locator('[data-action="menu"]:visible').first().click();
  await p.waitForTimeout(700);
  check(await p.locator("#menu").isVisible(), "Back to menu cancels worker");
  await start("easy", "bot", "X");
  check((await p.locator(".cell .mark").count()) === 0, "Human X starts");
  await click(0);
  await p.waitForTimeout(500);
  check(
    (await p.locator(".cell .mark").count()) === 2,
    "Exactly one worker response",
  );
  await snap("human-x");

  for (const level of ["medium", "hard"]) {
    await start(level, "bot", "X");
    await p.evaluate(() => {
      window.beats = 0;
      window.beatTimer = setInterval(() => window.beats++, 16);
    });
    await click(0);
    await p.waitForFunction(
      () => document.querySelectorAll(".cell .mark").length === 2,
    );
    const beats = await p.evaluate(() => {
      clearInterval(window.beatTimer);
      return window.beats;
    });
    check(beats > 10, level + " worker leaves UI responsive");
    check(
      (await p.locator(".cell .mark.o").count()) === 1,
      level + " single legal bot response",
    );
  }

  await start("easy", "bot", "X");
  await click(0);
  await p.waitForTimeout(500);
  // A deliberately poor human strategy exercises an actual competitive-bot defeat.
  for (let j = 0; j < 5; j++) {
    if ((await p.locator("#result-title").textContent()) === "You Lose") break;
    const free = p.locator(".cell:enabled");
    if (await free.count()) await free.first().click();
    await p.waitForTimeout(550);
  }
  await outcome("You Lose");
  await snap("you-lose");
  const flame1 = await p.locator("#sparks").evaluate((c) => c.toDataURL());
  await p.waitForTimeout(350);
  const flame2 = await p.locator("#sparks").evaluate((c) => c.toDataURL());
  check(flame1 !== flame2, "Result has living flames, not a static image");
  // Deterministic worker fixture verifies human-win presentation without weakening production AI.
  await p.route("**/bot-worker.mjs", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `self.onmessage=({data})=>{const g=data.game;const i=[3,4,8,7,6,5,2,1,0].find(i=>!g.cells[i]);self.postMessage({id:data.id,index:i});}`,
    }),
  );
  await start("easy", "bot", "X");
  for (const i of [0, 1, 2]) {
    await click(i);
    await p.waitForTimeout(400);
  }
  await outcome("You Win");
  await snap("you-win-fixture");
  const beforeOverlay = await p.locator("#arena").boundingBox();
  await p.waitForTimeout(500);
  const afterOverlay = await p.locator("#arena").boundingBox();
  check(
    JSON.stringify(beforeOverlay) === JSON.stringify(afterOverlay),
    "Result causes no board layout shift",
  );
  await p.unroute("**/bot-worker.mjs");
  await p.emulateMedia({ reducedMotion: "reduce" });
  await start();
  for (const i of [0, 3, 1, 4, 2]) await click(i);
  await outcome("X Wins");
  check(
    await p.locator("#fire").evaluate((e) => !e.classList.contains("ignite")),
    "Reduced motion static line",
  );
  await snap("reduced-motion");
  await p.emulateMedia({ reducedMotion: "no-preference" });
  await menu();
  for (const action of ["rules", "stats", "settings"]) {
    await p.locator(`.game-tools [data-action="${action}"]`).click();
    check(await p.locator("#dialog").isVisible(), action + " dialog");
    if (action === "settings") {
      await p.locator("#effects-setting").uncheck();
      check(
        await p
          .locator("body")
          .evaluate((e) => e.classList.contains("low-effects")),
        "Effects off",
      );
      await p.locator("#effects-setting").check();
      await p.locator("#sound-setting").check();
    }
    await p.locator("#close-dialog").click();
  }
  check(
    (await p.locator('[data-action="sound"]').first().textContent()) ===
      "Sound On",
    "Sound setting toggle",
  );
  await p.reload();
  check(
    (await p.locator('[data-action="sound"]').first().textContent()) ===
      "Sound On",
    "Setting persistence",
  );
  check(
    await p.evaluate(
      () =>
        JSON.parse(localStorage.getItem("royal-ttt-stats"))["easy/friend"]
          .played > 0,
    ),
    "Stats persistence",
  );
  check(errors.length === 0, "No browser exceptions: " + errors.join(","));
  fs.writeFileSync(
    path.join(out, "results.json"),
    JSON.stringify(
      {
        checks,
        errors,
        widths: [320, 360, 390, 412, 430, 768, 1024, 1440],
        levels,
        fixture:
          "You Win uses a deterministic worker fixture; You Lose uses real competitive worker.",
      },
      null,
      2,
    ),
  );
  await context.close();
  await b.close();
  console.log("PASS " + checks + " browser assertions; evidence " + out);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
