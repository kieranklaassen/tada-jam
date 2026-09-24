---
title: Coplanar faces and flat overlays z-fight until the overlay is lifted, offset and drawn after what it covers, flush parts end short, and quads are cut to what their texture draws
date: 2026-09-24
category: ui-bugs
module: rendering
problem_type: ui_bug
component: development_workflow
severity: medium
related_components:
  - testing_framework
  - tooling
applies_when:
  - Adding a flat decal to a jam game, such as a blob or contact shadow, glow ring, ripple, wet patch or burrow mark
  - Stacking paper, card or felt layers, or drawing a see-through copy over a real object
  - Building merged geometry whose parts meet flush (posts under a bar, crossed spokes, floor lips, slab sides)
  - The intersection audit reports a zfight, or a seam flickers in stripes as the camera or the object moves
  - Animating a flat piece so it dips, bobs or settles onto another surface
symptoms:
  - In Shadow Lantern one stand fought another, the see-through card copy fought the real card, and the posts shared a front face with the top bar (3 zfight findings)
  - In Frog Choir a struck lily pad dipped until its top met the water (1 zfight, 4 penetrations)
  - In Light Garden the lantern bars were as tall as the lantern room, so their end caps shared its faces (8 px²)
  - One merged mesh fought itself, at Hillside Spring's crossed spokes, floor lips and ridge tops (6 zfights) and where Felt Meadow's hill folded flat onto its tucked bottom (313 px²)
  - Square quads carrying round textures reported their invisible corners inside Frog Choir's pads and bank at 13 to 18%
root_cause: logic_error
resolution_type: code_fix
tags: [z-fighting, decals, polygon-offset, contact-shadows, depth-buffer, draw-order, intersection-audit, three-js]
---

# Coplanar faces and flat overlays z-fight until the overlay is lifted, offset and drawn after what it covers, flush parts end short, and quads are cut to what their texture draws

## Problem

The intersection audit (`npm run check:intersections`, PR #16) found surfaces that z-fight in seven of the ten three.js games whose audit passes have merged (Moon Phases, PR #22, and Cosy Scarf, PR #28, had none, and Bedtime Forest's one, PR #29, was its ink outline read as a solid): two faces in one plane, or closer together than the depth buffer can tell apart, so they draw in stripes that shimmer as the camera or the piece moves. Between them those seven games had 22 zfight findings before their passes and none on screen after (Shadow Lantern 3, Frog Choir 1, Light Garden 1, Hillside Spring 6, Felt Meadow 3, Turning Tower 6, Kite Tower 2). The same passes found flat overlays (shadows, rings, ripples) reported inside what they lie on, because of their geometry rather than anything a child could see. A flicker reads to a child as something broken, and it is easy to miss on a still screenshot.

## Symptoms

- Shadow Lantern (PR #19), 3 zfights: one stand against another, the demonstration's see-through card copy on the real card, and the scenery's posts sharing a front face with the top bar. At the feet, 11 more findings with the contact spots and the stage: the sole lay in the planks' plane, and the stick was drawn in front of its foot and spot (`games/shadow-lantern/REFINEMENT.md`, "Intersection audit").
- Frog Choir (PR #20), 1 zfight and 4 penetrations: a struck lily pad dipped until its top met the water.
- Light Garden (PR #26): `lampB` × `lampB`, 8 px². The lantern bars were exactly as tall as the lantern room, so their end caps shared its faces. A second one, `table` × `table` (69 px², on the table body's front face 5 cm under the top), is off screen in every frame and stays hidden, with no rule.
- Turning Tower (PR #30), 6 zfights: a turning segment's end faces lay in its neighbours' faces. Segments are now drawn fitted to their sweep (`armFit` in `games/turning-tower/view/build.ts`).
- A merged mesh fighting itself. Hillside Spring (PR #27) had 6 findings across `wheel` × `wheel`, where the spokes cross at the axle, and `hillside`, `foliage` and `beds` against themselves (and `foliage` against `hillside`), where floor lips and ridge tops lay over the faces they met. Felt Meadow's 3 (PR #24) included the hill against itself (313 px²), where the grid folded faces flat onto the slab's tucked bottom under the paper floor, and the bee's two pollen balls against each other (1,460 px²). Kite Tower's 2, in an arch and the room's wood, are listed with the fix "Wood slab caps never fold over themselves (the bevel inset stays inside each fillet)" (`games/kite-tower/REFINEMENT.md`).
- Not a flicker, but the same family. Frog Choir's blob shadows, glow rings and ripples were `PlaneGeometry(1, 1)` quads carrying round alpha textures. A draft run still reported `blob-shadows` × `pond>pads` at 13 to 18% and `glow-rings` × `pond>bank` at 15%, where only the quads' transparent corners reached the pad bevel or the bank. Nothing showed on screen.

## What Didn't Work

- **Staggering depth to hide the flicker.** Shadow Lantern's pass 14 stood each card "a hair off its pin's depth, so two cards a child puts together never flicker". The audit pass found it "only hid the flicker" (`games/shadow-lantern/REFINEMENT.md`): nothing kept a dragged or turned stand out of its neighbours, so they still passed through each other. The stagger is gone. The stands are solid paper with one set of dimensions for the view and the controller (`games/shadow-lantern/stands.ts`), and a move stops against what it meets.
- **`depthWrite: false` on its own.** A decal that writes no depth still tests against the surface drawn before it, so a decal lying exactly on an opaque floor still fights it. The audit's unit test pins this: `canFight(opaque, decal)` is true, while `canFight(decal, decal)` is false (`test/intersections.test.ts`, "knows which coplanar pairs the depth buffer never compares"). Turning off depth writes stops two non-writing layers fighting each other, not a layer fighting what it lies on.
- **`renderOrder` on its own.** Draw order decides nothing between two surfaces that both write depth: in one plane, rounding picks the depth test's winner pixel by pixel. It only helps when one side writes no depth (see Why This Works).
- **A square quad for a round texture.** The audit and the depth test read geometry, not alpha. The quad's invisible corners count as reaching into whatever they overlap, and they are where a flat quad on a curved or bevelled surface dips under it.
- **Ignoring the decal layer before it is right.** Frog Choir's blob shadows had 21 findings, including both of its containments. They were real placement faults, not noise: shadows sank into pads, the bank and frogs. Ignoring `blob-shadows` by name would have hidden all of them. Hillside Spring ignores its `shadows`, `rings` and `wet-ground` only with a reason each, once they are flat decals lifted over the ground with no depth write (`scripts/intersections/games/hillside-spring.ts`).

## Solution

**A flat decal lies a lift above what it covers, writes no depth, has a polygon offset with both factor and units, and is drawn after the surface.** Shadow Lantern's contact spots (`games/shadow-lantern/view/game.ts`):

```ts
/** Contact spots lie between the planks (y 0.03) and the feet's soles. */
const SPOT_Y = 0.045
// A decal on the planks, under the feet it sits beneath.
const material = new THREE.MeshBasicMaterial({ map: spot, color: PALETTE.dropShadow, transparent: true,
  depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
this.blobs.renderOrder = 1
```

The sole rests at `STAND.sole` 0.06, "on the stage planks (y 0.03) and above the contact spot under it" (`games/shadow-lantern/stands.ts`), so the stick, foot and spot read one set of numbers and nothing lies in the planks' plane. Hillside Spring's shadows and rings take the same material settings, with offsets of −2/−2 and −3/−3 (`games/hillside-spring/view/fx.ts`).

When the surface under a decal moves, the lift follows it. Frog Choir lays each shadow `SHADOW_LIFT` (0.006) above the highest pad it reaches, or the water, shrinks it so it never cuts into another frog or reaches the shore, and gives it radius 0 when it goes (`shadowSpot` in `games/frog-choir/surfaces.ts`). Its test sets the floor under that lift: "Less than this over the surface under it and a shadow flickers through it, polygon offset or not" (`HAIR = 0.004`, `games/frog-choir/controller.test.ts`).

**Cut the quad to what its texture draws.** Frog Choir's rings, ripples and shadows are discs (`games/frog-choir/view/overlays.ts`):

```ts
export function flatDisc(reach: number): THREE.BufferGeometry {
  const geometry = new THREE.CircleGeometry(reach, 32)
  const position = geometry.getAttribute('position')
  const uv = geometry.getAttribute('uv')
  for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i) + 0.5, position.getY(i) + 0.5)
  geometry.rotateX(-Math.PI / 2)
  return geometry
}
```

The uv remap gives the disc the old unit quad's texture mapping, so a disc of reach 0.5 draws exactly what the quad drew, minus the corners.

**A piece that moves onto another surface is capped short of it.** Frog Choir's struck pad sinks softly towards `PAD_SINK` and never past it (`games/frog-choir/controller.ts`):

```ts
export const PAD_SINK = 0.032
export function padDip(wave: number): number {
  return wave < 0 ? -PAD_SINK * Math.tanh(-wave / PAD_SINK) : wave
}
```

The pad geometry, the shadow and droplet checks, and the audit script all take the pad's dimensions from one place (`PAD_TOP`, `PAD_UNDERSIDE`, `PAD_RIM` in `games/frog-choir/layout.ts`), so the top stays above the water and the underside within its depth.

**Parts that meet flush end short of the shared face, or sit a hair off it.**

- Light Garden: the lantern bars are 2.3 cm, not the room's 2.4, "a hair shorter than the lantern, so their ends never share its faces" (`lamp()` in `games/light-garden/view/geometry.ts`).
- Shadow Lantern: the posts go "up to the top bar, not into it: the two front faces would share a plane" (`games/shadow-lantern/view/scenery.ts`).
- Hillside Spring: "each spoke sits a hair off the last where they cross at the axle, so their faces never share a depth" (`games/hillside-spring/view/pieces.ts`). Floor lips and ridge tops no longer lie over the faces they meet, and tufts hang in front of the walls.
- Felt Meadow: the hill drops the faces its grid folds flat onto the slab's tucked bottom (`kept` in `games/felt-meadow/view/geometry.ts`), and the slab's sides run `SLAB.tuck` below the paper floor "so none of the slab lies in the floor's plane". That tuck leaves a small intended overlap, allowed as `backdrop` × `hill` with `upTo: 0.3` (`scripts/intersections/games/felt-meadow.ts`). Its two pollen balls now slide together into one instead of fighting each other.

**Stacked layers each get their own depth, with air between.** Shadow Lantern's creature cards had all their paper within about 0.4 cm of depth, so a wing, tail or shell swung through the body (7 pose findings). They now read `CREATURE_STACK` in `games/shadow-lantern/motion.ts`: the shadow card, the backing, a hanging part, the body, the eye and a front part, each at its own offset "with air between each so no two faces share a plane".

**A copy drawn over the real thing skips the depth test.** Shadow Lantern's see-through demonstration card now draws over everything with `depthTest: false`, like the guiding hand (`games/shadow-lantern/view/game.ts`). The audit skips such overlays itself since tool v3 (PR #18).

**A decal made from the same buffers as a solid is its own mesh.** Hillside Spring's wet ground under loose water was part of the water mesh, so the audit could not tell the flat darkening from the water. It is now a separate `wet-ground` mesh drawn just before the water (`renderOrder` 1.5 against 2, `games/hillside-spring/view/water.ts`), which the config ignores as a decal. The cost is one draw call (21 against 20).

## Why This Works

- **Depth precision.** With a standard perspective projection the smallest separation a b-bit depth buffer resolves at view distance z is about z²/(near·2^b), so it grows with the square of the distance and shrinks as `near` moves out ([LearnOpenGL: depth testing](https://learnopengl.com/Advanced-OpenGL/Depth-testing), [NVIDIA: depth precision visualized](https://developer.nvidia.com/content/depth-precision-visualized)). The audit reports two faces as a zfight when they are closer than 16 times that step for a 24-bit buffer (`depthResolution` in `scripts/intersections/core.ts`), overlap on screen by at least `zfightPixels` (6 px², `DEFAULT_TOLERANCE`), and can be compared at all. A lift beats the step at the farthest distance the camera sees the decal from. Shrinking `near` to fix clipping makes this worse.
- **Polygon offset.** The offset is factor·DZ + r·units, where DZ is the face's depth slope ([glPolygonOffset](https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glPolygonOffset.xhtml)). A floor seen from above has DZ near 0, so a factor alone does almost nothing there. Set units too.
- **Which pairs can fight.** `canFight` in `scripts/intersections/core.ts` encodes the draw rules: no pair fights if either side has no depth test or has a polygon offset, or if neither writes depth. When exactly one side writes depth, the pair cannot fight if the non-writer is drawn first, because three.js draws every opaque mesh before any transparent one, each list in `renderOrder`. So Hillside Spring's wet ground cannot fight the running water (they share one material with no depth write), and a non-writing decal drawn before a transparent surface that writes depth cannot fight it, but a decal drawn after an opaque floor can.
- **The audit trusts any offset.** Because `canFight` returns false for any `polygonOffset`, whatever its size, the audit cannot tell an offset too small for the camera or a lift under the depth step. That is why Frog Choir's shadow test checks the lift itself, and why the report's close-ups are looked at, not just counted.
- **Geometry, not alpha.** The audit's material filter in `scripts/intersections/page.js` drops meshes with no colour write, overlays with no depth test anywhere, and transparent ones below 0.05 opacity. A decal with `depthWrite: false` is none of those, so it is checked for penetration by its full triangles unless the config ignores it. On screen the corners draw nothing, so those findings are false, but the GPU still rasterises and depth-tests them. Cutting the quad removes them from the audit and stops drawing empty pixels.
- **One merged mesh is checked against itself.** `zfightFinding` in `scripts/intersections/core.ts` also compares a piece with itself, skipping triangle pairs that share a welded vertex and faces turned away from the camera, so coplanar faces inside one batch show as `x` × `x`. That is where Hillside Spring's, Felt Meadow's and Shadow Lantern's scenery fights came from.

## Prevention

- Before adding a flat layer, decide which of the three it is: lifted above the depth step with a polygon offset (factor and units) and no depth write, drawn after what it lies on; drawn with no depth test because it is a copy or a guide over everything; or a real solid that must not share a plane with anything.
- Build flat overlays from discs or shapes cut to the texture, not unit quads (`flatDisc`).
- Keep one set of dimensions for the geometry, the controller and, where it needs them, the audit config (`STAND`, `PAD_TOP`/`PAD_UNDERSIDE`/`PAD_RIM`, `SLAB`), so a lift or a gap is stated once.
- Where parts of a merged mesh meet, end one short or set it a hair off, and leave a one-line comment saying why, as Light Garden's bars and Hillside Spring's spokes do.
- Pin the fix in a unit test that fails on the old code:
  - Coplanar faces in merged geometry: `sharedPlanes` in `games/hillside-spring/intersections.test.ts` ("surfaces in one plane"), the face check in `games/felt-meadow/intersections.test.ts` ("never lays one of its faces over another"), and `games/shadow-lantern/scenery.test.ts` ("has no two faces lying in one plane over each other").
  - A moving surface: Frog Choir's "keeps every pad clear of the water it floats on", which sweeps `padDip(padWave(age, strength))` over strengths and ages and expects it never below `-PAD_SINK`.
  - A decal's lift: Frog Choir's "lays shadows a hair above what is under them".
- Ignore a decal layer in the audit config only once it is right, with its reason on the pattern, as Hillside Spring's config does.
- Run the audit (`npm run check:intersections -- <game>`) after any change to a decal, a layer stack or merged scenery, and look at the zfight close-ups in its report.

## Related Issues

- PR #16 (the audit and its zfight kind), PR #18 (tool v3: overlays with no depth test skipped), PR #23 (tool v4: outline hulls skipped).
- The game passes: PR #19 Shadow Lantern, PR #20 Frog Choir, PR #24 Felt Meadow, PR #26 Light Garden, PR #27 Hillside Spring, PR #30 Turning Tower, and Kite Tower's, merged from a bundle as "Merge cursor/kite-tower-intersections-bundle".
- [Every jam game picks its own visual style; all games meet one shared quality bar](../conventions/distinct-visual-style-per-game-shared-quality-bar.md) lists blob shadows as a technique games may share, and `docs/art-direction.md` asks for blob or baked contact shadows instead of shadow maps; this doc is how to lay those shadows so they neither flicker nor clip.
- three.js [Material](https://threejs.org/docs/#api/en/materials/Material) (`polygonOffset`, `depthWrite`, `depthTest`) and the [decals example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_decals.html).
