<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

Chalk Train: the child draws on a patch of tar with a finger, and a small chalk train rides whatever was drawn.

**Band.** The manifest band is 2 to 4. Its youngest age, two, governs every choice below.

**What governs two.**

- The cue table of wordless clarity has no row below 3. Its 3 to 4 row is taken as the ceiling and cut further (pack: game-design, ages-2-to-4.md). Its "Avoid" column is a hard limit here: no text, numeral or pictorial icon to decode, no spoken instruction, no verdict, never several activities live at once, and no tool on screen before it means anything. So there is no palette, no eraser, no button and no thought bubble. The whole screen is the tar, and the finger is the chalk.
- Everything essential works with a tap. A tap lays a chalk dot and the train comes to it. A drag lays a line, survives a lifted finger (the line simply ends there and stays), and counts when partly done: the train rides however much of it exists.
- No pinch, tilt, shake, double tap or long press. A second finger draws a second line.
- Every touch is answered when the finger lands, and there is no dead end: no mark can be wrong, and the train can always reach any mark.
- Things the child aims at (the train, a rider, a rider's home) are about 100 logical pixels across or more, well apart, and none sits in the bottom strip where wrists rest. Drawing needs no aim at all.
- One loved action, offered again and again: making a line and watching something run along it. A whole cycle (one rider taken home) fits in one to three minutes. Never more than four riders on the tar, and at most three stops at once.
- No symbol of any kind: the band starts below 6, so the game has no `symbols.ts`, and nothing the game draws is a letter, a numeral or a sign. A child's own loop or zigzag may happen to look like a letter; the game neither draws nor reads one.
- No voice instructs. The riders and the engine speak in invented, synthesized sounds.

**What `ctx.childAge` sets.** Only the place in the designed order where a first visit starts: two or younger starts at `short-hop`, three at `long-way`, four or older at `up-and-down` (the places are listed under "The designed order"). `null` starts at `short-hop`, the youngest default. The bottom and top defaults are open-ended. A saved position always wins over the age, and age locks or hides nothing: every mark, every rider's taste and every secret works for every child from the first visit.

## The toy

**The action.** The finger makes a chalk mark on the tar, and the engine rides it.

**In an empty scene** there is only grey tar and the engine, a side-on chalk drawing with a face, standing on a short stub of chalk rail and breathing out small smoke puffs.

- **Finger lands.** In that frame a chalk dot appears under the finger with a puff of dust and a dry tick. The engine's eyes snap to the spot and it gives a short toot.
- **Finger moves.** Chalk comes out under the finger as a dusty, slightly broken line, with a scrape whose pitch follows the finger's speed. Sleepers tick into place along the line a moment behind it. The engine does not wait for the finger to lift: it sets off toward the near end of the new line at once.
- **The ride.** The engine reads the line with its body. On a straight run it gathers speed and its smoke streams back. On a bend it leans. At a sharp corner it clacks and its wagons bunch and spring apart. Uphill it slows and chuffs hard; downhill it runs away with a rising whistle. Round a loop it goes upside down and its funnel cap drops off and lands back on. In a scribble it spins about and comes out dusty and sneezes. A wobbly line gives a wobbly ride, exactly as wobbly as the line.
- **Finger lifts.** The line ends there and stays. The engine rides to the open end, brakes with a squash, peers over the end and puffs.
- **A tap alone.** The dot is enough. The engine rolls off its line and trundles across the bare tar toward the dot, slow and bumpy, cheeks wobbling, and sits on the dot with a small hoot. So tapping anywhere calls the train, and drawing gives it a fast smooth run.
- **A poke at the engine.** It blows a smoke ring and its eyes cross.

**Why it is a pleasure with no goal.** The child causes a big, readable chain with one small act, and the chain is a replay of the child's own gesture: the mark stays on the tar and the engine acts it out, so every different mark is a different ride. Random tapping always calls the train. A watcher can tell in three seconds what the child is doing: drawing track for a train. Nothing is asked, counted or finished; the engine waits at the end of the line for as long as the child likes.

**The one rule of the toy,** which every later part keeps: chalk is smooth and fast, bare tar is slow and bumpy, and the form of the line is the form of the ride.

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
