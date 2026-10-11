<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

Goodnight, Teddy is one room at the end of the day. A bear sits in the middle of it, grubby from the garden, with the bath on one side and the bed on the other. The child rubs things onto him and onto everything else, and puts out the day themself. The verb is one act: **rub a thing onto someone**.

- **Band.** The manifest band is 2 to 5. Its youngest age, 2, governs the design.
- **Cue-table row.** The age-band cue table of `docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md` has no row below 3. Its row for 3 to 4 is taken as the ceiling and cut further. Its "Avoid" column is a hard constraint: no text, numeral or pictorial icon to decode, no spoken instruction, no verdict, never several activities live at once, and no tool present before it means anything. So there is one room and one bear, the six things in reach are real things drawn as themselves at the place they belong (the soap on the tub's rim, the towel on its rail), and each of them does something to the bear from the first touch.
- **The pack's rule for the age** (pack: game-design, ages-2-to-4.md; for the older children of the band, pack: game-design, ages-4-to-6.md). Everything essential works with a tap: a tap on a thing sends it to Teddy, where it does its work once by itself. A drag carries the thing under the finger, survives a lifted finger, and counts wherever it has been: foam stays where the soap has passed. No pinch, tilt, shake, hold or double tap. The six things are each about 100 logical pixels across or more and stand at least 140 apart, none of them in the bottom strip, none under the jam's home control at the top centre and none in the grown-up's corner at the top right. The curtain and the door, which the child touches to start the morning and the evening, and the duck and the cat are as large or larger, and no part of them that a child must touch lies in the bottom strip, under the home control (a round of 48 logical pixels at the top centre, 10 from the top) or in the grown-up's corner. The one action is one a toddler already loves: covering, rubbing and wiping. An evening fits in one to three minutes and can be as short as two taps. Nothing is counted, and nothing a child uses comes in more than five: there are five carried things and five who answer them. The lanterns on their strings and the stripes of the pyjamas are scenery and pattern, uneven and more than five. For the older children the room is pretend play with characters who react, and mischief done to the duck, the cat and the lamp works.
- **The symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, optional or not, and the game has no `symbols.ts`. A sleeping character is shown by its body and its breath, never by a sign over its head. Shut eyes are drawn as curves, never as level bars.
- **Nothing frightening.** The dark room is the same room with the lamp down: the lamp keeps an ember, and once Teddy sleeps a night-light glows and the stars show; every character is still there and breathing. Nobody cries. The jug makes Teddy squirm and never hurts or upsets him: it is the brr of cold water on a ticklish bear. His mouth is a wobbly grin and never turns down, he stays under the spout and never pulls away, shields his head, whimpers or turns his face to the child, and the shake that follows leaves him as content as he was.
- **What `ctx.childAge` sets.** Only how muddy Teddy is on the very first evening: at 3 and younger he is muddy in two large places (his belly and one foot), at 4 and older in four (the same two, one ear and one arm). It gates nothing: every later evening's mud is drawn from the game's own stream for a child of any age, and whatever is saved wins over the age.
- **What `null` gives.** The youngest default: two large muddy places.

## The toy

**The action.** The finger rubs a thing onto Teddy. That is the action performed most, and the toy is the three wash things on the bear: the soap, the jug and the towel.

**In an empty scene.** Teddy sits in the middle of the room, large, muddy and dry. The soap lies on the rim of the tub, the jug stands on its shelf and the towel hangs on its rail. Nothing is asked.

- **When the finger lands on a thing**, in the same frame: the thing jumps into the hand with a stretch and its own voice (a slippery squeak for the soap, a hollow knock for the jug, a soft flap for the towel), Teddy's eyes go to it, and the duck and the cat turn to look.
- **A tap** (finger up where it came down) sends the thing to Teddy in one arc. It works on him once by itself and goes home, and one tap is a whole job: the soap scrubs foam over his muddiest bare place, the jug crosses over him from one side to the other and one sheet of water runs down all of him, the towel rubs dry the wettest of three parts of him (his head, his middle, his seat and feet), or his head when nothing is wet.
- **A drag** carries the thing under the finger. Wherever the soap passes over Teddy, foam grows under it and stays. The jug tips for as long as it is carried and its water falls straight down from the spout: where it runs over him, foam slides off and takes the mud it covered, and the fur is left dark and slick. Wherever the towel passes over wet fur, the fur turns pale and stands up in fluff. A lifted finger loses nothing: the thing waits in the air for a moment and then goes home by itself, and what it did stays done.
- **The answer is bigger than the touch.** The soap blows a bubble on his nose that swells as the soap comes near and bursts in a sneeze that throws flecks of foam across the room. The jug makes him squirm for as long as it pours; when it stops he shakes himself, drops fly as far as the bed, and the cat jumps. The towel makes him lean into the hand with his eyes shut, hum, and thump one foot, and each patch of fur that comes up fluffy does so with a puff.
- **Sound.** Each thing has a voice for landing in the hand, a voice for each stroke whose pitch follows the speed of the finger, and a voice for going home. Teddy has an invented voice with no words: a giggle that rises for the soap, a wobbling shudder that falls for the jug, a hum that climbs for the towel. When the child stops, the room falls back to breathing and near silence.
- **The finger alone** is also an answer: a touch on Teddy is a tickle and he giggles and wobbles; a touch on the duck squashes it flat and it squeaks; a touch on the cat is a stroke and it arches; a touch on the lamp turns it down or up; a touch anywhere else lifts a puff of pastel dust off the paper with a soft thud. A touch in the top right corner is the grown-up's and gets no answer.

**Why it is a pleasure with no goal.** It is finger painting on a friend who reacts, in three paints that undo each other: white foam over brown mud, dark water over white foam, pale fluff over dark water. Every stroke leaves a mark exactly where the finger went, the bear answers each of the three in his own way every time, nothing can be done wrongly, and a bear who is clean can be made foamy again for the pleasure of it. A person watching sees within three seconds what the child is doing: washing a teddy bear.

## The object-by-action grid, and what is new on day 15

Six things in reach: the soap, the jug, the towel, the pyjamas, the blanket, and the lamp, which is not carried and is worked by the child's bare hand. So the six rows are the five carried things and the hand. The five columns are who or what a thing is used on: Teddy, the rubber duck in the bath, the cat on the bed, the lamp, and the bath water. One use in each row is the plain one. Every other use works, every time, and is as funny. The five carried things have no face, no pattern but the pyjamas' stripes, and no motion until a finger lands on them; the life is in Teddy, the duck, the cat and the room.

| | on **Teddy** | on **the duck** | on **the cat** | on **the lamp** | in **the bath** |
| --- | --- | --- | --- | --- | --- |
| **Soap** | Foam grows where the finger goes and hides the mud under it; his eyes cross at it; a bubble swells on his nose and bursts in a sneeze that flings foam. A slippery squeak that follows the finger's speed, a pop, a sneeze. | A wig of foam piles up on its head until it slides over its eyes, and it blows a bubble out of its beak at each rub. Rubbery double squeaks, a wet blurp. | A stripe of foam stands up along its back; it freezes, licks it, pulls a sour face with its tongue out and shakes one paw. A fizz, a puzzled chirrup, a spit. | Foam sits on the shade and the light comes through the bubbles as pale spots that drift across the wall. A glassy squeak, a tinkle of small bubbles. | Suds rise in the bath until a hill of them stands over the rim and the duck sinks in to its eyes. A deep glop, a crackle of suds. |
| **Jug** | Water falls from the spout; foam slides down and off with the mud it covered, and the fur is left dark and slick; bare mud only darkens and runs a little. He squirms with his eyes squeezed shut for as long as it pours, then shakes and sprays the room. A pouring gurgle, a shudder that wobbles downward, a flapping shake. | The water drums on it, it spins under the stream and squirts a jet back up out of its beak. Its wig is rinsed off. A hollow patter, a squirt that whistles upward. | One pour and the cat is thin, spiky and dripping; it turns its back and looks over its shoulder. A splat, a hiss, a yowl that slides down. | The water hisses on the warm shade and a cloud of steam climbs the wall while the light flutters. Foam on the shade is washed off. A sizzle, a wavering hum. | It pours back into the bath as a waterfall: rings spread, the water rocks and the duck rides the wave; the suds go down a step. A gurgle that rises as it fills, a slosh. |
| **Towel** | Wet fur under it turns pale and stands up in fluff where the finger goes; he leans into it with his eyes shut, hums and thumps one foot. On foam it only smears; on mud it leaves the mud and takes a brown print that fades. Soft dry strokes, a hum that climbs, a thump. | Each stroke polishes it to a shine with a gleam that winks, until it shoots out from under the towel like a bar of soap and lands back in the bath. Squeaks that rise in pitch, a plop. | A wet cat is rubbed into a ball of fluff twice its size with only its eyes showing; a dry cat rolls over under it and pedals its hind legs. A crackle, a loud rattling purr. | The room goes dim and towel-coloured while it rubs; then the shade flares brighter for a moment with a pool of light that swells and fades. Foam on the shade is wiped off. A squeak on glass, a small ting. | It comes out soaked and heavy, sags, and drips a line of drops all the way home to its rail, where it is dry again by its next use. A wet slurp, slow plips. |
| **Pyjamas** | His arms go up and they go on over his head; his head is stuck for a beat and pops out, then his ears, one after the other. On wet fur dark patches spread through the cloth and he plucks at it. A cloth flump, a muffled grunt, two pops. | They drop over the duck like a tent, and the tent paddles round the bath with a beak out of the neck. A flump, a muffled squeak, paddling. | The cat is in them, stands stiff, and walks off on straight legs round the back of the bed, tail through one sleeve, and comes back to sit in them. A flump, an outraged warble, stiff tapping steps. | The lamp wears them, and its light throws their stripes across the wall and across Teddy. A flump, a soft glassy hum. | They puff up and float as a raft, and the duck climbs aboard and rides. A bloop of air, lapping. |
| **Blanket** | It wraps him to the chin and he sinks down into it. On wet fur a wet patch spreads through it, drops fall from the hem and he shivers. A heavy soft whump and a sigh; or drips and a chatter. | The duck is tucked in on the rim with its beak out. With the lamp down it falls asleep and snores in squeaks. A whump, a tiny squeak; squeaky snores. | A cat-shaped lump walks about under it, bumps the post at the foot of the bed, sits down, and two eyes shine in a fold. A whump, a muffled mew, a bump. | The lamp is a glowing tent, the room goes amber and dim, and Teddy makes ear shadows on the wall with his paws. A whump, a low warm hum. | It swells into a dome on the water with the duck sitting on top, then sinks with one great bubble. A boom of trapped air, a long blub. |
| **The hand** | A tickle: his belly wobbles and he giggles. A rub pops the foam bubbles under the finger one by one and ruffles fluffy fur, which springs back. A rising giggle, pops. | Squashed flat, it squeaks, springs back and bobs, and rings run across the water. A two-note squeak. | It arches up into the finger with its tail straight up; a touch on the tail gets a swat at the air. A rolling purr; a quick chirp. | It is turned down: the halo shrinks to a small glow, the room goes dark blue and every eye shines. Again, and it is up. A wooden tock, a hum that falls or rises. | A splash: drops fly, rings spread, the duck rocks. A splosh, plinks. |

Used anywhere else in the room (the wall, the floor, the door, the curtain, the bed), a carried thing still works as itself and leaves nothing behind: the soap rubs a streak of foam onto the paper that fades, the jug's water runs down and dries, the towel wipes a paler streak that fills in again, and the pyjamas or the blanket flutter back to where they came from.

A blanket or pyjamas resting on someone or in the bath is still a carried thing: a touch on it takes it into the hand and is never taken for a touch on whoever is beneath it. Whoever wears a cloth is reached where they show (Teddy's head above the blanket) or by taking the cloth off. The sunk blanket keeps one corner over the rim of the tub, large enough to touch, so it can always be fetched. A tap on a cloth sends it to Teddy, and a tap on a cloth he already wears sends it back to its own place. Only Teddy wears both: a cloth let go over anyone else who wears the other sends that one back to its place. A lamp under a cloth is not turned by a touch until the cloth is taken off. A wash thing whose work lies under a cloth Teddy wears sends the cloth back to its own place first, in the same tap or stroke; where its work shows, nothing is taken off.

The same thing always does the same to the same one, so what a child finds stays true. Three of the cells are secrets that are never hinted at: the cat that walks off in the pyjamas, the duck that sleeps when it is tucked in and the lamp is down, and the striped light.

**Day 15.** The same evening done surely: soap, jug and towel in an order that works, the jug poured on purpose to make him shake and the cat jump, a bear who is fluffy all over because the child wanted him so, and one new mischief tried, such as tucking in the duck instead.

## The representation

The game has no learning goal, so there is no school idea to represent.

## The four mechanic questions

The game has no learning goal, so the four questions about a school skill do not apply.

## The error as a consequence

Nothing in the room can be done wrongly, and no use is refused. The one thing that can fail to happen is sleep, and the room shows why in the place where the reason is:

- **Wet under the blanket.** A wet patch spreads through the blanket over the wet fur, drops fall from its hem, and Teddy shivers with wide eyes. The wet is where the towel has not been.
- **Dry and tucked in, with the lamp up.** He squints at the lamp, pulls the blanket over his eyes and peeps out at it.
- **Dry in the dark, with no blanket.** He hugs his own arms, and his shining eyes go to the blanket, wherever it lies.
- **Water on bare mud.** The mud darkens and runs a little and stays, while beside it the place that was soaped comes clean.
- **The state stays.** The blanket stays on him, the lamp stays as it is and the fur keeps every mark. The child changes one thing: rubs the wet place (a towel brought to wet that lies under the blanket sends the blanket back to the bed first), turns the lamp, fetches the blanket.
- **Nothing gives a verdict.** No buzzer, no shake of a head, no face turned to the child in disappointment, and no cheer when he sleeps. Sleep is a consequence too: he is dry, warm and in the dark.
- **Each of the three shows by itself.** He yawns when he is dry, wider when he is also under the blanket, and widest when the lamp goes down, in whatever order the child gets there.

## The designed order, and what is stored

**A cycle** is one evening: Teddy comes in from the garden on the child's touch, is rubbed with whatever the child likes, and falls asleep when he is dry, under the blanket and the lamp is down.

**The order.** The game has no ladder of challenges. `LADDER` in `config.ts` has one place, `evening`, and the position never moves: every evening offers the same six things and the same room.

- **What a first visit starts with, by age.** `FIRST_MUD` in `config.ts`: at 3 and younger, or with no age, Teddy is muddy on his belly and one foot; at 4 and older, on his belly, one foot, one ear and one arm. He is dry, the lamp is up, the curtain is closed, the blanket is on the bed and the pyjamas are on their peg.
- **What play changes.** Only the room: the fur, where the blanket and the pyjamas are, the lamp, the curtain, and what the duck, the cat and the lamp wear. Each morning Teddy comes back muddy in two to four places drawn from the game's seeded stream, never the same set as the morning before. Nothing gets harder, nothing is unlocked, and nothing shows how many evenings there have been.
- **There are no records.** The game has no learning goal and is designed from no record of the education pack.

**What is stored.** One record of plain JSON under `ctx.storage`, saved on every change below and read by a `deserialize` that repairs each field by itself:

- `v`: the version, 1.
- `position`: always `evening`. An id the game does not know falls back to it.
- `finished`: true from the moment the falling-asleep scene starts until the child opens the door in the morning.
- `phase`: `evening`, `night` or `morning`. Evening is the play; night is Teddy asleep in bed; morning is the curtain open and Teddy waiting behind the door's glass. A record whose phase is night is read with the lamp down.
- `fur`: Teddy's coat as a coarse grid of 14 by 16 cells over his body, in four strings of 224 digits from 0 to 9: `mud`, `foam`, `wet` and `fluff`.
- `lamp`: `up` or `down`.
- `curtain`: `closed` or `open`.
- `blanket`: who has it: `bed`, `teddy`, `duck`, `cat`, `lamp` or `tub`.
- `pyjamas`: who has them: `peg`, `teddy`, `duck`, `cat`, `lamp` or `tub`.
- `duck`: what the duck wears: `plain`, `foam` or `shine`.
- `cat`: the cat's coat: `plain`, `foam`, `wet` or `fluff`.
- `shade`: the lamp's shade: `plain` or `foam`.
- `suds`: the suds in the bath, a whole number from 0 to 3.
- `mudPlaces`: the places that were muddy this morning, as a list of place ids, so that the next morning's differ.
- `stream`: where the seeded stream stands, as one whole number.

A thing in the hand is not in the record. The soap, the jug and the towel always go home, so they have no field. The blanket and the pyjamas are saved where they were picked up from until the finger lets go over Teddy, the duck, the cat, the lamp or the bath. What a thing leaves on the wall or the floor, flying foam, falling drops, steam and the towel's wetness are short-lived and gone on load. A largest record is under 2 KB.

## The characters and their fixed tastes

- **Teddy.** His want is always visible: muddy, he holds out the paw nearer the soap and looks at it; foamy, he looks at the jug with one eye shut; wet, he reaches for the towel; clean and dry, he yawns toward the bed. The wash things are asked for in the order that works: the soap while any mud is bare, then the jug while there is foam, then the towel while he is wet. He **loves the towel**: he leans into it, hums and thumps a foot, every time. He **squirms at the jug** as at a tickle: eyes squeezed shut, ears flat, a wobbly grin, a wriggle on the spot, and a shake afterwards that leaves him content, every time, and the water still does its work. Soap makes him cross his eyes and sneeze. He likes the pyjamas on dry fur and plucks at them on wet fur. He sleeps only when he is dry, under the blanket and the lamp is down.
- **The duck** floats in the bath and wants to be squeezed: it is seen from the side, facing Teddy, and bobs. It loves water (it squirts back) and soap (the wig), and it cannot be kept under a towel.
- **The cat** sits on the bed and wants to be left dry: it watches whatever is in the child's hand. It loves the hand and the towel, and it cannot stand the jug or the pyjamas. It is bewildered or offended and never hurt, and it always comes back to its place on the bed.
- **The lamp** is not alive and has no face. It answers as a lamp: its light changes.

No character's feeling is ever about the child, and none of them remarks on being left or waited on.

## The scenes

Four short scenes. Each is saved whole when it starts, and any touch takes it straight to its last pose; the touch is then an ordinary touch.

- **Falling asleep** (the ending, about 8 seconds). *Cause:* the touch that makes the last of the three true: dry, under the blanket, the lamp down. *Beats:* his widest yawn; he shuffles to the bed in the blanket; he flops in, the cat hops to the foot of the bed and the blanket settles; the cat pulls the curtain to with one paw if it is open; the night-light comes on and the stars show in the gap. *Filled in from:* what he is wearing, any mud still on him (it shows on the pillow), and who else is asleep. *Saved when it starts:* `finished` true, `phase` `night`, `curtain` `closed`, in the same save as the change that made the third true (`lamp`, `blanket`, or the last wet cell of `fur`). A tap's work is written to the record when the finger lifts, before its arc is drawn, and the scene starts at that touch; so a game put away while the thing is still in the air is found asleep and plays no ending on load.
- **Out to the garden** (about 7 seconds). *Cause:* a touch on the curtain while it is night. *Beats:* the curtain swings open and morning light falls across the bed; he stretches, slides out of bed and out of his pyjamas; the door swings and he is out; through its glass he jumps in a puddle, and comes back to the glass with mud in new places and his nose pressed flat. *Filled in from:* the new mud places. *Saved when it starts:* `phase` `morning`, `curtain` `open`, `fur` (the new mud, dry, no foam), `mudPlaces`, `stream`, `blanket` `bed`, `pyjamas` `peg`, `duck` `plain`, `cat` `plain`, `shade` `plain`, `suds` 0.
- **Coming in** (about 5 seconds). *Cause:* a touch on the door while it is morning. *Beats:* the door opens; he walks in and sits down in the middle with a bump; outside, the sun slides behind the hill and the sky goes from peach to violet; the lamp's halo grows. *Filled in from:* the mud he carries. *Saved when it starts:* `finished` false, `phase` `evening`, `lamp` `up`.
- **The cat walks off** (a secret, about 5 seconds). *Cause:* the pyjamas let go over the cat. *Beats:* it stands stiff; it walks off on straight legs behind the bed; it comes back round the other end; it sits down in them. At night, when the cat sits at the foot of the bed, it goes down behind the bed there and comes up again in the same place. *Saved when it starts:* `pyjamas` `cat`.

**How a cycle ends and the next one starts.** The evening ends when Teddy sleeps, and the dark room stays for as long as the child likes: the night-light glows, the stars turn slowly, and everyone breathes. Nothing else happens until the child pulls the curtain open. In the morning Teddy waits behind the door's glass, turned to the room with his nose and one paw flat on the glass, the muddy one if a paw came back muddy, so that the new mud shows, and comes in when the child touches the door. He never knocks, calls or hurries the child. While he sleeps the blanket and the pyjamas stay on him: a touch on him makes him sigh and sleep on, and a thing tapped while he sleeps or is outside goes back to where it was. The lamp stays down while he sleeps: a touch swings it and it answers, and it is not turned up. In the evening a touch on the curtain opens or closes it; in the morning it only sways. On load no scene replays: the room is in the state the last scene ended in.

## The records

The game has no learning goal, so it has no records part and claims no school skill.

## The look

**Soft pastel on night-blue paper**, the first look reserved for this game. The spike held on clarity, so the second reserved look was not tried. No frame rate is claimed: the machine this was built on cannot measure one, and the lead's probe measures it.

**What it is.** A sheet of dark blue paper with pastel rubbed into it. Nothing has an outline. A form is a cloud of colour, firm in the middle and smudged at its edge, with short rubbing marks laid one way across it and the paper's tooth showing through as dark specks. The dark of the room is the paper itself, left bare.

**The one hard edge.** Soft edges alone are weak shapes, so everything that answers a finger carries one thin bright edge on the side the lamp is on: Teddy's head, ears, arms and feet, the soap, the jug, the towel, the pyjamas, the blanket, the duck, the cat and the lamp's shade. Scenery never has one. That edge is how a child tells what can be touched from what is only there.

**Palette.** Paper `#141b3c`. The wall and floor stay within blue and violet, so that the warm things come forward: Teddy in honey, the duck and the blanket in butter yellow, the lamp in amber. The wash things are each one plain colour a child can name by pointing: pink soap, blue jug, green towel. Mud is a dark umber, foam a cream that is nearly white, a wet coat a darker and redder honey, a dried coat a paler honey with tufts. The curtain's wine red and the pyjamas' red stripes are the only reds.

**Materials.** One material, pastel, for everything. What differs is how firmly it is laid: Teddy and the characters firm, the walls thin enough for the paper to show, light and foam thinnest of all. Water is a lighter blue with bright dabs, never a gloss.

**Lighting.** One lamp at the right, and every form is lit from the upper right and shaded at the lower left. The lamp's halo is a wide warm cloud laid over the room. With the lamp down every painted piece sinks toward night blue by the same amount, the halo shrinks to an ember round the shade, and cool moonlight comes in at the window and the door's glass. Shapes do not change with the light. The light has four more states, each a tint of the same halo: towel green while the towel rubs the shade, amber under the blanket, the pyjamas' stripes thrown across the wall and across Teddy, and pale spots that drift while there is foam on the shade.

**The frame.** A place filled from edge to edge: tiles and a tap behind the bath, a towel rail, a shelf for the jug, a toy shelf with a rabbit, the door with dusk in its glass, a picture, the curtained window, a rail for the pyjamas, the bed, the lamp, garlands across the top, and blocks, a ball, slippers, a mat and a basket of wool on the floor. Teddy is the largest thing in it, about half the frame's height. The duck and the cat are in the frame from the first still.

**The three times of day.** They are the same room and the same pieces.

- *Evening:* the lamp up, dusk in the glass, the curtain closed.
- *Night:* every piece sunk toward the paper, a night-light low on the wall beside the door, stars of uneven sizes at uneven places in the glass and in the gap of the curtain, turning slowly, and Teddy lying in bed with the cat at its foot. Every open eye carries a larger spark.
- *Morning:* the curtain open, a slanting bar of pale light from the window across the bed, a peach sky with a sun and a green hill in the glass, the lamp out, and Teddy behind the door's glass with his nose and his muddiest paw flat on it.

**Teddy's coat.** Four marks, each stamped into a grid of 14 by 16 cells over his body and painted only when the coat or the light changes.

- *Mud* is umber with darker dabs.
- *Foam* is white and beaded: small round clouds with a blue shade under each.
- *Wet* is the coat itself, darker and redder, with a few bright streaks.
- *Fluff* is his own colour, paler, with tufts of uneven size standing off his outline at uneven gaps, about half of the places left bare.

Foam and fluff must never be mistaken for each other: foam is white on him, fluff is him. A shade lies on his body under each arm, so a bear who is one pale colour all over keeps his arms. His nose is drawn live over every mark.

**His face.** Five or six strokes, drawn live, which change by shape: brows; eyes that squeeze to curves, cross, or shut one at a time; and a mouth for content, bliss, the cross-eyed sneeze, the yawn in three sizes, the chatter of a shiver, and the squirm. The squirm is a wide wobbly grin with the tongue showing, lifted brows and both eyes squeezed, with his ears laid out flat to each side of his head; nothing in it turns down.

**The cloths.** The pyjamas are one sprite, stretched and squashed for whoever wears them: a trunk and two sleeves on Teddy, a tent with a beak out of the neck on the duck, a jacket with the tail through one sleeve on the cat, a cover over the shade on the lamp, a raft flat on the water in the bath. Their stripes are cream bands drawn a little uneven, no two gaps and no two thicknesses in a row the same (`PYJAMA_STRIPES` in `figures.ts`). The blanket is a wrap to his chin on Teddy, a tuck on the rim round the duck, a dome with two points and two eyes in a fold over the cat, a tent that glows over the lamp, and a dome on the water that sinks and leaves one heavy corner over the rim. A cloth on wet fur shows a dark patch where the wet is; foam alone leaves none and brings no shiver. When his foot thumps under the blanket, the blanket rises in a bump over the foot, with a soft shade under the bump, and comes down with it.

**What the idle ladder looks like.** One soft pool of light, full in the middle and gone at its rim, on the one thing the room asks for now; then a pale hand with a dark rim and a shade under it, which carries a faint copy of that thing to the place on Teddy where it would work, or presses once on the lamp, the curtain or the door. The pool has no ring to it and the hand shows on pale fur and on dark paper alike.

**Shapes that are never drawn.** Nothing that reads as a count or a sign: no row of evenly spaced, evenly sized dots or beads (the garlands, the tufts, the stars, the tabby marks and the pyjamas' stripes are all uneven in size and gap, and the tiles are laid like bricks in uneven widths), no crossed lines, no bare ring (a ripple is two soft arcs on water, the rug's cream is three worn patches and not a band all the way round, and every glow is a filled pool), and nothing over a sleeper's head.

**Motion rules.**

- Pastel does not slide like a cut-out: a thing that is moved lags, overshoots a little and settles, and a cloth trails behind the hand.
- Marks are made where the finger is and stay where they were made. Foam, wet and tufts are stamped into Teddy's coat by place, never played as an effect on top of him.
- Each one moves like itself and at its own tempo (`idle.ts`): Teddy breathes from the belly with his head a little behind, the duck bobs quick and light, the cat keeps still but for its tail and a slow blink, the lamp's halo wavers, the curtain drifts, the tap drips.
- Each one answers in its own way and never borrows another's answer: Teddy leans, wriggles, shakes and yawns; the duck squashes, spins, squirts and shoots off; the cat arches, swats, goes stiff, rolls and puffs into a ball; the lamp only changes its light and swings on its stem.
- Every answer that takes time is one entry in `acts.ts`, with its length and the moments of its sounds. The game runs its clock, the view draws from the same clock, and `sync.test.ts` fails when a sound is heard while its maker is not drawn making it.
- Loose bits (bubbles, drops, tufts of fluff, dust) are small clouds that drift and fade. They are decoration, capped, and the first thing a lower tier or a full frame gives up.

**Paint order.** `layers.ts` lists what is painted, back to front, for the room as it stands, and the view paints exactly that list over one stamp of the backdrop: the sky and what is outside, the curtain and the light, the lamp and what it wears, the bath from its water to its rim, the things at their places, the cat behind the bed or on it with Teddy between, then the loose bits, the stream, and whatever is in the hand over everyone. `layers.test.ts` holds that order in every state a child can reach.

**How each tier keeps the look.** Every piece is painted once into a sprite at the tier's pixel ratio and stamped; only the faces, the water and the loose bits are drawn live. Teddy's coat is painted again only when the coat or the lamp changes. So a lower tier gives up sharpness and loose bits and nothing else:

| Tier | Pixel ratio | Loose bits at once | What stays |
| --- | --- | --- | --- |
| 0 | 2 | 36 | everything |
| 1 | 1.5 | 28 | every form, edge, mark and light; the tooth is drawn coarser so it is the same size on the glass |
| 2 | 1.25 | 20 | the same |
| 3 | 1 | 12 | the same; foam, wet and fluff are in the coat itself, so washing looks the same |

**The frame budget.** The draw count of this canvas game is its sprite stamps plus its live strokes and fills in one frame, and `DRAW_BUDGET` in `config.ts` holds it at 80. The loose bits are drawn last among the scene's pieces and only as many as the budget leaves. `frameBudget.test.ts` runs the real view on a counting surface through every cell of the grid, the hand and every scene: the fullest frame is 75, the room as found and untouched is 35 (38 with the idle hand over it), and the whole surface is stamped once a frame. It is a count, not a frame rate.

## Registry row, requested from the lead

For the claimed-styles table of `docs/art-direction.md`:

| Goodnight, Teddy | Soft pastel on night-blue paper (canvas 2D): forms rubbed into dark blue paper as smudged clouds of colour with no outline, one thin bright edge on whatever answers a finger, a lamp's halo as a rubbed warm cloud that sinks to night blue when it is turned down, honey, butter yellow and amber on blue and violet | [`games/goodnight-teddy/ART.md`](../games/goodnight-teddy/ART.md) |
