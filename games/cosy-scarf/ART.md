# Cosy Scarf art: knitted and crocheted yarn 3D

Cosy Scarf's own visual style: a grandma-made world of knitted snow and crocheted animals, with a chunky scarf growing on a wooden loom in the middle. This style is claimed by Cosy Scarf; the jam-wide quality bar and the claimed-styles registry live in [`docs/art-direction.md`](../../docs/art-direction.md). The techniques below (runtime stitch maps, one-draw-call scarves wrapped in the vertex shader, a self-tone-mapping finish pass) are reusable; the yarn look is not.

## The look

- **Everything is yarn, but only the play is loud.** The known weakness of the knitted style is stitch noise behind the thing the child is looking at. So the stitch is strong only where the play is: the scarf, the yarn balls, and the animals. The snowy hillside and the ribbed sky carry a fine, faint knit that recedes, and the finish pass softens and desaturates them further. Behind the scarf hangs a plain dark felt cloth, the calmest surface in the scene, so every scarf colour reads against it at a glance. The felt unrolls with the scarf and stops two rows below the needles, so an empty loom is an open frame onto plain snow (no pine stands in its window), and the dark contrast is only where there is yarn to show.
- **Amigurumi, not plush.** Characters are stuffed crochet forms: egg bodies, ball heads, bead eyes with a white shine, stitched mouths, pink blush that deepens as they warm. Crochet rounds run around each form like real amigurumi. No fur anywhere.
- **Chunky scarf, clear stripes.** Five fat stitches wide, up to eighteen rows long, each stitch a little pillow that plumps in as it is knitted. Six yarn colours chosen to be told apart by a five-year-old and by most colour-blind eyes: tomato red, sunflower, cornflower, cream, leaf green, berry pink.
- **Calm, not busy.** Snow drifts slowly; animals breathe, blink, and shiver. Nothing flashes, beckons, or nags. Guidance is a warm glow ring and a ghost hand that appear only when the child is idle.

## Palette

Cool, pale world; warm, saturated play. The snow and the sky are the palest things on screen; the play blanket is a deep teal; the loom is honey wood; the yarn is the only strong colour.

| Role | Colour | Notes |
| --- | --- | --- |
| Sky (ribbed knit wall) | `#98b6d3` fading up to `#6f93b8`, pale horizon `#dfe4ea` | Fine rib, faint relief |
| Snow hills | `#eef2f6`, shade `#bac8d6`, far `#a9bbce` | Fog `#c3d1df` pulls the far hills back |
| Snow puffs | `#86a2c4` | Cool powder blue: white would vanish into the snow |
| Pines | `#3f6a5a`, far `#7c998f` | Knitted cones with a snow-white rim |
| Play blanket | `#2f6770`, rib hem `#4a8a8f` | Deep teal, draped over the foot of the slope; the lighter hem steps it into the snow |
| Loom | `#c9955a`, dark `#a8763f`; needles `#d9b27a` | Honey wood |
| Felt cloth | `#554a63`, low `#3f374c` | Plain felt with a quiet running stitch at its edge: the scarf's backdrop |
| Yarn | `#d8402e` `#f3b52c` `#3f78cf` `#f4ecdc` `#4f9e45` `#e05b9c` | One ball per colour; younger children get four |
| Animals | bunny `#c8ad90`, penguin `#2d3a57` with cream belly, fox `#dc7431`, bear `#8a5836` | Bead eyes `#1b1614`, blush `#f08f98` |
| Butterfly | `#f0a3c4` | Opens the mirror for colourwork |
| Glow | `#ffd978` | Readable on teal, felt, and snow |

All colours live in `PALETTE` and `YARN` in [`view/yarn.ts`](view/yarn.ts).

## How it is built (and why it stays fast)

- **Stitches are maps drawn at startup.** [`view/yarn.ts`](view/yarn.ts) paints a knit tile (stockinette Vs), a crochet tile (rounds of little knots), and a rib tile on canvases, turns each into a normal map and a matching stitch-shade (ambient occlusion) map, and never fetches an image. One `MeshStandardMaterial` patch multiplies in the stitch shade, adds a soft yarn rim, glossy bead eyes, and the per-animal blush.
- **UVs are scaled to the stitch.** [`view/shapes.ts`](view/shapes.ts) builds every primitive so one tile covers the same world size on every part, which is what makes a bunny's ear and a bear's belly read as the same crochet.
- **Merged parts, baked occlusion.** Props and animal parts are merged per rigid part (`part()`), with contact and underside occlusion baked into vertex colours. No shadow maps; blob shadows are one instanced mesh.
- **A scarf is one draw call** ([`view/scarf.ts`](view/scarf.ts)). The geometry is built once for the longest scarf: each stitch cell is its own pillow of quads carrying its column, row, and knit order. Colours live in a 5×18 data texture. The vertex shader does everything else: the stitch-by-stitch reveal, hanging from the rod, the flight over the animal's head, wrapping round the neck with two tails, and the tassels. Nothing is rebuilt on the CPU.
- **Props are instanced** ([`view/props.ts`](view/props.ts)): yarn balls, glow rings, woolly puffs, snowfall, and shadows each draw once, with every per-frame write into preallocated matrices and attributes. The yarn balls wind their strands in the shader (five bands round great circles, grooves between strands) rather than from a texture, so they read as yarn at every DPR.
- **One post pass** ([`view/finish.ts`](view/finish.ts)): a tilt-shift blur outside the play band, ACES tone mapping, a recede that desaturates and cools the far world, a small saturation lift inside the play band, and a soft vignette. Tiers without post use the renderer's ACES tone mapping instead.
- **No canvas multisampling, and the backdrop draws last.** The post tiers render into a plain buffer anyway, and a multisampled canvas makes a software rasterizer pay on every pixel. The blanket, snow and sky draw after everything standing on them, nearest first, so the depth test skips every pixel the props and animals already cover.
- **Nothing is compiled, drawn or uploaded for the first time mid-play.** Every tier's shaders compile at mount, and the prewarm then draws the whole scene once, every hidden thing shown, into one scissored pixel. The audio noise and room impulse are made at the device's own sample rate before the first tap.
- **Budget.** About 22–25 draw calls on an opening scene and 51–53 on a full hillside with every scarf out (target under 80), about 40k triangles idle and 59k on the full hillside, one full-screen pass, zero network requests. The loop stops whenever the game is unattended or hidden.
- **Adaptive quality** ([`tiers.ts`](tiers.ts)): full (DPR 2, 8-tap blur), balanced (DPR 1.5, 4-tap blur), lean (DPR 1.25, no post), minimal (DPR 1, no post, the hill's knit baked into a plain albedo tile instead of relief, so the biggest surface stays knitted). Touch devices start at balanced and earn full after 8 s of on-time frames with CPU work under 8 ms (the interval alone cannot show headroom on a 60 Hz screen); a tier that fails within 5 s of being climbed into is not tried again. `?tier=N` pins a tier; `?fps=1` shows a wordless grown-up bar graph.

## Motion rules

- **Each animal has its own motion class** ([`view/animals.ts`](view/animals.ts)): its own idle, its own way of being cold, of hoping for the scarf, of answering a tap, of walking, and its own happy dance. The bunny is quick and twitchy (two-footed hops, nose-twitch bursts, an ear flicking back; it dances with binkies, the middle one twisting in the air). The penguin is slow and rocking (a waddle that stops and starts, bursts of flipper flaps; it spins twice with flippers out and ends with a ta-da). The fox is smooth and sly (a level trot with its tail streaming, curious held head tilts; it chases its own tail, then pounces on an imaginary mouse). The bear is big and heavy (a thumping lumber, sleepy nods; it sways with arms up, stomps twice, jiggles its belly, and hugs itself). No routine is shared.
- **Knitting has weight.** Each stitch plumps from flat to full with a small overshoot; the loom rocks a little as a row closes; the basket wobbles when a ball leaves it; a dragged scarf swings from the finger and settles on a spring. A carried ball rides a spring under the finger: it trails a touch, swings past where the finger stops, and stretches along its path by its speed. Squash and stretch act in the world's axes after the spin, so a landing flattens a ball straight down.
- **The tune points at the rows.** When the loom hums a pattern back, each hummed row lights and plumps on its own note, and the copies of a repeat light together, so the child sees which rows match.
- **Sound is yarn too** ([`audio.ts`](audio.ts)): wooden needle clicks, woolly thumps, a zip for unravelling, a pentatonic note per yarn colour so any stripe order sounds kind, each animal's own voice, and a dance tune played on the scarf's own stripes. A ball or the scarf lifted by a finger plucks its note, a ball back in the basket lands with a muffled thump, and the needles let go of a given scarf with two clicks and a woolly whoosh. The snow crunches under a touch and the sky answers with a flurry. Every touch, tap or stroke, has a voice. A small procedural room reverb warms everything; nothing is recorded or fetched.

## Guidance (style-independent)

[`guidance.ts`](guidance.ts) decides what to demonstrate; the view only draws it. When the child stops, whatever can be touched breathes with a glow ring; then a ghost hand shows one next act chosen from the loom's state: tap the yarn ball that would carry the stripe pattern on, or carry the finished scarf to the cold animal. Demonstrations back off with doubling gaps and stop after four per idle stretch. Any touch clears everything at once, and the idle clock is held while a finger is down or a gift is playing, so a long paint stroke or a dance is never mistaken for idleness. The suggested ball also swells and lights a warm rim on its own silhouette, so the cue stays on the thing itself where no neighbour can hide it. The world answers the likeliest wrong guesses instead of ignoring them: a tap on the empty loom makes the wanted ball hop, and a ball carried to the cold animal flies into the loom and is knitted for it. No text, no voice instructions, no verdicts, and nothing counts the wrapped animals.
