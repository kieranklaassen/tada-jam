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
