<!-- template: cartridge/ART.md v3 -->
# Design sheet

Bark Boats: the child feels the brook take a boat of their own making and sees it sail the way it was built. The game has no learning goal. What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

- **Band.** The manifest band is 4 to 8, and its youngest age, 4, governs the design.
- **Cue-table row.** The row for 3 to 4 in the age-band cue table of `docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md`. Its "Avoid" column is a hard constraint here: no text, numeral or icon that must be decoded, no spoken instruction, no verdict, never several activities live at once, and no tool present before it means anything. So the bank is the only live place while a boat is being built, the brook is the only live place while it sails, and the lamp is not in the gnome's hand until there is a pond to light it at (he carries it shut on his back).
- **Pack rule for the age range.** (pack: game-design, ages-4-to-6.md): pretend play with characters who react, tap and drag only, no double tap, no reading, mischief that works and a victim who overreacts and is never hurt. The older half of the band gets its depth from the same parts used on purpose (pack: game-design, depth-from-combinations.md).
- **Symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, optional or not, and the game has no `symbols.ts`.
- **What `ctx.childAge` sets.** Only what a first visit finds on the flat stone. It is a default and never a gate: every making lies on the bank at every age, and every boat can be built at every age.
  - 5 and younger: the bark hull already stands on the stone with the short twig pressed in, so the first frame shows where a mast goes.
  - 6 and older: the stone is bare and every making lies on the bank.
  - No age (`null`): as for 5 and younger.
- A saved game wins over the age: once a slot exists, the bank is found as it was left.

## The toy

**The carry.** The one action the finger performs most is picking a thing up, carrying it and letting it go where it belongs: a making onto the boat, and the boat onto the water. Its small sibling is a finger laid in the water, which is the same touch with nothing in it.

- **When the finger lands** on a making, in the same frame, the making jumps to the finger with a stretch and its own lift sound (a twig clicks, a leaf rustles, a berry pips, a pebble grinds), and whoever is nearest turns its eyes to it.
- **Carried,** the thing hangs a little behind the finger and swings like something held by one end. It stays under the finger while the view moves on. Over the boat, the place it would go opens for it: the mast hole darkens, the mast leans to take the leaf, the deck dips.
- **Let go over the boat,** it is pressed in with its own sound, the hull rocks on the stone and settles, and the gnome, once he is aboard, answers the exact thing with his fixed opinion of it (the first thing pressed on is answered by his climbing aboard). Let go anywhere else on the near bank it lies where it was put (where that spot is taken, by another making or by the flat stone, which is kept for the boat, it hops in a seen arc to the nearest free place), and in the water it floats and washes back to the shore. Let go over the far bank or the sky, where nothing can lie, it flies back in a seen arc to where it was picked up from: its spot on the bank, or its place on the boat.
- **The boat itself is carried the same way.** Lifted by the hull it comes up heavy, the mast lagging; let go over the water it drops with a splash, sits as low as it was loaded, and rocks. A finger laid in the water makes a ring that pushes whatever floats away from it, so a boat is steered by where the finger goes in. Lifted out again it drips, and let go over the bank it goes back on the stone, whether it floated in the eddy or the brook had begun to take it. A tap on a boat the brook has begun to take, or a lift of it that the shell takes away, changes nothing. Further down the brook, where no stone is in the frame, a boat lifted and let go anywhere is set down on the water at that spot.
- **Why it is a pleasure with no goal.** Nothing has to be built. A thing lifted and dropped answers every time with weight and a sound of its own, the boat keeps and shows whatever was pressed on it, and every part can be pulled off again with a pop, wherever the boat waits at the bank (on its stone or afloat in the eddy; on the brook it sails as it left), and tried elsewhere. Random touching always gives something: a ring in the water, a frog who flinches, a hull that rocks.
- **Everything else in the frame answers a tap as itself** and changes nothing: the frog puffs and croaks, the kingfisher ruffles and rattles, the sprite blows (which fills a sail that stands in her way, and so sends a sailed boat afloat down the eddy, as a ring from a finger does), the gnome lifts his hat, bare ground gives a knock and a puff of petals, the far bank a rustle and a smaller puff of petals where it was touched, and the sky a whiff and a short gust of pale lines there. A touch on the paper beside the print, or on its margin, is answered by nothing and ends no scene.

## The object-by-action grid, and what is new on day 15

The game has two grids. The first is the bank: a making by where the finger lets it go. The second is the brook: the boat as built by the place it meets. In both, every cell has its own picture and its own sound, and the wrong use works.

### The bank: a making by where it is let go

The right use is the first column. The other four are wrong uses, and each gives the thing back: it ends on the bank or in the shallows, never lost.

| | On the hull | On the gnome | To the frog | To the kingfisher | Into the water |
| --- | --- | --- | --- | --- | --- |
| **Twig** | Pressed into a mast hole with a twist; the hull rocks. A creak, then a snap. | He takes it as a fishing rod and casts at nothing. Two swishes. | The frog bites the end and pulls; the twig bends and springs back to the bank. A twang. | He balances it across his beak, wobbles and drops it. A clack and a rattle. | Floats like a log, turns once and knocks ashore. A plop, then a hollow knock. |
| **Leaf** | Threaded down the mast, the twig poking through. A papery rustle and a zip. With no mast it lies on the deck as a blanket and the gnome pulls it over his head. A flump. | He wears it as a cape and strikes a pose. A flap and a squeak. | The frog wears it as a hat, goes cross-eyed looking up at it and blows it off. A puff. | He opens it over his head as an umbrella and peers at the sky. A ruffle. | Lies flat as a raft and the dragonfly rides it to the shore. A pat and a buzz. |
| **Feather** | Stands as a sail, shivers once as it is let go and is then still. A high shimmer. | It tickles his nose and he sneezes his hat off. A rising squeak and a burst. | Tickled under the chin, the frog swells to half as large again and laughs. A run of quick croaks. | He knows it for his own, sticks it back in his tail, and it falls out again. A snatch and a whistle. | Spins on the surface like a needle and never gets wet. A light skitter. |
| **Berry** | Rolls along the deck to the bow and sits. A pip and a roll. | He licks it, smacks his lips, and his beard is red until he wipes it on his sleeve; then he sets the berry back on the sand. A smack. | The tongue snaps it, the cheek bulges, and the frog spits it back onto the sand. A thwip and a spit. | He swoops, holds it up in his beak like a jewel and gives it back only when the gnome stamps. A swoop, a stamp, a plip. | Bobs red in its own rings and washes back to the shore. A plip and a bob. |
| **Acorn cap** | Sits upright as a cup, ready for a lamp. A hollow tok. | He puts it on over his hat, where it is far too small. A tok and a giggle. | The frog wears it as a helmet and knocks it on a reed to test it. A tok and a bonk. | He fills it at the brook and tips it over the gnome. A glug and a splash. | Floats as a tiny round boat and twirls; a beetle climbs in. A tick and a whirr. |
| **Pebble** | The hull dips to its rim and the stone under it growls. A heavy clunk and a creak. | He cannot lift it, so he sits on it. A grunt and a huff. | The tongue catches it and the frog is pulled off his stone; he climbs back. A thwip, a thud and a splash. | It is too heavy for him: he tips forward off the branch beak first, flaps back up without it and looks the other way. A clonk and a peep. | Sinks with a gloop and bubbles; the frog dives and brings it back, disgusted. A gloop, bubbles, a wet slap. |

A hull is the thing every other making is put on, so it has no row. A hull let go on the stone where one already stands takes its place with everything that stood on the first, and the first hops to the moss; a hull let go anywhere else on the near bank lies where it was put (let go on the stone while the boat floats in the eddy, it hops in a seen arc to the moss in front of the stone), one let go in the water floats and washes ashore, and one let go over the far bank or the sky flies back to where it was picked up from. Its three kinds change every cell of the second grid.

### The brook: the boat as built by the place it meets

Four parts with three choices each: a hull (bark curl, half walnut shell, pea pod), up to two masts (short twig, tall stalk, bendy grass stem), a sail for each mast (small birch leaf, broad maple leaf, feather) and a load (berry, acorn cap, pebble). The rows are the traits a place answers. A boat has several at once, and each place answers every trait it has, one after the other.

| | Reeds | The sprite who blows | Stepping stones | The kingfisher's low branch | The small fall | The still pond |
| --- | --- | --- | --- | --- | --- | --- |
| **A broad sail** | The leaf catches in the reed tops; the stems bend and whip it free. A swish and a thwap. | One puff fills it and the boat shoots off, the gnome's hat streaming behind. A whoomp and a rising whistle. | It runs at a stone, bounces, and the sail swings to the other side. A tock and a flap. | Too fast to duck: the leaf wraps the branch and the boat swings under it like a pendulum, the bird hanging on upside down. A twang and a rattle. | It sails off the lip and hangs on the leaf like a parachute before landing soft. A flutter and a pat. | It crosses on the last breath and the leaf sighs flat. A long hush. |
| **No sail** | It drifts in sideways and stops; the frog swims up behind and pushes it through with his nose. A glug and a grunt. | She blows and nothing catches; she blows till her cheeks go dark, then pokes it on with one finger. A thin whistle and a pop. | So slow it turns through the gap like a fallen leaf. A trickle. | It passes with room to spare and the bird leans down to look for the mast. A cluck. | It tips over nose first with the gnome holding his hat. A falling slide and a splosh. | It stops short of the lilies and waits for a ring from a finger. One drip. |
| **Two masts** | The masts comb the reeds and the stems sound one after another. A run of plinks. | The front sail takes the puff and the back sail gives it back: the boat turns in circles and the gnome sways, dizzy. A whirr that goes round. | It sidles through crabwise with the sails slapping each other. Two claps. | The first mast ducks and the second catches; the bird steps onto the mast top and rides along. A tick and a chirp. | It goes over stern first, so the gnome watches where he has been. A rising gurgle. | It turns one slow half circle and moors facing the way it came. Two soft knocks. |
| **A pebble aboard** | The heavy boat parts the stems and they close behind it with a slap. A low rustle and a slap. | She blows and it only nods; she sits on the bow to look at the stone. A puff and a thud. | It rides low and scrapes to a stop on the sill, and waits; a ring from behind lifts it over. A grating scrape, then a scoot. | He dives for a berry, comes up with the pebble, drops it back on the deck and shakes his beak. A plunge and a clonk. | It drops like a stone and makes the tallest splash in the brook; the frog is soaked. A boom and a splash. | Its own weight carries it into the lilies, and the pads pile up at the bow. A low groan and a squelch. |
| **A walnut hull** | It bobs from stem to stem like a ball. Hollow knocks, each higher. | It spins like a top under her breath. A hum that rises. | It bumps a stone, rolls round it and never sticks. A hollow tock and a roll. | He taps the shell to see who is home, and the gnome knocks back. Two taps, two knocks. | It goes under and pops up like a cork, the gnome spouting. A bloop and a pop. | It rocks for a long time before it is still. Slow clucks. |
| **A berry aboard** | A stem brushes it off; it floats alongside and the gnome fishes it back with his hat. A plip and a scoop. | She smells it, blows it off the deck by mistake, catches it and puts it back, pink in the cheeks. A sniff, a puff, a plip. | The berry rolls from bow to stern as the boat tilts on a stone, the gnome after it. A rolling patter. | He steals it: a dive, a snatch, and a blissful shiver on the branch, until the gnome shakes his fist and he drops it back on the deck. A falling whistle and a plop. | It flies up at the lip and lands back on the gnome's hat. One high pip. | The gnome sets it on a lily pad beside the lamp, where it sits red in the lamplight. A click and a small chime. |

The pea pod, the tall stalk, the bendy stem, the feather sail and the acorn cap each change a row above in a way that follows from the thing and stays the same every time: a pod is narrow and slips between reeds and stones that stop a bark hull; a tall stalk meets the low branch that a short twig clears; a bendy stem spills the wind, so a broad sail on it runs like a small one; a feather takes half a puff and tickles whoever it touches; an acorn cap fills at the fall and is where the lamp stands at the pond.

**Day 15.** On day 15 the child builds for a place: the tall stalk is left on the bank because the child knows what the low branch does to it, the pebble is left ashore so the boat clears the stone sill, or is taken along on purpose to soak the frog at the fall, and a boat is built wrong on purpose to see the kingfisher swing.

## The representation

The game has no learning goal, so no school idea is represented.

## The four mechanic questions

The game has no learning goal, so the four questions about a school skill have no answer here.

## The error as a consequence

No boat is wrong, and no build is refused. A thing let go over a boat with no room for it (a mast when both holes are full, a thing when the deck holds four) tips off the far side, knocks on the stone (on the hull's rim, when the boat is afloat in the eddy) with its own landing sound, seen and heard on the same frame, and comes to rest on the nearest free moss beside it, held in `loose`. A boat that does not suit a place is answered by that place, and the answer says where and why:

- A broad sail on a tall mast meets the low branch at the leaf, and the boat hangs there by it.
- A heavy boat stops on the stone sill it is too deep for, with the scraped stone showing under its keel.
- Two sails turn the boat round the spot where the sprite's breath hits them.
- A boat with no sail stops wherever the water is still.

Nothing breaks and nothing is taken away: the berry the kingfisher steals is back on the deck as soon as the gnome shakes his fist. A boat that sticks stays where it stuck, as long as the child likes, and a ring from a finger behind it sets it going, as does lifting it and setting it down on the water. A tap on it, or a lift the shell takes away, leaves it held. The state stays: the same boat reaches the pond as built, and the next morning the child changes one part and sails again. Nothing gives a verdict, and no character's feeling is about the child.

## The designed order, and what is stored

The game has no learning goal, so it has no order of challenges. The designed order has one place, with the stable id `brook`, and the position never moves.

**What a first visit starts with, by age.** 5 and younger, or no age: the bark hull stands on the stone with the short twig pressed in. 6 and older: a bare stone. At every age all twelve makings lie on the bank (three hulls, three masts, three sails, three loads; the ones already on the boat are on the boat).

**What play changes.** Only what the child made. The boat is as built. A boat sent to the pond stays moored there, with its lamp, beside the boats sent before; the pond holds the last five, and a sixth takes the place of the oldest, which has gone on down the brook (it is not shown leaving, and nothing counts them). Every morning after the first starts from a bare stone at every age, with twelve makings on the bank again. Nothing is opened, added or made harder by the amount of play, and the six places stand in the same order on every journey: reeds, the sprite, stepping stones, the kingfisher's branch, the fall, the pond.

**A harder thing is the child's to choose,** and looks it in the world: the tall stalk is taller than the low branch is high, the pebble is the biggest load on the bank.

**Every field of the saved state.** Plain JSON, version 1, read field by field, far under the 64 KB cap (a largest state is under 2 KB).

| Field | What it holds |
| --- | --- |
| `v` | The version, 1. |
| `position` | `brook`, the one place of the designed order. |
| `finished` | The cycle on screen is over: the boat is moored at the pond and the lamp is lit. |
| `place` | Which scene the child is in: `bank`, `brook` or `pond`. |
| `boat.hull` | The hull on the stone or afloat (`bark`, `walnut`, `pod`), or none when the stone is bare. |
| `boat.masts` | What stands in the bow hole and the stern hole: a mast kind or nothing, for each. |
| `boat.sails` | What is threaded on each of those masts: a sail kind or nothing, for each. |
| `boat.deck` | What lies on the deck, in the order it was put there, at most four things: loads, and a leaf or feather lying as a blanket. |
| `boat.at` | Where the boat is on the bank scene: on the `stone` or afloat in the `eddy`. |
| `boat.x` | How far along the eddy it floats, in whole stage units. |
| `boat.aboard` | The gnome has climbed aboard. |
| `loose` | Every making that is not on the boat: its kind, and where on the bank it lies, in whole stage units. A making in the hand is saved where it was picked up from; one that is floating or flying is saved where it will come to rest. |
| `journey.reach` | On the brook: which of the six places the boat has come to. |
| `journey.stuck` | The boat is held at that place and waits for a ring. |
| `journey.done` | That place has given the boat its answer, or was giving it when the game was put away. |
| `pond` | The boats moored at the pond, oldest first, at most five, each as built (hull, masts, sails, deck) with its lamp. |

A boat on the brook is saved at the place it has reached, as it stands when it arrives there, with whether that place has answered it. An answer under way when the game is put away is settled as given: the boat is found just past the place, or held at it where the answer is one that holds the boat (it then waits for a ring, and nothing has moved that the child did not move), waiting for the child's touch, and the place does not answer a second time. The drifting between places is a view of that and is not saved. Rings in the water, drips, petals and whoever is in the middle of a reaction are short-lived and gone on load. The gnome's opinion is not stored: it follows from the boat.

No next customer waits on screen while the child works, so no position lays one out.

**What the game sets down.** A making the game brings to rest (washed ashore, spat out, dropped by the bird, brought back by the frog) comes to rest on free sand or moss, never on another making, the flat stone or the boat. A boat moored at the pond never covers the sun or the open water in front of the lilies. Where the resting place is taken, the game moves the thing it is setting down to the nearest free place, and an overlap test holds this at each surface size the game is tested at. Nothing the child must touch (the makings, the stone, the boat, the water, the sun) lies under the jam's round home control at the top centre: the sun rests to one side of it.

## The characters and their fixed tastes

Each is large in the frame, turns its eyes to the finger, and answers what the child made and never the child.

- **The gnome.** Nearly as tall as the tall stalk standing on the boat, and taller than the short twig standing on it, so that his face reads from across the table, red pointed hat, a shut lamp on his back. **Want:** to be taken down the brook. He stands at the stern end of the stone, turned to the child, rocking on his heels and tapping one foot, and once aboard he sits facing downstream and, now and then, when his arms are not busy with an opinion, points that way. **Likes:** a broad sail (arms up, hat streaming), the berry (he licks it, red beard), going fast. **Dislikes:** a pebble aboard (arms folded, sitting as far from it as the deck allows), a feather (it makes him sneeze), going backwards. A leaf with no mast he takes for a blanket, every time.
- **The frog.** Fat, on his stone in the shallows at the bank; on the brook he is met again in the water among the reeds and on a rock below the fall. **Want:** whatever is red and small. His eyes follow the berry wherever it is, and his tongue takes it when it is let go within his reach. **Likes:** berries, pushing a boat that has no sail. **Dislikes:** rings in the water under him (he flinches and puffs), the pebble (it pulls him off his stone, every time), getting splashed.
- **The kingfisher.** On the low branch, long beak, proud of his tail. **Want:** the same berries; he looks at whatever is on the deck with one eye, head on one side. **Likes:** berries, shiny things, his own feather. **Dislikes:** tall masts in his branch, the pebble he takes for a berry (he shakes his beak, every time).
- **The water sprite.** Up to her waist in the brook among the reeds, hair that runs like the water lines, round cheeks. **Want:** something to blow at; she watches for a sail with her cheeks half full. **Likes:** a broad sail, a walnut that spins. **Dislikes:** a boat with nothing to catch her breath, a load she cannot move.

The dragonfly has no opinion. It is the thing alive at the edge that has nothing to do with the task.

## The scenes

Three short scenes. Each is a list of timed beats filled in from the boat as built, and each gives way to any touch: the touch ends the scene in its end state, and is then an ordinary touch.

- **Aboard.** *Cause:* the first making pressed onto a hull on the stone, or the boat lifted, while the gnome is not aboard. *Beats* (about 2 seconds): he looks the boat over from keel to top, puts his hat straight, climbs over the side and sits. *Filled in from:* what stands on the boat, since he looks at each part in turn. *Saves when it starts:* `boat.aboard`.
- **The lamp,** the ending. *Cause:* the boat drifts or is nudged in among the lilies of the pond. *Beats* (about 8 seconds, and the finished scene then stays): the boat touches the pads beside the boats sent before; the gnome steps off onto a pad; he sets his lamp where the build gives it a place (in the acorn cap, else on the mast, else on the bow) and lights it; the lamps of the earlier boats answer, lit one after another inside one short span and with one soft chord for the whole row, whatever its length; the sky wipes down to dusk. *Filled in from:* the boat as built and the boats in `pond`. *Saved before it starts,* at the moment the ending is certain, which is when the boat comes to the pond and is not held there, or when a ring or a lift frees a boat that is held there: `finished` true, `place` `pond`, `journey.reach` and `journey.stuck`, and `pond` with this boat added (and the oldest gone when there were five). A game put away between that moment and the lamp scene is found at the pond with the lamp lit and plays no ending on load.
- **Morning,** the restart. *Cause:* the child lifts the sun, which rests behind the hill at the pond and is the one thing there that glows. *Beats* (about 4 seconds): the sky wipes up from dusk to morning, and each lamp goes out as the edge of the wash passes it; the view runs back up the brook to the bank, and the gnome on his pad, the berry, the piled pads and the moored boats leave with the pond in that move, none of them before it; and the gnome is on the stone with his lamp shut on his back. *Filled in from:* nothing but the pond as it stands. *Saves when it starts:* `finished` false, `place` `bank`, `boat` as a bare stone with the gnome not aboard, `journey.reach` and `journey.stuck` cleared, and `loose` as the twelve makings laid out.

**How a cycle ends and the next starts.** The cycle ends at the pond, in a finished scene that stays as long as the child likes: lamps on still water, nothing moving but the lilies. Nothing new starts by itself. The next cycle starts when the child lifts the sun. On load no scene replays: a game put away during the lamp scene is found at the pond with the lamp lit, and one put away during the morning is found on the bank.

## The records

The game has no learning goal: it is designed from no record of either jurisdiction and claims no school skill.

## The look

The art guide. It is not part of the sheet. The look is the first one reserved for the game, **woodblock river print**: the frame is one colour print pulled from carved blocks, on paper, with the brook as the wide blue band a river print is built around.

### What makes it this look

- **Paper.** The print sits inside a paper margin of 14 units on every side, in the paper colour `#eadfc6`, which is also the surface's backdrop. Nothing is drawn on the margin, and a touch on it, or on the paper beside the print where the surface is not the stage's shape, is answered by nothing (`seen.test.ts`).
- **The key line.** Every shape is closed by one thin line in dark indigo `#22345c`, 1.3 to 2.6 units wide, never black. A limb is the same line twice: a wide dark stroke with a narrower coloured one on it.
- **Flat colour, wiped.** A shape is one flat colour, or one colour wiped to a second from top to bottom, as ink is wiped on a block (the sky from indigo down to pale, the water from deep to pale and back, a cheek, a belly). No other shading, no highlights but a single pale stroke, no cast shadows.
- **Grain.** Each sheet is printed once with the grain of the block laid over its colour, strongest on the large flat areas. The grain is one small tile, drawn once; on the bank it is stretched to repeat twice in a frame, so the lines of the wood run on where two frames join.
- **Water lines.** The brook is two sheets of pale combed lines that slide past each other, downstream to the left, at different speeds. Within a row no two curls are alike and none follows the last at a fixed step: each has its own length, its own gap and its own curve (`reader.test.ts`). Rings from a finger, the wake of the boat and the sprite's breath are the same pale line, drawn live.
- **Few colours.** Indigo, a water blue and its pale, moss and pine green, one red (the sun, the gnome's hat, the berry, the flowers), ochre, sand, bark brown, stone grey, paper white. The named colours are `INK` in `print.ts`. What is written where it is used is a tint of one of them and nothing else: the second tone of a wipe (a paler sand, a deeper stone, the foot of the moss), the pale line of the water in its several strengths, the shade of a pool or a pat of moss, and the dusk wash in `view.ts`. A hue outside these families is a fault.

### What is in the frame

The world is seven frames side by side, each as wide as the stage, and downstream is to the left. The view rests on one frame and moves on when the boat leaves it.

- **The bank.** The far bank fills the top third: a pine on the left edge with the kingfisher on its low branch, a snow mountain, a red sun half behind a hill, rolling hills with pines in uneven clumps, and rushes on the right edge. The brook is the middle third, with the frog on his own stone at the left and the water sprite among the rushes at the right. The near bank is the bottom third: moss thick with tufts, flowers, mushrooms, ferns and small stones, the wide flat stone the boat is built on, and a patch of pale sand that runs from under the foot of the stone to the right edge, where the makings lie spread out, each with a finger's room of its own.
- **The six places of the brook.** Reeds that stand in the water across the middle of the frame, with the frog swimming among them; the sprite among her rushes at the upstream end; stepping stones across the brook with a sill between them; the pine's low branch reaching over the water with the kingfisher on it; the small fall, a dark lip across the brook between two rocks, with white water falling from it in strands of unequal length and weight, foam in unequal billows at its ragged foot, a deeper pool below that runs out before the next frame begins, and the frog on a rock in that pool; and the still pond, with lily pads, flowers on some of them, and the boats sent before moored along the far side: up to four, each drawn at its own size, at its own height and at its own gap to the next, and none behind the newest boat or the gnome on his pad: the newest of them by the lilies at the left, the other three along the far shore to the right, at three depths 20 units and more apart (`pond.test.ts`, `placement.test.ts`).
- **Behind every place** runs one far strip, twice the stage wide, that slides at a fraction of the view's pace, so the mountain and the sun are never in the same spot twice. The near moss is one tile that repeats under the brook's frames; nothing grows across its two ends, so no pat of moss is cut where two frames join.
- **Dusk.** At the finished pond one wash, indigo to violet to indigo, is wiped down over the whole print from the top, as ink is wiped on a block. The lit lamps are stamped over it, so they and the sun's ring are the only warm things. Each lamp hangs on its own boat and is as large as that boat is drawn; the lamps of the earlier boats light one after another inside 0.9 s, with one soft chord for the row, whatever its length, so the row is neither seen nor heard as a line of equal marks. In the morning the wash is wiped back up, each lamp goes out as its edge passes, and the pond with everything on it stays in its own frame and leaves as the view runs back to the bank (`morning.test.ts`).

Bare ground counts as empty, so the moss is filled and only the sand is left plain, because it is the table: a making has to read against it at a glance. A dragonfly flies a low loop over the near water in every frame.

### Sizes

The hull is 300 units long, a quarter of the frame's width, and with the tall stalk and a leaf it stands about 300 tall. The frog is about 230 wide, the sprite 220 tall above the water, the kingfisher 220 from tail to beak. The gnome is 270 tall with his hat, half as large again as in the toy, so that his face reads from across a table; his hat is half of him, and it is red so he is found at once. The smallest thing a finger picks up, the berry, is drawn 34 across and answers within 40 units of its middle. Where two things are both in reach the nearer one takes the touch, and a fresh bank is laid out so that every making keeps 48 px or more each way at 1024 by 768 and upright at 820 by 1180 (`touch.test.ts`). The boat and the gnome are touched where they are drawn, the gnome from his belt to the tip of his hat, standing or seated on a hull that has turned and tipped him, and a thing let go anywhere on him, hat included, is given to him (`drawn.test.ts`). What stands and lies on the boat is touched where it is drawn, on the stone and afloat in the eddy, and comes off there when it is pulled; on the brook the boat sails as it left. A mast is taken anywhere along it, from its top down to the rim of the hull, and below the rim the finger has the hull, by which the boat is lifted. Inside 29 units of the middle of a load or a blanket the finger takes that thing, also at the foot of a mast, so each keeps 48 px or more each way lying at 1180 by 820 and at 1024 by 768 with its neighbours counted; standing at 820 by 1180 the things share the deck, the nearer middle first, and the smallest room is 38 px. Leaves that lie on a deck with no mast are a pile over the gnome's seat, each 30 units along and 30 up from the one under it, and a leaf he has pulled over his head is taken up there (`deck.test.ts`). Twelve makings lie on the bank: three hulls, three masts, three sails and three loads, each with a silhouette of its own.

### Depth

What is nearer is drawn in front. The far bank and whoever stands on it come first, then the water lines, then everything in the water sorted by how near it is (a leaf floating past nearer than the hull is in front of the hull, one further off is behind it), then the near bank and what lies on it, then whatever the finger holds, drawn where the finger is whatever the view does (a boat in the hand is over the makings on the bank; `seen.test.ts`), then the idle ladder's glow and hand.

### How things move

Each character is a rig of plain numbers in `rig.ts`, moved by its own idle and by acts, which are timed scripts with a sound cue on the frame of the motion it belongs to. No motion is shared, and the view reads every value of every rig (`pose.test.ts`).

- **The frog** breathes with his throat, blinks one eye after the other, and watches the berry. Tickled with the feather he swells to half as large again, and no more: at twice his size he would cover the kingfisher's perch above him and leave the print at its left edge. Poked, he croaks in two pulses with his whole body and his mouth wide. A ring passing under his stone makes him gulp and bob. His tongue takes what is let go near him; the pebble pulls him off his stone.
- **The kingfisher** bobs his head and flicks his tail. Poked, he ruffles up to nearly half as wide again and rattles his beak, one clap a note. On the brook he leans down from the branch to peck at a hat, hangs on upside down, or rides a mast top.
- **The water sprite** sways with the brook, and her hair runs as water lines. Poked, she breathes in until her cheeks are full and blows a breath that crosses the brook, then sinks to her nose before she comes up. A breath that reaches a sail fills it and sends a boat afloat down the eddy, as a ring does. On the brook, between two masts that do not both carry a sail, her breath sings in the bare mast like a flute, twice.
- **The gnome** rocks on his heels, taps one foot and follows the finger with his eyes. The first thing pressed onto the hull gets his climb aboard and nothing else; his opinions start with the second. Aboard he sits at the stern with his legs over the side, points downstream now and then when his arms are free, shifts along the deck away from a pebble, and wears his opinion of the boat: arms up, arms folded, a sneeze, a red beard, a leaf over his head. His hat is a spring: it says each thing before his face does, and in the sprite's breath or at speed its tip streams downwind, toward the bow.
- **The makings and the hull** never move by themselves. They are the plainest things in the print, so the child's pieces are told from the world at a glance. A thing picked up squashes and swings from the finger; a thing set down lands with a small bounce; the boat dips on the water under what is loaded on it and rides as low as it is heavy. A making or a hull afloat rides away from a ring and then makes for the shore again, and one in the middle of its own water act drifts while the act goes on (`floats.test.ts`). A thing let go where it cannot lie (on another making, or on the flat stone, which is kept for the boat) hops to the nearest free place in an arc that is seen (`seen.test.ts`). While a place answers the boat, a finger on it makes the hull knock and bob and the answer goes on; only a finger that pulls lifts the boat out, and a lift the shell takes away puts the answer back where it was (`answer.test.ts`). The bark's strokes and the walnut's furrows are each of their own length, gap and bend.

Motion has weight: a spring with overshoot settles the hull, the hat and every landing. Nothing eases in a straight line and stops.

A tap on nothing in particular is answered as what it landed on, with a sight where it landed: the near ground knocks and throws up petals, the far bank rustles and throws up a puff of petals, smaller for being further away, and the sky gives a whiff and a short gust of two pale lines that curl downwind (`seen.test.ts`).

### What the idle ladder shows

One want at a time. After three seconds with no touch, one warm ring, clear at its middle so the thing itself stays plain, on the one thing the hand is about to take or the one spot of water it is about to touch; at the finished pond that is the sun. After five, a pale ghost hand shows that one move. It shows where a thing can go and never which thing to build with: a hull to the bare stone; then, for as long as the gnome is not aboard, the hull is bare or the boat is nothing but bare masts, a build, and the build is a sail: a mast to a mast place where none stands or every mast has its sail, a leaf or the feather to a mast that stands bare, and never a thing to the deck, where a leaf is the blanket the gnome pulls over his head (`hand.test.ts`, at every first showing: a first visit at each age and every morning after); then the boat to the water; then one finger laid in the water behind the boat; and at the pond the sun lifted. The hand is whole inside the print at every surface size, and at the bank it lies in open water, not over the sand (`hand.test.ts`).

### Tiers and the frame's cost

The tiers change the pixel ratio (2, 1.5, 1.25, 1) and, on the two lowest, drop one of the two sheets of water lines. Nothing else changes, so the look is the same on every tier.

Everything that does not move is printed once into sheets when the surface is sized: the sky and water, the far strip, each place, each character's parts, each making, the hand, the lamp. The boats moored at the pond are printed again only when the pond's list changes. A frame stamps those sheets and draws live, with the pen, only what bends: rings, the wake, the sprite's breath, a tongue, limbs, the hat. The water's lines are two stamped sheets that slide, not strokes.

The game's draw count is one number, stamps plus the pen's strokes and fills; it is what the grown-up overlay shows, and `frameBudget.test.ts` holds it under 80 in the fullest frame of each part of the game and records the counts at three sizes. At 1180 by 820: 49 on the bank at rest, 51 with the one glow and the hand, 66 with everyone poked at once and a full boat afloat, 54 on the brook, 64 while the view moves on, 52 in the lamp scene, 47 at the finished pond with five boats and the hand, 57 in the morning scene. At 1024 by 768 and upright at 768 by 1024 each is one more, the paper beside the print, so the fullest frame of all is 67.

### Not in this look

No gradients but the wipe from top to bottom, no glow but the idle ladder's ring and a lit lamp, no drop shadows, no soft edges, no black, no texture photographs, and no letter, numeral or sign anywhere, the seal and title cartouche of a real print included. Shapes that could be read as a sign were redrawn or are listed with the reason they stay under "Reader" in `REFINEMENT.md`.

### The registry row

As it stands in the claimed-styles registry in `docs/art-direction.md`:

| Bark Boats | Woodblock river print in canvas 2D: one colour print inside a paper margin, every shape closed by a thin indigo key line, flat colour wiped top to bottom, block grain on the large areas, the brook a wide blue band of combed pale lines that slide, one red, dusk as a single wash wiped down | [`games/bark-boats/ART.md`](../games/bark-boats/ART.md) |
