<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates
- Sheet: stands on round 1. Checker label: checker-1. Six findings, each pasted word for word above the look part of `ART.md` and nothing else changed there; round 2 confirmed by the lead from the diff. After reading 1 one more sentence was replaced under "The scenes" (the door's double tap), checked by the lead. After reading 2 two more sentences were replaced (the hens lunge at the trough; the hens puff up half as big again), checked and pasted by the lead. After reading 3 four sentences were replaced (the grown-up's silent corner, twice; each hen comes to the grain from where she stands; a thing taken away mid-use ends its answer), checked and pasted by the lead. The worktree has no commit of the game yet, so the commit the round judged is the lead's to record.
- Look in use: lift-the-flap board book, the first look reserved for this game. The second reserved look was not tried: the first held on clarity and on the frame budget, and was kept at the toy checkpoint.
- Open: requests to the lead, below.
- Reader: reading 1 (rule 6: eight promises) and reading 2 (rule 6: nine more; rules 1 to 5 clean both times) are answered: every finding is built, or its sentence is proposed for change under the requests, each with a test (the tables under "The reader"). After reading 2 the builder read the sheet part sentence by sentence against the code and built what that found as well (listed there). Reading 3 (rules 1 to 5 clean; rule 6: seven, one a child would notice) is answered the same way: five built, two sentences proposed (the table there). Reading 4, the last (rules 1 to 5 clean; rule 6: three, all slight; one sentence below the look heading), is answered: the three are built, each with a test, and the art guide's sentence is corrected (the table there). No reading is open. Seen by the reader under rule 5 and left, none plain: the fork's three tines, the cracks in the dry wallow, the bubble and glow rings, the spark and straw dashes, the bar under the brush, the line through the hatch, the goat's level pupils.
- Rulings from the lead: the night is one composite a frame; the door's double tap is in the sheet; what is heard and what is drawn share one clock (`timeline.ts`, `sync.test.ts`); a new use stops the notes of the answer it replaces (`channels.ts`); the top right corner is silent, and it is the overlay's 72 pixels of the surface at every size (`corner.ts`); a thing taken away mid-use takes its answer with it (`Farm.takeAway`, the pairs in `sync.test.ts`); the full morning follows the fourth answer and a touch during that answer does not end it; half way is the distance left, not the line; the hens' eyes in the night stay on the weak list.
- Open: nobody has listened to the sounds. They are tested as lists of notes (range, length, loudness, no two cells alike), not heard.
- Open: no frame rate has been measured. The build machine has no graphics card; the draw counts are given in its place.
- Stills: in the wave's scratch folder for this game, `wave-scratch/farm-morning/`. `run5/` is what reading 3 changed, as strips of frames with a contact sheet each (`sheet-haystack-0.png`, `-1`, `-2`, `sheet-grin.png`, `sheet-left-goat.png`, `-left-pony`, `-left-hens`, `sheet-spark.png`, `sheet-sun.png`), `run4/` is the game after reading 2, as strips of frames of one answer or scene each with a contact sheet beside them (`sheet-*.png`), and `run3/` is the game after reading 1 (both on the dev server, 1180 by 820, the jam's play page with `chrome=0` and `seed=1`, the clock paused after load), `final/` is the game before the reader, `cells/` is every cell of the grid in eight frames on a paused clock, `cold1/` is the cold playtest walk on the production build, `pass2/` holds the stills the passes were judged from, and `run1/` is the toy. `stills.mjs` and `cold.mjs` take them.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The parts below belong to the block.

### What the lead should try first

1. Open the game with the jam's age at 4 or more: the door is shut and three faces are at its holes. Wait ten seconds, then touch the door.
2. Lift the bucket and look at it: is it in your hand? Pour it on the pony and watch the goat.
3. Give the scoop to the goat, and the fork to a hen.
4. Give all four their right thing (scoop to hens, brush to pony, fork to goat, bucket to pig) and watch the full morning; touch during it.
5. Slide the door shut and watch the night; touch during it. Put the game away at any point and open it again.

### What is still weak

- **The sounds have still not been heard by anyone.** They are now placed from the same clock as the pictures and a test holds each note to its maker, which says when a note sounds and not what it sounds like.
- **Stopping a channel was tested on a stand-in for the audio context**, not in a browser: the fade and the letting go are checked as calls, not by ear.
- **The night comes as a cut** at half dark, as a page turned.
- **The night's stamps are made in one frame**, as the first dusk begins; not timed on a device.
- **The pig's trotters are small:** each kicks by itself, but only the hoof and a little leg show under so round a body. On its back they are plain.
- **The bucket's handle crosses the goat's eye** while it drinks; the bucket stands beside its nose and its face is otherwise in view.
- **The brush covers the top of the hen's head** for the four scritches, and the crest shows as it leaves.
- **The white hen's crow is one beak thrown up through her hole** in the door, by night blue turning to day: small on the page.
- **The hens asleep are behind the door:** they are not seen shutting their eyes, and their snore is shown only by the door stirring at each peep. Reading 4 lists it too; left by the lead's ruling.
- **A child who keeps tapping animals keeps the full morning waiting:** it follows whatever answer the last touch started.
- **A replaced or taken-away answer drops its pose in one frame** (the pig on its back is on its feet at once); the art guide now says so.
- **Hens that are pecking at grain peck on through another hen's poke, brush or hay:** they are heard to cluck but do not look up to stare.
- **A hen walking home past a thing's place is in front of it, and a tap there is hers**, as `overlap.test.ts` holds; a child reaching for the thing gets the hen.
- **The scratch is small**, and the strut is short (some thirty units out and back).
- **A right thing taken away at once still makes its animal content.** The sheet saves `content` when the answer starts, so a brush lifted off the pony after a tenth of a second leaves a shining coat that was never brushed all over; the want fills as the brush leaves.
- **The Mount's own line is not under test:** `yardTouch` is tested at three surface sizes, and the Mount's use of it (a press in the corner, and all that finger then does, is not passed on) is read, not run.
- **The haystack stands a little in the hen she walks into**, in front of her, and passes behind the pump on her way out.
- **The one spark is thin** against a cloud.
- **The bantam hardly moves to grain by the pony:** her place there is eight units from her own, so she gives no cluck and only pecks.
- **Not walked cold again**, and nothing since the cold playtest has been on a production build: the brief allows one build.

### Requests to the lead

- **The claimed-styles registry row** in `docs/art-direction.md`: its text is at the end of `ART.md`.
- **No sentence of the sheet is waiting.** The four proposed after reading 3 are pasted by the lead; reading 4 needed none.
- **For the template:** `stage.ts` gives a fit and `toStage`, and every canvas game then writes the same page-and-pieces plumbing (paint a piece once into its own canvas, stamp it, count the stamp). A small counted-stamp helper and a recording stand-in for tests would save each canvas game a file. This game wrote its own (`recording.ts`).
- **For the template:** the ghost hand of the template is white, and the idle glow pale. On a pale ground both vanish; a line in `guidance.ts` saying that the hand needs a rim and the glow a colour of its own would have saved a pass.
- **For the build brief:** a still on a paused clock needs the clock paused after the page has loaded, not only installed; installed alone, time runs on and every timed still is late.
- No frozen file needed a change.

### Considered and not built

- A dusk in steps (a set of night stamps for each step): the lead asked for one night ground and one set of night pieces.
- A second production build: the brief allows one.

### Template notes

- `farm-morning.tsx`: changed. The blank draw, the gesture cases, the step and the load are joined to the model, the view and the voices; the ladder is held at the bottom while an answer or a scene plays. Used as the comments direct.
- `config.ts`: changed. Backdrop, tiers (pixel ratio, loose bits, gloss), an empty `LADDER`, and `FIRST_VISIT` by age.
- `state.ts`, `state.test.ts`: rewritten for `door` and `content`.
- `scene.ts`: used as copied. The three scenes are built on it inside the model, on the model's own clock, so they pause with it.
- `audio.ts`, `input.ts`, `guidance.ts`, `rng.ts`, `stage.ts`, `overlay.ts` and their tests: used as copied.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen, untouched.
- **For the template:** `Guidance` gives one `demoIndex`; a game whose next move depends on what is in hand has to ask its model what to show (`Farm.want`). A line in `guidance.ts` saying so would have saved a detour.

### For the owner to decide

- **The look and the toy:** is this spread the board book he wants, and is tapping a thing and then an animal a pleasure before any goal.
- **The smiling sun.** It is kept as a default: a bystander that answers a touch, drawn as a character. Its height follows how many animals are content, as the world's result: it slides, with no marks and no steps.
- **The first morning by age.** The door is open for a child of 3 and younger and for no age, and shut for 4 and older. The jam's default age is 4, so the owner first sees the shut door with three faces at its holes.
- **The night at any time.** Sliding the door shut starts the night and a new morning at any moment of any morning, full or not.

## Pass log

One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak. No frame rate is reported from the build machine; the heaviest draw count of a frame is given in its place.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | Thirty stills of the toy (`run1/`): at rest with the door open and shut, a thing lifted, fourteen cells mid-answer, the door sliding, all four content, the glow and the hand, a tablet and a wide surface. | "The chickens are standing on the green pump thing." "Where did the horse's eyes go?" "I can't see the food, the chickens are on it." "The things went all white." | Depth: the pump became a piece drawn in front of the hens' ground, the trough is drawn among the hens by where their feet stand, and a hen that comes round in front of the pig is drawn after it. Eyes shut tight got a dark curve. The idle glow was thinned. A drag let go over an animal now finds the animal under the carried thing. | Not measured. Draws: 52 at rest, 60 in the heaviest cell, 66 with everything at once. | The three hens overlap into one clump. The hay rack is cut by the page's edge. The lift of a thing is small. |
| 2 | The yard re-laid, at rest and with the bucket and the fork lifted (`pass2/lift.png`, three crops side by side; `pass2/01-rest-age2.png`). | "I picked up the bucket, it's big, there's water in it." "The pump stick is on the chicken's feet." "The brown chicken's tail is poking the white one." | In the hand: a lifted thing is a third larger, hangs lower over its own place, sways, and leaves a wide shadow where it lay (it had risen a thumb's height). Each hen her own shape: the three stand apart by size and place, the russet hen moved clear of the white one, and the pump's lever was turned down onto the step, off the hens' feet. The rack moved wholly inside the frame. Still again: `final/01-rest-age2.png`, `final/02-lifted-bucket.png`. | Not measured. Draws: 54 at rest. | The fed, fluffed hens still touch. |
| 3 | The three scenes and the whole idle ladder, on a paused clock (`pass2/s04.png`, `s05.png`, `s06.png`, `s07.png`). | "Where is the hand? I can't see it." "The things went foggy." "The chickens fell out of the door!" "It's night, they're all sleeping. The goat has sleepy eyes." | Guidance that shows on a pale ground: the glow became a sunny ring with a clear middle and the ghost hand got a dark rim; a carry takes a pale copy of the thing along. The fed hens were set wider apart. Shut eyes and the goat's slots were checked up close (`final/eyes.png`): each is an eye on a face. Still again: `final/07-idle-glow.png`, `-tap.png`, `-carry-1.png`, `-carry-2.png`. | Not measured. Draws: 69 through the scenes with a thing lifted, 57 with the carry shown. | The carry was seen in two stills only. |
| 4 | Every cell of the grid in eight frames on a paused clock (`cells/sheet-scoop.png`, `-bucket`, `-brush`, `-fork`, `-finger`), each read against its line of the sheet; the hens' visits (`cells/visit.png`); the wide, tablet and phone surfaces. | "The goat didn't bite the scoop, the scoop went home." "The food is lying on the goat's back." "There's no fence on that side." | Nineteen cells matched their lines. The goat and the scoop did not: the grain now falls across into the goat's mouth and is gone in one mouthful, and the emptied scoop stays in the goat's teeth until they clonk and then pings out, up and over, back to its place (a model test holds it). On a surface wider than the stage the fence, trees, flowers and straw now run on past the henhouse and past the right edge. Still again: `final/goat-scoop.png`, `final/09-wide.png`. | Not measured. Draws: 63 in the heaviest cell, 71 with everything at once. | Motion between the eight frames of a cell was not seen. |
| 5 | The cold playtest walk on the production build, age 2 and age 5 (`cold1/age2.png`, `cold1/age5.png`). | "The sun didn't go up." | The sun's slot was made half as long again, so each content animal lifts it by a clear step of the eye and the fourth takes it to the top with its long rays. Still again: `final/05-full-morning-3.png` beside `final/01-rest-age2.png`. | Not measured. Draws unchanged. | Checked on the dev server, not on a second build. |
| 6 | The reader's eight findings and the lead's rulings, each in stills on a paused clock (`run3/ears.png`, `halfway.png`, `strut.png`, `spark.png`, `patch.png`, `knock.png`, `scratch.png`, `night.png`). | "The pig's ears went up when I picked it up." "The bucket went the rest of the way by itself." "The chicken with the hat is walking." "The goat's horn went zap." "I knocked and the pig looked at me." | The eight promises (table under "The reader"). The night from its own stamps, with no wash. The fed hens set apart and fluffed less. A tap on a hen's bare patch reaches her where she is. The idle hand shows the animal that is short of the lifted thing, and the carry goes to it too. The things moved ten units left so a hen at the wallow's rim stands clear of a lifted fork. | Not measured. Draws: 54 at rest, 64 in the heaviest cell, 68 through the scenes by day and by night, 70 with everything at once; one full-surface draw in every frame. | The night is a cut. The scratch is small. |
| 7 | Reading 2 and the builder's own reading of the sheet, in strips of frames on a paused clock (`run4/sheet-brush-pony.png`, `-bucket-goat`, `-fork-goat`, `-scoop-pony`, `-brush-pig`, `-scoop-hens`, `-scoop-pig-visit`, `-night`, `-crow`, `-catcrop`). | "The brush goes back and forth on the horse." "The goat is drinking out of the bucket." "The hay went in the basket." "The pig is kicking." "The chickens sat down." | One clock for sound and picture, and the things it moved: where each thing is used and for how long, the door's rumble and clunk as it moves and shuts, the night waiting for the door, each hen's pecks at her own head, the bubbles' glops, the drum, the crow, the yawns. Channels that stop. Straw into the rack, which fills from the bottom. The cat stretches. Trotters as pieces. Settled hens sit. A silent corner. | Not measured. Draws: 58 at rest, 68 in the heaviest cell, 72 through the scenes, 74 with everything at once, by day and by night; one full-surface draw in every frame. | The sounds are unheard. The trotters are small. |
| 8 | Reading 3, in strips of frames on a paused clock (`run5/sheet-left-goat.png`, `-left-pony`, `-left-hens`, `sheet-haystack-0.png`, `-1`, `-2`, `sheet-grin.png`, `sheet-spark.png`, `sheet-sun.png`). | "The goat is looking where the bucket went." "The hay chicken bumped the white one and then the little one, and they jumped." "The pig is smiling." "One zap." | A thing taken away mid-use takes its answer with it (`Farm.takeAway`, `neededFor`, `leftRig`), and `sync.test.ts` walks every pair of uses; that walk found three more faults in the hens' chains, also fixed (below). The silent corner is the overlay's 72 pixels of surface (`corner.ts`). A real zigzag that walks into both hens, each jumping with her own bonk as she is touched. A whole turn of the sun, one spark, a grin. The spark's line was thickened after the first still. | Not measured. Draws unchanged: 58, 62, 68, 72, 74. | The list under "What is still weak". |
| 9 | Reading 4, by tests on the model; no new still, since nothing drawn changed but when it is drawn. | (none: no frame was looked at) | The full morning waits for the fourth answer (`morningDue`) and cannot be ended before it begins. Half way is the distance left. A pecking hen pecks on through another hen's answer, and the poke and the brush on a hen are in the walk of pairs. The other two hens nod on the clucks' own beat. The art guide's sentence on cut poses is corrected. | Not measured. Draws unchanged: 58, 62, 68, 72, 74. | The list under "What is still weak". |

**The frame, at rest (`final/01-rest-age2.png`).**

- *Empty:* about a seventh of the frame. The open sky left of the sun and between the clouds is the largest stretch, then the sand between the step and the wallow. No band of ground or sky is bare from edge to edge: the henhouse, the fence, hills, trees, flowers, the step and the wallow stand on them, and on a wider surface they run on.
- *Funny before anything moves:* the pony's head, as big as its barrel, with a lip like a shelf and a forelock over one eye; the goat's bored yellow eyes with level pupils over a beard; the pig, a pink ball on four small trotters sitting on cracked mud; three sizes of the same round hen; a cat's tail hanging out of the loft.
- *Alive:* all four animals breathe and blink at their own tempo and fidget (lip, jaw, tail, ears); the pony's dust puffs off when it shifts and the pig raises dust trying to roll; the hens bob and look about out of step; every eye follows the last touch; the cat's tail swings; the sun's rays turn; the clouds drift.

## The cold playtest proxy

On the production build (`vite build`, served by `vite preview` on port 4208), loaded fresh, at 1180 by 820, once with the jam's age at 2 and once at 5. Nothing was touched for ten seconds; then a minute was played as a newcomer who copies what the screen shows and otherwise taps what is biggest and nearest. It is a script and a builder reading stills, not a child.

**What the untouched scene invites.** Age 5: a shut yellow door with three beaks at its holes; a ring comes up round the door at four seconds and a hand presses it at seven. Age 2: the hens are out, peering into an empty trough; rings come up round the four things on the pale step at four seconds and the hand presses the scoop at seven. In both the eye goes first to the pony's head and then to the pale step.

**Unclear moments, first list.**

1. With a thing lifted and nothing touched, the hand presses the pony whatever is lifted. A newcomer who copies it gets a wrong use. Left as it was then; since changed (pass 6): the hand presses the animal that is short of the lifted thing.
2. The walk tapped the hens' own patch while they were across the yard at the pig, and only knocked on the page. A child who looks taps the hens where they are, and that works (a test holds it). Left as it was then; since changed (pass 6): a tap on a hen's bare patch reaches her where she is.
3. With three animals content the sun stood hardly higher than with none: the world's result could not be read. Fixed (pass 5).
4. After the night a thing that was lifted is still lifted while everything else has started again. Left as it is: the sheet says a lifted thing stays lifted through a scene.

**Second list, after the fix.** 1, 2 and 4 stood then, by choice (1 and 2 were changed in pass 6, after this walk, and have not been walked cold again). 3 is gone: the sun's climb reads in `final/05-full-morning-3.png`. Nothing new appeared. The second look was on the dev server.

Found as left was seen in the same walk: reopened after the night, the door is shut, the beaks are at the holes, every animal is short again, the thing that was lifted lies in its place, and no scene replays.

## The reader

Reading 1 was started by the lead on the folder as it stood at the end of run 2. Rules 1 to 5: clean. Rule 6: eight promises of the sheet unkept. Each is built so the code does what the sheet says:

| The sheet says | Built in | Held by |
| --- | --- | --- |
| A thing lifted: "its ears come up" | `Farm.lifted`, `perkRig` in `motion.ts`, laid on in `view.ts` | `farm.test.ts` "brings every ear up when a thing is lifted"; `motion.test.ts` "brings the ears up" |
| A drag let go more than half way is "used there" | `Farm.dragEnd`: the thing leaps the rest of the way and tips out over the animal | `farm.test.ts` "counts when let go more than half way" |
| Brush on a hen: she "struts about" | `stageHens` sends her out and back on quick steps (`strut`) | `farm.test.ts` "sends the brushed hen strutting" |
| Brush on the goat: a spark "off the tip of a horn" | `HORN` in `layout.ts`, a burst from `horn` in `cells.ts` | `farm.test.ts` "throws the goat's spark off the tip of its horn" |
| Visiting hens "peck up what fell with a quick tok-tok" | each hen's pecks are her own sound, sent when she starts pecking (`tok-white`, `tok-russet`, `tok-bantam`) | `farm.test.ts` "brings the hens running" |
| Bare page: "the nearest animal looks round" | `Farm.turned`, `turnedRig` and `henTurned`; a hen turns to face the knock | `farm.test.ts` "turns the nearest animal round"; `motion.test.ts` "brings a head round" |
| The hens "scratch beside" the trough | `SCRATCHES` and the rake in `henRig`, the leg in `view.ts`, the dust in `Farm.ambient` | `motion.test.ts` "has each hen scratch"; `farm.test.ts` "shows each want" |
| After the night the sun "comes up to its low morning place" | `Farm.sunLevel`, held low from the dark until all are awake | `farm.test.ts` "brings the sun up to its low morning place" |

Reading 2, by a new reader: the eight held, rules 1 to 5 clean, nine more promises of the sheet unkept. Most were one fault, sound and picture on two clocks, and it is fixed at the root (`timeline.ts`); `sync.test.ts` holds it for every cell and scene.

| Reading 2 | Built in | Held by |
| --- | --- | --- |
| 1. The brush leaves the pony after one stroke; the bucket leaves the goat before the glugs end | `USES` in `timeline.ts`; `Farm.stepHand` keeps the thing at the animal on the answer's clock | `farm.test.ts` "keeps the brush on the pony for all four strokes", "keeps the bucket at the goat's mouth"; `sync.test.ts` (the `thing` notes) |
| 2. The straw falls on the goat and the rack fades in | `USE_PLACE['fork-goat']`, the straw's floor in `throwBits`, `FILLS_FROM`, `cross` in `view.ts` | `farm.test.ts` "drops the hay into the rack" |
| 3. The door shakes before the drum sounds; the clunk is at a fixed time | `Farm.drum`; `door-slide` and `door-clunk` sent by `stepDoor`; the night's clock waits for the door | `farm.test.ts` "has the hens drum on a shut door", "clunks when the door is shut"; `sync.test.ts` |
| 4. The cat on the roof does not stretch when the hatch is touched | `Farm.press`, the hatch | `farm.test.ts` "has the cat on the roof stretch" |
| 5. The old voice plays on under a new answer | `channels.ts`, `channelOf` in `voices.ts`, `Farm.takeStops` | `channels.test.ts`; `sync.test.ts` "owes nothing more" |
| 6. The hens have no run to the trough | a sentence proposed (requests); the necks shoot out before they peck (`henRig`) | — |
| 7. The hens reach 1.6 times, not twice their size | a sentence proposed (requests) | — |
| 8. The whole pig trembles and no trotter kicks | `pigTrotter` in `art.ts`, `PIG.trotters`, `view.ts` | `motion.test.ts` "kicks the pig's trotters"; stills |
| 9. Settled hens stand | `HenRig.sit` | `motion.test.ts` "sits a hen down" |
| The corner knocks | first a stage-unit box in `Farm.press`; since reading 3 the overlay's own square of the surface (`corner.ts`) | `corner.test.ts` |

**The builder's own reading of the sheet part**, sentence by sentence, for a line that draws and a line that sounds each thing at the same moment. Found and built, beyond the nine:

- The hens' pecks did not fall when their heads did, at the trough or on a visit: each hen's pecks are now her own sound on her own beat (`PECK_BEAT`).
- "Peck up what fell": nothing lay where the visiting hens pecked. Grain now spills from the scoop to those places and is gone when they have pecked.
- Bubbles that "glop as they burst" glopped while they swelled: each glop is at its bubble's burst (`BUBBLES`, `POP`).
- The spray soaked the goat before it had crossed the yard, and the goat's bleat was part of the pony's voice: `SPRAY`, and the bleat is the goat's own.
- The pony's two crunches fell with its mouth open: its jaws now shut at each.
- The grain "sucked off the scoop" fell past the pony's chin: the scoop is at its lip until the flubber ends.
- The white hen crowed unseen and the animals yawned without opening their mouths: a beak at her hole, and a yawn.
- The cat's stretch sounded as it left the hatch: it now stretches once it is out on the roof.
- A content pony's hip rose; it now drops. The hens' croon moved nothing; they swell with it.
- The wants began to fill when the finger landed, before the thing had: they fill from when it lands.
- The gloss was dropped on the lowest tier; it stays on every tier.
- The night could have outlasted its nine seconds once its clock waited for the door: it is tightened, and a test holds six to nine.

Answered and left: the answer's "two to five seconds" is read as a use of a thing, the bare finger's answers being shorter. ("Run across ... and walk home" was left then as kept; reading 3 showed the bantam has no run by the pony, and its sentence is proposed.)

Reading 3, by a new reader: rules 1 to 5 clean; the one clock and the sync test held; rule 6: seven, one a child would notice and six slight.

| Reading 3 | Built in | Held by |
| --- | --- | --- |
| 1. A thing taken away mid-use: the first animal's answer plays on, and its bits fall at the use place | `Farm.takeAway`, called by a use on another animal, a lift of another thing and the night: the answer ends, the animal's channel is stopped, the animal looks after the thing (`leftRig`), spill, drum and spray that had not begun are called off, and a right thing's want fills as it leaves. `throwBits` throws nothing from a thing that is not there. `neededFor` in `cells.ts` says how long each answer needs its thing | `sync.test.ts` "ends an answer with its thing when the thing is taken away mid-use": all sixteen uses, door open with nobody and with everybody content, and grain with the door shut, each followed at eight moments by a use on each animal, a lift of another thing, the night and a knock; and at every step of every walk, no answer goes on with its thing gone, and no thing is at an animal that is not answering it. `farm.test.ts` "a thing taken away in the middle of a use" (five tests); `motion.test.ts` "looks after a thing that was taken away" |
| 2. The silent corner is in stage units, not the overlay's pixels; the comment in the Mount says the opposite of the code | `corner.ts` (`yardTouch`): the overlay's `inCorner`, 72 pixels of the surface; the Mount passes on nothing a finger does that landed there; the stage-unit check is out of `Farm.press`; the comment is rewritten. A sentence proposed (requests) | `corner.test.ts`, at 1180 by 820, 1400 by 700 and 1024 by 768: the square is the overlay's to the pixel, the page knocks right up to its edges, the stage's own corner knocks where the overlay's is elsewhere, and no target is under it |
| 3. The zigzag is a sway and the far hen jumps untouched | `stageHens`: a route of stops out and back in front of the trough, to the nearer hen and then the other (`ZIGZAG`, `HAYSTACK.bumps`); `Hen.bumped` and `bonk-white`, `-russet`, `-bantam`, set and sent in the step she is reached; the jump is in `henExtras` | `farm.test.ts` "the haystack"; `motion.test.ts` "jumps a hen the haystack has walked into"; `sync.test.ts` |
| 4. The sun unwinds half a turn | `sunTurn` in `motion.ts` | `motion.test.ts` "spins the sun one whole turn" |
| 5. Five sparks | one, twice as long (`cells.ts`, `throwBits`) | `farm.test.ts` "throws the goat's one spark" |
| 6. The bantam has no run to grain by the pony | a sentence proposed (requests). Each hen now clucks as she herself sets off, if she has seventy units or more to go (`run-white`, `-russet`, `-bantam`), in place of one flock sound on a fixed delay | `farm.test.ts` "brings the hens running"; `sync.test.ts` |
| 7. The grin is an open oval | `Rig.grin`: `pigIdle`, the end of `bucket-pig`, and a curve in `view.ts` | `motion.test.ts` "grins when it is content" |

**What the walk of pairs found besides**, each fixed and held by that walk:

- Grain on another animal while the hens were in an answer of their own: they pecked there to the old answer's pose, off their own beat. They now leave off their answer to go.
- Grain twice on the same animal: the hens were sent again from where they pecked, and the flock's running clucks sounded with nobody running. A hen on her way runs on, one pecking there starts her pecks again, and the cluck is each hen's own.
- Grain on the hens while they were across the yard: the answer ended while they still pecked at the trough, and they walked off under their own pecks. A hen still pecking goes home when she has done.
- Water on the pony and then the bucket to the goat: the spray soaked the goat while it drank, and the bucket hung on at a goat that had stopped drinking. It goes home.

Reading 4, the last, by a new reader: rules 1 to 5 clean; rule 6: three, all slight; one sentence below the look heading.

| Reading 4 | Built in | Held by |
| --- | --- | --- |
| 1. The ending can be ended before it begins: the scene started at the fourth touch, so any touch during the fourth answer ended it | `Farm.morningDue`: the fourth right thing starts a countdown to the end of its own answer and no scene; `step` begins the scene when it runs out; an answer started in that time moves it to that answer's end; the night calls it off | `farm.test.ts` "cannot be ended before it begins" (a second touch 0.8 s into the fourth answer, four kinds: the page brightens over time, the cat stretches and all four settle) and "follows the fourth right thing on the same touch" |
| 2. "More than half way" was measured along the line only | `Farm.halfWayTo`: less than half of the way from the thing's place to the animal is left | `farm.test.ts` "does not count a drop that is no nearer the animal" (the fork and the scoop, on the shut door and on its trough) |
| 3. Toks sound while the hens stand | `Farm.answer`: the brush, the fork and the finger stop only the touched hen's pecks and her channel; `henRig`: a pecking hen pecks on through another hen's answer | `sync.test.ts`, the walk of pairs, with two more second touches at every moment: the thing laid down and a hen poked, and the brush lifted and used on a hen |
| Below the look heading: a cut pose jumps | the sentence under "Motion rules" in `ART.md` and the comment on `weight` in `motion.ts` now say what the code does | read |

The same walk found the other two hens' nods a twentieth of a second behind their clucks when the russet hen is poked: the nods are on the clucks' beat now.

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### What the game is

A farmyard morning as one spread of a board book. Four animals are each short of one thing, four plain things lie on a step, and any thing can be used on any animal: twenty cells, each with its own motion, loose bits and sound, fifteen of them wrong uses that work and are funny. The right four bring the full morning; sliding the henhouse door shut brings the night and a new morning behind the door, which opens only when it is touched.

### How the game meets the quality bar

- **Alive at idle:** every animal breathes, blinks and fidgets at its own tempo and shows its want (dust off the pony, the pig trying to roll, the hens peering into the trough); settled animals croon and bubble. `motion.test.ts` holds that every character moves untouched and no two alike.
- **Motion and sound on every touch:** every target, bystander and the bare page answer in the call the press arrives in (`farm.test.ts`), each with a voice, all but the grown-up's corner, 72 pixels of the surface at the top right, which stays silent (`corner.test.ts`, at three surface sizes); no two cells share a sound (`voices.test.ts`). The sounds have not been heard.
- **Weight, squash and follow-through:** per character, from `PERSONALITY`; things squash when pressed, leap in an arc and come back full; the pig wobbles on after every move.
- **Kid-clear silhouettes and tappables:** every target is 130 stage units or more across, over 100 pixels on a tablet, clear of the home control and the grown-up corner; nothing the game brings to rest covers a target (`layout.test.ts`, `overlap.test.ts`, at nine surface sizes).
- **Wordless clarity for ages 2 to 5:** no word, letter, numeral or sign; the wordless check passes. One want in view per animal, one door. A cold playtest proxy on the production build at both ends of the band, above.
- **Wordless idle guidance:** the whole ladder: a ring round what the next move touches, then the ghost hand pressing a thing an animal is short of, then carrying it to that animal, then, with a thing lifted, pressing the animal that is short of it, and pressing the door once the morning is full; it goes quiet after four showings and is held off while an answer or a scene plays.
- **Scenes:** three, on `scene.ts`, each saving its outcome when it starts; any touch ends one and is then an ordinary touch (the second tap of a double tap on the door only rattles it, and a touch in the grown-up's corner is not the child's); none replays on load (`farm.test.ts`).
- **Found as left:** put away at any instant and opened again, the door and the content animals are as they were, and everything short-lived is back in its place (`farm.test.ts`, `state.test.ts`).
- **Age:** `ctx.childAge` sets the first morning's door and nothing else; no age takes the youngest; both ends are open.
- **Frame budget:** the heaviest frame takes 58 draws at rest, 68 in the heaviest cell, 72 through the scenes and 74 with everything at once (by day and by night), against about 80, where a draw is one stamp or one live fill or stroke. One full-surface draw in every frame, the night's included. Pixel ratio capped at 2; no shadow, blur or post pass in a frame; adaptive tiers and the grown-up overlay from the template. **No frame rate has been measured:** the build machine has no graphics card. It needs the shared probe and a real tablet.
- **Overlap:** a canvas game, so model tests stand in for the intersection audit (`overlap.test.ts`).
- **Procedural assets only:** everything is painted and synthesized in code; the egress check passes.

### What was measured, and on what

- Draw counts, by `frameBudget.test.ts` on a recording canvas: 58 at rest, 62 with the carry shown, 68, 72 and 74 as above.
- Stills at 1180 by 820, 1024 by 768 at pixel ratio 2, 1400 by 700 and 844 by 390 at pixel ratio 2, from a headless browser on the build machine.
- No frame rate, and no device.

### The learning claim

The game has no learning goal and makes no learning claim.

### Defaults taken for the owner

- A smiling sun, whose height is the world's result and carries no marks.
- The first morning's door by age, as the sheet has it.
- Shutting the door starts the night and the new morning, at any moment of any morning.

### What the next builder should know

- Paint pieces once at the sharpest tier and stamp them smaller at a lower one: a tier change then repaints one page and causes no hitch.
- Draw order by where feet stand has to include the furniture. Anything a character can walk behind is a piece, not print.
- Look up what is under a carried thing past the thing itself, or a drop over an animal finds only the thing.
- A brighter or darker time of day is a second page and a second set of stamps, made once under one wash and swapped in; a wash drawn in the frame is a second full-surface draw.
- Read the sheet's small clauses (ears, a strut, where a spark starts, when a peck sounds) against the code before a reader does: each is a promise.
- Put every shared time in one module from the first cell, and tag every note with its maker: a test can then walk the game and say which note sounds with nothing doing it. Two readings found by eye what that test finds in a second.
- A sound that waits on something of unknown length (a hen arriving, a door that waits) is sent by the model when it happens, never scheduled ahead inside another voice.
- White guidance on a pale ground cannot be seen: give the hand a rim and the glow a colour.
- Read every cell against its sheet line in frames on a paused clock. One still a cell hid a cell that did not do what its line says.
