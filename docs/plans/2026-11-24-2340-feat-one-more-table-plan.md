---
title: One More at the Table - Plan
type: feat
date: 2026-11-24
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# One More at the Table - Plan

## Goal Capsule

- **Objective:** A small child sees a packed table with a big knob and a relative waiting with a dish, pulls the knob, and laughs when the relative plops in. Pull again, until the table is out of the window and a moose sits at the end of it.
- **Means:** A jam cartridge on canvas 2D in the Folk-painted panel look.
- **Authority:** `AGENTS.md`, then `docs/solutions/conventions/building-a-jam-game.md` and the game-design pack, then this plan. `games/one-more-table/ART.md` owns the design detail.
- **Stop conditions:** The loop cannot be read from the first frame in either reserved look.
- **Execution profile:** One draft pull request. The owner merges.

## Product Contract

### Summary

The table is an accordion. Pull it and a gap opens; the one who waits jumps in and everyone slides along. Push it shut and everyone is squashed cheek to cheek. Ring the bell and they eat exactly what stands in front of them.

### Key Decisions

- **Built now, in parallel with six others, at full quality.** (session-settled: user-directed — chosen over the table and the shoe first: the owner picked all seven) Governs R1 to R12.
- **What to do shows in the first picture and the loop repeats readably.** (session-settled: user-directed — chosen over rules a child infers: the earlier games' loops were not clear to a small child) Governs R1 to R4.

### Requirements

- R1. One asker: one relative waits, large, with a dish, and nothing else asks at the same time.
- R2. A pull on the knob of about a fifth of the stage seats one relative; a tap on the knob does the same; a pull that got half way is finished for the child. A long pull seats several.
- R3. On a first visit a ghost hand plays one whole round before the child is left to it; any touch ends that.
- R4. The idle ladder glows at 1.5 s and shows the hand at 3 s, and shows the one useful move: pull; ring when nobody is left to come; push when they have eaten.
- R5. The table grows through the dining room and the kitchen, out of the window and over the garden, with everyone on screen at all times.
- R6. Pushed shut, everyone is squashed cheek to cheek and nobody is hurt; let go, they breathe out again.
- R7. The bell starts a feast of 4 to 8 seconds in which each eats the dish before them, with an effect that stays visible. A touch ends it.
- R8. After a feast, pushing shut sends everyone home and the small table is back for the next visit.
- R9. Guests and dishes can be carried: who sits beside whom, and what stands before whom, changes what happens. A dish can be worn.
- R10. Put away at any instant, the table is found as left and no scene replays.
- R11. No word, letter, numeral or sign; no score, praise, timer or count. Family, food and animals only.
- R12. Every line of the quality bar in `docs/art-direction.md` is met, with measured frame work and an honest statement about what was not measured.

### Scope Boundaries

- No learning claim and no education records.
- No voices or music from outside the game's own synthesis.
- The table is straight; bending it round things is left out.
- No edit to the look menu, the template, the harness or another game, beyond one row each in `README.md` and the registry and one line in `harness/shelves.ts`.

## Planning Contract

### Key Technical Decisions

- KTD1. Canvas 2D; each figure is a few cached stroke-built sprites moved by springs, so the frame is under 260 pieces.
- KTD2. One pure module takes pointers by id in surface pixels and the seconds of each frame. The Mount and every touch test use it.
- KTD3. The pull is counted in screen units from where the finger was, not from where the knob is: the picture zooms out as the table grows, and a knob tied to the finger would run away from it.
- KTD4. The seats are an ordered list of guests with widths. Places, the camera and who waits are all derived from that list and one number, the table's extension.
- KTD5. Pairs come from combination: each guest has one act on a neighbour and one way of taking it.

### Assumptions

- `childAge` changes nothing; every age opens the same table.

### Risks

- At full length figures are small. The knob and the bell keep a floor on their size on screen, and the last camera keeps a seat over 50 units wide.
- No child and no iPad are available; the pull request says so.

## Implementation Units

### U1. Rules

- **Goal:** Seats, extension, squash, arrivals, carry, feast, going home, save.
- **Requirements:** R2, R3, R6 to R10
- **Files:** `cast.ts`, `layout.ts`, `table.ts`, `play.ts`, `save.ts`, `guide.ts`, with tests
- **Test scenarios:** a pull seats one; half a pull is finished; under half springs back; a tap seats one; a long pull seats more than one; a cancel seats nobody; squash has a floor and returns; feast then push sends all home; carry reorders; swapped dishes; a palm does nothing; every saved state reloads the same; corrupt saves repaired; seats never overlap at any instant.

### U2. Look and figures

- **Goal:** Folk-painted panel edge to edge, twelve guests with faces that do something.
- **Requirements:** R1, R5, R11, R12
- **Files:** `folk.ts`, `figures.ts`, `house.ts`, `moves.ts`, `view.ts`, `voices.ts`, `one-more-table.tsx`
- **Test scenarios:** frame budget, no picture made in a frame, no bad number, all acts differ, all voices in range.

### U3. Gates and shared rows

- **Goal:** Ship.
- **Files:** one row in `README.md`, one in `docs/art-direction.md` section 3, one line in `harness/shelves.ts`, a cover
- **Test expectation:** none -- documentation rows.

## Verification Contract

- `npm run check`; `npm run build`, `npm run egress:built`, `npm run education:built`.
- A walkthrough on a production build and a cold playtest proxy.
- `npm run perf:jam -- one-more-table chrome 6 tier0`, reported with the renderer named.

## Definition of Done

- Every requirement has a test or a logged still. A fresh reader has passed the sheet. The pull request says what was not measured.
