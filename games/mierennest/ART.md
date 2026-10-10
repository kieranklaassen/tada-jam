<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 9 to 12. Its youngest age, 9, governs the design. Mierennest is a play-first game: it claims no school skill, and this sheet has no records part.

- **Cue table.** The row for a youngest age of 7 and up in the wordless-clarity convention. Its "Avoid" column binds the game: no written word or letter; no symbol standing alone that play depends on reading; no timer, points or verdict chrome; no long hint chain.
- **Age rule.** (pack: game-design, ages-9-to-12.md) The ground is a real system that behaves the same way every time: sand pours and slumps, mud sticks and holds, a stone falls unless something bears it. Every invader kind has fixed habits. More than one defence works against every raid, and a better one is visibly better in the world: it holds more, with fewer lumps. Failure is large, funny and free: a raid runs on a copy of the nest, and the workers put back whatever it knocked down. Help is something the child fetches. Nothing is babyish, nothing competes, and no best is stored.
- **Symbol rule.** The band starts at 6 or above, so numerals would be allowed laid on a quantity. This game draws none: nothing in the play needs one. It has no `symbols.ts`, and no letter or written word appears anywhere on the kid side. The name lives in the manifest and is never drawn.
- **`ctx.childAge`.** It sets one default and nothing else: how long the game waits on a still finger before the idle ladder shows its first cue.

  | `ctx.childAge` | The first cue comes after |
  | --- | --- |
  | 9 and younger | 6 seconds of attended stillness |
  | 10 and older | 10 seconds of attended stillness |
  | `null` | 6 seconds, as for 9 and younger |

  It never sets a starting place. Every visit of every age starts at the first place in the designed order, because the kingdom is built step by step, and a saved position always wins. No content is gated by age.
- **`ctx.language`.** Nothing in the game depends on it: there is no spoken or written content, and the creatures' voices are invented and synthesized.

## The toy

**Digging: a drag through the earth opens a tunnel behind the finger, and the small ant runs along it.**

The finger lands anywhere in the ground and the ant comes to it by the shortest open way, digging the last stretch. While the finger moves, the earth under it is bitten away in a round mouthful two cells across, so the tunnel is as wide as the finger and a creature fits in it.

- **On touch-down, in the same frame:** the mouthful under the finger is gone, crumbs spray from the bite, the ground gives one dull crunch, and the ant's head turns to the finger.
- **While dragging:** each new mouthful crunches at a pitch that follows the speed of the finger, crumbs trail behind, a worker at the mouth of the nest catches the spoil and trots it up to the hill, and the hill on the surface grows by a crumb. Roots that hang into a new tunnel swing. A camper above a fresh tunnel feels it through its feet and looks down.
- **What the dig meets answers as itself.** Earth is dug. Sand is not bitten: it trickles, and when the earth under it has gone it pours into the tunnel with a long hiss and slumps into a pile. Mud squelches and holds. A stone clinks, sparks once and stays; with nothing left to bear it, it drops with a thud that shakes the campers. The bedrock at the bottom and the turf at the top ring dull and do not give.
- **On release:** the ant sits back, wipes its jaws and looks at what it made; loose things finish falling.
- **A tap** is one mouthful, with the same answer.

It is a pleasure with no goal because it is drawing with a tunnel in something that pushes back: every stroke leaves a shape that stays, sounds like the speed of the hand, and may set the ground itself moving, since a stroke under sand starts a pour and a stroke under a stone starts a fall (pack: game-design, toy-first.md; pack: game-design, touch-answers-bigger-than-the-touch.md). Random dragging always digs something and never does harm: nothing dug is needed, and every lump that falls can be picked up again. Someone watching sees within three seconds that the child is digging an ant nest.

## The object-by-action grid, and what is new on day 15

Three materials by six actions. Each lies in the ground in its own seams and is the same thing wherever it is met: in a seam, as a lump in the ant's jaws, in a wall, or in the cup of a machine. No use is refused: every cell below works, costs nothing, and is as good to watch when it is the wrong use.

| | The dig meets it | Carried | Set down | An invader leans on it | A shot hits it | Something rolls against it |
| --- | --- | --- | --- | --- | --- | --- |
| **Sand** | It is not bitten. It trickles with a dry hiss, and when the earth under it has gone it pours into the tunnel and slumps into a pile. | It rides as a heap on the ant's head and leaks a thin thread of grains behind, with a soft patter. | It lands with a puff and a hush, and slides until its pile is no steeper than one cell up for one cell along. Between two firm sides it stands as a column. | It gives at the foot with a sigh; what stood on it sifts down into a pile, and the invader walks over the pile. Sand that touches mud is packed and holds like a wall. | It bursts into a fan of grains with a whoosh, and the grains rain back down as a lower, wider pile. | The roller ploughs in with a long scrunch, buries itself to the middle and stops; the pile spreads. |
| **Mud** | It is not bitten. It squelches, dimples where the jaws were and closes again. | It hangs from the jaws in a long drip that stretches and snaps back with a wet smack. | It lands with a splat and stays wherever it touches something that is held: a floor, a wall, a ceiling, a stone. In the open with nothing to touch it drops with a plop until it does. | It bulges, creaks and holds. A raider ant that treads on it is stuck by the feet, with a slow sucking pop at every pull. | The shot goes in with a glug and stays in it: sand in mud is packed, a stone in mud is bedded. | The roller stops dead with a schlup and is held there; a stone held by mud is bedded and no longer rolls. |
| **Stone** | It is not bitten. It clinks and throws one spark, the ant's jaws ring and its feelers shake. With nothing left to bear it, it drops. | It is too heavy to hold up: the ant drags it behind with a grinding scrape, leaning forward, and goes slower. | It falls straight down with a thud that makes the campers hop, and never slides sideways. It stays up only where something bears it: a held cell under it, or a held stone, mud or earth on both sides. | A stone on a flat floor rolls ahead of the push with a low rumble until something stops it. A bedded stone grates and does not move. | It rings like a bell, the shot bounces off, and a free stone rolls one cell on. | Clack: the roller stops and the stone it struck rolls on in its place, as far as it has room. |

**The wrong uses, and why they are worth doing.** Sand set down as a wall across a tunnel is the first thing most children will try, and it fails in the best way: the first beetle leans, the wall sighs into a pile, and the beetle walks over it with sand on its head. Mud set in mid-air plops to the floor. A stone set on sand looks safe until the sand is taken away. A stone carried to the top of a shaft and let go is a thud heard at the camp.

**Combinations.** The grid is three rows, and its depth is in what two cells do together, which is always the same: mud packs the sand it touches and beds the stone it touches; a stone across two held stones is a lintel and bears what lies on it; sand on a lintel stays up over an open doorway; a pit with a sand face cannot be climbed, a pit with a mud floor does not let go, and a stone at its lip waits to be rolled in. The numbers behind "holds" are under "The representation".

**Day 15.** On day 1 the child digs a room and finds out that a wall of sand is not a wall. On day 15 the child builds a doorway with a stone lintel that a dung ball cannot widen, packs a wall that holds three beetles with four lumps where it once took nine, knows which camper each trap is for and stages a raid on purpose to watch one of them walk into it, sets the cannon where one stone rolls down a whole hall, and has a kingdom of rooms and halls of their own plan that no one else's looks like (pack: game-design, depth-from-combinations.md; pack: game-design, liveliness-from-causing-and-comedy.md).

## The representation

No school skill is claimed. The game's own idea is a defence built from three materials that behave truly, and tested by a raid. It is carried by the objects alone: a wall holds or gives because of what it is made of and what it rests on, and the child can see which.

### The stage

One fixed stage with the whole farm in view, 1180 by 820 stage units, fitted into the surface without scroll or zoom. So a drag is always a dig, a raid is read at a glance, and the save holds no camera.

- A wooden frame 30 units wide runs round the stage. Inside it, the top 172 units are sky, grass and the invaders' camp. Below that the ground is a grid of **40 columns by 21 rows of square cells, 28 units a side** (1120 by 588 units).
- **The cell size comes from two bounds, taken together.** The finger's mouthful is two cells across, 56 units, which on a surface 1180 wide is 56 pixels and above the jam's floor of 48 for a target, so a drag leaves a tunnel two cells high; and a creature that fits that tunnel must still be about a tenth of the frame wide or more. Insects are long and low, so both hold at 28: the child's ant is 112 units long and one cell high, a raider ant 118 long and one cell high, a beetle 124 long and two cells high, a fly 118 across its wings and two cells high, a dung ball 84 across (three cells) with its beetle behind it. A smaller cell makes the creatures smaller than a tenth; a larger one leaves too few cells to build with.
- Row 0 is turf and row 20 is bedrock: neither can be dug. The **mouth** of the nest is the two middle cells of the turf (columns 19 and 20), always open, with the hill round it. Nothing can be set down in the mouth. A new nest has a short shaft under the mouth, three cells deep, with the ant at its foot.
- **The largest kingdom this ground holds.** The 760 cells between turf and bedrock can each be any kind. The most rooms that fit, each with earth between it and the next, is 32. The size test saves a ground in which no two neighbouring cells are alike, with both machines loaded and every mark set.

### The cells

A cell is one of six kinds. The same seed lays out the same ground, cell for cell.

| Kind | What it is | Can the dig bite it | Can it be carried | Does it move by itself |
| --- | --- | --- | --- | --- |
| Open | Air. | - | - | - |
| Earth | The packed ground everything lies in. | Yes. It is gone for good, and its spoil goes to the hill. | No | Never: packed earth does not cave in. |
| Sand | Pale, dry, loose. Lies in a band across the middle and in lenses. | No | Yes | Falls, pours and slumps. |
| Mud | Dark, wet, sticky. Lies in pockets. | No | Yes | Falls only when it touches nothing that is held. |
| Stone | Grey, heavy, round. Scattered, more of them deeper down. | No | Yes, dragged | Falls unless borne; rolls when pushed. |
| Rock | Turf and bedrock. | No | No | Never |

Sand, mud and stone are never made and never destroyed: the lumps in the seams of a new nest are the whole kit, and a test counts them.

### How the ground comes to rest

The ground moves in steps on game time, each step the same pure rule, so the same moves give the same ground.

1. **What is held.** Rock and earth are held. A sand cell is held when the cell under it is held. A stone is held when the cell under it is held, or when the cells on both its sides are held and each of them is stone, mud, earth or rock (a lintel). A mud cell is held when any of the four cells it touches is held. "Held" is worked out from the rock and the earth outward, so two lumps in mid-air never hold each other up.
2. **What falls.** Any sand, mud or stone that is not held drops one cell a step, straight down, lowest first.
3. **What slumps.** A resting sand cell slides one cell down and sideways when the cell beside it and the cell below that are both open. So a pile comes to rest no steeper than one cell up for one cell along, a column with open space beside it slumps, and a column between two firm sides stands. Where both sides are open the side is fixed by where the cell is, never by chance.
4. Stone never slides sideways by itself, and mud never slumps.

### What a wall holds

An invader that leans pushes the run of lumps in front of it, along its way, until the first open cell or the first earth or rock.

| A cell in the run | Its hold |
| --- | --- |
| Sand | 1 |
| Sand that touches mud (packed) | 2 |
| Stone | 2 |
| Mud | 3 |
| Stone that touches mud (bedded) | 5 |

- The hold of a run is the sum of its cells. A beetle pushes 3, and beetles in a line push together, up to three of them. A dung ball pushes 6.
- **A push greater than the hold, with room beyond:** the whole run is shoved one cell on, and then the ground comes to rest by the rules above. A thin sand wall goes at its foot and what stood on it sifts into a pile.
- **A push that is not greater:** the wall holds. The pusher strains, slides back on its feet and waits for a friend.
- **A run with earth or rock behind it** cannot be shoved. Loose sand at its front is ploughed through all the same: the pusher changes places with it. So sand alone never stops a beetle, wherever it is put.
- A lone stone on a flat floor has room beyond it, so it rolls ahead of the push until something stops it.

So one material alone is weak in its own way (sand is loose, a stone rolls, a little mud is light), and a combination is stronger than its parts: packed sand and mud, 5 against 1 and 3; mud and a bedded stone, 8 against 3 and 2.

### What a chamber is

The ground module recognises a chamber in what the child dug; nothing is placed from a menu.

- A **room** is open space that holds a clear block at least 4 cells wide and 3 cells high. All such blocks that overlap or touch along a side are one room. A tunnel two cells high is never a room, however long.
- A room is a **chamber of the kingdom** while air reaches it: there is a way of open cells from the mouth to the room, however narrow. A room walled off from the mouth goes dim and stale, the workers leave it, and it counts for nothing until it is opened again.
- The kingdom's growth, the number of workers and the moment an invader counts as inside all follow from this: an invader is **inside** when any part of it is in a cell of a chamber.

### Where the game is true and where it simplifies

True as far as it claims: dry sand does pour and come to rest at a slope, wet mud does hold a shape and stick, a stone does need bearing, and a lintel does carry a load across a gap. Simplified, and said here: the ground is cells, so a slope is one for one and nothing tips or wedges; there is no water, so mud never dries and sand never gets wet; packed earth never caves in; a lump has no size but a cell; and the holds in the table are the game's own numbers, chosen so that the order of strength is the true one. The invaders' habits are the game's fiction and claim nothing about real insects, except that insects are long and low.

**Standing.** This is a physical model shown as objects, with no symbol stage and no trial behind it as a way of teaching; none is claimed.

## The four mechanic questions

Answered for the game's own idea, a defence built from three true materials and tested by a raid. No school skill is claimed, so none of these answers is a claim about learning.

- **Swap.** No: take away how sand, mud and stone behave and there is no game left, because what the child builds, why it holds and where it gives are all that behaviour.
- **Attention.** At the moment of decision the child looks at one place in the nest and thinks about what is there and what it rests on: which lump goes where, what will bear it, and which camper will meet it. Aiming and timing come in only when a machine is fired, and a machine is never needed to turn a raid back.
- **Fun.** Yes: the best moments are the pour of sand into a new tunnel, the wall that holds with a beetle straining at it, and the wall that does not, and each is the material doing what it does.
- **Guess.** Not by tapping: a defence is a place, a material and a shape, chosen among hundreds of cells, and the same raid against the same nest plays the same way every time, so a lucky try does not exist. Trying things one at a time does work, and is the point: each try shows what that one change did.

## The error as a consequence

A defence that does not work is shown by the raid itself, at the place it failed and for the reason it failed (pack: game-design, errors-show-as-consequences.md).

- **It follows from the world's own rules.** The wall of sand goes at its foot under the first beetle; the stone that nothing bore drops when the ant under it walks on; the mud patch one cell long holds one raider ant and the next walks over its back; the pit with earth walls holds the beetle and the ants climb out.
- **It shows where and why.** The invader that got in is seen getting in, by the way it took. Where a wall gave, the lumps lie where they fell for as long as the raid lasts.
- **The state stays, and the try is free.** A raid runs on a copy of the nest. When it is over the workers put every fallen lump back where the child had built it, grumbling, and the nest stands as built. The child never rebuilds by hand what an invader broke.
- **The place that gave stays readable.** A scuff of pale dust and a ring of footprints mark each cell where a wall was shoved or a lump fell, and a worker stands by the worst one, looking at it with its hands on its hips. The marks are short-lived: they are cleared when the next raid is called and are gone on load. So the child can change one thing there and call the same raid again, and it plays the same way up to the thing that changed.
- **It is as good to watch as success.** An invader that reaches a chamber does its own act there once, and each act is a joke at the invader's expense (see the characters). Then it trudges home by itself.
- **Nothing gives a verdict.** No buzzer, no cross, no face turned to the child. The queen's feelings are about the beetle in her room. Success is a consequence too: the campers come back out the way they went in, muddy, sandy or backwards, and sit down at their camp to sulk.
- **Outside a raid** an error is smaller and just as plain: sand set as a column slumps as it lands, mud set in the air plops to the floor, a stone set on nothing drops. Each can be picked up again at once.

## The designed order, and what is stored

### A raid, and how it is judged

- The party that will come next sits at the **log beside the mouth**, in front of the camp, in plain view. The child calls it by tapping the **dewdrop bell** that hangs on a grass stalk over the mouth. Nothing else starts a raid: no clock, no amount of building, nothing while the game is unattended or put away.
- A raid is one cycle. It runs on game time on a copy of the nest, and it ends by itself: every invader is turned back, or gives up at something it cannot pass and trudges home, or reaches a chamber, does its own act there once and trudges home. A machine sends an invader out sooner, and is never the only way a raid ends.
- With no shot fired, the same party against the same nest plays the same way every time, invader for invader. The party's moves come from the nest and the party alone; chance decides nothing in a raid.
- **A raid went well** when no invader finished its act in a chamber. An invader that got inside and was sent out before its act was over does not spoil it.
- **A raid did not go well** when any invader finished its act in a chamber.
- **A raid is not judged** when the kingdom had no chamber as it was called (the campers come, look down the mouth, find nothing to want, shrug at each other and go back), or when the game is put away while it runs.

### The order

The position moves forward one place after a raid that went well, and never back: after a raid that did not go well, or one that was not judged, it stays where it is. It moves only when a raid is judged, never during one. Each place is the party at the log, and one new thing that party brings; the later places combine what is known. A larger or stranger party looks it, sitting at the log, and it is the child who rings the bell.

| Id | The party at the log | What is new |
| --- | --- | --- |
| `first-chamber` | One scout ant. | A room to defend, the bell, and one habit: raider ants go anywhere open and stick in mud. |
| `ant-file` | Three raider ants in a file. | Number: one cell of mud holds one ant, and the next walks over its back. A sand face cannot be climbed. |
| `first-beetle` | One beetle. | A pusher that is too heavy to climb: walls and what they hold, pits, a stone in the way. |
| `beetle-pair` | Two beetles. | Pushing together: a wall that held one may not hold two. Combinations of lumps. |
| `ants-and-beetles` | Two ants and two beetles. | No new thing: what stops one kind lets the other through. |
| `first-fly` | One fly. | A flier: over walls, pits and patches, and stopped by a low way. |
| `the-catapult` | Two flies and two ants. | The catapult arrives. A lobbed shot, and the three loads. |
| `mixed-party` | An ant, a beetle and a fly. | No new thing: all three kinds at once. |
| `the-cannon` | Two beetles and two flies. | The cannon arrives. A level shot down a hall. |
| `full-camp` | Three ants, three beetles and two flies. | No new thing: number. |
| `dung-scout` | One dung beetle with its ball. | The ball: it breaks what is thin and widens what is soft, and stone stops it. |
| `great-raid` | Five dung beetles with their balls, led by the dung fly. | The army follows the fly. |
| `open-kingdom` | A mixed party, a different one after each raid that went well, in a fixed round of six. | Nothing: the kingdom is safe and stays open to play. |

- The ids are the ones in `LADDER` in `config.ts`. They name places in the game's own order and never a grade, a groep or a level. An id the game does not know reads as `first-chamber`.
- **Every visit of every age starts at `first-chamber`**, and a saved position wins. `ctx.childAge` sets no starting place (see the band).
- **Nothing shows the position**: no number, bar, map, badge or name. The party at the log is the only sign of it, and that party is a thing in the world.
- **Which party a new position lays out.** The party at the log is laid out from the position at load and again when a raid has been judged and the invaders are home. So after a raid that went well, the next party walks to the log while the last one sits down to sulk, and it is the party of the new position. No party is laid out a place behind.
- **A harder option the child picks.** In `open-kingdom` the round of six parties runs from the lightest to the heaviest, and each sits at the log looking as heavy as it is. Before that, the child makes any raid harder by building less and easier by building more.

### How the kingdom grows

Growth follows what is built and is seen in the nest, never as a number, a bar or a name.

- **Chambers.** Each chamber of the kingdom is lived in: two workers move in, with their things, as soon as air reaches it. The crowd of workers stops growing at sixteen; past that the kingdom grows in rooms and halls.
- **The queen** lives in the largest chamber, and moves house, carried and complaining, when another becomes larger.
- **The hill** over the mouth is the spoil of everything dug, and is as high as the nest is hollow.
- **What can be built** grows with what has arrived: the catapult from `the-catapult`, the cannon from `the-cannon`, and with every lump the child has moved to where it is wanted.
- Workers, queen and hill are worked out from the saved ground each time and are not stored.

### Every field of the saved state

| Field | What it holds |
| --- | --- |
| `v` | The version of the shape. |
| `position` | The id of the place in the order. |
| `finished` | The template's field. Always false in this game: a raid is never saved, so no judged cycle is ever on screen at load. |
| `ground` | The 840 cells as built, as a run-length string. Lumps that lie loose are cells of it like any other. |
| `ant` | The cell the child's ant stands in. |
| `machines` | For each machine that has arrived: its kind, the cell it stands on, the way it faces, and its load (none, sand, mud or stone). |
| `muster` | Which of the six parties of `open-kingdom` sits at the log. |
| `shown` | The marks of the first showings that have started, by their ids. |
| `ended` | The great raid was turned back. |

**Never saved, and gone on load:** a raid and the copy of the ground it runs on; what it knocked down; where invaders stand (they are at their camp); the marks where a wall gave; a shot in the air; and a lump in the ant's jaws, which goes back to the cell it was picked from, whether it is put away under a dragging finger or the drag is taken away. A machine fired in a raid has its load again when the raid is over. A machine fired outside a raid has really thrown its lump: the lump lies where it landed, as a cell of the ground, and the machine is saved empty.

**When it is saved.** On every change the child makes: a mouthful dug, a lump set down, a machine set, turned, loaded or fired outside a raid, and when the ground has come to rest after any of them. While the ground is still falling the save holds it as it will come to rest, so nothing is saved in the air. When a raid is judged, `position` (and `muster`, and `ended` after the great raid) are saved in that instant.

**Size.** The largest ground, with both machines and every mark, is under 2 KB as a string; the test holds it under half of the 64 KB cap.

### The guidance ladder

On attended time, with no word and no numeral, and never a solution (pack: game-design, ages-9-to-12.md). It starts after the wait the band sets and backs off at any touch.

1. **What can be touched.** The child's ant looks out of the screen, then scratches at the earth beside it, and the earth there glints. If lumps lie in reach, one of them glints in turn; if a party waits and a chamber exists, the bell sways and a drop on it catches the light.
2. **One possible move.** The ghost hand makes one short drag through plain earth beside the ant, away from anything built, and lets go. It shows that a drag digs, and nothing about where to dig or what to build.
3. It then waits twice as long before showing either again.

The hand never shows a lump being set in a place, a machine being loaded or aimed, or the bell being rung: each of those is part of a plan, and the plan is the child's.

## The characters and their fixed tastes

The feedback is given by the ground and by these characters. Their feelings are about what happens in the nest and never about the child.

### The kingdom

- **The child's ant.** Led by the finger. It digs earth, carries one lump at a time and sets it down, and it never fights. Its want is whatever the finger points at. It likes a fresh tunnel, and it cannot leave a stone alone: it taps every stone it passes.
- **The queen.** Very large, with an egg she will not put down. On a first visit she is wedged in the shaft under the mouth, far too big for it, looking down at the earth: she wants a room, and that want is the first thing in the frame. She likes the largest room. She dislikes guests: an invader doing its act in her room gets her whole opinion, eyebrows first.
- **The workers.** Two to a chamber. They want things back where they were. After a raid they put back every fallen lump as the child built it, muttering, and one of them stands by the place that gave way with its hands on its hips.

- **Nothing of the kingdom takes a touch meant for the ground.** A press on a cell is always that cell's: a worker or the queen standing there steps aside and the dig or the lump is answered. A machine stands only on open floor, never on a lump or over the mouth, and is picked up only by a press that starts on it; an overlap test holds this at each surface size (guide, ruling 15). A press on a camper, the bell's stalk, a toadstool or the hill is answered by that thing as itself and changes nothing in the nest; only the bell calls a raid.

### The invaders, by habit

Each kind's habits are fixed, so a child can learn them and test them on purpose. They are shown before they are met: at the camp each kind is caught out by its own habit again and again (the ant stuck in a puddle, the beetle that cannot climb a toadstool, the fly that cracks its head on a low twig).

| | Raider ant | Beetle | Fly | Dung beetle with its ball | Dung fly |
| --- | --- | --- | --- | --- | --- |
| **Fits** | Any way one cell high. | A way two cells high. | Flies where the way is two cells wide and three high; does not walk. | The ball needs three cells; the beetle behind it two. | As a fly. |
| **Climbs** | Any face of earth or stone, up or down. | One cell up. Falls any distance down, onto its back. | Flies over. | One cell up, with the ball. | Flies over. |
| **Passes** | Walls it can get over or round, pits with firm sides, beetles' backs, a stuck ant's back. | Mud underfoot, loose sand (ploughs through), any wall weaker than its push. | Walls, pits and mud, wherever there is flying room over them. | Any wall weaker than the ball's push of 6. Where sand, mud or earth make the way too narrow for the ball, it stops and digs the way wider. | As a fly. |
| **Stopped by** | Mud underfoot or on a face (stuck fast). A face of sand (it slides back down with the sand). | A wall that holds. A step of two cells. A pit two cells deep. A stone with earth behind it. | A way less than three cells high. | A wall that holds 6 or more. Stone it cannot dig: a doorway of stone with a stone lintel jams the ball, and the beetle leaves it there and walks on as a plain beetle. | As a fly. |
| **Wants, and shows it at the log** | To lie in someone else's bed: it has a pillow under one arm. | The seeds in the pantry: a leaf is tucked under its chin as a napkin. | To taste everything: it rubs its hands with its tongue out. | To park its ball in the grandest room: it holds the ball and eyes the mouth. | To be obeyed: it points its twig at the mouth. |
| **Its own act in a chamber** | Paces the room out, lies down flat in the middle as if it owned it, and is asleep before its feelers settle. Wakes with a start and goes. | Eats one seed, far too slowly, with its eyes shut, burps, and is embarrassed. | Walks up the wall and across the ceiling tasting each thing with its feet, rubs its hands, tastes its own foot by mistake and leaves in a hurry. | Rolls the ball to the middle, steps back to admire it, polishes one spot, cannot decide it looks right, and rolls it home again. | Lands on the highest thing, raises its twig and conducts the army in. With no army in the room it conducts nobody, notices, and goes. |
| **When it gives up** | Stuck: it pulls at each foot in turn and sits down where it is. Otherwise it turns round with a shrug of the feelers. | Sits down heavily, sighs, and plods out; out of a pit it is hauled by the workers when the raid is over. | Hovers at the low place, peers in, buzzes at it, and flies out. | Sits on its ball. | Folds its arms. |

The dung beetles go where the dung fly points: toward the chamber nearest to it. While the fly is up, a ball that meets soft ground digs on, so soft walls only slow the army. With the fly down, every dung beetle loses its way within a few steps, turns its ball round and rolls it home.

### The two machines, and what each load does to each kind

Each machine arrives once, at its place in the order, lowered down the mouth by the workers. From then on it is part of the nest: the child drags it to a floor two cells wide with two cells clear over it, turns it by tapping it, and loads it by setting a lump on it. Where it stands, which way it faces and what it holds are saved, and they decide what it can reach. In a raid the finger fires it with a tap, and it is loaded again from its own lump after a few beats, so one machine can fire many times in one raid.

- **The catapult** lobs its load in an arc, up three cells and six cells along, over walls and into pits. Under a low ceiling the shot hits the ceiling and drops short. It suits a chamber.
- **The cannon** fires level along its row until the shot meets something, as far as the way is open. It suits a hall.

Nobody is hurt and nobody is removed: every answer below ends with the invader bewildered, and either walking on or trudging home.

| | Sand: a wide, short blast | Mud: a ball that sticks | Stone: a heavy knock |
| --- | --- | --- | --- |
| **Raider ant** | Buried to the feelers. Digs itself out backwards, sneezes and goes home. | Rolled up in the ball with its feet sticking out. Stays there until the workers unstick it. | Rolled flat like pastry. Peels itself off the floor and wobbles home, thin. |
| **Beetle** | Rattles off its shell. It sneezes once and walks on. | Splat over both eyes. It walks on blind, in a straight line, turns round at the first thing it bumps, and so walks out. | Knocked onto its back, legs waving. It rocks itself upright and comes on; a second knock while it is on its back slides it out of the nest. |
| **Fly** | Blown back the length of the hall, tumbling. It shakes its head and comes again. | Wings gummed. It drops, sits, cleans one wing at a time with great care, and walks home sulking. | Steps aside in the air, watches the stone go by, and flies on. |
| **Dung beetle with its ball** | The sand sticks to the ball, which is now a size bigger and needs a wider way. | The ball sticks to the floor. The beetle heaves, gives up on it and walks on as a plain beetle. | The ball is knocked back up the hall and its beetle runs after it. From the foot of the shaft it rolls out of the mouth, and that beetle is home. |
| **Dung fly** | Blown back, and drops its twig. It fetches the twig and comes again. | Wings gummed, down it comes, and the army loses its way. | Steps aside in the air without looking. |

Outside a raid a loaded machine fires at a tap all the same: the lump flies, lands, and lies where it landed.

## The scenes

Every scene is a list of timed beats on game time, filled in from the state of play, and any touch ends it at once with its outcome already in place.

| Scene | What causes it | Its beats, and what fills them in | What it saves when it starts |
| --- | --- | --- | --- |
| **The queen moves in** | The largest chamber of the kingdom changes, the first time included. | Workers pull her out of where she was like a cork, carry her by the way that is open to the new room, and she tries each corner before she sits. Filled in by the two rooms and the way between them. About 6 seconds. | Nothing: where she lives follows from the saved ground. |
| **The shrug** | The bell is rung with no chamber in the kingdom. | The party walks to the mouth, looks down it, looks at each other, shrugs each in its own way and walks back. About 5 seconds. | Nothing. |
| **A first showing of a kind** | A party with a kind not yet shown takes its place at the log. | That kind is caught out by its own habit at the front of the camp, once, large: the ant in the puddle, the beetle at the toadstool, the fly at the twig, the dung beetle whose ball will not go between two pebbles, the dung fly whose beetles walk off the wrong way when it looks elsewhere. About 5 seconds each. | The kind's mark in `shown`, when the showing itself starts. |
| **A machine arrives** | The party of `the-catapult` or `the-cannon` takes its place at the log. | Workers lower the machine down the mouth on a thread, set it at the foot of the shaft, load it with a crumb and fire it once to see; it works, and the crumb hits a worker's hat. About 7 seconds. | The machine's mark in `shown` and its entry in `machines`, when the showing itself starts. |
| **The put-back** | A raid is over. | Each invader still in the nest trudges or is carried out by the way it came. The workers carry each fallen lump back to where the child had built it, nearest first, and one stands by the place that gave. Filled in by what this raid knocked down. 4 to 10 seconds, shorter when little fell. | `position`, with `muster` and `ended` where they change, saved when the raid is judged, before this scene. The scene itself changes no saved field: the ground was never changed. |
| **The ending** | The great raid went well. | The army rolls home in a muddle, balls bumping. The dung fly sits on the hill and a worker hands it a leaf to wipe its eyes. The workers light a glow-worm in every chamber of the kingdom, nearest the mouth first, so the child's own plan lights up room by room. The queen puts her egg down at last. Dusk comes over the camp, and the dung beetles sit on their balls round a small glow. Filled in by the chambers as built. About 20 seconds, and it holds on its last beat as long as the child likes. | Nothing: `ended` and the position `open-kingdom` were saved when the great raid was judged, with the put-back that comes before it, so a game put away between the two is found finished and plays no ending on load (guide, ruling 12). |

- **Showings that are owed.** A first showing that follows a put-back on the same raid has its mark written when it starts, not when the raid is judged. Put away before it starts, nothing plays on load; it is still owed, and it starts at the child's first touch (guide, ruling 12, the near case).
- **No scene plays on load.** The game opens on the nest as built, the ant where it stood, the invaders at their camp and the next party at the log.
- **After the ending** the glow-worms stay lit in the chambers of the kingdom and the dung fly's wiping leaf hangs on a grass stalk at the camp. Both follow from `ended` and the saved ground. Nothing is counted, named or handed over.

### How a cycle ends, and how the next one starts

A raid ends by itself, and then nothing new starts. The next party is at the log, visible and waiting, each one holding its want in plain sight and fidgeting in its own way; it never hurries the child, complains of waiting or refers to the child leaving or coming back. It comes when the bell is rung. Building has no cycle: it is open play in a kingdom that is found as it was left.

### Found as left

Put away at any instant: the ground is saved as it will come to rest; a lump in the jaws is back in the cell it came from; a raid is over without being judged, with the invaders at their camp and the nest as built; the marks where a wall gave are gone; no scene replays. All time in the game is attended game time, and no wall clock is read.

### What a frame costs

- **What counts as a draw.** One call that puts pixels on the visible canvas: a stamp of a cached image (the ground sheet, the setting, the glass, a creature's part) or one filled or stroked path. Painting a cell into the cached ground sheet is counted apart, as a repaint.
- **The budget.** At most 80 draws in any frame, and at most 24 cell repaints in a frame; a larger change to the ground is spread over the following frames, nearest the finger first. The whole grid is never repainted in a frame. The game's own work stays under 8 ms a frame at six times CPU throttle.
- A test counts the draws of the fullest frame of the toy, of a raid with every kind on screen, and of the great raid.

## The look

Written after the style spike, not part of the sheet: the claimed look, the palette, materials, lighting and motion rules, and how each tier in `config.ts` keeps the look.
