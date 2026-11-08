const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  http = require("node:http"),
  path = require("node:path");
const base = process.env.LUDO_BASE_URL || "http://127.0.0.1:8127";
(async () => {
  let server;
  if (!process.env.LUDO_BASE_URL) {
    server = http.createServer((req, res) => {
      const pathname = decodeURIComponent(req.url.split("?")[0]);
      let file = path.join(path.resolve(__dirname, "../.."), pathname);
      if (pathname.endsWith("/")) file = path.join(file, "index.html");
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
            ".png": "image/png",
          }[path.extname(file)] || "application/octet-stream",
        );
        res.end(fs.readFileSync(file));
      } catch {
        res.statusCode = 404;
        res.end();
      }
    });
    await new Promise((r) => server.listen(8127, "127.0.0.1", r));
  }
  const b = await chromium.launch({
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
  async function output(p) {
    return p.evaluate(() =>
      window.__soundOutputs.map(({ node, analyser }) => {
        const samples = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(samples);
        return {
          gain: node.gain.value,
          rms: Math.sqrt(
            samples.reduce((s, x) => s + x * x, 0) / samples.length,
          ),
        };
      }),
    );
  }
  for (const width of [390, 1366]) {
    const p = await b.newPage({
      viewport: { width, height: width === 390 ? 844 : 768 },
      isMobile: width === 390,
      hasTouch: width === 390,
    });
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("dialog", (d) => d.accept());
    await p.addInitScript(() => {
      window.__soundOutputs = [];
      const connect = AudioNode.prototype.connect;
      AudioNode.prototype.connect = function (destination, ...args) {
        if (destination instanceof AudioDestinationNode) {
          const analyser = this.context.createAnalyser();
          analyser.fftSize = 1024;
          connect.call(this, analyser);
          window.__soundOutputs.push({ node: this, analyser });
        }
        return connect.call(this, destination, ...args);
      };
    });
    await p.goto(base + "/games/ludo/");
    check(
      (await p.locator("#menu-sound").getAttribute("aria-pressed")) === "true",
      `default sound on ${width}`,
    );
    await p.locator("#menu-sound svg").click();
    check(
      (await p.locator("#menu-sound").getAttribute("aria-label")) ===
        "Unmute sound",
      `menu tap mutes ${width}`,
    );
    check(
      await p.locator("#menu-sound .sound-mute-mark").isVisible(),
      `muted speaker slash visible ${width}`,
    );
    await p.click("#setup-settings");
    check(
      !(await p.locator("#settings-sound").isChecked()),
      `settings synced muted ${width}`,
    );
    await p.locator("#settings-sound").check();
    await p.click("#close-settings");
    check(
      (await p.locator("#menu-sound").getAttribute("aria-pressed")) === "true",
      `settings unmutes menu ${width}`,
    );
    await p.click('#mode-buttons [data-value="friend"]');
    await p.click("#start-game");
    await p.waitForURL((u) => u.searchParams.get("screen") === "board");
    check(
      (await p.locator("#sound-toggle").getAttribute("aria-label")) ===
        "Mute sound",
      `board keeps sound on ${width}`,
    );
    await p.locator(".player-dice.active .die-face").click();
    await p.waitForFunction(() =>
      window.__soundOutputs.some(({ analyser }) => {
        const a = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(a);
        return a.some((x) => Math.abs(x) > 0.00001);
      }),
    );
    check(
      (await output(p)).some((o) => o.rms > 0.00001),
      `real dice waveform audible before mute ${width}`,
    );
    check(
      (await output(p)).length === 1,
      `all audio routed through one master output ${width}`,
    );
    await p.locator("#sound-toggle svg").click();
    await p.waitForTimeout(80);
    check(
      (await output(p)).every((o) => o.gain === 0 && o.rms < 0.000001),
      `mute immediately silences running audio ${width}`,
    );
    await p.waitForTimeout(850);
    check(
      (await output(p)).every((o) => o.rms < 0.000001),
      `queued dice sounds stay silent ${width}`,
    );
    check(
      await p.locator("#sound-toggle .sound-mute-mark").isVisible(),
      `board mute indicator ${width}`,
    );
    await p.reload();
    check(
      (await p.locator("#sound-toggle").getAttribute("aria-pressed")) ===
        "false",
      `mute persists after reload ${width}`,
    );
    await p.locator(".player-dice.active .die-face").click();
    await p.waitForTimeout(100);
    check(
      (await output(p)).length === 0,
      `muted game creates no sound sources ${width}`,
    );
    await p.locator("#sound-toggle").press("Space");
    await p.waitForFunction(() =>
      window.__soundOutputs.some(({ analyser }) => {
        const a = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(a);
        return a.some((x) => Math.abs(x) > 0.00001);
      }),
    );
    check(
      (await output(p)).some((o) => o.gain === 1 && o.rms > 0.00001),
      `second click restores real audio ${width}`,
    );
    check(
      (await p.locator("#sound-toggle").getAttribute("aria-label")) ===
        "Mute sound",
      `unmuted label ${width}`,
    );
    check(
      !(await p.locator("#sound-toggle .sound-mute-mark").isVisible()),
      `unmuted speaker indicator ${width}`,
    );
    await p.locator("#sound-toggle").click();
    await p.click("#back-to-setup");
    await p.waitForURL((u) => !u.searchParams.has("screen"));
    check(
      (await p.locator("#menu-sound").getAttribute("aria-label")) ===
        "Unmute sound",
      `return to menu preserves mute ${width}`,
    );
    await p.close();
  }
  check(errors.length === 0, `no script errors: ${errors.join("; ")}`);
  console.log(JSON.stringify({ passed, failed: 0 }));
  await b.close();
  server?.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
