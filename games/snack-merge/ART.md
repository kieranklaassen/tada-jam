<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 5 to 9, and its youngest age, five, governs the design.

- **The cue-table row.** The row for a youngest age of 5 to 6 in the wordless-clarity convention. Its "Avoid" column binds the game: no word or letter, no numeral or symbol (the band starts at 5), no voice instruction, and no hint that gives an answer. More than one thing may be live at once: the rail, the shelf, the counter and the jar's handle all answer from the first frame, and each has one clear function.
- **The pack's rule for the range** (pack: game-design, ages-4-to-6.md). Tap and drag only, no double tap, no reading. The game supplies a place, props and characters who react, and the child supplies the plot: by week three a child is making a terrible snack on purpose for one monster. It is funny through wrong things put together, mild naughtiness and a monster who overreacts and is never hurt. For the top of the band the system is real and stays the same (pack: game-design, ages-9-to-12.md): a pair always makes the same snack and a monster always answers a thing the same way, so what a nine-year-old works out stays true.
- **The symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, and the game has no `symbols.ts`. The rule follows the manifest band: a nine-year-old sees none either.
- **What `ctx.childAge` sets.** Only how a first visit opens (see "The designed order, and what is stored"). For a child of 6 and younger, one bread already lies in the middle of the jar's floor and a cheese hangs from the claw, so the first let-go over it makes the first toastie. For a child of 7 and older the jar is empty and a bread hangs from the claw. A saved game wins over the age. Age locks and hides nothing: all six things are on the shelf for every child from the first frame.
- **What no age gives.** `null` opens a first visit as for the youngest child: the bread in the jar and the cheese in the claw.

## The toy

**The action.** Slide the snack that hangs from the claw along the rail and let go. That is the touch the finger performs most: one touch is one drop.

**In an empty scene.** A glass jar stands on a counter with a rail over it, and a claw on the rail holds one snack. Nothing asks for anything. The rail runs below the jam's round home control at the top centre, and the claw is never itself a target: the finger lands over the jar. The six things on the shelf, the jar's handle, the four places on the counter, both monsters, the mouse and the lamp lie clear of that control. Nothing the game brings to rest (a thrown-out snack on its place, the seated monster, the monster at the window, the paper bag, the mouse) covers the shelf, the handle, a place on the counter or the space over the jar, and a tap on one of them is never taken for a target behind it. An overlap test holds this at a surface of 1180 by 820 and at every other size the game's tests name.

- When the finger lands anywhere over the jar, in that frame, the claw starts for the finger with a zip and the snack swings out behind it and gives its own sound (the first column of the grid). A finger that moves carries the claw with it, and the snack swings, wobbles, drips or stays stiff as the thing it is.
- When the finger lifts, the claw opens with a click and the snack falls from where the claw is. A tap is a slide and a let-go in one: the claw whips over to the finger and lets go there.
- The snack lands as the thing it is (the second column): it squashes and springs back, shoves what it lands on, and sugar dust jumps off it. The pile shifts and settles.
- When it touches a snack it can join, the two squeeze together and pop into the one snack that pair always makes, which swells up past its size and settles, shoving its neighbours. If the new snack now touches another it can join, they pop too, so one let-go can set off a chain.
- When it touches a snack it cannot join, the two bump as the third column says, and both stay.
- After a let-go the claw takes the same thing from the shelf again, so a child can drop one thing after another without choosing. A tap on any of the six things on the shelf sends that thing to the claw. What hung there goes back: a snack of two or three things to a free place on the counter (the place it left is still free), a single thing to its tray on the shelf. The same holds when a tap on a snack on the counter hangs that one under the claw.
- A jar filled over its rim burps its top layer out onto the counter and has room again.

**Why repeating it is a pleasure with no goal.** The answer starts when the finger lands and is bigger than the touch: a zip, a swing, a fall, a squash, a shove through the pile, a pop into something new, and a chain when the child laid things for one (pack: game-design, touch-answers-bigger-than-the-touch.md). Random tapping fills the jar with snacks nobody planned, and nothing a finger can do is punished: the simplest use, a tap over the jar, always drops a snack (pack: game-design, toy-first.md). The same let-go also makes things: what lies in the jar is the child's own pile, and it is still there on the next visit.

## The object-by-action grid, and what is new on day 15

**The six things on the shelf**, in shelf order: bread, cheese, egg, chilli, jelly, ice. Each is a soft sweet in that shape with a face of two eyes and a mouth and nothing else on it.

**The one rule of joining.** Two snacks that touch join when they share no thing and hold at most three things between them. The new snack holds the things of both. It is the same snack however and in whatever order it was made: bread dropped on cheese and cheese dropped on bread are the same toastie. So there are fifteen snacks of two things and twenty of three, forty-one with the six alone, and a snack of three things joins nothing more.

**Six things by five actions.** Every cell looks and sounds different.

| Thing | Slid along the rail under the claw | Let go and landed | Touches a snack it cannot join | Joins another snack: what it gives the new one | Burped out onto the counter |
| --- | --- | --- | --- | --- | --- |
| Bread | Hangs heavy and hardly swings; the claw's chain gives one slow creak | Lands flat with a pomf, squashes wide like a cushion and rises slowly; a puff of sugar dust | The two bump like pillows with a pfumf, and the one that arrived flops onto its side and yawns | A crust: the new snack is a slice the other things lie on or in. A dry crunch | Sails out slowly like a thrown cushion and lands on its back with a flump |
| Cheese | Swings wide and rubbery, and squeaks at the end of each swing | Lands with a boink and bounces once more, higher than anything else does; its holes stretch | Bounces off with a high squeak, twice, like a rubber ball, and rolls on until the glass or another snack stops it | A yellow band that oozes out at one corner and drips. A stretchy schlorp | Shoots out highest of all with a long squeal and bounces twice on the counter |
| Egg | Its yolk slides to the side it is coming from, and goes blup at each change of direction | Lands with a splat, its white spreads flat as a pancake and gathers itself up again; the yolk bobs | Slips off the other like wet soap with a slurp and ends up lying beside it | A yolk on top that bobs when the snack moves. A plip | Flips out like a tossed pancake with a flap, flap, and lands splat |
| Chilli | Hangs sizzling with a thin hiss, and a thread of smoke trails behind it | Lands with a short tsst and a spark, and a wisp of smoke rises from where it touched | The snack it touched jumps with a yip and a puff of smoke; the chilli sniggers with two short hisses | Fire: scorched red-hot edges, and from then on the snack breathes a small flame with a fwoosh every few seconds | Rockets out on a jet of flame with a rising whistle and leaves an arc of smoke |
| Jelly | Wobbles all the way, lagging behind the claw and catching up, with a boing whose pitch follows the speed | Lands with a blub-lub-lub and goes on wobbling for two seconds | Sticks to the other for a moment, peels off with a thp and a pop, and both wobble | Wobble and gloss: the new snack is see-through, has no sugar coat and never quite stops wobbling. A deep blorp | Lobs out slowly, lands with a splodge and jiggles for a long time |
| Ice | Hangs stiff and does not swing at all; cold mist falls from it and it rings like glass with a ting when the claw stops | Lands with a hard tok and no squash, and slides along the floor until it meets something | Clacks off like a billiard ball, and the snack it struck shivers with chattering teeth | Frost: a blue rim, a cap of snow and icicles, and a shiver. A crackle of freezing | Skids out and slides along the counter to its place with a long shh and a clink |

A snack of two or three things does each of these as its things do, together: a toastie hangs heavy and squeaks, a frozen jelly wobbles and rings. When two snacks bump, the bump is the one of the first thing in shelf order that both hold; two that share nothing and are only too many together bump as the first thing of the one that arrived.

**The fifteen pairs.** The call of a new snack is a pop and then the joining sounds of its things in shelf order, so each of the thirty-five made snacks has a call no other has, and it calls again whenever it is picked up.

| Pair | Makes | How it looks |
| --- | --- | --- |
| Bread and cheese | Toastie | Two amber slices with a yellow band between them that oozes at one corner |
| Bread and egg | Egg on toast | A slice with a frilly white and a yolk lying on top |
| Bread and chilli | Fire toast | A scorched slice with red-hot edges that breathes a small flame |
| Bread and jelly | Wobble bread | A see-through, glossy slice that never quite stops wobbling |
| Bread and ice | Frozen bread | A slice under a cap of snow with icicles, shivering |
| Cheese and egg | Omelette | A folded yellow half-moon with holes and a white frill |
| Cheese and chilli | Melting cheese | A sagging wedge with glowing edges that drips and breathes a flame |
| Cheese and jelly | Wobble cheese | A see-through wedge whose holes show what lies behind it |
| Cheese and ice | Frozen cheese | A wedge with frost in its holes and icicles |
| Egg and chilli | Fire egg | A white with a red-hot yolk and a flame |
| Egg and jelly | Wobble egg | A clear dome with the yolk floating inside it |
| Egg and ice | Frozen egg | A white under snow with a yolk like a pale sun, shivering |
| Chilli and jelly | Lava jelly | A red glossy dome with the chilli's stalk on top and a flame |
| Chilli and ice | Steaming ice | The chilli frozen inside the cube, with steam hissing from the top |
| Jelly and ice | Ice lolly | The dome on a stick, frosted |

A third thing is added by the same rule: bread, cheese and egg each add their layer (all three are a tall breakfast stack), and chilli, jelly and ice each add their power (all three are a red lolly that wobbles, flames and frosts at once). A toastie and a chilli are a toastie that breathes fire.

**The wrong use of each thing works and is funny.**

- A thing dropped on its own kind, or on a snack that already holds it, does not join: the third column, one answer for each thing.
- A snack let go beside the others just lies there, and the next one can be laid against it.
- A jar filled over its rim burps: the last column, one flight for each thing, and each snack lands on the counter, where a tap hangs it under the claw again.
- A tap on the jar's handle rocks the jar with a clink and everything in it sloshes to one side and back. Pulling the handle over towards the monster tips the jar into its mouth ("The scenes").
- An empty jar tipped anyway: the monster looks into it with one eye, one grain of sugar falls on its tongue with a tick, and it blinks.
- A snack the monster cannot stand gets that monster's own answer to each thing in it, every time ("The characters and their fixed tastes").
- A poke at a monster, at the mouse or at the lamp is answered by that one in its own manner, and changes nothing.

**On day 15** the child knows what each of the fifteen pairs makes and what each of the three monsters does with each of the six things. It lays three things apart on the jar's floor so that they join in the order it wants, sets off a chain on purpose, and builds one snack of three things for one monster's worst face. On day 1 all of that is found by dropping things and watching. None of it needs new content: it is six things by five actions, one rule of joining, and three monsters with six fixed answers each (pack: game-design, depth-from-combinations.md; pack: game-design, liveliness-from-causing-and-comedy.md).

## The representation

The game has no learning goal, so no school idea is represented in its objects.

## The four mechanic questions

The game has no learning goal, so the four questions about a school skill in the mechanic have no answer here.

## The error as a consequence

Nothing in the game is wrong, so there is no error to mark, and nothing gives a verdict (pack: game-design, errors-show-as-consequences.md). What does not go as the child meant shows in the world, where and why, and the state stays:

- **A let-go that misses.** The snack lies where it fell, beside the one it was meant for, and the gap between them can be seen. The next snack can be laid in the gap, or against either.
- **Two that do not join.** Two that share a thing bump as the first thing in shelf order that both hold, so the bump itself says which thing was in both: bread bumps as a pillow, ice clacks. Two that share nothing and would hold more than three things together bump as the first thing of the one that arrived, and what says why is on the snacks: every thing a snack holds shows on it. Both snacks stay in the jar as they were.
- **A snack joined that the child did not mean.** It is a real snack with its own look and call, it stays, and it can still take what it does not hold yet.
- **A jar that is too full.** The burp throws only the top layer out, each snack lands whole on a place on the counter, and a tap hangs it under the claw again. A snack that already lay on a place that is needed hops into the paper bag and is gone.
- **A snack a monster cannot stand.** The monster's answer is as good to watch as a like and is about the snack, never about the child. The monster is bewildered and never hurt, and it stays until the child calls the next one in.

No sound or mark says wrong, and nothing resets. One thing can go for good: when a burp finds the counter full, the snacks nearest the paper bag hop into it to make room. Any snack can be made again from the shelf by the one rule of joining.

## The designed order, and what is stored

**There is no designed order of challenges.** The order is the child's: what to drop, where, and when to tip. Nothing is locked, nothing arrives by amount of play, and nothing gets harder unasked. `position` names only how a first visit opened, and it never moves: the game judges no cycle as going well or badly.

**What a first visit starts with, by age.**

| `ctx.childAge` | Position id | The jar | Under the claw |
| --- | --- | --- | --- |
| 6 and younger | `bread-in-jar` | One bread lying in the middle of the floor | Cheese |
| 7 and older | `empty-jar` | Empty | Bread |
| `null` | `bread-in-jar` | As for the youngest | Cheese |

On every later visit the saved game wins and the age is not read. Both openings hold all six things on the shelf, the same monster at the jar and the same monster at the window.

**What play changes.** The pile in the jar, the snacks on the counter, what hangs under the claw, and which monster sits at the jar: each tip that feeds a monster is followed, on the child's touch, by the next of the three in a fixed round. Nothing else changes with play, and nothing shows how much was played.

**Every field of the saved state.** Small plain JSON, read defensively: a damaged field takes its default and the rest is kept.

- `v`: the version of the shape, 1.
- `position`: `bread-in-jar` or `empty-jar`, how the first visit opened. Never moved.
- `finished`: true from the moment a tip that feeds starts until the next monster is called in. That tip leaves `jar` empty; a snack dropped after it is in `jar` like any other, and a tip while it is true feeds the same monster again and writes `ate` anew.
- `jar`: the snacks lying in the jar, at most forty, each with `k` (which of the six things it holds, one to three of them), and `x` and `y` in stage units to one decimal, at rest. A snack at rest lies upright: a flop onto its side, a roll or a landing on its back is a moment's motion that ends upright, and no field holds a tilt. A snack in the air is never saved in the air: the save made at the let-go holds the pile as it comes to rest with that snack in it, joined if it joins. Where that pile stands over the rim, the same save holds the burp's outcome too (`jar` without the top layer, `counter` with it), so a game put away during the fall is found after the burp and no burp plays on load.
- `claw`: the snack hanging under the claw, as its `k`.
- `pick`: which of the six things on the shelf the claw takes after a let-go, 0 to 5.
- `counter`: the four places on the counter, each a snack's `k` or empty.
- `seat`: which of the three monsters sits at the jar, 0 to 2. The monster at the window is always the next in the round, so it has no field.
- `ate`: what the monster at the jar was given in the last tip, as a list of at most five mouthfuls, each a `k`; empty until a tip and again when the next monster comes in. The ending pose is rebuilt from it on load.

A largest legal state is under two kilobytes. A snack that went into the paper bag is gone and has no field; the bag settles back and shows nothing of it.

## The characters and their fixed tastes

Three monsters come to the jar in a fixed round. One sits beside the jar, large, with its open mouth at the rim: that is its one want, always visible. The next one presses its face to the shop window and watches, with its mouth open too. Each has six answers that never change, one for each thing, so a child can learn them and test them on purpose. A snack of two or three things gets the answers to all its things at once (pack: game-design, characters-with-opinions.md).

**Mumf** (the first at the jar). A shaggy plum-coloured heap with an underbite and two bottom teeth. Slow and heavy; its funniest part is its lower jaw, which hangs, chews sideways and drops open.

| Thing | Mumf's answer |
| --- | --- |
| Bread | Chews slowly with both cheeks bulging and hums; crumbs fall from its jaw |
| Cheese | Cannot stand the smell: it pinches its nose shut with two fingers, its ears droop and it honks through the pinched nose |
| Egg | Its pupils turn into two yolks that slide about, and it drools with a long gurgle |
| Chilli | Loves it: it breathes one long slow flame with a roar, the tips of its fur smoke and its toes curl |
| Jelly | Its whole body wobbles out of its control like a jelly, with a deep wub-wub, and its eyes swim |
| Ice | The worst: it turns blue from the top down, its teeth chatter and an icicle grows on its nose with a creak |

Mumf's worst face is a wobbling frozen cheese: blue, nose pinched, teeth chattering and the whole heap wobbling.

**Pib** (the second). Tall, thin and mint green, with a long neck and two eyes on stalks. Quick and twitchy; its funniest part is its neck.

| Thing | Pib's answer |
| --- | --- |
| Bread | Bored: it chews twice, its eye stalks droop and it yawns with a squeak |
| Cheese | Loves it: its neck shoots up to half as long again with a rising squeal and the stalks twirl |
| Egg | Hiccups: a lump runs up its neck and down again with each hic |
| Chilli | Cannot stand it: steam whistles out of both eye stalks like a kettle, the neck turns red from the bottom up and it fans its mouth |
| Jelly | Its neck goes wavy like a noodle and it giggles in quick high steps |
| Ice | Loves it: frost sparkles on its stalks with a tinkle, it sighs out a small cold cloud and slides down in its seat |

Pib's worst face is a fire egg on toast: red neck, whistling stalks, hiccups and a yawn in the middle.

**Oon** (the third). A wide, flat, orange blob with three eyes and a very long tongue. Sleepy and heavy-lidded; its funniest part is its tongue.

| Thing | Oon's answer |
| --- | --- |
| Bread | Falls asleep in the middle of chewing, with a snore and a bubble that swells from its nose and pops |
| Cheese | Its tongue pulls out long like a string of melted cheese and twangs back |
| Egg | Its three eyes open wide one after the other, with three clucks |
| Chilli | The worst: all three eyes spring open, it shoots straight up off its seat with a shriek, and a flame flickers on the tip of its tongue |
| Jelly | Loves it: it melts into a wide wobbling puddle and purrs |
| Ice | Its tongue sticks straight out, frozen stiff, with a crack, and its eyes cross |

Oon's worst face is a frozen fire cheese: up in the air, eyes crossed, a stiff tongue with a flame on its tip that twangs.

**While they wait.** The one at the jar watches the snack under the claw with its eyes, licks its lips when a snack pops into a new one, and leans back when the jar burps. The one at the window fogs the glass with its breath and wipes it. Neither hurries the child, complains of waiting, or refers to the child leaving or coming back. A poke at the one at the jar is answered in its manner (Mumf's belly wobbles with a grunt, Pib's neck recoils with a peep, Oon opens one eye and shuts it with a murmur); a poke at the one at the window makes it knock twice on the glass.

**Bystanders, who want nothing.** A pink sugar mouse lives by the paper bag on the counter: it sniffs, watches whatever moves, and at a poke squeaks and dives into the bag, then looks out again. The lamp over the counter sways, and at a poke swings with a ding.

## The scenes

Each scene is a list of timed beats filled in from the state of play. Its outcome is saved when it starts, and a touch ends it at once with everything where the scene was taking it; a beat that is landed that way makes no sound.

**The burp.** Cause: a snack has come to rest with its top above the jar's rim.

- Beats, about four seconds: the jar swells and rumbles and the monster leans back from the rim; the burp throws out the top layer, at most four snacks, the highest first, each in the flight of its things (the last column of the grid); they land one after the other on the free places of the counter; the jar settles with a hiccup and a last puff of sugar.
- Filled in from: which snacks lay highest, and which places on the counter were free. When more are thrown out than places are free, the snacks on the places nearest the paper bag hop one by one into the open bag at the end of the counter to make room, with a rustle, and are gone.
- Saved with the let-go that makes it certain, before the snack lands: `jar` without the thrown-out snacks, and `counter` with them on their places and without the ones that went into the bag.
- A touch: every thrown-out snack is on its place at once, and the touch is then an ordinary touch.

**The tip.** Cause: the child pulls the jar's handle over towards the monster, with something in the jar. A pull that gets halfway counts, and one let go before that lets the jar rock back with nothing spilled.

- Beats, six to ten seconds: the jar tips to the monster's mouth; the snacks slide out as mouthfuls, one mouthful for each kind of snack in the jar, the biggest snacks first, at most five mouthfuls, with whatever is left going down in the fifth; at each mouthful the monster gives its answers to the things in that snack, all at once; it swallows, and settles into the pose of its last mouthful, which it keeps.
- Filled in from: the snacks in the jar, and the monster at the jar.
- Saved when it starts: `jar` empty, `ate` with the mouthfuls, `finished` true.
- A touch: the jar stands upright and empty and the monster is in its ending pose at once.
- With nothing in the jar there is no scene and nothing is saved: the monster looks in, one grain of sugar falls on its tongue, and it blinks.

**The next monster comes in.** Cause: a touch on the monster at the window, once the jar has been tipped into a mouth (`finished` is true). Before that a touch on it is a poke, and it knocks on the glass.

- Beats, about five seconds: the fed monster pats its belly, gets up and shuffles out past the end of the counter; the one at the window ducks away, the shop bell rings, and it comes in and sits with its mouth at the rim; the one after it comes to the window.
- Filled in from: `seat`.
- Saved when it starts: `seat` as the next monster, `ate` empty, `finished` false.
- A touch: the new monster is seated and the next one is at the window at once.

**How a cycle ends and how the next one starts.** A cycle ends with the tip: the jar is empty, the fed monster sits in the pose of what it ate, and that scene stays as long as the child likes. If the child does nothing, nothing new starts. The next monster is already visible at the window, waiting with its mouth open, and comes in on the child's touch; it never knocks, calls or hurries by itself. The claw, the shelf, the counter and the jar's handle go on answering in the finished scene, and a snack dropped into the empty jar lies there, for this monster again or for the next one. On load no scene plays: the world is as the last scene left it (pack: game-design, endings-and-short-scenes.md; pack: game-design, the-world-keeps-and-waits.md).

## The records

The game has no learning goal: it is designed from no record of either jurisdiction and claims no school skill.

## The look

Written after the style spike, not part of the sheet. The first reserved look is in use: **jelly sweets in a glass jar**. The second reserved look was not spiked: the first held on clarity, and the lead kept it at the toy checkpoint.

**The place.** A sweet shop seen from the customer's side of the counter, indoors, in warm lamp light. Striped cream and rose wallpaper, a back shelf of stoppered jars under the ceiling, a shop window on the left with the street behind it, a wall shelf with six paper trays under the window, a pale wooden counter from edge to edge with a striped paper bag standing on it, a wooden stool with a rose cushion behind the counter, and one lamp on a cord. The back shelf holds six jars and stops short of the top right corner of the surface, which is the grown-up's: a press there never reaches the game. A brass rail hangs from the ceiling over the jar, low enough that its trolley and the claw under it never stand under the home control at the top of the screen. The six trays on the wall shelf always hold their six sweets, from the first frame. The rail and the claw hang behind the jar: a tipped jar passes in front of the snack under the claw, which is seen through the glass. All of it is painted once for each surface size and pixel ratio into one sprite, in matt, low-contrast, slightly greyed colours, so that the sweets are the most saturated things in the frame. That sprite is the frame's one full-surface stamp.

**The sweets.** Every snack is a jelly sweet in the shape of its food: a saturated see-through body with a light core and a dark rim, one soft highlight, a coloured glow on the ground under it, and a gritty coat of sugar grains that is thickest at the rim. Jelly is the one without a coat: clear, glossy, with a hard highlight. Fire is a red-hot rim and a small flame, frost a blue rim, a cap of snow and icicles. Each face is two dark eyes and a mouth. A sweet is painted once for each mood it shows and then stamped.

**The glass.** The jar is thick glass: a dark greenish edge at both walls, a heavy base, a rolled rim, and its own bright reflections (two long streaks, the shop window as a pale four-pane patch, a glint that drifts) lying over everything inside it. They are one overlay, drawn after the sweets. Tipped, the jar turns as one piece on the corner of its foot nearest the monster, and the sweets slide out over the rim in front of the glass.

**The monsters** are matt and soft-edged, in fur or skin with no shine, so nothing but the sweets and the glass is glossy. They are large: the one at the jar stands about half the frame high, and the one at the window fills the lower panes with its face.

- **Mumf** is a heap of plum fur with tufts, a pale belly patch, a checked napkin and a fork. Its body, head and jaw are three sprites and the jaw hangs on a hinge; its arms bend at the elbow and end in paws on the counter. Cold, the same three sprites are painted in a second, blue coat and laid over the plum one from the top down.
- **Pib** is mint skin with darker freckles: a small body on the stool, legs that dangle, a neck drawn live as one thick line, and a head with two eyes on stalks. The neck is the part that acts: it stretches, waves, carries a lump, turns red from the bottom, snaps short. For cheese it shoots up to half as long again: twice its length would put the eyes on their stalks above the top of the frame.
- **Oon** is one wide orange dome on the stool with a paler belly, darker spots, three eyes under heavy lids in a row, a mouth at its left end and a tongue drawn live. It is squashed and stretched whole: flat as a puddle for jelly, up in the air for chilli.

**Palette.** Wallpaper cream `#f6e7d3` and rose `#eccdbf`; wood `#d9a875` and `#b98556`; glass edge `#7fa59a`; bread amber `#f0a23a`, cheese yellow `#ffd21f`, egg white `#fff4e2` with yolk `#ff8a1f`, chilli red `#f2362e`, jelly lime `#7ed321`, ice blue `#8fd8ff`; Mumf plum `#8a5aa6` (cold `#7fb0e2`), Pib mint `#8fd9b6`, Oon orange `#ff9a3c`, the mouse pink `#ffc4d0`. The idle glow is a warm gold ring, `#ffcf40`, which reads on the wallpaper, the glass and the wood.

**Light.** One warm lamp from the upper left. No cast shadows: a sweet has a coloured glow under it and the monsters a soft contact shade.

**Motion rules.** A sweet moves as the things it holds (the grid). In the jar and on the shelf a sweet lies still: nothing in the jar moves by itself except what joining gave a made snack: fire's flame, jelly's wobble, frost's shiver, cheese's drip. Every bump is drawn as the thing it is: the first after a let-go at full strength, a later one with no more than the speed the snack came with, so each is weaker than the last and the pile comes to rest. A snack comes back up off the floor once, the cheese highest, and its next landing holds it. A burped-out snack sounds where it is drawn to touch the counter. Two that can join squeeze together for a beat of 0.14 seconds, each pressed thin towards the other, before they pop into one. An ice that lands on the floor slides on, the way it was going or towards the side with more room, until the glass or a snack stops it. The holes of a wobble cheese are cut through the sweet, so what lies behind it shows in them. A made snack has these wherever it is, in the jar, on the counter and under the claw, each on its own beat every few seconds, and a snack of fire and frost steams at the top. A snack the jar burps out flies as all its things together: the height, the length and the turns of the flight are those of its things, a snack with chilli rides a flame and leaves a line of smoke, one with cheese bounces twice, one with ice lands beside the jar and slides, and one with jelly jiggles on the counter for four seconds. The monsters, the mouse and the lamp are what is alive at idle. Each monster moves in its own manner and shares no move with another: Mumf slow and heavy from the jaw, Pib quick and twitchy from the neck, Oon sleepy from the lids and the tongue. A monster's answer to a thing is played large while the mouthful goes down and then held, calmer, as the pose it keeps.

**Guidance.** The gold ring comes up on the one thing the scene wants touched, and the ghost hand shows the touch beside or under it, never over a face: under the snack on the rail, then on a shelf thing; at the handle when a made snack lies in the jar; under the monster at the window when the jar has been tipped and is empty.

**How each tier keeps the look.** Tier 0 draws at a pixel ratio of 2 with up to ten puffs of dust, smoke and mist and the drifting glint on the glass. Tier 1 lowers the pixel ratio to 1.5. Tier 2 lowers it to 1.25 and halves the puffs. Tier 3 draws at 1 with three puffs and a glint that stands still. The cap is on loose dust only: a made snack's flame, drip or steam is never dropped for it, and the oldest loose puff goes instead. The sweets, the glass and the monsters are the same on every tier.

**The registry row, a request to the lead.** For the claimed-styles table of `docs/art-direction.md`:

| Game | Style | Art guide |
| --- | --- | --- |
| Snack Merge | Jelly sweets in a glass jar (canvas 2D): see-through sugar-coated jelly sweets with a light core, a dark rim and a coloured glow under each, inside a thick greenish glass jar whose reflections lie over them; matt, soft-edged monsters in fur and skin in a striped cream-and-rose sweet shop by lamp light, where only the sweets and the glass are glossy | [`games/snack-merge/ART.md`](../games/snack-merge/ART.md) |
