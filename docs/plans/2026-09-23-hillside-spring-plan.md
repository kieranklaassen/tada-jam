---
title: Hillside Spring - Plan
type: feat
date: 2026-09-23
topic: hillside-spring
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
origin: Tada Jam 10-game brief (Project store docs/jam-10-games.md, game 5) and the shared worker brief
target_repo: kieranklaassen/tada-jam (game in games/hillside-spring/)
---

# Hillside Spring - Plan

## Goal Capsule

- **Objective:** Ship `games/hillside-spring/`, a painterly (Ghibli-like) 3D toy for ages 6–10: a terraced hillside garden in afternoon sun with a spring at the top and thirsty plots below. The child places and turns bamboo pipes, a sluice gate, and a waterwheel on a coarse grid; water visibly follows gravity along whatever is built; watered plots bloom and creatures come.
- **Authority:** the repo's `AGENTS.md`, `docs/art-direction.md` (quality bar and registry), `docs/solutions/**` (entry point `docs/solutions/conventions/building-a-jam-game.md`), `CONCEPTS.md`; the Project store worker brief for perf method, iterations, media, and publishing. Tada R15 (no scores, levels, timers, unlocks, verdicts) and R20 (zero egress) are hard rules.
- **Boundaries:** touch only `games/hillside-spring/**`, one registry row in `docs/art-direction.md`, and this plan. No dependency changes.
- **Stop conditions:** stop and report if the style needs a package outside `scripts/egress-check.ts`, or a contract change beyond Δ1–Δ4.
- **Tail ownership:** LFG (simplify, review, commit, publish the branch via GitHub MCP, CI). Per the owner's steer 1, the coordinator opens the draft PR from the body the worker writes to the Project store.

## Product Contract

### Summary

A sunlit terraced hillside. A spring bubbles at the crest and its water already trickles straight down the middle, over each terrace wall, into a pond at the bottom. Wilted plots sit on the terraces to either side. The one obvious want: get the water to the thirsty garden. A rack of bamboo pieces stands at the side.

### Requirements

- **R1 — Scene and want.** The idle screen shows flowing water that misses the plots, wilted plots that lean toward the water, and a rack of pieces that look like they can be picked up.
- **R2 — Build.** Drag a piece from the rack onto a grid cell to place it; tap a placed piece to turn it a quarter turn (the sluice gate opens and shuts instead, the waterwheel gets a hand spin); drag a placed piece to move it; drag it off the hillside or onto the rack to put it back. Pieces: straight, bend, split, sluice gate, waterwheel. Nothing is limited or unlocked.
- **R3 — Gravity-honest flow.** Water only moves downhill or sideways along pipes, never uphill. A pipe end that opens onto nothing pours the water out, and the water then runs down the hill until something catches it (an uphill-facing pipe mouth), a plot drinks it, or it reaches the pond. A split halves the flow; merges add up. Water visibly advances along new paths and drains out of cut ones.
- **R4 — Material is the verdict.** No ticks, sounds of failure, or counters. A mistake just shows where the water went.
- **R5 — Bloom.** A plot that gets water blooms over a few seconds (flowers, rice, pumpkins). Bloom is kept; nothing wilts back with time. Tapping a fully bloomed plot harvests it with a pop, and it returns to a sprout that wants water again (child-initiated loop, never timed).
- **R6 — Creatures.** A frog comes to the watered rice paddy, a sparrow to the watered flowers, a sleepy tanuki to a turning waterwheel. Each has its own motion personality (idle, anticipation, reaction, gait) and reacts to a tap. They leave gently when their reason goes.
- **R7 — Waterwheel.** Water through the wheel turns it; its little mill grinds (millstone turns, flour puffs) and a windchime on the eave rings.
- **R8 — Guidance ladder.** Idle-only: glow on what can be touched after 3 s, a ghost hand demonstrating one move from the current state after 5 s, backing off (10, 20, 40 s gaps), at most four per idle stretch, any touch clears it. From 1.5 s after opening, and whenever the child stops, the thirsty sprouts ask facing the child and then lean toward the nearest running water.
- **R9 — Age dial.** `ageBand: [6, 10]`. At 6 or younger (or unknown age) a bend lies near the stream, turned the wrong way, so a single tap is the first act; older children start with an empty hillside. Nothing is gated.
- **R10 — Lossless and calm.** Every change saves through `ctx.storage` (debounced, defensive `deserialize`); pause loop and audio when unattended or hidden; `ResizeObserver`; at most three acting fingers.
- **R11 — Sound.** Synthesized Web Audio: stream babble scaled by flow, bamboo "tok" on place/turn, gate clunk, bloom chime, mill creak and windchime, creature voices. Starts inside the first tap.
- **R12 — Painterly look, kid-clear.** Procedurally painted albedo (brush strokes to canvas at runtime, atlas at most 2k) with light painted in, unlit static props, half-Lambert on moving things, a painted sky plane, slow additive light shafts, cheap scrolling-flow water. Interactive pieces are higher contrast than the soft painted background.
- **R13 — Performance.** `window.__jamPerf`, a `?fps=1` bar overlay, at least three adaptive tiers with `?tier=N`, under 80 draw calls, no shadow maps, at most one post pass, DPR cap 2, nothing allocated per frame; `cpuP95Ms` under 8 ms at 6× CPU throttle.

### Scope boundaries

- Out: levels, goals, counters, a "done" state, text, voice instructions, recorded audio, any new dependency.
- Deferred: true-GPU WebKit measurement on a Mac or iPad (not available on this VM).

## Planning Contract

### Key technical decisions

- **KTD1 — Raw three.js with one owned frame loop**, not react-three-fiber. It is Tada's tech menu (no port rewrite), keeps per-frame allocation in the game's own hands, and lets `__jamPerf.cpuMs` time exactly update plus `renderer.render`. React is only the Mount.
- **KTD2 — Flow is a pure solver over states `(cell, entry side)`.** Water enters a cell from N (falling or trickling from above) or from E/W (a pipe next door). A piece passes water from its entry opening to every other opening except N (uphill). Unmatched water falls to the cell floor and trickles south. Because a flow entering from W can only continue E or down (and vice versa), the graph is a DAG; solve row by row: N entries, then an eastward sweep, then a westward sweep. The solver returns flows, watered plots, turning wheels, and render segments with path distances.
- **KTD3 — Water is one dynamic ribbon mesh with GPU-animated fronts.** Each segment carries per-vertex arrival and departure times computed on network change (new segments arrive from the change point at a fixed speed, cut segments drain downstream). The shader scrolls a painted flow texture and hides water outside `[arrive, depart]`. Buffers are preallocated; rebuilds happen only when the build changes.
- **KTD4 — One painted atlas (2048², drawn once per page with brush strokes).** Static scenery is merged into a few meshes rendered unlit with light painted into the albedo and baked vertex tint. Moving things use a tiny half-Lambert shader with a dark rim term so pieces and creatures pop against the softer background.
- **KTD5 — Instancing everywhere repeats**: one instanced mesh per piece part (bamboo straight/bend/split, gate, wheel, hut, millstone), per crop kind, blob shadows, glows, and particles. The rack uses the same instanced meshes.
- **KTD6 — Adaptive tiers (0 → 3), Pebble Table's numbering and governor rules** from the measured frame interval and CPU time with hysteresis: tier 0 full at DPR 2 down to tier 3 minimal at DPR 1 (1.5 and 1.25 between), light shafts and particle counts cut in lower tiers, grass sway off at tier 3, touch devices start at tier 1. No post pass at any tier. (Refinement pass 13 moved to this numbering; the first build counted the other way.)
- **KTD7 — Screen-space hit tests** against projected cell, rack, plot, and creature centres, recomputed on resize.

### Assumptions

- The sluice gate auto-aligns to the water next to it when dropped (a tap toggles the gate); the wheel has no orientation.
- A plot drinks all the water that reaches it (it is a sink), so watering several plots needs splits.

## Implementation Units

- **U1 Scaffold and state.** `manifest.ts`, `index.ts`, `hillside-spring.tsx`, `state.ts` (versioned save, defensive `deserialize`, age defaults), `saveCadence.ts`. Tests beside each.
- **U2 Flow solver.** `layout.ts` (grid, plots, rack), `pieces.ts` (openings by kind and turn), `flow.ts` (KTD2). Tests: straight/bend/split routing, uphill refusal, spills, merges, splits, sluice, wheel, off-grid, pond.
- **U3 Input.** `input.ts` gesture tracker (tap vs drag, three-finger cap) with tests.
- **U4 Style spike.** `view/paint.ts` (atlas), `view/scene.ts` (terraces, sky, hills, trees, pond, rack, shafts), `view/materials.ts`, renderer, tiers, `__jamPerf`, `?fps=1`. Screenshot and measure before building further.
- **U5 Pieces and building.** `controller.ts` (rules, drag/drop/turn, save), `view/pieces.ts` (instanced bamboo, gate, wheel, mill).
- **U6 Water.** `view/water.ts` (KTD3).
- **U7 Plots.** Bloom, harvest, crops instanced (`view/plots.ts`).
- **U8 Creatures.** `view/creatures.ts` frog, sparrow, tanuki, each with its own motion routine; `creatures.ts` pure arrive/leave logic with tests.
- **U9 Audio.** `audio.ts`.
- **U10 Guidance.** `guidance.ts` (pure, tested) plus ghost hand and glows.
- **U11 Docs.** `ART.md`, `REFINEMENT.md` (30 passes), registry row.

## Verification Contract

- `npm run check` (tsc, vitest, egress, wordless) and `npm run build && npm run egress:built`.
- Perf probe (Project store `internal/jam-10-games/perf-probe.mjs`) on the production build at 1180×820, DPR 2, touch: Chromium at 4× and 6× CPU throttle (target `cpuP95Ms` < 8 ms at 6×), WebKit fps against Pebble Table in the same session, draw calls < 80.
- Idle screenshot test at 6.4 s: would a 6-year-old know what to touch?

## Definition of Done

- All units built; every quality-bar line met and stated in the PR body with measured proxies.
- 30 real refinement passes logged in `REFINEMENT.md` with perf per pass; media saved to the Project store.
- Branch `cursor/hillside-spring-eb1b` published, the PR body written to the Project store for the coordinator to open the draft PR against `cursor/pebble-table-cceb`, CI green.

## Outcome

All units shipped. Thirty passes are logged in [`games/hillside-spring/REFINEMENT.md`](../../games/hillside-spring/REFINEMENT.md) with the final measurement, and the look is documented in [`games/hillside-spring/ART.md`](../../games/hillside-spring/ART.md). Two plan points moved during refinement: the tier numbering (KTD6), and R13's "nothing allocated per frame", which measured 13.4 KB a frame and was cut to 6.5 KB (pass 20), about half of it inside three.js, with a flat heap.
