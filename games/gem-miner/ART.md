<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

Gem Miner has no learning goal. It comes from the lab demo of the same name, which lent its idea and its feel in the hand and none of its code. The demo's coins, selling, shop, pickaxe tiers, bag, depth records and collection are gone. What is kept is the rock that cracks and chips under a held finger, and what is new is that a gem is a lamp.

## The band and its age rule

The manifest band is 7 to 11, and its youngest age, seven, governs how clear the game has to be.

- **The cue-table row.** The row for a youngest age of 7 and up in the wordless-clarity convention. Its "Avoid" column binds the game: no written word or letter, no symbol standing alone that play depends on reading, no timer, points or verdict chrome, and no long chain of hints. Several things may be live at once as long as each reads at a glance.
- **The pack's rule for the range.** The band reaches 9, so the rule for ages 9 to 12 applies (pack: game-design, ages-9-to-12.md): a system that behaves truly, more than one solution, failure that is large, funny and free, dry humour, tools that look like tools, nothing babyish, no competition and no stored best. The pack has no rule file for ages 7 and 8, so for them the game keeps to what the youngest can do: everything works with one finger that holds, taps or drags, and the simplest use, a held finger, always digs.
- **The symbol rule.** The band starts above 6, so numerals and mathematics signs laid beside a quantity would be allowed, and the generator copied `symbols.ts` into the folder. The game draws none: nothing in it is counted, so there is no quantity for a numeral to stand beside, and the unused `symbols.ts` was taken out of the folder. No letter and no written word is drawn at any age.
- **What `ctx.childAge` sets.** Only which hillside a first visit opens on ("The designed order, and what is stored"): `near` for a child of 8 or younger, `wild` for a child of 9 or older. A saved game wins over the age. Age locks and hides nothing: both kinds of hillside hold every kind of ground, every gem colour and every tool.
- **What no age gives.** `null` opens a first visit on `near`, as for the youngest child.

## The toy

**The action.** Hold a finger in the rock and the mole digs toward it. That is what the finger does most.

**In an empty scene.** A hillside in section, one mole in a burrow at the top, and nothing asks for anything.

- When the finger lands, in that frame, the block under it is knocked: it shudders, dust jumps off its face, and it gives its own sound (a dull thump for earth, a dry tok for sandstone, a bright ting for granite, an echo for dug space). The mole's head snaps round to the finger.
- While the finger stays, the mole works toward it: he walks through what is dug, and swings his pick at the first block in his way. Each blow lands with the whole body behind it, chips fly from the face, and the block shows the damage.
- Earth crumbles at one blow with a soft crunch, and the clods roll into the tunnel. Sandstone takes three blows: each is a tink higher than the one before, a crack runs further each time, and at the third it breaks into slabs with a clatter. The mole steps into the gap and carries on.
- Granite turns the pick aside: a clang, a spray of sparks, the mole judders from hat to toes, and the blow skids on round to the block beside him, which takes it if it can be dug. Granite is never dug by the pick, and the mole goes round it when there is a way.
- A finger that moves is followed, so a dragged finger draws a tunnel. A finger that lifts stops the work: the mole finishes the blow he has begun, and if the finger only tapped a block, he walks toward it through what is dug and lands one blow on the first block in his way. A tap that comes down during the blow of the tap before is not lost: it gives its blow when that one has landed, with one blow in hand at the most, so fast taps dig every time. A tap is a finger that is down and up again where it landed within about a third of a second; a finger that stayed down longer and then lifts, moved or not, has held, and the work stops. That holds on a tool, on the lift and on the mammoth as well: while the finger is down he walks toward what it is on, and only a tap sends him on to fetch, to climb into the cage or to tip the water out. Under a finger that is still down when he gets there, or that lifts after longer than a tap, he stops, looks back over his shoulder and takes nothing: at the tool, in front of the cage, at the mammoth's feet. Whenever he looks back he stands turned round toward the child for about a second, with a small questioning hum of his own, and then turns to his work again. So a tap always does something, and taps alone dig too.
- A finger anywhere else is answered as well: on the bare wall above the hill it leaves a sprayed hand shape that fades, with a puff of pigment; on the grass it raises a puff of dust and the mole walks there; on the mole it knocks his hat over his eyes; on any other creature it gets that creature's own start and sound.

**Why repeating it is a pleasure with no goal.** The answer starts at touch-down and is bigger than the touch: a knock, a turn of the head, a swing, chips, a rising run of tinks and a break, and the creatures within hearing flinch at each blow, each kind hearing a different way off (pack: game-design, touch-answers-bigger-than-the-touch.md). The three kinds of rock feel different in the hand: one soft blow, three rising ones, one that bounces off. A row of sandstone plays a small tune, because each block's tinks start from a pitch that follows its place in the hill. Random pressing always digs something or rings something, nothing is punished, and the cave that is left is the child's own drawing in rock, kept as dug (pack: game-design, toy-first.md).

## The object-by-action grid, and what is new on day 15

Six kinds of thing in the hill by five things that can be done to them. The first column is the finger itself; in the other four the mole uses the tool he holds on the block the held finger points at. The pick is always in his paws, and it does the digging whenever the tool he holds has no use left: a bucket that already holds something scoops nothing more until it is tipped out. The wedge, the bucket and the rope lie on the grass at the top of every hillside, in the same three places, from the first moment: nothing is earned, bought or made better. A tap on a tool sends the mole to fetch it; a tap on the mole knocks his hat over his eyes, as it does when his paws are empty, and makes him set it down where he stands (tapped in the middle of a step or of a blow he gets the hat only, and keeps the tool), where it lies until it is fetched again; if another tool lies there already, he takes that one up in its place. The rope a lamp hangs on is not lying there: nothing takes it while the lamp hangs, and another tool may lie on the floor under the lamp. One block holds one tool, in play and in the save: a tool that comes down on a tool lying there (the rope a lamp lets go, a tool set down in a shaft) is heard on it and comes to rest, seen and heard, on the nearest free floor of the dug space, the floor to either side first, and on top of the lying tool where the dug space has no free floor. A lamp whose roof is dug away drops to the floor, and its rope falls too, seen, with its clunk. A gem still in the rock sits in a block of earth or sandstone, glints there and lights nothing. That block answers the finger as the Gem row says and every tool as its ground does, and whenever the block goes, by the pick, the wedge or the bucket, the gem springs free as the Pick cell of the Gem row says. The Wedge, Bucket and Rope cells of the Gem row are for a gem that is out of its block: a finger that lands on such a gem and moves carries it, and a tap on it sends the mole to it with what he holds, the pick included. On such an errand, and on the way to a tool or to the lift, he digs through earth and sandstone with no finger down, since the tap was the child's act, but he never opens a pocket: at a water pocket, a spout or a gas pocket in his way he stops and looks back over his shoulder.

| Thing | Knocked (the finger lands) | Pick | Wedge | Bucket | Rope |
| --- | --- | --- | --- | --- | --- |
| Earth | A dull thump; crumbs trickle off its face | One blow and a soft crunch: it crumbles into clods that roll down the tunnel and are gone | Sinks in to the hilt with a squelch and splits nothing; the mole heaves it out with a pop and sits down hard | Scoops the block out whole with a scrape; tipped into dug space, the earth packs back into a block with a whump, in standing water too, where it takes the water up; a gem that lay there is in the earth again and lights nothing, and any other gem that lay there is pushed out, seen, into the dug block that touches it, the one above first, and lands on its floor with a tik, so no gem ever leaves the hill except by the child's hand; where it has no room (the burrow, a block under a hung lamp), and at a block where a tool lies whatever the bucket holds, the mole shakes his head and pats the bucket, and what is in it stays in | The loop pulls straight through with a hiss of crumbs and comes back holding one worm, which lets go with a plip |
| Sandstone | A dry tok; a thread of sand runs out of it | Three blows, each tink higher than the last and each crack longer; at the third it breaks into slabs with a clatter | One blow splits it along its layers with a clean clack, and the two halves slide apart and drop | Fills with sand with a rasp; tipped out, the sand runs away between the mole's toes with a long hiss and nothing is built | Sawn to and fro across a corner it sings zip-zip like a grasshopper and raises two puffs of sand; nothing is cut |
| Granite | A bright ting; nothing falls, and the dust bounces off | A clang and sparks: the pick is turned aside onto the next block round, and the mole judders from hat to toes | Three mallet blows, each ring lower than the last, then a boom: the block cracks free of the hill and stands as a loose boulder; a boulder that is already loose only rings to the mallet | The bucket bangs on it like a gong, bong, and the mole's teeth go on rattling | A loose boulder is tied with a creak and hauled one block toward the mole at each heave with a grinding rumble, and over a drop it falls and lands with a thud; on granite still in the hill the rope goes taut with a twang and flips the mole on his back |
| Water pocket | A hollow glug; one bead of water squeezes out and runs down its face | Breaks open with a gush: the water runs down whatever was dug and comes to rest in the lowest place it can reach, and the mole in its way is soaked and shakes himself dry, flap-flap-flap | Makes a spout: a thin jet squeaks into the mole's eye, then settles to a slow drip, plink, plink, that keeps the dug space under it wet and floods nothing; over a block that is not dug the drop runs down the spout's own face, so a spout is never still and silent | Standing water fills the bucket with a bloop and slops as it is carried; tipped out it lands with a splash and runs down from there. Held to a pocket that is still shut, one drop falls in with a plip | The rope's end bobs on standing water, bip, bip; pulled in it is heavy, and the mole wrings it out over his own feet with a trickle; on a pocket that is still shut, or on a spout, the rope's end slaps its wet face with a plap |
| Gas pocket | A hollow hoot, like breath across a bottle; a wisp curls out | Bursts with a whoomph and lifts the mole up the dug space above him to the roof, where he hangs singed and cross | Makes a vent: one long whistle that falls like a kettle taken off the fire while the gas leaks away, and an empty hollow is left | Catches the gas with a long fff and floats up like a balloon with the mole hanging from the handle; at the roof it tips and lets the gas go with a burp | The rope's end pushed into the crack stands up stiff, sways like a charmed snake and hisses until it is pulled away |
| Gem | In the rock it rings one clear glass note (low for red, middle for green, high for blue) and flashes its colour for a blink in one soft round bloom that spills over the blocks round it; lying free it rings the same note and lifts under the finger, to be carried and set | Its block breaks and the gem springs free with a rising ping, bounces twice, tik, tik, and lies shining; struck when free it chimes and spins and its light swirls round the walls, and it never breaks | Prises a set gem out of the wall with a pock; it pops out, dings off the mole's hat and lies on the floor, still shining | Scooped in with a clink and a rattle, it makes the bucket a lantern whose light goes only upward, as far as the roof | Tied with a creak and hung from the roof, it is a hanging lamp that swings when the mole walks under it |

**The wrong use of each thing works and is funny.** The wedge in earth, the bucket on granite, the rope in a gas pocket, the pick on a free gem: each row holds at least two uses that get nothing done and are worth doing for the mole's face. No cell is silent, the one refusal there is (a bucket with nowhere to tip) is the mole's own answer, and none costs anything: a tool is never bent, lost or used up, and the mole is bewildered and never hurt.

**A gem is a lamp, and the rest follows from three rules that never change.**

- **Light.** A gem lights the dug space round it as far as two blocks along the tunnels. Rock and loose boulders stop it; water does not. A gem set in a wall, lying on the floor or hung from the roof lights the same; a gem under standing water lights one block; a gem in the bucket lights only upward. The child's finger carries a free gem and lets it go, and its light goes with it: it lights the dug space round the block it is carried over, as it would lying there, and nothing while it is over rock or the grass, and who lives where waits until it is let go, since a carried gem is saved where it was picked up: next to a wall it sets in the wall with a tock and stays, in open space it drops to the floor with a tik, and it can be carried off again at any time. The gem is drawn a little above the finger, and the block it is drawn in is the one it lights and the one it is let go in. Let go where it cannot lie, it is seen and heard going where it goes: on a floor where a gem already lies it lands on that gem with a tik and comes to rest beside it, on the floor of the dug block to either side, with a second tik; over rock it drops with its tik into the dug block under it or to either side; over the grass it drops down a shaft that is open under it; and where it has none of these it flies back in an arc to where it was picked up and is heard arriving, with a tik on a floor and a tock in a wall or on its rope.
- **Mixing.** Where the light of two gems of different colours falls on the same dug block, the block shows the colour that light makes: red and green give yellow, green and blue give cyan, red and blue give magenta, and all three give white. This is how coloured light adds, and the game keeps to it everywhere.
- **Wet.** A dug block that water has run through or stands in is wet and stays wet for as long as it is dug: earth packed into it, or a boulder that comes to rest in it, takes the wet with it, and the block is dry when it is dug again. A boulder is never hauled into standing water: the mole strains and it stays where it is.

**What moves in** depends on the light and the wet of a place and on nothing else, the same every time ("The characters and their fixed tastes" has the table): bats only in the dark, glow-worms in blue, mushrooms where red light meets wet, and nine more. Nothing lists them, counts them or shows an empty place for one (pack: game-design, hidden-never-counted.md).

**On day 15** the child is gardening with light. Three gem colours, water and dark give a dozen kinds of dweller, and the child builds their places side by side: a blue gallery of glow-worms next to a dark roost that a hauled boulder keeps dark, a spout over a red lamp for mushrooms, a white wet corner for the one flower. The child has learned to leave walls standing, because a hill dug hollow is one room that one lamp floods; to open a gas pocket with the wedge when the blast is not wanted and with the pick when it is; and to move a wall with the wedge and the rope and a pool with the bucket. None of that is new content: it is six things by five actions, three colours of light, and wet (pack: game-design, depth-from-combinations.md; pack: game-design, liveliness-from-causing-and-comedy.md).

## The representation

The game has no learning goal, so no school idea is represented and no order of object, picture and symbol applies.

## The four mechanic questions

The game has no learning goal, so the four questions about a school skill in the mechanic do not apply.

## The error as a consequence

Nothing in the game is a task with a right answer, so an error is a result the child did not mean, and each one is something the hill does.

- **Granite in the way.** The pick is turned aside with a clang, and the mole stands juddering in front of the block that stopped him. The block is still there, charcoal dark and plainly harder than what is round it; the child goes round it, or fetches the wedge.
- **A gas pocket opened with the pick.** The blast carries the mole to the roof, and he hangs there singed. The soot stays on him until water washes it off, so the cause can be read on him for as long as the child likes. Nothing is lost: the hollow is open, and the mole climbs down at the next touch.
- **A water pocket opened above a place the child had built.** The water runs down the dug space and stands at the bottom, the blocks it ran through are wet, and whatever lived there dry moves out while what lives there wet moves in. It shows where (the wet shine on those blocks) and why (the open pocket above them). The child cannot dry a block; the child can carry the water further with the bucket, dig a drain under it, or build that place again elsewhere.
- **A lamp set where the dark was wanted.** The bats of that roost flap off at once, squeaking, to the nearest dark there is along the dug space, and draw back into their own roof where they hang, growing smaller, if no dark can be reached. Their leaving starts at the blocks the light now reaches. Pull the gem out again and they are back.
- **A hill dug hollow.** Light runs everywhere and the dwellers thin out to one or two kinds. The cave stays as dug. Earth carried in the bucket builds a wall again, a loose boulder closes a gap, and the lift is there for a fresh hillside.

In every case the state stays, the child changes one thing and sees the difference, and the consequence is about the hill and never about the child: no buzzer, no cross, no face turned to the child, no praise and no sound that means wrong (pack: game-design, errors-show-as-consequences.md).

## The designed order, and what is stored

**The order is laid out in space, and the child chooses how far to go.** A hillside is 13 blocks wide and 7 deep, with the mole's burrow at the top. New things come one at a time with depth: the top row is earth; sandstone begins in the second row; water and gas pockets lie from the third row down; granite begins in the fourth row, in lumps; gems lie from the second row down, the lower ones behind granite or beside a pocket. A harder thing looks harder in the world: granite is charcoal dark beside red earth and yellow sandstone, a pocket sounds hollow to a knock before it is opened, and every gem glints in its block from the start, so a gem behind granite can be seen to be behind granite. Nothing is hidden by luck, and nothing opens by amount of play.

**The two places in the order.** The ids are as they stand in `LADDER` in `config.ts`; each names a kind of hillside in the game's own order.

| Id | The hillside | The one new thing |
| --- | --- | --- |
| `near` | Under the burrow lie, in this order, earth, a red gem in earth, sandstone and granite, with one water pocket and one gas pocket in the third row to either side; the rest of the hill is laid by the general rule above | each kind of ground and the first lamp are met in the first minutes, one after the other, straight down |
| `wild` | The whole hill is laid by the general rule from the hillside's seed | finding the way is the child's own |

Every hillside of either kind holds three gems of each colour, three water pockets, three gas pockets, three or four lumps of granite and two natural caverns, and the three tools on the grass.

**What a first visit starts with, by age.** `near` for a child of 8 or younger and for no age; `wild` for a child of 9 or older. A saved game wins over the age.

**What play changes.** A cycle is one hillside, from the mole standing in a fresh burrow to the ride on the lift. Nothing judges a cycle: there is no cycle that goes badly or is mixed. Every ride moves the stored position on from `near` to `wild`, where it stays, and nothing moves it back. It moves when the ride starts and never inside a hillside. Nothing on screen shows it. Which hillside comes next is not a customer who waits: the fresh hillside is laid from the position as it stands when the ride starts.

**What is stored.** Small plain JSON under one version number, read field by field.

- `v`: the version.
- `position`: `near` or `wild`.
- `finished`: always false in a save, since the touch that ends a hillside begins the next.
- `seed`: the whole number the hillside on screen was laid from.
- `cells`: the hill as it stands, one mark for each of its 91 blocks: earth, sandstone, granite still in the hill, a loose boulder, a water pocket, a spout, a gas pocket, a gem in its block by colour and by the ground that holds it (earth or sandstone), or dug.
- `hits`: for each block, the blows it has taken that have not yet broken it or cracked it free: none, one or two.
- `wet`: for each block, whether it is wet.
- `water`: for each block, whether water stands in it.
- `gems`: every gem that is out of its block, each with its colour, the block it is in and how it rests there: set in a wall, on the floor, hung on the rope, or in the bucket.
- `mole`: the block he is in (or the grass above a column), whether he is sooty, whether he is in the lift's cage, which tool he holds, and what the bucket holds: nothing, earth, sand, water or a gem. Gas is never in a save: the bucket lets it go at the roof within the act that caught it.
- `tools`: for the wedge, the bucket and the rope, where each lies when the mole does not hold it, and for the rope what it is tied to.

Light and the dwellers are not stored: both follow from `cells`, `wet`, `water` and `gems`, so they are the same on load. Chips, dust, the sprayed hand shapes on the wall, a creature's start and a mole's pose are short-lived and gone on load. A block half dug is found half dug. A gem in the child's hand is saved where it was picked up; a mole on his way is saved in the block he last stood in. No clock is read. The largest legal state is far below half of the 64 KB cap, and a test says so.

(pack: game-design, ordered-challenges-high-success.md; pack: game-design, the-world-keeps-and-waits.md)

## The characters and their fixed tastes

**The mole** is the digger, the child's hands in the hill. His one want is always visible: he looks at the finger, or at the place it last pressed, with his pick up. He is round, short-sighted and proud of his hat.

- He likes earth (his nose twitches as it crumbles) and the dark.
- He cannot stand granite (he shakes the sting out of his paws), gas (he comes off the roof with his ears flat and glares at the hollow) and white light (he pulls his hat down over his eyes for as long as he stands in it).
- Water makes him shake like a dog, and washes the soot off.

**The mammoth** keeps the lift at the top of the hill. Its one want is always visible: its trunk rests on the crank, and one eye is on the cage. It never winds unasked, never hurries anyone and has no feelings about waiting. It is huge, slow and shaggy, and it feels everything that happens under its feet.

- It likes water: a bucket of water tipped at its feet is drunk up the trunk and blown back over the mole. A tap on the mammoth while the mole holds a bucket of water sends him to tip it there.
- It cannot stand a clang (its ears clamp down and its tusks rattle) or the smell of gas (it ties its trunk shut in a knot until the wisp is gone).
- A blow under its feet lifts the foot above it; a break makes it look down between its legs.

**The dwellers** each have one want, the place they live in, and they show it by being there. The table never changes, so a child can learn it and test it on purpose.

| Light on a dug place | Dry | Wet |
| --- | --- | --- |
| None | bats, hanging from the roof | pale newts |
| Red | lizards, basking | mushrooms |
| Green | beetles | ferns with a frog |
| Blue | glow-worms on their threads | snails with lit shells |
| Yellow (red and green) | moths round the lamp | moths round the lamp |
| Cyan (green and blue) | dragonflies | dragonflies |
| Magenta (red and blue) | spiders at their webs | spiders at their webs |
| White (all three) | nobody | one flower, and never more than one in a place however large it is |

- A place is the dug blocks that touch each other and have the same light and the same wet. A place of two blocks or more is lived in: one dweller, and one more for every three blocks beyond that. A dweller takes a block of its place that is free for it: none takes a block where a gem or a tool is, one that hangs from the roof needs rock over its block, one that stands on the floor needs ground under it, and no dweller but a newt takes a block where water stands, whatever the light. A place with no such block is empty, a lit place that is all pool among them.
- When a place changes, its dwellers leave in their own way (bats flap off squeaking, lizards run, a mushroom shrinks back into the floor with a pip) and the new ones arrive in theirs. This happens every time, at once, and for no other reason.
- Each kind moves like itself and answers a finger with its own start and sound. Their feelings are about light, wet and noise: bats wrap their wings tighter at every tink and are blown off the roof by a blast; nobody in the hill reacts to the child stopping, leaving or coming back.

**The reactions are the feedback.** The mole's face and body, the mammoth above and the dwellers moving in and out say what the child's digging, water and light did. Nothing else rates it.

(pack: game-design, characters-with-opinions.md)

## The scenes

Each scene is a list of timed beats filled in from the state of play, built on `scene.ts`. Its outcome is saved when it starts. Any touch ends it at once with everything where the scene was taking it, and that touch is then an ordinary touch. A scene that the end of another sets going (water that a blast let go) is ended by the same touch, and nothing of it sounds.

**The blast** (about 5 seconds). *Cause:* the pick opens a gas pocket. *Beats:* the face of the pocket blows out with a whoomph, and a boulder, a gem or a tool that rested on the pocket falls as it opens, seen and heard; the mole shoots up the dug space above him and meets the roof; he hangs there spread out, black with soot, his hat smoking; he blinks twice; his ears go flat and he glares down at the hollow. Above, the mammoth's fur stands on end and it knots its trunk; whoever lives in his shaft or beside the pocket is blown off its place: it spins, is gone within a tenth of a second so that he never passes through it, and comes out again about a second and a half later. *Filled in from:* how far up the dug space goes (with rock straight above him he is pressed to the roof of his own block), and who lives along the way. *Saved at the start:* the pocket as dug in `cells`, and in `mole` the block under the roof and that he is sooty.

**The run** (4 to 8 seconds). *Cause:* the pick opens a water pocket, a bucket of water is tipped out, or a block beside or under standing water is dug, split, scooped or hauled away. *Beats:* the gush, and a boulder, a gem or a tool that rested on an opened pocket falls as it opens, seen and heard; the water runs down the dug space block by block, each with a glug a little lower than the last, and after fifteen blocks the scale begins again from the top, so no two glugs that follow each other have one pitch; a mole in its way is carried one block along and soaked; a boulder, a gem or a tool that the mole or a pool held up falls when he is carried off or the water under it has gone, seen and heard, and water that such a fall lets go runs on in the same scene; the water comes to rest and the pool rocks twice; the blocks it ran through shine; the dwellers of those places change. *Filled in from:* the path the water takes through this cave, and who lives along it. *Saved at the start:* the pocket or the opened block as it now stands in `cells` (or the bucket as empty in `mole`), every block of the path in `wet`, in `water` the blocks the water left as empty and the blocks where it comes to rest as full, and in `mole` the block he ends in and that he is no longer sooty if the water reached him.

**The ride** (about 7 seconds, the ending). *Cause:* a tap on the lift while the mole is in its cage. *Beats:* the cage door clacks shut; the mammoth winds and the crank squeals; the cage rises; every lived-in place of the cave, from left to right, does its own move once, so the cave is seen whole a last time; the hillside rolls away to the left like a hide being rolled up, with a rumble, taking whoever lived in it, and the fresh one unrolls from the right with nobody of the old cave drawn on it; the cage comes down and the mole steps out into the new burrow; a tool he took into the cage is in his paw until the door opens, and lies in its place on the fresh grass from then. *Filled in from:* the cave the child made and who lives in it. *Saved at the start:* `position` moved on, the new `seed`, and the fresh hillside in `cells`, `hits`, `wet`, `water`, `gems` and `tools`, with `mole` in the new burrow, out of the cage, holding only his pick, and the bucket empty; his soot is kept. The cave that is left behind is not kept.

**There are no secrets beyond the grid and the table**, and both work every time.

**How a cycle ends and the next one starts.** The lift stands at the top left of every hillside with its cage open, and the mammoth beside it with its trunk on the crank. The mammoth stands clear of the cage: a tap on the mammoth gets its own start and is never taken for a tap on the lift. The grass line lies below the jam's home control at the top centre, so the burrow, the lift and the three tools are never under it; under it is only painted wall, which asks for no touch. An overlap test holds this on every surface from 320 px in each direction for the lift, the mammoth, the molehill and the tools where a fresh hillside lays them, and on every surface a tablet gives or that is at least 460 px high for the mole standing anywhere on the grass; on a phone held on its side the mole on the grass over the burrow stands under the control. It is the next thing that waits, and it waits in plain view without a sound. Once the mole is in the cage and the child is idle, the idle ladder's glow sits on the rope the cage hangs by, and in place of the ghost hand the mammoth shows the move: it looks at the rope and taps it twice with its trunk, without a sound, and winds nothing. A tap on the lift calls the mole up, and he climbs into the cage; a touch anywhere in the hill and he climbs out again and goes back to work. Only a second tap on the lift, with the mole in the cage, starts the ride, so one stray tap never takes a cave away. It starts when the finger lifts: a hold or the start of a drag on the lift starts nothing. In the cage the mole is part of the lift, so a tap on him there is that tap on the lift and does not knock his hat. If the child does nothing, nothing starts, and there is no countdown. On load nothing replays: the hill is as it was left, the mole in his block or in the cage, and a game put away during the ride is found on the fresh hillside with the mole in his burrow.

(pack: game-design, endings-and-short-scenes.md; "How a cycle restarts" in the guide)

## The records

The game has no learning goal: it is designed from no record of either jurisdiction and claims no school skill.

## The look

Written after the style spike, not part of the sheet.

**Ochre on rock**, the first look reserved for the game. The whole frame is one cave wall, and everything on it is pigment rubbed on by hand: the hill, the mole, the mammoth, the lift and everyone who lives in the hill are paintings that move. The spike passed on clarity (stills at 1180 by 820, see `REFINEMENT.md`) and the look was accepted at the toy, so the second reserved look was not tried.

### Palette

Four pigments and the rock, all in `pigment.ts`. What the game added to them is in `figures.ts` and is listed under them.

| Material | Where | Colour |
| --- | --- | --- |
| Rock | The wall behind everything, light and dark in soft bulges; the bare wall a rolled-up hillside leaves | `#c9b08a`, with `#dcc7a2` and `#9c8160` |
| Red ochre | Earth, the mammoth, the red beasts, the sprayed hands, the rolled hide | `#a8431d`, deep `#7b2c12`, pale `#c8683e` |
| Yellow ochre | Sandstone, the mole's hat, the lift's cage, the bucket, the rope, the butt of the wedge, one beast | `#d79c34`, deep `#a66f1c` |
| Charcoal | Every outline, granite, the lift's frame, the wedge, one beast, the grass | `#2b211b`, pale `#584a3f` |
| White clay | The mole, tusks and eyes, the specks in granite, the rim of a dweller in the dark | `#f1e8d3` |
| Dug space | Charcoal rubbed in until the rock is gone, with the pick's marks left pale in it | `#1a120e` |
| Flame | The candle on the mole's hat | `#ffc84a` |
| Gems | The only saturated colours in the frame, which is why the wall holds none | red `#e8452c`, green `#57c44a`, blue `#4a8df0`, each with a deep and a pale of its own |
| Gem light | Laid over dug blocks, one colour for each of the seven mixes | red, green, blue, yellow, cyan, magenta and a warm white, as `LIGHT` in `figures.ts` has them |
| Water | A pocket's damp stain and beads, standing water, drops, the wet shine | `#8fb6bd`, deep `#4f7f8c` |
| Gas | A pocket's sallow face with its dark slit, the wisp | `#c9c680` |
| Leaf green and azure | The fern, the frog, the stalks; the dragonfly | `#718c3c`, deep `#48632a`; `#5d93b5` |

A bat's fur is a warm grey mixed from charcoal and clay (`#7d6a5b`, wing `#93806f`, face `#c4a57c`), so it reads against the dark it hangs in. The mole when sooty is the same clay under charcoal. A colour outside this table and its mixes is a fault.

### Materials

- A shape is filled, outlined with a charcoal line drawn twice a little apart (a stick of charcoal, not a pen), and then worn through a grain so the rock shows in specks. Earth is worn most, granite less, the characters least, so they stay sharp.
- Earth is a red patch with finger dots and one scratched line. Sandstone is yellow with the layers it was laid down in, and the pick's cracks are charcoal lines that grow with each blow. Granite is thick charcoal with clay blown over it in specks, and a loose boulder is the same with a rounder edge. A water pocket is earth with a damp stain and two beads of unequal size; a gas pocket is a sallow patch with one dark slit. A spout is a water pocket with the wedge's hole low in its face, and a drop swells there every few seconds: it falls to the floor of a dug block under it, or runs down the wet under the hole when rock is under it. A wet dug block has a shine along its floor and three runs of unequal length down its back wall, all leaning one way. Split by the wedge, a block of sandstone is drawn for half a second as two halves that part and sink to the floor of their own block. A block's edge is uneven and the wall shows between blocks: the hill is painted block by block, not tiled.
- A gem in the rock is a cut stone half sunk in its block. Out of the rock it is the same stone with a halo added over what is behind it.
- The tools look like tools: a dark wedge with a wooden butt, a bucket with a handle, one hoop and three staves of unequal length that stop above the hoop, a rope in one lopsided heap with a frayed end. Each lies on the grass or on the floor of a dug block, and is carried in the mole's near paw with the pick on his far shoulder.
- The lift is a frame of two posts and a beam with a wheel, a cage of withies that hangs in it, and a crank the mammoth's trunk rests on.
- The wall above the grass line is filled with what such a wall holds: a herd of six beasts in the four pigments (the two with manes have bristles uneven in length, lean and spacing), arcs of finger dots, hands sprayed in red, cracks. None of it can be dug. A finger on it leaves a sprayed hand that fades. No painted hand lies in the top right corner, which answers no finger of the child's. Three of the beasts have heads that turn to look down at the mole when he passes under them.
- In the undug hill a few worms look out of their earth and pull back in when it is struck or the mole comes near. A worm's three rings are bowed and of three lengths; a dragonfly's wings are swept back toward its tail.
- A hillside is a hide: at the ride it is rolled up to the left on a roll of red ochre with a pale band down its lit side and a pale cut end, the bare rock shows behind it, and the fresh one is unrolled.
- No gradient but the soft bulge of the rock, the round fill of a block, the round of the rolled hide and the halo of a light; no gloss, no drop shadow.

### Lighting

- The wall is lit evenly from the front, darker toward the corners, as a wall is by a lamp held up to it. This shading is painted once and laid over the hill.
- The candle on the mole's hat throws a warm pool about two blocks wide that goes with him and flickers.
- A gem's light is a flat wash of its colour, or of the mix, over each dug block it reaches, painted into the hill when a block changes. A gem under a finger, struck free or chiming flashes for a moment as one soft round bloom of its colour, wider than its block and with no edge: knocked in the rock the bloom swells over its block and fades, struck free it goes twice round the block. It is never a set of lit squares.
- A gem in the child's hand takes its light with it: the wash lies on the dug block the gem is over, and on none while it is over rock or the grass.
- The idle guidance is a pale glow round one block, and after it a hand of white clay that presses there; the hand's two knuckle creases are bowed, of unequal length and lean different ways. When the mole looks back over his shoulder he stands turned round toward the child for about a second. With the mole waiting in the cage the glow sits on the rope the cage hangs by, and no hand comes: the mammoth shows the move.

### Motion

- A painting moves in parts, each part a sprite turned about a joint: nothing is redrawn, bent or blurred. Squash is small and quick, as of a figure cut from hide.
- The mole leads with his nose. Every act has its moments on the game's clock (`ACTS` in `game.ts`), and his paw is at its far point at each one, where the sound is. On granite the pick shakes, his hat drops over his eyes and he lifts it again. A prised gem flies to the crown of his hat, strikes it as the ding sounds, and drops from there. With a bucket that has nowhere to tip he shakes his head and hugs it in. A rope tied to a boulder hangs slack from his paw to it between heaves. The rope of a lamp stays at its hook, slack, while the child carries the gem. On the ride what he took into the cage stays in his paw until the door opens. At rest he sniffs, wipes his brow or tips his hat, and his eyes follow the finger. Under a hung lamp he ducks and the lamp swings.
- The mammoth is slow and heavy: an ear flaps, the trunk curls, a foot shifts. A blow under a foot lifts that foot, a break makes it look down between its legs, a clang clamps its ears and rattles its tusks, gas ties its trunk in a knot, a blast stands its fur on end. One eye stays on the cage. A tap makes it raise its trunk. With the mole waiting in the cage and the child idle, it looks at the cage's rope, reaches its trunk over nearly straight and taps the rope twice, and the cage bobs at each tap.
- Each kind of dweller keeps its own time (`MANNER` in `cast.ts`): how fast it comes and goes, how often it does one of its three idle moves, how long its start under a finger lasts and how far off a noise makes it flinch. A dweller in the mole's way draws back into the rock it holds to, and comes out again when he has gone. A bat that the light drives out flies along the dug space toward the nearest dark, growing smaller, for a block and a half at most; with no dark to reach it stays where it hangs and draws back into its own roof, and no bat rises over the grass line. The worms pull in when the crank squeals and stay in while the hide is rolled.
- Chips fly from the face that was struck, fall and stay inside the dug space. Dust is one puff a blow. Water that sounds is seen: a bead down the face of a shut pocket and a splash at the bucket for its one drop, drops off the rope at his feet when it is wrung out.
- Whatever is let go is seen all the way to where it rests and heard arriving. A gem falls from where it was drawn, lands on a gem that lies there and rolls off beside it, or is thrown back in an arc, higher the further it has to go. A tool that comes down on a tool is heard on it and hops off, sideways first; one that has to stay on it sits on its top. A gem freed over a drop falls from the block it sprang out of. The rope of a lamp that is in the finger or flying back hangs slack at its hook. Earth packed onto two gems throws one out in the same arc.

### What each tier keeps

The look does not change with the tier: the same sprites, cut at the tier's pixel ratio. Tier 0 draws at ratio 2 with nine chips a blow, tier 1 at 1.5 with seven, tier 2 at 1.25 with five, and tier 3 at 1 with three chips and no dust. The wall, the hill as dug, the light on it and the shading are one picture, repainted only where a block changed and stamped whole once each frame; a whole repaint happens at the first frame, at a resize and at the fresh hillside of a ride.

### Registry row, a request to the lead

For `docs/art-direction.md`, claimed styles: Gem Miner | Ochre on rock | A cave wall painted in red and yellow ochre, charcoal and white clay, worn through a grain so the rock shows; the gems and their light are the only saturated colours, and a hillside is a hide that is rolled up | `games/gem-miner/ART.md`
