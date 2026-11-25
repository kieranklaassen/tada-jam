---
title: A Jumper for the Crocodile - Plan
type: feat
date: 2026-11-24
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# A Jumper for the Crocodile - Plan

## Goal Capsule

- **Objective:** A child finds out how long an animal is by laying sausages, shoes or ducks nose to tail along it, and sees the answer as a jumper of exactly that length.
- **Means:** A jam cartridge on canvas 2D in the Foil sweet wrappers look (KTD1), with one pure row of pieces that both the jumper and the fit are read from (KTD2).
- **Authority:** `AGENTS.md`, then `docs/solutions/conventions/building-a-jam-game.md`, then the game-design and education packs, then this plan. `games/crocodile-jumper/ART.md` owns the design detail once it exists.
- **Stop conditions:** The records do not carry measuring with loose objects, or both reserved looks fail.
- **Execution profile:** One pull request. The owner merges.

## Product Contract

### Summary

A crocodile lies along a paper strip in a tailor's shop. The tailor owns no tape measure, only sausages, shoes and ducks. The child lays them along the crocodile and the magpie makes a foil jumper with one puffed ring for each piece, where each piece lay. A gap is a hole with skin in it, two pieces on one spot are a bulge, too short leaves a cold tail and too long trips the mice.

### Problem Frame

No game in the jam measures. Cosy Scarf makes clothes, from wool, with no length to find.

### Key Decisions

- **Built now as the full game.** (session-settled: user-directed — chosen over a throwaway sketch first: the owner asked for the ideas to be built deep, at full quality) Governs R1 to R12.
- **No microphone and no spoken words.** (session-settled: user-directed — chosen over a speaking game: the owner picked the six that need no speech) Governs R11.
- **The jumper is a copy of the row.** No correct count exists anywhere in the rules. Governs R3, R4.

### Requirements

- R1. Three kinds of piece of different fixed length are laid on a strip along the customer: by a drag, or by taps alone.
- R2. Pieces slide, bump and push each other along; a piece let go on another lies on top of it; a piece let go almost touching closes up.
- R3. A touch on the tailor makes a jumper with one ring per piece in the piece's own material, where the piece lies.
- R4. Gap, overlap, short, long and a bare chest each show on the jumper where they happened, each with its own comedy, and the row stays so one thing can be changed.
- R5. Five customers of different lengths with fixed tastes in the three materials.
- R6. Some lengths come out in one material and not in another, and some only in a mix.
- R7. Two customers can share one jumper, and the child can bring that about.
- R8. The next customer waits in sight and is laid out only on the child's touch; the one who leaves is seen outside in that jumper.
- R9. Hidden designed order with stable ids; positions move between cycles only.
- R10. Put away at any instant, the shop is found as left and no scene replays.
- R11. No word, letter, numeral or sign; no score, praise, timer or count.
- R12. Every line of the quality bar is met, with measured frame work and an honest statement of what was not measured.

### Scope Boundaries

- No edit to the look menu's states, the template, the harness or another game beyond one row each in the README, the styles registry and the shelf list.
- No count shown, no ruler, no standard units.
- No promise that a child has tried it: none has.

## Planning Contract

### Key Technical Decisions

- KTD1. Canvas 2D. A wrapper is a fixed set of facets baked in several lights; a moving thing steps through them, so it flashes as it turns and is still at rest.
- KTD2. `row.ts` is pure: pieces as kind and start, push, scoot, snap and the fit. The jumper is a saved copy of the row.
- KTD3. `play.ts` takes pointers and seconds; the Mount and the tests call the same path.
- KTD4. Lengths are multiples of 36 stage units (duck 72, shoe 108, sausage 144), so every customer has at least one exact row.
- KTD5. Jumper rings follow the customer's outline at the ring's middle, so any row fits any customer with one set of ring pictures.

### High-Level Technical Design

```text
pointers -> input -> play -> row (push, snap, scoot) -> fit -> jumper, consequences
                      |                                        |
                      +-> save                                 +-> notes, view
```

### Assumptions

- A four-year-old can drag a piece of 72 by 90 units; the tap path exists when one cannot.

### Risks

- Facets read as noise: one hue per thing, dull paper under the pieces, hard silhouettes.
- The tap path could lay a perfect row by itself: a tapped piece lands with a gap and is closed by a touch of its own.

## Implementation Units

### U1. Sheet and measuring toy

- **Goal:** Checked sheet; pieces slide, bump, stack and make a jumper, already in foil.
- **Requirements:** R1 to R4
- **Files:** `games/crocodile-jumper/ART.md`, `row.ts`, `layout.ts`, `play.ts`, `foil.ts`, `view.ts`, with tests
- **Test scenarios:** pushing keeps order and never leaves the strip; a cancel restores the row; snap closes 20 and not 21; every fault is found from a row that has it alone.
- **Verification:** `npx vitest run games/crocodile-jumper`

### U2. Customers, scenes, order and save

- **Goal:** Everything in the sheet's grid happens.
- **Requirements:** R5 to R10
- **Files:** `cast.ts`, `save.ts`, `voices.ts`, `play.ts`, `config.ts`, with tests
- **Test scenarios:** each customer has an exact row; a party's exact row exists in the open trays; save and load in every state; corrupt saves repaired; no silent cell; nothing replays.
- **Verification:** as U1.

### U3. The look

- **Goal:** Foil sweet wrappers, edge to edge.
- **Requirements:** R11, R12
- **Files:** `foil.ts`, `paintRoom.ts`, `paintFolk.ts`, `paintPieces.ts`, `view.ts`, `crocodile-jumper.tsx`
- **Test scenarios:** counted draws under 80, one full composite, overlap of targets.
- **Verification:** stills at 1180×820 and logged passes in `REFINEMENT.md`.

### U4. Gates and shared rows

- **Goal:** Ship.
- **Requirements:** R12
- **Files:** one row in `README.md`, one row in `docs/art-direction.md` section 3, one line in `harness/shelves.ts`, `harness/covers/crocodile-jumper.webp`
- **Test expectation:** none -- rows and a picture.
- **Verification:** the Verification Contract.

## Verification Contract

- `npm run check`; `npm run build`, `npm run egress:built`, `npm run education:built`.
- A walkthrough on a production build and a cold playtest proxy.
- `npm run perf:jam -- crocodile-jumper`, reported with the renderer named.

## Definition of Done

- Every requirement has a test or a logged still. The sheet has passed a fresh reader. The pull request says what was not measured. No abandoned code is left.
