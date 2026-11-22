import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { appendShard, planShardLoads, poolFromEntries } from "./kb.js";

const sample = {
  top: "ix/top.bin",
  topBytes: 1000,
  fiction: "ix/fiction.bin",
  fictionBytes: 400,
  budget: 5000,
  buckets: [
    { c: "bd", g: "f", l: "a", b: "5069", part: 0, file: "ix/r-bd-f-a-5069-p00.bin", bytes: 200 },
    { c: "bd", g: "m", l: "a", b: "5069", part: 0, file: "ix/r-bd-m-a-5069-p00.bin", bytes: 220 },
    { c: "us", g: "m", l: "a", b: "5069", part: 0, file: "ix/r-us-m-a-5069-p00.bin", bytes: 3000 },
    { c: "us", g: "m", l: "a", b: "5069", part: 1, file: "ix/r-us-m-a-5069-p01.bin", bytes: 3000 },
    { c: "us", g: "m", l: "a", b: "8089", part: 0, file: "ix/r-us-m-a-8089-p00.bin", bytes: 3000 },
  ],
};

function files(answers, loaded = []) {
  return planShardLoads(sample, answers, loaded).map((item) => item.file);
}

test("a character round starts from the popular shard alone", () => {
  assert.deepEqual(files([]), ["ix/top.bin"]);
});

test("a firm country and gender loads that bucket and skips the rest", () => {
  const plan = files([
    { qid: "real", value: "yes" },
    { qid: "female", value: "yes" },
    { qid: "alive", value: "yes" },
    { qid: "from_bd", value: "yes" },
  ]);
  assert.deepEqual(plan, ["ix/top.bin", "ix/r-bd-f-a-5069-p00.bin"]);
});

test("a firm fictional answer loads fiction instead of every country", () => {
  const plan = files([{ qid: "real", value: "no" }, { qid: "fictional", value: "yes" }]);
  assert.deepEqual(plan, ["ix/top.bin", "ix/fiction.bin"]);
});

test("an oversized country waits for a birth answer, then stays inside the budget", () => {
  const open = files([
    { qid: "male", value: "yes" },
    { qid: "alive", value: "yes" },
    { qid: "from_us", value: "yes" },
  ]);
  assert.deepEqual(open, ["ix/top.bin"]);
  const born = planShardLoads(sample, [
    { qid: "male", value: "yes" },
    { qid: "alive", value: "yes" },
    { qid: "from_us", value: "yes" },
    { qid: "born_1950_1969", value: "yes" },
  ], []);
  const bytes = born.reduce((sum, item) => sum + item.bytes, 0);
  assert.ok(bytes <= sample.budget, bytes);
  assert.ok(born.some((item) => item.file.includes("5069")));
  assert.ok(!born.some((item) => item.file.includes("8089")));
});

test("the shipped index keeps a Bangladeshi woman under a few megabytes", async () => {
  const index = JSON.parse(await readFile(new URL("./kb/index.json", import.meta.url), "utf8"));
  const plan = planShardLoads(index, [
    { qid: "real", value: "yes" },
    { qid: "female", value: "yes" },
    { qid: "alive", value: "yes" },
    { qid: "from_bd", value: "yes" },
  ], []);
  const bytes = plan.reduce((sum, item) => sum + item.bytes, 0);
  assert.ok(plan[0].file.endsWith("top.bin"));
  assert.ok(plan.some((item) => item.file.includes("r-bd-f-a")));
  assert.ok(!plan.some((item) => item.file.includes("r-us-")));
  assert.ok(bytes < 4_000_000, bytes);
});

test("cached decoded shards remain unchanged across fresh game pools", () => {
  const questions = [{ id: "real" }];
  const one = poolFromEntries(questions, [{ id: "one", en: "One", yes: ["real"] }]);
  const two = poolFromEntries(questions, [{ id: "two", en: "Two", no: ["real"] }]);
  const firstGame = appendShard(null, one);
  assert.notStrictEqual(firstGame, one);
  appendShard(firstGame, two);
  assert.equal(firstGame.count, 2);
  assert.equal(one.count, 1);
  assert.deepEqual(one.ids, ["one"]);
  const secondGame = appendShard(null, one);
  assert.equal(secondGame.count, 1);
  assert.deepEqual(secondGame.ids, ["one"]);
  secondGame.ens[0] = "changed";
  assert.equal(one.ens[0], "One");
});

test("unknown and multi-country entries become reachable after the opening", () => {
  const index = {
    top: "ix/top.bin", topBytes: 100,
    budget: 1500,
    buckets: [
      { c: "xx", g: "m", l: "a", b: "8089", part: 0, file: "ix/unknown.bin", bytes: 400 },
      { c: "multi", g: "m", l: "a", b: "8089", part: 0, file: "ix/multi.bin", bytes: 350 },
      { c: "us", g: "m", l: "a", b: "8089", part: 0, file: "ix/us.bin", bytes: 400 },
    ],
  };
  const answers = [
    { qid: "real", value: "yes" }, { qid: "male", value: "yes" },
    { qid: "alive", value: "yes" }, { qid: "actor", value: "yes" },
    { qid: "from_asia", value: "yes" }, { qid: "scientist", value: "no" },
    { qid: "youtube", value: "no" }, { qid: "writer", value: "no" },
  ];
  const plan = planShardLoads(index, answers, []);
  assert.ok(plan.some((row) => row.file === "ix/unknown.bin"));
  assert.ok(plan.some((row) => row.file === "ix/multi.bin"));
  assert.ok(!plan.some((row) => row.file === "ix/us.bin"));
  assert.ok(plan.reduce((sum, row) => sum + row.bytes, 0) <= index.budget);
  assert.deepEqual(planShardLoads(index, answers, plan.map((row) => row.file)), []);
});

test("later questions cannot exceed the cumulative knowledge transfer budget", () => {
  const already = ["ix/top.bin", "ix/r-us-m-a-5069-p00.bin"];
  const plan = planShardLoads(sample, [
    { qid: "real", value: "yes" }, { qid: "male", value: "yes" },
    { qid: "alive", value: "yes" }, { qid: "from_us", value: "yes" },
    { qid: "born_1950_1969", value: "yes" },
  ], already);
  const spent = 1000 + 3000 + plan.reduce((sum, item) => sum + item.bytes, 0);
  assert.ok(spent <= sample.budget);
  assert.ok(!plan.some((item) => already.includes(item.file)));
});
