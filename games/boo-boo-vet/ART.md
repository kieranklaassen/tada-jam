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

Six objects: the five care things and the child's own hand. Five actions: giving the object to an animal that limps, that shivers, that scratches, that droops, or that hides. One cell in each column helps, and it is marked. Every other cell works, is funny, and shows the need again one step more plainly, in the place the wrong thing landed.

| | to one that **limps** (a sore paw) | to one that **shivers** (cold) | to one that **scratches** (itchy, burrs in the fur) | to one that **droops** (thirsty) | to one that **hides** (frightened) |
| --- | --- | --- | --- | --- | --- |
| **Plaster** | **Helps.** It goes on the held-up paw; the animal tests the paw, stamps twice and struts. A pat, two stamps. | The shiver shakes it loose and it flaps like a flag, then flutters off. A fast papery flutter. | The scratching leg sticks to it and the animal hops in a circle on three legs until it pops free. A stretchy creak, a pop. | It lands on the hanging tongue; the tongue goes in with it, a sour face, and the tongue comes out longer. A wet slap, a "bleh". | It lands on the nose that peeks out; the nose pulls in and two eyes blink in the dark. A tiny tick, a sniff. |
| **Blanket** | Tucked in, but the sore paw sticks out of the blanket and waves. A soft whump, a small whine going up. | **Helps.** The shaking slows and stops, a long warm sigh, pink cheeks, the head pops out. A whump, then the chatter fading into a hum. | The lump under it keeps scratching, the blanket bounces and is kicked off. Muffled thumps. | Too warm: faster panting under it, then the animal oozes out from under and lies flat. Panting that speeds up. | The blanket covers the hiding place and the whole lump trembles. A whump, a cloth rustle that does not stop. |
| **Brush** | The fur goes big and fluffy while the sore paw is lifted well away from the brush. Dry strokes, one "eep". | The fur stands up in a crackling puff and the puff shivers. Crackle and chatter. | **Helps.** The burrs fly out one by one, the leg stops, and a blissful hind foot thumps the table. Three pops, a thumping purr. | Brushed flat like a rug, chin on the table, tongue out. Slow strokes that sink in pitch. | The brush stops short and lies down; the fur nearest it bristles and one eye watches it. One stroke on air, then quiet. |
| **Bowl of water** | The sore paw is dipped in, a cool "aah", shaken dry, and held up again. A plop, drips. | One lap and a bigger shiver; the bowl rattles and rings spread in it. A lap, then rattling. | The scratching leg kicks the bowl; a splash, and a shake that sprays the room. Splash, a spraying shake. | **Helps.** A long gulping drink; the ears lift one after the other and the body fills out straight; a hiccup. Gulps rising in pitch, a hiccup. | A tongue comes out of the hiding place for one lap, and the water trembles. One lap, a tiny ripple. |
| **Basket bed** | Climbs in on three legs with the sore paw hung over the rim. Wicker creaks, three steps. | Curls up inside and the shivering walks the basket across the table. A rattling wicker walk. | Scratches inside it until the basket spins like a top. Creak, creak, a whirr. | Hangs over the rim like a wet towel, tongue on the table. One long creak, a sigh. | **Helps.** The basket slides to the hiding place, the animal creeps in, the lamp dims a little, the trembling slows to deep breathing; then a peek, a stretch, and it steps out tall. A hush, slow breaths, a yawn. |
| **The hand** (a stroke) | Leans in and lays the sore paw in the hand. A soft hum. | Presses against the warm hand; the shaking eases while the finger stays and comes back when it lifts. The chatter thins under the hand. | Turns the itchy place to the finger and the hind leg thumps while it is stroked. Quick thumps. | Licks the finger with a dry tongue. A raspy lick. | Sniffs the still finger and creeps one step out; a second quick touch sends it back. A sniff, soft steps. |

The hand never counts as a care that was tried. It is how a child says "what is it?", and the animal shows its sign again, turned to the child.

The same objects away from a need also all work:

- **On an animal that needs nothing** (the toy, and every patient once it is well): the reaction is that animal's own, by its fixed tastes ("The characters and their fixed tastes").
- **On each other**, five pairs that give the same result every time and are never hinted at: the blanket over the basket makes a den with a flap; the brush in the bowl makes foam, and whoever drinks next gets a foam beard; a plaster on the bowl floats as a boat the animal blows along; the brush on the blanket makes it crackle, so the next one under it comes out with its fur on end; a plaster on the blanket stays as a patch.
- **On the mouse, and on the one who waits at the door**: each reacts where it stands. The mouse wears a plaster as a hat. Mischief works.

**Day 15.** The child reads a quiet first sign in one look and gives the right thing at once, tells a cold shake from a frightened one, knows which animal is wary of which thing and plays that on purpose (the cat and the water), and makes things of their own for whoever is on the table: the den, the foam beard, the boat.

## The representation

**The idea.** What someone needs or feels can be seen from outside, in the body and in what it does, and there is something kind to do that fits it.

**How it appears.** The representation is a creature with a visible need, shown by its whole body and never by an icon. It was chosen before the game, from the table of school skills in `compound-packs/game-design/research/learning-games-that-work.md`: for caring for others, "a creature or plant with visible needs", noticed "without a prompt icon"; for feelings, "body, face", read "to do something kind that works".

- **A sign has three parts**, all in the animal: the place on the body (a paw, the whole skin, a patch of fur, the mouth, the whole animal gone from view), the movement (a limp, a shiver, a scratch, a droop, a hide), and the face (one of a few simple feelings: hurting a little, miserable, bothered, worn out, afraid).
- **The care goes where the sign is.** The plaster goes on the paw that is held up, the blanket round the body that shakes, the brush through the fur that is scratched, the bowl to the mouth that hangs open, the basket round the one who hides. So the child can see in the objects why it worked: the help fits the place and stops the movement.
- **Each sign has three steps of plainness**, the same need shown more fully: quiet (the movement alone, small), plain (the movement large, with the face), and open (the animal turns to the child and shows the place itself: it holds the paw out, hugs itself with a puff of breath, turns the itchy patch round, lets its tongue hang to the table, puts one paw out of its hiding place and pulls it back). No step points at a care thing.
- **Each of the six animals shows each sign in its own body**: a hedgehog that is afraid is a ball, a rabbit that is afraid is two ears behind the cart. What stays the same across animals is the place and the kind of movement, and that sameness is the idea.

**Trial or practice.** This is school and nursery practice without a trial behind it. The research file found no controlled study in which an app by itself taught a young child about feelings or care, and marks its line on this strand as inference; the one study it cites worked only where a parent talked with the child. So the game is rehearsal: it is built on a representation in common use, and nothing is claimed for it beyond that.

**Where the order stops.** At the object: the behaving animal and the real care thing. The band starts below 6, so there is no symbol stage, and the game also uses no picture stage: no feeling face on a card, no emotion chart. A spoken feeling word attached to the animal would be the next step, and it waits for the owner's trial of on-device speech; until then the animals have invented voices and say no word.

## The four mechanic questions

- **Swap.** No: take the animal's need away and nothing is left to decide, since the only thing that tells the five care things apart is what the animal's body is showing.
- **Attention.** At the moment of decision the child looks at the animal (which part of it, what it is doing, what its face is like) and thinks about what would make that stop; where and when the finger lands does not matter, because a tap on a care thing sends it to the animal.
- **Fun.** The skill is used in the most enjoyable moment: giving the thing and watching this animal's own answer to it is the toy, and when the reading was right the answer is the biggest one in the game.
- **Guess.** A child who taps every thing does get there, in at most five gives and usually fewer, because no give is refused and each wrong one makes the sign plainer; so guessing is slower and funnier, never blocked, and it is the reading that makes the first give land. The game does not pretend otherwise, and its hidden position rises only after cycles in which the first give was right.

## The error as a consequence

A care that does not fit the need is not refused. The animal takes it, and what happens follows from the need it still has:

- **Where.** The consequence plays at the place of the sign. The plaster lands on the hanging tongue, the blanket is thrown off by the leg that is still scratching, the sore paw sticks out of the blanket.
- **Why.** The need shows through the wrong care: the shiver shakes the plaster loose, the thirsty one gets hotter under the blanket and pants faster. The child sees what is still the matter because the wrong thing made it bigger.
- **One step plainer.** After each care that did not fit, the animal's sign moves one step up, from quiet to plain to open, and stays at open. It never moves back down within a patient.
- **The state stays.** The animal is still on the table with the same need, the thing that was tried lies beside it (or on it, where it stuck) and can be given again, nothing is used up, and no care thing ever leaves the cart for good. The child changes one thing: which care.
- **As interesting as success.** Each of the twenty-four cells that do not help is its own small comedy, and the animal is bewildered or tickled by it, never hurt and never worse off. A frightened animal is never pressed: a wrong thing stops short of it.
- **Nothing gives a verdict.** No buzzer, no cross, no shake of a head, no face turned to the child in disappointment, and no cheer when it fits. Success is also a consequence: the limp is gone, the shaking has stopped, the animal does what it could not do before.
- **Fullest when new.** The first few patients with a need start at the plain step; later ones start quiet, and the consequence of a wrong care is then the only extra help there is.

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
