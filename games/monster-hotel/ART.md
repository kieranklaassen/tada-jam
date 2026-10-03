<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

- **Band.** The manifest says 9 to 12. The design is held to a nine-year-old.
- **The cue-table row.** The row for 7 and up governs. Its "Avoid" column is taken as a hard limit: no written word or letter, no symbol that stands alone so that play depends on reading it, no timer, points or verdict chrome, and no long chain of hints. Several things may be open at once as long as each reads at a glance.
- **The pack's rule for the age** (pack: game-design, ages-9-to-12.md). The hotel is a real system that behaves the same way every time: noise goes through walls, warmth rises, cold sinks, a smell drifts along a corridor. Any arrangement that leaves every guest content stands, and there are always several. A wrong arrangement is large, funny and free. The humour is dry and is not explained. Nothing is stored as a best, and nothing is compared.
- **Symbols.** The band starts at 9, so numerals and mathematics signs are allowed, each laid on or beside the quantity it stands for and drawn only in `symbols.ts`. This game lays numerals in one place: beside the flames on the dial of the stove and beside the icicles on the dial of the ice box, where the numeral names the step the child has just set. The flames and the icicles say the same thing without it, so play never depends on reading a numeral. No letter and no word is drawn anywhere. None is drawn in this run: the module comes with the next one.
- **Guided discovery** (pack: game-design, guided-discovery.md). The band lies across the rule's line at ten. The game takes the older form for every child: the child tries first, and the first time a new thing has been in play, the porter shows one neat way with it after the child's own arrangement has settled the hotel.
- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order: the first place, `two-guests`, for a child of 9 or 10, and the second, `heat-and-snow`, for a child of 11 or older. No age (`null`), or an age below 9, starts at the first place. A saved place always wins over the age. Every guest, room and thing can be reached by play at every age, and nothing is hidden or locked by age.

## The toy

**Touch a guest, and the whole page is drawn again from where that guest stands.**

- **What the finger does.** It lands on a monster. In the same frame the monster squashes and gives its own grunt, and the redrawing starts at its feet and sweeps outward across the hotel in about a third of a second. The finger does not have to lift for any of this.
- **What the page becomes.** The same hotel, as that guest takes it. Its own room is drawn large and everyone else's small. Whatever reaches its room is inked by how this guest takes it: a thing it loves in the one spot colour with curls and flourishes, a thing it minds in heavy black scribble that shows the wall or floor it came through, and everything it does not care about in faint pencil. Each guest has its own hand: the bat hangs from its ceiling, so its page is upside down; the yeti's lines drip wherever it is warm; the blob with many eyes sees the page several times over, slightly apart.
- **What the ear gets.** While the page is one guest's, the hotel is heard as that guest hears it. The tuba next door is a round tune from the troll's own place and a flat blare from the place of the blob trying to sleep. Each guest's grunt is its own, with several variants that follow where and how fast the finger landed.
- **Back and across.** Touching another guest sweeps the page straight to that one's view. Touching the same guest again, or the paper margin, sweeps it back to the plain page.
- **Carrying is looking.** A finger that lands on a guest and moves picks the guest up, and for as long as it is carried the page stays that guest's, so the child sees what would reach it in each room it is held over. Setting it down returns the plain page. A carried guest dangles, stiff and unbothered, with its luggage swinging behind.
- **Why it is a pleasure with no goal.** In a scene with one hotel, two guests and nothing to settle, flipping the page between two creatures who take the same building in opposite ways is funny on every touch: the building turns over, swells, drips and changes its tune. Nothing can go wrong, random touches always redraw something, and a person watching can tell in three seconds that the child is looking through the monsters' eyes. Everything else in the scene answers a touch too: a wall knocks and every guest looks toward the knock, a room's lamp swings, the lift bell rings.
- **In the first build of the toy** there is the hotel, two guests and the day-and-night wheel on the roof, and no arrangement is asked for.

## The object-by-action grid, and what is new on day 15

Six things the child handles, five things done with each. Every cell is a different sight and sound, and none is refused. "Wrong" uses are marked ✗: each works, changes the hotel truly, and is at least as funny as the right one.

| | set down in a room | given to a guest | fixed to a wall or a floor | tapped | left through a day and a night |
| --- | --- | --- | --- | --- | --- |
| **a guest** | moves in: the bag thuds, the bed is tested, and from now on what it gives off starts from here | in a room with a spare bed the two share it; otherwise they swap rooms, passing in the corridor without a glance | ✗ sticks half through the plaster while both neighbours stare, then steps out into the nearer room | the page is drawn again from where it stands (the toy) | awake it does its one thing, asleep it sleeps in its own way; what it gives off reaches the others only at its own hours |
| **the quilt** | ✗ lies on the bed and stops nothing; whoever sleeps there tucks in | ✗ wraps the guest from head to foot: a wrapped guest makes no noise, which a sleeper next door likes and a musician minds | hangs padded: no noise, warmth or cold crosses that wall or floor | puffs feathers, and the nearest guest sneezes | stays, with the marks of what it stops piling up against it |
| **the pipe** | ✗ stands in the corner like a hat stand and carries nothing; a guest peers down it | ✗ becomes a trumpet: whatever that guest gives off carries one room further | joins the two rooms: smell, warmth and cold pass through it both ways | toots a puff of whatever is passing through | carries what is being made at that hour and nothing at the other |
| **the stove** | warms the room by its dial; the warmth rises to the room above, one step weaker with each floor | goes into that guest's room, and the guest takes to it in its own way: one hugs it, one sits on it and sags | ✗ scorches a patch of wallpaper and slides into the nearer room | the dial turns a step: one flame, two, three, then one again | burns the same by day and by night |
| **the ice box** | chills the room by its dial; the cold sinks to the room below, one step weaker with each floor | goes into that guest's room: one uses it as an armchair, one goes stiff as a plank | ✗ frosts a patch of wall and slides into the nearer room | the dial turns a step: one icicle, two, three, then one again | chills the same by day and by night |
| **the alarm clock** | ✗ stands by the bed and rings at dawn and at dusk; a sleeper opens one eye, glares and sleeps on | a guest who will change its hours keeps it and swaps its day for its night; one who will not deals with it in its own way and keeps its hours | ✗ hangs as a wall clock and changes nothing | rings, and every sleeper in the house opens one eye | whoever holds it wakes and sleeps the other way round |

Beside the six: the day-and-night wheel on the roof, which the child turns by hand and which turns nothing by itself, and the coach at the kerb.

**How each thing travels** is the hotel's whole rule language, and it never changes:

- Noise goes through every wall, floor and ceiling of the room it is made in, and loses a step each time.
- Warmth rises through ceilings and cold sinks through floors, each losing a step a floor. Warmth and cold in one room add up.
- A smell drifts sideways along its own floor and loses a step a room. It does not cross a floor.
- A quilt on a wall or floor stops noise, warmth and cold there. A pipe lets smell, warmth and cold through there.

**On day 15** the child knows the eight guests' tastes by heart and places from knowledge; has found pairings that turn a nuisance into a treat (the fly beside the cook, the cook humming to the tuba through the wall); pipes a smell or a warmth across the house to the one guest who wants it; lets a day sleeper and a night sleeper share one bed in shifts; has met the guest who is content only when somebody hears her; and builds, on purpose, the hotel in which everyone is as cross as can be. Some pairings always set off a small scene of their own (the yeti and the stove at three flames; the tuba and the singer through one wall). They are never hinted at, counted or listed.

## The representation

- **The idea.** People take the same thing differently because of who they are; a quarrel comes from wants that collide; and it is settled when the worry behind each side's demand is met, which is not always what either side first asked for.
- **How it appears in the objects.** Two views of one scene, extended to as many views as there are guests. The hotel is one building and one set of facts: this noise goes through this wall. Each guest's page draws those same facts in its own way. The tuba's noise is one set of marks crossing one wall; from the troll's place the marks are a flourish, from the sleeper's place a scribble, from the yeti's place faint pencil. The difference between two guests is therefore something the child sees by changing places, with nothing said.
- **Demand and worry are two different things in the world.** A guest's demand is a room: in the lobby it stands with its bag and stares at the door it wants, and two guests often stare at the same door. Its worry is what must or must not reach it: cold, quiet while it sleeps, an open nose. The demand is visible on the plain page; the worry is visible only from the guest's own place. An arrangement settles the hotel when every worry is met, whichever doors were asked for.
- **Why this shape.** A want is drawn as something that physically travels and arrives, so "it bothers me" always has a place and a path, and the child can change one thing on that path. Feelings are read from what a creature does (it turns to the wall the trouble comes through, with a pillow on its head), never from a row of faces to choose from.
- **Evidence.** The table in `research/learning-games-that-work.md` of the game-design pack gives, for another's perspective, "two viewpoints on one scene" with the mechanic of swapping seats and giving each what that one would want, and names ages 4 to 6 for it. The studies behind it trained children of about five. Using it at 9 to 12, with many viewpoints and with wants that collide, is this game's own extension and has no trial behind it. The pack also says the evidence in this strand is thin and that such a game is rehearsal, with the real learning off screen. The sheet claims no more.
- **Object, picture, symbol.** The order stops at the picture. A feeling or a point of view has no school symbol, and none is invented: no face icons, no hearts, no meters. The only symbols in the game are the numerals on the two dials, laid beside the flames and icicles they count, and they belong to the stove and the ice box, not to anyone's feelings.

## The four mechanic questions

- **Swap.** No. What the child does is look from one guest's place and then another's and arrange the house so that what each minds does not reach it. Put sums or spelling in place of the guests' wants and no game is left.
- **Attention.** At the moment of setting a guest or a thing down, the child must look at what reaches which room and think about how the guest in that room takes it, which is different from how the guest next door takes it and from how the child would.
- **Fun.** The skill is used in the two most enjoyable moments: the redraw when the finger lands on a guest, and the hotel's reaction, room by room, to a new arrangement. Play never stops for a question.
- **Guess.** In the first two places of the order, often yes, and that is meant: with two or three guests in four rooms, between one way in eight and every way of giving out the rooms settles the house. From the third place on at most one way in eight settles it with nothing placed, and once things can be placed a house has from about two hundred to many thousands of arrangements. Trying them blind is far slower than looking, and each wrong one shows where and why. Trying is never refused or punished, so it stays a legitimate way to play. A test holds both shares for every cast.

## The error as a consequence

There is no wrong move, only an arrangement that leaves somebody cross. The hotel runs every arrangement truly and shows what it does.

- **What it does.** A guest reached by something it minds shows it at once, in its own room and in its own way: the blob drags the pillow over all of its eyes, the lizard goes grey and stiff, the yeti sags into the shape of a puddle, the bat wraps itself tighter.
- **Where.** The guest turns to the wall, floor or ceiling the trouble comes through. On the plain page the marks of that air are drawn crossing it. In the first three places of the order they are drawn the whole way from the one who makes them; from the fourth place on, the plain page shows only the last crossing, and the whole path is seen from the guest's own place. So feedback is fullest while the game is new and thins afterwards.
- **Why.** From the cross guest's place the page inks the path in heavy black, back through each wall to the guest or thing it starts from, at the hour it is made. Turning the wheel shows whether it is a day trouble or a night trouble.
- **The state stays.** Nothing is undone, nobody storms out, nothing is taken away and nothing resets. The child changes one thing and the house answers again.
- **It is about the thing.** A cross guest glares at the wall and never at the child. Being cross is as good to watch as being content, and a house full of cross guests is the funniest house.
- **Success is a consequence too.** A content guest simply does its one thing undisturbed: the tuba is played, the stew is stirred, the bat sleeps.
- **No verdict.** No tick, cross or buzzer, no praise, no meter of contentment, no count of content guests, and no face turned to the child.

## The designed order, and what is stored

**The order.** Ten places, one new thing at each and then combinations. The ids below are the ones in `LADDER` in `config.ts`. They name what is in the house and never a grade, a groep or a level.

| Place | Id | New here |
| --- | --- | --- |
| first | `two-guests` | a house of four rooms; two or three guests; noise, and who sleeps when |
| second | `heat-and-snow` | warmth that rises and cold that sinks: the boiler under one column, the snow hole over another, the lizard and the yeti |
| third | `quilt` | the first thing to place: the quilt |
| fourth | `corridor` | the long house of two floors by three rooms; a smell along a corridor; the cook and the fly |
| fifth | `stove-and-ice` | warmth and cold of the child's own making, with the dials |
| sixth | `alarm-clock` | time as something that can be asked for: guests who will change their hours and guests who will not |
| seventh | `tower-and-pipe` | the tower of three floors by two rooms, and the pipe |
| eighth | `twin-rooms` | more guests than rooms, and rooms with two beds |
| ninth | `listener` | the singer, who is content only if someone awake hears her and does not mind |
| tenth | `full-house` | everything at once: five guests and three things |

- Each place has three **casts**, written by hand in `casts.ts`: the house and what is fixed in it, the guests, the things in the cupboard, and one guest on the bench outside. A test solves every cast and fails unless at least two different ways of giving out the rooms settle it, so "there are several" is checked and not hoped for.
- **The harder option looks harder and is chosen.** On the bench outside sits one more guest with a mountain of luggage, plainly awkward, and sometimes one the child has not met in a coach yet. The child may carry it in at any moment and carry it out again. It is never needed, every house keeps a bed spare for it, and a test holds that the house can still be settled with it in.
- **A cycle** runs from a coach-load arriving to the hotel being settled: every guest in the house content by day and by night.
- **Goes well:** settled within three set-downs for each guest in the house. Only set-downs that change the arrangement are counted. Looking from a guest's place, tapping and turning the wheel are free, so looking more is never held against the child. **Mixed:** settled with more set-downs. **Badly:** the child carried a guest out to the coach before the house was settled, which sends this lot away. A visit put away before either leaves the place where it was. The count is kept only to judge the cycle and is shown nowhere.
- **Which customer a new position lays out.** The coach waits with its blinds drawn, and who is in it is decided when the child touches it, from the place as it stands then. So a place that moved when the last cycle was judged shows on the very next coach-load, and nobody who was already visible is changed.
- Nothing shows the place: no number, no label, no map, and no sign that the next house is easier.

**What is stored**, every field, as plain JSON through `ctx.storage`:

| Field | Holds |
| --- | --- |
| `v` | the version of the shape |
| `position` | the id of the child's place in the order |
| `finished` | the cycle on screen has been judged; nothing replays on load |
| `cast` | the id of the cast on screen |
| `round` | how many coach-loads have begun, wrapped at 10,000; it only rotates the casts of a place |
| `at` | for each guest of the cast, where it is: a room, the lobby, the bench, or gone with the coach |
| `kit` | for each thing of the cast, where it is (the cupboard, a room, a wall or floor, a guest) and, for the stove and the ice box, its dial from 1 to 3 |
| `phase` | day or night, as the wheel was left |
| `from` | the guest whose place the page is drawn from, or none |
| `moves` | the set-downs of this cycle that changed the arrangement, capped at 999 |
| `shown` | the ids of the places whose neat way the porter has already shown |

A thing or a guest in the hand is saved where it came from. The marks of noise, warmth and smell, every guest's mood, and the hour's goings-on are worked out from these fields and are never stored. A largest legal state is under 2 KB, and a test holds it under half of the 64 KB cap.

**The numerals in the rules.** The dial of the stove and of the ice box is a whole number from 1 to 3 in `kit`. A pure function lists every numeral the page may draw as a value and the thing it lies on, and it lists the two dials only.

## The characters and their fixed tastes

Eight guests. Each has one want that can be seen from across the room, and tastes that never change, so a child can learn them and test them on purpose. "Minds" and "must have" make a guest cross; "loves" makes a content guest plainly happier and is never needed.

| Guest | The want you can see | Awake | Gives off | Must have | Minds | Loves | Will change its hours |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **the troll with the tuba** | to play all night; it carries the tuba everywhere with its lips already pursed | night | noise, two rooms' worth, while awake | to be free to play (not wrapped in the quilt) | nothing: it sleeps like a log | | yes |
| **the bat** | to sleep all day in the cool, hanging; the eye mask is already on its forehead | night | nothing | a room that is not warm | noise while it sleeps | | never |
| **the blob in pyjamas** | to sleep all night in peace; it clutches its pillow | day | nothing | a room neither warm nor cold | noise while it sleeps; a smell at any hour | being wrapped in the quilt | yes |
| **the yeti** | to be cold; it leads its own snow cloud on a string | day | cold, always, which sinks | a cold room | nothing else | | yes |
| **the lizard in a scarf** | to be warm; it shivers and hugs a hot-water bottle | day | nothing | a warm room | noise while it sleeps | | never |
| **the cook** | to stew all day; the cauldron is on its back and the spoon in its fist | day | a smell while awake; a little warmth always | a room that is not cold, or the stew will not simmer | nothing | noise, which it hums along to | never |
| **the fly** | to smell something rich; its nose is in the air and its napkin tucked in | day | a small buzz while awake, heard only in its own room | a room that is not cold | nothing | a smell | yes |
| **the singer** | to be heard; she is a ghost with her mouth open and her music held out | night | noise, three rooms' worth, while awake; a little cold always | someone awake within reach of her voice who does not mind it | a smell at any hour; a warm room | | never |

- **Who else is in the scene.** The porter, an old tortoise with a luggage trolley, carries things and shows the neat way; the coach driver waits. Neither has an opinion of the child or of an arrangement.
- **Feelings are about the house.** A guest is cross with a wall, a smell or a neighbour's tuba. No guest is ever disappointed in the child, thanks or praises the child, hurries the child, or notices the child leaving or coming back. A guest left in the lobby waits beside its bag for as long as it takes and does not complain.
- **A joke is never cruel.** The guest a wrong use lands on is bewildered and never hurt: the lizard that goes stiff as a plank thaws as soon as it is warm.

## The scenes

Every scene is a list of timed beats on the attended clock, filled in from the house as it stands. Its outcome is saved when it starts, any touch ends it with everything at its end state, and none plays on load.

1. **The settled day** (the ending, 8 to 10 seconds). Cause: the finger lifts from the set-down, or from the turn of a dial, that leaves every guest in the house content by day and by night. Beats: the page shows one night and one day go by; at night each night guest does its one thing in exactly the room the child gave it, by day the others do; each love plays (the fly leans into the smell coming through the wall, the cook hums to the tuba); every sleeper sleeps through; the wheel comes to rest where the child had left it. Filled in from: who is in which room, what is fixed where, and who loves what reaches them.
2. **The porter's neat way** (6 to 9 seconds, joined to the settled day as one scene). Cause: the first settled day at each place, when the child's arrangement is not the cast's neat one. The neat one settles the house with the new thing of that place put to use and with nothing placed idly. Beats: the porter trundles in and rearranges the house into it, the guests take it in their own ways and, where the cast allows it, one of them is plainly happier than before; a held moment; the porter puts everything back exactly as the child had it. It is a second arrangement beside the child's own, shown after the child's has already stood, and never a correction. It is shown once for each place and changes nothing that is saved except the mark in `shown`.
3. **The coach changes over** (about 6 seconds). Cause: the child touches the waiting coach after a cycle has been judged. Beats: the door opens; the old guests file out with their bags past the new ones without a glance; the porter trundles the things back to the cupboard; each new guest plants its bag in the lobby and turns to stare at the door it wants; the coach pulls away and the next one pulls up with its blinds drawn. Filled in from: who leaves, who arrives, and which doors they stare at.
4. **Sent away** (about 5 seconds). Cause: the child sets a guest down on the coach before the house is settled. Beats: the rest follow it out in a line, unbothered; the things go back to the cupboard; the coach pulls away and the next pulls up and waits.
5. **Pairings** (about 4 seconds each). Cause: one exact combination, every time it is made, such as the yeti in a room with the stove at three flames, or the troll and the singer on two sides of one wall at night. Beats: the two do one absurd thing together. Never hinted at, counted or listed.

**How a cycle ends and the next starts.** A settled house stays as long as the child likes and can be played with freely; it is not judged twice. If the child does nothing, nothing new starts: no countdown and no next round. The next coach-load is visible and waiting at the kerb, blinds drawn, and comes in only on the child's touch. Nobody who waits complains, hurries the child or refers to the child leaving or coming back. On the very first visit two guests already stand in the lobby staring at the same door, and a coach waits behind them. On load the house is as it was left: the same guests in the same rooms at the same hour, the page drawn from the same place, and the coach waiting.

## The records

Read from the pack with the lookup on 2026-10-03, one record at a time by its id. What each record asks is given in the pack's own Summary or in this game's words. No official wording of either jurisdiction is in this file.

### us-ca

Levels, as the lookup prints them for ages 9 to 12: `grade-4` at 9 and 10, `grade-5` at 10 and 11, `grade-6` at 11 and 12. Age mapping: derived. Beside every level the lookup returns the `cross-grade` lane, labelled cross-grade: its statements hold for every grade, not for this age in particular.
Gaps, as printed: at 9, "Grade 3 is not in the pack. A third grader turns nine during the year; grade 4 starts at nine." At 12, "Grade 7 is not in the pack. A sixth grader turns twelve during the year; a child who starts the school year at twelve is in grade 7."
No record is named in `grade-5`: its health areas hold nothing on conflict or on another's point of view, so for a child in grade 5 the game rests on the cross-grade records below only.

- `edu.us-ca.grade-4.practical-life-feelings.objective.4-4-2-s` (`us-ca 4.4.2.S`, Injury, Prevention, and Safety), level `grade-4`: state-board-adopted-standard, confirmed. Summary: the child tries out, together with other people, ways of settling a disagreement that work.
  Limits taken: it asks for practice with other people, so going through steps alone does not meet it. The game is not that practice: the child settles the quarrels of invented guests on a screen. The record shapes what a settlement is here (a way that works for both sides) and nothing more. Left open by Limits: no techniques are named; the ways the game offers (give out rooms, pad a wall, change an hour) are its own choice.
- `edu.us-ca.grade-6.practical-life-feelings.objective.6-4-4-m` (`us-ca 6.4.4.M`, Mental, Emotional, and Social Health), level `grade-6`: state-board-adopted-standard, confirmed. Summary: the child shows that they can use the steps for resolving a conflict.
  Limits taken: it is about using steps, not describing them. Left open by Limits: which steps and how many. The game's own choice is four, done and never named: look from each side's place, find what each one minds, change one thing, look again.
- `edu.us-ca.cross-grade.practical-life-feelings.objective.late-elementary-3-b-2` (`us-ca 3.B.2`, Late Elementary) [cross-grade]: voluntary-guidance, confirmed. In the game's words: who someone is can make them feel differently about the same thing than someone else does; the child is curious about that and tries to see it from the other's side.
  Limits taken: the band is tied to no grades, and using it for ages 9 to 11 is this game's own choice. Seeing the other side is something the child tries, with no claim of getting it right, so the game never rates a child's reading of a guest. The link between who someone is and how they react is a "may". Left open by Limits: no identities or experiences are listed; the guests' natures (a creature of the cold, a sleeper by day) are the game's own choice.
- `edu.us-ca.cross-grade.practical-life-feelings.objective.late-elementary-5-f-2` (`us-ca 5.F.2`, Late Elementary) [cross-grade]: voluntary-guidance, confirmed. In the game's words: use a way of deciding, and work out which option turns out best for everyone it touches.
  Limits taken: the band is tied to no grades, and using it for the whole of ages 9 to 12 is this game's own choice. The measure of a good choice is the outcome for all involved, so a house is settled only when every guest in it is content, the awkward ones included. Left open by Limits: no strategy is named.
- `edu.us-ca.cross-grade.practical-life-feelings.objective.middle-school-4-e-3` (`us-ca 4.E.3`, Middle School) [cross-grade]: voluntary-guidance, confirmed. In the game's words: look for an answer both sides can accept and that deals with the worry behind what each side demands.
  Limits taken: the band is tied to no grades, and using it for ages 11 and 12 is this game's own choice. The answer must be acceptable to both sides and must deal with the worry beneath the stated demand, which is why a guest's demand (a door) and its worry (what reaches it) are two things in the house. The statement has the young person do this with peers and adults; the game has neither. Left open by Limits: who the two sides are, and any method.

Named in the brief and not used: `us-ca 4.E.2` (the child has no view of its own to put across in this game) and `us-ca 5.B.2` (fair treatment of the child is not what the play is about).

### nl

Levels, as the lookup prints them: `fase-2` at 9 (sub-band groep 5 or groep 6) and at 10 (groep 6), `fase-3` at 10 (groep 7), at 11 (groep 7 or groep 8) and at 12 (groep 8). Age mapping: convention. Beside every level the lookup returns the `einde-po` lane, labelled end-of-primary goals: what a school works towards by the end of groep 8, not what a child of this age should master.
Gap, as printed at 12: "A child who starts the school year at twelve is usually in secondary school, which is not in the pack."

- `edu.nl.fase-2.practical-life-feelings.objective.63ee1a28-33a1-445e-862d-d585781b707e` (`nl ojw/ja/1/07/fase2`), level `fase-2`: curriculum-institute-guidance, confirmed. In the game's words: feel with others and take their feelings, wishes and views into account.
  Limits taken: it says what a school can offer in the band and names no year. Left open by Limits: who the others are, the situations, and how far the child's own wishes give way. The game's own choice: the others are invented guests, and the child has no wish of its own in the house.
- `edu.nl.fase-2.practical-life-feelings.objective.2e948105-5608-4b0d-841e-120ea841b914` (`nl ojw/ja/1/06/fase2`), level `fase-2`: curriculum-institute-guidance, confirmed. In the game's words: talk about how a conflict can come from interests, views and feelings that pull against each other, and about how to deal with that.
  Limits taken: the verb is discussing. The game has no talk in it: it makes the opposed wants visible and leaves the talking to the child and whoever is in the room. Left open by Limits: the kinds of conflict, any method and the persons.
- `edu.nl.fase-2.practical-life-feelings.objective.5a82ef6a-dd10-4043-9079-4e3496f50b4b` (`nl ojw/ja/3/08/fase2`), level `fase-2`: curriculum-institute-guidance, confirmed. In the game's words: put into words how a simple conflict arose and which solutions are possible.
  Limits taken: it asks for words, not for solving, and the conflicts are simple and in the child's own surroundings. The game shows how each conflict arose (what travels from whom to whom) and lets several solutions stand; it asks for no words, and a monster hotel is not the child's own surroundings. Left open by Limits: any method.
- `edu.nl.fase-3.practical-life-feelings.objective.6e8d7c53-2728-4b1e-8022-38521338df36` (`nl ojw/ja/1/06/fase3`), level `fase-3`: curriculum-institute-guidance, confirmed. In the game's words: feel with others and deal with their feelings, wishes and views.
  Limits taken: an offer for the band, with no year. Left open by Limits: who the others are, the situations, and what dealing with these things consists of. The game's own choice: arranging the house.
- `edu.nl.fase-3.practical-life-feelings.objective.2ef57903-1287-4a2a-826b-2041c9a97309` (`nl ojw/ja/3/08/fase3`), level `fase-3`: curriculum-institute-guidance, confirmed. In the game's words: deal with conflicts in your own surroundings by finding solutions that suit every party.
  Limits taken: one way of dealing is named, solutions that suit all parties, and the game holds to it: a house is settled only when every guest is content. Left open by Limits: which surroundings, the kinds of conflict, and whether the child is a party or helps others. The game's own choice: the child is no party and settles things between others, in an invented place.
- `edu.nl.einde-po.practical-life-feelings.objective.conceptkerndoelen-2027-onderdeel-c-burgerschap-domein-samenleven-in-een-democratische-rechtsstaat-kerndoel-20-20-a-d` (`nl 20 A d`) [end-of-primary goals]: draft-not-yet-in-force, regime 2027-draft, confirmed. In the game's words: gain experience with dialogue, with dealing with conflicts and with treating people as equals.
  Limits taken: a draft core goal, not in force. It asks that the pupil takes part and names no result or level. Of its three things the game touches one, dealing with conflicts, and only in pretend; it holds no dialogue. Left open by Limits: with whom, about what and how.
- `edu.nl.einde-po.practical-life-feelings.objective.conceptkerndoelen-2027-onderdeel-c-burgerschap-domein-samenleven-in-een-democratische-rechtsstaat-kerndoel-20-20-b-e` (`nl 20 B e`) [end-of-primary goals]: draft-not-yet-in-force, regime 2027-draft, confirmed. In the game's words: gain experience with other people's points of view and experiences, with likenesses and differences, and with holding back a judgement.
  Limits taken: a draft core goal, not in force. It asks that the pupil takes part and names no result or level. Left open by Limits: who the others are and the situations.

### Where the two differ

- **What is asked at 9 and 10.** The California grade 4 record asks for trying out ways of settling a disagreement together with other people. The Dutch fase 2 records ask for taking others' feelings and wishes into account, and for talking about where a conflict comes from and which solutions are possible. The game follows nl for what the child does at that age: see what each side wants and minds, and find possible solutions. It does not follow the California record there, since arranging monsters is not practice with people. It also stops short of the Dutch records, which ask for talk and for words.
- **Solutions that suit every side.** In nl this is named for fase 3, ages 10 to 12, and at fase 2 only possible solutions are asked for. In us-ca the outcome for all involved is in voluntary guidance tied to no grade. The game lets only an arrangement that suits every guest settle the house at every place in its order: that is its own rule for what an ending is, taken from the nl fase 3 record and the us-ca guidance, and at 9 it goes beyond what the nl fase 2 records name.
- **Whose conflict.** The two adopted California records read as the child's own conflicts. The Dutch fase 3 record leaves open whether the child is a party. Here the child is a go-between and never a party, which the nl fase 3 record allows and which is beside what the two adopted California records describe.
- **Standing.** California has adopted standards on conflict for grades 4 and 6 and only voluntary guidance on taking another's point of view. The Netherlands has curriculum-institute guidance for both and a draft that is not in force; its core goals in force name neither. The two sets are listed apart and nothing in one is taken to stand for anything in the other.
- **"Fair."** No record named here defines fair as equal shares, and the game does not use the idea. A settlement is an arrangement every side can accept.

### The claim

Monster Hotel is designed from two content standards adopted by the California State Board of Education (`us-ca 4.4.2.S` for grade 4 and `us-ca 6.4.4.M` for grade 6), neither of which the game carries out, since both ask for practice or use among people; from three of California's Transformative Social and Emotional Learning competencies, which are voluntary guidance tied to no grade (`us-ca 3.B.2` and `us-ca 5.F.2`, Late Elementary, and `us-ca 4.E.3`, Middle School); from five fase goals of the Dutch curriculum institute, which are guidance on what a school can offer and not law (`nl ojw/ja/1/07/fase2`, `nl ojw/ja/1/06/fase2`, `nl ojw/ja/3/08/fase2`, `nl ojw/ja/1/06/fase3` and `nl ojw/ja/3/08/fase3`); and from two items of the Dutch draft core goals for 2027, a draft not in force (`nl 20 A d` and `nl 20 B e`). All twelve records were `confirmed` when read on 2026-10-03. The game says nothing about what a child has reached, practised or can do, and keeps no record of it.

## The look

Written after the style spike, not part of the sheet: the claimed look, the palette, materials, lighting and motion rules, and how each tier in `config.ts` keeps the look.
