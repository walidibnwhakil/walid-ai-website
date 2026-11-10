// Compact little-endian knowledge shards. Names stay in one blob so the
// first question can render before every shard has finished parsing.

export function poolFromEntries(questions, entries) {
  const qIndex = new Map(questions.map((question, index) => [question.id, index]));
  const attrBytes = Math.ceil(questions.length / 4);
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
  return "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(image) + "?width=480";
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
  const response = await fetch(`${base}/manifest.json`);
  if (!response.ok) throw new Error("Knowledge manifest failed");
  return response.json();
}

export async function loadShards(base, manifest, names, onPool) {
  let pool = null;
  const questions = manifest.questions;
  for (let index = 0; index < names.length; index += 2) {
    const batch = names.slice(index, index + 2);
    const shards = await Promise.all(batch.map(async (name) => {
      const response = await fetch(`${base}/${name}`);
      if (!response.ok) throw new Error("Knowledge shard failed");
      return decodeShard(await response.arrayBuffer(), questions);
    }));
    pool = pool ? mergePools([pool, ...shards]) : mergePools(shards);
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
