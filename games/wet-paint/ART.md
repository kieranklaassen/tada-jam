<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

The one idea: the child feels colour keep moving after the finger has lifted. A tray of still water fills the frame. The verb is to drop and to pull colour on the water, and the water answers by carrying the colour on by itself.

## The band and its age rule

The manifest band is 3 to 7, and the age 3 governs the design.

- **The cue-table row for 3 to 4.** The child handles the things directly and learns from what the world does back. Cues used: a breathing glow on the one thing the ghost hand's move is made on (the water's rim, a pot, the newest tool, the paper corner or the held print), a ghost hand that shows one move and, once there is colour on the water, shows the tap on the paper corner first, at the next still pause, and in each pause after a touch goes on to what it has not shown since the last print (a pull, the next pot, the newest tool) before the paper comes round again, a corner of paper that curls up and breathes for as long as there is colour on the water and no scene plays, a character who gazes and reaches, tools that arrive when they mean something. Avoided, as that row's "Avoid" column says: any text, numeral or picture sign that must be decoded, spoken instructions, verdicts, several activities live at once, and tools present before they mean anything. One next act is offered at a time.
- **The pack's rule for the age range.** The band starts at 3, so the rule for ages 2 to 4 holds: everything essential works with a tap, a drag survives a lifted finger and counts when partly done, there is no pinch, tilt, shake, hold or double tap, and the game is one loved action offered again and again (dropping and mixing). The three pots are 120 stage units across and 140 apart, the corner of paper the child taps is at least 100 stage units across, and neither the pots nor the paper lie in the bottom strip. No pot, tool, paper corner, held print or peg lies under the jam's round home control (48 px across, at the top centre, 10 px from the top), at any surface size the stage is fitted to. The water is one large surface, and a touch anywhere on it works. What a drag carries (the sheet of paper on its way to the tray, the held print on its way to the line, a tool in the hand) hangs where the finger left it for three tenths of a second on the game's own clock, seen to hang, and a finger that lands on it again in that time carries on as if it had never lifted; put away in that time, it was not dropped. A pull through the water is not a carry: it ends at the lift, and the water coasts on. A whole hand that lands together is one finger, the first to land. A contact that only rests never deadens the game: when the contact that is working landed where nothing is (the rim, the table, the wall), or has been down for a second without moving, whatever it rests on, the next contact that lands takes the work and is answered as itself, on a pot, a tool, the paper, a held print, the cat or the water alike, and a tool the resting contact took up goes back to its place. A finger that is pulling is never interrupted. From the rule for ages 4 to 6 the game takes a place, props and a character who reacts, with the child supplying the plot.
- **The symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or sign, and the game has no `symbols.ts`.
- **What `ctx.childAge` sets.** Only which tools lie on the table on a first visit. Age 3 and younger: none, the hand works with the dipped stick alone. Age 4: the comb as well. Age 5: the comb and the straw. Age 6 and older: the comb, the straw and the soap. It is a default and never a gate: every tool comes to every child by play, and a saved place wins over the age.
- **What no age gives.** `null` gives the same as age 3 and younger.

## The toy

The action the finger performs most is a touch on the water.

- **A touch that lands** drops colour from the pot the stick was last dipped in. The drop is on the water in the same frame the finger lands, as a round spot under the finger, and then grows by itself for about two thirds of a second into a bloom the size of a small hand, pushing every colour already there outward in rings. It sounds as a plip at the pot's own pitch (red in the middle, yellow bright, blue deep) with a swell that rises while the bloom spreads. A finger that rests where it landed keeps giving: a moment after the bloom is full it grows on slowly under the finger, for five seconds and to nearly twice its width, with the fuller plop of a fattened bloom every half second, and it stops where it is when the finger lifts or moves. Nothing needs the rest.
- **A finger that moves** after it has landed pulls the colour with it, the fresh drop first: what is under the finger travels with the finger, and what lies beside it is dragged less the further away it is, so a bloom is drawn into a point, a tail, a heart. When the finger lifts, the water coasts on in the same direction for most of a second and slows to a stop. It sounds as a soft watery swish whose pitch follows the finger's speed.
- **Where a pull drags the dipped colour through another pot colour**, small beads of the colour the two make come up along the seam by themselves, a moment after the finger has passed, each with a small blip at a pitch between its two parents.
- **A tap on a pot** dips the stick in it: the pot glugs and its liquid wobbles, its stick stands up with a drop hanging, and the sticks of the other two lean out over their rims, each with its wet end still in its pot.

The scene around it is otherwise without a task: a cat on the table edge watches the water and follows the finger with its eyes.

Repeating it is a pleasure with no goal because no two blooms land in the same water: each one shoves the last aside, a pull never makes the same shape twice, and the water goes on moving while the child only watches. A tap at random always makes a bloom, so the simplest use always works and nothing can be done wrongly.

## The object-by-action grid, and what is new on day 15

Six things by five actions. The first action is the hand with the dipped stick, touching; the second is the same hand, pulling; the other three are the tools. Every cell looks different and sounds different, and the last row is the wrong use of each action, which works every time. A bar of soap that is dragged across the water opens a small clear hole every 46 stage units of its way, each with a squeak of its own.

| | Drop (a touch) | Pull (a finger that moves) | Comb | Straw | Soap |
| --- | --- | --- | --- | --- | --- |
| **Plain water** | A round bloom of the dipped colour spreads in a ring. A plip at the pot's pitch with a rising swell. | The drop the touch just made is drawn out across the clear water into a comet with a thin tail. A thin watery swish. | Five ripples run side by side. The teeth tick along in a dry rattle. | A dimple opens and one ring of ripples runs out. A hollow puff. | A clear lens flashes with nothing to shove, and one small bubble rises and bursts. A squeak and a pop. |
| **One bloom** | The same colour again fattens the bloom and shoves its rim out. A lower, fuller plop, deeper the larger the bloom is. | Started inside an older bloom, the pull draws a point out of it into a tail, which coasts on after the lift. A swish with the colour's own note gliding under it. | The bloom is drawn into a fringe of five stripes. A zip that runs up in pitch. | The bloom is dented into a bean. A breathy whistle that rises while the dent deepens. | A clear hole opens in the middle and the bloom becomes a thin ring. A squeak, then a fizz. |
| **Rings (a colour inside a colour)** | A new colour dropped inside pushes the old out into a ring round it, a bullseye. Two notes, the new pot's over the old one's. | The pull runs through every ring and leaves nested points, one inside the other. A swish that steps through each ring's note as the finger crosses it. | The rings turn into rows of small feathers. A harp-like run of the rings' notes. | The rings are blown off centre into crescents. A whistle that wobbles. | The hole pushes every ring out and thinner, a target with a clear middle. A falling squeak and a crackle. |
| **Two pot colours side by side** | A drop on the seam wedges between them and bends each into a crescent. A plip that splits into two tones. | One colour is dragged into the other, and beads of the colour they make bloom along the seam by themselves. A swish, then a run of small blips at the mixed pitch. | The two lock together in zigzag teeth, with one bead of the mix at each tooth. A zip with a run of blips like struck wooden bars. | One colour is blown over the other in a lobe. A fluttering, bubbling puff. | The two part like curtains and leave a clear lane. One long squeak. |
| **A mixed colour (orange, green, violet)** | A pot colour sits in it as an island. A plip with a short dull thud under it. | A pot colour pulled through a mix that does not hold it throws up beads of brown along the way. A swish with low, dull blubs. | Mix and pot colour are combed into tiger stripes. A low rasp. | The mix is dented and its edge frays into small tongues. A low hoot. | A hole with a rim of the mix round it, which thins as it spreads. A wet squelch. |
| **The cat** | A drop on the paw that rests on the rim colours the paw, and the cat shakes it and flicks three small blooms into the water. A startled meow and three spatters. | Stroked, the fur ruffles the wrong way and the cat leans into the hand. A rolling purr. | Combed, its back lies in neat stripes with a parting, and it sits up smug. A chirrup over the comb's zip. | Blown at, its ears lie flat, its whiskers stream back and its eyes squeeze shut. A rush of wind and a sneeze. | A bubble grows on its nose, its eyes cross to look at it, and it bursts. A rising bloop and a pop. |

On day 15 the child knows what each action does to each state of the water and uses them in an order on purpose: rings first, a comb through them for feathers, a soap window in the middle, and a print of the pattern they meant to make, hung beside one made the other way round.

## The representation

This game has no learning goal, so no school idea is represented in its objects.

## The four mechanic questions

This game has no learning goal, so the four questions about a school skill built into the mechanic do not apply.

## The error as a consequence

Nothing here can be done wrongly, so what follows is what a child may not have meant.

- **Mud.** Where three pot colours are dragged together the water goes brown, exactly there and nowhere else, so the child can see which pull made it. The cat wrinkles its nose at it.
- **Colour pushed off the tray.** A bloom dropped at the rim pushes its neighbours over the edge, and they are gone from the water. It shows at the rim where it happened.
- **A tool on the cat.** It works, as the last row of the grid has it, and the water is not changed by it except for the three flicked blooms.
- **A tap on the paper with no colour on the water.** Plain water takes no print. The corner of paper lifts under the finger with a rustle and settles again, the cat looks at the water, and nothing goes on the line, so a stray tap never takes a print off it.

In each case the state stays. Nothing is undone, nothing is taken back, and nothing gives a verdict. The child changes one thing and goes on: a drop of soap opens clear water in the mud, a new bloom pushes it aside, and a print leaves plain water behind.

## The designed order, and what is stored

The game has no learning goal. Its designed order is the order in which the tools come to the table, one new thing at a time, and then their combinations, which are the child's own.

**The places, in order.** Their ids, as they stand in `config.ts`, name the newest tool on the table and never a grade or a level:

1. `finger`: the dipped stick alone. Drops and pulls.
2. `comb`: the comb lies beside the pots as well.
3. `straw`: and the straw.
4. `soap`: and the soap. Every tool is out.

**What a first visit starts with, by age.** Age 3 and younger, or no age: `finger`. Age 4: `comb`. Age 5: `straw`. Age 6 and older: `soap`. On a first visit `shown` is empty. A tool that lies on the table and is not in `shown` is owed its showing, which starts at the child's first touch of that tool, the same as for a showing a put-away cut off.

**What play changes.** One cycle runs from plain water to a print. It is judged when the sheet is laid on the tray.

- It goes well when the newest tool on the table has touched this water (at `finger`: when any colour is on the water). The place then moves up one step, and the cat brings the next tool to the table while the print is held up.
- Any other cycle is mixed, and the place stays.
- No cycle goes badly: a tool that has come to the table never leaves it, so the place never moves down.
- The place moves between cycles only, and nothing on screen shows it other than the tools themselves.

**A harder option is the child's to pick.** A tool lying beside the pots is taken up with a tap and put down with a tap on a pot, on the tool itself or on the cloth the tools lie on. A tool that is tapped hops in its place. The dipped stick always works, and nothing asks for a tool.

**Who waits.** There is no customer. What waits after a print is the tray of plain water, the pots and the tools. A new tool is laid on the table in the scene that follows the print, so a new place shows on the very next tray.

**Where things come to rest.** Nothing the game sets down covers a target. A tool the cat brings comes to rest beside the pots, clear of every pot, of the other tools and of the paper corner. The print the cat holds up is clear of the pots, the tools, the paper corner and the pegs. A hung print covers its own peg and nothing else. The paws that hold a print lie on it and on the water, and there a touch is the paw's: all of each drawn paw answers as a paw, before the print and the water, and the print is touched between and round them. Nothing lands unseen: the three blooms such a paw flicks, and the cat's dab, land on the water below the print and never under it. A tap on any of these is never taken for the pot, the tool or the water behind it, and an overlap test holds this at each surface size the stage is fitted to.

**Every field of the saved state.**

| Field | What it holds |
| --- | --- |
| `v` | The version of the record, 1. |
| `position` | The place in the order above, as its id. |
| `finished` | True from the moment a print is taken until the child's next touch on the water or a pot, or the child's next drop on a paw of the cat while it holds no print, which flicks colour into the water. While it is true the tray is plain water and waits, but for colour flicked by a paw that holds a print: that drop starts nothing while the game is open, and a load reads the coloured water as a cycle begun, which changes nothing on screen. |
| `tray` | The water: a grid of 208 by 144 cells, each one of eight values (clear water, red, yellow, blue, orange, green, violet, brown), packed three bits to a cell into 14,976 characters. It is saved at rest: every bloom full grown, every bead out, the coasting ended. |
| `pot` | The pot the stick was last dipped in: 0, 1 or 2. |
| `tool` | What the hand holds: the id of a tool on the table, or `finger`. |
| `used` | The ids of the tools that have touched this tray's water, which is what judges the cycle. |
| `prints` | The last four prints, oldest first. Each holds its picture as a grid of 52 by 36 cells in the same eight values (936 characters) and `peg`: the number of the peg it hangs on, or `null` while the cat holds it up. |
| `shown` | The ids of the tools whose first showing has started. |

The largest state is under 20 KB, and a test holds it under half the 64 KB cap. Nothing else stays: a coloured paw, a combed parting, a bubble, ripples and the cat's pose are short-lived and gone on load. The oldest print leaves the line when a fifth print is taken, not when that one is hung, and is gone from the save in that scene's save: as the cat hops for the new sheet the oldest print comes off its peg with a click and a flutter of paper and flies down behind the cat, which lands on it, on the pile of paper it already sits on, whose height never changes. No paw pulls it: the pegs are out of the cat's reach.

## The characters and their fixed tastes

**The cat.** A large, fat, orange cat sits on the pile of paper at the back edge of the table with its chin on the rim of the tray. Its one visible want is to watch the colour move: its eyes are on the water and follow the finger, and they go wide when a bloom spreads. Its tastes never change, so a child can learn them and test them on purpose:

- **Orange, its own colour, it adores.** The more orange on the water, the further it leans in, purring. A print that is mostly orange it rubs its cheek on.
- **Brown it cannot stand.** At mud it wrinkles its nose, puts out its tongue and leans away. A print that is mostly brown it holds out at arm's length by two claws.
- **Rings make it hunt.** At a bullseye its pupils go huge and its hind end wiggles.
- **Soap startles it every time.** Its ears go flat and it jumps, and then it comes back to sniff the clear water.
- **Wind it hates on itself and loves on the water.** It bats at the dent the straw makes.
- **It likes to be combed and dislikes a wet paw.**

Its feelings are about the water, the print and its own fur, and never about the child: it does not thank, praise, ask or sulk, and it does nothing when the child stops or returns.

**The bird at the window** has no want and no opinion. It hops on the sill, and it is there so that something is alive that has nothing to do with the tray. Tapped, it flutters and cheeps.

## The scenes

**1. The print.**

- Cause: while there is colour on the water, the child taps the corner of paper that sticks out from under the cat, or drags it toward the tray, which counts when partly done. With no colour on the water the same touch starts no scene.
- Beats, 6 seconds: the cat hops as the sheet is pulled from under it; the sheet floats down onto the water and lies flat; the colour soaks through its back; the cat pinches a corner and peels it up; the sheet turns over and shows the water's pattern as it lay, at a quarter of its grain each way: every line of colour is kept, a line one cell wide comes out a little fatter, and the tip of a slanted one may lose a cell or two; two drips fall; the cat holds the print up between its paws and looks at it as its tastes say.
- Filled in from the state of play: the print is the tray's own grid at the moment the sheet is laid, with any colour the cat flicked that was still in the air landed on the water first, and the cat's look follows the colours in it.
- Saved when the scene starts: `prints` gains the new print with `peg` as `null`, and loses its oldest when it then holds more than four; `tray` becomes plain water; `used` is emptied; `finished` becomes true; `position` moves up when the cycle went well; and where the cat still held an earlier print, that print's `peg` becomes the lowest free peg.
- A touch ends it at once: the print is in the cat's paws, held up, and the touch is then an ordinary touch.

**2. A new tool comes to the table.**

- Cause: a print taken in a cycle that went well. It follows the print on the same touch, when the cat holds the print up.
- Beats, 5 seconds: the cat reaches behind itself with its free paw; it bats the tool out across the table, and the paw goes home; the tool slides once through a corner of the plain water, which ripples and holds no colour; it comes to rest on the cloth beside the pots.
- Filled in from the state of play: which tool, by the new place.
- Saved when the scene starts: `shown` gains the tool's id. The place itself was saved with the print. Put away before this scene starts, or the print's scene ended by a touch before it starts, nothing plays by itself, the tool lies on the table, and the showing is still owed: it starts at the child's first touch of that tool. An owed showing has no reach by the cat and lasts three and a half seconds: the tool goes once through the corner of the water and back to its place, and the cat watches it.
- A touch ends it at once, with the tool lying beside the pots.

**3. The cat dips a paw.**

- Cause: the child has been still, on attended time only, through the ghost hand's showings, and there is colour on the water. It happens at most once in one stillness, and nothing is gained by waiting for it or lost by missing it.
- Beats, 4 seconds: the cat looks at the water, then at its paw; it reaches out and dabs once in the water, 18 stage units or more in from the rim; one ring of ripples runs out from the dab and carries no colour; it shakes the paw and licks it.
- Filled in from the state of play: the dab lands on the side of the colour nearest the cat, as far toward it as the paw reaches, which is 140 stage units at most, so it is beside that colour only when the colour is near, and it is below a print the cat holds and never under it, and the cat's look before the dab follows that colour, as its tastes say.
- Saved when the scene starts: nothing. The ripples and the wet paw are short-lived and gone on load, and the tray is as the child left it.
- A touch ends it at once, with the water as the child left it.

**4. The print is hung.** This is the ending.

- Cause: the child taps the held print, which sends it to the lowest free peg, or drags it and lets it go further than its own width (150 stage units) from the paws, or above the top of the cat's head, which sends it to the free peg nearest where it was let go. A print that is let go hangs where it is for three tenths of a second first. Let go nearer than that, it then comes back to the paws with a rustle, and no scene starts. A touch that slides no further than a tap's slop, 14 px, is a tap.
- Beats, 5 seconds: the print swings on its peg and settles; one last drip falls; the cat looks up at it once, as its tastes say, and turns back to the water.
- Filled in from the state of play: the print itself and the peg the child chose.
- Saved when the scene starts: that print's `peg`.
- A touch ends it at once, with the print hanging still.

**How a cycle ends and how the next one starts.** The cycle ends when the child lays the sheet, and the child may do that at any moment there is colour on the water, or never. The ending stays as long as the child likes: the prints hang, the water is plain, and the cat watches it. Nothing starts by itself, and nothing counts down. The next cycle starts on the child's first touch of the water or of a pot, or on a drop on a paw of the cat while it holds no print, which flicks colour into the water. A drop on a paw that holds a print is answered the same way, with the yelp and the three blooms, and starts nothing: the print stays held. On load no scene replays: the prints hang where they were hung, a print the cat held is in its paws, and the water is as it was left.

## The records

This game has no learning goal, so it is designed from no record of either jurisdiction and claims no school skill.

## The look

**Marbled paper**, the first look reserved for this game. The spike held on clarity, so the second reserved look was not tried. Everything in the frame is flat, opaque colour with a hard edge: no gradient, no blur, no blend of two colours in one pixel. The look's whole claim is the water: it must read as floating paint, never as cells.

### What it is made of

- **The water's colour** is a grid of 208 by 144 cells, each holding one of eight values (`colours.ts`). The grid is what is saved; it is never what is seen.
- **The outline is smoothed when it is drawn** (`ink.ts`). The picture has three or four pixels to a cell. A pixel near an edge takes the value that the twenty-five cells round it vote for, each counting by how near it is, so the grid's staircase comes out as a straight slant or a slow curve at any angle. A pixel is always one ink or another. A line of colour one cell wide is kept. A test holds the edge at five slants, at three and at four pixels to a cell.
- **A fine darker vein runs along every edge between two colours**, in each colour's own darker shade, on both sides of the edge: the vein of a marbled sheet.
- **A pull leaves a combed feather.** Pulls, breaths and a bloom that grows while it is pulled are made on a flow that keeps its fractions (`marble.ts`): for each cell, the place its colour comes from. The pull has a core that is carried whole and a fall-off that ends in a cusp, so what is left is a point with smooth flanks, however many pieces the pull was made of. The comb is five such pulls side by side; the straw is a swell pushed off centre; the soap is clear water growing in the middle.
- **The room is cut from marbled papers** made by the same gestures, each from a seed of its own so the room is the same on every visit (`papers.ts`, `backdrop.ts`). The wall is a pale combed paper, the table a brown stone paper, the sky a pale blue stone paper, the towel a combed paper, the cloth under the tools a plain one with three daubs. The cat is cut from one combed orange sheet, whose feathered bands are its tabby stripes.
- **The working pieces are plain**, so the water is the busiest thing a child can change: a white enamel tray with one blue line, three dark pots each showing a disc of its colour, a wooden stick, a wooden comb, a striped straw, a bar of soap.
- **A print** is the tray's grid at a quarter of its size each way, drawn the same way at eight pixels to a cell, on a sheet of cream paper. A block of sixteen cells takes the commonest ink in it when three or more of them hold ink, and is clear otherwise, so a line one cell wide is kept, a little fatter. In the cat's paws it is 150 stage units wide; on the line each of the four hangs at its own size, tilt and drop.

### Palette

- Three pot colours, strong and far apart: red, yellow, blue. Their mixes orange, green and violet, and one brown. They are the most saturated things in the frame and appear nowhere else at that strength, except the one blue dab on the cat's head.
- The room is pale and low in contrast: cream, sage and rose on the wall, warm browns on the table, pale blue in the window. The cat is the one large warm shape.
- Clear water is the tray's own pale grey-green; it has no ink.
- The idle glow is a warm shadow colour under a pale gold, so it reads on the white rim, on the dark pots and on the cloth. It is never white. Between the hand's showings it stays on the thing the hand last showed, and after a touch it goes on to the next thing not shown since the last print.

### Light

There is no light source and no cast shadow. Depth is said by one flat, darker offset shape under a thing that stands on the table (the tray, the pots, the jug), and by overlap.

The pale slanted bands that drift on the water are a sheen only. They move no paint, they are not saved, and they are not drawn while a finger is down: they fade back in under a second after the lift. A test holds that the frame under a finger has no sheen in it.

### Motion rules

- Colour never fades in or out. A bloom grows as a disc with a hard edge and then lies still; a bead of mixed colour comes up small and grows the same way.
- The water has weight: it goes on a little after the finger lifts and slows by itself. Nothing on the water moves unless a touch, the coasting after a touch, or a growing bloom moves it. The cat's dab and a tool sliding through the corner make ripples and move no colour.
- Ripples are broken arcs and short strokes of unlike length, never one closed ring. The straw's dimple is two arcs of unlike length that close in while the dent deepens, drawn for as long as the puff is heard. The soap's lens and its bubble are the two whole shapes: pale filled ovals that open and are gone.
- The cat, the bird and each cloth move in their own way and their own time (`cat.ts`, `bird.ts`, the springs in `toy.ts`): the cat's eyes lead and its head follows, its tail keeps its own slow beat, the bird hops and pecks in quick steps, the towel swings heavy, the sock quick.
- The corner of paper curls up and breathes for as long as there is colour on the water and no scene plays; it lies flat over plain water. It is the one thing in the room that asks, it is clear of the cat, and it is touched only where it is drawn, tip included: the sheet's own cut shape, turned as it curls (`PAPER_SHAPE` in `layout.ts`, which `art.ts` draws from). The towel's hem beside the tip is the towel's.
- A finger that rests grows its bloom on at one even pace. While it grows it is drawn as one spread over the water under it, and it is laid into the grid once, when the finger lifts or moves, so the bloom stays round.
- A tool that is tapped hops in its place, whether it is taken up or put down.
- What a finger carries hangs where it was let go for three tenths of a second on the toy's clock (`GRACE`): the corner of paper stays lifted and pulled, the held print stays where it was carried, a tool stays out over the water. A finger that lands on it again carries on. Then the sheet is laid, the tool is back over its place, and the print flies to the line or, let go within its own width of the paws and not above the cat's head, slides back to them in a quarter of a second with a rustle. A held print is carried by the place it was taken at: it does not jump under the finger.
- A print in the paws is in them from the first frame of a visit: the paws do not travel there from the rim.
- Nothing lands unseen: the blooms a holding paw flicks, and the cat's dab, land on the water below a held print.
- The wind on the cat is heard for as long as its wisps are drawn: a new rush every 0.24 seconds while the straw is held on it. The cat's look at a print is its own: a cheek rubbed on an orange one, a brown one held away by two claws, its paws at the sheet's top edge with one claw out on each. It never looks at the child, nods or claps.
- Everything that moves or sounds is driven by the toy's own clock (`toy.ts`), in steps of a sixtieth of a second. A sound is asked for in the step of its motion, and tests hold both.

### What is kept from looking like a letter, a numeral or a sign

- The chevrons on the wallpaper, the towel and the cat are a combed pattern that runs across the whole sheet, band after band of unlike width. No zigzag of two or three strokes stands alone anywhere. The six tufts of the cat's ruffle rise along its back only while it is stroked.
- The window has two bars, and a hung print or the cloud is usually across them. The sponge's holes, the cloth's three daubs, the comb's five teeth and the soap's three bubbles are each of unlike size and unevenly placed.
- The standing stick's drop hangs from the stick's tip and touches it, so the two are one shape.
- The glow follows the tray's rim or a pot's round edge, and is a plain box round a tool, the paper corner or the held print; the ghost hand is a hand. The full list, with why each is weaker than the thing it is, is in `REFINEMENT.md` under "Reader".

### How each tier keeps the look

The tiers in `config.ts` change three things, and none of them is the flat colour, the smooth outline or the vein.

| Tier | Pixel ratio | Bands of sheen | Pixels to a cell |
| --- | --- | --- | --- |
| 0 | 2 | 3 | 4 |
| 1 | 1.5 | 2 | 4 |
| 2 | 1.25 | 1 | 3 |
| 3 | 1 | none | 3 |

No tier draws a cell as a plain square: three pixels to a cell is the fewest at which the outline has no step, and a test holds that every tier has three or more. The grid itself, and so what is saved and what the child made, is the same on every tier.

### How the frame is drawn

- What rests is baked once and stamped: the room, the cloths, the pots, the sticks, the tools, the paper, each print, the bird's three parts, the ghost hand. Sprites are baked again only when the stage's scale changes.
- The water's picture is painted again only in the box of cells that changed since the last frame, and not at all when nothing changed.
- One frame costs 54 stamps, fills and strokes at the busiest moment the game can reach, at 1180 by 820 and at 1024 by 768. `view.test.ts` holds that number under 80 on the real view.

### The registry row

The row the lead adds to the claimed-styles registry in `docs/art-direction.md` with the pull request, linking `games/wet-paint/ART.md`:

> Marbled paper in 2D: floating colour on a bath of water, flat opaque inks with a smooth hard outline and a fine darker vein along every edge, pushed into rings by drops and pulled and combed into feathers; the room round the white enamel tray is cut from marbled papers (a pale combed wallpaper, a brown stone-paper table), with a fat tabby cat cut from one combed orange sheet
