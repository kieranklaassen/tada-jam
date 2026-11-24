<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it. A dark garden with one light in the middle. Walk someone in, light the apple, set it down, and that part of the dark opens for good.

## The band and its age rule

Ages 4 to 8, so the youngest is 4: the 3 to 4 row of the cue table. No text, numeral, sign or icon to decode; one next act at a time; tap and drag only, and everything can be done with taps. The dark is blue glass and never frightens: the middle flame cannot go out, what is asleep in the dark smiles in its sleep, and nothing jumps at the child. `ctx.childAge` sets nothing: every age, and `null`, opens the same garden.

## The toy

Put a finger on the one at the gate and pull it along the path. It squashes and gives its cry as the finger lands, and runs after the finger along the spiral with its own gait, feet pattering in its own pitch. Pulled straight across a hedge it does not cross: it scurries all the way round, legs a blur, to catch up. Lights it passes ring, so running it up and down is already music. A tap sends it on its way by itself.

## The object-by-action grid, and what is new on day 15

| | pulled or sent | at the flame | set down at a place | tapped | when the garden plays |
| --- | --- | --- | --- | --- | --- |
| gnome (stumbles) | trips every fourth step, oof | sneezes, the candle lights | pats it; somersaults home | belly wobbles, hoho | beats his belly, a drum |
| goose (waddles) | honk-patter, neck out | lights it looking the other way | turns it just so; flaps home | honks, neck straight up | flaps, a honk |
| hare (hops) | boing in long hops | jumps back from it | drops it and catches it; bounds home | ears shoot up, squeak | hops, a squeak |
| bear (tiptoes, huge) | tiny tiptoe ticks, then thuds when late | blows too gently, huff | lays it down with two claws; rolls home | yawns, hmmm | claps, a low boom |
| apple, once set | (stays) | (none) | rings as a walker passes | rings its note and its sleeper does its joke | rings in its turn |
| sleeper, once awake | watches who passes | (none) | wakes with its joke | does its joke again | does its joke on its note |
| dark glass | a soft rustle and a lit trail under the finger | (none) | opens pane by pane, a rising tinkle | a murmur of sleep from whoever is in there | (none left) |
| the middle flame | bends after who passes | flares, whoomp | (none) | ducks and stands up, a low hum | stands tall |
| someone waiting behind the gate | (none) | (none) | (none) | comes to the front, its own cry, and the other steps back | bobs |

Sixteen sleepers, each with its own joke and voice, by who set the apple and the kind of place:

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
- **Guess.** Any tap does a whole step of the round, as it should: there is no wrong place.

## The error as a consequence

There is no wrong place. Two things do not yet work, and both show why: let go before the flame, the walker stands there with its unlit apple, leaning toward the flame; let go over a place that is open already, whoever lives there does its joke at the light already standing there and the walker stays with the apple in its hands. Everything stays where it is.

## The designed order, and what is stored

No ladder of difficulty: the first light and the last are the same act, and the garden is the size it is. The position of the template is not used. On the first visit the gnome is at the gate and the queue behind is goose, hare, bear; whoever has set an apple goes to the end. A walker the child calls up changes places with the front one. Stored: the version, for each of ten places (fixed ids by their order on the path) which carrier's apple stands there or none, the queue, whether the first showing has begun. The set is stored when the child sends it. A walker out with an apple, lit or not, is saved at the gate with it unlit. On load: no scene, sleepers awake beside their lights, the next one at the gate.

## The characters and their fixed tastes

One want at a time: the one at the gate wants its candle lit (leans to the flame, holds the apple out to it); once lit it wants a dark place (leans to the nearest one). Fixed opinions: the gnome is proud of everything he sets down; the goose will not look at anybody; the hare is startled by lights; the bear is afraid of waking people and wakes them all. Sleepers: each does the one joke, always the same.

## The scenes

- **The first showing.** Cause: the first visit, nothing touched for a second and a half. Beats: the gnome runs in, lights, runs out to the nearest place, sets it, it opens, he somersaults home, the goose steps up: about six seconds. Any touch takes over at once: he is where he is, with the apple as it is. Its mark is stored as it starts. The apple set in it is stored when he is sent to set it down.
- **The waking.** Cause: an apple set. Panes open from the apple outward for 0.9 seconds, then the sleeper's joke. It does not hold anything up: the next walker can be sent meanwhile.
- **The tune, the ending.** Cause: the last apple set, after its waking. The lights ring in the order of the path, each sleeper doing its joke on its note, then all together with the ones at the gate, about seven seconds. Any touch ends it. It saves nothing: the last set already did. If the child does nothing, nothing follows; a finger plays the lights as long as it likes.
- **The puff, the new night.** The one at the gate has empty hands and full cheeks, the one thing that asks. Cause: a tap on it, or on anyone at the gate. Everything is stored dark as it starts. The one in front blows; the lights go out from the gate inward, sleepers drop off in mid-pose, apples roll home to the basket; the middle flame bends flat, flutters, and stands up again; the blower sits down, out of breath. About three seconds; a touch ends it.

## The records

No learning goal, so none.
