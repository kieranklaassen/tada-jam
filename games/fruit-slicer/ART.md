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

A grid of objects by actions in which every cell gives a result that looks and sounds different, and one line on what the child can do, find or make on day 15 that they could not on day 1.

## The representation

How the school idea appears in the objects, chosen before the game, and where the order of object, picture and symbol stops for this band.

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
