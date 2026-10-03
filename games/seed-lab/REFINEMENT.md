<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: sheet. Remote builder, branch `lane/seed-lab`, cut from base commit `2a133cc41b6199cdb4da8ac3c2852eb401f82b61`. Renderer: canvas 2D.
- The sheet is whole at commit `e08d3944df8271fd3bf5b99de28cbf26c651ce12`. Hash of its sheet part (everything above `## The look`): `c3303b4373c1643d1d687f1ff0cdf3771aec35c15bf3830aff1607974f39d087`.
- Look in use: none yet. First reserved look: Naturalist's field journal. Second: Ink brush.
- Open: sheet ready for check, round 1

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

One entry a copied file. The game's rules are all in new modules of its own (`plant`, `chance`, `breed`, `visitors`, `order`, `lab`, `page`, `visit`, `grid`, `voices`, `loupe`).

- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen, as copied.
- `config.ts`: changed, as it is meant to be. `LADDER` holds the nine position ids and is now a tuple, with a `PositionId` type beside it; `FIRST_VISIT` has its second row from age 11 and no longer reads the band's oldest age. **For the template:** rules keyed by position want the ids as a type, and `readonly string[]` gives none; a tuple with `satisfies readonly string[]` and an exported `PositionId` works with `state.ts` unchanged.
- `state.ts`: as copied, wrapped by `lab.ts` in the way its header describes. **For the template:** (1) a wrapper has to repeat the record and version check to know whether `deserialize` read the record or handed back a fresh state, because the two look the same from outside; exporting that check, or returning the fact, would save every game the copy. (2) `position` is a `string`, so a wrapper narrows it with a guard at each use.
- `audio.ts`: as copied; the game plays nothing of its own yet. **For the template:** a remote builder is asked for every voice as plain numbers in one pure module with a test of ranges, and the template has no such module, so each game will invent its own shape. The one here is `voices.ts`: a voice is a list of parts (tone or noise, pitch, glide, wave or band width, peak, attack, length, start), each part one call of `tone` or `noise`.
- `input.ts`, `guidance.ts`, `scene.ts`, `overlay.ts` and their tests: as copied, not yet used by the game's own code.
- **Missing, for the template:** a seeded stream of chance. The guide asks every game for a seeded random stream nothing else draws from; `chance.ts` here is fifty lines that any game could share (draws that depend only on a seed, a stream and a place in it).
- `ART.md`, `REFINEMENT.md`: as copied, filled in.

### For the owner to decide

One line for each thing only the owner can settle.

- **The count beside a sorted group.** When a brood is sorted into like young, the sheet lays a numeral (one to six) beside each group. The game reads that as a numeral on a quantity the child made. The default on readings leaves out a part count as a gauge of how well the child's work did. No count here is better than another, but the line between the two is the owner's. If he rules it a reading, the groups stay and the numerals go; nothing else in the game changes.
- **No letters, so no cross table in its school form.** The school form of this idea writes factors as letters. Under the default the game stops at beads and numerals. Nothing is asked for; it is listed so that he knows where the bridge to the school form ends.
- **The look and the toy**, at the toy checkpoint.

## Pass log

No pass yet. One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

Nothing yet. One entry for each line of the quality bar, saying how the game meets it so far. Each frame rate comes with the engine, the throttle, the pixel ratio and the build it was measured on, and with whether a physical iPad was measured.

### The learning claim

The claim as the sheet has it. Standings and check states were read with the lookup on 2026-10-03 and are read again on the day of the pull request.

Seed Lab is designed from two California standards adopted by the State Board for grade 6, `us-ca MS-LS3-2` and `us-ca MS-LS1-5`, both confirmed, and from five statements of Dutch curriculum-institute guidance, which say what a school can offer and not what a child must know: `nl ojw/pdm/3/10/fase2` and `nl ojw/pdm/3/08/fase2` for fase 2, and `nl ojw/pdm/3/14/fase3`, `nl ojw/pdm/3/12/fase3` and `nl ojw/pdm/3/07/fase3` for fase 3, all confirmed. From them it takes this and no more: young come from parents of their own kind, traits pass from parents to young, new plants come from seed or from a runner, and surroundings shape how a plant grows; and, from the California standard alone, that the young of two parents differ from one another while the young of one parent are copies.

- Nothing is named for a Californian child of 9 or 10: the grade 4 and grade 5 lanes hold no record on traits passing on.
- Choosing parents to get a wanted plant is the game's play and is in no record. Which factor hides which is in no record and is the game's own.
- `us-ca MS-LS1-4`, which the wave's plan named, is not used: nothing the finger does in this game is that skill.
- The representation (pairs of factors, one from each parent) is school practice without a trial behind it in the pack's tables.
- Nothing in the game or about it says what a child has reached.

### Defaults taken for the owner

From the guide's list, as they bind this game:

- No symbol stands alone. The two numerals of the game lie beside a group of plants and beside the plants of a wish, and play never depends on reading either.
- No letters and no written words, ages 9 to 12 included. So the journal has no handwriting, not even scribble that looks like it, and the cross table in its school form, which writes factors as letters, is not reached.
- No reading on the object. A plant's height is seen in its joints and never measured against a rule. The count beside a sorted group is put to the owner (status block).
- No camera shake and no impact pause. A pod's burst is carried by the chain, the sound and the squash.
- No speech. The visitors and the beetle make invented, synthesized sounds.
- The look is the lead's first pick for the game; the owner sees it at the toy checkpoint.
- The demo's verb is replaced: plant, harvest and buy becomes carry dust between flowers. Kept from the demo: plants that come up in seconds, and seed that is stranger than it looks.

From the sheet, the game's own choices, none set by a record:

- Tall hides short, round hides jagged, plain hides spotted, and red with white shows as pink; one pair to a trait; four traits; six seeds to a pod; heights of four joints and two; half the height from dry soil.
- A cycle that goes well is a wish met within a number of pods that differs by position (three to ten).
- A first visit starts at the second position from age 11 and at the first otherwise.

### What the next builder should know

- **A learning game about chance needs a route that is certain.** Inheritance is chance by nature, and the pack rules out a wanted result left to luck. The two fit when every wish has a cross that gives it for certain once the child has bred the right parents, and a test says so for every position and visitor (`order.test.ts`). Smoothing the chance instead would teach the very mistake the idea is known for.
- **Nothing wanted may sit in the starting material.** With true-breeding packets most first wishes were a packet plant as it stood, and the position moved with no cross made. Packets that hide each new factor in plants that all look alike fixed it, and a test holds that no wish is a packet plant.
- **Lay the waiting visitor out whole, with the position it was laid out at.** The guide's rule that a new position shows on the visitor after next falls out of storing that id in the visit, and what a position brings can then be carried in by the first visitor laid out there.
- **A long seeded walk of random steps, with a save and a load after every step, is a cheap test of found-as-left** for a state with many lists: four thousand steps run in about three seconds (`visit.test.ts`). It also stands in for random tapping: no step refuses and none leaves the page at a dead end.
- **A wrapper around the template's `state.ts` has to repeat its version check** to know whether a record was read or a fresh state came back (template notes).
