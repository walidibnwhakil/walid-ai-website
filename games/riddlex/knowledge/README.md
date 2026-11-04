# Evidence-backed expansion (2026-11-04)

The recovery baseline is `a1d6b30d2f447c7da643e598fce9ea95c182cb1c`.
This batch adds **1,490 distinct targets**, bringing the casebook to **1,791**:

| Category | Baseline | Added | Total |
| --- | ---: | ---: | ---: |
| Real / fictional people and characters | 146 | 1,450 | 1,596 |
| Animals | 75 | 20 | 95 |
| Objects | 80 | 20 | 100 |
| Casebook | 301 | 1,490 | 1,791 |

The separate 15 relationship roles are unchanged and excluded from these totals.
No UI, art, animation, deployment, main-branch changes, or paid services are part
of this expansion.

## Curated additions

`../curated-batch.tsv` retains its original 130 records and adds 80: 20 cartoons /
comics, 20 Bengali literary characters, 20 animals and 20 objects. Literary
coverage includes Devdas, Gora, The Home and the World, Pather Panchali, Padma
Nadir Majhi, Srikanta, Nastanirh and Kapalkundala. `curated-source-audit.json`
records the checked article identity and locator for these 80 additions.

These are new question summaries, not copied encyclopedia paragraphs. A book,
film and translated spelling of the same character do not become extra targets.
Existing generic animal groups and species may overlap; no unsupported mutual
exclusion is introduced.

## Structured CC0 additions

`wikidata-snapshot.json` contains **1,410** selected real people, original
statement IDs, ranks, values, available reference snaks, entity revisions and
English/Bengali labels. It is evidence from Wikidata, not a claim that each
assertion has been independently confirmed against its underlying publications.
`retrievedOn` is the snapshot capture date, not a promise of live revalidation
of cached assertions. Fixed entity revisions identify the evidence precisely.
1,349 / 1,410 birth-date claim sets and 1,016 / 1,410 occupation claim sets have
reference metadata; others are explicitly traceable Wikidata assertions.

The candidate queries select Bangladesh and India humans with an English
Wikipedia sitelink and Bengali label, ordered by sitelink count within each
country. Of 1,699 distinct candidates, the importer excludes:

- 162 conflicting / imprecise / unsupported-calendar birth dates;
- 79 candidates without adequate bilingual occupation plus place/work/award/sport;
- 42 people already represented in the baseline, matched by canonical QID or aliases;
- 6 duplicate names or identical birth-date/place clues.

397 selected people have Bangladesh citizenship assertions and 1,015 have India
citizenship assertions; two have both. Historical or additional citizenships
are retained in the source but do not establish unsupported negative facts.

`baseline-targets.json` freezes the baseline names and source titles used for
alias checks. The snapshot also records the canonical QIDs of all 59 baseline
real people, resolved through Wikipedia pageprops. Candidate aliases are used
for duplicate rejection, never counted as entities.

The compiler uses documented occupation, birthplace, awards, notable works and
sports when English and Bengali labels are available. Exact occupation IDs also
map conservatively to shared existing occupation questions. Birth-year ranges
and January–June membership derive from a recorded Gregorian birth date; these
are legitimate known negatives when the comparison is false. No missing
occupation, missing award, missing source reference or missing diagnostic is
converted into `false`. Conflicting gender assertions produce no gender facts.

Birth-date/place diagnostics provide distinguishing positive evidence without
putting the target's name in the question. This is a **knowledge coverage**
expansion, not proof of enjoyable human play: dates can be hard to recall,
Bengali source labels vary in quality, and many useful everyday / cultural
traits still need enrichment. Unique date/place-clue collisions are excluded
rather than assigned different identity-only flags. Missing facts remain unknown.

## Reproduce offline (no install)

From `games/riddlex`:

```sh
node build-curated.mjs
node build-wikidata.mjs
npm run validate
npm test
npm run benchmark
```

`validate` checks generated/source equality, IDs, normalized display names,
fact signatures, question coverage, Bengali translations and statement pointers.
Run this cheap gate during importing. Full tests and ideal/noisy simulations
belong after a substantial batch, not after each record.

## Optional source refresh

Network caches are temporary, not shipped to users. Python's standard library
is sufficient; no package installation is needed:

```sh
python knowledge/discover-wikidata.py /tmp/riddlex-source
python knowledge/fetch-wikidata.py /tmp/riddlex-source
python knowledge/pack-wikidata.py /tmp/riddlex-source knowledge/baseline-targets.json knowledge/wikidata-snapshot.json
node build-wikidata.mjs
npm run validate
```

`baseline-wikidata-ids.json` supplies the 59 canonical baseline QIDs. A fresh
`/tmp/riddlex-source/existing-qids.json` can override this mapping after review.
The packer refuses to proceed without canonical baseline IDs. Fresh downloads resume cached groups,
use one worker and retry rate limits. Refresh is deliberately separate from
normal offline compilation and game runtime. Review new source assertions and
coverage after refreshing; live Wikidata may differ from this fixed snapshot.

The 10k+ goal is not claimed as complete. The finite screened candidate pool is
exhausted for this batch; pushing to 10k needs richer distinguishing attributes
and broader reliable sources, especially for animals, objects and Bengali
fiction, rather than admitting thin rows or aliases to pad the count.

## Engine work after the expansion

The first full-run attempts exposed excessive scans of unknown history and
unrelated candidates and were stopped before completion. The final benchmark
uses the full expanded casebook. Unknown answers are now filtered once per
scoring call; a regression test compares every rank, weight and conflict count
with the original scorer, including all five response modes.

Question selection first uses consistent candidates, then evidence leaders.
When leaders exhaust their recorded clues, the existing tentative-guess/retry
flow can proceed instead of scanning thousands of unrelated facts. Lower-score
candidates remain in ranking and become reachable after rejection; corrected
answers can restore contradicted candidates. Dense/sparse picker equivalence
and sparse-after-retry cases are tested.

The evidence-margin and diagnostic confidence gates are not reduced. The final
exhaustion fallback requires at least two matches for casebook targets. The
existing direct single-question teacher-role behavior is preserved separately
for relationship roles. No names or personal identifiers are added to roles.

The structured runtime module is about 5.2 MiB uncompressed (about 751 KiB in a
local gzip estimate). The 8.4 MiB provenance snapshot is not loaded by the game.
Actual deployed compression and browser/mobile performance are not verified;
this branch is not published.
