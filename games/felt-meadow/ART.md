# Felt Meadow art: felted wool 3D

Felt Meadow's own visual style: a needle-felted nature table (a sage felt hillside on a cream cloth, a drawstring pouch, a felt bee, a snail, and a mouse) that stays calm and cheap on an old iPad. This style is claimed by Felt Meadow. Other jam games pick a different one; the jam-wide quality bar and the claimed-styles registry live in [`docs/art-direction.md`](../../docs/art-direction.md). The techniques below (inverted-hull fuzz on a few hero objects, blob shadows, colours authored as display values, one optional post pass) are reusable; the felt look is not.

## The look

- **Everything is wool.** Matte surfaces with a heathered dye that varies fibre by fibre, a faint fibre bump, and a soft sheen where the surface turns away from the eye. Shapes are round and slightly lumpy, like wool pressed with a needle. Nothing is shiny, hard, or sharp.
- **A kid can read it at a glance.** Felt's weakness is mush: every surface is soft, low-contrast, and fuzzy-edged, so things melt into each other. The fix is a hard value split. The hillside is one mid-dark sage in every season; everything the child can touch is either much lighter (the cream pouch, the white-winged bee, the pale snail and mouse, the saturated flowers and seeds) or much darker (the brown molehills). The fuzz halo on the hero objects is lifted toward cream, so their silhouettes separate from the grass instead of blurring into it.
- **Motion carries the charm.** Seeds lag, stretch, and squash; flowers spring up, overshoot, and nod; the pouch wiggles and offers its seeds; each creature has its own way of moving. A still frame should look like a nature table; a moving one should feel alive.
- **Very quiet.** Idle life breathes and wanders; nothing flashes or nags. Guidance is a soft gold ring on the grass and a cream felt hand that appear only when the child is idle. There are no scores, counters, or verdicts anywhere.
- **Seasons, as a mirror.** The hill follows the calendar outside (spring blossom flecks, a golden summer, russet autumn leaves, winter frost). It changes only the look; nothing becomes possible or impossible by date.
- **History.** The reference was a felted-wool concept render: a sage felt slab on a cream backdrop with a cream drawstring pouch, muted heathered dyes, and soft fuzzy silhouettes. The render's own weakness, soft shapes on a soft ground, is what the value split fixes. The refinement passes are in [`REFINEMENT.md`](REFINEMENT.md).

## Palette

Light things and dark things on a mid-value ground. Colours are the values they should show on screen: the renderer outputs them untouched (no tone mapping), so turning the post pass off on a slow device never shifts the palette.

| Role | Colour | Notes |
| --- | --- | --- |
| Cloth, wall | `#e7dcc6` near, `#eee5d4` far; wall `#f1e9db` to `#f6f1e7` | Warm cream, sweeping up into a felt sky |
| Hillside grass | spring `#5b714b`, summer `#61704a`, autumn `#646c48`, winter `#6a7a67` | Always mid-dark, so the light pieces pop and the gold ring reads |
| Molehills | soil `#5d3c2a`, deep `#3e281c` | The darkest things on the hill |
| Pouch | `#ece2cc`, shade `#cfc0a2`, inside `#3a2a21` | The lightest thing on the hill: the place seeds come from |
| Seeds and flowers | red `#db5140`, orange `#ef8c3c`, yellow `#f6cb3c`, green `#93cc5a`, blue `#5086de`, purple `#a468ce`, brown `#b07446` | Petals are a step lighter than their seed |
| Bee | yellow `#f4c232`, dark `#2d2622`, wings `#faf6ee`, cheeks `#eb9c8d` | Big white eyes with a shine |
| Snail | body `#dcd0dc`, shell `#c98f47` with cream stripes `#f1dfb7` | |
| Mouse | `#cfb394`, belly `#f0e4d0`, pink `#e7a2a0` | |
| Guidance | glow `#fff1c9`, hand `#fbf4e6` | Additive gold ring; a cream felt hand |

All colours live in `PALETTE`, `HUE_HEX`, and `PETAL_HEX` in [`view/felt.ts`](view/felt.ts) and `SEASON_LOOKS` in [`season.ts`](season.ts).

## How it is built (and why it stays cheap)

- **One felt material family** ([`view/felt.ts`](view/felt.ts)): `MeshLambertMaterial` with vertex colours, a heather texture (short curly fibres laid down at random, each with its own dye offset) and a matching fibre normal map, both generated in code at startup and tiled. A three-line `onBeforeCompile` adds the fresnel sheen. Nothing is fetched or committed as an image.
- **Fuzz only where it counts.** An inverted-hull shell (the mesh again, pushed out along its normals, back faces only) dithers away with fibre noise into a soft halo lifted toward cream. It sits on at most five hero objects: the bee's body and head, the flowers (petals and centres), and the molehills. There is no multi-shell fur. The bee's shells inflate only the body and head balls, not the merged eyes, cheeks, and legs, which would each grow a grey ring across the face.
- **Merged meshes, instanced repeats.** Rigid props (the hill, the pouch, the burrow, bushes, stones, the backdrop) are merged from primitives with colour and contact occlusion baked into vertex colours, so there is no AO pass. Seeds, molehills, stems, leaves, petals, flower centres, grass tufts, seasonal scatter, blob shadows, glow rings, and puffs are instanced, one draw each; the fuzz shells reuse their base mesh's instance buffer.
- **Blob shadows, no shadow maps.** One instanced mesh of soft multiplied blobs drawn straight after the hill. The same trick, additive and gold, draws the guidance rings.
- **Lights.** A warm hemisphere light and one warm key from the upper left. Lambert only; no specular.
- **Camera.** A 30° lens tilted about 37° down: low enough that flowers stand up and creatures show their faces, high enough to see all three molehills and the pouch.
- **One optional post pass** ([`view/post.ts`](view/post.ts)): a miniature's tilt-shift blur on the top tier only, a slight warm grade, and a soft vignette. Because colours are display values end to end, dropping the pass loses the blur and vignette, never the palette. The pass draws the scene into a plain (not multisampled) target: a multisampled one at DPR 2 cost more GPU fill than everything else on the top tier together (at four times the pixels on an M4, 38 fps with it and 60 without), and at DPR 2 the tilt-shift already softens the horizon.
- **Geometry is built once per page** (per season) and reused by every mount. The frame loop creates no objects of its own; what garbage remains (about 21 KB per drawn frame, measured) is numbers boxed between calls and three.js's render-list sort. Plain, instanced, and instance-coloured props each get their own copy of the felt material, because three.js re-derives a shared material's program every time consecutive draws differ in those ways.
- **Adaptive quality** ([`perf.ts`](perf.ts)). Four tiers, stepped by measured frame intervals: tier 0 is DPR 2 with the blur, the post pass, and all fuzz shells; tier 1 is DPR 1.5 with the post pass and fuzz on the bee and flowers; tier 2 is DPR 1.25 with fuzz on the bee only; tier 3 is DPR 1 with no fuzz, no post pass, and no puffs (tier 2 draws half of them). A slow one-second window steps down (two tiers when very slow), leaving out the window's longest frame so one long frame never changes the tier; eight seconds at full rate with CPU work under 8 ms tries one tier up. A fresh upgrade is judged on half-second windows for three seconds, and if it fails it becomes a ceiling for the session at once (any other tier after failing twice), so the game never oscillates and a weak GPU sees at most one short dip. `?tier=N` pins a tier. Touch devices start at tier 1 and earn tier 0. The render loop draws every other display frame once the meadow has rested (20 seconds untouched with nothing in motion but its own idle life), and stops whenever the meadow is unattended or hidden.
- **Grown-up overlay.** `?fps=1` shows a frame graph with fps, the 95th-percentile CPU time, the tier, and draw calls.
- **Budget.** About 34 draw calls in a full scene at tier 0 (target under 80), at most one full-screen pass, no shadow maps, DPR at most 2, zero network requests.

## Motion rules

- **Seeds** have weight. A held seed follows the finger on a slightly underdamped spring, so it lags a fast swoop and swings past a hard stop; on the move it draws out along its path and rounds up as it slows. Dropped, it falls, squashes, and rolls a little; planted, it presses into the soil with a plop.
- **Flowers** sprout with a squeaky stem, overshoot, and open their petals with follow-through; a tap sets the stem nodding on a spring. Picking folds a flower into its seed in order: the stem slips out of the soil, the petals close into a bud, and the bud shrinks into the seed in the child's finger. Nothing is lost.
- **The pouch** breathes, wiggles when tapped, and offers its three seeds one by one with a stretch and a squash; a fresh seed pops up whenever one is taken.
- **Each creature has its own motion personality** ([`motion.ts`](motion.ts), [`bee.ts`](bee.ts), [`critters.ts`](critters.ts)). The bee is curious and bouncy: it wanders in loose loops, notices flowers, sips, hovers beside a flower the child planted to watch it open (never in front of it, and it visits only once the flower is open), and answers a poke with a spin-hop, a tumble, or a giggle behind its wings. The snail is slow and shy: it glides along its path, tucks into its shell and peeks out, stretches its eyes up tall, or shivers inside. The mouse is quick and twitchy: it darts between stops, freezes and rears to sniff, and leaps home, stands up and squeaks, or chases its tail. Knock on its burrow and the soil thumps; a mouse at home comes out to see, but never straight after a fright. Every action has variants picked without repeats with jittered timing and amplitude, and delights only happen while the meadow is calm.
- **The bee mixes paint.** Carrying two different colours, it loops the loop while the two pollen balls slide together and become one seed of the mixed colour, then carries the seed down beside an empty molehill.
- **Sound is felt too** ([`audio.ts`](audio.ts)). Everything is synthesized with Web Audio in a small wool-lined room: soft pats, pomfs, plops, a squeaky sprout, a music-box note per colour when a flower opens (a pentatonic ladder, so overlapping blooms stay consonant), and a quiet buzz that follows the bee and steps back under the moments that matter. Each creature's poke has its own voice.

## Guidance (style-independent)

[`guidance.ts`](guidance.ts) decides what to show; the view only draws it. After 3 seconds of idle, one next act glows: a loose seed and the molehill it could go in, else the pouch seed to take and its molehill, else a flower the bee could visit, else a flower to pick. After 5 seconds the felt hand demonstrates it once, and the bee looks at the child and then at the molehill. Demonstrations back off (gaps of 10, 20, then 40 seconds) and stop after four; then the glow fades and the meadow goes quiet. Nothing glows while a flower the child planted is still opening or the bee is answering a tapped flower, and the bee's own seed holds the next demonstration back three seconds, so the hand never talks over what the child is watching; none of these starts the ladder over. Any touch clears everything at once. On a fresh meadow the pouch's seeds bounce to invite a first touch. No text, no voice, no verdicts.

## Felt Meadow against the jam quality bar

Measured on the production build at 1180×820, DPR 2, touch, with the shared perf probe (Chromium with SwiftShader software rendering on a 4-core cloud VM). The CPU budget is what these numbers defend: frame rate on a software GPU says little about an iPad. Not yet measured on a physical iPad.

| Check | Bar | Felt Meadow |
| --- | --- | --- |
| JavaScript per frame, 95th percentile, 6× CPU throttle | under 8 ms | 6.0 ms with every effect pinned (`?tier=0`), 3.1 ms on the automatic tier, 3.3 ms pinned to the lowest (`?tier=3`) |
| Draw calls | under 80 | 34 in the seeded meadow at tier 0, 28 at tier 3 |
| Full-screen passes | at most 1 | 1 on tiers 0 and 1, none below |
| Shadow maps | none | none (blob shadows) |
| DPR | at most 2 | 2, 1.5, 1.25, 1 by tier |
| Network requests | none | none (textures and sounds are made in code; `egress:built` passes) |
| WebKit, same session as Pebble Table | at or above Pebble Table | 22 to 23 fps on the automatic tier against Pebble Table's 12 to 13 (software rendering, final build); 7 fps pinned to the top tier, which the tier controller leaves within seconds on this VM |

The passes and their measurements are in [`REFINEMENT.md`](REFINEMENT.md).
