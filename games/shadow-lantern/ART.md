# Shadow Lantern art: paper-craft diorama

Shadow Lantern's own visual style: a cut-paper toy theatre at night, a brass lamp in front of a lit paper screen, running at 60 fps on an iPad. This style is claimed by Shadow Lantern. Other jam games pick a different one; the jam-wide quality bar and the claimed-styles registry live in [`docs/art-direction.md`](../../docs/art-direction.md). The techniques below (geometric projected shadows, baked-light merged scenery, offset shadow cards) are reusable; the paper-theatre look is not.

## The look

- **Everything is cut paper.** Every object is a flat card with a hand-cut edge (a small wobble, never a ruled line), a thin bevel and a pale cut edge, standing on a folded stand or a brass pin. If a prop would be wood or metal in real life, it is paper printed that colour: the stage is kraft-paper strips, the lamp is two slotted brass-card profiles.
- **Layered, like a diorama.** Deep indigo night at the back, three rows of hills, clouds and pines, the red proscenium with tied-back curtains, the lit screen, the plank stage and the lamp at the front. Each layer stands a little in front of the last and carries an offset dark "shadow card" behind it, which is the style's contact shadow.
- **The lamp is the light.** The one warm light in the scene is the flame. It is baked into the scenery (a pool on the floor, a pool on the screen that falls to 78% at the corners), lights the shape cards directly, and casts every shadow. The moon is the one cool light, a crescent in two stepped paper halo rings.
- **The shadows are the point.** Shadows on the screen are dark ink-violet, not black. They are the only soft-edged things on the stage, and their softness says how close a card is to the lamp.
- **A kid can read it at a glance.** Seven big shapes in seven saturated paper colours on warm wood, one dotted outline on a cream screen, and creatures in bright papers against a dark sky. Warm play surface, cool sky: whatever the child makes pops against what is behind it.
- **Calm, not busy.** At idle the flame flickers and its glow with it, dust drifts in the beam, the sleeper snores in rings and the sky's companions idle in their own ways. Nothing flashes or nags.

## Palette

Warm stage, cool night. All scenery colours live in `PALETTE` in [`view/scenery.ts`](view/scenery.ts); the shapes' in [`shapes.ts`](shapes.ts); the creatures' in [`creatures.ts`](creatures.ts).

| Role | Colour | Notes |
| --- | --- | --- |
| Night backdrop | `#17153f` fading to `#2a2a6c` low down | Deep indigo, the style's ground |
| Stars, moon | `#f8e7b0`, `#f6e3a1`; halo rings `#232468`, `#2e2d74` | Drawn as light sources, never dimmed by the night bake |
| Hills (far, mid, near) | `#28336a`, `#2f4675`, `#365a7e` | Each nearer row a little lighter and greener |
| Clouds | `#4b5099` with a lit top `#5d62ab` | |
| Pines | `#1f5a57` with a moonlit fold `#2b7064`, trunks `#5b3a28` | |
| Meadow | `#26336a` | Only beside the stage |
| Stage | `#c28145`, strips `#a86a34`, edge `#7d4526` | Kraft paper under the lamp |
| Screen | `#f6e7c6` | Cream, lit from the middle |
| Proscenium | frame `#9b3b2d` / `#c25a45`, crest `#e3a843` | Brick red with a gold crest and trim |
| Curtains | `#8c2742`, `#a8385a`, `#5f1832` | Three layered drape cards a side |
| Lamp | brass `#d9a443`, dark `#8a5a22` | |
| Shapes | `#f2b43c`, `#ef8fb0`, `#e8664a`, `#5c9be0`, `#39a39a`, `#7cbf52`, `#f6dc8a` | Big triangle, small triangle, two half-discs, square, strip, crescent |
| Creatures | bird `#f5b83d`, fish `#4fb8ae`, snail `#ef93b2`, whale `#6ea4e8`, fox `#ef8340`, dragon `#72c45e` | Each has a second paper for a twin in the sky (bluebird, lilac fish, yellow snail, heather whale, cream fox, violet dragon) |
| Ink, shadow cards | `#1c1638`, `#0d0b26` | Shadows, outlines, backing cards |

## How it is built (and why it stays at 60 fps)

- **Raw three.js and one frame loop** ([`view/game.ts`](view/game.ts)). No reconciler, no post pass, no shadow maps, no per-frame allocation. The loop measures its own CPU time into `window.__jamPerf` (a 600-frame ring) and feeds the tier governor.
- **Shadows are geometry, computed exactly.** Each card's 48-point outline is projected from the lamp point onto the screen plane (`k = 64 / (64 − z)`), turned and swung with its pin, and written into one shared dynamic buffer. A card close to the lamp throws a bigger shadow; the penumbra ring around it is `0.55 × (k − 1)` wide, so the same card is also softer near the lamp and sharp near the screen. All eight shadow slots (seven shapes and the ghost copy) are one draw, clipped to the screen.
- **Coverage uses the same geometry** ([`coverage.ts`](coverage.ts)). Sample points in the outline are inverse-projected into each card's plane and tested against the shape's analytic inside test, so what the child sees filled is what the game counts as filled. The wake rule is generous: 72% filled with up to 60% spill for ages up to 7, 80% and 55% above.
- **Cut paper is built once.** `cardGeometry()` extrudes an outline 2 to 3 mm with a small bevel and paints face, back and cut edge into vertex colours. One procedural 256² paper-fibre texture (fibres, mottling), drawn on a canvas at startup, is multiplied over everything. Nothing is fetched or committed as an image.
- **Scenery is one unlit merged mesh.** The whole theatre (backdrop, moon, hills, clouds, pines, meadow, curtains, valance, frame, screen, stage strips, lamp) is one `MeshBasicMaterial` draw with the lamp's warm Lambert light and the moon's cool fill baked into vertex colours. Surfaces are subdivided where a light pool falls so the bake stays smooth. It is merged nearest first so the depth test rejects covered pixels early (pass 12 cut software-renderer fill cost by about 20%).
- **Only what moves is lit.** The seven shape cards and the creatures use `MeshLambertMaterial` with one point light at the flame and a hemisphere fill. Lambert, not standard PBR: flat paper needs nothing more.
- **Offset shadow cards, never real shadows.** Every scenery layer and every creature in colour carries a dark backing card dropped 0.55 cm behind it. Cards on the stage get one instanced soft blob each.
- **Instancing for anything that repeats.** Pins, blobs, glow rings, outline dots, sleep rings, dust motes and stars (with the tap and wake bursts as spare star instances) are one instanced draw each.
- **Budget.** 16 draw calls on the opening screen (17 at full tier, with the dust motes) and 48 to 49 with a full sky of eight companions, against a jam budget of 80. No post pass, no shadow maps, zero network requests. DPR is capped at 2 and antialiasing is off. The render loop stops whenever the game is unattended or hidden, and after 20 s of rest it draws every other display frame.
- **Adaptive quality** ([`tiers.ts`](tiers.ts)). Four tiers: full (DPR 2, 36 dust motes, twinkling stars, penumbra), balanced (DPR 1.5, 18 motes), lean (DPR 1.25, no motes, still stars), minimal (DPR 1, hard-edged shadows). The lamp's glow is never shed. A smoothed frame interval over 21 ms for 1.5 s steps down; under 17.8 ms with CPU work under 8 ms for 6 s steps up, and an upgrade that does not last doubles that wait (up to 48 s), so tiers never flicker. Touch devices start at balanced. `?tier=N` pins a tier.
- **Grown-up overlay.** `?fps=1` shows the last 110 frames as coloured bars (green, amber, red) with each frame's CPU time as a white tick, a 16.7 ms guide line, and the tier as four squares. No numerals.
- **The idle hint search is time-sliced.** The solver that picks the ghost hand's next move runs in slices of 0.6 ms and checks its budget after every candidate, so it never costs a frame.

## Motion rules

- **Cards have weight.** A picked-up card lifts off the stage, follows the finger on a stiff spring and swings on its wire against the direction of travel; set down, it bounces and settles with a wobble. A tap turns it an eighth of a turn around its pin, overshooting a touch like stiff card. Its shadow moves with it on the same frame. The springs run in fixed small substeps, so a slow frame never makes them diverge.
- **Six motion personalities** ([`motion.ts`](motion.ts)). Each creature has its own hand-written routine for every moment of its life: asleep on the screen, the stir as its outline fills, the anticipation before it peels off, its way of travelling to the sky, its idle there, and its reaction to a tap. The bird is quick and nervous (flap-flap-glide surges, a loop-the-loop). The fish is fluid (an S-curve that straightens, a figure-eight idle, a dart). The snail floats up under its shell like a balloon, inches along and hides in its shell when tapped. The whale is huge and slow (a long arc, a spout at the top of each breath, a breach and fluke slap). The fox bounds in three leaps, sits with a lazy tail swish and springs round in the air. The dragon is a kite on the wind (a strong downstroke and slow recovery, smoke rings, a barrel roll). No curve is shared between creatures.
- **Waking is one continuous event.** The outline's dots fill in with the shadow, each with a soft kalimba note. At the wake line the shadow opens its eye, fourteen gold paper stars spring out of it, the dark face stirs in silhouette, and the card turns past edge-on like a page, revealing its colour. It then shrinks to sky size by 60% of its trip, staying in front of the proscenium until it is clear of it, and settles in its home. A new sleeping outline drifts in, and can wake while the last creature is still on its way home.
- **The sky is company, never a count.** Eight homes around the moon; when a ninth friend arrives the oldest drifts off toward the moon. Two of a kind are cut from different papers.
- **Sound is paper too** ([`audio.ts`](audio.ts)). Paper rustles on drag, a pin tick on turn, a pentatonic kalimba note per dot, the sleeper's hum, the peel, each creature's own voice, a soft hiss when a tap makes the flame flare, a sparkle for a tap on nothing in particular, and a few quiet crickets. All synthesized with Web Audio, created inside the first tap, suspended when unattended or hidden.

## Guidance (style-independent)

[`guidance.ts`](guidance.ts) decides what to show; the view only draws it. On a first open, before any touch, the half-disc whose shadow rests on the screen hops, so its shadow hops too (from 1.2 s, every 6 s, at most three times). After 3 s idle the shapes and the outline breathe with a cream paper ring. After 5 s a pointing paper hand reaches up from the child's side, lifts a see-through copy of one shape, turns it if that helps, and carries it so the copy's pale shadow lands inside the outline. Demonstrations back off (10, 20, 40 s) and stop after four per idle stretch. The real arrangement never moves on its own. Any touch clears everything at once. No text, no voice, no verdicts.

## Wordless clarity for ages 6 to 10

The manifest declares `ageBand: [6, 10]`, and every cue is designed for a six-year-old. The cards look touchable (bright paper on pins and stands, each with a soft contact spot). The one want is visible without words: a dotted outline of a sleeping creature on the screen, with sleep rings rising from it. One half-disc stands forward of the racks with its shadow already resting on the screen beside the empty outline, so a still frame shows that a shape makes a shadow; on a first open it hops, and its shadow hops with it. The world answers physically: dots turn dark with a note as they fill, the sleeper stirs when it is nearly there, and it wakes when it is full. The ghost hand offers one next act at a time. There are no words, numerals, scores or timers anywhere on the kid side.

## Shadow Lantern against the jam quality bar

Measured on the final build (`vite preview`) with the shared probe at 1180×820, DPR 2, touch, reading `window.__jamPerf`, after the thirty passes in [`REFINEMENT.md`](REFINEMENT.md). The machine is a headless VM that renders with SwiftShader, a software renderer that is bound by pixel fill, so its frame rate says little about an iPad; the CPU time per frame is the number that carries over. Tier 0 is the top tier (full, DPR 2) and tier 3 the minimal one (DPR 1). Unpinned, the governor settles at tier 3 on this machine.

| Scene (headless Chromium) | Tier | cpuP95 at 4× | cpuP95 at 6× | Draws |
| --- | --- | --- | --- | --- |
| Opening screen | automatic | 2.4 to 2.8 ms | 3.1 to 3.5 ms | 16 |
| Opening screen | `?tier=0` (top) | 3.5 ms | 4.8 to 6.4 ms | 17 |
| Opening screen | `?tier=3` (minimal) | 2.7 ms | 2.9 ms | 16 |
| Full sky, eight companions | automatic | 3.5 to 4.1 ms | 4.2 to 6.1 ms | 48 |
| Full sky, eight companions | `?tier=0` (top) | 3.3 ms | 5.8 ms | 49 |
| Full sky, eight companions | `?tier=3` (minimal) | | 3.7 ms | 48 |

At 20× the opening screen's cpuP95 is 10 ms. Headless WebKit has no CPU throttle, so only its frame rate is compared, against Pebble Table in the same session: Shadow Lantern runs at 30.1 to 30.9 fps unpinned, 31.0 to 31.8 fps at `?tier=3`, 16.7 to 17.0 fps at `?tier=0` and 27.5 fps under a full sky; Pebble Table runs at 15.4 to 15.9 fps. Zero network requests beyond the game's own files.

Not yet measured on a physical iPad.
