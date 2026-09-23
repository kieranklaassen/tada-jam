# Cosy Scarf art: knitted and crocheted yarn 3D

Cosy Scarf's own visual style: a grandma-made world of knitted snow and crocheted animals, with a chunky scarf growing on a wooden loom in the middle. This style is claimed by Cosy Scarf; the jam-wide quality bar and the claimed-styles registry live in [`docs/art-direction.md`](../../docs/art-direction.md). The techniques below (runtime stitch maps, one-draw-call scarves wrapped in the vertex shader, a self-tone-mapping finish pass) are reusable; the yarn look is not.

## The look

- **Everything is yarn, but only the play is loud.** The known weakness of the knitted style is stitch noise behind the thing the child is looking at. So the stitch is strong only where the play is: the scarf, the yarn balls, and the animals. The snowy hillside and the ribbed sky carry a fine, faint knit that recedes, and the finish pass softens and desaturates them further. The loom's backboard is plain dark felt, the calmest surface in the scene, so every scarf colour reads against it at a glance.
- **Amigurumi, not plush.** Characters are stuffed crochet forms: egg bodies, ball heads, bead eyes with a white shine, stitched mouths, pink blush that deepens as they warm. Crochet rounds run around each form like real amigurumi. No fur anywhere.
- **Chunky scarf, clear stripes.** Five fat stitches wide, up to eighteen rows long, each stitch a little pillow that plumps in as it is knitted. Six yarn colours chosen to be told apart by a five-year-old and by most colour-blind eyes: tomato red, sunflower, cornflower, cream, leaf green, berry pink.
- **Calm, not busy.** Snow drifts slowly; animals breathe, blink, and shiver. Nothing flashes, beckons, or nags. Guidance is a warm glow ring and a ghost hand that appear only when the child is idle.

## Palette

Cool, pale world; warm, saturated play. The snow and the sky are the palest things on screen; the play blanket is a deep teal; the loom is honey wood; the yarn is the only strong colour.

| Role | Colour | Notes |
| --- | --- | --- |
| Sky (ribbed knit wall) | `#98b6d3` fading up to `#6f93b8`, pale horizon `#dfe4ea` | Fine rib, faint relief |
| Snow hills | `#eef2f6`, shade `#bac8d6`, far `#a9bbce` | Fog `#c3d1df` pulls the far hills back |
| Pines | `#3f6a5a`, far `#7c998f` | Knitted cones with a snow-white rim |
| Play blanket | `#2f6770`, rib `#285a62` | Deep teal, a quiet stage |
| Loom | `#c9955a`, dark `#a8763f`; needles `#d9b27a` | Honey wood |
| Backboard | `#433d4f` | Plain felt, no stitch: the scarf's backdrop |
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
- **Props are instanced** ([`view/props.ts`](view/props.ts)): yarn balls, glow rings, woolly puffs, snowfall, and shadows each draw once, with every per-frame write into preallocated matrices and attributes.
- **One post pass** ([`view/finish.ts`](view/finish.ts)): a tilt-shift blur outside the play band, ACES tone mapping, a recede that desaturates and cools the far world, a small saturation lift inside the play band, and a soft vignette. Tiers without post use the renderer's ACES tone mapping instead.
- **Shaders compile at mount** for both the post and no-post paths, and the audio noise and room impulse are made before the first tap, so nothing compiles or allocates mid-play.
- **Budget.** About 20–30 draw calls in a full scene (target under 80), about 30k triangles, one full-screen pass, zero network requests. The loop stops whenever the game is unattended or hidden.
- **Adaptive quality** ([`tiers.ts`](tiers.ts)): full (DPR 2, 8-tap blur), balanced (DPR 1.5, 4-tap blur), lean (DPR 1.25, no post), minimal (DPR 1, no post, flat hills). Touch devices start at balanced. `?tier=N` pins a tier; `?fps=1` shows a wordless grown-up bar graph.

## Motion rules

- **Each animal has its own motion class** ([`view/animals.ts`](view/animals.ts)): its own idle, its own way of being cold, of hoping for the scarf, of answering a tap, of walking, and its own happy dance. The bunny is quick and twitchy (two-footed hops, nose-twitch bursts, an ear flicking back; it dances with binkies, the middle one twisting in the air). The penguin is slow and rocking (a waddle that stops and starts, bursts of flipper flaps; it spins twice with flippers out and ends with a ta-da). The fox is smooth and sly (a level trot with its tail streaming, curious held head tilts; it chases its own tail, then pounces on an imaginary mouse). The bear is big and heavy (a thumping lumber, sleepy nods; it sways with arms up, stomps twice, jiggles its belly, and hugs itself). No routine is shared.
- **Knitting has weight.** Each stitch plumps from flat to full with a small overshoot; the loom rocks a little as a row closes; the basket wobbles when a ball leaves it; a dragged scarf swings from the finger and settles on a spring.
- **Sound is yarn too** ([`audio.ts`](audio.ts)): wooden needle clicks, woolly thumps, a zip for unravelling, a pentatonic note per yarn colour so any stripe order sounds kind, each animal's own voice, and a dance tune played on the scarf's own stripes. A small procedural room reverb warms everything; nothing is recorded or fetched.

## Guidance (style-independent)

[`guidance.ts`](guidance.ts) decides what to demonstrate; the view only draws it. When the child stops, whatever can be touched breathes with a glow ring; then a ghost hand shows one next act chosen from the loom's state: tap the yarn ball that would carry the stripe pattern on, or carry the finished scarf to the cold animal. Demonstrations back off with doubling gaps and stop after four per idle stretch. Any touch clears everything at once. No text, no voice instructions, no verdicts, and nothing counts the wrapped animals.
