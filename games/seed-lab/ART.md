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
| **A plant in bloom** | Bends like a spring and plucks its own note (pitch by height); a puff of dust | **A pod sets behind the flower: the cross.** Its own dust works too | Petals sag, then it shakes itself dry like a dog, with a rattle of drops; its grown height stays | **Moves there.** If the pot is taken it shoulders the other plant out, which hops to the margin | **The visitor answers this exact plant, trait by trait** |
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

**The model, and what is true in it.** Each plant carries a pair of factors for each trait. Each seed takes one factor of each pair from each parent, each drawn with an even chance and each trait by itself, from a seeded stream. A runner carries the parent's pairs unchanged. A plant that comes up short of water grows less, and what it passes on is unchanged by that. Those three sentences are all the model claims as science, and they hold everywhere in the game with no exception. What follows is the game's own choice, since no record sets it: which factor hides which (tall hides short, round hides jagged, plain hides spotted, and red with white shows as pink), that each trait rests on one pair, the four traits themselves, six seeds to a pod, heights of four joints and two, and the halving in dry soil. Chance is never smoothed: a pod is six honest draws, not a tidy sample. The plants are of one invented kind, and every young is of that kind.

**Evidence.** The pack's tables of representations hold no row for inheritance (`research/learning-games-that-work.md`, section 4 and the closing table). The nearest row is a small live model to tend and disturb, which rests on the general finding for simulations. So pairs of factors drawn one from each parent are school practice without a trial behind them here, and the sheet says so.

**Object, picture, symbol.** The object is the plant. The pictures are the pencil family lines, the loupe's beads and a visitor's wish sketch. The only symbols are numerals, in two places, each beside its quantity: beside the plants drawn in a wish that asks for two or three alike, and beside each group when the child sorts a brood into like young (one to six). The order stops there for this band. The school form of a cross table writes factors as letters, and no letter is drawn at any age, so that form is not reached; ratio notation is not in the listed signs and is not used. Whether the count beside a sorted group is a numeral on a quantity or a reading on the child's work is put to the owner in `REFINEMENT.md`.

## The four mechanic questions

- **Swap.** No: the play is the rule of inheritance itself (what two parents can pass on, what one parent copies, what the soil changes and does not pass on), and with another subject in its place there is no game left to play.
- **Attention.** At the moment of decision, which is where to carry the dust, whether to take a runner instead, and which soil to sow in, the child looks at the traits of the two plants and at their families (the pencil lines, and what their broods showed) and thinks about what each of them can pass on.
- **Fun.** The skill is used in the most enjoyable moment: the dab and the brood that bursts out of it are the play, and the child's forecast is met or overturned as six plants draw themselves.
- **Guess.** Random dabbing always gives a brood, which is the toy, and at the first step any cross of the two plants on the page meets the first wish by design; from the second step on the wanted factor is hidden in plants that do not show it, so tapping at random or trying every pair costs many pods where reading the families costs one or two, and a wish for several traits at once is out of reach of trying everything in any sitting.

## The error as a consequence

The game runs what the child chose and shows what it gives. Three things can go wrong, and each says where and why.

- **A cross that does not give the wanted young.** The brood comes up as it must, and it is the answer: six plants that show what those two parents could pass on. Where: in the tray, each young tied to both parents by its pencil lines. Why: under the loupe each young shows the bead it took from each. Two tall parents that give a short young have just told the child both carry short. Nothing is taken away: both parents and all six young stay, so the child changes one parent, or crosses two of the young, and dabs again.
- **A plant offered that the visitor does not want.** The visitor answers the exact trait that misses, with its body and on the plant: the snail stretches up a tall stem towards the flower, overbalances and lands on its shell; the bee skids across a petal with no spots and off the far side. It likes the rest visibly first, so the child sees which trait was the miss. It sets the plant back in the pot it came from. The feeling is about the plant, never about the child.
- **Soil left dry.** The plant comes up half as high over soil that is drawn pale and cracked, beside its sisters in dark soil. A copy by runner into wet soil comes up at full height, which shows that the dryness was not passed on.

There is no buzzer, cross, sad face, reset or lost piece. An odd result is a plant like any other: it can be kept on the shelf, bred from, or offered, and some of the oddest are a visitor's secret favourite. A wrong try is never free of information, because every pod is a brood to read.

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
