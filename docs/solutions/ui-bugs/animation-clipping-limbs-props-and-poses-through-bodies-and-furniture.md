---
title: Limbs, props and carried things clip through bodies and furniture when heights are hand-set; measure rest and reach from the rig, rise over lower ranks ahead of contact, keep motion on the CPU, and sweep pose extremes in unit tests
date: 2026-09-24
last_updated: 2026-09-24
category: ui-bugs
module: animation
problem_type: ui_bug
component: development_workflow
severity: medium
related_components:
  - testing_framework
  - tooling
applies_when:
  - Animating a character's limbs, wings, tail or squash in a jam game, or adding a personality, reaction or variant
  - Carrying, hopping, flying or dropping a piece or creature over other things
  - Standing a character on a surface, a slope or another piece
  - Moving vertices in a vertex shader, or building a rotation from direction vectors
  - The intersection audit reports a pose finding, or a penetration on something that moves
symptoms:
  - Frog Choir's frogs sank into their pads and the water (10 findings), carried frogs passed through the others (4) and the firefly flew through heads (17)
  - Light Garden carried pieces at a fixed 3.6 cm, under the lamp's 6.85 cm top, and a piece flying home popped up over a tray lamp in one frame
  - Moon Phases' child stood partly inside Earth at 1,899 of 2,880 swept homes, hours and phases, and upside down at 743, from a left-handed basis
  - A wing, tail or shell swung through its own body (Shadow Lantern, 7 pose findings; Felt Meadow's bee wings 33 to 34% into its face)
  - The audit saw rest-pose or full-size geometry where a vertex shader moved it (Light Garden's tray knob, Hillside Spring's crops, Bedtime Forest's sleeping animals, Pebble Table's fur and quills)
root_cause: logic_error
resolution_type: code_fix
tags: [animation, clipping, pose, rest-height, carry, vertex-shader, morph-targets, intersection-audit]
---

# Limbs, props and carried things clip through bodies and furniture when heights are hand-set; measure rest and reach from the rig, rise over lower ranks ahead of contact, keep motion on the CPU, and sweep pose extremes in unit tests

## Problem

Most of what the intersection audit (PR #16) found in the eleven merged three.js game passes was motion, not modelling. A wing or tail swung through its own body, a character sank into what it stood on, and a carried, hopping or flying thing passed through whatever it crossed. The common cause was heights, reaches and clearances set by hand, which no test tied to the drawn meshes, plus motion that lived where neither the unit tests nor the audit could see it: a vertex shader, or a frame drawn before the first update. A child sees a frog's head in a lily pad or a hand through a table as the game being broken.

## Symptoms

- Frog Choir (PR #20): frogs sank into their pads and the water (10 findings: frog × pads, glow rings and pad ripples, crooner × water). A carried show-off frog passed through the bouncy and the sleepy frogs, and the crooner through two others (4). The firefly's body, wings and tail went through all five frogs' heads (17).
- Light Garden (PR #26): a carried mirror went through the lamp (`lampA` × `mirror1`, 14%), because a carried piece floated at a fixed 3.6 cm, under the lamp's 6.85 cm top. The blue filter went through two sleepers the same way. The snail sank into the panel when poked (9%), because its answer pitched its nose down instead of rearing up. In review, Cursor Bugbot found a piece flying home that popped up over a tray lamp in one frame: its arc peaks at 7 cm and the lamp needs 7.4.
- Moon Phases (PR #22): the child stood in Earth (`earth` × `child>child-body`, 34%). Swept over 2,880 homes, hours and phases, it was partly inside the globe in 1,899, up to 0.43 deep, and upside down in 743. Nine more pairs showed at 0 s, among them the child inside Earth's stand (293%), in a frame drawn before the first tick.
- Parts through their own body. Shadow Lantern (PR #19) had 7 pose findings: a wing, tail, flukes or shell swung through the body and the backing card. Felt Meadow (PR #24) had its bee's wings through its face (33 to 34%) and body (12 to 13%), and the bee itself through flower heads (76 findings).
- Hillside Spring (PR #27): the tanuki through the foliage (mouth 202%), the frog through terrace walls, and carried pipe pieces through the crops (177%). A test written for a Bugbot comment moved the tanuki's wheel to the other end of its terrace, and the tanuki walked straight across through the crops and the bed walls. That bug was already on `main`.
- Cosy Scarf (PR #28): limbs through their bodies as they swung (the bunny's arms 68%, the penguin's flippers 60%, the fox's paws 80%), feet, paws, bodies and the fox's tail sunk into the snow and the blanket (15 findings), and the penguin walking home through the loom (eyes 137% into the felt).
- Bedtime Forest (PR #29): animals inside animals. The owl in the fox's head and chest (22%), a rabbit carried to its burrow through the bear (20%), and the fish flopping home through the rabbit and the fox (8% each). They were kept apart by a circle, and only while idle or walking.
- Turning Tower (PR #30): the bird's head, wings and puff in the blocks, a segment, the wanderer and the door (17), and the wanderer walking in through a door jamb (7). The bird's cheek sank into its back as it looked over its shoulder, deeper than the audit's pose rule could see.
- Kite Tower (merged from the bundle branch `cursor/kite-tower-intersections-bundle`): blocks through Pip's body, head, face and arms as they were set down, fell or toppled (27), and arms through their own doll's head, hat, body and other arm (15).

## What Didn't Work

- **Hand-set heights.** Light Garden's carried piece floated at a fixed 3.6 cm. Before PR #20, Frog Choir's view laid shadows at a fixed `PAD_TOP + 0.03` and set other heights as multiples of each frog's scale. Such numbers hold for the pose their author looked at. Nothing fails when a new personality, reaction or piece reaches past them.
- **Lifting at the moment of contact.** Light Garden's height floor lifted a piece flying home in the single frame it would have touched the tray lamp, and dropped it as fast once past. Bugbot's autofix compared the rest of the path against the arc's current height and still jolted by 0.79 cm in one frame.
- **Trusting a clean audit for a one-frame fault.** The audit stayed clean before and after that pop. It checks crossings, not smoothness, and at 262 samples over 66 s of game time it rarely lands on the one bad frame.
- **A unit test that skips the controller's events.** Hillside Spring's first test of the tanuki's visit never called the director's `trigger('arrive')` or `cue()` as the controller does, so it passed on broken code. The audit's worst tanuki findings came from exactly that arrival spin.
- **Motion only a vertex shader knows about.** Light Garden folded a tray piece's knob in the glass vertex shader. On the CPU the knob still stuck out 6 to 9 cm, so the audit reported it through the tray frame when nothing showed. The creatures' shader moves (wing sweep, jelly tentacles, snail stalks) were invisible in the other direction: the moth's wings dipped under the panel at take-off and the snail overshot into it when set down, and the audit could not see either. Hillside Spring's crops still grow in the vertex shader, so a harvested bed is drawn as stubble but audited full-size. Bedtime Forest poses every part of its animals through a `parts` uniform in the vertex shader (`games/bedtime-forest/view/gouache.ts`), so the audit checks each animal in its bind pose: "a sleeping bear slumped in front of the cave mouth is checked as a standing bear with its back in the rock", and "a rearing bear's forelegs are not checked at all" (its pass's tool notes). Pebble Table's pending pass (branch `cursor/pebble-table-intersections-2526`) found the same for its guests' fur shells and hedgehog quills, which their vertex shaders push out and sway.

## Solution

**Measure each body from its mesh, keep the numbers in one module the controller reads, and test the module against the rig.** Frog Choir's `games/frog-choir/bodies.ts` opens:

```ts
// How much room each frog takes, so nothing passes through one: the highest
// and lowest point of its skin in rings around its feet, in pond units above
// the frog's origin (the view stands that origin so the belly rests on the
// pad). The numbers are measured from the rigs posed by their animators, and
// bodies.test.ts checks every rig still fits inside them.
```

Each body's `seat` is its rest height, and `games/frog-choir/bodies.test.ts` pins it to the posed skin's bounding box:

```ts
it('rest on their bellies: a frog at rest reaches `seat` below its feet', () => {
  for (let i = 0; i < CAST.length; i++) {
    applyPose(rigs[i], restPose())
    rigs[i].group.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(skinOf(i), true)
    expect(box.min.y, CAST[i].character).toBeCloseTo(-BODIES[i].seat, 3)
```

The `true` makes three.js measure every vertex as posed (through `getVertexPosition`), not the geometry's precomputed box. The same file's "stay inside the room measured for them, whatever they are doing" plays each frog's scripted runs and checks every rig against its measured rings. Light Garden does the same for its pieces and creatures (`games/light-garden/bodies.ts`; "measures every piece from its mesh" in its test). Felt Meadow's bee sits at `SIT_HEIGHT`, "high enough over the level face that the bee stands on it on its feet" (`games/felt-meadow/bee.ts`). Cosy Scarf builds its snow and blanket meshes from one ground module, and `standY` "follows their very triangles, so whatever stands on it sits on what the child sees" (`games/cosy-scarf/ground.ts`). Moon Phases names its riser, cradle and ring sizes (`RISER`, `CRADLE`, `HALVES`, `riserGap` in `games/moon-phases/scene.ts`), and its test reads the same constants.

**Whatever moves over others rises over them, in a fixed order, before it would touch.** Frog Choir ranks every frog each frame and steps the ranks lowest first (`games/frog-choir/controller.ts`):

```ts
function rankOf(frog: Frog): number {
  switch (frog.mode) {
    case 'sit':
      return 0
    case 'splash':
      return 1
    case 'hop':
      return frog.waiting ? 3 : 2
    case 'held':
      return 4
```

A frog passes over every frog of a lower rank, and of its own rank with a lower index. A carried or waiting frog "rises along the line of sight through that point, so on screen it stays over the fingertip while it passes over", by as much as `clearOver` in `games/frog-choir/bodies.ts` says it needs, from the measured rings plus a margin. The firefly flies over each frog's measured top the same way (`fireflyOver`). Light Garden's `rise` does it with explicit lead and clearance (`games/light-garden/controller.ts`):

```ts
/** How far ahead (s) a piece flying home looks along its path for what it will pass over, in this many steps. */
const HOME_AHEAD = 0.2
const HOME_LOOKS = 4
/** What a carried or flying thing's underside keeps between itself and what it passes over (cm). */
const CLEARANCE = 0.4
/** It starts to rise this far (cm) before it would touch, so it floats up instead of popping up. */
const RISE_EARLY = 2.5
```

Hillside Spring lifts a carried piece along the ray through the finger (`CarryGround` in `games/hillside-spring/view/carry.ts`) and floats a held piece over what it would swap (`PIECE_TOP`, `CARRY_LIFT` in `games/hillside-spring/view/pieces.ts`). Its frog jumps each terrace wall on an arc that clears the ground it passes over (`planHops` in `games/hillside-spring/view/hops.ts`). Cosy Scarf walks an animal round the loom, the basket and its friends in a few straight legs (`planRoute` in `games/cosy-scarf/paths.ts`), and stops the loom scarf's swing and pull before a needle end would touch the loom's feet, the blanket, the basket or an animal (`swingRoom`, `maxDrop` in `games/cosy-scarf/layout.ts`). Felt Meadow's flying bee keeps out of a column round each flower's head and eases its targets up over any flower they near (`keepOffFlowers`, `overFlowers` in `games/felt-meadow/bee.ts`).

**Limbs keep out of their own body.**

- In Cosy Scarf, an arm, a flipper or a paw "is sewn on at its shoulder, the middle of its rounded top, and turns about it, so the seam sinks in the same however it turns" (`games/cosy-scarf/view/animals.ts`).
- Felt Meadow's wings beat no lower than the body allows (`lowestBeat` in `games/felt-meadow/view/poses.ts`).
- Frog Choir's backflip "turns about its middle, as a real one does, so its head never swings through the pad" (`games/frog-choir/view/personalities.ts`).
- Shadow Lantern gives each paper layer its own depth with air between (`CREATURE_STACK` in `games/shadow-lantern/motion.ts`). The page turn now turns over in the card's own plane (`placeCreature` in `games/shadow-lantern/view/game.ts`), and the flame stands on the cup's floor (`LAMP_CUP_Y`).
- Hillside Spring's pipe arms stop at the hub's wall and at the face of the terrace wall behind their cell (`HUB_OUTER`, `WALL_REACH`).

**A character on a surface follows it.** Felt Meadow's mouse and snail lean flat on the slope (`groundTilt` in `games/felt-meadow/layout.ts`). Its seeds sit in the posed pouch's mouth (`pouchSeat`), and the view and the tests share one pose matrix. Light Garden never draws a creature lower than the panel in its pose (`groundAlt` in `games/light-garden/bodies.ts`).

**Motion the tests and the audit must see happens on the CPU.** Light Garden's knob fold is now the piece geometry's morph target (`pieceGeometry` in `games/light-garden/view/geometry.ts`), and the shader says why:

```glsl
// A piece's knob folds into it in the tray as a morph target (view/geometry.ts) rather than in deform(),
// so whatever reads the geometry on the CPU sees it folded too.
```

The audit reads morphed and skinned positions (`getVertexPosition` in `scripts/intersections/page.js`), so the fold is seen. Where a deform has to stay in the shader, port it to TypeScript and test that. Light Garden ported its creatures' moves to `games/light-garden/bodies.ts`, whose header says to "keep the two in step". A throwaway vitest then ran the audit's `preparePiece` and `pairDepth` on every creature pair through 72 s of a full garden, and found 0 crossings. Hillside Spring kept its crop tests on the full-grown CPU crops, the worst case.

Where shader motion is neither on the CPU nor mirrored, a clean audit says nothing about it, so say that in the config and the log. Bedtime Forest allows each animal in its own doorway ("the sleeping poses come from the vertex shader", PR #29), fits its footprints to the bind pose with 0.6 units of air, and lists "Poses are not audited" under what is still weak in `games/bedtime-forest/REFINEMENT.md`. Pebble Table's branch ignores `guest-fur-` and `guest-quills-` and reviews them by eye in the close-ups and contact sheets. The audit has no hook for a game to hand it a shader pose; Bedtime Forest's tool notes suggest one.

**Build a rotation from vectors in right-handed order.** Moon Phases turned the child by (up × forward, up, back). That set is a mirror, not a rotation, and the quaternion three.js takes from it had length 0.71. Now (`games/moon-phases/scene.ts`):

```ts
const right = new THREE.Vector3().crossVectors(forward, up).normalize()
forward.crossVectors(up, right)
this.kid.quaternion.setFromRotationMatrix(this.m.makeBasis(right, up, forward.clone().negate()))
```

**Place the scene before anything can draw it.** Moon Phases' `resize()` drew once before the first tick, and only `update()` placed the child, hid the ring halves and turned the gears. The constructor now ends with `this.update(0)`. Tool v4 (PR #23) no longer samples a draw made before the game's loop has run, so from now on only the game's own test ("is already placed as its first update leaves it") guards this.

## Why This Works

- **What a pose finding is.** Two parts of one object are compared with the shallowest they have been in the run, and flagged when they cross deeper than that by more than the tolerance (the `pose` kind in `scripts/intersections/core.ts`). A part modelled into another at rest, such as an arm set into the shoulder, is not flagged. A swing past it is.
- **Measured numbers fail loudly.** Once a clearance is derived from the rig and a test checks the rig against it, a new personality or reaction that reaches further fails that test. A hand-set number just lets the new pose clip.
- **A fixed order settles who rises.** Two frogs can never both rise over each other, and stepping the lowest rank first means a higher one reads where the lower one already is this frame.
- **The line of sight keeps the finger's hold.** Under a perspective camera, lifting a carried thing straight up moves it off the fingertip on screen. Lifting it along the ray through the finger's screen point does not. Hillside Spring's test holds a carried piece within 3 px of the finger.
- **Rising early, looking ahead.** A clearance checked only at the current point can only react once contact is one frame away, which is a pop. Starting `RISE_EARLY` before contact, and checking points `HOME_AHEAD` along the path against the arc's own height there, spreads the rise over many frames.
- **The CPU is where the checks look.** Vitest and the audit both read vertex positions on the CPU. three.js applies morph targets and skinning there too; custom vertex-shader code it cannot run. The audit's report only counts "meshes with custom vertex shaders (their CPU geometry may differ from what is drawn)" (`scripts/jam-intersections.mjs`).
- **Handedness.** `makeBasis` from a left-handed set builds a reflection. `setFromRotationMatrix` assumes a pure rotation, so the result is a non-unit quaternion that tips and mirrors the object. Right = forward × up, with forward rebuilt at right angles, is a rotation.

## Prevention

- Sweep every moving thing through its extremes in a unit test that fails on the old code:
  - Moon Phases: "stands upright on the globe, outside it, and points at the moon while it is up, at every home, hour and phase" (360 homes and hours, eight phases each), and the rings "at every point of the orbit" (`games/moon-phases/intersections.test.ts`).
  - Shadow Lantern: every idle and tap reaction in the sky keeps each creature in its layer (`games/shadow-lantern/creature-layers.test.ts`).
  - Frog Choir: every personality's runs stay inside their measured room (`games/frog-choir/bodies.test.ts`).
  - Felt Meadow: the bee sits, flies, carries and flaps without sinking into a flower, the felt, its body or its face (`games/felt-meadow/intersections.test.ts`).
  - Light Garden: every creature stays inside its measured top and reach and on the panel in every pose (`games/light-garden/bodies.test.ts`).
  - Cosy Scarf: the limbs and heads sewn onto each body "sink in no deeper than at their shallowest, through every visit and everyone warm on the hill", held to the audit's 6% pose limit (`games/cosy-scarf/limbs.test.ts`). Each animal's feet and body "never sink into the snow or the blanket through a whole visit" (`games/cosy-scarf/ground.test.ts`).
- Drive the same events the controller fires. A sweep that calls an animation directly can pass while the game's arrival or cue path clips.
- Test that a rise is smooth, not only clear. Light Garden's fly-home test fails when the height's frame-to-frame change of course (its second difference) passes 0.3 cm: 4.64 cm before the look-ahead, 0.79 cm on the autofix, 0.02 cm with it.
- Compare a test's depths with the audit's in the same frame. The audit measures pose depth in world space, so a parent's scale changes it. In Cosy Scarf's pass (PR #28), the cold bear's body squashes in y and its head is the body's child: the audit measured body × head at 6.26% and a sweep in the body's own frame got 7.1% for the same poses. Neither is wrong, but a threshold taken in one frame does not carry over to the other. A test meant to agree with the audit applies the same world transform before comparing with its 6%. A test kept in the parent's frame, as Cosy Scarf's is, will not read the audit's numbers.
- Keep deforms that matter for contact on the CPU (morph targets, skinning, or TypeScript the view also uses), or mirror them in TypeScript and say so in a comment on both sides.
- When a deform stays in the shader unmirrored, give its allow or ignore rule a reason that names the shader, and list it under what is still weak, so nobody reads the clean result as covering it. `report.md` counts the meshes with custom vertex shaders; compare that count with what the config accounts for.
- Build bases with cross products in right-handed order, and assert the quaternion is unit length in a test.
- End a scene's constructor with its first update, and test that a new scene is already where that update leaves it.
- Revert each fix once to see its test fail, as the Hillside Spring pass did for every one of its fixes.

## Related Issues

- The game passes: PR #19 Shadow Lantern, PR #20 Frog Choir, PR #22 Moon Phases, PR #24 Felt Meadow, PR #26 Light Garden, PR #27 Hillside Spring, PR #28 Cosy Scarf, PR #29 Bedtime Forest, PR #30 Turning Tower, and Kite Tower's and Critter Clay's, merged from bundles as "Merge cursor/kite-tower-intersections-bundle" and "Merge cursor/critter-clay-intersections-bundle". The audit: PR #16, and tool v4 (PR #23) for the first-frame wait.
- Pending pass: Pebble Table.
- [Give every character its own motion personality](../design-patterns/motion-personality-per-character.md): each extra variant or delight is another set of poses to sweep here.
- [Pieces collide as drawn and rest on what is drawn](pieces-collide-as-drawn-and-rest-on-what-is-drawn.md) covers physics colliders, rest heights and spawn footprints taken from the drawn geometry.
- [Coplanar faces and flat overlays z-fight](z-fighting-from-coplanar-faces-decals-and-flat-overlays.md) covers the flat pieces that dip or settle onto a surface (Frog Choir's struck pad, blob shadows over moving pads).
