<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 2 to 4, so the game is designed for a two-year-old and nothing in it may need more than a two-year-old has.

- **The cue-table row.** The table in the wordless-clarity convention has no row below 3. Its 3 to 4 row is taken as the ceiling and cut further: one next act offered, one live want at a time, and nothing to decode. Its "Avoid" column is a hard constraint here: no text, numeral or pictorial icon, no spoken instruction, no verdict, no several activities live at once, and no tool on screen before it means something. The game has one tool, the hose, and it is on the truck from the first frame.
- **The pack's rule for the age** (pack: game-design, ages-2-to-4.md). Everything essential works with a tap. A drag survives a lifted finger and counts when partly done. There is no pinch, tilt, shake or double tap. Each thing in a yard is about 100 logical pixels across or more, they stand well apart, and none sits in the bottom strip of the screen. Whatever looks touchable is touchable: every place on the screen answers a touch. A yard, which is one cycle, fits in one to three minutes. No amount in the game is larger than five: the fullest thing takes five gulps of water.
- **The symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, optional or not, and the game has no `symbols.ts`.
- **What `ctx.childAge` sets.** One default only: where a first visit starts in the designed order. Age 2 or younger, or no age (`null`), starts at the first place, a yard with one thing in it. Age 3 starts at the second place. Age 4 or older starts at the third. A saved position wins over the age, every place is reached by play at any age, and nothing is hidden or locked by age.

## The toy

**The action.** The child touches the yard and the fire truck sends water there. The finger is the place the water lands.

- **A tap is a gulp.** The nozzle swings to the finger, the truck rocks back on its wheels, and one fat blob of water flies in an arc and lands where the finger was with a splash. A gulp is the unit of water for the whole game.
- **A held finger is a stream.** Gulps follow one another into a thick jet. The jet follows the finger as it moves, and the landing point trails a little behind like a real hose. A stream gives one gulp of water about every third of a second.
- **A lifted finger loses nothing.** Water already in the air still lands. A stream that is interrupted and taken up again counts as the same watering.
- **The truck itself** is the one place that takes no water. A touch on it makes it honk, hop on its springs and turn its roof light once.

**In an empty yard.** The yard is pale dry sand. Where water lands the sand turns dark, as wet sand does, and the dark patch has the shape of what the finger did: a blot for a tap, a line for a sweep. The patches dry back to pale over about half a minute of play, edge first, so the sand is never used up and there is always room for more. Drops bounce off the landing point and leave their own small dots.

**The answer starts when the finger lands**, in the same frame: the nozzle snaps round, the truck squashes back, water leaves the nozzle and the hiss of the hose begins. The water itself needs about a quarter of a second to arrive, because it flies.

**Sound.** The hose hisses for as long as water leaves it, pitched by how far the water has to go: a near target is a low gurgle and a far one a higher hiss. Each landing is a soft splat on sand, in several variants picked without repeats and pitched by how much water is already there. The truck creaks on its springs when it rocks. When the child stops, the sound falls to nothing within a second.

**Why it is a pleasure with no goal.** It is a garden hose, and squirting a hose is something a small child does unprompted and for a long time. The finger draws with water on sand. The jet has weight and lag, and so each sweep comes out a little differently. The answer is far bigger than the touch: one tap moves a truck, throws water across the yard and leaves a mark. Random tapping covers the sand with blots, and nothing a child does is wrong. A person watching sees within three seconds that the child is squirting water from a toy fire truck.

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
