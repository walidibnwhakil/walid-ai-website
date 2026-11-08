const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const out = process.env.SERPENT_EVIDENCE || "/workspace/work/evidence";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROME || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const page = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base =
    process.env.SERPENT_URL ||
    "http://127.0.0.1:8765/games/snakes-and-ladders/";
  let checks = [];
  const check = (name, fn) => {
    checks.push(name);
    return fn();
  };
  const shot = (name) =>
    page.screenshot({ path: path.join(out, name + ".png"), fullPage: true });
  await page.goto(base + "?test");
  await page.waitForSelector(".snake-head");
  await check(
    "menu component animation changes rendered transforms",
    async () => {
      const a = await page
        .locator(".royal-neck")
        .evaluate((e) => getComputedStyle(e).transform);
      await page.waitForFunction(
        (a) =>
          getComputedStyle(document.querySelector(".royal-neck")).transform !==
          a,
        a,
      );
      const z = await page
        .locator(".royal-neck")
        .evaluate((e) => getComputedStyle(e).transform);
      assert.notEqual(a, z);
    },
  );
  for (const [sel, name] of [
    [".eye", "blink"],
    [".tongue", "tongue"],
    [".small-snake", "small-snake"],
    [".leaf", "leaf"],
    [".vine", "vine"],
  ]) {
    await check(name + " actual sampled animation frames", async () => {
      const samples = await page
        .locator(sel)
        .first()
        .evaluate((e, sel) => {
          const a = e.getAnimations()[0];
          const duration = a.effect.getTiming().duration;
          a.pause();
          const result = [];
          for (const f of [0, 0.45, 0.75, 0.8, 0.5]) {
            a.currentTime = duration * f;
            result.push(
              getComputedStyle(e).transform + " " + getComputedStyle(e).opacity,
            );
          }
          a.play();
          return result;
        }, sel);
      assert.ok(new Set(samples).size > 1, name);
    });
  }
  await shot("menu-desktop");
  await page.click("#start");
  await page.waitForTimeout(900);
  await shot("intro-focus");
  await page.waitForTimeout(1100);
  await shot("intro-open-jaw");
  await page.waitForTimeout(1000);
  await shot("intro-enter");
  await page.waitForTimeout(1500);
  await page.waitForSelector("#play:visible");
  await shot("board-desktop");
  assert.equal(await page.locator(".square-number").count(), 100);
  await check(
    "100 square centers and all rendered snake/ladder endpoints",
    async () => {
      const anchors = await page.evaluate(async () => {
        const { center, SNAKES, LADDERS } = await import("./engine.mjs");
        return Object.entries({ ...SNAKES, ...LADDERS }).map(([a, z]) => {
          const p = window.serpentTest.paths()[a];
          const start = p.path?.getPointAtLength(0),
            end = p.path?.getPointAtLength(p.path.getTotalLength());
          return {
            a,
            p: p.p,
            q: p.q,
            start: start ? { x: start.x, y: start.y } : p.p,
            end: end ? { x: end.x, y: end.y } : p.q,
            want: center(+a),
            dest: center(z),
          };
        });
      });
      for (const a of anchors) {
        assert.deepEqual(a.p, a.want);
        assert.deepEqual(a.q, a.dest);
        assert.ok(
          Math.hypot(a.start.x - a.want.x, a.start.y - a.want.y) < 0.01,
        );
        assert.ok(Math.hypot(a.end.x - a.dest.x, a.end.y - a.dest.y) < 0.01);
      }
    },
  );
  await check(
    "living path changes intermediate body but keeps anchors",
    async () => {
      const a = await page
        .locator('[data-snake="87"] path')
        .first()
        .getAttribute("d");
      await page.waitForTimeout(350);
      const z = await page
        .locator('[data-snake="87"] path')
        .first()
        .getAttribute("d");
      assert.notEqual(a, z);
    },
  );
  await check("living lava moves", async () => {
    const a = await page
      .locator(".embers")
      .evaluate((e) => getComputedStyle(e).transform);
    await page.waitForTimeout(250);
    assert.notEqual(
      a,
      await page
        .locator(".embers")
        .evaluate((e) => getComputedStyle(e).transform),
    );
  });
  const force = async ({
    count = 2,
    bot = false,
    current = 0,
    pos = 0,
    order = [],
    die = 1,
    motion = true,
  } = {}) =>
    page.evaluate(
      async (v) => {
        const { createGame } = await import("./engine.mjs");
        const s = createGame(v.count, v.bot);
        s.current = v.current;
        s.order = v.order;
        s.players[v.current].position = v.pos;
        window.serpentTest.settings.motion = v.motion;
        window.serpentTest.setState(s);
        crypto.getRandomValues = (a) => {
          a[0] = v.die - 1;
          return a;
        };
      },
      { count, bot, current, pos, order, die, motion },
    );
  await check(
    "snake swallow travels actual path, lock, exact destination",
    async () => {
      await force({ pos: 16 });
      await page.click("#roll");
      await page.waitForTimeout(1100);
      assert.equal(await page.locator("#roll").isDisabled(), true);
      await shot("snake-swallow");
      await page.waitForTimeout(450);
      await shot("snake-travel");
      await page.waitForFunction(
        () => window.serpentTest.state.phase === "ready",
      );
      assert.equal(
        await page.evaluate(() => window.serpentTest.state.players[0].position),
        7,
      );
      assert.equal(
        await page.locator('[data-player="0"]').getAttribute("data-position"),
        "7",
      );
      await shot("snake-tail-release");
    },
  );
  await check(
    "ladder climb follows geometry and reaches exact top",
    async () => {
      await force({ pos: 2 });
      await page.click("#roll");
      await page.waitForTimeout(1200);
      await shot("ladder-climbing");
      await page.waitForFunction(
        () => window.serpentTest.state.phase === "ready",
      );
      assert.equal(
        await page.evaluate(() => window.serpentTest.state.players[0].position),
        22,
      );
      assert.equal(
        await page.locator('[data-player="0"]').getAttribute("data-position"),
        "22",
      );
    },
  );
  await check(
    "no double roll and restart during movement safely cancels",
    async () => {
      await force();
      await page.click("#roll");
      await page.evaluate(() => window.serpentTest.turn());
      assert.equal(await page.locator("#roll").isDisabled(), true);
      await page.click("#restart");
      await page.waitForTimeout(700);
      assert.equal(
        await page.evaluate(() => window.serpentTest.state.rolls),
        0,
      );
      assert.equal(
        await page.evaluate(() => window.serpentTest.state.players[0].position),
        0,
      );
    },
  );
  await check(
    "four-player winner, runners-up, final standings and color fireworks",
    async () => {
      for (let i = 0; i < 3; i++) {
        await force({
          count: 4,
          current: i,
          pos: 98,
          order: Array.from({ length: i }, (_, k) => k),
          die: 2,
        });
        await page.click("#roll");
        await page.waitForSelector("#celebration:visible");
        const expected = ["WINNER", "1ST RUNNER-UP", "2ND RUNNER-UP"][i];
        assert.equal(
          await page.locator("#result-title").textContent(),
          expected,
        );
        const color = await page
          .locator(".spark")
          .first()
          .evaluate((e) => getComputedStyle(e).backgroundColor);
        assert.equal(
          color,
          ["rgb(241, 75, 88)", "rgb(67, 174, 255)", "rgb(255, 208, 75)"][i],
        );
        await shot("finish-" + (i + 1));
        if (i === 2) {
          assert.equal(await page.locator(".standing").count(), 4);
          assert.deepEqual(
            await page.evaluate(() => window.serpentTest.state.order),
            [0, 1, 2, 3],
          );
        } else await page.click("#continue");
      }
    },
  );
  await check("green celebration and 3-player results", async () => {
    await force({ count: 3, current: 0, pos: 98, die: 2 });
    await page.evaluate(() => {
      window.serpentTest.state.players[0].color = "Green";
    });
    await page.click("#roll");
    await page.waitForSelector("#celebration:visible");
    assert.equal(
      await page
        .locator(".spark")
        .first()
        .evaluate((e) => getComputedStyle(e).backgroundColor),
      "rgb(79, 218, 145)",
    );
    await shot("finish-green");
  });
  await check(
    "bot defeat swallowed and revealed with no fireworks",
    async () => {
      await force({ bot: true, current: 1, pos: 98, die: 2 });
      await page.evaluate(() => window.serpentTest.turn());
      await page.waitForSelector("#celebration:visible");
      assert.equal(
        await page.locator("#result-title").textContent(),
        "YOU LOSE",
      );
      await page.waitForTimeout(600);
      await shot("defeat-approach");
      await page.waitForTimeout(2300);
      assert.ok(
        +(await page
          .locator("#result-title")
          .evaluate((e) => getComputedStyle(e).opacity)) < 0.1,
      );
      await shot("defeat-swallowed");
      await page.waitForTimeout(3300);
      assert.equal(
        await page
          .locator("#result-title")
          .evaluate((e) => getComputedStyle(e).opacity),
        "1",
      );
      await shot("defeat-revealed");
      assert.equal(await page.locator(".spark").count(), 0);
    },
  );
  await check(
    "automatic bot turn uses same dice and returns control",
    async () => {
      await force({ bot: true, die: 2, motion: false });
      await page.click("#roll");
      await page.waitForFunction(
        () =>
          window.serpentTest.state.rolls === 2 &&
          window.serpentTest.state.phase === "ready",
      );
      assert.equal(
        await page.evaluate(() => window.serpentTest.state.current),
        0,
      );
      assert.equal(
        await page.evaluate(() => window.serpentTest.state.players[1].position),
        2,
      );
    },
  );
  await check("blocked localStorage remains playable", async () => {
    const isolated = await b.newContext();
    const p = await isolated.newPage();
    await p.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new Error("Storage unavailable");
        },
      });
    });
    await p.goto(base);
    await p.emulateMedia({ reducedMotion: "reduce" });
    await p.click("#start");
    await p.waitForSelector("#play:visible");
    await p.click("#roll");
    await p.waitForFunction(
      () =>
        document.querySelector("#dice").classList.contains("rolling") ||
        document.querySelector("#dice").textContent !== "⚄",
    );
    await isolated.close();
  });
  await check(
    "reduced motion keeps snake destination, intro skip and final result",
    async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await force({ pos: 16, motion: false });
      await page.click("#roll");
      await page.waitForFunction(
        () =>
          window.serpentTest.state.rolls === 1 &&
          window.serpentTest.state.phase === "ready",
      );
      assert.equal(
        await page.evaluate(() => window.serpentTest.state.players[0].position),
        7,
      );
      await page.click("#menu-button");
      await page.click("#start");
      await page.waitForSelector("#play:visible");
      assert.equal(await page.locator("#intro").isVisible(), false);
    },
  );
  await check(
    "mobile and desktop square board, touch targets and no horizontal overflow",
    async () => {
      for (const width of [320, 360, 390, 412, 430, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: width < 768 ? 900 : 1100 });
        const box = await page.locator("#board").boundingBox();
        assert.ok(Math.abs(box.width - box.height) < 1);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        assert.ok((await page.locator("#roll").boundingBox()).height >= 44);
        await shot("board-" + width);
        await page.click("#menu-button");
        await shot("menu-" + width);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        await page.click("#start");
      }
    },
  );
  await check(
    "old URL redirects and exactly one new Games index card",
    async () => {
      await page.goto("http://127.0.0.1:8765/games/snake/");
      await page.waitForURL("**/games/snakes-and-ladders/");
      await page.goto("http://127.0.0.1:8765/games/");
      assert.equal(
        await page.locator('a.tile[href="/games/snakes-and-ladders/"]').count(),
        1,
      );
      assert.equal(
        await page.locator('a.tile[href="/games/snake/"]').count(),
        0,
      );
    },
  );
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    path.join(out, "browser-results.json"),
    JSON.stringify({ checks, errors, passed: checks.length }, null, 2),
  );
  console.log(
    `PASS ${checks.length} browser groups; no page errors; evidence ${out}`,
  );
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
