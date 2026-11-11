import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { planShardLoads } from "./kb.js";

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
