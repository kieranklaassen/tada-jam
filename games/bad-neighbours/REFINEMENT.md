# Bad Neighbours: refinement log

## Intersection pass

The street is canvas 2D, so the shared intersection audit reports it as "not audited" (no three.js scene). Each building's sprite is painted over its matter-js body, so two bodies crossing means two buildings crossing on screen. The pass is therefore a vitest, `intersections.test.ts`, that plays the real `Game` at 60 fps with seeded input, wired to the street as the component wires it. It measures:
- every pair of colliders (SAT depth, part by part);
- every thrown prop against the slab, exactly as the renderer paints it;
- every building's cells against its collider;
- the spawn point against everything already on the street.

**Scenarios:** a busy street (40 deliveries, any turn, aimed across nine cells), a tall stack (26 straight down), pieces landing on neighbours (30, dropped onto the edges of the last one), a scaffolded street (30, scaffold every 1.5 s), and a stack scaffolded as it settles (three seeds).

**Before → after** (main's model and street → this pass):

| Scenario | Worst crossing, bodies | Longest over 1 px | Locked pair | Deepest prop in the slab |
| --- | --- | --- | --- | --- |
| Busy street | 2.04 → 2.04 px | 0 → 0 ms | 0.21 → 0.21 px | 19.0 → 0 px |
| Tall stack | 0.95 → 0.95 px | 0 → 0 ms | 0.17 → 0.17 px | 19.0 → 0 px |
| Landing on neighbours | 1.56 → 1.56 px | 0 → 0 ms | 0.14 → 0.14 px | 19.0 → 0 px |
| Scaffolded street | 41.1 → 1.70 px | 39.8 s → 17 ms | 0.03 → 0 px | 19.0 → 0 px |
| Scaffolded stack (seed 100) | 10.8 → 1.73 px | 4.9 s → 50 ms | 0 → 0 px | 19.0 → 0 px |
| Scaffolded stack (seed 117) | 40.9 → 0.53 px | 17.5 s → 0 ms | 34.7 → 0.26 px | 19.0 → 0 px |
| Scaffolded stack (seed 134) | 1.31 → 0.75 px | 10.3 s → 0 ms | 0.38 → 0.26 px | 7.1 → 0 px |

No spawn ever touched anything (at least 123 px clear in every scenario), and every sprite sits on its collider to within 2e-11 px.

**What was wrong, and the change.**
- *Scaffolding flung buildings through each other and the slab.* Each scaffold is two zero-length ties between a pair, 10 px either side of where they meet, at stiffness 0.75. Matter turns a tie's pull into spin by its lever from each centre. Two ties close together work like a hinge, and at 120 Hz a stiff tie far from a small building's centre overcorrects each pass by more than the last. So a braced pair wound up until it was thrown through its neighbour or down into the slab, up to 41 px deep. Some locked into their foundations 35 px inside each other. The ties now sit a cell either side, and each is softened by its lever, so one pass corrects no more than its stretch (never above the old 0.75). A scaffolded pair now holds together: over six seeded runs of a busy, scaffolded street, 43 buildings are lost off the street instead of 151. The drop, the turn, the stack and the look are unchanged.
- *Props sank into the slab.* A thrown book, plant, sock or paper bounced with its centre 2 px above the deck, whatever its turn, so its painted outline dipped a few pixels into the slab. After the second bounce it fell straight through the slab (19 px deep, the middle of the 38 px slab). Near the edges props cut the corners (10 px), and falling beside the slab they went into its side (9 px). Now a prop lands on the part of its painted outline that is over the deck (`PROP_OUTLINES`, the rectangles `Renderer.prop` paints, checked by a test). One hanging over the edge tips off, and one falling beside the slab is held off its side. One on the deck bounces twice as before, then lies where it landed and fades out over the renderer's last half second, so the deck never fills up.

**Allowed** (inherent to a rigid-body solver, and bounded by the test): a landing or a topple may cross up to 3 px for an instant and must be apart again within 100 ms. Buildings locked into foundations keep the sub-pixel resting overlap they had when they locked (at most 0.3 px). Both are under a pixel's width on a tablet at play size, except the brief impact.

**Tests.** `intersections.test.ts` has 12 tests: the five scenarios, the three scaffolded stacks, a restored street staying settled, sprite and slab paint equal to their colliders, and props at every turn on the deck, over the edge and beside the slab. On main's model the scaffolded street and stack fail (41.1 px and 10.8 px). On main's street every scenario and all three prop tests fail (19 px in the slab, 10 px through a corner, 9 px into the side).

**Perf.** The street does the same kinds of work as before: two ties per scaffold, and one outline test per prop per frame. Counted over six seeds per scenario, playing the real `Game` at 60 fps in Node:
- A tower with no scaffolds: identical (at most 24 touching pairs and 8 awake bodies; 7.4 pair-steps and 7.0 awake body-steps a frame).
- A busy street with no scaffolds: the physics is identical (at most 20 pairs and 8 awake bodies), and props alive average 10.1 → 9.9 a frame (at most 28 in both).
- A busy, scaffolded street: pair-steps 63.7 → 60.1 a frame (at most 144 → 71 pairs). Awake body-steps rise 23.6 → 39.7 because 24.4 buildings stay on the street instead of 12.8. Props alive average 16.5 → 7.7 (at most 62 → 20).
- A scaffolded stack collapsing: awake body-steps 7.7 → 11.7, with 21.9 buildings kept instead of 20.1.
- Updating 72 props costs 0.002 → 0.004 ms a frame.

In the browser: an interleaved A/B, main against this pass, in Playwright's bundled headless Chromium with CDP 6x throttling, 1180×820 at DPR 2, touch, `?chrome=0&tier=0`. Each run seeded `Math.random`, alternated its order within the pair, played 30 s of drops, turns and scaffolds, and read `window.__jamPerf.cpuMs`. Six pairs per scenario:
- scaffolded street: cpuP95 median 11.6 ms (4.8–20.1) → 9.4 ms (7.5–14.8), cpuP50 3.0 → 2.9 ms, and after is lower in 2 of 6 pairs;
- plain street: cpuP95 median 10.7 ms (7.1–22.5) → 10.9 ms (5.4–15.9), cpuP50 3.0 → 3.0 ms, and after is lower in 4 of 6 pairs.

The pairs differ both ways by more than the medians move, so no change is measurable against the shared VM's noise. Tier 0 held in every run. `frameBudget.test.ts` passes unchanged, and the governor and tiers are untouched.
