---
title: "feat: Mama Boot, a chick takes the first thing it sees for its mother"
date: 2026-11-24
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# Mama Boot

## Goal Capsule

- **Objective:** a child of 2 to 5 taps an egg, laughs at the chick that follows a boot, and over later visits learns to stage births: who sees what first, who follows whom, and how to make a parade or a ring.
- **Means:** a new canvas 2D jam game in `games/mama-boot/`, made from the template (KTD1 to KTD5).
- **Authority:** `AGENTS.md`, then `docs/solutions/conventions/building-a-jam-game.md`, then the game-design pack, then this plan.
- **Stop when:** an official gate cannot pass without changing shared code.
- **Ships as** one draft pull request; merging stays with the owner.

## Product Contract

### Summary

Big eggs wobble in a farmyard of odd things. A tap opens one, and whatever stands nearest when the eyes settle is its mother. The chick follows it, moves as it moves and tries to sound like it. Nothing inside the egg decides.

### Requirements

- R1. One tap opens an egg, answered in the same frame. The mother is whatever stands nearest at the moment the eyes land, so the child can still change it while the eyes roll.
- R2. Nothing is random about who becomes the mother. Before it is tapped an egg leans toward what it would see.
- R3. Each of ten kinds of mother gives its own walk, cry and thread colour, and what the mother does the chick does a beat later, down the whole chain.
- R4. Chicks and unopened eggs can be mothers. So chains, trees and rings can be made, and a chick beside the foil puddle takes itself.
- R5. A ring circles until it is nudged, sits dizzy until it is nudged again, and is saved that way.
- R6. A chick under the hen is an egg again, at no cost, by a drag or by two taps. Never more than five chicks and eggs.
- R7. Wrong uses work and are funny: things on the hen, chicks in and on things, chicks on chicks, any two things side by side.
- R8. Everything essential works with a tap. Put away at any instant, the yard is found as left.
- R9. No learning goal, no words, no rewards, no ending that starts by itself.

### Scope Boundaries

No two-finger play, no second scene, no recorded sound. No claim about how real imprinting works.

### Assumptions

- The first visit has three eggs for 3 and younger and no age, five for 4 and older; the hen lays the rest on a tap.
- Look: Craft-box collage (agreed among the parallel builds); fallback Thick-line primaries.

## Planning Contract

### Key Technical Decisions

- KTD1. Canvas 2D in one fitted stage: googly eyes are the mechanic, and flat pieces with moving pupils read best and cost least.
- KTD2. `yard.ts` is the whole model with no browser in it, and `play.ts` is the one path from pointers to it, for the Mount and the tests alike (touch rule 14).
- KTD3. Rings come from eggs being legal mothers: a mother is an identity, kept when an egg becomes a chick. `lineage.ts` finds roots and rings from that one field.
- KTD4. An act is a function from time to a pose. A chick copies its mother by playing the same act late and small, so every act of every thing works down every chain without a table of pairs.
- KTD5. Sprites are painted once from seeded strokes; only eyes, beaks, wings and whole pieces move.

### Risks

- The frame can crowd: at most five creatures and six loose things, with plain card under them.
- A ring could walk through things: ring centres are held clear by the same separation as single chicks, and an overlap test plays it.

## Implementation Units

### U1. Design sheet
- **Files:** `games/mama-boot/ART.md`. Checked by a fresh reader against the packs before rules are final.
### U2. Model
- **Files:** `layout.ts`, `lineage.ts`, `moves.ts`, `yard.ts`, `save.ts`, `play.ts` and tests. R1 to R8.
- **Test scenarios:** nearest at the landing of the eyes wins; a thing dragged in during the roll wins; egg as mother then ring of two and of three; puddle gives self; canon delays by depth; tuck returns an egg and keeps its followers; put-away in mid-hatch, mid-carry and mid-tuck; corrupt saves; lift grace, slop, cancel, resting palm, second finger.
### U3. Look
- **Files:** `craft.ts`, `scenery.ts`, `figures.ts`, `view.ts`. Full frame, large faces.
- **Test scenarios:** frame budget by counted draws on the fullest yard; every act draws.
### U4. Sound and Mount
- **Files:** `voices.ts`, `mama-boot.tsx`, `config.ts`. **Test scenarios:** every note in range; every mother and act has a sound; no two mothers share one.
### U5. Passes and gates
- **Files:** `REFINEMENT.md`, `docs/art-direction.md`, `README.md`.

## Verification Contract

`npm run check`, `npm run build`, `npm run egress:built`, `npm run education:built`; stills at 1180 by 820; a cold playtest proxy on the production build; a fresh reader with `docs/build/runs/reader.md`.

## Definition of Done

R1 to R9 each held by a test played through `play.ts` where a finger can reach it, the frame filled edge to edge, the sheet passed by someone who did not write it, checks green, draft pull request open.
