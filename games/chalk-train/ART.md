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

**A cycle** is one layout played through: every rider of the layout is taken from its stop to its home. Each layout sets out one thing the world offers, never demands: the bare tar between the train, a waiting rider and that rider's home.

**The order,** one new thing at a time and then combinations. The ids are the ones in `LADDER` in `config.ts`; each names what is laid out, in the game's own words.

1. `short-hop`: one rider waits right beside the train, and its home is a short way off on level tar. One short mark does it.
2. `long-way`: the home is across the tar. New: distance, so a long line or several marks end to end.
3. `up-and-down`: the home is higher or lower than the stop. New: slope.
4. `round-the-water`: the puddle lies between the stop and the home. New: the puddle, to go through or round.
5. `far-rider`: the rider waits away from the train. New: fetching, a second leg.
6. `two-at-once`: two riders wait at two stops, each with its own home, and the train has two wagons. A combination of everything before, in any order the child likes.

The puddle and the dandelion are part of the tar from the first visit and can be drawn on at every position; a layout only decides whether the puddle lies on the way.

**The harder option the child can see and pick.** From the second cycle on, the next rider is already waiting on the tar. The child may fetch it before taking the current rider home and carry both at once. It is farther away, so it looks like more, and it is never asked for.

**How a cycle is judged.** The game's own call: by how much of the riders' way from stop to home was ridden on chalk, by distance.

- **Well:** three quarters or more on chalk. The position moves one step up.
- **Badly:** a quarter or less on chalk, which is a trip made almost wholly of taps. The position moves one step down, so the next layout but one is a shorter way.
- **Mixed:** anything between. The position stays.

No clock is read. The position moves when the ending starts, never inside a cycle, and a visit put away with no finished cycle leaves it where it was. Nothing on screen shows the position or that it moved.

**Which rider a new position lays out.** The next rider waits on screen while the child works, laid out before the current cycle was judged. So a moved position shows on the rider after next: that rider is drawn in at its stop when the child's first mark begins the next cycle, from the position as it stands then.

**A first showing.** On the very first cycle the waiting rider shows the one new idea once, inside the scene and without words: it scrapes a short chalk line from the engine's rail about a third of the way toward its home, drops the stub of chalk, which crumbles away, and climbs aboard; the engine rides to the end of that line and peers over. Any touch ends the showing at once. It is stored as shown and never plays again. No later position needs a showing: its new thing is where things lie, and every mark already works there.

**What is stored.** Plain JSON through `ctx.storage`, versioned, read field by field.

- `v`: the version of the saved shape.
- `position`: an id from the ladder; an unknown id falls back to the first-visit default.
- `finished`: the cycle on screen has ended and its ending stands.
- `seed`: the state of the one random stream that picks layouts, so a layout is the same when found again.
- `marks`: the chalk on the tar, oldest first, each a chalk colour and a run of whole-number points in the tar's own units. At most 14 marks and 1200 points in all; a mark past the cap rubs out the oldest, which has been growing paler as newer marks were made. A mark's kind is read from its shape and is not stored.
- `train`: where the train stands and which way it faces, with its stripes and its tint from the puddle, each a chalk colour or none. A ride in progress is not stored: the train is saved where that ride comes to rest.
- `water`: the puddle's colour, a chalk colour or none.
- `riders`: at most four, each with its kind, its stop, its home, where it is (at the stop, aboard, or home), how far its trip has gone on chalk and on bare tar, and what the ride has done to it so far (small capped tallies of fast runs, corners, loops, splashes, bumps and scribbles), from which the ending is built.
- `chalk`: the colour the next mark takes, the next of five pastels in a fixed order.
- `shown`: the first showing has played.

Whether the dandelion is in flower is read from the marks and not stored. A largest legal state is held under half of the 64 KB cap by a test.

## The characters and their fixed tastes

Five characters. Each reacts to the exact ride the child drew, as it happens, and the reactions are the only feedback in the game. A taste never changes, so a child can learn it and test it on purpose. A reaction is always to the ride and never about the child.

What a ride can do to a rider, read from the marks: a **fast run** (a long straight line), a **corner** (a zigzag point), a **loop**, a **splash** (chalk through the puddle), a **bump** (bare tar), a **scribble**.

- **The engine.** Wants chalk to ride, and shows it: its eyes follow the finger and it leans toward the nearest chalk. It likes every line. On bare tar it grumbles at the bumps and its cheeks wobble. Steady, heavy, and funniest in its funnel and cheeks.
- **The frog.** Wants its pond. Likes corners (it hops in time with each one and croaks) and splashes (it dives through the spray). Dislikes fast runs (flattened against the wagon back, eyes bulging) and scribbles (the dust makes it sneeze a croak). Springy, light, and funniest in its throat pouch.
- **The chick.** Wants its nest. Likes loops (it flaps and whoops, and feathers fly) and fast runs (wings out like a plane). Dislikes splashes (it puffs into a wet ball and shakes) and bumps (a peep at each one, like hiccups). Quick, very light, and funniest in its stubby wings.
- **The snail.** Wants its lettuce leaf. Likes bumps (the slow way suits it: it hums and its eye stalks sway) and scribbles (it curls up inside one with a sigh). Dislikes loops (it hides, its shell rolls round the wagon, and it peers out with spiral eyes) and fast runs (its eye stalks stream out behind). Slow, heavy, and funniest in its eye stalks.
- **The cat.** Wants its cushion in a patch of sun. Likes fast runs (ears back, a loud purr) and scribbles (it bats at the dust). Dislikes corners (fur on end, tail like a bottle brush) and splashes (it leaps straight up and lands on the engine's funnel). Smooth and then sudden, middling weight, and funniest in its tail.

Every one of the six has a rider that likes it and a rider that dislikes it, and a dislike is as good to watch as a like. A waiting rider looks toward its home and reaches for it; it never hurries the child, complains of waiting, or remarks on the child stopping, leaving or coming back.

## The scenes

Each scene is a list of timed beats on the template's `scene.ts`, filled in from the state of play, and each gives way to any touch: the touch is answered as a normal touch, and everyone in the scene jumps to where the scene would have left them. The outcome of a scene is saved when it starts, so nothing replays on load.

**Getting home** (the ending of a cycle, 5 to 8 seconds).

- Cause: the train reaches a home with that home's rider aboard.
- Beats: the train brakes with a squeal and a squash. The rider gets out the way the ride left it. The rider goes to its thing and does what it came for: the frog dives in with a plop, the chick settles and tucks its head, the snail munches, the cat turns round twice and curls up. The engine lets out one last puff of smoke in the shape of the ride.
- Filled in from the state: how the rider gets out comes from what the ride did to it most (spiral eyes and a wobbling walk after loops, hopping in a zigzag after corners, shaking off water after splashes, fur or feathers blown flat after fast runs, a slow dusty shuffle after scribbles, a jelly-legged wobble after bumps), played as that rider's like or dislike. The shape of the last smoke puff is the most-drawn kind of mark on the way.

**The roundabout** (a secret, 5 to 7 seconds).

- Cause: the train rides a line whose two ends meet. It works every time and is never hinted.
- Beats: three times round, faster each time, then slowing; the train stops where it began with spiral eyes, and each rider aboard reacts once as to a loop.
- Filled in from the state: the size and shape of the child's own ring, and who is aboard.

**The first showing** (once only, 4 to 6 seconds) is described under "The designed order".

**How a cycle ends.** With the last rider of the layout home, the ending stands for as long as the child likes: the riders stay in their homes doing small things, the engine stands and puffs, and the chalk stays. If the child does nothing, nothing new starts. There is no next round by itself and no countdown.

**How the next one starts.** The next rider is already on the tar, waiting at its stop, looking at its own home. It comes in on the child's touch: the child's next mark begins the next cycle, and the rider boards when the train reaches it. When that cycle begins, the rider after it is drawn in at its stop, and the home from two cycles back is rubbed away with its rider's wave, so there are never more than four riders and three stops on the tar. On load the world is as it was left: the same chalk, the train where it came to rest, each rider where it was, and the next one waiting. Nobody refers to the absence.

## The records

The skill is drawing and scribbling as the mark-making that comes before letters, done with a finger. Each record was read again with `npm run -s education:find -- --id <pack id>` on 2026-10-03; standings and check states are as the lookup printed them that day.

### us-ca

Levels, as the lookup prints for reading and language. Age mapping: official.

- Age 2: `infant-toddler`, the indicator for 23 through 36 months. No record of this lane carries making marks, so the game is designed from no California record for a two-year-old and names nothing in its place.
- Age 3: `preschool-tk`, sub-band Early (3 to 4 ½ Years).
- Age 4: `preschool-tk`, sub-bands Early (3 to 4 ½ Years) and Later (4 to 5 ½ Years), which overlap for the whole of age 4.

Gap: none printed. No lane label applies.

- `edu.us-ca.preschool-tk.reading-language.objective.language-and-literacy-development-foundational-language-development-strand-4-0-writing-4-4` (us-ca code 4.4 under Strand 4.0, Writing, of Language and Literacy Development; the code alone matches four records): department-published-foundation, confirmed. The game is designed from its statement for the earlier age only, which the record's Summary gives as: "At the earlier age (3 to 4½ years) the child's writing is scribble that looks like letters or characters and can be told apart from their drawings."
  Limits taken: the earlier statement asks for no real letters, so the game shows, asks for and reads none. The statement for the later age, a few recognisable letters used to mean something, is not used. Matching letters to sounds and the child's own name belong to neighbouring foundations and are not in the game.
  Left open by Limits: no shape of stroke, no tool and no surface is named. The five kinds of mark, the finger and the glass are the game's own choices.
  Short of the record: the game offers scribbling and does not look at whether a child's scribble resembles writing or differs from their drawing. It carries the making of the marks and nothing more.

Read and not used: the foundation on holding drawing and writing tools in the same strand, since a finger on glass holds no tool; and the mathematics foundation on flat shapes, since the game asks for no shape and names none.

### nl

Levels, as the lookup prints for reading and language. Age mapping: convention.

- Ages 2 and 3: `peuters`.
- Age 4: `peuters`, up to the fourth birthday, and `fase-1`, sub-band groep 1. The answer for age 4 also returns the `einde-po` lane, labelled end-of-primary goals; no record of that lane is used.

Gap: none printed. None of the records below is a core goal, so none has a regime.

- `edu.nl.peuters.reading-language.objective.inhoudskaart-nederlandse-taal-peuters-aanvankelijk-schrijven-orientatie-op-geschreven-taal-7` (nl Oriëntatie op geschreven taal / 7): curriculum-institute-guidance, confirmed. In the game's words: exploring writing, mainly through drawing, scribbling, shapes that look like letters and strings of marks.
  Limits taken: it describes what is offered to children of about 2 to 4, not what a child must be able to do; the word is exploring; right spelling and how a pencil is held are not mentioned. The game takes drawing and scribbling from it and leaves out the letter-like shapes and the strings of marks.
  Left open by Limits: no shape of stroke is named. The five kinds of mark are the game's own choice.
- `edu.nl.peuters.reading-language.objective.inhoudskaart-nederlandse-taal-peuters-aanvankelijk-schrijven-orientatie-op-geschreven-taal-3` (nl Oriëntatie op geschreven taal / 3): curriculum-institute-guidance, confirmed. In the game's words: experiencing that drawing and written marks can be used to tell someone something.
  Limits taken: the word is experiencing; it names drawing and marks and asks for no letters.
  Left open by Limits: it does not say with whom. That the mark tells the engine and the riders where and how to go is the game's own choice.
- `edu.nl.fase-1.reading-language.objective.inhoudskaart-nederlandse-taal-fase-1-schrijven-voorbereidend-schrijven-4` (nl Voorbereidend schrijven / 4): curriculum-institute-guidance, confirmed. In the game's words: writing with the child's own graphic means, which the statement lists as drawings, pictograms, scribbles and symbols.
  Limits taken: it describes what a school offers in fase 1 for the youngest children, groep 1 and 2, and nothing says in which year; no letters and no words are named; right spelling is not named. The game takes drawings and scribbles from it. Pictograms, symbols, strings of letters, invented spelling, copying, stamps and typing are not in the game.

Read and not used: the peuter mathematics record on making things with and on paper, since the game claims no mathematics and its surface is not paper.

### Where the two differ

- **Age.** The Dutch peuter guidance covers ages 2 and 3. The California lane for age 2 holds no record on making marks, and the foundation used is for ages 3 and 4. For a two-year-old the game follows the Dutch records alone.
- **What kind of statement.** The California foundation describes what a child's writing looks like at an age. The Dutch records describe what is offered: exploring, experiencing. The game follows the Dutch form: it offers, and it looks at no child.
- **Drawing.** The Dutch peuter record counts drawing among the ways of exploring writing. The California statement speaks of scribble that differs from drawing. The game's marks are drawing and scribbling together, not told apart; it follows the Dutch records there, and from the California foundation it takes only that marks come before letters.
- **Standing.** One is a foundation published by a state department; the others are guidance from the curriculum institute. Neither is a standard or the law, and the sheet treats them as unrelated statements.

### The claim

Chalk Train is designed from one California learning foundation for preschool and transitional kindergarten, a foundation published by the state department of education and not a standard (us-ca 4.4 under Strand 4.0, Writing, its statement for the earlier age only; confirmed), from which it takes scribbling as mark-making before any letter, for ages 3 and 4; and from three statements of the Dutch curriculum institute's content cards for peuters and for fase 1, which are guidance and not law (nl Oriëntatie op geschreven taal / 7 and / 3, and Voorbereidend schrijven / 4; all confirmed), from which it takes exploring writing through drawing and scribbling, and experiencing that a mark can tell someone something, for ages 2 to 4. For a two-year-old it is designed from the Dutch guidance alone. The marks are made with a finger and no tool, no kind of stroke is named by any of these records, and the game shows no letter. It says nothing about what any child can do.

## The look

Written after the style spike, not part of the sheet: the claimed look, the palette, materials, lighting and motion rules, and how each tier in `config.ts` keeps the look.
