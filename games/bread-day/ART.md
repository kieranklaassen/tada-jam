<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

The game in one paragraph: a badger's bakery before dawn. The child's finger turns flour and water into dough on the board, works it, warms it and bakes it, and each act changes how the stuff looks and how it answers the finger. Whatever order the child takes has its true result, and every result is some customer's favourite: the goat at the hatch wants the brick the bear cannot bite. The verb is choosing what to do to the material next and seeing what that does to it. Renderer: canvas 2D, as the brief suggests.

## The band and its age rule

- **Band.** The manifest band is 4 to 6, so age 4 governs the design.
- **Cue-table row.** The row for a youngest age of 3 to 4 in the age-band cue table of wordless clarity. Cues the game uses from it: a character showing one move, a breathing glow on what can be touched now, tools that appear when they first mean something, characters who gaze and reach, and materials that correct themselves (a basket a loaf fits or sticks out of). Its "Avoid" column binds the game: no text, numeral or pictorial icon that must be decoded, no spoken instruction, no verdict, never several activities live at once, and no tool on the table before it means anything. So there is no recipe card and no thought bubble with a picture in it: a customer's want is shown by its body and by the basket it carries.
- **Pack rule for the age range.** (pack: game-design, ages-4-to-6.md): pretend play with characters who react, tap and drag only, no double tap, no reading, slapstick in which the victim overreacts and is never hurt.
- **Symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, optional or not, and the game has no `symbols.ts`.
- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order: under 6, or no age, starts at `dough`; 6 or older starts at `shapes`. A saved position wins over the age. Age locks nothing: every position is reached by play from either start, and every tool that a later position brings out can be reached by a child of any age.
- **What `null` gives.** The youngest default, `dough`.

## The toy

**The action.** Pushing a finger into dough on the board. It is the action the finger performs most: mixing and kneading are the same push, and shaping is the same push with a direction.

**In an empty scene.** One cream lump of dough lies on the dark board, and nothing else is there.

- The finger lands and the dough dents under it in the same frame, with a low soft thud. The lump keeps its amount, so a push on one side bulges the other.
- A drag carries the dough along: it piles up ahead of the finger, thins behind it and folds over itself. The squish repeats along the drag, lower for a slow heavy push and higher for a quick one.
- A drag out past the edge pulls a lobe after the finger. It narrows to a neck and snaps back with a wobble, or, once the dough has been worked, tears off as a small piece with a pop. A piece pushed back into the lump joins it again.
- Let go and the lump jiggles and settles. Flour puffs from the board at each hard push, and the board gives a small knock.
- The answer is bigger than the touch: the push bulges the far side, the bulge shoves loose flour, the flour puffs, and the puff drifts and settles as dust that the next drag draws furrows in.

**Why it is a pleasure with no goal.** The dough follows the finger and pushes back, it never does the same thing twice, and it cannot be done wrong: a poke, a slap, a long smear and a frantic scribble all give a different squash and a different sound. Worked dough slowly goes from lumpy and torn to smooth and springy, so the hand feels its own work without anything saying so. Someone watching sees at once that the child is kneading dough.

The demo this comes from asked whether kneading and shaping dough with a finger is a pleasure by itself. The game takes that question as its toy and writes it new.

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
