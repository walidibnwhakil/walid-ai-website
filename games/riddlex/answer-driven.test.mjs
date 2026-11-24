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
import { EXTRA_IDENTITY_QUESTIONS, EXTRA_IDENTITY_PEOPLE } from "./identity-facts.js";

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

test("a tentative country answer never hides another plausible country", () => {
  const countryPool = poolFromEntries(base, [
    {id:"french",en:"French performer",pop:90,
      yes:["real","alive","female","actor","from_fr"]},
    {id:"british",en:"British performer",pop:90,
      yes:["real","alive","female","actor","from_gb"]},
    {id:"canadian",en:"Canadian performer",pop:90,
      yes:["real","alive","female","actor","from_ca"]},
    {id:"american",en:"American performer",pop:90,
      yes:["real","alive","female","actor","from_us"]},
  ]);
  const european = createState(countryPool, {category:"character"});
  answer(european,"real","yes");
  answer(european,"from_europe","yes");
  answer(european,"from_gb","probably");
  assert.equal(questionBlocked(european,"from_fr"),false,
    "Probably UK is not a definitive No to France");

  const northAmerican = createState(countryPool, {category:"character"});
  answer(northAmerican,"real","yes");
  answer(northAmerican,"from_north_america","yes");
  answer(northAmerican,"from_us","probably");
  assert.equal(questionBlocked(northAmerican,"from_ca"),false,
    "Probably USA must not prohibit Canada");
});

test("tentative British origin cannot suppress an affirmed French actor's film question", () => {
  const people = poolFromEntries([...base, ...EXTRA_IDENTITY_QUESTIONS],
    EXTRA_IDENTITY_PEOPLE);
  const state = createState(people, {category:"character"});
  for (const [qid,value] of [
    ["real","yes"],["knows_you","no"],["female","yes"],["alive","yes"],
    ["actor","yes"],["from_europe","yes"],
    ["from_gb","probably"],["from_fr","yes"],
    ["screen_role_lead","yes"],["career_hollywood_films","yes"]
  ]) answer(state,qid,value);
  assert.equal(questionBlocked(state,"film_nymphomaniac"),false,
    "Probably British must not hide a sourced French performer");
});

test("tentative US nationality cannot suppress a confirmed Canadian adult-career question", () => {
  const people = poolFromEntries([...base, ...EXTRA_IDENTITY_QUESTIONS],
    EXTRA_IDENTITY_PEOPLE);
  const state = createState(people, {category:"character"});
  for (const [qid,value] of [
    ["real","yes"],["female","yes"],["alive","yes"],
    ["from_north_america","yes"],["from_us","probably"],
    ["from_ca","yes"],["actor","yes"],["adult_ent","yes"],
    ["career_former_adult","yes"]
  ]) answer(state,qid,value);
  assert.equal(questionBlocked(state,"career_adult_to_india"),false,
    "Probably US must not hide a sourced Canadian performer");
});

test("multiple creative careers never suppress the broad acting interview", () => {
  const careerPool = poolFromEntries(base, [
    {id:"silent-performer",en:"Screen performer",pop:200,
      yes:["real","named","male","writer","musician","singer",
        "from_europe","from_gb","actor"]},
    ...Array.from({length:180},(_,i)=>({
      id:"writer-musician-"+i,en:"Creative professional "+i,pop:200,
      yes:["real","named","male","writer","musician","from_europe","from_gb"]
    }))
  ]);
  const s = createState(careerPool,{category:"character"});
  for (const [qid,value] of [
    ["real","yes"],["knows_you","no"],["female","no"],
    ["alive","no"],["writer","yes"],["from_europe","yes"],
    ["from_fr","no"],["from_gb","yes"],["musician","yes"]
  ]) answer(s,qid,value);
  const next=decide(s);
  assert.deepEqual(next,{type:"ask",qid:"actor"},
    "writer+musician must not skip acting and end in unrelated sport trivia");
});
