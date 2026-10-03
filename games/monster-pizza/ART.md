<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 4 to 7, and its youngest age, four, governs the design.

- **The cue-table row.** The row for a youngest age of 3 to 4 in the wordless-clarity convention. Its "Avoid" column binds the game: no text, numeral or pictorial icon that has to be decoded, no spoken instruction, no verdict, never several activities live at once, and no tool on the table before it means something. One next act is offered at a time, and at most three fingers act.
- **The pack's rule for the range** (pack: game-design, ages-4-to-6.md). Pretend play with characters who react; tap and drag; quantities to ten; funny through tricks, wrong things on a pizza and a customer who overreacts and is never hurt. No reading, no double tap.
- **The symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, and the game has no `symbols.ts`. An order is a picture of the pieces themselves, one drawn piece for every piece wanted, and never a sign that stands for an amount. The rule follows the manifest band: a seven-year-old sees no numeral either.
- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order (see "The designed order, and what is stored"): four or younger at the first place, five at the second, six at the fourth, seven or older at the fifth. A saved position wins over the age. Age locks and hides nothing: every place is reached by play, and the bigger order is always there to pick.
- **What no age gives.** `null` starts a first visit at the first place, as for the youngest child.

## The toy

**The action.** Tap a tub of toppings and one piece hops onto the pizza. That is the touch the finger performs most, and one touch is always one piece.

**In an empty scene.** A pizza base lies on the board with one tub beside it, and nothing asks for anything.

- When the finger lands, in that frame, the tub squashes under it and one piece pops up out of the tub with a pop.
- When the finger lifts, the piece flies in an arc to a free spot on the pizza and lands with a plop. It squashes and settles, the whole pizza jiggles, the pieces already lying there bob, and a puff of flour comes off the board.
- Each piece that lands sounds one step higher than the one before it, so a run of taps climbs like a small tune. Taking pieces off steps the tune back down. The pitch follows how many lie on the pizza, never how fast the child taps.
- A finger that moves before it lifts carries the piece, which can be set down anywhere on the pizza. Let go anywhere else and it bounces once and rolls back into its tub, at no cost.
- Tapping a piece that lies on the pizza sends it hopping back to its tub with a pip, one step down. Tapping the pizza makes every piece on it wobble.
- A full pizza turns nothing away in silence: the extra piece bounces off the heap with a boing and rolls home.

**Why repeating it is a pleasure with no goal.** Every tap is answered at touch-down and the answer is bigger than the touch: a squash, a flight, a plop, a jiggle and a rising note from one finger (pack: game-design, touch-answers-bigger-than-the-touch.md). Random tapping fills a pizza and plays a climbing scale, and nothing a finger can do is punished. The simplest use, a tap, always works, so no child is stuck on a drag (pack: game-design, toy-first.md). The same pieces also make things: carried pieces can be laid out as a face or a ring, and the pizza keeps them where they were put. In the game this same touch is the school skill, since one tap puts out exactly one piece.

## The object-by-action grid, and what is new on day 15

Six kinds of topping by five things a child can do with them. Every cell looks and sounds different, and the last three columns are also played in each monster's own manner ("The characters and their fixed tastes"), so a cell is never the same twice across customers.

| Kind | Tapped onto the pizza | Baked | Served with too many | Served with too few | Fed to a monster by hand |
| --- | --- | --- | --- | --- | --- |
| Pepper | A snappy tick as it lands; it skids a little and stops | Blisters with a hiss | One puff of flame for each extra pepper | The monster fans its open mouth at the pepper tub, one rumble for each missing | It gulps, its cheeks glow and one spark pops out of an ear |
| Mushroom | A soft thud; the cap bobs once | Shrinks a touch with a squeak | One hiccup for each extra, each with a hop | It sniffs the board like a pig after truffles, one rumble for each missing | It chews slowly and a tiny mushroom pops up on its head, then drops off |
| Olive | A hollow pop; it rolls a finger-width and stops | Glistens and one goes "tok" | One eye rolls right round for each extra | It peers through an olive-sized ring of its fingers at the tub, one rumble each | It swallows it whole and the lump travels visibly down to its belly |
| Cheese | A wet slap; it sticks where it lands | Softens its corners with a low bubbling | One cheese string for each extra stretches from mouth to pizza and twangs back | It plucks an imaginary string and looks at the cheese tub, one rumble each | It pulls the piece out into a long string and plays it like a harp |
| Sock | A flump and a small puff | Steams with a whistle | One stink cloud for each extra; it pinches its nose | It lifts one bare foot and wiggles its toes at the sock tub, one rumble each | It pulls the sock onto an ear, a horn or its nose and wears it |
| Worm | A springy boing; it wriggles once and lies still | Curls up with a zip | One wriggle for each extra runs down its body and it giggles | It makes its tongue wriggle like a worm towards the tub, one rumble each | It slurps it like spaghetti and the tail flicks its nose |

**The wrong use of each object works and is funny.**

- A piece let go off the pizza bounces and rolls home. A piece fed straight to a monster is the last column.
- A raw pizza served is tasted: the dough sticks to the monster's tongue, stretches like gum and snaps back, and the monster looks at the oven.
- A base baked with nothing on it puffs up like a pillow and sinks with a wheeze. A baked pizza baked again makes the oven hiccup and hand it straight back with a puff.
- A kind the customer cannot stand, put on its pizza, gets that customer's own reaction to it, every time.
- More than three too many of one kind is one big version: a long roaring flame that leaves a sooty, blinking face, a storm of hiccups, a cloud that hides the monster. The victim is bewildered and never hurt.

**On day 15** the child knows each monster's tastes and plays them on purpose (a pepper for the one who cannot stand heat, a sock for the one who loves them), counts out bigger orders by picking the customer with the bigger card, lays the pieces out as faces and patterns of their own, and has found reactions that only one monster gives to one kind. None of that needs new content: it is six kinds by five actions by five customers (pack: game-design, depth-from-combinations.md; pack: game-design, liveliness-from-causing-and-comedy.md).

## The representation

**The idea.** A number is how many things are in a set, and two sets hold as many as each other when their things pair off one to one with none left over.

**How it appears.** Two sets of the same things lie side by side: the pictured set on the customer's card and the set the child makes on the pizza.

- **One object for every action.** One tap puts out one piece. Nothing puts out two at once and nothing puts out part of one, so the count of taps is the count of pieces, and each landing sounds one step higher than the last.
- **The picture is of the objects.** The card shows one drawn piece for every piece wanted, in the same shape and colour as the pieces in the tub. It is a picture of the set, never a sign for its size.
- **The pictured set is laid out to be seen.** Up to five pieces stand in one row. Six to ten stand as a full row of five with the rest in a row beneath, so that seven is seen as five and two. Only the last place in the designed order scatters the picture.
- **The made set is scattered**, as toppings are, and stays at ten or fewer for any order.
- **The check is the pairing.** When a pizza is served, the difference between the two sets is acted out one piece at a time ("The error as a consequence"), so the child sees which pieces had no partner.

**Chosen before the game.** The mechanic, the customers and the comedy were built around these two sets. In the table of the game-design pack's research (school skill, representation, mechanic), this is the row for one-to-one counting, one object per action, and the row for patterns seen at a glance, fixed row patterns.

**What stands behind it.** The trial cited for the one-to-one row is of a straight number board, which is a different shape from a set on a plate. So one object per action as used here is school practice without a trial of its own behind it. The row patterns rest on a secondary summary of research on seeing small amounts at a glance. The pack's default is a spoken number word on each object; the game uses a rising note in its place, because no game depends on speech until it has been tried on the owner's iPad.

**Working objects stay plain** (pack: game-design, working-objects-stay-plain.md). Every piece is one flat colour inside one bold outline, told from the others by shape and colour together, all of one size, with no face, no pattern and no motion at rest. The pieces lie on a pale, plain pizza top of a contrasting hue. The look and the comedy go on the customers, the kitchen and the reactions.

**Where the order of object, picture and symbol stops.** At the picture. The band starts below 6, so there is no symbol stage: no numeral ever labels a set (pack: game-design, fade-to-school-symbols.md).

## The four mechanic questions

- **Swap.** No: the play is making a set that holds as many as a pictured set, so taking the counting out leaves a tub to tap and no reason to stop tapping.
- **Attention.** At the moment of decision, which is when to stop tapping a tub, the child must look at the pieces of that kind on the pizza and the pieces of that kind on the card, and think about whether there are as many; where to tap and when to tap do not matter, since a tapped piece finds its own free spot and nothing is timed.
- **Fun.** The skill is the most enjoyable touch of the game: every count is a plop a note higher than the last, and the count as a whole is what the customer's reaction is about.
- **Guess.** Not by tapping at random, since each kind has to hold exactly as many as its picture; a child who adds one piece and serves again each time does get there, but each serving plays a tasting that takes longer than a count and shows which kind is off and by how many, so every try is itself a comparison of the two sets.

## The error as a consequence

A pizza is judged only when the child serves it, and it is judged by being tasted.

- **What a wrong pizza does.** The customer leans in, licks the pizza, and the difference between its card and the pizza plays out on its own body: the grid's "too many" cell for a kind with extra pieces and its "too few" cell for a kind with pieces missing. A kind that is not on the card at all counts as too many of that kind.
- **Where and why.** Each extra piece on the pizza sizzles in its turn as its puff, hiccup or string plays, so the child sees which pieces had no partner on the card. Each missing piece is a drawn piece on the card that the customer pats in its turn, with a rumble and a look at that kind's tub. One to three pieces off are played one by one; more than three are played as one big version, so nothing has to be counted to know there were far too many.
- **The state stays.** The customer pushes the pizza back to the board exactly as it was: baked, every piece where it lay. Nothing is eaten, lost or reset. The sizzling and the patting stop when the tasting ends and leave no mark, so the child still has to find the pieces to change: tap one off, or tap one more on, and serve again.
- **As interesting as success.** A flame, a hiccup storm or a harp of cheese strings is worth causing on purpose, and a child may.
- **Success is a consequence too.** When every kind pairs off with none left over, the customer eats the whole pizza in three bites ("The scenes").
- **Never about the child.** The customer's feelings are about the pizza. There is no buzzer, cross, sad face turned to the child, praise or cheer, and no sound that means wrong.
- **Out of order.** A pizza served raw is tasted as raw dough and pushed back, and the customer looks at the oven. A pizza baked twice comes straight back. Neither is a count, and neither changes the pizza.

(pack: game-design, errors-show-as-consequences.md)

## The designed order, and what is stored

**The order.** Eight places, one new thing at each, and then what is known in combination. The ids are as they stand in `LADDER` in `config.ts`; each names a place in the game's own order.

| Id | An order holds | Tubs on the table | The one new thing |
| --- | --- | --- | --- |
| `a-few` | one kind, 1 to 3 pieces, in a row | that kind only | the job itself: top, bake, serve |
| `to-five` | one kind, 2 to 5, in a row | that kind only | sets up to five |
| `spare-tub` | one kind, 2 to 5, in a row | that kind and one kind not wanted | choosing the kind |
| `two-kinds` | two kinds, 2 to 5 pieces in all | both kinds and one not wanted | two sets on one pizza |
| `to-ten` | one kind, 6 to 10, as a row of five and a row beneath | that kind and one not wanted | sets past five |
| `two-kinds-to-ten` | two kinds, 6 to 10 pieces in all | both kinds and one not wanted | known things combined |
| `three-kinds` | three kinds, 6 to 10 pieces in all | all three and one not wanted | three sets on one pizza |
| `scattered` | one to three kinds, up to 10 in all, pictured with no pattern | the kinds wanted and one not wanted | a picture that has to be counted |

No order asks for more than ten pieces in all. The pizza has room for twelve, so that too many can still happen on an order of ten.

**Where a first visit starts.** `a-few` for a child of four or younger and for no age, `to-five` at five, `two-kinds` at six, `to-ten` at seven or older. A saved position wins over the age.

**How the position moves.** A cycle is one customer, from stepping up to the counter to eating. It goes *well* when the first pizza served is eaten, *mixed* when one pizza was pushed back before the one that was eaten, and *badly* when two or more were pushed back. A raw serving is not counted. The position moves one place up after a cycle that goes well, one place down after one that goes badly, and stays after a mixed one. It moves when the eating starts and never inside a cycle. Nothing on screen shows it.

**The harder option the child picks.** Two customers wait at the door, each with its order rolled up. One holds a small roll and one a big roll. The small roll is an order at the stored position; the big roll is an order one place higher, and the customer who holds it is visibly the bigger eater. The child calls in whichever they like by touching it. A big-roll cycle that goes well moves the position up one place, to where that order was; one that goes any other way moves nothing. At the last place both rolls are the same size.

**Which customer a new position lays out.** The very next one. A customer who waits has no order yet: its roll opens into a card only when it reaches the counter, and the card is drawn from the position as it stands at that moment. Which two customers wait is settled when they come to the door, and that does not depend on the position.

**What is stored.** Small plain JSON under one version number, read field by field.

- `v`: the version.
- `position`: an id from the table above.
- `finished`: the customer at the counter has eaten. The scene stays as it ended and nothing replays on load.
- `customer`: which monster is at the counter.
- `order`: the card, as a list of kind and amount, and whether it is pictured in rows or scattered.
- `tubs`: the kinds on the table, in their places.
- `bigRoll`: whether this customer was called in with the big roll.
- `pizza`: the pieces on it, each a kind and a spot, and whether it is baked.
- `pushedBack`: how many pizzas this customer has pushed back, kept only up to two.
- `waiting`: the two monsters at the door, and which holds the big roll.
- `shown`: the new ideas a character has already shown once.

A piece in the hand is saved in its tub, or on the spot it was picked up from. Baking is saved as baked when the pizza goes in, a tasting adds to `pushedBack` when it starts, and an eating sets `finished` and moves the position when it starts, so a put-away in the middle of any of them loses nothing and plays nothing again. The oven runs on attended game time. The largest legal state is far below half of the 64 KB cap, and a test says so.

(pack: game-design, ordered-challenges-high-success.md; pack: game-design, many-short-visits.md)

## The characters and their fixed tastes

Five customers to start. Each has the same one visible want, in its own manner: it holds its card up, looks from the card to the pizza and back, and its mouth waters. A want is always about the pizza, never about the child.

| Customer | Body and tempo | Funniest part | Loves | Cannot stand, and what that does |
| --- | --- | --- | --- | --- |
| Bim | small, quick, springy | one eye on a long stalk | olives | socks: the eye stalk ties itself in a knot and has to be unpicked |
| Grum | huge, slow, heavy | a belly that goes on wobbling after every move | cheese | peppers: steam whistles from both ears and the belly glows like a lamp |
| Fizz | tall, thin, jittery | a neck that stretches, under three antennae | peppers | mushrooms: the neck goes limp as a noodle and the antennae droop |
| Mops | round, furry, sleepy | floppy ears that arrive late | socks | olives: the ears shoot straight up and every hair stands on end |
| Ooze | a soft blob that drips and gathers itself | a very long tongue | worms | cheese: it melts into a puddle and pulls itself together again |

**The tastes never change**, so a child can learn them and test them on purpose.

- A customer's order always holds the kind it loves, and never the kind it cannot stand.
- From the place `spare-tub` on, the tub that is not wanted holds the kind this customer cannot stand. Putting one on its pizza is a trick the child can play at any time, and the reaction comes every time, in the tasting.
- Fed by hand, the kind it loves gets that customer's own small dance, and the kind it cannot stand is spat neatly back into its tub.
- Every reaction in the grid is played in the customer's manner: Grum's flame is one slow rolling ball, Bim's is three quick sparks and a hop.

**The reactions are the feedback.** A customer reacts to the exact pizza in front of it: these kinds, this many. A reaction starts as the tongue touches the pizza and reads from across a room. No customer thanks, praises or blames the child, complains of waiting, or remarks on the child stopping, leaving or coming back. The customer a trick is played on is bewildered and never hurt.

(pack: game-design, characters-with-opinions.md)

## The scenes

Each scene is a list of timed beats filled in from the state of play, built on `scene.ts`. Its outcome is saved when it starts. Any touch ends it at once with everything where the scene was taking it, and that touch is then an ordinary touch.

**Stepping up** (about 4 seconds). *Cause:* the child touches a customer at the door. *Beats:* the customer who has eaten, if there is one, pats its belly and leaves in its own walk; the one touched comes to the counter in its own walk; a fresh base slides onto the board; the roll opens into the card and its pieces appear one at a time; the tubs slide in. *Filled in from:* which customer, its order, which roll it held. *Saved at the start:* the new customer, its order, the tubs, an empty pizza, and the next two at the door.

**The first showing** (about 2 seconds, once ever). *Cause:* the first customer a child ever serves has stepped up. *Beats:* the customer pokes the tub with a finger, and one piece hops onto the pizza. That is the move, not the answer: this first order always holds at least two pieces. *Saved at the start:* the piece on the pizza, and `tap-a-tub` in `shown`.

**To the oven, shown** (about 2 seconds, once ever). *Cause:* in that same first cycle, the pizza holds a piece and the child has not touched anything for a few seconds of attended time. *Beats:* the oven's window lights, the customer nudges the board a hand's width towards the oven and lets it slide back. It shows where a pizza goes, and says nothing about whether this one is ready. *Saved at the start:* `to-the-oven` in `shown`.

**Baking** (about 3 seconds). *Cause:* the child slides the pizza to the oven, or taps the oven. *Beats:* the pizza goes in and the door shuts; the window glows and each kind on the pizza makes its baking sound; the door opens and the pizza slides out, each piece changed as its kind bakes. *Filled in from:* the kinds on the pizza. *Saved at the start:* the pizza as baked.

**The tasting** (4 to 8 seconds). *Cause:* the child slides a baked pizza to the customer, or taps the customer, and the pizza does not match the card. *Beats:* the lean and the lick; then, for up to three kinds that are off, that kind's cell of the grid, one beat for each piece up to three or one big beat beyond; then the push back to the board. *Filled in from:* which kinds are off, in which direction and by how many, and the customer's manner. *Saved at the start:* one more pizza pushed back. A raw pizza gets the short raw tasting, which saves nothing.

**The eating** (6 to 9 seconds, the ending). *Cause:* a baked pizza is served and every kind pairs off with the card. *Beats:* three bites, each taking a third of the pizza with the crunch of the kinds in it; the customer's own delight; a burp in the colours of what it ate; it settles back, full. *Filled in from:* the pieces where the child laid them, the kinds, the customer. *Saved at the start:* `finished`, and the position moved as the cycle went.

**Secrets** play the same way every time and are never hinted at: each customer's own answer to a piece fed by hand, the base baked with nothing on it, and the tasting of the kind a customer cannot stand.

**How a cycle ends and the next one starts.** The eating ends on a finished scene that stays as long as the child likes: the customer sits back full at the counter, crumbs on the board. If the child does nothing, nothing new starts, and there is no countdown. Two customers wait at the door in plain view, each with a roll, and neither hurries the child or complains. The next cycle starts when the child touches one of them. On load nothing replays: the kitchen is as it was left, mid-order or after the eating, with the two at the door.

(pack: game-design, endings-and-short-scenes.md; pack: game-design, guided-discovery.md)

## The records

Read through the lookup on 2026-10-03. Each record is named by pack id and official code, with its standing and check state as the lookup prints them. What a record asks is given in the game's own words or the pack's Summary.

### us-ca

Levels: `preschool-tk` (returned at ages 4 and 5) and `kindergarten` (returned at ages 5 and 6). Age mapping: official at ages 4, 5 and 6; derived at age 7.
Gap, as printed at age 7: "Grade 2 is not in the pack. A first grader turns seven during the year; a child who starts the school year at seven is in grade 2." Age 7 returns `grade-1`, and the game is designed from no grade 1 record: that lane works with numerals and sums, which this game does not show. The `cross-grade` lane is returned from age 5 and is not used.
At age 4 the game rests on foundations only.

- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-1-0-counting-and-cardinality-1-2` (`us-ca 1.2`, Mathematics, Strand 1.0): department-published-foundation, confirmed. A child counts a set by giving each thing exactly one number word.
  What the game takes: one tap, one piece and one note for each thing, so a child who counts aloud has one piece for each word. The game itself says no number word.
  Limits taken: sets of five or more at the earlier age and ten or more at the later age, both lower bounds. Left open by Limits: any upper bound, the layout, adult help. The game's own choices: it stops at ten, and the places `a-few` to `two-kinds` hold sets of five at most, most of them below the lower bound of five, as an easy start that lies outside this record.
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-1-0-counting-and-cardinality-1-6` (`us-ca 1.6`, Mathematics, Strand 1.0): department-published-foundation, confirmed. A child looks at two sets and tells how they compare in number; at the later age by counting both.
  What the game takes: the set on the card and the set of that kind on the pizza are the two sets, and the child makes the second hold as many as the first.
  Limits taken: two groups only; at the earlier age the difference is plain to see and counting is optional. Left open by Limits: the number range, which is the game's own choice of ten. How many more is not asked, and the game never asks it: a tasting plays the difference out, and the child is not asked to name it. An order of two or three kinds is several pairs of groups on one pizza, which is the game's own choice.
- `edu.us-ca.kindergarten.mathematics.objective.k-cc-5` (`us-ca K.CC.5`): state-board-adopted-standard, confirmed. The child counts to find how many things there are; told a number, the child also counts out a group of that size.
  What the game takes: counting to find how many, on the card and on the pizza. Not taken: counting out from a number that is told. The game tells no number, by numeral or by voice, so its step from a picture to a set does not rest on this record.
  Limits taken: up to 20 things in a row, a grid or a ring, and up to 10 when scattered. The pictured rows hold ten at most, the pizza's scattered set is ten at most for any order, and the scattered card of the last place holds ten at most. Beyond the record: the pizza has room for twelve, so a child can lay eleven or twelve scattered pieces; no order asks for that.
- `edu.us-ca.kindergarten.mathematics.objective.k-cc-6` (`us-ca K.CC.6`): state-board-adopted-standard, confirmed. Looking at two groups of things, the child tells whether one holds more, fewer or as many as the other; pairing things off and counting both are example ways.
  What the game takes: making the pizza's group hold as many as the card's, by pairing or by counting, and reading more and fewer from the tasting.
  Limits taken: groups of objects, not written numerals; groups of up to ten are named as included, which is not a cap; pairing and counting are examples, not the only ways.
- `edu.us-ca.preschool-tk.practical-life-feelings.objective.approaches-to-learning-strand-2-0-executive-functioning-2-1` (`us-ca 2.1`, Approaches to Learning, Strand 2.0): department-published-foundation, confirmed. Children keep a few pieces of information in mind and act on them in tasks of several steps.
  What the game takes: the size of an order, which holds one kind at first, then two, and three at most, and a job of three steps in a fixed order.
  Limits taken: about one or two pieces at the earlier age and about two or three at the later age, stated as ranges. Adult support is part of both statements and the game gives none; the card also stays in view, so the game asks for less holding in mind than the statement describes. Left open by Limits: the length of time.

### nl

Level: `fase-1`, with the sub-band printed for each age: groep 1 at age 4, groep 1 or groep 2 at age 5, groep 2 or groep 3 at age 6, groep 3 at age 7. Age mapping: convention.
`peuters` is returned for a child who has only just turned four. The `einde-po` lane is returned beside every age, labelled end-of-primary goals, and is not used. At age 7 `fase-2` (groep 4) is also returned, and the game is designed from no fase 2 record.
None of these records is a core goal, so none has a regime.

- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-getallen-getalbegrip-hoeveelheden-3` (`nl Hoeveelheden / 3`, the pack's code for a bullet of the content card for peuters): curriculum-institute-guidance, confirmed. Making one-to-one pairs by putting objects with each other.
  What the game takes: the pairing of each drawn piece with one piece on the pizza.
  Limits taken: it describes what is offered to children of about 2 to 4 before school, not what a child must do. Left open by Limits: counting, number words and the number of objects, none of which it names; the amounts are the game's own choice.
- `edu.nl.fase-1.mathematics.objective.af14ff56-8932-4032-bd6c-031aeb12ab5d` (`nl rw/gb/2/01/fase1`): curriculum-institute-guidance, confirmed. Counting amounts to find how many, and learning the rules of counting.
  Limits taken: up to at least 20, with no upper limit; it says what a school offers in fase 1 and names no year inside the band. Left open by Limits: which rules of counting. Stopping at five and then at ten is the game's own choice inside this.
- `edu.nl.fase-1.mathematics.objective.0b3e8f72-07b7-4fad-8ec6-10d82fd65b62` (`nl rw/gb/2/08/fase1`): curriculum-institute-guidance, confirmed. Showing an amount in another form.
  What the game takes: an amount shown as a picture is made again in objects.
  Limits taken: up to at least 20. The forms the source prints with this goal are an example, not a limit, so pictures and objects alone are within it. Ten at most is the game's own choice.
- `edu.nl.fase-1.mathematics.objective.a9357f6e-1801-45cd-b570-42993c24a14a` (`nl rw/gb/2/03/fase1`): curriculum-institute-guidance, confirmed. Comparing and ordering amounts.
  What the game takes: comparing two amounts. Ordering amounts is not used.
  Limits taken: up to at least 20. Left open by Limits: the size of the larger amounts it also mentions, which the game does not use.

nl has no record here for carrying out the steps of a job in order, and the game names nothing in its place. `nl rw/m/6/04/fase1`, which is about putting events in order of time, is not one the game is designed from: the child places no events in order.

### Where the two differ

- **The range and the layout.** The us-ca standard K.CC.5 bounds a scattered set at 10 and an arranged one at 20. The nl goals say up to at least 20 and name no layout. The game follows us-ca here, the tighter of the two: ten at most, scattered or in rows.
- **Starting from a picture.** In us-ca, counting out a set starts from a number that is told (K.CC.5), which this game cannot do without a numeral or a voice; its step from picture to set rests on K.CC.6 and foundation 1.6. In nl, showing an amount in another form is a goal of its own (rw/gb/2/08/fase1). The play is the same under both, and each claim rests on its own records.
- **The steps of the job.** us-ca has foundation 2.1, for ages 4 and 5 and with adult support. nl has no record. The game follows us-ca for the size of an order, and claims nothing for nl.
- **The ages covered.** The us-ca records reach from age 4 to age 6: foundations at 4 and 5, kindergarten standards at 5 and 6, and nothing at 7. The nl fase 1 goals cover groep 1 to 3, about ages 4 to 7 by convention. So the top of the band is the game's own stretch in us-ca and inside fase 1 in nl.
- **The standing.** The us-ca records are two adopted standards and three foundations. The nl records are all guidance.

### The claim

Monster Pizza is designed from, in California, three foundations published by a state department for preschool and transitional kindergarten (mathematics 1.2 and 1.6, and approaches to learning 2.1), which are foundations and not standards, and two kindergarten content standards adopted by the State Board of Education (K.CC.5 and K.CC.6); and, in the Netherlands, guidance of the curriculum institute SLO, which is not law: one statement of its content card for peuters and three of its goals for fase 1, which say what a school can offer and not what a child must know. All nine records are confirmed. What the game is designed from in them is making a set that holds as many as a pictured set, by pairing one to one or by counting, with sets of up to ten, and, from the California foundation 2.1 alone, an order of one to three kinds worked through in three steps. It is designed from no California record for a seven-year-old and from no Dutch record for the steps of a job.

## The look

Written after the style spike, not part of the sheet.

**The look: felt-tip marker drawing**, the first of the two rows reserved for this game in the look ledger, in canvas 2D. The whole kitchen looks drawn by a happy five-year-old on white drawing paper.

**How it is made.**

- **Outlines.** Every figure has one bold dark line (`#2b2a33`), 6 to 8 units wide with round ends, through points nudged by a seeded wobble, with a darker dot where the pen came to rest. Each figure's wobble is seeded from its name, so it is its own and never changes between frames.
- **Fills.** Parallel marker strokes at one angle per figure, drawn with `multiply` so that overlaps darken, each stroke cut where it crosses the outline and then let fall short or run over by a little. A second, sparser pass sits where the hand went back over it. Nothing is shaded and nothing is lit.
- **Paper.** `#fffdf6`, bare. The wall is paper with one doorway of sky; the worktop is bare paper, so the work lies on a plain ground.
- **The pieces a child counts are the exception.** Each kind is one flat colour inside one steady outline, with no wobble, no streaks, no face and no motion at rest: pepper `#e4322b`, mushroom `#b98a5e`, olive `#4d7a2a`, cheese `#ffd21f`, sock `#2f7fe0`, worm `#ff8fb4`. A kind is told by shape and colour together. All six fit the same circle. They lie on the pizza's top, a flat pale `#fff4d6`, and on the card, flat white.
- **The customers** carry the look: bodies coloured in with wide strokes (Bim teal, Grum purple, Fizz orange, Mops pink, Ooze lime), a paler patch on the front, white eyes with a dark pupil, a dark mouth with two blunt teeth, stick arms with round hands.
- **The setting:** a yellow counter edge, a round wooden board with a handle, a red brick oven with a dark mouth, tubs in six marker colours, none the colour of the kind inside.
- **Baked,** the pizza's crust browns and its top goes golden, and each piece takes a browned rim and its kind's own small change (the mushroom a touch smaller, the worm curled shorter). It stays flat, whole and countable.

**Where things stand.** On a stage of 1180 by 820 units, fitted whole into the surface. The customer stands behind a yellow counter, top centre, over the pizza. The card is to its right, over the oven; the doorway is to its left, over the tubs. So the job reads left to right along the table (tubs, pizza, oven) and then up to the customer, and the customer's free hand is on the tubs' side. Nothing that answers a touch is in the top right corner, which the grown-up overlay listens in.

**Reactions.** A puff of flame, a hiccup bubble, strings of cheese, a cloud, wavy lines over a rumbling belly: each is a few marker figures drawn fresh every frame from a fixed seed (`effects.ts`), so it grows and fades without boiling. They are on the customer and in the air round it, never on the pieces. A piece that had no partner on the card sizzles in its turn by growing a little inside a small ring of dashes, and is as it was when the tasting ends.

**Palette.** Marker colours straight from the pack: saturated, unmixed, no pastels and no greys. Dark is the outline only.

**Motion rules.**

- A drawing does not boil. Life at rest is breathing, blinking, eyes that follow and each customer's own small delights (`motion.ts`), drawn by moving and squashing whole sprites and redrawing a few pen lines.
- Each customer moves like itself: its own tempo, weight and funniest part, its own variants of every action, never the same variant twice in a row. A test fails on a shared or near-copied action.
- Things have weight: a tub squashes under the finger, a piece lands with a squash and settles on a spring, the whole pizza jiggles under a landing.
- A piece at rest never moves by itself.

**The idle cues.** What can be touched gets a ring of short orange marker dashes that breathes: the way a child draws that something shines. It reads on bare paper, where a yellow highlight would not. The ghost hand is a white mitten with one finger out, in the same outline.

**How each tier keeps the look.** The tiers in `config.ts` set the pixel ratio only: 2, 1.5, 1.25, 1. Every figure is drawn once into a sprite at the surface's own density when the surface is sized, so a lower tier is the same drawing with fewer pixels and nothing is left out. A frame is one full-surface stamp (the wall) and a few dozen small ones.

**Kept apart from the nearest looks.** Bad Neighbours is pixels; this has none. Bedtime Forest has a loose ink line over paint; this has no paint and no tone. The stickers have a white border and gloss; this has neither. Thick-line primaries, this game's second row, has a steady line and fills that reach it; here the line wobbles and the fills miss.

**For the registry** (a request to the lead, in the columns of section 3 of the art direction): Monster Pizza | Felt-tip marker drawing (canvas 2D): wobbly bold outlines and streaky marker fills that miss the edges on white drawing paper, five coloured-in monsters at a yellow counter, and plain flat toppings on a pale pizza | `games/monster-pizza/ART.md`.
