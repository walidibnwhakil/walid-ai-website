const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const dataDir = path.join(__dirname, "..", "data");
const forbidden = ["ইরজিআী", "আল-াম", "আল-ায়", "আল-া ", "আল-ইনসানু"];

for (let n = 50; n <= 89; n += 1) {
  const file = path.join(dataDir, `surah-${String(n).padStart(3, "0")}.json`);
  const surah = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(surah.surah, n);
  assert.ok(Array.isArray(surah.verses) && surah.verses.length > 0);

  for (const ayah of surah.verses) {
    assert.equal(typeof ayah.arabic, "string");
    assert.equal(typeof ayah.translation, "string");
    assert.equal(typeof ayah.pronunciation, "string");
    assert.ok(ayah.pronunciation.trim(), `${n}:${ayah.verse} has empty pronunciation`);
    for (const bad of forbidden) {
      assert.equal(ayah.pronunciation.includes(bad), false, `${n}:${ayah.verse} contains corrupted form ${bad}`);
    }
  }
}
console.log("Quran pronunciation regression checks passed for surahs 50-89.");
