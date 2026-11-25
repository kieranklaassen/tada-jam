---
title: Roll It All Up - Plan
type: feat
date: 2026-11-24
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# Roll It All Up - Plan

## Goal Capsule

- **Objective:** a child of 3 to 6 rolls a snowball, sees it grow and pick things up, puts it on a snowman, and watches him walk off on exactly those things. What to do is plain in the first picture and the round repeats in the same order.
- **Means:** a canvas 2D jam game from the template; one pure rules module under a gingerbread and piped icing look.
- **Authority:** Kieran's request, `AGENTS.md`, this plan, `games/roll-it-all-up/ART.md`.
- **Profile:** one draft pull request. Merging stays with Kieran.

## Product Contract

### Key Decisions

- **Build this idea, deep and nice** (session-settled: user-directed, chosen over a thin prototype). Governs all.
- **The loop is clear to a four-year-old** (session-settled: user-directed, chosen over a rule to be inferred: the last games were not). Governs R1, R7, R8.
- No learning claim.

### Requirements

- R1. First frame: a huge snowman with no head, arms patting the gap, and a small ball with a boot stuck in it.
- R2. Pressing or dragging anywhere on the snow rolls the ball there. A tap is enough for everything.
- R3. Rolling over fresh snow grows the ball and leaves bare biscuit. A landing thump shakes fresh snow over the tracks.
- R4. Whatever the ball touches sticks where it touched and keeps that place: early is near the middle, late is out at the edge. It turns with the ball, and the ball stops turning when it hops.
- R5. A ball that meets the snowman hops on at any grown size; a full one hops by itself once let go. Nothing topples while building.
- R6. Complete, he opens his eyes. A touch makes him walk with each stuck thing doing its own act for the ball it is in (8 things by 3 balls, all different). One thing shakes free and he flops into a soft heap; the things go back to the snow and only his arms stick out, patting for the next ball.
- R7. A whole round is shown once by a robin in miniature, at once ended by a touch, and again when the robin is touched.
- R8. Idle ladder: glow at 1.5 s, hand at 3 s showing the next act of the state.
- R9. Put away at any instant and found as left; a walk is saved as the heap it ends in.
- R10. Quality bar, wordless rule, registered look.

### Scope Boundaries

No shedding on grass, no target outline, no goals, no music, no second scene.

## Planning Contract

- KTD1. `world.ts` is pure, fixed step, seeded; the view and sounds follow its state and events.
- KTD2. A ball is a disc with things at offsets in its own frame and one spin angle, not a sphere, so nothing is ever hidden behind it (R4).
- KTD3. Snow is a coarse grid in the save and an erased layer in the view.
- KTD4. `acts.ts` holds the 24 acts as pure functions.

### Assumptions and risks

- Look: Gingerbread and piped icing, backup Scale-model diorama, set aside by the holiday ideas thread.
- Sibling branches add rows to the same registry: single-line edits.
- Near Hungry Hole (3D, swallowing). Here nothing disappears: it stays in view and is used.

## Implementation Units

- U1. Sheet in `ART.md`, checked by a fresh reader.
- U2. `layout.ts`, `world.ts`, `state.ts` with tests (R2 to R6, R9). Scenarios: tap-only round; every thing stuck keeps its offset through growth and hop; full ball hops on its own; save at every step; corrupt saves; seeded random play keeps invariants.
- U3. `acts.ts` with tests: 24 distinct, bounded.
- U4. `figures.ts`, `scenery.ts`, `view.ts`, `voices.ts`, `guide.ts`, Mount (R1, R7, R8, R10), with frame budget and overlap tests.
- U5. Logged passes, cold playtest, registry, README, shelf, cover.

## Verification Contract

`npm run check`, `npm run build`, `npm run egress:built`, `npm run education:built`, `npm run perf:jam -- roll-it-all-up`.

## Definition of Done

Every R is shown by a test or a still, gates pass, sheet passed, draft pull request open.
