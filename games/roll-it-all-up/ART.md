<!-- template: cartridge/ART.md v3 -->
# Design sheet

The first part is the sheet, written before the game. The look follows it.

## The band and its age rule

Band 3 to 6. The 3 to 4 row of the cue table governs: no words, letters, numerals, symbols or icons to decode, one next act offered at a time, no verdicts (pack: game-design, ages-2-to-4.md; pack: game-design, ages-4-to-6.md). Everything works with a tap; a drag is the same act done continuously and survives a lifted finger, since the ball simply keeps going to where the finger last was. Targets are about 100 units across and none is in the bottom strip. `ctx.childAge` sets nothing, and `null` gives the same game.

## The toy

The finger goes anywhere on the snow and the snowball rolls there, heavy, crunching, spinning, throwing up crumbs of icing. It gets bigger by what it takes: behind it is a bare brown track. It squashes when the finger lands on the snow and when a thing sticks to it. With nothing else on screen it is a pleasure to write in the snow with it and to make it huge.

To put a ball on, the child touches the snowman, the heap or the place he pats, or drags there: the ball rolls to it and hops on by itself as soon as it arrives, from any side and without aiming. That target is at least 150 units across. A ball led past him with the finger elsewhere rolls round him and does not hop. A ball that has got as big as it can hops on by itself when the finger has let go for a moment. Any ball picks up any thing it touches, whatever the size of either.

## The object-by-action grid, and what is new on day 15

Eight things by three balls. What a thing does depends on which ball it is in.

| Thing | In the lowest ball | In the middle ball | In the head |
| --- | --- | --- | --- |
| Boot | Stomps, one thud a step | Kicks out to the side, a slap | Flaps like a tongue, a clap |
| Wheel | Rolls along without a step, a rumble | Whirls like a fan, a whirr | Head turns round and round, a squeak |
| Cat | Trots on quick paws, a patter | Purrs so that the belly shakes, a purr | Licks his face, a miaow |
| Tuba | Blasts him up at each step, a deep blast | Pumps the belly in and out, an oompah | Honks and the head is blown up and drops, a high honk |
| Rake | Drags and judders, a scrape | Scratches the belly, a scratch | Stands up and quivers like hair, a twang |
| Umbrella | Twirls him like a skirt, a swish | Opens and shuts and he swells, a flump | Lifts the head floating off the neck, a whoosh and a pop |
| Goose | Waddles from side to side, a slap-slap | Flaps and the belly rocks, a flutter | Stretches and the head bobs forward, a honk |
| Spring | Bounces high, a boing | Stretches him like a squeezebox, a twang going up | Head shoots up and bobs down, a rattle |

No cell is silent. Things in the same ball act together. A ball with nothing in it slides, sways or nods, with a soft crump. Wrong use: none is wrong; a wheel in the head is as good as a wheel underneath.

Where in the ball it sits is the child's too. What is picked up while the ball is small stays near the middle, so in a head it is a nose; what is picked up when it is big stays out at the edge, so on top it is hair, at the side an ear, below a beard.

On day 15 the child aims: a nose first, then big, then hair; wheels below and a spring above; a head as small as a pea on a giant; a tune of honks.

## The representation

No school idea. The snow on the ground and the snow in the ball are the same snow: it is taken from one and seen in the other.

## The four mechanic questions

- **Swap.** There is no school content to swap.
- **Attention.** The child looks at what the ball is about to touch and where on the ball that will be.
- **Fun.** The rolling is the play; there is nothing else to do for it.
- **Guess.** Any touch makes something. Random rolling makes a snowman and he walks.

## The error as a consequence

There is no error. A tiny head is a tiny head. No ball is refused: a small one hops on as small as it is, and he walks on it or looks out from it all the same. Each landing thumps fresh snow over every track, so a field rolled bare never stops the round. A walk always ends in a flop because something shakes free, and nobody is hurt: the heap pats the snow with both arms for the next ball.

## The designed order, and what is stored

No ladder and no positions. First visit: lowest and middle balls are there, plain, only the head is missing, and the ball in the snow is already started with the boot in it, so the first round is one roll. Every later round is three rolls: lowest, middle, head. The order is the same each time.

Stored: version; the balls on him (radius, and for each thing in it which, where, and its turn); the ball in the snow (radius, how much it has taken, place, spin, its things) or none; where each loose thing lies; which snow is bare, as a coarse grid; the random stream; whether the robin has shown the round. A hop is saved as landed, with fresh snow and the next ball in place; a landed head leaves him whole and waiting for a touch. A walk starts on the child's touch and is saved when it starts as the heap it ends in, with the things back on the snow at their landing places, fresh snow and the next ball in place. A ball still rolling at put-away is saved where it is, as big as it is, and lies still on load; a ball as big as it can be also lies still on load, and hops only after the child's next touch.

## The characters and their fixed tastes

- **The snowman** wants the next ball: two long biscuit arms, hat in one hand, pat exactly where it goes (the heap, the top of the lowest, the neck). His two eyes sit loose on the top edge of his topmost ball, or on the heap, from the first frame, and look at the ball in the snow. There is no mouth and no head. When the head hops on it squashes them and they pop up onto it, he grins, puts the hat on, and looks at the finger. He likes everything put in him.
- **The cat** dislikes being rolled up and looks indignant, and is always first to shake free.
- **The goose** likes it and looks smug; it is the next to go if there is no cat.
- **The robin** wants to be nearest the action: it follows the ball with its head and does its own small round when touched.
- **On the snow** the cat wants to be left to lie, one eye on the ball, and the goose wants a ride, its eye on the ball wherever it goes while its whole body rocks. The tree, the house, the sky and everything else that looks touchable answers a touch as itself and changes nothing.

## The scenes

- **The robin's round**, 5 seconds: beside a tiny snowman of two balls with no head, whose arms pat its neck as the big one's do, the robin rolls a pea of snow, a button sticks, the pea rolls to the tiny snowman and hops onto its neck, and its eyes pop up, it walks three steps and flops. It plays on a first visit after a second and a half without a touch. A touch on the snow, a thing or the snowman ends it at once. Its mark is saved when it starts, so cut off it is not owed again; a first visit touched or put away before it starts still owes it, and it starts at the next second and a half without a touch before the first ball has hopped. A touch on the robin plays it any time.
- **The walk**, about 8 seconds: once he is whole and has been looked at for a moment, a touch on him starts it; before that it squashes him, and a touch on the snow or a thing answers as itself; he leans, walks out across the snow and back on what is in him, shivers, one thing leaps free, and he sinks into a heap; the rest pops out and lands in the snow. From that touch to his third step a touch on him, on a thing or on the snow makes him squash with a puff of snow, and he walks on; from his third step a new touch there makes the shiver come now, wherever he is, and the heap then crawls home on its arms. With nothing in him he sneezes himself flat.
- **Ending and restart.** The heap is the ending. A small ball drops from the tree, and nothing more happens until the child rolls it. On load no scene that has started replays; only a robin's round never yet started may still come.
- **Idle guidance**, one next act, stopped by any touch. After a second and a half what can be touched glows: the ball, or he himself once he is whole. After three seconds a hand shows the act of the state: press the ball, roll over a near thing, on to the place he pats; or one tap on him. Four showings with doubling gaps, then quiet.

## The records

None. The game has no learning goal, names no record of the education pack and makes no claim.

## The look

**Gingerbread and piped icing**, the first of the two looks set aside. The spike was the real scene at 1180 by 820 and it held.

- **Palette.** Dark ginger `#5f311a` to `#8f5128` for the night slab, biscuit `#bd7a3e` with a baked edge `#8b4c22`, icing `#fffaf0` with a warm shade `#e8d6c2`, chocolate `#3a1c10`. Boiled sweets in red, gold and green, small.
- **Material.** A biscuit is a flat fill with crumbs and a darker baked edge. Everything on it is a piped line with a soft shadow below and a shade along its length. Nothing is clay: no modelling, no thumbprints. The balls are icing discs with a piped swirl that turns and a gloss that does not.
- **Contrast.** What is worked with is brown with a white outline, so that it reads on white snow and on bare biscuit. The snow is the only large white area, and what is rolled up is seen gone from it.
- **Light.** One soft gloss from the upper left, one blob shadow under each thing.
- **Motion.** The ball is heavier as it grows. Landings squash the whole stack and throw up icing. Arms follow on a spring. The cat breathes, the goose stretches to the ball, the robin turns its head, the windows glow and the chimney smokes.
- **Stills.** Sky, hills, house, trees and field are painted once. Tracks are one layer that fades when fresh snow falls.
- **Neighbours.** Removal Bears (sugar cubes and biscuit) has square white blocks and no piping; here there is no cube and every line is piped.
