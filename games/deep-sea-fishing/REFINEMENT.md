<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates
- Look in use: Batik cloth, the first row reserved for this game, kept by the lead after the toy and again after the second run. The second row (Mosaic tiles) was not tried.
- Sheet: round 1, OPEN with 8 findings, all 8 replacements pasted word for word. Round 2: four replacements the builder proposed after the second run, checked and pasted by the lead. The game stands on the sheet part (everything above `## The look` in `ART.md`) with sha256 `c365816d1ee0547f1b822cb05294453f0425d206e30882020b697cbc6f711505`, which is the sheet with rounds 3 to 5 pasted. The builder changed nothing above `## The look` in the third or the fourth run. No sheet commit: this builder writes no git. Round 3: 13 replacements the builder proposed after run 3, pasted word for word by the lead. Round 4: two replacements after the first reading (pairs 14 and 15, the tow), pasted word for word by the lead. Round 5: three replacements after the second reading (pairs 16 to 18), pasted word for word by the lead. Round 6: two replacements after the third reading (pairs 19 and 20), pasted word for word by the lead; the sheet as it stands now is one step past the hash named here.
- Sentences: pairs 1 to 20 are pasted (rounds 3 to 6 above); they stay listed under "Sentences proposed for the sheet" as the record of what was changed. None is waiting.
- Open: nobody has listened to the sounds, and no frame rate has been measured.
- Reader: reading 1, by the lead's reader: NOT READY, nothing on rules 1 to 5, ten findings on rule 6 (three a child would notice, seven slight). All ten are closed in pass 4.1, each held by a named test. Reading 2: all ten of reading 1 hold; NOT READY, nothing on rules 1 to 5, ten new findings on rule 6 (two a child would notice, eight slight). All ten are closed in pass 5.1. Reading 3: all ten of reading 2 hold; nothing on rules 1 to 5 and nothing a child would notice; eight slight findings on rule 6 (a to h). All eight are closed in pass 6.1, each held by a named test in `together.test.ts` or `save.test.ts`; where, under "Reader" below. This builder has no tool to start a reader; the lead has the folder read.
- Taken: the lead took the game after the third reading's eight slight points were closed in pass 6.1, without a fourth reading, and registers the README row and the registry row in the pull request that brings the game.
- Open: no production build was made after the second run's one build. Everything since is held by tests and seen in stills from the dev server.

**What is here.** The design sheet and the art guide (`ART.md`), and the whole game on it: six baits on pegs, nine creatures who each answer every bait (54 cells, each with its own motion and its own sound on one timeline), the three passing rules, the tub and the cat, the two scenes (the tow, the tip-out) on `scene.ts`, the cycle and its restart, found as left, the first-visit layout by age, the idle ladder, the frame-budget test and the overlap tests.

**Where the stills are.** Not in the repo: they were handed to the lead with each run, in sets by folder: `pa`, `p1`, `f1`, `f2`, `p3`, `cold`, `cold2` and `final` from the second run, `r3` from the third (the new first visit at rest and second by second, the turtle noticing, the first drag answered, two full tubs, the cat flat under a catch and mewing there, the lob, the sleeping cat) and `r4` from the fourth (the octopus's arm on the cat's head, the jellyfish on its boot in the air and in the tub, the blobfish and the cat staring, the pegs as they stand now). To make them again: a window of 1180 by 820, the address `?chrome=0&seed=1#/play/deep-sea-fishing`, the page clock paused before the page loads and stepped 16 ms at a time.

**What the third run changed, by the lead's points.**

1. *The first visit.* The baited hook hangs straight down from the rod's tip in open water (`UNDER_THE_ROD` in `save.ts`), clear of every body at opening. The turtle opens at the kelp end of its stretch and swims to the worm by its own drift; within five seconds it stops with its nose beside the worm, eyes wide, and waits without a sound. The first drag is answered by its first slow bite. The line goes round the hull only where the child draws it. `save.test.ts`.
2. *Touched where it is drawn.* A hook laid anywhere on a creature's body is answered: the creature brings the part that answers to the hook (the turtle its mouth to a worm on its shell), the octopus and the blobfish answer in place, the shark answers a hook above or below its mouth at once and hurries round to one level with it. Tested over all nine creatures, at five places on each body, with a bare hook, the worm and the boot (`game.test.ts`). On deck the same: a catch in the tub is touched where it stands, an empty place above the rim is air, and the sleeping cat is touched in the tub and not on its empty seat.
3. *The lob.* The cat ducks before: it flattens itself, with its own small sound (`catDuck`), when a catch comes within 80 units of the waterline, and a catch is not swung in until the cat is flat. Drawn and sounded together, and silent when a game opens with the catch already that high.
4. *No jump when cornered.* A body is shoved at most 28 units in a step. One whose nearest free room is further keeps its place and slips toward that room at its own pace, and whoever came at it waits; a body that drifts sideways at the edge of the net or the keel, too high to go under, is stopped by it like a wall. A fault found on the way: the push down from under the net was not kept, so a shoved body wound itself up against a ceiling and sprang back; it is kept now. `overlap.test.ts` holds that nobody at home moves more than 40 units in a frame, over twelve wanders.
5. *A joke and the hook.* The nine cells in which somebody holds the hook let go the moment the finger draws it 40 units away, and their sound stops in that frame. No touch waits for the game.
6. *Catches in the tub.* About half their size in the sea (they were about a third), two in front and two behind, overlapping at the edges and never over a neighbour's middle third; a touch where two overlap goes to the one in front.
7. *The icon family* is `play`.
8. *Parked against loaded.* On the attention edge the Mount opens the game again from the saved state exactly as a load does; tested for a scene, a joke in play and the idle ladder. A press in the grown-up corner and a drag that enters it are not handed to the game (`touches.ts`). A scene or joke ended by a touch stops sounding in that frame: the voices go through one bus, which is shut and replaced (`audio.ts`).

**What to try first.**

1. A first visit with no age set: leave it alone for five seconds. The turtle swims up to the worm, stops and looks. Then drag the hook a finger's width: the turtle eats the worm in three slow bites.
2. Hang the worm again and take it to the pufferfish under the hull. Lift the catch out of the water: the cat flattens itself first, the catch swings in over it, and the cat gives its opinion.
3. Lay a worm on the turtle's shell, or a bare hook on the jellyfish's tentacles.
4. Hang the spoon and draw it through the sunlit water: the shoal follows in a train; take it deeper and the spoon goes dull.
5. Lower a worm to the shark: the tow. Touch during it.
6. Fill the tub to four, tap one catch, then tap the staved side: the tip-out, the lantern, the sleeping cat. Then touch anything: the next trip.
7. Put the game away in the middle of any of these and open it again.

**What is still weak.**

- The sounds are unheard. They are written from the sheet's words, held in range by `voices.test.ts`, and no two cells are the same, but nobody has listened.
- No frame rate is measured (no graphics card on this machine).
- The first drag, if it carries the hook more than a reach away from the turtle before the first bite at 0.2 seconds, cuts the turtle's chewing short. The answer has begun by then, but a fast child may see only the turtle's mouth open.
- A creature that is following the hook does not also answer a hook brought back onto its body: its following is its answer.
- The body a touch falls on is a box about the creature, a little smaller than its drawn outline at the tips of fins and tentacles.
- The cat's duck reads as a crouch and lean more than as lying flat.
- With four large catches the tub is crowded; the octopus in its boot and the anglerfish are the hardest pair to tell at the edges.
- A body that slips out of a corner goes straight or along one side, never round a bend; if it has not arrived in a second and a half it is shoved like anyone else again, by at most the same 28 units a step.
- The octopus's handshake was judged from stills only.
- A cat whose catch is tipped back in the middle of its opinion stops at once: it sits up, or wakes if it had pounced into the tub, with no move in between.
- Nothing of the second and third readings' fixes was seen in a still but the reel's bar, the idle hand, the hull and the anglerfish looking at a hanging hook; the rest is held by tests only.
- A game opened with the hook hanging beside a creature that had answered it before the put-away is answered again at the first touch on the line: nobody is unarmed at opening.

**Reader.**

The builder's own reading of the sheet, sentence by sentence against the code, in the third run. What it found and fixed:

- A cat touched while it was busy with a catch or lying flat was heard to mew and nothing on it moved. It now mews where it is, mouth open and tail lashing (`CAT_MEW_SHOWS` in `motion.ts`).
- The tub slopped while the cat was busy sounded the cat's flinch with no flinch drawn. The flinch is now sounded only when the cat flinches.
- A tap on an empty place above the rim slopped the tub, and where an empty place lay in front of a catch the tap missed the catch. A catch is now touched where it stands and an empty place is air.
- With the trip over, a tap on the cat's empty seat stirred the cat asleep in the tub. The cat is now touched where it lies.
- A body shoved under the net was pushed down in the picture only, and sprang back when let go (point 4 above).
- Every pose value the rules set is read by the view: the noticing look goes through the pupil, the lid and the tilt of every creature that has them, the jellyfish tilts, and the shoal turns as it does to something bright.

What it found and left, each with its proposed sentence below: the thirteen pairs, since pasted.

Reading 1 (the lead's reader, a first reading of every file): ten findings on rule 6, none of them in the builder's lists. All closed in pass 4.1:

1. *The jellyfish's boot vanished in flight and in the tub.* The boot is stamped as part of that catch wherever it is drawn (`drawCatch` in `frame.ts`), and the jellyfish sits high enough in the tub for it to show over the rim (`IN_TUB` in `rig.ts`). Test: "draws the jellyfish's boot as part of that catch wherever the catch is drawn" (`frame.test.ts`).
2. *No arm patted the cat.* One octopus arm reaches from the catch in the tub to the top of the cat's head for as long as the cat nods and purrs, lifts before each purr and comes down on it (`patOf` in `motion.ts`, drawn in `drawCat`). Test: "lays one octopus arm on the cat's head" (`frame.test.ts`).
3. *A catch landed itself after a put-away with the finger down.* A bite on a line taken up from a rest in the air moves the rest under the boat, and a saved state with a catch on a hook in the air opens with it under the boat (`land` and the constructor in `game.ts`). Test: "with the hook resting in the air and a bite on it: nothing lands without a touch" (`save.test.ts`, parked against loaded).
4. *Nobody can follow into a tow.* The dead branch is gone; the sheet's two sentences are pairs 14 and 15.
5. *Clicks coming up were higher but not quicker.* A click comes in for every 17 units of line and goes out for every 26, and the reel's bar, now drawn live, turns a step at each. Tests: "clicks quicker coming up than going down" (`game.test.ts`), "turns the reel's bar with the clicks" (`frame.test.ts`).
6. *A finger in the corner put out the idle glow.* It no longer touches the ladder (`Working` in `touches.ts`), and the five pegs stand closer so that the boot's is clear of the corner on a surface of 800 by 556. Tests: "does not count a finger in it as the child at work" (`touches.test.ts`), the surface added to "nothing tappable lies under the home control or in the grown-up corner" (`overlap.test.ts`).
7. *No drool; the stares followed the hook.* One drop runs down from the dreaming cat's chin; the cat's eyes are on the catch for as long as it has its opinion of it, and the blobfish's are on the cat. Tests: "draws the cat's drool while it dreams of the shoal", "has the cat and the blobfish stare at each other" (`frame.test.ts`).
8. *The cat was touched at its seat while it was in the tub.* It is touched where it is drawn at that moment (`catRect` in `game.ts`), and mews where it is. Test: "touches the cat where it is drawn" (`game.test.ts`).
9. *The splash of a bounce or a tip-back was a delay written into the voice.* It is a cue of its own, given in the step the ring is drawn. Tests: "splashes on one clock" (`game.test.ts`), "keeps the splash of a catch that leaves the boat out of the bounce and the tip-back" (`voices.test.ts`).
10. *The squid waved only after a whole answer.* It owes the wave from the moment it answers the stick. Test: "has the squid wave after the stick whenever it is drawn away" (`game.test.ts`).

Weaker lookalikes the builder knows of, so that a reader lists only new ones. None is meant as a sign and none stands alone where play depends on reading it:

- the sun's face is a spiral, which can be read as a curled six or nine or as an at-sign;
- the wax dots in rows on the pot, the turtle's shell and the pufferfish are pattern, not a count;
- the scroll waves along the waterline and the scroll clouds curl like a lying letter;
- the boot's laces cross, and can be read as small crosses;
- bubbles, the blobfish's bubble and ripples are rings, which can be read as a zero;
- the net's scales and the sea's filling pattern are rows of arcs, which can be read as a row of the same letter;
- the holes in the cheese are rings and dots;
- the tub's hoops and the hull's stripe are level bars, and the staves upright bars;
- the rivets on the hull and the rope's pegs are dots in a row;
- the shark's bones, lit from inside, are a row of bars across a spine;
- the squid's bands of light and the turtle's shell plates are bars and a grid;
- a shut eye is a small arc bowed upward, never a level bar;
- the anglerfish's crossed eyes and the shark's cross-eyed look are pupils turned in, not a cross;
- the ghost hand of the idle ladder is a mitten shape with no finger held up;
- the spring the worm frizzes into at the jellyfish is a zigzag.

Reading 2 (the lead's reader again): the ten points of reading 1 hold; ten new findings on rule 6. All closed in pass 5.1:

1. *The hunter rule fired on load.* Until the child draws the line no hunter scares anybody, and whoever a hunter is found hanging beside is already past its scare (`stepPassing` in `game.ts`). Test: "with a hunter hanging beside the timid: no startle, ink, bolt or bump, and the tub does not change, until the line is drawn" (`save.test.ts`, parked against loaded, four states).
2. *The cat's opinion outlived its catch.* Tipping a catch back ends the cat's opinion of it in that frame and stops the cat's voices (`tipBack`). Test: "ends the cat's opinion with its catch", for each of the six opinions (`frame.test.ts`).
3. *A catch could land itself on a touch that was taken away.* After such a touch nothing is swung in until the next touch (`taken` in `game.ts`). The spring's overshoot measured here is about a hundredth of the way, at most six units, so the case was at the edge; the test also sets the hook well into the air after the cancel. Test: the second half of "with the hook resting in the air and a bite on it" (`save.test.ts`), at eight rest heights from the waterline down.
4. *The turtle's scratch ran on two clocks.* The flipper and the knock read one number, `KNOCK_EVERY`, on the answer's own seconds.
5. *The jellyfish at the glow stick ran on two clocks.* Its beat reads the answer's own seconds, like its breath.
   The third of the same kind, found by looking: the dreaming cat's paw met the water a twentieth of a second after each plip; both now read `DREAM_PATS`. Tests for 4, 5 and this: "a figure that keeps a beat" (`motion.test.ts`), which also holds, for every cell, that no stroke, mouth, lid or squeeze is drawn from the free-running time.
6. *The tip-out's clicks did not turn the reel and sounded with the hook wound in.* The three written clicks are gone; while the line winds in the reel clicks as it always does, a step of the bar for each, and not at all when the hook was at its rest. Test: "winds the line in with the reel's own clicks" (`grid.test.ts`).
7. *A joke cut short silenced everything.* Every sound carries whose it is (a creature, the scene, the cat), each has its own way out, and only that one is shut (`partsFor` in `voices.ts`, `playTagged` and `hush(tag)` in `audio.ts`). Tests: "with a tag shuts only what was played with that tag" (`audio.test.ts`), "sorts the sounds of a step by whose they are" (`voices.test.ts`), and the two tests in `game.test.ts` that hold which tag is asked for.
8. *A catch closing up after a tip-back was touched ahead of its picture.* It is touched where it is at that moment. Test: "touches a catch that is closing up after a tip-back where it is drawn while it moves" (`game.test.ts`).
9. *The sheet's largest state cannot be reached.* Pair 16.
10. *The art guide and this file named the blobfish as stamped ochre at cheese.* It is the octopus; both corrected.

Reading 3 (the lead's reader, a third time): the ten points of reading 2 hold, and nothing a child would notice was found. Eight slight findings on rule 6, all closed in pass 6.1. The tests are in `together.test.ts` unless another file is named:

a. *The cat's opinion aimed at the place its catch had left.* Its eyes, its paw and the octopus's arm read the catch's place in every step (`aim` in `game.ts`), also while the catches close up after another was tipped back. Test: "follows its catch", for each of the six opinions.
b. *A beat sounded after its joke was cut.* A joke cut short drops what that creature had queued earlier in the same step; only the snap of the shark's jaws is kept, and nobody else's sound is dropped (`cutShort`). Test: "drops what that creature had queued earlier in the same step".
c. *A replaced opinion kept sounding.* Whatever takes the place of an opinion (the tip-out, the duck, the cling, the next opinion) stops the cat's voices in that frame (`catDoes`). Test: "stops sounding in the frame something else takes its place", for the tip-out and the cling, with a check in every frame that an opinion ended before its time asks for the hush.
d. *Two things started before the first touch.* The jellyfish does not drift after a light, and the cat does not dream of the shoal, until the line has been drawn; so a parked game and a loaded one are alike. Tests: "leaves the jellyfish where it is", "has the cat dream of the shoal under the hull only once the line has been drawn"; and "in the middle of a joke" in `save.test.ts` now holds that nothing at all is heard, the plip included.
e. *The drips ran on two clocks.* Each drop is a sound of its own (`drip`), given by the rules in the step the drop leaves the hook and tagged as the hook's; a hook dipped back in loses its drops and their sound together. The test found that the dip itself let one more drip through, which is fixed. Tests: "are heard one by one from the rules", "are gone, to see and to hear, when the hook is dipped back in".
f. *The cat's curl snapped shut at the end of the tip-out.* The scene lasts 8.3 seconds, the curl is over at 8.2, and the cat stays curled until the scene ends. Test: "is over inside the tip-out", which holds that the curl never opens again and no frame closes more than a small part of it.
g. *The idle guidance does more than the sheet names.* Pair 19.
h. *A creature in reach at opening did not react.* Nobody is unarmed at opening any more: whoever the hook already hangs beside looks at it without a sound and answers at the first touch on the line, like one whose stretch brings it there, and the anglerfish that has noticed a hook looks at the hook and not at its lamp. Tests: "has whoever the hook already hangs beside look at it", for all nine, and "turns the noticing anglerfish's eyes from its lamp to the hook". Pair 20 says it in the sheet.

The eight more that reading 1 named:

- the cat's whiskers, which were two strokes from one point a side and read as angle brackets: redrawn as three a side, fanned, each from its own root;
- the reel, which was a disc with one hand like a clock: redrawn as a plain drum with one bar across it, which turns with the clicks;
- the pufferfish's single brow, nearly level at rest, like a bar over its eye;
- the hook as a hooked letter, the boot as an angled one, the glow stick as an upright stroke, the worm as a wavy one;
- the coral's forks;
- the turtle's smile and the wrinkle of its nose, each a small angle;
- the gull's two legs, two upright strokes side by side;
- each rope post where it crosses the stroke of the waterline, a cross.

The six more that reading 2 named:

- the reel's bar, which lay level across its drum on every load: it now opens aslant by half a step and turns an eighth of a turn at each click, so it is never level or upright;
- the wreck's five ribs on a keel;
- the sucker ringlets along the octopus's arm;
- the shark's two rows of eight teeth;
- the three drops in a column under a hook just out of the water;
- the coil of the anglerfish's knot.

The seven more that reading 3 named:

- the ghost hand, which held one finger up, against the line above: redrawn as a soft mitt with a thumb and one fold, seen in a still;
- the hull's eight scroll curls in a row: now uneven in size as well as in place;
- the shoal's four sparks in a row as it parts: now a loose scatter of four sizes;
- the sun's twelve rays round a disc, like a dial;
- the island's row of arcs;
- the anglerfish's teeth, five above and four below;
- the cat's three back stripes and three tail stripes.

Rule by rule, as the builder reads its own folder: no official wording (the game claims no record); no address, no outside request, no import beyond the allowed packages; no name of a model, a vendor, a tool or a person; no record id in any string; no text call, no digit or letter shape, and no `symbols.ts`. The frame-rate overlay opens with a finger rested for a second in the top right corner and lifted there, and three taps there within three seconds; a child drumming on the corner opens nothing, and the corner answers no touch of the game.

**Requests to the lead.**

- The registry row: its text is at the end of `ART.md`.
- Pairs 1 to 18 are pasted. Pairs 19 and 20 were handed to the lead with the sixth run: paste or refuse them.
- No change is asked in a frozen file.
- `education:built` was not run: this builder does not open `education/`. The lead runs it with the gates.
- **For the template:** as in run 1, a small `voices.ts` with one voice and its range test would save every game writing the same test; `state.test.ts` could read the last place of the ladder so that a game of one place need not edit it; and `audio.ts` could carry the bus that lets a game stop what is sounding in one frame, since every game with a scene that a touch ends needs it.

### Sentences proposed for the sheet

Each is a place where the game as built and the sheet as written differ, or where the sheet is silent, found by reading the sheet sentence by sentence against the code. Nothing above `## The look` was changed by the builder for them. The exact pairs were handed to the lead with a check that each sentence as it stood occurred once above `## The look` and that no two overlapped; the lead pasted 1 to 13 word for word (round 3) and 14 and 15 (round 4), and 16 to 18 are with the lead.

1. The first visit at 8 and younger: under the rod's tip, with the turtle coming to the worm, in place of a little above the pufferfish.
2. The same in "The designed order".
3. After "Nothing is caught with a bare hook": a creature at home is touched where it is drawn, and how each kind answers.
4. The shark's hurry is to a hook level with its mouth, not to any hook on its back.
5. After "Nothing changes but the moment": whoever holds the hook in a joke lets go when the finger draws it away, and the joke's sound stops.
6. After "it swings into the tub": the cat flattens itself before the catch leaves the water.
7. The catches stand above the rim, large, overlapping at their edges, the front one touched, an empty place air.
8. After "nothing can be done wrong": nothing passes through anything, a cornered body keeps its place and slips round, nobody jumps.
9. After "with no scene played again": parked comes back exactly as loaded.
10. After "is then an ordinary touch": what the scene was sounding stops in that frame.
11. The corner: a finger set down there or drawn into it moves nothing.
12. After "stays where it was let go": until the line is drawn nobody starts an answer, and whoever comes to the hook stops and looks.
13. The cat, the tub and the gull touched: the busy cat's mew, the flinch only when it is not busy, the sleeping cat touched in the tub.
14. The tow's beats: nobody scatters home, since nobody can be following.
15. The tow, filled in from the state of play: where the shark was and what is in the tub, and why nobody follows.
16. The largest state the game can reach: four in the tub and either one on the hook or two following.
17. After the hunter rule: a hunter found hanging beside the timid when the game is opened scares nobody.
18. After the tip-back: the cat's opinion of a catch ends with the catch.
19. After the idle ladder in its first form: what it points at in the finished game (a catch drawn up, the full tub, the worm's peg beside a bare hook).
20. Before the first touch: a creature the hook already hangs beside looks at it too, and neither the jellyfish's drift nor the cat's dream begins.

### Counts

For this canvas game a draw is one sprite stamp or one live stroke: what `drawCount` in `frame.ts` counts, what the grown-up overlay shows as draw calls, and what `frame.test.ts` holds under 80. In the stills a frame is 52 to 67, and 52 to 65 in the third run's. The budget test goes through every cell with all nine creatures in the sea and with a full tub, a train of followers, a catch in the air, the tow and the tip-out: the most anywhere is 71 of 80 after the fourth run (the reel's bar and the jellyfish's boot are one more each; the arm on the cat and the drool are one each while they show). There is one full-surface draw a frame and no composite pass. No frame rate has been measured.

### Template notes

- `ART.md`: the header and headings kept; the sheet and the art guide written in.
- `REFINEMENT.md`: the structure as copied.
- `config.ts`: changed. The backdrop colour, a ladder of one place (`sea`), comments. The tiers are as copied: pixel ratio only.
- `state.ts`: used as copied. `state.test.ts`: names the only place of the ladder, with one test added for a ladder of one place.
- `symbols.ts`, `symbols.test.ts`: deleted. The game draws no numeral, though its band would allow one.
- `stage.ts`, `rng.ts`, `input.ts`, `guidance.ts`, `overlay.ts`, `scene.ts` and their tests: used as copied. `scene.ts` runs the tow and the tip-out.
- `audio.ts`: changed. Each owner of a sound (a creature, the scene, the cat) has its own way out, and `hush` shuts one of them or all, so that a scene or a joke ended by a touch stops sounding in that frame and nothing else does; `audio.test.ts` holds it.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts` and their tests: frozen, used as copied.
- `deep-sea-fishing.tsx`: the Mount as copied, with the game put in at the marked places.
- `manifest.ts`, `index.ts`: as generated for this game.
- The game's own modules: `sea.ts` (where everything is), `grid.ts` (the 54 cells as timelines), `game.ts` (the rules), `acts.ts` (what each cell draws), `motion.ts` (each character's own movement), `scenes.ts` (the two scenes and the flights on deck), `frame.ts` (the frame as a list), `art.ts` and `view.ts` (the painter), `voices.ts` (the sounds as numbers), `save.ts` (what is stored), `items.ts`, `rig.ts`, and `kit.ts` for the tests.

### For the owner to decide

- **The look.** Batik cloth, as in the stills.
- **How dark the deep is.** The deep creatures are stamped at half strength or more, so that they read at once; the sheet's "nearly dark" would be truer and harder to read.
- **Where a first visit starts.** Under the rod's tip with the turtle coming to the worm. The turtle only steals, so the first thing a young child does feeds a turtle and catches nothing; the first catch is the pufferfish under the hull, a drag away.
- **The hurries and the coming.** The shark and the pufferfish quicken toward a bait laid on or beside them, and a creature with a hook laid on its body brings its mouth or arm to it. These are the places a creature's drift is not the same every time.
- **The lob over the cat.** The cat flattens itself before the catch leaves the water, and the catch swings in over it. The other way is to move the cat or the tub.
- **How large the catches are in the tub.** About half their size in the sea, overlapping at the edges. Larger would cover each other's middles; a longer tub would push the cat off the deck.

## Pass log

One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1, the look spike and the toy (run 1) | Fourteen stills at 1180 by 820 on a paused clock: at rest, with the idle guidance, the hook at each of the nine creatures, and the cat, the tub and the gull touched. One still at pixel ratio 2. | "The octopus has a stick across it, is that its arm? The fish at the bottom are too dark, I can't see the grumpy one. The hook is tiny. Why is the round fish's eye a line, is it dead? The squid went into the turtle. The shark's tail is cut off." | Theme: every character readable and nobody through anybody. Arms over the pot's rim; fuller tails and light never below half in the deep; a larger hook; a shut eye as an arc bowed upward; the tub's water over its rim; the squid's way up kept clear; the turtle and the pufferfish moved apart; a shorter patrol for the shark. Nothing reverted. | Not measured. 63 to 71 draws a frame in the stills. | The sounds; no knot at the anglerfish; the handshake reads as a wave; the tub reads as a basket; a line drawn far left crosses the hull; the twined jellyfish can cross a neighbour. |
| 2.1, the whole trip (sets `pa`, then `p1`) | A first visit, a catch, a full tub, the tip-out and the tow frame by frame, the finished boat at night, and one still of every cell. | "The tub is full of rice. The cat is floating over the tub at night. The octopus landed on the cat's head. The worm is already on the fish. The water came back in the tub after it was tipped out." | Theme: the deck reads as a deck. The tub's water is blue with a cream line and wavelets, in a tub of staves and two hoops; the sleeping cat lies in the tub with its head over the rim; a catch is lobbed higher and the cat ducks sooner, so it passes over and lands beside the paw; a tipped tub stays empty until the next trip. Nothing reverted. | Not measured. 52 to 67 draws a frame. | Whether each cell reads in motion, which one still cannot show. |
| 2.2, the 18 cells that change the state, and the lead's weak points (set `f1`, then `f2`) | Six stills through each cell, as strips: every bite, steal, follower, flight and the tow; the anglerfish's tangle, the octopus's handshake, the line drawn far left, the twined jellyfish. | "The shark doesn't notice the worm on its back. Where did the spoon go when it went dark? The lamp isn't in the knot, the knot is just there. The line goes through the boat." | Theme: what the bait meets answers it, and can be seen doing so. The shark hurries round to a hook laid on its body, and reaches a little further; the dull spoon stays visible; a strand runs from the lamp into the knot; the line's belly is held clear of the hull and the hook's eye never swings into the bow (found by the overlap tests, then seen); bodies make way by rank into the nearest free room, so the twined jellyfish and a train of followers cross nobody. The octopus takes the hook in one arm and shakes it three times. Nothing reverted. | Not measured. 55 to 70 draws in the budget test. | The turtle does not answer a bait on its shell. The handshake is judged from stills only. |
| 2.3, the 36 jokes and the three passing rules (set `f1` joke sheets, set `p3`) | Six stills through each joke; the hunter passing the squid and the pufferfish; a light passing the jellyfish; a hook lifted out of the water. | "It's funny that the shark picks its teeth. The squid squirted and ran away when the shark came, good. When I pull the hook out nothing drips." | Theme: the small truths. Three drops fall from the hook as it leaves the water. No joke was changed: each of the 36 read as its sheet line in its strip. Nothing reverted. | Not measured. | The jokes are judged without their sounds. |
| 2.4, the cold playtest proxy (set `cold` on the production build, then `cold2`) | A fresh slot at the default age: ten seconds hands off, then a newcomer's minute of plain drags and taps, 32 stills. | "The worm is touching the puffy fish and it isn't eating it. I pulled the worm like the hand showed and the fish still didn't take it for ages. I tapped the corner and nothing happened. The hook is empty now, what do I do? Oh, the worm on the rope is glowing." | Theme: the first ten seconds. The pufferfish hurries along its stretch to a worm hung beside it in the sunlit water, so that copying the ghost hand's drag is answered at once. The corner is the grown-up's and stays unanswered. After a catch the hint already glows the hook and then the worm's peg, which read. Nothing reverted. | Not measured. | Before the first touch the worm can lie over the top of the pufferfish. This fix is not in the production build that was made. |
| 4.1, the first reading (set `r4`) | The reader's ten points on the sheet against the code, then stills of the octopus landed, the jellyfish landed and the blobfish landed. | "The jellyfish lost its boot. The octopus didn't pat the cat, the cat just closed its eyes. The cat is looking at the hook, not at the grumpy fish." | Theme: what the sheet says is drawn and sounded on one clock. The boot with the jellyfish everywhere; the arm on the cat's head; the stares; the drool; the reel's bar and the quicker clicks; the splash cue; the squid's wave; the cat touched where it is; nothing lands without a touch; the corner and the pegs. In the first still of the tub the boot was hidden behind the rim, so the jellyfish was raised. | Not measured; 71 draws at most | The jellyfish on its boot in the tub reads a little like a lamp on a stand. The cat lies flat for as long as a catch hangs just under the surface. |
| 5.1, the second reading | The reader's ten new points on the sheet against the code, each as a test before its fix where that could be done. | "The fish all ran away when I opened the game and I didn't do anything. The cat was purring at nothing." | Theme: nothing starts without a touch, and nothing outlasts what it belongs to. No hunter scares anybody before the line is drawn; the cat's opinion ends with its catch; a touch that is taken away lands nothing; the flipper, the bell and the paw read their sound's clock; the reel clicks itself in at the end of a trip; each sound has its owner and only the owner's are stopped; a moving catch is touched where it is. No stills: nothing new is drawn but the reel's bar aslant. | Not measured; 71 draws at most | A cat whose catch is tipped back in the middle of its opinion stops at once, with no move in between. |
| 6.1, the third reading (set `r6`) | The reader's eight slight points on the sheet against the code, each as a test before its fix; then stills of the idle hand, the hull and an anglerfish with the hook hanging beside it. | "The octopus patted the air where the squid was. The hook went plip plip after I put it back in the water." | Theme: what belongs together stays together. The opinion goes with its catch; a cut joke takes its queued beats with it; a replaced opinion is hushed; drops and drips are one cue each; the curl is over inside its scene; nothing drifts or dreams before the first touch, and whoever the hook hangs beside looks at it. The hand is a mitt, and two even rows are broken. | Not measured; 71 draws at most | A game opened with the hook beside a creature that had already answered it answers again at the first touch. |

**The playtest proxy, unclear moments and what was done.**

1. Hands off, the first worm hangs touching the pufferfish and nothing happens. Kept: the sheet says nothing moves until the child touches, and the hint ladder points at the hook within the ten seconds. Listed as weak.
2. The first drag, copied from the ghost hand, missed the pufferfish for about three seconds. Fixed by the hurry rule, after the build.
3. A tap in the top right corner answers nothing. By design.
4. After a catch the hook is bare under the rod. The hint glows the hook and then the worm's peg: clear.

**What may overlap, why, and how far.** Everything else is held apart by `overlap.test.ts` in every cell, with a wandering finger, in trains, drags, flights and the tow.

- The line is drawn in front of every creature it crosses and bends round nothing but the boat. A line is a line; cap: its own width.
- The hook and its bait are drawn over a creature they are brought to. That is the meeting; cap: the hook's own size.
- A catch lobbed into the tub passes over the cat, which is flat on the deck before the catch leaves the water. Cap: 0.7 seconds, and it lands beside the paw, not on it.
- Catches in the tub stand in front of and behind each other. Cap: never over a neighbour's middle third, held by the test.
- A body that is cornered and slipping aside, and the one waiting for it, are held to the same 3 units; the slip crosses nobody who is standing still.
- The shoal's fish jump over the cat's paw in front of the hull. That is the sheet's own picture.
- A catch tipped back or bounced off a full tub goes over the near rail in front of the hull and is next seen under the keel. Cap: the flight, 0.8 seconds or less.
- A scene ended by a touch puts the hook back under the rod at once. Cap: one frame.
- Two bodies making way for each other may be up to 3 units into each other. Cap: 3 units, held by the test.

**The frame, for the still at rest.**

- *Empty.* About 12 per cent: the open water in the middle right, which the shark patrols through and the shoal mills above, and a strip of sky above the bait rope. It carries the filling pattern and the weave, and bubbles rise through it. No part of the frame is bare cloth.
- *Funny.* The pufferfish with one worried brow, who becomes a spiky ball. The shark, who holds still to have its teeth played and goes cross-eyed at cheese. The octopus in a patterned pot, who shakes the hook like a hand and wears the boot. The blobfish, who scowls at everything and crawls after cheese with its eyes wide; the octopus, who turns cheese-yellow beside it. The anglerfish gazing at its own lamp. The cat with its paws on the tub, with an opinion of every catch.
- *Alive.* Every creature moves in its own way at idle; the kelp, the sparks, the bubbles, the wave band, the boat, the baits swinging on their pegs, the cat's tail and blink, the gull's preening; the two glows pulse; and every eye in the frame turns to the hook.

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### The README row

```
| Deep Sea Fishing | `games/deep-sea-fishing/` | 7–11 | A batik sea in 2D: draw the line down from a small boat, hang one of five baits or nothing on the hook, and bring it to nine creatures who each answer every bait in their own way, so that some bite, some steal, some follow and some bolt. Catches go in a tub under the eye of the ship's cat, and tipping the tub out ends the trip. No learning goal. |
```

### How the game meets the quality bar

- *Alive at idle.* Yes: see "Alive" above. `motion.test.ts` holds that something of every creature moves in every second.
- *Motion and sound on every touch.* The finger's landing is answered in the same step with a reel click and the hook on its way; every one of the 54 cells has its own figure and its own sound on one timeline, and `grid.test.ts` and `voices.test.ts` hold that the two keep time and that no cell is silent or shares a sound. The cat, the tub, the gull, a bait's peg and a catch in the tub answer a touch. The top right corner is the grown-up's. Nobody has heard the sounds.
- *Weight, squash and follow-through.* The hook swings past the finger once and settles; the line sags; the pufferfish swells too far and comes back; the boat dips on a pull and bobs back; a catch is lobbed in an arc and the tub slops; the cat ducks, squashes and stretches.
- *Kid-clear silhouettes and tappables.* Nine large creatures, no two with the same outline. What answers a touch on deck is at least 48 units each way and lies under neither the home control nor the grown-up corner, at eight surface sizes (`overlap.test.ts`).
- *Wordless clarity.* No word, letter, numeral or sign is drawn, and no row of dots is meant as a count. `wordless:check` passes. The playtest proxy is in the pass log.
- *Wordless idle guidance.* After three idle seconds a glow on the hook, after five a ghost hand (a mitt, no finger held up) that draws it a little way down, or up with a catch on it; with a full tub the tub glows and the hand taps it; with a bare hook the worm's peg glows too and the hand taps it every other time (`guidance.test.ts`, `game.test.ts`). It never points at a creature.
- *Frame rate.* Not measured on this machine. 52 to 67 draws a frame in the stills and 71 at most in the budget test, of 80 (sprite stamps plus live strokes); one full-surface draw, no shadow, no post pass, pixel ratio capped at 2, tiers that lower the pixel ratio only.
- *Assets.* All painted by code when the game opens. No file, no font, no address.
- *No engagement mechanics.* Nothing is counted, timed or kept: a trip ends when the child tips the tub, and the next begins at the child's touch.
- *Found as left.* `save.test.ts`: a trip put away at any step is found as left; the tow and the tip-out save their end state when they start and are never replayed; the next trip waits for a touch.
- *Nothing passes through anything.* `overlap.test.ts`, with the allowances above.

### The learning claim

None. The game has no learning goal, and the sheet says so under its three one-sentence headings. The things in the sea meant as true to nature are listed in the sheet; they are not a claim against any record.

### Defaults taken for the owner

- The band's youngest age governs: nothing needs speed, and the two things that need a place hold still or drift slowly.
- No numeral is drawn, though the band would allow one.
- A first visit at 8 and younger, and with no age, starts with the worm on the hook under the rod's tip, where the turtle comes to it; at 9 and older with a bare hook under the boat. Age sets that and nothing else; every bait and creature is there at every age.
- The deep creatures are kept at half strength or more.
- The shark and the pufferfish hurry toward a bait laid on or beside them, and a creature brings its mouth or arm to a hook laid on its body.

### What the next builder should know

- The frame is a list before it is a picture (`frame.ts`). The budget test, the overlap tests and the eye tests all read the list and need no canvas.
- One cell is one timeline (`grid.ts`), and the rules, the figure and the sound all read it. A new cell is a row there, a figure in `acts.ts` and a voice in `voices.ts`; the tests go through every row by themselves.
- Bodies are kept apart by rank, each placed in the nearest free room (`separate` in `game.ts`), not by pushing pairs apart, which never settled with nine bodies.
- Stills of a game with a patrolling character are only repeatable on a clock paused before the page loads. The jam shell saves on the page clock, so on a paused clock a saved slot lags by seconds.
- A test that brings the hook to one creature must start the hook beside it. On the way from the rod the hook passes others, and they answer first.
- Baked sprites are repainted when the pixel ratio changes, at quarter steps of the ratio. The two dyed variants (inked, cheese-yellow) are made from the same sprite when first needed.
