---
title: A frame-budget test that a shared CI runner can hold counts the work or takes each frame's quickest replay, never a raw timing, and proves the heavy moment happened
date: 2026-09-23
category: test-failures
module: testing
problem_type: test_failure
component: testing_framework
severity: medium
related_components:
  - development_workflow
applies_when:
  - Adding or changing a frame-budget or per-frame cost assertion in a jam game
  - A timed test passes on an idle machine but fails in the full parallel suite or on GitHub Actions
  - Guarding a worst frame, a time-sliced search, or a per-frame average in milliseconds
  - Merging games so their suites share one runner
symptoms:
  - Turning Tower's worst-frame guard failed on the shared CI runner at 4.9 ms (Ferry) and 3.0 ms (Crank) against a 3 ms budget, while the controller's worst frame on an idle machine is about 0.07 ms
  - Shadow Lantern's search-slice test failed 2 in 5 full-suite runs after the games merged
  - Pebble Table's best-of-five average failed on CI at 0.97 ms against 0.75 on a commit that changed only another game's log
  - A timed test passes every run on an idle machine and fails only when other suites or processes share the cores
root_cause: test_isolation
resolution_type: test_fix
tags: [frame-budget, flaky-tests, ci, vitest, performance-testing, shared-runner, kids-games]
---

# A frame-budget test that a shared CI runner can hold counts the work or takes each frame's quickest replay, never a raw timing, and proves the heavy moment happened

## Problem

Each jam game is asked for a frame-budget test that CI runs through `npm test` ([building a jam game](../conventions/building-a-jam-game.md), step 7). Once the games merged, all their suites ran on one runner at once, and budgets written in milliseconds started failing on busy moments that had nothing to do with the game's code. A budget test that fails on noise teaches everyone to rerun CI, and that is how a real regression gets through.

## Symptoms

- Turning Tower (PR #7): on the shared CI runner the worst-frame guard failed at 4.9 ms (Ferry) and 3.0 ms (Crank) against a 3 ms budget. On an idle machine the controller's worst frame is about 0.07 ms, so the budget was about forty times the real cost and still failed (`games/turning-tower/REFINEMENT.md`, pass 17).
- Shadow Lantern: the search-slice test in `games/shadow-lantern/coverage.test.ts` "failed 2 in 5 full runs after the merges", in the words of the commit on `main` that rewrote it after PR #5.
- Pebble Table: its earlier budget, the best of five runs' averages, failed on CI at 0.97 ms against 0.75 on the Cosy Scarf branch (PR #14), on a commit that changed only Cosy Scarf's refinement log. That branch did not yet have PR #1's move to per-frame minimums.
- Raw worst frames are the runner's, not the game's. With twelve busy loops on this 4-core VM (the stress Turning Tower used), Light Garden's logged worst frame went from 4.15 ms in an idle run to 16.46–20.68 ms and Frog Choir's from 0.85 ms to 8.57–20.25 ms, while their best averages stayed at 0.011–0.055 ms against a 0.15 ms budget. Neither test asserts the worst frame, so both passed.

## What Didn't Work

- **The smallest of several runs' single worst frames.** Turning Tower's first guard played each diorama five times and took the lowest of the five maxima. A run's maximum is its worst stall, and in the longest rooms (Ferry is 2,087 frames, Crank 1,948) every run was preempted at least once, so the lowest maximum was still a stall. Under twelve busy loops on four cores that reading hit 4.0 and 8.1 ms.
- **A ratio of two timings.** Shadow Lantern's old slice test timed a whole `bestHint` search to estimate what one candidate costs, then timed each slice's overrun past its 0.3 ms budget and required the 90th-percentile overrun, in the best of three searches, to stay under four candidates. Both numbers are noisy: a stall during the estimate makes a candidate look expensive and hides a real overrun, and stalls during the slices fail it.
- **A loose budget on a maximum.** A worst-frame budget that is forty times the real cost still fails, because one preemption lasts longer than any budget small enough to catch a regression. Only averages survive a loose budget.
- **A timed twin of a counted test.** Kite Tower's controller tests had a timed topple that repeated the collapse test, so it was removed (`games/kite-tower/REFINEMENT.md`, "After pass 30").

## Solution

Pick the first of these that fits the cost being guarded.

**1. Count the work that sets the cost.** When a frame's cost comes from a quantity the code exposes (physics steps, solver contacts, scored candidates, bodies still awake), assert on that count. A count is the same on every machine. Kite Tower (PR #9) replaced its timed budgets in `games/kite-tower/perf.test.ts` with four counts: one fixed physics step per 60 Hz frame through a twelve-piece collapse, at most 80 contacts per step (the collapse peaks at 50), exactly the tier's catch-up substeps for a 1/20 s, 0.5 s or 5 s frame, and eleven heaps of all twelve pieces asleep within five seconds.

```ts
for (let frame = 0; frame < 360; frame++) {
  const before = world.stepnumber
  game.step(1 / 60)
  maxSteps = Math.max(maxSteps, world.stepnumber - before)
  maxContacts = Math.max(maxContacts, world.contacts.length)
}
expect(maxSteps, 'fixed physics steps in one 60 Hz frame').toBe(1)
expect(maxContacts, 'most contacts the solver handled in one step').toBeLessThanOrEqual(80)
```

A loop that stops when a wall-clock budget runs out is counted the same way, by handing it a fake clock. Shadow Lantern's `continueSearch(budgetMs, clock = () => performance.now())` takes the clock as a parameter, so its rewritten test passes one that reports the budget spent after its first read, spies on `soloScore` (which runs once per scored candidate), and asserts that the search took more than one slice and that no slice scored more than two candidates. The game still reads `performance.now()`.

```ts
const scoring = vi.spyOn(meter as unknown as { soloScore: (...args: unknown[]) => number }, 'soloScore')
let reads = 0
const spentAfterStart = () => (reads++ === 0 ? 0 : Infinity)
meter.beginSearch(placed)
const perSlice: number[] = []
for (let done = false; !done; ) {
  reads = 0
  const before = scoring.mock.calls.length
  done = meter.continueSearch(0.3, spentAfterStart)
  if (!done) perSlice.push(scoring.mock.calls.length - before)
}
expect(perSlice.length).toBeGreaterThan(1)
expect(Math.max(...perSlice)).toBeLessThanOrEqual(2)
```

**2. When only time will do, take each frame's minimum across aligned, seeded replays.** Replaying the same touches in a seeded world does the same work at the same frame index in every run, while a stall or a garbage collection lands on a random frame in one run. The per-index minimum keeps a truly heavy frame (it is heavy in every run) and drops the stalls. Pebble Table (PR #1) budgets the average of each frame's minimum across seven 180-frame spills in `games/pebble-table/perf.test.ts`; Turning Tower (PR #7) budgets the worst of each frame's quickest run across five replays per diorama, and under the same twelve busy loops that took the old reading to 4.0 and 8.1 ms, the new one stayed at 0.02–0.06 ms. The runs must line up frame for frame, so Turning Tower asserts that every run has the same number of frames as the first.

```ts
function quickestFrames(runs: readonly Run[]): number[] {
  const out = [...runs[0].times]
  for (const run of runs) for (let i = 0; i < out.length; i++) out[i] = Math.min(out[i], run.times[i])
  return out
}
```

**3. A best-of-N average is fine for an average with a wide margin, and for nothing else.** Frog Choir, Light Garden, Hillside Spring's busy frame and Shadow Lantern's drag each take the lowest of five runs' averages. They held every stress run for this doc, the closest at about a third of its budget (Light Garden, 0.055 ms against 0.15). They say nothing about the worst frame.

**4. Assert that the heavy moment happened.** A budget measured on a run that never reached the expensive part passes for the wrong reason. Turning Tower asserts that every run reached the door, Frog Choir that each run carried, splashed and tapped three times and showed at least as many previews as there are pads, Light Garden that its first run lit more than twelve beam segments, and Shadow Lantern's slice test that the search took more than one slice. Pebble Table's spill test does not check that the stones left the bag, and Shadow Lantern's timed search test does not check that a search ran.

**5. Warm up first.** Each timed budget test on `main` runs the game before it starts measuring, so JIT compilation and first-run caches are not charged to the budget.

## Why This Works

A busy runner adds time to random frames (preemption, other suites' workers, garbage collection) and never removes any. The minimum of a measurement over repeats therefore settles on the real cost, and the maximum settles on the runner's worst stall; a guard on a maximum is a guard on the runner. A count does not involve the runner at all.

A loop that runs until its wall-clock budget is spent is the extreme case, because timing it measures the budget. Shadow Lantern's controller spends `HINT_BUDGET_MS` (0.6 ms) of wall time in every searching frame by design. Its old timed test, "the idle hint search stays within its slice of the frame", allowed a 1 ms average, best of three. On this 4-core VM it read 0.477–0.498 ms and passed in five plain full-suite runs, then failed two of three runs under twelve busy loops (1.802 and 1.489 ms; the third read 0.710 ms). It is now counted: "the idle hint search runs one budgeted slice a frame until it has a hint" in `games/shadow-lantern/controller.test.ts` gives the search a fake clock that advances 0.05 ms per read and spies on `soloScore`. It asserts one slice per frame, a budget of at most 0.6 ms, at most 14 candidates scored per frame, a search spread over more than one frame, and a hint at the end.

## Prevention

- [ ] Guard a count when the cost has one: steps, contacts, candidates, awake bodies, spots searched.
- [ ] Give any loop that stops on a wall-clock budget an injectable clock, and test it by counting work per slice.
- [ ] If the test must time frames, replay the same seeded input several times, take each frame's minimum across runs, and assert that the runs have the same length.
- [ ] Never assert a raw maximum, or a ratio of two timings.
- [ ] Assert that the heavy moment happened in every run you measure.
- [ ] Play the scenario once before measuring.
- [ ] Before merging, run the game's budget tests with busy loops on every core. This is what separated Turning Tower's old and new readings, and what fails Shadow Lantern's remaining timed search test:

```bash
pids=""; for i in $(seq 1 $(( $(nproc) * 3 ))); do (while :; do :; done) & pids="$pids $!"; done
npx vitest run --disableConsoleIntercept games/<key>/perf.test.ts
kill $pids
```

Still timed on `main`, with what they read on this VM idle and under twelve busy loops:

- Hillside Spring, the worst turn across 60 cluttered hillsides: each hillside's quickest of three turns of the same piece, then the largest across hillsides, which is the per-frame minimum pattern with three replays. 0.481–0.529 ms against 4 ms; it fails only if all three turns of one hillside stall.
- Shadow Lantern drag (0.021–0.067 ms against 0.5), Hillside Spring busy frame (0.003–0.012 against 0.1), Frog Choir (0.010–0.014 against 0.15), Light Garden (0.011–0.055 against 0.15): best-of-five averages.
- Felt Meadow, the median of 600 controller frames: 0.004–0.007 ms against 0.3. A median ignores stalls on fewer than half the frames.

Bedtime Forest, Critter Clay and Cosy Scarf each have a per-frame-minimum budget in `frameBudget.test.ts`: seven seeded replays of their busiest moment, with runs checked to be the same length and the heavy moment checked to have happened. On the Mac mini (M4) they read about 0.002 ms (an animal carried while the others roam), 0.020 ms (four fully built critters wandering while a part is carried) and 0.001 ms (a scarf given while a ball is carried), against budgets of 0.1, 0.2 and 0.1 ms on average and 1 ms for any frame. All ten timed test files on `main` passed three runs under thirty busy loops on the 10-core Mac mini.

## Related Issues

- [Measure on the target device and ship adaptive quality](../performance-issues/measure-on-the-target-device-and-ship-adaptive-quality.md) introduced the jam's first frame-budget test. Its "Frame-budget test in CI" paragraph and checklist still describe the best-of-five average that Pebble Table used before PR #1 moved it to per-frame minimums.
- [Building a jam game](../conventions/building-a-jam-game.md), step 7, asks every game for a frame-budget test.
- [Measure jam-game performance on a GPU-less cloud VM](../workflow-issues/measure-jam-game-performance-on-a-gpu-less-cloud-vm.md) covers the browser side: these tests guard the controller's CPU work, and the frame's real cost is the draw submission the browser probe measures.
