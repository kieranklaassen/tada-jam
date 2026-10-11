<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates, closed by run 5 (the closing run). The whole order is played, from `first-chamber` to the open kingdom and its round of six. Base commit ef85be4d.
- **Open: sheet ready for check, round 4.** The sheet passed round 3 (confirmed by the lead from the diff, answers file 4) at commit `734513b`, hash `49a588ec48b43cfce6492461afa1db4a7e440ce46f4496f1c48f651e71cebebb`. Since then 63 sentences above `## The look` have changed, all listed under "Sentences changed since round 3" below with the old and the new: the lead's own line (answers file 5), the 39 rooms it made necessary, and what the closing run found by reading the sheet against the game. The sheet now stands at commit `0c60e1a`, hash `6f1ef4eec983872d573113d4ce6bd7d45a99e46fe8166acb717f7d435e507315`. Round 4 reads only those sentences.
- Answers handled: 1 to 6, read on the base branch at `93133aa2`. A higher-numbered file is looked for again before the last push of the run, and what was found is in the last row of the pass log.
- **The lead's four points of answers file 6.**
  1. *A creature is in one place.* One whose kind is in the party at the log is in that party, and its own spot at the camp is empty while it is away (`camp.ts`). The dung beetle takes its ball along and the dung fly its twig, since it conducts with it; the toadstool, the tent and the puddle's place stay. The one a first showing shows is one of the party, stepped out to the front. `view/display.test.ts` plays every party of the order and of the round on two seeds through the first showing, the raid and the put-back, and holds that in no frame is anybody drawn twice.
  2. *A raid may not be a minute and a half of watching.* By numbers alone (`raid.ts`, `habits.ts`): the walk is half as fast again (raider ant 9 cells a second, beetle 5.5, fly 8, dung beetle 4.5, dung fly 7), the next of the file leaves the log 0.7 s after the one before came in, an act is done within six steps of the door, the first of a kind does its act in full (5 or 6 s) and a later one of the same kind does only the end of it (1.8 s). The three longest raids the order can lay out on a kingdom of one chamber now take **43.3 s** (the full camp), **37.2 s** (the round's fourth party: three ants, two beetles and a fly) and **37.0 s** (the round's fifth: a dung beetle, a beetle, a fly and two ants); the great raid takes 28 s. `raid.test.ts` holds every party under 45 s on three seeds and two shapes of kingdom, and raids still play the same twice.
  3. *The twelve sentences.* Built: the queen moves in (a scene of her own, once for each new room she comes to live in; `kingdom.ts`, `view/display.ts`), the queen dislikes guests (she glares and points for as long as an invader is at its act in her room, and is heard), and the first rung of the guidance (the ant looks out and scratches at the earth that glints, and the bell sways). Said as built, each one changed sentence in the list below: 2, 3, 4, 8, 9, 11, 12, and 10, which keeps the dung fly's part readable: it flies in first, a ball digs through soft walls while it is up, and the army loses its way when it is down.
  4. *The closing stills.* Three stills at 1180 by 820, seed 1, on a paused clock, at pixel ratio 2, from the production build of the lane's last commit that changes a frame: the first frame of a new game after a few seconds of idle; the full camp's raid in a kingdom of three chambers, mid-raid; the open kingdom after the ending with a party of the round at the log. They are pushed on a stills branch at the end of the run; its name is in the last row of the pass log.
- **What the closing run built, besides the lead's points**, because the sheet promised it and a child would see or hear it (each with a test):
  - An invader is drawn between the place it is in and the one it is on its way to. Until this run it was drawn a place behind and hopped a cell at a time (`view/raidShow.ts`, `raid.ts`).
  - The shaft left out of the room measure is the mouth's row and the three cells under it; run 4 left out one row too few (`chambers.ts`).
  - A stone that is shoved rolls on by itself until something stops it: sand with a scrunch, mud with a schlup (and it is bedded), another stone with a clack, which then rolls on in its place (`raid.ts`).
  - A shot that meets the ground is answered by what it met: sand bursts into a fan with a whoosh, mud takes it with a glug, a stone rings and, struck level and free, rolls one cell on (`kingdom.ts`).
  - A stone shot goes by a fly, which steps aside, and meets whoever is behind it.
  - No lump is lost: a shot in the air over the nest lands at once when the game is put away or the bell is rung. A machine saved with its floor dug away comes down when the game is opened. The bell calls the raid on the nest as it will come to rest.
  - The toy: a lump that is touched answers as itself before it is taken; the ant turns to the finger as it lands, taps every stone it passes, shakes when its jaws ring on a stone; sand rides on its head and leaks grains, mud hangs from its jaws in a drip, a stone is dragged behind and slows it, each with a beat of sound; a worker trots the spoil from the mouth up the hill; roots under the turf swing; the turf and the bedrock give a puff of dust; a stone set down is felt at the camp.
  - Every scene is heard (the queen carried, the workers at the put-back, the party that came for nothing, a kind at its first showing, a machine tried), any touch ends a scene, the bell and the camp included, and in a raid a machine with nothing in it yet answers a tap with a cough.
  - After the ending every chamber has its lantern, a short one too.
- **What to try first.** As before: dig a room, ring the drop. New in this run and worth a look: dig a second, larger room and watch the queen carried to it; let an invader into her room; leave the game alone for six seconds; carry one lump of each kind; let a beetle find a lone stone in a low tunnel.
- Look in use: the first reserved look, Ant farm behind glass. The registry row's text is at the end of `ART.md`.
- Sound: every voice is numbers in `voices.ts`, held in range by a test. **Nobody has listened to any of them.**
- Frame cost: no frame rate was measured anywhere, and no physical iPad.

**Sentences changed since round 3** (above `## The look`; for the checker of round 4). 1 is the lead's; 2 follows from it; 3 to 12 are the sentences the lead named in answers file 6; the rest were found by reading the sheet against the built game in this run, the last of them (in 12, 36, 37 and 43, and 59 to 61) after the reader's first reading and (in 56, and 62 and 63) after its second. None changes the mechanic, the error, the designed order or the saved state: each says a look, a sound or a detail as the game does it, except 28, which writes down the rule the lead asked for after the game's stills (one invader in a chamber at a time) and the short act of answers file 6.

1. Was: A **room** is open space that holds a clear block at least 4 cells wide and 3 cells high. All such blocks that overlap or touch along a side are one room. A tunnel two cells high is never a room, however long.
   Now: The same, with the lead's sentence added: "The shaft a new nest starts with (the three columns under the mouth, three cells deep) is the way in and no part of any room: no block is counted in its cells, so an invader coming down it is not yet inside." (answers file 5, pasted as it stands)
2. Was: The most rooms that fit, each with one cell of earth or of lumps between it and the next, is 40: eight across and five down.
   Now: The most rooms that fit, each with one cell of earth or of lumps between it and the next, is 39: eight across and five down, less one in the top row, where the shaft stands.
3. Was: Workers lower the machine down the mouth on a thread, set it at the foot of the shaft, load it with a crumb and fire it once to see; it works, and the crumb hits a worker's hat. About 7 seconds.
   Now: Two workers lower the machine down the mouth and set it at the foot of the shaft, and it fires once, empty, to show that it works. About 7 seconds.
4. Was: So after a raid that went well, the next party walks to the log while the last one sits down to sulk, and it is the party of the new position. No party is laid out a place behind.
   Now: So after a raid that went well, the party at the log once the put-back is over is the party of the new position. No party is laid out a place behind.
5. Was: Walks up the wall and across the ceiling tasting each thing with its feet, rubs its hands, tastes its own foot by mistake and leaves in a hurry.
   Now: Hangs in the room and tastes it, tongue out, then tastes its own foot by mistake and leaves in a hurry.
6. Was: Sits on its ball. (the dung beetle, when it gives up)
   Now: Sits down against its ball.
7. Was: Lands on the highest thing, raises its twig and conducts the army in. With no army in the room it conducts nobody, notices, and goes.
   Now: Hovers in the room, raises its twig and conducts the army in. With no army in the room it conducts nobody, and goes.
8. Was: The dung beetles go where the dung fly points: toward the chamber nearest to it. While the fly is up, a ball that meets soft ground digs on, so soft walls only slow the army. With the fly down, every dung beetle loses its way within a few steps, turns its ball round and rolls it home.
   Now: The dung fly leads: it flies in first, and each dung beetle rolls its ball after it to the nearest chamber that nobody else is in. While the fly is up in the nest, a ball that meets sand or mud digs on, so soft walls only slow the army. With the fly down, every dung beetle loses its way within a few steps, turns its ball round and rolls it home.
9. Was: (the order, `great-raid`, what is new) The army follows the fly.
   Now: The army and its leader: while the fly is up the balls dig through soft walls, and with the fly down the army loses its way.
10. Was: (a first showing) ...the ant in the puddle, the beetle at the toadstool, the fly at the twig, the dung beetle whose ball will not go between two pebbles, the dung fly whose beetles walk off the wrong way when it looks elsewhere.
   Now: ...the ant tugging at its stuck foot, the beetle rocking on its back, the fly dazed with a bump on its head, the dung beetle heaving and then scratching its head, the dung fly pointing its twig and then folding its arms because nobody comes.
11. Was: The army rolls home in a muddle, balls bumping. The dung fly sits on the hill and a worker hands it a leaf to wipe its eyes. The workers light a glow-worm in every chamber of the kingdom, nearest the mouth first, so the child's own plan lights up room by room.
   Now: The army, carried out in the put-back, sits on its balls at the log. The dung fly sits at the foot of the hill beside a worker and wipes its eyes with a leaf. A glow-worm wakes in every chamber of the kingdom, nearest the mouth first, so the child's own plan lights up room by room.
12. Was: Workers pull her out of where she was like a cork, carry her by the way that is open to the new room, and she tries each corner before she sits.
   Now: Two workers lift her from where she was and carry her, complaining, by the way that is open to the new room, and she tries each end of its floor before she sits. (And after "About 6 seconds.": While another scene plays she waits where she was, and is carried when it is over; the bell rung meanwhile shows her move first, and calls the party at the next ring. After a put-away she is found in her room.)
13. Was: the ground gives one dull crunch, and the ant's head turns to the finger.
   Now: the ground gives one dull crunch, and the ant turns to the finger.
14. Was: Roots that hang into a new tunnel swing. A camper above a fresh tunnel feels it through its feet and looks down.
   Now: Roots that hang from the turf into a new tunnel right under it swing. A camper above a fresh tunnel feels it through its feet and hops.
15. Was: It is not bitten. It squelches, dimples where the jaws were and closes again.
   Now: It is not bitten. It squelches, a few dark drops fly from it, and it holds its shape.
16. Was: It gives at the foot with a sigh; what stood on it sifts down into a pile, and the invader walks over the pile. Sand that touches mud is packed and holds like a wall.
   Now: It gives at the foot with a sigh and is shoved along; what stood on it sifts down into a pile, which the invader shoves before it or walks over. Sand that touches mud is packed and holds like a wall.
17. Was: It bulges, creaks and holds. A raider ant that treads on it is stuck by the feet, with a slow sucking pop at every pull.
   Now: It holds, and the pusher strains at it. A raider ant that treads on it is stuck by the feet with a squelch, and tugs at them.
18. Was: A bedded stone grates and does not move.
   Now: A bedded stone does not move.
19. Was: It bursts into a fan of grains with a whoosh, and the grains rain back down as a lower, wider pile.
   Now: It bursts into a fan of grains with a whoosh, and the shot comes to lie against it; sand on sand slumps into a lower, wider pile.
20. Was: The shot goes in with a glug and stays in it: sand in mud is packed, a stone in mud is bedded.
   Now: The shot meets it with a glug and stays against it: sand that touches mud is packed, a stone that touches mud is bedded.
21. Was: It rings like a bell, the shot bounces off, and a free stone rolls one cell on.
   Now: It rings like a bell, the shot stops against it, and a free stone struck by the cannon rolls one cell on.
22. Was: The roller ploughs in with a long scrunch, buries itself to the middle and stops; the pile spreads.
   Now: The roller runs into it with a long scrunch and stops against it.
23. Was: heaped right to the roof it shuts the air out, and the room behind goes dim and stale and the workers leave it; with a gap left over it for the air, the first beetle leans, the wall sighs into a pile, and the beetle walks over it with sand on its head.
   Now: heaped right to the roof it shuts the air out, and the room behind is no chamber any more: its workers and their things are gone; with a gap left over it for the air, the first beetle leans, the sand gives with a sigh, and the beetle shoves the pile along in front of it.
24. Was: On day 15 the child builds a doorway with a stone lintel that a dung ball cannot widen, packs
   Now: On day 15 the child beds a stone in mud in the roof of a way, where a dung ball jams, packs
25. Was: sets the cannon where one stone rolls down a whole hall,
   Now: sets the cannon where one stone flies the length of a hall,
26. Was: A room walled off from the mouth goes dim and stale, the workers leave it, and it counts for nothing until it is opened again.
   Now: A room walled off from the mouth is no chamber: its workers and their things are gone from it, and it counts for nothing until it is opened again.
27. Was: A scuff of pale dust and a ring of footprints mark each cell where a wall was shoved or a lump fell, and a worker stands by the worst one, looking at it with its hands on its hips.
   Now: A ring of footprints marks the first cell where a wall was shoved or a lump fell, and a scuff of pale dust up to five more; a worker stands by the first, looking at it with its hands on its hips.
28. Was: the campers come back out the way they went in, muddy, sandy or backwards, and sit down at their camp to sulk.
   Now: the campers come back out the way they went in, and sit down at their camp again.
29. Was: (nothing: a new bullet under "A raid, and how it is judged")
   Now: One invader is in a chamber at a time. Another that comes to its door goes to a chamber nobody is in, where there is one, and otherwise waits at the door, in view, until the first has left; those behind it wait a body's length apart. The first of a kind to do its act in a raid does it in full, and a later one of the same kind does only the end of it.
30. Was: Each chamber of the kingdom is lived in: two workers move in, with their things, as soon as air reaches it.
   Now: Each chamber of the kingdom is lived in as soon as air reaches it: two workers move in where its floor has room for two, one where it has room for one, and the first six chambers have their things on the back wall.
31. Was: If lumps lie in reach, one of them glints in turn; if a party waits and a chamber exists, the bell sways and a drop on it catches the light.
   Now: If lumps lie in reach, one of them glints as well; if a party waits and a chamber exists, the bell sways and its drop catches the light.
32. Was: 3. It then waits twice as long before showing either again, twice as long again after that, and after the third showing in one stretch of stillness it shows nothing more until the next touch.
   Now: 3. The hand then waits twice as long before it shows again, twice as long again after that, and after its third showing in one stretch of stillness nothing more is shown until the next touch. The glints stay lit between its showings.
33. Was: - **The workers.** Two to a chamber. They want things back where they were.
   Now: - **The workers.** Two to a chamber where its floor has room. They want things back where they were.
34. Was: A press on a cell is always that cell's: a worker or the queen standing there steps aside and the dig or the lump is answered.
   Now: A press on a cell is always that cell's: a worker or the queen standing there takes no touch, and the dig or the lump is answered.
35. Was: A machine stands only on open floor, never on a lump or over the mouth, and is picked up only by a press that starts on it; an overlap test holds this at each surface size (guide, ruling 15).
   Now: A machine stands only in open cells with a floor under it, never in the cell of a lump or over the mouth, and is picked up only by a press that starts on it; a test holds this in stage units, which are the same at every surface size (guide, ruling 15).
36. Was: A press on a camper, the bell's stalk, a toadstool or the hill is answered by that thing as itself and changes nothing in the nest; only the bell calls a raid.
   Now: A press on a camper is answered by that camper as itself, and a press anywhere else above the ground, or on the frame round it, by a puff of dust and a small boing; neither changes anything in the nest, and only the bell calls a raid. While a raid runs, a place at the log whose camper has gone in is bare grass, and one who still sits there, or is home again, answers as itself.
37. Was: They are shown before they are met: at the camp each kind is caught out by its own habit again and again (the ant stuck in a puddle, the beetle that cannot climb a toadstool, the fly that cracks its head on a low twig).
   Now: They are shown before they are met: at the camp each kind that is not in the party at the log is caught out by its own habit again and again (the ant stuck in a puddle, the beetle on its back under the toadstool it could not climb, the fly nursing a bump on its head). A long party takes the grass where the stuck ant and the fly have their spots, and whichever of the two its file reaches is away while that party is the one at the log; each kind is still shown at the camp, and once large at the front of it, before it is met.
38. Was: The ball needs three cells; the beetle behind it two.
   Now: The ball needs a way three cells high, and three wide where it drops; its beetle goes wherever a way is open at all.
39. Was: One cell up. Falls any distance down, onto its back.
   Now: One cell up. Falls any distance down.
40. Was: A face of sand (it slides back down with the sand).
   Now: A face of sand, which it cannot climb.
41. Was: Stone it cannot dig: a doorway of stone with a stone lintel jams the ball, and the beetle leaves it there and walks on as a plain beetle.
   Now: Stone it can neither dig nor shove: a stone bedded in mud in the roof of a way jams the ball, and the beetle leaves it there and walks on as a plain beetle.
42. Was: To park its ball in the grandest room: it holds the ball and eyes the mouth.
   Now: To park its ball in the grandest room: it sits on its ball and eyes the mouth.
43. Was: Paces the room out, lies down flat in the middle as if it owned it, and is asleep before its feelers settle. Wakes with a start and goes.
   Now: Goes well into the room, lies down flat as if it owned it, and is asleep before its feelers settle. Then it gets up and goes. Where its way in ends on a face over open air and it can reach no floor of the room, it lies down across the way right there.
44. Was: Rolls the ball to the middle, steps back to admire it, polishes one spot, cannot decide it looks right, and rolls it home again.
   Now: Rolls the ball well into the room, polishes one spot and then another, cannot decide it looks right, and rolls it home again.
45. Was: Stuck: it pulls at each foot in turn and sits down where it is. Otherwise it turns round with a shrug of the feelers.
   Now: Stuck: it pulls at its feet where it is. Otherwise it turns round with a shrug of the feelers.
46. Was: Hovers at the low place, peers in, buzzes at it, and flies out.
   Now: Hovers at the low place, peers in, and flies out.
47. Was: Buried to the feelers. Digs itself out backwards, sneezes and goes home.
   Now: Buried to the feelers. It digs itself out and goes home.
48. Was: Rolled flat like pastry. Peels itself off the floor and wobbles home, thin.
   Now: Rolled flat like pastry. It peels itself off the floor and goes home.
49. Was: Rattles off its shell. It sneezes once and walks on.
   Now: Rattles off its shell. It stops a moment and walks on.
50. Was: Splat over both eyes. It walks on blind, in a straight line, turns round at the first thing it bumps, and so walks out.
   Now: Splat over both eyes. It stops, turns round, and walks out blind the way it came.
51. Was: a second knock while it is on its back slides it out of the nest.
   Now: after a second knock while it is on its back it gives up and goes home.
52. Was: Wings gummed. It drops, sits, cleans one wing at a time with great care, and walks home sulking.
   Now: Wings gummed. It hangs where it is, sticky, for a while, and then goes home sulking.
53. Was: The ball is knocked back up the hall and its beetle runs after it. From the foot of the shaft it rolls out of the mouth, and that beetle is home.
   Now: The ball is knocked back up the hall and its beetle with it, onto its back. From the foot of the shaft the ball rolls out of the mouth, and that beetle is home.
54. Was: Blown back, and drops its twig. It fetches the twig and comes again.
   Now: Blown back, tumbling, its twig in the air. It comes again.
55. Was: The largest chamber of the kingdom changes, the first time included.
   Now: The queen's room becomes another room, the first time included. A room that only grows is the same room.
56. Was: Each invader still in the nest trudges or is carried out by the way it came. The workers carry each fallen lump back to where the child had built it, nearest first, tamp back the earth a dung ball dug away, and one stands by the place that gave.
   Now: Each invader still in the nest goes out by the way it came, a worker hauling it as far as the mouth. The workers carry each fallen lump back to where the child had built it, nearest the mouth first, the earth a dung ball dug away is back as they pass, and one stands by the place that gave.
57. Was: The game's own work stays under 8 ms a frame at six times CPU throttle.
   Now: The budget for the game's own work is 8 ms a frame at six times CPU throttle.
58. Was: at the camp each kind acts out its own habit for anyone who looks, a press on a camper makes it do so at once, and the idle ladder never shows a solution.
   Now: at the camp each kind acts out its own habit for anyone who looks, a press on a camper is answered by that camper at once, and the idle ladder never shows a solution.
59. Was: (on touch-down) the mouthful under the finger is gone, crumbs spray from the bite, the ground gives one dull crunch, and the ant turns to the finger.
   Now: The same, with a sentence added: "Where all under the finger is dug already, nothing is bitten: a little dust lifts from the place, the ant's feet patter, and it comes."
60. Was: While the ground is still falling the save holds it as it will come to rest, so nothing is saved in the air.
   Now: While the ground is still falling the save holds it as it will come to rest, so nothing is saved in the air; a machine whose floor is on its way down, or into whose place a lump is falling, is saved where it comes to stand, with what it holds.
61. Was: (the ending) Dusk comes over the camp, and the dung beetles sit on their balls round a small glow.
   Now: The same, with a sentence added: "It opens with three soft notes going down, and is quiet after them."
62. Was: Under a low ceiling the shot hits the ceiling and drops short.
   Now: The same, with a sentence added: "The turf's row stops it the same way, the mouth in it too: nothing is thrown out of the nest or comes to lie in its mouth."
63. Was: (what a wall holds, under the table) The hold of a run is the sum of its cells.
   Now: The same, with a line added before it: "Both are seen: packed sand is a shade darker with its grains close together, and a bedded stone has the mud up round it on each side the mud is on."

**Frame cost.** No frame rate was measured, on any machine, and no physical iPad. What was measured is the game's own work a frame, in ms, on the production build of commit `b131b75` (the commit after it changes one voice and no frame), in Chromium on software drawing, tier 0 pinned, pixel ratio 2, six times CPU throttle, in a kingdom with its full crowd:

| Moment | Frames | Median | p90 | p95 | p99 | Most draws |
| --- | --- | --- | --- | --- | --- | --- |
| Digging fast without pause, 12 s | 100 | 6.2 | 11.9 | 17.1 | 23.9 | 22 |
| The same, the canvas's pixel calls made to do nothing | 600 | 1.8 | 3.3 | 3.9 | 5.9 | |
| The raid of the full camp, both machines firing, 14 s | 92 | 5.5 | 9.1 | 10.9 | 28.8 | 23 |
| The same, no pixel calls | 600 | 2.2 | 3.9 | 4.7 | 7.8 | |
| The great raid, 24 s | 136 | 5.4 | 8.3 | 10.9 | 14.7 | 28 |
| The same, no pixel calls | 600 | 1.9 | 3.3 | 4.0 | 5.1 | |
| Idle, 10 s | 75 | 3.5 | 5.3 | 6.2 | 8.4 | 17 |
| The same, no pixel calls | 600 | 2.0 | 3.5 | 4.2 | 7.3 | |

With drawing, digging and both raids are over the sheet's budget of 8 ms at the ninety-fifth percentile; with the pixel calls made to do nothing every moment is under it. So what is over the budget is software drawing on the processor of the one machine measured, and nothing here says what a tablet's graphics card does with it. By a test, the fullest frame is 52 draws (the great raid), against a budget of 80.

**Still weak**, for the lead, who may hold the game back for any of it.

- The frame cost with drawing is over the sheet's budget on the one machine it was measured on (see above).
- Nobody has put a finger on the game or heard it.
- The queen's glare points her arm away from her guest, which is away from the door when the guest stands between her and it.
- A beetle or a dung beetle that cannot climb home sits in the way until the raid is over, and the next ones pass in front of it while it ducks.
- A machine left at the foot of the shaft, where it arrives, is walked over by everyone.
- A walled-off room is not drawn dim: its workers and their things are gone, and nothing else says it is stale. The sheet now says what is drawn.
- A raider ant cannot drop. Where its way into a room ends on a face over open air (a hall dug right across the foot of the shaft), it lies down across the way where it is, with nothing under it, and that counts as its act in the room. A rule that let it drop was tried in this run and taken out: every ant then sat held at the foot of the shaft, ducking under those who came after. The sheet says what it does.
- The queen's seat takes no account of a machine: set down at her end of her floor, a machine stands in her.
- A long party takes the grass where the stuck ant and the fly have their spots, and they are away while it is at the log (the fly at three of the five places before it is first met). The sheet says so.
- The first raid can go well by luck (mud under the shaft on seed 1); that a raid went well is said only by the next party at the log.
- What each invader's act is reads at full size only. A later one of a kind shows only the end of its act.
- From the painters' own lists: the catapult's bowl can read as a goblet at half size; mud is the weakest load on the dark of a tunnel; the twang's lines could be taken for brackets when seen alone; the dung beetle that has lost its way is drawn smaller than in its other poses; the flies' hands over their eyes read as a lumpy head at half size; the queen carried reads fully only with the workers under her.
- From the toy, unchanged: the ant runs in front of the queen and the workers; a lump that falls moves a whole cell a step.
- The dusk is three flat washes and a glow: the frame, the glass and the wood do not darken.
- The grown-up frame-rate readout opens by resting a finger for a second in the top right corner and then tapping there three times. Quick taps never open it; a child who did exactly that would see a small readout with letters and numerals that takes no touch.

**For the next checker and the lead.**

- Painted by subagents on the same model, in this checkout, from briefs: the creatures and their poses, the machines, the rooms' things and the effects. The builder looked at their sheets and at the stills.
- A read-only audit of the sheet against the code by a subagent, before the reader's readings, found most of what this run built or reworded.
- `Walker` in `routes.ts` has a fourth way of going, `crawler`: a dung beetle behind its ball.
- One commit of this run (`7e227af`) was pushed with one failing test and mended by the next (`7d91b28`); the tip is green.
- Requests to the lead: the registry row (text at the end of `ART.md`). Nothing else outside the folder.

### The reader's readings

- First reading: `NOT READY: rule 1: 0, rule 2: 0, rule 3: 0, rule 4: 0, rule 5: 7, rule 6: 5`. Rule 5: seven shapes that could be read as signs (the crossed twigs of the unlit fire, the dung fly's crossed arms, the socks on the line, the lantern's barred oval, the four-armed glint, the two rings of the pushed-up goggles, two bars one over the other in the bedrock). Rule 6: a press on the frame or in ground already dug got no answer; the queen's move was lost when her room was finished under another scene; a long party left a kind out of the camp; a press at an empty place at the log in a raid was answered by nobody; a lump falling into a loaded machine's place lost the load on the next visit. All twelve were fixed in `b131b75`: the shapes redrawn, four promises built with tests, and the camp's sentence said as the game does it (entries 12, 36, 37, 43, 59 and 60 of the list above). The reader also noted that the ending had no voice: it has three notes now (`0c60e1a`, entry 61). It had nothing wrong.

### Template notes

- `scene.ts`: copied and **not used**. The game's six scenes (the queen moves in, the shrug, a first showing, a machine arrives, the put-back, the ending) are a small union in `kingdom.ts` with one clock, because each is filled in from the raid or the order and ends at a touch with its outcome already in place; `kingdom.test.ts` holds what each saves when it starts. The game run's page asks for scenes on `scene.ts`: this is a departure, left as it is; the lead has not asked for it to be moved.
- `symbols.ts` and `symbols.test.ts`: removed. The game draws no numeral (its brief says so).
- `config.ts`: the ladder is the game's thirteen places, typed as a tuple (`Place`); `FIRST_VISIT` has one row; `FIRST_CUE` and `firstCueAfter` are new, for the one thing the age hint sets; `BACKDROP` is the frame's dark wood.
- The Mount (`mierennest.tsx`): gestures go to `kingdom.ts`, which wraps the toy; a judged raid and a showing that starts are saved at once and everything else once the ground rests; losing attention and unmounting both put the game away (`kingdom.putAway()`), which ends a raid unjudged; the idle ladder is held at the bottom while a raid or a scene runs.
- `state.ts`: used as copied, wrapped by `save.ts`. `finished` is always false: the game's own field for the ending is `ended`, which follows the position `open-kingdom`.
- `guidance.ts`: changed. `IdleLadder` takes the wait before its first cue and the number of demonstrations; with no arguments it is the template's.
- `audio.ts`, `input.ts`, `overlay.ts`, `rng.ts`, `stage.ts`: used as copied. `audio.ts` already counts the fingers of a touch (the closing page's one fix), and is the template's file as it stands on the base branch.
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
- The pace of a raid: one invader in a chamber at a time, the first of a kind doing its act in full and a later one a short one; the longest raid on one chamber is 43 s. Whether that is the pace he wants.
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
| 8 (the sheet against the game) | The whole sheet read against the code by a reader who had not built it, sentence by sentence, with probes of the rules; then the raids of the full camp and the great raid again on the dev build. | What a child would have said of what it found: "The ants in the nest jump from square to square, and they're always one square behind where they got stuck. The stone doesn't roll, the beetle just pushes it a bit and a bit. I shot the sand and nothing happened. All the lumps look the same in my ant's mouth. My stone is gone, I fired it and then I closed the game. The dung fly is in two places." | One set, on the game doing what it says: invaders drawn where they are and gliding between cells; stones that roll; a shot answered by what it meets; lumps carried each in its own way; no lump lost in the air; a creature in one place; and the smaller answers listed in the status block. The sentences that only said a detail otherwise were changed and listed for round 4. Nothing reverted. | None measured. | What the status block lists under "Still weak". |
| 9 (the reader, first reading) | The whole folder read against the sheet and the six rules of the reader's page by a subagent that had not seen the build. Then the first frame of a new game and the dung fly's poses, on the new build. | Not ready: seven shapes that read as signs, five promises unkept (both lists are under "The reader's readings"). | One set: each shape redrawn so that nothing crosses, nothing lies bar over bar and no ring stands empty; a press on dug ground and on the frame answered; the queen's move kept for after a running scene; a press at the log in a raid answered only by one who sits there; a machine saved where it comes to stand, loaded; the camp's sentence said as built; the ending given three notes. | Dig 6.2 and 17.1 ms, full camp's raid 5.5 and 10.9, great raid 5.4 and 10.9, idle 3.5 and 6.2 (median and ninety-fifth percentile, with drawing) | A raider ant whose way in ends over open air lies across the way with nothing under it. A machine set at the queen's end of her floor stands in her. |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

As built, at the end of the closing run.

- **Alive at idle.** Every creature idles in a way of its own (`motion.ts`, one row a kind, held apart by a test); the bell sways; the worker on the hill mutters; the party at the log holds its want in plain sight; at the camp each kind that is not in the party is caught out by its own habit; one who waits at a door in a raid fidgets as its kind does at the camp.
- **Motion and sound on every touch.** A touch on the ground is answered in the call the finger lands in: a mouthful, crumbs, a crunch whose pitch follows the finger's speed, and the ant turning to the finger and running. Each material answers the dig, the jaws, the carrying, a set-down, a push, a shot and a rolling stone in its own look and voice (the eighteen cells of the sheet's grid, each drawn and heard); a poke of any camper, the bell or the setting is answered at once. In a raid a touch on a loaded machine fires it at once, a touch on one with nothing in it yet gets a cough, and a touch on the ground brings the ant to look. Voices are played inside the touch handler. Nobody has heard them.
- **Weight, squash and follow-through.** Sand pours and slumps, mud holds, a stone drops and its landing is felt at the camp. A beetle leans and strains before a wall gives; a stone puts it on its back, rocking; a dung ball rolls as far as it turns, digs its way wider and jams; a machine recoils, smokes or twangs and its shot trails and leaves a puff or a splat; a wall that gave leaves a scuff and footprints until the next raid.
- **Kid-clear silhouettes and tappables.** The three materials are flat and far apart in lightness, each leaning its own way, held by a test, mud in a tunnel included; the kingdom's ants are told from the raiders by colour and outline; the child's ant wears the only blue in the nest; each kind of invader is one hue. A touch within 34 stage units of the bell rings it, and a test holds the bell clear of every camper and of the hill at its largest; every camper is found by a target of 48 or more; a machine is two cells square. The machines are a leaf green nothing else under the grass has, with the load seen at a glance. In a raid one invader is in a chamber at a time and no face is ever under anybody, held by a test on every party of the order.
- **Wordless clarity for 9 to 12.** No word, letter or numeral is drawn; the game has no `symbols.ts`. The wordless check passes. Each kind's habit is shown at the camp before it is met, and once, large, when its party first sits at the log.
- **Wordless idle guidance.** After six seconds of stillness (ten for a child of 10 or older) the ant looks out and scratches at the earth beside it, which glints, as does a lump in reach; once the kingdom has a chamber the bell sways and its drop is lit. Then a ghost hand makes one short drag through plain earth that touches nothing built. It waits twice as long each time and stops after three. The hand never rings the bell, sets a lump or loads a machine.
- **Nothing rated, counted or praised.** A raid that went well brings the next party to the log and nothing else; one that did not leaves the same party there. The position is shown nowhere. The ending is a scene in the world (a leaf for the dung fly, glow-worms in the chambers, the queen's egg set down, dusk) with no confetti, star, numeral or letter in any frame, held by a test, and it leaves two small marks.
- **Found as left.** The nest is saved as it changes, as it will come to rest; a lump in the jaws stays in its cell until it is set down; a raid runs on a copy, so the nest is as built the instant the game is put away, the raid is not judged, and the invaders are at their camp. A judged raid and a showing are saved the moment they start, and no scene plays on load. Played on the production build: a raid put away seven seconds in and the page loaded again. The ending's fields are saved when the great raid is judged: put away in that instant or in the put-back, the game is found with the kingdom open and plays no scene. A shot in the air over the nest lands at once when the game is put away, so no lump is ever lost.
- **Frame rate.** No frame rate has been measured, on any machine, and no physical iPad. The game's own work a frame on software drawing, production build, tier 0 pinned, pixel ratio 2, six times CPU throttle: 3.5 ms at the median and 6.2 ms at the ninety-fifth percentile idle; 6.2 ms and 17.1 ms digging fast without pause; 5.5 ms and 10.9 ms in a raid of the full camp with both machines firing; 5.4 ms and 10.9 ms in the great raid. The last three are over the bar of 8 ms; with the canvas's pixel calls made to do nothing they are 3.9, 4.7 and 4.0 ms at the ninety-fifth percentile, so what is over the bar is software drawing on the processor. Nothing was measured on a graphics card. The fullest frame is 52 draws (the great raid) by a test, against a budget of 80; a frame repaints at most 24 cells of the ground.
- **Procedural assets only.** Everything is canvas paths and synthesized notes; no image, font or sound file, and no network request.

### The learning claim

None. Mierennest is a play-first game: it claims no school skill, its sheet has no records part, and nothing in the folder names a standard.

### Defaults taken for the owner

- No numeral is drawn, though the band allows them.
- No camera shake and no impact pause: the answer to a touch is carried by chains, sound and squash.
- No on-device speech: creature voices are invented and synthesized.
- Taken by the lead in the owner's place, for him to overturn: a raid is called with a dewdrop bell; a raid went well when no invader finished its act in a chamber; the ending leaves two small marks in the world.
- One invader is in a chamber at a time, as the lead asked after the game's stills, and a later one of a kind does a short act; the longest raid on one chamber is 43 s.
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
