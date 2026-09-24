---
title: Pieces sink into, float over or pass through each other until the collider and the mesh share one set of dimensions, rest heights come from the drawn geometry, footprints fit the drawn body, and soft contact is bounded by a test
date: 2026-09-24
category: ui-bugs
module: physics
problem_type: ui_bug
component: development_workflow
severity: medium
related_components:
  - testing_framework
applies_when:
  - Giving a jam game piece a physics body (cannon-es, matter-js) or a hand-written collider, or changing a piece's drawn shape
  - Placing a piece at rest, or working out where something lands, stands or sits
  - Spacing characters or spawning pieces so they never start or walk inside each other
  - Carrying, dragging or flying a piece over others
  - The intersection audit or a test finds a piece sunk into what it rests on, or a landing that dips in
symptoms:
  - Kite Tower's blocks went through Pip's body, head, face and arms as they were set down, fell or toppled (27 findings), and through each other (3)
  - A Pebble Table shell collided as one middle ball and eight small ones, leaving its drawn rim up to 0.36 cm outside its collider, so an acorn pushed against it sank in
  - Pebble Table's CI audit caught a shell poured from its jar 28% into the stone it landed on
  - Bad Neighbours' thrown props bounced with their centre 2 px above the deck, so their painted outlines dipped into the slab, and after a second bounce fell through it (19 px)
  - Bedtime Forest kept a 33-unit fox apart from the others with a 10-unit circle, and the owl stood inside the fox's head and chest (22%)
root_cause: logic_error
resolution_type: code_fix
tags: [physics, colliders, cannon-es, matter-js, resting-placement, footprints, intersection-audit, kids-games]
---

# Pieces sink into, float over or pass through each other until the collider and the mesh share one set of dimensions, rest heights come from the drawn geometry, footprints fit the drawn body, and soft contact is bounded by a test

## Problem

In a game with physics or hand-written collision, two shapes describe every piece: the one the child sees and the one the game moves. When they differ, the child sees the difference. A piece floats over what holds it up, sinks into it, or passes through a neighbour the game thinks it missed. The intersection passes found this in every game with falling pieces, and in the games that space or place things by hand. They used the audit from PR #16, or the game's own test where the audit cannot read the game. The fixes all came back to one rule: pieces collide as drawn and rest on what is drawn.

## Symptoms

- Kite Tower (merged from the bundle branch `cursor/kite-tower-intersections-bundle`): blocks through Pip's body, head, face and arms as they were set down beside her, fell on her or toppled onto her (27), and blocks through blocks (3).
- Pebble Table (pending, branch `cursor/pebble-table-intersections-2526`): a shell's drawn rim, back and belly lay up to 0.36 cm outside its collider, so an acorn pushed against it, or a shell tipped onto a stick, sank in. In CI a shell poured from its jar landed 28% into a stone, because at over a metre a second a part moves a centimetre per physics step and was inside the stone before any contact was made.
- Bad Neighbours (PR #21, canvas 2D, checked by its own vitest): scaffold ties flung braced buildings through each other and the slab (worst 41.1 px, lasting up to 39.8 s). Thrown props bounced with their centre 2 px above the deck whatever their turn, so their painted outlines dipped into the slab.
- Bedtime Forest (PR #29): animals were kept apart by a circle, and only while idle or walking. A long fox was a 10-unit circle, and a bear mid-trick made no room at all.
- Turning Tower (PR #30): a segment landing on its support dipped into it, and the wanderer riding it sank too.

## What Didn't Work

- **A collider sized on its own.** Pebble Table's shell collided as a middle ball and eight small balls three quarters of the way out. No number tied them to the drawn rim, so the rim stuck out by up to 0.36 cm.
- **Chords under a curve.** Kite Tower's arch rim is rounded in 36 steps on screen. Straight parts from corner to corner would sit inside that curve, "and a block resting on the rim would sink into the wood by their sag" (`games/kite-tower/pieces.ts`).
- **A circle for a long body.** Bedtime Forest's 10-unit circle for a 33-unit fox let the owl stand in the fox's head. A circle fits only a round animal.
- **A lift from the centre.** Bad Neighbours' props bounced with their centre 2 px above the deck whatever their turn. Their painted outlines reach further down than that, so they dipped a few pixels into the slab.
- **Stiff ties close together.** Bad Neighbours' scaffold was two zero-length ties 10 px either side of where two buildings met, at stiffness 0.75. matter-js turns a tie's pull into spin by its lever from each centre. "Two ties close together work like a hinge", and each pass overcorrected by more than the last, until a braced pair was thrown through its neighbour or into the slab (PR #21).
- **Reading a physics engine's contacts after the step.** The contacts cannon-es holds are the ones it found before the step moved the bodies, so a check that reads them afterwards measures where the bodies were. Pebble Table's branch finds fresh contacts after the step, since "the world's own are from before it" (its commit "a part landing fast on a stone meets it instead of sinking in").

## Solution

**One set of dimensions builds the collider and the mesh.** Kite Tower keeps both in one type, in one frame (`games/kite-tower/pieces.ts`):

```ts
export type PieceShape = {
  kind: PieceKind
  /** Convex parts, counter-clockwise, centred on the centre of mass. */
  parts: Vec2[][]
  /** The whole silhouette for the mesh (may be concave), same frame as `parts`. */
  outline: Vec2[]
  depth: number
  ...
}
```

`games/kite-tower/physics.ts` extrudes `parts` into cannon-es prisms, and `games/kite-tower/view/pieces.tsx` builds the wood slab from `outline`. Changing a piece changes both. The other games do the same thing their own way:

- Turning Tower's `games/turning-tower/anatomy.ts` holds "the characters' proportions, shared by the rigs that draw them and the controller that keeps them clear of the lattice".
- Bad Neighbours' `PROP_OUTLINES` holds the rectangles the renderer paints, and a test says so by name: "the outline the deck holds a prop up by is the outline the renderer paints" (`games/bad-neighbours/intersections.test.ts`). Other tests there hold every sprite and the slab's paint to their colliders.
- Pebble Table's pending branch builds parts, jars and the nest "from one set of dimensions" (`partShape.ts` on that branch), "so each part's collider is fitted to its drawn vertices".
- Shadow Lantern's stands have one set of dimensions for the view and the controller (the z-fighting doc).

In cannon-es, a `Box` takes half extents, not full sizes (checked in cannon-es 0.20.0). Passing full sizes makes a collider twice as big, and the piece floats.

**Fit the collider just outside the drawn surface, never inside.** A hair of air reads as resting, and any overlap reads as sinking.

- Cut a curve along lines tangent to it, not chords, as Kite Tower's arch rim is. The tangent at the top is flat, so a plank laid across still rests on the crown.
- Size a faceted collider so its flat sides clear the round drawing. Kite Tower's doll collider rings her head, hair and a thin skin in an octagon (`games/kite-tower/physics.ts`):

  ```ts
  const HEAD_SKIN = 0.04
  const HEAD_OCTAGON = (HEAD_R + HAIR + HEAD_SKIN) / Math.cos(Math.PI / 8)
  ```

  A block falling onto her "moves up to its speed times a step before the contact holds it, so it stops here, a hair out from her paint, rather than dipping into her head".
- Fit each ball of a ball chain to the drawn surface nearest it. Pebble Table's shell now has its balls halfway up its middle and in three rings out to its rim, "so every drawn point is within 0.12 cm of them", with none reaching below its lowest point. Balls spaced apart leave valleys between them, which a sharp edge can settle into, so space them closely.
- cannon-es collides a `Trimesh` only with a `Sphere` or a `Plane` (checked in 0.20.0). A box or convex shape passes straight through a trimesh, so build solids from convex parts.

**Take rest heights from the drawn geometry's lowest point, at the piece's current turn.** Kite Tower's view and tests stand a piece on the lowest point of its `outline`. Frog Choir's `seat` raises a frog until its belly rests on its pad, measured from the rigs posed by their animators, and `games/frog-choir/bodies.test.ts` checks every rig still fits. Bad Neighbours' props now land "on the part of its painted outline that is over the deck" at any turn: a prop over the edge tips off the corner, and one falling beside the slab is held off its side. Pebble Table's branch makes the rug, plates, bowl and pan floors "solid at the heights they are drawn", and every stone "rests at its drawn bottom". Felt Meadow's seeds sit in the posed pouch's mouth (the animation-clipping doc).

**Space and spawn with footprints fitted to the drawn body.** Bedtime Forest gives each animal a `footprint` in `games/bedtime-forest/layout.ts`: a capsule along its facing, from `back` to `front`, `reach` out from that spine and `top` high. `games/bedtime-forest/view/animals.test.ts` holds every scaled fill vertex inside it. `separate()` in `games/bedtime-forest/brain.ts` keeps footprints 0.6 units apart for everyone on their feet, and `pathAhead` clears where a fast passer will be after the longest frame the game steps. Kite Tower gives Pip a place to stand only where there is room for her whole outline (`games/kite-tower/climb.test.ts`). Bad Neighbours' test checks the spawn point against everything already on the street, and in every scenario it stayed at least 123 px clear.

**A carried piece is measured at its drawn size and rides over what is below.** Kite Tower measures a held piece at its drawn size, and "a piece carried over one waiting in the air to fall rides on top of it, never inside it" (`games/kite-tower/controller.test.ts`). Bedtime Forest's carried animal rises over anyone in its way (`overHeads`, feet `HEADROOM` over their `top`), and passes under one already flying overhead. Light Garden lifts a carried piece over what ranks below it (`pieceRank` in `games/light-garden/controller.ts`). The animation-clipping doc covers how to lift early and smoothly.

**Bound soft contact with a test, and allow only that.** cannon-es contacts are soft constraints (default stiffness 1e7, relaxation 3), so a landing piece dips in for a step before it is pushed back out. Name that dip and cap it:

- Kite Tower's `games/kite-tower/physics.test.ts` drops planks, cubes and half-moons onto the other kinds in 192 cases of position, height and turn, and measures against the drawn outlines. Rest stays under 0.02, the deepest landing under 0.16, and no landing stays more than 0.03 in for as long as 0.15 s. Its audit config allows a landing dip a little above that bound, and nothing else between pieces:

  ```ts
  { a: '^piece-', b: '^piece-', kind: 'penetration', upTo: 0.2,
    reason: "a block landing on another dips in for a frame or two (one physics step's travel at its landing speed) before the contact pushes it back out; ..." }
  ```

- A ball whose centre gets inside a convex shape stays in. So Pebble Table's branch cuts the step into up to six pieces while a fast shell or stick is within a step's travel of a stone or part. Its test drops each kind fast onto a stone: shells and sticks sink at most 0.14 cm, against 0.33 and 0.58 cm without the finer steps. A prism part is drawn out of what it sank into, along fresh contacts.
- In matter-js, Bad Neighbours spaced its ties a cell apart and softened each by its lever (`games/bad-neighbours/model.ts`), so one pass corrects no more than the stretch:

  ```ts
  const stiffness = Math.min(0.75, resistance / (resistance + spin) / (STEP / (1000 / 60)))
  ```

- Turning Tower's segments stop at their hard stops. Only an unsupported landing dips, and it carries the wanderer with it.

**Keep exact colliders cheap.** Colliders built as drawn have more shapes. cannon-es tries every shape of one body against every shape of the other, which is 47 × 47 for two of Pebble Table's sticks. Its branch hands cannon only the shapes of a pair that reach each other, and a four-jar pour lands "bit for bit where trying every shape does". Kite Tower's prism hulls test only their in-plane side normals, and a test pins that.

## Why This Works

- The physics decides where a piece is, and the mesh shows it there. With one source of dimensions, the two cannot drift apart when someone edits one of them.
- Fitting colliders outside the drawing trades a gap too small to see for an overlap a child would see.
- The tests measure the drawn shapes (Kite Tower's drawn overlap, Bad Neighbours' painted outline, Bedtime Forest's fill vertices), so they fail on what the child would see, not on a collider that might itself be wrong.
- A soft engine will always dip on a fast landing. A test that bounds the dip and an `allow` capped at that bound keep it to a frame or two, and any deeper fault still fails CI.

## Prevention

- Put a piece's dimensions in one module that both the collider and the mesh read, and never type a collider size by hand.
- Write tests against the drawn geometry. Sweep many drops, turns and timings in the unit test, because each physics run lands a little differently. In Pebble Table's pass, one audit run in five caught a real contact the others missed, and the game's own sweep over 22 jar tips found more.
- Take every rest, stand and spawn height from the drawn geometry's lowest point at the current turn.
- Fit footprints to the drawn body, and test that every drawn vertex lies inside.
- Allow landing dips only up to the bound a physics test proves.
- For Pebble Table and Critter Clay, whose passes are still pending, start from these rules.

## Related Issues

- [Animation clipping through bodies and furniture](animation-clipping-limbs-props-and-poses-through-bodies-and-furniture.md): heights measured from meshes, carried things rising over others, and characters following surfaces.
- [Coplanar faces and flat overlays z-fight](z-fighting-from-coplanar-faces-decals-and-flat-overlays.md): flush parts, and Shadow Lantern's one set of dimensions for its stands.
- [Run the intersection audit before showing the owner](../workflow-issues/run-the-intersection-audit-before-showing-the-owner.md): capped allow rules, and why runs differ.
- The game passes: PR #20 Frog Choir, PR #21 Bad Neighbours, PR #24 Felt Meadow, PR #26 Light Garden, PR #29 Bedtime Forest, PR #30 Turning Tower, and Kite Tower's, merged from a bundle as "Merge cursor/kite-tower-intersections-bundle". Pebble Table's pass is pending on `cursor/pebble-table-intersections-2526`.
