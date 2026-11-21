import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {chromium} from "playwright";

const root = new URL("../", import.meta.url);
const contentTypes = {".html": "text/html", ".css": "text/css", ".mjs": "text/javascript", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml"};
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  if (pathname.includes("..")) { response.writeHead(404).end(); return; }
  const path = pathname.endsWith("/") ? pathname + "index.html" : pathname;
  try {
    const bytes = await readFile(new URL(path.slice(1), root));
    const ext = path.match(/\.[^.]+$/)?.[0];
    response.writeHead(200, {"content-type": contentTypes[ext] || "application/octet-stream"});
    response.end(bytes);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

server.listen(0, "127.0.0.1");
await once(server, "listening");
const origin = "http://127.0.0.1:" + server.address().port;
const widths = [320, 360, 375, 390, 430, 600, 768, 1024, 1280];
let browser;
try {
  browser = await chromium.launch({headless: true});
  for (const width of widths) {
    const page = await browser.newPage({viewport: {width, height: 840}, deviceScaleFactor: 1});
    await page.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const response = await page.goto(origin + "/games/", {waitUntil: "load"});
    assert.equal(response.status(), 200, "Games index should load");
    const layout = await page.evaluate(() => {
      const grid = document.querySelector(".games");
      const links = [...grid.querySelectorAll("li > a")];
      const bounds = node => {
        const rect = node.getBoundingClientRect();
        return {x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom};
      };
      return {
        scrollWidth: document.documentElement.scrollWidth,
        columns: getComputedStyle(grid).gridTemplateColumns.split(/\s+/).length,
        links: links.map(link => ({
          bounds: bounds(link),
          href: link.getAttribute("href"),
          label: link.getAttribute("aria-label"),
          preview: bounds(link.querySelector(".preview")),
          imageSrc: link.querySelector("img")?.getAttribute("src")
        }))
      };
    });
    const expectedColumns = width <= 600 ? 2 : width < 900 ? 2 : 3;
    assert.equal(layout.columns, expectedColumns, "Unexpected column count at " + width + "px");
    assert.equal(layout.links.length, 6, "Keep all six game cards");
    assert.ok(layout.scrollWidth <= width + 2, "Horizontal page overflow at " + width + "px");
    for (const link of layout.links) {
      assert.ok(link.href?.startsWith("/games/"), "Game route must remain clickable");
      assert.ok(link.label?.startsWith("Play "), "Game link needs an accessible name");
      assert.ok(link.imageSrc, "Keep original game artwork");
      assert.ok(link.bounds.width > 100, "Game card too narrow at " + width + "px");
      assert.ok(link.bounds.x >= -2 && link.bounds.right <= width + 2, "Card beyond viewport at " + width + "px");
      assert.ok(Math.abs(link.preview.width - link.preview.height) < 2, "Square preview ratio should be preserved");
    }
    assert.ok(Math.abs(layout.links[0].bounds.y - layout.links[1].bounds.y) < 2, "First row should contain adjacent cards");
    assert.ok(layout.links[1].bounds.x > layout.links[0].bounds.x, "Cards should display side by side");
    console.log("GAMES_LAYOUT_PASS", width, "columns", layout.columns, "cards", layout.links.length);
    await page.close();
  }
} finally {
  await browser?.close();
  const closed = new Promise(resolve => server.close(resolve));
  server.closeAllConnections();
  await closed;
}
