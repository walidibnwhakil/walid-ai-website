// Real mobile input/compositing and slow-CPU regressions, separate from desktop viewport fitting.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  const out = process.env.SERPENT_EVIDENCE || "/workspace/work/evidence";
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({
    executablePath: process.env.CHROME || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const records = [];
  for (const [width, height] of [
    [320, 480],
    [360, 640],
    [390, 844],
    [844, 390],
  ]) {
    const p = await b.newPage({
      viewport: { width, height },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    const errors = [],
      requests = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("request", (r) => requests.push(r.url()));
    const cdp = await p.context().newCDPSession(p);
    await cdp.send("Performance.enable");
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await p.goto(
      process.env.SERPENT_URL ||
        "http://127.0.0.1:8765/games/snakes-and-ladders/?test",
      { waitUntil: "networkidle" },
    );
    await p.waitForFunction(
      () =>
        document.querySelector("#jungle-life").dataset.ready === "true" &&
        document.querySelector(".painted-title img").complete,
    );
    assert.equal(await p.locator("#jungle image").count(), 1);
    assert(
      (await p.locator("#jungle image").getAttribute("href")).includes(
        "small.webp",
      ),
    );
    assert(
      !requests.some((u) =>
        /\/(?:cavern(?:-mobile)?|natural-skin|joined-heads(?:-open)?|victory-emblem|defeat-title)\.webp/.test(
          u,
        ),
      ),
      "game/result assets must not compete with menu loading",
    );
    assert(!requests.some((u) => u.includes("walid-ai-approved-flower")));
    const menuBounds = await p.locator("#menu button").evaluateAll((es) =>
      es
        .filter((e) => e.getBoundingClientRect().width)
        .map((e) => {
          const r = e.getBoundingClientRect();
          return {
            x: r.x,
            y: r.y,
            right: r.right,
            bottom: r.bottom,
            h: r.height,
          };
        }),
    );
    for (const r of menuBounds)
      assert(
        r.x >= 0 &&
          r.y >= 0 &&
          r.right <= width + 0.5 &&
          r.bottom <= height + 0.5 &&
          r.h >= 43,
        JSON.stringify({ width, height, r }),
      );
    // Button bounds alone missed wrapped/overflowing labels on Android.
    const labels = await p.locator(".match-mode").evaluateAll((buttons) =>
      buttons.map((button) => {
        const label = button.querySelector(".mode-label"),
          range = document.createRange();
        range.selectNodeContents(label);
        const text = range.getBoundingClientRect(),
          box = button.getBoundingClientRect(),
          icon = button.querySelector(".menu-symbol").getBoundingClientRect();
        return {
          lines: range.getClientRects().length,
          text: {
            x: text.x,
            y: text.y,
            right: text.right,
            bottom: text.bottom,
          },
          box: { x: box.x, y: box.y, right: box.right, bottom: box.bottom },
          iconRight: icon.right,
          font: getComputedStyle(label).fontSize,
        };
      }),
    );
    assert.equal(labels[0].font, labels[1].font);
    for (const { lines, text, box, iconRight } of labels) {
      assert.equal(lines, 1);
      assert(
        text.x >= iconRight &&
          text.right <= box.right - 3 &&
          text.y >= box.y + 3 &&
          text.bottom <= box.bottom - 3,
        JSON.stringify({ width, height, text, box }),
      );
    }
    assert(
      await p.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
      ),
    );
    await p.screenshot({
      path: path.join(out, `mobile-light-menu-${width}.png`),
    });
    if (width === 390)
      await p.route("**/assets/joined-heads.webp", async (route) => {
        await new Promise((r) => setTimeout(r, 600));
        await route.continue();
      });
    await p.click("#start");
    if (width === 390) {
      assert.equal(await p.locator("#start").getAttribute("aria-busy"), "true");
      await p.locator("#start").dispatchEvent("click");
    }
    await p.waitForSelector("#intro:visible");
    if (width !== 390) await p.click("#skip");
    await p.waitForSelector("#play:visible");
    await p.waitForSelector("#intro", { state: "hidden" });
    await p.waitForFunction(
      () =>
        document.querySelector(".living-serpents")?.renderStats?.repainted <= 2,
    );
    assert.equal(await p.locator("#board foreignObject").count(), 0);
    assert.equal(await p.locator(".board-base").count(), 1);
    assert.equal(await p.locator(".square-number").count(), 99);
    const metrics = () =>
      cdp
        .send("Performance.getMetrics")
        .then((r) =>
          Object.fromEntries(r.metrics.map((e) => [e.name, e.value])),
        );
    const before = await metrics(),
      wall = Date.now();
    const frames = await p.evaluate(
      () =>
        new Promise((resolve) => {
          let count = 0,
            start = performance.now();
          const tick = (t) => {
            count++;
            if (t - start < 2000) requestAnimationFrame(tick);
            else resolve(count);
          };
          requestAnimationFrame(tick);
        }),
    );
    const after = await metrics(),
      ratio =
        ((after.TaskDuration - before.TaskDuration) * 1000) /
        (Date.now() - wall);
    assert(
      frames >= 20,
      `input/render heartbeat stalled: ${frames} frames in two seconds`,
    );
    assert(ratio < 0.8, `slow-CPU main thread overloaded: ${ratio}`);
    const raster = await p.locator(".living-serpents").evaluate((e) => ({
      w: e.width,
      h: e.height,
      stats: e.renderStats,
      tag: e.parentElement.tagName,
    }));
    assert(raster.w <= 600 && raster.h <= 600);
    assert(raster.stats.repainted <= 2);
    assert.equal(raster.tag, "DIV");
    // Three independent layers must have exactly the same board coordinate space.
    const boxes = await p
      .locator("#board,.board-base,.living-serpents")
      .evaluateAll((es) =>
        es.map((e) => {
          const r = e.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height };
        }),
      );
    for (const r of boxes)
      for (const k of ["x", "y", "w", "h"])
        assert(Math.abs(r[k] - boxes[0][k]) < 1, JSON.stringify(boxes));
    await p.screenshot({
      path: path.join(out, `mobile-light-board-${width}.png`),
    });
    await p.evaluate(() => {
      window.mobileDie = 1;
      crypto.getRandomValues = (a) => {
        a[0] = window.mobileDie - 1;
        return a;
      };
    });
    await p.click('[data-roll="0"]');
    await p.waitForFunction(
      () =>
        document.querySelector('[data-player="0"]').dataset.position === "1",
    );
    await p.waitForSelector(".player-die:enabled");
    // Stop all work while hidden and resume the same match, rather than a second loop.
    const paused = await p.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
      return document.querySelector('[data-snake="99"] path').getAttribute("d");
    });
    await p.waitForTimeout(350);
    assert.equal(
      await p.locator('[data-snake="99"] path').first().getAttribute("d"),
      paused,
    );
    assert.equal(
      await p.locator("#jungle-life").getAttribute("data-active"),
      "false",
    );
    await p.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => false,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await p.waitForFunction(
      (d) =>
        document.querySelector('[data-snake="99"] path').getAttribute("d") !==
        d,
      paused,
    );
    await p.click("#menu-button");
    await p.click("#skip");
    await p.waitForSelector("#intro", { state: "hidden" });
    assert(await p.locator("#start").isEnabled());
    assert.equal(await p.locator("#jungle image").count(), 1);
    assert.deepEqual(errors, []);
    records.push({ width, height, frames, cpuRatio: ratio, raster });
    console.log(
      "PASS mobile",
      width,
      height,
      "4x CPU, loading lock, view fit, aligned layers, fair input, hidden pause/resume, menu return",
    );
    await p.close();
  }
  fs.writeFileSync(
    path.join(out, "mobile-performance-results.json"),
    JSON.stringify(records, null, 2),
  );
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
