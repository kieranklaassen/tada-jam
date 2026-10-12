<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates, closed. Two readers who did not build the game have each read the folder once; the builder closed the second reading, read the sheet against the code a last time, and no third reading is made.
- Look in use: LCD handheld segments, the first look reserved for the game. Its spike passed on clarity and on frame rate and the look passed at the toy checkpoint, so the second reserved look (CRT television picture) was not tried.
- Sheet: round 1 came back open with 7 findings, and all seven replacements are pasted word for word above `## The look`. Pairs 1 to 9, which the builder proposed after Run 2, and pairs 10 to 14, proposed while closing reading 1, are pasted word for word by the lead. No pair is open: closing reading 2 changed the code to the sheet everywhere and no sentence of the sheet. The builder has not edited the sheet part at any time.
- Reading 1: 2 things a child would notice and 15 slight. Reading 2, by a second reader: 1 thing a child would notice (the towel) and the rest slight, 9 lookalikes and 9 promises of the sheet the code did not keep. Both are closed below, under "The readers' reports".
- Open: no one has listened to the sounds. Every voice is written from the sheet's words as plain numbers in `voices.ts`, and a test holds each pitch, peak and length in range.
- Not measured: no frame rate from a tablet, and no frame rate at all since before reading 1; the last production build was made before both readings. Every frame rate in this file is from a desktop engine without a GPU and is not the target's.
- The look is registered in `docs/art-direction.md` and the game is listed in the README.
- No frozen file was changed, and none needs a change.

**What to try first.** Tap the sleeping dog three times, slowly: a snort, a yawn, the leap, and the room's answer to the landing. Tap a door: morning comes, the baker and the hen get up, and the awake dog trots through ahead. In each room poke its one thing three times to its joke (pump the balloon, startle the hen, load the tray, ladle the soup, swat at the fly), rub the bathroom glass clear, pull the weed up, and then go and find what followed into the rooms beside. Touch the wrong thing in each room (a belly, the basket, the hot tap, a flower, the diner, the baker's nose, the cushion). Hold a case button. Pull the lamp's cord down and hold it to put the house to bed.

**How the stills are made again.** The dev page at `?chrome=0&seed=1#/play/micro-mayhem`, 1180 by 820, pixel ratio 1, on a paused clock that is run forward between touches. The doors are at (1079, 260), (1079, 448) and (1079, 636) in the surface's pixels at that size, the lamp at (1079, 96), the cord's bobble at (1003, 136), the case buttons at (120, 780) and (1060, 780), the dog's cushion at (650, 640). From the bedroom the walk used is: bottom door to the garden, middle to the henhouse, bottom to the bakery, top to the dining room, top to the kitchen; and top door to the kitchen, middle to the dining room, middle to the bathroom, bottom to the fair. An idle pose is caught on the same paused clock by running it on in steps of a tenth of a second until a point of the pose goes dark on the canvas. The stills are kept outside the repository; the reports name them.

### Where the code and the sheet differ

The sheet was read against the code sentence by sentence three times: after Run 2, after reading 1 was closed, and after reading 2 was closed.

Pairs 1 to 9, from the first pass, and pairs 10 to 14, from the second, are pasted into the sheet by the lead, and that list is closed.

The second pass found the sheet stronger than the code in most of what reading 1 named, and there the code was changed. In five places the code was right and the sheet's sentence was changed:

10. The hen: she lays when she is startled on her nest, until the third egg cracks and the chick is out. In the bedroom at night, where the sheet has her asleep, a startle lays nothing.
11. The meeting of the rubber hat and the toppled pies: the slice is served once, the first time he comes into the dining room with the pie in his hat, and lies on the cloth from then on.
12. What is stored: a sixteenth field, `served`, false at first.
13. Through a door, what is saved at the start: `served` beside `place` and `full`.
14. Secrets, what a meeting changes: `full` and `served`.

No pair took anything out of the sheet: 10 says where and until when, which the grid's hen row and the stored `eggs` already said; 11 to 14 add a saved field so that the served slice is found as left.

The third pass, after reading 2, found nine sentences the code did not keep. The code was changed in all nine and no pair was written. Nothing else in the sheet was found to differ from the code.

### The readers' reports

**Reading 1**, of the whole folder, by a reader who did not build it and ran nothing: clean on official wording, on addresses, on names and on record ids; 2 things a child would notice and 15 slight. Each is closed here, and where a fix has a test, the fix was taken out once and the test seen to fail.

A child would notice:

1. **The cord was too thin to hit.** Its strip is one, above the top door, 88 units wide: 88 px at 1180 by 820, 76 at 1024 by 768, 61 upright at 820 by 1180. `layout.test.ts` no longer skips it ("the cord's strips too"), holds the three widths, and holds that a near miss beside the bobble swings the lamp and never opens the top door.
2. **The toppled tray was not touched where it is drawn.** Its target follows the tray: level in his hands, or hanging from one hand once the tower is down. `game.test.ts`, "touches the tray where it is drawn at every step", presses the drawn tray through `game.press`, the call the Mount makes.

Slight:

3. **The flood seen through the kitchen's door was two level wavy strokes.** It is one pool. `clearance.test.ts` holds it as one mass in each of the three rooms beside the kitchen.
4. **Weaker lookalikes.** The fly's arms no longer cross, and the wheat's tie no longer crosses its stalks. The other six stay and are listed under "Reader" below, each with why it is weaker than the thing it is.
5. **The owl's eyes were equal.** The right one is smaller by six units, with a smaller pupil that moves less. `clearance.test.ts`, "draws the owl's two eyes unequal".
6. **The lamp's shade also started the pull.** Only the cord's strip does. `game.test.ts`, "starts the pull at the cord only".
7. **The baker's idle was a blink only.** In the fair, the kitchen, the bakery and the dining room he breathes with his belly and now and then straightens his moustache, his cap or the tower. `game.test.ts`, "has the baker breathe with his belly and straighten something". He breathes in every state of each of those rooms, with a pie on his face or in his hat too. In the dining room his belly goes out as a rim lit over the body he has, since each body drawn again would have taken the room over its sprite ceiling; the rim's inner edge can be seen as a faint line on his belly.
8. **The dog never snapped at the fly.** Awake, he snaps and misses in the kitchen while the fly is about and in the bedroom at night. `game.test.ts`, "has the awake dog snap at the fly and miss".
9. **The hen does not lay every time she is startled.** The sheet has her asleep in the bedroom at night, and its grid ends her laying at the chick, so the code stands and the sentence is pair 10.
10. **Sounds short of the sheet.** Three splats, each in the step that lights it; two flaps of the rubber hat, each with the hat thrown up, in the kitchen, the bakery, the dining room and the fair; the duck's squeak on every arrival beside a bathroom rubbed clear, through the bathroom's own door too. `game.test.ts`, the block "reading 1".
11. **The served slice was not saved.** It is a saved field, `served`, set as the door to the dining room is tapped and read back defensively. `house.test.ts`, `save.test.ts`, and `game.test.ts`, "serves the slice from his hat". Pairs 11 to 14 name it in the sheet.
12. **A third idle demonstration that showed nothing.** With the ladder as it now runs (the room's thing or else a door, a second door, then the cord once something can be put to bed) a test follows every demonstration with a finger in every state it reaches, the helmet on and the fly swatted among them, and each changes the house. The test passed without a change to the ladder: the order had been changed while closing item 1.
13. **Small mismatches.** `ctx.childAge` is no longer read. The dog goes back to bed in five poses, whoever he was. The round dog has three small tricks of his own in the bedroom, never the same twice in a row. The tower hops off the tray whole, every pie of it, flat or tall. Each has a test in the block "reading 1", except that the Mount's not reading the age has none, since no test mounts the Mount.
14. **The look part of `ART.md` was stale.** Corrected in place: the garden's three flowers, the pictures in the doorways (which now differ for one egg and two, one pie and two, flat and tall, and a test holds it), the voices' waves, which segments leave a ghost.
15. **This file was stale.** Corrected in place.
16. **What the clearance test left out.** Two more are in: a door's leaf against the picture in its doorway, in every pose of the leaf; and the ghost hand, on the glass and off every door and the cord but the one it shows. The rest is listed below under "What the clearance test does not cover".
17. **Edges.** On a short landscape surface of 844 by 390 nothing touchable lies under the home control: the bathroom's pane starts lower, and `layout.test.ts` has that size. A move from a finger the game was never given, which is what a slide out of the grown-up corner is, turns no eye. The fly's spot moves in the frame its picture does, in the bedroom and in the kitchen. `game.test.ts`, "moves nothing for a finger it was never given" and "touches the fly where it is drawn".

**Reading 2**, of the whole folder, by a second reader who did not build it and ran nothing: clean on official wording, on addresses, on names and on record ids; 1 thing a child would notice, 9 slight lookalikes, 9 slight promises of the sheet that the code did not keep, and stale lines. Each is closed here, and each fix with a test was taken out once and its test seen to fail.

A child would notice:

1. **The towel was two equal level strokes on a cream square.** It is redrawn with one broad slanted stripe and a fold. Held by a still; most of it stands behind the duck.

Slight, lookalikes:

2. **The leaping dog's body was a dark ring.** It is filled, with one crease cut into it. `clearance.test.ts`, "draws the leaping dog's body filled, with a crease in it, and never as a ring round a hole".
3. **The pumpkin's ribs were a facing pair of brackets.** The large pumpkin has three ribs of unequal bend and the small one two. Held by a still.
4. **Strokes of straw crossed.** The 86 strokes are thrown down so that none comes within five units of another. `clearance.test.ts`, "throws the straw down on the henhouse floor so that no two strokes cross or touch".
5. **The stove's grate was a bare level bar once the pot had floated off.** It is a burner: a dark oval on two feet with a lighter ring in it. Held by a still.
6. **The basket's arcs, the helter-skelter, the hen's legs, the wheat picture, the blanket's stripes and the curl of steam** stay, and are in the list under "Reader" below, each with why it is weaker than the thing it is.

Slight, promises of the sheet:

7. **The dog had no figure in the dining room, so his going ahead was dropped there.** He is the diner, and is lit on the chair first as the room is entered, with his panting or, round, his roll. Where he is not seen to go, nothing of his is sounded. `game.test.ts`, "has the dog on the chair first in the dining room" and "sounds the dog going ahead only where he is seen to go". The room's sprites stayed under their ceiling, so no pair was needed.
8. **The hat with the pie in it did not flap.** It has a flapped pose of its own, the rubber thrown up and the pie hopping in it. `game.test.ts`, "flaps the hat in sight with the pie in it too".
9. **The tall pies' puff was skipped under the rubber hat.** It plays after the two flaps. `game.test.ts`, "puffs the tall pies as the bakery is entered, under the cap and under the rubber hat alike".
10. **The first soup with the fly about sprayed without the gargle.** `game.test.ts`, "gargles and then sprays at the first ladle of soup with the fly about, and at the second".
11. **Leaving the dining room with the ladle on the diner's head played nothing, and in the flooded kitchen the fly rubbed its hands.** The diner nods off with the ladle back in the baker's hand, and the fly lands on the rim of the floating pot. `game.test.ts`, "nods the diner off as the dining room is left with the ladle on its head too" and "lands the fly on the rim of the floating pot as the flooded kitchen is left".
12. **A finger just under the cord's strip opened the top door.** On the frame round the top door's corner, under and beside the strip, a finger swings the lamp and opens nothing; on the door itself a tap is always the door's, as the sheet says. `layout.test.ts`, "never opens a door for a near miss on any side of the cord's strip", which tries every point up to 30 units outside the strip and the point the reading named at three surface sizes. Taken out both ways: with the frame given to the door, and with the door's corner given to the lamp.
13. **The bedroom fly's spot moved before its picture in the leap.** The spot moves in the beat that draws it. `game.test.ts`, "touches the bedroom fly where it is drawn in every frame of the leap that startles it".
14. **The baker did not breathe while stirring in the flood.** `game.test.ts`, "has the baker breathe with his belly and straighten something", which now asks it of the flooded kitchen, of every state of the dining room and of the fair.
15. **The view was never disposed.** The Mount's cleanup disposes it. `frameBudget.test.ts`, "are all let go when the view is disposed". That the Mount makes the call is read in the code and held by no test, since no test mounts the Mount.

Edges and stale lines:

16. **Short surfaces.** Nothing touchable is under the home control at 667 by 375 either: the bathroom's pane starts lower again. `layout.test.ts`, lesson 7, now at ten sizes.
17. **Timeouts.** No test has a timeout over 60 s. The long sessions are one test each (six of clearance, three of the frame budget, two walks of the sprites' weight, each middle of lesson 5), with one more test that the sessions were in every room between them.
18. **Stale lines.** This file; the lampshade, the prizes and the lantern in the look part of `ART.md`; three voices nothing played and a comment about a whisk that is not drawn, taken out.

### What the clearance test does not cover

`clearance.test.ts` holds figures against each other in long seeded sessions, door leaves against their doorway pictures, and the ghost hand. It does not hold:

- the parts of one figure against each other (a hat on a head, an arm on a body), apart from the door leaf and its picture;
- the pupils that follow the finger, which are drawn live and are no sprite;
- the afterimage a pose leaves for three frames;
- the heap of every ghost at once with a case button held;
- the dark bloom a finger leaves on bare glass;
- any segment against the printed card behind it, apart from the fly's spots against the pictures of the bedroom and the kitchen;
- a stroke thinner than the grid's cell of four units, which can pass between two cells' centres;
- a state the seeded sessions never reach. The gasping flowers beside the leaning flower were such a state, found only when a session's path changed, and have a test of their own now.

All of these were looked at in stills, and stills are what holds them.

### Reader

Shapes that could be taken for a numeral, a letter or a sign, and why each that stays is weaker than the thing it is. What was redrawn is listed in `ART.md` under "No figure forms a numeral, a letter or a sign".

- The owl's two eyes: two rings side by side. They are of unequal size, each has a pupil that moves, and there are ears above and a beak between them.
- The bunting: a row of marks. The flags differ in size, colour and spacing and hang on a sagging string.
- The three door leaves: three upright bars. Each stands in its own coloured doorway with a picture beside it, and each has one wandering line of grain.
- The five drops of light under the lamp: a fan of marks. They are of unequal length, spread round the shade, and are there only by day.
- The two plates on the dining room's rail: two discs. They are of unequal size, each has a coloured middle, and they stand on a rail.
- The noses of the baker and the dog: a small oval ring. Each is inside a face, between two eyes and over a mouth or a moustache.
- The dog's yawn: a large ring. It is the whole of his open mouth, with ears either side and a tongue in it.
- Every ghost at once, with a case button held: a heap of overlapping characters in every room, with no figure standing alone.
- The towel on the bathroom shelf: one broad teal stripe, slanted, on a cream towel with a fold. It was two equal stripes and was redrawn after reading 2; one slanted band inside a towel's outline is no sign, and most of it stands behind the duck.
- The blanket on the big bed: two wavy stripes. They are printed a shade darker than the blanket, run its whole width inside its outline, and never light up.
- The scores on the loaves, on the bakery's shelf and in the kitchen's oven window: three short cuts side by side. They are slanted, each at its own angle, inside a loaf's outline, and in the crust's own brown.
- The leaping dog's body: a filled dark oval with one bent crease cut into it. It was a ring round a hole and was redrawn after reading 2. It is the middle of a dog with four legs spread from it, a head above and ears flying.
- A door leaf seen edge on as the door swings, and as a ghost in each doorway: an upright bar. It is slanted at the top and at the bottom as a leaf seen from its edge is, stands at the hinge side of a coloured doorway, and is lit for one pose of a swing.
- The table under the bowl, in a doorway that shows the dining room: a level bar. A bowl stands on it and it runs from one side of the doorway to the other, so it is a table's edge.
- The curl of steam on the pie in the hat and on the served slice: one small bent stroke, alone, over a thing that is plainly hot food. The steam that was redrawn as puffs was a pair of such strokes face to face.
- The two arcs on the egg basket: two bowed strokes, one over the other, cut out of the dark basket. They are the weave: of unequal length, bowed downward, inside a basket's tapering outline with eggs over its rim, and they tip with it. A sign's strokes are level, equal and stand alone.
- The helter-skelter at the fair: three yellow bands across a blue tower. Each is bent in the middle as a slide wound round a tower is, they are of three lengths on a tower that narrows, under a red roof, and they are print and never light up.
- The hen's legs as she shoots up: two upright strokes, each with a spread foot under it. They hang under a hen with nine feathers thrown out round her and a stretched neck, are lit for 0.4 s, and each foot is a wide caret of three toes' width, not a letter's foot.
- The wheat in the bakery's picture: three stalks from one point, bent outward, with an oval knot on them. They are inside a picture frame, in the colour of straw, and the knot sits on the stalks where a letter would have nothing.

### The lessons, and the test that holds each

1. One clock for sight and sound: `game.test.ts`, "lesson 1: sight and sound run on one clock"; `voices.test.ts` refuses a delayed note.
2. A scene ended by a touch is silent from that frame, and put-away closes all sound: `game.test.ts`, "lesson 2"; `sound.test.ts`, "the gate".
3. What the rules compute is what is shown, and a thing is touched where it is drawn: `game.test.ts`, "lesson 3".
4. Nothing starts, sounds or is pending on load: `game.test.ts`, "lesson 4".
5. Parked equals loaded, for every state: `game.test.ts`, "lesson 5".
6. Pointer cancel never acts for the child: `game.test.ts`, "lesson 6".
7. The corner and the home control: `layout.test.ts`, "lesson 7", at ten surface sizes, short landscapes of 844 by 390 and 667 by 375 among them; `game.test.ts` holds that a finger the game was never given moves nothing.
8. Age gates nothing: `save.test.ts`, "lesson 8".
9. Lookalikes: `clearance.test.ts`, "lesson 9" (the flood is one mass, in the kitchen and through its door; the owl's eyes are unequal; the leaping dog's body is filled; no two strokes of straw cross or touch); the rest by eye, listed under "Reader" above.
10. No test writes a file or reads the environment: kept by hand; the tests use a canvas that draws nothing and a seeded stream.
11. The sheet read against the code: done three times; nine differences the first time and five the second, all pasted as pairs, and nine the third, all closed in the code.
12. Pairs, not edits: fourteen pairs, all pasted by the lead; none is open.
13. No path in these files: kept by hand.
14. A character's own act never resets the idle ladder, and a slow tap is a tap: `game.test.ts`, "lesson 14".
15. Nothing made at module load: the game is canvas 2D and draws from its own seeded stream only.
16. A full frame with large funny characters in every room: by stills of all eight rooms; `frameBudget.test.ts` and `clearance.test.ts` hold what fills them.

The rulings are held in `game.test.ts` under "the rulings" (the afterimage's two numbers; the lamp's areas and the doors' never meet; the baker breathes and straightens something in every room he stands in) and under "the sheet" (a tap only swings the lamp however long it is held, the cord held puts the house to bed, the house dims as the cord goes), in `layout.test.ts` (the fly never on a printed picture) and in `frameBudget.test.ts` (the sprites of one room only, under 80 MB). The baker's snort was made larger, with his whole face in it, and is held by a still and by no test.

### The cold playtest proxy

Played once on a production build as a child of six who has been told nothing, on a paused clock, with a still at every step.

- **Clear:** the glow and then the hand on the dog; three taps and the leap; the hand on a door once the dog is awake; the morning; the fog (the hand rubs, a streak clears and the bath shows through); the hot tap fogging the top again; the baker pulling the blanket over himself with his feet out.
- **Unclear, and fixed:** the hand showed the lights out by drawing down from the lamp's shade, across the top door, while the cord hangs at the edge. It now takes the cord's bobble and draws that down, and a test follows the hand with a finger and holds that the house goes to bed and that the hand crosses no door.
- **Unclear, and fixed:** the cord was shown fourth, 84 s into an idle stretch. It is shown third, at 41 s, once there is something to put to bed.
- **Unclear, and left:** a tap on a printed toy (the bear, the ball, a picture) answers only with a knock and a dark bloom on the glass. It is answered, and it is not a thing of the game.
- **Unclear, and left:** what a door's small picture means is learned by going through it once.
- **Not judged:** the surface turned upright shows the jam's own picture of a tablet to be turned, not the game.

### Template notes

- `micro-mayhem.tsx`: the Mount keeps the template's order of work. `save` and `game` are null until the slot is read, and the bare look (case, card, ghosts) is drawn until then; `applyTier` hands the tier to the view; the draw count is the view's stamps plus live strokes; every cue of one press or one step is played as one voice through a gate that a cut scene and put-away close; a save marked "now" is written at once and one marked "soon" goes through the throttle; pointer-up and pointer-cancel reach the game as `release()` and `cancel()`.
- `config.ts`: `BACKDROP` is the case's plastic; a tier sets `dpr`, `shadow` and `afterimage`; `TAP_PRESSES` is 1, with the reason beside it; `LADDER` has one place and `FIRST_VISIT` one row.
- `manifest.ts`: the icon family is `play`.
- `state.ts`: used as copied, wrapped by `save.ts`. `state.test.ts`: changed to say that the game has one place.
- `symbols.ts` and `symbols.test.ts`: deleted. The band starts at 6, but nothing in the game is counted and no numeral is drawn.
- `stage.ts`, `guidance.ts`, `input.ts`, `audio.ts`, `overlay.ts`, `rng.ts`, `scene.ts`: used as copied; the scenes are built on `scene.ts`.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen, untouched.
- **For the template:** a still of the idle ladder on a paused clock needs a touch first, since the seconds the page ran before the clock was paused are not known to the walk.
- **For the template:** `Note` in `audio.ts` has a `delay`. A game told to keep sight and sound on one clock has to forbid it in a test of its own.
- **For the template:** a 2D game has no intersection audit. Here a test paints every sprite into a coarse grid with the shapes the canvas pen fills and plays long seeded sessions, failing on any frame where two figures share a cell (`clearance.test.ts`, with the grid pen in `testing.ts`). The grid pen would serve any sprite game.
- **For the template:** a game of sprites has to decide what a room's sprites weigh. Painting a whole room in the frame it comes onto the glass was one long frame; painting a few sprites a frame after it took that frame to under half.

### For the owner to decide

- **The lamp's gesture:** the house is put to bed by pulling the lamp's cord down and holding it for about half a second, with the house dimming as the cord goes. Is that the right weight for a gesture that wipes everything, and can a six-year-old find it from the hand alone?
- **Lights out wipes the house:** it returns every thing to its first step, and nothing comes back except by playing it again. The idle hand shows that pull at 41 s of an idle stretch, once there is something to put to bed, so a child who copies the hand loses what was built. Is that wanted, or should the hand never show the cord?
- **The dark of the large figures:** the baker and the awake dog are large masses of one dark. Is that the look, or too heavy next to the print?
- **Scene length:** every scene is one joke of one and a half to five seconds, shorter than the pack's four to ten.
- **The case buttons:** they do nothing in the game; held, one shows every ghost at once, as a display's test does. Keep, or give them a use?
- **The sounds:** nobody has listened to them. They are one buzzer's beeps, slides and ticks.
- **The printed toys:** the bear, the ball and the pictures on the cards answer a tap only with a knock on the glass. Enough, or should some of them do something?

## Pass log

One row per pass. The draw count is sprite stamps plus shapes filled live, which is what `frameBudget.test.ts` counts. Every frame rate here is from a desktop engine without a GPU and is not the target's: 1180 by 820, pixel ratio 2, no throttle; no tablet was measured.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | The first still of the look spike: the bedroom at rest, before any touch | "There is a seal on the rug. The man has an arm on his head. Why is there a bowling ball on his bed? And the grey dogs on the wall are scary." | Every sleeper reads as who it is: the dog redrawn with his head in front of his body, flopped ears and paws; the baker's night cap replaced by a baker's hat; the snore bubble made a drop that rises from the dog's nose; the ghosts of unlit segments taken from 0.06 to 0.035; the curtain rod drawn inside the glass | Not measured | The baker's moustache blown up by a snort; the hand of the idle ladder |
| 2 | A walk through every answer of the toy, about sixty stills | "The hand is black on the black dog, I can't see where to tap. The man's hat is on the owl. When the dog jumps he jumps into the fly. The chicken's legs look like two letters." | Nothing lies on anything and the hand can be seen: the hand made pale with a dark edge; the baker sits up clear of the window; the fly's spots moved out of the leap; the dog's spins, bounce and upside-down pose set clear of the bed and the chest; the hen goes over on her back as a whole hen; and `clearance.test.ts` holds all of it | 58.7 frames a second over 371 frames with touches, dev build; 24 to 33 draws in play | The dark of the large figures; the afterimage of a large pose |
| 3 | The first stills of the seven new rooms at rest and at each punchline, and the clearance test's first run over them | "The pies are in the man's hands and in the dog. The steam goes through the foot. The soup runs through the chicken. The owl falls into the flowers. I can see two dogs when he jumps." | Every room's figures set clear of each other: the tray raised, the fallen pies and the dog apart, the steam on the far side of the tap, the spill drawn down the front of the cloth, the owl dropping without wings, the chick and the lamp's light kept on the glass, the swatter's arm kept off the fly's next spot; the afterimage cut to 0.05 s at 0.18 strength; a room's sprites held under a ceiling | Not measured | Lookalikes not yet looked at; the hand for the cord |
| 4 | Every room at rest, in play and with a case button held, 59 stills, read for lookalikes | "There are two wiggly lines on the floor like in sums. The dog has a zero on his tummy. The soup has two brackets on it." | No sign on the glass: the flood redrawn as one pool with a lapping edge; the dog's tongue cut out of the dark with a crease; steam over the soup and in the dining room's doorway redrawn as puffs that rise and shrink; a test holds the flood as one mass | Not measured | The hand for the cord |
| 5 | The cold playtest on the production build, 25 stills | "The hand pulls the door, not the string. And I waited ages before it showed me." | The hand takes the cord's bobble and draws it down, and shows it third instead of fourth; a test follows the hand with a finger. A room coming onto the glass paints its sprites a few a frame | Production build before this pass: 48.2 frames a second over 544 frames with touches in four rooms, tier fell to 3, longest frame of the game's own work 185 ms as a room came on. Dev build after it: 56.7 frames a second over 627 frames, tier 0 throughout, the game's own work 0.3 ms at the median and 4.6 ms at the 95th percentile, longest 77 ms as a room comes on | One frame of about 77 ms on that engine each time a room comes onto the glass; the printed toys only knock |
| 6 | Reading 1 by a reader who did not build the game, seventeen findings, and stills of the bedroom at rest, the bakery from the first pie to the fallen tower, the dining room and the kitchen | "I pulled the string and the door opened instead. The tray fell down and when I pressed it nothing happened. The owl's eyes are the same. The baker just stands there. The dog doesn't bite the fly." | What the sheet says is what happens: one wide strip for the cord above the top door, and the shade starts no pull; the fallen tray touched where it hangs; the owl's eyes unequal; the baker breathing and straightening in four rooms; the dog snapping at the fly; three splats, two flaps, the duck's squeak on every arrival; the served slice saved; the tower hopping whole; five poses to bed; the round dog's own tricks; the doorway pictures telling one egg from two and flat pies from tall; the fly touched where it is drawn; the flood through the door as one pool. Each with a test that was seen to fail with the fix taken out | Not measured in this pass. The worst frame the budget test finds is 75 draws, in the bathroom | The Mount itself has no test; the sounds are unheard; no tablet was measured; what the clearance test does not cover is held by stills only |
| 7 | Reading 2 by a second reader, and stills of the leap, the bathroom, the fair, the garden, the henhouse, the dining room as the dog comes in, the flooded kitchen at rest and as it is left | "There is an equals on the shelf. The dog has a hole in him when he jumps. The string is hard to get and then the door opens. The dog was gone at the table and I could still hear him." | No sign on a card and no promise unkept: the towel with one broad stripe; the leaping dog filled; pumpkin ribs, straw and the burner redrawn; the dog on the dining chair first, with his own sound; the hat flapping with the pie in it; the puff under the rubber hat; the gargle at the first soup; the diner nodding off with the ladle given back; the fly on the floating pot's rim; the frame under the cord given to the lamp and the door kept for the door; the bedroom fly's spot moved with its picture; the breath while stirring in the flood; the view disposed; nothing touchable under the home control at 667 by 375; no test over 60 s. Each with a test that was seen to fail with the fix taken out, except the three redrawn prints (towel, ribs, burner), which stills hold | Not measured in this pass. The worst frame the budget test finds is still 75 draws, in the bathroom | The Mount itself has no test; the sounds are unheard; no tablet was measured; the dining room's sprites weigh 57.8 MB of the 58 they may; the redrawn towel, ribs and burner are held by stills only |

**The stills after pass 5, in three lines.**

- **Share of the frame that is empty:** about a sixth in the bedroom (the striped wall kept for the leap) and less in every other room: each card is printed from edge to edge and the room's figures stand in front of most of it.
- **What is funny:** a baker under a tower of pies with only his moustache showing; a hen in a shower cap sunk to the eyes in the bath; an owl hanging by its feet with its eyes wide; a dog as round as a ball beside the crumbs; a pot afloat on the kitchen floor with the baker stirring it from a stool; a fly on its back in the soup.
- **What is alive:** every room's figures have idle runs of their own and no shared tempo: the baker breathes and straightens what he carries, the hen nods and tucks, the dog pants at the food, the fly hops and rubs its hands, the owl blinks, the pot rattles, the duck squeezes itself.

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

- **Alive at idle:** every room has figures with idle runs of their own; a test plays long sessions with no touch in between and holds that a character's own act never takes the idle ladder back.
- **Motion and sound on every touch:** every target of every room, in every state, answers in the call that takes the touch with a change on the glass and a voice in the same step; where the pose is lit already it flickers. Bare glass leaves a bloom and a knock, the case a knock and a flicker.
- **Weight, squash and follow-through:** drawn as poses and timed as holds: the coil, the hang and the splayed landing; the knees under each pie and the tower's sway before it tips; the weed's stretch before it gives; the room's answers after each punchline, each in its own time.
- **Kid-clear silhouettes and tappables:** dark figures on light cards; every target is 48 CSS pixels or more across on a surface of 1024 by 768, the cord's strip included (and upright at 820 by 1180 the strip is 61), and every target has ink where it answers.
- **Wordless clarity at six:** no word, letter, numeral or sign, lit or unlit, printed or drawn; one thing in each room, the largest thing its baker, hen or dog is busy with.
- **Wordless idle guidance:** a glow on the room's thing, then a pale hand that shows the touch itself (a tap, a rub, a pull upward), then a door, then the lamp's cord once there is something to put to bed. A test follows every hand with a finger.
- **Frame rate:** not measured on the target, and not measured again after either reading was closed. On a desktop engine without a GPU, which is not the target's: 56.7 frames a second over 627 frames with touches in four rooms at 1180 by 820 and pixel ratio 2, tier 0 throughout, dev build; the game's own work 0.3 ms at the median and 4.6 ms at the 95th percentile of frames, and one frame of 77 ms each time a room comes onto the glass. No physical iPad was measured.
- **Budget:** pixel ratio capped at 2; at most 75 draws in a frame (the bathroom, in play with the ghost hand showing and a case button held), against about 80 (sprite stamps plus shapes filled live); no shadow map and no post pass; the sprites of one room only, at most 58 MB of segments at the densest tier (the dining room is at 57.8), all let go when the game is unmounted, the total held under 80 MB at every moment of a walk through the house by a test.
- **Assets:** all procedural.
- **Nothing passes through anything:** `clearance.test.ts` paints every segment into a grid and plays six long seeded sessions through every room; two pairs are allowed with a reason and a cap of 40 cells each (the tower on the baker's raised hands, the diner's chin on the rim of the bowl). It also holds every door leaf off the picture in its doorway and the ghost hand off every door and the cord but the one it shows, with one allowance of 12 cells (the drops of the pressed hand on the top door's frame while it draws the cord down). What it does not cover is listed in this file and held by stills.
- **Found as left:** every change is saved in the call that makes it, a scene's outcome when it starts; put away at any instant, the game is the one a load of the same save gives, for every state a test can reach; nothing replays on load and nothing sounds before the first touch.
- **No engagement mechanics:** nothing is counted, timed or scored, nothing is shown of what was found, and nothing happens for staying or for leaving.

### The learning claim

The game has no learning goal: it is designed from no record and claims no school skill.

### Defaults taken for the owner

- The house is put to bed by a pull on the lamp's cord held for 0.45 s; a tap only swings the lamp.
- Scenes are shorter than the pack's four to ten seconds.
- The hand shows one press, not two, since every tap walks a thing one step on.
- `ctx.childAge` is not read.
- The case buttons only show the display's test.
- By day the fly is in the kitchen and the dining room and not in the bedroom.

### What the next builder should know

- In a look made of fixed poses, the answer to "does anything pass through anything" is a test over the sprites, not a look at stills: sixty stills showed one overlap and the test found twenty-four in one room, and about a hundred and fifty in the seven rooms after it.
- A sound that is a cue on a pose needs the pose to change. Where the pose is lit already, the pose has to flicker with the sound, or the test of sight and sound fails on a second tap.
- A dark hand cannot be seen on a dark figure: the idle hand needs its own light colour and a dark edge.
- A measuring pen that drops a shape under a clip measures some sprites as nothing: take the shape's whole box and then clip it.
- Two level wavy lines are water to the one who drew them and a sign to a child who does sums; draw water as one mass.
- A hand that demonstrates a gesture has to start on the thing the gesture takes hold of, and a test that follows the hand with a finger finds it when it does not.
