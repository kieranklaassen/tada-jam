# Moon Phases: refinement log

## Intersection pass

The first pass came with PR #12 (1d98fa2). It pointed the audit at the orrery itself and fixed ten crossings: the pinion's teeth, the knurled grip, the moon's cradle, the sun's cup and stand, the child's shoulder, and the near plane. Its script ran eight moments over 30.6 s of game time and ignored the whole `halves` group as see-through. That script is clean on `main` (0 open, 1 allowed). This pass adds what it did not cover.

**Moments added** (`scripts/intersections/games/moon-phases.ts`, 13 moments over 60 s):
- the moon walked a full orbit by hand, then scrubbed back a quarter;
- all eight phases from the strip, then a jump from new to full and back before either tween ends;
- the model turned half round to its lowest grazing view, with the moon walked half an orbit there;
- the model tipped top-down, with three phases;
- the moon walked a full orbit and set to the four quarters while the halves are shown;
- home moved three times about the globe, with the hours running on.

The halves rings are now audited. Only the see-through blue cap (`seen-cap`) is ignored, as the atmosphere, clouds and contact shadows are. Each medallion's body and face count as one piece.

**Findings, before → after** (same script, audit v3, main's code → this pass): penetration 12 open, 1 allowed and 2 hidden → 0 open, 1 allowed and 0 hidden; contained, pose, z-fight and near-clip 0 → 0.

| Finding | Why it happened | Change |
| --- | --- | --- |
| The blue ring through the moon's riser (100%, halves shown) | Both halves rings are whole circles standing upright round the moon, and the riser comes up to the cradle straight under it. | Each ring leaves a gap either side of straight down (7° for the blue ring, 8° for the gold) that clears the riser by 0.004, about 1% of the moon's radius. |
| The gold ring into the riser and cradle (74%) | As above, and the gold ring's inner edge (1.06 moon radii less its tube) sat 0.0016 inside the cradle's shell (1.03 moon radii). | The gold ring moves out to 1.07 moon radii, so it is 0.0018 clear of the cradle and 0.0018 inside the blue ring (each about half a percent of the moon's radius). The riser, cradle and ring sizes are named constants (`RISER`, `CRADLE`, `HALVES`), shared with the test. |
| The child through Earth (34%, home moved) | The child was turned by (up × forward, up, back). That set is left-handed, a mirror rather than a rotation, and the quaternion three.js takes from it is not unit length. Over 2,880 homes, hours and phases, the child never stood straight up to its zenith and was upside down in 743. It was partly inside the globe in 1,899 (up to 0.43 deep). In 736 of the 760 with the moon up, its arm pointed more than 16° off the moon. | Right is forward × up, and forward is rebuilt at right angles to up; a moon straight overhead falls back to any direction along the ground. The intended facing is unchanged: local −z towards the moon, the arm on the right. |
| Nine pairs at 0 s, plus two hidden under the table: the child inside Earth's stand (293% and 113%) and the big gear (76%), and the halves round the table's centre through the stand, the gear and the child (8% to 30%) | A resize draws the scene once before the first tick, and only `update` places the child, hides the halves and turns the gears to the arm. That frame is under the opening curtain, so no child sees it, but it is drawn, and the audit samples it whenever its first look lands before the first tick. | The scene places itself at the end of its constructor with `update(0)`, which advances no clock. |

**Allowed** (main's rule, unchanged): the moon's arm turns on Earth's stand. The stand runs up through the arm's collar, and the beam's middle is hidden inside the collar. Its measured depth varies with the moment sampled, from 166% to 199% across these runs. Like main's, the rule has no `upTo`.

**Look.** The rings look as they did, apart from a small gap where they meet the riser under the moon. The child now stands on their feet at every home and points at the moon while it is up. Nothing else in the scene changed, and the opening is the same once the curtain lifts.

**Tests** (`intersections.test.ts`):
- A new orrery is already where its first update leaves it: every object's world matrix and visibility match, the child stands on Earth, and the halves start hidden. On main's code a new orrery has the gears half a turn out, Earth and its clouds not turned to the hour, the moon's hint showing, the child at the table's centre inside Earth's stand, and the halves showing round the table's centre.
- The rings at 64 points of the orbit stay clear of the riser and the cradle, the gold one outside the moon and inside the blue one. On main's code the riser clearance is −0.034.
- At 360 homes and hours, eight phases each, the child has a unit quaternion, stands upright to its zenith with every vertex outside the globe, and points within 16° of the moon whenever it is up. On main's code the quaternion's length is 0.71.

All three fail on main's code.

**Perf.** Two parts are built once: the rings, which keep their segment counts, and the extra `update(0)` in the constructor. The only per-frame change is two cross products and a length check in placing the child.
- Counted, in the browser: draw calls 60 and triangles 242,300 on both builds.
- `OrreryScene.update` in Node (vitest, halves shown, rounds of 9,600 frames over 20 homes and eight phases and hours, 15 rounds a run, four interleaved runs a side): the fastest runs take 1.22 µs a frame on main and 1.25 µs on this pass, and run medians spread from 1.25 to 2.99 µs and from 1.29 to 2.83 µs.
- Browser A/B, main against this pass (built on d923249, before the `update(0)` line, so every per-frame path matches the final head): Playwright's bundled headless Chromium on SwiftShader, CDP 6x, 1180×820 at DPR 2, touch, `?chrome=0&tier=0`. Five seeded pairs with the order alternating, each run 30 s of phase taps, drags and the halves, reading `window.__jamPerf.cpuMs`. The software renderer manages about 30 frames a run. cpuP95 median 75.9 ms (44.4–93.7) → 84.9 ms (77.4–119.5), and cpuP50 22.1 → 26.7 ms. The paired cpuP95 differences run from −8.8 to +75.1 ms (median +1.5), and after is lower in 2 of 5 pairs.

The same build's cpuP50 swings from 18 to 38 ms between runs, far more than the microseconds that changed, so no change is measurable in the browser. Tier 0 held in every run, and `frameBudget.test.ts` passes unchanged. No physical iPad was measured.
