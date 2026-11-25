---
title: Bottom Portraits - Plan
date: 2026-11-24
type: feat
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# Bottom Portraits - Plan

## Goal Capsule

- **Objective:** a child of three to seven opens a new jam game, turns an animal, has it painted from the other side of the table, laughs at what comes out, and still has new pictures to plan weeks later.
- **Means:** one three.js stage drawn from two cameras, the child's and the painter's (KTD1).
- **Authority:** `AGENTS.md`, then the design sheet in `games/bottom-portraits/ART.md`, then this plan.
- **Stop:** a gate that cannot pass inside `games/bottom-portraits/`, its own audit file and its registry row in `docs/art-direction.md` section 3.
- **Profile:** one pull request. Merging stays with the owner.

## Product Contract

### Problem Frame

The jam has no game below six in which the thinking is how a thing looks from somewhere else. The idea says the wrong view is itself the joke. That a child learns anything about viewpoint from it is argued and not cited, so the game claims no school skill. No child has tried it.

### Requirements

- R1. One touch, a tap on a sitter, turns it a quarter turn on its stand. It is a pleasure with no goal.
- R2. A tap on the painter has him paint what stands before him, seen from where he sits. The canvas has its back to the child until he turns it round.
- R3. The picture is what he sees, for every arrangement: facing, who stands in front, what the frame cuts off, left and right.
- R4. Each sitter has a fixed taste about how it was painted and reacts in a way no other sitter does. Wrong views get the best reactions.
- R5. Before he paints, his face answers each view that meets him, so a child can learn his side of the table.
- R6. Sitters are carried between the waiting steps and four places (two near the child, two near the painter), or sent from a step with a tap, changing places with one on the table when all four are taken, so one can hide, crown or complete another.
- R7. A fairground board with a hole is one of the things to place: painted on one face, bare on the other.
- R8. A key turns the whole table a quarter turn.
- R9. The last six pictures hang on the wall and are found again. Nothing counts them.
- R10. Everything in `AGENTS.md`: wordless, no rewards, lossless, attended only, 60 fps budget, no egress.
- R11. The fourteen touch rules, tested through the Mount's path.

### Key Decisions

- **A full game.** session-settled: user-directed, chosen over a thin prototype: "go deep, go nice". Governs R4 to R9.
- **No learning claim.** The write-up's own check called it argued. Governs R10.
- **He never judges the child.** Reactions are about the picture. Governs R4, R5.

### Scope Boundaries

No drawing by the child, no text, no speech, no two-finger play, no change to the harness, templates, or another game. The registry row in `docs/art-direction.md` section 3 is the only shared edit; section 4 row states are left to the lead.

## Planning Contract

### Key Technical Decisions

- KTD1. The picture is rendered from the painter's eye in the real scene with the sitters at rest, then put once through an oil filter into a tile of one atlas. A picture is saved as its arrangement and drawn again on load, so a save stays far under 64 KB and the picture cannot disagree with the rules. Governs R2, R3, R9.
- KTD2. Raw three.js with no physics: nothing needs it, and it ports to Tada as is.
- KTD3. Look: lithographed tin toys, an open row in `docs/art-direction.md` set aside for this game among the parallel builds. One matcap lacquer, printed atlases made on first use. Nothing of three.js is made at module load.
- KTD4. Rules, reactions and touch live in modules with no browser: `cast`, `table`, `sight`, `taste`, `game`, `play`. `sight` is the painter's view in numbers and decides reactions; a test holds it to the drawn boxes.
- KTD5. A carried sitter moves on a plane in front of the table, and every hop goes up, over and down, so nothing passes through anything.

### Assumptions

- Tap to turn acts at the lift; the press squashes and clicks on landing, since the same press may become a carry.
- `childAge` only sets how many sit on the first visit.

## Implementation Units

Order of work: the sheet and its check, then the look's spike and the toy of U2 with only the cast and table rules it needs, then the rest of U1. The painter's visible want and the guidance ladder of U4 are in the first playable slice, before U3's wall and reactions are added.

### U1. Sheet, rules and saved state
**Files:** `ART.md`, `cast.ts`, `table.ts`, `sight.ts`, `taste.ts`, `state.ts`, tests. **Requirements:** R3, R4, R6 to R9.
**Test scenarios:** each facing after each turn and table turn; the painter's left is the child's right; a tall one behind a short one shows its head; one behind a closed board is hidden and one behind a hole is framed; the giraffe's head is cut off in the near place only; every corrupt save loads; the largest save is under 32 KB.

### U2. The toy in the look
**Files:** `view/*`, `<key>.tsx`, `motion.ts`. **Requirements:** R1, R10. **Verification:** screenshots at 1180x820.

### U3. Painting, reveal, reactions, wall
**Files:** `game.ts`, `scene.ts`, `view/portrait.ts`, `voices.ts`. **Requirements:** R2, R4, R5, R9.
**Test scenarios:** put away at each tenth of a second of the scene, nothing replays; a touch during it lands every beat; no two sitters share a reaction; nothing starts by itself afterwards.

### U4. Touch and guidance
**Files:** `play.ts`, `guide.ts`, tests. **Requirements:** R1, R6, R8, R11.

### U5. Audit, performance, refinement, registry
**Files:** `scripts/intersections/games/bottom-portraits.ts`, `frameBudget.test.ts`, `REFINEMENT.md`, `docs/art-direction.md`.

## Verification Contract

`npm run check`; `npm run build && npm run egress:built && npm run education:built`; `npm run check:intersections -- bottom-portraits` enforced; `npm run perf:jam -- bottom-portraits`; a cold playtest proxy by someone who did not build it.

## Definition of Done

Every gate above is green, the sheet has been checked by a reader who did not write it, refinement passes are logged, no abandoned code remains, and a draft pull request is open with CI decided.
