<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates. The game is built to the sheet as it reads with pairs 51 to 56 pasted; what the lead still runs is listed under "Open".
- Sheet: round 1 of the check came back with 8 findings, each pasted as given; the sheet's hash after is `6f79b129b80664c65ecfe401c8714f7e63e4833410963b1695c9d748a0b4c98f`. Round 2: pairs 3 to 15 pasted by the lead; pairs 1 and 2 refused (a cut survives a lifted finger, as the sheet says, and the game now does that). Round 3: pairs 16 to 45, from reading 1 and the first audit run, pasted by the lead. Round 4: pairs 46 to 50, from reading 2 and the second audit run, pasted by the lead. Reading 3 and the third audit run gave 6 more, 51 to 56. Round 5: pairs 51 to 56 pasted by the lead.
- Toy checkpoint: passed by the lead only. The owner has not seen the game.
- Look in use: Cardboard craft, the first look reserved for the game. The second reserved look was not tried and nothing asks for it.
- The intersection audit, `scripts/intersections/games/box-fort.ts`, has been run four times by the lead with `enforce: true`. The first run: FAIL, 142 open. The second: FAIL, 4 open, 20 allowed, 2 hidden. The third: FAIL, 4 open, 25 allowed, 4 hidden. The fourth, after the third close and with 40 moments: clean, 0 open, 25 allowed, 5 hidden, 5015 samples, 62 pieces, 719 s. The first three are recorded below with what was done, under "The first audit run", "The second audit run" and "The third audit run". Before the fourth run the lead changed the audit tool itself: a reload now clears what the tool had kept of the page before (its positions, prepared pieces and pair results), so a piece of one page is never measured against the next. The builder's stepped check of the same moments, with no browser, also had 0 open at two phases of the frames; it said 0 before the second and third runs too, and each of those found 4, so it is not the audit.
- Open: no performance probe and no frame rate. The lead made a production build for each of the four audit runs; the builder makes none. The machine this was built on has no graphics card.
- Sheet pairs: none waits. Pairs 16 to 56 are pasted and listed under "The sheet against the code".
- The registry row and the README row are added by the lead when the game is taken; the registry row's text ends `ART.md`.
- Reading 1, by one fresh reader who ran nothing: NOT READY, rule 5: 1, rule 6: 18. Reading 2, by another: NOT READY, rules 1 to 5 clean, rule 6: 8. Reading 3, by a third: NOT READY, rules 1 to 5 clean, rule 6: 4. Each is recorded below, under "Reading 1", "Reading 2" and "Reading 3", with what was done for each finding. The third is closed by the third close; no reading follows it, and nobody has read the game since the changes of that close.
- Stills: twenty-one in the game's scratch folder under `stills/`, kept outside the repository, each of a software renderer on a paused clock, seeded, at tier 0. `01` to `20` are from the runs before. One is new, at 1180 by 820: `21` the blanket as a roof over the big box and the small one beside it, with the cat sitting on the cloth on the big lid, its paws on the cloth and not in it, and the heap at the front of the rug with a small box on top.
- To remake a still: the dev server, the address query `?chrome=0&seed=1&tier=0` and the route `#/play/box-fort`, a paused page clock stepped 33 ms at a time, a surface of 1180 by 820 or 1024 by 768, and for a built fort the saved record of `builtFort()` in `testing.ts` written to the game's slot before the page is loaded again.
- Try first: draw a closed shape on the big box; draw half a shape, lift the finger, tap beside the line, and then drag on from where the line stopped; tap the small box; touch the piece that fell on the rug; tap the cat, the baby and the grandmother; drag the small box by its lid, low, to the big box and let go; pull tape from the roll to where the two boxes meet; throw the blanket over two boxes; push a cushion into a box, a second one onto the first, and let another go on the rug; pull the lights off their peg over the corners, and pull back; let the lights go in the air and watch them fall; take a box off the heap; flick the red switch; pull the loose tape end.
- Tests: 28 files, 823 tests, all passing; `test/games.test.ts`, the typecheck, the wordless check and the egress check pass.
- The draw number is 69: the meshes drawn in the busiest frame of every act of the grid and of a built fort in the dark with a cut under way, a piece on the rug and the ghost hand out, counted by a test that holds it under 80. The renderer counted 59 to 65 draw calls and up to 8,824 triangles in the stills; it leaves out what the camera does not see.
- Nobody has listened to the sounds. They are written as notes and scheduled from the model's clock; tests hold the timing, not the taste.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The parts below belong to the block.

### What the game is

A cardboard living room with five boxes, a pair of scissors, a roll of tape, a blanket, three cushions, a string of lights and a wall switch, and a cat, a baby and a grandmother who each use whatever is built. Every cell of the sheet's grid is built as the sheet reads with pairs 51 to 56 pasted: each of the six things used rightly, used wrongly, met by each of the three, and seen with the room dark. A touch is answered when the finger lands; a character's scene follows from the touch and gives way to the next one. A cut the finger lifts from waits on its face, in the save, until the line is closed; a box that tips, folds onto the heap or is taken by a pull has its line run shut first. A box is carried by its lid and cut on its face. Nothing is scored, asked for or ended. The fort is saved as it is built and found as left at any instant.

How the code is laid out, for whoever reads it next:

- `toy.ts` is the game with no browser in it, on one clock. Every sound is queued with the name of the motion it goes with, and a test refuses a sound whose motion is not seen at that instant.
- `play.ts` is the path a touch takes from the Mount: which finger works, what a resting finger gives up, the corner and the home control that answer nothing, and the idle ladder.
- `hands.ts` and `acts.ts` are what the finger does and what the three do; `fort.ts` is the rules of the boxes; `rest.ts` is where everything comes to rest for a given save; `people.ts` is how the three are posed; `targets.ts` is where a finger finds each thing.
- `view/` draws what the model holds and decides nothing. `desk.ts` mixes the sound and shuts a scene's sound in the frame a touch ends it.
- `cases.ts` and `testing.ts` are for the tests only: every act of the grid played through the Mount's path.

### What each wave rule is held by

- One clock for sight and sound: `sync.test.ts` (every sound has a motion that a drawing reads; landings are heard when they land; the same sounds at three frame lengths) and `voices.test.ts` (no delay hidden in a voice).
- A scene ended by a touch is silent from that frame, and a put-away closes all sound: `scenes.test.ts` and `desk.test.ts`.
- Nobody looks at the child: `scenes.test.ts` holds where the baby and the grandmother look in every act; the squeal and the jumping glasses are at the cat.
- A resting contact, a carry that survives a lift, a cut that waits after a lift, a cancel that never acts, and a thing taken only where it is let go: `play.test.ts` and `reading1.test.ts`, through the Mount's path.
- What reading 1 and the first audit run asked for, one named test for each fix: `reading1.test.ts`. Each was seen to fail with its fix taken out.
- What reading 2 and the second audit run asked for, one named test for each fix, through the Mount's path wherever a finger is in it: `reading2.test.ts`, and for what only a drawing shows, the last three tests of `view/diorama.test.ts`. Each was seen to fail with its fix taken out.
- What reading 3 and the third audit run asked for, one named test for each fix, through the Mount's path wherever a finger is in it: `reading3.test.ts`, and for what only a drawing shows, the last tests of `view/diorama.test.ts`. Each was seen to fail with its fix taken out. The change to the audit file itself, a sample between its two reloads, has no test in the game's folder: it is shown by the stepped check alone.
- Nobody goes through uncut board: the last test of `reading2.test.ts` plays every act of the grid and holds the middle of every part of the cat and of the grandmother, as it is drawn bent or upright, out of every face except where that face is cut away.
- Found as left at many instants, parked equal to loaded, nothing on load: `found.test.ts`.
- Targets of 48 px at both sizes, clear of the home control and the corner, touched where they are drawn, and every character's reach inside the frame: `targets.test.ts`.
- The draw number, no answer left out by a tier, every pose value read by the view: `view/diorama.test.ts`.
- Age as a first-visit default only, every saved field, repair: `fortState.test.ts` and `fort.test.ts`.
- No file written and no environment read by a test, no machine path or address in a file, nothing made at module load: `rules.test.ts`.
- The ghost hand's closed window: `guide.test.ts`.

### Reader

Every drawn mark a child of four could take for a letter, a numeral or a sign, and why each is weaker than one:

- The ghost hand's window: a closed square with four soft corners, drawn by a moving hand and gone when it ends. It is closed and has no stem, so it is a window on a box and not a round letter; a test holds that it closes and has four corners.
- The picture frames: a rectangle round a fish and a circle round the cat's face. Each holds a picture and hangs by a strip of tape.
- The seam of the wall: one thin dark line from floor to ceiling with three strips of tape across it. It runs off the frame at both ends, which no letter does.
- The strip of tape beside the switch (`view/room.ts`): one of those three, a pale bar laid crooked across the seam next to the switch plate. With the seam it makes two strokes that cross. One of the two runs off the frame at both ends and the other is a hand's width of torn tape; reading 2 named it as one of the three marks nearest to a sign.
- The tape strips, on the wall, on the heap's sheet and across seams: short pale bars laid crooked, never two crossed and never two side by side with a gap.
- The loose tape end at the fort's corner: one hanging bar that sways.
- The grandmother's crossed needles (`view/cast.ts`): two grey sticks that cross in her hands, a steel X at her chest, and never stop moving. The crossing reads as a sign for a moment in a still; it is the weakest mark here and the motion is what keeps it knitting. Both readings named it.
- Her knitting, the scarf bars (`view/cast.ts`): a teal strip with three pale slanted bars across it, a scarf's stripes. In a still it can read as a ladder or as a tally of three; it hangs from the needles and sways, and the bars are never more or fewer. Reading 2 named it.
- Her glasses: two rings joined by a bridge, on a face, with pupils in them.
- Her cardigan buttons: three dots in a column on her front.
- Her handbag: a soft round blue bag with its strap flopped over to one side. At reading 1 the strap stood up on a square bag as an arch, which is the outline of a padlock; the bag is round now and the strap lies down.
- The ball in the baby's hand: a red disc with a small round shine to one side. At reading 1 it carried a slanted white bar, which could be taken for a sign.
- The block by the baby's knee: a green square with a smaller sunk square on its face. At reading 1 it carried a five-sided yellow mark.
- The light of a hole on the wall when a cushion is in the box: cut off from the floor of the box up to the cushion's top. At reading 1 it was a rim round the hole, so a peep-hole showed as a ring.
- The scrap a second finger flicks up: a small kraft square that turns in the air and is gone at once.
- The strip of tape that curls on one box: a pale ribbon with three waves in it, gone in half a second.
- The line of a cut that waits: whatever the finger drew, as far as it drew it. The game draws none.
- The baby's hair: one dark leaf-shaped curl standing on its head, wider than a stroke and attached to the head.
- The baby's bib and the ball of its rattle: rings of colour on things held and worn.
- The cat's whiskers, brows and the three stripes on its forehead: short strokes on a face, in pairs and in a fan.
- The window's bars: one upright and one crosspiece inside a frame with rain behind them.
- The peg and the switch: a round peg on a round plate, and a rounded plate with one red knob. The hook was a bent arm in the first still of this run and read as an arrow; it is a peg now.
- The bulbs: a dozen coloured squares turned on a thread like bunting.
- The tape roll: a ring with a six-sided hole, lying by the scissors.
- The lid flap of each box: a board with one slot for a finger, as a carton has.
- The scissors' handles: two red rings with holes.
- The books: five coloured spines with nothing on them.
- The holes themselves: whatever the finger drew. The game draws none.

### Template notes

- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen, used as copied.
- `audio.ts`, `guidance.ts`, `overlay.ts`, `rng.ts`, `scene.ts`, `state.ts` and their tests: used as copied.
- `input.ts` and its test: replaced by `play.ts`. The copied module follows one pointer and knows nothing of a second finger, a resting contact or a thing that hangs after a lift. **For the template:** the rule for a resting contact and for a carry that survives a lift is the same in every game of the wave and would sit well in the copied input module.
- `config.ts`: the backdrop, a tier table of four rows (pixel ratio, rain, soft shadows), one place in `LADDER`, one row in `FIRST_VISIT`, and the age from which the big box stands alone.
- `state.test.ts`: the ladder has one place by design, so the test that reached for a second place now says so. **For the template:** a game with one place has to edit this test; a test written against `LADDER.length` would need no edit.
- `stage.ts` and `stage.test.ts`: deleted, and that stands for this game. The copied file fits the fixed units of a canvas 2D stage into the surface and brings a touch back through the same fit; it orders nothing. This game frames its room with a camera (`layout.ts`, `view/fortView.ts`) and has no use for it, as the file's own header says of a three.js game. Nothing depends on it.
- `game.tsx`: became `box-fort.tsx`. The Mount hands every pointer event to the game by its id, the lift and the cancel included. **For the template:** the copied Mount passes neither the lift nor the cancel of a drag to the game, and a game whose finger draws or carries needs both.
- `manifest.ts`: the icon family is `play`.
- `symbols.ts`: absent, the band starts below 6.
- **For the template:** a three.js game has no scaffold for a view that makes nothing at module load. This game makes every material, geometry and texture on first use inside `view/`, draws its painted grain from the seeded stream, and keeps a scene graph that a test can build with no renderer, which is what lets a test count what is drawn.
- **For the template:** a test that plays every act of the grid through the Mount's path and refuses a sound with no motion found more faults here than any other test. It needs each sound to be queued with the name of the motion it goes with.

### The sheet against the code

The sheet was read against the code sentence by sentence after the game was built, and again after each reading. Nothing above the art guide is edited by the builder: where the code is right and the sheet is silent or wrong, a pair goes to the lead.

**Round 2, settled.** Pairs 3 to 15 are pasted: the second finger, the resting finger and the thing that hangs after a lift; the heap at the front of the rug; the cat lying on a fort higher than the big box; the baby going round the back of a box; a box tipping off a stack as high as stacks go and hopping back where the rug has no room; `lights` as box corners; the tangle at the front of the rug; the wary look not stored; no stack higher than the big box with a middling one on it; the overlap test at both sizes; a blanket with no room for its heap back on the sofa; scenes of 1 to 6 seconds; a box the grandmother wears being hers alone. Pairs 1 and 2 were refused: they would have ended a cut at the lift. The sheet has a cut survive a lifted finger, and since reading 1 the game does that.

**Round 3, settled.** Pairs 16 to 45 are pasted by the lead. Each was one sentence of the sheet as it stood, found once above the art guide, and its replacement.

| Pair | What it changes in the sheet | Why |
| --- | --- | --- |
| 16 | How long a line waits and what ends it | Ruling 1: it waits with no limit, through a put-away, and three things end it |
| 17 | The piece falls when the line closes, not when the finger lets go | Ruling 1 |
| 18 | A second finger gets a small answer where it lands | Ruling 9 |
| 19 | How carrying is told from cutting, and what the idle ladder shows once | Ruling 10 |
| 20 | The fallen piece, the ball and the block answer as themselves | Ruling 9 |
| 21 | On a first visit the two boxes stand touching | Ruling 6: tape holds on a first visit |
| 22 | A box is dragged by its lid, stops against what stands in its way, and is not taken up from under another box or the roof | Rulings 10 and 17 (the line of the proxy's finding 3) |
| 23 | The baby's feet show on the side that has room | Ruling 3: never inside a flush neighbour |
| 24 | Wearing a box she stands where it stood | Ruling 15. From the frame: the lane in front of the faces is where pieces and cushions lie and where the cat and the baby cross; a walk in a box would sweep it, and a box that walks is a box a child can no longer build on |
| 25 | A hole too small for her head: she bumps it with her hat on | The moment the audit lacked (ruling 4) |
| 26 | Light lies on the wall; the cat's eyes shine | Ruling 15. From the frame: the light is flat card laid on the wall behind the fort, and the cat at a hole is in front of the fort, where no card can lie without covering the face a child cuts |
| 27 | Tape on one box sticks by its end and curls | Ruling 6 |
| 28 | The cat on a lid the roof comes down on jumps out in front and lands on the roof | The first audit run: the blanket no longer passes through the cat |
| 29 | The grandmother does not tuck the corner in | Ruling 15. From the frame: the roof's corner hangs over the front of the fort; to tuck it she would stand in front of a face that can be cut, which nothing the game sets down may cover |
| 30 | The hum sounds as the roof lights | Ruling 14: one sound for one seen event. A hum for as long as the room is dark would be a sound with no motion |
| 31 | A cushion let go on a box with no hole flops onto the rug in front of it | Ruling 10 |
| 32 | A cushion blocks the light as high as it reaches | Ruling 16: no ring |
| 33 | The string stays on its corners when its end is taken, and comes off one corner for each pull back | Ruling 13 |
| 34 | A box with no room goes back; a cushion or the blanket lies on bare rug. Pair 52 says what else comes back | Ruling 7 |
| 35 | `blanket` with `lump`, the place of its heap on bare rug | Ruling 7, saved state |
| 36 | `cushions` with -3 and `cushionAt` | Ruling 7, saved state |
| 37 | `line`, the cut that waits | Ruling 1, saved state |
| 38 | The cat on the rug lies | Ruling 15. From the frame: sitting up at the left of the rug it would stand in front of the sofa and its cushions, which a finger takes; lying, it hides nothing behind it |
| 39 | The piece lies where it fell, rocks when touched, and is swept by the cat's tail with a scrape; a cut not finished is no longer in the list of what is not stored | Rulings 8 and 1 |
| 40 | The grandmother behind a stack is reached by the arm of her chair | Ruling 11 |
| 41 | A box she sits in is not taken from under her | Ruling 12: what a pull may not take |
| 42 | Which scene is shortest and which longest | Ruling 15: every scene is 1 to 6 seconds, held by a test |
| 43 | The loose tape end hangs beside the fort, over no face, and acts on a pull | Ruling 5 |
| 44 | The cat that was in a box taken apart is on the rug, not sitting | Follows from 38 |
| 45 | The cat hops off its cushion as the cushion goes back, with a hop and a landing | The stepped check: the cushion was pulled out from under the cat through its tail. Ruling 14: the two sounds are said |

**Pairs 46 to 50, pasted by the lead.** Each is one sentence of the sheet as it stands, found once above the art guide, and its replacement. They come from reading 2 and the second audit run.

| Pair | What it changes in the sheet | Why |
| --- | --- | --- |
| 46 | A tap within reach of a waiting line pokes a peep-hole and the line still waits; only a drag from there takes the line up. A box let go to tip is a fourth thing that ends a waiting line: it is closed the short way where the box hangs, before the box goes over | Rulings 5 and 10 of the second close |
| 47 | A box let go with the finger over another box goes onto it however low it was carried; with no room on the rug it goes onto the nearest box that can bear it; it hops back only where no box can | Ruling 6 |
| 48 | Tape holds a seam when it is let go anywhere along it, stacked or side by side, or within 25 cm of it | Ruling 7 |
| 49 | The cat does not ride a box that tips: it jumps to the highest box that still stands, or down onto the rug | The stepped check: riding it over, the cat's paw was in the board that turned under it |
| 50 | A cushion goes in where another already shows; the cushions in a box lie back behind the cat at a hole of it, and the cat draws back and goes up when one is taken out past it | Ruling 4, and ruling 1 for the first and the fourth of the second run's findings |

**Pairs 51 to 56, pasted by the lead.** Each is one sentence of the sheet as it stands, found once above the art guide, and its replacement. They come from reading 3 and from the builder's last reading of the sheet against the code.

| Pair | What it changes in the sheet | Why |
| --- | --- | --- |
| 51 | Five things end a cut, not four. A box dragged back onto the heap or taken by a pull has its waiting line run shut where it hangs or stands, as a box that tips does. And a line of 1600 points, 15.9 m of it or more and over twice round the biggest face, closes the short way under the finger, which then starts a new one | Rulings 4 and 5 of the third close |
| 52 | A box with no room is the one thing that goes back for want of a place; the heap lies smallest on top; a thing handed to one of the three is back where it was once they have done with it, or at once, with their own small noise, when they are busy in or at a box | Rulings 3 and 9 |
| 53 | `line` holds up to 800 points, a longer line every second point | Ruling 5, saved state |
| 54 | A largest state, with a line of 800 points, is under 20 KB | Ruling 5: the largest record a test builds is 19353 bytes |
| 55 | The beats of a pull: a line that waits on the highest box is run shut where the box stands and its piece falls, before the box comes free | Ruling 4 |
| 56 | What a pull saves when it starts includes `line`, which waits no longer once its box is taken | The builder's last reading: the line is out of the save from the start of the pull |

Three knocks, each lower, and five pieces on the rug with a sixth pushing the oldest, needed no pair: the sheet said both and the code now does both.

Built, and so needing no pair: one bell and one lighting for each hole; a tink for each bulb as the string settles; twelve plinks for twelve bulbs; the baby trying a toy that springs back a second time; the baby pointing with one arm; the cat following what it watches with its whole head; every loose strip pressed in one walk; the disc of a peep-hole rolling on its edge to the bare side; every scene between 1 and 6 seconds.

Read and found to agree: the age rule and both first-visit layouts, every saved field but the three in pairs 35 to 37, the error as a consequence, each character's likes and dislikes, each scene's cause, beats and what it saves when it starts, and where things come to rest.

### For the owner to decide

The nearest things in the game to praise, blame, a count, a prompt and a punishment come first.

- **Nearest to praise.** When a hole is cut the cat looks out of it, the baby squeals and the grandmother's glasses jump. All three are looking at the cat or the hole, never out of the frame, and a test holds where each looks. The cat also purrs when it settles on the highest box. Is any of this still too close to applause for the child?
- **Nearest to blame.** The baby frowns at a toy that springs back from a slot too small for it, and the cat looks from a distance at a hole it stuck in. Both look at the thing, not at the child. The grandmother turned out of her box by a pull, or handed a cushion or the blanket on the box she wears, looks down at her knitting and her needles click once: until reading 3 she clucked with her brows up.
- **Nearest to a count.** The baby posts its three toys one by one; in the dark each hole lights with one bell and the bulbs come on in a rising run. Nothing is shown as a number and nothing is kept.
- **Nearest to a prompt.** After a few seconds with no touch the scissors wriggle and a ghost hand takes them to a box and goes once round a window. After a first hole the hand shows, once, a box carried by its lid; once two boxes stand with a hole in one it shows, once, a press on the wall switch. A child who has done either already is not shown it. The hand shows a few times, further apart each time, and then stops for good until the child touches something.
- **Nearest to a punishment.** A box that finds no room on the rug and no box that can bear it goes back to where it was taken from: it is the one thing in the game that goes back for want of a place. Since reading 2 a box let go with the finger over another box goes onto it however low it was carried, and one with no room on the rug goes onto the nearest box that can bear it. Since reading 3 the heap lies smallest on top, so the box a finger takes off it is one that has a place whenever any box on the heap has one, and a first visit at four reaches four standing boxes. What is left: with both small boxes standing and a middling box on the big one, the last middling box has nowhere to stand and folds back onto the heap; with a small box let go in the middle of the big lid, neither middling box has a place until the small one is moved along; and boxes taped together, which stand only on the rug, go back where there is no room for them all. Two other things come back, neither for want of a place: a third cushion is fired back out of a full box, and a cushion or the blanket let go on the box the grandmother wears is let go on her and is back where it was at once, with a click of her needles. The cat sticks in a hole that is too small; a box the grandmother sits in creaks and stays. Each is the material doing what it does, and each can be done again at once. The way back is the one that can feel like a refusal: should it stay?
- **The rug on a first visit.** The ruling asked for room on the first-visit rug to put one box down again somewhere other than where it was. It is not there. The rug between the baby and the grandmother is 3.35 m, and the big box and the small one, which stand touching so that tape holds between them, take 3.3 m of it. Taken up, the small box stands anywhere along the top of the big one, or back where it was; once it is up, the rug to the right is free. Room for a second place on the rug needs a narrower box, a wider rug or a first visit with the small box already on the big one, and each changes the first frame: that is the owner's to choose.
- **The room dark.** The sheet has light spill from the holes; the look's row says nothing is lit by a lamp. The game paints the light as flat pale-yellow cut-outs laid on the wall, placed by one rule, and lights nothing. `08-dark-1180.png` shows it. The owner may want it otherwise.
- **A cut waits.** A line the finger lifts from waits on its face for as long as nothing ends it, and is in the save. A finger that lands within 20 cm of either end and drags carries on; one that only taps there pokes a peep-hole and the line still waits; a bite anywhere else finishes the waiting line the short way first, and so does letting its box go to tip, dragging it back onto the heap or pulling the tape end that takes it. A line of 1600 points closes the short way under the finger. Is 20 cm the right reach for a child of four, and should a line that has waited a whole visit still be there on the next?
- **Carrying by the lid.** A drag that starts on the lid or the top of a box carries it; one that starts on its face cuts it. The ladder shows the carry once. A child who drags a box by its face cuts a line across it.
- **The look.** Cardboard craft, as in the stills. Is this the room, and are the three large enough and funny enough?

## Pass log

One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | The funny frame at 1180 by 820 (`01`) | The baby's arm lies across the box I want to cut. The piece that fell is dark on its back and looks like a hole in the rug. The scissors stick into the box and into the floor. The right side of the wall is empty. | Rattle moved to the far arm; the piece is kraft on both sides; the scissors rest lower and flat; a cat portrait on the right wall, the shelf and the picture moved. | Not measured. 37 draw calls. | The cat sits under the home control. |
| 2 | The frame at rest at 1180 by 820 (`02`) | The cat is under the round button, so I would press the button to pet it. One scissor handle is in the floor. I cannot see the rattle. | The cat's seat moved left of the middle; scissors half open and raised; the rattle held up like a torch; the wall pieces moved with the cat. | Not measured. 44 draw calls with the glow, the hand and its trail. | Nothing found at rest (`03`). |
| 3 | The cut, the funny frame, and the funny frame at 1024 by 768 (`04`, `05`, `06`) | The line I cut is black and easy to see and the scissors are on it. The cat's face in my window is the best thing in the room. When the baby squeals its rattle goes out of the side. | The rattle arm now shakes in a squeal and no longer swings out. | Not measured. 37 to 40 draw calls. | At 1024 by 768 the rattle still left the frame in a squeal. Closed in Run 2: the test of every reach holds it inside at both sizes. |
| 4 | A fort with every material, by day, at 1180 by 820 (`07`) | My house has two floors, a striped roof, flags and two pillows inside. There is an arrow on the wall by the cat picture and I do not know what it points at. The grandmother has the cat picture on her hat. | The hook is a round peg on a round plate; the portrait hangs higher, clear of the hat. Seen again in `08`. | Not measured. The renderer counted 55. | The roof hangs from the high box to the low one as a steep band, which reads as a slide. |
| 5 | The same fort with the room dark (`08`) | The windows are yellow and the flags shine and the cat has torch eyes. Yellow squares are stuck on the wall behind the cat. The bit of tape I pull is grey and I cannot find it. | The loose tape end shines with the strips. Seen again in `13`. | Not measured. The renderer counted 59. | The light cut-outs sit where one rule puts them: one is half behind the cat and one over the window frame. |
| 6 | The cat stuck, the baby in a box and the grandmother wearing one, at 1024 by 768 (`09`) | The cat's bottom is in my hole and its legs go round. Granny is wearing the box and still knitting. Where is the baby? There is a pink lump by the box. | Both of the baby's feet now show past the left wall of its box. Seen again in `11`, where the proxy leaves the baby in a box. | Not measured. The renderer counted 44. | With the cat in the nearest hole nothing of the baby but its feet shows, as the sheet has it. |
| 7 | The end of the proxy's run (`11`) | Granny is inside my big box and the cat is in there with her and her knitting is on the cat's face. I put the blanket on and her head came out of the roof. | A box the grandmother wears is hers alone: its roof, cushions, toys and tape come free as she comes up in it, the cat and the baby keep out of it, nothing rests on it, and a thing let go on it is let go on her. Seen again in `12`: she knits in the window I cut, the cat sits on the small box, and both of the baby's feet show. | Not measured. The renderer counted 47. | Her knitting hangs out of a window that is cut in front of her hands. A baby in a box that stands flush against another has its feet inside the neighbour. |
| 8 | Reading 1, the first audit run, and four new stills (`14` to `17`) | Reading 1: a padlock for a handbag; a tape end that acted on a touch and lay over a face; tape that sprang back on a first visit; a cushion and the blanket that went back off bare rug; a piece that shrank away by itself. The audit: 142 open, and its taps on the three had hit the middle of the screen. In the new stills: the piece of a large window lies small on the rug, and the grandmother bent to a low door reads as folded. | One set: nothing passes through anything, and everything drawn answers. The cut waits after a lift; a box is carried by its lid; the piece is a thing and is swept by the cat's tail; a cushion and the blanket lie on bare rug; the tape end acts on a pull and hangs beside the fort; the string comes off a corner at a time; the grandmother is reached by her chair's arm; and every motion of the three was laid out again so that none crosses board, floor or another thing (listed under "The first audit run"). | Not measured. Draw number 69 by the model; the renderer counted 59 to 65 calls in the stills. | Listed under "What is still weak". |
| 9 | Reading 2, the second audit run, and three new stills (`18` to `20`) | Reading 2: a cushion let go on a cushion in a hole flopped on the rug; a tap beside my waiting line did nothing; the small box would not go on the big one unless I held it high; tape missed a seam I let go on. The audit: the cat's ears through a cushion, its paw in the roof, the scissors in the block. In the new stills: the small box sits at the right end of the big one, where the finger let go, and the cat lies on it; the tape lies along the seam; the cushion is out in the finger and the cat is up over the lid, clear of it. | One set: the simplest move works, and nothing passes through anything in the states a reload had been hiding. A box goes onto the box the finger is over; tape holds along the whole seam; a tap always pokes; a cushion goes in where one shows; three knocks; five pieces; a line on a box that tips is closed where it hangs. The cat draws back from a cushion taken out past it, sits on the roof and not in it, jumps down from a box that tips, and comes down short of the baby; the block is pushed along the rug behind the scissors. | Not measured. Draw number 69 by the model; the renderer counted 61 and 63 calls in the two new stills it was read for. | Listed under "What is still weak". |
| 10 | Reading 3, the third audit run, and one new still (`21`) | Reading 3: I let the lights go and they were on the floor at once, I did not see them fall; the heap kept giving me the box that would not fit. The audit: the blanket inside a small box and in the cat's paw, in frames where the blanket was not there. In the new still: the cat sits on the red check cloth on the big lid with its paws on the cloth, and a small box lies on top of the heap. | One set: what is let go is seen to arrive, and what waits is never dropped. The string falls bulb after bulb into its tangle and is heard when it lands; the heap lies smallest on top; a waiting line is run shut before its box folds onto the heap or a pull takes it; a cut goes round the whole big face as one cut; the grandmother clicks her needles and looks at her knitting where she clucked; a lost capture is a cancel; a roof saved over a lid that carries a box slides off on load; the cat hops up onto any box from out in front; the grandmother leans back under a lifted box only once its rim is above her hat, and keeps her knitting gathered up for as long as she is down. The audit file takes a sample between its two reloads. | Not measured. Draw number 69 by the model; the renderer counted 60 calls in the new still. | Listed under "What is still weak". |

The full frame, written down from `03` and `05` in Run 1 and still true in `07`:

- **Empty.** About a sixth of the frame is plain: the strip of wall above the sofa on the left and the front of the rug. Both are painted board with grain and neither is bare backdrop. The front of the rug is where the piece falls and where the scissors, the roll and the heap lie.
- **Funny.** The cat's flat round face filling a square window with its ears just inside; one cat eye at a peep-hole; the cat's back end pedalling in a hole; the baby with its mouth wide open and both arms up; the grandmother wearing a box round her middle and knitting on; her glasses jumping off her nose; the crooked fish picture next to a formal portrait of the cat.
- **Alive.** At rest the rain on its threads sways, the cat flicks its tail, twitches an ear, washes a paw or yawns, the baby rocks, kicks, gums its rattle or cranes to see, the grandmother nods off, peers over her glasses, lets them slip or hums. No two of them share a motion and none repeats twice running. All three follow the scissors with their eyes.

### The cold playtest proxy

A script, not a child. It was run once on the dev page, since this run was allowed no production build: a first visit with nothing saved, 1180 by 820, the top tier pinned, one frame for every 80 ms of the page's clock. It touches what a child of four who has been told nothing might: the thing that moves, then the faces, then the big box, then whatever else is large. After each touch it writes down what the save changed to and how many sound sources were started.

In 10 s with no touch nothing sounds and nothing is saved. The scissors wriggle where they lie and a ghost hand takes them once round a window on the big box (`03` shows the hand out; `10` falls between two showings). What the scene invites: the red scissors, the one bright thing in the frame, in front of the one bare box.

| Touch | Sound sources started | What the save shows afterwards |
| --- | --- | --- |
| Taps the scissors on the rug | 4 | Nothing: they snip the air |
| Drags from the scissors up onto the big box and round | 58 | A window in the big box; the cat is looking out of it |
| Taps the cat | 6 | The cat is back on top |
| Taps the baby | 25 | All three toys are posted into the big box; the window is too high for the baby to follow |
| Taps the grandmother | 16 | She took the window for a door and wears the big box; the cat is on the rug |
| Pokes the small box three times | 7, 10, 19 | Three peep-holes; the cat is at the last |
| Scribbles a zigzag across the big box | 50 | A jagged window; the cat is at it |
| Drags a sofa cushion to the big box | 4 | Nothing: the cushion is back on the sofa |
| Drags the blanket over the boxes | 3 | A roof over both boxes |
| Presses the red switch | 20 | The room is dark |
| Pulls the lights off their peg across the fort | 2 | The string hangs over one corner |
| Taps the window, then the fish picture | 4, 4 | Nothing: the scissors snip the air |
| Taps the top right corner | 0 | Nothing, as meant |

Every touch in the game's part of the surface started a sound, and none of the first five needed a second try. The unclear moments, as the script's log and `11` show them:

1. The grandmother wore the big box while the cat was still at a hole in it, and a roof thrown over it afterwards lay across her shoulders with her head through it. Fixed, as pass 7 has it.
2. The cushion dragged to the big box went back to the sofa. It had been let go on the grandmother, seen through the window, and she was busy. With the fix this is a rule: a thing let go on the box she wears is let go on her, her needles click as she looks down at them (she clucked until reading 3), and it goes back. It is still a cushion that did not go into a box, and a child may try twice.
3. The script could not take the small box by its lid once the roof lay on it. The sheet did not say so, though this line once said it did; pair 22 says it: a box that carries another box or the roof shows no lid and is not taken up until what is on it is taken off. A box under a roof shows no lid flap, which is what shows a child that it is not for carrying.

The script was not run again after the fix: the run allowed it once. The fix is held by three acts added to the grid that every test plays, by the tests of `fort.test.ts`, and by `12`.

### What is still weak

What a child would notice, the first first:

- A drag that starts on the face of a box cuts it; only the lid and the top carry it. The ladder shows the carry once, after the first hole, and a child who has not waited for it will cut a line across the box they meant to move.
- On a first visit at four the two boxes fill the rug. The small box goes onto the big one from any drag that ends over it, and that is the one new place it has: let go anywhere else it is back where it stood, or on the big box. Nothing shows a child that the top of the big box is where it goes. The second small box, which is the first one off the heap, stands on the rug only once the first is up.
- A box let go low with the finger over another box travels up and over onto it by itself, in under half a second. It is the move a child meant, and it is a box that moves after the finger has gone.
- With both small boxes standing and a middling box on the big one, the last middling box off the heap has nowhere to stand and folds back onto the heap. And with a small box let go in the middle of the big lid, neither middling box has a place until the small one is moved along: the heap then offers a small box while it has one and after that a box that folds back. These are the places left where the game says no on a first visit.
- A line that waits is carried on only by a drag that starts within 20 cm of one of its ends. A drag that starts further off starts a new cut, and the waiting line is finished the short way: a piece falls that the child did not finish drawing.
- A box that tips with a line waiting on it hangs where it was let go for up to 1.2 s, while the cat gets off it and the blades run the line shut, before it goes over. The same wait comes before such a box folds onto the heap, and before a pull takes it. A child may take the wait for a box that stuck.
- The string of lights let go in the air goes to the front of the rug however far from it the finger was: it falls bulb after bulb, out and down, in a third of a second or a little more, and lands with its glassy rattle. It is seen to fall now, and it is still a string that travels across the room after the finger has gone.
- A box that folds onto the heap keeps its holes in view until it lies flat, and is fresh board from then: the holes go in one frame as it lands.
- The cat on a box that tips, where that box would be the highest thing left, jumps down to the rug at the far left of the room: a long hop across the whole frame.
- The cushions in a box sink back into it as the cat comes to a hole of that box, with a puff, and come forward when it has gone. A cushion a child had just pushed to a hole moves away from it by itself.
- Taking a cushion out of a box sends the cat at a hole of that box back up onto the lid: a child who wanted the cushion loses the cat's face in the window.
- The block is pushed along the rug close under the crawling baby's chin, so that it stays behind the scissors and the roll: it is half hidden by the baby's head on the way.
- The piece of a cut shrinks to fit the strip of rug it falls on when the hole was wider than that strip. A large window drops a smaller board than was cut.
- A tall stack at the right end of the rug hides the grandmother in her chair. She is reached by the arm of her chair, and nothing shows a child that the arm is hers.
- The grandmother turns only a little towards where she walks, so that she crosses nothing on the rug: she walks nearly facing the room.
- Bent to a door that is too small for her, the grandmother is a flat figure seen nearly edge on: she reads as folded over, with her hat hung on the board above her (still `16`).
- A cushion that lies flat on the rug is drawn shorter from front to back than it stands tall on the sofa, so that it lies between the scissors at the face and the lane the grandmother walks.
- The cat hops off the cushion it curled up on as the cushion goes back to the sofa: its nap ends with the scene.
- The baby in a box shows only its feet until it peeps out.
- A cushion or the blanket let go on the box the grandmother wears goes back where it was, with a click of her needles as she looks down at them. Turned out of a box by a pull she makes the same click and no more: it is a small answer for someone who has just been tipped out.
- A line of 1600 points, over twice round the biggest face, closes the short way under the finger and a new one starts: a child who scribbles one line for a very long time meets it. A waiting line of more than 800 points is saved by every second point, so the next visit finds it a hair less exact.
- If a larger hole that reaches the floor is cut in a box while the grandmother sits in it, she is moved to sit behind the new door at once, with no motion.
- The baby on its way round a box can pass the cat where it lies on the rug at the left: the two are drawn one in front of the other, close.
- Thrown over a high fort, the blanket leaves the top of the frame for a moment on its way.
- In the dark the light on the wall is where a simple rule puts it, and can lie half behind the cat.
- A roof between a high box and a low one hangs as a steep band.
- Taken off a roof the cat sits on, the blanket is in the hand at once: it is not seen to slide out from under the cat.
- Within one sound the notes of a tread, a rattle or slapping palms follow fixed gaps. The motion beside them starts with the sound on the same clock and is not locked to each note.
- Nobody has listened to the sounds.

The rest:

- The audit has been run four times; the fourth, after the last fixes, was clean (clean, 0 open, 25 allowed, 5 hidden, 5015 samples, 62 pieces, 719 s). The builder's stepped check plays the model with no browser, with the shell's storage and, since the third run, the audit's own reuse of a piece from one page to the next; it measures centres and boards as the audit's geometry test does and cannot see a fault that only the renderer makes. It said 0 before the second run and 0 before the third, and each found 4: what it had missed each time, and why, is under "The second audit run" and "The third audit run". A third thing it does not play may exist.
- A touch beside a held pointer, which the audit file now makes for the second finger, was tried once in a browser on the dev page: the cut went on and the touch changed nothing. It has not been through the audit's own driver.
- In the first audit run the taps meant for the cat, the baby and the grandmother landed in the middle of the screen: the file looked for them by names nothing is drawn under. So that run never saw their scenes. The file now finds each of them by a part that is drawn and stops if it finds nothing.
- The draw number is a count of meshes, 69, not the renderer's count of the same frame.
- No frame rate has been measured, and no build has run on a tablet.
- The margins at the frame's edges are small: the cat on the rug at the left, the grandmother at the end of her lane on the right, and the cat lying on the highest fort under the home control.
- The proxy is a script, and the stills are of a software renderer. The proxy was not run again.
- The allow list of the audit file keeps 13 entries, each for a contact the game makes on purpose, each with its reason and, where a depth can be measured, a cap at the depth the stepped check measured. Two of the caps are too wide to catch anything: the cat's own parts at 1 and the grandmother's own parts at 1.05. The third run allowed 25 contacts under the same 13 entries, with the cat's own parts then capped at 0.95; whether the real audit measures every depth within its cap in the moments added since is not known until it is run.
- The audit takes a piece it has prepared from the sample before when its name and version are the same, across a reload too, and it seeds the page's random numbers so that a reloaded page names its geometries as the page before did. The audit file now keeps clear of that by sampling between its two reloads. A piece that is not rebuilt every frame and has the same name, version and place on two pages with different contents could still be measured as it was on the page before: a face with other holes of the same number of triangles is the nearest case. Clearing what is prepared when the page is loaded again is a change to the audit tool, which is the lead's.

### Reading 1

One fresh reading of the folder against its sheet, by a reader who ran and wrote nothing. Its verdict, as given:

> A child would notice: 4
> A reader of the code would notice: 14
> NOT READY: rule 1: 0, rule 2: 0, rule 3: 0, rule 4: 0, rule 5: 1, rule 6: 18

Rules 1 to 4 (official wording, web addresses, names, record ids in the build) were clean. What it found, and what was done:

**Rule 5, drawn marks.** One counted and three not counted.

| Finding | Done |
| --- | --- |
| The handbag is a blue block with an arch standing on it: the outline of a padlock | A soft round bag with its strap flopped over to one side |
| The ball carries a white slanted bar | A round shine to one side |
| The block carries a five-sided yellow mark | A smaller sunk square face |
| With a cushion in a box a peep-hole's light on the wall is a ring | The light is cut off from the floor of the box up to the cushion's top; no rim is drawn |

**Rule 6, a child would notice.**

| Finding | Done |
| --- | --- |
| The tape end acts on the landing, and its spot lies over the lower right of the right-hand box | It is pinched on the landing and acts on a pull of 25 cm; it hangs beside the fort's right wall and its spot is over no face, at both sizes |
| Tape between two boxes springs back on a first visit: the boxes stood 4 cm apart | The first two boxes stand touching; a strip that finds no seam sticks to the one box by its end and curls before it springs back |
| A cushion or the blanket let go on bare rug goes back | Each lies where it was let go: the cushion flat in front of the boxes, the blanket in a heap. A box with no room is the one thing that goes back for want of a place |
| The piece slides off and shrinks to nothing by itself, with no sound, and at the start of any scene | It lies where it fell and rocks when touched. The cat sweeps it under the sofa with its tail on its way to a newer hole, with a scrape. Up to five lie; a sixth pushes the oldest under the sofa as it lands |

**Rule 6, a reader of the code would notice.**

| Finding | Done |
| --- | --- |
| One bell and one lighting for each box, not each hole | Built: each hole lights in its turn with its own bell |
| No light lies on the cat | Pair 26 |
| The roof's hum is one sound, not "while the light is on" | Pair 30 |
| The grandmother does not tuck the corner in | Pair 29 |
| The baby does not try again | Built: the toy springs back twice, the second time higher, and the baby frowns at each |
| Wearing a box she does not walk on | Pair 24 |
| The cat follows with its pupils, not its whole head | Built: sitting, its head turns and leans to what it watches, and swings with a bulb it swats |
| One tink for each corner caught, none as each bulb settles | Built: a tink for each of the twelve bulbs as the string settles |
| Scenes run from 0.45 s to about 9 s | Built: every scene is 1 to 6 seconds as it is written, held by a test over every act, a fort with every seam taped, and the dark |
| "Every loose strip" is the first four | Built: she presses every strip in one walk |
| Six plinks light twelve bulbs | Built: twelve plinks, one for each bulb |
| The cat on the rug lies | Pair 38 |
| The baby points with both arms | Built: one arm points, the other keeps the rattle |
| The disc slides flat | Built: it rolls on its edge to the side where the rug is bare, and lies down |

**The pasted sentences.** "Scenes last 1 to 6 seconds" did not hold and now does. The baby "into" the lowest box holds loosely still: the baby lies behind its box, hidden by it, with its feet out past the wall, and is never inside the board. Pair 23 says which wall.

**The walk.**

- A touch on the fallen piece, the ball or the block is answered by that thing, not by a snip of the air.
- A second finger is answered where it lands.
- A box is taken by its lid flap and by the top in front of it; the lid is 48 px or more as drawn at both sizes, and the ladder shows the carry once after the first hole.
- A cushion let go on a box with no hole flops onto the rug in front of it, where it is seen.
- The ladder shows the switch once when two boxes stand with a hole in one.
- Not changed: every let-go waits 0.3 s, which is the wave's rule for a carry; the cat shows at a new hole 1.4 s after the cut; the grandmother walks 2 to 3 s before her gag, and a second tap ends the scene at its last pose.

**Found as left.**

- A cut half made is kept: the line is in the save, a put-away with the finger down leaves it waiting as far as it got, and the next visit carries on with it.
- A box taken up and put back, by a plain tap of its lid, a touch taken away or a put-away, leaves whoever was in it or on it where they were: the cat rides, the baby crawls off only once its box is dragged away and comes back if the box does, and nothing is saved in between.
- The reason given here for deleting `stage.ts` was wrong and is corrected under "Template notes".

**The audit file.**

- The eight states it lacked are moments now: the cat's whole head at a hole, the baby patting a box, the cat and the baby using a tunnel, her bump with her hat on at a hole too small for her head, a taped group carried, someone at a box that a pull takes, a cushion taken out through a hole, and a box with no room that goes back.
- The three allow entries that excused what a child would see are gone. The cat goes over the back edge of its lid and down behind the box, and comes back up the same way. The grandmother steps under the rim of a box that is lifted over her head, and goes in and out of a box by its door on her knees. The baby lies with its feet on a side that has room, and no box is set down on them. What is left of those three entries names the face alone, where a hole is.

**Also.**

- A touch on the draped string's end leaves it on every corner; pulled back the way it came, it comes off one corner for each pull.
- The giggle as the baby sits back down has a motion: it bounces and an arm goes up.
- `toy.taken` is read: the ladder does not show a move the child has made already.
- The lines of this file that reading 1 named as stale are rewritten: the status block, "What the game is", the pairs, and the line of the proxy's third finding.

### Reading 2

A second fresh reading of the folder against its sheet, by another reader who ran and wrote nothing. Its verdict, as given:

> A child would notice: 4
> A reader of the code would notice: 4
> NOT READY: rule 1: 0, rule 2: 0, rule 3: 0, rule 4: 0, rule 5: 0, rule 6: 8

Rules 1 to 5 were clean. Under rule 5 it named the three marks nearest to a sign: the grandmother's crossed needles, the bars of her scarf and the strip of tape beside the switch. All three are in the "Reader" list above.

**Rule 6, a child would notice.**

| Finding | Done |
| --- | --- |
| A cushion let go on an opening where a cushion already shows flops on the rug; the acts hid it by letting go on board and setting `cushions` by hand | Let go on a cushion that shows in a box, it is let go on that box: it goes in beside it, or is fired out of a full one. The acts let go on the opening, and where play can put a cushion in a box, play does |
| A tap within 20 cm of an end of a waiting line pokes no peep-hole | A tap always pokes. A finger that lands within reach of the line and lifts has poked a peep-hole beside it and the line still waits; one that drags three cells or more takes the line up from the end it landed near. Pair 46 |
| At four the first-visit rug is full, and a box stands on the big one only when it is let go high above it | Let go with the finger anywhere over a box, at any height, a box goes onto that box; with no room on the rug it goes onto the nearest box that can bear it; it goes back only where no box can. Pair 47. Room for a second place on the first-visit rug is not made: see "For the owner to decide" |
| Tape let go more than 40 cm from the middle of a stacked seam counts as no seam | The reach is the seam's whole length and 25 cm to either side of it, for a seam under a stacked box and for one between two boxes side by side. Pair 48 |

**Rule 6, a reader of the code would notice.**

| Finding | Done |
| --- | --- |
| The sheet says three knocks, each lower; one is cued | Three, each lower, and each is the box coming down: on its edge, over onto its side, and to rest, with a small spring between |
| Six pieces can lie and the seventh pushes the oldest | Five lie, and the sixth pushes the oldest as it lands |
| A waiting line stays saved when its box tips and is not drawn, so a later bite drops a piece from a face that showed no line | The line is closed the short way before the box goes over: the box hangs where it was let go, the cat gets off it, the blades are seen and heard to run the line shut, the piece falls from the face where it hangs, and then the box rolls. In the save the line is closed at once, so a put-away at any instant of it finds the hole cut. A line waits only on a box that stands upright; the repair of a saved fort holds that too. Pair 46 |
| The heading over pairs 16 to 45 said they wait | It says they are pasted |

**The audit file.**

- The five entries that excused the cat, the grandmother and a posted toy at any face name the cut face now. A face is drawn under the name of a cut face from its first hole on and under no other, which a test holds, so a face with no hole excuses nobody. Where in a cut face the hole is, the audit cannot tell: the last test of `reading2.test.ts` holds that through every act the middle of each part of the two of them is in a face, or passes one, only where it is cut away.
- The two entries for parts of one figure have a cap each, at the depth measured over a whole run, rounded up.
- The five moments it lacked are there: a cushion let go on an opening that shows a cushion, a tap beside a waiting line, a box tipping with a line waiting, tape on a stacked seam, and a second finger while one cuts and while one carries. The second finger is a touch beside the held pointer.

### Reading 3

A third fresh reading of the folder against its sheet, by another reader who ran and wrote nothing. Its verdict, as given:

> A child would notice: 2
> A reader of the code would notice: 2
> NOT READY: rule 1: 0, rule 2: 0, rule 3: 0, rule 4: 0, rule 5: 0, rule 6: 4

Rules 1 to 5 were clean, and the fixes of the pass before and the five pasted pairs were all found in the code. No reading follows this one.

**Rule 6, a child would notice.**

| Finding | Done |
| --- | --- |
| The string is not seen to fall: let go anywhere, it is drawn in its tangle in the same frame | Let go over nothing, it falls bulb after bulb, out to the front of the rug and down, over 0.3 s and 0.1 s more for each metre of height, and the glassy rattle sounds when it lands. Let go by the hook it swings back onto it in 0.2 s. A put-away during the fall finds it in its tangle, and a finger that lands on it takes it up from where it is |
| The last small box is buried: the heap hands out the lowest id, and on a first visit at four with a middling box on the big one, the only box offered is one that folds back | The heap lies smallest on top, and of two the same size the lower id on top. A smaller box can stand wherever a bigger one can, so the box a finger takes has a place whenever any box on the heap has one: a test plays 120 runs of carries from the first-visit fort and holds it, and another reaches four standing boxes on a first visit at four. Pair 52 |

**Rule 6, a reader of the code would notice.**

| Finding | Done |
| --- | --- |
| A waiting line is dropped, with no piece, when its box folds onto the heap or is taken by a pull | It is closed the short way first, as before a tip: the box hangs over the heap, or stands while the strip rips, the blades are seen and heard to run the line shut, the piece falls, and then the box goes. The box shows its face as it was until it lies on the heap, and is fresh board from then. In the save the line is closed and the box on the heap from the start, so a put-away at any instant of it finds what the scene ends with. Pairs 51, 55 and 56 |
| A fifth ending: at 360 points a cut closes under the moving finger | The limit is 1600 points, so that a cut round the whole big face, which a test makes, is one cut; the saved line holds 800 points and a longer one every second point, and the largest record is under 20 KB. What is left of the limit is said in the sheet as the fifth ending. Pairs 51, 53 and 54 |

**Engagement.** The grandmother clucked with raised brows when a pull turned her out. Her needles click once now and she looks down at her knitting for 1.6 s, and the same when a cushion or the blanket is let go on the box she wears. A test holds her brows down and her eyes on her hands for that long.

**Hands.** `lostpointercapture` had no handler. A capture lost on a finger the game still follows is handled as a cancel is; one test holds the listener and that a cancel before and after a lift never acts.

**The audit file.** The three moments whose names said less than they play are renamed: the cushion taken out through a hole (it also heaps the blanket on the rug, drops a piece and has the baby push one aside), the grandmother wearing a box (it is also poked, given a cushion and passed by a carried box), and the low drag (boxes dragged low onto the big box, the big box tipping with the cat on it, a heap box with no place, and a box put back). One moment is new: a waiting line shut before its box folds onto the heap and before a pull takes it. The lights moment lets the string go high in the air. That makes 40.

**This file.** The status block no longer says that pasted pairs wait; it records three readings; and "the one thing that goes back" now reads "for want of a place" wherever it is said, with what else comes back said beside it.

**Found by the builder on the way.** What the stepped check found in this close's own changes is under "The third audit run". With the heap's new order the cat, hopping up along a lid onto a small box, came in through the top of that box's face: every hop up now comes in over the lid from out in front. A roof saved over a lid that carries a box slides off when the fort is loaded.

### The first audit run

Run once by the lead, on a production build, before the fixes below. Its output, word for word:

```
build exit 0

> tada-jam@0.1.0 check:intersections
> node scripts/jam-intersections.mjs box-fort

box-fort: FAIL - 142 open, 10 allowed, 61 hidden; 2056 samples, 55 pieces, 688 s
  zfight 65969 px²  box-0>box-0-shell  x  room  [taking-apart @ 258.93s]
  zfight 32622 px²  box-2>box-2-tunnel  x  room  [stacking-tipping-and-a-flush-seam @ 124.82s]
  zfight 27763 px²  box-3>box-3-shell  x  room  [the-lights-draped-tangled-and-on-the-three @ 206.57s]
  zfight 16347 px²  box-1>box-1-face  x  box-2>box-2-face  [stacking-tipping-and-a-flush-seam @ 128.86s]
  zfight 14523 px²  box-1>box-1-shell  x  box-2>box-2-shell  [stacking-tipping-and-a-flush-seam @ 128.86s]
  zfight 10150 px²  box-0>box-0-shell  x  box-0>box-0-face  [taking-apart @ 257.87s]
  zfight 7800 px²  box-4>box-4-shell  x  box-3>box-3-shell  [the-room-dark @ 234.93s]
  zfight 7464 px²  box-2>box-2-shell  x  box-2>box-2-face  [stacking-tipping-and-a-flush-seam @ 128.73s]
  zfight 7253 px²  box-1>box-1-face  x  box-1>box-1-shell  [stacking-tipping-and-a-flush-seam @ 122.64s]
  zfight 6742 px²  string-of-lights  x  string-of-lights  [the-lights-draped-tangled-and-on-the-three @ 200.27s]
  zfight 5367 px²  box-2>box-2-tunnel  x  box-0>box-0-shell  [stacking-tipping-and-a-flush-seam @ 124.82s]
  zfight 5113 px²  box-4>box-4-face  x  box-4>box-4-shell  [the-room-dark @ 240.96s]
audit exit 0
```

Its report held 142 open findings in 21 moments: 53 pairs of surfaces in one plane, 79 penetrations and 10 poses. Most were in stacking and tipping (24), the room dark (20), taking apart (15), all three in the built fort (15), the blanket (12) and the lights (11).

**What that run did not see.** The moments meant to tap the cat, the baby and the grandmother looked for them by names nothing is drawn under, found nothing, and tapped the middle of the screen. So none of their scenes was in the run, and the 142 are what the boxes and the things do with no one moving. The file now finds each of the three by a part that is drawn, and a moment that finds nothing stops.

**What was done, in the order the ruling gave.**

1. *No two surfaces in one plane.* A box is drawn a hair smaller than it is and a hair above what it stands on, so that boxes that stand flush share no wall, and no box lies in the plane of the rug or of the box below. The face of a box, its shell and the open end of a box on its side each have a plane of their own. A box on its side rolls a quarter turn over its lower corner and stands on the rug, not in it. Fallen pieces lie in layers a gap apart and each a little above the rug. The bulbs hang a little in front of the corners they are hooked over and of the blanket's edge. The grandmother's cardigan, her two hands and her glasses, and the baby's arm and body, each have their own depth.
2. *Penetrations of board by board.* The scissors lie on the rug with their handles clear of it. A box that goes to a place somewhere else goes up, over whatever stands between, and down. A carried box stops against what stands in its way or goes onto it. The blanket goes up, across and down, above everything it passes and above the cat; laid as a roof, a point of it lies on each edge of each lid, so that it turns the corner and does not cut through it. A cushion on its way has turned the way it will lie before it arrives, and a carried cushion is over the rug and over a cushion that lies there.
3. *The three.* With their scenes in the check for the first time, each motion was laid out again. The cat goes over the back edge of the lid, and at a hole its head is inside the box, clear of both walls, the floor and the lid, with its ears as flat as the lid asks. It hops onto a box that is coming down only once the box has landed, from out in front; it gets off its lid, out in front, while a roof comes down on it. The baby goes round a box in three legs and sits up down the side of it, where it is no wider than the gap. The grandmother walks a lane of her own in front of the faces, turns only a little, stands up in front of her seat, goes through a door on her knees with her knitting gathered in, and at a door too small bends to it; her hat stays out only where her head goes in. Pieces that lie where she or the cat will walk are pushed aside along the rug, with a scrape.
4. *Poses.* The 10 were parts of one thing laid in one another: the baby's pointing arm across its own face and legs, and a box's face against its own shell. The arm points up and clear, and the rest went with the planes above.
5. *A sample every 33 ms.* The stepped check was first played with a sample every 200 ms and came out clean. Played as the audit samples, every 33 ms, it found 18 more, each a thing in another for a frame or a few. Each was fixed in motion or geometry:
   - The cat, hopping down off a box, sank through the lid it left and through the edge of a blanket on it. It is out in front of the faces before it comes down at all, comes down out there and goes in to where it lands; high up it ducks its head and lays its ears flat on the way, so that it stays inside the frame.
   - The blanket, pulled off a roof with the box under it, dragged its hem through the lid. It travels with the shorter of its two hangs, and that hem is above everything it passes.
   - Over the cat the blanket's edge lay in the lid, the cat's shoulders stood out through it and its tail stood up through it. The mound lies on the lid, reaches past the face so that its hem hangs in front of the board, has round shoulders, and ends where the tail begins; the cat is drawn in under it and its tail lies over to the side, out from under the edge.
   - Under the blanket the baby held its rattle up through the cloth. It has the rattle at its mouth, and the rattle comes up again once the blanket is off.
   - The cat's tail, sweeping a piece off the rug, turned down into the rug. It turns no further down than a tail on the rug can.
   - The strip of tape in the finger ran through the head of a cat that looked out of a hole, and where it doubled back it lay in itself. It runs further in front of the faces, and slopes, so that no two stretches of it share a plane.
   - A toy posted into a box flew through the toy that lay there. It runs along just inside the face and goes back to its place only once it is beside it.
   - The roll the baby bowls rolled through the block beside the baby. It makes one hop over the block as it is let go.
   - The block rose into the air with a baby that flopped onto a cushion, and the cushion lay in it. The block stays on the rug and the cushion nudges it aside.
   - A cushion flat on the rug lay under the tips of the scissors that cut low on the face behind it. It lies a little further out and is drawn shorter from front to back, in front of the scissors and short of where the grandmother walks.
   - A cushion coming down onto the sofa came down through the cushion in front of it. It slides down the way it leans.
   - The grandmother's skirt lay in the plane of her body when she stood, and in her body when she knelt; her lap showed while her skirt still swung through it. The skirt hangs behind her body, further behind on her knees, and her lap is there once she has sat right down.

What is allowed, and the stepped check's table, are under "The third audit run" as they stand now.

### The second audit run

Run by the lead on a production build, after the fixes of the first. Its output, word for word:

```
> tada-jam@0.1.0 check:intersections
> node scripts/jam-intersections.mjs box-fort

box-fort: FAIL - 4 open, 20 allowed, 2 hidden; 3575 samples, 62 pieces, 502 s
  penetration 98%  cushion-0  x  cat>cat-head>cat-ears  [a-cushion-taken-out-through-a-hole @ 376.5s]
  penetration 30%  blanket  x  cat>cat-sit>cat-paw  [the-blanket-as-a-roof-sliding-off-and-on-the-three @ 318.98s]
  penetration 15%  scissors>scissors-blade-lower  x  toy-block  [a-cushion-taken-out-through-a-hole @ 382.97s]
  penetration 10%  cat>cat-head>cat-face  x  cushion-0  [a-cushion-taken-out-through-a-hole @ 376.5s]
audit exit 0
```

So 142 came down to 4. The builder's stepped check had said 0. The moment named `a-cushion-taken-out-through-a-hole` in that output has a longer name since reading 3.

**Why the stepped check did not see the four.** The audit starts a moment from a named fort by writing the game's slot and loading the page again. The shell holds a save for two quiet seconds before it writes it, and when the page goes away it writes at once whatever it still holds. So wherever a moment had changed the fort less than two seconds before its next reload, the game's own save was written over the slot the audit had just written, and the page came back with the fort the moment had left, not the fort the file named. Nine reloads of the second run started that way: in stacking, the blanket, the cushions, the cushion taken out, the lights, the dark (twice), taking apart, and someone at a box. The stepped check had no shell. It handed each named fort straight to the model, so it played the moments as the file describes them and never the ones the browser played. All four findings were in forts the file did not name: the built fort with two cushions in the big box, cut again, with the cat's head at the new hole; a roof left on with the cat sitting on it through its idle motions; and the built fort after the baby had crawled, with its block pushed out to where the scissors lie. Each is a state a child reaches.

**Made to see them, before any fix.** The stepped check was given the shell's storage: one page across all the moments, a save held for two seconds, and a reload that writes what is held over the slot. Played so, with a sample every 100 ms as the audit takes them, it gave the second run's own numbers: 4 open in 3575 samples, the same four pairs at 0.98, 0.30, 0.15 and 0.10. Then the audit file was changed so that a moment starts from the fort it names: it loads the page once with nothing, which lets the moment before write what it holds, and then again from its fort. The three states the reloads had found by accident are moments of their own now: the cat on a roof, the cat at a hole of a box with cushions in it, and the baby crawling past the scissors with its block.

**What was done for the four.** Each is fixed in geometry or motion; none is allowed.

1. *The cat's ears and face in a cushion.* The cushions in a box lie 28 cm further back while the cat is at a hole of that box or in it, behind where its head is and draws back to. They are seen and heard to go there as the cat sets off, and they come forward only once it has gone. At a peep-hole or a paw-hole its head draws back half as far as it did. And when a cushion is taken out of that box, the cat draws back from its hole and goes up over the back onto the lid: its head and its ears are never where a cushion comes out.
2. *The blanket in the sitting cat's paw.* The cat on a lid the blanket lies over sits on the cloth as it is drawn, ripple and all: it is lifted to the top of the cloth under it, through the landing of the roof and through every idle motion after. On the highest fort its ears lie flatter by as much, so that it stays inside the frame.
3. *The scissors in the block.* The block beside the crawling baby was carried in the air at the height of the baby's chest and out as far as the scissors lie. It is pushed along the rug now, close in under the baby's chin, never as far out as the roll and the scissors. The scissors rest where they did.

**What the stepped check found once it played the shell too, and in the new moments.** Each was fixed in motion, and each has a named test:

- The cat rode a box that tipped, where that box was still the highest thing, and its paw was in the board that turned under it. It jumps down onto the rug first, and the box waits until it is off.
- That hop, from a box at the far right down to the left of the rug, swung out through the baby's arm. A long hop along the rug swings out less far, short of where the baby sits.
- With a line waiting on a box that tipped, the scissors that closed it crossed the cat's tail as the cat left. The cat is off the box before the blades come.
- A box let go low onto the box the cat sits on waited for the cat and then travelled straight through the big box. It goes up and over.
- The cat on a high lid with no hole to go to, touched, dipped its paw into the lid as it hopped on the spot. It hops level.
- A box carried up beside the cat on a lid stood in the cat's tail. It stops clear of the tail.
- The cat that popped out of a hole it stuck in started from inside the board. It starts from in front of it.
- A box off the heap, kept to the right of the grandmother in the box she wears and let go with the finger over the big box, flew to it through her head. A box stays on its side of her: there it finds room, or goes back.

### The third audit run

Run by the lead on a production build, after the fixes of the second. Its output, word for word:

```
> tada-jam@0.1.0 check:intersections
> node scripts/jam-intersections.mjs box-fort

box-fort: FAIL - 4 open, 25 allowed, 4 hidden; 4820 samples, 62 pieces, 752 s
  penetration 92%  blanket  x  box-4>box-4-face-cut  [the-cat-at-a-hole-of-a-box-with-cushions-in-it @ 568.35s]
  penetration 79%  blanket  x  box-4>box-4-shell  [the-cat-at-a-hole-of-a-box-with-cushions-in-it @ 568.35s]
  penetration 71%  blanket  x  tape-strips  [the-cat-at-a-hole-of-a-box-with-cushions-in-it @ 568.35s]
  penetration 30%  blanket  x  cat>cat-sit>cat-paw  [the-blanket-as-a-roof-sliding-off-and-on-the-three @ 328.32s]
audit exit 0
```

The fourth line is the pair, the depth and the moment of the second run's second line, which this file had called fixed. The stepped check had said 0 again.

**Why the stepped check did not see the four.** None of the four was drawn. In each, the blanket the audit measured was not the blanket of that page. The audit seeds the page's random numbers before the page loads, so a page that is loaded again gives its geometries the same names as the page before; and the audit keeps a piece it has prepared and uses it again when the next sample shows a piece of the same name and version. The blanket is one mesh rebuilt every frame, so its version is the number of frames drawn. Since the second close the audit file started a moment with two reloads one straight after the other, the first with nothing and the second from the moment's fort, and took no sample between them. The blanket of the first page after its first frames and the blanket of the second page after as many had the same name and the same version, so a sample of the second page measured the first page's cloth, which lay as the fort then in the slot had it, against the second page's boxes, tape and cat, which stood as the moment's own fort has them. The stepped check played everything in one program, where no two geometries ever share a name, and kept what it had prepared for one moment only. So it never reused anything, and it measured each page's own cloth.

**Made to see them, before any fix.** The stepped check now does what the audit does at a reload: it seeds the random numbers again with the audit's own seed, so that names repeat, and it keeps what is prepared, by name and version, across the whole run. Played so over the two moments, with a sample every 100 ms as the audit takes them, it gave the third run's own four: the blanket in the cut face of the small box at 0.922, in its shell at 0.791 and in the tape strips at 0.706, all at the start of the moment, and the blanket in the sitting cat's paw at 0.299, 3.06 s into its moment. Before that change the same check, over the 39 moments in order at 100 ms, took 4820 samples, the real run's own number, and found 0. The whole run of 39 moments was not played again with the reuse and without the fix: the reproduction is of the two moments the findings are in.

**What was done.** The audit file takes one sample between its two reloads, after a few frames. The first page's pieces are then prepared at versions the second page does not reach by its first sample, so each page's cloth is measured as it is drawn on that page. With that change and nothing else, the two moments gave 0 open. Nothing was allowed. The ruling asked that the blanket never lie inside a box, its cut face or its tape, and that the sitting cat's paw never be in the cloth: the game drew neither in these moments, and the stepped check over every moment at 33 ms holds both, as the table below shows. One state that could put the blanket in a box was found by looking for one, and fixed: a saved fort with a roof over a lid that also carries a box. Play cannot make it, a damaged record can, and its roof now slides off on load, held by a test.

**What this does not settle.** The change keeps this file clear of the audit's reuse; it does not remove it. It is described under "What is still weak", with the change to the tool that would remove it, which is the lead's to make. The fix of the second close for the cat's paw stands, and a test holds it: the cat sits on the cloth as it is drawn. Whether the second run's finding at 318.98 s, at the same depth, was in part this same reuse cannot be told from its report.

**What the stepped check found in the changed and the new motions.** Played over all 40 moments at 33 ms and at the other phase, before this close was reported, it found two things, and played again after the fix for the first it found a third, which that fix had made. Both runs were then made once more, and the table below is of those.

- *The grandmother's glasses in the back wall of the box she takes off*, 0.076 of them for one sample, at both phases. Bobbing down as the box rose round her she leaned back at once, and her head went back through the wall of the box while that wall was still at the height of her head. Her head is one flat board and so thin a crossing does not count against a thing its size; her glasses stand a little off her face and are small, so the same crossing counted for them. She had bobbed and leaned that way since the first close, on the way into a box and on the way out of it, and no run before had sampled it deep enough. She bobs straight down now and leans back only while she steps under the rim, when the box is up above her hat. A named test holds it over six seeds, both ways, and fails with the old lean.
- *The cat's ears and its body, as parts of one figure*: 0.945 at one phase and 0.953 at the other, against a cap of 0.95. In its moment alone, kneading a cushion and curling up, it measures 0.886, as it did; the audit measures the parts of one figure over the whole run, and the run is wider since every hop up comes in over the lid with the head ducked and the ears laid flat. Nothing is drawn through anything: the cat is cut in flat parts that lie on one another. The cap is 1 now, the measured depth rounded up as for every entry. At 1 the entry no longer bounds anything between the cat's own parts, and no test of the game does either.
- *The grandmother's scarf in the tape roll*, 0.196 for five samples, as a box went on over her in front of the big box: made by the fix above. She had gathered her knitting up against her chest by how far she leaned, so bobbing down upright she let it hang to the rug, onto the roll that lies there. She gathers it by how far she is down now, leaning or not. A named test of the drawing holds its lowest point above the roll.

**What is allowed, and why.** 13 entries are left, each a contact the game makes on purpose, and the list is as it was before the third run but for one cap: the cat's own parts, 0.95 then and 1 now. A hole is cut out of the picture of a face, not out of its board, so whatever goes through a hole is measured against the whole face: those entries name the cut face alone, never the box and never a face with no hole. Each cap is the depth the stepped check measured, rounded up; for the parts of one figure it is the depth over the whole run, as the audit measures it. If the real audit reaches a contact that is not here, it will show as open and be judged then.

| Contact | Kind | Cap | Measured | Why |
| --- | --- | --- | --- | --- |
| The cat and a cut face | one in the other | 0.25 | 0.171 | The cat at a hole: a paw reached out of a small one and the tips of its ears as its whole head comes out of a larger one. It passes where the board is cut away; the audit measures the uncut face |
| The cat's mouth and a cut face | one inside the other | none: it is all inside or it is not | inside | The cat's mouth as its head comes out through a hole: it is in the thickness of the board, where the board is cut away |
| The grandmother and a cut face | one in the other | 0.75 | 0.720 | The grandmother goes in by a door she fits, on her knees, and sits with her legs out of it; at a door too small her head goes in. Her face, her hat, her hands and her scarf pass where the board is cut away |
| The grandmother's mouth and a cut face | one inside the other | none: it is all inside or it is not | inside | The grandmother's mouth as her head goes in at a hole: it is in the thickness of the board, where the board is cut away |
| A toy and a cut face | one in the other | 0.15 | 0.098 | A toy posted through a slot passes the face where the board is cut away, and one too big for the slot is pressed against it before it springs back |
| A cushion and the baby or the grandmother | one in the other | 0.2 | 0.151 | The baby flops face down in a cushion, and the grandmother sits on one and squashes it flat |
| The blanket and the baby's arm | one in the other | 0.85 | 0.792 | The baby pulls the blanket over its own head: the fist that holds it up is in the cloth it holds |
| The blanket and the cat's tail | one in the other | 0.35 | 0.300 | Under the blanket the cat is a lump that moves, with its tail out from under the edge: the tail crosses the hem it lies out under |
| The string of lights and the grandmother's hands | one in the other | 0.3 | 0.264 | The grandmother wears a loop of the string round her neck and knits on: the loop hangs over her hands |
| The tape roll and the baby | one in the other | 0.15 | 0.106 | The baby holds the roll up to its face in its hand before it bowls it |
| The ball and the baby's legs | one in the other | 0.2 | 0.138 | The baby puts the ball down against its knee while its hand is busy |
| The grandmother's own parts | parts of one figure | 1.05 | 0.981 | Her scarf hangs from her needles down over her skirt; her skirt swings forward from under her to her knees as she sits down; and her hat, left outside a hole her head is in, hangs on the board over her brow |
| The cat's own parts | parts of one figure | 1 | 0.953 | The cat is cut in flat parts that lie on one another: lying low with its ears flat they lie on its back, washing or curled up its paw is at its face, and stuck in a hole its back legs pedal against its own body. Hopping up onto a box it ducks with its ears flat, and with that the stepped check measures 0.95 over a whole run |

**The stepped check, moment by moment.** Every moment of the audit file played through the model in one run, with the shell's storage and the audit's reuse across reloads, a frame every 16 ms and a sample every 33 ms, each sample measured by the audit's own geometry test.

| Moment | Seconds played | Samples | Open | One in another | In one plane | Pose | Allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `idle-guidance` | 9.4 | 288 | 0 | 0 | 0 | 0 | 0 |
| `the-ladder-shows-the-carry-and-the-switch` | 48.5 | 1472 | 0 | 0 | 0 | 0 | 1 |
| `a-hole-cut-and-the-cat-looks-out` | 19 | 576 | 0 | 0 | 0 | 0 | 1 |
| `a-peep-hole-and-an-eye` | 6.5 | 199 | 0 | 0 | 0 | 0 | 0 |
| `the-cats-whole-head-at-a-hole` | 8.5 | 259 | 0 | 0 | 0 | 0 | 2 |
| `a-line-that-waits-and-is-carried-on` | 17.3 | 527 | 0 | 0 | 0 | 0 | 1 |
| `the-cat-walks-through-a-big-hole` | 5.5 | 169 | 0 | 0 | 0 | 0 | 0 |
| `the-cat-stuck-in-a-small-hole-and-popped-out` | 9.6 | 292 | 0 | 0 | 0 | 0 | 2 |
| `the-cat-hops-onto-the-highest-fort` | 4 | 124 | 0 | 0 | 0 | 0 | 0 |
| `the-baby-into-a-box-and-out` | 9.6 | 293 | 0 | 0 | 0 | 0 | 0 |
| `the-baby-pats-a-box-it-cannot-get-behind` | 5.5 | 169 | 0 | 0 | 0 | 0 | 0 |
| `the-baby-posts-its-toys-through-a-slot` | 8.5 | 260 | 0 | 0 | 0 | 0 | 1 |
| `the-baby-crawls-in-after-its-toys` | 9.5 | 290 | 0 | 0 | 0 | 0 | 2 |
| `a-tunnel-and-who-uses-it` | 23.8 | 722 | 0 | 0 | 0 | 0 | 0 |
| `the-grandmother-wears-a-box-which-is-poked-given-a-cushion-and-passed-by-a-carried-box` | 20.7 | 629 | 0 | 0 | 0 | 0 | 1 |
| `the-grandmother-through-a-door` | 13.7 | 416 | 0 | 0 | 0 | 0 | 9 |
| `the-grandmother-and-a-door-too-small` | 29.1 | 887 | 0 | 0 | 0 | 0 | 9 |
| `the-grandmother-reached-behind-a-stack` | 12.6 | 383 | 0 | 0 | 0 | 0 | 10 |
| `all-three-in-the-built-fort` | 9.5 | 289 | 0 | 0 | 0 | 0 | 9 |
| `stacking-tipping-and-a-flush-seam` | 7.3 | 227 | 0 | 0 | 0 | 0 | 0 |
| `boxes-dragged-low-onto-the-big-box-the-big-box-tipping-with-the-cat-on-it-a-heap-box-with-no-place-and-a-box-put-back` | 17.6 | 545 | 0 | 0 | 0 | 0 | 1 |
| `a-taped-group-carried` | 8.2 | 255 | 0 | 0 | 0 | 0 | 0 |
| `tape-on-a-seam-on-nothing-and-on-the-three` | 23.7 | 721 | 0 | 0 | 0 | 0 | 4 |
| `the-blanket-as-a-roof-sliding-off-and-on-the-three` | 22.9 | 701 | 0 | 0 | 0 | 0 | 2 |
| `cushions-in-a-box-fired-out-and-on-the-three` | 23.7 | 722 | 0 | 0 | 0 | 0 | 8 |
| `cushions-out-of-a-hole-onto-the-rug-the-blanket-heaped-there-and-a-piece-and-the-baby-pushing-one-aside` | 25.1 | 765 | 0 | 0 | 0 | 0 | 1 |
| `the-lights-draped-tangled-and-on-the-three` | 34.3 | 1042 | 0 | 0 | 0 | 0 | 3 |
| `the-room-dark` | 17.4 | 535 | 0 | 0 | 0 | 0 | 0 |
| `taking-apart` | 15.1 | 462 | 0 | 0 | 0 | 0 | 1 |
| `someone-at-a-box-that-a-pull-takes` | 9.5 | 291 | 0 | 0 | 0 | 0 | 3 |
| `the-scissors-snip-the-air` | 3.5 | 108 | 0 | 0 | 0 | 0 | 0 |
| `a-cushion-let-go-on-an-opening-that-shows-a-cushion` | 6.9 | 213 | 0 | 0 | 0 | 0 | 0 |
| `a-tap-beside-a-waiting-line` | 15.6 | 475 | 0 | 0 | 0 | 0 | 0 |
| `a-box-tipping-with-a-line-waiting` | 5.9 | 183 | 0 | 0 | 0 | 0 | 2 |
| `a-waiting-line-shut-before-its-box-is-folded-onto-the-heap-and-before-a-pull-takes-it` | 12.3 | 379 | 0 | 0 | 0 | 0 | 2 |
| `tape-on-a-stacked-seam` | 6.9 | 215 | 0 | 0 | 0 | 0 | 0 |
| `a-second-finger-while-one-cuts-and-while-one-carries` | 12.8 | 391 | 0 | 0 | 0 | 0 | 1 |
| `the-cat-on-a-roof` | 49.9 | 1518 | 0 | 0 | 0 | 0 | 2 |
| `the-cat-at-a-hole-of-a-box-with-cushions-in-it` | 30.1 | 913 | 0 | 0 | 0 | 0 | 3 |
| `the-baby-crawls-past-the-scissors-with-its-block` | 16.6 | 505 | 0 | 0 | 0 | 0 | 1 |
| All 40 | 636 | 19410 | 0 | 0 | 0 | 0 | 82 |

The same moments with the samples at another phase of the frames: 0 open, 19410 samples of 636 seconds, 82 allowed.

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

- **Alive at idle.** The rain sways on its threads; the cat, the baby and the grandmother each have their own idle motions, chosen from the seeded stream so that none repeats twice running; all three follow the scissors with their eyes. The boxes stand still, as board does.
- **Motion and sound on every touch.** A finger is answered in the frame it lands: on board the blades bite, on a character that character answers, on a thing it is taken up, anywhere else the scissors snip the air. Every sound is queued with the motion it goes with on the game's one clock, and a test refuses a sound whose motion is not being drawn. The answer to a touch is the same at every tier.
- **Weight, squash and follow-through.** A box leans back while it is carried, drops, squashes and stands, or tips over an edge with three knocks, each lower; the piece that is cut tips out and slaps down; the blanket billows, sinks and sags; a cushion swells in a box and a third one is fired back out; each bulb settles by itself. The cat's head leads and its tail lags, the baby overshoots and rocks back, the grandmother moves from the head down.
- **Kid-clear silhouettes and tappables.** Large flat characters in strong warm paint on a cool pale room; the boxes are the only bare kraft and the scissors the only bright red. Every target is 48 px or more at 1180 by 820 and at 1024 by 768, nothing touchable lies under the home control or in the top right corner, and a thing is touched where it is drawn in every state; tests hold all of it.
- **Wordless clarity for ages 4 to 8.** No word, letter, numeral or sign is drawn; the wordless check passes, and the "Reader" list above names every mark that comes near one. One act is offered on a first visit: the scissors on the box. Everything else in the room is furniture until it is touched.
- **Wordless idle guidance.** After a few seconds with no touch the scissors wriggle and a ghost hand takes them once round a window on the box with the most board left. It shows this a few times, further apart, then stops; only the child's touch starts the ladder again, and nothing a character does resets it.
- **Frame rate.** Not measured: the machine this was built on has no graphics card, and this run was allowed no production build and no probe. What can be said: the pixel ratio is capped at 2, there are no shadow maps and no post pass, the busiest frame draws 69 meshes by a test that holds it under 80, and the renderer itself counted 59 to 65 draw calls and up to 8,824 triangles in the stills. Four tiers shed the pixel ratio, the rain's sway and the blob shadows, and the grown-up overlay shows the frame time and the tier.
- **Assets.** Everything is made in code: board geometry, one kraft tile drawn from the seeded stream, marker faces, and every sound as notes. Nothing is fetched.

Also held by tests: found as left at many instants of every act, with nothing replayed and nothing sounding on load; a scene that a touch ends is silent from that frame; a put-away closes every sound, sets down a thing that hangs, and gives the idle ladder back; a cancelled touch never acts; the saved state is under 20 KB at its largest and is read field by field.

The intersection audit is written at `enforce: true` with 40 moments. It has been run four times by the lead. The first run, with 21 moments: FAIL, 142 open (79 penetrations, 53 surfaces in one plane, 10 poses). The second, with 31: FAIL, 4 open. The third, with 39: FAIL, 4 open, each of them the blanket of the page before measured against the page after, which the file now keeps clear of. Every finding of the first two runs was fixed in geometry or motion, or is a contact made on purpose that the allow list names with its reason and its depth. The fourth run, with 40 moments and after the lead made the tool clear what it kept of a page on every reload: clean, 0 open, 25 allowed, 5 hidden, 5015 samples, 62 pieces, 719 s.

### The learning claim

None. Box Fort is open pretend play with no learning goal: it is designed from no record and claims no school skill.

### Defaults taken for the owner

- A child of 5 or younger, or of no known age, finds the big box and one small box standing; a child of 6 or older finds the big box alone and the rest on the heap. A saved fort always wins.
- The room dark is painted, not lit: flat pale-yellow cut-outs for the light.
- A cut waits when the finger lifts, with no limit of time, and is carried on by a drag from within 20 cm of either end; a tap there pokes a peep-hole; a carried thing hangs for 0.3 s and can be caught again.
- A box let go with the finger over another box goes onto it at any height, and with no room on the rug onto the nearest box that can bear it; tape holds a seam from anywhere along it and 25 cm to either side.
- A waiting line on a box that tips, folds onto the heap or is taken by a pull is closed the short way before the box goes; the cat does not ride a box that tips.
- The heap lies smallest on top. The string of lights let go in the air falls into its tangle at the front of the rug.
- A cut holds up to 1600 points and its saved line up to 800.
- A box is carried by its lid or its top and cut on its face.
- Up to five fallen pieces lie on the rug until the cat's tail sweeps them.
- No stack is higher than the big box with a middling one on it, so that the cat on top stays under the home control.
- A box the grandmother wears is hers until she is tapped.
- The idle ladder offers the scissors, and shows the carry once and the switch once.
- Nothing glows under the scissors: they wriggle.

### What the next builder should know

- Queue every sound with the name of the motion it goes with, and write the one test that refuses a sound whose motion is not drawn. It found seventeen sounds here that nothing moved for.
- Play every cell of the grid through the Mount's path in one list of acts, and run every rule over that list: found as left, one clock, nobody looking at the child, reach inside the frame, the draw number. A new rule then costs one test, and a new act is checked by all of them.
- Keep where things come to rest in one module that reads only the save. Parked equals loaded follows from it.
- A scripted newcomer finds what a list of acts does not: two states that are each fine and meet badly. Here it was the grandmother wearing a box that the cat was in.
- A check that stands in for the audit has to play what the browser plays, the shell included. The shell writes a held save when the page goes away, so a slot written just before a reload is written over: a stepped check with no shell played forts the browser never saw, and missed the ones it did. Load once with nothing, then from the fort. And it has to carry what the audit carries from page to page: the audit names a piece by its geometry and version, seeds the page so that those names repeat after a reload, and reuses what it prepared for a name it has seen. Take a sample between two reloads.
- A view that keeps a scene graph a test can build with no renderer makes the draw number a test.
