<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it. A huge, eager butler watches the child carry one thing somewhere, decides he understands, and carries on.

## The band and its age rule

Ages 4 to 8, so the youngest is 4: the 3 to 4 row of the cue table. No text, numeral, or icon that has to be decoded to get on; one next act offered at a time; tap and drag only. The only pictures are of the very things on screen. A thought holds a pool of the colour, the bare shape of a sock, hat, teapot or animal, a patch of spots, a pair of eyes, or, for everything, all the kinds heaped up; a spared thing is not pictured, it is seen to stay. A wish shows its place with those who must be in it, and those who must stay dry standing small beside it. No cross and no sign. `ctx.childAge` sets only which wish is dreamed first: 6 and older start at `queen-soup`, 5 and younger at `king-soup`. `null` gives `king-soup`. A saved wish wins.

## The toy

Carry a thing with a finger and let it go over the soup, the bath or the bed. The moment a finger lands the thing squashes, squeaks in its own voice and the butler's whole body turns to it: eyes, brows, gloves. While it is carried it swings behind the finger. Let go, it plops, and the place answers: soup slops over and takes a tint, the bath foams, the bed bounces and snores. With no goal at all it is good to dunk things. Let go anywhere else, the thing bounces off what is there (the king wears the sock a moment, the butler tries the hat on) and hops home.

## The object-by-action grid, and what is new on day 15

| | soup | bath | bed | on a person | poked |
| --- | --- | --- | --- | --- | --- |
| sock | plop, hangs over the rim and drips | slap, fills like a water balloon and squirts | flump, tucked up to its toe | worn on the nose, a muffled honk | a rubbery twang |
| hat | floats and turns like a boat, hollow tock | drums under the drips, pat-pat | pops up as a nightcap, fwip | worn, a proud hum | a hollow tock with a puff of dust |
| teapot | gulps, glug in three falling notes | whistles bubbles | snores through the spout, a whistling snore | worn, spout over the eye, a hum and a clink | rings its lid |
| cat, hen, piglet | yowls and paddles; clucks; grunts | a flat-eared moan; a puffed squawk; a happy squeal | low, whirring and snuffling snores | sits on the head a moment, in its own voice | miaow; surprised bok; oink |
| king, queen, grandmother | harrumphs; shrieks then tastes it; cackles | sings low; gasps high; blows foam | deep, whistling and giggling snores | let go on another person: both cry out and the one let go bounces home | huffs; a sharp ooh, neck out; hee-hee, teeth out |
| the butler (he puts himself there) | stands to attention and salutes | a rubber-duck squeak | stiff as a board, one long creak | a thing let go on him: he tries it on with a pleased hum | a bow, gloves first, hm-hm |

On day 15 the child picks the two things that give him exactly the rule she wants: the blue sock and the hen, so that the queen is the only one he fetches, two animals for everyone alive, two things with nothing in common for the whole house, then pulls the grandmother out so that only she stays dry.

## The representation

No school idea is taught and none is claimed. What is in the objects is evidence: each thing has a colour, a kind, perhaps spots, perhaps a pulse. The things are plain: one flat colour, one clear silhouette, spots or no spots.

## The four mechanic questions

- **Swap.** No: the butler's rule is made of what is shared by what she carried.
- **Attention.** What two things have in common, and what else has it.
- **Fun.** The choice of the second thing is the joke.
- **Guess.** Random carrying always gives a big, funny result, and a wish can be met by luck; the rule is on show each time, so luck explains itself.

## The error as a consequence

There is no wrong example. An idea that is not the one she meant is carried out in full, in front of her, with its picture over his head and on the place. She changes it by one more thing, or by pulling one out. Everything stays where it is.

## The designed order, and what is stored

The learner is one fixed opinion: colour first, then what sort of thing, then spots, then being alive. One example gives one feature; two or more give all they share; nothing shared gives everything. Each animal and each person is the only one of its kind, so any two of them of different colours share only being alive. The butler has no colour and no spots; he is alive. Pull out something he fetched and it is remembered at that place as left out. With one example he takes the first feature, in his order, that leaves out everything left out there, then the first pair, then all; if none does, he goes back to his first feature and spares those things. With two or more examples his idea stays what they share and he spares what was left out. Putting a left-out thing in there by hand makes it an example. Pulling out an example takes the example away; when the last one is gone the idea goes, and what was left out there is forgotten. Where two ideas claim one thing: the child's own example never moves; otherwise the place acted on last has it. The butler's own place is decided the same way. A person let go in another place is an example there, like any other thing. Let go again in the place it came from, a thing has not been pulled out.

| Examples | His idea |
| --- | --- |
| red sock | red |
| red sock, blue sock | socks |
| red sock, red hat with spots | red |
| red sock, piglet | red |
| blue sock with spots, red hat with spots | spots |
| blue sock with spots, the hen | blue with spots |
| cat, piglet | alive |
| red sock, yellow teapot | everything |
| red sock, king pulled out | socks |

Stored, all rebuilt defensively: `v`; `examples` and `nots` per place, in order; `order` (the places by when he last thought about them); `wish` (a stable id in the list), `dreaming` (a wish is on show), `begun` (the first idea has been had). Where each thing and the butler end up follows from these and is never stored. A thing in the hand is saved where it came from. The butler's errand is a view of the state: on load it is done. Worn things are short-lived and are home on load. The soup's tint and the foam follow from what is in them; splashes and drips are short-lived and gone on load.

Wishes in order: `king-soup`, `queen-bath`, `gran-bed`, `queen-soup`, `butler-bath`, `king-soup-queen-bath`, `all-bed`, `king-bath-hat-dry`, `all-soup-gran-dry`, `three-ways`, then round again. A wish names who must be where and who must be at home; nothing else in the house matters to it. "All" is the king, the queen and the grandmother. The first wish is dreamed when the first idea has been carried out (`begun` and `dreaming` are saved with the act that causes that idea). Each later one is dreamed when the child pokes the grandmother or pulls the bell, never by itself. Between wishes she holds an empty bubble open and looks from place to place. The bell keeps an unmet wish on show. A wish met moves on one; one not met never moves and nothing is said about it. A wish already true when it is dreamed counts as a joke already told: the next one that is not true is taken.

## The characters and their fixed tastes

- **The butler** wants to be of use. Likes: understanding. Hates nothing. Enormous, springy at the knee, white gloves that arrive before he does. He thinks with his eyebrows.
- **The king** (red cape) wants to stay dry and important. Slow, heavy, all belly and crown. In soup he harrumphs; in bed he is out at once.
- **The queen** (blue, spotted gown) wants nothing to touch her. Quick, vertical, all neck. Shrieks, then secretly tastes the soup.
- **The grandmother** (yellow, tiny, in a vast chair) wants mischief. All shoulders and teeth. Dreams it in a bubble and cackles till her chair walks.
- **The cat** (yellow) disapproves. **The hen** (blue, spotted) is surprised by everything. **The piglet** (red) loves everything.

Nobody's feeling is about the child, and nobody is hurt. The soup is cold: it never steams.

## The scenes

- **An idea.** Cause: a thing put in or pulled out. Beats: freeze with brows flying (0.3 s), the bubble shows the examples (0.7 s), what they share stays and the rest falls away (0.6 s), gloves up, off he goes. Filled with the actual examples. A touch on anything is answered meanwhile, and a new example starts a new idea from where he stands. Saved as the outcome when the thing lands.
- **The wish comes true.** Cause: the shown house meets the wish. 5 s: the grandmother sees it, shakes, cackles, her chair walks, the bubble pops. Saved with the act that makes it certain: from that act on, a save holds `wish` moved on and `dreaming` off. If the child changes the outcome before he has carried it out, the scene does not play and the next save holds the old `wish`, dreaming, again. Any touch ends it. Nothing replays on load.
- **He includes himself.** Cause: the rule is alive or everything. He looks at his bubble, at himself, straightens his tie, and jumps. He stays in until the next act. Then he climbs out to carry, and jumps back in last if an idea still includes him. A drag on him is answered as a poke.
- **Tidying.** Cause: the bell rope pulled down. Everyone and everything hops home dripping; the ideas pop. Open play has no other ending; the house stays as it is as long as the child likes.

## The records

A game with no learning goal has no records part.

## The look

School wall chart, the first look taken; the fallback (Airbrush gradient poster) was not tried. Flat matte colours under soft crayon grain, no pen line, a house cut open from edge to edge, the print worn to canvas along two folds each way, a wooden rail at the top and the bottom.

- **Printing** (`litho.ts`). Every shape is one flat and then fourteen thin layers of dark specks on the side away from the light and of light specks on the other. The specks come from two tiles made once. Nothing is stroked round a shape; a paper bubble and a plaque have a darker flat behind them so they stand off the wall.
- **Colours.** Red `#c83a2b`, blue `#2c5fa6` and yellow `#e8b022` belong to the working things and the family and to nothing else. Walls, floor, pot, quilt and furniture are muted (sage, tan, grey-blue, plum, wood). The butler's plum, black and white are his own.
- **Working things** are plain: one flat, one silhouette, cream spots or none.
- **Movers** are cached sprites in the same grain. Eyes, brows, mouths, the queen's neck and the butler's sleeves are drawn each frame, so a glance and a stretch cost a few paths.
- **The chart** is painted once for a size of the surface, past the stage's edges: meadow, trees and earth on a surface of another shape.
- **The order of layers** is the depth: shelf, family, butler, then each place's back, what is in it, its front. What is in a place is hidden below its front edge, and a touch below that edge does not reach it.
- **Pictures in heads.** A colour is a splash of paint (a plain round read as an egg in the cold playtest), a kind is the bare shape in grey, spots are a grey patch with spots, alive is a pair of eyes, everything is the family, the animals and one thing of each kind in a heap.
