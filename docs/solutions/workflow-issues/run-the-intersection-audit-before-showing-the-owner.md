---
title: Before showing the owner a three.js jam game, run the intersection audit on moments that reach every state, cover what it cannot read with model tests, allow only reasoned and capped contacts, replay before and after, and enforce it in CI
date: 2026-09-24
category: workflow-issues
module: intersection-audit
problem_type: workflow_issue
component: development_workflow
severity: high
related_components:
  - testing_framework
  - tooling
applies_when:
  - Before showing the owner a build of a three.js jam game, or calling one done
  - Writing or changing a game's audit script in scripts/intersections/games (moments, allow, ignore, object tags)
  - Triaging intersection-audit findings as real or intended, or setting enforce to true
  - Adding a vertex-shader deform, a shader-instanced batch, a cut-out texture, a saved-state moment or a canvas-2D game
  - An audit run is clean when you did not expect it, or a finding shows only at 0 s or as a whole-run pose
symptoms:
  - The owner saw pieces going through each other in many games, and the first generic audit found 3 to 141 visible findings in each game then on main
  - Moon Phases' audit was clean on main while its moments never reached the homes where the child sank into Earth, and its ignore list hid two solid rings
  - A single reload into a saved Light Garden lost to the game's own save on unload and reopened the garden from before
  - Moon Phases' first sample sometimes caught a frame drawn before the first tick, with nine findings no child could see
  - Hillside Spring's pass-30 code named no meshes, so the pass's regression tests could not even load on it
root_cause: missing_workflow_step
resolution_type: workflow_improvement
tags: [intersection-audit, playwright, ci, allow-rules, determinism, coverage, vertex-shader, kids-games]
---

# Before showing the owner a three.js jam game, run the intersection audit on moments that reach every state, cover what it cannot read with model tests, allow only reasoned and capped contacts, replay before and after, and enforce it in CI

## Context

The owner saw pieces going through each other in many of the jam games, so PR #16 added a shared check. `npm run check:intersections -- <key>` plays a game's production build in headless Chromium, on a clock paused before load and stepped 33 ms at a time, with `Math.random` seeded. Every 250 ms of game time it reads every visible mesh of the live three.js scene and reports five kinds of finding (`scripts/jam-intersections.mjs`, `scripts/intersections/core.ts`):

- penetration: two objects crossing by more than 6% of the smaller one's middle extent, marked "(sinks)" when one is a support such as a floor;
- contained: a piece wholly inside another;
- pose: two parts of one object crossing deeper than they did at their shallowest;
- zfight: coplanar faces the depth buffer cannot separate;
- nearclip: a piece cut by the camera's near plane.

Its first run used a generic idle, tap and drag script. It found visible findings in all eleven games then on `main`, from 3 in Light Garden to 141 in Shadow Lantern.

Each game then had its own pass (PRs #19 to #30, and Kite Tower's, merged from a bundle as "Merge cursor/kite-tower-intersections-bundle"): script the moments, fix what is real, allow what is meant, and set `enforce: true` so CI keeps it clean. Ten three.js games are enforced now: Shadow Lantern, Frog Choir, Moon Phases, Felt Meadow, Light Garden, Hillside Spring, Cosy Scarf, Bedtime Forest, Turning Tower and Kite Tower. Bad Neighbours (PR #21) is canvas 2D, which the audit does not read. The passes for Pebble Table and Critter Clay are pending. Those two still run the generic script, and nothing about them fails CI. The tool changed three times from what the passes ran into (PRs #17, #18 and #23).

This doc is the workflow the passes converged on. The fixes for the two largest kinds of finding are in the z-fighting and animation-clipping docs linked under Related, and pieces that collide or rest off their drawing are in the colliders doc. Several passes learned the same lessons the hard way. Moon Phases' audit was clean on `main` while its moments never reached the homes where the child sank into Earth. Light Garden's saved-state moment quietly reopened the garden from before. Hillside Spring's pass-30 code "cannot load the tests at all, since it named no meshes" (PR #27).

## Guidance

**1. Name meshes and tag objects before the first run.** The audit labels a mesh by the `name`s on the way up from it to the scene. An unnamed mesh gets only its type and child index. `allow`, `ignore` and the driver's `find` all match those labels, so a scene of unnamed meshes cannot be scripted or triaged. Frog Choir's first generic audit reported 87 findings from "an older tool build with unnamed groups" (PR #20).

Two parts of one object are checked as a pose, and parts of different objects as a penetration. By default an object is the largest ancestor that is still small next to the view (`objectFraction`, 0.3 of it). Say what an object is rather than leaving it to that guess:

- `userData.jamObject` on a character's or prop's root: Frog Choir's frogs and firefly, Cosy Scarf's animals, loom and butterfly, Hillside Spring's creatures.
- `userData.jamInstanceObjects` on an `InstancedMesh`, one object key per instance: Moon Phases' medallions, Felt Meadow's flowers, Hillside Spring's bamboo kit.
- `objects`, `instances` and `split` rules in the config, when the game itself should not change.

Felt Meadow's petals crossing each other counted as penetrations between strangers until each flower's instanced parts joined one object (PR #24). The passes ran their "before" on the old code with only the names, the tags and the moments added (PRs #20, #22, #24), so that before and after run the same script.

**2. Script moments that reach every state a child can reach.** A game without a config gets the generic script: 7 s idle, nine taps and drags across the screen, 3 s rest, and nothing enforced. The passes wrote moments in `scripts/intersections/games/<key>.ts` (typed by `scripts/intersections/types.ts`) that:

- play at a quick child's pace, so things overlap. Cosy Scarf taps its yarn balls "quicker than a hop lands, so neighbours are in the air together".
- use every verb, poke every character, carry things over other pieces and to the edge of the play area, and turn the camera to its extremes (Moon Phases' "turned low" and "turned top-down").
- start from saved states with `driver.reload(entries)` (PR #18), such as a full garden or a finished scarf.
- find things by name with `d.find` and wait for the state they need, not a guessed time. Cosy Scarf's `atLoom` plays on until the animal stands at the loom.

**3. Read a clean run as a question about coverage.** The audit sees only the poses its moments reach and the meshes it is not told to ignore.

- Moon Phases' own config was clean on `main`, with 0 open and 1 allowed over 122 samples. It ignored the whole `halves` group as see-through, and that group also held two solid rings. Once only the see-through cap was ignored, the rings went through the moon's riser (100% and 74%). Its moments also never reached a home and hour where the child sank into Earth. A unit sweep over 2,880 homes, hours and phases found the child partly inside the globe in 1,899 (PR #22). Ignore a see-through shell by its own mesh name, never by a group that holds solids.
- In Hillside Spring's pass, no moment changed where a visitor was going while it was there. A unit test written for a review comment moved the tanuki's wheel to the other end of its terrace, and the tanuki walked straight through the crops and the bed walls, a bug already on `main` (PR #27).
- Light Garden's run stayed clean both before and after a fix for a piece flying home that popped up over a tray lamp in one frame (PR #26, 262 samples). The audit checks crossings every 250 ms, not how smoothly things move.

When a run is clean, write down what no moment reached, and what `report.md` says it skipped or cannot read. Cover those with unit tests on the game's own model.

**4. Cover what the audit cannot read.**

- **Vertex-shader motion.** The audit reads positions on the CPU. It sees morph targets and skinning (`getVertexPosition` in `scripts/intersections/page.js`), but not code in a custom vertex shader, which `report.md` only counts. Move deforms that matter for contact into morph targets or TypeScript and test them there (the animation-clipping doc). A mesh drawn entirely by its shader is ignored by name, with the reason beside it, and reviewed on the contact sheets. Cosy Scarf's `scarf` and `strand` are ignored this way. So is a full-screen sky triangle that its shader places in clip space, which the audit reads at the world origin (Bedtime Forest's and Turning Tower's `^sky$`, PRs #29 and #30).
- **Shader-instanced batches and outline hulls.** Meshes on `InstancedBufferGeometry`, and inverted-hull outlines that share their front mesh's geometry, are skipped and listed under "Not audited" in `report.md`. Check them by eye. A hull built as a geometry of its own is audited as a solid: Bedtime Forest's ink lines made 41 of its 53 findings until its config ignored `-ink$` (PR #29). Light Garden's `shadows-and-eyes` and `light` batches, Frog Choir's outline bands and Felt Meadow's fuzz shells were checked on the frames and contact sheets (PRs #26, #20, #24).
- **Texture alpha.** The audit reads triangles. A quad carrying a round or cut-out texture counts its invisible corners, and a transparent material under 5% opacity is skipped entirely. Cut the quad to what its texture draws (the z-fighting doc).
- **Anything between samples.** A one-frame pop or a jolt falls between samples. Test smoothness in a unit test, as Light Garden's fly-home test does with the frame-to-frame change of course in a height.
- **Canvas 2D, SVG and DOM games.** The audit reports "not audited (no three.js scene)" and exits 0; "their overlaps belong in tests on their own model" (PR #17). Bad Neighbours' check is a vitest, `games/bad-neighbours/intersections.test.ts`. It plays the real `Game` at 60 fps with seeded input and measures every pair of matter-js colliders, every thrown prop against the slab as the renderer paints it, each sprite against its collider, and the spawn point against the street (PR #21).
- **A whole-run pose.** When a pair's shallowest sample came after its deepest, the audit reports the pose as "(whole run)", with no time and no picture. Sweep that pair's poses in a unit test to find when. Cosy Scarf's pass found its cold bear's head sinking this way (`games/cosy-scarf/limbs.test.ts`).

**5. Triage every visible finding as real or intended.** `report.md` lists visible findings first, and among those the ones where something moves: "A pair where neither piece ever moved is modelling …; one that moves is play" (`scripts/jam-intersections.mjs`). Findings not visible, or under the pixel floor, are counted as hidden and never fail CI.

- **Real.** Fix it at the source and add a unit test that fails on the old code. Revert the fix once to see the test fail, as Hillside Spring did for every one of its fixes (PR #27).
- **Intended.** `types.ts` gives the examples "a stem planted in soil, a fish under the water surface". Allow it with an `allow` rule:
  - Name both sides and the kind, as narrowly as the labels allow.
  - Say why it is meant, or why a child never sees it. Frog Choir: "The bank mounds stand in the pond: their lower halves are under the water, where nothing shows."
  - Cap it with `upTo` a little above the deepest depth measured over several `--ci` runs (step 7). Cosy Scarf's sky wall into the snow hill is "(measured 19%)" and allowed `upTo: 0.22`.

A rule without `upTo` allows the pair at any depth. A rule on a merged mesh allows the contact anywhere in that mesh, because an `Allowance` has no region. Hillside Spring's `beds` are one mesh, so its dipped-toe rule allows a frog leg in any bed up to 55%. In both cases a new fault in the same pair passes silently, so keep the cap tight.

**6. Replay before and after, then enforce.** Keep the moments the same between the two runs. `--replay` takes the earlier run's `report.json` or its output folder and photographs each earlier finding again at the same game time and spot. `before-after.png` pairs the two pictures, and since PR #23 it uses the moment of the earlier photo. It matches by sample time, so it needs "an earlier run with the same moments" (the header of `scripts/jam-intersections.mjs`). Put the before and after counts by kind in the PR body, with samples, the allowed and hidden counts, and what was checked by eye.

Then set `enforce: true`. CI's `Intersection audit (i/4)` job builds and runs `--all --ci` in four shards (`.github/workflows/ci.yml`). Games are dealt to the shards by name, so a new game needs no workflow change. The job fails an enforced game on any visible finding its `allow` list does not cover, or on a crash, and uploads the reports as an artifact kept for 14 days. In CI it photographs only what fails.

A finished pass too large to publish file by file through the GitHub MCP goes to an agent that can push as a git bundle instead, as Kite Tower's 26 files did ([delivering from a cloud VM](deliver-from-a-cloud-vm-through-the-github-mcp-when-git-push-is-refused.md)).

**7. Keep runs deterministic, and know the traps.** The runner already applies the walkthrough recipe. It pauses the clock before load, steps it 33 ms, seeds `Math.random`, clears storage, sets the child's age (5 unless `childAge` says otherwise), and pins the full look through the `tier` query (`query` overrides it). Traps it does not close:

- **A game that saves on unload.** Light Garden flushes its pending save as the page unloads, and that save overwrote what `reload(entries)` had written. In the pass, the "full garden" moment reopened the garden from the moment before and looked like a normal run. Reload once to let the flush happen, then reload with the entries (`scripts/intersections/games/light-garden.ts`):

  ```ts
  await d.reload()
  await d.reload({ 'tada-jam:slot:light-garden': FULL_GARDEN })
  ```

- **A frame drawn before the game's own loop.** Moon Phases' `resize()` drew once before the first tick, under an opening curtain no child sees. The audit sampled that frame in some runs and not others, which "would turn this enforced game red at random" (PR #22). Since PR #23 the first sample waits for a second frame, and the scene now places itself at the end of its constructor.
- **A fallback tap.** `(await d.find(pattern)) ?? point` taps a fixed point when the named thing is gone, and nothing in the report says so. In Hillside Spring's pass, a poke aimed at the sparrow fell back to a bed after the sparrow had flown off and harvested it, so later samples audited a different garden.
- **Runs of one build differ a little.** The audit's frames land at slightly different game times from run to run, and a physics fall goes a little differently. Bedtime Forest's owl in its own doorway measured 30% to 38% across runs, so its cap is 50% (PR #29). Turning Tower's bird-socket pose showed in some runs of the same code and not others (PR #30). Kite Tower found three more faults, each in one run of several, only after it enforced. Run `--ci` two or three times after a fix, and set each `upTo` from the deepest run.
- **Waits timed by the clock.** A moment that waits a fixed time for a walk-in or an animation lands somewhere else once any timing changes. Poll the scene instead (`atLoom`), and keep the moments unchanged between before and after so the replay lines up.

## Why This Matters

- **The owner is the one who saw it.** An enforced audit turns "pieces going through each other" from an owner's bug report into a red check on the PR that caused it.
- **A pass proves only what its script reached.** A clean run on moments that never reach the fault, or an uncapped rule on a moving pair, reads exactly like a real pass. Coverage and triage are what make "clean" mean something.
- **Before and after on the same moments is evidence.** A reviewer can see every earlier finding photographed again at the same moment and spot, instead of trusting a count.
- **The blind spots are structural.** CPU geometry, a 250 ms sample and a three.js-only reader will not change with a better script. Knowing them tells you which unit test to write instead.

## When to Apply

- Before showing the owner any build of a three.js jam game, and before calling one done.
- When starting a game's audit pass, including Pebble Table's and Critter Clay's.
- When adding a shader deform, an instanced batch, a cut-out texture, a saved-state moment or a new verb to an enforced game.
- When a run is clean and you did not expect it to be, or a finding has no moment or shows only at 0 s.

## Examples

**A pass, end to end.** Run against a production build. Each run writes `report.md`, `report.json`, a close-up of every finding in a `hits` folder, and `contact-sheet.png` into `<out>/<key>/`. The replay adds `before-after.png`.

```bash
npm run build
npm run check:intersections -- <key> --out /tmp/ia-<key>/before
# fix at the source, add the tests, then:
npm run build
npm run check:intersections -- <key> --ci --out /tmp/ia-<key>/after --replay /tmp/ia-<key>/before
```

**What the passes ended with.** Every pass finished with 0 open findings under `--ci`. How much each allowed depends on how much the game means things to touch:

| Game | PR | Visible before | Allowed after | Hidden after | Samples |
| --- | --- | --- | --- | --- | --- |
| Shadow Lantern | #19 | 52 | 1 | 0 | 231 |
| Frog Choir | #20 | 72 | 9 | not stated | 168 |
| Moon Phases | #22 | 12 open, 1 allowed | 1 | 0 | 237 |
| Felt Meadow | #24 | 296 | 193 | 8 | 247 |
| Light Garden | #26 | 6 | 0 | 1 | 262 |
| Hillside Spring | #27 | 146 | 42 | 10 | 224 |
| Cosy Scarf | #28 | 72 | 0 | 1 | 271 |
| Bedtime Forest | #29 | 53 | 5 | 0 | 300 |
| Turning Tower | #30 | 95 | 2 (3 in some runs) | 0 | 268 |
| Kite Tower | bundle merge | 72 | 0 | 0 | 187 |

What stays allowed in Felt Meadow "is what the meadow means: things planted in the felt, a seed sinking into its molehill, a picked flower folding round its seed, a flower's own parts, and the critters' own joints" (PR #24). Its 21 rules each carry a reason and an `upTo`, and "each rule's cap sits a little above the depth measured".

**A config's allow and ignore, each with its reason** (Cosy Scarf, abridged from `scripts/intersections/games/cosy-scarf.ts`):

```ts
allow: [
  {
    a: '^sky\\b',
    b: '^snow\\b',
    kind: 'penetration',
    upTo: 0.22,
    reason: 'Modelling, never moves: the knitted sky wall stands down into the snow hill far behind the land, where the hill hides the join (measured 19%).',
  },
],
ignore: [
  // Drawn entirely by their vertex shaders: the CPU geometry is a parameter grid (a flat patch
  // of cells, a unit tube) at the world origin, not what is on screen. Reviewed in the contact sheets.
  '^scarf\\b',
  'strand',
  // Soft transparent overlays that never write depth: ...
  '^puffs\\b',
  '^glow-rings\\b',
  '^blob-shadows\\b',
],
```

## Related

- [Coplanar faces and flat overlays z-fight](../ui-bugs/z-fighting-from-coplanar-faces-decals-and-flat-overlays.md): fixing zfight findings and flat overlays, and cutting quads to what their texture draws.
- [Animation clipping through bodies and furniture](../ui-bugs/animation-clipping-limbs-props-and-poses-through-bodies-and-furniture.md): fixing pose and moving-penetration findings, and moving shader deforms where the checks can see them.
- [Pieces collide as drawn and rest on what is drawn](../ui-bugs/pieces-collide-as-drawn-and-rest-on-what-is-drawn.md): one set of dimensions for collider and mesh, rest heights and footprints from the drawn geometry, and landing dips bounded by a physics test.
- [Record a deterministic walkthrough](record-a-deterministic-walkthrough-on-software-gl-with-a-paused-clock.md): the paused clock and seeded randomness the audit runs on.
- [Building a jam game](../conventions/building-a-jam-game.md): step 11 and "Before you show the owner".
