---
title: The Removal Bears - Plan
type: feat
date: 2026-11-24
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# The Removal Bears - Plan

## Goal Capsule

- **Objective:** A child turns, swaps and slides awkward furniture until it goes through an odd-shaped opening, and the wrong way is the better joke.
- **Means:** A jam cartridge in raw three.js in the Sugar cubes and biscuit look, with every load and opening made of the same cells (KTD1, KTD2).
- **Authority:** `AGENTS.md`, then `docs/solutions/conventions/building-a-jam-game.md` and both packs, then this plan. `games/removal-bears/ART.md` owns the design detail.
- **Stop conditions:** The look fails on clarity and so does its backup.
- **Execution profile:** One pull request, merged when green. The owner deploys.

## Product Contract

### Summary

Two huge bears built of stacked biscuits hold a piece of furniture in front of a sugar-cube house. A tap on it turns it a quarter, a tap on a bear makes the bears change ends, a drag slides and lifts it, and a tap on an opening sends it up. If its shape goes through the hole it does. If not, the cubes it struck bulge, it bounces off, and it lands on the bear under the side that caught. When all of it is in, the front lifts off and everything is used the way up it went in.

### Problem Frame

No game on main names turning a shape to fit a hole. The idea is close to a shape sorter, so the bears, the passengers and the wrong way carry the comedy.

### Key Decisions

- **The full game.** (session-settled: user-directed — chosen over a thin prototype: "go deep go nice") Governs R1 to R14.
- **Merged when done, not deployed.** (session-settled: user-directed — chosen over leaving it open: the owner wrote to merge to main when done)
- **No speech and no microphone.** (session-settled: user-directed — chosen over a spoken game: the card offered the six that need no speech) Governs R12.
- **A wrong heave costs nothing and is the best joke.** It keeps the load, the turn and the place, and shows which cubes were in the way.

### Requirements

- R1. A tap on the load turns it one quarter; quick taps are all counted.
- R2. A tap on a bear makes the bears change ends, so the load is seen from its back and its shape is mirrored.
- R3. A drag slides the load along the house and lifts it; let go before an opening it is heaved there, elsewhere it stays.
- R4. A tap on an opening carries the load there and heaves it. Everything essential works with taps.
- R5. A load goes in exactly when some placing of its cells lies inside the opening's cells.
- R6. A wrong heave moves exactly the cubes that were in the way and squashes the bear on that side, or both.
- R7. Six loads, each with a passenger or a filling that answers each way up, the swap, the jam and the passing through in its own way.
- R8. Any load may go through any opening it fits, and no order of play leaves a load with no opening.
- R9. The last load in lifts the front off; what is inside lies as it went in and the cub uses it so. Nothing new starts until the child touches the cart or the load on it.
- R10. Positions move one step between houses, never inside one, and nothing shows them.
- R11. Found as left at any instant, and no scene replays.
- R12. No word, letter, numeral or sign; no score, praise, timer or count.
- R13. The touch rules in `docs/solutions/conventions/touch-rules-that-keep-a-small-childs-finger-in-charge.md`, with one exception to rule 4: a tap on an opening heaves the load, since at age 2 everything essential is a tap; a heave that does not fit costs nothing, and a finished house is put away only by a touch of the cart or its load.
- R14. Every line of the quality bar, with measured frame work and a statement of what was not measured.

### Scope Boundaries

- No edit to the look menu, the template, the harness apart from one shelf line and one cover, or another game.
- No Dutch record is named: none found at this age for turning to fit.
- No claim that a child has tried it.

## Planning Contract

### Key Technical Decisions

- KTD1. Loads and openings are sets of cells on one grid. Fit is set inclusion over whole placings, so the drawing and the rule cannot disagree.
- KTD2. An orthographic camera with a small pitch, so a load in front and an opening behind are drawn at one size.
- KTD3. No physics engine. Every motion is a spring or a timed act on game time, so a wrong heave is the same each time and the audit is stable.
- KTD4. One pure module takes gestures in world terms and seconds; the Mount and the tests call it (touch rule 14).
- KTD5. Nothing of three.js is made when a module loads (Pebble Table's audit).
- KTD6. A heave's outcome is decided and saved when it starts; the flight is a view of it.

### High-Level Technical Design

```text
pointers -> input -> game -> rules (cells, houses)
                      |  \-> acts (turn, swap, heave, bounce, deliver, ending) -> poses -> view
                      |-> cues (voices)
                      \-> save
```

### Assumptions

- `childAge` null opens as for the youngest.

### Risks

- It reads as a shape sorter: the passengers and bears are built before a second opening is.
- White on white: cubes are tinted one by one and the loads are the only brown.
- Squash and bounce cross bodies: contact distances are computed, and the audit plays each outcome.

## Implementation Units

### U1. Sheet, cells and houses

- **Requirements:** R5, R8, R10
- **Files:** `games/removal-bears/ART.md`, `cells.ts`, `loads.ts`, `houses.ts`, `save.ts`, with tests
- **Test scenarios:** every load in all eight states against brute force; four turns and two swaps restore; every generated house on every position over many seeds is solvable load by load; the first rung takes half of all turns; corrupt saves repaired; largest save under half the cap.
- **Verification:** `npx vitest run games/removal-bears`

### U2. The toy and the look

- **Requirements:** R1, R2, R3, R14
- **Files:** `game.ts`, `bears.ts`, `view/*`, `removal-bears.tsx`
- **Test scenarios:** fast taps all counted; a swap keeps the cells mirrored; a drag survives a lift; a cancel puts back; a palm changes nothing; bear and load never overlap in any act.
- **Verification:** stills at 1180×820.

### U3. Heaves, passengers, delivery, ending

- **Requirements:** R4, R6, R7, R9, R11
- **Files:** `game.ts`, `acts.ts`, `riders.ts`, `voices.ts`, `guide.ts`
- **Test scenarios:** a blocked cell left, right and both; a fit; put away in every act; nothing starts after the ending without a touch; each rider's voices differ for each act.

### U4. Gates and shared rows

- **Requirements:** R12 to R14
- **Files:** `scripts/intersections/games/removal-bears.ts`; one row each in `README.md`, `docs/art-direction.md` section 3 and `harness/shelves.ts`; a cover
- **Verification:** the Verification Contract.

## Verification Contract

- `npm run check`, `npm run build`, `npm run egress:built`, `npm run education:built`.
- `npm run check:intersections -- removal-bears --ci` repeated, and Pebble Table's, on the merged tree.
- `npm run perf:jam -- removal-bears chrome 6 tier0`, renderer named; a cold playtest proxy.

## Definition of Done

- Every requirement has a test or a logged still. The sheet has passed a fresh checker. The pull request says what was not measured.
