---
title: Bedtime Forest - Plan
type: feat
date: 2026-09-23
topic: bedtime-forest
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: owner jam brief (Project store docs/jam-10-games.md, row 10) plus the shared worker brief
execution: code
target_repo: kieranklaassen/tada-jam (game in games/bedtime-forest/)
revision: 1 (2026-09-23, implementation-ready, ce-plan via lfg pipeline)
decision_tags: "`decided (brief)` = settled by the jam brief; `assumed default` = the recommended default taken because the owner could not be asked"
---

# Bedtime Forest - Plan

## Goal Capsule

- **Objective:** Ship a wordless iPad toy for a 4-year-old: a storybook forest clearing at dusk where six yawning animals wander and six homes wait around the edge. The one want is to put the sleepy animals to bed. When everyone sleeps, the moon rises, stars come out, a lullaby plays, and morning wakes everyone again. It is the jam's picture-book gouache showcase.
- **Product authority:** The jam brief row for Bedtime Forest (scene, core play, ageBand 4–6, gouache style, technique list) and the worker brief (perf method, 30 iterations, publishing). Repo rules: `AGENTS.md`, `docs/art-direction.md`, `docs/solutions/**`, `CONCEPTS.md`, `.claude/skills/jam-game-creator/SKILL.md`.
- **Open blockers:** None.
- **Where it is built:** `games/bedtime-forest/` only, plus one registry row in `docs/art-direction.md` §3 and this plan.
- **Stop conditions:** A new dependency, a harness or contract change, or a product behavior this plan does not define.
- **Tail ownership:** `lfg` owns simplify, review, commit, PR, and CI after `ce-work` returns. Publishing follows the worker brief (git push, else GitHub MCP).

---

## Product Contract

### Summary

A clearing painted like an Elsa Beskow picture book: opaque gouache fields, dry brush, a loose brown ink line around everything. Six animals (owl, fox, rabbit, bear, fish, songbird) wander and yawn. Around the clearing sit their homes (tree hollow, den, burrow, cave, pond, nest). The child picks an animal up; it dangles and wriggles with its weight; the child carries it to a home. The right home takes it in with a cosy settle: it curls up, snores, and a window glows. A wrong fit corrects itself physically, never with a verdict. When all six sleep, the night comes; then morning; then the animals are sleepy again. A calm loop, not a level.

### Requirements

- **R1 `decided (brief)`** Scene: a dusk forest clearing, six homes around the edge, six animals wandering inside. Nothing else competes for attention.
- **R2 `decided (brief)`** Pick up an animal with one finger: it lifts, stretches, dangles from the grab point with a pendulum swing proportional to its weight, and wriggles in its own way. Releasing over open ground drops it with a squash landing.
- **R3 `decided (brief)`** Releasing over a home carries the animal in. Its own home: a cosy settle (curl up, snore, the window glows).
- **R4 `decided (brief)`** A wrong home corrects itself physically, specific to the mismatch: too big for the entrance bumps out (bear in burrow); a land animal in the pond splashes out and shakes dry; a ground animal in a tree home slides down or tips the nest; a small animal in a big home shivers in the draught and hops out; the fish flops out of any dry home and wriggles back to the pond; the owl hops out of a ground home and flaps to its hollow; the songbird flutters out to its nest. An occupied home bumps the newcomer out gently. No ticks, crosses, "wrong" sounds, or sad faces.
- **R5 `decided (brief)`** All six asleep: the moon rises, stars come out one by one, a synthesized lullaby plays (a music-box "Twinkle Twinkle", public domain). Then morning: the sky brightens, birds sing, each animal wakes with its own stretch and comes out to wander. The light eases back to dusk and the yawning starts again.
- **R6 `decided (brief)`** Every animal has its own motion personality: idle, walk or gait, yawn, dangle, reaction, and sleep pose. No two share a routine with only different parameters, and none reuses Pebble Table's motions.
- **R7 `decided (brief)`** Animals gaze toward their home when the child is idle (character pointing).
- **R8** Guidance ladder, idle only: after 3 s one awake animal gets a breathing painted ring; after 5 s a ghost hand presses it and drags part of the way toward its home (a move, not the whole answer); gaps of 10, 20, 40 s; at most four demos per idle stretch; any touch clears everything. First open: one animal does a big invitation yawn toward the child, at most three times, and until the first touch the ring and the ghost hand show that same animal (added in refinement pass 30). No guidance during the night.
- **R9** Tapping an animal plays its personality reaction and voice (two per animal, taken in turns, added in refinement pass 29); tapping a sleeping animal makes it murmur and shift without waking; tapping a home knocks on it, and its animal, if up and about, stops, looks at it, and calls (added in refinement pass 26); touching the moon at night chimes (a hidden delight).
- **R10** Wordless: no words, numerals, or pictorial icons on the kid side; no voice instructions (`npm run wordless:check`).
- **R11** Age is a dial (Tada R8): at `childAge` 4 or under (or `null`), a carried animal looks and leans toward its home; from 5 up that lean is off and only the idle gaze remains. Nothing is gated.
- **R12** Lossless exit: put-away at any instant resolves every in-flight state (carried, flying, reacting) to a resting one; saved state is small, versioned JSON read by a defensive `deserialize`.
- **R13** Attention: the render loop, world time, and audio pause while unattended or hidden. `ResizeObserver` drives the canvas; 0×0 is ignored.
- **R14** At most three fingers act; a fourth cancels everything until the hand lifts.
- **R15 (Tada)** No scores, counters, streaks, timers, levels, unlocks. Nothing counts nights.
- **R16 (Tada R20)** Zero egress: every texture drawn on a canvas at startup, every sound synthesized.

### Acceptance Examples

- Carry the rabbit to the burrow: it wriggles in, curls up, the burrow window glows, soft snoring starts. Save carries `rabbit: asleep`.
- Carry the bear to the burrow: the bear squashes against the entrance, pops back out onto its bottom, rubs its head, and looks toward the cave. Not asleep.
- Carry the fish to the nest: it flops out and wriggles across the grass into the pond, where it settles.
- Carry the owl to the burrow: it hops out and flaps up to the hollow, where it settles.
- Put the last animal to bed: the moon rises, stars appear, the lullaby plays, then morning comes and all six wander again.
- Four fingers down: nothing moves; everything held drops gently.
- Park mid-carry, reload: the animal is on the ground, awake; the others are where they were.

### Scope Boundaries

- No new dependencies. No harness, script, CI, or other-game edits.
- No text, counters, or collection of any kind. Nothing remembers how many nights passed.
- No grown-up corner (Δ4 unused). No spoken words (Δ3 unused).

---

## Planning Contract

### Key Technical Decisions

- **KTD1 Rendering stack:** react-three-fiber for the canvas and scene graph, raw three.js `ShaderMaterial`s for the look, and a hand-written render loop (a `useFrame` at priority 1 that renders into a render target and then draws one full-screen quad). This avoids the postprocessing composer's extra passes and lets the game time exactly its update plus `gl.render` submit.
- **KTD2 Gouache material:** one shader for every painted surface: vertex colour albedo, half-Lambert light split into three painted bands (cool shadow, mid, warm light) whose edges are perturbed by a procedural dry-brush texture, so each band edge looks dragged. Pigment value varies with the same texture. Atmospheric depth and the day/night grade are uniforms shared by every material (one update per frame).
- **KTD3 Rigid "part skinning" for animals:** each animal is one merged geometry with a per-vertex `part` index. The vertex shader applies `parts[part]` (a uniform array of up to 12 world matrices), so an animal costs one fill draw plus one ink draw, however many limbs it has. Poses are computed on the CPU into preallocated matrices.
- **KTD4 Ink line:** inverted hulls (back faces, pushed out along the normal in view space so the line keeps a steady on-screen width) with a per-vertex `ink` width attribute from low-frequency noise, so the line swells and thins like a brush. Ink is warm brown, never black.
- **KTD5 One post pass:** a full-screen quad that samples the scene texture at a UV nudged by a static noise vector (edge wobble), multiplies a static procedural paper grain, and adds a faint vignette. No depth read. The bottom tier skips it and renders straight to the screen.
- **KTD6 Sky in one draw:** the sky is a screen-space quad drawn behind everything (depth at the far plane, drawn after opaques so covered pixels are rejected): dusk-to-night-to-dawn gradient, a painted far treeline, the moon, and hashed stars that reveal one by one.
- **KTD7 Performance:** zero allocation per frame (fixed arrays, preallocated math objects, no per-frame closures or React state). `window.__jamPerf` exposes a 600-frame ring of CPU ms, tier, draw calls, triangles. Four tiers (DPR 2, 1.5, 1.25, 1), chosen by measured frame interval with hysteresis; lower tiers cut the post pass, particles, and fireflies. `?tier=N` pins a tier and `?fps=1` shows a wordless bar-graph overlay.
- **KTD8 Pure modules:** rules (fit matrix and reactions), the day/night cycle, the animal brain (wander, carry, react, sleep), guidance, input, save cadence, and state are pure, deterministic (seeded RNG), and tested in Node. The controller wires them; the view only reads.
- **KTD9 Sound:** raw Web Audio, created inside the first tap, suspended while unattended, rebuilt if WebKit leaves it interrupted. Every animal has its own voice and yawn; the lullaby is a music box plus a soft pad.

### High-Level Technical Design

```
bedtime-forest.tsx (Mount) ── loads state ─▶ ForestController (rules, brains, cycle, guidance, input, save, sound)
        │                                              ▲ step(dt) each frame
        ▼                                              │
view/stage.tsx: Canvas + camera + render loop ── World (animals, homes, sky, overlays) read controller snapshot
        │
        └─ render target ─▶ paper/wobble quad (tier ≥ 1)       perf.ts: __jamPerf, tiers, ?fps overlay
```

### Output Structure

```
games/bedtime-forest/
  manifest.ts, index.ts, bedtime-forest.tsx, ART.md, REFINEMENT.md
  layout.ts, animals.ts (specs), rules.ts, cycle.ts, brain.ts, guidance.ts, input.ts, saveCadence.ts, state.ts,
  controller.ts, audio.ts, perf.ts, rng.ts (+ *.test.ts beside each pure module)
  view/ gouache.ts, geometry.ts, creatures.ts, rigs.ts, scenery.ts, sky.ts, post.ts, stage.tsx, world.tsx, overlays.ts
```

## Implementation Units

### U1. Specs, layout, rules, state
Animal specs (size, weight, home), home layout around the clearing, the fit and reaction matrix, and the saved state with defensive `deserialize`. Tests: every animal settles only in its own home; every wrong pair has a named physical reaction; the fish and owl always end at home; deserialize survives garbage and old shapes.

### U2. Brain and cycle
Per-animal behaviour (wander, pause, yawn, gaze, held with pendulum dangle, fall, fly to home, settle, asleep, react, wake, exit) and the dusk → night → morning → dusk cycle. Tests: wandering stays in the clearing; reactions resolve; all asleep starts the night; morning wakes everyone in turn; pausing freezes time.

### U3. Input, guidance, save cadence, controller
Gesture tracker (three fingers max), guidance ladder, save cadence, and the controller that maps screen touches to animals and homes through a projector. Tests: carry to the right home saves `asleep`; wrong home reacts; four fingers cancel; guidance timing and choice; pause mid-carry is lossless.

### U4. Gouache look spike
Materials, ink hulls, paper pass, sky, scenery, and one animal; screenshot at 1180×820 DPR 2 and measure; register the style.

### U5. All six animals with personalities
Geometry and rigs for owl, fox, rabbit, bear, fish, songbird: each with its own idle, gait, yawn, dangle, reaction, and sleep pose.

### U6. Overlays, night, and sound
Blob shadows, glow ring, ghost hand, window glows, particles (splash, bubbles, leaves, fireflies), moon and stars, the lullaby, and every animal voice.

### U7. Perf instrumentation and tiers
`__jamPerf`, tier controller, `?tier`, `?fps` overlay, probe runs at 4× and 6× throttle and in WebKit against Pebble Table.

### U8. Thirty refinement passes, media, PR
`REFINEMENT.md` with 30 measured passes, `ART.md`, hero and iteration shots, walkthrough video, draft PR.

## Verification Contract

- `npm run check` (TypeScript, vitest, egress, wordless) and `npm run build && npm run egress:built` pass.
- Shared perf probe on the production build at 1180×820, DPR 2, touch: Chromium at 4× and 6× CPU throttle (target `cpuP95Ms` < 8 ms at 6×), WebKit fps against Pebble Table in the same session; under 80 draw calls; one post pass; no shadow maps.
- Idle screenshot after 6.4 s shows the ring and the ghost hand; a scripted walkthrough covers carry, a settle, a wrong fit, the night, and the morning.

## Definition of Done

All units done, checks green locally and in CI, 30 passes logged, media saved in the Project store, draft PR open against `cursor/pebble-table-cceb`.
