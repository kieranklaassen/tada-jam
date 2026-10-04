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
- A drag carries the dough along: it piles up ahead of the finger and thins behind it. The squish repeats along the drag, lower for a slow heavy push and higher for a quick one.
- A drag out past the edge pulls a lobe after the finger. Dough that has hardly been worked rips short with a ragged edge and plops back. Worked dough stretches a long way, thins to a neck, and springs back with a wobble and a rising note.
- A tap pats the lump a little flatter, with a slap.
- Let go and the lump jiggles and settles. Flour puffs from the board at each quick push, and the board gives a small jolt.
- The answer is bigger than the touch: the push bulges the far side, a quick push sends flour up in a puff, and the board jolts. In the game, where the badger stands at its bench, it also leans in to look.

**Why it is a pleasure with no goal.** The dough follows the finger and pushes back, it never does the same thing twice, and it cannot be done wrong: a poke, a slap, a long smear and a frantic scribble all give a different squash and a different sound. Worked dough slowly goes from lumpy and torn to smooth and springy, so the hand feels its own work without anything saying so. Someone watching sees at once that the child is kneading dough.

The demo this comes from asked whether kneading and shaping dough with a finger is a pleasure by itself. The game takes that question as its toy and writes it new.

## The object-by-action grid, and what is new on day 15

Whatever is being made lies on the peel, a flat wooden shovel that is also the kneading board. The child carries the peel by its handle between three places: the warm nook over the oven, the cold window sill, and the oven. Six objects, five actions. Every cell works, and none refuses.

| | Put it on the peel | Push it with the finger | Carry it to the warm nook | Carry it into the oven | Hand it over at the hatch |
| --- | --- | --- | --- | --- | --- |
| **Flour** | A heap slumps out with a soft hiss and a white puff; now and then the badger sneezes. | Furrows part in the dust with a dry scrape, and a cloud puffs up at each quick stroke. | Stays dust: a few grains slide with a faint patter, and the badger peers at it and shrugs. | Comes out toasted brown behind a wisp of smoke, settles with a dry rustle, and is still dust. | The customer sneezes a white cloud, or bathes in one (the sparrows), turns grey in one (the crow) or digs in with a dry scrape (the mole), and comes out of it white all over. |
| **Water** | A puddle spreads to the rim with a gurgle and drips off the edge. | Splashes and rings, each with a plip. | A thin curl of steam rises with a faint simmering tick. Still water. | A long hiss, a cloud of steam out of the door, and the peel comes back dry. | The customer is splashed with a slosh and shakes itself dry, or wrings out a paw (the bear), lifts her chicks out (the hen) or wipes its spectacles (the mole). The duck, alone at the hatch, gets in and paddles. |
| **The bubbly jar** | A blob plops out and burps. | Slimy strings follow the finger and bubbles pop. | Froths up, swells and burps louder. | Bakes into a thin crisp pancake, which pings as it cools. | The customer sniffs, and its whole face puckers at the sour with a drawn-in squeak. |
| **Seeds** | They scatter, bounce and roll, ticking. | They skitter away from the finger with a quick rattle. | They stay as they are. One seed rolls over with a single tock. | They toast, crackle and hop on the peel. | When the hen is alone at the hatch her chicks swarm the peel and peck it clean with a patter of beaks. Anyone else gets a seed stuck in a tooth and works at it with a click of the tongue. |
| **Dough** | Flour and water under the finger turn from streaky to shaggy to smooth; dropped back on the peel it slaps, squashes and jiggles. | Dents, bulges and stretches (the toy). A push on risen dough knocks the air out with a long sigh. | With the bubbly in it, it swells, domes and wobbles, with small ticking bubbles. Without, it only goes warm and shiny and slumps a little with a soft squelch. | Turns gold, and the door opens on it with a warm whoosh. What it has become shows and sounds as the peel sets down: a crumbly loaf rustles, a brick clunks, an airy loaf crackles. | Raw dough goes gooey: strings stretch from the customer's teeth to the hatch and snap back with a twang. The badger loves it. |
| **A baked bread** | An airy loaf lands with a soft bounce and a sigh; a brick lands with a thunk that makes the peel jump and all the flour hop. | An airy loaf squashes with a wheeze and springs back, crackling; a brick does not give, and the badger knocks on it; a crumbly loaf sheds crumbs. | Its crust ticks once as it warms and the air above it shimmers. It stays what it is. | Gold goes dark with a low sizzle, and dark goes black with a pop and a puff of smoke the badger fans away. | The customer's own reaction to exactly this bread: its shape, its crumb, its crust and its seeds, with that customer's own sound. |

More water than flour gives batter, which runs, cannot be shaped, and bakes into a flat pancake. A pour too many runs off the peel: flour lands on the badger, who turns white and shakes it off, and water lands on its feet, and it hops. Water over a full peel takes a scoop of flour with it, so what is left is wetter.

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
- **Out of the oven** the bread shows what was missing by what it does: a crumbly loaf sheds crumbs when it is touched, a brick lands with a thunk and the badger knocks on it, a pancake lies flat on the peel and flops when it is touched.
- **At the hatch** a customer that does not want the bread shows one reason, the first that applies, with its own body and at the bread: it sneezes at dust or wallows in it, pulls gooey strings from raw dough, clonks a tooth on a brick, watches a crumbly loaf fall through its paws, sets a pancake on its long basket, where it rocks and does not fit, looks at a gold crust and then at its own black wing, pecks a bare crust and finds no seed.
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

**A harder option looks harder, and the child picks it.** Two customers or groups at most are laid out to wait in the lane outside the window, and one sent back from the hatch waits there with them. Two or three animals standing together with their baskets is plainly more to please than one. The child calls in whichever they like by touching it, and may send the one at the hatch back to the lane the same way at any time, without a reaction from it.

**How the lane is filled.** Whenever fewer than two wait in the lane and an animal is free, a place is filled by a seeded pick: first from the customers of the current position, otherwise from those of earlier positions, and never an animal that is already at the hatch or in the lane. At `dough` there are only the goat and the sparrows to pick from, so while one is at the hatch one waits and the second place stays empty. A customer sent back from the hatch rejoins the lane as it is, with the position it was laid out from and its count of breads handed back, so the lane holds three at most, and no pick is made until fewer than two wait again.

**Which customer a new position lays out.** The position moves when a cycle is judged, and those in the lane were laid out before that. So a new position first shows on the customer who joins the lane after the next one is called in: the customer after next. Where the lane has an empty place when the cycle is judged, as it has at `dough`, the pick fills it from the new position at once, and that customer waits in the lane for the child's touch like the rest.

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
| `finished` | The hatch is empty, after an ending or after the child sent the customer back to the lane, and stays so until the child calls someone in. |
| `shown` | The ids of the ideas the badger has already shown, so none is shown twice. |
| `tools` | Whether the bubbly jar is out, and whether the seed dish is out. |
| `peel` | Where the peel is (board, nook, sill or oven) and what lies on it: nothing, raw stuff, or a bread. |
| raw stuff | Flour (0 to 3), water (0 to 3), bubbly (yes or no), seeds (yes or no), work (0 to 12), long (yes or no), rise (0 to 100), and how far the bake has got (0 to 100). |
| a bread | Its crumb, its shape, its crust and whether it has seeds. |
| `rack` | Four places, each empty or holding a bread the child put there. |
| `hatch` | Who is at the hatch (nobody, or one to three animals), the position they were laid out from, and how many breads they have handed back. |
| `lane` | Up to three waiting customers or groups (two laid out by the pick, and one more after a customer is sent back from the hatch), each with the same three things. |
| `seed` | The state of the seeded stream that fills the lane. |

- A thing in the hand is saved where it came from. An ending's outcome is saved when the ending starts.
- What the finger leaves on the surface is short-lived and is not saved: the dents and pats of a lump settle out within about a second of the finger lifting, and loose dust and the furrows in it fade over a few seconds of game time. On load the stuff is drawn from its fields alone: dust, a puddle, a blob of the bubbly, loose seeds, batter, or a round or long lump, each at its work, its rise and its bake. Flour or water on the badger or a customer, strings of raw dough, soot on a nose and a loaf on the goat's horn last no longer than the reaction or the secret they belong to (a reaction under two seconds, a secret 4 to 6), never change the bread, and are never saved: on load they are gone, and no secret resumes or replays.
- Rising and baking run on attended game time only, are saved as the two numbers above, and stop at full and stay there. No clock is read.
- The largest legal state is far under half of 64 KB, and a test says so.

## The characters and their fixed tastes

Every customer looks like the bread it wants, so a child can learn the tastes, guess a new one from the animal, and test it on purpose. A want is shown by the body and by the basket each carries, which the right bread fits. Tastes never change.

| Character | Its want, always visible | Loves | What it does with the bread it does not want most |
| --- | --- | --- | --- |
| The goat | Knocks its horns on the hatch post, tock tock | A hard, dense bread: worked, never risen | An airy loaf squashes onto a horn and sits there like a hat |
| The sparrows | A row on the ledge, pecking at nothing | A crumbly bread: hardly worked, so it falls to crumbs | Beaks go tink on a brick and the whole row bounces off |
| The dachshund | Stretches, a long basket strapped along its back | A long bread | A round loaf rolls off the long basket and it chases it round its own tail |
| The bear | Puffs its cheeks, pats its round belly | An airy bread | A tooth clonks on a brick and rings; the bear looks at the tooth, then knocks on the bread |
| The crow | Preens one black wing and holds it out | A dark or black crust | Holds a gold loaf against its wing, then turns its back on it |
| The hen | Chicks pecking round her feet | Seeds on top. Also loose seeds, with nothing under them | The chicks peck a bare crust, find nothing, and all look up at once |
| The duck | Slaps its flat feet, bill open | A pancake. Also a puddle, to paddle in | A tall loaf slides off its flat bill |
| The mole | Small, pale and soft, hugging a round basket lined with pale down and pressing its cheek into it | An airy, round, gold loaf: soft and pale as itself | A black crust leaves it with a sooty nose, and it sneezes soot |
| The badger (the baker, not a customer) | Its bench and its oven; it glances at the fire, rolls its shoulders, and tastes whatever it is handed | Raw dough, licked off a paw | Coughs a small black cloud at a burnt bread, and eats it anyway |

- A reaction is to the exact thing handed over, starts as the bread arrives, and is as good to watch when it is disgust as when it is delight. No feeling is about the child, and no one thanks, praises, pleads or hurries.
- In a pair or a trio each animal keeps its own want, and the one whose want is not met is the one who shows it.
- The badger is slow to notice what lands on it. Flour tipped once too often leaves it white all over for a moment before it finds out.
- The badger is the one who shows a new idea, knocks on a brick fresh from the oven, and eats anything it is handed, which is how the rack is cleared.

## The scenes

Three kinds of scene. Each is a list of timed beats on game time, built on `scene.ts`, and each gives way to any touch at once.

**The showing** (4 to 8 seconds, once for each of the six ideas `dough` to `batter`).

- Cause: the first customer whose want needs an idea not yet shown steps up to the hatch. On a first visit a customer is already at the hatch when the game opens and the badger is already at the showing: the goat for a visit that starts at `dough`, the dachshund for one that starts at `shapes`. Where a want needs two ideas not yet shown, as the dachshund's does on a first visit at `shapes`, the two showings play one after the other in the designed order, each on the badger's own lump, and any touch ends the one that is playing.
- Beats: the badger bends to a small lump of its own at the back of the bench; does the one new act on it; the lump answers with the change; the badger straightens up.
- Filled in from: which idea it is. It shows the new act only, on the badger's lump, never the bread the customer wants and never on the child's peel. So no showing ends on a baked bread someone at the hatch could want: the showing for `dough` ends as the lump goes into the oven, those for `seeds` and `batter` leave their lump unbaked, and going back into the oven is shown on a heap of toasted flour.
- Any touch ends it. It is marked as shown when it starts, so it is never played again.

**The ending** (6 to 9 seconds, and it may hold longer).

- Cause: the child hands over a bread the customer wants.
- Beats: a sniff; the bite or peck, on exactly this bread with its shape, crumb, crust and seeds; the customer's own delight (the goat cracks it on its horns and crunches, the dachshund gets the long loaf stuck across the lane and turns sideways, the chicks carry the loaf off on their backs); off down the lane; the hatch stands empty.
- Filled in from: who it is and what the bread is, so it differs with every bread.
- Any touch skips to the empty hatch. The outcome is saved when the ending starts.

**A secret** (4 to 6 seconds, always from the same combination, never hinted at and never counted). The hen's and the duck's end as an ending does: the customer goes off down the lane, the peel is back on the board empty, the hatch stands empty, and that outcome is saved when the secret starts. The badger's leaves nothing behind.

- Loose seeds handed to the hen when she is alone at the hatch: the chicks ride the peel back into the bakery, peck it clean, and hop out again after her.
- A puddle handed to the duck when it is alone at the hatch: it climbs onto the peel, paddles, and waddles off down the lane.
- Flour tipped once too often onto the badger: it stands white all over, and shakes like a wet dog.

What the oven makes, and a bread handed back, are reactions and not scenes: they last under two seconds, run beside the child's touch and block nothing.

**How a cycle ends and the next starts.** The ending leaves the hatch empty and the bakery as it is, for as long as the child likes. Those in the lane go on with their own routines; none looks at the child, hurries or complains. Nothing starts until the child touches someone in the lane, who then steps up. On load no scene replays: the game opens on the state the last one ended in, with whoever was waiting still waiting. Breads on the rack stay where the child put them, and feeding them to the badger is the calm way to tidy up.

## The records

One heading per jurisdiction, never one list or table that pairs them; a game with no learning goal has no records part.

Standings and check states are as the lookup printed them on 2026-10-03. The descriptions of the California records are the game's own words or the record's Summary, which is the pack's text. Those of the Dutch records follow the pack's English gloss, which is not an official translation.

### us-ca

Level: `preschool-tk`, which the lookup returns at ages 4 and 5 and not at age 6. Age mapping: official, as the lookup prints. Sub-bands as printed: at age 4 the earlier range (3 to 4½ years) and the later range (4 to 5½ years) both apply; at age 5 the later range, which runs to five and a half.
Gap: none printed. At age 5 the lookup also returns `kindergarten`; at age 6 it returns `kindergarten` and `grade-1` and no `preschool-tk`; at both ages it returns the `cross-grade` lane beside them, labelled cross-grade. The game is designed from no record of those three lanes.

The game names no record of the kindergarten, grade 1 or cross-grade lanes, so for a child past five and a half it names no California record and nothing in its place.

No California record is named for putting events in an order of time, for food being processed and prepared, or for heat as a thing to discover: those parts are taken from the Dutch records alone, and nothing California is named in their place.

A foundation's code restarts in every domain, so each record is cited by pack id.

- `edu.us-ca.preschool-tk.science.objective.science-strand-2-0-physical-science-2-3` (code 2.3, Science, Strand 2.0): department-published-foundation, confirmed. What the game takes: a child explores with the senses how materials change. In the game the child does something to the stuff and sees and hears that it has changed.
  Limits taken: the kinds of change in the record are examples: colour, shape, texture and temperature at both ages, with form added at the later age. The game shows colour (cream to gold to black), shape (round, long, risen), texture (dusty, shaggy, smooth, crumbly) and form (dust and water become dough). Temperature cannot be felt on a screen and shows only as steam. The record does not ask for a scientific explanation, and the game gives none. Not in Limits: any material or act. Flour, water, the bubbly and seeds, and pushing, warming and baking, are the game's own choice. Describing and explaining are in the record and not in the game, which is wordless and cannot hear: they are left to the child and whoever sits beside them.
- `edu.us-ca.preschool-tk.science.objective.science-strand-2-0-physical-science-2-1` (code 2.1, Science, Strand 2.0): department-published-foundation, confirmed. What the game takes: a child explores materials and what they are like. In the game dust, water, dough and bread each look, sound and answer the finger in their own way.
  Limits taken: the properties in the record are examples and not a checklist; it asks for describing, not for explaining why materials differ; it sets no number of materials. The record groups materials as solid or not solid at the earlier age and as solid, liquid or gas at the later age: the game shows a powder, a liquid and solids, names none of them and asks for no sorting. Left open by Limits: the number of materials; four is the game's own choice. Describing is again left to the child.
- `edu.us-ca.preschool-tk.science.objective.science-strand-1-0-science-and-engineering-practices-1-5` (code 1.5, Science, Strand 1.0): department-published-foundation, confirmed. What the game takes: finding out what will happen by trying it. In the game every act can be tried, and its true result shows at once.
  Limits taken: adult support is stated for the checking at the earlier age and for planning the check at the later age; talking about why a prediction held is only beginning at the later age; no topic is named. The game gives the trying and the result. It does not ask for a prediction or a reason and cannot hear one: saying what will happen is left to the child and whoever sits beside them. Left open by Limits: the topic; bread is the game's own choice.
- `edu.us-ca.preschool-tk.practical-life-feelings.objective.approaches-to-learning-strand-2-0-executive-functioning-2-1` (code 2.1, Approaches to Learning, Strand 2.0): department-published-foundation, confirmed. What the game takes: keeping a few pieces of information in mind and acting on them through a task of several steps. In the game those pieces are what the customer wants, held from the first pour to the hatch.
  Limits taken: about one or two pieces at the earlier age and about two or three at the later age, as ranges and not examples; adult support is part of both statements. So a single customer has one want, a pair two, a trio or the mole three, and no group has more. The customer stays at the hatch showing its want the whole time: that is the game's own stand-in for the adult support the record states, and the record names no such cue. Limits gives no length of time beyond short at the earlier age and longer at the later age, and no number of steps; up to four acts in one bread, at the child's own pace, is the game's own choice.

### nl

Level: `fase-1`. Age mapping: convention, as the lookup prints. Sub-bands as printed: groep 1 at age 4, groep 1 or groep 2 at age 5, groep 2 or groep 3 at age 6.
Gap: none printed. At age 4 the lookup also returns `peuters`, for a child who has only just turned four, and at every age the `einde-po` lane, labelled end-of-primary goals. The game is designed from no record of either.

None of these four is a core goal, so none has a regime. Each describes what a school can offer in fase 1, not what a child must be able to do.

No Dutch record is named for finding out what an act does by trying it, for a material changing when something is done to it, or for keeping pieces of information in mind through a task of several steps: those parts are taken from the California foundations alone, and nothing Dutch is named in their place.

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

- **Standing.** The California records are foundations published by a state department. The Dutch records are guidance from the curriculum institute. Neither is a standard or the law. Here the game follows neither over the other: each is named in its own words, in the claim and wherever it is cited.
- **Age.** The California foundations named here reach to five and a half, and nothing California is named for an older child. The Dutch guidance covers the whole band. For a child older than five and a half the game follows the Dutch records alone.
- **Change.** The California foundation coded 2.3 is about materials changing. The Dutch statement on materials does not say whether changes are meant. The game follows the California foundation in showing changes, and for the Netherlands that part is the game's own choice.
- **Order.** California has a foundation on holding information in mind through several steps, with stated amounts. The Netherlands has a mathematics goal on ordering events in time, with no amounts. They are different things. The cap of three wants comes from the California record's Limits; the child deciding the order of acts is what the Dutch goal carries.
- **Food and heat.** The Netherlands has a statement that food is prepared and one that names heat as something to wonder about. The California records named here say nothing of food, and name temperature only as an example of a change. The bakery and its three temperatures follow the Dutch records.
- **Talk.** The California foundations ask a child to describe, predict or explain. The Dutch statements named here ask for exploring, discovering, wondering and realising, and none asks for talk. The game is wordless on the kid side, so here it follows the Dutch verbs, and it follows the California foundations only as far as exploring, trying and seeing.

### The claim

Bread Day is designed from four of California's preschool and transitional kindergarten learning foundations (foundations published by a state department, not standards; each confirmed), which reach to age five and a half, and from four fase 1 goals of the Dutch curriculum institute (guidance, not law; each confirmed). What it takes from them is this and no more. From both, each in its own records: exploring what materials are like. From the California foundations alone: finding out what an act does by trying it, seeing that a material has changed after something is done to it, and keeping up to three wants in mind through a task of several steps while the customer goes on showing them. From the Dutch guidance alone: that food is usually prepared before it is eaten, heat as something to discover and wonder about, and putting acts in an order of time by doing them. That dough rises, and why, is in none of the eight records named here, and neither are mixing and baking as such: the game shows them as changes a child can see. For a child older than five and a half the game is designed from the Dutch guidance alone, and the parts taken from California alone are then the game's own choice.

## The look

Not part of the sheet. Look in use: **Linocut print**, the first row reserved for the game in the ledger of `docs/art-direction.md`. It was spiked on the game's real scene before the toy, and the whole game is drawn in it. Every still was taken on a software renderer, so none says anything about frame rate: that is the lead's to measure.

**What a screenshot shows.** A badger's bakery before dawn, printed in ink on one sheet of cream paper: a dark key block with white gouge marks carries the whole picture, over flat night blue, gold and one red. It is printed, not cut and layered: no cast shadows, no lamp, no gradients, and no outline of even width.

**Palette.** Paper `#f2e7d0`, night blue `#23467a`, gold `#e3a32e`, red `#c9432f`, key block `#15161d`.

- Paper is the lightest value and belongs to the working object: raw dough is bare paper with one dark contour.
- Gold is kept for what the oven has made and for fire: a baked crust, the flames, the glow in the mortar, the moon.
- Red is small: the heart of the fire, cheeks, a collar, a hat band, the stripes of the flour sack.
- Night blue is the wall, the lane outside and the peel.

**Materials, as a print.**

- Each piece that keeps its shape is printed once into a cached sprite: flat inks on their own plates, then the key block, cut with gouge stamps (`destination-out`).
- Every plate is worn by a noise mask, so paper speckles through the ink.
- The colour plates sit one to three units out of register with the key block.
- The wall is the key block cleared in rows of broad strokes, which leaves dark nibs: the chatter of a cleared area.
- A coat is gouge marks along the lie of the fur. A figure has a cleared rim of uneven width, and its contour is heavier low and to the right.

**Lighting.** None. A print has no light source: warmth is gold ink under the key block near the oven, and cold is blue with frost marks at the sill.

**Working objects stay plain.** The dough and the baked bread carry no gouge texture, no face and no pattern, and lie on the plain blue peel. The carving goes on the badger, the customers, the oven and the room.

**The stuff is drawn live.** What lies on the peel is the one thing the finger shapes, so it is not a sprite: each frame its outline is filled with the paper colour and given a key contour of uneven width, heavier low and to the right, with a wobble fixed per point so that it does not boil. Dust is a slumped heap with a broken grain edge and specks round it; a puddle is a dark flat shape with a few pale ring arcs; batter is flat and wide with a double edge line and one uneven huddle of bubbles; streaky dough has smears running in from its edge; smooth dough has one long sheen mark. Nothing on it may read as a face: never two similar marks side by side at one height.

**Motion rules.** A print moves as cut-out pieces of itself: whole sprites slide, squash, tilt and swap between printed states, and nothing blurs or fades. `motion.ts` gives the badger and the room their own tempo and weight (the badger slow and heavy with its belly as the funny part, the sack floppy, the jug rocking and never squashing, the peel a stiff jolt, the door a clang, the fire a weightless flare), and `cast.ts` gives each of the eight customers its own routine, gait and reactions (the goat quick and springy and always knocking its horns on the post, three sparrows each on its own beat, the bear heavy and round). Flour in the air is hard-edged flecks of paper and water is short falling strokes.

**What rises and is gone.** Steam is a carved curl of bare paper, like the heat marks over the oven; a loaf's shimmer is three small ones; a cloud out of the oven is a scalloped patch of paper; smoke is the same in key block with a cleared rim, so that it reads on the dark wall; a seed that rolls is one seed with a ring of paper round it; the sheen on warm dough is a thin dark crescent that slides once across it; frost on the cold sill is a small fern of paper beside the load, one at a time. None fades: each thins and shrinks away, in under two seconds.

**What a reaction leaves on a customer.** For as long as the reaction lasts and no longer: a dusting of flour (flecks of paper laid over the figure's own ink, so its dark shows through), three thin strings of dough from the teeth to the hatch, a seed at a tooth, a ragged smudge of soot on the mole's nose.

**No sign by accident.** Nothing crosses at right angles in the middle of anything: the cold window has one upright bar, the oven door's round window a grille of three, frost is ferns, and a star has five points.

**The badger white with flour.** A second print of the same figure from the same seed: bare paper inside the same contour, a few specks of the dark coat showing through, and a thin line where each face stripe ran. The red band, the cheeks and the nose stay.

**Guidance in the look.** A print cannot glow. The thing a child would want next gets a ring of small wedges of bare paper cut round it, which grow and breathe, and the move is shown by a printed signpost hand with its first finger out.

**Tiers.** The room is printed once per size and pixel ratio, each other piece the first time a frame needs it, and a frame only lays them down: ten to thirty-four sprites and paths in the game's stills. A cheaper tier lowers the pixel ratio and scales the same prints, so the lowest tier is the same picture, softer; that path was written and not exercised at run time. Printing is the cost. Printing everything at once took about 0.65 seconds at 1180 by 820 and pixel ratio 2 on the build machine's software renderer when the scene held a dozen pieces; since the pieces are printed as they are needed it has not been timed again.

**The cast.** Each customer is one printed figure, facing into the bakery, in two states (mouth shut and mouth open; the goat has one), and looks like the bread it wants: the long dachshund with a long basket, the round bear with a round one, the black crow almost all key block, the speckled hen with her chicks, the duck with its flat bill and flat feet, the small pale mole hugging a basket, the goat with its hard horns, a row of plump sparrows. They are printed the first time a frame needs them and laid at the size of where they stand: largest at the hatch, at the right of the opening, and smaller in the lane, to the left of them.

**Breads.** Drawn live by their form, plain: flat gold inside a key contour with two or three slanted scores; a darker bake is the same gold under dense key hatching; a black one is key block with thin gold cracks and a cleared rim so it does not vanish on the dark wall; seeds are a scatter of small pale ovals. A brick is squat and hard-edged, an airy loaf tall and domed, a pancake flat with a darker rim.

**The room.** The hatch is a wide opening onto the lane, for up to three customers at its right and those who wait at its left, with rooftops low on a night-blue sky and a pale lane of setts; the rack hangs above the hatch; the cold window sits above the badger; the oven keeps its warm nook, and its iron door has a small round window that glows while it bakes.

**Still weak.** The live stuff has cleaner edges than the worn printed pieces. A rolling seed and hopping seeds are small. Beside a pair or a trio those who wait are small. The cleared rims make the sack and the jug read slightly like stickers. The warm nook reads as a framed niche more than a ledge. The cold sill sits close above the badger's cap, and the rack reads partly as a railing. The dachshund's four short legs under a straight belly read a little like a bench; the mole reads as a small pale animal with spectacles more than as a mole; the crow's wing reads as a large wing more than one held out.

**The registry row, for the lead** (section 3 of `docs/art-direction.md`; the owner has accepted the look):

| Game | Style | Art guide |
| --- | --- | --- |
| Bread Day | Linocut print (canvas 2D): a carved dark key block with white gouge marks over flat night blue, gold and one red on cream paper, slightly out of register; a badger's bakery before dawn, with gold kept for bread and fire and the dough as bare paper | [`games/bread-day/ART.md`](../games/bread-day/ART.md) |
