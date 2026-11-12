const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  const out =
    process.env.TTT_EVIDENCE ||
    path.join(require("node:os").tmpdir(), "ttt-word-fire");
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROME || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  let checks = 0;
  const base = process.env.TTT_URL || "http://localhost:8000";
  for (const [width, height] of [
    [320, 568],
    [390, 700],
    [1440, 900],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(base + "/games/tic-tac-toe/");
    assert(await page.locator(".game-tools").isVisible());
    await page.locator('[data-mode="friend"]').click();
    await page.locator("#start").click();
    assert(await page.locator(".game-tools").isHidden());
    for (const i of [0, 3, 1, 4, 2]) await page.locator(".cell").nth(i).click();
    await page.locator("#result:not([hidden])").waitFor();
    await page.waitForTimeout(1700);
    const pixels = await page.evaluate(() => {
      const c = document.querySelector("#sparks"),
        a = document.querySelector("#arena"),
        r = a.getBoundingClientRect(),
        t = document.querySelector("#result-title").getBoundingClientRect();
      const sx = c.width / a.clientWidth,
        sy = c.height / a.clientHeight;
      const x0 = Math.floor((t.x - r.x - a.clientLeft) * sx) - 1,
        y0 = Math.floor((t.y - r.y - a.clientTop) * sy) - 1;
      const x1 = Math.ceil((t.right - r.x - a.clientLeft) * sx) + 1,
        y1 = Math.ceil((t.bottom - r.y - a.clientTop) * sy) + 1;
      const data = c
        .getContext("2d")
        .getImageData(0, 0, c.width, c.height).data;
      let inside = 0,
        outside = 0;
      for (let y = 0; y < c.height; y++)
        for (let x = 0; x < c.width; x++)
          if (data[(y * c.width + x) * 4 + 3]) {
            if (x >= x0 && x <= x1 && y >= y0 && y <= y1) inside++;
            else outside++;
          }
      return { inside, outside };
    });
    assert(pixels.inside > 200, "Visible fire ink in the letters");
    assert.equal(
      pixels.outside,
      0,
      "No flame strip or ambient fire above the title",
    );
    const before = await page.locator("#sparks").evaluate((c) => c.toDataURL());
    await page.waitForTimeout(180);
    assert.notEqual(
      await page.locator("#sparks").evaluate((c) => c.toDataURL()),
      before,
      "Fire texture moves inside glyphs",
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight + 1,
      ),
      "Entire game stays in one screen",
    );
    await page.screenshot({
      path: path.join(out, "word-fire-" + width + ".png"),
    });
    await page.locator("#restart").click();
    await page.waitForTimeout(80);
    assert(
      await page.locator("#sparks").evaluate(
        (c) =>
          !c
            .getContext("2d")
            .getImageData(0, 0, c.width, c.height)
            .data.some((v, i) => i % 4 === 3 && v),
      ),
      "Restart clears fire ink",
    );
    await page.locator('[data-action="menu"]:visible').first().click();
    assert(await page.locator(".game-tools").isVisible());
    checks += 8;
  }
  await browser.close();
  console.log(
    "PASS " +
      checks +
      " glyph-fire, menu-only controls, fit and cleanup assertions",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
