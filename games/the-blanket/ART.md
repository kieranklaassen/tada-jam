<!-- template: cartridge/ART.md v3 -->
# Design sheet

The first part is the sheet, written before the game. The look follows it.

## The band and its age rule

Band 3 to 7. The 3 to 4 row of the cue table governs: no words, letters, numerals, symbols or icons to decode, one next act offered at a time, no verdicts, tools shown only when they mean something (pack: game-design, ages-2-to-4.md; pack: game-design, ages-4-to-6.md). Targets are about 100 units across, everything essential works with taps (cover, uncover, bring a sausage down, move it between places, ring the bell), and nothing essential lies in the bottom 50 units. A blanket on a place and a sausage on a head are drags, which survive a lifted finger and count when partly done. `ctx.childAge` sets nothing, and `null` gives the same room: the first visit is the same at every age. A three-year-old has peekaboo with large faces; the plot is there for whoever finds it.

Hidden rules are found by playing. Nothing explains them and nothing counts them.

## The toy

A tap on anyone drops a blanket over them as the finger lands: it billows down with a soft flump and a muffled grunt, the head makes a lump, and what sticks out goes on being itself (a wagging tail, a purring lump, two kicking slippers, a moustache that blows the hem). Another tap whips it off: hair on end, eyes spinning, a yelp of that character's own. Covering and uncovering is something small children repeat unprompted, and each character is funny under there in its own way, so it needs no goal.

## The object-by-action grid, and what is new on day 15

The sausage and the blanket are the tools, and the bell is the third thing.

| Done to | Tap | Sausage put there | Blanket put there | Someone dives there for nothing, or bumps it running past |
| --- | --- | --- | --- | --- |
| Dish (open) | the sausage hops there with a plate ring | lies in plain sight, a ring | a flat lump, a muffled ring | nose along an empty plate, a scrape |
| Teapot | lid clinks, the sausage plops in | tip out of the spout, a plop | a round ghost, a muffled clink | head in the pot, lid on the head, a hollow hoot |
| Boot | the boot hops and stamps | tip over the top, a leather squeak | a tall lump, a thump | comes out with the boot on the nose, a stamp |
| Flowerpot | the flower ducks, earth patters | tip beside the stem, a patter | a hill with a flower bump, a rustle | a face full of earth with the flower on it, a sneeze |
| Gramophone | a crackle, two bars of a tune | tip out of the horn, a muffled parp | the horn sags, a smothered tune | head in the horn, a honk |
| Sausage string | one comes down to the dish with a twang | does not go there: springs back to where it was, a twang | does not stay: slides off and flaps back to the basket | a jump that misses, a boing |
| Uncovered character | blanket billows down straight, a soft flump and a muffled grunt | a present, eaten in that character's way, with that character's own munch | blanket lands askew and is wriggled straight from inside, a flap and a grumble | a tumble into each other's laps, a whump |
| Covered character | blanket whips off with a whoosh and a yelp, and it dashes | rests on top of its head, a squeak | a second one slides off to the basket, a flap | the owner is bowled over, a whump and a muffled yelp |
| Goldfish | a loop and a bubble that pops | a plop, and the fish spits it back where it was | the bowl is dark, a bloop | the water tips over the rim, a slosh |
| Bell | a clang, every blanket flies, everyone dashes | a ding off the side, springs back | a dull bonk, slides off to the basket | it rocks on its stand and sets nobody off, a small tinkle |

**Day 15:** four people who each believe something different, set off together by the bell; a sausage carried on the head of the one who is hunting for it; a lie passed along by somebody who only copied where a neighbour was looking; and mischief done behind the back of someone busy with their head in a teapot. None of these needs more content, only the rules.

The rules, fixed for ever:

1. Seated and uncovered, a character sees where the sausage goes. Under a blanket, or out of its seat, it sees nothing.
2. Nobody sees the top of its own head.
3. When its blanket comes off it goes to where it last saw the sausage, without looking first.
4. Not knowing, it looks for a sausage in plain sight (on the dish, on somebody else's head, or on the string while none has been brought down), and failing that it copies the nearest seated, uncovered neighbour who believes something.
5. Seeing a place found empty, anyone who believed in that place stops. Seeing the sausage eaten, everyone who saw it looks at the string.
6. The goldfish always knows.

## The representation

No school idea, so no representation is claimed. What is represented is a belief: the eyes of a seated, uncovered character rest on the place it believes in, and its body points there too, the dog with its nose, the cat with the tip of its tail, the aunt with her fan, the grandfather with his pipe. No thought bubble. Someone who does not know looks about. The child can always see where the sausage is, because a tip of it shows out of whatever holds it, and the sausage and the string it comes from are the only coral red things that size in the room.

## The four mechanic questions

- **Swap:** no; replace what each one has seen with any other subject and there is no game left.
- **Attention:** at the moment of decision the child thinks about who saw the sausage move and who did not.
- **Fun:** the thinking is in the laugh, because the dash to the wrong place is what the child set up.
- **Guess:** there is nothing to guess; random tapping gives peekaboo and dashes, and only thinking gives the dash the child meant.

## The error as a consequence

There is no wrong answer. A trick that does not come off is a sausage eaten: the dog saw it move, so the dog goes straight to it and swallows it. That shows which character was not covered. The room stays as it was and the next sausage is one tap away.

## The designed order, and what is stored

There is no ladder: everything is in the room from the first frame, and depth is reached by understanding. The idle guidance offers one next act from the state: bring down a sausage, cover somebody, move the sausage while somebody is covered, take the blanket off.

The template's `position` and `finished` are not used. Saved: the version; for each character whether it is covered and what it believes; where the sausage is (a place, a head or the string); which places and whether the bowl have a blanket. Nothing else. A dash in progress is saved as the room it leads to when nobody touches anything, so no dash plays on load. A thing in the hand is saved where it came from.

## The characters and their fixed tastes

Everyone wants the sausage, and the want is visible in the eyes from the first frame.

- **The dog**, long and low on a rug. Fast, all front paws and no brakes. Swallows whole, then looks for it. Empty place: howls at it. Uncovered: shakes from nose to tail. Dislikes the gramophone and covers its ears after hunting there.
- **The cat**, tall and narrow on a stool. Pours off, trots on tiptoe, pretends it meant to. Eats the two ends first with its eyes shut. Empty place: sits down, licks a paw and looks elsewhere. Dislikes the flowerpot: earth on the paws, shaken off one by one.
- **The aunt**, very wide, in an armchair, hat and fan. Bounces along in a seated position. Eats with a raised little finger and burps behind the fan. Empty place: gasps and fans herself faster and faster. Dislikes the boot: the smell sends the fan flat against her nose.
- **The grandfather**, thin, all moustache, in a rocking chair. Creaks up, tiptoes with high knees. Wears the sausage as a second moustache before eating it. Empty place: moustache droops, then blows straight out. Dislikes the teapot: cold tea in the moustache, which he wrings out.

The goldfish has no opinion and always faces the sausage. Nobody's feelings are about the child, and nobody is hurt.

## The scenes

Every dash is a short scene of four to seven seconds: a start with the eyes squeezed shut, the run, the search, the find or the outrage, and the walk home. It is filled in from who ran, where to, and what was there. It blocks nothing: every other thing answers a touch meanwhile, and a tap on someone who is out drops a blanket on them, and they grope home under it.

A cycle ends when the sausage has been eaten. The eater comes home, and the string hangs where everybody looks at it. Nothing more happens until the child brings the next one down.

One more: a character who dives into a place with a blanket over it comes home wearing the blanket, as a ghost.

No scene replays on load.

# The look

Sponge-stippled flat poster, the first reserved look, in canvas 2D. Every shape is one flat opaque colour with no outline. Its only shading is a second colour dabbed on with a sponge along one side, thick at the edge and thinning towards the middle. No gradient, blur, shadow or outline anywhere.

## Palette

Five colours carry the room: ink `#1c2945`, teal `#5aa69c`, ochre `#e8ac34`, cream `#f7edd4`, coral `#e4512f`. The sponge makes the rest: deep teal, rust, aqua and peach. Coral at the size of a sausage belongs to the sausage and its string; cheeks and mouths carry only a touch of it. So the eye finds it at once, and a tip of it is enough.

## Shapes

- **Dog:** one low cream pear, ink ears, a nose that leads. **Cat:** a narrow ink column on a stool with two ochre lamps. **Aunt:** a wide spotted ochre bell with a fan. **Grandfather:** a thin ink egg, all cream moustache, with a pipe.
- Eyes are large and white (ochre for the cat), with ink pupils that move far. They are the readout of belief, so nothing else in the room looks like them.
- Blankets are aqua gingham, so a blanket is never mistaken for a person or a thing. The cat's keeps its ears.
- A hiding place has a back and a front, and the sausage goes between, with its tip out.

## Materials and code

`paint.ts` has the sponge. A picture is painted once at the surface's scale, from a seed made of its name, and stamped (`Stamps`). The room is painted once for a size (`room.ts`). Eyes, mouths, limbs and the blanket's outline are drawn live, so they can bend.

## Motion

Nobody shares a curve (`NATURES` and `PHASES` in `motion.ts`): the dog is all front, the cat pours, the aunt bounces where she sits, the grandfather creaks with high knees. The rules move a hunter in a straight line; `footing` keeps it on the floor until it leaps, and the same function says where it is touched. A head goes into a teapot, a boot or a horn up to the neck with the rest of the body in the air.

## Tiers

A tier sets the pixel ratio and how many dabs the sponge gives (`TIERS` in `config.ts`). Flat shapes, motion, puffs and every answer to a touch are the same on all of them.

## Registry

Row for `docs/art-direction.md`, section 3: The Blanket, sponge-stippled flat poster (canvas 2D).
