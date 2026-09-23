---
title: Felt Meadow - Plan
type: feat
date: 2026-09-23
topic: felt-meadow
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: jam-10-games worker brief (Project store docs/jam-10-games.md, row 2)
execution: code
target_repo: kieranklaassen/tada-jam (game in games/felt-meadow/)
---

# Felt Meadow - Plan

## Goal Capsule

- **Objective:** Ship Felt Meadow, a wordless needle-felted hillside toy for ages 4–7 where a child plants felt seeds in three molehills, watches them bloom, and discovers colour mixing because a felt bee that visits two different colours drops a seed of the mixed colour.
- **Product authority:** The jam's 10-game brief (row 2, "Felt Meadow") and the shared worker brief. Repo rules win on mechanics: `AGENTS.md`, `docs/art-direction.md`, `docs/solutions/**`, `CONCEPTS.md`, `.claude/skills/jam-game-creator/SKILL.md`. `games/pebble-table/` is the reference implementation.
- **Style:** Felted wool 3D (reference `02-felted-wool.png`), claimed in the `docs/art-direction.md` registry in the same PR.
- **Boundaries:** Touch only `games/felt-meadow/**`, one registry row in `docs/art-direction.md`, this plan. No dependency changes.
- **Stop conditions:** Stop and report if the game would need a new dependency, a harness or contract change, or anything that breaks R15 (no scores, counters, timers, unlocks) or R20 (zero egress).
- **Tail ownership:** LFG owns simplify, review, commit, publish, PR, and CI.

## Product Contract

### Summary

A felted hillside on a nature table: three bare molehills, a cream felt seed pouch holding a red, a yellow, and a blue seed, and one felt bee. The child drags a seed into a molehill; it sprouts and blooms into a flower of the seed's colour. The bee visits flowers on its own (or when a flower is tapped), carries a pollen ball of each colour on its legs, and after two different colours it loops and drops a seed of the mixed colour. Flowers can be picked back into seeds. A snail and a mouse wander with their own personalities. The meadow's look mirrors the real season.

### Requirements

**Core play**
- R1. The pouch always offers one red, one yellow, and one blue seed at its mouth; a taken seed is replaced by the pouch.
- R2. Dragging a seed into an empty molehill plants it: the soil takes it, a sprout rises, a bud swells, and the petals open with overshoot into a flower of the seed's colour.
- R3. A seed dropped on the grass rests where it lands; dropped on an occupied molehill it tumbles off to the grass beside it; a primary seed dropped on the pouch goes back in; a seed dropped off the hill comes back to the nearest grass.
- R4. Dragging a flower picks it: it pulls out of the molehill and folds into a seed of its colour under the finger. Nothing is ever lost.
- R5. The bee visits bloomed flowers by itself and flies to a flower the child taps. Each visit adds a pollen ball of that flower's colour to its legs (the two most recent different colours are kept).
- R6. After visiting two different colours the bee loops, its two pollen balls merge into one seed of the mixed colour, and it carries that seed to the nearest empty molehill and drops it on the grass beside it (or anywhere on the grass when every molehill is full), unless the grass already holds three or more loose seeds, in which case it keeps its pollen until there is room. The pollen stays in the save until the drop, so leaving mid-flight loses nothing.
- R7. Colour mixing is pigment union over red, yellow, and blue: red+yellow=orange, yellow+blue=green, red+blue=purple, and any mix containing all three is brown. Mixing a colour with one it contains returns the same colour.
- R8. The grass holds at most eight loose seeds; past that, the oldest loose primary seed rolls back into the pouch.

**Characters and life**
- R9. Every character has its own motion personality (idle, anticipation, reaction, gait): the bee bumbles and banks, the snail glides by peristalsis and hides in its shell when tapped, the mouse darts and freezes and runs back to its burrow when tapped, flowers sway on spring stems and bend under the bee, the pouch breathes and wiggles, empty molehills heave gently.
- R10. Every touch lands with motion and a synthesized felt sound (muffled thuds, pops, a note per colour on bloom, a soft buzz that follows the bee).

**Clarity and guidance (youngest age 4, row 3–4 of the cue table)**
- R11. No words or numerals on the kid side; no voice.
- R12. Guidance ladder: on first open the pouch wiggles and its seeds bounce (at most three times). After 3 s idle, a glow ring breathes on the one next act (a seed and its target molehill). After 5 s a ghost hand demonstrates that one move; demonstrations back off (10, 20, 40 s gaps) and stop after four; something the child is watching (a bloom, the bee's seed) delays the next one without restarting the ladder. Any touch clears it.
- R13. The next act is chosen from state: plant a loose seed, else plant a pouch seed, else tap a flower the bee has not visited, else pick a flower to make room.
- R14. While idle with an empty molehill, the bee hovers over it (points with its body).
- R15. Age is a dial: at 4 the bee visits on its own more often; at 6–7 it waits longer, so tapping flowers (planning a cross) matters more. Nothing is gated.

**Contract and persistence**
- R16. State (plots, loose seeds, bee pollen) is small versioned JSON saved through `ctx.storage` on every meaningful change and read through a defensive `deserialize`. A seed mid-drag is saved as a loose seed where the finger is.
- R17. The loop, audio, and world time pause while unattended or hidden. A `ResizeObserver` watches the surface and ignores 0×0.
- R18. At most three fingers act; a fourth cancels every gesture until the hand lifts.
- R19. Δ1 calendar mirror: the month picks spring, summer, autumn, or winter tints and small felt decorations (hemisphere from `ctx.childCountry` when given). It never changes what is possible.

**Performance**
- R20. `window.__jamPerf = { cpuMs, tier, drawCalls, triangles, reset() }` is filled from the frame loop; a hidden `?fps=1` bar graph overlay; `?tier=N` pins a tier.
- R21. At least four quality tiers driven by measured frame time with hysteresis: DPR 2 → 1.5 → 1.25 → 1, cutting the tilt-shift blur, the post pass, and the fuzz shells in steps.
- R22. Under 80 draw calls, at most one full-screen pass, no shadow maps, DPR capped at 2, geometry built once, nothing allocated per frame. Target `cpuP95Ms` under 8 ms at 6× CPU throttle.

### Scope Boundaries

- No new dependencies; no edits to `harness/`, `scripts/`, `package*.json`, CI, or other games.
- No counts, collections, albums, or "all colours found" states (R15).
- Tertiary colours (red-orange and so on) are out; the seven pigment-union colours are the whole palette.

## Planning Contract

### Key Technical Decisions

- KTD1. **Raw three.js view, not react-three-fiber.** The Mount owns one canvas and a `MeadowView` class that builds the scene once and runs its own rAF loop. This gives exact control of the frame loop (for `__jamPerf` and zero per-frame allocation), drops the jam-only R3F allowance, and ports to Tada without a rewrite.
- KTD2. **Felt is a Lambert material with three cheap additions:** a procedural fibre normal map, a heather texture that varies the dye per pixel, and a fresnel sheen added as emissive. Contact occlusion is baked into vertex colours; shadows are instanced blobs.
- KTD3. **Fuzz is an inverted hull, not fur shells.** Hero meshes are drawn a second time pushed out along their normals, back faces only, after the base mesh, so depth testing rejects the interior and only a thin silhouette band is shaded. That band discards fragments against fibre noise and a screen-space dither, so it needs no blending or sorting. Fuzz lives on the bee, the flower heads, and the molehills only, as three instanced draws.
- KTD4. **Value split fixes the style's weakness.** The hill is a mid-dark heathered moss; characters, seeds, and flowers are either much lighter or much darker than it and more saturated. The fuzz halo is light, so every hero object gets a pale rim against the ground. Seeds at the pouch sit against the pouch's dark interior.
- KTD5. **Colours are 3-bit pigment masks** (R=1, Y=2, B=4) and mixing is bitwise OR. Saved as the integer.
- KTD6. **One post pass, tier-gated.** A single full-screen shader does tilt-shift blur (top tier only), a warm grade, and a vignette. Colours are authored in display space (`flat`, no tone mapping), so dropping the pass in low tiers barely changes colour.
- KTD7. **Tiers from rAF frame intervals.** One-second windows of frame interval drive a tier controller: a window averaging over 21 ms drops one tier (over 34 ms drops two), eight seconds of windows at full rate (under 18 ms) try one tier up, a tier that has failed twice becomes a ceiling for the session (no oscillation), and each change is followed by 0.6 s of settling that is not measured.
- KTD8. **Pure modules for everything but drawing:** colours, layout/terrain, meadow rules and persistence, bee brain, critter brains, guidance, input, save cadence, season, perf tiers. Each has vitest tests.
- KTD9. **Screen-space hit testing** through a projector the view hands the controller (as in Pebble Table), with drag positions found by intersecting the finger ray with the terrain (five fixed-point steps).

### High-Level Design

```
felt-meadow.tsx (Mount) ── loads state ─▶ MeadowController (rules, input, sound, save, guidance, bee, critters)
        │                                        ▲  reads view snapshot (preallocated)
        └─ <div> + canvas ─▶ MeadowView (three.js scene, rAF loop, tiers, post pass, __jamPerf)
```

### Sequencing

Scaffold and pure rules first (U1–U3), then the style spike on the real scene (U4–U5), first publish, then characters, guidance, sound, perf tiers (U6–U9), then 30 refinement passes (U10) and docs (U11).

## Implementation Units

### U1. Scaffold and manifest
- **Goal:** `manifest.ts` (`ageBand: [4, 7]`, `permissions: ['storage']`), `index.ts` (emoji 🌼), `felt-meadow.tsx` Mount with attention, visibility, and storage load.
- **Requirements:** R16, R17.
- **Files:** `games/felt-meadow/manifest.ts`, `index.ts`, `felt-meadow.tsx`.
- **Verification:** `test/games.test.ts` passes for the new folder.

### U2. Pure rules: colours, layout, meadow state
- **Goal:** Colour masks and mixing, terrain height and plot/pouch/grass layout, meadow state with plant/pick/drop/bee-seed/overflow rules, `serialize`/`deserialize`.
- **Requirements:** R1–R8, R16.
- **Files:** `colors.ts`, `layout.ts`, `meadow.ts` with tests.
- **Test scenarios:** mixing table (all pairs, idempotence, brown); planting into empty vs occupied plot; picking returns the flower's colour; overflow returns the oldest primary; corrupt and old saves deserialize to a valid meadow.

### U3. Pure brains: bee, critters, guidance, input, save cadence, season, perf tiers
- **Goal:** Bee state machine (wander, fly to flower, land, sip, take off, loop and drop a mixed seed, startle), snail and mouse brains, guidance scheduler and `chooseHint`, gesture tracker (max three fingers), save cadence, season from month and hemisphere, tier controller with hysteresis.
- **Requirements:** R5–R6, R9, R12–R15, R18–R21.
- **Files:** `bee.ts`, `critters.ts`, `guidance.ts`, `input.ts`, `saveCadence.ts`, `season.ts`, `perf.ts` with tests.

### U4. Felt materials and geometry
- **Goal:** Procedural fibre normal and heather textures, felt Lambert material with sheen, inverted-hull fuzz material with dithered fringe, geometry builders for hill, backdrop, molehill, seed, pouch, flower parts, bee, snail, mouse, all built once.
- **Requirements:** R9, R22; KTD2–KTD4.
- **Files:** `view/felt.ts`, `view/geometry.ts`.

### U5. Scene, stage, and controller binding (style spike)
- **Goal:** `MeadowView` with camera, lights, models, blob shadows, glow rings, ghost hand, post pass, and a `MeadowController` that binds input and rules. Screenshot at 1180×820 DPR 2 and first perf probe. First publish.
- **Requirements:** R1–R4, R17, R20, R22.
- **Files:** `controller.ts`, `view/view.ts`, `view/post.ts`, `view/models.ts`.

### U6. Characters and personalities
- **Goal:** Bee flight, landing, sipping, pollen balls, loop and seed drop; flower sprout/bloom/sway/bend/pick; snail and mouse; pouch and molehill life.
- **Requirements:** R5, R6, R9, R14.

### U7. Guidance ladder in the view
- **Goal:** First-open pouch wiggle, glow rings, felt ghost hand sprite with a carried seed.
- **Requirements:** R12–R14.

### U8. Sound
- **Goal:** `audio.ts`: raw Web Audio felt sounds, a note per colour, continuous bee buzz tied to flight, dark small-room reverb, unlocked on first touch, suspended when unattended.
- **Requirements:** R10, R17.

### U9. Perf tiers, overlay, instrumentation
- **Goal:** Tier switching (DPR, blur, post, fuzz), `?tier=N`, `?fps=1` bar overlay, `__jamPerf`, `renderer.info` with manual reset.
- **Requirements:** R20–R22.

### U10. Thirty refinement passes
- **Goal:** Screenshot or record → critique → one fix → re-measure (`cpuP95Ms` at 6× and draw calls), logged in `REFINEMENT.md`.

### U11. Art guide, registry, PR body
- **Goal:** `ART.md`, one registry row in `docs/art-direction.md`, media in the Project store.

## Verification Contract

- `npm run check` (TypeScript, vitest, egress, wordless) and `npm run build && npm run egress:built`.
- Perf: the shared probe on the production build at 1180×820, DPR 2, touch: Chromium at 4× and 6× throttle (`cpuP95Ms` < 8 ms at 6×), WebKit fps against Pebble Table measured in the same session (8.4 fps baseline), draw calls < 80.
- A scripted Playwright walkthrough of the core loop (plant, bloom, bee mix, pick) with `page.clock` capture for the walkthrough video and the idle guidance screenshot at 6.4 s.

## Definition of Done

- Every requirement R1–R22 holds in the running game, with tests for the pure modules.
- `REFINEMENT.md` logs 30 real passes and a "Still weak" section; `ART.md` exists; the registry row is added.
- Media in the Project store: `hero.png`, `iter-01/10/20/30.png`, `walkthrough.mp4` (30–60 s, H.264).
- Checks green, clean `git status`, draft PR open against `cursor/pebble-table-cceb`, CI green.
- No debug code or abandoned experiments left in the diff.
