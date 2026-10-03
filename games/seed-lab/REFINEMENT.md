<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: sheet, waiting for its check. The look spike and the rules of this run are done; no toy yet, as the brief says. Remote builder, branch `lane/seed-lab`, cut from base commit `2a133cc41b6199cdb4da8ac3c2852eb401f82b61`. Renderer: canvas 2D.
- The sheet is whole at commit `e08d3944df8271fd3bf5b99de28cbf26c651ce12` and has not changed since. Hash of its sheet part (everything above `## The look`): `c3303b4373c1643d1d687f1ff0cdf3771aec35c15bf3830aff1607974f39d087`.
- Look in use: first reserved choice, Naturalist's field journal. Spike: the Mount shows the game's real scene at load from the fixed seed 20261003 (`spikePage.ts`), with nothing playable behind it. Stills were taken here in software at 1180 by 820, pixel ratio 2, of a production build, and are kept outside the repository. Frame rate not measured: this machine has no graphics card, and it is the lead's to take. To pin full quality for a still, add `tier=0` to the address; without it the governor steps down under software rendering.
- The rules were written against the sheet at `e08d394`, before its check, at the game's own risk. A finding under the representation, the mechanic questions, the error, the designed order or the records reopens them.
- Open: sheet ready for check, round 1
- Open: requests to the lead. (1) The registry row for the look, when the owner has seen it. (2) The commit that holds `symbols.ts` to start from: `loupe.ts` says where the two numerals lie and nothing draws them. (3) The template version the canvas pilot proves, before the toy.
- Open: not yet in the rules. The third secret of the sheet (a plant set in the beetle's corner) needs the beetle's place, which the toy stage adds; `visitors.ts` holds the other two.
- Open: seen weak in the spike, for the toy stage. The pod is the least clear thing on the page. The pencil family lines share a narrow band under the shelf and will crowd with several broods. Sprites are multiplied onto the paper, so a pencil line shows faintly through what crosses it. A wish for three plants widens its scrap into the waiting visitor's place. At 1024 by 768 a pot is drawn 43 px high inside its 48 px handle. Growth, bend, a seed, and the moth, ladybird and ant at visitor size are written and have not been looked at.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

One entry a copied file. The game's rules are all in new modules of its own (`plant`, `chance`, `breed`, `visitors`, `order`, `lab`, `page`, `visit`, `grid`, `voices`, `loupe`).

- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen, as copied.
- `config.ts`: changed, as it is meant to be. `LADDER` holds the nine position ids and is now a tuple, with a `PositionId` type beside it; `FIRST_VISIT` has its second row from age 11 and no longer reads the band's oldest age. **For the template:** rules keyed by position want the ids as a type, and `readonly string[]` gives none; a tuple with `satisfies readonly string[]` and an exported `PositionId` works with `state.ts` unchanged.
- `state.ts`: as copied, wrapped by `lab.ts` in the way its header describes. **For the template:** (1) a wrapper has to repeat the record and version check to know whether `deserialize` read the record or handed back a fresh state, because the two look the same from outside; exporting that check, or returning the fact, would save every game the copy. (2) `position` is a `string`, so a wrapper narrows it with a guard at each use.
- `audio.ts`: as copied; the game plays nothing of its own yet. **For the template:** a remote builder is asked for every voice as plain numbers in one pure module with a test of ranges, and the template has no such module, so each game will invent its own shape. The one here is `voices.ts`: a voice is a list of parts (tone or noise, pitch, glide, wave or band width, peak, attack, length, start), each part one call of `tone` or `noise`.
- `input.ts`, `guidance.ts`, `scene.ts`, `overlay.ts` and their tests: as copied, not yet used by the game's own code.
- `seed-lab.tsx` (the Mount): twelve lines added for the spike and nothing else changed. `draw` gets the 2D context once, lays the page out for the current size, sets the pixel ratio on the context and calls `drawPage`, whose count goes into `drawn.drawCalls`; time comes from `clock.seconds`. **For the template:** (1) `applyTier` only marks the canvas, so a canvas game passes the tier to its draw by hand and reads the pixel ratio back from the context; a line in the Mount's comments saying so would help. (2) Under software rendering the governor steps down within seconds, so a still taken without `tier=0` in the address is at a lower pixel ratio than asked; the cloud page could say so where it speaks of stills. (3) `BACKDROP` and a game's own first frame differ unless the game sets it; here it is now the paper's colour.
- **Missing, for the template:** a seeded stream of chance. The guide asks every game for a seeded random stream nothing else draws from; `chance.ts` here is fifty lines that any game could share (draws that depend only on a seed, a stream and a place in it).
- `ART.md`, `REFINEMENT.md`: as copied, filled in.

### For the owner to decide

One line for each thing only the owner can settle.

- **The count beside a sorted group.** When a brood is sorted into like young, the sheet lays a numeral (one to six) beside each group. The game reads that as a numeral on a quantity the child made. The default on readings leaves out a part count as a gauge of how well the child's work did. No count here is better than another, but the line between the two is the owner's. If he rules it a reading, the groups stay and the numerals go; nothing else in the game changes.
- **No letters, so no cross table in its school form.** The school form of this idea writes factors as letters. Under the default the game stops at beads and numerals. Nothing is asked for; it is listed so that he knows where the bridge to the school form ends.
- **The look and the toy**, at the toy checkpoint.

## Pass log

The passes of the look spike. Each looked at a still of the fixed page at 1180 by 820, pixel ratio 2, drawn in software with the clock paused. No frame rate was taken: no graphics card.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | The first still | It is a journal page. But the flower sits on the top leaves, the family lines are a tangle, the snail is not holding anything, the colour is flat, the eyes are googly | None yet; the governor had also dropped the pixel ratio, so later stills pin the tier | Not measured | Everything listed |
| 2 | Clarity of the four traits | I can tell red, pink and white, and tall from short, but the leaves look alike from far off | Longer stalk and shorter joints; uneven washes with blooms; hatching on the under half of a leaf; smaller lidded eyes; the snail carries its sketch taped to its shell; spots shown on a white and on a red flower | Not measured | Family lines |
| 3 | The plant as a drawing, and the lines | The stem runs through the flower, and I cannot follow a line to a parent | Stem stops under the flower; sepals, stamens, leaf veins; each brood's lines gather into two pencil bars under the shelf and run to the parents' pots; the pod moved clear of the leaves | Not measured | The pod reads as a bean |
| 4 | 1024 by 768 and 820 by 1180 | The bee is huge on the tall page | Creature sizes capped against the plant scale; bolder pencil in sketches; the waiting bee hovers with its sketch rolled | Not measured | Portrait is hidden by the shell anyway |
| 5 | The page as an object, and two moments of idle | It looks new, not kept; the worm does not look like a worm | A pressed frond, a tide line, stronger foxing; the worm redrawn; checked that feelers, eye-stalks and one tape end move and plants do not | Not measured | The pod |
| 6 | Finish, a wish for three, the lowest tier | The colour sits too neatly inside the lines | Washes sit a little off the line; the scrap no longer covers the eye-stalks; lowest tier looked at and still the page | Not measured | See the status block |
| 7 | A production build, by the builder | The same page as the dev server's, 51 draws a frame, no error from the game | The surface's first colour set to the paper's | Not measured | See the status block |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

So far: the sheet, the look spike and the rules. No toy and no game yet, so several lines are designed and not built. **No frame rate has been measured and no physical iPad was used.**

- **Alive at idle.** In the spike the beetle's feelers, the snail's eye-stalks and one end of a strip of tape move; the plants do not, by design, since they are the working pieces. It stops with the Mount's loop when unattended or hidden.
- **Motion and sound on every touch.** Designed, not built: the grid gives each of its thirty cells its own motion and its own voice (`grid.ts`, `voices.ts`), and none refuses. The Mount still answers a touch with the template's tick only.
- **Weight, squash and follow-through.** Not built. The sheet and the look set the rules: a stem is a spring, a pod swells before it bursts, each character has its own tempo and weight.
- **Kid-clear.** In the spike the four traits read at a glance on bare paper: three petal colours (white carried by an outline and a cool wash), joints drawn as nodes, round against jagged leaves, dark spots. Pot plants share one scale. Every handle is at least 48 px at 1180 by 820 and at 1024 by 768 (`layout.test.ts`).
- **Wordless clarity for the band.** No text is drawn anywhere (`npm run wordless:check` passes, and `journal.test.ts` holds that the page makes no text call). The band starts at 9: two numerals are designed, each beside its quantity (`loupe.ts`), and none is drawn yet.
- **Wordless guidance.** The template's idle ladder runs in the Mount and has nothing to show yet. The sheet says what it will show: a pencil ring on the flowers, then one dab between two flowers picked without regard to the wish.
- **60 fps on a mid-range iPad.** Not measured. Built for it: the paper is painted once per size, each plant and creature is a sprite drawn once per look and size, and a frame of the spike page is 51 draws (budget 80, held by `journal.test.ts`). No shadow, no post pass, pixel ratio capped at 2 by the tier table.
- **Procedural or committed assets only.** Everything is drawn on a canvas at run time. No file, font or address is loaded (`node scripts/egress-check.ts` and `npm run egress:built` pass).
- **Its own art direction.** Naturalist's field journal, written up in `ART.md` under "The look". A registry row is a request to the lead.

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
