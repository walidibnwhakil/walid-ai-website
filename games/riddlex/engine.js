// Bayesian question picker. Unknown facts do not move the odds.
// A contradictory answer lowers an entity sharply but does not erase it.

export const ANSWERS = ["yes", "probably", "probably_not", "no", "unknown"];

const MATCH = {
  yes: { 2: 0.9, 1: 0.16, 0: 1 },
  probably: { 2: 0.72, 1: 0.38, 0: 1 },
  probably_not: { 2: 0.38, 1: 0.72, 0: 1 },
  no: { 2: 0.16, 1: 0.9, 0: 1 },
  unknown: { 2: 0.78, 1: 0.78, 0: 1 },
};

const LOG_MATCH = {};
for (const [answer, table] of Object.entries(MATCH)) {
  LOG_MATCH[answer] = {
    0: Math.log(table[0]),
    1: Math.log(table[1]),
    2: Math.log(table[2]),
  };
}

const LATE = new Set([
  "adult_ent", "all_rounder", "wears_yellow", "by_humayun", "by_zafar", "by_ray",
  "chases_mouse", "uses_pressure", "detective_role", "is_mouse",
]);

export function attrAt(attrs, attrBytes, index, qi) {
  const base = index * attrBytes + (qi >> 2);
  return (attrs[base] >> ((qi & 3) << 1)) & 3;
}

export function packAttrBytes(questionIds, yes, no) {
  const bytes = new Uint8Array(Math.ceil(questionIds.length / 4));
  const index = new Map(questionIds.map((id, i) => [id, i]));
  const write = (id, value) => {
    const qi = index.get(id);
    if (qi == null) return;
    const slot = qi >> 2;
    const shift = (qi & 3) << 1;
    bytes[slot] = (bytes[slot] & ~(3 << shift)) | ((value & 3) << shift);
  };
  for (const id of yes || []) write(id, 2);
  for (const id of no || []) write(id, 1);
  return bytes;
}

function binaryEntropy(p) {
  if (p <= 0 || p >= 1) return 0;
  return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
}

export function createState(pool, options = {}) {
  return {
    pool,
    answers: [],
    rejected: new Set(),
    guesses: 0,
    sinceGuess: 0,
    opening: options.opening || null,
    weights: new Float64Array(pool.count),
    alive: [],
  };
}

function massOf(state, qi, bit) {
  const { pool, weights, alive } = state;
  let total = 0;
  for (let k = 0; k < alive.length; k++) {
    const i = alive[k];
    const bitValue = attrAt(pool.attrs, pool.attrBytes, i, qi);
    if (bitValue === bit) total += weights[i];
  }
  return total;
}

export function recompute(state) {
  const { pool, answers, rejected } = state;
  const n = pool.count;
  const logW = new Float64Array(n);
  let max = -Infinity;
  for (let i = 0; i < n; i++) {
    if (rejected.has(i) || pool.flags[i] & 128) {
      logW[i] = -Infinity;
      continue;
    }
    let score = Math.log((pool.pop[i] || 1) + 1);
    for (let a = 0; a < answers.length; a++) {
      const answer = answers[a];
      if (answer.value === "unknown") continue;
      const bit = attrAt(pool.attrs, pool.attrBytes, i, answer.qi);
      score += LOG_MATCH[answer.value][bit];
    }
    logW[i] = score;
    if (score > max) max = score;
  }
  const weights = state.weights;
  const alive = [];
  let sum = 0;
  const floor = max - 14;
  for (let i = 0; i < n; i++) {
    if (logW[i] < floor) {
      weights[i] = 0;
      continue;
    }
    const w = Math.exp(logW[i] - max);
    weights[i] = w;
    sum += w;
    alive.push(i);
  }
  if (sum > 0) {
    for (let k = 0; k < alive.length; k++) weights[alive[k]] /= sum;
  }
  state.alive = alive;
  return state;
}

function topTwo(state) {
  let best = -1;
  let second = -1;
  let bestP = 0;
  let secondP = 0;
  const { alive, weights } = state;
  for (let k = 0; k < alive.length; k++) {
    const i = alive[k];
    const w = weights[i];
    if (w > bestP) {
      second = best;
      secondP = bestP;
      best = i;
      bestP = w;
    } else if (w > secondP) {
      second = i;
      secondP = w;
    }
  }
  return { best, second, bestP, secondP };
}

export function shouldGuess(state) {
  const asked = state.answers.length;
  if (!state.alive.length) return false;
  const { bestP, secondP } = topTwo(state);
  if (!(bestP > 0)) return false;
  const ratio = secondP > 0 ? bestP / secondP : 99;
  if (state.guesses > 0 && state.sinceGuess < 2 && bestP < 0.9) return false;
  if (asked >= 20) return true;
  if (asked < 7 && !(bestP >= 0.86 && ratio >= 6)) return false;
  if (bestP >= 0.62 && ratio >= 3.2) return true;
  if (asked >= 14 && bestP >= 0.34 && ratio >= 2.2) return true;
  return false;
}

function sampleAlive(state, cap) {
  const alive = state.alive;
  if (alive.length <= cap) return alive;
  const weights = state.weights;
  const ranked = alive.slice().sort((a, b) => weights[b] - weights[a]);
  const picked = new Set(ranked.slice(0, 800));
  const need = cap - picked.size;
  const step = Math.max(1, Math.floor(alive.length / need));
  for (let i = 0; i < alive.length && picked.size < cap; i += step) picked.add(alive[i]);
  return [...picked];
}

function gainOn(state, qi, rows) {
  const { pool, weights } = state;
  let yes = 0;
  let no = 0;
  let total = 0;
  for (let k = 0; k < rows.length; k++) {
    const i = rows[k];
    const w = weights[i];
    if (w <= 0) continue;
    total += w;
    const bit = attrAt(pool.attrs, pool.attrBytes, i, qi);
    if (bit === 2) yes += w;
    else if (bit === 1) no += w;
  }
  const known = yes + no;
  if (known <= 0 || total <= 0 || known < total * 0.07) return 0;
  return binaryEntropy(yes / known) * (known / total);
}

function yesMass(state, id, rows) {
  const qi = state.pool.qIndex.get(id);
  if (qi == null) return 0;
  const { pool, weights } = state;
  const use = rows || state.alive;
  let yes = 0;
  let total = 0;
  for (let k = 0; k < use.length; k++) {
    const i = use[k];
    const weight = weights[i];
    total += weight;
    if (attrAt(pool.attrs, pool.attrBytes, i, qi) === 2) yes += weight;
  }
  return total > 0 ? yes / total : 0;
}

export function adultAllowed(state) {
  if (state.answers.length < 10) return false;
  const rows = state.alive.length > 8000 ? sampleAlive(state, 5000) : state.alive;
  const real = yesMass(state, "real", rows);
  const actor = yesMass(state, "actor", rows);
  const adult = yesMass(state, "adult_ent", rows);
  if (real < 0.45 || actor < 0.22) return false;
  if (adult < 0.012 || adult > 0.92) return false;
  for (const blocked of ["cricketer", "politician", "scientist", "writer", "footballer", "athlete"]) {
    const limit = blocked === "writer" || blocked === "athlete" ? 0.42 : 0.38;
    if (yesMass(state, blocked, rows) >= limit) return false;
  }
  return true;
}

function gated(state, question, rows) {
  const id = question.id;
  const group = question.group;
  if (LATE.has(id) && state.answers.length < 6 && id !== "adult_ent") {
    // Still allowed once the matching topic is likely; the mass checks below do that.
  }
  if (id === "adult_ent") return adultAllowed(state);
  const real = () => yesMass(state, "real", rows);
  const fictional = () => yesMass(state, "fictional", rows);
  const animal = () => yesMass(state, "animal", rows);
  const object = () => yesMass(state, "object", rows);
  if (group === "life" || group === "birth" || group === "country") return real() > 0.48;
  if (group === "job") {
    if (id === "all_rounder") return yesMass(state, "cricketer", rows) > 0.35;
    return real() > 0.42;
  }
  if (group === "person") return real() + fictional() > 0.32 || animal() > 0.55;
  if (group === "fiction") {
    if (fictional() < 0.28) return false;
    if (id === "by_humayun" || id === "by_zafar" || id === "by_ray" || id === "wears_yellow") {
      return yesMass(state, "from_bengali_lit", rows) > 0.22;
    }
    if (id === "chases_mouse" || id === "is_mouse") return animal() > 0.2 || yesMass(state, "from_cartoon", rows) > 0.18;
    if (id === "detective_role") return fictional() > 0.35;
    return true;
  }
  if (group === "animal" || group === "look") {
    if (id === "is_mouse") return animal() > 0.25 || fictional() > 0.25;
    return animal() > 0.28 || (group === "look" && (fictional() > 0.3 || object() > 0.3));
  }
  if (group === "size") return animal() > 0.25 || object() > 0.25;
  if (group === "object") {
    if (object() < 0.32) return false;
    if (id === "uses_pressure") return yesMass(state, "kitchen", rows) > 0.18 || yesMass(state, "cooking", rows) > 0.18;
    return true;
  }
  return true;
}

export function chooseQuestion(state) {
  const { pool, answers } = state;
  if (!state.alive.length) return null;
  const asked = new Set(answers.map((answer) => answer.qid));
  if (!asked.has("real")) return "real";
  const realAnswer = answers.find((item) => item.qid === "real");
  const saidNo = (qid) => answers.some((item) => item.qid === qid && (item.value === "no" || item.value === "probably_not"));
  const saidYes = (qid) => answers.some((item) => item.qid === qid && (item.value === "yes" || item.value === "probably"));
  if (realAnswer && saidNo("real")) {
    if (!asked.has("fictional")) return "fictional";
    if (saidNo("fictional") && !asked.has("animal")) return "animal";
    if (saidNo("fictional") && saidNo("animal") && !asked.has("object")) return "object";
  }
  if (saidYes("fictional") && !asked.has("animal") && yesMass(state, "animal", state.alive.length > 7000 ? sampleAlive(state, 4000) : state.alive) > 0.18 && answers.length < 8) {
    return "animal";
  }
  const rows = state.alive.length > 7000 ? sampleAlive(state, 6000) : state.alive;
  let best = null;
  let bestGain = 0;
  for (let qi = 0; qi < pool.questions.length; qi++) {
    const question = pool.questions[qi];
    if (asked.has(question.id)) continue;
    if (!gated(state, question, rows)) continue;
    let gain = gainOn(state, qi, rows);
    if (question.id === "adult_ent") gain *= answers.length >= 12 ? 1 : 0.2;
    if (gain > bestGain) {
      bestGain = gain;
      best = question.id;
    }
  }
  return bestGain > 0.012 ? best : null;
}

export function answer(state, qid, value) {
  const qi = state.pool.qIndex.get(qid);
  if (qi == null || !ANSWERS.includes(value)) return state;
  state.answers.push({ qid, qi, value });
  state.sinceGuess += 1;
  return recompute(state);
}

export function rewind(state) {
  state.answers.pop();
  state.sinceGuess = Math.max(0, state.sinceGuess - 1);
  return recompute(state);
}

export function rejectIndex(state, index) {
  state.rejected.add(index);
  state.guesses += 1;
  state.sinceGuess = 0;
  return recompute(state);
}

export function decide(state) {
  recompute(state);
  if (!state.alive.length) return { type: "defeat" };
  if (state.guesses >= 4) return { type: "defeat" };
  if (shouldGuess(state)) {
    const { best } = topTwo(state);
    return { type: "guess", index: best };
  }
  const qid = chooseQuestion(state);
  if (!qid) {
    const { best, bestP } = topTwo(state);
    if (best >= 0 && bestP > 0) return { type: "guess", index: best };
    return { type: "defeat" };
  }
  return { type: "ask", qid };
}

export function canPrint(pool, index) {
  if (index < 0 || index >= pool.count) return false;
  if (pool.flags[index] & 1) return false;
  const image = pool.images[index];
  return typeof image === "string" && image.length > 0;
}

export function entityView(pool, index) {
  return {
    id: pool.ids[index],
    en: pool.ens[index],
    bn: pool.bns[index] || "",
    pop: pool.pop[index],
    adult: (pool.flags[index] & 1) === 1,
    image: pool.images[index] || "",
    credit: pool.credits[index] || "",
    aliases: (pool.aliasMap && pool.aliasMap.get(pool.ids[index])) || [],
  };
}

export function displayName(entity, lang) {
  if (lang === "bn" && entity.bn) return entity.bn;
  return entity.en || entity.bn || "";
}
