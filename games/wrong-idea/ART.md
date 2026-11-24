<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it. A huge, eager butler watches the child carry one thing somewhere, decides he understands, and carries on.

## The band and its age rule

Ages 4 to 8, so the youngest is 4: the 3 to 4 row of the cue table. No text, numeral, or icon that has to be decoded to get on; one next act offered at a time; tap and drag only. The only pictures are of the very things on screen: a thought holds a pool of the colour, the bare shape of a sock, a patch of spots, or a pair of eyes. `ctx.childAge` sets only which wish is dreamed first: 6 and older start at the fourth, everyone else and `null` at the first. A saved wish wins.

## The toy

Carry a thing with a finger and let it go over the soup, the bath or the bed. The moment a finger lands the thing squashes, squeaks in its own voice and the butler's whole body turns to it: eyes, brows, gloves. While it is carried it swings behind the finger. Let go, it plops, and the place answers: soup slops over and takes a tint, the bath foams, the bed bounces and snores. With no goal at all it is good to dunk things. Let go anywhere else, the thing bounces off what is there (the king wears the sock a moment, the butler tries the hat on) and hops home.

## The object-by-action grid, and what is new on day 15

| | soup | bath | bed | on a person | poked |
| --- | --- | --- | --- | --- | --- |
| sock | plop, hangs over the rim and drips | slap, fills like a water balloon and squirts | flump, tucked up to its toe | worn on the nose, a muffled honk | a rubbery twang |
| hat | floats and turns like a boat, hollow tock | drums under the drips, pat-pat | pops up as a nightcap, fwip | worn, a proud hum | a hollow tock |
| teapot | gulps, glug in three falling notes | whistles bubbles | snores through the spout, a whistling snore | worn, spout over the eye, clink | a clink |
| cat, hen, piglet | yowls, paddles; clucks; grunts | flat wet ears; puffed feathers; pink | each its own snore | sits on the lap | each its own voice |
| king, queen, grandmother | harrumphs; shrieks then tastes it; cackles | sings low; gasps high; blows foam | deep, whistling and giggling snores | (people are not put on people) | each its own voice and gesture |
| the butler | stands to attention in it, salutes | a rubber-duck squeak | stiff as a board | (nothing: he is the one who serves) | a bow, gloves first |

On day 15 the child picks the two things that give him exactly the rule she wants: spotted and blue for the queen alone, two animals for everyone alive, two things with nothing in common for the whole house, then pulls the grandmother out so that only she stays dry.

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

The learner is one fixed opinion: colour first, then what sort of thing, then spots, then being alive. One example gives one feature; two or more give all they share; nothing shared gives everything. Pull out something he fetched and, with one example, he takes the next feature that leaves it out; if none does, he leaves that one thing alone.

| Examples | His idea |
| --- | --- |
| red sock | red |
| red sock, blue sock | socks |
| red sock, red hat with spots | red |
| red sock, red king's neighbour the piglet | red |
| blue sock with spots, red hat with spots | spots |
| blue sock with spots, the hen | blue with spots |
| cat, piglet | alive |
| red sock, yellow teapot | everything |
| red sock, king pulled out | socks |

Stored, all rebuilt defensively: `v`; `at` (where each thing ends up, by stable id); `examples` and `nots` per place, in order; `butler` (the place he has put himself, or none); `wish` (a stable id in the list), `dreaming` (a wish is on show), `begun` (the first idea has been had). A thing in the hand is saved where it came from. The butler's errand is a view of the state: on load it is done. Worn things are short-lived and are home on load.

Wishes in order: `king-soup`, `queen-bath`, `gran-bed`, `king-bath-hats-dry`, `queen-soup`, `butler-bath`, `king-soup-queen-bath`, `all-bed`, `queen-bed-king-dry`, `all-soup-gran-dry`, then round again. A wish names who must be where and who must be at home. The next wish is dreamed when the child pokes the grandmother or pulls the bell, never by itself. A wish met moves on one; one not met never moves and nothing is said about it. A wish already true when it is dreamed counts as a joke already told: the next one that is not true is taken.

## The characters and their fixed tastes

- **The butler** wants to be of use. Likes: understanding. Hates nothing. Enormous, springy at the knee, white gloves that arrive before he does. He thinks with his eyebrows.
- **The king** (red cape) wants to stay dry and important. Slow, heavy, all belly and crown. In soup he harrumphs; in bed he is out at once.
- **The queen** (blue, spotted gown) wants nothing to touch her. Quick, vertical, all neck. Shrieks, then secretly tastes the soup.
- **The grandmother** (yellow, tiny, in a vast chair) wants mischief. All shoulders and teeth. Dreams it in a bubble and cackles till her chair walks.
- **The cat** (yellow) disapproves. **The hen** (blue, spotted) is surprised by everything. **The piglet** (red) loves everything.

Nobody's feeling is about the child, and nobody is hurt. The soup is cold: it never steams.

## The scenes

- **An idea.** Cause: a thing put in or pulled out. Beats: freeze with brows flying (0.3 s), the bubble shows the examples (0.7 s), what they share stays and the rest falls away (0.6 s), gloves up, off he goes. Filled with the actual examples. A touch on anything is answered meanwhile, and a new example starts a new idea from where he stands. Saved as the outcome when the thing lands.
- **The wish comes true.** Cause: the shown house meets the wish. 5 s: the grandmother sees it, shakes, cackles, her chair walks, the bubble pops. Saved when it starts (`wish` moved on, `dreaming` off). Any touch ends it. Nothing replays on load.
- **He includes himself.** Cause: the rule is alive or everything. He looks at his bubble, at himself, straightens his tie, and jumps. He stays in until the next act.
- **Tidying.** Cause: the bell rope pulled down. Everyone and everything hops home dripping; the ideas pop. Open play has no other ending; the house stays as it is as long as the child likes.

## The records

A game with no learning goal has no records part.
