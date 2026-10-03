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

The three supplies differ in the hand: logs come out piece by piece, knock like wood blocks and roll a little; oil pours out as one amber band with a glassy clink at each flask mark; water comes out as a slow blue band whose slosh lags behind the finger, with a clunk at each can mark.

## The object-by-action grid, and what is new on day 15

Six objects by five actions. The first three objects are the supplies, which have a right place (their rod) and a right user (logs feed the fire, oil the lantern, water the kettle). Every other use is a wrong use: it works, it is funny, it costs nothing, and it never changes the plan. "At dusk" is while the child plans; "at night" is while the night runs.

| | Pull it along | Drop it on the fire | Drop it on a lantern | Drop it on a camper | Tap it |
| --- | --- | --- | --- | --- | --- |
| **Log** | A row zips out along the rod, wood-block notes rising. | At dusk the ring of stones shuffles and bites it in. At night the fire flares, its circle of light bulges for a beat and the eyes at its edge jump back. | It balances on top; the lantern tips, rolls down the slope, plops into the stream with a hiss and bobs back. | Each uses it their own way: the reader sits on it, the sleeper takes it as a pillow, the cook stirs it in the pot. | It rolls half a turn and rings its own note. |
| **Oil flask** | The oil pours out along the rod as one amber band, gurgling, with a clink at each flask mark. | A fireball ring: every hat blows back, the cook's eyebrows go sooty, and the flask is back in its pile. | The right use: it glugs in, and the lantern burps a smoke ring. | The camper sniffs it, pulls a face and hands it to the mule, which sneezes. | It wobbles and rings like glass. |
| **Water can** | The water comes out as a slow blue band whose slosh lags behind the finger, with a clunk at each can mark. | At dusk a puddle and a frog. At night a hiss and a steam cloud that hides a patch of the map for a moment. | The lantern gargles and blows one bubble that drifts off the sheet. | A splash: the sleeper sits up and shakes like a dog, the reader holds the book overhead as a roof. | It sloshes, and a cup of water hops out and back. |
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

- **Swap.** No: what is played is the relation itself between a stock, the amount used in one span and the length of the night, so with another subject in its place there would be nothing left to run.
- **Attention.** At the moment of decision, which is how far to pull a row or which way to turn a dial, the child looks at the amount card, the length of the ruler and the row on the rod, and thinks about how many of this card fit into this night.
- **Fun.** The best moment is sliding the night along and watching the plan hold or come apart, and that moment is the skill's own result: the pull that set it up is the toy, and play never stops for a question.
- **Guess.** At the first two positions a child can get a night through by adding and running again, and each run shows where the supply ran out and how many hours are bare, so even that way teaches the amount for each hour; a plan that only piles everything on gets through but does not go well (see "The designed order"), and from the position where the sled has a bed of limited length it does not fit at all, because adding to one supply pushes out another.

## The error as a consequence

The game runs the child's plan as it stands and shows what it does. Nothing gives a verdict: no cross, no buzzer, no sad face turned to the child, no reset and no lost piece (pack: game-design, errors-show-as-consequences.md).

- **Too little of a supply.** Its user goes out at the true moment. *Where:* a pin drops on the night ruler at that moment, the ash under the ruler stops there, and the ruler from the pin to dawn stays bare. *Why:* the rod of that supply is empty, and the ash shows hour by hour where it went. *In the world:* the dark closes over that user's circle, eyes open at its edge, the raccoons come exactly as far as the dark reaches, and each camper who was in the circle does what their fixed taste makes them do.
- **Too few cups for a round.** The cook pours down the line until the kettle is dry. *Where and why:* the campers at the end of the line hold empty mugs at that hour, and one turns the mug over and a moth flies out.
- **Too much.** Nothing goes wrong in the night. In the morning the unused part still lies on its rod as a length, and the scout straps exactly that much onto the mule, a tower as tall as the leftover, before the mule will move.
- **More than the sled holds** (from the position that has a sled). The pull stops being followed: the piece that does not fit slides off the tail of the sled and hops back to its pile. *Where and why:* the bed is visibly full to its tail.
- **A setting that does not suit.** A fire too small leaves the far tents outside its circle, and those campers drag their bags inside it, on top of each other. A lantern on the wrong pin lights someone who wanted the dark.

The state stays. After any night the camp, the rods and the dials are exactly as the child set them, the ash and the pins lie where they fell, and the child changes one thing and slides the night again. Success is the same kind of consequence: the ash reaches dawn, the circles hold, and everyone wakes the way a good night leaves them. The first time a user goes out at a site the whole camp plays it out as a short scene; after that only the pin, the dark and the campers' own reactions show, so the feedback thins as the child gets surer.

## The designed order, and what is stored

**A cycle is one site.** The child plans the camp, slides the night as often as they like, changing the plan between nights, and moves on when they choose, by touching the folded edge of the map where the mule waits. That touch ends the cycle, judges it, and lays out the next site.

**The order.** One new thing at a time, then combinations (pack: game-design, ordered-challenges-high-success.md). The ids name kinds of place on a map sheet and nothing else. They stand in `LADDER` in `config.ts` in this order.

| Id | The one new thing | What the site holds |
| --- | --- | --- |
| `meadow` | A stock, an amount for one hour, and a night. | The fire alone, with one fixed amount of so many logs for one hour; a short night; two campers. |
| `birchwood` | Choosing the amount. | The fire's dial has three amounts for one hour, the tents stand at different distances, and two cards stamped along one ruler can be compared hour by hour. |
| `ford` | A second multiplier, and a remainder that means one more. | The kettle: a cup for every camper at every hour, with water laid in by the can, each can holding six cups. |
| `quarry` | An amount for a span longer than one hour. | The lantern: one flask lasts two hours, or three on the low wick, on a supply that pours. A night that is not a multiple leaves a part flask. |
| `ridge` | A limit. | The sled: its bed has only so many places, a log takes one, a flask two and a can three, and all three supplies must fit together. |
| `tarn` | Several pieces for several hours. | Amounts where neither number is one, such as five logs for two hours or two flasks for three; the card is doubled or halved to reach the night. |
| `saddle` | The question turned round. | The sled arrives loaded and strapped, so the stock is given, and the child sets the dials so that it lasts: the amount for one hour is what has to be found. |
| `summit` | Nothing new: everything together. | A long night, five campers, two lanterns, the kettle and a sled with little room to spare. |

- **The same skill in a slightly different form.** Each position has a few variants that differ only in their numbers (the length of the night, the campers, the amounts). A new site takes the next variant in turn, so a return visit is never the same sum (pack: game-design, many-short-visits.md).
- **A harder option, chosen by the child.** At any site the child may unfold one or two more sections of the folding ruler, two hours each. A longer night is a visibly longer ruler, and the child may fold it back at any time. Nothing else makes a site harder, and nothing makes it harder unasked.
- **Number ranges.** No record the game is designed from sets a range (see "The records"), so these are the game's own choice: nights of 4 to 12 hours, or up to 16 unfolded; 2 to 5 campers; amounts of at most 6 pieces for a span of at most 3 hours; rods of at most 60 logs, 12 flasks and 10 cans; every total below 100. From `meadow` to `ridge` every amount is a whole number of pieces for one hour, or one piece for a whole number of hours, and every answer is a whole number of pieces. From `tarn` the amount for one hour may be a fraction of two whole numbers, such as five halves, and never a fraction inside a fraction.

**How a cycle is judged.** When the child moves on, from the last night that was slid to dawn at this site:

- **Well:** nothing ran short, no supply had more left over than one more hour of its user would take (at least one piece), and this was reached by the third night at the site.
- **Badly:** something ran short in that last night.
- **Mixed:** anything else: nothing short but a lot left over, a good night reached only after more than three, or no night slid to dawn at all.

The position moves one step up after "well", one step down after "badly", and stays after "mixed". It moves only at that touch, never inside a cycle, and nothing shows it or that it moved. A first visit starts at `meadow`, or at `birchwood` for a child of 11 or more; a saved position wins over the age.

**Which site a new position lays out.** The next site is laid out at the touch on the fold, after the cycle is judged, so a new position lays out the very next site. What waits on screen before that touch is the folded edge of the map with the mule on it, and it shows nothing of the site to come.

**What is stored.** Plain JSON, versioned, each field repaired by itself on reading.

| Field | What it is |
| --- | --- |
| `v` | The version of the saved shape. |
| `position` | The id of the child's place in the order. |
| `finished` | Kept from the template. Always false in a save, because the touch that ends a cycle begins the next. |
| `variant` | Which variant of the position is laid out at this site. |
| `unfolded` | How many extra sections of the ruler the child has unfolded: 0, 1 or 2. |
| `logs`, `oil`, `water` | The pieces laid in on each rod. |
| `fire` | The fire dial's setting. |
| `lanterns` | For each lantern, the pin it stands on, or none, and its wick, low or high. |
| `strips` | For each user, how many spans of its card are stamped along the ruler in pencil. |
| `trail` | The marshmallow trail, as the cells of a coarse grid over the map, at most 24. |
| `phase` | `dusk`, with the cursor at its stop and the plan open, or `morning`, after a night slid to dawn. |
| `nights` | How many nights were slid to dawn at this site with a changed plan. Never shown. |
| `changed` | Whether the plan changed since the last night slid to dawn. |
| `shown` | The ids of the first showings already given, so each is shown once. |

A running night is a view of the saved plan and is not saved: put away in the middle of a night, the camp is found at dusk with the plan as it was. The morning is saved when its scene starts, and everything in it (the ash, the pins, each camper's state) is worked out again from the saved plan, so on load it stands finished and nothing replays. A piece in the hand is saved where it came from. Nothing reads a clock: the night moves only with the cursor, on attended time.

## The characters and their fixed tastes

The campers are the feedback: what each does in the night is their reaction to exactly this plan, and it is always about the camp, never about the child (pack: game-design, characters-with-opinions.md). Seen from above, each is told apart by hat and sleeping bag, and each looks up when something happens to them. The tastes never change, so a child can learn them and test them on purpose.

| Who | The one visible want | Likes | Dislikes, and what they then do |
| --- | --- | --- | --- |
| **The reader** (head torch, glasses, a book) | Light to read by, all night. | Lantern light best; firelight will do. | The dark: walks, still reading, to the nearest light left, and with none left walks into the stream. |
| **The sleeper** (bobble hat, an enormous bag) | To sleep through, warm and in the dark. | The fire's warmth. | A lantern shining on the tent: pulls the bag over their head and inches away like a caterpillar. Cold: wakes hugging whatever is warm, a raccoon included. |
| **The cook** (a pan for a hat) | A big fire and a full kettle. | The fire on its highest setting; a round poured for everyone. | A small fire: fans it with the pan. A dry kettle: holds it upside down and looks inside. A round poured after the fire is out: cold cocoa, and every face that tastes it. |
| **The scout** (wide brim, the old hand) | To carry nothing back. | A morning with almost nothing left over. | Leftovers: straps all of it on the mule, sighing, in a tower. The scout is also the one who shows a neat way, once, after the child's own try. |
| **The small one** (a hood with ears, and the dog) | Never to be in the dark. | Any light at all. | The dark: moves, with the dog, into the nearest lit tent, whoever is in it. |

Around them, each with one fixed habit: the **raccoons** come exactly as far as the dark reaches and no further, take what lies in the dark and follow a marshmallow trail wherever it leads; the **moths** circle any lit lantern, more of them on the high wick; the **owl** hoots once as the cursor passes each hour; the **mule** carries what it is given, sits down when it is given too much, and waits at the fold of the map without looking at the child. Nobody is hurt, and whoever a joke is played on is only bewildered.

A wait is never a complaint: no camper and no animal hurries the child, sulks at being left, or remarks on a return.

## The scenes

Each scene is a list of timed beats on game time, built on the template's `scene.ts`, filled in from the state of play, and gives way to any touch: a touch during a scene ends it at once in its final pose and is then handled as the touch it is (pack: game-design, endings-and-short-scenes.md).

- **Lights out** (a consequence, 4 to 6 seconds). *Cause:* a user runs out for the first time at this site, as the cursor passes that moment. *Beats:* the flame gutters; the pin drops on the ruler; the dark closes over the circle; eyes open at its edge; the campers who were in the circle do what their tastes make them do; the raccoons come as far as the dark. *Filled in from:* which user, at what moment, who was in its reach, and what lies in the dark. The cursor stops gliding while it plays and goes on gliding after it, unless the child has taken hold of it.
- **Morning** (the ending of a night, 6 to 10 seconds, then it holds). *Cause:* the cursor reaches dawn. *Beats:* the night film slides off the map; each camper wakes the way their own night went; the scout walks the rods and straps what is left over onto the mule; the kettle, the fire and the lanterns are left exactly as they ended. *Filled in from:* the whole night as the plan gave it. It is saved as it starts.
- **A neat way** (guided discovery, 5 to 8 seconds, once for each idea). *Cause:* the first morning at a position whose new thing the child has now tried their own way, however that night went. *Beats:* the scout picks up the amount card, stamps it along the ruler for the first two spans only, each stamp leaving its pieces and its running total in pencil, then leaves the card lying on the ruler at the next span and steps back. At later positions the move shown is the new one: turning the dial and stamping the second card under the first; pouring one round down the line of mugs; stamping a card that spans two hours; doubling a card; halving one. *Filled in from:* this site's own card and ruler. It shows a move and never the amount this night needs, and the child can then compare it with what they did (pack: game-design, guided-discovery.md).
- **The picnic** (a secret, 6 seconds, every time). *Cause:* the cursor passes the middle of a night in which no fire and no lantern is lit. *Beats:* the raccoons carry the snack tin into the cold fire ring, sit round it in the campers' places, and one puts on the cook's pan. Nothing hints at it and nothing counts it (pack: game-design, hidden-never-counted.md).
- **Packing up** (the child's own act, 3 to 4 seconds). *Cause:* the touch on the fold. *Beats:* the tents fold, the kit slides to the edge, the sheet folds over to the next panel and the new site opens out flat.

**How a cycle ends, and how the next starts.** A night ends at dawn in the morning scene, which stays as long as the child likes: nothing new starts by itself, and there is no countdown. From the morning the child may slide the cursor back and try another plan at the same site, as often as they like. The next site waits as the folded edge of the map with the mule standing on it, visible from the first moment of every site, and it comes in only on the child's touch. On load no scene replays: the camp stands at dusk or in its finished morning, with the fold waiting.

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
