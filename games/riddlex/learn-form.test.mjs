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
  const failure = app.slice(app.indexOf("showLearnMessage(text().failedSave)"));
  assert.doesNotMatch(failure, /learnForm\.hidden = true/);
});

test("phone category buttons stack under the question bubble", () => {
  const css = readFileSync(new URL("./style.css", import.meta.url), "utf8");
  assert.match(css, /#categories \{\s*\/\* Sit under the speech bubble/);
  assert.match(css, /var\(--chin-y/);
  assert.doesNotMatch(css, /#categories \{\s*top: auto; bottom: 8px;/);
  assert.match(html, /id="load-retry"/);
  assert.match(app, /failedLoad/);
  assert.match(app, /akinator-32/);
});

test("a saved name ends on a short thank-you in both languages", () => {
  const i18n = readFileSync(new URL("./i18n.js", import.meta.url), "utf8");
  assert.match(app, /learnForm\.hidden = true/);
  assert.match(i18n, /saved: "Thank you\."/);
  assert.match(i18n, /saved: "ধন্যবাদ।"/);
  assert.doesNotMatch(i18n, /approv|review|pending|মালিক|অনুমোদন/i);
});
