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
    const viewports=process.env.ARCADE_TEST_WIDTHS?JSON.parse(process.env.ARCADE_TEST_WIDTHS):[[1280,"no-preference"],[768,"reduce"],[390,"reduce"],[360,"no-preference"],[320,"no-preference"]];
    for (const [width, motion] of viewports) {
      const mobile = width <= 390;
      const page = await browser.newPage({viewport:{width,height:850},reducedMotion:motion,hasTouch:mobile,isMobile:mobile});
      const errors = [];
      page.on("pageerror", error => errors.push(String(error)));
      await page.addInitScript(() => {Math.random = () => .95;});
      await page.addInitScript(() => document.addEventListener("pointerdown", event => { if (event.target.closest("#board")) window.__boardPointerType = event.pointerType; }, true));
      const go = async name => {
        const response = await page.goto(url + name);
        assert.equal(response.status(), 200);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      };
      const capture = name => output && page.screenshot({path:path.join(output, `${width}-${name}.png`),fullPage:true});
      const status = page.locator("#status");
      const button = name => page.getByRole("button", {name, exact:true});
      const touchTap = async locator => {
        const box=await locator.boundingBox();
        const session=await page.context().newCDPSession(page);
        const x=box.x+box.width/2,y=box.y+box.height/2;
        await session.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y,id:1}]});
        await session.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
        await session.detach();
      };
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
      const boardDie=page.locator("#board-die");
      await page.locator("#mode").selectOption("friend");
      assert(await boardDie.isVisible());
      assert.equal(await page.locator("#board .token").count(),8);
      assert.equal(await page.locator("#board .die-pip.on").count(),1);
      assert.equal(await page.getByRole("button",{name:/Roll die/}).count(),0);
      await page.evaluate(() => {let rolls=[.95,0];Math.random=()=>rolls.length?rolls.shift():.95;});
      if(mobile)await touchTap(boardDie);else await boardDie.click();
      assert.equal(await boardDie.isDisabled(),true,"input locks during die animation");
      await page.locator('#board .token[data-legal="true"]').first().waitFor();
      assert.equal(await boardDie.getAttribute("data-value"),"6");
      assert.equal(await page.locator("#board .die-pip.on").count(),6);
      assert.equal(await page.locator('#board .token[data-legal="true"]').count(),4);
      if(mobile)await touchTap(page.locator('#board .token[data-token="0-0"]'));else await page.locator('#board .token[data-token="0-0"]').click();
      if(mobile)assert.equal(await page.evaluate(()=>window.__boardPointerType),"touch");
      await page.waitForFunction(()=>document.querySelector('[data-token="0-0"]').dataset.step==="0"&&!document.querySelector('#board-die').disabled);
      await boardDie.click();
      await page.waitForSelector('[data-token="0-0"][data-step="1"]');
      await page.waitForFunction(()=>document.querySelector('[data-token="0-0"]').dataset.step==="1"&&!document.querySelector('#board-die').disabled);
      assert.match(await status.innerText(),/Blue: tap your die/);
      await capture("ludo");
      assert.equal(await page.locator("#player-count option").count(), 3);
      await page.locator("#player-count").selectOption("3");
      assert.equal(await page.locator("#board .token").count(),12);
      assert.equal(await page.locator(".ludo .token.green").count(),4);
      assert.equal(await page.locator(".ludo .token.yellow").count(),0);
      await page.locator("#player-count").selectOption("4");
      assert.equal(await page.locator("#board .token").count(),16);
      assert.equal(await page.locator(".ludo .token.yellow").count(),4);
      await page.locator("#mode").selectOption("mixed");
      assert.equal(await page.locator("#seat-options select").count(), 4);
      await page.getByLabel("Blue seat type").selectOption("human");
      assert.equal(await page.getByLabel("Blue seat type").inputValue(), "human");
      await page.locator("#mode").selectOption("bot");
      await page.evaluate(() => {let rolls=[.95,0,.95,.95,0,0];Math.random=()=>rolls.length?rolls.shift():0;});
      await boardDie.click();
      await page.locator('#board .token[data-token="0-0"][data-legal="true"]').waitFor();
      await page.locator('#board .token[data-token="0-0"]').click();
      await page.waitForFunction(()=>document.querySelector('[data-token="0-0"]').dataset.step==="0"&&!document.querySelector('#board-die').disabled);
      await boardDie.click();
      await page.waitForSelector('[data-token="0-0"][data-step="1"]');
      await page.waitForSelector('[data-token="1-3"][data-step="1"]',{timeout:5000});
      if(width===390){
        await page.locator("#player-count").selectOption("2");
        await page.locator("#mode").selectOption("friend");
        const rolls=[];
        for(let token=0;token<4;token++)rolls.push(.95,...Array(9).fill(.95),.4,0);
        await page.evaluate(values=>{let rolls=values.slice();Math.random=()=>rolls.length?rolls.shift():0;},rolls);
        for(let token=0;token<4;token++){
          await page.waitForFunction(()=>!document.querySelector('#board-die').disabled);
          await boardDie.click();
          await page.waitForFunction(id=>{const token=document.querySelector(`[data-token="0-${id}"]`);return token.dataset.legal==="true"||token.dataset.step==="0"&&!document.querySelector("#board-die").disabled;},token);
          if(await page.locator(`#board .token[data-token="0-${token}"]`).getAttribute("data-step")==="-1")await page.locator(`#board .token[data-token="0-${token}"]`).click();
          await page.waitForFunction((id)=>Number(document.querySelector(`[data-token="0-${id}"]`).dataset.step)===0&&!document.querySelector("#board-die").disabled,token);
          for(let hop=0;hop<9;hop++){
            await page.waitForFunction(()=>!document.querySelector('#board-die').disabled);
            await boardDie.click();
            await page.waitForFunction(data=>{const token=document.querySelector(`[data-token="0-${data.id}"]`);return token.dataset.legal==="true"||Number(token.dataset.step)===data.step;},{id:token,step:(hop+1)*6});
            if(await page.locator(`#board .token[data-token="0-${token}"]`).getAttribute("data-legal")==="true")await page.locator(`#board .token[data-token="0-${token}"]`).click();
            await page.waitForFunction(data=>Number(document.querySelector(`[data-token="0-${data.token}"]`).dataset.step)===data.step,{token,step:(hop+1)*6},{timeout:5000}).catch(async error=>{console.error("Ludo progression",token,hop,await page.locator("#status").innerText(),await boardDie.getAttribute("data-value"),await page.locator("#board .token").evaluateAll(nodes=>nodes.filter(node=>node.dataset.token.startsWith("0-")).map(node=>[node.dataset.token,node.dataset.step,node.dataset.legal])));throw error;});
          }
          await page.waitForFunction(()=>!document.querySelector('#board-die').disabled);
          await boardDie.click();
          if(token<3){
            await page.waitForFunction(()=>document.querySelector('#board-die').dataset.team==="blue"&&!document.querySelector('#board-die').disabled);
            await boardDie.click();
            await page.waitForFunction(()=>document.querySelector('#board-die').dataset.team==="red"&&!document.querySelector('#board-die').disabled);
          } else await page.waitForSelector("#winner-overlay:not([hidden])");
        }
        assert.match(await page.locator("#winner-title").innerText(),/Red wins/);
        assert(await page.getByRole("button",{name:"Play Again"}).isVisible());
        assert(await page.getByRole("button",{name:"New Game",exact:true}).isVisible());
        await button("Play Again").click();
        assert.equal(await page.locator("#winner-overlay").isHidden(),true);
      }
      await go("chess/");
      assert.equal(await page.locator(".chess-piece").count(),32);
      assert.equal(new Set(await page.locator(".chess-piece use").evaluateAll(nodes=>nodes.map(node=>node.getAttribute("href")))).size,6);
      await button("e2, White pawn").click();
      await button("e4, empty, legal move").click();
      await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("White to move"));
      await capture("chess-opening");
      assert(await button("e4, White pawn").isVisible());
      await page.locator("#mode").selectOption("friend");
      for (const [from, to] of [["f2, White pawn","f3"],["e7, Black pawn","e5"],["g2, White pawn","g4"],["d8, Black queen","h4"]]) {
        await button(from).click();
        await button(to + ", empty, legal move").click();
      }
      assert.match(await status.innerText(), /Checkmate. Black wins/);
      assert.equal(await page.locator("#move-history li").count(),2);
      await capture("chess");
      await button("New game").click();
      for (const [from,to] of [["e2, White pawn","e4, empty, legal move"],["d7, Black pawn","d5, empty, legal move"],["e4, White pawn","d5, Black pawn, legal move"]]) {
        await button(from).click();
        await button(to).click();
      }
      assert.equal(await page.locator("#captured-white svg").count(),1);
      assert.equal(await page.locator("#captured-white svg").getAttribute("aria-label"),"pawn captured");
      assert.equal(await page.locator("#move-history li").count(),2);
      await capture("chess-capture");
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
      await page.waitForFunction(() => {
        const line = document.querySelector(".win-line line");
        return line && Number.parseFloat(getComputedStyle(line).strokeDashoffset) === 0;
      });
      assert.equal(await page.locator(".win-line line").getAttribute("x1"), "50");
      assert.equal(await page.locator(".win-line line").getAttribute("x2"), "250");
      await capture("tic-tac-toe");
      await go("snakes-and-ladders/");
      await page.locator("#start").click();
      if(await page.locator("#skip").isVisible()) await page.locator("#skip").click();
      await page.waitForSelector("#play:visible");
      assert.equal(await page.locator(".square-number").count(),100);
      await page.locator('[data-roll="0"]').click();
      await page.waitForFunction(()=>!document.querySelector(".player-die.rolling"));
      await capture("snakes-and-ladders");
      await go("2048/");
      assert.equal(await page.locator('[role="gridcell"]').count(), 16);
      assert.equal(await page.locator('[role="gridcell"][data-value="0"]').count(), 14);
      await page.keyboard.press("ArrowLeft");
      assert.notEqual(await status.innerText(), "Use the arrow keys or direction buttons to begin.");
      assert.match(await page.locator("#best").innerText(), /Best [1-9]\d*/);
      assert(await page.locator('.twenty48-board [data-moved="true"]').count() > 0);
      await button("Move up").click();
      assert(await page.locator("#board").evaluate(node => document.activeElement === node));
      await page.keyboard.press("ArrowDown");
      await button("New game").click();
      const boardBox = await page.locator("#board").boundingBox();
      await page.mouse.move(boardBox.x + boardBox.width * .75, boardBox.y + boardBox.height * .5);
      await page.mouse.down();
      await page.mouse.move(boardBox.x + boardBox.width * .25, boardBox.y + boardBox.height * .5, {steps:4});
      await page.mouse.up();
      assert.notEqual(await status.innerText(), "Use the arrow keys or direction buttons to begin.");
      assert.match(await page.locator("#best").innerText(), /Best [1-9]\d*/);
      await page.waitForTimeout(250);
      await capture("2048-swipe");
      await button("New game").click();
      if (mobile) {
        const session = await page.context().newCDPSession(page);
        const box = await page.locator("#board").boundingBox();
        const x = box.x + box.width * .76;
        const y = box.y + box.height * .85;
        await page.evaluate(() => {window.__boardPointerType=null;});
        await session.send("Input.dispatchTouchEvent", {type:"touchStart",touchPoints:[{x,y,id:1}]});
        await session.send("Input.dispatchTouchEvent", {type:"touchMove",touchPoints:[{x:x-box.width*.5,y,id:1}]});
        await session.send("Input.dispatchTouchEvent", {type:"touchEnd",touchPoints:[]});
        assert.equal(await page.evaluate(() => window.__boardPointerType), "touch");
        assert.match(await status.innerText(), /Merged tiles/);
        await session.detach();
        await button("New game").click();
      }
      assert.equal(await page.locator("#score").innerText(), "Score 0");
      assert.match(await page.locator("#best").innerText(), /Best [1-9]\d*/);
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
