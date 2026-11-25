---
title: The Endless String - Plan
type: feat
date: 2026-11-24
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# The Endless String - Plan

## Goal Capsule

- **Objective:** A child of 3 to 7 pulls a string of lights and silly things out of a box, hangs it on a moose, a house, a tree and a dog, and presses one fat switch that wakes everything on it.
- **Authority:** the owner's request, then `AGENTS.md`, then this plan, then `games/endless-string/ART.md`.
- **Profile:** one draft pull request. Merging and deploying stay with the owner.
- **Stop when:** the pull is dull on its own, or the game cannot meet a rule of `AGENTS.md`, or the look fails on clarity and the backup look (Airbrush gradient poster) fails as well.

## Product Contract

### Requirements

- R1. Pulling the string's end draws things out of the box one by one; a thing sticks at the rim, the box stretches, and it pops out.
- R2. The string catches on what the finger passes: antlers, a nose, a roof, a chimney, a tree, a dog's tail. Never a neck.
- R3. Everything works by tap alone: a tap on the end, or on the box, hangs the string on the next place.
- R4. A pulled loop from the middle of the string can be hung on another place; let go in the open it springs back.
- R5. The switch lights the string from the box to the end. Each kind of thing wakes in its own way, and the host it hangs on does that thing with its own body. A second press puts it out.
- R6. Winding back is a deliberate act (the crank, a place at a time, or the end carried home to the box) and the next string holds other things in another order.
- R7. The first picture shows the want, the way and the reason: a moose with bare antlers leaning to one lit bulb under a box that cannot hold its boot. A whole round is played once at the first opening and gives way to any touch. Idle guidance glows at 1.5 s and shows the next act at 3 s, and the act it shows is the next one in the loop.
- R8. No words, numerals, voice, score, timer or date. Found as left at any instant. Band 3 to 7, no learning claim.
- R9. Own look: gummed-paper shapes on black. Canvas 2D, quality tiers, 60 fps target, sound on every touch.

## Planning Contract

- KTD1. **The string is a path, not a simulation.** Box mouth, then the places it hangs on in order, then the end (a hand, a place or the snow). Things sit at fixed distances from the end, so a longer path brings more out of the box. Deterministic, bounded by the places, and nothing can tangle. Swing, sag and the pop are springs on top. A rope solver was rejected: it can tangle and slip, and a four-year-old cannot aim it.
- KTD2. **A host's answer is kind times host.** A kind gives an emission, a body motion and a phrase; a host gives an opening, a body and a timbre. Every pair differs in sight and sound without a drawing for each.
- KTD3. **The opening round and the tap path use the same acts as a finger**, so they cannot show something play cannot do.
- KTD4. **Nothing is painted in a frame.** Shapes are stamped from sprites in a dark and a lit version; lighting is a crossfade.

## Implementation Units

- U1. Design sheet in `games/endless-string/ART.md`, checked by a fresh reader.
- U2. Toy and look: `layout.ts`, `string.ts` (path and things), `paper.ts`, `pictures.ts`, the pull, the pop, sound. Tests: path length, order of things, pop once per thing, bounded length.
- U3. Hosts, switch, kinds, winding back, save, first round, guidance: `play.ts`, `kinds.ts`, `save.ts`, `voices.ts`, `view.ts`. Tests through gestures: hook, loop, release in the open, cancel, tap-only round, switch on and off, crank, load repairs, every kind and host pair differs.
- U4. Overlap and target tests, frame budget, screenshots in logged passes, cold playtest proxy, throttled frame cost.
- U5. Rows in the registry, README and shelf, the cover, `npm run check`, build, egress.

## Verification Contract

`npm run check`; `npm run build`, `npm run egress:built`, `npm run education:built`; `npm run perf:jam -- endless-string chrome 6 full`; screenshots at 1180×820; a cold run with no touch for 10 s.

## Definition of Done

All requirements hold, tests pass, a fresh reader has played the stills, and the pull request says what no one has checked: a child, an iPad, the sound.

## Assumptions

- "lfg" from the owner's earlier request applies to this game.
- The tree-in-a-net variant is left out of this slice.
