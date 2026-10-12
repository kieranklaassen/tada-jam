<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

Lane Runner has no learning goal. A fox carries one load round a pond, along a trail of three lanes, to whoever at the clearing wants it. The fox runs only while a finger is down, so the child sets the pace and can read the trail for as long as they like. The words used below: a **peg** is one bead's width, a **step** is 20 pegs, the trail is a ring of 72 steps that leaves the clearing and comes back to it, and the lanes are left, middle and right.

## The band and its age rule

- The manifest band is 6 to 10.
- The youngest age is 6, so the row for 5 to 6 of the cue table in `docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md` governs. Its "Avoid" column is kept whole: no word or letter, no numeral or sign the child must read to go on, no voice instruction, no hint that gives an answer.
- Pack rules for the range: `ages-4-to-6.md` for the six-year-old (characters who react, tap and drag, slapstick where the victim overreacts and is never hurt, mischief behind a character's back) and `ages-9-to-12.md` for the top of the band (a system that behaves the same every time, failure that is large, funny and free, more than one way through, nothing babyish, no stored best).
- Symbols: the band starts at 6, so numerals laid on a quantity would be allowed. The game draws none, and has no `symbols.ts`.
- `ctx.childAge` sets one default and gates nothing. A first visit starts the same at every age: the fox with empty hands under the shelf, which is the board of a gate over the trail, all five loads on it. Age chooses only which load the ghost hand reaches for whenever it shows a move at the shelf: 7 and younger, the balloons, which forgive the most; 8 and older, the cake, which forgives the least. It is read from the age each time, so it needs no saved field and is the same on every visit.
- No age (`null`) takes the youngest default: the balloons.

## The toy

The finger does one thing most: it comes down and stays down, and the fox runs. The toy is the fox with empty hands on the trail, with no obstacle but the goose and nothing to deliver.

- **Down.** On the frame the finger lands the fox spins from facing the child to facing the trail and is at full speed: no wind-up. Loose beads kick up from its feet, its tail streams out behind, each footfall clacks like a bead dropped on the board, and the pitch of the clack follows the lane.
- **Slide sideways.** The fox snaps one lane over in about a tenth of a second, leaning into it, with a swoosh that rises to the right and falls to the left. A slide that goes on changes lane again. A slide past the outside lane works too: the fox teeters on one leg over the edge with a rising whoop and tips back.
- **Flick up.** A jump that hangs: up fast, slow at the top, about three quarters of a second in the air, ears and tail trailing, a boing on the way up and a thud with a rattle of loose beads on landing.
- **Flick down.** The fox tucks into a ball and rolls with a rattle, then pops open. In the air a flick down is a dive that ends in a roll.
- **Lift.** The fox stops dead where it is: heels dig in, the tail whips past its head, loose beads spray forward and settle, a short scrape. After a moment it turns round to the child and waits. A lift in the air lets the jump finish first.
- **The goose** sits in the middle lane 49 steps along and answers as the grid's empty-hands row says. The five who wait at the clearing stand large on both sides of it, watch the fox go and come, and each answers a touch as itself.

Why it is a pleasure with no goal: the fox is a thing the finger owns outright. It never moves unasked and always moves at once, so starting and stopping it is like a light switch with a tail on it, and the lane clacks, the hang of the jump and the spray of the stop are each worth doing for themselves. Random touching always does something, and holding a finger still, the simplest use, always runs.

## The object-by-action grid, and what is new on day 15

The objects are the five loads and empty hands. The actions are the six obstacles, which stand in fixed places and never change. The lanes are part of every cell: each obstacle fills some lanes and leaves one way through that needs no jump.

| Obstacle, step | In its lanes | The way through with no jump |
| --- | --- | --- |
| Stream, 9 | water in the middle and right | stepping stones on the left |
| Low branch, 19 | hangs over the left and middle | the right is open; a roll goes under |
| Mud, 29, four steps long | left and right | a plank in the middle |
| Brambles, 39 | left and middle | the right is open |
| Goose, 49 | sits in the middle, looking left | the right, behind her back; a roll past on the left |
| Log, 59 | across all three | a roll through its hollow end on the left |

Three rules hold in every cell. A jump from anywhere tosses the top of a loose load (a cake tier, a slop of water). A tumble is large and funny, costs nothing, and throws the whole load ahead to the worst spot of that obstacle, where it lies until the fox runs through its lane and picks it up. Whatever happens to a load shows on it until it is handed over.

| | Stream | Low branch | Mud | Brambles | Goose | Log |
| --- | --- | --- | --- | --- | --- | --- |
| **Empty hands** | Run in: a splash, the fox sits soaked and shakes dry with a rattle. Jump: clears it. Stones: tik, tik, tik. | Run in: a bonk, the fox swings once round the branch and drops. Jump: comes out with a hat of leaves, rustling. | Run in: wades slowly, squelching, and leaves brown prints. Jump: a belly flop, glop. Roll: comes out a brown ball. | Run in: a yelp at the near edge of the thorns, and the fox hops a step and a half back stuck with burrs. Jump: hangs by the tail, twangs, drops. Roll: through, and out as a burr ball, crackling. | Passed on her left: a honk, and the fox leaps with its fur on end. Run into: she hisses and flaps, the fox bounces back. Jumped over: she ducks, then honks after it. Landed on: a squawk, and she tosses the fox up again. Stepped into from the side: she shoves it back into its lane with a hiss. Behind her back: nothing. | Run in: trips, somersaults over and lands flat on the far side, thump. Jump: clears it. Hollow end: rolls through, booming. |
| **Tall cake**, three tiers | A tier that falls here sails off downstream like a boat, plop and gurgle. On the stones the cake sways and holds, creaking. | The top tier stays on the branch and a bird eats it, chirping with its beak full. Rolled under, the cake is held out flat and survives. | A tier that falls sinks and comes up brown: a mud tier, slurp, carried on as cake. | Rolled under the thorns the cake comes out stuck with berries, each one a pip, and a cake thrown into them by a tumble lies there stuck with them too. A fallen tier is speared like a kebab, squish. | Passed on her left, the goose snatches the top tier and gobbles it, honking with her mouth full. Behind her back the cake is safe. | Jumped: the top tier flies off and sits on the log, splat. Through the hollow end the cake is safe and the fox hums in the echo. |
| **Ladder** | Laid across as a bridge; the fox trots over rung by rung, a rising run of knocks, and takes it up on the far bank. | Snags: the ladder hooks on, the fox hangs with its legs still running, creaks back and forth and drops, twang. Rolled under, it drags flat behind, clattering. | Laid down as a duckboard: the fox crosses dry, the ladder comes up brown, with a sucking pop at each rung. | Propped against the thicket: up the rungs, tok tok tok, and a slide down the far side, wheee. | Passed on her left, the goose hops on and rides the ladder to the clearing, honking in time with the footfalls. | Planted for a pole vault: a creak, a long boing, and a landing two steps further on. |
| **Balloons**, four | Run in: the fox hangs from them with its toes skimming the water, plink plink. Jumped: floats over. | They catch under the branch and squeak along it while the fox runs on the spot, then come free with a flup. | A jump floats the fox over all four steps, with a slow sighing whistle. Waded: tiptoes, barely sinking. | Pop, pop, pop: one goes at each of three thorns, and the fox hops back out stuck with burrs, holding whatever is left. With all four, a jump clears it. | Passed on her left, she pecks one, it bangs, and she falls off her nest backwards with her feet in the air. | Drifts over lazily and lands two steps further on, with a rubbery creak. |
| **Sleeping baby owl** | On the stones it snores in time with the hops. Tumbled in: it wakes, shakes dry, prrrt, and flies the fox back three steps. | Jumped into the leaves: the owl takes hold of the branch in its sleep and stays there, snoring, until the fox jumps under it again. | Wading rocks it like a cradle and the snore drops an octave. | A thorn wakes it with a squeak and it flies the fox back three steps. | The honk wakes it: wide eyes, a shriek, and it flaps the fox back three steps by the ears, then nods off again. Behind her back, or rolled past, it sleeps on. | Jumped: the nest bounces, the owl turns a somersault in its sleep and lands back in it, with a whistle up and down. |
| **Bucket of water**, taken with one level and holding up to three | Run in: the fox scoops as it splashes and comes out with the bucket brim full, glug glug. | Bonk: the bucket lands upside down on the fox's head, clang, whatever water was in it comes down over the fox, and it runs one step blind, zigzagging, with the bucket empty from then on. | Slopped here, the water spreads the patch into a shining puddle, and a tumble in it makes a mud pie, glorp. | Slopped here, the brambles burst into flower with a run of chimes, and flowered brambles are soft: floomp. | Slopped on her from the left, the goose swells to twice her height, honks, shakes, and turns her back in a sulk, so that she now looks the other way: right after the first slop, and left again after a second. | Slopped on the log, mushrooms pop up along it, bloop, bloop, bloop. |

The wrong use of each thing works and is the better joke: a cake taken through thorns comes out decorated, a ladder under a low branch leaves the fox hanging, balloons in brambles go off like a string of bangers, the sleeping owl carried past the goose flies the fox backwards, and a bucket jumped beside the goose turns her round.

On day 15 the child picks a load for the mess it will make and plans the lap in their head: the bucket brought brim full out of the stream, then one slop to flower the brambles and one to turn the goose, with no jump wasted, so that the frog still gets a level to sit in; the cake brought home whole by the one clean route, or stuck with berries on purpose because the bear likes them best; the ladder past the goose's left so that she rides it home. None of that is told and none of it is locked: it is five loads by six obstacles by three lanes, on a trail that does not change, known by heart.

## The representation

The game has no learning goal, so no school idea is represented and nothing here stands for a symbol.

## The four mechanic questions

The game has no learning goal, so the four questions have no school skill to be asked of; the decision the child makes is which load to take and which lane and move to meet each obstacle with.

## The error as a consequence

- A wrong move at an obstacle is a tumble: the fox does the thing that obstacle does to a fox (sits in the stream, swings round the branch, belly-flops in the mud), which shows where, and the load does what that load does there, which shows why.
- Nothing gives a verdict. No sound or mark says wrong. The receiver at the end reacts to the load as it arrives and never to the child.
- The state stays. The load lies at the obstacle's worst spot, in a lane the child can see, and the fox picks it up by running through that lane. A tier the goose ate or the stream took is gone for this lap and the rest of the cake goes on. Marks (wet, muddy, burrs, berries, ruffled feathers) stay on the load and on the fox until the hand-over.
- The child changes one thing and tries again: another lane, a roll in place of a jump, or on the next lap another load. Nothing resets by itself, and stopping to look costs nothing because the fox never moves unasked.
- A load passed by in the wrong lane stays where it lies. The fox can arrive at the clearing without it, and then all five look at the fox as it comes in, as they would at anyone; only the mother owl, whose baby is asleep on the branch, looks at the fox's hands and fetches the baby herself.

## The designed order, and what is stored

The game has no learning goal and no order of challenges that it steps a child through. The order a child meets things in is the trail's own, fixed order: stream, low branch, mud, brambles, goose, log. A harder lap is one the child picks and can see is harder: the cake stands three tiers tall and sways, and the ladder is a plain stick of rungs.

- **What a first visit starts with, by age.** At every age: the fox with empty hands at the shelf, all five loads on it, all five receivers at the clearing. 7 and younger, and no age: the ghost hand, when it shows a move at the shelf, reaches for the balloons. 8 and older: it reaches for the cake. Every later visit shows the same, and any load can be taken at any age.
- **What play changes.** Nothing is unlocked and nothing is counted. Play changes only the saved state below: where the fox is, what it carries and in what state, and what this lap has left on the trail.
- **The positions.** One, with the stable id `pond`, which names the trail. It never moves, whatever the outcome of a lap.

Every field of the saved state:

| Field | Holds |
| --- | --- |
| `v` | The version, 1. |
| `position` | `pond`. |
| `finished` | The hand-over has begun: the fox stands at the hand-over spot and the lap is over. |
| `at` | Where the fox stands, in whole pegs along the trail, 0 to 1439. In the air it is where the fox took off. |
| `lane` | 0, 1 or 2 for left, middle, right. |
| `load` | What was taken from the shelf this lap: `none`, `cake`, `ladder`, `balloons`, `owl` or `bucket`. |
| `held` | Whether the load is in the fox's hands. When it is not, `lies` says where it is. |
| `lies` | `null`, or the peg and lane where the load lies after a tumble, or the branch for the owl. |
| `left` | How much of the load is left: tiers 0 to 3, balloons 0 to 4, water 0 to 3; 1 for the ladder and the owl; 0 with empty hands. |
| `marks` | What shows on the load: `wet`, `muddy`, `berries`, and `ruffles` 0 to 3 for the owl. |
| `fox` | What shows on the fox: `wet`, `muddy`, `burrs`, `leaves`. |
| `trail` | What this lap changed on the trail: `flowers` (the brambles are in flower), `gooseLooks` (`left` or `right`), `gooseRides`, `mushrooms`, `puddle`, and `leftovers`, a list of at most twelve things lying about (a tier on the branch, a tier on the log, popped skins in the thorns), each with its obstacle and lane. |

Short-lived, and gone on load: loose beads in the air, footprints, ripples, a character's pose. The fox is drawn where `at` and `lane` say, standing, turned to the child; under the branch, under the thorns and in the hollow end of the log, where there is no room to stand, it is found rolled up as it went in. Nothing is saved in the air, and a game put away under a finger that is still down finds the fox stopped where it was.

## The characters and their fixed tastes

- **The fox** carries what it is given and is never bad at it on purpose. Its want is the child's finger: at rest it faces the child and waits.
- **The goose** wants her nest left alone. She looks left, always, until she is turned. She dislikes anything passing in front of her (a honk), loves cake (she takes the top tier), dislikes water (she swells and sulks), likes a ride (she hops on the ladder), and is startled by her own pecking of a balloon. She never notices what passes behind her.
- **The bear** holds out an empty plate: it wants the cake. It likes it tall (eats tier by tier, rumbling higher each time) and likes berries best (licks the plate). It dislikes a mud tier (bites, freezes, spits, then eats the rest) and a wet tier (wrings it out like a sponge first). With no tiers left it licks the crumbs off the fox's hands.
- **The mother cat** points up at her kitten, which sits on top of the gatepost: she wants the ladder. A clean ladder: the kitten comes down rung by rung. A muddy one: the kitten slides down it and she licks it clean with her ears back. With the goose on it: the kitten rides down on the goose.
- **The small hedgehog** reaches up with both arms: it wants the balloons. It hugs whatever it is given and always pops one on its own spines, jumps, and laughs. With all four it floats off the ground holding the other three. With none left it skips rope with the strings.
- **The mother owl** holds one wing open over an empty hollow in her post: she wants the baby, asleep and smooth. Asleep: she tucks it in and they snore a third apart. Each ruffle costs a preening with a pluck. Wet or muddy: she dries it under her wing or shakes it out. Left on the branch: she looks at the fox's empty hands, flies off and fetches it herself.
- **The frog** sits in a dry tub and points into it: it wants the water. Brim full: it dives and swims circles. Two levels: floats on its back. One: sits in the puddle. None: wears the bucket as a hat.

All five receivers stand at the clearing for the whole lap with their wants showing. No feeling of any character is about the child: none thanks, praises, hurries, or remarks on a pause. When the fox comes in with empty hands each of the five looks at the fox in turn, with the sound it greets anyone with; nobody looks at its hands and the fox does not shrug.

## The scenes

**The hand-over** is the one short scene, and the ending.

- Cause: the fox reaches the hand-over spot, one step before the shelf, with a load, with what is left of one, or with empty hands.
- Beats, 6 to 9 seconds: the fox skids and holds the load out; the one who wanted it steps in and takes it; the reaction, chosen from that character's fixed tastes; a settled pose that stays.
- Filled in from the state of play: `load`, `left`, `marks`, `held`, and from `trail` whether the goose rode along.
- Saved when it starts, at once: `finished` true, `at` the hand-over spot, `lane`, and nothing else changes. So a game put away during the scene is found finished, with the receiver in its settled pose, and nothing plays on load.
- A touch during it lands every beat at its end pose in silence and does nothing else: it does not send the fox to the shelf. The finger that ran the fox in is not such a touch while it stays down. The settled pose then stays until a new press.

**The owl's flight back** is a consequence, two seconds long, not a scene with beats of its own choosing. Saved when it starts, at once: `at` three steps back and never before the obstacle behind, and `marks.ruffles` one higher. A touch lets the fox down where the flight ends.

**The four things that work every time** (flowering brambles, the goose turned, the goose riding, mushrooms on the log) are each one change to `trail`, saved when it happens, with a second or two of motion that blocks no touch.

**How a lap ends and the next begins.** After the hand-over the fox stands at the spot facing the child, the receiver keeps what it was given, and nothing else happens for as long as the child likes. A press sends the fox the one step to the shelf, and the whole new lap is saved when that press lands, before the fox moves: `finished` false, `at` the shelf, `load` `none`, `held` false, `lies` `null`, `left` 0, `marks` and `fox` empty, and `trail` empty with `gooseLooks` `left`; `lane` stays. So a game put away during that step is found with the fox standing at the shelf, the last lap's load back on it whole, the marks on the fox and the trail cleared and the goose looking left again, and nothing plays on load. A press on a load puts it in the fox's hands on the frame the finger lands, however long the finger then stays, and a press on another swaps it, until the fox is three steps from the shelf. For those three steps the camera stays where it stood, so the shelf and its loads keep their places in the frame and a press finds them there; when the fox passes the third step the shelf flies up out of the frame, and it is down again when the fox comes round. A fox that has passed the third step with empty hands runs that lap with empty hands. The shelf and its five loads stand clear of the top centre of the frame, where the jam's round home control sits (48 px across, 10 px from the top), and clear of the five who wait: no receiver, settled pose or leftover covers a load, a tap on a receiver is never taken for the load behind it, and an overlap test holds both at 1180 by 820 and at 820 by 1180. Nothing begins by itself, and on load no scene replays.

## The records

The game has no learning goal: it is designed from no record of either jurisdiction and claims no school skill.

## The look

Written after the style spike, not part of the sheet.

**Fused-bead figures**, the first look reserved for the game in `docs/art-direction.md`. Everything that stands is a flat plaque of fused craft beads: short tubes with a hole through each, one bead to a peg, standing upright on a pegboard. Nothing is a built volume, and nothing has studs. The spike held on clarity, so the second reserved look was not tried.

### What is in the frame

- **The board.** The ground is a pegboard from edge to edge, printed as beads laid flat: meadow greens with pale patches and small flowers. The trail is laid along it in sand-coloured beads, three lanes wide, with a darker row down each edge, a seam across it at every step, and between two lanes a worn line of single darker beads at uneven steps, now on one side of the lane's edge and now on the other. A bead lying on the board is seen down its hole, as a ring, so no bead of a lane line has another beside it, over it, under it or cornerwise to it: two rings are never a pair (`trailBeads.test.ts`). Both are one plane each with a picture that slides as the fox runs.
- **The clearing.** A gate stands across the trail: two posts and a board, and the board is the shelf. The five loads stand on it against the sky, and the fox waits under it. The five who wait stand on both sides, each with what it wants showing: the bear with its plate held out, the owl on a post with a hollow in it and one wing open, the hedgehog with both arms up, the frog in a dry tub, the cat pointing up a gatepost with the kitten on top. The loads stand five pegs or more apart on the board, three to the left of its middle and two to the right, with the middle bare, since a shell puts its own control at the top centre and on a short surface the board is up there (`game.test.ts`: "out from under the home control", down to 568 by 320). The ladder leans on the board. Whoever takes a load steps in beside the fox and stops with trail showing between the two on the glass, on the side of the trail's middle when the fox is in an outer lane (`game.test.ts`: "stands whoever takes the load clear of the fox"). A tap goes to what is drawn under it, so where two of the five overlap, each is touched where its own beads are. The board and its loads stand for the three steps a load can be taken, and from the third step they fly up out of the frame in four tenths of a second; they are down again when the fox comes round. A fox found standing finds the gate where its place puts it, with no flight to watch (`game.test.ts`: "flies the gate up at the place where no load can be taken any more").
- **The six obstacles.** Each is large and is somebody or has somebody: the stream runs from edge to edge with stepping stones, a fish that jumps and reeds; the low branch grows from an oak on the verge and a bird sits on it; the mud is two brown lanes with a plank between and a pig in a wallow beside it; the brambles are a scowling thicket on the verge with two scowling arches over the lanes; the goose sits on her nest beside a pond; the log lies across all three lanes with a squirrel at its end, and three mushrooms of three shapes come up on it one at a time when water is slopped on it.
- **Who lives beside the trail.** In each stretch between two obstacles one neighbour does its own thing on the verge and takes no part in the lap: a snail, a rabbit in a burrow, a row of ducklings, a hive with bees, a tortoise, a sheep, a caterpillar. Each turns to watch the fox pass.
- **The setting.** Oaks with apples, pines, bushes with berries, flowers, mushrooms, rocks, stumps, tufts of grass and reeds stand along both sides of the whole ring in four rows, about 280 plaques in all, made once from a fixed seed, so the trail is the same trail on every visit. Behind everything at the clearing is a painted sky with two rows of hills, a bead sun whose rays are of uneven lengths at uneven angles, and three bead clouds that drift.
- **The eye.** At the clearing the camera stands low behind the fox and square to the trail, whichever lane the fox is in, so the gate, the loads and the five fill the frame and all of each is in it on an upright surface too. For the three steps a load can be taken it does not follow the fox: every load stays where it was on the glass and a press finds it there. Then it goes after the fox and climbs, gathering pace from standing and never moving more than twice as far as the fox does (2.00 pegs for each peg the fox runs, forward and up together; on the glass the board streams past the fox's feet at most 1.14 times as fast as it does out on the trail). At that pace it is beside the fox again 213 pegs from the shelf, past the stream, which lies flat; at the stream's near edge it is seven tenths of the way there, and it has long changed over before the low branch (`camera.test.ts`: "goes after the fox when the three steps are run"). Out on the trail it stands high and looks down steeply, with the fox low in the frame, so that what stands in the fox's own lane shows past the fox and its load at the last step before it (`camera.test.ts`).
- **What stays plain.** The trail itself: its surface is the quietest thing in the frame, so whatever stands on it reads at once.

### Palette

27 bead colours in `palette.ts`, as a box of craft beads holds a fixed set of tubs; every plaque is made of these and nothing else. Characters are outlined in the near-black bead so their shapes read from across a room. The setting has no outline and sits in greens and browns, lower in contrast than the characters. Orange belongs to the fox and the kitten, white to the goose and the sheep, and red is kept small (apples, berries, mushrooms, the bear's hat).

### Materials and lighting

- A bead is painted, never modelled: a round of its colour with its hole and the light on its rim, painted once at mount into one picture for the characters and what they hold (12 pixels to a bead) and one for the setting (8 pixels to a bead). A plaque is one flat rectangle that shows its piece of that picture.
- There are no lights in the scene and no cast shadows. The light on each bead is in the paint, from the upper left. A soft dark lies on the board under every character and every plaque of the setting, and the fox's draws in as it leaves the ground.
- Every rectangle stands in a plane that faces the child or lies flat on the board, each at a depth or a height of its own, so no two can cross: they pass in front of and behind each other (`clear.test.ts`).
- The far end of the trail fades into pale haze, which is also where the setting stops being drawn.
- No post pass.

### Motion rules

- Plaques are stiff. A figure bends only at its joints (a plaque turning about a peg), turns round as a whole, and gives a little as a whole when it lands. Nothing stretches like rubber.
- The fox has a front and a back. It shows its back while it runs and turns to the child when it has stood for a moment. Rolled up it is one round plaque, which turns a quarter at a time.
- Eyes are four beads each. Looking about and blinking change the colour of beads; nothing is drawn on top.
- Each character has a tempo, a weight and one funniest part of its own (`PERSONALITY` in `motion.ts`), and no two share a move: the fox's tail hangs from a spring, the goose is all neck, the owl snaps between stillnesses, the bear rocks like a sack, the hedgehog bounces, the frog sits dead still and is then somewhere else, and of the cat only the end of the tail hurries. The obstacles and the neighbours each have a motion of their own in `wayside.ts`.
- An obstacle makes itself known three steps before the fox is at it, with a motion and a sound of its own: the bird hops and the branch shakes, the arches rear up and bristle, the goose's neck comes up.
- What a touch throws about is loose beads: they fly, bounce on the board, lie for a moment and are gone. Water that leaves the pail is one body of blue beads: it comes down on what is under it, spreads flat and is gone, with drops flying from it.
- The ghost hand shows each move as a finger would have to make it: one tap, a slide of half a lane in 0.15 seconds, a flick in 0.07 seconds, and then the fox's hop or duck in answer. Its own path, fed to the game's reading of a finger, is a lane, a jump and a roll at all three sizes (`game.test.ts`: "shows each move at a pace the game takes").
- The fox runs while any finger is down, and a slide, a flick or a tap by any other finger steers, so a thumb resting on the glass and the other hand work together.
- A dive is the fox upside down, arms out past its ears and legs straight, until it lands as a ball. A popped balloon is gone, and its skin is on a thorn, on the frame its pop sounds.
- Sight and sound share one clock: a sound starts on the frame of the motion it belongs to, and no voice holds a wait inside itself.

### The tiers

Every plaque is two triangles at every tier, so a tier never changes what a thing is made of, what stands where or what happens. The four tiers in `config.ts` save pixels, distance and loose beads.

| Tier | Pixel ratio | Setting and trail drawn to | Loose beads | Filtering of the pictures | The most it draws in one frame |
| --- | --- | --- | --- | --- | --- |
| 0 | 2 | 620 pegs | 48 | 8 | 910 triangles, 114 plaques, 155 of the setting |
| 1 | 1.5 | 560 pegs | 36 | 4 | 820 triangles, 110 plaques, 143 of the setting |
| 2 | 1.25 | 500 pegs | 24 | 2 | 742 triangles, 98 plaques, 132 of the setting |
| 3 | 1 | 440 pegs | 12 | 1 | 670 triangles, 97 plaques, 119 of the setting |

The haze closes where the setting ends, so a shorter reach shows as a nearer haze and never as trees appearing. Nothing is compiled or built when the tier changes.

### What the frame costs

Ten draws at the most, at every tier: the board, the trail, the sky, the sun and clouds, the setting, the soft darks, every plaque of everyone and everything on the stage, the loose beads, the idle light and the ghost hand. No shadow map and no post pass. `budget.test.ts` counts the rectangles in sight for every place on the ring with the fullest board a lap can leave, with one more for the plaque that is there for a moment only (the slop of water on its way down, the goose's feet while she lies off her nest, or the crumbs on the fox's hands), and holds the table above word for word; the lead's bar is under 200 thousand triangles at tier 0, under 100 thousand at tier 1 and under 60 draws.

### The registry row

The text for the claimed-styles registry in `docs/art-direction.md`. The lead registers the look when the game is taken:

| Lane Runner | Fused-bead figures in 3D: every character, load and tree a flat plaque of melted craft beads standing on a pegboard meadow, each bead painted with its hole and the light on its rim, near-black outlines on the characters only, 27 bead colours | [`games/lane-runner/ART.md`](../games/lane-runner/ART.md) |
