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
- Clip both ends of a lead onto one pad and it makes a loop of nothing, which sags and twangs.
- Every further lead changes what runs: a second path, a short way round, a longer way round.

**Sound and motion.** The clack of a clip is pitched by where it bites (a pad, a leg, the cell's cap). The lead has weight: it swings, overshoots and settles. The hum, the lamp's ring and the beads start in the frame the loop closes. Random clipping always does something: a clack and a swinging lead at the least, a lit lamp or a popped flag at the most.

**Why it is a pleasure with no goal.** One small bite of a clip makes a whole loop come alive at once, far from the finger, and one lead taken away makes it all stop. Making and breaking the loop is the pleasure, and it is the same act every repair is made of. A person watching can tell in three seconds what the child is doing: joining metal to metal until something lights (pack: game-design, toy-first.md; pack: game-design, touch-answers-bigger-than-the-touch.md).

## The object-by-action grid, and what is new on day 15

Seven objects by five actions. Every result is what the solved circuit does, so a result found once stays true. The wrong use is marked **W**.

**Cell** (the source)

| Action | What happens |
| --- | --- |
| Clip it into a loop | The loop goes live: beads leave its cap, run all the way round and come back in, and a hum starts. |
| Turn it round | It tumbles end over end with a thunk and the beads run the other way. A motor in the loop spins backwards; a lamp does not care. |
| Add a second | Nose to tail: beads faster, lamp brighter, hum higher. Side by side: nothing changes. **W** nose to nose: the two lean on each other like arm-wrestlers, the beads shiver on the spot, and nothing runs. |
| Lead straight across it | **W** A short: the lead glows orange, the cell puffs warm air, its cutout flag pops up with a pock, and the old hand's whiskers stand out. A tap on the flag sets it back. |
| Flick it | It hops on the mat with a thud. A flat cell bounces twice with a hollow tock, as a flat cell really does. Never hinted. |

**Lead** (the conductor)

| Action | What happens |
| --- | --- |
| Clip it into a loop | Two clacks, the gap is closed, the loop runs. |
| Turn it round | The clips swap ends with a double clack and a flourish. Nothing changes, and it is played straight. |
| Add a second | End to end: the same loop by a longer way round, and the lid will bulge. **W** both clips on one pad: a loop of nothing, which sags and twangs. |
| Lead straight across it | The two leads share the beads, each carrying half, and plait themselves together. |
| Flick it | It swings and twangs like a slack string, lower the longer it is. |

**Switch** (a gap the child chooses)

| Action | What happens |
| --- | --- |
| Clip it into a loop | Lever up, the loop is open and everything stops; lever down, it runs. |
| Turn it round | It spins on its base with a ratchet and now throws the other way. Nothing else changes. |
| Add a second | In a row: both must be down. Side by side: either will do, so one lamp is worked from two places. |
| Lead straight across it | **W** Always on. The lever clicks to no effect, and a customer who wants it off flicks it faster and faster. |
| Flick it | The lever throws with a clack and the loop opens or closes in that frame. |

**Lamp** (turns the current into light and warmth)

| Action | What happens |
| --- | --- |
| Clip it into a loop | The glass rings once and the filament glows by how much runs through it: dull red for little, white for much. |
| Turn it round | It is unscrewed and screwed back with a squeak. The glow is the same either way. |
| Add a second | In a row: both dim, and the beads slow everywhere in the loop. Side by side: both at full glow, and the beads leave the cell twice as thick. **W** three cells on one lamp: it flares, goes pik, and the glass turns smoky. It is now a blown lamp, which is a gap, and the tray has more. |
| Lead straight across it | It goes dark while everything else in the loop runs harder. **W** if it was the only thing in the loop, that is a short and the flag pops. |
| Flick it | It rings like a glass and the filament quivers. A blown lamp rattles. |

**Motor** (turns the current into motion; a fan blade or a wheel sits on its shaft)

| Action | What happens |
| --- | --- |
| Clip it into a loop | It spins with a whirr pitched by its speed. A fan blows the lead ends about, rolls the loose things on the mat and ruffles whoever stands at the window. |
| Turn it round | **W** It spins the other way: a fan sucks, so scarves and whiskers lean in, and a toy car backs into its owner's foot. |
| Add a second | In a row: both lazy. Side by side: both at full speed. |
| Lead straight across it | It coasts down with a falling whirr while the rest of the loop runs harder. |
| Flick it | The blade freewheels and ticks to a stop. With a lamp in its loop and no cell, the lamp glints while the blade turns: a spun motor is a source. Never hinted. |

**Buzzer** (turns the current into sound)

| Action | What happens |
| --- | --- |
| Clip it into a loop | It rasps, higher and harder with more current, its arm blurs, and the dust on the mat jumps round it. |
| Turn it round | It hops round on its feet with a tinny rattle. The rasp is the same. |
| Add a second | In a row: both mutter. Side by side: both at full rasp a hair apart in pitch, so they throb against each other. |
| Lead straight across it | It is cut off in the middle of a rasp with a hiccup. |
| Flick it | One dull tink of its tin cap. |

**Bench odds** (a spoon, a key, a ball of foil, a pencil, a rubber, a wooden stick, a piece of string)

| Action | What happens |
| --- | --- |
| Clip it into a loop | The spoon, the key and the foil pass everything. The pencil passes a little through its graphite, so a lamp glows dull. The rubber, the stick and the string pass nothing. |
| Turn it round | The same either way, each with its own clatter. |
| Add a second | In a row: one thing that blocks, anywhere in the loop, stops the whole loop. Side by side: one thing that passes is enough. |
| Lead straight across it | **W** Whatever it was no longer matters: a rubber with a lead across it "works". |
| Flick it | Each sounds as its material: the spoon sings, the key jingles, the foil crackles, the pencil tocks, the rubber wobbles without a sound, the stick clacks, the string flops. |

**On day 15** the child reads a board before touching it and fetches the test lamp only where it is needed; tunes one gadget to one customer (dim for the owl, two cells for the moth); and keeps contraptions of their own running on the stall's sign board, such as a lamp worked from two switches, a fan and a bell on one cell, or a blade spun by hand that makes a lamp glint. None of that is new content: it is the same seven objects, combined (pack: game-design, depth-from-combinations.md; pack: game-design, liveliness-from-causing-and-comedy.md).

## The representation

**The idea.** A thing runs only when there is an unbroken way round: out of a source, through the thing, and back into the source. What the current carries from the source arrives as light, sound or motion. Some materials let it through and some do not.

**How it appears in the objects.** It was chosen before the stall, the customers or the look.

- **The loop is a ring of metal the child can trace with a finger.** The gadget lies open and is seen from straight above: copper traces, solder pads, the legs of parts, and leads. The way the current goes is the way the metal goes. A break in the idea is a break in the metal: a crack, a loose clip, a blown filament, a flat cell, or a rubber where metal should be.
- **The current is a row of beads on the metal.** Beads move only where the solved current is not zero, and their speed is that current. They run all the way round at one speed, as many come back into the cell as left it, they divide at a fork and join again after it, and they move everywhere in the loop in the same frame or nowhere. No bead is used up in a lamp. What the lamp takes out of the current is shown as what it gives: glow and warmth falling on the mat.
- **A source has two different ends.** The cap and the base of a cell differ in shape and colour, and turning the cell round is an action.
- **"More" is never a number.** More current is faster beads, a whiter filament, a quicker blade, a higher rasp.

**Where the model is true, and where it stops.** Every result on screen is computed from the circuit as it lies: ideal parts of fixed resistance on steady direct current, solved again at every change. Nothing is scripted to light. It leaves out, and does not claim: cells running down (no clock runs), a filament's resistance changing as it heats, magnetism and static electricity. The beads are the one invented thing. Current cannot be seen, and the beads stand for it as the arrows in a school drawing do.

**Its support.** A bench of cells, leads and lamps is school practice. The table at the end of the pack's `research/learning-games-that-work.md` lists "build and run" circuits for this skill, with support from a secondary summary of another build-and-run physics game. No trial of this representation for circuits is cited there, so it is school practice without a trial of its own behind it (pack: game-design, representation-before-game.md).

**Where object, picture and symbol stop** (pack: game-design, fade-to-school-symbols.md).

- **Object.** Every part is itself, drawn as itself, in every position of the designed order.
- **Picture.** From the position `ticket` on, a customer may bring an order ticket: a small card clipped to the gadget that draws the parts asked for, such as two lamps.
- **Symbol.** One place only: on that ticket, a numeral lies beside the drawn group it counts (two drawn lamps, and the numeral for two beside them). It names a quantity that is asked for, the drawing carries the order without it, and play never depends on reading it. The range is 1 to 3 and is the game's own choice; no record names a number. In the pure rules it is `Ticket.count`. None is drawn in this run: the module that draws numerals, `symbols.ts`, comes from the lead.
- **Not used.** School circuit symbols: none is in the jam's list of signs, and no record the game rests on names them. A meter, a gauge or any reading on the object: brighter and faster are seen, never read off. The plus and minus signs printed on a real cell: see "For the owner to decide" in `REFINEMENT.md`.

## The four mechanic questions

- **Swap.** No: the play is the loop itself, so taking the circuit out leaves no game, and another subject would need other objects and other rules.
- **Attention.** At the moment of decision the child looks at where the metal runs and thinks about whether there is an unbroken way out of the cell, through the lamp, motor or buzzer, and back, and which piece on that way does not let current through.
- **Fun.** The skill is used in the best moment of play, when the last clip bites and the dead thing starts up in that frame; nothing stops for a question.
- **Guess.** Only at the first position, where the gap can be seen and any lead across it works; from the third position on the break cannot be seen, a lead clipped at random most often makes a short that pops the flag, and a child who clips the test lamp across every piece in turn is not guessing but running the test the skill consists of.

(pack: game-design, the-mechanic-is-the-school-skill.md)

## The error as a consequence

The game runs what the child built and shows what it does. Nothing gives a verdict: no buzzer for a mistake, no cross, no face turned to the child. Each consequence below is the solved circuit's own.

| What the child did | What the world does | Where and why it shows |
| --- | --- | --- |
| Left a gap in the loop | Nothing runs, anywhere. No bead moves. | The test lamp, which is a lamp with a lead on each leg, glows dully when it is clipped across the break: there it closes the loop through the rest of the gadget. Across a sound piece of a dead loop it stays dark. So the break is the one place where something put across it comes alive. Clipped straight across a cell, the same lamp shows whether that cell is flat. |
| Made a way round that misses the load | A short. The leads on that way glow orange, the cell puffs, and its cutout flag pops. | The glow marks exactly the way the current took, and nothing on it is a lamp, a motor or a buzzer. The flag stays up until it is tapped, and pops again while the short is still there. |
| Put a source in backwards | A motor spins the other way: a fan sucks, a car backs up. Two cells nose to nose push against each other and nothing runs. | The beads run the other way, and the two cells lean on each other at the place where they meet. |
| Put in too many cells | A lamp flares and pops, and its glass goes smoky. A motor screams and the fan walks across the mat. | The blown lamp is now the gap, and it rattles when flicked. The tray always has another lamp. |
| Used a thing that does not let current through | Nothing runs. | The beads never start, and the test lamp clipped across the thing glows: the thing is the break. |
| Handed back a gadget that does not run | The customer tries it, nothing happens, and they put it back on the mat with the lid open. | The gadget lies as the child left it. |

**The state stays.** Every lead and part is where the child put it after any of these. The child changes one thing and sees at once what that one thing did. Nothing is reset, nothing is taken away, and a popped flag or a blown lamp costs a tap or a new lamp from a tray that never runs out.

**It thins.** The old hand shows a neat way only once for each new idea ("The scenes"). After that the circuit's own behaviour is the only feedback.

(pack: game-design, errors-show-as-consequences.md)

## The designed order, and what is stored

**One cycle** is one customer: the gadget comes onto the mat, is opened, mended, and handed back. It takes a few minutes and is whole in one short visit (pack: game-design, many-short-visits.md).

**The order.** Ten positions, each adding one idea to those before it, then combinations. The ids are the ones in `LADDER` in `config.ts`; each names a place in the game's own order and nothing else.

| Id | What the customer's gadget has | The one new idea |
| --- | --- | --- |
| `gap` | One loop of a cell and one lamp, motor or buzzer, with one break in plain sight: a cracked trace or a clip that has come off. | The way round must be closed. |
| `switch` | The same, with a switch in the loop left up. | A switch is a gap made on purpose, and is told from a break. |
| `flat` | Nothing to see: the cell is flat. | A loop needs a source that pushes. |
| `dead` | Nothing to see: the lamp is blown, or the motor or buzzer is open inside. | A part can be the gap. |
| `stuff` | An earlier mend with the wrong thing: a rubber, a stick or a string joins two pads. | Some materials let current through and some do not. |
| `backwards` | A motor that turns the wrong way, or two cells nose to nose. | A source has a direction. |
| `short` | A scrap of foil lies across two pads, and the flag pops whenever the gadget is switched on. | A way round that misses the load. |
| `branch` | Two things on one cell, such as a robot's eyes and its arm, of which one runs and one does not. | Two loops can share one source, and each must be closed. |
| `double` | Two breaks of different kinds already met. | Kinds are mixed, so the child has to decide which kinds these are. |
| `ticket` | Breaks of kinds already met, and an order ticket asking for a change: a second lamp, a switch, another cell. | Redesign: several answers work, and they do different things. |

From `flat` on, a position lays out its own kind of break two times in three and an earlier kind otherwise, in whichever gadget and for whichever customer the seeded stream draws. The rules never change, so what a child finds out stays true (pack: game-design, ordered-challenges-high-success.md).

**Most attempts succeed.** The gadget is live on the mat the moment its loop closes, so the child sees it run before handing it back.

**How a cycle is judged.** The game's own call, made when the gadget is handed back or sent away:

- **Well:** it ran the first time it was handed back.
- **Mixed:** it ran, on a later hand-back.
- **Badly:** the child called the next customer while the gadget had not run for its owner, who shrugs and takes it as it is.

"Ran" means every lamp, motor and buzzer the gadget came with carries current when its owner switches it on, a motor turns the way the gadget needs, and no flag pops. The ticket and the tastes never enter the judgement: any repair that works stands. The position moves one step up after a cycle that went well, one down after one that went badly, and not at all after a mixed one or at either end. Nothing on screen shows the position or that it moved, and no clock is read.

**Which customer a new position lays out: the customer after next.** A job (who, which gadget, the breaks inside it, the ticket) is laid out when its customer steps up to wait at the window, from the position stored at that moment. When a cycle is judged, the customer who waits was laid out before it, so a moved position first shows in the customer who steps up after them. On a first visit the customer at the bench and the one at the window are both laid out from the starting position.

**The harder thing the child may always pick: the stall's own sign.** A board three times the size of any gadget hangs at the back of the stall: several lamps, a fan and a bell on two cells, broken in several ways from the first day. It looks harder because it is bigger and has more on it. A touch brings it down onto the mat in place of the customer's gadget, and another puts it back. It belongs to no customer, is never handed back and never judged, and it moves no position. It is also the free place to build: whatever the child makes of it stays and keeps running above the bench.

**"A neater one is visibly neater."** Neatness is seen on the gadget, never counted. A mend with one short lead lets the lid shut flat. More leads, long ones and loose ends make the lid bulge, and past a point it will not shut: the gadget goes home held by a rubber band with leads trailing. Both run, and both stand.

**What is stored.** Small plain JSON, versioned, read defensively field by field:

| Field | What it holds |
| --- | --- |
| `v` | The version of the shape. |
| `position` | An id from the ladder: where the next job is laid out from. |
| `finished` | The cycle on screen has ended: its customer stands with the gadget as it was handed back, nothing replays on load, and the next cycle starts on the child's touch. |
| `stream` | The state of the seeded stream that jobs are laid out from, so a reload deals nothing new. |
| `job` | The customer at the bench: who, which gadget, its circuit, its ticket or none, whether its lid is open, and whether a hand-back has already failed (`missed`). |
| `next` | The customer at the window, in the same shape, as laid out. |
| `sign` | The circuit of the stall's sign. |
| `onMat` | Which board lies on the mat: the job's or the sign. |
| `shown` | The ids of the ideas whose neat way has been shown. |

A circuit is stored as the gadget's kind, which of its traces are cracked, its parts (kind, the two pads, and whichever of these applies: a switch's lever, a flat cell, a popped flag, a blown lamp, a part open inside, what a bench odd is made of) and its leads (the two pads, or one pad and a loose end). Nothing in the hand is stored: a lead counts from the frame its first clip bites, with its other end loose on the mat. The beads, the glow and a spinning blade are a view of the stored circuit and are not stored. No date, no duration, no count of visits or repairs is kept anywhere. The largest legal state is held under half of the 64 KB cap by a test ("Found as left" in the guide).

## The characters and their fixed tastes

Every customer has the same visible want: the thing they brought, running. They hold it, try its switch and peer into it. What differs is what each likes it to do. The tastes below never change, so a child can learn them and test them on purpose. A reaction is to the exact gadget as handed back (how bright, how fast and which way, how loud, whether it can be switched off, how the lid sits, what was used in the mend), it starts within a few hundred milliseconds, and it is never about the child: no thanks, no praise, no disappointment turned outward. A dislike is as good to watch as a like.

| Character | Likes | Dislikes |
| --- | --- | --- |
| **The owl**, a night watchman | A dim glow. A switch, so the thing can be put out at dawn. | Glare: pulls the cap down and turns the head right round. |
| **The moth**, who cannot leave a lamp alone | The brightest lamp there is, and more lamps. | A fan's wind: pinned flat to the stall post. The dark: droops. |
| **The yak**, always too hot under all that hair | A strong wind in the face, hair streaming. | A fan that sucks: the fringe goes in and she has to back out of it. A hot bright lamp: wilts. |
| **The tortoise**, who has all the time there is | Slow and soft: a lazy blade, a muttering buzzer, a car that creeps. | Anything fast or sudden: head and legs go in. A popped flag keeps him in for a beat longer. |
| **The cockatoo**, loud | The loudest rasp, which it joins and drowns out. Two buzzers throbbing. | Silence: taps the gadget and sulks at it. A lamp going out: asleep at once. |
| **The magpie**, a collector who cannot bear a mess | A lid shut flat. Anything shiny used in the mend, which it tries to keep. | Trailing leads, which it picks at. The rubber band. |

**The old hand** is not a customer. An old raccoon who has kept the stall for ever dozes on a stool beside the bench with a mug. Her want is her nap. Her whiskers stand out at a short, an ear turns to a new sound, a fan's wind lifts her fur, and a pop makes her spill a little. Once for each new idea she shows a neat way on a practice board of her own ("The scenes"). She never turns to the child, never explains, and never rates a mend.

No two characters share a movement: each has its own tempo, weight and funniest part (the owl's head, the moth's flutter, the yak's fringe, the tortoise's neck, the cockatoo's crest, the magpie's hop, the raccoon's whiskers). The parts on the bench are working pieces and stay plain: no faces, and no motion beyond what the circuit gives them (pack: game-design, characters-with-opinions.md; pack: game-design, working-objects-stay-plain.md).

## The scenes

Every scene is a list of timed beats over game time, filled in from the state of play, and any touch ends it at its last pose. A scene's outcome is saved when it starts, so a put-away in the middle loses nothing and nothing replays on load.

**1. The hand-back** (the consequence; every cycle; 5 to 8 seconds).

- **Cause.** The child drags the gadget to its owner, or taps the owner's open hands.
- **Beats.** The owner takes it. The lid is shut as far as it will go: flat, bulging, or held by a rubber band. The owner finds the switch and throws it. The gadget does exactly what its solved circuit does. The owner reacts by taste. The owner settles, holding it as it runs.
- **Filled in from.** The circuit as handed back (how bright each lamp, how fast and which way each blade, how loud each buzzer, whether a flag pops), how the lid sits, anything shiny in the mend, and the ticket.
- **When it does not run.** The owner throws the switch twice, peers in, and lays the gadget back on the mat with the lid open. The cycle goes on.

**2. The neat way** (a new idea shown after the child's own attempt; once for each idea; 4 to 6 seconds).

- **Cause.** The first hand-back that ran at a position whose idea is not yet in `shown`. It follows the hand-back scene.
- **Beats.** The old hand reaches to the practice board that hangs beside her, which carries the same kind of break. She makes the mend in one plain move: one short lead across a crack, or the test lamp across the cell and then a fresh cell. Her board runs. She goes back to her mug.
- **Filled in from.** The idea, and the kind of gadget just mended.
- **Why it is not a solution.** It comes after the child's own mend has been handed back, so it is never the answer to a problem in front of the child. The child's mend is still in its owner's hands beside her board, and the two can be compared. It is a move in the world, with no word and no look toward the child (pack: game-design, guided-discovery.md).

**3. Secrets.** Particular combinations always give a particular hand-back, are never hinted at and are counted nowhere: two buzzers side by side for the cockatoo become a duet it conducts; a fan that sucks, handed to the moth, takes the moth for a ride round the blade; a mend made with the spoon sends the magpie off with the spoon and the gadget both, and a new spoon is on the bench (pack: game-design, hidden-never-counted.md).

**How a cycle ends.** The hand-back's last pose is the ending: the owner stands at the lane side of the stall with the gadget running, for as long as the child likes. If the child does nothing, nothing new starts.

**How the next one starts.** The next customer is already at the window, busy with something of their own (the owl dozing, the moth circling the stall lamp), and never hurries the child or looks put out. A touch on that customer starts the next cycle: the one who is finished walks off down the lane with the gadget still running, the one at the window comes to the bench, and a new one steps up to the window. On load no scene replays: the world is as the last scene left it, with the next customer waiting.

**The sign has no ending.** It is open building. Tidying is calm: a part dropped on the tray goes back into it, and a lead dropped on the coil winds itself up.

(pack: game-design, endings-and-short-scenes.md; "How a cycle restarts" in the guide)

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
