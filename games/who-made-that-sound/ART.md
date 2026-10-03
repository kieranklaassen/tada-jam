<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 2 to 4, and its youngest age, 2, governs every choice below.

- **The cue table.** The table in wordless clarity has no row below 3, so its 3 to 4 row is the ceiling and the game cuts further. From its "Avoid" column, as hard constraints: no text, numeral or pictorial icon that has to be decoded; no spoken instruction; no verdict; never several activities live at once; nothing on screen before it means something. One next act is offered at a time.
- **The pack's rule for the age** (pack: game-design, ages-2-to-4.md). Everything works with a tap, and the game has no drag, pinch, tilt, shake or double tap. A thing that is tapped twice is tapped two separate times, with any wait between them. Every target is about 100 logical pixels across or more, the targets stand well apart, and none is in the bottom strip. One loved action is offered again and again: uncovering someone who hides. A whole cycle fits in one to three minutes, and never more than four things are hidden at once. Every touch is answered and there is no dead end: tapping at random opens every hide in the end.
- **Symbols.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, and the game has no `symbols.ts`. The creatures have ids in the code and no name on screen. Their voices are invented and synthesized: no speech, no word, and nothing spoken that instructs.
- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order: the first place, `two-eggs`, for a child of 2 or 3, for a younger child and for no age (`null`); the second place, `three-eggs`, for a child of 4 or older. A saved place always wins over the age, every place can be reached by play at any age, and nothing is hidden or locked by age.

## The toy

**The action the finger performs most: a tap on a hide.** Someone is inside an egg, and the tap brings them out.

In an otherwise empty scene there is a row of plain eggs on a plain ground.

- **The first tap on an egg.** When the finger lands the egg squashes and the one inside calls in its own voice, heard softer through the shell. The egg moves in the shape of that call while it sounds: it leaves the ground higher for a higher voice, it moves for as long as the call lasts, it shivers for a warble, it hops twice for two notes. A crack opens and two eyes blink out of the dark. The eggs beside it lean towards it.
- **The second tap on the same egg.** It bursts. The one inside springs out with an entrance of its own, calls again in the open, louder and at the same pitch, and the shell flutters down as scraps of tissue. It then stands on the hill behind.
- **A tap on anyone who is out.** They call again and do their own trick, never twice the same way in a row.

Why it is a pleasure with no goal: it is peekaboo with a voice. Every egg is a small question (who is in there?) that the child answers with their own finger, the answer is a different body and a different sound each time, and the two taps make a wait and then a burst. Tapping at random always lets someone out, and nothing a tap does is a punishment. Someone watching can tell within three seconds what the child is doing: letting the hidden ones out. The eggs answer on touch-down, in the same frame, and the answer is a chain: squash, call, crack, eyes, the neighbours leaning in (pack: game-design, toy-first.md; pack: game-design, touch-answers-bigger-than-the-touch.md).

The toy is judged first and alone, with no caller and nobody to find. The listening game is built on it only if tapping the eggs is a pleasure by itself.

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
