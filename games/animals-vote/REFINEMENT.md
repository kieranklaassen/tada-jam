<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates. The whole sheet is built.
- Look in use: Mosaic tiles. The art guide is under "The look" in `ART.md`.
- Sheet check: round 1 by a fresh reader, not passed, 13 findings; round 2 by another fresh reader, not passed, 18 findings. All were resolved in the sheet or the code; no third round was run.
- Cold playtest proxy: one fresh reader with fifteen stills and nothing else. They read the rule ("the tallest tower happens to everybody when the bell rings") and who wants what, got stuck at the second vote, and listed 14 faults; pass 4 answers them.
- The owner has not seen it and no child has played it. Word from the owner about the games before it: their loops were not clear to a real 4-year-old. Pass 3 rebuilt this loop for that.
- Open: nobody has heard a sound of the game. They are tested as numbers. No iPad and no WebKit.
- Open: the owner moves the ledger row of the look in section 4 of `docs/art-direction.md`.
- Weak: in fly the pig hides part of the shop and the cat's balloon covers the mole's thought while it lasts. Mud stays on through a dance or a sleep until a bath.

### Template notes

Used as copied except `config.ts` (the ladder and first visit moved to `things.ts`), the Mount, and `scene.ts` and `state.ts`, which this game does not use and were removed: what is shown after the bell changes nothing, and the saved state is in `save.ts`.

### For the owner to decide

The look and the toy, at the first play. Whether the wish of the mole stays from the second vote on, or should come later for the youngest.

## Pass log

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | every animal in stones, every square | spots black, tails bare grout, the slab hidden behind whoever is in it | shades mended, thin parts in smaller stones, squares drawn smaller than their slab | not measured | the square |
| 2 | first visit, mud, sixteen results | brown things read as a net; tubs hide everybody; strings go wrong upside down; the sun is cut off square | dark stones in dark grout; tubs smaller; balloons with their strings as one picture; sun feathered | counted: 90 draws, then 79 at most | no reason to tap anything |
| 3 | the loop as a 4-year-old: what do I do, what happens, what next | nobody can see who wants what; nothing says the bell is next; nothing ties the column to what happens; three new tools on the second vote | a thought beside everybody; the bell stirs and is ringed with light; the winning picture climbs onto its column and stays; the tools wait for the sixth animal | not measured | the second vote |
| 4 | cold playtest proxy | stuck: the bell calls and the hand wants a drag; losing looks like winning; a dance is feeble; an empty shop; a mole dark on dark; foam reads as flowers | the bell hangs still until something is changed and the hand comes soon, carrying the animal; the mole's face falls and its thought swells; a great drum and confetti; shutters; a lighter mole; plainer foam | not measured | mud picture |
| 5 | sheet round 2 and a code review of 4,000 random gestures (nothing stuck, lost or unsaved) | a brief lift turned a carry into a tap; a quick second tap lost the first; the hand could show the winning move; a snack on the mole was live on its sill; the swing of the bell was not found as left; the picture on top covered a sixth square | all fixed with tests | Chromium, production build, 1180×820 at DPR 2, tier 0, 4x throttle, software GL: CPU p95 6.1 ms (19 to 27 ms before the coats were laid over the clean picture); 39 draws at most in the probe, 79 counted | as in Status |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

In the pull request.

### The learning claim

As in `ART.md`, "The claim".

### Defaults taken for the owner

Six animals at most, two columns first, a wish that waits for ever, tools with the sixth animal, age sets only the first visit's start, mud that only a bath takes off.

### What the next builder should know

A cold reader with stills finds a stuck loop in half a minute, and it is the second cycle and not the first that sticks. Lay a variant of a sprite over the laid original: laying is what costs.