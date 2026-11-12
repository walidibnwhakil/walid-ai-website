import assert from "node:assert/strict";
import test from "node:test";
import { answer, adultAllowed, canPrint, chooseQuestion, createState, decide, rejectIndex, recompute } from "./engine.js";
import { poolFromEntries } from "./kb.js";

const questions = [
  { id: "real", group: "kind" },
  { id: "fictional", group: "kind" },
  { id: "animal", group: "kind" },
  { id: "object", group: "kind" },
  { id: "named", group: "kind" },
  { id: "male", group: "person" },
  { id: "female", group: "person" },
  { id: "alive", group: "life" },
  { id: "from_bd", group: "country" },
  { id: "from_in", group: "country" },
  { id: "cricketer", group: "job" },
  { id: "all_rounder", group: "job" },
  { id: "writer", group: "job" },
  { id: "actor", group: "job" },
  { id: "adult_ent", group: "adult" },
  { id: "from_novel", group: "fiction" },
  { id: "from_cartoon", group: "fiction" },
  { id: "from_bengali_lit", group: "fiction" },
  { id: "by_humayun", group: "fiction" },
  { id: "wears_yellow", group: "fiction" },
  { id: "detective_role", group: "fiction" },
  { id: "is_cat", group: "animal" },
  { id: "is_mouse", group: "animal" },
  { id: "mammal", group: "animal" },
  { id: "pet", group: "animal" },
  { id: "kitchen", group: "object" },
  { id: "cooking", group: "object" },
  { id: "uses_pressure", group: "object" },
  { id: "metal", group: "object" },
  { id: "electronic", group: "object" },
].map((question) => ({ ...question, en: question.id, bn: question.id }));

function entry(id, pop, yes, extra = {}) {
  return { id, en: extra.en || id, bn: extra.bn || "", pop, yes, no: extra.no || [], adult: extra.adult, image: extra.image || "" };
}

const world = poolFromEntries(questions, [
  entry("shakib", 400, ["real", "named", "male", "alive", "from_bd", "cricketer", "all_rounder"], { en: "Shakib Al Hasan", bn: "সাকিব আল হাসান", no: ["fictional", "animal", "object", "female", "from_in", "writer", "actor", "adult_ent"] }),
  entry("tamim", 200, ["real", "named", "male", "alive", "from_bd", "cricketer"], { no: ["fictional", "animal", "object", "all_rounder", "from_in", "actor", "adult_ent"] }),
  entry("kohli", 500, ["real", "named", "male", "alive", "from_in", "cricketer"], { no: ["from_bd", "fictional", "all_rounder", "adult_ent", "animal", "object"] }),
  entry("himu", 160, ["fictional", "named", "male", "from_novel", "from_bengali_lit", "by_humayun", "wears_yellow"], { en: "Himu", bn: "হিমু", no: ["real", "animal", "object", "detective_role", "from_cartoon", "adult_ent"] }),
  entry("misir", 120, ["fictional", "named", "male", "from_novel", "from_bengali_lit", "by_humayun", "detective_role"], { no: ["real", "wears_yellow", "animal", "from_cartoon"] }),
  entry("feluda", 180, ["fictional", "named", "male", "from_novel", "from_bengali_lit", "detective_role"], { no: ["by_humayun", "wears_yellow", "real", "animal"] }),
  entry("tom", 300, ["fictional", "named", "male", "animal", "is_cat", "mammal", "from_cartoon", "pet"], { en: "Tom", bn: "টম", no: ["real", "object", "is_mouse", "from_bengali_lit"] }),
  entry("jerry", 250, ["fictional", "named", "male", "animal", "is_mouse", "mammal", "from_cartoon"], { no: ["is_cat", "real", "object"] }),
  entry("cat", 600, ["animal", "mammal", "is_cat", "pet"], { en: "Cat", bn: "বিড়াল", no: ["real", "fictional", "named", "object", "is_mouse"] }),
  entry("dog", 500, ["animal", "mammal", "pet"], { no: ["is_cat", "is_mouse", "real", "fictional", "named", "object"] }),
  entry("cooker", 80, ["object", "kitchen", "cooking", "metal", "uses_pressure"], { en: "Pressure cooker", bn: "প্রেসার কুকার", no: ["real", "fictional", "animal", "named", "electronic"], image: "Pressure_cooker.jpg" }),
  entry("pot", 70, ["object", "kitchen", "cooking", "metal"], { no: ["uses_pressure", "electronic", "real", "named", "animal"] }),
  entry("phone", 90, ["object", "electronic"], { no: ["kitchen", "cooking", "uses_pressure", "real", "animal"] }),
  entry("adult-a", 40, ["real", "named", "male", "actor", "adult_ent", "alive"], { adult: true, image: "secret.jpg", no: ["fictional", "cricketer", "writer", "animal", "object"] }),
  entry("adult-b", 30, ["real", "named", "female", "actor", "adult_ent", "alive"], { adult: true, no: ["fictional", "cricketer", "animal", "object"] }),
  entry("actor", 60, ["real", "named", "male", "actor", "alive"], { no: ["adult_ent", "cricketer", "fictional", "animal", "object"] }),
]);

function bit(pool, id, qid) {
  const index = pool.ids.indexOf(id);
  const qi = pool.qIndex.get(qid);
  const base = index * pool.attrBytes + (qi >> 2);
  return (pool.attrs[base] >> ((qi & 3) << 1)) & 3;
}

function play(pool, id, { flip = -1 } = {}) {
  const target = pool.ids.indexOf(id);
  const category = ["cat", "dog"].includes(id) ? "animal" : ["cooker", "pot", "phone"].includes(id) ? "object" : "character";
  const state = createState(pool, { opening: "real", category });
  recompute(state);
  let flipped = false;
  for (let step = 0; step < 28; step++) {
    const decision = decide(state);
    if (decision.type === "guess") {
      if (decision.index === target) return { ok: true, step, guesses: state.guesses + 1 };
      rejectIndex(state, decision.index);
      continue;
    }
    if (decision.type !== "ask") return { ok: false, step, reason: decision.type };
    let value = bit(pool, id, decision.qid) === 2 ? "yes" : bit(pool, id, decision.qid) === 1 ? "no" : "unknown";
    if (!flipped && flip >= 0 && value !== "unknown" && state.answers.length === flip) {
      value = value === "yes" ? "no" : "yes";
      flipped = true;
    }
    answer(state, decision.qid, value);
  }
  return { ok: false, step: 28 };
}

test("guesses the five briefed targets from truthful answers", () => {
  for (const id of ["shakib", "himu", "tom", "cat", "cooker"]) {
    const result = play(world, id);
    assert.equal(result.ok, true, `${id} ${JSON.stringify(result)}`);
  }
});

test("one wrong answer still leaves Shakib reachable", () => {
  const result = play(world, "shakib", { flip: 2 });
  assert.equal(result.ok, true, JSON.stringify(result));
});

test("the adult-entertainment question stays late and name-only", () => {
  const actors = poolFromEntries(questions, [
    entry("plain", 50, ["real", "male", "actor", "alive", "named"], { no: ["adult_ent", "fictional", "cricketer", "writer", "politician", "scientist", "footballer", "athlete", "animal", "object"] }),
    entry("star", 40, ["real", "male", "actor", "adult_ent", "alive", "named"], { adult: true, image: "nope.jpg", no: ["fictional", "cricketer", "writer", "politician", "scientist", "footballer", "athlete", "animal", "object"] }),
  ]);
  const state = createState(actors);
  recompute(state);
  for (let count = 0; count < 9; count++) answer(state, "real", "yes");
  assert.equal(adultAllowed(state), false);
  assert.notEqual(chooseQuestion(state), "adult_ent");
  answer(state, "male", "yes");
  assert.equal(adultAllowed(state), true);
  assert.equal(canPrint(actors, actors.ids.indexOf("star")), false);
  assert.equal(canPrint(world, world.ids.indexOf("cooker")), true);
  assert.equal(canPrint(world, world.ids.indexOf("shakib")), false);
});

test("a wrong guess asks more questions before the next name", () => {
  const shared = ["real", "named", "male", "alive", "from_bd", "writer"];
  const no = ["fictional", "animal", "object", "female", "from_in", "actor", "adult_ent", "cricketer"];
  const crowd = poolFromEntries(questions, [
    entry("lead", 320, shared, { no }),
    entry("near", 300, [...shared, "from_novel"], { no: [...no, "from_cartoon"] }),
    entry("also", 290, [...shared, "from_cartoon"], { no: [...no, "from_novel"] }),
    entry("third", 280, [...shared, "detective_role"], { no }),
  ]);
  const state = createState(crowd, { category: "character", opening: "real" });
  recompute(state);
  const gaps = [];
  let since = 0;
  for (let step = 0; step < 36; step++) {
    const decision = decide(state);
    if (decision.type === "guess") {
      gaps.push(since);
      if (gaps.length === 2) break;
      rejectIndex(state, decision.index);
      since = 0;
      continue;
    }
    assert.equal(decision.type, "ask", JSON.stringify(decision));
    const value = bit(crowd, "near", decision.qid) === 2 ? "yes" : bit(crowd, "near", decision.qid) === 1 ? "no" : "unknown";
    answer(state, decision.qid, value);
    since += 1;
  }
  assert.equal(gaps.length, 2, JSON.stringify(gaps));
  assert.ok(gaps[1] >= 4, `only ${gaps[1]} questions between guesses`);
});

test("one remaining name that is far ahead can be guessed without a long extra round", () => {
  const pair = poolFromEntries(questions, [
    entry("keeper", 400, ["real", "named", "male", "alive", "from_bd", "cricketer", "all_rounder"], { no: ["fictional", "animal", "object", "female", "from_in", "writer", "actor", "adult_ent"] }),
    entry("other", 40, ["real", "named", "female", "alive", "from_in", "actor"], { no: ["from_bd", "cricketer", "male", "fictional", "animal", "object", "adult_ent"] }),
  ]);
  const state = createState(pair, { category: "character", opening: "real" });
  recompute(state);
  let guesses = 0;
  let since = 0;
  for (let step = 0; step < 24; step++) {
    const decision = decide(state);
    if (decision.type === "guess") {
      if (guesses === 0) {
        rejectIndex(state, decision.index === 0 ? 1 : 0);
        guesses = 1;
        since = 0;
        const again = decide(state);
        assert.equal(again.type, "guess", JSON.stringify(again));
        return;
      }
    }
    assert.equal(decision.type, "ask");
    const value = bit(pair, "keeper", decision.qid) === 2 ? "yes" : bit(pair, "keeper", decision.qid) === 1 ? "no" : "unknown";
    answer(state, decision.qid, value);
    since += 1;
    assert.ok(since < 20);
  }
  assert.fail("the remaining name was not guessed");
});

function firmGuesses(pool, qid, value) {
  const state = createState(pool, { category: "character", opening: "real" });
  recompute(state);
  answer(state, qid, value);
  const guessed = [];
  for (let n = 0; n < 4; n++) {
    let decision;
    for (let step = 0; step < 16; step++) {
      decision = decide(state);
      if (decision.type !== "ask") break;
      answer(state, decision.qid, "unknown");
    }
    assert.equal(decision.type, "guess", JSON.stringify(decision));
    guessed.push(pool.ids[decision.index]);
    rejectIndex(state, decision.index);
  }
  return guessed;
}

test("a firm Bangladeshi yes is not beaten by a famous foreigner", () => {
  const pool = poolFromEntries(questions, [
    entry("hitler", 60000, ["real", "named", "male", "from_in"], { en: "Adolf Hitler", no: ["from_bd", "female", "fictional", "animal", "object"] }),
    entry("mujib", 400, ["real", "named", "male", "from_bd"], { no: ["from_in", "female", "fictional", "animal", "object"] }),
    entry("bd2", 80, ["real", "named", "female", "from_bd"], { no: ["from_in", "male", "fictional", "animal", "object"] }),
    entry("bd3", 40, ["real", "named", "male", "from_bd"], { no: ["from_in", "female", "fictional", "animal", "object"] }),
    entry("bd4", 20, ["real", "named", "male", "from_bd"], { no: ["from_in", "female", "fictional", "animal", "object"] }),
    entry("unknown-country", 50000, ["real", "named", "male"], { no: ["female", "fictional", "animal", "object"] }),
  ]);
  const guessed = firmGuesses(pool, "from_bd", "yes");
  for (const id of guessed) assert.ok(["mujib", "bd2", "bd3", "bd4"].includes(id), id);
});

test("a firm female yes is not beaten by a famous man", () => {
  const pool = poolFromEntries(questions, [
    entry("famous-man", 60000, ["real", "named", "male", "from_in"], { no: ["female", "from_bd", "fictional", "animal", "object"] }),
    entry("w1", 90, ["real", "named", "female", "from_bd"], { no: ["male", "fictional", "animal", "object"] }),
    entry("w2", 70, ["real", "named", "female", "from_in"], { no: ["male", "fictional", "animal", "object"] }),
    entry("w3", 40, ["real", "named", "female"], { no: ["male", "fictional", "animal", "object"] }),
    entry("w4", 25, ["real", "named", "female", "from_bd"], { no: ["male", "from_in", "fictional", "animal", "object"] }),
  ]);
  const guessed = firmGuesses(pool, "female", "yes");
  for (const id of guessed) assert.ok(["w1", "w2", "w3", "w4"].includes(id), id);
});

test("honest answers reach Tarique Rahman and do not guess the dead Mujib", () => {
  const poliQuestions = [
    ["real", "kind"], ["fictional", "kind"], ["male", "person"], ["female", "person"],
    ["alive", "life"], ["dead", "life"],
    ["born_1900_1949", "birth"], ["born_1950_1969", "birth"], ["born_1970_1979", "birth"],
    ["from_bd", "country"], ["from_in", "country"],
    ["politician", "job"],
    ["party_bnp", "politics"], ["party_al", "politics"], ["led_gov", "politics"],
    ["zia_family", "politics"], ["mujib_family", "politics"], ["lives_abroad", "politics"],
    ["named", "kind"],
  ].map(([id, group]) => ({ id, group, en: id, bn: id }));
  const noCommon = ["fictional", "animal", "object"];
  const pool = poolFromEntries(poliQuestions, [
    entry("Q191375", 500, ["real", "named", "male", "dead", "from_bd", "politician", "party_al", "led_gov", "mujib_family", "born_1900_1949"], { en: "Sheikh Mujibur Rahman", no: ["alive", "female", "party_bnp", "zia_family", "lives_abroad", "from_in", ...noCommon] }),
    entry("Q52183", 480, ["real", "named", "female", "alive", "from_bd", "politician", "party_al", "led_gov", "mujib_family", "born_1900_1949"], { en: "Sheikh Hasina", no: ["dead", "male", "party_bnp", "zia_family", "from_in", ...noCommon] }),
    entry("Q234814", 420, ["real", "named", "female", "dead", "from_bd", "politician", "party_bnp", "led_gov", "zia_family", "born_1900_1949"], { en: "Khaleda Zia", no: ["alive", "male", "party_al", "mujib_family", "from_in", ...noCommon] }),
    entry("Q7686199", 280, ["real", "named", "male", "alive", "from_bd", "politician", "party_bnp", "led_gov", "zia_family", "born_1950_1969"], { en: "Tarique Rahman", no: ["dead", "female", "party_al", "mujib_family", "lives_abroad", "from_in", ...noCommon] }),
    entry("Q6874839", 190, ["real", "named", "male", "alive", "from_bd", "politician", "party_bnp", "born_1900_1949"], { en: "Mirza Fakhrul Islam Alamgir", no: ["dead", "female", "party_al", "led_gov", "zia_family", "mujib_family", "from_in", ...noCommon] }),
    entry("Q14325293", 170, ["real", "named", "male", "alive", "from_bd", "politician", "party_al", "born_1950_1969"], { en: "Obaidul Quader", no: ["dead", "female", "party_bnp", "led_gov", "zia_family", "mujib_family", "from_in", ...noCommon] }),
    entry("Q1058", 520, ["real", "named", "male", "alive", "from_in", "politician", "led_gov", "born_1950_1969"], { en: "Narendra Modi", no: ["dead", "female", "from_bd", "party_bnp", "party_al", "zia_family", "mujib_family", ...noCommon] }),
  ]);
  function reach(id) {
    const state = createState(pool, { category: "character", opening: "real" });
    recompute(state);
    const wrong = [];
    for (let step = 0; step < 40; step++) {
      const decision = decide(state);
      if (decision.type === "guess") {
        if (decision.index === pool.ids.indexOf(id)) return { ok: true, guesses: state.guesses + 1, wrong };
        wrong.push(pool.ens[decision.index]);
        if (wrong.length >= 4) return { ok: false, guesses: wrong.length, wrong };
        rejectIndex(state, decision.index);
        continue;
      }
      if (decision.type !== "ask") return { ok: false, wrong, reason: decision.type };
      const value = bit(pool, id, decision.qid) === 2 ? "yes" : bit(pool, id, decision.qid) === 1 ? "no" : "unknown";
      answer(state, decision.qid, value);
    }
    return { ok: false, wrong };
  }
  const tarique = reach("Q7686199");
  assert.equal(tarique.ok, true, JSON.stringify(tarique));
  assert.ok(tarique.guesses <= 4, JSON.stringify(tarique));
  assert.ok(!tarique.wrong.includes("Sheikh Mujibur Rahman"), JSON.stringify(tarique));
  const hasina = reach("Q52183");
  assert.equal(hasina.ok, true, JSON.stringify(hasina));
  assert.ok(hasina.guesses <= 4, JSON.stringify(hasina));
  const modi = reach("Q1058");
  assert.equal(modi.ok, true, JSON.stringify(modi));
  assert.ok(modi.guesses <= 4, JSON.stringify(modi));
});

test("a firm fictional yes is not beaten by a famous real person", () => {
  const pool = poolFromEntries(questions, [
    entry("celebrity", 60000, ["real", "named", "male"], { no: ["fictional", "female", "animal", "object"] }),
    entry("f1", 80, ["fictional", "named", "male"], { no: ["real", "animal", "object"] }),
    entry("f2", 60, ["fictional", "named", "female"], { no: ["real", "animal", "object"] }),
    entry("f3", 40, ["fictional", "named"], { no: ["real", "animal", "object"] }),
    entry("f4", 30, ["fictional", "named", "male"], { no: ["real", "animal", "object"] }),
  ]);
  const guessed = firmGuesses(pool, "fictional", "yes");
  for (const id of guessed) assert.ok(["f1", "f2", "f3", "f4"].includes(id), id);
});
