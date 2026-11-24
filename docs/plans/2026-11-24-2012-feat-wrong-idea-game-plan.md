---
title: He Gets the Wrong Idea - Plan
type: feat
date: 2026-11-24
topic: wrong-idea-game
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# He Gets the Wrong Idea - Plan

## Goal Capsule

- **Objective:** A child of 4 to 8 can teach a huge, eager butler a silly rule by showing him one or two examples, watch him carry it out on everything and everyone in the house, change his mind, and come back weeks later to plan sillier rules.
- **Means:** A canvas 2D jam game, `games/wrong-idea/`, from the cartridge template, with a small fixed learner (KTD1) and an agent that closes the gap between what is shown and what the rule says (KTD2).
- **Authority:** `AGENTS.md`, the Tada cartridge contract, `docs/solutions/conventions/building-a-jam-game.md`, the game-design pack. The owner asked for a deep, finished game and not a thin prototype.
- **Stop conditions:** a change is needed in a shared file other than the README games table and the claimed-styles registry.
- **Ships as:** one draft pull request. The owner plays it and merges.

## Product Contract

### Summary

The child can carry only small things. The butler can carry anything, people included. So the one way to get the king into the soup is to give the butler an idea that happens to include the king.

### Problem Frame

For ages 4 to 8 the jam has no game of working out a hidden rule. Games of that kind usually make the child guess. Here the butler guesses and the child holds the rule, so reasoning about evidence is what makes the joke.

### Requirements

- R1. One touch verb: carry a thing and let it go at a place (soup, bath, bed). No learning claim is made.
- R2. The butler's rule follows a small, closed, deterministic set. The same examples always give the same rule. The rule is shown without words, in a thought bubble and on the place, until it changes.
- R3. He acts on the rule at once, without being asked, on every matching thing including people, pets and himself, and takes back what no longer fits.
- R4. Anything can be pulled out again. Pulling out what he carried changes his mind where another reading exists. Nothing is lost and nothing is judged.
- R5. A grandmother wishes for mischief, one picture at a time, after the child has caused the first idea. A wish can be ignored for ever. Some wishes need two examples, a narrow rule or a person spared.
- R6. Lively without pressure: no score, count, timer or praise. Pulling the bell rope tidies the house.
- R7. Found as left at any instant; attended time only; wordless (band starts below 6).
- R8. The shared quality bar, in the School wall chart look.

### Scope Boundaries

Nothing for a two-year-old is promised. No speech, no numerals. No 3D. Section 4 of `docs/art-direction.md` is not edited; only this game's registry row is added.

### Acceptance Examples

- AE1. Red sock into the soup: every red thing follows, the king in his red cape last. A blue sock into the soup: the red things that are not socks go back, the yellow sock comes.
- AE2. Two things that share nothing into the bath: everything goes in, and then the butler.
- AE3. Cat and piglet into the bed: everyone alive goes to bed, the butler too.
- AE4. Red sock into the soup, the king pulled out: he decides it was socks.

## Planning Contract

### Key Technical Decisions

- KTD1. **The learner.** Features: colour, kind, spots, alive. One example: the first single feature, in that order, that fits it and none of what was pulled out; then pairs; then all. Two or more: everything they share; sharing nothing means everything. The fixed order is the character's fixed opinion, which answers the risk that an open rule is unreadable.
- KTD2. **State is the outcome.** A drop computes where everything will end up and saves that. The butler is an agent that walks the shown world to the state, one load at a time. Put away mid-way, the house is found as he would have left it. No queue to invalidate when the child acts while he works.
- KTD3. **Examples are the child's own.** A thing the child put somewhere is never moved by another place's rule.
- KTD4. **People are too heavy for the child at home, and light once they float or lie in a place.** So reaching a person needs a rule, and moving one again is free play.
- KTD5. **One pure play module** takes pointers in stage units and seconds; the Mount and the tests both use it.
- KTD6. **Everything drawn is a cached sprite** in lithograph grain; faces and arms are drawn live.

### Assumptions

- The build order and the look are taken without an owner checkpoint, as the owner asked for a hands-off run; the pull request lists both as defaults.
- No child has tried the idea.

## Implementation Units

### U1. Sheet
- **Goal:** `ART.md` design sheet before code, checked by a fresh reader. **Files:** `games/wrong-idea/ART.md`.
- **Verification:** the checker's findings are resolved.

### U2. Rules and save
- **Goal:** R2, R4, R5, R7. **Files:** `things.ts`, `learner.ts`, `house.ts`, `wishes.ts`, `save.ts`, tests beside each.
- **Test scenarios:** AE1 to AE4; every pair of the child's things has a stated rule; order independence; corrupt saves; largest save under half the cap; every wish reachable by a bounded search of the child's own moves.

### U3. Play
- **Goal:** R1, R3, R6. **Files:** `layout.ts`, `motion.ts`, `butler.ts`, `play.ts`, `voices.ts`, tests.
- **Test scenarios:** the touch rules through pointers (lift grace, cancel puts back, tap gives nothing away, palm); the agent always settles; no two things rest in one spot; nothing covers a target.

### U4. View
- **Goal:** R8. **Files:** `litho.ts`, `figures.ts`, `room.ts`, `view.ts`, `wrong-idea.tsx`, frame-budget test.

### U5. Refine and ship
- **Goal:** logged passes, cold playtest proxy, perf probe, README and registry rows. **Files:** `REFINEMENT.md`, `README.md`, `docs/art-direction.md`.

## Verification Contract

`npm run check`; `npm run build && npm run egress:built && npm run education:built`; a Playwright walkthrough of the production build at 1180x820 with screenshots, and at a narrow size; the jam probe in Chromium. Test runs use their own `TMPDIR`, deleted afterwards.

## Definition of Done

R1 to R8 hold with tests or a logged look; gates green; draft pull request open with how each quality-bar line is met, defaults taken and what was not measured; no abandoned code left.
