<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 4 to 7, and its youngest age, four, governs the design.

- **The cue-table row.** The row for a youngest age of 3 to 4 in the wordless-clarity convention. Its "Avoid" column binds the game: no text, numeral or pictorial icon that has to be decoded, no spoken instruction, no verdict, never several activities live at once, and no tool on the table before it means something. One next act is offered at a time, and at most three fingers act.
- **The pack's rule for the range** (pack: game-design, ages-4-to-6.md). Pretend play with characters who react; tap and drag; quantities to ten; funny through tricks, wrong things on a pizza and a customer who overreacts and is never hurt. No reading, no double tap.
- **The symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, and the game has no `symbols.ts`. An order is a picture of the pieces themselves, one drawn piece for every piece wanted, and never a sign that stands for an amount. The rule follows the manifest band: a seven-year-old sees no numeral either.
- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order (see "The designed order, and what is stored"): four or younger at the first place, five at the second, six at the fourth, seven or older at the fifth. A saved position wins over the age. Age locks and hides nothing: every place is reached by play, and the bigger order is always there to pick.
- **What no age gives.** `null` starts a first visit at the first place, as for the youngest child.

## The toy

**The action.** Tap a tub of toppings and one piece hops onto the pizza. That is the touch the finger performs most, and one touch is always one piece.

**In an empty scene.** A pizza base lies on the board with one tub beside it, and nothing asks for anything.

- When the finger lands, in that frame, the tub squashes under it and one piece pops up out of the tub with a pop.
- When the finger lifts, the piece flies in an arc to a free spot on the pizza and lands with a plop. It squashes and settles, the whole pizza jiggles, the pieces already lying there bob, and a puff of flour comes off the board.
- Each piece that lands sounds one step higher than the one before it, so a run of taps climbs like a small tune. Taking pieces off steps the tune back down. The pitch follows how many lie on the pizza, never how fast the child taps.
- A finger that moves before it lifts carries the piece, which can be set down anywhere on the pizza. Let go anywhere else and it bounces once and rolls back into its tub, at no cost.
- Tapping a piece that lies on the pizza sends it hopping back to its tub with a pip, one step down. Tapping the pizza makes every piece on it wobble.
- A full pizza turns nothing away in silence: the extra piece bounces off the heap with a boing and rolls home.

**Why repeating it is a pleasure with no goal.** Every tap is answered at touch-down and the answer is bigger than the touch: a squash, a flight, a plop, a jiggle and a rising note from one finger (pack: game-design, touch-answers-bigger-than-the-touch.md). Random tapping fills a pizza and plays a climbing scale, and nothing a finger can do is punished. The simplest use, a tap, always works, so no child is stuck on a drag (pack: game-design, toy-first.md). The same pieces also make things: carried pieces can be laid out as a face or a ring, and the pizza keeps them where they were put. In the game this same touch is the school skill, since one tap puts out exactly one piece.

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
