<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 2 to 4, and its youngest age, 2, governs every choice below.

- **The cue table.** The table in wordless clarity has no row below 3, so its 3 to 4 row is the ceiling and the game cuts further. From its "Avoid" column, as hard constraints: no text, numeral or pictorial icon that has to be decoded; no spoken instruction; no verdict; never several activities live at once; nothing on screen before it means something. One next act is offered at a time.
- **The pack's rule for the age** (pack: game-design, ages-2-to-4.md). Everything works with a tap, and the game has no drag, pinch, tilt, shake or double tap. A thing that is tapped twice is tapped two separate times, with any wait between them. Every target is about 100 logical pixels across or more, the targets stand well apart, and none is in the bottom strip. One loved action is offered again and again: uncovering someone who hides. A whole cycle fits in one to three minutes, and never more than five things wait hidden for the child's finger at once: at most four hides from the clutch, and the one egg that may wait in the basket. The single egg of a showing is not one of them: the one who shows sets it down and opens it within the 4 to 9 seconds of the showing, once for each way of asking. Every touch is answered and there is no dead end: tapping at random opens every hide in the end.
- **Symbols.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, and the game has no `symbols.ts`. The creatures have ids in the code and no name on screen. Their voices are invented and synthesized: no speech, no word, and nothing spoken that instructs.
- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order: the first place, `two-eggs`, for a child of 3 or younger and for no age (`null`); the second place, `three-eggs`, for a child of 4 or older. A saved place always wins over the age, every place can be reached by play at any age, and nothing is hidden or locked by age.

## The toy

**The action the finger performs most: a tap on a hide.** Someone is inside an egg, and the tap brings them out.

In an otherwise empty scene there is a row of plain eggs on a plain ground.

- **The first tap on an egg.** When the finger lands the egg squashes and the one inside calls in its own voice, heard softer through the shell. The egg moves in the shape of that call while it sounds: it leaves the ground higher for a higher voice, it moves for as long as the call lasts, it shivers for a warble, it hops twice for two notes. A crack opens and two eyes blink out of the dark. The eggs beside it lean towards it.
- **The second tap on the same egg.** It bursts. The one inside springs out with an entrance of its own, calls again in the open, louder and at the same pitch, and the shell flutters down as scraps of tissue. It then stands on the hill behind.
- **A tap on anyone who is out.** They call again and do their own trick, never twice the same way in a row.

Why it is a pleasure with no goal: it is peekaboo with a voice. Every egg is a small question (who is in there?) that the child answers with their own finger, the answer is a different body and a different sound each time, and the two taps make a wait and then a burst. Tapping at random always lets someone out, and nothing a tap does is a punishment. Someone watching can tell within three seconds what the child is doing: letting the hidden ones out. The eggs answer on touch-down, in the same frame, and the answer is a chain: squash, call, crack, eyes, the neighbours leaning in (pack: game-design, toy-first.md; pack: game-design, touch-answers-bigger-than-the-touch.md).

The toy is judged first and alone, with no caller and nobody to find. The listening game is built on it only if tapping the eggs is a pleasure by itself.

## The object-by-action grid, and what is new on day 15

The objects are the six kinds of creature. Each kind has one voice, which never changes, and the six voices come in three families of two near voices:

| Kind (id in the code) | Body | Voice in the open |
| --- | --- | --- |
| `pip` | tiny and round | one high, short note |
| `tok` | tiny and pointed | the same high, short note, twice |
| `hoom` | big and wide | one low, long, steady note |
| `brrl` | big, with a long neck | the same low, long note, warbling |
| `wheep` | middle-sized and springy | a glide up through the middle |
| `dooo` | middle-sized and droopy | the same glide, down |

Two kinds of one family differ in one thing only (one note or two, steady or warbling, up or down). Two kinds of different families differ in how high and in how long at once. The numbers are in `voices.ts`, and its test holds each voice in its range. The grid itself is in `grid.ts`.

The actions are the five things a child can do to any kind. Every cell looks and sounds different, because every kind has its own voice, its own entrance and its own trick, and every pair of kinds meets in its own way ("The characters and their fixed tastes").

| | First tap on its egg | Second tap, its own kind is asking | Second tap, another kind is asking (the wrong use) | Tap it when it is out | Tap it while another one calls (the wrong use) |
| --- | --- | --- | --- | --- | --- |
| `pip` | the egg pops straight up once, high, and the call is one soft peep | shoots out like a cork, lands on the asker's head, and the two peep in step | shoots out and peeps at the asker, and each reacts to the other by its taste | spins on the spot and peeps | peeps on every beat of the other's call that is still to come, and once at least |
| `tok` | the egg pops up twice, high, and the call is the soft peep twice | comes up in two pecks, and the two jab their beaks at each other on the double note | comes up in two pecks and double-peeps at the asker, each reacting by its taste | pecks the ground twice, with a peep on each peck | double-peeps between the beats of the other's call, on into the quiet after it where the call is short, and pecks its foot in time |
| `hoom` | the egg leans over slowly, low, for a long while, and the call is one soft, long hum | rolls up slowly, over on one side and back, and the two hum belly to belly | rolls out and hums at the asker, each reacting by its taste | swells up and hums, belly wobbling | hums underneath, a floor under the other voice |
| `brrl` | the egg leans low and shivers all the way, and the call is the soft, long hum, warbling | comes up long and thin first, shivering, and the two warble with their necks swaying side by side | comes up long and thin and warbles at the asker, each reacting by its taste | warbles while a shiver runs up it from its body to its head | warbles around the other voice while its head goes round in a loop |
| `wheep` | the egg tips up from one end to the other, and the call is a soft glide up | springs out upwards, and the two bounce higher on every glide | springs out and glides up at the asker, each reacting by its taste | crouches and springs up with the glide | answers the other's call with its glide up, like a question |
| `dooo` | the egg tips down from one end to the other, and the call is a soft glide down | slides out and flops, and the two glide down in step, sliding side by side | slides out and glides down at the asker, each reacting by its taste | droops to the ground with the glide and snaps back | finishes the other's call with its glide down, like a sigh |

Beside the grid, three more wrong uses, each of which works:

- Tapping the one who asks, again and again: it calls each time and everyone still hidden answers in turn; after several in a row it runs out of breath and takes one huge gulp of air.
- Tapping the one who waits at the edge before its turn: it peeks in, calls once from where it stands, and stays there.
- Opening every egg without listening: everybody comes out, each with its entrance, and each one meets the asker in its own way.

**On day 15.** The child knows the six voices: they can tell who is in an egg before it opens, they tell the near voices apart, and they find someone by ear alone behind leaves. On the hill they make their own choir from whoever they last let out, by tapping them in an order of their own, and they have found that two kinds of one family, tapped one after the other, always sing a round. For the youngest, day 15 looks much like day 1: faster, surer, and trying one new thing (pack: game-design, depth-from-combinations.md; pack: game-design, ages-2-to-4.md).

## The representation

The school idea is that a sound can be noticed, explored and told from another sound, and that a sound belongs to the thing that makes it. It was chosen before the game, in three parts.

- **The object is the sound itself, with a maker that hides.** Each kind of creature has one voice and keeps it. What can be told about a voice is in the voice: how high it is, how long it lasts, whether it is steady or warbles, whether it is one note or two, whether it goes up or down, and how loud it is. Because the maker is out of sight, the sound is the only thing the child has to go on.
- **The picture is the body moving in the shape of its call.** An egg, or a creature in the open, moves in the shape of its call while it calls, and in that shape only then: higher off the ground for a higher voice, for as long as the call lasts, with a shiver for a warble, two hops for two notes, and a tip up or down for a glide. So each of those properties but the last is seen at the moment it is heard, on the thing that makes it; how loud it is is heard only, softer from inside a hide and louder in the open. A leaf pile is the one exception: it rustles when someone calls from it, the same way and for the same short time whoever that is, so its rustle shows nothing of the voice.
- **Loudness belongs to where the maker is, never to who it is.** The same voice is softer inside a hide and louder in the open, at the same pitch. Pitch says who is calling, and loudness says whether they are still inside.

The working objects stay plain: every egg is the same plain egg and every leaf pile the same plain pile, on a plain ground of a contrasting hue, so that nothing but the call tells two hides apart. The look goes on the creatures, the hill and the scenes (pack: game-design, working-objects-stay-plain.md).

This is school practice without a trial behind it. The pack's own table for early reading lists, for listening and telling sounds apart, "which animal made that sound; find the same sound; loud and soft, high and low", as sound-only play that needs no letters, and cites no trial for that row (`compound-packs/game-design/research/learning-games-that-work.md`, section 4). That the body's movement helps a child hear the difference is the game's own assumption, with no trial claimed for it.

The band starts below 6, so the order of object, picture and symbol ends at the picture. Nothing stands for a sound but the moving body: no note, no wave, no bar, no icon. Two places of the designed order, `leaf-piles` and `near-in-leaves`, take the picture away again, so that a hide can be told by ear alone.

## The four mechanic questions

- **Swap.** No. The content is the sound: every hide looks the same, so with the voices taken out, or replaced by a picture, a number or a word, there is nothing left to tell one hide from another and no game.
- **Attention.** At the moment of decision the child has just heard two calls one after the other, the asker's and a hidden one's, and has to think about whether they are the same: as high, as long, steady or warbling, one note or two, up or down. Where to tap and when to tap do not matter. While a hide still moves in the shape of its call the child may go by the eye as well; what they look at is then the same properties of the same sound, and in the places `leaf-piles` and `near-in-leaves` there is nothing to look at.
- **Fun.** The best moment of play is the burst, when someone comes out. The skill is used to choose which hide to burst, and the burst is what answers it, so play never stops for the skill.
- **Guess.** Yes, by trying every option, and the age asks for that: every hide opens on the second tap it gets before someone new comes to ask, so a child who opens them all lets everyone out, and with two eggs a blind first choice is right half the time. A two-year-old is never stuck (pack: game-design, ages-2-to-4.md). What blind opening does not give is the right one first. A cycle counts as gone well only when no wrong hide was opened, so a child who opens blindly stays in the first two places, where the voices differ grossly, and only listening moves the game on to near voices and to hides told by ear alone.

## The error as a consequence

A wrong attempt is opening a hide whose kind is not the kind that asks (or, in the place `who-is-inside`, sending a grown one to an egg that is not its own).

- **What it does.** The one inside comes out anyway, with its own entrance. It calls at the asker in the open, and the asker calls back. The two calls are heard one after the other at full loudness, and the two bodies move in two different shapes side by side: one pops up high and is done, the other leans low for a long while. Then each reacts to the other's voice by its fixed taste, delighted or startled, and puzzled when the two voices are near.
- **Where and why it shows.** At the calling stone, where the two stand next to each other. The why is the difference between the two calls, heard and seen at once.
- **The state stays.** The one let out walks up the hill and stays there, and calls when it is tapped. The other hides are as they were, the asker turns back to them and holds out its wings again, and nothing is lost: when the grown one of that kind comes to ask, it finds its little one on the hill at once. The child changes one thing, which hide to try, and tries again.
- **In `who-is-inside`.** The grown one knocks, the egg answers in its own voice and stays shut, the grown one reacts to that voice by its taste and steps back to its place.

Nothing gives a verdict. There is no buzzer, no cross, no sad face turned to the child, and no cheer when a hide is right: the right hide is answered by the two voices sounding as one (pack: game-design, errors-show-as-consequences.md). The meeting that does not match is as much worth seeing as the one that does.

## The designed order, and what is stored

**A cycle is one clutch.** A clutch of hides comes into the row, each holding one kind. The ones who ask come one at a time, and each finds its own. When the row is empty and everyone who came to ask has found its own, the cycle is over. A clutch of two or three takes one to three minutes.

**Hearing and choosing are two separate taps.** The first tap on a hide lets the child hear it, and the asker answers so that the two calls come one after the other. The second tap on that hide opens it. A tap on the asker makes it call again, and everyone still hidden answers in turn, so anything can be heard again without opening it. When someone new comes to ask, every hide that was heard is as it was before, so the first tap on it is again for hearing: a hide is never opened for an asker it has not been heard against.

**The places, in order.** Each adds one new thing, or combines two that are known. The ids are the ones in `LADDER` in `config.ts`.

| Place id | What comes in | New |
| --- | --- | --- |
| `two-eggs` | A grown one asks. Two eggs, of two families. | The game itself: hear, then open. |
| `three-eggs` | Three eggs, one of each family. | One more voice to tell apart. |
| `near-voice` | Three eggs: both kinds of one family and one of another. | Two voices that differ in one thing only. |
| `leaf-piles` | Three leaf piles, one of each family. A pile rustles the same way, and for the same time, whoever calls from it. | By ear alone. |
| `near-in-leaves` | Three leaf piles: both kinds of one family and one of another. | The two before, together. |
| `who-is-inside` | The question the other way round. Three grown ones stand in the row, and three eggs come to the stone one at a time: both kinds of one family and one of another. The child sends the grown one whose voice it is. | The asker is the hidden one. |
| `two-alike` | Four eggs and nobody asking: two kinds of two families, two of each. The first one the child lets out asks for the other that sounds like it. | Two hidden ones that sound alike. |

**How a cycle is judged.** By the number of wrong attempts in it: none is a cycle gone well, one is mixed, two or more is gone badly. The place moves one step up after a cycle gone well, one step down after one gone badly, and stays after a mixed one, between cycles only. A child who opens hides blindly in a clutch of three has no wrong attempt one time in six and two wrong attempts one time in three, so blind play drifts to the first two places. A visit put away with no finished cycle leaves the place where it was. Nothing on screen shows the place or that it moved.

**The harder option the child can pick.** A basket stands by the row with one more egg in it, of a kind that is not in the clutch. The basket is on screen only while an egg is in it, and a first visit starts without one: the first egg is laid in it when the second clutch is laid out. A tap on the basket tips the egg in. In a `seek` cycle it lands in the row as a hide like the others of that clutch (among leaf piles, leaves fall over it), and its grown one joins those who will come to ask. In a `who` cycle it joins the eggs that will come to the stone, and its grown one takes a fourth spot in the row. A fuller row is harder and looks it. The child may do this in any cycle that has room (fewer than four in the row), or never. Where the row is full, as in every `alike` cycle, or the clutch on screen is finished, the basket still answers a tap: the one inside calls in its own voice and the basket rocks, and the egg stays in it. An egg left in the basket stays there, and is in the basket still when the next clutch comes; that clutch is laid out without its kind. After an egg has been tipped in, the next one is laid in the basket when the next clutch is laid out, from the same seeded stream.

**Which clutch a new place lays out.** The very next one. While a cycle runs, the one who waits at the edge belongs to that same cycle. Nobody from the next clutch is on screen until the cycle has been judged: the next clutch is laid out at that moment, from the place as it then stands, and its first comer appears at the edge during the ending.

**Where a first visit starts.** `two-eggs` for a child of 3 or younger and for no age (`null`); `three-eggs` for a child of 4 or older. A saved place wins over the age.

**Every field of the saved state** (plain JSON, version 1, read field by field, each repaired by itself):

| Field | Holds |
| --- | --- |
| `v` | The version of the shape. |
| `position` | The place the next clutch is laid out from: an id of the ladder. |
| `finished` | The clutch on screen is finished. Its ending stays, and the next one waits at the edge. |
| `rng` | The state of the seeded stream that lays out clutches, so the same save always gives the same next clutch. |
| `shown` | Which of the three ways of asking (`seek`, `who`, `alike`) a character has already shown once. |
| `hill` | Who stands on the hill, oldest first, at most four and never two of one kind: for each a kind, whether it is a family, twins, or one alone, and which of the hill's four places it stands in. It keeps that place until it leaves. |
| `extra` | The kind inside the egg in the basket, or nothing: before the second clutch of a first visit, and after that egg has been tipped in. |
| `next` | The clutch that waits at the edge while `finished` is true, laid out in full; otherwise nothing. |
| `cycle` | The clutch on screen, or nothing before the first one has come in. Its fields are below. |
| `cycle.form` | `seek`, `who` or `alike`. |
| `cycle.place` | The place it was laid out from, which says whether its hides are eggs or leaf piles. |
| `cycle.kinds` | The kind at each spot of the row, left to right. |
| `cycle.slots` | For each spot: not yet heard, heard, or done. |
| `cycle.queue` | The kinds still to come and ask, in order. |
| `cycle.asker` | The kind that asks at the stone now, or nothing while the next one waits at the edge. |
| `cycle.wrong` | The wrong attempts in this cycle, counted up to three. It is never shown. |

The game has no drag, so nothing is ever in the hand. A scene's outcome is in the state before the scene starts: the hide is done and the one let out is on the hill. Nothing is timed by a wall clock, and a largest legal state is far under half the 64 KB cap, which a test holds.

## The characters and their fixed tastes

Every kind has the same one want, always visible: whoever asks stands at the stone with both wings held out towards the hides, empty, and with its face turned to them, as one who listens. It wants the one that sounds like it. The want is about the hides and never about the child. In a `who` cycle the one who asks is still in its egg: the egg on the stone leans and rocks towards the grown ones in the row, and what it wants is the grown one that sounds like it. In an `alike` cycle nobody asks until the first one is let out, and that one then stands at the stone as any asker does.

Each kind hears three sorts of voice besides its own, and its reaction to each never changes, so a child can learn it and bring it about on purpose:

| Kind | Its own voice | Its near voice | The family it loves | The family it shies from |
| --- | --- | --- | --- | --- |
| `pip` | sings in step | puzzled by `tok` | the low ones: it bounces on the long note | the gliders: it stands stiff and thin as a brush |
| `tok` | sings in step | puzzled by `pip` | the gliders: it pecks along, up or down | the low ones: it falls over backwards |
| `hoom` | sings in step | puzzled by `brrl` | the high ones: its belly shakes with giggles | the gliders: its eyes swing from side to side after the glide |
| `brrl` | sings in step | puzzled by `hoom` | the gliders: its neck sways along | the high ones: it shrinks down short and wide, neck and all |
| `wheep` | sings in step | puzzled by `dooo` | the low ones: it stretches up tall | the high ones: it ducks |
| `dooo` | sings in step | puzzled by `wheep` | the high ones: it stands up straight and its ears flick, one and then the other | the low ones: it melts flat on the ground |

- The two kinds of one family have opposite tastes, which is one more way to tell them apart.
- Puzzled is a slow double take: almost, but not the same. It is what a near voice always gets.
- Startled is surprise and never hurt, and it passes within the scene. A dislike is as good to watch as a like.
- A reaction is to the exact voice that was just heard. No feeling is ever about the child: nobody thanks, praises or is disappointed, and the one who waits at the edge never calls for attention or shows that it has waited (pack: game-design, characters-with-opinions.md).

These reactions are the game's only feedback. The rule is in `tastes.ts`.

## The scenes

Each scene is a list of timed beats filled in from the state of play, and each gives way to any touch: the touch is answered as it would be at any other time, and the scene jumps to its end state, which was saved when the scene began.

- **The showing** (4 to 9 seconds, by the length of the voice). Cause: the first clutch of a way of asking the child has not met (`seek`, `who`, `alike`) comes in on the child's touch. A grown one sets down a single egg, calls, hears it answer alike and softer, taps it once so that it wakes and calls, calls again itself, taps it a second time so that it bursts, and the two sing in step and go up the hill. In `who-is-inside` the grown one walks over and knocks; in `two-alike` a little one that has just come out does the tapping. In play the same holds: in `who-is-inside` a reunion and a meeting that does not match both begin with the grown one walking to the stone and knocking, and after a knock that does not open it walks back to its spot. Filled in from the kind of the one who shows. It is shown once for each way of asking, marked in `shown`, and never plays again unasked. Saved when it starts: `shown` (the way of asking), `hill` (the pair that shows, in its place, and whoever made way for it gone), `rng`, and with them what the same touch brings in: `finished` (no longer), `cycle` (the clutch, with its first asker at the stone, or in an `alike` clutch with nobody at the stone) and `next` (nothing).
- **The reunion** (4 to 8 seconds, by the kind's way out of the egg and the length of its voice). Cause: the child opens the hide of the kind that asks. Beats: out with its own entrance, its call in the open, the asker's call, both in step with both bodies in the same shape, the little one climbs on, the two go up the hill. Filled in from the kind, the spot of the hide, and who already stands on the hill and turns to listen. Saved when it starts: `cycle.slots` (the hide is done), `cycle.asker` (nobody), `hill` (the two together in their place, and whoever made way gone) and `rng`. When it is the last of its clutch, the choir follows on the same touch, and everything the choir saves is written in that same save: a game put away during the reunion is found with its cycle finished and the next clutch waiting, and plays no ending on load.
- **The meeting that does not match** (4 to 7 seconds). Cause: the child opens another hide. Beats: out with its own entrance, its call, the asker's call, each one's reaction by its taste, the walk up the hill. Filled in from the two kinds, so there are thirty different meetings. Saved when it starts: `cycle.slots` (the hide is done), `cycle.wrong`, `hill` (the one let out alone in its place, or together with the other of its kind if that one stood there alone, and whoever made way gone) and `rng`. In `who-is-inside`, where the grown one comes back and the egg stays shut: `cycle.wrong` and `rng` only.
- **The finding on the hill** (4 to 7 seconds). Cause: one comes to ask whose own was let out earlier and waits alone on the hill; or, in `two-alike`, the second of a kind is let out with nobody asking while the first stands alone on the hill. Beats: its call, the answer from the hill, both in step, and up the hill to the one who waited. Saved when it starts: `cycle.queue` (it no longer has to come), in `two-alike` `cycle.slots` (the hide is done) and `rng` (every second tap on a hide moves it on), and `hill` (the one alone is now a family, or twins, in the same place). When it is the last of its clutch, the choir follows on the same touch, and everything the choir saves is written in that same save: a game put away during the finding is found with its cycle finished and the next clutch waiting, and plays no ending on load.
- **The choir** (4 to 8 seconds), the ending. Cause: the last one of the clutch has found its own. Everyone who came out of this clutch turns to the front and calls once, in the order they came to stand on the hill, and then all call together. It stars exactly what the child let out, in the order the child's own play brought them to the hill. Saved when it starts: `finished`, `position` (moved by how the cycle went), `next` (the clutch that will wait), `extra` (a new egg if the basket was empty) and `rng`.
- **The round**, a secret. Cause: both kinds of one family stand on the hill and the child taps one straight after the other, whether or not the first is still calling: for these two the round takes the place of joining in. They sing a short round of 4 to 8 seconds. It works every time, is never hinted at, and is never counted (pack: game-design, hidden-never-counted.md). It saves nothing: it is a view of who stands on the hill.

No scene plays before the action that causes it, none plays only sometimes for the same action, and none is a fixed film.

**How a cycle ends and the next one starts.** The cycle ends with the choir, and the finished scene stays as long as the child likes: everyone on the hill, each still calling when tapped. During the choir the first comer of the next clutch appears at the edge with its clutch in a nest and waits there. It rocks on its feet, looks at the row, and does nothing else: it does not call out, hurry, or show that time has passed. If the child does nothing, nothing starts. A tap on it brings it in: the hides tumble out of the nest into the row, and it steps to the stone and calls. In a `who` clutch the three grown ones wait at the edge around the nest; a tap on any of them brings them in: they take their spots in the row, and the first egg rolls onto the stone and calls. In an `alike` clutch the nest waits at the edge by itself, rocking; a tap on it tips the four eggs into the row, and the stone stays empty until the first one is let out. Inside a cycle the same holds for each one who asks, grown one or egg: the next waits at the edge and comes in on a tap. A tap on a hide while nobody is at the stone and the next one waits at the edge brings that one in as well, and is then a first tap. On load no scene plays again: the world is as it was left, with the same one waiting (pack: game-design, endings-and-short-scenes.md; "How a cycle restarts" in the guide).

## The records

Each record was read in its file and looked up again by id on 2026-10-03. The standing and the check state are as the lookup printed them that day. What a record asks is given in the game's own words or in the pack's own text: for a California record its Summary, and for a Dutch record its English gloss, which is the pack's gloss and not an official translation.

### us-ca

Levels, as the lookup prints them: age 2 is `infant-toddler` (the indicator for 23 through 36 months); age 3 is `preschool-tk`, sub-band Early (3 to 4 ½ Years); age 4 is `preschool-tk`, Early and Later, where both statements of a foundation apply. Age mapping: official. Gap: none printed.

California's support for this game is in science. No California reading and language record is named, so none is named for the sound game. Of the 29 records of California's two reading and language lanes for these ages, infant-toddler and preschool-tk, read in the pack's Summaries and Limits, none carries telling apart sounds that are not speech, or matching a sound to its maker. The game claims no California reading and language skill and names nothing in its place.

- `edu.us-ca.preschool-tk.science.objective.science-strand-2-0-physical-science-2-2` (`us-ca 2.2`, Preschool/Transitional Kindergarten Learning Foundations: Science, Strand 2.0, Physical Science): department-published-foundation, confirmed. For ages 3 and 4. In play, a child notices sound and explores it through the senses; at the later age the child changes sound on purpose and describes the change. The record also covers light and shadows, which the game leaves out.
  Limits taken: at the earlier age the statement is noticing and exploring, and describing is not yet asked. Explaining how sound travels is not mentioned in the statement, and the game explains nothing. Left open by Limits: the statement does not list the properties of sound, so the properties the game varies (how high, how long, steady or warbling, one note or two, up or down, softer inside a hide) are the game's own choice. Beyond what the game gives: the describing of the later age, since a wordless game asks nobody to describe, and the setting, which the record gives as play and investigation shared with others, where the game gives the play and cannot give the company.
- `edu.us-ca.preschool-tk.science.objective.science-strand-2-0-physical-science-2-1` (`us-ca 2.1`, same document and strand): department-published-foundation, confirmed. For ages 3 and 4. A child explores things and says what they are like, and the sound a thing makes is one of the example properties.
  Limits taken: the properties are examples and not a checklist; the statement asks for describing, not explaining, and sets no number of things. The game takes the one example, sound, as a property that tells one maker from another. Beyond what the game gives: the saying, and the record's sorting of materials into solid and not solid, which is not in the game.
- `edu.us-ca.infant-toddler.science.objective.cognitive-development-strand-1-0-exploration-1-1` (`us-ca 1.1`, Infant–Toddler Learning and Development Foundations, Second Edition, Cognitive Development, Strand 1.0: Exploration): department-published-foundation, confirmed. For age 2. It is about a child's growing grasp that doing one thing makes a second thing happen, with simple predictions.
  Limits taken: the predictions are called simple, nothing says what they are about or that they must be right, and the record describes what children typically show, not a requirement on a child.

No California record on sound is named for a two-year-old: the infant-toddler science lane holds this one record, and it is on cause and effect. For a two-year-old the game's California claim stops there: I tap the egg and it sounds, and I tap it again and someone comes out. No California record is named for loudness and pitch as properties of sound either: the statement of `us-ca 2.2` lists no properties, and nothing is named in their place.

### nl

Levels, as the lookup prints them: ages 2 and 3 are `peuters`; age 4 is `peuters` (up to the fourth birthday) and `fase-1`, sub-band groep 1. Age mapping: convention. Gap: none printed. At age 4 the lookup also returns the `einde-po` lane, labelled end-of-primary goals; the game is designed from no record of that lane.

Two pairs of the records below print the same code: the two sound-game bullets (Fonemisch bewustzijn en alfabetisch principe / 3) and the two sound bullets (Natuurkundige verschijnselen / 2), one of each pair on the peuter card and one on the fase 1 card. So each is cited by pack id with its scope.

- `edu.nl.peuters.reading-language.objective.inhoudskaart-nederlandse-taal-peuters-aanvankelijk-lezen-fonemisch-bewustzijn-en-alfabetisch-principe-3` (`nl` Fonemisch bewustzijn en alfabetisch principe / 3, Inhoudskaart Nederlandse taal, peuters / Aanvankelijk lezen): curriculum-institute-guidance, confirmed. Playing games around language, word games and sound games.
  Limits taken: it describes what is offered to children of about 2 to 4, not what a child must be able to do; it mentions no letters and no written words, and the game has none. Left open by Limits: which games, how long they last and who leads them, so a sound game of creature voices, led by the child, in cycles of one to three minutes, is the game's own choice. Our reading, not the record's: the record's games are games around language, and the bullet stands under a heading about awareness of the sounds of speech. Creature voices are not speech, and listening play with them comes before that. That such play belongs with the card's sound games is the game's own reading; the game is not called a language game or phonemic awareness.
- `edu.nl.peuters.science.objective.inhoudskaart-orientatie-op-jezelf-en-de-wereld-peuters-verschijnselen-uit-natuurkunde-en-techniek-natuurkundige-verschijnselen-2` (`nl` Natuurkundige verschijnselen / 2, Inhoudskaart Oriëntatie op jezelf en de wereld, peuters / Verschijnselen uit natuurkunde en techniek): curriculum-institute-guidance, confirmed. Discovering and wondering about sound, for which the card names loudness and pitch. The record also names light, warmth, force and a lamp, which the game leaves out.
  Limits taken: an offer to children of about 2 to 4; the verbs are discovering and wondering, with no explaining and no measuring; for sound only loudness and pitch are named. The game takes both: pitch tells the high family from the low one, and loudness is softer inside a hide and louder in the open at the same pitch. Beyond the record, as the game's own choice: how long a call lasts, whether it warbles, one note or two, up or down.
- `edu.nl.peuters.science.objective.inhoudskaart-orientatie-op-jezelf-en-de-wereld-peuters-verschijnselen-uit-natuurkunde-en-techniek-natuurkundige-verschijnselen-1` (`nl` Natuurkundige verschijnselen / 1, same card and block): curriculum-institute-guidance, confirmed. Exploring and naming things from what the child sees, hears, feels, smells and tastes.
  Limits taken: an offer to children of about 2 to 4; no list of things or words is set. The game gives the exploring by hearing and seeing. Beyond what the game gives: the naming, which a wordless game leaves to the child and whoever sits beside them.
- `edu.nl.fase-1.reading-language.objective.inhoudskaart-nederlandse-taal-fase-1-lezen-fonemisch-bewustzijn-en-alfabetisch-principe-3` (`nl` Fonemisch bewustzijn en alfabetisch principe / 3, Inhoudskaart Nederlandse taal, fase 1 / Lezen): curriculum-institute-guidance, confirmed. For a child of 4 in groep 1. Taking part in word games and sound games.
  Limits taken: it describes what a school offers in groep 1 and 2, with no year stated, not what a child must be able to do; it mentions no letters and no written words. Left open by Limits: which games. The same reading of ours holds as for the peuter bullet.
- `edu.nl.fase-1.science.objective.inhoudskaart-orientatie-op-jezelf-en-de-wereld-fase-1-verschijnselen-uit-natuurkunde-en-techniek-natuurkundige-verschijnselen-2` (`nl` Natuurkundige verschijnselen / 2, Inhoudskaart Oriëntatie op jezelf en de wereld, fase 1 / Verschijnselen uit natuurkunde en techniek): curriculum-institute-guidance, confirmed. For a child of 4 in groep 1. Discovering and wondering about sound, for which the card names loudness and pitch, beside light, heat, force and electricity, which the game leaves out.
  Limits taken: what a school offers in groep 1 and 2, with no year stated; discovering and wondering, with no explaining, no measuring and no rule to state; apart from the magnets, the lamp and the buzzer in its brackets no apparatus or instrument is named, so none for sound. The game takes loudness and pitch as under the peuter bullet.

No Dutch record is named for cause and effect, which the game takes for a two-year-old from `us-ca 1.1` alone; nothing is named in its place.

### Where the two differ

- **The subject.** The Dutch cards named above carry sound games under reading and language as well as sound under science. The California records named above carry sound under science only. The game follows the Dutch cards here, with its own reading that listening play with voices that are not speech belongs with their sound games, and makes no reading and language claim for California.
- **Age 2.** The Dutch peuter cards are an offer to children of about 2 to 4, sound included. The California records on sound that the game names are for ages 3 and 4, and the one record of California's infant-toddler science lane, for a two-year-old, is on cause and effect. The game follows the Dutch cards here and plays the same at every age; for a two-year-old its California claim is cause and effect alone.
- **Which properties of sound.** The Dutch cards name loudness and pitch. The California statement lists none. The game follows the Dutch cards here and uses both, and everything else it varies is its own choice under either.
- **Saying.** California's later age asks a child to describe a change, and one Dutch bullet asks for naming. The game gives neither under either.
- **Standing.** The California records are foundations published by a state department. The Dutch records are guidance from the curriculum institute. Neither is a standard or the law, and no record of one jurisdiction stands for a record of the other. The game follows each in its own words here: the claim calls a foundation a foundation and guidance guidance.

Matching a sound to who makes it, and finding two that sound alike, are taken from none of the eight records named above. They are the game's own.

### The claim

Who Made That Sound is designed from three California foundations published by a state department (`us-ca 2.2` in part and `us-ca 2.1` in part, of Physical Science in the Preschool/Transitional Kindergarten Learning Foundations for science, for ages 3 and 4, and for a two-year-old `us-ca 1.1` of Exploration in the infant-toddler foundations, on cause and effect only), and from five bullets of the Dutch curriculum institute's content cards, which are guidance and not law, each in part: for peuters the sound-game bullet of the language card and two bullets of the orientation card, on sound and on exploring with the senses, and for fase 1 the sound-game bullet of the language card and the sound bullet of the orientation card. All eight records are confirmed. The parts taken: of `us-ca 2.2`, noticing and exploring sound, without light and shadows and without the describing of the later age; of `us-ca 2.1`, exploring a thing by the sound it makes, which is one of the record's example properties, without the saying and without the sorting of materials; of the two Dutch sound bullets, sound with its loudness and pitch, without light, temperature, force and electricity; of the Dutch bullet on exploring with the senses, exploring by hearing and seeing, without the naming; of the two sound-game bullets, sound games and not word games. Sound as something to notice and explore is taken from both jurisdictions for ages 3 and 4, and for a two-year-old from the Dutch cards only. Loudness and pitch as the named properties of sound, and the sound game, are taken from the Dutch cards only. The two sound-game bullets are about games around language, and that listening play with voices that are not speech belongs with them is the game's own reading. It is a listening game with invented voices; matching a sound to its maker is the game's own and rests on no record.

## The look

Written after the style spike, not part of the sheet. The look is **painted-tissue collage**, the first look reserved for the game in the ledger of `docs/art-direction.md`: flat pieces of hand-painted tissue with brush streaks and torn or scissored edges, laid on a white page, one bright hue for each creature. No shadows, no depth, no lamp, no ink line, no shading bands.

The spike was the game's real scene at the place `three-eggs`, a still with nothing playable behind it. The game has replaced it at load; `spike=1` in the address still shows it, and `kinds=1` the six kinds in a row, grown and little.

### Palette

| Thing | Colour |
| --- | --- |
| The page | `#fdfbf4`, with faint fibres |
| The hill | `#56a83f`, one big torn piece with a pale torn rim |
| The ground strip (the working surface) | `#4b362d`, plain and dark, torn top and bottom |
| Every egg | `#f6e9cd`, the same plain pale egg from one sprite |
| The calling stone | `#b7b1c4`, a lump of rock, laid down once someone has come to ask |
| Behind the hill | `#a9d98a`, a second, paler sheet torn to the same dome, showing along the hill's left and top |
| At the foot of the hill | eight low grassy mounds, each one torn piece, in `#3f9335` and `#7cc653` |
| What hops up under a finger on nothing to tap | two scraps of brown paper `#d1a955` on the page and the ground, two leaves `#d3ee6b` on the hill, two chips `#eeebf6` on the stone |
| The basket | `#a9c63b`, with leaves of `#7fa52e` and `#c3d64f` laid over it, all slanting one way |
| The nest a clutch comes in | `#b98a4a`, the basket's shape in twig brown with twigs of `#7d5a2c` and `#dab677` laid along each other, slanting the other way |
| Every leaf pile | `#c9a66b`, one plain heap with dry leaves of `#a9864e` and `#dcc291` lying over it side by side |
| The glow of the idle ladder | `#ffe98f`, a pale torn piece under the thing to touch |
| `pip` | `#f6b100` |
| `tok` | `#e63e2b` |
| `hoom` | `#2d6fdb` |
| `brrl` | `#8d4bd0` |
| `wheep` | `#ee4c9b` |
| `dooo` | `#1cc4cf` |
| Eyes | white `#fbf6e9`, pupil and the dark inside a cracked egg `#2c2432` |

No creature shares its hue with the hill, the ground or the eggs. A grown one and its little one share hue and shape. The little one is a little over half the size when it rides on its grown one, and larger when it stands alone, so that it is still a target of its own.

### Materials

- Every piece is cut from a sheet of tissue painted once: brush passes with bristle marks in lighter and darker tones of the one hue, with a little of a neighbouring hue (`tissue.ts`).
- Edges are scissor-cut or torn, from the same seeded stream, so the same seed gives the same picture.
- Wings, ears and feet take the creature's hue a little darker, and thin pieces are slightly see-through, so an overlap reads without any line.
- The working objects stay plain: the eggs carry no pattern and no face, every leaf pile is the same heap, and the ground strip under them is one flat dark hue. A hide that has been heard is the same egg torn along zigzag teeth with its top lifted like a lid and two eyes in the gap; a leaf pile that has been heard shows the same two eyes through a dark slit.
- The basket and the nest are one shape in two papers, green leaves and brown twigs, so that the egg the child may add and the clutch that is brought are never taken for each other. Whoever brings a clutch carries the nest on its head.
- No two strips cross in anything that stands still on the page: the leaves on the basket, the twigs on the nest and the dry leaves on a pile lie along each other, every spring of `wheep` (its two legs and the one on its head; its arms are plain flaps) is a solid bellows, wide and narrow by turns and the same on both sides, with no stroke that leans one way and the next the other, and the ears of `dooo` are broad flaps that hang close and lift only a little, so that they do not lie across a neighbour. Two bars that cross, or a zigzag of three or four strokes, can be read as a sign, and nothing that stands still shows one. Where two creatures stand close and one of them moves (a knock, a meeting at the stone, a trick beside a neighbour on the hill), a wing of the one can pass in front of a piece of the other for a moment; nothing holds such a cross.

### Lighting

None. Nothing casts a shadow and nothing is shaded. Depth is only what lies on top of what.

### Motion

Cut-out animation: each creature is a few whole pieces (body, head or neck, two wings, feet, eyes) that turn at their joints (`figures.ts`), and the whole figure can be stretched about its feet and turned over like a piece of paper. No piece ever changes shape. Everything runs on the attended clock.

Each kind moves like itself (`motion.ts`, with the tables in `motionKinds.ts`). Tempo, weight and the funniest part were chosen before any curve:

| Kind | Idle round | Weight | Way out of the egg | Funniest part |
| --- | --- | --- | --- | --- |
| `pip` | 0.9 s | lightest | shoots out like a cork, 0.5 s | the whole round body: it spins and rolls |
| `tok` | 1.3 s | light | comes up in two pecks, 0.62 s | the beak: jabs and snaps |
| `wheep` | 1.7 s | middling | springs out upwards and overshoots, 0.74 s | the spring legs |
| `dooo` | 2.2 s | middling | slides out and flops, 0.86 s | the ears: a slow droop and a quick snap |
| `brrl` | 2.8 s | heavy | comes up long and thin first, shivering, 1.05 s | the neck |
| `hoom` | 3.6 s | heaviest | rolls up slowly, over on one side and back, 1.2 s | the belly |

- Each kind has three tricks of its own for a tap in the open, never the same one twice running, and its own way of joining in when it is tapped while another on the hill calls. That call has a beat at its start and one every 0.3 seconds: `pip` peeps on every beat still to come and hops on each peep; `tok` puts the two notes of its double peep into the next two gaps between the beats and pecks at its foot on each; `hoom` hums underneath and `brrl` warbles around it at once; `wheep` answers it and `dooo` finishes it once it is over.
- A call is seen as well as heard: the body, or the egg around it, rises by the height of the voice, once for each note, shivers for a warble and tips for a glide. A leaf pile does none of that: it gives the same short rustle, 0.36 seconds, seen and softly heard, whoever calls from it, the piles beside it lean in for as long, and whatever comes next waits as long as the longest voice takes.
- A finger on nothing that can be tapped is answered where it lands, by what it lands on: two leaves and a swish on the hill and on the sheet behind it, two chips and a tick on the stone, two scraps of paper and a flick on the page and the ground.
- Left alone, the one who asks calls again by itself three times at most, each time half a second after a showing of the ghost hand is over, so that the hand is always seen whole.
- A finger landing squashes what it lands on at once. Every hide squashes alike, whoever is inside, and a hide moves only under a finger and while the one inside calls; the hides beside one that calls lean towards it.
- Whoever comes out of a hide lands beside the one who asks in one leap, so that the two stand next to each other to be heard, and whoever stands on the hill turns to listen while a scene plays. `pip`, who shoots out like a cork, lands on the other's head and rides there.
- Two who sound as one have their kind's own picture of it, for the call and 0.4 seconds more (`reactions.ts`): `pip`'s rock from side to side as one, one on the other's head; `tok`'s turn to each other and jab their beaks at each other once on each of the two notes; `hoom`'s come together and swell until the bellies meet, and hum with their eyes half shut; `brrl`'s put their necks up long and sway them the same way at the same moment, side by side, each head turned to the other; `wheep`'s bounce on every glide that is heard, the little one's, the asker's and the one they sing together, each bounce higher than the last; `dooo`'s sink with the glide and slide the same way, side by side.
- In a choir the last one found sings like everyone else, though it has only just arrived: it turns to the front, calls in its turn and calls with all.
- A tap on a figure of a scene that is playing, on its way to the hill, is a tap on the one it is: the scene ends, it stands in its place and calls and does its trick.
- Tapped while anyone else's call sounds, someone on the hill joins in: another on the hill, the one who asks, a hide, the choir. The scene that call belongs to gives way to the touch, and the voice that had begun is heard to its end. Whoever called goes on moving in the shape of the call for as long as it is heard.
- A grown `wheep` with its little one on its head has no spring there: the little one sits where it was. Two who stand side by side open their wings away from each other.
- In a showing the one who shows comes in with the single egg on its head, as a nest is carried, sets it down, and stands so near it that each of its two taps lands on it. In `two-alike` it is a little one with the top of an eggshell still on its head.
- The basket stands in front of whoever waits at the edge: a wide one reaches behind it.
- Tapped four times in a row, the one who asks takes one huge gulp of air and then calls as it does each time.
- A clutch comes out of its nest as eggs in every place; in a leaf place leaves fall over each egg as it lands.
- An egg tipped from the basket among leaf piles lands as an egg, and a heap of leaves comes down over it with a rustle while it sinks out of sight.
- In a `who` clutch the egg that asks rolls from the edge onto the stone, turning as far as it travels.
- Going up the hill, a light kind patters in four hops and a heavy one lumbers in two.
- An egg that has been heard lifts its top like a lid on a hinge and shows two eyes in the dark; a burst sends the two halves and six scraps of shell fluttering off the page. A pile that bursts sends its leaves up side by side, all turning together.
- What can be touched next rests on a pale piece of tissue that breathes (a disc behind a figure; a flat patch under a hide of the row, an egg that asks, an egg that waits and a nest that waits by itself; never a ring round a plain egg), and the ghost hand is a piece of white tissue: no light and no outline.
- Each kind has its own way of being puzzled, delighted and startled (`reactions.ts`): `pip` bounces on a low note and stands stiff and thin as a brush at a glide; `tok` pecks along and falls over backwards; `hoom`'s belly shakes and its face swings from side to side; `brrl`'s neck sways, and it shrinks down short and wide; `wheep` stretches tall and ducks; `dooo` stands up straight with its ears flicking and melts flat. Startled is over within the move, and everyone ends standing.
- One who asks holds both wings out to the row with its face turned to it. Once someone has come out and stands beside it, its wings come down and it looks at that one, so that nothing it held out lies across its neighbour; and it lets them go while it reacts to a voice or sings in step; one who waits at the edge rocks on its feet and looks at the row.

### Layout

A design space of 1180 by 820, fitted to the surface and centred (`stage.ts`). The hill is across the back with four places on it. The row is across the middle on the ground strip, the calling stone to its left, the basket to its right, and the one who waits leans in at the right edge of whatever the surface shows. Where there is room, with no basket beside it and nobody on the right of the hill above, the grown one who brings a clutch waits a quarter of the page in from that edge and bigger, with the nest on its head: so it does on the first frame of a first visit, where it is the one thing on the page that wants something. Where everyone stands for a given saved world is in one place, `picture.ts`, and how tall in `sizes.ts`. Nothing is in the bottom 12 percent. Every target is about 100 logical pixels across or more and no two overlap, which `stage.test.ts` holds.

### Tiers

A tier changes the pixel ratio only (`config.ts`): the painted sheets are kept, the pieces are cut again at the new ratio (the page and the props at once, the figures at three sizes, one kind and size a frame), and the picture is the same picture at every tier. A frame is one stamped layer and cached pieces drawn with `drawImage`; `frameBudget.test.ts` holds the count and that nothing is painted or cut while playing.

### Still weak

- The beaks of `tok`'s pair do not meet when they jab at each other: the little one is smaller and stands lower, so the two beaks stay some way apart, and further in a finding and a showing, where the two stand apart.
- `tok` is the least charming of the six, its eyes sit close together, and its wings are too small for the asking pose to read: on the stone it is told by standing there and calling, not by its wings.
- `dooo`'s heavy eyelids make it look sleepy when it asks.
- Turquoise `dooo` on the green hill is the lowest contrast on the page, and the blue `hoom` on the dark ground has less contrast than the figures on the hill.
- A little one riding on a `brrl` sits very high and small on its long neck.
- The eyes in a heard egg are small.
- The way anyone walks or hops across the page is one kind of hop for every kind, paced and counted by its weight; everything else is each kind's own.
- The hill is a very regular dome.
- Two creatures that stand next to each other at the stone, or side by side on the hill, are close enough that a wing or an arm of the one passes in front of an ear, a beak or a neck of the other while one of them reacts or does a trick: for a quarter to two thirds of a second, never while both stand still.
- In `who-is-inside` a grown one that has been heard has stepped out in front of the row and bounces there on its toes, leaning towards the stone; one that has not stands still in the row. Nothing but that step and that bounce marks it.
- The three grown ones of a `who` clutch that waits at the edge stand small behind the nest, half as tall as in the row, so that they are clear of each other.

### The row for the look registry

For the lead, now that the owner has accepted the look (`docs/art-direction.md`, section 3):

`| Who Made That Sound | Painted-tissue collage (canvas 2D): flat pieces of streaky hand-painted tissue with torn and scissored edges on a white page, one bright hue for each creature, plain pale eggs and leaf piles on one dark ground strip, no shadows and no line | [`games/who-made-that-sound/ART.md`](../games/who-made-that-sound/ART.md) |`
