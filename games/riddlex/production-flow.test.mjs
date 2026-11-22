import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { answer, chooseQuestion, createState, decide, recompute, rejectIndex, shouldGuess } from "./engine.js";
import { appendShard, decodeShard, planShardLoads, poolFromEntries } from "./kb.js";
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
test("temporary thin casebook does not call consistent real-person clues a category mismatch", () => {
  const sparse = poolFromEntries(questions, [
    { id: "sparse-bangladeshi", en: "Sparse Person", pop: 1,
      yes: ["real", "from_bd"], no: ["politician"] },
  ]);
  const state = createState(sparse, { category: "character" });
  recompute(state);
  for (const [qid, value] of [
    ["real", "yes"], ["knows_you", "no"],
    ["politician", "no"], ["from_bd", "yes"],
  ]) answer(state, qid, value);
  const first = decide(state);
  assert.equal(first.type, "ask", JSON.stringify(first));
  assert.ok(["male", "alive", "actor", "writer"].includes(first.qid),
    "ask about a meaningful unconfirmed identity fact");
  answer(state, first.qid, "yes");
  const second = decide(state);
  assert.equal(second.type, "ask", JSON.stringify(second));
  assert.notEqual(second.qid, first.qid);
  assert.notEqual(second.type, "reconsider");
});

test("a famous real person is not guessed at question four, even with a one-person lead", () => {
  const lone = poolFromEntries(questions, [
    { id: "Q7322180", en: "Riaz", pop: 1000,
      yes: ["real", "male", "alive", "from_bd", "actor"],
      no: ["politician", "knows_you", "cricketer"] },
  ]);
  const state = createState(lone, { category: "character" });
  recompute(state);
  for (const [qid, value] of [
    ["real", "yes"], ["knows_you", "no"],
    ["politician", "no"], ["from_bd", "yes"],
  ]) answer(state, qid, value);
  assert.equal(shouldGuess(state), false, "a clear front-runner is not identity proof");
  const first = decide(state);
  assert.equal(first.type, "ask", JSON.stringify(first));
  assert.ok(!state.answers.some((a) => a.qid === first.qid));
});

test("wrong guesses preserve prior facts and do not immediately guess again", () => {
  const crowd = poolFromEntries(questions, [
    { id: "Q7322180", en: "Riaz", pop: 250,
      yes: ["real", "male", "alive", "from_bd", "actor"],
      no: ["politician", "knows_you", "cricketer"] },
    { id: "Q21066842", en: "Amin Khan", pop: 220,
      yes: ["real", "male", "alive", "from_bd", "actor"],
      no: ["politician", "knows_you", "cricketer", "writer"] },
    { id: "fictional-test-actor", en: "Second multi-career actor", pop: 180,
      yes: ["real", "male", "alive", "from_bd", "actor", "writer"],
      no: ["politician", "knows_you", "cricketer", "singer", "scientist"] },
  ]);
  const state = createState(crowd, { category: "character" });
  recompute(state);
  const previouslyAnswered = [
    ["real", "yes"], ["knows_you", "no"], ["politician", "no"],
    ["from_bd", "yes"], ["male", "yes"], ["alive", "yes"],
    ["actor", "yes"], ["cricketer", "no"],
    ["singer", "no"], ["scientist", "no"],
    ["screen_star_1990s", "yes"],
  ];
  for (const [qid, val] of previouslyAnswered) answer(state, qid, val);
  rejectIndex(state, 0);
  assert.deepEqual(state.answers.map((x) => [x.qid, x.value]), previouslyAnswered);
  assert.equal(state.sinceGuess, 0);
  const move = decide(state);
  assert.equal(move.type, "ask", JSON.stringify(move));
  assert.ok(!previouslyAnswered.some(([qid]) => qid === move.qid),
    "the user should not be asked to repeat a previously recorded answer");
});

test("candidate-specific confirmation is a prompt, never a hard requirement for everybody", () => {
  const crowd = poolFromEntries(questions, [
    { id: "Q7322180", en: "Riaz", pop: 60000,
      yes: ["real", "male", "alive", "from_bd", "actor"],
      no: ["knows_you", "politician"] },
    { id: "Q21066842", en: "Amin Khan", pop: 10,
      yes: ["real", "male", "alive", "from_bd", "actor"],
      no: ["knows_you", "politician"] },
  ]);
  const state = createState(crowd, { category: "character" });
  recompute(state);
  for (const [qid, val] of [
    ["real", "yes"], ["knows_you", "no"], ["male", "yes"], ["alive", "yes"],
    ["from_bd", "yes"], ["actor", "yes"], ["politician", "no"],
    ["cricketer", "no"], ["singer", "no"], ["scientist", "no"],
    ["screen_star_1990s", "yes"], ["musician", "no"],
  ]) answer(state, qid, val);
  assert.equal(state.answers.length, 12);
  assert.equal(shouldGuess(state), true);
  const verified = [];
  let move;
  for (let attempt = 0; attempt < 10; attempt++) {
    move = decide(state);
    if (move.type === "guess") break;
    assert.equal(move.type, "ask", JSON.stringify(move));
    assert.ok(move.qid.startsWith("actor_"), "confirm this actor's documented work: " + move.qid);
    assert.ok(!verified.includes(move.qid), "do not repeat a confirmation");
    verified.push(move.qid);
    answer(state, move.qid, "yes");
  }
  assert.ok(verified.length >= 3, "verification must not be capped at two questions");
  assert.equal(move?.type, "guess", JSON.stringify(move));
  assert.equal(crowd.ids[move.index], "Q7322180");
});

test("published casebook never guesses before twelve answers", () => {
  const state = createState(readShard(catalog.top), { category: "character" });
  recompute(state);
  const replies = [
    ["real", "yes"], ["knows_you", "no"],
    ["politician", "no"], ["from_bd", "yes"],
    ["male", "yes"], ["alive", "yes"],
    ["actor", "yes"], ["cricketer", "no"],
    ["footballer", "no"], ["singer", "no"],
    ["scientist", "no"],
  ];
  for (const [qid, val] of replies) {
    answer(state, qid, val);
    const move = decide(state);
    assert.notEqual(move.type, "guess",
      "question " + state.answers.length + " was too early: " + JSON.stringify(move));
    assert.equal(move.type, "ask",
      "actual 19k-entry casebook should continue: " + JSON.stringify(move));
  }
});

test("any candidate can be verified through its distinguishable career facts", () => {
  const crowd = poolFromEntries(questions, [
    { id: "generic-football-star", en: "Generic Football Star", pop: 60000,
      yes: ["real", "male", "alive", "footballer", "athlete", "from_ar",
        "played_barcelona", "ballon_dor"],
      no: ["politician", "knows_you", "cricketer", "actor"] },
    { id: "generic-other-footballer", en: "Generic Other Footballer", pop: 15,
      yes: ["real", "male", "alive", "footballer", "athlete", "from_ar"],
      no: ["played_barcelona", "ballon_dor", "politician", "knows_you"] },
  ]);
  const state = createState(crowd, { category: "character" });
  recompute(state);
  for (const [qid, value] of [
    ["real", "yes"], ["knows_you", "no"], ["male", "yes"],
    ["alive", "yes"], ["from_ar", "yes"], ["footballer", "yes"],
    ["athlete", "yes"], ["politician", "no"], ["actor", "no"],
    ["cricketer", "no"], ["singer", "no"], ["scientist", "no"],
  ]) answer(state, qid, value);
  assert.equal(state.answers.length, 12);
  assert.equal(shouldGuess(state), true);
  const confirmed = [];
  for (let i = 0; i < 5; i++) {
    const move = decide(state);
    if (move.type === "guess") {
      assert.ok(confirmed.length >= 1, "candidate work must be checked before naming them");
      assert.equal(crowd.ids[move.index], "generic-football-star");
      return;
    }
    assert.equal(move.type, "ask", JSON.stringify(move));
    assert.ok(["played_barcelona", "ballon_dor"].includes(move.qid),
      "only relevant career evidence, not arbitrary trivia: " + move.qid);
    confirmed.push(move.qid);
    answer(state, move.qid, "yes");
  }
  assert.fail("game did not reach a justified guess after work verification");
});

test("a denied sourced film switches the detective to a different candidate", () => {
  const crowd = poolFromEntries(questions, [
    { id: "Q7322180", en: "Riaz", pop: 60000,
      yes: ["real", "male", "alive", "from_bd", "actor"],
      no: ["politician", "knows_you"] },
    { id: "Q21066842", en: "Amin Khan", pop: 200,
      yes: ["real", "male", "alive", "from_bd", "actor"],
      no: ["politician", "knows_you"] },
  ]);
  const state = createState(crowd, { category: "character" });
  recompute(state);
  for (const [qid, value] of [
    ["real", "yes"], ["knows_you", "no"], ["male", "yes"],
    ["alive", "yes"], ["from_bd", "yes"], ["actor", "yes"],
    ["politician", "no"], ["cricketer", "no"],
    ["singer", "no"], ["scientist", "no"],
    ["screen_star_1990s", "yes"], ["musician", "no"],
  ]) answer(state, qid, value);
  assert.equal(decide(state).qid, "actor_film_dui_duari");
  answer(state, "actor_film_dui_duari", "no");
  const next = decide(state);
  assert.equal(next.type, "ask", JSON.stringify(next));
  assert.equal(next.qid, "actor_walton_senior_exec",
    "a disproved hypothesis must switch to the other person's evidence");
});

test("temporarily empty progressively loaded casebook never gives up at four", () => {
  const partial = poolFromEntries(questions, Array.from({ length: 101 }, (_, i) => ({
    id: "not-yet-loaded-person-" + i, en: "Temporary animal " + i,
    pop: 1, yes: ["animal"], no: ["real", "fictional"],
  })));
  const state = createState(partial, { category: "character" });
  recompute(state);
  for (const [qid, value] of [
    ["real", "yes"], ["knows_you", "no"],
    ["politician", "no"], ["from_bd", "yes"],
  ]) answer(state, qid, value);
  assert.equal(state.alive.length, 0, "no character has arrived in the partial casebook yet");
  const move = decide(state);
  assert.equal(move.type, "ask", JSON.stringify(move));
  assert.equal(move.qid, "male",
    "continue with a simple new identity fact until country shards load");
});
