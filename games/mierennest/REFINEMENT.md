<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: sheet. Run 1 is done: the sheet, the look spike and the pure rules, and after them the pastes of the sheet's first check. Nothing is played yet. Base commit ef85be4d.
- Answers handled: 1 (`docs/build/answers/mierennest-1.md`, read on the base branch at `93e53de`). Its sheet part and its rules part are done in this run. Its last part, going on to the toy, is not: this run's message ended it at the rules, so the toy is the next run's.
- Sheet, round 1: checker cloud-1, on commit `bb54b24` (hash `ee5b0619...c50783`). Outcome: open, 17 findings. All seventeen replacements are pasted as written; none was left out.
- Sheet now: commit `42676f5`. Hash of the sheet part: `ed5c668a648f280ff29eeb0918fd968a59ca4ac5fb17efdc9f2a642eef48cd15`. **One line of this round is not a paste**, asked for by the lead: under "What a chamber is", the third bullet, which begins "A wall built right across a way shuts the air out". Nothing above `## The look` has changed since that commit.
- Rules: at commit `a46ec4f`, written against the sheet at `42676f5`, at the builder's own risk while round 2 is checked: `ground.ts`, `build.ts`, `chambers.ts`, `walls.ts`, `habits.ts`, `order.ts`, `save.ts`, and the ladder in `config.ts`, each with its tests. Brought into line with round 1: the mouth and shaft three cells wide (finding 1); the sand rule held by tests (2); a carried lump stays in its cell until it is set down, and is set down only where the finger lets go, along the ant's open way (5, 7); nothing dug that the finger did not touch (8); the stone on a shoved wall (11); forty rooms (12); the hill bounded and held clear of the bell, the log and the mouth by a test (9). Findings 4, 6, 10, 13, 14 and 15 are about the raid, the machines, the rooms' furnishing and the guidance, which later runs build from the sheet as it now stands. No raid is played yet: `raid.ts` and `machines.ts` are run 3.
- Look in use: the first reserved look, Ant farm behind glass. Spiked on the game's real scene; clear at the youngest age by the builder's own reading. The Mount shows the spike at load from the fixed seed 1: the first frame, `spike=2` in the address for a grown kingdom, `spike=3` for a raid. The second reserved look was not spiked.
- Frame cost: no frame rate was measured anywhere. On this machine's software drawing, Chromium, tier 0 pinned, pixel ratio 2, production build, six times CPU throttle: the game's own work a frame was about 1.5 ms at the median and 2 to 3 ms at the ninetieth percentile, for 12 to 18 draws a frame (one a creature). Measured at `fecaca0`, before the mouth was widened; the drawing has not changed since. Before the still parts were moved to layers of their own it was about 80 ms.
- Open: sheet ready for check, round 2

**Stills.** Branch `stills/mierennest-a46ec4f9`, three files under `docs/build/stills/mierennest/`: `1-first-frame.png`, `2-grown-kingdom.png` (`spike=2`), `3-raid.png` (`spike=3`). Seed 1. Taken at 1180 by 820 from the production build of this lane at `a46ec4f9`, on a paused clock, one frame after the first drawn frame, on software drawing. An earlier set, from before the first check (the mouth two cells wide), is on `stills/mierennest-fecaca06` and can be deleted.

**The frame, in three answers** (pack: game-design, a-full-frame-with-large-funny-characters.md), for the first frame:

- *What share is empty.* None is bare page. The top fifth is the camp, full from edge to edge. The other four fifths are the ground, which is the surface the child works on: it holds the three seams, the roots, the queen and the ant, and stays otherwise plain on purpose. A new nest has no room in it yet; the grown kingdom and the raid show the same ground lived in.
- *What is funny.* The queen wedged in a shaft far too narrow for her, with her feelers out of the mouth and her egg held tight; a raider ant asleep at its tent and another stuck in a puddle by one foot; a beetle on its back, legs waving, under the toadstool it could not climb; a dung beetle polishing its ball; the dung fly in goggles pointing its twig at the mouth; the fly rubbing its hands.
- *What is alive.* Nothing moves yet: the spike is a still scene. Each creature is drawn in the middle of doing something, and the idle motion is the toy run's.

**For the next checker and the lead.**

- The queen of the first frame is drawn one and a half times the size of her wedged pose, so that she fills the shaft now that it is three cells wide; the sheet's "far too big for it" holds, and her sprite is softer for the scaling until it is painted at that size.
- The creatures were painted by a subagent on the same model, in this checkout, from a brief; the builder looked at them at three times their size and in all three scenes.

**Findings not fixed, all in the creatures** (their painter's own list, for the toy run):

- The worker with its hands on its hips is a small tangle at its real size, and wider than its box.
- The napping raider's face is muddled at real size; the raider with the pillow is too like the walking one.
- The dung beetle's rag reads as a hanky when the ball is not beside it; its handstand reads as a nosedive.
- The fliers' wings reach about a cell over their body box (the fly in the raid scene hovers a row lower for it), and the wing blur is stiff.
- The queen's legs bunch under the egg when she sits.
- Ants' legs and feelers are low in contrast against undug earth; they are clear in a tunnel and on the grass.
- `view/parts.ts` is 351 lines.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

- `symbols.ts` and `symbols.test.ts`: removed. The generator copies them into every game whose band starts at 6 or above, and this game draws no numeral (its brief says so). Nothing imported them.
- `config.ts`: the ladder is the game's thirteen places, typed as a tuple (`Place`); `FIRST_VISIT` has one row, since every age starts at the first place; `FIRST_CUE` and `firstCueAfter` are new, for the one thing the age hint sets; `BACKDROP` is the frame's dark wood. `OLDEST` is no longer read from the band.
- The Mount (`mierennest.tsx`): three changes. It makes the spike's view, `draw` calls it, and the cleanup disposes of it. Nothing else is touched, and `state.ts` is still what it saves: the wrapper `save.ts` is not wired in until the toy.
- `state.ts`: used as copied. `save.ts` wraps it as its header asks, and never moves the position back: a raid that did not go well is not a `badly`.
- `rng.ts`, `stage.ts`: used as copied. `input.ts`, `audio.ts`, `guidance.ts`, `scene.ts`, `overlay.ts`: untouched and not yet used by the game.
- **For the template:** a canvas game that stamps its still parts over the whole surface every frame pays for it in its own work on software drawing (about 80 ms a frame here at six times throttle, against 1.5 ms once they were layers of their own). The Mount has one canvas and its comments describe one draw; a line there saying that what stands still can be a canvas under or over the Mount's own would have saved the detour.
- **For the template:** the generator's `symbols.ts` is copied for every band from 6 up whether or not the game draws a numeral; a flag to leave it out would save the removal.

### For the owner to decide

- The look: whether Ant farm behind glass is full and funny enough, from the three stills of the spike.
- Whether a raid may be called with a bell the child taps, and whether "a raid went well when no invader finished its act in a chamber" is the right line.
- Whether the ending may leave two small marks in the world for good (glow-worms lit in the chambers, the dung fly's leaf on a stalk at the camp), or whether the kingdom should look exactly as before.
- None of the guide's defaults awaiting the owner needs a different answer for this game.

## Pass log

No pass yet. One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

So far (run 1: the sheet, the look spike, the pure rules; nothing is played yet).

- **Alive at idle.** Not yet: the spike is a still scene. The sheet gives every camper an idle of its own, and the camp gags are the habits shown.
- **Motion and sound on every touch.** Not yet. The sheet's grid gives each of its eighteen cells a look and a sound of its own.
- **Weight, squash and follow-through.** Not yet. In the rules, weight is real: a stone falls unless borne, sand slumps to a slope, mud holds.
- **Kid-clear silhouettes and tappables.** The three materials are flat and far apart in hue and lightness (pale sand, dark mud, grey stone) on brown earth; a touch within 34 stage units of the bell rings it, a target 68 across against the floor of 48; and a test holds the hill clear of the bell, the log and the mouth at its largest.
- **Wordless clarity for 9 to 12.** No word, letter or numeral is drawn; the game has no `symbols.ts`. The wordless check passes.
- **Wordless idle guidance.** Designed in the sheet (what can be touched, then one drag through plain earth, never a solution); not built yet.
- **Frame rate.** No frame rate has been measured, on any machine, and no physical iPad. The spike's frame is one draw a creature: 12 in the first frame, 18 in the grown kingdom and 13 in the raid, against a budget of 80. What stands still is on two layers of its own, painted at load and on a resize; the ground is painted cell by cell, and `repaint` holds a frame to 24 cells. The game's own work a frame, in Chromium on software drawing at six times CPU throttle with tier 0 pinned at pixel ratio 2 on the production build, was about 1.5 ms at the median and 2 to 3 ms at the ninetieth percentile (two runs of six seconds, about 40 to 55 frames each, so a rough reading). The frame-budget test comes with the toy.
- **Procedural assets only.** Everything is canvas paths; no image, font or sound file, and no network request.

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
- Look for an answers file on the base branch before the last push of a run, not only at its start: this run's arrived while its stills were being taken.
- A fixture that carries real lumps about a seeded ground breaks when the ground's layout changes; `carry` in `view/spike.ts` throws by name of the cell, which made the second layout a matter of minutes.
