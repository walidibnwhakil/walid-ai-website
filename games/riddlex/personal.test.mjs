import assert from "node:assert/strict";
import test from "node:test";
import { answer, chooseQuestion, createState, decide, factBit, inCategory, questionBlocked, recompute } from "./engine.js";
import { appendShard, poolFromEntries } from "./kb.js";
import { PERSONAL_FACTS, PERSONAL_QUESTIONS, PERSONAL_RELATIONS, RIDDLEX_CHARACTER } from "./personal-facts.js";

const baseQuestions = [
  { id: "real", group: "kind" }, { id: "fictional", group: "kind" },
  { id: "animal", group: "kind" }, { id: "object", group: "kind" },
  { id: "named", group: "kind" }, { id: "from_bd", group: "country" },
  { id: "from_us", group: "country" }, { id: "male", group: "person" },
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
  for (const person of PERSONAL_RELATIONS) {
    const idx = pool.ids.indexOf(person.id);
    assert.equal(state.weights[idx], 0, person.id + " was still a possible guess");
    assert.ok(!state.alive.includes(idx), person.id + " survived 'knows you: no'");
  }
});

test("actor yes, Bangladesh yes, knows-you NO can never nominate a private family role", () => {
  const qs = [
    ...baseQuestions,
    { id: "actor", group: "job", en: "actor", bn: "actor" },
    { id: "politician", group: "job", en: "politician", bn: "politician" },
    { id: "singer", group: "job", en: "singer", bn: "singer" },
    { id: "cricketer", group: "job", en: "cricketer", bn: "cricketer" },
    { id: "writer", group: "job", en: "writer", bn: "writer" },
    { id: "athlete", group: "job", en: "athlete", bn: "athlete" },
  ];
  const famous = poolFromEntries(qs, [
    { id: "known-actor", en: "Known actor", pop: 65000, yes: ["real", "from_bd", "actor"], no: ["politician", "singer", "writer", "athlete", "cricketer"] },
    { id: "unknown-actor", en: "Unknown actor", pop: 12, yes: ["real", "actor"] },
  ]);
  const pool = appendShard(famous, poolFromEntries(qs, PERSONAL_RELATIONS));
  const state = createState(pool, { category: "character" });
  recompute(state);
  for (const [qid, value] of [
    ["real", "yes"], ["from_bd", "yes"], ["knows_you", "no"],
    ["politician", "no"], ["actor", "yes"], ["singer", "no"],
    ["cricketer", "no"], ["athlete", "no"], ["writer", "no"],
  ]) answer(state, qid, value);
  assert.ok(state.alive.length > 0, "public actors should remain eligible");
  for (const role of PERSONAL_RELATIONS) {
    const idx = pool.ids.indexOf(role.id);
    assert.equal(state.weights[idx], 0, "private guess survived: " + role.id);
    assert.ok(!state.alive.includes(idx), "private role still alive: " + role.id);
  }
  const decision = decide(state);
  if (decision.type === "guess")
    assert.ok(!pool.ids[decision.index].startsWith("riddlex-role-"), JSON.stringify(decision));
});

test("role suggestions require confirmed personal contact, even if it is unknown", () => {
  const pool = casebook();
  const state = createState(pool, { category: "character" });
  recompute(state);
  answer(state, "real", "yes");
  answer(state, "knows_you", "unknown");
  for (const role of PERSONAL_RELATIONS)
    assert.equal(state.weights[pool.ids.indexOf(role.id)], 0, role.id);
  answer(state, "knows_you", "no");
  for (const role of PERSONAL_RELATIONS)
    assert.equal(state.weights[pool.ids.indexOf(role.id)], 0, role.id);
});

test("no to being family excludes relatives, while yes to parent excludes siblings", () => {
  const pool = casebook();
  const state = createState(pool, { category: "character" });
  recompute(state);
  for (const [qid, value] of [
    ["real", "yes"], ["knows_you", "yes"], ["your_family", "no"],
  ]) answer(state, qid, value);
  for (const role of ["mother", "father", "brother", "sister", "husband", "wife", "child", "baby"])
    assert.equal(state.weights[roleIndex(pool, role)], 0, role);
  assert.ok(state.weights[roleIndex(pool, "friend")] > 0);
  const family = createState(pool, { category: "character" });
  recompute(family);
  for (const [qid, value] of [
    ["real", "yes"], ["knows_you", "yes"], ["your_family", "yes"], ["your_parent", "yes"],
  ]) answer(family, qid, value);
  for (const role of ["brother", "sister", "husband", "wife", "child", "baby"])
    assert.equal(family.weights[roleIndex(pool, role)], 0, role);
});

test("knows-you no closes family and relationship follow-ups", () => {
  const pool = casebook();
  const state = createState(pool, { category: "character" });
  recompute(state);
  answer(state, "real", "yes");
  answer(state, "knows_you", "no");
  for (const question of PERSONAL_QUESTIONS.filter((q) => q.id !== "knows_you"))
    assert.equal(questionBlocked(state, question.id), true, question.id);
});

test("confirmed parent cannot be followed by sibling, spouse, or child questions", () => {
  const pool = casebook();
  const state = createState(pool, { category: "character" });
  recompute(state);
  answer(state, "real", "yes");
  answer(state, "knows_you", "yes");
  answer(state, "your_family", "yes");
  answer(state, "your_parent", "yes");
  for (const id of ["your_sibling", "your_spouse", "your_child", "your_baby"])
    assert.equal(questionBlocked(state, id), true, id);
});

test("Bangladeshi family role is not punished for missing country metadata", () => {
  const pool = casebook();
  const state = createState(pool, { category: "character" });
  recompute(state);
  for (const [qid, value] of [
    ["real", "yes"], ["knows_you", "yes"], ["from_bd", "yes"],
    ["your_family", "yes"], ["your_parent", "yes"], ["female", "yes"],
  ]) answer(state, qid, value);
  assert.ok(state.weights[roleIndex(pool, "mother")] > state.weights[0]);
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
  assert.equal(PERSONAL_RELATIONS.length, 16);
  for (const role of PERSONAL_RELATIONS) {
    assert.ok(role.id.startsWith("riddlex-role-"));
    assert.ok(role.en.startsWith("Your ") || role.en==="Yourself");
    assert.ok(!role.image && !role.credit);
    assert.ok(PERSONAL_FACTS[role.id]);
  }
});

test("husband, wife, partner, child, baby and ex are distinct candidates", () => {
  const pool = casebook();
  for (const [name, fact, gender] of [
    ["husband", "your_spouse", "male"],
    ["wife", "your_spouse", "female"],
    ["child", "your_child", null],
    ["baby", "your_baby", null],
    ["boyfriend", "your_partner", "male"],
    ["girlfriend", "your_partner", "female"],
    ["ex", "your_ex", null],
  ]) {
    const index = roleIndex(pool, name);
    assert.equal(factBit(pool, index, pool.qIndex.get(fact)), 2, name + " not recognized");
    if (gender) assert.equal(factBit(pool, index, pool.qIndex.get(gender)), 2);
    assert.equal(inCategory(pool, index, "character"), true);
  }
  assert.equal(factBit(pool, roleIndex(pool, "child"), pool.qIndex.get("your_baby")), 1,
    "an adult child must not be confused with a baby");
  assert.equal(factBit(pool, roleIndex(pool, "ex"), pool.qIndex.get("your_partner")), 1,
    "a former relationship must not be assumed current");
});

test("family path distinguishes spouses and babies, not just parents and siblings", () => {
  const pool = casebook();
  const state = createState(pool, { category: "character" });
  recompute(state);
  answer(state, "real", "yes");
  answer(state, "knows_you", "yes");
  answer(state, "your_family", "yes");
  answer(state, "your_parent", "no");
  answer(state, "your_sibling", "no");
  assert.equal(chooseQuestion(state), "your_spouse");
  answer(state, "your_spouse", "no");
  assert.equal(chooseQuestion(state), "your_child");
  answer(state, "your_child", "yes");
  assert.equal(chooseQuestion(state), "your_baby");
  answer(state, "your_baby", "yes");
  assert.ok(state.weights[roleIndex(pool, "baby")] > state.weights[roleIndex(pool, "child")]);
});

test("relationship path distinguishes a current girlfriend or boyfriend from an ex", () => {
  const pool = casebook();
  const state = createState(pool, { category: "character" });
  recompute(state);
  for (const [id, value] of [
    ["real", "yes"], ["knows_you", "yes"], ["your_family", "no"],
  ]) answer(state, id, value);
  assert.equal(chooseQuestion(state), "your_partner");
  answer(state, "your_partner", "no");
  assert.equal(chooseQuestion(state), "your_ex");
  answer(state, "your_ex", "yes");
  assert.ok(state.weights[roleIndex(pool, "ex")] > state.weights[roleIndex(pool, "boyfriend")]);
  assert.ok(state.weights[roleIndex(pool, "ex")] > state.weights[roleIndex(pool, "girlfriend")]);
});

test("crush is not among supported relationship questions or guesses", () => {
  const pool = casebook();
  assert.equal(pool.qIndex.has("your_crush"), false);
  assert.equal(pool.ids.some((id) => id.includes("crush")), false);
  assert.equal(PERSONAL_QUESTIONS.length, 13);
  assert.equal(PERSONAL_RELATIONS.length, 16);
});

test("a private grandfather is reached by evidence without confusing father or spouse", () => {
  const pool = casebook();
  const state = createState(pool, { category: "character" });
  recompute(state);
  const replies = [
    ["real", "yes"],
    ["knows_you", "yes"],
    ["your_family", "yes"],
    ["your_parent", "no"],
    ["your_sibling", "no"],
    ["your_spouse", "no"],
    ["your_child", "no"],
  ];
  for (const [qid, value] of replies) answer(state, qid, value);
  assert.equal(chooseQuestion(state), "your_grandparent");
  answer(state, "your_grandparent", "yes");
  assert.equal(chooseQuestion(state), "female");
  answer(state, "female", "no");
  const decision = decide(state);
  assert.equal(decision.type, "guess");
  assert.equal(pool.ids[decision.index], "riddlex-role-grandfather");
  const grandfather = roleIndex(pool, "grandfather");
  assert.equal(factBit(pool, grandfather, pool.qIndex.get("your_grandparent")), 2);
  assert.equal(factBit(pool, roleIndex(pool, "grandmother"), pool.qIndex.get("female")), 2);
});

test("grandparent question is forbidden before excluding nearer relatives", () => {
  const pool = casebook();
  const state = createState(pool, { category: "character" });
  recompute(state);
  for (const [qid, value] of [["real","yes"],["knows_you","yes"],["your_family","yes"]])
    answer(state, qid, value);
  assert.equal(questionBlocked(state, "your_grandparent"), true);
  answer(state, "your_parent", "no");
  answer(state, "your_sibling", "no");
  answer(state, "your_spouse", "no");
  answer(state, "your_child", "no");
  assert.equal(questionBlocked(state, "your_grandparent"), false);
});
