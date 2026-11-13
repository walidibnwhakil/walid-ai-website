# Pawn layering evidence

The fixture uses actual SVG pawns and the existing geometry resolver on adjacent
route tiles, with custom lane tints and protected-square stars. Before images
have only `pawn-layers.css` disabled; after images enable it. Both use identical
pawn geometry, a two-pawn pair on each tile, and DPR 3. Images are native browser
close-ups, without resizing or artwork edits.

- Mobile (360px): [before](before-360.png) / [after](after-360.png)
- Desktop (1440px): [before](before-1440.png) / [after](after-1440.png)

`results.json` records the regression checks at 360, 390, and 1440px. Tests compare
rendered opaque head pixels against the same scene with tile decorations hidden,
assert identical painted outline/tile bounds with the fix enabled and disabled,
and exercise both single and paired pawns. Normal-motion tests pause the finish
shimmer at its peak; reduced-motion tests cover idle and finished-color tiles.

Run against a local server on port 4173:

```sh
node tests/ludo-pawn-layers.cjs
```

The existing `tests/ludo-tip-geometry.cjs` separately checks pointed-tip anchors,
zoom/resizing, and the immutable approved two-pawn visual reference.

## Cause and fix

Positioned route tiles used z-index 1, or 8 when occupied. Those independent
stacking contexts trapped even high-z-index pawns beneath later sibling tiles'
custom-color tints. Visible overflow alone did not fix painting order.

The new stylesheet resets route-tile z-index to auto while retaining positioned
tile anchors and visible overflow. Existing pawn z-index values then participate
in the board's shared isolated stacking context above tile decorations. Finish
shimmer brightness moves to the tint pseudo-element; the tile itself animates
only shadow. Animating filter on the tile can reserve a stacking context even
when its computed value is overridden to none.

No sizing, transforms, SVG geometry, gameplay, DOM order, or pair offsets change.
The implementation avoids every file changed by sizing PR #126.
