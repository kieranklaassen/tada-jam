<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates. Three readings, each by a fresh reader who ran nothing. Closed by the builder's own last reading of the sheet against the code, sentence by sentence, after the fixes of the third reading; no fourth reader has read the game as it now stands.
- Look in use: two-colour print, the first look reserved for the game. The lead passed it at the toy checkpoint ("the print is full, King Winter is large and funny"); the owner has not seen it yet.
- Sheet: round 1 was checked with 8 findings. All 8 replacements are pasted word for word above `## The look` (finding 1 replaced two whole grid rows); the builder's one edit before the check (the lamp child on the lip of the bank) stands. Nothing else above `## The look` was changed in Run 2. Round 2: pairs 1, 2, 5 and 6 the builder proposed after Run 2, pasted word for word by the lead, each found exactly once above `## The look`; pairs 3 and 4 were refused and the sheet stands there, so both are built now (King Winter walks in and tries a block with one foot; the lamp child presses its nose flat on the far side of lit ice). Round 3: pairs 7 to 14, proposed after the first reading, pasted word for word by the lead. Round 4: pairs 15 to 19, proposed after the second reading, pasted word for word by the lead. Round 5: pairs 20 to 25 pasted by the lead.
- After the fixes of the third reading the builder proposed six exact pairs for the sheet, numbered 20 to 25; all six are pasted word for word by the lead, and no pair is open. They are listed under "The sheet read against the code".
- The look is registered in `docs/art-direction.md` and the game is listed in the README.
- The readings. The first came back with 2 things a child would notice and 20 slight, answered in pass 6. The second, with 2 things a child would notice, 12 slight and 3 lookalikes, answered in pass 7. The third, with 2 things a child would notice (one of them listed here already, and ruled to stay), 8 slight and 3 lookalikes, answered in pass 8. Each fix has a test that was seen to fail with the fix taken out.
- Not measured: the sounds (every voice was written and tested as numbers: pitch, length, the step it starts in; none has been heard), and the frame rate on a tablet (a builder in a wave runs neither the shared probe nor a device; the draw count is 52 at most).
- Not done: no child has played it, and the stills of passes 6 to 8 were looked at by the builder only.

Where the stills are: kept outside the repository, in three sets. `p0` to `p5` are six rounds of the same eleven moments (`01-rest` to `11-day-after`), `q0` to `q2` are single moments (the idle ladder, a block on King Winter's head, a clear block on the clear middle, the ghost mitten), `cold` holds the 25 stills of the cold playtest proxy, and `r3` holds the stills of pass 6, each scene loaded from a seeded save (the light of a wall of every kind of thing, the rap, the foot, the walk in by a gap, the fall, the hare, a melting block and a bubbling snowball, a wall of clear blocks by day) and those of pass 7 (King Winter sat beside a roofed hollow with a lamp in it, and in the snow at his own place when that hollow is all there is; a dusk with the lamp child at each lamp; the soaked peeper's drops, a snowball afloat in its rings, King Winter's footprints) and of pass 8 (the rim of light at a snowball and at a short snow block with an icicle's shards between them; King Winter in a gap as narrow as a gate can be, and behind the wall after it; his wet beard; the peeper stretched out to watch the berry; a clear block under a thumb). The bursts of pass 6 and pass 7 were thinned to every third still when the disk ran short. To remake the eleven, open `?chrome=0&seed=1&fps=1#/play/ice-palace` at 1180×820 and pixel ratio 2 with an empty save:

| Still | How to reach it |
| --- | --- |
| `01-rest` | The first visit of a child of no known age, 1.5 s after load. |
| `02-cut` | A line across the clear middle and a line near the right edge of the pond. |
| `03-things` | A long scoop and a short scoop through the drift, and an icicle pulled from the bough. |
| `04-built` | The first block and the berry block carried up to the bank. |
| `05-dusk-flood`, `06-dusk-lamps`, `07-night` | The sun pulled down past the ridge: 0.7 s after, 3.3 s after, and when the scene is over. |
| `08-night-cut` | A line cut at night. |
| `09-morning`, `10-snow`, `11-day-after` | The sun lifted: 1.2 s after, 4 s after, 7 s after. |

What to try first: draw a line across the pond with one finger. Carry the block that hops out up onto the bank and lay a long one across two short ones, so there is a hollow under it. Scoop the drift, pull an icicle, set the red block somewhere in the wall. Then pull the sun down.

Draw count. A canvas game's count is what `frameBudget.test.ts` counts and the grown-up overlay shows: one for each stamp of a painted layer, each live fill and each live stroke in a frame (`Print.count` in `print.ts`). What does not move is one stamp, each character's still parts are its own sprites, and all things at rest are at most six fills. The one number: 52 at most, counted by the test on the real view after pass 8 (pass 8 changed no count), in the fullest clearing by night (a palace of every kind of thing, twelve holes, a cut being made, a thing going under, everyone reacting). The states under it: 37 on a first visit with the idle ladder showing, 44 in the fullest clearing by day, 46 at most through both scenes, and 45, 40 and 41 at most in three nights of the characters' own doings (King Winter in by a gap, behind the wall and falling from his seat; the lamp child rapping on snow; his foot on a tower), each from the hare's crossing by day on. Each is one more than after pass 6: the firs are now laid again in every frame, over the sun's ring of paper. The test holds every one of them under 80. In the browser the overlay read 32 to 37 before pass 6; it was not read again after. The layers are painted once for a size: 42 of them (two still layers, four fleck tiles, twelve sprites in three versions).

### What the lead added

1. The registry row for the look in `docs/art-direction.md`. Its text is the last paragraph of `ART.md`.
2. The README row: `| Ice Palace | `games/ice-palace/` | 5–9 | A snowy clearing printed in two inks: saw blocks out of the pond along the line your finger draws, build with ice, snow, icicles and one red berry block, then pull the sun down and see what the lamps make of your wall, while a very large King Winter looks for a seat. A toy with no learning goal. |`
3. The six pairs for the sheet, numbered 20 to 25, below; all are pasted.

### The sheet read against the code

Read sentence by sentence before the Run 2 report, and again after each of the three readings. The last of these is the reading the game is closed on. The grid's thirty cells, the saved fields, both scenes and the first visit by age are each held by a named test.

Of the six proposals made after Run 2, pairs 1, 2, 5 and 6 are pasted (the crack in the frame of the lift; no creaking line at put-away; the children's own two lamps; a lamp goes with its hollow). Pairs 3 and 4 were refused, and the game now does what the sheet says there: with nothing to bear him King Winter walks in, stands on the front snow clear of the highest block, tries it with one foot and goes home to sit in the snow with his grumble (`through.test.ts`); the lamp child goes round the bank's end and presses its nose flat on the far side of the lowest lit clear block (`day.test.ts`, `parked.test.ts`).

The first reading found seven more promises unkept (its slight 3 to 9). Six are built as the sheet says: the rap on the block, the morning shake, the snowball's bubbles, the fish and anything red, the peeper soaked every time, the unlit shape of snow and of a snowball. One became pair 8. After those fixes eight sentences said a detail other than the game did; the eight pairs, 7 to 14, are pasted, and the sheet now says:

7. The characters: the hare, a bystander that comes out from behind a fir and goes in behind another, bolts when poked or at dusk, wants nothing of the child, rewards nothing and is not saved.
8. The toy, "While it moves": a straight saw line that points at the finger for the first short stretch and then keeps its direction.
9. Dusk, "A touch": a block set on his seat makes King Winter stand, wait and go; his seat pulled from under him drops him onto the snow behind the wall; a block let go over him is a hat; nothing else makes him stir.
10. Dusk, "A touch": the lamp child leaves its place for its two tastes only: behind the wall for its nose on lit ice, and in front of a snow block to rap on it.
11. Dusk, step 4: he walks in by the widest gap at the foot of the wall that is open to the sky, squeezed narrow if need be, or round the bank's end, and climbs to his seat from behind: he never passes through a block.
12. The lamp child's dislike: it raps once, with its mitten on the block, and then waits at its place, frowning at it; it raps again only when a lamp has been let out and shut in anew.
13. The grid, clear block by lamp light: the block's own outline on the ground in front of the wall, leaning away from its lamp.
14. The bird: the highest block whose top is free, never King Winter's and never one right under the home control.

The second reading found the game weaker than those sentences in six places, and each is built as the sheet says, with its test: his gate is the widest gap open to the sky and a roofed gap is passed over (pair 11; `through.test.ts`); he stirs for nothing but his own seat (pair 9); the lamp child raps again only for a lamp shut in anew (pair 12; `promises.test.ts`); he polishes only a clear block his beard reaches; each lamp lights as the lamp child hangs it; and a very short stroke gives chips and a squeak. Where the game then did more than the sheet said, five pairs, 15 to 19, were proposed; they are pasted, and the sheet now says:

15. Dusk, "A touch", the hat: a block or a snowball let go with its middle over him as he sits is a hat; an icicle is none, goes to his seat, point up, and he rises with his squawk.
16. Dusk, "A touch", the fall: his seat pulled from under him, or fallen because what bore it was taken, drops him.
17. Dusk, "A touch": a block set on his seat, or over it within his own height, makes him stand, wait and go.
18. King Winter's likes: a seat with free air over it for his whole height and width, with nothing on it, no roof over it and no lamp in it.
19. The error "Nothing will bear the king": a block with no free air over it, beside the narrow one and the one that rests on too little.

The third reading found the game weaker than the sheet in seven places, and each is built as the sheet says, with its test: he is drawn no wider than the gap he passes, in every frame he is in it, in and out (pair 11; `through.test.ts`, which measures the figure the view draws); no lamp hangs in the air he sits in (pair 18); a snow seat that a thumb makes a snowball of is gone from under him (pair 16); sat in the snow at night he wears a block let go with its middle over him (pair 15); a hat is nodded off by night as by day (the grid's note on the hat); the seat under him and the hat on him are 48 px targets (`touches.test.ts`); and the peeper's answer to the berry afloat is its own, at the berry, with no cheer (`things.test.ts`). One thing the game does is not the sheet's and stays, by the frame: no seat above the fourth row. Where the game now says more than the sheet, six pairs were written, and all six are pasted. Pairs 20 to 24 take nothing from the sheet; pair 25 takes twelve units from one sentence, and says so:

20. King Winter's likes: the pair adds that his seat stands no higher than the fourth row, where he can still climb. The frame allows no more: sat a row higher his crown would be among the bough's icicles, on his feet there, right under the home control, his crown would be under it on a tablet as well as a phone, and two rows higher he would be out of the frame. A block above the fourth row was therefore not made a seat.
21. The error "Nothing will bear the king": the pair adds the block that stands higher than the fourth row to the three reasons, so that the foot and the grumble at a tower too high are by the sheet.
22. Dusk, "A touch", a block set over his seat: the pair adds a block set higher than his own height that hangs a lamp within it. He stands, waits and goes for the lamp as for a roof.
23. Dusk, "A touch", the fall: the pair adds a seat melted away, or slumped into a snowball, under a warm thumb.
24. Dusk, "A touch", the icicle: the pair says where an icicle goes when he sits in the snow with no seat for it to go to: it comes down on the bank beside him. It is no hat by night, as on his seat.
25. Dusk, "A touch", a touch on the seated king: the sheet has it never taken for the block under him. For his seat to be a 48 px target on a surface 820 px wide, the block is touched from 12 units above its top, as every thing is, and those 12 units are the fur at the hem of his cloak, 8 px of him. A touch there knocks the seat, and a drag from there pulls it from under him. The pair says so, and adds that the hat on his head is touched before he is. Without the pair the choice is between this sentence as it stands and a seat 40 px high under him.

### Reader

Marks that could be taken for a numeral, a letter or a sign, checked in the stills. Changed before the first reading: the berry block was a red box with a round eye and is now ice with a window of paper and three berries on a leaf in it; the drift was two pointed humps and is now one soft heap with a shoulder; the ghost hand was a red blob and is now a mitten with a thumb and a cuff. Changed after it (pass 6):

- The light on the snow was one level bar the shape of a dash for each block. It is now the block's own outline, most of a block deep, leaning away from its lamp, and a wall's light is the wall laid on the ground row by row.
- The icicle's light was four upright slivers side by side. It is three shards of unequal length and lean that spread from one point.
- The shine on clear ice was a wedge with a dab beside it, the same on every block, which read as a slash and a dot. It is a thin sliver along the block's top edge that turns down one end, and which end, how far along and how far down differ from block to block (`touches.test.ts`).
- The hare's tracks were thirteen groups at an even step. They are ten landings of unequal length along a line that turns up and down the slope and once doubles back, and they are where the hare lands (`promises.test.ts`).
- King Winter's beard had two near-parallel locks. It has three, of unequal length, lean and thickness, and a shade down one side.

Changed after the second reading (pass 7):

- The soaked peeper's drops were five ovals at an even step in a straight slanted row, which read as a dotted line. They are six drops of six sizes, at no even step, above and below any line through them (`promises.test.ts`).
- A snowball afloat had three even dots under it pulsing in turn, which read as an ellipsis. It sits in rings on the water: two arcs of unequal length under it, which swell and ebb as it turns. The bubbles of its first seconds are still heard and seen as it goes in.
- King Winter's footprints were six ovals in three even pairs. They are five, of unequal size, step and turn.
- The sun's ring of paper was stamped over three firs. The firs are laid again over it in every frame, as they are over the hare (`promises.test.ts`).

Changed after the third reading (pass 8), each held by a test under "marks that are no signs" in `promises.test.ts`:

- The rim of light round the unlit shape of a snowball was a closed oval ring, alone on the snow: a zero. Round a short snow block it was a closed frame. The rim is now the thing's outline pushed away from its lamp and away from the wall, further than it is grown: light on the two far sides only, bare on the two near ones. Round a snowball it is a crescent, and at a snow block it runs along the outer side and round the far end.
- The three beads on a clear block under a thumb were equal, at a near-even step and nearly level: an ellipsis. They are of three sizes, at unequal steps, start at three heights and run down at three speeds, so no two are ever level.
- The four drops under King Winter's wet beard were equal and at a near-even step. They are of four sizes, at unequal steps, and no two are ever level.
- An icicle's light was two legs and a short stroke from one point: an arrowhead pointing at the wall. It is three shards that start apart along the icicle's foot, share no corner, differ in length and lean, and spread as they go.

What stays, and why each is weaker than a sign:

- The sun's rays: eleven wedges of unequal size at unequal gaps round a face, and they sway. A face in the middle makes it a sun.
- The rings on the ice: three open arcs of unequal length and radius round the middle of the pond, none closed, none level.
- A ripple on open water: three unequal arcs that widen and go in under a second.
- King Winter's hem: one lumpy band of fur made of seven unequal lumps, mostly behind his beard; no row of dots.
- The firs: clumps of unequal height and width at unequal gaps, some in front of others.
- The bough's icicles: an even step along the bough, but hung at five different heights under clumps of needles.
- The berries on the bush and in the block: unequal dots at no even spacing, with twigs or a leaf; the three in the block touch, so they are a cluster.
- The bush: twigs at four different heights, the lower pair rising out of a blob of snow.
- The idle glow: a red rim round the pond and round each lying thing. It is a closed ring, but it rims a thing that is there, breathes, and is never alone on bare ground.
- The cut line and the nick a tap leaves: a line under the finger, slanted wherever the finger went; the nick is short, slanted and gone in 1.4 s. A cut drawn dead level is a level bar for the moment before the finger lifts.
- A lamp: a roof, a glass and a foot, hung by a hook. It is a lamp.
- The light of one short block alone on the bank: a rounded slab, wider than deep, slanted at both ends. It is 33 units deep where the old bar was 13, begins at the foot of the bank under its block, and moves when the block does. Of what stays, this is the mark nearest a sign.
- King Winter's leg when he tries a block: one curved line with a red boot at its end, from under his hem up to the block, for a little over a second.
- The shine as redrawn: a thin bright edge. Very small, the turned-down end could be taken for a hook; no two neighbours have the same one.
- The rim of light as redrawn. At a snow block it is a band of bare paper along one long side with a short turn round one end, as an ink printed off register shows beside its shape; which end it turns round follows the lamp. Seen alone it has a corner in it. It is never alone: it lies in the wall's light, a row out from the bank, against the unlit shape it rims, and it moves when the block does. At a snowball it is a crescent. With the slab of a single short block, these are the marks nearest a sign.
- An icicle's shards: three slivers side by side, leaning apart. Of unequal length, start and lean, and they lie in the light of the block the icicle stands on.

### Template notes

- `ice-palace.tsx` (from `game.tsx`): changed. It makes the view, the audio and the save wrapper, and hands every pointer event to `Play` (`play.ts`), which holds all of the Mount's logic so that it can be tested without a browser. **For the template:** a carried thing that should land when the finger lifts needs `touch.letGo()` on pointer-up, since `ForgivingTouch` holds a drag open through a short lift; the template's comments do not say so.
- `config.ts`: changed. The backdrop colour, the tiers (pixel ratio and how many snowflakes drift), a designed order of one place and one first-visit entry.
- `state.ts`: used as copied. The game's own fields are in a wrapper, `save.ts`.
- `state.test.ts`: changed: it reads `LADDER[0]` and holds that the order is one place for every age. **For the template:** the test as copied reads `LADDER[1]` and fails for a game with one place.
- `input.ts`, `input.test.ts`, `guidance.ts`, `guidance.test.ts`, `stage.ts`, `stage.test.ts`, `rng.ts`, `rng.test.ts`, `overlay.ts`, `overlay.test.ts`, `scene.test.ts`: used as copied. `scene.ts` is used by both scenes.
- `audio.ts`: changed. A scene's sounds go through a gain of their own, which `hush()` cuts in the call that ends the scene; `setActive(false)` cuts everything that is sounding. `audio.test.ts` is as copied and passes; `sceneSound.test.ts` holds the two additions. **For the template:** every game with a short scene needs both.
- `manifest.ts`: the icon family is `play`, as the lead set it. `index.ts`: as generated.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts` and their tests: frozen, untouched.
- `testing.ts`: the tests' shared hand (cut, carry, scoop, pull the sun). No game file imports it.
- **For the template:** the quality bar's draw-call line had no canvas reading; the lead's ruling (stamps plus live fills and strokes, under 80) is what `frameBudget.test.ts` now holds, and a line in the template's `game.tsx` saying so would save each canvas game the question.

### For the owner to decide

- The night. It is a second pull of the blue over the whole sheet, with light as bare paper in hard-edged shapes. The three characters and the bird are left out of that pull, as light is, so their faces are read at night; printed under it they dissolved into the snow. A real second pull would cover them.
- Ice laid over ice prints the blue twice and comes out a deeper blue, with a rim of paper round each block.
- The block cracks out in the frame the finger lifts. A finger that skips on the glass and comes straight back still gets one block of the whole line.
- A first visit at 6 and younger, or with no known age, opens with one block already cut beside its hole and two standing on the bank; from 7 the pond is whole and the bank bare.
- How strong the idle glow is (a red rim round the pond and round each lying thing; at night red on the flooded sheet reads as a dark rim) and how large the ghost mitten is.
- The hare crosses the far snow now and then by day, from one fir to another, and bolts behind a fir when touched or when the dusk comes. It rewards nothing and is not saved.
- The cut is a straight saw line, not the finger's own curve (pair 8).
- The lamp child raps once on snow that shuts a lamp in, and then only frowns at it. The frown and the arm pointing at the snow block stand all night, for as long as the lamp is shut in. It is aimed at the block and never at the child, it makes no sound and asks nothing, but it is the nearest thing in the game to a verdict on what was built. Whether it stays, or eases to a look after a while, is the owner's.
- A block set on the bank by day gets a look from the lamp child and no chime.
- A clear block under a still finger takes 3.4 s to go, sweating and sinking in sight, and a lifted finger saves it; the other kinds change after 1.1 s.
- King Winter does not stir for anything but his own seat, so at night he can be left sitting on a seat a load would not give him: one whose bearer was taken so that it rests on too little, or a lower one after a higher was built. Put away and opened again, he is where the rules have him. The sheet says both things (where he sits is worked out from the blocks, and nothing else makes him stir).
- A touch on the fur at the hem of the seated king is the seat's (pair 25): the seat under him is a 48 px target at the price of 8 px of him. The other way round, the sheet's sentence stands whole and the seat under him is 40 px high.
- King Winter takes no seat above the fourth row (pair 20). A tower five blocks high gets his foot and his grumble, however wide it is. The frame sets this: a row higher he would sit among the bough's icicles and stand up under the home control.
- Under a hat King Winter dozes by night as he does by day, and nods the hat off within eleven seconds. This is the one thing at night that happens by itself after the scene; it moves no block of the palace, and the hat lies where the save already had it.
- The peeper no longer claps when the berry floats. It is soaked and laughs, as at every splash, and then stretches its neck out to watch the berry bob, without a sound. Nothing in the game now answers the child's doing with applause.

## Pass log

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | The first stills of the toy at 1180×820: at rest, cutting, the hop, a small build, the splash, the king poked, idle. | "The blue is all grey and sad. The king's hands are gone, I can only see his coat. The little one with the lamp is tiny, and the one lying down too. There is a lot of nothing in the middle. When my block fell in the water it only went plip. I can hardly see my line." | One set, "make it loud": the blue ink printed as ink (it was laid as the dull blue-on-paper tone everywhere); the mittens, crown and cushion cleared to paper before their ink, so red stays red over the coat; the lamp child and the peeper drawn a quarter to a third larger; taller firs in the middle; the bank's shaded face carried across the full width; drift lines and a hare's tracks on the far snow; a much larger splash, with rings; a thicker cut line. Nothing reverted. | Not measured. A builder in a wave does not run the production build or the shared probe; the dev page in a headless browser is no measure. The draw count is above. | The middle of the far snow is still the quietest part of the frame until a palace stands there. The ghost mitten reads as a red blob more than a hand. A clear block lying on the clear middle of the pond is a deeper blue on blue, and the two paper strokes on it carry most of the reading. Two short blocks side by side on the pond can read as one. The king's reaction to a block landing is small beside his reaction to a poke. |
| 2 | Run 2, set `p0`: the whole game for the first time, eleven moments from rest through a night to the day after. | "At night everybody is gone! The king is just blue and I can't see his face. The lamp is see-through in the day." | One set, "who is there at night": the characters are left out of the night's pull (paper stays paper, their blue is the blue twice), a third version of every sprite; the lamp in the lamp child's hand has blue glass by day and paper glass once lit; the peeper stands up at night inside the frame. Set `p1`, `p2`. | 60 in the headless dev page at rest once it had settled; 32 to 36 draws. | The drift reads as nothing. Fresh snow on a block reads as a bite out of it. |
| 3 | Sets `p2`, `p3`: the six things and the drift, by day and by night. | "What is that pointy tent? Why is there a hole in the pond where I put my snow? The ball has a box round it at night. The two children are on top of each other." | One set, "snow is a thing": the drift redrawn as one soft heap with a shoulder, a line over its top and shade down one side; a snow block gets a line down its other side and a thicker line in its sag, so it is a block on the pond's rim and no bite; fresh snow is a band of paper under a thin crest; the idle rim round a snowball is round; the frost children stand apart at night. Set `p4`. | 60, 33 to 36 draws. | The peeper's hat still crosses the lamp child's feet at night. A snow block lying half on the pond's cloudy rim is still the weakest of the six things. |
| 4 | Sets `p4`, `q0`, `q1`: the marks a reader could take for signs, and the rulings (the shine, the red box, the mitten, a block on the king, a clear block on clear ice). | "The blocks all have a slash and a dot on them, like a sign." | One set, "shine, not a sign": the shine is a wedge, broad at its foot, with a dab beside it and lower. Checked and kept: the mitten reads as a mitten, a block let go over King Winter sits on his head, a clear block on the clear middle has its rim of paper. Sets `p5`, `q1`, `q2`. | 60 by night, 55 to 60 while cutting at night; 32 to 37 draws. | Listed under "Reader". |
| 5 | The cold playtest proxy, set `cold`: a production build, a child of five who has never seen it. Ten seconds hands off, then a minute of pokes, one swipe, carries and both pulls of the sun. | "I poked the ice and nothing stayed. Then the mitten drew a line, so I did, and a block jumped out! The king puffed a cloud at me. I pulled the sun because it yawned, and it went blue and the lamps came." Unclear moments: (a) a tap on the ice gave chips for half a second and then nothing, so a child who only taps does not learn that the finger must move; (b) a snow block scooped onto the pond's rim was hard to see as a block. | One set, "a tap leaves something": a finger that only tapped leaves the nick of the saw's tooth for 1.4 s, the start of a line (`toy.test.ts`); the snow block's side line and sag line are thicker. Not re-stilled: the proxy's build was made once, as the brief allows. (The nick was put where a lifted drag ends, which a tap never reaches; the first reading found it, and pass 6 put it where a tap goes.) | The production page read 60 with 32 to 37 draws at pixel ratio 1 in a headless browser; that is no tablet. | Whether a child of five pulls the sun without the mitten showing it (the third showing of an idle stretch) is a guess. |
| 6 | The first reading (2 things a child would notice, 20 slight, 5 lookalikes, stale lines), each checked against the code, and set `r3`. | From the reading: "A tap on the ice leaves no nick. The hare pops in and out in open snow." From the stills: "The king's leg is behind him, I can't see it. The bird is sitting inside the snow. The light is cloudy pond on the ice." | One set, "what the sheet says, where a child sees it". A tap leaves its nick in the call a tap ends in. The hare comes out from behind a fir, goes in behind another and bolts at dusk. King Winter walks in by a gate, never through the wall, tries a block with one foot (the leg drawn over him, his body clear of the block), stirs only for his own seat and drops when it is pulled. The lamp child goes behind the wall to press its nose on lit ice, and raps once on snow with its mitten on the block. The light is each thing's own outline on the ground, as bare paper. A snowball afloat bubbles, the fish comes to anything red, the peeper is soaked every time and the drops are seen to fly. Touch shapes are 48 px at the three sizes. The bird takes a free top, never under the home control. A clear block melts over 3.4 s. No chime for a block on the bank. Lookalikes redrawn (see "Reader"). | Not measured: the dev page in a headless browser is no measure. 36 to 51 draws by the count. | Listed under "Still weak". |
| 7 | The second reading (2 things a child would notice, 12 slight, 3 lookalikes, stale lines), each checked against the code, and the new stills of set `r3`. | From the reading: "The king sits right through the roof, on top of the lamp. He walks round the end when there is a door open. The drops are a dotted line. The snowball has three dots." | One set, "his seat and his gate". A seat has free air over it for his whole width and height: no roof, no lamp, nothing on it. His gate is the widest gap open to the sky; a roofed gap is passed over for the next open one, and a sliver of overhang roofs nothing. He stirs only for his own seat: he drops when it goes or falls, stands and goes when something is set on it or over his head, squawks at an icicle, and sits on when a block is taken from under a seat that still stands. A hat is a block whose middle is over him. He polishes only a clear block his beard reaches. Each lamp lights as the lamp child stands under its place. The lamp child raps only for a lamp shut in anew. A very short stroke gives chips and a squeak. Put away, the hare is gone as after a load. A shrunk snowball's unlit spot shrinks with it. The bird keeps clear of the home control on a surface 375 px high. Lookalikes redrawn (see "Reader"). | Not measured. 52 draws at most by the count. | Listed under "Still weak". |
| 8 | The third reading (2 things a child would notice, one of them listed and ruled to stay; 8 slight; 3 lookalikes; stale lines), each checked against the code, and five new stills in set `r3`. | From the reading: "I made the tallest tower and the king won't sit on it. He is fatter than the door when he comes out. The ring on the snow is a zero. The little one claps when I do the berry." | One set, "all of him through the gap, and nothing that claps". He stops before a narrow gap, makes himself as narrow as it, measured on all of him that is drawn, and only then steps in; the test draws the real figure and measures it in every frame of the crossing, in and out. A lamp that comes to hang in the air he sits in makes him stand and go. A snow seat made a snowball, or an ice seat melted, drops him. Sat in the snow at night he wears a block let go with its middle over him. Under a hat he dozes and nods it off, by night too, and he takes no hat with him when he walks. His seat and his hat are 48 px targets. The peeper watches the berry bob and says nothing. No seat above the fourth row stays, by the frame, and the sheet is asked to say so (pairs 20, 21). Lookalikes redrawn (see "Reader"). | Not measured. 52 draws at most by the count, as before. | Listed under "Still weak". |

After pass 1, from the stills:

- Share of the frame that is empty: about a fifth. It is the snow of the bank between the lamp child and King Winter, which is where the palace is built, and the strip of snow between the bank and the pond. Sky, ridge, firs, both ends of the bank, the pond and both lower corners are filled.
- What is funny: King Winter is a third of the frame high with a tiny crown, a red ball of a nose and a beard to his feet, and he nods off, starts awake, and harrumphs a cloud when poked. The peeper lies on its tummy with its nose at the ice and kicks its feet out of step. A block let go over open water soaks them both: the king's beard hangs wet and he shakes, the peeper laughs.
- What is alive with no touch: the sun swells, droops and yawns; the king breathes, his beard sways, his head sinks and jerks up; the lamp child swings its legs and its lamp and tips its head; the peeper kicks; the bird hops and cocks its head; the fish glides under the clear ice; snow drifts across.

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### What the game is

A snowy clearing printed in two inks. One finger drawn across the pond saws the ice along its line, and when the finger lifts a block exactly as long as the line cracks out, hops onto the ice beside its hole and sounds a note set by its length. Six things are got by hand: clear ice from the middle of the pond, cloudy ice from its edge, a snow block or a snowball from the drift, an icicle from the bough, and the one red berry block. Each answers five acts in its own way (set down, knocked, dropped in open water, a warm thumb, lamp light). When the child pulls the sun down, the night is pulled over the sheet, the frost children hang a lamp in every hollow of what was built, the light crosses the wall as each material allows and lies on the snow in front, and King Winter walks in to sit on the highest block that will bear him. Lifting the sun brings the morning: fresh snow on what stands, a whole pond, a full drift and bough. Nothing is asked and nothing is judged.

### How the game meets the quality bar

- Alive at idle: six characters, the hare and the snow move with no touch, each on its own curve and period (`cast.ts`; `cast.test.ts` holds that no two idles are alike and that the view reads every pose value).
- Motion and sound on every touch: the saw answers in the call the finger lands in; every thing and character answers a poke; open water ripples, bare snow puffs, the sky shakes out flakes, a tap on the ice leaves a nick, a stroke of any length a finger can make gives at least the nick, chips and a squeak, and a press that cannot start a line shows what is in the way (`toy.test.ts`, `things.test.ts`, `touches.test.ts`). Every test of a touch goes through `Play`, as the Mount does (`testing.ts`).
- Weight, squash and follow-through: a block hops out, lands with a squash and shakes what it lands on; a snowball rolls to the lowest place; the king's beard and belly follow his moves.
- Kid-clear silhouettes and tappables: flat shapes in two inks; the six things have six outlines, and nothing else in the frame has theirs. Every thing, an open hole, each icicle on the bough, the seat under the seated king and the hat on his head is touched in a shape of 48 px or more each way at 1180 by 820, 1024 by 768 and 820 by 1180 (`touches.test.ts`).
- Wordless clarity for the band: nothing written, and no numeral or sign; the marks that could be taken for one are listed under "Reader". `node scripts/wordless-check.ts` passes.
- Wordless idle guidance: the glow after three seconds, then a frost child's mitten showing a cut, a carry and the pull of the sun in turn (`guidance.ts`, `hintOf` in `first.ts`).
- 60 fps: not measured on a tablet. A frame is at most 52 stamps, fills and strokes, held under 80 by `frameBudget.test.ts` with the night, both scenes and what the characters do at night included; one still layer, no shadow, no post pass, pixel ratio capped at 2 with three lower tiers.
- Procedural assets only: everything is drawn and synthesized by the game; no file is loaded. `node scripts/egress-check.ts` passes.

### The lessons of earlier readers, each with its test

1. One clock: `clock.test.ts` ("hears nothing in a step in which nothing is seen to happen…", "lands a block… on one known step…"); no note waits: `voices.test.ts` ("starts all at once").
2. A scene ended by a touch is silent from that call, and put-away closes all sound: `sceneSound.test.ts`; `play.test.ts` ("a scene's sound"); `day.test.ts` (a touch ends each scene silently).
3. Every pose value is read by the view: `cast.test.ts`. Touched where drawn in every state: `reach.test.ts` ("touched where it is drawn").
4. No pending flag outlives its touch, nothing starts or sounds on load: `play.test.ts` ("leaves no pending flag behind"), `clock.test.ts` ("makes no sound and starts nothing on load").
5. Parked equals loaded, in eighteen states: `play.test.ts` ("put away": what is on the surface is what a load of the save shows, and nothing at all is heard after); the idle ladder is taken back at put-away there too. Fifteen more moments of the characters' own (King Winter falling, with his foot out, making himself narrow before a gap and in it, sat in the snow with a hat on, on his feet under a lamp newly hung over his seat; the lamp child on each errand; the peeper watching the berry; a snowball bubbling; the hare half way across, bolting from a poke and bolting from the dusk, gone after each as after a load): `parked.test.ts`. With a block in the hand that bore others: `touches.test.ts`.
6. Pointer cancel never acts for the child: `play.test.ts` ("that the browser takes away never acts for the child").
7. The top-right corner answers nothing and leaves the idle ladder alone: `play.test.ts` ("the grown-up’s corner", four surface sizes). Nothing a child reaches for is under the home control: `reach.test.ts` ("clear of the jam's controls", ten surface sizes, 844 by 390 and 667 by 375 among them; played with King Winter on his highest seat right under it and the lamp child jumping to rap there) and the bird in `through.test.ts`. Two things are allowed there with a cap, on a surface under 430 px high only; they are under "Still weak".
8. Age is only a first-visit default: `save.test.ts`, `toy.test.ts` ("by age").
9. Lookalikes: the "Reader" section above.
10. No test writes a file or reads the environment: `tidy.test.ts`.
11, 12. The sheet read against the code, the pasted pairs (1, 2 and 5 to 25): "The sheet read against the code" above.
13. The two documents name no folder of a machine: `tidy.test.ts`.
14. A character's own act never resets the idle ladder: `play.test.ts` ("idleness"). A tap of up to 0.45 s is a tap: `things.test.ts`.
15. Not a three.js game.
16. The frame is full from edge to edge: the stills, and "The frame" in `ART.md`.
17. Nothing passes through anything, as model tests (a 2D game has no intersection audit): King Winter and the wall, his gate, his drawn width in the gap, a roof and a lamp over a seat, a lamp newly hung over him, his fall, a hat and an icicle over him, a roof set over his head, the frost children's skate round water and lying things, the lamp short of the bank, the bird's perch (`through.test.ts`); two hundred random moves of a hand (`toy.test.ts`).
18. What the sheet promises of the characters: `promises.test.ts`.

### The learning claim

The game has no learning goal and names no record.

### Defaults taken for the owner

- One place in the designed order, the pond; what a first visit holds differs by age.
- A block is at most 300 stage units long and at least 64; a shorter line gives chips and a squeak.
- At most 64 things and 40 open holes are saved; a largest legal save is under 32 KB.
- Six lamps at most. The frost children carry two of their own, which stand beside the wall while it has fewer than two hollows.
- Dusk lasts about nine seconds and morning about five; a touch ends either at once and silently.
- The hare crosses about every 38 seconds of attended day, for about 7 seconds, from one fir to another.
- King Winter squeezes through a gap down to 52 units, a quarter of himself as he is drawn at the wall (203 units, cushion and all), with two units of air each side: a gap with less than 56 units open to the sky is no gate. He takes the widest gap that has that much, and goes round the bank's end when none has. Making himself that narrow takes him about a quarter of a second, standing before the gap.
- His seat needs free air 130 units wide and 180 high over its top, and stands no higher than the fourth row.
- A hat stays on him until his next start out of a doze: at most eleven seconds, by day and by night.
- The peeper watches the berry for 2.6 seconds once it has laughed the splash off.
- Put away, the hare is gone; it next comes out 16 seconds of attended day after the return, as on a load.
- The lamp child presses its nose on a lit clear block up to the fifth row; higher than that it stays at its place.

### Still weak

- Nobody has heard the game. The sounds are numbers held in range by `voices.test.ts`; the new bubble and the rap are among them.
- No tablet has run it. The draw count is 52 at most; the frame rate is not measured.
- The light of a single short block is still a slab wider than it is deep. It now lies under its block, is the block's outline and moves with it, but whether a child of five ties it to the block before moving one is a guess.
- The light lies over the top of the pond for a wall three rows high or more. A block fresh from the pond keeps clear of it; a block the child lays there covers it, which is the child's doing.
- The five icicles hang 44 units apart, so their touch shapes of 70 units overlap: a finger between two takes the nearer one. Each alone is 48 px; side by side each has about 30 px that is its own at 820 px wide. The same holds for small things set side by side in a wall.
- King Winter's leg is a thin line with a small boot. It reads in the stills at full size; at 820 px wide it is slight.
- Behind the wall the lamp child's face is seen only through the one clear block its nose is on; behind cloudy ice or snow it is hidden, as the wall hides the king.
- The hare is paper on paper with a thin blue rim: easy to miss by day, as a snow hare is.
- At night the peeper's hat crosses the lamp child's feet when both stand in the corner of front snow that is kept clear of lying things.
- A snow block lying half on the pond's cloudy rim is the hardest of the six things to see.
- On a surface under 430 px high the home control is 105 stage units wide and 127 deep, larger than any thing in the game. With King Winter on a seat in the fourth row right under it, the top edge of his hat lies up to 6 px under the control's foot, and for the moment he stands up on that seat his crown is up to 19 px under it and the hat up to 31 px. `reach.test.ts` holds those caps and holds that neither happens on a taller surface. Keeping them clear would cost him his highest seat near the middle on every surface.
- A lamp in a high hollow is hung by a child who stands at the foot of the bank under it; the child does not reach up to it.
- The lamp child owes one rap for each lamp newly shut in. One lamp let out and another shut in by the same move is no rap.
- At night King Winter can be left on a seat a load would not give him (see "For the owner to decide").
- The snowball's rings, the drops and the footprints were redrawn for the second reading, and the rim of light, the beads, the beard's drops and the shards for the third; each was looked at in one still.
- The rim of light at a snow block has a corner in it (see "Reader"). It is the mark nearest a sign that pass 8 left.
- In a gap as narrow as a gate can be, King Winter is a quarter of his width and a fifth taller. It reads as a squeeze in the still; whether it is funny or odd to a child of five is a guess.
- Sat in the snow at night, an icicle let go over him is no hat and comes down on the end of the bank beside him, as anything let go beside the bank does (pair 24).
- King Winter takes no seat above the fourth row (pairs 20, 21): a child who builds higher for him gets the foot and the grumble.
- The lowest 12 units of the seated king, the fur at his hem, are touched as his seat (pair 25).
- The stills of passes 6 to 8 were looked at by the builder only.

### What the next builder should know

- A carried thing lands on the lift only if the Mount calls `touch.letGo()` on pointer-up.
- Laying ink with `multiply` and clearing to paper first where an ink must stay pure gives a two-ink print with no third colour anywhere. A night is the same print with its paper and inks swapped for their values under a second pull, painted once to a second still layer.
- Many things in one fill: each pull of ink is one path of every thing's shapes, with holes wound the other way. The draw count then does not grow with the number of things.
- Put the Mount's logic in a class with no browser in it (`play.ts`): parked equals loaded, the corner, cancel and the scene's sound are then plain tests.
- A sound that waits for a motion is asked for by the step in which the motion happens, never by a delay on the note.
- A test of a touch must go through the same calls the Mount makes. A fix placed in `lift()` was held by a test that called `lift()`, and a tap never got there.
- For who is in front of whom in a flat picture, give each walker a side of the wall and one place to change sides; the view then clips whoever is behind to the air that is not a block.
- Counting a wait in steps needs half a step of slack: sixty small numbers do not sum to one.
