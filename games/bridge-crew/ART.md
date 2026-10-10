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
  A sag, a force, a part count and a length get no numeral: each would be a reading of how well the child's work did. Both numerals are drawn through the game's own `symbols.ts`, the copy of the template's module, and nowhere else.
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

Five gestures: **lay** (drag from pin to pin), **pluck** (tap), **turn** (tap again while it still rings), **load** (put the trolley or a vehicle on it) and **take off** (drag its middle to the tray). Every cell looks and sounds different, and the wrong use of each object works.

| Object | Lay | Pluck | Turn | Load | Take off |
| --- | --- | --- | --- | --- | --- |
| **Plank** (the only roadway) | Lands flat with a broad clack; wheels can roll on it. | Groans low and whips like a ruler on a desk edge. | Rolls onto its edge with a clop: now tall and thin in the side view, it bends far less. A vehicle crosses it wobbling, as on a kerb. | Bends in a smooth curve, deepest under the wheels, with a creak that falls as the curve deepens; past its limit it cracks where the bend is sharpest. | Slides out with a long wooden scrape; whatever stood on it drops and bobs. |
| **Stick** (thin, square) | Lands with a light click; holds a push and a pull. | Pings when stretched, knocks when squeezed. | Spins on its pins like a propeller with a whirr and stops as it was: a square is the same both ways. | Squeezed and long, it bows in the middle with a thin rising squeak and snaps there. As a road a vehicle rides it like a rail, one wheel off, tilting. | Flicks into the tray like a spillikin, with a rattle of sticks. |
| **Tube** (rolled paper) | Lands with a hollow tok; fat and light. | Hoots like a blown bottle, lower when longer. | Rolls with a hollow rumble: anything parked on it log-rolls off into the water with a plop. | Takes far more squeeze than a stick of its length before it bows, crackling like a paper cup; pulled hard, an end pops out of its pin. | Rolls away down the sheet into the tray, drumming as it goes. |
| **Thread** | Unreels with a whisper and hangs in a loose curve until something pulls it straight. | Twangs, higher the harder it is pulled; slack, it only flops. | Whirls like a skipping rope with a swish at each turn; whatever hangs on it swings. | Pulled, it holds a lot and hums. Pushed, it goes slack without a sound and carries nothing. As a road it makes a tightrope: the vehicle dips into a V with its wheels gurgling in the water. | Whips back onto its spool with a zip. |
| **Pin** | Goes in with a small click. In rock or bank it is a footing that cannot move; in the air it is a hinge that ticks when a part on it shifts. | Every part on it rattles at once, each in its own voice. | A lone part on one pin swings round like a clock hand, ticking, and hangs straight down. | The trolley hangs from the pin itself by its hook and swings like a pendulum with a squeak at each end; its pull drags that one joint straight down. | Comes out with a pop; every part on it drops loose at that end with a clatter, and the build sags or folds from there. |
| **Test trolley** (with weights) | Set down with a clink, it sits on a plank; the deck dips under it and it trundles to the lowest point. | Rings one bell note for each weight on it. | Flips with a clank to ride under the plank on its wheels like a cable car, and rolls upside down to the lowest point. | Each weight added lands with a clunk and dips the deck by the same step again. | The deck springs back up and the weights jingle. |

**On day 15** the child can build a hybrid nobody showed them (stays over a truss, an arch tied by a thread), carry the heaviest vehicle on a bridge with half the kit still in the tray and almost no dip, make one bridge that suits two vehicles with opposite tastes, lay a tracing of last week's bridge over today's and run both under the same trolley, and play a tune on the threads of a bridge of their own.

## The representation

**The idea:** which building principles make a crossing stable and sturdy, found by testing to failure and improving.

**The representation:** a side view of a gap on a drafting grid, and a kit of four kinds of part that join only at pins. It was chosen before the game, and its physical shape is the idea:

- A pin is a hinge, so a shape holds only if its parts hold it. Four parts pinned in a square can lean over into a diamond without any part changing length; three parts pinned in a triangle cannot. The child sees the triangle's sturdiness in the object and is never told it.
- A plank is one stiff piece. Flat, it is shallow in the side view and bends easily; on edge, the same plank is deep and bends far less. That is the game's own reading of the profile principle, in the form a side view can show.
- A tube and a stick of one length differ: the tube holds much more squeeze before it bows, and less pull, since its end pops out of the pin.
- A mast on one footing falls over; two legs on a wide base stand.
- Sticks pinned in a curve between two footings carry a load by squeeze and push outward on the banks: the arch. Its pins are hinges too, so a curve of three or more sticks does not keep its shape by itself: it holds only where other parts hold its joints, and the model works out whether they do.
- The load is a vehicle with a visible number of crates, or a trolley with a visible stack of weights, standing on the deck at a place the child can see.

**Where the model is true.** The game computes the build as an engineer's plane frame at rest: each part stretches, squeezes or bends in proportion to the force in it, pins pass no turning force, a thread carries pull only, a squeezed part bows when it is long and thin, and a build whose shape is not held is found as such and folds the way its geometry lets it. The vehicle is a set of weights that stand at each place along the deck in turn. Which part carries what, where the deck dips, which part gives first and where, and whether the build folds are all results of that calculation, and nothing overrides them.

**Where it is not science, and says nothing.** The dip is drawn larger than computed, by one fixed factor for every part and every bridge, so that it can be seen. The fall after a break is a cartoon. The bounce of a moving wheel, wind and water are left out. The strengths of balsa, paper and thread are the game's own numbers, in no unit, chosen so the four parts differ the way the real materials do.

**Evidence.** Building stick and paper bridges and loading them to failure is school practice without a trial behind it. For the fair-test half there is a trial: children shown one clean comparison learned to change one thing at a time far more often than children left to find it (pack: game-design, guided-discovery.md).

**Object, picture, symbol.** The object is the kit part on the sheet. The picture is the tracing: a white line drawing of a whole bridge on tracing paper, which can be laid over another bridge. The symbol stage stops at the two numerals named under the first heading. There is no formula, no unit and no number for a force.

## The four mechanic questions

- **Swap.** No: the play is the frame itself, and with other content there would be nothing left to build, test or watch fail.
- **Attention.** At the moment of decision, which is where to lay or remove one part before the next test, the child must look at where the last test broke, bent or folded and think about what would hold that place.
- **Fun.** The test run is the most enjoyable moment of play and it is the skill: the crossing, the creaks, the break and the splash are the fair test and its result.
- **Guess.** Random parts make something that stands or folds but rarely a crossing; the kit on a sheet is too small to lay every part everywhere, and a bridge made by piling parts on is heavy, dips under its own weight and shows on the cargo of the vehicle that rides it.

## The error as a consequence

A wrong design is run exactly as built, and the world shows where and why.

- **A part too weak** gives at the instant the wheels reach the place that overloads it, and at the spot the model names: a plank cracks where its bend is sharpest, a squeezed stick bows and snaps in the middle, a thread parts with a ping, a tube end pops from its pin. Before it gives, it shows its strain: a pulled part draws thin and its sound rises, a squeezed part bulges and creaks.
- **A shape not held** folds: the square leans into a diamond and lies down, slowly, with no part broken.
- **A gap in the roadway** lets the vehicle roll off the end of the plank.
- **A thread where a push is** hangs slack and carries nothing, so the load goes elsewhere and that part gives.
- **Then:** the vehicle drops into the river, floats on its crates, paddles to the near bank and drives back up. Nothing is lost.
- **The state stays.** The give ends with the bridge back exactly as built, and a touch brings that at once. The part that gave first lies back in place with a pale pencil ring round the spot where it gave. There is one ring at most: it stays until that part or one of its neighbours is changed, a later give moves it, or the job vehicle crosses. The child changes one thing and sends the vehicle again.
- **Success is a consequence too:** the vehicle reaches the far bank, and how it rode shows on its cargo and its driver.
- No buzzer, cross, sad face or reset, and no part is used up by a failure. Feedback thins with practice: the strain shows on every part during a sheet's first tests and, after that sheet's vehicle has crossed, only on a part within a fifth of its limit.

## The designed order, and what is stored

**A sheet** is one drawing sheet with one gap, one kit and one vehicle whose job it is to cross: the job vehicle. **A cycle** is one sheet's job, from the touch that unrolls the sheet to the judging.

**The order.** Each position lays out a sheet that brings one new thing; the ids name places in the game's own order.

| Id | The one new thing | Gap and kit | Job vehicle |
| --- | --- | --- | --- |
| `plank-gap` | A plank, and turning it on edge | Narrow gap; planks | Post van |
| `rock-prop` | A stick as a prop on a footing | Wider gap with a rock in the river; planks, sticks | Post van |
| `first-triangle` | The triangle | No rock; planks, sticks | Post van |
| `jelly-run` | A new vehicle and its tastes | As before, a little wider | Jelly truck |
| `truss-span` | Triangles in a row; a long squeezed stick bows | Wide gap; planks, sticks | Jelly truck |
| `tube-post` | The tube | Deep gorge, a rock far below; adds tubes | Jelly truck |
| `piano-day` | A new vehicle: a heavy load on two close axles | Known kit | Piano mover |
| `high-thread` | The thread | Cliffs with footings above each bank; adds thread | Piano mover |
| `tall-bus` | A new vehicle: it needs headroom | Cliffs again | Giraffe bus |
| `mast-and-stay` | A mast the child builds, on a wide base | No cliffs | Piano mover |
| `arch-gorge` | The arch | Sloping gorge walls with low footings | Giraffe bus |
| `barge-below` | A barge passes underneath and wants the channel clear | Rock off-centre | Jelly truck |
| `thin-kit` | A limit: about half the usual kit | A known gap | Piano mover |
| `long-haul` | The longest gap | Full kit | Piano mover |
| `open-yard` | A free place to build | A wide site with rocks and cliffs; the whole kit | Whichever vehicle the child picks |

- **The same position comes back in another form.** Each position has three variants (the gap a cell wider or narrower, the rock or the cliff moved), taken in turn each time the position is laid out.
- **How the cycle is judged.** Well: the job vehicle crossed after at most three failed runs. Mixed: it crossed after four to seven. Badly: eight failed runs without a crossing. Trolley tests and other vehicles never count. The position moves one step by the template's rule, and at `open-yard` it stays.
- **A way back in.** After a cycle judged badly the next roll arrives exactly as it does after a crossing, with no mark on anything. The unfinished sheet stays on the rack as built.
- **A sheet taken back from the rack.** Its judging is over: runs on it never count, never move the position and never lay out a roll. It shows its job vehicle parked on the far bank if that vehicle has crossed the bridge as it stands and has not been sent home since, and at the near bank otherwise, both rebuilt from that sheet's own entry. The newest sheet is not rebuilt that way: while it lies on the rack it keeps its tries, its waiting vehicles and its parked vehicles, which `tries`, `waiting` and `across` hold, and its cycle goes on when it is back on the board.
- **A harder option the child picks, and that looks harder.** After the job vehicle has crossed, one other vehicle waits at the near bank with more crates showing, and the child may send it or not. The trolley takes one to six weights. Neither moves the position.
- **Which sheet a new position lays out.** While the child builds, the only vehicle waiting is this sheet's own. The next sheet is laid out at the moment the cycle is judged, from the position as that judging left it, and waits as a roll at the right edge with its vehicle's nose showing. So a moved position shows on the very next sheet, and never on one already waiting.
- **Nothing shows the position:** no number on a sheet, no map of sheets, no mark that a sheet is an easier one. The rack shows only sheets the child has had.
- **The numerals** lie where the first heading says: beside the trolley's stack and beside a vehicle's crates.

**Every field of the saved state.**

| Field | What it holds |
| --- | --- |
| `v` | The version. |
| `position` | The id of the position the next sheet is laid out from. |
| `finished` | The newest sheet's cycle has been judged. Every older sheet on the rack was judged before the next was unrolled, so no sheet carries a field for it. |
| `sheets` | The rack: the six sheets the child had last, oldest first. Each holds its position id, its variant, the bridge as a list of parts (kind, the two grid points, turned or not, and which end, if any, hangs loose because its pin was taken off), up to two tracings as the same kind of list, the trolley's weights and where it stands or hangs, which vehicles have crossed it as it stands and whether its job vehicle has been sent home since, the part and spot of the pencil ring, and the parts a hat hangs on. When a seventh sheet is unrolled the oldest slides off the end of the rack, in view. |
| `on` | Which sheet of the rack is on the board. |
| `next` | The sheet laid out at the last judging and waiting as a roll: position id and variant, or nothing. |
| `waiting` | Which vehicles stand at the near bank of the newest sheet: its job vehicle until it has crossed, then the one other vehicle until it has crossed, and each of the two again once it has been sent home. A vehicle is never in both `waiting` and `across`. |
| `across` | Which vehicles are parked on the far bank of the newest sheet: each of its two vehicles from its crossing until it is sent home. A change to the bridge leaves them where they are. |
| `tries` | Failed runs of the job vehicle in the newest sheet's cycle. Never shown. |
| `laid` | For each position, how many times it has been laid out, which picks the variant. Never shown. |
| `shown` | The showings that have been given: each idea whose neat way has been shown, and whether the one change has been shown. |

- A part in the hand is saved where it came from. A run is a view of the saved bridge and is not saved: after a put-away in the middle of one, the vehicle stands at the near bank and the bridge is as built.
- A scene's outcome is saved when the scene starts. No clock is read.
- The largest legal state (six sheets, each with a full bridge and two full tracings) serializes under half the 64 KB cap, and a test says so.

## The characters and their fixed tastes

The characters are the vehicles and their drivers, a barge, and the crew chief. Each reacts to the exact bridge the child made, by what the model computed for that run. No reaction is about the child, and a vehicle that waits tinkers with its own cargo and never hurries anyone.

| Character | Its one visible want | Likes, always | Dislikes, always |
| --- | --- | --- | --- |
| **Post van** (2 crates) | To cross with its tower of parcels standing | A deck that hardly dips: the parcels stay stacked and the driver whistles | A deep dip: parcels slide off the back one at a time, and the driver gets out and restacks them |
| **Jelly truck** (3 crates and a jelly) | To deliver the jelly in one piece | A long, even dip: the jelly rolls in one slow wave | A kink where two planks meet at an angle: the jelly jumps and lands on the cab roof. A deck with no dip at all bores it: the driver yawns |
| **Piano mover** (4 crates on two close axles) | To keep the piano on the cart | A level way on and off: the keys ripple in a chord | A slope: the piano rolls backward and the mover runs behind it, holding on |
| **Giraffe bus** (3 crates, tall) | To keep every hat on | Open sky over the road: the necks stretch | Any part lower than its heads: the necks duck in a wave and a hat stays hanging on that part until it is plucked off or the part is taken off (saved with the sheet) |
| **Caterpillar bus** (5 crates on six axles) | To keep in step | Pins under the deck at even spacing: its feet tick in time and it hums a scale | Uneven spacing: it loses step and hiccups |
| **Barge** (passes underneath) | A clear channel | Open water mid-river: it toots | A prop in the channel: it scrapes past and its flowerpot falls in and bobs back |
| **Crew chief** (a heron with a pencil behind its ear) | To finish the small model it is fiddling with in the margin | A triangle: it taps each side with its beak and listens to the knock, head on one side | A shape that folds: it steps back with its feathers on end |

**The want at rest.** The job vehicle stands at the near bank facing the gap, creeps to the edge, looks down, looks across at the far bank and backs up. A vehicle that waits beside it shows its own want with its cargo; the caterpillar bus marks time on the spot, its feet falling in and out of step. On a sheet with a barge, the barge lies moored upstream in view, its bow toward the channel, and noses forward and back. The tray of parts sits open under the gap.

**The idle ladder** (attended time only): first the pins and the tray glow; later a ghost hand lays one part between two pins away from the gap and takes it off again. It shows the gesture and never where a part belongs.

Since the tastes differ and never change, "better" has more than one meaning and the child can aim at one on purpose: a stiff deck for the van, a soft one for the jelly, nothing overhead for the bus.

## The scenes

Each scene is a list of timed beats filled in from the run just computed. Any touch ends a scene at once in its last pose, and its outcome is saved when it starts.

- **The crossing** (the ending; about 8 seconds). Cause: the job vehicle reaches the far bank. Beats: the wheels leave the last plank and the bridge springs up and rings with the notes of its own parts; the vehicle's cargo and driver show how this ride went, by its tastes; it parks in the lay-by on the far bank and stays there; the pencil ring, if there is one, fades; the next roll slides in at the right edge and one other vehicle draws up at the near bank. Filled in from: the dip along the deck, the kinks, the parts overhead and in the channel, the pin spacing.
- **The give** (a consequence; 4 to 6 seconds). Cause: a part gives, the build folds, or the roadway ends. Beats: the part gives at its spot; the pieces drop; the vehicle falls, floats on its crates, paddles to the near bank and drives up, shaking off water; the chief looks up from its model. It ends with the bridge back as built and the pencil ring on the spot.
- **The neat way** (shown once for each idea; 6 to 9 seconds). An idea is a part, a shape or a way of standing that a position brings as its one new thing: the plank on edge, the prop, the triangle, the row of triangles, the tube, the thread, the mast on a wide base and the arch. A position whose one new thing is a vehicle, the barge, the thin kit, the longest gap or the free yard has no neat way. Cause, on a sheet whose idea has not been shown: the first failed run of the job vehicle, from its second on, whose failure is one that idea answers; or, if the job vehicle crosses before any such run, the end of the crossing on that sheet, once the vehicle has parked. Either way the child has tried their own way first. An idea that a cycle ends without showing is still owed the next time its position is laid out. Beats: the chief pins a hand-sized model together in the margin from offcuts, first the way that fails (a square that leans over), then the idea (the same square with one diagonal); it stands on the model, which holds; it looks at the model, never at the child. Filled in from: the sheet's idea and, after a failed run, the kind of failure. From then on the model stands in the margin of every sheet of that position (rebuilt from `shown` and the sheet's position id) and can be pressed and plucked. It is never a model of the gap on the sheet.
- **One change** (the fair-test showing, once; 8 to 10 seconds). Cause: the child runs the trolley over a bridge with a tracing laid on it, and the two differ in more than one part. Beats: the chief sets two small models side by side that differ in two things and loads both, and nothing tells which change helped; it swaps one part back so they differ in one thing and loads them again, and the difference shows. Filled in from: two of the differences between the child's bridge and the tracing, the two nearest the trolley, each a part added, left out, moved, turned or changed for another kind; those are the two things the chief's models differ in, and the models are never the child's bridge. The two models are cleared from the margin when the scene ends and are not saved. Then the board is the child's.
- **Secrets**, which work every time and are never hinted: threads plucked from longest to shortest play a scale and the chief taps along; under a whole arch the barge's horn comes back as a chord; a hat left on a part can be plucked off and is then worn by the chief until the next sheet is unrolled; the worn hat is short-lived and is not saved.

**Comparing, as play.** The tracing paper in the tray takes a white line copy of the bridge as it stands. A tracing laid on the board is computed under the same load at the same place as the bridge, and its dip is drawn as a second line. A tracing can be swapped onto the board, or one part can be copied from it.

**How a cycle ends and the next begins.** The crossing stays as it ended for as long as the child likes: the vehicle parked on the far bank, the bridge standing. Where the crossing causes the neat way, that scene is the last part of this ending and gives way to any touch; after it, and everywhere else, nothing starts by itself. A touch on the roll unrolls the next sheet and puts this one on the rack. A touch on the parked vehicle sends it home across the bridge again, which is a real run; it then stands at the near bank beside the other vehicle, and `waiting` holds that. On load no scene replays: the world is as the last scene left it, with the roll and the other vehicle waiting.

## The records

Read through the lookup on 2026-10-03. Subject: science.

### us-ca

Levels, as the lookup prints them for science at ages 9 to 12: `grade-4` at 9 and 10, `grade-5` at 10 and 11, `grade-6` at 11 and 12, and beside each the `cross-grade` lane, labelled cross-grade: its statements hold for every grade, not for this age in particular. Age mapping: derived. Gaps as printed: at 9, "Grade 3 is not in the pack. A third grader turns nine during the year; grade 4 starts at nine."; at 12, "Grade 7 is not in the pack. A sixth grader turns twelve during the year; a child who starts the school year at twelve is in grade 7."

The game is designed from the `cross-grade` lane and the `grade-6` lane, for the loop of testing, improving and comparing only. No `us-ca` record is named for the building principles (what makes a structure stable and sturdy): none of the four science lanes returned at these ages holds one, and nothing is named in its place. The `grade-4` and `grade-5` lanes hold no record on built structures (`us-ca 4-ESS3-2` gives a building that withstands earthquakes only as an example of a solution to a natural hazard), so no record of either is named.

- `edu.us-ca.cross-grade.science.objective.3-5-ets1-3` (`us-ca 3-5-ETS1-3`) [cross-grade]: state-board-adopted-standard, confirmed. In the game: the child runs the same load over the model bridge, changes one part, runs it again, and looks at where it gave to find what to improve.
  Limits taken: a band record for grades 3 to 5, not one grade; the tests are fair tests with the other variables held, aimed at finding what to improve. Not in Limits: the load, the material and the kind of structure, which are the game's own choice.
- `edu.us-ca.cross-grade.science.objective.3-5-ets1-2` (`us-ca 3-5-ETS1-2`) [cross-grade]: state-board-adopted-standard, confirmed. In the game: the child keeps two or three designs for one gap as tracings, lays one over another and picks which to build before any run.
  Limits taken: a band record for grades 3 to 5; the comparison is by how well each design is expected to do, and building and testing are not in this record. Only the choice made before a run rests on it.
- `edu.us-ca.grade-6.science.objective.ms-ets1-engineering-design-ms-ets1-2` (`us-ca MS-ETS1-2`): state-board-adopted-standard, confirmed. In the game: a tracing laid on the board is run under the same load at the same place as the bridge, so two designs are judged by one fixed procedure.
  Limits taken: holds for the band of grades 6 to 8, not grade 6 alone; no clarification and no assessment boundary printed.
- `edu.us-ca.grade-6.science.objective.ms-ets1-engineering-design-ms-ets1-3` (`us-ca MS-ETS1-3`): state-board-adopted-standard, confirmed. In the game: after running two designs the child copies the part that worked from the tracing into the bridge on the board.
  Limits taken: band of grades 6 to 8; no clarification and no boundary printed.
- `edu.us-ca.grade-6.science.objective.ms-ets1-engineering-design-ms-ets1-4` (`us-ca MS-ETS1-4`): state-board-adopted-standard, confirmed. In the game: the bridge on the sheet is a model whose runs give the dip, the strain and the place of failure, and the child changes it round after round.
  Limits taken: band of grades 6 to 8; no clarification and no boundary printed.

Named in the brief and not used: `us-ca 3-5-ETS1-1` (the game sets the gap, the load and the kit, and the child does not state them) and `us-ca 5-PS2-1` (weight pulls everything in the game downward, and the child makes no argument about it).

### nl

Levels, as the lookup prints them for science: `fase-2` at 9 (sub-band: groep 5 or groep 6; the goals are for the whole band, groep 4 to 6) and at 10 (groep 6); `fase-3` at 10 (groep 7), 11 (groep 7 or groep 8) and 12 (groep 8); and beside each the `einde-po` lane, labelled end-of-primary goals: what a school works towards by the end of groep 8, not what a child of this age should master. Age mapping: convention. Gap as printed at 12: "A child who starts the school year at twelve is usually in secondary school, which is not in the pack."

- `edu.nl.fase-2.science.objective.e358bee9-5fb8-48bc-a017-77e45d5da836` (`nl ojw/nattech/3/01/fase2`): curriculum-institute-guidance, confirmed. In the game: the child finds out by building and loading which shapes keep a crossing stable and sturdy.
  Limits taken: an offer for the band groep 4 to 6, with no year; the five principles (wide base, triangles, arch, profile, tube) and the four places (cupboard, tower, pyramid, bridge) are examples; Limits reads a profile as a strip or sheet with a folded or shaped cross-section and says the wording does not explain the word. Left open by Limits: materials, loads and sizes, which are the game's own choice. Beyond the record, as the game's own reading: the plank turned on edge stands for the profile (a deeper cross-section, not a folded or shaped one); the rolled tube is the kit's one shaped cross-section.
- `edu.nl.fase-2.science.objective.6a502ec1-5c26-48d6-b4e3-652e082a9c45` (`nl ojw/nattech/3/02/fase2`): curriculum-institute-guidance, confirmed. In the game: the child makes a crossing that uses a profile (the plank on edge) and triangles.
  Limits taken: an offer with no year; the two principles are examples; this record is about making, and investigating is the record above. Left open: the object, its size and its material.
- `edu.nl.fase-3.science.objective.319db8b5-fb05-443e-8f7a-a16d2e8f7631` (`nl ojw/nattech/3/01/fase3`): curriculum-institute-guidance, confirmed. In the game: the child designs a crossing for a gap from the kit and makes it.
  Limits taken: an offer for groep 7 and 8, with no year; the principles are examples; a profile is read there as a strip or sheet with a folded or shaped cross-section, so the plank on edge is the game's own reading, as under `nl ojw/nattech/3/01/fase2`. Left open: object, size, material and load.
- `edu.nl.fase-3.science.objective.b618c7a5-ba69-42d8-a62b-2f49216bca14` (`nl ojw/nattech/3/08/fase3`): curriculum-institute-guidance, confirmed. In the game: the child sets up two designs that differ in one part and runs both under the same load.
  Limits taken: an offer with no year; the record does not explain "comparative" and does not name the principle, so one change under one load is the game's own reading.
- `edu.nl.einde-po.science.objective.e652ff27-3b26-4820-8d7b-32e9d38836e1` (`nl 45`) [end-of-primary goals]: legal-core-goal, regime 2006, confirmed. In the game: the child designs a crossing, carries it out and judges it by the run.
  Limits taken: a 2006 core goal, still in force; three steps named. Left open: the problem, the material, the tools, and how often the steps repeat.

Named in the brief and not used: `nl ojw/nattech/2/04/fase3` (it names four forces and ties none of them to a structure; the game shows the pull of weight and investigates none of the four). Three draft core goals come near, 29 C b, 30 A d and 30 C c, each a draft core goal, not in force; the game rests on none of them.

### Where the two differ

- **What is named.** The `nl` fase 2 and fase 3 records name the content: principles that make a construction stable and sturdy, a bridge among the examples. The `us-ca` records named here name only the design process, and no `us-ca` record is named for structures. The game follows `nl` for what the kit shows (the triangle, the profile, the arch, the wide base, the tube) and `us-ca` for the loop (test fairly, look at the failure, improve, compare designs).
- **Where the levels change.** As the lookup prints them, `us-ca` returns `grade-4` or `grade-5` at 9, 10 and 11, where the records used are the cross-grade band for grades 3 to 5, and `grade-6` at 11 and 12, whose engineering records hold for grades 6 to 8; `nl` returns `fase-2` at 9 and 10 and `fase-3` at 10, 11 and 12. The two change at different ages and neither names one year. The game follows neither change: nothing in it turns on a level, and the first-visit default at 11 is the game's own choice.
- **Comparing two designs.** `us-ca` names the fair test for grades 3 to 5 and the judging of rival designs by one procedure for grades 6 to 8. Of the `nl` records named here, the fase 2 ones name investigating and making; designing and the comparing experiment are named at fase 3. The game follows `us-ca` here: testing one change under the same load, and comparing by tracing, are open at every age, and nothing in the designed order holds the trolley or the tracing back.
- **Not carried by either.** None of the ten records the game is designed from ties a force to a structure, and none names tension, compression, a beam, a cable or a prop. Those are in the game's model as its own choice and in no claim.

### The claim

Bridge Crew is designed from five California State Board-adopted science standards on engineering design (`us-ca 3-5-ETS1-2`, `us-ca 3-5-ETS1-3`, `us-ca MS-ETS1-2`, `us-ca MS-ETS1-3`, `us-ca MS-ETS1-4`; all confirmed), and from four goals of SLO's curriculum guidance for fase 2 and fase 3 (`nl ojw/nattech/3/01/fase2`, `nl ojw/nattech/3/02/fase2`, `nl ojw/nattech/3/01/fase3`, `nl ojw/nattech/3/08/fase3`; guidance, not law; all confirmed) and the Dutch legal core goal 45 of 2006 (`nl 45`; still in force; an end-of-primary goal; confirmed). From the California standards it takes the loop of fair test, failure, improvement and comparison, and it does not teach structures on their authority. From the Dutch records it takes which building principles make a crossing stable and sturdy. It says nothing about what a child has reached.

## The look

Not part of the sheet. First reserved look: **Blueprint and balsa**. Spiked on the game's real scene (`spike.ts`, still reachable with `spike=1` in the address), and now the look of the game. Every frame rate is the lead's to take; nothing here has been measured on a graphics card.

**What it is.** A cyanotype drawing sheet with white drafting lines and a faint grid, and real parts lying on it, each with a small hard shadow. One blue, one white line, and unstained balsa, drawing paper, steel pins and string on top. No stains, no toys, no playroom, no brass, no lamplight, and no lettering: the gap's centre line is the one draughtsman's mark, and there is no dimension line over the gap.

**What is in the frame** (since the look pass; `valley.ts`, `drift.ts`, `crew.ts`, `crewfig.ts`). The gap is in a valley, drawn on the sheet in the same line and fainter than any part (a fifth to a half of the ground outline's strength):

- *Behind the road:* two skylines of far hills over each bank, which fall away to nothing toward the gap so the sky over the gap stays clear for the bridge; on the hills over the far bank a finished bridge on round arches, somebody else's; a house on the hills over the near bank; trees of three kinds (only the round one shows a trunk), grass in tufts of two blades, and, well back from the gap, posts with a slack rope; on the far bank a lay-by, a paved strip a little paler than the sheet, where a vehicle that has crossed parks. Where vehicles wait or park, as far back from each lip as two of them stand, nothing is upright or level at a numeral's height: no tree, no post and no tick of a hill's contour, only low bushes, lower than the foot of a numeral and close together.
- *In the cut ground:* the beds of the ground as two uneven lines through each bank, pebbles as flat dashes, roots under the trees, a burrow with a bed and a lamp under the near bank, and three or four other finds (a clam shell, a bottle, a boot, a pot, a chest), each sheet with its own.
- *Along the foot of the sheet:* the ledge the crew stand on, and where there is room a set square, a rubber in its paper sleeve, the drawing's title block with one rule across it and nothing in it, and a mug.
- *At the edge, moving:* three clouds and a balloon cross the sky; smoke rises from the house's chimney; a train crosses the far bridge every half minute or so; a fish leaps; a paper boat sails the widest open water end to end; the mug steams. On the barge's sheet the barge is the boat: it lies moored upstream of its channel, its bow toward it and just short of it, and noses forward and back; the rock of that sheet stands beyond the channel, so the barge's way down it is open water; and the fish keeps to the water astern of the barge, where no hull comes.
- *The crew,* at the foot of the sheet left of the tray, each about two cells tall: a beaver with a balsa hard hat, two paper teeth, a tail in scales and a flag, and a mole of grey paper with spectacles, a pin for a nose, a bare board and a folding rule.

All of the still part is painted once into the sheet's stamp. Nothing in it is a word, a letter or a figure, and nothing in it but the crew answers a touch or looks as if it would.

**No shape that reads as a sign.** The whole folder's drawing was read for this, shape by shape, and what a careful adult could plainly or arguably take for a sign was changed. The rules that came of it:

- *Beside a numeral nothing is upright, level or round.* A vehicle's numeral stays upright beside its crates however the vehicle is tipped, and the trolley's beside its stack however it swings. Behind the line-up there is no trunk, post or contour tick. The tools' box is two closed compartments with a wall from top to bottom. The trolley's handle is a closed hoop; hung from a pin it hangs by two strings to the ends of its bed, which close a triangle; hanging (from a pin or under the plank) its numeral lies beside the stack's foot, past the end of the bed, with no string beside it and a patch of the sheet's blue under it, so that hung low it does not lie on the water's dashes; the weights not on it lie two to a row in the corner of its compartment, none over its numeral; at home with the one weight it comes with it has no numeral, and none while it turns over or falls. The jelly's plate is a filled dish no wider than the jelly. The veil over a floating vehicle reaches a cell beyond its numeral, so no dash of the water lies beside it. The splash's drops are filled tears. The pencil ring is a loop drawn by hand in pale pencil that does not quite close: not a clean nought in the numerals' white.
- *Nothing is two bars that cross, a bar on a bar, or rays from one point.* A crate is a framed panel with a nail in each corner; a parcel has a filled label and no string; the splinter is four chips; grass is two blades from two feet; the hill has a house and not a windmill; there is no dimension line over the gap; each dash of the gap's centre line lies inside one cell of the grid and none crosses a rule; the far bridge has one rail; the title block has one rule; the chief's crest is rooted behind its pencil; the block that loads a model sits on its strip.
- *Nothing open reads as a letter where a closed or filled shape will do.* A footing pin stands on a filled wedge. The models stand on blocks or a base board and are closed all round: the tube's two posts stand on a base board, the thread's hinge hangs inside a frame of two posts and a beam, the wide base is a triangle on its board with a pennant on top, and each of the one change's models has a block under each end and, for a stay, a frame. A squeezed stick bows in a curve, not in two straight halves. A rubber lies where a pair of compasses would point. A pine has no stem under its tiers and a poplar is a flame that comes down to the ground. The shell is a clam, not a coil. The barge's pot has two filled leaves; the caterpillar's feelers curl and end in bobbles; the van's driver and the piano's mover have paper arms, the mover's far from parallel; the beaver's tail has filled scales in a stagger.
- *Nothing is a row of marks that could be writing or a tally.* The mole's rule has a hinge at each third and no marks, its whiskers start from three roots and curve, the crew's paws are paper mittens, and the chief's feathers on end are five paper feathers of five lengths. The spool is one filled bobbin that thins as threads go; the parts of a pile lie on one another, touching and a little askew; the rolls on the rack hang at uneven heights and a little aslant; the set square has no ticks; the boot has eyelets; the title block and the mole's board are bare.
- *What glows or is marked is a filled patch:* exhaust, dust, smoke and bubbles are filled dabs; a glow, the place a part will land, the specks from a pin, the picked pile, the sheet on the board in the rack and a vehicle that can set off are patches of light with no outline; a pulled pin leaves a pinhole; the roll's end has a dab at its middle, not a second ring.
- *Left as they are,* because they are the thing itself or far-fetched: a wheel's spokes, the mole's spectacles, the horn's three arcs, the ripples (shallow curves), a thread that goes down in a V under a wheel, the shapes a child's own parts make (two sticks may cross), and a shape that a model passes through for a second or two while it folds or is pinned together.

**Palette** (`INK` in `look.ts`).

| Thing | Colour |
| --- | --- |
| The sheet, its darker pooling and paler wash | `#1f4f8f`, `#1a437c`, `#2a5c9d` |
| The shadow a part throws | `#123463` |
| The drafting line | `#f2f6fb`, from 13% (grid) to full strength (the ground's outline) |
| Balsa: face, grain, cut edge | `#ecdcb6`, `#d8c391`, `#b9a16d` |
| Drawing paper and its shade | `#f6f2e8`, `#d9d3c4` |
| Steel pins | `#dfe5ec`, rim `#6d7a8a` |
| String and its twist | `#efe7d2`, `#b8ab8a` |
| The pencil behind the chief's ear and the one on the tracing pad, the only warm accent | `#e3b23c` |
| Tracing paper lying on the sheet, the sheet's blue made paler; what is traced on it is the drafting white | `#6f93c4` |
| The jelly, a pale blue-white | `#dfeaf6` |
| The pencil ring where a part gave, a pale pencil greyer than the drafting line | `#c9d3e0` |

**Materials.**

- *The sheet* is painted once for each size and each sheet on the board: the blue, broad uneven washes, the grid with every fourth line firmer, a border ruled twice. Every ruled line is drawn in a few lengths whose width wavers.
- *The ground* is shown cut through, as a draughtsman would: a firm outline and slanted section hatching. Cliffs stand behind the road, fainter. Water is a broken line with shorter dashes under it.
- *A working part stays plain* (pack: game-design, working-objects-stay-plain.md): a balsa rectangle with a few grain lines and a darker cut edge, or a paper tube with its seam, and nothing else. What a child reads is its length, its depth and its pins. A plank flat is a little deeper on the sheet than a stick, and a plank on edge two and a half times as deep as a plank flat.
- *A pin* is a steel head seen from above with one hard highlight. A footing pin stands on a small filled wedge.
- *The characters* are models made of the same stuff: balsa blocks, cut paper, pins for axles, a label on each parcel, and faces in pencil. The look and the comedy live in them and in the setting, not in the parts.
- *Shadows* are the same shape moved down and right by a fixed part of a cell, in the darker blue, with no blur.

**Lighting.** None is simulated: flat daylight on a desk. Depth comes only from the hard shadows and from what lies on what (string under wood, wood under pins).

**Motion rules** (`pose.ts`, `motion.ts`, `acts.ts`, `stage.ts`, `view.ts`).

- *A firm part* is stiff light wood: it lands from a little above with its shadow a beat behind it, overshoots once and is still. Nothing is rubbery. A thread unreels from its first pin to its second in a quarter of a second, and its shadow lands a beat after it too.
- *A plank under a load* bends in a smooth curve, deepest under the load: it is drawn as short lengths from point to point along it, through the points the model gives, so a wheel or the trolley stands on the curve. A traced plank's second line bends the same way, and the part of a tracing that would give under the load is drawn parted.
- *A build that folds under a load* (a stay went slack and nothing holds its shape) folds slowly into what it is without that stay, which hangs slack from its pins, and goes back as built when the give is over.
- *A pulled thread* draws thin, by the share of its strength in use, where strain is being shown.
- *A part that gives* breaks at its spot: its two pieces hang from their own pins, as far down as the ground lets them, and close up again as the bridge goes back as built. A tube pulled apart does not break: its end pops out and it hangs whole; squeezed past its limit it buckles in the middle like any other part. A stick squeezed near its limit is drawn bowed, in a curve of short lengths. The same is seen for a second when a part gives under the trolley, or under nothing but the bridge's own weight.
- *A part taken off* goes back to the tray its own way: a plank slides out along its own length and goes down flat, a stick is flicked and spins in an arc, a tube rolls down the sheet level, a thread runs in to its near end and zips to the spool.
- *A part the model leaves out* swings from whatever still holds it, slowly, about half a second from upright to the ground, and knocks against the bank where it meets it. What hangs from it is pinned exactly to its end and hangs from there in turn. A part pinned at each end to a part that swings goes with both where they come to rest its own length apart: so a square whose diagonal is taken off leans into a diamond with its top on, and lies down whole. What nothing holds lies on the ground or on the water. A lone part on one pin, its pin turned, goes right round once and then hangs. A hinge ticks at each notch a part on it turns through, and once for each small distance a part on it shifts; a part that lies against a rock is still, and a settled bridge is silent.
- *A plucked part* shakes and dies away in under a second, each kind in its own way: a stick and a tube shift as one stiff piece, the stick fast and fine; a plank whips like a ruler, its pins still and its middle going from side to side; a thread goes widest. A pin plucked shakes every part on it as far.
- *A part being laid* is drawn from its pin to a grid point, and from grid point to grid point as the finger moves: never to the finger between two. It drops the moment the finger lifts: the next drag is the next part.
- *The chief's model* is pinned together in view: the way that fails goes together piece by piece in the first quarter of the showing; for the idea, the square stands up again, the pieces the two have in common stand, and the idea's own piece (the diagonal, the post, the thread) goes on last, before the chief stands on it. A block that loads a model comes with the strip it sits on. *The one change's two models* are set down one after the other, loaded, the block lifted, the one part swapped back in view (it lifts out and the other comes down into its place), and loaded again; any one difference between them is drawn as four pixels of dip or more.
- *A plank's groan* is lower the more of its strength is in use, by up to three tenths: the force in a plank is its bending as well as the pull or push along it. *Under a load* a part is first heard at a sixth of its strength, and its sound follows how it is strained: a pulled part's sound rises, whatever it is made of; a bent plank and a stick squeezed short creak lower; a stick squeezed long squeaks higher as it bows.
- *What is heard with it.* A pin plucked rattles each part on it in that part's own voice, one after another: its own wave and its own pitch. A slack thread only flops, and a thread plucked by itself is only its own voice, so nothing hints at the scale: it sounds from the second thread of a run of threads that hold something, each as long as the one before or shorter, and a flop or a longer thread ends the run. The run is kept as the threads themselves: a part laid between two plucks leaves it as it was, and it starts again when one of its threads has been taken off or another sheet is on the board. The chief taps along from the scale's second note, one knock to a note, and gives its three knocks when every thread that holds something has been plucked in order. A hat left on a part swings when the part is turned, and hangs still again; it comes off at a tap (a touch that goes on to be a drag takes nothing), and the chief wears it on top of any it has. A hat is in one place: on a giraffe, on a part, or on the chief. Every part lower than the bus's heads gets one, as the sheet has it, though the bus has three heads. A hat is a party hat wherever it is: a cone with a brim and a bobble.
- *At the free yard* one vehicle waits, as on every sheet. It rolls back from the gap with the finger; let go a cell or more back, it leaves by the edge of the sheet, and when it has gone the next of the fleet draws up and sounds its horn. Let go sooner, it rolls up to the gap again. So the child has whichever vehicle it picks. After a crossing there the one that draws up shows more crates than the one that crossed, and after the caterpillar bus nobody does. Two stand on a bank at most: one that has to make room is seen driving off the sheet, from the far bank on to the right in the road's far lane, from the near bank back off the left edge. A yard sheet taken back from the rack shows the vehicle the child last sent across it.
- *A turned part*: the plank swells or shrinks to its new depth with a hop; the stick flickers thin and thick as it spins; the tube jiggles; the thread whirls.
- *The dip* the model computes is drawn six times larger, the same for every part and every bridge.
- *While a part is laid*, the pins in the air near the finger lean toward it by a few pixels, and stand straight again when it lands. A footing never leans.
- *A vehicle on the wrong road*: on a stick it tilts with its back wheels off, most between two pins and not at all on one, so it rocks from stick to stick; on a plank on edge its body rocks and hops; a thread goes down in a V with the wheel to the water and is straight again as the vehicle paddles off.
- *A vehicle that goes in* rolls out first to where its whole length is over open water, then drops, its nose down as it leaves the road and up again as it lands flat. It floats on its crates: its wheels are under, and the water's surface is at the crates' foot. It paddles tail first to the near bank, and it drives up the bank the same way, in reverse: its tail rears up against the bank, its wheels take the bank's face and turn up it, the driver looking down at the water; when its front wheels reach the lip it tips over them onto the bank, facing the gap, rolls back to its place and shakes itself dry. Up a wall that steps into the gap it drives on the line of the steps' corners. Beside a rock it rears up over the rock. In a gap too narrow for it to lie in (the narrowest two of the first sheet), it tips over the lip nose first, slides down the bank's face, floats there standing on its nose, and drives up again from there. No part of it is ever inside a bank or a rock: its wheels, its nose, its top and its tail are tested on every sheet in every variant.
- *The crew chief* is slow, light and all neck. It has five things it does when nothing happens (it peers at its model, preens, shifts its weight, stands on one leg, nudges the model), two tastes, each after any change however it was made, a part laid, a pin put back, a tracing swapped onto the board, a build that folds under the trolley or a vehicle (it taps a triangle that was not there before and listens; a shape that folds stands its feathers on end), a look up from its model at the gap, which begins as the vehicle goes into the water and lasts until the vehicle has shaken itself dry and the bridge is going back as built, with its lid half down from the middle of it, one answer to a poke, and its two showings (the neat way of an idea, in which it hops onto the top of the model it has built and bends its neck down to it, and the one change, in which its two models are drawn from what each difference is). No two are the same move, and a test fails if two share a leading part of the body or the same shape in time.
- *The model in the margin* gives a little on its ledge under a finger and shakes from side to side when plucked.
- *The rack*: when a seventh sheet is unrolled the oldest slides along the rack past its end, drops and fades.
- *The crew.* The beaver is quick and ends every move a little early: it straightens its flag, taps its tail, chews at nothing. It cannot look when a vehicle sets off, whatever the bridge: a hand over its eyes, teeth clenched, one eye not quite shut, for as long as the vehicle is on the road. At a crossing it lets its breath go and waves once; at a give it starts, hides, and then stands and looks at the water. The mole is slow and never does a thing once: it measures the air, reads its own rule, breathes on its spectacles, each twice. A part just laid, a vehicle that has crossed and a splash are each measured twice, the second time with the rule upright. Their eyes follow the work (the finger's part, the vehicle on the road, the vehicle in the water), and each has its own answer to a poke. Tests fail if two of their acts share a shape or a length.
- *A driver's face* has eyes that look: down into the gap and across at the far bank while it waits at the edge, down at the road as the strain that shows grows, round at its load when the ride went wrong. Falling in, its eyes are wide and its mouth round; afloat, its lids are half down and its mouth is flat.
- *A reaction is heard as it is seen:* each sound of what the cargo and the driver do waits for its move. A parcel thuds as it lands, one thud for each that slides and each down before the next goes; the driver's whistle shows as a small round mouth; the jelly rolls in one wave; the jelly is heard as it lands on the cab roof; the piano rolls down a ramp to the road and is hauled up again, its mover out of the cab and behind it; the caterpillar hums six notes of a scale with a foot between each two, and hiccups at each of its three hops; the barge's toot is seen at its bow, and its pot is heard when it reaches the water, where it bobs by itself until it is back on the roof.
- *The crossing:* as the wheels leave the last plank every part that carries jumps a hair past where it lies and comes back, and the bridge rings with a note for each of its parts, five at a time. The roll and the vehicle that draws up are not drawn until their beat. The pencil ring fades only in a crossing that takes it away; in a give it is drawn as the give ends.
- *A splash* is drawn last, over what made it: a crown that stands nearly three cells out of the water and falls, drops that go up over the banks and come back, ripples that run out to both walls, each a shallow curve. It throws the fish clear and swamps the paper boat, which comes up again when the water is calm.
- *The ghost hand* lays one part between two pins on the far bank (the second pin is there when the part reaches it) and takes it off again by its middle, to the tray: the two gestures a bridge is made and unmade with.
- *The trolley in the hand* rides the deck under the finger, half a cell at a time, and the bridge and a tracing laid on it lie under it at each place; where it is then is not saved until it is let go. It clinks once, as it comes onto the deck. Let go on a pin that is no point of the road it hangs from that pin, however near the deck. Flipped, it is seen turning over about the deck in a third of a second; rolled off a turned tube it goes sideways, over and over. A part that gives under it ends the carry. While a vehicle has the road it stands aside in its compartment, and is back where it stood, with its clink, when the scene is over; nothing of that is saved. It is touched where it is drawn: under its pin or the plank when it hangs. Under the plank it is upside down, on its wheels like a cable car: its handle hangs below its bed.
- *A touch* on the body of a part is heard at once, softly, in the part's own stuff; a touch where no pin can go and nothing is drawn to touch is a dull knock on the desk and a little dust. A drag the browser takes away from the finger is abandoned: what was in the hand is back where it came from. With none left of the picked kind a drag lays from the first pile that has some. A touch at a lip's own pin, or at a pin a part ends on, means that pin though a vehicle's nose is over it; a touch on the roll means the roll though a parked vehicle stands in front of it. While a vehicle is on the bridge a part touched is plucked and nothing is changed. The touch that ends a scene brings the bridge back at once and does not also take the roll or the vehicle that scene was bringing in.
- *A tracing* is a white line on tracing paper wherever it is: kept in its place, laid on the board with the paper as a pale veil under it, and under the finger while it is carried to the board. *The roll* that waits has the nose of its vehicle looking out from behind it.
- *What a touch leaves:* four specks that fly out from a pin as it clicks in, dust where a part lands or a pile is stirred, three arcs from a horn, and a feather from the chief, which floats down to its ledge and lies there a quarter of a minute.
- *The sheet* never moves. The water's dashes drift, each row at its own pace, and the loose end of the string on the spool sways.

**How it is drawn cheaply.** The whole still sheet (the blue, the grid, the valley, the ground with what is buried in it, the cliffs, the foot of the sheet, the tray's box) is painted once for a size into an offscreen canvas and stamped once a frame: the one full-surface composite. Each part is a small sprite made once for its kind and length at the pixel ratio in use. The vehicles, the chief, the crew, the trolley, the barge and the tools' box are drawn afresh each frame from a few shapes, and everything that drifts at the edge is five or six strokes in all. What a frame would ask a sheet for again and again (its open water, where its house and its mug stand) is worked out once and kept. Shadows are plain fills. No blur and no post pass. A run is computed once when the vehicle sets off and read out after.

**The tiers** (`config.ts`). Each tier sets the pixel ratio (2, 1.5, 1.25, 1), and the two lowest leave out the grain lines of the balsa and the seam of the tubes. The sheet, the white line, the shadows and every motion are the same on every tier.

**The characters, as built** (`fleet.ts`, `props.ts`, `figures.ts`, `crewfig.ts`; how each moves is in `acts.ts`, `motion.ts` and `crew.ts`). Five vehicles, the barge, the crew chief and the crew of two are small models of the kit's own stuff with faces in pencil. A vehicle with a cab has a roof that overhangs, a door, a lamp, a bumper, a mudguard over each wheel and puffs from its exhaust as it drives; the trolley has a push handle and a rail. Each vehicle has its own way of waiting (the one at the gap also creeps to the edge, looks down and backs up), of driving, of starting at a touch, and of taking a ride it likes, dislikes or neither; tests fail if two share a move. The van's parcels sway and slide off, and its driver, a paper cut-out smaller than the cab, gets out, walks to the tail, puts them back and gets in again; the jelly rolls or jumps onto the cab; the piano's keys ripple or the piano rolls back; the bus's necks stretch or duck; the caterpillar's feet keep step or lose it.

**The numerals** (`symbols.ts`, the template's shared module, unchanged). Two places, as the sheet lists them: beside a vehicle's crates and beside the trolley's stack of weights, in the white of the drafting line with a dark blue edge. The vehicle whose nose shows behind the next roll has none: its crates are not yet a load the child is asked for.

**What the spike showed** (software renderer; layout, silhouettes and colour only). The four kinds read apart at 1180 by 820: a plank by its depth, a stick by its thinness, a tube by its white roundness, a thread as a line. The pins read as the joints. The passes since are in `REFINEMENT.md`.

## The registry row

For the lead, when the look is accepted (section 3 of `docs/art-direction.md`); a builder does not edit that file.

| Game | Style | Art guide |
| --- | --- | --- |
| Bridge Crew | Blueprint and balsa (canvas 2D): a cyanotype drawing sheet with white drafting lines, a faint grid and the ground in section hatching, and on it in the same line a valley from edge to edge (far hills, a far bridge, a house, trees, what is buried in the ground); unstained balsa planks and sticks, rolled paper tubes, steel pins and string lying on it, each with a small hard shadow; models of balsa and cut paper with faces in pencil | `games/bridge-crew/ART.md` |
