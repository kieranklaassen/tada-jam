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
  A sag, a force, a part count and a length get no numeral: each would be a reading of how well the child's work did. No numeral is drawn in this run.
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
| **Plank** (the only roadway) | Lands flat with a broad clack; wheels can roll on it. | Groans low and whips like a ruler on a desk edge. | Rolls onto its edge with a clop: now tall and thin in the side view, it bends far less. A vehicle crosses it wobbling, as on a kerb. | Bends in a smooth curve, deepest under the wheels; past its limit it cracks where the bend is sharpest. | Slides out; whatever stood on it drops and bobs. |
| **Stick** (thin, square) | Lands with a light click; holds a push and a pull. | Pings when stretched, knocks when squeezed. | Spins on its pins like a propeller and stops as it was: a square is the same both ways. | Squeezed and long, it bows in the middle and snaps there. As a road a vehicle rides it like a rail, one wheel off, tilting. | Flicks into the tray like a spillikin. |
| **Tube** (rolled paper) | Lands with a hollow tok; fat and light. | Hoots like a blown bottle, lower when longer. | Rolls: anything parked on it log-rolls off into the water. | Takes far more squeeze than a stick of its length before it bows; pulled hard, an end pops out of its pin. | Rolls away down the sheet into the tray. |
| **Thread** | Hangs in a loose curve until something pulls it straight. | Twangs, higher the harder it is pulled; slack, it only flops. | Whirls like a skipping rope; whatever hangs on it swings. | Pulled, it holds a lot. Pushed, it goes slack and carries nothing. As a road it makes a tightrope: the vehicle dips into a V with its wheels in the water. | Whips back onto its spool with a zip. |
| **Pin** | In rock or bank it is a footing that cannot move; in the air it is a hinge. | Every part on it rattles at once, each in its own voice. | A lone part on one pin swings round like a clock hand and hangs straight down. | The trolley can hang from it on its hook, under the deck. | Every part on it drops loose at that end and the build sags or folds from there. |
| **Test trolley** (with weights) | Sits on a plank; the deck dips under it and it rolls to the lowest point. | Rings one bell note for each weight on it. | Flips to hang under the deck like a cable car. | Each weight added dips the deck by the same step again. | The deck springs back up and the weights jingle. |

**On day 15** the child can build a hybrid nobody showed them (stays over a truss, an arch tied by a thread), carry the heaviest vehicle on a bridge with half the kit still in the tray and almost no dip, make one bridge that suits two vehicles with opposite tastes, lay a tracing of last week's bridge over today's and run both under the same trolley, and play a tune on the threads of a bridge of their own.

## The representation

**The idea:** which building principles make a crossing stable and sturdy, found by testing to failure and improving.

**The representation:** a side view of a gap on a drafting grid, and a kit of four kinds of part that join only at pins. It was chosen before the game, and its physical shape is the idea:

- A pin is a hinge, so a shape holds only if its parts hold it. Four parts pinned in a square can lean over into a diamond without any part changing length; three parts pinned in a triangle cannot. The child sees the triangle's sturdiness in the object and is never told it.
- A plank is one stiff piece. Flat, it is shallow in the side view and bends easily; on edge, the same plank is deep and bends far less. That is the profile principle in the form a side view can show.
- A tube and a stick of one length differ: the tube holds much more squeeze before it bows, and less pull, since its end pops out of the pin.
- A mast on one footing falls over; two legs on a wide base stand.
- Sticks pinned in a curve between two footings push outward on the banks and carry a load by squeeze alone: the arch.
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
- **The state stays.** One touch puts the bridge back exactly as built. The part that gave first lies back in place with a pale pencil ring round the spot where it gave, and the ring stays until that part or one of its neighbours is changed. The child changes one thing and sends the vehicle again.
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
- **A harder option the child picks, and that looks harder.** After the job vehicle has crossed, one other vehicle waits at the near bank with more crates showing, and the child may send it or not. The trolley takes one to six weights. Neither moves the position.
- **Which sheet a new position lays out.** While the child builds, the only vehicle waiting is this sheet's own. The next sheet is laid out at the moment the cycle is judged, from the position as that judging left it, and waits as a roll at the right edge with its vehicle's nose showing. So a moved position shows on the very next sheet, and never on one already waiting.
- **Nothing shows the position:** no number on a sheet, no map of sheets, no mark that a sheet is an easier one. The rack shows only sheets the child has had.
- **The numerals** lie where the first heading says: beside the trolley's stack and beside a vehicle's crates.

**Every field of the saved state.**

| Field | What it holds |
| --- | --- |
| `v` | The version. |
| `position` | The id of the position the next sheet is laid out from. |
| `finished` | The cycle on the board has been judged. |
| `sheets` | The rack: the six sheets the child had last, oldest first. Each holds its position id, its variant, the bridge as a list of parts (kind, the two grid points, turned or not), up to two tracings as the same kind of list, the trolley's weights and where it stands, which vehicles have crossed it as it stands, and the part and spot of the pencil ring. When a seventh sheet is unrolled the oldest slides off the end of the rack, in view. |
| `on` | Which sheet of the rack is on the board. |
| `next` | The sheet laid out at the last judging and waiting as a roll: position id and variant, or nothing. |
| `waiting` | Which vehicle stands at the near bank. |
| `tries` | Failed runs of the job vehicle in this cycle. Never shown. |
| `laid` | For each position, how many times it has been laid out, which picks the variant. Never shown. |
| `shown` | The ideas whose one showing has been given. |

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
| **Giraffe bus** (3 crates, tall) | To keep every hat on | Open sky over the road: the necks stretch | Any part lower than its heads: the necks duck in a wave and a hat stays hanging on that part until it is plucked off |
| **Caterpillar bus** (5 crates on six axles) | To keep in step | Pins under the deck at even spacing: its feet tick in time and it hums a scale | Uneven spacing: it loses step and hiccups |
| **Barge** (passes underneath) | A clear channel | Open water mid-river: it toots | A prop in the channel: it scrapes past and its flowerpot falls in and bobs back |
| **Crew chief** (a heron with a pencil behind its ear) | To finish the small model it is fiddling with in the margin | A triangle: it taps each side with its beak and nods | A shape that folds: it steps back with its feathers on end |

**The want at rest.** The job vehicle stands at the near bank facing the gap, creeps to the edge, looks down, looks across at the far bank and backs up. The tray of parts sits open under the gap.

**The idle ladder** (attended time only): first the pins and the tray glow; later a ghost hand lays one part between two pins away from the gap and takes it off again. It shows the gesture and never where a part belongs.

Since the tastes differ and never change, "better" has more than one meaning and the child can aim at one on purpose: a stiff deck for the van, a soft one for the jelly, nothing overhead for the bus.

## The scenes

Each scene is a list of timed beats filled in from the run just computed. Any touch ends a scene at once in its last pose, and its outcome is saved when it starts.

- **The crossing** (the ending; about 8 seconds). Cause: the job vehicle reaches the far bank. Beats: the wheels leave the last plank and the bridge springs up and rings with the notes of its own parts; the vehicle's cargo and driver show how this ride went, by its tastes; it parks in the lay-by on the far bank and stays there; the pencil rings fade; the next roll slides in at the right edge and one other vehicle draws up at the near bank. Filled in from: the dip along the deck, the kinks, the parts overhead and in the channel, the pin spacing.
- **The give** (a consequence; 4 to 6 seconds). Cause: a part gives, the build folds, or the roadway ends. Beats: the part gives at its spot; the pieces drop; the vehicle falls, floats on its crates, paddles to the near bank and drives up, shaking off water; the chief looks up from its model. It ends with the bridge back as built and the pencil ring on the spot.
- **The neat way** (shown once for each idea; 6 to 9 seconds). Cause: the second failed run on a sheet whose new idea has not been shown, when the failure is one that idea answers. The child has tried their own way first. Beats: the chief pins a hand-sized model together in the margin from offcuts, first the way that fails (a square that leans over), then the idea (the same square with one diagonal); it stands on the model, which holds; it looks at the model, never at the child. The model stays in the margin and can be pressed and plucked. It is never a model of the gap on the sheet.
- **One change** (the fair-test showing, once). Cause: the child runs the trolley over a bridge with a tracing laid on it, and the two differ in more than one part. Beats: the chief sets two small models side by side that differ in two things and loads both, and nothing tells which change helped; it swaps one part back so they differ in one thing and loads them again, and the difference shows. Then the board is the child's.
- **Secrets**, which work every time and are never hinted: threads plucked from longest to shortest play a scale and the chief taps along; under a whole arch the barge's horn comes back as a chord; a hat left on a part can be plucked off and worn by the chief.

**Comparing, as play.** The tracing paper in the tray takes a white line copy of the bridge as it stands. A tracing laid on the board is computed under the same load at the same place as the bridge, and its dip is drawn as a second line. A tracing can be swapped onto the board, or one part can be copied from it.

**How a cycle ends and the next begins.** The crossing stays as it ended for as long as the child likes: the vehicle parked on the far bank, the bridge standing. Nothing else starts by itself. A touch on the roll unrolls the next sheet and puts this one on the rack. A touch on the parked vehicle sends it home across the bridge again, which is a real run. On load no scene replays: the world is as the last scene left it, with the roll and the other vehicle waiting.

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
