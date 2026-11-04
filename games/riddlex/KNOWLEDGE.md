# Riddlex offline knowledge

The casebook now contains **1,791 distinct playable targets**: **1,596** real /
fictional characters and people, **95** animals and **100** objects. The separate
relationship branch contains **15** roles and is not included in that total.

Relative to recovery baseline `a1d6b30d2f447c7da643e598fce9ea95c182cb1c`, this
batch adds **1,490** targets: 1,410 sourced Wikidata people, 20 cartoons/comics,
20 Bengali literary characters, 20 animals and 20 objects. No aliases or raw
staging rows are counted. All gameplay data is local; there are no AI API calls.

See [knowledge/README.md](knowledge/README.md) for selection criteria, provenance,
exact category additions, reproducible import commands and limitations.

## Editable sources

- `curated-batch.tsv`: 210 curated targets, including the original 130 and 80 new
  targets. Eight pipe-delimited fields: id, name, category, known tags, English
  clue, Bengali clue, source article / HTTPS URL, evidence locator.
- `knowledge/wikidata-snapshot.json`: 1,410 selected CC0 entities, source statement
  IDs, revisions, original reference metadata and English/Bengali labels.
- `knowledge/baseline-targets.json` and `baseline-wikidata-ids.json`: frozen
  duplicate-exclusion baseline.

`build-curated.mjs` and `build-wikidata.mjs` compile these sources deterministically.
`knowledge.generated.js`, `knowledge.questions.generated.js` and
`knowledge.wikidata.generated.js` are generated outputs; do not edit by hand.

**Omission means unknown, never no.** Explicit negatives in the new structured
batch only derive from being a real human and from documented birth-date
comparisons. Missing awards, jobs, sources or other targets' diagnostics provide
no negative evidence. Conflicting source gender assertions remain unknown.

The legacy `import-knowledge.mjs` replaces the curated generated module and does
not retain this provenance format; do not use it to rebuild these batches.

## Validation

From `games/riddlex`, with Node installed and no dependency installation:

```sh
npm run validate
npm test
npm run benchmark
```

Run cheap `validate` checks incrementally. Full tests and benchmarks follow a
substantial import batch. Node 24 can also run the suite in one process with
`--test-isolation=none` if worker processes are restricted.

## Limits

These are evidence-backed, distinguishable targets, not a human accuracy claim.
Structured source assertions can be wrong even when they carry references.
Many new people rely on birth-date/place diagnostics that real players may not
know. Bengali labels come directly from Wikidata and need further editorial
review. Animals, objects and modern Bengali fiction need more coverage.
The 10k+ goal remains unfinished; thin or duplicate rows are not admitted just
to reach that number. This branch has not been merged, published or deployed.

## Verified results for this batch

**46 tests pass**, including full ideal-answer discovery, positive-evidence
separation for every imported person, source/generated equality, unknown
neutrality, duplicate validation, answer correction and all relationship roles.
The suite completed in 131.76 seconds in the cloud workspace; no install was used.

| Category | Ideal eventual | First guess correct | Mean questions | Maximum | Noisy correct within 60 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Characters / people | 1,596/1,596 | 1,590 | 33.01 | 291 | 467/1,596 |
| Animals | 95/95 | 95 | 11.56 | 35 | 62/95 |
| Objects | 100/100 | 99 | 16.91 | 83 | 62/100 |
| Casebook total | 1,791/1,791 | 1,784 | 30.98 | 291 | 591/1,791 |

Relationship roles: **15/15**, all first-guess correct, mean 5.2 questions,
maximum 13. The teacher's existing direct single-question identity behavior is
preserved. Casebook confidence gates were not reduced; the exhausted-question
fallback now requires at least two matches.

Ideal discovery includes rejecting wrong guesses and continuing: there were
168 wrong guesses across the full ideal casebook run, with a maximum of 85
rejections for one legacy target. Satyajit Ray needed the longest question path
(291). These sparse legacy profiles need enrichment; 100% eventual discovery
does not imply 100% first guesses or short human games.

The noisy run deterministically changes known answers to 25% unknown, 15%
same-sign probable, 5% flipped and 55% correct definite; absent facts always
remain unknown. At 60 questions, 591 targets were identified and 1,200 remained
unresolved. It included 2,408 wrong guesses before rejections. The first guess
was correct for 542 targets. This deliberately contradictory synthetic input is
not a real-user accuracy estimate. Wrong definite answers often require answer
correction under the existing conflict gate.

The combined ideal/noisy benchmark took 318.17 seconds with concurrent tests.
`knowledge/benchmark-results.json` contains exact category metrics, policy,
longest cases and an engine SHA-256. Roles were rechecked after restoring their
single-question teacher fallback; the casebook behavior was unchanged by that
relationship-only correction. No browser/mobile or human-play validation,
production deployment or paid-service test was performed.
