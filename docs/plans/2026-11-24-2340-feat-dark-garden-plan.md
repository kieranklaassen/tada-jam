---
title: The Dark Garden - Plan
type: feat
date: 2026-11-24
topic: dark-garden
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# The Dark Garden - Plan

## Goal Capsule

- **Objective:** A child of 4 to 8 walks someone with an unlit apple candle in to the one light, carries the light out, sets it down, and that part of a dark stained-glass garden opens for good, with someone funny asleep in it.
- **Means:** A canvas 2D cartridge, `games/dark-garden/`, from the template, in the look Stained glass and lead.
- **Authority:** `AGENTS.md`, the Tada cartridge contract, `docs/solutions/conventions/building-a-jam-game.md`, the game-design pack. The owner asked for a deep, finished game whose loop a four-year-old can read in the first picture.
- **Stop conditions:** a change is needed in a shared file other than one README row, one registry row and one shelf line.
- **Ships as:** one draft pull request. Merging and deploying stay with the owner.

## Product Contract

### Summary

Advent spiral as a game loop: in, light, out, set down, opened. One asker, one light, one path.

### Requirements

- R1. The first picture holds one shining flame, one large walker at the gate with an unlit apple, and the path between, all else dark but friendly.
- R2. Two taps are a whole round: one anywhere sends the walker in to the flame, the next sends it to a dark place where it sets the apple down. A drag does both as one gesture. No place is wrong.
- R3. A walk across the whole garden takes about two seconds.
- R4. A set apple opens its part of the glass pane by pane, for good, and wakes a sleeper with a joke of its own. Which sleeper wakes is fixed by who set the apple and what kind of place it is.
- R5. Walkers passing a light ring it; a finger run along the lights rings them. The pitch is the carrier's, the colour of the sound is the place's, so the order of carriers is the child's own tune.
- R6. The child can call another carrier to the front.
- R7. When the basket is empty the garden plays the tune once, then stays. One touch on the one at the gate blows it dark again; the middle flame never goes out.
- R8. One whole round is shown once by the walker on the first visit, and any touch takes over from it.
- R9. Found as left; attended time only; wordless; nothing counted, scored or unlocked by date.
- R10. The shared quality bar.

### Scope Boundaries

No learning claim, no music library, no speech, no 3D. Section 4 of `docs/art-direction.md` is not edited.

### Acceptance Examples

- AE1. Fresh save, tap anywhere: the gnome runs in and his candle lights. Tap the dark: he runs there, sets it, it opens, he leaps home, the goose steps up.
- AE2. Press the gnome, drag straight to the flame and out to the corner, let go: the same.
- AE3. Let go before the flame: he stands there unlit, looking at the flame; the next touch carries on.
- AE4. Last apple set: the tune plays once and everything stays lit on reload, with no replay.
- AE5. Put away with a lit apple in hand: opened again, he is at the gate with it unlit and nothing else changed.

## Planning Contract

### Key Technical Decisions

- KTD1. **The path is a function of one number.** Walkers move along it only. A finger gives a target point on it (the nearest point over all windings), so a straight drag and a traced one both work, and the walker scurries round to catch up.
- KTD2. **Ten fixed places, four kinds.** A map from kind and carrier to one of sixteen sleepers, so what a child finds out stays true.
- KTD3. **State is who set the apple at each place, and the queue.** Everything else is a view of that. The set is saved at the release, not at the end of the walk.
- KTD4. **Two painted windows.** The dark window and one lit sprite per place are painted once for the size; only the opening draws panes one by one.
- KTD5. **One pure play module** takes pointers in stage units and seconds; Mount and tests both use it.

### Assumptions

- The build order and the look are taken without an owner checkpoint, as for the earlier games of the day.
- No child has tried the idea. Calm alone was rated too slow before, so walks are quick and each place has a joke.

## Implementation Units

### U1. Sheet
- **Goal:** `ART.md` before code, checked by a fresh reader. **Files:** `games/dark-garden/ART.md`. **Verification:** findings resolved.

### U2. Path, rules, save
- **Goal:** R2 to R9. **Files:** `garden.ts`, `cast.ts`, `save.ts`, `play.ts`, tests beside each.
- **Test scenarios:** AE1 to AE5; every place reachable from every touch; random sessions lose no apple and always settle; corrupt saves; tune of a known garden; places do not overlap and stay inside the stage.

### U3. Glass
- **Goal:** R1, R4, R10. **Files:** `glass.ts`, `window.ts`, `walkers.ts`, `sleepers.ts`, `view.ts`, `dark-garden.tsx`, frame-budget test.

### U4. Sound and guidance
- **Goal:** R5, R8. **Files:** `voices.ts`, `guide.ts`, tests.

### U5. Refine and ship
- **Goal:** logged passes, cold playtest proxy, perf probe, README, registry and shelf rows. **Files:** `REFINEMENT.md`, `README.md`, `docs/art-direction.md`, `harness/shelves.ts`.

## Verification Contract

`npm run check`, `npm run build`, `npm run egress:built`, `npm run education:built`, `npm run perf:jam -- dark-garden`. Overlap and budget tests in place of the three.js audit.

## Definition of Done

Every requirement has a test or a logged still; the sheet check is resolved; a cold reader states the loop from the first picture; the draft pull request is open with its checks decided.
