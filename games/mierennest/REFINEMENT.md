<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: sheet. Run 1 is done: the sheet, the look spike and the pure rules. Nothing is played yet. Base commit ef85be4d; the base branch had not moved when this run ended.
- Answers handled: none. No file for this game was on the base branch at the end of the run.
- Sheet: whole, play-first, no records part, at commit `bb54b24`. Hash of the sheet part: `ee5b06197ebd6a1a2bf8d7683a22a49d69cfa32f0021770e2bb0318607c50783`. Nothing above `## The look` has changed since.
- Rules: written at the builder's own risk against the sheet at `bb54b24`, while the check runs: `ground.ts`, `build.ts`, `chambers.ts`, `walls.ts`, `habits.ts`, `order.ts`, `save.ts`, and the ladder in `config.ts`, each with its tests. No raid is played yet: `raid.ts` and `machines.ts` are run 3.
- Look in use: the first reserved look, Ant farm behind glass. Spiked on the game's real scene; clear at the youngest age by the builder's own reading. The Mount shows the spike at load from the fixed seed 1: the first frame, `spike=2` in the address for a grown kingdom, `spike=3` for a raid. The second reserved look was not spiked.
- Stills: see the line under "Stills" below.
- Frame cost: no frame rate was measured anywhere. On this machine's software drawing, Chromium, tier 0 pinned, pixel ratio 2, production build, six times CPU throttle: the game's own work a frame is about 1.5 ms at the median and 2 to 3 ms at the ninetieth percentile, for 12 to 18 draws a frame (one a creature). Before the still parts were moved to layers of their own it was about 80 ms.
- Open: sheet ready for check, round 1

**Stills.** Not pushed yet: the three stills of the spike follow on a stills branch, named here, before this run ends.

**The frame, in three answers** (pack: game-design, a-full-frame-with-large-funny-characters.md), for the first frame:

- *What share is empty.* None is bare page. The top fifth is the camp, full from edge to edge. The other four fifths are the ground, which is the surface the child works on: it holds the three seams, the roots, the queen and the ant, and stays otherwise plain on purpose. A new nest has no room in it yet; the grown kingdom and the raid show the same ground lived in.
- *What is funny.* The queen wedged in a shaft far too narrow for her, with her feelers out of the mouth and her egg held tight; a raider ant asleep at its tent and another stuck in a puddle by one foot; a beetle on its back, legs waving, under the toadstool it could not climb; a dung beetle polishing its ball; the dung fly in goggles pointing its twig at the mouth; the fly rubbing its hands.
- *What is alive.* Nothing moves yet: the spike is a still scene. Each creature is drawn in the middle of doing something, and the idle motion is the toy run's.

**Not settled by this run, for the check or the lead.**

- The sheet's toy says the ant comes to the finger "digging the last stretch". The rules dig only where the finger went. How the ant reaches a mouthful bitten far from any tunnel (it could burrow there under the earth, leaving nothing open) is for the toy run, and that sentence should then be made exact.
- A wall right across a tunnel seals what lies behind it, and a room no air reaches is not a chamber. So every defence leaves a way one cell high, and raider ants fit it. This follows from the sheet as written and is meant; the checker may want it said in one place.
- The creatures were painted by a subagent on the same model, in this checkout, from a brief; the builder looked at them at three times their size and in all three scenes.

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
- **Kid-clear silhouettes and tappables.** The three materials are flat and far apart in hue and lightness (pale sand, dark mud, grey stone) on brown earth; the bell's reach is 34 stage units, over the 48-pixel floor across.
- **Wordless clarity for 9 to 12.** No word, letter or numeral is drawn; the game has no `symbols.ts`. The wordless check passes.
- **Wordless idle guidance.** Designed in the sheet (what can be touched, then one drag through plain earth, never a solution); not built yet.
- **Frame rate.** No frame rate has been measured, on any machine, and no physical iPad. The spike's frame is 5 draws and one for each creature: 17 in the first frame, 23 in the grown kingdom and 20 in the raid, against a budget of 80. The ground is one cached sheet, painted whole only at load and on a resize; `repaint` holds a frame to 24 cells. The frame-budget test and the work per frame under six times CPU throttle come with the toy.
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
