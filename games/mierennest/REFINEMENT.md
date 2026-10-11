<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates. Run 3 is done: the game up to and not including the great raid. Raids on call, the three invader kinds, the two machines, the put-back, the designed order with its hidden position, the kingdom's growth, the first showings and the save are built and wired. The dung beetle, the dung fly, the great raid and the ending are run 4: the position is held at `full-camp` (`LAST_BUILT` in `kingdom.ts`), and a raid that goes well there moves nothing. Base commit ef85be4d.
- **Sheet: PASSED round 3**, confirmed by the lead from the diff (answers file 4), at commit `734513b`. Hash of the sheet part: `49a588ec48b43cfce6492461afa1db4a7e440ce46f4496f1c48f651e71cebebb`, checked again at the end of this run. Nothing above `## The look` has changed since. The Open line is gone.
- Answers handled: 1 to 4, read on the base branch at `5c758f24`. No file 5 was there at the end of this run.
  - 4, mud in a tunnel: mud is now a lighter greyed brown (`#5d4b4c`) and the dark of a tunnel a shade deeper. `view/palette.test.ts` holds mud apart from the dark of a tunnel by at least the margin it holds sand apart from the earth (the test the lead named), and still apart from the earth of every stratum.
  - 4, the three defaults taken in the owner's place (the bell calls the raid; a raid went well when no invader finished its act; the ending leaves its two marks): built on, and listed for him below.
  - 4, rooms that look lived in: two things a room on the back wall, behind the cells, for the first six chambers.
  - 4, the slow frames of a fast dig: see "Frame cost" below. The game's own work without the pixel calls is under the bar; with them, on this machine's software drawing, it is not.
- **What to try first.** Dig a room four cells wide and three high beside or under the shaft; the queen moves in and two workers with their things. Tap the dewdrop: the scout ant at the log comes down the mouth, goes into the room, lies down and naps, and goes home; the workers stand by. Then set a lump of mud in the floor of the way in and ring again: it sticks, tugs at its foot, and is carried out, and three ants sit at the log. A raid that goes well brings the next party; nothing else says so. To see a later place without playing to it, put the game away, and from the jam's home page set `position` in the saved slot (`tada-jam:slot:mierennest` in the page's local storage, plain JSON) to an id of `LADDER`, then open the game: at `the-catapult` or later the machine is lowered down the mouth at the first touch. The stills were made that way, by planting the slot before the page loads; the route by hand was not tried.
- **Sentences of the sheet the built game does not make true.** None was changed. For the closing run, to build or to change:
  1. *The queen moves in* (scenes table): she is in the new largest room at once, with no scene.
  2. *A machine arrives*: two workers lower it down the mouth and it fires once, empty. No crumb is loaded and no worker's hat is hit.
  3. *Which party a new position lays out*: the new party is at the log when the put-back ends. It does not walk there, and the last one does not sit down to sulk.
  4. *The fly's own act*: it hangs in the room and tastes, then tastes its own foot. It does not walk up the wall and across the ceiling.
  5. *The queen dislikes guests*: she does nothing when an invader does its act in her room.
  6. *The guidance ladder, step 1*: the earth beside the ant, a lump in reach and the drop glint. The ant does not scratch at the earth and the bell does not sway.
  7. *An invader is inside when any part of it is in a cell of a chamber*, with the mouth three cells wide: a room dug beside the shaft is one room with the shaft, so every invader is inside from the moment it comes down, and a beetle that finds no free place acts at the foot of the shaft. The rules follow the sentence; the lead may want the shaft left out of the measure.
- Look in use: the first reserved look, Ant farm behind glass. The registry row's text is at the end of `ART.md`.
- Sound: every voice is numbers in `voices.ts`, held in range by a test; the raid adds a march, a twang, a pop, a knock, a fizzle, a sigh and the wall giving. **Nobody has listened to any of them.**
- Frame cost: no frame rate was measured anywhere, and no physical iPad.

**Stills.** Branch `stills/mierennest-981441c5`, three files under `docs/build/stills/mierennest/`:

- `1-raid-every-kind-inside.png`: the party of `mixed-party` in a hall, 7 s after the bell: the beetle eating at the foot of the shaft, the fly tasting, the raider ant lying down beside the queen.
- `2-wall-gave-workers-put-it-back.png`: the two beetles of `beetle-pair` shoved a wall of one mud lump along a tunnel three times until it met the step at its end, gave up and sat down at the foot of the shaft they cannot climb. 17 s after the bell the raid is over and the put-back has begun: the beetles are on their way out, workers are at the lump, and one has its hands on its hips over the ring of footprints where the wall gave.
- `3-cannon-fired-beetle-on-its-back.png`: the party of `the-cannon`; the cannon was tapped as the first beetle landed, its stone has hit, the cannon still smokes, and the beetle is on its back with its legs in the air. The catapult stands behind it at the foot of the shaft.

Seed 1. Taken at 1180 by 820 from the production build of this lane at `981441c5`, pixel ratio 2, on a paused clock stepped 33 ms at a time, with the same scripted touches each time, on software drawing. Each starts from a saved nest planted before the page loads: the first is a hall as a child could dig it, written cell by cell; the other two were dug and carried through the game's own rules by a script.

**Frame cost.** Chromium on this machine's software drawing, production build at `981441c5`, tier 0 pinned, pixel ratio 2, 1180 by 820, six times CPU throttle, 12 s each. The game's own work a frame (`window.__jamPerf.cpuMs`):

| What | Frames | Median | 90th | 95th | 99th | Most draws |
| --- | --- | --- | --- | --- | --- | --- |
| A finger digging fast without pause through a kingdom of four chambers | 95 | 5.5 ms | 12.3 ms | 17.1 ms | 36.7 ms | 24 |
| The same, with the canvas calls that put pixels down made to do nothing | 600 | 1.6 ms | 2.6 ms | 2.9 ms | 3.8 ms | 19 |
| A raid of the full camp in that kingdom, both machines fired again and again | 93 | 3.6 ms | 9.8 ms | 12.1 ms | 19.8 ms | 24 |
| The same raid, pixel calls doing nothing | 600 | 1.6 ms | 2.9 ms | 3.5 ms | 6.2 ms | 24 |
| The same kingdom, idle | 94 | 2.9 ms | 3.9 ms | 4.3 ms | 11.3 ms | 18 |
| Idle, pixel calls doing nothing | 600 | 1.4 ms | 2.4 ms | 2.9 ms | 5.0 ms | 18 |

- The bar is 8 ms at the ninety-fifth percentile. **With drawing, on this machine, digging and a raid are over it** (three earlier runs of the dig in this run gave 11.7 to 14.9 ms); idle is under it.
- Which part is the machine's: with `drawImage`, `fill`, `stroke`, `fillRect` and `clearRect` made to do nothing, the same run is 2.9 to 3.5 ms at the ninety-fifth percentile, every frame kept (600 in 12 s against 95). So the rules, the display list, the sound and the save are under the bar with room, and what is over it is the canvas calls, which software drawing does on the processor inside the frame. That they cost less on a graphics card is an inference; nothing was measured on one. With the audio made to do nothing instead, the dig's tail did not move (11.3 to 11.8 ms), so it is not the sound.
- The three places the lead named: a frame plays at most four steps of the ground and at most four ticks of a raid, however long the frame before it was; every voice is a list of notes made at load and its player is kept by list, and crumbs come from a pool of 36; the audio context was counted in the browser and is made once and kept.
- Draws: the fullest frame of the toy is 40 and **the fullest frame of a raid is 48** (the largest party this build plays inside a kingdom of eight rooms, both machines firing, marks, crumbs and the hand), each counted by a test against the budget of 80 (`view/display.test.ts`, `view/raidShow.test.ts`). A frame repaints at most 24 cells of the ground.

**Whole raids played from a seed** (`raid.test.ts`, `kingdom.test.ts`, `machines.test.ts`): the same raid twice plays the same, invader for invader; after any raid the ground is cell for cell as built; at every place of the order a raid ends by itself in bounded time, with and without a wall; put away at any instant, the game reads back with the invaders at their camp, the ground as built and the position unmoved; a careless game of 220 touches on each of three seeds never throws, never loses a lump and never moves the position by chance. On the production build: a raid put away seven seconds in, the page loaded again, and the party was at the log, the nest as built and the position the same.

**What is still weak.**

- A raid in a room three cells high is a heap: the creatures are as tall as the room, an invader that lies down beside the queen is half behind her, and what each one's act is reads at full size and not at a glance.
- A raider ant, a beetle or a fly is longer than the shaft is wide: in the shaft and at the mouth a body covers the wall beside it. An ant held fast in a way one cell wide now stands on end; the rest is as it was.
- The party at the log is a close file and its second and third members cover the camper beside them.
- The workers at a put-back hide the lump they carry; a wall of one lump is hard to see going back.
- A first raid can go well by luck: seed 1 has mud under the foot of the shaft, and a shaft dug straight down ends on it.
- From the painters' own list: the raider's shrug reads as reclining; the fly's peer and dodge differ little; the beetle's sitting poses tilt little; the raider rolled flat is no wider than its box; a beetle's horn stands 8 units out of its box; a fired machine keeps crumbs of its load; the lit lantern's halo is muddy on earth.
- From the toy, unchanged: the ant runs in front of the queen and the workers; a lump that falls moves a whole cell a step; no crumb is carried up the shaft.
- The dung beetle's ball, its widening and the dung fly have rules and tests from run 1 (`habits.ts`, `walls.ts`) and no raid yet.

**For the next checker and the lead.**

- The creatures, the machines, the rooms' things and the effects were painted by subagents on the same model, in this checkout, from briefs; the builder looked at their sheets and at the stills.
- Requests to the lead: the registry row (text at the end of `ART.md`). Nothing else outside the folder.

### Template notes

- `scene.ts`: copied and **not used**. The game's four scenes (the shrug, a first showing, a machine arrives, the put-back) are a small union in `kingdom.ts` with one clock, because each is filled in from the raid or the order and ends at a touch with its outcome already in place; `kingdom.test.ts` holds what each saves when it starts. The run's page asks for scenes on `scene.ts`: this is a departure, and the closing run can move them if the lead wants it.
- `symbols.ts` and `symbols.test.ts`: removed. The game draws no numeral (its brief says so).
- `config.ts`: the ladder is the game's thirteen places, typed as a tuple (`Place`); `FIRST_VISIT` has one row; `FIRST_CUE` and `firstCueAfter` are new, for the one thing the age hint sets; `BACKDROP` is the frame's dark wood.
- The Mount (`mierennest.tsx`): gestures go to `kingdom.ts`, which wraps the toy; a judged raid and a showing that starts are saved at once and everything else once the ground rests; losing attention and unmounting both put the game away (`kingdom.putAway()`), which ends a raid unjudged; the idle ladder is held at the bottom while a raid or a scene runs.
- `state.ts`: used as copied, wrapped by `save.ts`. `finished` is always false in this build.
- `guidance.ts`: changed. `IdleLadder` takes the wait before its first cue and the number of demonstrations; with no arguments it is the template's.
- `audio.ts`, `input.ts`, `overlay.ts`, `rng.ts`, `stage.ts`: used as copied.
- **For the template:** a canvas game that stamps its still parts over the whole surface every frame pays for it in its own work on software drawing. A line in the Mount saying that what stands still can be a canvas under or over the Mount's own would have saved a detour. The same for sprites: a box a kind, and every pose painted at load.
- **For the template:** `cpuMs` on software drawing counts the canvas calls with the game's own work. A switch in the probe that makes the pixel calls do nothing, as this run's script did, tells the two apart in one run.
- **For the template:** `IdleLadder` with its wait and its count as arguments, as here, would let a sheet set them without editing the file.
- **For the template:** the jam shell writes a slot two seconds after the last save or on put-away; a still or a probe that reloads the page sooner finds nothing saved.

### For the owner to decide

- The toy: whether digging is a pleasure in the hand, and whether carrying feels right. Nobody has put a finger on it.
- The look: the toy's stills and these three are on the stills branches.
- The sound: nobody has heard any voice of the game.
- The bell: a raid is called by a tap on the dewdrop. Taken as yes by the lead in his place.
- The line a raid is judged by: it went well when no invader finished its act in a chamber. Taken as yes by the lead in his place.
- The ending's two marks (glow-worms lit in the chambers, the dung fly's leaf at the camp): kept, by the lead in his place. They are run 4.
- Whether a raid that goes well should say so in any other way than the next party at the log. Now nothing else does.
- None of the guide's defaults awaiting the owner needs a different answer for this game.

## Pass log

One row per pass. No frame rate has been measured: the column holds the game's own work a frame on software drawing at six times throttle, as the status block gives it.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 (toy) | Three stills of the toy at 1180 by 820 from the production build, seed 1, on a paused clock: the first frame at idle, a carry just after a dig, a small nest. Also one cell of each material alone, and the glint and the hand of the idle ladder. | As the child, on the first stills of the toy: "The queen is stuck, that's funny. Why is my ant inside the queen at the start? Why is the queen so big in that tiny room, she's in the wall. My ant is standing on top of her." And the lead's four points on the spike, in the same voice: "The bad ants look like my ants. Which one is mine? What's the purple stuff, is it rock? I can't get at the bell, the fly is in front of it." | One set, on what a child reads at a glance: the kingdom gold and the raiders crimson in helmets; a blue kerchief on the child's ant; mud a dark wet brown with a lip, a drip and a glint; the bell raised over the hill and the camp spaced by a tested layout; the queen fitted to a short floor; the queen wedged a cell higher so the ant has the shaft's foot, where it sits small. Nothing reverted. | None measured. Own work: 2.6 ms median idle, 4.2 to 4.9 ms median digging, 13 to 17 ms at the ninety-fifth percentile digging. | The ant still runs in front of the queen in her room. Mud in a tunnel is told by its lip and glint more than by its body. The rooms are bare. Lumps fall a cell at a time. |
| 2 (the raid, first look) | Strips of six frames each of the raids of `mixed-party` and `beetle-pair` in three nests, seed 1, on a paused clock, with the mud of answers file 4 in a tunnel. | "They're all in one heap at the bottom of the hole. I can't see who's doing what. Is that one beetle or two? The queen is sitting on her stuff, I thought the room was empty. The mud is fine now, I can see it's a lump." | One set, on telling the invaders apart in a room: each goes well into the room before its act and acts three cells from the next; two that stand still in one place stand one behind the other; the room's two things hang on the free wall beside the queen. Nothing reverted. | None measured. Own work: 3.3 to 3.9 ms median in a raid of the full camp, 13.5 to 15.1 ms at the ninety-fifth percentile; 1.4 ms and 2.6 ms with the pixel calls doing nothing. | A hall three cells high is still a heap with three invaders and the queen in it. |
| 3 (cold playtest proxy) | The production build, a fresh save, seed 1: ten seconds untouched, then sixty as a newcomer who digs down, digs a room, rings the drop, pokes a camper, the queen and the party, and rings again. Twenty-five frames looked at. Unclear moments, in the newcomer's words: | "I rang the drop and the red ant came in and then it was just gone again. What happened?" (it stuck in mud under the shaft, the raid was over in the same instant, and it was carried out in a straight line through the earth). "I made the room. Now what? How do I make them come?" (nothing pointed at the drop). "The stuck one is lying in the wall." | One set, on a raid's end being seen: an invader that is stuck or held is seen where it is for two and a half seconds before the raid is over; it is carried out along the way it came; an ant held fast in a way one cell wide stands on end; the idle ladder lights the drop once the kingdom has a chamber. Run again on the production build: the ant sits at the foot of the shaft tugging, goes up the shaft, and the drop is lit at the next stillness. Nothing reverted. | None measured. Own work on the final build: see the table in the status block. | That a raid went well is said only by the next party at the log. What each invader's act is reads at full size only. |
| 4 (the stills) | Candidates for the three stills, from the production build at pixel ratio 2: nine moments of the cannon's shot, nine of the put-back, three of the hall. | "Is that an equals sign behind the stone? The queen is sitting on the red ant. I can't see the lump, the ants are in front of it." | One set, on the shot: the stone trails three streaks of three lengths, so that no two read as a sign. The hall of the first still was cleared of the two stones that kept the queen's floor short, as a child would carry them to its end; the game was not changed for that. Nothing reverted. | None measured. | The workers hide the lump they carry back. The stone of a shot fired at a beetle a cell away is drawn on the beetle. |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

So far (run 3: the game up to and not including the great raid).

- **Alive at idle.** Every creature idles in a way of its own (`motion.ts`, one row a kind, held apart by a test); the bell sways; the worker on the hill mutters; the party at the log holds its want in plain sight.
- **Motion and sound on every touch.** A touch on the ground is answered in the call the finger lands in: a mouthful, crumbs, a crunch whose pitch follows the finger's speed, and the ant running. Each material answers the dig, the jaws and a set-down in its own look and voice; a poke of any camper, the bell or the setting is answered at once. In a raid a touch on a loaded machine fires it at once, a touch on an empty one fizzles, and a touch on the ground brings the ant to look. Voices are played inside the touch handler. Nobody has heard them.
- **Weight, squash and follow-through.** Sand pours and slumps, mud holds, a stone drops and its landing is felt at the camp. A beetle leans and strains before a wall gives; a stone puts it on its back, rocking; a shot leaves a puff or a splat; a wall that gave leaves a scuff and footprints until the next raid.
- **Kid-clear silhouettes and tappables.** The three materials are flat and far apart in lightness, each leaning its own way, held by a test, mud in a tunnel included; the kingdom's ants are told from the raiders by colour and outline; the child's ant wears the only blue in the nest; each kind of invader is one hue. A touch within 34 stage units of the bell rings it, and a test holds the bell clear of every camper and of the hill at its largest; every camper is found by a target of 48 or more; a machine is two cells square.
- **Wordless clarity for 9 to 12.** No word, letter or numeral is drawn; the game has no `symbols.ts`. The wordless check passes. Each kind's habit is shown at the camp before it is met, and once, large, when its party first sits at the log.
- **Wordless idle guidance.** After six seconds of stillness (ten for a child of 10 or older) the earth beside the ant, a lump in reach and, once the kingdom has a chamber, the drop glint; then a ghost hand makes one short drag through plain earth that touches nothing built. It waits twice as long each time and stops after three. The hand never rings the bell, sets a lump or loads a machine.
- **Nothing rated, counted or praised.** A raid that went well brings the next party to the log and nothing else; one that did not leaves the same party there. The position is shown nowhere.
- **Found as left.** The nest is saved as it changes, as it will come to rest; a lump in the jaws stays in its cell until it is set down; a raid runs on a copy, so the nest is as built the instant the game is put away, the raid is not judged, and the invaders are at their camp. A judged raid and a showing are saved the moment they start, and no scene plays on load. Played on the production build: a raid put away seven seconds in and the page loaded again.
- **Frame rate.** No frame rate has been measured, on any machine, and no physical iPad. The game's own work a frame on software drawing, production build, tier 0 pinned, pixel ratio 2, six times CPU throttle: 2.9 ms at the median and 4.3 ms at the ninety-fifth percentile idle; 5.5 ms and 17.1 ms digging fast without pause; 3.6 ms and 12.1 ms in a raid of the full camp with both machines firing. The last two are over the bar of 8 ms; with the canvas's pixel calls made to do nothing they are 2.9 ms and 3.5 ms at the ninety-fifth percentile. The fullest frame of a raid is 48 draws by a test, against a budget of 80; a frame repaints at most 24 cells of the ground.
- **Procedural assets only.** Everything is canvas paths and synthesized notes; no image, font or sound file, and no network request.

### The learning claim

None. Mierennest is a play-first game: it claims no school skill, its sheet has no records part, and nothing in the folder names a standard.

### Defaults taken for the owner

- No numeral is drawn, though the band allows them.
- No camera shake and no impact pause: the answer to a touch is carried by chains, sound and squash.
- No on-device speech: creature voices are invented and synthesized.
- Taken by the lead in the owner's place, for him to overturn: a raid is called with a dewdrop bell; a raid went well when no invader finished its act in a chamber; the ending leaves two small marks in the world.
- The sheet's own choices he may want to overturn: a room is a clear block four cells wide and three high, and counts while air reaches it; the ground has a sixth kind of cell, packed earth, which is dug and never carried.

### What the next builder should know

- The stage is 40 by 21 cells of 28 units. That cell size is the only one at which the finger's mouthful (two cells) and a creature a tenth of the frame wide both hold.
- A raid is a pure simulation at twenty ticks a second on a copy of the ground (`raid.ts`), and the view only reads it. That one choice gives the put-away, the same raid twice and the nest as built for nothing; keep everything a raid does out of the view.
- Write a picture test for a ground rule by hand from the rule, then run it: several first pictures were wrong (the edge of a picture is rock; sand on a single post slides off; a stone bedded in earth is a lintel), and the rule was right.
- Simulate a scripted play against the rules before turning it into touches for a still, and print the ground it leaves: a dig a cell too deep made a pit that changed a whole raid.
- A saved nest for a still that has a machine in it needs a position at or past the machine's place, or the machine is dropped on load.
- On software drawing, measure once more with the pixel calls made to do nothing: it tells the game's work from the drawing's in one run.
- A subagent painting creatures needs the palette frozen before it starts, and no file it owns touched while it works.
- Run the cold playtest on the production build before the look passes, not after: it found three things in one minute that four strips of chosen moments had not.
- Look for an answers file on the base branch before the last push of a run, not only at its start.
