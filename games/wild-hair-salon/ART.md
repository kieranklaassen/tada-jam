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

**Day 15.** The child gives haircuts on purpose to four customers whose tastes they know, to get the reaction they want to see; carries a length across the room on the ribbon without being shown; dresses faces with moustaches and eyebrows cut to size from clippings; and matches by eye, from across the room, a model that differs only a little, where on day 1 the model hung right beside the lock and differed plainly.

## The representation

A length is a **plain straight strip that hangs from a level line**. Two strips hang side by side with their top ends level, so the whole difference between them is at the bottom: the piece of one that reaches below the other, or the gap.

- **It was chosen before the game.** A length is the stretch from one end of a thing to the other, and it is compared by putting one end level and looking at the other end. Hair that hangs from a head already has its top end fixed, and a second strip hung from the same line beside it is the comparison a child makes with two sticks on a table. The salon was built around that.
- **The three strips.** The customer's lock, the friend's lock (the model), and the ribbon. All three are flat, of one colour each, of the same width, and straight when they hang at rest, so that length is the only thing in which they differ. They have no face, no pattern and no idle motion: a strip moves when it is touched and then settles. They hang over the customer's cape, which is one flat colour of a contrasting hue (pack: game-design, working-objects-stay-plain.md). The mane, the faces and the room carry the look.
- **Top ends level is the material's work.** The cape's collar is the level line. When the friend stands beside the chair it holds the top of its lock at that line, and the ribbon's clip goes to that line wherever the ribbon is hung beside a lock. The child is not asked to line anything up; that is the game's own choice.
- **Its evidence.** Comparing two lengths side by side with one end level is school practice in both jurisdictions. The pack's research holds no trial of it for this age, so it is school practice without a trial behind it. What the research does support is the general form: the idea is visible in the object, and the child can see in the objects why something worked (pack: game-design, representation-before-game.md).
- **Where object, picture and symbol stop.** The band starts below 6, so there is no symbol stage. The child handles drawn objects, and the order ends there: no numeral, no scale, no mark on a strip, and no unit (pack: game-design, fade-to-school-symbols.md).

## The four mechanic questions

- **Swap.** No: what the finger changes is a length and what the salon answers to is whether two lengths are alike, so with another subject in its place there would be nothing to pull or snip.
- **Attention.** At the moment of decision the child looks at the two free ends that hang side by side from one line, and thinks about which reaches further and by how much.
- **Fun.** The skill is used in the pull and the snip themselves, which are the two most enjoyable touches in the game, and play never stops for it.
- **Guess.** No: a random snip or pull gives a random length, nothing sounds or snaps when the ends meet, a lock cut to the root or pulled to the floor is as far off as a lock can be, and trying length after length works only by looking at the two ends after each try, which is the skill.

## The error as a consequence

- **While the child works** nothing judges. The lock is as long as the child made it, and beside its model the difference is in plain view: a piece that sticks out below, or a gap.
- **When the child pulls the cape off**, the customer hops down and stands cheek to cheek with the friend, the lock beside the model with top ends level, and both look down at the two free ends. The scene acts out the comparison the child made.
- **Too long.** The piece that reaches below the model is the piece things happen to: it trails on the floor and the customer treads on it, or it gets in a mouth or round a leg, each customer in its own way. The bigger the piece, the bigger the muddle.
- **Too short.** The gap is where things happen: the customer feels for hair where the model's end hangs and finds air, and the friend's longer end tickles its chin.
- **As long as the model.** The two ends meet, the pair turn their heads together, and the two locks swing as one. That is a consequence too, and no more is made of it than of the other two.
- **Where and why.** Where is the two free ends, side by side. Why is the piece or the gap, which stays in view for as long as the pair stand there.
- **The state stays.** The hair is as the child cut it. A touch on the chair brings the customer back under the cape, the child pulls or snips, and the cape comes off again. Nothing resets and nothing is lost: hair cut too short is pulled long again.
- **Nothing gives a verdict.** No sound, mark or face says right or wrong, and every reaction is about the hair and never about the child. A customer who trips over a lock is surprised and never hurt.

## The designed order, and what is stored

**A cycle** is one customer: a pair comes in, the customer sits under the cape with the friend as its model, the child works on the hair, the child pulls the cape off, and the pair stand together. A cycle fits in a minute or two, and a visit of a few minutes holds two or three (pack: game-design, many-short-visits.md).

**The order.** Six positions, one new thing at a time and then combinations of what is known. The ids are the ones in `LADDER` in `config.ts`; each names a place in the salon's own order.

| Id | Where the model is | How the lock starts | What is new |
| --- | --- | --- | --- |
| `beside-long` | The friend stands beside the chair, its lock next to the customer's | Plainly longer than the model | Matching by snipping |
| `beside-short` | Beside | Plainly shorter | Pulling |
| `beside-either` | Beside | Plainly longer or plainly shorter | Nothing new: the child has to see which it is |
| `beside-close` | Beside | A little longer or a little shorter | A small difference |
| `across` | The friend sits on the bench across the room | Plainly longer or plainly shorter | A model that cannot be held beside the lock, and the ribbon |
| `across-close` | Across | A little longer or a little shorter | Nothing new: the two before it together |

**The sizes** are the game's own choice, since no record named below gives a size. Lengths are whole steps from 4 (a stub) to 100 (down to the floor), and a step is never shown. A model is between 34 and 66. "Plainly" is a difference of 24 to 30 steps, "a little" is 9 to 14, and two ends meet when they are within 5.

**The harder option the child can pick.** The stool beside the chair and the bench across the room are both in the salon. A touch on the empty one sends the friend there, at any moment and as often as the child likes. A model across the room looks harder, because it is further away, and the child may always choose it or undo it. The position only decides where the friend sits when the pair comes in.

**How a cycle goes**, judged once, when the cape first comes off: **well** when the lock is within 5 steps of the model, **mixed** when it is within 12, and **badly** otherwise. The position then moves one step up, stays, or moves one step down, for the next customer. Pulling the cape off again in the same cycle plays the scene again from the hair as it then is and judges nothing. A visit put away before the cape comes off leaves the position where it was. Nothing on screen shows the position or that it moved.

**Which customer a new position lays out.** The next pair waits at the door with their hair tucked under rain hats. What is laid out before they come in is only who they are. Their lengths and the friend's seat are laid out as they come in, from the position as it stands then. So a position that moved when the cape came off shows on the very next customer, never on the one after.

**What is stored**, as plain versioned JSON through `ctx.storage`, saved on every change and read defensively field by field:

- `v`: the version of the shape.
- `position`: the id of the place in the order where the next customer is laid out.
- `finished`: the cape has come off in this cycle, so the cycle is judged and nothing judges it twice.
- `chair` and `friend`: who is in the chair and who is the model.
- `waiting`: the pair at the door, as two ids.
- `seed`: a whole number that the next layout and the next pair are drawn from. No clock and no other source of chance is read.
- `lock` and `model`: the two lengths, in whole steps.
- `seat`: `beside` or `across`, where the friend is now.
- `cape`: `on` or `off`. With `off` the pair stand together as the scene left them.
- `mane`: the lengths of the nine tufts of the customer's mane.
- `ribbon`: nothing until the ribbon has first been shown, then its length and where it hangs: on its peg, beside the lock, beside the model, tied in the mane, round a face, or on the floor.
- `clippings`: up to twelve pieces, each with a length, a colour, and where it lies: a place along the floor, or stuck on the customer's or the friend's face. A thirteenth piece turns the oldest one on the floor into fluff that blows away.
- `shown`: three marks, for the three things a character shows once: the snip, the pull and the ribbon.

A lock held in the fingers is stored at the length it has. A ribbon or a clipping carried in the fingers is stored where it was picked up. The scene that plays when the cape comes off is not stored: `cape`, `finished` and the new position are saved when it starts, so a game put away in the middle of it opens with the pair standing together and plays nothing again. The largest state the game can reach is under two kilobytes, and a test holds it under half the 64 KB cap.

## The characters and their fixed tastes

Four customers. Each comes as the customer on one day and as somebody's friend on another, and is the same animal in both parts.

**The one want, always visible.** The customer wants its lock as long as its friend's. Its eyes go from its own lock to the friend's and back, and a paw pats its own. That want is about two things in the scene and is never about the child.

**The tastes never change.** A child can learn them and try them on purpose, and a dislike is as good to watch as a like.

| | The lion | The poodle | The yak | The angora rabbit |
| --- | --- | --- | --- | --- |
| Tempo and weight | Slow and heavy | Quick and light | Slow and soft | Fast and twitchy |
| Funniest part | The tail tuft | The pom on the tail | The nostrils | The ears |
| The mane | Likes it pulled big: shakes it out and rumbles. Hates it short: pulls the cape over his head and peeks out with one eye | Likes it snipped into round poms: prances on tiptoe, nose up. Hates it long over her nose: three sneezes, each bigger, and the last blows it straight up | Likes it long over his eyes: plays peekaboo through it with a low chuckle. Hates his eyes showing: blushes and hides behind his hooves | Likes it short so the ears stand free: the ears pop up and twirl. Hates it long: the ears flop like wet socks and it hops in a circle |
| A bow in the mane | Hates it: goes cross-eyed and bats at it like a kitten | Loves it: turns her head from side to side at the mirror | Loves it: tucks it under his hair and pats the place | Hates it: thumps a hind foot until it slides off an ear |
| A head rub | Loves it: purrs and melts down in the chair | Hates it: huffs and puts every curl back with a paw | Hates it: sinks into his hair until only the nose shows | Loves it: one hind leg kicks by itself |
| Lock too long | Treads on it and turns the stumble into a slow bow | Trips, spins out of it and holds the pose | Finds it in his mouth and chews it, thinking | Gets wound up in it like a spindle and unspins |
| Lock too short | Pats for it; an ear pops out and flicks | Gasps and fans herself with a paw | Snorts, and his own fringe flies up | The ears shoot up, and one droops |
| Lock as long as the model | A slow head toss in step with the friend | A tiptoe turn with the friend | A low hum, rocking from side to side | A jump with a twist |

No two customers share a reaction. As the friend, each has its own way of having its lock pulled, snipped or ruffled (the grid's second row, in that animal's voice and with its funniest part). A friend's feelings are about the hair too, and no one in the salon refers to the child stopping, staying, leaving or coming back.

## The scenes

Each scene is a list of timed beats filled in from the state of play, on the template's `scene.ts`. Any touch ends a scene at once and leaves everyone where the scene would have put them.

- **Coming in** (4 to 6 seconds). Cause: the child touches the door where the next pair waits. Beats: the door swings, the pair walk in, each with its own gait; the rain hats pop off and the hair springs out; the customer hops into the chair and the cape lands on it; the friend takes its seat; the customer looks from its lock to the friend's and pats its own. Filled in from who the two are, the nine tuft lengths, the two lock lengths and the friend's seat.
- **The cape comes off** (6 to 10 seconds; the ending). Cause: the child pulls the cape off by its knot. Beats: the cape flies; the customer hops down and goes to the friend; they stand cheek to cheek with the two locks side by side and their top ends level; both look down at the free ends; the customer does its own too long, too short or as-long reaction, sized by the piece or the gap; then it answers to its mane, its bow and whatever is stuck on its face, by its tastes; the pair settle by the door. Filled in from the two lengths, the mane, the ribbon, the clippings on faces and who the two are, so it stars exactly the haircut the child gave.
- **A thing shown once** (3 to 8 seconds each; the three marks in `shown`). Each is a move in the salon, done once by a character on something that is not the problem in front of the child, and never again unasked (pack: game-design, guided-discovery.md).
  - *The snip*, in the first cycle ever: the customer pokes a paw out of the cape and nips one tuft of its own mane; the piece falls.
  - *The pull*, the first time a lock starts shorter than its model: the customer tugs one tuft of its own mane longer, and it stays.
  - *The ribbon*, the first time the friend sits across the room: the friend takes the ribbon from its peg, holds it beside its own tail, pulls it until it is as long as the tail, trots over, holds it beside the customer's tail, and hangs it back on the peg. From then on the ribbon is in the salon.

**How a cycle ends.** The child ends it, by pulling the cape off. The pair then stand together by the door for as long as the child likes, breathing and blinking, with the haircut on show. A touch on the chair brings the customer back under the cape for more.

**How the next one starts.** The next pair is visible at the door the whole time, under their rain hats. They come in when the child touches the door, and the pair that was done go out past them. If the child does nothing, nothing starts: no next round begins by itself and nothing counts down. The ones who wait look about and rock on their heels; they never knock, wave the child over or look at a clock.

**On load** no scene plays. The salon is as it was left: the cape on or off, the friend on its seat, every length as it was, the clippings where they lay, and the next pair at the door.

**The idle ladder** (the template's `guidance.ts`, on attended time) shows what can be touched and then one move, never a solution: first a breathing glow on the lock, then a ghost hand that snips or pulls one tuft of the mane, which is the verb and not the answer, and after that the cape's knot. It backs off and stops after a few tries.

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
