---
title: Dressed in the Dark - Plan
type: feat
date: 2026-11-24
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# Dressed in the Dark - Plan

## Goal Capsule

- **Objective:** a child of 3 to 7 can open a new jam game, put out the lamp, dress five sleeping animals under their quilts by sound and memory, and put the lamp on to see everyone sit up in what they were given and react.
- **Means:** one canvas 2D cartridge made from the template (KTD1), in the lacquer miniature look (KTD4).
- **Authority:** `AGENTS.md`, then this plan's Requirements, then the two packs, then the Key Technical Decisions.
- **Execution:** one pull request, opened as a draft. Merging stays with the owner.
- **Stop conditions:** the design sheet fails its check on the mechanic; the look fails on clarity or frame rate in all three of the rows set aside for it outside the ledger (lacquer miniature, gummed-paper shapes on black, stained glass and lead).

## Product Contract

### Summary

Five large animals sleep in a row of five beds under equal quilts. In the dark only the window gives light, and the clothes hang on a line in front of it. A garment that goes under a quilt cannot be seen any more; it is heard going on, and the sleeper answers in its own voice. Slippers and skates make their wearer walk in its sleep and change beds, heard and not seen. The lamp shows everything at once.

### Problem Frame

Of the jam's games for ages 2 to 6, none asks a child to keep in mind where something is. Dressing games exist already, so the dark and the ear have to carry this one.

### Key Decisions

- **A finished game and not a lab prototype** (session-settled: user-directed — chosen over a thin prototype: the owner asked to go deep). Governs R1 to R14.
- **The child causes every move in the dark.** A sleeper changes beds only because of what it wears. Governs R5.
- **No learning claim.** Memory is what gives the child aim. It is not a school skill in this game, and the sheet has no records part. Governs R13.

### Requirements

- R1. In the dark the window, its moon and the line of clothes stay lit, and every bed, quilt and object keeps a visible outline.
- R2. A garment dragged or tapped onto a bed goes on whoever lies there, in any number and any order, with its own sound and a murmur in the wearer's own voice.
- R3. A worn garment is not drawn in the dark. A drag out from a bed takes off what that sleeper put on last, and a tap on an empty peg brings that peg's garment home.
- R4. A touch on a quilt is answered by its sleeper's voice, its own way of moving and a dream of the one garment it loves.
- R5. Slippers move their wearer one bed toward the wardrobe; skates roll it to the last bed, by the lamp. Whoever lay there walks back to the empty bed. A wearer with no bed left on that side bumps into what stands there and goes back to its own bed. A walk is worked out at the touch that causes it: only the garment just put on moves its wearer, the one who goes back does not set off in turn, and a garment let go over a bed goes on the sleeper seen in it, or on the one walking to it where it is empty. Where they end up is fixed by the rule and never by chance.
- R6. Sounds that belong to worn things keep playing with their wearer (a bell at every breath, a pan over the snore), so a child can make a sleeper easy to follow.
- R7. The lamp can go on at any moment, also while someone is walking. Everyone sits up, looks, and reacts to exactly what it wears, each in its own way and by a taste that never changes.
- R8. Three sets of three garments make their wearer act the part, every time.
- R9. The lamp going out again is the start of the next night: each sleeper throws off what it dislikes, keeps what it loves, and goes back to sleep. Nothing starts by itself.
- R10. Every cue that matters in sound has a small visible partner that does not show the garment: footprints for a walk, a puff for a snore, a twitch of the quilt.
- R11. Everything essential works with a tap; a drag is forgiving; every target is at least about 90 stage units across and separate.
- R12. Put away at any instant and opened again, the beds, what everyone wears and the lamp are as they were, and no scene replays.
- R13. No words, letters, numerals, scores, counters, timers, speech or verdicts.
- R14. The game meets the quality bar of `docs/art-direction.md` with a look of its own.

### Acceptance Examples

- AE1. Covers R5. The goat is in bed 4 and gets the slippers. Footprints go from bed 4 to bed 3, then from 3 to 4. The lamp shows the goat in bed 3.
- AE2. Covers R3. The hen got the pan and then the boots. A drag out from its bed brings the boots.
- AE3. Covers R7. The lamp is pulled while the hippo is between beds. It is caught standing on the floor in the light, then scuttles to its bed.
- AE4. Covers R9. The goat loves the pan and wears it. The lamp goes out: the pan stays on the goat, and the gown it disliked flies back to the line.

### Scope Boundaries

- No stereo microphone, speech, or recorded clips.
- The look ledger's row states are not changed; only this game's registry row is added.
- Nothing in the shell, the template or another game changes.

## Planning Contract

### Key Technical Decisions

- KTD1. Canvas 2D from `templates/cartridge` v3, with the manifest band 3 to 7. The stage is 1180 by 820 and the Mount watches its own element.
- KTD2. A pure model (`night.ts`) holds the beds, what is worn, the lamp and the wardrobe door, and answers each act with a list of events. The show (`show.ts`) turns events into motion and sound on game time. The save is the model.
- KTD3. Motion in the dark is continuous state, not scripted scenes: each sleeper has a place that eases to its bed. So the lamp can catch a walker at any point (R7, AE3).
- KTD4. Lacquer miniature: mirror-black ground and gold line at night; cinnabar ground with gem colours by lamp light. Night draws the same figures with line only, so one set of paths serves both.
- KTD5. Voices are lists of plain notes (`voices.ts`) with range tests. `audio.ts` gains a pan per note so a walk can be heard crossing the room.
- KTD6. Static scenery is painted once per size and lamp state. Figures are live paths under a counted budget.
- KTD7. No position ladder is used: nothing in the game gets harder unasked. The template's `position` field stays in the save and is never read.

### Assumptions

- Everyone under seven can be given all nine garments at once if they come out in two steps: five on the line, four behind a wardrobe door the child opens. Age sets only whether that door starts open.
- A sound check by a person is still owed. The plan checks level, length and difference between voices by rendering them.

## Implementation Units

### U1. The design sheet

- **Goal:** `ART.md` holds the sheet and an independent reader has passed it.
- **Requirements:** R1 to R14. **Files:** `games/dressed-in-the-dark/ART.md`, `games/dressed-in-the-dark/REFINEMENT.md`.
- **Approach:** the headings of `docs/solutions/conventions/building-a-jam-game.md`.
- **Test scenarios:** none; a document. **Verification:** the reader's report.

### U2. The night model and its save

- **Goal:** the rules as pure code. **Requirements:** R2, R3, R5, R9, R12.
- **Files:** `night.ts`, `things.ts`, `save.ts` and tests beside them.
- **Test scenarios:** AE1, AE2, AE4; slippers in the first bed and skates in the last; a garment given to a bed while its sleeper is walking; every garment on one sleeper; damaged, older and newer saves; a seeded thousand random acts never lose a garment or a sleeper.
- **Verification:** `npx vitest run games/dressed-in-the-dark`.

### U3. The look and the toy

- **Goal:** the room by night and by lamp light, the garments, the five figures. **Requirements:** R1, R14.
- **Files:** `lacquer.ts`, `scenery.ts`, `figures.ts`, `garments.ts`, `layout.ts`, `view.ts`.
- **Test scenarios:** layout targets are separate and large; the night frame draws no worn garment.
- **Verification:** stills at 1180 by 820 in both lamp states.

### U4. Sound

- **Goal:** a voice for each sleeper and a sound for each garment. **Requirements:** R2, R4, R6, R10.
- **Files:** `voices.ts`, `audio.ts`.
- **Test scenarios:** every note in range; no two sleepers and no two garments share a sound; a worn pan changes the snore; pan follows the bed.
- **Verification:** tests, plus an offline render that measures peak and length.

### U5. The show

- **Goal:** motion, the reveal, the sets, guidance. **Requirements:** R4, R6 to R10.
- **Files:** `show.ts`, `motion.ts`, `guide.ts` and the Mount.
- **Test scenarios:** AE3; the reveal gives way to a touch; a drag cancelled puts the garment back; the ghost hand shows a legal move in every state; no two sleepers share a motion.
- **Verification:** tests and a recorded walk.

### U6. The gates

- **Goal:** overlap tests, frame budget, refinement passes, registry row, README line. **Requirements:** R11, R14.
- **Files:** `overlap.test.ts`, `frameBudget.test.ts`, `REFINEMENT.md`, `docs/art-direction.md`, `README.md`.
- **Verification:** the Verification Contract.

## Verification Contract

- `TMPDIR=<scratch> npx vitest run games/dressed-in-the-dark` while building, in under 30 seconds.
- `npm run check`, `npm run build`, `npm run egress:built`, `npm run education:built`.
- `npm run perf:jam -- dressed-in-the-dark` in Chrome under throttle on the production build, with the renderer named.
- A cold playtest proxy on the production build: ten seconds hands off, then sixty seconds of play.

## Definition of Done

- Every requirement holds and each acceptance example has a test.
- The sheet has passed a reader who did not write it.
- The frame is filled, the gates are green, and the pull request says what was not measured (a physical iPad, a child, a person's ear).
- No abandoned code is left in the diff.
