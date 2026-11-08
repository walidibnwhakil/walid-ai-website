# Walid AI 2048

The existing `/games/2048/` route has been rebuilt in place. The Games preview,
other games, global navigation, and deployment configuration are unchanged.

## Implementation

- `../2048-core.mjs`: pure, size-independent movement, merge, spawn, milestone,
  status, Undo and input helpers. Injected RNG enables deterministic fixtures.
- `../2048.mjs`: DOM rendering, slide/merge/spawn transitions, input lock, one Undo,
  tile-origin victory effects, non-fire end results, synthesized sounds and local records.
- `index.html` and `2048.css`: premium menu, three board sizes and desktop/mobile layouts.
- `library.webp`: original generated library backdrop, approximately 115 KB.
- `crown.svg` and `laurel.svg`: original vector ornaments.
- Local subset Cormorant Garamond and DM Sans fonts; see accompanying OFL licenses.

Classic stops at the selected target and offers Continue with the same board.
Challenge records the milestone and continues. A later dead board after a Classic
victory is Game Over, preserving the achievement. Unachieved Classic ends in You Lose.

Valid moves alone save Undo, spawn one tile and add merge values to the score.
Undo restores the full previous logical state, including target/status, while
historical Best Score and highest-tile records remain. RNG uses Math.random;
future randomness is not claimed to rewind. Stats move/merge/milestone counters
rewind with Undo. Best records are keyed by mode and board size; the original
4×4 Classic best is migrated. Storage failure falls back to an in-memory session.

No music, backend, online leaderboard, cross-device sync, framework, continuous
particle loop, or remote runtime font/image request. Leaderboard is disabled.
System reduced motion overrides animation settings. On devices reporting low
memory or four or fewer CPU threads, victory trails use fewer particles.

## Verification

Run from the repository root:

```sh
node --test games/2048.test.mjs
node --check games/2048-core.mjs
node --check games/2048.mjs
node --check games/2048/browser-check.cjs
```

For rendered tests, install Playwright into a temporary working directory and
use the system Chromium (or set CHROME to another installed Chromium binary):

```sh
mkdir -p work
npm install --prefix work --cache "$PWD/work/npm-cache" --no-save --no-package-lock playwright@1.60.0
python -m http.server 8080 --bind 127.0.0.1
# In a second terminal:
NODE_PATH="$PWD/work/node_modules" node games/2048/browser-check.cjs
```

The browser suite saves screenshots and JSON results in `work/2048-evidence/`.
It checks menu and 4×4/5×5/6×6 boards at widths 320, 360, 390, 412, 430, 768,
1024 and 1440, checks overlap/overflow, keyboard, pointer and mobile touch swipes,
Undo, animation locking, reduced motion and persistence. It captures target
activation, numerical fire trails, convergence, text formation, final WINNER,
You Lose, Challenge Game Over and post-victory Game Over.

Fixtures are exposed only on localhost/127.0.0.1. No fixture controls are exposed
on the production hostname. Winning trails derive positions from rendered tile
rectangles; tests compare each numerical particle's source with a tile center.

The design follows the supplied references' composition, palette, typography,
wood, crown/laurels, gold framing, glossy tiles and purple/green controls. It is
an interpretation using original assets and responsive HTML/CSS, rather than
an exact reproduction of the references' detailed ornamental artwork.

The unrelated `games/arcade.test.mjs` has three Ludo failures reproduced using
an archive of the untouched starting commit b491543. They are outside this
2048 change and were not altered.
