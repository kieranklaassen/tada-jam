<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 2 to 4, so a two-year-old governs every choice.

- **Cue table.** The table in the jam's wordless-clarity convention has no row below 3. Its 3 to 4 row is taken as the ceiling and cut further: one live activity, one next act on offer, a ghost hand that shows one move, a breathing glow on what can be touched, and characters that gaze and reach. Its "Avoid" column binds as written: no text, numeral or picture that must be decoded, no spoken instruction, no verdict, never several activities at once, and no tool on screen before it means something.
- **The pack's rule for the age** (pack: game-design, ages-2-to-4.md). Everything essential is a tap. A tap that smears into a short drag counts as the tap. No pinch, tilt, shake or double tap. On an iPad held wide, everything the child needs to touch is at least about 100 logical pixels across: every balloon, every friend of the troop in front, and the place of the troop that waits, which stands back, is drawn smaller and is touched as one thing. Held upright they still are. On a phone held wide they are smaller, a balloon about 64, and all above the jam's floor of 48. The troops on the far hill are small with distance, and answer a touch as the scenery does. The things to touch stand well apart, and none sits in the bottom strip where wrists rest. Whatever looks touchable answers a touch. One action, sending a balloon, is offered again and again. A cycle (one troop of friends served) takes well under a minute, and a visit of one to three minutes holds several. No set on screen is larger than three.
- **Symbols.** The band starts below 6: no word, letter, numeral or symbol on the kid side, optional or not, and no `symbols.ts`. No voice speaks; the friends have invented, synthesized squeaks.
- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order: 2 or younger starts at `solo-two-colours`, 3 at `solo-three-colours`, 4 or older at `pair-singles`. No age (`null`) takes the youngest start. A saved position always wins, age never hides or locks anything, and every position is reached by play from every start.

## The toy

**The action.** The finger taps a balloon that floats in the sky, and the balloon goes to the friend who stands below.

**In an empty scene, with no goal.** A handful of plain balloons bob in an open sky over one inflatable friend who reaches up.

- *When the finger lands*, in that frame: the balloon squashes flat under the finger with a rubber squeak, its string whips, and its neighbours bob away from it. The squeak is lower the more balloons are under the finger. Nothing waits for the lift.
- *When the finger lifts* (or slides off, which counts the same): the balloon springs back past round, lets go of the sky and swoops down to the friend in an arc, with a rising whistle. A new balloon drifts into the empty place.
- *The chain.* The friend follows the balloon with its eyes, hops, and catches the string: a boing, a squash, and the balloon tugs its arm up and bobs above its head. A second balloon is one too many: the friend catches it as well, is lifted off its feet, paddles in the air, lets the extra go, and plops back down with a deep squash and a wobble, while the escaped balloon zooms off and pops.
- *Popping.* A tap on a balloon a friend holds pops it at once: a snap, a puff of the balloon's colour, the string gone with it, and the friend jumps and looks at its empty hand. Then it reaches up again.
- *The friend itself* squeaks and wobbles like a pool toy when poked, each kind at its own pitch.

**Why repeating it is a pleasure.** Each tap is a squeeze that squeaks and then a flight that ends in a catch, a lift-off or a pop, so one touch sets off three or four things, and the same three taps (give, give, pop) never play out quite alike. Random tapping always does something funny and never anything bad: the simplest use, tapping any balloon, always works. A person watching sees within three seconds that the child is handing balloons to the friend (pack: game-design, toy-first.md; pack: game-design, touch-answers-bigger-than-the-touch.md).

## The object-by-action grid, and what is new on day 15

Four kinds of friend come by, alone, in a pair or in three: the duck, the frog, the hippo and the crab. The rows are what the child sends or touches, the columns are who it meets. Every cell looks and sounds different, because every kind has its own catch, its own refusal, its own lift-off and its own squeak. The wrong use is in rows 2, 4 and 5, and it always works.

| | Duck | Frog | Hippo | Crab | A troop that already has its balloons |
| --- | --- | --- | --- | --- | --- |
| **1. A balloon of its own colour** | Flaps up and catches the string in its beak, tail wagging; a high boing | Shoots its tongue out and reels the string in; a wet twang | Yawns wide and the string drops in; a low honk | Snips the string out of the air with a click and holds it high | The nearest friend catches it in its other hand and does its kind's lift-off alone, a balloon in each hand; the two balloons rub together in a long rubbery squeal |
| **2. A balloon of another colour** | Turns its back and swats it away with its tail; a slap, and it pops beside it | Puffs its throat and bounces it off; boing, then pop | Sneezes it away; it zooms off going flat with a raspberry and never pops | Pinches it by mistake; a snip and a pop together, and its eyes shoot up on their stalks with a ping | Its kind's refusal knocks the balloon it already holds, which swings round on its string and bumps it on the head; a hollow bonk |
| **3. A bunch with one for each friend** | Every duck jumps at once and each comes down with one; three boings in a run | The tongues cross in the air and each brings one home; wet twangs on top of one another, then a slurp | They yawn in a row, one after another; honks stepping down from high to low | They snip in a row like scissors; a quick run of clicks | Every friend grabs one more and the whole troop does its kind's lift-off at the same moment; the squeaks climb a scale together and the landings come one after another |
| **4. More balloons than friends without one** | The one that grabs is carried up flapping, lets go, and lands on its bottom; a flurry of wing-flaps and a soft bump | Hangs on by its tongue, legs stretched long, lets go and bounces twice; a rising slide-whistle and two boings | Only its toes leave the ground; the string strains with a rising creak, slips, and the hippo sits down so hard the clouds bounce; a deep thud | Spins like a propeller on the way up and comes down sideways; a whirr that climbs and a clatter of legs | When the bunch is bigger than the whole troop, the spare balloons bump the cloud on their way out and it sheds its drops on the troop; a squeak from the cloud and a patter of drops |
| **5. A tap on a balloon it holds** | Pop: it leaps straight up and sits down; a startled peep | Pop: its throat goes flat with a croak, then puffs up again | Pop: it does not notice for a beat, then looks up slowly; a long low hum that rises at the end | Pop: it hides its eyes, then peeks; a scuttle of feet, then one small blip | Pop: its kind's own start, then the troop stops swaying with a squeak of heels and looks at the empty hand; the friend reaches up again and can be given another |
| **6. A poke at the friend itself** | A high squeak and a tail wag | A double squeak and a hop on the spot | A long low squeak and a belly wobble | Two clicks and a sideways shuffle | Its kind's own squeak, and the balloon it holds bobs along on its string, which hums like a plucked rubber band |

Beyond the grid, everything that looks touchable answers: a cloud squeaks and sheds a few drops, the waiting troop wave when poked, the hill dimples.

**Day 15.** The child knows what each kind does with the wrong colour and causes it on purpose (the hippo's sneeze, the crab's snip), has found that the three-bunch serves three friends in one touch, and pops a held balloon to play a catch again; the last few troops they served are still marching on the far hill, with the balloons they were given.

(pack: game-design, depth-from-combinations.md; pack: game-design, liveliness-from-causing-and-comedy.md)

## The representation

Two ideas, each in the objects before any game was put round them.

- **Alike and unlike in one attribute.** A friend is one flat colour all over, and a balloon is one flat colour all over, in the same material. A balloon of another colour hangs beside the friend's body for a beat, so the two colours are seen side by side at the moment the friend refuses it; one of the friend's own colour ends above its head on its string. Nothing else about a balloon varies: one shape, one size, no face, no pattern. Colour is the only attribute the game sorts by, at every position.
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
- **Too many.** The first friend without a balloon takes hold of the bunch, and there is a balloon in it with nobody under it. The bunch is still tied together, so it carries the friend who holds on off the ground; the friend lets go, the whole bunch gets away, and the friends come down with what they had before (the grid, row 4). Where: the balloon with no friend under it. Why: more balloons than friends who wanted one. The same bunch drifts back into its place.
- **Not yet enough.** A bunch smaller than the troop is taken, one each, and the friends still without one keep reaching. This is not an error: the child adds to it.

The child changes one thing, the colour or the size of the bunch, and tries again. A catch is a consequence too: the friend holds the balloon and is plainly pleased with the balloon, never with the child. The refusals are at their fullest in the first two positions, where colour is new; from the position where bunches arrive the refusal is shorter and the lift-off is the long one (pack: game-design, errors-show-as-consequences.md).

## The designed order, and what is stored

**Words.** A *troop* is one, two or three friends of one kind who come by together. A *bunch* is one, two or three balloons of one colour tied in one knot; a single balloon is a bunch of one. A *cycle* is one troop served: it ends when every friend of the troop holds a balloon.

**One rule at every position.** A bunch the child sends is refused when it is not the troop's colour. Otherwise it is taken, one balloon each, when it holds no more balloons than there are friends without one, and it gets away when it holds more. The rule never changes, so what a child finds out stays true.

**The order**, one new thing at a time and then combinations. The ids are the ones in `LADDER` in `config.ts`; each names a place in this order and nothing else.

| Id | The troop | The sky | What is new |
| --- | --- | --- | --- |
| `solo-two-colours` | One friend | Four single balloons in two colours, two of them the friend's | Colour, against one other |
| `solo-three-colours` | One friend | Five single balloons in three colours, two of them the friend's | A third colour |
| `pair-singles` | Two friends | Five single balloons in three colours | One for each, given one at a time |
| `trio-singles` | One, two or three friends | Five single balloons in three colours | Three, and a troop whose size changes |
| `bunches-own-colour` | One, two or three friends | Three bunches of one, two and three, all in the troop's colour | Bunches: the number alone decides |
| `bunches-mixed` | One, two or three friends | Four bunches: a single and a larger one in the troop's colour, and two in other colours, one of them as large as the troop | Colour and number together |

A single balloon of the troop's colour is in every sky, so a cycle can always be finished one balloon at a time and nothing dead-ends. Whatever leaves the sky is replaced by the same bunch in the same place: the sky stays as it was for the whole cycle.

**The harder option the child can see and pick.** From `bunches-own-colour` on, a bigger bunch hangs beside the single. It looks like more, it can serve the whole troop in one touch, and it can also get away. The child may always take the single instead.

**How a cycle is judged.** By what the child sent before the troop was served: no bunch refused and none that got away is a cycle that went *well*; one is *mixed*; two or more is one that went *badly*. A balloon the child pops, and anything sent after the troop is served, is play and is not judged. The position moves one step up after a cycle that went well, one step down after one that went badly, and not at all after a mixed one, between cycles only. A visit put away with no finished cycle leaves it where it was. Nothing on screen shows the position or that it moved, and no clock is read.

**Which troop a new position lays out.** While the child serves one troop, the next already waits at the edge, so its kind and size were laid out before the cycle was judged. A new position therefore lays out the sky of the next troop, at the moment that troop steps in, and the size of the troop after next. Every sky above works for a troop of any size, so a troop laid out under one position is always playable under its neighbour.

**What is stored**, every field, as small plain JSON with a version, read defensively field by field:

- `v`: the version of the save.
- `position`: an id from the order above. An id the game does not know falls back to the first-visit default.
- `finished`: the troop on screen has been served and its cycle judged; both are stored in one save, when the finger lifts on the bunch that serves the last friend. On load its ending does not replay. In play the ending plays again each time the troop is filled again after a pop, and the cycle is not judged a second time. The next troop comes in on the child's touch.
- `troop`: the troop on screen: its kind, its size, and for each friend whether it holds a balloon.
- `sky`: the bunches on offer, in their places: for each its colour and how many balloons.
- `next`: the troop that waits at the edge: its kind and its size.
- `slips`: how many bunches were refused or got away in the cycle on screen, kept only up to two and set back to none with each new troop. It is what lets a cycle be judged after a put-away in the middle. It is never shown and never added up over cycles.
- `parade`: the last four troops served, for the far hill: for each its kind, its size and how many balloons it carried off.
- `shown`: three marks, one for each first showing that has played (see "The scenes").
- `rng`: the state of the seeded stream that lays out troops and skies, so the same save always goes on in the same way.

A balloon in flight is not stored: the outcome of a tap is decided and stored when the finger lifts, and the flight is a view of it. A scene's outcome is stored when the scene starts. The largest legal save is a few hundred bytes, and a test holds it under half the 64 KB cap.

(pack: game-design, ordered-challenges-high-success.md; pack: game-design, many-short-visits.md; pack: game-design, the-world-keeps-and-waits.md)

## The characters and their fixed tastes

Each kind is one colour all over and takes only balloons of that colour: this is the taste that never changes, and it is on the friend's body for the child to see. Each friend wants one balloon and no more, and shows it the same way every time: both arms up and eyes on the sky while it has none; one hand up on the string and eyes on its balloon once it has one.

| Kind | Colour | Tempo and weight | Funniest part | Likes (its own colour) | Dislikes (any other colour) | Too many |
| --- | --- | --- | --- | --- | --- | --- |
| Duck | Yellow | Quick and light, waddles | The tail | Catches in its beak, wags | Swats it away with its tail | Carried up flapping, lands on its bottom |
| Frog | Green | Still, then a sudden spring | The tongue and the throat | Reels it in with its tongue | Bounces it off its puffed throat | Hangs by its tongue, legs stretched long |
| Hippo | Violet | Slow and very heavy | The belly | Yawns and lets the string drop in | Sneezes it away, flat and raspberrying | Only its toes lift; it sits down and the clouds bounce |
| Crab | Coral red | Fast, sideways, stop and go | The eyes on stalks | Snips the string from the air | Pinches it by mistake, eyes shoot up | Spins like a propeller |

- A refusal is as good to watch as a catch, and it is about the balloon: the friend is put out by the colour, startled by the pop, bewildered by the lift-off, and never hurt.
- No friend has any feeling about the child. None thanks, praises, sulks or hurries, and the troop that waits at the edge only bobs and looks at the balloons.
- A reaction starts as the balloon arrives, well inside half a second of the tap, and is big enough to read from across a room. A friend gives one answer at a time: a bunch sent to one that is still in the middle of an answer leaves the sky at once and comes down when the friend is free.
- No two kinds share a motion: each has its own walk, catch, refusal, lift-off, pop reaction and squeak (step 6 of the guide).

(pack: game-design, characters-with-opinions.md)

## The scenes

Three short scenes, each a list of timed beats on the template's `scene.ts`, filled in from the state of play. Each one's outcome is stored when it starts, any touch ends it with every beat at its end state, and that touch is then an ordinary touch.

**1. The march on the spot (the ending of a cycle).** *Cause:* the last friend of the troop takes its balloon; the scene plays each time that happens, also when a troop already served is filled again after a pop. *Beats, 5 to 7 seconds:* each friend in turn does its kind's own proud move with its balloon, in the order the balloons were taken; the troop marches three squeaky steps on the spot together; the balloons bob up in a wave from one end to the other; the troop settles, swaying, each friend looking up at its balloon. *Filled in from:* the kind, the size of the troop, and whether the balloons came one at a time (the friends take turns) or as one bunch (they jump together); the order of taking is short-lived and is not stored, so after a load the friends who already held a balloon go first, in the order they stand, and those served since follow in the order they were served. *Saved at the start,* which is the moment the finger lifts on the bunch that serves the last friend, before its flight is drawn: the first time for a troop, `finished` and `position` (the cycle is judged from `slips` at that moment), in the same save as `troop`; a later playing for the same troop saves `troop` and nothing more. *After it:* the troop stays as it is for as long as the child likes.

**2. The step-in (how the next cycle starts).** *Cause:* the child taps the troop that waits at the edge, once the troop on screen has been served. *Beats, about 3 seconds:* the served troop marches off towards the far hill with its balloons, where the last four troops go round in a slow parade; the waiting troop walks in in its own gait and reaches up; a new troop comes to the edge; the sky fills with the next bunches. *Filled in from:* the kinds and sizes of the two troops, the balloons the served troop still holds, and the position. *Saved at the start:* `parade` (the served troop joins with the balloons it holds, and the oldest of five leaves), `troop` (the troop from `next`, every hand empty), `next` (the new troop), `sky` (the next bunches), `slips` (none), `finished` (false), `rng`, and, when a first showing plays inside it, that mark in `shown`. A tap on the waiting troop before the troop on screen is served makes it wave and nothing else.

**3. The pass-by (the first showing of a new idea).** *Cause:* a new idea arrives, three times in all, each shown once and marked in `shown`: handing a balloon to a friend of its colour (a new game), one for each (the first pair), and a bunch for a whole troop (the first bunches). *Beats, 4 to 6 seconds:* a troop of a kind other than the child's crosses the scene, stops under a balloon or a bunch that hangs low for it, takes it in its kind's way, and goes on over the far hill and out of sight. *Filled in from:* which idea, and the kinds on screen, since the troop that passes is never the kind the child is about to serve, so what is shown is the move and not the answer to the child's own troop. *Saved at the start:* its mark in `shown` and nothing else; the troop that passes and the balloon or bunch that hangs low for it are short-lived, are worked out from the idea and the kinds on screen, draw nothing from `rng`, are no part of `sky` or `parade`, and are gone on load. The first one is already crossing when a new game opens, so something is going on from the first frame; when a new game opens on a pair, which is the first visit of a child of 4 or older, the troop that crosses is a pair and each of the two takes one balloon, so the first two ideas are shown in that one crossing and both marks are set. Every first showing that does not play at the opening plays inside the step-in at which its idea arrives, before the child's troop walks in. (pack: game-design, guided-discovery.md)

**How a cycle ends and restarts.** It ends when the troop is served, with scene 1. Nothing follows by itself: no next round, no countdown, and the troop at the edge never complains or beckons. The child starts the next cycle by tapping the waiting troop. On load no scene replays: a served troop is found standing with its balloons, an unserved one reaching up, the same bunches in the sky, the same troop at the edge and the same parade on the far hill (pack: game-design, endings-and-short-scenes.md; "How a cycle restarts" and "Found as left" in the guide).

## The records

Read from the education pack with its lookup on 2026-10-03. What each record asks is given in the pack's Summary or in the game's own words.

### us-ca

Levels, as the lookup prints them: age 2 is `infant-toddler`, sub-band the indicator for 23 through 36 months; age 3 is `preschool-tk`, sub-band Early (3 to 4 ½ Years); age 4 is `preschool-tk`, Early and Later, where both statements of a foundation apply. Age mapping: official. Gap: none printed.

- `edu.us-ca.infant-toddler.mathematics.objective.cognitive-development-strand-2-0-emergent-mathematical-thinking-2-3` (`us-ca 2.3`, Infant–Toddler Learning and Development Foundations, Cognitive Development, Strand 2.0): department-published-foundation, confirmed. From the pack's Summary: by 23 to 36 months, children put objects into at least two groups according to how they are alike or different in a single attribute, with function, shape, size and colour given as examples.
  Limits taken: one attribute at a time; two or more groups, with no upper number; it describes what children typically show, not a requirement on a child. Left open by Limits: which attribute (colour is an example, and is the game's choice); naming the groups happens only sometimes, so the game asks for no colour word. The game's own narrowing: a troop is one colour, so in one cycle the child makes two groups only, the balloons the troop takes and the balloons it leaves or sends back, and never deals balloons out between friends of different colours; groups of other colours come one troop after another.
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-2-0-operations-and-algebraic-thinking-2-5` (`us-ca 2.5`, Preschool/Transitional Kindergarten Learning Foundations: Mathematics, Strand 2.0): department-published-foundation, confirmed. From the pack's Summary: at the earlier age, a child notices how objects are alike and how they differ in their attributes, and sorts them into at least two groups using a single attribute.
  Limits taken: the earlier statement, one attribute and two or more groups, at every position. Left open by Limits: no attribute is named, so colour is the game's choice. Not used: the later statement's more than one attribute. The game's own narrowing: as for `us-ca 2.3`, in one cycle the two groups are the troop's colour and the rest.
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-1-0-counting-and-cardinality-1-4` (`us-ca 1.4`, the same foundations, Strand 1.0): department-published-foundation, confirmed. From the pack's Summary: a child tells how many things are in a little group just by looking, with no counting; at the earlier age the group is described as small, with one to four things given as an example of small.
  Limits taken: from the earlier statement, a small group, seen without counting. The game's sets are one to three, inside the example the earlier statement gives; stopping at three is the game's own choice. Not used: the later statement's range of one to five. Left open by Limits: how the things are arranged (the fixed arrangement of a bunch is the game's choice). Short of the record: the record is about telling how many, and the game has no number word, so the child shows it only by which bunch they pick.
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-1-0-counting-and-cardinality-1-6` (`us-ca 1.6`, the same foundations, Strand 1.0): department-published-foundation, confirmed. From the pack's Summary: a child looks at two sets of things and tells how they compare in number; at the earlier age the two sets are plainly equal or plainly unequal, and the child may count or not.
  Limits taken: two groups only (the friends without a balloon, and the balloons in one bunch); from the earlier statement, groups that are clearly equal or clearly different, with counting optional. Not used: the later statement's comparing by counting and its words for the smaller group. Left open by Limits: no number range, so one to three is the game's choice. Not in Limits: whether two sets of at most three that differ by one count as clearly different; treating them so is the game's own choice. Short of the record: the game asks for no word such as "same" or "more".

Amounts at age 2: the game names no record. The infant-toddler lane's record on number (`us-ca 2.1` of the same strand) is about number words and the count list, and the game has neither, so nothing is named in its place. At age 2 the game rests on `us-ca 2.3` alone.

One for each: the game names no California record for pairing one thing with each of another. `us-ca 1.6` is named for comparing the two sets, the friends without a balloon and the balloons in a bunch, and for nothing more.

### nl

Levels, as the lookup prints them: ages 2 and 3 are `peuters`; age 4 is `peuters`, up to the fourth birthday, and `fase-1`, sub-band groep 1. Age mapping: convention. At age 4 the lookup also returns the `einde-po` lane, labelled end-of-primary goals; the game uses no record from it. Gap: none printed.

- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-meten-meetkunde-meetkunde-opereren-met-vormen-en-figuren-1` (`nl` Opereren met vormen en figuren / 1, peuter card): curriculum-institute-guidance, confirmed. In the game's words: finding out what things are like, colour being one of the examples, and sorting them by one property.
  Limits taken: an offer to children of about 2 to 4, not what a child must be able to do; one property, and two at once is not mentioned. Left open by Limits: no number of objects or groups; the properties in brackets are examples, so colour is the game's choice.
- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-getallen-getalbegrip-hoeveelheden-6` (`nl` Hoeveelheden / 6, peuter card): curriculum-institute-guidance, confirmed. In the game's words: knowing a small group of two or three for what it is without counting.
  Limits taken: groups of 2 or 3 and no larger; without counting; an offer, not a requirement. Left open by Limits: the arrangement (the game's choice). Beyond the record: a set of one is not in it and is the game's own choice.
- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-getallen-getalbegrip-hoeveelheden-3` (`nl` Hoeveelheden / 3, peuter card): curriculum-institute-guidance, confirmed. In the game's words: making one-to-one pairs by putting or tying one thing with each other thing.
  Limits taken: pairing by coupling, laying together or connecting (in the game a string connects one balloon to one friend); no counting and no number word is asked; an offer, not a requirement. Left open by Limits: no number of objects, so up to three is the game's choice.
- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-getallen-getalbegrip-hoeveelheden-4` (`nl` Hoeveelheden / 4, peuter card): curriculum-institute-guidance, confirmed. In the game's words: comparing small amounts by eye.
  Limits taken: small amounts compared by eye; counting is not named as a way to compare; an offer, not a requirement. Left open by Limits: no number for "small", so one to three is the game's choice. Not used: larger amounts with a large difference, and making equal rows.
- `edu.nl.fase-1.mathematics.objective.inhoudskaart-rekenen-wiskunde-fase-1-meten-meetkunde-meetkunde-opereren-met-vormen-en-figuren-1` (`nl` Opereren met vormen en figuren / 1, fase 1 card): curriculum-institute-guidance, confirmed. In the game's words: sorting things by one attribute or by more than one.
  Limits taken: what a school offers in fase 1, with no year stated, not what a child must be able to do; the game takes one attribute only. Left open by Limits: no attribute is named, so colour is the game's choice. Not used: more than one attribute.

Not named: the peuter card's statement on counting small amounts (Hoeveelheden / 1). The game has no number words and never asks for a count, so its verb does not rest on that record. Not named either: the fase 1 card's statements on amounts (the bullets under Hoeveelheden (tot tenminste 20)). For amounts the game is designed from the peuter card alone, which the lookup returns at age 4 only up to the fourth birthday; for a four-year-old in groep 1 those three records are from the level below the child's own, and the limit of 2 or 3, which of the three only Hoeveelheden / 6 names, is taken from there.

### Where the two differ

- **A small group at a glance.** The California foundation (`us-ca 1.4`) starts at age 3: its earlier statement (3 to 4½ years) gives one to four as its example of small, and its later statement (4 to 5½ years) gives one to five as the range; the Dutch statement (`nl` Hoeveelheden / 6) is an offer for about 2 to 4 and names 2 or 3 only. The game's sets are one to three: at the top it follows the Dutch statement, and its set of one is inside the California example and outside the Dutch statement.
- **Amounts at age 2.** California's lane for age 2 has no record the game's handling of amounts rests on; the Dutch peuter card describes an offer that starts at about 2. The game follows California here, the narrower of the two: where a first visit starts for a two-year-old the troop is one friend, only colour decides, and at no position is an amount something a child has to get right before a cycle can be finished.
- **One for each.** The Dutch peuter card has a statement on one-to-one pairing (`nl` Hoeveelheden / 3); no California record is named for it. The game follows the Dutch statement: a string ties one balloon to one friend.
- **More than one attribute.** The California later statement (`us-ca 2.5`, 4 to 5½ years) and the Dutch fase 1 statement allow more than one attribute; the California earlier statement, `us-ca 2.3` and the Dutch peuter statement name one. This difference lies between the earlier and the later statements inside each jurisdiction, not between the two: in each the game follows the statement that names one attribute, and it sorts by one attribute at every position. At `bunches-mixed` the colour and the number must both be right; the number is asked of the set and is not a second sorting attribute, and that combination is the game's own design, which no record is named for.
- **Standing.** The California records are foundations published by a state department; the Dutch records are guidance from the curriculum institute. Neither is a standard or the law, and the claim names each as what it is. Nothing in the play depends on this difference.

### The claim

Balloon Pop Parade is designed from four California learning foundations published by a state department, which are foundations and not standards: `us-ca 2.3` of the infant-toddler foundations, and, each in part, `us-ca 2.5`, `1.4` and `1.6` of the preschool and transitional kindergarten mathematics foundations (of `2.5` the earlier statement's sorting by one attribute, and not the later statement's more than one; of `1.4` seeing a small set without counting, and not telling how many; of `1.6` comparing two sets that are plainly equal or plainly unequal, and not the words for it or the later statement's comparing by counting). It is also designed from five statements of Dutch curriculum-institute guidance, which is guidance and not law: Opereren met vormen en figuren / 1 and Hoeveelheden / 3 and 6 of the peuter card; in part Hoeveelheden / 4 of the peuter card, of which it takes small amounts compared by eye, and not larger amounts or equal rows; and in part Opereren met vormen en figuren / 1 of the fase 1 card, of which it takes sorting by one attribute, and not by more than one. All nine records are confirmed. Sorting by one attribute is taken from both jurisdictions at every age of the band. Seeing a small set at a glance and comparing two small sets are taken from the Dutch peuter card and, from age 3, from the California preschool foundations; for age 2 no California record is named for them. Giving one for each is taken from the Dutch peuter card alone; no California record is named for it.

## The look

**Inflatable vinyl toys**, the first look reserved for the game in the ledger of `docs/art-direction.md`. Everything on screen is a pool toy in daylight: puffy pillow forms with welded seams and a valve, a broad soft sheen, and a pale rim where the skin turns away, in pool-toy colours against an open sky. Nothing is hard-edged, matte, dim or lit by a lamp.

### Palette (`palette.ts`)

- **The four hues.** Duck `#ffcc1f`, frog `#1fc48d`, hippo `#8b5cf6`, crab `#ee3345`. A friend is that one flat colour all over and its balloons are exactly that colour: its beak, belly, feet and claw tips too, which are told from the trunk by their shape and the sheen on them, never by a second shade. What is printed on a friend is in ink (`#22203a`): its eyes, with a white shine, its nostrils, the line of its mouth and the inside of it. The valve is white. Tests hold the hues more than 45 degrees apart round the wheel, hold every one away from the sky's hue and darker than the sky, and hold the frog and the crab apart in lightness for a child who mixes red and green.
- **The sky** runs from `#aee4f4` at the top to `#effbff` at the horizon. It is the plain surface the working pieces sit on: paler than any balloon and no balloon's hue.
- **The hill** the friends stand on is a pink air bed (`#ffd3df`) with welded ribs across it, and the far hill is a paler haze (`#f3cde2`). The friends stand on the hill's top with the sky behind them, so the hill is under their feet and never behind their bodies.
- **Clouds** are white pillows, kept below the row of balloons so nothing stands behind a balloon but sky.

### Materials (`vinyl.ts`)

One material for everything but the sky, the strings and the shadows. It reads no three.js light and is not see-through. Each fragment gets a soft wrapped shade that stays in the toy's own hue, a broad pale sheen with a small bright core, a lighter rim that reads as light through the edge, and welded seams drawn from the form's own UVs as a dark groove with a pale lip. The vertex shader breathes the skin a little along its normal. The base colour is in the vertices, times the instance colour for balloons. No texture, no light, no shadow map and no post pass.

- **Forms** (`shapes.ts`, `bodies.ts`). Every form is a pillow: a sphere pulled into an ellipsoid. A friend is about a dozen pillows merged into six meshes, one per part that moves by itself (trunk, head, eyes, two arms, and its funniest part), which makes six draws a friend. The hippo has a seventh: its lower jaw, which drops on a hinge at the back of its mouth when it yawns and shows a lining of its own hue, darker. A trunk has six welded panels, so one seam runs down its front; the crab's shell has eight, so the seams fall either side of its smile and none runs through it, since a bar across a line would read as a sign. For the same reason neither half of the hippo's muzzle has a seam: one down the middle would cross the line of its mouth. And the crab's mouth and the frog's are each two short pieces that meet low in the middle and turn up at the ends, a curve, where one straight bar could be taken for a sign.
- **Balloons** are the working pieces and stay plain: one shape, one size, one flat colour all over, knot and all, no seam, no face. On a surface smaller than the iPad held wide every balloon in front is drawn larger by the same amount, up to a quarter, so that each is still about a hundred logical pixels across and all are one size wherever they are (`balloon` in `layout.ts`). The row ends short of the top right corner, which is the grown-up's and answers no touch, wherever the top of a bunch would stand as high as that corner. All of them, in the sky, in a hand, in flight and on the far hill, are one instanced draw, and so are the scraps of a pop and the drops of a cloud, which are drawn from the same form made small. Strings are a second, in a darker shade of their balloon, and blob shadows a third, each a soft disc tinted with the colour of the toy above it.

### Lighting

Daylight from up, left and in front, fixed in view space, so every form is lit the same way wherever it turns. Shadows on the forms are their own hue made darker and a little bluer, never grey. The only cast shadow is the blob under each friend, which shrinks as the friend leaves the ground; the dimple a touch leaves in the hill is the same soft disc.

### Motion (`clips.ts`, `theatre.ts`)

- Everything is air under vinyl: a touch squashes it, letting go springs it back past round, and it wobbles before it settles. Nothing stops dead. A squashed friend spreads by half of what its volume would ask, so it never pushes into the friend beside it.
- A balloon squashes flat under the finger the moment the finger lands, swoops down when the finger lifts, and a new one drifts into its place small and grows.
- Each kind has its own tempo, weight and funniest part, and no two share a motion: the duck is quick and light and its tail never stops; the frog is still and then sudden, with a throat that swells; the hippo is slow and heavy, with a belly that wobbles after everything; the crab goes sideways in stops and starts, with eyes on stalks. Each has nine motions (a catch, a refusal, being carried off, a start at a pop, two ways to take a poke, a wave, a proud move and a march) and its own gait, and tests fail when two kinds' motions, or two motions of one kind, come too close.
- A director keeps it from repeating: a poke is never taken the same way twice running, and a motion a touch starts never runs at quite the same speed twice. Both ways a kind takes a poke have what the sheet gives it: the duck's tail wags, the frog hops on the spot, the hippo's belly wobbles, the crab shuffles sideways.
- A consequence is drawn where it happens. A balloon the frog refuses is bounced off and flies from it for a moment before it pops. A bunch that is too many hangs with one balloon straight over the friend that grabbed it and the rest over the empty ground beside it. The balloons of a bunch bigger than the whole troop dart at the cloud over the troop, and it squashes and sheds in the step one reaches it. A held balloon knocked by a refusal comes round onto its friend's head as the bonk sounds. A troop that was carried off comes down one friend after another. A friend that is being carried off goes on being carried off whatever is sent to it meanwhile: a balloon of its own colour hangs beside its place and is caught when it has landed, and one of another colour hangs there and is refused then. One popped under it is answered where it hangs, with a wobble. The bunch that carries it can be popped like any balloon a friend holds, and then it falls from where it is. Whatever cuts a motion short, a friend falls or rises from where it is: it is never set on the ground between one frame and the next.
- A friend without a balloon reaches up with both arms; one with a balloon holds its string, lets its free arm down and looks at its balloon, which hangs on the child's right of it. The troop that waits keeps its arms down, and a friend without a balloon walks with both arms down and reaches up as it stops (the crab walks as it reaches, both claws up), so one arm up and one down is only ever a friend that has its balloon. A crab's claw cannot hang, since it is long enough to go through the hill: let down, it comes as far as it goes, low and out in front, so a crab with a balloon is told from one without as easily as any other kind. In everything else a crab does its claws stay up, and only one dips at a time.
- An arm comes round to the front as it is raised or let down, and a hand that holds a string stays up whatever else the friend does. A refusal goes to the side the bunch hangs on. All three are there so that no friend ever reaches into the one beside it.
- A friend gives one answer at a time. While it is carried off, refusing a bunch or taking a balloon, it owes the next answer and gives it when it is free: the bunch or the balloon waits where it is until then, and every answer is heard as it begins.
- A troop that one bunch served jumps together as its ending begins, each friend with its own proud move; one served a balloon at a time takes turns.
- A friend sees a bunch coming: from a fifth of a second after the touch it stretches up on its toes towards it, and its own answer begins from there. One that is in the air is touched where it is, and wobbles at a poke.
- Strings do not hang crossed: a balloon's string ends at its knot, or loose under it, until its friend takes it, and while a frog's tongue has a balloon the tongue is all that holds it. Two strings do cross for a moment while things move, as strings do: a crab that spins with one in each claw, a bunch pulled apart over a troop.
- Nothing is in two places from one frame to the next: a balloon goes on its string from the bunch it arrived in to the hand that takes it, from where it hung low to the hand of a friend that passes, and from where it arrived to where it hangs over a friend it carries off; a troop that walks has its balloons following on their strings; and a sky that is over drifts up and away.
- A bunch with one for each is taken at once by ducks and by frogs, whose tongues cross in the air on the way, and one after another by hippos, who yawn in a row with their mouths open, and crabs, who snip in a row. A frog's tongue is flung: it bows out and down like a thrown rope and ends in a fat pad, so two that cross are two bows and never two crossed bars. A frog that passes by takes its balloon with its tongue too. A frog that is carried off hangs from the bunch by its tongue.
- A head turns to what it looks at: to its own balloon, to the hand that held the string after a pop, to the friend whose balloon has popped (and the troop stands still while it looks), to the troop that waits.
- A troop that passed by is seen once more after it has left by the edge: small and far off, over the left shoulder of the far hill and down behind it, clear of the ring the parade walks.
- A troop that walks keeps its places: nobody passes anybody, and each turns the way it goes only as far as it can between its neighbours (the duck a long way, the frog and the hippo a little, the crab not at all).
- The balloons bob and the strings sway at rest; they do no more than that, since they are the working pieces.

### The far hill, the clouds and the ghost hand (`scenery.ts`, `layout.ts`)

- **The far hill** is a paler pillow a long way back and to the right. The last four troops the child served go round its top in single file with the balloons they carried off: whole toys in one geometry, one batch a kind, a little smaller than the friends in front, hazed towards the sky, with balloons a step paler than the ones in play and no strings, which at that distance would be a pixel wide and would cross the strings in front. A troop that is touched squeaks in its kind's voice, small and quiet, and jumps, and the others jump after it; a touch on the far hill itself gets a small far boing, and everyone on it jumps. The ring has four places and a troop keeps its own: when a fifth is served the oldest walks down the slope from its place and out of sight, and the newest comes up the same way to the place left free, so nobody appears, vanishes or jumps on the hill in plain sight.
- **The clouds** are three white pillows, far back and below the row of balloons. The smallest hangs over the troop. A touched cloud squashes, squeaks and sheds blue drops, and so does the one over the troop when the spare balloons of too big a bunch bump it.
- **The hill** answers a touch with a dimple where the finger is and a slow wobble that everyone standing on it rides.
- **The idle guidance.** What can be touched next breathes: a bunch swells and settles, never changing colour, since its colour is what the child sorts by; the troop that waits takes a pale glow. The ghost hand is an inflated white mitten with a yellow cuff. It grows in from below and to the right of what it points at, dips onto it once, and shrinks away; the bunch under it squashes as a touched one would.

### Sound (`voices.ts`, `sounds.ts`)

Every sound is synthesized: rubber, air and vinyl. Each is a few partials kept as plain numbers, with a test that holds every pitch between 55 and 5200 Hz, every peak at or under 0.5 before the master gain, every attack at 2 ms or more and every voice under 1.3 seconds. The kinds are pitched apart, the hippo lowest and the crab highest. Nothing sounds for right or wrong.

### How each tier keeps the look (`config.ts`)

| Tier | Pixel ratio | Sheen core | Breathing skin |
| --- | --- | --- | --- |
| 0 | 2 | on | on |
| 1 | 1.5 | on | on |
| 2 | 1.25 | off | on |
| 3 | 1 | off | off |

A tier changes drawing only. The broad sheen, the pale rim, the seams, every form and the three clouds stay at every tier, since the clouds answer a touch and take part in two consequences; the lowest tier is the same scene with a softer highlight and a still skin. No tier change compiles anything: the sheen and the breathing are uniforms.

### Budget

At 1180 by 820 a frame is six draws for each friend on stage, seven for a hippo, and fourteen for everything else: the sky, two hills, three clouds, the balloons, the strings and the shadows as one batch each, four batches for the far hill and the ghost hand. The heaviest frame a counted test could reach, playing whole games fast and at random through every scene, is 65 draw calls (eight friends, three of them hippos), and the test holds every frame at or under 76, against the bar of about 80. No shadow map, no post pass, pixel ratio capped at 2. Frame rates are the lead's to take on a real graphics card; none is claimed here.

### The registry row

For the claimed-styles table in `docs/art-direction.md`, when the look is accepted:

`| Balloon Pop Parade | Inflatable vinyl toys 3D: puffy pool-toy animals and plain balloons with welded seams, a broad sheen and a pale rim, in four saturated hues on a pink air-bed hill under a pale open sky | [games/balloon-pop-parade/ART.md](../games/balloon-pop-parade/ART.md) |`
