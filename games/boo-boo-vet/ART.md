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

**A cycle** is one patient: it comes in on the child's touch, shows its need, is given things, and is well when its last need is met.

**The order.** Eight positions, as `LADDER` in `config.ts`. Each id names what is new at that place in the game's own order. The first five add one need together with its care thing; the last three combine what is known.

| Position id | What is new there | Needs in play | Things on the cart | A sign starts at | Needs per patient |
| --- | --- | --- | --- | --- | --- |
| `bowl` | the one that droops, and the bowl | 1 | 1 | plain | 1 |
| `blanket` | the one that shivers, and the blanket | 2 | 2 | plain | 1 |
| `plaster` | the one that limps, and the plaster | 3 | 3 | plain | 1 |
| `brush` | the one that scratches, and the brush | 4 | 4 | plain | 1 |
| `basket` | the one that hides, and the basket bed | 5 | 5 | plain | 1 |
| `quiet` | a support is removed: signs start quiet | 5 | 5 | quiet | 1 |
| `two` | two needs in one patient, in either order | 5 | 5 | plain | 2 |
| `two-quiet` | both together | 5 | 5 | quiet | 2 |

- **Laying out a patient.** A patient is laid out (its animal, its need or needs, the step its sign starts at, the things its cart carries) from the stored position at the moment it takes the waiting place, by a seeded stream that nothing else draws from. The same animal does not come twice in a row, and the same need does not come three times in a row where another is in play.
- **Which patient a new position lays out.** The position moves when a patient is judged, which is when it becomes well. The one who waits at the door was laid out before that. So the first patient of a new position is the one who takes the waiting place when the waiting one comes in: the change shows on the patient after next.
- **A new thing is shown before its need comes.** The mouse on the cart uses each care thing once, on itself, the first time the cart carries it ("The scenes"). A patient is never laid out with a need whose thing the mouse has not yet shown, so the first patient of a new position has a need the child already knows, with the new thing on the cart as one more thing to choose from; and the patient laid out next has the new need. The first position needs no showing: one thing lies on the cart, and it fits.
- **First visit.** `FIRST_VISIT` in `config.ts`: age 3 or younger, or no age, starts at `bowl`; age 4 at `blanket`; age 5 or older at `plaster`. The things of the positions before the starting one count as shown.
- **How a cycle is judged.** By the cares given while a need was still unmet, the hand not counted. *Well:* none of them failed to fit, and the patient carried what is new at the stored position (the newest need at the first five, a quiet start at `quiet`, two needs at `two`, both at `two-quiet`), so a position is never left behind without having been played. *Badly:* two or more did not fit. *Mixed:* anything else. The position moves up one after a cycle that went well, down one after one that went badly, and not at all after a mixed one. It never moves inside a cycle. A visit put away with no patient made well leaves it where it was. Things given to an animal that is already well, to the mouse, or to the one who waits are play and are not judged.
- **Nothing shows the position.** No level, no label, no map, and no sign that the cart has fewer things than before.
- **A harder option the child picks.** From `basket` on, a carrier sometimes stands beside the one who waits, shut, with two eyes at its window. Whoever is in it was laid out one position above the stored one. It looks harder because less of the animal can be seen, and the child may always choose it by touching it; the one who waits stays where it is. A carrier cycle is judged like any other.

**What is stored.** One record of plain JSON under `ctx.storage`, saved on every change below and read by a `deserialize` that repairs each field by itself:

- `v`: the version, 1.
- `position`: a position id. An id the game does not know falls back to the first-visit default.
- `finished`: the patient on the table is well and its cycle has been judged.
- `seed` and `drawn`: the seed of the layout stream, set once at the first visit, and how many patients it has laid out. Neither is shown.
- `table`: the patient on the table, or none. A patient is its animal, where it was laid out (a position id), its one or two needs, each with the step its sign is at and whether it is met, how many cares did not fit (stored as 0, 1 or 2, where 2 means two or more), the things its cart carries, and whether it came from the carrier.
- `waiting`: the patient at the door, in the same shape. There is always one.
- `carrier`: the patient in the carrier, or none.
- `garden`: the last three animals made well, each with the one or two things that helped it. They sit outside the window. A fourth pushes the oldest out; nothing counts them.
- `shown`: the care things the mouse has shown.
- `things`: where the blanket, the brush, the bowl and the basket each lie: on the cart, on the patient, or at one of a few named spots on the table and the floor. Plasters come off a sheet on the cart that never runs out; the two newest that were stuck somewhere other than a paw are kept with their spot.
- `made`: what stands from the pairs: the den, the foam in the bowl, the boat, the crackle in the blanket, and up to three patches.

A thing in the hand is saved where it last lay. A scene's outcome is saved when the scene starts: a need is marked met when the care that fits lands, so a put-away during a rest or a well scene loses nothing and replays nothing. The quiet rest takes a few seconds of attended game time and reads no clock. The largest legal state is under 2 KB, and a test holds it under half of the 64 KB cap.

## The characters and their fixed tastes

The animals' reactions are the only feedback in the game. Each patient has one want that is always visible, in its body: the need it came with, and once it is well, to play. Six animals, each with tastes that never change:

| Animal | How it moves | Funniest part | Loves | Is wary of | Loves a stroke on | Squirms at a touch on |
| --- | --- | --- | --- | --- | --- | --- |
| Bear | big, slow, heavy; everything arrives late and lands hard | the belly | the basket, far too small, sat in anyway and worn as trousers | the brush: ticklish, a giggle rolls down the belly | the belly | the feet |
| Rabbit | small, quick, light; starts and stops | the ears | the blanket: tunnels through it end to end | the basket: thumps a foot at it and hops over | between the ears | the tail |
| Cat | smooth and exact; never hurries, then is suddenly elsewhere | the tail | the brush: rubs both cheeks along it | the bowl: dips one paw and shakes it | the chin | the tail |
| Dog | bouncy and eager; overshoots every stop | the tongue | the bowl: drinks half and wears the rest | the plaster: walks as if the paw wore a boot | behind the ear | the paws |
| Hedgehog | tiny, jittery, round; rolls when it can | the spines | the plaster: wears it on its spines like a flag | the blanket: the spines catch and it becomes a rolling parcel | the nose | the back |
| Duck | waddling, loud, top-heavy | the feet | the bowl: sits in it as a boat | the brush: feathers go the wrong way and are put back one by one, crossly | the top of the head | the feet |

- **A taste never decides whether a care helps.** The care that fits a need always helps, for every animal. The taste decides how the animal takes it: a thirsty cat drinks by dipping a paw and licking it; a dog with a sore paw is helped by the plaster and still does three steps of the boot walk. A thing that does not fit plays its grid cell in that animal's manner: the one that loves it enjoys it for a moment before the need comes back, the one that is wary ducks it.
- **A dislike is worth causing.** A wary reaction is as large and as funny as a loved one, and the animal is startled or cross at the thing, never at the child, and never hurt.
- **Learnable and testable.** The tastes hold on every visit, for a patient with a need and for one that is well, so a child can find them, try them on purpose and show them to someone.
- **The mouse** lives on the cart, wears a small hat, and wants the cart in order: it straightens what comes back and ducks what flies. It reacts to what happens in the room, shows each new thing once, and never points at a care thing.
- **The one who waits** sits at the door with its sign at the step it was laid out with, looks about the room and watches the table. Its sign does not grow while it waits, and it never calls, sulks or looks at the child for being kept waiting.
- **No feeling is about the child.** No animal thanks, praises, is disappointed in, or remarks on the child, on stopping, or on coming back.

## The scenes

Every scene is a list of timed beats over a few poses joined by springs, on attended game time, built on the template's `scene.ts`. None plays before the child acts, and each always plays for its cause.

1. **Well** (6 to 9 seconds). *Cause:* the care that fits the last unmet need lands. *Beats:* the cell that helps plays and the movement of the need stops; a held breath while the animal checks itself (tests the paw, feels the warmth); it does the thing it could not do before (the one that limped leaps, the one that shook stretches out loose, the one that scratched lies still, the one that drooped stands tall, the one that hid walks to the middle of the table); it plays with the thing that helped, in the manner of its taste; one glance or one piece of business for each thing that was tried and did not fit, where it lies; it sits down, well, and looks about. *Filled from:* the animal, its need or needs, the things that helped, the things that did not fit in the order they were tried, and what stands from the pairs (a foam beard if the bowl was foamy). *Gives way:* any touch cuts to the last pose, and that touch is answered as usual. The outcome is saved when the scene starts.
2. **A secret** (4 to 6 seconds). *Cause:* one of the five pairs of things, or a well animal given the thing it loves. The same cause gives the same scene every time. *Filled from:* the animal on the table and its taste. *Gives way:* any touch.
3. **The mouse's showing** (about 3 seconds, once for each thing). *Cause:* the cart rolls in carrying a thing the mouse has not shown. The mouse uses it on itself the right way (sips, wraps a corner round itself, brushes its whiskers, sticks a plaster on its tail, curls up in the basket and breathes out). It is the use of the thing, never which thing the patient in front needs: that patient has a need the child already knows. *Gives way:* any touch ends it, and it is marked as shown when it starts.
4. **Coming in** (3 to 4 seconds, and never in the way of a touch). *Cause:* the child touches the one who waits, or the carrier. The animal on the table hops down and goes out to the garden with what helped it; the one who waited walks in the way its need makes it walk and climbs onto the table; the cart rolls in behind it.

**How a cycle ends.** In the last pose of the well scene: the animal sits on the table, well, for as long as the child likes, and every thing on the cart is now a toy for it. If the child does nothing, nothing starts: no next patient walks in, and nothing counts down.

**How the next one starts.** The next patient is in view at the door the whole time, and comes in when the child touches it. On a first visit the table is empty and the first patient waits at the door. On load nothing replays: the room is as it was left, with the same animal on the table at the same step of its sign, the things where they lay, the same animals in the garden, and the same one waiting.

**When the child is idle.** The template's guidance ladder, on attended time: first a glow on what can be touched now, then the ghost hand shows one move, a single tap, and backs off. With a need on the table the move it shows is a stroke of the animal, which makes it show its sign again turned to the child, and never a tap on the thing that fits. With the table empty or the animal well, it is a tap on the one who waits.

## The records

Read through the lookup on 2026-10-03, each record again by `--id`. Every record below printed `check: confirmed`. What a record asks is given in the game's own words or from the record's Summary or gloss, which are the pack's text.

What no record carries, in either jurisdiction: that a need can be read in an animal. Every feelings record below is about people. Animals come in only through the care records, which name no signs. Injury, illness and treatment are in none of them. So the animal as the one who is read, the five signs, and four of the five pairs of sign and care are the game's own design.

### us-ca

Levels: `preschool-tk` at ages 3, 4 and 5 (sub-bands as printed: Early (3 to 4 ½ Years) at 3, Early and Later (4 to 5 ½ Years) at 4, Later at 5); `kindergarten` at ages 5 and 6; `grade-1` at age 6. Age mapping: official, as the lookup prints at each of these ages. From age 5 the lookup also returns the subject's `cross-grade` lane, labelled cross-grade: its statements hold for every grade, not for this age in particular. Gap: none printed at ages 3 to 6.

- `edu.us-ca.preschool-tk.practical-life-feelings.objective.social-and-emotional-development-strand-1-0-self-1-3` (`us-ca 1.3`, Social and Emotional Development, Strand 1.0): department-published-foundation, confirmed. Asks: identify emotions and recognise how they show, in oneself and in other people.
  Limits taken: basic emotions at the earlier age, given as examples with no count; complex emotions, and which behaviours go with an emotion, only at the later age. So the faces in the signs stay simple ones at every position. Left open by Limits: which emotions, and how many. The game's own choice: five simple states, each tied to one movement.
- `edu.us-ca.preschool-tk.practical-life-feelings.objective.social-and-emotional-development-strand-1-0-self-1-8` (`us-ca 1.8`, same strand): department-published-foundation, confirmed. Asks: feel along with someone in distress and show concern for what they need; at the later age, comfort and help.
  Limits taken: at the earlier age only shared feeling and concern, with no helping mentioned; comforting and helping come at the later age, where an adult's support is now and then needed. So at the first position the game asks for one act toward one need and claims no more than noticing and one simple answer, and the stroke of the hand, which is concern and never a care that is judged, works at every position.
- `edu.us-ca.preschool-tk.science.objective.science-strand-3-0-life-science-3-7` (`us-ca 3.7`, Science, Strand 3.0): department-published-foundation, confirmed. Asks: know that animals and plants have to be looked after; at the later age, describe what living things need.
  Limits taken: at the earlier age care in general, with giving food and giving water the two things named and the understanding called emerging; at the later age the needs listed are examples, sleep and water among them, and the statement does not say which need belongs to which living thing. So the bowl of water is the first care in the order. Left open by Limits: every other care task. The game's own choice: the blanket, the plaster, the brush and the quiet rest.
- `edu.us-ca.kindergarten.science.objective.k-ls1-1` (`us-ca K-LS1-1`): state-board-adopted-standard, confirmed. Asks: from what is observed, describe patterns in what living things must have to stay alive.
  Limits taken: no assessment boundary is stated; the patterns in the clarification are examples, and that every living thing needs water is one of them. The game takes only that one: every one of the six animals, when it droops, is helped by water. It asks for no describing.
- `edu.us-ca.kindergarten.practical-life-feelings.objective.k-7-2-m` (`us-ca K.7.2.M`): state-board-adopted-standard, confirmed. Asks: tell good ways of showing someone that one cares about them.
  Limits taken: telling is enough; the ways must be positive ones; no list is given. The game takes the second: every care in it is a kind one, and no thing hurts. The telling is not in the game: nothing in it listens, and it is left to the child and a grown-up.
- `edu.us-ca.cross-grade.practical-life-feelings.objective.early-elementary-3-b-1` (`us-ca 3.B.1`, Early Elementary) [cross-grade]: voluntary-guidance, confirmed. Asks: read what another is feeling from what they say and from face and body, and show empathy.
  Limits taken: voluntary guidance and not an adopted standard; a band tied to no grade; the cues are spoken and physical; no emotions and no situations are listed. The game takes the physical cues only: its animals say no words.

Not used: the `grade-1` lane holds no record that carries the verb. The nearest, `us-ca 1.1.5.P` (state-board-adopted-standard, confirmed), is about telling the signs of a few common illnesses in people and stops before treatment; the game shows no illness and is not designed from it.

### nl

Levels: `peuters` at age 3, and at age 4 up to the fourth birthday; `fase-1` at ages 4, 5 and 6 (sub-bands as printed: groep 1 at 4, groep 1 or groep 2 at 5, groep 2 or groep 3 at 6). Age mapping: convention, as the lookup prints at every age: no law ties a groep to an age. From age 4 the lookup also returns the `einde-po` lane, labelled end-of-primary goals; the game is designed from no record of that lane. Gap: none printed at ages 3 to 6. None of the records below is a core goal, so none has a regime.

- `edu.nl.peuters.practical-life-feelings.objective.inhoudskaart-sociaal-emotionele-ontwikkeling-peuters-sociale-competenties-de-ander-besef-van-de-ander-inschatten-van-het-gedrag-van-een-ander-1` (`nl Inschatten van het gedrag van een ander / 1`, the pack's code for a bullet of the peuter card): curriculum-institute-guidance, confirmed. Asks: read the outward signs of simple feelings in someone else.
  Limits taken: what is offered to children of about 2 to 4, not what a child must be able to do; simple feelings only, and they are not listed; mixed or hidden feelings are not mentioned. So no sign in the game is a mixed or a hidden feeling: a quiet sign is the same feeling shown smaller, and a patient with two needs shows each one openly in turn.
- `edu.nl.peuters.practical-life-feelings.objective.inhoudskaart-sociaal-emotionele-ontwikkeling-peuters-sociale-competenties-de-ander-besef-van-de-ander-open-staan-voor-de-emoties-van-een-ander-4` (`nl Open staan voor de emoties van een ander / 4`, the pack's code): curriculum-institute-guidance, confirmed. Asks: respond in a basic way to what someone else needs.
  Limits taken: an offer, as above; "basic" bounds it to one simple reaction, and nothing says the child meets the need; which needs, and whose, is not said. So at the first position one tap is the whole answer, and the game's claim for the youngest is one simple reaction to a need the child notices.
- `edu.nl.peuters.science.objective.inhoudskaart-orientatie-op-jezelf-en-de-wereld-peuters-planten-dieren-en-de-mens-omgaan-met-de-natuur-5` (`nl Omgaan met de natuur / 5`, the pack's code): curriculum-institute-guidance, confirmed. Asks: treat plants and animals with care.
  Limits taken: an offer, as above; no care task such as feeding or watering is named, and no rules. Left open by Limits: every care task. The game's own choice: all five.
- `edu.nl.fase-1.practical-life-feelings.objective.inhoudskaart-sociaal-emotionele-ontwikkeling-fase-1-sociale-competenties-de-ander-besef-van-de-ander-herkennen-en-perspectief-nemen-op-het-gedrag-van-een-ander-1` (`nl Herkennen en perspectief nemen op het gedrag van een ander / 1`, the pack's code for a bullet of the fase 1 card): curriculum-institute-guidance, confirmed. Asks: recognise from behaviour whether another is angry, scared, happy or sad.
  Limits taken: what a school offers in fase 1, for groep 1 and 2, with no year named; four feelings are named; the others are children; the cause of the feeling is not asked. The game shows two of the four as signs, scared (the one that hides) and sad (the miserable face of the one that shivers or droops), and happy as every well animal; it shows no angry animal. It never asks why the animal feels so.
- `edu.nl.fase-1.science.objective.ac25c5c5-2e15-4f7e-b4b4-8a0b68cebb75` (`nl ojw/pdm/4/05/fase1`): curriculum-institute-guidance, confirmed. Asks: treat plants and animals with care.
  Limits taken: what a school offers in fase 1 (groep 1 to 3), with no year named; an attitude shown in behaviour, not knowledge; no animals, care tasks or setting are named, and no hygiene condition for handling animals. Left open by Limits: which animals and which care. The game's own choice: six animals and five cares.
- `edu.nl.fase-1.science.objective.inhoudskaart-orientatie-op-jezelf-en-de-wereld-fase-1-planten-dieren-en-de-mens-groeien-bloeien-en-voortplanten-1` (`nl Groeien, bloeien en voortplanten / 1`, the pack's code for a bullet of the fase 1 card): curriculum-institute-guidance, confirmed. Asks: realise that plants, animals and people need water, food and a place in order to live.
  Limits taken: what a school offers for groep 1 and 2, with no year named; three needs are named, water, food and a place; a realisation, not an explanation; warmth is not mentioned. The game takes water only: the one that droops is helped by the bowl. The blanket's warmth is the game's own choice and is beyond this record.

### Where the two differ

- **Which feelings.** The `us-ca` foundation 1.3 gives basic emotions as examples and sets no number. The `nl` fase 1 card names four and says the others are children. The game follows neither list: its five states are its own choice, kept inside what both call simple or basic, and the two it shares with the Dutch four are named under `nl` above.
- **How far the youngest child goes.** At the earlier age the `us-ca` foundation 1.8 stops at concern and names helping only later. The `nl` peuter card asks for a basic reaction to a need and does not say the need is met. These are different bounds on different statements. The game takes the narrower reading of each for its first position: one need, one act.
- **Which care is named.** The `us-ca` records name water (3.7 at the earlier age, K-LS1-1 among its examples) and give sleep as an example at the later age. Of the `nl` records, the two that ask for care with animals name no care task, and the fase 1 card names water, food and a place. The game rests its first pair, the one that droops and the bowl, on the `us-ca` records and on the `nl` fase 1 card, each under its own heading, and its other four pairs on no record.
- **Standing.** The `us-ca` records are foundations, two adopted standards, and one statement of voluntary guidance. The `nl` records are all guidance of the curriculum institute and none is law. The claim uses each standing's own word and puts the two sets in separate clauses.
- **Age mapping.** Official for `us-ca`, convention for `nl`. The game reads neither at run time; `ctx.childAge` sets the first-visit position by the game's own table.

### The claim

Boo-Boo Vet is designed from three California preschool and transitional kindergarten learning foundations (`us-ca 1.3` and `us-ca 1.8` of Social and Emotional Development, and `us-ca 3.7` of Science), which are foundations published by the state's Department of Education and not standards; from two California content standards adopted by the State Board of Education (`us-ca K-LS1-1` and `us-ca K.7.2.M`); and from one statement of California's Transformative Social and Emotional Learning competencies (`us-ca 3.B.1`, cross-grade), which is voluntary guidance. It is also designed from six statements of the Dutch curriculum institute SLO, three bullets of its content cards for peuters, two bullets of its content cards for fase 1, and one of its goals per fase (`nl ojw/pdm/4/05/fase1`), all of which are guidance, not law, and say what can be offered, not what a child must know. All twelve records are confirmed in the pack.

What these records carry, and all the game is designed from: reading simple feelings in someone else from outward signs, answering another's need with one caring act, treating animals with care, and that an animal needs water. That an animal's need can be read from how it moves, and the game's other four pairs of sign and care, are the game's own design and rest on no record. The game makes no statement about what any child has learned or can do.

## The look

Written after the style spike, not part of the sheet: the claimed look, the palette, materials, lighting and motion rules, and how each tier in `config.ts` keeps the look.
