import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { answer, chooseQuestion, createState, decide, recompute } from "./engine.js";
import { appendShard, decodeShard, planShardLoads } from "./kb.js";
import { EXTRA_SCREEN_QUESTIONS } from "./career-facts.js";
import { PERSONAL_QUESTIONS } from "./personal-facts.js";
import { ACTOR_PROOF_QUESTIONS } from "./actor-proof.js";
import { WRITER_PROOF_QUESTIONS } from "./writer-proof.js";

const manifest = JSON.parse(readFileSync(new URL("./kb/manifest.json", import.meta.url), "utf8"));
const catalog = JSON.parse(readFileSync(new URL("./kb/index.json", import.meta.url), "utf8"));
const questions = manifest.questions.slice();
for (const question of [...EXTRA_SCREEN_QUESTIONS, ...PERSONAL_QUESTIONS, ...ACTOR_PROOF_QUESTIONS, ...WRITER_PROOF_QUESTIONS]) {
  if (!questions.some((row) => row.id === question.id)) questions.push(question);
}

function readShard(file) {
  const buf = readFileSync(new URL("./kb/" + file, import.meta.url));
  return decodeShard(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), questions);
}

test("actual 19,432-person top shard continues after real=yes, knows=no, politics=no, Bangladesh=yes", () => {
  const pool = readShard(catalog.top);
  const state = createState(pool, { category: "character", opening: "real" });
  recompute(state);
  const clues = [
    ["real", "yes"], ["knows_you", "no"],
    ["politician", "no"], ["from_bd", "yes"],
  ];
  for (const [qid, value] of clues) {
    answer(state, qid, value);
    const result = decide(state);
    console.log("ACTUAL_SHARD_STEP", JSON.stringify({
      qid, value, answers: state.answers.length,
      candidates: state.alive.length, next: result, question: chooseQuestion(state),
    }));
    assert.equal(result.type, "ask", "must keep asking after " + qid + ": " + JSON.stringify(result));
  }
});

test("Bangladesh long-tail shards keep the same truthful game playable", () => {
  let pool = readShard(catalog.top);
  const state = createState(pool, { category: "character", opening: "real" });
  recompute(state);
  for (const [qid, value] of [
    ["real","yes"], ["knows_you","no"], ["politician","no"], ["from_bd","yes"],
  ]) answer(state, qid, value);
  const planned = planShardLoads(catalog, state.answers, [catalog.top]);
  const bangladesh = planned.filter((file) => file.file.includes("r-bd-"));
  assert.ok(bangladesh.length > 0, "confirmed Bangladesh must plan matching country shards");
  for (const file of bangladesh) pool = appendShard(pool, readShard(file.file));
  state.pool = pool;
  state.weights = new Float64Array(pool.count);
  recompute(state);
  const result = decide(state);
  console.log("COUNTRY_SHARDS_STEP", JSON.stringify({
    from: catalog.topCount, shards: bangladesh.length,
    candidates: state.alive.length, count: pool.count,
    decision: result, question: chooseQuestion(state),
  }));
  assert.equal(result.type, "ask", "loaded Bangladeshi casebook must continue without false contradiction");
});