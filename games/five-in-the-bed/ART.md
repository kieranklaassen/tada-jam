<!-- template: cartridge/ART.md v3 -->
# Design sheet

The first part is the sheet, written before the game. The look follows it.

## The band and its age rule

Band 3 to 6. The 3 to 4 row of the cue table governs: no words, letters, numerals, symbols or icons to decode, no spoken instructions, no verdicts, one live activity and one next act offered at a time, and no tool present before it means anything (pack: game-design, ages-2-to-4.md; pack: game-design, ages-4-to-6.md). Everything essential works with a tap: a sheep over the ridge, the quilt up and down, the next milk. Targets are about 100 units or more, and nothing essential lies in the bottom 50 units. Targets are well apart except the sheep of one group, which lie close so that the group reads as one part; a touch meant for a neighbour moves one sheep and is undone by one tap. The quantity is always five. `ctx.childAge` sets where a first visit starts: 4 and younger at `next-door`, 5 and older at `further`; `null` gives `next-door`. A saved position wins.

## The toy

Five fat toy sheep lie in a bed with a ridge down its middle. A finger that lands on one squashes it, and it bleats in its own pitch. A tap, and it goes over the ridge into the other half in one tumbling leap, face over tail, over whoever lies between, and bumps whoever it lands beside. A shove rolls it wherever the finger goes, pushing the others ahead of it; a fling sends it into the rest like a ball among balls. They roll back together into the hollow of their half and right themselves. Rolling and knocking things about is something small children repeat unprompted, and there is no way to lose a sheep: the bed keeps all five.

## The object-by-action grid, and what is new on day 15

| | Tap | Shove or drag | A sheep rolls into it | Quilt over it | Milk is out |
| --- | --- | --- | --- | --- | --- |
| Sheep | squash, its own bleat, and over the ridge it tumbles | rolls with the finger, a rumble that rises with speed | a bop pitched by the knock, and a squeak from the one hit | a muffled bleat, and a bulge where it squirms | slurps through a straw, each in its own way |
| Ridge | a twang, and it wobbles | a lower twang drawn along with the finger | the sheep hops the crest with a boing | a flump over the ridge's edge | the straws stop above it, a tick |
| Bare mattress | springs creak and the nearest sheep bounce | an unseen hand: sheep roll ahead of it, a brush of pile | the sheep rolls home with a rumble | a soft flump | a drop of milk plips if a straw has nobody |
| Quilt | the roll: up it comes with a whump. The hem: off it flies with a whoosh. The middle: the nearest lump squirms with a muffled bleat, or a flat pat | the hem follows the finger with a rustle; the middle shoves who is under it | goes in under the side with a swish, and the side of the quilt lifts | the other half's quilt slides back first, a double flump | straws go in under the hem with a pop |
| Bottles | a clink of that bottle's pitch and a wobble | slides a little and springs back with a squeak of the shelf | rock on the shelf with a rattle when a sheep hits the headboard | a muffled clink | drain with a gurgle and burp empty |
| Dog | ears up, a yip, and he deals the milk if it is owed | his head turns after the finger with a wooden creak | a hard knock on the bed's side makes him bark back | puts his nose under the edge, a snuffle | he licks his lips, a slop |
| Mouse | dives in her hole with a pop and looks out again | scampers after the finger and back, a patter | jumps when the headboard is hit, a tiny squeak | holds her breath, then a sneeze | one drop for her, a lick |

**Day 15:** a child can call any of sixteen acts on purpose, because each way of parting the five always puts on the same one: five solos, ten duets, and what happens when all five are on one side. They can do it with one half under the quilt. They can put the two who quarrel together and then give them milk.

Acts are never listed, counted or hinted at.

## The representation

A whole that splits and rejoins. Composing and decomposing is the pack's row; the pack names lengths, ten-frames and "a whole that splits and rejoins" for it and names no trial (its only mark there, [S], is on plain objects transferring better), so this representation is school practice without a trial behind it. The whole is five bodies of the same size and colour that can neither leave nor multiply. The ridge makes exactly two parts. In each half the sheep roll into a close group, of four or fewer unless all five lie on one side. Five bottles on two shelves, one shelf above each half, are the same five parted in the same two parts, and the straws join them one to one. The order stops at the object: sheep, then bottles that stand for them one to one. There is no picture and no symbol; the band starts below 6.

The working pieces are the characters here, which departs from the rule that pieces have no faces (pack: game-design, working-objects-stay-plain.md). The bodies are kept plain, alike and cream on a plain field of another hue; a sheep's own thing is on its small head only.

## The four mechanic questions

- **Swap:** no; the play is parting five and nothing else fills two shelves with five bottles.
- **Attention:** at the moment of decision the child looks at how many are on this side and how many are then on that side.
- **Fun:** shoving sheep across is both the skill and the fun; play never stops for it.
- **Guess:** random tapping moves sheep and gives acts, and by chance may fit the bottles in a visit; each settled parting shows who has no straw and which bottle has no sheep, so looking is quicker than tapping.

The quilt is no quiz. Nobody asks what is under it, nothing waits for an answer, and it comes off with a tap. With one half hidden, the half in sight still tells: when it fits its shelf, the other has the right number. Which sheep are there, where a bottle wears a colour, shows by the straws that go in under the hem and by the one that does not.

## The error as a consequence

A straw comes down from each bottle to a sheep in the half under its shelf, and follows who lies where at once: a sheep that comes over gets its straw as it lands. A parting that does not fit leaves a straw that dangles and drips on one side, and on the other a sheep with an open mouth, who looks across at that straw and hops toward it and falls back, while the straw leans toward that sheep and its full bottle bobs. Nobody drinks; those with a straw blow bubbles. At `whose-milk` the right number with the wrong sheep leaves the coloured straw dangling on the same side as a sheep with an open mouth; the straw's end points across the ridge at the sheep of its colour, and that sheep looks back at it. Everything stays as it is, and each sheep over the ridge changes it.

## The designed order, and what is stored

One new thing at a time:

1. `next-door`: the bottles are one sheep away from how the sheep lie.
2. `further`: the bottles may part in any other way, none on one shelf included.
3. `under-the-quilt`: as `further`, and the dog draws the quilt over one half as he deals. It comes off as always.
4. `whose-milk`: as `further`, never with an empty shelf and without the dog drawing the quilt; one or two of the bottles on the smaller shelf, as many as it holds, wear a sheep's own colour and their straws go to nobody else, so it matters who lies there.

A cycle runs from a deal to the drinking. Counted while it runs: the settled partings that did not fit. Well: at most one more than the sheep that had to move. Badly: six or more beyond that. Otherwise mixed. Nothing shows the count or the position. The harder option is the quilt: at every position the child may lay it over one half while the milk is out, which looks harder since that half is hidden, and may take it off again. A bottle wearing a colour is seen before anything is tried, and any child may push sheep about without dealing milk at all.

Saved: version; position and finished; the five sheep's places, at rest; which half the quilt is over, or none; the bottles of the current deal (each shelf's number, and which wear whose colour), or none; the misfits so far; the number that had to move; shown (which of the two showings have started); and the random stream's state. Sheep on the move are saved where they would come to rest; one under a finger goes back to where it came from first. A save in which the rest would fit the milk is saved as drunk, so nothing plays on load. The act that is playing, the dog in the bed and the bulges are views and are not saved.

## The characters and their fixed tastes

All five want milk when it is out, and to be comfortable when it is not. On the first frame the milk is out and one sheep has no straw: its open mouth faces the child and its eyes go to the straw that drips across the ridge.

- **Tup**, blue nightcap. A snorer, slow and deep. Likes the one who sleepwalks. Dislikes being hit with a pillow.
- **Curl**, pink curlers. Bossy, quick and stiff. Likes the little one. Dislikes snoring.
- **Pip**, yellow dummy. Hiccups, small quick hops. Likes a moving bed. Dislikes being without the dummy.
- **Nell**, green sleep mask. Sleepwalks in circles, smooth. Likes a waltz. Dislikes having the mask lifted.
- **Gus**, orange bobble hat. Giggles, loose and bouncy. Likes everything. Dislikes nothing, and cannot stop.

A child tests a taste by putting two together, and their act shows it every time: Tup and Curl quarrel (he snores, she hits him with a pillow); Tup and Nell waltz to his snoring; Curl tucks Pip in; Pip and Gus rock the bed with giggling; Nell walks off with Pip's dummy; Gus lifts Nell's mask.

How each drinks: Tup in one long pull and a snore, Curl in neat sips, Pip between hiccups, Nell turning on the straw, Gus blowing half of it back.

The **dog** wants a place in the bed: he watches the half with the most room. When all five are on one side and no milk is out, he gets into the other, turns round once and lies down, until a touch anywhere. He deals when touched and never asks for it. He likes an empty half and dislikes a knock on the bed's side. The **mouse** wants a drop of milk: she leans out of her hole with her tongue out toward the bottles, or toward the crate when no milk is out. She likes a drip and dislikes a knock on the headboard. Nobody's feelings are about the child.

## The scenes

- **Deal.** Cause: a touch on the dog or his crate when no milk is out, sheep on the move or an act playing or not. Five bottles hop one by one to the two shelves with a clink each, a rest between the two groups; on `under-the-quilt` the quilt comes up. Four seconds. Saved at its start: bottles, misfits, the number that had to move, quilt, stream.
- **Milk.** Cause: the settled parting fits. Milk runs up the straws, bottles drain, then a burp from each, one group after the other with a rest between; the smaller part's act plays, the empty bottles hop back into the crate, and all shut their eyes. Seven to ten seconds. Saved at its start: no bottles, finished, the position moved. Filled in from who lies where.
- **Act.** Cause: with no milk out, a new parting settles. The smaller part's act, four to five seconds; the larger part watches and bleats once each at the end. Under the quilt it is only bulges and muffled sound, and whoever is uncovered in the middle of an act freezes with wide eyes. It saves nothing.

- **Showing.** Cause: the first opening of the game, and the first deal at `whose-milk`, once each. At the opening, with one sheep's open mouth already in sight, another sheep stretches in its sleep, tumbles over the ridge with a boing and tumbles back, so nothing is solved. At `whose-milk`, as the end of the deal, the sheep of a worn colour puts up its head, and its own thing and the bottle bob together with a clink. Four seconds. Saved when the showing itself starts: its mark in shown. Put away before that, it is still owed and starts at the child's first touch. It never plays again.

Any touch ends a scene at once and is then an ordinary touch. After the milk the sheep and the quilt stay as they are. The shut eyes are short-lived: they open at the next touch and are open on load. The dog sits by his full crate, and nothing comes until the child touches him or it. On load no scene replays.

## The records

### us-ca

Levels: `preschool-tk`, Early (3 to 4 ½ Years) and Later (4 to 5 ½ Years). Age mapping: official. Gap: none printed.

- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-2-0-operations-and-algebraic-thinking-2-2` (`us-ca` 2.2): department-published-foundation, confirmed. Earlier age: a group has smaller parts inside it, each smaller than the whole. Later age: splitting a group into two small groups in more than one way, and joining two small groups to form a bigger one.
  Limits taken: two parts at a time, in more than one way; the examples use five only. Left open by Limits: the number meant by "small"; keeping to five is the game's own choice. The earlier age names no numbers. Not in Limits: none on one side as a part, which is the game's own choice; so the statement's earlier part, that each part is smaller than the whole, is not claimed for that parting, nor is it claimed as a split into two groups.

A five-year-old has `preschool-tk` (Later) and `kindergarten`; a six-year-old has `kindergarten` and `grade-1` and not `preschool-tk`; no record of those is named, and play is the same for them. Nor is any record of the cross-grade lane.

### nl

Levels: `fase-1`, for ages 4 to 6 (groep 1, then groep 1 or groep 2, then groep 2 or groep 3), and `peuters` for age 3 and for a child who has only just turned four. Age mapping: convention.

- `edu.nl.fase-1.mathematics.objective.a2a3466f-0c39-4336-afac-da2e34a7b582` (`nl` rw/bew/1/01/fase1): curriculum-institute-guidance, confirmed. Taken in part: splitting an amount by acting on it. Adding and taking away are not taken.
  Limits taken: amounts under at least 20, of which the game uses five; it describes an offer, not what a child must be able to do.
- `edu.nl.fase-1.mathematics.objective.894db17e-1112-4414-a958-3f7eb2e944b3` (`nl` rw/gb/2/09/fase1): curriculum-institute-guidance, confirmed. Splitting small quantities and joining them again.
  Limits taken: the offer reaches 20 at the least, of which the game uses five; the number of parts is left open by Limits, and two is the game's own choice.

No `peuters` record is named. The nearest one read is `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-getallen-bewerkingen-bewerkingen-2` (`nl` Bewerkingen / 2: curriculum-institute-guidance, confirmed); it is about sharing out fairly, and the parts here need not be fair, so it is not used. No `nl` record is named for the idea that each part is smaller than the whole.

No record of the end-of-primary lane is named.

### Where the two differ

- The us-ca record takes two parts at a time; the named nl records do not say how many. The game follows us-ca at that point.
- The us-ca record's examples use five, and the nl records reach to 20 at the least. The game follows us-ca at that point and stays at five.

### The claim

Five in the Bed is designed from the California preschool and transitional kindergarten foundation 2.2 (mathematics, strand 2.0), a foundation published by a state department and not a standard: a group has smaller parts in it, a group is split into two in more than one way, and two groups are joined. It is also designed from one Dutch fase 1 statement in part and one whole, both guidance from the curriculum institute: splitting by acting, and splitting and joining small quantities. All three were confirmed when the sheet was written. It claims nothing about what a child has learned.

# The look

Tufted play rug, the first row set aside for this game, in canvas 2D. Seen from above: a printed carpet fills the frame, and hard toys lie on it.

## The rug

Every tuft is one short dab of one dyed colour, so each printed edge is fuzzy by the width of a tuft (`rug.ts`: `dyeAt` says how the place is dyed). Printed on it: a field of night with a moon and stars at the head, meadow with flowers, a road that runs round the bed, a river. The mattress is one plain butter colour, so that five bodies on it are read at a glance; it is bound in brick red. The ridge is sewn in a thick rib of terracotta, lit from the upper left, and wobbles where it is plucked. Pile darkens where a finger or a fast sheep brushed it and stands up again in two and a half seconds. The rug is the only textile besides the quilt: no knitting, no loom, no wool. The sheep are hard.

## The toys

Moulded and turned: one clean edge, a round shade, a small sharp light. The five are cream balls of one size with a brown face plate, pegs for feet and ears. Each is turned as a ball is turned (`sheep.ts`), so that one which rolls shows its curls, its back and its face again, and rights itself at rest; the light on it never turns. What tells them apart is on the head: a blue nightcap, pink curlers, a yellow dummy and tuft, a green mask, an orange bobble hat. A worn bottle has the same colour and a spotted band.

Bottles stand in two painted wooden shelves. Straws are barley-sugar red and white, or in a sheep's own colour. A straw lies behind every sheep but its own and comes to the mouth from the side, past the eyes. The dog is jointed wood with a red collar, large, at the left, behind his crate. The quilt is flat blue felt with stars and a white hem: opaque, and it shows a lump only where somebody moves.

## Palette

Night `#35426f`, meadow `#6f9d4f`, butter `#e8cf8c`, terracotta `#c9825a`, brick `#9c4a3c`, cream `#fbf1dc`, quilt `#5d6cb5`, shelf teal `#57a6a1`. The five own colours are in `OWN` (`paint.ts`) and nothing essential rests on colour alone.

## Motion

Nobody shares one: breathing, wobble, gaze and drinking have a pace and a way for each (`view.ts`), and an act is a function of time (`acts.ts`) that lifts, spins and squeezes whoever is in it where they lie. A leap is a kinematic arc over the others with contact by height, so it passes through nobody. Under the quilt it goes low and in at the side.

## Tiers

A tier sets the pixel ratio only. The rug and the toys are painted once for a size of the surface, never in the middle of play.

## Registry

Row for `docs/art-direction.md`, section 3: Five in the Bed, tufted play rug (canvas 2D).
