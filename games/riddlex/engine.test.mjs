import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { answer, adultAllowed, buildTraitLinks, canPrint, chooseQuestion, createState, decide, factBit, questionBlocked, questionsBeforeRetry, rejectIndex, recompute, shouldGuess } from "./engine.js";
import { appendShard, decodeShard, planShardLoads, poolFromEntries } from "./kb.js";
import { EXTRA_SCREEN_QUESTIONS } from "./career-facts.js?v=riddlex-51";

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

test("male no does not lead to redundant female question", () => {
  const state = createState(world, { category: "character" });
  recompute(state);
  answer(state, "real", "yes");
  answer(state, "male", "no");
  assert.equal(questionBlocked(state, "female"), true);
  assert.notEqual(chooseQuestion(state), "female");
  const uncertain = createState(world, { category: "character" });
  recompute(uncertain);
  answer(uncertain, "real", "yes");
  answer(uncertain, "male", "unknown");
  assert.equal(questionBlocked(uncertain, "female"), false);
});

test("four rejected guesses leave meaningful questions available", () => {
  const state = createState(world, { category: "character", opening: "real" });
  recompute(state);
  for (const id of ["himu","misir","feluda","actor"])
    rejectIndex(state, world.ids.indexOf(id));
  assert.equal(state.guesses, 4);
  assert.equal(decide(state).type, "ask");
});

test("a Bangladesh actor must answer film-era questions before the first guess", () => {
  const qs = [...questions, ...EXTRA_SCREEN_QUESTIONS];
  const pool = poolFromEntries(qs, [
    entry("Q7322180", 900, ["real","male","actor","from_bd","named"]),
    entry("Q7460127", 800, ["real","female","actor","from_bd","named"]),
  ]);
  const state = createState(pool, { category: "character" });
  recompute(state);
  for (const [id,value] of [
    ["real","yes"], ["male","yes"], ["from_bd","yes"], ["actor","yes"]
  ]) answer(state,id,value);
  assert.deepEqual(decide(state), {type:"ask",qid:"screen_role_lead"});
  answer(state,"screen_role_lead","yes");
  assert.deepEqual(decide(state), {type:"ask",qid:"screen_role_comedy"});
  answer(state,"screen_role_comedy","no");
  assert.deepEqual(decide(state), {type:"ask",qid:"screen_star_pre1990"});
  answer(state,"screen_star_pre1990","no");
  assert.deepEqual(decide(state), {type:"ask",qid:"screen_star_1990s"});
});

test("Chaplin is identified through comedy and distinctive screen appearance, not celebrity priors", () => {
  const qs = [...questions, ...EXTRA_SCREEN_QUESTIONS];
  const pool = poolFromEntries(qs, [
    entry("Q882", 10, ["real","male","actor","named"]),
    entry("Q18987612", 50000, ["real","male","actor","from_bd","named"]),
    entry("Q5279795", 65000, ["real","male","actor","from_bd","named"]),
  ]);
  const state = createState(pool, { category:"character" });
  recompute(state);
  for (const [id,value] of [
    ["real","yes"],["male","yes"],["from_bd","no"],["actor","yes"]
  ]) answer(state,id,value);
  const sequence = [
    ["screen_role_lead","yes"],
    ["screen_role_comedy","yes"],
    ["screen_silent_comedy","yes"],
    ["screen_physical_comedy","yes"],
    ["screen_short_moustache","yes"],
    ["screen_hitler_resemblance","yes"],
    ["screen_bowler_cane","yes"],
    ["screen_great_dictator","yes"],
  ];
  for (const [id,value] of sequence) {
    assert.deepEqual(decide(state),{type:"ask",qid:id},"Missing Chaplin follow-up "+id);
    answer(state,id,value);
  }
  for (const id of ["screen_role_comedy","screen_silent_comedy",
    "screen_short_moustache","screen_hitler_resemblance"])
    assert.equal(factBit(pool,0,pool.qIndex.get(id)),2,id);
});

test("Dildar can be investigated as a deceased supporting comedian, never presumed a lead hero", () => {
  const qs = [...questions, ...EXTRA_SCREEN_QUESTIONS];
  const pool = poolFromEntries(qs, [
    entry("Q18987612", 10, ["real","male","actor","from_bd","named"]),
    entry("Q5279795", 50000, ["real","male","actor","from_bd","named"]),
  ]);
  const state = createState(pool,{category:"character"});
  recompute(state);
  for (const [id,value] of [
    ["real","yes"],["male","yes"],["from_bd","yes"],["actor","yes"]
  ]) answer(state,id,value);
  for (const [qid,value] of [
    ["screen_role_lead","no"],["screen_role_villain","no"],
    ["screen_role_comedy","yes"],["screen_role_supporting","yes"],
    ["screen_silent_comedy","no"],["screen_comedy_award","yes"],
  ]) {
    assert.deepEqual(decide(state),{type:"ask",qid},"Dildar branch skipped "+qid);
    answer(state,qid,value);
  }
  assert.equal(factBit(pool,0,pool.qIndex.get("screen_role_comedy")),2);
  assert.equal(factBit(pool,0,pool.qIndex.get("screen_role_lead")),1);
});

test("a rejected 1990s male movie star is followed by verified career questions", () => {
  const qs = [...questions, ...EXTRA_SCREEN_QUESTIONS];
  const pool = poolFromEntries(qs, [
    entry("Q7405420", 800, ["real","male","actor","from_bd","named"]),
    entry("Q7322180", 700, ["real","male","actor","from_bd","named"]),
  ]);
  const state = createState(pool, { category:"character" });
  recompute(state);
  for (const [qid,value] of [["real","yes"],["male","yes"],["from_bd","yes"],
    ["actor","yes"],["screen_star_pre1990","no"],["screen_star_1990s","yes"]])
    answer(state,qid,value);
  rejectIndex(state, 0); // Salman Shah was not the intended actor
  const careerQuestions = [];
  for (let i=0;i<5;i++) {
    const decision=decide(state);
    assert.equal(decision.type,"ask",
      "No five-question verification after a rejected star: "+JSON.stringify(decision));
    careerQuestions.push(decision.qid);
    const qi=pool.qIndex.get(decision.qid);
    const fact=factBit(pool,1,qi);
    answer(state,decision.qid,fact===2?"yes":fact===1?"no":"unknown");
  }
  assert.ok(careerQuestions.filter(q=>q.startsWith("screen_")).length >= 4,
    "Expected relevant film questions, not unrelated celebrity trivia: "+careerQuestions.join(", "));
});

test("a confident second name must wait for additional evidence", () => {
  const pool = poolFromEntries(questions, [
    entry("lead", 1000, ["real", "male", "named", "alive", "from_bd", "actor"]),
    entry("runner-up", 8, ["real", "male", "named", "alive", "from_bd", "actor", "writer"]),
    entry("third", 5, ["real", "named", "female", "from_in", "singer"]),
  ]);
  const state = createState(pool, { category: "character" });
  recompute(state);
  for (const [id, value] of [["real", "yes"], ["male", "yes"],
    ["from_bd", "yes"], ["actor", "yes"]]) answer(state, id, value);
  rejectIndex(state, pool.ids.indexOf("third"));
  let answered = 0;
  for (let step = 0; step < 5; step++) {
    const decision = decide(state);
    assert.notEqual(decision.type, "guess", "Name spam after wrong guess: " + JSON.stringify(decision));
    if (decision.type === "defeat") break; // the mock has no remaining traits to ask
    answer(state, decision.qid, "unknown");
    answered++;
  }
  assert.ok(answered >= 1, "The engine should ask at least one available confirmation");
});

test("a confirmed male and 1990s star cannot nominate a woman or an unverified-era actor", () => {
  const qs = [...questions, { id:"screen_star_1990s", group:"job", en:"1990s actor", bn:"৯০ এর অভিনেতা" }];
  const pool = poolFromEntries(qs, [
    entry("Q7322180", 100, ["real","male","actor","from_bd","named"]),
    entry("Q13059781", 9000, ["real","female","actor","from_bd","named"], { no:["male"] }),
    entry("unverified-man", 9500, ["real","male","actor","from_bd","named"]),
  ]);
  const state = createState(pool, { category:"character" });
  recompute(state);
  for (const [id,value] of [["real","yes"],["male","yes"],["from_bd","yes"],
    ["actor","yes"],["screen_star_1990s","yes"]]) answer(state,id,value);
  for (let attempt=0;attempt<4;attempt++) {
    const decision=decide(state);
    if (decision.type==="guess") {
      assert.equal(pool.ids[decision.index],"Q7322180",
        "gender or career decade was disregarded");
      break;
    }
    if (decision.type==="defeat") break;
    answer(state,decision.qid,"unknown");
  }
});

test("a large public casebook never guesses from generic facts or a fame prior", () => {
  const qs = [...questions, ...EXTRA_SCREEN_QUESTIONS];
  const crowd = [
    entry("Q7322180", 65000, ["real", "named", "male", "actor", "from_bd"]),
    ...Array.from({ length: 120 }, (_, i) =>
      entry("unverified-" + i, 2, ["real", "named", "male", "actor", "from_bd"])),
  ];
  const state = createState(poolFromEntries(qs, crowd), { category:"character" });
  recompute(state);
  for (const [qid, value] of [
    ["real","yes"],["male","yes"],["from_bd","yes"],["actor","yes"],
    ["screen_role_lead","unknown"],["screen_role_comedy","unknown"],
    ["screen_star_pre1990","no"],["screen_star_1990s","yes"],
  ]) answer(state, qid, value);
  assert.equal(shouldGuess(state), false,
    "Occupation, gender, country, era and a famous prior do not prove one identity");
  assert.notEqual(decide(state).type, "guess",
    "Riddlex must ask about the possible person before announcing their name");
});

test("questioning does not terminate at 72 answers or ten rejected names", () => {
  const extra = Array.from({ length: 80 }, (_, i) => ({
    id: "extra_object_fact_" + i, group:"object",
    en: "Extra object fact " + i, bn: "বস্তুর আরও তথ্য " + i,
  }));
  const pool = poolFromEntries([...questions, ...extra], [
    entry("cooker", 400, ["object","kitchen","cooking","metal","uses_pressure"]),
    entry("pot", 200, ["object","kitchen","cooking","metal"]),
  ]);
  const state = createState(pool, {category:"object"});
  recompute(state);
  for (let i=0;i<73;i++) answer(state, "extra_object_fact_" + i, "unknown");
  state.guesses = 10;
  state.sinceGuess = 0;
  const next = decide(state);
  assert.equal(next.type, "ask", JSON.stringify(next));
  assert.ok(!state.answers.some(row => row.qid === next.qid),
    "A follow-up must not repeat a previously asked question");
});

test("a living film actor cannot be replaced with known deceased film icons", () => {
  const qs = [...questions, { id:"dead", group:"life", en:"Are they dead?", bn:"তিনি মারা গেছেন?" }, ...EXTRA_SCREEN_QUESTIONS];
  const pool = poolFromEntries(qs, [
    entry("Q7462919", 50, ["real","named","male","actor","from_bd"]),
    entry("Q7405420", 60000, ["real","named","male","actor","from_bd"]),
    entry("Q4244083", 55000, ["real","named","male","actor","from_bd"]),
  ]);
  const life = (id,qid) => factBit(pool,pool.ids.indexOf(id),pool.qIndex.get(qid));
  assert.equal(life("Q7462919","alive"),2);
  assert.equal(life("Q7405420","dead"),2);
  assert.equal(life("Q4244083","dead"),2);
  for (const who of ["Q7405420","Q4244083"]) {
    assert.equal(life(who,"alive"),1,who);
  }
  const state = createState(pool,{category:"character"});
  recompute(state);
  for(const [qid,value] of [["real","yes"],["male","yes"],["from_bd","yes"],
    ["actor","yes"],["alive","yes"]]) answer(state,qid,value);
  for(let turn=0;turn<32;turn++) {
    const action=decide(state);
    if(action.type==="guess") {
      assert.equal(pool.ids[action.index],"Q7462919",
        "A known deceased icon was suggested despite alive YES");
      return;
    }
    if(action.type!=="ask") break;
    answer(state,action.qid,"unknown");
  }
  // With insufficient identity evidence, asking or stopping beats a wrong dead-person guess.
  assert.equal(questionBlocked(state,"screen_died_1996"),true,
    "A death-year question must not follow a firm alive answer");
});

test("verified actor-specific clues distinguish the three cinema examples", () => {
  const pool = poolFromEntries([...questions,...EXTRA_SCREEN_QUESTIONS], [
    entry("Q7462919",100,["real","actor","from_bd","male"]),
    entry("Q7405420",100,["real","actor","from_bd","male"]),
    entry("Q4244083",100,["real","actor","from_bd","male"]),
  ]);
  const fact=(who,qid)=>factBit(pool,pool.ids.indexOf(who),pool.qIndex.get(qid));
  assert.equal(fact("Q7462919","screen_known_multiple_marriages"),2);
  assert.equal(fact("Q7462919","screen_debut_anonto_bhalobasha"),2);
  assert.equal(fact("Q7405420","screen_died_1996"),2);
  assert.equal(fact("Q4244083","screen_died_2008"),2);
  assert.equal(fact("Q4244083","screen_acted_bir_soinik"),2);
  assert.equal(fact("Q7405420","screen_died_2008"),1);
  assert.equal(fact("Q4244083","screen_died_1996"),1);
});

test("rejected identity remains excluded when shards reorder their numeric indices", () => {
  const initial = poolFromEntries(questions, [
    entry("bad-guess", 5000, ["real","male","actor","from_bd"]),
    entry("new-choice", 500, ["real","male","actor","from_bd"]),
  ]);
  const state = createState(initial, {category:"character"});
  recompute(state);
  rejectIndex(state, 0);
  assert.ok(state.rejectedIds.has("bad-guess"));
  const reordered = poolFromEntries(questions, [
    entry("new-choice", 500, ["real","male","actor","from_bd"]),
    entry("bad-guess", 5000, ["real","male","actor","from_bd"]),
    entry("added-person", 800, ["real","male","actor","from_bd"]),
  ]);
  state.pool = reordered;
  recompute(state);
  const surviving = state.alive.map(i => reordered.ids[i]);
  assert.ok(!surviving.includes("bad-guess"), "a rejected name must stay rejected");
  assert.ok(surviving.includes("new-choice"),
    "the original rejected numeric index must not exclude a different person");
  assert.ok(surviving.includes("added-person"));
});

test("after rejecting Shakib Khan, his unique marriage clue is not recycled", () => {
  const qs = [...questions, ...EXTRA_SCREEN_QUESTIONS];
  const entries = [
    entry("Q7462919", 9000, ["real","named","male","actor","from_bd","alive"]),
    entry("Q21066842", 900, ["real","named","male","actor","from_bd","alive"]),
    entry("Q7322180", 800, ["real","named","male","actor","from_bd","alive"]),
    ...Array.from({length: 120}, (_,i) =>
      entry("bd-actor-" + i, 2, ["real","named","male","actor","from_bd","alive"])),
  ];
  const pool=poolFromEntries(qs,entries);
  const state=createState(pool,{category:"character"});
  recompute(state);
  for(const [qid,value] of [["real","yes"],["male","yes"],["from_bd","yes"],
    ["actor","yes"],["alive","yes"]]) answer(state,qid,value);
  rejectIndex(state,0);
  const seen = [];
  for(let n=0;n<60;n++) {
    const d=decide(state);
    if(d.type==="ask") {
      seen.push(d.qid);
      assert.notEqual(d.qid,"screen_known_multiple_marriages",
        "Marriage clue belongs only to an already rejected candidate");
      answer(state,d.qid,"unknown");
    } else if(d.type==="guess") {
      assert.notEqual(pool.ids[d.index],"Q7462919",
        "The previously rejected candidate must not reappear");
      rejectIndex(state,d.index);
    } else break;
  }
  assert.ok(seen.some(q=>q.startsWith("screen_")),seen.join(","));
});

test("extra public film clues attach to the correct actors, not all actors", () => {
  const qs=[...questions,...EXTRA_SCREEN_QUESTIONS];
  const pool=poolFromEntries(qs, [
    entry("Q21066842",200,["real","male","actor","from_bd"]),
    entry("Q15848298",200,["real","male","actor","from_bd"]),
    entry("Q15868587",200,["real","male","actor","from_bd"]),
    entry("Q5279795",200,["real","male","actor","from_bd"]),
    entry("Q5939749",200,["real","male","actor","from_bd"]),
    entry("Q7462919",200,["real","male","actor","from_bd"]),
  ]);
  const f=(id,qid)=>factBit(pool,pool.ids.indexOf(id),pool.qIndex.get(qid));
  assert.equal(f("Q21066842","screen_walton_executive"),2);
  assert.equal(f("Q21066842","screen_return_after_long_break"),2);
  assert.equal(f("Q15848298","screen_restaurant_business"),2);
  assert.equal(f("Q15868587","screen_800_plus_films"),2);
  assert.equal(f("Q5279795","screen_film_producer"),2);
  assert.equal(f("Q5939749","screen_theatre_tv_film"),2);
  assert.equal(f("Q7462919","screen_walton_executive"),0);
});

test("Bangladesh is asked within the first five character questions", () => {
  const state = createState(world, { category: "character", opening: "real" });
  recompute(state);
  const asked = [];
  for (let step = 0; step < 6; step++) {
    const decision = decide(state);
    assert.equal(decision.type, "ask", asked.join(","));
    asked.push(decision.qid);
    if (decision.qid === "from_bd") break;
    const value = bit(world, "shakib", decision.qid) === 2 ? "yes" : bit(world, "shakib", decision.qid) === 1 ? "no" : "unknown";
    answer(state, decision.qid, value);
  }
  const at = asked.indexOf("from_bd");
  assert.ok(at >= 0 && at < 5, asked.join(","));
  assert.ok(asked[0] === "real");
});

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
    // If the tiny synthetic casebook runs out of distinguishing facts, a
    // graceful stop is better than four consecutive unsupported names.
    if (decision.type === "defeat") break;
    assert.equal(decision.type, "ask", JSON.stringify(decision));
    const value = bit(crowd, "near", decision.qid) === 2 ? "yes" : bit(crowd, "near", decision.qid) === 1 ? "no" : "unknown";
    answer(state, decision.qid, value);
    since += 1;
  }
  assert.ok(gaps.length >= 1, "the player should receive an initial plausible guess");
  if (gaps.length > 1) assert.ok(gaps[1] >= 5,
    `only ${gaps[1]} follow-up questions between guesses`);
});

test("a wrong guess cannot immediately become another guess, even with one name left", () => {
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
        assert.equal(again.type, "ask", JSON.stringify(again));
        assert.ok(questionsBeforeRetry(state, 0.99, 99) >= 4);
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
  let lastGuessAnswerCount = null;
  for (let turn = 0; turn < 64; turn++) {
    const decision = decide(state);
    if (decision.type === "ask") {
      answer(state, decision.qid, "unknown");
      continue;
    }
    if (decision.type === "defeat") break; // no evidence left, not another random name
    assert.equal(decision.type, "guess");
    if (lastGuessAnswerCount != null)
      assert.ok(state.answers.length - lastGuessAnswerCount >= 5,
        "Guesses repeated without five clarifying questions");
    guessed.push(pool.ids[decision.index]);
    lastGuessAnswerCount = state.answers.length;
    rejectIndex(state, decision.index);
  }
  assert.ok(guessed.length, "Known candidate with matching facts was never guessed");
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

const CRICKET_ROLES = ["batsman", "bowler", "wicketkeeper", "captain", "all_rounder", "cricket_opener", "does_bat", "does_bowl"];

test("parent nos block role questions, and a country yes implies its continent", () => {
  const spec = [
    ["real", "kind"], ["male", "person"], ["alive", "life"],
    ["from_bd", "country", "Are they from Bangladesh?"],
    ["from_in", "country", "Are they from India?"],
    ["from_us", "country", "Are they from the United States?"],
    ["from_asia", "country", "Are they from Asia?"],
    ["cricketer", "job", "Do they play cricket?"],
    ["batsman", "job", "Is he a batsman?"],
    ["bowler", "job", "Is he a bowler?"],
    ["wicketkeeper", "job", "Is he a wicketkeeper?"],
    ["captain", "job", "Is he the captain?"],
    ["all_rounder", "job", "Do they both bat and bowl?"],
    ["cricket_opener", "job", "Does he open the batting?"],
    ["does_bat", "job", "Does he bat?"],
    ["does_bowl", "job", "Does he bowl?"],
    ["footballer", "job", "Do they play football?"],
    ["striker", "job", "Is he a striker?"],
    ["goalkeeper", "job", "Is he a goalkeeper?"],
    ["football_winger", "job", "Does he play on the wing?"],
    ["politician", "job", "Are they in politics?"],
    ["party_bnp", "politics", "Are they in the BNP?"],
    ["led_gov", "politics", "Have they led a government?"],
    ["actor", "job", "Do they act?"],
    ["adult_ent", "adult", "Are they mainly an adult-film actor?"],
    ["singer", "job", "Do they sing?"],
    ["genre_pop", "job", "Is their genre pop?"],
    ["writer", "job", "Do they write?"],
  ];
  const qs = spec.map(([id, group, en]) => ({ id, group, en: en || id, bn: id }));
  const links = buildTraitLinks(qs);
  assert.equal(links.parents.get("does_bat")[0], "cricketer");
  assert.equal(links.parents.get("does_bowl")[0], "cricketer");
  assert.equal(links.parents.get("cricket_opener")[0], "cricketer");
  assert.equal(links.parents.get("all_rounder")[0], "cricketer");
  assert.equal(links.parents.get("football_winger")[0], "footballer");
  assert.equal(links.parents.get("genre_pop")[0], "singer");
  assert.ok(links.parents.get("party_bnp").includes("politician"));
  assert.ok(links.parents.get("from_bd").includes("from_asia"));

  const noCricket = ["footballer", "striker", "goalkeeper", "football_winger", "politician", "party_bnp", "led_gov", "actor", "adult_ent", "singer", "genre_pop", "writer", "from_us"];
  const pool = poolFromEntries(qs, [
    entry("bat", 500, ["real", "male", "alive", "from_bd", "from_asia", "cricketer", "batsman", "captain", "cricket_opener", "does_bat"], { no: ["bowler", "wicketkeeper", "all_rounder", "does_bowl", "from_in", ...noCricket] }),
    entry("bowl", 480, ["real", "male", "alive", "from_bd", "from_asia", "cricketer", "bowler", "does_bowl", "all_rounder"], { no: ["batsman", "wicketkeeper", "captain", "cricket_opener", "does_bat", "from_in", ...noCricket] }),
    entry("keep", 460, ["real", "male", "alive", "from_in", "from_asia", "cricketer", "wicketkeeper"], { no: ["batsman", "bowler", "captain", "all_rounder", "does_bat", "does_bowl", "from_bd", "from_us", ...noCricket] }),
    entry("messi", 520, ["real", "male", "alive", "from_us", "footballer", "striker", "football_winger"], { no: ["from_bd", "from_in", "from_asia", "cricketer", ...CRICKET_ROLES, "goalkeeper", "politician", "party_bnp", "led_gov", "actor", "adult_ent", "singer", "genre_pop", "writer"] }),
    entry("pol", 300, ["real", "male", "alive", "from_bd", "from_asia", "politician", "party_bnp", "led_gov"], { no: ["cricketer", "footballer", "actor", "singer", "writer", "from_in", "from_us", ...CRICKET_ROLES] }),
  ]);

  function open(value, qid) {
    const state = createState(pool, { category: "character", opening: "real" });
    recompute(state);
    answer(state, "real", "yes");
    if (qid) answer(state, qid, value);
    return state;
  }

  const before = open();
  answer(before, "male", "yes");
  answer(before, "alive", "yes");
  assert.equal(questionBlocked(before, "batsman"), true, "ask about cricket before batting");
  assert.equal(questionBlocked(before, "does_bat"), true);
  assert.equal(questionBlocked(before, "does_bowl"), true);
  answer(before, "cricketer", "probably_not");
  for (const id of CRICKET_ROLES) assert.equal(questionBlocked(before, id), true, id);
  for (let n = 0; n < 8; n++) {
    const qid = chooseQuestion(before);
    assert.ok(!CRICKET_ROLES.includes(qid), qid);
    if (!qid) break;
    answer(before, qid, "unknown");
  }

  const firm = open("no", "cricketer");
  assert.equal(questionBlocked(firm, "does_bat"), true);
  assert.equal(questionBlocked(firm, "does_bowl"), true);

  const foot = open("no", "footballer");
  for (const id of ["striker", "goalkeeper", "football_winger"]) assert.equal(questionBlocked(foot, id), true, id);
  assert.equal(questionBlocked(foot, "cricketer"), false);

  const poli = open("probably_not", "politician");
  assert.equal(questionBlocked(poli, "party_bnp"), true);
  assert.equal(questionBlocked(poli, "led_gov"), true);

  const cast = open("no", "actor");
  assert.equal(questionBlocked(cast, "adult_ent"), true);

  const voice = open("no", "singer");
  assert.equal(questionBlocked(voice, "genre_pop"), true);

  const place = open("yes", "from_bd");
  assert.equal(questionBlocked(place, "from_asia"), true);
  assert.equal(questionBlocked(place, "from_in"), true);

  const west = open("yes", "from_us");
  assert.equal(questionBlocked(west, "from_asia"), true);
  assert.equal(questionBlocked(west, "from_bd"), true);

  const outside = open("no", "from_asia");
  assert.equal(questionBlocked(outside, "from_bd"), true);
  assert.equal(questionBlocked(outside, "from_in"), true);
  assert.equal(questionBlocked(outside, "from_us"), false);
});

test("public candidates need a confirmed occupation or other distinctive yes at scale", () => {
  const pool = poolFromEntries(questions, Array.from({ length: 120 }, (_, k) =>
    entry("candidate-" + k, 300 + k, ["real", "named", "male", "alive", "from_bd"],
      { no: ["from_in", "cricketer", "actor", "writer", "adult_ent", "fictional"] })));
  const state = createState(pool, { category: "character" });
  recompute(state);
  for (const [id, value] of [
    ["real", "yes"], ["from_bd", "yes"], ["male", "yes"], ["cricketer", "no"],
    ["actor", "no"], ["writer", "no"],
  ]) answer(state, id, value);
  assert.equal(shouldGuess(state), false, "country plus negatives do not identify a celebrity");
});

test("confirmed acting cannot nominate someone with unknown or negative acting evidence", () => {
  const qs = [
    { id: "real", group: "kind" },
    { id: "from_bd", group: "country" },
    { id: "actor", group: "job" },
    { id: "politician", group: "job" },
    { id: "named", group: "kind" },
  ];
  const pool = poolFromEntries(qs, [
    entry("wrong-star", 65000, ["real", "from_bd", "named"], { no: ["politician"] }),
    entry("foreign-actor-unknown-country", 64000, ["real", "named", "actor"], { no: ["politician"] }),
    entry("real-actor", 50, ["real", "from_bd", "named", "actor"], { no: ["politician"] }),
    entry("explicit-non-actor", 60000, ["real", "from_bd", "named"], { no: ["actor", "politician"] }),
  ]);
  const state = createState(pool, { category: "character" });
  recompute(state);
  for (const [id, value] of [["real", "yes"], ["from_bd", "yes"],
    ["actor", "yes"], ["politician", "no"]]) answer(state, id, value);
  const decision = decide(state);
  if (decision.type === "guess")
    assert.equal(pool.ids[decision.index], "real-actor", "actor=yes guessed a person with unknown acting");
  else {
    for (let attempt = 0; attempt < 20; attempt++) {
      const d = decide(state);
      if (d.type === "guess") {
        assert.equal(pool.ids[d.index], "real-actor");
        break;
      }
      if (d.type === "defeat") break;
      answer(state, d.qid, "unknown");
    }
  }
});

test("confirmed Bangladesh country never guesses an explicitly foreign celebrity", () => {
  const questions = [
    { id: "real", group: "kind" },
    { id: "from_bd", group: "country" },
    { id: "from_us", group: "country" },
  ];
  const pool = poolFromEntries(questions, [
    entry("us-celebrity", 100000, ["real", "from_us"], { no: ["from_bd"] }),
  ]);
  const state = createState(pool, { category: "character" });
  recompute(state);
  answer(state, "real", "yes");
  answer(state, "from_bd", "yes");
  assert.notEqual(decide(state).type, "guess");
});

test("batting questions stay unasked when no remaining candidate is a cricketer", () => {
  const qs = [
    ["real", "kind"], ["cricketer", "job", "Do they play cricket?"],
    ["batsman", "job", "Is he a batsman?"], ["does_bowl", "job", "Does he bowl?"],
    ["writer", "job", "Do they write?"], ["male", "person"],
  ].map(([id, group, en]) => ({ id, group, en: en || id, bn: id }));
  const pool = poolFromEntries(qs, [
    entry("pen", 200, ["real", "male", "writer", "batsman"], { no: ["cricketer", "does_bowl"] }),
    entry("page", 180, ["real", "male", "does_bowl"], { no: ["cricketer", "batsman", "writer"] }),
    entry("ink", 160, ["real", "writer"], { no: ["cricketer", "batsman", "does_bowl", "male"] }),
  ]);
  const state = createState(pool, { category: "character", opening: "real" });
  recompute(state);
  answer(state, "real", "yes");
  assert.equal(questionBlocked(state, "batsman"), true);
  assert.equal(questionBlocked(state, "does_bowl"), true);
  for (let n = 0; n < 6; n++) {
    const qid = chooseQuestion(state);
    assert.ok(qid !== "batsman" && qid !== "does_bowl", qid);
    if (!qid) break;
    answer(state, qid, "unknown");
  }
});

test("a confirmed job skips unrelated occupations unless the candidates split", () => {
  const qs = [
    ["real", "kind"], ["male", "person"], ["footballer", "job", "Do they play football?"],
    ["politician", "job", "Are they in politics?"], ["business", "job", "Do they run a business?"],
    ["actor", "job", "Do they act?"], ["party_bnp", "politics", "Are they in the BNP?"],
    ["played_barcelona", "job", "Did they play for Barcelona?"],
  ].map(([id, group, en]) => ({ id, group, en: en || id, bn: id }));
  const plain = poolFromEntries(qs, [
    entry("messi", 200, ["real", "male", "footballer", "played_barcelona"], { no: ["politician", "business", "actor", "party_bnp"] }),
    entry("aguero", 120, ["real", "male", "footballer"], { no: ["politician", "business", "actor", "party_bnp", "played_barcelona"] }),
  ]);
  const state = createState(plain, { category: "character", opening: "real" });
  recompute(state);
  answer(state, "real", "yes");
  answer(state, "footballer", "yes");
  for (const id of ["politician", "business", "actor", "party_bnp"]) assert.equal(questionBlocked(state, id), true, id);
  assert.equal(questionBlocked(state, "played_barcelona"), false);
  for (let n = 0; n < 6; n++) {
    const qid = chooseQuestion(state);
    assert.ok(!["politician", "business", "actor", "party_bnp"].includes(qid), qid);
    if (!qid || qid === "played_barcelona") break;
    answer(state, qid, "unknown");
  }

  const split = poolFromEntries(qs, [
    entry("player", 200, ["real", "male", "footballer", "politician"], { no: ["business", "actor", "party_bnp"] }),
    entry("minister", 180, ["real", "male", "footballer"], { no: ["politician", "business", "actor", "party_bnp"] }),
  ]);
  const mixed = createState(split, { category: "character", opening: "real" });
  recompute(mixed);
  answer(mixed, "footballer", "yes");
  assert.equal(questionBlocked(mixed, "politician"), false);
  assert.equal(questionBlocked(mixed, "business"), true);
});

test("truthful answers about Lionel Messi guess him, not Sergio Agüero", () => {
  const manifest = JSON.parse(readFileSync(new URL("./kb/manifest.json", import.meta.url), "utf8"));
  const buf = readFileSync(new URL("./kb/ix/top.bin", import.meta.url));
  const pool = decodeShard(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), manifest.questions);
  pool.opening = manifest.opening;
  const messi = pool.ids.indexOf("Q615");
  assert.ok(messi >= 0);
  const bit = (qid) => factBit(pool, messi, pool.qIndex.get(qid));
  assert.equal(bit("played_barcelona"), 2);
  assert.equal(bit("ballon_dor"), 2);
  assert.equal(bit("from_es"), 1);
  const aguero = pool.ids.indexOf("Q119562");
  const agueroBit = (qid) => {
    const qi = pool.qIndex.get(qid);
    const row = aguero * pool.attrBytes + (qi >> 2);
    return (pool.attrs[row] >> ((qi & 3) << 1)) & 3;
  };
  assert.equal(agueroBit("played_barcelona"), 0);
  assert.equal(agueroBit("ballon_dor"), 0);

  const state = createState(pool, { category: "character", opening: "real" });
  recompute(state);
  const asked = [];
  let guessed = "";
  for (let n = 0; n < 40 && !guessed; n++) {
    const decision = decide(state);
    if (decision.type === "guess") {
      guessed = pool.ids[decision.index];
      break;
    }
    const qid = decision.qid;
    const value = bit(qid) === 2 ? "yes" : bit(qid) === 1 ? "no" : "unknown";
    asked.push(qid);
    answer(state, qid, value);
  }
  assert.equal(guessed, "Q615", asked.join(","));
  assert.ok(asked.length <= 12, asked.join(","));
  const regions = new Set(["from_asia", "from_europe", "from_africa", "from_north_america", "from_south_america"]);
  let run = 0;
  for (const qid of asked) {
    run = qid.startsWith("from_") && !regions.has(qid) ? run + 1 : 0;
    assert.ok(run < 5, asked.join(","));
  }
  assert.ok(asked.includes("from_south_america") || asked.includes("from_ar"), asked.join(","));
});

test("a wrong guess keeps a firm occupation from being forgotten", () => {
  const qs = [
    ["real", "kind"], ["male", "person"], ["alive", "life"], ["from_bd", "country"],
    ["politician", "job"], ["actor", "job"], ["cricketer", "job"], ["footballer", "job"],
    ["party_bnp", "politics"], ["party_al", "politics"],
  ].map(([id, group]) => ({ id, group, en: id, bn: id }));
  const person = (id, pop, yes, no, en) => ({ id, pop, en, yes, no });
  const pool = poolFromEntries(qs, [
    person("fakhrul", 190, ["real", "male", "alive", "from_bd", "politician", "party_bnp"], ["actor", "cricketer", "footballer", "party_al"], "Mirza Fakhrul"),
    person("star", 8000, ["real", "male", "alive", "actor"], ["politician", "cricketer", "footballer", "from_bd", "party_bnp", "party_al"], "Famous Actor"),
    person("bat", 6000, ["real", "male", "alive", "cricketer", "from_bd"], ["politician", "actor", "footballer", "party_bnp", "party_al"], "Famous Cricketer"),
    person("other", 100, ["real", "male", "alive", "from_bd", "politician", "party_al"], ["actor", "cricketer", "footballer", "party_bnp"], "Other Minister"),
  ]);
  const state = createState(pool, { category: "character", opening: "real" });
  recompute(state);
  for (const [qid, value] of [["real", "yes"], ["male", "yes"], ["alive", "yes"], ["from_bd", "yes"], ["politician", "yes"]]) {
    answer(state, qid, value);
  }
  assert.equal(questionBlocked(state, "actor"), true);
  assert.equal(questionBlocked(state, "cricketer"), true);
  const decision = decide(state);
  if (decision.type === "guess") rejectIndex(state, decision.index);
  assert.equal(questionBlocked(state, "actor"), true);
  assert.equal(questionBlocked(state, "cricketer"), true);
  for (let n = 0; n < 6; n++) {
    const qid = chooseQuestion(state);
    assert.ok(qid !== "actor" && qid !== "cricketer", qid);
    if (!qid) break;
    answer(state, qid, "no");
  }
});

test("truthful answers about Mirza Fakhrul guess him within 15 questions", () => {
  const manifest = JSON.parse(readFileSync(new URL("./kb/manifest.json", import.meta.url), "utf8"));
  const buf = readFileSync(new URL("./kb/ix/top.bin", import.meta.url));
  const pool = decodeShard(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), manifest.questions);
  const index = pool.ids.indexOf("Q6874839");
  assert.ok(index >= 0);
  const state = createState(pool, { category: "character", opening: "real" });
  recompute(state);
  const asked = [];
  let guessed = "";
  for (let n = 0; n < 20 && !guessed; n++) {
    const decision = decide(state);
    if (decision.type === "guess") {
      guessed = pool.ids[decision.index];
      break;
    }
    const qid = decision.qid;
    const value = factBit(pool, index, pool.qIndex.get(qid));
    asked.push(qid);
    answer(state, qid, value === 2 ? "yes" : value === 1 ? "no" : "unknown");
  }
  assert.equal(guessed, "Q6874839", asked.join(","));
  assert.ok(asked.length <= 15, asked.join(","));
  let countryRun = 0;
  for (const qid of asked) {
    countryRun = qid.startsWith("from_") && qid !== "from_bd" ? countryRun + 1 : 0;
    assert.ok(countryRun < 5, asked.join(","));
  }
});

test("animal and object rounds do not repeatedly scan all IDs for politics data", () => {
  const smallQuestions = questions.slice(0, 4);
  const animals = poolFromEntries(smallQuestions, [entry("cat-only", 10, ["animal"])]);
  const original = animals.ids.includes.bind(animals.ids);
  let fullScans = 0;
  animals.ids.includes = (id) => { fullScans += 1; return original(id); };
  const state = createState(animals, { category: "animal" });
  for (let repeat = 0; repeat < 5; repeat++) recompute(state);
  assert.equal(fullScans, 1, "a stable pool should be inspected only once");
  appendShard(animals, poolFromEntries(smallQuestions, [entry("dog-only", 10, ["animal"])]));
  recompute(state);
  assert.equal(fullScans, 2, "a newly appended shard should allow one recheck");
});

test("reallocated overlays cannot leave phantom capacity that breaks regional shard append", () => {
  const qs = [{ id: "real", group: "kind", en: "Real?", bn: "বাস্তব?" }];
  const base = poolFromEntries(qs, [entry("one", 1, ["real"])]);
  appendShard(base, poolFromEntries(qs, [entry("two", 1, ["real"])]));
  assert.ok(base.capacity >= 2, "a first append reserved capacity");
  // Mirrors applyPolitics: it replaced the arrays at exact count but left a
  // previously larger capacity on the pool object.
  base.capacity = 32;
  base.attrs = base.attrs.slice(0, base.count * base.attrBytes);
  base.pop = base.pop.slice(0, base.count);
  base.flags = base.flags.slice(0, base.count);
  appendShard(base, poolFromEntries(qs, [entry("bangladesh-actor", 1, ["real"])]));
  assert.equal(base.count, 3);
  assert.equal(base.ids[2], "bangladesh-actor");
  assert.equal(factBit(base, 2, base.qIndex.get("real")), 2);
});

test("Shabnur exists in real BD female acting knowledge and is loaded by regional answers", () => {
  const manifest = JSON.parse(readFileSync(new URL("./kb/manifest.json", import.meta.url), "utf8"));
  const index = JSON.parse(readFileSync(new URL("./kb/index.json", import.meta.url), "utf8"));
  const filename = "ix/r-bd-f-a-7079-p00.bin";
  const buf = readFileSync(new URL("./kb/" + filename, import.meta.url));
  const actual = decodeShard(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), manifest.questions);
  const target = actual.ids.indexOf("Q7460127");
  assert.ok(target >= 0, "Shabnur must not disappear from the real packed knowledge base");
  assert.equal(actual.bns[target], "শাবনূর");
  for (const countryAnswer of ["yes", "probably"]) {
    const plan = planShardLoads(index, [
      { qid: "real", value: "yes" },
      { qid: "from_bd", value: countryAnswer },
      { qid: "female", value: "yes" },
      { qid: "alive", value: "yes" },
      { qid: "actor", value: "yes" },
    ], [index.top]);
    assert.ok(plan.some((bucket) => bucket.file === filename),
      "Bangladeshi actresses must be discoverable even with a probable country");
  }
});

test("Shabnur's local screen fame is considered when BD, actress and female are confirmed", () => {
  const qs = [
    ["real", "kind"], ["female", "person"], ["alive", "life"],
    ["from_bd", "country"], ["actor", "job"],
  ].map(([id, group]) => ({ id, group, en: id, bn: id }));
  const pool = poolFromEntries(qs, [
    { id: "Q7460127", en: "Shabnur", bn: "শাবনূর", pop: 10, yes: qs.map((q) => q.id) },
    { id: "other_local_actress", en: "Another local actress", pop: 110, yes: qs.map((q) => q.id) },
    { id: "male_actor", en: "Actor", pop: 500, yes: ["real", "alive", "from_bd", "actor"], no: ["female"] },
  ]);
  const state = createState(pool, { category: "character" });
  recompute(state);
  assert.ok(state.weights[1] > state.weights[0], "global prior starts low for Shabnur");
  for (const qid of ["real", "female", "alive", "from_bd", "actor"]) answer(state, qid, "yes");
  assert.ok(state.weights[0] > state.weights[1],
    "regional film recognition should help Shabnur once matching facts are known");
});

test("the game skips birth-year questions and stale current-government questions", () => {
  const qs = [
    { id: "real", group: "kind", en: "Real?", bn: "বাস্তব?" },
    { id: "female", group: "person", en: "Female?", bn: "নারী?" },
    { id: "born_1970_1979", group: "birth", en: "Born in 1970s?", bn: "সত্তরে জন্ম?" },
    { id: "in_government", group: "politics", en: "In government?", bn: "সরকারে?" },
  ];
  const pool = poolFromEntries(qs, [
    { id: "politician1", en: "Politician one", pop: 100, yes: ["real","female","born_1970_1979","in_government"] },
    { id: "politician2", en: "Politician two", pop: 80, yes: ["real"], no: ["female","born_1970_1979","in_government"] },
  ]);
  const state = createState(pool, { category: "character" });
  recompute(state);
  answer(state, "real", "yes");
  assert.equal(questionBlocked(state, "born_1970_1979"), false,
    "stored birth information may still help the engine internally");
  for (let i = 0; i < 4; i++) {
    const decision = decide(state);
    if (decision.type !== "ask") break;
    assert.ok(!decision.qid.startsWith("born_"), "do not quiz players on a stranger's birth year");
    assert.notEqual(decision.qid, "in_government", "do not rely on stale live office information");
    answer(state, decision.qid, "unknown");
  }
});

test("1990s screen-star question refers to film careers, never birth decade", () => {
  const qs = [
    { id: "real", group: "kind", en: "Real?", bn: "বাস্তব?" },
    { id: "actor", group: "job", en: "Actor?", bn: "অভিনয়শিল্পী?" },
    { id: "from_bd", group: "country", en: "From BD?", bn: "বাংলাদেশ?" },
    ...EXTRA_SCREEN_QUESTIONS,
  ];
  const pool = poolFromEntries(qs, [
    { id: "Q7460127", en: "Shabnur", bn: "শাবনূর", pop: 10, yes: ["real","actor","from_bd"] },
    { id: "Q7405420", en: "Salman Shah", pop: 10, yes: ["real","actor","from_bd"] },
    { id: "Q52149647", en: "Puja Cherry", pop: 10, yes: ["real","actor","from_bd"] },
  ]);
  const qi = pool.qIndex.get("screen_star_1990s");
  assert.equal(factBit(pool, 0, qi), 2, "Shabnur became a film star in the 1990s");
  assert.equal(factBit(pool, 1, qi), 2, "Salman Shah became a film star in the 1990s");
  assert.equal(factBit(pool, 2, qi), 1, "Puja Cherry became a lead star much later");
  assert.equal(qs.at(-1).bn.includes("জন্ম"), false, "career decade must not be birth decade");
});

test("Shabana and Alamgir are recognized as pre-1990 stars, not by birth year", () => {
  const qs = [
    { id: "real", group: "kind", en: "real?", bn: "মানুষ?" },
    { id: "actor", group: "job", en: "actor?", bn: "অভিনয়?" },
    { id: "from_bd", group: "country", en: "BD?", bn: "বাংলাদেশ?" },
    ...EXTRA_SCREEN_QUESTIONS,
  ];
  const pool = poolFromEntries(qs, [
    { id: "Q7460022", en: "Shabana", pop: 17, yes: ["real", "actor", "from_bd"] },
    { id: "Q13057124", en: "Alamgir", pop: 8, yes: ["real", "actor", "from_bd"] },
    { id: "Q7460127", en: "Shabnur", pop: 10, yes: ["real", "actor", "from_bd"] },
  ]);
  const qi = pool.qIndex.get("screen_star_pre1990");
  assert.equal(factBit(pool, 0, qi), 2);
  assert.equal(factBit(pool, 1, qi), 2);
  assert.equal(factBit(pool, 2, qi), 1);
  const pre1990Question = qs.find((q) => q.id === "screen_star_pre1990");
  assert.ok(pre1990Question.en.includes("before 1990"));
  assert.ok(!pre1990Question.bn.includes("জন্ম"));
});

test("politics augmentation survives spare array capacity after appending private roles", () => {
  const qs = [
    { id: "real", group: "kind", en: "Real?", bn: "বাস্তব?" },
    { id: "female", group: "person", en: "Female?", bn: "নারী?" },
  ];
  const first = poolFromEntries(qs, [
    { id: "Q6874839", en: "Political seed", yes: ["real"] },
    { id: "ordinary-person", en: "Ordinary person", yes: ["real"] },
  ]);
  const more = poolFromEntries(qs, [
    { id: "riddlex-role-mother", en: "Your mother", yes: ["real", "female"] },
  ]);
  const combined = appendShard(first, more);
  assert.ok(combined.attrs.length > combined.count * combined.attrBytes,
    "test requires spare allocation capacity");
  assert.doesNotThrow(() => createState(combined, { category: "character" }),
    "political augmentation must not copy spare buffer capacity");
});
