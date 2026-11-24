<!-- template: cartridge/ART.md v3 -->
# Design sheet

## The band and its age rule

Ages 2 to 6. The youngest age governs (pack: game-design, ages-2-to-4.md): the 3 to 4 row of the cue table is the ceiling and is cut further. Avoid, as hard constraints: any text, numeral or picture that has to be decoded, spoken instruction, verdicts, several activities competing, and a tool that is there before it means anything. Every essential act works with a tap, every drag may be left half done, essential targets are about 100 units across and none is in the bottom strip. No symbol of any kind, since the band starts below 6.

`ctx.childAge` sets nothing. Every age, and no age, opens the same yard.

The game is for one finger or for two children with one half each. The halves are equal. Nothing needs the two to agree: agreement is one joke and disagreement is another.

## The toy

A finger takes hold of one end of a padded cloth animal and walks, lifts, drops or sits it. The other end is another finger's, or nobody's. In an empty yard the end squashes under the landing finger with a soft pat, its legs trot to keep up, they dangle and kick when it is lifted, and it lands with a thump and a squash. The cloth between the ends pulls thin with a rising creak, sags when there is too much of it, bunches when the ends meet, and flies back with a twang. Pulling something stretchy and letting it go is a pleasure with no goal, and two fingers pulling at once is a better one.

## The object-by-action grid, and what is new on day 15

The six objects are the two ends (by what they wear), the cloth, the food, the washing line and the farmer. No two cells share a sound.

| | Tap | Carry or walk | Lift and let go | Two fingers at once | Meets the farmer |
| --- | --- | --- | --- | --- | --- |
| A head end | Its own act: the horse head rears and whinnies; the hen head bows and pecks with a knock; the elephant head lifts its trunk and trumpets so that hats and leaves blow; the crocodile head gapes and snaps, and whoever is near jumps | Trots after the finger, hooves clopping in the boots of whoever is inside | Dangles with a flutter, lands with a bounce and a light thump | With the other end: trot, leap, see-saw or tower | The horse head is fed the carrot with a crunch; the hen head pecks his buttons off his shirt, one click each; the elephant head puts his hat on itself with a pop, then gives it back; the crocodile head takes the carrot and leaves him the leaves with a snip |
| A bottom end | Its own act: the horse bottom kicks with both legs and sends food flying; the hen bottom wiggles and lays an egg with a pop; the elephant bottom sits so hard that everything in the yard hops with a boom; the crocodile bottom sweeps its tail and what lies there slides with a swish | Shuffles with a soft drag | Lands sitting, with a low thump and a wobble | Squeezed against the other end: the padding lets out a long rude toot | The horse bottom swishes him in the face and he sneezes; the hen bottom lays an egg into the egg cup he holds out with a chink; the elephant bottom leans him flat against his post with a creak; the crocodile bottom shakes hands by the tail, up and down with a rattle |
| The cloth between | Ripples from the finger to both ends with a wobble note | Dragged down or up it bends and springs back with a boing | Let go from far apart: a twang, the ends slide home and bounce off each other | Crossed over: it ties into a bow with a zip; shaken together: a skipping rope with a whirr that the hen jumps | He plucks it like a string |
| Food (an apple, a carrot, an egg) | Squeaks and rolls a little | Rolls along with the finger, with a rumble | Drops and bounces with a tock | An end each side: it is batted to and fro with a pip | He catches it in his hat with a plop |
| A costume on the line | Jumps down onto its own place (a head in front, a bottom behind) with a flap, and the one worn there flies up to the empty peg; the performer is seen in spotted pants in between | Follows the finger, flapping | Let go over an end it is worn there, whatever it is, with a popper's snap; let go elsewhere it flaps back to its peg | Two costumes at once change both ends together, with a double flap | He holds it against himself, hums, and hangs it back |
| The farmer | Tosses his carrot into the yard with a whoop | Leans after the finger with a creak of braces | His braces ping back | Waves both arms, with a two-note halloo | (he is the farmer) he looks at his own feet, with a mumble |

Two heads is an animal that cannot leave; two bottoms is one that cannot arrive. Both work.

On day 15 a child can: make any of fifty-six animals on purpose, know which animal each spectator will fall for, and, with someone else's finger, make eight routines that no single finger can make.

## The representation

No school idea, so there is none.

## The four mechanic questions

- **Swap.** There is no school content to swap.
- **Attention.** At the moment of play a child watches the other half, because that is where the cloth is about to pull.
- **Fun.** The stretching is the fun and the control at once.
- **Guess.** Random tapping always produces something. Nothing is right or wrong.

## The error as a consequence

There is no task, so there is no error. A half that walks off stretches the cloth, and the yard gapes at it. A costume on the wrong end is worn. A costume let go where nothing is flaps back to its peg in sight. Food sent off either side rolls back in. Nothing is lost and nothing is refused.

## The designed order, and what is stored

There is no order of challenges and no position. The template's `state.ts` position fields are not used, and `config.ts` has no ladder.

Stored: for each half its place along the ground and whether it sits; for each of the two performers the end it wears and for each of the eight pegs what hangs there (an end is always in exactly one place); up to five pieces of food with their kind and place; whether a bow is tied; whether the show has ended. Nothing in the air, in the hand or mid-scene is stored: a half in the air is stored on the ground under it, a costume in the hand or in flight where it is going if the child let it go and at its peg if not, and an egg on its way down where it lands. No clock is read.

## The characters and their fixed tastes

Inside the animal:

- **The goose, in front.** Vain, quick, high-voiced, orange feet. Wants to see itself: left alone it goes to the puddle and admires what it is wearing, with a different pose for each costume. Refuses food with its nose in the air.
- **The bear, behind.** Sleepy, slow, low-voiced, brown feet. Wants to eat: left alone it goes to the nearest food, and a brown paw comes out and takes it. With no food it sags into a doze.

Each stays inside its own half for ever; the costumes change.

Watching:

- **The farmer, right.** Wants a horse to come for his carrot. Short-sighted: believes anything whose ends are roughly together. Most pleased by a whole horse. Doubt lifts his hat off his head and makes his moustache droop.
- **The cow, at the loft window, left.** Wants to go on chewing. Believes nearly everything. Likes a bow: her tongue comes out. Doubt stops her jaw off to one side.
- **The hen, on the post.** Wants everybody to behave. Doubts at the smallest thing, and her neck goes up and up. Adores whatever wears a hen end; turns her back on an uncovered bottom joke.
- **The pig, in the mud in front.** Wants to be let in on it. Never believes: the stranger it gets the more it laughs, and it rolls over for a leap, a thump or a toot.

Each has eyes that look at both halves: when the halves part, one eye follows each.

No one looks disappointed at the child, cheers, or asks the child to go on.

## The scenes

- **A costume change**, caused by a tap or a drop: off it flies, the performer in spotted pants, on goes the next. 0.9 s. Stored when it starts. A touch lands it at once.
- **The farmer's greeting**, caused by an end coming to him: the grid's eight, filled in from the end and from who is inside. 1.5 to 3 s. It changes nothing stored except food it makes. A touch on either half ends it.
- **The routines** are not scenes. They are answers that run beside the play.
- **The ending**, caused by both halves standing in the stable with no finger on them: the performers yawn each in their own voice, the cloth sinks to a heap, the half-door swings to, two snores rise in turn (a whistle and a rumble), and the cow draws in her head. 5 s, then it stays. The show's end is stored when it starts, so a put-away inside it finds the closed door and plays nothing. A touch while it plays lands it. The next touch on the stable opens the door, and the animal comes out as it went in. If nobody touches, nothing starts.

Open play has no other ending. The calm way to tidy is the stable.

# The look

Cloth busy-book, 2D. The whole surface is one padded cotton page seen from the front, with a bound hem. Small-pattern prints: blue pin-dot sky, quilted green hills in two ginghams, a red-checked barn with a buckled strap, a corduroy yard. Real fastenings are sewn on: a metal zip in the middle of the animal, big four-hole buttons for the spectators' eyes, poppers at the pegs, a lace as the washing line, ribbon rosettes. Stitches run round every piece. Padding is a soft inner shadow along each seam.

Palette: sky `#bcd9e6`, hills `#9cb87a` and `#7da067`, yard `#d9b98a`, barn `#c9584c`; the animals are the strongest colours: horse mustard, hen coral, elephant violet, crocodile emerald, each in its own print. Performers: goose white and orange, bear brown.

Motion: cloth. Pieces squash along the seam and settle with one overshoot. Nothing in the page moves but what is sewn on loosely.

Tiers: the pixel ratio, then the stitching on the stretched cloth, then the quilting highlights. No tier drops an answer to a touch.
