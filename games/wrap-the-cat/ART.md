<!-- template: cartridge/ART.md v3 -->
# Design sheet

The first part is the sheet, written before the game. The look follows it.

## The band and its age rule

Band 3 to 7. The 3 to 4 row of the cue table governs: no words, letters, numerals, symbols or icons to decode, one next act offered at a time, no verdicts (pack: game-design, ages-2-to-4.md; pack: game-design, ages-4-to-6.md). Targets are about 100 units across, nothing essential lies in the bottom 50 units, and everything works with taps alone, except two things inside one circle, which needs the circle. `ctx.childAge` sets nothing, and `null` gives the same room.

## The toy

A finger goes round a thing and paper follows the finger onto it, crackling a little higher with each bit laid. When little is left the rest closes by itself, the paper pulls in tight with a zip, and a bow springs up. Touch the parcel and it tears under the finger with a long rip; a swipe or three taps and all of it bursts off. Winding and ripping are both pleasant with nothing to achieve, and each is the way back to the other.

The paper is where the finger is, so a wobbly circle, a broken one, one the other way round and a scribble all wrap.

## The object-by-action grid, and what is new on day 15

| | Paper laid on it bare | Tapped in its paper | Ripped free | The family gets to it |
| --- | --- | --- | --- | --- |
| Bicycle | the bell dings in short | one muffled ding and a hop on its wheels | both wheels spin and the bell rings on | wheels spin under the aunt, a ding for each tug |
| Cat | ears flatten, a low mrr, the tail whips | hops and waddles off in its paper to the bicycle, bumps it with a clonk, waddles back, sits down with a wheeze | fur stands on end, a spit, then a lick | a spit at the dog, who sits down |
| Grandpa, asleep | the snore catches, a snuffle | the paper fills with his snore like a balloon and pops flat with a raspberry | a sneeze that throws scraps across the room, and on with the snore | he snores through it, one note lower |
| Giraffe | a hum that climbs its neck | the neck swings like a hose with a wobble-board wow | the neck whips up, boing, and it chews a scrap | a hum and a chew |
| Tuba | a muffled oompah | the paper bell puffs out, parp | a blast that blows the scraps away | a blast that flattens the aunt's hair |
| Tree | needles rustle, baubles clink | it shakes itself like a wet dog, jingling | branches spring out, whoomp, a chord of baubles | a jingle down the scale |
| Nothing at all | a whisper of paper closing | it rustles and rolls a little | puff: nothing was in it, and a moth flutters out | puff, and all three look for what it was |

Papers: the red crackles and tears in strips; the yellow stretches with the finger and lets go with a boing; the blue lets you see in and comes off with a thin crinkle. The papers change what every rip looks and sounds like.

**Day 15:** a cat in three papers; nothing, wrapped three times; grandpa tied to the tuba; the whole room in one colour and then the door. None of these needs more content, only circles.

The rules, fixed for ever:

1. Paper goes where the finger is.
2. What is covered gets a bow. What has a bow tears when touched.
3. A circle drawn from outside a parcel adds another paper, up to three; one rip takes one off.
4. What is inside one circle is tied together. A rip of either undoes the sash.
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

There is no ladder: everything is in the room from the first frame. The template's `position` and `finished` are not used. Saved: the version; the paper in hand; for each thing its layers (paper and covered bits) and whether the top one is torn; which two things are tied; up to two parcels of nothing with their place; up to 24 scraps; whether the mouse has shown its round. A walk of the cat is a view and is not saved. A family visit is saved as done when the door is tapped, so nothing replays.

## The characters and their fixed tastes

- **The cat** sits on the end of the paper and wants to stay on it. Dislikes being helped out of it.
- **Grandpa** wants to sleep, and does.
- **The giraffe** wants to see: its eyes follow the finger, and it eats scraps.
- **The mouse** wants its cheese wrapped, and then wants its cheese.
- **The family**, an aunt, a small boy and a dog, wants to rip: it shows as three noses at the door, ajar from the first frame. They never knock, call or complain.

Nobody's feelings are about the child. A wrapped animal is dressed up, not caught: head out, breathing, put out at most.

## The scenes

- **The mouse's round** (first visit, 5 seconds): it runs round its cheese with a strip of paper, a bow springs up, it rips the paper off and bites the cheese. This is the loop. It plays once by itself before the child's first touch, again when the mouse is touched, and as the first thing the idle guidance does. Any touch elsewhere leaves it to finish small and silent.
- **The cat's walk** (6 seconds): caused by a tap on the wrapped cat; it passes nothing on the way that it does not bump.
- **The family** (4 to 10 seconds): caused by the door. Three runners share the finished parcels, arms whirling, and stop dead each time to see what it was. Then they leave with paper on their heads. A finger that rips a parcel first has ripped it. They do not touch what is half wrapped. With no parcel, they put their heads in, look about and draw back.

The want in the first frame is the bicycle: half wrapped, the roll hanging from its edge, the gap bare. After the first parcel the idle hand shows a rip; after that, the cat; after two parcels, the door. Nothing new starts by itself. No scene replays on load, and the mouse's first round is marked when it starts.
