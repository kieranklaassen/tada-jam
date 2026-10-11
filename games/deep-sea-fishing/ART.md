<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

Deep Sea Fishing comes from the lab demo of the same name. The demo lends the line that goes down into a darkening sea and comes up again; its coins, selling, upgrades, pelican, depth record, collection and the dive that ends when a fish is touched are gone. The idea the child feels: the line goes down into the dark, and the sea is full of creatures who always behave the same way. The verb: hang a bait on the hook, draw the line down as deep as wanted, and draw it up again. The world answers through nine creatures, each with a fixed answer to each of six baits, and through the ship's cat on deck.

## The band and its age rule

The manifest band is 7 to 11, and its youngest age, 7, governs the design.

- **Cue table.** The row for 7 and up in `docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md`. Its "Avoid" column is kept as a hard limit: no written word or letter, no symbol standing alone that play depends on reading, no timers, points or verdict chrome, no long hint chains. Several things may be on offer at once as long as each reads at a glance, so the six baits hang side by side.
- **Pack rule for the age.** The band lies across two of the pack's ranges. From 9 it is held to `ages-9-to-12.md` (pack: game-design): a system that behaves truly and always the same, more than one way to a result, failure that is large, funny and free, dry humour, nothing babyish, no stored best. For 7 and 8 the reach of a nine-year-old is not assumed: everything works with a tap or a plain drag, nothing needs speed, the only two things that need a place (the blobfish's open mouth and the net) hold still or drift slowly and can be tried again at once, and the first bait is already on the hook.
- **Symbols.** The band starts above 6, so numerals would be allowed beside a quantity. The game draws none: nothing in it is counted. It has no `symbols.ts`.
- **What `ctx.childAge` sets.** Only how a first visit is laid out, as a default and never a gate:
  - 8 and younger: the worm is already on the hook, and the hook hangs straight down from the tip of the rod in the sunlit water, clear of every creature's stretch but one: the turtle, swimming its own slow way, comes to the worm within a few seconds, stops with its nose beside it and looks at it. Nothing more happens until the child draws the line, and the line goes round the hull only when the child draws the hook there.
  - 9 and older: the hook is bare and hangs just under the boat, and all six baits are on their pegs.
  - No age (`null`): as 8 and younger.
  - In all three the whole sea is open from the first touch, every bait can be taken, and a saved state wins over the age.

## The toy

The one action the finger performs most is drawing the line: a finger set down anywhere in the sea is where the hook goes, as near as the boat and the net let it, and the hook follows the finger for as long as it stays down.

- **When the finger lands.** In the same frame the reel lets out its first click, the line tightens toward the finger and the hook starts after it with a little swing, as a weight on a line does. Every eye in the sea and the cat's on deck turn to the hook.
- **Going down.** The reel clicks as the line pays out, one click for each stretch of line, lower in pitch the deeper the hook is. The cloth grows darker toward the bottom, and whoever lives down there is dimmer than whoever lives in the sun, except where they make their own light.
- **Coming up.** The clicks climb again, quicker and higher. A hook drawn above the waterline comes out with a splash and hangs dripping under the rod.
- **Letting go.** The hook stays where the finger left it and swings to rest. A tap is enough: the hook goes to the tap.
- **Passing someone.** A bare hook that comes within reach of a creature is answered by that creature in its own way, as the last table of the grid below has it. Nothing is caught with a bare hook. With a bait or without, a creature at home is touched where it is drawn: a hook laid anywhere on its body, shell, tentacles or tail, is answered. The creature brings the part of it that answers to the hook (the turtle brings its mouth round to a worm laid on its shell), the octopus and the blobfish answer from where they are, and the shark answers at once a hook laid above or below its mouth.
- **Why it is a pleasure with no goal.** The weight of the hook on the line, the reel's falling and climbing clicks, the dark closing in and nine large creatures who each do something different when the hook swings past. Random dragging always sets something off, and nothing can be done wrong. Nothing in the sea passes through anything else: whoever the hook brings along pushes the others a little way aside, and one that has nowhere near to go keeps its place and slips round at its own pace while the one that came at it waits; nobody jumps.

On deck the cat, the tub and the gull each answer a touch as themselves (the cat mews and stretches, or mews where it is, mouth open and tail lashing, while it is busy with a catch or lying flat; the tub slops and the cat flinches at it, unless it is busy; asleep in the tub after a trip the cat is touched there, stirs and sleeps on; the gull squawks and hops). Nothing a child can touch lies under the jam's round home control at the top centre, and the top right corner holds nothing that answers: a finger set down there, or drawn into it with the line, moves nothing while it is there.

The idle ladder in its first form: after a few seconds with no touch the hook glows, and then a ghost hand draws the hook a little way down and lets go. It shows that the line can be drawn, and never where to draw it. In the finished game it points at what can be done next, and still never at a creature: with a catch on the hook the hand draws the hook up toward the boat; with a full tub the tub glows instead of the hook and the hand taps it; and with a bare hook that nobody follows the worm's peg glows as well as the hook, and the hand by turns draws the hook down and taps that peg.

## The object-by-action grid, and what is new on day 15

The objects are the six baits: a worm, a shiny spoon, a glow stick, a piece of cheese, an old boot, and nothing at all. The action is always the same one, bringing the hook to someone, and the nine creatures are who it can be brought to. So the grid is six baits by nine creatures, 54 cells. Each cell is that creature's answer to that bait. It never changes, it works from the first day, and no cell is locked. In 18 of the cells the state of play changes: a bite, a steal, a follower, a flight or the tow. The other 36 are a joke and no more; they are there because no bait is ever met with nothing, and day 15 does not rest on them.

Six kinds of outcome run through the cells:

- **Bites.** The creature is on the hook and comes up with the line. Lifted out of the water it swings into the tub. The cat sits where the catch will swing over, so it flattens itself on the deck, with a small yelp, before the catch leaves the water, and sits up again when the catch has gone by overhead. From the bite on, the hook carries the creature and no bait: `bait` is `none` and the bait is back on its peg, as after a steal. The boot a jellyfish or an octopus comes up with is drawn as part of that catch.
- **Steals.** The bait is gone from the hook and is back on its peg at once. Nothing runs out.
- **Follows.** The creature trails behind the hook for as long as that bait is on it, and those who follow line up behind each other as a train. When the bait changes or is stolen, a follower drifts home at its own pace.
- **Flees upward.** The creature bolts straight up to the surface from where it was met. If it comes up under the landing net that hangs off the stern, the net scoops it into the tub; anywhere else it bumps the hull or breaks the surface and swims home. Whether the net gets it is never luck: at home each creature drifts to and fro along its own stretch of its layer, slowly and always the same way, except that the shark hurries round its stretch to a hook laid on its body level with its mouth and the pufferfish hurries along its stretch to a worm hung beside it, the stretches of the squid and the pufferfish pass under the net, and the child can see where each one is and wait for it.
- **Tows.** A short scene (under "The scenes").
- **A joke and no more.** Nothing changes but the moment. Whoever holds the hook in its joke (the octopus's handshake, polishing and pot, the anglerfish's tangle, the shark with the spoon or the boot, and the pufferfish, the turtle and the squid with the boot) lets go the moment the finger draws the hook away from it, and what the joke was sounding stops in that frame.

The creatures live in three layers. In the sunlit water: the shoal, the pufferfish, the turtle. In the twilight: the squid, the jellyfish, the shark. In the midnight water and on the seabed: the anglerfish, the octopus in its pot, the blobfish.

### The worm

| Creature | What is seen | What is heard | Outcome |
| --- | --- | --- | --- |
| Shoal | The whole shoal spins round the worm as a funnel and nibbles it away to nothing; the hook comes out clean. | A fast run of tiny ticks that climbs, like rain on a tin. | Steals |
| Pufferfish | Sucks the worm in like a noodle, finds the hook, and blows up round; it comes up as a spinning ball on the line. | A long slurp, then a squeak that rises as it swells. | Bites |
| Turtle | Chews the worm off the hook in three slow bites without ever touching the barb, then blinks. | Three slow crunches and a swallow. | Steals |
| Squid | Two long arms shoot out, snatch the worm and the squid jets off backwards with it. | A snap and a rush of water. | Steals |
| Jellyfish | A tentacle brushes the worm, which frizzes into a tight spring for a moment and then uncurls and droops again, unharmed. | A dry crackle, then a slide down. | A joke |
| Shark | Swallows worm and hook in one gulp without noticing either, and swims on with the line. | A deep gulp and the line creaking tight. | Tows |
| Anglerfish | Swings its lamp over to look, and snaps; it comes up on the hook with its lamp lighting the way. | A click of the lamp, then a low chomp. | Bites |
| Octopus | One arm unhooks the worm as tidily as a waiter, and a second arm pats the hook. | A cork pop and two soft pats. | Steals |
| Blobfish | Opens its mouth and waits. Only a worm lowered right into the mouth is taken; then it is on the hook, and it sags a little more with every layer it is drawn up through. | A slow creaking yawn, then a gulp. | Bites |

### The shiny spoon

The spoon flashes only where there is light: in the sunlit water, and beside anything that glows. In the dark it is dull.

| Creature | What is seen | What is heard | Outcome |
| --- | --- | --- | --- |
| Shoal | Every fish turns at once, the whole shoal flashes back like a mirror, and it streams after the spoon as a ribbon. | A shimmer of small bells, with one chime at each turn. | Follows |
| Pufferfish | Sees the flash, swells in fright and bobs up to the surface like a balloon. | A squeak rising fast, then a rubbery bump at the top. | Flees upward |
| Turtle | Sees itself in the spoon, likes what it sees, and paddles after it turning its head from side to side. | Two slow, pleased hums, the second lower. | Follows |
| Squid | With no light near, taps the dull spoon three times with one arm, as on a triangle. With a light near, the spoon flashes: a cloud of ink, and the squid bolts straight up. | Dull: three small tings. Flash: a wet puff and a whistle upward. | A joke, or flees upward |
| Jellyfish | Its own glow flashes in the spoon, and it sways with its reflection as with a partner. | A ringing glass note that wavers. | A joke |
| Shark | Bites the spoon, its teeth ring, and it shakes its head until one tooth drops out and a new one slides into its place. | A clang like a dropped pan, then a rattle. | A joke |
| Anglerfish | Its lamp flashes in the spoon and dazzles it: its eyes go round in circles and it drifts in a slow loop. | A pop like a flashbulb, then a wobbling slide down. | A joke |
| Octopus | Takes the spoon, polishes it on its own head, and hangs it back on the hook. | Squeaky rubbing, then one bright ting. | A joke |
| Blobfish | With no light near, stares past the spoon at nothing. With a light near, sees its own face in it and lets out its breath. | Dark: a flat hum. Light: a long sigh that sinks. | A joke |

### The glow stick

In the sunlit water daylight drowns the glow, so nobody there takes it for a light.

| Creature | What is seen | What is heard | Outcome |
| --- | --- | --- | --- |
| Shoal | The shoal swims round the stick; one fish bumps its nose on it and shakes its head. | One dull knock. | A joke |
| Pufferfish | Boxes the stick with its nose, left and right, like a punch bag. | Two springy boings. | A joke |
| Turtle | Blinks at it slowly, shuts its eyes and dozes off where it floats. | A whistling snore. | A joke |
| Squid | Answers the light with bands of light running down its own skin, and hovers face to face with the stick; when the stick leaves, it waves one arm. | A bubbling warble, a question and then an answer. | A joke |
| Jellyfish | Beats in time with the glow, grows brighter, and drifts after the light. | A slow swell of two notes, in and out like breathing. | Follows |
| Shark | Swallows the stick, and its belly lights up from inside so that its bones and an old boot show through. For a while the shark is itself a light. | A gulp, then a low glowing hum. | Steals |
| Anglerfish | Falls for the light: its own lamp droops shyly, and it follows the stick wherever it goes, up through every layer. | Two rising notes like a sigh, then a soft double thump. | Follows |
| Octopus | Carries the stick into its pot, which glows through its cracks with the shadows of arms on the inside, then hands it back out. | A hollow hum from inside the pot. | A joke |
| Blobfish | Squints, grumbles, turns to face the other way and pulls sand over itself. | A low wobbling grumble. | A joke |

### The cheese

| Creature | What is seen | What is heard | Outcome |
| --- | --- | --- | --- |
| Shoal | Each fish takes one taste, spits out a crumb, and the whole shoal turns its tails to the cheese. | A chorus of tiny spits. | A joke |
| Pufferfish | Sniffs once, goes cross-faced with its spines out, and sneezes itself backwards. | Three short breaths in, then a burst. | A joke |
| Turtle | Wrinkles its nose and pulls head, flippers and tail into its shell, which rocks where it floats. | A wooden clunk and a hollow roll. | A joke |
| Squid | One whiff and it is gone behind the biggest ink cloud it has. | A wet thump. | A joke |
| Jellyfish | The cheese stretches into long strings between its tentacles, like a cat's cradle. | A rubbery twang that rises. | A joke |
| Shark | Bites, goes cross-eyed, spits it out in a cloud of crumbs and wipes its tongue on the fishing line. | A falling groan, then a splutter. | A joke |
| Anglerfish | Dips its lamp into the cheese like a fork into a pot and licks it clean. | A plop and a smack of lips. | A joke |
| Octopus | Turns cheese-yellow with holes and holds quite still beside the cheese, so that there are two. | A sliding note down, a silence, and a cork pop as it turns back. | A joke |
| Blobfish | The one thing it wants: its eyes go wide, its nostrils open, and it crawls after the smell wherever it leads, upward too. | Three sniffs that climb, then a low happy hum. | Follows |

### The old boot

| Creature | What is seen | What is heard | Outcome |
| --- | --- | --- | --- |
| Shoal | The shoal pours in at the top of the boot and out through the hole in the toe, round and round. | A hollow rushing with small pops. | A joke |
| Pufferfish | Hides inside the boot, then swells until the boot bulges round and pops off. | Leather creaking tighter, then a pop. | A joke |
| Turtle | Puts one flipper into the boot and tries to walk; it goes round in a circle. | A flap and a thud, twice. | A joke |
| Squid | Wears the boot as a helmet and jets about bumping into things. | Muffled thumps. | A joke |
| Jellyfish | Settles on the boot like a wig on a head, and comes up sitting on it. | A wet plop and a wobble. | Bites |
| Shark | Worries the boot like a dog with a slipper, so that the line jerks and the boat rocks, then lets it go. | A growl that shakes, with flaps. | A joke |
| Anglerfish | Fishes for the boot: dangles its lamp at it and waits. The boot does nothing, and the lamp dims. | A hopeful note rising, then one falling. | A joke |
| Octopus | Moves out of its pot and into the boot, and comes up in it: a boot with eyes and arms. | A squelch and a long slither. | Bites |
| Blobfish | Lays its head on the boot as on a pillow and sleeps. | A soft thud and a bubbling snore. | A joke |

### Nothing on the hook

This row is the toy.

| Creature | What is seen | What is heard | Outcome |
| --- | --- | --- | --- |
| Shoal | The shoal parts round the hook like a curtain and closes behind it. | A soft sweep down and up again, like a hand across strings. | A joke |
| Pufferfish | Poked, it swells, floats up a little way, and lets its air out. | A squeak up, then a long flutter down. | A joke |
| Turtle | Leans its shell against the hook for a scratch, eyes shut, one back flipper thumping. | A rasp and a run of knocks on wood. | A joke |
| Squid | Startles, leaves a small puff of ink, jets away backwards (for a squid that is mantle first, so straight up out of its ink) and creeps back. | A short squirt. | A joke |
| Jellyfish | Twines its tentacles round the line and swings under the hook for a while, then lets go. | A wobbling glassy chord. | A joke |
| Shark | Opens wide and uses the hook as a toothpick: drawing the hook along its teeth plays them one by one. | A plink for each tooth, each at its own pitch, and a snap when it shuts. | A joke |
| Anglerfish | Its lamp line and the fishing line tangle, and it pulls: the hook dips, the boat dips, then it lets go. | A long creak and a twang. | A joke |
| Octopus | Takes the hook in one arm and shakes it three times, like a hand. | Three rubbery squeaks. | A joke |
| Blobfish | Yawns one huge bubble, which rises through the whole sea and pops under the boat. | A deep blorp, and a long while later a pop. | A joke |

### Who passes whom

Whatever is on the hook, hooked to it or following it passes the others on its way, and three rules hold everywhere:

- **A light in the dark.** The glow stick, an anglerfish that is hooked or following, the jellyfish and the shark with the stick inside it are lights. Below the sunlit water a light shows whoever is near it, makes the spoon flash, sets the squid's skin flashing in answer, and draws the jellyfish after it.
- **A hunter going by.** An anglerfish that is hooked or following, and the shark while it tows, are hunters. As one goes by, the squid bolts straight up, the pufferfish swells and bobs up, and the shoal scatters and gathers again. A hunter that is found hanging beside them when the game is opened scares nobody: nothing starts until the child draws the line, and whoever it hangs beside is already past its scare.
- **Ink.** Whoever is following loses the line in an ink cloud and drifts home, so a train breaks where it meets ink. A catch drawn up through ink comes up black; the black is short-lived and has washed off by the time the game is opened again.

The wrong use of every bait works and is the better joke: cheese for a squid, a boot for a shark, a spoon in the dark, nothing at all for anyone.

Three things in the sea are true to nature, and are meant as such: light fades with depth, so the sunlit water is bright and the midnight water is nearly dark; some creatures of the deep make their own light; and a blobfish is a trim fish at its own depth, and sags only as it is drawn up.

**On day 15** the child fishes for a scene on purpose. On day 1 a bait went down and something happened. On day 15 the child knows who bites, who steals, who follows and who bolts, and the three rules of passing, and sets them up: the glow stick to lead the anglerfish up through the squid so that they bolt into the net, the cheese to walk the blobfish up to the boat and watch it sag, the lit shark with the jellyfish trailing behind it, a spoon swapped in beside a borrowed light. Nothing new has been handed over; the same six baits and nine creatures make it.

## The representation

The game has no learning goal, so no school idea is represented in its objects.

## The four mechanic questions

The game has no learning goal, so the four questions about a school skill do not apply to it.

## The error as a consequence

There is no wrong attempt, only a bait that someone answers in a way the child did not expect. What that looks like in the world:

- **The answer says who and why.** It happens at the creature, in the creature's own manner, at the moment the bait arrives: the squid inks at the cheese, the turtle shuts itself away from it, the blobfish comes for it.
- **The state stays.** A bait that was not eaten is still on the hook. A stolen bait is back on its peg. A follower that lost the line is back at home. So the child changes one thing, the bait, the depth or the way past someone, and tries again.
- **Nothing is lost.** A fifth catch does not fit a tub of four: it bounces off the pile, falls back into the sea with a splash and swims home. A creature that flees upward away from the net bumps the hull and swims home.
- **No verdict.** No sound, mark or face tells the child that something was wrong. The cat's opinion is about the catch.

## The designed order, and what is stored

There is no order of challenges. The game has one place, with the id `sea` in `config.ts`, and the position never moves: every trip is played there.

- **What a first visit starts with, by age.** As under "The band and its age rule": 8 and younger, and no age, start with the worm on the hook under the tip of the rod, where the turtle comes to it; 9 and older start with a bare hook under the boat. Age sets that and nothing else.
- **What play changes.** Nothing is unlocked, added or taken away by playing. The deep is open on the first touch and is the harder choice the child can see: it is further down and darker, the spoon is dull there without a light beside it, and the blobfish takes the worm only when it is lowered right into its mouth. What play changes is only what the child left: the bait on the hook, where the line hangs, who is in the tub and who follows.
- **How a trip is judged.** It is not. `finishCycle` is called with a mixed outcome when the tub is tipped out, so the position stays.

Every field of the saved state:

| Field | What it holds |
| --- | --- |
| `v` | The version of the record, 1. |
| `position` | Always `sea`. |
| `finished` | True from the moment the full tub is tipped out until the next trip begins. |
| `bait` | What is on the hook: `worm`, `spoon`, `glow`, `cheese`, `boot` or `none`. |
| `hook` | Where the hook hangs at rest, as two whole numbers in stage units. While a finger is drawing the line this is still where the line was taken up, so nothing is saved in the hand. |
| `hooked` | Who is on the hook, or nobody. |
| `following` | Who follows the hook, in order from the nearest. |
| `tub` | Who is in the tub, up to four, in the order they landed. |

Everything else is a view of those fields or is short-lived. A creature that is not hooked, following or in the tub is at home, and its drifting there is not saved. Ink clouds, the black on an inked catch, the light inside the shark, a tooth on the seabed, the ink on the cat, the sand the blobfish pulled over itself, the turtle's doze or a bubble are short-lived and gone when the game is opened again. A largest state, with four in the tub and either one on the hook or two following, is well under a kilobyte: no bait draws more than two after it, and a bite takes the bait off the hook, which sends whoever followed it home.

Put away under a finger that is still drawing the line, the hook goes back to where it was taken up. A hook the finger had already let go stays where it was let go. Until the child draws the line again nobody starts an answer: a creature that the hook already hangs beside, or whose stretch brings it to the hanging hook, stops beside it and looks at it, without a sound, and answers at the first touch on the line. Nor does anything else begin by itself before that touch: the jellyfish does not drift after a light that hangs near it, and the cat does not dream of a shoal under the hull.

## The characters and their fixed tastes

Each has one want that can always be seen, and tastes that never change. The cells of the grid are those tastes in full; this is each one in a line.

- **The ship's cat**, on deck beside the tub. Its want: something in the tub to look at. It watches the hook go down and the tub fill, and gives its opinion of each catch as it lands, the same opinion every time:
  - the pufferfish: pats it once, pricks its paw, and glares while it licks the paw;
  - the jellyfish: pokes it, and every hair stands on end;
  - the anglerfish: chases the lamp like a spot of light on a wall, pounces, misses and falls in;
  - the octopus in the boot: is patted on the head by one arm, and purrs against its will;
  - the blobfish: stares at it, is stared at, and slowly sags to match;
  - the squid: is inked, and is a black cat with two round eyes until it sneezes.
  The shoal is never caught and is the cat's dream all the same: when the shoal follows the spoon up to the hull, the cat leans over the rail, drools and pats the water, and the fish jump over its paw.
  The cat never eats or hurts a catch, and has no feelings about the child.
- **The shoal.** Wants whatever shines. Timid, and moves as one.
- **The pufferfish.** Wants to be left in peace, with one weakness: worms. Anything sudden blows it up.
- **The turtle.** Wants a good scratch and a look at itself. Slow, vain, and cannot be hurried or hooked.
- **The squid.** Wants to keep its distance. Curious for a moment, then ink.
- **The jellyfish.** Wants light, and drifts toward any. It has no opinions, only tentacles that hold on to whatever they touch.
- **The shark.** Wants to bite whatever is in front of it, and never learns what it bit.
- **The anglerfish.** Wants a light of its own to keep, and falls for any other.
- **The octopus.** Wants to handle everything, tidily, and to live in the best container on offer.
- **The blobfish.** Wants to be left lying, and wants cheese more.
- **The gull**, on the post at the edge. A bystander with no part in the fishing: it preens, watches the catch come up, and squawks and hops when touched.

Every creature's want shows before a touch: the shoal turns to anything bright, the pufferfish eyes the hook sideways, the turtle rubs its shell on the kelp, the squid hangs back with its eyes on the hook, the jellyfish leans toward the nearest light, the shark patrols with its mouth a little open, the anglerfish gazes at its own lamp, the octopus sorts shells at the mouth of its pot, the blobfish lies with its nose toward the boat, and the cat sits with its paws on the rim of the tub.

## The scenes

Two short scenes, each built from the state of play, each giving way to any touch: the touch lands every beat that is left, without its sounds, and is then an ordinary touch; whatever of the scene was still sounding stops in that frame.

**The tow.** Cause: the shark takes the worm.

- Beats, about seven seconds: the gulp; the line goes tight and the rod dips; the boat lurches after the shark and the cat digs its claws into the deck; the shark swings round in a wide loop with the boat behind it, tub slopping; the shark notices the line at last, looks along it to the boat, and spits out the hook; the boat glides back to where it lay and the cat shakes itself.
- Filled in from the state of play: where the shark was when it bit, and what is in the tub and slops. Nobody is following when the shark takes the worm: nobody follows a worm, and hanging the worm on the hook sends home whoever followed another bait.
- Saved when it starts: `bait` is `none`, `hooked` is nobody, `following` is empty, and `hook` is its place under the boat in the sunlit water. `tub` is unchanged: nothing slops out, and the net travels with the boat, so whoever bolts from the towing shark comes up beside the hull and swims home and nobody is scooped during the tow.

**The tip-out,** which ends a trip. Cause: a tap on the tub when it holds four. The tub is touched on its staved side, below the rim. The catches stand above the rim, each large enough to tell who it is at arm's length, and so close that neighbours overlap at their edges and never over the middle of one another; a touch where two overlap goes to the one drawn in front, and an empty place above the rim is air. The cat's paws rest on the rim beside them, so no catch and no part of the cat lies over the side, a tap on a catch or on the cat is never taken for the tub, and an overlap test holds that at 1180 by 820 and at every other surface size the game's tests use.

- Beats, about eight seconds: the tub tips over the rail; each catch slides out in the order it landed, with its own splash, and swims home; the cat rides the wave down the deck; the boat rocks hard and settles; the line winds in to the rod; the lantern on the stern post is lit and the cat curls up in the empty tub.
- Filled in from the state of play: the four in the tub, in their order.
- Saved when it starts: `tub` is empty, `finished` is true, `hooked` is nobody, `following` is empty, and `hook` is its place just under the boat. `bait` is unchanged.

What is not a scene and blocks nothing: a catch lifted out of the water swings into the tub, or bounces off a full one, and the cat gives its opinion; the net scoops whoever bolts up under it; a tap on one catch in the tub tips that one back over the rail, and it swims home; if the cat was still giving its opinion of that catch, the opinion ends with it, picture and sound. Each of these changes `tub`, `hooked` or `following` and is saved at once, when it starts.

**How a trip ends and the next begins.** A trip has no set length. The tub fills only as the child lands things, and tipping it out is the child's act; before it is full a tap on the tub only slops it. After the tip-out the scene stays as it ended for as long as the child likes: the lantern lit, the cat asleep in the tub, the boat rocking, the sea going about its business. Nothing new starts by itself. The next trip begins when the child touches the line: the cat wakes and stretches, the lantern goes out, and the hook goes where the finger is. Opened again after a put-away, the game is as it was left, with no scene played again. A game that was only parked comes back in exactly the same way as one that is opened from its saved state: a scene or a joke that was running is over, and the idle ladder starts from its beginning.

## The records

The game has no learning goal, is designed from no record and claims no school skill.

## The look

Written after the style spike, and not part of the sheet. The look is **Batik cloth**, the first row reserved for this game in the menu of `docs/art-direction.md`. The spike passed on clarity and on the frame budget, and the lead kept it after the toy, so the second reserved row was not tried. The text of the registry row is at the end of this file, as a request to the lead.

**What it is.** The whole frame is one length of wax-resist cloth. The cloth is dipped in indigo and is darker toward the bottom, so the dye is also the depth of the sea. Every figure is the cloth left undyed, in cream and ochre. No figure has an outline: an edge is where the dye stopped, and it has crept a little. Detail inside a figure is cut out of it, so the dark of the cloth shows through as a gill, a scale row, a stripe.

**Palette.** Three dyes, the cloth and one blue for the water in the tub, and nothing else:

| Name | Value | Where |
| --- | --- | --- |
| Cream | `#f3e6c2` | Every figure's main fill, the line, bubbles, the hand |
| Ochre | `#dca548` | Second fill: bellies, fins, the hull's stripe, the pot, the tub, the sand |
| Dark | `#131a3c` | Pupils, mouths, brows, ink: the deepest dye, drawn live over a figure |
| Tub water | `#3d5ea6` | The water in the tub only, with a cream line along its top, so that it reads as water and not as a heap |
| Sky | pale indigo, lighter at the top | Above the waterline |
| Sea | indigo at the waterline down to near black at the seabed | Below it |

A light is the only thing outside the palette: a warm white glow laid on as light, at the anglerfish's lamp, round the jellyfish, and on the hook, the worm's peg or the full tub while the idle ladder points at them, and in the stern lantern once a trip is over.

Two figures can be stamped in a second dye: a creature or the cat that the squid has inked is stamped dark with cream left round its eyes, and the octopus that turns cheese-yellow beside the cheese is stamped ochre all through. These are the same sprites dyed again when first needed, not new drawings.

**Materials, as they are painted (`art.ts`).**

- *Fill.* A flat cream or ochre shape with a soft edge a few units wide, as if the dye had crept under the wax.
- *Cut.* Detail is removed from the fill, never drawn on it in a third colour.
- *Crackle.* Fine dark veins run through every figure and across the hull, where the wax cracked. They are laid inside the figure only.
- *Weave.* A faint thread pattern over the whole cloth, figures included.
- *Filling pattern.* The open water carries a faint repeat of small arcs, as a batik ground does, so that no stretch of water is a flat blue. Rows of dots, ringlets and dot arcs fill the larger figures. The dots of a row are a little uneven in size and spacing, as wax dots are, and no row is of a length a child would read as a count.
- *The border.* A row of teeth along the bottom edge under the sand.
- *Wood.* The tub is made of staves with two hoops round it; the hull has a stripe and a rail. Wood is ochre with the staves and planks cut out of it.
- *Bubbles.* A cream ring with a small glint cut the other way, never a filled disc.

Everything is painted by code into sprites when the game opens and again when the pixel ratio changes. A frame stamps those sprites and draws a few live strokes over them. There is no image file.

**The frame.** Edge to edge: sky with a sun, scroll clouds, a low island on the horizon, two posts with a rope between them, the five baits hanging from pegs on the rope and the gull on the left post; the boat with the tub of staves and hoops, the cat and the rod, a stern post with a lantern, the landing net off its stern as a figure of its own; a band of scroll waves on the waterline; three layers of water with three creatures in each; rock walls at both sides, kelp, coral, the ribs of a wreck, sand. The pieces the child works with are the plainest things in it: one cream line, one hook and the five baits, each a plain shape of its own (a curled worm, a spoon, a stick with a glow, a wedge with holes, a boot).

**What goes in front of what.** The line is drawn in front of every creature it crosses and bends round nothing but the boat, which it goes round by the bow and never through. The hook and its bait are drawn over a creature they are brought to. A catch swung into the tub goes over the cat, which has flattened itself on the deck before the catch leaves the water and sits up when it has gone by. The catches stand in the tub above its rim at about half their size in the sea, two in front and two behind, each drawn over the edge of its neighbour and never over its middle, so that each can be told at arm's length. The jellyfish sits on its boot there, high enough for the boot to show over the rim, and the octopus's one arm reaches over the rim to the cat's head. The reel on the rod is a plain drum with one bar across it, drawn live, which opens aslant and turns an eighth of a turn with each click, so that it never lies level or upright in its ring. The cat has three whiskers a side, fanned, each from its own root. A catch tipped back or bounced off a full tub goes over the near rail, in front of the hull, and is next seen under the keel. Three drops fall from the hook when it comes out of the water.

**Lighting.** There is no light source to shade by; a batik has none. Depth is the lighting:

- The cloth is darker with depth, painted once.
- Each figure is stamped at the strength of the daylight that reaches where it is (`light` in `sea.ts`), so a figure sinks into the dye as it goes down and comes out of it as it rises. It never goes below half strength, so that the midnight creatures stay readable.
- The two who make their own light are stamped a little stronger than their depth allows, and their glow is added on top.

**Motion rules.**

- Every character has its own motion function (`motion.ts`) with its own tempo and its own funniest part, and none is shared: the shoal mills, the pufferfish hovers on a whirring tail, the turtle rows, the squid pulses, the jellyfish beats and sinks, the shark patrols and turns, the anglerfish hangs under its swaying lamp, the octopus curls its arms out of its pot, the blobfish breathes and scowls.
- Figures move as cut cloth would if it could: whole shapes turn, slide, swell and squash, and parts turn on a pivot. Nothing bends, and no outline is ever animated.
- Every eye follows the hook. A shut eye is a small arc bowed upward, and no face has a level bar anywhere in it.
- The hook is a weight on a line: it swings past the finger once and settles, and the line sags when it is drawn sideways.
- Nothing in the frame is ever quite still: kelp sways, sparks of the deep twinkle, bubbles rise, the wave band slides, the boat rocks, the cat's tail swishes and the gull looks about.
- All of it stops while the game is unattended or hidden, and goes on from the same instant.

**Tiers.** The tiers in `config.ts` change the pixel ratio and nothing else, from 2 down to 1. The sprites are painted again at the new ratio, so edges soften but nothing is dropped: the look has no effect that a tier could switch off. A frame is 52 to 67 sprite stamps and live strokes in the stills, at every tier. The frame-budget test in `frame.test.ts` goes through every cell of the grid with all nine creatures in the sea and with a full tub, a train of followers, a catch in the air, the tow and the tip-out; the most it finds is 71, and it fails at 80. There is one full-surface draw a frame, the cloth, and no composite pass.

**Sound.** Not part of the look, but held to the same rule of one of each: every cell of the grid has its own voice in `voices.ts`, synthesised, and a test holds that no two cells sound alike and that a sound ends when its answer does.

## The registry row, asked of the lead

For the claimed-styles table of `docs/art-direction.md`, with the menu row for Batik cloth set to claimed:

```
| Deep Sea Fishing | Batik cloth (canvas 2D): one length of wax-resist cloth dipped in indigo that darkens to near black at the seabed, so the dye is the depth of the sea; every figure is the cloth left undyed in cream and ochre with no outline, a soft crept edge, detail cut out of it and fine dye crackle through it; a batik ground of small arcs over the open water, rows of uneven wax dots, a toothed border under the sand; a boat with a tub and a cat on a band of scroll waves, nine sea creatures in three layers of water that sink into the dye as they go down, and a warm glow only where something makes its own light | [`games/deep-sea-fishing/ART.md`](../games/deep-sea-fishing/ART.md) |
```
