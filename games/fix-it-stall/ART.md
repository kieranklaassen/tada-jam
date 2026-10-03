<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

Fix-it Stall is a repair stall on a market lane. Customers bring a lamp, a fan, a bell, a toy car or a toy robot that has stopped. The child lays it on the bench mat, opens it, finds why nothing runs, and makes the circuit whole again with cells, crocodile-clip leads, switches, lamps, motors, buzzers and whatever lies on the bench. A test lamp, which is a lamp with a lead on each leg, lies on the mat as the stall's one tool.

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

Read through the lookup on 2026-10-03. Each jurisdiction stands under its own heading, and nothing below pairs a record of one with a record of the other. Every limit is from that record's Limits; what Limits leaves open is marked as the game's own choice.

### us-ca

Levels, as the lookup prints them for science: age 9, `grade-4`; age 10, `grade-4` and `grade-5`; age 11, `grade-5` and `grade-6`; age 12, `grade-6`. Age mapping: derived. Beside each age the lookup returns the `cross-grade` lane, labelled cross-grade: its statements hold for every grade, not for this age in particular.

Gaps as printed. At age 9: "Grade 3 is not in the pack. A third grader turns nine during the year; grade 4 starts at nine." At age 12: "Grade 7 is not in the pack. A sixth grader turns twelve during the year; a child who starts the school year at twelve is in grade 7."

The game is designed from `grade-4`, `grade-5` and the `cross-grade` lane. The `grade-6` lane holds no record on electricity, and nothing is named in its place.

- `edu.us-ca.grade-4.science.objective.4-ps3-2` (`us-ca 4-PS3-2`): state-board-adopted-standard, confirmed. Level `grade-4`.
  The record's Summary: "The student observes in order to give evidence that energy can move from one place to another, carried by electric currents, heat, light or sound."
  In the game: the beads run from the cell to a lamp, a motor or a buzzer at the far side of the board, and light, warmth, motion or sound appears there and not at the cell.
  Limits taken: energy is not measured in numbers, so nothing on screen puts a number on it. Four carriers are named, and the game shows all four: the current as beads, light as the glow, heat as a lamp's warmth and a shorted lead's glow, sound as the buzzer.
- `edu.us-ca.grade-4.science.objective.4-ps3-4` (`us-ca 4-PS3-4`): state-board-adopted-standard, confirmed. Level `grade-4`.
  The record's Summary, first sentence: "The student applies science ideas to design a device that changes energy from one form into another, tests it, and improves it."
  In the game: a gadget is a device that turns what a cell stores into light, sound or motion; the child tries it on the mat, changes it, and from the position `ticket` on redesigns it to an order.
  Limits taken: devices are kept to two kinds, and the gadgets are all of the kind that uses stored energy to make motion, light or sound. The other kind, motion into electricity, appears only as the blade spun by hand. Left open by Limits: the devices and the constraints in the clarification are examples, so the five gadgets are the game's own choice, and of the example constraints the game uses only materials (the parts on the tray). It sets no time and no cost.
- `edu.us-ca.grade-5.science.objective.5-ps1-3` (`us-ca 5-PS1-3`): state-board-adopted-standard, confirmed. Level `grade-5`.
  In the game: the bench odds are told apart by one property, whether each lets current through, found by putting it in a loop.
  Limits taken: density is left out. Left open by Limits: the materials and properties listed are examples, so the seven bench odds and the one property tested are the game's own choice. The game is designed from this record in part: it tests one example property and measures nothing.
- `edu.us-ca.cross-grade.science.objective.3-5-ets1-3` (`us-ca 3-5-ETS1-3`) [cross-grade]: state-board-adopted-standard, confirmed. Level `cross-grade`.
  In the game: the circuit stays as the child left it, so one thing is changed at a time and its effect is seen at once; the test lamp moved from piece to piece finds where the loop fails.
  Limits taken: it holds for the whole band of grades 3 to 5 and not for one grade; it carries no clarification and no assessment boundary; the tests are fair tests whose aim is to find what to improve. The band it belongs to has no record for grade 6.

### nl

Levels, as the lookup prints them for science: age 9, `fase-2` (sub-band groep 5 or groep 6); age 10, `fase-2` (groep 6) and `fase-3` (groep 7); age 11, `fase-3` (groep 7 or groep 8); age 12, `fase-3` (groep 8). Age mapping: convention. Beside each age the lookup returns the `einde-po` lane, labelled end-of-primary goals: what a school works towards by the end of groep 8, not what a child of this age should master.

Gap as printed, at age 12: "A child who starts the school year at twelve is usually in secondary school, which is not in the pack."

The game is designed from `fase-2`, `fase-3` and the `einde-po` lane.

- `edu.nl.fase-2.science.objective.3dbdc70f-49e7-40d3-b9fa-e8644d532c2c` (`nl ojw/nattech/2/06/fase2`): curriculum-institute-guidance, confirmed. Level `fase-2`.
  In the game's words: getting to know electricity by trying it out, with current that goes round in a closed circuit as the first of its three parts.
  Limits taken: it says what a school offers in fase 2 and names no school year. Of its three parts the game takes the closed circuit only; static electricity, and use and danger, are not in the game. Left open by Limits: no apparatus, no kind of circuit, no symbol and no unit is named, so the parts on the tray are the game's own choice and the game shows no symbol and no unit for electricity.
- `edu.nl.fase-2.science.objective.7c777238-cf10-441b-84be-a92eddd2b2ed` (`nl ojw/nattech/1/02/fase2`): curriculum-institute-guidance, confirmed. Level `fase-2`.
  In the game's words: finding out what materials are like by what can be observed of them, conducting or insulating electricity among the examples.
  Limits taken: it says what a school offers in fase 2 and names no school year; the properties are examples and it is left open which are offered; a property is to be observable. The game takes the one example on electricity, and it is observable there as a lamp that lights or stays dark.
- `edu.nl.fase-3.science.objective.9ac342b5-e074-49d9-8c09-f4921771051e` (`nl ojw/nattech/2/06/fase3`): curriculum-institute-guidance, confirmed. Level `fase-3`.
  In the game's words: investigating electricity, with materials that let current through or do not, and circuits, as the first two of its five parts.
  Limits taken: it says what a school offers in fase 3 and names no school year. Of its five parts the game takes two; the electromagnet, static electricity, and use and danger are not in the game, and the blade spun by hand is the game's own choice. Left open by Limits: no material, kind of circuit, symbol or unit is named, so the bench odds are the game's own choice and nothing is given a unit.
- `edu.nl.einde-po.science.objective.c3d8c8c0-0f94-4dec-8ce6-f52fab27158f` (`nl 42`) [end-of-primary goals]: legal-core-goal, regime 2006, confirmed. Level `einde-po`.
  In the game's words: learning to investigate materials and physical phenomena, with electricity among the examples.
  Limits taken: a 2006 goal that is still in force; its examples are an open list; it names no steps of an investigation, no instrument, no unit and no number, and states no safety condition. The game takes electricity from the list and uses none of the things the goal does not name.
- `edu.nl.einde-po.science.objective.conceptkerndoelen-2027-onderdeel-f-mens-en-natuur-domein-natuurkundige-en-scheikundige-verschijnselen-en-technische-systemen-kerndoel-30-30-a-c` (`nl 30 A c`) [end-of-primary goals]: draft-not-yet-in-force, regime 2027-draft, confirmed. Level `einde-po`.
  In the game's words: saying what each part adds to the working of a thing.
  Limits taken: a draft goal, not in force; its verb is describing; it names no object, system or part. The game has no words, so the child shows what a part adds by putting it in, taking it out and turning it round; that is the game's own choice and less than describing.
- `edu.nl.einde-po.science.objective.conceptkerndoelen-2027-onderdeel-f-mens-en-natuur-domein-natuurkundige-en-scheikundige-verschijnselen-en-technische-systemen-kerndoel-30-30-a-e` (`nl 30 A e`) [end-of-primary goals]: draft-not-yet-in-force, regime 2027-draft, confirmed. Level `einde-po`.
  In the game's words: trying out designing, making and repairing.
  Limits taken: a draft goal, not in force; three activities and no level of mastery; no product, material, tool or safety condition is named, so the gadgets, the parts and the test lamp are the game's own choice.

### Where the two differ

- **The closed circuit.** The Dutch fase 2 record names current going round in a closed circuit. No California record for grades 4 to 6 names a complete circuit, a switch or what a part does: grade 4 names energy carried by electric current and a designed device, with circuits among the examples of its clarification. The game follows nl for the circuit idea and us-ca for its frame, a device that is tried and improved.
- **What lets current through.** The Dutch fase 3 record names it as a part of the goal, and the Dutch fase 2 record has it as an example. The California grade 5 record has it as an example property for telling materials apart. The game follows nl here and is designed from the California record only in part.
- **Finding the break.** California has a cross-grade record on looking at where a model fails, for grades 3 to 5. On the Dutch side only the draft item on repairing is near it, and it is not in force. The game narrows "finding the break" to testing whether the loop is closed and which piece lets current through.
- **The parts.** A cell, a lead, a switch, a lamp, a motor and a buzzer are named by no record of either jurisdiction and are the game's own choice. What each part adds rests only on the Dutch draft item 30 A c, a draft core goal, not in force. Nothing on the California side carries it.
- **Danger.** Both Dutch fase records name the danger of electricity. No California record named here does. The game does not claim it for either.
- **Ages.** The California records are for grade 4, grade 5 and the band of grades 3 to 5, and grade 6 holds nothing on this skill. The Dutch fase records run through groep 8. So for the oldest children the game rests on the Dutch records only.
- **Neither names** a circuit symbol, a unit, or a kind of circuit. The game shows none and names none.

### The claim

Fix-it Stall is designed from two California content standards adopted by the State Board of Education for grade 4 (`us-ca 4-PS3-2` and `us-ca 4-PS3-4`), in part from one for grade 5 (`us-ca 5-PS1-3`), and from one cross-grade engineering design standard for grades 3 to 5 (`us-ca 3-5-ETS1-3`); and from three SLO fase goals, which are curriculum-institute guidance and not law (`nl ojw/nattech/2/06/fase2`, `nl ojw/nattech/1/02/fase2` and `nl ojw/nattech/2/06/fase3`), from core goal 42 of 2006, a legal core goal still in force (`nl 42`), and from two items of a draft core goal, not in force (`nl 30 A c` and `nl 30 A e`). Every record named was `confirmed` when it was read on 2026-10-03. For California the game is designed from the two grade 4 standards on energy and a designed device and is not described as teaching circuits. Nothing here says what a child has reached, and the game is not described as raising attainment.

## The look

Not part of the sheet. First notes from the spike; the full art guide is written at the toy stage.

**The look: Electronics bench**, the first row reserved for this game. The spike is the game's real scene, shown at load: the owl's lantern open on the mat with a cracked trace, a lead clipped across the crack, and the lamp lit. Nothing answers a touch yet (`spike.ts`).

- **Seen from the mender's seat, straight down, in daylight.** A grey mat with a stitched border; beyond it the stall's counter, a pale strip with a metal edge; beyond that the sunlit lane, where customers stand and lean over.
- **The board.** Green solder mask with a darker edge and four mounting holes. Copper traces are a wide stroke with a lighter line down the middle. Every pad is a solder blob: a grey ring, a silver disc, one white glint. A crack is copper stopping short on both sides of a black zigzag.
- **Parts in their real colours, plain.** A charcoal cell with an orange band, a steel base and a button cap, in a black holder. A lamp as a steel collar round pale glass with a filament. A black switch with a steel lever and a red tip. A steel motor can with a yellow end and a clear teal blade. A black buzzer. No faces and no patterns on any of them.
- **Leads.** Insulated wire in red, yellow, green and blue, lying in a lazy bow, with a toothed steel clip and a coloured boot at each end. A short lead bows well clear of what it bridges so the crack under it stays in view.
- **The current.** Pale beads with a copper edge on the metal, where the solved current runs and at its speed.
- **Light.** One soft shadow under each thing, cast down and to the right. A lit lamp is one additive radial sprite, larger and stronger for more current. No brass, no walnut, no dim room.
- **The folk carry the life.** The owl in a navy cap leans over the counter with heavy-lidded yellow eyes. The moth waits at the window with its own lamp. The old hand sleeps at the corner of the mat with her ringed tail out and her mug in reach.
- **Cost.** Everything still is painted once into a layer per size and blitted. A frame draws that layer, two fills for all the beads of a board, one sprite per glow, one figure per blade and the owl's eyes.
- **Tiers.** So far a tier changes the pixel ratio only (`config.ts`), and the still layer is repainted at the new ratio.
