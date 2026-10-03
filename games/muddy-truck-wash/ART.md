<!-- template: cartridge/ART.md v1 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 2 to 4, and its youngest age, 2, governs every choice below.

- **Cue table.** The table in wordless clarity has no row below 3, so its 3 to 4 row is the ceiling and the game cuts further. From its "Avoid" column the game takes: no text, numeral or icon to decode; no spoken instruction; no verdict; one live activity (one vehicle in the bay); and no tool that means nothing when it is touched. All three tools are in the scene from the first frame, and each one changes whatever it touches at once, so none is there before it means something.
- **The pack's rule for the range** (pack: game-design, ages-2-to-4.md). Every touch is answered and no order of touches is a dead end. The targets a wash needs (the vehicle, three tools, the vehicle that waits, the puddle) are each at least 100 logical pixels across, well apart, and none is in the bottom strip. Everything works with a tap: a tap on a tool takes it in hand, and a tap on the vehicle is one full dab of that tool. A rub is the same dab repeated along the finger's path; it survives a lifted finger, and whatever part of it was done stays done. No pinch, tilt, shake or double tap. One loved action, covering and uncovering, offered again and again. A wash fits in one to three minutes. There are three tools and never more than two vehicles on screen.
- **Symbols.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, optional or not, and the game has no `symbols.ts`. No voice gives an instruction; the vehicles speak in engine noises and horns.
- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order: a child of 2 or 3 starts at `fresh-splashes`, and a child of 4 or older starts at `dried-patches`. `null` starts at `fresh-splashes`. A saved position wins over the age, every place in the order is reached by play at any age, and the age gates nothing.

## The toy

**Rubbing a tool over the vehicle.** The finger lands on the vehicle with a tool in hand, and the paint under it changes.

In the empty scene there is one vehicle, caked in mud, on wet concrete, with the sponge in hand. On touch-down, in the same frame:

- the body dips on its springs toward the finger, and the wheels on that side squash;
- the patch under the finger turns from mud to foam, and the edge of the foam swells out past the finger;
- a scrub squeak sounds, its pitch set by how fast the finger moves, never twice the same of four variants;
- bubbles lift off the patch, drift up, and pop one by one with small plips after the finger has gone;
- brown drips run down from the patch to the floor and spread into a puddle that stays.

A rub lays a trail of the same change, and the body rocks after the finger like a toy pushed across a table. The hose and the cloth are held the same way and answer in their own material: water sheets, beads and runs off the sills; the cloth squeaks and leaves a glint. With no tool in hand the finger is a poke: the vehicle bounces on its springs and its mud squelches.

It is a pleasure with no goal because it is covering and uncovering, which a two-year-old does unprompted: bright paint appears from under brown, white foam hides it again, water takes the foam away. Each touch is a small reveal, bigger than the finger, and the vehicle can be covered and uncovered for as long as the child likes with nothing to finish. Random tapping always makes foam, splashes or shine, and never a refusal. A person watching sees within three seconds that the child is washing a truck.

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
