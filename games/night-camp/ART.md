<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 9 to 12. Its youngest age, 9, governs the design.

- **Cue table.** The row for a youngest age of 7 and up in the wordless-clarity convention. Its "Avoid" column binds the game: no written word or letter; no symbol standing alone that play depends on reading; no timer, points or verdict chrome; no long hint chain.
- **Age rule.** (pack: game-design, ages-9-to-12.md) The camp is a real system that behaves truly: every supply is used up at a steady amount per span of time, and the night shows exactly what the plan gives. More than one plan works, and a better one is visibly better in the world. Failure is large, funny and free. Help is something the child fetches. Nothing is babyish, nothing competes, and no best is stored.
- **Symbol rule.** The band starts at 6 or above, so numerals and mathematics symbols may be shown, each laid on or beside the quantity it stands for, and all of them drawn by `symbols.ts`. No letter and no written word appears: an hour is a division of the ruler and never an abbreviation, and a unit is the drawn thing itself (a log, a flask, a can). No symbol stands alone. Where each numeral lies is listed under "The representation".
- **`ctx.childAge`.** It sets one default: where a first visit starts in the designed order. A child of 9 or 10 starts at the first position and a child of 11 or more at the second. `null` starts at the first. A saved position wins over the age, and every position is reached by play at any age.
- **`ctx.language`.** Nothing in the game depends on it: there is no spoken or written content, and the game shows whole numbers and fractions only, so no decimal mark is drawn.

## The toy

**Pulling a row of supply out of its pile, along its rod.** Each supply has a pile at the left end of a banded measuring rod that lies on the map. The finger lands on the pile and pulls: the supply comes out behind the finger one piece at a time, laid end to end along the rod, as a zip opens.

- **On touch-down, in the same frame:** the pile rattles and the first piece jumps to the finger with a knock.
- **While pulling:** every piece that comes out sounds one note, each a step higher than the last, with a deeper knock on every fifth. The row is a length the child is drawing, and the numeral at its end follows the last piece.
- **On release:** the row settles in a wave that runs back to the pile, each piece squashing in turn. The nearest camper's head turns to watch and the dog trots to sniff the far end.
- **Pushing back:** the pieces hop home in reverse, the notes stepping down.
- **A tap anywhere on the rod:** the row shoots out, or snaps back, to that mark in one rattle.
- **Past the end of the rod:** the extra pieces tumble into a heap, the mule looks at the heap, then at the sled, and sits down. One pull back clears it.

It is a pleasure with no goal because it is a zip and a xylophone at once: the hand draws a length and hears it, fast or slow, forwards or back, and a bigger pull makes a bigger chain (pack: game-design, toy-first.md; pack: game-design, touch-answers-bigger-than-the-touch.md). Random pulling always lays a row and never does harm. Someone watching sees within three seconds that the child is laying in wood. It is also the hand of the school skill: the answer to "how much will the night need" is given as a length on a line of equal steps.

The three supplies differ in the hand: logs knock like wood blocks and roll a little, oil flasks clink in a glassy chain, and water cans come out slowly with a slosh that lags behind the finger.

## The object-by-action grid, and what is new on day 15

Six objects by five actions. The first three objects are the supplies, which have a right place (their rod) and a right user (logs feed the fire, oil the lantern, water the kettle). Every other use is a wrong use: it works, it is funny, it costs nothing, and it never changes the plan. "At dusk" is while the child plans; "at night" is while the night runs.

| | Pull it along | Drop it on the fire | Drop it on a lantern | Drop it on a camper | Tap it |
| --- | --- | --- | --- | --- | --- |
| **Log** | A row zips out along the rod, wood-block notes rising. | At dusk the ring of stones shuffles and bites it in. At night the fire flares, its circle of light bulges for a beat and the eyes at its edge jump back. | It balances on top; the lantern tips, rolls down the slope, plops into the stream with a hiss and bobs back. | Each uses it their own way: the reader sits on it, the sleeper takes it as a pillow, the cook stirs it in the pot. | It rolls half a turn and rings its own note. |
| **Oil flask** | The oil pours out along the rod as one amber band, gurgling, with a clink at each flask mark. | A fireball ring: every hat blows back, the cook's eyebrows go sooty, and the flask is back in its pile. | The right use: it glugs in, and the lantern burps a smoke ring. | The camper sniffs it, pulls a face and hands it to the mule, which sneezes. | It wobbles and rings like glass. |
| **Water can** | Cans come out slowly with a slosh that lags behind the finger. | At dusk a puddle and a frog. At night a hiss and a steam cloud that hides a patch of the map for a moment. | The lantern gargles and blows one bubble that drifts off the sheet. | A splash: the sleeper sits up and shakes like a dog, the reader holds the book overhead as a roof. | It sloshes, and a cup of water hops out and back. |
| **Lantern** | It is carried across the map with its reach drawn as a pencil circle that follows it, and stands on the pin where it is let go. | It glows red, whistles like a kettle and hops out by itself. | Two lanterns stack and sway, then the top one slides off to the nearest free pin. | It is worn as a hat: the reader reads on, pleased; the sleeper pulls the bag over their head. | The wick clicks between low and high, and the halo shrinks or grows. |
| **Amount card** | The right use: stamped along the night ruler, each stamp lays the card's pieces under the next span in pencil, with the running total beside them. | A corner curls and smokes; the card shakes itself flat. | It sticks on as a shade and the light goes striped. | The dog takes it, runs a lap of the camp and brings it back damp. | It flips between its single and its doubled side. |
| **Marshmallow** | A dotted trail of marshmallows is laid across the map, and at night the raccoons follow it exactly, wherever it leads. | It swells to the size of a tent, toasts, and sags. | It melts over the glass and the moths stick to it. | The camper eats it with both cheeks; the sleeper eats it without waking. | The tin's lid pops and one jumps out. |

**Day 15.** On day 1 the child gets one fire through a short night by trying and looking. On day 15 the child plans a long night for five campers with two lanterns and a kettle on a sled that is nearly full, in the head, by doubling an amount card instead of counting hours, and gets it right on the first night; knows each camper's fixed tastes well enough to stage a night on purpose (let the lantern run dry at one exact hour and the reader walks, still reading, into the stream); and makes nights of their own by unfolding the ruler and turning the dials (pack: game-design, depth-from-combinations.md; pack: game-design, liveliness-from-causing-and-comedy.md).

## The representation

**The idea.** A supply is used up at a steady amount for each span of time, so whether a stock lasts is a relation between three quantities: how much there is, how much goes in one span, and how long the night is.

**Chosen first: two straight lines of equal steps, lying side by side, and a card that links them.** This is the double number line and the ratio table of school, built from the game's own objects.

- **The night is a length.** A folding ruler lies along the bottom of the map. Each division is one hour, all equal, read from dusk at the left to dawn at the right. A brass cursor slides along it, and the night is wherever the cursor stands. A longer night is a longer ruler: the child unfolds another section.
- **A stock is a length.** Each supply lies as a row along its own banded rod, parallel to the ruler, counted from the pile at the left. Logs are counted pieces. Oil and water are poured: one continuous band, with a mark at each flask or can.
- **The amount card links the two.** Each user has one card: a piece of ruler of so many hours with the pieces it uses in that span laid under it (three logs under one hour; one flask under two hours). The card is the amount for one span as a thing the child can pick up, double, and later halve.
- **The strip.** Stamping a card along the ruler lays its pieces under span after span in pencil, with the running total beside each stamp. That strip is a ratio table laid out to scale: hours above, pieces below.
- **The truth beside the estimate.** As the night runs, the row on the rod shortens from its far end and what was used is laid as ash under the hour in which it burned, so the stock turns into the strip in front of the child. When a supply runs out the ash stops, a pin drops on the ruler at that moment, and the gap from the pin to dawn is the hours not covered (pack: game-design, representation-before-game.md).

**Why this shape.** Time and stock are both straight paths of equal steps, never a dial, a clock face or a winding track. The pack's table for ratio and proportion asks for continuous amounts first, since children are misled by countable pieces until about ten, and gives the ratio table and the double number line as the school forms. So the first amount that is not "so many for one hour" arrives on oil, which pours, and the logs, which are counted, carry the whole-number positions.

**Standing of the evidence.** The double number line and the ratio table are school practice in the Dutch tradition, cited in the pack from a secondary summary, with no trial behind them. Continuous amounts before counted ones rests on one study the pack cites second-hand. The straight path of equal steps has a trial behind it, but for number order in preschool, which is not this skill. The game is therefore built on school practice, and says so.

**Object, picture, symbol.** All three stages are inside the same play: the objects (rows on rods, the ruler), the picture (the pencilled strip, the ash), and the symbol (numerals laid on them). The order stops at whole numbers and fractions laid on their quantities. No sign for an operation is needed to play, and none stands alone.

**Where each numeral lies.** All drawn by `symbols.ts`, none in this run.

1. On the night ruler, at each hour division: the count of hours from dusk.
2. On each rod, at every fifth mark, and at the end of the row: the count of pieces laid in. This is a quantity the child set.
3. On an amount card: one numeral beside its pieces and one beside its span of ruler. A halved card may show a fraction, as two whole numbers with a bar, beside a half piece that is drawn sawn or half full.
4. On the pencilled strip: the running total beside each stamp, and the hours it has reached on the ruler above.
5. On a water can: the count of cups it holds, beside its cup marks.
6. On the sled, where there is one: the count of places on its bed, at every fifth place.

**Where no numeral lies.** Nothing reads out how a night went: no numeral on the ash, on the gap, on what is left over or on a camper. Short and left over are seen as lengths (pack: game-design, fade-to-school-symbols.md).

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
