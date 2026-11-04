# Riddlex recovery progress

Updated: 2026-11-04

| Workstream | Status | Notes |
| --- | --- | --- |
| Isolated GitHub branch | Committed | `riddlex-recovery`; no production merge |
| Games navigation and prototype | Committed | Separate Games and Riddlex pages |
| Casebook | Reconstructed, unverified | 70 entries: 30 characters, 20 animals, 20 objects; static checks passed |
| Personal relationship roles | Reconstructed | 15 generic roles; no private names |
| Guessing engine | Implemented, unverified | Weighted answers, candidate rejection, no-evidence guard |
| Answer correction | Implemented, unverified | Change last answer without restarting |
| Automated tests | Written, result unverified | 16 Node test cases; GitHub Actions workflow added |
| Original cinematic artwork | Missing | Placeholder emojis only |
| Mobile preview | Not deployed | No playable public link confirmed |
| Main / live website | Unchanged | No merge or deployment |

## Current constraints

The uncommitted PC-only implementation and original image assets cannot be recovered from GitHub. This branch contains a new reconstruction, not the original files. Automated test files and workflow exist, but no successful test run has been confirmed. Gameplay accuracy and mobile usability still require verification.

## Next priorities

1. Confirm CI tests and repair failures.
2. Run simulated games and validate guessing accuracy against expected answers.
3. Restore the approved detective office art, cat reactions, and small wall photo.
4. Set up an isolated mobile preview, test it, and only then consider a production release.

## Static casebook audit (2026-11-04)
- Verified 70 unique entry IDs, 3 category counts, and that all fact keys have questions.
- Found four groups of identical fact signatures; added distinguishing clues and rechecked: no identical signatures remain.
- This is a static data audit, not a browser test or proof that the 16 Node tests passed.
