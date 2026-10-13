# Answers for Mierennest: the code review before the pull request

Your folder is on the base branch (brought in by path at your commit `2589723c`; your later status note comes with the next bring-in). Before the pull request two reviewers who are not you read the code at `81a7f7ee`: one for correctness and the jam's contract, who ran your rule modules from scripts of its own on thousands of raids and random games, and one for what could be made simpler. Both reports are below, whole. This run answers them.

## What this run does

**First, the correctness review, in its order.** Every finding there is accepted. Each fix comes with the test the finding names, and that test fails before the fix.

- 1 (a raid never ends where the way to a place in a room leaves the room): the fix as given, and the test with the picture as given.
- 2 (a beetle on its way down the shaft goes home when anything moves): the fix as given.
- 3 (a raid cut off at the cap is judged as one that went well): the lead decides it: such a raid is `not-judged`, as a put-away is, and never moves the position. With findings 1 and 2 fixed no raid should reach the cap; add a test over your seeds that none does.
- 4 (the bell that waited starts the raid under a working finger) and 5 (a stone is made when the struck stone is in the jaws): the fixes as given, each with its test.
- 6 to 13 (tests that pass with the behaviour broken): strengthen each as it says. Where a strengthened test then fails on the game as it stands, the game is wrong: fix it and say so in the status block.
- 14 (the floors worked out every frame; it is finding 11 of the other review) and 15 (canvases dropped without letting their store go): the fixes as given.

**Then, the simplifications, one commit each, the whole folder's tests green after each.** Do 1, 2, 3, 4, 5, 6, 7, 9, 10, 11 (its first step, and the second only if the tests named hold it), 12, and 8 by aliases and imports. Each leaves what a child sees, hears and what is saved exactly as it is. If one needs a test changed in any way but an import or a helper's name, leave it out and say so in the status block. Change no sentence above `## The look`, and leave the four frozen files and the files used as copied alone.

**Then:** the checks CLOUD.md names for a stage boundary, your work a frame measured once more on the fullest raid (finding 14 and finding 12 of the second review should show there), the status block with one line for each finding of both reviews (done, with its test; or left, with why), the section "For the pull request" kept true, push, and the short report. No reader and no stills, unless a fix changed what is seen: then three stills on a stills branch.

## The correctness review

Mierennest: code review for correctness and the jam's contract, of `games/mierennest/` at commit 81a7f7eea43447d85605af54fbf280cf545a9b86 (branch `feat/learning-games-build`).

No game file was changed, no test suite and no build were run. Where a finding says "ran", the rule modules were imported as they stand by small scripts kept outside the repository, and nothing else.

## What was done

- **Read in full:** `ground.ts`, `build.ts`, `chambers.ts`, `walls.ts`, `routes.ts`, `raid.ts`, `machines.ts`, `kingdom.ts`, `toy.ts`, `order.ts`, `save.ts`, `state.ts`, `habits.ts`, `residents.ts`, `input.ts`, `mierennest.tsx`, and the tests beside the rules. The view folder, `audio.ts` and the four frozen files were read for how they are used.
- **Ran, outside the repository, on the rule modules as they stand:**
  - Random play through `Kingdom` as the Mount drives it (press, drag, release, cancel, bell, put-away, reload): 12 games of 2,500 actions, each from a place in the order drawn by its seed, with the kit counted (ground, cups, shots in the air) after every action, and every save read back.
  - 4,716 raids on the 262 of 400 random nests that have a chamber (one to five rooms, halls one to three cells high, up to 30 lumps set down), every party of the order and of the round, played to their end with no shot fired; 1,620 more with random hits.
  - The single cases named under the findings.

## Findings, most severe first

### 1. P0: a raid never ends by itself where the way to a place in a room leaves the room

- **Where:** `raid.ts:927` (the chamber is given up) with `raid.ts:375` (the holder then queues), cut off at `raid.ts:1080`.
- **What goes wrong:** an invader that has a chamber gives it up on any step of its way that is not a cell of the room (a dip in the floor, a step down inside it). The next invader takes the chamber, the first now waits for the chamber, the second waits a body's length behind the first, and both stand still for 200 seconds of game time. The child cannot build meanwhile, and the raid is then judged as one that went well (finding 3).
- **Smallest case (ran):** a room six wide whose floor has one mouthful bitten out of it, against the three ants of `ant-file`, the second place in the order:

  ```
  XXXX...XXXXXXXXXXXXXXXXX
  ####...#################
  ####...#################
  ####...........#########
  ########.........#######
  ########.........#######
  ###########..###########
  ########################
  XXXXXXXXXXXXXXXXXXXXXXXX
  ```

  With the mouth at columns 4 to 6: `time 200.0, acts 0`, verdict `well`, all three `waiting`. The same room with a flat floor: `time 17.3, acts 3`, `not-well`. Two beetles do the same in a room with a step in its floor.
- **How often (ran):** 56 of 4,716 raids on random nests ran to `LONGEST`, every one with invaders `waiting`; 15 of them had no act finished.
- **Smallest fix:** `raid.ts:375`, in `holdUp`: `if (invader.room === 0 && queueAhead(raid, invader, way, k)) return 'queue'`. One who has a chamber goes to its place past one who waits. With that one change, on a copy outside the repository: 0 of 4,716 ran to `LONGEST`, and the case above plays `time 15.1, acts 3`. Keeping the chamber while `invader.spot >= 0` at line 927 instead removes the cause but left 1 of 4,716.
- **A test for it:** the picture above with `['ant', 'ant', 'ant']`, expecting `raid.time` under `LONGEST` and `raid.acts` 3. It belongs in `raid.test.ts:615`, 'nobody waits behind one who came later, so no two ever wait for each other', whose one picture has flat floors and so passes while two do wait for each other.
- **Sure:** 100. **Mechanical:** yes.

### 2. P1: a beetle on its way down the shaft goes home when anything in the copy moves

- **Where:** `raid.ts:243-244` (`changed`) with `raid.ts:970-973`.
- **What goes wrong:** `changed` empties the way of everyone who is going, the one in the middle of a step too. A beetle or a dung beetle that is between the mouth's row and the foot of the shaft then looks for its way from the mouth's row, where it has no place to stand, finds none, gives up and goes home, though the way in is open. So the second beetle of a pair is sent home by the first one shoving a lump, by a stone that rolls, by a ball that digs or by a shot that lands, and a wall that should have met two is met by one. The raid is easier than the nest earns, and by timing alone.
- **Case (ran):** the game's ground of seed 1, a tunnel two high to a room, one lump of sand on the tunnel's floor, `beetle-pair`: the first shoves the sand at 2.20 s, `givesUp` of the second at 2.20 s, one act. With a clear tunnel: two acts. On the random nests: 119 beetles sent home from the mouth's row, in 96 of the 810 raids with two or more beetles or balls.
- **Smallest fix:** in `changed`, in place of `invader.way = []`: `if (invader.along > 0) { invader.way = [invader.cell, invader.toward]; invader.step = 0 } else invader.way = []`. The step under way is finished and the way is looked for from where it lands. With it the case above plays two acts; with it and the fix of finding 1, 0 of 4,716 raids ran to `LONGEST`.
- **Sure:** 100. **Mechanical:** yes.

### 3. P2: a raid cut off at `LONGEST` is judged as one that went well

- **Where:** `raid.ts:1080-1083`, `raid.ts:1165` (`endOf`), `order.ts:63` (`judge`).
- **What goes wrong:** a raid ended by the cap, with invaders still on their way, often has `acts` 0 (15 of the 56 of finding 1), so `judge` gives `well` and the position moves one place forward for a raid nobody turned back. With finding 1 that is how a child with no defence passes `ant-file`.
- **Smallest fix:** `stepRaid` sets a field when it ends the raid by time and not because everyone is settled; `endOf` hands it on and `judge` gives `not-judged` for it, as for a put-away. A test: the case of finding 1 without its fix gives `not-judged`.
- **Sure:** 100 (ran: the case above, verdict `well`). **Mechanical:** no. The sheet has no such raid, so which verdict it gets is a decision; `not-judged` is the one that never moves the position.

### 4. P2: a bell that waited for falling ground starts the raid under a working finger

- **Where:** `kingdom.ts:678-681`.
- **What goes wrong:** `bell()` empties the hand before it calls the party (`toy.cancel()`, `dropMachine()`), and the path for a bell rung while the ground was falling does not. A child who rings during a pour and puts the finger back on the ground before it rests gets the raid started mid-drag: the drag goes on biting the real nest, a lump in the jaws is set down in it, a held machine is moved, all while the raid plays on its copy and none of it is seen until the put-back.
- **Case (ran):** a room, a lump of sand let fall, `bell()`, `press(10.5, 10.5)`, steps until `raid` is set, `drag(14.5, 10.5)`: earth in `game.ground` 588 to 581 with `raid` not null. In random play: 33 changes of the nest during a raid, 86 with a lump carried, 114 with a machine held; none of them once the two calls are made first.
- **Smallest fix:** at `kingdom.ts:680`, before `this.callParty()`: `this.toy.cancel(); this.dropMachine()`.
- **A test for it:** `kingdom.test.ts:86`, 'waits for the ground to rest', rings with no finger down. Add a press and a drag between the bell and the rest, and expect the ground unchanged by the drag once `k.raid` is set.
- **Sure:** 100. **Mechanical:** yes.

### 5. P2: a stone is made when the stone a level shot strikes is in the ant's jaws

- **Where:** `kingdom.ts:461-462` (`strike`), `build.ts:97` (`setDown`).
- **What goes wrong:** outside a raid a cannon's shot rolls a free stone one cell on. If the child took that stone in the jaws while the shot flew, `carried.from` still names the cell it has left, and `setDown` then writes a stone into the new cell without taking one away. The kit grows by a stone, which the save keeps.
- **Case (ran):** a hall of 16 cells, a cannon loaded with a stone, a free stone at the end; tap the cannon, press the stone 0.1 s later (the flight takes 0.54 s), drag two cells, let go: 32 stones before, 33 after.
- **Smallest fix:** in `strike`, before the `lean` of the nest branch: `if (this.toy.carried?.from === flying.hit) this.toy.cancel()`.
- **Sure:** 100 that it happens with that timing; the window is the flight of the shot, a second and a half at most. **Mechanical:** yes.

### 6. P2: 'pushes 6 however many balls lean on the wall: balls do not push together' never has two balls leaning

- **Where:** `raid.test.ts:699`, and `raid.test.ts:680` for the push of 6 itself.
- **What passes with the behaviour broken:** in each of its three pictures the first ball digs the roof as it comes, the second dung beetle is sent home from the mouth by finding 2, and the first and the third never lean at the same tick: at most one is ever `straining` (ran: most at once 1). With `ball += DUNG_BALL.push` in `pushOn` (`raid.ts:275`) every assertion passes. And no wall of hold 5 is ever put before one ball, so a push of 5 passes every raid test.
- **Smallest fix:** after the fix of finding 2 (ran: three strain at once and the walls still hold), watch the raid and expect the most `straining` at one tick to be 3; and add one ball against `'....sm.....'`, expecting one act and a `gave` event (ran: 1 act).
- **Sure:** 100 that two balls never lean together; 75 that a push of 5 passes every raid test, which was read and not run. **Mechanical:** yes.

### 7. P2: the careless-game test holds less than its name, and never has a machine in the nest

- **Where:** `kingdom.test.ts:894`, 'never throws, never loses a lump, never moves the position by chance, and reads back from any instant'.
- **What passes with the behaviour broken:** "never moves the position by chance" is held by `expect(LADDER).toContain(k.game.position)` (line 933), which no position the game can hold fails. "On a machine now and then" (lines 908 and 913) reads `k.game.machines[n % 2]` in a game that starts at `first-chamber`, where no machine has arrived, so a falling lump is never let go on a machine. "Reads back from any instant" asserts only that a new `Kingdom` has no raid and no scene, which its constructor gives. The bell is rung with no finger down, so finding 4 is not met either.
- **Smallest fix:** count the `judged` events with verdict `well` and expect `LADDER.indexOf(k.game.position)` to equal that count; start one of the seeds from a save at `the-cannon` with both machines; after a reload compare `whole(k.game)` and the ground with the save; keep the finger down across the steps after `bell()` in some turns and expect `equal(k.game.ground, before)` while `k.raid` is set.
- **Sure:** 100 for the position line; 75 that no machine is ever in the nest in its 220 turns. **Mechanical:** yes.

### 8. P3: 'never removes an invader: every one ends at home, held or stuck' cannot fail

- **Where:** `raid.test.ts:426`.
- **What passes with the behaviour broken:** `stepRaid` sets everyone who is not home or stuck to `held` when the raid is over (`raid.ts:1081`), and the party's length never changes, so both assertions hold for any raid at all, one that only ends at the cap included.
- **Smallest fix:** add `expect(raid.time).toBeLessThan(LONGEST)` and the state each kind ends in for each shot (an ant hit by mud `held`, the others `home`).
- **Sure:** 100. **Mechanical:** yes.

### 9. P3: a save with a machine and no mark of its showing gets the machine twice

- **Where:** `save.ts:151-161` (`deserialize`).
- **What goes wrong:** `shown` and `machines` are repaired apart. A record that keeps a machine and has lost its mark in `shown` reads back with the machine in the nest and its showing still owed, so the first touches play the arrival again and `startOwed` adds a second machine of that kind where the nest has a place for one. Play cannot make that record; a damaged or hand-made one can. The other way round, a damaged `position` keeps the mark of a machine that has not arrived, and the machine then never comes in the visit that reaches its place.
- **Case (ran):** the record of a fresh game with `position: 'the-cannon'`, one catapult in `machines` and `shown: ['ant', 'beetle', 'fly']` reads back with the catapult in the nest and both `catapult` and `cannon` owed.
- **Smallest fix:** in `deserialize`, add the kind of every machine it keeps to `shown`, and drop from `shown` a machine's mark whose kind is not in `allowed`.
- **Sure:** 100. **Mechanical:** yes.

### 10. P3: 'one that is held in a chamber ... keeps nobody out: stuck in mud, rolled up in a mud ball, gummed, or buried' plays no fly

- **Where:** `raid.test.ts:595`.
- **What passes with the behaviour broken:** the comment names a fly gummed where it hung, and both shots are played on `['ant', 'ant']`. The clause for one that is dazed and bound for home (`raid.ts:337`) is met only by the buried ant, and by a margin of 0.6 s against the `toBeLessThan(3)`.
- **Smallest fix:** add `['fly', 'fly']` with a mud shot in a room a fly reaches, expecting the second at its act within 3 s of the hit (run on a copy: 1.3 s as the code stands, 7.2 s with the clause taken out).
- **Sure:** 100. **Mechanical:** yes.

### 11. P3: 'scrambles out when sand pours where it stood' pours no sand

- **Where:** `toy.test.ts:322`.
- **What passes with the behaviour broken:** the drag bites rows 4 and 5 and leaves the row of earth at row 3 under the sand, so nothing pours, no `buried` event comes, and `toBeLessThanOrEqual(3)` allows none. The test passes with `unbury` taken out.
- **Smallest fix:** the picture `['XXXXX', '#sss#', '#####', '#...#', 'XXXXX']` with the ant at `[2, 3]`, `press(2.5, 2.5, 0)`, and expect exactly one `buried` and the ant's cell open.
- **Sure:** 100 (traced by hand, and run with the new picture: one `buried`). **Mechanical:** yes.

### 12. P3: the two tests of where a raider ant lets go pass with the rule taken out

- **Where:** `routes.test.ts:201`, 'climbs where it can and drops only where it gets no further', and `routes.test.ts:192`, 'steps off the edge of a floor that has nothing under its edge'.
- **What passes with the behaviour broken:** in both pictures of line 201 the only drop is at the last cell walked, so `reach` made as one pass with drops passes every assertion on an ant in the file, and line 209 is true by how `findIndex` builds it. Line 192 asserts only where the ant does not drop: with the two sides taken out of the drop loop at `routes.ts:76` it still passes. Both were run against copies of `routes.ts` changed that way.
- **Smallest fix:** for line 201 the picture `['XX.XXXXXXX', '##.#######', '##......##', '##.####.##', '#.......##', '#.......##', '#.......##', '##########', 'XXXXXXXXXX']`, expecting the way to end at `[7, 4]` with no step of more than one row; for line 192 add `expect(nexts(sandy, 'ant', 3, 1)).toContainEqual([4, 3])` with the `sandy` picture of line 69.
- **Sure:** 100. **Mechanical:** yes.

### 13. P3: 'on a floor two cells wide with two cells clear over it' never has half a floor alone

- **Where:** `machines.test.ts:11`.
- **What passes with the behaviour broken:** of the four places it refuses, `(1,3)` and `(2,3)` fail on the stone, `(3,3)` on the roof at `(4,2)`, and `(5,2)` has no floor at all. With `||` for `&&` in the last line of `canStand` (`machines.ts:40`), a machine stands with one side over a hole and the test passes.
- **Smallest fix:** `expect(canStand(fromPicture(['XXXX', '#..#', '#..#', '##.#', 'XXXX']), [], 1, 2)).toBe(false)`.
- **Sure:** 100. **Mechanical:** yes.

### 14. P3: every frame works out the floor of every chamber several times

- **Where:** `view/display.ts:603`, `609`, `621` and `631`, into `residents.ts:13-28`.
- **What goes wrong:** each frame calls `queenSeat` twice, `showFurnishings` and `workerSpots`, and each of them calls `floorOf` for a chamber, which filters and maps the room's cells and makes a `Set`. That is about two passes over every chamber's cells and several small lists for each chamber, sixty times a second, growing with the kingdom; the ground they are worked out from changes only when it comes to rest.
- **Smallest fix:** keep the seat, the furnishings and the worker spots in `ToyDisplay`, and work them out again when `toy.realm` is another object or `huddled` changes.
- **Sure:** 100 that it is done every frame; the cost was not measured. **Mechanical:** yes.

### 15. P3: a change of scale drops every cached sprite without letting its canvas go

- **Where:** `view/sprites.ts:34-38` and `93-97` (`rescale`), `view/toyView.ts:110` (the kept setting) and `71-74` (`dispose`).
- **What goes wrong:** each tier step and each step of a resize clears the maps of the creature sprites and the stamps and makes a new canvas for the setting, and paints all the poses again at once. The old canvases keep their backing store until they are collected, and on an iPad the store for canvases is small: a few changes of tier in a row can meet its limit, and the surface then draws blank. `dispose` lets none of them go either.
- **Smallest fix:** before `made.clear()`, on the old `setting`, and in `dispose`, set `width = 0` and `height = 0` on each canvas.
- **Sure:** 100 that they are dropped unreleased; 50 that it reaches the limit on the target. **Mechanical:** yes.

## Areas with nothing found

- **The ground, the build, the walls, the order:** nothing found. In random play no lump was made or lost but by finding 5, row 0, row 20 and the mouth never changed, the position never went back, and every loop a frame runs is bounded (four steps of the ground, four steps of a raid).
- **The fixes of the last run:** read and run. A lump taken while it falls is followed cell by cell (`toy.ts:281`); a ball pushes 6 and balls do not push together (`pushOn`; its test is finding 6); one held invader keeps nobody out (`taken`); every kind climbs the first three rows of the shaft (`tooHigh`); a machine fired outside a raid is stored empty with its lump where it lands (`stored`), and the kit was whole in every save read back. Lumps under the mouth: the ball is given up at once only for a lump in the middle column right under the turf, which can hang there only with a lump beside it or a column under it, and each of those holds 6 or has earth behind it. The bell that waits: finding 4.
- **The jam's contract:** nothing found. Imports are the game's own files, `react` and `../types`; storage, age and attention come from `ctx`; the loop, the clock and sound stop on rest and a held thing is put back; the surface follows its root by a `ResizeObserver`, ignores a 0 by 0 measure and caps the pixel ratio at 2; sound is made in the first `pointerdown` and closed on cleanup; no text is drawn; no network or browser storage is touched; every listener and observer is removed.
- **Work per frame, beyond findings 14 and 15:** nothing found. The ground sheet repaints at most 24 cells a frame, and chambers are worked out only when the ground comes to rest.

## The simplification review

Mierennest: a reading of `games/mierennest/` for what could be made simpler (reuse, quality, efficiency), at commit 81a7f7eea43447d85605af54fbf280cf545a9b86 of `feat/learning-games-build`. No game file was changed and nothing was run.

Read: every source file of the folder in full, the painters included. The tests were read by their case names and by the helpers cited below, not line by line. Paths are relative to `games/mierennest/`. "Sure" is how sure I am that the change leaves behaviour as it is. The four frozen files, the template files used as copied, the save format, the safety checks and the design sheet are left alone.

## Reuse

**1. Three helpers copied word for word between the rules and the view.**
- Where: `view/raidShow.ts:444-458` (`roomFloor`) and `residents.ts:13-28` (`floorOf`); `view/display.ts:124-137` (`alongLine`) and `view/raidShow.ts:341-354` (`alongWay`); `toStage` at `view/display.ts:153` and `view/raidShow.ts:17`, and once more as `stage` in `view/raidShow.test.ts:268`.
- What: the floor of a room, a point along a line of points and cell-to-stage are each written out twice with the same body.
- Change: export `floorOf` from `residents.ts` and delete `roomFloor` (its callers are `display.ts:15, 647`, `raidShow.ts:481` and `raidShow.test.ts:459, 502`); export `alongWay` and `toStage` from `raidShow.ts` and delete the copies in `display.ts`.
- Held by: `residents.test.ts:33-78`; `view/raidShow.test.ts:421, 451-510`; `view/display.test.ts:370`.
- Sure: 100.

**2. The box of a body and the circle of its face, written four times.**
- Where: `camp.ts:176-189` (`Box`, `boxOf`, `faceOf`); `view/raidShow.ts:194-219, 250` (`shownBox`, `shownFace`, `Box` again); `view/display.ts:461-464` (`antBox`), `:503`, `:622`, `:653` (bare `Math.min(18, height * 0.45)` and `radius + 2`); `view/display.test.ts:463-468` (the test's own `boxOf`, `faceOf`, `covers`).
- What: one measure (a face is `min(18, 0.45 × height)` across, set 2 in from the front and 0.55 of the height up) decides who ducks, who makes way and what the tests accept, and each of the four writes it out for itself.
- Change: in `camp.ts` add `bodyBox(kind, x, y, size)`, `faceRadius(kind, size)` and `faceCircle(kind, x, y, flip, size)`; `boxOf` and `faceOf`, the unturned branches of `shownBox` and `shownFace`, `antBox` and the radius arguments at `display.ts:622, 653` call them; the test helper imports them and `covers`; keep one exported `Box`.
- Held by: `camp.test.ts:37-62`; `view/raidShow.test.ts:259-349`; `view/display.test.ts:470-519, 569`.
- Sure: 100.

**3. Three rules of a shot, each written two to four times.**
- Where: `kingdom.ts:415, 433, 476` and `raid.ts:1100`; `kingdom.ts:417-423` and `480-486`; `kingdom.ts:361-367` and `502-510`.
- What: who a shot can meet (in the nest, and not home, held, leaving or coming) is written four times, where a body first lies on a shot's way twice, and the last open cell of the way that is in no machine twice, once of them for the save.
- Change: export `canBeHit(invader)` from `raid.ts` and use it at the four places; one private `whereOnPath(raid, invader, path)` in `kingdom.ts` for `firstMet` and `arrive`; one `landingCell(ground, machines, path)` for `stored` and `arrive`.
- Held by: `kingdom.test.ts:628-697, 753-868`; `raid.test.ts:387-430`.
- Sure: 100.

**4. Half a queen and half a worker, as bare numbers outside `residents.ts`.**
- Where: `residents.ts:33-34` (`QUEEN_HALF = 2.2`, `WORKER_HALF = 1.5`, not exported); `raid.ts:210, 213`; `view/display.ts:604, 648`; `residents.test.ts:75`; `view/raidShow.test.ts:495`.
- What: the raid (where an act keeps clear of the kingdom's own), the view (her span of wall, the ends of her floor) and two tests repeat 2.2 and 1.5 because the names are private.
- Change: export the two constants and use them at those places. `raid.ts:286` (`HALF`) is the same measure for the invaders, rounded from `BODY` in `camp.ts`: leave its values and say so in its comment.
- Held by: `residents.test.ts:33-78`; `view/raidShow.test.ts:259, 478`; `view/display.test.ts:370`.
- Sure: 100.

**5. The shaft, and the first floor under a cell.**
- Where: `save.ts:88-92`; `machines.ts:69-70`; `raid.ts:856-857`; `routes.ts:95-96, 123-124`; and `chambers.ts:52-53` with `raid.ts:413-417`.
- What: "down this column to the first floor" is the same loop in five places, and "this cell is the shaft a new nest starts with" is written once for the rooms and once for the climb home.
- Change: add `floorUnder(ground, x, y)` to `ground.ts` and call it from the five, each from the row it starts at now (`shaftFoot` keeps its `Math.max(1, …)`; `restPlace` at `machines.ts:62-63` tests two columns and stays as it is); add `inShaft(x, y, mouth)` to `chambers.ts` for `rooms` and `tooHigh`.
- Held by: `routes.test.ts:52, 99, 216`; `machines.test.ts:39`; `save.test.ts:182`; `chambers.test.ts:17`; `raid.test.ts:42-66, 180, 650`.
- Sure: 100.

## Quality

**6. Fields of a raid that nothing in the game reads.**
- Where: `raid.ts:179-180, 229, 240` (`Raid.changes`); `raid.ts:96-97, 224, 258, 328, 507` (`Invader.spot`); `raid.ts:101-102, 1105` (`Invader.answer`); `raid.ts:76, 791, 838, 907, 1129` (`Invader.from`); `raid.ts:1165` (`putAway`).
- What: `changes` and `spot` are written and never read, and the comment on `changes` describes what clearing `way` in `changed()` does; `answer` says "for the view" but the view reads `lastShot`, and it, `from` and the `putAway` argument of `endOf` are each read by one test line only (`raid.test.ts:396, 491, 376`), since `Kingdom.putAway` drops a raid without judging it.
- Change: delete `changes` and `spot`; correct the comment on `answer` and say on `from` and `endOf` that only a test reads them, or delete them and let those three test lines read the `hit` event, `cell` and `toward`, and `judge` directly.
- Held by: `raid.test.ts:358, 997` and the rest of that file; no line reads the two deleted fields.
- Sure: 100.

**7. Numbers and colours that have a name elsewhere.**
- Where: `view/display.ts:697` (0.75, twice); `kingdom.ts:461` (push `3`); `machines.ts:15-16` and `view/toyView.ts:45` (lump kinds 2, 3, 4); `view/toyView.ts:112` (`P.WOOD.dark`); `view/display.ts:435, 676` (0.8).
- What: `TRIED_AT` (`kingdom.ts:87`), `HABITS.beetle.push` (used for the same knock at `raid.ts:612`), `SAND`/`MUD`/`STONE` (`ground.ts`) and `BACKDROP` (`config.ts:9`, the same colour for the same job) are written as literals, and the share of the put-back in which the cells go back has no name and appears twice.
- Change: import the names; name the 0.8 once in `display.ts`.
- Held by: `kingdom.test.ts:753, 870`; `machines.test.ts`; `view/display.test.ts:523`; `view/raidShow.test.ts:227`. No test ties `BACKDROP` to the palette's dark wood; both are `#7a4c22` today.
- Sure: 100.

**8. Two and three names for one thing.**
- Where: `motion.ts:5`, `view/parts.ts:9`, `voices.ts:96`; `habits.ts:9`, `voices.ts:26`, `view/machines.ts:11`; `order.ts:83`, `view/machines.ts:10`; `machines.ts:16`, `voices.ts:114`; `camp.ts:28-38`, `view/creatures.ts:342-347`, `view/invaders.ts:15-22`.
- What: the nine creatures are `Mover`, `CreatureKind` and `Speaker`; the three shots are `Shot`, `Material` and `Load`; `MachineKind` is declared twice; lump-to-shot is `SHOT_OF` and `materialOf`; and the body sizes are `BODY` in `camp.ts` and again `SIZE` with `INVADER_SIZE` in the painters, which only `creatures.test.ts` reads, so the painters are held to a table the game does not measure by.
- Change: keep one declaration of each (`Mover`, `Shot`, the `MachineKind` of `order.ts`, `SHOT_OF`, `BODY`) and make the others aliases or imports of it (`export type CreatureKind = Mover`, `export const SIZE = BODY`).
- Held by: the typecheck; `view/creatures.test.ts:193, 259`; `voices.test.ts`; `motion.test.ts`.
- Sure: 100.

**9. One job in two places where a later fix was laid on.**
- Where: `raid.ts:779-787` and `872-881`; `raid.ts:1156-1161` and `541-546`; `kingdom.ts:268-274` and `726-728`; `kingdom.ts:204-206`; `save.ts:108-114` and `163-169`.
- What: choosing the column to come in by and going home where the mouth is shut are written in both `comeIn` and `downFromTheMouth`; `landInRaid` repeats `settleAndTell`; a scene ends by the same three lines in `endScene` and in `step`; `seeToTheQueen` asks `queenSeat` for what `settleQueen` stored one line before; and "each machine stands where it comes to rest" is the same loop in `serialize` and `deserialize`.
- Change: `wayDown(raid, gait)` and `shutOut(raid, invader)` in `raid.ts`; `landInRaid` calls `settleAndTell(raid, before, [])`; `step` and `endScene` call one `finishScene(scene)`; `seeToTheQueen` reads `this.queenSat`; `standAtRest(ground, machines)` in `machines.ts` for the two loops.
- Held by: `raid.test.ts:155, 716-790, 851`; `kingdom.test.ts:412-506, 782`; `save.test.ts:147-180`.
- Sure: 100.

## Efficiency

**10. The party's file at the log is laid out again every frame of a raid.**
- Where: `view/raidShow.ts:259, 361`; `view/display.ts:478-481, 591-592, 702`; `camp.ts:67-75, 159`.
- What: every frame of a raid and of its put-back calls `partyFile`, which lays the whole file out (several lists, a sort, a retry loop), and maps a new party list, though both are fixed from the bell to the end of the put-back; `campers` lays the file out twice in one call.
- Change: `ToyDisplay` keeps `{ raid, party, file }` and renews it only when `k.raid ?? k.lastRaid` is another raid; `showRaid` and `showCarriedOut` take the file as an argument; `campers` calls `layOut` once.
- Held by: `view/raidShow.test.ts:71-240, 318`; `view/display.test.ts:297, 730`; `camp.test.ts:75-116`.
- Sure: 100.

**11. The floor of every room is found again and again within one frame.**
- Where: `view/display.ts:603, 609, 621, 631`; `residents.ts:13-28, 46, 73, 80`; `view/raidShow.ts:476-481`.
- What: `items()` finds each chamber's floor twice a frame and the queen's room's four times, each time making two lists and a Set, and sorts the lighting order, though the chambers change only when the ground comes to rest.
- Change: first, find the floors once at the top of `items()`, hand them to `queenSeat`, `workerSpots` and `showFurnishings` as an optional argument, and use `throne` again at `:631`; then keep them between frames, dropped where the toy drops its open way (`toy.ts:121, 289`) and when `toy.realm` is replaced.
- Held by: `residents.test.ts`; `view/raidShow.test.ts:451-510`; `view/display.test.ts:62, 470-519`.
- Sure: 100 for the first step, 75 for keeping them between frames.

**12. A beetle that leans copies the whole ground every tick.**
- Where: `raid.ts:630` (in `strain`, `628-671`).
- What: the copy is read only on the tick the wall gives or is dug, and a wall that holds, the usual case, throws it away twenty times a second for every beetle leaning.
- Change: take the copy inside the two branches that change the ground: after `lean` answers `shoved` or `ploughed` and before `settleAndTell` (the cells `lean` moved are already in `did.cells`, so the list that is told stays the same), and before the `put` at `:655`.
- Held by: `raid.test.ts:238-298, 316-345, 680-714, 959`.
- Sure: 100.

Seen and smaller, not listed as findings: `callRaid` derives the chambers five times (`raid.ts:221-230`) and `decide` runs `reach` twice for one decision (`raid.ts:296` with `494`, `509` with `514`); `demoDrag` runs twice in an idle frame (`view/display.ts:739, 784`); the pushes at `view/display.ts:401, 405, 440` are found again by the compare at `446-452`.

Already sound: the rules are pure and on game time alone with a test file beside each, a raid never touches the nest as built, the ground's step keeps its two lists between calls, the ground sheet repaints only changed cells under a budget, and sprites, stamps, crumbs, moves and voices are made once and reused.
