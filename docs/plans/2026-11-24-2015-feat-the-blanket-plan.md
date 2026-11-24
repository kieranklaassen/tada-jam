---
title: The Blanket - Plan
type: feat
date: 2026-11-24
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# The Blanket - Plan

## Goal Capsule

- **Objective:** A child of 3 to 7 can make a family member believe the sausage is where it is not, see that belief in the character's eyes, and enjoy the consequence, with no word on screen and nothing that tests them.
- **Means:** A new canvas 2D jam game from the cartridge template, with a pure belief model under a poster-style view (KTD1, KTD2).
- **Authority:** Kieran's request, then `AGENTS.md`, then this plan, then `games/the-blanket/ART.md`.
- **Profile:** one draft pull request. Merging stays with Kieran.
- **Stop when:** the game cannot meet a rule of `AGENTS.md`, or its look fails on clarity and the fallback look fails as well.

## Product Contract

### Summary

A large family lazes in a parlour round one sausage. A tap drops a blanket over a head or whips it off. Whoever is under a blanket sees nothing. The child puts the sausage somewhere else. When the blanket comes off, that character dashes to the last place they saw the sausage. A dinner bell sets them all off at once.

### Problem Frame

No jam game for ages 2 to 6 is about what somebody else knows. Children enjoy a trick on a character who notices only what is in front of it (pack: game-design, ages-4-to-6.md), and covering things is an action small children repeat unprompted (pack: game-design, ages-2-to-4.md).

### Key Decisions

- **The child causes the false belief** (session-settled: user-directed, chosen over a thin mechanic prototype: the request was to go deep). Governs R1, R3, R4.
- **No learning claim.** The game names no education record. Governs R12.

### Requirements

- R1. Tapping a character toggles a blanket over it, and a blanket can also be carried by drag.
- R2. The sausage moves by drag, or by a tap on the place where it should go. Taps alone reach every place and the whole trick; a blanket on a thing and a sausage on a head are drags.
- R3. A character who is seated and uncovered sees where the sausage goes, with one exception: nobody sees the top of its own head.
- R4. A character uncovered by the child dashes to the place it believes in. The sausage there is eaten; an empty place gets a reaction of that character's own and leaves it not knowing.
- R5. A character who does not know copies the gaze of the nearest seated, uncovered character who believes something.
- R6. An uncovered, seated character loses a belief in a place it sees found empty, and learns a place where it sees the sausage found.
- R7. The bell throws off every blanket, and everyone dashes on the belief held at that moment.
- R8. A seated uncovered character's eyes point at its belief, follow the sausage in the hand, and wander when it does not know.
- R9. The child can always see where the sausage is.
- R10. An eaten sausage ends the cycle. The next one hangs in sight and comes down on the child's touch.
- R11. Put away at any moment, the game opens as left: no dash replays, and nothing is lost.
- R12. The game meets the quality bar, the wordless rule and the registered look.
- R13. Blankets also fit over places and the goldfish bowl. A character who dives into a blanketed place comes home wearing the blanket.
- R14. A sausage dropped on an uncovered character is eaten, and on a covered one rests on its head.

### Acceptance Examples

- AE1. Dog covered, sausage moved from dish to teapot, dog uncovered: the dog dives at the dish and finds nothing, and the cat keeps looking at the teapot. Covers R3, R4, R8.
- AE2. Each character covered in turn with a move between: four beliefs in four places, and the bell sends four dashes to four places. Covers R7.
- AE3. Sausage on the covered aunt's head, aunt uncovered: she dashes to the old place with the sausage on her head. Covers R3, R14.
- AE4. The cat knows nothing, and the uncovered dog believes in the boot: the cat, covered and uncovered, dashes to the boot. Covers R5.

### Scope Boundaries

No levels, score, more rooms, second sausage, speech or two-child mode.

## Planning Contract

### Key Technical Decisions

- KTD1. Canvas 2D from `templates/cartridge`. The look is the ledger row "Sponge-stippled flat poster"; the fallback is "Folk-painted panel".
- KTD2. `model.ts` is pure and deterministic with a fixed step; everything seen and heard follows its state and event list.
- KTD3. A dash is a view of state: the save holds what the room settles to when nobody touches it, computed by running a copy of the pure model until everyone is seated (R11).
- KTD4. `play.ts` takes pointers by id and surface pixels; the Mount and tests share it (`docs/solutions/conventions/touch-rules-that-keep-a-small-childs-finger-in-charge.md`).
- KTD5. Figures are cached part sprites posed by a per-character personality in `motion.ts`.

### Assumptions

- Four characters (dog, cat, aunt, grandpa), five places (dish, teapot, boot, flowerpot, gramophone) and four blankets.
- A character who is out of its seat is busy and sees nothing.

### Risks

- Gaze is ambiguous when places are close together. Places ring the room, and a test holds a minimum angle between targets from each seat.
- Sibling branches add rows to the same registry, so shared edits are single lines.

## Implementation Units

### U1. Sheet
- **Goal:** the design sheet in `games/the-blanket/ART.md`, checked by someone who did not write it. **Requirements:** R1 to R14. **Files:** `games/the-blanket/ART.md`. **Verification:** the checker's pass is in `REFINEMENT.md`.

### U2. Rules and save
- **Goal:** the belief model. **Requirements:** R1 to R7, R10, R11, R13, R14. **Files:** `games/the-blanket/model.ts`, `layout.ts`, `save.ts` with tests. **Test scenarios:** AE1 to AE4; every place found full and empty by every character; put-away at every step of a dash; corrupt saves; random play keeps the invariants. **Verification:** `npx vitest run games/the-blanket`.

### U3. Touch
- **Goal:** pointer path. **Requirements:** R1, R2. **Files:** `play.ts`, `play.test.ts`. **Depends:** U2. **Test scenarios:** tap, slip, lifted carry, cancel, palm, dropped nowhere.

### U4. Look, motion, sound, guidance
- **Goal:** the visible game. **Requirements:** R8, R9, R12. **Files:** `paint.ts`, `room.ts`, `figures.ts`, `things.ts`, `motion.ts`, `view.ts`, `voices.ts`, `guide.ts`, `the-blanket.tsx`. **Depends:** U2, U3. **Test scenarios:** gaze points at the belief, motion differs per character, the frame stays in budget, voices in range.

### U5. Refine and register
- **Goal:** logged passes, a cold playtest and the registry row. **Files:** `REFINEMENT.md`, `docs/art-direction.md`, `README.md`. **Depends:** U4.

## Verification Contract

`npm run check`, `npm run build`, `npm run egress:built`, `npm run education:built`, `npm run perf:jam -- the-blanket`, and overlap tests in place of the three.js audit.

## Definition of Done

Every R is shown by a test or a still, the gates pass, the sheet has passed, abandoned code is gone, and a draft pull request is open.
