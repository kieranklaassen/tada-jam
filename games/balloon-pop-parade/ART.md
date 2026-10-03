<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 2 to 4, so a two-year-old governs every choice.

- **Cue table.** The table in the jam's wordless-clarity convention has no row below 3. Its 3 to 4 row is taken as the ceiling and cut further: one live activity, one next act on offer, a ghost hand that shows one move, a breathing glow on what can be touched, and characters that gaze and reach. Its "Avoid" column binds as written: no text, numeral or picture that must be decoded, no spoken instruction, no verdict, never several activities at once, and no tool on screen before it means something.
- **The pack's rule for the age** (pack: game-design, ages-2-to-4.md). Everything essential is a tap. A tap that smears into a short drag counts as the tap. No pinch, tilt, shake or double tap. Every balloon and every friend is at least about 100 logical pixels across, they stand well apart, and none sits in the bottom strip where wrists rest. Whatever looks touchable answers a touch. One action, sending a balloon, is offered again and again. A cycle (one troop of friends served) takes well under a minute, and a visit of one to three minutes holds several. No set on screen is larger than three.
- **Symbols.** The band starts below 6: no word, letter, numeral or symbol on the kid side, optional or not, and no `symbols.ts`. No voice speaks; the friends have invented, synthesized squeaks.
- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order: 2 or younger starts at `solo-two-colours`, 3 at `solo-three-colours`, 4 or older at `pair-singles`. No age (`null`) takes the youngest start. A saved position always wins, age never hides or locks anything, and every position is reached by play from every start.

## The toy

**The action.** The finger taps a balloon that floats in the sky, and the balloon goes to the friend who stands below.

**In an empty scene, with no goal.** A handful of plain balloons bob in an open sky over one inflatable friend who reaches up.

- *When the finger lands*, in that frame: the balloon squashes flat under the finger with a rubber squeak, its string whips, and its neighbours bob away from it. The squeak is higher for a small squash and lower for a slow, long press. Nothing waits for the lift.
- *When the finger lifts* (or slides off, which counts the same): the balloon springs back past round, lets go of the sky and swoops down to the friend in an arc, with a rising whistle. A new balloon drifts into the empty place.
- *The chain.* The friend follows the balloon with its eyes, hops, and catches the string: a boing, a squash, and the balloon tugs its arm up and bobs above its head. A second balloon is one too many: the friend catches it as well, is lifted off its feet, paddles in the air, lets the extra go, and plops back down with a deep squash and a wobble, while the escaped balloon zooms off and pops.
- *Popping.* A tap on a balloon a friend holds pops it at once: a snap, a puff of the balloon's colour, the string falls, and the friend jumps and looks at its empty hand. Then it reaches up again.
- *The friend itself* squeaks and wobbles like a pool toy when poked, each kind at its own pitch.

**Why repeating it is a pleasure.** Each tap is a squeeze that squeaks and then a flight that ends in a catch, a lift-off or a pop, so one touch sets off three or four things, and the same three taps (give, give, pop) never play out quite alike. Random tapping always does something funny and never anything bad: the simplest use, tapping any balloon, always works. A person watching sees within three seconds that the child is handing balloons to the friend (pack: game-design, toy-first.md; pack: game-design, touch-answers-bigger-than-the-touch.md).

## The object-by-action grid, and what is new on day 15

Four kinds of friend come by, alone, in a pair or in three: the duck, the frog, the hippo and the crab. The rows are what the child sends or touches, the columns are who it meets. Every cell looks and sounds different, because every kind has its own catch, its own refusal, its own lift-off and its own squeak. The wrong use is in rows 2, 4 and 5, and it always works.

| | Duck | Frog | Hippo | Crab | A troop that already has its balloons |
| --- | --- | --- | --- | --- | --- |
| **1. A balloon of its own colour** | Flaps up and catches the string in its beak, tail wagging; a high boing | Shoots its tongue out and reels the string in; a wet twang | Yawns wide and the string drops in; a low honk | Snips the string out of the air with a click and holds it high | Row 4 happens: there is no free friend, so it is one too many |
| **2. A balloon of another colour** | Turns its back and swats it away with its tail; it pops on the grass | Puffs its throat and bounces it off; boing, then pop | Sneezes it away; it zooms off going flat with a raspberry and never pops | Pinches it by mistake; pop, and its eyes shoot up on their stalks | Each kind still refuses in its own way |
| **3. A bunch with one for each friend** | Every duck jumps at once and each comes down with one; three boings in a run | The tongues cross in the air and each brings one home | They yawn in a row, one after another | They snip in a row like scissors | Row 4 |
| **4. More balloons than friends without one** | The one that grabs is carried up flapping, lets go, and lands on its bottom | Hangs on by its tongue, legs stretched long, lets go and bounces twice | Only its toes leave the ground; the string strains, slips, and the hippo sits down so hard the clouds bounce | Spins like a propeller on the way up and comes down sideways | The same lift-off, for fun, as often as the child likes |
| **5. A tap on a balloon it holds** | Pop: it leaps straight up and sits down | Pop: its throat goes flat with a croak, then puffs up again | Pop: it does not notice for a beat, then looks up slowly | Pop: it hides its eyes, then peeks | The friend reaches up again and can be given another |
| **6. A poke at the friend itself** | A high squeak and a tail wag | A double squeak and a hop on the spot | A long low squeak and a belly wobble | Two clicks and a sideways shuffle | The same, with its balloon bobbing along |

Beyond the grid, everything that looks touchable answers: a cloud squeaks and sheds a few drops, the waiting troop wave when poked, the hill dimples.

**Day 15.** The child knows what each kind does with the wrong colour and causes it on purpose (the hippo's sneeze, the crab's snip), has found that the three-bunch serves three friends in one touch, and pops a held balloon to play a catch again; the last few troops they served are still marching on the far hill, with the balloons they were given.

(pack: game-design, depth-from-combinations.md; pack: game-design, liveliness-from-causing-and-comedy.md)

## The representation

Two ideas, each in the objects before any game was put round them.

- **Alike and unlike in one attribute.** A friend is one flat colour all over, and a balloon is one flat colour all over, in the same material. The balloon the child sends ends beside the friend's body, so the two colours are seen side by side at the moment the friend answers. Nothing else about a balloon varies: one shape, one size, no face, no pattern. Colour is the only attribute the game sorts by, at every position.
- **A small set, and one for each.** The amount asked for is the friends themselves: one, two or three whole bodies of the same kind standing in a row, each reaching up with empty hands. The amount on offer is a bunch: one, two or three balloons of one colour, drawn close together with their strings gathered in one knot, always in the same arrangement (one; two side by side; three as a triangle). A balloon that is taken hangs on a string above the friend who holds it, so the finished set is read as one balloon over each friend, and a friend without one still has its arms up.

The balloons are the working pieces and stay plain, on an open sky of a hue no balloon has. The look, the comedy and the motion are in the friends, the setting and what happens after the catch (pack: game-design, working-objects-stay-plain.md).

**What is behind it.** Sorting by one visible attribute and one-to-one matching as a kind act ("one for each") are what the pack's table gives for ages 2 to 4, and seeing a small group and taking that many at once is its mechanic for seeing an amount at a glance; the table rests those on school practice and on secondary sources, not on a trial of this representation, and it places the at-a-glance mechanic at ages 4 to 6, so in this band it is offered and never required. No trial stands behind the game's own choices: bodies as the amount asked for, and a fixed arrangement for each bunch (pack: game-design, representation-before-game.md).

**Where the order stops.** Object only. The band starts below 6, so there is no picture stage that stands for an amount and no symbol stage: no dots, tallies, fingers or numerals anywhere (pack: game-design, fade-to-school-symbols.md).

## The four mechanic questions

- **Swap.** No: the play is choosing by colour and by how many, and with other content there would be nothing left to choose; only the friends and the balloons, which carry no content, could be swapped for other things of one colour.
- **Attention.** At the moment of decision the child looks at the friends (what colour they are, and how many still reach up with empty hands) and at the balloons (what colour, and how many in the bunch); where and when the finger lands does not matter, since every balloon is big, still enough and never leaves.
- **Fun.** Yes: the choice is the tap, and the tap is the squeak, the flight and the catch, so the skill is used in the liveliest moment and play never stops for it.
- **Guess.** A cycle can always be finished by trying, because nothing at this age may dead-end, but a guess is seen: a balloon of the wrong colour is refused and a bunch that is too big gets away, each in a way that shows why, so tapping at random gives a noisy cycle and choosing gives a clean one, and the two do not look alike.

(pack: game-design, the-mechanic-is-the-school-skill.md)

## The error as a consequence

There are two ways to be wrong, and one way to be not yet done. None is a verdict, nothing is lost, and the troop and the sky stay as they were.

- **Another colour.** The balloon arrives and hangs for a beat against the friend's body, the two colours side by side. The friend looks from one to the other and refuses it in the way its kind always does (the grid, row 2). Where: at the friend, on the balloon. Why: the two colours, held together, are not the same. The friend still reaches up, and a balloon like the one that went drifts back into its place in the sky.
- **Too many.** Every friend without a balloon takes one from the bunch, and a balloon is left over above the knot with nobody under it. The bunch is still tied together, so it carries the friend who holds on off the ground; the friend lets go, the whole bunch gets away, and the friends come down with what they had before (the grid, row 4). Where: the balloon with no friend under it. Why: more balloons than friends who wanted one. The same bunch drifts back into its place.
- **Not yet enough.** A bunch smaller than the troop is taken, one each, and the friends still without one keep reaching. This is not an error: the child adds to it.

The child changes one thing, the colour or the size of the bunch, and tries again. A catch is a consequence too: the friend holds the balloon and is plainly pleased with the balloon, never with the child. The refusals are at their fullest in the first two positions, where colour is new; from the position where bunches arrive the refusal is shorter and the lift-off is the long one (pack: game-design, errors-show-as-consequences.md).

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
