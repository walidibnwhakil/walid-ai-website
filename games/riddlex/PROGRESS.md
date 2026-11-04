# Riddlex recovery progress

Updated: 2026-11-04

| Workstream | State | Evidence |
| --- | --- | --- |
| Isolated recovery branch | Done | `riddlex-recovery` exists; production `main` not modified |
| Games link and prototype | Code committed | `index.html`, `games/index.html`, `games/riddlex/` |
| Guessing engine | In progress | Confidence-weighted scoring, question selection, rejection handling |
| Relationship roles | Starter implemented | 15 roles; no private names stored |
| Characters / animals / objects | Starter only | 12 sample entries, not the previous 70 |
| Automated regression tests | Written, NOT executed | 11 Node tests in `engine.test.mjs` |
| Approved detective art / animation | Not restored | Emoji placeholders remain |
| Mobile/browser verification | Not done | No live preview deployed |
| Main merge / deployment | Not done | Must pass testing and receive separate release approval |

## Current priorities
1. Execute Node tests and fix any failures.
2. Expand verified casebook with culturally relevant entries and distinguishing facts.
3. Replace placeholders with approved detective office and cat assets.
4. Verify a branch-isolated mobile preview before requesting production release.

This file records completed GitHub changes only; it is not evidence of a running background job.
