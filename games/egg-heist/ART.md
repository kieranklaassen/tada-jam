<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

Egg Heist has no learning goal. The idea the child feels is the thrill of mischief behind someone's back, with nothing at stake: a raccoon creeps about a farmyard while a goose patrols it, and whatever the raccoon carries off and leaves somewhere does one funny thing there, the same every time.

## The band and its age rule

The manifest band is 6 to 10, and its youngest age, six, governs the design.

- **The cue-table row.** The row for a youngest age of 5 to 6 in the wordless-clarity convention, read for a band that starts at 6. Its "Avoid" column binds the game: no word or letter, no numeral or symbol the child must read in order to go on, no voice instruction, no hint that gives an answer. More than one thing may be live at once, and each still reads at a glance: one creature that moves on a tap, one guard whose gaze is drawn on the floor.
- **The pack's rules for the range.** The band lies between the pack's age rules, so both ends are kept: reacting characters and tricks from the younger rule (pack: game-design, ages-4-to-6.md), and from the older one a system that behaves the same every time, failure that is large, funny and free, dry humour, and nothing babyish (pack: game-design, ages-9-to-12.md).
- **The symbol rule.** The band starts at 6, so numerals and mathematics signs would be allowed beside a quantity. The game has no quantity to label and draws none: the alarm clock's face is plain, with two hands and no marks, and the game has no `symbols.ts`. No letter or written word is drawn at any age. The goose's alarm is shown by her body and by lines bursting from her beak, never by a sign over her head.
- **What `ctx.childAge` sets.** Nothing. The yard is one place, the same at every age, and how hard a crossing is depends on what the child chooses to go for: a thing beside the home bush, or one at the far side of the goose's round.
- **What no age gives.** `null` gives the same yard.

## The toy

**The action.** Tap where the raccoon should go, and it creeps there. That is the touch the finger performs most.

**In an empty scene.** A farmyard stands on a toy-theatre stage. The raccoon peeps out of its bush at the left. The goose walks her round in the middle of the yard, and the patch of floor she can see lies in front of her as a pale wedge. Nothing asks for anything.

- **When the finger lands,** in that frame, a little stage peg drops into the floor at the spot with a tok and wobbles, and the raccoon snaps round to face it with its ears up. Then it creeps: stiff little pushes along its groove, one plucked note for each, the notes walking up and down a tiptoe tune. To change grooves it is lifted and set down again with a clack. Every tap that sends the raccoon somewhere, on a thing, a place or the goose as much as on bare floor, is answered in that frame by the snap round, the ears and the first plucked note; the peg is for bare floor only.
- **A tap on a thing** that lies about (a ball, a potato, an alarm clock, a boot, a cabbage, the egg) makes the thing hop where it lies, when the finger lands. The raccoon creeps to it and lifts it over its head with that thing's own sound, and the tiptoe tune drops lower while it carries.
- **A tap on bare floor while carrying** has the raccoon creep there and set the thing down on the boards just in front of that groove, where a figure of the groove passes behind it, and each thing lands in its own way (the last column of the grid below).
- **A bush hides.** A raccoon that stops in a bush drops down behind it with a rustle, and only its ears and eyes show, with its paws and whatever they hold up. The goose's gaze passes over a bush and finds nothing.
- **Seen in the open.** When the wedge lies over a raccoon that is not in a bush, the goose stops, her neck goes up and the wedge turns hot: a double-take of about half a second, with a rising "hm?". A raccoon that reaches a bush or leaves the wedge in that time is let off with a low "hmph". Otherwise she honks, shoots along her wire, and punts the raccoon back to its home bush in a high arc with a slide whistle. What it carried pops up and lands where the raccoon stood. The bush shakes, the raccoon peeps out again, and the goose struts back to her round with her beak in the air and her eyes shut.
- **A tap on the goose** ruffles her, two feathers shaking loose over her back when the finger lands, and sends the raccoon to the spot behind her tail. Stopped in a double-take, startled or glaring, she only ruffles: no peg is laid and the raccoon is sent nowhere. If it gets there unseen it plucks a feather, and so does a raccoon that slides into her tail unseen on its way somewhere else: a twang, a honk, a straight-up jump and a spin on her stick, and she then faces the way the pluck came from.
- **A tap on a toy of the setting** is answered by that toy as itself and changes nothing: a cloud bobs on its wire with a squeak, the curtain sways, the sun whirls once on its pin, the tree drops an apple, the fence rattles and its sparrow hops along it, the barn knocks hollow, its half-door shakes and the farmer opens an eye or, awake already, jumps, a small bird flies up out of the far hills, and the gilt frame above and below the stage jumps away from the stage with a knock and settles. Open sky is the clouds': the one nearest the finger bobs. Each answers where it is drawn: the pelmet with its swags, the curtains down to their flare over the floor, the barn up to its weathercock. A place is touched wherever it, its owner or the thing in it is drawn as it stands, and a place that stands in front of a toy of the setting keeps its own tap.
- **A finger that drags** leads the raccoon: it creeps after the finger as the finger moves, does nothing where it arrives until the finger lets go, and stops where it is when the finger is taken away.

**Why repeating it is a pleasure with no goal.** One tap is answered at touch-down by the peg, the turn and the first plucked note, and then by a chain the child set going: the tune, the stiff creep, the goose's gaze sliding nearer, the dive into a bush (pack: game-design, touch-answers-bigger-than-the-touch.md). Random tapping walks a raccoon about to music and now and then gets it punted through the air, which is the funniest thing in the toy and costs nothing. The simplest use, one tap, always works, and waiting in a bush costs nothing either, so the child sets the pace (pack: game-design, toy-first.md; pack: game-design, liveliness-from-causing-and-comedy.md). A person watching sees within three seconds that the child is sneaking a raccoon past a goose.

A tap in the top right corner, 72 by 72, belongs to the grown-ups and gets no answer in the yard.

## The object-by-action grid, and what is new on day 15

Six things lie about the yard and five places take them. A raccoon that reaches a place with a thing in its paws puts it there, and that pairing has one outcome, always the same. Each cell below is what is seen and heard. The sixth column is the wrong use every thing has: set down on bare floor.

| Thing | In the nest (the goose) | In the pond (the frog) | On the scarecrow (and his crow) | In the dog's bowl | On the washing line | Set down on bare floor |
| --- | --- | --- | --- | --- | --- | --- |
| Ball | The goose sits on it, it rolls from under her and she rides it backwards a step with rubber squeaks, then sits astride it, proud | Plops in and bobs; the frog hops on and it spins under him like a log, his feet pattering | Stuck on the scarecrow's hat peg as a second head; the crow lands on it and runs on the spot to stay on, boing after boing | The dog pounces, it squirts out from under his paws, and he noses it round the bowl with three yaps, then rests his chin on it | Pegged into one leg of the long johns as a round knee; the wind swings it against the prop and it bonks, twice | Bounces three times, each lower, with a boing that drops |
| Potato | She knocks on it with her beak, tok tok, listens, shrugs and sits on it lopsided with a low cluck | Sinks with a glug; three bubbles come up and the last pops on the frog's nose | Laid in the scarecrow's hand; the crow walks down the arm and pecks two eyes and a mouth into it, tk tk tk | The dog bites it with a crunch, pulls a long face, spits it back with a pthoo and shoves the bowl away with a scrape | Too heavy: the line sags to a deep V, the washing slides down to the middle with a zip, and the potato hangs at the point of the V, the lowest thing on the line | Thuds and rocks half a turn, a dull knock |
| Alarm clock | She sits on it proudly while it ticks under her feathers; it rings, she shoots straight up in a burst of feathers, lands and glares at it | Sinks ringing, a gargled ring through the water; each bubble that pops lets out a small ting, and the frog claps his hands over his ears | Hung round the scarecrow's neck; it tocks loudly, the crow nods in time, it rings and the crow falls off the shoulder with a clatter | The dog cocks his head at the tick; it rings and he howls along, rising with it, then puts a paw on the bell with a clunk and wags | Hung by its ring; it swings like a pendulum, tick one way and tock the other, and when it rings the pegs chatter along the line | Lands with a clank, one ding and two last ticks, and lies still |
| Boot | She pokes her head in to look and it sticks; she staggers about with the boot on her head, honking hollow inside it, and shakes it off into the nest | Floats upright like a boat; the frog climbs in as captain with a croak like a horn, and it settles until only the top shows, trickling | Worn as a hat, which makes him a giant; the crow caws, the goose looks up, squawks and bolts into the pond with a great splash | The dog grabs it and shakes it from side to side with a growl and a flap, flap, flap, then lies down and chews the lace | Pegged up by its laces; a sparrow moves in with a tweet, and water drips out of the toe, plink, plink | Stands itself upright with a clomp |
| Cabbage | Her favourite: she tears off the outer leaves, rip, munch, munch, leaves flying, sits on what is left and lets out a small honk of a burp | Floats like a lily pad; the frog hops onto it with a leafy flop and a ribbit, and it turns slowly under him | Set on the scarecrow's head as a curly green wig; the crow pulls the leaves off one by one with a rip each, down to a leaf collar | The dog sniffs it twice and sneezes so hard that the leaves blow off across the yard and he rolls over backwards | Its leaves unroll along the line like small flags and flutter, flap and rustle, in the wind | Flumps down and one leaf slides off with a rustle |
| Egg | Home: she rolls it with her beak, settles onto it with a wiggle and a long purring coo | Bobs upright like a cork; the frog pokes it, it ducks under and pops back up with a bloop | Laid on the scarecrow's head; the crow sits on it to hatch it, very seriously, fluffs up and says one soft caw | The dog buries it: a scrabble of paws, earth flying, the egg dropped in, earth nosed back over it and patted flat, and he lies down on the mound | Pegged up in a sock; the goose hops stiffly underneath it, honk and hop, honk and hop, and cannot reach | Wobbles upright like a tumbler toy, tok, tok, tok, and stands |

**What a pairing leaves.** The thing stays in the place, shown as that pairing's last picture (the pecked potato in the scarecrow's hand, the mound under the dog), until the raccoon takes it out again. A thing taken out is itself again, whole and plain.

**How the pairings feed each other.** One rule joins them: a place holds one thing, and a newcomer sends the thing that was there on to the next place, where it does what it always does there. The places pass in a fixed ring.

- The nest tips its old thing down the boards into the pond.
- The frog kicks the pond's old thing out across the floor to the dog's bowl.
- The dog tosses the bowl's old thing over his shoulder onto the washing line.
- The line lets its old thing slide down to the scarecrow, who holds its far end.
- The crow carries the scarecrow's old thing to the nest and drops it in.

A thing sent on to an empty place stops there. A place takes one newcomer in a round: a thing that would come to a place that has had its newcomer is set down on the floor beside it, so a round ends after at most five outcomes. That is the thing that comes round to where the round began, and, when the boot hat falls in the middle of a round, the thing the goose sends out of the pond towards a bowl that has had its newcomer; two such things land together. The goose bolting into the pond (the boot hat) is a newcomer too, whether the boot reached the scarecrow from the raccoon's paws or from the washing line in the middle of a round: she sends on whatever is in the pond, floating or sunk, then climbs out and is lifted on her wire to the lane the raccoon is not beside, where she walks on as after any scene, so nothing that was in the pond stays in it (the round may then tip the nest's old thing into it), and the goose is never saved in it.

**The wrong use of each thing works and is funny.**

- Set down anywhere on bare floor: the sixth column.
- Carried when the goose punts the raccoon: the thing pops up and lands where the raccoon stood, with its floor landing.
- A place tapped with empty paws and something in it: the raccoon takes the thing out, with that thing's lifting sound. A place tapped with empty paws and nothing in it gets a poke: the nest rustles, the pond takes a toe with a plip and the raccoon shivers, the scarecrow is tickled and creaks while the crow caws, the bowl is licked and the dog gives a low growl, the line is twanged and the washing bounces.
- A thing tapped while another is carried: the raccoon sets the first down beside it and takes the second.
- The goose's tail, plucked: under "The toy".

**On day 15** the child knows the goose's round by heart and crosses the whole yard behind her back in one go, plucks her tail on purpose and is in a bush before she has turned, and sets up rounds of the yard: with all five places full, a sixth thing taken to any one of them sends five things on, one after another, in an order the child arranged. Six things over five places fill the yard in 720 ways and each goes round differently, with no content beyond the thirty pairings and the one rule (pack: game-design, depth-from-combinations.md; pack: game-design, liveliness-from-causing-and-comedy.md).

## The representation

The game has no learning goal, so no school idea is represented and there is no order of object, picture and symbol to stop anywhere.

## The four mechanic questions

The game has no learning goal and its verb, sneaking a thing past a guard to a place, carries no school skill, so the four questions have no skill to be asked about.

## The error as a consequence

A wrong attempt is a raccoon in the open when the goose's gaze reaches it.

- **Where and why it shows.** The gaze is on the floor before anything happens: a pale wedge in front of her beak, as far as she sees and as wide. At the end of a lane, while she looks about and hops across to her other lane, a second pale patch lies on the ground she is about to land on, and she sees what is under it too. What is drawn is all she sees, at every moment. When it lies over the raccoon it turns hot and her neck goes up, at the place and the moment the child was wrong, and for about half a second the child can still act on it.
- **What it does.** She honks and punts the raccoon home in a high arc. It is the biggest and funniest motion in the game, it is about the raccoon and the goose and never about the child, and the raccoon peeps out of its bush at once, dizzy and unhurt.
- **The state stays.** What the raccoon carried lies where it fell, every place keeps what it holds, and the goose walks the same round. The child changes one thing, the moment or the way across, and goes again. Waiting costs nothing: nothing in the yard runs out, burns or leaves (pack: game-design, errors-show-as-consequences.md).

A thing in the "wrong" place is no error: all thirty pairings work.

## The designed order, and what is stored

**The designed order.** There is none to climb: the game is open pretend play in one yard. `LADDER` in `config.ts` holds the single id `yard`, which names the place and no grade, groep or level, and `FIRST_VISIT` has one row.

- **What a first visit starts with, by age.** At 6 and younger, and at 7 and older, the same yard: the raccoon in its home bush, the egg in the nest, the other five things lying on the floor at their starting spots, every other place empty, and the goose at the start of her round. It is a default and gates nothing.
- **With no age given.** `null` gives that same yard.
- **What play changes.** Where the raccoon stands, where each thing is, and where the goose is on her round. Nothing else: the round, the goose's sight and the thirty outcomes never change, so what a child finds out stays true.
- **A harder thing is chosen by the child and looks harder in the world**: a thing that lies farther from cover, a place on the goose's own lane, a round of all five places.
- **There are no records**: the game has no learning goal and is designed from no learning standard.

**Every field of the saved state** (version 1, plain JSON, read field by field, each repaired by itself):

| Field | Holds | Default when missing or damaged |
| --- | --- | --- |
| `v` | The version, 1 | A record at any other version is unreadable and gives a fresh yard |
| `position` | `yard` | `yard` |
| `finished` | Always `false`: open play has no finished cycle | `false` |
| `raccoon` | The groove it stands in and how far along it | The home bush |
| `things` | For each of the six: on the floor at a groove and a place along it, in the raccoon's paws, or in one of the five places | That thing's starting spot |
| `goose` | Which leg of her round she is on and how far along it | The start of her round |

- At most one thing is in the paws and at most one in each place; a record that says otherwise keeps the first and sends the rest to their starting spots. Two cases follow from that: the egg's starting spot is the nest, so an egg sent home takes the nest and a thing that was read into the nest goes to its own starting spot; and a thing sent home to a spot another thing lies on is laid at the nearest free spot.
- **Nothing is saved in the air.** A raccoon caught mid-creep is saved where it has got to, standing in its groove, with what it carries still in its paws. A thing is on the floor, in the paws or in a place, never between them.
- **What a pairing shows is not stored**: it is rebuilt from which thing is in which place.
- **Short-lived, and gone on load:** the stage peg, feathers and leaves in the air, the hot wedge of a double-take, and a goose turned to face a pluck. She is found walking her round.
- **After a load, or when a parked game comes back,** a scene, a punt, a tidy or a glare that was playing is over without its sounds, the farmer is asleep, no errand is pending, the goose walks her round as before, and she does not notice the raccoon until the child has touched the screen once, so a yard left with the raccoon in the open is found as it was left and nothing happens to it before the child acts.
- **Size.** The largest legal state is six things and two characters, a few hundred bytes, and a test holds it under half of the 64 KB cap.

## The characters and their fixed tastes

Each is a stiff printed figure whose one want can be seen at all times.

- **The raccoon** wants whatever lies nearest. Its paws are out and its eyes are on that thing, from the bush or in the open, or on what it carries; while the goose is near it or alarmed its eyes are on her. It likes everything and fears only the goose. It is the child's figure and gives no verdict.
- **The goose** wants her egg under her and her yard in order. Her gaze is on the floor in front of her and at every lap she looks into the nest: an egg gets a nod and a cluck, an empty nest gets a look underneath it and a puzzled honk. She likes anything round and smooth to sit on (the egg, the ball, the potato) and loves cabbage. She cannot stand noise (the clock), is nosy about anything hollow (the boot) and is frightened of anything taller than she is (the scarecrow in a boot hat). She punts raccoons.
- **The dog** wants something in his bowl. He sits beside the empty bowl with his nose over it and his tail going, and watches the raccoon wherever it is. He chases what rolls, buries what he treasures (the egg), shakes what flaps (the boot), sings with what rings, and cannot stand greens (the potato and the cabbage).
- **The scarecrow** wants a hat. His head is bare, with a peg sticking up out of it, and his eyes turn up to it. He is vain, and anything on his head makes him stand taller. **His crow** wants to peck: it sits on his shoulder with its head on one side and pecks, pulls or sits on whatever he is given.
- **The frog** wants something to ride. He sits on the one small lily pad in the pond, looking over the water. He climbs onto anything that floats and is big enough to carry him, pokes what is too small to ride (the egg), and is bothered by anything that sinks.
- **The farmer** wants his nap and a tidy yard. He dozes over the half-door of the barn with his hat over his eyes, and opens one eye at any loud noise.

No character's feeling is ever about the child, and none refers to the child stopping, waiting or coming back (pack: game-design, characters-with-opinions.md).

## The scenes

Every scene is the consequence of what the child just did, is a list of timed beats on attended game time, and gives way to any touch: the touch jumps the yard to the scene's saved outcome and is then an ordinary touch. A beat that makes a sound stays quiet when a touch is ending the scene. One exception: a tap on the place whose own pairing is playing only ends that pairing and takes nothing out again, so a child who taps twice does not undo what it just did.

- **A pairing** (4 to 8 seconds). *Cause:* the raccoon reaches a place with a thing in its paws. *Beats:* the thing goes in, the place's owner takes it up, the cell's outcome plays, the last picture holds. *Saved when it starts:* `things` as they will lie when the scene is over (the thing in that place, the thing that was there at the next place or on the floor beside it, and with the boot hat what was in the pond sent on to the dog's bowl), `raccoon`, and `goose` at the start of the lane the raccoon is not beside, walking away from it: a goose with no part in the scene is lifted there on her wire as it ends, so a child who watched to the end has at least four seconds before her sight comes round. *Filled in from the state of play:* which thing and which place. The place is empty: a full one makes it a round. The boot hat on an empty scarecrow is a pairing and plays in full, whatever the pond holds; what the goose's splash tips out of the pond then plays its short form at the dog's bowl. Only if that bowl is full has the splash taken a thing to a full place: that is a round, and the boot hat plays short with the rest of it.
- **A round** (up to five pairings one after another, each in a short form of about 2 seconds, so a whole round stays within 10 seconds). *Cause:* a thing taken to a place that is full, whether the thing that was there then goes on to an empty place or to a full one. Both pairings play in their short form. The nest starts full, with the egg in it, so the first thing taken there plays short. Every cell plays in its full form at a place that was emptied first, the nest included once the egg has been taken out, so no cell is seen only in its short form. *Saved when the first pairing starts:* `things` as they will lie when the whole round is over, with `raccoon` and `goose` as a single pairing saves them, so a game put away in the middle of a round is found with the round done and nothing plays on load. *Filled in from:* what the child had put where.
- **The punt** (about 3 seconds). *Cause:* the goose's double-take runs out with the raccoon still in the open. *Beats:* the honk, the dash along her wire, the kick, the arc and the slide whistle, the crash into the bush, the peep, her strut back. *Saved when it starts:* `raccoon` (the home bush), `things` (what it carried, on the floor where it stood) and `goose`. *Filled in from:* where the raccoon stood and what it carried.
- **The tidy** (about 2 seconds when nothing is out of place, and from about 2.5 to 4.5 seconds with one to six things to put back). *Cause:* a second tap on the barn door while the farmer is awake. One tap only wakes him: he tips his hat back, looks out, pushes the door ajar now and then with a creak, and dozes off again after about four seconds with nothing moved, so a stray tap wipes no layout. *Beats:* the half-door bangs open when the second tap lands, the farmer slides out with a two-note whistle, each thing that is out of place is whisked back to its starting spot in turn with its own lifting sound, the egg last into the nest, and he slides back in and pulls his hat down. *Saved when it starts:* `things` (all six at their starting spots, the one in the paws included) and `goose`. *Filled in from:* which things were out of place. They go back in the order of the grid's rows, the egg last, so the scene needs nothing the saved state does not hold.

The tail pluck and the double-take are reactions of a second or less, not scenes, and save nothing.

**How a cycle ends and the next one starts.** There is no cycle: this is open pretend play with no ending. A yard stays as the child left it for as long as the child likes, nothing new starts by itself, and the calm way to tidy up is two taps on the barn door, one to wake the farmer and one to have him tidy. On load no scene replays (pack: game-design, endings-and-short-scenes.md; pack: game-design, the-world-keeps-and-waits.md).

**What the idle ladder shows.** With empty paws, the glow lies on the things that can be picked up and the ghost hand taps the thing nearest the raccoon. With a thing in the paws, the glow lies on the five places and the hand taps one of them, a different one each time, and never one the goose is standing at. Every pairing works, so the hand shows a move and never an answer.

**Nothing set down covers a target.** A thing the game lays on the floor (a set-down, a drop from a punt, the end of a round) is laid at the nearest free spot of its groove: never on a place, a bush, the goose's lane ends or another thing, and never under the round home control at the top centre or in the top right corner. The five places, every bush, the barn door and the six starting spots stand clear of the home control too (a round control 48 px across, at the top centre, 10 px from the top), and what passes under it, the clouds on their wires, is nothing the child must touch. A model overlap test holds all of this at 1180 by 820.

## The records

The game has no learning goal, so it is designed from no record of either jurisdiction and claims no school skill.

## The look

**Toy theatre on sticks**, the first look reserved for this game, kept by the lead after Run 1. The spike passed on clarity (a goose, a raccoon, a wedge of sight and six plain things read at a glance at 1180 by 820) and on the frame budget as counted (below), so the second reserved look was not tried. No frame rate has been measured.

**What it is.** A paper theatre on a table. A gilt pelmet and apron frame the stage, red curtains hang at both sides, and the farmyard behind them is one printed backdrop: sky, hills, an apple tree, a picket fence, the barn, the worn lanes the goose walks and the pond. Across the floor run four grooves. Everything that moves is a flat printed card cut out round its outline, standing in a groove or hung on a wire, with a small soft shadow under it so it stands a little in front of what is behind.

**The print.** One engraved outline in a warm brown-black ink (`INK` in `art.ts`) on cream paper (`PAPER`), flat tints laid a little off their outlines the way a hand-coloured sheet is, and ruled hatching for shade. No gradient but the glow and the wedge of sight, which are light and not print. The palette is a penny sheet's: curtain red, gilt ochre, a pale washed sky, two greens, barn red, the scarecrow's blue.

**How a card moves.** A card is stiff. It slides along its groove in pushes of its wire, tilts, hops to the next groove with a clack, and turns round by flipping, thin for a moment. It never bends, stretches or squashes: weight comes from timing, the dead stop after a push, the bounce and rock of a thing set down and the overshoot of a tilt. A figure that changes its mind changes its card: the goose has a card for walking, for her double-take, for honking, for the kick and for her strut, and each swap is a hard cut, as a child's hand would swap the figure on the stick. When a thing is taken out of a place its owner tips over from the picture it was in and settles, with the card swapped halfway, so the cut is inside a movement. Eyes are the one thing that moves inside a card: pupils on a tab behind the eye holes, so every character looks at what is happening.

**What is live and not a card.** Four things are drawn each frame as strokes: the goose's sight on the floor (the wedge, and at a lane end the patch she is about to hop onto), the wires that push the figures, the pupils, and the rope of the washing line, which sags under what hangs on it and carries the washing with it. The barn's half-door is a card of its own on a hinge: the woken farmer pushes it ajar with a creak, and it bangs open when he tidies. The setting has two small cards that show only when it is tapped: an apple that falls from the tree in front of everything on the stage, and the sparrow, which hops along the fence at its own size and flies up out of the far hills at seven tenths of it; the sun, the pelmet, the apron and the half-door are cards already and are turned, bumped or shaken. Where a finger lands on the setting is read from the same shapes the print is cut to (`yard.ts`), and where it lands on a place from the cards and spots the frame draws (`looks.ts`): the thing in it, its owner in the pose the last picture leaves it in, and for the washing line its rope, washing and prop as they hang.

**How the stage is layered.** From the back: the backdrop; what stands behind the back groove (the scarecrow, the nest, the prop pole and the washing line); then the four grooves from back to front. In a groove the figures stand; a thing on the floor lies on the boards a little in front of its groove, so a figure of that groove passes behind it and a figure of the next groove passes in front; a bush is a wide flat in front of its groove, and a raccoon that stops in one is cut off at the groove and sunk until only its ears, its eyes and its lifted paws show. The pond belongs to the front groove. A figure lifted on its wire (a punted raccoon, a goose changing lane, a thing sent on in a round) passes over everything, and the proscenium is in front of all of it. Model tests hold the order and the clearances (`frame.test.ts`, `yard.test.ts`, `model.test.ts`).

**The sizes.** The goose is the largest figure. The raccoon is drawn at one and a quarter times its first size, large enough to read as the child's figure across the table and still smaller than the goose. A thing sent a long way in a round goes up out of sight on its wire and drops in at the next place.

**What stands in the frame.** The raccoon in its bush; the goose with her sight laid on the floor in front of her; the scarecrow with a crow on its shoulder; the dog by his bowl and kennel; the frog on a lily pad in the pond; the farmer dozing over the half-door; long johns, a sheet and two socks on the line; four bushes; the nest. The six things are the plain working pieces: one flat colour each, no face, so a child sees at once what can be carried. No shape in the print reads as a count or a sign: the clock's face is plain with two hands, the potato has one crease and one dimple, and the door has plain boards.

**What a pairing leaves in the frame.** Each of the thirty has its own last picture, drawn from which thing is in which place and from nothing else: the pecked face on the potato in the scarecrow's hand, the leaf collar, the mound under the dog, the frog as captain of the boot, the sock with an egg in it, the cabbage's flags along the line, the potato at the point of a deep V with the washing slid down to it.

**The frame, read from the still at rest.** About a fifth of it is plain sky or plain grass with nothing on it but print (hatching, tufts, pebbles), judged by eye and not measured; the rest is stage, setting, characters and things. What is funny before anything is touched: the scarecrow's worried face with a crow sitting on it, the goose's cross eyebrow and stiff neck, the raccoon's mask peeping over a bush, the dog's tongue, the farmer asleep with his hat over his eyes. What is alive: the goose walks her round and her feet tap, the raccoon peeps and ducks, the dog's tail and tongue go, the crow pecks, the frog blinks and bobs, the farmer nods, the washing swings, the clouds slide, the sun turns and the curtains sway.

**Guidance in this look.** The glow is a warm light behind a card, and the ghost hand is a white-gloved hand on a stick, a prop of the theatre. With empty paws it taps the thing nearest the raccoon; with a thing in the paws it taps one of the five places, first the one nearest the raccoon and then a different one each time, never the same place twice running and never a place the goose is standing at. Neither is a word or a sign.

**Tiers.** A tier in `config.ts` sets the pixel ratio and nothing else. The cards are painted again at the new density, so the print stays sharp at each tier, and the look has no effect that a lower tier takes away.

**The quality bar's squash, in this look.** Paper does not squash. Where the bar asks for squash and stretch, a card tilts, bounces, rocks and overshoots, and the lead has ruled that this answers the line.

**The registry row, a request to the lead.** For the claimed-styles registry in section 3 of `docs/art-direction.md`:

```
| Egg Heist | Toy theatre on sticks 2D: a printed paper theatre in daylight, a gilt proscenium and red curtains round a farmyard backdrop, stiff hand-coloured figures cut out on cards that slide in grooves on wires, tilt, flip and are swapped but never bend, engraved brown-black outlines with flat off-register tints and ruled hatching on cream paper | [`games/egg-heist/ART.md`](../games/egg-heist/ART.md) |
```

**The README row, a request to the lead.** For the table of games in `README.md`:

```
| Egg Heist | `games/egg-heist/` | 6–10 | A paper toy theatre of a farmyard: creep a raccoon from bush to bush past a goose who punts what she sees, carry six things to five places, and watch what each place makes of each thing, one sending the next along when a place is full. No learning goal. |
```
