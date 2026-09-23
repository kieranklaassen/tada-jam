# Pebble Table art: claymation 3D

Pebble Table's own visual style: a plasticine tabletop set, shot like a stop-motion film, running at 60 fps on an iPad. This style is claimed by Pebble Table. Other jam games pick a different one; the jam-wide quality bar and the claimed-styles registry live in [`docs/art-direction.md`](../../docs/art-direction.md). The techniques below (merged meshes, blob shadows, one post pass) are reusable; the clay look is not.

## The look

- **Everything is clay.** Soft matte surfaces with thumbprints and tool drags, shapes that are round and slightly lumpy, never CAD-perfect. If a prop would be wood or metal in real life, it is clay painted that colour.
- **A kid can read it at a glance.** Big, distinct silhouettes; few objects; uncluttered backdrop; strong figure-ground contrast. Countable things (stones) are one clear colour on a surface of a contrasting temperature: terracotta stones on a cool sage-teal table.
- **Motion carries the charm.** Real physics weight, squash on landing, stretch on pickup, springs that overshoot and settle, characters that anticipate and follow through. A still frame should look good; a moving one should feel alive.
- **Calm, not busy.** Idle life breathes and blinks; nothing flashes, beckons, or nags. Guidance is a golden glow ring and a ghost hand that appear only when the child is idle.
- **History.** The first 2D canvas slice was judged "ugly" by the owner. Ten 3D style concepts were compared on kid clarity, artistry, and iPad cost; the owner picked claymation. The concept render showed rust stones on a rust table, so the table was cooled to sage-teal.

## Palette

Warm set, cool stage. The backdrop and props are warm; the play surface is cool so the warm pieces pop.

| Role | Colour | Notes |
| --- | --- | --- |
| Backdrop / floor | `#ecd2aa` / `#e2c49a` | Warm cream, fog to the same colour |
| Table slab | `#6e9a9b` | Cool sage-teal; never rust or orange under rust pieces |
| Stones | `#c9683d` | Terracotta clay, identical by design |
| Bag | `#dcaa3c` with cream cord `#efe1c3` | Mustard |
| Scale | wood-clay `#9a5a38`, pans ochre `#d8a54c` | |
| Rug, bowl | `#e8d7b6`, `#f0dec2` | Cream |
| Plates | `#3f9a8e` | Teal |
| Characters | rabbit `#e6d3b2`, bear cub `#a0613d`, hedgehog `#efd8b0` with quills `#6b4a33` fading to `#c9a27a` | Big black bead eyes with a double white shine, pink cheeks |
| Glow | `#ffd76a` | A golden ring, readable on the cream rug and the sage table |

All colours live in `PALETTE` in [`view/clay.ts`](view/clay.ts).

## How it is built (and why it stays at 60 fps)

- **One shared clay material** (`MeshStandardMaterial`, vertex colours, roughness about 0.6, double-sided) with a procedural thumbprint normal map drawn on a canvas at startup. Nothing is fetched or committed as an image.
- **Merged meshes.** Each rigid prop (bag, scale post, beam, bowl, knife, shelf rack) and each character part is built from primitives with `piece()` (lump, place, paint) and merged into one geometry: one draw call each. Characters are six parts (body, head, eyes, mouth, two arms) so they can animate.
- **Clay fur is a shader, not geometry** ([`view/fur.ts`](view/fur.ts)). Rabbit and bear body and head get up to six instanced shells: the part pushed out along its normals and alpha-tested against a procedural tuft texture (fat strokes like clay dragged with a loop tool), darker at the root and lighter at the tip, with a soft rim. The vertex shader sways the tips with breath and a little wind. Front-facing surfaces (face, belly) stay bare so the face reads cleanly. Shell count comes from on-screen size (3 to 6). The hedgehog's quills are one instanced tapered clay spike per body part, tinted per instance, each swaying out of phase.
- **Lumps are geometry, not shaders.** `lump()` pushes vertices along their normals with 3D noise once, at build time.
- **Contact occlusion is baked** into vertex colours (`paint()` darkens vertices near the surface they sit on). No AO pass.
- **Blob shadows, no shadow maps.** One instanced mesh of soft radial blobs; height above the ground widens and fades each blob. The same trick, in warm light, draws guidance glows.
- **Instanced stones.** One draw each for whole stones, halves, and quarters, with per-instance squash matrices and brightness. Halves and quarters are the whole pebble with flat cut faces, so a half visibly is half a stone. Pebbles are domed (thicker on top) with underside shading baked into vertex colours so they read as round from the camera.
- **Camera.** 46° pitch with a 27° lens: low enough that pebbles show thickness and guests show faces, high enough to see every plate.
- **One post pass.** ACES tone mapping, then a single merged effect in display space: gentle tilt-shift depth of field (the near and far table edges soften), an S-curve and saturation grade, a touch of warmth, a soft vignette. Grading after tone mapping matters: saturating linear HDR values pushed channels negative and turned highlights pink. DPR is capped at 2; MSAA is off at DPR 2.
- **Lights.** A warm key from the front left, a cool fill from the right, and a warm rim from behind that lifts the guests off the table.
- **Budget.** About 55 draw calls in a full Fair Feeding scene (target under 80), one full-screen pass, zero network requests. The render loop stops whenever the game is unattended or hidden.
- **Adaptive quality** ([`quality.ts`](quality.ts), [`view/quality.tsx`](view/quality.tsx)). The game measures its own frame intervals and CPU time and steps through four tiers: full (DPR 2, six fur shells, tilt-shift and grade), balanced (DPR 1.5, three shells), lean (DPR 1.25, no fur shells, grade without blur), and minimal (DPR 1, no post pass; the grade runs inside the materials through three's custom tone mapping). Two bad windows of dropped frames step down, one terrible window steps down at once, and stepping back up takes a long clean stretch with CPU headroom, backing off after a failed attempt so tiers never flicker. Touch devices start at balanced. After 20 s of rest (untouched, still, no demonstration) rendering drops to every other display frame. Physics catch-up substeps are capped per tier, so a slow frame slows time slightly instead of spiralling.
- **Grown-up overlay.** Triple-tap the top-left corner for fps, frame time, CPU time, draws, triangles, and the tier, and to pin a tier.
- **Cheap colliders.** Stones collide as 8-sided cylinders and fixtures as 10-sided ones; the drawn pebbles stay round. Convex-convex contacts dominated spill frames before this.
- **Geometry is built once per page** (`once()` in `view/models.tsx`), so swapping mats never stalls a frame.

## Motion rules

- **Stones** are cannon-es rigid bodies. Landing drives a squash spring (`springStep`, stiffness about 330, damping about 11); pickup stretches; a held stone follows the finger with a little lag, which reads as weight, and passes through other stones instead of shoving them.
- **The beam** is a spring toward an honest tilt, slightly underdamped: it overshoots once and settles. It is silent when level.
- **Characters** breathe and blink out of phase with each other, turn their heads toward what matters (clamped so a child still sees their face), hop when a stone lands on their plate (anticipation squash, jump, landing squash, wobble), munch together (lean back, three chomps, follow-through), and pop in with an overshoot.
- **The bag** anticipates before it tips, lurches, then wobbles back; it slumps as it empties; on first open it wiggles and a stone peeks out.
- **Sound is clay too.** Hits are dull thocks with a low body, touches are soft pats, stones fall into a cloth bag, the number voice is a soft marimba bar, guests go "nom", and a hop boings. A small procedural room reverb (a decaying-noise impulse) warms everything; nothing is recorded or fetched.
- **Stop-motion boil** (per-frame surface jitter) is allowed only if it costs nothing in smoothness. It is off by default and not built yet.

## Guidance (style-independent)

`guidance.ts` decides what to demonstrate; the view only draws it. After 3 seconds of idle, touchable things glow; after 5 seconds a big cartoon ghost hand (a camera-facing sprite, identical in every scene) shows one next act and carries a translucent stone for drags. Demonstrations back off (5, 10, 20, 40 seconds) and stop after four per idle stretch. Any touch fades everything at once. No text, no voice instructions, no verdicts.

## Pebble Table against the jam quality bar

Measured with the scripted Playwright walkthrough at 1180×820, DPR 2 (Apple M4, headless Chrome) after the ten refinement passes in [`REFINEMENT.md`](REFINEMENT.md): 59.9 fps average, 99th-percentile frame 16.8 ms, one frame over 25 ms in about 57 seconds. About 55 draw calls, one post pass, no shadow maps, zero network requests. Not yet measured on a physical iPad.
