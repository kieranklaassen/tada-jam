<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 2 to 5. Its youngest age, 2, governs every choice below.

- **Age rule.** The cue table of wordless clarity has no row below 3, so its 3 to 4 row is the ceiling and the game cuts further (pack: game-design, ages-2-to-4.md). From that row's "Avoid" column, as hard limits: nothing to decode, no spoken instruction, no verdict, one live activity, and no tool on screen before it means something.
- **What follows for the hand.** Everything essential is one tap. A drag is an extra that survives a lifted finger and counts when partly done. No hold, pinch, tilt, shake or double tap. Each friend is a target of about 100 logical pixels or more, well apart, and none stands in the bottom strip where wrists rest. A second tap on the same thing never does harm: it undoes the first.
- **How much.** Four friends, one seesaw, one tray of sand. A whole ride fits in one to three minutes.
- **Symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, optional or not, and the game has no `symbols.ts`. Friends speak in invented, synthesized chirps; no voice instructs.
- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order: age 4 or older starts at `middle-asks`; age 3 or younger, or no age (`null`), starts at `little-asks`. Both ends are open: a younger or older child than the band gets the nearest row. A saved position always wins, age gates nothing, and every friend and every arrangement is reachable by any child from the first minute.

## The toy

**The action.** The finger puts a friend on the seesaw. A tap on a friend standing in the sand makes it hop onto the end of the seesaw on its own side of the tray. A tap on a friend sitting on the seesaw makes it hop off into the sand on that side. A drag carries a friend, dangling, to anywhere: let go over an end and it lands there, on top of whoever already sits there; let go over the sand and it stands where it fell.

**What it does in an empty scene.** One plank on a stone in a tray of sand, and four painted pebbles in three plainly different sizes, two of them alike. The answer starts when the finger lands: the touched friend squashes, chirps in its own voice and looks at the finger. Then the chain: it hops in an arc, lands on the plank with a thump whose pitch falls with its size, the plank swings to the heavier side, the end that goes down bites into the sand and throws a ring of grains, and whoever sits on the end that goes up is tossed into the air, higher the lighter they are against what landed, and comes down on the plank again with a squash and a squeak. The plank rocks and settles. A friend who lands on the high end without tipping it just dangles up there, legs kicking, and the plank creaks.

**The sand answers too.** A tap on bare sand leaves a dimple and a soft hiss; a finger drawn through it leaves a groove that the low light picks out. A tap on the plank makes it rock once with whoever is on it.

**Why repeating it is a pleasure with no goal.** It is dropping and flinging, which toddlers repeat unprompted: a small cause, a large and slightly different effect each time, and nothing that can go wrong. Any friend, tapped at any moment, does something, and the same tap takes it back. Who flies, how high, which end slams down and who ends up sitting on whom all change with who was already there, so the child is running small experiments without being asked anything.

## The object-by-action grid, and what is new on day 15

Six things, five things to do with each. The four friends are painted pebbles; their weights are the game's own units, shown only by size: Pim 2, Mog 3, Dot 3, Bo 4. "Low end" and "high end" are the ends of the plank as it stands at that moment.

| | Tap it | Onto the low end | Onto the high end | Onto a friend's head | Dropped in the sand |
| --- | --- | --- | --- | --- | --- |
| **Pim**, the princess (smallest, coral, shell crown) | Squeaks and hops to the end on her side, or off it again. | A tiny tick; the end sinks a hair deeper and she stamps on it, cross that nothing moved. | If she tips it: a light clack and a small toss for the others. If not: she dangles high, kicking, and trills. | Lands on top with a boing and crows; the one below reacts in its own way. | A small dimple and a soft pat; her crown slips over one eye with a tiny rattle and she shakes it straight. |
| **Mog**, her cat (middle, teal, two ear bumps) | Chirrups, stretches long, pads to the end on his side, or off it. | A soft thud; he circles once and sits, tail side to the child. | If he tips it: a firm knock and a toss. If not: he sits tall on the high perch and purrs, the thing he likes best. | Kneads the head below twice, two muffled pats, then sits with a short chirr; Pim underneath blows a raspberry. | A neat round hollow, which he turns in once with a dry scrunch before sitting. |
| **Dot**, the one at the rim (middle, pale lilac that warms to violet) | Gives a rising two-note peep, warms to full colour, twirls and hops to the end on its side; the friends on the plank turn and bounce. | A thud and a two-note hum, brighter still if someone already sits there; alone on the plank the hum dies away and Dot peeks over at the others. | If it tips it: a knock with a clear ring over it, and a toss. If not: it sits up high, sways toward the friend on the other end and holds one long high note. | Hums a low duet with the one below, both swaying together. | Lands with a light tap and stands where it fell. Next to another friend it stays warm and hums one soft note; alone it pales and draws one ring in the sand with its foot, a faint slow scratch. |
| **Bo**, the big one (largest, deep blue-green, sleepy lids) | Rumbles, rocks twice to get going and thuds to the end on his side, or off it. | The deepest thump; the end digs a crater and a ring of sand flies. Alone on the plank he dozes and snores. | The slam, a crack with a low boom under it: the plank whips over and everyone on the other end is flung, Pim highest. | The one below is squashed flat with a wheeze and pops back when he leaves; a stack with Bo on top sways. | A wide crater and a slow puff of grains; he sinks in a little and sighs. |
| **The plank** | Rocks once with a wooden creak and tosses its riders a finger's width. | A tap on the low end knocks it on the sand: a dull clonk and a few grains. | A tap on the high end dips it and lets it spring back with a twang: riders bob. | A friend let go over the middle slides down the slope to the low end with a rising whistle. | Sand thrown onto the plank by a landing runs off its low end in a thin stream with a dry trickle. |
| **The sand** | A dimple and a hiss. | Where an end comes down it bites the sand with a crunch, deeper the heavier the end, and the bite mark stays. | As an end lifts, grains slide back into the bite it leaves with a short whisper; the bite stays, so the child can see where the plank has been. | Grains thrown by a landing settle on the heads below with a light patter and are shaken off. | A finger drawn through it leaves a groove, with a scrape that follows the finger's speed; the low light shows every one. |

Wrong uses that work and are funny: a light friend sent to lift a heavy one dangles in the air and kicks; a friend stacked on the one who wants to go up pushes that end deeper into the sand; Bo on Pim's head; Mog made to fly; anyone let go over the middle of the plank.

Secrets, which work every time and are never hinted at or counted: both ends the same weight and the plank floats level while everyone on it holds one long hum; all four in a tower on one end; the slide down the plank; Bo's snore.

**Day 15.** The child sets up a fling before causing it: puts Pim alone on the low end and then sends Bo to the high one because that throws her highest, seats Mog against Dot to make the plank float, balances Bo and Pim against Mog and Dot, builds the tower, and walks Dot over to stand with someone before any ride starts. For the youngest, day 15 looks like day 1 with a surer finger and one new thing tried (pack: game-design, depth-from-combinations.md, the exception for ages 2 to 4).

## The representation

**The idea.** Heavier and lighter: of two things set against each other, the heavier side goes down and the lighter side goes up, and things that weigh the same hold each other level.

**The objects.** A seesaw, which is itself the informal weighing means the Dutch cards name. A plank rests on a stone; each end holds a friend or a stack of friends. The idea has the physical shape of the thing: down is heavy, up is light, level is the same, and the child sees why in the objects, with nothing laid over them.

- Weight is shown by size alone. The friends are one material, smooth painted stone, so a bigger one is a heavier one and nothing looks light and weighs heavy. Two friends of one size weigh the same.
- Friends on one end sit in a stack on one spot, so only how much is on each end decides the tilt. Why a seesaw tips, and what distance from the middle does, is in none of the records named below and is not shown: a friend let go over the middle slides to an end before it counts.
- The model is true where it claims to be: the tilt follows the two totals and nothing else, every time, and no arrangement is rigged.
- The working pieces are the plank, its stone and the friends' bodies, whose size is the property. They sit on plain pale sand in hues the sand does not have. The friends are characters because their bodies are the idea (pack: game-design, working-objects-stay-plain.md, the exception). That exception asks that nothing but the one property varies. Here each friend also has its own hue and one small mark (a crown, ear bumps, speckles, heavy lids) so that four characters can be told apart, and Dot's hue changes with company. That goes beyond the exception and is the game's own choice: the marks add no bulk, no hue goes with a weight (Mog and Dot weigh the same in different hues), and nothing but size tells what the plank will do.

**The feelings idea.** One friend, Dot, stands apart at the rim, pale, turned half away, and peeks at the others. Nothing names a feeling. The child reads it from what Dot does and answers with the same touch that moves anyone: a tap brings Dot in, Dot warms to full colour and the others turn to greet it. The response is never asked for, never needed for a ride, and nothing rates it.

**Where it comes from.** Comparing weights on a balance or a seesaw is school and preschool practice, and the Dutch cards name the seesaw itself; the pack's research tables cite no trial for the balance as a representation (pack: game-design, representation-before-game.md, the exception), so this is practice without a trial behind it. Showing a feeling through behaviour, and never as a face to pick, is the pack's design position (pack: game-design, the-mechanic-is-the-school-skill.md), with thin evidence.

**Where the order stops.** At the object. The band starts below 6, so there is no symbol stage (pack: game-design, fade-to-school-symbols.md), and the game needs no picture standing for the objects either: the friends and the plank are on screen the whole time.

## The four mechanic questions

- **Swap.** No: take weight out and nothing is left to play, because what tips the plank, who flies and how high are all the weights of the friends; the part about Dot could not be swapped either, since what the child answers is how Dot stands and looks.
- **Attention.** At the moment of decision the child looks at how big the friend under the finger is, how much already sits on each end, and which end is down; for Dot, at a friend who stands apart and pale while the others ride. There is nothing to aim, time or find.
- **Fun.** The skill is the fun: the comparison is made by the thump, the tip and the fling, which is the most enjoyable moment of play, and play never stops for a question.
- **Guess.** Mostly yes, and by design, because a two-year-old must never be stuck (pack: game-design, ages-2-to-4.md). At `little-asks` and `high-asks` any one tap on a friend other than the asker resolves the ride. At `middle-asks` and `big-asks` tapping the friends on the far side one after another resolves it by the second tap at the latest: the first tap shows too light or level, except Bo at `middle-asks`, who lifts Mog at once. Only at `near-side`, and when that kind comes round in `any-asks`, does a tap make things worse: Bo lands on the asker, and while he sits there she cannot go up, because Mog and Dot together on the far end only float the plank level; tapping him off again frees her. So a child can climb the order by tapping; what each position adds is one more thing to notice, never a gate. Every try shows which end got heavier, so trying things out is weighing, and each tap is undone by tapping again.

## The error as a consequence

A ride has someone who wants to go up or, later, down. A try that does not do it is still a weighing, and the world shows its result where it happened:

- **Too light.** A friend sent against a heavier end does not tip it. It sits high in the air on the far end, legs kicking, the plank creaks and stays, and the one who asked looks across and up at it. Where: the end that stayed up. Why: the small body there against the big one here.
- **The wrong side.** A friend sent to the asker's own end lands on the asker's head. That end sinks further and bites deeper into the sand, and the asker peers out from under the newcomer. Where: the low end, now lower. Why: one more body on it.
- **The same.** Equal totals float the plank level. Nobody is down and nobody is up; everyone on it hums and sways. It is a find of its own, and one more friend on either end settles it.

The state stays exactly as the child made it. No friend goes back by itself, nothing resets, nothing is lost. The child changes one thing, adding a friend or tapping one off, and sees the plank answer again. Nothing buzzes, shakes its head, or turns a sad face to the child: the asker's look is at the plank and at the friends, never at the child as a verdict. Success is the same kind of answer: the end goes down, the asker goes up.

A wrong try costs nothing and tells something every time, and is at least as funny as the right one: the dangling, the squashing and the stack are things worth causing on purpose.

## The designed order, and what is stored

**A ride.** One cycle is one ride: a friend sits on an end and wants to go the other way. It ends when the plank carries that friend there. Each kind of ride adds one new thing.

| Position id | Who asks, and for what | The one new thing | Who stands where | Fewest moves |
| --- | --- | --- | --- | --- |
| `little-asks` | Pim sits on the low end and wants up. | A friend on the other end sends her up. | Mog and Bo in the sand on the far side, Dot at the rim on the far side. Any one of them lifts her. | 1 |
| `middle-asks` | Mog sits low and wants up. | Size matters: Pim alone is too light and dangles; Dot alone floats the plank; Bo lifts. | Pim and Bo on the far side, Dot at the far rim. | 1 |
| `big-asks` | Bo sits low and wants up. | Two together: nobody lifts Bo alone, any two do. | Pim and Mog on the far side, Dot at the far rim. | 2 |
| `near-side` | Pim sits low and wants up. | Sides matter: Bo stands on her own side, and a tap puts him on her head. | Bo on Pim's side; Mog on the far side, Dot at the far rim. | 1 |
| `high-asks` | Pim sits stuck on the high end with Bo sitting on the low one, nothing moving, and she wants to come down so that she can fly again. | The question turned round: taking Bo off works, and so does adding to her end. | Mog on Pim's side, Dot at the rim on Pim's side. | 1 |
| `any-asks` | Any of the five kinds above, in turn. | Nothing new: the kinds are mixed, so the child has to see which kind this one is. | As that kind. | As that kind |

- These ids are the `LADDER` in `config.ts`, in this order. Each names a place in the game's own order, and none names a grade, a groep or a level.
- A ride is laid out mirrored on every other turn, so the asker sits left as often as right. That and the mixing at the top are the only variety; nothing is random.
- Dot is never needed: every kind has a way through by taps alone that leaves Dot at the rim. Bringing Dot in always changes the weights and is never the only way.
- The weights 2, 3, 3 and 4, the four friends and the six positions are the game's own choices. None of the records named below names a unit or says how many objects a game holds. Two of them bound a comparison to two objects (`us-ca 3.1` at the later age, and `us-ca K.MD.2`), and the sheet says so under each.

**The harder option the child picks.** It is in the world and always open: a bigger friend is plainly harder to lift, a taller stack plainly wobblier. In any ride the child may ignore the asker and build what they like.

**How a ride is judged, and how the position moves.** A move is a friend arriving on an end or leaving one. A ride goes *well* when the asker gets there within two moves more than the fewest, *mixed* within five more, and *badly* beyond that. The position moves one step up after a ride that went well, one down after one that went badly, not at all after a mixed one, and only when a ride ends, never inside one. A visit put away mid-ride leaves it where it was. No clock is read. Nothing on screen shows the position or that it moved.

**Who a new position lays out.** The next asker is not on screen as an asker while a ride runs: all four friends are in play. It is chosen when the ride is judged, from the position as it stands after the move, and walks to the waiting place in the ending scene. So a new position shows on the very next ride.

**What is stored**, in `ctx.storage`, as plain versioned JSON read field by field:

| Field | What it holds |
| --- | --- |
| `v` | The version of the saved shape. |
| `position` | The id of the place in the order where the next ride starts. |
| `finished` | The ride on screen has ended: its ending stays, nothing replays, and the next begins on the child's touch. |
| `kind` | The kind of ride on screen, one of the first five ids. |
| `turn` | Which turn the ride on screen was laid out on: its mirroring, and at `any-asks` its kind. It wraps round; it is never shown. |
| `left`, `right` | The friends on each end, from the bottom of the stack up. |
| `sand` | Where each friend not on the plank stands in the tray, to a hundredth of the tray's width. |
| `waiting` | The friend at the waiting place after a ride has ended, or none. |
| `moves` | The moves made in the ride on screen, held only so a ride put away halfway is judged as one ride. It stops counting at a cap and is never shown. |
| `shown` | The ids of the kinds whose one showing has played. |
| `marks` | Every mark in the sand as a coarse grid, 32 by 20 cells of one digit each: smooth, raked, or how deep a mark is. Dimples, grooves, bite marks, craters, hollows and Dot's rings are all kept this way, and on load each cell is drawn from its digit alone; anything finer is not kept. The rake lies out while any cell holds a mark deeper than raked. |

A friend in the hand is saved where it was picked up from. A friend in the air, a rocking plank and a fling are views of the saved arrangement and are not saved: on load every friend sits or stands where it belongs and the plank rests on its heavier end, or level when the two ends weigh the same, an empty plank included. The largest legal state is under 2 KB, far below half of the 64 KB cap, and a test says so.

## The characters and their fixed tastes

Four painted pebbles. Each has one want that can always be seen, and likes and dislikes that never change, so a child can learn them and test them on purpose. Their reactions to exactly what the child did are the only feedback; nothing else rates anything. No feeling of theirs is ever about the child.

| Friend | Body and tempo | Always wants | Likes, every time | Dislikes, every time |
| --- | --- | --- | --- | --- |
| **Pim**, the princess | Smallest, coral, a spiral-shell crown. Quick and bouncy; the crown is her funniest part and lags behind every move. | To fly: she looks at the sky and at whichever end is high. Stuck on a high end where nothing moves, she looks down at the sand under her and back at the sky: the way up starts at the bottom. | Being tossed, the higher the better: a squeal and a spin. Sitting on top of anyone: she crows. | Being underneath: cheeks out and a raspberry. Nothing moving when she lands: she stamps. |
| **Mog**, her cat | Middle size, teal, two ear bumps. Smooth and unhurried, then sudden; he goes long when lifted. | A high perch: he looks at the highest seat there is. | Sitting high, on the up end or the top of a stack: a purr and a slow blink. | Being tossed: a yowl, flat and long in the air, and he always lands the right way up. Anything landing on him: ears flat, a hiss. |
| **Dot**, the one at the rim | Middle size, the same as Mog; pale lilac alone, full violet in company. Small careful steps; a speckled back that shimmers when it is glad. | To be with the others: from the rim it peeks at whoever is on the plank. | Being touched and brought in: it warms and twirls. Sharing an end or a patch of sand with someone: a two-note hum, and a duet with whoever is under or over it. | Being by itself, on the rim or alone on the plank: it pales, goes quiet and draws one ring in the sand, once, when it is left alone. |
| **Bo**, the big one | Largest, deep blue-green, heavy lids. Slow; rocks to get going; his belly is the funniest part and wobbles after he stops. | To go up for once: he looks up along the plank. | Being high: a slow rumbling chuckle that shakes the plank. Friends on his head: he holds very still, proud. | Being alone on the plank with nobody opposite: he dozes and snores until something lands. |

- Dot is in company when it is on the plank and anyone else is on the plank too, on either end, or when it stands in the sand within a body's width of another friend. That is a state of the arrangement and never a matter of time: nobody pales, sulks or dozes because the child waited, and Bo's doze lifts the moment anything lands.
- The others answer Dot: when Dot arrives, those already there turn to it and bounce; when Dot is taken away they look after it for a moment and carry on.
- Whoever is asking looks at the plank and at the friends who could help, leans that way, and after a still while gives one small hop on the spot. It never looks at the child to plead, and never complains.

## The scenes

**The ride**, the ending of every cycle. Cause: the plank carries the asker where it wanted to go. About six seconds, built on `scene.ts`. Its outcome is saved when it starts, in every field the scene changes: `finished` is set, `position` holds the place after the move, `waiting` names the next asker, that friend is taken out of `left`, `right` or `sand`, `moves` is cleared, and `marks` holds the sand as it lies at the scene's end, with every bite the rocking plank and the leaving friend make.

1. 0.0 s: the asker arrives and does its own delight: Pim squeals and spins, Mog sits tall and purrs, Bo chuckles and the plank shakes.
2. 0.8 s: the friends on the other end, exactly the ones the child put there and in their stack order, look up and bounce one after another.
3. 1.8 s: the plank rocks three times, see, saw, see. How far each end travels and who is tossed how high come from the two totals as they stand.
4. 4.2 s: everything settles as the child left it.
5. 4.8 s: the friend who asks next hops down from wherever it is, the plank answers its leaving as it does any friend hopping off, and it goes to the waiting place in front of the stone and looks at the plank.

Any touch ends it at once with every beat at its end, and is then an ordinary touch.

**The showings**, one for each kind of ride, once ever (pack: game-design, guided-discovery.md). Cause: a ride of a kind not seen before is laid out. Two to three seconds, no words, and never the answer to the ride in front of the child; any touch ends one with every beat at its end. A showing's outcome is saved when it starts: its id is added to `shown`, and `left`, `right`, `sand` and `marks` are saved as they stand at its end, so one put away or touched midway is found finished and never plays again.

- `little-asks`, which for a child who starts there is the very first open: Pim, standing by the plank, hops onto her end herself; it thumps down; she looks up at the high end and across at the others.
- `middle-asks`: Pim hops onto the far end, dangles and kicks, and hops off again.
- `big-asks`: in the sand, Pim hops onto Mog's head and off again.
- `near-side`: Bo leans toward Pim's end; she looks up at him and ducks.
- `high-asks`: Bo hops on and the plank tosses Pim up to where she sits.

**The secrets** are held states, not films: the level hum lasts as long as the plank is level, the tower sways as long as it stands, the snore as long as Bo is alone.

**How a ride ends and the next begins.** The ending stays as long as the child likes. Every friend but the one waiting can still be tapped, carried and stacked, and nothing is asked. The one who asks next waits in front of the stone, looking at the plank, and never hurries anyone. If the child does nothing, nothing starts. A tap on the waiting friend begins the next ride as a consequence of that touch: it hops to its end, the others hop down to their places, and Dot steps back to the rim, from where one tap brings it in again. On load nothing replays: the world is as the last ride left it, with the next asker waiting, or mid-ride exactly as it was.

**Tidying.** While the sand holds marks, a small rake lies at the far rim. A tap on it draws it once across the tray and leaves even raked lines. It moves no friend and ends nothing, and it is not there when the sand is already smooth.

## The records

The two jurisdictions are kept under their own headings and are nowhere paired. Each record was read in the pack and looked up again on 2026-10-03; standing and check state are as the lookup printed them. What a record asks is given in the game's own words.

### us-ca

Levels, as the lookup printed them on 2026-10-03: `infant-toddler` at age 2 (the indicator for 23 through 36 months); `preschool-tk` at ages 3 to 5 (Early at 3, both statements at 4, Later at 5); and at age 5 also `kindergarten`. Age mapping: official. Gap: none printed. At age 5 the lookup also returns the `cross-grade` lane, labelled cross-grade; the game uses no record from it.

- `edu.us-ca.infant-toddler.science.objective.cognitive-development-strand-1-0-exploration-1-1` (`us-ca 1.1`, Cognitive Development, Strand 1.0 Exploration): department-published-foundation, confirmed. In the game: a touch makes a thump, the thump tips the plank, the tip tosses a friend, and the child is free to guess which end goes down.
  Limits taken: the guesses are simple and are not said to have to be right; no cause explained in full sentences is asked. Left open by Limits: what the guesses are about and with which materials. Weight, and a seesaw, are the game's own choice. Not taken: thinking back over why something happened, which a wordless game leaves to the child.
- `edu.us-ca.infant-toddler.practical-life-feelings.objective.social-and-emotional-development-strand-2-0-social-interactions-2-2` (`us-ca 2.2`, Social and Emotional Development, Strand 2.0 Social Interactions): department-published-foundation, confirmed. In the game: Dot behaves differently from the friends on the plank, and a touch may bring it in.
  Limits taken: an answer that could help comes only sometimes and is not said to help, so the game never asks for it and never rates it; no feeling is named, and the game names none. Not bounded in Limits: the situation. A friend standing apart is the game's own choice.
- `edu.us-ca.preschool-tk.mathematics.objective.mathematics-strand-3-0-measurement-and-data-3-1` (`us-ca 3.1`, Mathematics, Strand 3.0 Measurement and Data): department-published-foundation, confirmed. In the game: friends that differ in how heavy they are, and one set against another on the plank.
  Limits taken: weight is one of the three attributes; at the earlier age noticing a difference is all, with no procedure; at the later age two objects are compared; no units, numbers or measuring tools. Left open by Limits: how two objects are compared. The seesaw is the game's own choice. Beyond the record, as the game's own choice: a stack of two or three against one. Not taken: telling someone what was found, which a wordless game cannot hear and leaves to the child and whoever sits beside them.
- `edu.us-ca.preschool-tk.science.objective.science-strand-2-0-physical-science-2-1` (`us-ca 2.1`, Science, Strand 2.0 Physical Science): department-published-foundation, confirmed. In the game: the child explores objects of one material whose weight differs.
  Limits taken: weight is one example property among several, the same at both ages; the record is about exploring and describing, never explaining, so the game shows no reason why a plank tips. Not taken: the describing itself, the other properties, and the kinds of material.
- `edu.us-ca.preschool-tk.practical-life-feelings.objective.social-and-emotional-development-strand-1-0-self-1-8` (`us-ca 1.8`, Social and Emotional Development, Strand 1.0 Self): department-published-foundation, confirmed. In the game: Dot stands apart, and one touch brings it in.
  Limits taken: at the earlier age only feeling along and concern, with no helping; helping and comforting at the later age, at times with an adult's support. Not bounded in Limits: the situation, which is the game's own choice. The game makes no difference by age here: bringing Dot in is open to everyone and asked of no one, so for a child at the earlier age the bringing-in is beyond the statement, as the game's own choice.
- `edu.us-ca.kindergarten.mathematics.objective.k-md-2` (`us-ca K.MD.2`): state-board-adopted-standard, confirmed. For a five-year-old only. In the game: one friend against one friend on the plank, and which end has more weight.
  Limits taken: exactly two objects, compared directly, on one feature; no units or numbers. Beyond the record, as the game's own choice: any ride with a stack on an end. Not taken: saying what the difference is.

No kindergarten record is named for the feelings part, and the game names nothing in its place. No California record is named for heavy and light at age 2: at the infant-toddler level the game names only `us-ca 1.1` and `us-ca 2.2`. No California record named here names a seesaw, a balance or any informal weighing means; under the California records the seesaw is the game's own choice. Being left out and inviting someone in are named by no California record on this sheet; that situation is the game's own choice. Every feelings record named here speaks of other people; in the game the other is a character.

### nl

Levels, as the lookup printed them on 2026-10-03: `peuters` at ages 2 and 3, and for a child who has only just turned 4 (up to the fourth birthday); `fase-1` at age 4 (groep 1) and at age 5 (groep 1 or groep 2). Age mapping: convention. Gap: none printed. From age 4 the lookup also returns the `einde-po` lane, labelled end-of-primary goals; the game uses no record from it.

Every record below is a statement of an SLO content card: curriculum-institute-guidance, not law. A peuter card says what is offered to children of about 2 to 4 before school, and a fase 1 card what a school offers in groep 1 and 2, with no year stated; neither says what a child must be able to do.

- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-meten-meetkunde-meten-gewicht-1` (`nl Gewicht / 1`, peuters, mathematics card): curriculum-institute-guidance, confirmed. In the game: finding out by play which friends are heavy and which are light.
  Limits taken: no units and no scales. Not taken: recognising the words for heavy and light, since the game shows and speaks no word.
- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-meten-meetkunde-meten-gewicht-2` (`nl Gewicht / 2`, peuters, mathematics card): curriculum-institute-guidance, confirmed. In the game: setting friends against each other and seeing which is heavier and which lighter.
  Limits taken: no units and no numbers. Not taken: recognising the comparison words.
- `edu.nl.peuters.mathematics.objective.inhoudskaart-rekenen-wiskunde-peuters-meten-meetkunde-meten-gewicht-3` (`nl Gewicht / 3`, peuters, mathematics card): curriculum-institute-guidance, confirmed. In the game: experience with an informal weighing means, the seesaw, which the card itself names.
  Limits taken: informal means only; no grams, kilograms or scale with numbers.
- `edu.nl.peuters.practical-life-feelings.objective.inhoudskaart-sociaal-emotionele-ontwikkeling-peuters-sociale-competenties-de-ander-besef-van-de-ander-open-staan-voor-de-emoties-van-een-ander-4` (`nl Open staan voor de emoties van een ander / 4`, peuters, social-emotional card): curriculum-institute-guidance, confirmed. In the game: a simple reaction to Dot, who stands apart.
  Limits taken: a basic reaction, with nothing saying the need is met, so one tap is all there is and nothing judges it. Left open by Limits: which needs and whose. A friend standing apart is the game's own choice.
- `edu.nl.fase-1.mathematics.objective.inhoudskaart-rekenen-wiskunde-fase-1-meten-meetkunde-meten-gewicht-4` (`nl Gewicht / 4`, fase 1, mathematics card): curriculum-institute-guidance, confirmed. In the game: comparing by weight.
  Limits taken: no instruments and no units are named. Left open by Limits: the number of objects. A stack against one friend is the game's own choice. Not taken: ordering by weight.
- `edu.nl.fase-1.mathematics.objective.inhoudskaart-rekenen-wiskunde-fase-1-meten-meetkunde-meten-gewicht-5` (`nl Gewicht / 5`, fase 1, mathematics card): curriculum-institute-guidance, confirmed. In the game: measuring with an informal weighing means, the seesaw, which the card gives as an example.
  Limits taken: no standard units and no scale with numerals.
- `edu.nl.fase-1.practical-life-feelings.objective.inhoudskaart-sociaal-emotionele-ontwikkeling-fase-1-sociale-competenties-de-ander-besef-van-de-ander-herkennen-begrijpen-van-en-aanpassen-aan-emoties-van-anderen-4` (`nl Herkennen, begrijpen van en aanpassen aan emoties van anderen / 4`, fase 1, social-emotional card): curriculum-institute-guidance, confirmed. In the game: the child may let how Dot is, and where it stands, change what they do next.
  Limits taken: the statement names no behaviour, so the game prescribes none.

Being left out and inviting someone in are named by no Dutch record on this sheet, so for the Netherlands that situation is the game's own choice. The peuter statement on making contact with other children was read and is not named: the feelings part rests on reacting to another's need, not on making contact. Every feelings record named on this sheet speaks of other people; in the game the other is a character, and the claim says so. No Dutch record is named for causing an effect and guessing what comes next, and no Dutch science record that was read names weight or balance; the game names nothing in their place.

### Where the two differ

- **Where weight sits.** In the California foundations weight is an example property in a science foundation (`us-ca 2.1`) and something to compare in a mathematics foundation (`us-ca 3.1`). In the Dutch cards named here it is in the mathematics card only. The game shows no subject, so nothing in the play depends on the difference.
- **The seesaw.** The Dutch cards name a seesaw as a weighing means. No California record here names one. The game follows the Dutch cards; under the California records the seesaw is the game's own choice.
- **Age 2.** At age 2 the one California foundation named here for what happens on the plank, `us-ca 1.1`, is about cause and effect and names no weight. The Dutch peuter cards named here, for about 2 to 4, name heavy and light. The first position follows California: a tap on any of the other friends resolves it and nothing about weight has to be worked out. Heavy and light are there to be found from the first minute, as in the Dutch cards, and nothing asks for them.
- **How many objects.** The later California statement and `us-ca K.MD.2` compare two objects. The Dutch cards set no number. The game follows the Dutch cards, which leave the number open: a stack is the game's own choice. Under the California records a stack is beyond the record, and `us-ca K.MD.2` is claimed for one-against-one rides only.
- **Helping.** In California a response that could help comes only sometimes at age 2, helping is absent from the earlier preschool statement, and it appears in the later one, at times with an adult's support. The Dutch peuter card asks a basic reaction and the fase 1 card names no behaviour. Nothing in the play depends on the difference: at every age the response is open, never asked for and never rated, which asks no more than any of these statements.
- **Words.** The Dutch peuter cards include recognising weight words, and the California mathematics foundation includes telling what was noticed. The game takes neither, under its own wordless rule, so nothing in the play depends on the difference.

### The claim

Princess Playground is designed from five California learning foundations published by state departments, which are foundations and not standards (`us-ca 1.1` Exploration and `us-ca 2.2` Social Interactions for infants and toddlers; `us-ca 3.1` Measurement and Data, `us-ca 2.1` Physical Science and `us-ca 1.8` Self for preschool and transitional kindergarten); for a five-year-old, in its one-against-one rides only, from one California content standard adopted by the State Board, `us-ca K.MD.2`; and from seven statements of SLO's Dutch content cards for peuters and for fase 1, which are curriculum-institute guidance and not law (`nl Gewicht / 1`, `2` and `3` and `Open staan voor de emoties van een ander / 4` for peuters; `nl Gewicht / 4` and `5` and `Herkennen, begrijpen van en aanpassen aan emoties van anderen / 4` for fase 1). Every one of them was `confirmed` when read on 2026-10-03. From them it takes this and no more. Causing an effect and guessing what comes next: from `us-ca 1.1` alone; no Dutch record is named for it. Exploring and comparing how heavy things are: from `us-ca 2.1`, `us-ca 3.1` and `us-ca K.MD.2`, and from `nl Gewicht / 1`, `2` and `4`. Doing that on an informal weighing means, a seesaw: from `nl Gewicht / 3` and `5` alone; under the California records the seesaw is the game's own choice. Noticing how a friend in the game is doing and answering with one simple act that is never required: from `us-ca 2.2` and `us-ca 1.8`, and from the two Dutch social-emotional statements; all four speak of other people, and the game offers a character in their place. A friend who stands apart and is brought in is the game's own situation, named by none of these records. It says nothing about what any child has reached.

## The look

Written after the spike of 2026-10-03. Not part of the sheet.

**The claimed look: sand tray** (the first row reserved for this game in the look ledger). A shallow walnut tray of pale sand on a cool grey-blue cloth, seen from the child's side and a little above. The sand is one material, raked into even lines that bend into rings round the stone, and a low light from the left picks out every line, groove and dimple. The only objects are smooth stones: a dark stone with a slate plank across it, and four painted pebbles. Nothing is made of sand, and nothing is clay.

How it stays apart from the claimed looks: Pebble Table is plasticine with thumbprints under stop-motion light on a table of many things; here there is one granular surface that records what touches it, hard glossy stones, and no depth blur.

**Palette.**

| What | Colour | Why |
| --- | --- | --- |
| Sand | `#e9d3a9`, warm and pale | The plain surface under the working pieces. |
| Sand in shade | cool violet-grey over the same sand | Shade is a hue shift, so a groove reads as depth and not as dirt. |
| Tray | `#5a3b2a` walnut | Darker than everything in it: a frame, never a target. |
| Cloth | `#6f8794` | Cool and quiet behind a warm tray. |
| Stone and plank | `#2f3340`, `#56617a` slate | The working pieces: plain, no pattern, a hue the sand does not have. |
| Pim | `#ff6a55` coral, cream shell crown | The smallest gets the hottest colour so she is never lost. |
| Mog | `#19c2ae` teal | Told from Dot by hue and by his two ear bumps. |
| Dot | `#d3c9e8` alone, `#8c56e0` in company | The one colour in the game that changes, and it changes only with company. |
| Bo | `#1d6a8c` deep blue-green | The darkest and largest: weight you can see. |

No friend is yellow, tan or brown: those belong to the sand and the tray.

**Materials.** The sand is one flat plane. Its relief is a 512 by 320 height canvas that the fragment shader lights from the slope (two taps each way); grains are a hash; the soft shadows of the four friends and the plank are uniforms in the same shader. The plane is never displaced. Stones are glossy standard materials with a small soft highlight, no texture. Faces are flat unlit ink and white, so they read at any angle of the light.

**Lighting.** One directional light, low from the left and a little behind, warm; one cool hemisphere fill. No shadow map and no post pass. Shadows on the sand fall to the right and stretch, as a low light makes them.

**Motion rules.**

- Nothing passes through anything. A hop goes up before it goes across and comes down from above, and arcs over whoever stands in its way; a carried friend rises before it goes over anything; a friend on another sits on the very top of it and rides its squash and its lean; a friend leaving the plank leaves at once.
- Every friend moves by its own numbers (`personality.ts`): Pim snaps back at once and her crown lags; Mog is smooth, gathers himself longest for his size and goes long when lifted; Dot takes small low hops and wobbles softly for a while; Bo rocks to get going, lands flat and his belly goes on wobbling. A test fails if two friends come to share a set.
- A hop gathers, leaps, arcs and lands with a squash; nothing teleports. A friend let go by the finger falls straight to its place.
- The plank is the heaviest thing on screen: it turns faster the bigger the difference, knocks on the sand, rebounds a little and lies still. With equal weights it floats and sways.
- The working pieces move only as the idea needs. The plank and the stone have no idle motion; the friends breathe and blink, which adds no bulk and changes no weight.
- Everything runs on attended game time at a fixed step of 1/120 s, with one seeded stream that only picks ordinary detail (when a blink falls).

**Tiers** (`config.ts`). A tier changes drawing only.

| Tier | Pixel ratio | Grain | What still holds |
| --- | --- | --- | --- |
| 0 | 2 | full | Everything. |
| 1 | 1.5 | full | The same look, softer edges. |
| 2 | 1.25 | 0.7 | Fewer flashing grains. |
| 3 | 1 | 0.5 | Raked lines, grooves, shadows and every friend as before: it is still the sand tray. |

**The small things.**

- The rake: a small terracotta rake lying on top of the far rim, in the middle, where nothing ever stands in front of it. It is out only while the sand holds a mark. Touched, it is drawn along the rim from one side of the tray to the other, and the sand is raked again across its whole depth as it passes.
- The grains: a fixed pool of 72 pale points thrown up by a knock or a landing, falling back in under half a second. One draw, no body, no mark.
- The ghost hand of the idle ladder: a pale mitten with one finger out, drawn once on a canvas, tilted so that it comes in from the side and comes down on the top of a head, never over a face. It is a picture of a hand, not a sign to read.
- The idle glow: a warm ring of light on the sand under the one friend the ladder shows, drawn in the sand's own shader.
- A shut eye is a dark line: the white is put away. Pim's crown slips to the side of her head when a friend sits on her; Mog's ears lie back.

**Budget.** 24 to 26 draw calls and about 16,400 triangles with everything on screen, read from the renderer. No shadow map, no post pass, pixel ratio capped at 2, one 512 by 320 texture sent again only in a frame that marked the sand. Every program is compiled and drawn once, hidden, at mount. No frame rate has been measured: this machine has no graphics card.

## The registry row, for the lead

For section 3 of `docs/art-direction.md`, when the game is merged:

| Game | Style | Art guide |
| --- | --- | --- |
| Princess Playground | Sand tray 3D: one shallow walnut tray of pale raked sand under a low raking light, lit from a height canvas so every groove, dimple and bite shows; a slate plank on a dark stone and four glossy painted pebbles (coral, teal, lilac to violet, deep blue-green) as the only objects | [`games/princess-playground/ART.md`](../games/princess-playground/ART.md) |
