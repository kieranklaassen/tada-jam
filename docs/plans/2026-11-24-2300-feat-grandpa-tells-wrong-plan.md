---
title: Grandpa Tells It Wrong - Plan
type: feat
date: 2026-11-24
topic: grandpa-tells-wrong
artifact_contract: ce-unified-plan/v1
product_contract_source: owner-decision
execution: code
---

# Grandpa Tells It Wrong - Plan

## Goal Capsule

- **Objective:** A finished jam game, ages 4 to 7: a child makes three things happen in a farmyard, Grandpa tells them in the evening with one wrong, and whatever the child lets stand comes true.
- **Means:** a canvas 2D cartridge in the Woven tapestry look (KTD2).
- **Product authority:** the owner's card for this game, then `AGENTS.md`, `docs/solutions/conventions/building-a-jam-game.md` and both packs. The design sheet in `games/grandpa-tells-wrong/ART.md` is the detail.
- **Stop conditions:** a shared file other than the README row, the registry row, the home shelf row and the cover is needed.
- **Ships as:** one draft pull request. Merging is the owner's.

## Product Contract

### Summary

Retelling is play because the telling is a small program: it runs on the yard when the lamp goes out. Correcting Grandpa, keeping his lie and telling a better one are equally good.

### Problem Frame

No jam game is designed from who, what and order in a story. A game that asks which picture is wrong is a test. Here nothing asks.

### Requirements

- R1. By day a thing let go on someone happens to them at once, in their own way, and what it leaves stays (six things, three in the yard).
- R2. After three happenings Grandpa tells them in three pictures, wrong in a way set by a hidden position; the telling always differs from the day.
- R3. Who and what in each picture change with a tap, and pictures change places with a drag; five may be told of, Grandpa and the moon only there.
- R4. The lamp runs the told story on the morning's yard. Nothing is judged before it or gained by it.
- R5. No words, numerals, speech, microphone, score or praise; found as left at any instant; attended time only.
- R6. The shared quality bar, in the Woven tapestry look.

### Scope Boundaries

Nothing is promised to a two-year-old. Section 4 of the look menu is not edited. The backup look is used only if the first cannot be read.

### Acceptance Examples

- AE1. Jam on the pig, the pillow on the pig: feathered. With the two pictures changed places and the lamp out: sticky, with no feathers.
- AE2. Mud on the goose told as mud on Grandpa and left so: after the lamp Grandpa is muddy and the goose is as she was that morning.
- AE3. Put back as it was: after the lamp the yard is as the child left it at dusk.
- AE4. Put away in the middle of any scene and opened again: the scene's outcome stands and nothing replays.

## Planning Contract

### Key Technical Decisions

- KTD1 (session-settled: user-directed): a finished game built in parallel with its siblings; rejected: a thin prototype, because the owner asked for depth.
- KTD2. **A loom, not sprites.** The scene is drawn small, one pixel to a weft bead, snapped to a fixed set of dyes with a row-wise hatch between two neighbouring dyes, and shown through a rib of cloth. Edges step and shading hatches by themselves, and the cost of a frame does not depend on the screen.
- KTD3. **The story is data.** `run(base, happenings)` is the one rule for the day, the pictures and the lamp, so the three cannot disagree.
- KTD4. **State is the outcome.** Scenes are views; what a scene leads to is saved when it starts.
- KTD5. One pure play module takes pointers in stage units and seconds. The Mount and the tests both use it. Nothing is made at module load that draws from `Math.random`.

### Assumptions

The look and the toy are taken without an owner checkpoint and listed as defaults. No child has tried the idea.

## Implementation Units

### U1. Sheet
`ART.md`, checked by a fresh reader.

### U2. Rules and save
`tale.ts`, `save.ts`, `config.ts` with tests: AE1 to AE3, every rule of the sheet's grid, every position's telling differs from the day for every day, corrupt saves, size.

### U3. Play
`layout.ts`, `play.ts`, `moves.ts`, `voices.ts`: R1 to R5 through pointers; AE4 at every instant of a whole cycle; no dead ends under random touches.

### U4. Look
`loom.ts`, `figures.ts`, `things.ts`, `yard.ts`, `view.ts`, the Mount, a frame-budget test.

### U5. Refine and ship
`REFINEMENT.md` passes, cold playtest proxy, probe, README, registry and shelf rows, cover.

## Verification Contract

`npm run check`; `npm run build`, `npm run egress:built`, `npm run education:built`; stills and a walkthrough of the production build at 1180x820; the shared probe in Chromium. Test runs use their own `TMPDIR`, deleted afterwards.

## Definition of Done

R1 to R6 held by a test or a logged look, the sheet checked by a reader who did not write it, gates green, draft pull request open with what is unknown said plainly, no abandoned code.
