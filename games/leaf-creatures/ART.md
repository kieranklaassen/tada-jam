<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

Leaf Creatures comes from the lab demo `leaf-creatures`, which lends its idea and its feel in the hand and no code. The idea the child feels: loose leaves settle under the finger and then blink awake as a creature that moves the way its parts say. The verb is to press parts together. The world answers by waking what was made, as itself.

## The band and its age rule

The manifest band is 3 to 7, and its youngest age, 3, governs the design.

- **The cue-table row for 3 to 4** (wordless clarity). Cues used: a ghost hand showing one move, a breathing glow on what can be touched now, characters who gaze and lean at what matters, and a material that answers by itself. The glow and the ghost hand never point at an act that sends anything away: with five creatures up they point at the creature woken last, where a tap is a poke or wakes a sleeper, and never at the caps; with twenty-four loose parts lying about they stay away. Neither rises while a part is in the hand, whatever a second finger does elsewhere. With nothing begun the glow changes heap by drawing back in under one and growing out from under the next, never by jumping at its full size. Its "Avoid" column is kept whole: no text, numeral or icon to decode, no spoken instruction, no verdict, one activity live at a time, and no tool on screen before it means anything.
- **The pack's rule for the youngest** (pack: game-design, ages-2-to-4.md), since the band starts at 3. Everything essential works with a tap: a tap on a heap sends a part to the earth by itself, a tap on the earth calls a creature, a tap on a sleeper wakes it. A carry survives a lifted finger, and a part carried at least half of the way to the earth and let go short of it flutters the rest of the way. There is no double tap, pinch, tilt or shake. The seven heaps stand 150 stage units apart, each drawn up to about 98 units to either side of its middle, and none is in the bottom 70 units, where wrists rest. A heap is touched as far as it is drawn: a tap on an outer twig end or leaf tip takes from that heap, and a tap between two heaps takes from the nearer.
- **What is kept clear.** Nothing a child must touch (a heap, the earth, the fern's bed, a dug acorn) lies under the jam's round home control, which is 48 px across at the top centre, 10 px from the top: that spot holds sky and tree tops only, and nothing of a creature passes under it, or into the corner 72 px square at the top right where a grown-up's hold begins: not a limb, not a leap, not a hop drawn larger. A creature keeps its travel in by its own reach, the longer it is the further down it stays, and a part pressed on to a creature where the part would lie under either is shaken off and flutters back to its heap. What the game sets down itself (the first-visit thing, a part sent by a tap, a part fluttered or puffed back, a sleeper under the fern, an acorn after its push, a creature that stops) comes to rest on free earth or free fern, never on a heap, the toad, a dug acorn or another thing; a creature's middle stops clear of whatever is in its way, while its limbs may reach across; the heaps, the two wind children and the toad are drawn in front of everything on the ground and are touched first. A tap is never taken for a target behind what was set down. An overlap test holds this at 1180 by 820 and at 820 by 1180.
- **The pack's rule for 4 to 6** (pack: game-design, ages-4-to-6.md). The game supplies a place, parts and characters who react, and the child supplies who the creature is.
- **The symbol rule.** The band starts below 6, so nothing on the kid side is a word, letter, numeral or sign. The game has no `symbols.ts`.
- **What `ctx.childAge` sets.** Only what lies on the earth on a first visit, as "The designed order" says. It gates nothing. No age gives what the youngest gets.

## The toy

The one action the finger performs most is pressing a part on: lifting a leaf, twig, feather, seed or acorn cap, and letting it settle on the bare earth or on what already lies there.

In the toy's scene the clearing is drawn in full, with the two wind children in the tree tops and the toad on its stump, and seven heaps lie along the near edge. Nothing is asked for.

- **The finger lands on a heap or on a part that lies on the earth.** In that frame the part is in the hand: it jumps up under the finger in its own way and with its own sound, the rest of its heap slumps into the gap, and the wind children and the toad turn their eyes to it.
- **The finger moves.** The part rides above the finger from the frame it is taken, where a small hand does not cover it, and swings to the direction of travel, each kind with its own weight, and rustles in its own voice by the distance carried.
- **The finger lets go over the earth.** The part settles in its own way, with its own sound in the frame it touches down, and is pressed on. It rests exactly where it was put, turned as it was carried. If it touches a part that already lies there, the two are one thing from then on. A part let go off the earth flutters back to its heap, or on to the earth if it had come half of the way.
- **A tap on a heap** sends one part in a flutter to the earth, on to the thing the child is making, where it presses itself on: the thing never woken that the child last added to if it has two parts or more, otherwise the oldest thing never woken that has two parts or more, and only when there is none a lone part. A single part set down somewhere else does not draw the next ones to it, and with nothing on the earth the part begins a thing.
- **Two acorn caps pressed on to one thing** wake it, in the frame the second cap lands: the wind children blow, the caps turn over into eyes and blink, and the thing moves as its parts say. It comes to a finger on the earth, eyes first, and a tap on it pokes it. A creature that is being thrown along by a roller, or is in the air over a crawler, plays its poke when it is down again, sound and motion together.

Repeating it is a pleasure with no goal because every part answers the hand differently (a twig snaps up, a feather lags behind, a round leaf spins down like a coin), because parts stick wherever they touch, so any pile of taps makes a shape, and because any shape with two eyes comes alive in a way the child can read back from what they pressed on. Random tapping builds a creature and wakes it.

## The object-by-action grid, and what is new on day 15

Seven objects by five actions. Every cell has its own motion and its own sound. A sound that belongs to a motion is made in the frame of that motion (each footfall, each bounce, each flap), never ahead of it or after it.

| Object | Lifted (the finger lands on it) | Carried | Pressed on | Awake and travelling | Awake and poked |
| --- | --- | --- | --- | --- | --- |
| Twig | Springs up stiff, and the heap jumps like spilled matches. It snaps. | Stays rigid and swings round behind the finger like a compass needle. It ticks. | Taps down and quivers at its tip. It knocks. | A leg: the legs paddle in turn and the creature scuttles in quick bursts. Each footfall patters. | The nearest leg kicks out and the creature leaps aside. It twangs. |
| Maple wing | Flips over to its pale side and back. It crackles. | Flaps slowly up and down in the air of the carry. It rattles like paper. | Slaps down flat, then its points curl up once. It claps. | A wing: the wings beat and lift the creature in hops with a hop shadow under it. Each beat whups, each landing thumps. | Both wings fold over the eyes, then one lifts to peek. It rustles. |
| Willow leaf | Hangs from the finger and unrolls like a ribbon. It swishes. | Streams out behind the finger in a wave. It hisses softly. | Lays itself down from stem to tip. It sighs. | A long back: the creature slithers in curves, each leaf bending after the one before. Each curve hisses. | Coils up tight, holds, and springs open. It boings. |
| Round leaf | Spins on its stem like a coin. It rings. | Twirls faster the faster the finger goes. It whirrs. | Lands on its rim and spins down flat. It rings down in quickening turns. | A wheel: the leaves turn and the creature rolls, slow to start and slow to stop. Each turn bumps. | Spins on the spot until its eyes go round, then sways. It hums up and down. |
| Feather | Rises more slowly than the finger. It puffs. | Lags behind and floats, tip up. It whispers. | Sinks last of all and settles with a shiver. It hushes. | A tail: the creature struts, stops, and fans the feather wide at whoever is near. Each fan opens with a zip. | Fans as wide as it goes and holds the pose with its eyes shut. It trills. |
| Seed | Rolls into the hand with its fellows chasing it. It rattles. | Swings like a bead on a string. It clicks. | Bounces twice and lies still. Each bounce ticks. | A nose: the creature creeps with the seed to the ground, weaving. It sniffs at each weave. | Sneezes and blows itself backwards. It sneezes. |
| Acorn cap | Wobbles like a bowl. It tocks, hollow. | Rocks from side to side, open side up. It rumbles. | Pops on like a button; with a second cap on the same thing the wind children blow. It pocks. | An eye: two caps and nothing else waddle from side to side, eyes first. Each step tocks. | That eye squeezes shut and the other grows wide. It squeaks. |

**The rules a creature moves by**, which never change, so what a child finds stays true:

1. A thing is awake while it carries two or more caps. It travels eyes first: the side its caps are on is its front, wherever the child put them.
2. Its way of travelling is that of the kind it has most of among twig, maple wing, willow leaf and round leaf; of two that tie, the one laid first. With none of those it struts if it has a feather, creeps if it has a seed, and waddles if it is caps alone.
3. Every other kind on it still moves as itself and adds its habit: a wing adds a hop every few strides, a round leaf a tumble, a willow leaf a sway, a twig a burst of pattering, a feather a stop to fan, a seed a stop to sniff.
4. Number counts: more twigs scuttle faster, more wings hop higher and further, more willow leaves curve wider, more round leaves roll heavier and bowl further, more feathers stop longer to fan, more seeds smell an acorn from further off.
5. Awake creatures meet by rule. A hopper teases a crawler: it hops over, the crawler spins to look, and the hopper lands behind it. A roller bowls over whatever it rolls into: that one tumbles with its parts flapping and gets up bewildered and unhurt. A creature with a seed nose leaves the others alone and sniffs out the three acorns buried in the clearing, digs one up and pushes it about. A feathered one fans at any creature that comes near, and smooths itself crossly after being bowled over. A slitherer curls up beside any sleeper.

**The wrong use of each thing works and is funny.**

- Twigs and eyes alone: nine legs and nobody. It scuttles fastest of all and trips over its own legs every few bursts.
- Maple wings alone: it beats so hard that it lands on its back and has to flap itself over.
- A willow leaf with the caps at its tail end: it slithers tail first, because the eyes lead.
- One round leaf with its eyes on it: the eyes go round with the wheel, and it stops dizzy with its pupils circling.
- Feathers alone: all tail. It fans so proudly that it tips over backwards.
- Seeds alone: all nose. It sniffs up dust and sneezes itself along.
- Caps alone on bare earth: two eyes with nobody waddle off, and a third cap blinks out of turn.
- A part pressed on to the toad: it wears it as a hat, looks up at it cross-eyed, and the part slides back to its heap at the toad's next gulp. The hat is short-lived and gone on load.
- A fifteenth part pressed on to a creature that carries fourteen: the creature shakes itself and the new part pops off and flutters back to its heap.

**On day 15** the child lays parts for the behaviour they want, which they could not on day 1: six kinds of part, each with its own way of moving, in any number and order, make a tease, a bowler, a sniffer or a sleepy slitherer on purpose, and the child sets them on each other (pack: game-design, depth-from-combinations.md).

## The representation

The game has no learning goal, so no school idea is represented in its objects.

## The four mechanic questions

The game has no learning goal, so the four questions have no skill to be asked about.

## The error as a consequence

No task is set, so no attempt is wrong. What a child may not have meant shows as what the world does with it, and the state stays (pack: game-design, errors-show-as-consequences.md).

- A creature that moves otherwise than the child pictured shows why in its own body: the legs that scuttle are the twigs the child pressed on, and it goes tail first because the eyes are on the tail. Nothing is taken away. The child presses one more part on and it changes its ways in that frame. An eye pulled off a creature that has three or four leaves it awake, with its front where its caps now are; an eye pulled off a creature that has two is the scene "The eyes come off", which only a drag causes and never a tap, and its parts go back to heaps that never run out.
- A part let go off the earth is not lost: it flutters back to its heap.
- A part pressed on where no thing lies starts a new thing, lying where it was put.

## The designed order, and what is stored

**The order.** The game has one place, with the stable id `clearing`, which is the whole `LADDER` in `config.ts`. It names the place and never a grade, a groep or a level. It is open pretend play: no cycle is judged, and the position never moves. What is harder is what the child makes harder: a creature of more kinds, or more creatures awake at once.

**What a first visit starts with, by age.**

- 4 and younger: one thing already lies on the earth, plainly a body: a round leaf with one twig out to the side like a tail and one cap pressed on the leaf. Its one eye is open a crack and looks at the heap of caps, as the cap of every thing that carries exactly one cap does: it is a view of `parts` and needs no field.
- 5 and older: the earth is bare.
- No age: as 4 and younger.

The seven heaps, the wind children, the toad and the three buried acorns are the same for every age.

**What play changes.** Only the clearing: what was laid lies there, and who was woken is there, where it stood. A saved clearing wins over the age. Nothing is locked, counted or released by play.

**Every field of the saved state**, as plain JSON through `ctx.storage`:

- `v`: the version of the record.
- `position`: always `clearing`.
- `finished`: always false, since no cycle ends.
- `seed`: the whole number the clearing was first laid out from. It fixes where the three acorns were buried.
- `things`: the things on the clearing in the order they were begun, each with:
  - `id`: a whole number that no other thing in the record has;
  - `x`, `y`: where its middle is, in whole stage units;
  - `turn`: how far it is turned from the way it was laid, in whole degrees (0 until it has been awake);
  - `awake`: whether it is a creature now;
  - `woke`: its place in the order of waking, a whole number, 0 for a thing never woken;
  - `drowsy`: whether it has been stroked once since it last travelled or was poked;
  - `bedded`: whether it sleeps under the fern;
  - `parts`: its parts in the order they were pressed on, each as its kind (`twig`, `maple`, `willow`, `round`, `feather`, `seed` or `cap`), where it lies from the thing's middle (`x`, `y`, whole stage units) and how it is turned (whole degrees).
- `acorns`: the three acorns, each with where it lies (`x`, `y`) and whether it is `dug` up.
- `focus`: the `id` of the thing never woken that the child last added to, or 0 when there is none: where a tapped part goes next.
- `waiting`: the one creature that walked off last and waits behind the trees, or nothing: the edge it left by (`side`, -1 for the left and 1 for the right) and the creature itself (`thing`, with the fields of a thing).

The limits, which are the game's own choice: at most five creatures (awake or bedded) and one more that waits behind the trees, at most fourteen parts and four caps on one thing, no part of a thing further than 330 stage units from its middle, and at most twenty-four parts in things never woken. A limit is never a refusal without an answer: a fifteenth part, a fifth cap or a part that would lie further out than a thing may reach is shaken off by the thing, awake or never woken, and flutters back to its heap; a twenty-fifth loose part is taken, and the small wind child puffs the loose part laid longest ago back to its heap, which is seen to go; a part sent by a tap that has no free earth left to land on flutters back to its heap; and when a sixth creature wakes, the one woken longest ago walks off between the trees in its own way, quickened so that it is past the trees within eight seconds of setting out, by the edge nearer to it (by the left one when it is too long to pass below the grown-up's corner), and waits behind the trees at that edge with its eyes showing between the trunks. The eyes show over whoever stands there and are touched before it, so they are never out of reach. It is saved as `waiting` from the step it sets out. A tap on those eyes brings it back on to the ground, seen coming from that frame: it starts at the edge it left by with its foremost part already inside the stage, facing in, and comes on quickened as a leaver goes; and the one that is then woken longest ago walks off in its turn and waits. Only the last to leave waits: when another walks off after it, its eyes shut and it is gone for good. The largest legal state is under 12 KB, and a test holds it under half the 64 KB cap.

**What stays and is not stored.** A part in the hand that came from a heap is not stored; one lifted from the earth is stored where it was lifted, except the cap whose lifting took a creature's eyes off, which is not stored and is back in its heap on load. A part in the air by itself is stored where it will land: put away while a second cap is still flying to a thing, that thing is found awake, standing with both eyes open, and no waking is shown. When that makes a sixth creature, the one woken longest ago is found waiting behind the trees, at the edge it would have left by, with its eyes showing between the trunks, as after a walk-off, and whoever waited before it is gone, as when another walks off after it: no creature is dropped without a trace. A cap pulled off a creature that keeps two or more is stored on its creature while it is in the hand, and goes back on it if the touch is taken away. A creature on the move is stored where it stands, on the ground, and takes up its wandering from there on load, in silence until the first touch. The heaps never run out and are not stored. The toad's hat, leaves in the air, gusts, dust, where the wind children and the toad look, and the ghost hand are short-lived and gone on load. No clock is read and nothing changes while the game is put away.

## The characters and their fixed tastes

The child's own creatures are the main characters, and each kind of part carries a temper that never changes, so a child can learn it and test it on purpose.

- **Twig, skittish.** Its want: to keep moving. It runs from a roller and circles on the spot when teased.
- **Maple wing, a tease.** Its want: a crawler to hop over. It never teases a sleeper.
- **Willow leaf, shy.** Its want: somewhere to curl up. It hides at the edge of the ground beside the fern while a roller rolls, and lies down beside sleepers.
- **Round leaf, boisterous.** Its want: to roll into things. It bowls at whoever is nearest and is never sorry.
- **Feather, vain.** Its want: to be looked at. It leans into a stroke, and hates being bowled over.
- **Seed, greedy-nosed.** Its want: the buried acorns. It notices nothing else.

A creature wears the tempers of all the kinds on it, the kind it travels by most of all, and its want shows in where its eyes point: at the crawler, the sleeper, the nearest creature, the finger, or the ground.

Three characters are always in the frame, and their faces are the feedback on what the child made: each looks at the thing it answers, never at the finger (pack: game-design, characters-with-opinions.md).

- **The big wind child**, in the tree top on the left. Its want is always visible: its cheeks are full of held breath and it stares at whatever lies on the earth, waiting for eyes. It likes light things: a creature that is mostly feathers and wings sails up on its breath, and it puffs once more. It dislikes heavy ones: for a creature that is mostly twigs and seeds it strains until it is red and its cheeks pop.
- **The small wind child**, in the tree top on the right, blows a beat after the big one. Its want is always visible: it stirs the air with one open hand, its fingers together like a mitten, round and round, and keeps its eyes on the heap of round leaves. It likes round leaves, and spins itself right round when a roller wakes. It is afraid of legs: when a creature with five or more twigs wakes it hides behind its hands and peeks over them: both hands sink until its eyes show above them, in the frame the peek is heard.
- **The toad**, on the stump at the left edge. Its want is to doze: its eyes keep sinking shut. It likes slitherers and sleepers: it croaks low, once, when a slitherer wakes or comes near, and when a creature beds down; it does not croak again while that slitherer rests beside it. It dislikes scuttlers and rollers, which make it start upright and glare, once each time one comes running by its stump and not again while that one stays about; for one woken beside its stump, the start it gives in the waking is that once. A gust flattens it every time.

None of them feels anything about the child: none thanks, praises, waits impatiently or remarks on a visit (pack: game-design, no-rewards-for-playing.md; pack: game-design, the-line-between-depth-and-manipulation.md).

## The scenes

Each scene is the consequence of one act, lasts 4 to 8 seconds, and gives way to any touch: the touch ends it where its outcome already stands and is then an ordinary touch (pack: game-design, endings-and-short-scenes.md).

- **The waking.** Cause: the second cap is pressed on to a thing. Beats: the wind children breathe in and blow, each as its taste for this creature says; the gust crosses the clearing, leaves leave the tree tops and the toad is flattened; the thing lifts at its edges; the caps turn over into eyes, one and then the other; it blinks, shakes, and makes the first move of its own way of travelling. Filled in from: the parts of this thing. Saved when it starts: the thing's `awake` and `woke`; and, when it is the sixth creature, the creature woken longest ago as `waiting` and no longer among `things`, which is seen walking off between the trees in its own way during the scene. A tap on it while it walks off is answered as a poke, and it walks on. A finger held on it stops it only until its time is nearly up: it then bolts for the trees and is past them within the eight seconds, and the lift after it has gone pokes nobody and makes no sound.
- **The bedding down.** Cause: a second stroke along a creature that is `drowsy`. (The first stroke makes it drowsy: it leans into the finger and its eyes sink half shut, which is saved as `drowsy` at once. Travelling or a poke wakes it fully.) Beats: it yawns, goes to the fern in its own way, turns round once, and settles as its parts say (twig legs fold under, wings fold over as a blanket, a willow back curls round, a round leaf rolls on to its back, a feather tucks over the eyes, a seed nose whistles); a frond sinks over it and the eyes close. Filled in from: its parts and where under the fern is free. Saved when it starts: `bedded`, `drowsy` cleared, and its `x`, `y` and `turn` under the fern. A sleeper is found in its bed, as it was left to the last part. A tap on a sleeper, anywhere it is drawn, wakes it where it lies, with no scene.
- **The eyes come off.** Cause: a cap is dragged clear of a creature so that it carries fewer than two. A finger that lands on a creature and lifts without stroking it or dragging a part clear of it is a poke and takes nothing off; a slide that begins on an eye and stays on the creature is a stroke like any other, so a creature that is eyes and nothing else can be stroked. An eye comes off only when the finger has dragged it clear of the creature's outline by the width of a cap: until then the eye stretches after the finger, and let go sooner, or slid back on to the creature, it snaps back into its place with its own sound, and that is no poke. Beats: the creature stops in the middle of its move and breathes out; its parts let go; the small wind child puffs once and the parts tumble back to their heaps, each as it flies. The cap stays in the hand and can be pressed on anywhere. Filled in from: its parts. Saved when it starts: the thing is removed from `things`. The cap in the hand is not stored: put away with the cap still in the hand, it is found back in its heap.
- **An acorn comes up.** Cause: a creature with a seed nose reaches a buried acorn. Beats: it sniffs faster, digs with whatever it has, the acorn pops out, and it pushes the acorn a little way. Filled in from: which acorn, and the creature's parts. Saved when it starts: that acorn's `dug`, and its `x` and `y` where the push will leave it. A tap on a dug acorn presses it back under the earth with a pat. Nothing counts the acorns or shows that any is left.

**No ending, and how it starts again.** The play is open and has no ending. Nothing that asks anything of the child starts while the child does nothing: a creature only goes on in its own way, and a seed nose may dig up an acorn it has reached. A finished creature stays for as long as the child likes, the earth is free for the next thing at any time, and the clearing is tidied calmly: a creature is bedded by two strokes, returned to the heaps by pulling an eye off, and a part that was laid is carried off the earth. On load no scene plays: the clearing is as it was left.

## The records

The game has no learning goal: it is designed from no record and claims no school skill.

## The look

Written after the style spike, not part of the sheet.

**The look in use is Wax crayon, the first of the two looks reserved for this game.** The spike held on clarity at 1180 by 820: a part is told from its heap, a creature from the earth and an eye from a cap at a glance. The frame budget is counted and held by a test (below). The second reserved look was not tried.

**What makes it this look.** Everything is drawn with one tool, in `crayon.ts`: a shape is filled with back-and-forth strokes that leave streaks of paper between them, a second layer of a near hue is laid across the first, lines are the same crayon pressed harder and drawn twice, and every shape ends in a dry, broken edge. The tooth of the paper is taken back out of whatever was drawn, so white specks show through the whole sheet. There is no opaque fill, no ink outline, no gradient and no light: a thing is darker only where the crayon was pressed.

**Palette.** White paper. The earth is a cool slate violet, the one dark, quiet field in the frame, so that every part laid on it is lighter and warmer than its ground: bone-white twigs, orange maple wings, lime willow leaves, yellow round leaves, pale blue-white feathers with a blue tip, cream seeds, nut-brown caps. Round the earth, grass in two greens, autumn tree tops in orange, red, yellow and olive, brown trunks, a pale blue sky with far trees. The wind children are white with blue pressed lines and pink cheeks, and red all over when one strains; the toad is olive with a cream belly; the fern is the one deep green. Eyes are white with a dark pupil and are the lightest, sharpest thing on the earth. The idle glow is a warm yellow light under a heap: a solid pale coat with yellows over it, laid whole and never thin, which grows out from under the heap as it comes. With five creatures up it lies under the creature woken last instead, and goes with it. When the hint moves from one heap to another the glow draws back in under the first and grows out from under the second, in about a third of a second each way; it never crosses the frame at its full size. A maple wing's underside, shown for a moment as it is lifted, is the same wing in a paler, greyer orange.

**The frame is full.** The picture of the place is drawn as far past the stage as the surface shows, so a surface of another shape is wood from edge to edge: more tree tops above, more grass, mushrooms and ferns below. Tree tops run across the whole top with a wind child in each corner, trunks stand at both edges, the toad sits on its stump at the left, the fern fills the right, and the seven heaps fill the near edge. The dark earth in the middle is the working surface and is kept plain on purpose.

**Shapes, and what each is kept from looking like.** The band begins at 3, so nothing the game draws or places may read as a letter, a numeral or a sign, and each of these is held by a test (`art.test.ts`, `shapes.test.ts`, `drawn.test.ts`).

- A twig is one post with two knots and a broken end, with one line pressed along it: nothing crosses it and nothing branches from it.
- A seed's two stripes run its length, bend, differ in length and meet at the tip.
- A cap is hatched with rows of small arcs, like scales, every one inside its rim.
- The wind children's hair is tufts of scribble with no pressed line in it, and the small one's hand is an open hand with its fingers together like a mitten, one rounded top and a thumb, with a scribbled puff of wind beside it.
- The ghost hand is an open hand seen from above with its fingers together, like the small wind child's mitten: one top, a little to the first finger's side, and the thumb out to the side and lower. It has no finger of its own, so it shows no count.
- A gust is wavy lines that go on along their own way and never loop. They lean: each goes much further across than down, and no stretch of one is steeper than half-way between level and upright. A stretch that would come out straight is not drawn.
- A finger on bare earth leaves a smudge and a puff of dust, two dots and no line.
- The thing a youngest child finds begun is a body: a round leaf, one twig out to the side, one cap on the leaf.
- What a tap lays is laid like limbs: a twig, a willow leaf or a feather goes on by its end at one place on the edge of the thing and fans from it, none across the middle and no two crossing; a wing, a round leaf or a seed goes on the body and over no eye; and an eye goes on the thing with a gap of a third of a cap or more to the next eye. What a child lays by hand is the child's and is held to nothing.

**Materials.** Paper and wax only. Parts are flat drawings; a part in the hand or a creature in a hop gets a soft scribbled patch of darker earth under it, the size of a small body, not a cast shadow.

**Lighting.** None.

**What stands in front.** The heaps, the two wind children and the toad are drawn in front of everything on the ground and are touched first; a heap is touched as far as it is drawn, to its outermost twig end and leaf tip, and between two heaps the nearer one is touched; a sleeper lies under the fern behind the heaps like anyone else, and the fern's two front fronds are drawn over whoever sleeps under them; a dug acorn lies on top of the loose parts round it and is touched before them; the creature that waits behind the trees shows only its eyes, between the trunks at the edge it left by, drawn over whoever stands there and touched before it; of the creatures, the one nearest the bottom of the page is drawn last and is touched first. A part in the hand rides above the finger and is drawn over everything but the air; while its finger is lifted it quivers and sinks a little, so it is seen letting go and never hangs. A creature is touched wherever it is drawn: the hit test uses its parts as they are posed, at rest, squashed, tumbling and asleep.

**Motion.** Shapes move as cut-out drawings: they slide, turn, squash and stretch. A creature is one kept picture of its parts as they are posed; while it moves, that picture is drawn again a few times a second from the next of each part's three drawings, which is the low boil of this look, and it holds still on one drawing when it rests. Between two redraws the whole creature still travels, turns, hops, leans and squashes smoothly, since those are done where its picture is laid down. A part that is coming down (a cap in flight to its thing, a part just pressed on) is drawn live until the creature's picture holds it, so nothing is missing or doubled for a frame. An eye that is being stretched by a finger is not drawn live: it is drawn in its creature's picture, which is made again as the eye moves and so follows the finger a frame or more behind. An eye that has come off is drawn in the hand from the frame the creature's picture is drawn without it. What changes shape from frame to frame is drawn live as a few crayon strokes: a mouth, a brow, the lines of a gust, the mark a finger leaves, the dust of a dig. Each kind of part and each of the three in the frame moves in its own way (the sheet's characters).

**How each tier keeps the look.** Every tier draws the same crayon pictures, made once at the sharpness of the surface and kept. A lower tier lowers the pixel ratio (2, 1.5, 1.25, 1), lets fewer leaves into the air (7, 6, 5, 3) and draws a gust with fewer lines (5, 4, 4, 3); the lowest tier also stops the boil. No tier changes a colour, drops a character or removes the paper tooth.

**What a frame costs.** This is a 2D canvas, so there is no draw call in the 3D sense. What is counted is every picture stamped and every live crayon stroke of a frame, those that go into a kept picture included, by the same `drawFrame` the canvas uses, drawn with a pen that only counts (`frameBudget.test.ts`). Three things keep the count low (`painter.ts`). Whatever lies still on the ground (the place itself, loose parts, dug acorns) is part of one kept picture of the place, stamped once a frame, and is painted into it again only where something changed. The seven heaps at rest are one kept picture of the row, stamped once a frame over the creatures; a heap is drawn live only while it sinks or springs. Each creature is one kept picture, drawn again only when its pose has changed, the one longest unpainted first, after the frame itself is drawn and only while the frame stays within 68; a picture that has waited more than a tenth of a second of the toy's own clock, whatever the frame rate, is drawn within 70, one such a frame.

The draw number is 72: no frame makes more, which leaves 8 under the bar of 80. It is the same number at 1180 by 820 and at 1024 by 768, because the frame is drawn in stage units; the test draws the fullest travelling clearing at both and at 820 by 1180 as well. 72 is the most counted over these cases in the fullest clearing the limits allow (five creatures of fourteen parts and four caps each, twenty-four loose parts in four things, three dug acorns, a full sky of leaves, a gust, a hat on the toad, the idle glow, the ghost hand and the eyes that wait behind the trees): a part in the hand, 68; the frames of a waking, 70; the eyes coming off, 68; a part lifted out of the middle of everything, 69; a seed lifted with its two fellows, 70; five asleep, 67; and three creatures on their way off at once, which is the 72. With all five creatures travelling and nothing else the most is 68. A first visit at rest is under 30. One composite covers the whole surface each frame, the picture of the place, and no other.

What the number leaves out, said plainly: the kept pictures are made once, before a frame is drawn, at a load, at a put-away and when the surface changes size. That making is up to 180 stamps into kept pictures for the fullest clearing, it is not part of any frame, and it is not in the 72; the test holds it at 180 and holds the first frame after it under the bar. No frame rate has been measured on a device.

**Registry row.** `| Leaf Creatures | Wax crayon: waxy scribbled fills on toothy white paper with the paper showing through as specks, layered hues, pressed lines and dry broken edges, light warm leaf parts on a cool slate-violet earth under autumn tree tops that fill the frame, a low boil only while a thing moves | [games/leaf-creatures/ART.md](../games/leaf-creatures/ART.md) |`
