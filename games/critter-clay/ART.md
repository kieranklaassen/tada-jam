# Critter Clay art: claymation 3D, second entry

Critter Clay's own visual style: a plasticine workshop bench in cool daylight, shot like a stop-motion film. It is the jam's second claymation game, approved by the owner, and it is kept deliberately apart from Pebble Table: no dining table, no terracotta, no sage. The jam-wide quality bar and the claimed-styles registry live in [`docs/art-direction.md`](../../docs/art-direction.md).

## The look

- **A clay workshop, not a tabletop meal.** A pale ash bench under a white north-light window, a slate-blue modelling board, a white turntable, and a parts tray. Stacked plasticine bars, a rolling pin, and a jar of modelling tools sit at the back as quiet set dressing.
- **Three plasticines only.** Cobalt, lemon, and bubblegum pink. Every critter body and every part is one of the three, so a four-year-old sees "the pink one with blue legs" at a glance, and the slate board sits between them in value so all three pop.
- **Everything shows a thumb.** One shared procedural normal map of thumbprint whorls and loop-tool drags covers every surface; parts are lumped with 3D noise at build time so nothing is CAD-perfect.
- **Stop-motion boil only while something moves.** Moving critters and parts step their surface jitter at 12 fps, like re-sculpted frames; resting clay is perfectly still, so an idle bench is calm.
- **Motion carries the charm.** Parts squish on with a squash spring, every critter's gait comes from its parts, and each of the four temperaments sleeps, wakes, is carried, and lands in its own way.

## Palette

Cool stage, bright clay. The room and board are cool; the three plasticines are saturated and far apart in hue.

| Role | Colour | Notes |
| --- | --- | --- |
| Backdrop / wall | `#dde5ee` / `#e6ebf1` | Cool daylight grey-blue, with a faint plaster mottle on the wall |
| Bench | `#cdd5dc` with edge `#a7b2bd` | Pale cool ash, faint wood grain baked into vertex colours |
| Board | `#7a93ad` with edge `#61798f` | Slate blue, the play surface, with a soft kneaded mottle |
| Clay | cobalt `#2f5bd3`, lemon `#f7d84a`, pink `#f38fbf` | Bodies and parts; insides and inner ears are a paler mix |
| Turntable, tray | `#eef0f2`, `#f4f2ee` | Near-white so parts read on them |
| Eyes | white `#fbfbf7`, pupil `#15161c` | Big bead pupils with a glint |
| Glow, ghost hand | core `#f4fbff`, edge `#8fc4ff`; glove `#ffffff` outlined `#5b8fd9` | A cool ring, not Pebble's gold |

All colours live in [`palette.ts`](palette.ts).

## How it is built

- **One clay material pair** ([`view/clay.ts`](view/clay.ts)): `MeshStandardMaterial` with vertex colours for the bench and props, and the same material with instancing for critters, both sharing one procedural tool-mark normal map drawn on a canvas at startup. Nothing is fetched or committed as an image.
- **Baked AO and kneading.** `paint()` darkens vertices near the surface a piece sits on and under overhangs, straight into vertex colours. No AO pass. Every plasticine piece, the board, and the wall also bake a soft value-noise mottle (up to 10% darker), so the lowest tier, which drops the normal map, still looks hand-worked.
- **Instanced parts.** Every part kind (stub leg, long leg, eye, pupil, lid, ear shapes, tails, head, horn, body, nose, face marks) is one `InstancedMesh`; the rig writes matrices, hues, and boil offsets into typed arrays that are the instance attributes themselves. Whole buffers are uploaded each frame (the largest is under 3 KB), because a three.js update range allocates a range object, a sort closure, and a sort buffer per attribute per frame. Empty batches are skipped. A per-vertex `tint` mixes the instance hue in, so inner ears and tail tufts come out paler.
- **The frame allocates as little as it can.** Poses, the guidance timing, and the per-critter directions reuse preallocated objects, and the rig reads surface points by index. What is left is numbers boxed at call boundaries (about 380 KB/s in Chromium). Every shader program is compiled at mount, so the first demonstration hand never stalls.
- **Boil in the vertex shader.** A per-instance `boil` vec2 (amount, seed) plus one `uBoilStep` uniform (`floor(t * 12)`) offsets vertices with a cheap hash noise. Amount is zero at rest.
- **Blob shadows, no shadow maps.** One instanced mesh of soft blobs; height above the board widens and fades each blob. The same instanced quad draws the guidance glows, snore bubbles, and clay crumbs.
- **The bench is one merged mesh**, built once: bench top, wall, board, tray and slots, turntable foot, and the props. Pieces go in top-most first, and layers hidden under the board are cut away, so each board pixel is shaded once (software GL shaded it twice before). The turntable top is a second mesh so it can spin.
- **Camera.** 40° pitch with a 28° lens, fitted by binary search so the walk area and tray just fill the frame at any aspect.
- **One full-screen pass.** A single triangle drawn last: film grain stepped at the boil rate plus a cool vignette. ACES tone mapping comes from the renderer.
- **Lights.** A cool hemisphere, a bright daylight key from the front left, a blue fill from the right, and a white rim from behind.
- **Budget.** 18 to 22 draw calls, about 40k triangles on a fresh bench and up to about 100k on a busy one, one full-screen pass, zero network requests. The render loop stops whenever the game is unattended or the tab is hidden.
- **Adaptive quality** ([`perf.ts`](perf.ts)). The loop measures its own frame intervals and steps through four tiers with hysteresis: DPR 2 with grain and normal maps, DPR 1.5, DPR 1.25 without the grain pass, and DPR 1 without normal maps. Touch devices start one tier down. Stepping back up reads the frame's own work time, not the interval, because a 60 Hz display caps the interval and never shows spare time. `?tier=N` pins a tier; `?fps=1` shows a wordless bar graph for grown-ups. `window.__jamPerf` exposes the last 600 frames of CPU time, the tier, draw calls, and triangles.

## Motion rules

- **Gait comes from parts** ([`gait.ts`](gait.ts)). Leg count picks one of six routines: none inch like a worm (bunch, then stretch), one pogo-hops, two waddle, three lope, four trot, five or six scuttle in a front-to-back ripple. Long legs stride slow and high, stubby legs patter, a big head adds a top-heavy wobble, and a tail swishes for balance. Each routine has its own wind-up before the first step from rest: the inchworm bunches, the pogo bounces twice, the waddler rocks back, the loper rears, the trotter taps a foot, the scuttler drops low and revs.
- **Temperament comes from the lump.** Each critter is shy, curious, or bouncy (from its lump), or bold once it wears a horn. Temperament sets its speed, how close it walks to others, how it greets them, its voice, and five routines that are written separately for each, not one routine with different numbers: how it sleeps (breath, snore, and dream twitch), how it wakes, how it reacts to a poke, how it is carried, and how it lands. Tests require every pair to differ.
- **The lump wants something.** While it needs parts it stretches toward the tray every few seconds; once it could wake, its nose itches. A part held near it makes it sniff, eyes still shut.
- **Parts squish on** with an underdamped squash spring, and pop off with a stretch when pulled.
- **Waking** is a tap on the nose of a lump with at least one part. A bare lump's nose tap makes it peek at the tray instead, and the part it wants hops there to answer.
- **Sound is clay too** ([`audio.ts`](audio.ts)): pats, squishes, pops, a sniff, a boing on the hop, footstep sounds per gait, wordless mumbles shaped per temperament, and each wake's own sounds on the beats of its motion, all procedural with a small synthetic room reverb.

## Guidance (style-independent)

[`guidance.ts`](guidance.ts) picks the next act; the view only draws it. Before the first touch, the tray part the lump wants hops and glows up to three times. After 3 seconds of idle the touchable things glow; after 5 seconds a big ghost hand demonstrates one act (press a part on, tap the nose, or carry a critter back to the turntable), then again after gaps of 10, 20, and 40 seconds, and then it stops. The ghost part takes the real part's colour, is let go on top of the lump, and slides into the socket it will really take, so the lesson never ends on the nose. A tap on the sleeper's body points at what it wants next (the tray part hops, or its own nose glows). Woken critters keep the strip between the camera and the turntable clear. Any touch clears everything. No text, no voice instructions, no verdicts.

## Critter Clay against the jam quality bar

Measured with the shared perf probe on the production build at 1180×820, DPR 2, touch emulation, in this VM's software WebGL (SwiftShader in Chromium, WebKit's own software path), after the thirty passes in [`REFINEMENT.md`](REFINEMENT.md). With the automatic tier, the work per frame at the 95th percentile is 2.5 ms at 4× CPU throttle and 3.8 ms at 6× (target: under 8 ms). WebKit runs at 29.4 fps against Pebble Table's 16.8 fps in the same session. A 111-second scripted core loop at 6× (sixteen parts pressed on, three critters woken, carried, and poked) peaks at 22 ms of work, with 37 minor garbage collections (the longest 5.8 ms) and no major ones. It uses 18 to 22 draw calls, one full-screen pass, no shadow maps, and makes zero network requests. Software GL pushes the automatic tier down to tier 0 (DPR 1, no normal maps). Pinned to the top tier (DPR 2), WebKit draws 11.4 fps against Pebble's 15.6 fps, so full-resolution fill is this game's weak spot on slow GPUs. At tier 2 (DPR 1.5) it draws 17.6 fps against Pebble's 16.6. Not measured on a physical iPad.
