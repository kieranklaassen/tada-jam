<!-- template: cartridge/ART.md v3 -->
# Design sheet

She's Copying Me. Two grand aunts sit side by side at tea, each with a thing in her hand and a guest in front of her. The child moves one aunt's hand; the other aunt watches, and a beat later makes the same movement with whatever she is holding. Tea poured for the walrus on one side is glue poured over the lap dog on the other.

## The band and its age rule

Band 3 to 7. The youngest age governs: the cue table's row for 3 to 4 (direct handling, a ghost hand showing one move, what can be touched glows; no text, numeral or icon to decode, no verdict) and (pack: game-design, ages-2-to-4.md; pack: game-design, ages-4-to-6.md). One thing departs from the row's "one live activity": both aunts answer, because either one leading is the idea. They are the same activity mirrored. The bell stands on the table only while a coat, hair or lips could be tidied; at most one guest asks at a time (see the characters). No word, letter, numeral or sign is shown.

`ctx.childAge` sets one default on a first visit, how long the copy waits: 3 and younger 0.45 s (`quick`), 4 and 5 0.8 s (`steady`), 6 and older 1.2 s (`slow`). `null` gives `quick`. The wait runs on attended game time only. The child can change it at any age by touching the pendulum, and the saved wait wins afterwards. Nothing is gated.

Everything essential works with a tap. A hand target is about 110 units across; a guest 180 or more; a thing on the table, the bell, the pendulum and a guest at the window at least 100, well apart. Nothing essential lies in the bottom 60 units.

## The toy

The finger moves a hand. On touch-down, in the same frame, the thing in the hand squeaks, the aunt's eyes go to the finger and the hand starts toward it; the arm, lace and thing swing after it. Over a guest's head the thing tips; touched to the guest it dabs; shaken it waves; held high it is shown off; brought to the aunt's own face she uses it on herself. Each is funny with one aunt alone. Then the other aunt, who was watching with one brow up, does it too. Doing it once more, faster, bigger or sillier, is the pleasure.

A tap is the same as a short drag: the hand goes where the tap landed, does what that place means, and comes back. A tap on the hand itself shakes the thing. A tap at the middle holds the hand there until the copy has come.

A finger moves the hand of the side it lands on, and that aunt leads. A thing on the table is taken by touching it: the hand of the aunt on that side puts hers in its place and takes it, seen and heard, and one more touch there changes them back; carried by a finger instead, it changes with the thing of the aunt it is let go on, never with one it only passes. A small slip is still a tap. A lift of under 0.3 s keeps the hand where it hangs, and a finger landing near carries on. A second finger takes nothing from the first and gets a small answer of its own; a contact that landed on nothing, or has lain still for a second without carrying, hands the work to the next finger. A lost capture or a cancel only brings the hand, or the thing, back, and does nothing to a guest. A touch on the copier makes her the leader, and what she was about to copy is dropped. One gesture gives one effect, however long it is held; a new one starts when the hand has left the place.

## The object-by-action grid, and what is new on day 15

Each cell has its own particles and its own notes; what it does to the guest is its effect (splash, glue, feathers, wind, bump, blast).

| Thing | Tip over the guest | Dab on the guest | Wave | Show high | At her own face |
| --- | --- | --- | --- | --- | --- |
| Teapot | a tea arc, glugging (splash) | spout to the lips, a slurp (splash) | a row of drops flung, pattering (splash) | the lid rattles and steam whistles; drops on her own hair | she drinks from the spout, cheeks full, gulping |
| Glue pot | a slow white glop, plopping (glue) | a gluey kiss, a smacking pull (glue) | long strings, twanging (glue) | a glob drips on her own hair, splat | her lips are stuck, a muffled hum |
| Fan | a down-draught, whooshing (wind) | a tap on the nose, tok (bump) | a gale of curls, flapping (wind) | it opens like a tail, a rising rip | she hides and peeps, a flutter |
| Fish | it spits a jet, squirting (splash) | a fish kiss, a wet pop (bump) | slaps left and right, slap slap (bump) | it wriggles and flaps, a wet drum | fish on fish face, lips popping |
| Feather duster | a shower of feathers, rustling (feathers) | a tickle, a trilling giggle (bump) | dust clouds and a sneeze, puff (feathers) | the feathers fan out and a chick's head looks out, cheeping | her own sneeze, her hair jumps off and lands again |
| Brass horn | a mouse slides out and runs off, a falling slide whistle (bump) | a blast at close range, parp (blast) | a honk each way, two notes (blast) | a long call, the bell of the horn swells | used as an ear trumpet, her eye grows huge, a far-away echo |

A guest wears one coat at a time, and a coat stays until something changes it. What a cell adds without changing the coat (wetter, a puddle, thicker, bigger, one more layer, rounder, a second bubble, a roll, a float) is short-lived: it settles back to the plain coat within seconds, the guest on its stool, and is gone on load.

| Coat | splash | glue | feathers | wind | bump | blast |
| --- | --- | --- | --- | --- | --- | --- |
| clean | wet | gluey | one lands on the nose: a sneeze, clean | puffed | a wobble, clean | hair stands up, clean |
| wet | wetter, a puddle, wet | gluey | feathered | puffed dry | shakes it all off, clean | a spray, clean |
| gluey | washed, clean | a thicker glop, gluey | feathered | stiff as a statue | stuck: stretched like gum and snapped back, gluey | blown into a bubble |
| feathered | washed, wet | a bigger bird, feathered | one more layer, feathered | flaps up off the stool and lands on it again, feathered | feathers burst, clean | crows, feathered |
| puffed | flat, wet | gluey | a sneeze, clean | rounder, puffed | all the air out, clean | spins round, puffed |
| stiff | soft again, gluey | gluey | feathers slide off, stiff | rocks, stiff | cracks and crumbles, clean | rings like a bell and cracks, clean |
| in a bubble | rolls round, bubble | a bubble in a bubble, bubble | a feather pops it, clean | floats up, bubble | pops, clean | bounces, bubble |

An aunt's hair carries a coat too (plain, wet, gluey, feathered): showing the teapot or the fish wets it, the glue pot glues it, the duster feathers glued or wet hair, the fan dries wet hair. Her lips stay stuck until she drinks tea, kisses the fish, sneezes or blows the horn.

Wrong use is most of the game: every thing does something at every place, and nothing is refused.

**Day 15.** On day 1 the child moves a hand and laughs at the echo. On day 15 the child chooses the pair: which two things, which two guests in which two coats, so that one movement is perfect manners here and a catastrophe there; with a slow pendulum the child leads with tea and changes the copier's thing before she gets to copy; and the child knows how to turn a guest into a bird, a statue or a bubble, and to float two bubbles across so that the guests change places. Six things taken two at a time, two sides, gives thirty pairs; a pair has five gestures; and what each does depends on the coats the child has made.

## The representation

The game has no learning goal, so no school idea is represented.

## The four mechanic questions

The game has no learning goal, so the questions are not asked of it. The thinking in it is play: one movement has to be meant for two worlds at once.

## The error as a consequence

There is no wrong attempt. A hand that goes nowhere in particular swings its thing, and the copy swings hers. A table thing let go over nothing hops back to its place, seen and heard. Hands that fail to meet close on air with a small clap of the gloves. Nothing is reset: coats, hair and things stay, so the child changes one thing and tries again.

## The designed order, and what is stored

There is no order of challenges and no position. A first visit finds the teapot with the tall aunt before the walrus, the glue pot with the round aunt before the lap dog, the fan, fish, duster and horn on the table, the goose and the pig at the window, every coat `clean`, all hair plain and all lips free. The saved state, version 1:

- `held`: the thing each aunt holds, `table`: the four things on the table by place. Together the six things once each.
- `seated`: the guest in front of each aunt, `waiting`: the guest at each window pane. Together the four guests once each.
- `coats`: the coat of each of the four guests.
- `hair`: the coat of each aunt's hair. `lips`: whether each aunt's lips are stuck.
- `beat`: how long the copy waits, one of `quick`, `steady`, `slow`.

A hand, a thing in the air, particles, puddles and the history of the leader's hand are not saved: a puddle dries within seconds, and a hand is found at rest. A movement still being copied when the game is put away is not copied later.

## The characters and their fixed tastes

**The aunts.** The tall aunt (left) is narrow, slow and grand: chin up, eyelids low, she moves from the wrist, and her tower of hair lags behind. The round aunt (right) is quick and hearty: her chins bounce, she leans in, and her curls jiggle. Each wants one thing, to be exactly as elegant as her sister: she watches the sister's hand all the time. The leader looks pleased with herself, the copier copies in earnest, and when the copier's guest is outraged the copier is puzzled and the leader looks at the ceiling.

**The guests.** Each has one want that is always visible, the two at the window included, and the same answer to the same effect for ever. Only one seated guest asks at a time, turned to the child (on a first visit the walrus); the others hold theirs quietly. A dislike is aimed at the aunt's thing, never at the child, and no guest minds waiting.

| Guest | The want | splash | glue | feathers | wind | bump | blast |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Walrus in a uniform | holds out an empty cup | delight, sips from the cup | puzzled | sneezes | delight, moustache streams | outraged | salutes |
| Lap dog on its cushion | begs with paws up for the fish | outraged, shakes | puzzled | chases its tail | delight, tongue out | delight, licks | sings along |
| Goose in pearls | fans out a tail with a gap in it | delight | outraged | delight, preens | outraged, neck blown over | outraged, honks | sings along |
| Pig in a white ruff | pulls its stiff clean ruff away from its neck and stretches its snout toward the glue pot | outraged | delight, wriggles | giggles | puzzled, rolls | giggles | faints and is up again |

A thing can please by what it is: the dog is delighted by any dab or wave of the fish. The walrus's cup is never filled for long: he sips and holds it out again. No want is a task and nothing is kept of it.

No guest is hurt: a bump is a wobble, a blast lifts hair, and each looks bewildered at worst.

## The scenes

Each lasts 4 to 8 s, is caused by what the child just did, and gives way to any new touch, which ends it at its saved outcome and then counts as an ordinary touch. A finger already down when it starts keeps its hand and does not end it. The three scenes of two guests start only at the moment a gesture or its copy gives the second guest that coat, never because a guest with a coat came in from the window. Until it ends, the two guests are taken up with each other: a hand that comes to them does its movement and reaches neither. Each is played by the two guests who are there, in their own shapes and voices, with the hair the aunts have and the things they hold, so it differs with the state of play.

- **The trade.** The leader's hand waits at the middle and the copier's arrives: they clink, the things change owners, both aunts admire what they have. Saved when it starts: `held` with the two exchanged; one more meeting changes them back. It looks different with each pair.
- **Two birds.** One guest is feathered and the second becomes so: they look at each other, bow and do the same dance. Saved when it starts: the second guest's `coats`.
- **Two statues.** One guest is stiff and the second becomes so: a pigeon flies in, sits on one head, then the other, and leaves. Saved when it starts: the second guest's `coats`.
- **Two bubbles.** One guest is in a bubble and the second gets one: the bubbles drift across, bump in the middle over the table, and settle on each other's stool. Saved when it starts: the second guest's `coats`, and `seated` with the two exchanged.
- **Tidying.** A tap on the bell only tinkles it and the aunts look up. Carried over the middle of the table and let go there, it rings and hops back to its place; let go elsewhere, it hops back with a tinkle and nothing is tidied. When it rings, each aunt takes out a handkerchief and rubs her guest, hair and lips come clean, and the guests shake themselves. Saved when it starts: all `coats` clean, all `hair` plain, all `lips` free. It is the calm way to tidy up; it changes neither things nor guests.

Open pretend play has no ending. Nothing new starts by itself. The guest at each window pane waits, its want in view, and comes in when touched; the one it replaces goes to that pane. On load no scene plays.

## The records

The game has no learning goal and so has no records part, and claims no school skill.

