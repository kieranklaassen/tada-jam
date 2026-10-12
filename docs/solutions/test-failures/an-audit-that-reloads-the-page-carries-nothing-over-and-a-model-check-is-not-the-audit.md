---
title: An audit that reloads the page carries nothing over the reload, starts a saved state from a page with no pending save, and is never replaced by a model check that has no browser
date: 2026-10-12
category: test-failures
module: intersection-audit
problem_type: test_failure
component: testing_framework
severity: high
related_components:
  - development_workflow
  - tooling
applies_when:
  - Writing or changing an intersection audit file whose moments start from a saved state
  - A model check with no browser says 0 open and the real audit run then finds something
  - Changing what the audit tool keeps between samples, or how it reloads the page
  - An audit moment taps a character or a thing it has to find on the screen first
  - Adding a three.js game to the jam, which adds its audit time to one CI shard
symptoms:
  - Box Fort's audit ran four times at 142 open, 4 open, 4 open and clean, and the builder's stepped check said 0 open before the second run and before the third
  - Nine moments of the second run started from the fort the moment before had left, not the fort the audit file named
  - The third run reported the blanket inside a box and in the cat's paw in frames where no blanket was drawn
  - In the first run the taps meant for the three characters landed in the middle of the screen
  - The slowest of four CI shards took 29, 39, 49 and then 52 minutes while the limit was raised from 30 to 45 to 60
root_cause: test_isolation
resolution_type: test_fix
tags: [intersection-audit, playwright, reload, seeded-random, debounced-save, model-check, ci-shards, kids-games]
---

# An audit that reloads the page carries nothing over the reload, starts a saved state from a page with no pending save, and is never replaced by a model check that has no browser

## Problem

Box Fort is a three.js game, and its intersection audit was run four times before it came out clean: 142 open, 4 open, 4 open, clean (`games/box-fort/REFINEMENT.md:10`). Between runs its builder ran a stepped check: the same moments played through the game's model with no browser, sampled every 33 ms. It said 0 open before the second run and before the third, and each of those real runs found 4. The two misses had different causes, and neither was in the game's motion. One was in how the audit file reloaded the page, and the other was in what the audit tool kept across a reload.

## Symptoms

- First run: `FAIL - 142 open, 10 allowed, 61 hidden` (`games/box-fort/REFINEMENT.md:436`). The moments meant to tap the cat, the baby and the grandmother looked for them by names nothing is drawn under, found nothing, and tapped the middle of the screen. None of their scenes was in the run (`games/box-fort/REFINEMENT.md:454`).
- Second run: `FAIL - 4 open, 20 allowed, 2 hidden` after the stepped check had said 0 (`games/box-fort/REFINEMENT.md:486`, `games/box-fort/REFINEMENT.md:494`). All four were in forts the audit file did not name.
- Third run: `FAIL - 4 open, 25 allowed, 4 hidden` after the stepped check had said 0 again (`games/box-fort/REFINEMENT.md:525`, `games/box-fort/REFINEMENT.md:533`). None of the four was drawn on the page.
- CI: each new three.js game adds its audit time to one shard. Over the run the slowest of four shards took 29, 39, 49 and then 52 minutes, against limits raised from 30 to 45 to 60.

## What Didn't Work

- **Reporting the stepped check as the audit.** The check played the model alone. It had no browser, none of the shell's storage and none of the tool's own bookkeeping, so it could not see a fault that lives in any of those. It was right about the game's geometry both times and wrong about the run both times (`games/box-fort/REFINEMENT.md:272`).
- **Sampling the stepped check more coarsely than the audit.** Played with a sample every 200 ms it came out clean. Played every 33 ms, as the audit samples, it found 18 more (`games/box-fort/REFINEMENT.md:462`).
- **Writing the slot and reloading in one step.** The jam shell holds a save for 2 seconds (`harness/storage.ts:14`) and writes whatever it holds when the page goes away (`harness/JamShell.tsx:82`). The audit file's `from()` wrote a fort into the slot and then reloaded, so the held save of the moment before was written over the slot. Nine moments started from the fort the moment before had left. The stepped check handed each named fort straight to the model and never played those states (`games/box-fort/REFINEMENT.md:496`).
- **Two reloads with no sample between them.** This was the fix for the second run, and it exposed the third. The audit seeds `Math.random` on every page load (`scripts/jam-intersections.mjs:164`), so a reloaded page gives its geometries the same uuids and versions. The tool kept positions, prepared pieces and pair results keyed by piece id and version (`scripts/jam-intersections.mjs:225`, `scripts/jam-intersections.mjs:228`, `scripts/jam-intersections.mjs:229`). The blanket is one mesh rebuilt every frame, so its version is the number of frames drawn. The blanket of the page before was measured against the boxes of the page after (`games/box-fort/REFINEMENT.md:535`).
- **A tap that falls back to the middle of the screen.** A moment that does not find its target and taps anyway still passes. It audits a scene nobody asked for.

## Solution

**1. Start a saved state from a page that holds no pending save.** The audit file reloads once with nothing, which lets the moment before write what it holds, and then reloads from the fort the moment names (`scripts/intersections/games/box-fort.ts:84`):

```ts
async function from(d: Driver, fort: Fort = {}): Promise<void> {
  await d.reload()
  await d.wait(66)
  await d.sample()
  await d.reload({ [SLOT]: saved(fort) })
  await d.wait(300)
}
```

The three states the old reloads had reached by accident are states a child reaches, so they became moments of their own (`games/box-fort/REFINEMENT.md:498`).

**2. The tool keys nothing across a reload.** The driver's `reload` now clears all three maps before the next sample (`scripts/jam-intersections.mjs:392`, cleared at `scripts/jam-intersections.mjs:402`, `scripts/jam-intersections.mjs:403` and `scripts/jam-intersections.mjs:404`):

```js
await page.reload()
positions.clear()
prepared.clear()
cache.clear()
```

The sample between the two reloads in `from()` was the audit file's own guard, made before the tool was changed. The tool now clears its own maps, so the next audit file does not have to know about this.

**3. A moment that finds nothing to tap stops.** The file finds each character by a part that is drawn, and throws when nothing matches (`scripts/intersections/games/box-fort.ts:108`, `scripts/intersections/games/box-fort.ts:114`; `games/box-fort/REFINEMENT.md:274`).

**4. Make the model check reproduce the real numbers before fixing anything.** After the second run the stepped check was given the shell's storage: one page across all moments, a save held for two seconds, and a reload that writes what is held. It then gave the run's own 4 open in 3575 samples at the same four depths (`games/box-fort/REFINEMENT.md:498`). After the third run it was given the audit's seed and its reuse by name and version, and gave that run's own four (`games/box-fort/REFINEMENT.md:537`). Only then were the fixes made, so each fix was seen to remove a finding the check could show.

**5. Fix crossings in geometry or motion.** Every finding of the first two runs was fixed in geometry or motion, or is a contact the game makes on purpose. The allow list keeps 13 entries, each with its reason and a cap at the measured depth (`games/box-fort/REFINEMENT.md:549`). The third run's four were allowed nowhere, because nothing was drawn (`games/box-fort/REFINEMENT.md:539`).

**6. Add shards before the slowest reaches the limit.** The audit job now runs in six shards under a 60 minute limit (`.github/workflows/ci.yml:49`, `.github/workflows/ci.yml:53`, `.github/workflows/ci.yml:57`), and the slowest took 30 minutes. Games are dealt by their place in the sorted list of names (`scripts/jam-intersections.mjs:60`, `scripts/jam-intersections.mjs:645`), so adding a game moves others between shards and a shard's time can change with no change to its games.

## Why This Works

A reload is a boundary for three separate things, and each one must be empty when it is crossed. The shell's held save has to be written before the slot is written, or it lands on top. The tool's memory of the page has to go, because the seed that makes a run repeatable also makes two pages name their geometries alike. And the moment has to know its target is on the screen, because a tap always lands somewhere.

A model check is cheap and finds real faults: it found 18 crossings at 33 ms with no browser run at all. But it only plays what it was given. Each time the real run found what it had missed, the missing part was something outside the model, and the check became useful again only after that part was added and the real numbers came back out of it. A third thing it does not play may exist (`games/box-fort/REFINEMENT.md:272`).

## Prevention

- [ ] Report a model check as a model check. Only a run of `npm run check:intersections` on a production build is the audit.
- [ ] Sample the model check at the audit's interval or finer.
- [ ] When the real run finds what the model check missed, make the check give the real run's numbers before any fix.
- [ ] A moment that starts from a saved state reloads once with nothing and then from that state.
- [ ] A tool that reloads a seeded page clears everything it keyed by id and version at the reload.
- [ ] A moment that finds nothing to tap throws. It never taps the middle.
- [ ] Fix a crossing in geometry or motion. Keep the allow list to contacts made on purpose, each with a reason and a cap.
- [ ] After adding a three.js game, read the slowest shard's time and add shards before it reaches the limit.

## Related Issues

- [Run the intersection audit before showing the owner](../workflow-issues/run-the-intersection-audit-before-showing-the-owner.md) is the workflow this audit belongs to: moments that reach every state, the allow list, the replay, and `enforce: true`.
- [Drive a build-comparison perf probe by layout screen positions, not object names](../workflow-issues/drive-a-build-comparison-perf-probe-by-layout-screen-positions-not-object-names.md) covers the same fault in the perf probe: a driver that looks for a name nothing carries and does no work.
- [Frame-budget tests that hold on a shared CI runner](frame-budget-tests-that-hold-on-a-shared-ci-runner.md) asks a test to prove the heavy moment happened, which is the same demand as a moment that stops when it finds nothing to tap.
