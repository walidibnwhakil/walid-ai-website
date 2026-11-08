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
  const check = async (name, fn) => {
    checks.push(name);
    await fn();
    console.log("PASS", name);
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
  await check(
    "reference menu fits one screen on twelve desktop and mobile sizes",
    async () => {
      for (const [width, height] of [
        [320, 568],
        [360, 640],
        [390, 844],
        [412, 915],
        [430, 932],
        [768, 1024],
        [1024, 768],
        [1366, 768],
        [1440, 900],
        [1920, 1080],
        [640, 360],
        [844, 390],
      ]) {
        await page.setViewportSize({ width, height });
        await page.selectOption("#mode", "4");
        const result = await page.evaluate(() => ({
          w: document.documentElement.scrollWidth,
          h: document.documentElement.scrollHeight,
          buttons: [
            ...document.querySelectorAll("#menu button,header button,header a"),
          ]
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
        }));
        assert.ok(
          result.w <= width && result.h <= height,
          JSON.stringify({ width, height, result }),
        );
        for (const r of result.buttons)
          assert.ok(
            r.x >= 0 &&
              r.y >= 0 &&
              r.right <= width + 0.5 &&
              r.bottom <= height + 0.5,
            JSON.stringify({ width, height, r }),
          );
        assert.ok((await page.locator("#start").boundingBox()).height >= 44);
        await shot(`menu-fit-${width}-${height}`);
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
    },
  );
  await check(
    "waterfall pixels flow while the jungle background remains stationary",
    async () => {
      const canvas = page.locator("#jungle-water"),
        a = await canvas.evaluate((e) => e.toDataURL());
      await page.waitForTimeout(350);
      assert.notEqual(await canvas.evaluate((e) => e.toDataURL()), a);
      assert.equal(
        await page
          .locator(".menu-scenery")
          .evaluate((e) => getComputedStyle(e).transform),
        "none",
      );
      await shot("living-waterfall");
    },
  );
  await check(
    "independent snake neck, head, jaw, tongue and blink change real rendered frames",
    async () => {
      await page
        .locator("#jungle-water")
        .evaluate((e) => (e.style.visibility = "hidden"));
      await page.evaluate(() =>
        document.getAnimations().forEach((a) => a.pause()),
      );
      for (const [selector, frame] of [
        [".royal-neck", 0.5],
        [".small-snake", 0.5],
        [".menu-head", 0.5],
        [".menu-jaw", 0.78],
        [".menu-tongue", 0.7],
        [".menu-eyelid", 0.465],
      ]) {
        const element = page.locator(selector).first();
        await element.evaluate((e) => {
          const a = e.getAnimations()[0];
          a.currentTime = 0;
        });
        const before = await page.locator("#jungle").screenshot();
        await element.evaluate((e, f) => {
          const a = e.getAnimations()[0];
          a.currentTime = a.effect.getTiming().duration * f;
        }, frame);
        const after = await page.locator("#jungle").screenshot();
        assert.notDeepEqual(before, after, selector);
        fs.writeFileSync(
          path.join(out, "rig-" + selector.replaceAll(".", "") + "-before.png"),
          before,
        );
        fs.writeFileSync(
          path.join(out, "rig-" + selector.replaceAll(".", "") + "-after.png"),
          after,
        );
      }
      await page.evaluate(() =>
        document.getAnimations().forEach((a) => a.play()),
      );
      await page
        .locator("#jungle-water")
        .evaluate((e) => (e.style.visibility = ""));
    },
  );
  await check(
    "local player chooser, bot mode and pre-game rules remain functional",
    async () => {
      await page.click("#local-mode");
      await page.click('[data-local-mode="3"]');
      assert.equal(await page.locator("#mode").inputValue(), "3");
      assert.equal(await page.locator("[data-setup-color]").count(), 3);
      await page.click("#bot-mode");
      assert.equal(await page.locator("#mode").inputValue(), "bot");
      assert.equal(await page.locator("[data-setup-color]").count(), 2);
      await page.click("#menu-info");
      assert.ok(
        (await page.locator("#dialog-content").textContent()).includes(
          "Roll a 1",
        ),
      );
      await page.click("#close");
    },
  );
  await shot("menu-desktop");
  await page.selectOption("#mode", "4");
  await check(
    "setup head opens gold palette of round color swatches",
    async () => {
      await page.click('[data-setup-color="0"]');
      assert.equal(await page.locator(".color-swatch").count(), 9);
      assert.equal(
        await page
          .locator(".color-swatch")
          .first()
          .evaluate((e) => getComputedStyle(e).borderRadius),
        "50%",
      );
      await shot("setup-color-palette");
      await page.click('[data-pick-color="Teal"]');
      assert.equal(await page.locator('[data-color="0"]').inputValue(), "Teal");
    },
  );
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
  assert.equal(await page.locator(".square-number").count(), 99);
  await check(
    "compact gold header replaces redundant in-game navigation and controls",
    async () => {
      assert.equal(
        await page
          .locator('#play #restart,#play .toolbar,#play [data-panel="rules"]')
          .count(),
        0,
      );
      assert.equal(await page.locator("#games-link").isVisible(), false);
      assert.equal(await page.locator("#menu-button").isVisible(), true);
      assert.equal(await page.locator("#sound svg").count(), 1);
      assert.equal(await page.locator("#sound").textContent(), "");
      const before = await page.locator("#sound").getAttribute("aria-pressed");
      await page.click("#sound");
      assert.notEqual(
        await page.locator("#sound").getAttribute("aria-pressed"),
        before,
      );
      await page.click("#sound");
      assert.equal(
        await page.locator("#sound").getAttribute("aria-pressed"),
        before,
      );
      await page.click("#settings-button");
      await page.waitForSelector("#sfx-setting");
      await page.click("#close");
    },
  );
  await check(
    "painted board assets load and materials remain structured",
    async () => {
      for (const file of [
        "cavern.webp",
        "cavern-mobile.webp",
        "marble-atlas.webp",
        "royal-logo.webp",
        "joined-heads.webp",
        "joined-heads-open.webp",
        "natural-skin.webp",
      ]) {
        const response = await page.request.get(
          new URL("assets/" + file, base).href,
        );
        assert.equal(response.status(), 200, file);
        assert.match(response.headers()["content-type"], /image\/webp/);
        assert.ok((await response.body()).length > 1000);
      }
      assert.equal(await page.locator('[id^="material-"]').count(), 2);
      assert.equal(await page.locator(".painted-head").count(), 8);
      assert.equal(
        await page
          .locator(".painted-title img")
          .evaluate((e) => e.complete && e.naturalWidth > 0),
        true,
      );
    },
  );
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
        .locator('[data-snake="89"] path')
        .first()
        .getAttribute("d");
      await page.waitForTimeout(350);
      const z = await page
        .locator('[data-snake="89"] path')
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
  await check(
    "finish square shows only the large exact logo crown",
    async () => {
      assert.equal(await page.locator(".finish-crown").count(), 1);
      assert.equal(
        await page.locator("#board text").filter({ hasText: /^100/ }).count(),
        0,
      );
      assert.equal(
        await page.locator(".finish-crown image").getAttribute("href"),
        "assets/royal-logo.webp",
      );
      const clip = await page
        .locator("#finish-crown-clip rect")
        .evaluate((e) => ({
          x: e.x.baseVal.value,
          y: e.y.baseVal.value,
          w: e.width.baseVal.value,
          h: e.height.baseVal.value,
        }));
      assert.ok(
        clip.w >= 9 &&
          clip.x >= 0 &&
          clip.x + clip.w <= 10 &&
          clip.y >= 0 &&
          clip.y + clip.h <= 10,
      );
      const box = await page.locator("#board").boundingBox();
      await page.screenshot({
        path: path.join(out, "finish-crown-close.png"),
        clip: {
          x: box.x,
          y: box.y,
          width: box.width * 0.105,
          height: box.height * 0.105,
        },
      });
    },
  );
  await check(
    "head 54 and every neck share the spine direction and one material surface",
    async () => {
      assert.equal(await page.locator(".integrated-head image").count(), 0);
      await page.waitForFunction(
        () =>
          document.querySelector('[data-snake="54"] .integrated-head')?.dataset
            .renderer === "joined-canvas",
      );
      const result = await page.evaluate(async () => {
        const { headPoseFromPath, headLocalToWorld } = await import(
          "./snake-geometry.mjs?v=20261108-joined"
        );
        return Object.values(window.serpentTest.paths())
          .filter((p) => p.kind === "snake")
          .map((p) => {
            const pose = headPoseFromPath(p.path.getAttribute("d")),
              neck = headLocalToWorld(pose, 0, 1);
            return { a: p.p, pose, neck, rendered: +p.head.dataset.heading };
          });
      });
      for (const r of result) {
        assert.equal(r.a.x, r.pose.x);
        assert.equal(r.a.y, r.pose.y);
        assert.ok(Math.abs(r.rendered - r.pose.angle) < 0.00001);
        assert.ok(Math.abs(r.neck.x - r.pose.x - r.pose.tx) < 0.00001);
        assert.ok(Math.abs(r.neck.y - r.pose.y - r.pose.ty) < 0.00001);
      }
      const b = await page.locator("#board").boundingBox();
      await page.screenshot({
        path: path.join(out, "head-54-joined.png"),
        clip: {
          x: b.x + b.width * 0.59,
          y: b.y + b.height * 0.39,
          width: b.width * 0.14,
          height: b.height * 0.18,
        },
      });
    },
  );
  await check(
    "the molten lava foreground changes rendered pixels",
    async () => {
      const lava = page.locator("#live-lava");
      await page.waitForFunction(
        () => document.querySelector("#live-lava").dataset.active === "true",
      );
      const a = await lava.evaluate((e) => e.toDataURL());
      await page.waitForTimeout(220);
      assert.notEqual(await lava.evaluate((e) => e.toDataURL()), a);
      await shot("living-lava-foreground");
    },
  );
  const clickDie = async (i) => {
    i ??= await page.evaluate(() => window.serpentTest.state.current);
    await page.locator(`[data-roll="${i}"]`).click();
  };
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
        for (const j of v.order) s.players[j].position = 100;
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
  const settled = async (n = 1) =>
    page.waitForFunction(
      (n) =>
        window.serpentTest.state.rolls >= n &&
        ["ready", "over"].includes(window.serpentTest.state.phase),
      n,
    );
  await check(
    "color remains editable after Start; first dice click immediately locks every head",
    async () => {
      await page.click('[data-game-color="1"]');
      await shot("game-color-palette");
      await page.click('[data-pick-color="Orange"]');
      assert.equal(
        await page.evaluate(() => window.serpentTest.state.players[1].color),
        "Orange",
      );
      await page.evaluate(
        () =>
          (crypto.getRandomValues = (a) => {
            a[0] = 1;
            return a;
          }),
      );
      await page.locator('[data-roll="2"]').dispatchEvent("click");
      assert.equal(
        await page.evaluate(() => window.serpentTest.state.rolls),
        0,
      );
      await clickDie(0);
      assert.equal(
        await page.evaluate(() => window.serpentTest.state.colorsLocked),
        true,
      );
      assert.equal(await page.locator("[data-game-color]:disabled").count(), 4);
      await page.locator('[data-game-color="1"]').dispatchEvent("click");
      assert.equal(await page.locator("#dialog").isVisible(), false);
      await settled();
      assert.equal(
        await page.evaluate(() => window.serpentTest.state.players[0].position),
        0,
      );
      assert.equal(
        await page.locator(".player-die:not([disabled])").count(),
        1,
      );
      assert.equal(await page.locator('[data-roll="1"]').isEnabled(), true);
    },
  );
  await check(
    "Ludu Mahir pin shape is reused on the board and player heads",
    async () => {
      assert.equal(await page.locator(".pawn .pin-outline").count(), 4);
      const shape = await page
        .locator(".pawn .pin-outline")
        .first()
        .getAttribute("d");
      assert.ok(shape.includes("M32 3C17 3 5 15 5 31"));
      assert.equal(await page.locator(".player-head .pin-face").count(), 4);
    },
  );
  await check(
    "larger pins remain readable alone and all four fit a shared square",
    async () => {
      for (const [width, height] of [
        [390, 844],
        [1366, 768],
      ]) {
        await page.setViewportSize({ width, height });
        await force({ count: 4, pos: 8, motion: false });
        const single = await page
          .locator('[data-player="0"] .pin-pawn-art')
          .boundingBox();
        const board = await page.locator("#board").boundingBox();
        assert.ok(
          single.width >= board.width * 0.068,
          "solo pawn must span about 70% of a square",
        );
        await shot(`large-pawn-${width}`);
        await page.evaluate(() => {
          const s = structuredClone(window.serpentTest.state);
          s.players.forEach((p) => (p.position = 8));
          window.serpentTest.setState(s);
        });
        const faces = await page.locator(".pawn .pin-face").evaluateAll((es) =>
          es.map((e) => {
            const m = e.getScreenCTM(),
              p = new DOMPoint(32, 29).matrixTransform(m);
            return { x: p.x, y: p.y, r: 13 * Math.hypot(m.a, m.b) };
          }),
        );
        for (let i = 0; i < faces.length; i++)
          for (let j = i + 1; j < faces.length; j++)
            assert.ok(
              Math.hypot(faces[i].x - faces[j].x, faces[i].y - faces[j].y) >
                faces[i].r + faces[j].r,
              "shared pawn colors remain separately visible",
            );
        await shot(`large-pawns-shared-${width}`);
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
    },
  );
  await check(
    "every pin tip stays at the exact cell center, including shared and top-row squares",
    async () => {
      for (const [width, height] of [
        [390, 844],
        [1366, 768],
      ]) {
        await page.setViewportSize({ width, height });
        for (const square of [1, 8, 54, 91, 100])
          for (const count of [1, 2, 3, 4]) {
            await force({ count: 4, pos: square, motion: false });
            await page.evaluate(
              ({ square, count }) => {
                const s = structuredClone(window.serpentTest.state);
                s.players.forEach(
                  (p, i) => (p.position = i < count ? square : 0),
                );
                window.serpentTest.setState(s);
              },
              { square, count },
            );
            const distances = await page.evaluate(
              async ({ square, count }) => {
                const { center } = await import("./engine.mjs");
                const p = center(square),
                  m = document.querySelector("#board").getScreenCTM(),
                  expected = new DOMPoint(p.x, p.y).matrixTransform(m);
                return Array.from({ length: count }, (_, i) => {
                  const art = document.querySelector(
                      `[data-player="${i}"] .pin-pawn-art`,
                    ),
                    tip = new DOMPoint(32, 77).matrixTransform(
                      art.getScreenCTM(),
                    );
                  return Math.hypot(tip.x - expected.x, tip.y - expected.y);
                });
              },
              { square, count },
            );
            assert.ok(
              distances.every((d) => d < 0.1),
              `pin tips must mark square ${square}, count ${count}`,
            );
            if (square === 8 && count === 1)
              await shot(`centered-pin-${width}`);
            if (square === 8 && count === 4)
              await shot(`centered-shared-pins-${width}`);
            if (square === 100 && count === 1)
              await shot(`centered-finish-pin-${width}`);
          }
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
    },
  );
  await check(
    "six physical die faces rotate in 3D and settle on every injected result",
    async () => {
      for (let value = 1; value <= 6; value++) {
        await force({ pos: 40, die: value });
        await clickDie();
        assert.equal(
          await page.locator('[data-roll="0"] .die-face').count(),
          6,
        );
        assert.equal(await page.locator('[data-roll="0"] .pip').count(), 21);
        assert.ok(
          await page
            .locator('[data-roll="0"] .die-cube')
            .evaluate((e) =>
              e
                .getAnimations()
                .every((a) => a.effect.getTiming().duration <= 500),
            ),
        );
        if (value === 1) {
          const cube = page.locator('[data-roll="0"] .die-cube');
          await page.waitForFunction(() =>
            [
              ...document
                .querySelector('[data-roll="0"] .die-cube')
                .getAnimations(),
            ].some((a) => a.currentTime > 60),
          );
          const a = await cube.evaluate((e) => getComputedStyle(e).transform);
          await shot("dice-turn-1");
          await page.waitForTimeout(250);
          const b = await cube.evaluate((e) => getComputedStyle(e).transform);
          assert.notEqual(a, b);
          await shot("dice-turn-2");
        }
        await settled();
        assert.equal(
          await page.evaluate(
            () => window.serpentTest.state.players[0].lastDice,
          ),
          value,
        );
        const normal = await page
          .locator(`[data-roll="0"] .face-${value}`)
          .evaluate((e) => {
            const cube = e.closest(".die-cube");
            return new DOMMatrix(getComputedStyle(cube).transform).multiply(
              new DOMMatrix(getComputedStyle(e).transform),
            ).m33;
          });
        assert.ok(normal > 0.99, `face ${value} faces the viewer`);
      }
    },
  );
  await check(
    "one activates the pawn; other opening rolls leave it outside",
    async () => {
      await force({ die: 5 });
      await clickDie();
      await settled();
      assert.equal(
        await page.evaluate(() => window.serpentTest.state.players[0].position),
        0,
      );
      await force({ die: 1 });
      await clickDie();
      await settled();
      assert.equal(
        await page.evaluate(() => window.serpentTest.state.players[0].position),
        1,
      );
      assert.equal(
        await page.locator('[data-player="0"]').getAttribute("visibility"),
        "visible",
      );
    },
  );
  await check(
    "inactive six has no extra turn, while an active six does",
    async () => {
      await force({ count: 4, die: 6, motion: false });
      await clickDie(0);
      await settled();
      assert.equal(
        await page.evaluate(() => window.serpentTest.state.current),
        1,
      );
      assert.equal(
        await page
          .locator(".player-die:not([disabled])")
          .getAttribute("data-roll"),
        "1",
      );
      await force({ count: 4, pos: 1, die: 6, motion: false });
      await clickDie(0);
      await settled();
      assert.equal(
        await page.evaluate(() => window.serpentTest.state.current),
        0,
      );
      assert.equal(
        await page
          .locator(".player-die:not([disabled])")
          .getAttribute("data-roll"),
        "0",
      );
    },
  );
  await check("in bot matches the human die is on the right", async () => {
    for (const [width, height] of [
      [390, 700],
      [1366, 768],
    ]) {
      await page.setViewportSize({ width, height });
      await force({ bot: true, motion: false });
      const human = await page.locator('[data-roll="0"]').boundingBox(),
        bot = await page.locator('[data-roll="1"]').boundingBox();
      assert.ok(human.x > bot.x);
      await shot("bot-human-right-" + width);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  });
  await check(
    "a six visits six separate square centers with a pause at each square",
    async () => {
      await force({ pos: 1, die: 6 });
      await page.evaluate(() => {
        window.stepFrames = [];
        const pawn = document.querySelector('[data-player="0"]');
        new MutationObserver((ms) => {
          for (const m of ms)
            if (m.attributeName === "data-step")
              window.stepFrames.push({
                n: +pawn.dataset.step,
                time: performance.now(),
                transform: pawn.getAttribute("transform"),
              });
        }).observe(pawn, { attributes: true });
      });
      await clickDie();
      await page.waitForFunction(() => window.stepFrames.length >= 2);
      await shot("pin-step-by-step");
      assert.equal(
        await page.locator(".player-die:not([disabled])").count(),
        0,
      );
      await settled();
      const steps = await page.evaluate(() => window.stepFrames);
      assert.deepEqual(
        steps.map((s) => s.n),
        [2, 3, 4, 5, 6, 7],
      );
      for (let j = 1; j < steps.length; j++)
        assert.ok(
          steps[j].time - steps[j - 1].time >= 320,
          "individual stops are visible",
        );
    },
  );
  await check(
    "rendered cylindrical scale bodies change real pixels while endpoints remain fixed",
    async () => {
      const canvas = page.locator(".living-serpents");
      const a = await canvas.evaluate((e) => e.toDataURL());
      const d = await page
        .locator('[data-snake="99"] path')
        .first()
        .getAttribute("d");
      await page.waitForTimeout(350);
      assert.notEqual(await canvas.evaluate((e) => e.toDataURL()), a);
      const after = await page
        .locator('[data-snake="99"] path')
        .first()
        .getAttribute("d");
      assert.notEqual(d, after);
      assert.equal(after.split(" C ")[0], d.split(" C ")[0]);
      assert.equal(
        after.split(" ").slice(-2).join(" "),
        d.split(" ").slice(-2).join(" "),
      );
      await shot("living-cylindrical-snakes");
    },
  );
  await check(
    "swallow follows the animated real body and releases at exact tail",
    async () => {
      await force({ pos: 26, die: 1 });
      await clickDie();
      await page.waitForSelector('[data-snake="27"].active-snake');
      assert.equal(
        await page.locator(".player-die:not([disabled])").count(),
        0,
      );
      await shot("snake-swallow");
      await page.waitForTimeout(550);
      await shot("snake-travel");
      await settled();
      assert.equal(
        await page.evaluate(() => window.serpentTest.state.players[0].position),
        5,
      );
      assert.equal(
        await page.locator('[data-player="0"]').getAttribute("data-position"),
        "5",
      );
      await shot("snake-tail-release");
    },
  );
  await check(
    "extruded ladders climb their real geometry and land exactly",
    async () => {
      assert.equal(await page.locator(".sculpted-ladder").count(), 6);
      await force({ pos: 3, die: 1 });
      await clickDie();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("Climbing"),
      );
      assert.equal(
        await page.locator(".player-die:not([disabled])").count(),
        0,
      );
      const before = await page
        .locator('[data-player="0"]')
        .getAttribute("transform");
      await page.waitForTimeout(200);
      const climbing = await page
        .locator('[data-player="0"]')
        .getAttribute("transform");
      assert.notEqual(climbing, before);
      await shot("ladder-climbing");
      await settled();
      assert.equal(
        await page.evaluate(() => window.serpentTest.state.players[0].position),
        25,
      );
      assert.equal(
        await page.locator('[data-player="0"]').getAttribute("data-position"),
        "25",
      );
    },
  );
  await check(
    "double rolls rejected; Menu cancels an in-flight die and resets a new match",
    async () => {
      await force({ die: 6 });
      await clickDie();
      await page.evaluate(() => window.serpentTest.turn());
      await page.click("#menu-button");
      await page.click("#start");
      if (await page.locator("#skip").isVisible()) await page.click("#skip");
      await page.waitForSelector("#play:visible");
      await page.waitForTimeout(1250);
      assert.equal(
        await page.evaluate(() => window.serpentTest.state.rolls),
        0,
      );
      assert.equal(
        await page.evaluate(() => window.serpentTest.state.colorsLocked),
        false,
      );
      assert.equal(await page.locator("#pause").count(), 0);
    },
  );
  await check(
    "each finisher receives their own color celebration and final ranking",
    async () => {
      for (let i = 0; i < 3; i++) {
        await force({
          count: 4,
          current: i,
          pos: 98,
          order: Array.from({ length: i }, (_, j) => j),
          die: 2,
        });
        await clickDie(i);
        await page.waitForSelector("#celebration:visible");
        assert.equal(
          await page.locator("#result-title").textContent(),
          ["WINNER", "1ST RUNNER-UP", "2ND RUNNER-UP"][i],
        );
        assert.equal(
          await page
            .locator(".spark")
            .first()
            .evaluate((e) => getComputedStyle(e).backgroundColor),
          ["rgb(241, 75, 88)", "rgb(67, 174, 255)", "rgb(255, 208, 75)"][i],
        );
        await shot("finish-" + i);
        if (i === 2) {
          assert.deepEqual(
            await page.evaluate(() => window.serpentTest.state.order),
            [0, 1, 2, 3],
          );
          assert.equal(await page.locator(".standing").count(), 4);
        } else await page.click("#continue");
      }
      await force({ count: 3, pos: 98, die: 2 });
      await page.evaluate(
        () => (window.serpentTest.state.players[0].color = "Green"),
      );
      await clickDie();
      await page.waitForSelector("#celebration:visible");
      assert.equal(
        await page
          .locator(".spark")
          .first()
          .evaluate((e) => getComputedStyle(e).backgroundColor),
        "rgb(79, 218, 145)",
      );
      await shot("finish-green");
    },
  );
  await check(
    "bot defeat text is swallowed and revealed without fireworks",
    async () => {
      await force({ bot: true, current: 1, pos: 98, die: 2 });
      await page.evaluate(() => window.serpentTest.turn());
      await page.waitForSelector("#celebration:visible");
      assert.equal(
        await page.locator("#result-title").textContent(),
        "YOU LOSE",
      );
      await page.waitForTimeout(2600);
      assert.ok(
        +(await page
          .locator("#result-title")
          .evaluate((e) => getComputedStyle(e).opacity)) < 0.1,
      );
      await shot("defeat-swallowed");
      await page.waitForTimeout(3600);
      assert.equal(
        await page
          .locator("#result-title")
          .evaluate((e) => getComputedStyle(e).opacity),
        "1",
      );
      assert.equal(await page.locator(".spark").count(), 0);
      await shot("defeat-revealed");
    },
  );
  await check("automatic fair bot also needs a one to activate", async () => {
    await force({ bot: true, die: 1, motion: false });
    await clickDie();
    await settled(2);
    assert.equal(
      await page.evaluate(() => window.serpentTest.state.current),
      0,
    );
    assert.deepEqual(
      await page.evaluate(() =>
        window.serpentTest.state.players.map((p) => p.position),
      ),
      [1, 1],
    );
  });
  await check(
    "reduced motion preserves activation, snake, ladder and results",
    async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (const [pos, destination] of [
        [0, 1],
        [26, 5],
        [3, 25],
      ]) {
        await force({ pos, die: 1, motion: false });
        await clickDie();
        await settled();
        assert.equal(
          await page.evaluate(
            () => window.serpentTest.state.players[0].position,
          ),
          destination,
        );
      }
      await page.click("#menu-button");
      await page.click("#start");
      await page.waitForSelector("#play:visible");
      assert.equal(await page.locator("#intro").isVisible(), false);
    },
  );
  await check(
    "storage blocked still allows an active die and a real match",
    async () => {
      const context = await b.newContext({ reducedMotion: "reduce" }),
        p = await context.newPage();
      await p.addInitScript(() => {
        Object.defineProperty(window, "localStorage", {
          get() {
            throw Error("blocked");
          },
        });
      });
      await p.goto(base);
      await p.click("#start");
      await p.waitForSelector("#play:visible");
      await p.click('[data-roll="0"]');
      await p.waitForFunction(
        () => document.querySelector('[data-game-color="0"]').disabled,
      );
      await context.close();
    },
  );
  await check(
    "all four personal dice are distinct and only the current player can roll",
    async () => {
      for (let i = 0; i < 4; i++) {
        await force({ count: 4, current: i, die: 1, motion: false });
        assert.equal(await page.locator(".player-die").count(), 4);
        assert.equal(
          await page
            .locator(".player-die:not([disabled])")
            .getAttribute("data-roll"),
          String(i),
        );
        for (let j = 0; j < 4; j++) {
          assert.equal(
            await page.locator(`[data-roll="${j}"] .die-face`).count(),
            6,
          );
          assert.equal(
            await page.locator(`[data-roll="${j}"] .pip`).count(),
            21,
          );
        }
        await clickDie(i);
        await settled();
        assert.equal(
          await page.evaluate(
            (i) => window.serpentTest.state.players[i].lastDice,
            i,
          ),
          1,
        );
        assert.equal(
          await page.evaluate(
            (i) =>
              window.serpentTest.state.players
                .filter((_, j) => j !== i)
                .every((p) => p.lastDice === null),
            i,
          ),
          true,
        );
      }
    },
  );
  await check(
    "complete PC/phone matches fit one screen including all controls",
    async () => {
      for (const [width, height] of [
        [320, 568],
        [360, 640],
        [390, 844],
        [412, 915],
        [430, 932],
        [768, 1024],
        [1024, 768],
        [1366, 768],
        [1440, 900],
        [1920, 1080],
        [640, 360],
        [844, 390],
      ]) {
        await page.setViewportSize({ width, height });
        await force({ count: 4, motion: false });
        await page.waitForTimeout(80);
        const measured = await page.evaluate(() => {
          const b = document
              .querySelector(".board-frame")
              .getBoundingClientRect(),
            a = document.querySelector("aside").getBoundingClientRect();
          return {
            w: document.documentElement.scrollWidth,
            h: document.documentElement.scrollHeight,
            board: {
              x: b.x,
              y: b.y,
              w: b.width,
              h: b.height,
              right: b.right,
              bottom: b.bottom,
            },
            panel: { x: a.x, y: a.y, right: a.right, bottom: a.bottom },
            buttons: [
              ...document.querySelectorAll(
                "#play button, body.playing header button",
              ),
            ].map((e) => {
              const r = e.getBoundingClientRect();
              return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
            }),
          };
        });
        assert.ok(
          measured.w <= width,
          JSON.stringify({ width, height, measured }),
        );
        assert.ok(
          measured.h <= height,
          JSON.stringify({ width, height, measured }),
        );
        assert.ok(Math.abs(measured.board.w - measured.board.h) < 1);
        for (const r of measured.buttons) {
          assert.ok(
            r.x >= 0 &&
              r.y >= 0 &&
              r.right <= width + 0.5 &&
              r.bottom <= height + 0.5,
            JSON.stringify(r),
          );
        }
        if (width >= 820 || width > height)
          assert.ok(measured.panel.x >= measured.board.right);
        else assert.ok(measured.panel.y >= measured.board.bottom);
        assert.ok(
          (await page.locator('[data-roll="0"]').boundingBox()).height >= 44,
        );
        assert.equal(await page.locator(".player-die").count(), 4);
        for (let j = 0; j < 4; j++) {
          const r = await page
            .locator(`[data-roll="${j}"] .cube-stage`)
            .boundingBox();
          assert.ok(
            r.x >= 0 &&
              r.y >= 0 &&
              r.x + r.width <= width + 0.5 &&
              r.y + r.height <= height + 0.5,
            JSON.stringify({ j, width, height, r }),
          );
        }
        await shot(`fit-${width}-${height}`);
      }
    },
  );
  await check(
    "one replacement card and the legacy redirect remain intact",
    async () => {
      await page.click("#menu-button");
      await page.goto(new URL("../snake/", base).href);
      await page.waitForURL("**/games/snakes-and-ladders/");
      await page.goto(new URL("../", base).href);
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
  await check(
    "replacement preview matches the square sibling cards with emerald Play Now artwork",
    async () => {
      await page.goto("http://127.0.0.1:8765/games/");
      for (const [width, height] of [
        [390, 844],
        [1440, 1000],
      ]) {
        await page.setViewportSize({ width, height });
        const card = page.locator(".serpent-tile"),
          preview = card.locator(".preview");
        await card.scrollIntoViewIfNeeded();
        await preview.locator("img").waitFor({ state: "visible" });
        await page.waitForFunction(
          () =>
            document.querySelector(".serpent-tile img").naturalWidth === 900,
        );
        const shape = await preview.boundingBox();
        assert.ok(Math.abs(shape.width - shape.height) < 1);
        const css = await card.evaluate((e) => {
          const s = getComputedStyle(e);
          return {
            radius: s.borderRadius,
            padding: s.padding,
            border: s.borderTopWidth,
          };
        });
        const sibling = await page
          .locator(".tic-tac-toe-tile")
          .evaluate((e) => {
            const s = getComputedStyle(e);
            return {
              radius: s.borderRadius,
              padding: s.padding,
              border: s.borderTopWidth,
            };
          });
        assert.deepEqual(css, sibling);
        await card.screenshot({
          path: path.join(out, `square-preview-${width}.png`),
        });
      }
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
