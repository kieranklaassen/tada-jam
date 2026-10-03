<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

Boo-Boo Vet is a small vet's room. An animal comes in and shows what it needs by how it looks and what it does, and the child gives it the thing that helps. The verb is one act: **read the animal, give the care**.

- **Band.** The manifest band is 3 to 6. Its youngest age, 3, governs the design.
- **Cue-table row.** The row for 3 to 4 in the age-band cue table of `docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md`. Its "Avoid" column is a hard constraint here: no text, numeral or pictorial icon that must be decoded, no spoken instruction, no verdict, never several activities live at once, and no tool present before it means anything. So one patient is on the table at a time, the care things are real things drawn as themselves and never icons, and the cart that carries them rolls in with the patient and is not there before.
- **The pack's rule for the age.** A band that starts at 3 is held to (pack: game-design, ages-2-to-4.md) and, for its older children, to (pack: game-design, ages-4-to-6.md). From the first: everything essential works with a tap, a drag survives a lifted finger and counts when partly done, essential targets are about 100 logical pixels across and well apart with none in the bottom strip, no double tap, a whole cycle fits in one to three minutes, and quantities stay at five or fewer (the cart never holds more than five care things, and a patient never has more than two needs). From the second: pretend play with characters who react, mischief that works, and a victim of a joke who is bewildered and never hurt.
- **The symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, optional or not, and the game has no `symbols.ts`. A feeling is never shown as an icon, a thought bubble or a coloured mark over the animal: it is in the body.
- **Nothing frightening.** No blood, no wound, no crying in pain, no needle, no medicine. A sore paw is a paw held up and a careful walk. A frightened animal hides and trembles and is never chased.
- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order: at 3 or younger the first position, at 4 the second, at 5 or older the third (the rows are in "The designed order, and what is stored"). It gates nothing: every position is reached by play at any age, and a saved position wins over the age.
- **What `null` gives.** The youngest default, the first position.

## The toy

**The action.** The finger touches a care thing and the thing goes onto the animal. That is the action performed most, and it is the whole of the skill's hand movement: give this to that one.

**In an empty scene.** One animal that needs nothing sits on the table, and the five care things lie on the cart: a plaster, a blanket, a brush, a bowl of water and a basket bed. Nothing is asked.

- **When the finger lands**, in the same frame: the thing lifts off the cart with a stretch, its near corner curls up like a sticker being peeled, its gloss streak slides across it, a soft tacky peel sounds at a pitch of its own, and the animal's eyes and ears snap to it. The mouse who lives on the cart ducks.
- **A tap** (finger up where it came down) sends the thing to the animal in one arc: it lands with a squash, the animal rocks back under it, and the animal's own reaction to that thing starts before the squash has settled.
- **A drag** carries it under the finger with a little lag and swing. Let go anywhere near the animal and it lands on the animal, so a drag that is partly done counts. Let go elsewhere and the thing lies where it was dropped and can be picked up again. A lifted finger loses nothing.
- **The answer is bigger than the touch.** One touch sets off a chain. The blanket lands, the animal vanishes under it, a nose comes out, the whole lump scoots along the table and bumps the cart, and the mouse's hat falls off. The bowl lands, the animal laps, shakes its head, and drops fly onto the lamp, which rings. Each of the six animals answers each of the five things in its own way, and each answer has two or three variants that never come twice in a row.
- **Sound.** Every thing has a peel, a flight and a landing voice. The pitch of the landing follows the animal's size (a low thump on the bear, a tick on the hedgehog). Each animal has an invented voice, with no words, whose melody rises for delight and wobbles for surprise. When the child stops, the room falls back to breathing and near silence.
- **The finger alone** is also an answer: a touch on the animal is a stroke. It leans into the hand, and each animal has one spot it loves and one that makes it squirm.

**Why it is a pleasure with no goal.** It is putting stickers on a friend who reacts. Thirty pairs of animal and thing give thirty different small comedies, the things can be piled on (a brushed bear under a blanket in a basket), every touch works, nothing can be done wrongly, and nothing is ever taken away. A person watching sees within three seconds what the child is doing: giving things to an animal to see what it does.

## The object-by-action grid, and what is new on day 15

A grid of objects by actions in which every cell gives a result that looks and sounds different, and one line on what the child can do, find or make on day 15 that they could not on day 1.

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
