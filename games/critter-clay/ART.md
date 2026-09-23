# Critter Clay art: claymation 3D, second entry

Critter Clay's own visual style: a plasticine workshop bench in cool daylight, shot like a stop-motion film. It is the jam's second claymation game, approved by the owner, and it is kept deliberately apart from Pebble Table: no dining table, no terracotta, no sage. The jam-wide quality bar and the claimed-styles registry live in [`docs/art-direction.md`](../../docs/art-direction.md).

## The look

- **A clay workshop, not a tabletop meal.** A pale beech bench under a white north-light window, a slate-blue modelling board, a white turntable, and a parts tray. Stacked plasticine bars, a rolling pin, and a jar of modelling tools sit at the back as quiet set dressing.
- **Three plasticines only.** Cobalt, lemon, and bubblegum pink. Every critter body and every part is one of the three, so a four-year-old sees "the pink one with blue legs" at a glance, and the slate board sits between them in value so all three pop.
- **Everything shows a thumb.** One shared procedural normal map of thumbprint whorls and loop-tool drags covers every surface; parts are lumped with 3D noise at build time so nothing is CAD-perfect.
- **Stop-motion boil only while something moves.** Moving critters and parts step their surface jitter at 12 fps, like re-sculpted frames; resting clay is perfectly still, so an idle bench is calm.
- **Motion carries the charm.** Parts squish on with a squash spring, a woken critter yawns and hops off the turntable, and every critter's gait comes from its parts.

## Palette

Cool stage, bright clay. The room and board are cool; the three plasticines are saturated and far apart in hue.

| Role | Colour | Notes |
| --- | --- | --- |
| Backdrop / wall | `#dde5ee` / `#e6ebf1` | Cool daylight grey-blue |
| Bench | `#d3c3a6` with edge `#b9a684` | Pale beech, wood grain baked into vertex colours |
| Board | `#7a93ad` with edge `#61798f` | Slate blue, the play surface |
| Clay | cobalt `#2f5bd3`, lemon `#f7d84a`, pink `#f38fbf` | Bodies and parts; insides and inner ears are a paler mix |
| Turntable, tray | `#eef0f2`, `#f4f2ee` | Near-white so parts read on them |
| Eyes | white `#fbfbf7`, pupil `#15161c` | Big bead pupils with a glint |
| Glow, ghost hand | core `#f4fbff`, edge `#8fc4ff`; glove `#ffffff` outlined `#5b8fd9` | A cool ring, not Pebble's gold |

All colours live in [`palette.ts`](palette.ts).

## How it is built

- **One clay material pair** ([`view/clay.ts`](view/clay.ts)): `MeshStandardMaterial` with vertex colours for the bench and props, and the same material with instancing for critters, both sharing one procedural tool-mark normal map drawn on a canvas at startup. Nothing is fetched or committed as an image.
- **Baked AO.** `paint()` darkens vertices near the surface a piece sits on and under overhangs, straight into vertex colours. No AO pass.
- **Instanced parts.** Every part kind (stub leg, long leg, eye, pupil, lid, ear shapes, tails, head, horn, body, nose, face marks) is one `InstancedMesh`; the rig writes matrices, hues, and boil offsets into typed arrays that are the instance attributes themselves, and only the used range is uploaded each frame. A per-vertex `tint` mixes the instance hue in, so inner ears and tail tufts come out paler.
- **Boil in the vertex shader.** A per-instance `boil` vec2 (amount, seed) plus one `uBoilStep` uniform (`floor(t * 12)`) offsets vertices with a cheap hash noise. Amount is zero at rest.
- **Blob shadows, no shadow maps.** One instanced mesh of soft blobs; height above the board widens and fades each blob. The same instanced quad draws the guidance glows, snore bubbles, and clay crumbs.
- **The bench is one merged mesh**, built once: bench top, wall, board, tray and slots, turntable foot, and the props. The turntable top is a second mesh so it can spin.
- **Camera.** 40° pitch with a 28° lens, fitted by binary search so the walk area and tray just fill the frame at any aspect.
- **One full-screen pass.** A single triangle drawn last: film grain stepped at the boil rate plus a cool vignette. ACES tone mapping comes from the renderer.
- **Lights.** A cool hemisphere, a bright daylight key from the front left, a blue fill from the right, and a white rim from behind.
- **Budget.** About 19 draw calls and 36k triangles on a full bench, one full-screen pass, zero network requests. The render loop stops whenever the game is unattended or the tab is hidden.
- **Adaptive quality** ([`perf.ts`](perf.ts)). The loop measures its own frame intervals and steps through four tiers with hysteresis: DPR 2 with grain and normal maps, DPR 1.5, DPR 1.25 without the grain pass, and DPR 1 without normal maps. `?tier=N` pins a tier; `?fps=1` shows a wordless bar graph for grown-ups. `window.__jamPerf` exposes the last 600 frames of CPU time, the tier, draw calls, and triangles.

## Motion rules

- **Gait comes from parts** ([`gait.ts`](gait.ts)). Leg count picks one of six routines: none inch like a worm (bunch, then stretch), one pogo-hops, two waddle, three lope, four trot, five or six scuttle in a front-to-back ripple. Long legs stride slow and high, stubby legs patter, a big head adds a top-heavy wobble, and a tail swishes for balance.
- **Temperament comes from the lump.** Each critter is shy, curious, bouncy, or bold, which sets its speed, how close it walks to others, how it greets them, and its voice.
- **Parts squish on** with an underdamped squash spring, and pop off with a stretch when pulled.
- **Waking** is a tap on the nose: the lump shivers, opens its eyes (or its drawn crescents become dots), yawns, stretches, and hops down.
- **Sound is clay too** ([`audio.ts`](audio.ts)): pats, squishes, pops, a boing on the hop, footstep sounds per gait, and wordless mumbles shaped per temperament, all procedural with a small synthetic room reverb.

## Guidance (style-independent)

[`guidance.ts`](guidance.ts) picks the next act; the view only draws it. After 3 seconds of idle the touchable things glow; after 5 seconds a big ghost hand demonstrates one act (press a part on, tap the nose, or carry a critter back to the turntable). Demonstrations back off and stop after four per idle stretch. Any touch clears everything. No text, no voice instructions, no verdicts.
