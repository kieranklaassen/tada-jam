<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it. A dark garden with one light in the middle. Walk someone in, light the apple, set it down, and that part of the dark opens and stays open until the child has the garden blown out.

## The band and its age rule

Ages 4 to 8, so the youngest is 4: the 3 to 4 row of the cue table. No text, numeral, sign or icon to decode; one next act at a time; tap and drag only, and everything can be done with taps. The dark is blue glass and never frightens: the middle flame cannot go out, what is asleep in the dark smiles in its sleep, and nothing jumps at the child. `ctx.childAge` sets nothing: every age, and `null`, opens the same garden.

The first picture, before a touch: the garden fills the frame, the gnome stands large at the gate, stretching an apple with an unlit candle toward the middle flame, the brightest thing in the picture; the path between them is the palest thing on the ground, and each of the ten dark places shows its own outline (pond, tree, burrow, moss) through the blue glass. While the candle is unlit only the one who carries it and the flame glow; once it is lit only the one who carries it and the nearest dark place glow. The waiting ones and the open places never glow. After 1.5 seconds without a touch the glow comes; after 3 the ghost hand takes the one who carries by the hand and pulls it along the path, to the flame while its candle is unlit and to the nearest dark place once it is lit. Later hands follow at doubling gaps, and any touch fades all of it. While the first showing plays there is no hand. When every place is open only the one at the gate glows, and the hand taps it. These times are shorter than the template's (3 and 5), because a real child of the youngest age did not find the loops of earlier games.

## The toy

Put a finger on the one who carries and pull it along the path. It squashes and gives its cry as the finger lands, and runs after the finger along the spiral with its own gait, feet pattering in its own pitch. Pulled straight across a hedge it does not cross: it scurries all the way round, legs a blur, to catch up. Lights it passes ring, so running it up and down is already music. A tap on the one who carries sends it one step by itself: with its candle unlit to the flame, and with its candle lit to the nearest dark place, where it sets the apple. A tap on the flame sends it to the flame if its candle is unlit. A tap on a dark place, or on the glass about it, sends it there, by way of the flame first if its candle is unlit. A new touch always wins over the walk that is under way, except that a tap on the runner itself does not turn it back. One walks at a time: while one is out or has a lit candle, a tap on someone waiting gives its cry and a hop and changes nothing.

## The object-by-action grid, and what is new on day 15

| | pulled or sent | at the flame | set down at a place | tapped | when the garden plays |
| --- | --- | --- | --- | --- | --- |
| gnome (stumbles) | trips every fifth step, oof | sneezes, and the candle lights | pats it; somersaults home | belly wobbles, hoho | hops with a wobble |
| goose (waddles) | honk-patter, neck out | lights it looking the other way | turns it just so; flaps home | honks, neck straight up | flaps |
| hare (hops) | boing in long hops | jumps back from it | sets it and starts; bounds home | ears shoot up, squeak | hops high |
| bear (tiptoes, huge) | tiny tiptoe ticks | blows too gently, huff | lays it down; rolls home | yawns, hmmm | bounces |
| apple, once set | rings softly as a walker passes, loudly under a finger | swells as a candle is lit | two close by ring a chord as a new one is set | rings its note and its sleeper does its joke | rings in its turn |
| dark glass | a soft rustle and a lit trail under the finger | (none) | opens pane by pane, a rising tinkle | a murmur in the voice of its kind of place, the sleeper rolls over, and the one who carries sets off for it | (none left: all glass is open) |
| the middle flame | bends after who passes | flares, whoomp | (none) | ducks and stands up, a low hum; an unlit carrier sets off for it | flares at the end |
| someone waiting behind the gate | (none) | (none) | (none) | comes to the front, its own cry, and the other steps back (while one is out: the cry and a hop) | bobs |

Ten places: two ponds, two hollow trees, three burrows, three patches of moss. In the dark each shows only a curled, smiling, breathing lump under the glass, the same for every place of its kind; who it turns out to be is seen as the glass opens. The carrier and the kind of place always give the same sleeper: sixteen, each with its own joke and voice.

| | gnome | goose | hare | bear |
| --- | --- | --- | --- | --- |
| pond | toad: one eye, then a burp with a bubble | duckling in a nightcap: shakes, cap spins | pike: leaps and bites its own tail | turtle: head out, legs out, all in again |
| hollow tree | owl: head goes all the way round | bat: hangs, opens its wings, hides behind them | squirrel: cheeks swell, pop | woodpecker: knocks, sees double |
| burrow | mole: comes up under its mound as a hat | worm: up, up, up, and bows | fox: wakes behind its own tail | badger: a yawn bigger than itself |
| moss | snail: eyes out one at a time | caterpillar: six shoes tap | hedgehog: sneezes into a ball | mushroom: lifts its hat, someone under it lifts theirs |

On day 15 the child calls the carriers up in an order of their own: a tune they know, and a garden with exactly the sleepers they want (a toad and a turtle in the two ponds). With four carriers in ten places there is always a garden not made yet.

## The representation

No school idea is taught and none is claimed. The Advent spiral is the rite as it is: carried in, lit, walked out, set down. The path, the apples and the flame are plain: one colour each, no faces.

## The four mechanic questions

- **Swap.** No: the light can only be carried along the path, and it stays where it is set.
- **Attention.** Who carries, and to which dark place.
- **Fun.** The choice of place and carrier is what wakes someone and what writes the tune.
- **Guess.** Yes, and it should: a tap on the one who carries, on the flame while its candle is unlit, or on the dark moves the round on; every other tap gets its own answer and undoes nothing. There is no wrong place.

## The error as a consequence

Pulled to the flame the candle lights as the walker arrives, without letting go; pulled on and let go over a dark place, the walker runs there and sets the apple. There is no wrong place. Four things do not yet work, and each shows why: let go before the flame on the bare path, the walker stands there with its unlit apple, stretched toward the flame; let go over a dark place with the candle unlit, the dark stays dark, the one asleep rolls over with a snort, and the walker stays there stretched toward the flame; let go on the bare path with the candle lit, far from any dark, the walker stands there; let go over a place that is open already, whoever lives there does its joke at the light already standing there and the walker stays with the apple in its hands. Everything stays where it is.

The one who carries stands beside a place on the path and never over it. Each of the ten places, the flame, the one in front and each one waiting has a target of its own, at least 48 px across on a tablet; `garden.test.ts` holds them apart. On a small phone held sideways the stage is drawn at about 0.48, and those who wait fall to about 34 px wide; nobody has to touch them to play.

## The designed order, and what is stored

No ladder of difficulty: the first light and the last are the same act, and the garden is the size it is. The position of the template is not used. On the first visit the gnome is at the gate and the queue behind is goose, hare, bear; whoever has set an apple goes to the end. A walker the child calls up changes places with the front one. Stored: the version; for each of ten places (fixed ids by their order on the path) which carrier's apple stands there or none; the queue; where the one who carries stands; whether its candle is lit; the place it has been sent to, or none; whether the first showing has begun. A walk that will set an apple stores its place when it starts, and a touch that takes it over clears that place and stores where the walker is. A walker under a finger is saved where it stood, with its candle as it was, when that drag began, except that reaching the flame stores the candle lit. The setter goes to the end of the queue in the same save as its apple. On load: no scene; a stored place is found set when the candle was lit, its sleeper awake and its setter at the end of the queue; otherwise the one who carries stands where it was left, and the sleepers are awake beside their lights.

## The characters and their fixed tastes

One want at a time: the one who carries wants its candle lit (leans to the flame, holds the apple out to it); once lit it wants a dark place. Fixed opinions: the gnome is proud of everything he sets down; the goose will not look at anybody; the hare is startled by lights; the bear is afraid of waking people and wakes them all. Sleepers: each does the one joke, always the same. Every one waiting behind the gate holds its own apple with its unlit candle while there are apples to carry; it is smaller, further back and does not glow, so the one in front is the one asking. When all ten places are open nobody holds an apple and the one in front has full cheeks.

## The scenes

- **The first showing.** Cause: the first visit, nothing touched for a second and a half. Beats: the gnome runs in, lights, runs out to the nearest place, sets it, it opens, he somersaults home, the goose steps up: about six seconds. Any touch takes over at once: he is where he is, with the apple as it is, and what was stored for a set not yet made is cleared. Its mark is stored as it starts, and it never plays again. If the child touches first, the mark is stored then and it is not shown: the ladder does that work. If it ends untouched it leaves one lit place, the gnome at the end of the queue, and the goose large at the gate stretching an unlit apple to the flame.
- **The waking.** Cause: an apple set. Panes open from the apple outward for about a second, then the sleeper's joke. It does not hold anything up: the next walker can be sent meanwhile.
- **The tune, the ending.** Cause: the last apple set, after its waking. The lights ring in the order of the path, each sleeper doing its joke on its note, then all together with the ones at the gate, about seven seconds. Any touch ends it. It saves nothing: the last set already did, the ten open places and the new queue included. Put away before or during the tune, the garden is found fully lit with the one in front empty-handed and full-cheeked, and no tune plays on load. If the child does nothing, nothing follows; a finger plays the lights as long as it likes.
- **The puff, the new night.** Cause: when all ten places are open, a tap on the one in front, who has empty hands and full cheeks and is the one thing that asks; a tap on one waiting still only brings it to the front, and pulling the one in front runs it along the path as the toy with no apple and blows out nothing. The touch that ends the tune never starts the puff. As it starts everything is stored at once: all ten places dark, the same queue, the one in front at the gate with an unlit candle, sent nowhere. The one in front blows; the lights go out from the gate inward, sleepers drop off; the middle flame bends flat, flutters, and stands up again. About four seconds; any touch ends it, and the garden is then dark with the one in front holding its unlit apple.

## The records

No learning goal, so none.

# The look

Stained glass and lead, canvas 2D. The whole frame is one window of Waldorf colours set in dark lead, with no wall, frame or margin around it.

- **Glass.** Every colour is glass: two or three tones of one hue, slow streaks in it (`streakTile`), a pale line along one edge where the light catches. Nothing has a flat fill of one tone, and nothing is drawn with a pen.
- **Lead.** Every shape is held by a lead line, nearly black and a little warm, heavier round people than round panes. Lead crosses the light and is never lit itself.
- **Dark and light are two windows.** `window.ts` paints the whole garden twice, in blue night glass and in its own colours. A place's panes are cut out of the second and laid over the first as it opens, so colour comes in pane by pane behind the same lead.
- **One source of light.** The middle flame, then each set apple, gives an additive glow through the glass. The path is the palest night glass, so it leads to the flame before anything is open.
- **Colour.** Night: indigo to blue-green. Open: moss and leaf greens, pond turquoise, bark violet and rose, burrow amber. Apples are the four saturated glasses (red, gold, green, rose) and nothing else is as saturated in the dark.
- **People.** Few, large pieces: a body, a head, the one thing that says who it is (hat, neck, ears, belly). Eyes are white glass with a lead pupil and look where the finger is.
- **Motion.** Glass people are rigid pieces hung on joints: they lean, squash at the feet, and turn as whole pieces. Each who carries has its own gait, hop and leap home in `motion.ts`; sleepers each have one joke in `sleepers.ts`.
- **Not in it.** Gradients on people, outlines in colour, text, stars with points as symbols of reward, and any light from outside the window.
