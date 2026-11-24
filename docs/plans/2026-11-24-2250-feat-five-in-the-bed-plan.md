---
title: Five in the Bed - Plan
type: feat
date: 2026-11-24
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# Five in the Bed - Plan

## Goal Capsule

- **Objective:** A child of 3 to 6 parts five sheep between two halves of a bed in every way there is, sees that they stay five, and laughs at what each parting sets off, with no word on screen and nothing that tests them.
- **Means:** A canvas 2D jam game from the cartridge template, a small circle physics under a tufted-rug view (KTD1, KTD2).
- **Authority:** the owner's request, then `AGENTS.md`, then this plan, then `games/five-in-the-bed/ART.md`.
- **Profile:** one draft pull request. Merging is the owner's decision.
- **Stop when:** the game cannot meet a rule of `AGENTS.md`, or both reserved looks fail on clarity.

## Product Contract

### Summary

Five fat toy sheep lie in a bed with a ridge down the middle. A tap rolls one over, a shove rolls any number. Milk stands on a shelf over each half, five bottles in all, and straws show whose bottle is whose. A quilt hides one half. With no milk out, each of the sixteen partings puts on its own act.

### Problem Frame

No jam game names splitting a group into parts, and both lists of records have it.

### Key Decisions

- **A whole game** (session-settled: user-directed, chosen over a thin prototype: the request was to go deep). Governs R1 to R12.
- **The bottles ask, so that the quilt never has to** (the ideation's weak point was a quiz about the hidden number). Governs R4, R5, R6.

### Requirements

- R1. A tap rolls a sheep over the ridge; a drag or fling shoves any sheep anywhere in the bed; a finger on bare mattress shoves what it meets.
- R2. There are always five sheep in the bed, each at rest in exactly one half, none overlapping.
- R3. Sheep settle into a group in the hollow of their half and right themselves.
- R4. Milk is five bottles parted over two shelves. When the sheep have settled, straws join bottles to sheep one to one within a half. A parting that does not fit shows a dangling straw and a sheep without one.
- R5. A parting that fits is drunk, and the cycle ends. The next deal waits for the child's touch on the dog.
- R6. The quilt goes over either half by tap or drag and comes off the same way. Sheep under it are hidden, can be poked and can be shoved. Nothing asks what is under it.
- R7. With no milk out, each new settled parting plays the act of its smaller part; the same parting always plays the same act.
- R8. When all five are on one side with no milk out, the dog gets into the other, until a touch.
- R9. Deals follow four hidden positions, moved only between cycles.
- R10. Put away at any instant, the game opens as left and nothing replays.
- R11. Wordless, symbol-free, idle guidance, the quality bar and the registered look.
- R12. The claim is the sheet's.

### Acceptance Examples

- AE1. Three left and two right, two bottles left and three right: one left sheep has no straw and one right straw drips. Tap a left sheep: it rolls over, all five straws fit, the milk goes. Covers R1, R4, R5.
- AE2. The same with the quilt over the right half: the left half fits its two bottles, and the milk goes. Covers R6.
- AE3. Put away with a sheep in mid-roll that would make it fit: it opens with the milk drunk. Covers R10.
- AE4. No milk, Tup and Curl alone on the left: they quarrel. Again later: they quarrel. Covers R7.

### Scope Boundaries

No numerals, score, sixth sheep, third part, falling out of bed, speech or two-child mode.

## Planning Contract

### Key Technical Decisions

- KTD1. Canvas 2D from `templates/cartridge`; look "Tufted play rug", fallback "Backlit peg dots".
- KTD2. `bed.ts` is a pure fixed-step simulation (1/120 s) of five circles, a ridge and two hollows. `game.ts` holds milk, acts and saving over it. The view reads both.
- KTD3. A save runs a copy of the simulation to rest (R10).
- KTD4. `play.ts` takes pointers by id in stage units, shared by the Mount and the tests (`docs/solutions/conventions/touch-rules-that-keep-a-small-childs-finger-in-charge.md`).
- KTD5. Each sheep is a ball with an orientation; its features are points on the sphere, so rolling is drawn truly and no sprite per angle is needed.
- KTD6. Acts are pure functions of who and when, returning poses; lifts and spins only, so they cross nothing.

### Assumptions

- Sheep radius 66 and a half wide enough for five, held by a test.

### Risks

- A cluster could jam against the ridge: a test rolls every sheep over from every parting.
- Five siblings touch the same registry rows: single lines only.

## Implementation Units

### U1. Sheet
- **Goal:** the checked design sheet. **Requirements:** R12. **Files:** `games/five-in-the-bed/ART.md`. **Verification:** the checker's pass recorded in `REFINEMENT.md`.

### U2. Rules and save
- **Goal:** physics, milk, acts' table, positions, save. **Requirements:** R1 to R10. **Files:** `bed.ts`, `milk.ts`, `acts.ts`, `game.ts`, `save.ts` with tests. **Test scenarios:** AE1 to AE4; overlap budget under random play; every tap from every parting crosses; all 32 partings reachable; corrupt saves; put-away at random instants. **Verification:** `npx vitest run games/five-in-the-bed`.

### U3. Touch
- **Goal:** the pointer path. **Requirements:** R1, R6. **Files:** `play.ts`, `play.test.ts`. **Depends:** U2. **Test scenarios:** tap, slip, lifted carry, cancel, palm, second finger, quilt by tap and drag.

### U4. Look, motion, sound, guidance
- **Goal:** the visible game. **Requirements:** R3, R4, R8, R11. **Files:** `paint.ts`, `rug.ts`, `sheep.ts`, `props.ts`, `view.ts`, `voices.ts`, `guide.ts`, `five-in-the-bed.tsx`. **Depends:** U2, U3. **Test scenarios:** no bad number drawn in any act, acts differ, frame budget, voices in range.

### U5. Refine and register
- **Goal:** logged passes, cold playtest, registry row, cover. **Files:** `REFINEMENT.md`, `docs/art-direction.md`, `README.md`, `harness/shelves.ts`, `harness/covers/`. **Depends:** U4.

## Verification Contract

`npm run check`, `npm run build`, `npm run egress:built`, `npm run education:built`, `npm run perf:jam -- five-in-the-bed`, and overlap tests in place of the three.js audit.

## Definition of Done

Every R is shown by a test or a still, the gates pass, the sheet has passed, abandoned code is gone, and a draft pull request is open.
