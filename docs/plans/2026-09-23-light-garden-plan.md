---
title: Light Garden - Plan
type: feat
date: 2026-09-23
topic: light-garden
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
origin: Tada Jam 10-game brief (Project store docs/jam-10-games.md, row 9) and the shared worker brief
target_repo: kieranklaassen/tada-jam (game in games/light-garden/)
---

# Light Garden - Plan

## Goal Capsule

- **Objective:** Ship Light Garden, a wordless light-table toy for children aged 7 to 10. Sleeping sea-glass creatures (a jellyfish, a moth, a snail, a fish) each wake when light of their own colour reaches them. The child places and turns lamps, mirrors, a prism, and colour filters to steer beams, and learns reflection angles and additive colour mixing by seeing them.
- **Style:** Glass and light table 3D, the jam's highest-perf-risk style, built so it stays cheap: fake glass only, additive ribbons for beams, at most one half-resolution glow pass in the top tier.
- **Authority:** `AGENTS.md` (including its "Before you show the owner" checklist), `docs/art-direction.md`, `docs/solutions/**` (the workflow lives in `docs/solutions/conventions/building-a-jam-game.md`), `CONCEPTS.md`, and the shared worker brief (boundaries, perf method, 30 iterations). `games/pebble-table/` is the reference implementation for structure: guidance ladder, input with at most three fingers, attention pause, `ResizeObserver`, defensive `deserialize`, save cadence, and synthesized audio.
- **Stop conditions:** Stop and report instead of guessing if the work would need a new dependency, a change outside `games/light-garden/**` (apart from one registry row in `docs/art-direction.md` and this plan), or any engagement mechanic.
- **Tail ownership:** LFG (simplify, review, PR, CI). Publishing goes through the GitHub MCP when `git push` returns 403.
- **Product Contract preservation:** new plan, bootstrapped from the brief.

## Product Contract

### Summary

A dim teal room with a Montessori light table. A lamp throws a white beam across the frosted panel. Four glass creatures sleep on the panel, each tinted in its colour. A felt-lined tray at the near edge holds a second lamp, two mirrors, a prism, and red, green, and blue filters. The child drags pieces onto the panel, taps them to turn them one step, or drags their turning knob to aim them freely. Beams update live. A creature whose colour of light reaches it wakes up, glows, and plays in its own way. When its light has been gone for a while, it wanders to a new spot and naps again, so the puzzle renews itself without levels.

### Problem Frame

The jam needs a style showcase for "glass and light", which scored 5 for artistry and 3 for clarity, with high iPad risk. The concept image's weaknesses were transparent pieces that lose figure-ground, and bloom that smears edges. The game has to make glass read instantly for a 7-year-old and stay inside the iPad budget.

### Requirements

- **R1 Want.** The scene shows one obvious want: sleeping creatures, each tinted in a colour, and a lamp that already casts light. A creature's colour is readable from its tint and from a "dream" orb shown while the child is idle.
- **R2 Optics.** Beam paths come from a pure 2D ray tracer on the table plane. Mirrors reflect (angle in equals angle out, both faces), the prism refracts with Snell's law and per-colour indices (dispersion, with internal reflection when it happens), and filters pass `mask & filterMask`. Creatures, lamp bodies, and the panel edge absorb light.
- **R3 Colour.** Light is an RGB bitmask. A creature wakes when the union of the light reaching its bed is exactly its colour: moth white (R+G+B), fish red, snail yellow (R+G), jellyfish aqua (G+B). Light that contains its colour mixed with other colours makes it stir without waking; light that does not contain its colour does nothing. Crossing beams mix additively on screen.
- **R4 Rearrangeable.** Every piece and creature can be dragged. Tapping a piece turns it one step (22.5°) with a springy overshoot, and dragging its knob turns it freely. Dropping a piece on the tray sends it home. Nothing is locked or unlocked.
- **R5 Creatures alive.** Each creature has its own motion routine for idle, anticipation, reaction, and gait, and no two share one. Woken creatures play near their bed and sometimes nudge a nearby piece. The piece wobbles and springs back, and the beam wobbles with it. After their light has been gone for a while (attended time only), they wander a short way to a new unlit spot and nap.
- **R6 Guidance ladder.** A pure, tested module. After 3 s idle, touchable things glow and sleeping creatures show their dream colour. After 5 s idle, a ghost hand demonstrates one next act chosen from the state: turn the lamp toward a sleeper, bring the prism or a filter into the white beam, bring a mirror to a coloured beam, or turn a piece that sits in a beam. Demonstrations back off (10, 20, 40 s gaps), stop after four, and any touch clears them. The first open has a lamp "look" wiggle and a sleepy stir, at most three times.
- **R7 Contract.** `ctx.storage` only (versioned, small, defensive `deserialize`), a save cadence, a lossless exit, attention pause (the loop, audio, and world time stop), a `ResizeObserver` that ignores 0×0, at most three fingers, and targets of 48 px or more. `ctx.childAge` sets the starting layout (7 to 8, or unknown: the moth is one tap from the lamp beam; 9 and up: the moth needs a mirror) and never gates anything.
- **R8 Wordless.** No words or numerals on the kid side, and no voice. The perf overlay (`?fps=1`) draws bars only.
- **R9 Sound.** Raw Web Audio: glass clinks per piece kind, turn ticks, a stir note, a wake motif per creature (its own register and rhythm), nudge clinks, small creature sounds, and a garden chord when all four are awake. The audio context starts in the first touch and suspends while unattended.
- **R10 Perf.** DPR capped at 2, fewer than 80 draw calls, no shadow maps, no `MeshPhysicalMaterial`, at most one full-screen pass (top tier only), geometry built once, and zero per-frame allocation in the frame loop. `window.__jamPerf` records CPU ms per frame plus tier, draw calls, and triangles. Adaptive tiers step through DPR 2, 1.5, 1.25, and 1 with hysteresis, and `?tier=N` overrides them. Target: `cpuP95Ms` under 8 ms at 6× CDP throttle.
- **R11 Look.** Glass is faked (a procedural matcap, fresnel, an emissive core, and an opaque bright rim). The panel is an emissive plane. Beams are additive ribbons, a core plus a wash. Caustic decals are additive. Figure-ground gets extra help from opaque cream rims, a darker table frame and panel vignette, and blob contact shadows.

### Acceptance Examples

- AE1: A fresh layout for age 7. One tap on the lamp swings the white beam onto the moth, and the moth wakes within about 0.5 s.
- AE2: The prism placed in the white beam fans red, green, and blue beams, with red deviating least and blue most.
- AE3: A red beam and a green beam both reaching the snail wake it. Red alone makes it stir.
- AE4: A red filter in a white beam leaves a red beam. A green filter in that red beam absorbs it.
- AE5: A saved state that is corrupt, older, or oversized loads as the default layout without throwing.

### Scope Boundaries

- No levels, goals list, counters, scores, or timers. Creatures napping again is a Δ2 world-time event that pauses while unattended.
- One table, and no mode switching. The second lamp is in the tray from the start.

## Planning Contract

### Key Technical Decisions

- **KTD1 r3f with a manual render.** Use react-three-fiber for the canvas and loop. A priority-1 `useFrame` owns `gl.render` (plus the optional glow pass), so `__jamPerf.cpuMs` covers update plus render submit in one measured span.
- **KTD2 Opaque fake glass.** All glass renders opaque with a custom `ShaderMaterial` (procedural matcap, fresnel rim, emissive core, and per-vertex part kinds: glass, rim, mirror, lens). That means no transparency sorting or overdraw on pieces. Only beams, glows, caustics, and the ghost hand are transparent, and those are additive with `depthWrite: false`.
- **KTD3 One geometry per effect.** Beam ribbons are one preallocated dynamic `BufferGeometry` (a core quad plus a wash quad per segment). Glows, caustics, and knob rings share one instanced additive sprite batch; blob shadows and creature eyes share one instanced shade batch. Each piece is one merged mesh with its turning knob built in. Measured: about 18 draw calls.
- **KTD4 Selective glow instead of threshold bloom.** In the top tier, the emissive layer (beams and glows) is re-rendered at half CSS resolution, blurred there in two small separable steps, and composited additively in one full-screen pass. The base render is identical in every tier, and the lower tiers fake the glow with wider sprite halos.
- **KTD5 Pure optics.** `optics.ts` traces into a reusable output buffer (typed arrays plus counts) and exposes a small object API for tests. Rays are capped at 96 segments and 24 interactions per ray. Wake uses "light reaching the bed": the union of masks of segments that pass within the bed radius. That handles both a creature sitting on its bed (the beam ends at its rim) and a creature swimming away (the beam passes over the bed).
- **KTD6 Controller owns the world.** A framework-free controller holds pieces, creatures, the tracer output, guidance, and sound events. The view reads fields by reference each frame, and React does not re-render during play.
- **KTD7 Tiers.** A pure `QualityGovernor` takes rAF frame deltas and keeps an exponential moving average. It drops a tier when frames average over 22 ms for 1.5 s, and raises one when they average under 17.6 ms for 8 s. A tier that just failed is not retried for 30 s, and every change settles for 2 s before the next measurement. `?tier=` pins the tier.

### Sequencing

U1 to U5 (pure modules with tests), then U6 (controller), U7 (view spike and style), U8 (audio), U9 (perf instrumentation and tiers), U10 (docs, registry, and the 30 refinement iterations).

## Implementation Units

### U1. Optics tracer
- **Files:** `games/light-garden/optics.ts`, `games/light-garden/optics.test.ts`
- **Approach:** Vector helpers, ray against segment, ray against circle, and ray against a convex polygon from inside and outside. Reflection, and refraction with Snell's law and total internal reflection. Primary splitting at prism entry. Bed-light union.
- **Tests:** mirror reflection at 45° and at a glancing angle; both mirror faces; prism dispersion order (the red deviation angle is smaller than the blue); a white beam through the prism gives three beams; a filter AND; a zero mask stops; creature absorption records the mask; union mixing of red and green gives yellow; the segment cap holds under two facing mirrors; a ray that misses runs to the bounds.

### U2. Layout and state
- **Files:** `games/light-garden/layout.ts`, `games/light-garden/state.ts`, plus tests
- **Approach:** Panel and tray geometry, tray slots, clamping, age-dial layouts, and a versioned saved shape `{ v: 1, pieces: [{id, x, y, angle, inTray}], beds: [{x, y}] }` (beds in creature order). `deserialize` repairs or defaults every field.
- **Tests:** the default layout for age 7 lights the moth after one tap step; corrupt and partial input; out-of-range coordinates are clamped; unknown ids are dropped; JSON size stays under 64 KB.

### U3. Creatures
- **Files:** `games/light-garden/creatures.ts`, test
- **Approach:** A state machine: asleep, waking (anticipation), awake, drowsy, wandering, and back to asleep. Colour match gives wake, stir, or none. Linger time counts attended seconds only. The new bed comes from a seeded RNG and must be free and not lit by the creature's colour.
- **Tests:** an exact match wakes after the delay; a partial match stirs; a non-match does nothing; the linger expires and it wanders; the new bed avoids pieces and its own light.

### U4. Guidance
- **Files:** `games/light-garden/guidance.ts`, test
- **Approach:** `chooseHint(summary)`, a `HintScheduler` (3 s glow, 5 s demo, doubling gaps, at most four), `handPose`, and a first-open peek.
- **Tests:** the hint is chosen for each state; the schedule times; a touch resets; demos stop after four.

### U5. Input, save cadence, and tiers
- **Files:** `games/light-garden/input.ts`, `saveCadence.ts`, `tiers.ts`, plus tests
- **Approach:** A gesture tracker (tap, drag, and a resting hand on the fourth finger), a throttled save, and the quality governor plus override parser.
- **Tests:** tap versus drag slop; a fourth finger cancels; throttle windows; tier drop and rise with hysteresis; the override pins the tier.

### U6. Controller
- **Files:** `games/light-garden/controller.ts`, test
- **Approach:** Hit-testing (knob before body, pieces before creatures), drag with lift and lag, tap-turn springs, free turning by knob, tray return, overlap resolution on drop, a per-frame trace from displayed transforms (wobble included), creature updates, nudges, sound events, guidance, and the save cadence.
- **Tests:** a tap turns 22.5°; a drag moves and saves; a drop on the tray returns the piece home; the AE1 flow wakes the moth; pause cancels drags.

### U7. View and style
- **Files:** `games/light-garden/view/*.ts(x)`, `games/light-garden/light-garden.tsx`, `manifest.ts`, `index.ts`
- **Approach:** Camera at about 55° pitch with a narrow lens; the room, the frame, and the emissive panel; the fake-glass shader; lamps, mirrors, prism, and filters; four creatures with distinct routines; beams, glows, caustics, blob shadows, knobs, dream orbs; the ghost hand sprite; the glow pass.
- **Verification:** a style spike screenshot at 1180×820 at DPR 2, and draw calls under 80.

### U8. Audio
- **Files:** `games/light-garden/audio.ts`
- **Approach:** A synthesized glass palette and a procedural room reverb; the context unlocks in a touch, suspends while unattended, and is disposed on unmount.

### U9. Perf instrumentation
- **Files:** `games/light-garden/view/perf.tsx`, `stage.tsx`, `view/overlay.tsx`, `perf.test.ts`
- **Approach:** `window.__jamPerf` (a 600-frame ring of CPU ms, tier, draw calls, triangles, and `reset`), the `?fps=1` bar overlay, and the governor wired to `setDpr` and the effect switches. Added in refinement against the compound docs: half-rate rendering after 20 s of rest (the governor ignores paced frames), a triple-tap grown-up overlay with frame stats and tier pinning, and a frame-budget test in CI.

### U10. Docs and refinement
- **Files:** `games/light-garden/ART.md`, `games/light-garden/REFINEMENT.md`, one row in `docs/art-direction.md`
- **Approach:** 30 logged iterations (screenshot, critique, one fix, then re-measure `cpuP95Ms` at 6× and draw calls), then a "Still weak" section.

## Verification Contract

- `npm run check` (TypeScript, vitest, egress, wordless) and `npm run build && npm run egress:built`.
- The perf probe on the production build: chromium at 4× and 6× throttle, and WebKit against Pebble Table in the same session; `renderer.info` under 80 calls.
- Media in the Project store: `media/jam-10-games/light-garden/` (hero, iter-01/10/20/30, and `walkthrough.mp4`).

## Definition of Done

- Every requirement R1 to R11 is met; all checks are green locally and in CI, including `compound audit --strict`; the PR against `cursor/pebble-table-cceb` states each quality-bar line, the age cues, the perf table and method, and the iteration summary.
