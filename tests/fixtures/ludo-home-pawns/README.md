# Mobile home pawn comparison

Baseline: main `388ca2b`, including its existing 10% mobile home boost. Home pawns were still constrained by the smaller yard slot. The fix reuses route-single scale on phones while retaining the original home-slot center. Desktop uses the original fitted scale.

`node tests/ludo-home-pawns.cjs` plays both versions through real dice and pawn controls. Only dice randomness is seeded; game state is not injected. Three yellow pawns leave home, two remain paired on the start tile, and the third moves six steps. The remaining home pawn is compared with the route single. Screenshots are local gameplay, not production or a fixture board.

| CSS viewport | DPR | Before home height | After home height | Route single height |
| --- | --- | --- | --- | --- |
| 320 × 740 | 2 | 16.85px | 22.41px | 22.41px |
| 360 × 800 | 3 | 18.97px | 25.23px | 25.23px |
| 390 × 844 | 3 | 20.57px | 27.35px | 27.35px |
| 1440 × 1000 | 1 | 38.55px | 38.55px | 41.70px |

Heights measure the visible SVG outline bounding box in CSS pixels. Full measurements are in `measurements.json`. Desktop before/after viewport PNGs are byte-identical. Board, route-single and pair bounds are identical in each comparison. All sixteen initial home pawns stay inside their own bases without overlapping. Remaining home pawn centers and head hit targets are checked. Existing geometry checks preserve route tip anchoring and layer checks remain in CI.

Validation: exact CI Chromium 136 (Playwright 1.52), all four real-game configurations passed; 73 geometry scenarios passed; 31 Node/layout/sound tests passed. Native Android Brave was not available; these are Chromium mobile emulation results.

No merge or deployment until user visual approval.
