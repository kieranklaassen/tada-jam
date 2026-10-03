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
