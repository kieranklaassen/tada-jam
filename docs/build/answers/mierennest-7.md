# Answers for Mierennest: the last points

This is the one message of last points. Two people who are not you read your work at `616eaba4`: a checker read the 67 changed sentences of the sheet, and the lead's reader read all 90 files and played the game from its own modules. Both reports are below, whole. After the run that answers this file nothing is read again: the lead confirms the pastes from the diff and brings the game in. So do exactly this, and no more.

## What this run does

1. **Paste the eleven replacements of the sheet's fourth check**, each as it stands, and the one line from the lead below. Change no other sentence above `## The look`. Where the game and a sentence of the sheet differ, change the game. If a sentence cannot be made true, do not reword it: name it in the status block for the lead.
2. **Bring the game into line with the pasted sheet**, each with a test that fails before the fix: findings 1 (the ball leans on lumps under the mouth, a machine shuts no column), 2 (a held invader keeps nobody out), 4 (the dung beetle's fit), 5 (where a dropped ant waits), 6 and 7 (a camper acts out its habit when pressed, at its spot or at the log; the showings have what caught the kind out), 8 (the mud cell's sounds), 9 (the worker or the queen steps aside), 10 (the six chambers with things, from the saved ground alone), 11 (who sits at the log after the great raid).
3. **Mend what the reading found.** The sheet stands, so the game moves:
   - Rule 6, point 1: a lump picked up while it falls is in one place. No lump is ever made or lost. The test that counts the kit plays careless games that pick up falling lumps, and holds the count of each kind.
   - Point 2: a dung ball pushes 6, and balls do not push together.
   - Point 3: with finding 1; and a ball left on the grass is drawn on the grass.
   - Point 4: those who are held sit a body's length apart, and the test asks for a body's length, not for different cells.
   - Point 5: with finding 2.
   - Point 6: with the lead's line below: every kind climbs out of the starting shaft by itself.
   - Point 7: a machine fired outside a raid has thrown its lump: the lump is a cell of the ground where it landed and the machine is saved empty, at every instant. Never in neither.
   - Point 8: a raider ant does not climb a face of sand, one cell high or more.
   - The lead's point (b): `first-fly` goes well by the bell alone, because the tunnel the finger digs is too low for a fly. That stands: the low way is the defence, and the child meets the fly's habit by watching it peer in and leave. Change nothing for it.
   - Point (c): the bell rung while the ground is still falling waits for the ground to rest, so no machine is left in the air; and a game put away before the ground rests plays no scene on return (ruling 12): the queen's move is owed and starts at the next touch.
   - Point (e): the test that nobody is drawn twice counts creatures, not kinds, and covers the ending, the shrug and an arrival; the test of faces covers the put-back and the child's ant.
   - Point (f): entries 53, 10, 3, 19 to 21, 27 and 30 of your list differ from the game. Make the game do what each says.
   - Rule 5: redraw the four shapes (the cannon's two bindings and highlight, the dung fly's twig with its stub, the lantern's ring round a dark oval, the two dashes on the shrugging raider's helmet) so that none reads as a letter or a sign.
   - Point (g): take out what is left over: the copied `scene.ts` and its test if nothing imports them, the dead exports and the stale comments the reading names, and either hold the three numbers of `ART.md` line 338 by a test or take them out.
4. **The gates**, as CLOUD.md lists them for a stage boundary, three stills on a stills branch (a raid in which a held ant is walked over; the great raid with a ball leaning on lumps under the mouth; a beetle climbing out of the shaft by itself), the status block with the sheet's new commit and hash and one line for each point above, push, and the short report. No reader this time.

## One line from the lead

Under "The stage", in the bullet that begins "Row 0 is turf", replace the last sentence ("A new nest has a short shaft under the mouth, as wide as the mouth and three cells deep, with the ant at its foot.") with:

> A new nest has a short shaft under the mouth, as wide as the mouth and three cells deep, with the ant at its foot. That shaft is the way out as it is the way in: every kind that came down it climbs back up it by itself, and only a pit the child dug holds a beetle until the workers haul it out.

## The sheet's fourth check

Mierennest (`mierennest`): check of the design sheet, round 4, on commit `616eaba49e8cf8f459f4175dd903d99fc3146964` (sheet part sha256 `a90f0378a575da2ec8c035daf640218c468440b2a772f66083c5f38d23fa660e`), against the sheet part that passed round 3 at `734513bf` (sha256 `49a588ec48b43cfce6492461afa1db4a7e440ce46f4496f1c48f651e71cebebb`).

Verified: both hashes are as named. The sheet has no records part and claims no school skill, so no record, limit or level was looked up. No person is named in the sheet.
Verified: the diff of the two sheet parts holds 67 changes and every one is in the builder's list; the list leaves none out. Entry 1 is the lead's line of answers file 5, pasted word for word. Line numbers below are those of `games/mierennest/ART.md` at the commit.
Note on the list: its opening paragraph (and the message that started this check) calls the rule "one invader in a chamber at a time" entry 28. In the numbered list that rule is entry 29; entry 28 is the campers' return. It is weighed here as entry 29.

## Findings

### 1. A raid, and how it is judged, line 159 (entry 67): one lump under the mouth takes the ball away

The invaders' table says a ball passes any wall weaker than its push of 6 and leans on lumps with room beyond them; this line says a ball that "does not fit" is left on the grass, so one lump of mud stuck in a top cell of the shaft (hold 3, room below) takes every ball out of `dung-scout` and of `great-raid` without the ball ever leaning on it, and the last raid becomes five plain beetles. The line also names no column for a raider ant, and does not say whether a machine, which the game itself sets at the foot of the shaft, shuts a column: if it did, the arrival of the catapult would shut the fliers of `the-catapult` out with nothing built. Replace the bullet with:

> - Each invader comes in by a column of the mouth that is open to it, the one nearest the camp first: a raider ant or a beetle needs one column, a flier two side by side, a dung ball all three. Lumps set under the mouth are a wall to the ball like any other: it leans on them with its push of 6, and its beetle leaves it on the grass and comes in without it only where they hold or a stone there jams it. A machine standing under the mouth shuts no column. One the mouth is shut to altogether looks in, sighs and goes back to the log.

### 2. A raid, and how it is judged, line 160 (entry 29): an invader that cannot leave a chamber shuts it for the rest of the raid

"One invader is in a chamber at a time" and "waits at the door until the first has left" have no answer for an invader that is held in the chamber: an ant stuck in mud just inside the door, one rolled up in a mud ball, a gummed fly, an ant waiting at the foot of its drop (line 252). The others then wait for ever, so the raid does not end by itself (brief, decision 5), and where it does end nobody has finished an act: `ant-file` goes well with one cell of mud, against that place's own lesson and against line 145 ("holds one raider ant and the next walks over its back"). A waiter is also a thing the game brings to rest, and the door of a chamber is where a machine stands (ruling 15). Replace the bullet with:

> - One invader does its act in a chamber at a time. Another that comes to the door while one is at its act goes to a chamber nobody is in, where there is one, and otherwise waits at the door, in view, until the first has left; those behind it wait a body's length apart, and none of them comes to rest in front of a machine. One that is held in a chamber and is not at its act (stuck in mud, rolled up in a mud ball, gummed, or waiting at the foot of its drop) keeps nobody out: the next goes in past it, a raider ant over a stuck ant's back, so no raid waits on an invader that cannot leave. The first of a kind to do its act in a raid does it in full, and a later one of the same kind does only the end of it.

### 3. The invaders, by habit, line 256, the dung fly's own act (entry 7, read against entries 8 and 29): the army can never be conducted in

With one invader at its act in a chamber at a time, and each ball sent to a chamber nobody else is in (line 259), no ball is ever in the room with the fly, so "conducts the army in" is never seen and "with no army in the room" is always the case. Replace the cell with:

> Hovers in the room, raises its twig and conducts an army that is not there: each ball is on its way to a room of its own or waiting at the door. Then it goes.

### 4. The invaders, by habit, line 251, Fits, the dung beetle (entry 38): the beetle without its ball is no plain beetle

"Its beetle goes wherever a way is open at all" gives it the raider ant's fit, while lines 254 and 275 say it "walks on as a plain beetle", which fits a way two cells high; the passed sheet said two. A kind's fit is a fixed habit, and the narrow way a defence must leave for the air (line 123) would let this beetle in. Replace the cell with:

> The ball needs a way three cells high, and three wide where it drops; its beetle, with the ball or without it, needs a way two cells high, as a plain beetle does.

### 5. The invaders, by habit, line 252, Climbs, the raider ant (entry 66): the drop says where the ant waits after its act only

An ant that dropped and then gives up (line 257: "turns round with a shrug of the feelers") has the same air above it, and the cell does not say where it goes. Replace the last sentence of the cell with:

> It cannot climb back through the air: on its way home, after its act or after giving up, it goes as far as the foot of its drop, shrugs, and waits there for the workers, a body's length from the next.

### 6. The band and its age rule, line 13 (entry 58), and The kingdom, line 243 (entry 36), read with line 247 (entry 37): the help the child fetches is written away

The passed sheet let the child fetch a habit by pressing a camper. Now a press is "answered by that camper", and only a kind that is not in the party at the log acts its habit out, so the kind the child is about to meet shows its habit to nobody and cannot be asked. The guidance is a promise (pack: game-design, ages-9-to-12.md). In line 13 replace "a press on a camper is answered by that camper at once" with:

> a press on a camper, at its spot or at the log, makes it act out its own habit at once

and in line 243 replace the sentence that begins "A press on a camper is answered" with:

> A press on a camper is answered by that camper acting out its own habit, at its spot or at the log, and a press anywhere else above the ground, or on the frame round it, by a puff of dust and a small boing; neither changes anything in the nest, and only the bell calls a raid.

### 7. The invaders, by habit, line 247 (entry 37), and The scenes, line 288 (entry 10): two kinds are shown after the fact, without what caught them out

A bump on the head shows no habit unless the low thing the fly flew into is there, and a dung beetle that heaves and scratches its head shows none unless the ball and what it will not pass are there; the passed sheet named both (the low twig, the two pebbles). These showings are how a habit is met before the raid. In line 247 replace the parenthesis with:

> (the ant stuck in a puddle, the beetle on its back under the toadstool it could not climb, the fly nursing a bump on its head under the low twig it flew into)

and in line 288 replace the beats with:

> That kind is caught out by its own habit at the front of the camp, once, large: the ant tugging at its foot stuck in a puddle, the beetle rocking on its back under the toadstool it could not climb, the fly dazed under a low twig with a bump on its head, the dung beetle heaving at its ball, which will not go between two pebbles, and then scratching its head, the dung fly pointing its twig and then folding its arms because nobody comes. About 5 seconds each.

### 8. The object-by-action grid, line 48, mud, "An invader leans on it" (entries 15 and 17): ruling 8

The cell's only sound is now a squelch, which is the sound of the mud cell "The dig meets it" in the same row, and the hold under a pusher has no sound at all ("strains" is a motion). The passed cell had a creak and a sucking pop. Replace the cell with:

> It holds with a slow creak, and the pusher strains at it. A raider ant that treads on it is stuck by the feet with a sucking pop, and tugs at them.

### 9. The kingdom, line 243 (entry 34): ruling 15

"Steps aside" became "takes no touch": the tap is rightly the cell's, but a worker or the very large queen now stays standing over the lump the child aims at, and ruling 15 has the game move one of the two. Replace the sentence with:

> A press on a cell is always that cell's: a worker or the queen standing there takes no touch and steps aside, and the dig or the lump is answered.

### 10. How the kingdom grows, line 197 (entry 30): ruling 5

"The first six chambers" reads as the first six dug, and the saved state holds no order of digging, so which rooms keep their things would not be found as left. Replace the bullet with:

> - **Chambers.** Each chamber of the kingdom is lived in as soon as air reaches it: two workers move in where its floor has room for two, one where it has room for one, and six chambers have their things on the back wall: the first six in an order worked out from the saved ground alone, never from when a room was dug, so the same six on load. The crowd of workers stops growing at sixteen; past that the kingdom grows in rooms and halls.

### 11. The order, line 190 (entry 4), read against The scenes, line 291 (entry 11): who sits at the log after the great raid

Line 190 says the party at the log once the put-back is over is the party of the new position; line 291 seats the army at the log for the ending, when the new position is `open-kingdom`. Replace the bullet with:

> - **Which party a new position lays out.** The party at the log is laid out from the position at load and again when a raid has been judged and the invaders are home. So after a raid that went well, the party at the log once the put-back is over is the party of the new position. The one exception is the great raid that went well: the army sits at the log for as long as the ending holds, and the party of `open-kingdom` takes the log when the ending gives way to a touch, and is there on load. No party is laid out a place behind.

## The rules of a raid, weighed

- Entry 29 (one at a time, the short act): agrees with how a raid is judged and with line 259; open on the invader that cannot leave (finding 2) and on the dung fly's act (finding 3). With finding 2 pasted, no place of the order goes well with nothing built by this rule, and none is made impossible.
- Entry 66 (the drop): agrees with the ant's habits. Mud underfoot, a pit it cannot climb out of and a sand face going up still stop it; a sand face no longer stops it going down, which the sheet never promised. It closes a hole: a room hung under the shaft was out of an ant's reach with nothing built. Open only on finding 5.
- Entry 67 (the columns of the mouth): agrees for the beetle and the flier (the flier's two columns are its fit, and a two-high tunnel stopped it before). It does not agree with what a wall holds for the ball (finding 1). A mouth shut in all three columns shuts the air out too, so the raid is not judged, as line 165 has it.

## The builder's list

All 67 changes are in the sheet as listed, and the list leaves none out. Change 1 is the lead's line, word for word. The changes the findings above touch are 4, 7, 10, 11, 15, 17, 29, 30, 34, 36, 37, 38, 58, 66 and 67.

OPEN round 4: 11 findings

## The lead's reading of the folder

Mierennest: a reading of the folder, on commit 616eaba49e8cf8f459f4175dd903d99fc3146964.

All 90 files read. "Run" means played from the game's own modules by a script kept outside the repository; no test suite, no build.

## 1. Official wording
Clean.

## 2. Web addresses and outside requests
Clean.

## 3. Names
Clean.

## 4. Record ids in the build
Clean.

## 5. Drawn text
No text call.
- Cannon, in the nest: two cream bindings joined by the highlight read as an H (`view/machines.ts:247-251`).
- Dung fly's twig, camp and nest: a bar with a stub square from its middle, a ⊥ (`view/invaders.ts:389-390`, `view/invaders4.ts:175-178`).
- Lantern, room wall: with the middle rib gone, a pale ring round a dark oval (`view/things.ts:157-167`).
- Lesser: two dashes on the shrugging raider's helmet (`view/invaders2.ts:131-132`).
- Overlay: rest 1 s in the top right 72 px, lift, three touches within 3 s (`overlay.ts:20-24`). Listed.

## 6. The game does what its sheet says
Unlisted by the builder unless said.
1. A lump picked up while it falls stays in the ground and is set down too (`toy.ts:175-185`, `build.ts:81-84,97-98`, `kingdom.ts:562-563`; ART.md:85). Run: one stone became two.
2. Dung balls push together, 12 or 18 (`raid.ts:257-267`); the sheet says 6 (ART.md:109,254). Run: the great raid shoved walls holding 6, 8 and 13.
3. One lump at the top of the shaft's left column strips every ball, where ART.md:253 has it dug; the ball left "on the grass" is drawn nowhere (`raid.ts:701-709,742-746`, `view/raidShow.ts:254-258`).
4. Held ants are not a body's length apart (`raid.ts:353-358,885`; ART.md:252). Run: under a shaft widened at the top, two sit in one cell; the test asks only for different cells (`raid.test.ts:90-92`). Listed as kept.
5. Two chambers in a row: those at the door stand in one cell and never wait (`raid.ts:810-817`; ART.md:160). Run: 85 ticks.
6. No beetle or dung beetle ever goes home by itself: the mouth's own drop holds each (`raid.ts:884-888`; ART.md:149,158,257). Listed in part.
7. A machine fired outside a raid is stored with its lump in neither ground nor cup (`kingdom.ts:358-364`, `save.ts:105`, `mierennest.tsx:157-161`; ART.md:217).
8. A sand face one cell high is climbed (`routes.ts:69`; ART.md:174,254). Run.

## The lead's points
- (a) 3, 4, 6. The drop is taken only after every walked way (`routes.ts:191-210`).
- (b) By the bell alone: only `first-fly`, where every chamber lies beyond the drag's own two-high tunnel (`routes.ts:31`); run on four plain nests, every other failed. None is impossible: one nest (two-high way, pit two deep, three mud) turned back all eighteen parties.
- (c) Holds under a finger, in scenes, in a raid, from judging to ending (`kingdom.ts:312-328,595-622`). Holes: 1, 7; the bell rung while ground falls leaves a machine in air (`kingdom.ts:629`); parked before the ground rests, the queen's move plays on return (`kingdom.ts:327,630`).
- (d) Holds: every write is on the clone (`raid.ts:211`, `ground.ts:44-46`); only `ant` moves, by the press (`toy.ts:377-379`).
- (e) Nobody twice (`camp.ts:160-172`, `view/display.ts:480-507`); the test counts kinds and skips ending, shrug, arrival (`view/display.test.ts:469-517`). Faces: the put-back has no duck (`view/raidShow.ts:350-385`); the child's ant is outside it (`view/display.ts:614`).
- (f) Differ: 66, 67 (3, 4), 29 (5), 53 (no roll drawn, `view/raidShow.ts:284-287`), 10 (poses flicker, `view/display.ts:78-84`), 3, 19-21, 27, 30. The rest agree.
- (g) `scene.ts` and its test; `machines.ts:125`, `view/props.ts:100`, `view/layout.ts:19-21`, `kingdom.ts:684`; `habits.ts:37-62` read only by its test; stale: `mierennest.tsx:25-29,185-189`, `view/setting.ts:164`, `view/display.ts:676`, `view/things.ts:384`, `toy.ts:392`; ART.md:338's 51, 48, 52 held by no test.
- (h) None. The `aria-label` carries the name, undrawn (`mierennest.tsx:391`).

NOT READY: rule 1: 0, rule 2: 0, rule 3: 0, rule 4: 0, rule 5: 3, rule 6: 8
