import assert from "node:assert/strict";
import { chromium } from "playwright";

// Visit the actual published website, not the repository's local test server.
const origin = "https://walid-ai.com";
const slugs = [
  "merge-pdf", "split-pdf", "compress-pdf", "pdf-to-word",
  "edit-pdf", "organize-pdf", "page-numbers", "watermark-pdf",
  "sign-pdf", "protect-pdf", "bengali-ocr"
];
const paths = ["/pdf/", ...slugs.map(slug => "/pdf/" + slug + "/")];
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  for (const path of paths) {
    let lastError;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await page.goto(origin + path, { waitUntil: "domcontentloaded", timeout: 30000 });
        assert.equal(response?.status(), 200, origin + path + " did not return HTTP 200");
        const heading = (await page.locator("h1").first().textContent() || "").trim();
        assert.ok(heading, origin + path + " has no visible heading");
        if (path === "/pdf/") {
          assert.equal(await page.locator(".grid a.tool").count(), 11, "Live PDF index must show exactly 11 tools");
        } else {
          assert.ok(await page.locator("section.panel").count(), path + " has no tool instructions");
        }
        const visibleText = await page.locator("body").innerText();
        assert.ok(!/\\b(?:FIXME|TODO|debug mode|stack trace|TypeError|ReferenceError|npm install|git clone)\\b/i.test(visibleText),
          path + " appears to expose development text");
        results.push({ path, status: response.status(), heading });
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (attempt === 0) await page.waitForTimeout(1500);
      }
    }
    if (lastError) throw new Error("LIVE PDF SMOKE FAILED at " + origin + path + ": " + lastError.message);
  }
  console.log("LIVE_PDF_SMOKE_PASS " + JSON.stringify({ origin, pages: results.length, results }));
} finally {
  await browser.close();
}
