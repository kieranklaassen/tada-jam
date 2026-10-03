<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

Fix-it Stall is a repair stall on a market lane. Customers bring a lamp, a fan, a bell, a toy car or a toy robot that has stopped. The child lays it on the bench mat, opens it, finds why nothing runs, and makes the circuit whole again with cells, crocodile-clip leads, switches, lamps, motors, buzzers and whatever lies on the bench.

- **Band.** The manifest band is 9 to 12. Its youngest age, 9, governs the design.
- **Cue-table row.** The row for 7 and up in wordless clarity. Its "Avoid" column binds: no written word or letter, no symbol standing alone that play depends on reading, no timers, points or verdict chrome, no long hint chains. Several things may be live at once as long as each reads at a glance.
- **The pack's rule for the age** (pack: game-design, ages-9-to-12.md). The system is real and behaves truly: the circuit is solved, never scripted. Any repair that works stands, and a neater one is visibly neater. Failure is large, funny and free. Help is something the child fetches: the idle ladder shows what can be touched or one possible move, never a repair. Nothing babyish: tools look like tools, the humour is dry, no character explains, nothing is praised, and there is no competition and no stored best.
- **Symbols.** The band starts above 6, so numerals and the listed mathematics signs may be laid on or beside the quantity they stand for, drawn only in `symbols.ts`. The game uses one such place, the order ticket described under "The representation", and play never depends on reading it. No letter and no written word anywhere. No circuit symbol is drawn: none is in the listed set.
- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order: no age, 9 or 10 start at the first position (`gap`); 11 and older start at the second (`switch`). A saved position always wins, every position is reached by play at any age, and nothing is locked or hidden by age. Both ends are open: a child younger than 9 starts as a 9-year-old does, one older than 12 as a 12-year-old does.
- **What `null` gives.** The first position, as for the youngest.

## The toy

**The action: clip a lead.** The finger lands on a metal pad or a part's leg, and a crocodile clip bites it in that frame with a clack. Dragging pulls a floppy lead out behind the finger. Lifting over another pad makes the second clip bite. Two taps do the same for a child who would rather not drag: the first pad, then the second. A lead let go over nothing drops limp on the mat with its free clip still snapping once.

**In an empty scene** there is the grey mat, one cell, one lamp and a coil of leads, and no goal.

- The moment a lead closes a loop through the cell and the lamp, the lamp is lit: no test button and no wait. Copper-coloured beads run round the whole loop, all at one speed, the lamp's glow falls on the mat, and a low hum rises with the current.
- Take any lead off and everything stops at once, everywhere in the loop.
- Clip both ends of one lead across the cell alone and the lead glows orange, the cell puffs, and its cutout flag pops up with a pock. A tap on the flag sets it back.
- Clip a lead onto one pad twice and it makes a useless loop of its own that sags and twangs.
- Every further lead changes what runs: a second path, a short way round, a longer way round.

**Sound and motion.** The clack of a clip is pitched by where it bites (a pad, a leg, the cell's cap). The lead has weight: it swings, overshoots and settles. The hum, the lamp's ring and the beads start in the frame the loop closes. Random clipping always does something: a clack and a swinging lead at the least, a lit lamp or a popped flag at the most.

**Why it is a pleasure with no goal.** One small bite of a clip makes a whole loop come alive at once, far from the finger, and one lead taken away makes it all stop. Making and breaking the loop is the pleasure, and it is the same act every repair is made of. A person watching can tell in three seconds what the child is doing: joining metal to metal until something lights (pack: game-design, toy-first.md; pack: game-design, touch-answers-bigger-than-the-touch.md).

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
