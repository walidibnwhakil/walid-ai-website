# Combined sizing and layering verification

PR #126 is merged into main at `55e4d562106c0902002aea095704ffed30a1ce35`.
These screenshots were captured from PR #127 after incorporating that main commit.

The actual renderer contains all-color single pawns on every route/home region
and two approved pairs on adjacent tiles at the left home-path junction. The
fixture calls the existing geometry resolver without changing its sizing or
anchor logic. Screenshots use native DPR 3, without post-processing.

| Viewport | Full board | Adjacent pair close-up |
| --- | --- | --- |
| Mobile 360px | [Board](board-360.png) | [Pair heads and tips](adjacent-pairs-360.png) |
| Mobile 390px | [Board](board-390.png) | [Pair heads and tips](adjacent-pairs-390.png) |
| Desktop 1440px | [Board](board-1440.png) | [Pair heads and tips](adjacent-pairs-1440.png) |

Additional `upper-*`, `home-path-*`, and `bottom-*` close-ups show uniform single
pawn size on different board regions. Home-slot pawns retain the deliberate
home-slot size approved in #126; paired pawns retain their separate approved size.

`measurements.json` records rendered outline bounds and pointed-tip anchors in
the mixed scenes. The evidence script asserts equal single-pawn heights (spread
below .001px), centered single pointed tips (within .1px), and both adjacent pairs.

Reproduce with Playwright and a local server at port 4173:

```sh
node tests/ludo-combined-evidence.cjs
```

Other combined checks:

- `tests/ludo-tip-geometry.cjs`: 56 scenarios; all 92 cells/slots, all four colors,
  1–4 pawns, mobile/desktop, CSS/browser zoom, resizing, ready-hint peaks, actual
  painted bounds, and immutable approved two-pawn visual reference.
- `tests/ludo-pawn-layers.cjs`: 15 scenarios; neighboring tile occlusion,
  custom-color overlays, safe stars, paired overhang, and finish-shimmer peaks.
- `tests/ludo-pr-101.spec.mjs`: five browser checks.
- Rules/pawn-layout Node tests, broad layout/interaction checks, sound checks.

The older layout test now reads the inner rendered SVG geometry and the approved
home-slot envelope, rather than the old outer-SVG size/enlargement assumptions.
It waits for the geometry frame after live moves before measuring pawn tips.
No pawn rendering or sizing implementation was changed during combined validation.

PR #127 remains a draft awaiting visual approval. Do not merge or deploy it.
