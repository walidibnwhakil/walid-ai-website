# Royal Tic Tac Toe

Replaces the existing `/games/tic-tac-toe/` game. The Games preview, shared shell, other games, and GitHub Pages workflow are unchanged. The obsolete `neon.css` is removed. Runtime assets are all local; there is no server, paid service, account, or online synchronization.

## Rules and ownership

Easy is 3×3/connect 3, Medium 5×5/connect 4, Hard 7×7/connect 5. X starts. In two-player mode Player 1 owns the selected symbol, so Player 2 starts if Player 1 selects O. Every legal move checks every exact-length horizontal, vertical, and diagonal sequence. All completed sequences are returned; the first deterministic sequence drives the animation. Overlong runs return overlapping exact-length windows. Full boards without a winning line draw. The engine rejects occupied, out-of-range, fractional, nonnumeric, and post-result moves.

## Bot

All levels compete to win. No random mistakes are injected. 3×3 uses full-depth negamax/minimax with alpha-beta pruning, tactical forcing moves, and transposition caching. 5×5 and 7×7 use iterative deepening, alpha-beta pruning, exact immediate-win/block detection, fork-aware move ordering, open-sequence evaluation, center preference, bounded candidate sets, and transposition caching. Larger boards have a nominal 650 ms worker search budget, checked periodically; this is not a hard real-time deadline. They are competitive heuristics, not proven perfect solvers. Root ties preserve deterministic move order. A module Web Worker keeps search off the UI thread; unsupported workers use a shorter bounded main-thread fallback.

## Effects and lifecycle

Reusable SVG X/O assets remain separate from the interactive board. SVG fire endpoints are computed from real cell rectangles, with a ResizeObserver to maintain alignment. Canvas sparks trace the same geometry, burst at the final symbol, and transfer toward the result title. The title appears over the board with a flame sweep and glow. A 30 fps capped Canvas renderer carries fire from the winning line into the title, then paints animated ember and heat textures through an exact glyph alpha mask. There is no separate row of flames above the lettering. The result never increases the board or page height. A generation counter, worker termination, timer cleanup, and animation cancellation isolate restarts and menu navigation. Reduced motion and the effects setting use a static winning line and immediate readable result. Sound is synthesized with Web Audio and is off by default. Statistics and settings are local to this browser.

## Verification

From this directory:

```
npm run check
npm test
```

For browser tests install the declared development dependency and Playwright ffmpeg, serve the repository root with a static HTTP server, then run:

```
CHROME=/usr/bin/chromium TTT_URL=http://localhost:8000 TTT_EVIDENCE=/tmp/ttt-evidence npm run test:browser
```

The site is static HTML/CSS/ES modules; no production bundle is required. `check` validates every runtime module.

Verified before publication: 41 passing rule/bot tests and 397 passing Chromium assertions. The exact 3×3 policy was explored against every legal human continuation for either bot symbol: 541 nonterminal policy states, 279 terminal outcomes, no bot losses. Tests enumerate all winning windows on every board and both symbols, all orientations, invalid moves, draw and terminal locking, multiple wins, overlong runs, fork creation/prevention, reset state, ownership and result mapping.

The viewport layout uses a 100dvh grid and sizes the square board from both the remaining width and height. It adapts to phone browser chrome and landscape orientation without hiding overflow. Additional assertions cover 11 width/height pairs from 320×568 to 1920×953, including 667×375 and 844×390 landscape, full-screen menu/control visibility, in-board result placement, living fire frames and no result layout shift. Browser checks cover widths 320, 360, 390, 412, 430, 768, 1024 and 1440; square cells and no horizontal overflow; empty starting boards; all 12 level/orientation combinations; actual ignition frames and measured endpoints; all result titles; real worker openings/replies; responsive UI during larger-board worker searches; rapid restart and animation cancellation; reduced motion; dialogs; sound/settings/statistics persistence. The `You Win` presentation uses an explicitly stubbed worker fixture; `You Lose` uses the production competitive worker. Screenshots and a WebM recording are emitted to the evidence directory. Additional mobile ignition/burst/result captures verify a real 390px diagonal and its rendered endpoints.

## Visual limits

The royal menu, gold frames, green/blue/purple boards, carved corner ornament, walnut grain, crown/laurels, selected glow and glossy blue/red pieces use CSS and original SVG artwork. A compressed cinematic library background fills the entire screen, including its center. All game screens share one transparent logo asset inspired by the approved reference. These are interpretations of the reference artwork. Online play and leaderboard are visibly disabled as Coming Soon. Larger-board play is not mathematically perfect. Browser verification uses Chromium, including narrow desktop viewports; physical iOS/Android device and cross-engine testing are not claimed.

Gameplay hides the auxiliary Rules/Statistics/Leaderboard/Settings footer and reclaims its row for the board. These controls remain available on the menu, while the top Settings icon remains available in-game. `npm run test:fire` passes 32 additional browser assertions for glyph-clipped animated fire, absence of flames outside the title after the transition, menu-only auxiliary controls, viewport fit and restart cleanup.
