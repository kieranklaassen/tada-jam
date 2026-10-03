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
- A tube and a stick of one length hold the same pull, and the tube holds much more squeeze before it bows.
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
- **Guess.** Random parts make something that stands or folds but rarely a crossing; the kit on a sheet is too small to lay every part everywhere, and from the fourth sheet on a vehicle's tastes rule out simply piling parts on.

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
