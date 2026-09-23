# Kite Tower art: rainbow wood 3D

Kite Tower's own visual style: a sanded-beech toy playroom with rainbow-stained blocks and peg dolls, lit like a sunny morning. This style is claimed by Kite Tower. Other jam games pick a different one; the jam-wide quality bar and the claimed-styles registry live in [`docs/art-direction.md`](../../docs/art-direction.md). The techniques below (one grain atlas read once per pixel, instanced pieces, painted-once contact shadows, a grade with no render target) are reusable; the rainbow wood look is not.

## The look

- **Everything is sanded beech.** Pieces, dolls, the kite, the shelf, the lamp, the tray and the floorboards share one grain, stained per object. Stain multiplies the grain, so the wood always shows through the colour. Long grain runs along faces and edges, end grain shows on cut ends, and the bevels are a little paler where the stain has worn off.
- **Rainbow is for what the child can touch.** The twelve pieces carry the saturated stains. The room is pale: beech, cream plaster, a cream felt rug. The toy on the shelf behind Pip is a ring stacker in pale cool stains, because a saturated shape behind her read as one of her blocks (pass 10 in [`REFINEMENT.md`](REFINEMENT.md)).
- **A kid can read it at a glance.** One want per scene: the kite is stuck up high and Pip reaches for it with the arm on its side. The pieces sit in a wooden tray at the front, each one colour, each one of six clear shapes (cube, half-moon, two arches, pillar, plank).
- **Motion carries the charm.** Pieces have wooden weight: they knock, rock and settle; towers sway and topple softly. Peg dolls have no legs, so they hop on both feet, climb with a crouch, a pull and a knee-over, and dangle from the kite kicking their feet.
- **Calm, not busy.** Dust motes drift in the sunbeam. Nothing flashes, beckons or nags. Guidance is a honey ring and a ghost hand that appear only when the child is idle.
- **History.** The coordinator assigned rainbow wood from the art-direction menu, one style per jam game. The plan (`docs/plans/2026-09-23-kite-tower-plan.md`, R14 and KTD7) set the recipe: one procedural beech atlas tinted per object, grain that follows each face, crisp bevels, lathe peg dolls, three lights and no HDRI, contact shadows baked once.

## Palette

Pale room, rainbow toys. The room is warm cream and beech, so the stained pieces and the kite pop against it.

| Role | Colour | Notes |
| --- | --- | --- |
| Wall / rug | `#f7f1e7` / `#f1e9d8` | Cream plaster and cream felt; the scene background is the wall colour |
| Floorboards | `#eddab8`, `#e8d1ab`, `#f1e0c2`, `#e5cca3` | Beech, one of four tones per board |
| Shelf / shelf back / tray / lamp | `#f4e4c8` / `#d5e3cb` / `#f1dfbf` / `#ead3aa` | The shelf back is a pale sage so Pip's head reads against it |
| Shelf ring stacker | `#9cc3dc`, `#8ec5b4`, `#b3a4d6`, `#a9cde8` | Pale and cool: background toys stay lighter and cooler than any piece |
| Pieces | cubes `#f4c73c`, `#6cb35a`, `#5c9bd8`, `#3fb0a6`; arches `#e05444`, `#f29440`; half-moons `#ec8aab`, `#a8d468`; pillars `#9272c6`, `#4d82cc`; planks `#f3e0bd`, `#e9bf6c` | Each piece is one stain |
| Kite | panels `#d9473b`, `#3f86c8`, `#5fae4f`, `#f2c230`; tail bows run the rainbow | The line is `#8a6a4a` |
| Pip (the hero) | dress `#e25a47` / `#ee7a5d`, bob `#6d4428` | Skin `#f4dcc0` on every doll |
| Moss (tall, 1.1×) | coat `#6f9a78` / `#94b88f`, grey hair `#d8d2c6`, cap `#9c8764` | |
| Bean (small, 0.8×) | trousers `#3e72b8`, top `#f3cf5e`, beanie `#d9473b` | |
| Glow | `#f0a73a` | A honey ring with normal blending; an additive pale glow clipped to white on the cream rug (pass 7) |
| Shadows | `#5a3a20` | Warm brown, never grey |

The colours live in `PIECES` in [`pieces.ts`](pieces.ts), `STAIN` in [`view/room.tsx`](view/room.tsx), `PALETTE` in [`view/stage.tsx`](view/stage.tsx), the doll specs in [`view/dolls.tsx`](view/dolls.tsx) and the kite in [`view/kite.tsx`](view/kite.tsx).

## How it is built (and why it stays cheap)

- **One procedural beech atlas** ([`view/wood.ts`](view/wood.ts)): 1024², long grain in the top half, end grain in the bottom half, drawn on a canvas before the first frame. Nothing is fetched or committed as an image. Each noise cell's y-blend is done once per row, so the atlas builds in about 93 ms in Node (pass 18).
- **One wood material, one atlas read per pixel.** Roughness is that texel's green channel and the grain relief is the screen-space slope of its red channel, instead of three extra taps for a bump map (pass 2). The stain comes from the instance colour or vertex colours; a `wear` attribute pales the bevels and darkens contact. One compiled program serves every wooden thing.
- **Bevelled extrusions** ([`view/shapes.ts`](view/shapes.ts)): every block is its outline with filleted corners, extruded with a small rounded bevel on both faces, with a grain window per face.
- **Instanced pieces.** One instanced mesh per kind, so all twelve pieces are six draws; blob shadows and guidance glows are two more instanced layers.
- **The static room is merged by material**: one draw for all the wood. The soft contact shadows under and behind the furniture are painted once into two textures on one mesh (pass 8).
- **Peg dolls**: a lathed body with painted clothes, a sphere head, and a face painted on a thin shell with four expressions in one atlas, swapped by texture offset.
- **The kite**: four stained panels on two crossed dowels, a verlet tail of wooden bows (8 to 14 links by tier), and a flying line down to a wooden spool Pip can catch. The chains reuse their arrays every frame.
- **Camera.** Fixed, 30° pitch, 30° lens, solved per aspect so the build plane, the tray and the highest perch always fit ([`view/camera.ts`](view/camera.ts)).
- **Lights.** A hemisphere fill (pale sky above, warm rug below), a soft daylight key from behind the viewer, and a warm window rim from behind on the left. No shadow maps and no HDRI.
- **One full-screen pass, on every tier.** Neutral tone mapping, then one triangle multiplied over the frame for a warm grade and vignette, with no render target. At DPR 1 it costs about 3% of a software-GL frame, and keeping it on the lowest tier keeps that tier looking like the room (pass 19). MSAA is off (pass 4).
- **The sunbeam** is one additive quad drawn in a single pass (pass 8); the motes in it are shed by tier.
- **Adaptive quality** ([`quality.ts`](quality.ts), [`view/stage.tsx`](view/stage.tsx)), with Pebble Table's governor thresholds plus one extension: a window also closes after 2 s once it holds four frames, so a device under 20 fps is judged in seconds (pass 1). Touch devices start at balanced. After 20 s of rest the room renders every other display frame.

  | Tier | DPR | Motes | Tail links | Physics catch-up substeps |
  | --- | --- | --- | --- | --- |
  | full | 2 | 40 | 14 | 3 |
  | balanced | 1.5 | 20 | 12 | 3 |
  | lean | 1.25 | 0 | 10 | 2 |
  | minimal | 1 | 0 | 8 | 2 |

- **Grown-up overlay** ([`view/perf.tsx`](view/perf.tsx)). Triple-tap the bare top-left corner, or open with `?fps=1`, for a CPU bar graph against the 8 ms budget, fps, CPU p95, dropped frames, tier, DPR, draws and triangles, and buttons that pin a tier. `?tier=0` to `?tier=3` pins one from the URL.
- **Cheap physics.** cannon-es rigid bodies in one plane. Each hull tests only its own in-plane side normals (pass 9). A tower that stays within a hair of one pose for 0.8 s is put to sleep, so a loaded tower stops the solver in about a second (passes 6 and 13). A landing is one knock per touching group per step (pass 21).

## Motion rules

- **Pieces** pop in when they leave the tray, lean a little into a drag, knock and rock when they land, and sway with their stack ([`sway.ts`](sway.ts)). A block set down is one tok; three hard knocks close together are a crash.
- **Each doll has a motion personality** ([`motion.ts`](motion.ts)). Pip is curious and springy (her arms and her twirl), Moss is tall, slow and gentle (his cap and his bow), Bean is small and can't keep still (his pom-pom and his spins). Each has several variants of every react, cheer, poke and idle delight, picked without repeats with varied size and speed, blinks on its own jittered rhythm and answers a shared cue after its own delay. No action is shared between dolls, and `motion.test.ts` enforces it. Every answer changes the doll's outline, so it reads at play size (pass 14).
- **The room looks where it matters.** Everyone watches a dropped piece land (pass 17) and follows the ghost hand's piece from the tray to the spot (pass 23). Moss and Bean flinch only at a crash (pass 21).
- **Pip** walks to the kite, climbs whatever she can reach, stops short if a block comes down in her path and climbs it instead (pass 22), and somersaults off with a giggle if her footing goes. Once she has the kite it flies her round the room and drifts to a new perch, where it shivers as it catches (pass 16).
- **Sound is wood too** ([`audio.ts`](audio.ts)). Modal toks (three partials of a free wooden bar) pitched by piece, a ratchet for the quarter turn, each doll's own footfall and giggle, the kite's wind, and a pentatonic run when the kite comes free. Each piece's tok is rendered once offline after load (pass 15). Nothing is spoken, recorded or fetched.

## Guidance (style-independent)

[`guidance.ts`](guidance.ts) decides what to demonstrate; the view only draws it. Before the first touch, the next piece hops in the tray at 1.2 s, and again every 6 s, three times at most. After 3 s of idle, the piece to use and the rug spot where it would help glow with a breathing honey ring. After 5 s a ghost hand carries a see-through copy of that piece to the spot, and all three dolls watch it go. Demonstrations back off (they start at 5, 18, 41 and 85 s of idle) and stop after four per idle stretch. A flight counts as the world acting, not the child idling. Any touch fades everything at once. No text, no voice instructions, no verdicts.

## Kite Tower against the jam quality bar

Checked after the thirty refinement passes in [`REFINEMENT.md`](REFINEMENT.md), on the production build.

- **Alive at idle.** The kite rocks on its perch and its tail swings, the sunbeam's motes drift (full and balanced tiers), every doll blinks on its own rhythm and has its own idle delights, and Moss and Bean wander within their ranges. Nothing flashes or beckons. The loop stops when the shell reports the child is away or the tab is hidden, and after 20 s of rest it draws every other frame.
- **Motion and sound on every touch.** A touched piece pops out of the tray and leans into the drag; setting it down knocks with its own tok, and it rocks and settles; a quarter turn ratchets; a poked doll answers in its own way (Pip twirls or giggle-hops, Moss tips his cap or waves, Bean boings or hides and peeks) with its own giggle. Every sound is synthesized after load.
- **Weight, squash and follow-through.** cannon-es gives the pieces mass and friction; stacks sway on springs and topple softly. The dolls crouch before a hop or a climb, stretch in the air and squash on landing, and Pip dangles from the kite kicking her feet. The kite shivers as it catches on a new perch.
- **Kid-clear.** Twelve pieces in six shapes and one stain each, on a pale beech tray and a cream rug. Three dolls with distinct heights and colours. The only saturated things are what the child can touch and the kite (pass 10).
- **Wordless clarity for 5 to 8.** One want per scene: the kite is up high and Pip reaches for it with the arm on its side. The world answers physically: she climbs what she can reach and the kite carries her off. There are no words or numerals on the kid side, and the wordless check passes. A cold playtest proxy that only copies the ghost hand frees all five perches in one lap (pass 27), and a controller test holds the first three.
- **Wordless guidance.** The honey ring and the ghost hand (see Guidance) back off, stop after four demonstrations an idle stretch, and vanish on any touch. The ghost hand shows the piece's real shape at the spot where it helps.
- **60 fps on a mid-range iPad.** 38–39 draw calls, one full-screen multiply pass with no render target, no shadow maps, DPR capped at 2. The atlas is built once per page load; the geometry is built once when the game opens (never per piece, render or frame) and freed when it closes. Frame CPU p95 at Chromium 6× is 7.4–7.5 ms on auto and 6.4–8.0 ms at the minimal tier (4×: 5.3–7.8 and 4.8–5.4). WebKit on auto runs at 1.06× Pebble Table's fps in the same session. The VM has no GPU, so the fps it reports is software fill rate, and the top tier pinned (DPR 2) is fill-bound there: 0.53× Pebble Table on WebKit. **No physical iPad was measured**, so the 60 fps line still needs a device or the true-GPU pass on a Mac. Full table and method: "Final numbers" in `REFINEMENT.md`.
- **Procedural or committed assets only.** The beech atlas, the face atlas, the contact shadows and every sound are made at runtime. Nothing is fetched, and `egress:check` and `egress:built` pass.
- **Its own art direction.** Sanded beech with rainbow stains, bevelled blocks and lathe peg dolls in a pale morning playroom, registered in `docs/art-direction.md` §3. Nothing in it is clay or paper.
