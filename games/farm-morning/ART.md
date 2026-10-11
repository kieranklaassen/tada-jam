<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

The one idea: every animal answers, whatever is done to it. Four large animals fill a farmyard and four things lie about. The verb is to use a thing on an animal: tip it out, pour it, brush with it, fork it on. The game has no learning goal.

## The band and its age rule

The manifest band is 2 to 5, and its youngest age, two, governs the design.

- **The cue-table row.** The wordless-clarity convention has no row below 3, so its row for a youngest age of 3 to 4 is the ceiling and the game cuts further. The "Avoid" column binds: no text, numeral or pictorial icon that has to be decoded, no spoken instruction, no verdict, never several activities live at once, and no tool on the page before it means something. There is one activity, using a thing on an animal. Each of the four things means something from the first frame, because one animal is looking at it and is plainly short of what it gives.
- **The pack's rule for the range** (pack: game-design, ages-2-to-4.md).
  - Everything works with a tap. A drag does the same as two taps, survives a lifted finger and counts when partly done.
  - Every animal, every thing and the door is a target of 130 stage units or more across, which is over 100 logical pixels on a tablet, with clear ground between them. None lies in the bottom strip of the page, and none under the jam's home control at the top centre or in the grown-up's corner at the top right. Nothing the game brings to rest covers a target, and a tap on it is never taken for the target behind it: the hens that are out stand clear of the door, a hen that has crossed the yard pecks beside the other animal and not on it, a settled animal lies clear of the things and of its neighbours, a lifted thing hangs over its own place only, and the sun at the top of its slot and the cat on the roof stay clear of the home control. An overlap test holds this at 1180 by 820 and at every other surface size the game's tests lay out.
  - The loved actions are tipping out and pouring, covering, and opening and shutting a door.
  - A morning from the first touch to full light fits in one to three minutes, and is as short as five touches.
  - Quantities stay at five or fewer: four animals, four things, three hens.
  - No pinch, tilt, shake or double tap. A second tap that lands within a moment of the first never undoes it: a thing just lifted stays up and clinks, and a door just slid finishes its slide and rattles.
- **The symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, and the game has no `symbols.ts`. The rule follows the manifest band, never the child's age while playing.
- **What `ctx.childAge` sets.** Only how the first morning of a first visit opens. For a child of 3 and younger the henhouse door already stands open and the hens are out, so all four animals are on stage from the first frame. For a child of 4 and older the door is shut and the hens' beaks show at its holes. Nothing is locked or hidden by age: either child can shut and open the door at any time, and every morning after the first starts behind a shut door for everyone. A saved game wins over the age.
- **What no age gives.** `null` opens the first morning as for the youngest child: the door open and the hens out.

## The toy

**The action.** Tap a thing and it lifts off the page; tap an animal and the thing is used there. That pair of taps is what the finger performs most. A drag from the thing to the animal does the same in one move.

**In an empty scene.** One animal stands in the yard and one thing lies beside it, and nothing asks for anything.

- When the finger lands on the thing, in that frame, it lifts off the page with its own sound (the scoop digs into the sack with a crunch, the pump squeaks and gushes into the bucket, the brush thrums, the fork twangs out of the heap), a gloss sweeps across the page, and the animal's eyes go to it and its ears come up.
- When the finger lands on the animal, in that frame, the thing leaps across and tips out over it, and the animal answers with its whole body and its voice. One touch sets off a chain: the scoop tips, the grain patters down, the animal eats, sneezes or shakes, something flies off, and another animal across the yard gets the spray.
- The thing then goes back up over its place and stays lifted, so every further tap on any animal uses it again. A tap on the lifted thing lays it down with a clack. A tap on another thing swaps them.
- A finger that lands on an animal with nothing lifted pokes it, and the animal answers the bare finger in its own way.
- A finger that moves after it lands on a thing carries it. Let go over an animal, or more than half way to the nearest one, and it is used there. Let go anywhere else and it drifts back up over its place, still lifted. A carried thing waits where a lifted finger left it, and the finger coming back carries on.
- A touch on the page where nothing stands knocks on the board with a thud, a gloss sweeps out from the finger, and the nearest animal looks round. Every touch on the bare page knocks, except in the top right corner of the screen, which is the grown-up's: a touch there gets no knock, no gloss and no look, and ends no scene.

**Why repeating it is a pleasure with no goal.** Every touch outside the grown-up's corner is answered when the finger lands, and the answer is bigger than the touch: a leap, a spill, a body that shakes from nose to tail and a voice, from one finger (pack: game-design, touch-answers-bigger-than-the-touch.md). Random tapping always produces something, since a thing, an animal, the door and the bare page all answer, and nothing a finger can do is refused or punished. The simplest use, a tap, always works (pack: game-design, toy-first.md). The answers are jokes on the animal's body, and the same joke comes every time, so a child can cause it again on purpose.

## The object-by-action grid, and what is new on day 15

Four animals by five things a finger can bring: the four things and the bare finger. Every cell looks and sounds different. One cell in each column, marked *right*, is the thing that animal is short of.

| Brought | The hens | The pony | The goat | The pig |
| --- | --- | --- | --- | --- |
| **Grain scoop** | *Right.* Grain patters into the trough like rain on a tin roof. All three hens lunge at it from where they stand with necks stretched, and peck with their tails in the air, each pecking tok at its own speed. | The pony sucks the grain off the scoop with its big flapping lip, a wet flubber, crunches twice, and sneezes it all out again with a blast. | The goat munches the grain in one gritty mouthful and then bites the scoop itself: teeth clonk on tin, and the scoop pings out of its mouth. | Grain sinks into the wallow. The pig ploughs after it snout first, snuffling, and blows a row of bubbles that glop as they burst. It comes up with a moustache of mud. |
| **Bucket of water** | Water splashes over them. The hens scatter squawking, then shake themselves with a rattle of feathers and puff up into three round balls, half as big again, and each lets out one small sneeze. | Water sloshes over its back. The pony shudders from nose to tail with a long flapping shake, and the spray hisses across the yard and soaks the goat, who stands dripping with flat ears and gives one cross bleat. | The goat drinks the whole bucket, glug after glug, each glug lower than the last. Its belly swells round as a ball and sloshes when it wobbles, and then it hiccups a little fountain. | *Right.* Water gurgles into the wallow and the mud turns deep and shiny. The pig flops in with a great splat, rolls, and grunts lower and lower until it lies still with a grin. |
| **Brush** | The brush scritches a hen's feathers up the wrong way into a tall crest. She squawks once, then struts about stiffly with it, clucking in time with her steps, while the other two stare. | *Right.* Long strokes swish along its side, and dust lifts off in a puff at each one. The pony leans into the brush so far that it nearly falls over, its lower lip hangs and quivers, and it rumbles a low nicker. Its coat comes up shining. | The brush crackles through its coat, and every hair stands on end: the goat turns into a round ball of fluff with a face. One spark zaps off the tip of a horn, and the goat jumps with a yelp. | The brush tickles. The pig squeals in rising giggles, kicks its trotters, and rolls right over onto its back, where it lies with its legs in the air and sighs. |
| **Fork of hay** | The hay flumps down on a hen and covers her: a haystack with two feet and a beak walks off in a zigzag, clucking muffled from inside, and bumps into the other two with a bonk. Then her head pops out of the top. | The hay lands on its head as a wig. The pony tosses it like a mane with a proud whinny, then eats its own wig from the fringe down in slow chomps. | *Right.* Hay rustles into the rack. The goat springs straight up on stiff legs with a boing, tears a mouthful out, and chews with its jaw going round and round and its beard wagging, crunching. | The hay sticks to the mud all over the pig, which squelches as it turns to look at itself: a pig of straw. It sniffs three times and sneezes, and all the straw shoots off at once with a whoosh. |
| **Bare finger** | The tapped hen jumps with a squawk and a loose feather floats down; the other two cluck. | The pony snorts and blows a raspberry with its lips, flicks an ear and swishes its tail. | The goat butts at the finger with a bleat and wags its stub of a tail. | The pig oinks, its belly wobbles like jelly, and a bubble pops in the mud. |

**What holds across the grid.**

- The rules never change, so what a child finds stays true. The same pair gives the same answer every time, played with small differences in ordinary detail (which hen arrives first, which ear flicks).
- Grain used on the pony, the goat or the pig also brings the hens over, if their door is open: each comes to the grain from where she stands, clucking as she sets off if it is more than a few steps, pecks up what fell with a quick tok-tok, and walks home to her own patch. With the door shut they drum on it from inside.
- The hens' column is played with the door open. While the door is shut, the door and the trough in front of it are one target: a touch there, with a thing lifted or not, is the coming out, the thing stays lifted, and the next touch on the hens uses it.
- Water on the pony always reaches the goat.
- An animal that is content answers every thing as before and settles back into contentment afterwards. A wrong use takes nothing away.
- What a wrong use leaves on an animal (a crest, a wig, straw, drips, fluff, a moustache of mud) is short-lived: it comes off inside the answer, is not saved, and is gone on load.

**The wrong use of each thing works and is funny.** Fifteen of the twenty cells are wrong uses and each has its own joke; the animal a joke is played on is bewildered and never hurt. A thing let go over nothing drifts back to its place. The henhouse door slides open on a touch and the hens tumble out in a squabble of clucks; it slides shut on a touch and they hurry in ahead of it.

**On day 15** the child does what they did on day 1, faster and surer: the door, the four right things, the full light, the door again. What they can do now and could not then is cause a joke on purpose: the tastes are fixed and the same pair gives the same answer every time, so they know which thing each animal is short of and what a wrong thing does to it, they pick a pair because it was funny yesterday, they set off the two chains that cross the yard (water on the pony to soak the goat, grain away from the trough to bring the hens running), and they try one pair they have not tried yet (pack: game-design, depth-from-combinations.md; pack: game-design, ages-2-to-4.md; pack: game-design, liveliness-from-causing-and-comedy.md).

## The representation

The game has no learning goal, so no school idea is represented in its objects.

## The four mechanic questions

The game has no learning goal, so there is no school skill for the four questions to be asked of.

## The error as a consequence

No use of a thing is an error, so nothing is ever judged.

- **What any use does.** The thing is used where the child put it, and the animal's body shows what that did: the cell of the grid. The answer is about the animal and the thing, never about the child.
- **Where the difference shows.** Each animal is plainly short of one thing, and that shortage is drawn in the yard beside it: an empty trough, a dusty coat, an empty hay rack, a dry cracked wallow. A wrong thing is funny and leaves the shortage as it was, in plain view. The right thing fills it, and the animal settles.
- **The state stays.** No use of a thing takes anything away; only the child sliding the door shut, which is the night, starts every animal short again. A filled trough stays filled, a brushed coat stays brushed, and a content animal that is soaked or covered in hay is content again when the answer ends. The child changes one thing and tries again by lifting another thing.
- **A drag that falls short** is no error either: let go more than half way to an animal it counts, and let go anywhere else the thing drifts back over its place, still lifted.
- There is no buzzer, cross, sad face turned to the child, praise or cheer, and no sound that means wrong.

(pack: game-design, errors-show-as-consequences.md; pack: game-design, liveliness-from-causing-and-comedy.md)

## The designed order, and what is stored

**No designed order.** The game has no learning goal and no order of challenges: every thing and every animal is there from the first frame, and any order works. It keeps no position, and `LADDER` in `config.ts` is empty.

**What a first visit starts with, by age.** For a child of 3 and younger, and for no age, the first morning opens with the henhouse door open and the hens in the yard. For a child of 4 and older it opens with the door shut. In both, no animal has its thing yet and the four things lie in their places.

**What play changes.** Two things, and both are saved: whether the door is open, and which animals have had their right thing this morning. Sliding the door shut ends the morning: the night passes and a new morning stands behind the shut door, with every animal short of its thing again. So after the first night every morning starts behind a shut door, whatever the child's age.

**What is stored.** Small plain JSON under one version number, read field by field.

- `v`: the version.
- `door`: `open` or `shut`.
- `content`: which of the four animals have had their right thing this morning, as a list of their ids (`hens`, `pony`, `goat`, `pig`).

Everything else on the page is rebuilt from those two fields or is short-lived.

- Rebuilt from `content`: the filled trough, the brushed and shining coat, the filled hay rack, the wet wallow, each content animal's settled pose, and the height of the sun and the fullness of the light, which follow how many are content.
- Rebuilt from `door`: the hens out in their own patch, or inside with their beaks at the holes.
- Short-lived, not saved and gone on load: a thing that is lifted or carried, which is found lying in its place; an answer that is still playing; whatever a wrong use left on an animal; hens that have run across the yard, which are found in their own patch; the loft hatch, which is found shut; the cat on the roof, which is found back in the loft, in full light too.

A right thing writes its animal into `content` when its answer starts. The door is saved when its slide starts. No clock is read, and nothing changes while the game is away. The largest legal state is a few dozen bytes, far below half of the 64 KB cap, and a test says so.

(pack: game-design, the-world-keeps-and-waits.md; pack: game-design, many-short-visits.md)

## The characters and their fixed tastes

Each animal is short of one thing, and that want is always in view and turned to the child: the animal looks from its empty place to the thing that would fill it. A want is about the yard, never about the child.

| Animal | Body and tempo | Funniest part | Its one want, in view | Its right thing | Settled |
| --- | --- | --- | --- | --- | --- |
| The hens: a big white one, a quick russet one and a small black bantam | round and jerky; they move in starts and stops and never in step | necks that shoot out, and tails that go up when they peck | an empty trough in front of the henhouse, which they peer into and scratch beside; behind a shut door their beaks poke through its holes and point at the trough | grain | they sit fluffed up beside a heaped trough with half-shut eyes, crooning |
| The pony | a fat barrel on short legs; slow and heavy, and everything arrives late | a huge lower lip, and a forelock over one eye | a coat grey with dust, which puffs off when it shifts; it rubs its flank on the fence post and eyes the brush | the brush | its coat shines, one hip drops, its eyes half shut and its lip hangs |
| The goat | thin and knobbly; springy, sudden and cheeky | a jaw that chews sideways, a wagging beard and eyes with level slots | an empty hay rack beside it, which it noses and nibbles at, chewing air | hay | it folds down beside the full rack and chews the cud round and round |
| The pig | enormous and round on tiny trotters; unhurried, with a wobble that goes on after every move | a snout that works by itself and a tail that winds and unwinds | a wallow dried to cracked mud, which it sits on and tries to roll in, raising dust; it looks at the pump | water | it lies sunk in shining mud with a grin, blowing a bubble now and then |

**The tastes never change**, so a child can learn them and test them on purpose. Each animal's answer to each wrong thing is its own and comes every time. A dislike is as good to watch as a like: the soaked goat's cross bleat and the hens' scatter are outcomes worth causing.

**Bystanders.** A cat lives in the henhouse loft with its tail hanging out under the hatch. The sun and two clouds are in the sky. Each answers a touch as itself and changes nothing: the hatch lifts and the cat looks out and mews, the sun spins a turn with a chime, a cloud bobs with a soft puff.

**The things have no opinions.** The scoop, the bucket, the brush and the fork are the plainest pieces on the page: one flat colour each, no face, no motion at rest, lying on a pale bare step (pack: game-design, working-objects-stay-plain.md). They move only when the child moves them.

(pack: game-design, characters-with-opinions.md)

## The scenes

An answer to a use, the grid's cell, is not a scene: it lasts two to five seconds, runs alongside the finger and never blocks the next touch. A new use on the same animal starts the new answer at once. A thing taken to another animal, or swapped for another thing, while its animal still needs it ends that answer there: the sound stops, nothing more falls from the thing, and the animal looks after it; what a right thing gave is given. The three short scenes below are lists of timed beats built on `scene.ts`. Each one's outcome is saved when it starts. Any touch ends it at once with everything where the scene was taking it, and that touch is then an ordinary touch; the one exception is the second tap of a double tap on the door that started the scene, which lands within a moment of the first, only rattles the door and leaves the scene playing.

**The coming out** (about 2 seconds). *Cause:* the child touches or slides the shut door. *Beats:* the door slides along its rail with a rumble; the bantam shoots out first, the russet hen trips over the sill, the white hen walks out last and shakes herself; each goes to its place by the trough. *Filled in from:* nothing but the door; a thing that is lifted stays lifted. *Saved at the start:* `door` as `open`.

**The full morning** (5 to 8 seconds, the ending). *Cause:* the fourth animal gets its right thing. It follows that animal's own answer on the same touch. *Beats:* the sun climbs to the top of its slot and the page brightens to full daylight; the cat comes out onto the roof and stretches; each animal in turn gives its own settled sound, in the order they were made content this visit, or in yard order after a load; the yard goes quiet except for the hens' crooning. *Filled in from:* which animal was last, and the order of the others. *Saved at the start:* nothing of its own. The answer that causes it has already written the fourth animal into `content`, and the full light is rebuilt from `content`, so a game put away between the two is found in full light and plays no ending on load.

**The night and the new morning** (6 to 9 seconds). *Cause:* the child touches or slides the open door. *Beats:* the hens hurry in, the last one's tail just clearing the door as it shuts with a clunk; the sun slides down and the page turns to night blue; every animal shuts its eyes where it stands and breathes slowly, each with its own snore; the moon crosses; the sun comes up to its low morning place and the white hen crows; the animals wake one by one, and each is short of its thing again: the trough empty, the coat dusty, the rack empty, the wallow dry. The hens' beaks come to the holes in the door. *Filled in from:* which animals were content, who sleep where they had settled, and what a wrong use had left on anyone, which falls off as they fall asleep. *Saved at the start:* `door` as `shut`, and `content` as empty.

**How a cycle ends and the next one starts.** The morning ends in full light, which stays as long as the child likes: all four animals settled, each still answering every thing. If the child does nothing, nothing new starts, and there is no countdown. Beginning again is one plain act in the yard, sliding the henhouse door shut, and a child may do it at any moment of any morning, full or not. After the night the new morning waits behind the same door, which opens only when it is touched: the hens are in view at its holes and neither hurry the child nor complain. On load nothing replays: the yard is as it was left, in the light its `content` gives, with the door as it stood.

(pack: game-design, endings-and-short-scenes.md)

## The records

The game has no learning goal, so it is designed from no records and claims no school skill.

## The look

**Lift-the-flap board book**, the first look reserved for this game in the look menu of `docs/art-direction.md`. The spike held on clarity and on the frame budget, so the second reserved look was not tried.

**What it is.** One spread of a thick board book, lying open under daylight. The farmyard is printed on the page in flat bold colour with no outlines. Everything that moves is a piece of thick glossy card lying on that page: each piece shows a grey board edge along its lower right, drops a small soft shadow, and carries one pale streak of laminate. The page itself has round corners, a board edge along its right and bottom, and a faint sheen. Nothing is lit from inside, nothing glows, and there is no depth of field: it is card on card.

**The mechanisms are the book's.** The henhouse door is a slider on a printed rail, with three die-cut holes the hens are seen through. The loft hatch is a flap hinged along its top, which shortens and darkens as it lifts. A lifted thing comes off the page towards the child: it grows by a third, hangs a little lower over its own place where the hand is, sways, stands on a pale halo and leaves a wide soft shadow where it lay, so it reads as in the hand and never covers the hens' ground above it. A touch sends one streak of gloss across the laminate from where the finger landed.

**Palette.** All of it is in `INK` in `art.ts`, and a colour is used by name.

| Where | Colours |
| --- | --- |
| Sky and far ground | sky blue paling to the horizon, two greens of hill, a darker green for trees |
| Yard | warm straw yellow, with darker and paler dabs |
| Henhouse | tomato red boards, cream trim, plum roof, a dark warm inside, a yellow door with a red knob |
| The step and what lies on it | cream, the palest ground on the page, so the four things read first; a sack, a sage green pump, a heap of hay |
| The pony | chestnut with a dark mane, a cream muzzle and a pink lip; grey dust patches until it is brushed |
| The goat | off-white with tan patches, grey horns, yellow eyes with level slots |
| The pig | pink with a paler belly, a dark pink snout and dry or wet mud |
| The hens | white, russet and speckled black, with red combs and orange beaks and legs |
| The things | one flat colour each: slate blue scoop, blue bucket, brown brush, grey fork with a wooden handle |
| Card | a warm grey board edge and a brown shadow at about a third strength |

**Materials.** One material: laminated card. Flat fills, soft rounded shapes, and no gradient inside a piece except the laminate streak. A darker flat patch stands in for shade. Loose bits (grain, drops, dust, straw, feathers, bubbles, mud, sparks) are flat dots and dashes with no edge, since they are too small to be card.

**Lighting.** Daylight from the upper left, which is where every board edge and shadow says it is: edges show down and to the right, and shadows fall the same way. The light never changes direction. The full light of the fourth right thing is the same page printed once more a little warmer and swapped in, with long rays round the sun as one more piece. The night is the page turned: once the sun is half way down, the frame is stamped from a night ground in place of the day's and from each piece's own night stamp, which are the day's ground and pieces under one blue wash, made once as the first dusk begins and kept. Colours that are drawn live (pupils, lids, legs, loose bits) are mixed with the same blue. The stars and a card moon are drawn over it in their own colours. No frame covers the surface twice, and the turn is a cut, as a page is.

**Characters.** Four animals fill the frame, each between a quarter and nearly half of its width, and each is drawn round the part that is funny before it moves: the pony's head is as big as its barrel and ends in a lip, the goat looks out through level slots over a beard, the pig is a ball on trotters with a snout, and the hens are three sizes of the same round bird. Eyes are white card with a live pupil that follows the last touch. The goat's eye is a yellow iris in a dark rim with a level oval pupil, and an eye that is shut, in a sneeze or in the night's sleep, is one dark curve on the face: no eye is ever a free-standing bar.

**The working pieces stay plain.** The four things have no face, no motion at rest and one colour each, on the palest ground of the page. The halo under a lifted thing is the only ornament a thing ever gets.

**The guidance is card too.** The idle glow is a sunny ring with a clear middle, so what it lies round keeps its own colour, and the ghost hand is a white mitten with a dark rim, so it shows on the pale step as well as on the yard. When the hand shows a carry, a pale copy of the thing goes with it and the real thing stays where it lies.

**A page from edge to edge.** Sky, hills, trees, yard, fence and flowers are printed far past the stage on every side, so a surface wider or taller than the stage is still a full yard.

**Motion rules.**

- A piece moves as card moves: it slides, turns round a pin, tips and squashes a little. No piece bends.
- Every character has its own tempo, written in `PERSONALITY` in `motion.ts` before any curve: the pony heavy and late, the goat sudden, the pig wobbling on after every move, the hens in starts and stops and never in step. A test holds that no two idle alike.
- An answer fades in over a fifteenth of a second and out over a quarter as it ends, so a pose never jumps as it starts or as it runs out, or when the night cuts it short. An answer that a new use replaces, or whose thing is taken away, drops its pose at once: the new answer's pose, or the look after the thing, comes in over the next fifteenth of a second from where the animal rests.
- A touch is answered in the frame it lands in. The thing leaps in under a fifth of a second, and the animal has started before the thing arrives.
- Things do not move by themselves.
- One clock for what is heard and what is drawn. Every time that more than one module needs is written once in `timeline.ts`: how long the thing stays at the animal and what it does there (the brush is on the pony for all four strokes, the bucket at the goat's nose until the last glug, the fork over the rack), when a stroke begins, when a bubble bursts, when the door is drummed on. The model moves the thing by it, the bodies and the loose bits follow it, and every note is placed from it and says who makes it. What takes as long as it takes is a sound of its own, sent at the moment it happens: each hen's pecks when her head comes down, the door's rumble when it moves and its clunk when it is shut, the goat's bleat when the spray reaches it, a hen's two clucks as she sets off for spilled grain, the bonk as the haystack walks into a hen. `sync.test.ts` walks every cell, every scene and every pair of uses, the second starting at eight moments inside the first, and fails when a note sounds while its maker is not doing it.
- A new use on an animal stops what the old answer still had to sound, and a touch that ends a scene stops the scene's sounds: each maker's notes go through a channel of its own that can be faded out (`channels.ts`).
- An answer goes on only while its thing is at the animal, or once the thing has given what the answer needs of it (`neededFor` in `cells.ts`: a thing that tips its load, until the last of the load has left it; any other, until it leaves). A thing taken away before then, to another animal, for another thing or by the night, takes the answer with it: the animal's channel is stopped, nothing more falls from the thing, and the animal looks after it with its head round, its mouth open and its ears sinking flat (`leftRig`); hens stop where they are, all three look, and then they walk home. What a right thing gave is given: the animal was written into `content` when the answer started, and its want fills as the thing leaves. The same test holds the other side: a thing is at an animal only while that animal is answering it, so a goat the spray soaks while it drinks sends the bucket home.
- The full morning is no scene until the fourth answer is over: the model counts down to it (`morningDue`), a touch in that time is an ordinary touch and ends nothing, and an answer that touch starts is followed by the full morning in its turn.
- A hen pecking at grain pecks on through another hen's answer: the brush, the fork and the finger are one hen's, and stop that hen's pecks only. Grain and water move all three.
- The haystack's way is a list of stops (`ZIGZAG` in `farm.ts`): out towards the child and back, a turn every 36 units or so, in front of the trough, to the nearer hen and then the other. A hen jumps, and her bonk sounds, in the step the haystack gets to her.
- The sun's rays turn one whole turn on a touch (`sunTurn`). The content pig's mouth is shut and turned up at both corners (`Rig.grin`); an open mouth is drawn in its place while it grunts or yawns.
- The grown-up's corner is the overlay's own: 72 pixels of the surface, top right, at every size of surface (`corner.ts`). A touch there, and whatever that finger goes on to do, is not passed to the yard.
- What goes into a trough or a rack piles up from the bottom: the full piece shows from its foot upwards as the stuff lands, and not by fading in.
- The pig's four trotters are pieces of their own, each hung from its hip, and kick one by one. Hens that have had their grain sit with their legs folded under them.

**How each tier keeps the look.** The pieces are painted once, at the sharpest tier, and stamped smaller at a lower one, so a change of tier repaints one page and nothing else.

| Tier | Pixel ratio | Loose bits at once | Gloss on touch | What is kept |
| --- | --- | --- | --- | --- |
| 0 | 2 | 120 | yes | everything |
| 1 | 1.5 | 90 | yes | every piece, edge and shadow; slightly softer |
| 2 | 1.25 | 60 | yes | the same, with thinner sprays |
| 3 | 1 | 40 | yes | every piece, edge and shadow, with the thinnest sprays; the sweeping streak stays, since the sheet promises it on every touch |

**The frame budget.** A draw is one stamp of a painted piece or one live fill or stroke, counted by `frameBudget.test.ts` and reported by the Mount as the draw count. The heaviest frame takes 58 draws at rest, 62 while the ghost hand shows a carry, 68 in the heaviest cell of the grid with the glow and the hand up, 72 through the three scenes with a thing lifted, and 74 with everything going at once, by day and in the night's own frames alike, against a bar of about 80. Four of those draws are the pig's trotters. One draw a frame covers the whole surface, by day and by night: the page, or the night's page in its place; the test holds every frame to that. Every other stamp is the size of its piece. No blur, shadow or filter runs in a frame: each piece's shadow and gloss are painted into it once.

## The registry row, as a request to the lead

For the claimed-styles table in section 3 of `docs/art-direction.md`, and the look's row in the menu changed from reserved to claimed:

| Farm Morning | Lift-the-flap board book (canvas 2D): one spread of thick glossy card in daylight, a farmyard printed flat and bold from edge to edge with no outlines, big animals as card pieces with a grey board edge, a small shadow and one laminate streak, a sliding henhouse door with die-cut holes, a hinged loft flap, and four plain things on a cream step | [`games/farm-morning/ART.md`](../games/farm-morning/ART.md) |
