<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Resumed: "after the run that pastes your sentences" (the look pass, cut off part-way with its work uncommitted), then "to take up at the end of your look pass. Round 5 of your sheet is answered", then "after the run before this one. A new last step for every game: the reader", in that order.
- Stage: gates, after the look pass. The game is built on the toy and the gates were run as far as the build machine takes them (below). The lead reported before the look pass that it passed the gates on the lead's machine and that its intersection audit was clean there; the look pass changed what is drawn, so the frame rate is to be measured again. It stands on the sheet that passed round 4, with details pasted since so that the sheet says what the game does: ten that round 5 read, and the sixteen that round 6 is asked to read.
- Sheet, round 1: checker B, 14 findings, all pasted at commit `06c946d`.
- Sheet, round 2: checker D, 4 findings, all pasted at commit `d9a0c46`.
- Sheet, round 3: checker E, on the text with sheet part sha256 `26cdd160de55cad7ff69e3dc309676351c6b290327f1de763efc3b89cdbf2e78`. Outcome: 2 findings. Both replacements are pasted as the checker wrote them, none disputed, at commit `8f106a2` (sheet part sha256 `3c3a46542314229cc47bae57cd57ac510e4a7cbc345796262c7f43d843317e3b`). Brought into line at commit `90798d1`: every sound the grid's cells now name is a voice of the game (twenty-one new ones in `voices.ts`, held to the stated ranges), and each of the thirty cells is played through the game in a test and heard as the sheet has it.
- Sheet, round 4: checker F. Outcome: **passed**, no findings. The text it judged has sheet part sha256 `3c3a46542314229cc47bae57cd57ac510e4a7cbc345796262c7f43d843317e3b` and is held by commit `8f106a2`. 
- Sheet, after the pass: ten sentences of detail were changed in eight lines, each to say what the built game does, at commit `d3ab9e7` (sheet part sha256 `0eb1ff4c7122d2c662c9297de9dba822b3bb252784e19b64955d175e3daf1d4b`). They are listed below, old and new. None changes the mechanic, the error, the designed order, the records or the claim; one is a row of the table of saved fields, which now names a field the save has held since it was written.
- Sheet, round 5: checker G, on the text with sheet part sha256 `0eb1ff4c7122d2c662c9297de9dba822b3bb252784e19b64955d175e3daf1d4b`. Outcome: all ten changes stand; 1 finding, on the sentence that opens "The scenes". Its replacement is pasted as the checker wrote it, not disputed, at commit `1c3be14`.
- Sheet, after round 5: besides the checker's own replacement the sheet was changed in fifteen places, each to say what the game does. Two because the look pass made them untrue, at commit `1c3be14`. Four after the builder's first reader went through the folder, at commit `3db55ae`. Nine after its second reader, which also widened one of the four, at commits `cb1c882`, `7bb8ece` and `78ef55f`, sheet part sha256 `6b78bde2698f2d6f441be6f50cf9e5c9cd21c531975b650ad3b945e7c62db520`: the toy's line about an empty scene, which never arises; five cells of the grid's two creature rows and one taste, which promised a touching the game never draws (nothing in it passes through or presses into anything); the sentence on a game opened again, widened to a game put aside; and two "Limits taken" lines of the records, which now use the pack's own Limits words. All sixteen are listed below, old and new. The claim is unchanged, and so is which record is taken and how far. One changes a rule of the world, on purpose: who leaves at `one-short`, so that the row of the designed order for that position holds every time; the checker is asked to read that row with it.
- Look in use: foam play mats, the first reserved look. The owner said of the set of games "some look too minimal"; the look pass (the last five rows of the pass log) is the answer, and the game is brought into the jam only once its look has his yes. Everything that is not drawing is outside `view/`, so another look replaces only that folder.
- The stills of the look pass can be made again on the production build at `?chrome=0&seed=5#/play/hats-for-all`, 1180 by 820, fresh slot: at rest 7 seconds after opening; the middle of a cycle at 14 seconds, after a tap on the second hat of the tile at 11 and on the third at 13; the funniest moment at 18.2 seconds, after the fourth hat is dragged onto the first creature's head at 16.5.
- Draw calls: 23 in the frame at rest with four creatures on the mat; 25 at the most and 23.3 on average in the busiest stretch, about 54,000 triangles, by the counted test.
- Open: sheet ready for check, round 6

**What the lead should try first**

1. A first visit with a fresh slot: the first showing plays by itself, once (a creature walks to the tile, stamps, and the hat pops onto its own head). Then touch nothing for ten seconds: thin orange rings come up round the hats that can be taken, and the ghost hand presses one.
2. Tap every hat. With a spare hat in the tile the last one comes out with nobody under it and scuttles beside a round spot; tap it and it goes home; leave the crew alone for two seconds and it parades.
3. After the parade a creature of the next crew waits in the arch, ringed. Tap it or the arch.
4. Drag a hat onto a head that has one (the tower slips over its eyes and the creature sways about blind), then a third (the tower of three falls, every time). Pull a creature to another, to the tile, to nowhere.
5. Move a finger about over the mat and watch the eyes. Tap the tree, the ball on the low wall and the brick beside it. Watch the window for half a minute: the cloud drifts and a balloon rises past.
6. Open a crew with one hat too few (the position `one-short`) and give every hat out: the one left bare makes a show of it, once, and then waits.
7. Put the game away in the middle of any scene and open it: nothing replays, and the world is as the scene leaves it.
8. `?seed=<n>` in the address fixes a first visit's crews; `?tier=3` shows the lowest tier; three quick taps in the top right corner show the grown-up overlay.

**What ran on the build machine, and what did not**

- Ran and passed: `npx tsc --noEmit`; `npx vitest run games/hats-for-all test/games.test.ts` (347 tests, about 6 seconds); `npx vitest run`, the whole repository (2176 passed, 1 skipped); `npm run -s wordless:check`; `node scripts/egress-check.ts`; `npm run build`; `npm run egress:built`; `npm run education:built`.
- The intersection audit, `npm run check:intersections -- hats-for-all --ci`: `enforce: true`, eleven moments from saved worlds, 1203 samples, 32 pieces. Passes: 46 findings, then 13, then 1, then none. Five enforced runs in a row came back clean with the same samples, pieces and findings each time (0 open, 0 allowed, 2 under the pixel floor), the first of them while stills were being taken on the same machine, and a sixth with a replay of the second pass's thirteen findings. No contact is allowed: every finding was fixed at its root. A seventh run, on the final build, was clean as well.
- The audit ran with the Chromium already on the machine (141), reached through a private browsers folder outside the repository, because Playwright's own build could not be downloaded here. CI uses Playwright's own.
- Not run on the build machine: any frame rate (it draws in software); any listening (it has no sound); `compound audit` (no file under `docs/solutions/` was touched).
- Frame rates, as the lead measured and reported them: 60 a second in Chrome at six times CPU throttle; 59.6 at twenty times throttle and four times the pixels; 59.9 in WebKit; 18 draw calls. The build, the pixel ratio and whether a physical iPad was measured are the lead's to state.

**What is still weak**

- Nobody has heard the game. Thirty-six voices and twenty tunes of babble are numbers held to ranges; whether "pomf" sounds muffled and "plap" flat is for ears.
- The builder has not seen it move at speed, and the frame rate has not been measured since the playroom went in. The stills say layout, colour and that nothing passes through anything; the weight of a landing and the comedy of the acts are for the lead's and the owner's eyes.
- About a third of the frame at rest is still plain mat, in front of the tile and between the tile and the row. It is kept clear on purpose: it is where a two-year-old's hand comes in, and where loose hats lie.
- A creature that comes or goes by the arch walks behind the row, so for a moment it is half hidden by whoever stands in front of it.
- The show of the one who gets no hat is as big as an act may be here (it jumps, sits down with a bump and goes cross-eyed); it does not fall flat on its back, because a body that rotates puts a foot through the floor.
- The same kind of creature can be in two crews running: it walks off to the left and a moment later walks in from the right.
- The idle rings round neighbouring hats in the tile touch at their sides.
- The two free round spots at the ends of the row may read as places to put something.
- A hat on a round head rests on its very top and stands proud at the sides.

**Requests to the lead**

- The check of the sheet, round 6, on the sixteen sentences listed below.
- A frame rate on a real graphics card with the playroom in the frame, and the owner's eye on the look.
- A listen to the sounds on a real machine.
- The registry row in section 3 of `docs/art-direction.md`: its text is at the end of `ART.md`.
- `scripts/jam-intersections.mjs` (the file, the change, the reason): its cache of prepared pieces is keyed by the geometry's uuid, and the audit seeds `Math.random`, so after a reload a new geometry gets the uuid an older one had and the old triangles are used. A game that cuts a mesh from its saved state is then checked against the wrong mesh (here the hat tile: three false z-fights). Worked around in the game by naming each cut of the tile; the audit would be safer keyed by the positions it was sent.

**The sentences changed since round 5, for round 6**

Line numbers are lines of `ART.md` as it stands at commit `78ef55f`. Everything else above `## The look` is as round 5 read it.

1. The scenes, the sentence that opens them (line 140): round 5's own replacement, pasted as written.
   Old: "No scene plays before an action, and none plays only sometimes for the same cause."
   New: "No scene plays before an action, except the first showing, which plays once when the game is first opened, before the child's first try (pack: game-design, guided-discovery.md), and none plays only sometimes for the same cause."
2. The toy, a tap anywhere else (line 27): the look pass put a playroom round the mat, and three things of it answer a tap.
   Old: "A tap anywhere else is answered too: the foam floor dimples under the finger with a squeak and whatever stands near hops."
   New: "A tap anywhere else is answered too: the foam floor dimples under the finger with a squeak and whatever stands near hops. Three things of the playroom round the mat answer a tap as well, each with a sound no hat and no creature makes, and change nothing: the tree shakes with a rustle and drops a few leaves, the ball on the low wall rolls a little way and back with a low trundle, and the brick beside it hops with a soft "thup"."
3. The characters, the bare creature that waits (line 135): the look pass gave the one who gets no hat a show before it waits.
   Old: "A bare creature that has to wait waits calmly."
   New: "A bare creature that has to wait waits calmly. One thing comes first, each time every hat is on a head, one each, and a head is still bare: the bare one makes a show of it, once. It looks into the empty holes and at the hats on the others, throws up its hands, jumps, sits down with a bump and goes cross-eyed, with a questioning babble; then it waits calmly. The show is about the hats and never about the child."
4. The error as a consequence, one hat too many (line 71): a tapped hat flies straight to its place, and only a hat that is carried skids; a loose hat circles in front of the row, clear of the lane the creatures walk along, and touches no feet.
   Old: "it lands on the floor, skids to the nearest round spot that has no loose hat beside it and scuttles in a small circle beside it, slowly enough for a two-year-old's tap, bumping the feet there, and every creature turns to watch it."
   New: "it lands on the floor beside the nearest round spot that has no loose hat beside it and scuttles in a small circle there, slowly enough for a two-year-old's tap, and every creature turns to watch it."
5. A cycle, what "left alone" means (line 81): one sentence added after "it shows nothing and hurries nobody." The game used to start a held change or a first parade two seconds after it was opened again, or looked at again after resting; it now waits for the child.
   New: "When the game is opened again, or looked at again after it was put aside, nothing comes by itself: a change or a parade that was held waits until the child has touched a hat or a creature, and comes when the crew has been left alone after that."
6. What is stored, the row for `leaver` (line 115).
   Old: "| `leaver` | Which creature of the crew will leave, when a `leave` is still held. |"
   New: "| `leaver` | Which creature of the crew is to leave, when a `leave` is still held. |"
7. The scenes, one leaves (line 145): at `one-short` the creature drawn to leave could be the one the child had left bare; it then walked out with no hat, no hat came free and no head waited, against the row for that position. The rule is now that a hat always comes free.
   Old: "If it stood bare it shrugs and walks out."
   New: "If the one who was to leave stands bare when the change comes, the hatted creature nearest to it leaves in its place, so a hat always comes free."
8. The toy (line 23): no crew has fewer than two creatures, so there is never an empty scene; what the line described happens when no head is bare.
   Old: "In an empty scene, with no creature at all, the hat pops out, flips and lands on the mat beside the tile, wobbling like a dropped bowl, and the next touch sends it back into its hole."
   New: "With no bare head to land on, the hat pops out, flips and lands on the mat beside a round spot, rocking like a dropped bowl as it scuttles there, and the next tap sends it back into its hole."
9. The grid, bare creature, drag to a bare head (line 39): a creature stays on its spot, and nothing in the game touches anything; the two now move towards each other, from either side.
   Old: "The two bump bellies, boing apart and both pat their heads."
   New: "The two bounce towards each other belly first, as near as their spots let them, boing apart and both pat their heads."
10. The grid, bare creature, drag to a hatted head (line 39).
   Old: "It peeks up under the other one's hat with a questioning hum; that one lifts it like a lid."
   New: "It leans over towards the other one and peeks up at its hat with a questioning hum; that one lifts it like a lid."
11. The grid, bare creature, drag to the hat tile (line 39).
   Old: "It leans over a hole and babbles into it; the hole echoes."
   New: "It bends down, looks at the tile and babbles at the holes; a hole echoes."
12. The grid, hatted creature, drag to a hatted head (line 40).
   Old: "The two knock hats together with a hollow "tok" and both wobble."
   New: "The two lean their hats towards each other, as near as their spots let them, with a hollow "tok", and both wobble."
13. The grid, hatted creature, drag to the hat tile (line 40).
   Old: "Tips its hat over the tile and shakes it with a floppy "flap-flap": nothing falls out, it shrugs."
   New: "Steps towards the tile, lifts its hat, tips it over and shakes it with a floppy "flap-flap": nothing falls out, it shrugs."
14. The characters, Wig and the cone (line 130): a hat cannot sink into a head here.
   Old: "the cone: it sinks point first into Wig's soft top, and Wig pops it back up with a belly bounce and a grumble"
   New: "the cone: it slides down over Wig's face, and Wig pops it back up with a belly bounce and a grumble"
15. The records, `us-ca` 1.6, Limits taken (line 164): the pack's own Limits words in place of the builder's.
   Old: "the Early statement, where the groups are plainly equal or plainly unequal and counting is optional."
   New: "the Early statement, where the groups are clearly equal or clearly different and counting is optional."
16. The records, `us-ca` 2.1, Limits taken (line 166): the same.
   Old: "from the Later statement, that one thing in or out changes a small group by exactly one."
   New: "from the Later statement, that the change is exactly one, for adding or removing a single object, in a small group."

Sentence 5 was changed twice and is listed once, as it now stands.

What the look pass added that no sentence of the sheet speaks of, and that changes none: the playroom itself (blocks, a window board with hills, a sun, a drifting cloud and a balloon that rises past, a tree, a string of beads on the wall); brows, cheeks and a mouth that bends on each creature, with eyes that follow the finger; crumbs of foam where a hat lands; one who leaves stops in the arch and looks back; and the way to and from the arch, which now runs behind the row. A bare creature's face is calm, with its brows up: no face in the game is sad.

**The reader**

The folder was read against the sheet by readers who had not seen the build, as `docs/build/runs/reader.md` asks. The first report was NOT READY (rule 1: 2, rule 2: 1, rule 6: 11), the second NOT READY (rule 1: 2, rule 6: 8) and the third NOT READY (rule 6: 4, rules 1 to 5 clean); what each found and what was done are the rows "Reader 1", "Reader 2" and "Reader 3" of the pass log. One thing is answered here and not changed:

- Rule 6, the grown-up overlay. It opens on three taps of one finger within 700 milliseconds in the top right 72 pixel square, or with `fps=1` in the address (`overlay.ts:40`, and `hats-for-all.tsx`, where only the first finger down is counted). Nothing is drawn in that corner, and a touch there is answered as the bare floor is, with a squeak and a dimple, and moves nothing. A child who taps that corner three times fast still opens the overlay, and three more taps close it; it is the template's overlay and the lead's to change.

The reader's last report follows here once a reading ends READY.

**Findings not yet fixed**

- None from the audit. From the cold playtest proxy, see "What is still weak".

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

- `hats-for-all.tsx` (the Mount): changed where its comments say to, and as the pilot notes say. The game is made when the slot has been read; `draw` has a case with no game (the bare mat); sounds are played inside the gesture handler and after the step; a scene playing touches the ladder; the ladder's result is kept in a variable for `draw`; `?seed=<n>` fixes a first visit. **For the template**: a threshold between a smeared tap and a drag belongs in the Mount or in `input.ts` for a band that starts below 4 (here 44 pixels): `TAP_SLOP` alone turns a toddler's tap into a drag of nothing.
- `config.ts`: tuned as meant. `Tier` has `stipple`; `LADDER` holds the eight ids; `FIRST_VISIT` has a row for each age of the band.
- `state.ts`: as copied. `save.ts` wraps it as the file asks. **For the template**: the wrapper repeats the test for "a record of this version"; an exported helper would keep the two reads from drifting apart.
- `scene.ts`: as copied. Each scene is a few cues and one last beat that settles the theatre; the walking and flying between cues are chains in `play.ts`, which `settle` runs to their ends, so a finished scene leaves the stage as the save has it. **For the template**: `Scene` has no way to ask how long it has run or to hold a chain; a game whose beats are "walk there, then do that" builds its own, as here.
- `audio.ts`: as copied, with the template's later fix taken from the base branch in the closing run: fingers on the glass are counted, so a second finger or a palm lifting inside a touch does not end the wait the first finger started. `sound.ts` turns a voice written as numbers into its `tone` and `noise`.
- `guidance.ts`: as copied; `handPose` and the ladder drive the rings and the ghost hand. What they show is in `guide.ts`.
- `input.ts`, `overlay.ts`: as copied. The Mount reads `CORNER` from `overlay.ts` to keep the grown-up's corner bare.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen and untouched.
- three.js: `ExtrudeGeometry` with a negative `bevelOffset` breaks on an outline with sharp teeth or a sharp point (the inner edge crosses itself): cut the top face inside the outline yourself and bevel outwards. A body that leans by rotating about its feet puts a foot through the floor: lean by a shear.
- The machine: Node 24 from `nvm` under `/opt/nvm`. Playwright drove the Chromium already on the machine; for stills by its path, and for the audit through a folder of links named as Playwright expects, kept outside the repository. In software a frame at a pixel ratio of 2 takes about half a second.

### For the owner to decide

- The look, foam play mats: he found the set of games too bare, and this game was filled in the look pass. Whether it now has his yes.
- Speech. The game speaks no number word, by the guide's default. With a number word heard on each hat as it is given, the game could also be designed from the records on number words, and a two-year-old in California would then have a record under the game; as it stands that child has none.
- Whether the cycle's change and the parade may come by themselves. They come two seconds after the crew is left alone, as the consequence of the child's last move. If he wants them to wait for a touch, the scenes change.
- Whether this band needs a harder option laid beside an easier one for the child to pick. The sheet offers none and says what the child can choose in its place.
- Whether three kinds of hat are plain enough for working pieces. Each is one flat colour and one simple outline; the kinds exist so that the creatures can have tastes.
- Whether the first showing may play by itself on a first visit. It is the one scene that no touch causes; it plays once ever.

## Pass log

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| Spike 1 | The first still of the scene, software, 1180 by 820, pixel ratio 1 | Half the floor was missing and a stray triangle crossed it; the hats and the creatures already read. | The jigsaw tiles' bevel is cut outside the outline; the mat widened to fill the view. | Not measured (software) | The top third is empty wall; the shadows are faint. |
| Spike 2 | Stills after four taps and a poke in the floor, pixel ratios 1 and 2; the lowest tier | A hat on a head, in its hole and loose on the floor cannot be confused. At ratio 2 the stipple and the bevels show. Bare creatures did nothing to show they want a hat. | The camera moved in and down; a bare creature pats its head now and then; darker shadows; one step of bevel on the floor. | Not measured (software) | The wall above the row is kept empty on purpose, as room for a tower of hats. |
| Round spots | A still after four taps | The sheet has the creatures stand on round spots; the scene drew none. | Five lighter discs inlaid flush in the mat. | Not measured (software) | The two empty spots at the ends may read as places to put something. |
| Game 1 | A whole first cycle on the dev server: the first showing, the hand, the parade, the next crew | "The orange light is on the hats and the red one goes orange. The hand is under the hat, not on it. There are two purple ones." | The glow became a ring round a thing; the hand's finger sits on its target; a creature not already on the mat waits in the arch. | Not measured (software) | The rings were wide and ran together. |
| Audit 1 | The intersection audit's first run: 46 findings | Hats sank into heads and the floor, leaning bodies put a foot through the mat, ears and hands were inside bodies, a flying hat's tip dived into the tile. | A body leans by a shear; a hat rests on the head and is lifted by as much as a tipped corner dips; flights lie down or stand up in the high middle of their way and come over a hole before going in; ears and hands lie in front of the body; a creature's parts share no plane; the moments find their meshes. | Not measured | 13 findings. |
| Audit 2 | The second run: 13 findings | A pressed hat sank into the mat; a tower's hats crossed; Flop's ear brushed the arch; three z-fights were the audit taking one tile for another. | A pressed hat gets thinner and keeps its underside on the mat; a tower's hats stand square; ears swing less; each cut of the tile carries its own name. | Not measured | 1 finding. |
| Audit 3 | The third run: 1 finding | A hat carried to the top of a tower rose through the hat below it. | A hat on its way to a head is as high as the head before it comes in over it; a falling tower's hats leave from the top down. | Not measured | None: five enforced runs clean, and one with a replay. |
| Cold 1 | The cold playtest proxy on the production build, fresh slot, the shell's default age: ten seconds hands off, then a newcomer's minute, two dozen stills | "All the hats are in one long orange stripe. Which one do I press? The yellow hat has orange on it. When they walk round they are all in a heap by the door." Unclear moments: 4 (the stripe, the tint, the heap at the turn, the same creature leaving left and coming in right). | A thin ring that hugs each thing and stops short of the next; the parade's line opens out. | Not measured (software): 19 draw calls, about 36,000 triangles | The rings touched the hats' near edges. |
| Cold 2 | The same stills again, same seed | "Each hat has its own ring now. The ring cuts the bottom of the blue hat." Unclear moments: 2 (the ring on the near edge; the same creature twice running). | A little more room inside each ring; the grown-up's corner answers nothing; a touch on the wall presses the mat's far edge. | Not measured (software) | The same creature in two crews running. |
| Cold 3 | The same stills a third time, same seed | "The hand shows me the blue hat. They walk in a line now." Unclear moments: 1 (the same creature in two crews running). | None: the list is as short as this run gets it. | Not measured (software) | See "What is still weak". |
| Look, before | Three stills on the production build, seed 5, as the owner saw the game. At rest: about seven tenths of the frame is bare cream wall and bare teal mat, each creature is about a ninth of the frame's height, nothing in it is funny, and what is alive is breathing, two dots of eyes and a pat on a bare head. The middle of a cycle: as empty; three hats on three heads, and only Flop's ears say anything. The funniest moment: a tower slipped over Bop's eyes, the right joke, small in the far left of an empty room. | "It is a green floor and a wall. They are little. Nothing is there but them." | The three look passes below. | Not measured (software): 18 draw calls | Everything the owner said. |
| Look 1 | Stills at rest, in the middle of a cycle and at the tower | "There is a room now, with blocks and a window and a tree. They are big. They have eyebrows. The wall up top is still plain, and their mouths are only dots." | The camera stands nearer and the arch behind the row, so each creature is about half as big again. A playroom of foam in pale tints: a low wall of soft blocks, a window board with hills and a sun, a tree; the cloud in the window drifts. Each creature gets brows, cheeks and a mouth, its eyes follow the finger, and its face shows what it makes of its hat. A tower's wearer sways about blind and gropes. | Not measured (software): 23 draw calls, about 46,600 triangles at rest | The top of the wall; the mouths; nothing in the room answered a touch yet in a way that left anything behind. |
| Look 2 | Stills of a hat landing, the tree shaken, the hat with legs, and the crew with one hat too few | "The pink one smiles when it gets the blue hat. Bits fly off when the hat lands. Leaves come down from the tree. The green one with no hat only put its hands up." | A mouth in two halves that bends up or down, and a round one when it babbles; a string of beads along the top of the wall; crumbs of the hat's own foam where it lands, and leaves from the tree, which lie a moment; the ball loses a band that read as a sign and gets two soft patches; the show of the one who gets no hat goes further (it jumps, sits down with a bump and goes cross-eyed). | Not measured (software): 23 draw calls, about 50,900 triangles at rest | Nothing passes the window; the audit had not seen the new frame. |
| Look 3 | The audit on the new frame (6 findings), and stills of one who leaves | The audit: whoever came or went by the nearer arch walked through the creature on the last spot; the cloud ran into the window board; an ear swung in over an eye that now stands prouder; Flop's ear met the arch when it was pressed in it; the blocks stood on the mat's teeth. And by eye: a bare creature's brows read as sad, which the sheet does not allow. | The arch a little to the right of the last spot; comers and goers walk behind the row and step onto their spots from the back; whoever waits in the arch stands a little forward in it; one who leaves stops in the arch and looks back, so that scene keeps its length from every spot; each thing in the window in a layer of its own, the cloud inside the pane, and a balloon that rises past now and then; an ear never swings in across the face; the blocks further back; a bare face calm with its brows up. The ball and the brick get voices of their own. | Not measured (software): 25 draw calls at the most, about 54,000 triangles, by the counted test | Audit clean: 0 open, 0 allowed, 0 hidden, fourteen moments. |
| Reader 1 | The builder's own reader, who had not seen the session, read the folder against the sheet: NOT READY, with eleven promises unkept and none of them in the builder's lists. | Seen in the sheet and only heard in the game: the tile dimpling round a pressed hat; a loose hat landing sideways on a hat and righting itself; the long creak; the hat under a tower's top spinning once; the tower tipped; the shrug. A loose hat on a bare head got the same duck from everyone. At `one-short` the bare one could be the one to leave. With an odd number of hats the middle hat lay straight under the middle head. Going to rest in the middle of a drag dropped the hat where the finger was, and in the middle of a smeared press made a tap. A game opened again started its held change by itself. A touch that ended a scene sounded the rest of its voices at once. Three fingers together could open the grown-up overlay, and a bead was drawn in its corner. | Each of the six is now drawn, by test. After the duck comes that creature's own reaction to that hat. The one who leaves wears a hat whenever anyone does. The tile lies to one side by as much as keeps every hole clear of every head's place. A touch in progress when the game rests is put down with no move. A game opened again waits for a touch on a hat or a creature, and the idle ladder then shows the crew. The voices of skipped beats are dropped. One finger counts for the overlay, and the beads stop short of its corner. One sentence was changed and not built: a loose hat does not bump feet. | Not measured (software) | See the reader's last report in the status block. |
| Reader 2 | A second reader, on the folder after the first one's fixes: NOT READY, eight promises unkept and none in the builder's lists. | A game that rested, as against one opened again, still started its held change by itself. What one creature does to another was played on its own spot with no direction, and the meeting was only heard. A drag did not count when partly done. A hat grabbed again in the air lost its landing, so the third hat did not always topple the tower and the stage could differ from the save. Wig's cone did not sink point first, and Pip ran from side to side and not in a circle. The leader of the first showing never looked at the others. The toy spoke of an empty scene that never arises. A finger that landed on a hat of the old tile while the next crew walked in threw. | Resting resets the wait as opening does. An act for another creature is turned to face it and held just short of touching, by test from both sides. A drag let go over the open floor more than half way to a creature is finished to it. A hat taken or sent on in the air has landed first. Pip runs a real circle. The leader looks at the others and then at the hats. A scene ends before the finger is placed, and a target that has gone is the floor. Changed in the sheet and not built: the empty scene, the bellies and hats that touch, the cone that sinks. | Not measured (software) | See the reader's last report in the status block. |
| Reader 3 | A third reader, on the folder after the second one's fixes: NOT READY on rule 6 alone, four things. | The drag that counts when partly done counted far too readily: let go to the side of a head, below it or past it, a hat still went to a head, so "let go anywhere else" could hardly be reached, and the audit's own drags to the floor ended on heads. A smeared tap was answered a third of a second after the lift. The sheet had a tapped spare hat skid, and it flies. The grown-up's corner answered nothing. And a drag whose finger had lifted just before the game rested was undone. | A part-done drag counts only when it was plainly going to that creature: at least half way along the straight line and close to it, by test. A smeared tap is answered at the lift. A lifted drag is finished as the child left it. The corner answers as the floor does. The sheet's sentence on the spare hat says it lands beside its round spot. | Not measured (software) | See the reader's last report in the status block. |
| Look, after | The same three stills, production build, seed 5. At rest: no bare wall is left; the top tenth is wall with the string of beads, then the blocks, the window, the tree and the arch; about a third of the frame is plain mat, in front of the tile and between the tile and the row; each creature is about a sixth of the frame's height; funny at rest is little (Lanky with both hands on its bare head, brows up); alive are breathing, eyes that follow a finger, pats, the crown swaying, the cloud, the balloon. The middle of a cycle: three faces that differ (Flop smiling under the hat it loves, Bop plain, Lanky bare and waiting), a room behind them. The funniest moment: Bop under a tower of two, blind, leaning right over with crumbs on the mat round it, and Flop grinning beside it; it reads from across a room. | "They are big and they look at my finger. The orange one cannot see and it is falling over. There is a balloon." | None. | Not measured (software): 23 draw calls at rest | See "What is still weak"; what the builder would still add is in the report of the run. |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

The builder's machine draws in software and measured no frame rate. Before the look pass the lead measured on a real graphics card and reported: 60 a second in Chrome at six times CPU throttle, 59.6 at twenty times throttle and four times the pixels, 59.9 in WebKit, 18 draw calls. The build, the pixel ratio and whether a physical iPad was measured are the lead's to state. Since then the playroom has added five draws and about 15,000 triangles, all of them built once; the frame rate is to be measured again.

- **Alive at idle.** Each creature breathes at its own tempo, sways, blinks at moments of its own, looks at the hats while bare and up at its hat when it has one, follows a finger with its eyes, and a bare one pats its head now and then. A loose hat scuttles in a small circle. In the room the tree's crown sways, the cloud in the window drifts and a balloon rises past now and then. All of it runs on the attended clock and stops when the game rests.
- **Motion and sound on every touch.** A hat, a creature, the arch, the bare floor and the three things of the room that look touchable (the tree, the ball, the brick) each answer when the finger lands, and each of the grid's thirty cells has its own motion and its own sequence of sounds, by test (`game.test.ts`). Sound is synthesized from numbers in `voices.ts`.
- **Weight, squash, and follow-through.** A hat squashes under the finger, turns over in the air and squashes on landing; what it lands on squashes and springs back with that creature's own spring; crumbs of the hat's foam fly and lie a moment; a body leans as foam does, feet planted.
- **Kid-clear.** At most five creatures and five hats, each with its own outline and colour, on a floor of a hue no piece uses; the hats lie on the lightest, plainest surface; the hats themselves stay plain; the room is in pale tints, lower in contrast than anything that is worked with.
- **Wordless clarity for the declared age.** No word, letter, numeral or symbol on the kid side; `npm run wordless:check` passes. Everything essential is a tap; a drag is an extra, and a smeared tap still counts as a tap. One want in every scene: bare heads look at the hats and pat themselves; after the parade one creature waits in the arch.
- **Wordless guidance.** The idle ladder is whole: a thin ring round each thing that can be touched now, then the ghost hand presses one of them once (`guide.ts`), and it shows nothing while there is nothing to do but wait. A cold playtest proxy was run three times on the production build.
- **60 fps on a mid-range iPad.** Measured by the lead (above). Built for it: pixel ratio capped at 2, 25 draw calls at the most and about 54,000 triangles in the busiest stretch by a counted test (`frameBudget.test.ts`); the room is five of those draws, no shadow map, no post pass, geometry built once, the loop paused when unattended, four tiers, the grown-up overlay.
- **Nothing passes through anything.** The intersection audit is enforced with no allowance, on fourteen moments that start from saved worlds and reach every creature under every hat, towers, loose hats, a carried hat, pulled creatures, each scene, a touch in the middle of each, and the room touched. Model tests hold what it cannot see between samples: no walker meets a stander, the tile, the arch or a loose hat in any scene of any position.
- **Procedural or committed assets only.** Everything is built in code: no texture file, no font, no clip.
- **Its own art direction.** Foam play mats; the art guide is the part of `ART.md` under "The look".

### The learning claim

As the sheet has it, which passed round 4 of its check (checker F, sheet part sha256 `3c3a4654…317e3b`) and whose records part and claim are unchanged since (round 5 read ten details and found one sentence to mend; round 6 is asked to read sixteen): Hats for All is designed from three California preschool and transitional kindergarten learning foundations, which are foundations published by a state department and not standards (two of them in part), and from four records of guidance by the Dutch curriculum institute, which is guidance and not law (two of them in part). The pairing of one with one is taken from the Dutch record alone. Every record named was `confirmed` when each of the five checkers read the lookup on 2026-10-03; the states are to be read again on the day of the pull request. For a two-year-old in California the game rests on no record. Nothing here says what a child has reached. The records are named by pack id in `ART.md`, "The records", with what is taken and not taken of each.

### Defaults taken for the owner

- No symbol of any kind: the band starts below 6.
- No speech: every creature's voice is invented and synthesized, and no number word is spoken.
- No camera shake and no pause on impact: the answer to a touch is carried by chains of consequence, sound and squash.
- The look is the first row reserved for the game; no other row was spiked. After the owner found the set too bare the look was filled, not changed.
- No second character watches from the edge of the room: a head that can never have a hat would blur the one idea of the game. The room's passer-by is a balloon outside the window.
- The front of the mat is kept bare: no toy lies in the corners nearest the child's hand.
- From the sheet: sets of five or fewer; three kinds of hat; the cycle's change and the parade come by themselves once the crew has been left alone for two seconds; no harder option laid beside an easier one; the first showing plays by itself once.

### What the next builder should know

- Write every sound as numbers with a range test before wiring it: the test caught a voice below its lowest pitch on a machine that cannot hear.
- Keep the stage as a pure "theatre" of numbers that the game tells what happened and the view only draws. The game, its thirty cells and its scenes are then tested with no renderer, and the scene graph can be built in a test to count a frame's draws.
- Write the grid as data and play every cell through the game in a test that compares what was seen and heard with the grid. When the sheet's check asked three times for sounds in the cells, the test said which cells were still the same.
- Give the rules and the view the same pure geometry, lanes included, and test the lanes: who walks where, and that no walker meets a stander. It found two walkers entering on the same spot before the audit ran.
- Start every audit moment from a saved world. A drag in an audit moment needs the mesh found by name; a pattern that ends in `$` misses, because the label carries a colour after the name.
- A fixed seed in the address is what lets a still be taken again.
- When the camera or a piece of furniture moves, run the audit before anything else: the nearer arch sent every comer through whoever stood on the last spot, and the model test had no crew that stood there.
- Draw small things that come and go (crumbs, leaves, a balloon) with an instanced mesh the frame already has: they cost no draw.
