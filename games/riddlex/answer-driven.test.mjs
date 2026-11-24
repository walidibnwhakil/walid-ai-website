import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  MAX_QUESTIONS_PER_ROUND, answer, createState, decide,
  questionBlocked, recompute, factBit
} from "./engine.js";
import { poolFromEntries } from "./kb.js";
import { BROAD_PEOPLE, BROAD_QUESTIONS } from "./broad-facts.js";
import { EVERYDAY_QUESTIONS, EVERYDAY_OBJECTS } from "./everyday-facts.js";

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

test("four movie titles are the absolute maximum, whatever the answers", () => {
  const state = startActor();
  answer(state, "film_mitin_mashi", "yes");
  answer(state, "named", "yes");
  answer(state, "film_crook", "no");
  answer(state, "male", "yes");
  answer(state, "film_welcome", "unknown");
  answer(state, "alive", "yes");
  answer(state, "film_padmaavat_actor", "no");
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

test("source-backed creator clues separate challenge videos from education", () => {
  const creators = poolFromEntries(questions, [
    { id: "Q57618112", en: "MrBeast", pop: 50,
      yes: ["real", "male", "alive", "from_us", "youtube", "business"] },
    { id: "Q630446", en: "John Green", pop: 50,
      yes: ["real", "male", "alive", "from_us", "youtube", "business"] },
  ]);
  const quiz = creators.qIndex.get("creator_large_scale_giveaways");
  assert.ok(quiz != null);
  assert.equal(factBit(creators, 0, quiz), 2);
  assert.equal(factBit(creators, 1, quiz), 1);
});

test("unrelated No/Unknown object families leave the correct family reachable", () => {
  const objects = poolFromEntries([...base, ...EVERYDAY_QUESTIONS], EVERYDAY_OBJECTS);
  const state = createState(objects, {category:"object"});
  for (const id of ["obj_family_electric","obj_family_worn","obj_family_personal_care"])
    answer(state, id, "no");
  // Those three No answers are real evidence against three families,
  // not a reason to disable paper, doors, locks, containers or medicine.
  assert.equal(questionBlocked(state, "obj_family_kitchen"), false);
  assert.equal(questionBlocked(state, "obj_family_paper"), false);
  assert.equal(questionBlocked(state, "obj_family_house"), false);
  assert.equal(questionBlocked(state, "obj_family_lock"), false);
});
