---
title: Wrap the Cat - Plan
type: feat
date: 2026-11-24
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# Wrap the Cat - Plan

## Goal Capsule

- **Objective:** A child of 3 to 7 circles anything in a room with a finger, paper winds onto it tight to its shape, and the child rips it off again. What to do, what comes of it and what to do next are visible in the first frame, with no word on screen.
- **Means:** A new canvas 2D jam game from the cartridge template, with a pure paper model under a crepe paper view (KTD1, KTD2).
- **Authority:** Kieran's request, then `AGENTS.md`, then this plan, then `games/wrap-the-cat/ART.md`.
- **Profile:** one draft pull request. Merging stays with Kieran.
- **Stop when:** the game cannot meet a rule of `AGENTS.md`, or its look fails on clarity and the backup fails as well.

## Product Contract

### Summary

A room before a holiday: a bicycle half wrapped, its roll still hanging from it, a cat sitting on the end of the paper. The finger winds paper where it goes round a thing. When a thing is covered the paper pulls tight and a bow springs up. A finger on a finished parcel rips it. A door lets the family in to rip everything at once.

### Key Decisions

- **Build the whole game, not a thin prototype** (session-settled: user-directed, chosen over a prototype: the request was to go deep). Governs R1 to R12.
- **The loop is judged first, at the young end of the band** (session-settled: user-directed, chosen over depth first: the loops of the last games were hard to follow). Governs R1, R2, R8.
- **No learning claim.** The game names no education record. Governs R12.

### Requirements

- R1. Paper appears where the finger is, as it moves. A wobbly, broken, reversed or scribbled circle wraps, and so do taps alone.
- R2. Touching a finished parcel tears it. A swipe or three taps bring all of that layer off.
- R3. A wrapped thing keeps its own shape, and bare patches show what is left.
- R4. Seven things can be wrapped: bicycle, cat, grandpa in his chair, giraffe, tuba, tree, and a circle of nothing.
- R5. A living thing keeps its head out of the paper, always.
- R6. Each thing behaves in its paper in a way of its own and comes out of it in a way of its own.
- R7. Three papers (crackly, stretchy, see-through) that rip differently; up to three layers on one thing; two things inside one circle are tied together.
- R8. On opening, a mouse wraps and rips a cheese, start to finish. Idle guidance then shows one next act.
- R9. A tap on the door sends the family through every finished parcel. With none, they only look in.
- R10. Scraps stay on the floor, answer a finger, and are capped.
- R11. Put away at any moment, the room opens as left; nothing replays.
- R12. The game meets the quality bar, the wordless rule and the registered look.

### Acceptance Examples

- AE1. First visit, the finger goes round the bare side of the bicycle: the rest fills, the paper pulls tight, a bow springs. A swipe over it: the paper bursts off. Covers R1, R2.
- AE2. Two fifths of a circle, lifted, then the rest the other way round: wrapped. Covers R1.
- AE3. One circle round the cat and the bicycle: both wrapped, with one sash. Covers R7.
- AE4. Red, then yellow, then blue on the giraffe; three rips, three papers. Covers R7.
- AE5. Three parcels, door: three are bare and saved bare from the moment of the tap. Covers R9, R11.

### Scope Boundaries

No carrying, no guessing what is inside, no gifts to earn, no more rooms, no score, no speech.

## Planning Contract

### Key Technical Decisions

- KTD1. Canvas 2D from `templates/cartridge`. The look is the ledger row "Crepe paper and wire"; the backup is "White card model".
- KTD2. Coverage is sixteen wedges round each thing's middle, one bit each. The finger covers the wedge it is in, so every kind of circle works; the view draws the wedges as a spiral sweep over a wrapped picture of the thing.
- KTD3. A wrapped picture is made from the thing's own silhouette, stroked outward and filled, so paper hugs any shape with no second drawing.
- KTD4. `model.ts` is pure with a fixed step; `play.ts` takes pointers and is shared by the Mount and the tests.
- KTD5. The family's result is saved when the door is tapped.

### Risks

- A circle round one thing passes over its neighbours: a drag works for one thing at a time, and another joins only when it has itself been circled.
- A second layer laid by mistake: a drag that finished a thing lays nothing more on it.

## Implementation Units

- U1. Sheet, checked by someone who did not write it. `games/wrap-the-cat/ART.md`.
- U2. Paper model, save, pointer path, with tests (R1, R2, R4, R7, R9 to R11). `layout.ts`, `model.ts`, `state.ts`, `play.ts`.
- U3. Look, motion, sound, guidance (R3, R5, R6, R8, R12). `crepe.ts`, `things.ts`, `room.ts`, `view.ts`, `voices.ts`, `guide.ts`, `wrap-the-cat.tsx`.
- U4. Refine in logged passes, cold playtest, registry row, cover. `REFINEMENT.md`, `docs/art-direction.md`, `README.md`.

## Verification Contract

`npm run check`, `npm run build`, `npm run egress:built`, `npm run education:built`, `npm run perf:jam -- wrap-the-cat`.

## Definition of Done

Every R is shown by a test or a still, the gates pass, the sheet has passed, abandoned code is gone, and a draft pull request is open.
