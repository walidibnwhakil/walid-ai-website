// Bayesian question picker. A firm yes or no on a hard fact (country, gender,
// life, real or fictional, human or not) outweighs fame. Probably stays soft.
// Someone ruled out that way only returns if the player contradicts that fact.

const politicsUrl = new URL(
  import.meta.url.includes("?") ? "./politics-extra.js?v=akinator-35" : "./politics-extra.js",
  import.meta.url,
);
const { POLITICS_FACTS, POLITICS_PEOPLE } = await import(politicsUrl);
import { SCREEN_STAR_1990S, SCREEN_STAR_PRE1990, SCREEN_CAREER_DETAILS, SCREEN_LIFE_DETAILS } from "./career-facts.js?v=riddlex-52";
import { PERSONAL_FACTS, PERSONAL_QUESTION_IDS } from "./personal-facts.js";
import { HYPOTHESIS_FACTS } from "./hypothesis-facts.js?v=riddlex-52";

export const ANSWERS = ["yes", "probably", "probably_not", "no", "unknown"];

const MATCH = {
  yes: { 2: 0.92, 1: 0.14, 0: 0.58 },
  probably: { 2: 0.74, 1: 0.36, 0: 0.66 },
  probably_not: { 2: 0.36, 1: 0.74, 0: 0.66 },
  no: { 2: 0.14, 1: 0.92, 0: 0.58 },
  unknown: { 2: 0.8, 1: 0.8, 0: 1 },
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
  if (base < 0 || base >= attrs.length) return 0;
  return (attrs[base] >> ((qi & 3) << 1)) & 3;
}

// Questions added after the shards were packed live in a side array.
// A qi past the stored slots must not read the next person's bytes.
function ensureExtras(pool) {
  const stored = pool.attrBytes * 4;
  const need = pool.questions.length - stored;
  if (need <= 0) return;
  const extraBytes = Math.ceil(need / 4);
  if (pool.extraAttrs && pool.extraBytes === extraBytes && pool._extraCount === pool.count) return;
  const extra = new Uint8Array(pool.count * extraBytes);
  for (const [id, spec] of Object.entries(POLITICS_FACTS)) {
    const index = pool.ids.indexOf(id);
    if (index < 0) continue;
    const write = (qid, value) => {
      const qi = pool.qIndex.get(qid);
      if (qi == null || qi < stored) return;
      const eo = qi - stored;
      const base = index * extraBytes + (eo >> 2);
      const shift = (eo & 3) << 1;
      extra[base] = (extra[base] & ~(3 << shift)) | ((value & 3) << shift);
    };
    for (const qid of spec.yes || []) write(qid, 2);
    for (const qid of spec.no || []) write(qid, 1);
  }
  pool.extraAttrs = extra;
  pool.extraBytes = extraBytes;
  pool._extraCount = pool.count;
}

function regionBit(pool, index, members) {
  let yes = false;
  let nos = 0;
  let present = 0;
  for (const member of members) {
    const mqi = pool.qIndex.get(member);
    if (mqi == null) continue;
    present += 1;
    const bit = attrAt(pool.attrs, pool.attrBytes, index, mqi);
    if (bit === 2) yes = true;
    else if (bit === 1) nos += 1;
  }
  if (yes) return 2;
  if (present > 0 && nos === present) return 1;
  return 0;
}

// The real casebook is the one that already contains Fakhrul. Small test
// pools keep the attributes they were built with.
function applyPolitics(pool) {
  // The test for a politics-capable pool must not rescan every ID for every
  // animal/object candidate. Recheck only when another shard changed the size.
  if (!pool || pool._politicsApplied || pool._politicsChecked === pool.count) return;
  pool._politicsChecked = pool.count;
  if (!pool.ids?.includes("Q6874839")) return;
  pool._politicsApplied = true;
  for (const person of POLITICS_PEOPLE) {
    if (pool.ids.includes(person.id)) continue;
    const count = pool.count + 1;
    const attrs = new Uint8Array(count * pool.attrBytes);
    // appendShard may reserve more capacity than its current count. Copy
    // only populated records, never the unused capacity into a smaller array.
    attrs.set(pool.attrs.subarray(0, pool.count * pool.attrBytes));
    const packed = packAttrBytes(pool.questions.map((question) => question.id), person.yes, person.no);
    attrs.set(packed.subarray(0, pool.attrBytes), pool.count * pool.attrBytes);
    const pop = new Uint16Array(count);
    pop.set(pool.pop.subarray(0, pool.count));
    pop[pool.count] = Math.min(65535, person.pop || 1);
    const flags = new Uint8Array(count);
    flags.set(pool.flags.subarray(0, pool.count));
    pool.attrs = attrs;
    pool.pop = pop;
    pool.flags = flags;
    pool.ids.push(person.id);
    pool.ens.push(person.en);
    pool.bns.push(person.bn || "");
    pool.images.push("");
    pool.credits.push("");
    pool.count = count;
    pool.extraAttrs = null;
    pool._extraCount = 0;
  }
  const byId = new Map();
  for (const [id, spec] of Object.entries(POLITICS_FACTS)) {
    const bits = new Uint8Array(pool.questions.length);
    let any = false;
    const write = (qid, value) => {
      const qi = pool.qIndex.get(qid);
      if (qi == null) return;
      bits[qi] = value;
      any = true;
    };
    for (const qid of spec.yes || []) write(qid, 2);
    for (const qid of spec.no || []) write(qid, 1);
    if (any) byId.set(id, bits);
  }
  pool._polById = byId;
}

export function factBit(pool, index, qi) {
  if (!pool || qi == null || index < 0) return 0;
  const id = pool.questions[qi]?.id;
  if (PERSONAL_QUESTION_IDS.has(id)) return PERSONAL_FACTS[pool.ids[index]]?.[id] || 0;
  // Incomplete packed life tags cannot contradict authoritative dated records.
  if ((id === "alive" || id === "dead") && SCREEN_LIFE_DETAILS[pool.ids[index]])
    return SCREEN_LIFE_DETAILS[pool.ids[index]][id];
  if (id === "screen_star_1990s") return SCREEN_STAR_1990S[pool.ids[index]] || 0;
  if (id === "screen_star_pre1990") return SCREEN_STAR_PRE1990[pool.ids[index]] || 0;
  if (SCREEN_CAREER_DETAILS[id]) return SCREEN_CAREER_DETAILS[id][pool.ids[index]] || 0;
  if (HYPOTHESIS_FACTS[id]) return HYPOTHESIS_FACTS[id][pool.ids[index]] || 0;
  const members = id && REGIONS[id];
  if (members && members.length > 1) return regionBit(pool, index, members);
  applyPolitics(pool);
  const over = pool._polById?.get(pool.ids[index]);
  if (over && over[qi]) return over[qi];
  ensureExtras(pool);
  const stored = pool.attrBytes * 4;
  if (qi < stored) return attrAt(pool.attrs, pool.attrBytes, index, qi);
  const extra = pool.extraAttrs;
  const extraBytes = pool.extraBytes || 0;
  if (!extra || !extraBytes) return 0;
  const eo = qi - stored;
  const base = index * extraBytes + (eo >> 2);
  if (base < 0 || base >= extra.length) return 0;
  return (extra[base] >> ((eo & 3) << 1)) & 3;
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

export function inCategory(pool, index, category) {
  const bit = (id) => {
    const qi = pool.qIndex.get(id);
    return qi == null ? 0 : factBit(pool, index, qi);
  };
  const real = bit("real") === 2;
  const fictional = bit("fictional") === 2;
  const animal = bit("animal") === 2;
  const object = bit("object") === 2;
  if (category === "character") return real || fictional;
  if (category === "animal") return animal && !real && !fictional;
  if (category === "object") return object && !real && !fictional;
  return true;
}

export function createState(pool, options = {}) {
  applyPolitics(pool);
  return {
    pool,
    answers: [],
    rejected: new Set(),
    // Stable identity memory: numeric indices change when knowledge shards reload.
    // Rejected people must remain excluded throughout this round.
    rejectedIds: new Set(),
    // An active hypothesis is a stable entity ID, not a mutable shard index.
    focusId: null,
    focusHistory: [],
    guesses: 0,
    sinceGuess: 0,
    opening: options.opening || null,
    category: options.category || null,
    weights: new Float64Array(pool.count),
    alive: [],
  };
}

function massOf(state, qi, bit) {
  const { pool, weights, alive } = state;
  let total = 0;
  for (let k = 0; k < alive.length; k++) {
    const i = alive[k];
    const bitValue = factBit(pool, i, qi);
    if (bitValue === bit) total += weights[i];
  }
  return total;
}

const HARD_CONTRA = Math.log(1e-12);
const HARD_MISSING = Math.log(1e-5);
let hardLookup = null;

function hardFacts() {
  if (hardLookup) return hardLookup;
  const families = [
    COUNTRIES,
    BIRTHS,
    ["male", "female"],
    ["alive", "dead"],
    ["real", "fictional"],
    ["animal", "object"],
    ["party_bnp", "party_al", "party_jp", "party_jamaat"],
    ["led_gov"],
    ["been_minister"],
    ["been_premier"],
    ["head_of_state"],
    ["party_chief"],
    ["party_secretary"],
    ["in_government"],
    // Personal relationships are player-relative and sometimes uncertain:
    // missing facts or an ambiguous ex must NOT receive
    // HARD_MISSING scores. Keep these likelihoods soft.
    ...PRIMARY_JOBS.map((job) => [job]),
    ["played_barcelona"],
    ["ballon_dor"],
    ["zia_family"],
    ["mujib_family"],
    ["lives_abroad"],
    ["from_asia"],
    ["from_europe"],
    ["from_africa"],
    ["from_north_america"],
    ["from_south_america"],
  ];
  const index = new Map();
  families.forEach((ids, fam) => ids.forEach((id) => index.set(id, fam)));
  hardLookup = { families, index };
  return hardLookup;
}

function conflictedFamilies(answers) {
  const { families, index } = hardFacts();
  const yes = families.map(() => new Set());
  const no = families.map(() => new Set());
  const conflicted = new Set();
  for (const answer of answers) {
    if (answer.value !== "yes" && answer.value !== "no") continue;
    const fam = index.get(answer.qid);
    if (fam == null) continue;
    (answer.value === "yes" ? yes : no)[fam].add(answer.qid);
    if (yes[fam].size > 1) conflicted.add(fam);
    for (const id of yes[fam]) if (no[fam].has(id)) conflicted.add(fam);
  }
  return conflicted;
}

function hardLog(answer, bit, conflicted) {
  const fam = hardFacts().index.get(answer.qid);
  if (fam == null || conflicted.has(fam)) return null;
  if (answer.value !== "yes" && answer.value !== "no") return null;
  const contradicts = (answer.value === "yes" && bit === 1) || (answer.value === "no" && bit === 2);
  if (contradicts) return HARD_CONTRA;
  if (answer.value === "yes" && bit === 0) return HARD_MISSING;
  return null;
}

// Local fame is underrepresented by global knowledge-source popularity.
 // Give a verified Bangladeshi screen star a realistic *regional* prior only
 // after the player confirms the relevant country, job and gender. Never
 // override an answer or artificially mark a missing fact as true.
const REGIONAL_FAME = new Map([
  ["Q7460127", 180], // Shabnur
  ["Q7460022", 215], // Shabana
  ["Q13057124", 210], // Alamgir
  ["Q6926134", 175], // Moushumi
  ["Q7405420", 180], // Salman Shah
  ["Q13059781", 150], // Shabnaz
  ["Q7322180", 165], // Riaz
]);

export function recompute(state) {
  applyPolitics(state.pool);
  if (state.weights.length !== state.pool.count) state.weights = new Float64Array(state.pool.count);
  const { pool, answers, rejected } = state;
  const rejectedIds = state.rejectedIds || new Set();
  const n = pool.count;
  const logW = new Float64Array(n);
  const conflicted = conflictedFamilies(answers);
  const positive = (qid) => answers.some((entry) => entry.qid === qid &&
    (entry.value === "yes" || entry.value === "probably"));
  const localActor = positive("from_bd") && positive("actor");
  const playerPersonal = positive("knows_you");
  const confirmedRelationships = answers.filter((row) =>
    row.qid.startsWith("your_") && (row.value === "yes" || row.value === "probably"));
  let max = -Infinity;
  for (let i = 0; i < n; i++) {
    if (rejectedIds.has(pool.ids[i]) ||
        (!rejectedIds.size && rejected.has(i)) ||
        pool.flags[i] & 128 || (state.category && !inCategory(pool, i, state.category))) {
      logW[i] = -Infinity;
      continue;
    }
    const relation = PERSONAL_FACTS[pool.ids[i]];
    if (relation) {
      // Family, friend, spouse and child candidates describe THIS PLAYER'S
      // personal connections, not famous people. They are ineligible unless
      // the player positively confirms personal acquaintance. A "no" or
      // "don't know" cannot be outweighed by role popularity.
      const contradictsRelation = answers.some(({ qid, value }) => {
        const fact = relation[qid];
        return (value === "yes" && fact === 1) ||
          (value === "no" && fact === 2);
      });
      if (!playerPersonal || contradictsRelation) {
        logW[i] = -Infinity;
        continue;
      }
    }
    let prior = localActor && REGIONAL_FAME.has(pool.ids[i])
      ? Math.max(pool.pop[i] || 1, REGIONAL_FAME.get(pool.ids[i]))
      : (pool.pop[i] || 1);
    // Positive personal acquaintance admits generic private roles. Their
    // relationship-specific yes/no traits remain independently decisive.
    if (relation) prior *= 3;
    if (relation) {
      // Recognized personal relationships have no global fame score. Strong,
      // specific player-provided facts should carry more weight than celebrity
      // popularity or ambiguous family membership alone.
      for (const row of confirmedRelationships) {
        if (relation[row.qid] === 2)
          prior *= row.value === "yes" ? 2.5 : 1.6;
      }
    }
    let score = Math.log(prior + 1);
    for (let a = 0; a < answers.length; a++) {
      const answer = answers[a];
      if (answer.value === "unknown") continue;
      const bit = factBit(pool, i, answer.qi);
      // A player's relative has no fixed nationality; a missing country
      // fact must not overwhelm confirmed family information.
      const unknownRoleCountry = relation && playerPersonal &&
        COUNTRIES.includes(answer.qid) && bit === 0;
      const firm = unknownRoleCountry ? null : hardLog(answer, bit, conflicted);
      score += firm == null ? LOG_MATCH[answer.value][bit] : firm;
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
  // Never guess a known foreign-country candidate after a firm country yes.
  // An unknown country is not treated as a contradiction.
  const chosenCountry = state.answers.find((row) =>
    row.value === "yes" && COUNTRIES.includes(row.qid));
  const otherCountryQIs = chosenCountry
    ? COUNTRIES.filter((id) => id !== chosenCountry.qid)
      .map((id) => state.pool.qIndex.get(id)).filter((qi) => qi != null)
    : [];
  const hasOtherIdentityEvidence = supportedIdentity(state);
  // A specific confirmed profession is evidence, not merely a popularity
  // hint. In particular a yes to acting must never nominate someone whose
  // record has no verified acting fact.
  const actorQi = state.pool.qIndex.get("actor");
  const confirmedActor = state.answers.some((row) =>
    row.qid === "actor" && row.value === "yes");
  const knownFilmEraAnswers = state.answers.filter((row) =>
    (row.qid === "screen_star_1990s" || row.qid === "screen_star_pre1990") &&
    (row.value === "yes" || row.value === "no"));
  const verifiedRoleClues = state.answers.filter((row) =>
    row.value === "yes" && [
      "screen_role_lead", "screen_role_villain", "screen_role_comedy",
      "screen_role_supporting", "screen_silent_comedy",
      "screen_physical_comedy", "screen_short_moustache",
      "screen_bowler_cane", "screen_hitler_resemblance",
      "screen_great_dictator", "screen_comedy_award",
    ].includes(row.qid));
  const checkedObjectAnimalFacts = state.answers.filter(row =>
    ["yes","no"].includes(row.value) && HYPOTHESIS_FACTS[row.qid]);
  const checkedScreenFacts = state.answers.filter(row =>
    ["yes","no"].includes(row.value) && SCREEN_CAREER_DETAILS[row.qid] &&
    !["screen_role_lead","screen_role_villain","screen_role_comedy",
      "screen_role_supporting","screen_silent_comedy",
      "screen_physical_comedy","screen_short_moustache",
      "screen_bowler_cane","screen_hitler_resemblance",
      "screen_great_dictator","screen_comedy_award"].includes(row.qid));
  // Prioritize explicitly confirmed 1990-1999 film stars. When all such
  // names are rejected, widen to incomplete records instead of giving up.
  const confirmed1990s = knownFilmEraAnswers.find((row) =>
    row.qid === "screen_star_1990s" && row.value === "yes");
  const confirmedMale = state.answers.some((row) => row.qid === "male" && row.value === "yes");
  const confirmedFemale = state.answers.some((row) => row.qid === "female" && row.value === "yes");
  const deniedMale = state.answers.some((row) => row.qid === "male" && row.value === "no");
  const deniedFemale = state.answers.some((row) => row.qid === "female" && row.value === "no");
  const maleQi = state.pool.qIndex.get("male");
  const femaleQi = state.pool.qIndex.get("female");
  const aliveQi = state.pool.qIndex.get("alive");
  const deadQi = state.pool.qIndex.get("dead");
  const confirmedAlive = state.answers.some(row =>
    (row.qid === "alive" && row.value === "yes") ||
    (row.qid === "dead" && row.value === "no"));
  const confirmedDead = state.answers.some(row =>
    (row.qid === "dead" && row.value === "yes") ||
    (row.qid === "alive" && row.value === "no"));
  let best = -1;
  let second = -1;
  let bestP = 0;
  let secondP = 0;
  const { alive, weights } = state;
  for (let k = 0; k < alive.length; k++) {
    const i = alive[k];
    // Film-era facts are sparse, so unknown stays eligible. But an explicit
    // known contradiction must not be guessed after the player said no/yes.
    if (knownFilmEraAnswers.some((row) => {
      const fact = factBit(state.pool, i, row.qi);
      return row.value === "yes" ? fact === 1 : fact === 2;
    })) continue;
    // An explicit confirmed acting role must be positively supported for
    // a name to be announced. Missing role classifications cannot justify
    // guessing a famous lead when the player described a comic performer.
    if (verifiedRoleClues.some((row) =>
      factBit(state.pool, i, row.qi) !== 2)) continue;
    // A candidate with a known contradicting function/behaviour is excluded.
    if (checkedObjectAnimalFacts.some(row => {
      const bit = factBit(state.pool, i, row.qi);
      return row.value === "yes" ? bit !== 2 : bit === 2;
    })) continue;
    // A specific verified film, death-year or public-history clue must be
    // true for the person announced, not merely weighted as likely. A NO
    // excludes only positively known YES facts, never unknown records.
    if (checkedScreenFacts.some(row => {
      const bit = factBit(state.pool, i, row.qi);
      return row.value === "yes" ? bit !== 2 : bit === 2;
    })) continue;
    // A definitive player-supplied decade must have an affirmative career
    // record. A missing date is not evidence that a celebrity was famous
    // in the 1990s; keep that person in the question pool, not the guesses.
    if (confirmed1990s && factBit(state.pool, i, confirmed1990s.qi) !== 2) continue;
    // Explicit life/death answers are hard identity constraints; a player
    // confirming someone is alive must never see the known deceased Salman
    // Shah or Manna, regardless of their popularity.
    if (confirmedAlive && ((deadQi != null && factBit(state.pool, i, deadQi) === 2) ||
        (aliveQi != null && factBit(state.pool, i, aliveQi) === 1))) continue;
    if (confirmedDead && ((aliveQi != null && factBit(state.pool, i, aliveQi) === 2) ||
        (deadQi != null && factBit(state.pool, i, deadQi) === 1))) continue;
    if (maleQi != null && confirmedMale && factBit(state.pool, i, maleQi) !== 2) continue;
    if (femaleQi != null && confirmedFemale && factBit(state.pool, i, femaleQi) !== 2) continue;
    if (maleQi != null && deniedMale && factBit(state.pool, i, maleQi) === 2) continue;
    if (femaleQi != null && deniedFemale && factBit(state.pool, i, femaleQi) === 2) continue;
    // Real people need explicit acting evidence. Player-relative roles are
    // allowed to have unknown occupations when personally confirmed.
    if (confirmedActor && actorQi != null &&
        !state.pool.ids[i]?.startsWith("riddlex-role-") &&
        factBit(state.pool, i, actorQi) !== 2) continue;
    if (chosenCountry) {
      const countryFact = factBit(state.pool, i, chosenCountry.qi);
      // Some verified local politicians have no packed country tag.
      // Accept unknown nationality only with corroborating positive identity
      // evidence; explicit foreign nationality is never accepted.
      const isPersonalRole = state.pool.ids[i]?.startsWith("riddlex-role-") &&
        state.answers.some((row) => row.qid === "knows_you" &&
          ["yes", "probably"].includes(row.value));
      if (!isPersonalRole && countryFact === 1) continue;
      // Sparse international records can have "actor" but no confirmed
      // nationality. If the player says Bangladeshi AND actor, require
      // both facts before guessing a public actor; don't nominate an
      // unrelated foreign artist from a fame prior.
      if (!isPersonalRole && confirmedActor && countryFact !== 2) continue;
      // A confirmed matching country wins over extra nationalities or
      // historical birthplace tags (several notable figures have both).
      if (!isPersonalRole && countryFact !== 2 &&
          otherCountryQIs.some((qi) => factBit(state.pool, i, qi) === 2)) continue;
      if (!isPersonalRole && countryFact === 0 && !hasOtherIdentityEvidence) continue;
    }
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

function oddsRatio(bestP, secondP) {
  return secondP > 0 ? bestP / secondP : 99;
}

// After a miss, Akinator keeps asking. Guess again only when one name is
// far ahead, or after several new questions. Close scores wait longer.
export function questionsBeforeRetry(state, bestP = 0, ratio = 1) {
  if (!state || state.guesses <= 0) return 0;
  // A rejected name is new negative evidence. Popularity and a near-100%
  // posterior do not permit immediately announcing another celebrity.
  return ratio < 2.5 ? 6 : 5;
}

// The public database is huge; a country, gender, a couple of "no"s,
 // or a high fame prior do not identify one particular person.
function supportedIdentity(state) {
  if (state.category !== "character" || state.pool.count < 100) return true;
  if (!said(state, "real", ["yes", "probably"])) return true;
  if (said(state, "knows_you", ["yes", "probably"])) return true;
  return state.answers.some((row) => {
    if (!["yes", "probably"].includes(row.value)) return false;
    const group = state.pool.questions[row.qi]?.group;
    return ["job", "politics", "fiction", "adult"].includes(group);
  });
}

// Sources for these traits describe a particular person's real career,
 // not broad acting categories like "lead", "1990s" or "100+ films".
const SCREEN_IDENTITY_QUESTIONS = [
  "screen_walton_executive", "screen_debut_abujh_duti_mon",
  "screen_return_after_long_break",
  "screen_air_force_before_films", "screen_first_film_banglar_nayok",
  "screen_debut_anonto_bhalobasha", "screen_known_multiple_marriages",
  "screen_restaurant_business", "screen_lead_to_villain",
  "screen_800_plus_films", "screen_famous_villain_dialogues",
  "screen_film_producer", "screen_theatre_tv_film",
  "screen_acted_bir_soinik", "screen_first_film_keyamat",
  "screen_comedy_award", "screen_bowler_cane", "screen_great_dictator",
  "screen_india_unmarried", "screen_india_third_marriage",
  "screen_india_pataudi_family", "screen_india_king_khan",
  "screen_india_dabangg", "screen_india_dangal", "screen_india_ddlj",
];

function hasScreenIdentityProof(state, index) {
  const id = state.pool.ids[index];
  // Only require an identity signature when a source-backed signature
  // exists for this particular candidate. Unknown identities remain
  // available for broader questioning instead of being marked false.
  const possible = SCREEN_IDENTITY_QUESTIONS.filter(qid =>
    SCREEN_CAREER_DETAILS[qid]?.[id] === 2);
  if (!possible.length) return true;
  return state.answers.some(row =>
    row.value === "yes" && possible.includes(row.qid) &&
    factBit(state.pool, index, row.qi) === 2);
}

// Specific real-world functions and behaviour identify animals and objects.
 // The broad "uses electricity" question is useful context but never unique.
const NONPERSON_SIGNATURES = Object.keys(HYPOTHESIS_FACTS)
  .filter(qid => qid !== "obj_uses_electricity");

function hasFunctionEvidence(state, index) {
  const id = state.pool.ids[index];
  const signatureIds = NONPERSON_SIGNATURES.filter(qid =>
    HYPOTHESIS_FACTS[qid]?.[id] === 2);
  if (!signatureIds.length) return true;
  return state.answers.some(row =>
    row.value === "yes" && signatureIds.includes(row.qid) &&
    factBit(state.pool, index, row.qi) === 2);
}

// A high Bayesian score is not proof of identity: the player must have
// affirmed independently verified distinguishing facts about the candidate.
// Generic country, gender, life and fame priors do not count as evidence.
function hasCandidateEvidence(state, index) {
  if (index < 0) return false;
  let positive = 0;
  let distinctive = 0;
  for (const row of state.answers) {
    if (row.value !== "yes" || factBit(state.pool, index, row.qi) !== 2) continue;
    const group = state.pool.questions[row.qi]?.group;
    if (!["job", "politics", "fiction", "adult", "animal", "object", "look", "size"].includes(group) &&
        !(group === "person" && row.qid.startsWith("screen_"))) continue;
    positive++;
    if (!PRIMARY_JOBS.includes(row.qid) && row.qid !== "athlete") distinctive++;
  }
  const actor = said(state, "actor", ["yes"]);
  return actor ? positive >= 3 && distinctive >= 2
    : positive >= 2 && distinctive >= 1;
}

export function shouldGuess(state) {
  const asked = state.answers.length;
  if (!supportedIdentity(state)) return false;
  // Never guess a publicly indexed character after only a few generic facts.
  if (state.category === "character" && state.pool.count >= 100 &&
      !said(state, "knows_you", ["yes", "probably"]) && asked < 8) return false;
  if (!state.alive.length) return false;
  const { best, bestP, secondP } = topTwo(state);
  if (!(bestP > 0) || best < 0) return false;
  const ratio = oddsRatio(bestP, secondP);
  if (state.sinceGuess < questionsBeforeRetry(state, bestP, ratio)) return false;
  const personal = state.answers.some((row) => row.qid === "knows_you" &&
    (row.value === "yes" || row.value === "probably"));
  if (personal && asked >= 4 && bestP >= 0.72 && ratio >= 4) return true;
  // Public characters must be supported by multiple specific yes answers,
  // including verified career/role details for actors. Never reveal a name
  // simply because the database has few remaining candidates or a turn cap.
  if (state.category === "character" && state.pool.count >= 100 && !personal) {
    if (asked < 8 || !hasCandidateEvidence(state, best)) return false;
    if (said(state, "actor", ["yes","probably"]) &&
        !hasScreenIdentityProof(state, best)) return false;
    // Sparse records from thousands of unrelated people dilute the absolute
    // posterior even when a candidate's independently verified identity
    // clues match and its nearest plausible alternative is far behind.
    // Require both adequate corroboration AND decisive relative separation.
    // A publicly checked role or signature fact can be much stronger
    // evidence than a raw percentage when most records are incomplete.
    // Three independent, candidate-matching verified cinema facts and
    // decisive separation justify identifying distinctive comedians such
    // as Dildar, without opening the door to fame-only guesses.
    const verifiedSpecific = state.answers.filter(row =>
      row.value === "yes" && SCREEN_CAREER_DETAILS[row.qid] &&
      factBit(state.pool, best, row.qi) === 2).length;
    return (bestP >= 0.86 && ratio >= 9) ||
      (bestP >= 0.25 && ratio >= 12) ||
      (verifiedSpecific >= 3 && ratio >= 8);
  }
  // Objects and animals have the same evidence standard as public people:
  // do not guess a likely fan, fridge, air conditioner or butterfly solely
  // from category popularity or several generic negative responses.
  if (["object","animal"].includes(state.category) && state.pool.count >= 40) {
    if (asked < 5 || !hasCandidateEvidence(state, best) ||
        !hasFunctionEvidence(state, best)) return false;
    // Popularity is not certainty. In a large sparse casebook, a perfectly
    // verified fridge/butterfly can have a tiny absolute posterior because
    // thousands of unrelated objects have UNKNOWN for this new question.
    // A confirmed source-backed signature plus multiple matching category
    // facts and decisive separation is sufficient; a generic electricity
    // answer alone is explicitly NOT a signature.
    const confirmedFunction = state.answers.some(row =>
      row.value === "yes" && NONPERSON_SIGNATURES.includes(row.qid) &&
      factBit(state.pool, best, row.qi) === 2);
    // For a record lacking bespoke function facts, demand several positive
    // category traits including at least one concrete non-generic attribute.
    // "Electronic" + "daily use" does not identify a TV, AC or fan.
    const confirmedTraits = state.answers.filter(row => row.value === "yes" &&
      factBit(state.pool, best, row.qi) === 2 &&
      ["object","animal","look","size"].includes(state.pool.questions[row.qi]?.group));
    const generic = new Set([
      "electronic","daily_use","wild","can_fly","metal","soft",
      "bigger_than_person",
    ]);
    const specificTrait = confirmedTraits.some(row => !generic.has(row.qid));
    return (confirmedFunction && ratio >= 8) ||
      (confirmedTraits.length >= 3 && specificTrait &&
       bestP >= 0.88 && ratio >= 12);
  }
  // After a miss, one name far ahead of everyone else can be said at once.
  if (state.guesses > 0 && bestP >= 0.8 && ratio >= 8) return true;
  // Shared facts such as country and job are not enough. Wait until one person stands clear.
  if (asked < 6) return false;
  if (bestP >= 0.88 && ratio >= 10) return true;
  if (asked >= 12 && bestP >= 0.62 && ratio >= 5) return true;
  if (asked >= 24 && bestP >= 0.4 && ratio >= 3) return true;
  if (asked >= 48 && bestP >= 0.22 && ratio >= 2) return true;
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
    const bit = factBit(pool, i, qi);
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
    if (factBit(pool, i, qi) === 2) yes += weight;
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
  if (group === "personal") {
    if (state.category !== "character") return false;
    const yes = (qid) => said(state, qid, ["yes", "probably"]);
    const no = (qid) => said(state, qid, ["no", "probably_not"]);
    if (id === "knows_you") return yes("real");
    if (!yes("knows_you")) return false;
    if (id === "your_family") return true;
    if (yes("your_family")) {
      if (id === "your_parent") return true;
      if (id === "your_sibling") return no("your_parent");
      if (id === "your_spouse") return no("your_parent") && no("your_sibling");
      if (id === "your_child") return no("your_parent") && no("your_sibling") && no("your_spouse");
      if (id === "your_baby") return yes("your_child");
      return false;
    }
    if (no("your_family")) {
      if (id === "your_partner") return true;
      if (id === "your_ex") return no("your_partner");
      if (id === "your_best_friend") return no("your_partner") && no("your_ex");
      if (id === "your_friend") return no("your_partner") && no("your_ex") && no("your_best_friend");
    }
    return false;
  }
  if (id === "screen_star_1990s" || id === "screen_star_pre1990") {
    return state.answers.length >= 5 &&
      yesMass(state, "actor", rows) > 0.45 &&
      yesMass(state, "from_bd", rows) > 0.40;
  }
  const real = () => yesMass(state, "real", rows);
  const fictional = () => yesMass(state, "fictional", rows);
  const animal = () => yesMass(state, "animal", rows);
  const object = () => yesMass(state, "object", rows);
  if (group === "life" || group === "birth" || group === "country") return real() > 0.48;
  if (group === "job") {
    if (id === "all_rounder") return yesMass(state, "cricketer", rows) > 0.35;
    return real() > 0.42;
  }
  if (group === "politics") return politicsBranch(state, rows);
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

const CATEGORY_GROUPS = {
  character: new Set(["kind", "person", "life", "birth", "country", "job", "adult", "fiction", "politics", "personal"]),
  animal: new Set(["animal", "look", "size"]),
  object: new Set(["object", "look", "size"]),
};
const COUNTRIES = ["from_bd", "from_in", "from_pk", "from_us", "from_gb", "from_jp", "from_kr", "from_cn", "from_fr", "from_de", "from_ru", "from_br", "from_ca", "from_au", "from_es", "from_it", "from_mx", "from_ng", "from_eg", "from_tr", "from_id", "from_sa", "from_ar", "from_za"];
const BIRTHS = ["born_pre1900", "born_1900_1949", "born_1950_1969", "born_1970_1979", "born_1980_1989", "born_1990_1999", "born_2000_plus"];

// A role question is a child of the job it depends on. Naming (cricket_opener),
// the politics group, and wording ("Does he bat?") fill in anything not listed.
const ROLE_PARENT = {
  all_rounder: "cricketer",
  batsman: "cricketer",
  bowler: "cricketer",
  wicketkeeper: "cricketer",
  wicket_keeper: "cricketer",
  striker: "footballer",
  goalkeeper: "footballer",
  midfielder: "footballer",
  defender: "footballer",
  winger: "footballer",
  forward: "footballer",
  played_barcelona: "footballer",
  ballon_dor: "footballer",
  all_rounder: "cricketer",
  bollywood: "actor",
  hollywood: "actor",
  tollywood: "actor",
  dhallywood: "actor",
  adult_ent: "actor",
};
const STEM_PARENT = {
  cricket: "cricketer",
  cricketer: "cricketer",
  bat: "cricketer",
  batsman: "cricketer",
  bowl: "cricketer",
  bowler: "cricketer",
  wicket: "cricketer",
  wicketkeeper: "cricketer",
  football: "footballer",
  footballer: "footballer",
  soccer: "footballer",
  party: "politician",
  politician: "politician",
  actor: "actor",
  singer: "singer",
  genre: "singer",
  song: "singer",
};
const TEXT_RULES = [
  ["cricketer", /\b(bats?|batting|bowls?|bowling|wickets?|wicket-?keepers?)\b/i],
  ["footballer", /\b(strikers?|goalkeepers?|midfielders?|defenders?|wingers?)\b/i],
  ["actor", /\b(bollywood|hollywood|tollywood|dhallywood|adult-film)\b/i],
  ["singer", /\b(genres?|playback)\b/i],
];
const REGIONS = {
  from_asia: ["from_bd", "from_in", "from_pk", "from_jp", "from_kr", "from_cn", "from_id", "from_sa", "from_tr"],
  asia: ["from_bd", "from_in", "from_pk", "from_jp", "from_kr", "from_cn", "from_id", "from_sa", "from_tr"],
  from_europe: ["from_gb", "from_fr", "from_de", "from_ru", "from_es", "from_it"],
  europe: ["from_gb", "from_fr", "from_de", "from_ru", "from_es", "from_it"],
  from_africa: ["from_ng", "from_eg", "from_za"],
  africa: ["from_ng", "from_eg", "from_za"],
  from_north_america: ["from_us", "from_ca", "from_mx"],
  north_america: ["from_us", "from_ca", "from_mx"],
  from_south_america: ["from_br", "from_ar"],
  south_america: ["from_br", "from_ar"],
  from_oceania: ["from_au"],
  oceania: ["from_au"],
  from_americas: ["from_us", "from_ca", "from_mx", "from_br", "from_ar"],
  americas: ["from_us", "from_ca", "from_mx", "from_br", "from_ar"],
};
const NO_ENTAIL = new Set(["lives_abroad"]);

export function buildTraitLinks(questions) {
  const list = questions || [];
  const idSet = new Set(list.map((question) => question.id));
  const parents = new Map();
  const massParents = new Map();
  const entailedBy = new Map();
  const members = new Map();

  function add(parent, child, { entail = true, mass = false } = {}) {
    if (!parent || !child || parent === child || !idSet.has(parent) || !idSet.has(child)) return;
    const owned = parents.get(child) || [];
    if (!owned.includes(parent)) parents.set(child, owned.concat(parent));
    if (mass) {
      const heavy = massParents.get(child) || [];
      if (!heavy.includes(parent)) massParents.set(child, heavy.concat(parent));
    }
    if (entail) {
      const kids = entailedBy.get(parent) || [];
      if (!kids.includes(child)) entailedBy.set(parent, kids.concat(child));
    }
  }

  for (const question of list) {
    const id = question.id;
    let parent = ROLE_PARENT[id] || null;
    if (!parent && id.includes("_")) {
      const stemmed = STEM_PARENT[id.split("_")[0]];
      if (stemmed && stemmed !== id) parent = stemmed;
    }
    if (!parent && (id === "captain" || id.endsWith("_captain"))) {
      const text = `${question.en || ""} ${question.bn || ""}`;
      parent = /football|soccer/i.test(text) ? "footballer" : "cricketer";
    }
    if (!parent && (question.group === "job" || question.group === "adult")) {
      const text = `${question.en || ""} ${question.bn || ""}`;
      for (const [candidate, pattern] of TEXT_RULES) {
        if (pattern.test(text)) {
          parent = candidate;
          break;
        }
      }
    }
    if (parent) add(parent, id, { entail: !NO_ENTAIL.has(id), mass: true });
    if (question.group === "politics" && id !== "politician") {
      add("politician", id, { entail: !NO_ENTAIL.has(id), mass: true });
    }
    if ((id === "cricketer" || id === "footballer") && idSet.has("athlete")) {
      add("athlete", id, { entail: true, mass: true });
    }
    if (question.group === "fiction" && id !== "fictional" && idSet.has("fictional")) {
      add("fictional", id, { entail: true, mass: true });
    }
    if (question.group === "animal" && id !== "animal" && idSet.has("animal")) {
      add("animal", id, { entail: true, mass: false });
    }
  }
  for (const question of list) {
    const regionMembers = REGIONS[question.id];
    if (!regionMembers) continue;
    const set = new Set();
    for (const member of regionMembers) {
      if (!idSet.has(member)) continue;
      set.add(member);
      add(question.id, member, { entail: true, mass: false });
    }
    if (set.size) members.set(question.id, set);
  }
  return { parents, massParents, entailedBy, members };
}

function linksFor(pool) {
  if (!pool._traitLinks || pool._traitLinks.questions !== pool.questions) {
    const links = buildTraitLinks(pool.questions);
    links.questions = pool.questions;
    pool._traitLinks = links;
  }
  return pool._traitLinks;
}

function said(state, qid, values) {
  return state.answers.some((answer) => answer.qid === qid && values.includes(answer.value));
}

const PRIMARY_JOBS = ["footballer", "cricketer", "actor", "singer", "politician", "writer", "scientist", "musician", "director", "business", "youtube"];

function confirmedJob(state) {
  return PRIMARY_JOBS.find((job) => said(state, job, ["yes", "probably"])) || "";
}

function candidatesSplit(state, id, rows) {
  const qi = state.pool.qIndex.get(id);
  if (qi == null || !rows?.length) return false;
  let yes = 0;
  let no = 0;
  let total = 0;
  for (let k = 0; k < rows.length; k++) {
    const weight = state.weights[rows[k]];
    if (weight <= 0) continue;
    total += weight;
    const bit = factBit(state.pool, rows[k], qi);
    if (bit === 2) yes += weight;
    else if (bit === 1) no += weight;
  }
  return total > 0 && yes / total >= 0.15 && no / total >= 0.15;
}

function politicsBranch(state) {
  if (said(state, "politician", ["no", "probably_not"])) return false;
  if (said(state, "politician", ["yes", "probably"])) return true;
  return impliedYes(state, "politician", linksFor(state.pool));
}

function politicsSplit(state, qi, rows) {
  let yes = 0;
  let no = 0;
  let total = 0;
  for (let k = 0; k < rows.length; k++) {
    const weight = state.weights[rows[k]];
    if (weight <= 0) continue;
    total += weight;
    const bit = factBit(state.pool, rows[k], qi);
    if (bit === 2) yes += weight;
    else if (bit === 1) no += weight;
  }
  if (total <= 0 || (yes <= 0 && no <= 0)) return 0;
  const known = yes + no;
  // Once Bangladesh is in and a sport is unlikely, ask these before another job.
  if (yes > 0 && no > 0) return 1.05 + binaryEntropy(yes / known);
  return known / total >= 0.008 ? 0.9 : 0;
}

function unrelatedJob(state, id) {
  const job = confirmedJob(state);
  if (!job || job === id) return false;
  const primary = PRIMARY_JOBS.includes(id);
  const politics = id === "politician" || state.pool.questions[state.pool.qIndex.get(id)]?.group === "politics";
  if (!primary && !(politics && job !== "politician")) return false;
  const rows = state.alive.length > 7000 ? sampleAlive(state, 6000) : state.alive;
  if (politics && politicsBranch(state, rows)) return false;
  const probe = politics ? "politician" : id;
  return !candidatesSplit(state, probe, rows);
}

function skippedAsDuplicate(state, id) {
  const yes = (qid) => said(state, qid, ["yes", "probably"]);
  const answered = (qid) => state.answers.some((answer) => answer.qid === qid && answer.value !== "unknown");
  // Alive and dead are the same binary fact. An "unknown" answer should
  // not trigger the opposite wording immediately afterwards.
  if ((id === "dead" && state.answers.some((row) => row.qid === "alive")) ||
      (id === "alive" && state.answers.some((row) => row.qid === "dead"))) return true;
  // A definite yes or no to one binary gender question removes the
  // redundant opposite wording; unknown still leaves a follow-up available.
  if ((id === "female" && answered("male")) ||
      (id === "male" && answered("female"))) return true;
  if (id === "musician" && yes("singer")) return true;
  if (id === "screen_star_1990s" && said(state, "actor", ["no", "probably_not"])) return true;
  if (id === "singer" && said(state, "musician", ["no", "probably_not"])) return true;
  if (id === "athlete" && (yes("cricketer") || yes("footballer"))) return true;
  if ((id === "played_barcelona" || id === "ballon_dor") && !yes("footballer")) return true;
  if (unrelatedJob(state, id)) return true;
  if ((id === "wild" && yes("pet")) || (id === "pet" && yes("wild"))) return true;
  if (COUNTRIES.includes(id) && COUNTRIES.some((country) => country !== id && yes(country))) return true;
  if (BIRTHS.includes(id) && BIRTHS.some((birth) => birth !== id && yes(birth))) return true;
  const parties = ["party_bnp", "party_al", "party_jp", "party_jamaat"];
  if (parties.includes(id) && parties.some((party) => party !== id && yes(party))) return true;
  const regionIds = ["from_asia", "from_europe", "from_africa", "from_north_america", "from_south_america"];
  if (regionIds.includes(id) && regionIds.some((region) => region !== id && yes(region))) return true;
  if (COUNTRIES.includes(id)) {
    for (const region of regionIds) {
      const members = REGIONS[region] || [];
      if (yes(region) && !members.includes(id)) return true;
    }
  }
  return false;
}

function ancestorRejected(state, id, links) {
  const stack = [...(links.parents.get(id) || [])];
  const seen = new Set();
  while (stack.length) {
    const parent = stack.pop();
    if (seen.has(parent)) continue;
    seen.add(parent);
    if (said(state, parent, ["no", "probably_not"])) return true;
    for (const grand of links.parents.get(parent) || []) stack.push(grand);
  }
  return false;
}

function impliedYes(state, id, links) {
  for (const child of links.entailedBy.get(id) || []) {
    if (said(state, child, ["yes", "probably"])) return true;
  }
  const region = links.members.get(id);
  if (!region) return false;
  for (const country of COUNTRIES) {
    if (region.has(country)) continue;
    if (said(state, country, ["yes", "probably"])) return true;
  }
  return false;
}

function parentAbsent(state, parentId, rows, cache) {
  if (cache.has(parentId)) return cache.get(parentId);
  if (said(state, parentId, ["yes", "probably"])) {
    cache.set(parentId, false);
    return false;
  }
  const qi = state.pool.qIndex.get(parentId);
  if (qi == null) {
    cache.set(parentId, false);
    return false;
  }
  const { pool, weights } = state;
  let yes = 0;
  let known = 0;
  let total = 0;
  for (let k = 0; k < rows.length; k++) {
    const weight = weights[rows[k]];
    if (weight <= 0) continue;
    total += weight;
    const bit = factBit(pool, rows[k], qi);
    if (bit === 2) {
      yes += weight;
      known += weight;
    } else if (bit === 1) known += weight;
  }
  const absent = total > 0 && known >= total * 0.35 && yes / total < 0.12;
  cache.set(parentId, absent);
  return absent;
}

// A child question is asked only when every listed parent still agrees.
// strict: the parent must already be yes (or implied). Otherwise a no or
// probably-not is enough to close the branch; an unasked parent stays open.
export const QUESTION_REQUIRES = {
  party_bnp: [{ id: "from_bd", value: "yes" }],
  party_al: [{ id: "from_bd", value: "yes" }],
  party_jp: [{ id: "from_bd", value: "yes" }],
  party_jamaat: [{ id: "from_bd", value: "yes" }],
  zia_family: [{ id: "from_bd", value: "yes" }],
  mujib_family: [{ id: "from_bd", value: "yes" }],
  ...Object.fromEntries(Object.keys(HYPOTHESIS_FACTS).map((id) => [
    id, [{ id: id.startsWith("animal_") ? "animal" : "object",
           value: "yes", strict: true }],
  ])),
  ...Object.fromEntries(Object.keys(SCREEN_CAREER_DETAILS).map((id) => [
    id, [
      { id: "actor", value: "yes", strict: true },
      ...([
        "screen_walton_executive", "screen_return_after_long_break",
        "screen_debut_abujh_duti_mon", "screen_restaurant_business",
        "screen_film_producer", "screen_famous_villain_dialogues",
        "screen_800_plus_films", "screen_lead_to_villain",
        "screen_theatre_tv_film", "screen_new_film_announced_2026",
        "screen_known_multiple_marriages", "screen_debut_anonto_bhalobasha",
        "screen_acted_bir_soinik", "screen_died_1996", "screen_died_2008",
        "screen_film_debut_pre1995", "screen_over_100_films",
        "screen_films_after_2000", "screen_national_film_award",
        "screen_air_force_before_films", "screen_first_film_keyamat",
        "screen_first_film_banglar_nayok", "screen_comedy_award",
      ].includes(id) ? [{ id: "from_bd", value: "yes", strict: true }] : []),
      ...([
        "screen_india_unmarried", "screen_india_third_marriage",
        "screen_india_pataudi_family", "screen_india_king_khan",
        "screen_india_dabangg", "screen_india_dangal", "screen_india_ddlj",
      ].includes(id) ? [{ id: "from_in", value: "yes", strict: true }] : []),
      ...([
        "screen_silent_comedy", "screen_physical_comedy",
        "screen_comedy_award", "screen_short_moustache",
        "screen_bowler_cane", "screen_hitler_resemblance",
        "screen_great_dictator", "screen_world_famous",
      ].includes(id) ? [{ id: "screen_role_comedy", value: "yes", strict: true }] : []),
      ...([
        "screen_short_moustache", "screen_bowler_cane",
        "screen_hitler_resemblance", "screen_great_dictator",
      ].includes(id) ? [{ id: "screen_silent_comedy", value: "yes", strict: true }] : []),
      ...(["screen_died_1996","screen_died_2008"].includes(id) ? [
        { id: "dead", value: "yes", strict: true },
      ] : []),
      ...(id === "screen_hitler_resemblance" ? [
        { id: "screen_short_moustache", value: "yes", strict: true },
      ] : []),
    ],
  ])),
};

const STRICT_PARENT = {
  politics: "politician",
};

function answerValue(state, qid) {
  for (let i = state.answers.length - 1; i >= 0; i--) {
    if (state.answers[i].qid === qid) return state.answers[i].value;
  }
  return null;
}

export function prerequisitesFor(question) {
  const list = [];
  const strictParent = STRICT_PARENT[question.group];
  if (strictParent && question.id !== strictParent) {
    list.push({ id: strictParent, value: "yes", strict: true });
  }
  for (const req of QUESTION_REQUIRES[question.id] || []) list.push(req);
  return list;
}

function requirementFails(state, req, links) {
  // The category selection already establishes Animal or Object.
  if ((req.id === "object" || req.id === "animal") &&
      state.category === req.id) return false;
  const value = answerValue(state, req.id);
  const affirmed = value === "yes" || value === "probably" || (value == null && impliedYes(state, req.id, links));
  if (affirmed) return false;
  if (value === "no" || value === "probably_not") return true;
  return !!req.strict;
}

export function questionContradicts(state, qid) {
  const qi = state.pool.qIndex.get(qid);
  if (qi == null) return false;
  const question = state.pool.questions[qi];
  const links = linksFor(state.pool);
  if (prerequisitesFor(question).some((req) => requirementFails(state, req, links))) return true;
  return ancestorRejected(state, qid, links);
}

function blockedQuestion(state, question, rows, cache) {
  if (skippedAsDuplicate(state, question.id)) return true;
  const links = linksFor(state.pool);
  // Sport-specific roles are not asked before confirming the sport.
  for (const sport of ["cricketer", "footballer"]) {
    if (links.parents.get(question.id)?.includes(sport) &&
        !said(state, sport, ["yes", "probably"])) return true;
  }
  if (impliedYes(state, question.id, links) || questionContradicts(state, question.id)) return true;
  for (const parent of links.massParents.get(question.id) || []) {
    if (parent === "politician" && politicsBranch(state)) continue;
    if (parentAbsent(state, parent, rows, cache)) return true;
  }
  return false;
}

export function questionBlocked(state, qid) {
  const qi = state.pool.qIndex.get(qid);
  if (qi == null) return false;
  const rows = state.alive.length > 7000 ? sampleAlive(state, 6000) : state.alive;
  const question = state.pool.questions[qi];
  if (question.group === "personal" && !gated(state, question, rows)) return true;
  return blockedQuestion(state, question, rows, new Map());
}

function allowedInCategory(state, question) {
  // Most players cannot know someone else's birth decade. The birth facts
  // remain available internally for indexing, but must not be asked aloud.
  if (question.group === "birth") return false;
  // A current-government answer requires regularly refreshed official data,
  // which this static knowledge snapshot does not provide.
  if (question.id === "in_government") return false;
  if (!state.category) return true;
  if (!CATEGORY_GROUPS[state.category]?.has(question.group)) return false;
  if (state.category === "character" && (question.id === "animal" || question.id === "object")) return false;
  if (state.category !== "character" && question.group === "kind" && question.id !== "named") return false;
  return true;
}

// Questions with a named, source-backed career detail must still describe at
// least one surviving candidate. In particular, after Shakib Khan is rejected,
// his marriage clue is not evidence about the other actors by default.
function hasUnrejectedFilmCandidate(state, qid) {
  const facts = SCREEN_CAREER_DETAILS[qid] || HYPOTHESIS_FACTS[qid];
  if (!facts) return true;
  return state.alive.some(i =>
    state.weights[i] > 0 && facts[state.pool.ids[i]] === 2);
}

// Before proposing another name, confirm distinguishing facts about the
// current leader against surviving alternatives. Never spend this round on
// already answered, contradictory, or unrelated category questions.
function chooseConfirmationQuestion(state, leader) {
  if (leader < 0 || !state.alive.length) return null;
  const { pool, weights } = state;
  const asked = new Set(state.answers.map((row) => row.qid));
  const rows = state.alive.length > 1200 ? sampleAlive(state, 1200) : state.alive;
  const absentCache = new Map();
  const focusJob = confirmedJob(state);
  let bestQid = null;
  let bestScore = -Infinity;
  for (let qi = 0; qi < pool.questions.length; qi++) {
    const question = pool.questions[qi];
    if (asked.has(question.id) || !allowedInCategory(state, question) ||
        blockedQuestion(state, question, rows, absentCache) ||
        !gated(state, question, rows) ||
        !hasUnrejectedFilmCandidate(state, question.id)) continue;
    // A confirmation must not reopen a mutually exclusive category.
    // Re-asking "fictional?" after the player confirmed "real" isn't
    // clarification, even if the candidate's packed fictional fact is "no".
    if (question.id === "fictional" && said(state, "real", ["yes","probably"])) continue;
    if (question.id === "real" && said(state, "fictional", ["yes","probably"])) continue;
    if (question.group === "fiction" && said(state, "real", ["yes","probably"])) continue;
    const leaderFact = factBit(pool, leader, qi);
    if (leaderFact === 0) continue;
    let distinctWeight = 0;
    let comparableWeight = 0;
    for (const i of rows) {
      if (i === leader) continue;
      const fact = factBit(pool, i, qi);
      if (fact === 0) continue;
      comparableWeight += weights[i];
      if (fact !== leaderFact) distinctWeight += weights[i];
    }
    const relatedJob = focusJob && question.group === "job";
    const relatedPolitics = focusJob === "politician" && question.group === "politics";
    const related = relatedJob || relatedPolitics;
    // Prefer questions that distinguish candidates; a verified trait of
    // the leader is still a useful confirmation when the other records are
    // incomplete. Job-specific questions get a relevance preference.
    const score = distinctWeight * 8 + comparableWeight * 0.2 +
      (related ? 0.4 : 0) + (leaderFact === 2 ? 0.1 : 0);
    if (score > bestScore) {
      bestScore = score;
      bestQid = question.id;
    }
  }
  return bestQid;
}

// Profession-specific facts must be checked before a public name is shown.
// The 1990s film question is different from birth decade or acting debut.
// General, evidence-led actor taxonomy. No assumption that the person is
// famous, a lead hero, a star of the 1990s, or even Bangladeshi.
function pendingActorRoleQuestion(state) {
  if (state.category !== "character" ||
      !said(state, "actor", ["yes", "probably"]) ||
      said(state, "knows_you", ["yes", "probably"])) return null;
  const known = new Set(state.answers.map((row) => row.qid));
  const next = (id) => state.pool.qIndex.has(id) && !known.has(id);
  const yes = (id) => said(state, id, ["yes", "probably"]);
  const no = (id) => said(state, id, ["no", "probably_not"]);

  if (next("screen_role_lead")) return "screen_role_lead";
  if (no("screen_role_lead") && next("screen_role_villain"))
    return "screen_role_villain";
  if (next("screen_role_comedy")) return "screen_role_comedy";
  if (yes("screen_role_comedy")) {
    if (no("screen_role_lead") && next("screen_role_supporting"))
      return "screen_role_supporting";
    if (next("screen_silent_comedy")) return "screen_silent_comedy";
    if (yes("screen_silent_comedy")) {
      for (const id of [
        "screen_physical_comedy", "screen_short_moustache",
        "screen_hitler_resemblance", "screen_bowler_cane",
        "screen_great_dictator", "screen_world_famous",
      ]) {
        if (id === "screen_hitler_resemblance" &&
            !yes("screen_short_moustache")) continue;
        if (next(id)) return id;
      }
    } else if (no("screen_silent_comedy") &&
        yes("from_bd") && next("screen_comedy_award"))
      return "screen_comedy_award";
  }
  return null;
}

function pendingFilmEraQuestion(state) {
  if (state.category !== "character" ||
      !said(state, "actor", ["yes", "probably"]) ||
      !said(state, "from_bd", ["yes", "probably"]) ||
      said(state, "screen_role_comedy", ["yes", "probably"])) return null;
  const answered = new Set(state.answers.map((row) => row.qid));
  if (state.pool.qIndex.has("screen_star_pre1990") &&
      !answered.has("screen_star_pre1990")) return "screen_star_pre1990";
  if (state.pool.qIndex.has("screen_star_1990s") &&
      !answered.has("screen_star_1990s") &&
      !said(state, "screen_star_pre1990", ["yes", "probably"]))
    return "screen_star_1990s";
  return null;
}

// Once broad entropy-gain questions are exhausted, explore unused
// source-backed actor distinctions (career, company, producer, genre).
// This can discover an overlooked actor such as Amin Khan even if a more
// famous candidate initially dominates the popularity-weighted shortlist.
function actorSignatureQuestion(state, leader) {
  if (leader < 0 ||
      !said(state, "actor", ["yes","probably"]) ||
      !["from_bd","from_in"].some(id => said(state,id,["yes","probably"]))) return null;
  const id = state.pool.ids[leader];
  const asked = new Set(state.answers.map(row => row.qid));
  const rows = state.alive.length > 7000 ? sampleAlive(state,6000) : state.alive;
  const cache = new Map();
  for (const qid of SCREEN_IDENTITY_QUESTIONS) {
    if (SCREEN_CAREER_DETAILS[qid]?.[id] !== 2 || asked.has(qid)) continue;
    const qi = state.pool.qIndex.get(qid);
    if (qi == null) continue;
    const question = state.pool.questions[qi];
    if (allowedInCategory(state, question) &&
        !blockedQuestion(state, question, rows, cache) &&
        gated(state, question, rows) &&
        hasUnrejectedFilmCandidate(state, qid)) return qid;
  }
  return null;
}

function actorDiscoveryQuestion(state) {
  if (!said(state, "actor", ["yes","probably"]) ||
      !["from_bd","from_in"].some(id => said(state,id,["yes","probably"]))) return null;
  const asked = new Set(state.answers.map(row => row.qid));
  const rows = state.alive.length > 7000 ? sampleAlive(state, 6000) : state.alive;
  const cache = new Map();
  let best = null;
  let bestScore = -1;
  for (const [qid, facts] of Object.entries(SCREEN_CAREER_DETAILS)) {
    const qi = state.pool.qIndex.get(qid);
    if (qi == null || asked.has(qid) ||
        !hasUnrejectedFilmCandidate(state, qid)) continue;
    const question = state.pool.questions[qi];
    if (!allowedInCategory(state, question) ||
        blockedQuestion(state, question, rows, cache) ||
        !gated(state, question, rows)) continue;
    let known = 0;
    let largest = 0;
    for (const i of state.alive) {
      if (facts[state.pool.ids[i]] !== 2) continue;
      known += state.weights[i];
      largest = Math.max(largest, state.weights[i]);
    }
    const score = largest * 4 + known;
    if (score > bestScore) { bestScore = score; best = qid; }
  }
  return best;
}

// Hold the current hypothesis by stable ID while its evidence remains close
// to the best alternative. Keep a compact trace of hypotheses in this round.
function focusedCandidate(state, best, second, bestP, secondP) {
  if (best < 0) return best;
  let chosen = best;
  if (second >= 0 && state.focusId === state.pool.ids[second] &&
      secondP >= bestP * 0.7) chosen = second;
  const id = state.pool.ids[chosen];
  if (state.focusId !== id) {
    state.focusId = id;
    state.focusHistory ||= [];
    if (!state.focusHistory.includes(id)) state.focusHistory.push(id);
  }
  return chosen;
}

function objectAnimalSignatureQuestion(state, candidate) {
  if (candidate < 0 || !["object","animal"].includes(state.category)) return null;
  const id = state.pool.ids[candidate];
  const asked = new Set(state.answers.map(row => row.qid));
  const rows = state.alive.length > 7000 ? sampleAlive(state, 6000) : state.alive;
  const cache = new Map();
  for (const qid of NONPERSON_SIGNATURES) {
    if (HYPOTHESIS_FACTS[qid]?.[id] !== 2 || asked.has(qid)) continue;
    const qi = state.pool.qIndex.get(qid);
    if (qi == null) continue;
    const question = state.pool.questions[qi];
    if (allowedInCategory(state, question) &&
        !blockedQuestion(state, question, rows, cache) &&
        gated(state, question, rows) &&
        hasUnrejectedFilmCandidate(state, qid)) return qid;
  }
  return null;
}

function firstAllowedQuestion(state) {
  const asked = new Set(state.answers.map((answer) => answer.qid));
  const rows = state.alive.length > 7000 ? sampleAlive(state, 6000) : state.alive;
  const cache = new Map();
  for (let qi = 0; qi < state.pool.questions.length; qi++) {
    const question = state.pool.questions[qi];
    if (asked.has(question.id)) continue;
    if (!allowedInCategory(state, question) || blockedQuestion(state, question, rows, cache) ||
        !gated(state, question, rows) ||
        !hasUnrejectedFilmCandidate(state, question.id)) continue;
    if (question.id === "fictional" && said(state, "real", ["yes", "probably"])) continue;
    if (question.id === "real" && said(state, "fictional", ["yes", "probably"])) continue;
    if (question.group === "fiction" && said(state, "real", ["yes", "probably"])) continue;
    if ((question.id === "screen_star_1990s" ||
         question.id === "screen_star_pre1990") &&
        !said(state, "actor", ["yes", "probably"])) continue;
    if (question.id === "adult_ent" && !adultAllowed(state)) continue;
    // Preserve broad fallbacks after a rejected guess, but never reopen
    // personal or child sport branches contrary to earlier answers.
    if (question.group === "personal" && !gated(state, question, rows)) continue;
    return question.id;
  }
  return null;
}

export function chooseQuestion(state) {
  const { pool, answers } = state;
  if (!state.alive.length) return null;
  const asked = new Set(answers.map((answer) => answer.qid));
  const saidNo = (qid) => said(state, qid, ["no", "probably_not"]);
  const saidYes = (qid) => said(state, qid, ["yes", "probably"]);
  if (state.category === "character" || !state.category) {
    if (!asked.has("real")) return "real";
  }
  if ((state.category === "character" || !state.category) && saidNo("real") && !asked.has("fictional")) return "fictional";
  // Introduce the optional personal-relationship path early. It is never
  // used for animals/objects or famous people unless the user explicitly says
  // this person knows them.
  if (state.category === "character" && pool.qIndex.has("knows_you") &&
      saidYes("real") && !asked.has("knows_you"))
    return "knows_you";
  if (state.category === "character" && pool.qIndex.has("knows_you")) {
    const next = (qid) => pool.qIndex.has(qid) && !asked.has(qid);
    if (saidYes("knows_you")) {
      if (next("your_family")) return "your_family";
      if (saidYes("your_family")) {
        if (next("your_parent")) return "your_parent";
        if (saidNo("your_parent") && next("your_sibling")) return "your_sibling";
        if (saidNo("your_parent") && saidNo("your_sibling")) {
          if (next("your_spouse")) return "your_spouse";
          if (saidNo("your_spouse") && next("your_child")) return "your_child";
          if (saidYes("your_child") && next("your_baby")) return "your_baby";
        }
        const gendered = saidYes("your_parent") || saidYes("your_sibling") ||
          saidYes("your_spouse");
        if (gendered && next("female") && next("male")) return "female";
      } else if (saidNo("your_family")) {
        if (next("your_partner")) return "your_partner";
        if (saidYes("your_partner") && next("female") && next("male")) return "female";
        if (saidNo("your_partner")) {
          if (next("your_ex")) return "your_ex";
          if (saidNo("your_ex")) {
            if (next("your_best_friend")) return "your_best_friend";
            if (saidNo("your_best_friend") && next("your_friend")) return "your_friend";
          }
        }
      }
    }
  }
  if (!state.category && saidNo("real") && saidNo("fictional") && !asked.has("animal")) return "animal";
  if (!state.category && saidNo("real") && saidNo("fictional") && saidNo("animal") && !asked.has("object")) return "object";
  if (!state.category && saidYes("fictional") && !asked.has("animal") && yesMass(state, "animal", state.alive.length > 7000 ? sampleAlive(state, 4000) : state.alive) > 0.18 && answers.length < 8) {
    return "animal";
  }
  const rows = state.alive.length > 7000 ? sampleAlive(state, 6000) : state.alive;
  const absentCache = new Map();
  let best = null;
  let bestGain = 0;
  let bdGain = 0;
  // Most players are Bangladeshi, so this lands just after real, gender and alive.
  const boostBd = state.category === "character" && !asked.has("from_bd");
  const openingLeft = (!asked.has("male") && !asked.has("female")) || (!asked.has("alive") && !asked.has("dead"));
  for (let qi = 0; qi < pool.questions.length; qi++) {
    const question = pool.questions[qi];
    if (asked.has(question.id)) continue;
    if (!allowedInCategory(state, question) || blockedQuestion(state, question, rows, absentCache)) continue;
    if (!gated(state, question, rows) ||
        !hasUnrejectedFilmCandidate(state, question.id)) continue;
    let gain = gainOn(state, qi, rows);
    if (question.id === "adult_ent") gain *= answers.length >= 12 ? 1 : 0.2;
    if ((question.id === "played_barcelona" || question.id === "ballon_dor") && saidYes("footballer")) gain *= 4;
    const regionIds = ["from_asia", "from_europe", "from_africa", "from_north_america", "from_south_america"];
    const regionOpen = answers.length >= 5 && !regionIds.some((region) => saidYes(region));
    if (regionOpen && regionIds.includes(question.id)) gain *= 8;
    if (regionOpen && COUNTRIES.includes(question.id) && question.id !== "from_bd") gain *= 0.12;
    if (state.category === "character" && answers.length < 4) {
      const genderOpen = !asked.has("male") && !asked.has("female");
      const lifeOpen = !asked.has("alive") && !asked.has("dead");
      if (genderOpen && (question.id === "male" || question.id === "female")) gain *= 3;
      if (!genderOpen && lifeOpen && (question.id === "alive" || question.id === "dead")) gain *= 3;
    }
    if (question.id === "from_bd" && boostBd) {
      bdGain = gain;
      if (answers.length >= 3 && !openingLeft) gain *= 8;
      else if (answers.length >= 3) gain *= 2;
    }
    if (question.group === "politics" && answers.length >= 5 && politicsBranch(state, rows)) {
      gain = Math.max(gain, politicsSplit(state, qi, rows));
    }
    if (gain > bestGain) {
      bestGain = gain;
      best = question.id;
    }
  }
  if (boostBd && answers.length >= 4 && bdGain > 0.004) return "from_bd";
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
  if (index < 0 || index >= state.pool.count) return state;
  state.rejected.add(index);
  (state.rejectedIds ||= new Set()).add(state.pool.ids[index]);
  state.guesses += 1;
  state.sinceGuess = 0;
  return recompute(state);
}

export function decide(state) {
  recompute(state);
  if (!state.alive.length) return { type: "defeat" };
  // Neither 10 rejected names nor 72 answers establishes that the user lost.
  // Continue asking every remaining relevant, non-duplicate question.
  const { best, second, bestP, secondP } = topTwo(state);
  const ratio = oddsRatio(bestP, secondP);
  const focus = focusedCandidate(state, best, second, bestP, secondP);
  // First determine their usual role (lead, antagonist or comic performer).
  // Career era and signature props are follow-up branches, not universal
  // prerequisites to finding an actor or anyone else.
  const roleQuestion = pendingActorRoleQuestion(state);
  if (roleQuestion) return { type: "ask", qid: roleQuestion };
  const filmEra = pendingFilmEraQuestion(state);
  if (filmEra) return { type: "ask", qid: filmEra };
  // Once the actor branch is known, verify a candidate's distinctive
  // film/business history before announcing their name. A vague "lead"
  // or "1990s" alone does not identify Riaz, Amin Khan, or Shakib Khan.
  if (state.answers.length >= 12 && bestP >= 0.04) {
    const signature = actorSignatureQuestion(state, focus);
    if (signature && !hasScreenIdentityProof(state, focus))
      return { type: "ask", qid: signature };
  }
  // Verify practical functions and behaviour for animals and objects, too.
  if (state.answers.length >= 4 && ["object","animal"].includes(state.category)) {
    const signature = objectAnimalSignatureQuestion(state, focus);
    if (signature && !hasFunctionEvidence(state, focus))
      return { type: "ask", qid: signature };
  }
  const waiting = state.sinceGuess < questionsBeforeRetry(state, bestP, ratio);
  // After any wrong guess, force a fresh evidence-gathering round.
  // In particular, do NOT bypass it through the no-question fallback.
  if (waiting) {
    const qid = chooseConfirmationQuestion(state, focus) ||
      chooseQuestion(state) || actorDiscoveryQuestion(state) ||
      firstAllowedQuestion(state);
    return qid ? { type: "ask", qid } : { type: "defeat" };
  }
  if (shouldGuess(state)) {
    // A famous person can dominate the prior long before we have enough
    // independent information. Ask a target-specific confirmation first.
    const personal = said(state, "knows_you", ["yes", "probably"]);
    if (state.guesses === 0 && !personal && state.category === "character" &&
        state.answers.length < 12) {
      const verify = chooseConfirmationQuestion(state, focus);
      if (verify) return { type: "ask", qid: verify };
    }
    return { type: "guess", index: best };
  }
  // The ordinary entropy picker can run out while useful candidate-specific
  // confirmations still exist. Try them before a broad, safe fallback.
  // A missing question is NEVER permission to guess an unverified name.
  let qid = chooseQuestion(state);
  // Preserve the original tiny-casebook behavior used by the self-contained
  // demo and simulation fixtures. Guess when the informative question picker
  // is exhausted so a later rejection still has unused clarifying questions.
  // The actual public character casebook initially loads over 19k records
  // and NEVER takes this shortcut.
  if (!qid && state.pool.count < 100 && best >= 0 && bestP > 0 &&
      supportedIdentity(state)) return { type: "guess", index: best };
  qid ||= chooseConfirmationQuestion(state, focus) ||
    actorDiscoveryQuestion(state) || firstAllowedQuestion(state);
  return qid ? { type: "ask", qid } : { type: "defeat" };
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
