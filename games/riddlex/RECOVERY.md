# Riddlex recovery history

**Playable runtime:** 2,379 distinct casebook targets (2,184 characters, 95 animals, 100 objects) plus 15 relationship roles. The 1,791-target baseline is retained as a historical checkpoint.
See [KNOWLEDGE.md](KNOWLEDGE.md) and [knowledge/README.md](knowledge/README.md).
The original reconstruction checklist below is historical, not the current
knowledge-base status.

This branch is an **independent reconstruction**, not a recovery of the uncommitted files on the failed PC.

## Implemented
- Separate Games link beneath Tools (recovery branch only)
- /games/ directory and /games/riddlex/ prototype
- Small 12-entry sample casebook (2 characters, 5 animals, 5 objects)
- 15 privacy-preserving relationship roles
- Five response buttons, evidence-weighted ranking, tentative guesses, Retry and New Game
- No external AI calls, login, Firebase writes, personal identity storage, or paid services

## Not yet restored
- Original 70 active entries, their fact-level provenance, Wikidata enrichment pipeline
- Approved illustrated detective/cat/photo assets (emoji placeholders are NOT final artwork)
- Bengali/English UI localization, robust answer correction, printing animation
- Browser/mobile accessibility QA, independent human-play evaluation, 300+ casebook

## Local test
With Node.js installed, run `cd games/riddlex && npm test`. Tests were added but **have not been executed in this GitHub-only recovery environment**.

## Preview
The branch is not deployed. The GitHub source link is **not** a playable web link.
A branch-isolated preview must be configured and verified before claiming mobile playability.

## Safety
Never merge or deploy this incomplete prototype to production without approval and quality checks.
