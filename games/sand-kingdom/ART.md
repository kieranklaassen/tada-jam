<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

Sand Kingdom is a beach at low tide. The child shapes damp sand with a finger and a bucket, draws the sun down when ready, and watches the sea move into what was made and the sea folk use it. It has no learning goal.

## The band and its age rule

The manifest band is 3 to 7, and its youngest age, 3, governs every choice below.

- **Cue table.** The row for 3 to 4 in wordless clarity. From its "Avoid" column the game takes: no text, numeral or icon to decode; no spoken instruction; no verdict; one live activity (the sand, by day and by evening alike); and no tool that means nothing when it is touched. The bucket, the shells and the driftwood lie on the beach from the first frame, and each one does something at once when a finger lands on it (the grid below), so none is there before it means something. One next act is offered at a time: the idle ladder glows on the sand and shows one stroke.
- **The pack's rules for the range** (pack: game-design, ages-2-to-4.md; pack: game-design, ages-4-to-6.md). Every touch is answered and no order of touches is a dead end: a finger anywhere on the sand shapes it, and the sea, the sky, the rocks and each of the folk answer as themselves. Everything essential works with a tap: a tap on the sand makes a dent or pats a heap flat, a tap on the bucket fills it or turns it out where it stands, and a tap on the sun sends it the whole way down or up. A drawn groove survives a lifted finger (a finger that comes back near where it lifted carries the same groove on) and counts when partly done (whatever was dug stays dug). A finger that lands on a rock, the gulls' log, a cloud, the sky or one of the folk gets that thing's answer, and drawn on from there it digs from where it comes onto the sand, with the sand's own sound, or splashes where it comes onto the sea. No pinch, tilt, shake, hold or double tap. The things a finger must find (the bucket, each shell, each driftwood piece, the sun) each answer a finger over at least 100 logical pixels across on a tablet held wide, 1024 by 768 logical pixels and up, well apart, and on a first visit none lies in the bottom strip. The sand ends below the jam's home control at the top centre and short of the top right 72 by 72 pixels, which hold nothing that answers, so nothing can be carried to or left under either, and the sun's whole path lies clear of both. Nothing the game brings to rest covers one of these things: a shell shot from under a tower or set down by the crab, driftwood the water carries, the bucket tipped on its side, and each of the folk at its day place and at its evening place stop clear of the bucket, the shells, the driftwood and the sun, and where the place is taken they stop beside it. A finger on one of the folk is a poke, and a finger on a shell, a piece of wood or the bucket next to one of them is never taken for a poke. A test of overlaps holds this at 1024 by 768 logical pixels. Quantities stay small: one bucket, three shells, two pieces of driftwood, four kinds of sea folk. From four on the game is pretend play with characters who react, and the child supplies the plot: a kingdom, a harbour, a trap for the crab.
- **Symbols.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, optional or not, and the game has no `symbols.ts`. No voice gives an instruction; the folk speak in clicks, squeaks, squawks and bubbles.
- **What `ctx.childAge` sets.** Only how the bucket stands on a first visit: for a child of 4 and younger, and for no age (`null`), it stands heaped full of sand, so the first tower is one tap; for a child of 5 and older it stands empty. A saved beach wins over the age, every cell of the grid is reached by play at any age, and the age gates nothing.

## The toy

**A finger drawn through damp sand.** The finger lands on the beach and the sand opens under it.

In the empty scene there is the beach at low tide under a low orange sun, the sea at the far edge, and nothing to do. On touch-down, in the same frame:

- the sand under the finger sinks into a round dent, and a rim of pushed-up sand swells out around it, wider than the finger;
- a soft thud sounds, of four variants, never the same twice running;
- grains jump out of the dent, fly a short arc and land with small ticks;
- the bottom of the dent turns dark and wet and picks up the orange of the sky.

As the finger moves, the dent becomes a groove that follows it, with a rim heaped on both sides. A gritty hiss sounds for as long as the finger moves, and its pitch follows the finger's speed; grains spray off the front of the stroke. The groove's wet bottom mirrors the sky, so a long groove is a bright line across dark sand. Where the groove is dug low enough, near the sea, the water comes in along it by itself with a small gurgle, and goes in and out with each wave. A finger that lands on raised sand (a rim, the ridge between two grooves) pats it instead: the top goes flat and smooth with a slap, and the heap gets shorter and wider.

It is a pleasure with no goal because it is drawing with a consequence: every line is at once a mark, a ditch and a mirror, and where it meets the sea it is a stream. A child digs, pats and draws for as long as they like with nothing to finish. Random tapping always leaves dents, flats and splashes, never a refusal. A person watching sees within three seconds that the child is digging in the sand.

## The object-by-action grid, and what is new on day 15

The objects are the six things a spot of the beach can hold. The actions are the five things that can be done there. Every cell looks and sounds different.

| On that spot | A finger lands | A finger is drawn across | The empty bucket is dragged over | The full bucket is turned out | The tide comes over |
| --- | --- | --- | --- | --- | --- |
| **Level damp sand** | A round dent with a rim; a soft thud, grains hop out and tick down | A groove opens with a rim on both sides; a gritty hiss that rises with the finger's speed; the bottom goes dark and wet | A wide flat-bottomed furrow as broad as the bucket; a low grinding scrape; the bucket fills and heaps over | A tower stands, bucket-shaped; a hollow whump, then a sucking pop as the bucket lifts; grains slide down its side | A thin sheet of water slides up over it with a fizz of foam and leaves it mirror-dark |
| **A groove** | The finger goes deeper: water wells up in the bottom with a squelch and a glint | The new groove drops into the old one with a two-step crunch, and the wall between them crumbles with a dry trickle | The groove is scooped into a round basin; a heavy wet slurp | The tower lands in the groove and plugs it as a dam; a wet glop, and its foot spreads | Water runs along it from the sea end, in the order the grooves were dug; a gurgle that climbs as it fills |
| **Raised sand** (a rim, a heap, a tower) | A pat: the top goes flat and smooth, shorter and wider; a slap | A gate is cut through it; the cut sides slump with a run of small ticks | The top is shaved off level; a dry rasp, and the bucket is full at once | A second, narrower tier lands on the first with a whump and a creak; a third brings the whole stack down into one big soft heap with a long slump and a puff of grains | The water laps its foot and grains slide in with small plops; what is above the water stands as an island, and what is below it sinks to a round mound with a long hush |
| **A shell** | It is pressed half into the sand with a damp squeak; pressed again it pops out with a tock and lies the other way up | It goes with the finger, ploughing a thin line with a clicking scrape, rides up and over a piece of driftwood, another shell, the standing bucket or one of the folk in its way, and stays where it is let go, or beside what it was let go on | It is scooped up with the sand and rattles in the bucket; it comes out stuck in the side of the next tower as a window | The tower lands on it and the shell shoots out sideways with a ping and skitters to a stop; a shell with no clear way out stays where it lies, and the tower stands beside it | It fills with a glug and lets go a string of bubbles; it stays where it is |
| **A piece of driftwood** | It rocks like a see-saw, one end up and one end into the sand; two hollow knocks | It goes with the finger with a low woody rumble, riding up and over a shell, the other piece, the standing bucket or one of the folk in its way; let go across a groove it lies as a bridge, well off square to the groove, with a clack; let go on something, it is set down beside it | The bucket's rim knocks it with a clang, and the bucket bounces back and falls onto its side clear of it, spilling what it holds; a full bucket rides over the top of it under the finger and is set down beside it when let go | The tower lands across it, to one side of its middle, and the wood sticks out of it, far on one side and a stub on the other, and leans; a muffled thud and a crack | It floats: it lifts with a creak and drifts along the groove the water runs in until the groove ends, bumping the sides with soft knocks |
| **Standing water** (a filled groove or pool, the sea's edge) | A splash: a ring spreads and drops jump; a plip | A wake follows the finger with a slosh, and the groove still opens under the water in a cloud of sand | The bucket fills with water and slops as it goes; turned out, it empties in one sploosh that soaks away to a dark patch and leaves no tower | The tower lands with a splosh and a ring wave, fizzes, and slumps at once to a low island | The pool and the sea become one: a small wave runs back along the pool with a low whoosh |

Each wrong use works and is funny: a tower turned out on a shell fires the shell across the beach, the bucket dragged at driftwood knocks it and falls on its side, a third tier brings the stack down, a bucket of water makes a splash and no tower, a tower built in a groove is a dam.

Beside the grid, each with one line:

- **The bucket.** A tap on it empty fills it where it stands with a scoop and a crunch, or with a glug where it stands in water; a tap on it full turns it out there (the grid's fourth column); dragged full it goes with the finger with a heavy rumble and a rattle of its handle, digs nothing, rides over the top of a shell or a piece of driftwood in its way, and stays where it is let go, or beside the shell or the driftwood it was let go on; lying on its side, a tap or the start of a drag stands it up with a clonk.
- **The sun.** A tap sends it the whole way down, or the whole way up, with a slow two-note chime, and the journey takes about four seconds of attended time; a drag moves it with the finger, the sea following, and let go past half way it finishes the journey, otherwise it goes back with a soft hum. A tap on the sun while it travels by itself turns it round, and it goes back to where it set out from with the same hum. While it is away from its place at the top, in the hand or on its way, each of the folk still at its day place turns to it and follows it (the crab's eyes one after the other, the starfish's eyes and one arm, the eel's eyes, the gulls' heads a beat apart), unless a finger is on the sand. Nothing on the beach changes and nothing is saved until it arrives. Down, it is evening and the folk come (the scenes). On the way up from evening the sea draws far back, further than by day, and the folk leave for their day places, which is the sign of what comes; turned round, the sea and the folk come back. Up, one long wave runs over the whole beach and smooths the sand.
- **The folk.** A finger on any of them is a poke with its own answer, by day and by evening: the crab pulls its eyes in and snaps both claws (under a shell it wears it keeps its eyes out, holding the shell up, and snaps), the starfish curls into a fist with a squeak and opens one arm at a time (poked while it drops, wheels across the sand or leaps it squeaks and starts, flattened for a moment with its eyes shut and its mouth round, and goes on its way), a gull squawks, hops up and lands at the other end of its row, the eel shoots back into its hole with a bloop and looks out with one eye.
- **The setting.** The sea beyond the sand plips and rings, a rock knocks and sheds a few grains, and the sky answers with a breath of wind that pushes the nearest cloud. The gulls' log is a third, larger log fixed at the edge of the beach and is not one of the two pieces: a finger on it gives a deep hollow knock and the gulls bounce once, and it does not move.

On day 15 the child digs for the water and for the folk at once: a groove from the sea that fills a pool that floats the driftwood to the tower, a ring for the crab with a bridge over it for the eel, a wall cut with a gate so the gulls sit either side. On day 1 the same child dug grooves and watched them fill. Nothing new was given; the rules stayed the same and the child learnt what each one of the folk does with each shape.

## The representation

The game has no learning goal, so there is no school idea to represent.

## The four mechanic questions

The game has no learning goal, so the four questions about a school skill do not apply.

## The error as a consequence

There is no wrong sand. What can go otherwise than the child meant shows in the world, at the place, at evening when the water and the folk arrive:

- **A moat that is not closed.** The crab walks along it to the gap, stops there, looks at the gap, taps the sand with one claw, and walks back the way it came. The gap is where it stops.
- **A moat or pool the water cannot reach.** It stays dry while the grooves beside it fill. The crab patrols it dry, kicking up sand, and looks toward the sea at each turn.
- **A wall with a lumpy top.** One gull lands and stays; the others land, slide off the lumps and flap back to their log. A patted stretch holds them.
- **No tower.** The starfish rides the back of the crab where the crab is out walking a bank, and otherwise stays on its own rock; it never climbs a thing the child picks up.
- **A groove with nothing across it.** The eel swims along it in the open, fast, and pokes its nose at any driftwood lying near.

The state stays. The sand can be shaped at evening as by day, so the child changes one thing (closes the gap, pats the top, digs a channel to the sea) and the folk answer the change as soon as the finger lifts. Nothing resets, nothing is refused, nothing buzzes or turns a sad face to the child. A beach with nothing built is as good to watch: a few bored crabs come and walk sideways.

## The designed order, and what is stored

The game has no learning goal and no order of challenges: it is open pretend play on one beach.

**The order.** There is one place, `shore`, which is the whole `LADDER` in `config.ts`. It names the beach, never a grade, a groep or a level. No cycle is judged well or badly, and the position never moves.

**What a first visit starts with, by age.** The beach is smooth, the sun is up, three shells and two pieces of driftwood lie on the dry sand, and the folk wait at the edges. For a child of 4 and younger, and for no age, the bucket stands heaped full; for a child of 5 and older it stands empty. Nothing else depends on the age.

**What play changes.** Only the beach itself: what was dug, built and put down is there on the next visit, with the sun where it was left. A harder thing is one the child chooses and can see is bigger: a longer moat, a channel all the way from the sea, a higher stack.

**What is stored**, as plain JSON through `ctx.storage`:

- `v`: the version of the shape.
- `position`: always `shore`.
- `finished`: the template's mark that the cycle on screen is over. It is true exactly while the sun is down.
- `sand`: the beach as a coarse grid of 96 by 72 cells, each holding how far the sand there stands above or below the smooth beach, two characters a cell.
- `dug`: the cells where the grooves began, oldest first, at most 24, so the water takes them in the order they were dug. When a 25th groove is begun the oldest is forgotten and counts as dug first of all.
- `sun`: `up` or `down`.
- `bucket`: where it stands (`x`, `z`), what it holds (`nothing`, `sand` or `water`), whether a shell is in it, and whether it lies on its side.
- `shells`: for each of the three, where it lies (`x`, `z`), which way up, and whether it is pressed in, in the bucket, or in the side of a tower.
- `wood`: for each of the two pieces, where it lies (`x`, `z`) and how it is turned.

Not stored: the water, which is where the sand and the sun put it; where each of the folk is, which follows from the sand and the sun; grains in the air, rings, foam and bubbles, which last moments; the ghost hand; and anything in the hand. A bucket, shell or driftwood piece under a finger at a put-away is saved where it came from, the sun in the hand goes back to where it was, and a sun travelling by itself is saved where it set out from, so no scene is owed on load. A groove is saved as far as it was dug. No clock is read and nothing changes while the game is put away. The largest legal state is under 16 KB, and a test holds it under half the 64 KB cap.

## The characters and their fixed tastes

Four kinds of sea folk, each large, with eyes that follow the finger. By day each waits at its own place at the edge of the beach with its one want showing; none asks, hurries or looks at the child for it.

| Folk | Moves like | Its want, as it shows by day | Likes | Cannot stand |
| --- | --- | --- | --- | --- |
| **The crab**, red, as wide as a hand | Sideways only, in quick runs and dead stops; eyes on stalks that move one at a time | It walks a small ring in the sand at its place, round and round, a ring with nothing in it | A closed ring of groove with water in it: it patrols it, claws high, and lowers a claw and pulls in an eye to go by under an arm of the starfish where it lies on a tower beside the bank | A gap in its ring: it stops, stamps and clacks at the gap. Driftwood laid across its bank on both sides of it, so that it can reach no part of its line: it tries for a while, then digs itself into the sand to the top of its legs with a scrape, legs shuffling, and waits there with its eyes out, drawing each in for a blink in turn; when a piece has been moved, or at a poke, it comes up with a snap of both claws and takes up its lap. A shell in its way it lifts onto its eyes, wears as a hat while it goes by, and puts back where it lay at its next stop clear of the place; with a second shell at its feet, or standing over the place as the tide goes out, it sets it down beside itself instead. The shell is saved where it lies or will lie, so on load it lies there and no hat is worn |
| **The starfish**, orange, five fat arms | Slowly, one arm at a time, then a sudden flop | It stands on two arm tips on its rock and stretches up as high as it can, wobbles and plops | The highest place on the beach: it climbs the tallest tower and spreads out on top, with two arms parted round the bucket where the bucket stands by that tower; a tower the bucket stands right against it leaves alone | Anything higher than where it is: it lets go, drops with a slap and climbs the taller thing |
| **The eel**, green, mostly head | In one long slide, fast, then stock still with only the eyes moving | It threads the hole in its rock, in one side and out the other, again and again | A dark way through: a groove with water in it and driftwood across it. It goes under and comes out the other side where the water beyond is long enough for it, and where it is not it comes back out the way it went in; wherever it comes up beside the wood its head and neck are clear of it and it is seen. A groove too short for that on both sides of the wood it leaves alone, and keeps to its rock | Open water in daylight: it swims an open groove flat out with its eyes shut |
| **The gulls**, three, white with yellow feet | In hops and shuffles, heads turning together a beat apart | They stand in a row on their driftwood log and shuffle for room | A flat wall top long enough for all three in a row, out of reach of the starfish's arms on its tower and with nothing lying on it or on the sand just in front of it (the bucket, a shell, a piece of driftwood, a rock); where the best row is taken so they go to the next best that is clear, and keep to their log only when none is | A lumpy top (they slide off) and each other's elbows (the end one is shuffled off and flaps back on) |

With nothing built for anyone, a few bored small crabs come at evening and walk sideways along the water's edge.

A dislike is as good to watch as a like, and whoever is bewildered is never hurt. Every reaction is to the sand, the water, the sun on its way or the finger on them. None of the folk thanks, praises, sulks, hurries, or notices the child stopping, leaving or coming back.

By day the folk also watch the digging: the crab leans over to look into a groove dug near it and clacks at grains that land on it, the starfish waves one arm in time with a long stroke, the gulls duck one after another when grains fly their way, from a finger that lands near them or a stroke drawn up to them, and the eel's eyes follow the finger from its hole.

## The scenes

Two short scenes, each the consequence of what the child did with the sun, each built from the beach as it stands. No scene is a first showing: this is free play with no target idea, so nothing is shown before the child tries it.

- **The folk come.** Cause: the sun reaches the bottom (a tap on it, or a drag let go past half way). Beats, 6 to 10 seconds: the light turns deep orange and violet; the sea comes up the beach; water runs along each groove in the order it was dug; driftwood in the water's way lifts and drifts to the end of its groove; the folk, who followed the sun down, look to and fro along the sky where it went until each is sent; then the folk come one by one, the crab first, each to what the beach holds for it or to its consequence above. Filled in from: the sand, the grooves' order, and where the shells and the driftwood lie. Saved when it starts: `sun` as `down`, `finished` as true, `wood` with each piece where the water will leave it, and `sand` with the raised sand that the evening water covers already sunk to its mound; `dug`, `bucket` and `shells` are not changed. A touch ends it: the water stands filled, the wood lies where it was going, each of the folk is at its place, and the touch is then an ordinary touch.
- **The tide goes out.** Cause: the sun arrives at the top, after a journey the child saw and could turn round (the sun, above). Beats, 4 to 6 seconds: the light turns gold; the sea, drawn far back, comes in once as one long low wave with a rising hush and runs up over the whole beach; each tower and rim slumps as the wave passes over it; the wave slides back to its day line and the sand is smooth and wet behind it; shells that were pressed in, or in a tower, are left lying on the smooth sand where they were. Filled in from: what stood on the beach and where. Saved when it starts: `sun` as `up`, `finished` as false, `sand` smooth, `dug` empty, each shell as lying where it was (one in the bucket stays in the bucket), `wood` where it lies, and `bucket` where it stands, holding what it held. A touch ends it: the beach is smooth, and the touch is then an ordinary touch.

**How a cycle ends and the next begins.** A cycle is one day on the beach. It ends when the child draws the sun down. The lit kingdom then stays as long as the child likes, the sand can still be shaped, and the folk answer each change. If the child does nothing, nothing new starts. The next day begins only by the child's own act, lifting the sun, which is in the scene from the first frame. On load nothing plays: the beach, the sun, the water and the folk are where the save puts them.

## The records

The game has no learning goal: it is designed from no record and claims no school skill.

## The look

This part is the art guide. It was written after the look spike, brought up to date when the game was built on the toy, and is not part of the sheet.

**The look in use is the first one reserved for this game: wet shore at sunset.** A wide beach seen from a little above, the sun low over the sea on the left, and everything wet giving back the sky. The spike passed on clarity (a groove reads as a groove from the first dent, at 1180 by 820 and at 1024 by 768) and on the draw count, so the second reserved look was not tried. The lead kept the look after the toy. Its registry row for `docs/art-direction.md` is a request to the lead and is the last thing in this guide.

### What makes it this look and no other

- **The wet sand is a mirror.** Where the sand is wet (at the waterline, in the bottom of anything dug, and everywhere the evening water stands) it shows the sky: orange near the horizon, rose above, and a streak of the sun. Dry sand is matte and warm. The line between the two is what tells a child that digging goes down to water.
- **One low sun lights everything from the far left, and the child moves it.** A rim dug by the finger catches it on one side and falls dark on the other. That lit edge is how a groove is read, so no outline is drawn anywhere. As the sun goes down the sky deepens from orange and rose to deep orange and violet, the sand cools with it, and the water in the grooves becomes the brightest thing on the beach.
- **The dug sand is the plainest thing in the frame.** It has no face, no colour of its own and no sparkle. The sea folk, the bucket, the shells, the rocks and the sky carry the colour and the comedy.

### Palette

| Where | Colour |
| --- | --- |
| Sky by day, from the horizon up | orange `#ffa854`, rose `#f7786b`, violet `#785794` |
| Sky at evening | the same three, deeper: the orange burns low and the violet comes down to meet it |
| The gold of the morning, while the one long wave runs | a pale gold wash over sky and sand that fades as the wave slides back |
| The sun's glare on water and wet sand | pale gold `#ffe6b3` |
| Sand | damp `#bd8c66` near the sea, dry `#f2cc9e` up the beach, then lit and shaded by the sun |
| Wet sand and standing water | the sky's own colours, mirrored |
| The sea | the mirrored sky in rolling bands, gold glitter toward the sun, foam lines of cream `#fff0db` |
| Rocks | violet grey `#806b70`, darker `#5c4d5c` below, a warm top `#9e8075` |
| The bucket | sea green `#1f9e99` outside, deeper `#126b7a` inside, a pale yellow rim `#ffe68c`, a white handle |
| The shells | a rose scallop `#ffb89e`, a butter whelk `#fcdb99`, a lilac mussel `#dbbde6`, each pearly inside |
| Driftwood, the two pieces | grey-brown `#997861` and `#856b5e`, a bleached top `#d6bd9e` |
| The crab | tomato red `#e64533`, pale claws `#fa8f61` |
| The starfish | orange `#ff8f33` with cream spots `#ffd180`, no two spots the same size or the same distance apart |
| The eel | sea green `#4d996b` with a pale belly `#c7db80` |
| The gulls | warm white `#f7f2e6`, a grey wing `#9ea3b8`, an orange beak `#ff8c1f` |
| The small bored crabs | the crab's reds, each a different size |
| The gulls' log | brown `#8f664d` with a pale top `#bd997a` |
| Beach grass | olive `#80854d` to gold `#edc76b` at the tips |
| The backdrop before the first frame | `#f0a35c`, the beach's own orange (`BACKDROP` in `config.ts`) |

The lightest things on the beach are the folk's eyes and the gulls, and the darkest are their pupils and the one hole in the eel's rock. Nothing else comes near either end. The bucket is the only sea green thing on a warm beach, so it is found at once.

### Materials

- **Sand:** one plane shaded from the height of the sand, which the game hands to it as a texture each time the sand changes. The same texture carries where the evening water stands. The shading reads the slope for the light, the depth for wetness, and adds the tide's ripples on the damp part and a fine grain on the dry part. A tower, a furrow and a basin are sand like any other: the bucket only changes the heights. Sand that stands up (a tower, a heap, a high rim) is paler and takes more of the sky's light, so it reads from the child's side, which the low sun leaves in shade.
- **Water in what was dug:** drawn in the sand's own shading, a little below the sand's surface wherever the evening water has reached, so a moat high up the beach holds water as a pool does by the sea. It mirrors the sky and has a pale line where it meets its bank.
- **Sea:** one plane standing at the sea's level, which rises with the sun going down and draws back as it goes up. It is clear at its edge, so the sand shows through the shallows, and a foam line is drawn where it meets the sand, dug or not.
- **The one long wave:** a thin sheet with a foam front, drawn in the sand's shading as it runs up the beach and slides back; the sand behind its front is already smooth.
- **Sky:** one plane at the horizon holding the sun, three clouds, two headlands and a small boat. The sun is drawn where the game says it is, so the finger moves the picture and the touch is taken from the picture.
- **Folk, things, rocks, wood and grass:** smooth lumps of flat colour with a lighter top, lit by the same sun, with a warm edge on the side away from it. Rocks are faceted; everything alive is round. The bucket is open, and its handle is a bow a little wider than its rim, so that swung right down it lies round the rim and not in it: its inside shows, with the sand heaped over the rim or the water standing under it, and a shell that was scooped up shows in it as that very shell, small, tilted over the rim.
- **Shadows:** soft dark ovals drawn into the sand under the crab, the starfish, the bucket, the rocks and the log, and a long soft shadow under each piece of driftwood that lies along the bough and turns with it. No shadow maps.
- **Grains, drops and bubbles:** small round points, sand-coloured when thrown by digging, pale when splashed from the sea. A stroke under standing water throws no drops: it brings up a slow cloud of sand-coloured motes that drift, rise a little and are gone.
- **Rings on the water:** broken arcs that widen and fade, never a closed ring; a tap on the sea throws a large one, under the finger, that can be seen across the frame. A wake is one ragged streak: a fleck of foam laid behind the finger every little while, each a little to one side, at its own turn and of its own length, with a second, smaller one when the finger is fast. The small wave that runs back along a pool when it meets the sea is a few flecks of foam laid one after another from the sea end, unevenly spaced, of unequal length, each leaning its own way off square, so they are never a row of bars. Water that wells up in a deep groove is a ring at the water's own level with bubbles rising through it.
- **Nothing drawn reads as a count or a sign.** A bridge lies well off square to its groove, about a third of a right angle, the two pieces to different sides, a bough under a tower sticks out further on one side than the other and leans, and a bough's shadow lies along it, so no two strokes cross as a sign would. The shells are three different kinds with no ribs or rows; the starfish's spots, the gulls' places on their log and the small crabs differ in size and spacing; the eel's rock shows one hole, and its other way out is from behind the small rock at its side.

### Lighting

One sun direction and one sky, shared by every material, so the mirror, the glitter and the lit rims all agree, by day and at evening. There are no lamps and no post pass. The picture is drawn in one pass at a pixel ratio of 2 or below.

### Motion

- **Sand is heavy.** It moves only where the finger or the bucket is, and where the tide takes it. A finger that lands on a rock, the log, a cloud, the sky or one of the folk and is drawn on digs from where it comes onto the sand, with the landing's own sound there. A dent is there in the frame the finger lands, at the bottom edge of the frame as in the middle of the beach; the rim rises with it. Grains fly a short way, fall and are gone in under a second. Where a stroke breaks into an older groove the wall between them crumbles and grains slide in, and where the evening water sinks a heap, grains are flung from it. One stroke through a tower cuts a gate down to the beach, with the tower standing on either side, and the cut sides tick and shed grains in the frame the cut shows. As the tide goes out, a shell that stood in a tower's side or was pressed into the sand topples flat over half a second as the wave passes.
- **The bucket has weight.** It hops when touched and its handle swings; turned out it lifts off its tower in an arc and lands beside it with a squash; full, it sits lower and rumbles, rides over the top of a shell or a bough under the finger and is set down beside it when let go; empty, its rim knocks a bough and it bounces back and falls on its side clear of the wood. It never stands on a shell or a bough and never passes through one. A shell shot out from under a tower flies half its way and skids the rest, along a way that is clear.
- **Nothing passes through anything.** A shell or a bough in the hand rides up and over whatever it comes to (a bough, a shell, the standing bucket, any of the folk) and, let go there, is carried on across and set down beside it. Whatever walks goes round what stands in its way, and whatever rests lies on top of what is under it. The game reckons with plain shapes for this, and `solid.test.ts` holds those shapes to the meshes that are drawn.
- **Water is never still.** The sea laps a little either side of its level, the foam lines travel in, the glitter shifts, and a ring spreads from a tap on the sea. At evening the water runs along each groove from its sea end, one groove after another.
- **Every one of the sea folk moves like itself**, at its own tempo, with idle variants that never follow themselves:
  - The crab goes sideways in quick runs and stops dead, eyes on stalks that sway after the stop. A stalk leans far forward and toward its own side, a little toward the other eye and a little back, and stands straight beside a claw held high. By day it circles its patch and scuttles to look at fresh digging; at evening it patrols a moat on its bank, stamps at a gap, kicks sand on a dry one, steps round the bucket or a bough set down on its bank, on the beach side with its claws high and without a stamp (neither is a gap; where the beach beyond has no room it turns back there), and lifts a shell that lies in its way onto its eyes as a hat, which it puts back where it lay at its next stop clear of the place. Poked under the hat it keeps its eyes out and holds the shell up. It has one shell at a time: it lifts none while the one it put back is still in the air, and wearing one with a leg about to come over a second it stops dead, sets the first down beside itself, on dry flat sand out of any groove, where it then lies lap after lap, and then lifts the second. It is never in built sand: it goes round a tower where there is a way, walks up and over on the sand where there is none, its legs reaching down for the sand on the lower side, and wades a groove on its floor; shut in by boughs and the bucket on its way home it climbs over a bough. Cut off from its line at evening, with a bough across its bank on either side and no way to any point of the line, it tries for about eight seconds, then digs itself into the sand to the top of its legs, legs shuffling and sand flying, with a scrape that falls (the voice `burrow`), and waits with its eyes out, drawing each in for a blink in turn; after each blink, and at once when something on the beach is changed, it looks for a way, and with one it comes up with a hop and a snap of both claws and takes up its line. With a way that is only a long way round it takes that after sixteen seconds and does not dig. A way round is a step round: it does not go right round its ring to come at a place from the other side. Where the starfish lies on a tower with its arms out over the edge, the crab going by under an arm lowers the claw on that side and pulls in an eye, only as far as the arm needs; where the arm is lower than a claw held down, or the crab wears a shell, it is not under the arm at all: it goes round, and steps out from under an arm that comes down over it. It swings round to lead with its other side only once its claws are low enough for every arm the swing passes under, and slowly while the eel is up in the water under it.
  - The starfish is slow. It reaches one arm at a time, wobbles and flops. Poked, it shuts its eyes and its mouth first, and from when an arm starts in over its face until it is out again nothing of the face is drawn, neither eyes, lids nor mouth. Poked while it drops, wheels or leaps it cannot curl: it starts, flattened and sprung back with its eyes shut and its mouth round, for less than half a second, and goes on its way. To change place it lets go, drops, wheels across the sand one arm at a time and climbs, and on a tower it lies spread flat. With the turned-out bucket standing by that tower it lies with the gap between two arms turned to the bucket and those two arms parted, the more the nearer the bucket stands, and it comes down from its leap turned so; a tower the bucket stands right against it leaves alone. It lies on its rock, on a tower and on the crab's shell, never in them, and on the crab it sits behind the eye stalks with its arms clear of them, of the claws and of a shell the crab wears.
  - The eel lives in its rock and threads it, out of the hole in its face and round its right side from behind the small rock there, and is in no rock but its own. At evening it swims a groove in long slides, goes under driftwood laid across and comes out the other side where the water beyond is long enough for it, or else back out the way it went in, and sniffs at driftwood lying near. Long enough is room to be up with its head and the whole of its drawn neck clear of the wood; the plan finds that place on each side of the wood, and a load, a rise from its rock and the way out from under all put it there. A ditch with no such place on either side is no water for it, and it keeps to its rock. It comes up as it slides, so a slide is seen. Under the wood it is not drawn, and it makes no sound while nothing of it is drawn: its swish, its sniff and its bloop wait for the first frame in which it is seen, and are dropped if the slide, the sniffing or the rise is over before that. It goes right under the water, and is not drawn, before any of it would be under the crab, a shell, the bucket or a bough.
  - The three gulls stand in a row. They bob, shuffle and turn their heads one after another, never together; they fly to a wall one at a time, never to one within reach of the starfish's arms on its tower or with the bucket, a shell or a bough lying on it or on the sand just in front (they take the next best row that is clear, and keep to their log only when none is), and off a lumpy one they slide with their wings out. By day they duck one after another when grains fly their way, from a finger that lands near them and from a stroke drawn up to them. A bird stretches a wing, turns its head or leans only as far as the room beside it allows, and shuffles apart first where there is none; on a wall it folds the wing on the side where the crab goes by; ducking, it puts its head down in front of its breast.
  - The small bored crabs come out of the sea only when nothing is built, and scuttle along the water line in short runs, each at its own pace. One whose way up the beach is shut by something set down goes back into the sea, and comes out again when the way is clear.
- **The folk watch the sun go.** While the sun is away from its place at the top (in the hand, on its way, or just down with the folk still to come) each of the folk still at its day place, with no finger on the sand, turns to it and follows it: the crab's eyes one after the other, the starfish's eyes and, from its rock, one arm that goes up higher the lower the sun is and sways, the eel's eyes, the gulls' heads a beat apart and further round the lower it is. Once it is down their eyes go slowly to and fro along the sky where it went, until each is sent to its evening place. A sun carried back up takes their eyes back up with it.
- **The clouds drift** slowly to and fro, each at its own pace, and a touch on the sky pushes the nearest one along, found where it is drawn and over a finger's width at least each way; it slides, squashes a little where it has to stop, and drifts back, so the sky always has its three clouds. No cloud sways or is pushed under the home control or into the top right corner: each turns back before it.
- **Sound and motion are one event.** Every note names who made it, and a test fails when a note sounds while its maker is drawn still or is not drawn (`sync.test.ts`). A sound that comes later than its touch waits on the game's clock, never inside a voice, and a touch that ends a scene closes the scene's sound with it (`sound.test.ts`). Nothing sounds or starts on load.
- **Guidance is wordless and quiet:** after a rest a soft glow lies on a stretch of open sand clear of the things, and later a ghost hand with one finger out draws one stroke above it and digs nothing.

### How each tier keeps the look

`TIERS` in `config.ts` has four steps. Each lower step gives up detail and never the look:

| Tier | Pixel ratio | Grains in the air | Fine ripples and glitter |
| --- | --- | --- | --- |
| 0 | 2 | 160 | yes |
| 1 | 1.5 | 110 | yes |
| 2 | 1.25 | 70 | no |
| 3 | 1 | 40 | no |

The mirror on wet sand, the water in the grooves, the lit rims, the foam at the water's edge, the wave, the shadows and every character stay at every tier. The lowest tier loses only the ripple texture, the glitter on the sea and some grains.

### What the frame costs

Counted by the renderer at tier 0, 1180 by 820, on the production build, with software drawing (so no frame rate is given here; the lead measures that on a graphics card).

| Where | Draw calls | Triangles |
| --- | --- | --- |
| By day: the first frame, a tower turned out, a splash, the ghost hand | 44 to 48 | 32,556 to 35,136 |
| At evening: the kingdom with all the folk at their places | 47 to 48 | 33,872 to 34,192 |
| At evening with nothing built, the bored small crabs out | 48 | 36,560 |
| The lowest tier, through a whole day, evening and the wave | 44 to 50 | 32,556 to 35,684 |

The budget is under about 80 draw calls and under 60,000 triangles. There is no shadow map and no post pass. The counts in the table were taken before the grid was stretched to the bottom edge of the frame: the sand is now 96 by 72 cells, which adds 5,376 triangles to each row by count and has not been counted again by the renderer; a shell showing in the bucket is one draw call in place of the shell on the sand, and the whites of the starfish's eyes, now a mesh of their own so that a shut eye is not drawn, are one draw call more while its eyes are open; and the rock the eel lives in, now a mesh of its own so that what is in that rock can be told from what is in any other, is one draw call more in every frame. The sand is one plane of 96 by 72 cells raised in the vertex shader from one small data texture, which is written only where the sand changed. Rings are one instanced mesh of at most 24 and grains one point cloud of at most 220; `budget.test.ts` holds both caps, holds the heavy work (reading the water, sinking what the tide covers, smoothing the beach) to the one frame that owes it, and plays frames of a tenth of a second without a spring flying off.

### The registry row

For the claimed-styles registry in `docs/art-direction.md`, as a request to the lead:

| Sand Kingdom | Wet shore at sunset 3D: an open beach seen from a little above, dark wet sand and dug grooves that mirror an orange-to-violet sky, pale dry sand up the beach, a real sea with foam at its edge and a low sun on the left that the child draws down to bring the evening; a sea-green bucket, three pastel shells and two pieces of driftwood as the only tools, round flat-coloured sea folk (a red crab, an orange starfish, a green eel, three white gulls) on violet-grey rocks, soft blob shadows and no outline | [`games/sand-kingdom/ART.md`](../games/sand-kingdom/ART.md) |
