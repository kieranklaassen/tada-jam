<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates. Run 4 is done: the great raid and the ending. The whole order is played, from `first-chamber` to the open kingdom and its round of six; the dung beetles roll their balls, the dung fly leads from the air, the ending plays once, and afterwards the kingdom is found as it was left with its two marks. Base commit ef85be4d.
- **Sheet: PASSED round 3** at `734513b` (hash `49a588ec…cebebb`), then **one line from the lead, answers file 5**, pasted as it stands at commit `aa4a7d45`. Hash of the sheet part now: `fff9b3273a5e10938d9daeb654e821d9cbf0d9512e86db44608ed6ecab5053ac`, checked again at the end of this run.
- **Sentences above `## The look` changed in this run**, for the closing run to see:
  1. *What a chamber is*, first bullet: the lead's line, pasted (the shaft is no part of any room).
  2. *The largest kingdom this ground holds*: "is 40: eight across and five down" became "is 39: eight across and five down, less one in the top row, where the shaft stands". The lead's line made the old sentence untrue: no room in the top row can use the three columns of the shaft, and eight rooms need all but one column. `chambers.test.ts` holds 39.
- Answers handled: 1 to 5, read on the base branch at `6220c06a`. No file 6 was there at the end of this run. A note on the last run: its check for a file 5 fetched without updating the branch's own ref, so "no file 5" in the run 3 report was said of a stale ref. The fetch now names the ref in full.
  - 5, the sheet line: `chambers.ts` counts no block in the cells of the shaft; the raid's measure of inside follows from it, and a raid's chambers are now the ones the kingdom had as it was called (nothing a raid shoves or digs makes a new one). Tests in `chambers.test.ts` and `raid.test.ts` ("the shaft").
  - 5, point 1, a raid in a small room is a heap: one invader is in a chamber at a time; see "Who is where in a raid" below.
  - 5, point 2, the machines: repainted to the whole of their two-by-two place in a leaf green nothing else under the grass has, the load a third of the machine across, larger shots with smoke, a twang and a trail. `view/palette.test.ts` holds the hue; `view/machines.test.ts` holds the size, the green and each load's own colour. The lead's test (a person shown the still says what it is loaded with) was done by the builder's eye alone: in still 3 the cannon shows a dark lump of mud at its mouth. Nobody else has looked.
  - 5, point 3, the party at the log: laid out so that nobody of it covers anybody, and the camp's overlap test now holds for every party of the order and of the round with no exception for the party (`camp.test.ts`).
  - 5, point 4, the put-back: the worker holds the lump over its head; the place that gave is still told until the next raid (`view/ending.test.ts`).
  - 5, run 4: built, with the tests the plan lists; see below.
- **What to try first.** As in run 3 to reach a raid. To see the great raid without playing to it, put the game away and set `position` in the saved slot (`tada-jam:slot:mierennest`, plain JSON in the page's local storage) to `great-raid`, with a hall three cells high off the shaft for the fly to fly into: the army sits at the log on its balls, the fly over it. Ring the drop. With a cannon or a catapult loaded with mud and pointed at where the fly hovers, tap it: the fly comes down, every dung beetle scratches its head and rolls home, and after the put-back the ending plays. The stills were made that way, by planting the slot before the page loads; the route by hand was not tried.
- **Sentences of the sheet the built game does not make true.** None of these was changed. 1 to 6 are from run 3 and are left for the closing run, as the lead said; 7 of run 3 is settled by his line. New in this run, 8 to 12:
  1. *The queen moves in*: she is in the new largest room at once, with no scene.
  2. *A machine arrives*: two workers lower it and it fires once, empty. No crumb, no hat.
  3. *Which party a new position lays out*: the new party is at the log when the put-back ends; it does not walk there and the last one does not sulk.
  4. *The fly's own act*: it hangs in the room and tastes; it does not walk the wall and the ceiling.
  5. *The queen dislikes guests*: she does nothing when an invader does its act in her room.
  6. *The guidance ladder, step 1*: the ant does not scratch at the earth and the bell does not sway.
  8. *The dung beetle, when it gives up* ("Sits on its ball"): at the log it sits on its ball; in the nest, under a roof, it sits down against it.
  9. *The dung fly's own act* ("Lands on the highest thing"): it hovers a cell over the floor and conducts there.
  10. *The dung beetles go where the dung fly points, toward the chamber nearest to it*: each goes to the nearest chamber nobody else has, by its own way; the fly's place decides nothing but whether a ball digs soft walls.
  11. *First showings of the dung beetle and the dung fly* (two pebbles; beetles walking off the wrong way): each is shown once, large, in two of its poses (heaving and lost; pointing and arms folded), with no pebbles and no beetles.
  12. *The ending*: the army is carried out in the put-back and then sits on its balls at the log, it does not roll home in a muddle; the dung fly sits at the foot of the hill beside the worker with the leaf already in its hand.
- Look in use: the first reserved look, Ant farm behind glass. The registry row's text is at the end of `ART.md`.
- Sound: every voice is numbers in `voices.ts`, held in range by a test; this run adds one for the army losing its way and uses the ball's rumble for a way dug wider. **Nobody has listened to any of them.**
- Frame cost: no frame rate was measured anywhere, and no physical iPad.

**Stills.** Branch `stills/mierennest-dcc088d1`, three files under `docs/build/stills/mierennest/`:

- `1-great-raid-comes-down.png`: 4.7 s after the bell. The dung fly conducts in the hall; the first ball is at the foot of the shaft with its beetle on end in the shaft above it; the second waits at the mouth with its ball; three sit on their balls at the log.
- `2-fly-down-army-turns.png`: the cannon was tapped 5.9 s after the bell; a second later the dung fly sits in the hall with mud on its wings, the dung beetle that had come in scratches its head beside its ball, and the four that had not come in are back on their balls at the log.
- `3-after-the-ending.png`: the same raid with the fly brought down earlier, turned back; after the put-back and the ending, and one touch. A glow-worm is lit in each of the two chambers, the leaf hangs on its stalk under the edge of the toadstool, and the first party of the round (two ants and a fly) is at the log.

Seed 1. Taken at 1180 by 820 from the production build of this lane at `dcc088d1`, pixel ratio 2, on a paused clock stepped 33 ms at a time, with the same scripted touches each time, on software drawing. All three start from one saved kingdom planted before the page loads, written cell by cell as a child could have dug it: a hall off the shaft with the cannon in it, loaded with mud, and a second room with the catapult.

**Who is where in a raid** (answers file 5, point 1).

- One invader is in a chamber at a time (`raid.ts`): another that comes to its door goes to another chamber nobody has, where there is one, and otherwise waits at the door; those behind it wait a body's length apart, back up the shaft and on the grass at the mouth. Only those who left the log earlier are waited for, so no two wait for each other. The dung fly takes no chamber and waits for nobody.
- A beetle that cannot climb home sits down a body's length behind the one already sitting; while a raid runs the workers stand behind the queen; an act is done clear of the queen, of the workers and of anyone who sits held, where the floor has room.
- The lead's test is in `view/raidShow.test.ts`: every party of the order, on three seeds, every tick. No face lies under another invader; the queen and the workers are drawn before every invader; whoever does its act does not duck and stands in none of the kingdom's own; no two who wait stand in each other. How the first part is kept: one whose face would lie under somebody ducks, in a pose of its own in which no eye is painted (`view/creatures.test.ts` holds that), until the other has gone by. On those raids somebody is ducking in about one tick in four, nearly always a beetle that sits held under those who pass it.
- What it costs: acts are one after the other, so a raid of the full camp on one chamber of the stills' hall lasts 81 s, several times what it took when everyone went in together, and the great raid there 66 s when nothing stops it. More chambers shorten it.

**Frame cost.** Chromium on this machine's software drawing, production build at `dcc088d1`, tier 0 pinned, pixel ratio 2, 1180 by 820, six times CPU throttle. The game's own work a frame (`window.__jamPerf.cpuMs`):

| What | Seconds | Frames | Median | 90th | 95th | 99th | Most draws |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A finger digging fast without pause through a kingdom of four chambers | 12 | 95 | 5.0 ms | 11.6 ms | 16.6 ms | 34.5 ms | 24 |
| The same, with the canvas calls that put pixels down made to do nothing | 12 | 600 | 1.8 ms | 3.0 ms | 3.6 ms | 4.4 ms | 19 |
| A raid of the full camp in that kingdom, both machines fired again and again | 14 | 91 | 4.5 ms | 10.3 ms | 17.0 ms | 19.0 ms | 25 |
| The same raid, pixel calls doing nothing | 14 | 600 | 1.9 ms | 3.2 ms | 3.8 ms | 5.9 ms | 25 |
| The great raid in that kingdom, both machines fired again and again | 24 | 150 | 4.2 ms | 9.5 ms | 12.1 ms | 24.1 ms | 28 |
| The great raid, pixel calls doing nothing | 24 | 600 | 2.0 ms | 3.4 ms | 3.9 ms | 7.5 ms | 29 |
| The same kingdom, idle | 12 | 94 | 2.9 ms | 4.1 ms | 4.9 ms | 8.7 ms | 18 |
| Idle, pixel calls doing nothing | 12 | 600 | 1.7 ms | 2.8 ms | 3.3 ms | 5.1 ms | 18 |

- As the lead accepted it in answers file 5: the game's own work without the pixel calls is 3.3 to 3.9 ms at the ninety-fifth percentile, under the bar of 8 ms; with them, on this machine's software drawing, digging and both raids are over it (12 to 17 ms), and idle is under it. What is over the bar is the canvas calls on the processor. Nothing was measured on a graphics card. The rows without pixel calls hold the last 600 frames of the run.
- Draws, each counted by a test against the budget of 80: the fullest frame of the toy 40 (`view/display.test.ts`), of a raid with every kind before the great one 48 (`view/raidShow.test.ts`), **of the great raid 56** (`view/ending.test.ts`: the army and its fly inside a kingdom of eight rooms, both machines firing, crumbs and the hand). A frame repaints at most 24 cells of the ground.

**The great raid and the ending, by their tests** (`raid.test.ts`, `kingdom.test.ts`, `view/ending.test.ts`):

- A dung ball is rolled wherever a way is open at all and digs earth that makes the way too narrow for it; it breaks a wall one cell thick of any one material and is stopped by a wall two cells thick bound with mud, where its beetle sits down and then rolls home; it is not rolled up onto lumps through the gap left for the air; it digs sand and mud that have earth or rock behind them. A stone it can neither dig nor shove jams it: the beetle heaves, leaves the ball and walks on as a plain beetle. It does not go down a pit narrower than itself between rock, and digs the same pit wider in earth. A mouth too narrow for it leaves the ball on the grass.
- Sand makes the ball a size bigger, which needs a higher way; mud takes the ball from its beetle; a stone knocks it back to the end of the tunnel behind it, and from the foot of the shaft that beetle is home.
- While the dung fly is up a ball digs through a wall of mud that holds it when it comes alone. With the fly brought down, every dung beetle that is not at its act loses its way within three steps, wonders, and rolls home, all within 30 s; none finishes an act.
- After the great raid, turned back or not, the ground is as built, cell for cell, on three seeds; the same raid twice plays the same, ball for ball.
- The position and `ended` are saved in the instant the great raid is judged; the ending begins when its put-back is over, plays once and holds on its last beat until a touch. Put away as the raid is judged, or in the put-back, the game reads back with the kingdom open and plays no scene, at load or at the first touch, and nothing plays in the visit it was put away in either.
- No frame of the ending holds anything but creatures in poses the painters have, the things of the rooms, the bell's drop, the dusk and the marks the raid left on a floor: no crumbs, no glint, no hand, no shot. The painters' own tests hold every painting to shapes with no writing. The glow-worms come on one at a time, nearest the mouth first, and none goes out.
- Afterwards a raid can still be called, the round of six lays out a different mixed party after each raid that went well and comes round again, and no ending plays again. The two marks are there in the visit and after a load from the save. The leaf hangs clear of the bell, of its stalk, of the hill at its largest and of every camper of every party.

**What is still weak.**

- A beetle or a dung beetle that cannot climb home sits in the way until the raid is over, and the next ones pass in front of it while it ducks: in a hall too short for five balls a body apart, the army that got in ends as a row of balls and tucked beetles from the foot of the shaft into the room. The faces rule holds; it is still a crowd.
- One who waits at the mouth stands on the grass in front of the party's first seat; a visitor longer than the shaft is wide still covers the wall beside it; the dung beetle on end in the shaft is a little wider than its body's box.
- A machine left at the foot of the shaft, where it arrives, is walked over by everyone, and in still 2 the fly comes down in front of the cannon.
- A raid of a large party on one chamber is long (see above), and all that time most of the party waits.
- From the painters' own lists: the catapult is busier than the cannon and its bowl can read as a goblet at half size; mud is the weakest load on the dark of a tunnel; the twang's lines could be taken for brackets when seen alone; the dung beetle that has lost its way is drawn smaller than in its other poses; the dung fly's folded arms are small at half size; the flies' hands over their eyes read as a lumpy head at half size; the queen's egg on its moss stands 12 units outside her box.
- From run 3, unchanged: what each invader's act is reads at full size only; the first raid can go well by luck (mud under the shaft on seed 1); that a raid went well is said only by the next party at the log.
- From the toy, unchanged: the ant runs in front of the queen and the workers; a lump that falls moves a whole cell a step; no crumb is carried up the shaft.
- The dusk is two flat washes and a glow: the camp darkens and the frame, the glass and the wood do not.

**For the next checker and the lead.**

- The creatures' new poses and the machines, shots, smoke, twang and leaf were painted by two subagents on the same model, in this checkout, from briefs; the builder looked at their sheets and at the stills.
- `Walker` in `routes.ts` has a fourth way of going, `crawler`: a dung beetle behind its ball, which goes like a beetle wherever a way is one cell high. What the ball needs over that is in `raid.ts` (`ballNeeds`, `widen`).
- Requests to the lead: the registry row (text at the end of `ART.md`). Nothing else outside the folder.

### Template notes

- `scene.ts`: copied and **not used**. The game's five scenes (the shrug, a first showing, a machine arrives, the put-back, the ending) are a small union in `kingdom.ts` with one clock, because each is filled in from the raid or the order and ends at a touch with its outcome already in place; `kingdom.test.ts` holds what each saves when it starts. The run's page asks for scenes on `scene.ts`: this is a departure, and the closing run can move them if the lead wants it.
- `symbols.ts` and `symbols.test.ts`: removed. The game draws no numeral (its brief says so).
- `config.ts`: the ladder is the game's thirteen places, typed as a tuple (`Place`); `FIRST_VISIT` has one row; `FIRST_CUE` and `firstCueAfter` are new, for the one thing the age hint sets; `BACKDROP` is the frame's dark wood.
- The Mount (`mierennest.tsx`): gestures go to `kingdom.ts`, which wraps the toy; a judged raid and a showing that starts are saved at once and everything else once the ground rests; losing attention and unmounting both put the game away (`kingdom.putAway()`), which ends a raid unjudged; the idle ladder is held at the bottom while a raid or a scene runs.
- `state.ts`: used as copied, wrapped by `save.ts`. `finished` is always false: the game's own field for the ending is `ended`, which follows the position `open-kingdom`.
- `guidance.ts`: changed. `IdleLadder` takes the wait before its first cue and the number of demonstrations; with no arguments it is the template's.
- `audio.ts`, `input.ts`, `overlay.ts`, `rng.ts`, `stage.ts`: used as copied.
- **For the template:** a canvas game that stamps its still parts over the whole surface every frame pays for it in its own work on software drawing. A line in the Mount saying that what stands still can be a canvas under or over the Mount's own would have saved a detour. The same for sprites: a box a kind, and every pose painted at load.
- **For the template:** `cpuMs` on software drawing counts the canvas calls with the game's own work. A switch in the probe that makes the pixel calls do nothing, as this run's script did, tells the two apart in one run.
- **For the template:** `IdleLadder` with its wait and its count as arguments, as here, would let a sheet set them without editing the file.
- **For the template:** the jam shell writes a slot two seconds after the last save or on put-away; a still or a probe that reloads the page sooner finds nothing saved.

### For the owner to decide

- The toy: whether digging is a pleasure in the hand, and whether carrying feels right. Nobody has put a finger on it.
- The look: the stills of the toy, the game and the great raid are on the stills branches.
- The sound: nobody has heard any voice of the game.
- The bell: a raid is called by a tap on the dewdrop. Taken as yes by the lead in his place.
- The line a raid is judged by: it went well when no invader finished its act in a chamber. Taken as yes by the lead in his place.
- The ending's two marks (a glow-worm lit in every chamber, the dung fly's leaf on a stalk at the camp): kept, by the lead in his place, and built.
- One invader in a chamber at a time makes a large raid on a small kingdom long (about 80 s for the full camp on one chamber). Whether that is the pace he wants.
- Whether a raid that goes well should say so in any other way than the next party at the log. Now nothing else does.
- None of the guide's defaults awaiting the owner needs a different answer for this game.

## Pass log

One row per pass. No frame rate has been measured: the column holds the game's own work a frame on software drawing at six times throttle, as the status block gives it.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 (toy) | Three stills of the toy at 1180 by 820 from the production build, seed 1, on a paused clock: the first frame at idle, a carry just after a dig, a small nest. Also one cell of each material alone, and the glint and the hand of the idle ladder. | As the child, on the first stills of the toy: "The queen is stuck, that's funny. Why is my ant inside the queen at the start? Why is the queen so big in that tiny room, she's in the wall. My ant is standing on top of her." And the lead's four points on the spike, in the same voice: "The bad ants look like my ants. Which one is mine? What's the purple stuff, is it rock? I can't get at the bell, the fly is in front of it." | One set, on what a child reads at a glance: the kingdom gold and the raiders crimson in helmets; a blue kerchief on the child's ant; mud a dark wet brown with a lip, a drip and a glint; the bell raised over the hill and the camp spaced by a tested layout; the queen fitted to a short floor; the queen wedged a cell higher so the ant has the shaft's foot, where it sits small. Nothing reverted. | None measured. Own work: 2.6 ms median idle, 4.2 to 4.9 ms median digging, 13 to 17 ms at the ninety-fifth percentile digging. | The ant still runs in front of the queen in her room. Mud in a tunnel is told by its lip and glint more than by its body. The rooms are bare. Lumps fall a cell at a time. |
| 2 (the raid, first look) | Strips of six frames each of the raids of `mixed-party` and `beetle-pair` in three nests, seed 1, on a paused clock, with the mud of answers file 4 in a tunnel. | "They're all in one heap at the bottom of the hole. I can't see who's doing what. Is that one beetle or two? The queen is sitting on her stuff, I thought the room was empty. The mud is fine now, I can see it's a lump." | One set, on telling the invaders apart in a room: each goes well into the room before its act and acts three cells from the next; two that stand still in one place stand one behind the other; the room's two things hang on the free wall beside the queen. Nothing reverted. | None measured. Own work: 3.3 to 3.9 ms median in a raid of the full camp, 13.5 to 15.1 ms at the ninety-fifth percentile; 1.4 ms and 2.6 ms with the pixel calls doing nothing. | A hall three cells high is still a heap with three invaders and the queen in it. |
| 3 (cold playtest proxy) | The production build, a fresh save, seed 1: ten seconds untouched, then sixty as a newcomer who digs down, digs a room, rings the drop, pokes a camper, the queen and the party, and rings again. Twenty-five frames looked at. Unclear moments, in the newcomer's words: | "I rang the drop and the red ant came in and then it was just gone again. What happened?" (it stuck in mud under the shaft, the raid was over in the same instant, and it was carried out in a straight line through the earth). "I made the room. Now what? How do I make them come?" (nothing pointed at the drop). "The stuck one is lying in the wall." | One set, on a raid's end being seen: an invader that is stuck or held is seen where it is for two and a half seconds before the raid is over; it is carried out along the way it came; an ant held fast in a way one cell wide stands on end; the idle ladder lights the drop once the kingdom has a chamber. Run again on the production build: the ant sits at the foot of the shaft tugging, goes up the shaft, and the drop is lit at the next stillness. Nothing reverted. | None measured. Own work on the final build: see the table in the status block. | That a raid went well is said only by the next party at the log. What each invader's act is reads at full size only. |
| 4 (the stills) | Candidates for the three stills, from the production build at pixel ratio 2: nine moments of the cannon's shot, nine of the put-back, three of the hall. | "Is that an equals sign behind the stone? The queen is sitting on the red ant. I can't see the lump, the ants are in front of it." | One set, on the shot: the stone trails three streaks of three lengths, so that no two read as a sign. The hall of the first still was cleared of the two stones that kept the queen's floor short, as a child would carry them to its end; the game was not changed for that. Nothing reverted. | None measured. | The workers hide the lump they carry back. The stone of a shot fired at a beetle a cell away is drawn on the beetle. |
| 5 (the raid's order) | Strips of the raids of `mixed-party`, `full-camp` and `great-raid` in a hall off the shaft, seed 1, on a paused clock, after the door rule went in. | "That red ant is flying, there's nothing under it. Why does everybody do their thing right at the door, on top of the green cannon? The workers are in the way. The purple beetles are in the ceiling. Where's the beetle that pushes the ball, it's in the wall." | One set, on everybody having a place: one who rode a beetle to the log sits on the grass while that beetle is away; the workers stand behind the queen while a raid runs and an act is done clear of them; a dung beetle that gives up sits down against its ball under a roof; the dung beetle walks behind its ball along the way the ball came, on end in the shaft. Nothing reverted. | None measured. Own work: see the table in the status block. | Held beetles pile up from the foot of the shaft. The fly comes down in front of a machine that stands where it hovers. |
| 6 (the great raid and the ending) | The great raid on the production build from a saved kingdom with both machines: twenty frames of the army coming down, twelve of the fly brought down, fourteen of the put-back and the ending. | "The mud ball went right through the fly and then the fly fell down. The lamps are on already, before it gets dark. It only gets dark in the sky. The beetle is hanging under the floor." | One set, on things happening when they are seen to: a ball of mud or a stone stops at the first invader it meets, the moment it gets there; the glow-worms and the leaf wait for the ending and are not seen in the put-back before it; the ground darkens a little at dusk; a dung beetle on end stays inside the shaft. Run again on the production build. Nothing reverted. | None measured. | The dusk is flat. Only one of the army is inside when the fly comes down early. |
| 7 (the newcomer's minute, again) | The cold playtest script of pass 3 on the production build of this run: a fresh save, ten seconds untouched, then sixty as a newcomer. Eight frames looked at. | "It's the same as before, but the workers go and hide when the red ant comes, that's funny. Three ants and one waits in the hole, I can see who's who." Nothing was unclear that was clear in pass 3. | No fix set: nothing found. The pass is logged because the run changed how every raid plays. | None measured. | What each invader's act is still reads at full size only. |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

As built (run 4: the whole game, to the gates).

- **Alive at idle.** Every creature idles in a way of its own (`motion.ts`, one row a kind, held apart by a test); the bell sways; the worker on the hill mutters; the party at the log holds its want in plain sight; one who waits at a door in a raid fidgets as its kind does at the camp.
- **Motion and sound on every touch.** A touch on the ground is answered in the call the finger lands in: a mouthful, crumbs, a crunch whose pitch follows the finger's speed, and the ant running. Each material answers the dig, the jaws and a set-down in its own look and voice; a poke of any camper, the bell or the setting is answered at once. In a raid a touch on a loaded machine fires it at once, a touch on an empty one fizzles, and a touch on the ground brings the ant to look. Voices are played inside the touch handler. Nobody has heard them.
- **Weight, squash and follow-through.** Sand pours and slumps, mud holds, a stone drops and its landing is felt at the camp. A beetle leans and strains before a wall gives; a stone puts it on its back, rocking; a dung ball rolls as far as it turns, digs its way wider and jams; a machine recoils, smokes or twangs and its shot trails and leaves a puff or a splat; a wall that gave leaves a scuff and footprints until the next raid.
- **Kid-clear silhouettes and tappables.** The three materials are flat and far apart in lightness, each leaning its own way, held by a test, mud in a tunnel included; the kingdom's ants are told from the raiders by colour and outline; the child's ant wears the only blue in the nest; each kind of invader is one hue. A touch within 34 stage units of the bell rings it, and a test holds the bell clear of every camper and of the hill at its largest; every camper is found by a target of 48 or more; a machine is two cells square. The machines are a leaf green nothing else under the grass has, with the load seen at a glance. In a raid one invader is in a chamber at a time and no face is ever under anybody, held by a test on every party of the order.
- **Wordless clarity for 9 to 12.** No word, letter or numeral is drawn; the game has no `symbols.ts`. The wordless check passes. Each kind's habit is shown at the camp before it is met, and once, large, when its party first sits at the log.
- **Wordless idle guidance.** After six seconds of stillness (ten for a child of 10 or older) the earth beside the ant, a lump in reach and, once the kingdom has a chamber, the drop glint; then a ghost hand makes one short drag through plain earth that touches nothing built. It waits twice as long each time and stops after three. The hand never rings the bell, sets a lump or loads a machine.
- **Nothing rated, counted or praised.** A raid that went well brings the next party to the log and nothing else; one that did not leaves the same party there. The position is shown nowhere. The ending is a scene in the world (a leaf for the dung fly, glow-worms in the chambers, the queen's egg set down, dusk) with no confetti, star, numeral or letter in any frame, held by a test, and it leaves two small marks.
- **Found as left.** The nest is saved as it changes, as it will come to rest; a lump in the jaws stays in its cell until it is set down; a raid runs on a copy, so the nest is as built the instant the game is put away, the raid is not judged, and the invaders are at their camp. A judged raid and a showing are saved the moment they start, and no scene plays on load. Played on the production build: a raid put away seven seconds in and the page loaded again. The ending's fields are saved when the great raid is judged: put away in that instant or in the put-back, the game is found with the kingdom open and plays no scene.
- **Frame rate.** No frame rate has been measured, on any machine, and no physical iPad. The game's own work a frame on software drawing, production build, tier 0 pinned, pixel ratio 2, six times CPU throttle: 2.9 ms at the median and 4.9 ms at the ninety-fifth percentile idle; 5.0 ms and 16.6 ms digging fast without pause; 4.5 ms and 17.0 ms in a raid of the full camp with both machines firing; 4.2 ms and 12.1 ms in the great raid. The last three are over the bar of 8 ms; with the canvas's pixel calls made to do nothing they are 3.6, 3.8 and 3.9 ms at the ninety-fifth percentile, so what is over the bar is software drawing on the processor. Nothing was measured on a graphics card. The fullest frame is 56 draws (the great raid) by a test, against a budget of 80; a frame repaints at most 24 cells of the ground.
- **Procedural assets only.** Everything is canvas paths and synthesized notes; no image, font or sound file, and no network request.

### The learning claim

None. Mierennest is a play-first game: it claims no school skill, its sheet has no records part, and nothing in the folder names a standard.

### Defaults taken for the owner

- No numeral is drawn, though the band allows them.
- No camera shake and no impact pause: the answer to a touch is carried by chains, sound and squash.
- No on-device speech: creature voices are invented and synthesized.
- Taken by the lead in the owner's place, for him to overturn: a raid is called with a dewdrop bell; a raid went well when no invader finished its act in a chamber; the ending leaves two small marks in the world.
- One invader is in a chamber at a time, as the lead asked after the game's stills; it makes a large raid on a small kingdom long.
- The sheet's own choices he may want to overturn: a room is a clear block four cells wide and three high, and counts while air reaches it; the ground has a sixth kind of cell, packed earth, which is dug and never carried.

### What the next builder should know

- The stage is 40 by 21 cells of 28 units. That cell size is the only one at which the finger's mouthful (two cells) and a creature a tenth of the frame wide both hold.
- A raid is a pure simulation at twenty ticks a second on a copy of the ground (`raid.ts`), and the view only reads it. That one choice gives the put-away, the same raid twice and the nest as built for nothing; keep everything a raid does out of the view.
- Write a picture test for a ground rule by hand from the rule, then run it: several first pictures were wrong (the edge of a picture is rock; sand on a single post slides off; a stone bedded in earth is a lintel), and the rule was right.
- Simulate a scripted play against the rules before turning it into touches for a still, and print the ground it leaves: a dig a cell too deep made a pit that changed a whole raid.
- A saved nest for a still that has a machine in it needs a position at or past the machine's place, or the machine is dropped on load.
- On software drawing, measure once more with the pixel calls made to do nothing: it tells the game's work from the drawing's in one run.
- A rule that sounds like drawing ("no face under anybody") is cheapest as a rule of play plus one of drawing: here a door rule in the raid keeps the heaps from forming, and a duck in the view covers the moments two must pass. Either alone would not have held the test.
- A raid's chambers are the ones the kingdom had as it was called. The first dung ball that dug a roof made a new room round itself and did its act in it.
- A stone in a roof holds only between two firm neighbours: a ball that digs the earth beside it lets it fall. A test nest that is meant to jam a ball beds the stone in mud.
- `git fetch origin <branch>` in a shallow single-branch clone updates `FETCH_HEAD` and not the branch's own ref: name the ref in full, or the look for a new answers file reads an old tree.
- A subagent painting creatures needs the palette frozen before it starts, and no file it owns touched while it works.
- Run the cold playtest on the production build before the look passes, not after: it found three things in one minute that four strips of chosen moments had not.
- Look for an answers file on the base branch before the last push of a run, not only at its start.
