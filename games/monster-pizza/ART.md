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

One sentence each for swap, attention, fun and guess.

## The error as a consequence

What a wrong attempt does in the world, where it shows, and that the state stays so the child changes one thing and tries again.

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
