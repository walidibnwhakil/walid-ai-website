# Snakes & Ladders — The Serpent King's Realm

Game: https://walid-ai.com/games/snakes-and-ladders/

Replaces the previous Snake game. `/games/snake/` redirects through both a meta refresh and `location.replace`. The Games index contains exactly one replacement card. No unrelated game implementation changed.

## Implementation

- `index.html`: English menu, board, settings, rules, statistics and result controls.
- `engine.mjs`: immutable deterministic state transitions, square coordinates, mappings, cryptographic rejection-sampled die and placement labels. `results.mjs` supplies mode-specific titles, earned medals and color-name standings.
- `game.mjs`: SVG environments/rigs, stepped movement, individual CSS 3D dice, player-head color selection, viewport fitting, bot scheduling, optional locally synthesized sound and safe local statistics.
- `cavern-eyes.mjs`: photographic eyelids anchored to the cavern plates for occasional blinks.
- `fireworks.mjs`: three staggered color-matched bursts with bounded rays, launch/explosion trails, visibility pausing and reduced-motion support.
- `cinematic.mjs`: one continuous bidirectional mouth camera. A moving aperture in the original menu reveals the actual SVG/Canvas board underneath, scaled in the distance with resolving focus. Menu return reverses that camera, releases Play Now from the mouth and restores the full controls. Bot defeat closes the same photographed jaw, holds a narrowed gaze and restores a sculpted 3D YOU LOSE title; its menu return swallows that title first.
- `snake-entry-mesh.mjs`: continuous local deformation of the original menu image’s lower jaw; entry never substitutes another head.
- `jungle-life.mjs`: independent flowing river texture, real leaf/vine sprites, and a kingfisher flight/perch/fish-catching loop.
- `menu-scene.mjs`: separately articulated menu snakes, lightweight waterfall flow and visibility/reduced-motion cleanup.
- `serpent-renderer.mjs`: cylindrical Canvas body shading and tangent-aligned photo-style skin strips, integrated top-down head/neck art and shared exact geometry with swallow paths.
- `style.css`: responsive presentation, separate jaw/eye/tongue animation, intro, lava, fireworks and reduced-motion alternatives.
- `assets/*.webp`: locally hosted generated painted cavern environments, marble material atlas, royal title and natural venomous-snake head and skin atlases. `games/preview-assets/snakes-and-ladders.webp` supplies the square Games card with an emerald Play Now control matching its sibling cards. The earlier SVG preview is retained for cache compatibility.
- `snake-geometry.mjs`, `snake-geometry.test.mjs`: shared endpoint/tangent and head-to-neck texture coordinates, verified without a DOM.
- `lava.mjs`: lightweight flowing bottom-lava highlights and bubbles.
- `engine.test.mjs`, `results.test.mjs`, `browser-check.cjs`: deterministic rules, mode/medal presentations and real Chromium verification.
- `.github/workflows/snakes-and-ladders.yml`: engine/browser verification with screenshot artifacts.

Other changed files: `games/index.html`, `games/snake/index.html`, `sitemap.xml`, `games/arcade.test.mjs`, `games/arcade-browser.cjs`, `games/refresh-guard.test.cjs`. The shared tests replace obsolete Snake cases with the replacement game's checks; unrelated assertions remain.

Removed obsolete files: `games/snake.mjs`, `games/snake-rules.mjs`, `games/snake/snake.css`, `games/preview-assets/snake.webp`.

## Rules

Players start inactive at 0 and must roll a 1 to enter square 1. Other opening rolls leave them outside. Before activation, even a six ends the turn. Only an already active pawn whose rolled move fits on the board receives an extra roll on six. After activation, rolls advance one square at a time with visible pauses. The third consecutive six is discarded and ends the turn. Overshooting 100 leaves the pawn in place and ends the turn, even on a six; exactly 100 finishes. Finished players are skipped and the final remaining player gets the last place automatically. A single human and bot share identical rules and randomness. Local matches support 2, 3 or 4 players with distinct pawn colors selected from nine choices. Tap an in-game player head for the round-swatch gold palette after Play Now; the first click on any die immediately locks every player’s color for that match. Selecting an occupied color before the lock swaps the two players. Pin pawn paths are reused from Ludu Mahir. Solo pins fill 70% of a square’s width; the pointed tip marks the exact square center. Two-to-four shared pins fan around that same center, keeping their colored faces distinct without moving their tips.

The board has 100 data-generated squares (99 numbers and a gold logo crown filling the finish cell). Row 1 begins at bottom-left, alternates direction each row, and ends with square 100 at top-left, marked with a crown.

| Ladders | Snakes  |
| ------- | ------- |
| 4 → 25  | 27 → 5  |
| 13 → 46 | 40 → 3  |
| 42 → 63 | 43 → 18 |
| 50 → 69 | 54 → 31 |
| 62 → 81 | 66 → 45 |
| 74 → 92 | 89 → 53 |
|         | 95 → 77 |
|         | 99 → 41 |

All visual endpoints use square-center coordinates from `engine.mjs`. Body control points move while the head/tail coordinates remain fixed. Swallowed pawns follow the current animated snake path, accompanied by a traveling color glow; ladder climbs follow their rendered straight geometry. Rolling stays locked until movement settles. Cancellation tokens prevent old turns from writing into restarted matches.

## Verification

Run from the repository root:

```sh
node --test games/snakes-and-ladders/engine.test.mjs games/snakes-and-ladders/snake-geometry.test.mjs games/snakes-and-ladders/results.test.mjs games/2048.test.mjs games/ludo-rules.test.mjs games/chess/chess.test.mjs games/tic-tac-toe/engine.test.mjs
python3 -m http.server 8765
# In another terminal with Playwright available:
CHROME=/usr/bin/chromium SERPENT_EVIDENCE=/tmp/serpent-evidence node games/snakes-and-ladders/browser-check.cjs
```

- 65 dedicated unit tests passed: 44 engine cases, 11 shared-geometry cases and 10 result/medal presentation cases.
- 51 browser verification groups passed without page errors, including viewport fitting, color locks, real die rotations, pawn steps, anchors, and the full match/result flows.
- Chromium viewports include 320×568, 360×640, 390×844, 412×915, 430×932, 768×1024, 1024×768, 1366×768, 1440×900, 1920×1080, 640×360 and 844×390. The full board and all controls fit without horizontal or vertical page scrolling. Each player has their own die; only the current human player can tap theirs.
- Sampled actual animated transforms for royal breathing, blinking, tongues, smaller snakes, leaves and vines; captured menu and intro frames.
- Verified changing lava and board paths, mathematical endpoints, roll locking, pawn release at snake tails and ladder tops, restart cancellation, automatic bot actions and storage-unavailable play.
- Verified color-name local winners, gold/silver/bronze celebrations, automatic continuation after 3.5 seconds, locked dice during celebrations, changing finish crowns and final three-/four-player color-name standings. The last remaining player is Loser and receives no unearned medal.
- Verified golden You Win for the human against the bot, pawn-color fireworks and no runner-up list. Two local players receive a pawn-color winner title with no extra standings. Three/four-player finish celebrations stop automatically; final summary shows only earned crowns, color names and placements.
- Verified You Lose remains bot-only, disappears as the photographic cobra closes its mouth, and returns after the camera exits, without victory fireworks. Multiplayer never invokes that defeat scene.
- 212 unit tests passed across the dedicated game suites, including the 65 Snakes & Ladders engine, geometry and presentation cases.
- Premium bot victory uses a deeply bevelled golden crest, animated reflected light and continuously looping fireworks.
- River/canopy Canvas pixel samples and kingfisher arrival, dice perch, water dive and fish-carrying return frames are captured.
- Verified reduced motion retains destinations and skips the long intro.
- Captured representative menu, intro, lava board, swallow/travel/release, ladder, celebration and defeat frames. CI publishes these under the `serpent-browser-evidence` artifact on its Actions run.

The old `games/arcade.test.mjs` has three existing Ludo failures, reproduced using its original revision and original Snake dependency: capture/safe-square, fourth-token finish and multi-rival capture. The current dedicated Ludo suite passes. The cross-game `refresh-guard.test.cjs` also stops before the replacement-game section at an existing Tic Tac Toe `#mode` selector mismatch. These are not reported as passing. The replacement retains the existing refresh-guard module, activated only while a match is in progress.

## Visual and platform limits

The gameplay board was redesigned after visual feedback: painted volcanic cavern artwork with serpent eyes/fangs, separate desktop and mobile compositions, polished emerald/ivory marble textures, beveled gold cells and frame, a rendered royal title, eight anchored natural-color venomous-snake heads, tapered animated scaled bodies, gold ladders, sculpted pawns, an ivory die, and viewport-fitted controls alongside the board on PC and below it on portrait phones. These are local WebP assets layered with the structured SVG board; the board is never a flattened screenshot. Numbering remains programmatically generated. The eight snake and six ladder endpoints match the latest approved numbered reference diagram. The menu now follows the approved jungle reference: painted environment and transparent gold emblem, independently clipped photo-style cobra/viper necks, heads, lower jaws, tongues and blinking eyelids. A separate Canvas paints moving highlights inside the waterfall silhouette, stream ripples and glowing particles while the environment image stays still. Desktop uses a side column of real buttons; portrait phones place the controls below the emblem. Twelve menu viewport checks verify all main controls without page scrolling. The unwanted Player/Bot color row is hidden in setup; in-game head taps retain color selection until the first die click. The entrance uses the original menu SVG and its original photo-textured head/jaw, with no new frontal head asset. The camera approaches its mouth, fades into the throat darkness, then the board emerges from a distant blurred state into a full-size clear board. Defeat reverses that journey with a closed mouth and a slow pullback. Both use layered 2D artwork and perspective transforms rather than a 3D animal model. The obsolete vector defeat snake was removed. The gameplay header uses the exact menu emblem asset. Natural brown viper, olive cobra, green pit-viper and black/white krait-style generated artwork replaces the fantasy heads. Cylindrical Canvas shading and tangent-aligned photo-style skin strips animate the bodies; top-down heads and necks are painted into the same Canvas with registered neck texture, while head and tail endpoints stay in their designated squares. Ladders use extruded SVG side faces and beveled rungs. Each player’s die has six actual CSS 3D faces and a 620 ms rotation with twelve explicit face-facing poses (two passes through all six faces) before the fair result. In bot matches, the human die is on the right. A small dedicated Canvas warps a masked hot-lava texture and draws moving highlights and bubbles beneath the board. Photo-textured eyelids anchored to the cavern eyes close and reopen periodically. Both effects respect visibility and reduced motion. The finish crown sits on a white cell. Pin pawns use the same vector shape as Ludu Mahir.
The gameplay board was redesigned after visual feedback: painted volcanic cavern artwork with serpent eyes/fangs, separate desktop and mobile compositions, polished emerald/ivory marble textures, beveled gold cells and frame, a rendered royal title, eight anchored natural-color venomous-snake heads, tapered animated scaled bodies, gold ladders, sculpted pawns, an ivory die, and viewport-fitted controls alongside the board on PC and below it on portrait phones. These are local WebP assets layered with the structured SVG board; the board is never a flattened screenshot. Numbering remains programmatically generated. The eight snake and six ladder endpoints match the latest approved numbered reference diagram. The menu now follows the approved jungle reference: painted environment and transparent gold emblem, independently clipped photo-style cobra/viper necks, heads, lower jaws, tongues and blinking eyelids. A separate Canvas paints moving highlights inside the waterfall silhouette and glowing particles while the environment image stays still. Another bounded Canvas flows the river texture, sways photographic vines/leaves, and animates a kingfisher landing on the background dice, diving for a fish and returning with it. Desktop uses a side column of real buttons; portrait phones place the controls below the emblem. Player counts 2/3/4 are always visible, with explicit Play with Friends and Play with Computer / Bot choices. Twelve menu viewport checks verify all main controls without page scrolling. The unwanted Player/Bot color row is hidden in setup; in-game head taps retain color selection until the first die click. The entrance retains the exact menu cobra artwork throughout. A local texture mesh opens its lower jaw without detached cutouts or a replacement head, while the camera advances into that same mouth and reveals the board. Defeat reverses that journey with a closed mouth and a slow pullback. Both use layered 2D artwork and perspective transforms rather than a 3D animal model. The obsolete vector defeat snake was removed. The gameplay header uses the exact menu emblem asset. Natural brown viper, olive cobra, green pit-viper and black/white krait-style generated artwork replaces the fantasy heads. Cylindrical Canvas shading and tangent-aligned photo-style skin strips animate the bodies; top-down heads and necks are painted into the same Canvas with registered neck texture, while head and tail endpoints stay in their designated squares. Ladders use extruded SVG side faces and beveled rungs. Each player’s die has six actual CSS 3D faces and a 620 ms rotation with twelve explicit face-facing poses (two passes through all six faces) before the fair result. In bot matches, the human die is on the right. A small dedicated Canvas warps a masked hot-lava texture and draws moving highlights and bubbles beneath the board. Photo-textured eyelids anchored to the cavern eyes close and reopen periodically. Both effects respect visibility and reduced motion. The finish crown sits on a white cell. Pin pawns use the same vector shape as Ludu Mahir.

Mobile checks use Chromium viewport emulation, not physical Android hardware or Safari on iPhone. No measured budget-device frame-rate guarantee is made. High/Balanced/Low adjust body update frequency and effects; system reduced motion overrides animation. Sound is lightweight synthesized tones and ambience rather than a recorded environmental soundscape. There is no match timer, Start/Stop, Pause, Restart or Rules control in gameplay. Rules remain in setup. One gold Menu icon, a global mute/unmute icon and a Settings icon sit in the header; redundant navigation labels are removed. The compact personal-dice dock leaves the board dominant, including with four players. On desktop, two opponents occupy opposite sides of the centered board; three/four players occupy its outer corners. The desktop logo is enlarged. Portrait-phone controls fit below the board. Matches are not persisted across page reloads; statistics/settings are local where storage is available. No accounts, online rankings, paid APIs, external game assets or heavyweight runtime dependencies are required.

Deployment and live verification are reported separately with the final commit and GitHub Pages run, rather than inferred from local tests.

## Current mode and celebration flow

The menu has always-visible emerald-and-gold 2/3/4-player choices, followed by Play with Friends and Play with Computer / Bot. Friends play locally on the same device. Bot results have no runner-up table. Local two-player results announce only the winning color. In three/four-player games, each actual finisher receives a board-anchored 3.5-second medal celebration; other dice stay locked during it. The next turn resumes automatically and skips finished players. The finish-square crown advances Gold → Silver → Bronze while there are places left to earn; the final board retains its last earned metal. A three-player match awards gold and silver, then names the remaining player Loser. Four players award gold, silver and bronze, then name the remaining player Loser. Final rows show the crown directly beside the player color and placement. Crown metal variants reuse the same art with silver/bronze material filters. Cancellation clears all timers, in-flight dice, fireworks pixels and camera transforms.

## Mouth portal and result-fit revision

The entrance opens and advances the original menu cobra before camera entry. Its same image mesh supplies upper/lower jaw deformation; a viewport-space mask reveals the actual board through the mouth. The board moves from distant, blurred and dim to its native, focused size. Every in-game/result Back to Menu action reverses this trip. After bot defeat, a 3D loss-word sprite shrinks into the opening mouth, then Play Now emerges and settles while the rest of the menu returns. Menu return cancels active movement/bot timers before the visual journey. The production site exposes no local test harness.

The die stage has no idle tilt. Twelve physical face-facing samples occur within 620 ms; the settled result faces the camera. Result containers clip transformed paint rather than adding internal scrollbars. All five result types (bot win, bot loss, two-player winner, three-/four-player final standings) are checked for visible buttons on twelve viewport sizes, including 640×360 and 844×390. Progressive multiplayer medals remain board-anchored and auto-resume after 3.5 seconds; final standings stay over the board. The loss title is local transparent WebP artwork, with no runtime asset API.

These animals are photographic 2D texture rigs and aperture compositing, not a volumetric 3D animal model. Physical iPhone/Android devices and Safari have not been tested.

## Mobile/desktop loading and thermal-work revision

Menu startup no longer downloads both cavern plates, snake textures or result artwork. Compact screens/pointers use a 768px emblem and 960px jungle background. Photo foliage and river/lava transparency masks are preprocessed local WebP assets, avoiding large getImageData loops during startup. Start shows Loading and locks duplicate clicks until required scene images/textures are ready; image decoding finishes before the cinematic starts. Failed downloads show a retry message.

Compact menus use one photographed emblem layer and small eyelids instead of many full-image SVG mask rigs. Water/sprites have bounded raster sizes and update rates. The portrait menu uses a safe grid even at 320×480; visible viewport resizing cannot leave a taller stale menu after rotation.

The static board, animated body Canvas and vector number/pawn overlay are independent layers. This also removes the SVG foreignObject Canvas composition path on mobile browsers. Each photographic snake body has a tight cached bitmap; only one body (plus an active swallowing snake) refreshes per tick, while heads remain animated. Canvas resolution follows displayed board size rather than a fixed 1100×1100 surface. Redundant hidden SVG body/shading updates, per-segment gradient creation, viewport CSS glow/blur layers and the unrelated global branding flower animation are removed. Menu/effects stop during camera travel, hidden tabs, and results. System reduced motion paints one static board instead of maintaining an idle loop.

Controlled Chromium comparison, same machine and throttling/network settings:

| Metric                                               |       Before |         After |
| ---------------------------------------------------- | -----------: | ------------: |
| Phone menu ready, 4× CPU / 400 KB/s / 100 ms latency |        9.0 s |         2.2 s |
| Phone UI animation heartbeat during gameplay         | 3.7 frames/s | 56.6 frames/s |
| Phone main-thread busy share during gameplay         |        99.6% |         35.0% |
| Desktop menu ready, 1.5 MB/s / 30 ms latency         |        2.4 s |         0.7 s |
| Desktop main-thread busy share during gameplay       |        63.9% |         14.3% |

The heartbeat measures UI responsiveness, not the deliberately lower update rate of decorative snake bodies. These are emulated measurements, not a frame-rate or temperature guarantee for physical phones. Hardware temperature was not measured.

Validation: 212 dedicated game unit tests, 51 rendered browser groups and four new real-mobile-emulation groups pass. The latter use touch input, DPR 2, 4× CPU slowdown, 320×480/360×640/390×844/844×390 viewports, startup request exclusions, Loading/double-start guards, bounded cached rendering, layer alignment, fair dice input, hidden-tab pause/resume and return to menu. CI runs mobile-check.cjs after the main browser suite.
