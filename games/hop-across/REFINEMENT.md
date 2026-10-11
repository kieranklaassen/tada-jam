<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates
- Sheet: round 1 read by checker-1, nine findings, each replacement pasted word for word. Round 2 checked by the lead: the seven replacements listed under "Reading 1" pass as written and are pasted word for word, with nothing else changed above `## The look`. The hash is the lead's to record at the commit. The game is built on the sheet as it now stands. Round 3: two more replacements after reading 2 (the lorry bed, the car driver), checked and pasted by the lead. Round 4: one replacement after reading 3 (the shoved lorry's count in the saved-state table), checked and pasted by the lead. Round 5: three replacements after reading 4 (the duck's first waddle, the roads of `cars`, the count a tip saves), checked and pasted by the lead.
- Look in use: Folding game board and pawns, the first reserved look, kept by the lead. The second (tufted play rug) was not tried. The first frame was called too bare and was filled out in the same look (pass 1).
- Open: a frame rate on the target; the registry row. The four readings are done and there is no fifth.
- Reader: reading 1 by the lead's reader came back NOT READY (rule 5: 1, rule 6: 11, plus 3 this file listed). All are answered in "Reading 1" below: the dice are gone, nine promises are built, and seven sentences of the sheet were proposed, checked by the lead in round 2 and pasted. This builder cannot start a subagent, so it reads nothing as a new reader.
- Reader, reading 2: a new reader held everything from reading 1 and found rule 5: 2 and rule 6: 7. The lead's rulings on rule 5, so that a later reader finds them answered: the beads on the bell wire are gone, and the wire is a plain cord with one knot at the plate and nothing spaced along it. The bell plate and the ripple print stay as rings, since a plate and a ripple are things and not numerals; the plate has its bell standing in the middle so it is never an empty ring, and the ripple is drawn as broken arcs. The sleeping train's face is a face: two shut lids, a nose and a mouth, with no pale bar across the disc, and the running train's shut eyes are lids too. The zebra bars, the cat's stripes, the sleeper bars on a pressed pawn and the crayons stay. Rule 6: findings 1, 2, 3, 5 and 7 are built, the cab landing of finding 4 slides and squeals, and the sentences of 4 and 6 were proposed to the lead, who checked them and pasted them in round 3. The builder then read the sheet part once as a reader does; what that found is under "Reading 2".
- Try first: tap anywhere once and let the duck walk into the car (a first visit now waits for that touch, so the duck is heard). Tap the square to her right three times. Stand in front of a car and tap her own square to watch the pancake peel. Tap the small one behind her for the leapfrog. Press the cat, the duck, the hamper, the old rabbit and the heads at the rim. Hop all four onto the gingham for the picnic, then hop her off the cloth to the right with a small one left behind, for the tip and the slide. The age control of the grown-up strip set to 6 opens a first visit on logs, 8 on the bell and train.
- Stills: in the scratch folder `wave-scratch/hop-across/` beside the worktree, all 1180 by 820 at pixel ratio 2, with `?chrome=0`. The passes: `pass1-before.png` and `pass1-after.png`; `pass2-after.png`; `pass3-before.png` and `pass3-after.png`. The states: `g-rest.png` at rest, `g-hop3.png` a pancake under a car, `l-0.png` logs, `u-0.png` and `u-2.png` turtles up and awash, `b-0.png`, `b-2.png` and `b-4.png` the bell plate and the train, `dl-3.png` the duck's showing, `p-2.png` and `p-5.png` the picnic, `t-3.png` and `t-7.png` the tip, `p-8.png` and `p-10.png` the slide, `idle-3.png` the glow and the hand. The cold playtest on the production build: `c-00.png` to `c-26.png`. After reading 1, from the dev server: `q-open.png` a first visit waiting for the first touch, `q-duck.png` the showing started by it, `q-pokes.png` the teddy, the robot, the doll, the hamper, the old rabbit and the duck answering a touch, `q-leap.png` the leapfrog in two moments, `q-train.png` the wind of the train on three pairs of ears, `q-yawn-c.png` the yawn. After reading 2, from the dev server: `r5-bell.png` and `r5-bell2.png` the cord with its knot, the plate with its bell, the broken ripple and the train's sleeping face; `r6-t3.png` the fish with her in its mouth beside a log. After reading 4: `r4-dust.png` the ear that dusts, drawn alone. `seq.mjs` beside them replays a list of taps and takes stills.
- Draw calls: counted as the frame-budget test counts them (`frame.test.ts`): one for each stamp of the still picture and one for each figure drawn over it. One stamp at rest and in a slide, four bands in the tip, and at most 39 figures (451 paths) over a walk of every position and through every scene. A touched onlooker or the opened hamper is one figure more and is not in the test's walk. So at most about 44 a frame, against a budget of about 80, with one full-surface composite and no post pass.
- Frame rate: none measured. This machine renders in software.
- Sounds: every event has a voice (`voices.test.ts` meets every event type on a long walk of every position). Nobody has listened to them.
- Reader, reading 3: clean on rules 1 to 5, and four promises on rule 6, all built; they are under "Reading 3".
- Reader, reading 4, the last: clean on rules 1 to 5, and seven promises on rule 6 (one a child would notice, six slight). Five are built and two are sheet sentences proposed to the lead; they are under "Reading 4". Rule 5, seen and left: the weaker lookalikes the reader listed (the spectacles as two joined rings, the six spots round one on the turtle's shell, the robot's aerial and the giraffe's horns as a stick with a dot, the rails over sleepers, the two cords meeting, the four hook dots on the burrow, and the glow, splash and press rings) are parts of things and stand for no letter, numeral or count; none is changed.
- Checks after reading 4: on a machine under a load average of 21: `npx vitest run games/hop-across test/games.test.ts`: "Test Files  29 passed (29)", "Tests  449 passed (449)", "Duration  99.10s" (313 of the tests are this game's, in 28 files). `npx tsc --noEmit` exit 0 with no output. `node scripts/wordless-check.ts`: "wordless check passed". `node scripts/egress-check.ts`: "egress check passed". No build.
- Checks after reading 3, on a machine under a load average of 19: `npx tsc --noEmit` exit 0 with no output. `npx vitest run games/hop-across`: "Test Files  28 passed (28)", "Tests  303 passed (303)", "Duration  59.92s". `npx vitest run test/games.test.ts`: "Test Files  1 passed (1)", "Tests  136 passed (136)". `node scripts/wordless-check.ts`: "wordless check passed". `node scripts/egress-check.ts`: "egress check passed". No build.
- Checks after reading 2: `npx tsc --noEmit` exit 0 with no output. `npx vitest run games/hop-across`: "Test Files  25 passed (25)", "Tests  290 passed (290)", "Duration  25.72s". `npx vitest run test/games.test.ts`: "Test Files  1 passed (1)", "Tests  136 passed (136)". `node scripts/wordless-check.ts`: "wordless check passed". `node scripts/egress-check.ts`: "egress check passed". No build.
- Checks after reading 1, on a machine under a load average of 15: `npx tsc --noEmit` exit 0 with no output. `npx vitest run games/hop-across`: "Test Files  25 passed (25)", "Tests  279 passed (279)", "Duration  51.10s" on the last run, under heavier load (27.69s for 276 tests an hour before). `npx vitest run test/games.test.ts`: "Test Files  1 passed (1)", "Tests  136 passed (136)". `node scripts/wordless-check.ts`: "wordless check passed". `node scripts/egress-check.ts`: "egress check passed". No build was made in this run; the one of Run 2 (`npx vite build`, "built in 10.50s") is from before these changes. Not run, by the wave's rules: `npm run check`, `npm run build`, `egress:built`, `education:built`, `perf:jam`.

Requests to the lead:

1. The registry row at the end of `ART.md`, and the menu row marked claimed after the merge.
2. The commit, and the sheet's hash.
3. A second reading.
4. A frame rate on the target: a production build through the shared probe in WebKit and throttled Chrome.

### Reading 1

Rule 5 (shapes):

- The dice are gone. In their place lie a spinning top, a ball and a little wooden car with no pips or marks (`ends.ts`, `scenery.ts`: the near end `toys`).
- A tyre skid is one curved smear, no pair of upright bars (`backdrop.ts`, the print `skid`).
- The manhole's bars, the paw prints, the wave curls and the old rabbit's whiskers stay, by the lead's ruling.

Rule 6, built so that the code does what the sheet says:

| Finding | Built | Where, and the test |
| --- | --- | --- |
| 1. The bell, each a note higher | The ring's note follows the ringer's place in the line: the rabbit lowest, each small one a note higher. | `board.ts` (`bell`, `nth`), `voices.ts` (`bellNotes`); `board.test.ts` "each ring a note higher down the line", `voices.test.ts` "rings the bell a note higher" |
| 2. Leapfrog, ducks with a squeak | The small one ducks to half its height with a falling squeak of its own and scurries under her along the ground; she vaults over twice as high as a hop. This also makes a hop back onto the small one behind look like a move. | `motion.ts` (`vault`, `scurry`), `view.ts`, `voices.ts` (`duckNotes`); `motion.test.ts` "a leapfrog", `view.test.ts` "shows a hop back", `voices.test.ts` "has a small one duck" |
| 3. On a log she windmills her ears | Two whole turns, one ear each way, from the moment she lands on a log. | `motion.ts` (`windmill`), `view.ts` (`millAt`), `paint.ts`, `figures.ts`; `motion.test.ts`, `view.test.ts` "starts her ears windmilling" |
| 4. The train's wind lays her ears flat | Drawn: the ears of everyone a lane or two from the rails are laid over, away from the train, as it passes. | `motion.ts` (`blown`), `view.ts` (`wind`), `paint.ts`; the same two tests; still `q-train.png` |
| 5. Wet and tyre-marked for a few hops | Counted in hops of the line (three), never in seconds; the picnic reads the same count. | `motion.ts` (`MARK_HOPS`), `view.ts`; `view.test.ts` "keeps her wet for a few hops", "keeps her tyre track" |
| 6. The burrow | A hop at the burrow is a thunk as at the rim, and nobody chuckles. A hop at the old rabbit asleep on the home cloth rings that one's tummy, not the far one's. | `board.ts` (the reason `burrow`), `voices.ts`, `view.ts`, `paint.ts`; `board.test.ts` "at the rim and onto a seat", `view.test.ts` "rings the tummy" |
| 7. A touch that cuts the tip or the slide | It is an ordinary hop. The slide has then ended, so a showing that is owed starts and the same touch ends it, with its lane where the save has it. | `play.ts` (`answerTouch`), which the Mount asks at every press; `play.test.ts` "a touch and the showing that is owed" |
| 8. The first-visit showing was silent | It starts with the child's first touch, so it sounds; that touch makes no hop. Nothing plays by itself on a load. | `hop-across.tsx` (the load); stills `q-open.png`, `q-duck.png` |
| 9. A flat small one in her way | It is a leapfrog too: she lands where it lay (on the roof of the car that is on it) and it shoots out from under to the square she left and is up again. The bounce off it is gone. Under a lorry it stays and she rides the bed above it, as before. | `board.ts`; `board.test.ts` "leapfrogs a small one that lies flat under it", "leapfrogs a small one the train has pressed flat" |
| Listed: the train's yawn | Drawn: its mouth opens wide in the mouth of the tunnel and shuts. | `motion.ts` (`yawn`), `figures.ts` (`trainFace`); `motion.test.ts` "yawns once" |

From this file's own weak list, by the lead's word:

- A tap on the duck, the hamper, an old rabbit or an onlooker is answered by that character as itself, with its own move and its own voice, and makes no hop and no step (`bystanders.ts`, `view.ts` `poke`, `voices.ts` `bystanderNotes`; `bystanders.test.ts`, `view.test.ts`, `voices.test.ts`). The old rabbit keeps its tummy: when she stands next to its seat, a tap on it is a hop at it.
- The board walk in `board.test.ts` is back at 120 hops a layout.

The seven sheet sentences of round 2, kept as the record: each as it stood and as it was proposed. The lead checked them and they are pasted in `ART.md` word for word.

1. Finding 8, under "The duck goes first", Cause. As it stands: "The showing starts when the slide ends, or on a first visit when the game opens. If the game is put away before it has started, nothing plays on load and the showing is still owed: it starts at the child's first touch, and that touch makes no hop." Proposed: "The showing starts when the slide ends. Nothing plays by itself on a load, on a first visit too: a showing that is owed starts at the child's first touch, where its sound can begin, and that touch makes no hop."
2. Finding 10, under "The scenes". As it stands: "**The tip** (4 to 5 seconds)." Proposed: "**The tip** (3 to 4 seconds)."
3. Finding 11 and the bystanders, under "The toy". As it stands: "A tap on the cat is answered by the cat alone and makes no hop and no step." Proposed: "A tap on the cat is answered by the cat alone and makes no hop and no step, and so is a tap on the duck at its post, on the hamper, on an old rabbit she does not stand next to, or on a toy that looks on from the rim: each answers as itself. A press in the top right corner is the grown-up's and is answered by nothing."
4. Finding 6 and the bystanders, under "The board". As it stands: "Onto the old rabbit's seat, she bounces off its tummy with a boing and it chuckles." Proposed: "Onto the seat of an old rabbit from a square next to it, she bounces off its tummy with a boing and it chuckles. Onto the burrow, as at the rim, she hops on the spot with a thunk."
5. Finding 9, under "The board". As it stands: "Onto a square where a small one stands she leapfrogs: the small one ducks with a squeak and hops to the square she left, so the family can never box her in." Proposed: "Onto a square where a small one stands or lies flat she leapfrogs: the small one ducks with a squeak and goes under her to the square she left, where a flat one is up again, so the family can never box her in. Only a small one flat under a lorry stays, and she rides the bed above it."
6. This builder's, under "How the line follows". After "When the one ahead did not leave its square, it hops on the spot." proposed as a new sentence: "While the rabbit is on the cloth and one of the family is not, a small one on the cloth that would hop on the spot hops one square along the cloth away from her instead, so that the one behind it has a square to land on."
7. This builder's, in the table of positions, the row `all`. As it stands: "Nothing new: any of the above side by side, two rivers together, the bell on a square the line must pass." Proposed: "Nothing new: any of the above side by side, two rivers together, the bell plate between the rails of its own lane instead of on the grass before it."

### Reading 2

Rule 6, built so that the code does what the sheet says:

| Finding | Built | Where, and the test |
| --- | --- | --- |
| 1. The rim thunk could not happen | A tap past the far or the near rim asks for the row beyond the board. From her own edge row that is the hop off the board, in any column, and she hops on the spot with the thunk; from any other row it is a tap on the edge row as before. | `layout.ts` (`askedAt`), `board.ts` (`hopToward`), the Mount; `layout.test.ts` "asks for the row beyond the board", `board.test.ts` "is a hop off the board for a tap past the rim" |
| 2. The flat rabbit blinks | Flat, she looks up with wide eyes and blinks. | `paint.ts` (`posePawn`), `figures.ts` |
| 3. The fish waiting at the edge | From the moment a log sets off to carry somebody off the board, the fish is up at that edge with its mouth open and nobody in it. | `view.ts` (`early` on the fish), `paint.ts`; `view.test.ts` "has the fish up at the edge" |
| 4. The cab landing | The hop comes down on the cab, and the pawn slides back onto the bed with a squeal of its own. | `board.ts` (`cab` on the hop), `view.ts`, `motion.ts` (`CAB_SLIDE`), `voices.ts` (`squealNotes`); `board.test.ts`, `view.test.ts` "brings a pawn down on the lorry's cab", `voices.test.ts` "squeals" |
| 5. The rider leans and wobbles | A rider leans with its log as it rides up over a turtle, and wobbles to and fro when the fish noses the log. | `motion.ts` (`riderSway`), `paint.ts`; `motion.test.ts` "a rider on a log" |
| 7. The duck's bell | The lane's step is heard with the bell under the duck's foot: the train's snort and peep. | `scenes.ts`; `scenes.test.ts` "the duck on the bell plate" |

Two sheet sentences proposed to the lead, each as it stood and its replacement. The lead checked them and pasted them into `ART.md` in round 3.

1. Finding 4, the lorry's row of the grid, "Lead the small ones across it". As it stands: "The small ones hop onto the bed one after another, tink, tink, tink, and ride in a row. One that lands on the cab slides back onto the bed with a squeal." Proposed: "A small one that follows her onto the bed lands with a tink and rides it as she does; the bed holds one at a time. One that lands on the cab slides back onto the bed with a squeal."
2. Finding 6, the car driver's row of the characters, "What never changes". As it stands: "Jumpy. It honks at anything on its roof and looks back only when shunted." Proposed: "Jumpy. It honks at anything on its roof and looks back only when something hits it from behind: a lorry that shunts it, or the train."

The builder's own reading of the sheet part, sentence by sentence, for a line that draws and a line that sounds each thing a child sees or hears. Found and built:

| Sentence | What was missing | Built in |
| --- | --- | --- |
| Lorry, "rides it two squares a hop, ears streaming" | A rider's ears hung still while the lorry rolled. | `paint.ts`: the ears of whoever rides the bed stream for as long as it rolls |
| Log, "The log dips and rolls a little" | The log did nothing at the landing. | `motion.ts` (`logLanded`), `view.ts`, `paint.ts`; `motion.test.ts` |
| Turtle, "Its head pokes out to look up at her" | With its shell awash the head was drawn in, rider or not. | `figures.ts` (`peek`), `paint.ts` |
| Turtle, "She treads water for a blink" | She stood still until the water closed over her. | `view.ts`: a wriggle, and her ears going round, before the fish has her; `view.test.ts` |
| Car, "The driver's head spins right round" | The eyes jumped to the back of the head. | `motion.ts` (`lookBehind`), `figures.ts`: the eyes go round the rim; `motion.test.ts` |
| Fish, "lands on its head and rolls upright", and the last small one "rolls three times" | A small one turned in the air and came down on its feet. | `motion.ts` (`rollUp`), `view.ts`; `motion.test.ts`, `view.test.ts` "spits a small one out onto its head" |
| The rabbit, "her ears lean towards the cloth" | Only her body leaned, by a hair. | `paint.ts`: both ears lean towards the cloth while she stands still short of it |
| The last small one, "lands, tips, and windmills upright" | It teetered and its ears did nothing. | `paint.ts`: its ears go once round after every landing |
| A flat pawn with shut eyes | The white glints of wide eyes were drawn over shut lids. | `figures.ts` |
| The ring of bubbles over a sunk turtle | Six bubbles evenly round a ring. | `figures.ts`: a loose ring of all sizes, none in step with the next |

Read and found drawn and sounded, with nothing to do: every landing sound of the toy; the car's roof, honk, bump, splat, peel and shunt; the lorry's tonk, knock, squelch, rumble, rattle and puff; the log's knock, lap, scrape and slap; the turtle's tock, slurp, blub, pop, glug and gulp; the bell, the waking, the run, the wind, the yawn, the snore and its bubble; the splash, the cheeks puffed twice, the spit, the shake and the drips; the cat's purr, slow blink, tail, flinch and tongue; the three scenes beat by beat.

What this reading could not do: it was made by the one who wrote the code, and of what it built only the bell lane, the train's face and the fish were looked at in a still. The cab slide, the fish waiting at the edge, the roll upright, the streaming ears, the turning head and the treading are held by tests and by reading the code.

### Reading 3

| Finding | Built | Where, and the test |
| --- | --- | --- |
| 1. The way across, as play has it | The solver is now run from every state play can begin a crossing in, and each state is made by the game's own `hop` and `startShowing` over the board as `save.ts` lays it. On the bank: every lane as laid, then each showing that can be owed, which steps the duck's lane alone; every row of the bank at every phase, and the row she stands on. After a slide: the first lane stepped alone while it stood beyond the cloth (all eight steps of its round, and the test fails a first lane that does not come round in eight), her hop onto it from each of the five rows, so that she starts on it, on the road, where a car's roof left her, or flat under a car, and then each showing that can be owed. A way found is then played through `hop` with the whole family following. All 216 layouts: 34,686 beginnings, none without a way. No layout and no stepping had to change. | `begins.ts`, `solver.ts` (`ways`, `wayFrom`, `solveFrom`); `begins.test.ts`, `begins.shared.test.ts`, `begins.last.test.ts`, and in the first of them "the check itself", which shows the check failing a crossing with no way |
| 2. The shoved lorry | It goes into the tunnel the train runs into, stays out of sight for three steps, standing still and silent, and trundles out of the other arch on the fourth, going the way the train went: a lorry that met the train head on is turned round in the tunnel, and is drawn going in tail first. | `board.ts` (`SHOVED_STEPS`, `stepLane`), `save.ts` (`readMover`), `view.ts` (`faced`), `paint.ts`; `board.test.ts` "keeps a shoved lorry in the tunnel", for both arches and both ways of the lorry, `save.test.ts`, `view.test.ts` |
| 3. The fish's shadow | It keeps to the row next to hers. When she hops on the spot beside its river it slides one whole square nearer, to her own row, and stays there until she moves to another square. | `motion.ts` (`shadowRow`), `view.ts` (`fishAt.near`), `paint.ts`; `motion.test.ts` "the fish's shadow", `view.test.ts` "brings the fish's shadow near" |
| 4. The lorry's squelch | A small one under a lorry gets the long rumbling squelch too, higher and lighter than the rabbit's, after its squeak. | `voices.ts` (`flattenNotes`); `voices.test.ts` "gives a small one under a lorry" |

What finding 1 turned up beyond the three differences the reader named: in 453 of the 34,686 beginnings the way the solver finds for the rabbit alone is spoiled once the family follows her, since a small one that falls behind can step on a bell plate she kept off, and the train then catches her. In each of those the game itself, family and all, is searched for a way with no mishap for her, and has one. 3,880 beginnings start with her flat under a car on the first lane; she peels up and has a way from there.

One sheet sentence proposed to the lead, as it stands and its replacement. The lead checked it and pasted it into `ART.md` in round 4. Finding 2 needs a count that the table of the saved state does not name. In "Every field of the saved state", the row "a mover". As it stands: "A turtle also holds its count (0, 1 or 2)." Proposed: "A turtle also holds its count (0, 1 or 2), and a lorry the train has shoved into the tunnel holds how many more steps it stays there (1 to 3)."

### Reading 4

| Finding | Built | Where, and the test |
| --- | --- | --- |
| 1. The home cloth's old rabbit and hamper | A touch above the rim of the home cloth is answered by what stands there: the hamper behind that cloth throws up its own flap, and the old rabbit asleep there starts up with a snort. The far ones no longer answer for them. | `bystanders.ts` (the hamper carries its column; the head at the home cloth is the sleeper), `view.ts` (`hamper`), `paint.ts`; `bystanders.test.ts` "answers a touch above the rim of the home cloth", which fails on the old answer, `view.test.ts` "opens the hamper that was touched" |
| 2. Dusted off with an ear | The tyre-marked one bends one ear down from the side of its head and brushes it three times across its tummy, with the three brushes of the sound, while the track fades. | `motion.ts` (`dusting`), `scenes.ts`, `view.ts` (`dustAt`), `figures.ts`, `paint.ts`; `motion.test.ts`, `scenes.test.ts` "has a tyre-marked one dust the track off" |
| 3. Its own squeak on the spot | A small one that hops on the spot squeaks as itself as it goes up, then thuds; at the water's edge its peep is that squeak. | `voices.ts` (`voiceFor`); `voices.test.ts` "has each small one squeak as itself when it hops on the spot" |
| 4. The cab with the bed taken | The bed holds one. Whoever comes down on the cab of a lorry whose bed is taken slides back off it with the tonk and a squeal, to the square it came from: a hop on the spot, and the world takes its step. One flat under the bed does not take it. | `board.ts` (the reason `cab`), `view.ts`, `voices.ts`; `board.test.ts` "holds one on its bed", `view.test.ts`, `voices.test.ts` |
| 6. A mishap in the hop beyond the cloth | A flattening in the hop that lands her on the first lane of the new crossing is that crossing's first mishap. | `play.ts`; `play.test.ts` "counts a flattening in the hop that lands her beyond the cloth" |

Three sheet sentences proposed to the lead, each as it stands and its replacement. None is pasted. In the first two the code is sound and the sentence is not what it does; the third follows from finding 6 as built.

1. Finding 5, "The duck goes first", Beats. As it stands: "the duck steps off the home bank into the lane of the new thing;" Replacement: "the duck leaves its post at the near edge beside the home bank and crosses in one long waddle to the lane of the new thing, and nothing in the lanes between touches it;"
2. Finding 7, the table of positions, the row `cars`, its last cell. As it stands: "Roads with one or two cars, and grass between them." Replacement: "Roads with one or two cars and grass lanes among them; two roads may lie side by side."
3. Finding 6, "The tip", Saved when it starts. As it stands: "`mishaps` at 0;" Replacement: "`mishaps` at 0, or at 1 if that hop left her flat under a car on the new lane;"

The reader's note on a load: every load used to set a showing as owed, so the first touch after the game was opened again in the middle of a crossing could start the showing of a thing never shown and make no hop, which a child sent to hop feels as the rabbit not listening. Now a load owes a showing only while the family has not set out (the small ones on the home bank as the slide or the first visit left them, the rabbit there or on the first lane); under way the first touch is a hop, and a thing never shown waits for the next crossing that holds it (`play.ts` `owedOnLoad`; `play.test.ts` "is owed on a load only while the family has not set out").

Seen in a still: the dusting ear, drawn alone on the rabbit and on the last small one (`r4-dust.png`). Not seen in a still: the home cloth's hamper opening, the slide back off the cab.

What is still weak:

- The check of the beginnings takes most of a minute on a loaded machine, in three test files that run side by side.
- A shoved lorry going in tail first and coming out turned round has been seen in no still.

- A child who taps through the slide never sees the duck show the new thing of the next crossing: by the sheet the cutting touch is a hop, and the showing it ends is marked as shown. The sheet stays as it is; this is a default for the owner (below).
- The large rabbit's ears hide part of a small one that stands in the square behind her, and part of its slice on the cloth.
- The old rabbit's head stands in front of the hamper, so the hamper answers only to the two sides of it, and its apple hops up half behind an ear.
- An onlooker answers by swelling only: its head is part of the still picture, so it cannot nod or turn.
- The linen rim strips above and below the lanes stay flat while the leaf lifts; only the lanes are seen narrower.
- When the home bank is a cloth, the duck's post is on the box lid.
- The windmilling ears and the fish beside a log were each seen in one still or none; the windmill is held by tests only.
- On the first board up to a quarter of the squares still hold nothing of their own (the share is below).
- No production build was made after reading 1, by the lead's word; the stills after it are from the dev server.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts` (frozen) and their tests: used as copied.
- `audio.ts`, `guidance.ts`, `input.ts`, `overlay.ts`, `rng.ts`, `scene.ts`, `stage.ts`, `state.ts` and their tests: used as copied. The three scenes are lists of beats for `scene.ts` (`scenes.ts`).
- `config.ts`: backdrop colour, the tier fields (`dpr`, `weave`, `gloss`), `TAP_PRESSES` set to 1 with the reason, `LADDER` and `FIRST_VISIT` for this game.
- `hop-across.tsx`: the Mount draws to a 2D canvas, stamps the still picture (`frame.ts`), and turns a press into a hop. Saved state goes through `save.ts`, which wraps `state.ts` and adds the crossings, so `state.ts` stays as copied.
- `manifest.ts`, `index.ts`: the generator's values.
- **For the template:** the guide says a second finger is ignored, and `input.ts` gives no gesture for a press that lands while another finger is down. A game whose one action is a tap loses a tap when a child rests a thumb on the screen, so this Mount turns such a press into a hop itself. A `press` for every finger that lands, as an option of `ForgivingTouch`, would serve any tap game.
- **For the template:** a game that draws a static place once to an offscreen canvas has to repaint it on a tier change, a resize and a load. The Mount has three call sites for that; one hook named for it would save the next canvas game the search.
- **For the template:** `perf.ts` counts draw calls as the game reports them. For a 2D canvas there is no rule for what one call is; this game counts one for each stamp and one for each figure. A line in the template saying what to count would make counts comparable between canvas games.
- **For the template:** the frame-budget test here counts with a recording stand-in for the 2D context (calls to `fill`, `stroke`, `drawImage`, and any blur, filter or read-back). A shared one would save each canvas game writing its own.

### For the owner to decide

- The look, filled out: `pass1-after.png` against `pass1-before.png`.
- The characters the plan did not name: the old rabbit with the cake, the cat over the table's edge, the duck that goes first (accepted by the lead), and now the onlookers at the rim: a teddy, a tin robot, a giraffe and a rag doll, who watch and answer a touch.
- A second finger also hops, so a resting thumb does not swallow a tap. The guide's default is one finger.
- Whether a five-year-old reads the pancake as funny: a small one that waits on a road is flattened, and peels itself up with its own joke.
- How the voices sound: nobody has heard them.
- A touch that cuts the tip or the slide is a hop and ends the duck's showing for the next crossing unseen. The other way would be that such a touch starts the showing and makes no hop.

## Pass log

One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak. No frame rate could be measured in any pass (software rendering); the count is draw calls as the frame-budget test counts them.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| Run 1 | `rest-1.png`, the first frame of the look spike | "Where is the cat? The bunnies are tiny. Half the lorry is missing. Why are there dolls under the bridges?" | The frame fills out: cat moved to a gap between the cards with its eyes above the board edge; the rabbit at 1.2 and the small ones at 0.82 of a square; the lorry starts wholly on the board; the spare pawns moved clear of the arches. Nothing reverted. | Not measured. 61 to 66 draw calls. | Two thirds of the squares were printed ground with nothing on it. |
| 1, 2026-10-11 | `pass1-before.png` (the opening frame) and `g-duck2.png` (the duck's showing) | "It's all empty. The green bits are just green. Where's the cat gone, I can only see a bit of orange. Why are there suns drawn on the road? The teddy is there twice next to each other. The grandpa bunny is too little." | The frame is filled in the same look. Every lane kind got prints of its own in the corners of its squares (molehills, mushrooms, puddles, manholes, lily pads, rushes, a picnic spread on the cloth, zebra crossings). Onlookers' heads rest on the rim at the ends of grass lanes, and loose toys lie along the near edge (dice, which pass 4 took out again, marbles, crayons, blocks, a spare pawn, the box lid). The rabbit grew to 1.3, the small ones to 0.9 and the old rabbit to 1.66 of a square. The cat shows over the cards again. The chalk suns on the road became tyre skids. Neighbouring lanes never get the same onlooker. Reverted: full-length toys behind the cards, which stood taller than the cards and hid the cat. | Not measured. At most 39 figures and one stamp. | The cloth's top square under the old rabbit is crowded. Ears of the larger rabbit cover the small one behind her. |
| 2, 2026-10-11 | `t-1.png`, the tip with the leaf lifted | "The teddy's head got squished and his eyes slid off. The bridges went thin. That's broken." | Only the board lifts. The bands of the stamp narrow the lanes' own rectangle and nothing else; the cards and the onlookers stand on the table and stay whole; the onlookers were raised and made smaller so their chins end above the lanes; the eyes of onlookers and the train's face are drawn outside the squeeze, the bells inside it. Still: `pass2-after.png`, then `t-3.png` and `t-7.png`. Nothing reverted. | Not measured. Four bands and at most 39 figures. | The linen rim strips stay flat while the leaf lifts. |
| 3, 2026-10-11 | `pass3-before.png`, the fish bringing her up where a log had floated in | "The fish came out of the wood. Fish can't do that." | The fish and its splash come up in the open water beside the log, on the side she was spat towards, when a log lies over the place. The sheet's rule stands: the fish cannot reach what is on a log. Still: `pass3-after.png`, on the production build, with no page error. Nothing reverted. | Not measured. | Caught in one still only. |

| 4, 2026-10-11 | Reading 1 of the folder by the lead's reader, and `q-open.png` | "Are those dice? How many is that? The duck didn't make a noise. I tapped the teddy and my bunny ran away." | What the reader found (see "Reading 1"): the dice replaced by toys with no marks, the skids one smear, nine promises of the sheet built, and every bystander answering a touch as itself. Stills `q-pokes.png`, `q-leap.png`, `q-train.png`. Reverted: the bounce off a flat small one. | Not measured. At most 39 figures counted, one more for a touched bystander. | A child who taps through the slide misses the duck's showing. |

The full frame, for `pass1-after.png`:

- **Share of the frame that is empty.** Counted by `emptyShare` in `scenery.ts` and held by `scenery.test.ts`: a square is empty when it has no print, plate, zebra or seat and neither a pawn nor a mover stands on it. Over the first boards of every position the share is 0.12 to 0.17 on average and never over 0.25; the test fails at a third. It was two thirds. The middle of every square is still plain, by design: prints keep to the corners so the child reads what stands there. Bare table is about a twentieth of the frame, in strips between the cards and the toys.
- **What is funny.** The cat's eyes and nose over the edge of the table. The onlookers with their chins on the rim, whose eyes follow the rabbit. The lorry driver who stares ahead whatever happens behind him. The dozy small one with its ears out sideways. The old rabbit, bigger than anyone, on tiptoe with a cake. The duck with its chest out, about to walk into a car. In play: the pancake that peels itself up, each one its own way; the fish that puffs twice and spits; the train with bleary eyes.
- **What is alive.** The four pawns breathe and blink out of step; the cat sways and watches; the old rabbit rocks; the duck shifts; the onlookers' eyes move; a sleeping train breathes and blows a bubble at its step. After three idle seconds the square ahead glows, after five the hand presses it once. Movers and squares stand still between steps.

### The cold playtest proxy

Played once from a first visit on the production build (`npx vite build`, then `npx vite preview` on the wave's port), as someone who has not seen the game, with stills `c-00.png` to `c-26.png`.

What was clear with no help: the duck walks into the road and is flattened before anything is asked (`c-02.png` to `c-06.png`); the glow and then the hand on the square ahead (`c-12.png`); one tap, one hop, and the whole board steps; the pancake and its peel; the cake as the place to go; the picnic; the slide when she hops off the cloth.

Unclear moments, and what was done:

1. The fish came up through a log. Fixed (pass 3).
2. In the tip the cards and heads were squeezed with the board, which read as a fault. Fixed (pass 2).
3. A road had chalk suns on it, which read as something to collect. Fixed (pass 1: tyre skids).
4. Two teddies side by side read as a pair to match. Fixed (pass 1: neighbours differ).
5. A hop back onto the small one behind her looked as if nothing happened, since the two swap. Fixed after reading 1: she vaults high over it and it ducks and scurries under her with a squeak.
6. A tap on the old rabbit hopped her towards it and was not answered by the old rabbit. Fixed after reading 1: it answers as itself, and so do the duck, the hamper and the onlookers. A tap on the cake's own square is still a hop towards it.
7. The hand may show a square that ends in a mishap. Left, by the lead's ruling: a mishap is free and funny, and the hand never shows the way across.

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### What the game is

A rabbit leads three small ones across a folding board game, one hop for each tap, and every other thing on the board takes one step of its own each time she lands. Nine positions in a designed order, three scenes (the duck goes first, the picnic, the tip and slide), no learning goal.

### How the game meets the quality bar

- **Alive at idle.** See "what is alive" above. Nothing on the board moves without a hop, so the life at idle is in the family, the cat, the old rabbit, the duck and the onlookers.
- **Motion and sound on every touch.** Every press outside the grown-up's corner at the top right ends in a hop, a hop on the spot, or the answer of the character it landed on (the cat, the duck, the hamper, an old rabbit, an onlooker), started in the press, each with one voice. A press in that corner is the grown-up's and is answered by nothing. A second finger that lands while another is down also hops. `voices.test.ts` meets every event type and holds each voice in range and under three seconds.
- **Weight, squash and follow-through.** The landing squat, ears arriving late, cars nodding on their springs, the lorry heaving, a log bobbing, each pawn's own peel (`motion.ts`, with a test that no two share a curve).
- **Silhouettes and tappables.** A square is 118 by 104 stage units and any tap in a direction is a hop, so there is no small target. The family's colours are used by no mover; the movers and the middles of the squares are plain.
- **Wordless clarity for age 5.** Nothing is written or numbered. A new thing is shown once by the duck walking into it, from the child's first touch on a first visit, so that it is heard. One want in every scene: the cake across the board. `node scripts/wordless-check.ts` passes.
- **Wordless idle guidance.** The whole ladder: a breathing glow on the square ahead after three idle seconds, a ghost hand that presses it once after five, at most four showings. The hand shows a hop, never the way across, and may show a hop that ends in a mishap.
- **Frame rate.** Not measured: the build machine renders in software. Counted instead: one full-surface composite a frame (four bands that cover the surface once while the leaf is lifted), at most 39 figures over it, no blur, filter, read-back or post pass, pixel ratio capped at 2, four tiers and the grown-up overlay from the template.
- **Assets.** All procedural: canvas 2D and synthesized sound.

### The rules it keeps

- **Found as left.** Every hop is one whole step of the saved state, saved in that hop. A scene saves what it ends in when it starts; cut at any moment, the view is where the save is (`scenes.test.ts`), and no scene replays on load. A showing that had not started is still owed while the family has not set out, and starts at the first touch, on a first visit too; opened again in the middle of a crossing, the first touch is a hop. Wet and a tyre track last three hops of the line and are never timed.
- **No engagement mechanics.** The rabbit's own mishaps are counted only inside the save to judge a crossing, capped at nine, and never shown. Nothing moves or changes while the game is away, and nothing starts by itself after the picnic.
- **Age is a hint.** A first visit starts at `cars` for 5 and younger and for no age, `logs` from 6, `bell` from 8; a saved position always wins, and every position is reached by play (`save.test.ts`).
- **Nothing passes through anything.** A canvas game: model tests hold that no two of the family share a square, that a pawn is drawn where the model has it and flat exactly when the model says, and that movers are drawn where the board has them (`board.test.ts`, `view.test.ts`).
- **Home control and grown-up corner.** Nothing a child must tap or read lies under either.

### The learning claim

The game has no learning goal and makes no learning claim.

### Defaults taken for the owner

- The hand presses once, not twice: a second press copied by the child would be a hop nobody chose.
- A second finger also hops.
- The hand may point at a square that ends in a mishap.
- A small one that waits on a road is flattened, and peels itself up with its own joke: the eager one snaps up and looks round, the dozy one stretches, the wobbly one slips back and makes it at the second go.
- The train is rails laid along a road lane; the old rabbit, the cat, the duck and the onlookers are characters the plan did not name.
- The first-visit showing waits for the first touch.
- Every character round the board answers a touch as itself and makes no hop.
- First visit by age as above.

### What the next builder should know

- A turn-based board is easiest as a pure `step(board, hop)` that returns the new board and a list of events, with the view replaying the events on game time. The save is then the board itself, and found as left costs nothing.
- Settle a scene's outcome in the hop that causes it and let the scene only move the view. Then "cut at any moment" is one test: land all the beats, and compare with a view loaded from the save.
- Scenery as pure data from what never changes in a crossing looks the same on every load and after a slide, and its empty share can be held by a test.
- Random walks over the model with a `faults(board)` check found three ways for two pawns to share a square that no hand-written test had.
- The rabbit can be boxed in by her own followers unless a hop onto one is defined; here it is a leapfrog. The line also has to make room on the cloth, or the last one never arrives.
- A missing import in an event handler threw only when that event came, and the still looked merely duller. Typecheck before every still.
