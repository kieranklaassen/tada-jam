# Turning Tower art: geometric valley

Turning Tower's own visual style: faceted, flat-shaded towers on stepped plinths under a peach-to-lavender dusk, seen through a true isometric orthographic camera, like a Monument Valley diorama. This style is claimed by Turning Tower. Other jam games pick a different one; the jam-wide quality bar and the claimed-styles registry live in [`docs/art-direction.md`](../../docs/art-direction.md). The reference concept is `07-geometric-valley.png` (salmon stepped plinths, cream trims, peach top left to lavender bottom right).

## The look

- **Architecture is one warm family.** Coral stone, rose accents, deeper salmon plinths, cream trims, all flat shaded: tops brightest, left faces mid, right faces darker, undersides tinted violet. No textures anywhere. The whole diorama is warm against the cool dusk, so it stands on its plinth instead of dissolving into the sky.
- **The hue split is the whole point.** The geometric style's weakness is that everything is one pastel family and nothing says "touch me". Here everything the child uses has its own hue, and nothing decorative borrows it:
  - walkable paths are raised **mint pavers** with a darker teal edge;
  - everything that turns or slides is **sunflower yellow** with indigo hubs: turn wheels and slide grips;
  - the wanderer is **deep indigo** with an **amber lantern**, the strongest contrast in the scene;
  - the bird is **cerulean** with a cream crest, a hue nothing else uses: it is company in most dioramas and a moving bridge in one, where its mint saddle says "walk here";
  - the door is **warm light** in an indigo arch, glowing even when closed.
  Rails, shafts and trims are cream, never yellow, so a child never tugs at scenery.
- **Impossible joins are honest.** The lattice is integer cells; a join between two ledges that only meet on screen is a real rule in [`world.ts`](world.ts), and the seam stays visible (inset pavers) so the trick reads as a trick.
- **Calm dusk.** Slow drifting motes and lit windows against a clean gradient: no background shapes, so the diorama is the only thing to read. Nothing flashes or nags.

## Palette

| Role | Colour | Notes |
| --- | --- | --- |
| Sky | `#f7c9a9` → `#ecb4bd` → `#b7a3d9` | Peach top left to lavender bottom right, with a soft sun glow |
| Stone / rose / plinth / trim | `#f0a08c` / `#e7877c` / `#e28a7c` / `#f6e6d2` | Architecture only |
| Shade | `#8e76b8` | Violet the unlit faces fall toward |
| Paths | `#9fe0d4` with edge `#5fb9ae` | Walkable, everywhere, including the bird's saddle |
| Handles | `#ffc53d`, hubs `#40357a` | "You can turn or slide this" |
| Bird | body `#63b3ec`, wings `#3d8bd4`, crest and tail `#fff4e0`, beak `#f08a5d` | A hue of its own |
| Wanderer | cloak `#3b3470`, face `#fbeedb`, lantern `#ffb547` / glass `#fff0c4` | |
| Door | arch `#3b3470`, leaves `#ffd98f`, light `#fff4d6` | |

All colours live in `PALETTE` in [`view/palette.ts`](view/palette.ts).

## How it is built (and why it is cheap)

- **Raw three.js, one scene, one render call.** No post-processing pass, no shadow maps, no lights: one unlit facet `ShaderMaterial` computes the flat-shaded light per vertex from the world normal and fades into the dusk by height, so the fragment shader only writes a colour.
- **Emissive in the vertex colour.** Colours baked above 1.5 are unlit (lit windows, lantern glass, door light), so glow costs no extra draw calls.
- **Geometry is built once per page.** Every diorama is greedy-meshed into one static mesh (only camera-facing faces) plus one mesh per moving group; the door, characters and ring models share geometry. Travelling never stalls a frame.
- **The ring is the same geometry, smaller.** The five little dioramas at the bottom reuse each room's meshes with a no-fog material, float toward the camera, and turn live with the big one.
- **Billboards share the camera's orientation**, because the orthographic camera never rotates: glows, the lantern halo, the join sparkle, touch ripples and the ghost hand are plain quads.
- **Characters are rigs of a few meshes** (wanderer 4, bird 5) posed by [`motion.ts`](motion.ts), with blob shadows.
- **Adaptive quality** ([`tiers.ts`](tiers.ts)): four tiers step DPR 2 → 1.5 → 1.25 → 1 and drop motes (48 → 24 → 0) and sky dither. The door and lantern halos stay at every tier: the door's glow is the scene's want, and the lowest tier still looks like the game. The governor judges windows of 90 frames or 1.5 s, whichever comes first; a median frame over 19 ms steps down one tier. It ignores the first 1.5 s of page load and 0.5 s after each change, and a stall over 1 s (a background tab) is never counted as slowness. So a device that is slow at every tier reaches the lowest before the first demonstration ends (tested). Stepping back up needs a calm stretch (median under 17.6 ms, CPU under 6 ms) of 4 windows, doubling after every drop up to 32. When nothing moves, the view draws every other frame and the governor ignores those half-rate intervals. Touch devices start one tier down (DPR 1.5) and earn the top tier. `?tier=N` pins a tier. `?fps=1`, or three quick taps in the top-left corner, shows a wordless frame-time bar graph. `window.__jamPerf` exposes per-frame CPU time, the tier, draw calls and triangles for the jam's perf probe.
- **Measured budget** (production build, 1180 × 820, DPR 2 requested, on a VM with no GPU, so both engines rasterize in software; no physical iPad measured): 33 draw calls and 4,370 triangles in First Turn. Per-frame CPU p95 in headless Chromium (SwiftShader), the median of three runs on the final build, is 2.2 ms at 4× CPU throttle, 3.4 ms at 6× and 11.1 ms at 20×. In WebKit, alternating runs with the same probe in the same session, the game ran at a median of 37.7 fps against Pebble Table's 14.2 fps (three runs each). An earlier session on a busier VM read 26.9 and 32.5 fps against 13.2 and 12.9. On this VM the governor settles on tier 3 (DPR 1), because software fill, not CPU, is the limit.

## Motion rules

- **Turns have weight.** Dragging follows the finger through a spring, with soft detents at every quarter and a rubber band past the limits. Letting go flicks to the nearest quarter with a small overshoot, a stone "settle" and a notch sound.
- **The wanderer is legato:** eased weight shifts, slow looks around, short careful steps with a waddle roll, and a lantern that swings as a real pendulum driven by the body's acceleration. It lifts the lantern toward the door (the want) and looks back once before stepping through.
- **The bird is staccato:** its head snaps between fixations, its tail flicks, it hops (never walks) with a deep crouch and two quick flaps, and it refuses, with a ruffle and a huff, to hop while someone is standing on it. When the wanderer goes through the door, the bird flies an arc after it, chirping, and goes into the light too.
- **A poke gets its own answer, never the same twice running.** The wanderer greets by looking out with the lantern raised, by bowing, or by swinging the lantern and swaying with it. The bird ruffles, puffs up, or bobs. The first answer is always the signature one, and each has its own sound: the bird's are chirps (a falling pair, a soft flutter, two rising pips), the wanderer's are bells (a fifth, a falling fourth, two notes timed to the lantern's swing). Tests check that every pair of answers is a different movement.
- **Sound is stone and air:** a grinding rumble while turning, a scrape while sliding, notches, bells in D major pentatonic for joins and the door, a small stone-hall reverb. Everything is synthesized; nothing is fetched.

## Guidance (style-independent)

[`guidance.ts`](guidance.ts) decides what to show; the view only draws it. The next useful thing glows after a short idle (3 s at 7, later for older children); a ghost hand then shows one verb (a partial turn, a nudge, a tap) and never how far. Demonstrations back off with doubling gaps and stop after four; any touch clears everything. Until the first touch in a diorama, the wanderer lifts its lantern toward the door now and then.
