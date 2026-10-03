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
