<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates.
- Look in use: crepe paper and wire (first choice; white card model was not needed).
- Sheet: checked once by a reader who did not write it, eight findings, all taken or adapted (below). The adapted ones had no second check.
- Open: no child and no iPad has been in front of it, and nobody has listened to it. The owner has not seen the look or the toy.

### The sheet's check, round 1

Adapted rather than taken as written: the idle hand goes round a thing instead of tapping it, because going round is the game; the claim about contrast went; ties were simplified to circling two things at once; the cat walks because its bow went on and for no other reason; the mouse stays at the right front, clear of the rolls.

### Template notes

- `scene.ts` and both its tests, and `state.test.ts`: replaced by `layout.ts`, `model.ts`, `play.ts` and `play.test.ts`. **For the template:** a game that works while the finger is down uses only the press and the drag of `input.ts`, and none of the drop.
- `guidance.ts`: the first glow and the first hand come sooner (1.5 s and 3 s).
- `config.ts`: a tier also says how much ribbing is painted.
- The rest of the copied files: as copied.

### For the owner to decide

- The look and the toy (no toy checkpoint was held; the request was for the whole game).
- The band, 3 to 7.

## Pass log

| Pass | Looked at | Critique | Fix set | Still weak |
| --- | --- | --- | --- | --- |
| 1 | First stills, 1180×820 | The room reads at once; parcels were flat | Bands and folds in the wrapped pictures, pale lip along edges | Circles that began on a neighbour gave it the paper |
| 2 | Circles begun anywhere, clumsy and reversed, in tests | Paper went to whoever was passed on the way | One thing at a time: being on it or going round it; paper left in passing comes off again | |
| 3 | Wrap, rip, family visit, hint | Cat's bow on its chin, a parcel of nothing floated over the floor, the family stood in the wall | Bow on the chest, hangs on a wire above the skirting and lies on the floor below, family kept on the floor | Grandpa's bow on his moustache |
| 4 | Cat's walk, tie, layers, idle hand, mouse, rip | The hand comes once the mouse has shown the whole of it, and goes round with a trace of paper | Grandpa's bow on his chest | |
| 5 | Cold playtest by a reader who had seen only stills (6 findings) | Going round read as a swipe; a parcel did not ask to be ripped; a parcel of nothing beside the giraffe looked like a second head; the mouse went under its paper | The hand goes the whole way round; every parcel has a corner that did not stick; parcels of nothing stay off faces and rolls; the mouse stays in front | The mouse's round is small and far off; all-red parcels run together |
| 6 | Code review (12 findings) | Two ways to stop the game in a family visit; a slow finger lost its work to a second one; a torn cat teleported; bow sounds cut off; canvas memory | All taken; `play.test.ts` holds seven. The cat shuffles home | |
| 7 | Profile | Cutting paper to its wedges took 30 ms a frame on a software renderer | What is cut is kept until it changes: 0.6 ms at rest | Winding itself still repaints it |

## For the pull request

### How the game meets the quality bar

- **Alive at idle:** everybody breathes, blinks and follows the finger with their eyes; the half wrapped bicycle shivers; snow falls. Parked, nothing moves.
- **Motion and sound on every touch:** each wedge of paper crackles a step higher, each thing answers in its own voice. Synthesized only.
- **Weight:** own curves per thing for laying, bow, tear, burst and poke.
- **Kid-clear and wordless:** six silhouettes that stay themselves in paper; no word, letter, numeral or symbol.
- **Guidance:** the mouse wraps and unwraps its cheese once, then a glow and a hand going round the bicycle, one act at a time, gone on touch.
- **Frame rate:** 49 a second on the production build in Chromium with a software renderer and no throttle, where the governor went to its lowest tier; 10 with a four times throttle. The same machine gives 42 to 59 for games already merged, and nearly all of the time is the renderer filling pixels, which an iPad's graphics chip does. At rest the game's own work is 0.6 ms a frame (median, DPR 2, top tier). At most 65 pictures a frame. No physical iPad measured and no WebKit here, so 60 fps is not shown.
- **Procedural only, its own look.**

### The learning claim

None. The game has no learning goal and claims no school skill.

### Defaults taken for the owner

- Nothing can be wrong, nothing is counted, nothing unlocks, and it plays the same all year.
- Any circle will do: wobbly, broken, backwards, scribbled; or four taps.

### What the next builder should know

- "Which thing is the finger going round" needs a rule of its own. Begin with the turn made about each thing's middle, and take back paper left on a neighbour in passing.
