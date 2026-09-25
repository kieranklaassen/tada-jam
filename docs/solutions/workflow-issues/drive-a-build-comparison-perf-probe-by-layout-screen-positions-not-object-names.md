---
title: A perf probe that compares builds must drive every build by screen positions from the shared layout and a seeded save, never by object names, and must check that each build did the work
date: 2026-09-25
category: workflow-issues
module: performance
problem_type: workflow_issue
component: development_workflow
severity: high
related_components:
  - tooling
  - testing_framework
applies_when:
  - Comparing the frame rate or CPU cost of two builds, branches or physics engines of the same game
  - Writing or changing a scripted perf probe that has to press a particular object, such as a jar, a pan or a stone
  - Reusing an intersection-audit moment, or any lookup by object name, as the input for a performance run
  - One build in a comparison looks surprisingly fast, or barely slows down under a heavier CPU throttle
  - Reporting an A/B performance result to the owner before a merge or an engine decision
symptoms:
  - The first Honest Scale probe found the scale, the jars and the pieces by object name, and main's scene had no such names, so the probe played nothing on main
  - Idle main read 60 (60) at Chrome 6x and 57.0 (6) and 58.2 (21) at 20x, against the branch's busy 18.9 (1) and 25.2 (1) at 20x
  - The coordinator's report carried the wrong main column (CPU p95 about 3 ms against the branch's 14 to 17 ms) before the mistake was found
  - With the fair probe, main at Chrome 20x measured 36.0 (20), not 57 to 58
root_cause: logic_error
resolution_type: tooling_addition
tags: [perf-probe, ab-testing, pebble-table, honest-scale, playwright, cpu-throttling, seeded-save, perf-measurement]
---

# A perf probe that compares builds must drive every build by screen positions from the shared layout and a seeded save, never by object names, and must check that each build did the work

## Context

Pebble Table's final bundle (`506b1c4`) had to be compared with `main` (`13bf374`) on the Honest Scale, the balance scale with jars of loose parts. The shared probe, `npm run perf:jam`, taps a fixed grid and drags between fixed points, so it does not aim at the scale's pans and jars. A scripted Playwright probe was written for the scale instead, starting from the intersection audit's `scale` moment in `scripts/intersections/games/pebble-table.ts`.

That moment finds what it presses by name. `tapNamed(d, 'jar-acorn')` goes through `d.find`, and `instances(d, 'stone-whole')` and `instances(d, 'part-acorn')` read an instanced mesh through `window.__jamAudit.main().scene.getObjectByName(...)`. The first probe did the same, then carried stones and tipped jars at those objects' projected positions.

The names came in with the final bundle, for the audit ("Pebble Table: name meshes, tag multi-mesh things as audit objects, and script the intersection audit moments", `5448a4f`). `main`'s scene had none of them. On `main` every lookup came back empty, so the probe pressed nothing and measured an idle table, while on the branch it measured the full busy scene:

| Honest Scale | Branch, first probe | `main`, first probe (idle by mistake) | Branch, fair probe | `main`, fair probe |
| --- | --- | --- | --- | --- |
| Chrome, 6x CPU | 52.9 (8), 54.2 (6) | 60 (60) | 45.8 (10), 50.9 (6) | 59.9 (55) |
| Chrome, 20x CPU | 18.9 (1), 25.2 (1) | 57.0 (6), 58.2 (21) | 12 to 16 | 36.0 (20) |

Numbers are average fps with the worst one-second window in brackets. At 6x an idle `main` and a played `main` read almost the same, so those runs gave no hint. At 20x the idle `main` read 57 to 58 against a real 36.0. The fair probe plays a heavier scene than the first one did, so the branch reads lower on it too. The first probe's table, with `main`'s CPU p95 at about 3 ms against the branch's 14 to 17 ms, had already gone into the coordinator's report when the mistake was found. The correction went into the coordinator's report before any merge decision, saying that the "Main" column was wrong and why. Every later decision (not merging a regression, the Rapier port, the final merge) used the fair probe.

## Guidance

**1. Give every build the same input, taken from what the builds share.** Both builds lay the table out from the same world coordinates, so drive them from those. `scripts/pebble-scale-probe.mjs` holds table points for the four jars (`JARS`, the same values as `JARS` in `games/pebble-table/parts.ts`), one point on each pan (inside the circles of `SCALE.pans` in `games/pebble-table/layout.ts`) and four stone spots. It turns each into a 3D point on the table plane with the same mapping the audit uses, `to3 = (p, y) => [(p.x - 800) * 0.1, y, (p.y - 500) * 0.1]`, at a height for each target (jars 14, pans 7, stones 1), and projects it through the page's own camera with `window.__jamAudit.projectFrac`. The points are constants in the probe, so check them against the layout when it changes. If the builds being compared lay the table out differently, the same points are no longer the same input.

**2. Never find anything by name or by any other scene detail that one build may lack.** Object names, mesh paths, instanced-mesh names and `userData` tags are all detail a build is free to change. A probe that depends on them measures whichever builds happen to have them. `projectFrac` reads only the main scene's camera (`audit.main()` is the scene and camera pair with the most meshes), which any three.js build has.

**3. Start every build from the same seeded save.** The probe loads the page once, clears `localStorage`, and writes `tada-jam:prefs` (`childAge: 6`) and `tada-jam:slot:pebble-table` with four whole stones (`q: 4`) at the stone spots and `liveMat: 'scale'`. It then opens `?chrome=0#/play/pebble-table`, waits for `__jamAudit.main()` and waits 5 s more. Every build opens straight onto the scale with the same four stones, with no menu taps that could land differently.

**4. Resolve every position before measuring.** The probe fills its `at` table (`jar-*`, `front-*`, `pan-*`, `stone-*`) with `page.evaluate` calls before it installs its frame recorder. Inside the measured 40 s nothing walks the scene or projects a point, so the only work in a measured frame is the game's.

**5. Check that each build actually did the work.** The probe prints `instances`, the summed `count` of every instanced mesh in the main scene at the end of the run. It counts every instanced mesh rather than a named one, so it works the same on every build. Read it for every build before reading any fps: a build whose count is far below the others played nothing. The first probe had no such check, and nothing in its output showed that `main` had been idle.

**6. Name lookups are right for the audit, not for comparisons.** The intersection audit checks one build whose names it knows, and its moments use `d.find` and `getObjectByName` on purpose (see [run the intersection audit](run-the-intersection-audit-before-showing-the-owner.md)). Copying a moment into a perf probe carries those lookups into a comparison between builds whose scenes differ. `perf:jam` drives games by fixed screen fractions (a 4x3 grid of taps and six fixed drags), so it was unaffected and its Fair Feeding numbers stood.

**7. If you borrow the audit's page hook, turn rendering back on.** `scripts/intersections/page.js` defaults to `skipRender: true`, which only updates world matrices instead of drawing. The probe sets `window.__jamAudit.skipRender = false` in an init script so frames are really drawn.

**8. Run the A/B so the machine does not decide it.**

- Interleave builds and repeat each. Chrome-throttled runs of the same build varied by several fps, and the worst second varies more than the average. The fair probe's `main` at 20x read 36.0 (20) in one run, and 32.8 (13) and 40.1 (20) in the runs behind the Rapier decision's table.
- Serve each build from its own `vite preview` port, from a copy of its `dist`, so a rebuild does not change a build in the middle of the matrix.
- Keep the machine quiet. A heavy test run during one matrix skewed its runs, and they were redone.
- Know when counting starts. `perf:jam` starts counting about 5 s after load. A direct link that loads a large WebAssembly chunk (Rapier) still has its first load inside that window, and at 20x it lands in the worst second. Measure again starting 10 s after load to see steady play.

**9. Publish the correction before anyone decides on the wrong numbers.** When a reported comparison turns out to be wrong, correct it where it was reported, say which numbers were wrong and why, and do it before the merge or engine decision it feeds. Then make every later decision on the fixed probe.

## Why This Matters

A comparison is only as fair as its input. A probe that finds its targets by name gives each build a different run, and the difference does not show: the idle build simply looks fast. Here the regression was real (the fair probe measured the branch at 12 to 16 fps at 20x against `main`'s 36), but the report judged it on a `main` that had not played: its numbers were wrong, and nothing in the output said so. Screen positions from the shared layout, a seeded save and a sanity count make the input the same for every build and make a run that did nothing visible, so a wrong result is caught before it is reported rather than after.

## When to Apply

- Any A/B of two builds, branches, engines or settings of the same game, whether the probe is new or adapted from an audit moment or a test.
- Before trusting a comparison where one side is much faster than expected, or where a heavier throttle barely moves one side.
- Before a performance number goes to the owner or into a merge or engine decision.

## Examples

Before: the lookups in the audit's `scale` moment, which the first probe copied.

```ts
for (const jar of ['jar-acorn', 'jar-shell', 'jar-stick', 'boulder-nest']) {
  await tapNamed(d, jar) // d.find(name): null on main, so no tap
  await d.wait(250)
}
const parts = await instances(d, 'part-acorn') // getObjectByName: [] on main
if (parts[0]) await carry(d, parts[0], SCALE.pans[1], 700)
```

After, in `scripts/pebble-scale-probe.mjs`: positions from layout points, resolved before measuring.

```js
const to3 = (p, y) => [(p.x - 800) * 0.1, y, (p.y - 500) * 0.1]
const px = (f) => ({ x: f[0] * W, y: f[1] * H })
const spot = async (p, y = 0) => px(await page.evaluate((v) => window.__jamAudit.projectFrac(v), to3(p, y)))
// Resolve every screen position before measuring: nothing below walks the scene inside a measured frame.
const at = {}
for (const [k, p] of Object.entries(JARS)) at['jar-' + k] = await spot(p, 14)
```

For about 40 s it then carries a stone to a pan, taps all four jars, drags from in front of each jar onto a pan (whatever part lies there comes along), and repeats. It reports `fps`, `worst1s`, `p99`, `over25`, `cpuP50` and `cpuP95` (each frame's summed animation-frame callback time), the `tiers` visited, `instances` and page `errors`.

Running an interleaved A/B (fill in the ports and builds):

```bash
# each build served from its own port, from a copy of its dist
npm run perf:pebble-scale -- chrome 20 http://localhost:<port-a>
npm run perf:pebble-scale -- chrome 20 http://localhost:<port-b>
npm run perf:pebble-scale -- chrome 20 http://localhost:<port-a>
npm run perf:pebble-scale -- chrome 20 http://localhost:<port-b>
# check `instances` for every run before comparing fps
```

The arguments are `<webkit|chrome> <throttle> <base> [size]`; `size` multiplies the 1180x820 viewport.

## Related

- [Start a new jam 3D game on Rapier](../tooling-decisions/use-rapier-as-the-default-physics-engine-for-jam-3d-games.md): its four-build table (cannon original, cannon best, Rapier, `main`) comes from the fair probe.
- [Profile the game standalone before blaming the jam shell](../performance-issues/profile-the-game-standalone-before-blaming-the-jam-shell.md): the same same-input rule for an A/B of host and standalone, and measuring the noise.
- [Measure on the target device and ship adaptive quality](../performance-issues/measure-on-the-target-device-and-ship-adaptive-quality.md): how the jam measures (WebKit, throttled Chrome, four times the pixels) and `perf:pebble` and `perf:jam`.
- [Measure jam game performance on a GPU-less cloud VM](measure-jam-game-performance-on-a-gpu-less-cloud-vm.md): interleaved A/Bs on a noisy machine, and checking the probe you run.
- [Run the intersection audit before showing the owner](run-the-intersection-audit-before-showing-the-owner.md): where the name lookups belong.
- `CONCEPTS.md`, "Perf probe": the jam's shared probe (`perf:jam`). `perf:pebble-scale` is a separate, one-game comparison probe.
