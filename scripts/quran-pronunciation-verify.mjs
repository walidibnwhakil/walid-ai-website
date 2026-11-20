#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] ?? "islam/quran/data";
const files = fs.readdirSync(root).filter(f => /^surah-\\d{3}\\.json$/.test(f)).sort();
const rows = [];
let total = 0, reviewed = 0, draft = 0;
const stripArabic = value => value.replace(/[\\u064B-\\u065F\\u0670\\u06D6-\\u06ED\\u06DF-\\u06E4]/g, "");
const words = value => (value?.match(/[\\u0600-\\u06ff]+/g) ?? []).length;
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
  for (const verse of data.verses ?? []) {
    total++;
    const status = verse.pronunciationStatus ?? (data.surah === 2 && verse.verse <= 110 ? "reviewed" : "draft");
    status === "reviewed" ? reviewed++ : draft++;
    const flags = [];
    if (!verse.pronunciation) flags.push("missing-pronunciation");
    if (verse.pronunciation && words(verse.pronunciation) === 0) flags.push("no-bengali-token");
    const arabicTokens = words(stripArabic(verse.arabic ?? ""));
    const phoneticTokens = words(verse.pronunciation ?? "");
    if (arabicTokens && phoneticTokens < Math.max(1, Math.floor(arabicTokens * 0.35))) flags.push("possible-token-loss");
    if (/[ّ]/u.test(verse.arabic)) flags.push("shaddah");
    if (/[ًٌٍْ]/u.test(verse.arabic)) flags.push("vowel-signs");
    if (/[ٰٓ]/u.test(verse.arabic)) flags.push("madd");
    if (/[ۖۗۘۙۚۛۜ۝۞]/u.test(verse.arabic)) flags.push("waqf");
    if (flags.length) rows.push({ surah: data.surah, verse: verse.verse, status, flags, arabicTokens, phoneticTokens });
  }
}
const priority = rows.filter(r => r.flags.includes("missing-pronunciation") || r.flags.includes("possible-token-loss") || r.flags.includes("no-bengali-token"));
const result = { version: 1, generatedBy: "scripts/quran-pronunciation-verify.mjs", humanReviewRequired: true, tajwidCertified: false, totals: { total, reviewed, draft, flagged: rows.length, priority: priority.length }, queue: priority, secondaryFlags: rows.filter(r => !priority.includes(r)) };
if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
else console.log(JSON.stringify(result.totals, null, 2));
