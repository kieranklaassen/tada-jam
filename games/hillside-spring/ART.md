# Hillside Spring art: painterly, Ghibli-like

Hillside Spring's own visual style: a hand-painted terraced garden on a warm afternoon, in the manner of a Studio Ghibli background painting with cel-animated characters on top. This style is claimed by Hillside Spring. Other jam games pick a different one; the jam-wide quality bar and the claimed-styles registry live in [`docs/art-direction.md`](../../docs/art-direction.md). The techniques below (a painted atlas, unlit statics, one grade quad, blob shadows) are reusable; the look is not.

## The look

- **A painting you can play in.** Every surface of the hillside is brushwork: grass laid in strokes lit warm from the upper left, field-stone walls with sunny tops and cool undersides, trees as round painted masses with gold edges toward the sun. The light is in the paint, so the painted hillside renders unlit and looks exactly as painted.
- **Afternoon light is the signature.** Slow additive shafts fall from behind the crest across the upper-left terraces, a golden wash glazes the sun's corner, and a soft vignette and watercolour-paper grain sit over everything. Clouds are lit gold on top and blue-grey underneath and drift very slowly.
- **Things you can touch are crisper than the painting.** The bamboo pieces, the sluice, the wheel, the crops and the three visitors are cel-lit (two soft bands and a dark rim), the way a hand-drawn character sits on a painted background. That split is also the clarity rule: gold bamboo against sage grass, a leaf-green frog against yellow-green grass, a rack of gold pieces on indigo cloth.
- **The biggest value change on the hill is the one that matters.** A thirsty bed is pale, sun-baked clay crazed with dark cracks and olive-brown drooping sprouts; a watered bed turns dark wet loam and the plants stand up and bloom. Running water is the most saturated blue in the frame, so the path the child built is always the bluest thing on the hill.
- **Calm, not busy.** Grass and crops sway, water scrolls, visitors breathe and blink, shafts breathe, clouds drift. Nothing flashes, beckons or nags; guidance is a warm rim glow and a ghost hand that appear only when the child stops.

## Palette

Warm painting, cool water, gold and indigo for play.

| Role | Colour | Notes |
| --- | --- | --- |
| Sky | `hsl(204 42% 64%)` at the top of the screen to a warm `hsl(46 46% 86%)` band; backdrop `#bcd7e0` | Clouds `hsl(40 50% 95%)` lit, `hsl(215 28% 72%)` undersides |
| Far hills | `hsl(214 26% 80%)`, `hsl(196 22% 70%)`, `hsl(160 18% 60%)` | Three layers, paler and bluer with distance, cooler than the crest |
| Terrace grass | `hsl(70 34% 54%)` sunny, `hsl(82 28% 46%)` shaded, warm strokes `hsl(56 44% 66%)` | Sage and straw, never saturated |
| Walls | warm ochre-grey stones at 49–57% lightness, joints `hsl(36 14% 40%)` | A narrow value range so the repeating walls stay background |
| Dry bed / wet bed | `hsl(34 36% 60%)` with cracks `hsl(22 34% 28%)` / `hsl(22 34% 22%)` | The largest value jump on the hill |
| Bamboo | a warm gold gradient `hsl(36 58% 46%)` to `hsl(46 80% 78%)` | No green, so it never matches the grass (2.15:1 against its surround) |
| Rack mat | indigo `hsl(222 30% 20%)`, weave `hsl(220 30% 33%)`, sashiko stitch `hsl(40 30% 86%)` | The complement of the gold pieces |
| Running water | deep `#2878a8`, light `#8ad2e2`, foam `#f4fbf6` | The most saturated blue in the frame |
| Still water (pool, creek, pond) | `#467f7c`, `#a9cbb8` | A mossy teal, quieter than the built stream |
| Frog | `#4f9a4a` body, `#428a40` legs, cream throat `#f4eec0` | Leaf green, a cooler hue than the grass |
| Sparrow | `#8a5a36` body, `#7a4a2a` head, cream cheeks | Small, so it is drawn about twice its modelled size |
| Tanuki | `#8a7258` body, `#3a2e26` mask, legs and tail rings | Big, soft and dark-masked |
| Blooms | sunflower `#f6cf48`, rice `#ecd27a`, pumpkin `#f09a3a`, cosmos `#f29ac0` | |
| Glow | warm rim `rgb(255 224 148)`; drop target `rgb(255 247 219)` | A rim of light around things, never a plate over them |

The painted colours live in [`view/paint.ts`](view/paint.ts); the cel-lit colours in [`view/creatures.ts`](view/creatures.ts), [`view/fx.ts`](view/fx.ts) and [`view/water.ts`](view/water.ts).

## How it is built (and why it stays cheap)

- **One painted atlas, 2048², painted at startup** ([`view/paint.ts`](view/paint.ts)). Grass, walls, soil, rock, wood, bamboo, thatch, the indigo mat, canopies, bushes, reeds, lilies, wildflowers, the ring, blob and shaft sprites and the far hills are brushed onto one canvas with strokes and dabs from a seeded random, so it is identical on every open. The sky (1024×512), the water's flow texture, the watercolour paper and the ghost hand are four small canvases beside it. Nothing is fetched or committed as an image.
- **Two ways of lighting, on purpose** ([`view/materials.ts`](view/materials.ts)). Painted scenery is `MeshBasicMaterial` with vertex tint baked in (warmer toward the sun, darker at the foot of walls). Things that move or can be touched use one small half-Lambert shader banded into two soft cel tones (warm sun, cool shade) plus a dark rim.
- **Merged scenery.** Terraces, walls, the slope to the crest, the trees, hedges, the creek bank and the rack mat are built once per page into a handful of meshes. Grass and crops sway from the root in the vertex shader (off at the lowest tier).
- **The painted sky** is a screen-pinned quad drawn behind everything, scaled to the aspect ratio, with the clouds drifting across a wrapping painting.
- **Light shafts** are one additive mesh of six soft quads from behind the crest that breathe slowly. Lower tiers draw the three that read most (via the geometry's draw range), never none: the light is the look.
- **One grade quad, no post pass** ([`view/grade.ts`](view/grade.ts)). The last thing drawn under the ghost hand is a full-screen quad blended as 2·src·dst: mid-grey leaves a pixel alone, warmer warms it, darker deepens it. It lays the golden wash from the sun's corner, the vignette and the paper grain without a render target.
- **Water is one ribbon mesh with GPU fronts** ([`view/water.ts`](view/water.ts)). When the build changes, every stretch of running water becomes a strip whose vertices carry when the water's head arrives and leaves; the shader hides the strip outside that window and scrolls the painted flow texture at the water's own speed. New streams run downhill and cut ones drain with nothing animated on the CPU. Loose water darkens a band of wet ground under itself that dries 4 s after it stops, in the same mesh. Still water is one static mesh.
- **Instanced bamboo kit** ([`view/pieces.ts`](view/pieces.ts)). One instanced mesh per part (trough arms, lashed hub, sluice frame and board, the wheel, mill hut, millstone and windchime) draws the pieces on the hillside, on the rack and in the hand: eight draw calls however much is built.
- **Crops grow in the vertex shader** ([`view/plots.ts`](view/plots.ts)). All four plots' plants are one merged cel-lit mesh; a few floats per plot grow each plant from a wilted sprout to full bloom, droop it while thirsty, lean it toward the nearest running water and bounce it when tapped or picked.
- **Blob and streak shadows, no shadow maps** ([`view/fx.ts`](view/fx.ts)). One instanced mesh of soft painted blobs: a round blob under the hub, the wheel and each visitor, and a streak along each bamboo arm that turns with the piece. The same file draws the glow rings, pooled particles and the ghost hand: four draw calls with fixed buffers.
- **Camera.** A 27° lens pitched 37° looking up the hill from the creek: deep enough terrace floors to read pieces on, with a band of sky and the crest trees framing the top.
- **Adaptive quality** ([`quality.ts`](quality.ts)). The garden measures its own frame intervals and CPU time and steps through four tiers, numbered like Pebble Table's: 0 full (DPR 2, six shafts, all particles), 1 balanced (DPR 1.5, 80% of particles), 2 lean (DPR 1.25, three shafts, 55% of particles) and 3 minimal (DPR 1, three shafts, 30% of particles, no sway). Same rules as Pebble Table's governor: two bad 40-frame windows step down, one terrible one steps down at once, stepping back up needs six clean windows under 8 ms of CPU, and a failed upgrade doubles the wait. Touch devices start one tier down. `?tier=N` pins a tier (`?tier=0` is full quality); `?fps=1` shows frame bars. After 20 s with nothing new the loop draws every other frame, and it stops when the garden is unattended or hidden.
- **Grown-up overlay.** Triple-tap the top-left sky for fps, frame and CPU time, dropped frames, tier, DPR, draw calls, triangles and tier pins. `window.__jamPerf` exposes the same numbers with a 600-frame CPU buffer.
- **Budget.** 20 draw calls in a fresh garden and 38 in a full one (target under 80), no post pass, no shadow maps, zero network requests. Per-frame allocation was cut from 13.4 to 6.5 KB a frame, about half of it inside three.js; the heap stays flat and minor collections take under a millisecond.

## Motion rules

- **Every piece has a weight** (straight 0.75, bend 0.8, split 1, sluice 1.15, wheel 1.6). Heavier pieces rise from the rack more slowly and bob less in the hand. A dropped piece falls the last bit from its hover height, slightly stretched, then squashes: light bamboo springs, the wheel thuds and settles at once. The landing dust, the tok's pitch and a low thump of body all follow the weight.
- **A tap turns a piece with a springy quarter turn**, and its arm shadows turn with it. A shut sluice board drops under gravity, slams and bounces once, and the slam sounds at the exact landing moment; an opened board is lifted by hand.
- **Water has a speed.** It runs from the change point downhill at a fixed pace, pours off open pipe ends, trickles down walls and across grass, and drains out of a cut path. A plot reacts when the water's front reaches it, not when the child's finger lifts.
- **Plants want water.** Thirsty sprouts droop. When the child stops, they ask in two beats: they stand with a puff of clay dust and open their leaves toward the child like empty hands, let go, and then lean toward the nearest running water. When a new pipe brings water closer they reach eagerly, timed to the water's arrival. Watered plots grow over 6 s and open their flowers last.
- **Each visitor moves like itself** ([`motion.ts`](motion.ts)). The frog sits still and then explodes: a crouch before every hop, a ballooning throat, flung-out legs, a tongue that snaps at flies. The sparrow is quick and nervous: head snaps, tail flicks, wingbeats, a scold. The tanuki is slow, heavy and asleep: curled breathing, a waddle, yawns, a roll-over, a grudging peek. Each has its own idle life, gait, three answers to a poke, a cheer when a plot blooms nearby, an arrival and rare delights, picked without repeats with varied size, speed and side. A test fails if two species share an action or two variants are near-copies.
- **The wheel works.** Water through it turns the wheel, the millstone grinds and puffs flour, and the windchime on the eave rings.
- **Sound is part of the painting** ([`audio.ts`](audio.ts)). A brook that babbles louder as more water falls, hollow bamboo toks, the board's wooden clunk, the mill's creak and a windchime, soft pentatonic bell chords on a bloom, and a voice for each visitor, all synthesized with Web Audio through a small procedural reverb. Touch sounds sit in one loudness band and rewards in a louder one above it, so nothing the child does is drowned by the water they built.

## Guidance

[`guidance.ts`](guidance.ts) decides what to show; the view only draws it. After 3 s of idle, the pieces that can be touched get a warm rim glow and the rack breathes. After 5 s a big painted ghost hand shows one next move chosen from the garden as it is: it presses a piece that would send water somewhere thirsty (the piece nudges the way a real tap would turn it, then springs back), or carries a piece from the rack to where the water runs (it lands unturned, so the hand never shows the whole answer). A hint never undoes a plot that is still drinking; a harvest is offered only once every bed has bloomed, on a bed no visitor sits on; and a bloom restarts the wait. Demonstrations back off (gaps of 10, 20 and 40 s) and stop after four per idle stretch; any touch clears everything at once. From 1.5 s after the garden opens, and every 7 s whenever the child stops, the thirsty sprouts ask for water, facing the child, and then lean toward the stream. No text, no voice, no verdicts.

## Hillside Spring against the jam quality bar

Measured on the production build at 1180×820, DPR 2, with touch emulation, in headless Chromium and WebKit on a Linux VM with software GL (see [`REFINEMENT.md`](REFINEMENT.md) for the method and every pass). CPU time per frame (the game's update plus draw submission) at the 95th percentile, 6× CPU throttle: 4.7 ms in a fresh garden and 5.5 ms in a full one on the automatic tier; pinned to the top tier, 5.7 ms fresh and a median of 7.2 ms full (5.2 to 8.8 across four runs on a noisy host). In WebKit the garden runs level with Pebble Table measured in the same session. 20 to 38 draw calls, no post pass, no shadow maps, zero network requests. Frame rates on this VM are bound by the software GPU and are not iPad frame rates; the garden has not been measured on a physical iPad.
