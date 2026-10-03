<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 4 to 6, and its youngest age, 4, governs every choice below.

- **The cue-table row.** Age 4 falls in the 3 to 4 row of the age-band cue table in `docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md`. The cues the game uses from it: a breathing glow on what can be touched now, a ghost hand that shows one move, characters who gaze and reach, tools that appear only when they mean something (the sponge comes out with the first spill), and materials that correct themselves (tea that runs over a rim, a painted line that the tea covers). Its "Avoid" column is a hard limit here: no text, numeral or pictorial icon that has to be decoded, no spoken instruction, no verdict, never several activities live at once, and no tool on the table before it means anything. One next act is offered at a time and one finger does everything.
- **The pack's rule for the range** (pack: game-design, ages-4-to-6.md). The game is pretend play: a table, props and guests who react, and the child supplies the plot. Every act is a tap, a press that is held, or a drag that survives a lifted finger. There is no double tap and nothing to read. The jokes are tricks and slapstick on a guest who overreacts and is never hurt.
- **The symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, optional or not, and the game has no `symbols.ts`. The rings painted inside a cup are brushwork at a height, not marks to be read as a scale: there are no ticks, no count of them is ever needed, and each cup carries one.
- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order. A child of 4 or 5, a younger child, and no age at all (`null`) start at the first position, `brim`. A child of 6 or older starts at `lay-a-place`, two steps on, where the place is laid before the pour. A saved position always wins over the age, every position stays reachable by play from either start, and nothing is locked or hidden by age. A new idea is still shown once to a child who starts further on, because each first showing has its own stored mark.

## The toy

**Pouring.** The finger presses a cup and holds; the teapot pours into it for as long as the finger stays, and stops when it lifts.

In an empty scene there is a plain cloth, the pot, and one cup on its saucer.

- **When the finger lands**, in the same frame: the pot hops off the cloth with its lid rattling and swings its spout over the cup, the cup settles into its saucer with a clink, and the first drop is already falling. Nothing waits for the lift.
- **While it is held**: the stream thickens over the first half second from a dribble to a steady rope of tea, so a short press gives a drop and a long one gives a cupful. The tea is a warm amber disc on the cup's white inside, and it climbs the wall as it grows, so the amount can be read at every moment of the pour, from the first coin of tea at the bottom to the skin that bulges at the rim. The sound of the filling cup climbs in pitch as the space above the tea gets shorter, as a real cup's does, over the glug of the pot.
- **When it lifts**: the pot rights itself, one last drop hangs on the spout and falls with a plip, the lid lands with a click, and the surface rocks and settles.
- **Past the rim**: the tea runs down the outside into the saucer, fills the saucer, and then creeps onto the cloth as a puddle with a soft patter. The sponge comes out of the tray at the first spill, and rubbing it over the puddle takes the tea up along the stroke with a squeak.
- **The simplest use always works**: a tap on the cup gives one drop and a ring of the cup, pitched by how full it is. A press anywhere else pours there too: on the cloth it makes a puddle, on the saucer a shallow pool, on the pot itself a tip where it stands.

**Why repeating it is a pleasure with no goal.** The child is making a liquid do things: it stretches, thickens, climbs, bulges, runs over and spreads, and each of those has its own sound that the finger plays by staying or leaving. The cup is an instrument: the same hold never sounds quite the same, and the spill is the funniest part, costs nothing and wipes away. A person watching sees within three seconds that the child is pouring tea. No part of it needs a guest, a target or an ending (pack: game-design, toy-first.md; pack: game-design, touch-answers-bigger-than-the-touch.md).

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
