<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

Wash Day has no learning goal. It is pretend work: three muddy friends, a tub, a ridged board, a line and the wind.

## The band and its age rule

The manifest band is 3 to 6, and its youngest age, three, governs the design.

- **The cue-table row.** The row for a youngest age of 3 to 4 in the wordless-clarity convention. Its "Avoid" column binds the game: no text, numeral or pictorial icon that has to be decoded, no spoken instruction, no verdict, never several activities live at once, and no tool in the yard before it means something. One next act is offered at a time: one thing lies on the board, and the rail, the pegs and the soap come into use only when a thing has reached them.
- **The pack's rules for the range.** The band starts at 3, so the rule for the youngest binds (pack: game-design, ages-2-to-4.md): every essential step works with a tap, a drag survives a lifted finger and counts when partly done, essential targets are about 100 stage units across and well apart, none sits in the bottom strip and none under the jam's home control (round, 48 px across, at the top centre, 10 px from the top): the line's places and its pegs lie to either side of it and nothing the game sets down comes to rest beneath it, a whole cycle with one friend fits in one to three minutes, and there are never more than three friends and three garments. No pinch, tilt, shake or double tap. For the older half the game is pretend play with characters who react, and mischief done on purpose (pack: game-design, ages-4-to-6.md).
- **The symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, and the game has no `symbols.ts`. The rule follows the manifest band: a six-year-old sees none either. The embroidery has no cross-stitch, since two crossed stitches read as a sign.
- **What `ctx.childAge` sets.** Only how many friends step in from the gate on the first touch of a first visit: one for a child of 3 and younger, two at 4, all three at 5 and older. A saved position wins over the age. Age locks and hides nothing: the friends who did not step in stand at the gate in full view and come in when they are touched, at any age.
- **What no age gives.** `null` starts a first visit with one friend, as for the youngest child.

## The toy

**The action.** The finger rubs a muddy thing that lies on the ridged washboard. That is the touch the finger performs most.

**In an empty scene.** One muddy garment lies on the board in the tub, and nothing asks for anything.

- When the finger lands, in that frame, the cloth dimples under it, the mud under the fingertip loosens one step, a few brown threads spring out of the cloth, the first suds sprout, and the board gives one wooden tick.
- When the finger moves, the mud lifts where it goes and nowhere else, and the clean cloth shows through in the garment's own bright thread. Every ridge the finger crosses ticks, and the pitch of the ticks follows the speed of the finger, so a slow rub clucks and a fast one sings like a comb. Brown runs down the grooves into the tub, and the water clouds a little with each patch that comes off, less the darker it already is. While the washed ones walk off the mud sinks out of sight, and the next three come to clear water.
- Suds build with the distance rubbed: white knots heap up along the finger's path, and single bubbles drift up from the heap on the wind. A bubble touched pops with a pip.
- When the finger lifts, the cloth springs back with a small wet slap and the suds wobble and settle.
- A tap is a rub: each dab lifts the patch under it, so a child who only taps gets the cloth clean dab by dab.
- A cloth with no mud left squeaks under the finger, higher the cleaner the spot, and goes on making suds up to a heap that leans, slides off into the water with a fizz, and starts again.
- The bare board, with no cloth on it, is a rattle: the ridges tick dry and woody under the finger.
- The puddle in the grass is where mud comes from. Touched, it goes blop and throws one dollop onto whatever lies on the board, which lands with a splat and can be rubbed off again. Mud never arrives any other way.

**Why repeating it is a pleasure with no goal.** The answer starts at touch-down and is bigger than the touch: a dimple, flying threads, suds, a tick and a cloud in the water from one fingertip (pack: game-design, touch-answers-bigger-than-the-touch.md). The mud gives way exactly where the finger is, so the finger draws in it: a stripe, a face, a window wiped clear. The board is an instrument whose tune the hand's speed plays. Random tapping cleans, pops and splats and nothing a finger can do is punished; the simplest use, a dab, always works (pack: game-design, toy-first.md). And the toy never runs out by itself: the puddle gives more mud whenever the child wants it.

## The object-by-action grid, and what is new on day 15

Six garments by six things that happen to them on the way from a muddy friend back to a wearer. Every cell looks and sounds different. The last column is also played in each friend's own manner ("The characters and their fixed tastes"), so it is never the same twice across wearers.

| Garment | Dropped in the tub | Rubbed on the board | Soaped with the bar | Wrung on the rail | Pegged on the line | Worn |
| --- | --- | --- | --- | --- | --- | --- |
| Sock | Floats toe up like a boat and turns once, with a plip | Thin: the mud is off in two strokes and the stripes flash; the ridges zip high and quick | Fills with foam like a sausage and squirts one bubble out of the toe with a peep | Twists into a tight screw and gives one thin jet, with a mouse squeak | One peg holds it by the toe, and it spins in the wind with a flutter, prrp | Goes on a foot, an ear, a beak, a horn or a tail with a stretchy snap |
| Shirt | The sleeves float up and spread like arms while the body fills with a slow glug | Wide and flat: the ridges hum low and even, and the mud gathers in the cuffs and is chased there | Bubbles come out of both cuffs at once with a fizz | The sleeves wind round each other and two streams run from the cuffs with a long creak | Two pegs at the shoulders; the sleeves wave and clap against each other | Arms go through the sleeves; a button strains and pops with a ping, and is back when the shirt comes off |
| Dungarees | Sink straight down with a deep gloop, and big bubbles rise from the pockets | Heavy and stiff: the finger drags, the ridges thud, the buckles clink on each one, and mud hides in the pockets | The lather stays thin and grey, the pockets fill with foam and burp it out | Hardly twist: a groan like a rope, then a sudden gush from both legs | Hang by the straps with heavy legs; the line dips under them with a twang | Legs go into the legs and the straps ping up over the shoulders; on short legs the cloth folds like a squeezebox and wheezes |
| Jumper | Drinks the tub: the water level drops and the jumper swells to twice as thick with a long slurp | Soft: the finger sinks in, the ridges are muffled to a fuf, and a patch takes three or four strokes | Makes the most suds of all: the foam climbs into a tower that wobbles and hisses | Pours like a tap for as long as the finger keeps crossing, with a squelch | Heavy with water, it stretches down until its arms nearly reach whoever stands below; drip, drip, drip | Pulled over the head, it sticks halfway with a muffled voice inside, then the head pops through with a thwop |
| Bobble hat | Floats upside down like a bowl, fills, tips and goes under with a glug, and the bobble stays up as a float | The bobble rolls under the finger across the ridges and rattles like a pea | The bobble turns into a ball of foam twice its size and squeaks when pressed | Squeezed like a sponge: one fat spurt goes straight up and comes down with a splat | Hangs open by its rim like a bell; the wind swings it and the bobble knocks, tok tok | Pulled down over the eyes, a snout or a beak; the wearer honks through it |
| Scarf | Uncoils and swims once round the tub in a ring with a swish | Too long for the board: the finger pulls it across the ridges length by length with one long zzzip, and the mud comes off as a moving stripe | Foam runs along it like a lit fuse, crackling | Twists into a rope of many turns, and the water beads out all along it with a rising squeak | The wind lifts it out flat like a flag and the fringe snaps | Wound round a neck, a belly or a pair of horns, each turn with a whup |

**The rest of the yard goes through the wash too.** These are the wrong uses, and each works every time. A friend that wears or holds a thing is not lifted: a pull at it takes the thing, and the friend answers in its own voice.

| Thing | On the board, rubbed | Wrung on the rail | Pegged on the line |
| --- | --- | --- | --- |
| The cat | Lies flat with its ears back, yowls up a scale as it is rubbed, and comes up round and fluffed to twice its size | Cannot be twisted: it shakes itself from nose to tail and sprays everyone, brrrt | Hangs by the scruff with a flat look, tail swinging like a pendulum, and purrs |
| A peg | Runs down the ridges clattering like a stick along railings and comes out pale and shiny | Has nothing in it: it squeaks like a rubber toy and its spring boings | Pegged by another peg, the two hold on as a chain that jingles in the wind |
| The soap | Slides off down the ridges like a sledge and lands in the tub with a whee and a plop, leaving a carpet of foam | Shoots out of the grip into the air with a pfft and drops back into the tub | The peg slips off it and the soap falls on whoever stands below with a bonk and one bubble |
| A friend | Climbs into the tub in its own way and the mud lifts off its hide: the pig sinks to its snout and blows bubbles with a blub-blub, the heron stands on one leg and shrieks at each rub, the goat eats the suds and hiccups | A tickle: it wriggles and laughs in its own voice | A peg on an ear, a beak or a beard: it holds still and squints at it, then flicks it off with a pop |

The puddle belongs to no column: touched, it goes blop and throws a dollop of mud onto whatever lies on the board, and a thing dropped into it comes out muddy with a splat.

**On day 15** the child dresses the wrong friend in the wrong thing on purpose (the jumper on the pig, the sock on the heron's beak), hangs things half wrung to see them drip on whoever stands below, rubs the cat fluffy, pegs the soap, draws faces in the mud before rubbing them out, and knows which friend hates what and likes what. None of that needs new content: it is six garments by six actions and four yard things by three, with three wearers (pack: game-design, depth-from-combinations.md; pack: game-design, liveliness-from-causing-and-comedy.md).

## The representation

The game has no learning goal, so no school idea is represented and there is no order of object, picture and symbol.

## The four mechanic questions

The game has no learning goal and claims no school skill, so the four questions about swap, attention, fun and guess have nothing to be asked of.

## The error as a consequence

Nothing in the yard judges the washing. What was done to a garment stays on it and shows in the world, and each friend answers it by its own taste.

- **Half rubbed.** The mud that was not rubbed off is still on the garment, in the same places, on the board, on the line and on the wearer. Worn, each patch draws two flies that circle it with a buzz, and the wearer looks down at the patch.
- **Half wrung.** A garment that still holds water drips where it hangs, on whoever stands below, drop by drop until the wind has dried it, which takes longer the wetter it is. Worn wet, it squelches at each step and drips from the hem.
- **Still soapy.** Suds that were not wrung out stay on the garment and trail bubbles off it on the line and on the wearer.
- **One peg, or none.** With one peg a garment hangs crooked and swings; with none it slides off in the next gust. Over a friend who wears nothing it lands on that friend with a bonk and is worn where it first fits, with no scene and no answer by taste; otherwise it lands on the grass. Either way it can be picked up again at no cost.
- **The wrong wearer.** The garment goes on wherever it fits that body, and the friend reacts to exactly this garment in exactly this state.
- **The gate, with someone still in underwear.** The gate rattles, each friend who wears nothing yet, in the yard or in the tub, crosses its arms over its underpants and stays where it is, and nobody leaves.
- **The state stays.** While the friends are in the yard nothing is taken away, reset or tidied. When they walk off, a garment nobody wears goes with its owner. A garment can be pulled off a wearer and off the line and taken back to the board, the rail or another friend, so the child changes one thing and tries again.
- **As interesting as getting it right.** A dripping jumper over the heron or a soapy sock on the goat is worth causing on purpose, and a child may.
- **Never about the child.** A friend's feelings are about the garment. There is no buzzer, cross, sad face turned to the child, praise or cheer, and no sound that means wrong.

(pack: game-design, errors-show-as-consequences.md)

## The designed order, and what is stored

**The order.** Three places, one new thing at each. The ids are as they stand in `LADDER` in `config.ts`; each names a place in the game's own order.

| Id | Who steps in on the first touch of the gate | The one new thing |
| --- | --- | --- |
| `one-comes` | one friend with one garment | the job itself, once through: hand over, rub, wring, peg, dress |
| `two-come` | two friends with two garments | a line with two things on it, a neighbour to drip on, and two garments to swap |
| `three-come` | all three friends with three garments | the full line, and every friend's taste in play at once |

**Where a first visit starts.** `one-comes` for a child of 3 and younger and for no age, `two-come` at 4, `three-come` at 5 and older. A saved position wins over the age.

**The harder option the child picks.** The friends who did not step in stand behind the gate, muddy, each holding its garment up over the gate. More friends is more to do and looks it. The child calls any of them in by touching it, at any place in the order and at any moment of a cycle.

**How the position moves.** A cycle is one visit of the friends, from the first touch of the gate to their walking off. It goes *well* when the child called in at least one more friend than stepped in at the first touch; it is *mixed* otherwise. No cycle goes badly, since nothing in the game can be failed, so the position never moves down. It moves one place up after a cycle that went well, when the ending starts and never inside a cycle. Nothing on screen shows it.

**Which friends a new position lays out.** The very next ones. The three who wait at the gate are settled when the ending starts (who they are, which garments they hold and where the mud lies), and that does not depend on the position. The garments are dealt, never drawn by luck: the three garments not held in this cycle are the three held in the next, and the seed says only which friend holds which and where the mud lies, so every garment is back within one cycle. The position is read at the first touch of the gate and says only how many of them step in on that touch.

**What is stored.** Small plain JSON under one version number, read field by field. A damaged field takes its default and the rest is kept.

- `v`: the version.
- `position`: an id from the table above.
- `finished`: the friends of this cycle have walked off. The yard stays as the ending left it, nothing replays on load, and the next three wait at the gate.
- `seed`: where the game's stream of chance stands, so the three at the gate, their garments and their mud are the same on load.
- `friends`: the three of this cycle, each with its kind (pig, heron or goat), its colourway, where it is (at the gate, in the yard or in the tub), the mud on its hide as a coarse grid, how wet it is, and which garment it wears and where on its body.
- `garments`: the three of this cycle, each with its kind, whose it is, its place (held by its friend, in the tub, on the board, on the rail, on a place of the line, on a friend, on the grass or in the puddle, with the spot for the last three), its mud as a coarse grid of four steps, how wet it is and how soapy, each in tenths, and which of its two pegs are on.
- `water`: how cloudy the tub is, in tenths, and its level.
- `cat`: where the cat is (on the fence, on the board, on the rail or on the line), how wet and how fluffed.
- `soap`: where the bar is, and `pegs`: which of the loose pegs are washed shiny. A loose peg's place is not a field: a peg left on the board, on the rail, on a friend or chained to another peg is short-lived, and on load every loose peg is back at its place on the line. Mud on the cat, the soap or a peg is short-lived too: it is gone when the cell that put it there has played, and on load.
- `hill`: the last three who walked off, over as many cycles as that takes, as they were dressed: each one's kind, colourway, garment, where it wears it, and the garment's mud, wetness and suds. They stand small on the far hill in the order they left: when a newer leaver comes the oldest goes over the far side, the others walk up one place and the newcomer takes the last, and that is how the yard keeps what the child made.

A garment in the hand is never saved in the air: a put-away under a dragging finger sends it back where it came from. Drying runs on attended game time and is saved as the garment's wetness. The largest legal state stays under half the storage cap, and a test says so.

The toy of the first stage saves its own smaller part of this: `v`, `position`, `finished`, `seed`, the three garments with their kind, place (held or on the board), mud and suds, and `water`.

## The characters and their fixed tastes

Three friends and a cat. Each friend has one want that is always visible: it stands in its underpants with its knees together and holds its muddy garment out towards the tub. While its garment is in the wash it leans towards it and watches. The three who wait at the gate hold their garments up over the gate, turned to the child, and never call, wave or hurry. They and their garments stay above the gate's top bar: the boards of the gate below it are always clear, a touch there is a touch on the gate, and a touch on a waiting friend or on the garment it holds is that friend's and never the gate's. An overlap test holds this at 1180 by 820 and at the smallest surface the game's tests use.

Each kind of friend comes in two colourways, which take turns from cycle to cycle, and the taste belongs to the kind.

- **The pig** likes things tight and likes water. In a sock, a hat or anything small it squeezes in with a creak, sucks in its belly and struts. Dripped on from the line it lifts its snout and wriggles. A loose thing (the jumper, the dungarees) hangs off it to the ground; it hitches it up, it slides down, and it trips on the hem and sits down with a bump.
- **The heron** hates wet and likes long things. A damp garment, sleeves most of all, makes it hold its wings out stiff and shudder the drops off with a rattle of its beak. Dripped on, it opens one wing over its head and glares up at the line. A dry scarf or a dry pair of long legs makes it stretch to its full height and preen. In a tight thing it cannot fold its wings and walks as stiff as a plank.
- **The goat** likes soap and hates the smell of mud. It licks a soapy garment, chews, and hiccups bubbles with a bleat at each. A muddy patch makes it sneeze, turn its nose away and wear the thing at the full stretch of its neck. It hangs whatever it can on its horns and looks pleased with it.
- **The cat** wants nothing from the child. It sits on the fence, follows the finger with its eyes and washes one paw. It hates water as cats do and purrs when pegged.

A friend dressed in something clean and dry that suits its taste stands tall, puffs its chest and turns once to show the garment. That is pride in the garment; it is not thanks. A dislike is as good to watch as a like, and every reaction is to the exact thing the child made: this garment, this wet, this muddy, on this body. No friend is ever hurt, and none has a feeling about the child, about waiting, or about the child leaving or coming back.

A touch on a friend who holds its garment makes it hand the garment over: the garment flies to the board, or into the tub when the board is taken. A touch on a friend whose hands are empty makes it jiggle in its own way with its own voice.

(pack: game-design, characters-with-opinions.md)

## The scenes

Each scene is a list of timed beats filled in from the state of play, and each gives way to any touch: the touch lands every beat that is left, silently, and is then an ordinary touch.

1. **Coming in.** Caused by a touch on a friend at the gate, or on the gate itself while no friend is in the yard. Beats: the gate swings with a creak; the friend, or as many as the position says on the first touch of a cycle, shuffles in with its knees together, in its own walk; each stops at its place under the line and holds its garment out. Four to five seconds. Saved when it starts: `finished` false, `friends` (those who step in are in the yard), and on the first touch of a cycle nothing else. Filled in from: who was touched, the position, the kinds and colourways.
2. **Putting it on.** Caused by a garment let go on a friend, or by a tap on a dry pegged garment, which sends it to its owner. Beats: the friend catches it; it goes on where it fits this body, in this garment's way; the friend answers by its taste to the garment's mud, wet, suds and fit; it settles into wearing it. Four to six seconds. Saved when it starts: `garments` (this one's place is on this friend, its pegs are off) and `friends` (this one wears it, and where). Filled in from: the garment's kind and state and the friend's kind.
3. **Walking off.** Caused by a touch on the gate when at least one friend is in the yard and every friend who has come in, one that sits in the tub included, wears something. Beats: the gate opens; each friend walks out in its own walk, showing the garment as it is (squelching if wet, with flies if muddy, trailing bubbles if soapy); they go up the lane and stand small on the far hill; a gust sways the empty line; a friend who was never called in turns from the gate and goes off down the lane with its garment, in its own walk; the next three come up behind the gate, muddy, and hold their garments over it. Eight to ten seconds, then the yard is still. Saved when it starts: `finished` true, `position` (moved if the cycle went well), `hill` (the leavers as dressed), `water` (clear again), `friends` and `garments` (the next three and what they hold), and `seed`. Filled in from: who wears what, in what state.

A reaction to a touch (a jiggle, a drip landing, the cat shaking) is no scene: it runs alongside play and blocks nothing.

**No first showing.** The game is free pretend play with no target idea, so no character demonstrates a move before the child tries it. The idle ladder shows what can be touched and then the one move that thing takes: the rub on a muddy garment that lies on the board, and a tap on anything else.

**How a cycle ends and the next one starts.** The cycle ends when the child touches the gate and the dressed friends walk off. The finished yard stays as long as the child likes: the line sways, the three stand on the hill, and the next three wait behind the gate. Nothing starts by itself and nothing counts down. The next cycle starts when the child touches the gate or one of the three at it. On load no scene replays: the yard is as the last scene left it.

(pack: game-design, endings-and-short-scenes.md)

## The records

The game has no learning goal. It names no record of either jurisdiction and claims no school skill.

## The look

Written after the style spike, not part of the sheet.

**The claimed look: embroidered linen** (first reserved choice). Everything is thread on one piece of oatmeal linen seen flat and from the front. The weave of the cloth shows wherever nothing is stitched.

- **Stitches.** Fills are satin stitch: rows of parallel threads, each a short rounded stroke with a lighter core, laid in one direction for each shape so that the fill catches the light one way. Outlines of scenery are running stitch. Small round things (flower heads, eyes, buttons, suds) are knots: a dot with a highlight and a small shadow. Only what can be touched carries the one thick chain-stitch outline.
- **Palette.** Linen `#e4d8c0` with weave lines a little darker and lighter. Scenery in soft plant-dye threads: leaf greens, a dusty sky blue for the stitched clouds' edges, hedge green, fence cream. The friends in stronger thread: pig pink, heron slate, goat cream, with white underpants and red dots or stripes. Mud is a dark brown thread laid as scruffy seed stitches over whatever it is on. Suds and bubbles are white knots. The garments are the brightest threads in the frame, and the board under them is plain pale wood with no stitching but its ridges.
- **The working pieces stay plain.** A garment is one flat satin fill in one bright colour inside its chain outline, with at most two stripes. It does not sway or breathe on the board. The mud on it is the only busy thing, and the mud is what the finger works on.
- **Light.** None. There is no cast shadow and no gradient; depth is only what overlaps what. A knot has a dot of highlight.
- **Motion.** Things move as cut pieces of stitched cloth: whole parts turn at their joints, squash and spring back. Threads that come loose (mud unpicked, a splat) fly as short strokes and fall. Nothing fades in or out except the idle glow.
- **How each tier keeps the look.** Every tier draws the same stitched pieces from cached sprites. A lower tier lowers the pixel ratio, then drops the lighter core of the live threads and caps the loose threads and bubbles in the air. The linen and the stitches are never dropped.
- **What is cached and what is live.** Painted once for each size of the surface: the linen with its scenery, the board, the front of the tub, the puddle, the gate, and each part of each friend, the cat, the bird, the soap, the pegs and the hand. A garment is one cached picture of its clean cloth; its mud is laid over it in a second cached picture that is painted again only when the mud on that garment changes, so a rub repaints one small picture and nothing else. Live strokes are few: the line and its sag, the water's ripples, the loose threads, the bubbles, the drips and the idle ring.
- **The friends.** Each kind has two colourways that alternate by cycle (its own thread and the thread of the dots or stripes on its pants), so the next muddy three are not the same three. Mud on a hide is the same scruffy seed stitch as mud on cloth, in a coarse grid over the body. A garment worn is the same cached picture as on the board, sized and turned to the place it is worn at, and it moves with the part that carries it. The goat in a muddy thing has a neck stitched in between its shoulders and its lifted head: a picture of its own, stamped only while the neck is at its stretch.
- **Things hang from, and stand behind, what holds them.** A garment on the line turns about its pegs and is blown from there; the scarf hangs by one end from one peg. A garment on the rail hangs from the bar. A friend behind the gate is hidden by its bars and seen through the gateway the open leaf has cleared. A friend in the tub is seen above the rim and to the left of the wall, never through the staves. The fluffed cat is twice its area and no more.
- **No crossed stitches.** Mud is laid as short stitches side by side: the stitches of one cell share that cell's angle and keep to their cell, so no two stitches of a patch can cross. The scruff is in what may differ without a crossing: each stitch is of its own length and slid its own way along itself, the stitches of a cell lie unevenly apart, and the cells take turns through five leans, so a cell never lies like the one beside it or the one above it. On a hide the three of a cell lie closer together than a thread is thick and read as one ragged smear. No mud stitch lies near the level. The flecks in the grass, the hedge and the trees are tried one by one against those already laid, and one that would cross another is left out.
- **The cat's ears** are two stamps of one ear that turn at their roots with its pose: pricked on its post, laid flat to the sides on the board. Hung or held, its hind legs are stitched in the same pass as its tail and the paw it licks is left out.
- **The pegged cat** hangs by its scruff, longer than it sits, with its hind legs dangling and its tail straight down, and swings a little about its peg. When a friend is near, in the yard, on its way in or in the hand, it hangs shorter, pulls its legs up and carries its tail in a crook beside it, where the end still swings; so it ends no lower than a garment on the line and reaches nobody's head. It lets itself down again when the yard is empty. **Those on the hill** who left wet have round drops under what they wear.
- **What a garment carries.** Suds that were not wrung out are white knots stitched into the garment's own picture, the same knots it had on the board, so they go with it to the rail, the line and the wearer at no cost to a frame. A worn shirt is stamped from a second picture of the shirt in which the lower button is gone and only its thread is left. Mud that comes off on the board runs down it as a short wavering brown thread, all the trickles in one stroke. The scarf on the board is drawn where the finger has pulled it to.
- **The pucker under the finger** is one ring of eight short stitches in one stroke. On the jumper it is half as wide again with the stitches pulled far in, so the finger has sunk; on the dungarees three more stitches trail behind the finger, where it came from, and down the board after a dab. Other cloths keep the plain ring.
- **The tub's cloud** is one flat fill of light mud thread over the water, stronger with each patch and never stronger than 0.85. It sinks away over about four seconds while the washed ones walk off.
- **Room on the hill.** Those on the hill are one picture, stamped once. While room is made each is cut out of it by its column: one who stays is stamped on its way to the next place with two small steps, and one of the oldest moves left and is hidden from the feet up, as behind the crest. Each stands in the same pose at any place, so nothing changes when the picture is stitched again.
- **Garments drawn in pieces.** A piece is a part of the garment's one picture, so it carries its own mud and suds. The shirt's two sleeves are cut from it at the shoulders and turned there: up and out on the water, in across the front on the rail until the cuffs lie one over the other, waving on the line and meeting in front at each clap. Worn, a sleeve runs from the shirt's shoulder down the arm that is in it, pushed up so the hand comes out of the cuff, and the near arm is stamped between the shirt and its sleeve. The wrung sock and scarf are cut across into bands, four and seven, each pushed the other way from the one above, and are whole again when let go. The worn scarf is wound into a picture of its own, the hanging end and over it up to three turns that all lean one way, when a turn goes on or its mud changes, and is stamped from that. The dungarees going on are their legs and the two halves of the bib; a half hangs down in front, folded at the waist, until its strap pings up. The hat's bobble in the tub is stamped by itself on the water over the hat's slot, wherever the hat is. No two pieces are laid so that their edges cross as two single stitches would: a piece overlaps another as cloth lies on cloth.
- **The gate, the rail and the line** are plain cream and wood with running-stitch edges, so that they read as places and not as things to wash. The idle ring is a dashed gold thread; for a free place on the line it is tall enough to take in that place's two pegs.
- **The frame budget.** A frame is one stamp of the cached linen and then stamps and strokes over it: there is one full-surface composite, no blur, no shadow and no blend mode. The count the overlay shows is every stamp of a cached picture plus every live stroke or fill, repaints of a mud picture included. The most the frame-budget test finds is 78, against a bar of about 80: a worn shirt in three pieces, a muddy scarf wound on a goat at the stretch of its neck, the cat on the line and a shiny peg, while a soapy sock is rubbed with mud and bubbles flying. The yard of the first runs, without those pieces, reaches 73.

## The registry row, a request to the lead

For section 3 of `docs/art-direction.md`, once the owner has kept the look:

| Wash Day | Embroidered linen (canvas 2D): pictures in coloured thread on bare oatmeal linen seen flat from the front, satin-stitch fills laid one way for each shape, running-stitch scenery, knots for flowers, eyes and suds, the weave showing wherever nothing is stitched, no light and no shadow; a washing yard filled from edge to edge with three large muddy friends in their underpants, mud as scruffy dark seed stitches, and one thick chain-stitch outline on what can be touched | [`games/wash-day/ART.md`](../games/wash-day/ART.md) |
