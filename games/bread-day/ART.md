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
