<!-- template: cartridge/ART.md v3 -->
# Design sheet

Rainbow World is open pretend play with a few wooden toys on a mat. It has no learning goal and claims no school skill. The sheet was written before any game code.

## The band and its age rule

- **Band.** The manifest band is 2 to 5. Its youngest age, 2, governs the design.
- **The cue table.** The table in `docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md` has no row below 3, so its row for 3 to 4 is the ceiling and the game cuts further. From that row the game takes direct handling of objects, cause and effect from the world's answer, a breathing glow on what can be touched, a ghost hand that shows one move, and characters who look and reach. Its "Avoid" column is kept whole: no text, numeral or pictured icon to decode, no spoken instruction, no verdict, never several activities at once, and no tool on stage before it means something.
- **The pack's rule for the age** (pack: game-design, ages-2-to-4.md). Everything works with a tap. A drag does the same as two taps, survives a lifted finger and counts when partly done. A tap that smears a short way, up to about 30 pixels, is still a tap and no drag. No pinch, tilt, shake, hold or double tap means anything. Every target is about 100 stage units across or more, the targets stand well apart, and none that the play needs lies in the bottom strip where wrists rest. The game is one action a toddler repeats unprompted: carrying a thing and setting it down. There are eight things to carry (three arches, three dolls, one horse, one silk) and never more than three of a kind.
- **Symbols.** The band starts below 6, so the kid side shows no word, letter, numeral or sign, optional or not, and the game has no `symbols.ts`. No voice instructs.
- **What `ctx.childAge` sets.** Only how the mat lies on a first visit, never what can be done:
  - 3 and younger: the smallest doll already stands on the mat, so the first tap on the mat side meets someone, and a first pair is one tap away.
  - 4 and older: the mat is bare and all eight things lie by it.
  - No age (`null`): as for 3 and younger.
  - A saved mat always wins over the age. Every thing and every pair is there at every age.

## The toy

The one action the finger performs most is **setting a thing down on the mat**. A tap on a thing by the mat lifts it at once: it rises a little, the shade under it shrinks, and it sounds its own note, short and high. A tap on the mat then sends it there in a quick arc, and it knocks down like a mallet on a wooden bar: its own note at full length with a wooden knock under it, a squash on landing, one small bounce and a settle. It stays where it was put. A drag does the same in one stroke: the thing follows the finger and knocks down where the finger lets go.

Each of the eight things has its own note, so the mat is an instrument that is played by furnishing it. The three arches are the three lowest bars, the largest the lowest; the three dolls are the three highest; the horse lands on two hooves, two wooden clops one after the other; the silk has no knock at all and sinks down with a sigh and one very soft bell.

The answer is bigger than the touch (pack: game-design, touch-answers-bigger-than-the-touch.md). A knock on the mat makes the mat's paper dip and spring back, every doll and the horse turns to look at the spot, whoever stands close hops from the knock, and the cat on the window sill opens its eyes wide.

Why repeating it is a pleasure with no goal (pack: game-design, toy-first.md): each tap is a note and a thing that lands with weight; the same thing gives the same note every time; a child who only ever taps the same doll gets lift, turn, lift, turn, each with its sound; and random tapping all over the frame always makes something sound and move. Nothing is asked for and nothing is finished.

## The object-by-action grid, and what is new on day 15

How a thing gets anywhere, at every age: a tap on a thing takes it in hand (it lifts). The next tap says where it goes: the bare mat, another thing on the mat, or anywhere off the mat, which sends it back to its place by the mat. A stack cannot go back as a stack: tapped off the mat, it is set down whole on the nearest edge of the mat instead. The cat, the pane and the window sill answer that same tap in their own way too, with a mew, a tink or a soft knock, and the thing goes back all the same. Only a tap sends it back, a contact that is down and up again within 0.6 seconds: a hand that comes to rest off the mat and stays there sends nothing anywhere, and a finger that lands on the mat or on a thing while it rests is answered as itself. A tap on the thing in hand itself turns it over and sets it down. A drag is the same as the two taps.

Rows are the thing in hand. Columns are where it is put or what is done with it. Every cell has its own look and its own sound, and the wrong uses are the funniest cells (pack: game-design, liveliness-from-causing-and-comedy.md).

| In hand | On the bare mat | Tapped in the hand (turned over) | On an arch that stands | On an arch on its back | On a doll | On the horse | The silk laid over it |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **An arch** | Knocks down standing on its two feet: its own low bar note, the largest lowest; one bounce. | Tips over onto its back, or back onto its feet, and rocks to rest: a knock at every rock, each softer and closer together. An arch on its back never shares a foot with a standing arch: turned over at its place by the mat, where the arches lie nested on their feet, it comes down on the nearest edge of the mat already rocking; turned over where it nests in a standing arch, or put on a standing arch while on its back, it comes down beside that arch. A doll or the horse that was in the cradle when it is set on its feet tumbles out and lands beside it with a knock. | Nests: a smaller one slides inside, a larger one drops over, and the colours deepen where the papers overlap. Its own note and the other arch's sound together as a clack of two bars. | Lies across the cradle as a lid and teeters: a tick and a tock on the two arches' notes, slowing, and it stays tilted. | Drops over the doll like a collar. The doll peers out through it and shuffles about blind: a hollow bonk, then the doll's muffled squeak. | Hangs round the horse's neck. The horse shakes it round and round: a rattle of quick dry knocks. | Over a standing arch, a paper hill: the silk sags into the arch's shape and hums one low held tone, and the dolls peek over it. Over an arch on its back, a hammock: the silk dips into the cradle, the cradle rocks once under it with two soft knocks, and a hum slides down and stops. |
| **A doll** | Knocks down standing like a skittle and wobbles: its own high bar note. It looks at the finger, and its eyes follow the finger for a moment. | Hops and lands facing the other way: a short chirp that rises. | Climbs to the top and slides down the far side: a whistle that falls all the way, and a bump at the bottom. | Is rocked to sleep: the cradle sways by itself on two slow notes, the eyes close, and the doll breathes out in soft sighs. | A wobbling tower: the one below staggers, the tower bows low and nearly drops the one on top. Both dolls' notes as a chord, then a trill that settles. | Rides: the horse trots one round of the mat, clip-clop, and the doll hiccups a note at every bounce. With a rider the horse will go through a standing arch that is tall enough to pass under, which only the largest is; it ducks, and the doll lies along its neck. It jumps a lower arch. | A ghost: the silk takes the doll's shape and hoots one soft wavering tone. The other dolls scamper away to the edges of the mat, the smallest first, each with a giggle when it gets there, and the ghost walks after them. |
| **The horse** | Lands on its front hooves and then its back hooves, two clops; shakes its mane and snorts. | Rears, whinnies (one tone that falls) and comes down facing the other way with a clop. | Without a rider it walks up to the dark mouth of the tunnel, plants its hooves, slides a little on its bottom and blows a long snort. With a rider it ducks and trots through an arch that is tall enough to pass under, which only the largest is, and its clops ring hollow inside; at a lower arch it whinnies, hops over it and lands on the far side with a clop. | A rocking horse: it stands in the cradle and rocks, creak and creak, and neighs upward. | Sits down on the doll. The doll carries the horse about, puffing a low note at each staggering step, and the horse looks pleased. | There is one horse. | A ghost horse: it gallops blind in a circle with muffled thuds and bumps softly into the edge of the mat. The dolls run. |
| **The silk** | Floats down slowly and spreads flat as a pond: a long sigh that falls and one very soft bell. It ripples once when anything lands on the mat. | Gathers itself into a heap, or flutters open again: three quick soft pats. | See the hill in the last column of the arch row. | See the hammock in the last column of the arch row. | See the last column of the doll row. | See the last column of the horse row. | There is one silk. |

The basket is the one thing that is never carried. What it does:

| The basket | Result |
| --- | --- |
| Tapped upright while things are on the mat | It tips onto its side with a wicker creak and a thud, and the dolls march everything on the mat back into it, each thing sounding its note as it goes in, the largest arch last. The tune is made of what was out, so it differs each time. |
| Tapped upright while the mat is bare | It tips, a doll leans in and calls into it, one hollow note that comes back as an echo, and the doll sets it up again. |
| Tapped on its side | It is set upright, full, and each thing hops out to its own place by the mat with a pop, the smallest first. A tap on a head that looks out of its mouth is a tap on the basket. |
| A thing put on it | The thing flies in over the rim in front of the basket, sinks behind it with a wicker thump, and peeks over the rim if it has a head. The wicker hides what is inside: at most three heads look out, each whole, over the rim of the upright basket or out of the mouth of the lying one, and nothing else in the basket is drawn. While the upright basket holds a thing, a tap on the basket pops that thing back out to its place and does nothing else, whatever is on the mat; where it holds several, each tap pops one, the smallest first, and a tap on a face that looks over the rim pops that one; the march and the call start only from an upright basket that is empty. A doll in the basket ducks and comes up again with a squeak, a game of boo. |

**Day 15.** Day 15 is day 1 with the child surer, quicker, and trying one more pair. Each pair answers exactly as it did before, so what a child found stays true and can be shown to someone (pack: game-design, depth-from-combinations.md, with its exception for ages 2 to 4). The things a child makes are their own: a tower with a ghost on top of a rocking horse is three pairs the game never names. How things stack: a thing put on a stack goes on its top, under the silk if the silk lies over it; a thing carries one thing and, beside it, any arches it wears; a thing that is lifted takes along whatever rests on it; and a stack that would reach up under the home control at the top of the frame sits closer together instead. A nest of standing arches is one arch, its outermost: a doll put on it climbs over the whole nest, the silk lies over the whole nest, and an arch on its back comes down beside the whole nest. The horse passes only under an arch that stands on the mat and whose hollow is empty, so with a rider it hops a nest, a hill, and a lid on a cradle, as it hops a low arch.

## The representation

The game has no learning goal, so no school idea is represented and there is no order of object, picture and symbol.

## The four mechanic questions

The game has no learning goal, so the four questions of the mechanic as a school skill have no skill to be asked about; the finger's work is pretend play with toys that answer.

## The error as a consequence

There is no wrong attempt. Every thing can go on the bare mat, on every other thing, into the basket or back to its place, and each of those gives its own result (pack: game-design, errors-show-as-consequences.md, with its exception for the youngest).

The nearest things to an error, and what the world does:

- **A thing let go off the mat.** It hops back to its own place by the mat with a soft knock and stands there. A stack that is let go off the mat is set down whole on the nearest edge of the mat instead. Nothing is lost and nothing is said.
- **A thing set down where another already stands.** That is a pair, and the pair's result plays.
- **The horse sent at a standing arch with no rider.** It stops at the mouth of the tunnel, where the child can see what it is looking at, and will not go in. It stands there, on the mat, and nothing is undone. The child changes one thing, a doll on its back, and it goes through, or hops over where the arch is too low to pass under.
- **A tap on the bare mat with nothing in hand.** The mat is a paper drum: a low thump, the paper dips and springs back, and the things by the mat hop once.

Nothing buzzes, nothing is refused without an answer, and no face turns to the child in disappointment.

## The designed order, and what is stored

**The designed order.** The game has no learning goal and no order of challenges. Its designed order has one place, `open-mat`, the only id in `LADDER` in `config.ts`. The id names the game's one place and no grade, groep or level. No cycle is judged, so the position never moves and `finished` is false in every save.

**What a first visit starts with, by age.** 3 and younger, or no age: the smallest doll stands on the mat and the other seven things lie by it. 4 and older: all eight lie by the mat. Both ends are open, and a saved mat wins over the age.

**What play changes.** Only where the things are. Nothing is unlocked, added or taken away by play or by time, and every pair answers the same on every day.

**Every field of the saved state.**

| Field | Holds |
| --- | --- |
| `v` | The version of the shape, 1. |
| `position` | `open-mat`, always. |
| `finished` | `false`, always: open play has no cycle to finish. |
| `basket` | `upright` or `tipped`. |
| `pieces` | One entry for each of the eight things, under its id: `arch-large`, `arch-middle`, `arch-small`, `doll-tall`, `doll-round`, `doll-small`, `horse`, `silk`. |
| `pieces[id].at` | `home` (its place by the mat), `mat`, or `basket`. |
| `pieces[id].x`, `pieces[id].y` | Where its foot stands on the mat, in whole stage units. Read only while `at` is `mat`. |
| `pieces[id].on` | The id of the thing it rests on, or `null` for the bare mat. Read only while `at` is `mat`. |
| `pieces[id].turned` | Turned over: an arch on its back, a doll or the horse facing the other way, the silk gathered in a heap. |

What is not a field, and why (ruling 5 of the check of the sheet). A sleeping doll, a ghost, a rider, a tower, a nest and a tunnel are each a view of `on` and `turned`, and are rebuilt from them on load: a doll whose `on` is an arch that is `turned` is asleep. A thing in hand is not saved in the hand, and on load nothing is in hand. A thing lifted by a tap is saved where it was before it was lifted. A thing put away while a finger carries it is left where the finger had brought it if that is over the mat, and else where it was before it was lifted; carried over another thing and not let go, it is not put on that thing but stands on the mat beside it. A thing put away in the moment after a finger let it go drops as it would have dropped. A thing in the air on its way to the mat is saved where it is going. The dip of the mat, a rocking that has not come to rest, a look, a hop and every idle motion are short-lived and gone on load. The largest state is eight entries of five small fields, far under half of the 64 KB cap, and a test says so.

## The characters and their fixed tastes

The three dolls and the horse are the characters, large in the frame from the first visit. The arches, the silk, the basket and the mat are plain things with no face and no idle motion: each moves only as the answer to a touch or as a beat of a scene.

| Character | Its one visible want | Likes, always | Dislikes, always |
| --- | --- | --- | --- |
| The tall doll (pointed hat) | To be the highest: it stands on tiptoe and looks up at the top of whatever is tallest. | The top of a tower, the top of an arch. It grins up there. | Being the one underneath. While it carries a doll or the horse it strains: its brows pinch up, its mouth is pressed into a wavy line, it wobbles and its hat sags, with its eyes on its load. It is itself again as soon as the load is off: the strain eases out of its face and its wobble within about half a second. |
| The round doll (flat cap) | To sleep: it yawns, and its eyes are half shut. | The cradle, where it sleeps at the first rock while the others need three. | Being lifted while asleep: one grumpy brow and a snort. |
| The small doll (big bobble hat) | To hide: it ducks behind the nearest larger thing and peeks round it. | The basket and the tunnel. It squeaks with glee as it sinks into the basket, and as it comes out of the tunnel on the horse, where it is seen. | The ghost: it runs first, and it alone runs the way that leads away from the ghost. |
| The horse | A rider: it turns its head to the nearest doll and paws the ground. | Rocking in the cradle; a doll on its back. | The dark tunnel without a rider: it will not go in. |

A cat on the window sill is a bystander and no part of the play. Its eyes follow whatever is in the air, its tail swings, and a tap on it gets a mew and a stretch. It changes nothing in the game.

No character's feeling is ever about the child, and none refers to the child stopping, leaving or coming back (pack: game-design, characters-with-opinions.md). Nothing else gives feedback: there is no score, tick, cheer or count.

## The scenes

A pair's answer that is over in under two seconds (a nest, a lid, a collar, the neck ring, the hill, the rocking horse) is an answer to a touch and no scene. The scenes are the longer ones. Each is a list of timed beats on the game's own clock, lasts 4 to 6 seconds (the march and the way out again last as long as there are things to move: the march from about 2 seconds for one thing to about 9 for all eight that stand apart, and under 10 when they are first taken down from one stack; the way out again from about 1.5 seconds for one thing to about 5.5 for all eight), is filled in from the things that are actually there, and gives way to any touch: the touch jumps everything to the end places that were saved when the scene started, the beats that were left make no sound, and the touch is then answered as an ordinary touch. No scene plays on load (pack: game-design, endings-and-short-scenes.md).

**Where the game sets a thing down.** Whatever a scene or an answer brings to rest (a doll that ran, the ghost, the horse at the mouth or on the far side, a doll at the foot of the slide, a thing that hopped out of the basket) stops on a free spot: never with its foot in another thing's, and never over another thing, the basket or a place by the mat while the mat has room. Where the spot is taken it stops beside it; on a mat too full to stand clear it takes the spot where it overlaps the fewest things, and the nearer one dims the one behind it, and a tap always goes to the thing it lands on, never to one behind it. The mat, the basket and the eight places by the mat lie clear of the jam's round home control at the top centre of the frame, so nothing the child must touch is under it. An overlap test holds both at 1180 by 820 and at 1024 by 768.

| Scene | Cause | Beats | Filled in from | Saved when it starts |
| --- | --- | --- | --- | --- |
| The ghost | The silk is put over a doll or the horse, or either is put under the silk. | The silk takes the shape and hoots softly; every other doll that stands on the bare mat looks, jumps, and scampers out to the edge of the mat along the line from the middle of the mat through the place where it stands, giggles when it gets there, and whatever rests on it goes with it; the small doll goes first, and it alone takes its direction from the ghost: it runs to the edge of the mat that lies, seen from the middle of the mat, in the direction that points from the ghost to the doll; a doll that rests on something stays there and ducks with a squeak; a ghost that stands on the bare mat walks or gallops a few steps after them and stops, and a ghost that rests on something stays there and sways. | Which thing is under the silk, which dolls are on the mat and where, and what each rests on. | The silk's `at`, `x`, `y` and `on`; the covered thing's `x`, `y` where it stops, if it stands on the bare mat; the `x`, `y` of every doll that runs and of whatever rests on it, where it stops. No `on` changes but the silk's. |
| The ride | A doll is put on the horse. | The horse looks round at its rider, trots one round of the mat with a clop at every step while the doll bounces, ducks through every standing arch on its way that is tall enough to pass under (only the largest is), the one it stands before first, with its clops ringing hollow inside, jumps a lower arch, goes round whatever else stands in its way at a body's width, and comes back to where it started. Where the mat is too full to go round a thing, it hops that thing as high as the thing stands, so that it passes through nothing. The doll hiccups at the top of each of its bounces, and a clop sounds each time the hooves come down. A horse that itself rests on something (a doll, a cradle) trots on the spot instead and stays there. | Which doll, where the horse stands, and which arches stand on the mat and where. | The doll's `at`, `x`, `y`, `on`. The horse ends where it began. |
| The tunnel | The horse is put on a standing arch. | Without a rider: it walks to the mouth, plants its hooves, slides, snorts, and stands looking in. With a rider, at an arch tall enough to pass under (only the largest is): it ducks, trots in, its clops ring hollow, and it comes out on the far side. With a rider at a lower arch: it whinnies, hops over the arch and lands on the far side with a clop. | Whether a doll's `on` is the horse, and which arch. | The horse's `at`, `x`, `y` and `turned`: at the mouth, or on the far side. Its `on` is `null` either way. The rider goes with it. |
| The slide | A doll is put on a standing arch. | It climbs up one side, waves at the top, slides down the far side and bumps to a stop. | Which doll and which arch. | The doll's `at`, `x`, `y` on the far side, `on` `null`, and `turned`. |
| Asleep | A doll is put on an arch on its back. | The cradle sways by itself; the doll's eyes close, after one rock for the round doll and three for the others; it breathes out in sighs. | Which doll. | The doll's `at`, `x`, `y`, `on`. Sleep is a view of `on`. |
| The tower bows | A doll is put on a doll. | The one below staggers left and right, the tower leans, bows low, comes back up, and settles with a small sway. | Which two dolls, and so who grins and who strains. | The top doll's `at`, `x`, `y`, `on`. |
| The carried horse | The horse is put on a doll. | The doll's knees give, it takes four staggering steps and stops. | Which doll. | The horse's `at`, `x`, `y`, `on`; the doll's `x`, `y` where it stops. |
| The march | The upright basket is tapped while things are on the mat. | The basket tips; a stack is taken down first, the top thing first, each set down on the mat with its own knock; then each doll on the mat picks up the nearest thing and walks it in, then walks in itself; a thing with no doll to carry it rolls or trots in by itself; the largest arch goes last. | What is on the mat and where. | `basket` `tipped`; every thing that was on the mat `at` `basket`, with `on` `null` and `turned` `false`. |
| The call | The upright basket is tapped while the mat is bare. | The basket tips; the small doll, whose place by the mat is the nearest to the basket, leans in and calls; the echo comes back; the doll sets the basket up. | Nothing: with the mat bare and the basket empty every doll is at its place, and the small doll's is the nearest. | Nothing changes, so nothing is saved. |
| Out again | The basket on its side is tapped. | The heads that look out draw back, it swings upright, and each thing in it rises over the rim in its turn and hops out to its own place by the mat with a pop, the smallest first. | What is in the basket. | `basket` `upright`; every thing that was in it `at` `home`. |

**How play ends and begins again.** Open pretend play has no ending. A mat left as it is stays as it is, for as long as the child likes and across visits, and nothing new starts by itself. The calm way to tidy up is the basket: tipped, it takes everything back; tapped again, it stands up and the eight things lie by the mat as on the first day (pack: game-design, endings-and-short-scenes.md, its exception; "How a cycle restarts" in the guide). Nothing waits, hurries or remarks on being left.

## The records

The game has no learning goal: there are no records, it is designed from none, and it claims no school skill.

## The look

Written after the style spike. This part is the art guide and is not part of the sheet.

**Kite-paper window**, the first look reserved for the game in `docs/art-direction.md`. It passed its spike on clarity and on the counted frame budget, so the second reserved look was not spiked.

**What it is.** Sheets of translucent waxed paper stuck on a sunny window. Every thing in the frame is cut from flat paper of one clear hue and laid with `multiply`, so wherever two papers overlap the colour is a deeper mixed one: the nested arches show orange and green bands where red lies on yellow and yellow on blue, a doll's scarf is a third colour where the hat's paper crosses the body's. Each sheet has a rim of its own colour, a little darker, and one to four fold lines, a faint dark crease with a pale one beside it. There are no black outlines, no gradients on a thing, no beams, no dark and no leads.

**Two things never read as one.** Paper lets what is behind it show through, so these keep things apart. The rim of its own colour closes every shape. Where the game sets a thing down it looks for a spot where the thing's body stands clear of every other, and takes one that overlaps another by no more than a sliver while the mat has room. A touch goes by shape: to the thing that is drawn on top where the finger lands, never to a corner of a box round it. The silk has an outline for each way it is drawn (spread as a pond, gathered in a heap, lying in folds at its place), and is touched by that one. The silk over something is touched wherever the cloth is drawn, down to its hem, and the thing under it only where it shows outside the cloth. And the nearer thing dims what is behind it: a thing that stands in front of another, rests on another or is in the hand is laid on a veil, its own outline in the pane's pale colour, so the thing behind shows through it faintly and the nearer one keeps its own colours and its face. The silk over a doll is laid on a veil too, so a ghost is a turquoise cloth with a dim doll under it. Where the child sets things down in front of each other, that is the child's picture.

**What is in the frame.**

- Behind the pane, out of focus and pale: a sky that goes from blue to green, the sun's glow at the top left, soft trees, a hedge and smudges of flower beds. It is painted once from large soft gradients; nothing is blurred per frame.
- On the pane, behind the play: three paper hills that overlap each other across the whole width, a paper tree at the far left and a paper house at the right, all at about a third of the strength of the things that can be touched.
- Hanging in the window on threads, swaying: a paper sun that turns slowly and two paper clouds. Motes of light drift across the glass.
- In the middle, the mat: plain cream paper that lets less light through, with a deeper rim and two folds. It is the bare working surface and stays bare (pack: game-design, a-full-frame-with-large-funny-characters.md, its exception).
- By the mat: the nest of three arches and the horse to the left, the three dolls in a row behind its far edge, the silk and the woven basket to the right. The silk at its place lies in large folds with one corner lifted in the air, so it reads as cloth and as a thing to take.
- The basket is the one thing in the frame that is not see-through: its wicker is woven dense on a ground of its own, so what is inside is hidden. Only heads look out, three at most, each whole and upright and none over another's face: over the rim of the upright basket, and out of the round mouth of the basket on its side, which is seen from the mat straight into its mouth. Each doll has its own place to look out from (the tall one in the middle, the round one at the right, the small one at the left) and the horse takes the middle or the right when a doll does not. Things in it are a little way back and drawn a little smaller. Nothing else in the basket is drawn at all. A thing on its way in is seen whole over the rim before it sinks, and on the way out each rises from the mouth in its turn.
- Along the bottom, where wrists rest: a wooden window sill with two pots of paper leaves and a striped paper cat lying on it.

**Palette.** Eight clear hues and three quiet ones, all in `paper.ts`: red, orange, yellow, green, blue, violet, pink and turquoise for the paper; a skin tone for the dolls' heads; cream for the mat; a warm tan for the wicker; and one dark indigo ink for eyes, brows and mouths. The large arch is red, the middle one yellow, the small one blue. The tall doll is red under a violet hat, the round doll orange under a green cap, the small doll blue under a yellow hat with a red bobble. The horse is violet with a pink mane and tail and a yellow blanket. The silk is turquoise. Things that can be touched are laid at 0.6 to 0.85 strength; the setting at 0.22 to 0.45.

**Who has a face.** The three dolls, the horse and the cat. Their eyes are white with an ink pupil that follows what just landed, then the thing in hand, then the finger; lids close for a blink and squeeze shut on landing; brows lift and tilt; the mouth goes from a smile to a round hole. Faces are the only things drawn fresh each frame. The arches, the silk, the basket and the mat have no face and no idle motion: each moves only as the answer to a touch or as a beat of a scene.

**Light and shade.** The light is behind everything. Under each thing lies one faint cool shade that shrinks as the thing lifts, which is all the weight the paper needs. Where something lands, a pale ring opens in the mat's paper and fades. A tap on the pane or on the sill opens a smaller one where the finger landed, and at a tap on the sill the cat flicks its tail. While a thing is in hand the mat's rim lights up: that is where it can go. A nearer thing dims the one behind it (see above). The idle glow is a soft pale halo behind each thing that can be taken. When nothing lies by the mat it is behind two things on the mat instead, the two the hand will show: one to take and one to put it on, each a thing the hand can point at without pointing at another. The hand points at a standing arch on its band, not into its hollow.

**Motion rules.**

- A thing is answered when the finger lands: it stretches as it lifts, flies in an arc that leaves slowly and comes down fast, squashes on landing, bounces once and settles. The silk has no weight and sinks slowly, swaying.
- A doll turns by going edge-on, as paper does. An arch goes over in a quarter of a second and rocks on its crown, rolling as it rocks. The horse rears round its back hooves.
- Each character moves like itself (`motion.ts`): the tall doll goes up on tiptoe with its hat's point quivering, the round doll breathes slowly and yawns with its cap tipping back, the small doll bobs fast, ducks and pops up with its bobble swinging, the horse lifts its front twice and swings its tail, the cat's tail swings slowly and it stretches. The tall doll under a load strains, with pinched brows and a wavy mouth, and wobbles with what it carries; that is its face while it carries and is gone the moment the load is off. No two share a tempo, a blink or a habit, and a test holds that.
- No sound is without something seen: the sleeper swells with each sigh, the ghost's cloth with each hoot, the doll rocks into the basket as it calls, the small doll pops up with its glee as the horse comes out from under the arch, and the lying basket gives under the finger on the frame of the tap and rings out.
- Everything is driven by the world's own clock, sight and sound alike.

**Tiers.** `config.ts` has four. Each lowers the pixel ratio (2, 1.5, 1.25, 1), at which every sprite is cut again, and the number of motes of light (7, 5, 3, 0). Nothing else changes, so the lowest tier is the same window with softer edges and still air.

**A nest is one arch.** Standing arches nested at one foot are seen, climbed, covered and gone round as the outermost of them: a doll slides over the whole nest, the silk drapes the whole nest, and a rider's horse, which ducks only under an arch whose hollow is empty, hops it. Nothing passes through a band. A lid on a cradle is no arch to pass under: a rider's horse hops it, over the top of the lid. On the ride the horse goes round whatever else stands on the mat, at a body's width; where the mat is too full to go round a thing, it hops that thing as high as the thing stands.

**The silk in each place.** Lying in folds at its place; spread flat as a pond on the bare mat, or gathered in a heap when turned, at its place as on the mat; a drape as wide and as high as what it covers (a hill over a standing arch, a ghost over a doll or the horse); the same drape hung upside down in a cradle as a hammock; a heap in the basket.

**The frame's cost.** One stamp of the painted setting, then sprites and a few fresh fills and strokes. One number is held, at 1180 by 820 and at 1024 by 768: at most 60 draws a frame, a draw being one sprite stamped or one fresh fill or stroke, which is what `frameBudget.test.ts` counts. Counted: 44 at rest, 51 idle with the glow and the hand (50 with all eight on the mat and the light round two of them), 56 at the busiest moment found (eight things crowded one before another, each on its veil, rings in the mat and on the pane, a thing in hand), 38 with the basket on its side and everything in it. A veil is one stamp more for the thing it lies under.

**The look's row in the registry of `docs/art-direction.md`** (game Rainbow World, art guide `games/rainbow-world/ART.md`):

Kite-paper window 2D: sheets of translucent waxed paper in clear rainbow hues stuck on a sunny window and laid with multiply, so every overlap is a deeper mixed colour; each sheet has a darker rim of its own colour and a few fold lines; large paper dolls, a paper horse and a striped paper cat with ink faces on a plain cream paper mat, before pale paper hills, a paper sun and clouds on threads, and a garden out of focus behind the pane
