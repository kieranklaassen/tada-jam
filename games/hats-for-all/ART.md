<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

Band: 2 to 4, as in `manifest.ts`. The youngest age, 2, governs every choice below.

- **Age rule.** (pack: game-design, ages-2-to-4.md) Everything essential works with one tap. A drag is an extra, survives a lifted finger and counts when partly done. No pinch, tilt, shake or double tap. Essential targets are about 100 logical pixels across, well apart, and none sits in the bottom strip. Every touch is answered and there is no dead end. A whole cycle fits in one to three minutes. Sets stay at five or fewer.
- **Cue table.** The table in the wordless-clarity convention has no row below 3, so its 3 to 4 row is the ceiling and is cut further: one next act offered, one live activity at a time, a creature or the ghost hand showing one move, a glow on what can be touched now. Its "Avoid" column binds: no text, numeral or icon to decode, no spoken instruction, no verdict, never several activities at once, and no tool on screen before it means something.
- **Symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, optional or not. The game has no `symbols.ts`.
- **What `ctx.childAge` sets.** Only the place in the designed order where a first visit starts: 2 or younger starts at `two-heads`, 3 at `three-heads`, 4 or older at `spare-hat`. `null` starts at `two-heads`. The top and bottom defaults are open-ended, a saved position wins over the age, and the age never hides or locks anything.

## The toy

**Pressing a foam hat out of its mat.** The finger lands on a hat shape cut into a foam tile. In that same frame the hat sinks under the finger, the tile dimples around it and the foam creaks. When the finger lifts, the hat pops out with a hollow "pok", flips once in the air and lands with a squash on the nearest bare head; the creature under it bounces and babbles. The hat leaves its hole behind in the tile.

Touching a hat that is on a head does the same in reverse: it squashes, pops off, flies home and is pressed back into its own hole with a soft "fwump" and a ripple through the tile.

In an empty scene, with no creature at all, the hat pops out, flips and lands on the mat beside the tile, wobbling like a dropped bowl, and the next touch sends it back into its hole.

Why it is a pleasure with no goal (pack: game-design, toy-first.md): it is the press-out play of a foam puzzle mat, the covering and joining a toddler repeats unprompted, and each direction has its own sound, its own flip and a hole that fills or empties. The answer starts when the finger lands, runs alongside the next touch, and is bigger than the touch: the tile dimples, the hat flies, the creature bounces, its neighbours look (pack: game-design, touch-answers-bigger-than-the-touch.md). A person watching sees within three seconds what the child is doing: taking hats out and putting them on heads.

A tap anywhere else is answered too: the foam floor dimples under the finger with a squeak and whatever stands near hops.

## The object-by-action grid, and what is new on day 15

Six objects by five actions. A tap is the essential action; every drag is an extra that a tap can also reach. Each cell looks and sounds different, and nothing is refused.

| | Tap | Drag to a bare head | Drag to a hatted head | Drag to the hat tile | Let go anywhere else |
| --- | --- | --- | --- | --- | --- |
| **Hat in the tile** | Pops out ("pok"), flips, lands on the nearest bare head. With no bare head it lands on the floor as a loose hat. | Stretches after the finger with a low rubbery groan and lands with a soft "paf" where it is let go; the creature reacts to that kind of hat. | Lands on top of the hat already there with a muffled "pomf": a tower of two that wobbles and slips over the eyes. | Dips back into its own hole with a short "fwump": nothing changed. | Becomes a loose hat: it skids to the nearest round spot with a long rubbery squeal and starts to scuttle in a small circle beside it with a quick soft patter. |
| **Hat on a head** | Pops off, flies home and presses into its hole with a soft "fwump"; the creature pats its bare head. | Hops from one head to the other with a two-note "bloop-blip"; the first creature watches it go, the second reacts to it. | Makes a tower on the second head, landing with a rubbery squelch, and leaves the first bare. | Is carried home along the path the finger drew and pushed into its hole under the finger with a rising squeak; its creature waves it off. | Slides off as a loose hat with a hiss of foam on foam and a flat "plap" on the floor; its creature turns to follow it with its eyes. |
| **Loose hat on the floor** | Hops onto the nearest bare head with an upward chirrup; with no bare head it hops home into its hole with a double bounce, "bom-bom". | Is picked up off the floor with a sucker "thwop" and worn: the bare creature ducks under it. | Lands sideways on the hat already there, the tower leans with a creak, and the hat then rights itself: a tower of two like any other. | Is pressed home with a long creak. | Skids, spins like a coin with a whirr that quickens as it settles, and scuttles on beside the round spot nearest to where it stops. |
| **Top hat of a tower** | Leaves the tower and goes home; the tower shrinks with a "bip". | Moves over to the bare head with a smooth "shoop": the tower and the bare head are both mended in one move. | Onto a head with one hat: the tower changes heads with a soft double thump, the first creature blinks in the light and the second goes dark. Onto a head that already has two: a tower of three, which sways, salutes and topples with a falling whistle, and every hat of it bounces home (a secret that works every time). | Goes home while the hat under it spins once with a quick "zrrp". | Tips the whole tower: the top hat rolls off loose with a wobbling rumble and the rest settles with a low "donk". |
| **Bare creature** | Calls the nearest hat out of the tile: the hat pops and lands on it. With no hat in the tile it pats its head and looks into the empty holes. | The two bump bellies, boing apart and both pat their heads. | It peeks up under the other one's hat with a questioning hum; that one lifts it like a lid. | It leans over a hole and babbles into it; the hole echoes. | Stretches like pulled foam and twangs back to its spot. |
| **Hatted creature** | Does its own trick with exactly this hat (a like, a grump or a plain pat, by its fixed taste), voiced in its own babble: a trill, a grumble or a flat "mm". | Bows and tips its hat at the bare one, who claps. | The two knock hats together with a hollow "tok" and both wobble. | Tips its hat over the tile and shakes it with a floppy "flap-flap": nothing falls out, it shrugs. | Stretches and springs back with a low "dwong", holding its hat on with both hands. |

**The wrong use always works and is funny**: the tower over the eyes, the hat that walks off alone, the creature shouting into a hole. None gets a buzzer or a refusal (pack: game-design, liveliness-from-causing-and-comedy.md).

**On day 15** the child knows which creature loves which hat and deals them on purpose, builds the tower of three to watch it fall, and sees at a glance that a hat is spare or a head is bare, so the hat goes back or over without a wrong pull. For this age day 15 may look almost like day 1, with the child faster, surer and trying one new thing (pack: game-design, depth-from-combinations.md).

## The representation

**One hat on one head, in two rows.** The school idea is pairing one with one, and it is in the objects themselves: a hat sits on a head, and nothing else stands for it.

- The creatures stand in a row on round spots. The hats lie in a row of holes in one foam tile in front of them. The two rows are never lined up one under the other, so the pairs are made by the child and not given by the layout.
- What is left over shows by itself. A head with no hat is bare in plain view. A hat with no head lies in the tile, or is loose on the floor with nobody under it. Two hats on one head are a tower anyone can see.
- A hat taken out leaves its hole, so the empty holes show how many hats are out as plainly as the hatted heads do.
- One more and one fewer are a creature who walks in through the foam arch or walks out through it, one at a time, which leaves one head bare or one hat spare.
- The hats are the working pieces and stay plain: one flat colour and one simple outline each, no face, no pattern, no motion of their own in the tile. The look and the comedy are in the creatures, the arch and the parade (pack: game-design, working-objects-stay-plain.md). A loose hat does move, because a hat with nobody under it is the idea at that moment.

**Evidence.** This is school practice without a trial behind it. The pack's table by age lists one-to-one matching as a kind act, a hat for each, for ages 2 to 4, and marks that line as inference; the row for one-to-one counting cites a trial for a board game with counting on, which is not this game (pack: game-design, representation-before-game.md).

**Where the order stops.** At the object. The game shows no picture that stands for a hat or a head and has no symbol stage: its band starts below 6 (pack: game-design, fade-to-school-symbols.md).

## The four mechanic questions

- **Swap.** No: take away "one for each" and nothing is left to play, because the finished state, the bare head and the spare hat are all defined by the pairing; another subject could not be put in its place without a new game.
- **Attention.** The child looks at the heads and the hats and thinks about who still has none and whether any hat is one too many: which head is bare, whether to take another hat out, and, after one creature has come or gone, which single thing to change.
- **Fun.** Yes: the skill is used in the most enjoyable moment, the hat popping out and landing on a head, and the parade starts only from the state the pairing makes; play never stops for a question.
- **Guess.** At `two-heads` and `three-heads`, yes, on purpose: there are as many hats as heads and a tapped hat goes to a bare head, so a two-year-old cannot go wrong. At `one-leaves` the tossed hat goes home on one tap and nothing else needs doing. At `one-short` tapping every hat is enough as well: there is one hat fewer than heads, so no tap can bring out a hat too many, and a tossed hat hops onto the bare head on one tap; what is new there is the head that waits bare. At `spare-hat`, `one-comes`, `spares-and-one-leaves` and `comes-and-goes`, no: tapping every hat leaves a hat loose, because the crew sets off only after it has been left alone; tapping at random takes hats off heads again; and the crew is ready only when the child has seen who has one and stopped there.

## The error as a consequence

There are three ways to be off, and each shows where and why in the world, costs nothing, and leaves everything where it is (pack: game-design, errors-show-as-consequences.md).

- **One hat too many taken out.** The hat has nobody under it: it lands on the floor, skids to the nearest round spot and scuttles in a small circle beside it, slowly enough for a two-year-old's tap, bumping the feet there, and every creature turns to watch it. It shows by itself that every head already has one. One tap sends it home.
- **Two hats on one head.** The tower slips over that creature's eyes and it totters about, bewildered and never hurt, while the one left bare looks from the tower to its own head and pats it. One tap on the top hat sends it home, and one drag moves it to the bare head.
- **A hat taken off again, or a head missed.** That creature stands bare in plain view, pats its head and looks at the hole its hat is in. It waits for as long as the child likes and never hurries or sulks.

The crew sets off only when every head has exactly one hat and no hat is loose. Until then nothing is judged aloud: no buzzer, no cross, no sad face turned to the child, no reset and no lost piece. Being ready is a consequence too: the creatures look at one another's hats and the parade begins.

For a two-year-old the first two positions cannot leave a hat loose or build a tower by a tap, which is the pack's exception for the youngest: a material that does not go together wrongly.

## The designed order, and what is stored

**A cycle** is one crew. Some creatures walk in bare-headed with one tile of hats; the child gives the hats out; when the crew is as paired as it can be and has been left alone, the cycle's change comes (one more walks in, or one walks out, never more than one at a time); the child sets the pairs right again; and when every head has exactly one hat, no hat is loose and the crew has been left alone, the crew parades. "As paired as it can be" means no tower, no loose hat, and either every head has exactly one hat or every hat is on a head. "Left alone" means no touch on a hat or a creature for two seconds of attended game time, while the last reactions play out; it is the game waiting for the child, it shows nothing and hurries nobody. Sets are five or fewer throughout: at most five heads on the mat and five hats in a tile.

**The order**, easiest first, one new thing at a time and then combinations (pack: game-design, ordered-challenges-high-success.md). The ids are the ones in `LADDER` in `config.ts`. Each names a place in this game's own order and never a grade, a groep or a level.

| Id | Heads at the start | Hats in the tile | The change | What is new |
| --- | --- | --- | --- | --- |
| `two-heads` | 2 | 2 | none | Giving a hat: one each, and it cannot come out uneven. |
| `three-heads` | 3 | 3 | none | The same with one more head. |
| `one-leaves` | 3 | 3 | One creature walks out and tosses its hat, which lands loose. | One fewer: a hat with no head, to send home. |
| `spare-hat` | 2 or 3 | one more than the heads | none | Stopping: a hat stays in the tile when every head has one. |
| `one-comes` | 2 or 3 | one more than the heads | One more creature walks in, bare. | One more: the spare hat now has a head. |
| `one-short` | 3 or 4 | one fewer than the heads | One creature walks out and tosses its hat. | A head with no hat that waits in plain view until a hat comes free. |
| `spares-and-one-leaves` | 3 or 4 | 5 | One walks out. | Known things together: spare hats and one fewer. |
| `comes-and-goes` | 3 or 4 | one more than the heads | One walks out, and when the pairs are right again one more walks in. | Known things together: one fewer and then one more. |

- **A harder cycle looks harder in the world**: a longer row, a hat with no head, a head with no hat. It comes by this order.
- **What the child chooses.** The game lays no easier and harder crew side by side, because at this age one next act is offered at a time (the cue table's 3 to 4 row, cut further for a two-year-old). The harder thing a child can always pick is in the hand: a drag puts the hat on the head the child chooses, which opens swapping, towers and dealing by taste, and is more to keep track of than a tap. Nothing asks for it.
- **How a cycle is judged.** A slip is a move that takes the world further from one each: a hat brought out when no head is bare, a second hat put on a head, a hat taken off a head that then stands bare. A cycle with no slip or one goes well, with two or three it is mixed, and with four or more it goes badly. The game cannot tell a slip from a joke, so a child who builds towers for fun meets the easier crews for longer; nothing shows it either way.
- **How the position moves** is the template's rule (`state.ts`): one step up after a cycle that goes well, one down after one that goes badly, none after a mixed one, between cycles only. A visit put away before the parade leaves it where it was. Nothing on screen shows the position or that it moved, and no clock is read.
- **Which crew a new position lays out.** The very next one. Nobody of the next crew is on screen while the child works: the position moves when the parade starts, and the crew that then waits in the arch is laid out after that, from the new position.

**What is stored**, as small plain JSON through `ctx.storage`, saved on every change:

| Field | What it holds |
| --- | --- |
| `v` | The version of the shape. |
| `position` | The id of the place in the order where the next cycle starts. |
| `finished` | The crew on screen has paraded; its last pose stays and nothing replays on load. |
| `seed` | The state of the seeded stream that lays out crews, so the crew waiting in the arch is the same one after a put-away. |
| `crew` | The creatures on the mat in row order, at most five: each one's kind and the hats on its head from the bottom up, each hat named by its hole in `tile`. |
| `tile` | The hats of this cycle in hole order, at most five: each one's kind. A hole shows empty when its hat is named in `crew` or `loose`. |
| `loose` | Which hats lie loose on the floor, each named by its hole in `tile`, and beside which round spot each one rests. |
| `changes` | The changes this cycle still holds, at most two, in order: `come` or `leave`. |
| `guest` | The kind of the creature who will come, when a `come` is still held. |
| `leaver` | Which creature of the crew will leave, when a `leave` is still held. |
| `slips` | The slips of this cycle, capped at nine, read only when the cycle is judged. |
| `shown` | Whether the first showing of giving a hat has been played. |

A hat in the hand is saved where it came from. A scene's outcome is saved when the scene starts: the creature who comes is already in `crew`, the one who leaves is already out, and `finished` is already true when the parade begins, so a put-away in the middle loses nothing and nothing plays again. The largest legal state is five creatures and five hats and stays far under half the storage cap; a test says so. `deserialize` repairs field by field, and a version it does not know gives a fresh state.

## The characters and their fixed tastes

Five foam creatures, cut from the same mat as the floor. Each has the same one visible want: a hat on its bare head, shown by looking at the hats and patting its head. That want is about the scene and never about the child. Each has one hat it loves, one it cannot stand and one it simply wears, and these never change (pack: game-design, characters-with-opinions.md). There are three kinds of hat: the cone, the dome and the brim.

| Creature | Body and the part that is funniest | Tempo and weight | Loves | Cannot stand | Simply wears |
| --- | --- | --- | --- | --- | --- |
| Bop | A ball on two stubs; the whole body bounces | quick, light | the cone: spins on the spot until it sits down dizzy | the brim: it drops to its feet and Bop walks about as a hat with legs, then shoves it back up | the dome |
| Lanky | A tall post with a long neck; the neck | slow, swaying | the brim: stretches a head taller and struts | the dome: it sits too small, and Lanky goes cross-eyed looking up at it | the cone |
| Flop | A pear with two long ears; the ears | middling, heavy | the dome: both ears poke out from under it and flap | the cone: the ears droop and it huffs the hat askew over one eye | the brim |
| Wig | A wide jelly loaf; the belly wobble | slow, very heavy | the dome: pats it and wobbles all over like a struck drum | the cone: it sinks point first into Wig's soft top, and Wig pops it back up with a belly bounce and a grumble | the brim |
| Pip | A small bean on big flat feet; the feet | very quick, jittery | the cone: tap-dances a drum roll with its feet | the dome: it covers Pip to the feet and Pip runs in a small circle before it lifts the rim | the brim |

- A hat a creature cannot stand still counts as its one hat and stays on its head: the reaction is a short act that ends with the hat worn, grumpily. A dislike is as good to watch as a like, and never stops the parade.
- The reaction starts as the hat lands, reads from across a room, and is to exactly that hat on exactly that creature.
- No creature is ever sad at the child, thanks the child, hurries the child or refers to the child leaving or coming back. A bare creature that has to wait waits calmly.
- Each creature has its own babble (a pitch range and a rhythm of its own, invented and synthesized), its own walk and its own idle; no two share a motion.

## The scenes

Every scene is a list of timed beats on game time, built on the template's `scene.ts`, filled in from the state of play, between 4 and 10 seconds long, and it gives way to any touch: the touch jumps the world to the scene's end state, which was saved when the scene began (pack: game-design, endings-and-short-scenes.md). No scene plays before an action, and none plays only sometimes for the same cause.

- **The first showing** (once ever; cause: the very first crew walks in). The first creature of the crew hops to the tile, stamps beside a hat, the hat pops out and lands on its own head, and it turns to look at the others and at the hats left. Filled in from: which creature leads and which hat is nearest. The crew of this one cycle has one creature and one hat more than its position lays out, so what is left for the child is the position as designed. It is a move in the world, with no word, and it never plays again (pack: game-design, guided-discovery.md).
- **A crew walks in** (cause: the child taps the arch or the creature waiting in it). The tile of hats slides in at the front, and the creatures walk in one by one, each in its own walk, take their spots, look at the hats and pat their heads. Filled in from: the crew and tile laid out for the position.
- **One comes** (cause: the crew is as paired as it can be and has been left alone, and a `come` is held). One more creature walks in through the arch, takes the free spot at the end of the row, sees the hats on the others, pats its own bare head and looks at the tile. Filled in from: the guest's kind and the hats the others wear.
- **One leaves** (cause: the same, with a `leave` held). The creature bows, tosses its hat straight up and walks out through the arch; the hat comes down on its empty spot, wobbles and starts to scuttle. If it stood bare it shrugs and walks out. Filled in from: which creature, which hat.
- **The parade** (the ending; cause: every head has exactly one hat, no hat is loose, no change is held, and the crew has been left alone). The creatures look at one another's hats, each shows its own feeling about the hat it wears, in row order, then they fall into line and march once round the mat, each in its own walk, to a marching tune made of their own voices, and come to rest in a row on the far side, facing the arch. Filled in from: who is in the crew after the changes, which hat each wears, and each one's taste for it.
- **The tower falls** (a secret; cause: a third hat on one head, every time). The tower sways, salutes and topples, and each hat bounces home to its own hole. It is under two seconds, so it is a reaction more than a scene, and it never blocks a touch.

**How a cycle ends.** The parade's last pose stays for as long as the child likes, with the hats on. The finished crew and its hats still answer every touch as the grid says; if the child unsettles the pairs and sets them right again the crew parades again, every time, but the cycle was judged at its first parade and the position does not move twice. If the child does nothing, nothing new starts: no next crew by itself and no countdown.

**How the next one starts.** The first creature of the next crew stands waiting in the arch, in plain view, calm, and never hurries the child or sulks. The child taps it or the arch: the finished crew walks out, its tile slides away, and the new crew walks in with its own tile. On load no scene replays: the world is as the last scene left it, with the next crew waiting ("How a cycle restarts" in the guide).

## The records

Read from the education pack with the lookup on 2026-10-03. Each record is named by its pack id; the codes of the California foundations restart in every strand, so a code is given with its strand.

### us-ca

Levels, as the lookup prints them: age 2 is `infant-toddler`, the indicator for 23 through 36 months; age 3 is `preschool-tk`, sub-band Early (3 to 4 ½ Years); age 4 is `preschool-tk`, both the Early and the Later statement. Age mapping: official. Gap: none printed.

At `infant-toddler` this sheet names no record: the one record of that level it read, foundation 2.1 of Emergent Mathematical Thinking (listed below as read and not used), is about number words, so for a two-year-old in California the game rests on no record and names nothing in its place. At `preschool-tk` no record is named for pairing one thing with one thing as such: that part is taken from the Dutch peuter card alone, and for California the game is designed only from the comparing, the change and the equal dealing of the three records below.

- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-1-0-counting-and-cardinality-1-6` (`us-ca` 1.6, Counting and Cardinality): department-published-foundation, confirmed. In the game's words: the child looks at the heads and the hats and sees whether there are as many of one as of the other, or more of one.
  Limits taken: two groups only (the heads and the hats); the Early statement, where the groups are plainly equal or plainly unequal and counting is optional. Not taken: the child's saying how the two groups compare, which the record has at both ages; the game is wordless and takes the comparing by looking only. The game makes the difference plain by the pairs themselves: a bare head or a hat with no head. It never asks how many more. Left open by Limits: any number range; five or fewer is the game's own choice.
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-2-0-operations-and-algebraic-thinking-2-1` (`us-ca` 2.1, Operations and Algebraic Thinking): department-published-foundation, confirmed. In the game's words: a creature who comes makes the row bigger and one who goes makes it smaller.
  Limits taken: from the Early statement, the direction of the change only; from the Later statement, that one thing in or out changes a small group by exactly one. The game changes its row by one creature at a time. Left open by Limits: how small "small" is; five or fewer is the game's own choice.
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-2-0-operations-and-algebraic-thinking-2-4` (`us-ca` 2.4, Operations and Algebraic Thinking): department-published-foundation, confirmed. In the game's words: the child gives the hats out so that every creature ends with the same amount, which here is always one.
  Limits taken: the Early statement has two receivers and a few things, which is the position `two-heads`; the Later statement allows more receivers, and for a child of 4 or older every row of three or more rests on it, while for a three-year-old such a row is beyond the Early statement and is the game's own choice. The game takes only the smallest case, one each, and never deals a pile into shares of two or more. Left open by Limits: leftovers are not mentioned, so the spare hat is the game's own content.

Read and not used, because the game speaks no number word: the `infant-toddler` foundation 2.1 of Emergent Mathematical Thinking, and the `preschool-tk` foundation 1.2 of Counting and Cardinality. Both are about number words, and no game depends on speech until the owner has tried it (a default of the guide).

### nl

Levels, as the lookup prints them: ages 2 and 3 are `peuters`; age 4 is `peuters`, up to the fourth birthday, and `fase-1`, sub-band groep 1. Age mapping: convention. Gap: none printed. At age 4 the lookup also returns the `einde-po` lane, labelled end-of-primary goals; the game uses no record from it.

- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-getallen-getalbegrip-hoeveelheden-3` (`nl` Hoeveelheden / 3, peuter card): curriculum-institute-guidance, confirmed. In the game's words: making pairs of one with one by putting a thing by, on or with each other thing, here a hat on each head.
  Limits taken: no counting and no number words are asked, and the game asks for none. Left open by Limits: the number of things; five or fewer is the game's own choice.
- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-getallen-bewerkingen-bewerkingen-1` (`nl` Bewerkingen / 1, peuter card): curriculum-institute-guidance, confirmed. In the game's words: living through one thing or one person being added or taken away, and finding that there is then one more or one fewer.
  Limits taken: the change is always one at a time, as in the game; no written sums or signs. Left open by Limits: any number range; five or fewer is the game's own choice.
- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-getallen-getalbegrip-hoeveelheden-4` (`nl` Hoeveelheden / 4, peuter card): curriculum-institute-guidance, confirmed. In the game's words: comparing small amounts by eye or by laying them in matching rows.
  Limits taken: the small amounts only, compared by eye; the record's other way, matching rows, appears in the game as a hat on each head of one row, which is the game's own form of it, since its two rows are never lined up; counting is not named as a way to compare, and the game asks for none. The record's second case, larger amounts with a big difference, is not in the game. Left open by Limits: what "small" is; five or fewer is the game's own choice.
- `edu.nl.fase-1.mathematics.objective.inhoudskaart-rekenen-wiskunde-fase-1-getallen-getalbegrip-hoeveelheden-tot-tenminste-20-3` (`nl` Hoeveelheden (tot tenminste 20) / 3, fase 1 card): curriculum-institute-guidance, confirmed. In the game's words: comparing amounts.
  Limits taken: what a school offers in groep 1 and 2, with no year stated; the card's heading gives a range up to at least 20 with no upper bound, and the game stays at five or fewer inside it, as its own choice. The game takes the comparing only: it does not put amounts in order and has no larger amounts.

Read and not used: the peuter card's Hoeveelheden / 1 (counting small amounts) and the fase 1 card's Optellen en aftrekken met hele getallen (tot tenminste 20) / 2 (the words that go with adding and taking away), because the game neither counts aloud nor speaks. No Dutch record is named for dealing out equally: the peuter card has one, Bewerkingen / 2 (fair sharing), and the game does not use it, since the Dutch pairing record already carries one for each and the game deals no pile into shares.

Every Dutch record here says what is offered to children, on a peuter card to those of about 2 to 4 before school and on the fase 1 card by a school, and none says what a child must be able to do.

### Where the two differ

- **Pairing one thing with one thing.** The Dutch peuter card states it outright, from age 2. The California foundations named here do not: they carry it as comparing two groups and as dealing out equally, from age 3, and at age 2 not at all. The game follows the Dutch record for the pairing itself and claims for California only the comparing and the equal dealing.
- **A change of exactly one.** The Dutch peuter card has the change one at a time from age 2. The California foundation has only the direction of the change in its Early statement and the change of exactly one in its Later statement. The game follows the Dutch record and moves one creature at a time for everyone; for a three-year-old in California it is designed only from the direction of the change, and the change of exactly one is the game's own choice there.
- **How many.** Neither sets five as a top. The California foundation on dealing has two receivers in its Early statement and more than two only in its Later statement; the Dutch records set no number. The game follows the Dutch records and lets its rows grow past two heads for everyone, so for a three-year-old in California every row of three or more is beyond the Early statement and is the game's own choice. Five or fewer comes from the game-design pack's rule for ages 2 to 4 and is the game's own choice in both.
- **Standing.** The California records are foundations published by a state department. The Dutch records are guidance from the curriculum institute. Neither is a standard or the law, and the two are not equated. Nothing in the play depends on this difference: the claim gives each in the words of its own standing.

### The claim

Hats for All is designed from three California preschool and transitional kindergarten learning foundations, which are foundations published by a state department and not standards (comparing two groups, in part: the game takes the comparing by looking and never the saying of it in words; how a group changes when things are put in or taken out; and dealing out so that each receiver gets the same, in part: the game takes only one for each and never a pile dealt into shares), and from four records of guidance by the Dutch curriculum institute, which is guidance and not law (three from its content card for peuters, on pairing one with one, on one more and one fewer, and on comparing amounts, in part: the small amounts only; and one from its fase 1 card, on comparing amounts and putting them in order, in part: the comparing only). The pairing of one with one is taken from the Dutch record alone; no California record is named for it. Every record named is `confirmed`. For a two-year-old in California the game rests on no record. Nothing here says what a child has reached.

## The look

**Foam play mats**, the first look reserved for this game in the ledger of `docs/art-direction.md`. Everything on screen is a thick slab of squashy foam cut from one outline: the floor of jigsaw tiles with five round spots inlaid in it, the cream tile the hats press out of, the hats, the creatures and the arch they come and go through. A hat pressed out leaves its hole, and the mat shows through it.

It must not be taken for Kite Tower (blocks on a playroom floor: wood with grain, lathe-turned dolls) or Shadow Lantern (flat extruded shapes: paper, lamp light). Here nothing has grain, nothing is paper and nothing is lit by a lamp: the foam is matte with a fine stipple, every edge is a small soft bevel, the floor locks together with dovetail teeth, and the colours are flat.

### Palette

| What | Colour | Why |
| --- | --- | --- |
| Mat floor, two tones | `#27a99a`, `#2fb8a8` | One calm hue that no piece uses, so every hat and creature stands off it. |
| Round spots | `#63d2c3` | A lighter tone of the floor, inlaid flush: where a creature stands and a loose hat rests beside. |
| The idle glow | `#ff9a1f` | A soft ring round the next thing to touch, never over it, so a hat keeps its own colour while lit. It reads on the cream tile and on the teal floor alike. |
| Hat tile and arch | `#f6f1e4` | The mat's furniture is cream: the hats lie on the plainest, lightest surface in the scene. |
| Cone, dome, brim | `#e3382c`, `#2d6fe0`, `#f7c41d` | The working pieces are the three flat primaries and nothing else is. |
| Bop, Lanky, Flop, Wig, Pip | `#f58a1f`, `#8b52d4`, `#f0609f`, `#a9d83c`, `#4b4f5c` | Secondaries and one charcoal, none shared with a hat. |
| Wall and room floor | `#f6efe2`, `#eadfcd` | Pale and empty, so the foam is all there is to look at. |
| Eye whites, pupils and mouths | `#fbfaf5`, `#22252e` | Pressed-on foam discs. |

### Materials

- One matte foam material for everything (roughness 0.95, no metal), coloured by vertex, with one small stipple normal tile that repeats. The stipple is seeded, so every load shows the same foam.
- Every piece is an outline extruded 0.1 to 0.9 mat units (an ear the thinnest, the arch the thickest) with a bevel of 0.055. Squash is a scale spring, never a soft body.
- The hats are working pieces and stay plain: one flat colour, one simple outline, no face, no pattern and no motion of its own in the tile, apart from stirring inside the idle ladder's ring (pack: game-design, working-objects-stay-plain.md). The creatures carry the faces and the comedy.
- No shadow map. A soft round blob lies under each creature, each hat in the air or on the floor, and each leg of the arch; the same blob is the dimple where the floor is poked.
- A body leans as foam does: its feet stay planted and its top slides across. Nothing rotates into the floor.
- The ghost hand of the idle ladder is a white mitten with one finger out and a dark edge, drawn in code. It is a picture of a hand pressing the thing a child could press, and nothing to decode.

### Lighting

Daylight, as through a window: one broad sky light and one soft sun from the upper left. No lamp, no rim light, no post pass, no tone mapping: the flat primaries stay flat.

### Motion

- A touch is answered when the finger lands: the foam gives under it at once, and springs back when it lifts.
- A hat leaves with a pop, turns over once in the air and lands with a squash on what it lands on; what it lands on squashes too.
- Each creature has its own spring, tempo and sway (`motion.ts`), so the same landing, the same walk and the same breath look different on each: the ball bounces, the post sways, the jelly loaf wobbles for seconds.
- What a creature does is an act (`acts.ts`): fifteen for the tastes, one for each creature under each kind of hat, and others for the cells of the grid and the scenes. Every act begins and ends at rest and is its own motion, by test.
- A hat that comes down over a face comes forward of it first, and a hat on its way home is over its hole before it goes in: nothing passes through anything on the way.
- Alive at idle: every creature breathes at its own tempo, looks at the hats while it is bare and up at its hat when it has one, blinks at moments of its own, and a bare one pats its head now and then. Nothing beckons or flashes.

### The tiers

`config.ts` has four tiers. Tier 0 draws at a pixel ratio of up to 2 with the stipple; tier 1 at 1.5 with it; tiers 2 and 3 at 1.25 and 1 without it. Without its stipple the foam is the same flat matte colour with the same bevels, so the lowest tier still looks like the game. A tier never changes what happens.

### What the spike showed

Stills at 1180 by 820 were taken on the build machine, which draws in software, at pixel ratios 1 and 2. They say the layout, the silhouettes and the colours read: three creatures, four hats and the arch are each told apart at a glance, and a hat on a head, a hat in its hole and a hat loose on the floor cannot be confused. They say nothing about frame rate, which the lead measures on a real graphics card.

### The registry row

For the lead, for section 3 of `docs/art-direction.md`, when the game merges:

| Game | Style | Art guide |
| --- | --- | --- |
| Hats for All | Foam play mats 3D: thick matte foam slabs with a fine stipple and a small soft bevel, a jigsaw-toothed teal floor with round spots inlaid, a cream tile the hats press out of and leave their holes in, hats in the three flat primaries, cut-out creatures in secondaries, plain daylight | `games/hats-for-all/ART.md` |
