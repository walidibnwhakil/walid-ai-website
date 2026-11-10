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
