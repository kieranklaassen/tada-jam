<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Resumed: taking up 'Round 6 of your sheet passed' (the points where the game does less than the sheet says, the put-away case among them), then 'to take up when the run before this one has ended' (the reader step). The work cut off in the middle (the closing run's own list) was finished first.
- Stage: gates. Every gate this machine can run has been run at the tip and passed. **One gate could not be run here: the frame rate on a graphics card** (`npm run perf:jam -- princess-playground` in WebKit and throttled Chrome, and a physical iPad). The machine has no graphics card and no WebKit, so every frame is drawn in software and a frame rate read here would measure the software renderer. The lead runs it.
- Sheet: **passed in round 6** (checker H), as it stood at commit `ebd6aea5b99e7246e9809cdf9577f103b048aa3e`: hash of the sheet part (everything above `## The look`) `89ccbacef6a45502243a07d4e1bf843282016fb3dd94297bd7d1af1275b24d06`. It has changed since in the sentences listed below, so round 7 is asked for.
  - Round 1 (checker B): 16 findings, on commit `132bc32` (hash `05fd9b42…d82fd6`). All 16 pasted as written in `19240ad`.
  - Round 2 (checker D): 2 findings, on commit `19240ad` (hash `c2e26354…1661`). Both pasted as written in `67f6589`.
  - Round 3 (checker E): 3 findings, on commit `67f6589` (hash `10298789…5295`). All three pasted as written in `0cf0982`.
  - Round 4 (checker F): 1 finding, on commit `0cf0982` (hash `a44b954d…c9ab`). Pasted as written in `ca35987`.
  - Round 5 (checker G): passed, no finding, on commit `ca35987` (hash `eea42219…b03b`).
  - Round 6 (checker H): passed, no finding, on commit `ebd6aea` (hash `89ccbace…4d06`): the three sentences the closing run made true (Bo awake at his own ride, in two places; Mog's low-end cell).
  - Nothing was disputed in any round.
- After round 6 the sheet was read against the game three more times: by this lane, the grid cell by cell; against the lead's list of points where the game did less than the sheet; and three times by readers who had not seen the build (the last report is below). Whatever a child should see or hear was built (listed below). The sentences that said a detail other than the game does were made true, in every place the sheet says them. None touches the mechanic, the error, the designed order, the records or the claim. Two touch what is saved or loaded: a new field `touched`, and a decided ride found ended on load.
  - Sheet now: commit `93057d402d8d7edf2350ddaa97c05961fcba5c5b`, hash of the sheet part `f4f40fde30f0b41e32e040d2fccbd0a2557cc8909f4045b9ebc05d096ed5432f`, unchanged since that commit.
  - Grid, Bo, "Tap it". Old: "Rumbles, rocks twice to get going and thuds to the end on his side, or off it." New: "Rumbles, rocks twice to get going and thuds to the end on his side; tapped on the plank he rumbles and thuds off it at once."
  - Scenes, "Tidying", first two sentences. Old: "While the sand holds marks, a small rake lies at the far rim. A tap on it draws it once across the tray and leaves even raked lines." New: "While the sand holds marks, a small rake lies at the far rim, from the child's first touch of anything on: the first showing marks the sand before that touch, and no tool is on screen then. A tap on it draws it once along the far rim, from one side of the tray to the other, and the sand behind it lies in even raked lines again."
  - What is stored, `marks`, last sentence. Old: "The rake lies out while any cell holds a mark deeper than raked." New: "The rake lies out while any cell holds a mark deeper than raked, once `touched` is set."
  - What is stored, a new row after `marks`. New: "`touched`: The child has touched the game at least once, ever. It is never shown. Until it is set no tool is on screen: the rake stays away."
  - The toy, "The action", end of the last sentence. Old: "let go over the sand and it stands where it fell." New: "let go over the sand and it stands where it fell, or at the nearest free place when it fell on the plank's own ground, against a friend or at the rim."
  - The grid, opening paragraph, last sentence. Old: ""Low end" and "high end" are the ends of the plank as it stands at that moment." New: ""Low end" and "high end" are the ends of the plank as it stands at that moment. The end that is down always holds someone, so a friend sent onto the low end lands on a head there: its cell under "Onto the low end" plays, and the one below answers as it does to anyone on its head. "Onto a friend's head" is a head on an end that is up or level. A friend whose landing on an empty end makes the two ends the same finds nobody up and nobody down: the plank floats, everyone on it hums and sways, and no cell of the high end plays."
  - The toy, "What it does in an empty scene", last sentence. Old: "A friend who lands on the high end without tipping it just dangles up there, legs kicking, and the plank creaks." New: "A friend who lands on the high end without tipping it just dangles up there and answers in its own way, and the plank creaks."
  - Grid, Pim, "Onto the low end". Old: "A tiny tick; the end sinks a hair deeper and she stamps on it, cross that nothing moved." New: "She lands on the head of whoever holds it down and crows; then a tiny tick, the end sinks a hair deeper and she stamps, cross that nothing moved."
  - Grid, Pim, "Onto the high end", second sentence. Old: "If not: she dangles high, kicking, and trills." New: "If not: she dangles high, wriggling and hopping on the spot, and trills."
  - Grid, Mog, "Onto the low end". Old: "A soft thud; he circles once and sits." New: "A soft thud on the head of whoever holds it down; he circles once, kneads it and sits with his purr."
  - Grid, Mog, "Onto a friend's head". Old: "Kneads the head below twice, two muffled pats, then sits with a short chirr; Pim underneath blows a raspberry." New: "Kneads the head below twice, two muffled pats and a short chirr, then sits with his purr; Pim underneath blows a raspberry."
  - Grid, Dot, "Onto the low end". Old: "A thud and a two-note hum, brighter still if someone already sits there; alone on the plank the hum dies away and Dot peeks over at the others." New: "A thud and a bright two-note hum, then its duet with the one it lands on. Alone on the plank, wherever it landed, the hum dies away and Dot peeks over at the others."
  - Grid, Dot, "Dropped in the sand", end of the last sentence. Old: "alone it pales and draws one ring in the sand with its foot, a faint slow scratch." New: "alone it pales and draws one swirl in the sand with its foot, a faint slow scratch."
  - Wrong uses, first clause. Old: "a light friend sent to lift a heavy one dangles in the air and kicks;" New: "a light friend sent to lift a heavy one dangles in the air, too light to tip it;"
  - The error, "Too light", second sentence, its opening. Old: "It sits high in the air on the far end, legs kicking, the plank creaks and stays," New: "It sits high in the air on the far end and answers in its own way, the plank creaks and stays,"
  - What is stored, `marks`, second sentence, its opening. Old: "craters, hollows and Dot's rings are all kept this way" New: "craters, hollows and Dot's swirls are all kept this way"
  - Characters, Pim, "Dislikes, every time", second sentence. Old: "Nothing moving when she lands: she stamps." New: "Nothing moving when she lands on an end that is already down: she stamps."
  - Characters, Dot, "Likes, every time", second sentence. Old: "Sharing an end or a patch of sand with someone: a two-note hum, and a duet with whoever is under or over it." New: "Sharing an end with someone: a duet with whoever is under or over it, after a bright two-note hum when it lands on the end that is down. Sharing a patch of sand with someone: it stays warm and hums one soft note."
  - Characters, Dot, "Dislikes, every time", end of the sentence. Old: "it pales, goes quiet and draws one ring in the sand, once, when it is left alone." New: "it pales, goes quiet and draws one swirl in the sand, once, when it is left alone."
  - The ride, beat 3, second sentence. Old: "How far each end travels and who is tossed how high come from the two totals as they stand." New: "How far each end travels comes from the two totals as they stand, and who is tossed how high from those and from how heavy the one tossed is: two friends of one weight fly equally high."
  - The ride, the sentence after its beats. Old: "Any touch ends it at once with every beat at its end, and is then an ordinary touch." New: "Any touch ends it at once with every beat at its end, and is then an ordinary touch. A touch on the friend who asks next only ends the scene: that friend goes to the waiting place, and the next ride begins with a touch on it there."
  - The showings, opening paragraph, end of the third sentence. Old: "any touch ends one with every beat at its end." New: "any touch ends one with every beat at its end. If the child touches anything before a showing has begun, it does not play then: it waits for the next time a ride of that kind is laid out."
  - The showings, `middle-asks`. Old: "`middle-asks`: Pim hops onto the far end, dangles and kicks, and hops off again." New: "`middle-asks`: Pim hops onto the far end, dangles and wriggles, and hops off again."
  - How a ride ends and the next begins, last sentence. Old: "On load nothing replays: the world is as the last ride left it, with the next asker waiting, or mid-ride exactly as it was." New: "On load nothing replays: the world is as the last ride left it, with the next asker waiting, or mid-ride exactly as it was. A ride put away after the move that carried the asker there and before its ending began is found ended: it is judged and the next asker waits, as its ending would have left them, the ending does not play by itself, and the sand is as it was put away, without the bites that ending would have made. A showing that was due and had not begun plays when the game is opened, as the very first one does."
  - Why, in order. A friend who leaves the plank leaves at once, since the plank swings the moment its weight is gone and must not swing through him. The rake travels along the rim, where it passes through nothing, and the sheet's own age rule allows no tool on screen before it means something, so it waits for the first touch, which has to be saved for the game to be found as left. The end that is down always holds someone (an empty plank and equal ends lie level), so the low-end column as first written could never play: it is now a landing on that head, and each friend's cell says what it does there. The friends are pebbles and have no legs to kick. A closed ring left lying in the sand reads as a nought, which a game for this band may not draw, so Dot's mark is an open swirl. A toss depends on how heavy the one tossed is as well as on the two totals. An ending that started by itself on load would be the game acting without the child's touch, and the friend who lifted the asker may be the one who asks next, so the load finds what the ending would have left. A friend cannot stand under the plank, in another friend or in the rim, so one let go there stands at the nearest free place. A touch that ends the ending lands on the next asker where it still sits, not where it waits, so it begins nothing. A showing never plays over a child who is already playing. And a landing that makes the ends the same has no high end to answer for.
- Open: sheet ready for check, round 7
- Answers handled: `docs/build/answers/princess-playground-1.md` to `-6.md` on the base branch.
- Look in use: sand tray, the first reserved choice. The owner has answered on the look: yes.

**What the lead should try first.** Open the production build with a fresh slot and touch nothing for ten seconds: the first showing plays, then the glow, then the hand. Tap the friend the hand shows; watch the fling and the ending; tap the friend who then waits in front of the stone. After that: carry Dot onto the plank (it warms and the others bounce), seat Mog against Dot (the plank floats and hums), stack all four on one end, let a friend go over the middle of the plank, draw in the sand and tap the rake on the far rim. `?seed=1` fixes the detail for stills.

**Gates run at the tip, on this machine (2026-10-03).**

- `npx tsc --noEmit`: clean.
- `npx vitest run games/princess-playground test/games.test.ts`: all passed (the game's own files take about 13 s, most of it the two long seeded plays).
- `npm run -s wordless:check`, `node scripts/egress-check.ts`: passed.
- `npm run build`, `npm run egress:built`, `npm run education:built`: passed.
- `npm run check:intersections -- princess-playground --ci` with `enforce: true`: clean five times after the closing run's changes, two of them under full CPU load, each time 0 open, 17 allowed, 1 hidden, 353 samples, 25 pieces. Here it ran on the machine's own, older Chromium, reached through a scratch browsers path; CI runs it with the repository's browser.
- Not run, and why: the frame rate (above); and nobody has listened to the game, since the machine has no sound.
- CI, as far as it can be read from here (run results and annotations through the API; the job logs' host is not reachable): green on both runs at `7519329`, the audit's four shards included. Two earlier push runs (`c02970f`, `8dab21c`) were red on a test of another game, `games/pebble-table/controller.test.ts:443`, which passed on the same commits in their pull-request runs; this lane does not touch it. One pull-request run was red on this game's audit, at `4eb398d`, when it was enforced with findings still open; they were fixed in `c9d838f`. The same is said once in a comment on draft pull request 37. The runs for the closing run's commits are the lead's to read.
- One reading that carries over, taken once before the closing run and so only a first reading: the game's own work per frame in Chromium on SwiftShader, top tier pinned, production build, 1180 by 820 at pixel ratio 2, through eight taps: 1.8 ms at the 95th percentile unthrottled and 7.3 ms at six times CPU throttle, 25 draw calls. On this renderer the timed span includes the render submit.

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
- Pim's crown is low and wide. With it on she is still the lowest outline in the tray; before, the lightest friend was the tallest. A test holds it.
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

**Found by this lane while checking those.**

- A friend held on the picture of the plank's end did not land on the plank: carried friends hang high over the tray, so it hung over the sand in front and came down there. The finger is now also read at the height of a friend sitting on the plank (`arrangement.ts`, `aimedAtPlank`), so what the child sees decides. The audit's own "carried" moment had been dropping friends in the sand all along; it now really lands them on the ends, onto a friend and over the middle.
- The intersection audit plays the build that lies in `dist`, and several runs in this run were made without building first: those clean results said nothing. Every result named under the gates below is from a build made after the last change to the code.

**Still weak.** Nothing here is short of a sentence of the sheet, as far as this lane and its reader have read it.

- Bo rocks twice only when he starts from the sand. Tapped on the plank he leaves at once, and the sheet says so.
- The friends are pebbles: Pim's "kick" on a high end she cannot tip is a wriggle and small hops on the spot, and the sheet says so.
- On the low end several things now happen in a row (Pim crows and then stamps; Mog circles, kneads and purrs; Dot hums and then sings its duet), up to about two seconds in all. Whether that is lively or too much has not been heard or seen in motion.
- The grains that lie on a head are a few small points for under half a second. They are there, and small.
- A load draws the sand from the coarse grid alone, as the sheet says, so a groove the child drew comes back as a row of soft hollows, and Dot's swirl as a soft round patch.
- The held secrets sound for as long as they hold: a plank left level hums every couple of seconds, and Bo left alone snores every few, until the child changes something or puts the game away. That is the sheet; whether it wears is for someone who can hear it.
- Nobody has heard the game. Every voice is numbers inside ranges; whether the thumps, squeaks and hums sit well together is unknown, and so is whether Bo's chuckle and Mog's purr now come too often in free play.
- Motion was judged from model tests, stills and the audit's pictures, never from video.
- The rake appears at the child's first touch, wherever that touch lands. It does not slide in; it is simply there.
- Two friends hopping to different places at the same moment can pass through each other in the air. A hop clears whoever stood in its way when it left, not whoever is flying.
- The waiting place is beside Pim's default place; a big friend waiting there stands close to her.
- The idle glow is faint on the pale sand at tier 0 in stills.
- A friend's hollow in the sand, and the crater Bo leaves, are round dimples with a lit lip. Both readers looking for unmeant signs passed them; from far off a single one is a small round mark. The idle glow is a wide soft halo under a friend; the second reader looked at it and did not read it as a nought.
- Pim's crown is now small. It is cream on coral and reads as a cap; whether it still reads as a crown is for the owner.
- With every friend on one end the tip of the board lies about a fifth of a unit under the sand, inside the bite drawn round it.
- A carried friend lands on the plank when the finger is on the plank's picture or when the friend hangs over it. Between the two readings there is a band in front of the plank where a friend held low lands on the plank and held high stands in the sand; the shadow shows the second.

**Open, for the lead.**

- The frame rate on a graphics card, WebKit and a physical iPad: the one gate not run.
- The sheet's check, round 7, on the sentences listed above and nothing else.
- The registry row: its text is at the end of `ART.md`.
- Someone to listen to the game.
- Draft pull request 37 is open from this branch so that it can be read; the lead merges by squash and may close it.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The parts below belong to the block.

### Where things are

| File | What it holds |
| --- | --- |
| `world.ts` | The tray, the plank and the four friends as numbers; where a friend may stand; the grid places lie on. |
| `arrangement.ts` | Who is where: the model of the world. A tap, a friend let go, the tilt from the two totals, Dot in company. |
| `plank.ts` | The plank turning, knocking and floating level. |
| `motion.ts`, `personality.ts`, `pose.ts`, `rest.ts` | Friends hopping, riding, tossed and carried, each by its own numbers; what the view draws. |
| `voices.ts`, `sound.ts` | Every sound as numbers inside stated ranges; the bridge to Web Audio. |
| `rides.ts` | The designed order: five kinds and the mixed place, layouts, when a want is met, judging, what a move does. |
| `save.ts`, `marks.ts` | What is saved and how it is repaired; the sand as a coarse grid. |
| `tastes.ts`, `grid.ts`, `cells.ts` | The friends' fixed tastes; the object-by-action grid as data; each cell's own motion and sound when a friend lands. |
| `game.ts`, `scenes.ts`, `forecast.ts` | The game on the toy, with no renderer: rides, endings, showings, the idle ladder, what is saved; the scenes' beats; a scene's marks read ahead on a twin. |
| `grains.ts`, `overlap.ts` | The grains a knock throws; how deep one drawn body is inside another, for the tests. |
| `view/` | The three.js stage: the sand shader and its height canvas, the friends' meshes, the rake, the grains, the ghost hand. |
| `scripts/intersections/games/princess-playground.ts` | The audit's moments and allowances. |

### Template notes

- `config.ts`: changed, as meant. Added a `grain` field to `Tier`, the ladder ids, the first-visit rows, and three numbers for judging a ride. **For the template:** `FIRST_VISIT` puts its second row at the band's oldest age; a band of 2 to 5 wanted the step at 4, so the row was rewritten. A comment saying the rows are the game's to choose would save the next builder a look.
- The Mount (`princess-playground.tsx`): changed in the places its comments mark and nowhere else: the stage is made, `applyTier` sets the grain, `draw` renders (the bare tray until the slot is read), `resize` sizes the renderer, gestures go to the game, the loop steps it, and the game's cues and saves are flushed in the handler and after each step. The pilot notes' list for the Mount was followed point by point. **For the template:** a three.js game stalls a frame the first time each material is drawn; this game draws one hidden frame with everything shown at mount. On a software renderer the stall was 4 to 12 seconds a material and looked like a hang. **For the template:** `resize` sets `canvas.width` and `canvas.height` itself; a three.js game must replace those two assignments with its renderer's own sizing, and the comment there could say so. The loop also throws away the step `clock.advance` returns; the game has to change that line to keep it.
- `audio.ts`: as the template has it now: the closing run took the template's count of fingers on the glass and its test, and changed nothing else. `tone` and `noise` were enough for every voice. **For the template:** a voice written as a list of numbers with a test on its ranges (this game's `voices.ts` and `sound.ts`) would serve any builder who cannot hear; it is about forty lines.
- `input.ts`: used as copied. The press, tap and drag gestures mapped onto touch, hop and carry without change.
- `state.ts`: used as copied and wrapped by `save.ts`, as its header says to. The second read of the raw record worked as described.
- `scene.ts`: used as copied, for the ending and the five showings. **For the template:** a scene's outcome is saved when it starts, but the sand a scene marks is only known once it has played. This game plays the scene first on a twin of its model (`forecast.ts`); a line in the header on outcomes that are only known by playing would help the next game with a surface.
- `overlay.ts`: changed in one place. A touch-down in the corner counts as a tap only while no other finger is on the surface and at least 80 ms after the last one, so a hand slapped or laid on the corner does not open it; the Mount passes the number of fingers down. The template counts every touch-down, and its comment asks for backdrop under the corner "where nothing answers a touch": in this game the cloth answered every touch with a hiss, so the Mount now leaves a touch in the corner unanswered.
- `guidance.ts`: the game reads `glow`, `demo` and `demoIndex`, and `handPose` for the hand's one tap.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen, untouched.
- `ART.md`: the outline's line under `## The records` was replaced by a sentence of the game's own.

### For the owner to decide

- The look: sand tray, as the stills show it. The friends are painted pebbles with faces; the ledger row says "a few smooth stones or shells as the only objects" and "no characters made of the material", which this reads as: characters may be stones, never sand.
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

The closing run made no pass of its own: it built the small things the passed sheet promises and the game had left out, listed in the status block, and ran the audit and every check again.

The finishing run made no pass of its own either. It built what the lead's reader and then its own reader found short of the sheet, listed in the status block, looked at stills of Dot apart, the looks, a touch, the slide and the grains on a head, and ran the audit and every check again.

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

Nothing here is a frame rate. Every number was read on a machine with no graphics card (Chromium on SwiftShader), and no physical iPad was measured.

- **Alive at idle.** Each friend breathes at its own rate and blinks on its own timer; the one who asks stretches toward where it wants to be and, after a still while, gives one small hop (three at most, further and further apart); Dot's colour follows its company; Bo alone on the plank dozes and snores. All of it runs on the attended clock and stops when the game is unattended or hidden.
- **Motion and sound on every touch.** A press on a friend is answered in the same frame with a squash and that friend's own voice, before the tap is known. Each of the thirty cells of the grid has its own motion and its own sound (`cells.ts`, `grid.ts`); a tap on the plank, the sand, the rake or the cloth is answered too.
- **Weight, squash and follow-through.** Hops gather, leap, arc and land with a squash set by each friend's own numbers; the plank turns faster for a bigger difference, knocks, rebounds and settles; a throw is higher for a lighter friend; the crown, the ears and the belly swing on. A friend on another rides its squash.
- **Kid-clear.** Four large bodies in four hues the sand does not have, one plank, one stone, a plain pale surface. The smallest friend answers a touch within about 115 to 130 logical pixels across. Nothing that answers a touch is in the bottom strip, and the top right corner, where the grown-up overlay is opened, answers nothing at all.
- **Wordless clarity for the declared age.** No word, numeral or symbol on the kid side (`npm run -s wordless:check`). Everything essential is one tap, and a second tap undoes the first. One want in every scene: the asker, or after a ride the friend who waits. An error is a state of the plank that the friends react to, never a verdict.
- **Wordless guidance.** The whole idle ladder: a warm ring on the sand under one friend, then a ghost hand that taps it once, backing off and stopping; any touch clears it. It shows a move, never the answer: during a ride a friend standing in the sand, taken in turn; after one, the friend who waits. A new kind of ride is shown once by a friend, with no word.
- **60 fps on a mid-range iPad.** Not measured. What can be said: 25 to 27 draw calls, about 16,400 triangles, no shadow map, no post pass, pixel ratio capped at 2, one 512 by 320 texture sent again only in a frame that marked the sand, every program compiled and drawn once at mount, a counted frame-budget test (`frameBudget.test.ts`). The game's own work per frame, one reading in Chromium at six times CPU throttle with the top tier pinned: 7.3 ms at the 95th percentile, render submit included on this renderer.
- **Procedural or committed assets only.** Everything is geometry, a shader and two small canvases drawn at run time. No file is loaded.
- **Its own art direction.** Sand tray: `ART.md`, "The look".

Beyond the bar:

- **Found as left.** What is saved is who is where, the ride on screen, the showings that have played, the sand as a coarse grid and whether the child has ever touched the game; never a friend in the air or in the hand. A scene's outcome, its marks included, is saved before its first beat, and tests hold that an ending or a showing put away or touched at any instant is found finished and never replays. A friend in the hand at put-away goes back to where it was picked up from and no move is made or counted. A ride put away between its deciding move and its ending is found ended, and no scene starts by itself on load.
- **How a cycle restarts.** The ending stays; the friend who asks next waits in front of the stone and never hurries anyone; a touch on it lays out the next ride. If the child does nothing, nothing starts.
- **Nothing passes through anything.** The intersection audit is clean and enforced on moments that play one visit straight through; 17 contacts are allowed, each with its reason and cap. A model test measures overlap on the shapes as drawn on every frame of two minutes of seeded play on four seeds.
- **The hidden position.** Six ids naming places in the game's own order; a saved position wins over the age; it moves one step between rides and nothing shows it.

### The learning claim

As the sheet has it (`ART.md`, "The claim"), with every check state read on 2026-10-03; read them again on the day of the pull request.

Princess Playground is designed from five California learning foundations published by state departments, which are foundations and not standards (`us-ca 1.1` Exploration and `us-ca 2.2` Social Interactions for infants and toddlers; `us-ca 3.1` Measurement and Data, `us-ca 2.1` Physical Science and `us-ca 1.8` Self for preschool and transitional kindergarten), each confirmed; for a five-year-old, in its one-against-one rides only, from one California content standard adopted by the State Board, `us-ca K.MD.2`, confirmed; and from seven statements of SLO's Dutch content cards for peuters and for fase 1, which are curriculum-institute guidance and not law (`nl Gewicht / 1`, `2` and `3` and `Open staan voor de emoties van een ander / 4` for peuters; `nl Gewicht / 4` and `5` and `Herkennen, begrijpen van en aanpassen aan emoties van anderen / 4` for fase 1), each confirmed.

What it takes from them, and from which: causing an effect and guessing what comes next from `us-ca 1.1` alone; exploring and comparing how heavy things are from `us-ca 2.1`, `us-ca 3.1` and `us-ca K.MD.2` and from `nl Gewicht / 1`, `2` and `4`; doing that on a seesaw from `nl Gewicht / 3` and `5` alone, the seesaw being the game's own choice under the California records; noticing how a friend in the game is doing and answering with one simple act that is never required from `us-ca 2.2` and `us-ca 1.8` and the two Dutch social-emotional statements, which speak of other people where the game offers a character. A friend who stands apart and is brought in is the game's own situation, named by none of these records. It says nothing about what any child has reached. The sheet passed its fifth check (checker G) at commit `ca35987`, after four rounds of 16, 2, 3 and 1 findings, all pasted as written. The closing run then made three of its sentences true to the built game (Bo awake while he asks, in two places; Mog with no tail side), which touch nothing of the claim; that text is at commit `ebd6aea` and waits for round 6 on those sentences alone.

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
