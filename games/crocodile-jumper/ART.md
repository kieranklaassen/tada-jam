<!-- template: cartridge/ART.md v3 -->
# Design sheet

## The band and its age rule

Ages 4 to 7. The youngest age governs: the 3 to 4 row of the cue table, with its Avoid column as hard constraints (no text, numeral or picture to be decoded, no spoken instruction, no competing activities), and pretend play with characters who react (pack: game-design, ages-4-to-6.md). Tap and drag only; everything that matters can be done with taps alone; essential targets are about 100 units across and none is in the bottom strip. The band starts below 6, so there is no word, letter, numeral or sign anywhere on the kid side.

`ctx.childAge` sets where a first visit starts. 5 and younger: `croc-alone`. 6 and older: `snail-in-ducks`. `null`: `croc-alone`. A saved position wins, and no age opens or closes anything.

## The toy

A finger drags a foil-wrapped sausage along a paper strip. The wrapper crackles and flashes as it lands under the finger; sliding, it skids, bumps the piece in front of it nose to tail with a clack, and pushes the whole train along. Let go nearly touching, two pieces close up with a soft kiss. Lifted and let go on another piece, it flops over it. A tap makes a lying piece scoot off by itself until it bumps something. In an empty shop with nobody on the table, shoving a train of sausages, shoes and ducks to and fro until it clacks against the pincushion is a pleasure with no goal.

## The object-by-action grid, and what is new on day 15

Every cell looks and sounds different. "The pincushion" is the fixed soft stop where the strip and the customer's neck begin.

| | Tap | Slide or stroke along | Let go on a piece, or on what the piece lies by | Let go on the customer | Gust from the window |
| --- | --- | --- | --- | --- | --- |
| Sausage | Squeaks and scoots to the pincushion side until it bumps, on a rising slide note and a rubbery clack | Skids with a wet rubber squeak that rises with speed | Flops over the piece with a boing and stays bent over it | Held to the mouth: the crocodile slurps it shiny, the python gulps it and coughs it out, the dog gasps with both paws up, the snail pokes it with one horn, the seal spits it out with a ptui; then it hops home | Rolls on the spot with a low hum |
| Shoe | Takes two steps with two clops and knocks heel to toe | Scrapes on its heel with a rasp | Stamps on the piece with a stomp and stands with its toe in the air | The dog chews it with a growl, the seal kisses it with a smack, the crocodile tries it on his nose and sneezes, the snail shuts itself in with a click, the python looks for feet along itself with a long hiss; then it hops home | Its laces whip with a double slap |
| Duck | Quacks and waddles up to the next thing with a pip | Quacks faster the faster it slides, in a string of short quacks | Sits on the piece and both complain, a high and a low quack | The snail wears it as a hat with a chime, the crocodile goes stiff with a whimper, the dog barks at it and it quacks back, the seal balances it with a wobbling whistle, the python follows it with crossed eyes and a slow rattle; then it hops home | Turns its beak into the wind with a weathercock's creak |
| Customer | Each its own ticklish act and voice: the crocodile's jaws clap, the dog's back paw drums, the snail pops in and out, the seal claps its flippers, the python ties its tongue | Strokes run along the body as a wriggle under the finger, with a purr in the customer's own pitch | A waiting customer let go behind the one on the table lies down nose to tail with a bump of bellies, two voices at once; where there is no room it bounces back to the door with a spring | A waiting customer let go on the other's head: the two rub noses with a rubbery squeak and the waiting one goes back | Wherever it is bare it turns blue and its teeth chatter |
| Jumper, worn | The touched ring puffs and settles, in the voice of what it was measured with: a rubber pop, a knock, a short quack | A stroke along the rings runs a ripple of crackles from finger to finger | Pulled up and let go it comes off with a pop and crumples away; the customer is bare again and the row still lies there | Measured in the favourite, the customer smells the nearest ring, sighs and hugs itself; in the disliked one it leans its head away with a groan; in the third it hums | Rings flutter with a tinsel hiss; a hole whistles |
| The magpie tailor | Snips along the row from end to end and makes the jumper; with an empty strip she snips the air, looks into her empty foil and takes off what is worn | A finger run along her ruffles her feathers with a trill | A piece let go on her: the sausage is worn as a scarf with a purr, the shoe as a hat with a toot, the duck is argued with, chatter against quack; then it hops home | On a tap on the customer she looks up and clicks her beak once | Her pile of foil flaps up and she sits on it with a rustle |

The window opens with a creak and a gust. The mice at the end of the table hold a cake: a tap makes them squeak and juggle it. A covered tray's foil tears off with a long crisp rip. The waiting customer waves its favourite thing with a call; what it holds stays its own.

On day 15 a child can: look at a customer and choose, before laying a piece, the measure that will come out exactly and the one that customer loves; leave a hole on purpose where a customer is ticklish; and lay two customers end to end and measure one jumper for both.

## The representation

Length is the stretch of strip that pieces fill, laid end to end from a fixed start, beside the thing itself. The jumper is the answer as an object: the same row, ring for piece, gap for gap. The unit stays visible in the result, so two jumpers for one crocodile, one of few long rings and one of many short ones, are seen to be equally long. Laying objects end to end is school practice; this form of it has no trial behind it. The game stops at the object: no picture of a length and no symbol.

## The four mechanic questions

- **Swap.** Other content cannot be put in: the pieces are lengths and the rule of play is that they add up along a line.
- **Attention.** At the moment of decision the child looks at the end of the row and the end of the animal, and at the join between two pieces.
- **Fun.** Shoving the train together is the measuring, and the jumper that comes of it is the joke.
- **Guess.** Random tapping lays pieces with gaps or on top of each other and always makes a jumper, a draughty or lumpy one; it fits closely only when ends are brought together and the laying stops at the tail.

## The error as a consequence

Nothing is refused and nothing is marked wrong. A gap between pieces, or between the pincushion and the first piece, is a hole with skin in it: a little wind whistles through and the skin there goes blue and dimpled. Two pieces on one spot are a double ring that bulges and squeaks when the customer breathes. A row that stops short leaves the tail out: blue, shaking, with a drip that freezes. A row that runs on leaves empty rings on the table past the tail, and the mice trip over them and wear the cake. Each shows exactly where it happened. The row stays on the strip under the jumper, so the child changes one piece and touches the magpie again. A close fit gets no cheer: the customer stops shivering, stretches and goes pink at the cheeks.

## The designed order, and what is stored

Lengths, in ducks for this sheet only: a duck is the shortest piece, a shoe is one and a half ducks, a sausage two. Crocodile ten, dog six, snail five, seal seven and a half, python eleven and a half.

1. `croc-alone`: the crocodile; only the sausages are uncovered. New: laying end to end along somebody.
2. `dog-shorter`: the dog. New: the row can be too long for somebody.
3. `snail-in-ducks`: the snail; the ducks are uncovered. New: a length that sausages do not come out to.
4. `seal-in-shoes`: the seal; the shoes are uncovered. New: a third measure.
5. `python-mixed`: the python. New: a length that comes out only with two kinds together.
6. `snails-share`: two snails in one jumper. New: two customers and one row.
7. `dog-and-snail`: a dog and a snail in one jumper. Combination.
8. `full-shop`: the customers and the pairs in turn, for as long as the child likes.

A covered tray can be torn open by the child at any position, and stays open: that is the harder option, seen and chosen in the world. Every customer and pair has at least one close fit from the trays its position uncovers.

The position moves when the child calls in the next customer. Well: the one who leaves wears a jumper with no hole, no bulge, not short and not long. Badly: it wears one with three or more of those faults. Mixed, which moves nothing: anything else. A close fit is judged with a little room on purpose. The waiting customer was laid out before that, so a new position lays out the one after next: the touch that moves the position brings in the one who stood waiting, and a new one, from the place after the new position, comes to the door.

Stored: the version; the position; who lies on the table (one or two); the row (each piece's kind and place, in the order they lie on each other); the jumper worn, as a row; who waits; the place in the turn of `full-shop`; which trays are open; who was last dressed, with that jumper. `finished` is always false: the touch that ends a cycle begins the next. Not stored, and gone on load: a gust, wriggles, an act, a thing in the hand (saved where it came from), the cake on a mouse.

## The characters and their fixed tastes

The want of every customer is to be warm, seen in its shivering bare skin; the one who waits at the door shivers too, and holds up the thing it loves, turned to the child.

- **The crocodile.** Long, vain, easily tickled. Loves sausages, is afraid of ducks, does not mind shoes.
- **The dog.** Long and low, eager. Loves shoes, takes sausages for relations and is shocked, argues with ducks.
- **The snail.** Slow, hopeful. Loves ducks for going so fast, dislikes shoes and shuts itself in, pokes sausages.
- **The seal.** No feet and wishes she had. Loves shoes, dislikes sausages, balances ducks.
- **The python.** Forgets how long she is. Loves sausages, has no use for shoes, and cannot look at a duck without crossing her eyes.
- **The magpie tailor.** Wants foil, sits on her pile of it, and snips at anything laid in a row.
- **The two mice.** Want their cake upright.

No one is disappointed in the child.

## The scenes

- **Snipping**, caused by a touch on the magpie: she hops along the row, a ring peels off over each piece with that piece's crackle, the rings fly up and close round the customer from neck to tail, and the consequence lands. 3 to 5 s. Filled in from the row. What is worn is saved when it starts. A touch lands it.
- **Next, please**, caused by a touch on the waiting customer while one is worn: the pieces hop home, the one on the table gets down and goes off in the jumper in its own gait (a bare tail chatters, a long end drags the mice along), passes outside the window in the snow, and the next lies down; another comes to the door. If a tray is uncovered by the new place, the magpie tears it open last. 5 to 6 s. Everything it changes (position, who lies, the empty row, nothing worn, who waits, the turn, open trays, who is outside) is saved when it starts. A touch lands it. With nothing worn, a touch on the waiting one only makes it call and wave.
- **Lying down together**, caused by a waiting customer let go behind the one on the table, or by a pair's place in the order: bellies bump, the second rests its chin on the first. 1 s; who lies, who waits and the turn are saved when it starts. What is worn stays worn, and is now short.

A cycle ends only with the child's touch on the one who waits, and that touch starts the next. If nobody touches, the dressed customer lies there, warm or not, and nothing starts. No scene plays on load.

## The records

### us-ca

Level, as the lookup prints it: age 4 is `preschool-tk`, age mapping official; the two printed bands overlap for the whole of age 4, so both statements of a foundation apply. At age 5 the lookup returns `preschool-tk` (Later) and `kindergarten`; the game names records of the first only. No gap is printed at either age.

- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-3-0-measurement-and-data-3-3` (`us-ca` 3.3, Measurement and Data): department-published-foundation, confirmed. In the game's words: at the later age, laying real things one after another along something to find how long it is.
  Limits taken: later age only, so for a child at the earlier age the game rests on nothing here; length only; the units are physical objects placed one after another; no ruler and no standard unit; a row of mixed lengths is allowed. Taken in part: the game never asks for the number. Not in Limits, and the game's own choice: the three lengths, and how many pieces a row has.
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-3-0-measurement-and-data-3-1` (`us-ca` 3.1, Measurement and Data): department-published-foundation, confirmed. In the game's words: seeing that one thing is longer than another, here the row and the animal it lies beside.
  Taken in part: length only, not weight or capacity, and by looking; the game never asks for it to be said. Limits taken: two things at a time, and no unit or number in this part; how they are compared is left open by Limits, and side by side is the game's own choice.

### nl

Level, as the lookup prints it: ages 4, 5 and 6 reach `fase-1`, age mapping convention; the statement is for groep 1 to 3 and no year is named. At age 4 `peuters` is returned as well, up to the fourth birthday, and the game uses no record of it. The `einde-po` lane is returned beside these, labelled end-of-primary goals; none of it is used. No gap is printed.

- `edu.nl.fase-1.mathematics.objective.725c4b88-a86b-4980-a44b-0dfa14387370` (`nl` rw/m/1/05/fase1): curriculum-institute-guidance, confirmed. In the game's words: measuring with things at hand that can stand for a length.
  Limits taken: what a school offers, not what a child must do; informal measures; no metre, centimetre or ruler; length only. Taken in part: the game never asks for the result to be told. Not in Limits: sausages, shoes and ducks are the game's own choice.
- `edu.nl.fase-1.mathematics.objective.5898839b-c220-48ef-aa5d-c7e12eb9c599` (`nl` rw/m/1/07/fase1): curriculum-institute-guidance, confirmed. In the game's words: thinking about length where a situation makes it matter or turns out against what was expected, here a jumper that does not come out.
  Taken in part: length only, not the distance around a thing, and shown by doing; the game never asks for reasons. Limits taken: what a school offers, not what a child must do; which situations are suitable is left open by Limits, and these are the game's own choice.

### Where the two differ

- **Measuring with loose objects.** The California foundation has it at the later age only; the Dutch guidance names no year within fase 1. The game follows the Dutch guidance and offers it to everyone; for a child at California's earlier age it is the game's own choice.
- **Mixing lengths in a row.** The California foundation allows it; neither Dutch record named here speaks of it in its Limits. The game follows California and lets every row be mixed.
- **A measure that does not come out.** It is taken from the Dutch guidance (rw/m/1/07/fase1) alone. Neither California record named here speaks of it. The game follows the Dutch guidance.
- **Standing.** The California records are foundations published by a state department and the Dutch ones guidance by the curriculum institute. Nothing in the play depends on this, and the two are not equated.

### The claim

A Jumper for the Crocodile is designed from two California preschool and transitional kindergarten learning foundations, published by a state department, in part (measuring length by laying real objects one after another, a later-age foundation, without the telling of a number; and comparing two things by length, by looking), and from two goals of guidance by the Dutch curriculum institute for fase 1, in part (measuring with informal measures, and thinking about length in situations that make it matter, both by doing and never by telling); all four records are confirmed.

## The look

