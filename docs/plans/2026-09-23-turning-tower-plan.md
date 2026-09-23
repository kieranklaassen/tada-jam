---
title: Turning Tower - Plan
type: feat
date: 2026-09-23
topic: turning-tower
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: jam-10-games brief (Project store docs/jam-10-games.md, row 7)
execution: code
target_repo: kieranklaassen/tada-jam (game in games/turning-tower/)
revision: 2 (2026-09-23, updated to what was built: rooms.ts, projection.ts, motion.ts, one scene, no save-cadence module)
---

# Turning Tower - Plan

## Goal Capsule

- **Objective:** A calm, wordless spatial-reasoning toy for ages 7–10 in the Geometric (Monument Valley-like) style. A small faceted tower of turning segments and sliding platforms floats in a peach-to-lavender dusk. A tiny wanderer with a lantern stands on one ledge; a glowing doorway sits somewhere it cannot reach. The child turns handles and slides platforms until the paths line up (including joins that only exist from the camera's view), taps where the wanderer should walk, and the wanderer walks home through the door into the next diorama.
- **Product authority:** The jam brief (row 7 of `docs/jam-10-games.md` in the Project store) and the shared worker brief. Repo rules win: `AGENTS.md`, `docs/art-direction.md`, `docs/solutions/**`, `CONCEPTS.md`, `.claude/skills/jam-game-creator/SKILL.md`. Pebble Table (`games/pebble-table/`) is the reference implementation for the cartridge shape, guidance ladder, input, attention, resize, defensive deserialize, save cadence, and synthesized audio.
- **Where it is built:** `games/turning-tower/` only, plus one row in the claimed-styles registry of `docs/art-direction.md` and this plan.
- **Stop conditions:** Stop and report instead of guessing if the game would need a dependency outside `scripts/egress-check.ts`, a harness or contract change, or a change to another game.
- **Tail ownership:** `lfg` owns simplify, review, commit, PR, and CI after the build returns.

## Product Contract

### Summary

Five small hand-authored dioramas sit on an open ring. Each has one obvious want: get the wanderer to the glowing door. The child can visit any diorama at any time from the ring; nothing is locked, counted, timed, or judged. Turning a handle rotates a segment in weighted 90° steps; dragging a platform slides it between stops; tapping a path walks the wanderer there along the paths that are connected right now. Some connections are impossible in 3D and exist only because the orthographic camera lines them up: that is the "aha".

### Requirements

- **R1. One want per scene.** Every diorama shows the wanderer, the glowing door, and the path that almost reaches it. The door is unreachable in the starting arrangement and reachable after a short sequence of turns or slides.
- **R2. Turn handles.** A rotating segment turns about one axis through its pivot in 90° steps. Dragging anywhere on the segment (or its bright handle) rotates it under the finger with weight (lagging spring), detent clicks at each quarter, and a heavy settling snap with overshoot on release. A flick carries it to the next quarter.
- **R3. Slide platforms.** A sliding platform moves along a visible rail between integer stops. Dragging follows the rail's screen direction, with rubber-banding past the ends and a snap to the nearest stop on release.
- **R4. Tap to walk.** Tapping a walkable tile walks the wanderer there along the shortest path in the graph of the current arrangement. Tapping somewhere unreachable walks the wanderer as close as it can get, and the wanderer looks toward where the child tapped (the world answers; no verdict sound).
- **R5. Perspective joins.** Two walkable tops that touch on screen connect when the nearer one is at least as high and neither seam is hidden, even when they are far apart in 3D. The wanderer crosses the seam without a visible jump.
- **R6. Riding.** A wanderer standing on a segment or platform rides along when it moves. A move that would leave the wanderer's tile unwalkable (covered or turned on its side) is refused: the segment bumps back.
- **R7. The door.** Reaching the door opens it with light and a warm chord; the wanderer steps in, looks back once, and the ring turns to the next diorama. The diorama left behind turns back to its starting arrangement, ready for another visit.
- **R8. Open ring.** A ring of five little models of the dioramas sits along the bottom edge. Tapping any of them travels there at once. Nothing marks a diorama as done, visited, or next. Leaving mid-puzzle keeps that diorama exactly as it was.
- **R9. Companion.** A faceted bird has its own personality (snappy, curious, hops, never walks). In one diorama it is the moving bridge: dragging it hops it along its perch posts into a gap, where its teal back is a path. Elsewhere it perches, watches the wanderer, and points with its body at what matters while the child is idle.
- **R10. Guidance ladder.** After an idle stretch the thing worth touching glows; a little later a ghost hand demonstrates one move (turning that handle, sliding that platform, hopping the bird, or tapping the door once it is reachable). It never shows how far to turn. It backs off with doubling gaps, stops after four demonstrations, and vanishes on any touch. On first open the wanderer lifts the lantern toward the door.
- **R11. Age dial.** `ctx.childAge` sets how long the ladder waits (7 or unknown: glow 3 s and demo 5 s; 8: 4 s and 7 s; 9+: 6 s and 10 s). Every diorama is open to every age.
- **R12. Lossless.** The arrangement of every diorama, the wanderer's tile in each, and the current diorama are saved through `ctx.storage` on every settle, arrival, and travel, and read back through a defensive `deserialize`. Put-away mid-drag settles the segment to the nearest valid quarter.
- **R13. Wordless.** No words or numerals on the kid side; no voice instructions.
- **R14. Sound on every touch.** Synthesized with raw Web Audio: stone grind while turning, detent ticks, a heavy snap, a scrape for slides, footsteps, a shimmer on impossible joins, the door chord, bird chirps and flaps, a lantern chime, and a soft stone tock for taps on plain architecture.
- **R15. Alive at idle.** The wanderer breathes and looks around, the lantern flickers and sways, the bird bobs and snaps its head, motes drift in the dusk, and the door light breathes. All of it stops when unattended or hidden.
- **R16. Performance.** DPR capped at 2; under 80 draw calls; no shadow maps; no post pass; geometry built once per page; zero per-frame allocation in the loop; adaptive quality tiers; `window.__jamPerf` and a `?fps=1` bar-graph overlay; `?tier=N` override. Target `cpuP95Ms` under 8 ms at 6× CPU throttle.

### Scope boundaries

- No levels, unlock order, stars, completion marks, counters, timers, or streaks (Tada R15). The ring is navigation, not progress.
- No text, numerals, or voice instructions on the kid side.
- No textures fetched or committed; the ghost hand and glows are drawn on canvases at startup.
- No new dependencies. Raw three.js (on Tada's own tech menu), not react-three-fiber, so the port needs no jam allowance for the view layer.

## Key Technical Decisions

- **KTD1. The world is an integer voxel lattice.** Solid cells are unit cubes. A cell may mark faces as path faces (local normals); a path face is walkable when it points +y in the current arrangement and the cell above is empty. Groups (turn or slide) move whole cells by exact quarter-turn rotation matrices or integer offsets, so every snapped arrangement stays on the lattice and is testable. Rotation pivots must sit at a cell centre or a cell corner in the rotation plane (validated in tests).
- **KTD2. Screen adjacency by ground-equivalent keys.** The camera is a true-isometric orthographic camera looking along −(1,1,1). A top at cell `(x, y, z)` has key `(x − y, z − y)`; two tops are screen-adjacent when their keys differ by one step. Same-height neighbours are real joins. Different-height neighbours are perspective joins only when the nearer tile (key +x or +z) is at least as high and an inset sample on each side of the seam is visible from the camera (a voxel ray march along +(1,1,1) through the solid set). The walker crosses a perspective join by switching 3D positions at the seam midpoint, where both positions project to the same screen point.
- **KTD3. Graphs per arrangement, cached.** A diorama's arrangement is a small integer vector (≤ 4 states per group, ≤ 3 groups → ≤ 64 arrangements). Graphs are computed on demand with integer-packed cell keys and cached per arrangement; a background pass fills the cache one arrangement per frame after a diorama opens so the solver never causes a long task.
- **KTD4. A solver drives guidance.** BFS over (arrangement, walker component) finds the shortest sequence of moves to the door. The first move names the one thing worth touching; the ghost hand demonstrates the verb on that handle (a partial turn), not the answer.
- **KTD5. Raw three.js, unlit vertex-lit shader.** One `ShaderMaterial` for all architecture computes flat facet shading in the vertex shader from world normals (top brightest, left face mid, right face darker, shadows tinted violet), a thin light lip on upper edges, and a height fade into the sky colour at the vertex's screen height. The fragment shader only outputs the interpolated colour, which keeps software-GL fill cost minimal. Static cells are greedy-meshed per diorama into one geometry; each group is one geometry; path tops are bevelled pavers.
- **KTD6. Hue split.** Architecture is warm coral and rose with lavender shadows; walkable tops are cool mint-teal pavers; handles, grips, and the bird's perch posts are saturated sunflower yellow with indigo hubs; the wanderer wears deep indigo with a warm lantern; the door is bright warm light in an indigo arch. Nothing the child can use shares a hue with the architecture.
- **KTD7. One scene, one render call.** Sky triangle, dioramas, characters, glows, the ring models and a pixel-space layer (ring track, ghost hand, tap ripples) all live in one scene under the isometric camera. The ring models reuse each diorama's geometry and float toward the camera under their pixel slots; the pixel layer is a camera-aligned group scaled to CSS pixels. Because the camera never rotates, every billboard shares its orientation. No post pass. (Revised from two scenes: one render call is cheaper and needs no depth clear.)
- **KTD8. Adaptive tiers with hysteresis.** Tier 0–3 sets DPR 2 / 1.5 / 1.25 / 1 and trims motes, far silhouettes, lantern halo, and sky dither. A pure `TierGovernor` steps down when the median frame over a 90-frame window exceeds 19 ms and steps up only after a calm stretch that doubles after every step down. `?tier=N` pins a tier.
- **KTD9. Per-character motion personalities.** The wanderer is legato (eased weight shifts, pendulum lantern driven by body acceleration, careful short steps with a waddle roll). The bird is staccato (discrete head snaps, tail flicks, double-flap hops with a deep crouch, never walks). Handles have mass (lagging spring and detents). No motion routine is shared with a parameter swap, and none reuses Pebble Table's.
- **KTD10. Framework-free controller.** `controller.ts` owns rules, input, walking, mechanisms, guidance, transitions, saving, and sound triggers; the view reads a snapshot each frame and hands the controller a projector. Tests drive it with a fake projector.

## Implementation Units

Each unit lists files and the scenarios its tests cover.

### U1. Lattice and graph (`games/turning-tower/world.ts`, `world.test.ts`)
- Cell and group types, quarter-turn rotation of points and normals, arrangement → solid set and walkable tiles, screen keys, seam visibility ray march, graph with real and perspective joins, BFS path, nearest reachable tile.
- Tests: rotation of centres and normals for each axis; pivot validation; a covered top is not walkable; same-height neighbours join; a nearer-higher top joins by perspective; a nearer-lower top does not; a hidden seam does not; BFS finds the shortest path; nearest reachable tile.

### U2. Dioramas (`rooms.ts`, `rooms.test.ts`)
- Five authored dioramas (First Turn, The Ferry, Impossible Stair, Bird Bridge, The Crank) with start tile, door tile, groups, start arrangement, decor, and camera fit.
- Tests, for every diorama: no two cells overlap in any arrangement; pivots valid; start and door walkable at the start; door unreachable at the start; the solver reaches the door; Impossible Stair's solution crosses a perspective join; no unintended joins (edge list snapshot per solved arrangement).

### U3. Solver and guidance (`solver.ts`, `guidance.ts`, tests)
- Solver as KTD4. Hint scheduler with age-scaled timing, doubling gaps, four demonstrations per idle stretch, first-open lantern lift, any touch resets. Hand pose for tap, turn arc, and slide demonstrations.
- Tests: schedule timings per age; touch resets glow and demo; at most four demos; first-open invitation stops after a touch; hint kinds chosen from state (door reachable → tap door; else the first move's group).

### U4. Input and tiers (`input.ts`, `tiers.ts`, tests)
- Gesture tracker: press, tap, drag start/move/end, at most three fingers, a fourth cancels until the hand lifts. Tier governor per KTD8. No separate save-cadence module: nothing changes during a drag that needs saving, so the controller saves on every settle, arrival, travel, and put-away, and the host debounces.
- Tests: tap vs drag slop; four-finger cancel; governor steps down on slow frames, steps up after calm, backs off; `?tier` pin.

### U5. Saved state (`state.ts`, `state.test.ts`)
- `{ v: 1, current, rooms: { [key]: { groups: number[], walker: number | null } } }`; defensive `deserialize` (unknown keys dropped, group values clamped to their stops, walker tile validated), `serialize`.
- Tests: default state; round trip; corrupt, old, and hostile shapes do not crash and repair to valid values.

### U6. Controller (`controller.ts`, `projection.ts`, `motion.ts`, `controller.test.ts`)
- Rules, walking with seam crossing, riding, drag rotation and slide with springs, refused settles, door entry, ring travel, rewind on door exit, guidance, save cadence, sound triggers, pause on unattended.
- Tests (fake projector, silent sound): tapping a tile walks there; tapping unreachable walks to the nearest reachable tile; a turn settles to the nearest quarter and saves; a refused turn bumps back; riding moves the walker's world position; reaching the door travels to the next room and rewinds the old one; ring travel keeps the old room's arrangement; pause mid-drag settles.

### U7. View (`view/*.ts`) and Mount (`turning-tower.tsx`, `manifest.ts`, `index.ts`)
- `projection.ts` (the isometric camera as plain math, shared by hit tests and the view), `motion.ts` (springs and the two characters' motion personalities), `view/palette.ts`, `view/materials.ts` (facet shader, sky, motes, glow and hand textures), `view/build.ts` (greedy meshing, pavers, decor primitives, door), `view/characters.ts` (wanderer and bird rigs), `view/perf.ts` (`__jamPerf`, overlay), `view/view.ts` (renderer, camera, ring models, pixel layer, loop, ResizeObserver, tiers).
- Verified by the style spike screenshot, the perf probe, and the scripted walkthrough.

### U8. Audio (`audio.ts`)
- Raw Web Audio synth per R14; context created inside the first touch, suspended when unattended, rebuilt if WebKit leaves it interrupted or closed; nodes disposed on cleanup.

### U9. Docs and registry
- `games/turning-tower/ART.md`, `games/turning-tower/REFINEMENT.md` (30 passes), one registry row in `docs/art-direction.md`.

## Sequencing

1. U1 → U2 → U3 (pure logic, test-first where the geometry is subtle).
2. U4, U5.
3. U6.
4. U7 + U8: style spike on First Turn and Impossible Stair (screenshot at 1180×820, probe at DPR 2), register the style, then the full view.
5. First publish and draft PR once playable.
6. Thirty refinement passes (look, clarity for a 7-year-old, guidance, weight and squash, per-character motion, sound, perf), each re-measured.
7. U9, final checks, final publish.

## Verification

- `npm run check` (TypeScript, vitest, egress, wordless), `npm run build && npm run egress:built`.
- Perf probe (Project store `internal/jam-10-games/perf-probe.mjs`) on the production build at 1180×820, DPR 2, touch: Chromium at 4× and 6× CPU throttle (`cpuP95Ms`), WebKit fps relative to Pebble Table measured the same way in the same session; draw calls and triangles from `renderer.info`.
- Scripted walkthrough with `page.clock` for smooth capture; idle screenshot after about 6.4 s for the glow and a demonstration.

## Risks

- **Seam depth artefacts.** Crossing a perspective join switches the walker's depth; nearby geometry could clip it for a frame. Mitigation: author seams away from occluders; render the walker with a small polygon offset toward the camera.
- **Clarity of joins for a 7-year-old.** The aha must be discoverable. Mitigation: the ghost hand points at the handle that creates the join; the wanderer lifts the lantern toward the door; paths are one hue.
- **Software-GL numbers.** Absolute fps on this VM is meaningless; report CPU proxies and fps relative to Pebble Table.
