# Quran Bengali semantic-audit coverage ledger

Date: 2026-11-18
Repository: walidibnwhakil/walid-ai-website
Baseline: commit 7397e4820b42054d0cb6f1b9a2f386725e2fd291

## Purpose

This ledger separates machine-verifiable data integrity from substantive Arabic-to-Bengali meaning review. Presence of Arabic and Bengali strings is not semantic certification.

## Current coverage

| Surahs | Verse records | Structural checks | Semantic status |
|---|---:|---|---|
| 1–5 | Existing prior audit | Prior audit retained | Audited in prior work |
| 6–15 | Existing prior audit | Prior audit retained | Spot checks plus 4 high-confidence corrections; not complete |
| 16–20 | 582 | All records have contiguous verse numbers, non-empty Arabic, and non-empty Bengali translation | Structural only; not semantically certified |
| 21–22 | 190 | Structural checks plus Arabic–Bengali verse-by-verse review pass | AI-assisted semantic review completed; no high-confidence meaning-changing correction approved; independent scholar review still required |
| 23–104 | 3,563 | All records have contiguous verse numbers, non-empty Arabic, and non-empty Bengali translation | Pending verse-by-verse semantic review |
| 105–114 | 196 | All records have contiguous verse numbers, non-empty Arabic, and non-empty Bengali translation | Earlier spot checks only; not complete |

The 16–114 range contains 4,531 records in this repository snapshot. Surahs 21–22 contain 190 records (112 + 78).

## Corrections already documented

- 6:10 — corrected the grammatical role of the consequence surrounding the mockers.
- 6:14 — restored the first-person predicate in **أَوَّلَ مَنْ أَسْلَمَ** (“the first Muslim”).
- 15:59 — restored the exception in **إِلَّا آلَ لُوطٍ** (“except the family of Lot”).
- 113:4 — removed the unsupported narrowing “all women” from **النَّفَّاثَاتِ فِي الْعُقَدِ**.

## Semantic review batch: Surahs 21–22

Review scope: every record in surah-021.json (112 verses) and surah-022.json (78 verses), checked against the preserved Arabic text and the licensed Abu Bakr Zakaria Bengali translation source identified in SOURCES.md, with meaning checked for predicate, subject/object, negation, exception, tense/aspect, number, and major referents.

Result: no high-confidence Arabic-to-Bengali meaning inversion, omission, unsupported addition, or wrong referent was approved for correction in this batch. The source translation contains ordinary orthographic/typographic variants; the project preserves the licensed translation text rather than silently rewriting it. Such variants are listed for scholar/editor decision in the review package.

This is an AI-assisted semantic review pass, not an independent scholarly certification. A qualified Arabic/Quran reviewer must still verify every verse and approve or reject any proposed wording change.

## Verification performed

For Surahs 16–114, each JSON file on the main branch was parsed and checked for:

1. the expected Surah file and JSON object;
2. contiguous verse numbering beginning at 1;
3. a non-empty Arabic field for every record;
4. a non-empty Bengali translation field for every record.

For the completed 21–22 batch, the same records were additionally read as Arabic–Bengali pairs and reviewed for semantic alignment. No Arabic, pronunciation, JSON shape, or website-design field was changed in this batch.

## Required independent review

A complete scholarly assurance claim still requires a qualified Quran/Arabic scholar to review every verse against the Arabic text and reputable tafsir/translation sources, with disputed interpretive choices explicitly recorded. Structural checks, automated comparisons, and language-model review are useful triage, but are not a substitute for that independent review. Until that review is completed, the project must not label Surahs 6–114 as fully semantically validated.