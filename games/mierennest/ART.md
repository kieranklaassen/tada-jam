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
- **The cell size comes from two bounds, taken together.** The finger's mouthful is two cells across, 56 units, about the width of a fingertip on the smallest surface the jam serves, so a drag leaves a tunnel two cells high; and a creature that fits that tunnel must still be about a tenth of the frame wide or more. Insects are long and low, so both hold at 28: the child's ant is 112 units long and one cell high, a raider ant 118 long and one cell high, a beetle 124 long and two cells high, a fly 118 across its wings and two cells high, a dung ball 84 across (three cells) with its beetle behind it. A smaller cell makes the creatures smaller than a tenth; a larger one leaves too few cells to build with.
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

So one material alone is weak in its own way (sand is loose, a stone rolls, a little mud is light), and a combination is stronger than its parts: sand and mud, 4 against 1 and 3; mud and stone, 8 against 3 and 2.

### What a chamber is

The ground module recognises a chamber in what the child dug; nothing is placed from a menu.

- A **room** is open space that holds a clear block at least 4 cells wide and 3 cells high. All such blocks that overlap or touch along a side are one room. A tunnel two cells high is never a room, however long.
- A room is a **chamber of the kingdom** while air reaches it: there is a way of open cells from the mouth to the room, however narrow. A room walled off from the mouth goes dim and stale, the workers leave it, and it counts for nothing until it is opened again.
- The kingdom's growth, the number of workers and the moment an invader counts as inside all follow from this: an invader is **inside** when any part of it is in a cell of a chamber.

### Where the game is true and where it simplifies

True as far as it claims: dry sand does pour and come to rest at a slope, wet mud does hold a shape and stick, a stone does need bearing, and a lintel does carry a load across a gap. Simplified, and said here: the ground is cells, so a slope is one for one and nothing tips or wedges; there is no water, so mud never dries and sand never gets wet; packed earth never caves in; a lump has no size but a cell; and the holds in the table are the game's own numbers, chosen so that the order of strength is the true one. The invaders' habits are the game's fiction and claim nothing about real insects, except that insects are long and low.

**Standing.** This is a physical model shown as objects, with no symbol stage and no trial behind it as a way of teaching; none is claimed.

## The four mechanic questions

One sentence each for swap, attention, fun and guess.

## The error as a consequence

What a wrong attempt does in the world, where it shows, and that the state stays so the child changes one thing and tries again.

## The designed order, and what is stored

The order of challenges with one new thing at a time, the positions with their stable ids as they stand in `config.ts`, what a cycle that goes well or badly is, and every field of the saved state.

Where the next customer already waits on screen while the child works, say which customer a new position lays out: the position moves when a cycle is judged, and the one who waits was laid out before that, so the change shows on the customer after next.

## The characters and their fixed tastes

Each character's one visible want and the likes and dislikes that never change, or what gives the feedback in a game with no character.

## The scenes

Each short scene with what causes it, its beats, what it saves when it starts, what from the state of play fills it in and how it gives way to a touch, then how a cycle ends and how the next one starts.

## The records

One heading per jurisdiction, never one list or table that pairs them; a game with no learning goal has no records part.

### us-ca

The records the game is designed from, by pack id or official code, each with its standing and check state as the lookup prints them; the level with the basis the lookup prints; any lane label and any gap as printed; and the limits taken from each record's Limits. The pack's own Summary or the game's own words only, never the official wording.

### nl

The same four things for the Dutch records, with the regime of a core goal.

### Where the two differ

Each difference written as a difference, and which jurisdiction the game follows at that point.

### The claim

One sentence in the words of each record's standing saying what the game is designed from, with the state and reason for any record that is not confirmed, and no word about what a child has reached.

## The look

Written after the style spike, not part of the sheet: the claimed look, the palette, materials, lighting and motion rules, and how each tier in `config.ts` keeps the look.
