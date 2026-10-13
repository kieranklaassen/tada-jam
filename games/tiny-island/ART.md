<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

Tiny Island is open pretend play. A round island sits on a turntable in a flat sea, five wooden toys wait in a tray, and a small world wakes up wherever a toy is put. It has no learning goal.

## The band and its age rule

The manifest band is 2 to 5, and its youngest age governs everything.

- The cue table of `docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md` has no row below 3. Its row for 3 to 4 is the ceiling and is cut further: no text, numerals or icons to decode, no spoken instruction, no verdict, one live activity, tools that mean something from the start.
- (pack: game-design, ages-2-to-4.md) decides the hand. Everything essential works with a tap. A drag survives a lifted finger and counts when partly done. No pinch, tilt, shake, hold or double tap means anything. Essential targets (the five tray slots, the island, the wave) are at least 100 logical pixels across at 1180 by 820 and stand well apart, and none of them lies in the lowest 40 pixels of the surface. Quantities stay at five: five toys. The same thing is offered again and again.
- (pack: game-design, ages-4-to-6.md) covers the top of the band: the game supplies a place, props and residents who react, and the child supplies the plot.
- The symbol rule for a band that starts below 6: no word, letter, numeral or symbol on the kid side, optional or not. The game has no `symbols.ts`.
- One finger works at a time. A second finger or a palm does no work and never cancels the first.
- Nothing a child can touch lies under the jam's round home control (48 pixels, top centre, 10 pixels from the top), and the top right 72 by 72 is the grown-up's corner and holds only sky. A touch that lands there is not the child's play, wherever the finger slides afterward: nothing answers it, the island's sounds grow no louder for it, and the idle guidance is not put off.
- The surface sizes the layout is held to are 1180 by 820, 1024 by 768 and 820 by 1180. The camera frames the whole place from the surface's shape, and a test measures the targets at each of the three.

What `ctx.childAge` sets, as a default and never a gate, is only how a first visit is laid out:

| Age the shell reports | A first visit opens with |
| --- | --- |
| 3 and younger | The house already standing on the island and puffing, with the gull riding its smoke, and the other four toys in the tray |
| 4 and older | All five toys in the tray and the island bare but for the cat |
| No age (`null`) | As for 3 and younger |

Every child can reach both: the younger child can send the house home with the wave, and the older child can set it down. A saved island always wins over the age.

## The toy

The one action the finger performs most is **setting a toy down**.

- A finger lands on a toy in the tray. In that frame the toy hops out of its slot with a wooden "tok" and says who it is, with its one moving part and a short call of its own: the lamp blinks with a "ding", the sail swings with its bell, the sheep tosses its head with a "baa", the crown swells with a rustle, the roof of the house lifts with the clack of its door. From that same touch the island glows and a ring pulses on the land, to show where the toy can go. The toy hangs in the air above its slot, rocking, and the cat and the gull turn their eyes to it.
- A finger lands on the island. In that frame the toy leaves in an arc, and a third of a second later it comes down with a knock. The knock is low for the lighthouse and high for the sheep. The toy squashes and rings, the whole island dips on its turntable and rocks back, a ring of dust (on land) or water (in the sea) spreads, every toy already there hops, and the cat jumps. Then the toy starts being itself at once, with its own first sound.
- A drag does the same thing in one move. The toy rides above the fingertip so the hand never hides it, and never out of the top of the frame: toward the back it is held lower, and a thing it cannot be lifted over inside the frame it is carried round on the child's side, in front of it, a ring on the ground under the fingertip shows the whole way where it will come down (over a place where no toy can stand, the ring lies on the nearest place where it can; where the toy would hop back to the tray, the mark lies on its slot as a whole pale disc with no hole in it), it waits in the air while a finger is lifted for a moment, and it drops with the same knock where it is let go. Let go at least half-way to the turntable, it flies the rest; let go nearer the tray, it hops back into its slot with a soft clack. Let go over open sea, it comes down at the nearest place inside the rim.

In an empty scene, with nothing else built, this is already a pleasure: the hop, the arc, the knock, the island rocking under the weight, and a toy that wakes. Five toys wake in five ways, land and sea give ten, and a toy can be picked up and set down for ever. Random tapping always makes something happen: a tap on bare land with nothing in the hand thumps the island like a drum and makes everything on it and in the tray hop, a tap on the sea plops and rings, and a tap on a toy that is already in the hand makes it spin once in the air with a "whip". Nothing a child does is refused, and no touch is silent. What a toy or a resident does by itself is heard in full for the toy's first four seconds where it stands and for six seconds after any touch, softly until fourteen, and after that it is only seen: an island nobody is touching goes quiet by itself, and the next touch brings its sounds back. An island that has just been opened has not been touched yet, and nothing on it is loud until it is.

The second action is **turning the island**. A finger on the wooden rim grips it with a clunk, and a tap there turns the island one notch (an eighth of a turn) with a rumble and a tick. A finger that slides turns the island with it, the pegs on the rim tick past, the rumble follows the speed, and a flick lets it run on and slow down by itself. A slide that starts anywhere on the turntable where no toy stands turns it too.

## The object-by-action grid, and what is new on day 15

Five toys can be carried. Two residents cannot: the cat lives on the island and the gull on a bell buoy beside it. For the residents the first two columns are what happens when a toy comes down on them or beside them.

| | Set down on the land | Set down in the sea inside the rim | Tapped where it stands | The island is spun under it | The wave carries it home |
| --- | --- | --- | --- | --- | --- |
| **Lighthouse** | The deepest knock. The lamp lights with a "ding" and a pale beam starts to sweep slowly round, humming up as it comes toward the child and down as it goes | Wrong use, and it works: it stands in the shallows up to its first stripe like a paddler with rolled-up trousers. The beam sweeps low over the water and it moos through a foghorn, "mooop", once each turn, with a ring of ripples | The lamp blinks three times, "ting-ting-ting", and the beam whips once round fast with a "whoosh" | The beam keeps pointing the way it pointed while the tower turns, and smears into a ribbon of light with a rising whirr | Bobs upright like a bottle, "glug, glug", lamp blinking, and is stood in its slot with the deep knock |
| **Boat** | Wrong use, and it works: it flaps on the grass like a landed fish, hull slapping "slap-slap-slap", sail flopping from side to side | Sails round the island in the outer lane, sail full, with a creak and a hiss of wake, and rings its bell "ting" each time it passes the front | On land it springs up and belly-flops, "splat". In the sea it toots twice, "toot-toot", and darts ahead leaving foam | On land it slides round on its keel like a compass needle, "skreee". In the sea the water turns under it and it surfs backward, "whee" and a splash | Surfs the crest bow first with a "swoosh" and a "ting" and drops into its slot |
| **Sheep** | A soft thud and a "baa". With the tree on land it springs to it in one bound and eats (see the pairs). With no tree it nibbles the grass at its feet, "munch-munch", and leaves a mown patch that grows back | Wrong use, and it works: it paddles in a small ring with its nose up, "blub-baa", fleece floating round it like a swim ring, bubbles popping | "BAA!" It jumps straight up with stiff legs, its fleece puffs out to a ball, and it settles with a "poof" | Goes stiff-legged and slides as on ice with a wobbling "baa-aa-aa" | Rides on its back with its legs in the air, "baa-glub", and lands on its feet in the slot with the lightest knock |
| **Tree** | A "tok", then the crown shakes itself out with a rustle and sways in the breeze from then on, "shh, shh" | Wrong use, and it works: it floats on its side as a log and rolls slowly over, "glonk... glonk", leaves trailing on the water | Shakes so hard that every leaf flies off in a puff. It stands bare for a moment, and the leaves pop back on: "shake-shake-POP" | The crown lags behind the trunk and whips round after it with a "swish" | Spins on the crest like a top, "whirr", and plunks into its slot |
| **House** | A broad "bonk". The door pops open and shut, "clack", and the chimney starts puffing round smoke balls, each with a soft "whoomp" | Wrong use, and it works: it bobs as a houseboat, tilted, lying along the shore with its door to the sea, and the chimney blows bubbles, "blop, blop" | The roof lifts like a lid and claps down, "clap!", and one big smoke ball bursts out with a "PUFF" | Door and shutters bang open and shut, "clack-clack-clack", and the smoke curls into a spiral | Floats roof down like a hat, "gloop", and is turned over into its slot with a "bonk" |
| **Cat** (resident) | A toy comes down on it: it shoots straight up with a "mrrOW!", the toy lands where it sat, the cat lands beside it, glares at the toy, and then washes a paw as if nothing had happened | A toy splashes in beside it: it flinches from the spray, shakes each paw, "fft, fft", and hisses at the water, "kssh" | A purring chirp, "prrrp", and it rocks from haunch to haunch, flat with pleasure, eyes shut. Pulled, it stretches like toffee toward the finger and twangs back, "boing-mrrp" | Digs its claws in and is dragged sliding, "skrrrt", eyes rolling. When the island stops it staggers, "mrr-rr-ow" | Leaps onto the back of the rim, puffed to twice its size, "FFFT!", and watches the water pass with flat ears |
| **Gull** (resident) | A toy lands on the island: it cranes its neck, its feet paddle on the buoy, the bell clinks, and it asks "kwuk?" | A toy splashes into the sea: it dives beak first after it, sure that it is a fish, and comes up with nothing, "splish, kwaa", spitting water | "KYAH!" Beak wide, feathers on end, and when it is on its buoy the buoy rocks and clangs | Follows the island round with its head until its neck is wound up, and the head spins back, "wrrrip, kyuk" | The wave lifts its buoy and it surfs up and down flapping, "kya-ha-ha" |

The neighbour pairs. Each gives the same answer every time, wherever on the island it is made:

| Pair | What always happens |
| --- | --- |
| Lighthouse and cat | The beam throws a spot of light on the ground. The cat turns to follow it round and pounces each time it passes, "pat-pat-thump", and never catches it. With the lighthouse in the sea the spot crosses the land more rarely, and the cat waits crouched, wiggling its bottom |
| Sheep and tree | The sheep eats the crown tuft by tuft, "crunch, munch", until the crown is small. The tree shivers, "brrr", the leaves pop back, "pop", and the sheep hiccups a leaf, "hic". With the tree in the sea as a log, or no room beside it, the sheep stands where it is, stretches its neck toward it and asks "baa?" |
| House and gull | The gull flies over and sits in the smoke. Each puff lifts it, "whoomp, wheee", and it sinks back. With the house in the sea it paddles beside it and the bubbles tickle it, "kya-hi-hi" |
| Sheep and boat | The sheep set down on the boat stands on the deck behind the mast, which is on the bow, and the sail is taken in. A finger on the sheep there, from its feet up, is on the sheep and lifts it off the deck; a finger on the hull under it is on the boat, which carries the sheep. On land it stands across the boat; afloat it turns to look ahead with its nose up. In the sea the boat sails low and tilted, and the sheep bleats long like a ship's horn once a lap, "baaaaa". On land the boat flaps and bounces the sheep like a trampoline, "boing-baa, boing-baa" |
| Cat and boat on land | The cat takes the flapping boat for a fish and pats it, "pat", and the boat flaps a step away |

Any other toy set down on the boat: the boat ducks under with a "bloop" and pops up to one side, and the toy stands where it was aimed. A toy set down on another toy lands beside it with a "clack" and both rock.

The setting answers a touch as itself and changes nothing: the whale at the edge spouts, "pffsh", and the drops patter down; a cloud squeezes out a few drops, "pit-pat"; the sun bounces with a "bong"; bare sea plops and rings.

**Day 15.** Day 15 looks much like day 1, with the child surer and quicker and trying one new neighbour pair, such as the sheep in the boat, which always gives the same funny answer (the exception for ages 2 to 4 in pack: game-design, depth-from-combinations.md). Nothing is unlocked, counted or kept back: every toy and every pair works on the first visit.

## The representation

Tiny Island has no learning goal, so no school idea is represented and the order of object, picture and symbol does not apply.

## The four mechanic questions

Tiny Island has no learning goal, so the swap, attention, fun and guess questions of a school skill do not apply; what the finger does most is judged as a toy under "The toy".

## The error as a consequence

Nothing in this game is wrong, so nothing is corrected, and every use that looks wrong is a row of the grid.

- A toy put where it does not belong works there and is funny: the boat flaps on land, the tree floats as a log, the house blows bubbles, the sheep swims in its fleece as in a swim ring, and the lighthouse stands paddling and moos.
- A toy set down on a toy lands beside it. A toy set down on the cat lands, and the cat moves. A toy let go over open sea comes down inside the rim. A toy let go short of half-way goes back to its slot. None of these is a refusal: each has its own motion and sound and is what the world does with that act.
- The state stays. Whatever was set down stands where it landed until the child moves it. One touch lifts or sets down one toy; the sheep's bound to a tree on land and the wave are the only times another toy moves, and each goes the same way every time.
- No buzzer, no shake of a head, no reset, and nothing a resident feels is about the child. The cat is cross with the toy that landed on it and with the water.

## The designed order, and what is stored

There is no order of challenges and nothing is judged: open pretend play has one place, and a child is never moved from it.

- **The position.** `LADDER` in `config.ts` holds one id, `island`. It names the one place of the game and never a grade, a groep or a level. `FIRST_VISIT` has one row. No cycle is finished, so `finished` is false in every save.
- **What a first visit starts with, by age.** As in the table under "The band and its age rule": the house already standing for 3 and younger and for no age, all five toys in the tray for 4 and older.
- **What play changes.** Only what the child does: where each toy is, and how far the island is turned. Nothing gets harder, easier, faster or fuller by itself, and nothing depends on how long or how often the child plays.
- **The harder thing a child may choose** is visible in the world and always open: a second and third toy beside the first, a pair, the sheep in the boat.

There are no records: the game has no learning goal and claims no school skill.

Every field of the saved state, which is small plain JSON (a full island serializes under 400 characters, and a test holds it under half of the 64 KB cap):

| Field | What it holds |
| --- | --- |
| `v` | The version, 1 |
| `position` | `island`, the one place |
| `finished` | Always false |
| `turn` | How far the island is turned, in radians from 0 up to a whole turn, to three decimals |
| `toys` | Five records, one for each toy in a fixed order (lighthouse, boat, sheep, tree, house). Each has `kind`; `where`, one of `tray`, `land`, `sea` or, for the sheep only, `boat`; and `x` and `z`, the place on the turntable in its own units to two decimals, both 0 in the tray and in the boat. A sheep whose `where` is `boat` goes where the boat goes: lifted, the boat carries it, and it stands on its deck wherever the boat comes down. When the boat goes back to its slot the sheep hops to its own slot, and its `where` becomes `tray` in the same save. The sheep is `boat` only while the boat is `land` or `sea`; a save that says otherwise is read as the sheep in the tray |
| `cat` | The seat the cat has, a whole number from 0 to 7: the six seats of the ring, the middle, and the back of the rim. It is in every save the game writes, and the cat's hop is itself a change that is saved; during the wash it is the seat the cat takes when the wave has gone. A record without it (one written before the cat kept its seat), or with a seat the cat cannot have among the saved toys, is read as the seat worked out from the toys and the turn |

What is rebuilt from those fields. The gull's place and the sheep's place by the tree have no field of their own; the cat's seat has `cat`, because the cat keeps its seat and it cannot be worked out from the toys alone:

- The cat's seat: of seven seats on the land (six in a ring and the middle), a free one; when no seat is free, the back of the rim, a little left of its middle, where each peg that passes lifts it. A seat is free when no toy stands in it and the cat would not sit there between the child and a toy; of the free seats, those where no toy hides the cat's face come first. On a first visit, in a record that names no seat or one the cat cannot have, and when the cat comes back from the rim, it is the free seat farthest from every toy, worked out from the toys and the turn alone. An island opened again finds the cat in the seat it had, with no leap: parked and returned is the same as saved and loaded. After that the cat keeps its seat for as long as it is free. It is worked out again whenever a toy is carried over the island or lands and whenever the island comes to rest, and a cat that has to go hops to the free seat nearest the one it had, round whatever stands between and never over it, inside the frame. A toy carried toward it makes it shrink back first, ears flat, eyes on the toy. With toys all round it and no way out it stays, and the toy lands beside it.
- The gull's place: in the smoke above the chimney when the house is on land, a little way round from the house on its seaward side when it is in the sea, on the side further from the child first, otherwise on its buoy. It keeps to its buoy too when either side would cover a toy; when the boat is afloat and the spot is too far back for the gull to rise over the boat inside the frame; when no way to the spot fits inside the frame; and, with the house on the land, when its head in the smoke would be under the home control at the top of the frame. It flies between its places inside the frame, round a toy that is too tall to pass over there. In the smoke it rides clear above the roof, so from the camera it covers no part of the house: a touch on the gull is the gull's and a touch on the house is the house's. The cat on its seat or on the back of the rim, and the gull in either place, cover no toy, no tray slot and no part of the wave, and an overlap test holds that at each of the three surface sizes.
- The sheep's place by the tree: when the sheep or the tree is set down on land, the sheep's own `x` and `z` are set at once to the free spot beside the tree, and its bound there is a view of that. On load it is found eating.
- The boat's place on its lap: on load the lap starts from where the boat was set down.

What is short-lived and gone on load: the toy in the hand (it is saved in its slot, or where it stood before it was lifted), a wave that is rearing (nothing is saved for it), a toy in the air (it is saved where it will land), the island's spin after a flick, smoke, bubbles, ripples, the mown patch, the tree's eaten leaves (it is whole on load, and whole in its slot after a wash that a touch ended), and where the beam points. A game that is put away becomes, unseen and unheard, the game its save loads: a wash that was playing is over and every toy is in its slot, the toy in the hand is in its slot and a toy in the air stands where it was going, a rearing wave lies at its edge again and no wash follows, the island is still, the cat and the gull are in their places, the boat afloat is back where it was set down, and what is short-lived is gone. Nothing flies, lands or sounds after the return: parked and returned is the same as saved and loaded, in everything.

Each first-visit layout is written to the save only by the child's first change. Until then a visit that is put away leaves nothing, and the next visit opens as a first visit again.

## The characters and their fixed tastes

The five toys are the pieces the child works with. They are plain: no face beyond the sheep's two painted dots, no eyes that follow, and in the tray they stand still. Their life begins where they land, and it is a habit, not an opinion. The opinions belong to the residents.

- **The cat** lives on the island. Its one want, always visible: to catch whatever moves. Its eyes are on the thing that moves most (a toy in the hand, the spot of light, the flapping boat) and its tail twitches. It likes the spot of light, things that flap, and a clear patch of grass to sit on. It dislikes water, being landed on and being spun, and shows each differently: a hiss, a glare and a paw-wash, a stagger. While toys wait in the tray and nothing is touched, it looks from the tray to the bare ground beside it and pats that ground once (after 2.5 seconds, then every 8, three times at most). That is the scene's want: an island with room on it.
- **The gull** lives on the bell buoy at the left. Its one want, always visible: to get at whatever just puffed or splashed. Its beak points at the chimney, or at whatever last splashed. It likes smoke, bubbles and splashes, which it takes for fish. It dislikes nothing and understands little, and its neck gets wound up when the island spins.
- **The wave** lies at the right edge of the sea, a big sleepy curl with heavy eyelids that never quite close. Its one want, always visible: to roll over the island. Its half-open eyes rest on the island, and its crest curls a little toward it and uncurls again. It likes carrying toys and sets each one down carefully. It never asks, never hurries, and does nothing until it is touched.
- **The whale** at the left edge is a bystander with nothing to do with the toys. It blinks, breathes out a small spout now and then, and watches.

No resident's feelings are about the child, none remarks on the child stopping, staying or coming back, and none thanks or praises.

## The scenes

There is one short scene, the wash. There is no first showing: free play with no target idea needs none, and the idle ladder shows one move (the glow under the toys in the tray, then a ghost hand that taps a toy and taps the island; with the tray empty, a ghost hand that slides along the rim).

**The wash.**

- **What causes it.** A finger lands on the wave. It wakes and rears for about a second and a half with a rising yawn, "hwooo", and nothing is moved or saved yet: a second touch on the wave in that time stops the rising yawn and lets it sink back with a falling yawn, and the island is as it was. Left alone, the wash starts when it has reared.
- **What it saves when it starts, at once.** Every toy's `where` becomes `tray` and its `x` and `z` become 0, the sheep in the boat included. `turn` is not changed, and `position` and `finished` stay as they are. A game put away in the middle is found with every toy in its slot, and nothing plays on load.
- **Its beats,** counted from the end of the rear, a little over six seconds with all five toys out and less with fewer:
  1. 0 to 2.2 s: it rolls across the turntable from right to left with a long "shhhhh", slowly enough to watch. Each toy is lifted as the crest reaches it and rides it in its own way, as the last column of the grid has it. The cat leaps and the gull surfs.
  2. 2.2 to 3.0 s: the wave curls round the front until its crest lies along the tray.
  3. From 3.0 s: it stands one toy in its slot every 0.45 s, one after another, each with its own knock.
  4. Then 0.9 s: the wave slides back to its edge and sighs, and its eyelids sink half-way with its eyes on the island again.
- **What from the state of play fills it in.** Which toys are out, where each stands (the order in which the crest meets them) and whether it is on land, in the sea or in the boat. With no toy out the wave rolls over the bare island in two and a half seconds, and the cat still leaps.
- **How it gives way.** Any touch ends it at once: the toys are in their slots, the wave is back at its edge, and that touch is then answered as an ordinary touch. A sound that had not yet played stays quiet, and a sound of the wash that is still playing (the long roll, a ride, the gull's laugh) stops in that frame: only the touch's own answer is heard.

**How it ends and begins again.** Nothing ends. The island stays as the child left it for as long as the child likes, and nothing new starts by itself. The wave is the calm way to tidy up, and the child is the one who calls it. After it the toys wait in the tray, and they come out again in whatever order the child likes. On load no scene plays and the island is found as it was left.

## The records

Tiny Island has no learning goal, so it has no records part, names no record of either jurisdiction and claims no school skill.

## The look

Written after the style spike and not part of the sheet. The look in use is the first one reserved for the game in `docs/art-direction.md`: **pastel low-poly toy diorama**. The spike held on clarity (every toy and resident reads at 1180 by 820 from its outline and its two or three colours) and on what can be counted in a build session: 34 draws at rest and 40 at the busiest still, where the row asks for fewer than about 40. No frame rate is measured in a build session; the lead measures it on the target. The second reserved look was not tried.

**What it is.** A wooden toy set on a table, seen from above the table's edge: a round plate of sea, a turntable with a low wooden rim and eight pegs, an island in a shallow dish of paler water, a plank tray in front. Everything is cut from a few flat faces and painted in milk paint: chalky, pale, a little uneven, rubbed back to the wood on its sharp edges.

**The frame** (`camera.ts`). The camera looks down by 27 degrees through a field of 24, and stands as near as it can with the whole rim, the tray, the buoy with its gull, the wave as far as its eyes and the gull in the smoke of a house at the back of the land inside the frame. On a tablet lying down the turntable fills the width between the buoy and the wave, and the far islets, the clouds and the wave's back are cut by the frame's edge. At 1180 by 820 a toy in the middle of the land stands 117 to 200 px tall and no toy anywhere on the land stands less than 110; a slot of the tray is 210 px across and a toy stands in it at the size it has on the island. At 1024 by 768 the smallest toy is about 103 px. On a surface taller than it is wide the residents stand behind the turntable instead of beside it. `layout.test.ts` holds these sizes, the 48 px home control at the top centre and the grown-up corner clear of everything a child touches, and that no resident covers a toy, a slot or the wave on the glass.

**The lid** (`LID`, `lidAt` and `roofAt` in `toys.ts`). The top of the frame leans toward the child, so how high a thing may be depends on how far back it is. The lid is a plane just inside the top of the frame at every surface size, hung from the top of the gull in the smoke of a house at the back of the land, and lower in the middle by the depth of the shell's home control. The cat in its leap and the gull in the air, craning or puffed stay under it; where the gull's head in the smoke would be under the control it keeps to its buoy. `frame.test.ts` holds the lid inside the frame at the three sizes and plays seeded islands under it. A carried toy is held under the plain lid, too (`held` in `route.ts`): lower toward the back, and round a thing it cannot clear there, on the child's side of it, with its ring still under the fingertip.

**Ground.** Every toy has a round piece of ground (`FOOT` in `toys.ts`, wider afloat where it lies along the shore), and no pose takes any part of it outside that ground or more than a squash into the land: `view/ground.test.ts` lays every pose on the toy as it is cut. So the toys are cut to turn on their own ground: the boat is short and tubby with its mast on the bow, the sheep's legs stand close under it, the house's roof overhangs by a finger. A toy that flies goes up, over and down (`route.ts`). The cat and the gull go round instead: a leap swings to one side of whatever stands between two seats, and a flight swings round a toy too tall to pass over inside the frame (`around` and `swung` in `route.ts`). The intersection audit holds all of it on moments that reach every state.

**Shapes.**
- Flat faces only, each with its own normal: boxes, posts of four to ten sides, lumps of twenty faces (eighty for the large round things: the cat, the fleece, the wave, the whale, the tree's crown).
- Each thing is one merged geometry with a colour on every corner, plus one moving part of its own about its own pivot: the lamp, the sail, the sheep's head, the crown, the roof. The residents have more parts, because they have the faces.
- The toys are plain: no face but the sheep's two dots. The residents carry the eyes: white lumps with dark plum pupils that slide toward what moves and lids that close.
- Sizes are the toy's own, never the world's: the cat is as big as the house and the gull is too big for its buoy.
- The sea and the ground are discs of uneven triangles in two near values of one colour, so no stretch of ground is one flat fill.

**Palette, as shown on the glass.**

| What | Colours |
| --- | --- |
| Sky and sun | peach `#ffd3c4` at the top to cream `#fff2d8` at the water; sun `#fff7cf`; clouds `#fffaf1` over `#fbdccf` |
| Sea | `#8cc6cf` and `#7dbac8`; the shallows inside the rim `#b9e6dd` and `#c8eee2` |
| Island | sand `#f7e4bd`; grass `#cfe8b2` and `#bfdfa4`; far islets `#b9cdb8` and `#c9dcc0` |
| Wood | `#e3c093` and `#d4ad7d`; bark `#b98b63`; the tray's slots deep blue `#5f8fb4`, so a cream toy stands out on them |
| Toys | cream `#fbf0dc`, coral `#f08f7d`, teal `#6fb6b0`, blue `#5f8fb0`, slate `#7f90b4`, butter `#ffe2a8`, rose `#e58a8a`, brick `#d98b7a`, leaf `#62b08c` and `#86c79a`, fleece `#fdf6ea`, plum `#5a4a5c`, lamp `#ffe79a` |
| Residents | cat apricot `#f6b27c` with `#fff0de`; gull `#fdfaf2` with wings `#b4c0d4` and beak `#f6a54c`; wave `#62b2c6` and `#4f9db6` with foam `#f6fbf6`; whale `#8aa4d6` |
| Eyes | whites `#fffdf8`, pupils `#3c3350`. Nothing in the frame is black |

Coral and teal are the accents and belong to things a hand can use (pegs, cuffs, roofs, the boat). The sea and sky never take them.

**Paint and light.** One shader paints everything solid (`view/paint.ts`); there are no lights, no shadow maps, no textures and no post pass.
- The colour of a face is its corner colour, a few hundredths lighter or darker from face to face.
- A warm key from the front left, and half of it wraps round: the far side of a thing is lilac, never dark.
- The sun stands behind the island on the left, so an edge turned away from the eye catches a warm line. It is a pale disc with ten short pointed rays under it, and no ring round it: a ring round a disc could be read as a numeral.
- Where two faces fold more sharply than about fifty degrees, or a shape ends, the edge is rubbed pale and uneven. Round lumps have no such edge and stay whole.
- A fine chalk grain, fixed in the world.
- A face of water brightens a little in its own time, and now and then one flashes.
- Colours are authored as they are shown: the renderer writes them out unchanged.
- What is not painted wood is a flat film: lilac blob shadows under what stands on the land, pale rings on the water and the ground, the lamp's faint yellow beam, and the white ring that shows where a toy in the air will come down.

**Motion rules.**
- The toys are wood. A landing is a knock: a quick squash that rings and dies, deeper and slower the heavier the toy; the island dips and rocks back on its turntable. A toy never bends, sways as cloth, or eases softly into place.
- Each toy has one habit on the land, one in the sea and one answer to a tap, and no two share a curve (`motion.test.ts`). The lighthouse is the stiff one: only its lamp lives.
- The residents are soft where the toys are hard: they squash, puff up, blink and look. Eyes ease toward what moves and never jump.
- On load nothing eases in: every toy stands mid-habit where it was left.
- Smoke, drops and leaves are small lumps that pop in and shrink away; nothing fades through transparency but the films.

**The tiers** (`config.ts`). Every tier keeps the palette, the facets, the worn edges and every motion, so a slower tablet plays and sees the same toy.

| Tier | Pixel ratio | Water glints | Puffs in the air |
| --- | --- | --- | --- |
| 0 | 2 | yes | 48 |
| 1 | 1.5 | yes | 36 |
| 2 | 1.25 | no: the facets stay, and stand still | 24 |
| 3 | 1 | no | 16 |

**The frame's cost.** 34 draws and about 7,200 triangles at rest; the busiest still drew 40 and about 7,600. The instanced puffs, rings and discs are drawn once before the first touch, so the first knock compiles nothing. `view/frameBudget.test.ts` builds the scene with no renderer and holds the busiest frame the toy can make to 40 visible meshes, each of which is one draw.

**For the registry** (`docs/art-direction.md`, section 3), as a request to the lead. The row:

| Tiny Island | Pastel low-poly toy diorama: chunky flat-faced wooden toys in chalky milk-paint pastels with edges rubbed pale, on a turntable with a pegged wooden rim in a round dish of faceted sea, seen from above a table's edge under a peach sky with a warm rim light from behind; coral and teal only on what a hand can use, eyes only on the residents | [`games/tiny-island/ART.md`](../games/tiny-island/ART.md) |
