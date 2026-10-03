<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 4 to 6, and its youngest age, 4, governs every choice below.

- **The cue-table row.** Age 4 falls in the 3 to 4 row of the age-band cue table in `docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md`. The cues the game uses from it: a breathing glow on what can be touched now, a ghost hand that shows one move, characters who gaze and reach, tools that appear only when they mean something (the sponge comes out with the first spill), and materials that correct themselves (tea that runs over a rim, a painted line that the tea covers). Its "Avoid" column is a hard limit here: no text, numeral or pictorial icon that has to be decoded, no spoken instruction, no verdict, never several activities live at once, and no tool on the table before it means anything. One next act is offered at a time and one finger does everything.
- **The pack's rule for the range** (pack: game-design, ages-4-to-6.md). The game is pretend play: a table, props and guests who react, and the child supplies the plot. Every act is a tap, a press that is held, or a drag that survives a lifted finger. There is no double tap and nothing to read. The jokes are tricks and slapstick on a guest who overreacts and is never hurt.
- **The symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, optional or not, and the game has no `symbols.ts`. The rings painted inside a cup are brushwork at a height, not marks to be read as a scale: there are no ticks, no count of them is ever needed, and each cup carries one.
- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order. A child of 4 or 5, a younger child, and no age at all (`null`) start at the first position, `brim`. A child of 6 or older starts at `lay-a-place`, two steps on, where the place is laid before the pour. A saved position always wins over the age, every position stays reachable by play from either start, and nothing is locked or hidden by age. A new idea is still shown once to a child who starts further on, because each first showing has its own stored mark.

## The toy

**Pouring.** The finger presses a cup and holds; the teapot pours into it for as long as the finger stays, and stops when it lifts.

In an empty scene there is a plain cloth, the pot, and one cup on its saucer.

- **When the finger lands**, in the same frame: the pot hops off the cloth with its lid rattling and swings its spout over the cup, the cup settles into its saucer with a clink, and the first drop is already falling. Nothing waits for the lift.
- **While it is held**: the stream thickens over the first half second from a dribble to a steady rope of tea, so a short press gives a drop and a long one gives a cupful. The tea is a warm amber disc on the cup's white inside, and it climbs the wall as it grows, so the amount can be read at every moment of the pour, from the first coin of tea at the bottom to the skin that bulges at the rim. The sound of the filling cup climbs in pitch as the space above the tea gets shorter, as a real cup's does, over the glug of the pot.
- **When it lifts**: the pot rights itself, one last drop hangs on the spout and falls with a plip, the lid lands with a click, and the surface rocks and settles.
- **Past the rim**: the tea runs down the outside into the saucer, fills the saucer, and then creeps onto the cloth as a puddle with a soft patter. The sponge comes out of the tray at the first spill, and rubbing it over the puddle takes the tea up along the stroke with a squeak.
- **The simplest use always works**: a tap on the cup gives one drop and a ring of the cup, pitched by how full it is. A press anywhere else pours there too: on the cloth it makes a puddle, on the saucer a shallow pool, on the pot itself a tip where it stands.

**Why repeating it is a pleasure with no goal.** The child is making a liquid do things: it stretches, thickens, climbs, bulges, runs over and spreads, and each of those has its own sound that the finger plays by staying or leaving. The cup is an instrument: the same hold never sounds quite the same, and the spill is the funniest part, costs nothing and wipes away. A person watching sees within three seconds that the child is pouring tea. No part of it needs a guest, a target or an ending (pack: game-design, toy-first.md; pack: game-design, touch-answers-bigger-than-the-touch.md).

## The object-by-action grid, and what is new on day 15

Six things, five things a finger can do. A press that is held always means the same: the pot pours onto whatever is under the finger for as long as it stays. "Put it on" is a drag that ends on another thing; the drag survives a lifted finger.

| | Tap | Press and hold (the pot pours here) | Carry it across the cloth | Put it on another thing | Rub it |
| --- | --- | --- | --- | --- | --- |
| **A cup** | It rings like a small bell, lower the fuller it is, and the tea ripples. One drop falls in from the pot. | The tea climbs the white inside, and the filling note climbs with it. Past the rim it runs into the saucer. | It slides with a ceramic hiss and the tea sloshes against the wall; a brimful cup leaves a dotted trail. | On a saucer it seats with a clink. On another cup, the bowl or the pot it tips all its tea in with a glug and hops down beside it. On a guest it is a hat. | It spins on its foot and the tea turns into a whirlpool with a low hum. |
| **A saucer** | It spins like a coin and rattles down to rest. | A shallow pool spreads to its edge with a flat patter, then spills. | It skims fast and far, like a puck, and stops with a wobble. | On the stack it claps onto the others. Under a cup, the cup hops on. On a guest it is a flat hat that slides off. | It squeaks clean and flashes once. |
| **A spoon** | It flips end over end with a tinkle. | The stream hits the bowl of the spoon and fans out in a sheet with a hiss. | It drags with a thin scrape and swings round behind the finger. | In a cup it stirs: the tea swirls and the spoon tings the wall. On a saucer it lies down with a click. On a guest it balances on the nose. | It rattles in place like a spoon on a table. |
| **The pot** | The lid hops, rattles and lets out a puff of steam with a toot. | It tips where it stands and pours a puddle on the cloth. | It goes where it is put, heavy, with a slosh inside, and stays there. | On a guest: the guest opens its mouth and drinks from the spout. On the bowl: it empties the bowl back into itself with a gurgle. | The painted fish on its side swims once round the belly. |
| **The sponge** | It squelches, and squirts a drop if it holds tea. | It swells as it drinks the stream, then leaks at the edges. | It leaves a damp streak that fades; over a puddle it takes the tea up along the stroke. | In a cup it dabs out a thimbleful. Squeezed over a cup (a tap while it lies on one) it gives its tea back. On a guest it wipes the face, and the guest scrunches. | It scrubs the cloth with a squeak and takes up the puddle under it. |
| **A guest** | Each has its own poke: the Bear's belly wobbles with a hum, the Mouse squeaks and her whiskers spin, the Hen puffs and clucks, the Ducklings peep one after the other. | The guest gets the stream: the Bear gulps it, the Mouse puts up her tail as an umbrella, the Hen shakes it off in a spray, the Ducklings splash in it. | The guest gets down and toddles after the finger to another seat, cup in hand. | On another guest's seat the two swap places, each in its own walk. | It is a tickle: each guest has its own giggle and squirm. |

Every wrong use works: a cup worn as a hat, tea in the saucer, a puddle poured on purpose, a guest served straight from the spout. None gets a refusal, and all of it wipes up or pours back at no cost (pack: game-design, liveliness-from-causing-and-comedy.md).

**What is new on day 15.** The child pours from cup to cup on purpose and knows what comes of it: that the Mouse's drop fills the thimble exactly, that the Hen's cup tipped twice fills the Bear's, that cups filled to different heights ring a tune, and which guest will do what with a puddle. On day 1 the child filled one cup for one Bear (pack: game-design, depth-from-combinations.md).

## The representation

The school idea is how much: how much tea is in a cup, how much a guest wants, and how much a cup can hold. It was chosen before the game, and it is a continuous amount that the child pours, never a set of pieces to count.

- **How much there is** is a level. The cups are open and wide and are seen from above and in front. The inside is plain white glaze, and the tea is a plain warm amber disc that grows wider and climbs the wall as the cup fills. Nothing else is inside a cup.
- **How much is wanted** is a line. Each guest owns a cup of the house size with one cobalt ring painted round the inside at the height that guest likes. Enough is the tea meeting the ring. Too little is white wall showing between the tea and the ring. Too much is the ring under the tea, and more than the cup can hold is tea over the rim, in the saucer and then on the cloth.
- **As much as** is two cups side by side. The Ducklings' cups carry no ring. They hold them rim to rim, and the child sees which has more.
- **How much a cup can hold** is its size. Three plain cups hold a drop, half a house cup and a house cup, so each is one guest's amount when it is full. Tipping one cup into another shows which holds more: tea is left over, or room is left.
- **The working objects stay plain** (pack: game-design, working-objects-stay-plain.md). The tea, the inside of a cup and the cloth under it carry no pattern, face or idle motion. The pottery's brushwork is on the outside of the pot, on the guests and on the wall behind the table.

This is school practice without a trial behind it: the practical-life tray with a natural error (the water spills), which the pack's table lists for ages 2 to 4 and 4 to 6 with no trial cited, and the starting of amounts with pouring before counting (pack: game-design, representation-before-game.md). The order of object, picture and symbol stops at the object: the band starts below 6, so there is no symbol stage, and the game uses no picture of an amount either (pack: game-design, fade-to-school-symbols.md).

## The four mechanic questions

- **Swap.** No: take the tea away and nothing is left to hold, compare or spill, because every decision in the game is about an amount of liquid in a container.
- **Attention.** At the moment the finger lifts, the child must be looking at the tea in the cup and judging it against the painted ring, against the other cup, or against the rim: enough, too little or too much. The pot finds the cup by itself, so nothing is aimed. The stream is steady and never speeds up, a house cup takes about four seconds to fill, and a pour may be made in as many presses as the child likes, so what is judged is the amount and not the instant. The guests give no sign while the tea is running.
- **Fun.** Yes: the pour is the toy and the best moment of play, and the judgement is made inside it. Play never stops for a question.
- **Guess.** No. An amount is not one of several options, so there is nothing to try in turn, and tapping at random makes drops and puddles but does not bring the tea to a ring. Creeping up to the ring in small pours is the skill done carefully. Where two cups of different sizes are handed out, a child can try both ways round, and the wrong way round shows why it is wrong, so the second try is not blind.

## The error as a consequence

Nothing rates a pour. The guest picks up the cup and what happens next is what that amount of tea does.

- **Too little.** The guest tips the cup right back, one drop lands on its tongue, and it peers into the cup and sets it down a little nearer the pot. It does not drink. The white wall between the tea and the ring shows where and why. The tea stays as it is, and the child presses the cup again to add to it.
- **Too much.** The guest tries and it goes wrong in its own way, by the tea's own logic: the Mouse's cup is too heavy and slops on her whiskers, and the Hen's beak goes in too deep and blows bubbles. The guest sets the cup down and looks at it. The ring is under the tea. The tea stays as it is. The bowl slides out from the tray the first time this happens, and the child tips the cup into it, dabs some out with the sponge, or pours it into another guest's cup, and tries again.
- **More than the cup holds.** The tea runs over the rim into the saucer and from the saucer onto the cloth, where the puddle is exactly as large as what ran over. The sponge comes out from the tray, and a rub takes the puddle up. No guest is cross about it; what each one does near a puddle is its own taste.
- **Two cups that are not the same.** The Duckling with less looks from its cup to its twin's and back, and both hold their cups out again. Both cups stay as they are. The child adds to the lower one or tips some out of the fuller.
- **A cup too small or too big for its guest.** The Bear drains the thimble in one lick, peers into it and holds it out again, as often as it is filled. The Mouse cannot lift the big cup and climbs up to look over its rim. Nothing is lost: the cups can be changed round at any moment.
- **A place that is not laid.** A guest with no saucer holds its cup in the air and looks at the stack. A cup on the bare cloth still takes tea, and a spill there goes straight onto the cloth.

There is no buzzer, cross, sad face turned to the child, reset or lost piece, and a pour that is right is also only a consequence: the guest drinks (pack: game-design, errors-show-as-consequences.md). A failed try is small, local and fixed in a moment (pack: game-design, guided-discovery.md).

## The designed order, and what is stored

A cycle is one **sitting**: a party of guests comes to the table, each place is laid, each cup is poured, and the sitting ends when every guest has drunk a cup to its taste.

**The order.** One new thing at a time, then what is known in combination. The ids are the ones in `LADDER` in `config.ts`. They name places in this game's own order and nothing else.

| Position id | The party | What is new |
| --- | --- | --- |
| `brim` | The Bear alone. He lays his own place. | The pour: press, hold, let go. Full, and not yet full. |
| `drop` | The Mouse alone. She lays her own place. | Letting go early. Too much, and the bowl and the sponge. |
| `lay-a-place` | The Bear or the Mouse, with a cup and nothing else. | A saucer and a spoon from the tray for the guest. |
| `two-guests` | The Bear and the Mouse. | Nothing new: two places and two rings at once. |
| `halfway` | The Hen with the Bear or the Mouse. | A ring in the middle of the cup. |
| `three-guests` | The Bear, the Hen and the Mouse. | Nothing new: three places, three rings. |
| `twins` | The two Ducklings, whose cups have no ring. | As much in one cup as in the other. |
| `whose-cup` | The Bear and the Mouse with no cups; a house cup and a thimble on the tray. | Cups that hold different amounts. Full is the line. |
| `three-cups` | The Bear, the Hen and the Mouse with no cups, seated smallest to largest; three sizes of cup on the tray. | Nothing new: three cups to hand out, which end in a row by size. |
| `full-table` | Any four of the five, some with their own ringed cups and some without. | Nothing new: everything together. |

A party never has more than four guests, and the table has four seats. The amounts are the game's own choice, since no record names a unit or a number: a house cup holds one cupful, the Hen's ring and the middle cup are half of that, and the Mouse's ring and the thimble are about a seventh. A pour is to taste when the tea is within about a finger's width of the ring.

**A harder option the child can see and pick.** The bowl, the sponge and every cup are always free to use, so a child can at any sitting pour from cup to cup, share one cup between two guests or fill the thimble from the Mouse's cup. It looks harder because it is: more tea is moving between more cups. Nothing asks for it.

**How the position moves.** Each guest's first lift of the cup in a sitting is noted as to taste or not. When the sitting ends:

- it went **well** if every guest's first lift was to taste: the position moves one step on;
- it went **badly** if there were two or more guests and no first lift was to taste: one step back;
- anything else is **mixed**, and the position stays.

The position never moves during a sitting, and a visit put away before the sitting ends leaves it where it was. At `full-table` a sitting that goes well stays there, with a new party each time. Nothing on screen shows the position, and no clock is read.

**Which party a new position lays out.** The next party does not wait on screen while the child works. It comes to the garden gate when the sitting ends, after the position has moved, so it is laid out from the new position and there is no party in between. It is stored from that moment and waits there for the child's touch.

**What is stored.** Plain JSON through `ctx.storage`, versioned, read field by field by a defensive `deserialize`. Every field:

- `version`: the number of this shape. A higher one than the game knows is treated as unreadable.
- `position`: one id from the order above. An unknown id falls back to the first-visit default.
- `seed`: the state of the seeded stream that picks the ordinary detail of a party (which of two guests comes, who sits where). It is never shown and counts nothing.
- `shown`: the ideas a guest has already shown once, as a list of ids (`pour`, `lay`, `halfway`, `twins`, `sizes`), so no showing plays twice.
- `sitting`: whether the sitting is `open` or `ended`.
- `guests`: for each guest at the table, who it is, its seat, its first lift in this sitting (none yet, to taste, too little, too much) and whether it has drunk a cup to its taste.
- `things`: every movable thing with where it lies: its kind (pot, cup, saucer, spoon, sponge, bowl), its size and the height of its ring if it is a cup, whose it is, where it stands on the cloth or which thing it stands on, and how much tea is in it. A thing in the hand is stored where it was picked up.
- `tools`: whether the sponge and the bowl have come out of the tray.
- `puddles`: the tea on the cloth as a coarse grid of 24 by 12 cells, each holding an amount.
- `waiting`: the next party at the gate, as a list of who comes and with which cup, or nothing while a sitting is open.

A pour in progress is not stored as such: the tea already in the cup is. A scene's outcome is stored when the scene starts, so a guest's first lift is noted before its sip plays, and on load no scene plays again. The largest legal state, with four guests, every thing on the cloth and a full grid of puddles, stays under half of the 64 KB cap, and a test holds that (pack: game-design, ordered-challenges-high-success.md; pack: game-design, many-short-visits.md; "The hidden position" and "Found as left" in the guide).

## The characters and their fixed tastes

Every guest has one visible want: it sits with its paws or wings on the table and its eyes on its own cup, and looks from the cup to the pot. No guest gives a sign while tea is running; each one watches the stream in the same way whatever the height. What a guest thinks shows after the pot has gone back, starts within a few hundred milliseconds of the lift, and is about the cup, never about the child.

- **The Bear.** Big, slow and heavy; his belly and his lower lip are the funny parts. He wants his cup **full to the brim**. He likes tea in the saucer too, and licks it up. A spill does not trouble him. He dislikes a cup with room in it and a cup that is too small.
- **The Mouse.** Tiny, quick and neat; her whiskers and her tail are the funny parts. She wants **only a drop**. She dislikes a cup that is too full and anything wet on the cloth by her place: she lifts her tail clear of a puddle and will not sip until it is wiped.
- **The Hen.** Middle-sized, busy and fussy; her neck and her comb are the funny parts. She wants her cup **half full**, and she stirs it with her spoon before she drinks. She dislikes tea over her ring, and a place with no spoon: she looks under her saucer for it.
- **The Ducklings.** Two, alike, the second copying the first half a beat late; their tails and big feet are the funny parts. They want **the same as each other**, at any height. They dislike one having more than the other. They like puddles and paddle in them.

These never change, in any position or with any cup, so a child can learn them and test them on purpose: what does the Bear do with the thimble, what does the Mouse do when the Ducklings' puddle reaches her. Nobody thanks or praises the child, nobody is disappointed in the child, and a guest who waits never hurries anyone or remarks on being left (pack: game-design, characters-with-opinions.md).

## The scenes

A scene is a list of timed beats over a handful of poses joined by springs, built on the template's `scene.ts` and filled in from the state of play. No scene plays before the child's action, none blocks the next touch, and none plays again on load.

- **The sip** (4 to 8 seconds). Cause: the pot has gone back to its stand after pouring into a guest's cup. Beats: the guest reaches, lifts, looks in, then does what that amount of tea brings (drinks; or tips it back for one drop; or its own mishap with too much), and sets the cup down. Filled in from: who the guest is, how the tea stands against the ring or the twin's cup, the size of the cup, whether the spoon is in it, whether the saucer holds tea, and whether a puddle is near. It runs beside the child's play, and a touch on that guest or its cup ends it at once with the cup back on its saucer.
- **The showing** (4 to 6 seconds, once for each new idea). Cause: the first sitting at which an idea is new and its mark is not yet stored. A guest does the new thing once, inside the fiction and without words: the Bear presses his own cup and the pot pours a splash for as long as his paw stays, and he drinks the splash; a guest fetches a saucer from the stack and sets its cup on it; the Hen runs her wing along her ring; the Ducklings hold their empty cups rim to rim; the Mouse and the Bear try the two cups for size. It is never the answer to the cup in front of the child, any touch ends it, and it does not play again (pack: game-design, guided-discovery.md).
- **The clink** (6 to 10 seconds, and then it holds). Cause: the last guest has drunk a cup to its taste. Beats: every guest lifts its cup, they lean in and clink, each cup sounding at the pitch of how full the child made it, they drink together, and each settles in its own way: the Bear dozes, the Mouse grooms her whiskers, the Hen tucks her head under her wing, the Ducklings lean on each other. Then the next party comes to the garden gate and waits there. Any touch ends the scene into the settled table.

**How a cycle ends and how the next one starts.** The settled table stays as long as the child likes, and everything on it still answers a touch. If the child does nothing, nothing new starts. The party at the gate waits without a sign of impatience. When the child touches the gate, the seated guests get down, put their saucers and spoons back on the tray as they go, and leave with their cups, and the new party walks in. Open play has no other ending, and that is its calm way of tidying up (pack: game-design, endings-and-short-scenes.md; "How a cycle restarts" in the guide).

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
