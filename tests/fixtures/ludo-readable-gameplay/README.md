# Readable pawns — evidence from real gameplay

Every screenshot in this folder comes from the actual game controls at a native
360px, 390px, or 1440px viewport. No pawn DOM, positions, classes, dimensions, or
game state were injected. Only `Math.random` is seeded so the die rolls are repeatable.
The test starts a four-player friend game through the menu and uses touch events
on the die and on the actual pawn heads.

Moves: roll 6 to release one pawn onto its safe start; roll 6 to move it to normal
step 6; roll 2 to reach protected step 8. A separate fresh game rolls two sixes
and releases two pawns to the same square. This also checks a real played pair.

## 360px screenshots

| Scenario | Regressed main | Fixed actual gameplay |
| --- | --- | --- |
| Single on normal tile | [Before](before/single-normal-closeup-360.png) | [Full viewport](after/single-normal-360.png) · [Close-up](after/single-normal-closeup-360.png) |
| Single on safe tile | [Before](before/single-safe-closeup-360.png) | [Full viewport](after/single-safe-360.png) · [Close-up](after/single-safe-closeup-360.png) |
| Two pawns sharing a tile | [Before](before/two-pawns-closeup-360.png) | [Full viewport](after/two-pawns-360.png) · [Close-up](after/two-pawns-closeup-360.png) |

[390px normal gameplay](after/single-normal-390.png) · [390px pair](after/two-pawns-closeup-390.png) · [Desktop normal gameplay](after/single-normal-1440.png) · [Desktop pair](after/two-pawns-closeup-1440.png)

Screenshots are native browser captures, without resizing or image edits. At DPR
3, a 360px viewport produces a 1080px-wide PNG. Evaluate the full viewport at its
360 CSS-pixel display size; enlarged close-ups alone cannot establish readability.

## Measured results

All values below are **CSS pixels**, measured from the original rendered SVG
outline path (the stroke-inclusive height is slightly larger).

| Real-play scenario at 360px | Regressed main | Earlier larger policy | Fixed |
| --- | ---: | ---: | ---: |
| Single, safe start | 8.64 | 26.69 | 22.13 |
| Single, normal tile | 8.64 | 23.44 | 22.13 |
| Single, protected tile | 8.64 | 23.43 | 22.13 |
| Two-pawn artwork | 24.46 | 24.46 | 24.46 |

The single colored head grows from 3.04px to 7.77px wide. Singles use one common
scale across all route cells. The restored size is close to the earlier larger
policy on ordinary cells, with the existing stroke-inclusive pointed tip kept
at the owning tile center. The paired path tips retain their approved 26%/74%
side-by-side anchors. Original SVG paths, proportions, colors, board, dice, game
rules, and movement code are unchanged.

`before/measurements.json` was captured with main's sizing module from `0684737`.
`larger-reference/measurements.json` replays the route sizing function from
`74863b6` through the **same actual game controls**, adapting its old
`layoutTrackPawns` export to today's caller and preserving today's home-slot
renderer. It is an isolated historical-route comparison, not a claim that the
whole application is reverted. [Earlier larger normal pawn](larger-reference/single-normal-closeup-360.png).
`after/measurements.json` records the fixed actual-gameplay measurements at all
three widths, including SVG/viewBox dimensions, transforms, viewport/DPR, pointed
tips, artwork bounds, pixel colors, and stacking/hit-test results.

## Why previous tests missed it

PR #126 fitted each single above a center-anchored tip into 47% of the shortest
route cell's height. That imposed an approximately 9px stroke-inclusive height at
360px. This was a sizing policy regression, not a different live-game renderer.
The previous browser tests explicitly expected that half-cell fit and contained
artwork, and checked uniformity rather than minimum visible size. Static all-cell
fixtures and enlarged DPR screenshots made it easy to miss how small a lone
piece looked while playing. Single and paired pawns followed different scale
branches, explaining the visibly large pairs next to tiny singles.

The SVG viewport/wrapper is a whole tile; the inner `.pin-shape` transform controls
painted size. Wrapper dimensions alone are not the visible pawn dimensions.
Measurements confirm no body zoom or unexpected outer SVG transform at native
360px. Earlier production asset checks and screenshots matched source, so there
is no evidence of a separate production-only CSS path causing this regression.

The new test requires real 360px singles to have at least an 18px outline height
and 7px colored head, compares against both the regressed and earlier larger
appearance, verifies original proportions, checks actual head pixel colors and
hit targets above neighboring tiles, and tests real dice release and movement.
It runs in CI before supplemental artificial position fixtures. Existing tests
retain zoom, resize, all-region, and immutable approved-pair coverage. Cache-busted
renderer/import URLs ensure clients request the updated sizing module.

## Reproduce

Start the repository server on port 4173, then run:

```sh
CHROMIUM_PATH=/usr/bin/chromium node tests/ludo-real-gameplay.cjs
```

Baseline/reference captures additionally set `LUDO_CAPTURE_BASELINE=1` and
`LUDO_LAYOUT_REFERENCE` to the historical module, plus a separate output directory.
The default CI run always exercises current code, enforces readability, and
checks the played pair against the saved pre-fix measurements.

Draft evidence for visual review. Do not merge or deploy without approval.
