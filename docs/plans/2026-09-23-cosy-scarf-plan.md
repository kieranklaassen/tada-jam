---
title: Cosy Scarf - Plan
type: feat
date: 2026-09-23
topic: cosy-scarf
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
origin: Tada Jam 10-game brief (Project store docs/jam-10-games.md row 8, internal/jam-10-games/worker-brief.md), style notes docs/pebble-table-styles.md §8
target_repo: kieranklaassen/tada-jam (game in games/cosy-scarf/)
---

# Cosy Scarf - Plan

## Goal Capsule

- **Objective:** Ship one jam game, Cosy Scarf, in the knitted / crochet yarn style: a snowy knitted hillside where a shivering amigurumi animal stands by a knitting loom. The child taps (or drags) yarn balls to knit stripes; the scarf grows stitch by stitch; when it is long enough the loom offers it, it wraps the animal, the animal dances its own dance, and the next cold animal waddles in. Patterns and symmetry are found through colour choice.
- **Authority:** The worker brief and its steers (boundaries, perf method, 30 iterations, publishing) > repo rules (`AGENTS.md`, `docs/art-direction.md`, `docs/solutions/**` starting at `docs/solutions/conventions/building-a-jam-game.md`, `CONCEPTS.md`) > this plan. `games/pebble-table/` is the reference for conventions, not for look or motion.
- **Where it is built:** `games/cosy-scarf/**` only, plus one row in `docs/art-direction.md` §3 and this plan file.
- **Stop conditions:** Stop and report instead of guessing if the game would need a new dependency, a change to `harness/`, `scripts/`, CI, `package*.json`, or another game.
- **Tail ownership:** `lfg` owns simplify, review, commit, publish (GitHub MCP when `git push` is refused), and CI.

## Product Contract

### Summary

A calm, kind want: an animal is cold, so knit it a scarf. The scarf is a canvas of stitches; the child's colour choices become stripes (AB, ABB, ABC) and, for older children, a stitched motif that can mirror. Nothing counts, scores or times anything. The world answers with stitches, sound, warmth and a dance.

### Requirements

- **R1 Scene.** A knitted snowy hillside (sky, hills, pines, pom-pom snowfall) that recedes: low-contrast stitch texture, haze, soft focus. In front, a calm plain play area: a deep-teal knitted blanket on the snow, the loom with a plain backboard, a basket of yarn balls, and one shivering animal.
- **R2 Knit a row.** Tapping a yarn ball, or dragging it onto the loom, knits the next row in that colour. The ball hops, a strand of yarn flies to the needles, and the row appears stitch by stitch (alternating direction per row, like real knitting) with needle clicks and the colour's own note. Fast taps queue rows and knit faster.
- **R3 Scarf growth and offer.** The scarf hangs from the loom's rod and grows downward. At a minimum length (age dial: 8 / 10 / 12 rows) it becomes offerable: a state-revealed affordance (the animal reaches for it, the bottom end sways and glows when idle). The child may keep knitting up to a maximum length (18 rows of 5 chunky stitches: the scarf is short and wide enough for a five-year-old's finger to hit one stitch).
- **R4 Give and wrap.** Tapping the offered scarf, or dragging it to the animal, casts off (the needles slide out, a fringe appears), flies the scarf to the animal, and wraps it around the neck with both ends hanging in front. The animal stops shivering, warms (blush, colour warms), and does its own happy dance to the scarf's stripe tune.
- **R5 Next animal.** The wrapped animal walks to its own spot on the hillside and stays as company. The next cold animal arrives with its own gait. Roster: bunny, penguin, fox, bear. When all four wear a scarf, a finished scarf goes to the animal with the fewest scarves (it walks down to the loom when the scarf becomes offerable); scarves stack up to three per animal.
- **R6 Unravel (lossless).** Dragging the needles upward unravels rows, newest first, stitch by stitch, the yarn flying back to its ball. Nothing else is ever lost; put-away at any instant keeps every stitch.
- **R7 Colourwork motif.** Holding a dragged yarn ball still over existing stitches (or dropping it there) re-colours those stitches (duplicate stitch). A fast pass across the scarf does not paint.
- **R8 Mirror mode.** Once the scarf has four rows, a crocheted butterfly appears on the loom's rod. Tapping it opens its wings and shows a centre thread; while open, every painted stitch is mirrored across the scarf's width.
- **R9 Pattern answers physically.** Each colour has a pitch; each new row plays its note, and when the last rows complete a repeat of a two-, three- or four-row unit, the loom rocks and hums the unit back. No verdict, tick or score. The wrapped animal dances to its scarf's tune.
- **R10 Characters.** Four animals, each with its own motion personality (idle, shiver, anticipation, reaction, gait, dance) written as separate routines, none reused from Pebble Table. Tapping the cold animal makes it shiver harder and look at the basket; tapping a companion plays a short version of its dance and its scarf's tune.
- **R11 Guidance ladder.** Idle-only, wordless: a first-open peek (a ball hops out of the basket), a glow ring on what can be touched after 3 s, a ghost-hand demonstration after 5 s (tap the ball that continues the current stripe pattern, or a colour different from the last row; drag the offered scarf to the animal), backing off with doubling gaps, at most four per idle stretch. Any touch clears it. The cold animal looks toward the basket while idle.
- **R12 Contract.** Tada cartridge shape (`manifest.ts`, `cosy-scarf.tsx`, `index.ts`), `ageBand: [5, 10]`, storage through `ctx.storage` with a versioned defensive `deserialize`, pause while unattended or hidden, `ResizeObserver`, at most three fingers, synthesized audio started inside the first tap, zero egress, wordless kid side.
- **R13 Performance.** Raw three.js, geometry and textures built once, zero per-frame allocation, under 80 draw calls, no shadow maps, at most one post pass, DPR capped at 2. `window.__jamPerf` and a hidden `?fps=1` bar-graph overlay; at least three adaptive quality tiers with hysteresis and a `?tier=N` override. Target `cpuP95Ms` under 8 ms at 6× CPU throttle.
- **R14 Age dial.** `ctx.childAge` sets defaults only: basket size (4 balls at 5 or under, 5 at 6–7, 6 at 8+) and offer length (8 / 10 / 12 rows). Every feature is reachable at every age; `null` age uses the middle defaults.

### Acceptance Examples

- **AE1.** Fresh open, age 5: bunny shivers by the loom, four balls in the basket, one ball peeks out. After 5 s idle a ghost hand taps a ball. Tapping red knits a red row stitch by stitch.
- **AE2.** Rows red, blue, red, blue: the loom rocks and hums red-blue. Idle demo points at red.
- **AE3.** Eight rows at age 5: the bunny reaches, the scarf end sways. Tapping the scarf wraps the bunny, it binkies, walks up the hill; the penguin waddles in.
- **AE4.** Dragging the needles up two rows removes the two newest rows; reloading shows the same scarf.
- **AE5.** Mirror open, ball held over column 1 of row 3: columns 1 and 6 of row 3 take the colour.
- **AE6.** A saved state with garbage fields loads without throwing and keeps every valid row.

### Scope Boundaries

- No grown-up corner, no spoken words, no calendar mirror (Δ1) in this pass.
- No new dependencies; `postprocessing` (already allowed) for the single pass; no react-three-fiber (raw three.js keeps the port to Tada free of the jam allowance).

## Planning Contract

### Key Technical Decisions

- **KTD1 Raw three.js in one rAF loop.** A `CosyScene` owns the renderer, scene, one frame loop, the tier controller and perf instrumentation. React only mounts the container. This removes per-frame React work and makes `cpuMs` exact (update plus render submit).
- **KTD2 The scarf is one draw call per scarf.** Every stitch cell (5 × 18) is a small pillow of quads carrying its (column, row, knit order) as an attribute; the knit-V normal and shade tiles are addressed from those in the vertex shader, and each cell reads its colour from a 5 × 18 `DataTexture` (nearest filter). Tassels at both ends are part of the same geometry. A `MeshStandardMaterial` with `onBeforeCompile` computes position in the vertex shader from (column, row): hang pose on the loom, wrap pose around a neck matrix, a reveal uniform that pops stitches in with overshoot (and out for unravel), and sway that grows toward the free end. Knitting and painting touch only texels and one float.
- **KTD3 Procedural yarn textures.** Knit-V tile, crochet single-stitch tile, wound yarn-ball tile, drawn on canvases at startup and converted to normal maps; shade (AO) multiplied in the fragment shader. The play area uses calm maps (low normal scale, plain backboard); the hillside uses a finer, fainter knit plus fog.
- **KTD4 Characters are merged part meshes on one shared crochet material** with vertex colours, per-animal tint and blush uniforms. Each animal is about six parts (body, head, two arms or flippers, feet, ears or tail) with pivots. Motion lives in one class per animal.
- **KTD5 Pure logic modules with tests:** `state.ts` (types, deserialize), `knitting.ts` (rows, paint, mirror, give, recipient), `pattern.ts` (repeat detection, continuation colour), `guidance.ts` (hint choice and scheduler), `input.ts` (gestures, three-finger rule), `tiers.ts` (adaptive quality with hysteresis), `saveCadence.ts`.
- **KTD6 Tiers.** 0: DPR 2, post pass (tilt-shift, grade, vignette), full snowfall. 1: DPR 1.5, cheaper blur. 2: DPR 1.25, no post pass (renderer tone mapping), fewer flakes. 3: DPR 1, fewest flakes, no hillside normal maps. Drop after sustained slow frames, rise only after a long run of fast frames, with a cooldown.
- **KTD7 Audio** in raw Web Audio: needle clicks, woolly thumps, per-colour marimba notes (pentatonic), unravel zip, butterfly flutter, swish and warm chord for the wrap, one vocal per animal, the dance tune.

### Sequencing

U1 scaffold and pure logic → U2 style spike (scene, scarf shader, one animal) and first publish → U3 full loop (all animals, give, arrival, unravel, paint, mirror) → U4 guidance and audio → U5 perf instrumentation and tiers → U6 thirty refinement passes → U7 docs, media, PR.

## Implementation Units

### U1. Scaffold and pure logic
- **Files:** `games/cosy-scarf/{manifest.ts,index.ts,cosy-scarf.tsx,state.ts,knitting.ts,pattern.ts,guidance.ts,input.ts,tiers.ts,saveCadence.ts}` and a `*.test.ts` beside each pure module.
- **Tests:** deserialize garbage and old shapes; knit, unravel, paint with and without mirror; offer threshold per age; give moves rows to the recipient and picks the next animal; stacking cap; repeat detection for AB, ABB, ABC and none; continuation colour; hint choice per state; scheduler timings; four-finger cancel; tier drop and rise with hysteresis.

### U2. Style spike
- **Files:** `games/cosy-scarf/view/{yarn.ts,shapes.ts,world.ts,scarf.ts,scene.ts,finish.ts}`, `games/cosy-scarf/ART.md`, registry row.
- **Verify:** screenshot at 1180×820 DPR 2; probe numbers recorded in `ART.md`.

### U3. Full loop
- **Files:** `games/cosy-scarf/{controller.ts,view/animals.ts}`.
- **Verify:** scripted Playwright walkthrough knits, gives, unravels, paints, mirrors; reload restores.

### U4. Guidance and audio
- **Files:** `games/cosy-scarf/{guidance.ts,audio.ts}`, controller wiring.

### U5. Perf instrumentation and tiers
- **Files:** `games/cosy-scarf/{perf.ts,tiers.ts}`, scene wiring.

### U6. Thirty refinement passes
- **Files:** `games/cosy-scarf/REFINEMENT.md` plus whatever each pass changes.

### U7. Docs, media, PR
- Media to the Project store `media/jam-10-games/cosy-scarf/`; the PR description goes to the coordinator, who opens the draft PR against `cursor/pebble-table-cceb`.

## Verification Contract

- `npm run check` (typecheck, vitest, egress, wordless) and `npm run build && npm run egress:built`.
- Perf: the shared probe on the production build at 1180×820, DPR 2, touch: Chromium at 4× and 6× throttle (`cpuP95Ms` < 8 ms at 6×), WebKit fps against Pebble Table in the same session, `drawCalls` < 80.
- Idle screenshot after 6.4 s shows the glow and a demonstration.

## Definition of Done

- Every requirement above met or listed under "Still weak" in `REFINEMENT.md` with a reason.
- Thirty logged refinement passes with perf per pass.
- CI green on the branch; clean `git status`; no abandoned experimental code in the diff.
