# Quran Bengali translation scholar-review package

Repository: walidibnwhakil/walid-ai-website
Audit ledger: islam/quran/data/SEMANTIC-AUDIT-006-114.md
Current batch: Surahs 21–22 (190 verses)

## Purpose

This package is for an independent qualified Arabic/Quran scholar. It is not a certification and must not be presented as one. The reviewer should work from the Arabic stored in each surah JSON, compare the Bengali translation, and consult the licensed source and at least one reputable tafsir/translation when wording is interpretive.

## Required reviewer qualifications

- Arabic competence sufficient to parse Qur'anic syntax and morphology.
- Familiarity with a recognized Qur'an translation/tafsir methodology.
- Ability to distinguish semantic error from acceptable translation choice, explanatory gloss, and orthographic variation.
- Conflict-of-interest disclosure and dated signature.

## Per-verse worksheet

For every verse, record:

1. Surah:ayah and JSON file.
2. Arabic reviewed: yes/no; exact text hash or commit.
3. Bengali reviewed: yes/no; exact text hash or commit.
4. Subject/predicate and key grammatical relations.
5. Negation, exception, condition, tense/aspect, number, and pronoun referents.
6. Verdict: `correct`, `acceptable alternative`, `needs wording review`, or `semantic error`.
7. If not correct: proposed Bengali wording, reason, and supporting source/tafsir citation.
8. Reviewer initials and date.

## Batch 21–22 handoff

An AI-assisted pass was recorded for all 112 verses of Surah 21 and all 78 verses of Surah 22. No meaning-changing correction was approved during that pass. The independent reviewer must still re-read all 190 verses; the AI pass is only triage and does not reduce the required scholar scope.

Visible editorial candidates for decision include ordinary spelling/typographic forms in the licensed source. Do not alter them solely for style: decide whether each is a genuine semantic issue, a typographic issue, or an acceptable source-preservation choice, and record the decision.

## Approval record

Reviewer name: ______________________________

Qualification / institution: ____________________

Sources consulted: ____________________________

Verses reviewed: ______________________________

Open issues / disputed interpretations: __________

Signature and date: ____________________________

## Release gate

Do not label a surah fully semantically validated until every verse has a completed worksheet entry, all `semantic error` findings are resolved in JSON with source attribution, regression tests pass, and the independent reviewer signs the approval record.