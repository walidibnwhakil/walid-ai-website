const {chromium} = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");

(async () => {
  const root = path.resolve(__dirname, "..");
  const mime = {".html":"text/html", ".mjs":"text/javascript", ".css":"text/css", ".png":"image/png", ".jpg":"image/jpeg"};
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, "http://localhost").pathname;
      const file = path.resolve(root, "." + pathname + (pathname.endsWith("/") ? "index.html" : ""));
      if (!file.startsWith(root + path.sep)) throw new Error("Path outside root");
      const bytes = await fs.readFile(file);
      response.writeHead(200, {"content-type":mime[path.extname(file)] || "application/octet-stream"});
      response.end(bytes);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  let browser;
  try {
    browser = await chromium.launch({executablePath:process.env.RIDDLEX_CHROME});
    const url = `http://127.0.0.1:${server.address().port}/games/`;
    const output = process.env.RIDDLEX_BROWSER_OUTPUT;
    if (output) await fs.mkdir(output, {recursive:true});
    for (const [width, motion] of [[1280, "no-preference"], [390, "reduce"], [320, "no-preference"]]) {
      const page = await browser.newPage({viewport:{width,height:850},reducedMotion:motion});
      const errors = [];
      page.on("pageerror", error => errors.push(String(error)));
      await page.addInitScript(() => {Math.random = () => .95;});
      const go = async name => {
        const response = await page.goto(url + name);
        assert.equal(response.status(), 200);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      };
      const capture = name => output && page.screenshot({path:path.join(output, `${width}-${name}.png`),fullPage:true});
      const status = page.locator("#status");
      const button = name => page.getByRole("button", {name, exact:true});
      await go("");
      const tiles = page.locator(".preview");
      assert.equal(await tiles.count(), 7);
      for (const preview of await tiles.all()) {
        await preview.scrollIntoViewIfNeeded();
        await preview.locator("..").focus();
        await preview.evaluate(element => {
          if (!element.closest("a").matches(":focus")) throw new Error("Tile has no keyboard focus");
        });
        await page.waitForFunction(node => node.classList.contains("in-view"), await preview.elementHandle());
        const count = await preview.evaluate(node => node.getAnimations({subtree:true}).length);
        assert.equal(count > 0, motion !== "reduce");
      }
      await capture("index");
      const bytes = await page.evaluate(() => performance.getEntriesByType("resource").reduce((sum, entry) => sum + entry.encodedBodySize, 0));
      assert(bytes < 250000, "Games index payload");
      await go("ludo/");
      await button("Roll die").click();
      await page.getByRole("button", {name:"Red token 1, in yard"}).click();
      assert.equal(await page.locator(".safe span.red").innerText(), "1");
      await page.locator("#mode").selectOption("friend");
      assert.match(await status.innerText(), /Red: roll the die/);
      await capture("ludo");
      await go("chess/");
      await button("e2, White pawn").click();
      await button("e4, empty, legal move").click();
      await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("White to move"));
      assert(await button("e4, White pawn").isVisible());
      await page.locator("#mode").selectOption("friend");
      for (const [from, to] of [["f2, White pawn","f3"],["e7, Black pawn","e5"],["g2, White pawn","g4"],["d8, Black queen","h4"]]) {
        await button(from).click();
        await button(to + ", empty, legal move").click();
      }
      assert.match(await status.innerText(), /Checkmate. Black wins/);
      await capture("chess");
      await go("penalty/");
      await button("Left").click();
      await page.waitForFunction(() => document.querySelector("#status").textContent.includes("choose where to dive"));
      await button("Right").click();
      await page.waitForFunction(() => document.querySelector("#status").textContent.includes("choose where to shoot"));
      assert.match(await status.innerText(), /You 1–0 Bot/);
      await page.locator("#mode").selectOption("friend");
      await button("Center").click();
      assert.match(await status.innerText(), /Player 2, choose where to dive/);
      await button("Center").click();
      assert.match(await status.innerText(), /Saved/);
      await capture("penalty");
      await go("tic-tac-toe/");
      await button("Row 1, column 1, empty").click();
      await button("Row 2, column 2, O").waitFor();
      await page.locator("#mode").selectOption("friend");
      for (const [row,column] of [[1,1],[2,1],[1,2],[2,2],[1,3]]) {
        await button(`Row ${row}, column ${column}, empty`).click();
      }
      assert.equal(await status.innerText(), "X wins!");
      await capture("tic-tac-toe");
      await go("snake/");
      await page.keyboard.press("ArrowUp");
      await page.waitForFunction(() => document.querySelectorAll(".snake .segment")[0] === document.querySelector(".snake").children[120]);
      await button("Pause").click();
      assert.match(await status.innerText(), /Paused/);
      await capture("snake");
      await go("2048/");
      assert.equal(await page.locator('[role="gridcell"]').count(), 16);
      assert.equal(await page.locator('[role="gridcell"][data-value="0"]').count(), 14);
      for (const direction of ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"]) {
        await page.keyboard.press(direction);
        if (!(await status.innerText()).includes("No tiles moved")) break;
      }
      assert.notEqual(await status.innerText(), "Use the arrow keys or direction buttons to begin.");
      await button("Move up").click();
      assert(await page.locator("#board").evaluate(node => document.activeElement === node));
      await page.keyboard.press("ArrowDown");
      await capture("2048");
      assert.deepEqual(errors, []);
      console.log(`${width}px: 7 previews, 6 local games, keyboard and overflow checks; index ${bytes} bytes`);
      await page.close();
    }
  } finally {
    await browser?.close();
    server.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
