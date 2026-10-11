<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates. The sheet, the toy and the game are built: the ring of twelve turns, the four visitors and the three vases, every cell of the grid, the three scenes, the street over the wall, found as left, the idle ladder.
- Sheet check, round 1: checker label checker-1; nine findings, each replacement pasted word for word; round 2 of that check confirmed by the lead from the diff. No commit is named here: this builder writes none, the lead commits.
- Sheet change after the reader's reading 1: round 2, checked by the lead against the pack and the rulings; four replacements, pasted word for word into the sheet part of `ART.md`, and nothing else above `## The look` changed. They are: (1) the grid's thistle, second cell: it sticks upright only over the bed between two stems with room beside it, one thistle to a place, and lies flat anywhere else; (2) "The state stays": where a head in the vase hangs out over a stem of the bed, the finger is on the stem and cuts it; (3) "The handing over": the sniffs are for the first three kinds that still have a flower, and a bouquet of bare stalks is not sniffed kind by kind; (4) "The vase goes over", its cause: the load of a vase changes, by a piece let go into it, drawn out of it or cut short in it. The game stands on the sheet as it is after them.
- Sheet change after the reader's reading 2: round 3, checked and pasted by the lead; two replacements (the blades at a landing finger, the cut end in the hand), and nothing else above the look part changed.
- Sheet change after the reader's reading 3: round 4, checked and pasted by the lead; six replacements (where the cut falls, twice; the laugh needs both flowers; the bees in the hat and the loose bun are short-lived; the tipping head belongs to the jar and the tall vase, twice).
- Look in use: oil-paint still life, the first look reserved for the game. The second reserved look (crepe paper and wire) was not tried.
- Open, a request to the lead: the look is not in the claimed-styles registry of `docs/art-direction.md`. The text of the row ends `ART.md`.
- Reader, reading 1: NOT READY, two hits on rule 5 and thirteen promises unkept. Both hits are fixed (the glass in `view.ts`, the street table in `scenery.ts`). Promises 1 to 12 are built, each held by `promises.test.ts` or `cast.test.ts` except the haze's colour, which is paint. Promise 13, the thistle, and three things built that the sheet did not say are answered by the four replacements above.
- Reader, reading 2: held everything from reading 1; NOT READY, one hit on rule 5 and six promises unkept. The lead's rulings on rule 5, for a later reader:
  - The window stays a paned window. Its bars are now thin and in the tone of the stone frame (`scenery.ts`), so they are glazing and no dark cross on a pale box. Answered.
  - The puddle and the stream of a vase that goes over made a "7". The puddle now spreads round, the water drips off as loose drops, and a second pool spreads on the ground; no streak joins them (`view.ts` `puddle`). Answered.
  - The other lookalikes the reader named but did not count stay, by the lead's ruling: the stone table on its pedestal, the handle of the garden fork, the open blades.
- Reading 2, rule 6, all six built, each with a test in `promises.test.ts` under "what a child sees and hears, sentence by sentence": (1) the double tick at a finger on a whole stem, the snip after it; (2) a sniffed sunflower turns its face to the visitor; (3) a bee flies when its flower is let fall, spilled or handed over, and no longer when a stalk grows back; (4) the aunt's bun is drawn winding tight (`bunOf` in `rig.ts`); (5) a spilled poppy lands as it was, with a landing sound of its own and no petals thrown; (6) a thistle sticks upright only where it is let go over the bed between two stems, with its foot in the earth of the bed (`EARTH`, `overBed` in `place.ts`).
- The builder's own reading of the sheet part, sentence by sentence, after reading 2. Found missing and built, each with a test in the same place unless it is paint: the flower of a stalk that grows back opens with the pop; an onion flower bounces twice and then rolls, with two bonks; a thistle comes down point first and then tips over; a thistle in the vase is not shaken by its neighbours; the fluff of a dandelion is drawn up the nose before the sneeze; an eighth piece springs up off the bunch, which feels it; the visitor's hands go to the vase to stand it up, and it steps back until the vase stands; two bees live in the bee-keeper's hat (paint); the bride tips her bouquet onto her head; the aunt squares her bouquet to the edge of her table, with two taps; the thistle's head is on the aunt's nose at the start of her laugh (paint); the reach sniffs once; a short ivy lies in a curve too. Found and not built, with a sentence proposed to the lead: blades at a finger that lands on a piece, the vase or a creature; where the end cut off a lying piece goes.
- Reader, reading 3: clean on rules 1 to 5; NOT READY on rule 6, three promises unkept, one state unnamed, and one thing not counted. Built: every ivy piece lies in a curve, the shortest too (`garden.ts`, test in `promises.test.ts`); the boot holds any length upright and a head tips only in the jar and the tall vase (`arrange` in `garden.ts`, test in `garden.test.ts`); the bees that moved into the hat and the loosened bun end when that visitor leaves (test in `promises.test.ts`). Answered with sentences proposed to the lead: where a cut falls when the finger is on the flower or at the earth; the laugh needs both flowers; the two marks named among the short-lived things.
- Reader, reading 4, the last: clean on rules 1 to 5, with saved state, put-away and overlay clean, and four slight promises on rule 6 (as the lead passed it on; the report itself was not in the readings folder). The lead added a fifth point. All five are closed in code, each with a test:
  1. The cat opens one eye at a snip of the air too (`garden.ts` `lift`; `promises.test.ts`).
  2. The aunt's eyebrow at a stalk that leans out wide or tips comes before her measuring of a vase of stalks (`cast.ts`; `cast.test.ts`).
  3. The goat crunches a bouquet of one thistle or one stalk, and keeps the piece (`garden.ts` `handOver`; `promises.test.ts`).
  4. No blades show for the whole of a carry or when the piece is let go (`garden.ts` `lift`; `promises.test.ts`).
  5. The manifest's icon family is `play`: the game has no learning goal (`manifest.ts`; `test/games.test.ts` passes).
- Open: nothing of the sheet or the reader. There is no fifth reading.
- Checks run here, all passing: `npx tsc --noEmit`; `npx vitest run games/flower-table` (21 files, 443 tests, about 12 seconds); `npx vitest run test/games.test.ts` (136 tests); `node scripts/wordless-check.ts`; `node scripts/egress-check.ts`. One production build was made in the round before the reader's and none since; the cold playtest ran on it. Not run, because the brief forbids them on this machine: `npm run check`, `npm test`, `npm run build` with the two built-asset scans, `npm run perf:jam`.
- No frame rate has been measured: this machine is shared. What stands in its place is a count (`frameBudget.test.ts`, under "For the pull request").
- Nobody has listened to the sounds. Every voice is held in range by `voices.test.ts`, and that is all that is known of them.
- Stills: in the scratch folder the lead gave this game, outside the repository, at 1180 by 820, seed 1. Of the game as it now is: `h-01` to `h-17` (the goat holding the boot out, a bouquet, the handing over, the bee-keeper with the jar at her ear, the aunt straightening a sunflower, the glass), `i-00` to `i-27` (the goat walking out with the poppy behind its horn), `j-00` to `j-19` (a first visit at age 5: the bee-keeper holding the jar out). `f-01` to `f-26` are the whole play before the reader's round, `c-`, `d-` and `e-` the play before each earlier fix set, `cold-00` to `cold-23` the cold playtest on the production build.

**What the lead should try first.** Open the game and wait: the goat holds its empty boot out to the bed. Cut three flowers and carry each to the boot, then keep your hands off for four seconds: the goat reaches for the boot. Touch the goat: it takes the boot up, sniffs each kind in turn, eats the bouquet and walks out with the one piece it keeps behind its horn. Touch the bee-keeper in the gateway: she comes in with her jar and the bed grows back. Put two long sunflowers on one side of the jar and one on the other, then draw the one out: the jar goes over. Let an onion flower, then a dandelion, go on the bee-keeper. Put the game away in the middle of any of this and open it again.

**What is still weak.**

- No frame rate is measured, and no production build has been made of this round. The layer for what lies on the path is one large stamp, mostly empty; what that costs on a tablet is not known until `perf:jam` runs.
- Paint with no test: the haze's colour, the bead of each plant, the dandelion's tube, the bees that sag from the hat, the piece worn on the walk out. Each was looked at in a still.
- The visitor now stands nearer the vase, so a head that tips out towards it lies across more of it. A finger there takes the head.
- A long head that tips out of the jar or the tall vase can hang over the last ivy and the dandelions. A finger there cuts the stem, not the head.
- Seven of the tallest pieces standing straight up in the boot cover half of the goat; the overlap test now asks that half of the visitor stays free, where it asked six tenths.
- With a thistle stuck upright on both sides of it, a stem's own zone is 20 units wide along the stalk, and its full width only above them. The dandelions' zones are 40 wide at the best, which is 28 px on a surface 820 wide.
- The goat's shoulder at the table comes within a few units of the one in the gateway. A bee that follows a leaving bee-keeper is painted in front of the one in the gateway.
- The stills of this round did not catch three short moments: the flower opening, the bride's vase over her head, the bun winding. Each is held by a test of its numbers, not by an eye.
- A thistle that stuck in the earth looks much like one that grows there. Its cut foot shows, and a finger on it picks it up.
- The street figures are small: the aunt's stiff face reads, her eyebrow does not at that size.
- Sounds unheard, as above.
- The cold playtest was not run again after this round.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

- `flower-table.tsx`: the Mount as copied, with the garden and the view wired in where its comments say. The lift is the act here, so `onUp` calls `touch.letGo()`. A touch that begins in the grown-up's corner is skipped whole, with a flag set on its press: `inCorner` on the press alone would let the same touch's later gestures reach the game. **For the template:** the Mount's comment could say so.
- `state.ts`: used as copied for `v`, `position` and `finished`, wrapped by `save.ts` as its header describes. `beginCycle` and `finishCycle` are not used: the game has no ladder of difficulty, and its position moves one turn round a ring. **For the template:** a designed order that is a ring has no helper, and the comments of `LADDER` and `FIRST_VISIT` in `config.ts` speak only of easier and harder.
- `config.ts`: `BACKDROP`, the tiers (`motes`, `bits`), `TAP_PRESSES` set to 1 with its reason, `LADDER` and `FIRST_VISIT`.
- `audio.ts`, `input.ts`, `guidance.ts`, `overlay.ts`, `stage.ts`, `rng.ts`: used as copied. `scene.ts`: used as copied for the three scenes; the garden's own time is the scene clock.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen, untouched.
- `recording.ts` is not the game's: it is a canvas that counts, and only `frameBudget.test.ts` imports it. `paint.ts` has `useCanvases` so that a test can hand the painter such a canvas.
- **For the template:** the frame-budget test needs a canvas that counts and a way to hand it to whatever makes sprites. Both were written here from nothing.
- **For the template:** a canvas 2D game that paints its scenery and sprites once per size repaints them on a tier change, which is a hitch of its own inside the governor's settle window. Nothing in the template says whether that is acceptable.
- **For the template:** the still script waits a fixed time after the page opens, and a creature's first blink can land on exactly that frame (the goat's did). A note in the brief to look at two stills a moment apart before judging a face would have saved a wrong guess.

### For the owner to decide

- The overlap test asked that six tenths of the visitor at the table stay free beside the fullest bouquet. Since the boot holds any length upright, seven of the tallest pieces standing straight in it cover half the goat, and the test now asks for half (`intersections.test.ts`). A free patch of 96 by 96 units still holds at both sizes. Whether half is enough is his to see.
- The look and the toy, at the toy checkpoint.
- The bride sneezes at dandelions. The plan gave her a sneeze at lilies and no lily is among the six plants; the lead's answer was to keep the dandelion and add no seventh plant.
- A cut stalk grows back when a finger lands on it, and the whole bed grows back when the next visitor comes in. Nothing grows by itself.
- A thistle a child lets go over the bed, from above its tallest flower down to its earth, sticks upright in that earth between two stems that stand at least 44 apart, one thistle to a place, and is taken only by its own stalk. Anywhere else it lies flat like the rest. The sheet's cell says so since round 2. Whether a thistle should stick at all is his to say.
- Where each bouquet goes when it is carried off: behind the goat's horn (the one piece it does not eat), on the hive for the bee-keeper, on the bride's head as a crown, on the table at the aunt's window.
- The one who waits in the gateway holds its vase on its head.
- A sniff is played only for a kind that still has a flower in the bouquet; a bouquet of bare stalks gets the visitor's answer to stalks alone. In the sheet since round 2.
- A finger on a stem cuts the stem even where a head tipped out of the vase hangs over it. In the sheet since round 2.

## Pass log

One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | The first twelve stills (`a-`), and the goat's face enlarged from four of them | "The wall is full of logs." The ground's strokes were as thick and shiny as the plants and pulled the eye off them. "The window has sticks in it." "The goat has a pig's nose." "Why are scissors on the goat's eye?" when it is poked. The flowers, the boot and the goat were clear at once, and the goat's level pupils were already funny. | The ground set back: wall, brick and sky strokes glazed flat, broader and closer in tone, the light shaft a little weaker. The goat's nose made narrow with slit nostrils. No blades at a creature. Nothing reverted. | Not measured on this machine. 34 draw calls at rest, 46 to 48 with a bouquet and a path | The goat's body is a plain cream triangle. The ivy's tendril on the boot and the cut ends are flat paint beside the sprites. A tipped head is a hard kink. Pieces in the boot crowd when cut short. Sounds unheard. |
| 2 | The first play of the whole game, start to reopening (`c-01` to `c-26`) | "The flowers that fell went out of the picture." Spilled pieces lay in the lowest row with their heads cut by the frame. "They all pick it up the same." The four visitors took the vase and lifted it with one move. "The goat is a bag." "The stalks have no ends." "The sunflower broke." A tipped head was one hard kink. | What is set down stays in the picture: a piece takes the highest row of the path that keeps its flower below the earth. The take and the lift made each visitor's own. The goat's body painted again as a goat on its hind legs, with a saddle patch, a belly and hooves. Every cut end given a pale face with a rim. A tipped head bends in two turns. Nothing reverted. After: `d-01` to `d-26`. | Not measured on this machine. | The goat and the bee-keeper in the gateway are both cream and run together. Spilled pieces lie in one heap. |
| 3 | The play again (`d-`), and the table enlarged from `d-01` and `d-18` | "Where does the goat stop and the bee lady start?" The one in the gateway was painted in front of the one at the table. "The goat has lots of legs." Its hem hung under the table in white strands. | Depth at the table: the one in the gateway is painted first, the visitor at the table throws a soft shade behind it, the goat's hem is shorter and its leg fur darker. Nothing reverted. After: `e-01`, `e-18`. | Not measured. | The one in the gateway is dim while it waits. Spilled pieces still lie in a heap. |
| 4 | The path after the jar goes over (`e-21`, `e-25`) | "I can't see which flower is which." Four long pieces lay on top of one another by the table. | Pieces spread along the path: a place counts as taken, a little, by a piece a row or two away, so the nearest free place is beside the others and not on them. Nothing reverted. After: `f-21`, `f-25`. | Not measured. | Listed in the status block. |
| 5 | The reader's report, reading 1, and the play again after it (`h-`, `i-`, `j-`) | From the report: the glass "is a ring", the street table "is a T"; the goat and the bride "walk out with nothing"; the visitor "just looks" at an empty vase; every cut "looks the same"; the one in the gateway is behind the one at the table. In the stills after: "The goat wants me to put one in its boot." | The sheet's promises built: the vase held out, each visitor in its own way; the piece worn on the walk out; the bee-keeper's jar turned, held to her ear and shaken; the aunt's fingertip straightening a piece that sinks back; breath, haze and seeds drawn; a bead, a hang in the hand and a cut face for each plant; a vase weighed whenever its load changes. The glass given a lens and a handle, the street table legs and a cloth. The one in the gateway moved to its own doorstep at half size, beside the visitor at the table, and the shade of pass 3 taken out. What lies still on the path painted into one layer. Bits that never land were being drawn far off the surface; they are seen now. Nothing reverted. | Not measured. 30 stamps and 16 paths at rest, 75 and 26 at the most | Listed in the status block. |
| 6 | The walk out (`i-08` to `i-12`) | "The goat walked over the bee lady." One that left passed in front of the one in the gateway. | One that leaves, with the vase and the arms that carry it, is painted before the one in the gateway and goes out behind it; `intersections.test.ts` asks the real view for its paint order at every step of every visitor's walk out. Nothing reverted. After: `k-05` to `k-08`. | Not measured. | Listed in the status block. |
| 7 | The reader's report, reading 2; then the sheet part read sentence by sentence against the code; stills `m-01` to `m-09` | From the report: the window has "a dark cross in a pale box"; the water "makes a 7". From the reading: "It bounced three times." "The thistle just fell over." "Who put the vase back up?" The visitor's hands hung at its sides while the vase stood itself up. | The window's bars thinned and paled, the puddle made round with a pool on the ground. The six promises of reading 2 and thirteen from the builder's own reading, listed in the status block. Nothing reverted. | Not measured. 30 stamps and 16 paths at rest, 75 and 26 at the most, unchanged | Listed in the status block. |
| 8 | The reader's report, reading 3 | "The little ivy is straight." "The big flower fell over in the boot too." | Every ivy lies in a curve. No head tips in the boot. The bees in the hat and the loose bun end with the turn. Nothing reverted. No new stills: the three are held by tests. | Not measured. Counts unchanged, the heaviest frame now with the jar | Listed in the status block. |

### The cold playtest

On the production build (`npx vite build`, then its preview on port 4204), 1180 by 820, a fresh save. Stills `cold-00` to `cold-23`.

**Ten seconds, hands off.** The goat chews and blinks, the cat's tail sways, the robin hops. At three seconds every stem glows; at five a hand crosses a poppy with the blades; the glow fades and comes again. With the jam's home control drawn (`cold-00`), it sits over the roofs of the street, on nothing that answers.

**A newcomer's minute**, and what was unclear:

1. The goat first, as the largest thing: it answers. Clear.
2. A tap on a sunflower's head: the head drops to the path and a bare stem stands. A tap on that stem: it grows back. Clear, and funny.
3. Unclear: nothing then said that a piece can be carried. The hand's next showing was another cut, and the carry came only at the showing after it. **Fixed:** with a piece on the path and nothing in the vase, the carry is shown first (`g-02-carry-shown.png`, and a test in `garden.test.ts`). The fix is in the source and was looked at on the dev server; the production build was made once, before it.
4. A tap on the boot alone: it lifts a little and sets down. Clear enough that it can be moved.
5. A piece carried to the boot; four seconds later the goat reaches. A tap on the goat: the handing over. Clear.
6. The bare table: within a few seconds the one in the gateway glows and a hand taps it. A tap there brings the bee-keeper in. Clear.
7. While the goat is at the table the bee-keeper behind it was easy to miss. **Fixed after the reader's round:** the one in the gateway stands on its own doorstep beside the visitor at the table (`h-01-goat-holds-out.png`). Not played cold again.

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

- Alive at idle: the visitor at the table stands in its own way (the goat chews and shifts, the bee-keeper rocks from boot to boot, the bride floats, the aunt moves only her eyes); the cat breathes and its tail sways; the robin hops; dust drifts in the light; bees circle the hive.
- Motion and sound on every touch: a stem, a stalk, a piece, a vase, a visitor, the one at the gate, the cat, the robin and bare air each answer at touch-down, each with a voice of its own (`voices.ts`, 34 fixed voices and the ones made per plant, per vase and per visitor).
- Weight, squash and follow-through: the stalk whips and settles, the piece in the hand lags the finger, each plant lands in its own way, a regrown stem overshoots, a vase rocks before it goes over.
- Kid-clear silhouettes and tappables: the plants and the visitors are the lightest and most saturated things on a dark ground; what the game sets down never covers a stem, the vase or a visitor (`intersections.test.ts`, at 1180 by 820 and 820 by 1180). Beside the fullest bouquet a child can stand in a vase, at least half of the visitor stays free to touch; this share was six tenths and was lowered when the boot stopped tipping heads, and it is listed for the owner.
- Wordless clarity for age 4: no word, letter, numeral or sign; `node scripts/wordless-check.ts` passes.
- Wordless idle guidance: before any of it, the visitor holds its empty vase out to the bed. Then a glow on what can be touched, then a hand that shows the move not yet made: the cut, the carry to the vase, the touch on the visitor, and on a bare table the touch on the one in the gateway.
- Every character moves like itself: `acting.test.ts` holds that no two visitors share a pose for the same act.
- Frame rate: not measured. Pixel ratio capped at 2, one canvas, no post pass, one full-surface stamp a frame. Counted by `frameBudget.test.ts` through the real view on a canvas that counts stamps (`drawImage`) and filled or stroked paths: 30 stamps and 16 paths for the garden at rest; 45 and 16 with the idle glow; at most 54 and 24 through the handing over of a full jar; 75 and 26 with seven tipped heads in the jar, sixteen pieces on the path, a piece in the hand, every kind of loose bit and the glow at once. The test's budget is 80 stamps and 32 paths, and 32 and 18 at rest. What lies still on the path is one layer, painted again only when a piece there changes.
- Assets: all procedural.

### The learning claim

The game has no learning goal and claims no school skill.

### Found as left

Every scene saves its outcome when it starts (`scenes.test.ts`, one test for each), a touch ends a scene and is then an ordinary touch, and nothing replays on load. A piece in the hand and a vase in the hand are saved where they came from. Random play is saved after every act and read back whole (`garden.test.ts`).

### Defaults taken for the owner

- The bride's sneeze is at dandelions.
- Stalks grow back at a touch, and the bed grows back when the next visitor comes in.
- The path holds sixteen pieces and each vase seven.
- A first visit opens with the goat and its boot for a child of 4 or younger and for no age, with the bee-keeper and her jar at 5, with the bride and her tall vase at 6 or older (`FIRST_VISIT` in `config.ts`, held by `state.test.ts`). The age hint chooses nothing else and gates nothing: the ring brings every visitor and vase round from any start.
- The rest are under "For the owner to decide".

### What the next builder should know

- The view draws a piece as a stretch of one painted stem sprite, so a cut anywhere costs nothing to draw, and a regrown stem is the same sprite scaled from the earth.
- What stands in the vase is clipped to above the mouth, and a piece on its way in is drawn in front until it is over the mouth.
- The garden's rules are true at once and its drawn pose eases after them, so `toSave` is whole at any instant.
- Where a piece may lie is one pure module, `place.ts`. What answers a finger is one method, `Garden.targetAt`, and the overlap test asks it point by point.
- `promises.test.ts` holds what the reader found unkept, one test or more for each. `Garden.weigh` is the one place a vase is tested for going over, and it is called wherever the load changes.
- The view keeps a layer for what lies still on the path (`View.path`), keyed by each piece's place and shape. A new thing drawn on a resting piece must be in that key.
- A visitor is painted parts (`figures.ts`) moved by a pure pose (`acting.ts`) and put together in `rig.ts`. A visitor out in the street is that same figure painted once.
- `state.ts`'s `beginCycle` and `finishCycle` are not used: the ring moves one turn when the next visitor comes in.
