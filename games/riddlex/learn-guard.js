// Local filter for names taught from the learn form. No network, no model.
// A rejected name is dropped quietly; the player still only sees a thank-you.

const ANSWERS = new Set(["yes", "probably", "probably_not", "no", "unknown"]);

// Whole words only, after the name is split into letters. Short tokens are
// matched exactly so "class" or "Dickens" are not caught by a shorter root.
const BAD_WORDS = new Set([
  "fuck", "fuk", "fck", "shit", "bitch", "asshole", "bastard", "cunt", "dick",
  "cock", "pussy", "slut", "whore", "porn", "porno", "sex", "sexy", "nude",
  "nudes", "xxx", "rape", "rapist", "nigger", "nigga", "fag", "faggot", "retard",
  "kike", "spic", "chink",
  "bal", "khanki", "khangi", "magi", "choda", "chudi", "chudna",
  "harami", "haramjada", "madarchod", "madharchod", "behenchod", "bokachoda",
  "bokaachoda", "bessha", "beshya", "randi", "rendi", "chod", "chud",
  "lund", "gaand", "suar",
]);

const BAD_PARTS = [
  "fuck", "shit", "bitch", "porn", "nigger", "faggot", "madarchod", "behenchod",
  "bokachoda", "khanki", "chuda", "chudi",
  "মাগি", "খানকি", "চোদা", "চুদি", "হারামি", "হারামজাদা", "বেশ্যা", "মাদারচোদ",
  "বোকাচোদা", "শুয়োর", "গান্ডু",
];

const WALKS = ["qwerty", "asdf", "zxcv", "qazwsx", "123456", "abcdef"];

export function reviewSubmission(name, answers) {
  const clean = String(name || "").normalize("NFC").trim().replace(/\s+/g, " ");
  if (clean.length < 2 || clean.length > 60) return { ok: false, reason: "length" };
  if (/https?:|www\.|@/.test(clean)) return { ok: false, reason: "link" };
  const letters = clean.match(/\p{L}/gu) || [];
  if (letters.length < 2) return { ok: false, reason: "letters" };
  if (letters.length / clean.length < 0.6) return { ok: false, reason: "symbols" };
  if (/(.)\1{3,}/u.test(clean)) return { ok: false, reason: "repeat" };
  const flat = clean.toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]+/g, "");
  if (WALKS.some((walk) => flat.includes(walk))) return { ok: false, reason: "mash" };
  const latin = (clean.match(/[A-Za-z]/g) || []).join("").toLowerCase();
  if (latin.length >= 5 && !/[aeiou]/.test(latin)) return { ok: false, reason: "mash" };
  const tokens = flat.split(/[^a-z0-9\u0980-\u09ff]+/).filter(Boolean);
  const words = clean.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  for (const word of words) {
    if (BAD_WORDS.has(word)) return { ok: false, reason: "language" };
  }
  for (const part of BAD_PARTS) {
    if (part.length >= 4 && (flat.includes(part) || clean.includes(part))) return { ok: false, reason: "language" };
  }
  if (!Array.isArray(answers)) return { ok: false, reason: "answers" };
  for (const answer of answers) {
    if (!answer || typeof answer.qid !== "string" || !ANSWERS.has(answer.value)) return { ok: false, reason: "answers" };
    if (answer.qid.length > 40 || !/^[a-z0-9_]+$/.test(answer.qid)) return { ok: false, reason: "answers" };
  }
  if (tokens.length > 8) return { ok: false, reason: "length" };
  return { ok: true, name: clean };
}

export function mergeAnswerLists(existing, incoming) {
  const map = new Map();
  for (const item of existing || []) {
    if (item?.q && item.a) map.set(item.q, item.a);
  }
  for (const item of incoming || []) {
    if (!item?.q || !item.a) continue;
    const prev = map.get(item.q);
    if (!prev || prev === "unknown") map.set(item.q, item.a);
  }
  return [...map].map(([q, a]) => ({ q, a }));
}
