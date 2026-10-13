<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates
- Sheet: round 1, 7 findings, each pasted word for word. Round 2: pairs 1 to 19 pasted by the lead; the sheet's hash with them in (sha256 of the text of `ART.md` above "## The look") is `e715af9bec529d41bf0157338b2bf4a93fee175d2f01226a4d75209f3c3dbb3b`. Round 3: pairs 20 to 30 pasted by the lead. The sheet's hash with pairs 1 to 30 in is `e4e4e80fa5a757faae8fcc5e252d18c46d9d44077428e49a84ed6af796314826`. Round 4: pairs 31 to 38 pasted by the lead.
- Toy checkpoint: passed by the lead only. The owner has not seen the game.
- Look in use: laser-cut plywood layers, the first look reserved for the game in `docs/art-direction.md`. The lead let it stand at the toy checkpoint, so the second reserved look (woven tapestry) was not tried.
- Open: no pair waits. Pairs 31 to 38 for the sheet, from the close of the second reading, are pasted by the lead. Each says what the game does where the sheet is silent or a ruling changed it: a carry held still for a second, the snail on the leaf, the toad seen through the door, a thing let go while the view slides, the hedgehog's huff, the worm coming into the open, and the idle hand on the nest and the door. With them in, the sheet's hash is `995722203a0d99a647371615f8ff171aaed4d90d929c50f0e7bc60a599df7560`. Pairs 1 to 30 are pasted.
- Open: a request to the lead to enter the look in the claimed-styles registry. The row is the last thing in `ART.md`.
- Readings: two, each by a fresh reader the lead started, and both closed. Reading 1: not ready, with 6 marks under the rule on drawn text and 14 things under the game against its sheet, 4 of them things a child would notice; closed by the lead's 13 rulings. Reading 2: not ready, with 2 marks and 4 near ones under the rule on drawn text and 8 things under the game against its sheet, 3 of them things a child would notice; closed by the lead's 12 rulings. Each ruling is built and held by a named test (see "Reading 1 and its close" and "Reading 2 and its close"). No third reading follows: the lead takes the game as it stands after this close.
- Open: no frame rate measured. This run makes no production build and runs no probe. The count that stands in for it is the busiest frame: 76 draws. Memory is counted, not measured: every sheet the game keeps is under 24 megapixels at 1180 by 820 and pixel ratio 2.
- Open: nobody has listened to the sounds, and nobody has watched the motion. The sounds are held to the motion by tests; the stills show poses.
- Open: the cold playtest proxy ran on the dev page, not on a production build.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The parts below belong to the block.

### What the game is

The wood in one frame and the room at the table in a second, in the look, answering one finger. Everything the sheet lists is built:

- **Looking under.** Six covers, each with its own way of opening and shutting and its own two sounds; what lies under each in each of the four seasons; the ten dwellers' own acts; the woodlouse that moves in where a thing was carried off, and trundles away when the thing comes home.
- **Carrying.** The six things are picked up where they lie and carried under the finger. A thing let go hangs for 0.3 seconds, and a finger landing on it again carries on.
- **The grid.** Each thing touched where it lies, set down before the hedgehog (unrolled and rolled up), put down on the path, set on the toad's stone, and set in the puddle or the bowl: 55 cells with the fifteen pairs on the table, each with a motion and a sound of its own.
- **Wet and shiny.** A thing out of the water is wet and drips, the jay takes it as he takes the button, each in its own way, and the wet apple is too heavy for him. The nest dries what is in it, and the feather wipes a wet thing dry.
- **The animals.** The hedgehog's nose and eye on the worm, the jay's eye on what shines, the toad's look from the thing in the hand to the bare half of his stone; each with its own answer to a poke and to each thing.
- **The five scenes.** The jay's theft, the toad's swap, the hedgehog and the worm, the turn of the year and coming home. Each is saved when it starts and ended by any touch, silent from that frame.
- **The room.** The table, the bowl, the window and the doorway in their season, the pairs, a thing carried out through the door in the hand, and the toad on the table.
- **Found as left.** Every field of the sheet's saved state; put away at any instant, the game settles as a load would find it.
- **The idle ladder**, in all its forms, fading after four showings.

What to try first: open the stone and carry the worm to the hedgehog's nose. Dip the snail in the puddle and put it down on the path, then touch the nest. Set the apple on the toad's stone. Carry two things onto the door of the house, go in, and set one against the other.

### What is weak

What a child would notice:

- Nobody has heard the sounds. A sound that is wrong for its motion is the first thing a child would meet.
- Carrying is found only by a finger that lands on a thing and moves. The proxy's blind touches opened covers and turned the year and never once carried a thing. The ghost hand shows a carry after five seconds of nothing.
- The wheel shuts every open cover as it turns the year and moves the finds, as the sheet says. A child tapping about loses what was opened: the proxy did, twice. It is the one touch that undoes what the child made.
- Spring has only the worm and the snail to carry. That is the sheet's own choice: its table of six places by four seasons puts the ladybird, the tadpole, the caterpillar and the beetle under the other four covers in spring, and the button first under the stone in summer.
- A finger that carries a thing and holds it still for a second gives the work to the next finger that lands, and the thing goes back where it came from. A child who holds a thing still while the other hand taps loses the carry.
- The path is the same earth in every season: in winter the hills, the meadow, the crowns and the blades at the front are white and the path is not.
- A thing carried out through the door is under the finger all the way, but the wood it is carried into slides in from the left under it for most of a second before anything there can be aimed at. Let go during that slide, it hangs in the air until the wood stands still, up to most of a second, and is then set down.
- The door shows what is on the table small, 0.3 of its size: a thing can be told by its colour, not by its shape. Six things share 66 units behind the door, so they overlap, and the toad, when he sits on the table, stands in front of them and of the bowl.
- The door of the house is shown by the idle ladder only at the second showing of the hand, 18 idle seconds in, and only after a thing has been carried.
- The room on a first visit is an empty table, a bowl and knocks.
- The beetle's head that peeps from each fan of the long grass is never found: a touch on it answers as the cover.
- The hole the snail eats in the apple is for good. Nothing else in the game is.
- After its circle the snail sits on the leaf, so a touch on the middle of the leaf reaches the snail; the leaf is opened by its other half. With the leaf open on the bank the snail sits on it there, half over the water's edge (still last-2).
- A touch that slips on a thing lying on open ground puts the thing back where it lay with a small thud. The thing's own act, which a clean tap gives, has by then been cut short by the lift.
- A knock on bare wood rides half a second (`voices.ts`): a ring that opens out from under the finger, a chip that hops, and the sawdust. It is still the smallest answer in the game, and its ring has faded by the end.
- The things are small on the long table, and the room's wall, shelf, picture and coats only answer as a knock.
- With six things along the table there is no room to set two together that are not neighbours until one is moved off: the one let go rolls off the edge and out of the door, as the sheet says a thing with no room does. So does a thing let go beside two that are already a pair, or where neither side of the other has room.
- A finger on a pair picks up whichever of the two is nearer.
- The snail with the feather glides a hand's width only where the table has room for it either way; with none, the pair holds its pose on the spot.
- None of the motion has been watched by a person. The stills show poses.

The rest:

- No frame rate has been measured.
- Painting a piece is the heavy work of the look, and more of it than before: the hills, the meadow and the front strip are wide sheets with a side for each season, and a piece that turns is painted for each of up to eight ways of the light. While the year turns the coming sides are painted ahead, two to a frame. Counted by `frameBudget.test.ts`: the most pieces painted in one frame of the walk is 7 (it was 5 before the store was held to a size: a piece that was let go is painted again when it is next seen), and the worst there is, a second touch in the frame after the wheel was touched (a double tap on the wheel), is 10. The frame the saved state is read in paints the whole wood. Either may be felt as a hitch on a slow tablet. The sheets kept are counted under 24 megapixels (22.83 at most in the walk, the store's own limit); what that takes on a tablet has not been measured. After a change of tier or size the picture is a little soft for a few frames, until every piece has had its turn.
- Sentences of the sheet the game does not fully keep, from the builder's own last reading of it against the code. "Nothing the game sets down covers what the child aims at": the snail the game seats on the leaf covers half of that cover. "Each thing that answers is ... well apart from the next": not on a full table, not in the nest, and not the snail on the leaf. "An overlap test holds all of this": the test does not cover the room's painted scenery, the small things and the toad seen through the door (which overlap each other), or the snail riding the leaf while it stands open on the bank, which the scripted walk never does.
- Gone on load, none of it saved and none of it named by the sheet: the snail perched on the rolled-up hedgehog and the feather stuck in him (each lies on the path before him), the snail's trail, the rocking of things sent in, and that a thing was carried on this visit, so the idle ladder shows the door again only after a new carry. The worm lies turned as its tuck asks after a load, since that follows from where it is.
- Before the saved state has been read only the back board shows: the sky, and bare board below it, with no hill, cover, animal, wheel or hung piece, for as long as the read takes. The whole wood comes in the one frame the state is read in. Nothing answers a touch until then.
- A thing carried out through the door and put away in mid carry is back on the table, and the child is in the wood.
- The proxy's measure of "seen to answer" was a rough count of changed pixels, taken after the finger had been down as long as the touch lasted. It missed knocks that were over by then.
- The room's painted scenery has no footprints; the overlap test covers the wood, the things, the toad and the table.
- The dev page logs one 404 on load, which is not the game's.
- The marks under "Reader" were changed by the code that draws them and are held by `ply.test.ts` where a number can hold them (the seven branches, the tick, the breast, the wheel's edges, the pond skater, the ribs of the low branch's leaves), by `look.test.ts` (the glint) and by `noticed.test.ts` (the ghost hand's ring). Seen in the three stills of the last close: the branch on the wheel, the bush and the two front patches, the wheel's edges and the pond skater. Not seen in a still after their change: the branch on the jay's crown (he stands in front of it), the ones in the window and the doorway of the room, the ribs of the low branch's leaves at a size they can be judged at, and the ghost hand's ring.

### Considered and not built

- A basket of wool on the floor of the room: it stood on the rug and under the way a thing rolls from the table to the door.
- The second reserved look: the first stands.
- A second resting contact in the proxy: the rule is held by `play.test.ts` through the same path.

### Stills

Run 2 took eight stills, all it allowed, all pinned with `tier=0`, kept outside the repository: `r2-1.png` to `r2-8.png`. Seven are at 1180 by 820 and one at 1024 by 768. They show the look as it was before the close of reading 1: a dark outline, no thickness, shadows that turned with the piece.

| Still | Size | What it shows |
| --- | --- | --- |
| 1 | 1180 by 820 | The wood as a first visit finds it: spring, every cover shut. |
| 2 | 1180 by 820 | After the first fix set: covers open, things about on the ground. |
| 3 | 1024 by 768 | After the second fix set: the same state at the smaller size. |
| 4 | 1180 by 820 | The room: the feather afloat in the bowl, the button on the table, the worm coiled round the snail's shell. |
| 5 | 1180 by 820 | The room after the third fix set: the garland, the lamp and the framed leaf. |
| 6 | 1180 by 820 | The wood with every cover open, the woodlouse under the log and the stone, the worm climbed out on the far bank. |
| 7 | 1180 by 820 | The room after the fourth fix set, the lamp in mid swing from a knock. |
| 8 | 1180 by 820 | Winter: the log, the burrow, the stone and the puddle open, the acorn put down on the path and rolled into the dip, the bubble under the ice. |

The close of reading 1 took four more, all it allowed, at 1180 by 820 with `tier=0`: `c1-1.png` to `c1-4.png`.

| Still | What it shows |
| --- | --- |
| c1-1 | The wood in spring, every cover shut, three seconds idle so the glow is on. The first with a thickness on every piece, the burnt line in place of the outline, grain on every sheet and every shadow down and to the right. The blades at the front were still an even zigzag, and the meadow did not yet flip. |
| c1-2 | The year turning from spring to summer, a second and a third in, after the first fix set (thicker sheets, uneven blades, a thickness on the front strip): the wheel between two quarters, the bush, the leaves of the low branch and the left half of the front strip on their summer side, the right half and the crowns to the right still on their spring side. No sheet was caught edge on. |
| c1-3 | Winter, after the meadow was made a sheet that flips: the hills, the meadow, the crowns and the front strip white, the one-sided twigs, the worm with its head under the edge of the shut stone, the burrow and the long grass open with a woodlouse in each, the button sent in and showing small on the table through the door, and a knock on bare wood late in its ring with the chip in the air. |
| c1-4 | The room in winter after the last fix set: the acorn and the button on the table, the far rise white in the window and the doorway, the jars and the bowl without their bars and face, and a knock on the window early in its ring, with the chip and the sawdust. |

Not seen in a still after its last change: the worm's head 12 units further under the stone than in c1-3, and the far rise in the window stained with the season.

The close of reading 2 took three more, all it allowed, at 1180 by 820 with `tier=0`: `last-1.png` to `last-3.png`.

| Still | What it shows |
| --- | --- |
| last-1 | Winter, every cover shut. The branch on the wheel's winter quarter, on the bush behind the fence and on the two patches at the front: each a kinked stem with one side branch to each side at different heights, each different, none with two arms on one side. The quarters of the wheel meet as a pinwheel, the bend plain at rest. The sky board is bare. The jay stands in front of his crown, so its branch is all but hidden. |
| last-2 | Summer: the long grass open with a woodlouse in it, the snail carried to the puddle, and the leaf then touched open. The snail sits on the leaf, which lies open on the bank, half over the water's edge. The pond skater in the open water is a short body with four bent legs, each ending in a dimple: an insect, not a cross. |
| last-3 | Spring: the worm sent in through the door, carried out of the room in the hand and set on the toad's stone. The toad sits on the table at home and is seen through the door of the house, all of him, about as wide as the doorway, in front of the window; he hides the bowl. The worm lies stretched on the stone, the stone's cover open with a woodlouse under it. |

To take them again: start the dev server, open `?chrome=0&seed=1&tier=0#/play/nature-walk` at the size wanted with a pixel ratio of 2, and touch in stage units (1180 by 820, fitted and centred): the covers at 625,500 (grass), 350,512 (log), 590,702 (stone), 800,712 (puddle), 318,338 (branch) and 895,340 (burrow), the wheel at 128,132, the door of the house at 1120,440. In the room the things sent in lie along the near edge of the table from 800,628 leftward, and the bowl is at 150,584.

### Reader

Every drawn mark a child of three could take for a letter, a numeral or a sign, and why each is weaker than the thing it is. Nothing here is meant to be read, and nothing depends on it.

| Mark | Could be taken for | Why it is weaker than what it is |
| --- | --- | --- |
| The crack engraved on the stone | a letter, a numeral or a bracket scratched on it | One long crack that bends twice and a short nick away from it, with moss dots beside them; they roll over with the stone. |
| The bare branch on the wheel's winter quarter, which stands upright at the top of the wheel all winter | a letter with arms, or a fork | A stem that kinks at each of its two forks, with one side branch low to one side and one higher to the other, of different lengths, each bent at a knee; never two arms on one side of an upright, and never two from one point. Under two dots of snow, one of four pictures with a blossom, a sun and a leaf (`BRANCHES`, held by `ply.test.ts`). Seen in still last-1. |
| The other bare branches of winter: on the jay's crown and the bush, on the two patches at the front, on the tree in the window and in the doorway | a letter with arms, or a fork | Seven branches in all and no two the same: each place engraves its own (`BRANCH_OF`, held by `ply.test.ts`), by the same rule as the wheel's, some with a further small twig off a knee, at different sizes and leans on a piece stained white. |
| The pond skater in the summer puddle | a cross | A short body with four legs that each leave it from their own place, bend at a knee and end in a dimple on the water; no two legs cross and no two feet mirror each other (`SKATER_LEGS`, held by `ply.test.ts`). Seen in still last-2. |
| The cracks on the ice | a letter with three arms | Lines of different lengths that do not meet. |
| The edges of the wheel's four quarters | a cross in a ring | Each edge is a curve whose middle stands 15 units and more off the straight line from the pin to the rim, a quarter of its length, so the four meet as the blades of a pinwheel and read so at rest; a hub of wood 34 units across on its brass pin covers where they meet (`WHEEL_BEND`, held by `ply.test.ts`). Seen in still last-1. |
| The glint on the button | a plus sign | One short white arc along the button's rim that opens and shuts; no stroke crosses another (held by `look.test.ts`). |
| The short curves on the summer crown and bush, and on the jay's breast | a row of the same small letter | No two are the same width, depth or tilt (`BREAST`, held by `ply.test.ts`; the crown's by the sums in `seasonal.ts`). |
| The snail's two horns | a letter with two arms | Two stalks of different lengths with a knob at each tip, one leaning back and one forward, on the head of a snail; they go in and come out one at a time. |
| The blades of the strip at the front | a zigzag, a row of the same letter | No two blades next to each other are the same width, height or lean, and one tuft stands taller. |
| The veins of the leaves on the low branch | an arrow pointing up | Three ribs, one to each leaf, that start apart and never meet, of different lengths and bends, with four short veins off them; no two strokes mirror each other about a middle one (`BRANCH_VEINS`, held by `ply.test.ts`). |
| The warts on the toad | rings, noughts | Filled spots of different sizes with no ring round them. |
| The veins of the leaf on the puddle | a star of strokes | They fan from the notch of a leaf that is plainly a leaf, on water, and it glides when touched. |
| The bar of the window, in the house and in the room | a cross or a plus sign | There is one upright bar only, set off the middle of an arched pane; there is no level bar. |
| The rings on the sawn end of the log and on the top of the stump | a nought, or a target | Two or three uneven rings one inside the other on a piece that is plainly cut wood, never a ring alone. |
| The bubble under the ice | a nought | It is a pale ball with a highlight on it, under a sheet of ice, and it squeaks away from the finger. |
| The spiral of the snail's shell | a numeral with a curl | It is the shell of a snail with horns and a foot, and it turns as the snail does. |
| The pebbles on the path | dots in a row, a tally | Each is a different size, and they are scattered, not in a line or a group. |
| The two holes of the button | a pair of dots, a face | They sit inside the rim of a round pearl button that flips and glints; the hedgehog and the toad take it for a face too, which is the joke. |
| The spots of the ladybird and the blossoms on the leaves | dots to be counted | They are unevenly placed on a living thing and nothing answers to their number. |
| The ripples engraved on the puddle and the bowl | a wavy sign, or on the bowl a face | Short bent hairlines of unequal length on blue water. The bowl has two, one long and one short, at different heights, and its side is bare: nothing under them makes a mouth. |
| The pales of the fence | a row of equal strokes, a tally | They are cut pieces with pointed tops behind a bush, joined by two rails, and partly hidden. |
| The planks of the wall, the floor and the house | rows of level or upright strokes | They run from edge to edge of a surface as boards do, and are engraved faintly. |
| The sun's ring | a nought | It sits inside a spiked sun that hangs on a thread and swings. |
| The shine on the two jars on the shelf | a bracket, a stroke | One bent line down the side of each, of different lengths, where a jar shines; there is no level bar. |
| The leaf in the frame, and the leaves of the garland | a pointer or an arrowhead | Each is a leaf shape with one vein, stained a leaf's colour; no two neighbours on the garland are the same size or tilt. |
| The glow and the ghost hand of the idle ladder | a sign to decode, or for the ring of its tap a letter open at one side | The glow is a soft breath behind a thing, and the hand is a hand that shows a move. The ring of its tap is closed all the way round (held by `noticed.test.ts`). |
| The gloss streak on a wet thing | a stroke, a tick | One pale streak along the thing's own edge, with drops falling from it. |

The weaker ones, left as they are and listed so that they are known:

- The six spokes on the rolled-up woodlouse: a star of strokes, or an asterisk. They are the plates of its back, on a grey ball with feelers that rolls and unrolls.
- The six equal chevrons on the feather: a row of the same mark. They are the barbs of a blue feather with a quill.
- The two arcs side by side on each cloud: a letter with two humps. They are the swell of a white cloud that hangs on a thread.
- The head of a beetle between the blades of each fan of the long grass, two eyes and two feelers: a face, not a sign.

Marks changed or taken out at the close of reading 2: the winter twig, which had two arms on one side of an upright in all its copies; the pond skater, which was two crossed lines; the top two veins of the low branch's leaves, which made an arrow with the midrib; the far birds engraved on the sky, which read as ticks and are gone; the wheel's edges, whose bend was too shallow to be seen at rest; the ring of the ghost hand's tap, which had a gap.

Marks changed at the close of reading 1 because they were too near: the button's glint was two crossed bars; the wheel's quarters met in a cross; the winter twigs were forks; the ice had a crack with three arms; the far birds had two humps; the stone had two bracket-like hairlines; each jar had a level bar; the bowl had a curve under its two ripples; the small curves on the crown, the bush and the breast were all alike; the toad's warts were rings.

Marks taken out in run 2 because they were too near: a lone engraved ring on the tin on the shelf, then the wavy line that replaced it; the level bar that made the window a cross; the knots engraved as a lone ring on the great trunk, the lid of the log and the flap of the burrow, and the curls tried in their place, which read as a letter in still 8. Those three pieces now carry grain lines only.

### Reading 1 and its close

One reading by a fresh reader, who read every file and ran nothing. Its verdict was not ready: no finding under the rules on official wording, addresses, names and record ids; 6 marks under the rule on drawn text; 14 things under the game against its sheet, 4 of them things a child would notice. The lead closed it with 13 rulings. Each is built, and each fix has a named test that fails when the fix is taken out (checked by taking each out in turn).

| Ruling | What was built | Held by |
| --- | --- | --- |
| 1. A thing carried out through the room's door stays under the finger | The thing in the hand is drawn last, outside both frames, so the slide does not move it | `door.test.ts`: "stays under the finger while the view slides from the room to the wood" |
| 2. No sound without sight | Going through the door, in or out, ends what was moving in the place that is left and closes its sound; the place is found as it was left. "Seen" in the sync test is now drawn: the motion is in the frame on screen when its sound is heard, and the picture with it differs from the picture without it. That measure found one sound whose own piece did not move (the snail under the feather, where the table has no room to glide): the snail now dips as the feather lands | `door.test.ts`: "going in while a cover is still on its way ends that motion silently", "coming out while a pair on the table is at its act ends that act silently"; `clock.test.ts`: "sync: every sound of the whole walk is heard in the frame it falls due, while the motion it belongs to is drawn on screen" |
| 3. The snail's horns one at a time, drawn | Two horns drawn live, each as far out as it is, in the touched snail and beside the button | `touch.test.ts`: the three tests under "the snail's horns come in and go out one at a time" |
| 4. The worm tucks its head under a cover | Under the edge of the shut stone, level; else under the foot of the shut long grass; else among the blades at the front. It is drawn before the cover its head is under, and comes out onto the path when that cover is opened | `touch.test.ts`: "under the stone while it is shut, then under the long grass, then among the blades at the front" |
| 5. The look | A thickness of three plies on the side away from the light; the shadow thrown one way for every piece by painting each piece for the way it stands; grain at every tier, as broad bands at the cheap ones; a thin burnt line in place of the outline; the hills, the meadow and the front strip flip with the season. One draw number, 75 | `ply.test.ts`: the four tests on thickness, grain and the light; `look.test.ts`: "the lid of the log and the right fan of the grass throw their shadows the same way as the rest", "flips the two sheets of hills, the meadow and the strip of blades at the front"; `frameBudget.test.ts` |
| 6. Rule 5 marks | Each changed so it is not a sign; the Reader table rewritten, and "seldom upright" taken out | `ply.test.ts`: the three tests under "engraved marks are no letter and no sign"; `look.test.ts`: "the button's glint is one short arc along its rim" |
| 7. The jay never gets a thing by a slipped tap | A thing that lay on open ground and is let go within a quarter of a second, or less than 48 units from where it lay, stays where it lay | `touch.test.ts`: the two tests under "the jay never gets a thing by a slipped tap" |
| 8. A thing let go on the door does not vanish | It sails in and lands, small, on the table that shows through the door, and whatever is on the table or in the bowl shows there. The ladder's second showing is the door once a thing has been carried and the room not seen | `door.test.ts`: "is seen going in, and stays in sight on the table that shows through the door", "once, at its second showing, when a thing has been carried and the room has not been seen" |
| 9. A knock answers where the finger is | A pale ring with a dark one in it and a chip of wood that hops up under the finger, at every tier; the hanging piece nearest the finger swings when one hangs within 260 units; on the puddle's open water, rings and a plip | `touch.test.ts`: "on the open water of the puddle a touch is rings and a plip", "the hanging piece that swings is the one nearest the finger, and with none near a chip of wood hops up under the finger at every tier" |
| 10. The reader's items | The jay swells by a third (pair 26 gives the reason); the hedgehog unrolls for a worm on the toad's stone and one that climbs out of the puddle; the hole, the wake and the knuckle are drawn; no woodlouse from a hollow the thing never left; no scene when nothing was sent in; the wet apple is dragged a hand's width along the edge; the toad on the table glances at a knock; the bite shows with the first rasp; the knock window is one number, a third of a second | `touch.test.ts`: the tests under "the animals answer as the sheet has them" and "the hole the snail eats in the apple", "the toad on the table glances at a knock", "the window in which a second touch on a moving cover is a knock is one number"; `look.test.ts`: the hole, the wake, the knuckle; `door.test.ts`: "coming home is a scene only when something was sent in" |
| 11. Spring | Left as it is; the weak list says it is the sheet's own choice | |
| 12. The dead `door` act | Removed: no mover is named `door` | `door.test.ts`: "is seen going in" asserts no such act |
| 13. Documents | This file | |

### Reading 2 and its close

A second reading by another fresh reader, who read every file that is not a test, searched the tests and ran nothing. Its verdict was not ready: no finding under the rules on official wording, addresses, names and record ids; 2 marks and 4 near ones under the rule on drawn text; 8 things under the game against its sheet, 3 of them things a child would notice. The lead closed it with 12 rulings. Each is built, and each fix has a named test that fails when the fix is taken out (checked by taking each out in turn). No further reading follows.

| Ruling | What was built | Held by |
| --- | --- | --- |
| 1. Memory | The store of painted pieces is held to a size: only the season shown and the one being turned from are kept, and at the end of each frame what that frame did not stamp is let go while more than 5.9 surfaces' worth of pixels is held, a piece's spare paintings of the light first, then the longest unused. A change of tier or size paints at most ten pieces a frame (a wide sheet counts five), and stamps the rest as they were until their turn | `frameBudget.test.ts`: "holds every sheet it keeps under 24 megapixels through the whole walk: all four seasons, both places and every cover" (22.83 at most), "a change of tier or of size is spread: at most ten pieces painted again in a frame, the rest stamped as they were until their turn" |
| 2. A thing let go while the view still slides | It hangs where the finger let it go until the slide is at rest and is set down there; a new touch brings the view to rest at once. The jay starts nothing while the view slides | `noticed.test.ts`: the three tests under "a thing carried out through the door and let go while the view still slides" |
| 3. The toad on the table is seen through the door | A piece of his own, all of him, about half the size he is on his stone, standing in the doorway | `noticed.test.ts`: "is seen from the wood through the door of the house, all of him and large" |
| 4. The hedgehog unrolls for a worm that comes into the open anywhere | Also when its cover is opened over it and when it is tipped from the nest; while the child is in the room, silently | `noticed.test.ts`: the three tests under "the hedgehog unrolls for a worm that comes into the open anywhere" |
| 5. Marks | Seven branches that fork as branches do, one for each place; the pond skater with four bent legs; the ribs of the low branch's leaves apart; the far birds gone; the wheel's edges bent deep; the ghost hand's ring closed; the Reader table brought up to date with the weaker ones listed | `ply.test.ts`: the tests under "engraved marks are no letter and no sign"; `noticed.test.ts`: "taps with a ring that is closed all the way round" |
| 6. The idle hand and the nose agree | The hand taps the cover the nose points at; with the worm in the nest the nest glows and is tapped, and with the worm in the house the door of the house. The nose already pointed at the worm in the nest | `noticed.test.ts`: the two tests under "the idle hand and the hedgehog's nose" |
| 7. A slipped tap by the hedgehog's nose replays nothing | The slip is judged before anything else in the wood | `noticed.test.ts`: "replays nothing: he does not sniff it again, and it stays where it lay" |
| 8. The snail stays on the leaf | After its circle it sits on the leaf and goes where the leaf goes, drawn and touched there; in the bowl it floats with no leaf. Pairs 32 and 33 say so | `noticed.test.ts`: "stays on the leaf after its circle, wherever the leaf goes; in the bowl it floats with no leaf" |
| 9. A carry whose lift never arrives | A lost pointer capture is handed on as a pointer cancel is, and puts the thing back; a finger that lands while a carry has had no move for a second takes the work, and the thing goes back | `play.test.ts`: "a carry whose lift never arrives does not deaden the game", "a lost pointer capture is handed on as a contact taken away", "a finger that is carrying is never interrupted while it moves" |
| 10. The hedgehog poked again | He huffs, swells once and turns his back; he does not shake. Listed for the owner beside the jay's scold | `noticed.test.ts`: "huffs and turns his back: he does not shake, and nothing of it is fear" |
| 11. Before the save is read | The back board only, bare below the sky; then the whole wood in one frame | `frameBudget.test.ts`: "before the saved state has been read nothing half-drawn shows: the back board only, and then the whole wood in one frame" |
| 12. Documents | This file and the art guide | |

### Template notes

- `nature-walk.tsx` (the Mount): thin. It hands every pointer event, every frame's step and every put-away to `play.ts`, and draws what `view.ts` draws.
- `play.ts`, `sound.ts`, `rules.ts`, `step.ts`, `toy.ts`, `things.ts`, `ground.ts`, `footprints.ts`, `cells.ts`, `cellVoices.ts`, `poses.ts`, `room.ts`, `roomArt.ts`, `findArt.ts`, `sprites.ts`, `script.ts`, `recorder.ts`: the game's own.
- **For the template:** a store of painted pieces that is held to a size and spreads its repainting (`sprites.ts` here) is wanted by any canvas game that paints its pieces once; the reader's reckoning before it was near 50 megapixels.
- `config.ts`: the tiers carry `grain` and `dust`; `LADDER` has one place, `wood`; `AUTUMN_FROM_AGE` added.
- `state.ts`: used as copied, wrapped by `save.ts` as its header describes. `state.test.ts` says the designed order has one place.
- `scene.ts`: used as copied, for the five scenes.
- `audio.ts`, `input.ts`, `guidance.ts`, `overlay.ts`, `stage.ts`, `rng.ts`: used as copied.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen, as copied.
- `manifest.ts`: the icon family is `play`.
- **For the template:** a canvas game has to write its own counting context to hold the frame budget in a test with no canvas (`recorder.ts` here). One in the template would save each game the same file.
- **For the template:** the path from the glass to the model (which contact works, the corner, the ladder, the put-away) is the same in every game and is where the wave's rules live; `play.ts` here could be the start of a template file.
- **For the template:** `handPose` gives the hand's press but not where its fingertip is relative to the sprite, so each game finds the offset by a still.

### For the owner to decide

The nearest things in the game to a punishment, praise, blame, a count and a prompt come first.

- **The nearest thing to a punishment: the jay takes a shiny or wet thing that is put down on open ground.** The thing is always seen in his nest, one touch on the nest brings everything back, and a test holds both however the scene is cut. Is a theft the child can always undo with one touch within what the owner wants?
- **The nearest thing to praise:** the hedgehog walks one small proud circle wearing the apple, and the jay looks proud of his own tail after the feather. Each is about the thing; no animal looks at, nods to or cheers the child.
- **The nearest thing to blame:** the jay ruffles up and scolds with a lowered brow when he is poked, and squawks, offended, at the snail's trail; and the hedgehog, poked again as a ball, huffs, swells once and turns his back on the finger. Each is the animal's temper at the poke, the same every time. The hedgehog trembled with a squeak before, which read as fear of the child; that is gone. Is an animal that is put out by a poke within what the owner wants?
- **The nearest thing to a count:** the nest shows what the jay has taken, as the things themselves. Nothing is tallied, and nothing says how many were found or brought home.
- **The nearest thing to a prompt:** the idle ladder (a glow after three seconds, a ghost hand after five, at most four times, each later than the last, then the glow fades), and the hedgehog's nose pointing at where the worm is.
- **The first visit by age:** spring for a child under five or with no age, autumn from five. The sheet takes this default; a saved season always wins.
- **The burrow's flap rests upward**, on the bank, when it is open. It is the only place it clears the door, the grass, the jay's tree and the hole.
- **The look:** laser-cut plywood layers, as in the four stills of the close of reading 1 and the three of the close of reading 2. The owner has not seen it. The path keeps one colour all year while everything stained with the season turns: is that wanted, or should the path turn too?
- **The jay swells by a third when poked, not to twice his size** as the sheet first had it: at twice he would go through the open flap of the burrow and the top of the frame. Pair 26 says so.
- **A slipped tap is not a theft.** A thing lying on open ground that is let go within a quarter of a second, or less than a finger's width from where it lay, stays where it lay. A child who means to hand the jay a thing by nudging it a little will find it does not work; a carry does.
- **Going through the door ends what was moving in the place left, silently.** An act the child set going and left is not watched to its end on return: it is at its end.
- **The door shows what is on the table**, and the toad when he sits there. It is small, and it answers nothing: a touch on it is the door.
- **A carry held still for a second can be taken over.** The next finger that lands takes the work and the thing goes back where it came from. It keeps a lift that never arrives from deadening the game; it also means a child who holds a thing still and taps with the other hand loses the carry.
- **The hole in the apple is for good.** It is the one thing in the game that one touch does not undo.
- **The snail stays on the leaf** after its circle on the puddle, and rides it when the leaf is opened onto the bank.
- **The wheel shuts the open covers** as the year turns. The sheet says so; the proxy shows what it costs a child who taps about.

## Pass log

| Pass | Looked at | Critique, in the child's words | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| Run 1 | Run 1's six stills: the first frame in the look, every cover open in three seasons, the idle ladder, both sizes. | The log looked open already. The grass was two clumps hiding nothing. Open covers lay over each other and over the door. What was found was small. The middle was bare sand. | Fit and fullness of the frame: lid, grass fans, stone, flap, larger finds, far trees, fence, birds, greener front strip. | Not measured. 51 draws at most. | The open flap touched the jay's tail and a tree stem; the open stone lay over the puddle; the sky was plain; the shut grass was a flat block. |
| 1 | Still 1: the wood as a first visit finds it. | The bird's tail is a stick poking into the little house in the hill. One of the small trees grows into the big leaves. The bird's tree stands in the grass. | The jay's tail is a short wedge with a blue tip that hangs clear of the burrow's flap; the far tree moved off the branch's leaves; the stem of the jay's tree lifted onto the rise, clear of the open grass. The sky has its layers and the grass its blades, as the rulings asked. | Not measured. | Seen in still 2. |
| 2 | Still 2: covers open, things about. | The frog is sitting on the snail. The stone rolled onto the grass. The bird's leaves touch the flap when it is up. I cannot see the beetle in the dark hole. | Things take more room where they lie and the toad's footprint is wider, so neither is set on the other; the open stone rests further from the grass and clear of the puddle; the jay's crown moved off the open flap; the beetle is stained blue against the dark of the burrow. | Not measured. | Seen in still 3 at the smaller size: clear. The house wall stood under the spots where things tipped from the nest land; moved after it, and seen in still 6. |
| 3 | Still 4: the room. | The room is empty up there. There is only a wall. | The upper wall filled in the same look: a garland of cut leaves, a lamp over the shelf, a framed leaf by the door. | Not measured. | Seen in still 5: the leaves floated under their string; the tin had a ring on it like a nought; the lamp was painted on and did not move when the wall was knocked. |
| 4 | Stills 5 and 6, and the proxy's log. | The leaves are not on the string. When I knock in the house nothing swings. I touched the lid again and nothing happened. The little things are hard to get hold of on the small screen. | The string runs through the top of every leaf; the ring on the tin is gone; the lamp hangs on its cord as a piece of its own and swings from a knock in the room; a second touch on a cover that has just set off is a knock, never nothing; a thing is picked up within 58 stage units of its middle (100 pixels across at 1024 by 768) and the nest answers as widely; a thing the toad lands on with the table full goes out to the step, never into a full bowl. | Not measured. Busiest frame 62 draws. | Seen in still 7. What is listed under "What is weak". |
| 5 | Still 8: winter, four covers open. | There is a letter on the flap, and one on the big tree. | The knots on the trunk, the lid and the flap are gone, leaving the grain; the rings on the log's end and the stump are closed rings one inside the other. | Not measured. | Not seen in a still: the eight are used. |
| 6 | The lead's still and reading 1: the look read as flat drawn shapes with a dark outline. Then c1-1. | It is a picture, not wood. The lid's shadow goes the wrong way. The grass at the bottom is a row of teeth. | A thickness of three plies and a shadow thrown one way on every piece, a thin burnt line for the outline, grain at every tier; then, from c1-1: thicker sheets, blades of uneven width, height and lean, a thickness on the front strip. | Not measured. 74 draws. | Seen in c1-2: the hills and the front strip flip, the meadow and the path never change. |
| 7 | c1-2: the year turning. | The trees turn green but the grass they stand on does not. | The meadow is a sheet of its own, stained with the season, that flips about its foot like the hills. | Not measured. 75 draws. | Seen in c1-3: in winter the path stays earth, by choice. The worm's eye showed at the stone's edge; the knock's ring was faint late in its life. |
| 8 | c1-3: winter, the worm under the stone, a knock. | The worm is only next to the stone. I can hardly see the ring. | The worm lies 12 units further under, and comes out onto the path when the stone is opened; the ring is wider and stays solid for two thirds of its life. | Not measured. 75 draws. | Seen in c1-4 for the ring. The far rise in the window was green in winter: stained with the season after it, not seen again. |
| 9 | Reading 2 and the lead's rulings; then last-1 to last-3. | That twig is a letter. The water bug is a cross. Where did the frog go? The hedgehog is scared of me. | Seven branches that fork as branches do; the pond skater with bent legs; the toad seen through the door; the huff in place of the tremble; the snail on the leaf; a thing let go in the slide waits for the wood to stand still; the store of pieces held to a size. | Not measured. 76 draws. | Seen in the three stills: the branches, the wheel, the skater, the toad in the doorway. The snail on the open leaf hangs half over the water's edge. The toad in the doorway hides the bowl. |

### The cold playtest proxy

A script, not a child. It ran once on the dev page at 1180 by 820, from a first visit with nothing saved: 48 touches at seeded random points anywhere on the glass, seven in ten of them taps held for between 0.08 and 0.45 seconds and the rest short drags in a random direction, with about three and a half seconds between touches. It knows nothing of the game. After each touch it read what the game had saved, and during each it compared a patch of the picture under the finger with the same patch just before.

- The second touch opened a cover (the leaves of the branch). The first change to the saved wood came at touch 2, and 11 of the 48 touches changed it: six covers opened, one shut, the hedgehog rolled up, and the wheel was turned twice.
- No error was thrown.
- 35 of the 48 touches were seen to change the picture under the finger while the finger was down. The other 13 were looked at again, six of them by a second script that sampled the same points every few hundredths of a second: each was a knock on bare wood that was seen within a tenth of a second and was over before the first script looked. So every touch was answered; the measure was too slow, and the knock is brief.
- **Unclear moments.** It never carried a thing: no drag began on a thing lying in the open. Each turn of the wheel shut every cover it had opened, and it ended with every cover shut again and the hedgehog a ball. A second touch on a cover just after the first did nothing at all.
- **Fixed after it:** the second touch on a cover is now a knock; a thing answers further from its middle. **Not fixed, and listed as weak:** carrying is not found by blind touching, and the wheel shuts what was opened, which is the sheet's design.

### The lessons, each with its test

| Lesson | Held by |
| --- | --- |
| One clock for sight and sound; no sound without a motion that is drawn on screen; every landing heard when it lands; no delay inside a voice | `clock.test.ts`: "sync: every sound of the whole walk is heard in the frame it falls due, while the motion it belongs to is drawn on screen", "a landing is heard when it lands", "waits are seconds on the clock, not frames"; `door.test.ts`: "no sound without sight: what is left behind the door"; `voices.test.ts`: "no delay hidden inside a voice" |
| A scene ended by a touch is silent from that frame; put-away closes all sound | `sound.test.ts`: "through the game: a touch during each scene cuts it in that call", "through the game: a put-away closes all sound" |
| Every pose value is read by the view; a thing is touched where it is drawn | `view.test.ts`: "every pose value the model computes is read by the view", "a thing is touched where it is drawn, in every state"; `layout.test.ts`: "a cover is touched where it is drawn" |
| No flag outlives its touch, no timer full on load, nothing starts or sounds on load | `parked.test.ts`: "no flag outlives its touch, no timer is full, nothing starts or sounds" |
| Parked equals loaded; the ladder is taken back at put-away | `parked.test.ts`: one test for each of 26 states, at several instants; `play.test.ts`: "put away while it hangs" |
| Pointer cancel and a lost capture never act for the child | `play.test.ts`: "pointer cancel never acts for the child", "a lost pointer capture is handed on as a contact taken away, like a pointer cancel" |
| The corner answers nothing; nothing a child touches under the home control | `play.test.ts`: "the top-right 72 px corner answers nothing and does not take the idle ladder back", "under the home control only bare wood answers"; `overlap.test.ts`: "under the home control or in the grown-up's corner" |
| Age is only a first-visit default | `save.test.ts`: "age is only a first-visit default" |
| No lookalikes of letters, numerals or signs | The "Reader" part above; `ply.test.ts`: "engraved marks are no letter and no sign"; `look.test.ts`: the glint; `frameBudget.test.ts` holds that no text is drawn |
| A resting contact never deadens the game; a carry survives a lifted finger | `play.test.ts`: "a resting contact never deadens the game", "a carry survives a lifted finger" |
| An animal's own act never resets the ladder; a tap may last half a second | `play.test.ts`: "the idle ladder" |
| The answer to a touch is never left out by a tier | `view.test.ts`: "a knock is drawn at every tier"; `touch.test.ts`: the ring and the chip at every tier |
| An animal or a place takes a thing only when it is let go there, and never by a slipped tap; the theft is seen and undone with one touch | `touch.test.ts`: "the jay never gets a thing by a slipped tap"; `cells.test.ts`: "whatever he takes shows over the rim of the nest, and one touch on the nest brings all of it back", "in play: each thing he takes is in the nest when the scene starts, however the scene is cut" |
| Found as left at any instant | `save.test.ts`: "found as left: at every moment of the whole walk" |
| Nothing lies on or passes through anything | `overlap.test.ts`, seven tests at both sizes |
| Touch targets; one draw number | `layout.test.ts`: "touch targets are 48 px or more"; `frameBudget.test.ts`: "holds on the busiest frame of a walk through the whole game" (76, under 80) |
| Memory is held to a bound and repainting is spread | `frameBudget.test.ts`: the megapixel test (under 24) and the spread test (at most ten a frame) |
| No test writes a file, reads the environment or allows more than 60 seconds; no machine path or name in any file; the pairs counted | Kept by hand and by search before the report. The tests that play the whole walk allow 30 seconds each; the slowest ran for about 10. |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

- **Alive at idle.** The three animals blink and each does three small things of its own in its own time; their eyes follow the last thing that happened and what each wants; the hung pieces sway; something stirs under a shut cover every few seconds; what lies in the open breathes.
- **Motion and sound on every touch.** Every touch is answered when the finger lands: a cover, a find, a thing, an animal, the nest, the wheel, the door, the bowl, and a knock anywhere else. No sound plays without a motion that is seen, on the one clock (`clock.test.ts`).
- **Weight, squash and follow-through.** The stone is the slowest thing and squashes when it lands; the grass and the leaves spring past where they stop; the lid of the log rises in two steps and claps down; the toad lands with a squash; the apple tips his stone.
- **Kid-clear silhouettes and tappables.** Every piece is one cut outline with a thickness, a burnt line along the cut and a shadow. Covers answer 107 pixels across or more at 1024 by 768, a carried thing 100, the animals more (`layout.test.ts`).
- **Wordless clarity for the band.** No word, letter, numeral or sign; the marks that come nearest are listed under "Reader". The wordless check passes.
- **Wordless idle guidance.** A breathing glow after three seconds, a ghost hand after five that shows one move, at most four times, fading after; any touch clears it, and a put-away takes it back.
- **60 frames a second on a mid-range tablet.** Not measured: no production build and no probe in this run, and no physical tablet. Counted instead: 76 draws in the busiest frame of a scripted walk through the whole game (stamps plus live paths), under the bar's 80; every sheet kept under 24 megapixels at 1180 by 820 and pixel ratio 2; pixel ratio capped at 2; no shadow at draw time and no pass over the frame; four quality tiers with the governor.
- **Procedural or committed assets only.** Every piece is painted by code and every sound is synthesised. Nothing is fetched.

### The learning claim

Nature Walk has no learning goal. It is designed from no record and claims no school skill.

### Defaults taken for the owner

- A first visit opens in spring for a child under five or with no age, and in autumn from five.
- The burrow's flap rests upward when open.
- The jay takes a shiny or wet thing let go on open ground, the path or the foot of his own tree; it shows in his nest and one touch brings it back.
- A thing let go hangs for 0.3 seconds before it is set down; a contact that rests for a second hands the work to the next, and a carry held still for a second goes back.
- The puddle, the bowl and the toad's stone each hold one thing.

### What the next builder should know

- Put the path from the glass to the model in one module and play every test through it. Most of the wave's rules (resting contact, cancel, the corner, the ladder, put-away) are rules of that path, not of the model.
- Give each sound event the moment it falls due, not the frame it was noticed in, and fire cues from the model's clock. The sync test is then one line.
- Keep one function that says where a thing is drawn, and hit-test through it. "Touched where it is drawn" then holds in every state without a list of states.
- Footprints as a few discs for each piece are enough to hold "nothing lies on anything" in a canvas game, and the same discs find the nearest free ground.
- Hold the store of painted pieces to a size from the first day, and count it in a test: painting each piece once for each way it is seen grows without a bound otherwise.
- A blind proxy finds what tapping finds. It does not find carrying; say so rather than tune the script until it does.
