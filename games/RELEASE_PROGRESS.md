# Walid AI Games release progress

Updated: 2026-11-06  
Production baseline verified: `main` at `add568e82d1772351c38ea9df50a5d4766bad2de`.

This tracker records release state and the outstanding work from the Games quality program. A deployed URL means only that the game is currently available; it does not mean the newly selected visual redesign has been completed.

## Released baseline

| Game | Current production URL | Production state | Current selected-design acceptance |
|---|---|---|---|
| Ludo | https://walid-ai.com/games/ludo/ | Released in PR #3 (`01b05c1`) | Pending: 2/3/4 player setup and polished colorful mobile design |
| Chess | https://walid-ai.com/games/chess/ | Released in PR #3 (`01b05c1`) | Pending: realistic modeled wooden pieces and board |
| Football Penalty | https://walid-ai.com/games/penalty/ | Released in PR #3 (`01b05c1`) | Pending: goalkeeper-view stadium, visible animated keeper and net |
| Tic Tac Toe | https://walid-ai.com/games/tic-tac-toe/ | Released in PR #3 (`01b05c1`); neon redesign in verification on `codex/tic-tac-toe-neon` | Neon board, placement/win-line motion, bot and friend paths, mobile layout |
| Snake | https://walid-ai.com/games/snake/ | Released in PR #3 (`01b05c1`) | Pending: smooth rounded 3D-style snake, mobile touch controls |
| 2048 | https://walid-ai.com/games/2048/ | Released in PR #4 and focus fix PR #5 (`add568e`) | Pending: dark neon visual design; current keyboard focus fix is live |
| Riddlex | https://walid-ai.com/games/riddlex/ | Production baseline preserved; prototype remains development-only at `d2c0af17de3b6a64921360342fad84a18b9564d2` | Blocked on visual acceptance: detective/cat rig, Retry and reveal scenes remain defective; do not release prototype |

The shared Games page currently exposes seven game previews. The previous Chromium regression suite checked the six playable game routes and previews at desktop and mobile sizes. This is baseline evidence, not proof that the new design requirements are complete.

## Independent release queue

| Game / workstream | Acceptance criteria | Status | Evidence / checkpoint | Remaining work |
|---|---|---|---|---|
| Tic Tac Toe neon | Neon X/O board, animated placements and win line; bot/friend modes; no overflow at 320, 360, 390, 768, 1280; reduced motion; no browser errors | Ready for isolated release review | `arcade.test.mjs` 4/4; Chromium suite 5/5 widths, all six games and seven previews; screenshot inspected at 320 and 390; checked bot reply, friend win and SVG line geometry; 320px overflow caught and fixed | Commit, PR, merge, deploy and verify live route |
| Ludo selected redesign | Select 2, 3 or 4 players; bot/human combinations; legal turns, captures, safe squares, home lanes, finish; polished responsive mobile board and dice motion | Pending | Existing rule tests cover six exit, captures/safe squares, overshoot and win | Player-count UI and multi-seat state; design/polish; independent browser tests at five widths |
| Chess selected redesign | Distinct modeled wooden pieces/board, legal moves, captures/history, responsive bot/friend play | Pending | Existing move legality and checkmate browser coverage | Replace Unicode-piece visuals; authored lightweight wood/piece assets; regression and responsive checks |
| Football Penalty selected redesign | Pitch, visible animated goalkeeper, dive, shot trajectory, net/reactions, responsive controls | Pending | Existing bot/friend scoring browser flow | Replace emoji/flat keeper with articulated character; visual QA/performance |
| Snake selected redesign | Smooth rounded snake/head/eyes, natural turning, responsive keyboard/swipe, score/restart | Pending | Existing keyboard movement and pause coverage | Rendering/control polish, touch tests, mobile visual QA |
| 2048 selected redesign | Dark neon tiles, smooth merge/slide, keyboard/touch, score/best/restart, reduced motion | Pending | 12 core assertions; browser keyboard controls and focus restoration; live page verified | Theme/animation, swipe tests, best-score/restart and five-width checks |
| Riddlex visual scenes | Coherent exactly-two-arm detective and naturally rigged cat; Retry keeps same target/history; correct reveal fallback; verified real-browser frames | Unreleased; visual acceptance failed | Development branch has `d2c0af1`; previous functional browser checks pass, but reviewed Retry frames show disconnected/stretching arm and paper handling defects | Rebuild rigs/scene interaction; iterative Chromium frame review for idle, writing, smoking, printer, wrong answer, Retry, cat actions |
| Riddlex question engine | No contradictions/repeated questions; all five answer forms; familiar, informative category-aware questions; measured question distribution | Needs improvement | Dev simulation solved 1,797/1,797 runtime ideal answers plus 216/216 curated; mean ~31, worst 291 questions | Reduce worst-case question count without sacrificing correctness; add category/answer simulations and calibration |
| Riddlex knowledge | Verified, sourced, distinguishable records for people/fiction/animals/objects/roles; Bangladesh/India and global; repeatable enrichment | Pending | Development runtime manifest reports ~2,400 records: real people 2,053, fictional characters 130, unflagged character records 5, animals 96, objects 101; relationship roles 15 separately identified | Deduplicate and source attributes; build repeatable import; expand toward 10,000+ qualified entries |
| Riddlex images | Correct entity match, reusable license and attribution, dimensions, optimized asset, verification status; graceful fallback | Pending | 3 mapped usable entity image assets identified: 1 character, 1 animal, 1 object; license audit incomplete | Scalable Wikimedia/Wikidata/open-media pipeline; validate links/matches/licenses; report coverage by category |
| Additional games | Complete, rules/help, preview, responsive play, bot/friend where appropriate, own tests; each released independently | Pending | None in current release baseline | Prioritize Checkers, Sudoku, Memory, Connect Four, Solitaire and investigate Carrom/regional rules |
| Site regression | Preserve AI tools, auth/history/settings/legal/branding; Games immediately after Tools; lightweight previews/reduced motion | Per-release gate | Existing live routes returned 200 on 2026-11-06; seven previews were tested in prior Chromium suite | Repeat browser, error, network and live-route checks for each production release |

## Resumption instructions

Start from current `main`, refresh refs, and branch one game at a time. Run its deterministic tests and Chromium checks at 320, 360, 390, 768 and 1280px, inspect captured frames for visual changes, then commit/push/open and integrate only that verified game. Deploy and verify its live URL before moving to the next game. Keep Riddlex on its development branch until its animation, gameplay and data acceptance criteria pass. Update this tracker with commit, tests, production URL and genuine remaining issues after every release.
