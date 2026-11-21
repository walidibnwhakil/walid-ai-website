import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { decodeShard } from "./kb.js";
import {
  answer, chooseQuestion, createState, decide, factBit, questionContradicts, rejectIndex, rewind, recompute,
} from "./engine.js";

const manifest = JSON.parse(readFileSync(new URL("./kb/manifest.json", import.meta.url), "utf8"));
const buf = readFileSync(new URL("./kb/ix/top.bin", import.meta.url));
const pool = decodeShard(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), manifest.questions);
const groupOf = new Map(manifest.questions.map((question) => [question.id, question.group]));

function fresh() {
  const state = createState(pool, { category: "character", opening: "real" });
  recompute(state);
  return state;
}

function play(state, replies, steps = 16) {
  const asked = [];
  for (let n = 0; n < steps; n++) {
    const decision = decide(state);
    if (decision.type !== "ask") break;
    assert.equal(questionContradicts(state, decision.qid), false, decision.qid);
    const value = replies(decision.qid, asked);
    asked.push(decision.qid);
    answer(state, decision.qid, value);
  }
  return asked;
}

test("no to politician closes every politics question", () => {
  const state = fresh();
  const asked = play(state, (qid) => {
    if (qid === "politician") return "no";
    if (qid === "real" || qid === "male" || qid === "alive" || qid === "from_bd") return "yes";
    if (qid === "athlete") return "no";
    return "unknown";
  }, 20);
  assert.ok(asked.includes("politician"), asked.join(","));
  const after = asked.slice(asked.indexOf("politician") + 1);
  const politics = after.filter((qid) => groupOf.get(qid) === "politics");
  assert.deepEqual(politics, [], asked.join(","));
});

test("probably not to a sport closes cricket and football", () => {
  const state = fresh();
  const asked = play(state, (qid) => {
    if (qid === "athlete") return "probably_not";
    if (qid === "real" || qid === "male") return "yes";
    return "unknown";
  }, 18);
  assert.ok(asked.includes("athlete"));
  const after = asked.slice(asked.indexOf("athlete") + 1);
  for (const qid of after) {
    assert.ok(!["cricketer", "footballer", "all_rounder", "batsman", "bowler", "striker", "goalkeeper"].includes(qid), qid);
  }
});

test("no to fiction, life, and gender closes those branches", () => {
  const state = fresh();
  answer(state, "real", "no");
  answer(state, "fictional", "no");
  answer(state, "male", "yes");
  answer(state, "alive", "no");
  const asked = play(state, () => "unknown", 12);
  for (const qid of asked) {
    assert.notEqual(groupOf.get(qid), "fiction", qid);
    assert.ok(qid !== "female" && qid !== "alive", qid);
  }
});

test("a yes to party chief makes the politician question unnecessary", () => {
  const state = fresh();
  answer(state, "politician", "yes");
  answer(state, "party_chief", "yes");
  rewind(state);
  rewind(state);
  answer(state, "party_chief", "yes");
  assert.equal(questionContradicts(state, "party_al"), false);
  const asked = play(state, (qid) => (qid === "from_bd" || qid === "real" ? "yes" : "unknown"), 8);
  assert.ok(!asked.includes("politician"), asked.join(","));
});

test("undo and try again keep a closed politics branch closed", () => {
  const state = fresh();
  for (const [qid, value] of [["real", "yes"], ["male", "yes"], ["alive", "yes"], ["from_bd", "yes"], ["politician", "yes"]]) {
    answer(state, qid, value);
  }
  rewind(state);
  answer(state, "politician", "no");
  const asked = play(state, () => "unknown", 10);
  assert.ok(asked.every((qid) => groupOf.get(qid) !== "politics"), asked.join(","));
  rejectIndex(state, 0);
  const again = chooseQuestion(state);
  assert.ok(!again || groupOf.get(again) !== "politics", again);
});

test("honest games never ask a question that contradicts an earlier answer", () => {
  const step = Math.max(1, Math.floor(pool.count / 80));
  const failures = [];
  let played = 0;
  for (let index = 0; index < pool.count; index += step) {
    const state = fresh();
    const asked = [];
    for (let n = 0; n < 16; n++) {
      const decision = decide(state);
      if (decision.type !== "ask") break;
      if (questionContradicts(state, decision.qid)) failures.push(`${pool.ids[index]} ${decision.qid} after ${asked.join(",")}`);
      const bit = factBit(pool, index, pool.qIndex.get(decision.qid));
      asked.push(decision.qid);
      answer(state, decision.qid, bit === 2 ? "yes" : bit === 1 ? "no" : "unknown");
    }
    played += 1;
  }
  assert.deepEqual(failures, []);
  assert.ok(played >= 80, played);
  console.log(`prerequisite scan ${played} of ${pool.count} characters, contradictions ${failures.length}`);
});
