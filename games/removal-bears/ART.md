<!-- template: cartridge/ART.md v3 -->
# Design sheet

## The band and its age rule

Band 2 to 6. Its youngest age is two, below the cue table's first row, so the 3 to 4 row is the ceiling and is cut further: no text, numeral or icon, one obvious want, one live activity, no double tap, pinch, tilt or shake (pack: game-design, ages-2-to-4.md). Everything essential is a tap; a drag is a second way and survives a lifted finger. Targets are 100 logical pixels or more on an iPad held wide, and none stands in the bottom strip. At most three loads and three openings stand in a house. The band starts below 6, so no word, letter, numeral or symbol is shown.

`ctx.childAge` sets only where a first visit starts: two and younger at `wide-opening`, three at `own-opening`, four at `which-way`, five and older at `other-side`. `null` starts at `wide-opening`. Every position is reached by play, and a saved position wins.

## The toy

A tap on the load: the bears bend, toss it, it spins a quarter in the air, they step apart for its corners and catch it with a squash and a cream-squeeze noise, and whatever is in it answers being that way up (the milk pours, the grandmother's knitting drops past her nose, the dog sleeps on). Four taps bring it round. There is nothing to achieve: each quarter is a different small joke, and tapping faster spins faster. The answer starts when the finger lands: the load squashes and both bears' eyes go to it.

## The object-by-action grid, and what is new on day 15

Every cell is heard as well as seen; the instrument is the load's own and what it plays is the cell's.

| | On its side | Upside down | Swapped (its back) | Jammed in the wrong way | Through and down |
| --- | --- | --- | --- | --- | --- |
| Milk bath with a sugar duck (three in a row) | milk glugs out of the low end | the duck hangs by its beak, squeaking | the duck turns round and quacks to the wall | a slosh over the bear on that side, who blinks white | a long slurp and one quack |
| Sofa with a sleeping dog (a U) | the dog slides to the low arm with a zip and snores on | it hangs asleep and the snore goes backwards | only a tail, thumping | springs twang one after another | springs boing, then one snore |
| Grandmother in her armchair (a block with her head above) | her needles click askew | her bun unrolls with a ratchet and she hums | the bun nods and she hums lower | a hoot, and her glasses slide | a creak of rocking and clicks |
| Standard lamp with a moth (a T) | the bulb buzzes low | the light falls out of the top, fizzing | the moth flutters round to find the front | the shade rings like a glass | a click, and the moth pings |
| Piano with a mouse (an L) | a run of notes down | the lid claps and all low notes drop | the hammers patter behind | a fistful of wrong notes | a chord, and the mouse runs the keys |
| Rocking giraffe (a tall corner) | its bell rolls | a long swallow going the wrong way | its tail swishes with a brush sound | its neck kinks with a squeaky hinge | it rocks, hoof on wood |

The wrong use of each works and is the funnier one.

Day 15: the child sees the right turn and the right end before the load leaves the hands, picks which of three openings a piece belongs to, and can aim a wrong heave to flatten the bear of their choice or land it on both; and furnishes a whole house upside down where the openings are loose enough to allow it.

## The representation

A load is a flat thing made of square cells, with its cells marked by wafer seams; an opening is the same cells missing from a wall of sugar cubes of the same size. Both are drawn at one size whatever stands nearer, so what fits to the eye fits. Turning, changing ends and sliding are done to the thing itself and the hole never moves. This is the shape of the idea itself: a piece and a hole. It is school and nursery practice (a shape sorter, an inset board); no trial of this form is claimed. The order stops at objects.

## The four mechanic questions

- **Swap.** No: take away turning, flipping and sliding a shape to fit a hole and nothing is left to do.
- **Attention.** At the moment of the heave the child is looking at the outline of the load, the outline of the hole, and how far one is turned from the other.
- **Fun.** The skill is used in the toss, the swap and the heave, which are the liveliest moments; nothing pauses for it.
- **Guess.** At the first position half of all turns go in, by design, so the youngest is never stuck. From the third, a load has up to eight ways and three openings, and each wrong heave shows which cubes were in the way, so looking is quicker than trying; a child may still try every way, which the record for the earlier age describes as how children do it.

## The error as a consequence

The bears heave it all the same. It hits the wall, and exactly the cubes its cells struck are pushed in, drop sugar and spring back one after another, so the place and the number of cells in the way are seen. The load squashes flat, squeals, peels off and falls on the bear under the side that caught: caught on the left, the left bear; on the right, the right bear; evenly, both. The bear is pressed until the cream comes out of the sides, pops up, and they hold the load again, the same way up, in front of the same opening. Where one cell only is in the way, the load sticks, strains and lets go like a cork, so nearly fitting looks different from not at all. Nothing is lost, nobody frowns at the child, and the child changes one thing.

## The designed order, and what is stored

One new thing at a time. The harder house looks harder: more openings, with more corners.

1. `wide-opening`: one wide opening that takes each of its three loads in half of their turns. New: turning.
2. `own-opening`: two openings cut to their loads, each load turned a quarter or a half away. New: the exact shape, and which opening.
3. `which-way`: two openings for pieces with four different turns. New: one turn out of four.
4. `other-side`: two openings, one of which takes its piece only after the bears change ends. New: the other side.
5. `three-openings`: three openings, three loads, turns only.
6. `full-house`: three openings, any of them turned and swapped. The combination.

The last position is made new from a seed each time. A house goes well when its wrong heaves are no more than its loads, badly when they are more than three times its loads, and otherwise is mixed. A child who bumps on purpose stays where the houses are easier, which costs nothing. The position is judged once, when the last load goes in, and the next house is laid out when the child touches the cart, so the new position shows in the very next house; nothing of that house is drawn before the touch except its first load on the cart, which is laid out when the house before it is judged.

Stored: the version, the position, whether the house is finished, the seed, the openings (cells and place), the loads (kind, turn, side, and whether each is waiting, in the hands, or inside and in which place in the loft), where the bears stand, the wrong heaves of this house, whether the bath has wetted a bear, and whether the first showing has been seen. The load on the cart after the ending is one of the stored loads of the house to come. A thing in the air is saved in the hands; a heave that will go in is saved as inside from the moment it starts.

## The characters and their fixed tastes

- **The wide bear** (left at first; three biscuits with jam) is slow and heavy. Wants a sit-down: looks at every sofa. Likes being landed on: a low chuckle and a jam bubble. Dislikes the bath: shakes.
- **The tall bear** (five thin biscuits with cream) is quick and trembles. Wants things straight: tilts their head to the load's slant. Dislikes being landed on: goes stiff, springs back too far and wobbles. Likes the piano: sways.
- **Grandmother** (a meringue in a chair) wants to finish her knitting. Likes upside down: hums. Dislikes lying on her side: clicks faster.
- **The dog** (a brown bun) wants sleep and gets it, whatever happens, except that the piano going in makes it howl one note in its sleep.
- **The duck, the moth, the mouse at the keys, the giraffe** each have the one taste in the grid: back, light, loud, level.
- **The sugar mouse** drives the cart, and wants it empty: pats the load.
- **The cub** lives in the house and is the want of the scene: it looks out of an empty opening and pats the bare place beside it, and ducks when a load comes.

None of them looks at the child in blame or thanks, and none minds waiting.

## The scenes

- **The first showing**, once ever, after the first frame: the bears heave the first load as they hold it, which does not fit, and it lands on the tall bear (4 s). Saved as seen when it starts. A touch ends it with the load back in the hands.
- **A load goes in**: the heave, the pop through, the thump, its passenger's answer, and the cub's hop on to it, 3 s; it stars the load the way up it went. Saved at its start. Any touch is taken during it, and the next load may be called at once.
- **The ending**, when the last load goes in (its outcome is saved with the last heave): the thump, the bears take hold of the front and it lifts away over the top of the picture, the lamp in the loft swings, the cub runs along the furniture and uses each thing the way up it lies (sits and bounces where it is upright, slides down it on its side, crawls in under it upside down) and the passenger of each answers; the bears drop on their bottoms and lean on each other. 8 s. A touch lands it at its end. The open house stays as long as the child likes, and whatever is tapped in it answers.
- **The next house** comes on the child's touch of the cart, the load on it, or a bear: the new front comes down over the loft, the bears get up, and the cart brings the first load. On load nothing replays: an ended house is open, with the cart waiting.

Between loads of one house the bears stand with empty arms turned to the cart, and the next load comes when the child touches the cart, the load or a bear.

## The records

### us-ca

Levels: at age 2, `infant-toddler`; at ages 3 to 5, `preschool-tk`. Age mapping: official, as the lookup prints. Gap: none printed. The band runs to 6; no record of kindergarten or grade 1 is named for it.

- `edu.us-ca.infant-toddler.mathematics.objective.cognitive-development-strand-2-0-emergent-mathematical-thinking-2-2` (`us-ca 2.2`): department-published-foundation, confirmed. Taken in part: foreseeing how a thing will fit and move without testing each possibility. The part about understanding words for size, place and direction is not taken, as the game has no words.
  Limits taken: it describes what children typically show at this age and is not a requirement; predicting does not rule out some trying. Not in Limits: how many loads, openings and cells; the game's own choice.
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-4-0-geometry-and-spatial-thinking-4-6` (`us-ca 4.6`): department-published-foundation, confirmed. At the earlier age finding by trial and error how things move and where they fit, by turning, flipping or sliding until they go into a hole; at the later age relying less on trying.
  Limits taken: neither statement names shapes, a number of pieces or an amount of turning, so those are the game's own choice (quarter turns, pieces of three to five cells, up to three openings); at the later age trial and error is not gone.

### nl

No Dutch record is named. None of the records of shapes and figures read at `peuters` and `fase-1` is about turning a thing to fit.

### Where the two differ

The game follows the us-ca records throughout, as it names no Dutch record; nothing in the play depends on a difference.

### The claim

The Removal Bears is designed from California's infant-toddler foundation 2.2, in the part about how things fit, and from California's preschool and transitional kindergarten foundation 4.6; both are foundations published by a department, not standards, and no Dutch record is named.

## The look

Sugar cubes and biscuit (3D), the first reserved choice; the art guide follows here after the spike.
