<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

Block Castle in one paragraph: the child feels a plain block become the tower it was pretending to be. The finger carries blocks from a basket onto a rug, each lands with a knock on whatever is under it and stays, and nothing ever topples. Ringing a brass bell draws the evening down, and the pile turns, in exactly its own shape, into a lit castle that three toy folk use by fixed taste. Ringing again brings back the afternoon and the blocks as they lay. It has no learning goal.

## The band and its age rule

The manifest band is 3 to 7, so age 3 governs the design.

- **The cue table.** The row for 3 to 4 in `docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md`. Its cues are the ones used: a ghost hand showing one move, a breathing glow on what can be touched now, characters who gaze and reach, and a material that corrects itself (a block that cannot stay somewhere slides to where it can). Its "Avoid" column is a hard constraint: no text, numeral or pictorial icon to decode, no spoken instruction, no verdict, never several activities live at once, and no tool on screen before it means anything. One activity is live at a time: by day the blocks, in the evening the castle.
- **The pack's age rules.** At 3 the rule for ages 2 to 4 holds (pack: game-design, ages-2-to-4.md): everything essential works with a tap, a drag is forgiving, targets are about 100 logical pixels and none that is essential sits in the bottom strip, and there is no pinch, tilt, shake or double tap. So a tap on a block in the basket sends it out onto the rug by itself, and a block let go anywhere lands somewhere. The basket shows each of its six kinds in a place of its own about 100 logical pixels across, and the bell is as large. The basket, the bell and all three rows of the rug lie above the bottom strip, and neither the bell nor the top of the tallest pile the frame shows reaches under the jam's round 48 px home control at the top centre, 10 px from the top. From 4 the rule for ages 4 to 6 holds as well (pack: game-design, ages-4-to-6.md): the game supplies a place, props and characters who react, and the child supplies the plot.
- **The symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, optional or not. The game has no `symbols.ts`. Faces, flags and windows are drawn so that none reads as a letter, a numeral or a sign.
- **What `ctx.childAge` sets.** Only what already lies on the rug on a first visit. It is a default and never a gate: all eighteen blocks of all six kinds are in reach at every age, and a saved rug always wins over the age.

| `ctx.childAge` | On the rug at a first visit |
| --- | --- |
| 3 and younger | A cube with a round one standing on it, so a stack is already there to add to and to ring the bell over |
| 4 or 5 | One cube |
| 6 and older | Nothing: the rug is bare |
| `null` | As for 3 and younger |

The ghost hand taps once when it shows a tap (`TAP_PRESSES` is 1 for a band that starts below 4).

## The toy

The one action the finger performs most is carrying a block out of the basket and setting it down.

- **On touch-down** the block under the finger comes up into the hand in the same frame: it stretches a little, lifts clear of its neighbours and gives its own short lift sound. The three folk snap their eyes to it.
- **While it is carried** it hangs a little above the point the finger touches, so the finger never hides it, over the place it would land, leaning back against the way it moves, and its shadow lies on that landing place, so the child sees where it will go before letting go. A slope turns round with a soft whup when it crosses the middle of the rug, since a slope always runs down toward the nearer side.
- **On letting go** it drops the short way that is left and lands with a knock on whatever is under it: a muffled knock on wool, a bright one on wood. Each kind has its own knock, and the knock is a step higher for every level it lands on, so a tower plays a scale as it grows. It squashes and settles in its kind's own way (the grid's first two columns), wool dust puffs up, the blocks beside it hop a hair, and each of the folk flinches in its own way. The drop is taken at the lift, with no wait, so the knock falls inside the touch.
- **It stays.** Nothing topples, whatever hangs in the air. A block set where it cannot stay (on a slope, on the tip of a thin one, or on a pile already four and a half blocks high, which is as high as the frame shows) slides or glances off to the nearest place that holds it and knocks there.
- **A tap is enough.** A block tapped in the basket hops out in an arc and lands on the free place nearest the last block set down, or in the middle of a bare rug.

In an empty scene this is a pleasure with no goal because every block has a voice and a way of landing, because the pile only ever grows the way the child put it, and because the pitch climbing with the stack makes a taller tower a different tune. Random tapping fills the rug with knocks and never gives a wrong sound or a refusal. Someone watching sees within three seconds that a child is carrying blocks out of a basket and stacking them.

## The object-by-action grid, and what is new on day 15

Six kinds of block, three of each, eighteen in all. All are raw branch wood and none has a face. Sizes are in rug places (one place is one square of the rug's hidden grid, seven across and three deep) and in half levels of height.

| Kind | What it is | Covers | Height | Can another block rest on it |
| --- | --- | --- | --- | --- |
| long | a plank split from a branch, bark on its two long edges | three places in a row | 1 | yes |
| arch | a thick slab with a half-round hole sawn through | two places | 3 | yes |
| round | a length of thick branch standing on end | one place | 3 | yes |
| thin | a straight stick standing on end | one place | 4 | no: its tip holds nothing |
| cube | a squared chunk, bark on two sides | one place | 2 | yes |
| slope | a wedge sawn across a branch | two places | 2 at its heel, down to the rug at its toe | no: its face holds nothing |

The grid. Every cell has its own motion and its own sound; the words in italics are the sounds.

| Kind | Set on the rug | Set on another block | Pressed, tapped or pulled from under | The bell: what it becomes | Tapped in the evening |
| --- | --- | --- | --- | --- | --- |
| long | Comes down one end first and the other after it, with a puff of wool dust at each end: two low knocks, *clack-clock*. | Lies across whatever is highest under it and stays, even with two places in the air. With air under it, it *rings* on like the bar of a xylophone. | Lifts one end first, like a see-saw: a low *whup*. Pulled from under, the blocks on it drop in a row from left to right: a run of knocks. | A bridge: boards and rope rails unroll along it with a *rattle*. | The king or the cook, whichever is nearer and has a clear way that stays in the frame, crosses it, *trip-trap* on hollow boards. An end in the air is a springboard: it dips under whoever lands on it and throws him up with a *boing*. Set down on such an end he is bounced there and then crosses; at a far end in the air he is bounced and steps back. A board with a block standing on it does not bend. Where neither has a clear way the boards only shake and the ropes sway. |
| arch | Lands on its two feet and rocks from one to the other: a hollow *tonk-tonk*, the second softer. | Straddles what is under it. The knock comes back out of its hole a moment later: *tonk* and its echo. | Comes up like a cork: a hollow *pop*. Pulled from under, the two things on it knock down one after the other. | A gate: a grille drops in its hole, *clack-clack-clack*, and a lantern lights on each side. | The grille *ratchets* up and falls shut with a *clunk*. A dragon lying under it pulls his head back in under his first scales before it lands, and his yawn under a gate is small. |
| round | The deepest knock, *tock*, then it turns a quarter on its end so its rings come round, with a short *rumble*. | Round on round makes a taller trunk: *tock*, a step higher each time, so a tower climbs a scale. | Lifts with a twist: a short *thrum*. Pulled from the foot of a tower, the tower comes down a level, bottom block first: a scale run downward. | A tower: a pointed roof opens out of its top like an umbrella, a rising *fwoop* and a *pop*. With a block standing on it, it gets a ring of battlements instead, *tk-tk-tk*. | Its roof lifts like a lid with a *creak*, and the king or the cook, whichever is nearer and has room to stand in the tower, is set in it under the lifted roof, looks out from under it and makes his own noise; the roof waits over his head and comes down when he has gone. Tapped while it is up, the roof is touched where it is drawn: it bobs higher with its *creak*, never down on him, and where it stood is not touched. The dragon never goes, and where neither has room the roof only lifts and comes down. Where the king sits on that roof it sags under him and springs back instead, and he makes his noise where he sits. Battlements only duck and come up again. |
| thin | A *tick*, and it sways like a reed with three fainter ticks. | Stands on a block like a candle and sways: the highest *tick* in the set. | Plucked: a *twang* that rises and falls. Nothing ever rests on it. | A flag pole: a flag unrolls from its tip and *snaps* twice in the wind. | The flag runs down and up again on a *squeaking* pulley and comes up in the next of three colours. |
| cube | Stops dead, squashes and springs back: one dry *knock*. | The same dry *knock*, a step higher for each level. | The plainest lift: *tup*. Pulled from under, what stood on it drops straight down with its own knock. | A room: two shutters fly open with a *clap* and a light comes on behind the window with a soft *pim*. | The light goes out and comes on: *click*. If the cook is in, his spoon *clangs* on his pot. |
| slope | Lands heel first and its toe slaps down after: *tok-slap*. | Sits with its heel on the highest place under it; its toe comes down on air and nods with a small *creak*. Pointed at a lone block, the place under the finger is its heel. A slope cannot stay on its toe alone: in the outermost column at either end of the rug, where the block under the finger could only be under its toe, it touches the block and comes down on the rug beside it, and one left on its toe when the block under its heel is pulled out hops to where it can stay. | Scrapes up: *shff*. Nothing ever rests on it. | A slide: its face shines up with a rising *zip* and a little ladder drops at its heel. | The king or the cook, whichever is nearer and has a clear way that stays in the frame, climbs up and slides down with a falling *wheee*: a *bump* on the rug, a *splash* in the moat, or straight onto the next slide. Where neither has a clear way the face of the slide only shines up again. |

The wrong use of each kind works, and is the funnier one:

- **long**: set with one end on a tower it sticks out into the air. In the evening it is a springboard, and whoever walks it is bounced.
- **arch**: set up on a stack it is a gate in the air. The dragon still goes to sleep under it, with his tail hanging down the wall.
- **round**: with nothing higher on the rug, the king takes its roof point for his seat and sits on the very tip, wobbling.
- **thin**: set where nothing is higher, the pole is the highest seat. The king is set on its very tip, above the flag, and wobbles there.
- **cube**: a cube high up is still a room. The cook, who takes the lowest one there is, climbs to it with his eyes shut and his pot on his head. Beside a room up high he sticks out over whatever is lower, wedged by the crown of his cap in its window, as a block set in the air stays. Where neither side of the lowest room will do he takes the next room up, and he stays on his stool only where no room has a side that will do. A side will not do where blocks beside the room stand higher than its foot, where he would lie off the edge of the rug, where his pot would be in a block or under one, where he would be under or over the king, or where he would hide a thing of the castle that answers a tap.
- **slope**: by day a block set on it zips down its face and knocks at its foot. In the evening a slide that ends on another slide runs straight on down it.
- **any block set on the tip of a thin one**, or on a pile that already reaches the top of the frame, glances off with a *tink* and lands beside it.

By day, in every column, the knock of a block is one step of a five-note scale higher for every level it lands on, as the toy says, and three variants of each knock are drawn from the game's own seeded stream, so no two landings sound quite alike.

**On day 15** the child builds for a result. What each of the folk does comes from which kinds touch which, so a child who has learned that the king takes the highest seat and any slide he can reach sets a slope on the highest round one at the edge of the rug, and the king slides off the top tower into the moat. On day 1 the same child piled blocks and watched what came.

## The representation

The game has no learning goal, so there is no school idea to represent and no order of object, picture and symbol.

## The four mechanic questions

The game has no learning goal, so the four questions about a school skill are not asked of it.

## The error as a consequence

Open pretend play has no wrong castle, so there is no wrong attempt in the sense of a task. Two things take the place of an error, and both are shown by the world.

- **A block that cannot stay where it was set** shows why: it slides down the slope it was set on, or glances off the tip of the thin one, and comes to rest beside it where the child can see it. It is never refused, never lost and never sent back to the basket.
- **A castle that lacks something** shows what, through the folk. With no arch on the rug there is no door, and the king and the cook go in through a window (each is set on a room with a squeeze and then in his place, or straight in his place where the rug has no room), while the dragon, with no gate to lie under, tries a bridge with air under it and failing that stays where he lies by day. With no room the cook cooks in the open. With nothing high the king sits on whatever there is, the dragon if need be. Where every highest seat would have him hide a thing the child can tap, he stays at his place by the rug, and the moat stops short of him. Each of these is a small joke about the castle, never about the child, and none is a verdict.

The state stays. The child rings back the afternoon, moves one block, and rings again.

## The designed order, and what is stored

**No ladder of challenges.** Nothing is locked and nothing arrives by amount of play: every kind is in the basket from the first frame. The order in which things show themselves is the order of the play itself, one thing at a time: first carrying and knocking, which the idle hand shows by moving one block; then the bell, which the idle hand shows only once something stands on the rug; then, in the evening, the bell again; and once the castle has been seen and the afternoon is back, the basket, which glows while the idle hand shows it pulled over by its wicker. A harder castle looks harder in the world, since it is taller and has more kinds in it, and the child chooses it.

**Positions.** The designed order has one place, with the stable id `open`. It is the only id in `LADDER` in `config.ts`, it never moves, and nothing on screen shows it. No cycle is judged, so nothing goes well or badly.

**The saved state**, every field:

| Field | What it holds |
| --- | --- |
| `v` | The version of the record, 1. |
| `position` | Always `open`. |
| `finished` | `true` while it is evening and the castle stands; `false` in the afternoon. |
| `blocks` | The blocks on the rug, in the order they were set down, at most eighteen. Each is its kind, its column (0 to 6, the leftmost place it covers) and its row (0 to 2). A block that is not in the list is in the basket, in its kind's place there. |

Nothing else is stored. A block in the hand is never saved in the air: until it is let go, `blocks` holds it where it was lifted from (out of the list for one from the basket, at its place in the list for one from the rug). A put-away under a finger that is still dragging ends the drag and the block is found there, with whatever stood on it standing on it again, since levels are worked out from the list. A block's level is not stored: it is worked out again from the list in its order, so a damaged record can never put a block in the air or inside another. The way a slope faces follows from its column. Where each of the folk stands in the evening, what each thing has become, and which block the idle hand would show follow from `blocks` and `finished`. What a tap in the evening changes (a flag's colour, a light put out, a king who has slid into the moat) is short-lived: it is a view, it is not stored, and on load the evening castle stands in its first state with the folk in their places. A game that was put away and is opened again without a load is settled in the same way when it wakes: the flags in their first colour, the lights on, and each of the folk in his place, a trip that was under way not resumed.

Read defensively: a record that is not this game's, or of a later version, gives a fresh state for the child's age. Inside a record each field is repaired by itself. A block with an unknown kind, a place off the rug, or one more of a kind than the basket holds is dropped and the rest are kept.

Size: the largest legal state, eighteen blocks in the evening, is well under one kilobyte, and a test holds it under half of the 64 KB cap.

No customer waits on screen, so no position lays one out.

## The characters and their fixed tastes

Three toy folk made of things from under the trees, each large in the frame and each with a face: eyes with lids, which follow the finger and the block in the hand, and for the king and the cook brows and a mouth with several shapes. The dragon has eyes and lids only. They sit round the rug by day, off its twenty-one places and clear of the basket and the bell, and no pile grows over the bell. They stay the size they are in the evening, which is too big for anything a child builds, and that is the standing joke: the cook lies beside his room with the crown of his cap in at its window.

| | The king | The cook | The dragon |
| --- | --- | --- | --- |
| Made of | a fat conker with twig arms and a crown of spiky husk that is too big for him | an acorn whose cup is his cap | a long pine cone with a smaller cone for a head and two winged seeds for ears |
| His one want, always shown | the highest seat: he holds his cushion up over his head with both arms and looks at the highest top on the rug, or at the empty air over a bare rug | the lowest room: he holds out his pot with the spoon in it and looks at the lowest cube on the rug, or at the cubes in the basket | an arch to sleep under: he hugs his pillow and yawns toward the nearest arch, on the rug or in the basket |
| Likes | the highest top of any kind, a slide leading off it, a flag near him | a room standing on the rug itself, and something built over it | any arch, most of all a gate that shuts on him like a blanket |
| Dislikes | water: out of the moat he comes dripping and shakes like a dog | heights: to a room up high he climbs with his eyes shut and his pot on his head | feet overhead: under a bridge someone crosses he puffs one smoke ring |
| With nothing to his taste | he sits on whatever is highest, the dragon if the rug is bare; where every highest seat would have him hide a thing the child can tap, he stays at his place by the rug and the moat stops short of him | he cooks in the open and frowns into his pot | he tries a bridge with air under it, and failing that stays where he lies by day |
| Tempo and weight | slow and heavy, pompous; he rocks on his round base | quick and light; he bounces on his point | slowest of all; he breathes like bellows |
| Funniest part | the crown, which drops over his eyes at the knock of a block set down and has to be pushed up; a landing that is to his taste makes him stretch up and beam instead, and a block that only drops a level when one is pulled from under it stirs nobody | the cap, which pops off his head when he is startled and lands back askew | his scales, which ruffle open in a wave from nose to tail |

By day their reactions are to the exact block the child set down: the king stretches up tall when a landing makes a new highest top, the cook stirs when a cube lands lower than any before, the dragon yawns wide at a new arch. A poke on any of them gets that one's own answer and voice (a low *hrmph*, a *squeak* and a clang, a long *yawn*).

Their feelings are about the castle and each other, never about the child. None of them thanks, praises, pleads or hurries, and none refers to the child leaving, staying or coming back. In the evening they act in a fixed order (the king, the cook, the dragon), and the king and the cook go in by the door or, with no arch standing on the rug, through a window, while the dragon is laid straight in his place. They are toys moved by a hand, so by the door means set on top of the gate, which answers, and then set in his place; through a window means set on a room, with a squeeze and a *pop*, and then set in his place. One of them is set straight in his place where the other is in that spot, where it would lift him much higher than the straight way, and where the rug has neither an arch nor a room. Where one of them comes to rest he leaves in view, at least 48 px across, the part of each castle thing that answers a tap (the roof, the flag, the window, the grille, the boards, the face of the slide). A tap on him is his own poke and is never taken for the thing behind him, and an overlap test holds this for every pile the tests build, at each surface size the game is tested at.

## The scenes

Three scenes, each a list of timed beats on attended game time, each ended at once by any touch, which is then an ordinary touch. Each saves its outcome when it starts, so a put-away in the middle loses nothing and nothing replays on load.

**Evening falls.** Cause: the bell is rung in the afternoon. About eight seconds.

1. The bell swings and rings, and the sun through the window sinks: the patch of sun on the rug fades and the light turns from gold to blue.
2. The blocks become what they were pretending to be, from the rug upward in the order they were set down, each with the motion and sound of its cell in the grid's fourth column, and each in colour for the first time. The floor round the rug darkens into the moat.
3. The folk go in by their fixed tastes, the king first, then the cook, then the dragon: the king and the cook by the door if there is one and through a window if not (set on top of the gate or on a room, then in his place; straight in his place where that spot is taken, would lift him much higher, or is not there), the dragon laid straight in his place.
4. The lit castle holds, with its flags moving and the folk breathing in their places.

Saved when it starts: `finished` becomes `true`. Nothing else changes. Filled in from the state of play: which thing each block becomes follows from its kind and from what touches it, the order follows `blocks`, and where each of the folk goes follows from the rule of his taste applied to this pile. A touch during the scene jumps it to its last beat. On load in the evening the castle is simply there.

**The afternoon returns.** Cause: the bell is rung in the evening. About four seconds.

1. The bell rings, the folk hop back to their places round the rug.
2. The castle turns back into blocks from the top down, each with a knock, and the moat is floor again.
3. The sun comes back onto the rug.

Saved when it starts: `finished` becomes `false`. Nothing else changes; the blocks lie as they lay.

**Tidying.** Cause: the basket is tipped, by dragging its wicker side toward the rug, or by a tap on it once it is empty. In the afternoon only. Three to five seconds.

1. The basket tips onto its side with a creak, its mouth toward the pile.
2. The blocks that stand in the basket duck down into it, and the blocks of the rug hop in one at a time from the top of the pile down, each with its own knock in the wicker.
3. The basket rocks upright.

Saved when it starts: `blocks` becomes empty. Nothing else changes. With nothing on the rug a tipped basket only creaks and rocks, and saves nothing.

**What is not a scene.** Everything in the grid's first three columns and its fifth is a reaction of under four seconds that runs alongside the finger and blocks nothing. In the evening a drag on a castle thing gets the answer of its fifth column as a tap does, and a tap or a drag on the basket makes it creak and rock as it does when tipped with nothing on the rug; neither moves a block and neither saves anything. No scene plays before an action, and none plays only sometimes.

**How a cycle ends and how the next one starts.** This is open pretend play, so it has no ending that the game decides. The evening castle is the finished picture, and it stays for as long as the child likes: nothing new starts by itself, there is no countdown, and nobody waits to be served. The child begins again by an act in the scene, ringing the bell, and tidies away by tipping the basket. On load the world is as it was left, afternoon or evening, and no scene replays. Nothing in it depends on a clock or on how long or how often the child plays.

## The records

The game has no learning goal, so it has no records part and claims no school skill.

## The look

Written after the style spike, not part of the sheet. The look in use is the first one reserved for the game: **Bark-on branch blocks**. The spike passed on clarity (every kind is told from every other in the basket and on the rug at 1180 by 820) and on the frame budget (no shadow map, no post pass, and 56 to 61 draws a frame and about 23,400 triangles in the finished game with every effect on), so the second reserved look was not tried.

### What it is

A corner of a playroom floor late in the afternoon. The blocks are lengths of branch with the bark left on: dark furrowed bark where the outside of the branch was, pale sawn wood with rings and one crack where the saw went, hard edges, no paint, no stain and no bevel. They stand on a moss-green wool rug on plain floorboards, under low sun that comes in through the window in the back wall. The blocks are the plainest things in the frame. Everything round them is fuller: the wall with its window, curtain, shelf of pine cones and hanging bunches, the wicker basket, its lid on the floor with pine cones on it, leaves and acorn cups on the boards, a brass bell on a forked branch, and the three folk.

By day nothing in the room is brighter in colour than the rug and the bell. The colour of the game is kept for the evening.

It must not drift toward the sanded, stained beech of Kite Tower (no smooth faces, no colour on wood, no rounded edges) or toward the clay of Pebble Table (no soft thumbed forms on the blocks).

### The evening

The room turns blue and the castle is the one warm thing in it. A block never changes: it stays the bark and sawn wood it was, and what it has become is laid on it in flat colour, small and plain, like the trimmings of a toy castle.

| Block | What is laid on it |
| --- | --- |
| long | honey boards across its top and a pale rope slung along each side |
| arch | a dark iron grille in its hole and a lit lantern on each side |
| round | a pointed red roof, or pale battlements where a block stands on it |
| thin | a flag in one of three colours (ochre, blue, red) |
| cube | two green shutters and a lit window |
| slope | a pale polished face and a little ladder at its heel |

The floor round three sides of the rug becomes a moat of dark blue water with pale ripples, each an uneven curl with its crest off the middle and one end lower than the other, so none reads as a dash. Lit windows and lanterns each carry a soft glow, and one warm light falls on the blocks, as strong as there are lamps lit in the castle. The folk keep their own colours and sizes.

### Palette

| Part | Colours |
| --- | --- |
| Sawn wood | pale `#ecd5a8`, rings `#c79e66`, deep `#a57a48`, heart `#b98b58`, crack `#6f4f31` |
| Bark | base `#84654a`, dark `#4b3626`, light `#a58768`, lichen `#aeb394` |
| Rug | `#63803c`, dark `#4d6a31`, light `#7c9a4a`, stitches `#d9cfa4` |
| Floorboards | `#7a5536`, dark `#5b3d27`, gaps `#2f1f12` |
| Wall | plaster `#ead9b8`, shade `#d3bf9a`, panelling `#8f9a80` and `#76826a`, frames `#b08b5e` |
| Light by day | sun `#ffd48a` on the floor, `#ffd9a0` on things; shadows `#2a1d10` |
| Folk | conker `#74351b`, husk greens `#8f9645` and `#a3a653`, acorn `#c0904f` with cup `#7a573a`, pine cone `#7b5b3a`, `#86603f` and `#96744c`, linen `#fbf6ea` |
| Bell | brass `#e2ad3e`, clapper `#8d6a2c` |
| Castle | boards `#c08a4e` and `#a8743f`, rope `#e0c890`, iron `#3d4350`, roof `#c2513f`, battlements `#b9a888`, shutters `#4f807a`, polished face `#f6e7bd`, ladder `#8a623c` |
| Castle lights | window `#ffd98a`, lantern `#ffc45e`, put out `#4a4136`, the light they throw `#ffb65c` |
| Flags | `#d9a441`, `#3f7fb0`, `#c2513f` |
| Evening | light on things `#8ea4ff` and `#93a5e6`, the wall tinted by `#7483b4`, the floor by `#8189b8`, the sky outside by `#2b3a70`; moat `#243a63` and `#1a2c50` |

### Materials

- **Blocks.** One matte lit material for all eighteen, reading one painted atlas of four tiles: bark, sawn grain, end rings, and the arcs of a slab sawn across a trunk. One instanced mesh for each kind, six draws in all. No two blocks are quite one tone (a tint for each instance), and the round and thin ones are never turned quite alike.
- **The room.** The wall, the floor and what is seen through the window are painted once into textures and drawn unlit, with the shadows of what stands still painted in. In the evening the same paintings are tinted blue. The rug is lit, so the blocks and the rug take the same light.
- **The folk.** Low-polygon nuts and a cone with their colours in the vertices, lit matte and flat-shaded where a facet helps (the husk crown, the acorn cup). The dragon's body is ring after ring of woody scales with pale tips, each ring turned half a scale from the one before, so he reads as a pine cone before he reads as a creature. Large white eyes with dark pupils, lids and brows: the face reads at the size of a thumb. A lid of any of the three is a skin with a thickness, closed all round, that turns about the middle of its eye (`view/folkView.ts`, `lidSkin`; held in `drawn.test.ts`).
- **The basket.** Painted wicker on a simple flared box, drawn on both sides.
- **The castle's trimmings.** Plain boxes in flat matte colour, all in one instanced mesh, the roofs in a second and the lit parts in a third, unlit. The moat is one flat mesh with painted water.
- **The bell.** Turned brass with one highlight, hung from a forked twig on a round foot.

### Lighting

- One warm sun along the way the light travels from the window (down, to the child's right and toward the child), and one soft light from above that is cool from the ceiling and warm green from the rug.
- A patch of sun the shape of the window lies across the rug and the boards, added over them, with the shadows of leaves in it.
- Every block on the rug throws a shadow of its own shape: a soft-edged dark sheet as wide as the block, sheared along the sun's way from the height of its foot to the height of its top, so a block up on a pile throws its shadow farther off. The block in the hand lays its shadow on the place it will land. The folk on the floor have round shadows of their own. There is no shadow map and no post pass.
- In the evening the sun and the light from above turn blue and dim, the patch of sun and the leaf shadows fade, and one warm point light, high and on the child's side of the rug, lights the castle and whoever is lifted over it.

### Motion rules

- **Every kind lands like itself** (`motion.ts`, with a test that no two kinds share a landing): the long one comes down one end after the other, the arch rocks from foot to foot, the round one turns a quarter on its end, the thin one sways like a reed, the cube stops dead and squashes, the slope slaps its toe down, and set on a block nods its toe three times instead, with a creak and no slap. The second knock of a sound falls with the second movement.
- **A block comes up into the hand** with a stretch and its kind's own way of coming up (`motion.ts`, with a test): the long one one end first, the arch like a cork, the round one with a twist, the thin one plucked and shivering, the cube plainly, the slope toe last. It hangs above the finger's point, and leans back against the way it is carried.
- **Every landing is felt by the room**: wool dust on the rug (one ring round a block's foot, and for the long one a puff at each end, the second at its second knock; `dust.ts`), a hop in the blocks beside it, a rattle in the basket, and each of the folk startled in his own way.
- **The folk never share a motion** (`folk.ts`, with a test): the king is slow and heavy and rocks on his round base (and on the point of a roof or the tip of a pole wobbles round, three times as far), the cook is quick and bounces on his point and never stops stirring, the dragon is slowest and breathes like bellows. Each blinks at his own pace, follows the block in the hand, or a bare finger on the surface, with his eyes at his own speed, and has two small doings of his own when nothing happens.
- **Every thing of the castle arrives its own way and answers a tap its own way** (`view/eveningView.ts`): boards unroll and rattle (every long one has them: whole where nothing stands on it, and the two ends of each board sticking out from under a block that does; one of the folk coming down on them presses them still), a grille drops in three clacks and ratchets up, a roof opens like an umbrella and lifts like a lid, or sags under the king and springs back where he sits on it, a flag unrolls and runs down its pole, shutters clap and a light clicks, a slide's face shines and a gleam runs down it. A roof tapped where one of the folk has room goes straight up and waits just over the top of whatever the one set in the tower wears, the stalk of the cook's cap or the spikes of the king's crown, and comes down when he has gone (`evening.ts`, `lid`, with a test that the roof is never in anyone). An end of a bridge in the air dips under whoever lands on it and swings up at the boing: the block, its boards and its ropes turn as one about the edge of what holds the bridge up, and the one on it rides it down, tipped with it so his seat lies on it, and is thrown up (`bent`, `rides`, `leans`). A tap is taken from what is drawn: the whole flag, the rim of a roof, battlements, a slide's ladder and a gate's lanterns count as their thing (`castle.ts`, `tapBoxes`).
- **The folk travel as toys moved by a hand** (`troupe.ts`, `evening.ts`): lifted straight up, carried over everything on the way, set straight down, one at a time; trip-trap in small hops along a bridge, and down the face of a slide. The dragon pulls his head in before he is lifted and puts it out once he is down: back along the line he lies on, round its bend, never out through his side. On his pillow his chin sinks into it as he nods and yawns, and the pillow is pressed flat under his head. With his nose under a gate his jaw stays level on the ground and his head lifts only a little, and the grille that rests on it goes up with it; when the gate is tapped he pulls his head back in under his first rings before the grille lands, and it is up again before his nose comes out. A test holds every corner of his head clear of the iron, the arch and the ground (`gate.test.ts`). The cook, lying with his cap in at a window, is under the top of his room and of whatever is built over it: a hop draws him up short along the floor, so his cap comes back out of the window and goes in again, his cap pops off his head by a third of what it does standing, off a head drawn back by as much, he sways from side to side and never lifts his head, and his cap turns on his head where it would tip. Nothing he does sends his cap up or further in, and a test holds every corner of it out of the block over his room, for each of the six kinds, at every frame of the fast stir, of a startle and of a poke (`drawn.test.ts`). Beside a room up high he lies out over whatever is lower, wedged by his cap, with his pot out in front of him again and the spoon in it: it is on his head only while he is carried up. With something built over his room he grins and stirs fast when it is tapped. The king stretches up tall to a flag near him when it is tapped. In the afternoon the castle turns back into blocks only once the last of them has been lifted out of it. In the open he frowns into his pot all evening, brows down and stirring slowly. The king out of the moat throws small drops as he shakes. The dragon under a bridge puffs his smoke ring as the first foot lands on it. The king's cushion comes round in front of him to go under him, never through him, and stays under him for the whole evening. When the basket is tipped the blocks that stand in it duck down into it, and come up again once it is upright. The blocks of the rug go in one at a time from the top down, a big pile faster: each is lifted straight up over everything that still stands, crosses to the middle of the mouth turning, and drops in dwindling. A test plays every trip and every tidying on sixty-four piles and holds that nothing passes through a block, through another of the folk, or through another block on its way, and that each of the folk who is carried stays in the frame and clear of the home control.
- **The idle hand shows one move** (`play.ts`, `guide`): a block carried out, the bell tapped, the empty basket tapped, and, once the castle has been seen and the afternoon is back, the basket pulled over by its wicker, with the basket glowing. Poking the folk is never shown.
- **At rest the room is alive**: the branch at the window sways, the leaf shadows slide over the patch of sun, dust drifts down the beam, and in the evening the flags move and the water ripples.
- Everything runs on the seconds of play the clock hands out, in fixed steps, so the room is a still picture while the game is unattended.
- **A slope never stands on its toe alone** (`blocks.ts`: `slopeAt`, `hangingSlope`, `seated`; `play.ts`): the way it faces follows its column, so of the two places it could take under a finger it takes the one that puts its heel on the block pointed at. Where that cannot be (the outermost column at either end, where a block can only be under its toe) it is not held: it touches, and comes down on the rug beside the block. One left on its toe when the block under its heel is pulled out, or found so in an older saved rug, hops to where it can stay. So in the evening a ladder is always against a heel that is on something.
- **The cook's eyes are shut only on the way up** (`evening.ts`, `cookHigh`): climbing to a room up high he has them shut and his pot on his head; once he lies there they are open and the pot is out in front of him, and no tap, poke or later trip shuts them or puts the pot back.
- **A lifted roof is touched where it waits** (`evening.ts`, `lid`, `pick`): while it is up over a visitor a tap on it bobs it higher with its creak and it comes back, never lower than it was; the place it stood in is not touched until it is down again.
- **A scene ended by a touch is silent from that frame** (`sceneSound.ts`): the bell, the dusk and the dawn play through a gain of their own, which the press that ends the scene closes in about a hundredth of a second. `audio.ts` is as the template has it.
- **The grown-up corner is not the child's** (`corner.ts`): a touch that lands in the top right 72 px sends the game nothing from its press to its end, a drag out over the rug included, so it carries no block and the folk's eyes do not follow it.
- **Put away and found again is as loaded** (`play.ts`, `asLoaded`): on waking, the evening castle is in its first state (flags in their first colour, lights on) and each of the folk is in his place; a trip that was under way is not resumed. Nothing was added to the save for it.

### Tiers

Each tier of `config.ts` keeps the look and takes away only what drifts.

| Tier | Pixel ratio cap | Dust in the beam | Leaf shadows |
| --- | --- | --- | --- |
| 0 | 2 | 60 | moving |
| 1 | 1.5 | 40 | moving |
| 2 | 1.25 | 20 | moving |
| 3 | 1 | none | off |

The blocks, the folk, their shadows, the patch of sun, the castle with its lights and every answer to a touch are the same at every tier.

### The registry row

A request to the lead: this row for the claimed-styles registry in `docs/art-direction.md`.

| Game | Style | Art guide |
| --- | --- | --- |
| Block Castle | Bark-on branch blocks 3D: lengths of raw branch with furrowed bark and pale sawn ends, hard-edged and unpainted, on a moss-green wool rug in a full playroom corner under low window sun, with three large toy folk made of a conker, an acorn and a pine cone; in a blue evening the same blocks carry small flat-coloured castle trimmings (red roofs, flags, lit windows and lanterns) inside a painted moat | [`games/block-castle/ART.md`](../games/block-castle/ART.md) |
