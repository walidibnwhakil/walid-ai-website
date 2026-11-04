# Riddlex offline knowledge

The casebook contains **301 unique playable targets**: 146 characters (real and
fictional), 75 animals, and 80 objects. The separate relationship branch contains
15 roles; those are not counted toward 301. No raw Wikidata rows are counted.

The original 171 targets are in `casebook.js` and `expansion.js`. The reviewed
2026-11-04 batch adds 130 targets: 40 real people, 30 fictional characters,
30 animals, and 30 objects. It emphasizes Bengal, Bangladesh, and India through
history, literature, music, cricket, familiar wildlife, clothing, instruments,
transport, and household tools.

## Reviewed batch and provenance

`curated-batch.tsv` is the editable source. Its eight pipe-delimited fields are:

`id | name | category | known tags | English clue | Bengali clue | source | locator`

Sources are encyclopedia or institutional pages, with a few supplementary
publication sources where needed. A source can be a Wikipedia article title or
a complete HTTPS URL. The locator identifies the relevant passage or subject;
`checkedOn` records the review date, not a promise that a page never changes.
Questions are newly worded summaries, not copied article descriptions. No
third-party images, downloaded article text, or live API are needed during play.

Every new target has broad known facts and a positive distinguishing clue in
both languages. `!tag` records an explicit false fact, such as a fish not being
a mammal. **Omission always means unknown**, including other targets' diagnostic
clues. Absence from a source never establishes a negative fact. Generic targets
and narrower targets (such as Snake and King cobra) may overlap; they are not
artificially marked mutually exclusive.

Compile and check offline with the existing Node runtime; no install or build:

```sh
node build-curated.mjs
node build-curated.mjs --check
npm test
```

On a restricted desktop where test worker processes cannot start, Node 24 can
run the identical suite in one process:

```sh
node --test --test-isolation=none engine.test.mjs quality.test.mjs curated.test.mjs simulation.test.mjs
```

The compiler produces `knowledge.generated.js` and
`knowledge.questions.generated.js`. Tests check that these exactly match the
reviewed source, all fact keys have questions, names/IDs/signatures are unique,
and each new target has enough positive evidence to outrank the other targets
without rejecting guesses. A definite diagnostic answer needs supporting facts;
an unknown/probable clue alone cannot force an early identity.

`import-knowledge.mjs` remains a legacy validator for separate reviewed JSON
experiments. Its CLI **replaces** `knowledge.generated.js` and does not preserve
this batch's diagnostic/provenance metadata. Do not use it to rebuild this batch;
edit the TSV and run `build-curated.mjs` instead.

## Verified limits (2026-11-04)

37 tests pass. The ideal-answer simulation identifies 301/301 casebook targets
and 15/15 roles. Casebook first guesses are correct for 295/301, averaging 27.41
questions, with a maximum of 180. All 130 new targets are first-guess correct,
averaging 23.86 questions; the new-batch maximum is 129 (Tintin). These are
deterministic answers from known facts, with all omitted facts answered unknown,
not a real-user accuracy claim. Long sparse paths remain a limitation.

Question counting now visits only present facts rather than scanning every
question against every candidate. A regression test checks identical picker
choices, including ties and unknowns. The full local suite completed in about
two seconds after this optimization. No live deployment was performed.

