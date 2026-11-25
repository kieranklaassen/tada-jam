<!-- template: cartridge/ART.md v3 -->
# Design sheet

The first part is the sheet, written before the game. The look follows it.

## The band and its age rule

Band 3 to 7. The 3 to 4 row of the cue table governs: no words, letters, numerals, symbols or icons to decode, one next act offered at a time, no verdicts (pack: game-design, ages-2-to-4.md; pack: game-design, ages-4-to-6.md). Targets are about 100 units across and well apart, and nothing essential lies in the bottom 50 units. Everything essential works with taps alone: a tap on a bare thing lays a large bit of paper there and about four taps bring the bow, taps rip, a tap on one of the three rolls standing in the room takes that paper in hand, and a tap opens the door. Only the extras need a drawn circle: a second or third paper, a parcel of nothing, and two things tied. `ctx.childAge` sets nothing, and `null` gives the same room.

## The toy

A finger goes round a thing and paper follows the finger onto it, crackling a little higher with each bit laid. When little is left the rest closes by itself, the paper pulls in tight with a zip, and a bow springs up. Touch the parcel and it tears under the finger with a rip while the thing inside answers; a swipe or three taps and all of it bursts off. Winding and ripping are both pleasant with nothing to achieve, and each is the way back to the other.

The paper is where the finger is, so a wobbly circle, a broken one, one the other way round and a scribble all wrap.

## The object-by-action grid, and what is new on day 15

| | Paper laid on it bare | Its bow goes on | Ripped free | The family gets to it |
| --- | --- | --- | --- | --- |
| Bicycle | the bell dings in short | one muffled ding and a hop on its wheels | both wheels spin and the bell rings on | wheels spin under the aunt, a ding for each tug |
| Cat | ears flatten, a low mrr, the tail whips | waddles off in its paper to the bicycle, bumps it with a clonk, waddles back, sits down with a wheeze | fur stands on end, a yowl, then a lick | a spit at the dog, who sits down with a whuff |
| Grandpa, asleep | the snore catches, a snuffle | the paper fills with his snore like a balloon and pops flat with a raspberry | a sneeze that throws scraps across the room, and on with the snore | he snores through it, one note lower |
| Giraffe | a hum that climbs its neck | the neck swings like a hose with a wobble-board wow | the neck whips up, boing, and it chews a scrap | a slurp as it pulls the paper off the aunt and swallows |
| Tuba | a muffled oompah | the paper bell puffs out, parp | a blast that blows the scraps away | a low rising blat that lifts the aunt's hair straight up |
| Tree | needles rustle, baubles clink | it shakes itself like a wet dog, jingling | branches spring out, whoomp, a chord of baubles | a jingle down the scale |
| Nothing at all | a whisper of paper closing | it rustles and rolls a little | puff: nothing was in it, and a moth flutters out | a hollow pock, and they look for what it was |

Papers: the red crackles and tears in strips; the yellow stretches with the finger and lets go with a boing; the blue lets you see in and comes off with a thin crinkle. The papers change what every rip looks and sounds like. A tap that tears a parcel also gets the small form of what its bow brought.

**Day 15:** a cat in three papers; nothing, wrapped three times; grandpa tied to the tuba; the whole room in one colour and then the door. None of these needs more content, only circles.

The rules, fixed for ever:

1. Paper goes where the finger is.
2. What is covered gets a bow. Each tap on a parcel makes one tear where the finger is, and the thing inside answers at the same time; the third tear, or one swipe, bursts the paper off. A tap on the walking cat counts the same; a burst ends the walk, and it leaps back to its place.
3. A circle drawn from outside a parcel adds another paper, up to three; one rip takes one off.
4. What is inside one circle is tied together, two things at most. A tap on either makes both answer, the touched one first and the other half a beat later, pulled by the sash with a twang. A tied cat strains at the sash and stays. A rip that frees either undoes the sash.
5. A head is always out.

## The representation

No school idea, so no representation is claimed. How far along the paper is shows on the thing itself: covered and bare.

## The four mechanic questions

- **Swap:** there is no content to replace; the verb is winding and ripping.
- **Attention:** the bare patch that is left, and later what to put in the paper.
- **Fun:** both acts are the fun.
- **Guess:** nothing is to be guessed, and nothing is hidden: the child wrapped it all.

## The error as a consequence

There is no wrong answer. A circle that missed is a parcel of nothing. A circle that took in too much ties two things together. A parcel not meant to be ripped can be wrapped again.

## The designed order, and what is stored

There is no ladder: everything is in the room from the first frame. The template's `position` and `finished` are not used. Saved: the version; the paper in hand; for each thing its layers (paper and covered bits) and whether the top one is torn; which two things are tied; up to two parcels of nothing, each with its place, its size and its layers (a third puffs the oldest open); up to 24 scraps with place and paper (the oldest goes as a new one lands); whether the mouse has shown its round; whether a first rip has been made; whether the family has visited. The cat's walk, the moth and the paper on the family's heads are views, gone on load. A family visit is saved when the door is tapped: every finished parcel and sash is written as ripped, so nothing replays. A parcel the child rips first ends in the same saved state.

## The characters and their fixed tastes

- **The cat** sits on the end of the paper and wants to stay on it. Dislikes being helped out of it.
- **Grandpa** wants to sleep, and does.
- **The giraffe** wants to see: its eyes follow the finger, and it eats scraps.
- **The mouse** wants its cheese wrapped, and then wants its cheese.
- **The family**, an aunt, a small boy and a dog, wants to rip: from the first frame they look in at the half-open door, one head over another, and they look at whatever has a bow. They never knock, call or complain.

Nobody's feelings are about the child. A wrapped animal is dressed up, not caught: head out, breathing, put out at most.

## The scenes

- **The mouse's round** (first visit, 5 seconds): it runs round its cheese with a strip of paper, a bow springs up, it rips the paper off and bites the cheese. This is the loop. It is shown large, about 150 units across, in the red of the bicycle's paper, and nothing else moves much while it plays. It plays once by itself before the child's first touch, and after that only when the mouse is touched. Any touch ends it at once, with the mouse beside a whole unwrapped cheese, and the touch does what it was for.
- **The cat's walk** (6 seconds): caused by its bow going on.
- **The family** (4 to 10 seconds): caused by the door. Three runners share the finished parcels, arms whirling, and stop dead each time to see what it was. Then they leave with paper on their heads. A finger that rips a parcel first has ripped it. They do not touch what is half wrapped. With no parcel, they put their heads in, look about and draw back.

The want in the first frame is the bicycle, large and at the centre: half wrapped, the roll hanging from its edge, the gap bare. It shivers with a short ding when it has been left alone for a few seconds, at most three times. The idle hand goes to the bicycle: it glows first, and then the hand goes round the bare gap. Once there is a parcel the hand shows one rip on it; after a first rip it goes round the cat; with two parcels standing and no visit yet, it shows the door. The hand shows one of these at a time, and which one follows from the saved fields alone.

This is open pretend play, and the family's leaving is its largest ending: the room stays bare and full of scraps for as long as the child likes, and nothing new starts by itself. A touch on any bare thing starts a wrap. The calm tidy-up is the giraffe, which eats a scrap that is tapped; nothing asks for it. No scene replays on load, and the mouse's first round is marked when it starts.

---

# Art guide

## The look

**Crepe paper and wire**, the first choice of the look menu. The first still held on clarity, so the second choice was not tried.

Everything is stretched crepe: filled, ribbed along the way it was pulled, darker at its root, frilled where it ends, and stuck on with a dot of glue. Whatever is thin is florist wire wound in tape: bicycle frame, giraffe's legs, tuba, door frame, whiskers. It is a bright room by day, filled to its edges, with no lamp and no layered card.

- **The laugh is the outline.** A parcel keeps the shape of what is in it: a bicycle in paper is two wheels and a handlebar, a giraffe in paper is a giraffe. Each wrapped picture is made from the thing's own shape grown outward, so it can never hide what it is.
- **Heads stay out.** Grandpa, the cat and the giraffe are wrapped to the neck, and their bows sit on the chest. No face is ever under paper or behind a bow, and the cat's paws and grandpa's shoes stick out too.
- **Three papers.** Red, yellow and blue, each with a pale underside that shows along a torn or unfinished edge, and a bow in another colour. A quiet room (grey-blue wall, oat floor and rug, muted people) keeps those three for paper alone.
- **Shapes a child tells apart at a thumb's size:** two wheels, two ears, a moustache in an armchair, a long neck, a round horn on a ring, a triangle with a star.
- **The first frame says it.** A half wrapped bicycle with the roll still hanging on it, its loose strip across the rug, three rolls standing ready, a cat who has seen what is coming, and a family peering round the door.
- **Movement.** Each thing has its own curves for paper laid, a bow going on, a tear, a burst and a poke (`motion.ts`); `view.test.ts` holds that none is shared.
- **The hand** is a large pale hand going round with a trace of paper behind it, over a glow on the thing it goes round.

## How it is drawn

`crepe.ts` is the pen: fills, ribs, frills, wire. `things.ts` and `room.ts` paint the sprites, `view.ts` stamps them. The room is one picture. The wrapped pictures are painted ahead, a few at a time while no finger is down, so no touch waits for one. Paper is drawn by clipping the wrapped picture to spiral wedges, with the pale lip along each edge. The fullest room stays under 150 stamps a frame, which a test holds. What is cut is kept until it changes. A tier changes the pixel ratio and nothing else. Nothing is painted at module load.
