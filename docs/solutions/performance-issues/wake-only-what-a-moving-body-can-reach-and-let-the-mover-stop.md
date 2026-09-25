---
title: Wake only what a moving body can reach, with a check cheaper than the work it saves, and let the mover stop; Pebble Table's swinging scale kept the whole table awake
date: 2026-09-25
category: performance-issues
module: physics
problem_type: performance_issue
component: tooling
severity: high
related_components:
  - testing_framework
applies_when:
  - A kinematic or scripted body (a beam, a pan, a door, a tray, a walking character) moves among loose bodies that should fall asleep
  - Game code wakes sleeping bodies whenever something moves, or wakes a whole list of bodies at once
  - Awake-body counts stay high, or a rest test fails now and then, while a mover sways or eases toward a target
  - Writing the check that decides what a mover wakes, which runs every frame the mover moves
  - Adding a frame-budget test that counts awake bodies alongside steps and contacts
symptoms:
  - Each frame the Honest Scale's beam tilted, every stone and part on the table was woken and stepped, not only what lay in the pans
  - A seeded busy-scale profile took 1009 ms with 300 ms in cannon's solver, and 598 and 128 ms once tilts woke only what lay in the pans and pairs of two unmoving bodies were skipped
  - A first attempt to wake only what the pans move made the game slower and was dropped
  - "On Rapier, a test tipping all four jars and waiting 10 s failed about 1 in 40 pours: an acorn leaning on a pan nudged by a hair of sway never slept"
  - Bodies that never sleep and a beam that never settles, each keeping the other going
root_cause: scope_issue
resolution_type: code_fix
tags: [physics, sleeping, wake-scope, kinematic-bodies, rapier, cannon-es, pebble-table, frame-budget]
---

# Wake only what a moving body can reach, with a check cheaper than the work it saves, and let the mover stop; Pebble Table's swinging scale kept the whole table awake

## Problem

Pebble Table's Honest Scale is a balance scale whose beam tilts with the weight in its two pans. The pans are kinematic bodies moved to follow the beam: down and up with the tilt, and sideways with a damped sway that dies away over several seconds after the beam stops. Loose stones and parts (acorns, shells, sticks, a boulder) lie in the pans and around the table. Each frame the beam tilted, `setPanDrops` in `games/pebble-table/physics3d.ts` woke every stone and part on the table, so for as long as the beam kept moving, the whole table was awake and stepped. Only the sway after the beam stopped was already scoped, by "Pebble Table: a pan swinging on after the beam stops wakes only what lies in it" (`b486f4d`). Sleeping bodies cost nothing; a game that wakes all of them whenever anything moves never gets that saving.

## Symptoms

- While the beam tilted, every stone and part on the table was woken, including ones lying nowhere near the scale.
- The seeded busy-scale profile took 1009 ms, with cannon's solver at 300 ms. The commit that scoped the tilt's wake and also stopped looking at pairs of two bodies that cannot move (`cef728a`) took them to 598 and 128 ms, one of the biggest wins of the cannon-es performance rounds.
- A first attempt to scope the wake was slower than waking everything and was dropped (see What Didn't Work).
- After the move to Rapier, "lets every tipped-out part come to rest, so physics goes quiet" in `games/pebble-table/controller.test.ts` (tip all four jars, wait 10 s, expect no part awake) failed about 1 in 40 seeded pours in this session's runs: an acorn leaning on a pan never slept.
- A wake scope that is too wide, or a mover that never stops, shows up as bodies that never sleep and a beam that never settles. In one case a stone slipping under a pan floor flipped its weight on and off, the beam kicked, the sway restarted and moved the pans again. That loop came from a separate sleeping bug, since fixed, but it is what this failure looks like from the outside.

## What Didn't Work

- **Scoping the wake with a check that cost too much.** `games/pebble-table/REFINEMENT.md` records a first attempt in the "Scale cost pass": "Waking only what the pans move, instead of every stone and part at each tilt, made it slower and was dropped." How that attempt decided what to wake is not recorded. Deciding what to wake runs every frame the beam moves, so its cost is paid as often as the waking it is meant to avoid.
- **Scoping the wake and nothing else.** On Rapier, a scoped wake still left what leaned on a pan awake, because the pans themselves never stopped moving (see the third rule below).

## Solution

Three rules, all in `TablePhysics` in `games/pebble-table/physics3d.ts`.

**1. Wake only what lies within the mover's reach.** "Pebble Table: a swinging beam wakes only what lies in or on its pans, not every stone and part on the table every frame it moves, and pairs of two bodies that cannot move are never looked at (busy scale 1009 -> 598 ms, cannon's solver 300 -> 128 ms)" (`cef728a`) stopped a tilt waking the whole table; the same commit also stopped looking at pairs of two bodies that cannot move, so the saving is both changes together. It decided what a pan reaches from the pan's bounds, worked out each frame. A stone in a pan still rides along; a shell across the table stays asleep.

**2. Make the reach check cheaper than the work it saves.** "Pebble Table: a moving beam wakes what lies within its pans' round reach without working out their walls' bounds each frame, ..." (`5ec74b9`) replaced those per-frame bounds of each pan's many wall boxes with a circle and a height per pan, taken from the pan's footprint (`SCALE.pans[side].r`) and where it hangs now. The reach is the footprint's radius plus 1 cm, a body counts if its bounding sphere reaches into that circle, and only if its bottom is below the pan's top (`hung.y + PAN_DEPTH`). Only bodies that are asleep are tested. The current `setPanDrops`:

```ts
setPanDrops(drops: readonly [number, number], sway = 0): void {
  const tilted = Math.abs(drops[0] - this.panDrops[0]) > 0.01 || Math.abs(drops[1] - this.panDrops[1]) > 0.01
  const swung = Math.abs(sway - this.panSway) > 0.01
  if (!tilted && !swung) return
  this.pans.forEach((pan, side) => {
    const at = to3(SCALE.pans[side])
    this.targets.set(pan, { x: at.x + sway, y: PAN_REST_HEIGHT - drops[side] * UNIT, z: at.z })
    const hung = pan.translation()
    const reach = SCALE.pans[side].r * UNIT + 1
    const top = hung.y + PAN_DEPTH
    for (const { body } of this.stones.values()) {
      if (!body.asleep) continue
      const [dx, dz] = [body.position.x - hung.x, body.position.z - hung.z]
      const r = reach + body.boundingRadius
      if (dx * dx + dz * dz <= r * r && body.position.y - body.boundingRadius <= top) body.wakeUp()
    }
  })
  this.panDrops = [drops[0], drops[1]]
  this.panSway = sway
}
```

**3. Let the mover stop.** Two changes from the Rapier port, both needed before the rest test passed reliably:

- The pans move only when the beam's drops or sway change by more than 0.01, "a hundredth of a unit" in the doc comment: "the beam's sway dies away slowly, and pans nudged by a hair for ever after keep what leans on them from ever falling asleep." The early return above is that rule, and it also skips the wake scan on those frames.
- A kinematic body given its next position every step stays awake, and so does what rests on it. The step loop now leaves a body that has reached its target alone (`TablePhysics.step`):

```ts
// One already there (to Rapier's single precision) is left still, so what rests on it can fall asleep.
if (dx * dx + dy * dy + dz * dz > 1e-8) rigid.setNextKinematicTranslation({ x: p.x + dx / left, y: p.y + dy / left, z: p.z + dz / left })
```

A squared distance of 1e-8 is a ten-thousandth of a centimetre, which the comment treats as "there" to Rapier's single precision.

**What still wakes more widely, and why.** Each waking rule in the file matches what its mover can touch:

- A sweeping finger (`setBroom`) still wakes every stone and part. It is dragged anywhere on the table, so it can reach anything.
- Holding (`hold`) or releasing (`release`) a stone wakes only that stone, through the wake flag on its own Rapier calls.
- `wakeAhead` wakes sleeping bodies that a moving body could reach within two steps. That is a Rapier-specific rule (Rapier meets a sleeping body only on the step that wakes it), covered in [Use Rapier as the default physics engine for jam 3D games](../tooling-decisions/use-rapier-as-the-default-physics-engine-for-jam-3d-games.md). It is not about scoping a kinematic mover's wake.

## Why This Works

A physics engine's cost scales with the bodies it steps and the contacts it solves, and a sleeping body is neither. Waking the whole table each frame threw away the savings of every pile that had gone quiet, for as long as the beam swung. Only what lies in or against a pan can be moved by it, so only that needs waking.

The check that decides this runs every frame the mover moves, so it must cost much less than stepping the bodies it keeps asleep. Bounds of many wall boxes per pan, worked out per frame, are the kind of check to avoid. A round reach and a height from data the pan already has (its footprint radius and its current position) is a few multiplications per sleeping body.

A mover that never stops keeps its neighbours awake no matter how tight the scope. A damped sway approaches zero without reaching it, and a kinematic body re-commanded every step counts as moving even when the command is where it already is. Moving only by visible amounts, and not re-commanding a body already at its target, lets the pans come to rest, and then what leans on them can sleep.

## Prevention

- [ ] **Count awake bodies in the frame-budget test.** The seeded busy-scale test in `games/pebble-table/perf.test.ts` ("the Honest Scale at its busiest does a counted amount of physics work a frame") counts, per frame, physics steps, awake bodies and solver contacts, and asserts fewer than 14 awake bodies a frame on average (measured 11.2, 20 at most) and no part awake after the table settles. A count is the same on every machine ([Frame-budget tests that hold on a shared CI runner](../test-failures/frame-budget-tests-that-hold-on-a-shared-ci-runner.md)).
- [ ] **Pin the scope with a near body and a far body.** "lets a pan swinging on after the beam stops wake only what lies in or against it" in `games/pebble-table/physics3d.test.ts` swings the pans for 2 s with the beam level (so it pins the sway's scope; the tilt's is pinned by the busy-scale counts) and counts steps awake: the stone in the pan must be awake for more than 200 steps and a shell lying away from the scale for 0.
- [ ] **Pin that the mover lets things sleep.** A rest test that waits after the mover's motion has died away ("lets every tipped-out part come to rest, so physics goes quiet", four trials) catches a mover that twitches forever. Run it in a loop over seeded pours; it failed only about 1 in 40 before the pans stopped moving by a hair.
- [ ] **Time the scope check itself.** If scoping the wake makes a profile slower, the check is too expensive. Use a shape the mover already knows (a radius and a height, a bounding sphere) rather than recomputing its colliders' bounds.
- [ ] **Give every mover a dead band and a "there already" test.** Do not re-command a kinematic body whose target has not moved by a visible amount, or that is already at its target.

The same rules apply to any mover in a jam game: a character walking through a pile of blocks, a door swinging past toys on the floor, a tray tipping what sits on it. Wake what lies within the mover's reach, with a check cheaper than the stepping it saves, and let the mover come to a full stop so what leans on it can sleep.

## Related Issues

- [Measure on the target device and ship adaptive quality](measure-on-the-target-device-and-ship-adaptive-quality.md): "Resting bodies must fall asleep" and the checklist item "Check that piles go to sleep". This doc is the other half: once they sleep, wake only what a mover can touch, and let the mover stop.
- [Use Rapier as the default physics engine for jam 3D games](../tooling-decisions/use-rapier-as-the-default-physics-engine-for-jam-3d-games.md): `wakeAhead`, never putting a body to sleep by hand, and the cannon-es rounds this win came from.
- [Frame-budget tests that hold on a shared CI runner](../test-failures/frame-budget-tests-that-hold-on-a-shared-ci-runner.md): why the busy-scale test counts awake bodies instead of timing frames.
- `games/pebble-table/REFINEMENT.md`, "Scale cost pass": the dropped first attempt.
