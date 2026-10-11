<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

**The idea in one paragraph.** A house of eight small rooms and one cast. In each room one thing waits to be poked, and every poke moves it one step toward its joke: the dog wakes, the balloon swells and bursts, the pies pile up and come down. Nothing is won, lost or timed, and a thing may be left at any step. What was done in one room is found in the others, the same way every time, so the child feels surprise at every door and then finds that the joke they made has followed them. The verb is to poke a thing along to its joke and to choose the next door.

## The band and its age rule

The manifest band is 6 to 10, and its youngest age, six, governs the design.

- **The cue-table rows.** The row for a youngest age of 5 to 6 in the wordless-clarity convention, read for a band that starts at 6, and the row for 7 and up. Their "Avoid" columns bind the game: no word or letter, no numeral or symbol that must be read in order to go on, no spoken instruction, no hint that gives an answer, and no timer, points or verdict chrome. More than one thing may answer at once, and each has one clear function.
- **The pack's rules for the range.** The pack has no file for 6 to 8. From `ages-4-to-6.md` the game takes what still holds at six: a place, props and characters who react, tap and drag, slapstick where the one the joke is on overreacts and is never hurt, and characters who notice only what is in front of them. From `ages-9-to-12.md` it takes what holds at nine and ten: the rules of the house are the same every time, humour is dry and not explained, overdoing a thing is large, funny and free, and nothing is babyish: no praise, no mascot that explains, no competition and no stored best.
- **The symbol rule.** The band starts at 6, so numerals and mathematics signs would be allowed on or beside a quantity. The game shows none: nothing in it is counted, and it has no `symbols.ts`. No letter and no written word is shown. No figure of the display forms a numeral, a letter or a sign, lit or unlit.
- **What `ctx.childAge` sets.** Nothing. A first visit starts the same at every age: in the bedroom, at night, with everyone asleep. Age locks and hides nothing.
- **What no age gives.** `null` starts in the bedroom at night as well.

## The toy

**The action.** Tap a thing on the display and it jumps to its next pose with a chirp of its own. That is the touch the finger performs most: every room is played with it.

**In an otherwise empty scene.** The bedroom at night. The dog is asleep on his cushion, and nothing asks for anything.

- When the finger lands on the sleeping dog, in that frame, the snore bubble bursts, one ear flips up and one eye opens, with a snort cut short by a pip.
- A second tap sits him up in a yawn as wide as his head, with a creaking yawn that slides down.
- A third tap coils him and fires him off the cushion to the ceiling. He lands with his legs splayed, shakes himself and stands with his tongue out, and each of those poses has its own sound: a coil tick, a yip that slides up, a thud, two flaps. The others in the room answer the landing one after another, each in its own time and manner.
- Awake, every tap on him is a trick: a double bark, a spin that leaves him upside down for a moment, a scratch behind the ear, a beg with a whine. The same trick never comes twice in a row.
- A pull on the lamp's cord, down and held until the lamp clicks, sends him back to bed in five poses and puts the room back as it was, so the waking can be done again. The room dims as the cord goes down, and brightens again if the cord is let go before the click. A tap on the lamp or on its cord only swings the lamp.
- Everything else in the room that looks touchable answers a tap as itself and changes nothing: the baker asleep in the big bed, the hen on the chest of drawers, the owl in the window, the fly, the dog's cushion, the lamp, the bare glass and the two buttons of the case. A tap on a door goes through it.

**Why repeating it is a pleasure with no goal.** The display has only fixed poses, so a tap is a hard little jump with a beep, like a switch thrown, and three taps always walk a thing to a punchline that is bigger than the taps: one finger sets off a leap, a landing and a room full of startled sleepers (pack: game-design, touch-answers-bigger-than-the-touch.md). Random tapping always makes something jump and chirp and never punishes, and the simplest use, a tap on the largest thing in the room, always works (pack: game-design, toy-first.md). The sounds of a run of taps make a small tune that the child plays by where they tap.

## The object-by-action grid, and what is new on day 15

Eight things, one in each room, by five things a child can do with them. Every cell looks and sounds different. The third column plays as the door opens; the fifth is what is found in another room afterwards.

| The thing, its room and its gesture | The first touch | Carried on to the end | Left as it is, and a door opened | The wrong thing touched | Found in another room |
| --- | --- | --- | --- | --- | --- |
| **The dog** on his cushion, bedroom. Tap the dog. | The snore bubble bursts, an ear flips up, one eye opens: a snort cut short by a pip | The third tap fires him to the ceiling; he lands splayed, shakes, stands with his tongue out: a coil tick, a rising yip, a thud, two flaps | Asleep, he rolls to face the wall and pulls the blanket over his head: a long two-note snore | The cushion, not the dog: it springs and he bounces a hand high, still asleep, and lands upside down: two rubbery boings | Awake, he trots through every door ahead of the child and sits by whatever can be eaten there: quick panting ticks |
| **The balloon** on the pump, fair. Tap the pump. | The baker leans on the handle, his cheeks puff, the balloon swells to the size of a melon: a rising wheeze | The third pump fills the stall and bursts it; the rubber lands on the baker's head: a sharp crack, then a flapping raspberry | Swollen, it lifts the baker onto his toes as the door opens: a rubbery squeak | The baker's belly, not the pump: he lets go and the balloon goes down one size with its neck flapping: a falling raspberry | Burst, the rubber is the baker's hat in the kitchen, the bakery and the dining room, and flaps when he turns: a soft double flap |
| **The fly** over the soup pot, kitchen. Tap the fly. | A tap beside it brings the swatter down on the spot nearest the finger; the fly hops to a spot the swatter's arm does not cross and rubs its hands: a slap and a rising buzz | A tap on the fly flattens it on the swatter; the baker salutes with the ladle: a flat splat and a buzz that drops and stops | It lands on the rim of the pot and washes its feet in the soup: a lazy wavering buzz | The baker's nose, not the fly: the swatter bops it, his cap jumps and the ladle tips soup over his head: a honk and a plop | Not swatted, it is in the bowl in the dining room, on its back, as soon as soup is served, and the diner sprays the soup out: a gargle and a spray |
| **The hen** on her nest, henhouse. Tap the hen. | She shoots straight up with every feather out and an egg drops into the basket: a squawk and a hollow tock | The third egg cracks on the pile and a chick stands up in the shell and climbs onto her head: a crack and a run of peeps | She tucks her head under her wing and sinks into the straw: two soft clucks | The basket, not the hen: it tips and one egg rolls out across the floor and back under her: a rolling rattle | With an egg laid, the pies in the bakery stand tall and domed where they were flat as plates: a puff that slides up |
| **The pies** on the baker's tray, bakery. Tap the tray. | A pie lands on the tray, his knees bend, he sways one step: a wet thump and a wobbling note | The third pie tips the tower past him and it comes down on his head; only his moustache shows through: a whistle that slides down and three splats | He tiptoes on the spot with the tower swaying over him: four tiptoe ticks | The baker's belly, not the tray: he giggles, the whole tower hops and lands in another order: a giggling trill | Toppled, he wears a pie on his face in the kitchen and the dining room and feels his way with one hand: a muffled hum |
| **The fog** on the bathroom glass, bathroom. Rub the glass. | A streak clears where the finger rubs and a foot shows through: a squeaky wipe that follows the finger | With the last patch gone the bather is caught, yelps, pulls the shower cap down and sinks to the eyes: a yelp and a glug | A wet foot comes out of the fog and wiggles its toes: three slow drips | The hot tap, not the glass: steam puffs and the top three patches fog over again: a hiss | From the three rooms beside the bathroom its door shows the bath in the clear, with the bather's foot and the duck, where it showed fog: a duck's squeak |
| **The weed** in the flower bed, garden. Pull the weed up. | It stretches like rubber and the flowers beside it lean the same way: a creaking stretch | It comes out with a root three times its length; the jolt drops the owl off its branch to hang by its feet: a pop and a hoot turned upside down | It opens an ugly bud and sticks a leaf out like a tongue: a short toot | A flower, not the weed: it comes up and the other flowers throw their petals up: a pluck and a three-note gasp | Pulled, its root is in the hen's beak in the henhouse and she leans back on it like a rope: a twang |
| **The soup** in the bowl, dining room. Tap the ladle. | The baker ladles one splash into the bowl and the diner tucks in the bib: a glug and two spoon tinks | The third ladle sends it over the rim, down the front of the cloth and onto the floor; the diner lifts both feet: a long pour and a patter | The diner nods off with its chin on the rim of the bowl: a clonk and a spoon ringing | The diner, not the ladle: the ladle goes onto its head like a helmet and soup runs off its nose: a splosh and a bong | Overflowed, the kitchen floor is awash, the pot floats and the baker stirs it from a stool: a slosh that rocks |

**The wrong use of each thing works and is funny.** The fourth column is the wrong use, and it always does something. Three of them also walk a thing back one step (the belly at the fair, the basket in the henhouse, the hot tap), so a child who has gone too far can undo by doing something silly. The belly and the basket walk back from a middle step only: at the small balloon and the burst one, and at the empty basket and the chick, the same touch plays its joke with a sound and changes nothing (the baker giggles and whatever rubber there is flaps; the basket tips with a hollow knock and the hen looks into it). The hot tap fogs the top three patches at any step. A thing at its last step still answers its own tap as itself with a pose and a sound, as the awake dog does with his tricks, and changes nothing. Over-doing is the joke and never a failure: the burst, the topple and the flood are the punchlines.

**Three meetings**, which play the same way every time and are never hinted at:

- The awake dog and the toppled pies in the bakery: he eats them where they fell, and from then on he is as round as a ball and rolls through doors instead of trotting.
- The rubber hat and the toppled pies: the top pie lands in the hat and not on the baker's face, and the first time he comes into the dining room with it he serves a slice of it from his hat. The slice lies on the cloth from then on, until the lamp puts the house to bed.
- A picked flower and a fly that was not swatted: the flower stands in the vase on the dining table, the fly sits on it, and the soup stays clean.

**On day 15** the child arranges chains on purpose: wakes the dog and has the eggs laid before the pies come down so that a round dog rolls off with tall pies inside him, or picks the flower first so that the fly stays out of the soup, and knows which doors lead there. On day 1 each joke was met by surprise. None of that needs new content: it is eight things with two to four states each that meet the same way every time, in an order the child chooses (pack: game-design, depth-from-combinations.md; pack: game-design, liveliness-from-causing-and-comedy.md).

## The representation

The game has no learning goal, so no school idea is represented in its objects.

## The four mechanic questions

The game has no learning goal, so the four questions about a school skill have no answer here.

## The error as a consequence

The house sets no task, so nothing marks an attempt as wrong. A child can still go wrong by their own plan: a step too far, or a thing done before the one it needed (the fly swatted before the flower was picked). It shows as the consequence it is: the balloon bursts where it was pumped, the tower comes down on the one who carried it, the soup runs off the table at the place it was poured. The state stays as it is and nothing gives a verdict: no buzzer, no cross, no sad face turned to the child. The child changes one thing and goes on: three of the wrong uses walk a thing back a step, any other room is one door away, and the lamp puts the whole house back to bed (pack: game-design, errors-show-as-consequences.md).

## The designed order, and what is stored

**The order.** There is no order of challenges, since nothing gets harder. The designed order has one place, with the id `house` in `LADDER` in `config.ts`, and the position never moves. No cycle is judged, so nothing goes well or badly.

**What a first visit starts with, by age.** A child of any age, six and younger and ten and older included, and a child of no age, starts in the bedroom at night with every thing at its first step. `ctx.childAge` is not read.

**What play changes.** The house is one map that never changes: eight rooms, and three doors in each. The child changes which room is on screen, whether it is night or day, and the step each of the eight things stands at.

| Room | Its three doors lead to |
| --- | --- |
| `bedroom` | `kitchen`, `bathroom`, `garden` |
| `kitchen` | `bedroom`, `dining`, `henhouse` |
| `bathroom` | `bedroom`, `dining`, `fair` |
| `garden` | `bedroom`, `henhouse`, `fair` |
| `dining` | `kitchen`, `bathroom`, `bakery` |
| `henhouse` | `kitchen`, `garden`, `bakery` |
| `fair` | `bathroom`, `garden`, `bakery` |
| `bakery` | `dining`, `henhouse`, `fair` |

Each door stands ajar and shows a corner of the room behind it as that room stands now. The doors are at the right edge of every room, with the lamp above them and the lamp's cord hanging down the edge beside them. A tap on a door is never taken for the lamp: the lamp answers a tap by swinging, and only its cord pulled down and held puts the house to bed. Nothing a child taps, rubs or pulls lies under the jam's round home control at the top centre, 48 px across and 10 px from the top: no room's thing, no door, no lamp, none of the fly's spots and neither case button. The dog's leap to the ceiling asks for no touch there. What the game brings to rest (the awake or round dog beside the food, the chick, a rolled egg, the floating pot, the diner, the fly on a spot) never covers a room's thing, a door or the lamp, and a tap on it is its own tap, never one for what is behind it. An overlap test holds both at 1180 × 820 and at 820 × 1180.

**What is stored.** Small plain JSON under one version number, read field by field. A field that is damaged or missing takes the value in brackets.

- `v`: the version.
- `position`: always `house`.
- `finished`: always false, since no cycle ends.
- `place`: the room on screen, one of the eight ids (`bedroom`).
- `day`: whether a door has been opened since the last lights out (false).
- `dog`: 0 asleep, 1 one eye open, 2 sitting up, 3 awake (0).
- `full`: the dog has eaten the toppled pies and is round (false).
- `balloon`: 0 small, 1 the size of a melon, 2 swollen, 3 burst (0).
- `fly`: 0 about, 1 swatted (0).
- `eggs`: 0 none, 1 one egg, 2 two eggs, 3 two eggs and the chick (0).
- `pies`: 0 an empty tray, 1 one pie, 2 two pies, 3 toppled (0).
- `fog`: which of the twelve patches of the glass are still fogged, as twelve bits (all twelve).
- `weed`: 0 in the bed, 1 stretched, 2 pulled (0).
- `flower`: a flower has been picked (false).
- `soup`: 0 an empty bowl, 1 one ladle, 2 two ladles, 3 overflowed (0).
- `served`: the baker has served the slice from his hat, and it lies on the dining table (false).

Everything the grid says is found in another room is drawn from these fields and has none of its own: the dog who trots or rolls ahead from `dog` and `full`, the rubber hat from `balloon`, the pie on the baker's face or in his hat from `pies` and `balloon`, the tall pies from `eggs`, the bath seen in the clear through the bathroom's door from `fog`, the fly in the bowl or on the flower from `fly`, `soup` and `flower`, the flower in the vase from `flower`, the flood in the kitchen from `soup`, the root in the hen's beak from `weed`, and who sits at the table from `dog`.

Short-lived and gone on load, so that a room is found at rest: the spot the fly sits on, which trick or variant came last, the order the pies stand in on the tray, whatever a wrong use leaves on a head or upside down (the ladle on the diner, the soup on the baker, the sleeping dog on his back, the owl hanging by its feet), the pose a character held in the middle of a joke, a door in mid-swing, the dark bloom a finger leaves on the glass, and a case button held down.

Nothing is in the hand in this game except the weed, which is saved at the step it reached and never in between. The fog is the one continuous surface and is saved as its twelve patches: while the finger rubs, a patch that clears is saved within the save throttle of 400 ms and when the finger lifts, and the last patch, which starts the punchline, is saved at once. No timer runs anywhere. The largest legal state is far below half of the 64 KB cap, and a test says so.

(pack: game-design, ordered-challenges-high-success.md; pack: game-design, many-short-visits.md; pack: game-design, the-world-keeps-and-waits.md)

## The characters and their fixed tastes

One cast of five. Each has one want that can always be seen, and likes and dislikes that never change.

- **The dog.** Wants to eat: awake, he sits by the food of whatever room he is in with his tongue out and his eyes on it; asleep, his nose twitches toward the kitchen door. Likes anything that can be eaten, pies most of all. Dislikes the bath, from which he hides behind the door, and the fly, at which he snaps and misses. Heavy and slow to start, then all at once.
- **The baker.** Wants everything neat: he is always straightening his moustache, his cap or his tower. Likes his pies standing tall. Dislikes anything landing on him, and is ticklish on the belly. Pompous and slow, and he never notices what is on his own head.
- **The hen.** Wants quiet: she is always tucking her head away. Dislikes anything sudden, and on her nest lays an egg every time she is startled, until the third egg cracks and the chick is out; from then on, and in the bedroom at night where she sleeps, a startle sends her up with a squawk and lays nothing. Likes a worm, and takes the weed's root for one. Quick and jittery.
- **The fly.** Wants the soup: it is always nearest to it. Likes the flower better than the soup. Dislikes the swatter. Never still for long, and rubs its hands when it has got away with something.
- **The owl.** Wants to watch at night and to sleep by day: it sits in the bedroom window at night with its eyes on the finger, and sleeps in the garden tree by day. Dislikes a jolt, and turns its head upside down when it is surprised.

At night the baker and the hen sleep in the bedroom with the dog. By day the baker is at the fair, in the kitchen, in the bakery and in the dining room, the hen is in the henhouse and is the bather, and the diner is the dog when he is awake and the hen when he is not. While the hen sits at the table, the bathroom's door shows the bath and the duck in the clear and no foot. A character's feelings are about what happens in the room and never about the child: nobody thanks, praises, pleads or complains of waiting.

The feedback is the reaction of whoever is in the room to the exact step the thing was taken to (pack: game-design, characters-with-opinions.md).

## The scenes

Each scene is a list of timed poses filled in from the state of play, built on `scene.ts`. Its outcome is saved when it starts. Any touch ends it at once with every figure in the pose the scene was taking it to, and that touch is then an ordinary touch. The scenes are shorter than the pack's four to ten seconds, because each is one joke between two taps and nothing may hold up the next tap.

**A punchline** (2 to 4 seconds, eight of them). *Cause:* the touch that takes a thing to its last step. *Beats:* that row's second column, and then the answer of whoever else is in the room, each in its own time. *Filled in from:* who is in the room and what they wear or carry. *Saved at the start:* that thing's field at its last step; in the bakery, with the dog awake, `full` as well.

**Through a door** (about 2 seconds). *Cause:* a tap on a door. *Beats:* the thing of the room being left does its third column; the door swings in three poses; the new room is lit with everything as it stands; the awake dog comes in first, and where he arrives at toppled pies he eats them. *Filled in from:* the step of the thing being left, the fields of the room entered. *Saved at the start:* `place`, `full` when the dog arrives at toppled pies, and `served` when the baker comes into the dining room with the pie in his hat for the first time.

**Morning** (about 3 seconds). *Cause:* the first door opened at night. *Beats:* the lamp comes on, the baker and the hen get up, each in its own manner, and go out ahead; then the scene goes on as "Through a door". *Saved at the start:* `day`, `place`, and `full` as above.

**Lights out** (about 5 seconds). *Cause:* the lamp's cord pulled down and held for about half a second, until the lamp clicks. The house dims in two steps as the cord goes down and is bright again if the cord is let go sooner. A tap on the lamp or its cord only swings the lamp. *Beats:* the lamp blinks; whoever is in the room squints; the room is the bedroom; the baker, the hen and the dog get into bed, each in its own manner; the lamp goes dark and the owl opens its eyes in the window. *Filled in from:* who was awake and what they wore. *Saved at the start:* `place` as `bedroom`, `day` as false, and every other field at its first value. The cord pulled and held in the bedroom at night with everything at its first step only blinks the lamp and makes the sleepers squint, and saves nothing.

**Secrets** play the same way every time and are never hinted at: the three meetings above, and the wrong use of each thing. *Saved at the start:* a meeting changes no field but `full` and `served`, which are saved as said under "Through a door". Four wrong uses change a field and save it when the finger lands: the belly at the fair `balloon`, the basket `eggs`, the hot tap `fog`, the picked flower `flower`. The other four change none. A first or a second touch on a thing is no scene, and saves that thing's field when the finger lands; a patch of fog rubbed clear is saved as said under "What is stored".

**How a cycle ends and the next one starts.** The game is open pretend play with no cycle and no ending. A room stays as it is for as long as the child likes: if the child does nothing, nothing starts, and there is no countdown. Nobody hurries the child or complains of waiting. The calm way to tidy up is the lamp, which puts everyone back to bed as at the start. On load nothing replays: the room that was on screen is there with every thing at its saved step and every character at rest.

(pack: game-design, endings-and-short-scenes.md; pack: game-design, hidden-never-counted.md)

## The records

The game has no learning goal: it is designed from no record of either jurisdiction and claims no school skill.

## The look

**LCD handheld segments**, the first look reserved for the game in `docs/art-direction.md`. The whole surface is a pocket game: a red plastic case with a cream face, a speaker and two rubber buttons, and behind its glass a printed colour card with dark segments in front of it. The style spike passed on clarity and on frame rate, so the second reserved look was not tried. The look passed at the toy checkpoint: the printed room is full, and the dog, the owl and the baker are large and funny.

**One rule for every room.** A room is its own printed card, from edge to edge, with its own large figures as segments in front of it. No room is another room in other colours: each has its own place, its own furniture and its own palette, and the baker, the hen and the dog are drawn again for what they do there. The right edge of every card is the same stairwell: three doorways in the colours of the rooms behind them, the lamp over them, and the lamp's cord hanging down the edge beside them.

**The eight rooms.**

- **Bedroom** (lilac, night blue, pink). A wall of wavy lilac stripes with a string of bunting, an arched window with pink curtains (the moon at night, the sun and green hills by day), a shelf with a ball, a bear and blocks, two pictures (a bone, a loaf), the baker's blue bed with its yellow blanket, an orange chest of drawers, slippers, a bone and a bowl on the floor, and a round rug with the dog's cushion. Segments: the owl in the window, the baker in bed, the hen on the chest, the dog, the fly. The dog awake stands from the cushion to above the shelf.
- **Kitchen** (yellow, white, teal). A spotted yellow wall, a hood, a pan and a string of onions, a shelf of jars, a white stove with a loaf in its oven window, a carrot picture, a window with red curtains and a plant, a teal cupboard with a bowl of fruit, a stool. Segments: the baker on the stool with a ladle and a swatter, the pot on the stove (afloat on the flood when the soup has run over, with the burner left bare), the fly at five spots, the flood as one pool with a lapping edge, the visiting dog, who snaps at the fly while it is about.
- **Bathroom** (pale blue, grey, coral). A blue wall of bubbles, an open wooden door at the left, a grey-framed pane in front of the bath, a shelf with a towel that has one broad stripe, a bathrobe on a hook, a coral tap on a pipe, a pink mat. Segments: twelve patches of fog on the pane, three across and four down, each a different heap of cloud; behind them the bath in twelve pieces, with the hen in a shower cap; the duck on the shelf; steam at the tap; a wet foot; the dog hiding behind the door.
- **Fair** (sky blue, red, cream). A red scalloped awning with cream drops, prizes hung from the awning (a bear, a striped ball, a fish), two posts, clouds and far hills, the big top with its flag, a helter-skelter, a cart of candy floss, grass. Segments: the baker with both hands on the pump, the balloon in three sizes from a melon to a stall-filling ball, the burst as thrown rubber, the rubber on his head, the visiting dog.
- **Bakery** (brick red, flour, wood). A brick oven with a fire, a peel, shelves of loaves and buns, a wheat picture, a cake under a glass dome on a counter, a floury wall. Segments: the baker with his tray, pies flat or tall and domed, the tower swaying, hopping whole off the tray, tipping and down on his head, three splats lit one after another, crumbs, the visiting dog, who eats the fallen pies and is round.
- **Dining room** (rose, cream, wood). Rose stripes, a window with a red curtain, a yellow lampshade, two plates on a rail, a pear picture, a table with a dotted cloth, a chair, a sideboard with a tureen. Segments: the diner on the chair (the dog awake or round, or else the hen), with and without the bib; the soup at three heights, its steam as rising puffs, the spill down the cloth to a pool on the floor; the baker with the ladle; the fly in the bowl or on the flower in the vase; the slice served from his hat, which lies on the cloth from then on.
- **Garden** (green, sky, earth). A tree at the left, the sun, clouds, two rows of hills, a bed of earth edged with stones, a watering can, pumpkins, grass. Segments: the weed at rest, stretched, tall and out with its root; three flowers, two that lean and gasp and one between them that leans with them and can be picked; the owl asleep on the branch, peeking, and hanging by its feet; a worm in the hole; the visiting dog.
- **Henhouse** (straw, plank, sky). Plank walls and a beam, a perch with a lantern hung from it, a round window with the sun in it, a nest box on legs, sacks, a ramp, straw and spilt grain. Segments: the hen on the nest, shot straight up, puffed and tucked; eggs dropping into the basket and in it; the crack and the chick, who climbs onto her head; the basket tipped and an egg rolling; the root in her beak, on which she leans like a rope.

**Through a door.** Each door leaf is a segment and stands ajar. In the doorway beside it is one small dark picture of a corner of the room behind, as that room stands now: the pot, the bowl empty, full or spilt, the bath in fog or in the clear with the duck and the foot, the pump with the balloon at its size, the weed or its hole, the kitchen's flood as one pool, the basket empty, with one egg, with two, or with the chick, the tray empty, with one pie or two, flat or tall, or the tower fallen. A test holds that each of those is its own picture. A door swings wide in three poses and the new room is lit at once.

**The lamp and its cord.** The lamp hangs over the doors and is lit by day, with five drops of light under it. A tap on it swings it and changes nothing, and a finger that lands on the shade never starts the pull, however far it slides. Its cord hangs at the edge, above the top door, with a bobble; a finger takes it anywhere on a strip 88 units wide round it, which is 48 CSS pixels or more on a tablet lying or upright, and a finger that lands just outside the strip, on the frame round the top door's corner, swings the lamp and opens nothing. On the door itself a tap is always the door's. Drawn down, the bobble is at its second and third heights and the whole house dims in two steps, and held there for 0.45 s the lamp clicks. Let go sooner, the cord springs back and the house is bright again.

**Palette.** The segments are one dark, `#17231d`, at 0.93 strength, so the card's colour shows through a little. Every card is warm and light so that every segment reads on it, and each room has its own three colours, named above. The glass lays a grey-green cast of 0.17 over the print. The case is `#e2452f` with a cream face `#f3e8cf` and rubber `#3b3f46`. The ghost hand is the one pale thing in front of the glass: cream with a dark edge.

**Materials.** Flat print and flat ink, and nothing else. A segment has a hard edge, its inner lines are cut out of it so that the card shows through (eyes, creases, the rim round a head that lies on its own body), and it throws a small hard shadow onto the card, five units to the right and six down, which is what puts the glass in front of the print. The segments in a room's ghost list, a few of its largest poses, leave a ghost at 0.035 on the glass when they are not lit, as an unlit segment does; the rest leave none, so that the glass is not a grey heap. The glass has a shadow along its top and left edge and one long streak of light.

**How things move.** Nothing glides, grows or fades in: a figure is at one pose and jumps to the next. Weight, squash and follow-through are drawn as poses and timed as holds: the dog coils flat for 0.13 s, hangs spread at the ceiling for 0.34 s, lands splayed for 0.22 s, and shakes in four poses of 0.09 s; the baker's knees bend under each pie; the weed stretches before it gives. A segment that has just gone out lingers for 0.05 s at no more than 0.18 of its strength, so that a large pose leaves a pale trace and never a second figure; a test holds both numbers. A tap that asks for the pose that is lit already flickers that pose for 0.07 s, so that no tap lands on a still screen. A knock on the case flickers the whole display, a finger on bare glass leaves a dark bloom for a moment, and a case button held down shows every ghost at strength, as a display does when it is tested.

**Every character moves like itself.** The dog is heavy and slow to start and then all at once: a slow breath, a snore bubble in three sizes, the leap; awake he sits by the food with his tongue out and his eyes on it, snaps at the fly in the kitchen and in the bedroom at night and misses, and round he rolls and has three small tricks of his own. The baker is pompous and slow: in every room he stands in he breathes with his whole belly and now and then straightens his moustache, his cap or the tower on his tray, and he never looks at what is on his own head; with rubber on it he flaps twice as he turns; touched on the belly he giggles, and his snort throws his whole face wide, moustache up and hat off. The hen is quick and jittery: she nods and tucks her head away, and shoots straight up with every feather out. The owl blinks at times of its own and its eyes follow the finger; jolted, it turns upside down. The fly sits flat, lifts its wings and is at the next spot, and rubs its hands when it has got away; its spot moves in the frame its picture does, so it is touched where it is drawn. No two share a pose rhythm, and the two snores keep different times.

**The fly is never lost.** Each of its spots is on plain wall or on a thing it would bother, never on a printed picture, the bunting or a curtain; a test holds the spots against the pictures of the bedroom and the kitchen. In the kitchen it hops to a spot the swatter's arm does not cross.

**No figure forms a numeral, a letter or a sign**, lit or unlit, and nothing on a card is written. Every segment is a part of a character or of a thing in the room, drawn as its own shape, and the cards avoid even rows of equal marks, level bars and crosses. What was looked at as a lookalike and what was done:

- Redrawn: the speaker (a fan of slots of unequal length, where it had rows of equal dots); the drawers (one knob, one curved handle with a sock on it, one knob off to the side, where they had pairs); a door leaf (one wandering line of grain, where it had a level bar); the kitchen flood, in the kitchen and in the three doorways that show it (one pool with a lapping edge, where it had two level wavy lines); the fly's arms as it rubs its hands (side by side with one knob for the hands, where they crossed); the tie on the wheat in the bakery's picture (an oval knot on the stalks, where a stroke crossed them); the dog's tongue (cut out of the dark with a crease, where it was a dark oval in a rim of light); steam over the soup and in the dining room's doorway (puffs that rise and shrink, where it was two curved strokes); the towel on the bathroom shelf (one broad slanted stripe and a fold, where it had two equal level stripes); the leaping dog's body (filled, with one crease, where it was a ring round a hole; a test holds it); the pumpkins' ribs (three of unequal bend on the large one and two on the small, where they were a facing pair); the straw on the henhouse floor (no two strokes cross or touch, and a test holds it); the stove's top (a burner on two feet, where it was a bare level bar once the pot had floated off).
- Kept, as what they are: the owl's two eyes, which are of unequal size (a test holds the difference) and have pupils and a beak between them; the bunting, whose flags differ in size, colour and spacing on a sagging string; the three door leaves, which stand in three separate doorways of different colours; the five drops of light under the lamp; the two plates on the dining room's rail, of unequal size with coloured middles; the noses of the baker and the dog, which are small ovals inside a face. `REFINEMENT.md` lists more that were kept, under "Reader", each with why it is weaker than the thing it is.
- With a case button held, every ghost of the room shows at once. That set was looked at in all eight rooms: it is a heap of overlapping characters and forms nothing that can be read.

**Sight and sound.** A pocket game has one small buzzer: every voice is one or two short notes, a beep, a slide or a tick of noise, written as plain numbers in `voices.ts`. Most are square beeps; the softer things (a snore, a whine, a roll, the lamp's swing) use a sawtooth, a triangle or a sine, and flaps, splats and panting are filtered noise. A sound belongs to a pose and starts in the frame that lights it; no voice carries a delay, and a test holds every sound to a change on the glass in the same step. A scene that a touch cuts is silent from that frame. Nobody has listened to the voices yet.

**How each tier keeps the look.** The picture is the same on every tier, and only its cost changes: tier 0 draws at a pixel ratio of up to 2 with shadows and afterimages, tier 1 at 1.5, tier 2 at 1.25 without afterimages, tier 3 at 1 without shadows either. The case, the card, the glass and the ghosts of the room on the glass are one background, and each segment is one sprite. A frame is that background stamped whole and one stamp for each lit segment, two with its shadow.

**What the sprites weigh.** Only the room on the glass has sprites; the three door corners are small pictures of that room's own set, and the sprites of the room before are let go as the door opens. As a room comes onto the glass its ghosts are painted at once and the rest a few a frame (3 MB of sprite a frame), so that no frame carries the whole room. A room's segment sprites weigh at most 58 MB at two pixels to a unit; the bedroom, the one room that would weigh more, paints a pose when it is first lit and lets go the pose lit longest ago. A test walks the house and holds everything the view has made, the background and the hands included, under 80 MB at every moment; the most it counted is 74 MB, in the bedroom.

**What the frame costs.** The draw count of this game is the number of sprite stamps plus the shapes filled live, which is what its frame-budget test counts and what the grown-up overlay shows. The one number to hold against the bar of about 80 is the worst frame the test finds in long sessions in every room, with the ghost hand showing and a case button held: 75, in the bathroom. Left alone, a room costs between 21 and 49.

**Registry row.** The row in the claimed-styles registry in section 3 of `docs/art-direction.md`, where the menu row "LCD handheld segments" is claimed:

| Game | Style | Art guide |
| --- | --- | --- |
| Micro Mayhem | LCD handheld segments: a pocket game in a red plastic case with two rubber buttons; behind a grey-green glass a printed colour card for each of eight rooms, and every figure as fixed dark segments that switch on and off in front of it, each with a small hard shadow and a faint ghost when unlit; motion is a jump between poses with a short pale afterimage, and every sound is one buzzer's beep | [`games/micro-mayhem/ART.md`](../games/micro-mayhem/ART.md) |
