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
| **Hat in the tile** | Pops out ("pok"), flips, lands on the nearest bare head. With no bare head it lands on the floor as a loose hat. | Stretches after the finger and lands where it is let go; the creature reacts to that kind of hat. | Lands on top of the hat already there: a tower of two that wobbles and slips over the eyes. | Dips back into its own hole with a short "fwump": nothing changed. | Becomes a loose hat where it lands and starts to scuttle. |
| **Hat on a head** | Pops off, flies home and presses into its hole; the creature pats its bare head. | Hops from one head to the other; the first creature watches it go, the second reacts to it. | Makes a tower on the second head and leaves the first bare. | Goes home, as a tap does, by the path the finger drew. | Slides off as a loose hat; its creature turns to follow it with its eyes. |
| **Loose hat on the floor** | Hops onto the nearest bare head; with no bare head it hops home into its hole with a double bounce. | Is picked up and worn: the bare creature ducks under it. | Joins the tower, sideways, and the tower leans. | Is pressed home with a long creak. | Skids, spins like a coin and scuttles on from there. |
| **Top hat of a tower** | Leaves the tower and goes home; the tower shrinks with a "bip". | Moves over to the bare head: the tower and the bare head are both mended in one move. | Builds a tower of three, which sways, salutes and topples: every hat bounces home (a secret that works every time). | Goes home while the hat under it spins once. | Tips the whole tower: the top hat rolls off loose and the rest settles. |
| **Bare creature** | Calls the nearest hat out of the tile: the hat pops and lands on it. With no hat in the tile it pats its head and looks into the empty holes. | The two bump bellies, boing apart and both pat their heads. | It peeks up under the other one's hat; that one lifts it like a lid. | It leans over a hole and babbles into it; the hole echoes. | Stretches like pulled foam and twangs back to its spot. |
| **Hatted creature** | Does its own trick with exactly this hat (a like, a grump or a plain pat, by its fixed taste). | Bows and tips its hat at the bare one, who claps. | The two knock hats together with a hollow "tok" and both wobble. | Tips its hat over the tile and shakes it: nothing falls out, it shrugs. | Stretches and twangs back, holding its hat on with both hands. |

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
- **Guess.** At `two-heads` and `three-heads`, yes, on purpose: there are as many hats as heads and a tapped hat goes to a bare head, so a two-year-old cannot go wrong. From `spare-hat` on, no: tapping every hat leaves a hat loose, tapping at random takes hats off heads again, and the crew is ready only when the child has seen who has one and stopped there.

## The error as a consequence

There are three ways to be off, and each shows where and why in the world, costs nothing, and leaves everything where it is (pack: game-design, errors-show-as-consequences.md).

- **One hat too many taken out.** The hat has nobody under it: it lands on the floor and scuttles about alone, bumping into feet, and every creature turns to watch it. It shows by itself that every head already has one. One tap sends it home.
- **Two hats on one head.** The tower slips over that creature's eyes and it totters about, bewildered and never hurt, while the one left bare looks from the tower to its own head and pats it. One tap on the top hat sends it home, and one drag moves it to the bare head.
- **A hat taken off again, or a head missed.** That creature stands bare in plain view, pats its head and looks at the hole its hat is in. It waits for as long as the child likes and never hurries or sulks.

The crew sets off only when every head has exactly one hat and no hat is loose. Until then nothing is judged aloud: no buzzer, no cross, no sad face turned to the child, no reset and no lost piece. Being ready is a consequence too: the creatures look at one another's hats and the parade begins.

For a two-year-old the first two positions cannot leave a hat loose or build a tower by a tap, which is the pack's exception for the youngest: a material that does not go together wrongly.

## The designed order, and what is stored

**A cycle** is one crew. Some creatures walk in bare-headed with one tile of hats; the child gives the hats out; when the crew is as paired as it can be, the cycle's change comes (one more walks in, or one walks out, never more than one at a time); the child sets the pairs right again; and when every head has exactly one hat and no hat is loose, the crew parades. Sets are five or fewer throughout: at most five heads on the mat and five hats in a tile.

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
| `crew` | The creatures on the mat in row order, at most five: each one's kind and the hats on its head from the bottom up. |
| `tile` | The hats of this cycle in hole order, at most five: each one's kind. |
| `loose` | Which hats lie loose on the floor, and beside which spot. |
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
| Wig | A wide jelly loaf; the belly wobble | slow, very heavy | the dome: pats it and wobbles all over like a struck drum | the cone: it sinks point first into Wig's soft top and has to be popped back up | the brim |
| Pip | A small bean on big flat feet; the feet | very quick, jittery | the cone: tap-dances a drum roll with its feet | the dome: it covers Pip to the feet and Pip runs in a small circle before it lifts the rim | the brim |

- A hat a creature cannot stand still counts as its one hat and stays on its head: the reaction is a short act that ends with the hat worn, grumpily. A dislike is as good to watch as a like, and never stops the parade.
- The reaction starts as the hat lands, reads from across a room, and is to exactly that hat on exactly that creature.
- No creature is ever sad at the child, thanks the child, hurries the child or refers to the child leaving or coming back. A bare creature that has to wait waits calmly.
- Each creature has its own babble (a pitch range and a rhythm of its own, invented and synthesized), its own walk and its own idle; no two share a motion.

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
