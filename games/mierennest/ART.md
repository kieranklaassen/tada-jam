<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 9 to 12. Its youngest age, 9, governs the design. Mierennest is a play-first game: it claims no school skill, and this sheet has no records part.

- **Cue table.** The row for a youngest age of 7 and up in the wordless-clarity convention. Its "Avoid" column binds the game: no written word or letter; no symbol standing alone that play depends on reading; no timer, points or verdict chrome; no long hint chain.
- **Age rule.** (pack: game-design, ages-9-to-12.md) The ground is a real system that behaves the same way every time: sand pours and slumps, mud sticks and holds, a stone falls unless something bears it. Every invader kind has fixed habits. More than one defence works against every raid, and a better one is visibly better in the world: it holds more, with fewer lumps. Failure is large, funny and free: a raid runs on a copy of the nest, and the workers put back whatever it knocked down. Help is something the child fetches: at the camp each kind acts out its own habit for anyone who looks, a press on a camper is answered by that camper at once, and the idle ladder never shows a solution. Nothing is babyish, nothing competes, and no best is stored.
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

The finger lands anywhere in the ground and the mouthful under it is bitten at once. The ant comes to the finger by the shortest open way; where no open way reaches it, the ant stops at the nearest open cell, faces the finger and waits, and no cell is ever dug that the finger did not touch. While the finger moves, the earth under it is bitten away in a round mouthful two cells across, so the tunnel is as wide as the finger and a creature fits in it.

- **On touch-down, in the same frame:** the mouthful under the finger is gone, crumbs spray from the bite, the ground gives one dull crunch, and the ant turns to the finger. Where all under the finger is dug already, nothing is bitten: a little dust lifts from the place, the ant's feet patter, and it comes.
- **While dragging:** the mouthfuls crunch at a pitch that follows the speed of the finger, a crunch a mouthful and at most fourteen a second, crumbs trail behind, a worker at the mouth of the nest catches the spoil and trots it up to the hill, and the hill on the surface grows by a crumb. Roots that hang from the turf into a new tunnel right under it swing. A camper above a fresh tunnel feels it through its feet and hops.
- **What the dig meets answers as itself.** Earth is dug. Sand is not bitten: it trickles, and when the earth under it has gone it pours into the tunnel with a long hiss and slumps into a pile. Mud squelches and holds. A stone clinks, sparks once and stays; with nothing left to bear it, it drops with a thud that shakes the campers. The bedrock at the bottom and the turf at the top ring dull and do not give.
- **On release:** the ant sits back, wipes its jaws and looks at what it made; loose things finish falling.
- **A tap** is one mouthful, with the same answer.
- **A drag that starts on a lump carries it.** A touch that lands on a lump bites nothing, not the earth beside the lump either: the lump answers as in the first column of the grid. When the ant can reach the lump by an open way it takes that one lump in its jaws, follows the finger along the open way and sets the lump down in the open cell where the finger lets go; let go where a lump cannot lie, it goes back to the cell it came from. A drag that starts on a machine moves the machine and bites nothing (see the two machines). A drag that starts anywhere else in the ground digs, and a lump it meets is answered as in the first column of the grid and is not picked up.

It is a pleasure with no goal because it is drawing with a tunnel in something that pushes back: every stroke leaves a shape that stays, sounds like the speed of the hand, and may set the ground itself moving, since a stroke under sand starts a pour and a stroke under a stone starts a fall (pack: game-design, toy-first.md; pack: game-design, touch-answers-bigger-than-the-touch.md). Random dragging always digs something and never does harm: nothing dug is needed, and every lump that falls can be picked up again. Someone watching sees within three seconds that the child is digging an ant nest.

## The object-by-action grid, and what is new on day 15

Three materials by six actions. Each lies in the ground in its own seams and is the same thing wherever it is met: in a seam, as a lump in the ant's jaws, in a wall, or in the cup of a machine. No use is refused: every cell below works, costs nothing, and is as good to watch when it is the wrong use.

| | The dig meets it | Carried | Set down | An invader leans on it | A shot hits it | Something rolls against it |
| --- | --- | --- | --- | --- | --- | --- |
| **Sand** | It is not bitten. It trickles with a dry hiss, and when the earth under it has gone it pours into the tunnel and slumps into a pile. | It rides as a heap on the ant's head and leaks a thin thread of grains behind, with a soft patter. | It lands with a puff and a hush, and slides until its pile is no steeper than one cell up for one cell along. Between two firm sides it stands as a column. | It gives at the foot with a sigh and is shoved along; what stood on it sifts down into a pile, which the invader shoves before it or walks over. Sand that touches mud is packed and holds like a wall. | It bursts into a fan of grains with a whoosh, and the shot comes to lie against it; sand on sand slumps into a lower, wider pile. | The roller runs into it with a long scrunch and stops against it. |
| **Mud** | It is not bitten. It squelches, a few dark drops fly from it, and it holds its shape. | It hangs from the jaws in a long drip that stretches and snaps back with a wet smack. | It lands with a splat and stays wherever it touches something that is held: a floor, a wall, a ceiling, a stone. In the open with nothing to touch it drops with a plop until it does. | It holds, and the pusher strains at it. A raider ant that treads on it is stuck by the feet with a squelch, and tugs at them. | The shot meets it with a glug and stays against it: sand that touches mud is packed, a stone that touches mud is bedded. | The roller stops dead with a schlup and is held there; a stone held by mud is bedded and no longer rolls. |
| **Stone** | It is not bitten. It clinks and throws one spark, the ant's jaws ring and its feelers shake. With nothing left to bear it, it drops. | It is too heavy to hold up: the ant drags it behind with a grinding scrape, leaning forward, and goes slower. | It falls straight down with a thud that makes the campers hop, and never slides sideways. It stays up only where something bears it: a held cell under it, or a held stone, mud or earth on both sides. | A stone on a flat floor rolls ahead of the push with a low rumble until something stops it. A bedded stone does not move. | It rings like a bell, the shot stops against it, and a free stone struck by the cannon rolls one cell on. | Clack: the roller stops and the stone it struck rolls on in its place, as far as it has room. |

In the last column the roller is a stone that was pushed or knocked and rolls along a floor. A dung ball is no such roller: it has its beetle's push of 6 behind it, and what it does to each material is under "What a wall holds" and in the invaders' table.

**The wrong uses, and why they are worth doing.** Sand heaped as a wall in a tunnel is the first thing most children will try, and it fails in the best way, twice: heaped right to the roof it shuts the air out, and the room behind is no chamber any more: its workers and their things are gone; with a gap left over it for the air, the first beetle leans, the sand gives with a sigh, and the beetle shoves the pile along in front of it. Mud set in mid-air plops to the floor. A stone set on sand looks safe until the sand is taken away. A stone carried to the top of a shaft and let go is a thud heard at the camp.

**Combinations.** The grid is three rows, and its depth is in what two cells do together, which is always the same: mud packs the sand it touches and beds the stone it touches; a stone across two held stones is a lintel and bears what lies on it; sand on a lintel stays up over an open doorway; a pit with a sand face cannot be climbed, a pit with a mud floor does not let go, and a stone at its lip waits to be rolled in. The numbers behind "holds" are under "The representation".

**Day 15.** On day 1 the child digs a room and finds out that a wall of sand is not a wall. On day 15 the child beds a stone in mud in the roof of a way, where a dung ball jams, packs a wall that holds three beetles with four lumps where it once took nine, knows which camper each trap is for and stages a raid on purpose to watch one of them walk into it, sets the cannon where one stone flies the length of a hall, and has a kingdom of rooms and halls of their own plan that no one else's looks like (pack: game-design, depth-from-combinations.md; pack: game-design, liveliness-from-causing-and-comedy.md).

## The representation

No school skill is claimed. The game's own idea is a defence built from three materials that behave truly, and tested by a raid. It is carried by the objects alone: a wall holds or gives because of what it is made of and what it rests on, and the child can see which.

### The stage

One fixed stage with the whole farm in view, 1180 by 820 stage units, fitted into the surface without scroll or zoom. So a drag is always a dig, a raid is read at a glance, and the save holds no camera.

- A wooden frame 30 units wide runs round the stage. Inside it, the top 172 units are sky, grass and the invaders' camp. Below that the ground is a grid of **40 columns by 21 rows of square cells, 28 units a side** (1120 by 588 units).
- **The cell size comes from two bounds, taken together.** The finger's mouthful is two cells across, 56 units, which on a surface 1180 wide is 56 pixels and above the jam's floor of 48 for a target, so a drag leaves a tunnel two cells high; and a creature that fits that tunnel must still be about a tenth of the frame wide or more. Insects are long and low, so both hold at 28: the child's ant is 112 units long and one cell high, a raider ant 118 long and one cell high, a beetle 124 long and two cells high, a fly 118 across its wings and two cells high, a dung ball 84 across (three cells) with its beetle behind it. A smaller cell makes the creatures smaller than a tenth; a larger one leaves too few cells to build with.
- Row 0 is turf and row 20 is bedrock: neither can be dug. The **mouth** of the nest is three cells of the turf at its middle (columns 19 to 21), always open, wide enough for a dung ball, with the hill round it. Nothing can be set down in the mouth. A new nest has a short shaft under the mouth, as wide as the mouth and three cells deep, with the ant at its foot.
- **The largest kingdom this ground holds.** The 760 cells between turf and bedrock can each be any kind. The most rooms that fit, each with one cell of earth or of lumps between it and the next, is 39: eight across and five down, less one in the top row, where the shaft stands. The size test saves a ground in which no two neighbouring cells are alike, with both machines loaded and every id in `shown`.

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

- Both are seen: packed sand is a shade darker with its grains close together, and a bedded stone has the mud up round it on each side the mud is on.
- The hold of a run is the sum of its cells. A beetle pushes 3, and beetles in a line push together, up to three of them. A dung ball pushes 6.
- **A push greater than the hold, with room beyond:** the whole run is shoved one cell on, and then the ground comes to rest by the rules above. A thin sand wall goes at its foot and what stood on it sifts into a pile.
- **A push that is not greater:** the wall holds. The pusher strains, slides back on its feet and waits for a friend.
- **A run with earth or rock behind it** cannot be shoved. Loose sand at its front is ploughed through all the same: the pusher changes places with it. So a sand wall one or two cells thick never stops a beetle, and neither does sand with earth or rock behind it, however thick; three cells of loose sand in a row with room beyond hold one beetle and no more.
- A lone stone on a flat floor has room beyond it, so it rolls ahead of the push until something stops it.

So one material alone is weak in its own way (sand is loose, a stone rolls, a little mud is light), and a combination is stronger than its parts: packed sand and mud, 5 against 1 and 3; mud and a bedded stone, 8 against 3 and 2.

### What a chamber is

The ground module recognises a chamber in what the child dug; nothing is placed from a menu.

- A **room** is open space that holds a clear block at least 4 cells wide and 3 cells high. All such blocks that overlap or touch along a side are one room. A tunnel two cells high is never a room, however long. The shaft a new nest starts with (the three columns under the mouth, three cells deep) is the way in and no part of any room: no block is counted in its cells, so an invader coming down it is not yet inside.
- A room is a **chamber of the kingdom** while air reaches it: there is a way of open cells from the mouth to the room, however narrow. A room walled off from the mouth is no chamber: its workers and their things are gone from it, and it counts for nothing until it is opened again.
- A wall built right across the only open way to a room shuts the air out of it, and a room without air is no chamber. So a defence never shuts a chamber in: at least one way of open cells, however narrow, is left from the mouth to each chamber it defends, and a raider ant fits that way.
- The kingdom's growth, the number of workers and the moment an invader counts as inside all follow from this: an invader is **inside** when any part of it is in a cell of a chamber.

### Where the game is true and where it simplifies

True as far as it claims: dry sand does pour and come to rest at a slope, wet mud does hold a shape and stick, a stone does need bearing, and a lintel does carry a load across a gap. Simplified, and said here: the ground is cells, so a slope is one for one and nothing tips or wedges; there is no water, so mud never dries and sand never gets wet; packed earth never caves in; a lump has no size but a cell; and the holds in the table are the game's own numbers, which claim only this much: loose sand gives first, a round stone on a flat floor rolls, sticky mud grips, and two materials together hold more than either alone. The invaders' habits are the game's fiction and claim nothing about real insects, except that insects are long and low.

**Standing.** This is a physical model shown as objects, with no symbol stage and no trial behind it as a way of teaching; none is claimed.

## The four mechanic questions

Answered for the game's own idea, a defence built from three true materials and tested by a raid. No school skill is claimed, so none of these answers is a claim about learning.

- **Swap.** No: take away how sand, mud and stone behave and there is no game left, because what the child builds, why it holds and where it gives are all that behaviour.
- **Attention.** At the moment of decision the child looks at one place in the nest and thinks about what is there and what it rests on: which lump goes where, what will bear it, and which camper will meet it. Aiming and timing come in only when a machine is fired, and a machine is never needed to turn a raid back.
- **Fun.** Yes: the best moments are the pour of sand into a new tunnel, the wall that holds with a beetle straining at it, and the wall that does not, and each is the material doing what it does.
- **Guess.** Not by tapping: a defence is a place, a material and a shape, chosen among hundreds of cells, and the same raid against the same nest plays the same way every time, so a lucky try does not exist. Trying things one at a time does work, and is the point: each try shows what that one change did.

## The error as a consequence

A defence that does not work is shown by the raid itself, at the place it failed and for the reason it failed (pack: game-design, errors-show-as-consequences.md).

- **It follows from the world's own rules.** The wall of sand goes at its foot under the first beetle; the stone that stood on a sand wall comes down when a beetle shoves the wall from under it; the mud patch one cell long holds one raider ant and the next walks over its back; the pit with earth walls holds the beetle and the ants climb out.
- **It shows where and why.** The invader that got in is seen getting in, by the way it took. Where a wall gave, the lumps lie where they fell for as long as the raid lasts.
- **The state stays, and the try is free.** A raid runs on a copy of the nest. When it is over the workers put every fallen lump back where the child had built it, grumbling, and the nest stands as built. The child never rebuilds by hand what an invader broke.
- **The place that gave stays readable.** A short track of footprints marks the first cell where a wall was shoved or a lump fell, and a scuff of pale dust up to five more; a worker stands by the first, looking at it with its hands on its hips. The marks are short-lived: they are cleared when the next raid is called and are gone on load. So the child can change one thing there and call the same raid again, and it plays the same way up to the thing that changed.
- **It is as good to watch as success.** An invader that reaches a chamber does its own act there once, and each act is a joke at the invader's expense (see the characters). Then it trudges home by itself.
- **Nothing gives a verdict.** No buzzer, no cross, no face turned to the child. The queen's feelings are about the beetle in her room. Success is a consequence too: the campers come back out the way they went in, and sit down at their camp again.
- **Outside a raid** an error is smaller and just as plain: sand set as a column slumps as it lands, mud set in the air plops to the floor, a stone set on nothing drops. Each can be picked up again at once.

## The designed order, and what is stored

### A raid, and how it is judged

- The party that will come next sits at the **log beside the mouth**, in front of the camp, in plain view. The child calls it by tapping the **dewdrop bell** that hangs on a grass stalk over the mouth. Nothing else starts a raid: no clock, no amount of building, nothing while the game is unattended or put away.
- A raid is one cycle. It runs on game time on a copy of the nest, and it ends by itself: every invader is turned back, or gives up at something it cannot pass and trudges home, or reaches a chamber, does its own act there once and trudges home. A machine sends an invader out sooner, and is never the only way a raid ends.
- Each invader comes in by a column of the mouth that is open to it, the one nearest the camp first: a beetle needs one column, a flier two side by side, a dung ball all three. Where the ball does not fit, its beetle leaves it on the grass and comes in without it; one the mouth is shut to altogether looks in, sighs and goes back to the log.
- One invader is in a chamber at a time. Another that comes to its door goes to a chamber nobody is in, where there is one, and otherwise waits at the door, in view, until the first has left; those behind it wait a body's length apart. The first of a kind to do its act in a raid does it in full, and a later one of the same kind does only the end of it.
- With no shot fired, the same party against the same nest plays the same way every time, invader for invader. The party's moves come from the nest and the party alone; chance decides nothing in a raid.
- **While a raid runs the nest is not built on.** The finger fires the machines and nothing else changes: a press on the ground brings the child's ant running to that place to look, a press on a lump makes it answer as in the first column of the grid, and nothing is dug, carried, set down, moved or turned until the invaders are home. So a raid is a test of the nest as it stood when the bell was rung.
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
| `great-raid` | Five dung beetles with their balls, led by the dung fly. | The army and its leader: while the fly is up the balls dig through soft walls, and with the fly down the army loses its way. |
| `open-kingdom` | A mixed party, a different one after each raid that went well, in a fixed round of six. | Nothing: the kingdom is safe and stays open to play. |

- The ids are the ones in `LADDER` in `config.ts`. They name places in the game's own order and never a grade, a groep or a level. An id the game does not know reads as `first-chamber`.
- **Every visit of every age starts at `first-chamber`**, and a saved position wins. `ctx.childAge` sets no starting place (see the band).
- **Nothing shows the position**: no number, bar, map, badge or name. The party at the log is the only sign of it, and that party is a thing in the world.
- **Which party a new position lays out.** The party at the log is laid out from the position at load and again when a raid has been judged and the invaders are home. So after a raid that went well, the party at the log once the put-back is over is the party of the new position. No party is laid out a place behind.
- **A harder option the child picks.** The child makes any raid harder by building with fewer lumps or by leaving a machine unloaded, and it looks harder in the world: a thinner wall, an empty cup. In `open-kingdom` the round of six parties runs from the lightest to the heaviest and then round again, and each sits at the log looking as heavy as it is; the round moves on by the rule above and is not the child's pick.

### How the kingdom grows

Growth follows what is built and is seen in the nest, never as a number, a bar or a name.

- **Chambers.** Each chamber of the kingdom is lived in as soon as air reaches it: two workers move in where its floor has room for two, one where it has room for one, and the first six chambers have their things on the back wall. The crowd of workers stops growing at sixteen; past that the kingdom grows in rooms and halls.
- **The queen** lives in the largest chamber, and moves house, carried and complaining, when another becomes larger.
- **The hill** over the mouth is the spoil of everything dug: it rises with how hollow the nest is, fast at first and then ever more slowly, up to a height it never passes. At that height it still stands clear of the bell, of the party at the log and of the mouth, and the overlap test of ruling 15 holds this with every cell of the ground dug out.
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

**Never saved, and gone on load:** a raid and the copy of the ground it runs on; what it knocked down; where invaders stand (they are at their camp); the marks where a wall gave; a shot in the air; and a lump in the ant's jaws or a machine under the finger, each of which goes back to where it was picked up, whether the game is put away under a dragging finger or the drag is taken away. While a lump is carried, the cell it came from still bears what stood on it and nothing moves into it; the ground comes to rest only once the lump is set down in another cell. A machine fired in a raid has its load again when the raid is over. A machine fired outside a raid has really thrown its lump: the lump lies where it landed, as a cell of the ground, and the machine is saved empty.

**When it is saved.** On every change the child makes: a mouthful dug, a lump set down, a machine set, turned, loaded or fired outside a raid, and when the ground has come to rest after any of them. While the ground is still falling the save holds it as it will come to rest, so nothing is saved in the air; a machine whose floor is on its way down, or into whose place a lump is falling, is saved where it comes to stand, with what it holds. When a raid is judged, `position` (and `muster`, and `ended` after the great raid) are saved in that instant.

**Size.** The largest ground, with both machines and every id in `shown`, is under 2 KB as a string; the test holds it under half of the 64 KB cap.

### The guidance ladder

On attended time, with no word and no numeral, and never a solution (pack: game-design, ages-9-to-12.md). It starts after the wait the band sets and backs off at any touch.

1. **What can be touched.** The child's ant looks out of the screen, then scratches at the earth beside it, and the earth there glints. If lumps lie in reach, one of them glints as well; if a party waits and a chamber exists, the bell sways and its drop catches the light.
2. **One possible move.** The ghost hand makes one short drag through plain earth beside the ant, away from anything built, and lets go. It shows that a drag digs, and nothing about where to dig or what to build.
3. The hand then waits twice as long before it shows again, twice as long again after that, and after its third showing in one stretch of stillness nothing more is shown until the next touch. The glints stay lit between its showings.

The hand never shows a lump being set in a place, a machine being loaded or aimed, or the bell being rung: each of those is part of a plan, and the plan is the child's.

## The characters and their fixed tastes

The feedback is given by the ground and by these characters. Their feelings are about what happens in the nest and never about the child.

### The kingdom

- **The child's ant.** Led by the finger. It digs earth, carries one lump at a time and sets it down, and it never fights. Its want is whatever the finger points at. It likes a fresh tunnel, and it cannot leave a stone alone: it taps a stone it passes with empty jaws, and the same stone again only after a few seconds.
- **The queen.** Very large, with an egg she will not put down. On a first visit she is wedged in the shaft under the mouth, far too big for it, looking down at the earth: she wants a room, and that want is the first thing in the frame. She likes the largest room. She dislikes guests: an invader doing its act in her room gets her whole opinion, eyebrows first.
- **The workers.** Two to a chamber where its floor has room. They want things back where they were. After a raid they put back every fallen lump as the child built it, muttering, and one of them stands by the place that gave way with its hands on its hips.

- **Nothing of the kingdom takes a touch meant for the ground.** A press on a cell is always that cell's: a worker or the queen standing there takes no touch, and the dig or the lump is answered. The workers' things, the seeds and the glow-worms that stay lit after the ending are painted on the back wall of a room, behind its cells: they take no touch and never keep a lump or a machine out of a cell. A machine stands only in open cells with a floor under it, never in the cell of a lump or over the mouth, and is picked up only by a press that starts on it; a test holds this in stage units, which are the same at every surface size (guide, ruling 15). A press on a camper is answered by that camper as itself, and a press anywhere else above the ground, or on the frame round it, by a puff of dust and a small boing; neither changes anything in the nest, and only the bell calls a raid. While a raid runs, a place at the log whose camper has gone in is bare grass, and one who still sits there, or is home again, answers as itself.

### The invaders, by habit

Each kind's habits are fixed, so a child can learn them and test them on purpose. They are shown before they are met: at the camp each kind that is not in the party at the log is caught out by its own habit again and again (the ant stuck in a puddle, the beetle on its back under the toadstool it could not climb, the fly nursing a bump on its head). A long party takes the grass where the stuck ant and the fly have their spots, and whichever of the two its file reaches is away while that party is the one at the log. The raider ant is the first party of all, so it is first seen in that party and in its own first showing; every other kind is seen at its habit at the camp before it is met, and each kind once, large, at the front of the camp, when its party first sits at the log.

| | Raider ant | Beetle | Fly | Dung beetle with its ball | Dung fly |
| --- | --- | --- | --- | --- | --- |
| **Fits** | Any way one cell high. | A way two cells high. | Flies where the way is two cells wide and three high; does not walk. | The ball needs a way three cells high, and three wide where it drops; its beetle goes wherever a way is open at all. | As a fly. |
| **Climbs** | Any face of earth or stone, up or down. Where the face it climbs down ends over open air, or the floor it walks on ends over nothing, and it has no other way on, it lets go and drops to the floor below. It cannot climb back through the air: after its act it goes as far as the foot of its drop, shrugs, and waits there for the workers, a body's length from the next. | One cell up. Falls any distance down. | Flies over. | One cell up, with the ball. | Flies over. |
| **Passes** | Walls it can get over or round, pits with firm sides, beetles' backs, a stuck ant's back. | Mud underfoot, loose sand that is thin or has earth or rock behind it (ploughs through), any wall weaker than its push. | Walls, pits and mud, wherever there is flying room over them. | Any wall weaker than the ball's push of 6. Where earth, or sand or mud with earth or rock behind it, makes the way too narrow for the ball, it stops and digs the way wider. Lumps with room beyond them are a wall, the gap left over them for the air included: the ball leans on them and does not dig them, except while the dung fly is up. | As a fly. |
| **Stopped by** | Mud underfoot or on a face (stuck fast). A face of sand, which it cannot climb. | A wall that holds. A step of two cells. A pit two cells deep. A stone with earth behind it. | A way less than three cells high. | A wall that holds 6 or more. Stone it can neither dig nor shove: a stone bedded in mud in the roof of a way jams the ball, and the beetle leaves it there and walks on as a plain beetle. | As a fly. |
| **Wants, and shows it at the log** | To lie in someone else's bed: it has a pillow under one arm. | The seeds in the pantry: a leaf is tucked under its chin as a napkin. | To taste everything: it rubs its hands with its tongue out. | To park its ball in the grandest room: it sits on its ball and eyes the mouth. | To be obeyed: it points its twig at the mouth. |
| **Its own act in a chamber** | Goes well into the room, lies down flat as if it owned it, and is asleep before its feelers settle. Then it gets up and goes. | Eats one seed, far too slowly, with its eyes shut, burps, and is embarrassed. | Hangs in the room and tastes it, tongue out, then tastes its own foot by mistake and leaves in a hurry. | Rolls the ball well into the room, polishes one spot and then another, cannot decide it looks right, and rolls it home again. | Hovers in the room, raises its twig and conducts the army in. With no army in the room it conducts nobody, and goes. |
| **When it gives up** | Stuck: it pulls at its feet where it is. Otherwise it turns round with a shrug of the feelers. | Sits down heavily, sighs, and plods out; out of a pit it is hauled by the workers when the raid is over. | Hovers at the low place, peers in, and flies out. | Sits down against its ball. | Folds its arms. |

The dung fly leads: it flies in first, and each dung beetle rolls its ball after it to the nearest chamber that nobody else is in. While the fly is up in the nest, a ball that meets sand or mud digs on, so soft walls only slow the army. With the fly down, every dung beetle loses its way within a few steps, turns its ball round and rolls it home.

### The two machines, and what each load does to each kind

Each machine arrives once, at its place in the order, lowered down the mouth by the workers. From then on it is part of the nest: the child drags it to a floor two cells wide with two cells clear over it, where it faces the way it was last dragged, and loads it by setting a lump on it; let go anywhere else, it goes back to where it stood. Outside a raid a tap on an empty machine turns it round where it stands; a tap on a loaded one fires it, in a raid or out of one. Where it stands, which way it faces and what it holds are saved, and they decide what it can reach. In a raid it is loaded again from its own lump a few beats after it fires, so one machine can fire many times in one raid.

- **The catapult** lobs its load in an arc, up three cells and six cells along, over walls and into pits. Under a low ceiling the shot hits the ceiling and drops short. The turf's row stops it the same way, the mouth in it too: nothing is thrown out of the nest or comes to lie in its mouth. It suits a chamber.
- **The cannon** fires level along its row until the shot meets something, as far as the way is open. It suits a hall.

Nobody is hurt and nobody is removed: every answer below ends with the invader bewildered, and either walking on or trudging home.

| | Sand: a wide, short blast | Mud: a ball that sticks | Stone: a heavy knock |
| --- | --- | --- | --- |
| **Raider ant** | Buried to the feelers. It digs itself out and goes home. | Rolled up in the ball with its feet sticking out. Stays there until the workers unstick it. | Rolled flat like pastry. It peels itself off the floor and goes home. |
| **Beetle** | Rattles off its shell. It stops a moment and walks on. | Splat over both eyes. It stops, turns round, and walks out blind the way it came. | Knocked onto its back, legs waving. It rocks itself upright and comes on; after a second knock while it is on its back it gives up and goes home. |
| **Fly** | Blown back the length of the hall, tumbling. It shakes its head and comes again. | Wings gummed. It hangs where it is, sticky, for a while, and then goes home sulking. | Steps aside in the air, watches the stone go by, and flies on. |
| **Dung beetle with its ball** | The sand sticks to the ball, which is now a size bigger and needs a wider way. | The ball sticks to the floor. The beetle heaves, gives up on it and walks on as a plain beetle. | The ball is knocked back up the hall and its beetle with it, onto its back. From the foot of the shaft the ball rolls out of the mouth, and that beetle is home. |
| **Dung fly** | Blown back, tumbling, its twig in the air. It comes again. | Wings gummed, down it comes, and the army loses its way. | Steps aside in the air without looking. |

Outside a raid a loaded machine fires at a tap all the same: the lump flies, lands, and lies where it landed.

## The scenes

Every scene is a list of timed beats on game time, filled in from the state of play, and any touch ends it at once with its outcome already in place.

| Scene | What causes it | Its beats, and what fills them in | What it saves when it starts |
| --- | --- | --- | --- |
| **The queen moves in** | The queen's room becomes another room, the first time included. A room that only grows is the same room. | Two workers lift her from where she was and carry her, complaining, by the way that is open to the new room, and she tries each end of its floor before she sits. Filled in by the two rooms and the way between them. About 6 seconds. While another scene plays she waits where she was, and is carried when it is over; the bell rung meanwhile shows her move first, and calls the party at the next ring. After a put-away she is found in her room. | Nothing: where she lives follows from the saved ground. |
| **The shrug** | The bell is rung with no chamber in the kingdom. | The party walks to the mouth, looks down it, looks at each other, shrugs each in its own way and walks back. About 5 seconds. | Nothing. |
| **A first showing of a kind** | A party with a kind not yet shown takes its place at the log. | That kind is caught out by its own habit at the front of the camp, once, large: the ant tugging at its stuck foot, the beetle rocking on its back, the fly dazed with a bump on its head, the dung beetle heaving and then scratching its head, the dung fly pointing its twig and then folding its arms because nobody comes. About 5 seconds each. | The kind's mark in `shown`, when the showing itself starts. |
| **A machine arrives** | The party of `the-catapult` or `the-cannon` takes its place at the log. | Two workers lower the machine down the mouth and set it at the foot of the shaft, and it fires once, empty, to show that it works. About 7 seconds. | The machine's mark in `shown` and its entry in `machines`, when the showing itself starts. |
| **The put-back** | A raid is over. | Each invader still in the nest goes out by the way it came, a worker hauling it as far as the mouth. The workers carry each fallen lump back to where the child had built it, nearest the mouth first, the earth a dung ball dug away is back as they pass, and one stands by the place that gave. Filled in by what this raid knocked down. 4 to 10 seconds, shorter when little fell. | `position`, with `muster` and `ended` where they change, saved when the raid is judged, before this scene. The scene itself changes no saved field: the ground was never changed. |
| **The ending** | The great raid went well. | The army, carried out in the put-back, sits on its balls at the log. The dung fly sits at the foot of the hill beside a worker and wipes its eyes with a leaf. A glow-worm wakes in every chamber of the kingdom, nearest the mouth first, so the child's own plan lights up room by room. The queen puts her egg down at last. Dusk comes over the camp, and the dung beetles sit on their balls round a small glow. It opens with three soft notes going down, and is quiet after them. Filled in by the chambers as built. About 20 seconds, and it holds on its last beat as long as the child likes. | Nothing: `ended` and the position `open-kingdom` were saved when the great raid was judged, with the put-back that comes before it, so a game put away between the two is found finished and plays no ending on load (guide, ruling 12). |

- **Showings that are owed.** A first showing that follows a put-back on the same raid has its mark written when it starts, not when the raid is judged. Put away before it starts, nothing plays on load; it is still owed, and it starts at the child's first touch (guide, ruling 12, the near case).
- **No scene plays on load.** The game opens on the nest as built, the ant where it stood, the invaders at their camp and the next party at the log.
- **After the ending** the glow-worms stay lit in the chambers of the kingdom and the dung fly's wiping leaf hangs on a grass stalk at the camp. Both follow from `ended` and the saved ground. Nothing is counted, named or handed over.

### How a cycle ends, and how the next one starts

A raid ends by itself, and then nothing new starts. The next party is at the log, visible and waiting, each one holding its want in plain sight and fidgeting in its own way; it never hurries the child, complains of waiting or refers to the child leaving or coming back. It comes when the bell is rung. Building has no cycle: it is open play in a kingdom that is found as it was left.

### Found as left

Put away at any instant: the ground is saved as it will come to rest; a lump in the jaws is back in the cell it came from; a raid is over without being judged, with the invaders at their camp and the nest as built; the marks where a wall gave are gone; no scene replays. All time in the game is attended game time, and no wall clock is read.

### What a frame costs

- **What counts as a draw.** One call that puts pixels on the visible canvas: a stamp of a cached image (the ground sheet, the setting, the glass, a creature's part) or one filled or stroked path. Painting a cell into the cached ground sheet is counted apart, as a repaint.
- **The budget.** At most 80 draws in any frame, and at most 24 cell repaints in a frame; a larger change to the ground is spread over the following frames, nearest the finger first. The whole grid is never repainted in a frame. The budget for the game's own work is 8 ms a frame at six times CPU throttle.
- A test counts the draws of the fullest frame of the toy, of a raid with every kind on screen, and of the great raid.

## The look

**Ant farm behind glass**, the first look reserved for this game in the ledger of `docs/art-direction.md`. Spiked in run 1 on the game's real scene; the lead looked at its stills and the look stands. The second reserved look was not spiked.

**What it is.** A slab of real ground seen straight on, pressed between two panes in a wooden frame, in full colour: a strip of sky, grass and camp on top, the earth below in three wavy strata that darken with depth, and the glass itself in the picture. The creatures are chunky, glossy insects in flat colour with one hard highlight and large eyes. No raking light, no pen line, no hatching, no bare paper.

**Palette** (`view/palette.ts` holds every colour; `view/palette.test.ts` holds the materials and the two ant peoples apart).

| Thing | Colour | Why |
| --- | --- | --- |
| Earth | Three browns, lighter at the top, with a few fixed specks a cell and fine roots under the turf | It is ground and not a panel, and stays lower in contrast than anything that can be carried. |
| Open ground | Near-black brown, with a roof's shadow and round corners where two firm sides meet | A tunnel reads as a hole at a glance, and a creature in it stands out. |
| Sand | One flat pale yellow, with a few grains | The lightest thing in the ground, and the only one that is warm and full of colour. |
| Mud | One flat greyed brown (`#5d4b4c`), with a paler lip along a free top that sags, a drip under a free foot and one long pale glint | It lies between the earth and the dark of a tunnel in lightness, and is grey where both are brown. A test holds it apart from the dark of a tunnel (`#24150e`, `#1c100b`) by at least the margin it holds sand apart from the earth, so a mud wall inside a tunnel is read by its body and not only by its lip. What says it is wet is small, and the cell stays plain. |
| Stone | One flat cool grey, a rounded boulder a cell, with one highlight | The only cool, light thing in the ground. The three are far apart in lightness and each leans its own way, and they carry nothing else (pack: game-design, working-objects-stay-plain.md). |
| The kingdom | Honey-gold, round and soft | The child's ant, the queen and the workers are one family, told from a raider by colour and by outline both, at a quarter of their size. |
| The child's ant | The brightest gold, larger than a worker, with a blue kerchief in every pose | It is the one thing in the nest that is blue. |
| The raider ants | Crimson, low and pointed, in grey helmets and dark masks | Theirs, at a glance. |
| The other invaders | Blue (beetles), teal (flies), purple (dung beetles), gold-green with goggles (the dung fly) | Each kind is one hue, so a party is read from across the room. |
| The two machines | A fresh leaf green (`#86d64a`) that nothing else under the grass has, with darker green wheels and cream bindings: a catapult with a thick springy arm and a deep leaf bowl, a cannon that is one fat reed barrel with a flared mouth. Each fills its place of two cells by two | The two things the child who designed the game asked for by name are found at a glance: a test holds their hue forty degrees and more from every creature, every lump and every earth, and well lighter than the dark of a tunnel. The load is the lump itself, in its own colour, heaped in the bowl or bulging out of the mouth, over a third of the machine across: a pale heap of sand, a dark wet lump of mud with its lip and glint, a grey boulder. |
| The rooms' things | Small, dim and brown on the back wall: a heap of seeds and a twig shelf, a leaf bed and a seed-husk lantern, a pebble table with an acorn-cup bowl and a line of washing, two a room | They say somebody lives here, and stay lower in contrast than any creature or lump in front of them. The lantern's glow-worm is asleep until the kingdom's story has ended. |
| Shots and marks | Pale dust, the lump's own colour, and cream streaks | A wide fan of sand, a ball of mud with drops behind it, a boulder with three unequal streaks, each about a cell across and trailing a cell and a half; smoke at the cannon's mouth and pale puffs flung off the catapult's arm as it lets go; a puff where a shot lands, a splat where mud hit; a pale scuff and a track of footprints on the floor where a wall gave. |
| The ending's two marks | A glow-worm awake in its seed-husk lantern in every chamber, and one pale leaf pegged on a grass stalk under the edge of the toadstool | Small, and in the world: nothing is counted or named. During the ending dusk is one wash of evening blue over the camp, a lighter one over the ground, and one small warm glow on the grass. |
| Wood, sky, grass | Honey wood, a pale blue sky, two greens | The frame and the camp hold the texture and the comedy. |

**Materials and light.** Everything is flat fill. Gloss is one crisp white shape on each rounded part of a creature, on a stone, on mud and on the dewdrop. There is no light source in the ground: depth is the stratum's colour. The glass has two slanting bands of sheen, a few fine scratches, a thumb smudge low on the right, and the frame's shadow along its top and left.

**How it is drawn.** Three layers, each a canvas of its own. What stands still (the wood, the setting, the bell's stalk, the ground as a sheet painted cell by cell, the hill) is painted at load and on a resize; after that only the cells that changed, with the eight round each, are repainted, at most 24 a frame, nearest the finger first, and the hill when it has grown. What moves is the middle layer: a frame clears it and draws a list of things (`view/display.ts`), one stamp a creature from a sprite painted once a pose at load, one stamp a machine, a thing on a wall or an effect from a cache filled at load, a carried lump, crumbs as one draw a colour, the bell's drop. The glass is the third layer, painted once. In a raid the ground that is shown is the raid's own copy, and the cells that differ from the nest as built are repainted like any other change, and painted back as the workers carry each lump home. Tests count the list's draws on the fullest frame against the budget of 80: 51 for the toy at its fullest, 48 for a raid of the largest party before the great one in a kingdom of eight rooms with both machines firing, and 52 for the great raid there.

**Motion** (`motion.ts`). Nothing in the ground moves by itself except by the ground's own rules, one cell a step, and the materials have no idle motion. Every creature has a row of its own, with its own shape, tempo and weight, and a test holds every row apart from every other:

| Who | What it is busy with |
| --- | --- |
| The child's ant | Quick and light: a twitch of the feelers; it scuttles in two frames, turns to the finger as it lands, sits back to look when the finger lets go, and sits small where the row is too short for it. It taps a stone it passes with empty jaws and shakes when its jaws ring on one. It carries sand as a heap on its head that leaks grains, mud hanging from its jaws in a drip that stretches and snaps back, and drags a stone behind it, leaning into it and slower. On the idle ladder it looks out and then scratches at the earth that glints. |
| The queen | A long breath that widens her, and a squirm now and then. A guest that does its act in her room gets her brows, her lean and her pointing arm for as long as it is at it. When she comes to live in another room two workers carry her there, tipped back and kicking, and she tries each end of the floor before she sits. |
| A worker | A short double shrug, as if muttering. The one on the hill catches each mouthful of spoil at the mouth and trots it up. In a raid the workers stand behind the queen; after it they carry each lump back over their heads. |
| A raider ant | Tugs at its stuck foot: a sharp pull up, a slow sag back. |
| A beetle | On its back it rocks like a bowl, late and dignified, legs waving. |
| A fly | Rubs its hands very fast, stops dead, starts again. |
| A dung beetle | Careful little circles of its rag on the ball, then a step back to look. |
| The dung fly | Holds still and points; now and then one stiff tap of its twig. |

In a raid every state of every kind has a pose of its own (`view/raidShow.ts`, held to the painters' list by a test). A raider ant scuttles in two frames, climbs a face on end, tugs at a foot in the mud, lies down in the room and then naps; hit by sand it is buried to the helmet, by mud it is a ball with feet, by a stone it is flat. A beetle lumbers, falls with its legs out, leans and strains at a wall, eats and then burps; a stone puts it on its back, mud blinds it. A fly darts in two frames, peers into a way too low for it, tastes with its feet and then with one foot; sand tumbles it, mud gums it, a stone it dodges. A dung beetle walks behind its ball, where the ball has just been: round a corner after it, and on end down a shaft; it heaves at a ball that is jammed, scratches its head when the army has lost its way, and sits down against the ball when it gives up. The dung fly hovers a cell over the floor and conducts with its twig; mud brings it down with its arms folded.

**Who is where in a raid.** One invader is in a chamber at a time. Another that comes to its door waits there, and those behind it wait a body's length apart, back up the shaft and on the grass at the mouth, each with the fidget its kind has at the camp: the ant hugs its pillow, the beetle tucks in its napkin, the fly rubs its hands, the dung beetle polishes its ball. While a raid runs the workers stand behind the queen and look out either side of her, and the floor is the visitor's. Whoever is drawn later lies over whoever is drawn earlier, and one whose face would lie under somebody ducks until that one has gone by, in its own way, with no eye showing: the raider pulls its helmet down, the beetles pull their heads in under their shells, the flies clap their hands over their eyes. A test plays every party of the order on three grounds and holds that no face is ever under anybody, that whoever does its act does it in the open and clear of the queen and the workers, and that no two who wait stand in each other. One that cannot climb home (a beetle below a drop, a raider ant that let go and dropped in) sits where its climb would begin, a body's length from the next, and at the put-back a worker goes a little ahead of each as it is hauled out.

**The party at the log** (`camp.ts`). Nobody of it covers anybody: the beetles stand side by side on the grass from the mouth end, a dung beetle on its own ball; a raider ant rides a beetle's back while there are backs, and the rest stand behind; a flier hovers over one of them. A party too long for the grass between the mouth and the frame stands a little smaller, all of it alike, and never under seven tenths. The camp's overlap test holds for every party the order lays out.

**In the ground.** A stone that is shoved rolls on by itself, a cell at a time and faster than a beetle walks, until sand, mud, another stone or the ground stops it. A shot that meets the ground is answered by what it met: a fan of grains off sand, drops off mud, sparks off a stone. Roots hang from the turf into a tunnel dug right under it and swing when a mouthful is dug near them.

**A creature is in one place.** One whose kind is in the party at the log is in that party, and its own spot at the camp is empty while it is away; the one a first showing shows is one of the party, stepped out. A test holds that nobody is drawn twice in any frame.

**No shape stands for a sign.** Where two strokes would cross, or two bars lie one over the other, or a ring stands empty, the thing is drawn another way: the unlit fire is one stub of a log in its ring of pebbles, the washing is three plain cloths, the dung fly folds one forearm over the other fist, its goggles hold their glass when they are pushed up, the lantern's husk has a rib at each side and none down the middle, the idle glint is one round patch of light, and the bedrock has two chips of two sizes in each cell, never one over the other. The log's cut end has its heartwood filled in, the place where a carried lump or a machine would come down is a soft pale patch and not an outline, the raider's pillow has one broad stripe and a patch, and the catapult's twang is puffs, not arcs.

A poke is answered when the finger lands, with a squash and then a hop by the creature's weight, each kind in two ways taken in turn. The bell is a damped swing, and the whole camp looks up when it rings. A stone that lands is felt at the camp; a mouthful dug just under a camper is felt by that camper.

**The tiers** (`config.ts`). A tier sets the pixel ratio of all three layers and nothing else, so the lowest tier is the same picture with softer edges.

**The registry row**, for the lead to add to section 3 of `docs/art-direction.md` (a request: no builder edits that file in a wave):

| Game | Style | Art guide |
| --- | --- | --- |
| Mierennest | Ant farm behind glass, 2D: a slab of ground seen straight on between two panes in a wooden frame, in full colour, with flat sand, mud and stone in earth that darkens with depth, a camp along the grass on top, the sheen and scratches of the glass in the picture, and chunky glossy insects in flat colour with one hard highlight | [`games/mierennest/ART.md`](../games/mierennest/ART.md) |
