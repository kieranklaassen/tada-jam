<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it. By day the child makes something happen in a farmyard: one thing on the first days, up to three later. After the owner's first report from a child of 4, that the loops of the games before this one were hard to understand, the first days were cut to one happening and one picture, Grandpa tells without being asked, whoever it really happened to protests, and what to touch next glows as soon as a scene ends; the passages below say what is built. In the evening Grandpa, who slept through it, tells the day with puppets and gets it wrong. The child leaves it or changes it, puts out the lamp, and what was told is what happened.

## The band and its age rule

Ages 4 to 7, so the youngest is 4: the 3 to 4 row of the cue table, with the pack's rule for ages 4 to 6. No text, numeral or sign; nothing has to be decoded to get on; one next act offered at a time; tap and drag only, no double tap. A place in a story is a picture of the very puppet and the very thing. `ctx.childAge` sets only where a first visit starts in the order of tellings: 5 and younger at `who`, 6 and older at `order`; `null` gives `who`. A saved position wins.

## The toy

Let a thing go on someone in the yard. When the finger lands the thing squashes and sounds, and everyone's eyes go to it; it swings under the finger; whoever it hangs over leans away or leans in; let go, it does its worst (mud drops and slaps, jam creeps down a nose, a pillow bursts) and the one it happened to takes it in their own way. A tap on a thing throws it at whoever stands nearest the front. With no goal it is good to do to all of them. In the evening the same toy is in the story: one tap on a puppet or on a thing in a picture changes it to the next one, and the little picture does it at once. A puppet goes goose, pig, grandmother, Grandpa, moon and round again; a thing goes mud, water, jam, pillow, underpants, balloon and round again. All of them are there from the first evening, whatever the position. The little picture does only its own happening, on a puppet with nothing on it. A day holds one happening at first and never more than three, so a whole visit is short and the next morning is one touch away; what is let go on nothing, on Grandpa or on the cock is as good and uses up none of them, and in the evening the toy has no end: a picture can be changed as often as she likes.

## The object-by-action grid, and what is new on day 15

Rows are whom it happens to, columns are what. Each thing is an instrument and each one's answer is their own voice and their own move, so no two cells look or sound alike.

| | mud | water | jam | pillow | underpants | balloon |
| --- | --- | --- | --- | --- | --- | --- |
| goose | slap; freezes, one long honk of horror | splash; shakes from the neck down, rattling honk | glug; neck goes stiff, beak stuck, muffled honk | whump; puffs to a ball, startled bok | fwip; takes it for a crown, stately honk | squeak; neck hangs down, paddles, thin honk |
| pig | slap; wriggles, happy squeal | splash; hides behind its ears, offended oink | glug; licks itself round and round, smacking | whump; sneezes itself backwards | fwip; runs on the spot, giggling oinks | squeak; spins like a top, delighted squeal |
| grandmother | slap; does not move, one dry tut | splash; wrings out her bun, gargle | glug; tastes a finger, long mm | whump; spits out a feather, pfft | fwip; folds her arms tighter, hmph | squeak; kicks up her heels, whoop |
| Grandpa (only in a telling) | slap; moustache drips, blub | splash; moustache goes straight down, brrr | glug; moustache stuck to the chin, mmf | whump; clucks | fwip; salutes blind, ho | squeak; chair and all goes up, oho-ho |
| the moon (only in a telling) | slap; winks the mud off one eye, low bell | splash; shivers, wet bell | glug; licks its lips, humming bell | whump; a cloud of itself, soft bell | fwip; blushes, two bells | squeak; bobs up, high bell |

What things leave behind combines in an order. Each of the five has one coat at most (none, mud, jam or feathers), underpants or not, a balloon or not. Mud: the coat is mud, whatever it was, and a balloon bursts. Jam: the coat is jam, whatever it was. Pillow: a coat of jam becomes feathers; any other coat, feathers included, stays as it is. Water: no coat and no underpants; a balloon stays. Underpants: underpants on. Balloon: balloon on. What is not named stays, and a thing done twice leaves what it left the first time. The answer in the grid plays every time, whether or not anything changes. So jam and then the pillow is a feathered pig, and the pillow and then jam is a sticky one. Things let go on sleeping Grandpa by day are snored back to their places; let go on nothing, they splat and hop home; let go on the cock on the roof, he ducks.

On day 15 the child tells on purpose a day that never happened, in the order that makes it work: the moon jammed and feathered, Grandpa floated in his underpants over a yard where nothing happened to the pig.

## The representation

A story is one, two or three pictures side by side in the order it is told, each with who and what in it, and the sky of its place says when: pink in the first place, blue in the second, violet in the third, the same skies the yard had at its first, second and third happening. The sky belongs to the place: when two pictures change places, who and what go across and the skies stay. It is a row of scenes as in a school's picture sequence; that is school practice and no trial of it is claimed. The order ends at the picture: no symbol follows in this band. The puppets and things in the pictures are plain: nothing moves in them but what the story tells. From dusk until the lamp, those of the yard stay in view as the day left them, so what they wear can be held against the pictures; the order and what water took off have to be remembered.

## The four mechanic questions

- **Swap.** No: what is told is made of what happened in the yard, and telling it makes it so.
- **Attention.** Who it was, what it was, and which came first, held against what she saw and what the yard still wears, whether she means to put it right or to make it wrong on purpose. A child who puts the lamp out without looking need attend to nothing; what she then sees happen is what tells her.
- **Fun.** The moment of changing a picture is the moment of the joke: the new one does it at once, and the lamp makes it true.
- **Guess.** Nothing can be won by guessing: any telling is carried out. In the first three positions and at `moon` whoever it really happened to protests while a picture has it wrong and stops when it has it right, so by tapping through a child can find the true one: that is the help a first story needs. At `order` and `any` nobody protests and nothing marks the true one, so stopping there takes knowing; what the lamp shows comes only after.

## The error as a consequence

There is no wrong telling. When the lamp is out the yard goes back to its morning and the story happens to it, as it now stands, picture by picture. A picture is true when its who and its what are both those of the happening in the same place of the day. Where it is not true, whether it never happened or happened at another time, the one it happens to is astonished, everyone stares at Grandpa and his moustache curls. Where it is true and he had that place wrong when he first told it, he remembers: he claps a hand to his head and his moustache jumps. Where it stood right all along they just live through it again. Keeping the lie, making a better one and putting it right are three jokes of the same size. The state stays, and tomorrow begins from it.

## The designed order, and what is stored

The positions, as in `config.ts`, are the ways he gets it wrong, one new thing at a time:

1. `who`: one picture; it happens to somebody else of the yard.
2. `what`: one picture; another thing does it.
3. `himself`: two pictures; in one it was Grandpa.
4. `order`: three pictures; two have changed places, and nobody protests.
5. `moon`: three pictures; in one it was the moon.
6. `any`: three pictures, and nobody protests; each evening one of the five, by the visit's own stream.

A telling always differs from the day in what it shows: `order` swaps two pictures that differ, and where all three are the same it is `who`. Only in `order` are two pictures wrong, at `any` too; otherwise exactly one is. A lamp put out on a story that differs in any picture from the one he first told is a cycle that went well, true or not, and the position moves one step up; one put out on his story just as he told it is mixed and the position stays; nothing goes badly and it never moves down. From `any` it moves no further. His telling is laid out from the day and the position at the day's last happening, so the new position is first used on the next day, and one that waits at dusk was laid out before. A harder story is the child's own: the more she does to the same one, the more there is to hold.

Stored: `v`; `position`; `finished` (the lamp is out); `phase` (`day`, `dusk`, `told`); `base` (for each of the five: coat, underpants, balloon, as they were that morning); `day` (up to three happenings of who and what); `told` (as many as the day had, from dusk on); `first` (his telling as laid out at dusk; a place he had wrong is one where `first` and `day` differ, and changing pictures never changes it); `asks` (who stands nearest the front by day). How the yard looks is never stored twice: while `finished` is false it is `base` with `day` done to it in order, and once `finished` is true it is `base` with `told` done to it in order. `base` changes only in the morning scene. A thing in the hand is saved at its place. Splashes, drips and loose feathers are short-lived and gone on load. Nobody is asked to come back and nothing changes while the game is closed.

## The characters and their fixed tastes

- **The goose** wants to be looked at. Hates mud, water and leaving the ground; adores the underpants, which she takes for a crown. All neck. Slow and stately till she is not.
- **The pig** wants to be in it, whatever it is. Loves mud, jam and the balloon; hates water. All wobble. Quick.
- **The grandmother** wants to keep a straight face, and mostly does. Detests mud and underpants; has a secret weakness for jam and for flying. Small, square, and moves one thing at a time.
- **Grandpa** wants to tell it. He is enormous, asleep by day with one eye that opens at a splash, and quite sure of himself. All moustache.
- **The moon** wants to stay out of it. Likes being floated higher, hates mud in the eye.
- **The cock** on the roof wants to crow. Likes an open sky, hates anything that flies at him. Nothing is ever told of him.

Nobody's feeling is about the child, and the one it happens to is never hurt.

Wants that are always on show: the goose stands with her neck at full height to be seen; the pig leans at the things; the grandmother has her arms folded and her mouth pressed flat; Grandpa asleep has a puppet on his hand that mutters along with his snore; the cock has his chest full of air; in the evening the moon looks away. By day one of the yard (`asks`) does this nearest the front, faces the child and glances along the things; the next of the three takes its place after every happening. At dusk Grandpa, awake, holds up an empty puppet hand. When he has told, he holds his puppet hand open toward the three pictures, looks from them to the child and scratches his head, whatever he told; once any picture has been touched he also looks at the lamp and licks two fingers. The lamp works from the start. The idle ladder here: the puppets and things in the pictures glow together, then a ghost hand taps one of them (the puppet in the second place, or the only one, never chosen by which is wrong) without changing it; once a picture has been touched the lamp alone glows. A scene that ends has used up 1 s of the ladder's wait (glow at 1.5 s, hand at 3.5 s), so what to touch next glows almost at once. Whoever is wronged (under "The four mechanic questions") protests as soon as the picture has shown it, with their voice once and then every 4.5 s without: the goose stretches and shakes, the pig jumps, the grandmother shakes her head; a bubble over them shows the thing it really was, and whoever is falsely told of looks down at a clean front and shakes their head. The glow goes along the pieces one at a time. By day whoever asks thinks of one thing it would like, in a bubble, and only that thing glows; any other is as good. On a first visit, before any touch, the ghost hand plays one whole day for real with the game's own fingers (`opening.ts`): gives what is asked for, changes a picture, touches the lamp and then the cock. Any touch ends it, it plays once, and nothing it did is saved until a touch. At night the cock holds his breath, cheeks full.

## The scenes

- **A happening** (1.7 s). Cause: a thing let go on someone. The thing tips, the coat lands, their own answer. The others look. Saved when the thing lands: `day` and `asks`; with the day's last, also what dusk saves. A touch on anything is answered meanwhile. After the first the sky goes from pink to blue, after the second from blue to violet; the day's last is followed by dusk.
- **Dusk** (2 s). Cause: the day's last happening. The sky goes deep blue, the moon comes up, a cloth rolls over the things, Grandpa opens both eyes. Saved with the last happening: `phase` is `dusk`, `told` and `first`. Any touch ends it, and he begins.
- **The telling** (3 to 8 s). Cause: the end of dusk; where the game was closed at dusk and opened again, a touch on Grandpa or on the cloth. The pictures come up one at a time, each does what it tells, his arm works the puppet and his voice rises and falls. Saved when it starts: `phase` is `told`. A touch brings up the next picture. A touch on him tells them again as they stand.
- **Changing it.** A tap on a puppet or thing changes it and the picture does it; a picture dragged onto another changes places with it. Saved at once: `told`. He peers at it and hm-hms, whichever it is.
- **The lamp** (6 to 11 s). Cause: a touch on the lamp. Grandpa's fingers reach the wick and it is dark; his puppet pulls the yard undone to its morning row by row; each picture leaves the band and flies to whoever it is of; the pictures happen in it at full size with the reactions under "The error as a consequence"; then night, all asleep as they are, snoring by what they are in (feathers cluck, mud bubbles, jam smacks, a floating one whistles). Saved when it starts: `finished` and the next `position`; `base`, `day`, `told` and `first` stay as they are. A touch moves it on to its next beat. Nothing replays on load.
- **Morning** (2 s). Cause: a touch on the cock or anywhere on the night sky. He crows, the sun comes up pink, Grandpa, if he told himself into something, opens his eyes, finds it and drops off again, the cloth rolls off the things. Saved when it starts: `base` becomes `base` with `told` done to it, `day`, `told` and `first` are emptied, `phase` is `day`, `finished` is false, `asks` goes to the next of the yard. Any touch ends it. A night stays as long as the child likes. The jam is still on.
- **Any other touch.** At dusk, in the telling and at night there is an answer to every touch: one of the yard gives its own voice and a look, the moon its bell, the cloth a lump that bumps from under it, a sleeper at night turns over and snores on another note. None of these is a happening and none is saved.

## The records

### us-ca

Level: preschool-tk, the Later sub-band (4 to 5½). The lookup returns it for age 4 beside the Early sub-band and for age 5 beside kindergarten; age mapping official at both. The cross-grade lane returned beside age 5 is not used. Gap: none printed for ages 4 and 5. No record is named for ages 6 and 7.

- `edu.us-ca.preschool-tk.reading-language.objective.language-and-literacy-development-foundational-language-development-strand-3-0-reading-3-2` (3.2): department-published foundation, confirmed. Taken in part: the pack's Summary of the later age names who is in the story, what happens, and in what order; saying what may happen next is not taken. Limits taken: the child is not asked to read; details include characters, events and their order. Up to three events: the game's own choice, not in Limits. The order is asked for from the position `order` on.
- Listening and speaking 1.6 (`...strand-1-0-listening-and-speaking-1-6`) was read and is not claimed: it asks for a story in the child's words and the game hears none.

### nl

Level: fase-1 (sub-band groep 1 at age 4, groep 1 or groep 2 at age 5). Age mapping: convention. The lane einde-po, labelled end-of-primary goals, is returned beside it and not used.

- `edu.nl.fase-1.reading-language.objective.inhoudskaart-nederlandse-taal-fase-1-lezen-orientatie-op-verhaal-en-tekst-8` (Oriëntatie op verhaal en tekst / 8): guidance of the curriculum institute, confirmed. Taken in part: a story acted over with puppets, where the child changes what they act and the game moves them. Retelling in words is not taken. The story is one she saw and was told by gesture, where the record names one read aloud. Limits taken: acting out or retelling, either one; no length is set.
- `edu.nl.fase-1.reading-language.objective.inhoudskaart-nederlandse-taal-fase-1-lezen-orientatie-op-verhaal-en-tekst-9` (the same / 9): the same standing, confirmed. Taken in part: who, what and when. Where is not taken: it all happens in one yard. Limits taken: four components are named, and the game uses three. Pictures in place of pictograms: the game's own choice.
- `edu.nl.fase-1.mathematics.objective.inhoudskaart-rekenen-wiskunde-fase-1-meten-meetkunde-meten-tijd-4` (Tijd / 4): the same standing, confirmed. Taken whole: putting what happened in the order it happened. Limits taken: no number of events is set. Three, of one day, is the game's own choice, and the game comes to it at `order`.

### Where the two differ

California's record is about a grasp of a story; the Dutch ones name acting it out and, in mathematics, ordering in time. The play is the same either way and no position is tied to the difference.

### The claim

Grandpa Tells It Wrong is designed from a part of a California preschool and transitional kindergarten foundation (reading 3.2, later age: characters, events and their order) and from Dutch curriculum-institute guidance for fase 1 (a part of acting over a story, here one told by gesture and not read aloud; three of the four components of a story; and putting what happened in the order it happened). All four are confirmed. None of it is about what a child has reached, and no prediction and no spoken word is asked for or heard.

## The look

Woven tapestry. The whole picture is drawn small, one pixel to a bead of weft (4 by 3 stage units), and woven by `loom.ts` every frame: each bead is one of eight dyes in four shades (indigo, sage, madder, rose, ochre, walnut, cream, violet); where a tone lies between two shades the rows take turns, so shading is the comb of hachures a tapestry has; a lone bead of another dye joins its neighbour; where two dyes meet along a warp there is a slit. The cloth is shown without smoothing under one sheet of ribs, weft seams and bands from one vat of yarn and the next. Nothing is a gradient, a line or an outline once it is woven.

- **Composition.** A madder border of ochre and cream flowers all round; a yard of three on the left two thirds, Grandpa in a green chair under his own roof on the right third; a dark band along the bottom, for the things by day and the pictures in the evening. On another shape of screen the cloth goes on in plain warp stripes.
- **Skies.** Pink, blue and violet by day, deep indigo at night. A new sky is woven up from the ground with a shuttle on its edge. The lamp unravels the yard row by row with loose wefts in the gap.
- **Figures.** Large flat masses, one family of dye each: white goose, rose pig, blue grandmother, madder and cream Grandpa, ochre moon. Eyes are cream rounds with a walnut pupil and are the only small thing kept sharp. A glove puppet in a picture is the same figure cut to head and shoulders.
- **Coats.** Mud and jam are a pour with fingers of drip, clipped to the figure; feathers are tufts round its edge; underpants are two striped ears.
- **Light.** None but the lamp: two flat rounds of ochre on the wall behind it.
- **Tiers.** Pixel ratio 2, 1.5, 1.25, 1; at the last one the ribs go and the cloth is woven every second frame. The weaving itself costs the same at every tier, as it is done at the size of the beads.
