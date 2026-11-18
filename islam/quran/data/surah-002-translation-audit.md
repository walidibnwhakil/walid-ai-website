# Surah Al-Baqarah Bengali translation audit

Baseline: `e1001572da6a21dff2a2a4b58229f9c267e54c12`
Post-edit reference: `0e979736cdbf2b7edd5776f4550ff3e82c66e294`
Audited file: `islam/quran/data/surah-002.json`

## Coverage

- Compared all 286 verses, including all 260 verses whose translation differed from the baseline.
- The 46 near-identical differences were treated as legacy footnote-marker or punctuation cleanup unless the Arabic meaning changed.
- No Arabic text, pronunciation fields, verse numbering, or unrelated files were changed.
- This pass makes one high-confidence semantic-preservation correction and records why other prominent examples were retained.

## Applied correction

- **2:3** — Restored the established theological terms **গায়েব** and **ঈমান**, and retained **সালাত**. The earlier wording “অদৃশ্য বিষয়ের প্রতি বিশ্বাস” is understandable, but it weakens the Qur’anic technical distinction between faith in the unseen and ordinary belief. The sentence structure remains accessible.

## Reviewed examples retained

- **2:9** — “প্রতারণা করতে চায়” preserves the attempted/deceptive force of *yukhādiʿūna* and is not a meaning error.
- **2:15** — “উপহাসের প্রতিফল দেন” preserves the theological nuance of the idiom without attributing human mockery to Allah; it is preferable to a bare literal rendering.
- **2:25** — “পবিত্র সঙ্গী” is faithful and clearer than the baseline’s corrupted “সঈিনী”.
- **2:26** — “বড় বা ছোট” correctly reflects *famā fawqahā* (“or something greater than it”); the baseline phrase “ক্ষুদ্র” is not a safe reversion.

This audit does not claim that all 260 changed verses have been independently retranslated. Remaining differences should receive a separate verse-by-verse scholarly review before any broader rewrite.
