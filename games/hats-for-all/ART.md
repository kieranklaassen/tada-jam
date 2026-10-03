<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

Band: 2 to 4, as in `manifest.ts`. The youngest age, 2, governs every choice below.

- **Age rule.** (pack: game-design, ages-2-to-4.md) Everything essential works with one tap. A drag is an extra, survives a lifted finger and counts when partly done. No pinch, tilt, shake or double tap. Essential targets are about 100 logical pixels across, well apart, and none sits in the bottom strip. Every touch is answered and there is no dead end. A whole cycle fits in one to three minutes. Sets stay at five or fewer.
- **Cue table.** The table in the wordless-clarity convention has no row below 3, so its 3 to 4 row is the ceiling and is cut further: one next act offered, one live activity at a time, a creature or the ghost hand showing one move, a glow on what can be touched now. Its "Avoid" column binds: no text, numeral or icon to decode, no spoken instruction, no verdict, never several activities at once, and no tool on screen before it means something.
- **Symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, optional or not. The game has no `symbols.ts`.
- **What `ctx.childAge` sets.** Only the place in the designed order where a first visit starts: 2 or younger starts at `two-heads`, 3 at `three-heads`, 4 or older at `spare-hat`. `null` starts at `two-heads`. The top and bottom defaults are open-ended, a saved position wins over the age, and the age never hides or locks anything.

## The toy

**Pressing a foam hat out of its mat.** The finger lands on a hat shape cut into a foam tile. In that same frame the hat sinks under the finger, the tile dimples around it and the foam creaks. When the finger lifts, the hat pops out with a hollow "pok", flips once in the air and lands with a squash on the nearest bare head; the creature under it bounces and babbles. The hat leaves its hole behind in the tile.

Touching a hat that is on a head does the same in reverse: it squashes, pops off, flies home and is pressed back into its own hole with a soft "fwump" and a ripple through the tile.

In an empty scene, with no creature at all, the hat pops out, flips and lands on the mat beside the tile, wobbling like a dropped bowl, and the next touch sends it back into its hole.

Why it is a pleasure with no goal (pack: game-design, toy-first.md): it is the press-out play of a foam puzzle mat, the covering and joining a toddler repeats unprompted, and each direction has its own sound, its own flip and a hole that fills or empties. The answer starts when the finger lands, runs alongside the next touch, and is bigger than the touch: the tile dimples, the hat flies, the creature bounces, its neighbours look (pack: game-design, touch-answers-bigger-than-the-touch.md). A person watching sees within three seconds what the child is doing: taking hats out and putting them on heads.

A tap anywhere else is answered too: the foam floor dimples under the finger with a squeak and whatever stands near hops.

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
