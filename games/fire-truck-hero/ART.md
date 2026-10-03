<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 2 to 4, so the game is designed for a two-year-old and nothing in it may need more than a two-year-old has.

- **The cue-table row.** The table in the wordless-clarity convention has no row below 3. Its 3 to 4 row is taken as the ceiling and cut further: one next act offered, one live want at a time, and nothing to decode. Its "Avoid" column is a hard constraint here: no text, numeral or pictorial icon, no spoken instruction, no verdict, no several activities live at once, and no tool on screen before it means something. The game has one tool, the hose, and it is on the truck from the first frame.
- **The pack's rule for the age** (pack: game-design, ages-2-to-4.md). Everything essential works with a tap. A drag survives a lifted finger and counts when partly done. There is no pinch, tilt, shake or double tap. Each thing in a yard is about 100 logical pixels across or more, they stand well apart, and none sits in the bottom strip of the screen. Whatever looks touchable is touchable: every place on the screen answers a touch. A yard, which is one cycle, fits in one to three minutes. No amount in the game is larger than five: the fullest thing takes five gulps of water.
- **The symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, optional or not, and the game has no `symbols.ts`.
- **What `ctx.childAge` sets.** One default only: where a first visit starts in the designed order. Age 2 or younger, or no age (`null`), starts at the first place, a yard with one thing in it. Age 3 starts at the second place. Age 4 or older starts at the third. A saved position wins over the age, every place is reached by play at any age, and nothing is hidden or locked by age.

## The toy

**The action.** The child touches the yard and the fire truck sends water there. The finger is the place the water lands.

- **A tap is a gulp.** The nozzle swings to the finger, the truck rocks back on its wheels, and one fat blob of water flies in an arc and lands where the finger was with a splash. A gulp is the unit of water for the whole game.
- **A held finger is a stream.** Gulps follow one another into a thick jet. The jet follows the finger as it moves, and the landing point trails a little behind like a real hose. A stream gives one gulp of water about every third of a second.
- **A lifted finger loses nothing.** Water already in the air still lands. A stream that is interrupted and taken up again counts as the same watering.
- **The truck itself** is the one place that takes no water. A touch on it makes it honk, hop on its springs and turn its roof light once.

**In an empty yard.** The yard is pale dry sand. Where water lands the sand turns dark, as wet sand does, and the dark patch has the shape of what the finger did: a blot for a tap, a line for a sweep. The patches dry back to pale over about half a minute of play, edge first, so the sand is never used up and there is always room for more. Drops bounce off the landing point and leave their own small dots.

**The answer starts when the finger lands**, in the same frame: the nozzle snaps round, the truck squashes back, water leaves the nozzle and the hiss of the hose begins. The water itself needs about a quarter of a second to arrive, because it flies.

**Sound.** The hose hisses for as long as water leaves it, pitched by how far the water has to go: a near target is a low gurgle and a far one a higher hiss. Each landing is a soft splat on sand, in several variants picked without repeats and pitched by how much water is already there. The truck creaks on its springs when it rocks. When the child stops, the sound falls to nothing within a second.

**Why it is a pleasure with no goal.** It is a garden hose, and squirting a hose is something a small child does unprompted and for a long time. The finger draws with water on sand. The jet has weight and lag, and so each sweep comes out a little differently. The answer is far bigger than the touch: one tap moves a truck, throws water across the yard and leaves a mark. Random tapping covers the sand with blots, and nothing a child does is wrong. A person watching sees within three seconds that the child is squirting water from a toy fire truck.

## The object-by-action grid, and what is new on day 15

One tool, the hose, meets seven things. The five actions are five ways water can reach a thing. "Its fill" is the number of gulps a thing takes before it has had enough, never more than five.

| | One gulp (a tap) | Its fill | Too much (water after its fill) | A sweep past (a moving stream crosses it) | Water from a neighbour (not aimed at it) |
| --- | --- | --- | --- | --- | --- |
| **The small fire** (fill: 3) | The flame ducks flat with a short hiss and a puff of steam, and stands up again smaller. | It goes out: a long hiss falling in pitch, one fat cloud of steam, black wet logs that drip. | The wet logs float off on their own puddle and knock together, as wood does. | The flame leans away from the stream and wobbles back with a soft "fft". | Flung drops make it spit and crackle with tiny steam pips. Run-off reaching the ring puts it out from below with a slow sizzle. |
| **The paddling pool** (fill: 4) | A hollow plastic "bonk", a puddle on the bottom, one ring of ripples. | The level climbs with each gulp, seen through the pool's wall, and each splash sounds deeper. What floats lifts off the bottom at the third gulp. | Water runs over the low side of the rim and down onto the ground in a dark tongue. What floats rides out on it. | A row of ripples across the surface, and what floats bobs. Dry, it rattles like a drum. | Flung drops patter rings on the surface. |
| **The seed in its pot** (fill: 3) | The soil turns dark and a green shoot pokes up with a plucked note. | Shoot, then two leaves, then an open flower, each a step up in pitch. | Water runs out of the hole under the pot into its saucer. The flower's cup fills, nods, and tips its water over whoever stands below. | The leaves flutter and shake off drops. | Run-off reaching the pot is soaked up from below: the dark climbs the pot and the plant grows one step, slowly. |
| **The dry ground** (fill: 3 on one spot) | A dark blot with a soft "pat". | The blot stops soaking in and stands as a shiny puddle that goes "plip". | The puddle turns to mud. Landings go "squelch" and throw brown blobs. | A dark line, as long as the sweep: drawing with water. | The tongue of run-off creeps along the ground and darkens it. |
| **The boat** (fill: 3) | On sand it rocks on its keel, rings hollow, and is pushed a hand's width by the force of the water. | Water gathers inside it until it is full to the brim and sits low. | Afloat, a boat full of water sinks with three glugs, rolls over, empties itself and pops up again. On sand it brims over and rocks. | The stream pushes it along: it sails across the pool, or slides across the sand, nose first. | A rising pool lifts it off the bottom. An overflow carries it over the rim and leaves it aground. |
| **The wheel** (fill: a held stream) | It turns part of the way round, ticking like a ratchet, and slows. | It spins steadily with a rising whirr and flings drops off its paddles in a ring. | It spins to a blur, whistles, and throws its ring of drops so wide that every neighbour gets a gulp. | One flick: half a turn and a clack. | A stream of run-off passing under it turns it slowly from below. |
| **The cat** (fill: 3) | She leaps straight up on four stiff legs, lands, shakes one paw and glares at the truck. | Soaked. She shakes herself from nose to tail, spraying her neighbours, and stalks to the driest spot in the yard. | She climbs onto the truck's roof, the one place that takes no water, and washes a paw with her back to the hose. | Ears flat, she ducks under the stream with her tail like a bottle brush. | One flung drop on her nose and she sneezes. When run-off creeps toward her she lifts her paws one at a time and moves over. |

Every cell is a use that works. The wrong use of each thing is its "too much" cell, and the cat is wrong in every cell and funny in each.

**What is new on day 15.** On day 1 the child squirts what is in front of the truck and is surprised by what it does. On day 15 the child knows what water does to each of the seven things and what each animal thinks of it, and causes it on purpose and at one remove: fills the pool so that the overflow waters the seed, spins the wheel to sprinkle the cat without aiming at her, sinks the boat to see it pop up. The yards are the same things in new arrangements, and the child is faster, surer and trying one new thing (pack: game-design, depth-from-combinations.md; pack: game-design, ages-2-to-4.md).

## The representation

The school idea is cause and effect with water: a child gives water to a thing and sees what the water does to it. It was chosen before the game, and it is the water itself.

- **Water is shown as water behaving truly on true materials.** It flies in an arc and lands. It soaks into dry sand and darkens it. It collects in a hollow thing from the bottom up under a level surface. It lifts a light thing once it is deep enough and not before. It runs over the lowest point of a full thing and then downhill. It pushes what is light and turns a wheel. It puts out a fire and leaves steam. A boat full of water sinks. Each of these is what a child sees with a real hose in a real garden.
- **The amount is visible and never counted.** How much water a thing has had is seen in the thing: the height of the flame, the level under the duck, the stage of the plant, the darkness of the sand. No number, tick mark or meter stands for it.
- **One thing is faster than life.** A seed goes from shoot to flower in three gulps. The direction is true (with water it grows, and a seed that gets none stays a seed for as long as the yard is on screen) and the speed is not: it is a time-lapse. The pack's table of ideas by age gives "Seed to flower in one sitting, the child giving water and light" for ages 2 to 4. This is that row with the water only: the sun is in the yard and is not the child's to give.
- **Evidence.** The rows of that table this game uses (cause and effect as "touch it and something reliable happens; the same touch gives the same result", and the seed to flower row) cite no trial. So the representation is early-years practice with water play and a proposal of the pack, without a trial behind it (pack: game-design, representation-before-game.md).
- **Where the order stops.** At the object. The things on screen are the objects, there is no picture stage, and a band that starts below 6 has no symbol stage (pack: game-design, fade-to-school-symbols.md).

## The four mechanic questions

- **Swap.** No: every result is what water really does to that material, so with the water taken out the grid is empty and no other subject fits into it.
- **Attention.** At the moment of decision the child looks at one thing and at how much water it has had (the flame, the level, the bud) and thinks about what water will do to it next. Aiming takes no thought, because the water lands where the finger is and each thing is about 100 logical pixels across or more.
- **Fun.** The skill is used in the squirt, which is the most enjoyable moment of play, and play never stops for it.
- **Guess.** Yes, and in this band that is meant: every tap gives a true answer and enough water anywhere meets any want, so no child is stuck. What random tapping does not give is the outcome the child meant: the duck afloat and the cat dry, the pool full and not over, the overflow sent to the seed. There is no set of options to try one by one.

## The error as a consequence

Nothing a child does with the hose is wrong, so there is no wrong answer to mark. Three things can turn out other than the child meant, and each shows in the world where and why.

- **Not enough water yet.** The flame stands up again, lower. The duck still sits on the pool floor with the water line under its belly. The bud is closed. The thing itself shows how far it is, and the water already given stays: the flame does not grow back and the pool does not drain. One more gulp is the one thing to change.
- **Water on another thing.** That thing answers in its own way (the cat most of all) and the one that wanted water is as it was, still wanting.
- **Too much.** The water goes where real water goes: over the low side of the rim, out of the hole under the pot, into the boat until it sinks. The overflow is as good to watch as the fill and nothing is spoiled by it: the plant stands, the boat pops up, the duck paddles back.

A stream that lands beside its target leaves a dark line on the sand, which shows exactly where the water went. There is no buzzer, no cross, no reset, and no face turned to the child (pack: game-design, errors-show-as-consequences.md).

## The designed order, and what is stored

**A cycle is a yard.** The truck stands in a yard that holds one to five things. One of them wants water, or the truck wants to put it out. The child ends the yard by ringing the bell on the gate with the hose, which opens the gate, and the truck rolls on to the next yard.

**The order**, one new thing at a time and then combinations. Each place has a few arrangements that take turns, so a return visit meets the same idea in a slightly different yard.

1. `one-thing`. One thing alone with the truck: the small fire, or the seed, or the pool with the duck in it, or a dry patch with the snail on it. Water does something to a thing.
2. `two-things`. One thing that wants water and beside it one that answers differently: the cat or the wheel. Water does different things to different things.
3. `afloat`. The pool with the boat and the duck in it. How much water matters: nothing floats until the pool is deep enough.
4. `downhill`. The pool stands above the seed, the dry patch or the fire, with its low side toward it. Water goes on from one thing to the next.
5. `round-and-round`. The wheel stands beside the thing that wants water, with the cat near by. Water that turns the wheel is flung on.
6. `whole-garden`. Four or five things together, one want, and every earlier idea at hand.

**The harder option** is in the yard and is the child's to pick. From `downhill` on, a want can be met by aiming at it or at one remove, by overfilling the pool above it or spinning the wheel beside it. The longer way looks longer: the child can see the low side of the rim pointing at the pot. Either way stands.

**The positions and their ids** are the six names above, as they stand in `LADDER` in `config.ts`. They name what a yard holds. A first visit starts at `one-thing` for age 2 or younger and for no age, at `two-things` for age 3, and at `afloat` for age 4 or older.

**How a yard is judged**, when the child leaves it or its want is met, whichever comes first:

- **Well:** its want was met, by any route.
- **Mixed:** the child rang the bell with the want unmet, having brought some other thing in the yard to its fill. The child was busy with an idea of their own.
- **Badly:** the child rang the bell with the want unmet and nothing in the yard at its fill.

The position moves one step up after a yard that went well, one step down after one that went badly, and stays after a mixed one. Nothing shows it.

**Which yard a new position lays out.** The next yard already waits beyond the gate while the child plays, laid out when the yard on screen was. So a moved position shows in the yard after next.

**Every field of the saved state.**

- `v`: the version of the shape.
- `position`: the id of the place in the order for the next yard to be laid out.
- `finished`: the want of the yard on screen has been met. Its ending is not played again on load.
- `yard`: the yard on screen, as the id of its place and the number of its arrangement.
- `things`: one entry for each thing in the yard, in the order of the arrangement: the gulps of water it holds (0 to its fill, and one step more for "too much") and the spot it is at, for the things that move (the cat, the boat, the duck, the snail, the floated logs).
- `wet`: the ground as a coarse grid of 16 by 10 cells, each dry, damp, wet or mud.
- `next`: the yard that waits beyond the gate, as place id and arrangement number.
- `turn`: a small number that picks which arrangement comes next for each place. It wraps round and is never shown.
- `seen`: the kinds of thing whose first showing has been given, so that it is given once.

**Not saved**, because each is a view of what is: water in the air, steam, ripples, the wheel's spin, the bee in flight, and how far the gate's latch has been lifted. Sand dries on attended game time only, and no clock is read. The largest legal state is far under half of the 64 KB cap, and a test says so.

## The characters and their fixed tastes

Four animals and the truck. Their tastes never change, so a child can learn them and test them on purpose. No animal has a feeling about the child. The seven things of the grid stay plain: they have no faces.

- **The truck** wants to squirt. It leans toward a flame with its roof light turning, and rocks back with every gulp. It likes having something to aim at. It has no dislikes.
- **The cat** wants a warm dry place. She likes the fire, which she sits beside with her eyes shut, dry sand, and the truck's roof. She dislikes water on her, wet ground under her paws, and a fire that has gone out: she looks at the wet logs, then at the truck, and walks off with her tail up. The joke is on her every time. She is put out and never hurt.
- **The duck** wants to float. It likes water under it and on it: sprayed, it wriggles and quacks. It likes puddles and a ride over the rim. It dislikes a dry pool floor, which it taps with its beak.
- **The snail** wants wet ground. It likes dark sand and puddles, and glides along the line the child drew. It dislikes dry sand, where it stops and pulls in, and the heat of the fire.
- **The bee** wants a flower. She likes an open one: she lands, and it dips under her. She dislikes drops on her wings: she zigzags up with a rising buzz and comes back when the water stops.

The same water delights the duck and the snail and offends the cat and the bee. That is the game's comedy and its feedback (pack: game-design, characters-with-opinions.md).

## The scenes

Every scene is a list of timed beats on the template's `scene.ts`, filled in from the yard as it stands. Each gives way to any touch: the hose works all through it, and what the water hits answers at once.

**The first showing of a new thing** is not a scene. The first time a kind of thing stands in a yard, and after a moment with no touch, the truck swings its nozzle to it and lets go one small spit of water. The thing gives its one-gulp answer at half size. Then the truck waits. It happens once for each kind (`seen`), never after a touch, and never again on load (pack: game-design, guided-discovery.md).

**The want is met** (the ending of a yard, 5 to 9 seconds, caused by the gulp that met it):

- *The fire is out.* The hiss falls, the steam cloud rises and drifts off, the logs drip twice. Whoever is in the yard comes to look, each in its own way: the cat stalks round the wet ring, the snail sets off toward it, the duck waddles through the puddle. The truck settles on its springs and its light stops.
- *The duck floats.* It lifts off the floor, paddles a lap round whatever else floats there, puts its head under with its tail up, and shakes. The ripples settle.
- *The flower opens*, in the colour of this arrangement, petal by petal. The bee lands and the flower dips. A drop slides off a leaf.
- *The snail comes out.* Its eyes unroll, and it glides along the dark line the child made, the same shape, to the wettest place.

**Secrets**, each a short scene that one combination always gives, never hinted at and never counted:

- *The worm.* Ground brought to mud sends up a worm, which looks about and goes back down.
- *The cat on the roof.* Too much water on the cat, as in the grid. A honk sends her off again.
- *The marooned cat.* Where the cat naps in the dry boat, filling the pool floats her out to the middle, where she sits bolt upright.

**Driving on** (about 4 seconds, caused by the third ring of the bell). The gate swings, the truck's light turns, and it rolls through while the yard slides away and the next one slides in with its animal already in the middle of wanting something.

**How a cycle ends, and how the next starts.** A yard ends when the child ends it. After its ending scene the yard stays as it is for as long as the child likes, and everything in it still answers the hose. The gate stands at the right edge with a bell on its post, and over the hedge beside it the next yard shows: a wisp of smoke, a duck's head, a circling bee or a shell on the post. Each gulp on the bell rings it and lifts the latch by a third. The latch drops again after a few seconds without a ring, so a passing sweep rings the bell and opens nothing. The third ring opens the gate. If the child does nothing, nothing starts. The one who waits does not call, hurry or complain. On load no scene plays: the yard is as it was left, with the next one waiting (pack: game-design, endings-and-short-scenes.md).

## The records

Read through the lookup on 2026-10-03. Each record below printed the standing and the check state given beside it on that day. What a record asks is given in the game's own words.

The school skill these records carry is narrower than "what water does to different things". It is cause and effect with water: a child gives water to a thing, can guess what will happen, and sees what does, with filling and growing as the two outcomes the records name. Putting out a fire is the game's story. No record in either jurisdiction names fire or burning, wetting, or washing something away, and the game claims no school skill for them.

### us-ca

Levels: `infant-toddler` at age 2, sub-band the indicator for 23 through 36 months; `preschool-tk` at age 3, sub-band Early (3 to 4 ½ Years); `preschool-tk` at age 4, sub-bands Early and Later (4 to 5 ½ Years), where both statements of a foundation apply. Age mapping: official, as the lookup prints.
Gap: none printed.

- `edu.us-ca.infant-toddler.science.objective.cognitive-development-strand-1-0-exploration-1-1` (`us-ca 1.1`, Infant–Toddler Foundations, Cognitive Development, Strand 1.0): department-published-foundation, confirmed. A toddler makes easy guesses about what an action will bring about and thinks back over why something happened.
  Limits taken: the guesses are simple, and none has to be right. It describes what children typically show, not a requirement on a child. Left open by Limits: what the guesses are about, and any material or event. Water and the seven things are the game's own choice.
- `edu.us-ca.preschool-tk.science.objective.science-strand-1-0-science-and-engineering-practices-1-5` (`us-ca 1.5`, Preschool/Transitional Kindergarten Foundations, Science, Strand 1.0): department-published-foundation, confirmed. A child says what they think will happen, gives an easy reason, and finds out by trying it.
  Limits taken: at the earlier age the guess and the reason are simple and the check is by doing it for real. Talking about why it came out as it did is only beginning at the later age, and the game asks for none. Adult support is stated for the check at the earlier age and for planning it at the later age, not for the guess. Left open by Limits: the topic. Beyond the record, as the game's own choice: the yard makes the check one tap, so a child can make it alone, and the game neither hears nor asks for what the child says.
- `edu.us-ca.preschool-tk.science.objective.science-strand-2-0-physical-science-2-3` (`us-ca 2.3`, the same foundations, Science, Strand 2.0): department-published-foundation, confirmed. A child explores how things and materials change and says what changed.
  Limits taken: explore and describe at the earlier age, with explaining only at the later age. The kinds of change it lists are examples. The game takes exploring: dry sand that turns dark and then to mud, a flame that turns to steam and wet logs. Saying what changed is left to the child and whoever sits beside them.
- `edu.us-ca.preschool-tk.science.objective.science-strand-3-0-life-science-3-7` (`us-ca 3.7`, the same foundations, Science, Strand 3.0): department-published-foundation, confirmed. A child knows plants and animals have to be looked after and is starting to see that food and water help living things grow and stay alive.
  Limits taken: at the earlier age feeding and watering are the two things named and the understanding is still forming. The wider set of needs belongs to the later age and is not in the game. The game takes watering a plant only: it feeds nothing.
- `edu.us-ca.preschool-tk.science.objective.science-strand-4-0-earth-and-space-science-4-1` (`us-ca 4.1`, the same foundations, Science, Strand 4.0): department-published-foundation, confirmed. A child explores earth materials and says what they are like.
  Limits taken: water, sand and soil are among the examples named at the earlier age. Describing a material is asked at both ages and comparing materials only at the later age. The record asks nothing about what water does to another material, so the game rests on it only for water and sand as materials to explore.

No record is named here for filling a container. The game names nothing in its place.

### nl

Levels: `peuters` at ages 2 and 3; at age 4 `peuters`, sub-band up to the fourth birthday, and `fase-1`, sub-band groep 1. Age mapping: convention.
Lane label: at age 4 the lookup also returns the `einde-po` lane, labelled end-of-primary goals. The game uses no record from it.
Gap: none printed.

- `edu.nl.peuters.science.objective.inhoudskaart-orientatie-op-jezelf-en-de-wereld-peuters-verschijnselen-uit-natuurkunde-en-techniek-natuurkundige-verschijnselen-2` (`nl Natuurkundige verschijnselen / 2`, content card Oriëntatie op jezelf en de wereld, peuters): curriculum-institute-guidance, confirmed. Discovering and wondering about light, sound, warmth, force and a lamp, where the force named is that of water and of magnets.
  Limits taken: discovering and wondering only, with no explaining and no measuring. Of water it names only its force: in the game the stream pushes the boat and turns the wheel. It describes what is offered to children, not what a child must be able to do. It states no safety condition for warmth, and the game's fire is the game's own choice.
- `edu.nl.peuters.science.objective.inhoudskaart-orientatie-op-jezelf-en-de-wereld-peuters-verschijnselen-uit-natuurkunde-en-techniek-materialen-stoffen-en-voorwerpen-1` (`nl Materialen, stoffen en voorwerpen / 1`, the same card): curriculum-institute-guidance, confirmed. Experimenting with safe materials, substances and objects.
  Limits taken: no question to answer and no result to reach. Left open by Limits: which materials are safe. Water, sand, a plastic pool and a toy boat are the game's own choice.
- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-meten-meetkunde-meten-inhoud-2` (`nl Inhoud / 2`, content card Rekenen-wiskunde, peuters; a mathematics record): curriculum-institute-guidance, confirmed. Gaining experience with how much things hold by filling, pouring from one into another and emptying.
  Limits taken: the three actions, with no measures and no counting of scoops. The game takes filling (the pool, the boat), pouring over (the pool's overflow into what stands below it) and emptying (the boat that rolls over). It shows no count and no measure.
- `edu.nl.peuters.science.objective.inhoudskaart-orientatie-op-jezelf-en-de-wereld-peuters-planten-dieren-en-de-mens-groeien-bloeien-en-voortplanten-1` (`nl Groeien, bloeien en voortplanten / 1`, content card Oriëntatie op jezelf en de wereld, peuters): curriculum-institute-guidance, confirmed. Experiencing that plants grow and flower.
  Limits taken: experiencing only, with no words, no explanation and no names of plant parts. It names growing and flowering only. What a plant needs in order to grow is not in this record, so for a child at this level the game rests on it for the seed that grows and flowers, and not for the watering.
- `edu.nl.fase-1.science.objective.inhoudskaart-orientatie-op-jezelf-en-de-wereld-fase-1-planten-dieren-en-de-mens-groeien-bloeien-en-voortplanten-1` (`nl Groeien, bloeien en voortplanten / 1`, content card Oriëntatie op jezelf en de wereld, fase 1; the same printed code as the record above, on another card): curriculum-institute-guidance, confirmed. Realising that plants, animals and people need water, food and a place in order to live.
  Limits taken: a realisation, not an explanation. Of the three needs it names the game takes water, and of the three kinds of living thing it takes a plant. It says what a school offers in groep 1 and 2 and not in which year.

### Where the two differ

- **At age 2.** California has one record, on cause and effect, which names no material. The Dutch cards for peuters name the force of water and the filling of containers. The game follows the California record's breadth for its verb (do a thing, see what follows) and takes water's force and filling from the Dutch cards. It does not present either as the other.
- **Watering and growing.** California's foundation has watering help a plant grow from age 3, as an understanding still forming. For Dutch two- and three-year-olds the card has plants growing and flowering and says nothing of what they need; the need for water is on the fase 1 card, for a child of 4 in groep 1. The seed yard is the same for every child. The game's claim for a Dutch child at the `peuters` level is the growing and flowering only.
- **Saying it.** The California foundations for ages 3 and 4 include the child saying what they expect or describing what changed. The Dutch cards for peuters ask for discovering, wondering, experimenting and gaining experience. The game hears no speech and asks for none, so at this point it follows the Dutch verbs, and the saying in the California foundations is left to the child and a grown-up beside them.
- **Filling** is a Dutch mathematics record here. No California record is named for it.

### The claim

Fire Truck Hero is designed from five learning foundations published by California state departments for infants and toddlers and for preschool and transitional kindergarten, which are foundations and not standards, and from five bullets of the content cards of SLO, the Dutch curriculum institute, four for peuters and one for fase 1, which are guidance and not law. All ten records were confirmed when read on 2026-10-03. What the game is designed from them to offer is cause and effect with water, with filling and growing as its two named outcomes. Its fire is a story and rests on no record.

## The look

**Garden-toy plastic**, the first look reserved for the game in the ledger of `docs/art-direction.md`. Spiked on the game's real scene and in use from the first screenshot. The numbers are in `look.ts`, and `look.test.ts` holds them apart.

**What it is.** A back garden of outdoor toys on a sunny day. Every toy is machine-made: one fat blow-moulded shell with rounded edges, a darker mould seam round its middle, small sunk screw bosses, and sun-faded primary colours with a satin shine. Nothing is hand-made: no thumbprints, no grain, no brush. Next to the claimed looks it is the only one of hard plastic, and it stands outdoors on sand and grass in daylight.

**The scene.** A sand pit seen from the near side and well above, 16 units wide and 10 deep, inside a cream picket fence at the far edge and fat green hedges at the sides, with grass and two lollipop trees beyond. The truck stands at the left, turned a little toward the child so its face shows. The gate hangs in the far fence toward the right, with its bell out over the sand, so what waits beyond it can show over the fence. Nothing a child needs stands in the near strip of sand, which is the bottom of the screen.

**Palette.**

- Sand: pale warm `SAND.dry`, with a faint speckle and soft raked ridges. Wet sand is clearly darker (`SAND.damp`), mud darker again and lumpy with a wet shine, standing water a pale blue sheet with a light rim.
- The truck: faded tomato red with a cream stripe and bumper, yellow ladder, hubs and nozzle, a blue roof light, grey tyres.
- Each thing has a hue of its own, so a two-year-old tells them apart by colour alone: the pool blue, the duck yellow, the fire orange, the cat lilac, the pot terracotta, the plant green with a pink flower, the boat teal, the wheel amber.
- Water in the air: light blue with a white shine.
- The idle cue: a blue ring and a blue ghost hand with a cream cuff, a hue that neither the sand nor the grass has.

**Materials.** One satin plastic for every toy: a single material with the colour in the vertices, so a toy is one moulding and one draw call. Flames are a second, unlit material, so a flame never has a shaded side. Water is a third, shiny and a little clear. The ground is one plane with one small shader: sand inside the yard with a soft wobbly edge, grass outside, and the wet sand read from a small picture (`wetPaint.ts`). No texture is loaded: everything is drawn by code.

**Lighting.** One sun from the upper left and a pale sky light with a warm bounce from the sand. No shadow maps: every toy has a soft blob shadow on the sand, drawn as one instanced mesh. No post pass and no tone mapping, so the colours stay as chosen.

**Faces.** The animals and the truck have faces; the seven things of the grid have none. The truck's face is its windscreen: two big whites with pupils that look where the nozzle points, and a cream bumper for a mouth.

**Motion rules.**

- Everything with weight sits on a spring (`springs.ts`) and is stepped on game time in short steps, so a slow device plays the same motion.
- The truck moves like itself (`truckMotion.ts`): eager, springy and a little heavy. A gulp rocks it back and it swings forward past level before it settles. A honk hops the whole truck, which hangs for a moment, lands once and bounces low. The nozzle is quick and loose and overshoots. The roof light is heavy: it turns once and stops without swinging back. At rest the body bobs like a motor ticking over, and it blinks at uneven gaps.
- Water is fat: a gulp is one big blob with a few drops round it, stretched along its way, and every landing throws up a small splash.
- In the spike, each thing idles in its own way: the flames flicker, the cat's head turns slowly, the duck rocks, the flower sways, the bell swings.

**Quality tiers** (`config.ts`). A tier changes drawing only. Tier 0 is the full look at a pixel ratio of 2. Tier 1 lowers the pixel ratio to 1.5. Tier 2 lowers it to 1.25, flattens the ground's grain to plain colours and draws seven in ten of the stream's small drops. Tier 3 is a pixel ratio of 1, matte plastic without the satin highlight, and half the small drops with no splashes. The toys, the colours, the blob shadows and the water's marks on the sand are the same on every tier, and so is how much water lands and where.
