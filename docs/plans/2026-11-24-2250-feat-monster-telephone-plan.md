---
title: Monster by Telephone - Plan
type: feat
date: 2026-11-24
topic: monster-telephone
artifact_contract: ce-unified-plan/v1
product_contract_source: owner-decision
execution: code
---

# Monster by Telephone - Plan

## Goal Capsule

- **Objective:** A finished jam game, ages 4 to 8, for two people in one room. One lifts a curtain, looks at a monster and says what it is like; the other builds its twin from magnets without looking. The curtain opens and the two monsters meet.
- **Product authority:** The owner chose this idea with five others and asked for depth, not a thin prototype. Then `AGENTS.md`, `docs/solutions/conventions/building-a-jam-game.md` and the two packs.
- **Stop conditions:** A game below the quality bar is not called finished. Outside `games/monster-telephone/` only one registry row, one README row, one shelf line and one cover change.
- **Open blockers:** None. Whether two children talk over it can only be learnt from two children.

## Product Contract

- **R1.** Taking a magnet off and slapping it on is a pleasure alone: every part answers at the touch-down with a motion and a voice of its own.
- **R2.** The curtain lifts only while a finger holds it. Whoever is building is shown what to do by the mole, who covers its eyes whenever the curtain is up.
- **R3.** A monster is one of three bodies and six places; any of seven parts, large or small, goes in any place. Nothing is refused.
- **R4.** Opened, the two monsters compare part by part. A part that agrees acts in unison, a part that differs is stared at, and each body takes the difference in its own fixed way: in love, appalled, or helpless with laughter. Nobody judges the child.
- **R5.** Alone, a tap on the ostrich makes it peek and mime one fact down the string: where, then what, then how large. Each part's mime has the same sound as its magnet.
- **R6.** With the curtain open both monsters can be rebuilt, and closing it hides the one the child made. The game's own monsters come out of a small or a large sack that the child picks.
- **R7.** No words, numerals, scores, timers, praise, microphone or voice; found as left.

## Planning Contract

- **KTD1 (session-settled: user-directed):** no microphone and no voice, the children talk to each other; rejected: listening to the child, because it needs a new permission and a privacy decision.
- **KTD2 (session-settled: user-directed):** built as a finished game in parallel with five others; rejected: a thin prototype.
- **KTD3:** canvas 2D in the look set aside for it, dry-wipe whiteboard and magnets: the working pieces are plain plastic magnets and the characters are marker.
- **KTD4:** pure rules, and a play module driven by pointer ids on game time, so tests play it as a child does. Two fingers work at once, since one child may hold the curtain while the other builds.
- **KTD5:** the meeting is a list of timed beats computed from the two monsters; its outcome is saved when it starts and any touch lands it.
- **KTD6:** secrecy is modelled, not enforced. The mole and the ostrich act out the two jobs; a child who looks anyway loses nothing.

## Implementation Units

- **U1. Rules** (`monster.ts`, `save.ts`): parts, places, bodies, generation by position, comparison, position moves, defensive load. Tests for each.
- **U2. Play** (`layout.ts`, `hands.ts`, `play.ts`, `meeting.ts`, `mime.ts`): fingers, curtain, carrying, tap and tap, size, body, sacks, tassel, mime, marker strokes. Tests through pointer events and for every put-away.
- **U3. Look** (`marker.ts`, `magnets.ts`, `room.ts`, `folk.ts`, `view.ts`): board, magnets, ostrich, mole, curtain. Frame budget by counted draws, overlap by layout tests.
- **U4. Voices** (`voices.ts`): each part, body and character its own notes, in range and distinct.
- **U5. Mount and guidance.**
- **U6. Refinement:** logged passes, cold playtest, registry, README, shelf, cover.

## Verification Contract

`npm run check`, `npm run build`, `npm run egress:built`, `npm run education:built`; stills at 1180 by 820; the shared probe on a production build, reported as a machine without a graphics card.

## Definition of Done

Every requirement held by a test or a still, the sheet checked by a reader who did not write it, CI green on the pull request, and what is unknown (a real iPad, the sound by ear, two children) said plainly.
