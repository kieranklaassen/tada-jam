<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 4 to 6, and its youngest age, 4, governs the design.

- **The cue-table row.** The row for a youngest age of 3 to 4 in wordless clarity. From it the game takes direct handling of objects, a character who shows one move, a breathing glow on what can be touched now, tools that appear only when they mean something, and a material that corrects itself: two strips that hang from one level line show their difference without help. Its "Avoid" column is a hard constraint: no text, numeral or icon to decode, no spoken instruction, no verdict, no second activity live beside the first, and no tool on screen before it means anything. One next act is offered at a time.
- **The pack's rule for the range** (pack: game-design, ages-4-to-6.md). The salon is a place with props and two characters who react, and the child supplies the plot, a terrible haircut on purpose included. Everything is done with a tap or a drag, a drag survives a lifted finger, and nothing needs a double tap or reading. The joke is on a customer who overreacts and is never hurt.
- **The symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, and the game has no `symbols.ts`. No length is ever shown as a number, a mark or a scale.
- **What `ctx.childAge` sets.** Only the position a first visit starts at, read once when no save exists: `beside-long` at 4 or younger, `beside-close` at 5, `across` at 6 or older. A saved position always wins over the age, every position stays reachable by play from any start, and nothing is locked or hidden by age.
- **What `null` gives.** The youngest default, `beside-long`.

## The toy

The action the finger performs most is **pulling a lock longer and snipping it shorter**, with no tool to pick up first.

- **Pull.** The finger lands on hair and the lock is caught at once: it squashes under the finger and gives a short squeak. As the finger moves away from the root the lock stretches like warm toffee, with a creak that falls in pitch as the lock gets longer, and the customer's head leans after it. Let go, and the lock stays as long as it was pulled, drops with a bounce, swings twice and hangs.
- **Snip.** The finger lands anywhere that is not hair and a pair of scissors is in the hand at once, blades open, with a small ring of steel. Wherever the scissors cross a lock they close on it: a crisp snip, the cut piece tumbles to the floor and lies there, the stump twangs up, and the customer blinks or giggles.
- **The chain.** One touch sets off several things: the lock, the head that leans or wobbles, the eyes that follow the finger, the neighbouring tufts that ripple, the clipping that falls and bounces. Nothing blocks the next touch.
- **In an empty scene** there is one head of wild hair and nothing to match. A lock pulled to the floor lies there in a heap; a head snipped all over is a field of stubs that each stand up and twang; every lock is a string with its own note, lower the longer it is. Hair that was cut is pulled long again, so nothing is ever used up.
- **Why it is a pleasure with no goal.** The hair is elastic and noisy and answers when the finger lands, the head it grows on has feelings about it, and both actions undo each other, so the child can go back and forth for as long as it is funny. Random tapping pokes a face, plucks a lock or snips the air, and each of those answers. The simplest use, one swipe through the hair, always cuts something.

## The object-by-action grid, and what is new on day 15

Six objects and five actions. The actions are told apart by what the finger does, never by a tool picked from a tray: **pull** is landing on the thing and dragging; **snip** is landing beside it and crossing it; **poke** is a tap; **ruffle** is rubbing back and forth on it; **bring the ribbon** is carrying the ribbon by its clip and letting go on the thing.

| | Pull | Snip | Poke | Ruffle | Bring the ribbon |
| --- | --- | --- | --- | --- | --- |
| **A lock under the cape** (the customer's) | Stretches longer with a creak that falls in pitch, and stays as long as it was pulled; the head leans after it | Cut where it was crossed; the piece drops to the floor and the stump twangs up; it stays cut | Plucked like a string: a note that is lower the longer the lock is, and one slow swing | Fans out and flutters with a dry rustle, then falls straight, as long as before; the head wobbles | The ribbon clips on beside it with their top ends level, and both hang still |
| **The friend's lock** (the model) | Stretches, then snaps back to its own length with a rubbery boing; the friend's eyes cross | A piece pops off, the friend shakes like a wet dog, and the lock is back at its own length with a cork pop | Hums in the friend's own voice, and an ear flicks | The friend squirms and laughs; the lock does not change | The friend takes the clip in a paw and holds its breath, cheeks puffed, while the ribbon hangs beside the lock, top ends level |
| **A tuft of the mane** | Grows into a tall plume that flops over when it is top-heavy, with a rising whistle | Becomes a round pom, and a puff of fluff floats up with a soft poff | Boings like a spring, and the tufts next to it ripple outwards | The whole mane frizzes into a ball with a crackle, then sinks back to how it was | The ribbon ties itself into a bow on the tuft with a rustle and a ting; the customer looks up at it and likes it or hates it, by its taste |
| **The ribbon** | Runs longer off its roll with a ratchet tick, and stays | Cut; the offcut spirals down slowly like a leaf with a paper flutter and lies on the floor | Twangs like a rubber band, curls up at its end and uncurls | Spins into a corkscrew with a whirr, then hangs straight | Carried back to its peg, it winds on with a zip and hangs there at the length it has |
| **A clipping** on the floor | Comes along in the fingers, wriggling, and lies where it is let go; let go on a face it sticks there | Cut in two, and the halves hop apart; a piece too small to cut turns to fluff and blows away | Hops like a flea with a tick | Rolls up into a fluff ball that rolls away under the chair | The ribbon lies down on the floor beside it, ends level |
| **A face** (the customer's or the friend's) | The cheek stretches like dough and snaps back with a blub and a squeak in that customer's voice | The scissors snip the air by the nose; the customer goes cross-eyed, ducks under the cape and peeks out; nothing is cut | A giggle in that customer's own voice, different on the nose, an ear and the chin | A head rub: each customer answers in its own way, by its taste | The ribbon wraps round the head as a blindfold, and the customer lifts it to peek |

Every cell is the right use of something and the wrong use of something else, and all thirty work. The ones a grown-up would call wrong are the loudest: snipping the model, pulling a cheek, a clipping worn as a moustache.

**Day 15.** The child gives haircuts on purpose to four customers whose tastes they know, to get the reaction they want to see; carries a length across the room on the ribbon without being shown; dresses faces with moustaches and eyebrows cut to size from clippings; and matches two locks at once where on day 1 they matched one that hung right beside its model.

## The representation

How the school idea appears in the objects, chosen before the game, and where the order of object, picture and symbol stops for this band.

## The four mechanic questions

One sentence each for swap, attention, fun and guess.

## The error as a consequence

What a wrong attempt does in the world, where it shows, and that the state stays so the child changes one thing and tries again.

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
