# Snakes & Ladders — The Serpent King's Realm

Game: https://walid-ai.com/games/snakes-and-ladders/

Replaces the previous Snake game. `/games/snake/` redirects through both a meta refresh and `location.replace`. The Games index contains exactly one replacement card. No unrelated game implementation changed.

## Implementation

- `index.html`: English menu, board, settings, rules, statistics and result controls.
- `engine.mjs`: immutable deterministic state transitions, square coordinates, mappings, cryptographic rejection-sampled die and placement labels.
- `game.mjs`: SVG environments/rigs, movement, bot scheduling, match controls, optional locally synthesized sound and safe local statistics.
- `style.css`: responsive presentation, separate jaw/eye/tongue animation, intro, lava, fireworks and reduced-motion alternatives.
- `assets/*.webp`: locally hosted generated painted cavern environments, marble material atlas, royal title and six-color serpent-head atlas. `preview.svg` retains the existing index preview.
- `engine.test.mjs`, `browser-check.cjs`: deterministic rules and real Chromium verification.
- `.github/workflows/snakes-and-ladders.yml`: engine/browser verification with screenshot artifacts.

Other changed files: `games/index.html`, `games/snake/index.html`, `sitemap.xml`, `games/arcade.test.mjs`, `games/arcade-browser.cjs`, `games/refresh-guard.test.cjs`. The shared tests replace obsolete Snake cases with the replacement game's checks; unrelated assertions remain.

Removed obsolete files: `games/snake.mjs`, `games/snake-rules.mjs`, `games/snake/snake.css`, `games/preview-assets/snake.webp`.

## Rules

Players start at 0. No six is required to enter. Rolls advance by 1–6; six grants another roll. The third consecutive six is discarded and ends the turn. Overshooting 100 leaves the pawn in place; exactly 100 finishes. Finished players are skipped and the final remaining player gets the last place automatically. A single human and bot share identical rules and randomness. Local matches support 2, 3 or 4 distinct pawn colors.

The board has 100 data-generated numbered squares. Row 1 begins at bottom-left, alternates direction each row, and ends with square 100 at top-left, marked with a crown.

| Ladders | Snakes  |
| ------- | ------- |
| 3 → 22  | 17 → 7  |
| 6 → 15  | 39 → 18 |
| 28 → 52 | 54 → 34 |
| 47 → 68 | 62 → 36 |
| 72 → 91 | 87 → 24 |
|         | 99 → 78 |

All visual endpoints use square-center coordinates from `engine.mjs`. Body control points move while the head/tail coordinates remain fixed. Swallowed pawns follow a snapshot of the actual snake path, accompanied by a traveling color glow; ladder climbs follow their rendered straight geometry. Rolling stays locked until movement settles. Cancellation tokens prevent old turns from writing into restarted matches.

## Verification

Run from the repository root:

```sh
node --test games/snakes-and-ladders/engine.test.mjs games/2048.test.mjs games/ludo-rules.test.mjs games/chess/chess.test.mjs games/tic-tac-toe/engine.test.mjs
python3 -m http.server 8765
# In another terminal with Playwright available:
CHROME=/usr/bin/chromium SERPENT_EVIDENCE=/tmp/serpent-evidence node games/snakes-and-ladders/browser-check.cjs
```

- 175 unit tests passed across these five current suites, including 28 new engine cases.
- 21 browser verification groups passed without page errors.
- Chromium widths: 320, 360, 390, 412, 430, 768, 1024 and 1440. Square boards, 44px-or-larger Roll Dice buttons and no horizontal overflow.
- Sampled actual animated transforms for royal breathing, blinking, tongues, smaller snakes, leaves and vines; captured menu and intro frames.
- Verified changing lava and board paths, mathematical endpoints, roll locking, pawn release at snake tails and ladder tops, restart cancellation, automatic bot actions and storage-unavailable play.
- Verified red, blue, yellow and green celebration colors; WINNER, 1ST RUNNER-UP and 2ND RUNNER-UP scenes; final four-player standings.
- Verified YOU LOSE remains the bot result, disappears during swallowing and is visible again afterward, without victory fireworks.
- Verified reduced motion retains destinations and skips the long intro.
- Captured representative menu, intro, lava board, swallow/travel/release, ladder, celebration and defeat frames. CI publishes these under the `serpent-browser-evidence` artifact on its Actions run.

The old `games/arcade.test.mjs` has three existing Ludo failures, reproduced using its original revision and original Snake dependency: capture/safe-square, fourth-token finish and multi-rival capture. The current dedicated Ludo suite passes. The cross-game `refresh-guard.test.cjs` also stops before the replacement-game section at an existing Tic Tac Toe `#mode` selector mismatch. These are not reported as passing. The replacement retains the existing refresh-guard module, activated only while a match is in progress.

## Visual and platform limits

The gameplay board was redesigned after visual feedback: painted volcanic cavern artwork with serpent eyes/fangs, separate desktop and mobile compositions, polished emerald/ivory marble textures, beveled gold cells and frame, a rendered royal title, six individually colored painted heads, tapered animated scaled bodies, gold ladders, sculpted pawns, an ivory die, and controls beneath the centered board. These are local WebP assets layered with the structured SVG board; the board is never a flattened screenshot. The supplied reference guides the design; its incorrect numbering and endpoints are not copied. The menu and intro retain their earlier stylized SVG presentation. The intro uses layered 2D transforms and independent jaws, rather than a 3D camera. Body motion, swallowing, curling, lava and fireworks remain lightweight SVG/CSS effects.

Mobile checks use Chromium viewport emulation, not physical Android hardware or Safari on iPhone. No measured budget-device frame-rate guarantee is made. High/Balanced/Low adjust body update frequency and effects; system reduced motion overrides animation. Sound is lightweight synthesized tones and ambience rather than a recorded environmental soundscape. Pause finishes an in-flight movement before holding further turns. Matches are not persisted across page reloads; statistics/settings are local where storage is available. No accounts, online rankings, paid APIs, external game assets or heavyweight runtime dependencies are required.

Deployment and live verification are reported separately with the final commit and GitHub Pages run, rather than inferred from local tests.
