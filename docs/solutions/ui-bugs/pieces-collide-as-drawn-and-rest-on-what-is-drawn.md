---
title: Pieces sink into, float over or pass through each other until the collider and the mesh share one set of dimensions, rest heights come from the drawn geometry, footprints fit the drawn body, and soft contact is bounded by a test
date: 2026-09-24
last_updated: 2026-09-25
category: ui-bugs
module: physics
problem_type: ui_bug
component: development_workflow
severity: medium
related_components:
  - testing_framework
applies_when:
  - Giving a jam game piece a physics body (Rapier, cannon-es, matter-js) or a hand-written collider, or changing a piece's drawn shape
  - Placing a piece at rest, or working out where something lands, stands or sits
  - Spacing characters, spawning pieces, or carrying, dragging or flying a piece over others, so nothing starts, walks or rides inside another
  - The intersection audit or a test finds a piece sunk into what it rests on, or a landing that dips in
  - Colliders fitted to the drawing make frames slow, because bodies have dozens of shapes or thin flat surfaces are boxes, prisms or discs
symptoms:
  - Kite Tower's blocks went through Pip's body, head, face and arms as they were set down, fell or toppled (27 findings), and through each other (3)
  - A Pebble Table shell collided as one middle ball and eight small ones, leaving its drawn rim up to 0.36 cm outside its collider, so an acorn pushed against it sank in, and in CI a shell poured from its jar landed 28% into a stone
  - With every Pebble Table collider traced from its drawing (shells 33 balls, sticks 47), the Honest Scale's worst second fell to 5-10 fps at Chrome 6x CPU throttle on cannon-es, and the first Rapier port, still with traced balls (shells 33, sticks 32), cost 1.62 ms a frame against cannon best's 0.55
  - Bad Neighbours' thrown props bounced with their centre 2 px above the deck, so their painted outlines dipped into the slab, and after a second bounce fell through it (19 px)
  - Bedtime Forest kept a 33-unit fox apart from the others with a 10-unit circle, and the owl stood inside the fox's head and chest (22%)
root_cause: logic_error
resolution_type: code_fix
tags: [physics, colliders, rapier, cannon-es, matter-js, resting-placement, footprints, intersection-audit]
---

# Pieces sink into, float over or pass through each other until the collider and the mesh share one set of dimensions, rest heights come from the drawn geometry, footprints fit the drawn body, and soft contact is bounded by a test

## Problem

In a game with physics or hand-written collision, two shapes describe every piece: the one the child sees and the one the game moves. When they differ, the child sees the difference. A piece floats over what holds it up, sinks into it, or passes through a neighbour the game thinks it missed. The intersection passes found this in every game with falling pieces, and in the games that space or place things by hand. They used the audit from PR #16, or the game's own test where the audit cannot read the game. The fixes all came back to one rule: pieces collide as drawn and rest on what is drawn.

Following that rule literally has a cost. A collider traced from the drawing out of many small shapes multiplies the contact tests the engine runs, and a thin flat surface built as a solid is one of the dearest things to touch. Pebble Table's fitted colliders passed the audit and made its busiest screen stutter. The fix keeps the rule and changes the shapes: planes or flat pieces for thin flat surfaces, and a few cheap shapes that hold every drawn point and reach down exactly as far as the drawing does.

## Symptoms

- Kite Tower (merged from the bundle branch `cursor/kite-tower-intersections-bundle`): blocks through Pip's body, head, face and arms as they were set down beside her, fell on her or toppled onto her (27), and blocks through blocks (3).
- Pebble Table (merged as "Merge cursor/pebble-table-rapier-cceb", with the final bundle's colliders): a shell's drawn rim, back and belly lay up to 0.36 cm outside its collider, so an acorn pushed against it, or a shell tipped onto a stick, sank in. In CI a shell poured from its jar landed 28% into a stone, because at over a metre a second a part moves a centimetre per physics step and was inside the stone before any contact was made.
- Pebble Table, once every collider matched its drawing on cannon-es: the Honest Scale (a balance scale with jars of loose parts) fell from 60 fps to a worst second of 5 to 10 at Chrome 6× CPU throttle, and averaged 12 to 16 fps at 20× against `main`'s 36. Chrome profiles of the long frames were cannon's convex-against-convex separating-axis tests.
- Bad Neighbours (PR #21, canvas 2D, checked by its own vitest): scaffold ties flung braced buildings through each other and the slab (worst 41.1 px, lasting up to 39.8 s). Thrown props bounced with their centre 2 px above the deck whatever their turn, so their painted outlines dipped into the slab.
- Bedtime Forest (PR #29): animals were kept apart by a circle, and only while idle or walking. A long fox was a 10-unit circle, and a bear mid-trick made no room at all.
- Turning Tower (PR #30): a segment landing on its support dipped into it, and the wanderer riding it sank too.

## What Didn't Work

- **A collider sized on its own.** Pebble Table's shell collided as a middle ball and eight small balls three quarters of the way out. No number tied them to the drawn rim, so the rim stuck out by up to 0.36 cm.
- **Tracing the drawing with many small shapes.** Pebble Table's final bundle fitted a shell with 33 balls (a middle ball and rings of 6, 10 and 16), a stick with 47, acorns, stones and the boulder with prisms around their outlines, the 1.2 mm rug with a 16-sided prism, each pan floor with a 12-sided disc and the table with a slab box. Every drawn point was inside, and the Honest Scale stuttered. In cannon-es a slab box, a 16-sided prism or a 12-sided disc cost 7 to 23 microseconds a contact test, and cannon tries every shape of one body against every shape of the other: 47 × 47 = 2209 pairs for two sticks, unless the game culls them. Moving to Rapier did not fix it on its own. The first port, still with traced balls (shells 33, sticks 32), cost 1.62 ms a frame on the seeded busy Honest Scale in Node, against cannon best's 0.55 ms. A cost-only experiment that kept every fourth stick ball (8) and 17 of the shell's balls took the busy scale from 0.52 to 0.33 ms a frame (Rapier's step 0.275 to 0.16 ms) and Chrome 20× from 21 to 25.5 fps. The colliders were the lever, not the engine.
- **A hull sampled without stretching the piece round first.** Sampled as drawn, a flat shell's hull corners all crowded its rim and left its belly and back to long flat faces inside the drawing. A shell resting on a stone had its drawn underside 0.185 cm inside the stone.
- **One hull for a long, lumpy rod.** A single hull around a 14.5 cm stick bridged the bumps between its corners. A stick's drawn lowest point sat 0.157 cm under the pan floor it lay on.
- **Deep overlaps between fan pieces.** As octagonal prisms split into pieces, two acorns spawned inside each other were still 0.36 cm inside each other after 4 s: the pieces' internal faces confuse which way to push them apart. As one hull each, they separate.
- **Chords under a curve.** Kite Tower's arch rim is rounded in 36 steps on screen. Straight parts from corner to corner would sit inside that curve, "and a block resting on the rim would sink into the wood by their sag" (`games/kite-tower/pieces.ts`).
- **A circle for a long body.** Bedtime Forest's 10-unit circle for a 33-unit fox let the owl stand in the fox's head. A circle fits only a round animal.
- **A lift from the centre.** Bad Neighbours' props bounced with their centre 2 px above the deck whatever their turn. Their painted outlines reach further down than that, so they dipped a few pixels into the slab.
- **Stiff ties close together.** Bad Neighbours' scaffold was two zero-length ties 10 px either side of where two buildings met, at stiffness 0.75. matter-js turns a tie's pull into spin by its lever from each centre. "Two ties close together work like a hinge", and each pass overcorrected by more than the last, until a braced pair was thrown through its neighbour or into the slab (PR #21).
- **Reading a physics engine's contacts after the step.** The contacts cannon-es holds are the ones it found before the step moved the bodies, so a check that reads them afterwards measures where the bodies were. Pebble Table on cannon found fresh contacts after the step, since "the world's own are from before it" (its commit "a part landing fast on a stone meets it instead of sinking in"). Rapier has the same trap in another form: `contactPairsWith` lists only the pairs found in the last step, so a query right after placing a body by hand needs its own search. Pebble Table's `TablePhysics.sunk` propagates the moved positions to the colliders first and asks each nearby shape pair for a fresh contact (the [Rapier doc](../tooling-decisions/use-rapier-as-the-default-physics-engine-for-jam-3d-games.md) has the details).

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
- Pebble Table's `games/pebble-table/partShape.ts` draws the acorns, shells, sticks, boulder, jars and nest from the vertices it holds, "and the colliders they rest and stack on are fitted around the same vertices, so what is drawn is what collides". `partCollider` builds each part's hulls (`hullOf`), capsules (`rodCapsules`) and balls from those vertices.
- Shadow Lantern's stands have one set of dimensions for the view and the controller (the z-fighting doc).

In cannon-es, a `Box` takes half extents, not full sizes (checked in cannon-es 0.20.0). Passing full sizes makes a collider twice as big, and the piece floats. Rapier's `ColliderDesc.cuboid` also takes half extents: Pebble Table's table passes half its width, slab and depth.

**Fit the collider just outside the drawn surface, never inside.** A hair of air reads as resting, and any overlap reads as sinking.

- Cut a curve along lines tangent to it, not chords, as Kite Tower's arch rim is. The tangent at the top is flat, so a plank laid across still rests on the crown.
- Size a faceted collider so its flat sides clear the round drawing. Kite Tower's doll collider rings her head, hair and a thin skin in an octagon (`games/kite-tower/physics.ts`):

  ```ts
  const HEAD_SKIN = 0.04
  const HEAD_OCTAGON = (HEAD_R + HAIR + HEAD_SKIN) / Math.cos(Math.PI / 8)
  ```

  A block falling onto her "moves up to its speed times a step before the contact holds it, so it stops here, a hair out from her paint, rather than dipping into her head".
- A chain of balls fitted to the drawn surface nearest each one also holds a rounded piece, and was Pebble Table's first fix for its shell (33 balls, every drawn point within 0.12 cm). It is the expensive option: see the next section before choosing it. Balls spaced apart leave valleys between them, which a sharp edge can settle into, so a ball chain has to be close-spaced, which makes it dearer still.
- cannon-es collides a `Trimesh` only with a `Sphere` or a `Plane` (checked in 0.20.0). A box or convex shape passes straight through a trimesh, so build solids from convex parts.

**Match the drawn shape with a few cheap shapes.** Collide as drawn, but with as few shapes as hold the drawing. Pebble Table's colliders after the Rapier port (`partCollider` in `partShape.ts`, `prismPieces` in `physics3d.ts`):

- **Thin flat surfaces are planes (on cannon-es) or prisms split into quad-faced pieces (on Rapier), never many-sided solids in one piece.** On cannon-es the table and shelf, the 1.2 mm rug and each pan's floor became planes, each holding only the bodies over it (the table's while a body's middle is over it, a pan floor's for what lies in that pan). On Rapier the table is one cuboid, and the rug and the round floors (plates, pan floors, bowl floor, nest bed) are flat prisms split by `prismPieces` into pieces whose faces have at most four corners, because Rapier bears on a face by at most four of its corners. Stones stay prisms around the drawn outline in the same pieces, and the boulder a 12-sided prism in pieces.
- **A rounded piece is one hull, sampled after stretching it round.** `hullOf` takes the drawn point reaching farthest along each of `HULL_DIRECTIONS` (96) directions spread over the sphere, plus the six axis extremes, after dividing each axis by the piece's half-extent so it is as wide as it is tall and deep. The stretch gives a flat shell corners on its belly and back, not only its rim. The six extremes put a corner on the drawn lowest point, so the hull lies exactly as low as the drawing. A shell is one hull; an acorn is one hull around its nut and cap, plus one small ball for the stem where it stands above the cap.
- **A rod is a chain of capsules, each as thick as the rod reaches in its stretch.** `rodCapsules` cuts the rod's axis into `BARK_CAPSULES` (6) stretches along the bark and `TWIG_CAPSULES` (2) along the twig, and gives each capsule the widest drawn radius in its stretch, "so no lump stands outside it". Neighbours overlap where they meet, and the end capsules' round caps end where the rod's tips end, so the tips' taper lies inside a hemisphere. A check during the port found every drawn stick vertex inside the capsules (worst outside 0.000 cm).
- **Work out which shapes might touch in plain code before asking the engine.** Each `Shape` on `TableBody.shapes` carries a sphere (`center`, `r`) that holds it. `sunk`, which draws a part lifted out of whatever it sank into, tries two shapes only when their spheres meet (`nearShapes`, `placedShapes`), instead of every collider pair (32 × 32 contact queries for two sticks before). Its cost fell from 0.53 to about 0.08 ms a frame. Kite Tower's prism hulls likewise test only their in-plane side normals, and a test pins that.

The result on Rapier: the seeded busy Honest Scale in Node went to 0.37 ms a frame (cannon best 0.55, the first port 1.62). Solver contacts per frame fell from 365 to 197 on average and from 545 to 324 at most, and awake bodies from 14.9 to 11.2. On the fair probe the Honest Scale held 59.9 fps at Chrome 6× with a worst second of 56 in three runs, and 29.6 and 34.7 fps at 20× (`main` 32.8 and 40.1). The intersection audit stayed clean (0 open, 0 allowed, 2 hidden; 205 samples, 85 pieces), identical in three loaded runs and on CI.

**Take rest heights from the drawn geometry's lowest point, at the piece's current turn.** Kite Tower's view and tests stand a piece on the lowest point of its `outline`. Frog Choir's `seat` raises a frog until its belly rests on its pad, and `games/frog-choir/bodies.test.ts` pins it to the posed skin's bounding box (`new THREE.Box3().setFromObject(skinOf(i), true)`, where `true` reads every vertex as posed). Bad Neighbours' props now land "on the part of its painted outline that is over the deck" at any turn: a prop over the edge tips off the corner, and one falling beside the slab is held off its side. Pebble Table's rug, plates, bowl and pans are "solid at the heights they are drawn" (`physics3d.ts`), a stone's collider runs "from its drawn bottom to its drawn top" (`stoneHullPoints`), and `partRest` and `partHeight` in `partShape.ts` take a part's rest height from its hulls, capsules and balls alike. Because a hull's lowest corner is the drawn lowest point, a cheaper collider does not change where a part rests. Felt Meadow's seeds sit in the posed pouch's mouth (the animation-clipping doc).

**Space and spawn with footprints fitted to the drawn body.** Bedtime Forest gives each animal a `footprint` in `games/bedtime-forest/layout.ts`: a capsule along its facing, from `back` to `front`, `reach` out from that spine and `top` high. `games/bedtime-forest/view/animals.test.ts` holds every scaled fill vertex inside it. `separate()` in `games/bedtime-forest/brain.ts` keeps footprints 0.6 units apart for everyone on their feet, and `pathAhead` clears where a fast passer will be after the longest frame the game steps. Kite Tower gives Pip a place to stand only where there is room for her whole outline (`games/kite-tower/climb.test.ts`). Bad Neighbours' test checks the spawn point against everything already on the street, and in every scenario it stayed at least 123 px clear.

**A carried piece is measured at its drawn size and rides over what is below.** Kite Tower measures a held piece at its drawn size, and "a piece carried over one waiting in the air to fall rides on top of it, never inside it" (`games/kite-tower/controller.test.ts`). Bedtime Forest's carried animal rises over anyone in its way (`overHeads`, feet `HEADROOM` over their `top`), and passes under one already flying overhead. Light Garden lifts a carried piece over what ranks below it (`pieceRank` in `games/light-garden/controller.ts`). The animation-clipping doc covers how to lift early and smoothly.

**Bound soft contact with a test, and allow only that.** cannon-es contacts are soft constraints (default stiffness 1e7, relaxation 3), so a landing piece dips in for a step before it is pushed back out. Name that dip and cap it. Rapier has continuous collision and leaves little resting overlap (Pebble Table allows 0.005 cm); the [Rapier doc](../tooling-decisions/use-rapier-as-the-default-physics-engine-for-jam-3d-games.md) covers that setup, and a landing test is still worth keeping.

- Kite Tower's `games/kite-tower/physics.test.ts` drops planks, cubes and half-moons onto the other kinds in 192 cases of position, height and turn, and measures against the drawn outlines. Rest stays under 0.02, the deepest landing under 0.16, and no landing stays more than 0.03 in for as long as 0.15 s. Its audit config allows a landing dip a little above that bound, and nothing else between pieces:

  ```ts
  { a: '^piece-', b: '^piece-', kind: 'penetration', upTo: 0.2,
    reason: "a block landing on another dips in for a frame or two (one physics step's travel at its landing speed) before the contact pushes it back out; ..." }
  ```

- In cannon-es a ball whose centre gets inside a convex shape stays in. So Pebble Table, while it ran on cannon, cut the step into up to six pieces while a fast shell or stick was within a step's travel of a stone or part. Its test dropped each kind fast onto a stone: shells and sticks sank at most 0.14 cm, against 0.33 and 0.58 cm without the finer steps. On Rapier, continuous collision with a look-ahead replaced the cut steps, and the same test ("draws a part landing fast on a stone out of it, and never lets a shell or stick sink into one" in `games/pebble-table/intersections.test.ts`) drops each kind at 130 cm/s: a hull or capsule collider sinks under 0.2 cm, and every drawn part, once `sunk` lifts it, under 0.05 cm.
- In matter-js, Bad Neighbours spaced its ties a cell apart and softened each by its lever (`games/bad-neighbours/model.ts`), so one pass corrects no more than the stretch:

  ```ts
  const stiffness = Math.min(0.75, resistance / (resistance + spin) / (STEP / (1000 / 60)))
  ```

- Turning Tower's segments stop at their hard stops. Only an unsupported landing dips, and it carries the wanderer with it.

## Why This Works

- The physics decides where a piece is, and the mesh shows it there. With one source of dimensions, the two cannot drift apart when someone edits one of them.
- Fitting colliders outside the drawing trades a gap too small to see for an overlap a child would see.
- Contact cost grows with the shapes each body has and with how dear each pair is to test. A hull, a capsule or a ball is cheap to meet, and a plane or a flat quad-faced piece holds a resting body with few contacts, so a few of them hold the drawing for a fraction of what dozens of traced shapes cost. Pinning the hull's lowest corner to the drawn lowest point keeps the rest height, so the saving costs nothing the child can see.
- The tests measure the drawn shapes (Kite Tower's drawn overlap, Bad Neighbours' painted outline, Bedtime Forest's fill vertices, Pebble Table's shell surface against its hull), so they fail on what the child would see, not on a collider that might itself be wrong.
- A soft engine will always dip on a fast landing. A test that bounds the dip and an `allow` capped at that bound keep it to a frame or two, and any deeper fault still fails CI.

## Prevention

- Put a piece's dimensions in one module that both the collider and the mesh read, and never type a collider size by hand.
- Write tests against the drawn geometry. Sweep many drops, turns and timings in the unit test, because each physics run lands a little differently. In Pebble Table's pass, one audit run in five caught a real contact the others missed, and the game's own sweep over 22 jar tips found more.
- Test the collider against the drawing it replaces. Pebble Table's "holds a shell's drawn back, belly and rim within a hair of its hull, and lays it down on its lowest point" (`games/pebble-table/intersections.test.ts`) keeps every drawn shell point within 0.08 cm of its hull (tightened from 0.13 for the old balls) and pins the hull's lowest corner to the drawn lowest point (`toBeCloseTo(lowest, 6)`). Its stones test holds every drawn stone inside its collider.
- Count contacts in the frame-budget test, not only time. Pebble Table's busy-scale test in `games/pebble-table/perf.test.ts` counts steps, awake bodies and solver contacts per frame (average under 240, busiest under 400), which are the same on any machine, so a collider that multiplies contacts fails before anyone profiles it.
- Before tracing a piece with many shapes, try one hull (stretched round) for a rounded piece, a capsule chain for a rod, and a plane or flat piece for anything drawn a few millimetres thick.
- Take every rest, stand and spawn height from the drawn geometry's lowest point at the current turn.
- Fit footprints to the drawn body, and test that every drawn vertex lies inside.
- Allow landing dips only up to the bound a physics test proves.

## Related Issues

- [Start a new jam 3D game on Rapier](../tooling-decisions/use-rapier-as-the-default-physics-engine-for-jam-3d-games.md): why Pebble Table moved from cannon-es, Rapier's setup (continuous collision, allowed overlap, sleeping) and the fair probe's full numbers.
- [Animation clipping through bodies and furniture](animation-clipping-limbs-props-and-poses-through-bodies-and-furniture.md): heights measured from meshes, carried things rising over others, and characters following surfaces.
- [Coplanar faces and flat overlays z-fight](z-fighting-from-coplanar-faces-decals-and-flat-overlays.md): flush parts, and Shadow Lantern's one set of dimensions for its stands.
- [Run the intersection audit before showing the owner](../workflow-issues/run-the-intersection-audit-before-showing-the-owner.md): capped allow rules, and why runs differ.
- The game passes: PR #20 Frog Choir, PR #21 Bad Neighbours, PR #24 Felt Meadow, PR #26 Light Garden, PR #29 Bedtime Forest, PR #30 Turning Tower, Kite Tower's, merged from a bundle as "Merge cursor/kite-tower-intersections-bundle", and Pebble Table's, merged with its Rapier port as "Merge cursor/pebble-table-rapier-cceb".
