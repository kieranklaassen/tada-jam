---
title: Half a Horse - Plan
type: feat
date: 2026-11-24
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# Half a Horse - Plan

## Goal Capsule

- **Objective:** Two children at one tablet can each drive one half of the same pantomime horse at the same time, and one child alone still has a whole funny animal.
- **Means:** A jam cartridge on canvas 2D in the Cloth busy-book look, with touch tracked per finger (KTD1, KTD3).
- **Authority:** `AGENTS.md`, then `docs/solutions/conventions/building-a-jam-game.md` and the game-design pack, then this plan. `games/half-a-horse/ART.md` owns the design detail once it exists.
- **Stop conditions:** A jam rule that the two-finger play cannot meet.
- **Execution profile:** One pull request. The owner merges.

## Product Contract

### Summary

A huge padded cloth animal stands side-on in a farmyard with a performer in each end. Each half is moved by its own finger. The cloth between them stretches, sags, twangs and ties. Farm animals believe in it while the halves agree and gape when they do not.

### Problem Frame

No game in the jam is made for two children at once. The template follows one finger, so this is also the jam's first game with two equal hands.

### Key Decisions

- **Built now as the full game.** (session-settled: user-directed — chosen over a throwaway sketch first: the owner asked for every idea to be built at full quality) Governs R1 to R12.
- **Halves are equal and nothing needs agreement.** A child who walks off has made a joke, not a mistake. Governs R1, R4.

### Requirements

- R1. Two fingers drive the two halves at once, each independent of the other; a third finger can use the rest of the yard.
- R2. The cloth stretches thin, sags when slack, bunches when squeezed, springs back when let go, and ties in a bow while the halves stand crossed.
- R3. An end answers a finger when it lands, and a tap makes it do its own act.
- R4. A half no finger holds has its own nose: the rear goes to food, the front to its reflection, and neither ever pulls against a held half hard enough to take it from its finger.
- R5. Eight ends (horse, hen, elephant, crocodile; head and bottom of each) can be worn by either performer. A tap puts a head in front and a bottom behind; a carry puts anything anywhere.
- R6. Four spectators with fixed tastes follow both halves, believe while they agree, and gape each in their own way.
- R7. Eight routines need both halves: trot, leap, twang, bow, see-saw, tower, squash and skipping rope. Each has its own sound and its own effect on the yard.
- R8. Leading both halves into the stable ends the show; it stays ended until a touch.
- R9. A resting palm never moves, drops, gives or ends anything, and never takes a half from a working finger.
- R10. Put away at any instant, the yard is found as left and no scene replays.
- R11. No word, letter, numeral or sign; no score, praise, timer or count.
- R12. Every line of the quality bar in `docs/art-direction.md` is met, with measured frame work and an honest statement about what was not measured.

### Scope Boundaries

- No learning claim and no education records.
- No edit to the look menu's states, the template, the harness or another game.
- No promise that it has been tried with children: it has not.

## Planning Contract

### Key Technical Decisions

- KTD1. Canvas 2D in the Cloth busy-book look. The stretching middle is the subject and a 2D ribbon of printed cloth shows it best.
- KTD2. One pure module, `play.ts`, takes pointers by id and stage points and the seconds of each frame. The Mount and every touch test call the same path (touch rule 14).
- KTD3. `hands.ts` replaces the template's one-finger `input.ts`: a contact is bound to a target at landing. A half has one holder; a contact that lands on nothing, or a second one on a held half, gets a small answer and acts on nothing. A holder that has lain still a second hands over to the next finger that lands on that half.
- KTD4. Cloth is a verlet chain between two attach points, stepped at a fixed 120 Hz, and its thickness follows local stretch. The halves are point bodies with a floor; drawing never feeds back.
- KTD5. Routines are detected in a pure module from a short history of both halves, so each is testable from pointer scripts.
- KTD6. Lifting a half is itself the act (touch rule 2's stated exception), so a half falls at once and a finger landing near it takes it up again; a carried costume keeps the 0.3 s grace. A cancel sets a half down softly and sets off no routine.

### High-Level Technical Design

```text
pointers -> hands -> play -> halves + cloth -> routines -> reactions (spectators, yard)
                       |                                        |
                       +-> save                                 +-> sound notes, view
```

### Assumptions

- With `childAge` null or any age the yard opens the same.
- A tablet reports both fingers as separate pointers; browsers with touch do.

### Risks

- A toddler's whole hand on the glass: R9, tests with four contacts.
- The undriven half reading as the game playing itself: its own moves are slow, and stop the moment a finger takes it.
- No physical tablet and no two children are available; the pull request says so.

## Implementation Units

### U1. Sheet, hands and bodies

- **Goal:** Design sheet checked by a fresh reader; the two halves and the cloth play in an empty yard.
- **Requirements:** R1, R2, R4, R9
- **Files:** `games/half-a-horse/ART.md`, `hands.ts`, `halves.ts`, `cloth.ts`, `play.ts`, with tests
- **Approach:** KTD2 to KTD4, KTD6.
- **Test scenarios:** two pointers move two halves in one frame; a third contact on a held half changes nothing; four resting contacts change nothing; stretch then lift snaps back and settles; cancel sets off no twang; cloth length stays finite under violent moves.
- **Verification:** `npx vitest run games/half-a-horse`

### U2. Yard, ends, spectators and routines

- **Goal:** Everything in the sheet's grid happens.
- **Requirements:** R3, R5 to R8, R10
- **Files:** `ends.ts`, `routines.ts`, `crowd.ts`, `yard.ts`, `save.ts`, `sound.ts`, with tests
- **Approach:** KTD5.
- **Test scenarios:** every routine from a pointer script, and not from one finger; each of the eight acts differs in pose and notes; each spectator's reactions differ; save and load at every state; corrupt saves repaired.
- **Verification:** as U1.

### U3. The look

- **Goal:** Cloth busy-book, edge to edge.
- **Requirements:** R11, R12
- **Files:** `print.ts`, `paintYard.ts`, `paintEnds.ts`, `paintCrowd.ts`, `view.ts`, `half-a-horse.tsx`, `guidance.ts`, `config.ts`
- **Test scenarios:** draw count under budget in the fullest frame, no filter or blur in a frame, overlap tests of what is drawn against what is touched.
- **Verification:** stills at 1180×820, logged passes in `REFINEMENT.md`.

### U4. Gates and shared rows

- **Goal:** Ship.
- **Requirements:** R12
- **Files:** one row in `README.md`, one row in `docs/art-direction.md` section 3
- **Test expectation:** none -- documentation rows.
- **Verification:** the Verification Contract.

## Verification Contract

- `npm run check`; `npm run build`, `npm run egress:built`, `npm run education:built`.
- A walkthrough on a production build with two touch points at once, and a cold playtest proxy.
- `npm run perf:jam -- half-a-horse chrome 6 tier0`, reported with the renderer named.

## Definition of Done

- Every requirement has a test or a logged still. The sheet has passed a fresh reader. The pull request says what was not measured. No abandoned code is left.
