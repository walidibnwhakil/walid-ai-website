#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.argv.find((arg, index) => index > 1 && !arg.startsWith("--")) ?? "islam/quran/data";
const files = fs.readdirSync(root).filter(file => /^surah-\d{3}\.json$/.test(file)).sort();
const arabicWords = text => (text?.match(/[\u0621-\u064A\u0671-\u06D3]+/gu) ?? []).length;
const bengaliWords = text => (text?.match(/[\u0980-\u09FF]+/gu) ?? []).length;
const stripArabic = text => (text ?? "").replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u06DF-\u06E4]/gu, "");
const rows = [];
let total = 0, reviewed = 0, draft = 0;
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
  for (const verse of data.verses ?? []) {
    total++;
    const status = verse.pronunciationStatus === "reviewed" ? "reviewed" : "draft";
    status === "reviewed" ? reviewed++ : draft++;
    const pronunciation = verse.pronunciation ?? "";
    const arabicTokens = arabicWords(stripArabic(verse.arabic));
    const phoneticTokens = bengaliWords(pronunciation);
    const flags = [];
    if (!pronunciation.trim()) flags.push("missing-pronunciation");
    else {
      if (!phoneticTokens) flags.push("no-bengali-token");
      if (/[\u09BE-\u09CC][\u09BE-\u09CC]/u.test(pronunciation) ||
          /আান|ইিল|ওাআ|আল্াযিই|ররাব্বি/u.test(pronunciation))
        flags.push("malformed-bengali-vowels");
      if (arabicTokens && phoneticTokens < Math.max(1, Math.floor(arabicTokens * 0.35)))
        flags.push("possible-token-loss");
      if (status === "reviewed" && !pronunciation.trimEnd().endsWith("।"))
        flags.push("missing-verse-terminator");
    }
    // These signs require care when reading Arabic; they are NOT proof of a Bengali error.
    const hints = [];
    if (/ّ/u.test(verse.arabic)) hints.push("shaddah");
    if (/[ًٌٍْ]/u.test(verse.arabic)) hints.push("vowel-signs");
    if (/[ٰٓ]/u.test(verse.arabic)) hints.push("madd");
    if (/[ۖۗۘۙۚۛۜ۝۞]/u.test(verse.arabic)) hints.push("waqf");
    if (flags.length || status === "draft")
      rows.push({ surah: data.surah, verse: verse.verse, status, flags, hints, arabicTokens, phoneticTokens });
  }
}
const priority = rows.filter(row => row.flags.length);
const result = {
  version: 2,
  generatedBy: "scripts/quran-pronunciation-verify.mjs",
  humanReviewRequired: true,
  tajwidCertified: false,
  totals: { total, reviewed, draft, flagged: priority.length, priority: priority.length },
  queue: priority,
  note: "Heuristic flags are not linguistic certification; draft rows require individual Arabic review."
};
if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
else console.log(JSON.stringify(result.totals, null, 2));
