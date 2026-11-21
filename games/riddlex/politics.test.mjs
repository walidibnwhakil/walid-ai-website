import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { answer, createState, decide, rejectIndex, recompute } from "./engine.js";
import { decodeShard, mergePools, planShardLoads } from "./kb.js";

const manifest = JSON.parse(readFileSync(new URL("./kb/manifest.json", import.meta.url), "utf8"));
const index = JSON.parse(readFileSync(new URL("./kb/index.json", import.meta.url), "utf8"));
const questions = manifest.questions;
const byId = new Map(questions.map((question) => [question.id, question]));
const decoded = new Map();

function loadFile(file) {
  if (decoded.has(file)) return decoded.get(file);
  const buf = readFileSync(new URL(`./kb/${file}`, import.meta.url));
  const pool = decodeShard(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), questions);
  decoded.set(file, pool);
  return pool;
}

const BIRTHS = ["born_pre1900", "born_1900_1949", "born_1950_1969", "born_1970_1979", "born_1980_1989", "born_1990_1999", "born_2000_plus"];
const JOBS = ["athlete", "cricketer", "footballer", "actor", "singer", "writer", "scientist", "musician", "director", "business", "youtube", "adult_ent"];
const POLITICS = ["party_bnp", "party_al", "party_jp", "party_jamaat", "led_gov", "zia_family", "mujib_family", "lives_abroad", "been_minister", "been_premier", "head_of_state", "party_chief", "party_secretary", "in_government", "politician"];

// What a player who knows these people would tap in November 2026.
// Offices are current: Fakhrul is president, Tarique is prime minister,
// Khaleda has died, Hasina is abroad, Shahabuddin is a judge rather than
// an Awami League member.
const PEOPLE = [
  { id: "Q6874839", name: "Mirza Fakhrul Islam Alamgir", male: "yes", alive: "yes", birth: "born_1900_1949",
    yes: ["party_bnp", "been_minister", "head_of_state", "in_government"],
    no: ["party_al", "party_jp", "party_jamaat", "led_gov", "zia_family", "mujib_family", "lives_abroad", "been_premier", "party_chief", "party_secretary"] },
  { id: "Q234814", name: "Khaleda Zia", male: "no", alive: "no", birth: "born_1900_1949",
    yes: ["party_bnp", "led_gov", "zia_family", "been_minister", "been_premier"],
    no: ["party_al", "party_jp", "party_jamaat", "mujib_family", "lives_abroad", "head_of_state", "party_chief", "party_secretary", "in_government"] },
  { id: "Q52183", name: "Sheikh Hasina", male: "no", alive: "yes", birth: "born_1900_1949",
    yes: ["party_al", "led_gov", "mujib_family", "lives_abroad", "been_minister", "been_premier", "party_chief"],
    no: ["party_bnp", "party_jp", "party_jamaat", "zia_family", "head_of_state", "party_secretary", "in_government"] },
  { id: "Q7686199", name: "Tarique Rahman", male: "yes", alive: "yes", birth: "born_1950_1969",
    yes: ["party_bnp", "led_gov", "zia_family", "been_minister", "been_premier", "party_chief", "in_government"],
    no: ["party_al", "party_jp", "party_jamaat", "mujib_family", "lives_abroad", "head_of_state", "party_secretary"] },
  { id: "Q14325293", name: "Obaidul Quader", male: "yes", alive: "yes", birth: "born_1950_1969",
    yes: ["party_al", "been_minister", "party_secretary"],
    no: ["party_bnp", "party_jp", "party_jamaat", "led_gov", "zia_family", "mujib_family", "lives_abroad", "been_premier", "head_of_state", "party_chief", "in_government"] },
  { id: "Q43969", name: "Muhammad Yunus", male: "yes", alive: "yes", birth: "born_1900_1949", scientist: true,
    yes: ["led_gov", "been_minister"],
    no: ["party_bnp", "party_al", "party_jp", "party_jamaat", "zia_family", "mujib_family", "lives_abroad", "been_premier", "head_of_state", "party_chief", "party_secretary", "in_government"] },
  { id: "Q198313", name: "Ziaur Rahman", male: "yes", alive: "no", birth: "born_1900_1949",
    yes: ["party_bnp", "led_gov", "zia_family", "been_minister", "head_of_state", "party_chief"],
    no: ["party_al", "party_jp", "party_jamaat", "mujib_family", "lives_abroad", "been_premier", "party_secretary", "in_government"] },
  { id: "Q191375", name: "Sheikh Mujibur Rahman", male: "yes", alive: "no", birth: "born_1900_1949",
    yes: ["party_al", "led_gov", "mujib_family", "been_minister", "been_premier", "head_of_state", "party_chief"],
    no: ["party_bnp", "party_jp", "party_jamaat", "zia_family", "lives_abroad", "party_secretary", "in_government"] },
  { id: "Q3246667", name: "Abdul Hamid", male: "yes", alive: "yes", birth: "born_1900_1949",
    yes: ["party_al", "been_minister", "head_of_state"],
    no: ["party_bnp", "party_jp", "party_jamaat", "led_gov", "zia_family", "mujib_family", "lives_abroad", "been_premier", "party_chief", "party_secretary", "in_government"] },
  { id: "Q116763154", name: "Mohammad Shahabuddin", male: "yes", alive: "yes", birth: "born_1900_1949",
    yes: ["been_minister", "head_of_state"],
    no: ["party_bnp", "party_al", "party_jp", "party_jamaat", "led_gov", "zia_family", "mujib_family", "lives_abroad", "been_premier", "party_chief", "party_secretary", "in_government"] },
  { id: "Q5515139", name: "GM Quader", male: "yes", alive: "yes", birth: "born_1900_1949",
    yes: ["party_jp", "been_minister", "party_chief"],
    no: ["party_bnp", "party_al", "party_jamaat", "led_gov", "zia_family", "mujib_family", "lives_abroad", "been_premier", "head_of_state", "party_secretary", "in_government"] },
  { id: "Q16406038", name: "Shafiqur Rahman", male: "yes", alive: "yes", birth: "born_1950_1969",
    yes: ["party_jamaat", "party_chief"],
    no: ["party_bnp", "party_al", "party_jp", "led_gov", "zia_family", "mujib_family", "lives_abroad", "been_minister", "been_premier", "head_of_state", "party_secretary", "in_government"] },
];

function reply(person, qid) {
  if (qid === "real" || qid === "named" || qid === "from_bd" || qid === "from_asia" || qid === "politician") return "yes";
  if (qid === "fictional" || qid === "animal" || qid === "object") return "no";
  if (qid === "male") return person.male;
  if (qid === "female") return person.male === "yes" ? "no" : "yes";
  if (qid === "alive") return person.alive;
  if (qid === "dead") return person.alive === "yes" ? "no" : "yes";
  if (BIRTHS.includes(qid)) return qid === person.birth ? "yes" : "no";
  if (qid.startsWith("from_")) return "no";
  if (JOBS.includes(qid)) return qid === "scientist" && person.scientist ? "yes" : "no";
  if (person.yes.includes(qid)) return "yes";
  if (person.no.includes(qid)) return "no";
  return "unknown";
}

function play(person, { retry = false } = {}) {
  let pool = null;
  const loaded = [];
  let state = null;
  const absorb = (answers) => {
    const plan = planShardLoads(index, answers, loaded);
    if (!plan.length) return;
    const parts = [];
    if (pool) parts.push(pool);
    for (const item of plan) {
      parts.push(loadFile(item.file));
      loaded.push(item.file);
    }
    pool = parts.length === 1 ? parts[0] : mergePools(parts);
    if (!state) state = createState(pool, { category: "character", opening: "real" });
    else {
      state.pool = pool;
      if (state.weights.length !== pool.count) state.weights = new Float64Array(pool.count);
    }
    recompute(state);
  };
  absorb([]);
  const asked = [];
  const guesses = [];
  let spoiled = false;
  for (let step = 0; step < 40; step++) {
    const decision = decide(state);
    if (decision.type === "guess") {
      const id = pool.ids[decision.index];
      const hit = id === person.id;
      if (retry && !spoiled) {
        spoiled = true;
        if (hit) {
          let other = -1;
          let best = 0;
          for (const index of state.alive) {
            if (index === decision.index) continue;
            if (state.weights[index] > best) {
              best = state.weights[index];
              other = index;
            }
          }
          if (other < 0) {
            other = decision.index === 0 ? 1 : 0;
          }
          guesses.push(pool.ens[other]);
          rejectIndex(state, other);
        } else {
          guesses.push(pool.ens[decision.index]);
          rejectIndex(state, decision.index);
        }
        continue;
      }
      if (hit) {
        return { questions: asked.length, asked, guesses, politics: asked.some((qid) => POLITICS.includes(qid)) };
      }
      guesses.push(pool.ens[decision.index]);
      if (guesses.length >= 4) break;
      rejectIndex(state, decision.index);
      continue;
    }
    if (decision.type !== "ask") break;
    asked.push(decision.qid);
    answer(state, decision.qid, reply(person, decision.qid));
    absorb(state.answers);
  }
  return { questions: asked.length, asked, guesses, politics: false, missed: true };
}

test("politics questions are asked in English and Bengali", () => {
  const expect = {
    in_government: ["Are they currently in power, or part of the current government?", "এখন ক্ষমতায়"],
    been_minister: ["Have they held a government post (minister, prime minister, or president)?", "সরকারি পদে"],
    been_premier: ["Have they been Prime Minister?", "প্রধানমন্ত্রী"],
    head_of_state: ["Have they been President?", "রাষ্ট্রপতি"],
    party_chief: ["Are they the chief or leader of a political party?", "দলের প্রধান"],
    party_bnp: ["Are they from the BNP?", "বিএনপি"],
    party_al: ["Are they from the Awami League?", "আওয়ামী লীগ"],
    party_jp: ["Are they from the Jatiya Party?", "জাতীয় পার্টি"],
    party_jamaat: ["Are they from Jamaat?", "জামায়াত"],
    party_secretary: ["Are they the secretary-general of a political party?", "মহাসচিব"],
    lives_abroad: ["Are they in exile, or living abroad?", "নির্বাসনে"],
  };
  for (const [id, [en, bn]] of Object.entries(expect)) {
    const question = byId.get(id);
    assert.ok(question, id);
    assert.equal(question.en, en, id);
    assert.ok(question.bn.includes(bn), `${id} ${question.bn}`);
  }
});

test("honest answers guess each major Bangladeshi politician within 20 questions", () => {
  for (const person of PEOPLE) {
    const direct = play(person);
    const again = play(person, { retry: true });
    assert.equal(direct.missed, undefined, `${person.name} ${direct.guesses.join(" / ")} :: ${direct.asked.join(",")}`);
    assert.ok(direct.questions <= 20, `${person.name} ${direct.questions} ${direct.asked.join(",")}`);
    assert.equal(direct.politics, true, `${person.name} never reached politics: ${direct.asked.join(",")}`);
    assert.equal(again.missed, undefined, `${person.name} retry ${again.guesses.join(" / ")} :: ${again.asked.join(",")}`);
    assert.ok(again.questions <= 20, `${person.name} retry ${again.questions}`);
    assert.ok(again.guesses.length >= 1, person.name);
  }
});
