<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 9 to 12. Its youngest age, 9, governs the design.

- **Cue table.** The row for 7 and up in the wordless-clarity convention. Its "Avoid" column binds the game: no written word or letter; no symbol standing alone that play depends on reading; no timer, points or verdict chrome; no long hint chain. Several things may be on offer at once as long as each reads at a glance.
- **The pack's rule for the age** (pack: game-design, ages-9-to-12.md). The system is real and behaves the same every time: a length is a length, a cut is where the blade crossed, and a tin is as long as what was ordered. More than one way of filling an order works, and any that works stands. Failure is large, funny and free. Help is something the child fetches (the roller, below). The idle ladder shows what can be touched and one possible move, never where to cut. Nothing is babyish: no praise, no mascot that explains, no single right answer, tools that look like tools.
- **The symbol rule.** The band starts above 6, so digits, the fraction bar and the signs for less than, equal and greater than may be shown, each laid on or beside the length it names, and all drawn by `symbols.ts`. No symbol stands alone: wherever a fraction is written, the length it names is drawn under it, so play never depends on reading it. No letter and no written word.
- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order: under 11, or no age (`null`), at the first position; 11 and over at the position where the notation first appears. A saved position wins over the age, every position is reached by play from any start, and nothing is locked or hidden by age.

## The toy

**The slice.** A long fruit lies along a cutting board. The finger is a blade, and a stroke that crosses the fruit cuts it square at the place where the stroke crosses its middle line.

- **When the finger lands**, in that frame: the blade is there under the finger with a short steel ring, and a hairline drops from it straight across the board, showing where a cut would fall. Sliding sideways moves the hairline along the fruit, with a soft tick as it passes each piece end.
- **When the stroke crosses the fruit**: a wet thwack, a burst of juice along the cut, and the two pieces hop apart, squash as they land and settle with a wobble. Drops fly on and spatter the wall behind the stall. The cut is always square, whatever the angle of the stroke, so every piece is a length.
- **Again and again**: each piece can be cut again. The shorter the piece that is cut, the higher the thwack, so a fruit cut down from whole to slivers climbs a scale. One long stroke across several pieces cuts every one it crosses, in a run of rising notes. A piece too thin to cut again gives up a curl of peel that spins away. A stroke that crosses nothing whistles, leaves speed lines, and flaps the awning.
- **No dead end**: a tap on the crate thumps a fresh fruit onto the board, as often as the child likes.

Why it is a pleasure with no goal: the swing has weight, the answer is loud, wet and bigger than the stroke, the pitch rises as the pieces shrink, and the child decides how far to take it. Tapping at random always gives a ring, a tick or a spatter. A person watching can tell in three seconds that the child is slicing fruit (pack: game-design, toy-first.md; pack: game-design, touch-answers-bigger-than-the-touch.md).

The fruit and its pieces are the working objects, so they stay plain: one flat colour, square ends, a thin darker edge, no seeds, no shine, no face, on a pale board of a contrasting hue. The juice, the spatter and the comedy are around them, never on them (pack: game-design, working-objects-stay-plain.md).

## The object-by-action grid, and what is new on day 15

Six things and five acts. A row is the thing an act is done to. Every cell works, none refuses, and the wrong use is at least as funny as the right one (pack: game-design, depth-from-combinations.md; pack: game-design, liveliness-from-causing-and-comedy.md).

The things: the **fruit** (an uncut one on the board), a **piece** (anything cut from one), a customer's **tin**, the **customer**, the **crate** of fresh fruit, and the stall **dog** under the counter. The acts: **slice** it, **poke** it (a tap), **give** it a piece (carry one to it and let go), **fling** a piece at it, and **roll** it (carry the marking roller over it).

| | Slice | Poke | Give a piece | Fling a piece at it | Roll |
| --- | --- | --- | --- | --- | --- |
| **Fruit** | Cut square where the stroke crosses: thwack, juice, two pieces hop apart. | It quivers end to end and gives its own low note. | The piece lies on top of it from the left end, so the two lengths can be compared edge to edge. | It bounces off with a rubber boing and the fruit shivers. | The roller presses the equal parts of the ticket into it, one tick a part. |
| **Piece** | Cut again, a higher thwack the shorter it is; too thin, and a curl of peel spins off to the dog. | It rings: the shorter the piece, the higher the note, as a string does. | The two butt end to end and travel as a row; their lengths add. | It is knocked along like a puck and clacks into the next one. | The parts are pressed into the piece, as if it were a whole of its own. |
| **Tin** | The blade skids off with sparks and the tin rings at the pitch of its length. | Shut, it rattles and stays shut. Open, its jaw snaps like a castanet. | It springs open to its true length beside the piece. The piece fits, sticks out, or leaves a gap. | It bongs off the lid and skitters back onto the counter. | The whole and its equal parts are ruled along the rail under the open tin. |
| **Customer** | Only a tuft, a feather tip or a whisker end comes off, and it pops back; the customer looks about, puzzled. | Each has its own flinch and noise. | It eats the piece as it is, bypassing the tin, and its body shows exactly what went in. | Splat on the face; it licks the juice off in its own way. | It is rolled flat as a page, then springs back into shape with a honk. |
| **Crate** | A slat splits and one fruit of each kind tumbles out. | One fresh fruit of the ordered kind thumps onto the board. | The crate chews and burps the piece across to the dog. | It rocks, and a fruit jumps out by itself. | The slats rattle like a washboard. |
| **Dog** | It snaps at the passing blade and bites the speed lines. | Tail thumps and one bark. | It eats it, cheeks bulging by the length. | It catches it in the air; the longer the piece, the bigger the flip. | Its ears are ironed flat and spring up one at a time. |

**On day 15** the child cuts a third, a fifth or five twelfths of any fruit by eye in one stroke; fills one order several ways from pieces left over (three quarters from a half and a quarter, a third from two sixths); knows what each customer cannot stand and serves it on purpose, or on purpose not; and has cut a row of pieces that plays a tune, having found that half the length rings an octave higher.

## The representation

**A fraction is a share of a length.** The whole is one fruit lying along a straight board. A fraction of it is the piece from its left end to a square cut. Its size is a length the child can lay against another length, and nothing else about a piece varies. This was chosen before the game: the pack's table gives, for fraction size, a strip or a line with an estimate followed by the true answer beside it (pack: game-design, representation-before-game.md).

- **The estimate, then the truth beside it.** The child cuts by eye. The customer's tin then opens at its true length beside the piece, both starting at the same left edge, with the whole and its equal parts ruled on the rail underneath. The difference between the two is a length that can be seen: this much too long, or this much too short.
- **The whole changes size.** Three kinds of fruit have three lengths. Half of a long fruit is longer than half of a short one, so a share is always a share of this fruit, and pieces of different fruit are not compared as fractions.
- **Equal shares get several names by cutting.** Two quarter pieces laid end to end lie exactly on a half piece. Nothing tells the child so; the lengths do.
- **More than a whole** is a row longer than one fruit: a whole and a piece of a second one.

**What stands behind it.** Estimating a place on a line and then seeing the true place has a trial behind it: the pack records large gains in under fifteen minutes for fractions on a line with that feedback, and none for the same estimates without it. That trial used a number line from 0 to 1 and written fractions. This game uses a strip with a picture of the share, which is school practice (the bar or strip of the Dutch tradition, the visual fraction model of the California standards) and has no trial of its own as built here.

**Object, picture, symbol, and where it stops.**

1. Object: the fruit and its pieces.
2. Picture: the ticket each customer holds, a small strip in the fruit's colour with the ordered share filled in. It is much smaller than the fruit, so it can be read for its proportion and never copied for its length.
3. Symbol: from the position named `written` on, the fraction is laid on the filled share of the ticket and on the open tin, with a horizontal bar. From the position named `bigger`, the sign for less than, equal or greater than is laid between two open tins.

It stops there for this band. A symbol is never shown without the length it names, no symbol is ever the only way to know an order, and nothing is written on a piece the child cut: a cut piece is named by nothing but its length (pack: game-design, fade-to-school-symbols.md).

## The four mechanic questions

- **Swap.** No: the place of the cut along the fruit is the fraction, so with another subject put in its place there is no decision left and no game.
- **Attention.** At the moment of decision the child looks at the whole length of this fruit and at the share on the ticket, and thinks about where that share of this length ends; the hairline shows where the cut will fall before the stroke commits, so the stroke asks for no aim and no timing.
- **Fun.** The skill is used in the most enjoyable moment: the slice is the toy, and placing it is the fraction.
- **Guess.** A stroke at random fits a tin about one time in twelve, and a continuous length has no list of options to try; a child can always finish an order by trimming a piece against the open tin, which is matching and not fraction work, and for that reason only a first cut made before the tin opened moves the child on in the designed order.

## The error as a consequence

A tin is exactly as long as the share that was ordered, and its end wall is a sprung jaw with a little give. That one fact carries every consequence (pack: game-design, errors-show-as-consequences.md).

- **Too long.** The piece sticks out past the jaw by exactly the excess. The lid comes down on it, clangs and bounces, and will not shut. Where: at the jaw end of the tin. Why: on the rail under it the whole is ruled into its equal parts, the tin covers the ordered number of them, and the piece runs on into the next.
- **Too short.** The jaw closes on air. The piece slides and rattles in a gap exactly as long as what is missing, and the same ruled parts show how much of a part that is.
- **Within the give.** The jaw takes up the slack, the lid shuts with a click, and the customer eats. This is a consequence too, not an approval: nothing lights, chimes or cheers.
- **The wrong fruit.** A piece of another kind of fruit is a share of a different whole. The customer picks it out between two fingers and drops it to the dog.
- **Against a customer's taste.** The order still counts, and the customer's body shows what it thinks of these exact pieces ("The characters and their fixed tastes").

**The state stays.** Every piece stays where it lies and nothing is taken back, reset or lost. The child changes one thing: trims the piece against the jaw, lays another piece beside it, or cuts afresh from a new fruit, which a tap on the crate supplies at no cost. The child may also send the customer off with the order as it is, and the customer eats it as it is.

**The give is the game's own choice.** It is one twenty-fourth of the whole fruit, to either side. No record says how close a cut by eye should be. The same measure is the thinnest piece a cut can make, so anything thinner than the give is a curl of peel and not a piece.

Feedback is fullest when an idea is new: the first time a new idea is met, the roller rules the parts under the open tin one at a time ("The scenes"). After that the ruled parts simply appear with the tin.

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
