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

The child has one tool, chalk, and five kinds of mark. A mark's kind is read from its shape after it is made; the child never picks one from a menu. The grid is what each kind of mark does to each of the six things it can land on. Two rules fill it, and they never change: **the form of the mark is the form of the ride**, and **chalk laid on a thing chalks that thing**.

The kinds of mark: a **tap** (a dot), a **line** (straight or bending, flat or sloping), a **zigzag** (sharp corners back and forth), a **loop** (the line crosses itself going round), and a **scribble** (a lot of chalk in a small place).

| Lands on | Tap | Line | Zigzag | Loop | Scribble |
| --- | --- | --- | --- | --- | --- |
| **Bare tar** | A dot with a dust puff and a dry tick. The engine trundles over, bumping, and sits on it with a hoot. | A rail with sleepers. The engine gathers speed, smoke streaming, long whistle; it leans on bends and chuffs up slopes. | A clack at every corner. The wagons bunch and spring apart, and the engine hiccups a toot at each point. | Loop the loop. The engine rides upside down, its funnel cap drops and lands back on, and the whistle swoops up and down. | A chalk thicket. The engine burrows in, spins about, bursts out white with dust and sneezes. |
| **The engine** | A smoke ring, crossed eyes and a small poot. | Pulled away: it leaps onto the line with spinning wheels and a screech, front wheels lifting. | Striped in that chalk. It wriggles and giggles in stuttering toots, and keeps the stripes until it next meets water. | Lassoed. It spins once on the spot with a kettle whistle and spiral eyes. | Lost in a dust cloud. It shakes like a wet dog, dust flies, and it coughs one grey puff. |
| **A rider** | Its own trick: the frog hop-croaks, the chick flaps and trills, the snail pops in and out of its shell, the cat stretches and chirps. | The train comes to it. A waiting rider climbs aboard in its own way; a rider at home leans out and greets the train. | Tickled. It is bounced along the corners as on stepping stones, squeaking in its own voice. | A chalk hoop. The rider spins it round its middle three times, humming, then lets it drop, and the ring stays on the tar. | Dusted pale. It sneezes its own sneeze and shakes itself clean. |
| **The puddle** | A plop, spreading rings and one drop that jumps. | The chalk goes dark and smeary where it is wet. The train drives through with a bow wave and a hiss and leaves wet wheel prints that dry. | A skipping splash at each crossing of the water, like a skimmed stone: plip, plip, plip. | A dry road round the water. The train circles it leaning in, its reflection rides upside down in the puddle, and the whistle echoes. | The chalk melts in. The water swirls into that pastel with a glug, and a train that next goes through comes out tinted and leaves coloured prints. |
| **The dandelion in the crack** | The seed head bursts with a soft puff and the seeds drift off. A new head grows back while the child watches. | The train brushes past. The stalk bends flat and twangs back. | The stalk is batted left and right at every pass, a tick-tock of twangs. | A chalk garden ring. Inside it the dandelion opens into a yellow flower and stays open as long as the ring is there. | A furry white tuft of stuck seeds. A train riding through comes out with a seed beard and blows it off with a toot. |
| **A chalk line already there** | Calls the train: it rides the line to that spot at speed and rings its bell. | A crossing. The train goes straight over it with a double clack. | A rumble strip of hatches. The train drums over it and its wagons chatter. | A curl in the line. The train takes the curl as a small loop and carries on. | A knot. The train squeezes through slowly with a creak and pops out with a cork sound. |

Every cell differs in what is seen and in what is heard, and the rules module holds the grid as data with a test that no two cells share a sight or a sound.

**The wrong uses** are the four middle rows. Chalk is for making track, and it can also be drawn on the train, on a rider, in the water and on the weed. Each of those works every time, harms nothing, and is at least as funny as a rail. The rider or the engine that gets chalked is startled or tickled, never hurt, and shakes it off.

**Three secrets**, never hinted and true every time: a line whose two ends meet makes a roundabout that the train circles three times, ending dizzy; a puddle scribbled with chalk tints the train; a ring round the dandelion opens the flower.

**On day 15** the child draws for the one who is riding: a loop because the chick is aboard, corners for the frog, straight through the water for the frog and round it for the cat. The child strings several kinds of mark into one long ride, makes the three secrets on purpose to show someone, and draws lines that are longer and surer than on day 1. For a two-year-old day 15 may look almost like day 1, with the child faster, surer and trying one new kind of mark (pack: game-design, depth-from-combinations.md, its exception).

## The representation

**The idea.** Before a child writes, the child makes marks: dots, lines, wiggles, rounds and scribbles, made for their own sake and then made to tell someone something. The records below carry this as exploring writing through drawing and scribbling, and as finding out that a mark can tell something.

**How it appears in the objects.** The mark is the working object, and it is the child's own. Nothing stands in for it.

- The mark is laid where the finger went and stays as it was made. The game does not straighten it, tidy it or swap it for a neat shape, because the child must be able to see their own gesture on the tar.
- What the mark tells is visible in the mark. The train goes where the line goes and rides as the line is shaped: it turns over where the line loops, clacks where the line has a corner, slows where the line climbs. A child can look at the line and see why the ride went as it did.
- The mark tells someone: the engine and the rider act on it. That is the second half of the idea, a mark used to tell.
- Working objects stay plain (pack: game-design, working-objects-stay-plain.md). The chalk line is a plain dusty line with plain sleepers, on plain grey tar of a contrasting tone. It has no face, no pattern and no idle motion. The look and the comedy are on the engine, the riders, the homes and the ride.

**Done with a finger.** The finger is the chalk. No tool is held, so nothing here is about holding or controlling a tool, and the game does not practise that.

**Evidence.** This is early-years practice without a trial behind it: the research tables of the game-design pack hold no row for mark-making, and no study is cited here for it. The sheet says so and claims no effect.

**Where object, picture and symbol stop.** The band starts below 6, so there is no symbol stage (pack: game-design, fade-to-school-symbols.md, its exception). The order stops at the child's own mark and the picture it makes. No letter is shown, traced, hinted or read at any point, and no mark is ever judged for looking like one.

## The four mechanic questions

- **Swap.** No: the marks are both the content and the control, so if the mark-making were replaced with another subject there would be no way left to play.
- **Attention.** At the moment of decision the child looks at the line coming out under the finger: where it is going, what shape it is taking, and where it stops; there is nothing to aim at and nothing to time.
- **Fun.** The skill is the most enjoyable moment itself: the ride is the child's own mark played back by the train, and play never stops for anything else.
- **Guess.** Yes for moving the train, on purpose: at two every mark must work, so a random tap or scribble always brings the train, and no mark is wrong; what random marks do not give is a chosen ride, since a loop for the chick has to be drawn as a loop.

## The error as a consequence

No mark is wrong, so nothing here is an error in the sense of a wrong answer. What can happen is that a mark does less than the child meant. Each case shows as a consequence in the world, by the one rule of the toy.

- **The line stops short.** The train rides to the open end, brakes, and peers over it. The rider leans out toward its home. The bare tar between the end of the chalk and the home is the gap, in plain view. The child adds a mark; the line already there stays.
- **There is a gap between two marks.** The train leaves the chalk, trundles across the gap slowly and bumpily with its wagons rattling, and picks up speed again on the next chalk. The bump happens exactly where the gap is, and the wheels leave a faint dusty trail across it, so the place stays marked.
- **The line goes somewhere else.** The train goes there too, and waits. Any new mark, anywhere, brings it on.
- **Only taps.** The train trundles from dot to dot. The rider gets home, shaken about by the bumps. Slow and bumpy is the consequence of no line; it is still a ride, and the snail likes it.
- **A form the rider dislikes.** The rider reacts to the thing: the cat's fur stands on end over the corners, the snail hides from the loop. The reaction is to the ride and is as good to watch as a liked one. The ride still counts and the rider still gets home.

In every case the state stays: no mark is removed, nothing resets, no rider is lost, and nothing gives a verdict. There is no buzzer, cross, sad face turned to the child, or cheer. Getting home is also only a consequence: the rider gets out and does what it came for.

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
