# Evidence and playability pipeline v2

All commands run from `games/riddlex`. Runtime is static HTTP; no paid API or
database is called during play. Source acquisition is a separate cloud job.

## Acquisition and resumption

```sh
python knowledge/acquire-v2.py /tmp/riddlex-v2 --limit 12000 \
  --cohorts bangladesh india fiction objects
# Resume the same command with the same cache directory.
# An incremental label pass can run after a substantial entity checkpoint:
python knowledge/acquire-v2.py /tmp/riddlex-v2 --labels-only
python knowledge/pack-v2.py /tmp/riddlex-v2
node validate-v2.mjs
```

Requests use batches of 40 IDs, at most two workers per job, one-second pacing,
bounded retries and API `maxlag=30`. Discovery cohorts and caps are explicit in
the source. Raw caches record each response's URL, successful retrieval time
and CC0 license. Query responses record the actual query and retrieval time.
Discovery is not a promise that an animal/object is eligible or playable.
The recursive animal query timed out during this execution; this is a known
acquisition limitation, not a reason to classify unverified taxa as animals.
The objects cohort currently screens direct musical-instrument subclasses.

`v2-schema.json` defines shared bilingual templates, property mappings and
coverage gates. People need six clues from at least four property groups;
animals/objects need four clues from at least three groups. Entity labels are
copied from archived Wikidata labels. Missing Bengali labels are counted;
English names remain visible when Bengali entity labels are absent.
Question-template translations do not create new facts or entity labels.

Only non-deprecated value statements are used; preferred ranks take precedence
within a property. Multiple occupations remain positive, not mutually exclusive.
There is no inference that an unrecorded occupation, award or affiliation is No.
Known humans supply `real=true`/`fictional=false` from P31=Q5; no other missing
fact is converted into a negative. Historical properties use ever/has wording.

## Identity, ambiguity and provenance

Canonical QIDs prevent identity padding. Baseline QID matches are excluded or
explicitly enriched using the same runtime ID. A matching name/alias against
an unresolved baseline identity is quarantined rather than asserted to be the
same person. Shared aliases among distinct accepted QIDs are reported separately;
they never become extra entities or trigger an automatic merge. Equal factual
signatures are explicitly rejected as indistinguishable.

`v2-evidence/` stores the eligible records' exact Wikidata revisions, statement
IDs/ranks/snaks/qualifiers/reference metadata, labels/aliases, retrieval time,
revision URLs and CC0 license. `v2-labels.json` stores related-label revisions,
retrieval times and source URLs. `v2-import-report.json` separates downloaded,
missing, rejected, ambiguous and structurally eligible rows. A Wikidata
assertion with no external reference remains visibly an unreferenced Wikidata
assertion; source tracing is not independent publication-level verification.

## Admission and exact final audit

```sh
node audit-v2.mjs --candidates
node validate-v2.mjs
node build-runtime.mjs
npm run validate
npm test
node audit-v2.mjs --final
node performance-v2.mjs
```

Eligibility is not playability. Candidate admission requires a correct first
guess, at least three independent supporting groups, no rejection oracle and
at most 60 questions. Final results are remeasured in the actual shipped pool.
Reports retain per-target outcomes, wrong first guesses and unresolved games.
Noisy simulations use deterministic 25% unknown / 15% probable / 5% flipped /
55% definite answers on recorded facts. They are synthetic tests, not user studies.

`knowledge-policy.js` is shared by runtime generation and the audit: direct
target-name questions and birth-date/year-cutoff shortcuts are excluded.
Relationship definitions are a separately counted semantic-role game.
Admitting fewer candidates can change question order, so the final-pool audit
is authoritative; a candidate-stage success must never replace that report.

## Runtime and performance limits

The initial module graph contains no casebook, generated data or evidence.
Category selection fetches content-addressed shards, 256 entries per shard,
with at most three concurrent fetches. Runtime shards retain names/facts and
questions, not statement provenance. The loader retains one category cache and
has a hard limit of 20,000 entries and 100 shards per category. Larger sets need
an additional hierarchical retrieval design before activation.
Name search uses Unicode-normalized prefix indexes and a bounded result count.
These are static requests, not an unbounded external search API.

The open-world scorer applies 90:10 definite and 70:30 probable likelihood
ratios, groups correlated evidence, retains contradicted candidates and uses
posterior-weighted information gain. These probabilities are model scores,
not calibrated human certainty. Insufficient evidence ends without a forced
guess. A false answer can still cause a wrong tentative guess; the noisy audit
measures that limitation explicitly.

Browser verification uses `browser-check.cjs` and a host-installed Playwright.
Set `RIDDLEX_CHROME` to a compatible executable when needed. It runs a local
HTTP server in the cloud and tests English/Bengali play, persistence, all five
answer inputs, answer correction and failed-load retry. Screenshots and measured
bytes/timings/heap appear under `knowledge/browser*`. Local HTTP measurements
are not Bangladesh mobile-WAN estimates.

Synthetic 10k/100k stress rows in `performance-v2.mjs` are ephemeral copies used
only for timing. They never enter data files, imports, entity counts or playability.
