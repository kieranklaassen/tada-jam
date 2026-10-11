<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates
- Look in use: Ochre on rock, the first look reserved for the game, accepted at the toy. The second reserved look was not tried.
- Sheet: round 1 came back with 5 findings; each replacement was pasted word for word and nothing else above "The look" was changed. The sheet as it stands (everything above "The look") has the sha256 that begins `ff0c1df002fc`. No commit: the lead commits. Round 2: eleven replacements the builder proposed after Run 2, pasted word for word by the lead. Round 3: pairs 12 to 26 (reading 1) pasted by the lead, each found exactly once above `## The look`. Round 4: pairs 27 to 35 (reading 2) pasted by the lead, each found exactly once above `## The look`. Round 5: pairs 36 to 44 (reading 3) pasted by the lead, each found exactly once above `## The look`. Round 6: pairs 45 and 46 (reading 4) pasted by the lead, each found exactly once above `## The look`.
- Sentences: pairs 1 to 46 are pasted (rounds 2 to 6 above). None waits.
- Reading: reading 1 found nothing on rules 1 to 5 and seventeen points on rule 6, 3 a child would notice and 14 slight. All seventeen were closed in pass 6; where each was closed, and the test that holds it, is under "Reading 1" below. Reading 2 found all seventeen closed in the code, nothing on rules 1 to 5, and fourteen new points on rule 6, 2 a child would notice and 12 slight, with one lookalike. All were closed in pass 7; where, and the test, is under "Reading 2" below. Reading 3 found all of reading 2 closed in the code, nothing on rules 1 to 5 but two lookalikes, and eleven new points on rule 6, 4 a child would notice and 7 slight. All thirteen were closed in pass 8; where, and the test, is under "Reading 3" below. Reading 4, the last, found all of reading 3 closed in the code, nothing a child would notice, 9 slight points on rule 6 and two weak lookalikes. All were closed in pass 9; where, and the test, is under "Reading 4" below. Four readings were made, and none after pass 9.
- Open: the one production build was made before the last three changes of pass 5 (a gem drawn at the mole's feet, the idle glow from the cage, the bare wall of the roll as one stamp) and before all of passes 6, 7, 8 and 9. Those were seen on the dev page and are held by tests; the built page has not shown them.
- Requests to the lead: the registry row at the end of `ART.md` and the README sentence under "For the pull request". No request for a frozen file and none for a library.
- Rulings taken: the mammoth stays as keeper of the lift, with the guard of finding 5 (`layout.test.ts`); the cave left behind is not kept; `symbols.ts` and its test were removed, and `test/games.test.ts` passes without them; the icon family is `play`; the second tap on the lift counts only with the mole standing in the cage at rest. After reading 1: the table of dwellers stays as it is and the rule for a place gets the exception for standing water; on an errand the mole digs with no finger down but never opens a pocket; a tap on the mole holding a tool gets the hat and the set-down; earth with nowhere to go gets an answer of its own. After reading 3: an errand is run only by a tap; one block holds one tool, in play and in the save; a gem let go where it cannot lie drops to a free floor under it or beside it and otherwise flies back, seen and heard; packed earth never destroys a gem.
- Sounds: every event has a voice, written from the sheet's words as numbers in `voices.ts`, on the same clock as the picture. No one has listened to them.
- Frame budget, counted with the real view on a recording surface at pixel ratio 2 (`frameBudget.test.ts`): 60 draws at the worst of ordinary play, 76 at the worst of a full cave and of the blast and the run, and 77 in the two heaviest frames there are, a gem carried across the full cave and the ride from the full cave with a full bucket in his paw; one full-surface stamp a frame. The ride from a full cave had not been counted before pass 6: it stood at 82, and the roll painted in one fill and the worms pulling in at the squeal brought it to 77. Pass 8 changed none of the counted frames; a gem's flash is now one stamp where it was up to five fills. Pass 9 changed none of them either. No frame rate was measured: this machine's is not a result.
- Stills: the builder's stills, kept outside the repository, at 1180 by 820. `c-` before pass 2, `d-` after it, `e-` after pass 3 (twenty stills from the open hill to a fresh one), `f-ride-` and `h-ride-` the ride after pass 4, `cold-` the cold playtest on the production build, `g-` the same walk after its fixes, `i-` what pass 6 drew, each from a staged cave on the dev page (the wet blocks, the spouts and the tied rope; the invitation; the split; a carried gem and a bat leaving; the refusal; the prised gem), `k-` what pass 8 drew (the bloom of a gem struck free, the ghost hand), `m-` what pass 9 drew (the wall with the clay hand moved, the mole turned round at the wedge). To retake: the dev page at `?chrome=0&seed=1&tier=0#/play/gem-miner`; hold a finger two blocks under the mole; hold the block to the right of where he stops (the gas pocket); tap the bucket, then hold a block beside him; tap the rope; tap the lift, wait, and tap it again.
- What the lead should try first: hold a finger three blocks under the mole and keep holding into the yellow block; drag the finger onto a grey block. Tap the gem that springs free, then drag it into a wall. Hold the pick on the sallow block with the slit (the blast). Fetch the bucket and hold it on standing water, then tap the mammoth. Tap the lift once, wait six seconds and watch the mammoth, then tap the lift again.

What the game holds of the sheet: all six rows by five columns of the grid, each cell with its own motion and sound; light, mixing and wet; the twelve dwellers and the table; the mole's and the mammoth's tastes; the three scenes on `scene.ts`, each saved when it starts; found as left; the lift and the ride; both places of the designed order and the first visit by age; the whole idle ladder.

### Reader

Shapes left in the frame that could be read as a numeral, a letter, a sign or a count, each weaker than the thing it is:

- Sandstone's layers: four or five wavy lines across a block, of unequal length and spacing.
- The pick's marks in dug space: short slanted strokes, scattered, never in a row.
- The cracks in struck sandstone: a line that branches as it grows.
- A gas pocket's slit: one dark lens-shaped stroke on a sallow patch, tilted, among blotches.
- A water pocket: a stain with two beads of unequal size under it.
- The wheel at the top of the lift: a small filled disc with a hub, joined to the beam and the rope.
- The rope where it lies: one lopsided coil with a frayed end.
- The mammoth's trunk: a row of round segments that taper and curl.
- The withies of the cage: wandering lines, none straight and no two alike.
- The grass: a line of unequal strokes in two pigments.
- A worm: a short curved body with a head, which moves.
- The idle glow: a pale rounded frame round one block, which pulses.
- The arcs of finger dots and the sprayed hands on the wall. A sprayed hand has five fingers; there are four painted and at most three fading, never in a row.
- A wet dug block: three runs down its back wall, of unequal length, all at a slant. Reading 1 found two near-upright strokes there; they were redrawn.
- The manes of two painted beasts: bristles uneven in length, lean and spacing. Reading 1 found nine evenly spaced; they were redrawn.
- The end of the rolled hide: one pale ellipse. Reading 1 found a flat ring there; the inner ellipse was taken out.
- A glow-worm's three threads: of three lengths, each bowed its own way, each with its worm at the top. Reading 1 found them upright; they were bowed.
- The cage's door, shut for the ride: two woven bands, a wide one low and a narrow one high, with the mole's face between them. Kept: they are of unequal height and filled with weave.
- The bucket: one hoop low on it and three staves of unequal length that stop above the hoop. Reading 2 found two staves crossing two hoops in a small grid; it was redrawn so that nothing crosses.
- A beast's antlers: branching lines that fork. Kept: each has three or more tines of unequal length on a drawn head.
- The flash of a gem that is knocked or struck free: one soft round bloom of its colour, which fades. Reading 3 found five lit squares laid in a plus there; the squares were taken out.
- A worm's three rings: each bowed toward its head, of three lengths. Reading 4 found three equal cross strokes; they were redrawn.
- A dragonfly: its wings are swept back from the root toward the tail. Reading 4 found the body laid square across a wing bar; the wings were redrawn.
- The ghost hand's two knuckle creases: each bowed, one half as long again as the other, leaning different ways. Reading 3 found two upright strokes side by side; they were redrawn.

No row of equal marks, no bare ring and no crossed strokes were left that were found.

### Reading 1

Nothing on rules 1 to 5. Rule 6, the sheet against the code: seventeen points, all closed in pass 6. Each line says what the game does now, where, and what holds it; `answers.test.ts` is the test file unless another is named. A number in brackets is the sentence proposed for the sheet.

A child would notice:

1. A still hold that lifts is not a tap. A press that lasted longer than `TAP_S` (0.3 s) and lifts stops the work as a drop does (`release` in `game.ts`). Tests lift both ways: on the walk, in a blow, at a gas pocket. (12)
2. Red light on a pool. The table stays; the rule for a place gets the exception. No code changed. (13)
3. Nothing hangs over a pocket the pick opened. What falls in the hill a scene ends in falls in the hill that is shown, in the scene's first beat, with its thud, tik or clunk on the scene's clock (`fallIn` in `game.ts`); what the mole held up falls in the beat that sweeps him away. Tests: a boulder on a gas pocket, a gem and a tool over a water pocket. (14, 15)

Slight:

4. A touch that ends a blast ends the run it would set going too, and nothing is queued while it does (`finishScene`, `push`). (16)
5. Beside the pocket is every side (`cast.ts`, the whoomph).
6. The wedge's two halves are drawn parting and sinking (`halves` in `effects.ts`, `drawHalves` in `view.ts`).
7. The prised gem flies to the hat and is there when the ding sounds (`via` on its motion, `HAT_AT`).
8. The drop from a shut pocket is a bead down its face and a splash at the bucket; the wrung-out rope drips at his feet (`effects.ts`).
9. A spout over rock lets its drop run down its own face, heard at the spout (`stepDrips`, `drawDrips`). (17)
10. A tap on the mole holding a tool: the hat, and the set-down (`pokeMole`). (18)
11. Only a dug block is wet or holds water: `pack` and the end of `settle` in `world.ts` clear both on rock, and a boulder is not heaved into standing water. Test: parked against loaded. (19)
12. A worm is in its block whenever that block is earth, played on and loaded alike (`wormHomes` in `game.ts`).
13. `world.tied`: drawn whenever it is set, the smaller of the two choices (a slack rope from his paw to the boulder at rest, one stroke, in `drawRope`). The saved fields are unchanged.
14. On an errand he digs with no finger down and stops in front of a pocket, looking back (`decide`). (20)
15. A carried gem's light goes with it (`lit`, `carryAt`); who lives where waits until it is let go, as in the run, because a carried gem is saved where it was picked up. (21)
16. A leaving bat flies along the dug space toward the nearest dark, or up into its roof (`flightOf`, `lodgerBox` in `cast.ts`); it is found where it is drawn, and is gone at once from a block the mole is in or beside. (22)
17. A bucket with nowhere to tip: the act `refuse`, a head shake and the sound `pat`; the load stays (`useOnOpen`, `tip`). (23, 24)

From the builder's own list, closed in the same pass: the mammoth invites the second tap on the lift (`nudge` in `cast.ts`, the trunk in `drawMammoth`; 25); the tool the mole took into the cage stays in his paw until the door opens (`carried`; 26).

The ride's saved state against finding 3 of the sheet check, looked at again: from the ride's first frame the save holds a fresh hillside laid from the next seed at `wild`, the mole in its burrow and out of the cage with no tool, the bucket empty and lying in its place on the grass with the wedge and the rope, nothing tied, no gem out of its block, and his soot as it was. A gem in the bucket and a lamp on the rope go with the cave that is left. A test loads that save and compares it field by field, and plays the ride to its end and compares again.

One thing reading 1 did not ask for and the round found: hills drawn by hand in the tests had no dug burrow, so a load of their save was a first visit, and the ten states of "parked equals loaded" compared two fresh hills. They now dig the burrow and check that the load kept the seed; all ten still hold.

### Reading 2

Nothing on rules 1 to 5; the seventeen of reading 1 closed in the code. Rule 6: fourteen points, all closed in pass 7. `answers.test.ts` is the test file unless another is named; a number in brackets is the sentence proposed for the sheet.

A child would notice:

1. The lamp's rope is nobody's to take: the rope a lamp hangs on is not a tool lying in that block (`toolAt`, `ropeHangs` in `world.ts`), so a tap on the mole under his lamp sets his tool down and takes up nothing. A load lets that tool lie under the lamp (`save.ts`). Tested played on and parked against loaded. (27)
2. What falls once the water has gone, or once he is carried from under it, falls in a beat of its own in the run, with its sound, whether or not he is swept (`dropAt` in `startRun`). Test: a boulder over a pool that drains. (28)

Slight:

3. The spout loop reaches the bottom row (`stepDrips`).
4. A tap on dug space behind rock lands one blow on the first block in his way, as the sheet says (`release`).
5. Earth tipped into standing water builds a block as it does anywhere and takes the water up. The mud, a splat with the earth gone, was too like sand running away to be a cell of its own, and is taken out with its sound (`canPack`, `tip`). (35)
6. Tapped in a step or a blow he gets the hat and keeps the tool: the sheet is asked to say so. (30)
7. A hold on a tool, the lift or the mammoth that lifts runs no errand; only a tap does (`release`). (29)
8. A carried gem lights as it would lying there, two blocks round: the code stays and the sheet is asked to move, since the carried lamp then shows what setting it down would do. (31)
9. Nobody of the old cave is heard leaving at the unroll (`startRide`).
10. The full rule for which blocks a dweller takes, and so when a place is empty. (32)
11. The creatures within hearing flinch; the sheet is asked to say so. (33)
12. The rope of a hung lamp is drawn slack at its hook while the gem is in the finger (`drawHand`).
13. A bat with no dark to reach does not fly: it draws back into its roof where it hangs, so none rises over the grass line (`flightOf`). (34)
14. A long drain is hurried so the run ends inside eight seconds (`RUN_MOST_S`). Test: a drain of more than forty blocks.

### Reading 3

All of reading 2 closed in the code. Rules 1 to 5: nothing, and two lookalikes. Rule 6: eleven points. All thirteen were closed in pass 8. `answers.test.ts` holds each by name, under the heading given here; a number in brackets is the sentence proposed for the sheet.

A child would notice:

1. An errand is run only by a tap (`tapped`, `arrived`, `decide`, `release` in `game.ts`). Under a finger that is still down when he gets there, or that lifts after longer than a tap, he stops, looks back and takes nothing: at the tool, in front of the cage, at the mammoth's feet. A tap that lifts just after he has arrived still counts. Test "an errand is run only by a tap": holds of 0.4 s, 0.6 s and one that never lifts, for the tool, the lift and the mammoth. (36)
2. One block holds one tool (`toolFall`, `settle` in `world.ts`; `toolFalls`, `dropRope` in `game.ts`). A tool that comes down on a lying one is heard on it and hops to the nearest free floor through the dug space, the floor to either side first; in a shaft with no free floor it rests on top of the lying tool, one block up. Test "one block holds one tool", played on and parked against loaded. (39)
3. A gem let go where it cannot lie is seen and heard going where it goes (`setDown`, `flyBack`). On a gem: it lands on that gem and rolls off beside it, two tiks. Over rock: into the dug block under it or to either side. Over the grass: down a shaft open under it. With none of these it flies back in an arc, with a tik on a floor and a tock in a wall or on its rope. It goes only into a dug block that touches the one it is over, so it never passes through rock. Test "a gem let go where it cannot lie is seen and heard going where it goes". (38)
4. Packed earth never destroys a gem (`pack`): one gem is in the earth again, and any other is pushed out into the dug block that touches it, seen in an arc and heard landing. Test "packed earth never destroys a gem": the case itself, and a long random play with the bucket on six seeded hills in which the count of gems stays nine at every frame. (40)

Slight:

5. A tap during the blow of the tap before has its own blow, one in hand at the most (`struck`). Test "a tap during the blow of the tap before is not lost". (37)
6. A carried gem is set down in the block it is drawn in, which is the block it lights (`setDown`). Test "a carried gem is set down in the block it is drawn in". (38)
7. What a pool held up falls when the last water it falls through has gone, each column at its own moment, and water that the fall lets go runs on in the same run (`rounds`, `whenClear` in `startRun`). Test "what a pool held up falls when the water under it has gone". (41)
8. A lamp whose roof is dug away drops, and its rope falls too, seen, with its clunk (`settle` reports it). Test "one block holds one tool", third case. (39)
9. The glugs go down a scale of fifteen and begin again from the top (`GLUG_SCALE` in `voices.ts`). Test "glugs keep changing". (42)
10. The cast drops whoever lived in the old hill in the frame the fresh one is laid (`hill` in `cast.ts`). Test "at the unroll the old dwellers are not drawn on the fresh hill". (44)
11. `near` holds three or four lumps of granite, the one under the burrow counted (`layWorld`): the last of the lumps drawn is not laid there, a lump goes round the blocks that are kept, and a cavern is never laid in granite, so no lump is cut in two. This changed some seeded hillsides. Test "the first hillside holds three or four lumps of granite", over 400 seeds of each kind.

Lookalikes: the flash is one round bloom (`drawFlashes`, `bloom` in `figures.ts`), and the ghost hand's knuckle creases are bowed and unequal (`KNUCKLES`). Test "two lookalikes of the third reading". (43)

Three tests that held the old answer were changed: the cell "a tool taken up and set down" in `sync.test.ts` now taps the tool where it held it; the corner test in `play.test.ts` waits for the gem to land; and the audit in `intersections.test.ts` names one more contact that is meant, a lamp flying back to its rope in front of the mole.

### Reading 4

The last reading. All of reading 3 closed in the code. Rules 1 to 5: nothing, and two weak lookalikes. Rule 6: nothing a child would notice, nine slight. All were closed in pass 9. `answers.test.ts` holds each by name, under the heading given here, unless another file is named; a number in brackets is the sentence proposed for the sheet.

1. A tool let go in the block directly above a lying tool goes to free floor beside it; it stays on top only where the dug space has no free floor (`settle` asks `toolFall` for every lying tool; the rope a lamp lets go comes down last, so the tool under the lamp stays). Test "one block holds one tool", second case, which now starts one block up as well as two.
2. A tool resting on a tool is drawn sitting on it, its foot on the lower tool's top, and is found there (`toolRest` in `shapes.ts`). Same test.
3. A gem freed over a drop is seen falling from the block it sprang out of, with one tik where it lands (`showFalls`). Test "a gem freed over a drop is seen falling from its block".
4. A lamp flying back to its rope has the rope drawn slack at its hook through the flight (`slackRope` in `view.ts`). Test "a lamp flying back to its rope".
5. No lump of granite touches another, at a side or at a corner, on either kind of hillside, so a child sees three or four (`fits` in `layWorld`). This changed more seeded hillsides. Test "every hillside holds three or four lumps of granite", which asks for three or four over 400 seeds of each kind.
6. Looking back, he stands turned round toward the child for about a second, with a hum of his own, under a hold on a tool and in front of a pocket alike (`lookBack`, `back`, the event `hm`; `facing` in `view.ts`). Test "he looks back over his shoulder so that it is seen and heard". (46)
7. The ride starts when the finger lifts from the lift as a tap; a hold, the start of a drag, or a hold on the mole in the cage starts nothing. A tap on the mole in the cage is a tap on the lift (`press`, `arrived`, `release`). Test "the ride starts on a tap of the lift". (45)
8. No sprayed hand lies in the grown-up's corner: the clay hand was moved to the middle of the wall and the red one down (`SPRAYED` in `wall.ts`). Test "the grown-up's corner holds no painted hand" in `layout.test.ts`, on every tablet surface.
9. A scene that starts while a gem is carried sets the gem back in an arc, heard landing, in its first beat (`startScene`). Test "a scene that starts while a gem is carried".

Lookalikes: the worm's rings and the dragonfly's wings, redrawn (`WORM_RINGS`, `dragonflyWing` in `figures.ts`). Test "two lookalikes of the fourth reading".

The tests of the ride that pressed the lift and never lifted now tap it (`scenes.test.ts`, `sync.test.ts`, `play.test.ts`, `touch.test.ts`, and one here).

### Template notes

- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts` (frozen): used as copied.
- `audio.ts`, `input.ts`, `overlay.ts`, `guidance.ts`, `rng.ts`, `stage.ts`, `state.ts`, `scene.ts` and their tests: used as copied.
- `symbols.ts` and `symbols.test.ts`: removed on the lead's ruling; the game draws no numeral or sign.
- `config.ts`: the backdrop, the tiers (pixel ratio, chips a blow, dust), the ladder `near`, `wild` and the first visit at 7 and at 9.
- `gem-miner.tsx` (the Mount): passes touches and frames to `Play` and takes out what to play, cut and save. `Play` holds the rules in time, the cast, the effects and the idle ladder on one clock, and has no screen or speaker, so parked-and-returned can be tested against saved-and-loaded.
- `recording.ts`, `rig.ts`, `fixtures.ts`: test helpers. The first is a stand-in canvas that writes down what was stamped and where; the tests of touch, overlap, frame budget and sync draw the real frame into it.
- **For the template:** a game whose main action is a held finger needs the held state ended by five gestures. One "the finger is no longer down" gesture, or a line in the header of `input.ts` listing the five, would save each such game the search.
- **For the template:** a recording canvas like `recording.ts` would let every canvas game hold "touched where it is drawn" and the frame budget by test from the first day.
- **For the template:** `symbols.ts` could be left out by the generator when asked; a game of this band that counts nothing carries it unused.

### For the owner to decide

- The sounds: every one is written as numbers from the sheet's words and none has been heard.
- The mole is one block tall (84 of 90 units), small beside the mammoth. Making him a block and a half needs a hill that scrolls under a closer camera, which changes the game's one fixed frame.
- On a phone held on its side the mole on the grass over the burrow stands under the home control, and on a small window the rope's place on the grass reaches into the grown-up's corner. Tablets are clear.
- The cave left behind by a ride is not kept, and the stored position only moves on from `near` to `wild`.

## Pass log

One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | Seven stills at 1180 by 820, tier 0, seed 1: at rest, first blow, sandstone cracked, granite, a tunnel, the wall and the mammoth tapped, idle. | "The mammoth is funny and I want to poke him. The mole has a candle, I like that he digs where my finger is. But where I dug it is just black, like it broke. And is something in the hole over there? I can only see two tiny dots." | Things in the dark can be seen: bats repainted in a warm grey with a clay rim and larger eyes, and a third larger; the pick's marks left pale in the back wall of every dug block; a bat under the mole flattens to the roof. Nothing reverted. | Not measured on this machine. Draw count 34 at rest, 53 at the first blow. | A hanging bat with its eyes shut reads as a bulb before it moves. The flattened bat and the candle can still touch when the mole passes under: for the overlap test of the game stage. The mole is one block tall, small beside the mammoth. The hill below the grass has nothing funny in it until it is dug. The idle hand was checked in a crop only. |
| 2 | Nine stills of the game stage (`c-`): the open hill, a gem sprung free, sandstone, granite, a knocked water pocket, the wedge fetched, a vent, the run and after it. | "What is that blue thing, a cloud? And that green one with the line looks like a face with no eyes. The thing by the bucket is a spike, I do not know what it is for. The mammoth has stripes on his feet like he is counting." | The things in the hill say what they are: a water pocket is a damp stain with two unequal beads; a gas pocket a sallow patch with one dark slit; the wedge a dark blade with a wooden butt; the bucket staved; the rope one lopsided coil with a frayed end; the mammoth's toes two unequal nails; the cage's back wandering withies in place of even bars. Nothing reverted. | Not measured on this machine. 45 to 54 draws in the stills. | With a tool in his paw the pick hung below the floor, and the carried rope could not be told from his paw. |
| 3 | Twenty stills (`d-`): idle at 10, 17 and 25 seconds, digging, the blast in five, cross, the bucket, a scoop, the rope, the cage, the ride in three, the fresh hill. | "Why is his pick under the ground? And when he took the rope I could not see he had it. I like that he is all black after the bang." | What he carries can be seen: the pick goes on his far shoulder whenever a tool is in his near paw; the carried rope is a coil at his belly; a carried tool stays in his paw at rest; gems in the rock are drawn larger. Nothing reverted. | Not measured. 45 to 54 draws. | In the ride the hillside slid away over a flat brown box, and a bucket left on the grass stayed where it was while the ground under it went. |
| 4 | The ride in the `e-` stills, then again after the fix (`f-ride-`, `h-ride-`). | "The ground rolls up but there is nothing behind it, just brown. And the bucket is floating." | The ride reads as a hide rolled up: the bare rock of the wall, with its cracks and shading, shows where the hide has gone; the roll stands above the grass, has an end, and takes the tools on the grass with it; the fresh hillside's tools appear as it unrolls under them. Nothing reverted. | Not measured. 54 draws at the worst of the ride, counted by test. | The tool in the mole's paw is gone from the moment the fresh hillside arrives, while he is still up in the cage. |
| 5 | The cold playtest on the production build (`cold-`), then the same walk after the fixes (`g-`). | "I tapped the shiny block and he broke it, but where is the jewel? He is standing on it. And when he is in the basket the light is on a block he cannot get to." | A newcomer is not left guessing: a gem on the floor of the mole's block lies in front of his feet and takes the finger before he does; from the grass or the cage the idle glow and the hand go to the block he would reach first from the burrow. Nothing reverted. | Not measured. | Nothing invites the second tap on the lift (the sheet's choice). |
| 6 | Reading 1 (seventeen points on the sheet against the code) and stills of each new drawing from staged caves on the dev page (`i-`). | "I held my finger still and let go and he hit it anyway. The rock on top stayed up in the air when the hole went bang. He is in the basket and nothing happens." | The game does what the sheet says in every case the reading named: a hold that lifts stops the work; what rests on an opened pocket falls at once, heard; each sound has its drawing (the halves, the gem at the hat, the drops, the spout's drip); played on equals loaded (wet, worms, the tied rope); the mammoth taps the cage's rope. Two lookalikes redrawn, two reduced. The first aim of the trunk went into the cage and was moved to the rope; its rings came apart and were closed up. Dwellers that changed while a gem was carried were held until it is let go. | Not measured. 77 draws at the worst counted. | Stretched to the rope the trunk is a row of beads more than a trunk. The head shake of the refusal is small. No built page has shown this pass. |
| 7 | Reading 2 (fourteen points) and one still of the bucket on the dev page. | "He put his spike down and picked up the string, but the light is still hanging on a string. The big rock stayed up when the water went away." | Found as left and on the clock, again: the lamp's rope stays the lamp's; what the water held up falls in the scene, heard; a hold never runs an errand; earth builds in water; nobody is heard leaving a hill that is rolled away. The bucket redrawn with one hoop. Nothing reverted. | Not measured. 77 draws at the worst counted. | The hurried drain plays its glugs very fast. No built page has shown this pass. |
| 8 | Reading 3 (eleven points and two lookalikes) and stills of the bloom and the ghost hand on the dev page (`k-`). | "I kept my finger on the spike and he took it anyway. I put the blue one on the red one and it jumped back. He threw his string on the spike and they were both there." | Only a tap runs an errand; one tool a block; a gem let go goes somewhere seen and heard; earth never eats a gem; fast taps each dig; what a pool held up falls when its water has gone, and the water that lets go runs on; the lamp's rope falls with its clunk; the flash is one bloom. Nothing reverted. | Not measured. 77 draws at the worst counted. | The bloom is quiet on red earth. No built page has shown this pass. |
| 9 | Reading 4, the last (nine slight points and two lookalikes), and stills of the wall and of the mole turned round on the dev page (`m-`). | "I dropped the spike right over the bucket and it stayed up in the air. He didn't look at me, I couldn't tell. I put my finger on the lift and it went off." | A tool goes beside a lying one from one block up too, and sits on it where it must; a freed gem falls from its block; the lamp's rope shows through its flight; lumps of granite never touch; he turns round with a hum; the ride waits for the finger to lift; no hand in the grown-up's corner; a carried gem is set back at a scene's start. Nothing reverted. | Not measured. 77 draws at the worst counted. | Nobody has heard the hum. No built page has shown this pass. |

The frame after pass 1, for the still at rest. Empty: about 6% by eye, not measured, all of it bare wall between the paintings above the grass; the hill is blocks from edge to edge. Funny: a mammoth far too big for the basket of the lift he keeps, with his trunk on its crank; a mole in a hat with a candle; bats hanging upside down in holes someone dug before. Alive: the mammoth's ear, trunk and blink, the mole's breath, sniff and following eyes, the candle's flicker, each bat's sway and its own idle.

The frame after pass 5, for the still at rest. Empty: about 5% by eye, not measured, all of it wall between the paintings above the grass. Funny before any touch: the mammoth too big for the cage it keeps, its eye on the cage; the mole in his hat with a candle; bats asleep with their ears and faces showing; worms that look out of the earth and pull back; a painted beast that turns its head to look down at the mole. Alive: all of those, each on its own time.

### The cold playtest proxy

On the one production build, in a preview, with the home control drawn, by script and stills; a proxy and no child.

- Ten seconds untouched: the mole looks about, the mammoth shifts, bats sway, worms peep. From the third second one block under the mole glows, and at about the twelfth a hand presses it. It invites pressing that block.
- The first minute as a newcomer: a tap on the glowing block breaks it and the mole steps down; a tap on the mole drops his hat; a tap on the block with the red stone breaks it and the stone springs out; a held finger lower down digs through sandstone and stops at granite with a clang; the mammoth lifts its trunk; a tap on a beast leaves a sprayed hand; a tap on a bat makes it drop and flap; a tap on the wedge sends him for it; the wedge held on the gas pocket whistles it empty; a tap on the lift puts him in the cage.
- Unclear moments, both fixed and walked again on the dev page: the gem that sprang free was hidden behind the mole who had stepped onto it; with the mole in the cage the idle glow lay on a block under the cage that he could not reach from there.
- No request left the page's own origin.

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

For the README: Gem Miner (ages 7 to 11): hold a finger in a hillside and a mole digs toward it; the gems he frees are lamps, and their mixed light, the water and the dark decide who moves into the cave you dug.

For the registry of claimed styles in `docs/art-direction.md`: the row under "Registry row, a request to the lead" at the end of `ART.md`, unchanged by passes 8 and 9.

Readings: four readings of the game against its sheet were made by a reader who did not build it. The fourth found nothing a child would notice and nine slight points, which pass 9 closed, each with a named test. No reading was made after pass 9.

### How the game meets the quality bar

No frame rate has been measured on any target and no physical iPad was used; the shared probe is the lead's to run.

- Alive at idle: the mole, the mammoth, the candle, every dweller, the worms and the painted herd move at rest, each on its own time with idle moves that never repeat twice running (`cast.test.ts`).
- Motion and sound on every touch: a press is answered in the same call, in the hill, on the wall, on the grass and on every character and tool; every cell of the grid has its own motion and sound on one clock (`sync.test.ts`). No one has listened to the sounds.
- Weight, squash and follow-through: the paw winds up before each moment of an act and is at its far point when the sound comes; the mole squashes by how hard the thing is; the mammoth's feet, ears, tusks and trunk answer what happens under it; a hung lamp swings on after he has passed.
- Silhouettes and tappables: six kinds of thing in the hill in their own pigment and pattern; tools that look like tools; everything is touched where it is drawn in every state (`touch.test.ts`); nothing touchable under the home control or the grown-up's corner on a tablet (`layout.test.ts`).
- Wordless: no word, letter, numeral or sign; no `symbols.ts`. The wordless check passes. The weaker lookalikes are listed under "Reader".
- Idle guidance: a glow on the block the mole would dig next, then a hand that presses and holds it. With the mole waiting in the cage the glow sits on the cage's rope and the mammoth taps it with its trunk, without a sound; nothing starts by itself.
- Frame budget: one full-surface stamp a frame, 60 draws in ordinary play and 77 at the worst counted, pixel ratio capped at 2, no post pass, four tiers that change drawing only.
- Nothing passes through anything: a model overlap audit on the drawn shapes over walks, the three scenes and a random soak on four seeds, with five allowed contacts, each with a reason and a cap (`intersections.test.ts`). The bats and the candle never cross.
- Found as left: a save holds the end of the scene that is playing from its first moment; parked and returned equals saved and loaded in ten states, in data and in the drawn frame (`play.test.ts`), and after packing earth, a fallen boulder, a re-packed worm block and a tied rope (`answers.test.ts`).
- Assets: all procedural, drawn into sprites when the surface is sized. No request leaves the page.

### The learning claim

The game has no learning goal and makes no claim.

### Defaults taken for the owner

The four lines under "For the owner to decide" are each a default taken until he answers.

### What the next builder should know

- A route that weighs the kinds of ground decides where the mole goes, so a test or a still that wants him through sandstone must wall the easier way with granite.
- A hill repainted only where a block changed must also repaint the rubbed edges of the neighbours that reach into it, or a seam shows.
- Dark figures in dark space need a pale rim.
- Every sound is an event pushed in the step that shows its cause; a new sound goes into `ACTS` or a scene's beats, never into the view or the Mount.
- A dweller in the mole's way, or in the way of anything that falls, draws back within a tenth of a second; a new thing that moves through dug space must be added to `keepClear` in `cast.ts` and to the overlap audit.
- Touch shapes come from `gemPlace`, `toolPlace`, `boulderPlace` and the cast's `under`, which the view draws from too. A new touchable thing gets its place there first.
- A scene saves its end when it starts, so anything that falls or moves in that end must be shown falling inside the scene (`fallIn`), from what `settle` reported when the end was worked out; settling the shown hill by itself gives a different answer wherever water comes to rest first.
- A hill drawn by hand for a test needs its burrow dug, or a load of its save is a first visit and a comparison of parked with loaded compares two fresh hills.
- A lift within 14 px is reported as a tap however long the finger stayed; the game decides by the time between `press` and `release` (`TAP_S`).
- An errand's last step (the take, the step into the cage, the start of the ride, the tip at the mammoth's feet) asks `tapped` first. A new errand must ask it too, or a hold will run it.
- A tool never comes to rest by `floorUnder` alone: `toolFall` says where, and `settle` reports every tool that moved, the rope a lamp let go included, so that `toolFalls` can show it.
- The run is worked out in rounds: each `settle` of the hill it ends in is one round of falls and of water, and every round is played. A change that lets more fall or flow needs no new beat.
