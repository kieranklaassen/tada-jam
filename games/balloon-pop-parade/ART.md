<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 2 to 4, so a two-year-old governs every choice.

- **Cue table.** The table in the jam's wordless-clarity convention has no row below 3. Its 3 to 4 row is taken as the ceiling and cut further: one live activity, one next act on offer, a ghost hand that shows one move, a breathing glow on what can be touched, and characters that gaze and reach. Its "Avoid" column binds as written: no text, numeral or picture that must be decoded, no spoken instruction, no verdict, never several activities at once, and no tool on screen before it means something.
- **The pack's rule for the age** (pack: game-design, ages-2-to-4.md). Everything essential is a tap. A tap that smears into a short drag counts as the tap. No pinch, tilt, shake or double tap. Every balloon and every friend is at least about 100 logical pixels across, they stand well apart, and none sits in the bottom strip where wrists rest. Whatever looks touchable answers a touch. One action, sending a balloon, is offered again and again. A cycle (one troop of friends served) takes well under a minute, and a visit of one to three minutes holds several. No set on screen is larger than three.
- **Symbols.** The band starts below 6: no word, letter, numeral or symbol on the kid side, optional or not, and no `symbols.ts`. No voice speaks; the friends have invented, synthesized squeaks.
- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order: 2 or younger starts at `solo-two-colours`, 3 at `solo-three-colours`, 4 or older at `pair-singles`. No age (`null`) takes the youngest start. A saved position always wins, age never hides or locks anything, and every position is reached by play from every start.

## The toy

**The action.** The finger taps a balloon that floats in the sky, and the balloon goes to the friend who stands below.

**In an empty scene, with no goal.** A handful of plain balloons bob in an open sky over one inflatable friend who reaches up.

- *When the finger lands*, in that frame: the balloon squashes flat under the finger with a rubber squeak, its string whips, and its neighbours bob away from it. The squeak is higher for a small squash and lower for a slow, long press. Nothing waits for the lift.
- *When the finger lifts* (or slides off, which counts the same): the balloon springs back past round, lets go of the sky and swoops down to the friend in an arc, with a rising whistle. A new balloon drifts into the empty place.
- *The chain.* The friend follows the balloon with its eyes, hops, and catches the string: a boing, a squash, and the balloon tugs its arm up and bobs above its head. A second balloon is one too many: the friend catches it as well, is lifted off its feet, paddles in the air, lets the extra go, and plops back down with a deep squash and a wobble, while the escaped balloon zooms off and pops.
- *Popping.* A tap on a balloon a friend holds pops it at once: a snap, a puff of the balloon's colour, the string falls, and the friend jumps and looks at its empty hand. Then it reaches up again.
- *The friend itself* squeaks and wobbles like a pool toy when poked, each kind at its own pitch.

**Why repeating it is a pleasure.** Each tap is a squeeze that squeaks and then a flight that ends in a catch, a lift-off or a pop, so one touch sets off three or four things, and the same three taps (give, give, pop) never play out quite alike. Random tapping always does something funny and never anything bad: the simplest use, tapping any balloon, always works. A person watching sees within three seconds that the child is handing balloons to the friend (pack: game-design, toy-first.md; pack: game-design, touch-answers-bigger-than-the-touch.md).

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
