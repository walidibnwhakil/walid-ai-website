/**
 * Fail closed if the currently active Firestore rules define collections or
 * recursive wildcard paths that the checked-in rules would overwrite.
 * A Firebase CLI deploy replaces the active ruleset; it does NOT merge.
 *
 * Usage: node scripts/guard-firestore-rules-deploy.mjs live-ruleset.json
 */
import { readFileSync } from "node:fs";

const rulesetPath = process.argv[2];
if (!rulesetPath) throw Error("Pass the downloaded active Firebase Rules API ruleset JSON");
const active = JSON.parse(readFileSync(rulesetPath, "utf8"));
const files = active?.source?.files;
if (!Array.isArray(files) || !files.length) {
  throw Error("Current deployed Firestore rules could not be read; refusing to overwrite.");
}
const original = files.map((file) => file.content || "").join("\n");
if (!original.trim() || !original.includes("service cloud.firestore")) {
  throw Error("Current deployment is missing Firestore rules; refusing to overwrite.");
}
const proposed = readFileSync("firestore.rules", "utf8");
const matches = (source) => [...source.matchAll(/\bmatch\s+([^\s{]+(?:\{[^}]+\})?[^\s{]*)\s*\{/g)]
  .map((m) => m[1].replace(/\s+/g, ""));
const expected = new Set(matches(proposed));
const livePaths = matches(original);
const missing = livePaths.filter((path) => !expected.has(path));
if (missing.length) {
  throw Error("Active Firestore rules contain paths not in this repository: " +
    missing.join(", ") + ". Refusing a destructive overwrite; merge their rules first.");
}
const forbidden = livePaths.filter((path) => path.includes("**"));
if (forbidden.length) {
  throw Error("Active Firestore rules contain recursive wildcard access patterns. " +
    "Review them before deploying: " + forbidden.join(", "));
}
if (!expected.has("/riddlex_entries/{slug}") ||
    !expected.has("/riddlex_slots/{id}")) {
  throw Error("Proposed rules are missing one or more Riddlex collections.");
}
console.log("Safety check passed: no active Firestore collection matching rule would be lost.");
