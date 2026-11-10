import { readFile } from "node:fs/promises";
import { answer, createState, decide, rejectIndex, recompute } from "./engine.js";
import { decodeShard, mergePools } from "./kb.js";

const manifest = JSON.parse(await readFile(new URL("./kb/manifest.json", import.meta.url), "utf8"));
const shards = await Promise.all(manifest.shards.map(async (name) => {
  const buffer = await readFile(new URL(`./kb/${name}`, import.meta.url));
  return decodeShard(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), manifest.questions);
}));
const pool = mergePools(shards);
pool.opening = manifest.opening;
for (const [id, aliases] of Object.entries(manifest.aliases || {})) pool.aliasMap.set(id, aliases);

function attr(index, qi) {
  const base = index * pool.attrBytes + (qi >> 2);
  return (pool.attrs[base] >> ((qi & 3) << 1)) & 3;
}

function play(index) {
  const state = createState(pool, { opening: pool.opening });
  recompute(state);
  const asked = [];
  for (let step = 0; step < 26; step++) {
    const decision = decide(state);
    if (decision.type === "guess") {
      if (decision.index === index) return { ok: true, questions: asked.length, guesses: state.guesses + 1, id: pool.ids[index] };
      rejectIndex(state, decision.index);
      if (state.guesses >= 4) return { ok: false, questions: asked.length, guess: pool.ens[decision.index] };
      continue;
    }
    if (decision.type !== "ask") return { ok: false, questions: asked.length, reason: "defeat" };
    const bit = attr(index, pool.qIndex.get(decision.qid));
    const value = bit === 2 ? "yes" : bit === 1 ? "no" : "unknown";
    answer(state, decision.qid, value);
    asked.push(decision.qid);
  }
  return { ok: false, questions: asked.length, reason: "limit" };
}

function find(label) {
  const key = label.toLowerCase();
  for (let index = 0; index < pool.count; index++) {
    const names = [pool.ens[index], pool.bns[index], ...(pool.aliasMap.get(pool.ids[index]) || [])];
    if (names.some((name) => (name || "").toLowerCase() === key)) return index;
  }
  return -1;
}

const targets = [
  ["Shakib Al Hasan", "Q266104"],
  ["Himu", "Q5765519"],
  ["Tom", "Q1839152"],
  ["Cat", "Q146"],
  ["Pressure cooker", "Q271997"],
];
const report = { total: pool.count, opening: pool.opening, counts: manifest.counts, adultNameOnly: manifest.adultNameOnly, images: manifest.images, targets: {} };
for (const [name, id] of targets) {
  const byId = pool.ids.indexOf(id);
  const index = byId >= 0 ? byId : find(name);
  report.targets[name] = index < 0 ? { ok: false, reason: "missing" } : { ...play(index), resolved: pool.ids[index], name: pool.ens[index] };
}

const sample = [];
for (let index = 0; index < pool.count && sample.length < 40; index += Math.max(1, Math.floor(pool.count / 40))) {
  if ((pool.pop[index] || 0) < 40) continue;
  let known = 0;
  for (let qi = 0; qi < pool.questions.length; qi++) if (attr(index, qi) !== 0) known++;
  if (known >= 8) sample.push(index);
}
let hits = 0;
for (const index of sample) if (play(index).ok) hits++;
report.sample = { tried: sample.length, hits, rate: sample.length ? hits / sample.length : 0 };
console.log(JSON.stringify(report, null, 2));
process.exit(Object.values(report.targets).every((item) => item.ok) ? 0 : 1);
