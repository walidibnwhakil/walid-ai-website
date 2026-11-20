import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../scripts/quran-pronunciation-verify.mjs", import.meta.url), "utf8");
test("workflow keeps machine drafts distinct from reviewed records", () => {
  assert.match(source, /humanReviewRequired: true/);
  assert.match(source, /tajwidCertified: false/);
  assert.match(source, /status = verse\.pronunciationStatus/);
});
test("workflow flags Arabic markers without certifying pronunciation", () => {
  assert.match(source, /shaddah/);
  assert.match(source, /vowel-signs/);
  assert.match(source, /madd/);
  assert.match(source, /waqf/);
  assert.match(source, /possible-token-loss/);
});
