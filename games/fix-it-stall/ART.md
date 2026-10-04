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
- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order: no age, or 10 and younger, starts at the first position (`gap`); 11 and older starts at the second (`switch`). A saved position always wins, every position is reached by play at any age, and nothing is locked or hidden by age.
- **What `null` gives.** The first position, as for the youngest.

## The toy

**The action: clip a lead.** The finger lands on a metal pad or a part's leg, and a crocodile clip bites it in that frame with a clack. Dragging pulls a floppy lead out behind the finger. Lifting over another pad makes the second clip bite. Two taps do the same for a child who would rather not drag: the first pad, then the second. A lead let go over nothing drops limp on the mat with its free clip snapping once as it lands, and a ring of dust where it does.

**With no goal**, which is how the toy was first built (a cell, a lamp and a coil of leads on the bare mat) and how the stall's own sign stands for good, since nobody waits for it and nothing is asked of it:

- The moment a lead closes a loop through the cell and the lamp, the lamp is lit: no test button and no wait. Copper-coloured beads run round the whole loop, all at one speed, the lamp's glow falls on the mat, and a low hum rises with the current.
- Take any lead off and everything stops at once, everywhere in the loop; a note already struck dies away inside a second and none follows it.
- Clip both ends of one lead across the cell alone and the lead glows orange, the cell puffs, and its cutout flag pops up with a pock. A tap on the flag sets it back.
- Clip both ends of a lead onto one pad and it makes a loop of nothing, which sags and twangs.
- Every further lead changes what runs: a second path, a short way round, a longer way round.

**Sound and motion.** The clack of a clip is pitched by where it bites (a pad, a leg, the cell's cap). The lead has weight: it swings, overshoots and settles. The hum, the lamp's ring and the beads start in the frame the loop closes. Random clipping always does something: a clack and a swinging lead at the least, a lit lamp or a popped flag at the most. A board has room for sixteen leads, twenty-four parts and twelve things lying loose; past that a clip only pats the pad, a lead winds back into the coil and a part goes back into the tray, until something is taken off.

**Why it is a pleasure with no goal.** One small bite of a clip makes a whole loop come alive at once, far from the finger, and one lead taken away makes it all stop. Making and breaking the loop is the pleasure, and it is the same act every repair is made of. A person watching can tell in three seconds what the child is doing: joining metal to metal until something lights (pack: game-design, toy-first.md; pack: game-design, touch-answers-bigger-than-the-touch.md).

## The object-by-action grid, and what is new on day 15

Seven objects by five actions. Every result is what the solved circuit does, so a result found once stays true. The wrong use is marked **W**.

**Cell** (the source)

| Action | What happens |
| --- | --- |
| Clip it into a loop | The loop goes live: beads leave its cap, run all the way round and come back in, and a hum starts. |
| Turn it round | It tumbles end over end with a thunk and the beads run the other way. A motor in the loop spins backwards; a lamp does not care. |
| Add a second | Nose to tail: beads faster, lamp brighter, hum higher. Side by side: the lamp does not change, and each cell sends out half the beads at half the speed, the two streams joining into the one the lamp had before. **W** nose to nose: the two lean toward each other and tremble like arm-wrestlers, with a low strained creak, and nothing runs: no bead moves. |
| Lead straight across it | **W** A short: the lead glows orange, the cell puffs warm air, its cutout flag pops up with a pock, and the old hand's whiskers stand out. A tap on the flag sets it back. |
| Flick it | It hops on the mat with a thud. A flat cell bounces twice with a hollow tock, as a flat cell really does. Never hinted. |

**Lead** (the conductor)

| Action | What happens |
| --- | --- |
| Clip it into a loop | Two clacks, the gap is closed, the loop runs. |
| Turn it round | The clips swap ends with a double clack and a flourish. Nothing changes, and it is played straight. |
| Add a second | End to end: the join bites with a lower clack, and the same loop runs by a longer way round; the lid will bulge. **W** both clips on one pad: a loop of nothing, which sags and twangs. |
| Lead straight across it | The two leads share the beads, each carrying half, and bow out to either side of each other with a zip. |
| Flick it | It swings and twangs like a slack string, lower the longer it is. |

**Switch** (a gap the child chooses)

| Action | What happens |
| --- | --- |
| Clip it into a loop | With the lever down the loop runs at the last bite. With the lever up nothing starts: the switch is a gap, and its open contact gives one dry tick as the clip bites. |
| Turn it round | It spins on its base with a ratchet and now throws the other way. Nothing else changes. |
| Add a second | In a row: both must be down, and the first lever to fall clacks to no effect. Side by side: either will do, so one lamp is worked from two places, and the second lever to fall clacks to no effect. |
| Lead straight across it | **W** Always on. The lever clicks to no effect: it no longer puts anything out, and the owl, who likes a switch that does, only takes the thing and nods. |
| Flick it | The lever throws with a clack and the loop opens or closes in that frame. |

**Lamp** (turns the current into light and warmth)

| Action | What happens |
| --- | --- |
| Clip it into a loop | The glass rings once and the filament glows by how much runs through it: dull red for little, white for much. |
| Turn it round | It is unscrewed and screwed back with a squeak. The glow is the same either way. |
| Add a second | In a row: both dim, and the beads slow everywhere in the loop. Side by side: both at full glow, and the beads leave the cell twice as fast and divide at the fork, each lamp getting the stream it had alone. **W** three cells on one lamp: it flares, goes pik, and the glass turns smoky. It is now a blown lamp, which is a gap, and the tray has more. |
| Lead straight across it | It goes dark with a tink of cooling glass while everything else in the loop runs harder. **W** if it was the only thing in the loop, that is a short and the flag pops. |
| Flick it | It rings like a glass and quivers in its collar. A blown lamp rattles. |

**Motor** (turns the current into motion; on its shaft sits a fan's blade, or in a car a wheel, or in a robot its arm, and only a blade moves the air)

| Action | What happens |
| --- | --- |
| Clip it into a loop | It spins with a whirr pitched by its speed. A fan blows the lead ends about, rocks the parts that lie loose on the mat, and ruffles its owner at the counter and the old hand's coat. |
| Turn it round | **W** It spins the other way, and its whirr turns breathy, like air drawn in: a fan sucks, so the yak's fringe and the old hand's whiskers lean in, and a toy car's wheel turns backward in its owner's hands. |
| Add a second | In a row: both lazy, and each whirr sinks to a low drone. Side by side: both at full speed, each whirring at the pitch it had alone, so the whirr doubles. |
| Lead straight across it | It stops short with a falling whirr, braked by the lead across its own legs, while the rest of the loop runs harder. |
| Flick it | The blade freewheels and ticks to a stop. With a lamp in its loop and no cell, the lamp glints while the blade turns: a spun motor is a source. Never hinted. |

**Buzzer** (turns the current into sound)

| Action | What happens |
| --- | --- |
| Clip it into a loop | It rasps, higher and harder with more current, and rings go out from it, more of them the harder it rasps. |
| Turn it round | It hops round on its feet with a tinny rattle. The rasp is the same. |
| Add a second | In a row: both mutter. Side by side: both at full rasp a hair apart in pitch, so they throb against each other. **W** two cells or more on one buzzer: it shrieks, and shakes where it sits on its own rattle. |
| Lead straight across it | It is cut off in the middle of a rasp with a hiccup. |
| Flick it | One dull tink of its tin cap. |

**Bench odds** (a spoon, a key, a ball of foil, a pencil, a rubber, a wooden stick, a piece of string)

| Action | What happens |
| --- | --- |
| Clip it into a loop | Seated across two pads, or bitten by a clip where it lies loose, each sounds as its material does: a ring on the spoon, a scrape on the pencil, a squeak on the rubber. The spoon, the key and the foil pass everything. The pencil passes a little through its graphite, so a lamp glows dull. The rubber, the stick and the string pass nothing. |
| Turn it round | The same either way, each with its own clatter. |
| Add a second | In a row: one thing that blocks, anywhere in the loop, stops the whole loop, and the hum cuts off in that frame. Side by side: one thing that passes is enough, and the hum comes back, at full pitch through the spoon, the key or the foil and low through the pencil. |
| Lead straight across it | **W** Whatever it was no longer matters: a rubber with a lead across it "works", and the lead settles over it with a slap. |
| Flick it | Seated or lying loose it hops as any part does, and wherever it is flicked each sounds as its material: the spoon sings, the key jingles, the foil crackles, the pencil tocks, the rubber gives a dull thud, the stick clacks, the string slaps softly. |

**On day 15** the child reads a board before touching it and fetches the test lamp only where it is needed; tunes one gadget to one customer (dim for the owl, two cells for the moth); and keeps contraptions of their own running on the stall's sign board, such as a lamp worked from two switches, a fan and a bell on one cell, or a blade spun by hand that makes a lamp glint. None of that is new content: it is the same seven objects, combined (pack: game-design, depth-from-combinations.md; pack: game-design, liveliness-from-causing-and-comedy.md).

## The representation

**The idea.** A thing runs only when there is an unbroken way round: out of a source, through the thing, and back into the source. What the current carries from the source arrives as light, sound or motion. Some materials let it through and some do not.

**How it appears in the objects.** It was chosen before the stall, the customers or the look.

- **The loop is a ring of metal the child can trace with a finger.** The gadget lies open and is seen from straight above: copper traces, solder pads, the legs of parts, and leads. The way the current goes is the way the metal goes. A break in the idea is a break in the metal: a crack, a loose clip, a blown filament, a flat cell, or a rubber where metal should be.
- **The current is a row of beads on the metal.** Beads move only where the solved current is not zero, and their speed is that current. They run all the way round at one speed, as many come back into the cell as left it, they divide at a fork and join again after it, and they move everywhere in the loop in the same frame or nowhere. No bead is used up in a lamp. What the lamp takes out of the current is shown as what it gives: glow and warmth falling on the mat.
- **A source has two different ends.** The cap and the base of a cell differ in shape and colour, and turning the cell round is an action.
- **"More" is never a number.** More current is faster beads, a whiter filament, a quicker blade, a higher rasp.

**Where the model is true, and where it stops.** Every result on the mat, on the board that hangs and in a customer's hands is computed from the circuit as it lies (the old hand's practice board alone is a small picture of one mend, drawn by its idea and solved by nobody; until she has a way to show, its cell lies out of its place and it is dark): ideal parts of fixed resistance on steady direct current, solved again at every change. A motor is the one part that is also a source: while a cell turns it, it is a fixed resistance; spun by hand it is a small source for as long as it turns, which lights a lamp with no cell and brakes the blade when a lead lies across its legs. Nothing is scripted to light. It leaves out, and does not claim: cells running down (no clock runs), a filament's resistance changing as it heats, why a turning motor is a source (magnetism), and static electricity. The beads are the one invented thing. Current cannot be seen, and the beads stand for it as the arrows in a school drawing do.

**Its support.** A bench of cells, leads and lamps is school practice. The table at the end of the pack's `research/learning-games-that-work.md` lists "build and run" circuits for this skill, with support from a secondary summary of another build-and-run physics game. No trial of this representation for circuits is cited there, so it is school practice without a trial of its own behind it (pack: game-design, representation-before-game.md).

**Where object, picture and symbol stop** (pack: game-design, fade-to-school-symbols.md).

- **Object.** Every part is itself, drawn as itself, in every position of the designed order.
- **Picture.** From the position `ticket` on, a customer may bring an order ticket: a small card clipped to the gadget that draws the parts asked for, such as two lamps.
- **Symbol.** One place only: on that ticket, a numeral lies beside the drawn group it counts (two drawn lamps, and the numeral for two beside them). It names a quantity that is asked for, the drawing carries the order without it, and play never depends on reading it. The range is 2 to 3 and is the game's own choice; none of the records named under "The records" gives a count or a number range for it. In the pure rules it is `Ticket.count`. It is drawn through the game's own `symbols.ts`, the copy of the template's module, and nowhere else.
- **Not used.** School circuit symbols: none is in the jam's list of signs, and no record the game rests on names them. A meter, a gauge or any reading on the object: brighter and faster are seen, never read off. The plus and minus signs printed on a real cell: see "For the owner to decide" in `REFINEMENT.md`.

## The four mechanic questions

- **Swap.** No: the play is the loop itself, so taking the circuit out leaves no game, and another subject would need other objects and other rules.
- **Attention.** At the moment of decision the child looks at where the metal runs and thinks about whether there is an unbroken way out of the cell, through the lamp, motor or buzzer, and back, and which piece on that way does not let current through.
- **Fun.** The skill is used in the best moment of play, when the last clip bites and the dead thing starts up in that frame; nothing stops for a question.
- **Guess.** At the first two positions, yes: the gap is in plain sight and any lead across it works, and a switch left up needs one flick; from the third position on the break is not in plain sight (a flat cell looks like any other, a dead motor or buzzer looks whole, and a blown lamp shows only by its smoky glass), a lead clipped at random changes nothing unless it crosses the break or shorts the cell and pops the flag, swapping every part in turn for one from the tray does mend a single break but each swap is itself a test whose result the child sees, and a job laid out for `double` holds two breaks, so one lead or one swap does not make the gadget run unless a single lead spans both breaks; from `flat` on one job in three is laid out for an earlier idea, so a job with a single break still comes at every position.

(pack: game-design, the-mechanic-is-the-school-skill.md)

## The error as a consequence

The game runs what the child built and shows what it does. Nothing gives a verdict: no buzzer for a mistake, no cross, no face turned to the child. Each consequence below is the solved circuit's own.

| What the child did | What the world does | Where and why it shows |
| --- | --- | --- |
| Left a gap in the loop | Nothing runs, anywhere. No bead moves. | The test lamp, which is a lamp with a lead on each leg, glows when it is clipped across the break: there it closes the loop through the rest of the gadget, dully when a lamp, a motor or a buzzer shares that loop with it. Across a sound trace, lead or part of a dead loop it stays dark. Across a cell it glows if the cell is good, whether the loop is dead or not, and stays dark if the cell is flat and is the only cell in its loop; where two cells share a closed loop, as on the sign, it glows dully across the flat one, driven by the other. So, the cell aside, the break is the one place where something put across it comes alive, and with two breaks in one loop neither comes alive until the other is closed. |
| Made a way round that misses the load | A short. The leads on that way glow orange, the cell puffs, and its cutout flag pops. | The glow marks exactly the way the current took, and no lamp, motor or buzzer is ever marked. The flag stays up until it is tapped, and pops again while the short is still there. The same flag pops with no short when so many things hang on one source that it gives more than its cutout allows, as the stall's sign can, mended whole, when one thing more is hung on it near its cells: then the copper that carried it all glows, and taking one thing off is the mend. |
| Put a source in backwards | A motor spins the other way: a fan sucks, a car's wheel turns backward, a robot's arm is twisted round behind it and flails there. Two cells nose to nose push against each other and nothing runs. | The beads run the other way, and the two cells lean toward each other and tremble. |
| Put in too many cells | A lamp flares and pops, and its glass goes smoky. A motor screams and shakes where it sits. | The blown lamp is now the gap, and it rattles when flicked. The tray always has another lamp. |
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
| `dead` | Little to see: a blown lamp shows only by its smoky glass, and a motor or buzzer that is open inside looks whole. | A part can be the gap. |
| `stuff` | An earlier mend with the wrong thing: a rubber, a stick or a string joins two pads. | Some materials let current through and some do not. |
| `backwards` | A motor that turns the wrong way, or two cells nose to nose. | A source has a direction. |
| `short` | A scrap of foil lies across two pads, and the flag pops whenever the gadget is switched on. | A way round that misses the load. |
| `branch` | Two things on one cell, such as a robot's eyes and its arm, of which one runs and one does not. | Two loops can share one source, and each must be closed. |
| `double` | Two breaks of different kinds already met. | Kinds are mixed, so the child has to decide which kinds these are. |
| `ticket` | Breaks of kinds already met, and an order ticket asking for parts the gadget is to hold, whatever it came with: two lamps or three, two switches, or two cells. | Redesign: several answers work, and they do different things. |

From `flat` on, a position lays out its own kind of break two times in three and an earlier kind otherwise, in whichever gadget and for whichever customer the seeded stream draws. The rules never change, so what a child finds out stays true (pack: game-design, ordered-challenges-high-success.md).

**Most attempts succeed.** The gadget is live on the mat the moment its loop closes, so the child sees it run before handing it back.

**How a cycle is judged.** The game's own call, made when the gadget is handed back or sent away:

- **Well:** it ran the first time it was handed back.
- **Mixed:** it ran, on a later hand-back.
- **Badly:** the child called the next customer while the gadget had not run for its owner, who droops in its own way and takes it as it is.

"Ran" means that when its owner switches it on, as many lamps, as many motors and as many buzzers carry current as the gadget came with, each motor that counts turning the way the gadget needs, and no flag pops. A dead part left in beside a fresh one does not count against it. The ticket and the tastes never enter the judgement: any repair that works stands. The position moves one step up after a cycle that went well, one down after one that went badly, and not at all after a mixed one or at either end. Nothing on screen shows the position or that it moved, and no clock is read.

**Which customer a new position lays out: the customer after next.** A job (who, which gadget, the breaks inside it, the ticket) is laid out when its customer steps up to wait at the window, from the position stored at that moment. When a cycle is judged, the customer who waits was laid out before it, so a moved position first shows in the customer who steps up after them. On a first visit the customer at the bench and the one at the window are both laid out from the starting position.

**The harder thing the child may always pick: the stall's own sign.** A board bigger than any gadget's, with far more on it, hangs at the back of the stall: several lamps, a fan and a bell on two cells, broken in several ways from the first day. It looks harder because it is bigger and has more on it. A touch brings it down onto the mat in place of the customer's gadget, and another puts it back. It belongs to no customer, is never handed back and never judged, and it moves no position. It is also the free place to build: whatever the child makes of it stays, and is seen still running where it hangs: its lamps glow and its blades turn.

**"A neater one is visibly neater."** Neatness is seen on the gadget, never counted. A mend with one short lead lets the lid shut flat. More leads, long ones and loose ends make the lid bulge, and past a point it will not shut: the gadget goes home held by a rubber band with leads trailing. Both run, and both stand.

**What is stored.** Small plain JSON, versioned, read defensively field by field:

| Field | What it holds |
| --- | --- |
| `v` | The version of the shape. |
| `position` | An id from the ladder: where the next job is laid out from. |
| `finished` | The cycle on screen has ended: its customer stands with the gadget as it was handed back, nothing replays on load, and the next cycle starts on the child's touch. |
| `stream` | The state of the seeded stream that jobs are laid out from, so a reload deals nothing new. |
| `job` | The customer at the bench: who, which gadget, the id of the idea its breaks were laid out for, its circuit, its ticket or none, whether its lid is open, and whether a hand-back has already failed (`missed`). |
| `next` | The customer at the window, in the same shape, as laid out. |
| `sign` | The circuit of the stall's sign. |
| `onMat` | Which board lies on the mat: the job's or the sign. |
| `shown` | The ids of the ideas whose neat way has been shown. |
| `board` | The id of the idea whose neat way stands mended on the old hand's practice board, or none: set when that scene starts, cleared when the next cycle starts. |

A circuit is stored as the gadget's kind, which of its traces are cracked, its parts (kind, the two pads in order, the order being the way round the part lies, or for a part that lies loose its place as a cell of a coarse grid over the mat, and whichever of these applies: a switch's lever, a flat cell, a popped flag, a blown lamp, a part open inside, what a bench odd is made of) and its leads (for each of a lead's two clips, what it bites: a pad, one end or the other of a part that lies loose, or the clip of another lead; or nothing, and that end lies loose; and, for a lead neither of whose clips bites a pad or a part, its place as a cell of the coarse grid over the mat, as for a part that lies loose). The test lamp is stored as a part of the board it is clipped to, each of its two clips stored as a lead's clip is, and lies at its own place on the mat when neither clip holds. Nothing in the hand is stored: a lead counts from the frame its first clip bites, with its other end loose on the mat. The beads, the glow and a spinning blade are a view of the stored circuit and are not stored. No date, no duration, no count of visits or repairs is kept anywhere. The largest legal state is held under half of the 64 KB cap by a test ("Found as left" in the guide).

## The characters and their fixed tastes

Every customer has the same visible want: the thing they brought, running. They hold it out and look down at it, and when it is handed back they try its switch, where it has one. While it lies open on the mat its owner watches the hand at work and shows what it thinks of what is done to it: it starts when a clip bites, is delighted when the thing first runs, droops when it stops, winces when a lamp blows, is alarmed for as long as a part of it is out in the hand, and at a short everything it has stands on end (the tortoise, who has nothing to stand on end, is inside his shell). Each does these in its own way, its eyes go where the hand goes, and its spirits show (the cockatoo's crest goes up while the thing runs and lies flat while a flag stands). What differs is what each likes it to do. The tastes below never change, so a child can learn them and test them on purpose. The reaction at the hand-back is to the exact gadget as handed back (how bright, how fast and which way, how loud, whether it can be switched off, how the lid sits, what was used in the mend), the owner takes the gadget and calls out the moment it is handed over, the reaction itself starts when the lid is shut and the switch thrown, under two seconds later, and neither it nor anything the owner does while watching is ever about the child: no thanks, no praise, no disappointment turned outward. A dislike is as good to watch as a like.

| Character | Likes | Dislikes |
| --- | --- | --- |
| **The owl**, a night watchman | A dim glow. A switch, so the thing can be put out at dawn. | Glare: pulls the cap down and turns the head right round. |
| **The moth**, who cannot leave a lamp alone | The brightest lamp there is, and more lamps than one, lit. | A fan's wind: pinned flat where it stands, wings spread. The dark, or a lamp that only glows dull: droops. |
| **The yak**, always too hot under all that hair | A strong wind in the face, hair streaming. | A fan that sucks: the fringe goes in and she has to back out of it. A hot bright lamp: wilts. |
| **The tortoise**, who has all the time there is | Slow and soft: a lazy blade, a muttering buzzer, a car whose wheel turns slowly. | Anything fast or sudden: head and legs go in. A popped flag keeps him in for a beat longer. |
| **The cockatoo**, loud | The loudest rasp, which it joins and drowns out. Two buzzers throbbing. | Silence: taps the gadget and sulks at it. A gadget handed back with a lamp in it and none lit: asleep at once. |
| **The magpie**, a collector who cannot bear a mess | A lid shut flat. Anything shiny used in the mend, which it tries to keep. | Trailing leads, which it picks at. The rubber band. |

**The old hand** is not a customer. An old raccoon who has kept the stall for ever sits on a stool at the far end of the bench, awake, with a mug of tea and a plate of biscuits before her and her goggles pushed up on her forehead. Her want is her tea in peace, and she cannot keep her paws to herself: she sips, dunks a biscuit, combs her whiskers, pulls her goggles down for a look, and yawns; a part the child lays within her reach she picks up, looks at through her goggles and puts back exactly where it lay; and the open lid of a gadget gets two knocks of her knuckles. None of that changes the circuit, and she lets go the moment the child's finger comes for the thing. Her eyes follow the hand at work. At a short her whiskers stand out and her whole coat stands on end until she smooths it down; an ear turns to a new sound, a fan's wind lifts her fur, and a pop makes her spill a little. Her mug, her biscuits and the clutter in her corner of the bench answer a touch, and she guards them with a look and, where she can reach, a paw. Once for each new idea she shows a neat way on a practice board of her own ("The scenes"). She watches the hand and the bench and never the child: she never explains and never rates a mend.

**Around them**, and no part of any mend: the stall has an awning over its open front, and beyond it is the lane, where a giraffe, a porter's tower of crates with a cat asleep on top, and a balloon that has got away go by in turn, each above the customers' shoulders; a pigeon on the doorstep across the way is gone at a bang or at a finger and walks back when it is quiet. Each who passes answers a finger where it shows: the giraffe stops chewing and puts out its tongue, the tower lurches and the cat opens both eyes, the balloon is batted up and comes down. The washing on its line across the lane swings on its pegs when it is touched, and on the shelf by the old hand's practice board an old toaster throws up its slice and a radio finds half a tune and loses it. On the bare mat a clockwork mouse that only turns left goes round and round, running down; a tap winds it; it shoots into its matchbox the moment a board comes down and comes out again when the mat is clear. None of them wants anything of the stall, nothing depends on them, they are counted nowhere, and nothing about them is saved.

No two characters share a movement: each has its own tempo, weight and funniest part (the owl's head, the moth's flutter, the yak's fringe, the tortoise's neck, the cockatoo's crest, the magpie's hop, the raccoon's whiskers). The parts on the bench are working pieces and stay plain: no faces, and no motion beyond what the circuit gives them (pack: game-design, characters-with-opinions.md; pack: game-design, working-objects-stay-plain.md).

## The scenes

Every scene is a list of timed beats over game time, filled in from the state of play, and any touch ends it at its last pose. A scene's outcome is saved when it starts, so a put-away in the middle loses nothing and nothing replays on load.

**1. The hand-back** (the consequence; every cycle; 5 to 8 seconds when the gadget runs, a little over 4 when it does not).

- **Cause.** The child drags the gadget to its owner, or taps the owner's open hands.
- **Beats.** The owner takes it. The lid is shut as far as it will go: flat, bulging, or held by a rubber band. The owner throws the switch on its edge, seen and heard; a gadget with no switch in it has none on its case, and runs on from the mat into its owner's hands. The gadget does exactly what its solved circuit does. The owner reacts by taste. If the gadget came with an order ticket, the card goes with it, clipped to its corner: where the gadget now holds what the card asks for, the owner looks at the card and puts it away, and where it does not, the card stays on and the owner's eyes go back to it every few seconds. The owner settles, holding it as it runs.
- **Filled in from.** The circuit as handed back (how bright its brightest lamp and how many are lit, how fast and which way its fastest blade or wheel turns, how loud its loudest buzzer and whether two rasp, whether a flag pops), how the lid sits, anything shiny in the mend, and the ticket.
- **When it does not run.** The owner throws the switch twice, peers in, and lays the gadget back on the mat with the lid open. Each time the switch is down the gadget does what its circuit does, seen and heard in the owner's hands: nothing at all, a blade that sucks, a flag that pops. A gadget with no switch in it has none to throw: it does what its circuit does from the moment its owner takes it until it is laid back, and the owner only peers in. The cycle goes on.

**2. The neat way** (a new idea shown after the child's own attempt; once for each idea; 4 to 6 seconds).

- **Cause.** The first hand-back that ran of a job whose own idea is not yet in `shown`. A job's idea is the id of the position its breaks were drawn for when it was laid out (always the position's own at `gap` and `switch`; from `flat` on the position's own two times in three and an earlier one otherwise); it is kept in `job` and is not read from `position`, which may have moved since. It follows the hand-back scene.
- **Beats.** The old hand reaches to the practice board that stands on the shelf beside her, which carries the same kind of break (for a job of two breaks hers are always a gap and a blown lamp, whichever two the job had; for an order hers has no break, and one lamp that a second is joined to, whatever the card asked for). She makes the mend in one reach of her paw, and her board shows it done: a short lead across a gap, a lever thrown, a fresh cell for a flat one, a new lamp for a dead one, the rubber taken out and a lead in its place, one of two cells turned round so that both push the same way, a short way round taken off, the gap in a second lamp's own rung closed, a second lamp joined in on a rung of its own, or, where the job had two breaks, both mends at once. Her board runs. She goes back to her mug.
- **Filled in from.** The idea.
- **Why it is not a solution.** It comes after the child's own mend has been handed back, so it is never the answer to a problem in front of the child. What the child's mend does is still running in its owner's hands as her board lights, shut in its case, so it is her one move and its result that are seen, not two mends side by side: her board stands broken through the hand-back, is mended as she reaches, stays mended until the next cycle starts, and on load is rebuilt from `board`. It is a move in the world, with no word and no look toward the child (pack: game-design, guided-discovery.md).

**3. Secrets.** Particular combinations always give a particular hand-back, are never hinted at and are counted nowhere: two buzzers side by side for the cockatoo become a duet it conducts; a fan that sucks, handed to the moth, takes the moth for a ride round the blade while its owner tries it, though a fan that sucks does not run and is laid back; a mend made with the spoon, the key or the foil has the magpie hopping and flicking its tail over the shiny thing, which sticks out from under the lid of the gadget in its hands, and there is always another spoon on the bench (pack: game-design, hidden-never-counted.md).

**How a cycle ends.** The hand-back's last pose is the ending: the owner stands at the lane side of the stall with the gadget running, for as long as the child likes. If the child does nothing, nothing new starts.

**How the next one starts.** The next customer already waits at the window beside the one at the bench, holding its own gadget shut and busy with small things of its own (the owl swivels its head and blinks slowly, the moth fans its wings and combs its feelers), and never hurries the child or looks put out. A touch on that customer starts the next cycle: the one who is finished walks off down the lane with the gadget still running, seen and heard, the one at the window comes to the bench, and a new one steps up to the window. On load no scene replays: the world is as the last scene left it, with the next customer waiting.

**The sign has no ending.** It is open building. Tidying is calm: a part dropped on the tray goes back into it, and a lead dropped on the coil winds itself up, seen drawing in there.

(pack: game-design, endings-and-short-scenes.md; "How a cycle restarts" in the guide)

## The records

Read through the lookup on 2026-10-03. Each jurisdiction stands under its own heading, and nothing below pairs a record of one with a record of the other. Every limit is from that record's Limits; what Limits leaves open is marked as the game's own choice.

### us-ca

Levels, as the lookup prints them for science: age 9, `grade-4`; age 10, `grade-4` and `grade-5`; age 11, `grade-5` and `grade-6`; age 12, `grade-6`. Age mapping: derived. Beside each age the lookup returns the `cross-grade` lane, labelled cross-grade: its statements hold for every grade, not for this age in particular.

Gaps as printed. At age 9: "Grade 3 is not in the pack. A third grader turns nine during the year; grade 4 starts at nine." At age 12: "Grade 7 is not in the pack. A sixth grader turns twelve during the year; a child who starts the school year at twelve is in grade 7."

The game is designed from `grade-4`, `grade-5` and the `cross-grade` lane. No `grade-6` record is named, and nothing is named in its place: three `grade-6` records on energy (`us-ca MS-PS3-3` to `us-ca MS-PS3-5`) were read and are on heat and motion, not electricity, and four on engineering design (`us-ca MS-ETS1-1` to `us-ca MS-ETS1-4`) were read and are not named. No us-ca record is named for the closed circuit or for what each part adds to a working thing: none of the us-ca records named below names them (`us-ca 4-PS3-4` has circuits among the examples of its clarification, as a kind of device), nothing is named in their place, and those parts are taken from nl.

- `edu.us-ca.grade-4.science.objective.4-ps3-2` (`us-ca 4-PS3-2`): state-board-adopted-standard, confirmed. Level `grade-4`.
  The record's Summary: "The student observes in order to give evidence that energy can move from one place to another, carried by electric currents, heat, light or sound."
  In the game: the beads run from the cell to a lamp, a motor or a buzzer at the far side of the board, and light, warmth, motion or sound appears there and not at the cell.
  Limits taken: energy is not measured in numbers, so nothing on screen puts a number on it. Four carriers are named, and the game shows all four: the current as beads, light as the glow, heat as a lamp's warmth and a shorted lead's glow, sound as the buzzer.
- `edu.us-ca.grade-4.science.objective.4-ps3-4` (`us-ca 4-PS3-4`): state-board-adopted-standard, confirmed. Level `grade-4`.
  The record's Summary, first sentence: "The student applies science ideas to design a device that changes energy from one form into another, tests it, and improves it."
  In the game: a gadget is a device that turns what a cell stores into light, sound or motion; the child tries it on the mat, changes it, and from the position `ticket` on redesigns it to an order.
  Limits taken: devices are kept to two kinds, and the gadgets are all of the kind that uses stored energy to make motion, light or sound. The other kind, motion into electricity, appears only as the blade spun by hand. Left open by Limits: the devices and the constraints in the clarification are examples, so the five gadgets are the game's own choice, and of the example constraints the game uses only materials (the parts on the tray). It sets no time and no cost.
- `edu.us-ca.grade-5.science.objective.5-ps1-3` (`us-ca 5-PS1-3`): state-board-adopted-standard, confirmed. Level `grade-5`.
  In the game: each bench odd is put in a loop to find one property of its material, whether it lets current through. The game never asks which material an unknown thing is; the odds are known by sight.
  Limits taken: density is left out. Left open by Limits: the materials and properties listed are examples, so the seven bench odds and the one property tested are the game's own choice. The game is designed from this record in part: it tests one example property, measures nothing, and does not tell one material from another by its properties, which is what the record's observing and measuring are for.
- `edu.us-ca.cross-grade.science.objective.3-5-ets1-3` (`us-ca 3-5-ETS1-3`) [cross-grade]: state-board-adopted-standard, confirmed. Level `cross-grade`.
  In the game: the circuit stays as the child left it, so one thing is changed at a time and its effect is seen at once; the test lamp moved from piece to piece finds where the loop fails.
  Limits taken: it holds for the whole band of grades 3 to 5 and not for one grade; it carries no clarification and no assessment boundary; the tests are fair tests whose aim is to find what to improve. From the lookup, not from Limits: the `cross-grade` science lane holds no record for a band that includes grade 6; the `grade-6` lane holds that band's own engineering design records (`us-ca MS-ETS1-1` to `us-ca MS-ETS1-4`), which are not named here.

### nl

Levels, as the lookup prints them for science: age 9, `fase-2` (sub-band groep 5 or groep 6); age 10, `fase-2` (groep 6) and `fase-3` (groep 7); age 11, `fase-3` (groep 7 or groep 8); age 12, `fase-3` (groep 8). Age mapping: convention. Beside each age the lookup returns the `einde-po` lane, labelled end-of-primary goals: what a school works towards by the end of groep 8, not what a child of this age should master.

Gap as printed, at age 12: "A child who starts the school year at twelve is usually in secondary school, which is not in the pack."

The game is designed from `fase-2`, `fase-3` and the `einde-po` lane. No nl record is named for energy carried from the source by the current and arriving elsewhere as light, heat or sound, and nothing is named in its place; that part is taken from us-ca. For testing where a design fails, the only nl record named is a draft item, not in force (`nl 30 A e`).

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
  Limits taken: a 2006 goal that is still in force; its examples are an open list; it names no steps of an investigation, no instrument, no unit and no number, and states no safety condition. The game takes electricity from the list. Left open by Limits: no instrument is named, so the test lamp is the game's own choice; the game uses no unit, no measured number and no fixed steps of an investigation.
- `edu.nl.einde-po.science.objective.conceptkerndoelen-2027-onderdeel-f-mens-en-natuur-domein-natuurkundige-en-scheikundige-verschijnselen-en-technische-systemen-kerndoel-30-30-a-c` (`nl 30 A c`) [end-of-primary goals]: draft-not-yet-in-force, regime 2027-draft, confirmed. Level `einde-po`.
  In the game's words: saying what each part adds to the working of a thing.
  Limits taken: a draft goal, not in force; its verb is describing; it names no object, system or part. The game has no words, so the child shows what a part adds by putting it in, taking it out and turning it round; that is the game's own choice and less than describing.
- `edu.nl.einde-po.science.objective.conceptkerndoelen-2027-onderdeel-f-mens-en-natuur-domein-natuurkundige-en-scheikundige-verschijnselen-en-technische-systemen-kerndoel-30-30-a-e` (`nl 30 A e`) [end-of-primary goals]: draft-not-yet-in-force, regime 2027-draft, confirmed. Level `einde-po`.
  In the game's words: trying out designing, making and repairing.
  Limits taken: a draft goal, not in force; three activities and no level of mastery; no product, material, tool or safety condition is named, so the gadgets, the parts and the test lamp are the game's own choice.

### Where the two differ

- **The closed circuit.** The Dutch fase 2 record names current going round in a closed circuit. None of the California records named here names a complete circuit, a switch or what a part does: the two for grade 4 name energy carried by electric current and a designed device, with circuits among the examples of the second one's clarification. The game follows nl for the circuit idea and us-ca for its frame, a device that is tried and improved.
- **What lets current through.** The Dutch fase 3 record names it as a part of the goal, and the Dutch fase 2 record has it as an example. The California grade 5 record has it as an example property for telling materials apart. The game follows nl here and is designed from the California record only in part.
- **Finding the break.** California has a cross-grade record on looking at where a model fails, for grades 3 to 5. On the Dutch side the game names for it only the draft item on repairing (`nl 30 A e`), which is not in force. The game follows us-ca here, and narrows "finding the break" to testing whether the loop is closed and which piece lets current through.
- **The parts.** A cell, a lead, a switch, a lamp, a motor and a buzzer are named by none of the records named here, of either jurisdiction, and are the game's own choice. What each part adds rests only on the Dutch draft item 30 A c, a draft core goal, not in force. None of the California records named here carries it. The game follows nl here.
- **Danger.** The two Dutch fase records on electricity name its danger. No California record named here does. The game follows neither here: it shows no danger of electricity and claims none.
- **Ages.** The California records named are for grade 4, grade 5 and the band of grades 3 to 5. No `grade-6` record is named: the three on energy that were read (`us-ca MS-PS3-3` to `us-ca MS-PS3-5`) are not on electricity, and the four on engineering design (`us-ca MS-ETS1-1` to `us-ca MS-ETS1-4`) are not named. The Dutch fase records run through groep 8. So for the oldest children the game rests on the Dutch records only and follows nl.
- **None of the records named here**, of either jurisdiction, names a circuit symbol, a unit, or a kind of circuit. The game shows no circuit symbol and no unit and follows both in that. It does show parts in a row and side by side, two loops on one source (the position `branch`), a short, and a source put in backwards; no record is named for those, and they are the game's own choice.

### The claim

Fix-it Stall is designed from two California content standards adopted by the State Board of Education for grade 4 (`us-ca 4-PS3-2` and `us-ca 4-PS3-4`), in part from one for grade 5 (`us-ca 5-PS1-3`, of which it takes one example property and not the telling of one material from another), and from one cross-grade engineering design standard for grades 3 to 5 (`us-ca 3-5-ETS1-3`); and from three SLO fase goals, which are curriculum-institute guidance and not law (in part `nl ojw/nattech/2/06/fase2`, of which it takes the closed circuit and not static electricity or use and danger; `nl ojw/nattech/1/02/fase2`; and in part `nl ojw/nattech/2/06/fase3`, of which it takes the materials that let current through and circuits, and not the electromagnet, static electricity or use and danger), from core goal 42 of 2006, a legal core goal still in force (`nl 42`), and from two items of a draft core goal, not in force (`nl 30 A e`, and in part `nl 30 A c`, whose describing the game does not ask for). Every record named was `confirmed` when it was read on 2026-10-03. Part by part: the closed circuit is taken from nl only (the two fase goals on electricity, guidance), no us-ca record is named for it, and for California the game is not described as teaching circuits; energy carried by the current and arriving as light, heat or sound is taken from us-ca only (`us-ca 4-PS3-2`); which materials let current through is taken from nl (guidance) and, as one example property, in part from us-ca (`us-ca 5-PS1-3`); a device that is tested and improved, and finding where it fails, are taken from us-ca (`us-ca 4-PS3-4` and `us-ca 3-5-ETS1-3`) and on the Dutch side from a draft item, not in force (`nl 30 A e`); what each part adds is taken only from a draft item, not in force (`nl 30 A c`). No us-ca record is named for grade 6, so for a child in grade 6 the game rests on the nl records only. Nothing here says what a child has reached, and the game is not described as raising attainment.

## The look

Not part of the sheet. First the notes from the spike, then the game as it was built, then what the look pass put into the frame after the owner found it too bare, which is how the game looks now.

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

### The game

What the Mount shows since the game stage. The spike's scene is still there with `spike=1` in the address. The toy's bare scene is gone: the game is built on its controller, and its one act, clipping a lead, is the same act on every board.

- **The stall from the mender's seat.** The far side of the stall along the top (laid out again in the look pass, below), then the counter. A customer leans over the counter, the next waits to its right, a little further off. Whichever board is not on the mat hangs small on the back wall. On the mat: the board in the middle, the tray of parts at the right with the coil in its last place, the bench odds in a row along the bottom, the test lamp beside them, the old hand asleep at the bottom left with her mug, and her practice board hanging by her.
- **A gadget, shut and open.** Shut, in its owner's hands, it is a case in its own colour (lamp red, fan blue, bell yellow, car green, robot violet) with what it does showing on the outside: a lens, a blade behind a grille, a sounder, eyes and an arm. Open, on the mat, it is the same colour of case round a green board, with its lid standing at the left.
- **What a gadget does in its owner's hands is its circuit's.** A lens is dull red for a little current, warm for as much as it was made for, white and far too wide for too much. A blade turns at its motor's speed with streaks of air going out, or coming in when it sucks. A sounder throws rings. Too much shakes the case. A lid sits flat, stands proud, or is held by a tan rubber band with leads trailing. A popped flag stands out of the case.
- **A break in plain sight is plain.** A cracked trace is a patch of bare lighter board, a black crack right across it, and the two torn ends of copper catching the light.
- **Parts.** Each has a room on the board that the model keeps clear, and its body is drawn to exactly that room. A part in the hand is drawn a little larger with its shadow further off. A loose part on the mat lies flat with a lug at each end to clip to.
- **The test lamp.** A lamp in a steel collar with two black leads. Its leads lie over the board. It glows when current runs through it, as any lamp does.
- **The order ticket.** A cream card on a steel clip at the near top corner of the case, clear of where the owner is touched. It draws the parts asked for, small, each with a dark edge, and the numeral for how many beside them.
- **The customers.** Each is drawn from six numbers that its painter reads in its own way: the owl's head turns right round and its cap comes down; the moth's wings spread and it spins; the yak's fringe streams back or is drawn in; the tortoise's neck comes up out of its shell or goes in; the cockatoo's crest fans up and a wing beats time; the magpie pecks, cocks its head and flicks its tail. Each has its own tempo and weight (`folk.ts`).
- **The old hand's practice board.** A small green board with a loop, a cell and a lamp, standing on the shelf beside her. It stands dark, its cell lying out of its place, until she has shown a neat way; then it shows that mend, lit, until the next customer comes. Touched, it rocks on its shelf with a tick, and she minds.
- **Idle guidance.** A ring on what the scene wants, then the hand: a tap on the gadget held out; the test lamp's clip to the cell; the gadget by its lid to its owner; a tap on the customer who waits.
- **Cost.** One stamp for everything still, and two bands of it stamped again over the customers and the old hand: the awning's valance, and the counter with the strip of bench under it. Sprites for the board on the mat and the board that hangs, repainted only when they change. A frame-budget test holds a frame of the busiest board, with a short, a hand-back and a change of customers in it, to 80 figures, 700 paint calls and one full-surface stamp; the worst frame it finds makes 479 paint calls.

### The look pass

What is in the frame since the owner found the game too bare. The style is the same row, Electronics bench; the working pieces are drawn exactly as before. What changed is the place they lie in, how large the folk are and how much face they have, and what a touch leaves behind.

- **The frame, top to bottom.** The top quarter is the far side of the stall, seen as the customers are, from the front. At the left its back wall: pale boards, a tool board with pliers, a screwdriver and a hammer hanging on it and, where the spanner's outline is painted, the bones of somebody's fish; a hank of old flex on the corner post; the old hand on her stool before it; beside her a shelf with her practice board, a toaster with a sticking plaster on it and a radio with its aerial tied in a knot; under the shelf the board that hangs. Then the corner post, and the open front under a red and cream awning, which ends at the right in a plain pillar with the stall's own boards beyond it: nothing is drawn there, since the grown-up's corner of the surface lies over it. Between post and pillar the house across the lane: plaster, a shuttered window with geraniums, a doorway with its door ajar, cobbles, and a line of washing (a great pair of spotted drawers at the left, and two mittens that do not match hung well apart, so that whoever passes shows between them). Then the counter. The rest is the bench, seen from straight above: pale wood, and on it the grey mat with a stitched edge and a cutting mat's printed marks (ticks along two edges, slanting lines, quarter rings; no numeral), a mug's stain, a scorch and a few knife scores.
- **What is hers on the bench.** Before her, her mug and a plate of biscuits, one already begun. In the near left corner her clutter: a canvas roll of tools half unrolled, a jar of screws with its lid beside it, the soldering iron in its stand with a sponge and a wisp of smoke, a reel of tape, a stub of pencil, a few screws that got away, and the matchbox the clockwork mouse lives in. All of it is painted once into the still layer, greyed and pale beside the working pieces, and all of it answers a touch: china chinks and crumbs fly, screws jump, the mouse rattles in its box.
- **The customers are a third larger** (`FOLK_SCALE`) and have faces. Eyes with a pupil that goes where the hand goes; brows of each one's own kind (the owl's tufts and a feather stroke over each eye, the moth's feelers, the yak's heavy brows over her hair, a wrinkle over the tortoise's eye, a grey dash for the cockatoo, a pale one for the magpie); a beak whose lower half drops, a mouth that turns up or down and opens, the magpie's beak like a pair of tongs. A small customer stands lower so that its crest or its feelers or its neck have room under the awning (`STAND`).
- **Opinions.** While its gadget lies open, the owner starts at a clip, is delighted when the thing first runs, droops when it stops, winces at a blown lamp and is alarmed while a part is out in the hand, each from its own table (`watched`, `alarm` in `folk.ts`). Its spirits follow the gadget and show in its brow and in its gauge: the cockatoo's crest, the moth's wings, the tortoise's neck, the magpie's tail, the yak's fringe, the owl's lean and lids. At a pop a ring of feathers or hair stands out round head and shoulders, the owl's cap lifts off, the yak's fringe stands straight up, the cockatoo's crest bolts upright with every feather apart, the magpie's tail goes up, the moth's wings shiver, and the tortoise is in his shell.
- **The old hand, awake.** Drawn each frame from her model, about eighty paint calls: ringed tail up behind her shoulder, grey coat, a canvas apron with a pencil and a screwdriver in the pocket, the mask, heavy lids over pale eyes, goggles pushed up. One paw keeps her mug; the other is free on the counter and goes where she is busy. She sips (the mug comes up to her mouth, seen from the side), dunks a biscuit, combs her whiskers, pulls her goggles down so that her eyes are enormous, yawns with two small teeth, looks sideways at the customer with one brow up. She picks up a part laid at her side, holds it to her goggles and puts it back; she knocks twice on an open lid. At a pop her coat is a ring of spikes and stays one until she strokes it flat. Touch what is hers and her eyes narrow on it and her paw comes down beside it.
- **The lane goes about its day.** One at a time, with the lane empty between, each coming out from behind the pillar: a giraffe's neck and head, chewing, with an eye that slides round to the stall as it passes; a tower of three crates on a porter nobody sees, swaying, with a grey cat asleep on top; a red balloon with its string after it. On the doorstep across the way a pigeon struts and pecks, is up and gone at a bang, and walks back in from the side. Its numbers are in `lane.ts`, and the lane has its own clock, so a finger finds each where it is drawn.
- **What only looked touchable answers as itself.** Touched, the giraffe stops chewing, opens its eye all the way and puts its tongue out; the tower lurches and the cat opens both eyes and puts its tail up; the balloon is batted up, squashed for a moment, and comes down; the pigeon is off with three claps of its wings. Each answers wherever it shows, beside a customer's head as well as between two (`covers` in `standing.ts` holds each customer's outline, measured from its painter). Each thing on the washing line swings about its pegs and shakes its neighbours. On the shelf the toaster throws up a slice of toast, which turns in the air and goes back down the slot, and the radio's speaker throbs while its dial lights; her practice board rocks about its foot. With no board open, the three of a kind in a place of the tray, the coil, each bench odd and the test lamp swell where they lie when flicked, and sound as they do on a board.
- **The clockwork mouse.** Tin, blue-grey, pink ears, a wire tail, a brass key turning in its back; as long as a cell and a half. With one good wheel it only turns left, so it goes round and round the bare mat, running down. A tap winds it: it rears and is off. When a board comes down it is drawn once over the board, shooting out from under it, and then only its nose shows in its matchbox.
- **What a touch leaves.** A clip that bites: a white ring and sparks. A finger on the bare mat: a grey ring and its print, which fades. Only the mat takes a print: a finger on the wood of the bench or the steel of the counter leaves a small pale ring that is gone at once, on a wall or the awning a little dust falls, and in the air of the lane a few motes drift up; each is heard as what it is. A part set down: a squash and a ring of dust. A board coming down: it spreads a hair, settles, and a ring of dust goes out from under it. A short: a flash, puffs of warm air, sparks, and soot round the cell for seven seconds. A blown lamp: a flash, shards of glass and a wisp of smoke.
- **Cost.** Everything that stands still is in the one still layer. A frame adds, over what it drew before: the old hand (about eighty of the worst frame's 519 paint calls), the larger faces, at most one passer-by and the pigeon, the three things on the washing line, the mouse, two strokes of smoke, one figure for each effect still fading, and for the half second after a flick whatever was flicked in the tray or among the odds. The worst frame the budget test finds draws 72 figures. The four tiers change the pixel ratio only, as before. Measured at the look pass, and again after the washing and the flicks were added, back to back with the build before them, with no difference beyond the machine's own spread (`REFINEMENT.md`, pass 8). The look pass's numbers: on the production build, software Chromium, pixel ratio 2, tier 0 pinned, a busy fan board with a part beside the old hand: the game's own work a frame is 0.6 ms at the median and 0.8 ms at the 95th centile unthrottled, 2.6 and 4.4 ms at four times CPU throttle, 3.8 and 6.5 ms at six times; 40 to 43 figures a frame. No frame rate was measured: this machine has no graphics card.

### The toy (the stage before; its scene is gone)

What the Mount showed at the toy stage: the empty scene of the sheet. It is kept here as the record of how the toy looked. The game was built on the toy's controller and its one act; the old hand as she is described here, asleep at the corner of the mat, and the moth at the lamp are from that stage, and the look pass below replaced the old hand.

- **What is on the mat.** A cell and a lamp, each on its own small green strip with a solder blob for each pad, two lone posts between them, and the coil of leads in a pale dish. No board, no copper: every way the current can go is a lead the child clipped on.
- **Leads.** Red, yellow, green and blue by turn. A lead bows to one side and swings on a spring when it is bitten, dropped or flicked: it overshoots and settles. A short lead bows wide. The boot of a clip is the grip: it stands a fixed way back from the pad, where the finger takes it.
- **What a touch sets off.** A white ring where a clip bites. A grey ring where a finger pats the bare mat. At a pop: a puff of pale discs, the lead that carried the short glowing orange for about a second, and a red flag on a steel post, drawn over the leads so a lead across the cell cannot hide it.
- **The old hand** is heavy and slow. Her whole shape swells a hair with a breath every five seconds. In her sleep, every few seconds and never the same thing twice running: an ear flicks, the tail's tip curls, a paw twitches, a puff leaves her muzzle. At a pop her whiskers stand straight out and take seconds to lie back, one eye opens and shuts again, and the tea rocks in her mug.
- **The moth** is light and quick. It sits on the counter's edge with its wings near shut, fans them, combs a feeler, tilts its head or steps sideways. In the frame a lamp lights it is in the air, wings a blur, and it rings the lamp in one of four figures, always on the side away from the cell so the glass stays in view. A pop sends it back to its perch for two seconds. Its shadow lies on the mat beside it while it flies.
- **Idle guidance.** A breathing yellow ring with a dark edge on each thing that can be touched, then a pale hand with a dark outline that shows one move: one clip, one place it could go.
- **Cost.** One stamp for everything still; one sprite for the old hand and three for the moth; then a figure for each part, lead, glow and ring, and two fills for all the beads. About twenty figures with four leads and a lit lamp.

### The registry row

For the lead, when the look is accepted. The row for section 3 of `docs/art-direction.md`:

| Game | Style | Art guide |
| --- | --- | --- |
| Fix-it Stall | Electronics bench 2D: seen from straight above in daylight, green solder mask with copper traces and solder blobs, parts in their real colours with no faces, crocodile-clip leads in four colours, pale beads for the current, on a grey stitched mat laid on a pale wooden bench; a market stall seen from the mender's seat, with large flat-shaped animal customers who lean in under an awning from a sunlit lane and an old raccoon on a stool at the end of the bench | [`games/fix-it-stall/ART.md`](../games/fix-it-stall/ART.md) |

