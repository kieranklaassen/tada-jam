<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. Six animals each take one square in the column of what they want, and what the tallest column wants happens to everybody.

## The band and its age rule

Ages 3 to 7, so the youngest is 3: the 3 to 4 row of the cue table. No word, letter, numeral or sign; one next act offered at a time; tap and drag only, with a tap enough for a whole cycle. The only pictures are of the very things that happen (a tub, a puddle, a drum, balloons, a pillow). The pack's rules are ages-2-to-4.md for the youngest and ages-4-to-6.md above: essential targets are about 100 logical pixels and apart, none is in the bottom strip, and a drag survives a lifted finger. The squares are the exception: they stand 80 high with no gap, since a gap would spoil the graph. Quantities are four to six voters in two or three columns; the band's youngest start with four, and six, one past the pack's about five for the youngest, comes only after two wishes have been met. The basket, the snacks and the shut third picture are not there in the first two positions; they come in with the sixth animal, at `both-at-once`. So the first two votes hold nothing but animals, two pictures, the mole and the bell. `ctx.childAge` sets only where a first visit starts: 6 and older at `one-over`, 5 and younger at `mud-for-all`. `null` gives `mud-for-all`. A saved position wins.

## The toy

Tap an animal. In the same frame it squashes and calls in its own voice; then it springs through the air and squeezes itself into one square of the column it likes best, whatever its size: the elephant folds until its cheeks bulge, the mouse stands on tiptoe in all that room. The square lands with a clack one step higher in pitch than the square below. Tap it again and it leaps to the next column it can stand, and after the last of those it pops out onto the ground; everyone above drops one square with a thud each. Up, across, down is good with no goal at all. A tap on a snack sends it to the first picture, then to the next one along, then home. So every wish can be met without a drag.

## The object-by-action grid, and what is new on day 15

| | tapped | carried to a column | carried to the basket | in the bath | in the mud | dancing | flying | asleep |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pig | snort | plump clack | ears over the rim, muffled oink | scrambles, shrill squeal | rolls, happy grunts | hip bumps, low thumps | upside down, whee in falling steps | on its back, whistling snore |
| elephant | soft toot | stone creaks, deep clack | head over the rim, hollow toot | sprays itself, rushing spout | ankle-deep, one slow squelch | stamps, floor booms | tied by three balloons, worried toot | standing up, long bass snore |
| cat | miaow | slides in, dry clack | sits with its head out, purr | all legs out stiff, low moan | shakes one paw, offended mew | a stiff strut, clicks | on one claw, rising yowl | folds flat, whirr |
| giraffe | hm in two notes | neck folds, two clacks | neck stays out, reedy hum | only the head dry, glass plinks | neck drips, shuddering bray | neck snakes, sliding reed | legs dangle, flute | neck over a neighbour, piping snore |
| goat | bleat | butts in, hard clack | horns over the rim, crunch | drinks it, slurps | eats it, smacks | refuses and is bounced, hiccuping bleats | chews the string, plucked string | eyes open, rasp |
| mouse | squeak | tiny hop, high clack | only its head, tiny echo | swims laps, trickles | one ear left out, plip | runs in circles, patter | shoots up, piccolo | in the air at each breath, tick-whee |

| | on a column it lies at | on an animal | on the mole | on the ground |
| --- | --- | --- | --- | --- |
| carrot | giraffe, goat and pig come, crunches | eaten by a lover; spat back by another with that animal's cry | nibbled and handed back, a dry chirp | rolls home, wooden knocks |
| cheese | mouse, cat and pig come, soft gnaws | the same, gnawed or spat | worn on the nose, a hum | bounces home, rubbery boings |
| bun | elephant and pig come, muffled munches | the same, gulped or spat | sat on, a squeaky sigh | tumbles home, soft pats |

Five things in ten pairs: each tie plays both and adds one twist of its own (bath and mud fizzes brown bubbles; bath and dance skids; bath and fly carries everyone in bubbles; bath and sleep snores bubbles; mud and dance splatters the sky; mud and fly rains drips; mud and sleep pulls mud up as a quilt; dance and fly dances upside down; dance and sleep sleepwalks in a line; fly and sleep drifts up with each snore). Three level columns play all three at once, with the twists of their three pairs.

On day 15 the child knows every animal's taste and its one dislike, baits two columns against each other, hides the pig so that the numbers come out even, and arranges the exact tie she wants.

## The representation

A picture graph with one picture for one voter (a column of equal squares on one base line, no gaps, no number on it). It is school practice without a trial behind it in the pack. The voter itself is the object and its face on the square is the picture; the order ends at the picture, with no tally, no bar and no symbol. The face is there because it says whose square it is, which is the idea; a square and whoever is squeezed in it have no idle motion. The square is a plain slab in the column's one colour with the face of whoever stands for it. Size of body never changes size of square: that is the idea and the joke. The wall behind is bare pale stone.

## The four mechanic questions

- **Swap.** No: the graph is what is built, changed and read, and it decides what happens. Other subjects could be voted on; another skill could not be put in its place.
- **Attention.** Which column has more, which has less, and whether one move would change that.
- **Fun.** Changing one column by one animal is the moment of mischief, and the reading of the rows is the suspense.
- **Guess.** Ringing at random always gives a big, funny result. A wish can be met by luck; the graph stays on the wall and shows why.

## The error as a consequence

There is no wrong vote. An outcome nobody wished for happens in full, to everyone. The graph of that vote stays on the wall behind the muddy animals, so where one more would have been enough can be seen. The mole goes on thinking of its picture, which swells and sinks, and the bell stirs. The state stays: at the child's next touch the animals climb back into the same squares, the snacks and the basket as they were, so one thing can be changed and the bell rung again. Only when the wish was met does a new vote begin. An animal put on the one thing it cannot stand springs back, with its own cry, to what it likes best.

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

Positions, each one new thing (`WISHES` in `things.ts`): `mud-for-all` (pig, elephant, cat and mouse, mud against bath, ring the bell; the goat comes as the fifth animal and the giraffe as the sixth), `one-over` (five animals, one must move), `both-at-once` (six, a tie is met with), `make-a-tie` (two columns, make one), `third-column` (three columns, one must move), `all-three` (three level columns are met with), `from-the-top` (take the right one from the tallest of three), `one-of-three` (break a three-way tie), `level-all` (make a three-way tie), `pair-of-three` (two level and the third lower, three moves or fewer). After the last the order goes on from `both-at-once`, so nobody ever leaves town. A cycle goes well when what happened is exactly what the mole wished; then the position moves one on. Every other cycle is mixed and nothing moves. There is no badly: the same wish stays for as long as the child likes, and any bell-ring is a whole cycle, so no step down is needed. A harder option the child can pick at any time is the third picture, which is turned over by a tap and opens a third column.

The mole shows the wish of the position as it stands. When a wish is met the mole holds up the next at once; the pictures and the animals for it come in on the child's next touch.

Stored, each field repaired by itself: `v`, `position`, `finished` (the graph on the wall is a vote that has been read), `fresh` (the next position is still to be laid out; only then does a sweep clear the wall), `count` (how many animals are in town, in the order pig, elephant, cat, mouse, goat, giraffe), `ballot` (the three pictures, the third may be shut), `columns` (who stands where, bottom first), `hidden` (who is in the basket, or nobody), `snacks` (the column each lies at, or home), `coats` (per animal: clean, muddy, bubbly, fizzy), `unmet` (the last bell did not bring the wish), `stale` (everyone has climbed back and nothing is changed yet). An animal in the hand is saved where it came from; one in the air is saved where it will land. The run to the columns, the reading and the result are saved as their end when the bell is rung. Poses, splashes, balloons and fallen tiles are short-lived and gone on load. What is left of a result, the mole's mud or bubbles included, is drawn from the finished vote and goes with the sweep, except the coats. A snack eaten, spat or given to the mole is saved as home. A second animal put in the basket tips the first one out onto the ground. The third picture turns over through the things that are free and then shuts again; shut, its column is empty, its animals choose again and its snacks go home.

## The characters and their fixed tastes

Each animal's want is the picture it runs to; on the ground before the bell it has that picture in a thought beside it, looks at it and leans to it; after a result its square on the wall shows which column it was in. Put on another picture than it would like, it frowns in its square. The mole's wish hangs in a thought of the same shape, only larger: one shape means "would like this". Likes and the one dislike are in the table above. Snacks: carrot for giraffe, goat and pig; cheese for mouse, cat and pig; bun for elephant and pig. A snack put down at a picture brings its lovers there, out of another column or off the ground, and overcomes the one dislike for as long as it lies there. The snack put down last is the one that draws; left to itself later, an animal takes the leftmost of two it loves. An animal the child carries stays where it is put. A picture turned over makes everyone in a column choose again.

- **The elephant** is heavy, slow, modest and takes up more room than it means to.
- **The pig** is quick, round and for everything that is dirty. It eats all three snacks.
- **The cat** is stiff, exact and offended.
- **The giraffe** is elegant, late to notice, all neck.
- **The goat** is stubborn and tries to eat what it is given before it looks at it.
- **The mouse** is small, fast and certain that it is large.
- **The mole** rings the bell. It wants to see what it holds up in its picture. Whatever happens to everybody happens to it too.

No one's feeling is about the child. Nobody is hurt or afraid of the child.

## The scenes

- **The reading.** Cause: the bell. Those on the ground run to their columns (0.9 s). Row by row from the base line (0.5 s a row) everyone in that row hops at once and their squares sound together, a step higher each row; a column that has run out stays still. The tallest column puffs itself up, or each of the level tallest ones, and its picture climbs from under the column to the top of it and stays there for as long as the vote is on the wall. The outcome (`columns` as they are after the run, `finished`, coats, and where the wish was met `position` and `fresh`) is saved when the bell is rung. A touch that ends a scene is answered by what it lands on (a squash and its sound, the bell a swing) and does nothing more; only a later touch sweeps.
- **What is next.** Never waits for idleness. While somebody is on the ground its thought bobs; when everyone is up, and after a result, the bell swings and is ringed with light; but when everyone has only climbed back, it hangs still and the mole's thought swells until something is changed. After a bell that did not bring the mole's wish, once everyone has climbed back, the first idle demonstration is a drag of one animal from the tallest column. The hand never shows a move that grants the wish, but in `one-over`, the position that teaches that a vote can be changed.
- **The result.** Follows as the same scene, 5.5 s: everyone pops out of the wall to their own place, leaving the squares with their faces; it happens, each in its own way, the hidden one and the mole too; it thins out and they stand in what is left of it. Filled in by what won, by who was hidden and by the coats they had. A bath takes mud off.
- **A wish met.** The mole drums its feet and its picture turns into the next. Part of the same scene.
- **The sweep.** Cause: after a result, the bell, the mole, a picture, a snack or any animal. Where the order did not move on, everyone climbs back into their own square or the basket (about half a second) and nothing else changes; `finished` is cleared. Where it moved on, the old squares drop off the wall with a clatter (0.9 s), new pictures turn over, snacks go home, whoever was hidden climbs out and the animals for it come in. Then the same touch does what it does, with these exceptions: the bell and the mole only sweep, a tap on an animal that climbs back does nothing more, and a tap on a picture after a met wish only sweeps. Saved when the sweep starts: `finished`, `fresh`, `count`, `ballot`, `columns`, `hidden` and `snacks`.

Any touch ends a scene at its end. The settled town stays as long as the child likes; nothing starts by itself and nothing plays on load.

## The records

### us-ca

Level: preschool-tk, Early (3 to 4 ½ Years) and Later (4 to 5 ½ Years). Age mapping: official for ages 3 to 6, derived for age 7. Gap: none printed for ages 3 to 6; at age 7 the lookup prints that grade 2 is not in the pack. Age 5 also returns kindergarten, age 6 kindergarten and grade-1, age 7 grade-1, and each of those ages the cross-grade lane (labelled cross-grade); no record of these is used, and ages 6 and 7 are outside the level named here.

- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-3-0-measurement-and-data-3-4` (`us-ca 3.4`): department-published-foundation, confirmed. Showing data with objects, tally marks or pictographs. The game uses a pictograph made of objects (squares, each with the face of its voter); tally marks are not used.
  Limits taken: two groups, with adult help, at the earlier age; two or more groups, each marker for exactly one data point, at the later age. Not in Limits: how many voters; four to six is the game's own choice. The help of an adult that the earlier age names is not something the game gives.
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-3-0-measurement-and-data-3-5` (`us-ca 3.5`): department-published-foundation, confirmed. Taken in part: seeing which group has more or less. Saying it is not taken, since the game is wordless and does not listen.
  Limits taken: two groups at the earlier age, two or more at the later; only more or less, not how many more. Adult support is named at both ages (at the later age not for the sentence about working out which has more or less), and the game does not give it. Equal columns are the game's own choice; they are not in Limits. Judging how many moves would change the result (one move, or up to three) goes beyond this record's only more or less and is the game's own choice.

### nl

Level: peuters up to the fourth birthday, then fase-1 (the lookup gives it for groep 1, 2 and 3; the records' Limits speak of groep 1 and 2, about ages 4 to 6). Age mapping: convention. Gap: none printed. Age 7 also returns fase-2, of which no record is used. Ages 4 to 7 also return the end-of-primary lane, labelled end-of-primary goals; no record of it is used.

- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-verbanden-2` (`nl 2`, peuters, Verbanden): curriculum-institute-guidance, confirmed. Trying out together how a picture graph is made. Taken in part: the trying out; the doing it together is not taken.
  Limits taken: it describes what is offered, not what a child must be able to do; no finished or correct graph is mentioned; no numerals, axes or tally marks. Doing it together is the record's word: someone beside the child is not something the game gives.
- `edu.nl.fase-1.mathematics.objective.inhoudskaart-rekenen-wiskunde-fase-1-verbanden-2` (`nl 2`, fase 1, Verbanden): curriculum-institute-guidance, confirmed. Making a picture graph. A bar chart, its other form, is not used.
  Limits taken: it is what a school offers, not what a child must do; no number of columns or range is set. Two or three columns is the game's own choice.
- `edu.nl.fase-1.mathematics.objective.inhoudskaart-rekenen-wiskunde-fase-1-verbanden-3` (`nl 3`, fase 1, Verbanden): curriculum-institute-guidance, confirmed. Reading something off a picture graph. Taken in part: most, least and equal, by acting on it; saying how many is not taken.
  Limits taken: no number range is set and it does not say which information is read.

### Where the two differ

California prints two groups for its earlier age and does not name equal groups; the Dutch records set no number of columns. The game follows California in starting with two columns for the youngest, and no position depends on any other difference; a child under four and a half who goes on past `make-a-tie`, or opens the third picture, meets three columns, which goes beyond 3.4 and 3.5 at the earlier age and is the game's own choice. The Dutch peuter record speaks of doing it together and the Californian ones of an adult's support; the game gives neither and says so.

### The claim

The Animals Vote is designed from the California Department of Education's preschool and transitional kindergarten foundations 3.4 and, in part, 3.5, which name adult support (3.4 at the earlier age only) that the game does not give, and from SLO guidance for peuters (Verbanden 2 in part: trying out a picture graph, without the doing it together) and for fase 1 (Verbanden 2 for the picture graph, and 3 in part); all five records are confirmed, and the voters are characters, not the child's own group.

## The look

Mosaic tiles, the first look taken; the backup (Cloisonné enamel) was not tried. A town square laid from edge to edge in small uneven stones with pale grout.

- **Laying** (`mosaic.ts`). A shape is filled with grout, the lines of even depth inside its outline are traced, and stones are laid along them, so the stones follow the shape. The outermost row is dark: the mosaic draws with it. Nothing lies on a grid, which is what keeps it from reading as pixels. Dark stones lie in dark grout, or a brown thing reads as a net. What is thinner than its stones is laid in smaller ones. A few stones are glass, with a glint.
- **Colours.** Ochre, terracotta, limestone, slate blue, sage and wine for the square. Five clear colours belong to the five things and to their squares: bath blue, mud brown, dance red, fly yellow, sleep violet.
- **The graph is the plainest thing.** Its wall is large pale stones a shade apart, with no figure on it. A square is one flat slab without stones, all of one size on one base line; whoever is in it is drawn a little smaller than the slab, so the slab frames everybody alike, and only ears, horns and tails stick out.
- **Animals** are laid twice: large for the ground, and squeezed for a square. Every coat is laid as one picture. Eyes are two pictures (white stone, dark glass) so a glance is a move of one of them. Mouths are drawn live.
- **Layers.** Square, bell, mole, pictures, graph, basket, animals (the furthest first), snacks, weather. In front of somebody sitting in a tub is the tub; the mouse in mud is cut off at the ground.
- **Surfaces.** The square is laid once for a size of the surface, past the stage's edges.
