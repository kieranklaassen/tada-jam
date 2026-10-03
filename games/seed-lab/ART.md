<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

Seed Lab in one paragraph: a naturalist's journal page on which plants grow. The child carries pollen dust from one flower to another with a fingertip, a pod swells and bursts, and six young race up beside their parents, each taking after both and no two broods alike. Visitors with fixed tastes wait at the edge of the page for a plant they would like, and the child steers towards it over a few generations, or just breeds what pleases them. The verb is the idea itself: choose what the young come from, and see what was passed on.

- **Band.** The manifest band is 9 to 12. Nine governs the design.
- **Cue-table row.** The row for 7 and up in the wordless-clarity table. Its Avoid column binds the game: no written word or letter, no symbol standing alone that play depends on reading, no timer, points or verdict chrome, no long hint chain. Several things may be live at once as long as each reads at a glance, and light pictures may carry a real choice (the visitor's wish is a small pencil sketch of a plant).
- **Pack rule for the range** (pack: game-design, ages-9-to-12.md). The model of inheritance is one small, consistent rule that never bends. Any plant that meets a wish stands, by whatever route it was bred. A cross that goes wrong is large, funny and free. Help is fetched by the child (the loupe). Nothing is babyish: the plants have no faces, the tools look like tools, the humour is dry. No competition and no stored best.
- **Symbol rule.** The band starts at 9, so numerals may be drawn, in `symbols.ts` only, each beside the quantity it stands for. The game uses numerals in two places and no other mathematics sign: beside a wish that asks for more than one plant, and beside each group of like young when a brood is sorted ("The representation" says where each lies). No numeral stands alone, play never depends on reading one, and no letter or written word appears anywhere. This run draws none.
- **`ctx.childAge`.** It sets one default, the place in the designed order where a first visit starts: a child of 11 or older starts at the second step, every other age and no age at the first. A saved position wins over it. It gates nothing: every packet, tool and visitor is reached by play from either start, and the top and bottom are open-ended (older than 12 starts as 11, younger than 9 as 9).
- **`null`.** Starts at the first step.

## The toy

**The dab.** The finger lands on a flower and lifts its pollen; the finger carries the dust to another flower and lets go. That is the whole action, and it is the one the finger performs most.

In an empty scene (a bare page with two plants in bloom and a row of six empty pots):

- **When the finger lands**, in that frame: the flower dips under the finger, the stem bends like a spring, a puff of gold dust lifts off the anthers and a soft pluck sounds, pitched by how tall the plant is. A trail of dust then follows the finger, shedding specks that fall and fade.
- **When the dust reaches another flower**: that flower nods, a pod swells behind it with a rising creak, holds for a breath, and bursts with a pop. Six seeds arc out, each on its own path with its own tick, land in the pots one after another, and each plant draws itself upward in under two seconds: the pen line races up the stem, leaves unroll, the bud opens and the wash blooms into it. Each young plucks its own note as it opens, so a brood plays a short phrase that is different every time.
- **The chain is bigger than the touch**: one dab gives a puff, a swell, a pop, six flights and six plants, and it never blocks the next touch. A second dab while the first brood is still growing works.
- **The simplest use always works.** Any flower dabbed onto any flower gives a brood, the flower's own dust on itself included. Dust let go over bare paper drifts down and is blown off by the beetle's sneeze. There is no wrong flower and no refusal.
- **A watcher can tell in three seconds**: the child is carrying dust between flowers and getting young plants.

Why it is a pleasure with no goal: every dab is a small unpacking. The brood resembles the two plants the child chose and is never quite what was expected, the growing is fast and physical, and the page fills with plants of the child's own making. Nothing is counted and nothing is asked. The toy is judged alone, on that page, before a visitor or a wish exists.

## The object-by-action grid, and what is new on day 15

Six objects by five actions. Every cell works, and none refuses. The right use is in bold; the others are the wrong uses, which are at least as funny. The runner bud, the can and the blotter arrive later in the designed order; the grid is the whole game.

| | Poke it | Dust it (bring pollen) | Wet it (the can; the blotter does the opposite) | Carry it to a pot | Offer it to the visitor |
| --- | --- | --- | --- | --- | --- |
| **A plant in bloom** | Bends like a spring and plucks its own note (pitch by height); a puff of dust | **A pod sets behind the flower: the cross.** Its own dust works too | Petals sag, then it shakes itself dry like a dog, with a rattle of drops; its grown height stays | **Moves there.** If the pot is taken it shoulders the other plant out, which hops to the border | **The visitor answers this exact plant, trait by trait** |
| **A pod** | **Bursts: six seeds fly to the tray** | Sneezes the dust back out, since it is already set | Swells fat and squirts all six in one jet, with a squeak | Lands whole in one pot; six come up in a clump and elbow each other out into the free pots | The visitor shakes it like a rattle until it bursts in its grip, and the brood lands as usual |
| **A packet seed** | Hops with a click; on soil it sprouts where it lies | The dust slides off and the seed spins: a seed is already made | Swells and splits with a creak before it is even planted, and the sprout walks it to the nearest pot | **Grows there** | The visitor balances it (the snail on an eye-stalk), drops it, and it rolls into a pot and sprouts |
| **A runner bud** | Boings like a door-stop spring, a tone higher with each poke | The dust slides off and the bud shrugs: a runner needs none | The runner stretches and creeps to the nearest free pot by itself | **Roots there: a copy of the one parent, still joined by its runner** | The visitor tugs it like a lead and the parent plant hops along behind |
| **A pot of bare soil** | The soil puffs; the worm looks out, looks round and goes back in | Dust settles, nothing grows, the worm sneezes | **Darkens with a glug** (the blotter pales it with a dry squeak); filled twice it runs over and the beetle paddles past on a leaf | Swaps places with the pot it is dropped on, plants riding along | The visitor peers in, the worm waves, and the pot is handed back |
| **The beetle** | Flips on its back, pedals, rights itself with a click | Turns gold, sneezes, and leaves gold footprints for a while | Opens its wing cases as an umbrella | Digs itself in like a seed, waits, and climbs out affronted when nothing grows | Beetle and visitor bow stiffly; the beetle straightens the visitor's sketch |

**New on day 15.** The child owns lines that breed true, kept on the shelf (a pair that always gives short spotted whites), reads a hidden factor from a family before sowing, reaches one wanted plant by three routes (two true lines, a runner from a lucky find, a blotted pot), and knows the combinations that each visitor answers like no other. None of it is unlocked by time or amount of play: the rules are the same on day 1, and what changed is what the child has bred and what they can foresee.

## The representation

**The idea.** A young plant takes after its parents. With two parents each young gets something from both, and the young differ from one another. With one parent the young is a copy.

**How it appears in the objects.**

- **A plant's body is its traits, and nothing else about it varies.** Four traits: petal colour (red, pink, white), height (counted in stem joints), leaf outline (round or jagged), and spots on the petals (plain or spotted). The plants are the working pieces: no faces, no patterns beyond the four traits, no idle motion, on bare cream paper (pack: game-design, working-objects-stay-plain.md, by its exception for a piece whose body is the idea).
- **Passing on is a thing the child carries.** Dust goes from one flower to another by the finger. The pod forms on the flower the dust reaches, the seeds come out of that pod, and a pencil line is drawn from each young to each of its two parents. Two parents, two lines.
- **A copy has one line.** A runner is a stem from one plant to a new one, and it stays drawn. One parent, one line, the same plant again.
- **The loupe shows why.** Held over a plant, it shows two beads for each trait: one that came down each pencil line. Over a pod, it shows one bead of each pair leaving each parent. The beads are a picture of the model, not a drawing of anything inside a real plant, and the look says so by drawing them in pencil, as a note beside the specimen.
- **Colour comes first because the pair can be read without the loupe**: a red bead and a white bead give a pink flower. In height, leaf and spots one bead hides the other, so a plant can carry what it does not show, and a family is what gives it away.
- **Surroundings.** Soil is wet or dry when a seed or a runner comes up in it. A plant that comes up in dry soil grows half its height. Soil that is dry is drawn pale and cracked, so the cause sits under the plant.

**The model, and what is true in it.** Each plant carries a pair of factors for each trait. Each seed takes one factor of each pair from each parent, each drawn with an even chance and each trait by itself, from a seeded stream. A runner carries the parent's pairs unchanged. A plant that comes up short of water grows less, and what it passes on is unchanged by that. That is all the model claims as science, and it holds everywhere in the game with no exception. What follows is the game's own choice, since no record sets it: which factor hides which (tall hides short, round hides jagged, plain hides spotted, and red with white shows as pink), that each trait rests on one pair, the four traits themselves, six seeds to a pod, heights of four joints and two, and the halving in dry soil. Chance is never smoothed: a pod is six honest draws, not a tidy sample. The plants are of one invented kind, and every young is of that kind.

**Evidence.** The pack's tables of representations hold no row for inheritance (`research/learning-games-that-work.md`, section 4 and the closing table). The nearest row is a small live model to tend and disturb, which rests on the general finding for simulations. So pairs of factors drawn one from each parent are school practice without a trial behind them here, and the sheet says so.

**Object, picture, symbol.** The object is the plant. The pictures are the pencil family lines, the loupe's beads and a visitor's wish sketch. The only symbols are numerals, in two places, each beside its quantity: beside the plants drawn in a wish that asks for two or three alike, and beside each group when the child sorts a brood into like young (one to six). The order stops there for this band. The school form of a cross table writes factors as letters, and no letter is drawn at any age, so that form is not reached; ratio notation is not in the listed signs and is not used. Whether the count beside a sorted group is a numeral on a quantity or a reading on the child's work is put to the owner in `REFINEMENT.md`.

## The four mechanic questions

- **Swap.** No: the play is the rule of inheritance itself (what two parents can pass on, what one parent copies, what the soil changes and does not pass on), and with another subject in its place there is no game left to play.
- **Attention.** At the moment of decision, which is where to carry the dust, whether to take a runner instead, and which soil to sow in, the child looks at the traits of the two plants and at their families (the pencil lines, and what their broods showed) and thinks about what each of them can pass on.
- **Fun.** The skill is used in the most enjoyable moment: the dab and the brood that bursts out of it are the play, and the child's forecast is met or overturned as six plants draw themselves.
- **Guess.** Random dabbing always gives a brood, which is the toy, and at the first step a pod from any two plants on the page holds the wanted colour more often than not, by design, so that most first attempts succeed; from the second step on the wanted factor is hidden in plants that do not show it, so tapping at random or trying every pair costs many pods where reading the families costs one or two, and a wish for several traits at once is out of reach of trying everything in any sitting.

## The error as a consequence

The game runs what the child chose and shows what it gives. Three things can go wrong, and each says where and why.

- **A cross that does not give the wanted young.** The brood comes up as it must, and it is the answer: six plants that show what those two parents could pass on. Where: in the tray, each young tied to both parents by its pencil lines. Why: under the loupe each young shows the bead it took from each. Two tall parents that give a short young have just told the child both carry short. Nothing is taken away: both parents and all six young stay, so the child changes one parent, or crosses two of the young, and dabs again.
- **A plant offered that the visitor does not want.** The visitor answers the exact trait that misses, with its body and on the plant: the snail stretches up a tall stem towards the flower, overbalances and lands on its shell; the bee skids across a petal with no spots and off the far side. It likes the rest visibly first, so the child sees which trait was the miss. It sets the plant back in the pot it came from. The feeling is about the plant, never about the child.
- **Soil left dry.** The plant comes up half as high over soil that is drawn pale and cracked, beside its sisters in dark soil. A copy by runner into wet soil comes up at full height, which shows that the dryness was not passed on.

There is no buzzer, cross, sad face, reset or lost piece. An odd result is a plant like any other: it can be kept on the shelf, bred from, or offered, and some of the oddest are a visitor's secret favourite. A wrong try is never free of information, because every pod is a brood to read.

## The designed order, and what is stored

**The order.** Nine positions, one new thing at a time and then combinations. The ids are the ones in `LADDER` in `config.ts`; each names a place in the game's own order and none names a grade, a groep or a level.

| Position id | The one new thing | What arrives on the page | Who visits | What a wish asks | Pods for "well" |
| --- | --- | --- | --- | --- | --- |
| `colour` | Two parents, young that take after both and differ; both factors show | The pink packet | Snail, bee, moth, ladybird | A colour: red or white | 3 |
| `short` | A factor that hides | The packet that carries short | Snail, ladybird | Short | 4 |
| `colour-short` | Two traits at once | Nothing | All four | A colour and a height | 6 |
| `runner` | One parent gives a copy | The runner bud on every plant | All four | A colour and a height, two alike | 6 |
| `jagged` | A second hidden factor | The packet that carries jagged | Moth, ladybird | Jagged leaves | 4 |
| `three-traits` | Three traits at once | Nothing | All four | Colour, height and leaf, one or two alike | 8 |
| `spots` | A third hidden factor | The packet that carries spots | Bee, ladybird | Spots | 4 |
| `dry` | Surroundings shape growth and are not passed on | The can, the blotter and the ant | The ant | A height lower than any factor gives in wet soil | 4 |
| `whole-plant` | Everything together | Nothing | All five | All four traits, one to three alike | 10 |

- **The packets.** Every packet plant looks the same: pink, tall, round-leaved, plain. Pink is a red factor with a white one, so the first dab of two packet plants already gives red, pink and white young. Each later packet also carries, hidden, the one factor it is named for. So nothing a visitor asks for can be taken out of a packet: it has to be bred. No visitor's wish is a packet plant as it stands.
- **What a wish is.** A visitor's fixed likes, cut down to the traits its position asks about, and a number of plants alike (one, two or three). It is drawn as a pencil sketch of that plant, that many times.
- **The harder option, chosen by the child.** A visitor carries a second, larger sketch rolled under its arm whenever the page holds more traits than its wish asks about. A touch unrolls it: the same visitor's likes for every trait now on the page. It looks harder because more is drawn in it. The child may always pick it, either wish satisfies the visitor, and the choice does not change how the cycle is judged.
- **A cycle** is one visitor, from the touch that brings it in to the moment it leaves. It goes **well** when the wish is met within the number of pods in the last column, counted from the visitor's arrival; **mixed** when it is met with more pods, or when the visitor leaves with some but not all of the plants it asked for; **badly** when the child lets the next visitor in while this one has nothing. The numbers are the game's own. A plant already on the shelf may be offered, so a line the child bred earlier counts in full.
- **How the position moves.** By the template's rule: between cycles only, one step, up after a cycle that goes well, down after one that goes badly, not at all after a mixed one. Nothing shows it. Moving down takes nothing away: packets, tools and visitors that have arrived stay, and only the wishes get simpler.
- **Which visitor a new position lays out.** The visitor waiting at the edge is laid out, animal and wish, when the one before it comes in, so it belongs to the position that held then. A new position therefore shows first on the visitor after next. What a position brings (a packet, a tool) is carried in by the first visitor laid out at it.
- **A first visit** starts with the packets of every position up to the starting one.
- **A way back in.** Every packet can be sown again at any time, so no factor can be lost and no page is a dead end. The child may let the next visitor in at any moment; the one who leaves shrugs and goes.

**Every field of the saved state** (version 1, plain JSON; the two template fields first):

| Field | What it holds |
| --- | --- |
| `v` | The version of the shape |
| `position` | The ladder id the next visitor will be laid out at |
| `finished` | The visitor on the page has left its ending in place, and the next one waits for a touch |
| `seed` | The number the page's chance comes from, fixed when the page is first made |
| `podsSet` | How many pods have ever been set: the place in the stream the next pod's seeds are drawn from |
| `visitsLaid` | How many visitors have ever been laid out: the place in a second stream that picks the next animal and its number alike |
| `nextId` | The id the next plant gets |
| `kit` | Ids of the packets and tools that have arrived |
| `plants` | Every plant on the page: its id, its four pairs packed in one number, whether it came up in dry soil, its place (shelf, tray or border, and a slot), and where it came from (a packet, a seed of two plant ids, or a runner of one) |
| `dry` | Twelve flags, one per pot of the shelf and the tray: the soil is dry |
| `pods` | Pods set and not yet burst: the plant each sits on, the plant the dust came from, and the six seeds already drawn |
| `visitor` | The visitor on the page, or none: which animal, the ladder id it was laid out at, its wish, whether the larger sketch is unrolled, the plants it has kept, and the pods set since it came |
| `waiting` | The visitor at the edge, in the same shape |
| `kept` | The last four visitors that left with a plant, each with that plant's look, drawn small in the top margin |
| `sketched` | The looks of the last eight plants the beetle carried off the page to plant out, each left behind as a small pencil sketch |
| `shown` | Ids of the ideas the beetle has shown once |

- **Found as left.** A brood is drawn and saved at the moment the pod sets, so the flight and the growing are a view of the save and nothing is saved in the air. A pod put away unburst is found on its plant and waits for a touch. A plant in the hand is saved in the pot it came from. A visitor's ending is saved when it starts. No wall clock is read, nothing grows, dries or wilts while the game is away, and the breath before a pod bursts runs on attended time only.
- **Bounds.** Six pots on the shelf, six in the tray, eighteen plants in the border. A plant that would be the nineteenth sends the oldest border plant off the page: the beetle carries it out to be planted elsewhere and leaves a small pencil sketch of it in the paper. That happens at the child's own action and never to a plant on the shelf, which only the child changes. No plant is ever harmed, pressed or thrown away. The largest legal state is under half the cap, and a test says so.

## The characters and their fixed tastes

Five visitors and one resident. A visitor's want is always visible: it holds its wish sketch towards the child, and its body leans to the plants that come near it. Its likes never change, so a child can learn them and test them on purpose. A height is liked as it is seen, in joints, however the plant came by it.

| Visitor | Its one want | Likes (colour, height, leaf, petals) | What a miss looks like, each time the same | Tempo, weight, funniest part |
| --- | --- | --- | --- | --- |
| **Snail** | A meal it can reach | Red, two joints, round, plain | Too tall: stretches up the stem, overbalances, lands on its shell and turns slowly. Jagged: pricks an eye-stalk, pulls both in, peers out of one | Slow and heavy; the eye-stalks |
| **Bee** | A mark to land on | White, four joints, round, spotted | Plain: comes in to land, finds no mark, skids across the petal and off the far side. Low: flies over it twice without finding it | Fast and jittery; the rump |
| **Moth** | A flower it can find in the dark | White, four joints, jagged, plain | Red or pink: circles where the flower is and lands on the pot instead. Spotted: takes the spots for eyes and hides behind its own wings | Soft and fluttering, never straight; the feathered feelers |
| **Ladybird** | A plant that matches its coat | Red, two joints, jagged, spotted | Plain: stands beside it, looks at its own spots, looks back. Round leaves: climbs one, slides down it and off the tip | Brisk and tidy, stops dead; the wing cases, which pop open when it is startled |
| **Ant** | Something it can carry off | Pink, one joint, round, plain | Any higher: lifts it anyway, staggers in a circle and is set down by the weight | Tireless, in straight lines; its strength |

- **A like is as readable as a miss.** The visitor answers the plant trait by trait, likes first: the snail's stalks swing to a red flower, the bee's rump waggles over a spot. So one offer tells the child which traits fit and which one does not.
- **A dislike is worth causing.** Each miss is a small physical joke on the visitor, who is baffled and never hurt, and it plays the same way every time for the same trait, so it can be shown to someone.
- **Nothing is about the child.** A visitor does not thank, praise, sulk or hurry. One that waits does not complain. One that is sent off with nothing shrugs and goes.
- **The resident: the beetle.** It keeps the journal: it sketches each plant that leaves the page, smooths the tape, and rolls the loupe about like a ball it does not quite control. Its want is a tidy page, which the child's broods undo all the time. Its flaw is fussiness: it squares up a pot the child has just set down, and is knocked over by the next seed. It is the one that shows a neat way to compare ("The scenes"). Slow, deliberate, top-heavy; funniest part, its back legs.
- **The worm** lives in the soil and only looks out. It wants nothing.
- **The plants are not characters.** They have no faces and no tastes, and they move only when touched, set, or growing.

## The scenes

Every scene is a list of timed beats on game time, built on the template's `scene.ts`, filled in from the state of play. Any touch ends it at once and leaves the world in the scene's last pose. The brood that follows a dab is not a scene: it is the toy's own answer and never blocks a touch.

- **The ending: a visitor gets its plant** (6 to 9 seconds). Cause: the plant offered completes the wish. Beats: it looks the plant over trait by trait, likes each in its own way, takes hold of the pot, uses the plant as it wanted to (the snail eats the edge of one leaf, the bee lands on a spot and waggles, the moth unrolls its tongue, the ladybird stands against the petals and all but disappears, the ant lifts the pot over its head and marches on the spot), and settles. Filled in from: the exact plant given (its colour, its joints, its leaves, its spots, whether it came up dry), how many were asked for, and which sketch was open. The outcome is saved when the scene starts.
- **The showing of a new tool** (5 to 8 seconds, once per tool). Cause: the visitor that carries a new tool in has set it down. The beetle uses it once, on a plant that is not the one the visitor wants: it hooks a leg in a runner bud, is towed across the page and roots a copy; or it blots a pot, sets a runner in it, and stands between the copy and its parent looking from one to the other. Filled in from: which plants are on the page. The child then does it.
- **The neat way to compare** (6 to 9 seconds, once per idea). Cause: the child's own first brood in which a new idea showed, after it has grown: three colours from two pinks, a short young from two tall parents, and so on. The child has tried first. The beetle then nudges the young of that brood into groups of a kind and rolls the loupe over one parent and one young. Filled in from: that brood and its parents. It shows a way of looking, on a brood already made, and never which plants to cross for the wish on the page. Afterwards the child can do the same at any time by fetching the loupe; the beetle does not show it again unasked.
- **The secrets** (4 to 7 seconds, every time). A few fixed combinations always give the same scene and are never hinted at: a one-joint plant offered to the snail is worn as a hat; a red spotted flower hides the ladybird so well that the beetle walks into it; a plant set in the beetle's own corner is squared up, fenced in with tape and guarded. Nothing counts them and nothing marks one as found.

**How a cycle ends.** The ending stays as it settled, for as long as the child likes: the visitor sits with its plant at the side of the page. Everything else stays live, so the child can go on breeding with no visitor at all. If the child does nothing, nothing new starts.

**How the next one starts.** The next visitor is already visible at the edge of the page, holding its sketch, and waits without a sound or a gesture towards the child. A touch on it brings it in. The one before retires to the top margin as a small drawing of itself with its plant. On load no scene replays: the page is found in the last pose, with the next visitor waiting.

**When the page opens** something is already going on: the beetle is halfway through smoothing a strip of tape that will not lie flat, two packet plants stand in bloom, and the first visitor waits at the edge.

## The records

Read from the education pack on 2026-10-03 with the lookup, each record by its id. What a record asks is given in the pack's Summary (California) or in the game's own words (the Netherlands).

### us-ca

Level: grade-6, which the lookup returns for ages 11 and 12. Age mapping: derived, as the lookup prints; typical ages, not law.
Gaps, as printed: at age 9, "Grade 3 is not in the pack. A third grader turns nine during the year; grade 4 starts at nine." At age 12, "Grade 7 is not in the pack. A sixth grader turns twelve during the year; a child who starts the school year at twelve is in grade 7."
For ages 9 and 10 the lookup returns grade-4 and grade-5. Neither lane holds a record on traits passing from parents to young, so for a Californian child of those ages the game names no record and claims nothing.
The lookup also returns the `cross-grade` science lane, labelled cross-grade. The game is designed from none of its records.

- `edu.us-ca.grade-6.science.objective.ms-ls3-heredity-inheritance-and-variation-of-traits-ms-ls3-2` (`us-ca MS-LS3-2`): state-board-adopted-standard, confirmed. Summary: "The student builds and uses a model to show why asexual reproduction gives offspring whose genetic information is identical, while sexual reproduction gives offspring that vary genetically." In the game: a runner gives a copy with one line to one parent, a pod gives six young that differ, and the loupe shows what each took from whom.
  Limits taken: the record prints no assessment boundary, so it bounds nothing here. Left open by Limits, and the game's own choice: the kind of model (pairs of factors shown as beads), which factor hides which, one pair to a trait, the four traits, six seeds to a pod.
- `edu.us-ca.grade-6.science.objective.ms-ls1-from-molecules-to-organisms-structures-and-processes-ms-ls1-5` (`us-ca MS-LS1-5`): state-board-adopted-standard, confirmed. Summary: "The student builds a scientific explanation, grounded in evidence, of how both environmental and genetic factors affect the way organisms grow." In the game, from the position `dry` on: the same pairs come up at half the height in dry soil, and different pairs come up at different heights in the same soil. The game supplies the evidence in the plants; the explaining is the child's and is asked for by nothing.
  Limits taken: how genes work, how they are regulated and the biochemistry are left out, and the game shows none of them: a bead is what was passed, never how it acts. Left open by Limits, and the game's own choice: water as the one condition, two states of soil, the halving.

Not used: `us-ca MS-LS1-4`, which the wave's plan named. It is about the chance of reproducing, not about which traits pass on, and nothing the finger does in this game is that skill; the visitors' tastes are the game's fiction.

### nl

Levels: fase-2 and fase-3. Age mapping: convention, as the lookup prints. Sub-bands as printed: at age 9, fase-2, "groep 5 or groep 6. The goals are for the whole band, groep 4 to 6: nothing in them says which are for groep 6."; at age 10, fase-2, "groep 6: a child turns ten during it.", and fase-3, "groep 7."; at age 11, fase-3, "groep 7 or groep 8."; at age 12, fase-3, "groep 8: a child turns twelve during it.", with the line "A child who starts the school year at twelve is usually in secondary school, which is not in the pack."
The lookup also returns the `einde-po` science lane, labelled end-of-primary goals. The game is designed from none of its records.
None of the records below is a core goal, so none has a regime.

- `edu.nl.fase-2.science.objective.8d8e77f7-4928-43e6-ad77-3d395ba997ae` (`nl ojw/pdm/3/10/fase2`): curriculum-institute-guidance, confirmed. Its second part asks a child to realise that a living thing always comes from another of its own kind. In the game: every young on the page comes from plants on the page and is of their kind.
  Limits taken: an offer for groep 4 to 6 with no year; its first part is about how animals reproduce and is not in the game; the Dutch word covers both kind and species and the game does not choose. The game holds one kind of plant only, so it shows this idea and gives the child no way to test it.
- `edu.nl.fase-2.science.objective.85460e58-4e77-4ee3-881a-96a551defb2a` (`nl ojw/pdm/3/08/fase2`): curriculum-institute-guidance, confirmed. It asks a child to explore the forms of reproduction in plants: seed that forms in a fruit, tuber, bulb and runners. In the game: seed from a pod, and a runner.
  Limits taken: an offer for groep 4 to 6 with no year; four forms are named and no others, and the game uses two of them and adds none. Pollination is not named by the record: the dab is the game's own.
- `edu.nl.fase-3.science.objective.cf826416-0c06-4aa6-a476-12f80b22243a` (`nl ojw/pdm/3/14/fase3`): curriculum-institute-guidance, confirmed. It asks a child to realise that the characteristics of a kind are passed on to the young, and what follows from that. In the game: the young of every pod show what their parents passed on.
  Limits taken: an offer for groep 7 and 8 with no year; the verb is realising; the record does not say what follows, sets no level of detail on how characteristics pass, and names no plants or animals. So the pairs of factors, the hiding and everything else about how a trait passes are the game's own choice and are not given as what this record asks.
- `edu.nl.fase-3.science.objective.82170ab5-6a15-48e7-896a-a47bd6294ac5` (`nl ojw/pdm/3/12/fase3`): curriculum-institute-guidance, confirmed. It asks a child to investigate and observe the difference between reproduction through seed and through tuber, bulb and runners. In the game, from the position `runner` on: the child gets new plants both ways from the same parent and sees them side by side.
  Limits taken: an offer for groep 7 and 8 with no year; two sides are compared and the game takes runners alone for the second side; no plants are named; the record does not say what the difference is. That seed young differ and a runner's young is a copy is what the game shows, and for the Netherlands that is the game's own choice.
- `edu.nl.fase-3.science.objective.002763c1-3b1d-4277-ac8f-27815a44858f` (`nl ojw/pdm/3/07/fase3`): curriculum-institute-guidance, confirmed. It asks a child to carry out simple experiments with plants, for example on what influences growth, without losing sight of care for living things. In the game, from the position `dry` on: one condition, water, changed in one pot while its twin stays as it was.
  Limits taken: an offer for groep 7 and 8 with no year; the experiments are simple, so one condition with two states; the factors are examples, so water is the game's own choice; its part on animals is not in the game. Its one condition, care for living things, is kept: no plant wilts, dies, is pressed or is thrown away, a plant in dry soil is small and not harmed, and a plant that leaves the page is carried out to be planted.

Not used: `nl ojw/pdm/3/15/fase3`, which names hereditary characteristics inside human reproduction.

### Where the two differ

- **Age.** California carries inheritance in grade 6 only, ages 11 to 12, and nothing is named for a Californian child of 9 or 10. The Dutch guidance offers the same-kind idea and the forms of plant reproduction in fase 2 and the passing on of characteristics in fase 3. For ages 9 and 10 the game follows nl. For the model of variation it follows us-ca MS-LS3-2.
- **Variation among the young.** us-ca MS-LS3-2 states that the young of two parents differ and the young of one parent are the same. No Dutch record states either. The game follows us-ca here, and its claim of variation is made for California grade 6 only.
- **A model.** us-ca MS-LS3-2 asks for a model to be built and used. The Dutch records ask for realising, exploring, investigating and observing, and set no level of detail. The game's beads follow us-ca; under nl they are the game's own choice.
- **Surroundings.** us-ca MS-LS1-5 puts surroundings and inherited factors side by side. nl ojw/pdm/3/07/fase3 offers simple experiments on growth, with care for living things as its condition, and says nothing of inheritance. The game follows each for its own part: the comparison of the two kinds of cause from us-ca, the single changed condition and the care from nl.
- **Standing.** The California records are standards adopted by the State Board. The Dutch records are guidance from the curriculum institute: what a school can offer in a band, not what a child must know.
- **In neither.** No record of either jurisdiction in this band asks a child to choose parents in order to get a wanted trait. That choosing is the game's play and is not claimed as a school skill. Which factor hides which is in no record and is the game's own.

### The claim

Seed Lab is designed from two California standards adopted by the State Board for grade 6, `us-ca MS-LS3-2` and `us-ca MS-LS1-5`, both confirmed, and from five statements of Dutch curriculum-institute guidance, which say what a school can offer and not what a child must know: `nl ojw/pdm/3/10/fase2` and `nl ojw/pdm/3/08/fase2` for fase 2, and `nl ojw/pdm/3/14/fase3`, `nl ojw/pdm/3/12/fase3` and `nl ojw/pdm/3/07/fase3` for fase 3, all confirmed. From them it takes this and no more: young come from parents of their own kind, traits pass from parents to young, new plants come from seed or from a runner, and surroundings shape how a plant grows; and, from the California standard alone, that the young of two parents differ from one another while the young of one parent are copies.

## The look

Written after the style spike, not part of the sheet: the claimed look, the palette, materials, lighting and motion rules, and how each tier in `config.ts` keeps the look.
