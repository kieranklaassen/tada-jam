<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

- **Band.** The manifest band is 4 to 6. Its youngest age, 4, governs every cue.
- **Cue-table row.** The row for 3 to 4 in the age-band cue table of wordless clarity. Its "Avoid" column binds the game: no text, numeral or pictorial icon that has to be decoded, no spoken instruction, no verdict, no second activity live beside the first, and no tool on screen before it means anything. One next act is offered at a time.
- **Pack rule for the range.** (pack: game-design, ages-4-to-6.md): a place, props and characters who react; tap and drag are the reliable gestures; sorting is within reach from about four; no reading and no double tap. Everything works with a single tap, and a drag survives a lifted finger.
- **Symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, optional or not, and the game has no `symbols.ts`. A category is shown by a creature's own body, never by a sign on it.
- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order: under 5, or no age, at `two-colours`; 5 at `colours-among-kinds`; 6 and over at `colours-then-kinds`. A saved position wins over the age, every position is reached by play from any start, and nothing is locked or hidden by age.
- **`null`.** Starts at `two-colours`, the youngest default. The top and bottom defaults are open-ended: a younger child gets the first row and an older one the last.

## The toy

**The action the finger performs most: put the claw somewhere and let it drop.** The claw hangs on a cable from a trolley that runs on a brick gantry over the whole pit. A finger on the glass pulls the trolley to the point under it; lifting the finger lets the claw fall. A single tap does both: the trolley runs to the tap and drops when it gets there. The claw always closes on what it lands on, and what it holds goes wherever the next drop is made.

In an empty scene (a stud tray, a few plain brick toys, no creature and no goal):

- **When the finger lands**, in the same frame: the jaws snap open with a clack, the trolley lurches toward the finger with a motor chirp whose pitch follows how far it has to go, and the cable swings back against the pull.
- **While the finger slides**: the trolley follows, the cable swings against every change of speed, a soft tick sounds per stud of travel, and a round shadow under the claw shows where it will land. Hard against either end of the rail the trolley hits a buffer brick and a bell rings.
- **When the finger lifts**: the claw drops, lands with a clack that squashes it, and closes. A toy under it is lifted with a pop while its neighbours hop in a ring that fades with distance; with nothing under it the jaws bite air, the claw bonks the studs and the whole tray rings. The hoist comes up through a rising ratchet roll, quicker and higher as it climbs.
- **With a toy in the jaws**: the toy swings wider and slower than the bare claw, heavier for a big toy. Let go, it falls, clicks onto the nearest free studs with a squash, and its neighbours hop. Let go over another toy, it clicks on top and the two stand as a stack.

Why it is a pleasure with nothing to achieve: the swing is the child's own doing and is different every time, the drop is a held breath with a certain catch at the end (the demo's lucky grab is gone, so the simplest use always works), and one lift sets off a chain of clack, pop, hops and roll that is bigger than the touch. Random tapping moves the toys about and rings the tray; nothing a tap can do is refused or silent. Someone watching sees within three seconds that the child is working a crane (pack: game-design, toy-first.md; pack: game-design, touch-answers-bigger-than-the-touch.md).

## The object-by-action grid, and what is new on day 15

The claw is the only hand, so an action is a way the claw comes to a thing. A gobbler is one of the creatures the toys are sorted into ("The characters and their fixed tastes"). Every cell works, and none is refused or silent.

| | The empty claw lands on it | A small toy is let go on it | A big toy is let go on it | The claw swings into it | The claw waits above it |
| --- | --- | --- | --- | --- | --- |
| **A toy on the tray** | Grabbed with a pop; neighbours hop in a ring; ratchet roll on the way up | Clicks on top with a high click: a stack of two | Lands on top with a low clunk; both squash and spring back | Knocked one place over, skittering across the studs with a rattle | The shadow tightens on the toy, the jaws spread wide, the motor hum climbs |
| **Bare studs** | The jaws bite air, the claw bonks the tray, and the tray rings a note set by how far along it is, so taps along the tray climb a scale | Clicks down lightly; the nearest toys hop | Thuds down; every toy on the tray hops | The claw tip drags over the studs like a stick along a fence, pitched by speed | The shadow breathes, the jaws open and shut slowly with soft clicks |
| **A stack of toys** | Takes the top one only; the rest wobble and settle | The stack grows to three and sways; on a stack of three the toy bounces off and lands beside it with a boing | Too heavy on top: the stack teeters one way and comes down toy by toy, each clicking onto free studs with its own note | Goes down like dominoes in the direction of the swing | The cable winds itself up a creak at a time so the jaws clear the top |
| **A gobbler** | Lifted by the stud on its head: the motor groans, its legs kick, its belly rattles; let go, it drops back into its own place. Each one takes the lift its own way | Its sort: one gulp, and the toy drops into the belly window on the others. Not its sort: a chomp, a freeze, the toy held out on the tongue beside its own body, then spat in an arc back to the tray | Its sort: three chomps with bulging cheeks and a swallow that can be followed down. Not its sort: cheeks bulge, eyes cross, and it sneezes the toy out and rocks back on its heels | Ducks the bare claw and pops up again; snaps at a toy swinging past and misses with a clack of teeth | Opens wider and wider, tongue out, shuffling to stay under the claw. It does this for any toy: it finds out what it was given only by chewing |
| **The ledge where the next ones wait** | While toys are on the tray: the one bonked ducks and pops up further along. When the tray is clear: the claw hooks the gate and they come in ("The scenes") | Caught by one of them and lobbed back onto the tray overarm | Caught by all of them, who stagger under it and heave it back together | They lean out of the way one after another, like grass | They stare up, heads following the sway in step |
| **The end of the rail** (a buffer brick with a bell, above the sloped rim of the tray) | The trolley hits the buffer: a ding, and the claw swings out wide | Slides down the rim with a zip and clicks onto the edge studs | Thuds onto the rim, tips over it, and the tray hops | A hard slide into the buffer: a double ding, and the trolley bounces back a stud | Pressed against the buffer the bell hums and the cable trembles |

The wrong use of each: a toy on a toy makes a stack, a toy on the wrong gobbler is spat back, a gobbler can be carried off by its head, the waiting ones can be bonked, the tray can be played like a row of bars, and the rail has a bell. Each works and is at least as funny as the right use (pack: game-design, liveliness-from-causing-and-comedy.md).

**Day 15.** The child sorts one load of toys three ways running, in whatever order the crews turn up, where day 1 had two gobblers and one attribute. The child knows each gobbler's taste and its own way of taking a wrong toy, and plays them on purpose. And the child makes things of their own: stacks, and bellies filled in a chosen order, which the ending plays back as a tune that is the child's (pack: game-design, depth-from-combinations.md).

## The representation

- **The idea.** A set of things can be split into groups by one attribute, and the same set can be split again by another.
- **In the objects.** A toy has exactly three visible properties: its colour (red, blue or yellow, flat all over), its kind (a duck, a car or a rocket, as a brick-built shape) and its size (small or big). Nothing else about a toy varies: no face, no pattern, no motion of its own. A group is a place: one gobbler's belly, behind a clear window, where the toys that share a value lie together and apart from the other groups. The value a group is for is the gobbler's own body: a colour gobbler is built wholly in its colour, a kind gobbler is white with a white model of its kind built into its head, and the two size gobblers differ only in size. Sorting the same toys a second way is physical too: the first crew tips the same toys back onto the tray, and creatures who go by another attribute take their places.
- **Why this shape.** A toy is in one group at a time and the groups are separate containers, as in a partition. The toys stay plain on a plain tray of a contrasting hue; the look and the comedy are on the gobblers, the cabinet and the ending (pack: game-design, working-objects-stay-plain.md, whose exception covers a piece whose body is the idea: here the body is the three attributes).
- **Its backing.** School practice without a trial behind it. The pack's table for sorting and classifying gives objects with visible attributes and names one game, whose evidence is correlational (pack: game-design, representation-before-game.md).
- **Object, picture, symbol.** The order stops at the object. The band starts below 6, so there is no symbol stage, and nothing stands for a category but a body that has the attribute (pack: game-design, fade-to-school-symbols.md).

## The four mechanic questions

- **Swap.** No: sorting is not content laid on the game, it is the play. What the toys are (ducks, cars, rockets) could be swapped freely, and what would stay is the one thing the game is about: deciding which group a thing belongs with by an attribute it shares.
- **Attention.** With a toy in the jaws above the row of gobblers, the child has to look at the toy's colour, kind and size, look at what each gobbler's body shows, and settle which attribute this crew goes by. Nothing else asks for attention: the claw goes to the nearest mouth, so there is no aiming, and nothing is timed.
- **Fun.** Yes: the best moment of play is letting go over an open mouth, and that is the moment the sort is decided. Play never stops for a question.
- **Guess.** Partly, and the sheet says so. A toy always gets home if each gobbler is tried in turn, after at most one wrong try with two gobblers and two with three. A wrong try is never empty: it costs a few seconds and shows the mismatch on the gobbler's tongue ("The error as a consequence"). Looking first is the quicker way, guessing is the funnier one, and nothing is handed out for finishing, so trying every option gains nothing but the comedy. The gobblers give nothing away beforehand: every one opens wide for any toy.

## The error as a consequence

A toy let go over a gobbler that does not take its sort is chewed and comes back.

- **What happens.** The gobbler chomps once and freezes. It sticks out its tongue with the toy on it and holds the toy up beside the part of its own body that shows what it takes: a blue toy against a red flank, a car against the duck on its head. Then it spits the toy in an arc back onto the tray, where it clicks onto the nearest free studs and its neighbours hop. With the size crew the world does the same job more directly: a big toy does not go into the little gobbler's mouth and sits on its head until it slides off, and a small toy falls straight through the wide bars of the big gobbler's belly onto the tray.
- **Where and why.** On the tongue, beside the body: the two things that do not match are held next to each other for a beat. That beat is long at the positions where an attribute is new and short afterwards, so the feedback thins once the child can do it.
- **The state stays.** The toy is back on the tray, whole and in reach, every other toy is where it was, and every belly keeps what it holds. The child changes one thing, the gobbler, and tries again.
- **No verdict.** The gobbler's face is about the taste of the toy and never turns to the child. There is no buzzer, no cross and no lost piece, and a spit is at least as good to watch as a gulp. A right toy is a consequence too: it is swallowed and lies with its group behind the window (pack: game-design, errors-show-as-consequences.md).

## The designed order, and what is stored

**A cycle** is one load of toys, sorted by each of its crews in turn (one, two or three sorts of the same toys). It ends when the last toy of its last sort is swallowed.

**The positions**, easiest first, one new thing at a time and then combinations. The ids are the ones in `LADDER` in `config.ts`; each names a place in this game's own order.

| Id | Sorts | The load | What is new |
| --- | --- | --- | --- |
| `two-colours` | one: two colour gobblers | 4 small toys of one kind, two of each colour | sorting, by colour |
| `three-colours` | one: three colour gobblers | 6 small toys of one kind, two of each colour | a third group |
| `colours-among-kinds` | one: three colour gobblers | 6 small toys in two kinds, two of each colour | an attribute to leave aside |
| `two-kinds` | one: two kind gobblers | 6 small toys of one colour, three of each kind | sorting by kind |
| `colours-then-kinds` | two: three colour gobblers, then two kind gobblers | 6 small toys, one of each colour in each of two kinds | the same toys a second way |
| `two-sizes` | one: the big and the little gobbler | 6 toys of one colour and kind, three big and three small | sorting by size |
| `kinds-then-sizes` | two: two kind gobblers, then the size gobblers | 8 toys, two kinds in two sizes, colours mixed | a second way with size |
| `three-ways` | three, in an order that changes from load to load | 8 toys: two colours, two kinds, two sizes, one of each | three ways, and reading which way this crew goes by |
| `three-ways-wide` | three, in a changing order | 9 toys: one of each colour in each kind, sizes mixed | the widest load, with three groups in two of its sorts |

Which colours, which kinds and where the toys lie are drawn from a seed, so a return visit meets the same step in a slightly different form (pack: game-design, many-short-visits.md).

**How a cycle goes.** Only a toy's first let-go into a gobbler in each sort is looked at. With P such first tries in the cycle (toys times sorts) and M of them spat back: the cycle went well when 6 × M is at most P, badly when 2 × M is at least P, and mixed otherwise. Well moves the position one step up, badly one step down, mixed leaves it; a visit put away before the cycle ends leaves it too. Nothing on screen shows the position or that it moved (pack: game-design, ordered-challenges-high-success.md).

**The harder option.** When a cycle has ended, two crates stand on the ledge: the next load for the stored position, and beside it a taller one holding what the next step up would bring, which is visibly more: more toys, more kinds of toy, or more crews riding on it. The child puts the claw on either. A taller crate that goes well moves the position that one step up; one that goes mixed or badly moves nothing, so choosing the harder load never costs a step. At `three-ways-wide` there is one crate.

**Who a new position lays out.** While the child works, what waits on the ledge is the next crew of the same cycle, laid out with the load when the cycle began. The crates are laid out at the moment the cycle is judged, after the position has moved, so a new position shows on the very next load and no one who waits was laid out before it.

**The saved state**, every field:

- `v`: the version of the shape.
- `position`: the id of the stored position.
- `finished`: the cycle on screen has ended; its ending stays, and nothing replays on load.
- `cycle.from`: the id of the position this cycle was laid out from, and `cycle.harder`: whether it came from the taller crate.
- `cycle.crews`: the cycle's crews in order, each a list of gobbler ids, and `cycle.sort`: which of them is at the tray.
- `cycle.toys`: each toy of the load with its colour, kind and size and where it is: a place on the tray with its height in a stack, or a gobbler with its place in the belly's order.
- `cycle.tried`: for each toy, whether its first try of this sort has been made, and `cycle.misses`: how many first tries of the cycle were spat back. Neither is ever shown.
- `shown`: for colour, kind and size, whether the first showing of that attribute has played.
- `crates`: when the cycle has ended, the seed and the position id of each waiting crate.

Nothing is saved in the air. A toy in the jaws is saved at the place it was taken from. A toy being chewed is saved by its outcome, which is stored when the chewing starts: in the belly, or on the studs it will land on. A scene's outcome is saved when the scene starts. The claw and a lifted gobbler are not saved: on load the claw hangs at rest and every gobbler stands in its place. The largest legal state is under a kilobyte, and a test holds it under half the 64 KB cap.

## The characters and their fixed tastes

The gobblers: eight brick-built creatures, each a mouth on legs with a clear belly window. The one visible want of each is the same and is about the scene: an open mouth turned to the tray and a belly with room in it. A gobbler's feelings are about the toy in its mouth and never about the child (pack: game-design, characters-with-opinions.md).

Each takes one sort of toy, which never changes, and has one more like or dislike that never changes, so a child can learn it and try it on purpose:

| Gobbler | Takes | Its way with a toy that is not its sort | Its other fixed taste |
| --- | --- | --- | --- |
| Red (built in red) | red toys | goes stiff, whistles like a kettle and fires the toy out, blown back a step by it | loves being lifted: kicks its legs and squeals up a scale |
| Blue (built in blue) | blue toys | chews slowly, slowly notices, and lets the toy slide off its tongue | hates being lifted: goes rigid with its eyes shut and its teeth chattering until it is down |
| Yellow (built in yellow) | yellow toys | gets hiccups, and the toy pops out on the third | ticklish: a brush from the passing claw sets off the hiccups too |
| Duck-head (white, a duck on its head) | ducks | shakes its head until the toy flies out sideways | flaps its side plates when anything is carried over it |
| Car-head (white, a car on its head) | cars | reverses fast and leaves the toy behind in the air | its wheels spin when it is lifted, and it shoots forward a little when put down |
| Rocket-head (white, a rocket on its head) | rockets | puffs up and shoots the toy straight up, then watches it come down | stretches up tall on tiptoe when the claw rises |
| Big (white, large) | big toys | a small toy drops through the wide bars of its belly, and it looks for it everywhere but down | sleepy: yawns hugely, and lifting it only raises it a stud before it thuds back and the tray hops |
| Little (white, small) | small toys | a big toy will not go in and sits on its head, and it staggers about under it until it slides off | bouncy: hops to reach the claw, and spins like a top when lifted |

Each gobbler arrives with one toy of its own sort already in its belly, its snack, so every group is begun and shown before the child adds to it. The snacks of one crew differ only in the attribute that crew goes by. A snack is the gobbler's own and never joins the load.

Before a toy is in its mouth, every gobbler behaves the same way toward any toy: it opens wide. The taste shows only in the chewing.

## The scenes

Each is a list of timed beats filled in from the state of play, and each gives way to any touch: the touch sets everything where the scene would have left it, and is then answered as a touch (pack: game-design, endings-and-short-scenes.md).

- **The first showing** (5 to 8 seconds). Cause: a crew comes in that goes by an attribute whose showing has not yet played. Beats, for each gobbler in turn: it holds its snack up beside the part of its body that shows what it takes, looks from one to the other, gulps, and the snack drops into the belly window. Filled in from: which gobblers the crew has. It plays once for each attribute; on every later arrival the snacks are already in the bellies (pack: game-design, guided-discovery.md).
- **The tip-out** (5 to 8 seconds). Cause: the claw hooks the gate of the ledge when the tray is clear and another crew of this cycle waits. Beats: each gobbler leans over and tips its toys back onto the tray in the order they went in, each clicking onto free studs with its note; the crew shuffles off one side while the waiting crew hops down on the other and lines up with open mouths. Filled in from: exactly the toys in each belly, and their order.
- **The ending** (6 to 10 seconds). Cause: the last toy of the cycle's last sort is swallowed. Beats: half a second of quiet; then each gobbler in turn drums on its belly and its toys ring in the order they went in, low for a big toy and high for a small one, with a voice for each kind, so the tune is the order the child chose; then all of them burp at once and settle; then the crates slide onto the ledge with their crews riding. Filled in from: every belly's toys and their order.
- **The delivery** (5 to 8 seconds). Cause: the claw is put on a crate when a cycle has ended. Beats: the old crew waddles off with its bellies rattling; the claw hoists the chosen crate over the tray and tips it, and the toys rain onto their studs; the crew that rode on it lines up; the other crate slides away. Filled in from: which crate, and its load and crews.

**How a cycle ends and the next begins.** The cycle ends on the child's own last gulp. The ending then stays as long as the child likes: full gobblers breathing, crates waiting, nothing new starting and no one hurrying, complaining or looking at the child for it. The next cycle begins when the child puts the claw on a crate. On load no scene replays: the world is as the last scene left it, with whoever waited still waiting ("How a cycle restarts" in the guide).

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
