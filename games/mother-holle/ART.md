<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The look follows the sheet at the end of this file.

The tale is the old one of Mother Holle: when her featherbed is shaken until the feathers fly, it snows below.

## The band and its age rule

Ages 3 to 7, so age 3 governs. Of the cue table's row for 3 to 4: no text, numeral or icon to decode, no spoken instruction, no verdict, one next act offered, and no tool on screen before it means something. From the pack for ages 2 to 4: everything essential works with a tap, essential targets are about 100 pixels across, a drag survives a lifted finger, nothing essential lies along the bottom edge. The band starts below 6, so no symbol of any kind is drawn.

`ctx.childAge` sets one default on a first visit only: at 4 and younger the walrus alone is at the start, at 5 and older the grandmother on her door is there too. No age given counts as 4 and younger. A saved village wins over the age.

## The toy

Shaking the featherbed. A finger that lands anywhere but on one of the six, the sun or the moon grabs the quilt, and a finger on Mother Holle or on the quilt grabs it too: in the same frame it billows with a soft whump, swings over the finger, and a puff of feathers leaves it on the way. A tap alone covers about a sixth of the hill, so a row of taps makes a whole run; a heap that is too high slumps to both sides. Moving the finger swings the quilt along and shakes it, and every bit of travel lets feathers go, with the flap of cloth and a hush that is fuller the faster the finger. The feathers rock down as feathers, curl smaller as they fall and land as snow straight below, which swells up, white and soft, under them. With no goal it is still a pleasure: a heavy soft thing that billows, and a white line drawn over a green hill.

## The object-by-action grid, and what is new on day 15

| | snowed on till it is full | slides | stops in the grass | flies off the bump | comes to the pond | meets somebody | tapped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **walrus in a bathtub** | a white cap and beard; an enormous trumpet of a sneeze throws it off | slow to start, heavy, a deep rumble, flippers up | a ploughing groan; he slops forward and back, water goes over the rim | arms wide, a long falling hoot, and the tub lands with a clang | a huge splash, then the tub floats and he lies back, blowing a fountain | grunts and settles as if it were a chair | blows water straight up, with a gargle |
| **grandmother on a door** | a tall thin hat of snow; three dry little sneezes | quick, knees bent, a swishing hiss and her skirt flat back | trips onto her toes, arms round like wheels, the door creaks | sits down in the air, shrieks with joy, slaps flat | the door skims twice with two slaps and stops, she taps her foot, it squelches | stands on them, arms out, hoo-hoo | knocks on her own door, knock knock, and somebody inside knocks back |
| **grandfather asleep in an armchair** | snow on nose and knees; one snore blows it all off | glides with a whistle on each out-breath, feet bobbing | the footrest shoots out with a boing, and he snores on | floats up out of the seat, still asleep, and drops back with a spring's twang | goes under, bubbles come up, and he comes up again still snoring | nods onto their shoulder with a smack of the lips | the chair flips back flat and up again, with a ratchet |
| **cow in a frying pan** | two horns sticking out of a white heap; she licks it away with a long slurp | spins slowly as she goes, the pan ringing, her bell clonking | spins on the spot twice, winds down with a wobbling ring | turns right over once, with a long rising moo | the pan hisses and steams, and she rocks in it, mooing low | turns to look who it is, tail up, a surprised moo | rings her bell by shaking her head |
| **hen on the hill** | only a comb shows; she shoots up out of it with a squawk, snow to both sides | she does not slide: she walks down again in the snow in quick clucks | pecks at the grass, tick tick tick | flaps hard and gets nowhere, a whirr | treads water in a circle, peeping like a duckling | is scooped onto the runner and lays an egg on the head under her with a pop | spins round once, clucking |
| **mayor with a tall hat** | the hat fills; he tips it politely and the snow comes out in a tube, with a pomp on his little horn | he does not slide: he bows and takes one step down, squeak of boots | stamps once, harrumph | holds his hat on with both hands and toots | stands up to his knees and lifts his trouser legs, plip plop | is scooped up and salutes, a toot of two notes | his hat springs up and falls back on, boing-pop |

For those who do not slide by themselves, "slides", "stops" and "flies" are what they do riding on somebody's sled or let go from a hand.

**On day 15** the child can make a hill of its own: heap the snow on the bump so that a rider clears the pond, or fill the pond over as a bridge, and stage a tower of exactly who it wants on whose head, sent down in one go.

## The representation

None. There is no learning goal and no school idea.

## The four mechanic questions

- **Swap.** There is no content to replace: the game is shaking feathers and sliding on them.
- **Attention.** Where the snow lies, and where it ends.
- **Fun.** The decision (where to snow) is the same touch as the pleasure (the shake).
- **Guess.** A random touch always snows somewhere and always pleases; making a certain jump or tower takes looking.

## The error as a consequence

Nothing is wrong. Snow in a gap-toothed line lets the sled go as far as the first gap, where it digs into the green with a thump and its rider leans out to look at the bare grass in front. The state stays: one shake over the gap and it goes on. Too much snow on somebody buries them, and they blow it off to both sides. A full quilt holds enough to cover the hill three times, so a child who snows at random gets riders down well before it is empty. Feathers are never lost, so nothing can be used up for good. A rider still on the way when the quilt is plumped stays where it is, and only those who have got to the bottom hop home.

## The designed order, and what is stored

The first picture on a first visit: a short strip of snow runs from the hilltop to the walrus and ends under his tub; in front of him is green grass, and at the bottom the pond. The quilt hangs fat over the grass just ahead of him, and he paddles and looks up at it. If no finger has landed for three seconds, Mother Holle gives the quilt one shake, a few feathers land before him as snow, and he slips about a tub's length and stops with a short groan; any touch ends it, and it does not come again once the child has touched. Its mark is saved when it starts. The first touch anywhere but on somebody, the sun or the moon lets fall enough snow to slide on; a touch on him is answered with his fountain and gargle. So there is a joke at the first touch either way.

One new thing at a time, in the order the child's own acts bring them: snow under the walrus, snow on ahead, the bump, the pond at the bottom, and past it the haystack, which puffs straw and bounces back whoever gets that far; then the grandmother comes to the start, then the grandfather, then the cow; then the empty quilt, which is patted. Nothing is locked: the hen and the mayor stand on the hill from the start, and anyone who can be seen can be dragged into play. There is no position and no ladder.

The one who waits next is visible on the hilltop behind the start, with the sled, from the first frame; it is laid out in the fixed order walrus, grandmother, grandfather, cow. It comes to the start on the child's first shake after the one before has got to the bottom.

Saved: the version; whether the first showing has been seen; how much is in the quilt; where the quilt hangs; whether the quilt is waiting to be patted; the snow as 120 whole numbers; whether it is evening. The evening ride itself is not saved. For each of the six: where along the hill, who it is sitting on, whether it has come out, which way it faces, how much snow is on it, and for the hen on whose head her egg lies, if on anyone's. Feathers and riders in the air come down at once, straight below, when the game is put away. A slide is a view: a rider put away while sliding is found stopped where it was, and goes on at the child's next shake or a tap on it; nothing slides on load. What is under a finger goes back where it came from.

## The characters and their fixed tastes

- **Mother Holle**, giant, in the cloud. Wants her featherbed shaken: she holds it out by its corners toward the green below. Likes a wild shake (her cap flies up, she laughs low and round); dislikes a flat quilt (she holds it up, looks through the cloth at the child's side of it and pats it at the air, once).
- **Walrus in a bathtub.** Wants to get down the hill: paddles on the grass, looks at the snow's end, or up at the quilt when there is none. Likes landing in water. Dislikes grass.
- **Grandmother on a door.** Wants to go fast: stands ready with bent knees. Likes the bump. Dislikes the pond.
- **Grandfather in an armchair.** Wants to be rocked to sleep by a ride: he snores with his feet paddling toward the foot of the hill. Likes a long smooth glide, at which the snore turns to a whistle. Dislikes a sudden stop, at which the footrest shoots out, his brows knit, and he snores on.
- **Cow in a frying pan.** Wants to see who is behind her. Likes company. Dislikes being upside down, which she says at length.
- **Hen.** Wants to sit on something warm: she looks at heads. Likes being on a head. Dislikes being snowed under.
- **Mayor.** Wants to stay dignified. Likes saluting from high up. Dislikes wet trousers.

One ask is on screen at a time: the quilt if it is empty; otherwise the sled furthest down the hill that is stopped short of the bottom, which rocks its sled, leans toward the bare grass in front and looks up at the quilt (the grandfather does it asleep, with his toes paddling and a snore at the quilt). The others keep their own wants in a small, still pose. When no sled is left on the hill and the quilt is not empty, the next one waiting looks down the hill, and at the child's next shake it hops to the start and asks; with none waiting, the one in the order who is down hops home to the start instead. Waiting alone moves nobody.

## The scenes

Nothing plays as a film. Short scenes, all caused by the child and all giving way to a touch:

- **The plumping.** Each touch anywhere but on somebody, the sun or the moon, while the quilt is empty: she pats it with a flat hand, a quarter of the snow rises as feathers into it. The last one: she hugs it fat, and everybody who has got to the bottom hops home up the hill, each in its own way (the tub clanks, the door flaps over, the armchair waddles, the pan rolls). Each pat saves its quarter at once. With the last pat everything it changes is saved as it starts: the hill's snow gone, the quilt full and no longer waiting, those from the bottom at the top with nobody on a head, no snow on anybody, the egg gone. Waiting does nothing: an empty quilt hangs until it is touched.
- **The evening ride.** A tap on the sun: it sinks behind the hill and the moon comes up, windows light, everybody who is out hops to the top and rides down once over the snow as it lies, each with a lantern. Mother Holle pulls the quilt up and snores. Saved when it starts: that it is evening, and everybody who is out at the top. Each one's place is saved again when it comes to rest. Put away during it, everyone is found where it had got to, by the rule for a slide, and nobody rides until a touch. If the hill has gaps, each stops at its gap. Any touch on somebody ends it for that one; a shake or a tap on the moon brings the morning.

A cycle is a hill of snow, ridden, and patted away. It ends when the quilt is empty and stays so as long as the child likes. It restarts by patting.

## The records

None: no learning goal, and no school skill is claimed.

## The look

Written after the style spike, not part of the sheet: the claimed look, the palette, materials, lighting and motion rules, and how each tier in `config.ts` keeps the look.
