<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 3 to 6, and its youngest age, three, governs the design.

- **The cue-table row.** The row for a youngest age of 3 to 4 in the wordless-clarity convention. Its "Avoid" column binds the game: no text, numeral or pictorial icon that has to be decoded, no spoken instruction, no verdict, never several activities live at once, and no tool present before it means something. One next act is offered at a time, and at most three fingers act. So the weather is never an icon: the window shows the weather itself, falling or blowing in the garden.
- **The pack's rules for the range** (pack: game-design, ages-2-to-4.md; pack: game-design, ages-4-to-6.md). The band starts at three, so the younger rule sets the hand: everything essential works with a tap, a drag survives a lifted finger and counts when partly done, there is no pinch, tilt, shake or double tap, a thing a child must touch is 100 stage units across or more and at least 48 px high on every tablet surface and none lies in the bottom strip where wrists rest. Funny at three is an object used wrongly (the boot on the head); from four it is also a trick played on someone who overreacts and is never hurt. From four the game is pretend play: the place, the clothes and three figures who react are supplied, and the child supplies the plot.
- **The symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, and the game has no `symbols.ts`. The cutting mat under the scene has its grid lines and no figures on them. The rule follows the manifest band: a six-year-old sees no numeral either.
- **What `ctx.childAge` sets.** Only what a first visit opens on. For a child of 3 and younger the raincoat is already tabbed onto the figure in the middle with its zip open, so the first thing the hand meets is the zip. For a child of 4 and older every garment hangs on the rack. A saved hall wins over the age. Age locks and hides nothing: every garment, figure and weather is there for every child from the first visit.
- **What no age gives.** `null` opens a first visit as for the youngest child: the raincoat on, its zip open.

## The toy

**The action.** Put a paper garment on a paper figure: drag it from the rack and let go over any part of anyone, or tap it and it flies to the place it was cut for on the figure in the middle. That is the touch the finger performs most. Its second half is the fastening the hand then works, and the first of those is the zip.

**In an empty scene.** A paper figure stands in its vest and socks beside a rack of seven garments, and nothing asks for anything.

- When the finger lands on a garment, in that frame, it lifts off its peg with its white tabs springing flat and a small flick of paper, and the figure's eyes turn to it.
- While the finger carries it the garment flutters behind the finger, and a dotted cut-line of its own shape shows on the part of the figure it would go on now.
- When the finger lets go over a figure, the garment drops onto the nearest part and its tabs fold over one after the other, each with a snap a step higher than the last. The figure squashes on its stand under it and pulls a face at exactly that garment in exactly that place.
- Let go anywhere else, the garment sails back to its peg like a paper plane and knocks against the rail. Nothing is lost.
- A garment that is worn comes off again under a dragging finger, its tabs riffling open, and can go straight onto another part.
- The raincoat's zip follows the finger tooth by tooth. Each tooth closes with a tick a little higher than the one below it, so a slow pull is a slow climbing scale and a fast pull is a zip. At the top the collar snaps shut under the chin; pulled back down, the scale comes down with it. A tap on the slider runs it three teeth by itself.
- Each button of the duffel coat is pressed through its slit with a pop, the boots are tugged up the leg in three squeaking pulls that end in a stamp, and the umbrella opens under a tap with a whup.

**Why repeating it is a pleasure with no goal.** Every touch is answered when the finger lands and the answer is bigger than the touch: a lift, a flutter, a run of snapping tabs, a squash and a face from one drop (pack: game-design, touch-answers-bigger-than-the-touch.md). Random tapping dresses the figure, and nothing a finger can do is refused: every garment goes on every part of every figure and on the dog (pack: game-design, toy-first.md). The same seven pieces make things: a figure with something on every part, a dog in a bobble hat, a grandfather in a coat that reaches his ribs. The zip is a pleasure by itself, an instrument that plays as fast as the hand moves.

## The object-by-action grid, and what is new on day 15

Seven garments by six things that can happen to them. The first two columns are the hand's own work in the hall; the last four are what each weather does to the garment when the figure who wears it steps out. A cell of the first two columns is played once, when the garment lands or its fastening is worked, and the garment then lies still: on the rack or on a body a garment has no face, no pattern and no motion of its own, and the rack under it is plain (pack: game-design, a-full-frame-with-large-funny-characters.md). A weather cell is played on the part where the garment is worn, so a boot on the head fills with rain up there. Every cell is played in the manner of the figure who wears it ("The characters and their fixed tastes"), so a cell is never the same twice across the three bodies.

| Garment | On where it belongs, and its fastening | Tabbed on anywhere else | Rain | Snow | Wind | Sun |
| --- | --- | --- | --- | --- | --- | --- |
| Raincoat (zip) | Crackles as it lands; the zip ticks up tooth by tooth, each tick higher, and the collar snaps shut | Hangs from that part like a tent and sways, with a long crinkle | Zipped: drops drum on it and run off, tok-tok-tok, and the figure struts. Open: the rain runs in at the front and drips from the hem, plip, plip | It freezes stiff and creaks at every step like a door | Open: it fills like a sail with a loud flapping and tows the figure backwards. Zipped: only the hood rattles | It steams: wisps rise with a hiss and the figure fans its face |
| Duffel coat (three buttons) | Lands with a soft whumpf; each button is pressed through its slit with a pop, the three pops stepping down | Sags off that part under its own weight with a low groan of cloth, and the buttons clack together | It drinks the rain and stretches to the ankles with a squelch | Buttoned: snow heaps on the shoulders and the figure sinks into it with a purr. Open: snow goes down the front and the figure leaps with a squeak | The buttons rattle like a tambourine and the figure does not move an inch | The figure wilts inside it with a long falling sigh and a puddle spreads round its stand |
| Boots | Flop on loose; three tugs, each a rising rubber squeak, and a stamp that thumps | Wobble on that part like jelly with a hollow bonk and two rubbery boings | Tugged up: a jump into the puddle with a big splosh that soaks the dog. Loose: they fill to the brim with a glug | Each step punches a deep print with a crunch | The wind hoots across the boot tops like breath across a bottle | The figure pulls one foot out with a pop and wiggles pink toes |
| Bobble hat | Pulled on with a fwump; the bobble boings | The bobble swings from that part like a clock weight, tick, tock | It droops over the eyes with a blub and the bobble drips | Snow builds a tall cone on the bobble, which topples with a poof | It blows off with a whee and is chased round the garden; the dog fetches it and wears it home | The head itches under it and the figure scratches with a skritch |
| Scarf | Winds on with two swishes; the tail flaps once | Unrolls off that part to the floor with a falling whistle | It goes limp and long and trails in the puddle with a slurp | The tail freezes straight as a ruler and rings, ting, when it knocks the gate | It streams out level and cracks like a whip, and the figure leans the other way | The figure mops its brow with the tail, wipe, wipe, and wrings it out with a trickle |
| Mittens | Slide on with a muffled pat, pat | Flap on that part like two small wings with a slap, slap | The figure wrings them and they spit two jets, pst, pst | The figure pats a snowball, pat-pat-pat, and lobs it onto the dog with a flump | They fly out on their string like two kites with a flutter | The figure peels one off with its teeth and a smack of the lips |
| Umbrella | Hooks on with a click; a tap opens it with a whup and shuts it with a clap | Spins round its tab like a propeller with a rising whirr | Open: the rain rattles on it like a drum and the dog squeezes in underneath. Shut: it is a walking stick, tap, tap | Open: snow piles on it until it bends and dumps the lot on the figure with a flumpf. Shut: the figure prods holes in the snow with it, pfft, pfft | Open: it turns inside out with a fwop and lifts the figure off the lawn on a rising whistle, the baby clear over the hedge. Shut: it hums like a reed | Open: the figure lies down in its shade with a long contented hum. Shut: it is twirled once round like a cane with a short whirr |

What is bare is answered too. One part is named, because the weather shows it best:

| Bare part | Rain | Snow | Wind | Sun |
| --- | --- | --- | --- | --- |
| Socks, with no boots on the feet | They soak dark from the toes up and squish at every step | The toes go blue and the figure hops from foot to foot with chattering teeth | The loose toe-ends flap like two small flags with a quick pat-a-pat | The toes curl in the warm grass with a happy creak |

**The wrong use of each thing works and is funny.**

- Every garment goes on every part of every figure, and on the dog, and stays there. The second column is what it does there, and the figure pulls a face that belongs to the part: eyes crossed up at a thing on the head, a tongue stuck out at a thing on the feet.
- A fastening works wherever its garment is tabbed on: the zip of a raincoat worn on the head runs down over the face and leaves the nose out.
- A garment is paper cut for the child, so on the grandfather the raincoat is a bib and the boots are slippers, and on the baby the raincoat is a tent with a face in the collar.
- A part that already holds a garment lets go of it when another lands there: the first one sails back to its peg.
- Dressed for the wrong weather on purpose, the figure gets that weather's cell for every garment it has on, one after the other, and comes home as it went out. The victim of the joke is bewildered and never hurt.

**On day 15** the child dresses for the funniest weather on purpose: the umbrella and the wind for the baby, because the baby goes highest; every wool thing and the sun for the child, who cannot stand being hot; a boot on the grandfather's head in the rain. It is seven garments by four weathers by three bodies, with the fastenings open or shut, and none of it needs new content (pack: game-design, depth-from-combinations.md; pack: game-design, liveliness-from-causing-and-comedy.md).

## The representation

The game has no learning goal, so no school idea is represented.

## The four mechanic questions

The game has no learning goal, so the four questions about a school skill do not apply.

## The error as a consequence

Nothing in the game is an error, and nothing is judged right. A figure dressed any way at all may go out in any weather.

- **What an outfit does.** The weather answers exactly what is worn, garment by garment, on the part where each is worn, with the grid's cell for that garment and that weather and the socks' cell where the feet are bare.
- **Where and why.** The answer is on the thing itself: the socks go dark from the toes up, the open coat fills like a sail, the wool hat is the thing being scratched. The figure's own face then shows the one thing it minds.
- **The state stays.** The figure comes back into the hall wearing what it wore, and the door, the vane and the rack are as they were; the one exception is a hat the wind took, which comes home on the dog, and what the dog wore goes to the rack. The child changes one thing (zips the coat, tugs the boots, swaps a hat) and opens the door again, or hangs everything up.
- **As interesting as the other way.** A coat that tows its wearer backwards is worth causing on purpose, and a child may, as often as they like.
- **Never about the child.** The figures' feelings are about the weather and the clothes. There is no buzzer, cross, sad face turned to the child, praise or cheer, and no sound that means wrong.

(pack: game-design, errors-show-as-consequences.md)

## The designed order, and what is stored

**The order.** The game has one place in its designed order, `hall` in `LADDER` in `config.ts`, and the position never moves. There are no challenges to order: every garment, figure and weather is open from the first visit, and what gets harder is only what the child takes on (a zip pulled all the way, three buttons, an outfit planned for one weather).

**What a first visit starts with, by age.** A child of 3 and younger, and a child of no known age, finds the raincoat already on the figure in the middle with its zip open, the other six garments on the rack and the vane at rain. A child of 4 and older finds all seven on the rack and the vane at rain. The child stands in the middle on every first visit.

**What play changes.** Everything a first visit starts with: where each garment is, how far each fastening is done, who stands in the middle, and where the vane points. From the first save on, the hall is found as it was left and the age is not read again.

**What is stored.** Small plain JSON under one version number, read field by field, each repaired by itself.

- `v`: the version.
- `position`: `hall`, the one place.
- `finished`: the one in the middle has been out, and everything it came home in has been taken off it. The hall stays as the ending left it and nothing replays on load.
- `turn`: who stands in the middle: `child`, `grandfather` or `baby`. The other two wait at the left: the taller of them by the door, the shorter under the window.
- `where`: for each of the seven garments, `rack`, or who wears it (`child`, `grandfather`, `baby` or `dog`) and on which part (`head`, `neck`, `body`, `hands` or `feet`; the dog has one part, its back). No two garments name the same part of the same wearer.
- `zip`: how many of the raincoat's twelve teeth are closed, 0 to 12.
- `buttons`: for each of the duffel coat's three buttons, whether it is through its slit.
- `tug`: how far the boots are pulled on, 0 to 3.
- `open`: whether the umbrella is open. An umbrella hung on the rack is shut.
- `weather`: where the vane points: `rain`, `snow`, `wind` or `sun`.
- `back`: the one in the middle has come home from an outing and still wears something. It is false again when another figure takes the middle; the one who leaves keeps what it wears and its `marks`.
- `marks`: for each garment, `dry`, `wet` or `snowy`: what the last outing left on it. A garment hung on the rack shakes it off and is `dry`.
- `shown`: the marks of what happens once: `door` and `vane`, each written when its showing starts, and `out`, written when the first outing starts, from when the showing of the vane is owed.

A garment in the hand is saved where it came from: on its peg, or on the part it was lifted off. A garment flying to its place is saved in that place. A zip under the finger is saved at the tooth it has reached. Wet socks are not stored: they are wrung out on the mat as the figure steps in, and are dry on load. The largest legal state is far below half of the 64 KB cap, and a test says so.

(pack: game-design, ordered-challenges-high-success.md; pack: game-design, many-short-visits.md; pack: game-design, the-world-keeps-and-waits.md)

## The characters and their fixed tastes

Three paper figures and a dog. Each figure's one want is to go out, and it is always visible: the one in the middle stands with its arms held a little out from its sides, as a paper doll waits to be dressed, and keeps glancing at the door; the two who wait stand at the left of the hall, facing out of the sheet as paper dolls do, with their eyes going to the window, and wait as long as the child likes without a sound. None of them ever looks at the child for an answer, hurries the child, or shows a feeling about the child stopping.

- **The child.** Quick and bouncy: hops on its stand, rocks from foot to foot. Loves water: in the rain it grins and stamps whatever it has on, and a soaked sock makes it laugh. Minds being hot: in the sun with any wool on (the duffel coat, the bobble hat, the scarf or the mittens) it goes red to the ears, puffs its cheeks and pulls at its collar.
- **The grandfather.** Very tall and slow, with a crease across his middle where the sheet was folded; he bends at the crease and nowhere else. Loves being wrapped up: with the scarf, the duffel coat or the hat on, in any weather, he stands straighter and the ends of his moustache curl up. Minds wet feet: with no boots in the rain or the snow his moustache droops flat and he lifts each foot high like a heron.
- **The baby.** Round, and rocks on its rounded stand like a toy that cannot fall over. Loves anything on its head, whatever it is: it crows and pats it with both hands. Minds the noise of the wind: its lip pushes out and it pulls whatever it wears on its head down over its ears, or its own hands if its head is bare; the umbrella in the wind is the one thing that makes it forget, and then it squeals all the way over the hedge.
- **The dog.** Sits by the door with its lead in its mouth and its tail going. It wears whatever is put on its back as if it were made for it, and struts one turn of the hall. After rain it shakes itself and the drops patter on the hall sheet.

The tastes never change, so a child can learn them and test them on purpose. Each figure also plays every cell of the grid in its own manner: the child fast and whole-bodied, the grandfather late and from the crease, the baby by rocking. The baby is light and the weather carries it furthest; the grandfather is long and the weather reaches his feet last.

(pack: game-design, characters-with-opinions.md)

## The scenes

Every scene is a list of timed beats, and each beat sets what is seen and what is heard together, on the one clock of attended game time. A touch ends a scene at once with every beat left at its end. In the hall it is then an ordinary touch. While the garden shows, a touch never lands on the hall hidden under it: it is answered by what is drawn in the garden under the finger (the figure or the dog as a poke, and anywhere else the weather's own drops, flakes or gust at the finger), it brings the hall back, and it does nothing else.

**The outing.** Cause: the child opens the door while a figure stands in the middle and no scene runs.

- Beats: the door swings, the figure walks out of it in what it has on, and the hall sheet turns over to the garden in the weather the vane points at (about one second); then one beat for each part of the figure from head to feet that holds a garment, playing the grid's cell for that garment in this weather, and the socks' beat if the feet are bare (about a second each, five at most); then one beat for the figure's own face, showing what it loves or minds here; then the sheet turns back and the figure stands in the hall again. Eight to nine seconds at the longest, three to four for a figure in vest and socks.
- Filled in from the state of play: who is in the middle, every garment it wears and where, how far each fastening is done, and the weather.
- Saved when it starts: `marks` for every garment the figure wears (`wet` after rain, `snowy` after snow, unchanged by wind and sun); `where` for the hat and for whatever the dog had on, when the wind takes the hat and the dog brings it home on its back (what the dog wore before goes to the rack); `back`, true if the figure will come home wearing anything; and `out` added to `shown`, when the outing is the first.
- When the figure will come home wearing nothing (it went out in its vest and socks, or the wind took the one thing it wore), the ending follows the outing as one scene, and the ending's fields (`finished` true, `back` false) are written in the outing's save. A game put away between them is found finished and plays no ending on load.

**The ending.** Cause: `back` is true and the last garment is taken off the one in the middle (hung on the rack, or put on someone else).

- Beats: the figure stretches, sits down on the edge of its stand and lets out a breath; the two who wait lean their heads toward it and back again. About four seconds, and the finished hall then stays as long as the child likes.
- Filled in from: who is in the middle, and which garments still shake off drops or snow on the rack.
- Saved when it starts: `finished` true, `back` false, and `marks` dry for the garment just hung.
- How the next cycle starts: the child touches one of the two who wait, and it walks to the middle while the one who was there takes the waiting place that fits its height; or the child puts a garment on the one in the middle, who stands up again. Either sets `finished` false. If the child does nothing, nothing starts.

**The showing of the door.** Seen once. Cause: the first garment lands on the figure in the middle on a visit where `shown` has no `door`.

- Beats: the dog drops its lead, scratches the door twice, the door swings open a hand's width on the weather and shuts again, and the dog picks its lead back up. About four seconds.
- Saved when it starts: `door` added to `shown`. Put away before it starts, nothing plays on load and the showing is still owed; it starts at the next garment that lands on the one in the middle.

**The showing of the vane.** Seen once. Cause: the child's first touch after an outing has ended that starts no scene and no change of places, while `shown` has `out` and no `vane`. The touch does its own one thing first, and the showing starts when that touch is over; a touch that opens the door or calls a figure to the middle leaves the showing owed.

- Beats: the taller of the two who wait raps the glass, the cockerel on the vane spins once round and stops where it stood, and the weather in the window flickers through all four and comes back to the one it was. About four seconds. It changes nothing.
- Saved when it starts: `vane` added to `shown`. Put away before it starts, it is still owed and starts at the child's first touch of the next visit.

**How a cycle ends and the next begins.** A cycle is one figure's outing, from the door opening to the last garment coming off it. Hanging things up is the child's act and so is not hanging them up: a figure that has come home may be sent straight out again, in the same clothes or others, as often as the child likes. Open play in the hall has no ending, and the rack is the calm way to tidy up. No scene plays on load: the hall is found as it was left, with the two who wait at the window (pack: game-design, endings-and-short-scenes.md; "How a cycle restarts" in the guide).

**Nothing rests on what the child aims at.** The two waiting places are at the left of the hall, clear of the rack and of the place in the middle. The vane is in the top of the window, above the head of the tallest figure that can stand under it, and the door's handle is clear of the one who waits beside it. Nothing a child touches (a garment on its peg or on a head, the vane, the door's handle, a figure) lies under the jam's round home control at the top centre of the surface, 48 px across and 10 px from the top. A test holds all three at each surface size.

## The records

The game has no learning goal: it is designed from no record of either jurisdiction and claims no school skill.

## The look

**Paper dolls with tabs**, the first look reserved for the game. The spike passed on clarity, so the second reserved look was not tried. The frame budget is held by a test (`view.test.ts`) at every moment of the fullest outing in every weather; the frame rate is not measured, since the builder's machine is shared, and `REFINEMENT.md` gives the draw counts.

**What it is.** Everything is thin printed paper cut out with scissors and lying on a green cutting mat. The hall is one big printed sheet; the figures, the dog and the seven garments are pieces cut from another sheet, which lies half under the hall with their holes in it. A garment is held on by white tabs that fold over the edge of whatever it lies on.

**Materials.**

- Paper is flat and matte: one printed colour a piece, no gloss, no gradient, no puffy shading. Shade is a band of thin printed lines down the right-hand side of a piece.
- The print sits a little off the cut, down and to the right, so a sliver of white paper shows along the top and left edges of a piece and never all round it.
- Outlines are straight snips. A corner is taken off in one short cut whose length differs from corner to corner, and a circle is a many-sided cut.
- Each piece lies on what is under it with one small soft shadow. There is no other light.
- A tab is a white flap with a thin line round it. Folded over, it is shorter and shows its darker back.
- The fold across the grandfather's middle is a dashed printed line.

**Palette.** The mat is deep green with a pale printed grid and nothing written on it. The hall is low in contrast and cool: a lilac-blue striped wall, a tan board floor, a slate-blue door, terracotta curtains and rug. The rack is one plain cream board with wooden rails and pegs, the plainest surface in the frame, because the working pieces hang there. The garments are the strongest colours on screen, one each and no two alike: yellow raincoat, red duffel coat, dark blue boots, orange hat, purple scarf, pink mittens, teal umbrella. Skin, underclothes and the dog are warm and pale, so that any garment reads on any of them. The idle glow is one warm orange used for nothing else.

**What is in the frame.** From the left: the dog by the doormat with its lead in its mouth, the door with an arched pane, a letter half way through its flap and a big brass lever, the grandfather beside it in striped long underwear, the window, a sash with one rail, a deep sill on two brackets and a short curtain with a scalloped hem over the lower light beside a pot plant, with the garden in it under the weather the vane points at and the weather cock on the ball that tops its pole, the baby under the window with its dummy, a picture of the dog in a crown, the cuckoo clock with its pendulum, the child in the middle on the rug in vest, shorts and striped socks, a mouse looking out of its hole in the skirting, and the rack board with the seven garments down the right-hand side. Under the hall sheet the mat shows the scissors, offcuts in the garments' colours and the cut-out sheet.

**Motion rules.**

- In the hall paper does not bend, stretch or grow. A piece moves as a whole: it slides, tips, turns, lifts off what is under it and drops back. The one exception is the grandfather, who bends at his crease and nowhere else.
- An arm is a strip of paper pinned at the shoulder with a hand on its end. It hangs with the body, under the clothes, until a hand has work: then it is lifted over the clothes and its hand goes to the thing itself, the pane that is rapped, the hat that itches, the face that is fanned, the collar that is pulled, the ears that are covered. A mitten or an umbrella stays on the hand that moves. The arm is seen no shorter than a third of its length and no longer than its paper, except the baby's, which unfolds to reach its own head (`layout.ts`, `weathering.ts`).
- In the garden the weather may do to paper what a hand cannot: a coat stretches to the ankles, a sail fills, a scarf stands out level, the umbrella turns inside out (its own second sprite). Each of these is a whole piece scaled, tipped or swapped, never a mesh that bends, and every garment is back in its cut shape before the sheet turns back (`weathering.ts`, held by `outing.test.ts`).
- A garment is never resized to fit. The same paper on another body is the joke.
- A figure moves on its stand: it squashes down onto it, tips, hops. Each has its own weight and tempo (`motion.ts`), and a test fails when two share one.
- A tab folds in under a tenth of a second, one tab after another, each with its own snap.
- The face is the only printed thing that changes by itself: eyes, brows and mouth are drawn each frame, the grandfather's mouth being his moustache.
- Working pieces are plainest: a garment has no face, no pattern and no motion of its own at rest. What moves at rest is the characters, the weather in the window, the weather cock and the pendulum.
- Sight and sound are one list: an answer is timed beats that set the pose and the notes together (`answers.ts`), played on the hall's attended clock.

**Tiers.** Every piece of paper is a sprite cut once at the surface's density, and the setting is one stamp. A tier in `config.ts` lowers the pixel ratio and nothing else, and the sprites are cut again at the new density, so every tier shows the same picture, a little softer.

**The weather.** It is never an icon. The window is four panes cut once, one for each weather, with the garden under that sky; what falls or blows is drawn over the pane each frame: slanting rain, round snow, short curled gusts, and round the sun a ring of rays that turns. The cockerel has a heading of its own for each weather, four different sights of it, and is found at the saved one on a load; turned by a finger or spun by the showing, it goes round to it. A garment that comes home wet carries three printed drops above its hem, and a snowy one three white lumps along its top, until it is hung up. They lie on the garment's own paper: they hop, nod and rock with whoever wears it, and go with it into the hand.

**The garden.** The back of the hall sheet. From the left: a shed with a ball on its pole, the dog on the lawn, the grandfather's spare long underwear on a washing line, an apple tree behind the clipped hedge with a grey cat looking out of it, and at the right edge a tall post with a bird box on its top, a snail on the bird box's roof and a picket gate that runs off the sheet. In the sun a round sun stands at the top left. The washing line is tied to the post, and the post is tall enough for a frozen scarf to knock it at any height a scarf is worn. The gate stands on the near side of the lawn and is drawn over whoever leans, lies or is blown that way; snow lies on the lawn and not on the gate.

The figure walks out of the hall by the door, in what it has on and in its own gait, before the sheet turns; the hall sheet then turns over from the door side, and the garden is seen through the part that has turned, with a pale edge where the paper stands on end. The figure that went out stands large to the right of the middle, so that nothing of it or of what it wears lies under the home control at any surface size, a phone on its side included (`garden.test.ts`); the hat the wind takes comes down to the lawn before it crosses the middle. Each weather cell adds at most a few fills on the garment it belongs to (drops, a mound, a puddle, a paper glint), in the garment's own plain style, and what a cell throws is seen to arrive: the snowball goes from the mittens to the dog, the splash of a jump reaches it, the scarf's tip meets the post where the glint is, the raincoat's hood stands up round the face while it rattles, and the toes of the socks curl up off the grass.

**The idle ladder.** First the warm glow on what could be worked next: the garments still on the rack, or a spot of the same glow on the door's lever, the zip's slider, the vane or one who waits. Then a paper hand with a dark outline shows one move, a carry or a tap, and the moves on offer take turns, the most wanted first: the zip pulled up when the raincoat is on with teeth open, the door when the one in the middle wears something, a garment carried back to its peg when the figure has come home, one who waits when the hall is finished.

**Shapes that are not signs.** Nothing in the frame is a letter, a numeral or a sign, and these shapes were redrawn so that none can be taken for one: the door's pane is an arch of plain glass (it was a ring with crossed bars), the letter flap has a blank letter in it (it was a lone bar), the glint on frozen or itchy wool is a filled paper star (it was crossed lines), the hat's pompom is a tuft of three curls (it was six spokes), the window is a sash with one rail, a curtain and a deep sill (its bars were a plain cross), the clock's hands are two filled leaves on a brass boss that meet at no right angle (they made a corner), the cockerel perches on a ball (it stood on a bar across its pole), the toggles are plain (each carried a dash), and steam is round puffs (it was three curved lines). The clock has ticks and no figures. `REFINEMENT.md` lists the weaker lookalikes that were kept and why.

**Registry row, a request to the lead.** For the table of claimed styles in `docs/art-direction.md`:

| Dress for the Weather | Paper dolls with tabs, 2D: thin matte printed paper cut with scissors on a green cutting mat, garments held on by white fold-over tabs, shade as a band of printed lines, the print a little off the cut, a cool lilac hall whose sheet turns over to a garden, and seven garments in the only strong colours | [`games/dress-for-weather/ART.md`](../games/dress-for-weather/ART.md) |
