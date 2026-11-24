<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. Six animals each take one square in the column of what they want, and what the tallest column wants happens to everybody.

## The band and its age rule

Ages 3 to 7, so the youngest is 3: the 3 to 4 row of the cue table. No word, letter, numeral or sign; one next act offered at a time; tap and drag only, with a tap enough for a whole cycle. The only pictures are of the very things that happen (a tub, a puddle, a drum, balloons, a pillow). Quantities are four to six voters in two or three columns; the band's youngest start with four. `ctx.childAge` sets only where a first visit starts: 6 and older at `one-over`, 5 and younger at `mud-for-all`. `null` gives `mud-for-all`. A saved position wins.

## The toy

Tap an animal. In the same frame it squashes and calls in its own voice; then it springs through the air and squeezes itself into one square of the column it likes best, whatever its size: the elephant folds until its cheeks bulge, the mouse stands on tiptoe in all that room. The square lands with a clack one step higher in pitch than the square below. Tap it again and it pops out; everyone above drops one square with a thud each. Up, down, up, down is good with no goal at all.

## The object-by-action grid, and what is new on day 15

| | tapped | carried to a column | carried to the basket | in the bath | in the mud | dancing | flying | asleep |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pig | snort | plump clack | lid bounces, muffled oink | scrambles, shrill squeal | rolls, happy grunts | hip bumps, low thumps | upside down, whee in falling steps | on its back, whistling snore |
| elephant | soft toot | stone creaks, deep clack | bottom sticks out, hollow toot | sprays itself, rushing spout | ankle-deep, one slow squelch | stamps, floor booms | tied by three balloons, worried toot | standing up, long bass snore |
| cat | miaow | slides in, dry clack | curls at once, purr | all legs out stiff, low moan | shakes one paw, offended mew | a stiff strut, clicks | on one claw, rising yowl | folds flat, whirr |
| giraffe | hm in two notes | neck folds, two clacks | neck stays out, reedy hum | only the head dry, glass plinks | neck drips, shuddering bray | neck snakes, sliding reed | legs dangle, flute | neck over a neighbour, piping snore |
| goat | bleat | butts in, hard clack | eats the rim, crunch | drinks it, slurps | eats it, smacks | refuses and is bounced, hiccuping bleats | chews the string, plucked string | eyes open, rasp |
| mouse | squeak | tiny hop, high clack | vanishes, tiny echo | swims laps, trickles | one ear left out, plip | runs in circles, patter | shoots up, piccolo | in the air at each breath, tick-whee |

| | on a column it lies at | on an animal | on the mole | on the ground |
| --- | --- | --- | --- | --- |
| carrot | giraffe, goat and pig come, crunches | eaten by a lover; spat back by another with that animal's call | nibbled and handed back, a dry chirp | rolls home, wooden knocks |
| cheese | mouse, cat and pig come, soft gnaws | the same, gnawed or spat | worn on the nose, a hum | bounces home, rubbery boings |
| bun | elephant and pig come, muffled munches | the same, gulped or spat | sat on, a squeaky sigh | tumbles home, soft pats |

Five things in ten pairs: each tie plays both and adds one twist of its own (bath and mud fizzes brown bubbles; bath and dance skids; bath and fly carries everyone in bubbles; bath and sleep snores bubbles; mud and dance splatters the sky; mud and fly rains drips; mud and sleep pulls mud up as a quilt; dance and fly dances upside down; dance and sleep sleepwalks in a line; fly and sleep drifts up with each snore).

On day 15 the child knows every animal's taste and its one dislike, baits two columns against each other, hides the pig so that the numbers come out even, and arranges the exact tie she wants.

## The representation

A picture graph with one picture for one voter (a column of equal squares on one base line, no gaps, no number on it). It is school practice without a trial behind it in the pack. Object stands for voter at once and stays a picture; no tally, no bar, no symbol. The square is a plain slab in the column's one colour with the face of whoever stands for it. Size of body never changes size of square: that is the idea and the joke. The wall behind is bare pale stone.

## The four mechanic questions

- **Swap.** No: the graph is what is built, changed and read, and it decides what happens. Other subjects could be voted on; another skill could not be put in its place.
- **Attention.** Which column has more, which has less, and whether one move would change that.
- **Fun.** Changing one column by one animal is the moment of mischief, and the reading of the rows is the suspense.
- **Guess.** Ringing at random always gives a big, funny result. A wish can be met by luck; the graph stays on the wall and shows why.

## The error as a consequence

There is no wrong vote. An outcome nobody wished for happens in full, to everyone. The graph of that vote stays on the wall behind the muddy animals, so where one more would have been enough can be seen. The state stays until the child begins again. An animal put on the one thing it cannot stand springs back, with its own cry, to what it likes best.

## The designed order, and what is stored

Tastes, best first; the last is the one it cannot stand:

| | | | | | |
| --- | --- | --- | --- | --- | --- |
| pig | mud | fly | dance | sleep | bath |
| elephant | bath | dance | sleep | mud | fly |
| cat | sleep | fly | dance | mud | bath |
| giraffe | dance | fly | bath | sleep | mud |
| goat | mud | sleep | bath | fly | dance |
| mouse | fly | dance | mud | bath | sleep |

Positions, each one new thing (`LADDER` in `config.ts`): `mud-for-all` (four animals, two columns, ring the bell), `one-over` (five animals, one must move), `both-at-once` (six, a tie is met with), `make-a-tie` (two columns, make one), `third-column` (three columns, one must move), `all-three` (three level columns are met with), `from-the-top` (take the right one from the tallest of three), `one-of-three` (break a three-way tie), `level-all` (make a three-way tie), `pair-of-three` (two level and the third lower, three moves or fewer). After the last the order goes on from `one-over`. A cycle goes well when what happened is exactly what the mole wished; then the position moves one on. Every other cycle is mixed and nothing moves. There is no badly: the same wish stays for as long as the child likes, and any bell-ring is a whole cycle, so no step down is needed. A harder option the child can pick at any time is the third picture, which is turned over by a tap and opens a third column.

The mole shows the wish of the position as it stands. When a wish is met the mole holds up the next at once; the pictures and the animals for it come in on the child's next touch.

Stored, each field repaired by itself: `v`, `position`, `finished` (the graph on the wall is a vote that has been read), `fresh` (the next position is still to be laid out), `count` (how many animals are in town), `ballot` (the three pictures, the third may be shut), `columns` (who stands where, bottom first), `hidden` (who is in the basket, or nobody), `snacks` (the column each lies at, or home), `coats` (per animal: clean, muddy, bubbly, fizzy). An animal in the air or in the hand is saved where it came from. The run to the columns, the reading and the result are saved as their end when the bell is rung. Poses, splashes, balloons and fallen tiles are short-lived and gone on load.

## The characters and their fixed tastes

Each animal's want is the picture it runs to; on the ground it looks at that picture and leans to it. Likes and the one dislike are in the table above. Snacks: carrot for giraffe, goat and pig; cheese for mouse, cat and pig; bun for elephant and pig.

- **The elephant** is heavy, slow, modest and takes up more room than it means to.
- **The pig** is quick, round and for everything that is dirty. It eats all three snacks.
- **The cat** is stiff, exact and offended.
- **The giraffe** is elegant, late to notice, all neck.
- **The goat** is stubborn and eats the ballot if it can.
- **The mouse** is small, fast and certain that it is large.
- **The mole** rings the bell. It wants to see what it holds up in its picture. Whatever happens to everybody happens to it too.

No one's feeling is about the child. Nobody is hurt or afraid of the child.

## The scenes

- **The reading.** Cause: the bell. Those on the ground run to their columns (0.9 s). Row by row from the base line (0.5 s a row) everyone in that row hops at once and their squares sound together, a step higher each row; a column that has run out stays still. The last row standing puffs itself up and its picture swells. The outcome (`finished`, coats, and where the wish was met `position` and `fresh`) is saved when the bell is rung. The bell's touch that ends another scene only swings the bell.
- **The result.** Follows as the same scene, 5.5 s: everyone pops out of the wall to their own place, leaving the squares with their faces; it happens, each in its own way, the hidden one and the mole too; it thins out and they stand in what is left of it. Filled in by what won, by who was hidden and by the coats they had. A bath takes mud off.
- **A wish met.** The mole drums its feet and its picture turns into the next. Part of the same scene.
- **The sweep.** Cause: after a result, the bell, the mole, a picture or any animal. The old squares drop off the wall with a clatter (0.6 s), new pictures turn over where the order moved on, snacks go home, whoever was hidden climbs out, and the same touch does what it does. The bell and the mole only sweep.

Any touch ends a scene at its end. The settled town stays as long as the child likes; nothing starts by itself and nothing plays on load.

## The records

### us-ca

Level: preschool-tk, Early (3 to 4 ½ Years) and Later (4 to 5 ½ Years). Age mapping: official. Gap: none printed. Ages 6 and 7 of the band are outside this level, and no record is named for them here.

- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-3-0-measurement-and-data-3-4` (`us-ca 3.4`): department-published-foundation, confirmed. Showing data with objects or pictures, one for each thing. The game uses objects (the squares); tally marks are not used.
  Limits taken: two groups, with adult help, at the earlier age; two or more groups, each marker for exactly one data point, at the later age. Not in Limits: how many voters; four to six is the game's own choice. The help of an adult that the earlier age names is not something the game gives.
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-3-0-measurement-and-data-3-5` (`us-ca 3.5`): department-published-foundation, confirmed. Taken in part: seeing which group has more or less. Saying it is not taken, since the game is wordless and does not listen.
  Limits taken: two groups at the earlier age, two or more at the later; only more or less, not how many more. Adult support is named at both ages (at the later age not for the sentence about working out which has more or less), and the game does not give it. Equal columns are the game's own choice; they are not in Limits.

### nl

Level: peuters up to the fourth birthday, then fase-1 (groep 1 and 2 are the ages of the card). Age mapping: convention. No record of the end-of-primary lane is used.

- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-verbanden-2` (`nl 2`, peuters, Verbanden): curriculum-institute-guidance, confirmed. Trying out together how a picture graph is made.
  Limits taken: no finished or correct graph is asked for; no numerals, axes or tally marks. Doing it together is the record's word: someone beside the child is not something the game gives.
- `edu.nl.fase-1.mathematics.objective.inhoudskaart-rekenen-wiskunde-fase-1-verbanden-2` (`nl 2`, fase 1, Verbanden): curriculum-institute-guidance, confirmed. Making a picture graph. A bar chart, its other form, is not used.
  Limits taken: it is what a school offers, not what a child must do; no number of columns or range is set. Two or three columns is the game's own choice.
- `edu.nl.fase-1.mathematics.objective.inhoudskaart-rekenen-wiskunde-fase-1-verbanden-3` (`nl 3`, fase 1, Verbanden): curriculum-institute-guidance, confirmed. Reading something off a picture graph. Taken in part: most, least and equal, by acting on it; saying how many is not taken.
  Limits taken: no number range is set and it does not say which information is read.

### Where the two differ

California prints two groups for its earlier age and does not name equal groups; the Dutch records set no number of columns. The game follows California in starting with two columns for the youngest, and no position depends on any other difference. The Dutch peuter record speaks of doing it together and the Californian ones of an adult's support; the game gives neither and says so.

### The claim

The Animals Vote is designed from the California Department of Education's preschool and transitional kindergarten foundations 3.4 and, in part, 3.5, which name adult support the game does not give, and from SLO guidance for peuters (Verbanden 2) and for fase 1 (Verbanden 2 for the picture graph, and 3 in part); all five records are confirmed, and the voters are characters, not the child's own group.

## The look

Written after the style spike.
