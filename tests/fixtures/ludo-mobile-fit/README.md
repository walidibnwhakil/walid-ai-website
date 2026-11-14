# Mobile board fit and pawn readability

## Missing Android screenshot configuration

No Android screenshot or device/viewport settings arrived in this conversation.
The exact reported Brave Android case is therefore **not verified**. The 412×915,
DPR 2.625 case is explicitly a representative Android emulation, not an inferred
configuration from the user's screenshot. Tests use Chromium with an Android
mobile user agent, touch, and device metrics; they do not run physical Brave
Android hardware. The requested phone/display scaling/page zoom/desktop-site
information remains pending. Do not present the representative case as that phone.

## Diagnosis before changing code

Baseline: main commit `4b8ee04a6e6c2a482cf490f1669d04dfc0339a99`.
The copied `baseline-layout.css` and `baseline-pawns.mjs` preserve those exact
sources for reproducible A/B tests. `initial-diagnosis.json` records parent widths,
padding, margins, transforms, viewport meta, visual viewport, and device metrics.

- The viewport meta already says `width=device-width, initial-scale=1`; no change
  is needed. Measured body zoom and visual viewport scale are 1.
- At a 360 CSS-pixel portrait viewport the board is already 354px wide, leaving
  3px of main padding per side. Recovering those gutters alone adds only 4px.
- CSS width and physical screenshot pixels are different. At CSS width 360 and
  DPR 3 the PNG is 1080 pixels wide. DPR 1 and DPR 3 at the same 360px width produce
  identical CSS board, tile, and pawn measurements; DPR is not multiplied into
  the pawn-size calculation.
- Single-pawn sizing previously depended on the shortest route-cell height.
  This limits the visible head even where horizontal tile space is available.
- A real layout problem exists in the 621–899px tablet breakpoint: at a 640×360
  touch viewport the stage is capped at 220px by `100dvh - 310px`, while intrinsic
  grid sizing pushes the board to about 372px and off-center. The phone pawn
  multiplier also stops at 620px. This case involves both board and pawn scaling.
- Portrait at default zoom is principally a pawn-readability budget issue, with
  a small gutter improvement available; the touch-landscape case also needs a
  container-sizing correction. There is no evidence yet establishing which
  case describes the missing Brave screenshot.
- Android display/font scaling, browser zoom, safe areas, and "Desktop site" can
  change the effective CSS viewport and font/intrinsic sizing. If the browser
  reports a desktop-width viewport, desktop rules can apply despite a small
  physical screen. Actual settings are required to diagnose that specific case.

## Fix scope

The new CSS is confined to `max-width:620px` or touch/coarse-pointer viewports
below 900px. It uses 1px or device-safe-area gutters, full available stage width,
and `minmax(0,1fr)` columns/min-width zero to avoid intrinsic-width overflow.
No overflow-hiding workaround is used. The original square board image, frame,
percentage padding, and calibrated tile grid are untouched. In landscape the
larger square board uses vertical page scrolling; it is not stretched or cropped.

Only mobile **single** pawns receive a new readability budget: 90% of the narrowest
actual route cell's stroke-inclusive width. It uses CSS dimensions, retains one
shared single size, preserves original artwork proportions, and keeps the visible
tip at the tile center. Home slots and paired/dense-pile sizing are untouched;
they grow naturally with the board. Both paired path tips retain 26%/74% anchors.
The existing pawn layering stylesheet remains unchanged.

Desktop sizing and all pre-existing layout CSS are unchanged. Tests enforce that
removing the new mobile media block leaves the original stylesheet byte-identical.
Renderer/import/style URL versions are refreshed for cache correctness.

## Measured actual gameplay (CSS pixels)

Dimensions below are the DOM bounds of the original outline path, excluding its
stroke; the complete stroke envelope is slightly larger. Measurements never use
just the tile-sized SVG wrapper as the pawn size.

| CSS viewport / DPR | Board before → after | Normal tile before → after | Single outline height before → after | Head width before → after |
| --- | --- | --- | --- | --- |
| 320×740 / 2 | 314 → 318 | 20.53×18.03 → 20.80×18.25 | 19.64 → 22.41 | 6.90 → 7.88 |
| 360×800 / 3 | 354 → 358 | 23.16×20.33 → 23.42×20.55 | 22.13 → 25.23 | 7.77 → 8.87 |
| 390×844 / 3 | 384 → 388 | 25.11×22.06 → 25.38×22.27 | 24.02 → 27.35 | 8.44 → 9.61 |
| Representative 412×915 / 2.625 | 406 → 410 | 26.55×23.31 → 26.81×23.53 | 25.39 → 28.90 | 8.92 → 10.15 |
| Touch landscape 640×360 / 3 | 371.83 → 638 | 24.31×21.34 → 41.72×36.64 | 19.39 → 44.98 | 6.81 → 15.80 |

The additional 360×800/DPR 1 test produces the same CSS dimensions as DPR 3.
`summary.json` and `verified-measurements.json` contain exact values, normalized
tile positions, square frame bounds, scroll widths, visual viewport, SVG transforms,
head raster pixels, hit targets, and desktop pixel hashes.

## Before/after screenshots from real controls

All states are reached through menu controls, die rolls, and pawn-head clicks/taps.
Only dice randomness is seeded for repeatability; pawn DOM, positions, or game
state are not inserted. Comparisons use independently loaded baseline/fixed
sources on mobile. Captures are native screenshots without image resizing.

| Case | Before | After |
| --- | --- | --- |
| 320px | [Viewport](single-normal-before-320.png) | [Viewport](single-normal-after-320.png) |
| 360px | [Viewport](single-normal-before-360.png) | [Viewport](single-normal-after-360.png) |
| 390px | [Viewport](single-normal-before-390.png) | [Viewport](single-normal-after-390.png) |
| Representative Android | [Viewport](single-normal-before-android-representative.png) | [Viewport](single-normal-after-android-representative.png) |
| Touch landscape (vertical scrolling) | [Viewport](single-normal-before-landscape.png) | [Viewport](single-normal-after-landscape.png) |
| Played pair at 360px | [Close-up](two-pawns-closeup-before-360.png) | [Close-up](two-pawns-closeup-after-360.png) |

Desktop comparisons at 800×700 (fine pointer), 1024×600, and 1440×1000 show **zero
pixel differences** for single and paired gameplay. To avoid independent page /
compositor raster variation, the desktop test holds the same real-played state
and applies exactly the mobile CSS delta plus the proposed renderer. It checks
that all other stylesheet bytes are unchanged, then compares full viewport RGBA
hashes with animation clocks fixed. No pixel tolerance or regenerated golden is
used. [Before desktop](single-normal-before-desktop-1440.png) · [After desktop](single-normal-after-desktop-1440.png).

The existing immutable two-pawn golden remains unchanged and is checked at its
original 354px board geometry. Pair layout at the new board widths is checked
using normalized dimensions and both tip anchors, rather than requiring absolute
pixel size to remain fixed while the board itself grows.

## Reproduce

```sh
python3 -m http.server 4173 --bind 127.0.0.1
CHROMIUM_PATH=/usr/bin/chromium node tests/ludo-mobile-fit.cjs
```

Optional `LUDO_MOBILE_CASES=360,desktop-1440` narrows the matrix;
`LUDO_MOBILE_OUTPUT=/tmp/mobile-fit` saves captures outside the repository.
The test also checks square aspect, frame bounds, full usable width, no horizontal
scroll, proportional tile geometry, head pixels above tiles, real movement, and
pair placement. Existing geometry/zoom/resize, gameplay, sound, and layering suites
remain in CI. The new full matrix is included in CI before supplemental fixtures.

**Separate draft PR. Do not merge or deploy without user approval.**
