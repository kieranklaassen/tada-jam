---
title: Critter Clay - Plan
type: feat
date: 2026-09-23
topic: critter-clay
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
origin: Tada Jam 10-game brief (Project store docs/jam-10-games.md, row 1) and the shared worker brief
target_repo: kieranklaassen/tada-jam (game in games/critter-clay/)
---

# Critter Clay - Plan

## Goal Capsule

- **Objective:** A wordless iPad toy for ages 4–9: a sleepy plasticine lump sits on a turntable on a clay workshop bench; the child presses clay parts onto it (legs, eyes, ears, tails, a head, horns), taps its nose, and it wakes and toddles around the bench with a gait that comes from what it was given. Parts pull off again, so every critter can be remade. Several woken critters wander and react to each other.
- **Product authority:** The jam brief (Project store `docs/jam-10-games.md`, row 1, and the worker brief), then the repo rules: `AGENTS.md`, `docs/art-direction.md`, `docs/solutions/**`, `CONCEPTS.md`, `.claude/skills/jam-game-creator/SKILL.md`. `games/pebble-table/` is the reference implementation.
- **Style:** Claymation 3D, second entry (owner-approved). It must be unmistakable from Pebble Table: a workshop bench in cool daylight, cobalt / lemon / bubblegum-pink plasticine on a slate-blue board; no dining table, no terracotta on sage.
- **Open blockers:** None.
- **Stop conditions:** Stop and report instead of guessing if the game would need a new dependency, a change outside `games/critter-clay/**` (other than one registry row in `docs/art-direction.md` and this plan), or a contract change beyond the jam allowances.
- **Tail ownership:** `lfg` owns simplify, review, commit, PR, and CI after the build. Publishing goes through the GitHub MCP when `git push` is refused.
- **Product Contract preservation:** Product Contract bootstrapped from the brief; no upstream requirements doc.

## Product Contract

### Summary

One scene, one want: the sleepy lump needs parts, and its nose wakes it. Everything the child adds changes how the critter moves, so the child learns by making. There is no wrong critter, no score, and no end.

### Requirements

- R1. A sleepy clay body on a turntable reads as asleep at a glance (closed-eye marks, slow breathing, a snore bubble) and has a round nose in a contrasting colour.
- R2. A tray of clay parts on the right of the bench: two legs (stubby, long), an eye, three ears (round, pointy, floppy), two tails (curly, long), a big head, a horn. Taking a part never empties the tray: the slot regrows, cycling through cobalt, lemon, and pink.
- R3. Dragging a part near any body snaps it to that body's next free attach point with a squish (part squashes on, body wobbles) and a soft splodge sound. Attach points for the dragged part's family glow while dragging. A full family (6 legs, 3 eyes, 2 ears, 1 tail, 1 head, 2 horns) refuses the part, which flies back to the tray.
- R4. Parts lay themselves out by count (one leg under the middle, two legs as a pair, six as three per side; one eye centred, three as a triangle), so every creation looks intentional. With a head attached, the eyes, ears, horns, and nose move onto the head.
- R5. Dragging an attached part stretches it, then it pops off and follows the finger. Released away from a body, it flies back into the tray. Works on sleeping and awake critters.
- R6. Tapping the sleeper's nose wakes it: anticipation inhale, eyes open, yawn, shake, hop off the turntable. A new blank lump plops onto the turntable (while fewer than four critters are awake).
- R7. Form drives motion. Leg count picks a distinct gait routine: none inches like a worm, one pogo-hops, two waddle, three lope, four trot, five or six scuttle. Long legs stride slower and higher, stubby legs patter; mixed legs limp. A big head makes the critter top-heavy and wobbly; a tail steadies it and swishes for balance; floppy ears flap with follow-through; googly pupils lag.
- R8. Awake critters wander the bench (never over the tray or the turntable), pause to play an idle routine picked by their most distinctive feature, and react to each other when they meet with a temperament-specific reaction. Tapping an awake critter makes it react. Dragging an awake critter carries it (legs paddle); dropping it on the turntable puts it back to sleep there for remaking, if the turntable holds a blank lump or nothing.
- R9. Every touch has motion and sound, including a touch on empty bench (a thumbprint dent and a soft pat).
- R10. Guidance ladder (3–4 row of the wordless-clarity cue table): first-open invitation (a tray leg hops, at most three times), glow on what can be touched after 3 s idle, a ghost-hand demonstration of one next act after 5 s (give a part → tap the nose → carry a critter to the turntable, chosen from state), backing off 10, 20, 40 s, at most four per idle stretch; awake critters turn toward a sleeper that is ready to wake. Any touch clears it all.
- R11. Lossless: the sleeper, every awake critter (parts, colour, place, temperament), and the tray colours persist through `ctx.storage`; a defensive `deserialize` repairs or defaults anything malformed.
- R12. Age is a dial: younger children get a larger magnet radius and demonstrations that start with legs; older children get demonstrations that suggest a head or tail. Nothing is gated.
- R13. No words or numerals on the kid side; no voice instructions; no scores, timers, counters, or verdicts (Tada R15); zero egress (Tada R20).

### Scope Boundaries

- No colour picker, no free sculpting, no loose parts left on the bench, no critter naming. More than four awake critters is out (the turntable stays empty until one is carried back).

## Planning Contract

### Key Technical Decisions

- KTD1. **Everything that repeats is instanced, including every critter.** One `InstancedMesh` per part geometry (shared by the tray, all critters, and the dragged part), one for bodies, one each for noses, face marks, eye whites, pupils, and lids. Draw calls stay flat (about 25) however many critters exist. Per-instance colour carries the plasticine hue; vertex colours carry baked AO.
- KTD2. **One shared procedural thumbprint and tool-mark normal map** on a `MeshStandardMaterial`; a second variant of the same material adds the stop-motion boil in the vertex shader (per-instance amount and seed, time stepped at 12 fps) only for moving instances.
- KTD3. **No EffectComposer.** ACES tone mapping in the renderer and one full-screen overlay triangle (vignette plus a 12 fps stepped grain) drawn last with no render target. It is the only full-screen pass, and the lower tiers drop it.
- KTD4. **Adaptive quality tiers** from measured frame intervals with hysteresis: DPR 2 → 1.5 → 1.25 → 1; tier 1 drops the overlay pass, tier 0 drops the normal map. `?tier=N` pins a tier; `?fps=1` shows a wordless bar-graph overlay. `window.__jamPerf` exposes per-frame CPU time (update plus render submit), tier, draw calls, and triangles.
- KTD5. **Zero per-frame allocation.** Fixed pools, scratch vectors and matrices, no array helpers in the frame loop. One render loop owns update, render, and measurement.
- KTD6. **No physics engine.** Critters move on the bench plane with simple steering (wander target, turn-rate limit, separation, bounds); parts fly on scripted arcs.
- KTD7. **Game logic is framework-free.** Pure modules (`parts`, `state`, `gait`, `wander`, `guidance`, `input`, `saveCadence`, `perf`) with tests; `controller.ts` owns runtime state and hit testing through a projector; the view only reads it.
- KTD8. **Distinct motion routines, not parameter variants.** Six gait functions, seven idle routines, and four reactions, each its own curve, plus the sleeper's breathing and the waking sequence.

### Implementation Units

- U1. **Scaffold and pure model.** `manifest.ts`, `index.ts`, `critter-clay.tsx`, `parts.ts` (kinds, families, capacities, hues, count-based layout), `layout.ts` (bench, turntable, tray slots), `state.ts` (saved shape, defaults by age, attach/detach/wake/sleep operations, `deserialize`/`serialize`). Tests: `parts.test.ts`, `state.test.ts` — capacity refusal, layout by count, head moves face parts, corrupt and older saves default safely, ids unique, colour cycle.
- U2. **Motion and guidance logic.** `gait.ts` (profile from parts; one pose function per routine), `wander.ts` (targets inside the walkable area, separation, meeting detection), `guidance.ts` (scheduler, hint choice, hand pose), `input.ts` (gesture tracker, at most three fingers), `saveCadence.ts`, `perf.ts` (rolling buffer, tier controller). Tests beside each: routine per leg count, head and tail modifiers, walkable bounds, timings 3/5/10/20/40 s and four-demo cap, fourth finger cancels, tier hysteresis.
- U3. **Controller.** `controller.ts`: tray pulls, part drag and snap, pull-off stretch, nose tap wake, critter carry and turntable sleep, empty-bench touch, meetings, save cadence, guidance view. Test with a fake projector: attach, refuse, pull-off return, wake spawns a new lump, cap of four, pause cancels gestures and saves.
- U4. **View.** `view/clay.ts` (palette, geometry helpers, normal map, materials with boil, overlays), `view/shapes.ts` (parts, body, bench, props, turntable, tray), `view/stage.tsx` (canvas, camera, lights, single render loop with perf and tiers, overlay pass), `view/scene.tsx` (instanced binding), `view/hand.ts` (ghost-hand sprite texture).
- U5. **Sound.** `audio.ts`: raw Web Audio, created in the first tap, suspended while unattended: squish, pop-off, snore, yawn, per-gait footsteps, reactions, pat.
- U6. **Style registration and refinement.** `ART.md`, one row in `docs/art-direction.md` §3, `REFINEMENT.md` with 30 measured passes and a "Still weak" section.

### Sequencing

U1 → U2 → U3 → U4 (style spike screenshot and first perf probe here) → U5 → first publish and draft PR → U6 iterations → final publish.

## Verification Contract

- `npm run check` (TypeScript, vitest, egress scan, wordless check) and `npm run build && npm run egress:built`.
- Perf probe (Project store `internal/jam-10-games/perf-probe.mjs`) on the production build at 1180×820, DPR 2, touch: Chromium at 4× and 6× CPU throttle (target `cpuP95Ms` under 8 ms at 6×), WebKit fps against Pebble Table measured in the same session; draw calls under 80; one full-screen pass at most; no shadow maps.
- Idle screenshot after about 6.4 s (glow and a demonstration in frame) and a scripted walkthrough of the core loop captured with a stepped Playwright clock.

## Definition of Done

- The game plays end to end: build, wake, wander, meet, remake, carry back to sleep; reload restores everything.
- Every quality-bar line is met and stated in the PR with measured numbers.
- 30 refinement passes logged; media saved to the Project store; draft PR open against `cursor/pebble-table-cceb` with green CI.
