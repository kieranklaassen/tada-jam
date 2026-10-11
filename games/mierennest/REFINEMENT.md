<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: toy. Run 2 is done: the Mount opens the toy, in the look. No raid, no machine, no designed order yet; the rules for them from run 1 are unwired. Base commit ef85be4d.
- **What to try first.** Drag a finger through the earth to the right of the shaft: a tunnel opens behind it, crumbs fly, and the ant with the blue kerchief runs along it. Dig under the pale sand and it pours. Press a stone, mud or sand that lies beside open ground and drag: the ant carries it and sets it down where the finger lets go. Dig a room four cells wide and three high and the queen moves in. Tap the dewdrop, a camper, a toadstool. Leave it alone for six seconds and the idle ladder shows.
- Answers handled: 1, 2 and 3, read on the base branch at `8cc8c341`.
  - 1 and 2: done in run 1 and this run (see below).
  - 3 (`docs/build/answers/mierennest-3.md`), the sheet's second check: all four replacements pasted as written, nothing else above `## The look` changed; the toy's touch-down and the dung ball's habits brought into line (commit `8e509d5`).
- Sheet, round 1: checker cloud-1, on `bb54b24`. Open, 17 findings, all pasted; the lead confirmed the pastes.
- Sheet, round 2: checker cloud-2, on `42676f5` (hash `ed5c668a...48cd15`). Open, 4 findings, all pasted as written; none left out.
- **Sheet: PASSED round 3**, confirmed by the lead from the diff (answers file 4), at commit `734513b`. Hash of the sheet part: `49a588ec48b43cfce6492461afa1db4a7e440ce46f4496f1c48f651e71cebebb`. Nothing above `## The look` has changed since. Sentences of the sheet the built game makes untrue, for the closing run: none yet.
- Rules and toy: written against the sheet at `734513b`, at the builder's own risk until round 3 is confirmed.
- Look in use: the first reserved look, Ant farm behind glass. The lead's four points of answers file 2 are mended, each to its test (see "The four points of the look").
- Sound: every voice is numbers in `voices.ts`, held in range by a test. **Nobody has listened to any of them.**
- Frame cost: no frame rate was measured anywhere, and no physical iPad. See "Frame cost of the toy" below: the toy's own work a frame is under the bar at the median and when idle, and over it at the ninety-fifth percentile while a finger digs without pause.

**Stills.** Branch `stills/mierennest-ec7b85a3`, three files under `docs/build/stills/mierennest/`: `1-first-frame.png` (2.6 s of idle), `2-dig-and-carry.png` (sand in the ant's jaws just after a pit was dug, crumbs still in the air), `3-small-nest.png` (a tunnel, a pit, a room with the queen in it, and sand, mud and a stone carried to its far end). Seed 1. Taken at 1180 by 820 from the production build of this lane at `ec7b85a3`, on a paused clock stepped 33 ms at a time, with the same scripted touches each time, on software drawing.

**The four points of the look** (answers file 2), each with what now holds it:

1. *Ours and theirs.* The kingdom is honey-gold and round; the raider ants are crimson, low and pointed, in grey helmets and dark masks. `view/palette.test.ts` holds the two apart in lightness and hue; the painter rendered one ant, two workers and three raiders at a quarter of their size and they were told apart by colour and by outline. By the builder's eye this holds; nobody else has looked.
2. *Which ant is the child's.* It is the brightest gold, larger than a worker, and wears a blue kerchief in every pose: the only blue thing in the nest. By the builder's eye a newcomer points at it in the first frame; nobody else has looked.
3. *Mud that reads as mud.* A dark, cool, nearly grey brown, with a paler sagging lip on a free top, a drip under a free foot and one long glint; the cell is otherwise plain. `view/palette.test.ts` holds it apart from sand, stone, earth and the dark of a tunnel. Shown one cell of each on white and on dark, the builder names all three; nobody else has looked. In a tunnel its body is only a little lighter than the dark behind it, and it is told there by its lip and its glint.
4. *A camp that keeps clear of the bell.* The bell hangs higher, over the hill; the camp is a layout in `camp.ts`. `camp.test.ts` holds the bell's whole reach clear of every camper by 8 units and of the hill at its largest, whoever waits at the log, holds that no camper covers another's face, and that no two stand in each other but the polisher at its ball. The layout is in stage units, so it holds at every surface size.

For the game run, from the same file: a room that looks lived in. Not done; rooms hold the queen and the workers and nothing else.

**Frame cost of the toy.** Chromium on this machine's software drawing, production build, tier 0 pinned, pixel ratio 2, 1180 by 820. The game's own work a frame (`window.__jamPerf.cpuMs`), under CPU throttle:

| What | Throttle | Frames | Median | 90th | 95th | Most draws |
| --- | --- | --- | --- | --- | --- | --- |
| A finger digging fast without pause through a kingdom of four chambers, five runs of 12 s | 6x | 95 to 99 | 4.2 to 4.9 ms | 9.0 to 11.7 ms | 13.0 to 17.3 ms | 19 |
| The same kingdom, idle, 10 s | 6x | 77 | 2.6 ms | 3.7 ms | 4.6 ms | 15 |
| Digging as above, 10 s | 4x | 153 | 2.7 ms | 5.2 ms | 6.1 ms | 18 |
| Digging as above, 6 s | none | 343 | 0.3 ms | 0.8 ms | 1.0 ms | 18 |

- The bar is 8 ms at the ninety-fifth percentile at six times throttle. Idle meets it. Digging does not: 13 to 17 ms.
- What the tail is, from a profile of the same run on the dev build: garbage collection, then building voices (a mouthful is heard every 70 ms; on this machine, with no sound card, the audio context is also built again at every touch), then the sprite stamps. At eight frames a second a frame also carries a tenth of a second of game time, six times what a frame at sixty carries, so each frame here settles several steps of ground and several mouthfuls at once. None of that was measured on a graphics card.
- What was done about it in this run: the still parts on layers of their own (run 1); sprites the size of their creature instead of one large box; a straight stamp where nothing turns; every pose painted at load; no garbage from the ant's pathfinding; a save only once the ground rests. The idle ninety-fifth percentile went from 16 ms to 4.6 ms.
- The fullest frame the toy can show (sixteen workers, a lump in the jaws, crumbs of four colours, the glints and the hand) is 40 draws, counted by `view/display.test.ts` against the budget of 80. The fullest frame reached by play in the measured runs was 19. Cells repainted in a frame are held to 24.

**The frame, in three answers** (pack: game-design, a-full-frame-with-large-funny-characters.md), for the toy's first frame:

- *What share is empty.* None is bare page. The top fifth is the camp, full from edge to edge; the rest is the ground the child works on, with its three seams, the roots, the queen and the ant.
- *What is funny.* The queen wedged in the shaft with her brow out of the mouth and the ant sitting small under her; a raider ant tugging at a foot stuck in a puddle; a beetle on its back, rocking, under the toadstool it could not climb; the fly rubbing its hands; the dung beetle polishing its ball and stepping back to look; the dung fly in goggles pointing its twig; a raider on the log hugging a pillow.
- *What is alive.* Every one of them moves like itself, the bell sways, the worker on the hill mutters; a touch on any of them is answered at once, and the bell makes the whole camp look up.

**Findings not fixed.**

- The ant runs in front of the queen and the workers when the finger takes it through their room; nothing stops it, and the two sprites overlap for that moment.
- The queen moves into a new largest room at once, with no scene: the scene is the game run's.
- The dung beetle's handstand reads as one only with the ball beside it; its rump stands 10 units outside its box in the polishing pose; the worker with its hands on its hips is 43 wide, not 28; the queen's legs dangle when she sits; a raider's mask is lost in a dark tunnel; the fly's two hand poses differ little; beetle and fly legs are low in contrast in a tunnel. All from the painter's own list.
- A lump that falls moves a whole cell a step; it is not eased between cells.
- The spoil does not travel: the hill grows as the nest is hollowed, and the worker on it hops at each mouthful, but no crumb is carried up the shaft.
- The party at the log is its first member only. Seats for a whole party are the game run's.

**For the next checker and the lead.**

- With the mouth and shaft three cells wide (round 1, finding 1), one more cell dug beside the shaft over three rows is a clear block four wide and three high, so it is a room by the sheet's measure and the queen moves into it. The sheet's sentence is unchanged and the rules follow it; the lead may want the shaft left out of the measure.
- The creatures were painted by a subagent on the same model, in this checkout, from a brief, in both runs; the builder looked at its sheets and at the stills.

### Template notes

- `symbols.ts` and `symbols.test.ts`: removed. The generator copies them into every game whose band starts at 6 or above, and this game draws no numeral (its brief says so).
- `config.ts`: the ladder is the game's thirteen places, typed as a tuple (`Place`); `FIRST_VISIT` has one row; `FIRST_CUE` and `firstCueAfter` are new, for the one thing the age hint sets; `BACKDROP` is the frame's dark wood.
- The Mount (`mierennest.tsx`): the toy is wired in where the comments say: the save is the wrapper's (`save.ts`), the seed comes from the address, `act` has a case for every gesture, `dragLift` lets go at once (`touch.letGo()`), a `pressEnd` and a `dragCancel` both put a carried lump back, voices are played inside the handler and again after the step, and the idle ladder's result goes to the draw. One thing differs from the template's comments: a change is handed to the cadence only once the ground rests, and `cadence.mark()` holds it until then.
- `state.ts`: used as copied, wrapped by `save.ts`. `finished` is always false.
- `guidance.ts`: changed. `IdleLadder` takes the wait before its first cue and the number of demonstrations, so the wait can follow the child's age and the ladder can stop after three; with no arguments it is the template's. Three tests added to its test file.
- `audio.ts`, `input.ts`, `overlay.ts`, `rng.ts`, `stage.ts`: used as copied. `scene.ts`: untouched and not used yet.
- **For the template:** a canvas game that stamps its still parts over the whole surface every frame pays for it in its own work on software drawing (about 80 ms a frame here at six times throttle, against 1.5 ms once they were layers of their own). A line in the Mount saying that what stands still can be a canvas under or over the Mount's own would have saved the detour. The same for sprites: one box for every creature cost twice what a box a kind does, and a pose first painted in the frame that needs it is a frame that stalls.
- **For the template:** `IdleLadder` with its wait and its count as arguments, as here, would let a sheet set them without editing the file.
- **For the template:** on a machine with no sound card the audio context is built again at every touch (`build` in `audio.ts` shows in a profile); a failed build could be remembered for the visit.
- **For the template:** the jam shell writes a slot two seconds after the last save or on put-away; a still or a probe that reloads the page sooner finds nothing saved. A line in the cloud page would save the next builder the question.

### For the owner to decide

- The toy: whether digging is a pleasure in the hand, and whether carrying feels right. Nobody has put a finger on it.
- The look, as mended: the stills of the toy are on the stills branch named above.
- The sound: nobody has heard any voice of the game.
- Whether a raid may be called with a bell the child taps (in the toy the bell only rings and the camp looks up), and whether "a raid went well when no invader finished its act in a chamber" is the right line.
- Whether the ending may leave two small marks in the world for good (glow-worms lit in the chambers, the dung fly's leaf on a stalk at the camp), or whether the kingdom should look exactly as before.
- None of the guide's defaults awaiting the owner needs a different answer for this game.

## Pass log

One row per pass. No frame rate has been measured: the column holds the game's own work a frame on software drawing, as the status block gives it.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 (toy) | Three stills of the toy at 1180 by 820 from the production build, seed 1, on a paused clock: the first frame at idle, a carry just after a dig, a small nest. Also one cell of each material alone, and the glint and the hand of the idle ladder. | As the child, on the first stills of the toy: "The queen is stuck, that's funny. Why is my ant inside the queen at the start? Why is the queen so big in that tiny room, she's in the wall. My ant is standing on top of her." And the lead's four points on the spike, in the same voice: "The bad ants look like my ants. Which one is mine? What's the purple stuff, is it rock? I can't get at the bell, the fly is in front of it." | One set, on what a child reads at a glance: the kingdom gold and the raiders crimson in helmets; a blue kerchief on the child's ant; mud a dark wet brown with a lip, a drip and a glint; the bell raised over the hill and the camp spaced by a tested layout; the queen fitted to a short floor; the queen wedged a cell higher so the ant has the shaft's foot, where it sits small. Nothing reverted. | None measured. Own work at six times throttle: 2.6 ms median idle, 4.2 to 4.9 ms median digging, 13 to 17 ms at the ninety-fifth percentile digging. | The ant still runs in front of the queen in her room. Mud in a tunnel is told by its lip and glint more than by its body. The rooms are bare. Lumps fall a cell at a time. |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

So far (run 2: the toy. No raid, no machine, no designed order yet).

- **Alive at idle.** Every creature idles in a way of its own (`motion.ts`, one row a kind, held apart by a test); the bell sways; the worker on the hill mutters.
- **Motion and sound on every touch.** A touch on the ground is answered in the call the finger lands in: a mouthful, crumbs, a crunch whose pitch follows the finger's speed, and the ant running. Each material answers the dig, the jaws and a set-down in its own look and voice; a poke of any camper, the bell or the setting is answered at once. Voices are played inside the touch handler. Nobody has heard them.
- **Weight, squash and follow-through.** Sand pours and slumps, mud holds, a stone drops and its landing is felt at the camp, harder the further it fell. A poke is a squash, then a hop by the creature's weight.
- **Kid-clear silhouettes and tappables.** The three materials are flat and far apart in lightness, each leaning its own way, held by a test; the kingdom's ants are told from the raiders by colour and outline; the child's ant wears the only blue in the nest. A touch within 34 stage units of the bell rings it, and a test holds the bell clear of every camper and of the hill at its largest; every camper is found by a target of 48 or more.
- **Wordless clarity for 9 to 12.** No word, letter or numeral is drawn; the game has no `symbols.ts`. The wordless check passes.
- **Wordless idle guidance.** After six seconds of stillness (ten for a child of 10 or older) the earth beside the ant and a lump in reach glint; then a ghost hand makes one short drag through plain earth that touches nothing built. It waits twice as long each time and stops after three.
- **Found as left.** The nest is saved as it changes, as it will come to rest; a lump in the jaws stays in its cell until it is set down, so a put-away under a dragging finger loses nothing. Played on the production build: a stone carried half way, the game put away and the page loaded again, and the stone was where it had been picked up, the tunnels were there, and the ant stood where it had been.
- **Frame rate.** No frame rate has been measured, on any machine, and no physical iPad. The game's own work a frame on software drawing, production build, tier 0 pinned, pixel ratio 2, six times CPU throttle: 2.6 ms at the median and 4.6 ms at the ninety-fifth percentile idle; 4.2 to 4.9 ms at the median and 13 to 17 ms at the ninety-fifth percentile while a finger digs fast without pause, which is over the bar of 8 ms. The fullest frame is 40 draws by a test, against a budget of 80; a frame repaints at most 24 cells of the ground.
- **Procedural assets only.** Everything is canvas paths and synthesized notes; no image, font or sound file, and no network request.

### The learning claim

None. Mierennest is a play-first game: it claims no school skill, its sheet has no records part, and nothing in the folder names a standard.

### Defaults taken for the owner

- No numeral is drawn, though the band allows them.
- No camera shake and no impact pause: the answer to a touch is carried by chains, sound and squash.
- No on-device speech: creature voices will be invented and synthesized.
- The sheet's own choices he may want to overturn: a raid is called with a dewdrop bell; a raid went well when no invader finished its act in a chamber; a room is a clear block four cells wide and three high, and counts while air reaches it; the ground has a sixth kind of cell, packed earth, which is dug and never carried.

### What the next builder should know

- The stage is 40 by 21 cells of 28 units. That cell size is the only one at which the finger's mouthful (two cells) and a creature a tenth of the frame wide (two cells high, about 120 long) both hold.
- Write a picture test for a ground rule by hand from the rule, then run it: two of this run's first pictures were wrong (the edge of a picture is rock, so mud in the top row is held; sand on a single post slides off), and the rule was right.
- The generator copies `symbols.ts` into every game whose band starts at 6 or above. A game that draws no numeral removes it and its test.
- A subagent painting creatures needs the palette frozen before it starts: a key renamed under it breaks its typecheck.
- Simulate a scripted play against the rules before turning it into touches for a still: three scripts written by eye went wrong (a "dig" that started on a stone was a carry), and one run of the same list of moves through `toy.ts` showed why.
- Measure the work of a frame with a profile, not by guessing: here it was the sprites' size, poses first painted in play, and garbage from pathfinding, none of which the rules or the draw count showed.
- Look for an answers file on the base branch before the last push of a run, not only at its start: this run's arrived while its stills were being taken.
- A fixture that carries real lumps about a seeded ground breaks when the ground's layout changes; `carry` in `view/spike.ts` throws by name of the cell, which made the second layout a matter of minutes.
