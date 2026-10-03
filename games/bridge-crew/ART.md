<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

Manifest band: 9 to 12. The youngest age, 9, governs.

- **Cue-table row:** 7 and up. Its "Avoid" column is a hard limit here: no written word or letter; no symbol standing alone that play depends on reading; no timers, points or verdict chrome; no long hint chains.
- **Pack rule for the range** (pack: game-design, ages-9-to-12.md): a real system that behaves truly, more than one solution, any working one stands and a better one is visibly better in the world, failure large, funny and free, help is something the child fetches, nothing babyish, no competition, no stored best.
- **Symbol rule:** the band starts at 9, which is above 6, so numerals and the listed mathematics signs may lie on or beside the quantity they stand for, drawn only in `symbols.ts`. Under the defaults awaiting the owner no symbol stands alone and no reading is shown on the object. This game uses numerals in two places and no sign:
  - on the test trolley, beside the stack of weights the child put on it (a quantity the child set);
  - on a vehicle, beside the row of crates it carries (the quantity the bridge is asked to carry).
  A sag, a force, a part count and a length get no numeral: each would be a reading of how well the child's work did. No numeral is drawn in this run.
- **`ctx.childAge`:** sets only where a first visit starts in the designed order. Younger than 11, or `null`: the first position, `plank-gap`. 11 or older: `first-triangle`. A saved position wins over the age, and every sheet, part and vehicle is reachable by play at any age.

## The toy

**The action: drag from one pin to another and a balsa part is laid between them.**

- **On touch-down**, in the same frame: the nearest grid point takes a pin with a small click, the pin's shadow jumps, and every part already on that pin shivers.
- **While dragging:** the part grows from the pin under the finger with a dry creak whose pitch falls as the part gets longer. Its free end snaps from grid point to grid point with a tick each time, and what is already built leans toward the new weight a little.
- **On lift:** the part drops onto the sheet with a clack pitched by its length, its hard shadow lands a beat later, and the whole build settles under the new weight: it dips, overshoots and comes to rest where the model says it rests. A build that cannot hold its shape folds slowly, like a deckchair, and lies where it lands.
- **Tap any part** and it is plucked: a taut thread twangs high, a slack one flops, a squeezed stick knocks, a bent plank groans. The pitch follows the force in that part, so a finished build is also an instrument.
- **In an empty scene** with no gap and no vehicle this is already a pleasure: sticks clack down, shapes hold or fold, and plucking them plays what they carry. Random dragging always makes something that stands, sags or folds, and the simplest use (one plank across two pins) always works.
- **A watcher** sees a child laying sticks between pins and flicking them.

The feel comes from the demo `draw-a-bridge`: a line the finger makes becomes a solid thing with weight that lands with a thud. The verb is new: the demo's stroke was free-hand, and here a part runs from pin to pin, because the joints and the lengths are what the child reasons about.

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
