<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

The game in one paragraph: a badger's bakery before dawn. The child's finger turns flour and water into dough on the board, works it, warms it and bakes it, and each act changes how the stuff looks and how it answers the finger. Whatever order the child takes has its true result, and every result is some customer's favourite: the goat at the hatch wants the brick the bear cannot bite. The verb is choosing what to do to the material next and seeing what that does to it. Renderer: canvas 2D, as the brief suggests.

## The band and its age rule

- **Band.** The manifest band is 4 to 6, so age 4 governs the design.
- **Cue-table row.** The row for a youngest age of 3 to 4 in the age-band cue table of wordless clarity. Cues the game uses from it: a character showing one move, a breathing glow on what can be touched now, tools that appear when they first mean something, characters who gaze and reach, and materials that correct themselves (a basket a loaf fits or sticks out of). Its "Avoid" column binds the game: no text, numeral or pictorial icon that must be decoded, no spoken instruction, no verdict, never several activities live at once, and no tool on the table before it means anything. So there is no recipe card and no thought bubble with a picture in it: a customer's want is shown by its body and by the basket it carries.
- **Pack rule for the age range.** (pack: game-design, ages-4-to-6.md): pretend play with characters who react, tap and drag only, no double tap, no reading, slapstick in which the victim overreacts and is never hurt.
- **Symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, optional or not, and the game has no `symbols.ts`.
- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order: under 6, or no age, starts at `dough`; 6 or older starts at `shapes`. A saved position wins over the age. Age locks nothing: every position is reached by play from either start, and every tool that a later position brings out can be reached by a child of any age.
- **What `null` gives.** The youngest default, `dough`.

## The toy

**The action.** Pushing a finger into dough on the board. It is the action the finger performs most: mixing and kneading are the same push, and shaping is the same push with a direction.

**In an empty scene.** One cream lump of dough lies on the dark board, and nothing else is there.

- The finger lands and the dough dents under it in the same frame, with a low soft thud. The lump keeps its amount, so a push on one side bulges the other.
- A drag carries the dough along: it piles up ahead of the finger, thins behind it and folds over itself. The squish repeats along the drag, lower for a slow heavy push and higher for a quick one.
- A drag out past the edge pulls a lobe after the finger. Dough that has hardly been worked rips short with a ragged edge and plops back. Worked dough stretches a long way, thins to a neck, and springs back with a wobble and a rising note.
- A tap pats the lump a little flatter, with a slap.
- Let go and the lump jiggles and settles. Flour puffs from the board at each hard push, and the board gives a small knock.
- The answer is bigger than the touch: the push bulges the far side, the bulge shoves loose flour, the flour puffs, and the puff drifts and settles as dust that the next drag draws furrows in.

**Why it is a pleasure with no goal.** The dough follows the finger and pushes back, it never does the same thing twice, and it cannot be done wrong: a poke, a slap, a long smear and a frantic scribble all give a different squash and a different sound. Worked dough slowly goes from lumpy and torn to smooth and springy, so the hand feels its own work without anything saying so. Someone watching sees at once that the child is kneading dough.

The demo this comes from asked whether kneading and shaping dough with a finger is a pleasure by itself. The game takes that question as its toy and writes it new.

## The object-by-action grid, and what is new on day 15

Whatever is being made lies on the peel, a flat wooden shovel that is also the kneading board. The child carries the peel by its handle between three places: the warm nook over the oven, the cold window sill, and the oven. Six objects, five actions. Every cell works, and none refuses.

| | Put it on the peel | Push it with the finger | Carry it to the warm nook | Carry it into the oven | Hand it over at the hatch |
| --- | --- | --- | --- | --- | --- |
| **Flour** | A heap slumps out with a soft hiss and a white puff; the badger sneezes. | Furrows in the dust, and a cloud at each quick stroke. | Nothing changes: warm dust. The badger peers at it and shrugs. | Comes out toasted brown with a wisp of smoke, and is still dust. | The customer sneezes a white cloud and comes out of it white all over. |
| **Water** | A puddle spreads to the rim with a gurgle and drips off the edge. | Splashes and rings, each with a plip. | A thin curl of steam. Still water. | A long hiss, a cloud of steam out of the door, and the peel comes back dry. | The customer is splashed and shakes itself dry. The duck gets in and paddles. |
| **The bubbly jar** | A blob plops out and burps. | Slimy strings follow the finger and bubbles pop. | Froths up, swells over the rim and burps louder. | Bakes into a thin crisp disc full of holes. | The customer sniffs, and its whole face puckers at the sour. |
| **Seeds** | They scatter, bounce and roll, ticking. | They skitter away from the finger. | Nothing changes. One seed rolls over. | They toast, crackle and hop on the peel. | The hen's chicks swarm the peel and peck it clean. Anyone else gets a seed stuck in a tooth. |
| **Dough** | Flour and water under the finger turn from streaky to shaggy to smooth; dropped back on the peel it slaps, squashes and jiggles. | Dents, bulges, folds and stretches (the toy). A push on risen dough knocks the air out with a long sigh. | With the bubbly in it, it swells, domes and wobbles, with small ticking bubbles. Without, it only goes warm and shiny. | Turns gold. What it has become shows when it comes out: crumbly, a brick, or airy. | Raw dough goes gooey: strings stretch from the customer's teeth to the hatch and snap back. The badger loves it. |
| **A baked bread** | An airy loaf lands with a soft bounce and a sigh; a brick lands with a thunk that makes the peel jump and all the flour hop. | An airy loaf squashes with a wheeze and springs back, crackling; a brick does not give, and the badger knocks on it; a crumbly loaf sheds crumbs. | A curl of steam. It stays warm and stays what it is. | Gold goes dark, and dark goes black with a puff of smoke the badger fans away. | The customer's own reaction to exactly this bread: its shape, its crumb, its crust and its seeds. |

More water than flour gives batter, which runs, cannot be shaped, and bakes into a flat pancake. A pour too many runs off the peel: flour lands on the badger, who turns white and shakes it off, and water lands on its feet, and it hops.

**New on day 15.** The child bakes on purpose. They know that kneading is what stops a loaf crumbling, that the bubbly and the warm nook together make it rise and neither does alone, and that the oven cannot be undone. They know who wants which bread, make a long dark seeded loaf for two customers at once, and hand the bear a brick only to see what its tooth does.

## The representation

**The idea.** A material looks different and answers the hand differently after something is done to it, and the child who did it sees the change.

**How it appears.** As one lump of stuff on a dark board, whose outline, surface, size, sound and answer to the finger are its properties, and nothing else is.

| What was done | What the stuff is now | How it looks | How it answers the finger |
| --- | --- | --- | --- |
| Flour tipped out | Dust | A grainy heap with a soft slumped edge | Parts into furrows, puffs |
| Water added, not yet worked | Streaky | Wet patches and dry patches, a ragged edge | Smears, sticks to the finger |
| Worked a little | Shaggy dough | A lumpy outline, torn places | Rips short when pulled |
| Worked well | Smooth dough | A taut round outline, a sheen | Stretches far and springs back |
| More water than flour | Batter | Flat, shiny, creeping outwards | Splashes and closes over |
| The bubbly in it, in the warm nook | Risen dough | Larger, domed, with small bubbles under the skin | Wobbles, dimples slowly, sighs when pushed |
| In the oven | Baked | Gold instead of cream, with a hard edge | Does not flow or stretch any more; knocks, crackles or sheds crumbs |

- The stuff keeps its amount: a push bulges it elsewhere, and rising makes it larger because air is in it, which pushing lets out again.
- The model is true wherever it shows a change. Dough without the bubbly does not rise, in the nook or anywhere. Dough with it does not rise on the cold sill in the length of a visit, rises slowly on the board, and rises quickly in the nook. Unworked dough bakes crumbly, and unrisen dough bakes dense. Baking is not undone: a brick stays a brick. Nothing changes because time passed while the game was parked.
- What is left out is said here and not shown as science: salt, the amounts by weight, and how long real dough takes. The game shows the bubbly as a jar of flour and water that is alive with bubbles, and does not explain it.

**Evidence.** This representation has no trial behind it. Handling real materials and seeing them change, in cooking and at a sand or water table, is school practice for this age, and the game is a picture of that practice. The pack's research files hold no tested representation for changes of material.

**Object, picture, symbol.** The band starts below 6, so the order stops at the picture. Here the picture is the simulated stuff itself. There is no symbol stage, no recipe card and no icon for a step.

**Working objects stay plain.** The stuff is the working object: bare cream, with no face, no pattern and no motion of its own except settling and rising, on a dark board. Baked, it is plain gold. The look goes on the badger, the customers, the oven and the room.

## The four mechanic questions

- **Swap.** No: every result in the game is what that act does to that material, so another subject would need a different table of results and would play differently.
- **Attention.** At the moment of decision the child looks at the stuff on the peel (is it dust, shaggy, smooth, risen, gold?) and at the customer's body and basket, and thinks about what the next act will turn the stuff into.
- **Fun.** The skill is used in the most enjoyable moments: the push into the dough, the door opening on what the oven made of it, and the customer's bite.
- **Guess.** Random tapping always makes something, and for a customer with one want it will sometimes be the wanted bread, which is meant: most tries succeed. For two or three wants at once it rarely is. Trying every option is not a way round the idea either, because each try ends in a different bread whose difference the child sees and the customer acts out.

## The error as a consequence

There is no wrong bread, only a bread this customer does not want. The game runs whatever the child made and shows what it is.

- **Before the oven** every state can be mended in place, and it shows on the stuff itself. Dust that will not hold together takes water. Batter that runs takes flour. Shaggy dough that rips takes more pushing. Flat dough that has the bubbly in it rises when it is carried to the nook.
- **Out of the oven** the bread shows what was missing by what it does: a crumbly loaf sheds crumbs when it is touched, a brick lands with a thunk and the badger knocks on it, a pancake hangs limp over the edge of the peel.
- **At the hatch** a customer that does not want the bread shows one reason, the first that applies, with its own body and at the bread: it sneezes at dust, pulls gooey strings from raw dough, clonks a tooth on a brick, watches a crumbly loaf fall through its paws, holds a round loaf against its long basket where it does not fit, looks at a gold crust and then at its own black wing, pecks a bare crust and finds no seed.
- **The state stays.** The bread goes back where it came from, the peel or the rack, unharmed. The customer stays and keeps wanting the same thing. Nothing is taken away and nothing resets.
- **One thing to change.** A bread that is too pale goes back in the oven. One that lacks what cannot be added after baking is made again: flour and water are never used up, and a new dough is a few pushes away. The unwanted bread is still somebody's favourite, and the child can keep it on the rack, give it to the next customer, or feed it to the badger.
- **Nothing gives a verdict.** No buzzer, no cross, no face turned to the child. A customer's feelings are about the bread. A wanted bread is also a consequence: it is eaten.

## The designed order, and what is stored

**The order.** Eight positions, one new thing each and then combinations. The ids are those of `LADDER` in `config.ts`; each names a place in the game's own order.

| Position id | The one new thing | Who brings it | What comes out onto the table |
| --- | --- | --- | --- |
| `dough` | Flour and water, pushed together, make dough, and the oven sets it. How much it was pushed decides whether it holds or crumbles. | The goat (wants it hard) and the sparrows (want it crumbly) | Flour sack, water jug |
| `shapes` | Pulling worked dough makes it long, and gathering it makes it round again. | The dachshund (long) | Nothing new |
| `rising` | The bubbly worked in, then the warm nook, makes dough rise; the oven keeps the air in. | The bear (airy) | The bubbly jar |
| `crust` | A bread that goes back in the oven comes out darker, and then black. | The crow (dark or black) | Nothing new |
| `seeds` | Seeds pressed onto raw dough stay on through the oven; on a baked crust they roll off. | The hen (seeded) | The seed dish |
| `batter` | More water than flour gives batter, which runs and bakes flat. | The duck (a pancake) | Nothing new |
| `pairs` | Nothing new: two customers at the hatch together, and one bread for both. | Any two whose wants can meet in one bread | Nothing new |
| `trios` | Nothing new: three wants in one bread. | Three customers together, or the mole, who has three wants alone | Nothing new |

- A want is one property of the bread: its crumb, its shape, its crust or its seeds. A single customer has one want, a pair two, and a trio or the mole three. No group has more than three (see the records, where that number comes from a Limits section).
- A tool comes out when the first customer who needs it steps up, the badger shows its use once, and it stays out for good. The nook, the sill and the oven are part of the room from the start.
- The same order deepens without new content: the opposite want on the same idea (hard and crumbly, airy and hard), then wants combined, then three at once.

**A harder option looks harder, and the child picks it.** Up to two customers or groups wait in the lane outside the window. Two or three animals standing together with their baskets is plainly more to please than one. The child calls in whichever they like by touching it, and may send the one at the hatch back to the lane the same way at any time, without a reaction from it.

**How the lane is filled.** When a place in the lane is free it is filled by a seeded pick: first from the customers of the current position, otherwise from those of earlier positions, and never an animal that is already at the hatch or in the lane.

**Which customer a new position lays out.** The position moves when a cycle is judged, and those in the lane were laid out before that. So a new position first shows on the customer who joins the lane after the next one is called in: the customer after next.

**How a cycle is judged.** A cycle is one customer or group, from stepping up to leaving with a bread. It is judged only when that customer was laid out from the current position.

- Well: they left with a bread they wanted, and at most one bread was handed back first. The position moves up one.
- Mixed: two breads were handed back first, or they left happy with something that is not a bread they came for (the hen with loose seeds, the duck with a puddle). The position stays.
- Badly: three or more breads were handed back first. The position moves down one.
- A customer sent back to the lane has not finished a cycle, and nothing is judged. Nothing shows the position or that it moved.

**Every field of the saved state.**

| Field | What it holds |
| --- | --- |
| `v` | The version of the shape. |
| `position` | The id of the place in the order where the next cycle is judged. |
| `finished` | The hatch is empty after an ending, and stays so until the child calls someone in. |
| `shown` | The ids of the ideas the badger has already shown, so none is shown twice. |
| `tools` | Whether the bubbly jar is out, and whether the seed dish is out. |
| `peel` | Where the peel is (board, nook, sill or oven) and what lies on it: nothing, raw stuff, or a bread. |
| raw stuff | Flour (0 to 3), water (0 to 3), bubbly (yes or no), seeds (yes or no), work (0 to 12), long (yes or no), rise (0 to 100), and how far the bake has got (0 to 100). |
| a bread | Its crumb, its shape, its crust and whether it has seeds. |
| `rack` | Four places, each empty or holding a bread the child put there. |
| `hatch` | Who is at the hatch (one to three animals), the position they were laid out from, and how many breads they have handed back. |
| `lane` | Up to two waiting customers or groups, each with the same three things. |
| `seed` | The state of the seeded stream that fills the lane. |

- A thing in the hand is saved where it came from. An ending's outcome is saved when the ending starts.
- Rising and baking run on attended game time only, are saved as the two numbers above, and stop at full and stay there. No clock is read.
- The largest legal state is far under half of 64 KB, and a test says so.

## The characters and their fixed tastes

Every customer looks like the bread it wants, so a child can learn the tastes, guess a new one from the animal, and test it on purpose. A want is shown by the body and by the basket each carries, which the right bread fits. Tastes never change.

| Character | Its want, always visible | Loves | What it does with the bread it does not want most |
| --- | --- | --- | --- |
| The goat | Knocks its horns on the hatch post, tock tock | A hard, dense bread: worked, never risen | An airy loaf squashes onto a horn and sits there like a hat |
| The sparrows | A row on the ledge, pecking at nothing | A crumbly bread: hardly worked, so it falls to crumbs | Beaks go tink on a brick and the whole row bounces off |
| The dachshund | Stretches, long basket in its teeth | A long bread | A round loaf rolls off the long basket and it chases it round its own tail |
| The bear | Puffs its cheeks, pats its round belly | An airy bread | A tooth clonks on a brick and rings; the bear looks at the tooth, then knocks on the bread |
| The crow | Preens one black wing and holds it out | A dark or black crust | Holds a gold loaf against its wing, then turns its back on it |
| The hen | Chicks pecking round her feet | Seeds on top. Also loose seeds, with nothing under them | The chicks peck a bare crust, find nothing, and all look up at once |
| The duck | Slaps its flat feet, bill open | A pancake. Also a puddle, to paddle in | A tall loaf slides off its flat bill |
| The mole | Small, pale, soft, blinking | An airy, round, gold loaf: soft and pale as itself | A black crust leaves it with a sooty nose, and it sneezes soot |
| The badger (the baker, not a customer) | Its bench and its oven; it stokes, wipes, and tastes | Raw dough, licked off a paw | Coughs a small black cloud at a burnt bread, and eats it anyway |

- A reaction is to the exact thing handed over, starts as the bread arrives, and is as good to watch when it is disgust as when it is delight. No feeling is about the child, and no one thanks, praises, pleads or hurries.
- In a pair or a trio each animal keeps its own want, and the one whose want is not met is the one who shows it.
- The badger notices only what is in front of it. Flour tipped while it stokes the oven lands on its back, and it finds out when it turns round.
- The badger is the one who shows a new idea, knocks on what comes out of the oven, and eats anything it is handed, which is how the rack is cleared.

## The scenes

Three kinds of scene. Each is a list of timed beats on game time, built on `scene.ts`, and each gives way to any touch at once.

**The showing** (4 to 8 seconds, once for each of the six ideas `dough` to `batter`).

- Cause: the first customer whose want needs an idea not yet shown steps up to the hatch. On a first visit that is the goat, so the badger is already at it when the game opens.
- Beats: the badger looks at the customer; does the one new act on a small lump of its own at the back of the bench; the lump answers with the change; the badger looks at the child's peel and steps back.
- Filled in from: which idea it is. It shows the new act only, on the badger's lump, never the bread the customer wants and never on the child's peel.
- Any touch ends it. It is marked as shown when it starts, so it is never played again.

**The ending** (6 to 9 seconds, and it may hold longer).

- Cause: the child hands over a bread the customer wants.
- Beats: a sniff; the bite or peck, on exactly this bread with its shape, crumb, crust and seeds; the customer's own delight (the goat cracks it on its horns and crunches, the dachshund gets the long loaf stuck across the lane and turns sideways, the chicks carry the loaf off on their backs); off down the lane; the hatch stands empty.
- Filled in from: who it is and what the bread is, so it differs with every bread.
- Any touch skips to the empty hatch. The outcome is saved when the ending starts.

**A secret** (4 to 6 seconds, always from the same combination, never hinted at and never counted).

- Loose seeds handed to the hen: the chicks ride the peel back into the bakery.
- A puddle handed to the duck: it climbs onto the peel and paddles.
- Flour tipped onto the badger's back: it turns, white all over, and shakes like a wet dog.

What the oven makes, and a bread handed back, are reactions and not scenes: they last under two seconds, run beside the child's touch and block nothing.

**How a cycle ends and the next starts.** The ending leaves the hatch empty and the bakery as it is, for as long as the child likes. Those in the lane go on with their own routines; none looks at the child, hurries or complains. Nothing starts until the child touches someone in the lane, who then steps up. On load no scene replays: the game opens on the state the last one ended in, with whoever was waiting still waiting. Breads on the rack stay where the child put them, and feeding them to the badger is the calm way to tidy up.

## The records

One heading per jurisdiction, never one list or table that pairs them; a game with no learning goal has no records part.

Standings and check states are as the lookup printed them on 2026-10-03. The descriptions are the game's own words.

### us-ca

Level: `preschool-tk`. Age mapping: official, as the lookup prints. Sub-bands as printed: at age 4 the earlier range (3 to 4½ years) and the later range (4 to 5½ years) both apply; at age 5 the later range, which runs to five and a half.
Gap: none printed. At ages 5 and 6 the lookup also returns `kindergarten`, at age 6 `grade-1`, and beside them the `cross-grade` lane, labelled cross-grade. The game is designed from no record of those three lanes.

No record in this jurisdiction at kindergarten, grade 1 or cross-grade carries the game's idea, so for a child past five and a half the game names no California record and nothing in its place.

A foundation's code restarts in every domain, so each record is cited by pack id.

- `edu.us-ca.preschool-tk.science.objective.science-strand-2-0-physical-science-2-3` (code 2.3, Science, Strand 2.0): department-published-foundation, confirmed. What the game takes: a child explores with the senses how materials change. In the game the child does something to the stuff and sees and hears that it has changed.
  Limits taken: the kinds of change in the record are examples: colour, shape, texture and temperature at both ages, with form added at the later age. The game shows colour (cream to gold to black), shape (round, long, risen), texture (dusty, shaggy, smooth, crumbly) and form (dust and water become dough). Temperature cannot be felt on a screen and shows only as steam. The record does not ask for a scientific explanation, and the game gives none. Left open by Limits: which materials and which acts; flour, water, the bubbly and seeds, and pushing, warming and baking, are the game's own choice. Describing and explaining are in the record and not in the game, which is wordless and cannot hear: they are left to the child and whoever sits beside them.
- `edu.us-ca.preschool-tk.science.objective.science-strand-2-0-physical-science-2-1` (code 2.1, Science, Strand 2.0): department-published-foundation, confirmed. What the game takes: a child explores materials and what they are like. In the game dust, water, dough and bread each look, sound and answer the finger in their own way.
  Limits taken: the properties in the record are examples and not a checklist; it asks for describing, not for explaining why materials differ; it sets no number of materials. The record groups materials as solid or not solid at the earlier age and as solid, liquid or gas at the later age: the game shows a powder, a liquid and solids, names none of them and asks for no sorting. Left open by Limits: the number of materials; four is the game's own choice. Describing is again left to the child.
- `edu.us-ca.preschool-tk.science.objective.science-strand-1-0-science-and-engineering-practices-1-5` (code 1.5, Science, Strand 1.0): department-published-foundation, confirmed. What the game takes: finding out what will happen by trying it. In the game every act can be tried, and its true result shows at once.
  Limits taken: adult support is stated for the checking at the earlier age and for planning the check at the later age; talking about why a prediction held is only beginning at the later age; no topic is named. The game gives the trying and the result. It does not ask for a prediction or a reason and cannot hear one: saying what will happen is left to the child and whoever sits beside them. Left open by Limits: the topic; bread is the game's own choice.
- `edu.us-ca.preschool-tk.practical-life-feelings.objective.approaches-to-learning-strand-2-0-executive-functioning-2-1` (code 2.1, Approaches to Learning, Strand 2.0): department-published-foundation, confirmed. What the game takes: keeping a few pieces of information in mind and acting on them through a task of several steps. In the game those pieces are what the customer wants, held from the first pour to the hatch.
  Limits taken: about one or two pieces at the earlier age and about two or three at the later age, as ranges and not examples; adult support is part of both statements. So a single customer has one want, a pair two, a trio or the mole three, and no group has more. The customer stays at the hatch showing its want the whole time, which stands where the record has an adult's support. Left open by Limits: the number of steps and the length of time; up to four acts in one bread, at the child's own pace, is the game's own choice.

### nl

Level: `fase-1`. Age mapping: convention, as the lookup prints. Sub-bands as printed: groep 1 at age 4, groep 1 or groep 2 at age 5, groep 2 or groep 3 at age 6.
Gap: none printed. At age 4 the lookup also returns `peuters`, for a child who has only just turned four, and at every age the `einde-po` lane, labelled end-of-primary goals. The game is designed from no record of either.

None of these four is a core goal, so none has a regime. Each describes what a school can offer in fase 1, not what a child must be able to do.

- `edu.nl.fase-1.science.objective.13f0a068-94bf-4ccf-9e14-a72369056a80` (`nl ojw/pdm/3/02/fase1`): curriculum-institute-guidance, confirmed. What the game takes: realising that food usually has to be processed and prepared before it is eaten. In the game bread is made from flour and water in front of the child, by the child.
  Limits taken: the statement says "usually", so it leaves room for food eaten as it is, and the game does not say all food is made. Left open by Limits: the food, the kind of preparing and the place; bread, baking and a bakery are the game's own choice.
- `edu.nl.fase-1.science.objective.ecc1e9b1-b39e-4920-96a2-a877bd5caeed` (`nl ojw/nattech/1/01/fase1`): curriculum-institute-guidance, confirmed. What the game takes: exploring and discovering properties of materials and substances. In the game the child finds by touch that flour is dusty, water runs, dough stretches and bread is hard.
  Limits taken: measuring is not mentioned, and the game measures nothing. Left open by Limits: which properties, materials and substances; those above are the game's own choice. Limits says the statement does not say whether changes are meant. That a material changes is therefore beyond this record, and in the game it is the game's own choice.
- `edu.nl.fase-1.science.objective.9b4f69ee-01e3-47fe-aca0-f042ce526bc5` (`nl ojw/nattech/2/02/fase1`): curriculum-institute-guidance, confirmed. What the game takes: discovering and wondering about heat. In the game the same dough does one thing in the warm nook, another on the cold sill and a third in the oven.
  Limits taken: the verbs are discovering and wondering, with no explaining, measuring or rule, and the game states none. Of the five subjects the statement names, the game takes temperature only, for which the brackets name heat. The statement gives no safety condition for heat, and the game makes no safety claim: only the peel goes into the oven. Left open by Limits: the apparatus; a nook, a sill and an oven are the game's own choice.
- `edu.nl.fase-1.mathematics.objective.3a5d0830-68ef-4f22-a3be-46239d1168cf` (`nl rw/m/6/04/fase1`): curriculum-institute-guidance, confirmed. What the game takes: putting events in order of time. In the game the child decides which act comes before which by doing them, and a different order gives a different bread.
  Limits taken: none stated. Left open by Limits: the number of events, the span of time and the means; up to four acts in one bread, in game time, with no pictures to arrange, is the game's own choice.

Not used: `edu.nl.fase-1.science.objective.f68683c7-1b22-45af-a553-8b704ef5a296` (`nl ojw/nattech/3/04/fase1`), on working with a simple drawing or manual. The game gives the child no drawing and no manual, because a picture of steps would have to be decoded at four, so that record does not carry what the child does here.

### Where the two differ

- **Standing.** The California records are foundations published by a state department. The Dutch records are guidance from the curriculum institute. Neither is a standard or the law, and each is named in its own words.
- **Age.** The California foundations named here reach to five and a half, and nothing is named for an older child. The Dutch guidance covers the whole band. For a six-year-old the game rests on the Dutch records alone.
- **Change.** The California foundation coded 2.3 is about materials changing. The Dutch statement on materials does not say whether changes are meant. The game follows the California foundation in showing changes, and for the Netherlands that part is the game's own choice.
- **Order.** California has a foundation on holding information in mind through several steps, with stated amounts. The Netherlands has a mathematics goal on ordering events in time, with no amounts. They are different things. The cap of three wants comes from the California record's Limits; the child deciding the order of acts is what the Dutch goal carries.
- **Food and heat.** The Netherlands has a statement that food is prepared and one that names heat as something to wonder about. The California records named here say nothing of food, and name temperature only as an example of a change. The bakery and its three temperatures follow the Dutch records.
- **Talk.** The California foundations ask a child to describe, predict or explain. The game is wordless on the kid side and follows them only as far as exploring, trying and seeing.

### The claim

Bread Day is designed from four of California's preschool and transitional kindergarten learning foundations (foundations published by a state department, not standards; each confirmed), which reach to age five and a half, and from four fase 1 goals of the Dutch curriculum institute (guidance, not law; each confirmed). What it takes from them is this and no more: a child does something to a material and sees that it then looks and answers the hand differently; tries an act and finds out what it does; keeps up to three wants in mind through a task of several steps; and decides the order of those steps by doing them. That dough rises, and why, is in no record of either jurisdiction, and neither are mixing and baking as such: the game shows them as changes a child can see. For a child older than five and a half the game is designed from the Dutch guidance alone.

## The look

Written after the style spike, not part of the sheet: the claimed look, the palette, materials, lighting and motion rules, and how each tier in `config.ts` keeps the look.
