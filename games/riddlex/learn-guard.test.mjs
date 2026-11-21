import assert from "node:assert/strict";
import test from "node:test";
import { mergeAnswerLists, reviewSubmission } from "./learn-guard.js";
import { saveMergedEntry, saveNewEntry } from "./learn.js";

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

test("a confirmed write falls back to pending when the live rules refuse it", async () => {
  const writes = [];
  const denied = Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });
  const status = await saveNewEntry(async (data) => {
    writes.push(data.status);
    if (data.status === "confirmed") throw denied;
  }, { slug: "ada", nameEn: "Ada" });
  assert.deepEqual(writes, ["confirmed", "pending"]);
  assert.equal(status, "pending");
  const updates = [];
  const saved = await saveMergedEntry(async (data) => {
    updates.push(Object.keys(data).sort().join(","));
    if (data.answers) throw denied;
  }, { answers: [{ q: "real", a: "yes" }], confirmations: 2 }, { confirmations: 2 });
  assert.equal(saved, "legacy");
  assert.equal(updates[1].includes("answers"), false);
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
