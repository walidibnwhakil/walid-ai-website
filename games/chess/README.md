# Existing Chess replacement

The existing `/games/chess/` route is retained. Its controller, page and styling were rebuilt; `games/chess.mjs` was removed. Shared game shell, unrelated games and global site files were not changed. The single Games-index Chess card still links to the same route.

## Rules and clocks

The existing `games/vendor/chess.mjs` is **chess.js 1.4.0**, verified byte-for-byte against `chess.js@1.4.0/dist/esm/chess.js` from the npm tarball. SHA-256: `76c7c34f0e2e9ab076521a5d6fe786a9cce537bb1b6f29d32a9c9970b5b232d2`. License: **BSD-2-Clause**, retained at `games/vendor/chess-LICENSE.txt`. Neither vendor file changed.

All legal movement, checks, castling, en passant, promotions, repetition, move counts, checkmate, stalemate and insufficient-material draws use chess.js. The UI only selects from engine-legal moves. Threefold repetition and the fifty-move rule are **automatically claimed**. Accordingly, a game cannot continue to fivefold repetition or seventy-five moves. Checkmate has precedence.

Clocks use elapsed wall time, including hidden-tab time, bot analysis, dialogs and promotion selection. Undo restores chess.js history, castling/en-passant rights and saved clocks/hints. Bot undo normally removes two plies; undoing the opening White bot move removes one. Ended games cannot be resumed through Undo. Timeout uses side-specific possible-mating-material adjudication, including lone king, minor pieces and bishop-square colors. This is a material test, not an exhaustive reachability search for rare composed positions with permanently blocked material.

## Bot

**Walid local search 1.0.0** is an original local engine using chess.js for every move. No paid API, remote analysis or Stockfish binaries are used. No Stockfish/GPL redistribution is involved.

- Easy: noisy one-ply material/position evaluation, randomized among the leading candidates.
- Medium: iterative alpha-beta search up to two plies, approximately 350 ms budget.
- Hard and Hint: iterative alpha-beta search up to four plies, approximately 1100 ms budget.

Budgets are checked periodically; a slow device returns the best completed iteration. These are relative difficulty levels, without a claimed Elo rating. They are not intended to match Stockfish strength. Analysis runs in a module Web Worker; terminating the worker cancels obsolete work on undo, restart, menu exit and page exit. A returned move is validated again by the live rules engine.

## Artwork and differences from references

All five uploaded PNG references were inspected: desktop, mobile, Black Win, You Win and You Lose. The original Preview and Menu references were visible earlier in the conversation but were not present in the ZIP or workspace. Those two screens were recreated using the supplied aesthetic; exact pixel matching to their original files was unavailable.

The twelve independently usable transparent WebP pieces were generated from the approved desktop artwork, then extracted into individual optimized assets. Ivory has blue jewels; black has red jewels; both have ornate gold bases. Title, bot avatar and small wood texture tiles were extracted from the approved desktop reference. Room, preview and result emblems were recreated from the approved artwork. The board is 64 interactive buttons; no reference screenshot is used as the playable board.

The recreation retains the library, gold/wood palette, crowned/laurel title, avatars, premium pieces, purple menu selection, victory emblems, particles/fireworks and fallen-king defeat. Fine carving, gold border ornaments, lighting, control proportions and banner details differ from the references. White/Black pieces are placed according to legal board orientation even where a reference depicts a different king/queen order. Defeat reads **You Lose!!**. Fireworks are omitted for draws and defeat; reduced-motion preference suppresses animated effects.

## Files

Replaced:

- `games/chess/index.html`
- `games/chess/wood.css`

Removed:

- `games/chess.mjs`
- Obsolete Chess preview SVG, Chess preview styling and knight animation within the Games-index integration.

Added:

- `games/chess/app.mjs`
- `games/chess/model.mjs`
- `games/chess/engine.mjs`
- `games/chess/bot-worker.mjs`
- `games/chess/chess.test.mjs`
- `games/chess/visual.test.cjs`
- `games/chess/README.md`
- `games/chess/assets/wk.webp`, `wq.webp`, `wr.webp`, `wb.webp`, `wn.webp`, `wp.webp`
- `games/chess/assets/bk.webp`, `bq.webp`, `br.webp`, `bb.webp`, `bn.webp`, `bp.webp`
- `games/chess/assets/title.webp`
- `games/chess/assets/bot-avatar.webp`
- `games/chess/assets/player-avatar.svg` (neutral profile silhouette; the former human portrait was removed at the user’s request)
- `games/chess/assets/light-wood.webp`
- `games/chess/assets/dark-wood.webp`
- `games/chess/assets/room.webp`
- `games/chess/assets/preview.webp`
- `games/chess/assets/victory.webp`
- `games/chess/assets/black-victory.webp`
- `games/chess/assets/icons.svg`

Necessary existing preview integration updated:

- `games/index.html`
- `games/previews.css` (only Chess selectors and obsolete Chess animation)

## Verification

Run rules/model/search tests:

```sh
node --test --test-isolation=none games/chess/chess.test.mjs
```

Tests include piece movement, pinned pieces, kings, known mates, castling restrictions, en passant/expiry, all promotion choices, automatic draw claims, timeout, undo, restart, identities/orientation, bot legality and result text. Known perft fixtures: starting position (20 / 400 / 8902), Kiwipete (48 / 2039 / 97862), rook ending (14 / 191 / 2812), all at depths 1–3.

Serve the repository root, install Playwright in the verification environment, and run:

```sh
python -m http.server 8000
node games/chess/visual.test.cjs
```

The browser script uses Chromium at `/usr/bin/chromium` (override `CHROMIUM_PATH`) and Playwright. Override `CHESS_BASE_URL` for live verification and `CHESS_SCREENSHOTS` for output. It exercises actual tap gameplay, promotion, Fool's Mate, worker hints, all bot levels, bot cancellation, clocks, results, menu dialogs, preview integration and layout. Screenshots cover preview, menu, mobile White/Black, narrow 320 px, desktop, You Win, You Lose!!, Black Win, White Win and Draw. Test pages use isolated browser storage; they do not write statistics for other visitors.

The screenshot suite uses reduced motion for stable captures. Victory fireworks and particles also require a separate normal-motion render check. Device tests are browser emulation, not physical Android hardware testing.

## Deployment

The existing `.github/workflows/publish-pages.yml` deploys the static repository on pushes to `main`. No deployment configuration was changed. Production route: https://walid-ai.com/games/chess/ . Online and Leaderboard are explicitly disabled. Statistics are local to the browser and tolerate unavailable storage; no cross-device synchronization is claimed.

### Recorded pre-deployment checks

- Node.js: **45 passed, 0 failed**.
- Chromium/Playwright 1.62.1: **42 browser assertions passed, 0 failed**.
- Separate normal-motion victory check: **1 passed**, with a rendered fireworks screenshot.
- Screenshots were rendered at 390×844, 320×740 and 1440×1000 and inspected against the five approved references. Screenshot artifacts are kept in the task workspace, outside the published site.
- No browser JavaScript exceptions or failed asset requests were observed in the automated browser run.
