import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  MAX_QUESTIONS_PER_ROUND, answer, createState, decide,
  questionBlocked, recompute
} from "./engine.js";
import { poolFromEntries } from "./kb.js";
import { BROAD_PEOPLE, BROAD_QUESTIONS } from "./broad-facts.js";

const base = JSON.parse(await readFile(new URL("./kb/manifest.json", import.meta.url), "utf8")).questions;
const questions = [...base, ...BROAD_QUESTIONS];
const pool = poolFromEntries(questions, BROAD_PEOPLE);

function startActor() {
  const state = createState(pool, { category: "character" });
  recompute(state);
  for (const [qid, value] of [
    ["real", "yes"], ["knows_you", "no"],
    ["from_in", "yes"], ["actor", "yes"],
  ]) answer(state, qid, value);
  return state;
}

test("the Yes and No buttons carry opposite Bayesian evidence", () => {
  const yes = createState(pool, { category: "character" });
  const no = createState(pool, { category: "character" });
  answer(yes, "actor", "yes");
  answer(no, "actor", "no");
  const star = pool.ens.indexOf("Deepika Padukone");
  assert.ok(star >= 0, "fixture includes an actor");
  assert.ok(yes.weights[star] > no.weights[star],
    "a confirmed actor must score higher after Yes than No");
});

test("one movie answer cannot automatically trigger another movie title", () => {
  const state = startActor();
  assert.equal(questionBlocked(state, "film_welcome"), false,
    "a movie question may be relevant before it has been asked");
  answer(state, "film_mitin_mashi", "unknown");
  assert.equal(questionBlocked(state, "film_welcome"), true,
    "a title question must not chain immediately after Don't know");
});

test("two title questions close the movie-trivia lane, irrespective of Yes or No", () => {
  const state = startActor();
  answer(state, "film_mitin_mashi", "yes");
  answer(state, "named", "yes");
  answer(state, "film_crook", "no");
  assert.equal(questionBlocked(state, "film_welcome"), true);
  assert.equal(questionBlocked(state, "film_padmaavat_actor"), true);
  assert.equal(questionBlocked(state, "broad_film_baahubali"), true);
});

test("a round has a finite ceiling instead of 41+ repetitive questions", () => {
  const state = createState(pool, { category: "character" });
  recompute(state);
  const ids = questions.slice(0, MAX_QUESTIONS_PER_ROUND).map(q => q.id);
  for (const id of ids) answer(state, id, "unknown");
  assert.equal(decide(state).type, "defeat",
    "without corroborating evidence the game must admit it cannot identify");
});

test("even an all-Yes actor run terminates within the round ceiling", () => {
  const state = createState(pool, { category: "character" });
  recompute(state);
  let finished = false;
  for (let step = 0; step <= MAX_QUESTIONS_PER_ROUND; step++) {
    const next = decide(state);
    if (next.type !== "ask") { finished = true; break; }
    answer(state, next.qid,
      ["knows_you", "from_bd", "female"].includes(next.qid) ? "no" : "yes");
  }
  assert.ok(finished);
  assert.ok(state.answers.length <= MAX_QUESTIONS_PER_ROUND);
});
