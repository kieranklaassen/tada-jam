<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates. The whole sheet is built: the table, the three scenes, the hook, every cell of the grid, the cat. The game's tests, the typecheck, the wordless check and the egress check pass. No frame rate has been measured and no production build was made (see "Not checked").
- Sheet: round 1, 6 findings, each replacement pasted word for word. Round 2: pairs 1 to 11, pasted by the lead. Round 3: pairs 12 to 29, pasted by the lead. Round 4: pairs 30 to 38, pasted by the lead. Round 5: pairs 39 to 45, pasted by the lead. Hash of the sheet as it stands with all forty-five (SHA-256 of every line above `## The look`): `6867fe9a5a30965f5586379194ec024e75e8bec83516a0a8280612888b8774b6`.
- Reader: three readings, each by a fresh reader, all recorded and closed. Reading 1 (10 marks, 18 things in the game against its sheet, 7 of them a child would notice) is closed by the lead's 23 rulings, pass 5. Reading 2 (7 marks, 17 things, 9 of them a child would notice) is closed by the lead's 16 rulings, pass 6. Reading 3 (3 marks, one clear and two slight; 8 things, one of them a child would notice) is closed by the lead's 10 rulings, pass 7. The three tables are under "The sheet read against the code". No further reading follows: the lead takes the game as it stands after pass 7.
- Toy checkpoint: passed by the lead only. The owner has not seen the game, the look or the toy.
- Look in use: Rainbow scratch card, the first look reserved for the game. The second reserved look was not tried.
- Try first: on a first visit put the candle on the sheet (it rolls into a lantern), tap the lantern, wait for the door, then carry the lantern slowly left along the ground to the fox (lowered as far as it goes on the way, its red finds the hedgehog), up to the owl, down to the badger, tap the dark lantern, and let it go on the hook by the door. Then pull it off the hook, cut a window with a finger, drag a paper onto it and walk again.
- Weak, a child would notice: listed under "Weak" below, twenty-one lines.
- Weak, the rest: listed under "Weak" below, twelve lines.
- Open, requests to the lead: no pair waits; the registry row and the README row are added by the lead when the game is taken.
- For the owner: is the look right (Rainbow scratch card, stills 18 to 22)?
- For the owner: is the toy right (carrying the lantern)?
- For the owner: may the creatures named in `met` gather when the lantern is hung, or is that too near a reward?
- For the owner: may the badger blow the candle out after a hold of 0.62 to 1.15 seconds that taking the light away cancels, or should it hold longer?
- For the owner: should the idle hand show pulling the hung lantern down, or should the finished scene show no hand at all? The sheet now says the hand comes there as in any idle stretch (pair 26).
- For the owner: is a creature shown whole in cream, when a patch only touches its foot, the right reading of "seen whole"? Built so that it then also answers.
- For the owner: in the ending the fox comes to its place a body's length short of the moths' tree, 30 stage units short of the end of its lane, sits and looks away. It never reaches the hung lantern's red glow, which it could not do without standing on something.
- For the owner: a lantern on its hook lights nobody. Its windows glow on the wall, and a creature the glow lies on is drawn as the dark shows it; only moths riding the yellow glow are drawn lit (pair 35).
- For the owner: the wood was laid out again at the close of reading 2 so that a straight carry does the right thing first: the step, the hedgehog's home, the two lanes and the windows of the ready sheets all moved (see "Defaults taken for the owner").
- For the owner: the hook takes the lantern from a finger let go anywhere from the hook itself down to where the grip of a hung lantern rests, a finger's width to either side, and the idle hand shows the way to the hook once it has shown every creature's place, or after a minute of a walk. Is that too easy an ending, or too soon a hint?
- For the owner: the three apples and the five lamps are sets a child may want to complete. Nothing marks completion: no sound, no picture and no count answers the third apple or the fifth lamp differently from the first.

## What is built

**The table.** A room in the same scratch card. On the scraped-clear table top lie the sheet, the three papers (once the sheet has a window), the scissors, the candle and the pile. A finger on the sheet cuts: the scissors are at the finger at once and snip, and lifting closes the cut into a window whose scrap falls to the cat, which bats it. The scissors can also be picked up where they lie and carried to the sheet. A paper dragged onto a window goes behind it; dropped anywhere else it slides back with the cat after it. The strip beside the sheet's right-hand side, drawn as a lip, is the edge: dragged across, it rolls the sheet, and a rolled sheet dragged back the other way unrolls as it was cut. A finger on the sheet itself only cuts. The candle set in the rolled sheet, or set on the flat sheet, makes the lantern; a tap on the lantern, or a finger that only slips on it, lights the wick. A ninth cut closes again behind the scissors. A fresh sheet dragged off the pile as far as the sheet's place replaces the sheet in hand with the sheet the position names; let go nearer the pile it slides back onto the pile, seen and heard, and changes nothing. A second finger that lands while one works is answered with a knock where it lands.

**The three scenes.** Out of the door (6 s), Home (8 s) and Taken down (4 s), each saved at its first moment as the sheet lists, each ended by any touch, silent from that frame.

**The wood.** Six creatures by five lights and plain light: every cell of the grid has its own motion and its own sound, the wrong-colour cells and the no-paper cells among them, each with a test named after its cell. The spider pulls itself up when light touches it. A creature is drawn lit exactly when a patch touches any of it as it is drawn, and it answers wherever it is drawn lit; in the rest after an answer it blinks and starts instead. A rush is one rule for all six, measured to the creature as it is drawn. The lantern is hung only when it is let go on the hook: with the tip of its pole on it, or with the finger or the lantern itself on it, in which case it is seen to drop onto the hook. Let go on a creature it comes to rest beside it. The idle hand carries the lantern to a creature's place it has not shown yet, and to the hook once it has shown them all or the walk is a minute old. The badger holds its breath 0.62, 0.95 or 1.15 seconds before it blows (the puff, the stream, the yawn), and taking the light away in that time cancels the blow.

**The rules of the wave.** A resting contact hands the work on; a carry survives a lifted finger for 0.3 s; a tap may last most of half a second; a pointer the browser takes away never acts; the grown-up corner answers nothing and leaves the idle ladder alone; nothing starts or sounds on load; a parked game is the game a load gives. Each is a test in `rules.test.ts`, played through `play.ts`, the same path the Mount uses.

## The draw number

One number: **72**, the busiest frame the game can draw: the lantern on its hook over a wood busier than play can reach (eight windows of every paper, every lamp lit, all four large creatures under the glow, the feather down, the badger's breath out, a second finger's nick in the wax, the door open and the idle ring and hand up). It is counted by a stand-in canvas that counts every stamp, stroke and fill itself and agrees with the view's own count. On the hook the glow lights nobody, and whoever it lies on is scraped again over it as the dark shows them, which is the pass that makes this frame the busiest. The same wood with the lantern carried costs 68, and the table's busiest frame 32. One full-surface stamp a frame, and two clipped stamps of the ink layer (through the rounds of the glow-worms' lamps, and through the outlines of the patches). The test holds 72, under 80. Before storage has answered the frame is one fill of black wax.

## Stills

Twenty-two in all, kept outside the repository: five in the toy run (`01` to `05`), eight in the building run (`06` to `13`), four at the close of reading 1 (`14` to `17`) four at the close of reading 2 (`18` to `21`) and one at the close of reading 3 (`22`), all pinned with `tier=0` and `seed=1` on the dev page with nothing drawn over the game. Stills 14 to 17 show the wood as it was laid out before the close of reading 2.

- `06-table.png`, `07-step.png`: before the first fix set of the building run.
- `08-table.png`, `09-step.png`: after it. The table of a first visit, and the first frame of a walk.
- `10-wood.png`: the lantern carried into the middle, blue on the fox, yellow on the fern, red on the stump.
- `11-moths-1024.png`: 1024 by 768, the lantern high by the moths' tree, the moths riding the yellow patch.
- `12-ending.png`, `13-ending.png`: the lantern on its hook after the Home scene, before and after the last fix set of that run.
- `14-table.png`: the table of a first visit as it is now: the ready sheet with its three windows where they now lie, the lip of the rolling edge beside the sheet, the pile a finger's width above the scissors.
- `15-step.png`: the first frame of a walk: the lantern on the step 30 units higher, yellow on the stump, red whole on the frame below it, blue up on the door post, no creature lit, the moths scattered up the bark.
- `16-fox-dark.png`: the candle blown out by the badger and the dark lantern carried to the middle: the fox has crept 130 units along its lane and stretched, the tip of its muzzle on the glass; the hedgehog has stepped aside; two glow-worms hang at the lantern's far side, clear of the fox.
- `17-ending.png`: the lantern hung on the hook after the moths met the yellow: the eight sit along the outline of the yellow glow, grown wide enough for eight, none on the lantern; two of them sit where the red glow lies and are shown lit.
- `18-table.png`: the table of a first visit as it is now: the ready sheet with its three windows, blue at the top, red at the left of the middle, yellow at the bottom; the lip beside the sheet, the pile, the scissors, the candle; the cat under the table with low mounds for paws.
- `19-step.png`: the first frame of a walk: the lantern on the step at the right, blue up on the door post, yellow just above the lantern and behind its flame, red on the stump and its snail. No creature is lit. The moths sit scattered up the bark; the hedgehog is at home under their tree; the fox sits at the left end of its lane; the badger's hole is at the foot of the mound beside it.
- `20-ground.png`: the lantern carried straight left along the ground and held: the fox is in the red, shown whole in cream, sitting with its head turned away; the blue lies on the fern, where one glow-worm holds its lamp up lit; moths that left the bark for the yellow are in the air, two of them across the fox's ear and flank (weak 1).
- `21-ending.png`: the lantern on its hook after a walk that met the moths, the fox and a glow-worm: the eight moths sit lit round the yellow glow, one of them where the red glow lies; the fox sits at its place near the right-hand end of its lane, drawn as the dark shows it, looking away; the hedgehog, not met, is at home; the one lamp is lit.
- `22-hung-by-a-finger-on-the-hook.png`: a finger carried the lantern up to the hook itself and let go there: the lantern is on its way down the pole's length to hang, tilted on its wire, its windows not yet glowing on the wall; the moths that had left the bark for its yellow are in the air; no creature is lit.

## Cold playtest proxy

A script, not a child. Run on the dev page, once in the building run, once after the close of reading 2 and once after the close of reading 3, fresh storage, 1180 by 820. It does, in order, sixteen things a child of four who has been told nothing might do, reads a coarse grid of the canvas before and a quarter of a second after each, and says where the game is. It cannot tell whether anything was understood.

| At | What the script did | What the picture did |
| --- | --- | --- |
| 0 s | Loaded cold | The table, sheet flat |
| 0 to 10 s | Touched nothing | The picture moved in every half-second (the cat); the sheet's edge, where the guide points first, showed its ring after 2.5 s |
| 14 s | Tapped the red paper | Answered at the finger |
| 16 s | Poked the cat | Answered at the finger |
| 18 s | Tapped a window of the sheet | Answered; the scissors had already gone home when the grid was read |
| 21 s | Scribbled a loop on the white of the sheet | Answered at the finger |
| 23 s | Dragged the blue paper onto the sheet | Answered at the finger |
| 27 s | Picked up the scissors and dragged them over the sheet in a loop | Answered at the finger |
| 29 s | Tapped the candle | **Nothing changed at the candle** (9 cells elsewhere) |
| 31 s | Put the candle on the sheet | Answered; the lantern is rolled |
| 32 to 40 s | Touched nothing | The rolled lantern showed its ring after 3.5 s |
| 42 s | Tapped the lantern | Answered at the finger; 7 s later the wood |
| 50 to 60 s | Touched nothing | The picture moved in every half-second |
| 65 to 82 s | Held a finger in the dark, dragged to the owl, dragged fast to the badger, tapped the fox, tapped the lantern, dragged the lantern to the door and let go | Each answered at the finger |
| 91 s | Waited out the ending | The lantern hangs lit by the door |
| 93 to 105 s | Touched nothing | The picture moved in every half-second |
| 109 s | Pulled the hung lantern down and away | Answered; 5 s later the table, sheet flat |

Sixteen of sixteen acts changed the picture within a quarter of a second. Unclear moments the script could show: one, the candle tapped in its place made its sound and did not visibly move. Fixed after the run: a candle picked up hops under the finger, and the sync test's reader for that sound now reads only what is drawn. The table above is the first run.

The second run, after the close of reading 2, on the game as it is now: loaded cold at the table; sixteen of sixteen acts changed the picture within a quarter of a second; the idle picture moved in every half-second watched; the guide showed at the sheet's edge after 2 s, at the rolled lantern after 2 s, at the lantern on the step after half a second of the watch and at the hung lantern after half a second of the watch; after the first scene the game was in the wood; after the ending the lantern hung lit by the door; after it was pulled down the game was at the table with the sheet flat. It showed no unclear moment. A third run after the close of reading 3 gave the same: sixteen of sixteen, the same places, the guide at the sheet's edge and at the rolled lantern after 2.5 s. It is a script: it cannot tell whether a child would carry the lantern low enough for the hedgehog, or would think of the hook before the hand shows it.

What a script cannot show, and the builder expects a child to stumble on: that the sheet's right edge can be dragged to roll it (the candle on the sheet does the same, which is why it is there); and that the scissors' place and the place they cut are not the same place (both now work).

## Not checked

- Nobody has heard the sounds. Every pitch, peak and length is held in range by `voices.test.ts`.
- No frame rate was measured: no graphics card, and this run was told to make no production build and run no probe. The lead measures.
- The cold playtest proxy is a script run on the dev page, not on a production build, and not a child.
- The marks held by eye and not by a test (the shingles, the shelf brackets, the jar lid, the owl's branch, the path stones, the glow-worm's body, the nail, the owl's claws, the two fringes, the ball of string) were looked at in the stills only where a still shows them. The owl's turned head, the badger's grin and the sleeping moths are in none of stills 18 to 21; each is held by a test of its numbers.

## Weak

A child would notice:

1. Moths in the air and moths riding a yellow patch cross whatever they pass: one another, the fern, the trunk, a creature the patch is carried over (still 20: two across the fox). Only things at rest are held apart. A glow-worm on its way down its thread to a seat with room may cross the corner of the fox's room.
2. The carried lantern is in front of whatever it passes, and a finger can hold it on a creature. Let go, taken away by the browser or put away, it comes to rest beside the creature.
3. A creature a patch only touches is shown whole in cream while most of it stands on black wax, like a paper cut-out.
4. The same cream for every creature in every colour of light: a fox in blue is not blue.
5. The moths' ring round a yellow glow is grown until eight open pairs of wings fit along it and clear the lantern, so on a small or narrow window they sit well outside the light they are drawing, and one may sit in the red glow (still 21). Where a yellow patch runs off the frame they sit along the frame's edge.
6. With the ready sheets only the red reaches the hedgehog, and only with the lantern carried nearly as low as it goes; lower still for the apples. The yellow and the blue of a ready sheet never reach it, so its yellow trot and its blue ball are seen only through a window the child cut. With the one-window sheet no light reaches it at all.
7. With the one-window sheet, which is yellow, the fox and the badger are reached only by a light that is the wrong one for them: the fox sneezes. The ghost hand has places only for the moths, the owl and the glow-worms with that sheet, and none for the badger with the three-window sheet.
8. The fox jumps the longer way its lane allows. From the left end, its home, that is over the blue puddle by its own length; from the middle or the right end it may jump away from the puddle, and where the hedgehog stands near, the jump is shorter than a body.
9. The fox follows the red only within its lane, 206 units long.
10. The fox creeps to a dark lantern only where the lantern is within about 300 units of its head, and knocks the glass only where its lane lets its muzzle reach; elsewhere it stretches, sniffs and does not knock. With the fox at home a dark lantern near it has room for only some of the five glow-worms.
11. The hedgehog walking to a low dark lantern from its right stops short of it and does not bump the pole; from its left it bumps.
12. Carried home across the fern, the red of the ready sheet puts out the lamps the blue lit. Home along the ground and then up keeps them.
13. The red of the ready sheet does not fall where the sheet says the windows fall. On the step it lies on the stump and its snail, not on the door; on the hook it lies on the moths' tree, not on the wall. Its yellow lies just above the lantern, behind its own flame (still 19). The red is level to the lantern's left so that it reaches the fox along the ground, and no small move of its window keeps that and puts it on the door.
14. On its hook the lantern lights nobody: a creature that was shown whole in cream all walk is drawn in lines over the glow that lies on it.
15. A dark lantern in the wood is lit only by a tap on the lantern; a tap anywhere else brings it there dark.
16. If a walk met no creature by its rule, the ending is the lantern on its hook and nothing else.
17. A very large window the child cut can lay light on a creature from the door step. It waits for the first touch, but it is shown lit.
18. The longest waits with nothing to do: the owl's beat in the ending, 3.4 seconds, and the badger's rest after it wakes, 3.2 seconds.
19. A tap on the pile makes a small slide and the sound of the sheet sliding back, and nothing else.
20. The hook is wide: a lantern let go anywhere from the hook down to where its grip hangs, about 128 units across and 370 high beside the door, ends the walk. A child who lifts the lantern off the step and lets go at once has hung it with nobody met, and the way back is through the table.
21. The canopy is still rows of arcs, uneven now, and the grass is still tufts in a row.

The rest:

1. The draw number is a forced worst case, not a measured frame.
2. Lost after a put-away, by design of the save: apples the hedgehog had spiked, scraps under the table, moths asleep at the foot of their tree (they are found on the bark), a glow-worm on the ground or on its thread, the feather, a creature's rest. The thirteen saved fields are what is found.
3. A thing let go less than 0.3 seconds before the game is put away is settled as let go and saved by the put-away. A game killed in that third of a second without a put-away keeps the save from before the let-go, and the lantern's saved place may be 400 ms old.
4. The proxy is a script on the dev page.
5. The sync test's readers for the creatures include the name of the creature's act, which is not itself drawn; each act changes the pose it draws.
6. The lantern's turn on its wire shows in its patches; the lantern's own body is not drawn turning.
7. The only red things the red light shows the hedgehog are three windfall apples, which lie behind its track at the height the red of a ready sheet reaches, not on the ground line. The sheet's cell also names a toadstool cap, and none is spiked.
8. The fungi, the frond and the creepers under the branch are in no test but the fullness grid.
9. `startDown` clears what the ending would have saved, and so does the ending's last beat when a touch lands it. The test of the race fails only when both are taken out.
10. A rolled sheet with the wick lit cannot be unrolled: the walk has begun. The way back to a flat sheet is then the walk itself, or a fresh sheet after it.
11. The tests of the ending meet each creature by play, with a helper that carries a named light to it; a creature is never put into `met` by hand. The helper knows where each creature is, which a child does not.
12. What the idle hand has shown, and how long the walk has gone on, are not saved: after a put-away the hand begins again with the creatures' places and the minute begins again.

## Reader

Every drawn mark a child of four could take for a letter, a numeral or a sign, and why each is weaker than the thing it is. Removed in this run because they were not weaker: the rows of scallops in the canopy and of zigzags in the grass and eaves; the owl's breast as rows of waves; the knots in the two trunks (a ring with a bent stroke in it); the fox's brush as a lone ring; the glow-worms' unlit lamps as lone rings on sticks; floorboard joints that made two posts and a rung; the shelf and the sill as two level strokes. Redrawn at the close of reading 1, each because a fresh reader took it for a sign: the shingles, the shelf brackets, the jar lid, the bark on the owl's branch, the plaster cracks, the path stones, the back of the owl's head, the badger's brows and teeth, the glow-worm's body, the nail, the sleeping moths and the moths on the bark. Each has its row below. Redrawn again at the close of reading 2: the sleeping moths (two loose heaps), the band on the fox's brush (one bow), the three cracks, the badger's teeth and eye stripes, the twigs, the back of the owl's head, the cat's paws and stripes and the strokes of plaster in the room; and rows were added for what that reader found outside the table. Redrawn at the close of reading 3: the band on the brush of the walking fox (the same one bow as the sitting fox's), the three feathers of the owl's tail and the wrinkle over the squinting fox's nose.

| Mark | Could be taken for | Why it is weaker |
| --- | --- | --- |
| The owl's breast feathers | Diamonds, or a V | Uneven drops of different size and lean scattered between two wings, never in a row |
| The owl's beak | A V | It sits between two very large eyes that move |
| The spider on its thread | An i, or a mark under a line | It hangs to one side of its thread and holds it with one of eight legs that work, has two eyes that follow the lantern, bobs, and pulls itself up when lit |
| The door's planks | Upright bars, a row of I | Uneven widths under a round arch, crossed only by two hinge straps that curl and are not level |
| The door's latch | A small box, an o | It sits on a plank beside a strap |
| The curled ends of the hinge straps and the hook's upturned end | A 6, a 9, a J | Each is the end of a longer iron thing fixed to the door or the wall; the hook carries the lantern |
| The canopy | Rows of U or C | Clumps of uneven width, droop and lean, broken by sprays of leaves; no two neighbours alike |
| The grass and the mat's fringe | V, W, rows of I | Two or three blades a tuft, each its own height and lean, unevenly spaced; the fringe threads are of every length |
| The fox's chest and the band on its brush | A zigzag, a Z, a W | The chest is the edge of fur on a fox that breathes, and runs down it. The band is one bowed stroke across a brush with a ragged tip, sitting, walking, creeping and leaping alike: a test draws the fox in every pose a walk puts it in and finds no zigzag but the chest's |
| The moon in the wood and in the window | A C | Two arcs lying on its back behind leaves; in the window it is behind a cloud and a branch |
| The glow-worms' lamps | Lit: a disc, an o. Unlit: a bud | Each is held up on a stalk by a worm with a face, five of them at uneven heights along an arch; unlit it has a point |
| Eyes in the dark | Two rings | Each pair has pupils that follow the lantern, and blinks |
| The badger's paws and nose, the hedgehog's nose | Ovals, an o | Parts of a face or a belly that rocks |
| The rings on the stump and the snail's shell | A 6, a 9, a spiral | The shell is on a snail with horns and a foot; the stump's ring is its cut top |
| The eaves' slates | A row of ticks or check marks | Closed four-cornered tiles hanging from the eave line, each of its own width and depth, every other one slipped: no open stroke is left to be a tick |
| Sleeping moths | A row of eight uprights, a tally of pairs, a fence | Each has a head, shut eyes, drooped feelers and a ringed tail. They lie in two loose heaps of unlike size, some with a wing across a neighbour, and neither their gaps, their heights, their leans nor their sizes go turn and turn about (a test holds each); each swells as the snore goes round; they are there only while the blue is on their tree |
| Moths on the bark | A grid, an 8, a B | Scattered up the trunk alone or two abreast, no three in a line across or down and the rows unevenly apart (a test holds it), with wings, eyes that follow the lantern and feelers that twitch out of step |
| The window's one upright bar | An I, half an H | One bar and no cross bar; a branch and a moon cross behind it |
| The coat's two buttons | A colon | Between the coat's two front edges, on a coat on a peg |
| The ball of string | A ring, a Q | Three arcs across it and an end hanging down from the shelf, among jars of every size. By eye |
| The cat's whiskers | Three level strokes | Uneven, slanting, on a face whose eyes follow the finger |
| The scissors | A cross, an X | Two loops and two blades in one flat colour, lying aslant; they open and close |
| The candle | An i | A flat peach shape with a wick, on the table |
| The lantern's two bands | Two level strokes | The rims of a barrel that swings |
| The idle ring | A ring of dashes | Eleven ticks of uneven length that turn, breathe and fade |
| The knock on a bare place, and the nick a second finger leaves in the wax | An asterisk | Five uneven ticks that jump out from under the finger and are gone in a third of a second |
| The candle's smoke, the badger's breath | An S, a C | Lines that rise, wave and fade in two seconds |
| The framed moth on the room's wall | A picture to decode | A picture on a wall, of a thing the wood holds; nothing depends on it |
| The nail the picture hangs from | A caret, an A without its bar | A round head, with the picture's cord looped over it |
| The two shelf brackets | Lone V shapes | Each a closed wedge with a bowed side against the wall under the shelf, one smaller than the other |
| The smallest pot on the shelf | An equals sign, an F, a T | Squat and round-shouldered under a domed lid: no level stroke lies across an upright or over another level stroke |
| Bark on the owl's branch | A row of dashes, a dotted line | Six marks, no two of one length or lean, no two gaps alike, some high on the branch and some low |
| Cracks in the plaster | A column of chevrons, a Y, an S | Three jagged hairlines, each nearly straight with its own slant and length: one beside the door post, one over the door, one under the eaves. None stands above another, none forks and none bows twice (a test holds it) |
| Stones of the path | A row of dashes, lozenges | Six lumps with corners, no two of one size and no two gaps alike, half hidden in grass |
| The back of the owl's head | A row of diamonds, a zigzag | Six drops like the breast's, scattered: neither their heights nor their sizes go turn and turn about and no two gaps side by side are alike (a test holds it); seen only while the head is turned away |
| The stripe through each of the badger's eyes | Two level strokes, an equals sign, a wedge over the eye | One closed patch from brow to cheek, wider at the cheek, on a face that rocks: nothing level and nothing open (a test holds it) |
| The badger's teeth | A zigzag, a row of V or W | Five closed pegs of unlike width and length with a gap where one is gone, inside a grin, seen only while it grins (a test holds it) |
| A glow-worm's body | An m | One high loop behind and a low shoulder before it, on a worm with a face and a lamp, inching |
| The hook's bracket | A K | A closed triangle of arm, brace and wall with the lantern's hook curling from its end |
| Twigs on the ground | A Y on its side, eight times | Each is one stick bent once with no fork, and no two lie one way at one length (a test holds it) |
| The cat's front paws | Two L shapes | Two low mounds of unlike width under the loaf: no path of the sitting cat is two strokes at a right angle (a test holds it) |
| The stripes on the cat's back | A tally of four | Four bent strokes of unlike length, no two gaps between them alike (a test holds it), on a back that breathes |
| Strokes of plaster on the room's wall | An X, a T, a plus, a mark on the window | The wall is ruled into cells and a cell holds at most one stroke, wholly inside it: no two cross or touch, none lies on the window, the shelf and its jars, the coat or the picture, and no two side by side lie one way (a test holds it) |
| The owl's claws | Three uprights under an arc | Three toes that splay outward over the branch under a breathing breast, the outer two leaning. By eye |
| The scarf's fringe | Four uprights, a tally | Four threads of unlike length and lean at the end of a scarf that hangs from a peg. By eye |
| The rug's fringe | Nine level dashes | Nine threads of unlike length and tilt at the rug's end, unevenly apart. By eye |
| The mouth of the badger's hole | An arch, an n | An uneven arch open at the ground, with a root hanging over it, the dark inside and dug earth before it, at the foot of the badger's mound |
| The apples the red shows | Rings, an o | Three, unevenly apart, seen only in red, and the hedgehog spikes each and carries it off |
| The three feathers of the owl's tail under the branch | A tally of three | No two of one length or lean, and the gaps between them unlike where they leave the body and where they end (a test holds it) |
| The wrinkle over the fox's nose as it squints | Two level strokes, an equals sign | One bowed stroke, seen for the second before a sneeze; a test finds no two strokes of the fox lying like an equals sign in any pose |

## The sheet read against the code

Read twice, each time by a fresh reader, sentence by sentence, and each reading closed by the lead's rulings. Before the first the builder read it alone and found nothing; the first reader found eighteen things, seven of them things a child would notice. What became of each:

| Ruling | Built | Held by |
| --- | --- | --- |
| 1. Letting go at the moths must not hang the lantern | Hung only when let go at the hook (since the close of reading 3: the grip within 60 units of its place under the hook, or the finger on the hook or on the line down from it); a tap never hangs it; no place of the ghost hand for a creature is there | `promises.test.ts`, "the hook" and "the hand's places and the hook"; pairs 12 and 39 |
| 2. Nothing at rest covers the hung lantern | The moths' ring keeps off the lantern and inside the frame | `layout.test.ts`, the ending's ring and the ring off the frame; pair 24 |
| 3. Fox, unlit | It creeps along its lane, stretches, and knocks only where its muzzle is on the glass | `promises.test.ts`, "the fox and a lantern that gives no light"; pair 29 |
| 4. Badger, red | The stream bends the flame over, away from the badger; the hold is 0.62 to 1.15 s and can be cancelled | `promises.test.ts`, "the badger" |
| 5. Moths draw the window's outline | Seats along the outline of the patch as it is | `layout.test.ts`, four shapes |
| 6. The hand taps once | One press | `promises.test.ts`, "the ghost hand"; pair 25 |
| 7. Lit means answered | One rule: drawn lit where a patch touches any of the creature as drawn, and it answers there; a glance during a rest | `promises.test.ts`, "lit means answered"; pair 17 |
| 8. Rush | One rule for all six, measured to the creature as drawn | `promises.test.ts`, "a rush is one rule for all six" |
| 9. The fox follows the red patch; every swing rings | It follows the patch within its lane; the bell is paired to what is true | `cells.test.ts`; `promises.test.ts`, "the lantern's note"; pair 14 |
| 10. Eyes of moths and worms | They follow the lantern | `promises.test.ts`, "eyes and lamps" |
| 11. Exactly those inside the blue outline | Paired: those the blue touches as the topmost light | the same; pair 15 |
| 12. The badger in the ending | It sits up and blows whatever it was at; with the candle out it does not | `promises.test.ts`, "the badger"; pair 13 |
| 13. Nothing lost inside the grace by a put-away | Settled at put-away as let go | `rules.test.ts`, "nothing let go just before the game is put away is lost"; pair 27 |
| 14. `startDown` clears `ending` | It does, and so does the ending's last beat | `promises.test.ts`, "the ending" |
| 15. No sound without sight | The whirr with the first lap seen; no footstep sound exists; scraps slide to the table's edge before they fall | `promises.test.ts`, "no sound without sight"; `table.test.ts`, "scraps" |
| 16. Standing across | Fox and hedgehog a body apart always; hanging worms off both; the lantern rests beside a creature | `promises.test.ts`, "standing across"; pairs 16 and 23 |
| 17. The ready sheet must work | The windows of the ready sheets moved, and moved again at the close of reading 2. As it stands: all three patches are on the frame at the step and light no creature there; with three windows the hand has a place for five creatures (not the badger) and with one window for three (the moths, the owl, the glow-worms); the red reaches the fox and, carried low, the hedgehog; the yellow and the blue never reach the hedgehog (weak 6 and 7) | `promises.test.ts`, "the ready sheet works"; `walk.test.ts`, "a straight carry with a ready sheet" |
| 18. The table | Unrolling; the edge is a strip beside the sheet; the pile further from the scissors; a slip changes nothing; a drag lights | `table.test.ts`; pairs 19 to 22 |
| 19. What the hand shows | A cut that closes; the candle on the flat sheet as the third showing | `table.test.ts`, "what the ghost hand shows"; pair 25 |
| 20. A second finger | A knock at the table, a nick in the wax in the wood | `table.test.ts`, `promises.test.ts`, "a second finger" |
| 21. Before storage answers | Black wax only | `view.test.ts`, "before storage has answered"; pair 28 |
| 22. The marks | Redrawn; see "Reader" | `layout.test.ts`, "rows that must not read as signs", for the two that are data; the rest by eye |
| 23. Documents | This file | |

The contradiction the reader named, "nothing asks" against the hand pulling a hung lantern, is settled by pair 26: the idle guidance comes in the finished scene as in any other idle stretch. It stays under "For the owner".

Reading 2 found seven marks and seventeen things, nine of them things a child would notice, and confirmed every fix of reading 1 in the code. What became of each:

| Ruling | Built | Held by |
| --- | --- | --- |
| 1. The owl in the ending | One hoot, and the head is seen to turn all the way and come back: the dark no longer clears the turn the beat has just set. Every test of the ending now reaches it through a walk in which each creature was met by play | `cells.test.ts`, the three scenes; `promises.test.ts` and `rules.test.ts`, the ending, through the helpers in `hand.ts` |
| 2. A resting contact | In the finished scene as at the table and in the wood: a finger that landed off the hung lantern, or has lain a second on it without pulling, hands the pull to the next finger | `rules.test.ts`, "a resting contact never deadens the game" (table and wood); `walk.test.ts`, "a resting contact never deadens the hung lantern" |
| 3. The fox on a first walk | Its lane is 206 units, a leap is 204, and the hedgehog's home is a body past the lane's end: from home it jumps the blue by its own length and more and pounces as far. In the ending it comes to its place a body's length short of the moths' tree, 30 units short of the end of its lane, sits and looks away for two seconds and more, and a hedgehog in its road steps aside whether or not it was met | `walk.test.ts`, "the fox on a first walk"; `promises.test.ts`, "standing across"; pair 34 |
| 4. A straight carry | The ready sheets are cut again: yellow up and a little to the right of the lantern, blue above it, red level to the left. Carried straight out from the step at carrying height the moths get the yellow first, the fox the red, the glow-worms the blue and the badger the red; no grip in the hook's round lays yellow on a moth | `walk.test.ts`, "a straight carry with a ready sheet" |
| 5. Every apple can be spiked | Three apples, all in the hedgehog's lane, at the height the red of a ready sheet reaches | `walk.test.ts`, "the hedgehog and the red things" |
| 6. Home | Nothing is drawn lit before the glow is drawn, and on its hook the lantern lights nobody: only moths riding the yellow glow are drawn lit | `walk.test.ts`, "the hung lantern lights nobody who does not answer"; `view.test.ts`, "what a frame costs"; pair 35 |
| 7. Taken down | A lantern that hung dark is not pinched and gives no smoke | `walk.test.ts`, "taken down"; pair 36 |
| 8. A lantern taken out of the hand | A cancel, a put-away and a save in mid-carry all leave it beside a creature, and a save that holds it on one is found beside it | `walk.test.ts`, "a lantern taken out of the hand never stands on anybody"; pairs 31 and 37 |
| 9. A fresh sheet let go short | It slides back onto the pile, drawn and heard | `table.test.ts`, "a slip and a sheet let go short"; `view.test.ts`, the table's sliding sheet; pair 32 |
| 10. Fox, red | It gets up, is heard to pad a pace into the red, then sits, looks away and hums; the meeting is the hum | `walk.test.ts`, "the fox on a first walk"; pair 38 |
| 11. Plain light on the glow-worms | Each worm the light touches knocks in its own time | `walk.test.ts`, "the glow-worms in plain light" and the one after it |
| 12. The badger at rest | Cheeks half full and drawn so; its hole drawn at the foot of its mound, in a room of its own | `layout.test.ts`, "the badger at rest" |
| 13. A slip, and a tap in the wood | A slip is 60 units in all, whichever way; a tap lights a dark lantern only on the lantern, and elsewhere brings it there dark | `table.test.ts`, "a slip and a sheet let go short"; `walk.test.ts`, "the candle in the wood" |
| 14. The wire | Sheet and code say one thing: a tick at the turn of a swing wider than 0.3 of a radian | `walk.test.ts`, "the wire"; pair 30 |
| 15. The marks | Redrawn, each with a test of its spacing, direction or count; see "Reader" | `layout.test.ts`, "rows that must not read as signs"; pair 33 |
| 16. Documents | This file | |

Each fix was taken out of the finished code once, forty-eight removals in all, and each time a named test failed.

Reading 3 found three marks (one clear, two slight) and eight things, one of them a thing a child would notice, and confirmed the nine sentences pasted before it and the seven fixes of reading 2. What became of each:

| Ruling | Built | Held by |
| --- | --- | --- |
| 1. The hook | A lantern let go with the finger on the hook, with the lantern itself held up to it, or anywhere on the line from the hook down to where the grip hangs, is hung, and is seen to drop onto the hook; the round under the hook hangs it as before. The idle hand carries the lantern to each creature's place once, nearest first, and then to the hook; after a minute of a walk it shows the hook whatever is left | `walk.test.ts`, "the hook, where a child puts the finger" and "the idle hand shows the way to the hook"; `promises.test.ts`, "the hook"; pairs 39 and 40 |
| 2. Three marks | The band on the long fox's brush is the sitting brush's bow; the owl's three tail feathers are uneven in length, lean and gap; the squint is one bowed wrinkle | `layout.test.ts`, "rows that must not read as signs": every pose, and the wrinkle and the tail |
| 3. The scamper | It sounds only when the cat moves; a tap on the pile makes the slide and its own sound | `table.test.ts`, "the cat and a paper that slides back" |
| 4. The fox at home with the red to its left | Its lane ends there: it turns to the red and leans into it for 0.6 s, nose first, and then sits and hums | `walk.test.ts`, "the fox at home with the red to its left"; pair 43 |
| 5. The owl rushed again | In the rest after a spin it blinks and clacks once; rushed again with its feather out it spins and the same feather is whirled up and lands with its tick | `walk.test.ts`, "the owl rushed again"; pair 44 |
| 6. The fox's ending | One truth: it stops at its place a body's length short of the moths' tree, 30 units short of the end of its lane, because the lane must be a leap long and the place must leave a body before the tree | `walk.test.ts`, "the fox on a first walk"; pair 41 |
| 7. The put-away sentence | Paired so that it says once what happens to each held thing | pair 42; `walk.test.ts`, "a lantern taken out of the hand never stands on anybody" |
| 8. The ready red at the hook and on the step | Left as it is and listed (weak 13): the red must be level to the lantern's left to reach the fox along the ground, and from there it cannot fall on the door or the wall | |
| 9. The test of the ending | It asserts the sheet's two seconds, and compares the fox the walk left looking away with the fox that sits there afterwards, both reached by play | `walk.test.ts`, "the fox on a first walk" |
| 10. Documents | This file | |

Each of these fixes was taken out of the finished code once, seventeen removals, and each time a named test failed. The builder then read the sheet once more, sentence by sentence, against the code. With pairs 39 to 45 pasted, the sentences still not wholly true are three, each listed under "Weak": the hedgehog's red cell names a toadstool cap and only apples are spiked; the first scene says the windows fall on the door and the red of a ready sheet falls on the stump; the ending says the windows glow on the wall and the red glow lies on the moths' tree.

### Template notes

- `attention.ts`, `perf.ts`, `quality.ts`, `saveCadence.ts` and their tests: frozen, used as copied.
- `audio.ts`, `guidance.ts`, `overlay.ts`, `rng.ts`, `stage.ts`, `state.ts`, `scene.ts` and their tests: used as copied. `input.ts` and its test: kept as copied; the game takes only its `Point` type, and the pointer path is `play.ts`.
- `config.ts`: the backdrop, the tiers, the three positions, the first-visit rows by age, and one press in the ghost hand's showing of a tap.
- `manifest.ts`: band 4 to 8, icon family `play`. `symbols.ts`: removed, the band starts below 6.
- The models: `wood.ts` (the lantern and the one clock), `seen.ts` (who is lit, and what a rush is), `spots.ts` (where the ghost hand carries the lantern), `moths.ts`, `fox.ts`, `owl.ts`, `worms.ts`, `hedgehog.ts`, `badger.ts`, `table.ts`, `sheet.ts`, `game.ts` (contacts, scenes, saving), `save.ts`, `layout.ts` (every room and place).
- The views: `sketch.ts`, `setting.ts`, `figures.ts`, `small.ts`, `view.ts` (the wood), `room.ts` (the table).
- `play.ts`: the pointer path the Mount and the tests share. `speaker.ts`: a gain for each voice. `voices.ts`, `sounds.ts`: every sound as numbers. `hand.ts`: a hand for the tests.
- **For the template:** a console line inside a test is not shown by the test runner here, so a probe has to throw what it found.
- **For the template:** a sync test's reader must read only what is drawn. A reader that held the name of the thing in hand passed for a candle that made a sound and did not move.
- **For the template:** a test that plays through the Mount's path needs that path in a module with no browser in it; `play.ts` is that module here.

### For the owner to decide

The nearest things in the game to praise, blame, a count, a prompt and a punishment:

- **Nearest to praise.** When the lantern is hung, each creature the walk answered by its rule answers once more: the moths settle round the yellow glow, the owl hoots, the lit worms blink, the hedgehog walks to the mat. Each answers the lantern and none looks at the child, but a walk that met more has a fuller ending.
- **Nearest to blame.** A ninth cut closes again behind the scissors. A paper dropped where there is no window slides back. Neither makes a sound of refusal.
- **Nearest to a count.** `met`, the list of creatures the walk answered by rule, and the position, which moves up after a walk with a window the child cut. Neither is shown. The three apples and the five lamps can be counted by a child; the game counts neither and answers the last as it answers the first.
- **Nearest to a prompt.** The idle ring after 3 s and the ghost hand after 5 s, four times at most, then gone. In the wood the hand shows each creature's place once and then the way to the hook, and after a minute of a walk the way to the hook at once. In the finished scene the hand shows the lantern being pulled off its hook, as in any other idle stretch; the sheet said "nothing asks" there, and pair 26 makes it say what is built. Whether the finished scene should show no hand at all is the owner's.
- **Nearest to a punishment.** The badger blows the candle out and the wood goes dark until a tap on the lantern or a drag that begins on it. It blows at any light that touches it after holding its breath 0.62 to 1.15 seconds, and taking the light away in that time cancels the blow. A dark wood found dark on load stays dark.

And:

- The look: Rainbow scratch card.
- The toy: carrying the lantern.
- Whether "seen whole" should mean the whole creature in cream as soon as a patch touches it, as built; it then also answers, wherever it is touched.
- Whether the wood may be laid out as it now is, so that a straight carry from the step does the right thing first (the step, the hedgehog's home, the lanes, the ready sheets).
- Whether the fox may smell a dark lantern from 300 units, further than any other creature minds one, so that its creep is a walk.
- Whether the fox should have a way to the red glow in the ending. Built: it comes to its place a body's length short of the moths' tree, 30 units short of the end of its lane, sits and looks away.
- Whether a lantern on its hook should light nobody, as built, or light whoever its glow lies on.
- Whether the hedgehog may be out of reach of every light but the red of a ready sheet carried low.
- Whether the hook may take the lantern from so wide a place, and whether the idle hand may show the way to it (after every creature's place, or after a minute).
- Whether three apples and five lamps, sets a child may want to complete, are right with nothing marking completion.

## Pass log

| Pass | Looked at | Critique, in a child's words | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| Toy run, 1 | Still 1, then stills 2 to 5 | "The lamp is little and everyone else is big. The badger has its eyes shut on its tummy. There is a black hole in the middle." | The lantern a third larger; the badger's paws redrawn; five larger glow-worms on a fern over the middle; creepers and toadstools. | Not measured | The fox across the fern and the hedgehog; moths as a heap of squares; a patch cutting the owl in two; blue on the fox at rest; the bare band. All five were the lead's rulings for this run. |
| 1 | Stills 6 and 7: the table of a first visit and the first frame of a walk | "Two of the holes are stuck together. The roof is all the same bumps. The owl has writing on its tummy. The tree has a C on it. The moths are a pile." | The rulings: the fox's lane and room, moths drawn as moths at one and a half times the size, lit creatures drawn whole and unclipped, the step and the windows placed so no patch lies on a creature at rest, litter in the band, uneven canopy, blades and shingles, the owl's breast as drops. The red ready window moved clear of the yellow one. Stills 8 and 9. | Not measured | The fox's brush is a ring. The knots have a bent stroke in them. Floor joints make an H. The worms hold rings on sticks. |
| 2 | Stills 8 and 9 | "The fox has a zero next to it. The worms have lollipops. The floor has an H." | The brush redrawn with a ragged tip and a band; unlit lamps as buds; floorboards with grain and no joints; knots redrawn. Still 10. | Not measured | The redrawn knots read as a diamond in brackets. The wax under the owl's branch is bare. |
| 3 | Still 10 | "There is nothing under the owl. The tree has a funny sign on it." | The knots removed. Creepers of three lengths, two bracket fungi and a frond under the branch. Still 11 at 1024 by 768: the moths read as moths at the smaller size. | Not measured | Moths at the top are cut by the frame. |
| 4 | Still 12, the ending | "The moths are sitting on each other." | Moths on the yellow patch sit in a ring wide enough for eight with open wings, held by a test; their open wings a little narrower. Sleeping moths in a row of their own. Still 13. | Not measured | Still 13 shows the moths at home, since that run had not met the yellow. |
| 5, the close of reading 1 | The reader's report, then stills 14 to 17 | "I let go by the moths and it went home. The moths sat on the lamp. The fox bumped it from far away. The hand tapped two times. The fox was white and did nothing. My other finger did nothing. I rolled it and could not unroll it. The red light was off the edge. There is an F on the shelf." | The 23 rulings: the hook, the ring, the fox's creep and stretch, the bent flame, the outline, one press, lit means answered with a glance in a rest, one rush, eyes, the badger in the ending, the put-away inside the grace, the whirr, the lanes a body apart, worms off the fox, the lantern at rest beside a creature, new ready sheets and a higher step, the rolling edge as a lip and unrolling, the pile, the cut and the candle shown by the hand, the second finger, black wax before the load, twelve marks redrawn, and the smallest pot after still 14. Pairs 12 to 29. | Not measured | The moths' ring stands well outside a small glow (still 17). Riding moths cross things. The hedgehog is hard to reach with yellow. |
| 6, the close of reading 2 | The second reader's report, then stills 18 to 21 | "The owl went hoo hoo hoo and did not look. The fox did a tiny hop. The moths went to sleep straight away. One apple would not come. My paper went away. The lamp sat on the fox. My other finger did nothing by the door. The moths are tally marks." | The 16 rulings: the owl's one hoot and turn, the resting contact at the hook, the fox's leap and its place in the ending, the wood laid out for a straight carry, three apples in the lane, a hung lantern that lights nobody, no pinch from a dark lantern, a lantern never left on a creature, the fresh sheet sliding back, the fox padding into the red, each worm knocking in its own time, the badger's hole and cheeks, the slip both ways and the tap on the lantern, the wire, and the marks redrawn with tests. Pairs 30 to 38. The draw number is 72. | Not measured | The hedgehog is reached only by red carried low. The one-window sheet has no right light for the fox or the badger. Riding moths cross things (still 20). |
| 7, the close of reading 3 | The third reader's report, then still 22 | "I put my finger on the hook and it did not hang. The fox's tail has a W. The cat made a running noise and did not run. The red came and the fox just sat." | The 10 rulings: the hook takes the finger and the hand shows it, three marks redrawn with tests, the scamper only for a cat that moves, the fox's lean, the owl's small answer and its feather again, one truth for the fox's ending, the put-away sentence. Pairs 39 to 45. The draw number stays 72. | Not measured | The hook is wide and may end a walk early. The hedgehog is reached only by red carried low. Riding moths cross things. |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

- **Alive at idle.** The lines of every creature shiver six times a second, each creature has an idle of its own, the flame flickers, the cat's eyes follow the finger. The proxy saw the picture move in every half-second it watched.
- **Motion and sound on every touch.** Every sound is made in the step in which its motion is seen to move, on the game's one clock, and a test holds all of them to it through every cell, every act at the table and every scene. No voice starts later than its event.
- **Weight, squash and follow-through.** The lantern lags, swings and settles and squashes as the finger lands; the fox lands on its nose; the hedgehog rolls until a root stops it.
- **Kid-clear silhouettes and tappables.** Large creatures, each in a room of its own; every target 48 px or more at 1180 by 820 and 1024 by 768; nothing under the home control or in the grown-up corner. Tests hold each.
- **Wordless for the band.** Nothing written; the wordless check passes; the marks that might be read are listed under "Reader". The idle ladder shows a ring and then a hand, four times at most.
- **Frame rate.** Not measured. One draw number, 72 for the busiest frame, under 80, one full-surface stamp, pixel ratio capped at 2, four tiers that leave out only the wax grain and crumbs.
- **Assets.** All drawn by the code; all sound synthesized.
- **A distinct look.** Rainbow scratch card; the guide and the registry row are in `ART.md`.
- **No engagement mechanics.** Nothing is counted, timed or shown as a result; the nearest things are listed for the owner above.
- **Lossless exit and found as left.** Put away at any instant and loaded again, nothing replays, nothing starts and nothing sounds; a parked game is the game a load gives. Tests hold it at many instants.

### The learning claim

The game has no learning goal and names no record.

### Defaults taken for the owner

- A first visit by a child of unknown age starts with the three-window sheet.
- A wood left dark is found dark.
- The badger blows at any light that touches it, after a hold of 0.62 to 1.15 seconds that can be cancelled.
- The fox's lane is 206 units long, a leap long, and ends a body's length short of the hedgehog's home under the moths' tree; the fox keeps to the left of the hedgehog always.
- The ready sheets: yellow thrown up and a little to the right of the lantern, blue above it, red level to its left, so that from the step no creature is lit and a straight carry gives the moths yellow, the fox red and the glow-worms blue first.
- The step where a walk begins has the grip at 1050 by 730.
- Three apples lie in the hedgehog's lane at the height the red of a ready sheet reaches.
- A lantern on its hook lights nobody.
- The hook takes the lantern from the hook itself down to where the grip hangs, 64 units to either side.
- The idle hand shows the hook after every creature's place, or after 60 seconds of a walk.

### What the next builder should know

- A light that falls on a creature at rest makes a sound in an untouched wood. The creatures wait for the first touch after a load and after the first scene, and a test holds it.
- A rule tested by carrying the light across the wood meets other creatures on the way. Build the model with the lantern already where the test needs it.
- Give every thing that stands a box in one file and draw it into a sketch in a test; the box is then true of the drawing and not of the model alone.
- Never stop a test run by matching its command line; stop it by its process number.
