import assert from "node:assert/strict";
import test from "node:test";
import { mergeAnswerLists, reviewSubmission } from "./learn-guard.js";

const answers = [{ qid: "real", value: "yes" }, { qid: "male", value: "yes" }];

test("a normal name is accepted and a rude or junk name is rejected", () => {
  assert.equal(reviewSubmission("Mirza Fakhrul Islam Alamgir", answers).ok, true);
  assert.equal(reviewSubmission("মুহাম্মদ ইউনূস", answers).ok, true);
  assert.equal(reviewSubmission("Sheikh Hasina", answers).ok, true);
  for (const name of ["fuck", "Khanki Begum", "asdfasdf", "aaaa", "http://spam.test", "qwertyuiop", "xxx", "বোকাচোদা"]) {
    assert.equal(reviewSubmission(name, answers).ok, false, name);
  }
  assert.equal(reviewSubmission("ok", [{ qid: "not a question", value: "yes" }]).ok, false);
  assert.equal(reviewSubmission("A", answers).ok, false);
});

test("merging answers keeps the first firm reply and adds new ones", () => {
  const merged = mergeAnswerLists(
    [{ q: "politician", a: "yes" }, { q: "actor", a: "unknown" }],
    [{ q: "actor", a: "no" }, { q: "party_bnp", a: "yes" }, { q: "politician", a: "no" }],
  );
  const map = Object.fromEntries(merged.map((item) => [item.q, item.a]));
  assert.equal(map.politician, "yes");
  assert.equal(map.actor, "no");
  assert.equal(map.party_bnp, "yes");
});
