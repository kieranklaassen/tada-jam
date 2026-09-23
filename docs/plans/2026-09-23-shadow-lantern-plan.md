---
title: Shadow Lantern - Plan
type: feat
date: 2026-09-23
topic: shadow-lantern
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
origin: Tada Jam 10-game brief (Project store docs/jam-10-games.md, row 4) and the shared worker brief (internal/jam-10-games/worker-brief.md)
target_repo: kieranklaassen/tada-jam (game in games/shadow-lantern/)
decision_tags: "`decided (brief)` = settled by the jam brief; `assumed default` = the default taken because the owner could not be asked (pipeline mode)"
---

# Shadow Lantern - Plan

## Goal Capsule

- **Objective:** A wordless paper-theatre toy for ages 6–10. A lamp stands at the back of a cut-paper stage, a paper screen at the front, and a dotted sleeping shadow creature waits on the screen. The child slides and turns cut-paper shapes between the lamp and the screen; the shadows are real projections, so closer to the lamp means a bigger, softer shadow. When the shadows fill the outline well enough, the creature wakes, peels off the screen as coloured paper and joins a layered paper night sky, and a new outline drifts in.
- **Product authority:** the jam brief (style 04 paper-craft, age band 6–10, scene, want, and core play) and the repo rules: `AGENTS.md`, `docs/art-direction.md`, `docs/solutions/**`, `CONCEPTS.md`, `.claude/skills/jam-game-creator/SKILL.md`. `games/pebble-table/` is the reference implementation.
- **Open blockers:** none.
- **Where it is built:** `games/shadow-lantern/` only, plus one row in the claimed-styles table of `docs/art-direction.md` and this plan.
- **Stop conditions:** stop and report if the game would need a package outside `scripts/egress-check.ts`, a harness or contract change, or edits to another game.
- **Tail ownership:** `lfg` owns simplify, review, commit, PR, and CI after `ce-work` returns. Publishing goes through the GitHub MCP if `git push` returns 403 (worker brief).
- **Product Contract preservation:** Product Contract unchanged (bootstrap plan; no upstream requirements doc).

## Product Contract

### Summary

One scene, one want: fill the sleeping outline with shadow. The play is spatial composition, like a tangram: seven cut-paper shapes (two triangles, two semicircles, a square, a strip, a crescent), each pinned to a thin wire stand on a folded paper foot. Sliding a shape along the stage floor changes its distance to the lamp, which scales its shadow from about 1× (at the screen, crisp) to 4× (at the lamp, soft-edged). A tap turns the shape around its pin. Many different arrangements wake each creature.

### Requirements

- R1. **Geometric shadows.** Every shadow on the screen is the shape's outline projected from the lamp point onto the screen plane, drawn as a dark paper-cut polygon. No shadow maps. The penumbra (edge softness) widens with distance from the screen. `decided (brief)`
- R2. **Closer means bigger.** The drag slides a shape on the stage floor. Toward the lamp its shadow grows and softens; toward the screen it shrinks and sharpens. `decided (brief)`
- R3. **Turn.** A tap turns a shape an eighth of a turn around its pin, with a springy overshoot. A second finger twisting while one finger holds a shape turns it freely. `assumed default`
- R4. **Generous fill.** The creature wakes when shadow covers enough of the outline's inside (about 74% at ages 6–7, 80% at 8 and up) without flooding far outside it (spill under about 60% of the outline's area), once the shapes have settled. Every creature has at least two clearly different valid fills with the shapes provided, and a test proves it. `decided (brief)` for generous; numbers `assumed default`
- R5. **Wake and company.** A woken creature opens its eye, peels off the screen, flips to its coloured paper side, and flies or swims into the paper night sky, where it stays. Nothing counts them. A new sleeping outline drifts onto the screen. `decided (brief)`
- R6. **Six creatures, six personalities.** Bird, fish, whale, fox, snail, dragon. Each has its own idle, anticipation, reaction, and gait routine, with its own curves and timings, not shared routines with different parameters, and none of Pebble Table's motions. A tap on a sky creature plays its reaction and its synthesized voice. `decided (brief)`
- R7. **Wordless, age 6 first.** No words or numerals on the kid side, no voice instructions. One next act at a time: the sleeping outline shows what is wanted, covered outline dots light up gold, and shadow spilling outside the dotted line is visible as-is (control of error). `decided (repo rules)`
- R8. **Guidance ladder.** After 3 s idle, dotted golden rings breathe under the shapes. After 5 s, a cut-paper ghost hand slides a translucent ghost of one shape to a spot that improves the fill, and the ghost's shadow grows on the screen. Gaps of 5, 10, 20, and 40 s; at most four demos per idle stretch. Any touch clears it at once. On first open, before any touch, the lamp flame flares and one shape sways as an invitation. `decided (repo rules)`
- R9. **Quality bar.** Alive at idle; motion and sound on every touch; weight, squash, and follow-through; kid-clear; one claimed style; procedural assets only. `decided (repo rules)`
- R10. **Contract.** Only `ctx`: storage through `ctx.storage` with a defensive `deserialize`, a save cadence, lossless exit, a paused loop and silent audio while unattended or hidden, a `ResizeObserver` ignoring 0×0, at most three acting fingers. `decided (repo rules)`
- R11. **Performance first.** Raw three.js with our own frame loop. Under 80 draw calls, no shadow maps, no post pass, DPR capped at 2, geometry built once, nothing allocated per frame. `window.__jamPerf` instrumentation, a hidden bar-graph overlay behind `?fps=1`, adaptive quality tiers (DPR 2 → 1.5 → 1.25 → 1, with hysteresis), and a `?tier=N` override. Target `cpuP95Ms` under 8 ms at 6× CDP throttle. `decided (brief)`
- R12. **Age is a dial.** `ctx.childAge` sets the wake tolerance and which creature sleeps first; every creature is reachable at every age; `null` behaves like age 7. `assumed default`

### Scope boundaries

- Out: scores, counters, levels, unlocks, timers, verdict sounds, text, voice instructions, and any creature gallery or collection screen.
- Out: free vertical placement of a shape. Every pin sits at lamp height, so shadows hang from the lamp's horizon line and height comes from turning a shape around its pin. This keeps one finger to two degrees of freedom, and the outlines are designed around that line.

## Key Technical Decisions

- KTD1. **Raw three.js, not react-three-fiber.** It is on Tada's own tech menu (no port-time rewrite), gives one hand-written frame loop to time for `cpuMs`, and has no reconciler work per frame. React only hosts the Mount.
- KTD2. **Shadows are similarity projections, updated on the CPU.** Cards stand parallel to the screen, so the lamp projection of a card at depth `z` is its outline scaled by `k = D / (D − z)` about the lamp's foot on the screen. A small follow-through yaw is added as a true projective term, because the vertices are projected one by one (7 shapes × 40 points). All shadows share one dynamic `BufferGeometry` with a fixed triangulation per shape: one draw call. The penumbra is an outer ring of alpha-0 vertices offset along the projected normals by `w = lampRadius × (k − 1)`.
- KTD3. **Creature outlines come from unions of primitives, traced once.** Each creature is defined as ellipses, circles, capsules, and triangles (body plus moving parts). A mask is rasterized once and traced with marching squares, then simplified (RDP) and smoothed (Chaikin). The same mask gives the inside samples for coverage, the dotted outline, and the extruded woken card. No hand-authored SVG, no committed assets.
- KTD4. **Coverage by inverse-projecting sample points into each card's local frame** and testing them analytically (triangle, half-disc, rectangle, crescent). This runs about 700 samples × 7 shapes only when something moved, at most every other frame. The same function scores candidate moves for the ghost-hand hint, spread over a few frames so no frame spikes.
- KTD5. **Static scenery is one merged, unlit mesh with baked lamp light.** Lambert-like lamp and night light is baked into vertex colours at build time, and a shared procedural paper-grain texture is multiplied in. Only the moving shapes use `MeshLambertMaterial` with the lamp's `PointLight` plus a cool hemisphere light, so a shape visibly warms as it nears the lamp. Every card carries an offset dark shadow card (the style's contact shadow), merged into the same mesh.
- KTD6. **Double-sided creature cards.** Vertex colours make the front cap shadow-dark and the back cap the creature's paper colour. The peel is a page-turn around a vertical hinge that reveals the colour; no bend shader.
- KTD7. **Adaptive tiers from rAF frame intervals** (EMA; step down after about 1.5 s over budget, step up after 6 s comfortably under). The tiers cut DPR, then dust motes and star twinkle, then the penumbra ring. `?tier=N` pins a tier.

## Output Structure

```
games/shadow-lantern/
  manifest.ts  index.ts  shadow-lantern.tsx
  ART.md  REFINEMENT.md
  geometry2d.ts      polygon + marching squares + wobble          (+ test)
  projection.ts      lamp/screen constants, projection, penumbra   (+ test)
  shapes.ts          the seven paper shapes, pins, inside tests    (+ test)
  creatures.ts       six creatures: primitives, parts, eye, masks  (+ test)
  coverage.ts        fill, spill, dot cover, wake rule, hint search (+ test)
  state.ts           saved shape, defaults by age, deserialize     (+ test)
  guidance.ts        idle schedule, hint choice, hand pose         (+ test)
  input.ts           gesture tracker, ≤3 fingers, tap/drag/twist   (+ test)
  saveCadence.ts                                                   (+ test)
  tiers.ts           adaptive quality tiers + perf ring            (+ test)
  motion.ts          six personality routines, springs             (+ test)
  controller.ts      game rules, no rendering                      (+ test)
  audio.ts           synthesized paper sounds and creature voices
  view/paper.ts      grain texture, card extrusion, baking, merge
  view/scenery.ts    the static diorama
  view/game.ts       renderer, camera, loop, perf, overlay, all dynamic meshes
```

## Implementation Units

- U1. **Pure geometry and projection** (`geometry2d.ts`, `projection.ts`, `shapes.ts`). Tests: projection scale is 1 at the screen and grows toward the lamp; a point projected and inverse-projected round-trips; penumbra is 0 at the screen and grows; inside tests for each shape; marching squares traces a circle's area within 3%; wobble keeps the area within 5%.
- U2. **Creatures and coverage** (`creatures.ts`, `coverage.ts`). Tests: every creature has at least two distinct fills (different shape subsets or positions) that pass the wake rule for age 6, and none of them passes when all shapes sit at the screen; a single giant square flooding the screen does not wake (spill); coverage rises monotonically as a covering shape moves in; the hint search returns a move that improves coverage.
- U3. **State, save cadence, input, tiers** (`state.ts`, `saveCadence.ts`, `input.ts`, `tiers.ts`). Tests: corrupt or older saves fall back or repair; positions clamp to the stage; a fourth finger cancels everything until the whole hand lifts; a tap turns and a drag slides; a twist produces an angle delta; tiers step down under load, step up with hysteresis, and honour an override.
- U4. **Controller** (`controller.ts`, `guidance.ts`, `motion.ts`). Tests: dragging a shape toward the lamp increases its shadow scale; a settled good fill starts the wake sequence and the next outline arrives; the new outline needs a move before it can wake; guidance timings (glow 3 s, demos 5/10/20/40 s, max four) and a touch clears them; each creature routine returns different curves (no shared routine).
- U5. **View** (`view/*`, `shadow-lantern.tsx`, `audio.ts`). Smoke checks: mount in the harness, park and resume, reload restores positions; the renderer budget is under 80 draw calls; `__jamPerf` fills; `?fps=1` shows bars.
- U6. **Style spike and registry.** Screenshot at 1180×820, DPR 2; `ART.md`; one row in `docs/art-direction.md`.
- U7. **Thirty refinement passes** logged in `REFINEMENT.md` (look, youngest-age clarity, guidance, weight, per-character motion, sound, perf), each re-measured with the shared perf probe (`cpuP95Ms` at 6×, draw calls).

## Verification

`npm run check`; `npm run build && npm run egress:built`; the shared perf probe on the production build at 1180×820, DPR 2, touch (Chromium at 4× and 6× throttle, WebKit against Pebble Table in the same session); a scripted walkthrough with `page.clock` for the media.

## Risks

- **Software GL on the VM makes fps meaningless.** Report CPU proxies plus WebKit fps relative to Pebble Table, as the brief says.
- **Fill tolerance too strict or too loose.** Covered by the fill-existence tests plus tuning passes in the refinements.
- **Depth drag is unfamiliar at age 6.** The ghost-hand demo shows the growing shadow; the drag is direct manipulation on the floor (the grabbed point stays under the finger).

## Assumptions

- Pins at lamp height, so every shadow hangs from one horizon line (see Scope boundaries).
- Sky cap of eight creatures for the frame budget: a ninth wake sends the oldest creature gently behind the moon. It is not counted or shown as a loss.
