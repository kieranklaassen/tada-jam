<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 2 to 4, and its youngest age, 2, governs every choice below.

- **The cue table.** The table in wordless clarity has no row below 3, so its 3 to 4 row is the ceiling and the game cuts further. From its "Avoid" column, as hard constraints: no text, numeral or pictorial icon that has to be decoded; no spoken instruction; no verdict; never several activities live at once; nothing on screen before it means something. One next act is offered at a time.
- **The pack's rule for the age** (pack: game-design, ages-2-to-4.md). Everything works with a tap, and the game has no drag, pinch, tilt, shake or double tap. A thing that is tapped twice is tapped two separate times, with any wait between them. Every target is about 100 logical pixels across or more, the targets stand well apart, and none is in the bottom strip. One loved action is offered again and again: uncovering someone who hides. A whole cycle fits in one to three minutes, and never more than four things are hidden at once. Every touch is answered and there is no dead end: tapping at random opens every hide in the end.
- **Symbols.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, and the game has no `symbols.ts`. The creatures have ids in the code and no name on screen. Their voices are invented and synthesized: no speech, no word, and nothing spoken that instructs.
- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order: the first place, `two-eggs`, for a child of 2 or 3, for a younger child and for no age (`null`); the second place, `three-eggs`, for a child of 4 or older. A saved place always wins over the age, every place can be reached by play at any age, and nothing is hidden or locked by age.

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

Two kinds of one family differ in one thing only (one note or two, steady or warbling, up or down). Two kinds of different families differ in how high and in how long at once. The numbers are in `voices.ts`, and its test holds each voice in its range.

The actions are the five things a child can do to any kind. Every cell looks and sounds different, because every kind has its own voice, its own entrance and its own trick, and every pair of kinds meets in its own way ("The characters and their fixed tastes").

| | First tap on its egg | Second tap, its own kind is asking | Second tap, another kind is asking (the wrong use) | Tap it when it is out | Tap it while another one calls (the wrong use) |
| --- | --- | --- | --- | --- | --- |
| `pip` | the egg pops straight up once, high, and the call is one soft peep | shoots out like a cork, lands on the asker's head, and the two peep in step | shoots out and peeps at the asker, and each reacts to the other by its taste | spins on the spot and peeps | peeps on every beat of the other's call |
| `tok` | the egg pops up twice, high | pecks its way out in two blows, and the two knock beaks on the double note | pecks out and double-peeps at the asker, each reacting by its taste | pecks the ground twice | pecks the other one's foot in time |
| `hoom` | the egg leans over slowly, low, for a long while | rolls the shell off like a blanket, and the two hum belly to belly | rolls out and hums at the asker, each reacting by its taste | swells up and hums, belly wobbling | hums underneath, a floor under the other voice |
| `brrl` | the egg leans low and shivers all the way | a long neck comes out first, shivering, and the two warble with necks wound together | the neck comes out and warbles at the asker, each reacting by its taste | the neck ripples from the bottom to the top | warbles around the other voice and ties its neck in a loop |
| `wheep` | the egg tips up from one end to the other | springs out upwards, and the two bounce higher on every glide | springs out and glides up at the asker, each reacting by its taste | crouches and springs up with the glide | answers the other's call with its glide up, like a question |
| `dooo` | the egg tips down from one end to the other | slides out and flops, and the two slide down side by side | slides out and glides down at the asker, each reacting by its taste | droops to the ground with the glide and snaps back | finishes the other's call with its glide down, like a sigh |

Beside the grid, three more wrong uses, each of which works:

- Tapping the one who asks, again and again: it calls each time and everyone still hidden answers in turn; after several in a row it runs out of breath and takes one huge gulp of air.
- Tapping the one who waits at the edge before its turn: it peeks in, calls once from where it stands, and stays there.
- Opening every egg without listening: everybody comes out, each with its entrance, and each one meets the asker in its own way.

**On day 15.** The child knows the six voices: they can tell who is in an egg before it opens, they tell the near voices apart, and they find someone by ear alone behind leaves. On the hill they make their own choir from whoever they last let out, by tapping them in an order of their own, and they have found that two kinds of one family, tapped one after the other, always sing a round. For the youngest, day 15 looks much like day 1: faster, surer, and trying one new thing (pack: game-design, depth-from-combinations.md; pack: game-design, ages-2-to-4.md).

## The representation

The school idea is that a sound can be noticed, explored and told from another sound, and that a sound belongs to the thing that makes it. It was chosen before the game, in three parts.

- **The object is the sound itself, with a maker that hides.** Each kind of creature has one voice and keeps it. What can be told about a voice is in the voice: how high it is, how long it lasts, whether it is steady or warbles, whether it is one note or two, whether it goes up or down, and how loud it is. Because the maker is out of sight, the sound is the only thing the child has to go on.
- **The picture is the body moving in the shape of its call.** A hide, or a creature in the open, moves while it calls, and only then: higher off the ground for a higher voice, for as long as the call lasts, with a shiver for a warble, two hops for two notes, and a tip up or down for a glide. So each property of the sound is seen at the moment it is heard, on the thing that makes it.
- **Loudness belongs to where the maker is, never to who it is.** The same voice is softer inside a hide and louder in the open, at the same pitch. Pitch says who is calling, and loudness says whether they are still inside.

The working objects stay plain: every egg is the same plain egg and every leaf pile the same plain pile, on a plain ground of a contrasting hue, so that nothing but the call tells two hides apart. The look goes on the creatures, the hill and the scenes (pack: game-design, working-objects-stay-plain.md).

This is school practice without a trial behind it. The pack's own table for early reading lists, for listening and telling sounds apart, "which animal made that sound; find the same sound; loud and soft, high and low", as sound-only play that needs no letters, and cites no trial for that row (`compound-packs/game-design/research/learning-games-that-work.md`, section 4). That the body's movement helps a child hear the difference is the game's own assumption, with no trial claimed for it.

The band starts below 6, so the order of object, picture and symbol ends at the picture. Nothing stands for a sound but the moving body: no note, no wave, no bar, no icon. The last places of the designed order take the picture away again, so that a hide can be told by ear alone.

## The four mechanic questions

- **Swap.** No. The content is the sound: every hide looks the same, so with the voices taken out, or replaced by a picture, a number or a word, there is nothing left to tell one hide from another and no game.
- **Attention.** At the moment of decision the child has just heard two calls one after the other, the asker's and a hidden one's, and has to think about whether they are the same: as high, as long, steady or warbling, one note or two, up or down. Where to tap and when to tap do not matter. While a hide still moves in the shape of its call the child may go by the eye as well; what they look at is then the same properties of the same sound, and from the place `leaf-piles` on there is nothing to look at.
- **Fun.** The best moment of play is the burst, when someone comes out. The skill is used to choose which hide to burst, and the burst is what answers it, so play never stops for the skill.
- **Guess.** Yes, by trying every option, and the age asks for that: every hide opens on its second tap, so a child who opens them all lets everyone out, and with two eggs a blind first choice is right half the time. A two-year-old is never stuck (pack: game-design, ages-2-to-4.md). What blind opening does not give is the right one first. A cycle counts as gone well only when no wrong hide was opened, so a child who opens blindly stays in the first two places, where the voices differ grossly, and only listening moves the game on to near voices and to hides told by ear alone.

## The error as a consequence

A wrong attempt is opening a hide whose kind is not the kind that asks (or, in the place `who-is-inside`, sending a grown one to an egg that is not its own).

- **What it does.** The one inside comes out anyway, with its own entrance. It calls at the asker in the open, and the asker calls back. The two calls are heard one after the other at full loudness, and the two bodies move in two different shapes side by side: one pops up high and is done, the other leans low for a long while. Then each reacts to the other's voice by its fixed taste, delighted or startled, and puzzled when the two voices are near.
- **Where and why it shows.** At the calling stone, where the two stand next to each other. The why is the difference between the two calls, heard and seen at once.
- **The state stays.** The one let out walks up the hill and stays there, and calls when it is tapped. The other hides are as they were, the asker turns back to them and holds out its wings again, and nothing is lost: when the grown one of that kind comes to ask, it finds its little one on the hill at once. The child changes one thing, which hide to try, and tries again.
- **In `who-is-inside`.** The grown one knocks, the egg answers in its own voice and stays shut, the grown one reacts to that voice by its taste and steps back to its place.

Nothing gives a verdict. There is no buzzer, no cross, no sad face turned to the child, and no cheer when a hide is right: the right hide is answered by the two voices sounding as one (pack: game-design, errors-show-as-consequences.md). The meeting that does not match is as much worth seeing as the one that does.

## The designed order, and what is stored

**A cycle is one clutch.** A clutch of hides comes into the row, each holding one kind. The ones who ask come one at a time, and each finds its own. When the row is empty the cycle is over. A clutch of two or three takes one to three minutes.

**Hearing and choosing are two separate taps.** The first tap on a hide lets the child hear it, and the asker answers so that the two calls come one after the other. The second tap on that hide opens it. A tap on the asker makes it call again, and everyone still hidden answers in turn, so anything can be heard again without opening it.

**The places, in order.** Each adds one new thing, or combines two that are known. The ids are the ones in `LADDER` in `config.ts`.

| Place id | What comes in | New |
| --- | --- | --- |
| `two-eggs` | A grown one asks. Two eggs, of two families. | The game itself: hear, then open. |
| `three-eggs` | Three eggs, one of each family. | One more voice to tell apart. |
| `near-voice` | Three eggs: both kinds of one family and one of another. | Two voices that differ in one thing only. |
| `leaf-piles` | Three leaf piles, one of each family. A pile rustles the same way whoever calls from it. | By ear alone. |
| `near-in-leaves` | Three leaf piles: both kinds of one family and one of another. | The two before, together. |
| `who-is-inside` | The question the other way round. Three grown ones stand in the row, and three eggs come to the stone one at a time: both kinds of one family and one of another. The child sends the grown one whose voice it is. | The asker is the hidden one. |
| `two-alike` | Four eggs and nobody asking: two kinds of two families, two of each. The first one the child lets out asks for the other that sounds like it. | Two hidden ones that sound alike. |

**How a cycle is judged.** By the number of wrong attempts in it: none is a cycle gone well, one is mixed, two or more is gone badly. The place moves one step up after a cycle gone well, one step down after one gone badly, and stays after a mixed one, between cycles only. A child who opens hides blindly in a clutch of three has no wrong attempt one time in six and two wrong attempts one time in three, so blind play drifts to the first two places. A visit put away with no finished cycle leaves the place where it was. Nothing on screen shows the place or that it moved.

**The harder option the child can pick.** A basket stands by the row with one more egg in it, of a kind that is not in the clutch. A tap on the basket tips that egg into the row, and its grown one joins those who will come to ask. A fuller row is harder and looks it. The child may do this in any cycle that has room (fewer than four in the row), or never. An egg left in the basket stays there, and is in the basket still when the next clutch comes.

**Which clutch a new place lays out.** The very next one. While a cycle runs, the one who waits at the edge belongs to that same cycle. Nobody from the next clutch is on screen until the cycle has been judged: the next clutch is laid out at that moment, from the place as it then stands, and its first comer appears at the edge during the ending.

**Where a first visit starts.** `two-eggs` for a child of 2 or 3, for a younger child and for no age; `three-eggs` from 4 up. A saved place wins over the age.

**Every field of the saved state** (plain JSON, version 1, read field by field, each repaired by itself):

| Field | Holds |
| --- | --- |
| `v` | The version of the shape. |
| `position` | The place the next clutch is laid out from: an id of the ladder. |
| `finished` | The clutch on screen is finished. Its ending stays, and the next one waits at the edge. |
| `rng` | The state of the seeded stream that lays out clutches, so the same save always gives the same next clutch. |
| `shown` | Which of the three ways of asking (`seek`, `who`, `alike`) a character has already shown once. |
| `hill` | Who stands on the hill, oldest first, at most four: for each a kind and whether it is a family, twins, or one alone. |
| `extra` | The kind inside the egg in the basket, or nothing when that egg has been tipped into the row. |
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

Every kind has the same one want, always visible: whoever asks stands at the stone with both wings held out towards the hides, empty, and with one ear turned to them. It wants the one that sounds like it. The want is about the hides and never about the child.

Each kind hears three sorts of voice besides its own, and its reaction to each never changes, so a child can learn it and bring it about on purpose:

| Kind | Its own voice | Its near voice | The family it loves | The family it shies from |
| --- | --- | --- | --- | --- |
| `pip` | sings in step | puzzled by `tok` | the low ones: it bounces on the long note | the gliders: every hair stands up |
| `tok` | sings in step | puzzled by `pip` | the gliders: it pecks along, up or down | the low ones: it falls over backwards |
| `hoom` | sings in step | puzzled by `brrl` | the high ones: its belly shakes with giggles | the gliders: its eyes go round and round after the glide |
| `brrl` | sings in step | puzzled by `hoom` | the gliders: its neck sways along | the high ones: its neck shrinks into its shoulders |
| `wheep` | sings in step | puzzled by `dooo` | the low ones: it stretches up tall | the high ones: it ducks |
| `dooo` | sings in step | puzzled by `wheep` | the high ones: its ears stand up | the low ones: it melts flat on the ground |

- The two kinds of one family have opposite tastes, which is one more way to tell them apart.
- Puzzled is a slow double take: almost, but not the same. It is what a near voice always gets.
- Startled is surprise and never hurt, and it passes within the scene. A dislike is as good to watch as a like.
- A reaction is to the exact voice that was just heard. No feeling is ever about the child: nobody thanks, praises or is disappointed, and the one who waits at the edge never calls for attention or shows that it has waited (pack: game-design, characters-with-opinions.md).

These reactions are the game's only feedback. The rule is in `tastes.ts`.

## The scenes

Each scene is a list of timed beats filled in from the state of play, and each gives way to any touch: the touch is answered as it would be at any other time, and the scene jumps to its end state, which was saved when the scene began.

- **The showing** (about 8 seconds). Cause: the first clutch of a way of asking the child has not met (`seek`, `who`, `alike`) comes in on the child's touch. A grown one sets down a single egg, calls, hears it answer alike and softer, taps it once so that it wakes and calls, calls again itself, taps it a second time so that it bursts, and the two sing in step and go up the hill. In `who-is-inside` the grown one walks over and knocks; in `two-alike` a little one that has just come out does the tapping. Filled in from the kind of the one who shows. It is shown once for each way of asking, marked in `shown`, and never plays again unasked.
- **The reunion** (5 to 6 seconds). Cause: the child opens the hide of the kind that asks. Beats: out with its own entrance, its call in the open, the asker's call, both in step with both bodies in the same shape, the little one climbs on, the two go up the hill. Filled in from the kind, the spot of the hide, and who already stands on the hill and turns to listen.
- **The meeting that does not match** (3 to 4 seconds). Cause: the child opens another hide. Beats: out with its own entrance, its call, the asker's call, each one's reaction by its taste, the walk up the hill. Filled in from the two kinds, so there are thirty different meetings.
- **The choir** (6 to 9 seconds), the ending. Cause: the last hide of the clutch is done. Everyone who came out of this clutch calls once, in the order the child found them, and then all call together. It stars exactly what the child let out, in the child's order.
- **The round**, a secret. Cause: both kinds of one family stand on the hill and the child taps one straight after the other. They sing a short round. It works every time, is never hinted at, and is never counted (pack: game-design, hidden-never-counted.md).

No scene plays before the action that causes it, none plays only sometimes for the same action, and none is a fixed film.

**How a cycle ends and the next one starts.** The cycle ends with the choir, and the finished scene stays as long as the child likes: everyone on the hill, each still calling when tapped. During the choir the first comer of the next clutch appears at the edge with its basket and waits there. It rocks on its feet, looks at the row, and does nothing else: it does not call out, hurry, or show that time has passed. If the child does nothing, nothing starts. A tap on it brings it in: the hides tumble out of the basket into the row, and it steps to the stone and calls. Inside a cycle the same holds for each one who asks: the next waits at the edge and comes in on a tap. On load no scene plays again: the world is as it was left, with the same one waiting (pack: game-design, endings-and-short-scenes.md; "How a cycle restarts" in the guide).

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
