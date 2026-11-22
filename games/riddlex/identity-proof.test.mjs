import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  answer, chooseQuestion, createState, decide, enoughIdentityEvidence,
  factBit, guessMatchesAnswers, recompute, rejectIndex,
} from "./engine.js";
import { poolFromEntries } from "./kb.js";
import { ACTOR_PROOF_QUESTIONS } from "./actor-proof.js";
import { WRITER_PROOF_QUESTIONS } from "./writer-proof.js";
import { PERSONAL_QUESTIONS } from "./personal-facts.js";
import { EXTRA_SCREEN_QUESTIONS } from "./career-facts.js";

const manifest = JSON.parse(readFileSync(new URL("./kb/manifest.json", import.meta.url), "utf8"));
const questions = [
  ...manifest.questions, ...EXTRA_SCREEN_QUESTIONS,
  ...ACTOR_PROOF_QUESTIONS, ...WRITER_PROOF_QUESTIONS,
];
function makePool() {
  return poolFromEntries(questions, [
    { id: "Q7322180", en: "Riaz", pop: 360,
      yes: ["real", "male", "alive", "from_bd", "actor"],
      no: ["knows_you", "from_us", "cricketer", "politician", "writer"] },
    { id: "Q21066842", en: "Amin Khan", pop: 220,
      yes: ["real", "male", "alive", "from_bd", "actor"],
      no: ["knows_you", "from_us", "cricketer", "politician", "writer"] },
    { id: "Q12052777", en: "Humayun Ahmed", pop: 320,
      yes: ["real", "male", "dead", "from_bd", "writer"],
      no: ["knows_you", "from_us", "actor", "cricketer", "politician"] },
    { id: "Q285203", en: "Muhammed Zafar Iqbal", pop: 190,
      yes: ["real", "male", "alive", "from_bd", "writer"],
      no: ["knows_you", "from_us", "actor", "cricketer", "politician"] },
    { id: "other-actor", en: "Famous United States actor", pop: 65000,
      yes: ["real", "male", "alive", "from_us", "actor"],
      no: ["knows_you", "from_bd", "cricketer", "writer", "politician"] },
  ]);
}
function session(pool, job = "actor", life = "alive") {
  const state = createState(pool, { category: "character" });
  recompute(state);
  for (const [qid, value] of [
    ["real", "yes"], ["knows_you", "no"], ["male", "yes"],
    [life, "yes"], ["from_bd", "yes"], [job, "yes"],
  ]) answer(state, qid, value);
  return state;
}

test("Bangladeshi acting and nationality never suffice to name any actor", () => {
  const pool = makePool();
  const state = session(pool);
  assert.equal(state.answers.length, 6);
  for (let i = 0; i < pool.count; i++) {
    assert.equal(enoughIdentityEvidence(state, i), false);
  }
  assert.equal(guessMatchesAnswers(state, 4), false, "a US performer cannot become Bangladeshi");
  assert.equal(decide(state).type, "ask");
  assert.equal(chooseQuestion(state), "screen_star_1990s",
    "ask a relevant cinema-career question before guessing a name");
});

test("Riaz is verified through real films and air-force career, not popularity", () => {
  const pool = makePool();
  const state = session(pool);
  answer(state, "screen_star_1990s", "yes");
  assert.equal(chooseQuestion(state), "actor_film_dui_duari");
  answer(state, "actor_film_dui_duari", "yes");
  assert.equal(enoughIdentityEvidence(state, 0), false);
  assert.equal(chooseQuestion(state), "actor_film_daruchini_dwip");
  answer(state, "actor_film_daruchini_dwip", "yes");
  assert.equal(enoughIdentityEvidence(state, 0), false, "two proofs with only nine questions are too early");
  assert.equal(chooseQuestion(state), "actor_air_force");
  answer(state, "actor_air_force", "yes");
  assert.equal(state.answers.length, 10);
  assert.equal(enoughIdentityEvidence(state, 0), true);
  const decision = decide(state);
  assert.equal(decision.type, "guess");
  assert.equal(pool.ids[decision.index], "Q7322180");
});

test("Amin Khan needs independent Walton and film career evidence", () => {
  const pool = makePool();
  const state = session(pool);
  answer(state, "screen_star_1990s", "yes");
  // Riaz's Dui Duari question is plausible for a male 1990s film actor.
  answer(state, "actor_film_dui_duari", "no");
  assert.equal(chooseQuestion(state), "actor_walton_senior_exec",
    "one denied Riaz film should switch to evidence about another candidate");
  answer(state, "actor_walton_senior_exec", "yes");
  assert.equal(enoughIdentityEvidence(state, 1), false);
  answer(state, "actor_film_obujh_duti_mon", "yes");
  assert.equal(enoughIdentityEvidence(state, 1), false, "an occupation and one brand detail do not prove identity");
  answer(state, "actor_walton_ad", "yes");
  assert.equal(enoughIdentityEvidence(state, 1), true);
  const decision = decide(state);
  assert.equal(decision.type, "guess");
  assert.equal(pool.ids[decision.index], "Q21066842");
  rejectIndex(state, decision.index);
  assert.equal(state.answers.find((row) => row.qid === "from_bd")?.value, "yes");
  assert.equal(enoughIdentityEvidence(state, 4), false);
});

test("a Bangladeshi writer is questioned about individual books and characters", () => {
  const pool = makePool();
  const state = session(pool, "writer", "dead");
  assert.equal(decide(state).type, "ask");
  assert.equal(chooseQuestion(state), "writer_himu");
  answer(state, "writer_himu", "yes");
  assert.equal(chooseQuestion(state), "writer_misir_ali");
  answer(state, "writer_misir_ali", "yes");
  assert.equal(enoughIdentityEvidence(state, 2), false, "two facts at eight questions do not justify a name");
  assert.equal(chooseQuestion(state), "writer_nondito_noroke");
  answer(state, "writer_nondito_noroke", "yes");
  assert.equal(chooseQuestion(state), "writer_shonkhonil_karagar");
  answer(state, "writer_shonkhonil_karagar", "yes");
  assert.equal(enoughIdentityEvidence(state, 2), true);
  const decision = decide(state);
  assert.equal(decision.type, "guess");
  assert.equal(pool.ids[decision.index], "Q12052777");
});

test("specific unanswered work records remain unknown; never invent a negative", () => {
  const pool = makePool();
  const riazd = pool.ids.indexOf("Q7322180");
  const amind = pool.ids.indexOf("Q21066842");
  assert.equal(factBit(pool, riazd, pool.qIndex.get("actor_film_dui_duari")), 2);
  assert.equal(factBit(pool, amind, pool.qIndex.get("actor_film_dui_duari")), 0);
  assert.equal(factBit(pool, riazd, pool.qIndex.get("actor_walton_senior_exec")), 0);
  assert.equal(factBit(pool, amind, pool.qIndex.get("actor_walton_senior_exec")), 2);
  const state = session(pool);
  answer(state, "screen_star_1990s", "yes");
  answer(state, "actor_film_dui_duari", "unknown");
  assert.equal(guessMatchesAnswers(state, riazd), true);
  assert.notEqual(decide(state).type, "guess");
  answer(state, "actor_walton_senior_exec", "unknown");
  assert.notEqual(decide(state).type, "guess");
});
