<!-- template: cartridge/ART.md v3 -->
# Design sheet

## The band and its age rule

Band 2 to 6. Its youngest age is two, below the cue table's first row, so the 3 to 4 row is the ceiling and is cut further: no text, numeral or icon, one obvious want, one live activity, no double tap, pinch, tilt or shake (pack: game-design, ages-2-to-4.md). Everything essential is a tap; a drag is a second way and survives a lifted finger. Targets are 100 logical pixels or more on an iPad held wide, and none stands in the bottom strip. At most three loads and three openings stand in a house. The band starts below 6, so no word, letter, numeral or symbol is shown.

`ctx.childAge` sets only where a first visit starts: two and younger at `wide-opening`, three at `own-opening`, four at `which-way`, five and older at `other-side`. `null` starts at `wide-opening`. Every position is reached by play, and a saved position wins.

## The toy

A tap on the load: the bears bend, toss it, it spins a quarter in the air, they step apart for its corners and catch it with a squash and a cream-squeeze noise, and whatever is in it answers being that way up (the milk pours, the grandmother's bun unrolls past her nose with a ratchet, the dog sleeps on). Four taps bring it round. There is nothing to achieve: each quarter is a different small joke, and tapping faster spins faster. The answer starts when the finger lands: the load squashes and both bears' eyes go to it.

## The object-by-action grid, and what is new on day 15

Every cell is heard as well as seen; the instrument is the load's own and what it plays is the cell's.

| | On its side | Upside down | Swapped (its back) | Jammed in the wrong way | Through and down |
| --- | --- | --- | --- | --- | --- |
| Milk bath with a sugar duck (three in a row) | milk glugs out of the low end | the duck hangs by its beak, squeaking | the duck turns round and quacks to the wall | a slosh over the bear on that side, who blinks white | a long slurp and one quack |
| Sofa with a sleeping dog (a U) | the dog slides to the low arm with a zip and snores on | it hangs asleep and the snore goes backwards | only a tail, thumping | springs twang one after another | springs boing, then one snore |
| Grandmother in her armchair (a block of four cells with one more above it, which is her head) | her needles click askew | her bun unrolls with a ratchet and she hums | the bun nods and she hums lower | a hoot, and her glasses slide | a creak of rocking and clicks |
| Standard lamp with a moth (a T) | the bulb buzzes low | the light falls out of the top, fizzing | the moth taps round the glass, tick tick, to find the front | the shade rings like a glass | a click, and the moth pings |
| Piano with a mouse (an L) | a run of notes down | the lid claps and all low notes drop | the hammers patter behind | a fistful of wrong notes | a chord, and the mouse runs the keys |
| Rocking giraffe (a tall corner) | its bell rolls with a long tinkle | a long swallow going the wrong way | its tail swishes with a brush sound | its neck kinks with a squeaky hinge | it rocks, hoof on wood |

The wrong use of each works and is the funnier one.

Day 15: the child sees the right turn and the right end before the load leaves the hands, picks which of three openings a piece belongs to, and can aim a wrong heave to flatten the bear of their choice or land it on both; and uses the loose opening to choose which way up a thing will live in the house.

## The representation

A load is a flat thing made of square cells, with its cells marked by wafer seams; an opening is the same cells missing from a wall of sugar cubes of the same size. Both are drawn at one size whatever stands nearer, so what fits to the eye fits. The body of a load is plain wafer on exactly its cells, with no face, no pattern but the seams and no idle motion; a head, a neck, a bath's side or a lamp's shade is one of those cells. The passenger is the one lively thing on a load: it stays inside the outline of the cells while the load is held still, may hang or slide out of it only while answering a touch, and is back inside before the load is heaved, so it never changes what fits. That a load is a piece of furniture at all is the game's own departure from plain counters, taken for the comedy. Turning, changing ends and sliding are done to the thing itself and the hole never moves. This is the shape of the idea itself: a piece and a hole. It is school and nursery practice (a shape sorter, an inset board); no trial of this form is claimed. The order stops at objects.

## The four mechanic questions

- **Swap.** No: take away turning a shape and flipping it over to fit a hole and nothing is left to do.
- **Attention.** At the moment of the heave the child is looking at the outline of the load, the outline of the hole, and how far one is turned from the other.
- **Fun.** The skill is used in the toss, the swap and the heave, which are the liveliest moments; nothing pauses for it.
- **Guess.** At the first position half of all turns go in, by design, so the youngest is never stuck. From the third there are four turns and two openings, from the fourth up to eight ways, and from the fifth three openings, and each wrong heave shows which cubes were in the way, so looking is quicker than trying; a child may still try every way, as us-ca 4.6 describes for its earlier age.

## The error as a consequence

The bears heave it all the same. It hits the wall, and exactly the cubes its cells struck are pushed in, drop sugar and spring back one after another, so the place and the number of cells in the way are seen. The load squashes flat, squeals, peels off and falls on the bear under the side that caught: caught on the left, the left bear; on the right, the right bear; evenly, both. The bear is pressed until the cream comes out of the sides, pops up, and they hold the load again, the same way up, beneath the same opening and never over it: the bears and the load stand on a plain strip of street below the openings and above the bottom strip, so a tap on the load and a tap on an opening are never taken for each other, and an overlap test holds this at 1180 by 820 and at each other surface size the game is tested at. Where one cell only is in the way, the load sticks, strains and lets go like a cork, so nearly fitting looks different from not at all. Nothing is lost, nobody frowns at the child, and the child changes one thing.

## The designed order, and what is stored

One new thing at a time. The harder house looks harder: more openings, with more corners.

1. `wide-opening`: one wide opening that takes each of its three loads in half of their turns. New: turning.
2. `own-opening`: two openings cut to their loads, each load turned a quarter or a half away. New: the exact shape, and which opening.
3. `which-way`: two openings for pieces with four different turns. New: one turn out of four.
4. `other-side`: two openings, one of which takes its piece only after the bears change ends. New: the other side.
5. `three-openings`: three openings, three loads, turns only. One opening is loose: it takes each of two of the loads in at least two of their turns. New: a choice of opening for one load.
6. `full-house`: three openings, any load turned and swapped, one opening loose as before. The combination. Inside these houses the child picks the harder way: the loose opening is plainly wider, and the cut one beside it plainly has more corners; either is right.

The last position is made new from a seed each time. A house goes well when its wrong heaves are no more than its loads, badly when they are more than three times its loads, and otherwise is mixed. A child who bumps on purpose stays where the houses are easier, which costs nothing. The position is judged once, when the last load goes in, and the whole next house is laid out and saved at that same moment, from the new position, so the new position shows in the very next house; nothing of it is drawn before the child touches the cart except its first load, on the cart.

Stored: the version, the position, whether the house is finished, the seed, the openings (cells and place), the loads (kind, turn, side, and whether each is waiting, in the hands, or inside and in which place in the loft), where the bears stand, which bear has the left end, the wrong heaves of this house (written when a heave starts; a showing's heave is never counted), and which showings have been seen. A load that is let go sinks to the height it is carried at, so no height is stored. What a passenger looks like at rest is worked out from its load's turn and side: milk is full again when the bath is upright, and a bun is rolled again when she is. A wet bear is short-lived: it dries in a few seconds and is dry on load. From the last heave until the cart is touched, the finished house (its loads inside) and the house to come (its openings and loads) are both stored; the touch drops the finished one and sets the wrong heaves to none. The load on the cart is the first stored load of the house to come. A thing in the air is saved in the hands; a heave that will go in is saved as inside from the moment it starts.

## The characters and their fixed tastes

- **The wide bear** (left at first; three biscuits with jam) is slow and heavy. Wants a sit-down: its knees sag and its bottom hangs low whenever it stands still, and it leans toward anything with a seat. Likes being landed on: a low chuckle and a jam bubble. Dislikes the bath: shakes.
- **The tall bear** (five thin biscuits with cream) is quick and sways at the top. Wants things straight: tilts their head to the load's slant. Dislikes being landed on: goes stiff, springs back too far and wobbles. Likes the piano: sways.
- **Grandmother** (a meringue in a chair) wants to finish her knitting. Likes upside down: hums. Dislikes lying on her side: clicks faster.
- **The dog** (a brown bun) wants sleep and gets it, whatever happens, except that the piano going in makes it howl one note in its sleep.
- **The duck** wants someone to quack at and faces out; it dislikes being swapped to face the wall. **The moth** wants the bulb and points at it; it likes the lamp upright and dislikes the light falling out. **The mouse at the keys** wants noise and holds its paws over the keys; it likes the piano jammed and dislikes the lid shut over it. **The giraffe** wants to stand level and holds its chin level; it likes rocking and dislikes having its neck kinked.
- **The sugar mouse** drives the cart, and wants it empty: pats the load.
- **The cub** lives in the house and is the want of the scene: it looks out of an empty opening and pats the bare place beside it, and ducks when a load comes.

None of them looks at the child in blame or thanks, and none minds waiting.

## The scenes

- **The first showing**, once ever, after the first frame: the bears toss the first load all the way round, a quarter at a time, then heave it as they first held it, which does not fit, and it lands on the tall bear (6 s). It shows turning and heaving and never the turn that fits. Its mark is saved when it starts. A touch ends it with the load back in the hands as it was.
- **The showing of changing ends**, once ever, when the first load of the first house at `other-side` or `full-house` is in the hands: the bears change ends and change back (4 s), with its own mark, saved when it starts, and the same way out.
- **A load goes in**: the heave, the pop through, the thump, its passenger's answer, and the cub's hop on to it, 3 s; it stars the load the way up it went. Saved at its start. Any touch is taken during it, and the next load may be called at once.
- **The ending**, when the last load goes in (its outcome is saved with the last heave): the thump, the bears take hold of the front and it lifts away over the top of the picture, the lamp in the loft swings, the cub runs along the furniture and copies each thing the way up it lies (sits and bounces where it is upright, lies along it on its side, stands on its head where it is upside down) and the passenger of each answers; the bears drop on their bottoms and lean on each other. 8 s. A touch lands it at its end. The open house stays as long as the child likes, and whatever is tapped in it answers.
- **The next house** comes on the child's touch of the cart or the load on it, and of nothing else; a tap on a bear in an open house only makes that bear answer: the old house rolls off along the cloth, the new one rolls in with its front on, the bears get up, and the cart flings them the first load. On load nothing replays: an ended house is open, with the cart waiting.

Between loads of one house the bears stand with empty arms turned to the cart, and the next load comes when the child touches the cart or the load; a tap on a bear makes it turn its eyes to the cart.

## The records

### us-ca

Levels: at age 2, `infant-toddler`; at ages 3 to 5, `preschool-tk`. Age mapping: official, as the lookup prints for each age. Gap: none printed at ages 2 to 6. The lookup also returns `kindergarten` at 5 and 6, `grade-1` at 6, and the `cross-grade` lane, labelled cross-grade, at 5 and 6; no record of these is named, and at 6 the game is designed from records for younger children.

- `edu.us-ca.infant-toddler.mathematics.objective.cognitive-development-strand-2-0-emergent-mathematical-thinking-2-2` (`us-ca 2.2`): department-published-foundation, confirmed. Taken in part: foreseeing how a thing will fit, without testing each possibility. Foreseeing how a thing will move, and understanding words for size, place and direction, are not taken.
  Limits taken: it describes what children typically show at this age and is not a requirement; predicting does not rule out some trying. Left open by Limits: the shapes, the number of pieces and the kind of puzzle; the game's loads are its own choice. Not in Limits: how many openings and cells; the game's own choice.
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-4-0-geometry-and-spatial-thinking-4-6` (`us-ca 4.6`): department-published-foundation, confirmed. At the earlier age finding by trial and error how things move and where they fit, by turning, flipping or sliding until they go into a hole; at the later age relying less on trying.
  Limits taken: neither statement names shapes, a number of pieces or an amount of turning, so those are the game's own choice (quarter turns, pieces of three to five cells, at most three loads). Not in Limits: how many openings, at most three; the game's own choice. Turning and flipping over are what the game asks for; sliding is open to the child and nothing depends on it. At the later age trial and error is not gone.

### nl

No Dutch record is named. None of the records of shapes and figures read at `peuters` and `fase-1` is about turning a thing to fit.

### Where the two differ

The game follows the us-ca records throughout, as it names no Dutch record; nothing in the play depends on a difference.

### The claim

The Removal Bears is designed from California's infant-toddler foundation 2.2, in the part about how things fit, and from California's preschool and transitional kindergarten foundation 4.6; both are foundations published by a department, not standards, and no Dutch record is named.

## The look

Sugar cubes and biscuit (3D), the first reserved choice; the art guide follows here after the spike.
