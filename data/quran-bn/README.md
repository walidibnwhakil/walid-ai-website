# Independent Bengali Quran Draft Workflow

This directory contains independently composed Bengali translation and Bengali phonetic transliteration drafts. They are NOT authoritative, have not been scholar-certified, and must not replace existing licensed QuranEnc pages until qualified human review is complete.

Batches currently include Al-Fatihah (1:1-1:7) and Al-Baqarah (2:1-2:80), 87 ayahs total. Each record stores Arabic, original Bengali composition, original Bengali phonetic rendering, uncertainty flags, and review state. Other translations and recitations are cross-checks only, never templates.

Only `review_status: scholar_reviewed` may be considered for publication. All current records are `unreviewed_draft` and `publishable: false`. Transliteration is a reader aid, not tajwid instruction; madd, ghunnah, qalqalah, assimilation, waqf/ibtida and articulation require expert review. Every batch must pass the validator before review.

CI runs the draft validator and pytest coverage on the pull request before any review or publication decision.

The validator treats Arabic combining marks as valid source text and checks for non-empty Arabic instead of rejecting canonical Quranic diacritics.

Batch 007 (Al-Baqarah 2:71-2:80) was cross-checked against publicly available Quranic Arabic references; Arabic orthography and all Bengali content remain explicitly unreviewed pending qualified review.
