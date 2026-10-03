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
- **One thing is faster than life.** A seed goes from shoot to flower in three gulps. The direction is true (with water it grows, and a seed that gets none stays a seed for as long as the yard is on screen) and the speed is not: it is a time-lapse. The pack's table of ideas by age gives "seed to flower in one sitting, the child giving water" for ages 2 to 4, and this is that.
- **Evidence.** The rows of that table this game uses (cause and effect as "touch it and something reliable happens; the same touch gives the same result", and the seed to flower row) cite no trial. So the representation is early-years practice with water play and a proposal of the pack, without a trial behind it (pack: game-design, representation-before-game.md).
- **Where the order stops.** At the object. The things on screen are the objects, there is no picture stage, and a band that starts below 6 has no symbol stage (pack: game-design, fade-to-school-symbols.md).

## The four mechanic questions

- **Swap.** No: every result is what water really does to that material, so with the water taken out the grid is empty and no other subject fits into it.
- **Attention.** At the moment of decision the child looks at one thing and at how much water it has had (the flame, the level, the bud) and thinks about what water will do to it next. Aiming takes no thought, because the water lands where the finger is and each thing is about 100 logical pixels across or more.
- **Fun.** The skill is used in the squirt, which is the most enjoyable moment of play, and play never stops for it.
- **Guess.** Yes, and in this band that is meant: every tap gives a true answer and enough water anywhere meets any want, so no child is stuck. What random tapping does not give is the outcome the child meant: the duck afloat and the cat dry, the pool full and not over, the overflow sent to the seed. There is no set of options to try one by one.

## The error as a consequence

What a wrong attempt does in the world, where it shows, and that the state stays so the child changes one thing and tries again.

## The designed order, and what is stored

The order of challenges with one new thing at a time, the positions with their stable ids as they stand in `config.ts`, what a cycle that goes well or badly is, and every field of the saved state.

Where the next customer already waits on screen while the child works, say which customer a new position lays out: the position moves when a cycle is judged, and the one who waits was laid out before that, so the change shows on the customer after next.

## The characters and their fixed tastes

Each character's one visible want and the likes and dislikes that never change, or what gives the feedback in a game with no character.

## The scenes

Each short scene with what causes it, its beats, what from the state of play fills it in and how it gives way to a touch, then how a cycle ends and how the next one starts.

## The records

One heading per jurisdiction, never one list or table that pairs them; a game with no learning goal has no records part.

### us-ca

The records the game is designed from, by pack id or official code, each with its standing and check state as the lookup prints them; the level with the basis the lookup prints; any lane label and any gap as printed; and the limits taken from each record's Limits. The pack's own Summary or the game's own words only, never the official wording.

### nl

The same four things for the Dutch records, with the regime of a core goal.

### Where the two differ

Each difference written as a difference, and which jurisdiction the game follows at that point.

### The claim

One sentence in the words of each record's standing saying what the game is designed from, with the state and reason for any record that is not confirmed, and no word about what a child has reached.

## The look

Written after the style spike, not part of the sheet: the claimed look, the palette, materials, lighting and motion rules, and how each tier in `config.ts` keeps the look.
