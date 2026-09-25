---
title: Start a new jam 3D game on Rapier, and move a cannon-es game to Rapier once its long frames are collision tests and its landings need hand-made continuous collision
date: 2026-09-25
category: tooling-decisions
module: physics
problem_type: tooling_decision
component: tooling
severity: high
related_components:
  - development_workflow
  - testing_framework
applies_when:
  - Choosing a physics engine for a new 3D jam game, or adding rigid-body physics to an existing one
  - A cannon-es game stutters when many detailed (fitted, multi-shape) colliders touch, or profiles show findSeparatingAxis and clipFaceAgainstHull dominating long frames
  - Fast pieces land inside what they hit, or the game has to cut steps and clamp approaches because cannon-es has no continuous collision
  - Porting a game from cannon-es to Rapier, or writing colliders, sleeping or contact queries against Rapier
  - A game awaits WebAssembly (Rapier init) before making its renderer and must pass the intersection audit and the egress check
symptoms:
  - Pebble Table's Honest Scale fell to 5-10 fps worst second at Chrome 6x CPU throttle after every collider was fitted to its drawing on cannon-es 0.20
  - Rounds of cannon-es optimisation reached about 59 fps average at 6x, but the worst second still fell as low as 19 to 53 (target never under 45) and 20x averaged 14 to 29 fps (target at least 30)
  - On Rapier, stacked eight-sided stones rocked on one contact point, hand-slept bodies fell through the table, and landings on sleeping bodies sank 0.45-0.58 cm
tags: [rapier, cannon-es, physics-engine, webassembly, continuous-collision, determinism, pebble-table, react-three-fiber]
---

# Start a new jam 3D game on Rapier, and move a cannon-es game to Rapier once its long frames are collision tests and its landings need hand-made continuous collision

## Context

Pebble Table (`games/pebble-table/`) is a claymation 3D math toy for 4-year-olds, built with react-three-fiber. Its physics wrapper, `games/pebble-table/physics3d.ts`, ran on cannon-es 0.20. The Pebble Table "final" bundle made every collider match its drawing so the intersection audit would pass: stones as octagonal prisms around the drawn outline, shells as 33 fitted balls, sticks as 47 balls, acorns and the boulder as prisms. The Honest Scale, a balance scale with jars of loose acorns, shells, sticks and a boulder, then regressed badly against `main`: in Chrome at 6× CPU throttle its worst second fell to 5 to 10 fps, and at 20× it averaged 12 to 16 fps against `main`'s 36.

Rounds of cannon-es optimisation followed on `cursor/pebble-table-final-perf-cceb`, which was never merged on its own: its head `ae6bb75` ("cannon best" below) became the base of the Rapier branch, so its commits reach `main` only through the Rapier merge, which replaced its cannon-es physics. They added planes for thin flat surfaces, woke only what the moving pans reach, capped slow-frame catch-up to a two-step budget, clamped approaches and cut steps so fast stones met each other at their surfaces, precompiled tier shaders, ran `sunk` only for awake parts and gave sticks fewer balls. The Honest Scale reached about 59 fps average at 6×, but its worst second still fell to 36 to 53 in the final comparison below, and as low as 19 in earlier runs (target: never under 45); at 20× it averaged 14 to 29 fps across those runs (target: at least 30). The owner chose Rapier, and the port landed on `main` as "Merge cursor/pebble-table-rapier-cceb" (`ac692f2`).

## Guidance

**Default to Rapier for a new jam 3D game with loose, stacking or fast-moving bodies.** Rapier is on Tada's own tech menu ("matter.js or rapier", `AGENTS.md` "Tech menu"). cannon-es is a jam-only allowance (`AGENTS.md` "Jam stack"), so a cannon-es game has to propose it or be rewritten before it can move to Tada. Rapier is WebAssembly, has continuous collision built in, and steps the same way every time on one machine. cannon-es stays where it works: Kite Tower still uses it.

**Move an existing cannon-es game when these signs appear.** Each one showed up in Pebble Table before the switch:

- Chrome CPU profiles of long frames are dominated by convex-against-convex separating-axis tests (`findSeparatingAxis`, `clipFaceAgainstHull`).
- Fast landings end a step inside what they hit, because cannon-es has no continuous collision, and the game has started cutting steps and clamping approaches itself.
- Landings visibly dip in, because cannon-es contacts are soft constraints.
- Colliders built as drawn have many shapes, and cannon-es tries every shape of one body against every shape of the other (47 × 47 for two of Pebble Table's sticks) unless the game culls the pairs itself.
- Optimisation rounds lift the average but not the worst second. cannon-es is single-threaded JavaScript, so there is no faster build to switch to.

**Set Rapier up this way.**

1. **Packages and egress.** Install `@dimforge/rapier3d-compat` and `@dimforge/rapier3d-simd-compat` (0.20.0, Apache-2.0). The `-compat` builds inline their WebAssembly as base64 in the JavaScript, so nothing is fetched and the egress check passes. Both are listed in `ALLOWED_GAME_PACKAGES` in `scripts/egress-check.ts`: "Rapier, WebAssembly inlined in the package: nothing is fetched".

2. **SIMD build with a plain fallback, behind one ready promise.** `physicsReady()` in `physics3d.ts` validates a tiny module with one SIMD instruction and imports whichever build runs, then awaits `init()`. Later calls return the same promise:

   ```ts
   const SIMD_PROBE = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])

   export function physicsReady(): Promise<void> {
     const simd = typeof WebAssembly === 'object' && WebAssembly.validate(SIMD_PROBE)
     loading ??= (simd ? import('@dimforge/rapier3d-simd-compat') : import('@dimforge/rapier3d-compat')).then(async (module) => {
       const loaded = ((module as { default?: unknown }).default ?? module) as unknown as Rapier
       await loaded.init()
       rapier = loaded
     })
     return loading
   }
   ```

   `TablePhysics`'s constructor calls `engine()`, which throws if `physicsReady()` has not finished, so no code path can build a world before the WebAssembly is ready. Import Rapier's types with `import type` only, so the main chunk never pulls the engine in.

3. **Load it lazily, and preload it on the jam's home in idle time.** The Mount in `games/pebble-table/pebble-table.tsx` awaits `physicsReady()` together with the save (`Promise.all([storage.load(), physicsReady()])`). At module load, the same file asks for the first idle moment (`requestIdleCallback` with `PHYSICS_PRELOAD_MS = 2000` as its timeout, or `setTimeout` where WebKit has no `requestIdleCallback`) and starts loading Rapier then, but only while the child is still choosing: it skips the preload when the hash starts with `#/play/`, so it never costs another game a frame.

4. **A fixed step with the game's own accumulator.** Set `world.timestep = STEP` (`STEP = 1 / 120` in `physics3d.ts`) and call `world.step()` once per whole step from your own accumulator. `TablePhysics.step` keeps the accumulator, caps catch-up at `LONGEST_FRAME`, and lets a frame longer than `SLOW_FRAME` catch up only `SLOW_FRAME_STEPS` steps. The step is the same on every quality tier.

5. **`lengthUnit` for a centimetre world.** Pebble Table's world is in centimetres, so its constructor sets `world.lengthUnit = LENGTH_UNIT` (10). Rapier scales its tolerances and its sleep threshold (0.4 × `lengthUnit` per second, so 4 cm/s here) by it. It also sets `integrationParameters.normalizedAllowedLinearError = ALLOWED_OVERLAP / LENGTH_UNIT`, so at most 0.005 cm of a resting overlap is left, under what the audit or the eye can see.

6. **Full and soft continuous collision on loose bodies.** `TablePhysics.loose` builds every stone and part with `setCcdEnabled(true)` and `setSoftCcdPrediction(lookAhead)`, where `STONE_LOOK_AHEAD` is 1 cm and `PART_LOOK_AHEAD` is 1.5 cm (parts are lighter and poured faster). Full CCD only starts once a body moves more than its own thickness in a step. Soft CCD makes two bodies flung at each other meet at their surfaces instead of a step inside each other. This replaced cannon's cut steps and approach clamps.

7. **Tell the intersection audit the game loads first.** The audit runs on a paused fake clock. A game that awaits WebAssembly before it makes its renderer must set `mountsAfterLoading: true` in `scripts/intersections/games/<key>.ts` (Pebble Table's is in `scripts/intersections/games/pebble-table.ts`). Per `scripts/intersections/types.ts`, the audit then "waits for the renderer in real time, with the page's clock paused".

**Keep colliders few and cheap.** The first port kept the traced ball colliders (33 a shell, 32 a stick) and cost three times cannon's frame. What made it cheap: a shell is one hull and an acorn one hull plus a small stem ball (`hullOf` in `partShape.ts`, the drawn points reaching farthest in 96 directions, plus its six extremes, once the piece is stretched round), a stick is a chain of capsules (`rodCapsules`), stones, floors and discs are flat pieces with faces of at most four corners (`prismPieces`), and `sunk` tries two shapes only if spheres holding them meet. The [colliders doc](../ui-bugs/pieces-collide-as-drawn-and-rest-on-what-is-drawn.md) covers the rules.

**Let Rapier do the sleeping.** Never put a body to sleep by hand, and wake a sleeping body before something reaches it. The gotchas below give the two rules.

**Gotchas from the port.** Each cost debugging time.

- **Faces with at most four corners.** Rapier bears on a flat face by at most four of its corners. An eight-sided stone face stacked on another gave one contact point: stones rocked, and deep overlaps never resolved. `prismPieces` splits a flat many-sided prism into a fan of quads from its first corner. Hulls with triangle faces also work.
- **Never put a body to sleep by hand.** When one body of a touching pile was put to sleep with `rigid.sleep()`, or a woken neighbour kept its island active, Rapier kept moving the sleeping body but stopped meeting what it lay on. Stones fell through the table, floated, or let a landing stick 0.45 cm in. `settleLoose` instead marks a calm body settled (asleep as far as the game is concerned) and holds its velocities at zero each step until Rapier's own sleeping takes it:

  ```ts
  timer.calm = calm ? timer.calm + STEP : 0
  if (timer.calm < LOOSE_CALM_SECONDS) continue
  timer.calm = 0
  body.settled = true
  rigid.setLinvel({ x: 0, y: 0, z: 0 }, false)
  rigid.setAngvel({ x: 0, y: 0, z: 0 }, false)
  ```

  A settled body that comes out of a step faster than calm (`LOOSE_CALM_SPEED`, spin included, or three times that for a body that has been stirring for six seconds) is loose again.
- **Wake ahead of contact.** Rapier meets a sleeping body only on the step that wakes it, not the next, so a stick landing on a sleeping stone fell 0.58 cm in. Before every `world.step`, `TablePhysics.step` calls `wakeAhead`, which wakes every sleeping stone or part a moving body could reach within two steps:

  ```ts
  const reach = mover.boundingRadius + body.boundingRadius + 2 * speed * STEP + WAKE_MARGIN
  if (mover.position.distanceSquared(body.position) <= reach * reach) body.wakeUp()
  ```

- **Move bodies through the API in tests.** `TableBody.position` is a copy that `TableBody.sync` refreshes from Rapier after every step, so writing `position.x` does nothing. Tests and tooling use `place()`, `setVelocity()` and `halt()`, which wake the body and write to the rigid body.
- **Run fresh queries after placing a body by hand.** `contactPairsWith` lists only the pairs found in the last step. `TablePhysics.sunk` calls `world.propagateModifiedBodyPositionsToColliders()` first, picks shape pairs whose bounding spheres meet in plain JavaScript (`nearShapes`), and asks each pair for a fresh contact with `contactCollider`.
- **Ask the solver whether two things touch.** Manifold contact distances can be stale. `noteLeaning` counts a stone as touching a guest only when `manifold.numSolverContacts() > 0`.
- **60 Hz was tried and dropped.** A shell dropped fast onto a stone sank 1.15 cm (the limit is 0.2) at 60 Hz steps. `STEP` stayed a fixed 1/120 s.

## Why This Matters

The fair probe (`npm run perf:pebble-scale`, see [drive a build-comparison probe by layout screen positions](../workflow-issues/drive-a-build-comparison-perf-probe-by-layout-screen-positions-not-object-names.md)) drove every build with the same screen positions from the shared layout and a seeded save, on a Mac mini M4 under Playwright at the automatic quality tier. No iPad was measured. Numbers are average fps with the worst one-second window in brackets. "`main`" is `main` before the Rapier merge: still cannon-es, with the older, simpler colliders that the audit did not pass.

| Honest Scale | cannon original (`506b1c4`) | cannon best (`ae6bb75`) | Rapier | `main` |
| --- | --- | --- | --- | --- |
| Chrome, 6× CPU | 45.8 (10), 50.9 (6) | 59.7 (53), 59.2 (37), 58.1 (36) | 59.9 (56), three runs | 60 (60), 60 (60), 59.9 (57) |
| Chrome 6×, CPU per frame (p50) | not measured | 4.9 to 6.0 ms | 3.3 to 4.5 ms | 5.1 to 8.1 ms |
| Chrome, 20× CPU | 12 to 16 average | 13.9 (4), 19.7 (6) | 29.6 (10), 34.7 (8) | 32.8 (13), 40.1 (20) |
| WebKit, and WebKit at 4× pixels | 60 (60) | 60 (60) | 60 (60) | 60 (60) |
| Node, seeded busy scale, mean frame | not measured | 0.55 ms | 0.37 ms | not measured |

- The first Rapier port, with the traced ball colliders, the plain build and 120 Hz, measured 1.62 ms in the same Node run. The engine alone did not win; the cheaper colliders and the SIMD build did.
- The ten-stone spill frame-budget test averaged 0.10 ms over per-frame minimums, where cannon best measured 0.24 to 0.83 ms on CI against a 0.75 ms budget.
- Fair Feeding at Chrome 6× held 59.8 (56) on Rapier against `main`'s 59.9 (58). At 20×, measured from 10 s after load, Rapier gave 54.7 (17) and 57.5 (33) against `main`'s 57.3 (31) and 58.8 (33).
- The Honest Scale's worst second at Chrome 20× (8 to 10) is still below `main`'s (13 to 20), though its average is close and its CPU per frame lower. Pours at 20× still stall a frame or two.

The cost is load size. The main chunk shrank 2.7 KB, and Pebble Table lazily loads one Rapier chunk: the SIMD build is 3.09 MB raw and 1.06 MB gzipped, and the plain build 2.85 MB and 1.08 MB. The home-screen preload hides it. From the jam's home, with a cold cache, the first game frame came at 285 ms in Chrome 1× (cannon best 301), 1104 ms at 6× (1300) and 334 ms in WebKit (344). Opened straight from a link it waits for Rapier: 527 ms against 478 at 1×, 2038 against 1909 at 6×, and 698 against 515 in WebKit.

Determinism held in practice. Three enforced intersection audits under ten busy loops printed the same line (clean: 0 open, 0 allowed, 2 hidden; 205 samples, 85 pieces) with identical findings and moments, and CI's audit on a Linux x64 runner printed the same line. That is evidence, not a guarantee: the rapier.js README promises cross-platform determinism only for its `-deterministic` builds, and says its main build is still deterministic on one machine (the SIMD build's entry does not say). A game that needs bit-identical replays across devices should use `@dimforge/rapier3d-deterministic-compat` and measure its cost.

Without the switch, the game would keep carrying work that Rapier does natively: cut steps, approach clamps, per-pair shape culling and landing-dip bounds, on an engine whose worst frames no longer improved.

## When to Apply

- Starting a new jam 3D game with loose bodies that stack, pour, tip or land fast. Start on Rapier, not cannon-es.
- A cannon-es game whose profiles, landings or worst seconds show the signs above, especially after colliders were made to match the drawing.
- Any game headed for Tada itself, where Rapier is on the tech menu and cannon-es is not.
- Not for a cannon-es game that meets its budgets and passes the audit, as Kite Tower does.

## Examples

Before, on cannon best, a fast landing needed the game's own step cutting: while a fast shell or stick was within a step's travel of a stone, the step was cut into up to six pieces, and approaches were clamped so stones met at their surfaces. After, each loose body carries continuous collision and a look-ahead, set once where it is built (`TablePhysics.loose` in `physics3d.ts`):

```ts
const desc = this.R.RigidBodyDesc.dynamic()
  .setTranslation(at.x, at.y, at.z)
  .setLinearDamping(damping(lossPerSecond))
  .setAngularDamping(damping(spinLossPerSecond))
  .setCcdEnabled(true)
  .setSoftCcdPrediction(lookAhead)
  .setCanSleep(true)
```

And the world is configured once in the `TablePhysics` constructor:

```ts
this.world = new R.World({ x: 0, y: GRAVITY, z: 0 })
this.world.timestep = STEP
this.world.lengthUnit = LENGTH_UNIT
this.world.integrationParameters.normalizedAllowedLinearError = ALLOWED_OVERLAP / LENGTH_UNIT
```

## Related

- [Pieces collide as drawn and rest on what is drawn](../ui-bugs/pieces-collide-as-drawn-and-rest-on-what-is-drawn.md): colliders fitted to the drawing, rest heights and bounded landing dips. Its cannon-es specifics (half extents, `Trimesh` limits, soft contact) predate this port.
- [Measure on the target device and ship adaptive quality](../performance-issues/measure-on-the-target-device-and-ship-adaptive-quality.md): the throttled-Chrome and WebKit probes used for the table above.
- [Frame-budget tests that hold on a shared CI runner](../test-failures/frame-budget-tests-that-hold-on-a-shared-ci-runner.md): the spill budget test's per-frame minimums.
- [Run the intersection audit before showing the owner](../workflow-issues/run-the-intersection-audit-before-showing-the-owner.md): the audit that `mountsAfterLoading` keeps working.
- [Building a jam game](../conventions/building-a-jam-game.md): the new-game entry point, step 7 on performance.
- `games/pebble-table/REFINEMENT.md` ("Rapier pass"): the game's own record of the port.
