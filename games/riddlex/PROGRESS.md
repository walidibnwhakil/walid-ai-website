# Riddlex recovery progress

Updated: 2026-11-04

| Workstream | Status | Notes |
| --- | --- | --- |
| Isolated GitHub branch | Committed | `riddlex-recovery`; no production merge |
| Games navigation and prototype | Committed | Separate Games and Riddlex pages |
| Casebook | Reconstructed, unverified | 171 entries: original 70 plus 101 additional curated entries; expanded set unverified |
| Personal relationship roles | Reconstructed | 15 generic roles; no private names |
| Guessing engine | Implemented, unverified | Weighted answers, candidate rejection, no-evidence guard |
| Answer correction | Implemented, unverified | Change last answer without restarting |
| Automated tests | Written, result unverified | 16 unit test cases plus 2 simulations; updated to cover 171 entries, CI unconfirmed |
| Original cinematic artwork | Missing | Placeholder emojis only |
| Mobile preview | Not deployed | No playable public link confirmed |
| Main / live website | Unchanged | No merge or deployment |

## Current constraints

The uncommitted PC-only implementation and original image assets cannot be recovered from GitHub. This branch contains a new reconstruction, not the original files. Automated test files and workflow exist, but no successful test run has been confirmed. Gameplay accuracy and mobile usability still require verification.

## Next priorities

1. Confirm CI tests and repair failures.
2. Re-run simulated games after question-selection changes and measure question count.
3. Restore the approved detective office art, cat reactions, and small wall photo.
4. Set up an isolated mobile preview, test it, and only then consider a production release.

## Static casebook audit (2026-11-04)
- Verified 70 unique entry IDs, 3 category counts, and that all fact keys have questions.
- Found four groups of identical fact signatures; added distinguishing clues and rechecked: no identical signatures remain.
- This is a static data audit, not a browser test or proof that the 16 Node tests passed.

## Simulated gameplay baseline (2026-11-04)
- Independently replayed the 70 casebook targets against the then-current engine logic using ideal Yes/No/Don't Know facts: 70/70 eventually identified, mean 27.7 questions. This is a weak user experience despite eventual success.
- Changed question priority to favor recorded evidence and increased the margin required for early guesses. The revised engine's metrics are **not yet measured**.
- Committed `simulation.test.mjs` with reproducible casebook and relationship simulations, and included it in `npm test`. GitHub Actions result still unconfirmed.

## Expanded casebook (2026-11-04)
- Added `expansion.js` with 101 new entries across familiar cartoons/anime, Bangladeshi and Indian figures, animals, and objects.
- Total casebook is now 171 entries (plus 15 relationship roles), wired into `casebook.js` and the game.
- Updated regression counts and simulation target to 171. **Expanded data has not yet passed a full executed Node test run**; count and coverage are implementation targets, not measured gameplay success.
- Earlier 70/70 simulation result applies only to the old 70-entry set, not to the expanded 171.
