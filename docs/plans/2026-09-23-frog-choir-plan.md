---
title: Frog Choir - Plan
type: feat
date: 2026-09-23
topic: frog-choir
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
origin: Tada Jam 10-game brief (Project store docs/jam-10-games.md, row 6) and the shared worker brief
target_repo: kieranklaassen/tada-jam (game in games/frog-choir/)
---

# Frog Choir - Plan

## Goal Capsule

- **Objective:** Ship Frog Choir, a wordless music toy for ages 4 to 8 in `games/frog-choir/`: a pastel lily pond at dusk where five frogs sit on lily pads, a firefly loops across the pond, and each frog sings when the firefly passes over it. Where a frog sits sets its note, so moving frogs composes a melody.
- **Style:** Soft pastel toon 3D, claimed in `docs/art-direction.md`. The job is to make the lowest-artistry style in the concept set charming and distinct: a banded "toon dusk" palette (peach sky, mint water, lilac pads), warm-lit and lilac-shadowed characters with a gold sunset rim, inverted-hull plum outlines, and a stepped firefly glow that lights the frogs as it passes.
- **Authority:** Repo rules win: `AGENTS.md`, `docs/art-direction.md`, `docs/solutions/**`, `CONCEPTS.md`, `.claude/skills/jam-game-creator/SKILL.md`. Pebble Table is the reference for the guidance ladder, input, attention, resize, save cadence, and synthesized audio, but not for motion or look.
- **Boundaries:** Touch only `games/frog-choir/**`, one registry row in `docs/art-direction.md`, and this plan. No dependency, harness, script, CI, or other-game changes.
- **Stop conditions:** Stop and report rather than guess if the game would need a new package, a harness or contract change, or any R15 mechanic (score, timer, streak, level, unlock, counter, verdict).
- **Execution profile:** Scaffold and pure logic with tests first, then a style spike on the real scene, then the full build, then review, then 30 measured refinement passes logged in `games/frog-choir/REFINEMENT.md`.
- **Tail ownership:** The LFG flow owns simplify, review, commit, publish, and CI. Publishing goes through `git push` or, if that returns 403, the GitHub MCP into a draft PR against `cursor/pebble-table-cceb`.

## Product Contract

### Summary

Frog Choir is a composing toy that sounds good whatever the child does. The pond is a musical staff seen in perspective: left to right is time, and near to far is pitch, low to high on a pentatonic scale. The firefly flies left to right over the pads and visits each frog, so its flight line draws the melody, then it arcs back over the far shore through the dusk sky and starts again. A 4-year-old taps frogs and watches the firefly. An 8-year-old rearranges frogs to compose phrases and chords.

### Problem Frame

The pastel toon look scored 5 for kid clarity and 3 for artistry: readable but generic. A music toy for 4-year-olds also tends to fail in two ways. It either becomes a piano with animals, where nothing happens unless the child plays, or a timed rhythm game that judges the child. Frog Choir needs a world that plays by itself, answers every touch, and never judges, with enough structure (a loop, pitch by place) that older children can compose on purpose.

### Requirements

- R1. **Scene.** A pastel lily pond at dusk. Twelve lily pads in six time columns, two pads per column at different depths. Five frogs, each on its own pad. One firefly. Sky, far shore, and reeds frame the pond but never look touchable.
- R2. **Pitch by place.** Each pad has a pitch set by its depth row: near is low, far is high, across five rows on C major pentatonic (C4 D4 E4 G4 A4). Any arrangement sounds consonant.
- R3. **The loop.** At a steady tempo the firefly crosses the six columns, one beat each, then spends two beats arcing back over the far shore: an 8-beat loop with no end and no count. When it crosses a column, every frog in that column sings its pad's note. It flies directly over a lone frog, and between two frogs that share a column (a chord).
- R4. **Tap a frog.** It croaks its current note at once, with a big throat bubble and its own reaction.
- R5. **Drag to compose.** Dragging a frog lifts it with a stretch and weighted lag. Hovering over a pad previews that pad's note softly and lifts the pad. Dropping on an empty pad lands the frog there. Dropping on an occupied pad swaps: the other frog hops to the vacated pad. Dropping on open water splashes, and the frog hops back home. Nothing is lost.
- R6. **Every touch answers.** Tapping an empty pad bobs it and plinks its note. Tapping water ripples with a soft bloop. Tapping the firefly makes it loop-the-loop with a chime.
- R7. **Five personalities.** Each frog has its own voice timbre and its own motion routine for idle, anticipation, singing, tap reaction, lifted pose, and landing. No two frogs share a routine with different parameters, and none reuses Pebble Table's motions. The frogs are the show-off, the shy one, the sleepy one, the bouncy one, and the old crooner.
- R8. **Alive at idle.** The firefly loops, frogs sing on their beats, eyes follow the firefly, frogs breathe and blink, pads bob, reeds sway, and distant fireflies drift. Everything stops while unattended or hidden.
- R9. **Guidance ladder.** On first open, before any touch, the nearest frog puffs and bounces toward the child, at most three times. After 3 s idle, the frogs' pads breathe with a glow ring. After 5 s idle, a ghost hand demonstrates one act chosen from state: tap a frog while the child has never tapped one, otherwise drag a frog to the other pad in its column. Demonstrations back off with doubling gaps and stop after four per idle stretch. Any touch clears everything.
- R10. **Wordless and calm.** No words, numerals, voice instructions, scores, timers, streaks, levels, unlocks, or verdicts on the kid side.
- R11. **Age dial.** `ctx.childAge` sets the tempo (slower for 4 and under, faster at 7 and up). Every child gets the same pond and the same starting arrangement: a rising staircase, so the first loop shows that far means high. Nothing is gated.
- R12. **Persistence.** Only the frog-to-pad arrangement is saved, through `ctx.storage`, when a frog lands. The saved shape is versioned and read defensively. Put-away at any instant loses nothing: a lifted frog goes back to a pad.
- R13. **Input.** At most three fingers act; a fourth cancels every gesture until the hand lifts. Hit targets are at least 48 px at 1180×820, including far-row pads.
- R14. **Audio.** All sound is synthesized with raw Web Audio. The context is created inside the first real touch, suspended while unattended, rebuilt if WebKit leaves it interrupted, and disposed on unmount. Loop notes are scheduled slightly ahead on the audio clock so the rhythm stays steady through frame hitches.
- R15. **Performance.** The game targets 60 fps on a mid-range iPad at DPR 2: under 80 draw calls, no shadow maps, at most one post pass, geometry built once, and no per-frame allocation. It exposes `window.__jamPerf`, a hidden `?fps=1` bar-graph overlay, adaptive quality tiers (DPR 2, 1.5, 1.25, 1) with hysteresis, and a `?tier=N` override.

### Acceptance Examples

- AE1. Given the default arrangement, when the firefly completes one loop, then five notes rise C D E G A across columns 0 to 4, column 5 is silent, and the firefly visibly climbs up the screen as the notes rise.
- AE2. Given two frogs in column 2, when the firefly reaches column 2, then both sing at once and the firefly passes between them.
- AE3. Given a frog dropped on open water, then it splashes, hops back to the pad it came from, and the saved arrangement is unchanged.
- AE4. Given the child has never touched the pond, when 5 s pass, then a ghost hand taps a frog. After the child taps, the next demonstration drags a frog to the other pad in its column.
- AE5. Given the game is parked mid-drag, then the frog is back on a pad, audio is suspended, and the render loop has stopped.

### Scope Boundaries

- In: the pond, five frogs, the firefly loop, tap, drag, swap, splash-home, guidance, audio, persistence, tiers, and the perf overlay.
- Optional extras if time allows, and only if they stay one-next-act-clear: a cricket that adds a soft offbeat rhythm when tapped, and a pebble drum. The second firefly for harmony is deferred.
- Out: tempo controls, recording, sharing, and any grown-up corner. The game needs no settings.

## Planning Contract

### Key Technical Decisions

- KTD1. **Raw three.js, not react-three-fiber.** One `requestAnimationFrame` loop owns update and `renderer.render`, which makes `cpuMs` exact and allocation easy to control. It also ports to Tada without the jam stack allowance. React only mounts the canvas.
- KTD2. **Pond as a staff.** Time is the column (x), pitch is the row (depth). The firefly's path is a pure function of loop phase and the occupied pads, so the same code drives visuals, tests, and audio scheduling.
- KTD3. **One skinned mesh per frog.** Each frog's parts (body, head, eyes, lids, mouth, cheeks, throat bubble, arms, legs) are merged into one geometry with rigid bone weights. That gives one draw call for the frog and one for its outline hull, which shares the skeleton. Personalities pose bones: squash and stretch are bone scales.
- KTD4. **Toon materials with shared injected uniforms.** `MeshToonMaterial` with a 3-step gradient map and vertex colours. An `onBeforeCompile` hook adds a stepped firefly light and a stepped gold rim, both driven by one shared uniform object. Outlines are back-face hulls pushed along normals in a plum colour, not black.
- KTD5. **No post pass.** The dusk grade lives in the materials and the banded sky and water textures, which saves a full-screen pass. Fill rate is the main cost on software GL and on iPad at DPR 2.
- KTD6. **Banded procedural textures.** The sky, the water tint, and the glow and ripple sprites are drawn on canvases at startup in posterized bands, matching the toon ramp. Nothing is fetched.
- KTD7. **Instancing.** Pads, pad outlines, blob shadows, glow rings, ripples, and particles are each one instanced draw or one `Points` draw.
- KTD8. **Tiers from frame interval.** A rolling rAF-interval monitor steps the tier down after sustained slow frames and up only after a long stretch of fast ones, with a probation lock. Lower tiers cut DPR, particle counts, and halo size, and at the last tier the pad outlines.
- KTD9. **Audio lookahead.** Loop notes are scheduled up to 120 ms ahead on the audio clock. Visual singing fires on the frame that crosses the beat.

### Sequencing

1. U1 scaffold → U2 pure logic → U3 style spike (register the style, write `ART.md`, first publish and draft PR) → U4 controller, input, and audio → U5 characters → U6 guidance view → U7 perf tiers and overlay → review → U8 refinement passes → media → final publish.

## Implementation Units

### U1. Scaffold

- **Goal:** The game mounts in the jam shell and loads, parks, and reloads.
- **Requirements:** R10, R11, R12.
- **Files:** `games/frog-choir/manifest.ts`, `games/frog-choir/index.ts`, `games/frog-choir/frog-choir.tsx`.
- **Approach:** Manifest `ageBand: [4, 8]`, `permissions: ['storage']`, `iconIdentity: { family: 'play', contrast: 'paper' }`. The Mount loads storage, builds the controller, and forwards `attended && !hidden`.
- **Test scenarios:** Covered by `test/games.test.ts` (valid manifest, key equals folder, age band, emoji).
- **Verification:** `npm run check`; open `/#/play/frog-choir`.

### U2. Pure logic

- **Goal:** Layout, state, loop, guidance, input, save cadence, and tiers are framework-free and tested.
- **Requirements:** R2, R3, R9, R11, R12, R13, R15.
- **Files:** `games/frog-choir/layout.ts`, `games/frog-choir/state.ts`, `games/frog-choir/choir.ts`, `games/frog-choir/guidance.ts`, `games/frog-choir/input.ts`, `games/frog-choir/tiers.ts`, plus `*.test.ts` beside each.
- **Approach:** Twelve pads, each with a column, a row, a world position, and a pitch. The state is `{ v: 1, frogs: number[5] }`, holding a pad index per frog. `phaseAt` and `beatColumn` map time to column crossings, `columnTargets` finds where the firefly aims in each column, and `fireflyAt(phase, targets, occupied, out)` writes the flight position without allocating. `HintScheduler` and `chooseHint` follow the jam's ladder policy. The gesture tracker handles tap, drag, and the four-finger cancel. The tier monitor applies the hysteresis rule.
- **Test scenarios:** Every column has two pads in different rows, and pitch rises with depth. The default arrangement is a rising staircase on distinct pads. `deserialize` handles garbage, wrong versions, duplicates, out-of-range values, and non-integers, and repairs to distinct pads. Beats fire once per column crossing, including across the loop wrap, with chords together and empty columns silent. The firefly is directly over a lone frog at its beat, and its path is continuous at the return join. Guidance: glow at 3 s, a demo at 5 s, then 10, 20, and 40 s gaps, at most four demos, a touch resets, tapFrog before any tap and dragFrog after, and the drag target is the empty partner pad. Input: tap versus drag, and the fourth finger cancels. Tiers: step down after sustained slow frames, no oscillation, step up after a long fast stretch, and the override pins the tier.
- **Verification:** `npm test`.

### U3. Style spike

- **Goal:** The real scene in the pastel toon dusk style, screenshotted at 1180×820 DPR 2 and measured before building everything.
- **Requirements:** R1, R8, R15.
- **Files:** `games/frog-choir/view/*.ts`, `games/frog-choir/ART.md`, `docs/art-direction.md` (one row).
- **Approach:** Toon materials, the sky, water, pads, frogs in rest poses, the firefly, reeds, and blob shadows. Measure with the shared perf probe.
- **Verification:** A screenshot plus the probe's `cpuP95Ms` and draw calls. Then the first publish and the draft PR.

### U4. Controller, input, and audio

- **Goal:** Tap, drag, swap, splash-home, pad and water taps, the firefly tap, the loop, and saving.
- **Requirements:** R3–R6, R12–R14.
- **Files:** `games/frog-choir/controller.ts`, `games/frog-choir/controller.test.ts`, `games/frog-choir/audio.ts`, `games/frog-choir/view/pondView.ts`.
- **Test scenarios:** Drop on an empty pad moves the frog and saves. Drop on an occupied pad swaps. Drop on water returns home without changing the state. Tapping a frog plays its voice at its pad's pitch. Pause returns lifted frogs. The loop schedules each note once.
- **Verification:** `npm test` and manual play in the shell.

### U5. Characters

- **Goal:** Five frogs with distinct silhouettes, voices, and motion routines.
- **Requirements:** R7, R8.
- **Files:** `games/frog-choir/view/frog.ts`, `games/frog-choir/view/personalities.ts`.
- **Verification:** A capture of each frog's idle, singing, tap, lift, and landing in the walkthrough.

### U6. Guidance view

- **Goal:** Glow rings, the ghost hand, the ghost frog for drag demos, the first-open puff, and frogs gazing at the firefly.
- **Requirements:** R9.
- **Files:** `games/frog-choir/view/overlays.ts`, `games/frog-choir/view/textures.ts`.
- **Verification:** An idle screenshot at 6.4 s shows the glow and the hand.

### U7. Perf tiers and overlay

- **Goal:** `window.__jamPerf`, the `?fps=1` bar graph, `?tier=N`, and applying tiers live.
- **Requirements:** R15.
- **Files:** `games/frog-choir/view/perf.ts`, `games/frog-choir/tiers.ts`.
- **Verification:** The probe at 4× and 6× CPU throttle in Chromium, and WebKit against Pebble Table in the same session.

### U8. Thirty refinement passes

- **Goal:** Thirty real, measured passes over the look, youngest-age clarity, guidance, weight and squash, per-character motion, sound, and perf.
- **Files:** `games/frog-choir/REFINEMENT.md` plus whatever each pass changes.
- **Verification:** Each pass records its critique, its change, and `cpuP95Ms` at 6× plus draw calls.

## Verification Contract

- `npm run check` (TypeScript, vitest, source egress, wordless) and `npm run build && npm run egress:built`.
- The perf probe on `npx vite preview --port 4173` at `/?chrome=0#/play/frog-choir`, 1180×820, DPR 2, touch: Chromium at 4× and 6× throttle (target `cpuP95Ms` under 8 ms at 6×), and WebKit fps against Pebble Table in the same session. Under 80 draw calls.
- CI green on the PR.

## Definition of Done

- Every requirement is met, and the PR states how each quality-bar line is met, with measured numbers.
- `REFINEMENT.md` has 30 passes and a "Still weak" section. `ART.md` exists, and the registry row is added.
- Media in the Project store: `hero.png`, `iter-01.png`, `iter-10.png`, `iter-20.png`, `iter-30.png`, and `walkthrough.mp4`.
- No debug or dead code is left in the diff. `git status` is clean.
