<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 4 to 6, and its youngest age, 4, governs every choice below.

- **The cue-table row.** Age 4 falls in the 3 to 4 row of the age-band cue table in `docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md`. The cues the game uses from it: a breathing glow on what can be touched now, a ghost hand that shows one move, characters who gaze and reach, tools that appear only when they mean something (the sponge comes out with the first spill), and materials that correct themselves (tea that runs over a rim, a painted line that the tea covers). Its "Avoid" column is a hard limit here: no text, numeral or pictorial icon that has to be decoded, no spoken instruction, no verdict, never several activities live at once, and no tool on the table before it means anything. One next act is offered at a time and one finger does everything.
- **The pack's rule for the range** (pack: game-design, ages-4-to-6.md). The game is pretend play: a table, props and guests who react, and the child supplies the plot. Every act is a tap, a press that is held, or a drag: a drag that goes somewhere carries a thing and survives a lifted finger, and a drag to and fro on the spot is a rub. There is no double tap and nothing to read. The jokes are tricks and slapstick on a guest who overreacts and is never hurt.
- **The symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, optional or not, and the game has no `symbols.ts`. The rings painted inside a cup are brushwork at a height, not marks to be read as a scale: there are no ticks, no count of them is ever needed, and each cup carries one.
- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order. A child of 4 or 5, a younger child, and no age at all (`null`) start at the first position, `brim`. A child of 6 or older starts at `lay-a-place`, two steps on, where the place is laid before the pour. A saved position always wins over the age, and nothing is locked or hidden by age. A sitting with one guest never moves the position back, so a child who starts at `lay-a-place` does not come to `brim` or `drop`; what those two hold (the pour, letting go early, the bowl and the sponge) is met at `lay-a-place` and at every position after it. A new idea is still shown once to a child who starts further on, because each first showing has its own stored mark.

## The toy

**Pouring.** The finger presses the teapot and holds; the pot tips and pours for as long as the finger stays, and stops when it lifts. The pot waits beside a cup with its spout over it, so the finger is never on the cup, and the tea in the cup can be seen through the whole pour.

In an empty scene there is a plain cloth, the pot, and one cup on its saucer.

- **When the finger lands**, in the same frame: the pot squashes under the finger, its lid rattles, it rises and tips, and the first drop is already falling. Nothing waits for the lift.
- **While it is held**: the stream thickens over the first half second from a dribble to a steady rope of tea, so a short press gives a drop and a long one gives a cupful. The tea is a warm amber disc on the cup's white inside, and it climbs the wall as it grows, so the amount can be read at every moment of the pour, from the first coin of tea at the bottom to the skin that bulges at the rim. The sound of the filling cup climbs in pitch as the space above the tea gets shorter, as a real cup's does, over the glug of the pot.
- **When it lifts**: the pot rights itself, one last drop hangs on the spout and falls with a plip, the lid lands with a click, and the surface rocks and settles.
- **Past the rim**: the tea runs down the outside into the saucer, fills the saucer, and then creeps onto the cloth as a puddle with a soft patter. The sponge comes out of the tray at the first spill, and rubbing it over the puddle takes the tea up along the stroke with a squeak.
- **The simplest use always works**: a tap on the pot gives one drop. A tap on a cup rings it, pitched by how full it is, and calls the pot over to it. The pot can also be carried, and it pours wherever it is held: on the cloth it makes a puddle, on a saucer a shallow pool.

**Why repeating it is a pleasure with no goal.** The child is making a liquid do things: it stretches, thickens, climbs, bulges, runs over and spreads, and each of those has its own sound that the finger plays by staying or leaving. The cup is an instrument: the same hold never sounds quite the same, and the spill is the funniest part, costs nothing and wipes away. A person watching sees within three seconds that the child is pouring tea. No part of it needs a guest, a target or an ending (pack: game-design, toy-first.md; pack: game-design, touch-answers-bigger-than-the-touch.md).

## The object-by-action grid, and what is new on day 15

Six things, five things a finger can do. A press that is held on the pot always means the same: it pours on whatever is under its spout, for as long as the finger stays. The pot comes to a thing when that thing is tapped or when the pot is carried to it, and the second column of results is what the pour does there. It never stands in the guests' row: a pot let go in that row is set down, with its slosh, on the nearest free spot in front of the places. On a table so full that it could reach a guest from nowhere else, it does not come to that guest: a tap on the guest still gets the guest's own poke and the pot stays where it stands, a pot carried to the guest is set down in front of the places like any other pot let go in that row, and the guest can be served from the spout again as soon as there is room before it. To carry a thing is a drag that goes somewhere: the thing leans after the finger and starts to follow once the finger has gone further than the thing is wide. "Put it on" is a carry that ends on another thing; a carry survives a lifted finger. A rub is a drag to and fro on the spot: the finger turns back before it has gone further than the thing is wide, and the thing stays where it stands.

| | Tap | The pot is held over it and pours | Carry it across the cloth | Put it on another thing | Rub it |
| --- | --- | --- | --- | --- | --- |
| **A cup** | It rings like a small bell, lower the fuller it is, the tea ripples, and the pot hops over to stand by it. | The tea climbs the white inside, and the filling note climbs with it. Past the rim it runs into the saucer. | It slides with a ceramic hiss and the tea sloshes against the wall; a brimful cup leaves a dotted trail. | On a saucer it seats with a clink. On another cup, the bowl or the pot it tips all its tea in with a glug and hops back to where it stood. On a guest it is a hat. | It spins on its foot and the tea turns into a whirlpool with a low hum. |
| **A saucer** | It spins like a coin and rattles down to rest. | A shallow pool spreads to its edge with a flat patter, then spills. | It skims after the finger with a glassy whirr, and stops with a wobble. | On the stack it claps onto the others. Under a cup, the cup hops on. On a guest it is a flat hat that slides off. | It squeaks clean and flashes once. |
| **A spoon** | It flips end over end with a tinkle. | The stream hits the bowl of the spoon and fans out in drops all round it, with a hiss. | It drags with a thin scrape and swings round behind the finger. | In a cup it stirs: the tea swirls and the spoon tings the wall. On a saucer it lies down with a click. On a guest it balances on the nose. | It rattles in place like a spoon on a table. |
| **The pot** | The lid hops, rattles and lets out a puff of steam with a toot, and one drop falls from the spout. | Held with nothing under its spout, it pours a puddle on the cloth, with a hollow glug from inside it. | It goes where it is put, heavy, with a slosh inside, and stays there. | On a guest: it stands with its spout held out to the guest, with a gurgle, and the guest meets it as it meets the stream; the Bear tips his head back to drink. On the bowl: it empties the bowl back into itself with a gurgle. | A fish like the one painted on its side swims once round the belly with a run of rising bubbles. |
| **The sponge** | It squelches, and squirts a drop if it holds tea. | It swells as it drinks the stream with a soft slurp, then leaks at the edges with a slow drip. | It drags with a wet shush and leaves a damp streak that fades; over a puddle it takes the tea up along the stroke. | In a cup it dabs out a thimbleful with a small suck. Squeezed over a cup (a tap while it lies on one) it gives its tea back in a trickle. On a guest it wipes the face with a squidge, and the guest squirms and giggles. | It scrubs the cloth on the spot with a squeak and takes up the puddle under it. |
| **A guest** | Each has its own poke: the Bear's belly wobbles with a hum, the Mouse squeaks and her whiskers spin, the Hen puffs and clucks, the Ducklings peep one after the other. | The guest gets the stream: the Bear gulps it, the Mouse puts up her tail as an umbrella, the Hen shakes it off in a spray, the Ducklings splash in it. | The guest gets down and toddles after the finger to another seat, cup in hand, to the sound of its own feet: the Bear thuds, the Mouse ticks, the Hen scratches, the Ducklings slap. | On the seat of the guest next to it the two swap places, each in its own walk, and each gives its own grunt or squeak as they squeeze past. | It is a tickle: each guest has its own giggle and squirm. |

Every wrong use works: a cup worn as a hat, tea in the saucer, a puddle poured on purpose, a guest served straight from the spout wherever the pot has room to stand before that guest. None gets a buzzer or a touch that nothing answers, and all of it wipes up or pours back at no cost (pack: game-design, liveliness-from-causing-and-comedy.md).

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
- **Attention.** At the moment the finger lifts, the child must be looking at the tea in the cup and judging it against the painted ring, against the other cup, or against the rim: enough, too little or too much. The pot waits beside the cup with its spout over it, and the finger is on the pot and never on the cup, so nothing is aimed and nothing hides the tea. The stream is steady and never speeds up, a house cup takes about four seconds to fill, and a pour may be made in as many presses as the child likes, so what is judged is the amount and not the instant. The guests give no sign while the tea is running.
- **Fun.** Yes: the pour is the toy and the best moment of play, and the judgement is made inside it. Play never stops for a question.
- **Guess.** No. An amount is not one of several options, so there is nothing to try in turn, and tapping at random makes drops and puddles but does not bring the tea to a ring. Creeping up to the ring in small pours is the skill done carefully. Where two cups of different sizes are handed out, a child can try both ways round, and the wrong way round shows why it is wrong, so the second try is not blind.

## The error as a consequence

Nothing rates a pour. The guest picks up the cup and what happens next is what that amount of tea does.

- **Too little.** The guest tips the cup right back, one drop lands on its tongue, and it peers into the cup and sets it down again. It does not drink. The white wall between the tea and the ring shows where and why. The tea stays as it is, and the child holds the pot again to add to it.
- **Too much.** The guest tries and it goes wrong in its own way, by the tea's own logic: the Mouse's cup is too heavy and slops on her whiskers, and the Hen's beak goes in too deep and blows bubbles. The guest sets the cup down and looks at it. The ring is under the tea. The tea stays as it is. The bowl slides out from the tray the first time this happens, and the child tips the cup into it, dabs some out with the sponge, or pours it into another guest's cup, and tries again.
- **More than the cup holds.** The tea runs over the rim into the saucer and from the saucer onto the cloth, where the puddle is exactly as large as what ran over. The sponge comes out from the tray, and a rub takes the puddle up. No guest is cross about it; what each one does near a puddle is its own taste.
- **Two cups that are not the same.** The Duckling with less looks from its cup to its twin's and back, and both hold their cups out again. Both cups stay as they are. The child adds to the lower one or tips some out of the fuller.
- **A cup too small or too big for its guest.** The Bear drains the thimble in one lick, peers into it and holds it out again, as often as it is filled. The Mouse cannot lift the big cup once it is full, and climbs up to look over its rim. Nothing is lost: the cups can be changed round at any moment.
- **A place that is not laid.** A guest with no saucer holds its cup in the air and looks at the stack. A cup on the bare cloth still takes tea, and a spill there goes straight onto the cloth.

There is no buzzer, cross, sad face turned to the child, reset or lost piece, and a pour that is right is also only a consequence: the guest drinks (pack: game-design, errors-show-as-consequences.md). A failed try is small, local and fixed in a moment (pack: game-design, guided-discovery.md).

## The designed order, and what is stored

A cycle is one **sitting**: a party of guests comes to the table, each place is laid, each cup is poured, and the sitting ends when every guest has drunk a cup to its taste.

**The order.** One new thing at a time, then what is known in combination. The ids are the ones in `LADDER` in `config.ts`. They name places in this game's own order and nothing else.

| Position id | The party | What is new |
| --- | --- | --- |
| `brim` | The Bear alone, at a place he has laid himself. | The pour: press the pot, hold, let go. Full, and not yet full. |
| `drop` | The Mouse alone. She lays her own place. | Letting go early. Too much, and the bowl and the sponge. |
| `lay-a-place` | The Bear or the Mouse, with a cup and nothing else. | A saucer and a spoon from the tray for the guest. |
| `two-guests` | The Bear and the Mouse. | Nothing new: two places and two rings at once. |
| `halfway` | The Hen with the Bear or the Mouse. | A ring in the middle of the cup. |
| `three-guests` | The Bear, the Hen and the Mouse. | Nothing new: three places, three rings. |
| `twins` | The two Ducklings, whose cups have no ring. | As much in one cup as in the other. |
| `whose-cup` | The Bear and the Mouse with no cups; a house cup and a thimble on the tray. | Cups that hold different amounts. Full is the line. |
| `three-cups` | The Bear, the Hen and the Mouse with no cups, seated smallest to largest; three sizes of cup on the tray. | Nothing new: three cups to hand out, which end in a row by size. |
| `full-table` | Four guests: the two Ducklings together and two of the Bear, the Hen and the Mouse, some with their own ringed cups and some without. | Nothing new: everything together. |

A party never has more than four guests, and the table has four seats. The amounts are the game's own choice, since none of the records named below names a unit or a measure for an amount: a house cup holds one cupful, the Hen's ring and the middle cup are half of that, and the Mouse's ring and the thimble are about a seventh. A pour is to taste when the tea is within about a finger's width of the ring.

**A harder option the child can see and pick.** Every cup is always free to use, and so are the bowl and the sponge once they have come out of the tray, so a child can at any sitting pour from cup to cup, share one cup between two guests or fill the thimble from the Mouse's cup. It looks harder because it is: more tea is moving between more cups. Nothing asks for it.

**How the position moves.** Each guest is noted once in a sitting, as to taste or not. A guest is noted as not to taste the first time it finds, after a pour, more tea than it likes, or tea in a cup that is the wrong size for it. Finding too little in a cup of the right size is not noted, so a pour made in several presses is never a miss. For a Duckling, more than it likes is more than its twin's cup holds, once the twin's cup holds tea, and only in the cup that was poured into last: the other cup is never the miss, whichever of the two the child began with. A guest that drinks without having been noted is noted as to taste. When the sitting ends:

- it went **well** if every guest was noted as to taste: the position moves one step on;
- it went **badly** if there were two or more guests and none was noted as to taste: one step back;
- anything else is **mixed**, and the position stays.

The position never moves during a sitting, and a visit put away before the sitting ends leaves it where it was. At `full-table` a sitting that goes well stays there, with a new party each time. Nothing on screen shows the position, and no clock is read.

**Which party a new position lays out.** The next party does not wait on screen while the child works. It comes to the garden gate when the sitting ends, after the position has moved, so it is laid out from the new position and there is no party in between. It is stored from that moment and waits there for the child's touch.

**What is stored.** Plain JSON through `ctx.storage`, versioned, read field by field by a defensive `deserialize`. Every field:

- `v`: the number of this shape. A higher one than the game knows is treated as unreadable.
- `position`: one id from the order above. An unknown id falls back to the first-visit default.
- `seed`: the state of the seeded stream that picks the ordinary detail of a party (which of two guests comes, who sits where). It is never shown and counts nothing.
- `shown`: the ideas a guest has already shown once, as a list of ids (`pour`, `lay`, `halfway`, `twins`, `sizes`), so no showing plays twice.
- `finished`: whether the sitting on screen has ended. Its settled table stays as it is, and the next sitting begins on the child's touch.
- `guests`: for each guest at the table, who it is, its seat, its note for this sitting (none yet, to taste, not to taste) and whether it has drunk a cup to its taste.
- `things`: every movable thing with where it lies: its kind (pot, cup, saucer, spoon, sponge, bowl), its size and the height of its ring if it is a cup, whose it is, where it stands on the cloth, which thing it stands on or in, or which guest wears, balances or holds it, and how much tea is in it. A thing in the hand is stored where it was picked up.
- `tools`: whether the sponge and the bowl have come out of the tray.
- `puddles`: the tea on the cloth as a coarse grid of 24 by 12 cells, each holding an amount.
- `waiting`: the next party at the gate, as a list of who comes and with which cup, or nothing while a sitting is open.

A pour in progress is not stored as such: the tea already in the cup is. A scene's outcome is stored when the scene starts, so what a guest finds is noted before its sip plays, and on load no scene plays again. The largest legal state, with four guests, every thing on the cloth and a full grid of puddles, stays under half of the 64 KB cap, and a test holds that (pack: game-design, ordered-challenges-high-success.md; pack: game-design, many-short-visits.md; "The hidden position" and "Found as left" in the guide).

## The characters and their fixed tastes

Every guest has one visible want: it sits with its paws or wings on the table and its eyes on its own cup, and looks from the cup to the pot. No guest gives a sign while tea is running; each one watches the stream in the same way whatever the height. What a guest thinks shows after the finger has lifted and the pot has righted itself, starts within a few hundred milliseconds of the lift, and is about the cup, never about the child.

- **The Bear.** Big, slow and heavy; his belly and his arms are the funny parts. He wants his cup **full to the brim**. He likes tea in the saucer too, and licks it up. A spill does not trouble him. He dislikes a cup with room in it and a cup that is too small.
- **The Mouse.** Tiny, quick and neat; her whiskers and her tail are the funny parts. She wants **only a drop**. She dislikes a cup that is too full and anything wet on the cloth by her place: she lifts her tail clear of a puddle and will not sip until it is wiped.
- **The Hen.** Middle-sized, busy and fussy; her neck and her comb are the funny parts. She wants her cup **half full**, and she stirs it with her spoon before she drinks. She dislikes tea over her ring, and a place with no spoon: she looks round at the spoons for it.
- **The Ducklings.** Two, alike, the second copying the first half a beat late; their tails and big feet are the funny parts. They want **the same as each other**, at any height. They dislike one having more than the other. They like puddles and paddle in them.

These never change, in any position or with any cup, so a child can learn them and test them on purpose: what does the Bear do with the thimble, what does the Mouse do when the Ducklings' puddle reaches her. Nobody thanks or praises the child, nobody is disappointed in the child, and a guest who waits never hurries anyone or remarks on being left (pack: game-design, characters-with-opinions.md).

## The scenes

A scene is a list of timed beats over a handful of poses joined by springs, built on the template's `scene.ts` and filled in from the state of play. No scene plays before the child's action except a showing, which a guest plays once before the child first tries a new idea; none blocks the next touch, and none plays again on load.

- **The sip** (2 to 6 seconds). Cause: the finger has lifted from the pot after it poured into a guest's cup, and the pot has righted itself where it stands. Beats: the guest reaches, lifts, looks in, then does what that amount of tea brings (drinks; or tips it back for one drop; or its own mishap with too much), and sets the cup down. Filled in from: who the guest is, how the tea stands against the ring or the twin's cup, the size of the cup, whether the spoon is in it, whether the saucer holds tea, and whether a puddle is near. It runs beside the child's play, and a touch on that guest, on its cup or on the pot while the pot stands by that cup ends it at once with the cup back on its saucer, so a press that adds to the cup always finds the cup under the spout.
- **The showing** (2 to 5 seconds, once for each new idea). Cause: the first sitting at which an idea is new and its mark is not yet stored. A guest does the new thing once, inside the fiction and without words: the Bear holds his paw out to the pot and it pours a splash into his cup for as long as he holds it out, and he drinks the splash; a guest fetches a saucer from the stack and sets its cup on it; the Hen bends over her cup, and the cup swells and rings twice at the pitch of her ring; the Ducklings hold their empty cups rim to rim; the Mouse and the Bear look the two cups over, and each cup hops and rings at its own size. It is never the answer to the cup in front of the child, any touch ends it, and it does not play again (pack: game-design, guided-discovery.md).
- **The clink** (5 to 7 seconds, and then it holds). Cause: the last guest has drunk a cup to its taste. Beats: every guest lifts its cup, they lean in and clink, each cup sounding at the pitch of how full the child made it (or, after the game has been put away and opened again, of how full its guest likes it; the two Ducklings' cups, which carry no ring, then sound the same note as each other), they drink together, and each settles in its own way: the Bear dozes, the Mouse grooms her whiskers, the Hen tucks her head under her wing, the Ducklings lean on each other. Then the next party comes to the garden gate and waits there. Any touch ends the scene into the settled table.

**How a cycle ends and how the next one starts.** The settled table stays as long as the child likes, and everything on it still answers a touch. If the child does nothing, nothing new starts. The party at the gate waits without a sign of impatience. When the child touches the gate, the seated guests get down and leave with their cups, their saucers and spoons go back to the tray, and the new party walks in. Open play has no other ending, and that is its calm way of tidying up (pack: game-design, endings-and-short-scenes.md; "How a cycle restarts" in the guide).

## The records

Read from the education pack with `npm run -s education:find` on 2026-10-03, once for each jurisdiction. The two lists are separate, and no record of one stands for a record of the other.

### us-ca

Levels, as the lookup prints them for mathematics and for practical life and feelings: at age 4, `preschool-tk`, in both of its printed age ranges (Early, 3 to 4 ½ years, and Later, 4 to 5 ½ years); at age 5, `preschool-tk` in its Later range and `kindergarten`; at age 6, `kindergarten` and `grade-1`. Age mapping: official. At ages 5 and 6 the lookup also returns the subject's `cross-grade` lane, labelled cross-grade: its statements hold for every grade, not for this age in particular. Gap: none printed at these ages.

The game is designed from `preschool-tk` and `kindergarten`, and names one record of the `cross-grade` lane for practical life and feelings, which keeps that label. It names no `grade-1` record: the measurement records of that grade are about length, time and data, and none is about how much a container holds.

- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-3-0-measurement-and-data-3-1` (`us-ca 3.1`, Mathematics, Strand 3.0, of the preschool and transitional kindergarten foundations): department-published-foundation, confirmed. In the pack's Summary: at the earlier age a child shows awareness that things can be compared in how much they hold, among other attributes, and at the later age compares two objects on one of these attributes and communicates what the comparison shows.
  Limits taken: capacity is one of the three attributes named, and the game uses that one. Earlier age: awareness, with no procedure asked, so the game only puts cups of different sizes in the child's hands. Later age: two objects, as at `whose-cup`, where two cups differ in how much they hold. No units, numbers or measuring tools. Not taken: the child's telling of what was noticed or of what a comparison shows, which the Summary gives at both ages; the game has no words and takes the noticing and the comparing only. Beyond this record, as the game's own choice: at `twins` the two cups are the same size and what is compared is how much tea is in each, which is not one of the three attributes. Left open by Limits: how the two are compared. Side by side and by tipping one cup into the other are the game's own choice.
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-3-0-measurement-and-data-3-2` (`us-ca 3.2`, same strand): department-published-foundation, confirmed. In the pack's Summary: a child puts objects in order by length or by another attribute, and capacity is one of the others named as examples.
  Limits taken: a few objects at the earlier age, three in the example, and slightly more at the later age. Capacity is an example attribute. No units or numbers. The game uses three cups, at `three-cups`. Left open by Limits: which way the order runs. Smallest at the left is the game's own choice.
- `edu.us-ca.kindergarten.mathematics.objective.k-md-2` (`us-ca K.MD.2`): state-board-adopted-standard, confirmed. In the pack's Summary: the child puts two objects against each other to compare them on a measurable feature they share and finds which one has more of it and which has less.
  Limits taken: exactly two objects, compared directly on one shared feature, with no units, rulers or numbers. Three or more in order is not in the statement. In the statement's example the difference is put in words, not as an amount. Not taken: the child's saying of the difference in words; the game has no words and takes the comparing and the finding of which has more and which has less only. Not in Limits: which feature. How much tea is in a cup (`twins`) and how much a cup holds (`whose-cup`) are the game's own choice.
- `edu.us-ca.kindergarten.mathematics.objective.k-cc-6` (`us-ca K.CC.6`): state-board-adopted-standard, confirmed. In the pack's Summary: looking at two groups of things, the child tells whether the first holds more, fewer, or just as many as the second, and pairing things off one against one is named as an example way to find out.
  Limits taken: the comparison is between groups of objects, and matching is an example way. Groups of as many as ten are included; the game's groups are at most four, which is its own choice. The game uses this for one thing only: a saucer and a spoon for each guest.
- `edu.us-ca.cross-grade.practical-life-feelings.objective.early-elementary-2-h-1` (`us-ca 2.H.1`, Early Elementary) [cross-grade]: voluntary-guidance, confirmed. In the pack's Summary: in the Early Elementary band, a child, with guidance, keeps order in the places they use and among their own things.
  Limits taken: it is voluntary guidance, not an adopted standard; its band is tied to no grade; the child does this with guidance, which in the game is the guest who lays its own place once before the child lays one. What the child does is lay each place and wipe up what was spilled; when a party leaves, its saucers and spoons go back to the tray without the child's doing, and nothing is claimed for it. Left open by Limits: which places and things, and how tidy. The tea table, with a saucer, a cup and a spoon at each place, is the game's own choice.

Pouring up to a painted ring, which is what the child does at the first six positions, has no California record named here: these records are about comparing and ordering, and none is about filling a container to a level. Keeping things in their place has no record in the `preschool-tk` lane: `us-ca 2.H.1` is returned only from age 5, beside kindergarten.

### nl

Levels, as the lookup prints them for both subjects: at age 4, `peuters` (up to the fourth birthday, returned for a child who has only just turned four) and `fase-1`, sub-band groep 1; at age 5, `fase-1`, groep 1 or groep 2; at age 6, `fase-1`, groep 2 or groep 3. Age mapping: convention. From age 4 the lookup also returns the subject's `einde-po` lane, labelled end-of-primary goals; the game names no record from it. Gap: none printed at these ages.

The game is designed from `fase-1`, and from `peuters` for a child who has only just turned four.

- `edu.nl.fase-1.mathematics.objective.9de7e388-f85c-4ef6-9fbd-d5911b20db6a` (`nl rw/m/3/02/fase1`): curriculum-institute-guidance, confirmed. In the game's words: working with the ideas around how much a thing holds or has in it, such as full, fuller and equally full, too much, too little and enough.
  Limits taken: it says what a school can offer in groep 1 to 3, not what a child must be able to do. The ideas listed are examples, and no unit is among them. The Dutch term can mean capacity, volume or contents and the statement does not choose; the game uses contents at the ringed cups and capacity at the plain ones.
- `edu.nl.fase-1.mathematics.objective.2851b1d6-b3b5-4cbe-bc68-e95640898948` (`nl rw/m/3/04/fase1`): curriculum-institute-guidance, confirmed. In the game's words: comparing and ordering by how much things hold or have in them, in ways such as by eye, side by side and pouring from one into the other.
  Limits taken: what a school can offer, as above. The ways listed are examples. No units and no number of containers. Two cups at `twins` and `whose-cup` and three at `three-cups` are the game's own choice.
- `edu.nl.fase-1.practical-life-feelings.objective.f6f10753-a49c-408e-81b7-03206cb9edc0` (`nl ojw/ds/1/01/fase1`): curriculum-institute-guidance, confirmed. In the game's words: taking care of one's own surroundings at home, in class and at school.
  Limits taken: what a school can offer, as above. It names no tasks and no level of independence. Laying a place and wiping up a spill are the game's own choice of task; the saucers and spoons go back to the tray when a party leaves, and that is not a task of the child.
- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-meten-meetkunde-meten-inhoud-2` (`nl Inhoud / 2`, the pack's code for a bullet of the peuter mathematics card): curriculum-institute-guidance, confirmed. In the game's words: getting to know how much things hold by filling, pouring from one into another and emptying.
  Limits taken: it says what is offered to children before they start school, not what a child must be able to do. Three acts are named; no measures and no counting of scoops.
- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-getallen-getalbegrip-hoeveelheden-3` (`nl Hoeveelheden / 3`, the pack's code for a bullet of the same card): curriculum-institute-guidance, confirmed. In the game's words: making one-to-one pairs by putting objects with each other; a saucer by each cup is the statement's own example.
  Limits taken: what is offered before school, as above. No counting, no number words and no number of objects.

Pairing a saucer and a spoon with each guest has no fase 1 record named here: `nl Hoeveelheden / 3` is a bullet of the peuter card, which the lookup returns only for a child who has only just turned four. The same holds for filling and emptying as acts of their own (`nl Inhoud / 2`); among the fase 1 records named here, pouring over, filling and pouring out appear only as example ways of comparing (`nl rw/m/3/04/fase1`). No Dutch record named here is about pouring as a skill of the hand or about stopping at a mark.

### Where the two differ

- **Judging enough.** The Dutch records name the ideas of full, too much, too little and enough (`nl rw/m/3/02/fase1`) and filling, pouring over and emptying as ways of getting to know how much things hold (`nl Inhoud / 2`). The California mathematics records named here are about comparing and ordering only. So the judging of a pour against a ring, at the first six positions, is designed from the Dutch records alone, and the game follows them there. The California records come in at `twins`, `whose-cup` and `three-cups`, and at the laying of places from `lay-a-place` on. Pouring as a skill of the hand has no record in either list, and nothing is claimed for it.
- **How many objects.** `us-ca K.MD.2` is about exactly two objects and `us-ca 3.2` about a few. The Dutch records set no number. The game follows the California limits: two cups at `twins` and `whose-cup`, three at `three-cups`.
- **Ages.** The California records sit in three lanes: the foundations, returned at ages 4 and 5; kindergarten, returned at ages 5 and 6; and the cross-grade lane, returned from age 5 and tied to no age. In grade 1, also returned at age 6, the game names none. The Dutch fase 1 records cover the whole band in one level, by convention, and the two peuter bullets are returned at age 4 only. The game follows neither age mapping in play: no position is tied to an age, a level or a groep, and the first-visit default is the game's own choice.
- **Keeping things in their place.** `us-ca 2.H.1` says with guidance and is voluntary guidance returned only from age 5. The Dutch record names no task and no level of independence. The game follows the California limit, with guidance, for every child: a guest shows the laying of a place once before the child lays one.
- **Standing.** The California records are two foundations, two adopted standards and one statement of voluntary guidance. The Dutch records are all guidance of the curriculum institute, and none is law. The game follows each list's own standing in the claim and carries no standing from one list to the other.

### The claim

Tea Time is designed from two of California's preschool and transitional kindergarten learning foundations for mathematics (`us-ca 3.1`, in part, and `us-ca 3.2`, department-published foundations), two kindergarten mathematics standards adopted by the State Board of Education (`us-ca K.MD.2` and `us-ca K.CC.6`, both in part) and one statement of California's voluntary guidance on social and emotional learning (`us-ca 2.H.1`, from the cross-grade lane, in a band tied to no grade); and from five statements of the Dutch curriculum institute's guidance, which is not law: three fase 1 goals (`nl rw/m/3/02/fase1`, `nl rw/m/3/04/fase1`, `nl ojw/ds/1/01/fase1`) and two bullets of the peuter mathematics card (`nl Inhoud / 2`, `nl Hoeveelheden / 3`). All ten records are confirmed. From the California records it takes comparing two cups by how much they hold or have in them, putting three cups in order by how much they hold, pairing a saucer and a spoon with each guest (which `us-ca K.CC.6` names as an example way of comparing two groups), and keeping one's place at the table in order with guidance. Of `us-ca 3.1` and `us-ca K.MD.2` it takes the comparing and not the telling of what a comparison shows, since the game has no words, and of `us-ca K.CC.6` it takes the pairing only. The guidance that `us-ca 2.H.1` names is given in the game by a guest, a character, who lays its own place once before the child lays one. From the Dutch records it takes the ideas of full, too much, too little and enough, comparing and ordering cups by how much they hold, looking after one's own surroundings, and, from the two peuter bullets, which are returned only for a child who has only just turned four, getting to know amounts by filling and pouring from one cup into another and pairing one thing with one. The judging of a pour against a painted ring is designed from the Dutch records only, and no California record is named for it. Pouring as a skill of the hand rests on no record in either list, and nothing is claimed for it. The game says nothing about what a child has reached.

## The look

Not part of the sheet. Written after the spike of the first reserved row, **blue-and-white glazed pottery**, and kept in line with the game as it is built.

**What it is.** A tea table of fired, tin-glazed pottery seen from the child's side: an opaque white glaze with one small hard highlight, cobalt brushwork painted by hand under it, fine crazing, and a wall of picture tiles behind. Everything is blue and white. One warm colour, a honey gilt, is kept for what a finger can take hold of: the lip of a cup, the cane handle and knob of the pot, the tip of a spoon, the rim of a saucer, a nose, a beak, a comb. The tea is the other warm thing on the table, and it is what the child reads. The guests are glazed figurines come to life.

**Palette.**

| Use | Colour |
| --- | --- |
| Glaze, the white of every piece | `#f4f6fa`, shaded to `#8d9dbb` |
| Cobalt, the brushwork and the rings | `#1d3f9e`, with a wash of `#6f8fd6` |
| Gilt, what can be touched | `#e3a23f` |
| Tea | `#c06f24`, lit to `#d98a34`, `#8c4a12` where it meets the wall of a cup |
| The cloth | `#4a6eb0`, plain |
| The sponge | `#e6b545`, matte |

**Materials.** One material draws all the pottery: a matcap of a glazed ball painted at load, the brushwork atlas as its map, and vertex colours for a ring, a gilt lip or a warm knob. The material keeps the matcap's hot spot white over whatever is painted under it, which is what makes cobalt read as under the glaze and not as blue plastic. The sponge has a second, matte matcap. Tea, puddles, the cloth and the wall are unlit. Nothing is fetched: the matcaps, the atlas (1024 square) and the sheet of tiles are drawn on canvases from a seeded stream, so every load paints the same strokes (`glaze.ts`, `atlas.ts`).

**Forms.** Every glazed piece is a profile turned on a lathe (`forms.ts` holds the numbers, `pieces.ts` and `props.ts` turn them). The pot has a tapered spout and a cane handle over the top. A guest is a painted body, a head that turns on it, bead eyes that blink and one part of its own (`figurines.ts`). The Mouse has six fine cobalt whiskers at the tip of her snout, and each Duckling two big gilt feet. A small guest sits on a pottery stool so its face clears the table. The slop bowl is of the same service: a gilt rim and one painted line outside and in.

**The working objects stay plain.** The inside of a cup is white and carries at most one cobalt ring; the tea is one flat amber disc; the cloth has no pattern. Brushwork is on the outside of the pot, the rim of a saucer, the guests and the wall, never where an amount is read.

**Lighting.** There are no lights and no shadow maps. The matcap is lit from the upper left; the wall is shaded a little toward the table so the guests stand clear of it; the cloth is a little lighter in the middle. Each piece has a soft blob shadow on the cloth, all in one instanced draw. There is no post pass.

**The camera.** Fixed, above and in front, 27 degrees of view, pitched about 46 degrees down, far enough that the whole table fits the width of the surface (or its depth, on a tall one). It is steep enough that the tea in a wide cup can be seen from the first drop, and a cup's wall hides none of the disc from half a cup up.

**Motion rules.**

- Pottery is hard. A piece that is touched squashes a little and rings back on a stiff spring; it never bends.
- Each piece has motions of its own, one for each thing a finger can do to it: a saucer spins down like a coin and turns as it slides off a head, a spoon flips end over end and swings round behind the finger that carries it, a cup hops, whirls its tea and tips out, the sponge squashes, squirts, swells with the tea it holds and leaves a damp streak that dries, a painted fish swims once round the pot, a rubbed saucer swells and a glint runs out to its rim, once in a rub. A spoon rests where a spoon can: leaning in a cup with its bowl on the floor and its handle over the rim, on the rim of a saucer beside the cup that stands on it, in the dish of an empty saucer, on the top saucer of the stack. What has come to rest on a thing goes with that thing, carried, hopping or lifted to a mouth, and a spoon in a cup tips with the cup. A thing leans after the finger, and comes up off the cloth a little, before it follows it. A piece eases to where the rules put it and is never suddenly there.
- The pot is heavy: it rises as it tips, its lid chatters while the tea runs and drops home with a click, and it lands with a knock. At a tap its lid hops and lets out a puff of steam. In the hand, and at the top of a hop, it rides above every cup. When a party sits down it waits beside the first guest's cup, on its saucer or in its paw; it goes with that cup when the place is laid, hops aside for a place or a spoon laid where it stands, and never stands where a guest lifts its cup to drink, nor in the guests' row: it is always in front of everybody, where a finger finds it. Let go in that row, or carried to a guest it has no room before, it is set down with its slosh on the nearest free spot in front of the places. Where there is no room at a pour's reach it stands nearer than it likes, its spout right over the cup. When a party leaves it stands where it stood until the table is clear, and only then hops to the new party's first cup.
- Tea is the soft thing. The stream falls from the spout and is not suddenly there, it wavers, a drop is longer than it is wide, and a landing rings the surface. The tea leans in a carried cup, a brimful cup drips a dotted trail, tea that is over the rim of a cup runs down its outside in drops, the Hen's spoon goes round in her tea, a stream sprays off a guest in drops, and a slopped cup throws drops on the cloth.
- Every guest moves like itself (`motion.ts`, with a test that fails on a shared or near-copied action). The Bear is slow and heavy: his belly rings like a bell and his arms flap. The Mouse is quick and sharp, and her tail does what her whiskers would. The Hen moves her head in jerks, held and snapped, and her comb flops. The Ducklings waddle and wag, and the second does everything half a beat after the first. Each has its own poke, its own tickle, its own step, its own way with too little and with too much, its own answer to the stream, held for as long as the stream is on it, and its own way of settling when the sitting is over; the Ducklings settle leaning toward each other, whichever seats they have. Now and then, at a table where nothing is happening and no finger is down, one guest in turn does a small thing that is only funny: the Bear's belly rumbles and he looks down at it, the Mouse hiccups off her seat, the Hen nods off and starts awake, a Duckling yawns itself over and its twin after it.
- A guest that lifts its cup brings the cup to its mouth. What it wears goes with its head: up with a hop, over with a nod, round with a turn. On foot it carries its cup high over its head, out of everyone's way, and so does a guest that waits at the gate with a cup in its paw.
- A party that comes in or goes out keeps one pace, each guest in its own step, so nobody passes through anybody. The old party goes off to the right; the new one comes in from the gate at the left in single file, the guest for the farthest seat first. Each of the old party takes its cup, up off the saucer first and then over its head; what it leaves on the table goes back to the tray one thing after another, the spoons first and then the saucers in the order they stack in. Two guests that change seats step out of the row to opposite sides, walk past each other and step back in; the Bear is so wide that he and a neighbour squeeze past.
- Nothing is set down in the guests' row, and the pot stands in front of the places wherever there is room.
- Nothing moves when the game is unattended or hidden.

**The tray.** The stack of saucers, the row of spoons and the plain cups lie along the near edge. At the first two positions, where the guest lays its own place, the spare saucers and spoons are not on the table: they come with the first party that arrives with cups in its paws. A guest that lays its own place brings its saucer and its spoon in with it from the gate. The sponge and the bowl come out when there is a first spill and a first cup with too much.

**The wall.** Picture tiles, each with one small painting and plain corners. A touched tile comes loose for a moment, a finger's width off the wall, and does what its picture would: the flower turns once round, the fish wriggles, the bird hops twice, the boat rocks, the tulip nods, each with a small glazed ring at a pitch of its own. The corner the grown-ups' overlay is opened from, and the tiles round it, answer nothing. Nothing painted anywhere is a single stroke that could be read as a letter, a numeral or a sign: the Bear's belly has a five-petalled flower, the boat's sail is a filled patch.

**The gate.** Two posts and an arch with a gilt bell, against the wall at the far left. The whole of it takes a touch, posts, arch and bell, and the bell rings; with a party waiting, that touch lets it in. The party that waits stands before it in two rows, drawn smaller, and grows as it walks in.

**Guidance.** A warm ring breathes on the cloth round the one thing to touch now, and a pale ghost hand shows one move with it: a tap, a hold, a carry from here to there, or a rub. Both are drawn over everything and are no part of the table.

**Tiers** (`config.ts`). A tier sets the pixel ratio: 2, 1.5, 1.25, 1. The lathe turns each form in 40, 32, 24 or 20 slices by the tier the game starts on. Every tier keeps the glaze, the brushwork, the shadows and the tea, so the lowest still looks like the game.

**What a still on this machine can and cannot say.** The stills behind this section were drawn in software, with the clock paused before load and stepped. They show layout, silhouettes, colour and that the tea reads. They say nothing about frame rate. The fullest table the game can lay, with a party of four at the gate, counts 78 draw calls, one of them the tile of the wall that a touch has loosened (`budget.ts`, held by `frameBudget.test.ts`).

## The registry row

For section 3 of `docs/art-direction.md`, when the lead registers the look:

| Game | Style | Art guide |
| --- | --- | --- |
| Tea Time | Blue-and-white glazed pottery 3D: white tin glaze with one hard highlight, hand-painted cobalt brushwork and crazing, a wall of picture tiles, glazed figurine guests on a plain blue cloth, honey gilt only on what can be touched | `games/tea-time/ART.md` |
