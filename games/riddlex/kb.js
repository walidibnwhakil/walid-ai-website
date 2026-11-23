// Compact little-endian knowledge shards. Names stay in one blob so the
// first question can render before every shard has finished parsing.

import { EXTRA_SCREEN_QUESTIONS } from "./career-facts.js?v=riddlex-55";
import { EXTRA_HYPOTHESIS_QUESTIONS } from "./hypothesis-facts.js?v=riddlex-57";
import { PERSONAL_QUESTIONS } from "./personal-facts.js?v=riddlex-56";
import { EXTRA_POLITICS_QUESTIONS } from "./politics-extra.js?v=riddlex-55";
import { EXTRA_IDENTITY_QUESTIONS } from "./identity-facts.js";

// The legacy binary shards store 28 attribute bytes while newer supported
// questions are represented as sparse, fact-checked runtime overlays.
export function poolFromEntries(questions, entries) {
  const qIndex = new Map(questions.map((question, index) => [question.id, index]));
  const attrBytes = questions.packedAttrBytes || Math.ceil(questions.length / 4);
  const count = entries.length;
  const attrs = new Uint8Array(count * attrBytes);
  const pop = new Uint16Array(count);
  const flags = new Uint8Array(count);
  const ids = new Array(count);
  const ens = new Array(count);
  const bns = new Array(count);
  const images = new Array(count).fill("");
  const credits = new Array(count).fill("");
  const aliasMap = new Map();
  entries.forEach((entry, index) => {
    ids[index] = entry.id;
    ens[index] = entry.en || "";
    bns[index] = entry.bn || "";
    pop[index] = Math.min(65535, entry.pop || 1);
    if (entry.adult) flags[index] |= 1;
    images[index] = entry.adult ? "" : (entry.image || "");
    credits[index] = images[index] ? (entry.credit || "") : "";
    if (entry.aliases?.length) aliasMap.set(entry.id, entry.aliases);
    const bytes = entry.attrs instanceof Uint8Array
      ? entry.attrs
      : packList(questions, entry.yes, entry.no);
    attrs.set(bytes.subarray(0, attrBytes), index * attrBytes);
  });
  return { questions, qIndex, attrBytes, count, attrs, pop, flags, ids, ens, bns, images, credits, aliasMap };
}

function packList(questions, yes = [], no = []) {
  const bytes = new Uint8Array(Math.ceil(questions.length / 4));
  const index = new Map(questions.map((question, position) => [question.id, position]));
  const write = (id, value) => {
    const qi = index.get(id);
    if (qi == null) return;
    const slot = qi >> 2;
    const shift = (qi & 3) << 1;
    bytes[slot] = (bytes[slot] & ~(3 << shift)) | ((value & 3) << shift);
  };
  for (const id of yes) write(id, 2);
  for (const id of no) write(id, 1);
  return bytes;
}

const decoder = new TextDecoder();

function readString(view, offset, bytes) {
  const text = decoder.decode(new Uint8Array(view.buffer, view.byteOffset + offset, bytes));
  return [text, offset + bytes];
}

export function decodeShard(buffer, questions) {
  const view = new DataView(buffer);
  const magic = decoder.decode(new Uint8Array(buffer, 0, 4));
  if (magic !== "RXKB") throw new Error("Bad knowledge shard");
  let offset = 4;
  const version = view.getUint16(offset, true); offset += 2;
  if (version !== 1) throw new Error("Unsupported knowledge version");
  const attrBytes = view.getUint16(offset, true); offset += 2;
  questions.packedAttrBytes = attrBytes;
  const count = view.getUint32(offset, true); offset += 4;
  const attrs = new Uint8Array(count * attrBytes);
  const pop = new Uint16Array(count);
  const flags = new Uint8Array(count);
  const ids = new Array(count);
  const ens = new Array(count);
  const bns = new Array(count);
  const images = new Array(count).fill("");
  const credits = new Array(count).fill("");
  for (let index = 0; index < count; index++) {
    const qid = view.getUint32(offset, true); offset += 4;
    if (qid) {
      ids[index] = "Q" + qid;
    } else {
      const length = view.getUint8(offset); offset += 1;
      [ids[index], offset] = readString(view, offset, length);
    }
    pop[index] = view.getUint16(offset, true); offset += 2;
    flags[index] = view.getUint8(offset); offset += 1;
    const enLen = view.getUint16(offset, true); offset += 2;
    [ens[index], offset] = readString(view, offset, enLen);
    const bnLen = view.getUint16(offset, true); offset += 2;
    [bns[index], offset] = readString(view, offset, bnLen);
    attrs.set(new Uint8Array(buffer, offset, attrBytes), index * attrBytes);
    offset += attrBytes;
    if (flags[index] & 2) {
      const imageLen = view.getUint16(offset, true); offset += 2;
      [images[index], offset] = readString(view, offset, imageLen);
      const creditLen = view.getUint16(offset, true); offset += 2;
      [credits[index], offset] = readString(view, offset, creditLen);
    }
    if (flags[index] & 1) images[index] = "";
  }
  const qIndex = new Map(questions.map((question, index) => [question.id, index]));
  return { questions, qIndex, attrBytes, count, attrs, pop, flags, ids, ens, bns, images, credits, aliasMap: new Map() };
}

export function mergePools(pools) {
  const base = pools.filter((pool) => pool && pool.count);
  if (!base.length) throw new Error("No knowledge loaded");
  if (base.length === 1) return base[0];
  const questions = base[0].questions;
  const attrBytes = base[0].attrBytes;
  const count = base.reduce((sum, pool) => sum + pool.count, 0);
  const attrs = new Uint8Array(count * attrBytes);
  const pop = new Uint16Array(count);
  const flags = new Uint8Array(count);
  const ids = new Array(count);
  const ens = new Array(count);
  const bns = new Array(count);
  const images = new Array(count);
  const credits = new Array(count);
  const aliasMap = new Map();
  let cursor = 0;
  for (const pool of base) {
    attrs.set(pool.attrs, cursor * attrBytes);
    pop.set(pool.pop, cursor);
    flags.set(pool.flags, cursor);
    for (let index = 0; index < pool.count; index++) {
      ids[cursor] = pool.ids[index];
      ens[cursor] = pool.ens[index];
      bns[cursor] = pool.bns[index];
      images[cursor] = pool.images[index];
      credits[cursor] = pool.credits[index];
      cursor += 1;
    }
    if (pool.aliasMap) for (const [id, aliases] of pool.aliasMap) aliasMap.set(id, aliases);
  }
  const qIndex = new Map(questions.map((question, index) => [question.id, index]));
  return { questions, qIndex, attrBytes, count, attrs, pop, flags, ids, ens, bns, images, credits, aliasMap };
}

export function imageSrc(image) {
  if (!image) return "";
  if (image.startsWith("data:") || image.startsWith("http://") || image.startsWith("https://")) return image;
  if (image.startsWith("./images/approved/") && !image.includes("..", 2)) return image;
  return "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(image) + "?width=320";
}

export function attachManifest(pool, manifest) {
  if (manifest.aliases) {
    for (const [id, aliases] of Object.entries(manifest.aliases)) pool.aliasMap.set(id, aliases);
  }
  pool.opening = manifest.opening;
  pool.total = manifest.total;
  pool.sources = manifest.sources;
  return pool;
}

const COUNTRY_CODE = {
  from_bd: "bd", from_in: "in", from_pk: "pk", from_us: "us", from_gb: "gb", from_jp: "jp",
  from_kr: "kr", from_cn: "cn", from_fr: "fr", from_de: "de", from_ru: "ru", from_br: "br",
  from_ca: "ca", from_au: "au", from_es: "es", from_it: "it", from_mx: "mx", from_ng: "ng",
  from_eg: "eg", from_tr: "tr", from_id: "id", from_sa: "sa", from_ar: "ar", from_za: "za",
};
const BIRTH_CODE = {
  born_pre1900: "pre", born_1900_1949: "0049", born_1950_1969: "5069", born_1970_1979: "7079",
  born_1980_1989: "8089", born_1990_1999: "9099", born_2000_plus: "2000",
};

function firmMap(answers) {
  const map = new Map();
  for (const answer of answers || []) {
    if (answer.value === "yes" || answer.value === "no") map.set(answer.qid, answer.value);
  }
  return map;
}

// Popular people load first. A firm country (and gender, life, birth) then
// pulls only the matching long-tail buckets, capped so one round stays small.
// A small, cumulative transfer budget protects low-memory phones. Already
// loaded files count towards the budget; do not repeatedly request the same
// leading buckets after an answer changes.
export function planShardLoads(index, answers, loadedNames, budget = index?.budget || 4500000) {
  if (!index?.top) return [];
  const loaded = new Set(loadedNames || []);
  const buckets = index.buckets || [];
  const sizes = new Map(buckets.map((bucket) => [bucket.file, bucket.bytes || 0]));
  sizes.set(index.top, index.topBytes || 0);
  if (index.fiction) sizes.set(index.fiction, index.fictionBytes || 0);
  let spent = [...loaded].reduce((total, file) => total + (sizes.get(file) || 0), 0);
  const chosen = [];
  const seen = new Set();
  const add = (file, bytes) => {
    if (!file || loaded.has(file) || seen.has(file)) return false;
    const size = bytes || 0;
    if (spent + size > budget) return false;
    seen.add(file);
    chosen.push({ file, bytes: size });
    spent += size;
    return true;
  };
  add(index.top, index.topBytes || 0);
  const firm = firmMap(answers);
  const yes = (id) => firm.get(id) === "yes";
  const likelyYes = (id) => yes(id) || (answers || []).some((row) =>
    row.qid === id && row.value === "probably");
  const no = (id) => firm.get(id) === "no";
  const wantsFiction = (no("real") || yes("fictional")) && !(yes("real") && !yes("fictional"));
  if (wantsFiction) add(index.fiction, index.fictionBytes || 0);
  // A "probably" country answer should still make those names discoverable,
  // while the existing cumulative byte budget protects low-memory phones.
  const yesCountries = Object.keys(COUNTRY_CODE).filter(likelyYes);
  const yesBirths = Object.keys(BIRTH_CODE).filter(yes);
  const gender = yes("male") && !yes("female") ? "m" : yes("female") && !yes("male") ? "f"
    : no("male") && !yes("female") ? "not-m" : no("female") && !yes("male") ? "not-f" : "";
  const life = yes("alive") && !yes("dead") ? "a" : yes("dead") && !yes("alive") ? "d"
    : no("alive") && !yes("dead") ? "not-a" : no("dead") && !yes("alive") ? "not-d" : "";
  const match = (bucket, includeUnknown = false) => {
    const any = (actual, expected) => includeUnknown && actual === "u" || actual === expected;
    if (gender === "m" && !any(bucket.g, "m")) return false;
    if (gender === "f" && !any(bucket.g, "f")) return false;
    if (gender === "not-m" && bucket.g === "m") return false;
    if (gender === "not-f" && bucket.g === "f") return false;
    if (life === "a" && !any(bucket.l, "a")) return false;
    if (life === "d" && !any(bucket.l, "d")) return false;
    if (life === "not-a" && bucket.l === "a") return false;
    if (life === "not-d" && bucket.l === "d") return false;
    if (yesBirths.length === 1 && !any(bucket.b, BIRTH_CODE[yesBirths[0]])) return false;
    if (!yesBirths.length) {
      const blocked = Object.keys(BIRTH_CODE).filter(no).map((id) => BIRTH_CODE[id]);
      if (blocked.includes(bucket.b)) return false;
    }
    return true;
  };
  const ordered = (rows) => rows.slice().sort((a, b) =>
    (a.part || 0) - (b.part || 0) || (b.bytes || 0) - (a.bytes || 0) || a.file.localeCompare(b.file));
  if (yesCountries.length === 1 && !wantsFiction) {
    const country = COUNTRY_CODE[yesCountries[0]];
    const primary = ordered(buckets.filter((bucket) => bucket.c === country && match(bucket)));
    const needed = primary.filter((bucket) => !loaded.has(bucket.file));
    const total = needed.reduce((sum, bucket) => sum + (bucket.bytes || 0), 0);
    // Avoid fetching a very broad country's pool until more facts narrow it.
    if (total <= budget - spent || yesBirths.length === 1 || (answers || []).length >= 12) {
      for (const bucket of primary) add(bucket.file, bucket.bytes);
    }
  }
  // Records without a single citizenship (or with missing citizenship) used to
  // be unreachable. Expand into the matching fallback buckets after the opening
  // questions, without downloading millions of records onto a phone.
  if (!wantsFiction && (answers || []).length >= 8) {
    const fallback = buckets.filter((bucket) =>
      (bucket.c === "xx" || bucket.c === "multi") && match(bucket, true));
    const prioritize = (bucket) => {
      let score = bucket.c === "multi" ? 0 : 1;
      if (gender && bucket.g === "u") score += 2;
      if (life && bucket.l === "u") score += 2;
      if (yesBirths.length && bucket.b === "u") score += 2;
      return score;
    };
    fallback.sort((a, b) => prioritize(a) - prioritize(b)
      || (a.part || 0) - (b.part || 0)
      || (a.bytes || 0) - (b.bytes || 0));
    for (const bucket of fallback) add(bucket.file, bucket.bytes);
  }
  return chosen;
}

export function categoryShards(manifest, category) {
  const groups = manifest.groups || {};
  if (groups[category]?.length) return groups[category];
  return manifest.shards.filter((name) => {
    if (category === "animal") return name.startsWith("animal");
    if (category === "object") return name.startsWith("object");
    return name.startsWith("real") || name.startsWith("fiction") || name.startsWith("people") || name.startsWith("curated");
  });
}

export async function loadManifest(base = "./kb") {
  const response = await fetch(`${base}/manifest.json?v=riddlex-39`);
  if (!response.ok) throw new Error("Knowledge manifest failed");
  const manifest = await response.json();
  for (const question of [...EXTRA_SCREEN_QUESTIONS, ...EXTRA_HYPOTHESIS_QUESTIONS, ...EXTRA_POLITICS_QUESTIONS, ...EXTRA_IDENTITY_QUESTIONS, ...PERSONAL_QUESTIONS]) {
    if (!manifest.questions.some((row) => row.id === question.id)) {
      manifest.questions.push({ ...question });
    }
  }
  return manifest;
}

function grow(pool, need) {
  // An overlay may reallocate packed arrays at their exact length. Never
  // trust a stale pool.capacity: it can claim room that no longer exists.
  const physicalCapacity = Math.min(
    Math.floor(pool.attrs.length / pool.attrBytes),
    pool.pop.length,
    pool.flags.length,
  );
  if (physicalCapacity >= need) {
    pool.capacity = physicalCapacity;
    return;
  }
  const cap = Math.max(need, physicalCapacity * 2, pool.count * 2);
  const attrs = new Uint8Array(cap * pool.attrBytes);
  const pop = new Uint16Array(cap);
  const flags = new Uint8Array(cap);
  attrs.set(pool.attrs.subarray(0, pool.count * pool.attrBytes));
  pop.set(pool.pop.subarray(0, pool.count));
  flags.set(pool.flags.subarray(0, pool.count));
  pool.attrs = attrs;
  pool.pop = pop;
  pool.flags = flags;
  pool.capacity = cap;
}

export function appendShard(pool, shard) {
  // The cached decoded shard is a template, not a mutable game state.
  if (!pool) return {
    ...shard,
    attrs: shard.attrs.slice(),
    pop: shard.pop.slice(),
    flags: shard.flags.slice(),
    ids: shard.ids.slice(),
    ens: shard.ens.slice(),
    bns: shard.bns.slice(),
    images: shard.images.slice(),
    credits: shard.credits.slice(),
    aliasMap: new Map(shard.aliasMap || []),
  };
  const need = pool.count + shard.count;
  grow(pool, need);
  pool.attrs.set(shard.attrs, pool.count * pool.attrBytes);
  pool.pop.set(shard.pop, pool.count);
  pool.flags.set(shard.flags, pool.count);
  for (let index = 0; index < shard.count; index++) {
    pool.ids.push(shard.ids[index]);
    pool.ens.push(shard.ens[index]);
    pool.bns.push(shard.bns[index]);
    pool.images.push(shard.images[index]);
    pool.credits.push(shard.credits[index]);
  }
  if (shard.aliasMap) {
    for (const [id, aliases] of shard.aliasMap) pool.aliasMap.set(id, aliases);
  }
  pool.count = need;
  return pool;
}

export const traffic = { bytes: 0 };
const shardCache = new Map();

function poolFromDecoded(data, questions) {
  questions.packedAttrBytes = data.attrBytes;
  return {
    questions,
    qIndex: new Map(questions.map((question, index) => [question.id, index])),
    attrBytes: data.attrBytes,
    count: data.count,
    attrs: data.attrs instanceof Uint8Array ? data.attrs : new Uint8Array(data.attrs),
    pop: data.pop instanceof Uint16Array ? data.pop : new Uint16Array(data.pop),
    flags: data.flags instanceof Uint8Array ? data.flags : new Uint8Array(data.flags),
    ids: data.ids,
    ens: data.ens,
    bns: data.bns,
    images: data.images,
    credits: data.credits,
    aliasMap: data.aliasMap instanceof Map ? data.aliasMap : new Map(),
  };
}

let worker = null;
let workerJobs = new Map();
let workerSeq = 0;

function decodeOffThread(buffer, questions) {
  if (typeof Worker === "undefined" || buffer.byteLength < 262144) {
    return Promise.resolve(decodeShard(buffer, questions));
  }
  return new Promise((resolve, reject) => {
    try {
      if (!worker) {
        worker = new Worker(new URL("./kb-worker.js", import.meta.url), { type: "module" });
        worker.onmessage = (event) => {
          const job = workerJobs.get(event.data.id);
          if (!job) return;
          workerJobs.delete(event.data.id);
          if (event.data.error) job.reject(new Error(event.data.error));
          else job.resolve(poolFromDecoded(event.data, job.questions));
        };
        worker.onerror = () => {
          for (const job of workerJobs.values()) job.reject(new Error("Knowledge worker failed"));
          workerJobs.clear();
          worker = null;
        };
      }
      const id = ++workerSeq;
      const copy = buffer.slice(0);
      workerJobs.set(id, { resolve, reject, questions });
      worker.postMessage({ id, buffer: copy, questions }, [copy]);
    } catch (error) {
      resolve(decodeShard(buffer, questions));
    }
  });
}

async function fetchShard(base, name, questions) {
  const key = `${base}/${name}`;
  if (shardCache.has(key)) return shardCache.get(key);
  const pending = (async () => {
    const response = await fetch(key);
    if (!response.ok) throw new Error("Knowledge shard failed");
    const buffer = await response.arrayBuffer();
    traffic.bytes += buffer.byteLength;
    try {
      return await decodeOffThread(buffer, questions);
    } catch {
      return decodeShard(buffer, questions);
    }
  })();
  shardCache.set(key, pending);
  try {
    return await pending;
  } catch (error) {
    shardCache.delete(key);
    throw error;
  }
}

export async function loadShards(base, manifest, names, onPool, existing = null) {
  let pool = existing;
  const questions = manifest.questions;
  const decoded = new Array(names.length);
  let cursor = 0;
  const workers = Math.min(4, names.length);
  await Promise.all(Array.from({ length: workers }, async () => {
    while (cursor < names.length) {
      const index = cursor;
      cursor += 1;
      decoded[index] = await fetchShard(base, names[index], questions);
    }
  }));
  for (const shard of decoded) {
    pool = appendShard(pool, shard);
    attachManifest(pool, manifest);
    if (onPool) onPool(pool);
  }
  return pool;
}

export async function loadKnowledge(base = "./kb") {
  const manifest = await loadManifest(base);
  const pool = await loadShards(base, manifest, manifest.shards);
  return { manifest, pool };
}
