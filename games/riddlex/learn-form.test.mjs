import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");

test("the learn form keeps its name field when the language changes", () => {
  assert.match(html, /id="learn-name"/);
  assert.match(html, /id="learn-name-text"/);
  assert.match(html, /id="learn-photo"/);
  assert.doesNotMatch(app, /learn-name-label"\)\.textContent/);
  assert.doesNotMatch(app, /learn-photo-label"\)\.textContent/);
  assert.match(app, /learn-name-text"\)\.textContent/);
});

test("a failed or empty teach shows a message and does not hide the form", () => {
  assert.match(app, /needName/);
  assert.match(app, /showLearnMessage\(text\(\)\.failedSave\)/);
  assert.doesNotMatch(app, /learnForm\.hidden = true/);
});
