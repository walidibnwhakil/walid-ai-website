import assert from "node:assert/strict";
import test from "node:test";
import { answer, chooseQuestion, createState, decide, factBit, inCategory, recompute } from "./engine.js";
import { appendShard, poolFromEntries } from "./kb.js";
import { PERSONAL_FACTS, PERSONAL_QUESTIONS, PERSONAL_RELATIONS, RIDDLEX_CHARACTER } from "./personal-facts.js";

const baseQuestions = [
  { id: "real", group: "kind" }, { id: "fictional", group: "kind" },
  { id: "animal", group: "kind" }, { id: "object", group: "kind" },
  { id: "named", group: "kind" }, { id: "male", group: "person" },
  { id: "female", group: "person" }, { id: "alive", group: "life" },
  { id: "from_game", group: "fiction" }, { id: "detective_role", group: "fiction" },
  ...PERSONAL_QUESTIONS,
].map((q) => ({ en: q.id, bn: q.id, ...q }));

function casebook() {
  const celebrity = poolFromEntries(baseQuestions, [
    { id: "famous-person", en: "Public celebrity", pop: 2000, yes: ["real", "named", "female"] },
  ]);
  return appendShard(celebrity, poolFromEntries(baseQuestions, [...PERSONAL_RELATIONS, RIDDLEX_CHARACTER]));
}
function roleIndex(pool, name) {
  const index = pool.ids.indexOf("riddlex-role-" + name);
  assert.ok(index >= 0, "missing private role " + name);
  return index;
}

test("a real person's personal connection is asked before public celebrity trivia", () => {
  const pool = casebook();
  const state = createState(pool, { category: "character", opening: "real" });
  recompute(state);
  assert.equal(decide(state).qid, "real");
  answer(state, "real", "yes");
  assert.equal(chooseQuestion(state), "knows_you");
  answer(state, "knows_you", "yes");
  assert.equal(chooseQuestion(state), "your_family");
  assert.ok(state.weights[roleIndex(pool, "mother")] > state.weights[0],
    "known family must beat unrelated famous celebrity");
  answer(state, "your_family", "yes");
  assert.equal(chooseQuestion(state), "your_parent");
  answer(state, "your_parent", "yes");
  assert.equal(chooseQuestion(state), "female");
  answer(state, "female", "yes");
  assert.equal(decide(state).type, "guess");
  assert.equal(pool.ids[decide(state).index], "riddlex-role-mother");
});

test("mother and father, brother and sister, friend and best friend remain distinct", () => {
  const pool = casebook();
  const expected = [
    ["mother", "your_parent", 2, "female"],
    ["father", "your_parent", 2, "male"],
    ["brother", "your_sibling", 2, "male"],
    ["sister", "your_sibling", 2, "female"],
    ["friend", "your_best_friend", 1, null],
    ["best-friend", "your_best_friend", 2, null],
  ];
  for (const [name, fact, bit, gender] of expected) {
    const index = roleIndex(pool, name);
    assert.equal(factBit(pool, index, pool.qIndex.get("knows_you")), 2);
    assert.equal(factBit(pool, index, pool.qIndex.get(fact)), bit);
    if (gender) assert.equal(factBit(pool, index, pool.qIndex.get(gender)), 2);
    assert.equal(inCategory(pool, index, "character"), true);
    assert.equal(inCategory(pool, index, "animal"), false);
  }
});

test("non-personal celebrities are never incorrectly asserted to know the user", () => {
  const pool = casebook();
  assert.equal(factBit(pool, 0, pool.qIndex.get("knows_you")), 0);
  const state = createState(pool, { category: "character" });
  recompute(state);
  answer(state, "real", "yes");
  answer(state, "knows_you", "no");
  for (const person of PERSONAL_RELATIONS)
    assert.ok(state.weights[pool.ids.indexOf(person.id)] < state.weights[0]);
});

test("Riddlex the detective is itself a guessable fictional character", () => {
  const pool = casebook();
  const i = pool.ids.indexOf(RIDDLEX_CHARACTER.id);
  assert.ok(i >= 0);
  for (const qid of ["fictional", "named", "from_game", "detective_role"]) {
    assert.equal(factBit(pool, i, pool.qIndex.get(qid)), 2);
  }
  assert.equal(inCategory(pool, i, "character"), true);
  assert.equal(inCategory(pool, i, "animal"), false);
  assert.equal(inCategory(pool, i, "object"), false);
});

test("generic roles contain no private person's name or identifying details", () => {
  assert.equal(PERSONAL_RELATIONS.length, 6);
  for (const role of PERSONAL_RELATIONS) {
    assert.ok(role.id.startsWith("riddlex-role-"));
    assert.ok(role.en.startsWith("Your "));
    assert.ok(!role.image && !role.credit);
    assert.ok(PERSONAL_FACTS[role.id]);
  }
});
