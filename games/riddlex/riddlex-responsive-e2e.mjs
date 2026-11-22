import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { once } from "node:events";
import { chromium } from "playwright";
import { join } from "node:path";

// The test serves the actual Riddlex files. It does not replace mobile artwork
// with desktop assets or mock the knowledge engine.
const root = new URL("../../", import.meta.url);
const mime = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".mjs": "text/javascript", ".json": "application/json",
  ".bin": "application/octet-stream", ".webp": "image/webp",
  ".jpg": "image/jpeg", ".png": "image/png",
};
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  if (pathname.includes("..")) { response.writeHead(404).end(); return; }
  const route = pathname.endsWith("/") ? pathname + "index.html" : pathname;
  try {
    const bytes = await readFile(new URL(route.slice(1), root));
    response.writeHead(200, {
      "content-type": mime[route.match(/\.[^.]+$/)?.[0]] || "application/octet-stream",
    });
    response.end(bytes);
  } catch {
    response.writeHead(404).end("Not found");
  }
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const origin = "http://127.0.0.1:" + server.address().port;

const shotFolder = process.env.RIDDLEX_SCREENSHOT_DIR || "";
if (shotFolder) await mkdir(shotFolder, { recursive: true });

let browser;
try {
  browser = await chromium.launch({ headless: true });
  for (const { width, height, orient } of [
    { width: 390, height: 844, orient: "portrait" },
    { width: 1366, height: 768, orient: "landscape" },
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && message.text().includes("Riddlex knowledge"))
        errors.push(message.text());
    });
    await page.route("**/*", (route) => {
      if (new URL(route.request().url()).origin === origin) return route.continue();
      return route.abort();
    });
    const response = await page.goto(origin + "/games/riddlex/?autotest=1", { waitUntil: "load" });
    assert.equal(response.status(), 200);
    assert.equal(await page.locator("html").getAttribute("data-orient"), orient);
    const menuArt = await page.locator(orient === "portrait" ? ".menu-port" : ".menu-card").getAttribute("src");
    assert.ok(menuArt?.includes(orient === "portrait" ? "menu-portrait" : "menu-user-approved"), menuArt);
    assert.equal(await page.locator("#menu .lang-switch").count(), 0, "language selector must not appear on the landing screen");
    assert.equal(await page.locator("#menu .menu-privacy").count(), 0, "privacy belongs on the site's legal pages");
    assert.equal(await page.locator("#play").getAttribute("aria-label"), "Play Now");
    if (orient === "portrait")
      assert.equal((await page.locator("#play").innerText()).trim(), "Play Now");
    else {
      const art = await page.evaluate(async () => {
        const img = document.querySelector(".menu-card");
        await img.decode();
        const picture = img.getBoundingClientRect();
        const button = document.getElementById("play").getBoundingClientRect();
        return {
          naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight,
          fit: getComputedStyle(img).objectFit,
          imageAspect: picture.width / picture.height,
          playCenterX: (button.left + button.width/2 - picture.left) / picture.width,
          playCenterY: (button.top + button.height/2 - picture.top) / picture.height,
          decorationHidden: getComputedStyle(document.getElementById("play-label")).visibility,
        };
      });
      assert.deepEqual([art.naturalWidth, art.naturalHeight], [1670, 942],
        "the uploaded menu illustration is used unchanged in composition");
      assert.equal(art.fit, "contain", "show the complete gold frame, artwork and Play Game button");
      assert.ok(Math.abs(art.playCenterX - .642) < .035 &&
        Math.abs(art.playCenterY - .7695) < .035,
        "transparent Play hit target must align with painted button: " + JSON.stringify(art));
      assert.equal(art.decorationHidden, "hidden",
        "do not draw a second Play Now button over the supplied artwork");
    }
    assert.equal(await page.locator("#menu-floor").count(), 0,
      "the old translucent retouch overlay must not return");
    if (orient === "portrait") {
      await page.locator(".menu-port").evaluate((img) => img.decode());
    }
    const menuLayout = await page.evaluate(() => {
      const play = document.getElementById("play").getBoundingClientRect();
      return {
        play: { x: play.x, y: play.y, right: play.right, bottom: play.bottom, width: play.width, height: play.height },
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    assert.ok(menuLayout.play.width >= 150 && menuLayout.play.height >= 44, "Play Now should be comfortably tappable");
    assert.ok(menuLayout.play.x >= -1 && menuLayout.play.right <= width + 1, "Play Now outside screen");
    assert.ok(menuLayout.play.y >= -1 && menuLayout.play.bottom <= height + 1, "Play Now clipped vertically");
    assert.ok(menuLayout.scrollWidth <= width + 2, "menu horizontal overflow");
    if (orient === "portrait") {
      const art = await page.evaluate(() => {
        const img = document.querySelector(".menu-port");
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const measure = (y) => {
          const data = ctx.getImageData(80, y, 570, 1).data;
          let total = 0;
          for (let i = 0; i < data.length; i += 4)
            total += data[i] + data[i+1] + data[i+2];
          return total / (data.length / 4) / 3;
        };
        return { woodRows: [1195, 1225, 1235, 1250].map(measure), goldenFrame: measure(1270) };
      });
      assert.ok(art.woodRows.every((luma) => luma > 42 && luma < 105),
        "table has returned to a black patch or gold stripes: " + art.woodRows);
      assert.ok(art.goldenFrame > 50, "gold bottom frame must be preserved");
    }
    if (shotFolder) await page.screenshot({ path: join(shotFolder, "menu-" + orient + ".png") });

    await page.click("#play");
    assert.equal(await page.locator("#game .lang-switch").isVisible(), true,
      "language option must be available after Play Now");
    await page.waitForFunction(() => !document.getElementById("categories").hidden);
    await page.click('[data-cat="animal"]');
    await page.waitForFunction(() =>
      !document.getElementById("answers").hidden
      && document.getElementById("progress").textContent.includes("Question"),
      null, { timeout: 30000 });
    const geometry = await page.evaluate(() => {
      const controls = [...document.querySelectorAll("#answers button")];
      return {
        stage: document.getElementById("stage").getBoundingClientRect().toJSON(),
        buttons: controls.map((button) => button.getBoundingClientRect().toJSON()),
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    assert.ok(geometry.stage.width > 100 && geometry.stage.height > 100);
    if (shotFolder) await page.screenshot({ path: join(shotFolder, "game-" + orient + ".png") });
    assert.ok(geometry.scrollWidth <= width + 2, "horizontal overflow");
    for (const rect of geometry.buttons) {
      assert.ok(rect.width >= 44 && rect.height >= 44, "tiny answer control");
      assert.ok(rect.x >= -2 && rect.right <= width + 2, "answer outside screen horizontally");
      assert.ok(rect.y >= -2 && rect.bottom <= height + 2, "answer outside screen vertically");
    }
    await page.click("#answer-yes");
    await page.waitForFunction(() =>
      document.getElementById("progress").textContent.includes("Question 2"),
      null, { timeout: 20000 });
    await page.click('#game [data-set-lang="bn"]');
    assert.equal(await page.locator("html").getAttribute("lang"), "bn");
    assert.equal(await page.locator("#answer-yes").textContent(), "হ্যাঁ");

    // Render actual canvas guess photos in both extreme aspect ratios. The
    // synthetic picture has a bright border and edge markers, making cropping
    // or oversized cards immediately visible in the captured screenshot.
    console.log("PHOTO_TEST_START", orient);
    await page.evaluate(() => { document.getElementById("answers").hidden = true; });
    for (const [shape, imageWidth, imageHeight] of [
      ["tall-photo", 180, 690],
      ["wide-photo", 920, 160],
    ]) {
      const pictureState = await page.evaluate(async ({ imageWidth, imageHeight }) => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${imageWidth}" height="${imageHeight}" viewBox="0 0 ${imageWidth} ${imageHeight}">
          <rect width="100%" height="100%" fill="#c1dde8"/>
          <rect x="3" y="3" width="${imageWidth - 6}" height="${imageHeight - 6}" rx="1" fill="none" stroke="#ef1c18" stroke-width="6"/>
          <rect x="8" y="8" width="${imageWidth - 16}" height="20" fill="#fadd1c"/>
          <rect x="8" y="${imageHeight - 28}" width="${imageWidth - 16}" height="20" fill="#2343ff"/>
          <circle cx="${imageWidth / 2}" cy="${imageHeight / 2}" r="26" fill="#3b8021"/>
        </svg>`;
        const src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
        const result = await Promise.race([
          window.__riddlex.reveal("সম্পূর্ণ ছবি", src),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Guess reveal stalled")), 12000)),
        ]);
        return { result, bounds: window.__riddlex.expression().revealBounds };
      }, { imageWidth, imageHeight });
      assert.equal(pictureState.result.printed, true, "test photo failed to load");
      const bounds = pictureState.bounds;
      assert.ok(bounds && bounds.w > 60 && bounds.h > 60, "missing photo card");
      assert.ok(bounds.x >= -1 && bounds.y >= -1, "photo card starts outside stage");
      assert.ok(bounds.x + bounds.w <= bounds.canvasW + 1, "photo card clipped horizontally");
      assert.ok(bounds.y + bounds.h <= bounds.canvasH + 1, "photo card clipped vertically");
      console.log("PHOTO_TEST_PASS", orient, shape, pictureState.bounds.w, pictureState.bounds.h);
      if (shotFolder) await page.screenshot({
        path: join(shotFolder, "guess-" + orient + "-" + shape + ".png"),
      });
    }
    await page.click("#to-menu");
    assert.equal(await page.locator("#menu").isVisible(), true);
    const opposite = orient === "portrait" ? { width: 1366, height: 768, art: "menu-user-approved" }
      : { width: 390, height: 844, art: "menu-portrait" };
    await page.setViewportSize({ width: opposite.width, height: opposite.height });
    await page.waitForFunction((art) =>
      [...document.querySelectorAll("#menu img")].some((img) => img.getAttribute("src")?.includes(art)),
      opposite.art);
    if (orient === "portrait") {
      await page.setViewportSize({ width, height });
      await page.goto(origin + "/games/riddlex/?autotest=1", { waitUntil: "load" });
      await page.click("#play");
      await page.waitForFunction(() => !document.getElementById("categories").hidden);
      await page.click('[data-cat="character"]');
      console.log("CHARACTER_START", orient);
      try {
        await page.waitForFunction(() => !document.getElementById("answers").hidden &&
          /Question|প্রশ্ন/.test(document.getElementById("progress").textContent),
          null, { timeout: 18000 });
      } catch (error) {
        const snapshot = await page.evaluate(() => ({
          status: document.getElementById("status")?.textContent,
          progress: document.getElementById("progress")?.textContent,
          loadRetry: !document.getElementById("load-retry")?.hidden,
          answersHidden: document.getElementById("answers")?.hidden,
          categoriesHidden: document.getElementById("categories")?.hidden,
          loadTrace: window.__riddlexLoadTrace || [],
        }));
        throw new Error("Character gameplay did not open: " + JSON.stringify(snapshot) +
          "; pageErrors=" + errors.join(" | ") + "; " + error.message);
      }
      console.log("CHARACTER_FIRST_QUESTION_PASS");
      await page.click("#answer-yes"); // Real person
      await page.waitForFunction(() => /know you personally|ব্যক্তিগতভাবে চেনেন/i.test(
        document.getElementById("status").textContent), null, { timeout: 18000 });
      await page.click("#answer-yes"); // Knows the player
      await page.waitForFunction(() => /member of your family|পরিবারের সদস্য/i.test(
        document.getElementById("status").textContent), null, { timeout: 18000 });
      if (shotFolder) await page.screenshot({ path: join(shotFolder, "personal-question-portrait.png") });
      console.log("RIDDLEX_PERSONAL_QUESTIONS_PASS");
    }
    assert.deepEqual(errors, [], "uncaught browser errors");
    console.log("RIDDLEX_GAMEPLAY_PASS", width, height, orient);
    await page.close();
  }

  // Drive the actual packed knowledge database through the same browser UI as
  // a player, not a tiny mock casebook. Log every question, answer and guess.
  async function replay(label, policy) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const trace = [];
    try {
      await page.goto(origin + "/games/riddlex/?autotest=1", { waitUntil: "load" });
      await page.click("#play");
      await page.waitForFunction(() => !document.getElementById("categories").hidden);
      await page.click('[data-cat="character"]');
      await page.waitForFunction(() => window.__riddlex?.state()?.mode === "ask", null, { timeout: 35000 });
      const seen = new Set();
      let confirmedCountry = false;
      let knowsNo = false;
      let cricketNo = false;
      let parentYes = false;
      let guesses = 0;
      for (let turn = 0; turn < 32; turn++) {
        await page.waitForFunction(() =>
          ["ask", "guess", "learn"].includes(window.__riddlex?.state()?.mode),
          null, { timeout: 35000 });
        const state = await page.evaluate(() => window.__riddlex.state());
        if (state.mode === "learn") {
          trace.push("END: learn / defeat");
          if (policy === "public") assert.ok(seen.size >= 18,
            "The real knowledge engine surrendered before asking enough useful questions: " + seen.size);
          break;
        }
        if (state.mode === "guess") {
          const name = await page.locator("#guess-line").textContent();
          trace.push("GUESS: " + name + " [" + state.best + "]");
          assert.ok(!knowsNo || !state.best.startsWith("riddlex-role-"),
            "A no-personal-contact answer guessed a personal role");
          if (policy === "family") {
            assert.equal(state.best, "riddlex-role-mother",
              "A confirmed mother must not be replaced by a public celebrity or wrong relative");
            break;
          }
          if (policy === "public") {
            assert.fail("Guessed an unsupported public celebrity from country and negative jobs: " + name);
          }
          if (policy === "shakib" && state.best === "Q266104") {
            trace.push("CORRECT: real packed Shakib target");
            break;
          }
          guesses++;
          if (guesses >= 3) break;
          await page.click("#wrong");
          await page.waitForFunction(() => window.__riddlex?.state()?.mode === "wrong", null, { timeout: 20000 });
          await page.click("#retry");
          await page.waitForFunction(() => ["ask","learn","guess"].includes(window.__riddlex?.state()?.mode),
            null, { timeout: 25000 });
          continue;
        }
        const q = state.question;
        if (seen.has(q)) throw new Error("Question repeated: " + q);
        assert.ok(!(q === "dead" && seen.has("alive")), "Alive/dead question duplicated");
        if (policy === "public" && seen.has("actor"))
          assert.ok(!q.startsWith("screen_star_"), "Actor-only trivia after actor NO");
        seen.add(q);
        if (knowsNo) assert.ok(!q.startsWith("your_"), "Family question after knows-you NO: " + q);
        if (parentYes) assert.ok(!["your_sibling","your_spouse","your_child","your_baby"].includes(q),
          "Contradictory family question after parent YES: " + q);
        if (!seen.has("cricketer") || cricketNo)
          assert.ok(!["does_bat","does_bowl","batsman","bowler","all_rounder","cricket_opener"].includes(q),
            "Cricket role asked without affirmative cricket answer: " + q);
        let a = "unknown";
        if (q === "real") a = "yes";
        else if (q === "knows_you") a = policy === "family" ? "yes" : "no";
        else if (q === "from_bd") a = "yes";
        else if (policy === "shakib" && q !== "knows_you")
          a = await page.evaluate(() =>
            window.__riddlex.find("Q266104") >= 0
              ? window.__riddlex.replyFor("Q266104") : "unknown");
        else if (policy === "actor" && q === "actor") a = "yes";
        else if (policy === "actor" && [
          "politician", "singer", "writer", "athlete", "cricketer",
          "footballer", "director", "musician", "business", "youtube",
          "does_bat", "does_bowl"
        ].includes(q)) a = "no";
        else if (q === "cricketer" || q === "does_bat" || q === "does_bowl") a = "no";
        else if (policy === "family" && q === "your_family") a = "yes";
        else if (policy === "family" && q === "your_parent") a = "yes";
        else if (policy === "family" && q === "female") a = "yes";
        else if (policy === "family" && q === "male") a = "no";
        else if (policy === "public" && ["politician","actor","singer","writer","footballer","scientist"].includes(q))
          a = "no";
        if (q === "from_bd" && a === "yes") confirmedCountry = true;
        if (q === "knows_you" && a === "no") knowsNo = true;
        if (q === "cricketer" && a === "no") cricketNo = true;
        if (q === "your_parent" && a === "yes") parentYes = true;
        trace.push("Q" + (turn+1) + " " + q + " = " + a);
        await page.evaluate((value) => window.__riddlex.answer(value), a);
      }
      console.log("RIDDLEX_OWNER_REPLAY_" + policy.toUpperCase() + " " + JSON.stringify(trace));
      assert.ok(seen.has("knows_you"), "Personal-contact question was not asked");
      if (policy === "family") assert.ok(parentYes, "The family/parent route was not reached");
      if (policy === "public" || policy === "actor")
        assert.ok(confirmedCountry, "Bangladesh question was not asked");
      if (policy === "actor") {
        assert.ok(seen.has("actor"), "Actor yes was never exercised");
        assert.ok(knowsNo, "Personal acquaintance no was never exercised");
      }
      if (policy === "shakib") assert.ok(trace.some((item) => item.startsWith("CORRECT:")),
        "The real Shakib entry was not guessed after real answers");
      return trace;
    } catch (error) {
      console.error("RIDDLEX_OWNER_REPLAY_FAILED_" + policy.toUpperCase() + " " + JSON.stringify(trace));
      throw error;
    } finally {
      await page.close();
    }
  }
  await replay("Bangladeshi ordinary person", "public");
  await replay("Bangladeshi family member", "family");
  await replay("Shakib Al Hasan with the real database answers", "shakib");
  await replay("Bangladeshi actor who does not know the player", "actor");
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
