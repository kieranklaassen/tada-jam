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

What a wrong attempt does in the world, where it shows, and that the state stays so the child changes one thing and tries again.

## The designed order, and what is stored

The order of challenges with one new thing at a time, the positions with their stable ids as they stand in `config.ts`, what a cycle that goes well or badly is, and every field of the saved state.

Where the next customer already waits on screen while the child works, say which customer a new position lays out: the position moves when a cycle is judged, and the one who waits was laid out before that, so the change shows on the customer after next.

## The characters and their fixed tastes

Each character's one visible want and the likes and dislikes that never change, or what gives the feedback in a game with no character.

## The scenes

Each short scene with what causes it, its beats, what from the state of play fills it in and how it gives way to a touch, then how a cycle ends and how the next one starts.

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
