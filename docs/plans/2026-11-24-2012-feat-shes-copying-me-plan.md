---
title: She's Copying Me - Plan
type: feat
date: 2026-11-24
topic: shes-copying-me
artifact_contract: ce-unified-plan/v1
product_contract_source: owner-decision
execution: code
---

# She's Copying Me - Plan

## Goal Capsule

- **Objective:** A finished jam game, ages 3 to 7: two grand aunts at tea, side by side, each with a thing in her hand and a guest before her. Move one aunt's hand and the other copies it a beat later with whatever she holds.
- **Product authority:** The owner chose this idea and asked for a deep, finished game, not a thin prototype. Then `AGENTS.md`, the guide `docs/solutions/conventions/building-a-jam-game.md` and the game-design pack.
- **Stop conditions:** A game below the quality bar is not called finished. Nothing outside `games/shes-copying-me/`, one registry row and one README row changes.
- **Open blockers:** None. Whether two children enjoy sharing it can only be learnt from two children.

## Product Contract

- **R1.** Moving an aunt's hand is a pleasure alone: the held thing answers from the touch-down, over a guest, at a face, up high, shaken.
- **R2.** The other aunt repeats the same path, mirrored, after a visible beat, with her own thing. What happens is computed from where her hand really goes, never scripted.
- **R3.** Either aunt leads. The last hand taken leads. With a finger on each aunt, both are led and nobody copies; when one lets go she copies the other.
- **R4.** Six things by five gestures, every cell seen and heard differently. Guests carry what was done to them, and each coat meets each effect with a result of its own.
- **R5.** Four guests with fixed tastes that never change. Their reaction is the only feedback. The victim is bewildered and never hurt.
- **R6.** Things are traded from the table, or hand to hand: bring one hand to the middle, the other copies, the hands meet, and the things change owners.
- **R7.** Everything essential works with a tap as well as a drag; no words, numerals, scores, timers or praise; found as left.

## Planning Contract

- **KTD1 (session-settled: user-directed):** built as a finished game in parallel with six siblings; rejected: a mechanic prototype first, because the owner asked for depth.
- **KTD2:** canvas 2D in the open look "Silk painting with gutta". Coats flood inside gold lines, which is the look's own motion.
- **KTD3:** both halves share one local space measured outward from the middle, so a mirrored copy is the same numbers and the two halves cannot drift apart.
- **KTD4:** one working finger for each half instead of the template's one finger. Each half has the template's forgiving rules.
- **KTD5:** the copy reads a short history of the leader's hand. Gestures are detected on each hand by one detector, so the copy needs no second rule.

## Implementation Units

- **U1. Rules** (`rules.ts`, `state.ts`): things, gestures, effects, coats, tastes, trades. Tests: every cell distinct, every coat by effect defined, a corrupt save repaired.
- **U2. Hands** (`layout.ts`, `touch.ts`, `gesture.ts`, `echo.ts`, `party.ts`): pointers to hands, the echo, the detector, trades, scenes. Tests through pointer events: tap, drag, lift, cancel, two fingers, park, meeting hands.
- **U3. Look** (`silk.ts`, `room.ts`, `auntArt.ts`, `guestArt.ts`, `thingArt.ts`, `fx.ts`, `view.ts`): the silk, the figures, the floods. Tests: frame budget by counted draws.
- **U4. Voices** (`voices.ts`): every cell its own notes, in range.
- **U5. Mount** (`shes-copying-me.tsx`): template wiring, guidance, tiers.
- **U6. Refinement**: logged passes, cold playtest, reader, registry and README rows.

## Verification Contract

`npm run check`, `npm run build`, `npm run egress:built`, `npm run education:built`; stills at 1180 by 820; the shared probe on a production build, reported as a machine without a graphics card.

## Definition of Done

Every requirement held by a test or a still, the sheet checked by a reader who did not write it, CI green on the pull request, and what is unknown (a real iPad, the sound by ear, two children) said plainly.
