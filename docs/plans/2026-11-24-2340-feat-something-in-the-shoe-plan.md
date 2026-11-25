---
title: Something in the Shoe - Plan
type: feat
date: 2026-11-24
---

# Something in the Shoe - Plan

## Goal

A jam game for ages 3 to 6: put a thing in a giant boot, a bare foot goes in, its owner goes off. A child who has never seen it can tell from the first frame what to do, is two touches from a laugh, and sees the boot empty again. The design is `games/something-in-the-shoe/ART.md`.

## Decisions

- Canvas 2D in the look set aside for it, thick-line primaries. Figures are outlines made once and laid with transforms; the room is painted once for day and once for night.
- One boot and one foot fill the frame. The next owner and the night row come after the first round.
- The foot goes in by itself 2.5 s after the last thing lands, so a child who stops after one touch still gets the laugh, and one who adds a second thing gets a pair.
- What a foot finds is a pure function of the two things, the owner and the time (`acts.ts`), so it can be tested, shown in a row of five, and found as left.
- A whole round plays once on a first visit; the ghost hand comes early (1.5 s glow, 3 s hand).
- No saint, no helper, no words, nothing by date, no music.

## Units

1. Rules: `things.ts`, `owners.ts`, `acts.ts`, `house.ts`, `save.ts`, with tests: every pair has an act, no two acts alike, every act ends with all things shown or home, put-away at any instant loses nothing, random play never loses a thing.
2. Look: `brush.ts`, `figures.ts`, `scenery.ts`, `view.ts`, with a counted frame budget and no non-finite numbers.
3. Sound: `voices.ts`, every cue has a voice and stays gentle.
4. Guidance: `guide.ts`, `guidance.ts` timings.
5. Screenshots and a cold play, logged in `REFINEMENT.md`; cover, shelf line, README row, look row.

## Verification

`npm run check`, build, both built checks, the intersection audit's canvas exit, the shared probe, and a played recording.

## Out of scope

Merging, deploying, music, and the menu in section 4 of the art direction.
