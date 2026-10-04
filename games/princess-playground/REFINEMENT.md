<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: gates. Every gate this machine can run has been run at the tip and passed. **One gate could not be run here: the frame rate on a graphics card** (`npm run perf:jam -- princess-playground` in WebKit and throttled Chrome, and a physical iPad). The machine has no graphics card and no WebKit, so every frame is drawn in software and a frame rate read here would measure the software renderer. The lead runs it.
- Sheet: last passed in round 6 (checker H). Round 7 was open with four findings, all pasted as written; the sheet has changed in two more places since, so round 8 is asked for.
  - Round 1 (checker B): 16 findings, on commit `132bc32` (hash `05fd9b42…d82fd6`). All 16 pasted as written in `19240ad`.
  - Round 2 (checker D): 2 findings, on commit `19240ad` (hash `c2e26354…1661`). Both pasted as written in `67f6589`.
  - Round 3 (checker E): 3 findings, on commit `67f6589` (hash `10298789…5295`). All three pasted as written in `0cf0982`.
  - Round 4 (checker F): 1 finding, on commit `0cf0982` (hash `a44b954d…c9ab`). Pasted as written in `ca35987`.
  - Round 5 (checker G): passed, no finding, on commit `ca35987` (hash `eea42219…b03b`).
  - Round 6 (checker H): passed, no finding, on commit `ebd6aea` (hash `89ccbace…4d06`).
  - Round 7 (checker I): open, 4 findings, on commit `729b6fbf` (hash `9c1057ba1c87d26f63b53754085317fd3f07c8f60f8130653a5cb384ce859cc7`). The checker found all 33 sentences this lane had changed since round 6 in the sheet as listed, and no change that was not listed. The four replacements were pasted exactly as they stand in `5f758e48`, and the game was brought into line with each (see "Built in the last run before the merge").
  - Nothing was disputed in any round.
- Sheet now: commit `42edf1e49876673a9cd0cc627edc8b6d84696e19`, hash of the sheet part (everything above `## The look`) `cbd2928441660a016d4aa080b8d80c7b8068ecc4c44fdab50c9d719ff29d4862`, unchanged since that commit. Against the sheet of round 7 it differs in six places: the four replacements of that round, and two the last run changed because the game does more now (step 2 of the closing page). None touches the mechanic, the error, the designed order, the records or the claim, and none changes a saved field. Finding 3 of round 7 changes what happens on load, for a showing that was owed; the fifth change is to how the ending plays.
  - The band and its age rule, What follows for the hand, fourth and fifth sentences (round 7, finding 1). Old: "Each friend is a target of about 100 logical pixels or more, and none stands in the bottom strip where wrists rest. Where two stand close their pictures may touch; a finger on a friend's body always takes that friend." New: "Each friend is a target of about 100 logical pixels or more, and none stands in the bottom strip where wrists rest. Where the game sets the friends down for a ride they stand well apart. Where the child has stacked them or set them down close their pictures may touch; a finger on a friend's body always takes that friend."
  - The scenes, The ride, second sentence (round 7, finding 2). Old: "Cause: the plank carries the asker where it wanted to go." New: "Cause: the asker is where it wanted to go, carried there by the plank or set there by the child's hand."
  - The scenes, How a ride ends and the next begins, last sentence (round 7, finding 3). Old: "A showing that was due and had not begun plays when the game is opened, as the very first one does." New: "A showing that was due and had not begun when the game was put away does not play by itself when the game is opened: the ride is found laid out, as it was saved when it began, and the showing is still owed and plays the next time a ride of that kind is laid out."
  - Where the two differ, How many objects, second and third sentences (round 7, finding 4). Old: "The Dutch cards set no number. The game follows the Dutch cards, which leave the number open: a stack is the game's own choice." New: "The Dutch statement named here for comparing, `nl Gewicht / 4`, sets no number of objects. The game follows that statement, which leaves the number open: a stack is the game's own choice."
  - The scenes, The ride, beat 3 (the look run: the ending pays off at every difference). Old: "3. 1.8 s: the plank rocks three times, see, saw, see. How far each end travels comes from the two totals as they stand, and who is tossed how high from those and from how heavy the one tossed is: two friends of one weight fly equally high." New: "3. 1.8 s: the plank rocks three times, see, saw, see: the friends on the low end stamp, their end lifts well off the sand and comes down again with a knock, and whoever sits opposite is tossed. That happens at every difference between the two totals as they stand, the smallest too. A bigger difference brings the end down harder and throws higher, and a heavier friend is thrown lower: two friends of one weight fly equally high."
  - The grid, a new paragraph after the secrets and before Day 15 (the look run: the place round the tray, the stone's answer and the snail). New: "**Round the tray, and no part of the grid.** The tray stands on a woven mat on a veranda floor, with the light of a tree moving a little over the boards. All of it is ground, drawn fainter than anything in the tray, and nothing in it can be picked up. Two things outside the six answer a touch, each with one answer of its own. The stone under the plank: a small bright click, as of two pebbles touching, and a few grains hop at its foot; it moves nothing. The snail on the boards behind the tray: it creeps along slowly whatever is going on in the tray, is no part of any ride and weighs nothing on the plank. Touched, it pulls into its shell with one small hollow pop and its shell rocks; after a moment it looks out again, one eye and then the other, and creeps on. When an end of the plank comes down hard it pulls in too, without the pop and without rocking, and looks out again as before; when one comes down softly its eyes only flinch and turn toward the tray. It is never saved: on load it is on the boards, creeping."
  - Why the last two. The ending's rocks were sized by the two totals alone, and at one unit of difference, which is most rides, the end hardly lifted and nobody was tossed: the friends on the low end now stamp, so every rock is a knock and a toss, and the sentence says what is seen. And the frame was mostly empty cloth: it is now a place, with one stone that answers a touch and one snail, and each thing a child can touch and get an answer from is in the sheet.
- Open: sheet ready for check, round 8
- Reader: stopped after four readings. In truth after twenty-one: the bound came into the reader's page on the base branch (`2b180a8e`) after this lane had begun reading, and the lane saw it only when it fetched the page again before a twenty-second. No reading by this lane's reader ended READY; its last report is kept below. The lead then said that stopping was right and that no more readings are needed, and had its own reader go through the folder: wording, requests, names, record ids and drawn shapes clean, the saved fields the sheet's thirteen, nothing lost by a put-away in a drag or a scene, and two promises unkept. Both are built, with the seven further points the lead named: see "Built in the last run before the merge". Nobody but this lane has read that work.
- Answers handled: `docs/build/answers/princess-playground-1.md` to `-7.md` on the base branch.
- Look in use: sand tray, the first reserved choice. The owner has answered on the look: yes. He said of the set that some games look too minimal, so the look stayed and the frame was filled: see "The look run" below, and `ART.md`, "What is in the frame".
- Draw calls: 31 to 34 with everything on screen, about 18,600 triangles (before the look run: 25 to 27, about 16,400). The four quality tiers hold; the cheapest leaves out the moving leaf light.
- Stills: three, kept outside the repository, at 1180 by 820, pixel ratio 2, tier 0, on the production build at `/?chrome=0&seed=1#/play/princess-playground`, with a fresh slot and the shell's age set to 3, the clock paused and stepped. At rest before a touch: 4.4 s after the first frame. The middle of a cycle: a tap on Bo at 4.0 s, the still at 5.25 s. The funniest moment: Bo carried from his place onto Pim's head (down on Bo at 4.0 s, let go over the left end at 4.9 s), the still at 5.7 s.

**What the lead should try first.** Open the production build with a fresh slot and touch nothing for ten seconds: the first showing plays, then the glow, then the hand. Tap the friend the hand shows; watch the fling and the ending, whose three rocks now toss the asker each time; tap the friend who then waits in front of the stone. After that: carry Dot onto the plank (it warms and the others bounce), seat Mog against Dot (the plank floats and hums), stack all four on one end, let a friend go over the middle of the plank, draw in the sand and tap the rake on the far rim. Then the place: tap the stone where it shows under the plank, tap the snail on the boards and wait for it to look out, send Bo onto a high end and watch the snail, and carry Mog to the far rim to stand beside Dot. `?seed=1` fixes the detail for stills.

**Gates run at the tip, on this machine (2026-10-04).** The tip here is `c95a3d30`, the last commit that changes the game; the commits after it change only `ART.md` and this file.

- `npx tsc --noEmit`: clean.
- `npx vitest run games/princess-playground test/games.test.ts`: 457 passed.
- `npm run -s wordless:check`, `node scripts/egress-check.ts`: passed.
- `npm run build`, `npm run egress:built`, `npm run education:built`: passed.
- `npm run check:intersections -- princess-playground --ci` with `enforce: true`, on a build made from the tip: clean five times, two of them under full CPU load, each time 0 open, 30 allowed, 0 hidden, 415 samples, 33 pieces. Here it ran on the machine's own, older Chromium, reached through a scratch browsers path; CI runs it with the repository's browser. The audit plays the built files, so it is run only after a fresh build.
- The frame-budget test (`frameBudget.test.ts`) passes; the draw calls are read from the renderer in the stills: 31 to 34 at tier 0, 31 at tier 3.
- Not run, and why: the frame rate on a graphics card (above); and nobody has listened to the game, since the machine has no sound.
- CI, as far as it can be read from here (check runs through the API): green at `c95a3d30` and at `1ae4174a` (the audit's shards are skipped in these runs; of the two runs at each, one was cancelled by the push after it and the other passed). The run for the commit that wrote these lines is the lead's to read. Earlier in this run one commit, `aab42a66`, was pushed with one of this game's own tests failing (the tower's sway in an ending, after the ending's stamp was added); the next commit, `5f2e66f4`, fixed it and says so. Twice a run was red on a test of another game, `games/pebble-table/controller.test.ts:443`, at `00221b06` and at `cb940fd1`; each time the failed job was run again once and passed. This lane does not touch that test, and it is said once in a comment on draft pull request 37.
- One reading that carries over from before the closing run, and is older than the place round the tray, so it is only a first reading of the tray alone: the game's own work per frame in Chromium on SwiftShader, top tier pinned, production build, 1180 by 820 at pixel ratio 2, through eight taps: 1.8 ms at the 95th percentile unthrottled and 7.3 ms at six times CPU throttle, 25 draw calls. On this renderer the timed span includes the render submit.

**The last reader's report (the twenty-first reading, on `9e6e1a0c`), as it came back.**

> Every file in `games/princess-playground/` and `scripts/intersections/games/princess-playground.ts` was read; nothing was changed. Rule 6 doubts were replayed on the game's own model from a scratch folder outside the repository.
>
> 1. Official wording. Clean. The records part of `ART.md` glosses each record in short fragments of its own; nothing reads as lifted.
> 2. Web addresses and outside requests. Clean. Imports: `three`, `react`, `vitest`, `../types`, own files.
> 3. Names. Clean.
> 4. Record ids in the build. Clean: none in any `.ts` or `.tsx`.
> 5. Drawn text. Clean. The only text is the grown-up overlay (`overlay.ts`); `index.ts` holds the jam shell's listing emoji, which the game does not draw. Shapes, read in code and in the audit's stills: the rake (top centre) reads as a rake; the raked rings round the stone are ripples; the idle glow always has a friend in it; hollows are lipless dents; Dot's swirl is an open coil of over two turns.
> 6. The game does what its sheet says. Unkept; none is listed in `REFINEMENT.md`.
>    1. A touch on the friend a showing has moved is read from the saved ride, not from where the friend is seen. Worst at `high-asks`: from the tap on the waiting friend until Bo's hop in the showing, about 1.8 s, Bo stands or lands in the sand. A tap on him there takes him "off" the far end he is saved on: he stays in the sand, one move is counted, Pim's end stays down, the ride ends, is judged well and the position steps on. Milder, same cause: in the `little-asks` showing Pim tapped beside the plank hops to her home place; in `middle-asks` Pim tapped on the far end snaps to the sand and hops back on. Each counts a move.
>    2. Bo lifted by one unit is thrown one way round and not the other. Bo's chuckle starts before the end is down, and its first push always turns the right end down. Narrow: Bo must not be asking, so mostly play after a ride.
>    3. Held sways stop for a scene. A tower, or a stack with Bo on top, built on Pim's end at `high-asks` ends the ride and stands unswaying through the ending. Arguable.
>    - Comparison, numeral or reading leaned on and not shown: none.
>    - Saved: the thirteen fields of the sheet's table and no other.
>    - Put away mid-drag or mid-scene, replayed: no move is made or counted, marks still to come are saved, nothing replays. No fault found.
>    - Overlay: three touch-downs of one finger in the top right 72 px corner, at least 80 ms apart and within 700 ms, or `fps=1` in the address. A child drumming one finger on that bare corner could open it; the builder lists this.
>
> NOT READY: rule 1: 0, rule 2: 0, rule 3: 0, rule 4: 0, rule 5: 0, rule 6: 3

All three were as the reader said, and are built: see "Built after the twenty-first reading". The first changed one sentence of the sheet, which round 7 has since read. The overlay this report describes was changed in the last run: it now opens on a hold and three taps.

**Built in the closing run, because the sheet promises it.** A touched friend looks at the finger. A friend thrown by the plank squeaks as it comes down. Dot twirls as it goes. Pim's crown slips and is shaken straight when she is set down in the sand. Bo on the low end digs a crater and a ring of sand flies. Sand runs off the low end of the board, and slides back into a bite as an end lifts. Riders shake grains off. The slide down the plank is a whistle that rises (it fell). Bo's chuckle shakes the plank. The friends on the plank look after Dot when it is taken away. Pim stuck on the high end looks down at the sand and back at the sky. The held secrets hold: the level hum for as long as the plank floats, the tower's sway for as long as it stands, the snore for as long as Bo is alone.

**Built in the finishing run, for the same reason.** Each was checked in the code first and found as the lead's reader said.

- Dot apart in the sand stands turned half away, pale, its eyes on the others, and turns back the moment it is touched, carried or in company (`motion.ts`, `aside`).
- The friends on the plank turn to Dot as they bounce for it (`greet`, with the angle to Dot worked out when it plays).
- Tastes given as every time are every time. Pim underneath puffs her cheeks out with her raspberry, under Bo too, after his wheeze. Mog landed on hisses in a voice of his own (`spit`), under anyone. Dot underneath hums its duet. Mog on top of a stack kneads and then purrs with his slow blink. Mog and Bo each say that they are high whenever the others lift them there, once the plank has carried them up and not again until they have been down: Mog's purr and slow blink, Bo's chuckle, which shakes the plank four times. Bo landing on a high end he cannot tip chuckles too. The one who asks says it in the ending of its own ride, and no shake starts inside a scene, whose sand was saved when it began.
- A friend in the hand when the game is put away goes back to where it was picked up from. Nothing is moved, nothing is counted and no ride can end by it (`Game.putAway`, called by the Mount when it goes to rest and when it unmounts; tests in `game.test.ts` under "found as left").
- Grains thrown by a landing lie on the head of whoever rides the end that came down, for a moment, and are shaken off.
- A tap on the plank lifts its riders a finger's width.
- The rake is not on screen before the child's first touch of anything; that touch is saved as `touched`.

**Built after the first reading by a reader who had not seen the build.** Its report named twelve promises unkept, one drawn sign, a gap on load and the overlay. Each was checked in the code and found as it said.

- The low-end column plays. No landing could reach it before: the end that is down always holds someone, and a landing on a head was always read as the on-a-friend column. Now a landing on the end that is down is the low-end column, and a head on an end that is up or level is the on-a-friend column (`cells.ts`, `landingOf`; a test reaches all four columns for every friend). So Pim stamps, Dot's two-note hum sounds, and Bo's crater is dug.
- Alone on the plank, wherever it landed, Dot's hum dies away and it peeks over at the others.
- Whoever is under Bo is squashed flat for as long as he sits there, and pops back when he leaves (`motion.ts`, `press`).
- A friend let go over the middle drops onto the board, slides down it on the board itself, and climbs the side of whoever holds the low end (`motion.ts`, `slide`).
- Those Dot is set down beside in the sand turn to it and bounce, and look after it when it is taken away, as those on the plank do.
- Each friend's want can be seen whenever nothing else has its eye (`game.ts`, `wants`): Pim looks at the sky and the high end, Mog at the highest seat, Dot at whoever is on the plank, Bo up along the plank. The one who waits looks at the end it will hop to.
- A look can be read: the body turns with it and tips back to look up, the pupils travel as far as the whites allow, and at the finger the eyes go wide.
- No sad face is turned to the child: put out, a mouth is pressed to a short flat line and is never turned down.
- A bite is drawn as deep as the end is heavy, from the weight that came down and not from its speed, and the saved digit rises one step for each size of friend.
- Two friends of one weight are thrown equally high.
- Dot's mark in the sand is an open swirl wound more than twice round, never a closed ring.
- A ride put away after the deciding move and before its ending began is found ended on load; no scene starts by itself.
- The grown-up corner answers nothing (no sound, no mark), and the overlay is not opened by a hand laid or slapped on it: a touch-down counts only while no other finger is on the surface and a moment after the last.

**Built after the second reading.** It named ten more, each checked in the code and found as it said.

- A tap on the plank throws nobody: the plank rocks, and its riders are lifted a finger's width or dip with the end and are caught again (`motion.ts`, `tapRock`). Before, the tap's own knock threw them over a unit high.
- The low end sinks further the more it carries: a hair for each unit of weight beyond the lightest friend's (`world.ts`, `lowTilt`), and rises again when it is lightened. So a friend sent to the wrong side visibly pushes that end down.
- Pim's crown slips right down over one eye when she is set down in the sand, and she shakes it back (`pose.slip`).
- Pim's crown is low and wide. With it on she is still the lowest outline in the tray; before, the lightest friend was the tallest. A test holds it. (So it stood until the last run, which put the crown back at its full height at the lead's word: see below.)
- Dot hums its one soft note when a friend is set down beside it, as when it is set down beside a friend.
- An end that lifts out of the sand lets grains slide back with a whisper however it lifts: tipped over, or lightened to level (a `rise` event from the plank itself).
- A firm knock throws whoever rides the other end, Bo too, a little; a soft one only bobs them.
- The sheet's sentences on where a friend let go in the sand stands, and on what a load finds, were made true (listed above).

**Built after the third reading.** It named six more.

- A touch that ends the ending on the friend who asks next only ends the scene; the next ride begins with a touch on that friend at the waiting place. Before, a second tap on the lifter began the next ride.
- Mog thrown by the plank goes flat and long in the air; everyone else stretches tall.
- In the showing where Pim hops onto Mog in the sand he lays his ears flat, ducks and hisses, as whenever anything lands on him.
- Dot's speckles shimmer while it is glad and lie still otherwise.
- A landing on an empty end that makes the two ends the same plays no high-perch cell: the plank floats and hums, which is everyone's answer.
- The sheet now says that a showing the child gets ahead of waits for the next time its kind is laid out (listed above).

**Built after the fourth reading.** It named three.

- Dot's swirl as it is saved is a whole patch, middle and all, so a load draws one soft round hollow and never a loop of hollows round an untouched middle. The cells the line crosses alone closed into a ring at Dot's own rim places.
- A finger that was already down when an ending or a showing began does nothing when it lifts or drags: nobody is moved inside the scene and no ride begins in it. Only a new touch ends a scene.
- Any stack with Bo on top sways as one for as long as it stands, whoever is under him; before, only Bo swayed, once.

**Built after the fifth reading.** It named one drawn sign, seven promises and three things lost on put-away.

- Dimples have no lit lip (above).
- The level hum holds from the moment the plank is made level, every couple of seconds; it no longer waits for the plank to lie still, which left a silence of several seconds.
- Whoever the deciding move lifts says so before the ending begins: Bo's chuckle and shake, Mog's purr. The ending waits a second for it and for the plank to lie still again.
- Dot twirls when it is carried into company, as when a tap brings it in.
- A mark made while the rake travels is kept: when the rake arrives the sand is drawn again from the saved grid, and the rake lies out if a mark is left.
- A scene's marks are drawn when their cause arrives, never before it: the hollow at the waiting place appears when the next asker lands in it. They are still saved when the scene starts. If the child does something first, the picture catches up with the saved sand at once.
- Any touch ends a scene: one in the grown-up corner, and a second finger beside the one that is working, too.
- Bo's two rocks before he gets going are plain: over a tenth of a radian each way.
- Put away with something still to happen, nothing is lost: Dot's swirl is in the saved sand the moment it is due; the marks of a friend still in the air and of the plank it will tip go into the saved sand at put-away; and a friend the finger had already let go of is dropped where the child let go, not put back.

**Built after the sixth reading.** It named one drawn sign and eight smaller things.

- The idle glow lies on the sand only under a friend who stands in it. A friend on the plank or on a head glows itself, so no ring of light lies empty on the sand.
- With a showing due, everyone hops straight to where the showing opens, and on a first open the first frame is already there: no showing begins with a jump. Before, the ride was laid out, and then the showing put its friend back in the sand in one frame and played the same hop again.
- The second tap of a double tap on the friend who waited does not take the asker off its end again. An asker taken off the plank on purpose is the one the idle ladder shows.
- Pim on a high end where nothing moves looks down at the sand and back at the sky whoever is asking.
- Dot warms to full colour when it is touched and as it goes; alone where it lands it pales again.
- A carried friend rises clear of a head that leans with the tilted board.
- The `high-asks` showing lasts three seconds, not 3.2.
- The sheet now says what Pim can tip, where a friend may not stand, that the child's hand may carry the asker there, and that the asker hops three times in all (listed above).

**Built after the seventh reading.** Its rules 1 to 5 were clean; it named five things under rule 6.

- Every friend tapped or carried onto the lighter end throws whoever rides the other, Bo too; a test goes through every arrangement. The slowest tip came down a hair under the speed that throws.
- Dot's swirl is drawn where Dot stands or not at all: a friend taken from where it was no longer does what it was about to do there. A swirl still to be drawn is saved at put-away.
- Tastes hold on a landing the child did not make: a friend thrown by the plank and down again on the head it sat on is hissed at by Mog and puffed at by Pim, and Pim on top crows again. Mog left on top of a stack when the one above him goes purrs.
- The level hum and the swaying stacks go on while a friend from the sand is in the hand.
- A pointer the browser takes away is not the child letting go: at put-away the friend it carried goes back, and no move is made.
- `input.ts` carries one more small thing for that, a mark on a drag whose pointer was taken, and a `dragAbort` gesture for when it does not come back.

**Built after the eighth reading.** Rules 1 to 5 clean again; four things under rule 6.

- Only an end that goes up throws. A friend landing on the end that is already down pushed it into the sand hard enough to count as a knock, and flung whoever sat high opposite although nothing had moved; now the plank must have been up off that end since it last came down on it.
- The ending's plank see-saws three times whatever the two ends weigh. Each push is sized so that the heavy end lifts and is down again before the next (`motion.ts`, `seeSaw`), so a bigger difference swings further and throws higher; and a rider a see-saw throws comes down without pushing the plank. Before, the pushes were one size, a swing could outlast the gap to the next push, and the landings of thrown riders rocked the plank on their own.
- Bo with a friend on his head holds very still: no breath, no drawing himself up, and he gives a good deal less under the weight than anyone else.
- A pointer the browser takes away and that does not come back makes no move, whenever the game rests: after the grace the friend goes back to where it was picked up from (`input.ts`, `dragAbort`).

**Built after the ninth reading.** Rules 1 to 5 clean; five things under rule 6, two of them in the model itself.

- **The tilt follows the two totals and nothing else.** A landing pushed the plank by the lander's weight, hard enough to carry an end that stayed the lighter one right down into the sand: a bite, a throw, and for a moment the lighter end down. And a friend who made the two ends the same sent its end into the sand before the plank floated. Now a landing on an end that stays lighter, or only draws level, dips that end a little and gently (`motion.ts`, `DIP`); the heavy end comes back without a knock; a level plank swings clear of the sand, and hums once it is afloat. Tests go through seven too-light landings and three levelling ones.
- A friend who comes down a place onto a head, because the one between was taken away, is answered by that head.
- Dot on a head: the one below says its own piece first, and then the two sway together through the duet.
- A bite is drawn deeper for every heavier end; the saved grid keeps eight depths, as the sheet says of what is saved.
- A slide stops clear of every friend of a stack where the stack leans, not where its seat is.
- Not a sheet sentence, and built: the friends above a friend lifted from under them come down a place at once, instead of hanging in the air over the gap. Put away, the lifted friend goes back on top of them (the sheet says so now).

**Built after the tenth reading.** Rules 1 to 5 clean; six things under rule 6, one of them listed already.

- A taller stack is plainly wobblier: two stand still, three sway, four sway further; Bo on top makes even two sway.
- A finger's tap on the plank dips a lighter or level end only as far as the weights let it, and it springs back: no tap brings a lighter end, a level plank or an empty one down to the sand. Before, a tap on the high end of a nearly even plank tipped it.
- The asker looks by turns along the plank and up, and at the friends who could help, where they stand.
- Mog's ear bumps are low bumps at the corners of his head and do not stand above the top of it: he and Dot, who weigh the same, are one size to the eye. A test holds it, as for Pim's crown. (So it stood until the last run, which put the ears back at their full size at the lead's word: see below.)
- The sheet says what Bo's stillness under friends is (listed above).

**Built after the eleventh reading.** Rules 1 to 5 clean; seven things under rule 6, three of them arguable, all taken.

- A held secret holds for what still sits when a rider is lifted off: the plank that floats level then hums, and a tower with its top in the hand sways as three.
- On a load everyone is as found from the first frame: Dot apart is pale and turned half away, Bo alone on the plank is asleep. Before, both eased in over a second at every open.
- Mog stretches longest in a hop of his own.
- Pim: the higher the better. A greater toss is a longer, higher squeal and two spins.
- Bo's belly wobbles from side to side after he stops, on his slowest spring.
- Bo landing on the low end is the deepest thump of all: the end driven into the sand under him.
- Grains are shivered off up and down. It was a quick shake from side to side, which after a wrong-side try could read as a shaken head.
- The sheet says that the game is silent before the child's first touch, so a showing at the very first open is seen and not heard (listed above).

**Built after the twelfth reading.** Rules 1 to 5 clean; six things under rule 6.

- Dot left alone by the friend who goes to wait, at the end of a ride, draws its swirl, as when a tap takes that friend away.
- The one below answers a landing once. A landing on a low end let the stack leave its seat for a step and land again, and the second landing was answered as well.
- The ending begins when the asker has come down again: her toss and her delight are two things, one after the other.
- Sand thrown onto the board runs off it whoever the child moves meanwhile.
- A finger on a friend's body touches that friend; only a touch that misses every body goes to the nearest friend within reach. Before, where two targets overlapped, the nearer friend took a touch on the other's body.
- The idle ladder never shows the answer first: a friend whose one tap would carry the asker there is shown after the others.
- The sheet says that Dot at the far rim is drawn a little smaller by the distance (listed above).

**Built after the thirteenth reading.** Rules 1 to 5 clean; three things under rule 6.

- **A carried friend hangs over the place the finger points at** (`view/ground.ts`, with tests that use the stage's own camera). What the finger is on is where the friend comes down: an end of the plank, a friend, a spot of sand. The reader showed that the rule added after the second reading, which read the finger at the height of a seated friend, took most of the front sand for the plank: a friend could be set down by carrying only in the front row, behind the plank or at the sides. And before that rule the plank could not be reached by pointing at it. Both came from hanging the friend under the finger, high over the tray. Now it hangs above the finger, over the place pointed at, and a little lower than before.
- With a friend in the hand, the head that is come down onto and the weight of an end that bites are read from who still sits, not from the arrangement with the friend in the hand still in it.
- The sheet says how a friend is carried, and that the pictures of friends who stand close may touch while a finger on a body takes that body (listed above).

**Built after the fourteenth reading.** Rules 1 to 5 clean; four things under rule 6.

- Dot's swirl is never lost to a put-away. When the friend who will go to wait stands beside Dot, the swirl is part of the sand the ending saves at its start, and Dot draws it when that friend has gone. When Dot is on its way to a spot of sand where it will be alone, the swirl is saved at put-away with its hollow.
- The next ride begins with a touch on the friend who waits where it waits; a touch while it is still on its way there begins nothing.
- Bo dozes, and Dot pales, by who still sits: with the only other rider in the hand each is alone.
- A friend let go over the sand right beside the plank is over sand: the plank takes only what hangs over the board and a little past its edges. With the finger pointing, nothing wider is needed.

**Built after the fifteenth reading.** Rules 1 to 5 clean; four things under rule 6.

- Mog and Bo say that they are high when the friend who goes to wait lifts them by leaving the plank, and when a rider lifted off by the hand leaves them high: who is high is read from who sits, and is no longer settled as said when a scene ends.
- The idle ladder never shows Dot: bringing it in is never asked for.
- The nearest free place is the nearest: of every place on the grid a friend may stand, the one closest to where it was let go, whichever way that lies, with a little room to spare from its neighbours where there is any. Before, a friend let go behind the plank was stepped out in front of it.

**Built after the sixteenth reading.** Rules 1 to 5 clean; two things under rule 6.

- A landing is answered by what is there when the friend lands. The cell was read when the child let go; a head tapped away while the friend was still on its way was wheezed at and puffed all the same, and the bite was drawn for a weight the end no longer held.
- Past the board's tip, as beside it, sand is sand: a friend let go there stands at the nearest free place. A friend held over one who sits on the plank comes down on that end's seat, however the stack leans.

**Built after the seventeenth reading.** Rules 1 to 5 clean; three things under rule 6.

- A landing is answered by who has arrived. Of two friends sent to one end one straight after the other, the first to land was answered as if the second already sat there; the weight of an end that bites and the heads the grains settle on are read the same way now.
- Mog's ears are laid flat under a friend and stay in sight at the corners of his head; they were hidden there.
- A friend put back onto a head, at a put-away or when its pointer was taken, is answered by that head. A friend that comes down on a head it was not sent to says its own piece too: Pim crows, Dot sings its duet.

**Built after the eighteenth reading.** Rules 1 to 5 clean; three things under rule 6.

- The nearest free place, again: the room to spare added after the fifteenth reading was looked for anywhere in the tray first, which could stand a friend let go a hand's width from its place on the far side. It is now taken only when it lies hardly further off than the nearest free place.
- An empty plank comes level and lies still within a second, so the showing that a touch on the waiting friend sets going begins soon for every kind; the first ride's had waited nine seconds for the emptied plank to stop swaying. The sheet says where everyone hops when a showing is due (listed above).
- The tilt follows the totals here too: a friend tapped off again just after landing left the plank swinging on, and the end it had left could come down, bite and throw. A swing toward an end that is no longer the heavier now loses nearly all its speed the moment the rider leaves.

**Built after the nineteenth reading.** Rules 1 to 5 clean; three things under rule 6, all of them about what happens when the child is quick.

- **Only the heavier end ever comes down on the sand**, as a rule of the plank itself (`plank.ts`): an end that is no heavier than the other is turned back just short of the sand, however it was set swinging. A finger drumming on the lighter end, and a friend arriving on the other end mid-swing, could still knock it down; the cures before this one each covered one way of pushing. A test pushes the plank hard at random with every pair of weights.
- Mog and Bo say that they are high though the friend who lifts them was tapped almost at once: a landing marks it as said only when the landing's own cell said it. Mog asking, left on top of a stack on the low end, purrs.

**Built after the twentieth reading.** Rules 1 to 5 clean; four things under rule 6.

- Taps on the plank do not add up: however fast a finger drums on the lighter end, that end dips no further than one tap dips it, so the heavier end is always the lower one. The clonk and its grains sound only on an end that lies in the sand.
- A tap on the plank while a landing is bringing an end down does not rob the rider of its toss: only a tap on a plank that lies still makes the plank's knocks its own.
- A move is a friend arriving on an end or leaving one: a friend tapped to and fro before it lands has made one move, or none if it ends where it stood. Before, every turn in the air was counted, and a ride could be judged badly for it.
- The level hum is one long hum: each is struck a little before the one before it has died away, and never two at once.

**Built after the twenty-first reading.** Rules 1 to 5 clean; three things under rule 6.

- A touch on the friend a showing has moved (Bo standing in the sand before his hop, Pim beside the plank or on the far end in the middle of her visit) only ends the showing: the friend goes to where the ride has it, and the touch moves it no further and counts as no move. Before, the touch was read from the saved ride, so a tap on Bo standing in the sand took him "off" the end he was not seen on, and the ride ended with Pim never seen stuck high. The sheet says so now, in one new sentence.
- Bo lifted by one unit is thrown whichever end he sits on. His chuckle at being high waits until the end has come down on the sand, so its shake cannot push the plank before the knock; and the shake itself begins by lifting whichever end lies down, the same either way round. Before, he was thrown one way round and only bobbed the other.
- A tower, or a stack with Bo on top, sways on through an ending or a showing, and the level plank hums on through one; only a friend a beat has doing something else is left to it, and joins in again at the next sway.

**Found by this lane while checking those.**

- A friend held on the picture of the plank's end did not land on the plank: carried friends hung under the finger, high over the tray, so it hung over the sand in front and came down there. A first cure read the finger at the height of a seated friend; it took too much of the sand for the plank and was replaced after the thirteenth reading (above): a carried friend now hangs over the place the finger points at. The audit's own "carried" moment had been dropping friends in the sand all along; it now really lands them on the ends, onto a friend and over the middle.
- The intersection audit plays the build that lies in `dist`, and several runs in this run were made without building first: those clean results said nothing. Every result named under the gates below is from a build made after the last change to the code.

**Built in the last run before the merge.** The lead's message named what to do; each point was checked in the code first and found as it said.

- Round 7, finding 1 (friends set down well apart). The game lays a ride out with every two friends in the sand, the place of the friend who waits and both seats at least 0.4 of a unit of bare sand apart, measured between the pictures' edges (`rides.test.ts`). There are two places in front of the plank on each side, an inner and an outer one; Pim and Mog share the inner one, and when both stand on one side Mog takes the outer one, which Bo has then left for the plank (`rides.ts`, `layout`).
- Round 7, finding 2 (the ending's cause). Already as the replacement says: a ride ends when the asker is where it wanted to go, carried by the plank or set there by the hand, and the ending plays for both.
- Round 7, finding 3 (a showing owed at put-away). A showing that was due and had not begun does not play by itself on load: the ride is found laid out, and the showing plays the next time its kind is laid out. Only the very first open, with no slot to read, plays a showing by itself (`save.ts`, `wasSaved`; `game.ts`, the constructor).
- Round 7, finding 4 (which Dutch statement sets no number). The sheet only.
- The lead's reader, 1: a friend who sits on an end is company for Dot when Dot stands in the sand within a body's width of it (`arrangement.ts`, `companyOf`). For that to be true and Dot still to stand apart at the rim while the others ride, Dot's place has to be further than a body's width from both seats, and in the tray as it was no place at the rim is. So the tray is deeper: ten units from front to back, with the plank across its middle, the friends in a row in front of it and Dot's place at the far rim behind it, 4.1 units from the nearer seat, where 3.5 or less would make company with Bo sitting there. A test holds that Dot is alone at the rim whoever rides, in every ride as it opens.
- The lead's reader, 2: a friend tapped, taken from the air by the hand before it lands and let go in the sand has made no move; let go on the other end, one (`game.ts`, `caught`).
- Point 3 (the ending at every difference). The friends on the low end stamp as the plank rocks (`motion.ts`, `STAMP`): at one unit of difference the heavy end now lifts about thirteen degrees, comes down with a knock and tosses whoever sits opposite, three times: Pim by about her own height, Mog by half of his, and Bo, the heaviest, by under a tenth of a unit. A bigger difference comes down harder and throws higher, and the push is capped so the plank never tips over. The sheet's sentence was changed to say this.
- Point 4 (room beside Dot). Behind the plank there is room at the far rim beside Dot's place for a friend of any size, and one set down there is company (a test sets each of the three down there). In front, the friend who waits now stands right in front of the stone, which leaves the sand along the front free for a friend set down beside one at the inner place; a test holds that Dot let go beside whoever stands there ends in company with it, in every ride as it opens.
- Point 5 (the stone). It answers a tap as a stone: a small bright click of its own (`voices.ts`, `pebble`) and a few grains hopping at its foot. It marks nothing and moves nothing.
- Point 6 (what the hand shows). The code and this log now say what it does: a friend whose tap is not the answer comes first where there is one, and where every friend it can show is the answer, the first kind of ride and the last, it shows the answer. With nobody but Dot in the sand it shows the friend on top of the end that is down, or on a level plank of the taller stack, the same friend whichever side the stacks are on (`game.ts`, `topToShow`, with a test that mirrors every case).
- Point 7 (the overlay). It opens on one finger held a second in the top right corner and lifted there, then three taps there within three seconds, and hides the same way. Drumming on the corner opens nothing, however long (`overlay.ts`, with tests).

**The look run** (steps 2 to 5 and 8 of the look page). The look is the same sand tray. What the frame holds now that it did not:

- A place round the tray, painted once on three canvases and drawn as three flat planes: a veranda floor of grey boards, a rush mat with a dark border under the tray with the tray's shadow on it, and the light of a tree overhead, patches of sun and leaf shadow that slide a fifth of a unit to and fro. It is ground, quieter than anything in the tray, and holds nothing to pick up.
- Something alive at the edge that has nothing to do with the ride: a snail that creeps along the boards behind the tray (`visitor.ts`). It answers a touch as itself, in it goes with a small hollow pop and its shell rocks, and it minds a heavy knock in the tray. It is in the sheet.
- The friends larger: each body a tenth bigger in the tray, and the camera nearer, with a longer lens and looking down more steeply, so that the tray fills the frame from side to side and from the bottom to four fifths of the way up. In the frame Pim went from 7.4 to 8.9 per cent of its width, Mog on a seat from 8.8 to 10.7 (in the front row he is 11.7), Dot at the rim from 8.1 to 9.3, Bo from 13.3 to 15.3.
- Pim's crown and Mog's ears at their full size: the crown a tall spiral shell that swings wide behind her, the ears two pointed bumps standing up. The test that held them low now holds that neither is wide enough to read as more body nor stands as high as Bo.
- Nothing new looks touchable without answering: the snail and the stone each have their own answer, and the rest of the place is flat ground.
- The budget: 31 to 34 draw calls (25 to 27 before), about 18,600 triangles, three canvases painted once at mount. The cheapest tier leaves out the leaf light. The frame-budget test and the audit pass.

The three stills, with one honest line each. Before, from this lane's own still at rest and the reader's measure: about 63 per cent of the frame flat cloth with nothing drawn on it, the top 38 per cent among it; funny, Pim's cap; alive, the asker's stretch, breath and blinks.

- At rest before a touch. Empty: nothing in the frame is bare; the tray is 63 per cent of it and the place round it 37, which is boards, mat and leaf light with one snail. Funny: Pim's tall shell and the way she leans up toward the high end; the snail's eyes on their stalks. Alive: Pim stretching to ask, every friend breathing and blinking, Dot peeking from the far rim, the snail creeping, the leaf light moving.
- The middle of a cycle. Empty: as at rest. Funny: Bo in the air on his way to the high end, eyes squeezed shut, big as he is. Alive: the others' eyes on him, the rake newly out on the far rim, the snail still creeping.
- The funniest moment. Empty: as at rest. Funny: Bo sitting on Pim, who is pressed flat under him with her mouth open and her crown knocked to the side; grains in the air; the snail gone into its shell at the thump; Mog and Dot staring. Alive: everything in the frame is reacting to the one thing the child did.

What this lane would still add, and did not: brows, and a mouth with more shapes than open, shut and pressed flat; a second thing at the edge on the child's side of the tray; a rustle and a shiver of the leaf light when the boards are touched, which now answer with a sound alone.

**Still weak.** Nothing here is short of a sentence of the sheet, as far as this lane and its reader have read it.

- Bo rocks twice only when he starts from the sand. Tapped on the plank he leaves at once, and the sheet says so.
- The friends are pebbles: Pim's "kick" on a high end she cannot tip is a wriggle and small hops on the spot, and the sheet says so.
- On the low end several things now happen in a row (Pim crows and then stamps; Mog circles, kneads and purrs; Dot hums and then sings its duet), up to about two seconds in all. Whether that is lively or too much has not been heard or seen in motion.
- The grains that lie on a head are a few small points for under half a second. They are there, and small.
- A load draws the sand from the coarse grid alone, as the sheet says, so a groove the child drew comes back as a row of soft hollows, and Dot's swirl as a soft round patch.
- The held secrets sound for as long as they hold: a plank left level hums on without a break, and Bo left alone snores every few seconds, until the child changes something or puts the game away. That is the sheet; whether it wears is for someone who can hear it.
- Nobody has heard the game. Every voice is numbers inside ranges; whether the thumps, squeaks and hums sit well together is unknown, and so is whether Bo's chuckle and Mog's purr now come too often in free play.
- Motion was judged from model tests, stills and the audit's pictures, never from video.
- The rake appears at the child's first touch, wherever that touch lands. It does not slide in; it is simply there.
- The grown-up overlay opens on a hold of a second and three taps in the top right corner. A child who rests a finger there for a second, lifts it and then taps three times within three seconds would open it; drumming does not.
- Two friends hopping to different places at the same moment can pass through each other in the air. A hop clears whoever stood in its way when it left, not whoever is flying.
- Dot at the far rim is drawn about a fifth narrower than Mog in the front row, and an eighth narrower than Mog on a seat, by the distance alone, though the lens is longer than it was. The sheet says it is a little smaller there.
- With Mog at the inner place and Bo at the outer one, the front of the tray on that side is full: Dot let go beside Bo there finds no room within a body's width of him and stands at the nearest free place, alone, behind the end of the plank. Beside the friend at the inner place there is room, and beside Dot at the rim there is room for anyone.
- Where the game sets Mog and Bo down on one side there is a little over half a unit of sand between their pictures, about thirty logical pixels. That is what the tray gives with the friends this size; it is the smallest gap in any layout.
- The idle glow is faint on the pale sand at tier 0 in stills.
- A friend's hollow, a finger's poke and Bo's crater are soft bowls with no lip, shaded on one side by the low light. With the lip they were rings lying on the sand, which the fifth reader counted as a sign this band may not be shown. Without it a shallow one is faint. The idle glow is a wide soft halo under a friend; two readers looked at it and did not read it as a nought.
- Pim's crown and Mog's ears are at their full size again. With her crown on, Pim is as tall as Mog with his ears and taller than Dot; her body is still plainly the smallest, and the crown is far narrower than she is. Whether a two-year-old reads her as the lightest at a glance is for someone who can watch one.
- With every friend on one end the tip of the board lies about a fifth of a unit under the sand, inside the bite drawn round it.
- In an ending Bo is tossed under a tenth of a unit, which is a wobble, not a flight. His own delight carries his ending: the chuckle that shakes the plank.
- While the plank rocks in an ending, a tower on the low end stamps with it and is tossed off its seat each time, so it sways only before the rocks and after them.
- The marks in the sand are saved on the same grid of 32 by 20 cells, which now covers a deeper tray: a cell is three eighths of a unit wide and half a unit deep, so a saved mark is a little coarser from front to back than from side to side.
- A touch on the boards or the mat is answered with a sound alone: nothing there moves.
- The snail's pop, the stone's click and the stamp of an ending have not been heard by anyone, like every other sound.
- The place round the tray was judged from stills only. Whether the leaf light is calm enough behind a tossed friend is for someone who can watch it move.
- A carried friend hangs above the finger, over the place the finger points at, about a seventh of the screen's height up. The finger is on the friend's shadow, not on the friend. Whether a two-year-old takes to that is not known; it is how the friend can be put exactly where the finger is.

**Open, for the lead.**

- The frame rate on a graphics card, WebKit and a physical iPad: the one gate not run. It matters more than it did: the frame now draws three painted planes behind the tray, one of them blended over the whole floor.
- A slot saved by a build from before this run holds places and sand marks measured in the shallower tray. It loads: every place is repaired to the nearest free one, and the marks land a little off. No such slot exists outside the machines the game was tried on, and the version of the saved state was not raised.
- The sheet's check, round 8, on the six sentences listed above and nothing else.
- The registry row: its text is at the end of `ART.md`.
- Someone to listen to the game.
- Draft pull request 37 is open from this branch so that it can be read; the lead merges by squash and may close it.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The parts below belong to the block.

### Where things are

| File | What it holds |
| --- | --- |
| `world.ts` | The tray, the plank and the four friends as numbers; where a friend may stand and where the game sets one down; the grid places lie on. |
| `arrangement.ts` | Who is where: the model of the world. A tap, a friend let go, the tilt from the two totals, Dot in company. |
| `plank.ts` | The plank turning, knocking and floating level. |
| `motion.ts`, `personality.ts`, `pose.ts`, `rest.ts` | Friends hopping, riding, tossed and carried, each by its own numbers; what the view draws. |
| `voices.ts`, `sound.ts` | Every sound as numbers inside stated ranges; the bridge to Web Audio. |
| `rides.ts` | The designed order: five kinds and the mixed place, layouts, when a want is met, judging, what a move does. |
| `save.ts`, `marks.ts` | What is saved and how it is repaired; the sand as a coarse grid. |
| `tastes.ts`, `grid.ts`, `cells.ts` | The friends' fixed tastes; the object-by-action grid as data; each cell's own motion and sound when a friend lands. |
| `game.ts`, `scenes.ts`, `forecast.ts` | The game on the toy, with no renderer: rides, endings, showings, the idle ladder, what is saved; the scenes' beats; a scene's marks read ahead on a twin. |
| `grains.ts`, `overlap.ts` | The grains a knock throws; how deep one drawn body is inside another, for the tests. |
| `visitor.ts` | The snail behind the tray: where it creeps, how it pulls in and looks out. |
| `view/` | The three.js stage: the camera that fits the tray into any frame, the sand shader and its height canvas, the friends' meshes, the rake, the grains, the ghost hand, the painted place round the tray (`setting.ts`) and the snail (`snail.ts`). |
| `scripts/intersections/games/princess-playground.ts` | The audit's moments and allowances. |

### Template notes

- `config.ts`: changed, as meant. Added a `grain` field and a `leafLight` field to `Tier`, the ladder ids, the first-visit rows, and three numbers for judging a ride. **For the template:** `FIRST_VISIT` puts its second row at the band's oldest age; a band of 2 to 5 wanted the step at 4, so the row was rewritten. A comment saying the rows are the game's to choose would save the next builder a look.
- The Mount (`princess-playground.tsx`): changed in the places its comments mark and nowhere else: the stage is made, `applyTier` sets the grain, `draw` renders (the bare tray until the slot is read), `resize` sizes the renderer, gestures go to the game, the loop steps it, and the game's cues and saves are flushed in the handler and after each step. The pilot notes' list for the Mount was followed point by point. **For the template:** a three.js game stalls a frame the first time each material is drawn; this game draws one hidden frame with everything shown at mount. On a software renderer the stall was 4 to 12 seconds a material and looked like a hang. **For the template:** `resize` sets `canvas.width` and `canvas.height` itself; a three.js game must replace those two assignments with its renderer's own sizing, and the comment there could say so. The loop also throws away the step `clock.advance` returns; the game has to change that line to keep it.
- `audio.ts`: as the template has it now: the closing run took the template's count of fingers on the glass and its test, and changed nothing else. `tone` and `noise` were enough for every voice. **For the template:** a voice written as a list of numbers with a test on its ranges (this game's `voices.ts` and `sound.ts`) would serve any builder who cannot hear; it is about forty lines.
- `input.ts`: one thing added, a `lifted` getter: the finger has let go mid-drag and its drag is waiting out the grace. The Mount needs it at put-away to tell a drop the child has made from a friend still in the hand; a pointer the browser took away does not count as let go. The press, tap and drag gestures mapped onto touch, hop and carry without change.
- `state.ts`: used as copied and wrapped by `save.ts`, as its header says to. The second read of the raw record worked as described.
- `scene.ts`: used as copied, for the ending and the five showings. **For the template:** a scene's outcome is saved when it starts, but the sand a scene marks is only known once it has played. This game plays the scene first on a twin of its model (`forecast.ts`); a line in the header on outcomes that are only known by playing would help the next game with a surface.
- `overlay.ts`: changed. It opens on a gesture of its own: one finger held a second in the corner and lifted there, then three taps there within three seconds; a touch-down counts only while no other finger is on the surface and at least 80 ms after the last one. The Mount passes every touch-down with the number of fingers down, every lift, and a cancel. The template opens on three quick taps, which a drumming child can make. Its comment asks for backdrop under the corner "where nothing answers a touch": the Mount leaves a touch in the corner unanswered.
- `guidance.ts`: the game reads `glow`, `demo` and `demoIndex`, and `handPose` for the hand's one tap. Its header comment was changed in one sentence: the template says the hand never shows the answer, and in this game it does where every move it could show is the answer.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen, untouched.
- `ART.md`: the outline's line under `## The records` was replaced by a sentence of the game's own.

### For the owner to decide

- The look: sand tray, as the stills show it, now on a mat on a veranda with a snail behind it. Whether the place is the right one, and whether a snail belongs in it.
- Pim's crown and Mog's ears at full size: the crown makes the lightest friend as tall as Mog.
- The friends are painted pebbles with faces; the ledger row says "a few smooth stones or shells as the only objects" and "no characters made of the material", which this reads as: characters may be stones, never sand.
- The toy: a tap puts a friend on the seesaw; the plank tips, knocks and throws. Whether it is a pleasure in the hand, and whether it is loud and lively enough.
- The name: the princess is the smallest pebble, with a shell for a crown, and the playground is a seesaw in a sand tray. Whether that is princess enough for the name.
- The skill line of the roster calls weight "science". The records carry comparing weight as measurement in the mathematics lane in both jurisdictions, with one California science foundation that lists weight as an example property. The sheet follows the records.
- No default of the guide needed changing.
- Whether Bo may stay awake while he is the one asking. The game keeps him awake at his own ride so that the scene has a want, and the sheet says so (passed in round 6). If the owner would rather have him snore there, the idle ladder is then the only invitation.
- Whether the held secrets may sound for as long as they hold: the hum of a level plank and Bo's snore go on until the child changes something.
- Whether the rake should come in at the child's first touch. It now stays away until then, so that no tool is on screen before the child has done anything; the first showing marks the sand before that.
- A first visit at four or older opens one step on, at the ride where size matters. Younger, or with no age, it opens at the first ride. Both are the game's own choice.

## Pass log

One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak. Every still is on a software renderer at 1180 by 820, pixel ratio 2, tier 0 pinned, clock paused and stepped; passes 1 to 3 on the dev build 0.4 s after the first drawn frame unless said, passes 4 to 6 on the production build. All stills are kept outside the repository.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | The spike at rest. | "They look grumpy and dark. Is that one a horn? I can't see the big one's face." | Light: both lights raised. Paint: brighter coral, teal and blue-green. Faces: eyes larger and moved up onto the front of the head so they read from above; a small smile; smooth normals on Mog. Crown: larger, cream. Sand: finer rake, finer grain. | Not measured (software renderer). | Eyes had no pupils; tray corners cut off; shadows not seen. |
| 2 | The same, reshot. | "Their eyes are white. The box is too big for the screen." | Pupils pushed out along each eye's own slope. Camera a step back and aimed higher. Shadows moved out from under the bodies, to the right, and darkened with a cool tint. Grain calmer. | Not measured. | Bo's lids do not show. A lot of cloth above the tray, kept as room for a toss. |
| 3 | The toy: a tap on Bo, mid-air and settled; then Mog and Bo stacked, a groove and a poke. | "He jumped on and she went up! He has vampire teeth when he jumps. The cat is squashed under the seesaw person." | Open mouth made a wider smile, not a tall one. Default places moved clear of the two seats and put on the saved grid; the strip under the plank widened so nobody stands against a seat. | Not measured. 23 draw calls, about 16,000 triangles. | No grains fly at a knock (they do since the game run). Motion judged only from model tests and stills: no video yet. |
| 4 | Cold playtest proxy, first run: production build, fresh slot, the shell's default age; ten seconds hands off, then a newcomer's taps. Stills at 0.9, 2.6, 6.8, 9.8, 11.4, 12.3, 14, 16.5, 19.5, 23.5 and 27 s. | "A red one jumped on and off by itself. The green one just sits there, what does it want? The hand is poking the big one in the eye. Why are there eggs lying in the sand? What is the orange thing at the back?" | The want and the guide: the asker stretches and turns its face to where it wants to be; the hand comes down on the top of the head, from the side; a bite in the sand is a soft dent with no lip. | Not measured. 25 draw calls. | The rake is out before the child has done anything. |
| 5 | The proxy again, and on into the next ride: stills at 3.2, 9.9, 13, 19.5, 21.3, 22.3, 24.5, 27, 30, 33, 38 and 44 s. Of the first run's five unclear moments three were gone (the want, the hand, the eggs) and none was new until the second ride. | "The big one is asleep. Is it finished?" | The asker stays awake: Bo does not doze while he is the one asking. | Not measured. | A big friend waiting stands close to Pim's place. |
| 6 | A too-light try, a stack of two, a tower of three, a groove and the rake, on the production build at seed 1: stills at 5.2, 7.3, 9, 12.5, 14.6 and 15.7 s. | "He fell asleep while she was showing her trick. The comb only slides along the edge." | The asker keeps wanting through a showing. The friends on the plank bounce when Dot arrives. | Not measured. One reading of the game's own work: 7.3 ms at the 95th percentile at six times CPU throttle in Chromium on SwiftShader, top tier, 25 draw calls. | The rake does not go through the sand. No video has been looked at. |

| 7 | The look run, first still: the game at rest before a touch, as the owner saw it, at 0.3 s. | "It is a box on a grey table. There is a lot of nothing up there." About 63 per cent of the frame was flat cloth, the top 38 per cent among it; the friends were 7 to 13 per cent of its width. | The frame: the tray made deeper with the plank across its middle, the camera nearer with a longer lens and a steeper look down, every body a tenth bigger, the crown and the ears back at full size. | Not measured. 24 draw calls. | Round the tray there was still flat cloth, though far less of it. |
| 8 | The same moment in the new frame, then a tap on Bo. | "They are big now. The floor is still just blue." | A place: boards, a rush mat with the tray's shadow on it, leaf light that moves; and a snail on the boards that pulls in when touched or when an end slams down. The stone answers a tap. | Not measured. 31 to 34 draw calls. | The leaf light could hardly be seen. Two friends set down on one side stood close. The snail hid at every knock. |
| 9 | At rest at 4.4 s, a tap on Bo at 5.25 s, Bo carried onto Pim at 5.7 s, and the first showing at age 3. | "The snail went in its house when the big one sat on her! Her hat fell off." | The leaf light made plain to see. The friend who waits moved right in front of the stone and the inner place inward, so the two set down on one side stand further apart and a friend can be set down beside one of them. The snail hides only from a heavy knock and flinches at a light one. | Not measured. 31 to 34 draw calls, about 18,600 triangles; 31 at tier 3. | No brows; the boards answer a touch with a sound alone; nobody has seen it move. |

**The intersection audit, pass by pass** (production build, the machine's own Chromium).

| Run | Open | What it found | What was done |
| --- | --- | --- | --- |
| 1 | 11 | Only poses inside one friend: the mouth, the eyes, the lids, the crown. Every moment showed the opening state: the taps had not landed, because the mesh patterns were anchored and matched no path. | The mouth turns over in its own plane; the face parts were named; allowances written. The patterns were fixed in run 3. |
| 2 | 1, then clean three times | Pim's mouth against her body in a squash. | Allowed with a cap. These clean runs were worth nothing: the moments still reached one state. |
| 3 | 14 | With the taps landing: Bo inside Pim and Pim inside Bo as they changed places; a friend under the plank; Bo's body in the front rim; shut eyes lying in one plane with their pupils. | A friend sitting on another rides its squash; a shut eye puts its white away; a body spreads only so far; the tray keeps bodies off the rim. |
| 4 | 8 | The plank swinging up through a friend who was gathering itself to hop off it; hops through friends in the way; bodies touching in the sand. | A friend leaving the plank leaves at once; a hop arcs over what is in its way and over the edge of the board; real elbow room; the moments rewritten as one visit played straight through. |
| 5 to 7 | 8, 2, 3 | A carried friend dragged through the plank; a tower leaning upright on a tilted board; Pim's crown and Mog's ears inside the friend sitting on them. | A carried friend rises first; a stack leans with the board; the crown slips aside and the ears lie back under a friend. |
| 8 to 11 | 4, 3, 4, 3 | Dot deep in Mog for one sample at 38 s, every run. It was two hops at once: Mog "hopping" down one place as the friend under him left, and Dot landing where he would be. Found by replaying the audit's exact timings on the model. | A friend who only comes down a place drops; one landing on a friend who is still on its way hangs over it; a friend sits on the very top of the one below. |
| 12 | 1 | Pim's crown against her body when it slips aside. | Allowed with a cap and its reason. |
| 13 to 17, again 18 to 22 after pass 6, again 23 to 27 at that tip, and again 28 to 32 after the closing run | 0 | Clean, five times each, two of each five under full CPU load: the same 353 samples, 25 pieces and 17 allowed every time. | `enforce: true`. |

| 33 to 36, the last run | 5, then 0, 1, 0 | With the place round the tray: the snail's eyes and foot against its shell as it pulls in and looks out, which is the one thing it does. Then, once, Bo waiting right in front of the stone spread into it as he landed. | The snail's eyes come out at the rim of its shell and its own contacts are allowed with reasons; the waiting place moved a fifth of a unit further from the stone. The audit's places were moved to the new frame, and it has a moment for the stone, the snail and a friend set down beside Dot. 415 samples, 33 pieces, 30 allowed. |

The closing run made no pass of its own: it built the small things the passed sheet promises and the game had left out, listed in the status block, and ran the audit and every check again.

The finishing run made no pass of its own either. It built what the lead's reader and then its own reader found short of the sheet, listed in the status block, looked at stills of Dot apart, the looks, a touch, the slide and the grains on a head, and ran the audit and every check again.

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

Nothing here is a frame rate. Every number was read on a machine with no graphics card (Chromium on SwiftShader), and no physical iPad was measured.

- **Alive at idle.** The snail creeps along the boards behind the tray and the leaf light moves over the floor. Each friend breathes at its own rate and blinks on its own timer; the one who asks stretches toward where it wants to be and, after a still while, gives one small hop (three at most, further and further apart); Dot's colour follows its company; Bo alone on the plank dozes and snores. All of it runs on the attended clock and stops when the game is unattended or hidden.
- **Motion and sound on every touch.** A press on a friend is answered in the same frame with a squash and that friend's own voice, before the tap is known. Each of the thirty cells of the grid has its own motion and its own sound (`cells.ts`, `grid.ts`); a tap on the plank, the sand, the rake, the stone, the snail or the floor round the tray is answered too.
- **Weight, squash and follow-through.** Hops gather, leap, arc and land with a squash set by each friend's own numbers; the plank turns faster for a bigger difference, knocks, rebounds and settles; a throw is higher for a lighter friend; the crown and the belly swing on, and Dot's speckles follow its moves. A friend on another rides its squash.
- **Kid-clear.** Four large bodies in four hues the sand does not have, one plank, one stone, a plain pale surface; the place round the tray is drawn fainter than all of them. The smallest friend is about 105 logical pixels across and answers a touch a little beyond her body. Nothing that answers a touch is in the bottom strip, and the top right corner, where the grown-up overlay is opened, answers nothing at all.
- **Wordless clarity for the declared age.** No word, numeral or symbol on the kid side (`npm run -s wordless:check`). Everything essential is one tap, and a second tap undoes the first. One want in every scene: the asker, or after a ride the friend who waits. An error is a state of the plank that the friends react to, never a verdict.
- **Wordless guidance.** The whole idle ladder: a warm ring on the sand under one friend, then a ghost hand that taps it once, backing off and stopping; any touch clears it. During a ride it shows a friend standing in the sand, taken in turn, and a friend whose tap is not the answer comes before one whose tap is; where every friend it can show is the answer, at the first kind of ride and the last, it shows the answer. After a ride it shows the friend who waits. A new kind of ride is shown once by a friend, with no word, and that showing is never the answer.
- **60 fps on a mid-range iPad.** Not measured. What can be said: 31 to 34 draw calls, about 18,600 triangles, no shadow map, no post pass, pixel ratio capped at 2, one 480 by 400 texture sent again only in a frame that marked the sand, three canvases for the place round the tray painted once at mount, every program compiled and drawn once at mount, a counted frame-budget test (`frameBudget.test.ts`). The game's own work per frame, one reading in Chromium at six times CPU throttle with the top tier pinned: 7.3 ms at the 95th percentile, render submit included on this renderer.
- **Procedural or committed assets only.** Everything is geometry, a shader and a handful of canvases drawn at run time. No file is loaded.
- **Its own art direction.** Sand tray, on a mat on a veranda with one snail: `ART.md`, "The look" and "What is in the frame".

Beyond the bar:

- **Found as left.** What is saved is who is where, the ride on screen, the showings that have played, the sand as a coarse grid and whether the child has ever touched the game; never a friend in the air or in the hand. A scene's outcome, its marks included, is saved before its first beat, and tests hold that an ending or a showing put away or touched at any instant is found finished and never replays. A friend in the hand at put-away goes back to where it was picked up from and no move is made or counted. A ride put away between its deciding move and its ending is found ended, and no scene starts by itself on load.
- **How a cycle restarts.** The ending stays; the friend who asks next waits in front of the stone and never hurries anyone; a touch on it lays out the next ride. If the child does nothing, nothing starts.
- **Nothing passes through anything.** The intersection audit is clean and enforced on moments that play one visit straight through; 30 contacts are allowed, each with its reason and cap. A model test measures overlap on the shapes as drawn on every frame of two minutes of seeded play on four seeds.
- **The hidden position.** Six ids naming places in the game's own order; a saved position wins over the age; it moves one step between rides and nothing shows it.

### The learning claim

As the sheet has it (`ART.md`, "The claim"), with every check state read on 2026-10-03; read them again on the day of the pull request.

Princess Playground is designed from five California learning foundations published by state departments, which are foundations and not standards (`us-ca 1.1` Exploration and `us-ca 2.2` Social Interactions for infants and toddlers; `us-ca 3.1` Measurement and Data, `us-ca 2.1` Physical Science and `us-ca 1.8` Self for preschool and transitional kindergarten), each confirmed; for a five-year-old, in its one-against-one rides only, from one California content standard adopted by the State Board, `us-ca K.MD.2`, confirmed; and from seven statements of SLO's Dutch content cards for peuters and for fase 1, which are curriculum-institute guidance and not law (`nl Gewicht / 1`, `2` and `3` and `Open staan voor de emoties van een ander / 4` for peuters; `nl Gewicht / 4` and `5` and `Herkennen, begrijpen van en aanpassen aan emoties van anderen / 4` for fase 1), each confirmed.

What it takes from them, and from which: causing an effect and guessing what comes next from `us-ca 1.1` alone; exploring and comparing how heavy things are from `us-ca 2.1`, `us-ca 3.1` and `us-ca K.MD.2` and from `nl Gewicht / 1`, `2` and `4`; doing that on a seesaw from `nl Gewicht / 3` and `5` alone, the seesaw being the game's own choice under the California records; noticing how a friend in the game is doing and answering with one simple act that is never required from `us-ca 2.2` and `us-ca 1.8` and the two Dutch social-emotional statements, which speak of other people where the game offers a character. A friend who stands apart and is brought in is the game's own situation, named by none of these records. It says nothing about what any child has reached. The sheet passed its fifth check (checker G) at commit `ca35987`, after four rounds of 16, 2, 3 and 1 findings, all pasted as written. The closing run then made three of its sentences true to the built game (Bo awake while he asks, in two places; Mog with no tail side), which touch nothing of the claim; that text, at commit `ebd6aea`, passed round 6 (checker H). The finishing run and its readers then made more sentences true to the game, listed in the status block with the sheet's commit and hash; none touches a record, a limit or the claim, and they wait for round 7.

### Defaults taken for the owner

- Every default under "Symbols, and the defaults awaiting the owner" in the guide, as written: no symbol, letter or word; no camera shake and no impact pause (the response is the chain, the sound and the squash); invented, synthesized voices and no speech.
- The demo's verb was kept and narrowed: the demo is dollhouse play over a whole playground, and its star was the seesaw. The game keeps picking a friend up and putting it on things, and makes the seesaw the whole playground.
- The game's own choices, which no record sets: four friends, weights 2, 3, 3 and 4, six positions, a ride judged by moves beyond the fewest (well within 2, mixed within 5).

### What the next builder should know

- Put places on the grid you save them on. Once every place in the sand came from one grid function, saving and loading became exact, and the test that makes 300 seeded moves through storage has held since.
- Search for a free place, do not push. Looking outward in rings from the wanted place and taking the first free one is shorter than pushing away from each neighbour, and always ends.
- A voice as numbers is cheap to hold in range. The test over every voice at the edges of its inputs caught a thump whose glide went under the lowest frequency.
- Check that the audit's taps land before believing a clean run. The first three clean runs here reached one state: `find` matches a mesh's path, so an anchored pattern matched nothing and every tap fell on the sand. The contact sheet shows it at a glance: every frame looked the same.
- The audit's `reload` cannot give a fresh slot: the game saves as the page goes away and writes the slot again. Play one visit straight through instead, and use `reload()` with no entries for the found-as-left moment.
- When the audit keeps one finding at one sample, replay its exact timings on the model (a press, 66 ms, the tap, 33 ms, then the wait, in 16.5 ms frames) and measure the overlap there. That is how two hops at once were found; guessing from the picture cost four runs.
- Measure overlap on the shapes as drawn. A distance between middles passed a pair that the drawn eggs failed, and failed a pair that only touched.
- A scene that marks a surface cannot know its marks before it has played. Play it first on a twin of the model and save what the twin did; draw whatever is left when a touch ends the scene.
- Draw one hidden frame with everything shown at mount. On a software renderer the first draw of each material stalled 4 to 12 seconds and looked like a hang; a still taken across it timed out.
- A friend leaving a moving thing must leave at once. Gathering itself for a hop while the plank swung away put the plank through it.
- Things that sit on things should ride them where they are drawn: on the very top, following the squash and the lean of the one below, with no sinking in to look snug. Sinking in a twentieth read as a third to the audit and to the eye.
- On a software renderer, read layout and colour from a still and nothing else.
