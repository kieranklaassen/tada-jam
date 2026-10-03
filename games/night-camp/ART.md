<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 9 to 12. Its youngest age, 9, governs the design.

- **Cue table.** The row for a youngest age of 7 and up in the wordless-clarity convention. Its "Avoid" column binds the game: no written word or letter; no symbol standing alone that play depends on reading; no timer, points or verdict chrome; no long hint chain.
- **Age rule.** (pack: game-design, ages-9-to-12.md) The camp is a real system that behaves truly: every supply is used up at a steady amount per span of time, and the night shows exactly what the plan gives. More than one plan works, and a better one is visibly better in the world. Failure is large, funny and free. Help is something the child fetches. Nothing is babyish, nothing competes, and no best is stored.
- **Symbol rule.** The band starts at 6 or above, so numerals and mathematics symbols may be shown, each laid on or beside the quantity it stands for, and all of them drawn by `symbols.ts`. No letter and no written word appears: an hour is a division of the ruler and never an abbreviation, and a unit is the drawn thing itself (a log, a flask, a can). No symbol stands alone. Where each numeral lies is listed under "The representation".
- **`ctx.childAge`.** It sets one default: where a first visit starts in the designed order. A child of 9 or 10 starts at the first position and a child of 11 or more at the second. `null` starts at the first. A saved position wins over the age, and every position is reached by play at any age.
- **`ctx.language`.** Nothing in the game depends on it: there is no spoken or written content, and the game shows whole numbers and fractions only, so no decimal mark is drawn.

## The toy

**Pulling a row of supply out of its pile, along its rod.** Each supply has a pile at the left end of a banded measuring rod that lies on the map. The finger lands on the pile and pulls: the supply comes out behind the finger one piece at a time, laid end to end along the rod, as a zip opens.

- **On touch-down, in the same frame:** the pile rattles and the first piece jumps to the finger with a knock.
- **While pulling:** every piece that comes out sounds one note, each a step higher than the last, with a deeper knock on every fifth. The row is a length the child is drawing, and the numeral at its end follows the last piece.
- **On release:** the row settles in a wave that runs back to the pile, each piece squashing in turn. The nearest camper's head turns to watch and the dog trots to sniff the far end.
- **Pushing back:** the pieces hop home in reverse, the notes stepping down.
- **A tap anywhere on the rod:** the row shoots out, or snaps back, to that mark in one rattle.
- **Past the end of the rod:** the extra pieces tumble into a heap, the mule looks at the heap, then at the sled, and sits down. One pull back clears it.

It is a pleasure with no goal because it is a zip and a xylophone at once: the hand draws a length and hears it, fast or slow, forwards or back, and a bigger pull makes a bigger chain (pack: game-design, toy-first.md; pack: game-design, touch-answers-bigger-than-the-touch.md). Random pulling always lays a row and never does harm. Someone watching sees within three seconds that the child is laying in wood. It is also the hand of the school skill: the answer to "how much will the night need" is given as a length on a line of equal steps.

The three supplies differ in the hand: logs knock like wood blocks and roll a little, oil flasks clink in a glassy chain, and water cans come out slowly with a slosh that lags behind the finger.

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
